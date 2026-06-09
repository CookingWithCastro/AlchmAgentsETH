//! Deterministic mean-motion ephemeris and request-datetime parsing.
//! Port of `main.py:_planetary_positions_for`, `_elemental_scores`,
//! and `_request_datetime`.

use super::constants::{PLANETARY_PERIODS_DAYS, ZODIAC_SIGNS, planetary_offset};
use chrono::{Datelike, NaiveDate, NaiveDateTime, TimeZone, Timelike, Utc};
use indexmap::IndexMap;
use serde::Serialize;
use serde_json::Value;

/// Round half-away-from-zero to `digits` decimals. Matches Python `round()`
/// for all non-tie inputs (true binary ties are vanishingly rare here, and the
/// math tests compare with an epsilon).
pub fn round_to(value: f64, digits: u32) -> f64 {
    let factor = 10f64.powi(digits as i32);
    (value * factor).round() / factor
}

/// A fully-resolved planetary position, mirroring the dict produced by
/// `_planetary_positions_for`.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PlanetPosition {
    pub sign: String,
    pub degree: i64,
    pub minute: i64,
    pub exact_longitude: f64,
    pub is_retrograde: bool,
    pub retrograde_symbol: String,
    pub longitude_speed: f64,
    pub arcminutes_per_day: f64,
    pub speed_display: String,
}

/// The J2000 epoch used by the mean-motion model: 2000-01-01 12:00:00 (naive UTC).
pub fn j2000_epoch() -> NaiveDateTime {
    NaiveDate::from_ymd_opt(2000, 1, 1)
        .unwrap()
        .and_hms_opt(12, 0, 0)
        .unwrap()
}

/// Compute planetary positions for a moment. Port of `_planetary_positions_for`.
/// Iteration order follows `PLANETARY_PERIODS_DAYS` (Sun → Pluto).
pub fn planetary_positions_for(dt: NaiveDateTime) -> IndexMap<String, PlanetPosition> {
    let epoch = j2000_epoch();
    let elapsed_days = dt.signed_duration_since(epoch).num_seconds() as f64 / 86400.0;

    let mut positions = IndexMap::new();
    for (planet, period) in PLANETARY_PERIODS_DAYS {
        let longitude =
            (planetary_offset(planet) + (elapsed_days / period) * 360.0).rem_euclid(360.0);
        let sign_index = (longitude / 30.0).floor() as usize;
        let degree_float = longitude % 30.0;
        let degree = degree_float.floor() as i64;
        let minute = ((degree_float - degree as f64) * 60.0).round() as i64;
        let speed = 360.0 / period;
        positions.insert(
            planet.to_string(),
            PlanetPosition {
                sign: ZODIAC_SIGNS[sign_index.min(11)].to_string(),
                degree,
                minute,
                exact_longitude: round_to(longitude, 4),
                is_retrograde: false,
                retrograde_symbol: String::new(),
                longitude_speed: round_to(speed, 6),
                arcminutes_per_day: round_to(speed * 60.0, 4),
                speed_display: format!("{}°/day", round_to(speed, 3)),
            },
        );
    }
    positions
}

/// Synthetic elemental scores from day/hour angles. Port of `_elemental_scores`.
/// Returns an ordered map: spirit_score, essence_score, matter_score, substance_score.
pub fn elemental_scores(dt: NaiveDateTime) -> IndexMap<String, f64> {
    let tau = std::f64::consts::TAU;
    let yday = dt.ordinal() as f64; // tm_yday: 1-based day of year
    let day_angle = ((yday / 365.25) * tau).rem_euclid(tau);
    let hour_angle =
        (((dt.hour() as f64 + dt.minute() as f64 / 60.0) / 24.0) * tau).rem_euclid(tau);

    let mut scores = IndexMap::new();
    scores.insert(
        "spirit_score".to_string(),
        round_to(3.5 + 1.5 * (1.0 + day_angle.sin()), 4),
    );
    scores.insert(
        "essence_score".to_string(),
        round_to(3.5 + 1.5 * (1.0 + hour_angle.cos()), 4),
    );
    scores.insert(
        "matter_score".to_string(),
        round_to(3.5 + 1.5 * (1.0 + day_angle.cos()), 4),
    );
    scores.insert(
        "substance_score".to_string(),
        round_to(3.5 + 1.5 * (1.0 + hour_angle.sin()), 4),
    );
    scores
}

