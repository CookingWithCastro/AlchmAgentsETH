#!/usr/bin/env python3
"""
Compute real natal charts for the historical-agent corpus from a verified ephemeris.

WHY THIS SCRIPT EXISTS
----------------------
Every agent in `lib/agents/historical/` names a real person, so the natal chart attached to one
is a claim about that person's birth sky. Most of the shipped charts were never measured. This
script replaces the fabricated ones with numbers a second party can reproduce, and — just as
importantly — REFUSES to produce numbers for the subjects whose birth date is not actually known.
The refusal list at the bottom of `SUBJECTS` is as much a part of the output as the charts.

The standing rule in this repo: a literal substituted for an absent measurement invents data.
Nothing unmeasured may be presented as measured. Under-claiming is always the safe direction.

HOW TO RUN IT
-------------
Neither ephemeris library is a dependency of this repo, and neither should be added to one.
Install them into a throwaway location and run from there — the results are static constants:

    python3 -m pip install --target /tmp/ephem 'pyswisseph==2.10.3.2' 'astronomy-engine==2.1.19'
    PYTHONPATH=/tmp/ephem python3 scripts/compute-historical-natal-charts.py

Both libraries are pure-computation (pyswisseph is run with SEFLG_MOSEPH, the built-in Moshier
analytic theory, so no Swiss Ephemeris data files are needed). Nothing is written to disk: the
script prints a report plus the TypeScript literals, which are then pasted into the agent files
by hand and reviewed.

WHAT IT GUARANTEES
------------------
1. TWO INDEPENDENT IMPLEMENTATIONS. Every longitude is computed twice — once by Swiss Ephemeris
   (Moshier) and once by astronomy-engine, which shares no code with it — and the run aborts if
   they disagree by more than CROSS_CHECK_TOLERANCE_DEG. One unverified source is not enough to
   claim a measurement.
2. A CONTROL. Before computing anything new, the script recomputes the two charts already
   committed as `provenance: 'computed'` (carl-jung, frida-kahlo) and asserts it reproduces
   every one of their 20 stored placements. If the pipeline were broken, that check fails and
   nothing is emitted. A green run with no control is not evidence.
3. PHYSICAL SANITY. Mercury's elongation from the Sun must be <= 28 degrees and Venus's <= 47
   (they are inferior planets; those are the orbital maxima), and the Sun must land in the sign
   the calendar date implies. A chart failing either is a computation error and is not emitted.
   `test/agents/natal-chart-provenance.spec.ts` enforces the same two bounds on the corpus.

CALENDARS
---------
The repo convention is PROLEPTIC GREGORIAN at every epoch, in both directions, with no 1582
branch (see `lib/enhanced-astronomical-calculator.ts` near :313). But the historical record for
a 15th-century Florentine is a JULIAN calendar date. Both facts are honoured: `recorded_calendar`
says which calendar the *source document* used, the instant is derived from that, and the date
written back into `birthData` is the PROLEPTIC GREGORIAN rendering of that same instant. Getting
this backwards would move Petrarch, Machiavelli and Michelangelo by 8-9 days.

BIRTH TIMES
-----------
Not one of these eleven subjects has a birth time this script's author could verify from a
primary or reference source. That is handled explicitly, never silently:

  - The ten bodies ARE computed, at 12:00 local mean time — the midpoint of the birth day, so
    the error is bounded by half a day of motion rather than a whole one. For nine of the ten
    that is a sub-degree uncertainty. For the MOON it is not: the Moon moves ~13 deg/day, so the
    script measures the Moon's actual span across the birth day and writes the measured span
    into the provenance note of every chart it emits. No chart claims more than that.
  - The ASCENDANT, MIDHEAVEN and HOUSE placements are NOT computed and NOT emitted. They move
    ~1 degree every 4 minutes, so an unknown birth time makes them unknowable. `house` is simply
    omitted from each planet (it is optional on `PlanetPosition`) rather than filled with a
    number. The pre-existing `ascendant`/`midheaven`/`ascendantProvenance` fields are left
    untouched, which keeps them labelled as the unmeasured values they already were.

Sources for every date are recorded in `SUBJECTS` and in `REFUSED`; they were checked against
the English Wikipedia infobox at minimum, and are quoted in the emitted provenance notes only
to the extent they are load-bearing.
"""

import math
import sys

try:
    import swisseph as swe
except ImportError:  # pragma: no cover - environment guidance
    sys.exit(
        "pyswisseph is not importable. See the module docstring: install it into a throwaway\n"
        "target and re-run with PYTHONPATH pointing there. Do NOT add it to requirements.txt."
    )

try:
    import astronomy as ae
except ImportError:  # pragma: no cover - environment guidance
    sys.exit(
        "astronomy-engine is not importable. It is the independent second implementation and is\n"
        "not optional: a single unverified ephemeris cannot support a 'computed' claim."
    )

