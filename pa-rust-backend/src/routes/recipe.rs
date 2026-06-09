//! `POST /api/generate-recipe`. Port of the `main.py` handler: normalize the
//! request, resolve the cost tier, (optionally) seed MCP catalog candidates,
//! then run the generation pipeline.

use crate::error::{AppError, AppResult};
use crate::recipe::generate_cosmic_recipe;
use crate::schemas::{CosmicRecipeRequest, CosmicRecipeResponse, normalize_recipe_request};
use crate::state::AppState;
use crate::tiers::{anthropic_model_for, resolve_tier};
use axum::Json;
use axum::extract::State;
use serde_json::Value;

pub async fn generate_recipe(
    State(state): State<AppState>,
    Json(body): Json<Value>,
) -> AppResult<Json<CosmicRecipeResponse>> {
    let normalized = normalize_recipe_request(body);
    let req: CosmicRecipeRequest = serde_json::from_value(normalized)
        .map_err(|e| AppError::BadRequest(format!("invalid recipe request: {e}")))?;

    let requested_tier = req
        .model_tier
        .clone()
        .unwrap_or_else(|| state.config.recipe_default_tier.clone());
    let tier = resolve_tier(&requested_tier, &state.config.max_tier);
    let anthropic_model = anthropic_model_for(&tier);

    // Catalog seeding via the Alchm MCP subprocess is faithfully stubbed in this
    // port (see mcp::alchm). The pipeline degrades to persona-only generation,
    // exactly as the Python path does when the MCP catalog is unavailable.
    if state.config.recipe_use_mcp_catalog {
        tracing::debug!(
            "recipe MCP catalog seeding disabled in rust port; degrading to model-only"
        );
    }

    let recipe = generate_cosmic_recipe(&state, &req, &tier, anthropic_model, None).await?;
    // Note: the Python handler also emits a `recipe_generation` feed event to the
    // frontend. That outbound side-effect is intentionally omitted here.
    Ok(Json(recipe))
}
