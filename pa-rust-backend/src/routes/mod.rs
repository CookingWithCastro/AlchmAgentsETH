//! HTTP route assembly.

pub mod astrologize;
pub mod health;
pub mod planetary;
pub mod providers_health;
pub mod recipe;

use crate::mcp;
use crate::state::AppState;
use axum::Json;
use axum::Router;
use axum::routing::{get, post};
use serde_json::Value;
use tower_http::cors::CorsLayer;
use tower_http::trace::TraceLayer;

/// JSON-RPC MCP endpoint. Notifications (no `id`) return an empty 200 body.
async fn mcp_handler(Json(body): Json<Value>) -> Json<Value> {
    match mcp::handle_jsonrpc(&body) {
        Some(resp) => Json(resp),
        None => Json(Value::Null),
    }
}

/// Build the application router. CORS is fully permissive, mirroring the
/// `allow_origins=["*"]` / `allow_methods=["*"]` / `allow_headers=["*"]` config
/// in `backend/main.py`.
pub fn build_router(state: AppState) -> Router {
    Router::new()
        .route("/", get(health::root))
        .route("/health", get(health::health))
        .route("/api/health", get(health::api_health))
        .route(
            "/api/providers/health",
            get(providers_health::providers_health),
        )
        .route("/api/planetary/positions", post(planetary::positions))
        .route("/planetary/current", get(planetary::current))
        .route("/api/planetary/positions/bulk", post(planetary::bulk))
        .route(
            "/api/alchemical/quantities",
            post(planetary::alchemical_quantities),
        )
        .route(
            "/api/philosophers-stone/positions",
            get(planetary::philosophers_stone_get).post(planetary::philosophers_stone_post),
        )
        .route("/api/astrologize", post(astrologize::astrologize))
        .route("/api/generate-recipe", post(recipe::generate_recipe))
        .route("/mcp", post(mcp_handler))
        .layer(TraceLayer::new_for_http())
        .layer(CorsLayer::permissive())
        .with_state(state)
}
