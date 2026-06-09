//! Cosmic recipe generation pipeline. Port of `backend/recipe_generation.py`:
//! in-memory TTL cache, prompt assembly, provider chain, validate-or-retry.

use crate::error::AppError;
use crate::llm::{self, CallOptions};
use crate::prompts::build_alchemical_chef_prompt;
use crate::schemas::CosmicRecipeRequest;
use crate::schemas::CosmicRecipeResponse;
use crate::state::AppState;
use serde_json::{Value, json};
use std::env;
use std::time::{Duration, Instant};

const COSMIC_RECIPE_AGENT_ID: &str = "alchemical-chef";

fn cache_ttl() -> Duration {
    let secs = env::var("COSMIC_RECIPE_CACHE_TTL_SECONDS")
        .ok()
        .and_then(|s| s.parse::<f64>().ok())
        .unwrap_or(60.0);
    Duration::from_secs_f64(secs.max(0.0))
}

fn max_tokens() -> u32 {
    env::var("COSMIC_RECIPE_MAX_TOKENS")
        .ok()
        .and_then(|s| s.parse::<u32>().ok())
        .unwrap_or(4096)
}

/// Port of `_stable_cache_key`. The canonical (sorted-key, compact) JSON of the
/// request — excluding `userId`/`modelTier` — doubles as the cache key.
fn stable_cache_key(req: &CosmicRecipeRequest, catalog: Option<&Value>) -> String {
    let mut payload = json!({
        "prompt": req.prompt,
        "dominantElement": req.dominant_element,
        "cuisine": req.cuisine,
        "topIngredients": req.top_ingredients,
        "birthData": req.birth_data,
        "dietPreference": req.diet_preference,
        "dietary": req.dietary,
        "alchemicalState": req.alchemical_state,
        "thermodynamicProperties": req.thermodynamic_properties,
        "disallowedIngredients": req.disallowed_ingredients,
    });
    // Drop nulls to mirror Pydantic `exclude_none=True`.
    if let Value::Object(map) = &mut payload {
        map.retain(|_, v| !v.is_null());
    }
    if let Some(c) = catalog {
        payload["catalogContext"] = c.clone();
    }
    serde_json::to_string(&payload).unwrap_or_default()
}

/// Port of `_format_context`.
fn format_context(req: &CosmicRecipeRequest, catalog: Option<&Value>) -> String {
    let mut ctx = json!({
        "dominantElement": req.dominant_element,
        "cuisine": req.cuisine,
        "topIngredients": req.top_ingredients,
        "birthData": req.birth_data,
        "dietPreference": req.diet_preference.clone().unwrap_or_else(|| "omnivore".to_string()),
        "dietary": req.dietary,
        "alchemicalState": req.alchemical_state,
        "thermodynamicProperties": req.thermodynamic_properties,
        "disallowedIngredients": req.disallowed_ingredients,
    });
    if let Some(c) = catalog {
        ctx["catalogCandidates"] = c.clone();
    }
    serde_json::to_string(&ctx).unwrap_or_default()
}

/// A compact JSON Schema describing the expected recipe object. Embedded in the
/// prompt and used for Anthropic tool-forcing.
fn recipe_json_schema() -> Value {
    json!({
        "type": "object",
        "required": [
            "id", "title", "short_description", "category", "cuisine", "difficulty",
            "yields", "total_time", "alignment_score", "alignment_notes", "tags",
            "ingredients", "steps", "elementalBalance", "nutrition",
            "finishing_and_serving", "leftovers_and_storage", "astro_explanation"
        ],
        "properties": {
            "id": {"type": "string"},
            "title": {"type": "string"},
            "short_description": {"type": "string"},
            "category": {"type": "string", "enum": [
                "Beverages","Breakfast","Dessert","Dinner","Lunch","Salad","Sauce",
                "Side","Soup","Appetizer","Condiment"]},
            "cuisine": {"type": "string"},
            "difficulty": {"type": "string", "enum": ["beginner","intermediate","advanced"]},
            "yields": {"type": "number"},
            "total_time": {"type": "number"},
            "alignment_score": {"type": "object", "required": [
                "overall","ingredients_fit","diet_fit","time_fit","astro_fit"]},
            "alignment_notes": {"type": "array", "items": {"type": "string"}},
            "tags": {"type": "object"},
            "ingredients": {"type": "array", "minItems": 1},
            "steps": {"type": "array", "minItems": 1},
            "elementalBalance": {"type": "object", "required": ["fire","earth","water","air"]},
            "nutrition": {"type": "object", "required": ["calories","protein","carbohydrates","fat"]},
            "vitamins": {"type": "array", "items": {"type": "string"}},
            "minerals": {"type": "array", "items": {"type": "string"}},
            "finishing_and_serving": {"type": "object"},
            "leftovers_and_storage": {"type": "object"},
            "astro_explanation": {"type": "object"}
        }
    })
}

