"""Generate golden values from THIS repo's AUTHORITATIVE Python implementation.

Run with any Python 3.10+:  python3 pa-rust-backend/tests/fixtures/golden_gen.py

Imports the real `backend/utils.py` for the alchemical engine and
`backend/thermodynamics.py` for the canonical thermodynamic block, and copies the
position model verbatim from `main.py` (which can't be imported directly because
its module-level code requires a live database). The copied constants/formula are
a byte-for-byte transcription of `main.py:_planetary_positions_for`,
`_elemental_scores`, and `_request_datetime` as of the migration.

Every path below is derived from this file's own location. This generator used to
hardcode a SIBLING CHECKOUT (`~/Desktop/planetary_agents-main/backend`) as its
import root and write `golden.json` back into that other repo's tree, so
`tests/golden.rs` was green while pinning values produced by a different
codebase. Never reintroduce an absolute home path here.
"""

import json
import math
import sys
from datetime import datetime, timedelta
from pathlib import Path

FIXTURES_DIR = Path(__file__).resolve().parent
# fixtures -> tests -> pa-rust-backend -> repo root
REPO_ROOT = FIXTURES_DIR.parents[2]
BACKEND_DIR = REPO_ROOT / "backend"

sys.path.insert(0, str(BACKEND_DIR))
import thermodynamics  # noqa: E402
import utils  # noqa: E402

# --- verbatim copy from main.py ---
ZODIAC_SIGNS = [
    "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
    "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces",
]
PLANETARY_PERIODS_DAYS = {
    "Sun": 365.25, "Moon": 27.321661, "Mercury": 87.969, "Venus": 224.701,
    "Mars": 686.98, "Jupiter": 4332.59, "Saturn": 10759.22, "Uranus": 30685.4,
    "Neptune": 60189.0, "Pluto": 90560.0,
}
PLANETARY_OFFSETS = {
    "Sun": 28.0, "Moon": 91.0, "Mercury": 74.0, "Venus": 132.0, "Mars": 201.0,
    "Jupiter": 16.0, "Saturn": 301.0, "Uranus": 64.0, "Neptune": 359.0, "Pluto": 277.0,
}


def _planetary_positions_for(dt):
    epoch = datetime(2000, 1, 1, 12, 0)
    elapsed_days = (dt - epoch).total_seconds() / 86400
    positions = {}
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


def _elemental_scores(dt):
    day_angle = ((dt.timetuple().tm_yday / 365.25) * math.tau) % math.tau
    hour_angle = ((dt.hour + dt.minute / 60) / 24 * math.tau) % math.tau
    return {
        "spirit_score": round(3.5 + 1.5 * (1 + math.sin(day_angle)), 4),
        "essence_score": round(3.5 + 1.5 * (1 + math.cos(hour_angle)), 4),
        "matter_score": round(3.5 + 1.5 * (1 + math.cos(day_angle)), 4),
        "substance_score": round(3.5 + 1.5 * (1 + math.sin(hour_angle)), 4),
    }


# --- fixed test moment ---
DT = datetime(2026, 6, 8, 14, 30, 0)
PREV = DT - timedelta(days=1)

# `calculate_kinetics` internally calls `alchemize()` WITHOUT a datetime, so it
# reads `datetime.utcnow()` for the diurnal/sect determination — making its output
# depend on the wall-clock hour at generation time. Freeze `is_sect_diurnal` to the
# target moment so the golden value is reproducible and matches the dt-explicit Rust
# port (which threads `dt` through to the inner alchemize calls). All direct
# alchemize calls below already pass DT (diurnal at 14:30), so this changes nothing
# for them and only makes the kinetics value deterministic.
_DIURNAL = 6 <= DT.hour < 18
utils.is_sect_diurnal = lambda _dt, _d=_DIURNAL: _d

