import os
import pytest
import feed_emitter

@pytest.mark.asyncio
async def test_feed_emitter_alchemical_chef_guard(monkeypatch):
    emitted = []

    async def fake_post(agent_email, event_type, metadata_payload):
        emitted.append((agent_email, event_type))

    monkeypatch.setattr(feed_emitter, "_post_feed_event", fake_post)

    # Disabled by default
    monkeypatch.setenv("EMIT_ALCHEMICAL_CHEF_FEED", "false")
    monkeypatch.setenv("EMIT_RECIPE_FEED_EVENTS", "false")
    feed_emitter.emit_feed_event("alchemical-chef", "recipe_generation", {"test": True})
    assert len(emitted) == 0

    # Enabled
    monkeypatch.setenv("EMIT_ALCHEMICAL_CHEF_FEED", "true")
    monkeypatch.setenv("EMIT_RECIPE_FEED_EVENTS", "true")
    feed_emitter.emit_feed_event("alchemical-chef", "recipe_generation", {"test": True})
    # Yield to event loop to let task run
    import asyncio
    await asyncio.sleep(0.01)
    assert len(emitted) == 1
    assert emitted[0] == ("alchemical-chef@agentic.alchm.kitchen", "recipe_generation")
