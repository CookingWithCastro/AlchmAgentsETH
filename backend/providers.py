"""
Multi-provider LLM fallback chain for /api/chat.

The chain is walked top-to-bottom. Each provider is skipped if its API-key env
var is unset. On quota/rate-limit errors we log a one-line `fallback_event`
and try the next provider. The first successful response wins.

Anthropic is special-cased to support prompt caching (cache_control on the
persona block). Every other provider speaks the OpenAI-compatible
chat-completions API via openai.AsyncOpenAI with a custom base_url.

Default chain (per CLAUDE.md, May 2026):
    Anthropic (tier-resolved) → Groq → Cerebras → Gemini → OpenRouter → OpenAI

OpenAI is the paid last-ditch. Everything between Anthropic and OpenAI is free.
"""
from __future__ import annotations

import os
import json
import time
from dataclasses import dataclass
from typing import Any, Dict, List, Optional

import anthropic
from openai import AsyncOpenAI

# Substring heuristic for "this provider is rate-limited or out of credit".
# Same terms apply to every provider — they all surface 429s with similar text.
QUOTA_ERROR_TERMS = (
    "429",
    "quota",
    "rate",
    "billing",
    "insufficient",
    "exceeded",
    "limit",
)


def is_quota_error(exc: BaseException) -> bool:
    s = str(exc).lower()
    return any(term in s for term in QUOTA_ERROR_TERMS)


@dataclass
class ProviderConfig:
    name: str
    model: str
    api_key_env: str
    base_url: Optional[str] = None  # None → native SDK (Anthropic) or OpenAI default
    is_paid_lastditch: bool = False
    # BYOK: a per-request user key that takes precedence over the env var. Never
    # persisted or logged; lives only for the lifetime of the request.
    api_key_override: Optional[str] = None

    @property
    def api_key(self) -> Optional[str]:
        return self.api_key_override or os.getenv(self.api_key_env)


# Free providers walked when tier=="free" or when paid Anthropic returns quota.
# Order = preferred-first. Cerebras is fastest; OpenRouter is the catch-all proxy.
# Each model id is overridable via a <PROVIDER>_FREE_MODEL env var (e.g.
# OPENROUTER_FREE_MODEL) so a retired free model can be rotated by env alone —
# no code change or redeploy. Falls back to the pinned default when unset.
FREE_CHAIN: List[ProviderConfig] = [
    ProviderConfig(
        name="groq",
        model=os.getenv("GROQ_FREE_MODEL", "llama-3.3-70b-versatile"),
        api_key_env="GROQ_API_KEY",
        base_url="https://api.groq.com/openai/v1",
    ),
    ProviderConfig(
        # Cerebras's free chat lineup as of 2026-05: gpt-oss-120b (general),
        # qwen-3-235b (instruct-heavy), llama3.1-8b (tiny), zai-glm-4.7.
        # gpt-oss-120b is the strongest general-purpose pick.
        name="cerebras",
        model=os.getenv("CEREBRAS_FREE_MODEL", "gpt-oss-120b"),
        api_key_env="CEREBRAS_API_KEY",
        base_url="https://api.cerebras.ai/v1",
    ),
    ProviderConfig(
        # Qwen 2.5 72B Instruct via OpenRouter. Free-tier endpoint.
        name="qwen",
        model=os.getenv("QWEN_FREE_MODEL", "qwen/qwen-2.5-72b-instruct:free"),
        api_key_env="OPENROUTER_API_KEY",
        base_url="https://openrouter.ai/api/v1",
    ),
    ProviderConfig(
        # `gemini-flash-latest` auto-tracks the newest stable flash model, so
        # we do not get pinned to a versioned name (e.g. `-exp`, `-001`) that
        # Google later retires. As of 2026-05 it resolves to gemini-2.5-flash.
        name="gemini",
        model=os.getenv("GEMINI_FREE_MODEL", "gemini-flash-latest"),
        api_key_env="GEMINI_API_KEY",
        base_url="https://generativelanguage.googleapis.com/v1beta/openai/",
    ),
    ProviderConfig(
        # OpenRouter retired the free Kimi K2.6 endpoint in June 2026. Its free
        # gpt-oss-120b route is live-verified and provides a strong general-purpose
        # fourth fallback after Groq, Cerebras, and Gemini.
        name="openrouter",
        model=os.getenv("OPENROUTER_FREE_MODEL", "openai/gpt-oss-120b:free"),
        api_key_env="OPENROUTER_API_KEY",
        base_url="https://openrouter.ai/api/v1",
    ),
]