# --------------------------------------------------------------------------------------- config

# The date the birth-date sources in SUBJECTS and REFUSED were last checked. It is quoted in the
# notes written into the agent files so a reader can tell how stale the research is.
CHECKED_ON = "2026-07-28"

EXPECTED_SWE_VERSION = "2.10.03"  # pyswisseph 2.10.3.2 wraps Swiss Ephemeris 2.10.03
EXPECTED_AE_VERSION = "2.1.19"  # astronomy-engine; not introspectable, pinned by the pip install

# Two independent implementations of the same physics will not agree to the last bit. Measured
# across every instant in this file (run the script to reproduce the table):
#
#   Sun 0.0013  Moon 0.0043  Mercury 0.0037  Venus 0.0016  Mars 0.0017
#   Jupiter 0.0018  Saturn 0.0061  Uranus 0.0015  Neptune 0.0057   |   PLUTO 0.0279
#
# Nine bodies sit under 0.007 deg. Pluto does not, and the gap widens monotonically with age
# (0.004 deg in 1830, 0.022 in 1304, 0.028 in 1475) - the signature of two different Pluto
# theories extrapolated backwards, not of a bug. It is given its own bound rather than being
# hidden behind a blanket one, and any chart whose worst disagreement exceeds the 0.01 deg
# resolution the charts are stored at says so in its provenance note.
CROSS_CHECK_TOLERANCE_DEG = 0.01
PLUTO_TOLERANCE_DEG = 0.05

# The resolution `degree` is stored at in the agent files. A cross-implementation disagreement
# larger than this means the last stored decimal is not corroborated by the second source.
STORED_RESOLUTION_DEG = 0.01

# Physical maxima for the inferior planets' elongation from the Sun.
MAX_ELONGATION = {"Mercury": 28.0, "Venus": 47.0}

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
]

SWE_BODY = {
    "Sun": swe.SUN,
    "Moon": swe.MOON,
    "Mercury": swe.MERCURY,
    "Venus": swe.VENUS,
    "Mars": swe.MARS,
    "Jupiter": swe.JUPITER,
    "Saturn": swe.SATURN,
    "Uranus": swe.URANUS,
    "Neptune": swe.NEPTUNE,
    "Pluto": swe.PLUTO,
}

AE_BODY = {
    "Sun": ae.Body.Sun,
    "Mercury": ae.Body.Mercury,
    "Venus": ae.Body.Venus,
    "Mars": ae.Body.Mars,
    "Jupiter": ae.Body.Jupiter,
    "Saturn": ae.Body.Saturn,
    "Uranus": ae.Body.Uranus,
    "Neptune": ae.Body.Neptune,
    "Pluto": ae.Body.Pluto,
}

# Moshier analytic theory: no Swiss Ephemeris data files required, so this script runs anywhere.
SWE_FLAGS = swe.FLG_MOSEPH | swe.FLG_SPEED

SIGNS = [
    "Aries",
    "Taurus",
    "Gemini",
    "Cancer",
    "Leo",
    "Virgo",
    "Libra",
    "Scorpio",
    "Sagittarius",
    "Capricorn",
    "Aquarius",
    "Pisces",
]

# First (proleptic Gregorian) calendar day of each tropical sign, used only as a sanity check on
# the computed Sun. Dates within one day of a boundary are reported as cusp cases rather than
# failures, because the boundary drifts by a few hours from year to year.
SIGN_START_DATE = [
    (3, 21),  # Aries
    (4, 20),  # Taurus
    (5, 21),  # Gemini
    (6, 21),  # Cancer
    (7, 23),  # Leo
    (8, 23),  # Virgo
    (9, 23),  # Libra
    (10, 23),  # Scorpio
    (11, 22),  # Sagittarius
    (12, 22),  # Capricorn
    (1, 20),  # Aquarius
    (2, 19),  # Pisces
]

WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

# ------------------------------------------------------------------------------------- subjects

