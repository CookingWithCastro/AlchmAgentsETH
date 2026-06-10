//! Health + root endpoints. Port of `main.py` `/health` and `/`, plus the
//! `/api/health` alias the migration task specifies, which additionally reports
//! live database status.

use crate::db;
use crate::schemas::HealthResponse;
use crate::state::AppState;
use axum::Json;
use axum::extract::State;
use serde_json::{Value, json};

const SERVICE_NAME: &str = "planetary-agents-core";

/// `GET /health` — static health (matches the Python contract verbatim).
pub async fn health() -> Json<HealthResponse> {
    Json(HealthResponse {
        status: "healthy".to_string(),
        service: SERVICE_NAME.to_string(),
        database: "connected".to_string(),
    })
}

/// `GET /api/health` — health with a real database probe and agent count.
pub async fn api_health(State(state): State<AppState>) -> Json<Value> {
    let database = db::status(state.db.as_ref()).await;
    let agent_count = match state.db.as_ref() {
        Some(pool) if database == "connected" => db::count_agents(pool).await.ok(),
        _ => None,
    };
    Json(json!({
        "status": "healthy",
        "service": SERVICE_NAME,
        "database": database,
        "agentCount": agent_count,
    }))
}

/// `GET /` — operational banner.
pub async fn root() -> Json<Value> {
    Json(json!({ "message": "Planetary Agents Core API is operational" }))
}
