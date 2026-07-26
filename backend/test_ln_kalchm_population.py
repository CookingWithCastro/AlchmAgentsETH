"""Why AAE applies no near-equilibrium Monica band.

Monica is ``-energy / (reactivity * ln K)``, so it diverges as ``|ln K| -> 0``.
The sibling WTEN repo guards this with a band, derived as the MIDPOINT OF A
MEASURED BIMODAL GAP: a cluster of degenerate values, a gap, then the healthy
values. Their own measurement script states the precondition plainly — if there
is no gap, the band cannot be derived that way and any epsilon is a threshold on
a continuum.

This module IS that measurement, run on AAE's own population and its own engine
rather than transcribing WTEN's constant. It shows AAE has NO such gap: the
smallest non-zero ``|ln K|`` COLLAPSES as bodies are added, so the distribution
is a continuum and no band is derivable here.

The consequence is a design decision these tests pin: near-equilibrium values
are NOT swallowed by a threshold. They are only reachable from PARTIAL charts,
which ``backend/main.py:_require_complete_chart`` now rejects at the API
boundary. Complete charts — the only kind this server generates — never come
near equilibrium at all.

If these numbers move, the no-band decision must be revisited rather than the
expectations quietly updated.
"""

import itertools
import math
import random
from datetime import datetime

import pytest

import utils

SIGNS = [
    "aries",
    "taurus",
    "gemini",
    "cancer",
    "leo",
    "virgo",
    "libra",
    "scorpio",
    "sagittarius",
    "capricorn",
    "aquarius",
    "pisces",
]
BODIES = [
    "Sun",
    "Moon",
    "Mercury",
    "Venus",
    "Mars",
    "Jupiter",
    "Saturn",
    "Uranus",
    "Neptune",
    "Pluto",
    "Ascendant",
]
# Sect is part of the population: the same placement alchemizes differently by
# day and by night, so both are enumerated rather than one being assumed.
DIURNAL = datetime(2026, 5, 21, 8, 0)
NOCTURNAL = datetime(2026, 5, 21, 20, 0)
SECTS = [DIURNAL, NOCTURNAL]


def _kalchm(bodies, signs, dt):
    positions = {
        body: {"sign": sign, "degree": 15, "minute": 0, "exactLongitude": 0.0}
        for body, sign in zip(bodies, signs)
    }
    return utils.alchemize(positions, None, dt)["kalchm"]


def _census(n_bodies):
    """Exhaustive census over every n-body placement. Not a sample."""
    values = []
    for combo in itertools.combinations(BODIES, n_bodies):
        for signs in itertools.product(SIGNS, repeat=n_bodies):
            for dt in SECTS:
                values.append(_kalchm(list(combo), list(signs), dt))
    return values


def _abs_ln(values):
    return [abs(math.log(v)) for v in values if v > 0.0]


def _smallest_non_zero(values):
    non_zero = sorted(x for x in _abs_ln(values) if x > 0.0)
    assert non_zero, "population produced no non-zero |ln K| at all"
    return non_zero[0]


# Exhaustive censuses. Sizes are C(11, n) * 12**n * 2 sects.
@pytest.mark.parametrize(
    ("n_bodies", "expected_size", "expected_exact_zero", "expected_smallest"),
    [
        (1, 264, 216, 0.09564719034165112),
        (2, 15840, 6912, 0.00419218084488104),
        (3, 570240, 124416, 3.224550784574684e-05),
    ],
)
def test_partial_chart_census(
    n_bodies, expected_size, expected_exact_zero, expected_smallest
):
    values = _census(n_bodies)
    assert len(values) == expected_size

    abs_ln = _abs_ln(values)
    assert len(abs_ln) == expected_size, "every Kalchm must be positive"
    assert sum(1 for x in abs_ln if x == 0.0) == expected_exact_zero
    assert _smallest_non_zero(values) == expected_smallest


def test_the_gap_collapses_so_no_band_is_derivable():
    """The load-bearing result.

    A derivable band needs the degenerate cluster and the healthy values to stay
    SEPARATED, so that a midpoint means something. Here the separation shrinks by
    roughly an order of magnitude per body added and is heading to zero, which is
    a continuum. Any epsilon chosen from it would be an arbitrary cut, and it
    would also swallow legitimate results: WTEN's own constant sits above every
    one of the three-body values measured here.
    """
    smallest = [_smallest_non_zero(_census(n)) for n in (1, 2, 3)]

    assert smallest[0] > smallest[1] > smallest[2], (
        f"gap did not collapse: {smallest}. If it has become bimodal and STAYS "
        "separated as bodies are added, a band may now be derivable and the "
        "no-band decision should be revisited."
    )
    # Each step closes the gap by at least an order of magnitude.
    assert smallest[0] / smallest[1] > 10
    assert smallest[1] / smallest[2] > 10

    # WTEN's published constant, for contrast only — never adopted here.
    wten_constant = 0.10939293407637272
    three_body = _abs_ln(_census(3))
    swallowed = sum(1 for x in three_body if 0.0 < x < wten_constant)
    assert swallowed == 26882, (
        "WTEN's band would discard this many legitimate three-body results, "
        "which is why it is not transcribed into this repo"
    )


def test_complete_charts_never_approach_equilibrium():
    """The reason a band is unnecessary rather than merely underivable.

    Every chart this server generates carries all eleven bodies, and no such
    chart lands anywhere near the singularity. Near-equilibrium Monica is
    reachable only by supplying a PARTIAL chart, which is now rejected at the
    boundary — see backend/main.py:_require_complete_chart.
    """
    rng = random.Random(20260726)
    values = [
        _kalchm(BODIES, [rng.choice(SIGNS) for _ in BODIES], rng.choice(SECTS))
        for _ in range(20000)
    ]
    abs_ln = _abs_ln(values)
    assert len(abs_ln) == len(values)

    assert not [x for x in abs_ln if x == 0.0], "a complete chart was degenerate"
    # Bounded well clear of the singularity. Sampled, so asserted as a bound
    # rather than an exact minimum — an exact value here would be seed-dependent.
    assert min(abs_ln) > 2.0
