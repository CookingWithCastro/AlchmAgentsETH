"""
Feed emitter — fire-and-forget webhook from PA backend to alchm.kitchen's
/api/feed endpoint.

When a planetary_agents agent performs a user-visible action (chat response,
recipe channeling, insight generation, etc.) we POST a small event payload
to alchm.kitchen so the Live Network Feed UI shows it in real time.

Architecture:
    PA agent action → emit_feed_event(...) → asyncio.create_task → httpx POST
                                                                 → alchm.kitchen
                                                                   /api/feed
                                                                   (Next.js)
                                                                 → feed_events
                                                                   table

The HTTP call runs in a background task so agent responses are NEVER blocked
by feed-emit failures. All failures are warned, never raised.

Contract (must match src/app/api/feed/route.ts on the WTEN side):
    POST {ALCHM_KITCHEN_URL}/api/feed
    Authorization: Bearer {INTERNAL_API_SECRET}
    Body: { agentEmail, eventType, metadataPayload }

WTEN narration contract for metadataPayload:
    chat events: targetName/withAgent/partnerName, topic/subject/summary,
        messageExcerpt/message
    artifacts: recipeName, recipeId/recipe_id, dishName, insightTitle,
        insightContent, rating, item, description

Required env:
    ALCHM_KITCHEN_SYNC_URL or ALCHM_KITCHEN_URL
        alchm.kitchen Next.js base URL (NOT the Python backend URL — the feed
        endpoint lives in the Next.js app). Defaults to https://alchm.kitchen.
    INTERNAL_API_SECRET
        Must match alchm.kitchen's INTERNAL_API_SECRET.
"""

from __future__ import annotations

import asyncio
import logging
import os
from datetime import datetime, timezone
from typing import Any, Dict, Optional

import httpx

logger = logging.getLogger(__name__)

# Prefer ALCHM_KITCHEN_SYNC_URL (the Next.js root). ALCHM_KITCHEN_URL on the PA
# Railway service is currently pointed at the Python backend (no /api/feed
# there), so falling through to that would silently 404. Default to the public
# alchm.kitchen root.
ALCHM_KITCHEN_URL = (
    os.getenv("ALCHM_KITCHEN_SYNC_URL")
    or os.getenv("ALCHM_KITCHEN_FEED_URL")
    or os.getenv("ALCHM_KITCHEN_BASE_URL")
    or "https://alchm.kitchen"
).rstrip("/")
# Last-resort: if someone explicitly set ALCHM_KITCHEN_URL to the Next.js root
# (not the Python backend), respect that. Skip it if it looks like the Railway
# Python backend hostname.
_legacy = os.getenv("ALCHM_KITCHEN_URL", "").rstrip("/")
if _legacy and "railway.app" not in _legacy and ALCHM_KITCHEN_URL == "https://alchm.kitchen":
    ALCHM_KITCHEN_URL = _legacy

INTERNAL_API_SECRET = os.getenv("INTERNAL_API_SECRET", "")
AGENTIC_EMAIL_DOMAIN = "@agentic.alchm.kitchen"
FEED_EMIT_TIMEOUT_SECONDS = 4.0


def agent_id_to_email(agent_id: str) -> str:
    """Map an agent_id (e.g. "monica-001") to its @agentic.alchm.kitchen email.

    Idempotent for already-formed emails.
    """
    if "@" in agent_id:
        return agent_id.lower().strip()
    return f"{agent_id}{AGENTIC_EMAIL_DOMAIN}".lower().strip()


def _utc_timestamp() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def _string_from_metadata(metadata_payload: Dict[str, Any], *keys: str) -> Optional[str]:
    for key in keys:
        value = metadata_payload.get(key)
        if isinstance(value, str) and value.strip():
            return value.strip()
    return None


def _truncate(value: str, limit: int = 160) -> str:
    compact = " ".join(value.split())
    if len(compact) <= limit:
        return compact
    return compact[: max(0, limit - 3)].rstrip() + "..."


def _with_narration_contract(event_type: str, metadata: Dict[str, Any]) -> Dict[str, Any]:
    """Fill WTEN narration fields from older PA aliases.

    Keep this additive: callers may still pass richer values, and those should
    always win. Field names are consumed by WTEN's eventNarration helper.
    """
    enriched = dict(metadata)
    normalized_event = event_type.replace(".", "_")

    target_name = _string_from_metadata(enriched, "targetName", "withAgent", "partnerName")
    if target_name:
        enriched.setdefault("targetName", target_name)
        enriched.setdefault("withAgent", target_name)

    topic = _string_from_metadata(enriched, "topic", "subject", "summary")
    if not topic:
        topic = _string_from_metadata(enriched, "messagePreview", "userMessage", "prompt")
    if topic:
        enriched.setdefault("topic", _truncate(topic, 90))

    if normalized_event in {"agent_chat", "chat"} or event_type == "agent.chat":
        excerpt = _string_from_metadata(
            enriched,
            "messageExcerpt",
            "message",
            "responsePreview",
            "agentResponse",
            "messagePreview",
        )
        if excerpt:
            enriched.setdefault("messageExcerpt", _truncate(excerpt, 160))
            enriched.setdefault("message", _truncate(excerpt, 500))

    recipe_id = _string_from_metadata(enriched, "recipeId", "recipe_id")
    if recipe_id:
        enriched.setdefault("recipeId", recipe_id)
        enriched.setdefault("recipe_id", recipe_id)

    insight_content = _string_from_metadata(enriched, "insightContent")
    if insight_content:
        enriched.setdefault("summary", _truncate(insight_content, 160))

    description = _string_from_metadata(enriched, "description")
    if description:
        enriched.setdefault("summary", _truncate(description, 160))

    return enriched


