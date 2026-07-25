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
    """Return thermodynamic Monica, or None when its inputs are invalid."""
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
