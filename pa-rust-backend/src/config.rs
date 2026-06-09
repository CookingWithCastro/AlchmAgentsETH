//! Startup configuration, read once from the environment. Mirrors the env var
//! handling scattered across `backend/main.py` (DSN precedence, tier defaults,
//! internal secret fail-closed behavior).

use std::env;

#[derive(Debug, Clone)]
pub struct AppConfig {
    pub host: String,
    pub port: u16,
    /// Resolved Postgres DSN, if any. Precedence: DIRECT_URL → DATABASE_URL.
    pub database_url: Option<String>,
    /// Internal/admin secret. Precedence: PA_INTERNAL_API_SECRET →
    /// INTERNAL_API_SECRET → an unguessable per-boot token (fail-closed).
    pub internal_api_secret: String,
    /// Default cost tier for recipe generation (COSMIC_RECIPE_MODEL_TIER).
    pub recipe_default_tier: String,
    /// Ceiling tier (HISTORICAL_AGENT_MAX_TIER), caps the requested tier.
    pub max_tier: String,
    /// Whether to seed recipe prompts with MCP catalog candidates.
    pub recipe_use_mcp_catalog: bool,
}

fn env_or(key: &str, default: &str) -> String {
    env::var(key).unwrap_or_else(|_| default.to_string())
}

fn env_bool(key: &str, default: bool) -> bool {
    match env::var(key) {
        Ok(v) => !matches!(
            v.trim().to_lowercase().as_str(),
            "0" | "false" | "no" | "off" | ""
        ),
        Err(_) => default,
    }
}

impl AppConfig {
    pub fn from_env() -> Self {
        // DSN precedence mirrors the backend: DIRECT_URL is the un-pooled Neon
        // endpoint preferred for a long-lived service; fall back to DATABASE_URL.
        let database_url = env::var("DIRECT_URL")
            .ok()
            .filter(|s| !s.trim().is_empty())
            .or_else(|| {
                env::var("DATABASE_URL")
                    .ok()
                    .filter(|s| !s.trim().is_empty())
            })
            .map(normalize_dsn);

        let internal_api_secret = env::var("PA_INTERNAL_API_SECRET")
            .ok()
            .filter(|s| !s.trim().is_empty())
            .or_else(|| {
                env::var("INTERNAL_API_SECRET")
                    .ok()
                    .filter(|s| !s.trim().is_empty())
            })
            .unwrap_or_else(|| {
                // Fail closed: no committed default. A random token rejects every
                // admin request until the operator configures the real secret.
                tracing::warn!(
                    "INTERNAL_API_SECRET not set — internal/admin endpoints will reject all requests"
                );
                random_token()
            });

        AppConfig {
            host: env_or("HOST", "0.0.0.0"),
            port: env_or("PORT", "8000").parse().unwrap_or(8000),
            database_url,
            internal_api_secret,
            recipe_default_tier: env_or("COSMIC_RECIPE_MODEL_TIER", "primary"),
            max_tier: env_or("HISTORICAL_AGENT_MAX_TIER", "primary"),
            recipe_use_mcp_catalog: env_bool("COSMIC_RECIPE_USE_MCP_CATALOG", true),
        }
    }
}

/// sqlx accepts both `postgres://` and `postgresql://`; normalize to the latter
/// for consistency with the Python driver expectations.
fn normalize_dsn(dsn: String) -> String {
    if let Some(rest) = dsn.strip_prefix("postgres://") {
        format!("postgresql://{rest}")
    } else {
        dsn
    }
}

/// A non-cryptographic but unguessable per-boot token, derived from process
/// entropy without pulling in extra crates. Used only to fail admin auth closed.
fn random_token() -> String {
    use std::collections::hash_map::RandomState;
    use std::hash::{BuildHasher, Hasher};
    // RandomState is seeded per-process from OS entropy; mix two hashers.
    let a = RandomState::new().build_hasher().finish();
    let b = RandomState::new().build_hasher().finish();
    format!("disabled-{a:016x}{b:016x}")
}