def build_feed_payload(
    agent_email: str,
    event_type: str,
    metadata_payload: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """Build the WTEN-compatible feed payload.

    WTEN currently requires `agentEmail`, `eventType`, and `metadataPayload`.
    The top-level `actionType`, `activityDetails`, and `timestamp` aliases are
    included for the admin control surface and for older PA dispatchers that
    still reason in action-language rather than feed-event-language.
    """
    metadata = _with_narration_contract(event_type, dict(metadata_payload or {}))
    action_type = _string_from_metadata(metadata, "actionType", "action_type") or event_type
    timestamp = _string_from_metadata(metadata, "timestamp") or _utc_timestamp()
    activity_details = metadata.get("activityDetails") or metadata.get("activity_details")
    if not isinstance(activity_details, dict):
        activity_details = {
            key: value
            for key, value in metadata.items()
            if key not in {"actionType", "action_type", "activityDetails", "activity_details", "timestamp"}
        }

    enriched_metadata = {
        **metadata,
        "actionType": action_type,
        "activityDetails": activity_details,
        "timestamp": timestamp,
    }

    payload: Dict[str, Any] = {
        "agentEmail": agent_email,
        "eventType": event_type,
        "actionType": action_type,
        "activityDetails": activity_details,
        "timestamp": timestamp,
        "metadataPayload": enriched_metadata,
    }

    display_name = _string_from_metadata(
        metadata,
        "agentDisplayName",
        "agentName",
        "displayName",
    )
    if display_name:
        payload["agentDisplayName"] = display_name

    return payload


async def _post_feed_event(
    agent_email: str,
    event_type: str,
    metadata_payload: Dict[str, Any],
) -> None:
    """Single POST attempt. Catches everything; logs on failure."""
    if not INTERNAL_API_SECRET:
        logger.warning(
            "feed_emit skipped: INTERNAL_API_SECRET is not set. "
            "Configure it on the PA service so /api/feed POSTs can authenticate."
        )
        return

    url = f"{ALCHM_KITCHEN_URL}/api/feed"
    payload = build_feed_payload(agent_email, event_type, metadata_payload)
    headers = {
        "Authorization": f"Bearer {INTERNAL_API_SECRET}",
        "Content-Type": "application/json",
    }

    try:
        async with httpx.AsyncClient(timeout=FEED_EMIT_TIMEOUT_SECONDS) as client:
            resp = await client.post(url, json=payload, headers=headers)
            if resp.status_code >= 400:
                logger.warning(
                    "feed_emit non-2xx: %s %s for %s/%s body=%s",
                    resp.status_code,
                    resp.reason_phrase,
                    agent_email,
                    event_type,
                    resp.text[:200],
                )
            else:
                logger.info(
                    "feed_emit ok: %s/%s -> %s",
                    agent_email,
                    event_type,
                    resp.status_code,
                )
    except httpx.TimeoutException:
        logger.warning("feed_emit timeout for %s/%s", agent_email, event_type)
    except Exception as exc:  # noqa: BLE001 - never block agent on emit failure
        logger.warning("feed_emit failed for %s/%s: %r", agent_email, event_type, exc)


def emit_feed_event(
    agent_id_or_email: str,
    event_type: str,
    metadata_payload: Optional[Dict[str, Any]] = None,
) -> None:
    """Schedule a background webhook to alchm.kitchen's /api/feed.

    Non-blocking. Safe to call from any async context — uses
    asyncio.create_task on the running loop.

    Args:
        agent_id_or_email: Agent's id (e.g. "monica-001") OR full email.
        event_type: Short event tag — e.g. "agent_chat", "recipe_generated",
            "insight_channeled". Used by the feed UI as a category.
        metadata_payload: Arbitrary JSON-serializable dict with event details.
            Keep it small (under ~2KB) — gets stored as JSONB.
    """
    if not agent_id_or_email or not event_type:
        logger.warning(
            "feed_emit skipped: agent_id_or_email and event_type are required"
        )
        return

    agent_email = agent_id_to_email(agent_id_or_email)

    if "alchemical-chef" in agent_email:
        if os.getenv("EMIT_ALCHEMICAL_CHEF_FEED", "false").lower() not in ("true", "1", "yes"):
            logger.info("feed_emit skipped for alchemical-chef (EMIT_ALCHEMICAL_CHEF_FEED is false)")
            return

    if event_type in ("recipe_generation", "tilt_skillet_plan"):
        if os.getenv("EMIT_RECIPE_FEED_EVENTS", "false").lower() not in ("true", "1", "yes"):
            logger.info("feed_emit skipped for %s (EMIT_RECIPE_FEED_EVENTS is false)", event_type)
            return

    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        # No loop running (called from sync context). Fire a one-shot task.
        # asyncio.run would block, so spin up a quick background thread.
        import threading

        threading.Thread(
            target=lambda: asyncio.run(
                _post_feed_event(agent_email, event_type, metadata_payload or {})
            ),
            daemon=True,
            name=f"feed_emit-{event_type}",
        ).start()
        return

    loop.create_task(
        _post_feed_event(agent_email, event_type, metadata_payload or {})
    )