OPENAI_LASTDITCH = ProviderConfig(
    name="openai",
    model=os.getenv("MONICA_DEFAULT_MODEL", "gpt-4o-mini"),
    api_key_env="OPENAI_API_KEY",
    base_url=None,
    is_paid_lastditch=True,
)


def build_chain(
    tier: str,
    anthropic_model: Optional[str],
    user_keys: Optional[Dict[str, str]] = None,
) -> List[ProviderConfig]:
    """
    Build the fallback chain for a request.
    - tier=="free": skip Anthropic entirely; free chain → OpenAI last-ditch.
    - else: Anthropic (with tier-resolved model) → free chain → OpenAI last-ditch.
    Anthropic is omitted if neither the app key nor a user (BYOK) key is available.

    BYOK: `user_keys` may carry the caller's own {"anthropic","openai"} keys. When
    present they override the env key for that provider (and let Anthropic run even
    when the app has no ANTHROPIC_API_KEY). User keys are used only for this chain.
    """
    user_keys = user_keys or {}
    user_anthropic = user_keys.get("anthropic")
    user_openai = user_keys.get("openai")

    chain: List[ProviderConfig] = []
    if tier != "free" and anthropic_model and (os.getenv("ANTHROPIC_API_KEY") or user_anthropic):
        chain.append(
            ProviderConfig(
                name="anthropic",
                model=anthropic_model,
                api_key_env="ANTHROPIC_API_KEY",
                base_url=None,
                api_key_override=user_anthropic,
            )
        )
    chain.extend(FREE_CHAIN)
    # OpenAI last-ditch — prefer the user's own key when they've linked one.
    if user_openai:
        chain.append(
            ProviderConfig(
                name="openai",
                model=os.getenv("MONICA_DEFAULT_MODEL", "gpt-4o-mini"),
                api_key_env="OPENAI_API_KEY",
                base_url=None,
                is_paid_lastditch=True,
                api_key_override=user_openai,
            )
        )
    else:
        chain.append(OPENAI_LASTDITCH)
    return chain


def all_known_providers() -> List[ProviderConfig]:
    """Every provider we know about, for /api/providers/health."""
    anthropic_default = ProviderConfig(
        name="anthropic",
        model="claude-haiku-4-5-20251001",
        api_key_env="ANTHROPIC_API_KEY",
        base_url=None,
    )
    return [anthropic_default, *FREE_CHAIN, OPENAI_LASTDITCH]


@dataclass
class CallResult:
    text: str
    provider: str
    model: str
    cache: Optional[Dict[str, int]] = None
    input_tokens: Optional[int] = None
    output_tokens: Optional[int] = None