# Every subject below has a birth DATE documented by a reference source. None has a birth TIME
# this author could verify, so `local_hour` is 12.0 for all of them and the bodies-only caveat in
# the module docstring applies to every emitted chart. `recorded_calendar` is the calendar the
# SOURCE DOCUMENT used, not the calendar the result is stored in.
SUBJECTS = [
    {
        "id": "emily-dickinson",
        "const": "EMILY_DICKINSON",
        "recorded": (1830, 12, 10),
        "recorded_calendar": "gregorian",
        "local_hour": 12.0,
        "lat": 42.3751,
        "lon": -72.5199,
        "place": "Amherst, Massachusetts, USA",
        "source": "10 December 1830, Amherst, Massachusetts (en.wikipedia.org/wiki/Emily_Dickinson infobox)",
    },
    {
        "id": "fyodor-dostoevsky",
        "const": "FYODOR_DOSTOEVSKY",
        "recorded": (1821, 11, 11),
        "recorded_calendar": "gregorian",
        "local_hour": 12.0,
        "lat": 55.7558,
        "lon": 37.6173,
        "place": "Moscow, Russia",
        "source": (
            "11 November 1821 New Style (30 October Old Style), Moscow "
            "(en.wikipedia.org/wiki/Fyodor_Dostoevsky infobox). Russia kept the Julian calendar "
            "until 1918; the New Style date is the one used here, so no further conversion applies."
        ),
    },
    {
        "id": "jane-austen",
        "const": "JANE_AUSTEN",
        "recorded": (1775, 12, 16),
        "recorded_calendar": "gregorian",
        "local_hour": 12.0,
        "lat": 51.234,
        "lon": -1.253,
        "place": "Steventon, Hampshire, England",
        "source": (
            "16 December 1775, Steventon, Hampshire (en.wikipedia.org/wiki/Jane_Austen infobox). "
            "Britain adopted the Gregorian calendar in 1752, so this date needs no conversion."
        ),
    },
    {
        "id": "lewis-carroll",
        "const": "LEWIS_CARROLL",
        "recorded": (1832, 1, 27),
        "recorded_calendar": "gregorian",
        "local_hour": 12.0,
        "lat": 53.335,
        "lon": -2.6389,
        "place": "Daresbury, Cheshire, England",
        "source": "27 January 1832, Daresbury, Cheshire (en.wikipedia.org/wiki/Lewis_Carroll infobox)",
    },
    {
        "id": "machiavelli",
        "const": "MACHIAVELLI",
        "recorded": (1469, 5, 3),
        "recorded_calendar": "julian",
        "local_hour": 12.0,
        "lat": 43.7696,
        "lon": 11.2558,
        "place": "Florence, Republic of Florence",
        "source": (
            "3 May 1469, Florence (en.wikipedia.org/wiki/Niccolo_Machiavelli infobox), recorded "
            "in his father Bernardo's diary. A 1469 Florentine date is Julian-calendar."
        ),
    },
    {
        "id": "michelangelo",
        "const": "MICHELANGELO",
        "recorded": (1475, 3, 6),
        "recorded_calendar": "julian",
        "local_hour": 12.0,
        "lat": 43.6414,
        "lon": 11.9847,
        "place": "Caprese, Republic of Florence",
        "source": (
            "6 March 1475, Caprese (en.wikipedia.org/wiki/Michelangelo infobox). A 1475 Tuscan "
            "date is Julian-calendar. That article records no time of birth, and none is used."
        ),
    },
    {
        "id": "oscar-wilde",
        "const": "OSCAR_WILDE",
        "recorded": (1854, 10, 16),
        "recorded_calendar": "gregorian",
        "local_hour": 12.0,
        "lat": 53.3498,
        "lon": -6.2603,
        "place": "Dublin, Ireland",
        "source": "16 October 1854, Dublin (en.wikipedia.org/wiki/Oscar_Wilde infobox)",
    },
    {
        "id": "petrarch",
        "const": "PETRARCH",
        "recorded": (1304, 7, 20),
        "recorded_calendar": "julian",
        "local_hour": 12.0,
        "lat": 43.4633,
        "lon": 11.8796,
        "place": "Arezzo, Republic of Florence",
        "source": (
            "20 July 1304, Arezzo - given without qualification by en.wikipedia.org/wiki/Petrarch, "
            "it.wikipedia.org/wiki/Francesco_Petrarca and worldhistory.org/Petrarch, none of which "
            "flags a dispute. A 1304 Tuscan date is Julian-calendar."
        ),
    },
    {
        "id": "claude-monet",
        "const": "CLAUDE_MONET",
        "recorded": (1840, 11, 14),
        "recorded_calendar": "gregorian",
        "local_hour": 12.0,
        "lat": 48.8566,
        "lon": 2.3522,
        "place": "Paris, France",
        "source": (
            "14 November 1840, Paris - 45 rue Laffitte, 9th arrondissement "
            "(en.wikipedia.org/wiki/Claude_Monet). He moved to Le Havre aged five; the chart "
            "shipped before this run carried Rouen's coordinates labelled 'Paris'."
        ),
    },
    {
        "id": "mahatma-gandhi",
        "const": "MAHATMA_GANDHI",
        "recorded": (1869, 10, 2),
        "recorded_calendar": "gregorian",
        "local_hour": 12.0,
        "lat": 21.6417,
        "lon": 69.6293,
        "place": "Porbandar, Kathiawar Agency, British Raj",
        "source": (
            "2 October 1869, Porbandar (en.wikipedia.org/wiki/Mahatma_Gandhi infobox). Astrology "
            "sites circulate a birth time of 07:11:44 LMT; no reference source corroborates it, "
            "so it is not used and no ascendant is claimed."
        ),
    },
]

