//! Lookup tables transcribed verbatim from the Python backend
//! (`backend/utils.py` and `backend/main.py`). These tables ARE the port —
//! the numeric values must match the source exactly for output fidelity.

/// Zodiac signs in canonical order (index 0 = Aries). Mirrors `main.py:ZODIAC_SIGNS`.
pub const ZODIAC_SIGNS: [&str; 12] = [
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
];

/// Orbital periods in days, used by the deterministic mean-motion position
/// model. Order is significant: it fixes planet iteration order in generated
/// position maps. Mirrors `main.py:PLANETARY_PERIODS_DAYS`.
pub const PLANETARY_PERIODS_DAYS: [(&str, f64); 10] = [
    ("Sun", 365.25),
    ("Moon", 27.321661),
    ("Mercury", 87.969),
    ("Venus", 224.701),
    ("Mars", 686.98),
    ("Jupiter", 4332.59),
    ("Saturn", 10759.22),
    ("Uranus", 30685.4),
    ("Neptune", 60189.0),
    ("Pluto", 90560.0),
];

/// Mean-longitude offsets (degrees) at the J2000 epoch. Mirrors
/// `main.py:PLANETARY_OFFSETS`.
pub fn planetary_offset(planet: &str) -> f64 {
    match planet {
        "Sun" => 28.0,
        "Moon" => 91.0,
        "Mercury" => 74.0,
        "Venus" => 132.0,
        "Mars" => 201.0,
        "Jupiter" => 16.0,
        "Saturn" => 301.0,
        "Uranus" => 64.0,
        "Neptune" => 359.0,
        "Pluto" => 277.0,
        _ => 0.0,
    }
}

/// Orbital periods in years used for alchemical weighting (`PLANET_ALCHM_PERIODS`).
/// Includes the Ascendant. Default 1.0 for unknown bodies.
pub fn planet_alchm_period(planet: &str) -> f64 {
    match planet {
        "Pluto" => 247.94,
        "Neptune" => 164.79,
        "Uranus" => 84.01,
        "Saturn" => 29.46,
        "Jupiter" => 11.86,
        "Mars" => 1.88,
        "Sun" => 1.0,
        "Venus" => 0.615,
        "Mercury" => 0.241,
        "Moon" => 0.075,
        "Ascendant" => 0.003,
        _ => 1.0,
    }
}

/// Relative planetary masses (`PLANET_WEIGHTS`). Default 1.0 for unknown bodies.
pub fn planet_weight(planet: &str) -> f64 {
    match planet {
        "Sun" => 333000.0,
        "Moon" => 0.0123,
        "Mercury" => 0.055,
        "Venus" => 0.815,
        "Mars" => 0.107,
        "Jupiter" => 317.8,
        "Saturn" => 95.2,
        "Uranus" => 14.5,
        "Neptune" => 17.1,
        "Pluto" => 0.0022,
        _ => 1.0,
    }
}

/// Log-domain bounds for `normalize_alchm_weight` (`PERIOD_LOG_MIN/MAX`).
pub fn period_log_bounds() -> (f64, f64) {
    (0.003_f64.log10(), 247.94_f64.log10())
}

/// Log-domain bounds for `normalize_planet_weight` (`MASS_LOG_MIN/MAX`).
pub fn mass_log_bounds() -> (f64, f64) {
    (0.0022_f64.log10(), 333000.0_f64.log10())
}

/// Sect-based element per planet (`PLANETARY_SECTARIAN_ELEMENTS`). Returns
/// `(diurnal, nocturnal)`. Unknown planets fall back to ("Air", "Air").
pub fn planetary_sect_elements(planet: &str) -> Option<(&'static str, &'static str)> {
    Some(match planet {
        "Sun" => ("Fire", "Fire"),
        "Moon" => ("Water", "Water"),
        "Mercury" => ("Air", "Earth"),
        "Venus" => ("Water", "Earth"),
        "Mars" => ("Fire", "Water"),
        "Jupiter" => ("Air", "Fire"),
        "Saturn" => ("Air", "Earth"),
        "Uranus" => ("Water", "Air"),
        "Neptune" => ("Water", "Water"),
        "Pluto" => ("Earth", "Water"),
        _ => return None,
    })
}

/// Zodiac element for a sign (`get_zodiac_element`). Default "Air".
pub fn zodiac_element(sign: &str) -> &'static str {
    match sign.to_lowercase().as_str() {
        "aries" => "Fire",
        "taurus" => "Earth",
        "gemini" => "Air",
        "cancer" => "Water",
        "leo" => "Fire",
        "virgo" => "Earth",
        "libra" => "Air",
        "scorpio" => "Water",
        "sagittarius" => "Fire",
        "capricorn" => "Earth",
        "aquarius" => "Air",
        "pisces" => "Water",
        _ => "Air",
    }
}

