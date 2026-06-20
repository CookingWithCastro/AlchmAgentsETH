import json
import os
import pytest
from uuid import uuid4
from fastapi.testclient import TestClient

os.environ.setdefault("ALCHM_MCP_ENABLED", "false")

from main import app
import alchm_mcp
import providers
import feed_emitter
import recipe_generation
import planetary_agents_mcp_server

client = TestClient(app)


def test_read_main():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"message": "Planetary Agents Core API is operational"}


def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"


def test_alchm_mcp_parse_tool_json():
    result = {
        "content": [
            {
                "type": "text",
                "text": json.dumps({"dominantElement": "Fire", "ingredientCount": 3}),
            }
        ]
    }

    assert alchm_mcp.parse_tool_json(result) == {
        "dominantElement": "Fire",
        "ingredientCount": 3,
    }


@pytest.mark.asyncio
async def test_alchm_mcp_status_disabled(monkeypatch):
    monkeypatch.setenv("ALCHM_MCP_ENABLED", "false")

    status = await alchm_mcp.status()

    assert status["enabled"] is False
    assert status["status"] == "disabled"


@pytest.mark.asyncio
async def test_planetary_agents_mcp_lists_cognitive_tools():
    response = await planetary_agents_mcp_server.handle_request(
        {"jsonrpc": "2.0", "id": 1, "method": "tools/list"}
    )

    assert response["result"]["tools"][0]["name"] == "chat_with_planetary_agent"
    tool_names = {tool["name"] for tool in response["result"]["tools"]}
    assert {
        "chat_with_planetary_agent",
        "get_agent_feed_discussion",
        "synthesize_culinary_debate",
    }.issubset(tool_names)


@pytest.mark.asyncio
async def test_planetary_agents_mcp_synthesizes_debate_without_network(monkeypatch):
    async def fake_alchemize(ingredients):
        return {"dominantElement": "Earth", "ingredientCount": len(ingredients)}

    async def fake_recipe(prompt=None, cuisine=None, dietary=None, dominant_element=None):
        return {"returnedCount": 1, "recipes": [{"name": "Test Stew"}]}

    async def fake_chat(agent_name, message, conversation_history=None, context=None, model_tier=None):
        return {
            "agentName": agent_name,
            "agentId": planetary_agents_mcp_server._agent_id(agent_name),
            "text": f"{agent_name} considers the dish.",
        }

    monkeypatch.setattr(planetary_agents_mcp_server.alchm_mcp, "alchemize_ingredients", fake_alchemize)
    monkeypatch.setattr(planetary_agents_mcp_server.alchm_mcp, "generate_cosmic_recipe", fake_recipe)
    monkeypatch.setattr(planetary_agents_mcp_server, "_backend_chat", fake_chat)

    response = await planetary_agents_mcp_server.synthesize_culinary_debate(
        {"ingredients": ["tomato", "basil"], "agents": ["Socrates", "Rumi"]}
    )

    payload = json.loads(response["content"][0]["text"])
    assert payload["alchemicalScan"]["dominantElement"] == "Earth"
    assert payload["recipeCandidates"]["recipes"][0]["name"] == "Test Stew"
    assert [turn["agentId"] for turn in payload["dialogue"]] == ["socrates", "rumi"]


# --- Provider fallback chain rotation tests --------------------------------
#
# Five scenarios, walking the chain Anthropic → Groq → Cerebras → Gemini →
# OpenRouter → OpenAI. Each scenario marks N providers as rate-limited and
# asserts run_chain settles on the first survivor. We mock at
# providers.call_provider so the test never touches a real network client.


@pytest.fixture
def all_keys_set(monkeypatch):
    """Wire keys for every provider so build_chain emits all six."""
    monkeypatch.setenv("ANTHROPIC_API_KEY", "ak")
    monkeypatch.setenv("GROQ_API_KEY", "gk")
    monkeypatch.setenv("CEREBRAS_API_KEY", "ck")
    monkeypatch.setenv("GEMINI_API_KEY", "gmk")
    monkeypatch.setenv("OPENROUTER_API_KEY", "ork")
    monkeypatch.setenv("OPENAI_API_KEY", "oak")


