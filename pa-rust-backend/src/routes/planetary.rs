//! Planetary position + alchemical endpoints. Ports of the "frontend
//! compatibility" handlers in `backend/main.py`.

use crate::astro::alchemy::{self, AlchemizeResult};
use crate::astro::positions::{
    self, BirthInfo, PlanetPosition, datetime_from_parts, planetary_positions_for, round_to,
};
use crate::error::{AppError, AppResult};
use axum::Json;
use axum::extract::Query;
use chrono::{Duration, NaiveDateTime, Utc};
use indexmap::IndexMap;
use serde::Serialize;
use serde_json::Value;

/// Shared `{birth_info, planetary_positions}` envelope.
#[derive(Serialize)]
pub struct PositionsEnvelope {
    pub birth_info: BirthInfo,
    pub planetary_positions: IndexMap<String, PlanetPosition>,
}

fn envelope_for(dt: NaiveDateTime) -> PositionsEnvelope {
    PositionsEnvelope {
        birth_info: BirthInfo::from_dt(dt),
        planetary_positions: planetary_positions_for(dt),
    }
}

/// `POST /api/planetary/positions`
pub async fn positions(Json(body): Json<Value>) -> Json<PositionsEnvelope> {
    let dt = positions::request_datetime(&body);
    Json(envelope_for(dt))
}

/// `GET /planetary/current`
pub async fn current() -> Json<PositionsEnvelope> {
    let dt = Utc::now().naive_utc();
    Json(envelope_for(dt))
}

#[derive(Serialize)]
pub struct BulkSample {
    pub timestamp: String,
    pub positions: PositionsEnvelope,
}

#[derive(Serialize)]
pub struct BulkResponse {
    pub samples: Vec<BulkSample>,
    pub count: usize,
    pub degraded: bool,
}

/// `POST /api/planetary/positions/bulk`
pub async fn bulk(
    Json(body): Json<crate::schemas::BulkPositionsRequest>,
) -> AppResult<Json<BulkResponse>> {
    let start = positions::parse_iso_datetime(&body.start_date)
        .ok_or_else(|| AppError::BadRequest("invalid startDate".to_string()))?;
    let end = positions::parse_iso_datetime(&body.end_date)
        .ok_or_else(|| AppError::BadRequest("invalid endDate".to_string()))?;

    // Step is at least 15 minutes, matching `max(intervalHours, 0.25)`.
    let step_hours = body.interval_hours.max(0.25);
    let step = Duration::milliseconds((step_hours * 3_600_000.0) as i64);

    let mut samples = Vec::new();
    let mut cursor = start;
    while cursor <= end && samples.len() < 500 {
        samples.push(BulkSample {
            timestamp: cursor.format("%Y-%m-%dT%H:%M:%S").to_string(),
            positions: envelope_for(cursor),
        });
        cursor += step;
    }

    let count = samples.len();
    Ok(Json(BulkResponse {
        samples,
        count,
        degraded: true,
    }))
}

#[derive(Serialize)]
pub struct AlchemicalQuantities {
    pub spirit_score: f64,
    pub essence_score: f64,
    pub matter_score: f64,
    pub substance_score: f64,
    pub kinetic_val: f64,
    pub thermo_val: f64,
    pub metadata: Value,
}

/// `POST /api/alchemical/quantities`
pub async fn alchemical_quantities(Json(body): Json<Value>) -> Json<AlchemicalQuantities> {
    let dt = positions::request_datetime(&body);
    let scores = positions::elemental_scores(dt);
    let get = |k: &str| scores.get(k).copied().unwrap_or(0.0);
    let spirit = get("spirit_score");
    let essence = get("essence_score");
    let matter = get("matter_score");
    let substance = get("substance_score");

    let read = |k: &str| body.get(k).and_then(Value::as_f64).unwrap_or(0.0);
    let mut kinetic_val = read("kinetic_rating") / 10.0;
    let mut thermo_val = read("thermo_rating") / 10.0;
    if kinetic_val == 0.0 {
        kinetic_val = round_to((spirit + substance) / 20.0, 4);
    }
    if thermo_val == 0.0 {
        thermo_val = round_to((essence + matter) / 20.0, 4);
    }

    Json(AlchemicalQuantities {
        spirit_score: spirit,
        essence_score: essence,
        matter_score: matter,
        substance_score: substance,
        kinetic_val,
        thermo_val,
        metadata: serde_json::json!({
            "source": "local-fastapi-compatibility",
            "degraded": true,
        }),
    })
}

#[derive(Debug, Default, serde::Deserialize)]
pub struct PhilosophersStoneQuery {
    pub year: Option<i64>,
    pub month: Option<i64>,
    pub day: Option<i64>,
    pub hour: Option<i64>,
    pub minute: Option<i64>,
}

/// Run `alchemize_detailed` for a moment, with the previous day as the
/// historical baseline. Shared by GET/POST philosophers-stone.
fn philosophers_stone_for(dt: NaiveDateTime, custom_planets: Option<&Value>) -> AlchemizeResult {
    let current_gen = planetary_positions_for(dt);
    let prev_gen = planetary_positions_for(dt - Duration::days(1));

    let current = match custom_planets {
        Some(v) => alchemy::ensure_from_value(v),
        None => alchemy::ensure_from_positions(&current_gen),
    };
    let historical = alchemy::ensure_from_positions(&prev_gen);
    alchemy::alchemize_detailed(&current, Some(&historical), dt)
}

/// `GET /api/philosophers-stone/positions`
pub async fn philosophers_stone_get(
    Query(q): Query<PhilosophersStoneQuery>,
) -> Json<AlchemizeResult> {
    let dt = datetime_from_parts(q.year, q.month, q.day, q.hour, q.minute);
    Json(philosophers_stone_for(dt, None))
}

/// `POST /api/philosophers-stone/positions`
pub async fn philosophers_stone_post(
    Json(req): Json<crate::schemas::PhilosophersStoneRequest>,
) -> Json<AlchemizeResult> {
    let dt = datetime_from_parts(req.year, req.month, req.day, req.hour, req.minute);
    Json(philosophers_stone_for(dt, req.custom_planets.as_ref()))
}