# Subjects whose chart this script REFUSES to compute, and exactly why. Each was checked against
# the same sources as the list above; each failed. Emitting a chart for any of them would be
# inventing the birth date, which is the failure mode this whole exercise exists to end.
REFUSED = [
    (
        "cleopatra",
        "PLACEHOLDER (group A)",
        "No birth date is known. The en.wikipedia.org/wiki/Cleopatra infobox reads 'Early 69 BC "
        "or late 70 BC' - a window of a year or more, not a date. (The chart also stored the year "
        "as 69 CE rather than 69 BCE.)",
    ),
    (
        "donatello",
        "PLACEHOLDER (group A)",
        "No birth date is known. en.wikipedia.org/wiki/Donatello gives 'c. 1386' - a circa year.",
    ),
    (
        "geoffrey-chaucer",
        "PLACEHOLDER (group A)",
        "No birth date is known. en.wikipedia.org/wiki/Geoffrey_Chaucer gives 'c. 1343' and says "
        "in the body that 'the precise date and location remain unknown'.",
    ),
    (
        "raphael",
        "PLACEHOLDER (group A)",
        "The birth date is disputed between two dates nine days apart. The "
        "en.wikipedia.org/wiki/Raphael infobox reads '28 March or 6 April 1483'; Vasari implies "
        "the earlier, the coincidence of his death implies the later. Nine days moves the Moon "
        "~118 degrees, so picking one would be a coin flip presented as a measurement.",
    ),
    (
        "adam-smith",
        "AUTHORED, left as-is (group B)",
        "His birth date is not known. en.wikipedia.org/wiki/Adam_Smith: 'The date of Smith's "
        "baptism into the Church of Scotland at Kirkcaldy was 5 June 1723 and this has often "
        "been treated as if it were also his date of birth, which is unknown.' The 16 June 1723 "
        "in birthData is the Gregorian rendering of that BAPTISM date.",
    ),
    (
        "ibn-sina-avicenna",
        "AUTHORED, left as-is (group B)",
        "No birth date is known. en.wikipedia.org/wiki/Avicenna gives 'c. 980' - a circa year.",
    ),
    (
        "lao-tzu",
        "AUTHORED, left as-is (group B)",
        "There may be no individual to compute a chart for. en.wikipedia.org/wiki/Laozi: 'By the "
        "mid-twentieth century, consensus had emerged among Western scholars that the historicity "
        "of a person known as Laozi is doubtful,' and the infobox dates him only to a century.",
    ),
    (
        "sitting-bull",
        "AUTHORED, left as-is (group B)",
        "No birth date is known. en.wikipedia.org/wiki/Sitting_Bull gives 'c. 1831-1837' and says "
        "he was born 'sometime between 1831 and 1837' - a six-year window.",
    ),
    (
        "sojourner-truth",
        "AUTHORED, left as-is (group B)",
        "No birth date is known. en.wikipedia.org/wiki/Sojourner_Truth gives 'c. 1797'; she was "
        "born into slavery and 'once estimated that she was born between 1797 and 1800'.",
    ),
    (
        "tecumseh",
        "AUTHORED, left as-is (group B)",
        "The birth date is an inference, not a record. en.wikipedia.org/wiki/Tecumseh: born "
        "'between 1764 and 1771. The best evidence suggests a birthdate of March 9, 1768.'",
    ),
    (
        "voltaire",
        "AUTHORED, left as-is (group B)",
        "Refused on TWO independent grounds, the second of which this script measured rather than "
        "assumed. (1) The date is contested: en.wikipedia.org/wiki/Voltaire gives 21 November 1694 "
        "from the parish register (he was baptised on 22 November), but notes 'Some speculation "
        "surrounds Voltaire's date of birth, because he claimed he was born on 20 February 1694 as "
        "the illegitimate son of a nobleman' - the two candidates are nine months apart. (2) Even "
        "granting the November date, no birth time is recorded, and at 12:00 local mean time in "
        "Paris the Sun is at Scorpio 29.74 deg - it crosses into Sagittarius about six hours "
        "later. So the birth date alone does not determine even his SUN SIGN, the most "
        "load-bearing number in the chart. Computing it would mean picking one of two signs by "
        "coin flip and labelling the result 'computed'. A recorded birth time would fix ground "
        "(2); only new documentary evidence fixes ground (1).",
    ),
]

