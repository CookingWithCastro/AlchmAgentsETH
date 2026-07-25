import math

import pytest

from thermodynamics import (
    KALCHM_EQUILIBRIUM,
    MONICA_EQUILIBRIUM,
    calculate_kalchm,
    calculate_monica,
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
