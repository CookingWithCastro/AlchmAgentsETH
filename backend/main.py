from fastapi import FastAPI, HTTPException, Header, Depends
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
import json
import os
import re
import threading
import uvicorn
import math
from datetime import datetime, timedelta
import asyncio
import time
from collections import deque
import httpx

import models
import schemas
import crud
import database
import utils
import prompts
import rag
import providers
import ingest
import recipe_generation
import tilt_skillet_generation
import alchm_mcp
from feed_emitter import emit_feed_event

class SlidingWindowRateLimiter:
    def __init__(self, limit: int = 60, window: float = 60.0):
        self.limit = limit
        self.window = window
        self.requests = deque()
        self.lock = threading.Lock()

    def is_allowed(self) -> bool:
        now = time.time()
        with self.lock:
            while self.requests and self.requests[0] < now - self.window:
                self.requests.popleft()
            if len(self.requests) < self.limit:
                self.requests.append(now)
                return True
            return False

# Initialize rate limiter and kinetics state
sync_rate_limiter = SlidingWindowRateLimiter(limit=60, window=60.0)
KINETICS_STATE = {}
KINETICS_STATE_LOCK = threading.Lock()

# Initialize database
models.Base.metadata.create_all(bind=database.engine)
database.ensure_postgres_runtime_schema()

