"""
A2A (Agent2Agent) server — exposes each Alchm agent as a discoverable A2A agent.

Built on a2a-sdk 1.x (the protobuf route-factory API). One card + one "chat" skill
per agent, served from the existing FastAPI app:
  • card:  GET  /a2a/<agentId>/.well-known/agent-card.json
  • RPC:   POST /a2a/<agentId>/        (message/send + message/stream over JSON-RPC)

The executor calls the in-process chat orchestration (`run_chat`, injected — no HTTP
hop, reuses persona/RAG/provider-fallback). `enable_v0_3_compat=True` keeps the
endpoint usable by the widely-deployed A2A v0.3 clients. Each card advertises the
standard x402 payment extension; enforcement is the x402 HTTP gate
(see x402_middleware.py), which charges USDC per message.

Mount via `register_a2a_routes(app, run_chat, agents)`. Safe to skip: main.py wraps
the call in try/except so a missing/incompatible a2a-sdk never blocks startup.
"""

import os
from typing import Any, AsyncIterator, Awaitable, Callable, Dict, List, Optional

from a2a.types import AgentCard, AgentSkill, AgentCapabilities, AgentInterface
from a2a.server.agent_execution import AgentExecutor, RequestContext
from a2a.server.events import EventQueue
from a2a.server.request_handlers import DefaultRequestHandler
from a2a.server.tasks import InMemoryTaskStore, TaskUpdater
from a2a.server.routes import (
    create_agent_card_routes,
    create_jsonrpc_routes,
    add_a2a_routes_to_fastapi,
)
from a2a.helpers import new_text_message, new_text_part, new_task_from_user_message
from a2a.utils.constants import AGENT_CARD_WELL_KNOWN_PATH, TransportProtocol

try:  # AgentExtension may not exist on every a2a-sdk build
    from a2a.types import AgentExtension
except Exception:  # noqa: BLE001
    AgentExtension = None

# The standard A2A x402 payment extension (google-a2a/a2a-x402 v0.1).
X402_EXTENSION_URI = "https://github.com/google-a2a/a2a-x402/v0.1"

RunChat = Callable[[str, str], Awaitable[str]]
RunChatStream = Callable[[str, str], AsyncIterator[str]]


def _public_base() -> str:
    railway_domain = os.getenv("RAILWAY_PUBLIC_DOMAIN")
    return (
        os.getenv("A2A_PUBLIC_URL")
        or os.getenv("PLANETARY_AGENTS_BACKEND_URL")
        or (f"https://{railway_domain}" if railway_domain else None)
        or (
            "http://localhost:8000"
            if os.getenv("ENVIRONMENT", "").lower() in {"local", "development", "test"}
            else "https://api.agents.alchm.kitchen"
        )
    ).rstrip("/")


def _capabilities() -> AgentCapabilities:
    base = dict(streaming=True, push_notifications=False)
    if AgentExtension is not None and os.getenv("X402_PAY_TO"):
        try:
            return AgentCapabilities(
                extensions=[
                    AgentExtension(
                        uri=X402_EXTENSION_URI,
                        description="Charges USDC per message via the x402 protocol.",
                        required=False,
                    )
                ],
                **base,
            )
        except Exception:  # noqa: BLE001 — fall back to plain capabilities
            pass
    return AgentCapabilities(**base)


def _build_card(agent_id: str, name: str, description: str) -> AgentCard:
    base = f"{_public_base()}/a2a/{agent_id}/"
    return AgentCard(
        name=name,
        description=description,
        version="1.0.0",
        supported_interfaces=[
            AgentInterface(
                url=base,
                protocol_binding=TransportProtocol.JSONRPC.value,
                protocol_version="1.0",
            )
        ],
        capabilities=_capabilities(),
        default_input_modes=["text/plain"],
        default_output_modes=["text/plain"],
        skills=[
            AgentSkill(
                id="chat",
                name=f"Chat with {name}",
                description=f"Converse with {name} in their own voice and expertise.",
                tags=["chat", "persona", "alchm"],
                examples=["Tell me about your view of the cosmos."],
            )
        ],
    )


class _ChatExecutor(AgentExecutor):
    """Wraps the in-process chat orchestration for a single agent."""

    def __init__(
        self, agent_id: str, run_chat: RunChat, run_chat_stream: Optional[RunChatStream] = None
    ) -> None:
        self._agent_id = agent_id
        self._run_chat = run_chat
        self._run_chat_stream = run_chat_stream

    async def execute(self, context: RequestContext, event_queue: EventQueue) -> None:
        text = context.get_user_input() or ""

        # True token streaming: emit incremental artifact chunks via TaskUpdater so
        # message/stream clients see tokens as they arrive. message/send clients get
        # the assembled Task. Falls back to a single message if streaming can't start.
        if self._run_chat_stream is not None and context.message is not None:
            emitted = False
            updater: Optional[TaskUpdater] = None
            try:
                # A Task must be enqueued before any status/artifact events.
                task = context.current_task
                if task is None:
                    task = new_task_from_user_message(context.message)
                    await event_queue.enqueue_event(task)
                updater = TaskUpdater(event_queue, task.id, task.context_id)
                await updater.start_work()
                async for delta in self._run_chat_stream(self._agent_id, text):
                    if not delta:
                        continue
                    await updater.add_artifact(
                        [new_text_part(delta)],
                        artifact_id="response",
                        name="response",
                        append=emitted,  # first chunk creates the artifact, rest append
                        last_chunk=False,
                    )
                    emitted = True
                await updater.complete()
                return
            except Exception as exc:  # noqa: BLE001
                print(f"[a2a] stream failed for {self._agent_id}: {exc}", flush=True)
                if emitted and updater is not None:
                    try:
                        await updater.complete()
                    except Exception:  # noqa: BLE001
                        pass
                    return
                # Nothing streamed yet → fall through to a single-message reply.

        try:
            reply = await self._run_chat(self._agent_id, text)
        except Exception as exc:  # noqa: BLE001 — surface a clean A2A message, never 500
            reply = f"(agent {self._agent_id} is temporarily unavailable: {exc})"
        await event_queue.enqueue_event(new_text_message(reply))

    async def cancel(self, context: RequestContext, event_queue: EventQueue) -> None:
        raise NotImplementedError("cancellation is not supported")


def register_a2a_routes(
    app,
    run_chat: RunChat,
    agents: List[Dict[str, Any]],
    run_chat_stream: Optional[RunChatStream] = None,
) -> int:
    """Register A2A card + JSON-RPC routes for each agent. Returns the count mounted."""
    mounted = 0
    for agent in agents:
        agent_id = agent["id"]
        name = agent.get("name") or agent_id
        description = agent.get("description") or f"{name}, an Alchm agent."
        card = _build_card(agent_id, name, description)
        handler = DefaultRequestHandler(
            agent_executor=_ChatExecutor(agent_id, run_chat, run_chat_stream),
            task_store=InMemoryTaskStore(),
            agent_card=card,
        )
        prefix = f"/a2a/{agent_id}"
        add_a2a_routes_to_fastapi(
            app,
            agent_card_routes=create_agent_card_routes(
                card, card_url=f"{prefix}{AGENT_CARD_WELL_KNOWN_PATH}"
            ),
            jsonrpc_routes=create_jsonrpc_routes(
                handler, rpc_url=f"{prefix}/", enable_v0_3_compat=True
            ),
        )
        mounted += 1
    return mounted