def _selective_failure(failing_names):
    async def fake_call(cfg, persona_block, rag_block, user_message):
        if cfg.name in failing_names:
            raise Exception("429 rate limit exceeded")
        return providers.CallResult(
            text=f"hello from {cfg.name}",
            provider=cfg.name,
            model=cfg.model,
        )

    return fake_call


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("failing", "expected_provider"),
    [
        # Scenario 1 — anthropic fails, groq succeeds.
        (["anthropic"], "groq"),
        # Scenario 2 — anthropic + groq fail, cerebras succeeds.
        (["anthropic", "groq"], "cerebras"),
        # Scenario 3 — anthropic + groq + cerebras fail, qwen succeeds.
        (["anthropic", "groq", "cerebras"], "qwen"),
        # Scenario 4 — anthropic + groq + cerebras + qwen fail, gemini succeeds.
        (["anthropic", "groq", "cerebras", "qwen"], "gemini"),
        # Scenario 5 — only openrouter survives.
        (["anthropic", "groq", "cerebras", "qwen", "gemini"], "openrouter"),
        # Scenario 6 — every free provider rate-limited; paid OpenAI catches.
        (["anthropic", "groq", "cerebras", "qwen", "gemini", "openrouter"], "openai"),
    ],
)
async def test_chain_walks_to_first_survivor(
    all_keys_set, monkeypatch, failing, expected_provider
):
    monkeypatch.setattr(providers, "call_provider", _selective_failure(failing))
    chain = providers.build_chain("cheap_fast", "claude-haiku-4-5-20251001")
    result = await providers.run_chain(
        chain=chain,
        persona_block="PERSONA",
        rag_block="",
        user_message="hi",
        agent_id="test-agent",
        tier="cheap_fast",
        persona_cache_key="abcd1234",
    )
    assert result is not None
    assert result.provider == expected_provider


@pytest.mark.asyncio
async def test_chain_returns_none_when_every_provider_fails(all_keys_set, monkeypatch):
    """Last-line: total outage → run_chain returns None (handler emits a stub)."""
    every_provider = ["anthropic", "groq", "cerebras", "qwen", "gemini", "openrouter", "openai"]
    monkeypatch.setattr(providers, "call_provider", _selective_failure(every_provider))
    chain = providers.build_chain("cheap_fast", "claude-haiku-4-5-20251001")
    result = await providers.run_chain(
        chain=chain,
        persona_block="P",
        rag_block="",
        user_message="hi",
        agent_id="t",
        tier="cheap_fast",
    )
    assert result is None


@pytest.mark.asyncio
async def test_free_tier_skips_anthropic_entirely(all_keys_set, monkeypatch):
    """tier=='free' must not include anthropic in the chain at all."""
    monkeypatch.setattr(providers, "call_provider", _selective_failure([]))
    chain = providers.build_chain("free", anthropic_model=None)
    assert "anthropic" not in [c.name for c in chain]
    result = await providers.run_chain(
        chain=chain,
        persona_block="P",
        rag_block="",
        user_message="hi",
        agent_id="t",
        tier="free",
    )
    assert result is not None
    assert result.provider == "groq"


@pytest.mark.asyncio
async def test_chain_skips_providers_with_missing_keys(monkeypatch):
    """If GROQ_API_KEY is unset, chain should jump straight to cerebras."""
    monkeypatch.setenv("ANTHROPIC_API_KEY", "ak")
    monkeypatch.delenv("GROQ_API_KEY", raising=False)
    monkeypatch.setenv("CEREBRAS_API_KEY", "ck")
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    monkeypatch.delenv("OPENROUTER_API_KEY", raising=False)
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    monkeypatch.setattr(providers, "call_provider", _selective_failure(["anthropic"]))
    chain = providers.build_chain("cheap_fast", "claude-haiku-4-5-20251001")
    result = await providers.run_chain(
        chain=chain,
        persona_block="P",
        rag_block="",
        user_message="hi",
        agent_id="t",
        tier="cheap_fast",
    )
    assert result is not None
    assert result.provider == "cerebras"