/// Essential-dignity score for a planet in a sign (`get_planetary_dignity`).
/// Default 0. Sign comparison is case-insensitive.
pub fn planetary_dignity(planet: &str, sign: &str) -> i32 {
    let s = sign.to_lowercase();
    let s = s.as_str();
    match planet {
        "Sun" => match s {
            "leo" => 1,
            "aries" => 2,
            "aquarius" => -1,
            "libra" => -2,
            _ => 0,
        },
        "Moon" => match s {
            "cancer" => 1,
            "taurus" => 2,
            "capricorn" => -1,
            "scorpio" => -2,
            _ => 0,
        },
        "Mercury" => match s {
            "gemini" => 1,
            "virgo" => 3,
            "sagittarius" => 1,
            "pisces" => -3,
            _ => 0,
        },
        "Venus" => match s {
            "libra" => 1,
            "taurus" => 1,
            "pisces" => 2,
            "aries" => -1,
            "scorpio" => -1,
            "virgo" => -2,
            _ => 0,
        },
        "Mars" => match s {
            "aries" => 1,
            "scorpio" => 1,
            "capricorn" => 2,
            "taurus" => -1,
            "libra" => -1,
            "cancer" => -2,
            _ => 0,
        },
        "Jupiter" => match s {
            "pisces" => 1,
            "sagittarius" => 1,
            "cancer" => 2,
            "gemini" => -1,
            "virgo" => -1,
            "capricorn" => -2,
            _ => 0,
        },
        "Saturn" => match s {
            "aquarius" => 1,
            "capricorn" => 1,
            "libra" => 2,
            "cancer" => -1,
            "leo" => -1,
            "aries" => -2,
            _ => 0,
        },
        "Uranus" => match s {
            "aquarius" => 1,
            "scorpio" => 2,
            "taurus" => -3,
            _ => 0,
        },
        "Neptune" => match s {
            "pisces" => 1,
            "cancer" => 2,
            "virgo" => -1,
            "capricorn" => -2,
            _ => 0,
        },
        "Pluto" => match s {
            "scorpio" => 1,
            "leo" => 2,
            "taurus" => -1,
            "aquarius" => -2,
            _ => 0,
        },
        _ => 0,
    }
}

/// Per-planet alchemical contribution `[Spirit, Essence, Matter, Substance]`
/// (`planetary_alchemy`). Includes the Ascendant. `None` for unknown bodies.
pub fn planetary_alchemy(planet: &str) -> Option<[f64; 4]> {
    Some(match planet {
        "Sun" => [1.0, 0.0, 0.0, 0.0],
        "Moon" => [0.0, 1.0, 1.0, 0.0],
        "Mercury" => [1.0, 0.0, 0.0, 1.0],
        "Venus" => [0.0, 1.0, 1.0, 0.0],
        "Mars" => [0.0, 1.0, 1.0, 0.0],
        "Jupiter" => [1.0, 1.0, 0.0, 0.0],
        "Saturn" => [1.0, 0.0, 1.0, 0.0],
        "Uranus" => [0.0, 1.0, 1.0, 0.0],
        "Neptune" => [0.0, 1.0, 0.0, 1.0],
        "Pluto" => [0.0, 1.0, 1.0, 0.0],
        "Ascendant" => [1.0, 1.0, 1.0, 1.0],
        _ => return None,
    })
}

/// Aspect definitions as `(name, max_orb, angle)`. Order is significant —
/// `calculate_aspects` emits every matching aspect in this order, and several
/// aspects share an angle (quincunx/inconjunct at 150°). Mirrors
/// `utils.py:aspect_definitions`.
pub const ASPECT_DEFINITIONS: [(&str, f64, f64); 12] = [
    ("conjunction", 8.0, 0.0),
    ("opposition", 8.0, 180.0),
    ("trine", 8.0, 120.0),
    ("square", 7.0, 90.0),
    ("sextile", 4.0, 60.0),
    ("quincunx", 3.0, 150.0),
    ("inconjunct", 3.0, 150.0),
    ("semi-sextile", 3.0, 30.0),
    ("semisquare", 2.0, 45.0),
    ("sesquisquare", 2.0, 135.0),
    ("quintile", 2.0, 72.0),
    ("biquintile", 2.0, 144.0),
];

/// Quadruplicity (modality) for a sign. Used by the synthesized `/api/astrologize`
/// chart endpoint, which reports a modality balance the Python backend never
/// computed (it hardcodes `dominantModality = "Cardinal"`).
pub fn sign_modality(sign: &str) -> &'static str {
    match sign.to_lowercase().as_str() {
        "aries" | "cancer" | "libra" | "capricorn" => "Cardinal",
        "taurus" | "leo" | "scorpio" | "aquarius" => "Fixed",
        "gemini" | "virgo" | "sagittarius" | "pisces" => "Mutable",
        _ => "Cardinal",
    }
}

/// Lowercase sign list used by `calculate_aspects::get_longitude` to map a sign
/// to a 30°-wide base longitude.
pub const SIGNS_LOWER: [&str; 12] = [
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
];