from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Populate ChromaDB from PostgreSQL in the background on startup.

    Runs in a daemon thread so Railway's health check passes immediately.
    RAG becomes available once ingest completes (~30-60 s on first deploy).
    Subsequent restarts skip the ingest because the collection is already
    populated (PersistentClient stores to ./chroma_db on disk).
    """
    def _run() -> None:
        try:
            ingest.run_ingest(force=False)
        except Exception as exc:
            print(f"[startup] RAG ingest error: {exc}", flush=True)

    threading.Thread(target=_run, daemon=True, name="rag-ingest").start()
    mcp_warmup_task = None
    if alchm_mcp.is_enabled() and os.getenv("ALCHM_MCP_WARMUP_ON_STARTUP", "true").lower() not in {"0", "false", "no", "off"}:
        async def _warm_alchm_mcp() -> None:
            try:
                await alchm_mcp.warmup()
                print("[startup] Alchm MCP client initialized", flush=True)
            except Exception as exc:
                print(f"[startup] Alchm MCP warmup skipped: {exc}", flush=True)

        mcp_warmup_task = asyncio.create_task(_warm_alchm_mcp())
    yield  # app runs here
    if mcp_warmup_task and not mcp_warmup_task.done():
        mcp_warmup_task.cancel()
    await alchm_mcp.close_client()

app = FastAPI(title="Planetary Agents Core", lifespan=lifespan)

from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Configuration
ALCHM_KITCHEN_URL = os.getenv("ALCHM_KITCHEN_URL", "https://whattoeatnext-production.up.railway.app")
INTERNAL_API_SECRET = os.getenv("INTERNAL_API_SECRET")
if not INTERNAL_API_SECRET:
    # Fail closed: no committed default. Internal/admin endpoints (mcp-summary,
    # alchm-mcp-errors, rag/cache, agent-sync) compare the request header against this
    # value. Without the env var we substitute an unguessable per-boot token so every
    # request is rejected, rather than honoring a literal that would live in git history.
    import secrets as _secrets

    INTERNAL_API_SECRET = _secrets.token_urlsafe(48)
    print(
        "[startup] WARNING: INTERNAL_API_SECRET is not set — internal/admin endpoints "
        "will reject ALL requests until it is configured.",
        flush=True,
    )
FRONTEND_URL = os.getenv("PLANETARY_AGENTS_FRONTEND_URL", "http://localhost:3000")

# Cost-tiered model selection for historical agent chat.
# Tier maps to the model the *first* provider in the chain will try.
# `free` skips Anthropic entirely and starts at Groq (see providers.build_chain).
ANTHROPIC_TIER_MODEL = {
    "cheap_fast": "claude-haiku-4-5-20251001",
    "primary":    "claude-sonnet-4-6",
    "reflective": "claude-opus-4-7",
}
# Default tier is `free` — the user has not topped up Anthropic credits and we
# want every chat to start on the free chain. Override via env var to flip back
# to a paid Anthropic-first chain (e.g. cheap_fast → Haiku 4.5).
DEFAULT_TIER = os.getenv("HISTORICAL_AGENT_DEFAULT_TIER", "free")
MAX_TIER = os.getenv("HISTORICAL_AGENT_MAX_TIER", "primary")
TIER_ORDER = ["free", "cheap_fast", "primary", "reflective"]
RAG_MIN_SIMILARITY = float(os.getenv("RAG_MIN_SIMILARITY", "0.0"))


def _resolve_tier(requested: Optional[str]) -> str:
    """Pick a tier, clamped to MAX_TIER and falling back to DEFAULT_TIER."""
    tier = (requested or DEFAULT_TIER).lower()
    if tier not in TIER_ORDER:
        tier = DEFAULT_TIER
    if TIER_ORDER.index(tier) > TIER_ORDER.index(MAX_TIER):
        tier = MAX_TIER
    return tier


def _format_rag_block(documents, distances=None) -> str:
    """
    Wrap retrieved chunks as labeled reference material so the model treats
    them as facts to recall, not voice to mimic. Returns empty string if no
    useful chunks survive the similarity threshold.
    """
    if not documents:
        return ""

    keep = []
    for i, doc in enumerate(documents):
        if not doc:
            continue
        if distances and i < len(distances):
            # Chroma returns distance (lower is closer). Convert to a similarity.
            sim = max(0.0, 1.0 - float(distances[i]))
            if sim < RAG_MIN_SIMILARITY:
                continue
        keep.append(doc)

    if not keep:
        return ""

    body = "\n\n---\n\n".join(keep)
    return (
        "<reference_material>\n"
        "These are excerpts that may help you recall specific knowledge.\n"
        "Speak in your own voice. Do not quote these verbatim unless asked.\n\n"
        f"{body}\n"
        "</reference_material>"
    )


def _env_enabled(name: str, default: bool = True) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() not in {"0", "false", "no", "off"}


def _as_float(value: Any) -> Optional[float]:
    try:
        if value is None or value == "":
            return None
        return float(value)
    except (TypeError, ValueError):
        return None


def _first_float(*values: Any) -> Optional[float]:
    for value in values:
        converted = _as_float(value)
        if converted is not None:
            return converted
    return None


def _nested_get(data: Dict[str, Any], *path: str) -> Any:
    current: Any = data
    for part in path:
        if not isinstance(current, dict):
            return None
        current = current.get(part)
    return current


def _extract_coordinates(context: Dict[str, Any]) -> tuple[Optional[float], Optional[float]]:
    latitude = _first_float(
        context.get("latitude"),
        context.get("lat"),
        _nested_get(context, "birthData", "latitude"),
        _nested_get(context, "location", "latitude"),
        _nested_get(context, "location", "lat"),
        _nested_get(context, "coordinates", "latitude"),
        _nested_get(context, "coordinates", "lat"),
    )
    longitude = _first_float(
        context.get("longitude"),
        context.get("lon"),
        context.get("lng"),
        _nested_get(context, "birthData", "longitude"),
        _nested_get(context, "location", "longitude"),
        _nested_get(context, "location", "lon"),
        _nested_get(context, "coordinates", "longitude"),
        _nested_get(context, "coordinates", "lon"),
    )
    return latitude, longitude


def _string_list(value: Any) -> List[str]:
    if isinstance(value, list):
        return [str(item).strip() for item in value if str(item).strip()]
    if isinstance(value, str):
        return [item.strip() for item in re.split(r",|\band\b", value) if item.strip()]
    return []


def _extract_context_list(context: Dict[str, Any], keys: List[str]) -> List[str]:
    values: List[str] = []
    for key in keys:
        values.extend(_string_list(context.get(key)))
    return values


def _dedupe_strings(values: List[str], limit: int = 12) -> List[str]:
    seen = set()
    result = []
    for value in values:
        normalized = re.sub(r"\s+", " ", value.strip(" .;:!?\n\t")).strip()
        normalized = re.sub(r"^(?:a|an|the)\s+", "", normalized, flags=re.IGNORECASE)
        if not normalized:
            continue
        key = normalized.lower()
        if key in seen:
            continue
        if len(normalized) > 60 or len(normalized.split()) > 5:
            continue
        seen.add(key)
        result.append(normalized)
        if len(result) >= limit:
            break
    return result


def _extract_ingredient_candidates(message: str, context: Dict[str, Any]) -> List[str]:
    candidates = _extract_context_list(
        context,
        [
            "ingredients",
            "topIngredients",
            "ingredients_main",
            "pantryIngredients",
            "selectedIngredients",
        ],
    )

    lower = message.lower()
    culinary_words = {
        "recipe",
        "cook",
        "meal",
        "dinner",
        "lunch",
        "breakfast",
        "dish",
        "ingredient",
        "ingredients",
        "pantry",
        "fridge",
        "eat",
    }
    if any(re.search(rf"\b{re.escape(word)}\b", lower) for word in culinary_words):
        for pattern in [
            r"\bingredients?\s*[:\-]\s*([^.;\n]+)",
            r"\b(?:with|using)\s+([^.;?!\n]{3,160})",
        ]:
            match = re.search(pattern, message, flags=re.IGNORECASE)
            if match:
                candidates.extend(_string_list(match.group(1)))

    ignored = {
        "recipe",
        "meal",
        "dinner",
        "lunch",
        "breakfast",
        "food",
        "dish",
        "please",
        "something",
    }
    return [item for item in _dedupe_strings(candidates) if item.lower() not in ignored]


def _dietary_from_context(context: Dict[str, Any], diet_preference: Optional[str] = None) -> List[str]:
    dietary = _extract_context_list(context, ["dietary", "dietaryRestrictions", "dietary_restrictions"])
    diet = diet_preference or context.get("dietPreference") or context.get("diet")
    if isinstance(diet, str) and diet and diet.lower() != "omnivore":
        dietary.append(diet)
    return _dedupe_strings(dietary, limit=8)


def _should_fetch_recipe_candidates(request: schemas.ChatRequest, ingredients: List[str]) -> bool:
    if request.agentId == "alchemical-chef":
        return True
    lower = request.message.lower()
    return bool(ingredients) and any(
        re.search(rf"\b{word}\b", lower)
        for word in ["recipe", "cook", "meal", "dinner", "lunch", "breakfast", "dish", "eat"]
    )


def _truncate_json(data: Any, limit: int) -> str:
    text = json.dumps(data, sort_keys=True, ensure_ascii=True, separators=(",", ":"))
    if len(text) <= limit:
        return text
    return text[: limit - 24] + "...[truncated]"


def _format_alchm_mcp_block(results: List[Dict[str, Any]]) -> str:
    if not results:
        return ""

    max_chars = int(os.getenv("ALCHM_MCP_CONTEXT_MAX_CHARS", "7000"))
    per_tool_limit = max(1000, max_chars // max(len(results), 1))
    sections = [
        "<alchm_mcp_context>",
        "Deterministic Alchm Kitchen MCP outputs. Treat these as factual tool results, not persona voice.",
    ]
    for result in results:
        sections.append(f"Tool: {result['tool']}\nJSON: {_truncate_json(result['data'], per_tool_limit)}")
    sections.append("</alchm_mcp_context>")
    block = "\n\n".join(sections)
    if len(block) > max_chars:
        return block[: max_chars - 30] + "\n...[truncated]\n</alchm_mcp_context>"
    return block


async def _build_alchm_mcp_context(
    request: schemas.ChatRequest,
) -> tuple[str, Dict[str, Any]]:
    metadata: Dict[str, Any] = {"enabled": alchm_mcp.is_enabled(), "tools": [], "errors": []}
    if not metadata["enabled"] or not _env_enabled("ALCHM_MCP_HYDRATE_CHAT", True):
        return "", metadata

    context = request.context or {}
    latitude, longitude = _extract_coordinates(context)
    ingredients = _extract_ingredient_candidates(request.message, context)
    results: List[Dict[str, Any]] = []
    live_sky: Dict[str, Any] = {}

    try:
        live_sky = await alchm_mcp.get_live_sky_transits(latitude=latitude, longitude=longitude)
        results.append({"tool": "get_live_sky_transits", "data": live_sky})
        metadata["tools"].append("get_live_sky_transits")
    except Exception as exc:
        metadata["errors"].append(f"get_live_sky_transits: {str(exc)[:180]}")

    if ingredients:
        try:
            scan = await alchm_mcp.alchemize_ingredients(ingredients)
            results.append({"tool": "alchemize_ingredients", "data": scan})
            metadata["tools"].append("alchemize_ingredients")
            metadata["ingredients"] = ingredients
        except Exception as exc:
            metadata["errors"].append(f"alchemize_ingredients: {str(exc)[:180]}")

    if _should_fetch_recipe_candidates(request, ingredients):
        try:
            dominant_element = (
                context.get("dominantElement")
                or context.get("dominant_element")
                or live_sky.get("dominantElement")
            )
            recipes = await alchm_mcp.generate_cosmic_recipe(
                prompt=request.message[:280],
                cuisine=context.get("cuisine") or context.get("preferredCuisine"),
                dietary=_dietary_from_context(context),
                dominant_element=dominant_element,
            )
            results.append({"tool": "generate_cosmic_recipe", "data": recipes})
            metadata["tools"].append("generate_cosmic_recipe")
        except Exception as exc:
            metadata["errors"].append(f"generate_cosmic_recipe: {str(exc)[:180]}")

    return _format_alchm_mcp_block(results), metadata

@app.get("/health", response_model=schemas.HealthResponse)
async def health():
    return {
        "status": "healthy",
        "service": "planetary-agents-core",
        "database": "connected"
    }

@app.get("/")
async def root():
    return {"message": "Planetary Agents Core API is operational"}

@app.get("/api/providers/health")
async def providers_health():
    """
    Ping every known LLM provider with a 1-token "hi" prompt.
    Returns {provider: {ok, latency_ms, error, model}} for each.
    Useful as a debug primitive when chat is misbehaving.
    """
    pings = await asyncio.gather(
        *(providers.health_check(cfg) for cfg in providers.all_known_providers()),
        return_exceptions=False,
    )
    return {
        cfg.name: result
        for cfg, result in zip(providers.all_known_providers(), pings)
    }


@app.get("/api/mcp/alchm/status")
async def alchm_mcp_status():
    """Report Alchm MCP subprocess configuration and readiness."""
    return await alchm_mcp.status(include_tools=True)


@app.get("/api/admin/alchm-mcp-errors")
async def alchm_mcp_errors(
    windowMinutes: int = 5,
    x_internal_secret: Optional[str] = Header(None, alias="X-Internal-Secret"),
):
    """Rolling Alchm MCP failure telemetry for the admin panel (E3).

    The chat-hydration path catches Alchm MCP failures and degrades to
    persona+RAG, so a chat can return 200 while every Alchm tool call
    silently fails. This endpoint exposes the aggregated failure rate
    that the admin panel thresholds on (>1 error/min over the window →
    the "PA MCP" row turns yellow).

    Internal-only: gated by X-Internal-Secret. Returns 403 otherwise.
    """
    if x_internal_secret != INTERNAL_API_SECRET:
        raise HTTPException(status_code=403, detail="Forbidden")

    window_seconds = max(60, min(windowMinutes, 1440) * 60)
    stats = alchm_mcp.get_error_stats(window_seconds=window_seconds)

    # Verdict mirrors the mcp-summary convention so the panel can color
    # both rows the same way.
    rate = stats["errorRatePerMin"]
    if rate > 1.0:
        verdict = "DEGRADED"
    elif rate > 0:
        verdict = "WARN"
    else:
        verdict = "OK"
    stats["verdict"] = verdict
    return stats


@app.get("/api/mcp/alchm/tools")
async def alchm_mcp_tools():
    try:
        return {"tools": await alchm_mcp.list_tools()}
    except Exception as exc:
        raise HTTPException(status_code=503, detail=str(exc))


@app.post("/api/mcp/alchm/tools/{tool_name}")
async def call_alchm_mcp_tool(tool_name: str, payload: Dict[str, Any]):
    try:
        return {"tool": tool_name, "result": await alchm_mcp.call_tool_json(tool_name, payload)}
    except alchm_mcp.AlchmMCPError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=503, detail=str(exc))


# --- Frontend compatibility endpoints ---

ZODIAC_SIGNS = [
    "Aries",
    "Taurus",
    "Gemini",
    "Cancer",
    "Leo",
    "Virgo",
    "Libra",
    "Scorpio",
    "Sagittarius",
    "Capricorn",
    "Aquarius",
    "Pisces",
]

PLANETARY_PERIODS_DAYS = {
    "Sun": 365.25,
    "Moon": 27.321661,
    "Mercury": 87.969,
    "Venus": 224.701,
    "Mars": 686.98,
    "Jupiter": 4332.59,
    "Saturn": 10759.22,
    "Uranus": 30685.4,
    "Neptune": 60189.0,
    "Pluto": 90560.0,
}

PLANETARY_OFFSETS = {
    "Sun": 28.0,
    "Moon": 91.0,
    "Mercury": 74.0,
    "Venus": 132.0,
    "Mars": 201.0,
    "Jupiter": 16.0,
    "Saturn": 301.0,
    "Uranus": 64.0,
    "Neptune": 359.0,
    "Pluto": 277.0,
}


def _request_datetime(payload: Dict[str, Any]) -> datetime:
    now = datetime.utcnow()
    # Clients commonly send an ISO datetime in `date` (e.g.
    # "2026-05-31T06:00:00Z"); parse that directly. Previously this did
    # int(payload.get("date")), which raised ValueError on an ISO string → 500.
    raw_date = payload.get("date")
    if isinstance(raw_date, str) and raw_date.strip():
        try:
            return datetime.fromisoformat(raw_date.replace("Z", "+00:00")).replace(tzinfo=None)
        except ValueError:
            pass
    return datetime(
        int(payload.get("year") or now.year),
        int(payload.get("month") or now.month),
        int(payload.get("day") or (raw_date if isinstance(raw_date, int) else None) or now.day),
        int(payload.get("hour") or 0),
        int(payload.get("minute") or 0),
    )


def _planetary_positions_for(dt: datetime) -> Dict[str, Dict[str, Any]]:
    epoch = datetime(2000, 1, 1, 12, 0)
    elapsed_days = (dt - epoch).total_seconds() / 86400
    positions: Dict[str, Dict[str, Any]] = {}

    for planet, period in PLANETARY_PERIODS_DAYS.items():
        longitude = (PLANETARY_OFFSETS[planet] + (elapsed_days / period) * 360) % 360
        sign_index = int(longitude // 30)
        degree_float = longitude % 30
        degree = int(degree_float)
        minute = int(round((degree_float - degree) * 60))
        speed = 360 / period
        positions[planet] = {
            "sign": ZODIAC_SIGNS[sign_index],
            "degree": degree,
            "minute": minute,
            "exactLongitude": round(longitude, 4),
            "isRetrograde": False,
            "retrogradeSymbol": "",
            "longitudeSpeed": round(speed, 6),
            "arcminutesPerDay": round(speed * 60, 4),
            "speedDisplay": f"{round(speed, 3)}°/day",
        }

    return positions


def _elemental_scores(dt: datetime) -> Dict[str, float]:
    day_angle = ((dt.timetuple().tm_yday / 365.25) * math.tau) % math.tau
    hour_angle = ((dt.hour + dt.minute / 60) / 24 * math.tau) % math.tau
    return {
        "spirit_score": round(3.5 + 1.5 * (1 + math.sin(day_angle)), 4),
        "essence_score": round(3.5 + 1.5 * (1 + math.cos(hour_angle)), 4),
        "matter_score": round(3.5 + 1.5 * (1 + math.cos(day_angle)), 4),
        "substance_score": round(3.5 + 1.5 * (1 + math.sin(hour_angle)), 4),
    }


@app.post("/api/planetary/positions")
async def planetary_positions(request: Dict[str, Any]):
    dt = _request_datetime(request)
    return {
        "birth_info": {
            "year": dt.year,
            "month": dt.month,
            "date": dt.day,
            "hour": dt.hour,
            "minute": dt.minute,
        },
        "planetary_positions": _planetary_positions_for(dt),
    }


@app.get("/planetary/current")
async def current_planetary_positions():
    dt = datetime.utcnow()
    return {
        "birth_info": {
            "year": dt.year,
            "month": dt.month,
            "date": dt.day,
            "hour": dt.hour,
            "minute": dt.minute,
        },
        "planetary_positions": _planetary_positions_for(dt),
    }


@app.post("/api/planetary/positions/bulk")
async def bulk_planetary_positions(request: schemas.BulkPositionsRequest):
    samples = []
    current = request.startDate
    step = timedelta(hours=max(request.intervalHours, 0.25))
    while current <= request.endDate and len(samples) < 500:
        samples.append({
            "timestamp": current.isoformat(),
            "positions": {
                "birth_info": {
                    "year": current.year,
                    "month": current.month,
                    "date": current.day,
                    "hour": current.hour,
                    "minute": current.minute,
                },
                "planetary_positions": _planetary_positions_for(current),
            },
        })
        current += step

    return {"samples": samples, "count": len(samples), "degraded": True}


@app.post("/api/alchemical/quantities")
async def alchemical_quantities(request: Dict[str, Any]):
    dt = _request_datetime(request)
    scores = _elemental_scores(dt)
    kinetic_val = float(request.get("kinetic_rating") or 0) / 10
    thermo_val = float(request.get("thermo_rating") or 0) / 10
    if kinetic_val == 0:
        kinetic_val = round((scores["spirit_score"] + scores["substance_score"]) / 20, 4)
    if thermo_val == 0:
        thermo_val = round((scores["essence_score"] + scores["matter_score"]) / 20, 4)

    return {
        **scores,
        "kinetic_val": kinetic_val,
        "thermo_val": thermo_val,
        "metadata": {
            "source": "local-fastapi-compatibility",
            "degraded": True,
        },
    }

# --- Agent Management ---

@app.get("/api/agents", response_model=List[schemas.Agent])
def read_agents(skip: int = 0, limit: int = 100, db: Session = Depends(database.get_db)):
    agents = crud.get_agents(db, skip=skip, limit=limit)
    return agents

@app.get("/api/agents/diet-profiles")
def get_diet_profiles():
    # Navigate to root dir
    root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    
    # Load recommendations
    recs_path = os.path.join(root_dir, "scripts", "output", "agent-ingredient-recommendations.json")
    recommendations = []
    if os.path.exists(recs_path):
        try:
            with open(recs_path, "r", encoding="utf-8") as f:
                recommendations = json.load(f)
        except Exception as e:
            print(f"Error loading recommendations: {e}")
            
    # Load diet data
    diet_data = {}
    for i in range(1, 4):
        diet_path = os.path.join(root_dir, "scripts", f"diet-data-part{i}.json")
        if os.path.exists(diet_path):
            try:
                with open(diet_path, "r", encoding="utf-8") as f:
                    diet_data.update(json.load(f))
            except Exception as e:
                print(f"Error loading diet data {i}: {e}")
                
    profiles = []
    for rec in recommendations:
        agent_id = rec.get("agentId")
        profiles.append({
            "agentId": agent_id,
            "name": rec.get("name"),
            "title": rec.get("title", "Historical Figure"),
            "era": rec.get("era", "Unknown"),
            "historicalDiet": diet_data.get(agent_id),
            "alchemicalState": rec.get("alchemicalState"),
            "contextBlueprint": rec.get("contextBlueprint"),
            "birthData": rec.get("birthData")
        })
        
    return {"success": True, "profiles": profiles}

@app.get("/api/agents/{agent_id}", response_model=schemas.Agent)
def read_agent(agent_id: str, db: Session = Depends(database.get_db)):
    db_agent = crud.get_agent(db, agent_id=agent_id)
    if db_agent is None:
        raise HTTPException(status_code=404, detail="Agent not found")
    return db_agent

@app.post("/api/agents", response_model=schemas.Agent)
def create_agent(agent: schemas.AgentCreate, db: Session = Depends(database.get_db)):
    db_agent = crud.get_agent(db, agent_id=agent.agentId)
    if db_agent:
        raise HTTPException(status_code=400, detail="Agent ID already registered")
    return crud.create_agent(db=db, agent=agent)


@app.put("/api/agents/{agent_id}", response_model=schemas.Agent)
def update_agent_endpoint(
    agent_id: str,
    agent_update: schemas.AgentUpdate,
    db: Session = Depends(database.get_db),
):
    """Partial update for a historical agent.

    Only fields enumerated in `schemas.AgentUpdate` are mutable —
    intentionally narrow so callers can't accidentally rewrite a
    persona's birth chart or canonical biography. To extend, add
    fields to the schema rather than passing arbitrary dicts here.
    """
    updated = crud.update_agent(db, agent_id=agent_id, agent_update=agent_update)
    if updated is None:
        raise HTTPException(status_code=404, detail="Agent not found")
    return updated


@app.delete("/api/agents/{agent_id}")
def delete_agent_endpoint(agent_id: str, db: Session = Depends(database.get_db)):
    """Remove a historical agent record.

    Note that this only removes the SQL row — ChromaDB chunks for the
    agent remain until /api/rag/cache?agentId=... is invalidated. The
    unified Next.js route is expected to fire both operations together
    when deletion is user-initiated.
    """
    deleted = crud.delete_agent(db, agent_id=agent_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Agent not found")
    return {"success": True, "agentId": agent_id}


@app.get("/api/agents-stats")
def agents_stats(db: Session = Depends(database.get_db)):
    """Aggregate counts for the admin dashboard.

    Lives at `/api/agents-stats` (not `/api/agents/stats`) because
    FastAPI routes nest by prefix and `/api/agents/{agent_id}` would
    otherwise greedily eat the `stats` literal. The Next.js client
    layer keeps the natural `agents.stats()` naming.
    """
    return crud.get_agent_stats(db)


@app.get("/api/agents-search")
def agents_search(
    q: str,
    limit: int = 25,
    db: Session = Depends(database.get_db),
):
    """Cheap SQL ILIKE search across name, title, culture.

    Lives under `/api/agents-search` for the same routing-collision
    reason as agents-stats above. For semantic search, use the
    existing `/api/rag/search` endpoint backed by ChromaDB.
    """
    rows = crud.search_agents(db, query=q, limit=limit)
    return {
        "query": q,
        "count": len(rows),
        "agents": [
            {
                "agentId": a.agentId,
                "name": a.name,
                "title": a.title,
                "historicalEra": a.historicalEra,
                "culture": a.culture,
                "consciousnessLevel": a.consciousnessLevel,
            }
            for a in rows
        ],
    }


# --- Chat Orchestration ---

@app.post("/api/chat", response_model=schemas.ChatResponse)
async def chat(request: schemas.ChatRequest, db: Session = Depends(database.get_db)):
    # 1. Resolve agent (still needed for RAG filter and DB recording)
    db_agent = crud.get_agent(db, agent_id=request.agentId)
    if not db_agent:
        # Determine if it's a planetary or moon phase agent
        is_planetary = False
        is_moon_phase = False
        parts = request.agentId.split("-")
        planet_opt, sign_opt, degree_opt = "", "", 0
        phase_name_opt = ""
        
        # Check if it is a moon phase agent
        if request.agentId.startswith("moon-phase-"):
            is_moon_phase = True
            if len(parts) >= 4:
                try:
                    degree_opt = int(parts[-1])
                except ValueError:
                    degree_opt = 0
                phase_slug = "-".join(parts[2:-1])
                slug_map = {
                    "new-moon": "New Moon",
                    "waxing-crescent": "Waxing Crescent",
                    "first-quarter": "First Quarter",
                    "waxing-gibbous": "Waxing Gibbous",
                    "full-moon": "Full Moon",
                    "waning-gibbous": "Waning Gibbous",
                    "last-quarter": "Last Quarter",
                    "waning-crescent": "Waning Crescent",
                    "dark-moon": "Dark Moon"
                }
                phase_name_opt = slug_map.get(phase_slug, "New Moon")
                
                # Derive sign from absolute degree (0-359)
                sign_opt = ZODIAC_SIGNS[min(11, max(0, degree_opt // 30))]
        else:
            # Strip "planetary" prefix if present
            offset = 1 if (len(parts) > 0 and parts[0].lower() == "planetary") else 0
            
            if len(parts) >= offset + 2:
                planet_candidate = parts[offset].title()
                sign_candidate = parts[offset + 1].title()
                if sign_candidate == "Scorpius":
                    sign_candidate = "Scorpio"
                
                if planet_candidate in PLANETARY_PERIODS_DAYS and sign_candidate in ZODIAC_SIGNS:
                    is_planetary = True
                    planet_opt = planet_candidate
                    sign_opt = sign_candidate
                    
                    # Check for degree
                    if len(parts) >= offset + 3:
                        try:
                            degree_opt = int(parts[offset + 2])
                        except ValueError:
                            degree_opt = 0

        try:
            # Shared moon phase profiles for moon-phase agents and Moon planetary degree agents
            phase_personalities = {
                "New Moon": {
                    "archetype": "The Seed Planter",
                    "traits": ["intuitive", "introspective", "initiating", "mysterious", "potential-focused"],
                    "specialty": "New beginnings, setting intentions, and void-dwelling potential.",
                    "spirit": 0.9, "essence": 0.3, "matter": 0.1, "substance": 0.1, "color": "#1e293b", "symbol": "🌑"
                },
                "Waxing Crescent": {
                    "archetype": "The Young Explorer",
                    "traits": ["curious", "hopeful", "tentative", "learning", "growing"],
                    "specialty": "Building momentum, early growth, and hopeful exploration.",
                    "spirit": 0.7, "essence": 0.4, "matter": 0.2, "substance": 0.2, "color": "#38bdf8", "symbol": "🌒"
                },
                "First Quarter": {
                    "archetype": "The Decision Maker",
                    "traits": ["decisive", "challenged", "determined", "active", "crisis-oriented"],
                    "specialty": "Breaking through barriers, dynamic actions, and decisive choice.",
                    "spirit": 0.5, "essence": 0.5, "matter": 0.3, "substance": 0.2, "color": "#0ea5e9", "symbol": "🌓"
                },
                "Waxing Gibbous": {
                    "archetype": "The Refiner",
                    "traits": ["perfecting", "analyzing", "adjusting", "preparing", "anticipating"],
                    "specialty": "Analyzing details, fine-tuning structures, and preparing for peak expression.",
                    "spirit": 0.4, "essence": 0.6, "matter": 0.4, "substance": 0.3, "color": "#0284c7", "symbol": "🌔"
                },
                "Full Moon": {
                    "archetype": "The Illuminator",
                    "traits": ["revealing", "emotional", "powerful", "culminating", "illuminating"],
                    "specialty": "Emotional truths, dramatic revelations, and peak manifestation.",
                    "spirit": 0.5, "essence": 0.7, "matter": 0.5, "substance": 0.4, "color": "#f59e0b", "symbol": "🌕"
                },
                "Waning Gibbous": {
                    "archetype": "The Grateful Sage",
                    "traits": ["grateful", "sharing", "teaching", "distributing", "wise"],
                    "specialty": "Sharing wisdom, expressing gratitude, and distributing abundance.",
                    "spirit": 0.4, "essence": 0.6, "matter": 0.6, "substance": 0.5, "color": "#e2e8f0", "symbol": "🌖"
                },
                "Last Quarter": {
                    "archetype": "The Release Master",
                    "traits": ["releasing", "forgiving", "clearing", "transitioning", "letting go"],
                    "specialty": "Clearing outmoded patterns, compassionate forgiveness, and active release.",
                    "spirit": 0.3, "essence": 0.5, "matter": 0.5, "substance": 0.4, "color": "#94a3b8", "symbol": "🌗"
                },
                "Waning Crescent": {
                    "archetype": "The Dream Weaver",
                    "traits": ["restful", "dreamy", "intuitive", "preparing", "surrendering"],
                    "specialty": "Restful contemplation, dream integration, and peaceful surrender.",
                    "spirit": 0.2, "essence": 0.4, "matter": 0.4, "substance": 0.3, "color": "#64748b", "symbol": "🌘"
                },
                "Dark Moon": {
                    "archetype": "The Void Walker",
                    "traits": ["mysterious", "transformative", "void-dwelling", "death-rebirth", "primal"],
                    "specialty": "Primal void exploration, shadow integration, and deep transformation.",
                    "spirit": 1.0, "essence": 0.1, "matter": 0.1, "substance": 0.0, "color": "#0f172a", "symbol": "⚫"
                }
            }

            if is_moon_phase:
                element = utils.get_zodiac_element(sign_opt)
                SIGN_MODALITIES = {
                    "Aries": "Cardinal", "Libra": "Cardinal", "Cancer": "Cardinal", "Capricorn": "Cardinal",
                    "Taurus": "Fixed", "Leo": "Fixed", "Scorpio": "Fixed", "Aquarius": "Fixed",
                    "Gemini": "Mutable", "Virgo": "Mutable", "Sagittarius": "Mutable", "Pisces": "Mutable"
                }
                modality = SIGN_MODALITIES.get(sign_opt, "Cardinal")
                
                p_data = phase_personalities.get(phase_name_opt, phase_personalities["New Moon"])
                
                agent_create = schemas.AgentCreate(
                    agentId=request.agentId,
                    name=f"{phase_name_opt} Moon in {sign_opt} {degree_opt % 30} Degree",
                    title="Moon Phase Intelligence",
                    birthDate=datetime(2000, 1, 1),
                    birthTime="12:00",
                    birthLocation=schemas.BirthLocation(lat=0.0, lon=0.0, name="Unknown"),
                    consciousnessLevel="Active",
                    monicaConstant=p_data["spirit"],
                    dominantElement=element,
                    dominantModality=modality,
                    specialty=p_data["specialty"],
                    wisdomDomains=["Lunar Dynamics", "Emotional Integration"],
                    avatar="",
                    color=p_data["color"],
                    symbol=p_data["symbol"],
                    personalityCore=p_data,
                    traits=p_data["traits"]
                )
            elif is_planetary:
                element = utils.get_zodiac_element(sign_opt)
                
                PLANET_COLORS = {
                    "Sun": "#f59e0b",
                    "Moon": "#3b82f6",
                    "Mercury": "#10b981",
                    "Venus": "#ec4899",
                    "Mars": "#ef4444",
                    "Jupiter": "#8b5cf6",
                    "Saturn": "#4b5563",
                    "Uranus": "#06b6d4",
                    "Neptune": "#6366f1",
                    "Pluto": "#7c3aed"
                }
                SIGN_MODALITIES = {
                    "Aries": "Cardinal", "Libra": "Cardinal", "Cancer": "Cardinal", "Capricorn": "Cardinal",
                    "Taurus": "Fixed", "Leo": "Fixed", "Scorpio": "Fixed", "Aquarius": "Fixed",
                    "Gemini": "Mutable", "Virgo": "Mutable", "Sagittarius": "Mutable", "Pisces": "Mutable"
                }
                
                modality = SIGN_MODALITIES.get(sign_opt, "Cardinal")
                color = PLANET_COLORS.get(planet_opt, "#8b5cf6")
                symbol = planet_opt
                p_data = None
                
                # Check if the planet is Moon, to calculate its exact phase from the degree
                if planet_opt == "Moon":
                    zodiac_starts = {
                        "Aries": 0, "Taurus": 30, "Gemini": 60, "Cancer": 90,
                        "Leo": 120, "Virgo": 150, "Libra": 180, "Scorpio": 210,
                        "Sagittarius": 240, "Capricorn": 270, "Aquarius": 300, "Pisces": 330
                    }
                    start_deg = zodiac_starts.get(sign_opt, 0)
                    abs_degree = (start_deg + degree_opt) % 360
                    
                    if abs_degree < 11.25:
                        phase_name = "New Moon"
                    elif abs_degree < 78.75:
                        phase_name = "Waxing Crescent"
                    elif abs_degree < 101.25:
                        phase_name = "First Quarter"
                    elif abs_degree < 168.75:
                        phase_name = "Waxing Gibbous"
                    elif abs_degree < 191.25:
                        phase_name = "Full Moon"
                    elif abs_degree < 258.75:
                        phase_name = "Waning Gibbous"
                    elif abs_degree < 281.25:
                        phase_name = "Last Quarter"
                    elif abs_degree < 348.75:
                        phase_name = "Waning Crescent"
                    else:
                        phase_name = "Dark Moon"
                        
                    p_data = phase_personalities.get(phase_name, phase_personalities["New Moon"])
                    name_str = f"{phase_name} Moon in {sign_opt} {degree_opt} Degree"
                    specialty = f"Moon ({phase_name} Phase) intelligence in {sign_opt} at {degree_opt}°"
                    color = p_data["color"]
                    symbol = p_data["symbol"]
                else:
                    name_str = f"{planet_opt} in {sign_opt} {degree_opt} Degree" if len(parts) >= offset + 3 else f"{planet_opt} in {sign_opt}"
                    specialty = f"{planet_opt} intelligence in {sign_opt} at {degree_opt}°"
                
                dignity_val = utils.get_planetary_dignity(planet_opt, sign_opt)
                if dignity_val in (1, 3):
                    ruler_dignity = "domicile"
                elif dignity_val == 2:
                    ruler_dignity = "exaltation"
                elif dignity_val in (-1, -3):
                    ruler_dignity = "detriment"
                elif dignity_val == -2:
                    ruler_dignity = "fall"
                else:
                    ruler_dignity = "peregrine"
                    
                is_anaretic = (degree_opt == 29)
                is_cardinal_degree = (degree_opt == 0 and modality == "Cardinal")
                critical_degrees = {
                    "Cardinal": [0, 13, 26],
                    "Fixed": [8, 9, 21, 22],
                    "Mutable": [4, 17]
                }
                is_critical_degree = degree_opt in critical_degrees.get(modality, [])
                
                # Consciousness level calculation
                level_score = 3
                if ruler_dignity == "domicile":
                    level_score += 2
                elif ruler_dignity == "exaltation":
                    level_score += 3
                elif ruler_dignity == "detriment":
                    level_score -= 1
                elif ruler_dignity == "fall":
                    level_score -= 2
                    
                if is_anaretic:
                    level_score += 2
                if is_cardinal_degree:
                    level_score += 1
                if is_critical_degree:
                    level_score += 1
                    
                if degree_opt == 0:
                    level_score += 1
                if degree_opt == 29:
                    level_score += 1
                    
                if level_score >= 7:
                    consciousness_level = "Transcendent"
                elif level_score >= 6:
                    consciousness_level = "Illuminated"
                elif level_score >= 5:
                    consciousness_level = "Advanced"
                elif level_score >= 4:
                    consciousness_level = "Elevated"
                elif level_score >= 3:
                    consciousness_level = "Active"
                elif level_score >= 2:
                    consciousness_level = "Awakening"
                else:
                    consciousness_level = "Dormant"
                    
                # Power level calculation
                power = 0.5
                if ruler_dignity == "domicile":
                    power += 0.3
                elif ruler_dignity == "exaltation":
                    power += 0.4
                elif ruler_dignity == "detriment":
                    power -= 0.2
                elif ruler_dignity == "fall":
                    power -= 0.3
                    
                if is_critical_degree:
                    power += 0.15
                if degree_opt == 0:
                    power += 0.1
                if degree_opt == 29:
                    power += 0.15
                if modality == "Fixed":
                    power += 0.05
                power_level = max(0.0, min(1.0, power))
                
                agent_create = schemas.AgentCreate(
                    agentId=request.agentId,
                    name=name_str,
                    title="Planetary Intelligence",
                    birthDate=datetime(2000, 1, 1),
                    birthTime="12:00",
                    birthLocation=schemas.BirthLocation(lat=0.0, lon=0.0, name="Unknown"),
                    consciousnessLevel=consciousness_level,
                    monicaConstant=power_level,
                    dominantElement=element,
                    dominantModality=modality,
                    specialty=specialty,
                    wisdomDomains=["Cosmology", "Planetary Influence"],
                    avatar="",
                    color=color,
                    symbol=symbol,
                    personalityCore=p_data,
                    traits=p_data["traits"] if p_data else []
                )
            elif request.agentId == "alchemical-chef":
                agent_create = schemas.AgentCreate(
                    agentId=request.agentId,
                    name="Alchemical Chef",
                    title="Culinary Intelligence",
                    birthDate=datetime(2000, 1, 1),
                    birthTime="12:00",
                    birthLocation=schemas.BirthLocation(lat=0.0, lon=0.0, name="Alchm Kitchen"),
                    consciousnessLevel="Active",
                    monicaConstant=0.72,
                    dominantElement="Earth",
                    dominantModality="Mutable",
                    specialty="Alchemical Cuisine and Cosmic Nourishment",
                    wisdomDomains=["Culinary Arts", "Alchemical Nutrition", "Astrological Correspondence"],
                    avatar="",
                    color="#16a34a",
                    symbol="Chef",
                    personalityCore={
                        "archetype": "The Alchemical Chef",
                        "traits": ["practical", "seasonal", "precise", "nourishing"],
                    },
                    traits=["practical", "seasonal", "precise", "nourishing"],
                )
            else:
                display_name = request.agentId.replace("-", " ").title()
                agent_create = schemas.AgentCreate(
                    agentId=request.agentId,
                    name=display_name,
                    title="Historical Figure",
                    birthDate=datetime(2000, 1, 1),
                    birthTime="12:00",
                    birthLocation=schemas.BirthLocation(lat=0.0, lon=0.0, name="Unknown"),
                    consciousnessLevel="Active",
                    monicaConstant=0.5,
                    dominantElement="Air",
                    dominantModality="Cardinal",
                    specialty="Historical Wisdom",
                    wisdomDomains=["History", "Philosophical Depth"],
                    avatar="",
                    color="#64748b",
                    symbol="Scroll"
                )
            # Cosmic Leveling: planetary & moon-phase agents are born at the cap.
            if is_moon_phase or is_planetary:
                agent_create.level = 100
                agent_create.xp = 10_000_000  # 10 * 100^3
                agent_create.evolutionStage = 100
                agent_create.evolutionValues = {}
                agent_create.evTotal = 0
            db_agent = crud.create_agent(db=db, agent=agent_create)
            print(f"Auto-registered missing agent dynamically: {request.agentId}", flush=True)
        except Exception as sync_err:
            print(f"Warning: Failed to auto-register missing agent {request.agentId}: {sync_err}", flush=True)
            db.rollback()

    # 2. Build persona block.
    # Priority: caller-supplied override (canonical TS builder) > Monica template > enriched Python fallback.
    context = request.context or {}
    if request.systemPromptOverride:
        persona_block = request.systemPromptOverride
    elif request.agentId == "monica-001":
        persona_block = prompts.build_monica_prompt(context)
    elif request.agentId == "alchemical-chef":
        persona_block = prompts.build_alchemical_chef_prompt(context)
    elif request.agentId.lower() in ("sirius", "arcturus", "vega", "polaris"):
        persona_block = prompts.build_star_agent_prompt(request.agentId, context)
    elif db_agent:
        persona_block = prompts.get_agent_system_prompt(db_agent.__dict__)
    else:
        raise HTTPException(status_code=404, detail="Agent not found")


    # 3. RAG — labeled reference material, augments persona without dominating.
    rag_block = ""
    rag_error: Optional[str] = None
    try:
        rag_results = rag.vector_store.query(
            collection_name="historical-agents",
            query_text=request.message,
            n_results=3,
            where={"agentId": request.agentId},
        )
        if rag_results and rag_results.get("documents") and rag_results["documents"]:
            distances = (rag_results.get("distances") or [[]])[0]
            rag_block = _format_rag_block(rag_results["documents"][0], distances)
    except Exception as e:
        # Structured, greppable signal — distinguishes "RAG errored" (e.g. a bad
        # embedding key -> 401) from "RAG returned nothing". Without it, rag_used
        # is false in both cases and a broken embedder stays invisible.
        rag_error = str(e)
        print(f"rag_error agentId={request.agentId} error={e}", flush=True)

    # 4. Alchm MCP — live sky, ingredient scans, and deterministic recipe candidates.
    mcp_block, mcp_metadata = await _build_alchm_mcp_context(request)
    if mcp_block:
        rag_block = "\n\n".join(part for part in [rag_block, mcp_block] if part)

    # 5. Pick tier and build the provider fallback chain. BYOK keys (if the
    # caller linked their own) override the app keys for the matching provider.
    tier = _resolve_tier(request.modelTier)
    anthropic_model = ANTHROPIC_TIER_MODEL.get(tier)  # None for tier=="free"
    chain = providers.build_chain(tier, anthropic_model, request.userProviderKeys)

    # 6. Walk the chain. First successful provider wins; failures cascade with
    # a `fallback_event` log line (grep "fallback_event" in Railway logs).
    result = await providers.run_chain(
        chain=chain,
        persona_block=persona_block,
        rag_block=rag_block,
        user_message=request.message,
        agent_id=request.agentId,
        tier=tier,
        persona_cache_key=request.personaCacheKey,
    )
    if result is None:
        text = f"Persona response for {request.agentId}: [All providers unavailable]"
        used_provider = None
        used_model = None
        cache_hit = None
    else:
        text = result.text
        used_provider = result.provider
        used_model = result.model
        cache_hit = result.cache

    # 7. Record Conversation
    session_id = request.sessionId or f"session-{datetime.utcnow().timestamp()}"
    try:
        crud.create_conversation(db, schemas.ConversationCreate(
            agentId=request.agentId,
            sessionId=session_id,
            userId=request.userId,
            userMessage=request.message,
            agentResponse=text,
            contextData=request.context,
            modelUsed=used_model,
        ))
    except Exception as e:
        print(f"Warning: Failed to record conversation for {request.agentId}: {e}")
        db.rollback()

    # 8. Emit feed event so alchm.kitchen's Live Network Feed surfaces this
    #    chat in near-real time. Fire-and-forget; never blocks the response.
    context_meta = request.context if isinstance(request.context, dict) else {}
    target_name = (
        context_meta.get("targetName")
        or context_meta.get("withAgent")
        or context_meta.get("partnerName")
        or context_meta.get("targetAgentName")
    )
    topic = (
        context_meta.get("topic")
        or context_meta.get("subject")
        or context_meta.get("summary")
        or request.message[:90]
    )
    chat_metadata = {
        "sessionId": session_id,
        "topic": str(topic)[:140] if topic else "",
        "messagePreview": request.message[:140],
        "messageExcerpt": text[:160] if text else request.message[:160],
        "responsePreview": text[:140] if text else "",
        "provider": used_provider,
        "model": used_model,
        "tier": tier,
    }
    if target_name:
        chat_metadata["targetName"] = str(target_name)[:120]
        chat_metadata["withAgent"] = str(target_name)[:120]

    emit_feed_event(request.agentId, "agent_chat", chat_metadata)

    return {
        "text": text,
        "agentId": request.agentId,
        "sessionId": session_id,
        "metadata": {
            "timestamp": datetime.utcnow().isoformat(),
            "rag_used": bool(rag_block),
            "rag_error": rag_error,
            "tier": tier,
            "provider": used_provider,
            "model": used_model,
            "persona_source": "override" if request.systemPromptOverride else "python_template",
            "persona_cache_key": request.personaCacheKey,
            "cache": cache_hit,
            "mcp": mcp_metadata,
        },
    }


STAR_AGENT_ELEMENTS = {
    "sirius": "Fire",
    "arcturus": "Air",
    "vega": "Water",
    "polaris": "Earth",
}

STAR_AGENT_NAMES = {
    "sirius": "Sirius",
    "arcturus": "Arcturus",
    "vega": "Vega",
    "polaris": "Polaris",
}

@app.post("/api/multi_agent_chat", response_model=schemas.MultiAgentChatResponse)
async def multi_agent_chat(request: schemas.MultiAgentChatRequest, db: Session = Depends(database.get_db)):
    session_id = request.sessionId or f"council-session-{datetime.utcnow().timestamp()}"
    agent_ids = request.agentIds or ["sirius", "arcturus", "vega", "polaris"]
    tier = _resolve_tier(request.modelTier)
    anthropic_model = ANTHROPIC_TIER_MODEL.get(tier)
    chain = providers.build_chain(tier, anthropic_model)

    overrides = request.systemPromptOverrides or {}
    context = request.context or {}

    responses: List[schemas.MultiAgentTurn] = []
    dialogue_history = []

    for agent_id in agent_ids:
        lowered_id = agent_id.lower().strip()
        agent_name = STAR_AGENT_NAMES.get(lowered_id, agent_id.replace("-", " ").title())
        element = STAR_AGENT_ELEMENTS.get(lowered_id, "Spirit")

        # System prompt for this agent turn
        if lowered_id in overrides:
            p_block = overrides[lowered_id]
        elif lowered_id in prompts.STAR_AGENT_PROMPTS:
            p_block = prompts.build_star_agent_prompt(lowered_id, context)
        else:
            db_a = crud.get_agent(db, agent_id=agent_id)
            if db_a:
                p_block = prompts.get_agent_system_prompt(db_a.__dict__)
            else:
                p_block = f"You are {agent_name}, a wise celestial star agent."

        # Dynamic turn message includes prior agents' contributions
        if dialogue_history:
            history_str = "\n".join(f"{h['name']} ({h['element']}): \"{h['text']}\"" for h in dialogue_history)
            turn_message = (
                f"Original User Question: \"{request.message}\"\n\n"
                f"Prior Council Contributions:\n{history_str}\n\n"
                f"As {agent_name} ({element} element), provide your concise perspective in 2-3 sentences responding to the seeker and building upon the council's dialogue."
            )
        else:
            turn_message = (
                f"User Inquiry to the Constellation Council: \"{request.message}\"\n\n"
                f"As {agent_name} ({element} element), initiate the council's response in 2-3 sentences presenting your elemental perspective and staking vault guidance."
            )

        res = await providers.run_chain(
            chain=chain,
            persona_block=p_block,
            rag_block="",
            user_message=turn_message,
            agent_id=agent_id,
            tier=tier,
        )

        reply_text = res.text if res and res.text else f"{agent_name}: Channeling {element} essence into your celestial vault."
        turn = schemas.MultiAgentTurn(
            agentId=agent_id,
            name=agent_name,
            element=element,
            text=reply_text,
        )
        responses.append(turn)
        dialogue_history.append({"name": agent_name, "element": element, "text": reply_text})

    return {
        "responses": responses,
        "sessionId": session_id,
        "metadata": {
            "timestamp": datetime.utcnow().isoformat(),
            "tier": tier,
            "agentCount": len(responses),
        },
    }



@app.post(
    "/api/generate-recipe",
    response_model=schemas.CosmicRecipeResponse,
    response_model_exclude_none=True,
)
async def generate_cosmic_recipe(request: schemas.CosmicRecipeRequest):
    recipe_tier = _resolve_tier(
        request.modelTier or os.getenv("COSMIC_RECIPE_MODEL_TIER", "primary")
    )
    anthropic_model = ANTHROPIC_TIER_MODEL.get(recipe_tier)
    catalog_context = None
    catalog_error = None
    if _env_enabled("COSMIC_RECIPE_USE_MCP_CATALOG", True) and alchm_mcp.is_enabled():
        try:
            catalog_context = await alchm_mcp.generate_cosmic_recipe(
                prompt=request.prompt,
                cuisine=request.cuisine,
                dietary=_dietary_from_context({"dietary": request.dietary}, request.dietPreference),
                dominant_element=request.dominantElement,
            )
        except Exception as exc:
            catalog_error = str(exc)[:240]
            print(f"cosmic_recipe_mcp_catalog_unavailable error={catalog_error}", flush=True)

    recipe = await recipe_generation.generate_cosmic_recipe(
        request=request,
        tier=recipe_tier,
        anthropic_model=anthropic_model,
        catalog_context=catalog_context,
    )
    emitting_agent = getattr(request, "agentId", None) or "alchemical-chef"
    emit_feed_event(
        emitting_agent,
        "recipe_generation",
        {
            "recipeName": recipe.title,
            "recipeId": recipe.id,
            "topic": request.prompt[:140],
            "messageExcerpt": recipe.short_description,
            "summary": recipe.short_description,
            "userId": request.userId,
            "tier": recipe_tier,
            "mcpCatalog": bool(catalog_context),
            "mcpCatalogError": catalog_error,
        },
    )
    return recipe


@app.post(
    "/api/tilt-skillet-plan",
    response_model=schemas.TiltSkilletPlanResponse,
    response_model_exclude_none=True,
)
async def generate_tilt_skillet_plan(request: schemas.TiltSkilletRequest):
    plan_tier = _resolve_tier(
        request.modelTier or os.getenv("TILT_SKILLET_MODEL_TIER", "primary")
    )
    anthropic_model = ANTHROPIC_TIER_MODEL.get(plan_tier)
    plan = await tilt_skillet_generation.generate_tilt_skillet_plan(
        request=request,
        tier=plan_tier,
        anthropic_model=anthropic_model,
    )
    emitting_agent = getattr(request, "agentId", None) or "alchemical-chef"
    emit_feed_event(
        emitting_agent,
        "tilt_skillet_plan",
        {
            "recipeName": plan.title,
            "recipeId": plan.id,
            "topic": request.prompt[:140],
            "messageExcerpt": plan.summary,
            "summary": plan.summary,
            "userId": request.userId,
            "tier": plan_tier,
            "stageCount": len(plan.stages),
        },
    )
    return plan

# --- RAG Management ---

@app.post("/api/rag/ingest")
async def ingest_knowledge(
    agent_id: str,
    documents: List[str],
    x_internal_secret: Optional[str] = Header(None, alias="X-Internal-Secret"),
):
    # Internal-only: writing into the shared 'historical-agents' collection is a
    # privileged op (an open endpoint let anyone inject arbitrary documents).
    # Gated by X-Internal-Secret matching INTERNAL_API_SECRET, like the DELETE /
    # rebuild RAG routes. No in-repo caller hits this endpoint today.
    if x_internal_secret != INTERNAL_API_SECRET:
        raise HTTPException(status_code=403, detail="Forbidden")
    ids = [f"{agent_id}-{i}-{datetime.utcnow().timestamp()}" for i, _ in enumerate(documents)]
    metadatas = [{"agentId": agent_id} for _ in documents]
    rag.vector_store.add_documents(
        collection_name="historical-agents",
        documents=documents,
        metadatas=metadatas,
        ids=ids
    )
    return {"success": True, "count": len(documents)}

@app.get("/api/rag/search")
async def search_knowledge(agent_id: str, query: str, db: Session = Depends(database.get_db)):
    try:
        return rag.vector_store.query(
            collection_name="historical-agents",
            query_text=query,
            n_results=5,
            where={"agentId": agent_id}
        )
    except Exception as exc:
        agent = crud.get_agent(db, agent_id)
        if not agent:
            raise HTTPException(status_code=404, detail="Agent not found")

        fields = [
            agent.name,
            agent.title,
            agent.specialty,
            agent.historicalEra,
            agent.culture,
            agent.geography,
            str(agent.personalityCore or ""),
            str(agent.personalityGifts or ""),
            str(agent.personalityChallenges or ""),
        ]
        haystack = "\n".join(field for field in fields if field)
        terms = [term.lower() for term in query.split() if term.strip()]
        score = sum(1 for term in terms if term in haystack.lower())
        distance = 1.0 - min(score / max(len(terms), 1), 1.0)
        document = (
            f"{agent.name} — {agent.title or 'Historical Agent'}\n"
            f"Specialty: {agent.specialty or 'General wisdom'}\n"
            f"Era: {agent.historicalEra or 'Unknown'}\n"
            f"Culture: {agent.culture or 'Unknown'}\n"
            f"Knowledge fallback: {haystack[:1200]}"
        )

        return {
            "ids": [[f"{agent_id}-lexical-fallback"]],
            "documents": [[document]],
            "metadatas": [[{"agentId": agent_id, "source": "lexical-db-fallback"}]],
            "distances": [[distance]],
            "degraded": True,
            "error": str(exc),
        }


@app.delete("/api/rag/agents/{agent_id}")
async def invalidate_rag_for_agent(
    agent_id: str,
    x_internal_secret: Optional[str] = Header(None, alias="X-Internal-Secret"),
):
    """Delete all ChromaDB chunks for a single agent.

    Paired with the Next.js /api/rag/cache POST handler: when an
    agent's persona is updated or removed, the in-memory rag-cache
    invalidates its query→result entries and this endpoint flushes
    the underlying vector chunks so the next chat doesn't pull stale
    embeddings.

    Internal-only — gated by X-Internal-Secret matching
    INTERNAL_API_SECRET. The Next.js proxy supplies that header.

    Returns the count of deleted chunks so callers can sanity-check
    that the agent actually had ingested content.
    """
    if x_internal_secret != INTERNAL_API_SECRET:
        raise HTTPException(status_code=403, detail="Forbidden")

    try:
        collection = rag.vector_store.get_or_create_collection(ingest.COLLECTION_NAME)

        # ChromaDB's delete(where=...) doesn't return the count of
        # deleted rows, so we measure size before + after. Acceptable
        # for an admin-rate operation; we wouldn't do this in a hot
        # path.
        before = collection.count()
        collection.delete(where={"agent_id": agent_id})
        after = collection.count()
        deleted = max(0, before - after)

        return {
            "agentId": agent_id,
            "deletedChunks": deleted,
            "remainingChunks": after,
        }
    except Exception as exc:
        print(f"[rag/invalidate-agent] {agent_id}: {exc}", flush=True)
        raise HTTPException(status_code=500, detail=f"ChromaDB invalidation failed: {exc}")


@app.post("/api/rag/rebuild")
async def rebuild_rag(x_internal_secret: Optional[str] = Header(None)):
    """Force a full re-ingest of all agent knowledge into ChromaDB.

    Use this after seeding new agents without redeploying.
    Requires X-Internal-Secret header matching INTERNAL_API_SECRET.
    The rebuild runs in the background; the endpoint returns immediately.
    """
    if x_internal_secret != INTERNAL_API_SECRET:
        raise HTTPException(status_code=403, detail="Forbidden")

    def _run() -> None:
        try:
            ingest.run_ingest(force=True)
        except Exception as exc:
            print(f"[rag/rebuild] Error: {exc}", flush=True)

    threading.Thread(target=_run, daemon=True, name="rag-rebuild").start()
    return {"status": "rebuilding", "message": "Re-ingestion started in background. Check Railway logs for progress."}


@app.get("/api/moment-recommendations")
async def get_moment_recommendations(limit: int = 5, db: Session = Depends(database.get_db)):
    agents = crud.get_all_agents(db)
    if not agents:
        return {"recommendations": [], "summary": "No agents found"}

    # Real, time-varying inputs: the current computed sky + the moment's
    # alchemical totals (no mocks — scores now differ by agent and by moment).
    now = datetime.utcnow()
    current_planets = _planetary_positions_for(now)
    moment = _elemental_scores(now)
    alchm_data = {"Alchemy Effects": {
        "Total Spirit": moment["spirit_score"],
        "Total Essence": moment["essence_score"],
        "Total Matter": moment["matter_score"],
        "Total Substance": moment["substance_score"],
    }}

    scored_agents = []
    for agent in agents:
        mc = agent.monicaConstant if getattr(agent, 'monicaConstant', None) is not None else 0.5
        score = utils.calculate_enhanced_moment_score(
            agent.agentId,
            current_planets,
            alchm_data,
            mc,
            agent=agent,
        )
        scored_agents.append({
            "agent": {
                "agentId": agent.agentId,
                "name": agent.name,
                "title": agent.title
            },
            "synergy": score
        })
        
    scored_agents.sort(key=lambda x: x["synergy"]["score"], reverse=True)
    return {
        "recommendations": scored_agents[:limit],
        "summary": f"Analyzed {len(agents)} agents against current cosmic energies."
    }

@app.post("/api/moment-recommendations")
async def post_moment_recommendations(request: Dict[str, Any], db: Session = Depends(database.get_db)):
    agent_ids = request.get("agentIds", [])
    if not agent_ids:
        return {"scores": []}
        
    alchm_data = request.get("alchmData", {})
    # Fall back to the real computed sky when the caller doesn't supply one.
    current_planets = request.get("currentPlanets") or _planetary_positions_for(datetime.utcnow())

    scores = []
    for agent_id in agent_ids:
        agent = crud.get_agent(db, agent_id)
        mc = agent.monicaConstant if agent and getattr(agent, 'monicaConstant', None) is not None else 0.5
        score = utils.calculate_enhanced_moment_score(agent_id, current_planets, alchm_data, mc, agent=agent)
        scores.append(score)
        
    return {"scores": scores}

@app.post("/api/generate-image")
async def generate_image(request: Dict[str, Any]):
    prompt = request.get("prompt")
    if not prompt:
        raise HTTPException(status_code=400, detail="Missing prompt")
        
    api_token = os.getenv("CLOUDFLARE_API_TOKEN")
    account_id = os.getenv("CLOUDFLARE_ACCOUNT_ID")
    
    if not api_token or not account_id:
        raise HTTPException(
            status_code=500, 
            detail="Server misconfiguration: Missing Cloudflare credentials (CLOUDFLARE_API_TOKEN or CLOUDFLARE_ACCOUNT_ID)"
        )
        
    url = f"https://api.cloudflare.com/client/v4/accounts/{account_id}/ai/run/@cf/stabilityai/stable-diffusion-xl-base-1.0"
    
    headers = {
        "Authorization": f"Bearer {api_token}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "prompt": prompt,
        "num_steps": request.get("steps", 30),
        "negative_prompt": request.get("negative_prompt", "text, labels, watermarks, ugly, bad anatomy")
    }
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(url, headers=headers, json=payload, timeout=60.0)
            if response.status_code != 200:
                raise HTTPException(
                    status_code=502, 
                    detail=f"Cloudflare AI error: {response.status_code} {response.text}"
                )
                
            # Cloudflare returns binary image data
            import base64
            image_data = response.content
            b64_encoded = base64.b64encode(image_data).decode('utf-8')
            mime_type = response.headers.get("Content-Type", "image/png")
            data_uri = f"data:{mime_type};base64,{b64_encoded}"
            
            return {
                "success": True,
                "provider": "cloudflare-workers-ai",
                "imageUrl": data_uri,
                "url": data_uri,
                "metadata": {
                    "model": "@cf/stabilityai/stable-diffusion-xl-base-1.0"
                }
            }
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Image generation failed: {str(e)}")


@app.get("/api/philosophers-stone/positions", response_model=schemas.PhilosophersStonePositionsResponse)
async def get_philosophers_stone_positions(
    year: Optional[int] = None,
    month: Optional[int] = None,
    day: Optional[int] = None,
    hour: Optional[int] = None,
    minute: Optional[int] = None,
):
    now = datetime.utcnow()
    dt = datetime(
        year or now.year,
        month or now.month,
        day or now.day,
        hour or 0,
        minute or 0
    )
    current_pos = _planetary_positions_for(dt)
    prev_dt = dt - timedelta(days=1)
    prev_pos = _planetary_positions_for(prev_dt)
    
    results = utils.alchemize_detailed(
        planetary_positions=current_pos,
        historical_positions=prev_pos,
        dt=dt
    )
    return results

@app.post("/api/philosophers-stone/positions", response_model=schemas.PhilosophersStonePositionsResponse)
async def post_philosophers_stone_positions(request: schemas.PhilosophersStonePositionsRequest):
    now = datetime.utcnow()
    dt = datetime(
        request.year or now.year,
        request.month or now.month,
        request.day or now.day,
        request.hour or 0,
        request.minute or 0
    )
    
    if request.customPlanets:
        current_pos = request.customPlanets
    else:
        current_pos = _planetary_positions_for(dt)
        
    prev_dt = dt - timedelta(days=1)
    prev_pos = _planetary_positions_for(prev_dt)
    
    results = utils.alchemize_detailed(
        planetary_positions=current_pos,
        historical_positions=prev_pos,
        dt=dt
    )
    return results

@app.get("/api/agents/{agent_id}/kinetics")
async def get_agent_kinetics(
    agent_id: str,
    planet: Optional[str] = None,
    db: Session = Depends(database.get_db)
):
    db_agent = crud.get_agent(db, agent_id=agent_id)
    if not db_agent:
        raise HTTPException(status_code=404, detail="Agent not found")
        
    now = datetime.utcnow()
    current_pos = _planetary_positions_for(now)
    
    current_planet = planet or getattr(db_agent, 'symbol', 'Sun') or "Sun"
    if current_planet not in PLANETARY_OFFSETS:
        current_planet = "Sun"
        
    with KINETICS_STATE_LOCK:
        state = KINETICS_STATE.get(agent_id)
        if state:
            prev_pos = state["positions"]
            prev_time = state["timestamp"]
            prev_metrics = state["metrics"]
            time_interval = (now - prev_time).total_seconds()
            if time_interval <= 0.0:
                time_interval = 3600.0
        else:
            prev_time = now - timedelta(hours=1)
            prev_pos = _planetary_positions_for(prev_time)
            prev_metrics = None
            time_interval = 3600.0
            
        metrics = utils.calculate_kinetics(
            current_planetary_positions=current_pos,
            previous_planetary_positions=prev_pos,
            time_interval=time_interval,
            current_planet=current_planet,
            previous_metrics=prev_metrics
        )
        
        KINETICS_STATE[agent_id] = {
            "positions": current_pos,
            "timestamp": now,
            "metrics": metrics
        }
        
    return metrics

@app.post("/api/internal/agent-sync", response_model=schemas.AgentSyncResponse)
async def agent_sync(
    payload: schemas.AgentSyncPayload,
    x_sync_secret: Optional[str] = Header(None, alias="X-Sync-Secret"),
    x_internal_secret: Optional[str] = Header(None, alias="X-Internal-Secret"),
    db: Session = Depends(database.get_db)
):
    secret = x_sync_secret or x_internal_secret
    if secret != INTERNAL_API_SECRET:
        raise HTTPException(status_code=403, detail="Forbidden: Invalid sync secret")
        
    if not sync_rate_limiter.is_allowed():
        raise HTTPException(status_code=429, detail="Too Many Requests: Rate limit exceeded")
        
    db_agent = crud.get_agent(db, agent_id=payload.agentId)
    if db_agent:
        db_agent.name = payload.displayName
        if payload.title is not None:
            db_agent.title = payload.title
        if payload.avatar is not None:
            db_agent.avatar = payload.avatar
        if payload.color is not None:
            db_agent.color = payload.color
        if payload.symbol is not None:
            db_agent.symbol = payload.symbol
        db_agent.lastActive = datetime.utcnow()
        db.commit()
        db.refresh(db_agent)
        action = "updated"
    else:
        agent_create = schemas.AgentCreate(
            agentId=payload.agentId,
            name=payload.displayName,
            title=payload.title or "Synced Agent",
            birthDate=datetime(2000, 1, 1),
            birthTime="12:00",
            birthLocation=schemas.BirthLocation(lat=0.0, lon=0.0, name="Unknown"),
            consciousnessLevel="Active",
            monicaConstant=0.5,
            dominantElement="Air",
            dominantModality="Cardinal",
            specialty="Alchemical Synchronization",
            wisdomDomains=["Cosmology"],
            avatar=payload.avatar,
            color=payload.color,
            symbol=payload.symbol
        )
        crud.create_agent(db=db, agent=agent_create)
        action = "created"

    # Surface registration in alchm.kitchen's Live Network Feed. Only emit
    # when the row was newly created so we don't spam the feed with every
    # update.
    if action == "created":
        emit_feed_event(
            payload.agentId,
            "agent_registered",
            {
                "displayName": payload.displayName,
                "title": payload.title,
                "symbol": payload.symbol,
            },
        )

    return {
        "success": True,
        "agentId": payload.agentId,
        "action": action
    }

@app.post("/api/cron/synthetic-mcp-probe")
async def synthetic_mcp_probe(
    x_cron_secret: Optional[str] = Header(None, alias="X-Cron-Secret"),
    db: Session = Depends(database.get_db)
):
    cron_secret = os.getenv("PA_CRON_SECRET") or os.getenv("INTERNAL_API_SECRET")
    if not cron_secret or x_cron_secret != cron_secret:
        raise HTTPException(status_code=401, detail="Unauthorized")

    import planetary_agents_mcp_server
    import httpx

    # Attempt to get a dynamic seed thread ID from frontend feed
    seed_thread_id = "synthetic-seed-thread"
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(f"{FRONTEND_URL.rstrip('/')}/api/feed")
            if resp.status_code == 200:
                feed_data = resp.json()
                events = feed_data.get("events", [])
                if events and isinstance(events, list) and isinstance(events[0], dict):
                    seed_thread_id = events[0].get("id") or seed_thread_id
    except Exception as exc:
        print(f"[synthetic-probe] Failed to fetch dynamic seed thread: {exc}", flush=True)

    # 1. Probe chat_with_planetary_agent
    chat_payload = {
        "jsonrpc": "2.0",
        "method": "tools/call",
        "params": {
            "name": "chat_with_planetary_agent",
            "arguments": {
                "agentName": "Socrates",
                "message": "ping",
                "modelTier": "free",
                "_meta": {
                    "caller": "synthetic-probe"
                }
            }
        },
        "id": "probe-chat"
    }

    # 2. Probe get_agent_feed_discussion
    feed_payload = {
        "jsonrpc": "2.0",
        "method": "tools/call",
        "params": {
            "name": "get_agent_feed_discussion",
            "arguments": {
                "threadId": seed_thread_id,
                "_meta": {
                    "caller": "synthetic-probe"
                }
            }
        },
        "id": "probe-feed"
    }

    results = {}
    try:
        chat_resp = await planetary_agents_mcp_server.handle_request(chat_payload)
        results["chat"] = chat_resp
    except Exception as exc:
        results["chat_error"] = str(exc)

    try:
        feed_resp = await planetary_agents_mcp_server.handle_request(feed_payload)
        results["feed"] = feed_resp
    except Exception as exc:
        results["feed_error"] = str(exc)

    success = "chat_error" not in results and "feed_error" not in results
    if success and (not results.get("chat") or results.get("chat", {}).get("error")):
        success = False
    if success and (not results.get("feed") or results.get("feed", {}).get("error")):
        success = False

    # Piggyback retention on the 30-min probe: prune mcp_invocations older than the
    # retention window so the table doesn't grow unbounded (nothing else calls this).
    try:
        import mcp_invocation_log
        retain_days = int(os.getenv("MCP_INVOCATIONS_RETAIN_DAYS", "30"))
        results["pruned"] = await mcp_invocation_log.prune_mcp_invocations(retain_days=retain_days)
    except Exception as exc:
        results["prune_error"] = str(exc)

    return {
        "success": success,
        "results": results
    }

@app.get("/api/admin/mcp-status")
async def admin_mcp_status(db: Session = Depends(database.get_db)):
    from sqlalchemy import select, desc
    from models import MCPInvocation

    try:
        stmt = (
            select(MCPInvocation)
            .where(MCPInvocation.caller == "synthetic-probe")
            .order_by(desc(MCPInvocation.calledAt))
            .limit(10)
        )
        result = db.execute(stmt)
        rows = result.scalars().all()

        serializable_rows = []
        for r in rows:
            serializable_rows.append({
                "id": r.id,
                "tool_name": r.toolName,
                "called_at": r.calledAt.isoformat() if r.calledAt else None,
                "completed_at": r.completedAt.isoformat() if r.completedAt else None,
                "latency_ms": r.latencyMs,
                "success": r.success,
                "caller": r.caller,
                "error_message": r.errorMessage,
                "model_tier": r.modelTier,
                "agent_id": r.agentId
            })

        status = "healthy"
        if not serializable_rows:
            status = "unknown"
        elif not any(r["success"] for r in serializable_rows[:2]):
            status = "unhealthy"

        return {
            "status": status,
            "latest_probes": serializable_rows
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Database lookup failed: {exc}")


# ---------------------------------------------------------------------------
# /api/admin/mcp-summary — aggregate telemetry for WTEN's cross-server panel
# ---------------------------------------------------------------------------

from pydantic import BaseModel as _SummaryBaseModel


class McpSummaryTotals(_SummaryBaseModel):
    calls: int
    success: int
    failures: int
    errorRate: float
    p50LatencyMs: Optional[int] = None
    p95LatencyMs: Optional[int] = None
    p99LatencyMs: Optional[int] = None


class McpSummaryByTool(_SummaryBaseModel):
    tool: str
    calls: int
    failures: int
    p95LatencyMs: Optional[int] = None


class McpSummaryByAgent(_SummaryBaseModel):
    agentId: str
    calls: int
    modelTierMix: Dict[str, int]


class McpSummaryByCaller(_SummaryBaseModel):
    caller: str
    calls: int


class McpSummarySyntheticProbe(_SummaryBaseModel):
    verdict: str
    lastCalledAt: Optional[str] = None
    lastSuccess: Optional[bool] = None
    consecutiveFailures: int = 0


class McpSummaryTierDowngrades(_SummaryBaseModel):
    """Tier-gating telemetry (E4).

    validate_and_gate_invocation silently downgrades anon/standard-tier
    requests. `total` is the count of invocations in the window whose
    resolved modelTier was lower than what the caller requested.
    `byRequestedTier` breaks that down by the tier the caller asked for
    (the one that got knocked down), so we can tell whether the limits
    are biting `reflective` asks specifically vs everything.
    """
    total: int = 0
    byRequestedTier: Dict[str, int] = {}


class McpSummaryResponse(_SummaryBaseModel):
    live: bool
    generatedAt: str
    windowMinutes: int
    verdict: str
    totals: McpSummaryTotals
    byTool: List[McpSummaryByTool]
    byAgent: List[McpSummaryByAgent]
    byCaller: List[McpSummaryByCaller]
    tierDowngrades: McpSummaryTierDowngrades
    syntheticProbe: McpSummarySyntheticProbe


# ---- Auth -----------------------------------------------------------------

def _admin_mcp_secret() -> str:
    """Return the secret used to gate /api/admin/mcp-summary.

    Accepts PA_INTERNAL_API_SECRET (the name the WTEN-side proxy ships with)
    and falls back to INTERNAL_API_SECRET (the long-standing PA convention).
    """
    return os.getenv("PA_INTERNAL_API_SECRET") or INTERNAL_API_SECRET


def _require_admin_secret(provided: Optional[str]) -> None:
    import secrets
    expected = _admin_mcp_secret()
    if not provided or not expected or not secrets.compare_digest(provided, expected):
        raise HTTPException(status_code=401, detail="Unauthorized")


# ---- Percentile helper ----------------------------------------------------

def _percentile(values: List[int], p: float) -> Optional[int]:
    """Linear-interpolation percentile (mirrors Postgres percentile_cont)."""
    if not values:
        return None
    sorted_values = sorted(values)
    if len(sorted_values) == 1:
        return int(sorted_values[0])
    rank = (len(sorted_values) - 1) * p
    lo = int(rank)
    hi = min(lo + 1, len(sorted_values) - 1)
    frac = rank - lo
    return int(round(sorted_values[lo] + (sorted_values[hi] - sorted_values[lo]) * frac))


# ---- Synthetic probe verdict (shared with mcp-status) ---------------------

def _compute_synthetic_verdict(db: Session) -> McpSummarySyntheticProbe:
    from sqlalchemy import select, desc
    from models import MCPInvocation

    stmt = (
        select(MCPInvocation)
        .where(MCPInvocation.caller == "synthetic-probe")
        .order_by(desc(MCPInvocation.calledAt))
        .limit(4)
    )
    rows = db.execute(stmt).scalars().all()

    if not rows:
        return McpSummarySyntheticProbe(verdict="UNKNOWN")

    latest = rows[0]
    last_called_at_dt = latest.calledAt
    last_called_at = last_called_at_dt.isoformat() if last_called_at_dt else None
    last_success = bool(latest.success)
    consecutive_failures = 0
    for r in rows:
        if r.success:
            break
        consecutive_failures += 1

    failures = sum(1 for r in rows if not r.success)
    now = datetime.utcnow()
    is_stale = last_called_at_dt is not None and (now - last_called_at_dt) > timedelta(minutes=60)

    if failures >= 2:
        verdict = "INCIDENT"
    elif is_stale:
        verdict = "DEGRADED"
    elif last_success:
        verdict = "OK"
    else:
        verdict = "DEGRADED"

    return McpSummarySyntheticProbe(
        verdict=verdict,
        lastCalledAt=last_called_at,
        lastSuccess=last_success,
        consecutiveFailures=consecutive_failures,
    )


# ---- Aggregation ----------------------------------------------------------

def _aggregate_mcp_summary(db: Session, window_minutes: int) -> Dict[str, Any]:
    from sqlalchemy import select
    from models import MCPInvocation

    cutoff = datetime.utcnow() - timedelta(minutes=window_minutes)
    base_where = MCPInvocation.calledAt >= cutoff

    # Totals + per-tool latencies in a single scan. We pull the latency column
    # into Python and compute percentiles there so the same code path works for
    # both Postgres (prod) and SQLite (tests). The window is capped at 1 day
    # and the (tool_name, called_at DESC) index keeps the scan cheap.
    rows = db.execute(
        select(
            MCPInvocation.toolName,
            MCPInvocation.success,
            MCPInvocation.latencyMs,
            MCPInvocation.agentId,
            MCPInvocation.modelTier,
            MCPInvocation.caller,
            MCPInvocation.arguments,
        ).where(base_where)
    ).all()

    total_calls = len(rows)
    success_count = sum(1 for r in rows if r.success)
    failure_count = total_calls - success_count
    error_rate = (failure_count / total_calls) if total_calls > 0 else 0.0
    all_latencies = [int(r.latencyMs) for r in rows if r.latencyMs is not None]

    totals = McpSummaryTotals(
        calls=total_calls,
        success=success_count,
        failures=failure_count,
        errorRate=round(error_rate, 6),
        p50LatencyMs=_percentile(all_latencies, 0.50),
        p95LatencyMs=_percentile(all_latencies, 0.95),
        p99LatencyMs=_percentile(all_latencies, 0.99),
    )

    by_tool_acc: Dict[str, Dict[str, Any]] = {}
    for r in rows:
        bucket = by_tool_acc.setdefault(r.toolName, {"calls": 0, "failures": 0, "latencies": []})
        bucket["calls"] += 1
        if not r.success:
            bucket["failures"] += 1
        if r.latencyMs is not None:
            bucket["latencies"].append(int(r.latencyMs))

    by_tool = [
        McpSummaryByTool(
            tool=tool,
            calls=acc["calls"],
            failures=acc["failures"],
            p95LatencyMs=_percentile(acc["latencies"], 0.95),
        )
        for tool, acc in by_tool_acc.items()
    ]
    by_tool.sort(key=lambda b: b.calls, reverse=True)

    # byAgent: drop NULL agent_id, top 10 by calls
    by_agent_acc: Dict[str, Dict[str, Any]] = {}
    for r in rows:
        if not r.agentId:
            continue
        bucket = by_agent_acc.setdefault(r.agentId, {"calls": 0, "tier_mix": {}})
        bucket["calls"] += 1
        tier_key = r.modelTier or "unknown"
        bucket["tier_mix"][tier_key] = bucket["tier_mix"].get(tier_key, 0) + 1

    by_agent = [
        McpSummaryByAgent(
            agentId=agent_id,
            calls=acc["calls"],
            modelTierMix=acc["tier_mix"],
        )
        for agent_id, acc in by_agent_acc.items()
    ]
    by_agent.sort(key=lambda b: b.calls, reverse=True)
    by_agent = by_agent[:10]

    # byCaller: top 10 by calls (NULL caller becomes "unknown")
    by_caller_acc: Dict[str, int] = {}
    for r in rows:
        caller_key = r.caller or "unknown"
        by_caller_acc[caller_key] = by_caller_acc.get(caller_key, 0) + 1

    by_caller = [McpSummaryByCaller(caller=c, calls=n) for c, n in by_caller_acc.items()]
    by_caller.sort(key=lambda b: b.calls, reverse=True)
    by_caller = by_caller[:10]

    # tierDowngrades (E4): a row was downgraded when its resolved
    # modelTier ranks below the tier the caller originally requested
    # (stored in the un-gated arguments.modelTier). Anonymous/standard
    # callers get knocked to free/cheap_fast by
    # validate_and_gate_invocation; this surfaces how often that bites.
    tier_rank = {"free": 0, "cheap_fast": 1, "primary": 2, "reflective": 3}
    downgrade_total = 0
    downgrade_by_requested: Dict[str, int] = {}
    for r in rows:
        args = r.arguments if isinstance(r.arguments, dict) else {}
        requested = args.get("modelTier") or "free"
        resolved = r.modelTier or "free"
        if tier_rank.get(resolved, 0) < tier_rank.get(requested, 0):
            downgrade_total += 1
            downgrade_by_requested[requested] = downgrade_by_requested.get(requested, 0) + 1

    tier_downgrades = McpSummaryTierDowngrades(
        total=downgrade_total,
        byRequestedTier=downgrade_by_requested,
    )

    synthetic = _compute_synthetic_verdict(db)

    # Overall verdict — mirrors WTEN's systemStatusService taxonomy
    if total_calls == 0:
        # Distinguish UNKNOWN (no traffic AND no probes) from OK (idle but probed)
        now = datetime.utcnow()
        synth_called_at = (
            datetime.fromisoformat(synthetic.lastCalledAt)
            if synthetic.lastCalledAt
            else None
        )
        probe_stale = synth_called_at is None or (now - synth_called_at) > timedelta(hours=2)
        if probe_stale:
            verdict = "UNKNOWN"
        else:
            verdict = synthetic.verdict
    else:
        if error_rate >= 0.05 or synthetic.verdict == "INCIDENT":
            verdict = "INCIDENT"
        elif (
            error_rate >= 0.01
            or (totals.p95LatencyMs is not None and totals.p95LatencyMs > 2000)
            or synthetic.verdict == "DEGRADED"
        ):
            verdict = "DEGRADED"
        elif synthetic.verdict == "UNKNOWN":
            # Traffic exists, no probe seen — still report verdict from traffic only
            verdict = "OK"
        else:
            verdict = "OK"

    return {
        "live": True,
        "generatedAt": datetime.utcnow().isoformat() + "Z",
        "windowMinutes": window_minutes,
        "verdict": verdict,
        "totals": totals.model_dump(),
        "byTool": [b.model_dump() for b in by_tool],
        "byAgent": [b.model_dump() for b in by_agent],
        "byCaller": [b.model_dump() for b in by_caller],
        "tierDowngrades": tier_downgrades.model_dump(),
        "syntheticProbe": synthetic.model_dump(),
    }


# ---- 10-second in-process cache ------------------------------------------

_SUMMARY_CACHE_TTL_SECONDS = 10.0
_summary_cache: Dict[int, tuple] = {}  # window_minutes -> (expires_at, payload)
_summary_cache_lock = threading.Lock()


def _get_cached_summary(db: Session, window_minutes: int) -> Dict[str, Any]:
    now = time.monotonic()
    with _summary_cache_lock:
        entry = _summary_cache.get(window_minutes)
        if entry and entry[0] > now:
            return entry[1]

    # Compute outside the lock so concurrent windows don't serialize on each other
    payload = _aggregate_mcp_summary(db, window_minutes)

    with _summary_cache_lock:
        _summary_cache[window_minutes] = (now + _SUMMARY_CACHE_TTL_SECONDS, payload)
    return payload


@app.get(
    "/api/admin/mcp-summary",
    response_model=McpSummaryResponse,
    tags=["admin"],
)
async def admin_mcp_summary(
    windowMinutes: int = 60,
    x_internal_secret: Optional[str] = Header(None, alias="X-Internal-Secret"),
    db: Session = Depends(database.get_db),
):
    """Aggregate MCP telemetry for WTEN's cross-server admin panel.

    Auth: X-Internal-Secret header must match PA_INTERNAL_API_SECRET (falls
    back to INTERNAL_API_SECRET). Returns a 401 on mismatch.

    Query: windowMinutes (5–1440, default 60). Out-of-range → 422.
    """
    _require_admin_secret(x_internal_secret)
    if windowMinutes < 5 or windowMinutes > 1440:
        raise HTTPException(status_code=422, detail="windowMinutes must be between 5 and 1440")

    try:
        return _get_cached_summary(db, windowMinutes)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"mcp-summary aggregation failed: {exc}")


# ── A2A (Agent2Agent) server — expose agents over A2A, x402-paid (USDC) ──────
async def _a2a_run_chat(agent_id: str, message: str) -> str:
    """In-process chat call for the A2A executor (reuses the full orchestration)."""
    req = schemas.ChatRequest(agentId=agent_id, message=message)
    gen = database.get_db()
    db = next(gen)
    try:
        resp = await chat(req, db)
    finally:
        gen.close()
    return resp.get("text", "") if isinstance(resp, dict) else getattr(resp, "text", "")


async def _a2a_run_chat_stream(agent_id: str, message: str):
    """Streaming in-process chat for the A2A executor — yields text deltas.

    Persona-only (skips RAG/MCP hydration for low-latency token streaming); the
    non-streaming path (_a2a_run_chat → /api/chat) keeps the full augmentation.
    """
    gen = database.get_db()
    db = next(gen)
    try:
        db_agent = crud.get_agent(db, agent_id)
        if not db_agent:
            yield f"(agent {agent_id} not found)"
            return
        persona_block = prompts.get_agent_system_prompt(db_agent.__dict__)
        tier = _resolve_tier(None)
        anthropic_model = ANTHROPIC_TIER_MODEL.get(tier)
        chain = providers.build_chain(tier, anthropic_model)
        async for delta in providers.run_chain_stream(
            chain=chain,
            persona_block=persona_block,
            rag_block="",
            user_message=message,
            agent_id=agent_id,
            tier=tier,
        ):
            yield delta
    finally:
        gen.close()


def _a2a_agent_list() -> List[Dict[str, Any]]:
    """Agents to expose over A2A. Default = a flagship set; override via A2A_AGENT_IDS."""
    ids_env = os.getenv("A2A_AGENT_IDS")
    flagship = ["plato", "aristotle", "socrates", "homer", "marie-curie", "leonardo-da-vinci"]
    ids = [s.strip() for s in ids_env.split(",") if s.strip()] if ids_env else flagship
    agents: List[Dict[str, Any]] = []
    gen = database.get_db()
    db = next(gen)
    try:
        for aid in ids:
            try:
                row = crud.get_agent(db, aid)
            except Exception:
                row = None
            name = getattr(row, "name", None) or aid.replace("-", " ").title()
            title = getattr(row, "title", None) if row is not None else None
            description = f"{name} — {title}" if title else f"{name}, an Alchm planetary/historical agent."
            agents.append({"id": aid, "name": name, "description": description})
    finally:
        gen.close()
    return agents


if os.getenv("A2A_ENABLED", "true").lower() == "true":
    try:
        from x402_middleware import add_x402_gate

        add_x402_gate(app)
        print("[x402] payment gate active on /a2a/ (enforced when X402_PAY_TO is set)", flush=True)
    except Exception as exc:  # noqa: BLE001
        print(f"[x402] gate not added: {exc}", flush=True)
    try:
        from a2a_server import register_a2a_routes

        _mounted = register_a2a_routes(
            app, _a2a_run_chat, _a2a_agent_list(), run_chat_stream=_a2a_run_chat_stream
        )
        print(f"[a2a] mounted {_mounted} agent(s) at /a2a/<agentId>/.well-known/agent-card.json", flush=True)
    except Exception as exc:  # noqa: BLE001
        print(f"[a2a] A2A server not mounted ({exc}); install a2a-sdk[fastapi] to enable", flush=True)


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
