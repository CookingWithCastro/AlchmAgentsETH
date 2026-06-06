from __future__ import annotations

import asyncio
import json
import os
import sys
from typing import Any, Dict, List, Optional

import httpx

import alchm_mcp
from datetime import datetime
import mcp_invocation_log



PROTOCOL_VERSION = os.getenv("PLANETARY_AGENTS_MCP_PROTOCOL_VERSION", "2025-06-18")


def _resolve_url(env_names: tuple[str, ...], frozen_default: str, dev_default: str) -> str:
    """Resolve a service URL for the MCP server.

    Explicit env always wins. When running as the frozen PyInstaller desktop
    sidecar there is no local dev backend on localhost, so fall back to the
    production host instead (the desktop app may also inject these via env).
    """
    for name in env_names:
        value = os.getenv(name)
        if value:
            return value
    return frozen_default if getattr(sys, "frozen", False) else dev_default


BACKEND_URL = _resolve_url(
    ("PLANETARY_AGENTS_BACKEND_URL", "NEXT_PUBLIC_BACKEND_URL"),
    "https://api.agents.alchm.kitchen",
    "http://localhost:8000",
)
FRONTEND_URL = _resolve_url(
    ("PLANETARY_AGENTS_FRONTEND_URL",),
    "https://agents.alchm.kitchen",
    "http://localhost:3000",
)
DEFAULT_MODEL_TIER = os.getenv("PLANETARY_AGENTS_MCP_MODEL_TIER", "free")

AGENT_ALIASES = {
    "socrates": "socrates",
    "rumi": "rumi",
    "jalal ad-din rumi": "rumi",
    "jalaluddin rumi": "rumi",
    "galileo": "galileo-galilei",
    "galileo galilei": "galileo-galilei",
    "jung": "carl-jung",
    "carl jung": "carl-jung",
}


TOOLS: List[Dict[str, Any]] = [
    {
        "name": "chat_with_planetary_agent",
        "description": "Converse with a configured Planetary Agents persona through the FastAPI chat pipeline.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "agentName": {
                    "type": "string",
                    "description": "Agent name or slug, e.g. Socrates, Rumi, Galileo, Jung, socrates.",
                },
                "message": {"type": "string", "description": "User message for the agent."},
                "conversationHistory": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Optional recent turns to provide as lightweight context.",
                },
                "modelTier": {
                    "type": "string",
                    "enum": ["free", "cheap_fast", "primary", "reflective"],
                    "description": "Optional backend model tier override.",
                },
                "context": {
                    "type": "object",
                    "additionalProperties": True,
                    "description": "Optional structured context to pass through to /api/chat.",
                },
            },
            "required": ["agentName", "message"],
        },
    },
    {
        "name": "get_agent_feed_discussion",
        "description": "Retrieve a council-feed event or thread by ID from the Planetary Agents frontend feed.",
        "inputSchema": {
            "type": "object",
            "properties": {"threadId": {"type": "string", "description": "Feed event or thread ID."}},
            "required": ["threadId"],
        },
    },
    {
        "name": "synthesize_culinary_debate",
        "description": "Ask multiple historical personas to debate ingredients using Alchm MCP ingredient and recipe data when available.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "ingredients": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Ingredients to debate.",
                },
                "agents": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Agent names or slugs. Defaults to Socrates, Rumi, and Galileo.",
                },
                "modelTier": {
                    "type": "string",
                    "enum": ["free", "cheap_fast", "primary", "reflective"],
                    "description": "Optional backend model tier override.",
                },
            },
            "required": ["ingredients"],
        },
    },
    {
        "name": "trigger_chart_specific_jing_duel",
        "description": "Automatically detect birthchart synastry aspects between two agents and trigger an in-character Jing duel/clash.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "casterName": {
                    "type": "string",
                    "description": "Agent initiating the clash, e.g. Socrates, Rumi, Galileo, Carl Jung.",
                },
                "targetName": {
                    "type": "string",
                    "description": "Agent defending the clash, e.g. Socrates, Rumi, Galileo, Carl Jung.",
                },
                "modelTier": {
                    "type": "string",
                    "enum": ["free", "cheap_fast", "primary", "reflective"],
                    "description": "Optional backend model tier override.",
                },
            },
            "required": ["casterName", "targetName"],
        },
    },
    {
        "name": "plan_weekly_menu",
        "description": "Plan an agentic weekly menu attuned to the agent's planetary/culinary style.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "agentName": {
                    "type": "string",
                    "description": "Agent name or slug, e.g. hildegard-of-bingen, Socrates, carl-jung.",
                },
                "weekStartDate": {
                    "type": "string",
                    "description": "Optional ISO string representing Sunday start date (e.g. 2026-05-31T00:00:00.000Z).",
                },
                "status": {
                    "type": "string",
                    "enum": ["draft", "completed"],
                    "description": "Save as draft or complete it immediately to share to the feed.",
                },
                "shareToFeed": {
                    "type": "boolean",
                    "description": "Explicitly share to feed when status is completed.",
                },
            },
            "required": ["agentName"],
        },
    },
]