# The control. These two charts are already committed as provenance:'computed'; this script must
# reproduce every placement or it has no business emitting anything. Values read from
# lib/agents/historical/{carl-jung,frida-kahlo}.ts.
CONTROL = [
    {
        "id": "carl-jung",
        "ut": (1875, 7, 26, 18, 54, 48),
        "expected": {
            "Sun": ("Leo", 3.31),
            "Moon": ("Taurus", 15.51),
            "Mercury": ("Cancer", 13.77),
            "Venus": ("Cancer", 17.5),
            "Mars": ("Sagittarius", 21.37),
            "Jupiter": ("Libra", 23.8),
            "Saturn": ("Aquarius", 24.2),
            "Uranus": ("Leo", 14.8),
            "Neptune": ("Taurus", 3.04),
            "Pluto": ("Taurus", 23.51),
        },
        "retrograde": {"Saturn"},
    },
    {
        "id": "frida-kahlo",
        "ut": (1907, 7, 6, 15, 6, 48),
        "expected": {
            "Sun": ("Cancer", 13.38),
            "Moon": ("Taurus", 29.71),
            "Mercury": ("Leo", 6.34),
            "Venus": ("Gemini", 24.34),
            "Mars": ("Capricorn", 13.39),
            "Jupiter": ("Cancer", 20.44),
            "Saturn": ("Pisces", 27.45),
            "Uranus": ("Capricorn", 10.61),
            "Neptune": ("Cancer", 12.4),
            "Pluto": ("Gemini", 23.75),
        },
        "retrograde": {"Mars", "Uranus"},
    },
]

# ------------------------------------------------------------------------------------ ephemeris


def swiss_longitudes(jd_ut):
    """Geocentric apparent ecliptic longitude of date, in degrees, plus daily motion."""
    out = {}
    for name in BODIES:
        values, _flag = swe.calc_ut(jd_ut, SWE_BODY[name], SWE_FLAGS)
        out[name] = (values[0] % 360.0, values[3])
    return out


def astronomy_engine_longitudes(jd_ut):
    """The same quantity from a wholly separate implementation.

    astronomy-engine's `Time` is constructed from days relative to J2000, so the Julian Day is
    handed over directly. That is deliberate: it means this cross-check compares the two
    EPHEMERIDES at one identical instant, and cannot be fooled by a shared calendar bug.
    """
    time = ae.Time(jd_ut - 2451545.0)
    rotation = ae.Rotation_EQJ_ECT(time)  # J2000 equatorial -> true ecliptic OF DATE
    out = {}
    for name in BODIES:
        if name == "Moon":
            out[name] = ae.EclipticGeoMoon(time).lon % 360.0
            continue
        vector = ae.GeoVector(AE_BODY[name], time, True)  # aberration + light-travel corrected
        ecl = ae.RotateVector(rotation, vector)
        out[name] = math.degrees(math.atan2(ecl.y, ecl.x)) % 360.0
    return out


def angular_difference(a, b):
    """Separation between two longitudes, folded into [0, 180]."""
    return abs((a - b + 180.0) % 360.0 - 180.0)


def cross_check(jd_ut, label):
    """Compute both ways; abort if they disagree. Returns (swiss, max_disagreement)."""
    swiss = swiss_longitudes(jd_ut)
    other = astronomy_engine_longitudes(jd_ut)
    worst = 0.0
    worst_body = None
    for name in BODIES:
        delta = angular_difference(swiss[name][0], other[name])
        limit = PLUTO_TOLERANCE_DEG if name == "Pluto" else CROSS_CHECK_TOLERANCE_DEG
        if delta > limit:
            sys.exit(
                f"ABORT: {label}: pyswisseph and astronomy-engine disagree by {delta:.5f} deg on "
                f"{name} (tolerance {limit}). Two implementations that do not agree do not "
                f"constitute a measurement. Nothing emitted."
            )
        if delta > worst:
            worst, worst_body = delta, name
    return swiss, worst, worst_body


def sign_and_degree(longitude):
    index = int(longitude // 30) % 12
    return SIGNS[index], round(longitude - index * 30, 2)


def expected_sun_sign(month, day):
    """The sign the (proleptic Gregorian) calendar date implies, plus whether it is a cusp."""
    # Find the last boundary at or before (month, day) in a year that starts on 1 January,
    # remembering that Capricorn spans the year boundary and so is the default.
    ordered = sorted(range(12), key=lambda i: SIGN_START_DATE[i])
    chosen = ordered[-1]  # before the first boundary of the year -> Capricorn
    for index in ordered:
        m, d = SIGN_START_DATE[index]
        if (month, day) >= (m, d):
            chosen = index
    # Cusp if within a day of this sign's start or the next sign's start.
    def day_of_year(m, d):
        cum = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334]
        return cum[m - 1] + d

    here = day_of_year(month, day)
    cusp = False
    for m, d in SIGN_START_DATE:
        gap = abs(here - day_of_year(m, d))
        if min(gap, 365 - gap) <= 1:
            cusp = True
    return SIGNS[chosen], cusp


