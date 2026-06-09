//! `GET /api/providers/health`. Port of the `main.py` debug endpoint that pings
//! every known LLM provider with a 1-token prompt.

use crate::llm;
use crate::state::AppState;
use axum::Json;
use axum::extract::State;
use serde_json::{Map, Value};

pub async fn providers_health(State(state): State<AppState>) -> Json<Value> {
    let providers = llm::all_known_providers();
    let mut out = Map::new();
    // Sequential is fine for a debug endpoint; avoids pulling in a join combinator.
    for cfg in &providers {
        let result = llm::health_check(&state.http, cfg).await;
        out.insert(cfg.name.to_string(), result);
    }
    Json(Value::Object(out))
}
