//! Planetary Agents — Rust/Axum core backend.
//!
//! A faithful port of the compute surface of the Python/FastAPI backend
//! (`backend/`): the alchemical math engine (`utils.py`), the deterministic
//! ephemeris and position/chart endpoints (`main.py`), the cosmic-recipe LLM
//! pipeline (`recipe_generation.py` + `providers.py`), and a JSON-RPC MCP tool
//! server (`planetary_agents_mcp_server.py` / `alchm_mcp.py`).

pub mod astro;
pub mod config;
pub mod db;
pub mod error;
pub mod llm;
pub mod mcp;
pub mod prompts;
pub mod recipe;
pub mod routes;
pub mod schemas;
pub mod state;
pub mod tiers;

use std::time::Duration;

/// Initialize tracing once (idempotent — ignores a second call).
pub fn init_tracing() {
    use tracing_subscriber::EnvFilter;
    let filter = EnvFilter::try_from_default_env()
        .unwrap_or_else(|_| EnvFilter::new("info,pa_rust_backend=info"));
    let _ = tracing_subscriber::fmt()
        .with_env_filter(filter)
        .with_target(false)
        .try_init();
}

/// Build `AppState` from the environment: HTTP client + (optional) lazy DB pool.
pub fn build_state() -> (state::AppState, String) {
    let config = config::AppConfig::from_env();
    let bind_addr = format!("{}:{}", config.host, config.port);

    let http = reqwest::Client::builder()
        .timeout(Duration::from_secs(60))
        .build()
        .expect("failed to build reqwest client");

    let db = config
        .database_url
        .as_ref()
        .and_then(|url| db::connect_lazy(url));
    if db.is_some() {
        tracing::info!("database pool configured (lazy connect)");
    } else {
        tracing::warn!("no DATABASE_URL/DIRECT_URL configured — DB features disabled");
    }

    (state::AppState::new(config, http, db), bind_addr)
}

/// Run the HTTP server until shutdown.
pub async fn run() -> anyhow::Result<()> {
    dotenvy::dotenv().ok();
    init_tracing();

    let (state, bind_addr) = build_state();
    let app = routes::build_router(state);

    let listener = tokio::net::TcpListener::bind(&bind_addr).await?;
    tracing::info!("pa-rust-backend listening on http://{bind_addr}");
    axum::serve(listener, app)
        .with_graceful_shutdown(shutdown_signal())
        .await?;
    Ok(())
}

async fn shutdown_signal() {
    let _ = tokio::signal::ctrl_c().await;
    tracing::info!("shutdown signal received");
}