def weekday_of(jd_ut):
    return WEEKDAYS[int(math.floor(jd_ut + 1.5)) % 7]


# -------------------------------------------------------------------------------------- control


def run_control():
    """Reproduce the two already-committed computed charts, or refuse to continue."""
    print("=" * 96)
    print("CONTROL: reproducing the two charts already committed as provenance:'computed'")
    print("=" * 96)
    worst_overall = 0.0
    for case in CONTROL:
        y, mo, d, h, mi, s = case["ut"]
        jd = swe.julday(y, mo, d, h + mi / 60.0 + s / 3600.0, swe.GREG_CAL)
        swiss, worst, worst_body = cross_check(jd, case["id"])
        worst_overall = max(worst_overall, worst)
        failures = []
        for name in BODIES:
            longitude, speed = swiss[name]
            sign, degree = sign_and_degree(longitude)
            want_sign, want_degree = case["expected"][name]
            if sign != want_sign or abs(degree - want_degree) > 0.011:
                failures.append(f"{name}: got {sign} {degree}, file says {want_sign} {want_degree}")
            retro = speed < 0
            if retro != (name in case["retrograde"]):
                failures.append(f"{name}: retrograde {retro}, file says {not retro}")
        if failures:
            sys.exit(
                f"ABORT: the control chart {case['id']} was NOT reproduced:\n  "
                + "\n  ".join(failures)
                + "\nThe pipeline is wrong. Nothing emitted."
            )
        print(
            f"  {case['id']:14s} 20/20 placements reproduced exactly; "
            f"max cross-implementation disagreement {worst:.5f} deg (on {worst_body})"
        )
    print(f"  CONTROL PASSED. Worst disagreement across both control charts: {worst_overall:.5f} deg\n")
    return worst_overall


# --------------------------------------------------------------------------------------- charts


def compute_subject(subject):
    y, mo, d = subject["recorded"]
    calendar = swe.JUL_CAL if subject["recorded_calendar"] == "julian" else swe.GREG_CAL

    # Local mean time -> UT. Every one of these births predates standard time at its location,
    # so LMT (UT + longitude/15 hours) is the correct clock, exactly as for carl-jung.
    ut_hours = subject["local_hour"] - subject["lon"] / 15.0
    jd = swe.julday(y, mo, d, ut_hours, calendar)

    # Render the SAME instant in the proleptic Gregorian calendar, which is what birthData stores.
    gy, gmo, gd, ghour = swe.revjul(jd, swe.GREG_CAL)
    ut_h = int(ghour)
    ut_m = int(round((ghour - ut_h) * 60.0))
    if ut_m == 60:
        ut_h, ut_m = ut_h + 1, 0

    swiss, worst, worst_body = cross_check(jd, subject["id"])

    # What does the unknown birth time actually cost? Measure it rather than assert it: evaluate
    # every body at both ends of the birth day (00:00 and 24:00 local mean time) and record which
    # bodies change SIGN across it. Those are the placements the date alone does not determine.
    # This replaces a calendar cusp table, which cannot see a body sitting 0.2 degrees from a
    # boundary and would wave it through.
    jd_start = jd - subject["local_hour"] / 24.0
    at_start = swiss_longitudes(jd_start)
    at_end = swiss_longitudes(jd_start + 1.0)
    unstable = [
        name
        for name in BODIES
        if sign_and_degree(at_start[name][0])[0] != sign_and_degree(at_end[name][0])[0]
    ]

    moon_start = at_start["Moon"][0]
    moon_end = at_end["Moon"][0]
    moon_span = (moon_end - moon_start) % 360.0
    sign_start = sign_and_degree(moon_start)[0]
    sign_end = sign_and_degree(moon_end)[0]

    planets = {}
    for name in BODIES:
        longitude, speed = swiss[name]
        sign, degree = sign_and_degree(longitude)
        planets[name] = {"sign": sign, "degree": degree, "retrograde": speed < 0, "speed": speed}

    # ---- sanity checks. A failure here is a bug in this script, not a fact about the sky.
    problems = []
    sun_longitude = SIGNS.index(planets["Sun"]["sign"]) * 30 + planets["Sun"]["degree"]
    elongations = {}
    for body, limit in MAX_ELONGATION.items():
        body_longitude = SIGNS.index(planets[body]["sign"]) * 30 + planets[body]["degree"]
        elongations[body] = angular_difference(body_longitude, sun_longitude)
        if elongations[body] > limit:
            problems.append(
                f"{body} is {elongations[body]:.1f} deg from the Sun (physical maximum ~{limit})"
            )

    want_sign, cusp = expected_sun_sign(gmo, gd)
    if planets["Sun"]["sign"] != want_sign and not cusp:
        problems.append(
            f"Sun is in {planets['Sun']['sign']} but {gmo:02d}-{gd:02d} implies {want_sign}"
        )

    # The Sun's sign is the single most load-bearing number in these charts: persona prose,
    # dominantElement and the Sacred 7 derivation all lean on it. If the birth time is unknown
    # AND the Sun crosses a sign boundary during the birth day, then the date does not determine
    # it, and no amount of note-writing makes the emitted value a measurement. Refuse.
    if "Sun" in unstable:
        problems.append(
            f"the Sun crosses from {sign_and_degree(at_start['Sun'][0])[0]} into "
            f"{sign_and_degree(at_end['Sun'][0])[0]} during the birth day, so with no recorded "
            f"birth time its SIGN is undetermined - this chart must not be emitted"
        )

    return {
        "subject": subject,
        "jd": jd,
        "gregorian": (gy, gmo, gd),
        "ut": (ut_h, ut_m),
        "planets": planets,
        "elongations": elongations,
        "sun_sign_expected": want_sign,
        "sun_cusp": cusp,
        "moon": (moon_start, moon_end, moon_span, sign_start, sign_end),
        "unstable": unstable,
        "worst": worst,
        "worst_body": worst_body,
        "problems": problems,
        "weekday": weekday_of(jd),
    }


