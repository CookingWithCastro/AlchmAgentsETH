import json
import math
import pathlib

import pytest

from thermodynamics import (
    KALCHM_EQUILIBRIUM,
    MONICA_EQUILIBRIUM,
    calculate_kalchm,
    calculate_monica,
    calculate_thermodynamics,
)


@pytest.mark.parametrize(
    ("axes", "expected"),
    [
        ((0.3, 0.6, 0.7, 0.4), 0.949805110713276),
        ((0.3, 0.6, 0.7, 0.0), 0.6583525144933101),
        ((0.3, 0.6, 0.0, 0.0), 0.5128934190374708),
        ((0.3, 0.6, -0.5, 0.4), 0.7399512873857882),
        ((0.0, 0.0, 0.0, 0.0), KALCHM_EQUILIBRIUM),
    ],
)
def test_calculate_kalchm_matches_cross_runtime_vectors(axes, expected):
    assert calculate_kalchm(*axes) == expected


def test_calculate_kalchm_is_total_for_non_finite_input():
    assert calculate_kalchm(math.nan, math.inf, 1.0, 1.0) == KALCHM_EQUILIBRIUM


def test_calculate_monica_preserves_the_raw_formula_sign():
    assert calculate_monica(2.0, 0.5, math.e) == -4.0


@pytest.mark.parametrize(
    ("energy", "reactivity", "kalchm"),
    [
        (2.0, 0.0, math.e),
        (2.0, 0.5, 0.0),
        (math.nan, 0.5, math.e),
    ],
)
def test_calculate_monica_keeps_invalid_inputs_absent(energy, reactivity, kalchm):
    assert calculate_monica(energy, reactivity, kalchm) is None


def test_calculate_monica_uses_phi_only_at_exact_equilibrium():
    assert calculate_monica(2.0, 0.5, 1.0) == MONICA_EQUILIBRIUM


# --- Cross-runtime contract -------------------------------------------------
#
# The Python half of the shared contract. The TypeScript half is
# test/thermodynamics/cross-runtime-parity.test.ts, and BOTH read this same
# file, so neither transcribes the numbers and the two runtimes cannot drift
# apart without one of them going red.
#
# Do not "fix" a failure here by editing the fixture. Regenerate it with
# `bun run generate:kalchm-vectors` only when the engine changed ON PURPOSE.

_FIXTURE = json.loads(
    (
        pathlib.Path(__file__).resolve().parents[1]
        / "test"
        / "fixtures"
        / "kalchm_golden_vectors.json"
    ).read_text(encoding="utf-8")
)

# A fixture that silently became empty would make every parametrised test below
# vacuously pass, so assert at import time that there is something to check.
assert _FIXTURE["vectors"], "golden fixture has no Kalchm/Monica vectors"
assert _FIXTURE["thermoVectors"], "golden fixture has no thermodynamic vectors"


def test_shared_constants_match_the_contract():
    assert _FIXTURE["constants"]["KALCHM_EQUILIBRIUM"] == KALCHM_EQUILIBRIUM
    assert _FIXTURE["constants"]["MONICA_EQUILIBRIUM"] == MONICA_EQUILIBRIUM
    # A zero denominator falls back to 1, NOT to WTEN's 0.01 floor; the two
    # differ by 100x for a non-zero numerator, so this is behaviour, not style.
    assert _FIXTURE["constants"]["ZERO_DENOMINATOR_FALLBACK"] == 1


@pytest.mark.parametrize(
    "vector", _FIXTURE["vectors"], ids=[v["name"] for v in _FIXTURE["vectors"]]
)
def test_kalchm_and_monica_match_the_typescript_engine(vector):
    kalchm = calculate_kalchm(
        vector["spirit"], vector["essence"], vector["matter"], vector["substance"]
    )
    assert kalchm == vector["expectedKalchm"]

    monica = calculate_monica(vector["energy"], vector["reactivity"], kalchm)
    expected = vector["expectedMonica"]
    if expected is None:
        # ABSENT must stay absent — never 0, never a sentinel.
        assert monica is None
    else:
        assert monica == expected


@pytest.mark.parametrize(
    "vector",
    _FIXTURE["thermoVectors"],
    ids=[v["name"] for v in _FIXTURE["thermoVectors"]],
)
def test_thermodynamics_match_the_typescript_engine(vector):
    result = calculate_thermodynamics(
        vector["spirit"],
        vector["essence"],
        vector["matter"],
        vector["substance"],
        vector["fire"],
        vector["water"],
        vector["air"],
        vector["earth"],
    )
    assert result["heat"] == vector["expectedHeat"]
    assert result["entropy"] == vector["expectedEntropy"]
    assert result["reactivity"] == vector["expectedReactivity"]
    assert result["gregs_energy"] == vector["expectedGregsEnergy"]


def test_reactivity_is_not_the_lost_parens_form():
    """The two forms coincide only at Earth == 0 and Matter == 1.

    A suite containing only that point passes while the formula is wrong, which
    is exactly how the defect survived here and in the sibling repo.
    """
    divergent = [
        v for v in _FIXTURE["thermoVectors"] if v["earth"] != 0 and v["matter"] != 0
    ]
    assert divergent, "fixture must cover a case where the two forms disagree"

    for v in divergent:
        num = (
            v["spirit"] ** 2
            + v["substance"] ** 2
            + v["essence"] ** 2
            + v["fire"] ** 2
            + v["air"] ** 2
            + v["water"] ** 2
        )
        lost_parens = (num / v["matter"]) + v["earth"] ** 2
        assert v["expectedReactivity"] != lost_parens