def _log(message: str) -> None:
    print(message, file=sys.stderr, flush=True)


def _ensure_local_storage() -> None:
    """Create telemetry tables when running as the frozen desktop sidecar.

    Only the frozen pa-mcp binary starts against an empty local SQLite file
    (see database._frozen_sqlite_dsn). The FastAPI server and the Railway
    `python3` run of this module already have their tables created by main.py /
    migrations against Postgres, so this is scoped to frozen mode and is a
    no-op there. Without it, mcp_invocation_log.record_invocation() would hit a
    missing `mcp_invocations` table and log a caught error on every tool call.
    Wrapped so a failure can never stop the stdio server from booting —
    telemetry then simply degrades to noop, which is acceptable for a sidecar.
    """
    if not getattr(sys, "frozen", False):
        return
    try:
        import database
        import models

        models.Base.metadata.create_all(bind=database.engine)
    except Exception as exc:  # noqa: BLE001 — local telemetry is best-effort
        _log(f"_ensure_local_storage: local telemetry schema unavailable: {exc}")


def _agent_id(agent_name: str) -> str:
    key = agent_name.strip().lower()
    return AGENT_ALIASES.get(key, key.replace(" ", "-"))


def _text_result(payload: Dict[str, Any], is_error: bool = False) -> Dict[str, Any]:
    result: Dict[str, Any] = {
        "content": [{"type": "text", "text": json.dumps(payload, indent=2, ensure_ascii=True)}]
    }
    if is_error:
        result["isError"] = True
    return result


def _get_agent_natal_chart(agent_name: str) -> Optional[Dict[str, Any]]:
    """Retrieve natal chart for an agent from database."""
    try:
        from database import SessionLocal
        import crud
        db = SessionLocal()
        try:
            agent_id = _agent_id(agent_name)
            agent = crud.get_agent(db, agent_id)
            if agent and agent.natalChart:
                if isinstance(agent.natalChart, dict):
                    return agent.natalChart
                elif isinstance(agent.natalChart, str):
                    return json.loads(agent.natalChart)
        finally:
            db.close()
    except Exception as e:
        _log(f"_get_agent_natal_chart failed for {agent_name}: {e}")
    return None