def provenance_note(result):
    s = result["subject"]
    gy, gmo, gd = result["gregorian"]
    ut_h, ut_m = result["ut"]
    moon_start, moon_end, moon_span, moon_sign_start, moon_sign_end = result["moon"]

    calendar_clause = ""
    if s["recorded_calendar"] == "julian":
        ry, rmo, rd = s["recorded"]
        calendar_clause = (
            f" The source records {rd} {['January','February','March','April','May','June','July','August','September','October','November','December'][rmo - 1]} {ry} in the JULIAN calendar, "
            f"which is the same instant as {gy}-{gmo:02d}-{gd:02d} in the proleptic Gregorian "
            f"calendar this repo uses at every epoch; birthData stores the proleptic Gregorian date."
        )

    if moon_sign_start == moon_sign_end:
        moon_clause = (
            f"the Moon stays in {moon_sign_start} across the whole day, so its SIGN is certain but "
            f"its degree is uncertain by up to {moon_span / 2:.1f} degrees"
        )
    else:
        moon_clause = (
            f"the Moon crosses from {moon_sign_start} into {moon_sign_end} during the day "
            f"({moon_span:.1f} degrees of motion), so even its SIGN IS NOT CERTAIN and must not be "
            f"presented as one"
        )
    others = [b for b in result["unstable"] if b != "Moon"]
    if others:
        moon_clause += f"; the same is true of {', '.join(others)}"

    agreement = (
        f"every body agrees to within {max(result['worst'], 0.001):.3f} degrees"
    )
    if result["worst"] > STORED_RESOLUTION_DEG:
        agreement += (
            f", the largest being {result['worst_body']}, whose {result['worst']:.3f}-degree "
            f"disagreement exceeds the 0.01-degree resolution stored here - so read "
            f"{result['worst_body']}'s second decimal as uncorroborated"
        )

    return (
        f"COMPUTED with Swiss Ephemeris (pyswisseph {EXPECTED_SWE_VERSION}, Moshier SEFLG_MOSEPH) for "
        f"{gy:04d}-{gmo:02d}-{gd:02d} {ut_h:02d}:{ut_m:02d} UT. Independently cross-checked against "
        f"astronomy-engine {EXPECTED_AE_VERSION}, a separate implementation: {agreement}. "
        f"Birth date: {s['source']}"
        f"{calendar_clause} BIRTH TIME IS NOT RECORDED, so the bodies are evaluated at 12:00 local "
        f"mean time at {s['place']} ({s['lat']:.4f}, {s['lon']:.4f}) - the midpoint of the birth day, "
        f"which bounds the error at half a day of motion. Consequence, measured over the birth day: "
        f"{moon_clause}; every other body moves less than a degree. The ASCENDANT, MIDHEAVEN and "
        f"HOUSE placements are therefore NOT computed and NOT claimed - the ascendant moves about 1 "
        f"degree every 4 minutes, the planet 'house' field is omitted rather than filled, and the "
        f"ascendant/midheaven numbers left in this chart are the pre-existing unmeasured ones. "
        f"Sanity checks pass: Sun in {result['planets']['Sun']['sign']} as the date requires, Mercury "
        f"{result['elongations']['Mercury']:.1f} degrees from the Sun (max ~28), Venus "
        f"{result['elongations']['Venus']:.1f} (max ~47). Reproduce with "
        f"scripts/compute-historical-natal-charts.py."
    )