def _assert_canonical_thermodynamics(result, detailed):
    """Refuse to write a fixture whose thermodynamics didn't come from the engine.

    `golden.json` is what `tests/golden.rs` treats as authoritative, so a call-site
    transcription of Heat/Entropy/Reactivity/GregsEnergy must never reach it — that
    is precisely how the buggy reactivity (`num / Matter + Earth**2`, which moves
    Earth out of the squared denominator) stayed green for as long as it did. The
    element totals are summed from the engine's OWN per-planet breakdown so nothing
    here re-derives the element model.
    """
    esms = result["esms"]
    totals = {"Fire": 0.0, "Water": 0.0, "Air": 0.0, "Earth": 0.0}
    for planet in detailed["perPlanet"].values():
        for element in totals:
            totals[element] += planet["elements"][element]

    thermo = thermodynamics.calculate_thermodynamics(
        esms["Spirit"], esms["Essence"], esms["Matter"], esms["Substance"],
        totals["Fire"], totals["Water"], totals["Air"], totals["Earth"],
    )
    expected = {
        "heat": thermo["heat"],
        "entropy": thermo["entropy"],
        "reactivity": thermo["reactivity"],
        "gregsEnergy": thermo["gregs_energy"],
    }
    expected["monica"] = thermodynamics.calculate_monica(
        thermo["gregs_energy"], thermo["reactivity"], result["kalchm"]
    )

    for key, want in expected.items():
        got = result["monica"] if key == "monica" else result["thermodynamicProperties"][key]
        if got != want:
            raise SystemExit(
                f"{BACKEND_DIR / 'utils.py'}:alchemize produced {key}={got!r}, but "
                f"{BACKEND_DIR / 'thermodynamics.py'} gives {want!r}. Refusing to "
                "pin a non-canonical value as golden."
            )


positions = _planetary_positions_for(DT)
prev_positions = _planetary_positions_for(PREV)

golden = {
    "dt": DT.isoformat(),
    "prev_dt": PREV.isoformat(),
    "positions": positions,
    "elemental_scores": _elemental_scores(DT),
    "alchemize": utils.alchemize(positions, prev_positions, DT),
    "alchemize_detailed": utils.alchemize_detailed(positions, prev_positions, DT),
    "aspects": utils.calculate_aspects(positions),
    "aspect_efficiency": utils.calculate_aspect_efficiency(positions),
    "aggregate": utils.aggregate_alchemical_properties(positions),
    "modifiers_sun": utils.get_planetary_modifiers("Sun"),
    "kinetics": utils.calculate_kinetics(positions, prev_positions, 3600.0, "Sun"),
    "monica_constant_samples": {
        "1_2_3_4": utils.calculate_monica_constant(1.0, 2.0, 3.0, 4.0),
        "0_0_0_0": utils.calculate_monica_constant(0.0, 0.0, 0.0, 0.0),
    },
    "consciousness_levels": {
        str(v): utils.get_consciousness_level(v)
        for v in [0.0, 1.5, 2.5, 3.5, 4.5, 5.5, 6.0, 7.0]
    },
    "normalize_alchm_weight_sun": utils.normalize_alchm_weight(1.0),
    "normalize_planet_weight_sun": utils.normalize_planet_weight(333000),
}

_assert_canonical_thermodynamics(golden["alchemize"], golden["alchemize_detailed"])

out_path = FIXTURES_DIR / "golden.json"
with open(out_path, "w") as f:
    json.dump(golden, f, indent=2, sort_keys=False)
    f.write("\n")
print(f"wrote {out_path}")
print("engine:", BACKEND_DIR)
print("Sun:", positions["Sun"])
print("heat:", golden["alchemize"]["thermodynamicProperties"]["heat"])
print("entropy:", golden["alchemize"]["thermodynamicProperties"]["entropy"])
print("reactivity:", golden["alchemize"]["thermodynamicProperties"]["reactivity"])
print("gregsEnergy:", golden["alchemize"]["thermodynamicProperties"]["gregsEnergy"])
print("monica:", golden["alchemize"]["monica"])
print("kalchm:", golden["alchemize"]["kalchm"])
print("aspect count:", len(golden["aspects"]["aspects"]))
