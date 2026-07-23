# Astrological context card: accuracy and consistency audit

## Scope and standard

This audit checks the card generated for a birth in New York on **1995-06-21 at
10:17 local time** and a current-sky moment of **2026-07-23 at 11:32 EDT**.
Astronomical quantities were checked as geocentric, apparent, tropical
ecliptic-of-date longitudes against NASA/JPL Horizons. Horizons describes
observer quantity 31 as observer-centered apparent ecliptic-of-date longitude
and latitude, including light-time, gravitational deflection, and stellar
aberration. Its API accepts explicit targets, centers, UTC times, and observer
quantities ([Horizons manual](https://ssd.jpl.nasa.gov/horizons/manual.html),
[Horizons API documentation](https://ssd-api.jpl.nasa.gov/doc/horizons.html)).

Astrological interpretations, dignities, the alchm layer, and the Sacred 7
scores are not scientifically testable astronomical claims. They can be
audited for disclosed formulas, reproducibility, and internal consistency, but
not empirically “fact-checked” as physical effects.

## Executive finding

The card is **not safe to describe as a complete natal chart or a reliable
transit report**. Most natal planet signs are broadly right, and several natal
aspect geometries are close, but the report has a timezone defect, no usable
Ascendant or houses, impossible element/modality summaries, and a transit
aspect list that appears to compare degree-within-sign while ignoring zodiac
sign/absolute longitude. The Moon phase name and planetary hour are correct;
the reported lunar illumination and “Mercury in Leo” are not.

## Natal chart findings

New York was on daylight time on 1995-06-21, so 10:17 local civil time is
**14:17 UTC**, not 10:17 UTC. At 14:17 UTC, JPL gives these approximate
longitudes:

| Body    | JPL longitude | Tropical placement | Card              | Result                               |
| ------- | ------------: | ------------------ | ----------------- | ------------------------------------ |
| Sun     |       89.750° | 29°45′ Gemini      | 29°00′ Gemini     | Sign right; precision/rounding wrong |
| Moon    |       19.191° | 19°11′ Aries       | 17°00′ Aries      | **Wrong by 2°11′**                   |
| Mercury |       70.523° | 10°31′ Gemini      | 10°00′ Gemini     | Coarsely truncated                   |
| Venus   |       73.293° | 13°18′ Gemini      | 13°00′ Gemini     | Coarsely truncated                   |
| Mars    |      163.283° | 13°17′ Virgo       | 13°00′ Virgo      | Coarsely truncated                   |
| Jupiter |      248.066° | 8°04′ Sagittarius  | 8°00′ Sagittarius | Close                                |
| Saturn  |      354.570° | 24°34′ Pisces      | 24°00′ Pisces     | Coarsely truncated                   |
| Uranus  |      299.630° | 29°38′ Capricorn   | 29°00′ Capricorn  | Coarsely truncated                   |
| Neptune |      294.827° | 24°50′ Capricorn   | 24°00′ Capricorn  | Coarsely truncated                   |
| Pluto   |      238.402° | 28°24′ Scorpio     | 28°00′ Scorpio    | Coarsely truncated                   |

The Moon identifies the likely failure precisely: JPL gives **17.140° Aries at
10:17 UTC**, essentially the card's 17° value. This strongly indicates the
pipeline parsed `10:17` as UTC and discarded New York's EDT offset. The empty
timezone parentheses in `Born: June 21, 1995, 10:17 ()` reinforce that
diagnosis.

Consequences:

- The Rising/Ascendant is blank.
- Every planet is assigned to house `0`, which is not a valid house number in a
  twelve-house chart.
- The card calls itself an Equal-house chart but supplies neither an Ascendant
  nor house cusps, so no house placement can be substantiated.
- The Midheaven is time-sensitive and should be regenerated after fixing the
  timezone rather than trusted as 18°27′ Pisces.
- The opening instruction's example, “your Moon–Pluto conjunction in the 4th,”
  is not true for this chart and risks prompting a model to hallucinate that
  configuration.

### Natal aspects

Several listed aspect orbs are consistent with the correctly timed longitudes:
Venus–Mars square (~0.01°), Saturn–Neptune sextile (~0.26°),
Uranus–Pluto sextile (~1.23°), Mercury–Jupiter opposition (~2.46°), and
Uranus–Neptune conjunction (~4.80°). This suggests the basic angular-distance
calculation works for planets that move little over four hours.

However:

- Moon–Venus is about **54.10° apart**, so it is not a sextile with a 4.1° orb;
  it is about 5.9° from exact. Its listed value inherits the timezone-wrong
  Moon.
- Mercury–Venus is about 2.77°, not 2.6°, showing that displayed whole-degree
  placements and aspect calculations come from inconsistent precision.
- Marking **every aspect “separating”** is not credible. For example,
  Mercury was closing on both Venus and its opposition to Jupiter, and the Moon
  was moving toward its Venus sextile. Applying/separating must use relative
  longitudinal velocity, not a constant label.

## Current sky and transit findings

11:32 EDT on 2026-07-23 is **15:32 UTC**. JPL gives:

| Body    | JPL longitude | Tropical placement |
| ------- | ------------: | ------------------ |
| Sun     |      120.808° | 0°48′ Leo          |
| Moon    |      235.233° | 25°14′ Scorpio     |
| Mercury |      106.321° | 16°19′ Cancer      |
| Venus   |      165.241° | 15°14′ Virgo       |
| Mars    |       77.383° | 17°23′ Gemini      |
| Jupiter |      125.112° | 5°07′ Leo          |
| Saturn  |       14.741° | 14°44′ Aries       |
| Uranus  |       64.714° | 4°43′ Gemini       |
| Neptune |        4.348° | 4°21′ Aries        |
| Pluto   |      304.371° | 4°22′ Aquarius     |

Therefore, **“Sky ruler: Mercury in leo” is false**. Mercury is in Cancer; the
Sun and Jupiter are in Leo.

The transit list is geometrically invalid. Representative examples:

- Mars at 17° Gemini is not conjunct the natal Moon at 19° Aries (or the
  erroneous 17° Aries); the bodies are roughly a sextile apart.
- The Moon at 25° Scorpio cannot simultaneously conjunct natal Saturn at 24°
  Pisces and natal Neptune at 24° Capricorn.
- Saturn at 14° Aries is not conjunct natal Venus at 13° Gemini or natal Mars
  at 13° Virgo.
- Venus at 15° Virgo is not conjunct natal Moon in Aries or natal Venus in
  Gemini, though it is close to natal Mars in Virgo.
- Mercury at 16° Cancer is not conjunct natal Moon in Aries or natal Venus in
  Gemini.
- Jupiter, the Sun, Uranus, Neptune, and Pluto cannot all be quincunx the natal
  North Node merely because their degree-within-sign is nearby.

This pattern is diagnostic: the generator appears to calculate transit aspects
from **degrees within each sign (0–30)** instead of absolute zodiac longitude
(0–360), or it loses the sign before comparison. That is the report's most
serious computational defect.

## Moon phase and planetary hour

The U.S. Naval Observatory reports for New York on 2026-07-23:
sunrise **05:45**, sunset **20:20**, and a **Waxing Gibbous Moon with 71%
illumination**; the nearest primary phase was first quarter on July 21 at
07:05 UT
([USNO one-day Sun/Moon data](https://aa.usno.navy.mil/calculated/rstt/oneday?date=2026-07-23&dst=true&label=New%20York&lat=40.7128&lon=-74.0060&submit=Get%20Data&tz=-5.00&tz_label=false&tz_sign=1)).
JPL's Sun–Moon longitude separation is about 114.43°, also consistent with a
waxing gibbous Moon near 71%, not 60%.

- **Waxing Gibbous:** correct.
- **60% illumination:** wrong by about 11 percentage points.
- **Mercury planetary hour:** correct under the traditional unequal-hour
  convention. Dividing 05:45–20:20 into 12 gives ~72.9-minute hours; 11:32
  falls in the fifth daytime hour (~10:37–11:50). July 23, 2026 is Thursday,
  whose sequence begins Jupiter, Mars, Sun, Venus, Mercury.

The pipeline should retain the convention and the sunrise/sunset basis in the
output because “planetary hour” is not a standard civil hour. NOAA documents
that sunrise/sunset calculations should include the solar disk and approximate
refraction (zenith 90.833°), and estimates minute-level theoretical accuracy at
New York's latitude
([NOAA calculation details](https://gml.noaa.gov/grad/solcalc/calcdetails.html),
[NOAA equations](https://gml.noaa.gov/grad/solcalc/solareqns.PDF)).

## Internal consistency failures

- Synopsis says Fire dominates over Water, while the ten-planet elemental tally
  is `Fire 0 · Earth 0 · Air 0 · Water 0`.
- The listed planets themselves yield nonzero counts (at minimum Gemini =
  Air, Aries/Sagittarius = Fire, Virgo/Capricorn = Earth, Pisces/Scorpio =
  Water), so both the zero tally and the weighted 0% balance are impossible.
- Modality is called Cardinal-dominant while all modality counts are zero.
- “Spirit runs highest” conflicts with ESMS values all being zero.
- `Kalchm 1` with every apparent input zero needs a disclosed formula or should
  be marked unavailable, not presented as meaningful precision.
- A# is 0.57 and Sacred/Planetary scores are nonzero while upstream alchm
  quantities are all zero. Without provenance/formula metadata, this is neither
  reproducible nor internally explainable.
- The report says “COMPLETE natal chart” and instructs use of house cusps and a
  full aspect grid, yet provides no cusps, no Ascendant, house `0`, only major
  aspects, and no aspect-grid matrix.
- The current-sky moment omits the year and timezone, making the transit data
  non-reproducible from the report alone.
- Sign casing and missing-value formatting are inconsistent (`gemini` vs
  `Pisces`; blank sign rendered as `— —`).

## Recommended generation-pipeline changes

1. **Make time resolution a hard gate.** Store local civil time, IANA zone
   (`America/New_York`), resolved UTC offset (`-04:00`), DST status, UTC instant,
   coordinates, and timezone-source/version. If timezone resolution fails, do
   not calculate angles, houses, Moon, or fast transits.
2. **Use one canonical longitude representation.** Carry every body as
   `longitudeDeg: number` in `[0,360)`; derive sign and degree only for display.
   Compute aspects exclusively from normalized absolute angular separation:
   `min(abs(a-b), 360-abs(a-b))`.
3. **Preserve precision.** Calculate at full precision, round only in the
   serializer, and use the same source values for placements and aspect orbs.
   Display at least arcminutes if orbs are shown to tenths of a degree.
4. **Calculate applying/separating from signed relative speed.** Unit-test
   conjunction/opposition wraparound at 0° Aries and distinguish applying from
   separating by whether the distance to exactitude is shrinking.
5. **Add ephemeris provenance per report.** Include engine/data release,
   coordinate frame, apparent vs geometric, geocentric vs topocentric, zodiac,
   house system, UTC instant, and calculation status (`live`, `fallback`,
   `unavailable`). Do not label Moshier output as DE431/DE441.
6. **Eliminate silent zero fallbacks.** Missing computation should serialize as
   `null`/“Unavailable,” never as a meaningful zero. Suppress synthesis claims
   when prerequisite values are unavailable.
7. **Add invariants before serialization.** Reject a report if any house is
   outside 1–12, the Ascendant is absent while houses are present, element
   counts do not sum to 10, percentages do not sum near 100, nodes are not
   opposite within tolerance, or an aspect's recomputed separation disagrees
   with its label/orb.
8. **Cross-check current-sky products.** Moon phase name and illumination must
   come from the same Sun/Moon vectors. Planetary hour must use location-aware
   sunrise/sunset and emit its interval. “Ruler in sign” must be derived from
   the actual ruler longitude, not copied from another body.
9. **Build fixed regression fixtures.** Include this birth and transit instant,
   DST boundaries, leap day, locations on both sides of the date line, and
   aspect wraparound. Compare positions against frozen JPL Horizons/Swiss
   Ephemeris reference values with explicit tolerances.
10. **Separate astronomy from interpretation.** Emit a validated structured
    astronomy payload first; only then produce narrative/alchm synthesis.
    Proprietary metrics should include formula/version/input provenance and a
    clear “interpretive, not astronomical” label.

## Recommended report changes

- Replace “COMPLETE” with a completeness status and validation badge.
- Show birth time as `1995-06-21 10:17 EDT (UTC−04:00) / 14:17 UTC`.
- Show the current moment as `2026-07-23 11:32 EDT / 15:32 UTC`.
- Add a compact provenance/assumptions block near the top.
- Omit every section whose inputs failed instead of filling it with zeros or
  house `0`.
- Add an “astronomical data” / “interpretive layer” boundary and confidence
  labels.
- Remove fabricated examples from LLM instructions; generate examples only
  from validated factors actually present in the chart.
- Include exact transit and natal positions alongside each aspect so a reader
  can audit it, e.g. `t Venus 15°14′ Virgo ☌ n Mars 13°17′ Virgo (orb 1°58′)`.
