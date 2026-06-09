//! Postgres (Neon) integration via sqlx. Uses runtime queries (no compile-time
//! macros) so the crate builds without a live database. Mirrors the relevant
//! tables from `backend/models.py` (`historical_agents`, `AgentConversation`).

use chrono::{NaiveDateTime, Utc};
use sqlx::postgres::{PgPool, PgPoolOptions};
use uuid::Uuid;

/// Build a lazily-connecting pool. Returns `None` if construction fails; the
/// first real query establishes the connection.
pub fn connect_lazy(database_url: &str) -> Option<PgPool> {
    match PgPoolOptions::new()
        .max_connections(5)
        .acquire_timeout(std::time::Duration::from_secs(8))
        .connect_lazy(database_url)
    {
        Ok(pool) => Some(pool),
        Err(e) => {
            tracing::error!("failed to build pg pool: {e}");
            None
        }
    }
}

/// Probe the database with `SELECT 1`. Returns `"connected"` / `"disconnected"`,
/// the strings the Python `/health` endpoint reports.
pub async fn status(pool: Option<&PgPool>) -> &'static str {
    match pool {
        Some(p) => match sqlx::query_scalar::<_, i32>("SELECT 1").fetch_one(p).await {
            Ok(_) => "connected",
            Err(e) => {
                tracing::warn!("db health probe failed: {e}");
                "disconnected"
            }
        },
        None => "disconnected",
    }
}

/// Count rows in `historical_agents` — a cheap liveness/cardinality probe.
pub async fn count_agents(pool: &PgPool) -> Result<i64, sqlx::Error> {
    sqlx::query_scalar::<_, i64>("SELECT count(*) FROM historical_agents")
        .fetch_one(pool)
        .await
}

/// An agent's EV/leveling "balance" pulled from `historical_agents`.
#[derive(Debug, Clone, sqlx::FromRow, serde::Serialize)]
pub struct AgentBalance {
    pub level: i32,
    pub xp: i32,
    pub ev_total: i32,
    pub evolution_points: i32,
}

/// Fetch an agent's authoritative EV balance by `agentId`. Port intent of the
/// "agent balance fetch" task — the EV/leveling columns are the on-chain-style
/// balances in this schema.
pub async fn fetch_agent_balance(
    pool: &PgPool,
    agent_id: &str,
) -> Result<Option<AgentBalance>, sqlx::Error> {
    sqlx::query_as::<_, AgentBalance>(
        r#"SELECT level,
                  xp,
                  "evTotal"          AS ev_total,
                  "evolutionPoints"  AS evolution_points
           FROM historical_agents
           WHERE "agentId" = $1"#,
    )
    .bind(agent_id)
    .fetch_optional(pool)
    .await
}

/// Best-effort insert into the shared `AgentConversation` telemetry table. Errors
/// are returned but callers treat logging failures as non-fatal.
#[allow(clippy::too_many_arguments)]
pub async fn log_conversation(
    pool: &PgPool,
    agent_id: &str,
    session_id: &str,
    user_id: Option<&str>,
    user_message: &str,
    agent_response: &str,
    model_used: Option<&str>,
    response_time: Option<f64>,
) -> Result<(), sqlx::Error> {
    let id = Uuid::new_v4().to_string();
    let now: NaiveDateTime = Utc::now().naive_utc();
    sqlx::query(
        r#"INSERT INTO "AgentConversation"
              (id, "agentId", "sessionId", "userId", "userMessage", "agentResponse",
               "createdAt", "modelUsed", "responseTime")
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)"#,
    )
    .bind(id)
    .bind(agent_id)
    .bind(session_id)
    .bind(user_id)
    .bind(user_message)
    .bind(agent_response)
    .bind(now)
    .bind(model_used)
    .bind(response_time)
    .execute(pool)
    .await
    .map(|_| ())
}
