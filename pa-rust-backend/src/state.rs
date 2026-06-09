//! Shared application state, cloned into every handler.

use crate::config::AppConfig;
use crate::schemas::CosmicRecipeResponse;
use sqlx::postgres::PgPool;
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use std::time::Instant;

/// In-memory recipe cache entry: (expiry instant, cached response).
type RecipeCache = Arc<Mutex<HashMap<String, (Instant, CosmicRecipeResponse)>>>;

#[derive(Clone)]
pub struct AppState {
    pub config: Arc<AppConfig>,
    pub http: reqwest::Client,
    /// `None` when no DSN is configured or the initial connection failed; the
    /// service still serves all compute endpoints, and health reports the state.
    pub db: Option<PgPool>,
    pub recipe_cache: RecipeCache,
}

impl AppState {
    pub fn new(config: AppConfig, http: reqwest::Client, db: Option<PgPool>) -> Self {
        AppState {
            config: Arc::new(config),
            http,
            db,
            recipe_cache: Arc::new(Mutex::new(HashMap::new())),
        }
    }
}