/// Port of `_build_recipe_prompt`.
fn build_recipe_prompt(
    req: &CosmicRecipeRequest,
    catalog: Option<&Value>,
    validation_feedback: Option<&str>,
) -> String {
    let retry_block = match validation_feedback {
        Some(fb) => format!(
            "\nPrevious output failed validation. Repair it and return a complete replacement JSON object. Validation feedback: {fb}\n"
        ),
        None => String::new(),
    };
    let schema = serde_json::to_string(&recipe_json_schema()).unwrap_or_default();
    format!(
        "Create one production-ready cosmic recipe for Alchm Kitchen.\n\nUser request: {prompt}\nContext JSON: {context}\n{retry_block}\nRules:\n- Return exactly one JSON object matching the schema below. No markdown, no prose wrapper.\n- Use concise, single-line string values. Escape any internal newline as \\n.\n- Include every required field even when data is estimated.\n- Keep ingredients practical for a home cook and avoid disallowed ingredients.\n- Respect the diet preference exactly. If the context is sparse, make reasonable culinary assumptions.\n- If catalogCandidates are present, prefer adapting the strongest catalog match over inventing a dish from scratch.\n- Keep the brand voice modern, grounded, and appetizing. Do not borrow a historical-figure persona.\n- Make elementalBalance values add up to approximately 100.\n\nJSON schema:\n{schema}",
        prompt = req.prompt,
        context = format_context(req, catalog),
        retry_block = retry_block,
        schema = schema,
    )
}

/// Port of `_strip_model_json`: drop markdown fences and isolate the JSON object.
pub fn strip_model_json(text: &str) -> String {
    let mut stripped = text.trim().to_string();
    // Leading ```json / ``` fence (case-insensitive).
    let lower = stripped.to_lowercase();
    if let Some(rest) = lower.strip_prefix("```json") {
        let cut = stripped.len() - rest.len();
        stripped = stripped[cut..].trim_start().to_string();
    } else if stripped.starts_with("```") {
        stripped = stripped[3..].trim_start().to_string();
    }
    if stripped.ends_with("```") {
        let end = stripped.len() - 3;
        stripped = stripped[..end].trim_end().to_string();
    }
    if stripped.starts_with('{') {
        return stripped;
    }
    if let (Some(start), Some(end)) = (stripped.find('{'), stripped.rfind('}'))
        && end > start
    {
        return stripped[start..=end].to_string();
    }
    stripped
}

/// Parse + validate a model response into a `CosmicRecipeResponse`.
fn parse_recipe(text: &str) -> Result<CosmicRecipeResponse, String> {
    let raw = strip_model_json(text);
    let parsed: CosmicRecipeResponse =
        serde_json::from_str(&raw).map_err(|e| format!("ValidationError: {e}"))?;
    parsed.validate()?;
    Ok(parsed)
}

fn cache_get(state: &AppState, key: &str) -> Option<CosmicRecipeResponse> {
    let cache = state.recipe_cache.lock().ok()?;
    let (expires, recipe) = cache.get(key)?;
    if *expires <= Instant::now() {
        None
    } else {
        Some(recipe.clone())
    }
}

fn cache_set(state: &AppState, key: String, recipe: &CosmicRecipeResponse) {
    let ttl = cache_ttl();
    if ttl.is_zero() {
        return;
    }
    if let Ok(mut cache) = state.recipe_cache.lock() {
        cache.insert(key, (Instant::now() + ttl, recipe.clone()));
    }
}

/// Port of `recipe_generation.generate_cosmic_recipe`.
pub async fn generate_cosmic_recipe(
    state: &AppState,
    req: &CosmicRecipeRequest,
    tier: &str,
    anthropic_model: Option<&str>,
    catalog: Option<&Value>,
) -> Result<CosmicRecipeResponse, AppError> {
    let cache_key = stable_cache_key(req, catalog);
    if let Some(cached) = cache_get(state, &cache_key) {
        return Ok(cached);
    }

    let chain = llm::build_chain(tier, anthropic_model, None);
    let persona = build_alchemical_chef_prompt(Some(&json!({
        "dominantElement": req.dominant_element,
        "dietPreference": req.diet_preference,
        "cuisine": req.cuisine,
        "topIngredients": req.top_ingredients,
    })));
    let schema = recipe_json_schema();
    let mut last_error = "model did not return a valid recipe".to_string();

    for attempt in 0..2 {
        let feedback = if attempt > 0 {
            Some(last_error.as_str())
        } else {
            None
        };
        let user_message = build_recipe_prompt(req, catalog, feedback);
        let opts = CallOptions {
            max_tokens: max_tokens(),
            temperature: Some(0.35),
            json_object: true,
            structured_schema: Some(schema.clone()),
        };
        let result = llm::run_chain(&state.http, &chain, &persona, "", &user_message, &opts).await;

        let Some(result) = result else {
            last_error = "all configured recipe providers were unavailable".to_string();
            break;
        };

        match parse_recipe(&result.text) {
            Ok(recipe) => {
                cache_set(state, cache_key, &recipe);
                return Ok(recipe);
            }
            Err(e) => {
                last_error = e;
                tracing::warn!(
                    attempt = attempt + 1,
                    tier = tier,
                    "recipe_validation_failed: {}",
                    last_error.chars().take(400).collect::<String>()
                );
            }
        }
    }

    Err(AppError::Upstream(
        axum::http::StatusCode::BAD_GATEWAY,
        json!({
            "error": "Recipe model returned malformed output after retry",
            "message": last_error,
        }),
    ))
}

/// Agent id used for feed emission (kept for parity with the Python flow).
pub fn agent_id() -> &'static str {
    COSMIC_RECIPE_AGENT_ID
}
