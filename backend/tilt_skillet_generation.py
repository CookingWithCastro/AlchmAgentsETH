from __future__ import annotations

import hashlib
import json
import os
import re
import threading
import time
from typing import Any, Dict, Optional, Tuple

from fastapi import HTTPException
from pydantic import ValidationError

import prompts
import providers
import schemas


TILT_SKILLET_AGENT_ID = "alchemical-chef"
TILT_SKILLET_CACHE_TTL_SECONDS = float(os.getenv("TILT_SKILLET_CACHE_TTL_SECONDS", "60"))
TILT_SKILLET_MAX_TOKENS = int(os.getenv("TILT_SKILLET_MAX_TOKENS", "4096"))

_CACHE: Dict[str, Tuple[float, schemas.TiltSkilletPlanResponse]] = {}
_CACHE_LOCK = threading.Lock()


def clear_plan_cache() -> None:
    with _CACHE_LOCK:
        _CACHE.clear()


def _stable_cache_key(request: schemas.TiltSkilletRequest) -> str:
    payload = request.model_dump(mode="json", exclude_none=True, exclude={"userId", "tier", "modelTier"})
    raw = json.dumps(payload, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def _get_cached_plan(cache_key: str) -> Optional[schemas.TiltSkilletPlanResponse]:
    now = time.time()
    with _CACHE_LOCK:
        cached = _CACHE.get(cache_key)
        if not cached:
            return None
        expires_at, plan = cached
        if expires_at <= now:
            _CACHE.pop(cache_key, None)
            return None
        return plan.model_copy(deep=True)


def _set_cached_plan(cache_key: str, plan: schemas.TiltSkilletPlanResponse) -> None:
    if TILT_SKILLET_CACHE_TTL_SECONDS <= 0:
        return
    with _CACHE_LOCK:
        _CACHE[cache_key] = (time.time() + TILT_SKILLET_CACHE_TTL_SECONDS, plan.model_copy(deep=True))


def _compact_plan_schema() -> str:
    return json.dumps(schemas.TiltSkilletPlanResponse.model_json_schema(), separators=(",", ":"), ensure_ascii=True)


def _json_object_schema() -> Dict[str, Any]:
    return schemas.TiltSkilletPlanResponse.model_json_schema()


def _format_context(request: schemas.TiltSkilletRequest) -> str:
    context = {
        "batchServings": request.batchServings,
        "cuisine": request.cuisine,
        "dietPreference": request.dietPreference or "omnivore",
        "dietary": request.dietary,
        "disallowedIngredients": request.disallowedIngredients,
        "stages": [stage.model_dump(mode="json", exclude_none=True) for stage in request.stages],
        "circuitContext": request.circuitContext,
    }
    return json.dumps(context, sort_keys=True, separators=(",", ":"), ensure_ascii=True)


def _build_persona_block(request: schemas.TiltSkilletRequest) -> str:
    return prompts.build_tilt_skillet_prompt(
        {
            "cuisine": request.cuisine,
            "dietPreference": request.dietPreference,
            "batchServings": request.batchServings,
        }
    )


def _build_plan_prompt(request: schemas.TiltSkilletRequest, validation_feedback: Optional[str] = None) -> str:
    retry_block = ""
    if validation_feedback:
        retry_block = (
            "\nPrevious output failed validation. Repair it and return a complete replacement JSON object. "
            f"Validation feedback: {validation_feedback}\n"
        )

    return f"""Create one production-ready large-batch TILT SKILLET plan for Alchm Kitchen.

User request: {request.prompt}
Context JSON: {_format_context(request)}
{retry_block}
Rules:
- Return exactly one JSON object matching the schema below. No markdown, no prose wrapper.
- Use concise, single-line string values. Escape any internal newline as \\n.
- Include every required field even when data is estimated.
- These are LARGE batches: express ingredient quantities by VOLUME (cups, quarts, liters) and scale to batchServings.
- One stage per circuit element; set each stage's circuit_role from the provided circuitContext per-stage role; order source -> ... -> load.
- In reaction_note, explain the stage through its circuit reading (voltage/current/resistance/power). Honor the provided numbers; do not invent different physics.
- circuit_summary must reflect the provided series readings (total_voltage, total_current, total_resistance, total_power, efficiency, kalchm, monica).
- Respect the diet preference exactly and avoid disallowed ingredients.
- Make elementalBalance values add up to approximately 100.
- Keep the brand voice modern, grounded, and appetizing. Do not borrow a historical-figure persona.

JSON schema:
{_compact_plan_schema()}"""


def _strip_model_json(text: str) -> str:
    stripped = text.strip()
    stripped = re.sub(r"^```(?:json)?\s*", "", stripped, flags=re.IGNORECASE)
    stripped = re.sub(r"\s*```$", "", stripped)
    if stripped.startswith("{"):
        return stripped
    start = stripped.find("{")
    end = stripped.rfind("}")
    if start != -1 and end != -1 and end > start:
        return stripped[start : end + 1]
    return stripped


def _summarize_validation_error(exc: Exception, raw: str) -> str:
    if isinstance(exc, ValidationError):
        issues = []
        for issue in exc.errors()[:8]:
            loc = ".".join(str(part) for part in issue.get("loc", [])) or "root"
            issues.append(f"{loc}: {issue.get('msg', 'invalid')}")
        return "; ".join(issues)
    return f"{exc.__class__.__name__}: {str(exc)[:200]}; preview={raw[:240]}"


def _parse_plan(text: str) -> schemas.TiltSkilletPlanResponse:
    raw = _strip_model_json(text)
    parsed = json.loads(raw)
    return schemas.TiltSkilletPlanResponse.model_validate(parsed)


async def generate_tilt_skillet_plan(
    request: schemas.TiltSkilletRequest,
    tier: str,
    anthropic_model: Optional[str],
) -> schemas.TiltSkilletPlanResponse:
    cache_key = _stable_cache_key(request)
    cached = _get_cached_plan(cache_key)
    if cached:
        return cached

    chain = providers.build_chain(tier, anthropic_model)
    persona_block = _build_persona_block(request)
    schema = _json_object_schema()
    last_error = "model did not return a valid plan"

    for attempt in range(2):
        user_message = _build_plan_prompt(request, validation_feedback=last_error if attempt > 0 else None)
        result = await providers.run_chain(
            chain=chain,
            persona_block=persona_block,
            rag_block="",
            user_message=user_message,
            agent_id=TILT_SKILLET_AGENT_ID,
            tier=tier,
            persona_cache_key="tilt-skillet-v1",
            max_tokens=TILT_SKILLET_MAX_TOKENS,
            response_format={"type": "json_object"},
            temperature=0.35,
            structured_schema=schema,
        )

        if result is None:
            last_error = "all configured providers were unavailable"
            break

        try:
            plan = _parse_plan(result.text)
            _set_cached_plan(cache_key, plan)
            return plan
        except Exception as exc:
            last_error = _summarize_validation_error(exc, result.text or "")
            print(
                f"tilt_skillet_validation_failed attempt={attempt + 1} tier={tier} error={last_error[:400]}",
                flush=True,
            )

    raise HTTPException(
        status_code=502,
        detail={"error": "Tilt Skillet model returned malformed output after retry", "message": last_error},
    )