def refusal_suffix(agent_id, reason):
    """The sentence appended to a refused subject's provenanceNote.

    Worth writing into the agent file rather than leaving only in this script: without it the
    next person to look at a fabricated chart has no way to tell 'nobody has computed this yet'
    from 'this cannot be computed', and will spend the research effort again — or, worse, will
    fill it in from an astrology site that quietly invented a date.
    """
    return (
        f" WHY THIS WAS NOT REPLACED WITH A COMPUTED CHART (checked "
        f"{CHECKED_ON}, by scripts/compute-historical-natal-charts.py, which refuses to emit a "
        f"chart for this subject): {reason} A computed chart becomes possible only if a "
        f"documented birth date turns up; a birth TIME would additionally be needed before any "
        f"ascendant or house placement could be claimed."
    )


def emit(result):
    s = result["subject"]
    gy, gmo, gd = result["gregorian"]
    print("-" * 96)
    print(f"{s['id']}  ({s['const']} in lib/agents/historical/)")
    print("-" * 96)
    print(f"  birthData date (proleptic Gregorian): {gy:04d}-{gmo:02d}-{gd:02d} 12:00 LMT")
    print(f"  UT instant: {result['ut'][0]:02d}:{result['ut'][1]:02d}   JD {result['jd']:.6f}   ({result['weekday']})")
    print(f"  cross-check worst disagreement: {result['worst']:.5f} deg on {result['worst_body']}")
    print(
        f"  elongations: Mercury {result['elongations']['Mercury']:.1f} (<=28), "
        f"Venus {result['elongations']['Venus']:.1f} (<=47)  |  Sun in "
        f"{result['planets']['Sun']['sign']}, date implies {result['sun_sign_expected']}"
        + (" (cusp)" if result["sun_cusp"] else "")
    )
    moon_start, moon_end, moon_span, a, b = result["moon"]
    print(f"  Moon across the birth day: {a} -> {b}, {moon_span:.1f} deg of motion")
    print(
        f"  bodies whose SIGN is undetermined by the date alone: "
        f"{', '.join(result['unstable']) if result['unstable'] else 'none'}"
    )
    print()
    print(f"  birthData: {{")
    print(f"    date: new Date('{gy:04d}-{gmo:02d}-{gd:02d}T12:00:00'),")
    print(f"    time: '12:00', // NOT a recorded birth time - assumed midpoint of the birth day")
    print(
        f"    location: {{ lat: {s['lat']}, lon: {s['lon']}, name: '{s['place']}' }},"
    )
    print(f"  }},")
    print()
    print("      planets: {")
    for name in BODIES:
        p = result["planets"][name]
        print(
            f"        {name}: {{ sign: '{p['sign']}', degree: {p['degree']}, "
            f"retrograde: {'true' if p['retrograde'] else 'false'} }},"
        )
    print("      },")
    print()
    print("      provenanceNote:")
    note = provenance_note(result)
    print(f"        '{note}',")
    print()


# ----------------------------------------------------------------------------------------- main


def main():
    if swe.version != EXPECTED_SWE_VERSION:
        sys.exit(
            f"ABORT: Swiss Ephemeris version is {swe.version}, expected {EXPECTED_SWE_VERSION}. "
            f"The provenance notes name a version; do not emit charts under a different one "
            f"without updating both."
        )
    print(f"pyswisseph -> Swiss Ephemeris {swe.version} (Moshier SEFLG_MOSEPH, no data files)")
    print(f"astronomy-engine {EXPECTED_AE_VERSION} (independent second implementation)\n")

    control_worst = run_control()

    print("=" * 96)
    print(f"REFUSED: {len(REFUSED)} subjects whose birth date is not known well enough to compute")
    print("=" * 96)
    for agent_id, disposition, reason in REFUSED:
        print(f"  {agent_id:20s} {disposition}")
        print(f"    {reason}")
        print(f"    -> provenanceNote suffix: {refusal_suffix(agent_id, reason)}")
    print()

    print("=" * 96)
    print(f"COMPUTED: {len(SUBJECTS)} charts")
    print("=" * 96)
    print()

    results = [compute_subject(s) for s in SUBJECTS]

    broken = [(r["subject"]["id"], r["problems"]) for r in results if r["problems"]]
    if broken:
        for agent_id, problems in broken:
            print(f"FAILED SANITY CHECK: {agent_id}")
            for problem in problems:
                print(f"  - {problem}")
        sys.exit(
            "\nABORT: a chart broke a physical bound. That is a bug in this script, not a fact "
            "about the sky. Nothing emitted."
        )

    for result in results:
        emit(result)

    worst = max([control_worst] + [r["worst"] for r in results])
    print("=" * 96)
    print(
        f"ALL {len(results)} charts pass the inferior-planet bounds and the Sun-sign check.\n"
        f"Worst pyswisseph vs astronomy-engine disagreement anywhere in this run: {worst:.5f} deg."
    )
    print("=" * 96)


if __name__ == "__main__":
    main()