/// Parse a datetime from a flexible request payload. Port of `_request_datetime`.
/// Accepts an ISO string in `date` (trailing `Z` tolerated) or discrete
/// year/month/day/hour/minute integers, each defaulting to "now" components.
pub fn request_datetime(payload: &Value) -> NaiveDateTime {
    let now = Utc::now().naive_utc();

    if let Some(raw) = payload.get("date").and_then(Value::as_str) {
        let trimmed = raw.trim();
        if !trimmed.is_empty() {
            let normalized = trimmed.replace('Z', "+00:00");
            // Try full offset datetime first, then naive ISO.
            if let Ok(dt) = chrono::DateTime::parse_from_rfc3339(&normalized) {
                return dt.naive_utc();
            }
            if let Ok(dt) = NaiveDateTime::parse_from_str(trimmed, "%Y-%m-%dT%H:%M:%S") {
                return dt;
            }
            if let Ok(d) = NaiveDate::parse_from_str(trimmed, "%Y-%m-%d") {
                return d.and_hms_opt(0, 0, 0).unwrap();
            }
        }
    }

    let as_i = |key: &str| payload.get(key).and_then(Value::as_i64);
    let year = as_i("year").unwrap_or(now.year() as i64) as i32;
    let month = as_i("month").unwrap_or(now.month() as i64) as u32;
    // `day` falls back to an integer `date`, then to now's day.
    let day = as_i("day")
        .or_else(|| payload.get("date").and_then(Value::as_i64))
        .unwrap_or(now.day() as i64) as u32;
    let hour = as_i("hour").unwrap_or(0) as u32;
    let minute = as_i("minute").unwrap_or(0) as u32;

    Utc.with_ymd_and_hms(year, month, day, hour, minute, 0)
        .single()
        .map(|dt| dt.naive_utc())
        .unwrap_or(now)
}

/// Parse an ISO-8601 datetime (RFC3339 with offset, naive `T`-separated, or
/// bare date). Returns `None` on failure.
pub fn parse_iso_datetime(s: &str) -> Option<NaiveDateTime> {
    let trimmed = s.trim();
    if trimmed.is_empty() {
        return None;
    }
    let normalized = trimmed.replace('Z', "+00:00");
    if let Ok(dt) = chrono::DateTime::parse_from_rfc3339(&normalized) {
        return Some(dt.naive_utc());
    }
    if let Ok(dt) = NaiveDateTime::parse_from_str(trimmed, "%Y-%m-%dT%H:%M:%S") {
        return Some(dt);
    }
    if let Ok(d) = NaiveDate::parse_from_str(trimmed, "%Y-%m-%d") {
        return d.and_hms_opt(0, 0, 0);
    }
    None
}

/// Construct a datetime from discrete parts, each defaulting to the
/// corresponding component of "now". Mirrors the `datetime(year or now.year, …)`
/// pattern in the philosophers-stone handlers.
pub fn datetime_from_parts(
    year: Option<i64>,
    month: Option<i64>,
    day: Option<i64>,
    hour: Option<i64>,
    minute: Option<i64>,
) -> NaiveDateTime {
    let now = Utc::now().naive_utc();
    let y = year.unwrap_or(now.year() as i64) as i32;
    let mo = month.unwrap_or(now.month() as i64) as u32;
    let d = day.unwrap_or(now.day() as i64) as u32;
    let h = hour.unwrap_or(0) as u32;
    let mi = minute.unwrap_or(0) as u32;
    Utc.with_ymd_and_hms(y, mo, d, h, mi, 0)
        .single()
        .map(|dt| dt.naive_utc())
        .unwrap_or(now)
}

/// `birth_info` block echoed back by the position endpoints.
#[derive(Debug, Clone, Serialize)]
pub struct BirthInfo {
    pub year: i32,
    pub month: u32,
    pub date: u32,
    pub hour: u32,
    pub minute: u32,
}

impl BirthInfo {
    pub fn from_dt(dt: NaiveDateTime) -> Self {
        BirthInfo {
            year: dt.year(),
            month: dt.month(),
            date: dt.day(),
            hour: dt.hour(),
            minute: dt.minute(),
        }
    }
}