async def _call_anthropic(
    cfg: ProviderConfig,
    persona_block: str,
    rag_block: str,
    user_message: str,
    max_tokens: int = 1024,
    structured_schema: Optional[Dict[str, Any]] = None,
) -> CallResult:
    client = anthropic.AsyncAnthropic(api_key=cfg.api_key)
    system_blocks: List[Dict[str, Any]] = [
        {"type": "text", "text": persona_block, "cache_control": {"type": "ephemeral"}}
    ]
    if rag_block:
        system_blocks.append({"type": "text", "text": rag_block})
    kwargs: Dict[str, Any] = {
        "model": cfg.model,
        "max_tokens": max_tokens,
        "system": system_blocks,
        "messages": [{"role": "user", "content": user_message}],
    }
    if structured_schema:
        kwargs["tools"] = [
            {
                "name": "emit_structured_response",
                "description": "Return the requested JSON object exactly.",
                "input_schema": structured_schema,
            }
        ]
        kwargs["tool_choice"] = {"type": "tool", "name": "emit_structured_response"}

    msg = await client.messages.create(**kwargs)
    text = ""
    if structured_schema:
        for block in msg.content:
            if getattr(block, "type", None) == "tool_use":
                text = json.dumps(getattr(block, "input", {}), separators=(",", ":"))
                break
    if not text and msg.content:
        text = getattr(msg.content[0], "text", "") or ""
    usage = getattr(msg, "usage", None)
    cache = None
    in_tok = None
    out_tok = None
    if usage is not None:
        cached_read = getattr(usage, "cache_read_input_tokens", 0) or 0
        cached_write = getattr(usage, "cache_creation_input_tokens", 0) or 0
        in_tok = getattr(usage, "input_tokens", 0) or 0
        out_tok = getattr(usage, "output_tokens", 0) or 0
        cache = {"read": cached_read, "write": cached_write}
    return CallResult(
        text=text,
        provider=cfg.name,
        model=cfg.model,
        cache=cache,
        input_tokens=in_tok,
        output_tokens=out_tok,
    )


async def _call_openai_compatible(
    cfg: ProviderConfig,
    persona_block: str,
    rag_block: str,
    user_message: str,
    max_tokens: int = 1024,
    response_format: Optional[Dict[str, Any]] = None,
    temperature: Optional[float] = None,
) -> CallResult:
    kwargs: Dict[str, Any] = {"api_key": cfg.api_key}
    if cfg.base_url:
        kwargs["base_url"] = cfg.base_url
    client = AsyncOpenAI(**kwargs)
    full_system = persona_block + ("\n\n" + rag_block if rag_block else "")
    request_kwargs: Dict[str, Any] = {
        "model": cfg.model,
        "messages": [
            {"role": "system", "content": full_system},
            {"role": "user", "content": user_message},
        ],
        "max_tokens": max_tokens,
    }
    if response_format:
        request_kwargs["response_format"] = response_format
    if temperature is not None:
        request_kwargs["temperature"] = temperature

    resp = await client.chat.completions.create(**request_kwargs)
    text = resp.choices[0].message.content
    usage = getattr(resp, "usage", None)
    in_tok = getattr(usage, "prompt_tokens", None) if usage else None
    out_tok = getattr(usage, "completion_tokens", None) if usage else None
    return CallResult(
        text=text,
        provider=cfg.name,
        model=cfg.model,
        cache=None,
        input_tokens=in_tok,
        output_tokens=out_tok,
    )


async def call_provider(
    cfg: ProviderConfig, persona_block: str, rag_block: str, user_message: str
) -> CallResult:
    return await call_provider_with_options(cfg, persona_block, rag_block, user_message)


async def call_provider_with_options(
    cfg: ProviderConfig,
    persona_block: str,
    rag_block: str,
    user_message: str,
    max_tokens: int = 1024,
    response_format: Optional[Dict[str, Any]] = None,
    temperature: Optional[float] = None,
    structured_schema: Optional[Dict[str, Any]] = None,
) -> CallResult:
    if cfg.name == "anthropic":
        return await _call_anthropic(
            cfg,
            persona_block,
            rag_block,
            user_message,
            max_tokens=max_tokens,
            structured_schema=structured_schema,
        )
    return await _call_openai_compatible(
        cfg,
        persona_block,
        rag_block,
        user_message,
        max_tokens=max_tokens,
        response_format=response_format,
        temperature=temperature,
    )


