//! `POST /api/astrologize` — natal chart computation.
//!
//! The Python backend has no `/api/astrologize` route; this endpoint is
//! synthesized faithfully from the existing math: deterministic positions
//! (`planetary_positions_for`), aspects (`calculate_aspects`), the full
//! alchemical breakdown (`alchemize_detailed`), an elemental balance (the
//! normalized `elementalProperties`), and a modality balance + whole-sign
//! houses — the two pieces the Python engine never computed (it hardcodes
//! `dominantModality = "Cardinal"` and has no house system).

use crate::astro::alchemy::{self, AlchemizeResult, PositionInput};
use crate::astro::aspects::{Aspect, calculate_aspects};
use crate::astro::constants::{ZODIAC_SIGNS, sign_modality, zodiac_element};
use crate::astro::positions::{
    BirthInfo, datetime_from_parts, parse_iso_datetime, planetary_positions_for,
};
use crate::schemas::AstrologizeRequest;
use axum::Json;
use chrono::{Duration, NaiveDateTime};
use serde::Serialize;
use serde_json::{Value, json};

#[derive(Serialize)]
pub struct House {
    pub house: i32,
    pub sign: String,
    pub cusp_longitude: f64,
    pub modality: String,
    pub element: String,
}

#[derive(Serialize)]
pub struct ModalityBalance {
    pub cardinal: f64,
    pub fixed: f64,
    pub mutable: f64,
    pub dominant: String,
    pub counts: Value,
}

#[derive(Serialize)]
pub struct AstrologizeResponse {
    pub birth_info: BirthInfo,
    pub house_system: String,
    pub ascendant: String,
    pub planetary_positions: Value,
    pub houses: Vec<House>,
    pub aspects: Vec<Aspect>,
    pub elemental_balance: crate::astro::alchemy::ElementalProperties,
    pub modality_balance: ModalityBalance,
    pub alchemy: AlchemizeResult,
    pub metadata: Value,
}

fn resolve_dt(req: &AstrologizeRequest) -> NaiveDateTime {
    if let Some(date) = req.date.as_deref()
        && let Some(dt) = parse_iso_datetime(date)
    {
        return dt;
    }
    datetime_from_parts(req.year, req.month, req.day, req.hour, req.minute)
}

/// Derive a display map from alchemical inputs (sign + degree → longitude).
fn display_positions(inputs: &[(String, PositionInput)]) -> Value {
    let mut map = serde_json::Map::new();
    for (planet, p) in inputs {
        let idx = ZODIAC_SIGNS
            .iter()
            .position(|s| s.eq_ignore_ascii_case(&p.sign))
            .unwrap_or(0);
        let longitude = idx as f64 * 30.0 + p.degree;
        map.insert(
            planet.clone(),
            json!({
                "sign": p.sign,
                "degree": p.degree,
                "minute": p.minute,
                "exactLongitude": longitude,
            }),
        );
    }
    Value::Object(map)
}

fn modality_balance(inputs: &[(String, PositionInput)]) -> ModalityBalance {
    let (mut cardinal, mut fixed, mut mutable) = (0i64, 0i64, 0i64);
    for (_, p) in inputs {
        match sign_modality(&p.sign) {
            "Cardinal" => cardinal += 1,
            "Fixed" => fixed += 1,
            "Mutable" => mutable += 1,
            _ => {}
        }
    }
    let total = (cardinal + fixed + mutable).max(1) as f64;
    let dominant = [
        ("Cardinal", cardinal),
        ("Fixed", fixed),
        ("Mutable", mutable),
    ]
    .into_iter()
    .max_by_key(|(_, c)| *c)
    .map(|(n, _)| n.to_string())
    .unwrap_or_else(|| "Cardinal".to_string());
    ModalityBalance {
        cardinal: cardinal as f64 / total,
        fixed: fixed as f64 / total,
        mutable: mutable as f64 / total,
        dominant,
        counts: json!({"Cardinal": cardinal, "Fixed": fixed, "Mutable": mutable}),
    }
}

/// Whole-sign houses anchored on the ascendant sign.
fn whole_sign_houses(ascendant: &str) -> Vec<House> {
    let asc_index = ZODIAC_SIGNS
        .iter()
        .position(|s| s.eq_ignore_ascii_case(ascendant))
        .unwrap_or(0);
    (0..12)
        .map(|n| {
            let idx = (asc_index + n) % 12;
            let sign = ZODIAC_SIGNS[idx];
            House {
                house: (n + 1) as i32,
                sign: sign.to_string(),
                cusp_longitude: (idx as f64) * 30.0,
                modality: sign_modality(sign).to_string(),
                element: zodiac_element(sign).to_string(),
            }
        })
        .collect()
}

pub async fn astrologize(Json(req): Json<AstrologizeRequest>) -> Json<AstrologizeResponse> {
    let dt = resolve_dt(&req);

    let generated = planetary_positions_for(dt);
    let prev = planetary_positions_for(dt - Duration::days(1));

    let current_inputs = match req.custom_planets.as_ref() {
        Some(v) => alchemy::ensure_from_value(v),
        None => alchemy::ensure_from_positions(&generated),
    };
    let historical_inputs = alchemy::ensure_from_positions(&prev);

    let alchemy_result = alchemy::alchemize_detailed(&current_inputs, Some(&historical_inputs), dt);
    let aspects = calculate_aspects(&current_inputs);
    let modality = modality_balance(&current_inputs);

    // Ascendant: explicit request value, else the Sun's sign (a reasonable
    // whole-sign anchor when no birth-time ascendant can be computed).
    let sun_sign = current_inputs
        .iter()
        .find(|(p, _)| p == "Sun")
        .map(|(_, p)| p.sign.clone())
        .unwrap_or_else(|| "Aries".to_string());
    let ascendant = req
        .ascendant
        .as_deref()
        .filter(|a| ZODIAC_SIGNS.iter().any(|s| s.eq_ignore_ascii_case(a)))
        .map(|a| {
            // Canonicalize capitalization.
            ZODIAC_SIGNS
                .iter()
                .find(|s| s.eq_ignore_ascii_case(a))
                .unwrap()
                .to_string()
        })
        .unwrap_or(sun_sign);

    let houses = whole_sign_houses(&ascendant);

    let planetary_positions = if req.custom_planets.is_some() {
        display_positions(&current_inputs)
    } else {
        serde_json::to_value(&generated).unwrap_or(Value::Null)
    };

    let elemental_balance = alchemy_result.elemental_properties.clone();

    Json(AstrologizeResponse {
        birth_info: BirthInfo::from_dt(dt),
        house_system: "whole_sign".to_string(),
        ascendant,
        planetary_positions,
        houses,
        aspects,
        elemental_balance,
        modality_balance: modality,
        alchemy: alchemy_result,
        metadata: json!({
            "source": "pa-rust-backend/astrologize",
            "ephemeris": "deterministic-mean-motion",
            "note": "Houses are whole-sign anchored on the ascendant (Sun sign when unspecified); the source Python backend computes no houses.",
            "latitude": req.latitude,
            "longitude": req.longitude,
        }),
    })
}