@pytest.mark.asyncio
async def test_paid_fallback_emits_alert_event(all_keys_set, monkeypatch, capsys):
    """When OpenAI catches the request, an alert_event log line must fire."""
    every_free = ["anthropic", "groq", "cerebras", "qwen", "gemini", "openrouter"]
    monkeypatch.setattr(providers, "call_provider", _selective_failure(every_free))
    chain = providers.build_chain("cheap_fast", "claude-haiku-4-5-20251001")
    await providers.run_chain(
        chain=chain,
        persona_block="P",
        rag_block="",
        user_message="hi",
        agent_id="t",
        tier="cheap_fast",
    )
    captured = capsys.readouterr()
    assert "alert_event reason=paid_fallback provider=openai" in captured.out


@pytest.mark.asyncio
async def test_no_alert_when_free_provider_succeeds(all_keys_set, monkeypatch, capsys):
    """Successful free-tier provider must NOT emit the paid-fallback alert."""
    monkeypatch.setattr(providers, "call_provider", _selective_failure([]))
    chain = providers.build_chain("free", anthropic_model=None)
    await providers.run_chain(
        chain=chain,
        persona_block="P",
        rag_block="",
        user_message="hi",
        agent_id="t",
        tier="free",
    )
    captured = capsys.readouterr()
    assert "alert_event" not in captured.out


def test_is_quota_error_recognises_common_phrasings():
    samples = [
        "Error code: 429 - rate limit",
        "Insufficient credit balance",
        "You have exceeded your monthly quota",
        "billing issue with your account",
    ]
    for s in samples:
        assert providers.is_quota_error(Exception(s)), s

    # Non-quota errors must NOT trip the heuristic.
    assert not providers.is_quota_error(Exception("Connection refused"))
    assert not providers.is_quota_error(Exception("Invalid JSON"))


def _sample_cosmic_recipe() -> dict:
    return {
        "id": "air-weekday-chicken-salad",
        "title": "Airy Weekday Chicken Salad",
        "short_description": "A crisp, quick dinner with bright herbs and a light citrus finish.",
        "category": "Dinner",
        "cuisine": "Mediterranean",
        "difficulty": "beginner",
        "yields": 2,
        "total_time": 25,
        "alignment_score": {
            "overall": 91,
            "ingredients_fit": 92,
            "diet_fit": 96,
            "time_fit": 88,
            "astro_fit": 89,
        },
        "alignment_notes": [
            "Light textures support the Air emphasis.",
            "Chicken keeps the meal grounding without feeling heavy.",
        ],
        "tags": {
            "diet": ["omnivore"],
            "cuisine": ["Mediterranean"],
            "meal_type": "Dinner",
            "flavor_profile": ["bright", "herbal"],
            "cooking_methods": ["sear", "mix"],
            "elements": ["air", "earth"],
            "planets": ["Mercury", "Venus"],
        },
        "ingredients": [
            {
                "name": "chicken breast",
                "quantity": "12",
                "unit": "oz",
                "household_description": "2 small chicken breasts",
                "optional": False,
                "substitutions": ["chickpeas for a lighter vegetarian version"],
            },
            {
                "name": "mixed greens",
                "quantity": "4",
                "unit": "cup",
                "optional": False,
                "substitutions": ["romaine for extra crunch"],
            },
        ],
        "steps": [
            {
                "step_number": 1,
                "instruction": "Season and sear the chicken until golden and cooked through.",
                "time_minutes": 12,
                "cooking_method": "sear",
                "tips": ["Use medium-high heat.", "Rest before slicing."],
            },
            {
                "step_number": 2,
                "instruction": "Toss greens with citrus dressing and top with sliced chicken.",
                "time_minutes": 8,
                "cooking_method": "mix",
                "tips": ["Dress just before serving."],
            },
        ],
        "elementalBalance": {"fire": 20, "earth": 30, "water": 15, "air": 35},
        "nutrition": {"calories": 430, "protein": 38, "carbohydrates": 18, "fat": 24},
        "vitamins": ["Vitamin C", "Vitamin K"],
        "minerals": ["Iron", "Potassium"],
        "finishing_and_serving": {
            "garnish_and_plating": "Finish with parsley and lemon zest.",
            "doneness_cues": "Chicken reaches 165 F and juices run clear.",
            "serving_suggestions": "Serve with warm pita or a small bowl of soup.",
        },
        "leftovers_and_storage": {
            "can_store": True,
            "storage_instructions": "Store chicken and greens separately in airtight containers.",
            "storage_lifespan_days": 2,
        },
        "astro_explanation": {
            "summary": "The dish leans into Air through crisp greens, herbs, and a quick method.",
            "correspondences": [
                "Leafy greens express Air through lightness.",
                "Citrus brightens the Mercury-style clarity of the meal.",
            ],
        },
    }