async def run_chain(
    chain: List[ProviderConfig],
    persona_block: str,
    rag_block: str,
    user_message: str,
    agent_id: str,
    tier: str,
    persona_cache_key: Optional[str] = None,
    max_tokens: int = 1024,
    response_format: Optional[Dict[str, Any]] = None,
    temperature: Optional[float] = None,
    structured_schema: Optional[Dict[str, Any]] = None,
) -> Optional[CallResult]:
    """
    Walk the chain. Skip keyless providers. Log fallback_event on each failure.
    Return the first successful result, or None if every provider failed.
    """
    for i, cfg in enumerate(chain):
        if not cfg.api_key:
            continue
        try:
            if (
                max_tokens == 1024
                and response_format is None
                and temperature is None
                and structured_schema is None
            ):
                result = await call_provider(cfg, persona_block, rag_block, user_message)
            else:
                result = await call_provider_with_options(
                    cfg,
                    persona_block,
                    rag_block,
                    user_message,
                    max_tokens=max_tokens,
                    response_format=response_format,
                    temperature=temperature,
                    structured_schema=structured_schema,
                )
            if cfg.name == "anthropic" and result.cache is not None:
                cached_total = result.cache["read"] + result.cache["write"]
                read_ratio = (
                    (result.cache["read"] / cached_total) if cached_total > 0 else 0.0
                )
                # Structured log line — grep "cache_metric" in Railway logs to
                # compute read-hit ratio.
                print(
                    f"cache_metric agentId={agent_id} tier={tier} model={cfg.model} "
                    f"cache_read={result.cache['read']} cache_write={result.cache['write']} "
                    f"input_tokens={result.input_tokens} output_tokens={result.output_tokens} "
                    f"read_ratio={read_ratio:.3f} persona_cache_key={persona_cache_key}",
                    flush=True,
                )
            if cfg.is_paid_lastditch:
                # Heads-up: every free provider failed and we fell through to
                # the paid escape hatch. Grep "alert_event reason=paid_fallback"
                # in Railway logs to catch this early.
                print(
                    f"alert_event reason=paid_fallback provider={cfg.name} "
                    f"model={cfg.model} agentId={agent_id} tier={tier}",
                    flush=True,
                )
            return result
        except Exception as e:
            reason = "rate_limit" if is_quota_error(e) else "error"
            next_name = "none"
            for nxt in chain[i + 1 :]:
                if nxt.api_key:
                    next_name = nxt.name
                    break
            print(
                f"fallback_event provider={cfg.name} reason={reason} "
                f"next={next_name} agentId={agent_id} error={str(e)[:200]}",
                flush=True,
            )
            continue
    return None


# ── Streaming variants (true token streaming for the A2A message/stream path) ──

async def _call_anthropic_stream(
    cfg: ProviderConfig,
    persona_block: str,
    rag_block: str,
    user_message: str,
    max_tokens: int = 1024,
):
    """Yield text deltas from Anthropic via the streaming helper."""
    client = anthropic.AsyncAnthropic(api_key=cfg.api_key)
    system_blocks: List[Dict[str, Any]] = [
        {"type": "text", "text": persona_block, "cache_control": {"type": "ephemeral"}}
    ]
    if rag_block:
        system_blocks.append({"type": "text", "text": rag_block})
    async with client.messages.stream(
        model=cfg.model,
        max_tokens=max_tokens,
        system=system_blocks,
        messages=[{"role": "user", "content": user_message}],
    ) as stream:
        async for text in stream.text_stream:
            if text:
                yield text


async def _call_openai_compatible_stream(
    cfg: ProviderConfig,
    persona_block: str,
    rag_block: str,
    user_message: str,
    max_tokens: int = 1024,
):
    """Yield text deltas from an OpenAI-compatible provider (Groq/Cerebras/Gemini/…)."""
    kwargs: Dict[str, Any] = {"api_key": cfg.api_key}
    if cfg.base_url:
        kwargs["base_url"] = cfg.base_url
    client = AsyncOpenAI(**kwargs)
    full_system = persona_block + ("\n\n" + rag_block if rag_block else "")
    stream = await client.chat.completions.create(
        model=cfg.model,
        messages=[
            {"role": "system", "content": full_system},
            {"role": "user", "content": user_message},
        ],
        max_tokens=max_tokens,
        stream=True,
    )
    async for chunk in stream:
        choices = getattr(chunk, "choices", None)
        if not choices:
            continue
        delta = getattr(choices[0].delta, "content", None)
        if delta:
            yield delta


