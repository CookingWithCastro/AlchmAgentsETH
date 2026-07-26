"""Canonical Python thermodynamic constants.

BASIS: DERIVED from the same equations and cross-runtime golden vectors as
``lib/thermodynamics/kalchm.ts``. Keep this runtime adapter behaviorally exact;
``backend/test_thermodynamics.py`` pins the shared vectors.
"""

import math

KALCHM_EQUILIBRIUM = 1.0
MONICA_EQUILIBRIUM = 1.618


def _non_negative(value: float) -> float:
    return value if value > 0.0 else 0.0


def _denominator_or_1(denominator: float) -> float:
    """AAE's denominator convention: a zero denominator falls back to 1.

    Deliberately NOT WTEN's THERMO_DEN_FLOOR of 0.01. The two differ by 100x
    for a non-zero numerator over a zero denominator, so this must not be
    changed in one runtime alone. Mirrors ``denominatorOr1`` in
    ``lib/thermodynamics/kalchm.ts`` and ``or1`` in the Rust engine.
    """
    return denominator if denominator > 0.0 else 1.0


def calculate_thermodynamics(
    spirit: float,
    essence: float,
    matter: float,
    substance: float,
    fire: float,
    water: float,
    air: float,
    earth: float,
) -> dict[str, float]:
    """Return the four canonical thermodynamic quantities.

    BASIS: DERIVED. Each is a sum of squares over a SQUARED SUM of axes::

        Heat        = (S^2 + Fire^2)                       / (Su + E + M + W + A + Ea)^2
        Entropy     = (S^2 + Su^2 + Fire^2 + Air^2)        / (E + M + Ea + W)^2
        Reactivity  = (S^2 + Su^2 + E^2 + Fire^2 + Air^2 + W^2) / (M + Ea)^2
        GregsEnergy = Heat - Entropy * Reactivity

    Every denominator is a PARENTHESISED SUM, THEN SQUARED. Writing any of them
    as ``num / term + other ** 2`` moves a term out of the denominator and
    re-adds it; the forms coincide only at isolated points (reactivity's agree
    only when Earth = 0 and Matter = 1), so the defect hides wherever a test
    happens to sit on the coincidence. ``backend/utils.py`` carried exactly that
    error for reactivity, which is why all four now live here.
    """
    heat = (spirit**2 + fire**2) / _denominator_or_1(
        (substance + essence + matter + water + air + earth) ** 2
    )
    entropy = (spirit**2 + substance**2 + fire**2 + air**2) / _denominator_or_1(
        (essence + matter + earth + water) ** 2
    )
    reactivity = (
        spirit**2 + substance**2 + essence**2 + fire**2 + air**2 + water**2
    ) / _denominator_or_1((matter + earth) ** 2)

    return {
        "heat": heat,
        "entropy": entropy,
        "reactivity": reactivity,
        "gregs_energy": heat - entropy * reactivity,
    }


def calculate_kalchm(
    spirit: float,
    essence: float,
    matter: float,
    substance: float,
) -> float:
    """Return (S^S * E^E) / (M^M * Su^Su), with exact zero axes."""
    safe_spirit = _non_negative(spirit)
    safe_essence = _non_negative(essence)
    safe_matter = _non_negative(matter)
    safe_substance = _non_negative(substance)

    try:
        numerator = (safe_spirit**safe_spirit) * (safe_essence**safe_essence)
        denominator = (safe_matter**safe_matter) * (
            safe_substance**safe_substance
        )
        kalchm = numerator / denominator
    except (OverflowError, ZeroDivisionError):
        return KALCHM_EQUILIBRIUM

    return (
        kalchm
        if math.isfinite(kalchm) and kalchm > 0.0
        else KALCHM_EQUILIBRIUM
    )


def calculate_monica(
    energy: float, reactivity: float, kalchm: float
) -> float | None:
    """Return thermodynamic Monica, or None when its inputs are invalid.

    NO near-equilibrium band is applied, and that is a MEASURED result rather
    than an assertion — see the full derivation in the ``calculateMonica``
    docstring of ``lib/thermodynamics/kalchm.ts``. Briefly: WTEN derives its
    band as the midpoint of a bimodal gap, and AAE's population has no such
    gap. Measured on this engine, the smallest non-zero ``|ln K|`` collapses as
    bodies are added (1 body 0.0956 -> 2 bodies 0.00419 -> 3 bodies 3.22e-05),
    which is a continuum, not two clusters. Complete charts — the only kind
    this server generates — never approach equilibrium. Near-singular values
    are reachable only from PARTIAL charts, so they are rejected at the
    boundary by ``backend/main.py:_require_complete_chart`` rather than by
    adding a threshold this population does not support.

    The census is committed as ``backend/test_ln_kalchm_population.py``, so
    these figures are reproducible and fail loudly if the population moves.
    """
    if (
        not math.isfinite(energy)
        or not math.isfinite(reactivity)
        or not math.isfinite(kalchm)
        or kalchm <= 0.0
    ):
        return None

    ln_kalchm = math.log(kalchm)
    if ln_kalchm == 0.0:
        return MONICA_EQUILIBRIUM
    if reactivity == 0.0:
        return None

    try:
        monica = -energy / (reactivity * ln_kalchm)
    except ZeroDivisionError:
        return None
    return monica if math.isfinite(monica) else None