@pytest.mark.asyncio
async def test_generate_recipe_retries_then_returns_valid_payload(monkeypatch):
    recipe_generation.clear_recipe_cache()
    calls = []

    async def fake_run_chain(**kwargs):
        calls.append(kwargs)
        if len(calls) == 1:
            return providers.CallResult(
                text='{"title":"missing required fields"}',
                provider="groq",
                model="fake-model",
            )
        return providers.CallResult(
            text=json.dumps(_sample_cosmic_recipe()),
            provider="groq",
            model="fake-model",
        )

    monkeypatch.setattr(providers, "run_chain", fake_run_chain)

    response = client.post(
        "/api/generate-recipe",
        json={
            "prompt": "weekday dinner",
            "dietPreference": "omnivore",
            "dominantElement": "Air",
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "Airy Weekday Chicken Salad"
    assert data["alignment_score"]["overall"] == 91
    assert len(calls) == 2
    assert calls[0]["response_format"] == {"type": "json_object"}
    assert calls[0]["structured_schema"]["title"] == "CosmicRecipeResponse"
    assert "Previous output failed validation" in calls[1]["user_message"]


def test_philosophers_stone_positions_get():
    response = client.get("/api/philosophers-stone/positions?year=2026&month=5&day=21&hour=8&minute=0")
    assert response.status_code == 200
    data = response.json()
    assert "elementalProperties" in data
    assert "thermodynamicProperties" in data
    assert "esms" in data
    assert "kalchm" in data
    assert "monica" in data
    assert "perPlanet" in data
    assert data["normalized"] is True

def test_philosophers_stone_positions_post():
    response = client.post("/api/philosophers-stone/positions", json={})
    assert response.status_code == 200
    data = response.json()
    assert "elementalProperties" in data
    
    custom_planets = {
        "Sun": {"sign": "Leo", "degree": 15, "minute": 30, "exactLongitude": 135.5},
        "Moon": {"sign": "Cancer", "degree": 12, "minute": 0, "exactLongitude": 102.0}
    }
    response = client.post(
        "/api/philosophers-stone/positions",
        json={"year": 2026, "month": 5, "day": 21, "customPlanets": custom_planets}
    )
    assert response.status_code == 200
    data = response.json()
    assert "Sun" in data["perPlanet"]
    assert data["perPlanet"]["Sun"]["sign"] == "Leo"

def test_internal_agent_sync_security():
    response = client.post("/api/internal/agent-sync", json={
        "agentId": "sync-test-agent",
        "displayName": "Sync Test Agent"
    })
    assert response.status_code == 403

    response = client.post(
        "/api/internal/agent-sync",
        headers={"X-Sync-Secret": "wrong-secret"},
        json={
            "agentId": "sync-test-agent",
            "displayName": "Sync Test Agent"
        }
    )
    assert response.status_code == 403

def test_internal_agent_sync_success_and_kinetics():
    from main import INTERNAL_API_SECRET
    agent_id = f"sync-test-agent-{uuid4().hex[:8]}"
    
    response = client.post(
        "/api/internal/agent-sync",
        headers={"X-Sync-Secret": INTERNAL_API_SECRET},
        json={
            "agentId": agent_id,
            "displayName": "Original Sync Agent",
            "title": "First Master of Sync",
            "avatar": "sync_avatar.png",
            "color": "#ff00ff",
            "symbol": "Sun"
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["agentId"] == agent_id
    assert data["action"] == "created"

    response = client.post(
        "/api/internal/agent-sync",
        headers={"X-Internal-Secret": INTERNAL_API_SECRET},
        json={
            "agentId": agent_id,
            "displayName": "Updated Sync Agent",
            "title": "Grandmaster of Sync"
        }
    )
    assert response.status_code == 200
    assert response.json()["action"] == "updated"

    response = client.get(f"/api/agents/{agent_id}/kinetics")
    assert response.status_code == 200
    data = response.json()
    assert "velocity" in data
    assert "momentum" in data
    assert "potentialDifference" in data
    assert "power" in data
    assert "force" in data


def test_feed_emitter_builds_wten_compatible_payload():
    payload = feed_emitter.build_feed_payload(
        "galileo@agentic.alchm.kitchen",
        "agent_chat",
        {
            "agentName": "Galileo",
            "messagePreview": "Observe the moons.",
            "timestamp": "2026-05-22T00:00:00Z",
        },
    )

    assert payload["agentEmail"] == "galileo@agentic.alchm.kitchen"
    assert payload["eventType"] == "agent_chat"
    assert payload["actionType"] == "agent_chat"
    assert payload["agentDisplayName"] == "Galileo"
    assert payload["timestamp"] == "2026-05-22T00:00:00Z"
    assert payload["activityDetails"]["messagePreview"] == "Observe the moons."
    assert payload["metadataPayload"]["actionType"] == "agent_chat"
    assert payload["metadataPayload"]["activityDetails"]["messagePreview"] == "Observe the moons."
    assert payload["metadataPayload"]["timestamp"] == "2026-05-22T00:00:00Z"


@pytest.mark.asyncio
async def test_feed_emitter_posts_to_wten_with_bearer_header(monkeypatch, caplog):
    captured = {}

    class FakeResponse:
        status_code = 200
        reason_phrase = "OK"
        text = '{"success":true}'

    class FakeAsyncClient:
        def __init__(self, timeout):
            captured["timeout"] = timeout

        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, tb):
            return None

        async def post(self, url, json, headers):
            captured["url"] = url
            captured["json"] = json
            captured["headers"] = headers
            return FakeResponse()

    monkeypatch.setattr(feed_emitter, "ALCHM_KITCHEN_URL", "https://alchm.kitchen")
    monkeypatch.setattr(feed_emitter, "INTERNAL_API_SECRET", "test-secret")
    monkeypatch.setattr(feed_emitter.httpx, "AsyncClient", FakeAsyncClient)

    with caplog.at_level("INFO"):
        await feed_emitter._post_feed_event(
            "galileo@agentic.alchm.kitchen",
            "agent_chat",
            {"activityDetails": {"messagePreview": "observe"}, "timestamp": "2026-05-22T00:00:00Z"},
        )

    assert captured["url"] == "https://alchm.kitchen/api/feed"
    assert captured["headers"]["Authorization"] == "Bearer test-secret"
    assert captured["json"]["agentEmail"] == "galileo@agentic.alchm.kitchen"
    assert captured["json"]["eventType"] == "agent_chat"
    assert captured["json"]["actionType"] == "agent_chat"
    assert captured["json"]["activityDetails"]["messagePreview"] == "observe"
    assert captured["json"]["metadataPayload"]["timestamp"] == "2026-05-22T00:00:00Z"
    assert "feed_emit ok: galileo@agentic.alchm.kitchen/agent_chat -> 200" in caplog.text


@pytest.mark.asyncio
async def test_chat_auto_registration(monkeypatch):
    monkeypatch.setattr(providers, "call_provider", _selective_failure([]))
    
    agent_id = f"mars-gemini-{uuid4().hex[:8]}"
    
    # Verify agent doesn't exist yet
    get_res = client.get(f"/api/agents/{agent_id}")
    assert get_res.status_code == 404
    
    # Call /api/chat which should trigger auto-registration
    response = client.post("/api/chat", json={
        "agentId": agent_id,
        "message": "What is the message?",
        "systemPromptOverride": "Override system prompt",
    })
    
    assert response.status_code == 200
    data = response.json()
    assert data["agentId"] == agent_id
    assert "text" in data
    
    # Verify agent has been successfully created in the database
    get_res = client.get(f"/api/agents/{agent_id}")
    assert get_res.status_code == 200
    agent_data = get_res.json()
    assert agent_data["agentId"] == agent_id
    assert agent_data["title"] == "Planetary Intelligence"


@pytest.mark.asyncio
async def test_chat_auto_registration_historical(monkeypatch):
    monkeypatch.setattr(providers, "call_provider", _selective_failure([]))
    
    agent_id = f"custom-historical-agent-{uuid4().hex[:8]}"
    
    # Verify agent doesn't exist yet
    get_res = client.get(f"/api/agents/{agent_id}")
    assert get_res.status_code == 404
    
    # Call /api/chat which should trigger auto-registration
    response = client.post("/api/chat", json={
        "agentId": agent_id,
        "message": "What is the message?",
        "systemPromptOverride": "Override system prompt",
    })
    
    assert response.status_code == 200
    data = response.json()
    assert data["agentId"] == agent_id
    
    # Verify agent has been successfully created in the database
    get_res = client.get(f"/api/agents/{agent_id}")
    assert get_res.status_code == 200
    agent_data = get_res.json()
    assert agent_data["agentId"] == agent_id
    assert agent_data["title"] == "Historical Figure"


@pytest.mark.asyncio
async def test_chat_auto_registration_degree_level(monkeypatch):
    monkeypatch.setattr(providers, "call_provider", _selective_failure([]))
    
    unique_suffix = uuid4().hex[:8]
    agent_id = f"planetary-mars-aries-15-{unique_suffix}"
    
    # Verify agent doesn't exist yet
    get_res = client.get(f"/api/agents/{agent_id}")
    assert get_res.status_code == 404
    
    # Call /api/chat which should trigger auto-registration
    response = client.post("/api/chat", json={
        "agentId": agent_id,
        "message": "What is your message?",
        "systemPromptOverride": "Override system prompt",
    })
    
    assert response.status_code == 200
    data = response.json()
    assert data["agentId"] == agent_id
    
    # Verify agent has been successfully created with correct degree-level details
    get_res = client.get(f"/api/agents/{agent_id}")
    assert get_res.status_code == 200
    agent_data = get_res.json()
    assert agent_data["agentId"] == agent_id
    assert agent_data["title"] == "Planetary Intelligence"
    assert agent_data["dominantElement"] == "Fire"
    assert agent_data["dominantModality"] == "Cardinal"
    assert "Mars intelligence in Aries" in agent_data["specialty"]


@pytest.mark.asyncio
async def test_chat_auto_registration_moon_degree_phase(monkeypatch):
    monkeypatch.setattr(providers, "call_provider", _selective_failure([]))
    
    unique_suffix = uuid4().hex[:8]
    agent_id = f"planetary-moon-aries-15-{unique_suffix}"
    
    # Verify agent doesn't exist yet
    get_res = client.get(f"/api/agents/{agent_id}")
    assert get_res.status_code == 404
    
    # Call /api/chat which should trigger auto-registration with lunar phase knowledge
    response = client.post("/api/chat", json={
        "agentId": agent_id,
        "message": "Hello Moon!",
    })
    
    assert response.status_code == 200
    data = response.json()
    assert data["agentId"] == agent_id
    
    # Verify agent has been successfully created with correct phase-level details
    get_res = client.get(f"/api/agents/{agent_id}")
    assert get_res.status_code == 200
    agent_data = get_res.json()
    assert agent_data["agentId"] == agent_id
    assert agent_data["title"] == "Planetary Intelligence"
    assert "Waxing Crescent" in agent_data["name"]
    assert "Waxing Crescent Phase" in agent_data["specialty"]
    assert agent_data["dominantElement"] == "Fire"
    assert agent_data["dominantModality"] == "Cardinal"
    assert agent_data["personalityCore"]["archetype"] == "The Young Explorer"
    assert "curious" in agent_data["personalityCore"]["traits"]