async def _detect_and_trigger_jing_interaction(
    caster_name: str,
    target_name: str
) -> Optional[Dict[str, Any]]:
    """
    Retrieves natal charts for caster and target, calculates synastry aspects,
    and automatically triggers a chart-specific Jing/Jong interaction.
    """
    caster_chart = _get_agent_natal_chart(caster_name)
    target_chart = _get_agent_natal_chart(target_name)
    
    if not caster_chart or not target_chart:
        _log(f"Auto Jing trigger: Natal charts not found for {caster_name} or {target_name}")
        return None

    try:
        caster_id = _agent_id(caster_name)
        target_id = _agent_id(target_name)
        
        synastry = await alchm_mcp.compute_synastry_overlay(
            {"id": caster_id, "natalChart": caster_chart},
            {"id": target_id, "natalChart": target_chart}
        )
        
        if not synastry or "interchartAspects" not in synastry:
            return None
            
        aspects = synastry.get("interchartAspects", [])
        if not aspects:
            return None
            
        # Sort aspects by orb to find the exact/most powerful alignment
        sorted_aspects = sorted(aspects, key=lambda x: x.get("orb", 10.0))
        exact_aspect = sorted_aspects[0]
        
        # Decide which Jing move is auto-triggered based on the aspect's harmonic and planets
        aspect_type = exact_aspect.get("type", "conjunction")
        harmonic = exact_aspect.get("harmonic", "intensification")
        planet_a = exact_aspect.get("planetA", "Sun")
        planet_b = exact_aspect.get("planetB", "Sun")
        orb = exact_aspect.get("orb", 0.0)
        
        # We auto-trigger if orb is tight enough (e.g. <= 6.0 degrees)
        if orb > 6.0:
            return None
            
        # Map to an elemental Jing Move
        # Meltdown (Fire) - friction / hot / squares
        # Freeze (Water) - cold / rigid / oppositions
        # Tectonic Root (Earth) - stability / barriers / conjuncts
        # Vacuum (Air) - intellectualizing / snuffing / sextiles/trines
        if harmonic == "friction":
            move_id = "meltdown"
            move_name = "Meltdown"
            element = "Fire"
            description = "Frictional astrological square/opposition has auto-triggered Meltdown! Shatter structural barriers and intensify debate."
        elif harmonic == "harmony":
            move_id = "vacuum"
            move_name = "Vacuum"
            element = "Air"
            description = "Harmonious trine/sextile has auto-triggered Vacuum! Removing oxygen to calm the dialogue using airy logic."
        else: # intensification / conjunction
            move_id = "freeze"
            move_name = "Freeze"
            element = "Water"
            description = "Intense exact conjunction has auto-triggered Freeze! Locking stances and holding previous states in rigid focus."
            
        return {
            "triggered": True,
            "caster": caster_name,
            "casterId": caster_id,
            "target": target_name,
            "targetId": target_id,
            "moveId": move_id,
            "moveName": move_name,
            "element": element,
            "aspect": {
                "type": aspect_type,
                "planetA": planet_a,
                "planetB": planet_b,
                "orb": orb,
                "harmonic": harmonic
            },
            "description": description,
            "scores": synastry.get("scores", {})
        }
    except Exception as e:
        _log(f"Error in _detect_and_trigger_jing_interaction: {e}")
        return None


async def trigger_chart_specific_jing_duel(arguments: Dict[str, Any]) -> Dict[str, Any]:
    caster_name = str(arguments.get("casterName") or "").strip()
    target_name = str(arguments.get("targetName") or "").strip()
    
    if not caster_name or not target_name:
        return _text_result({"error": "casterName and targetName are required"}, is_error=True)
        
    model_tier = arguments.get("modelTier") or DEFAULT_MODEL_TIER
    
    triggered_jing = await _detect_and_trigger_jing_interaction(caster_name, target_name)
    
    if not triggered_jing:
        return _text_result({
            "triggered": False,
            "reason": f"No close astrological synastry aspects (orb <= 6.0°) found between {caster_name} and {target_name} to auto-trigger a Jing clash."
        })
        
    # Generate the dialogue in-character for both caster and target
    aspect_desc = f"{triggered_jing['aspect']['planetA']} {triggered_jing['aspect']['type']} {triggered_jing['aspect']['planetB']} ({triggered_jing['aspect']['orb']:.1f}° orb)"
    
    caster_prompt = (
        f"You are casting the {triggered_jing['moveName']} ({triggered_jing['element']}) Jing on {target_name} due to your powerful birthchart synastry aspect: {aspect_desc}. "
        f"Speak ONE bold, defiant line, 1-2 sentences, in character, no greeting, no narration. Express your element!"
    )
    
    target_prompt = (
        f"You are being attacked by {caster_name}'s {triggered_jing['moveName']} ({triggered_jing['element']}) Jing due to your powerful birthchart synastry aspect: {aspect_desc}. "
        f"Speak ONE bold, counter-line, 1-2 sentences, in character, defending yourself or responding to their element!"
    )
    
    context = {
        "caster": caster_name,
        "target": target_name,
        "aspect": aspect_desc,
        "move": triggered_jing["moveName"],
        "element": triggered_jing["element"],
        "topic": "Jing Duel"
    }
    
    # Run completions for both caster and target
    caster_task = asyncio.create_task(_backend_chat(
        agent_name=caster_name,
        message=caster_prompt,
        context=context,
        model_tier=model_tier
    ))
    
    target_task = asyncio.create_task(_backend_chat(
        agent_name=target_name,
        message=target_prompt,
        context=context,
        model_tier=model_tier
    ))
    
    try:
        caster_res = await caster_task
        caster_text = caster_res.get("text", "")
    except Exception as exc:
        caster_text = f"Caster failed to respond: {exc}"
        
    try:
        target_res = await target_task
        target_text = target_res.get("text", "")
    except Exception as exc:
        target_text = f"Target failed to respond: {exc}"
        
    triggered_jing["casterVoice"] = caster_text
    triggered_jing["targetVoice"] = target_text
    
    return _text_result(triggered_jing)


