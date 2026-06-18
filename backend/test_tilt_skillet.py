import os

os.environ.setdefault("ALCHM_MCP_ENABLED", "false")

from fastapi.testclient import TestClient

from main import app
import main
import tilt_skillet_generation
import schemas

client = TestClient(app)


def _canned_plan() -> schemas.TiltSkilletPlanResponse:
    return schemas.TiltSkilletPlanResponse(
        id="tilt-test-1",
        title="Big-Batch Beef & Root Braise",
        summary="A series-circuit braise scaled for the week.",
        cuisine="French",
        batch_yield="20 servings",
        total_time=180,
        equipment_notes="Use a tilt skillet at least 24 inches wide.",
        stages=[
            schemas.TiltSkilletStage(
                step_number=1,
                name="Sear the base",
                instruction="Sear the beef in waves until deeply browned.",
                add_to_skillet=[
                    schemas.TiltSkilletStageIngredient(ingredient="beef", quantity="4", unit="cup"),
                ],
                skillet_position="tilt forward to pool the oil",
                tilt_angle_degrees=15,
                temperature_f=450,
                time_minutes=20,
                technique="high-heat sear",
                circuit_role="source",
                reaction_note="High current — fast browning drives the circuit.",
                sensory_cues=["deep brown crust"],
            ),
            schemas.TiltSkilletStage(
                step_number=2,
                name="Braise the bulk",
                instruction="Level the pan, add stock, and braise low and slow.",
                add_to_skillet=[
                    schemas.TiltSkilletStageIngredient(ingredient="stock", quantity="6", unit="cup"),
                ],
                skillet_position="level for the braise",
                tilt_angle_degrees=0,
                temperature_f=300,
                time_minutes=120,
                technique="slow braise",
                circuit_role="load",
                reaction_note="The load absorbs the energy banked by the source.",
                sensory_cues=["fork tender"],
            ),
        ],
        elementalBalance=schemas.ElementalBalance(fire=30, earth=35, water=30, air=5),
        circuit_summary=schemas.TiltSkilletCircuitSummary(
            total_voltage=-0.8,
            total_current=-0.5,
            total_resistance=1.2,
            total_power=0.4,
            efficiency=0.82,
            kalchm=108.0,
            monica=0.12,
            narrative="Energy flows from the searing source into the braising load.",
        ),
        alignment_notes=["Mars searing drive", "Saturn slow braise"],
        finishing_and_serving=schemas.FinishingAndServing(
            garnish_and_plating="Scatter parsley.",
            doneness_cues="Fork slides in cleanly.",
            serving_suggestions="Serve over rice or polenta.",
        ),
        leftovers_and_storage=schemas.LeftoversAndStorage(
            can_store=True,
            storage_instructions="Refrigerate in the braising liquid.",
            storage_lifespan_days=4,
        ),
    )


def test_tilt_skillet_plan_route_returns_valid_plan(monkeypatch):
    captured = {}

    async def fake_generate(request, tier, anthropic_model):
        captured["tier"] = tier
        captured["stages"] = len(request.stages)
        captured["hasCircuit"] = request.circuitContext is not None
        return _canned_plan()

    monkeypatch.setattr(tilt_skillet_generation, "generate_tilt_skillet_plan", fake_generate)
    monkeypatch.setattr(main, "emit_feed_event", lambda *a, **k: None)

    response = client.post(
        "/api/tilt-skillet-plan",
        json={
            "prompt": "Big-batch beef braise for the week",
            "batchServings": 20,
            "cuisine": "French",
            "tier": "premium",
            "stages": [
                {"name": "Sear", "ingredients": [{"name": "beef", "amount": 4, "unit": "cup"}]},
                {"name": "Braise", "ingredients": [{"name": "stock", "amount": 6, "unit": "cup"}]},
            ],
            "circuitContext": {"series": {"totalPotential": -0.8, "seriesCurrent": -0.5}},
        },
    )

    assert response.status_code == 200, response.text
    data = response.json()
    assert data["title"]
    assert len(data["stages"]) >= 1
    assert "circuit_summary" in data
    assert data["circuit_summary"]["efficiency"] == 0.82
    assert data["circuit_summary"]["kalchm"] == 108.0
    roles = {stage["circuit_role"] for stage in data["stages"]}
    assert "source" in roles
    # default planner tier is "primary" (a good model for a premium surface)
    assert captured["tier"] == "primary"
    assert captured["stages"] == 2
    assert captured["hasCircuit"] is True