async def _stream_provider(
    cfg: ProviderConfig, persona_block: str, rag_block: str, user_message: str, max_tokens: int = 1024
):
    if cfg.name == "anthropic":
        async for t in _call_anthropic_stream(cfg, persona_block, rag_block, user_message, max_tokens):
            yield t
    else:
        async for t in _call_openai_compatible_stream(cfg, persona_block, rag_block, user_message, max_tokens):
            yield t


async def run_chain_stream(
    chain: List[ProviderConfig],
    persona_block: str,
    rag_block: str,
    user_message: str,
    agent_id: str,
    tier: str,
    max_tokens: int = 1024,
):
    """
    Streaming analog of run_chain. Yields text deltas from the first provider that
    starts streaming. Connect-time failures (quota/billing/no key) fall through to
    the next provider exactly like run_chain; a mid-stream failure ends the stream
    gracefully (partial output already delivered). Yields a sentinel string if every
    provider fails to start.
    """
    for i, cfg in enumerate(chain):
        if not cfg.api_key:
            continue
        gen = _stream_provider(cfg, persona_block, rag_block, user_message, max_tokens)
        # Pull the first delta to confirm the stream actually started.
        try:
            first = await gen.__anext__()
        except StopAsyncIteration:
            print(f"fallback_event provider={cfg.name} reason=empty_stream agentId={agent_id}", flush=True)
            continue
        except Exception as e:  # noqa: BLE001
            reason = "rate_limit" if is_quota_error(e) else "error"
            next_name = next((n.name for n in chain[i + 1 :] if n.api_key), "none")
            print(
                f"fallback_event provider={cfg.name} reason={reason} next={next_name} "
                f"agentId={agent_id} error={str(e)[:200]}",
                flush=True,
            )
            continue
        if cfg.is_paid_lastditch:
            print(
                f"alert_event reason=paid_fallback provider={cfg.name} model={cfg.model} "
                f"agentId={agent_id} tier={tier}",
                flush=True,
            )
        if first:
            yield first
        try:
            async for delta in gen:
                if delta:
                    yield delta
        except Exception as e:  # noqa: BLE001 — partial output already sent; end stream
            print(f"stream_interrupt provider={cfg.name} agentId={agent_id} error={str(e)[:200]}", flush=True)
        return
    yield "[All providers unavailable]"


async def health_check(cfg: ProviderConfig, timeout_s: float = 5.0) -> Dict[str, Any]:
    """Ping a single provider with a 1-token 'hi' prompt."""
    if not cfg.api_key:
        return {"ok": False, "latency_ms": None, "error": "no_api_key", "model": cfg.model}
    t0 = time.perf_counter()
    try:
        if cfg.name == "anthropic":
            client = anthropic.AsyncAnthropic(api_key=cfg.api_key, timeout=timeout_s)
            await client.messages.create(
                model=cfg.model,
                max_tokens=1,
                messages=[{"role": "user", "content": "hi"}],
            )
        else:
            kwargs: Dict[str, Any] = {"api_key": cfg.api_key, "timeout": timeout_s}
            if cfg.base_url:
                kwargs["base_url"] = cfg.base_url
            client = AsyncOpenAI(**kwargs)
            await client.chat.completions.create(
                model=cfg.model,
                max_tokens=1,
                messages=[{"role": "user", "content": "hi"}],
            )
        latency_ms = int((time.perf_counter() - t0) * 1000)
        return {"ok": True, "latency_ms": latency_ms, "error": None, "model": cfg.model}
    except Exception as e:
        latency_ms = int((time.perf_counter() - t0) * 1000)
        return {
            "ok": False,
            "latency_ms": latency_ms,
            "error": str(e)[:200],
            "model": cfg.model,
        }