async def _live_sky_context() -> Optional[Dict[str, Any]]:
    """Fetch the current sky elemental balance + dominant element so
    every persona response can be grounded in real planetary state.

    Returns a small dict (dominantElement + elementalBalance + timestamp)
    or None when the Alchm MCP is unreachable — callers degrade silently
    rather than blocking the chat.
    """
    try:
        transits = await alchm_mcp.get_live_sky_transits()
    except Exception as exc:  # noqa: BLE001 — degrade silently on any failure
        _log(f"_live_sky_context: alchm transits failed: {exc}")
        return None

    if not isinstance(transits, dict) or not transits:
        return None

    return {
        "timestamp": transits.get("timestamp"),
        "dominantElement": transits.get("dominantElement"),
        "elementalBalance": transits.get("elementalBalance"),
    }


async def _backend_chat(
    agent_name: str,
    message: str,
    conversation_history: Optional[List[str]] = None,
    context: Optional[Dict[str, Any]] = None,
    model_tier: Optional[str] = None,
    sky_state: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    agent_id = _agent_id(agent_name)
    merged_context = dict(context or {})
    if conversation_history:
        merged_context["conversationHistory"] = conversation_history[-12:]
    merged_context["mcpTool"] = "chat_with_planetary_agent"
    if sky_state and "liveSkyState" not in merged_context:
        # Personas always read from a fresh sky snapshot. We only set the
        # field when the caller didn't already provide one (allows the
        # culinary-debate flow to pass the scan-derived state through).
        merged_context["liveSkyState"] = sky_state

    payload = {
        "agentId": agent_id,
        "message": message,
        "sessionId": f"mcp-{agent_id}",
        "context": merged_context,
        "modelTier": model_tier or DEFAULT_MODEL_TIER,
    }

    async with httpx.AsyncClient(timeout=45.0) as client:
        response = await client.post(f"{BACKEND_URL.rstrip('/')}/api/chat", json=payload)
        response.raise_for_status()
        data = response.json()

    return {
        "agentName": agent_name,
        "agentId": agent_id,
        "text": data.get("text", ""),
        "sessionId": data.get("sessionId"),
        "metadata": data.get("metadata", {}),
    }


async def chat_with_planetary_agent(arguments: Dict[str, Any]) -> Dict[str, Any]:
    agent_name = str(arguments.get("agentName") or "").strip()
    message = str(arguments.get("message") or "").strip()
    if not agent_name or not message:
        return _text_result({"error": "agentName and message are required"}, is_error=True)

    sky_state = await _live_sky_context()

    try:
        result = await _backend_chat(
            agent_name=agent_name,
            message=message,
            conversation_history=arguments.get("conversationHistory"),
            context=arguments.get("context") if isinstance(arguments.get("context"), dict) else None,
            model_tier=arguments.get("modelTier"),
            sky_state=sky_state,
        )
        # Surface the sky snapshot in the tool result so the calling LLM
        # can quote it directly without a second round-trip.
        if sky_state:
            result["liveSkyState"] = sky_state
        return _text_result(result)
    except Exception as exc:
        return _text_result(
            {
                "error": "chat_with_planetary_agent failed",
                "message": str(exc),
                "backendUrl": BACKEND_URL,
                "liveSkyState": sky_state,
            },
            is_error=True,
        )


async def get_agent_feed_discussion(arguments: Dict[str, Any]) -> Dict[str, Any]:
    thread_id = str(arguments.get("threadId") or "").strip()
    if not thread_id:
        return _text_result({"error": "threadId is required"}, is_error=True)

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(f"{FRONTEND_URL.rstrip('/')}/api/feed")
            response.raise_for_status()
            data = response.json()
    except Exception as exc:
        return _text_result(
            {
                "error": "get_agent_feed_discussion failed",
                "message": str(exc),
                "frontendUrl": FRONTEND_URL,
            },
            is_error=True,
        )

    events = data.get("events", []) if isinstance(data, dict) else []
    event = next((item for item in events if isinstance(item, dict) and item.get("id") == thread_id), None)
    if event is None:
        return _text_result(
            {
                "threadId": thread_id,
                "found": False,
                "availableEventIds": [item.get("id") for item in events if isinstance(item, dict)][:20],
            }
        )

    return _text_result({"threadId": thread_id, "found": True, "event": event, "thread": event.get("thread", [])})


async def synthesize_culinary_debate(arguments: Dict[str, Any]) -> Dict[str, Any]:
    ingredients = arguments.get("ingredients")
    if not isinstance(ingredients, list) or not all(isinstance(item, str) for item in ingredients):
        return _text_result({"error": "ingredients must be an array of strings"}, is_error=True)

    agents = arguments.get("agents")
    if not isinstance(agents, list) or not agents:
        agents = ["Socrates", "Rumi", "Galileo"]
    agents = [str(agent) for agent in agents[:6]]
    model_tier = arguments.get("modelTier") or DEFAULT_MODEL_TIER

    alchemical_scan: Dict[str, Any] = {}
    recipe_candidates: Dict[str, Any] = {}
    data_errors: List[str] = []

    # Pull all three sources in parallel so the debate is grounded in live
    # state before personas open their mouths. Each call is independent —
    # one failure is captured in data_errors and doesn't stall the others.
    scan_task = asyncio.create_task(alchm_mcp.alchemize_ingredients(ingredients))
    transits_task = asyncio.create_task(_live_sky_context())

    try:
        alchemical_scan = await scan_task
    except Exception as exc:
        data_errors.append(f"alchemize_ingredients: {exc}")

    try:
        sky_state = await transits_task
    except Exception as exc:
        data_errors.append(f"get_live_sky_transits: {exc}")
        sky_state = None

    try:
        recipe_candidates = await alchm_mcp.generate_cosmic_recipe(
            prompt=", ".join(ingredients),
            dominant_element=alchemical_scan.get("dominantElement") if alchemical_scan else None,
        )
    except Exception as exc:
        data_errors.append(f"generate_cosmic_recipe: {exc}")

    # Auto-detect and trigger a chart-specific Jing interaction between the main debating agents
    triggered_jing = None
    if len(agents) >= 2:
        try:
            triggered_jing = await _detect_and_trigger_jing_interaction(agents[0], agents[1])
        except Exception as e:
            _log(f"Failed to auto-trigger Jing overlay for debate: {e}")

    debate_prompt = (
        "Join a concise culinary debate about these ingredients: "
        f"{', '.join(ingredients)}.\n"
        "Use your own historical voice. Give one vivid stance in 2-3 sentences. "
        "Address alchemical virtue, imbalance, or transformation without mentioning system internals."
    )
    if triggered_jing:
        aspect_desc = f"{triggered_jing['aspect']['planetA']} {triggered_jing['aspect']['type']} {triggered_jing['aspect']['planetB']} (Orb: {triggered_jing['aspect']['orb']:.1f}°)"
        debate_prompt += (
            f"\n\n[Astrological Synastry Alert: A chart-specific JING move has been auto-triggered between {agents[0]} and {agents[1]}! "
            f"Aspect: {aspect_desc}. Move: {triggered_jing['moveName']} ({triggered_jing['element']}). "
            f"Friction/Harmonic Stance: {triggered_jing['aspect']['harmonic'].upper()}. "
            f"Description: {triggered_jing['description']}. "
            f"You MUST express this elemental interaction, clash, or defence in character in your stance!]"
        )

    context = {
        "ingredients": ingredients,
        "alchemicalScan": alchemical_scan,
        "recipeCandidates": recipe_candidates,
        "topic": "culinary debate",
    }
    if triggered_jing:
        context["triggeredJing"] = triggered_jing
    if sky_state:
        context["liveSkyState"] = sky_state

    async def _stance(agent: str) -> Dict[str, Any]:
        try:
            return await _backend_chat(
                agent_name=agent,
                message=debate_prompt,
                context=context,
                model_tier=model_tier,
                sky_state=sky_state,
            )
        except Exception as exc:
            return {"agentName": agent, "agentId": _agent_id(agent), "error": str(exc)}

    dialogue = await asyncio.gather(*(_stance(agent) for agent in agents))
    return _text_result(
        {
            "ingredients": ingredients,
            "agents": agents,
            "alchemicalScan": alchemical_scan,
            "recipeCandidates": recipe_candidates,
            "liveSkyState": sky_state,
            "triggeredJing": triggered_jing,
            "dataErrors": data_errors,
            "dialogue": dialogue,
        }
    )


async def plan_weekly_menu(arguments: Dict[str, Any]) -> Dict[str, Any]:
    agent_name = str(arguments.get("agentName") or "").strip()
    if not agent_name:
        return _text_result({"error": "agentName is required"}, is_error=True)
    
    agent_id = _agent_id(agent_name)
    week_start_date = arguments.get("weekStartDate")
    status = arguments.get("status") or "completed"
    share_to_feed = arguments.get("shareToFeed")
    if share_to_feed is None:
        share_to_feed = (status == "completed")
        
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            # 1. Generate menu (saves as draft)
            gen_resp = await client.post(
                f"{FRONTEND_URL.rstrip('/')}/api/menu-planner/generate",
                json={
                    "agentId": agent_id,
                    "weekStartDate": week_start_date,
                    "regenerate": True
                }
            )
            gen_resp.raise_for_status()
            gen_data = gen_resp.json()
            
            if not gen_data.get("success") or not gen_data.get("menu"):
                raise ValueError(gen_data.get("error") or "Failed to generate menu")
                
            menu = gen_data["menu"]
            
            # 2. If status is completed, post to weekly proxy to complete and share to feed
            if status == "completed":
                menu["status"] = "completed"
                menu["shareToFeed"] = share_to_feed
                
                post_resp = await client.post(
                    f"{FRONTEND_URL.rstrip('/')}/api/menu-planner/weekly",
                    json=menu
                )
                post_resp.raise_for_status()
                post_data = post_resp.json()
                
                return _text_result({
                    "success": True,
                    "message": f"Successfully planned and shared weekly menu '{menu.get('title')}' for {agent_name}!",
                    "menu": post_data.get("menu") or menu,
                    "feedShared": post_data.get("feedShared", False)
                })
                
            return _text_result({
                "success": True,
                "message": f"Successfully planned draft weekly menu '{menu.get('title')}' for {agent_name}!",
                "menu": menu
            })
            
    except Exception as exc:
        return _text_result(
            {
                "error": "plan_weekly_menu failed",
                "message": str(exc),
                "frontendUrl": FRONTEND_URL
            },
            is_error=True
        )


TOOL_HANDLERS = {
    "chat_with_planetary_agent": chat_with_planetary_agent,
    "get_agent_feed_discussion": get_agent_feed_discussion,
    "synthesize_culinary_debate": synthesize_culinary_debate,
    "trigger_chart_specific_jing_duel": trigger_chart_specific_jing_duel,
    "plan_weekly_menu": plan_weekly_menu,
}



async def handle_request(message: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    method = message.get("method")
    request_id = message.get("id")

    if method == "notifications/initialized":
        return None

    try:
        if method == "initialize":
            result = {
                "protocolVersion": PROTOCOL_VERSION,
                "capabilities": {"tools": {}},
                "serverInfo": {"name": "planetary-agents-mcp-server", "version": "1.0.0"},
            }
        elif method == "ping":
            result = {}
        elif method == "tools/list":
            result = {"tools": TOOLS}
        elif method == "tools/call":
            params = message.get("params") if isinstance(message.get("params"), dict) else {}
            name = params.get("name")
            arguments = params.get("arguments") if isinstance(params.get("arguments"), dict) else {}

            # Gate and validate before dispatching
            gated_args, api_key_id, user_id, auth_tier, resolved_model_tier = mcp_invocation_log.validate_and_gate_invocation(name, arguments)

            handler = TOOL_HANDLERS.get(name)
            if handler is None:
                raise ValueError(f"Unknown tool: {name}")

            called_at = datetime.utcnow()
            success = True
            error_message = None
            result = None

            try:
                result = await handler(gated_args)
                if isinstance(result, dict) and result.get("isError"):
                    success = False
                    try:
                        content_list = result.get("content", [])
                        if content_list and isinstance(content_list[0], dict):
                            err_txt = content_list[0].get("text", "")
                            err_json = json.loads(err_txt)
                            error_message = err_json.get("error") or err_json.get("message")
                    except Exception:
                        error_message = "Tool returned an error status"
            except Exception as exc:
                success = False
                error_message = str(exc)
                raise exc
            finally:
                completed_at = datetime.utcnow()
                latency_ms = int((completed_at - called_at).total_seconds() * 1000)

                # Extract caller
                meta = arguments.get("_meta") or {}
                caller = meta.get("caller") or "anonymous"

                # Resolve agentId
                agent_id = None
                if name in ("chat_with_planetary_agent", "synthesize_culinary_debate", "trigger_chart_specific_jing_duel"):
                    agent_name = gated_args.get("agentName") or gated_args.get("agent_name") or gated_args.get("casterName")
                    if agent_name:
                        agent_id = _agent_id(agent_name)
                    if name == "trigger_chart_specific_jing_duel":
                        caster = gated_args.get("casterName")
                        target = gated_args.get("targetName")
                        if caster and target:
                            agent_id = f"{_agent_id(caster)},{_agent_id(target)}"
                    elif not agent_id and name == "synthesize_culinary_debate":
                        agents = gated_args.get("agents")
                        if agents:
                            agent_id = ",".join([_agent_id(a) for a in agents])

                # Extract concise result summary
                result_summary = {}
                if result and isinstance(result, dict):
                    content = result.get("content")
                    if content and isinstance(content, list) and len(content) > 0:
                        try:
                            summary_text = content[0].get("text", "")
                            parsed_res = json.loads(summary_text)
                            if isinstance(parsed_res, dict):
                                result_summary = {
                                    "success": not parsed_res.get("error"),
                                    "text_length": len(parsed_res.get("text", "")),
                                    "has_history": "conversationHistory" in gated_args,
                                    "dialogue_count": len(parsed_res.get("dialogue", [])) if "dialogue" in parsed_res else None,
                                    "found": parsed_res.get("found"),
                                    "keys": list(parsed_res.keys())
                                }
                        except Exception:
                            result_summary = {"text_preview": str(content[0].get("text", ""))[:200]}

                await mcp_invocation_log.record_invocation(
                    tool_name=name,
                    called_at=called_at,
                    completed_at=completed_at,
                    latency_ms=latency_ms,
                    success=success,
                    caller=caller,
                    arguments=arguments,
                    result_summary=result_summary,
                    error_message=error_message,
                    agent_id=agent_id,
                    model_tier=resolved_model_tier,
                    api_key_id=api_key_id,
                    user_id=user_id
                )
        else:
            return {
                "jsonrpc": "2.0",
                "id": request_id,
                "error": {"code": -32601, "message": f"Method not found: {method}"},
            }

        if request_id is None:
            return None
        return {"jsonrpc": "2.0", "id": request_id, "result": result}
    except Exception as exc:
        if request_id is None:
            return None
        return {
            "jsonrpc": "2.0",
            "id": request_id,
            "error": {"code": -32603, "message": str(exc)},
        }


async def write_message(message: Dict[str, Any]) -> None:
    sys.stdout.write(json.dumps(message, separators=(",", ":")) + "\n")
    sys.stdout.flush()


async def main() -> None:
    _ensure_local_storage()
    _log("Planetary Agents MCP Server started on stdio")
    loop = asyncio.get_running_loop()

    while True:
        line = await loop.run_in_executor(None, sys.stdin.readline)
        if not line:
            break
        line = line.strip()
        if not line:
            continue

        try:
            message = json.loads(line)
        except json.JSONDecodeError as exc:
            await write_message(
                {
                    "jsonrpc": "2.0",
                    "id": None,
                    "error": {"code": -32700, "message": f"Parse error: {exc}"},
                }
            )
            continue

        messages = message if isinstance(message, list) else [message]
        responses = []
        for item in messages:
            if isinstance(item, dict):
                response = await handle_request(item)
                if response is not None:
                    responses.append(response)
        if isinstance(message, list):
            if responses:
                await write_message(responses)  # JSON-RPC batch response
        elif responses:
            await write_message(responses[0])

    await alchm_mcp.close_client()


def run() -> None:
    """Console-script entry point for the packaged MCP server.

    Referenced by [project.scripts] in pyproject.toml so the published
    distribution exposes a `planetary-agents-mcp` command (and `uvx
    alchm-planetary-agents-mcp`). Kept as a thin sync wrapper around the async
    main loop so the same entry works for the binary sidecar and PyPI install.
    """
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    run()
