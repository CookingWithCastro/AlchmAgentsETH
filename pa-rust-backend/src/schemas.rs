//! Request/response types, ported from `backend/schemas.py`. Only the shapes the
//! Rust service actually serves are included; the recipe schema is the largest.

use serde::{Deserialize, Serialize};
use serde_json::{Map, Value};

// ---------------------------------------------------------------------------
// Health
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize)]
pub struct HealthResponse {
    pub status: String,
    pub service: String,
    pub database: String,
}

// ---------------------------------------------------------------------------
// Planetary / chart requests
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Deserialize)]
pub struct BulkPositionsRequest {
    #[serde(rename = "startDate")]
    pub start_date: String,
    #[serde(rename = "endDate")]
    pub end_date: String,
    #[serde(rename = "intervalHours", default = "default_interval")]
    pub interval_hours: f64,
    #[serde(default)]
    pub latitude: f64,
    #[serde(default)]
    pub longitude: f64,
}

fn default_interval() -> f64 {
    1.0
}

#[derive(Debug, Clone, Default, Deserialize)]
pub struct PhilosophersStoneRequest {
    pub year: Option<i64>,
    pub month: Option<i64>,
    pub day: Option<i64>,
    pub hour: Option<i64>,
    pub minute: Option<i64>,
    #[serde(rename = "customPlanets")]
    pub custom_planets: Option<Value>,
}

/// Request for the synthesized `/api/astrologize` endpoint. Superset of the
/// philosophers-stone request plus optional ascendant + coordinates.
#[derive(Debug, Clone, Default, Deserialize)]
pub struct AstrologizeRequest {
    pub year: Option<i64>,
    pub month: Option<i64>,
    pub day: Option<i64>,
    pub hour: Option<i64>,
    pub minute: Option<i64>,
    pub date: Option<String>,
    #[serde(rename = "customPlanets")]
    pub custom_planets: Option<Value>,
    /// Optional ascendant as a sign name (e.g. "Leo") for whole-sign houses.
    pub ascendant: Option<String>,
    pub latitude: Option<f64>,
    pub longitude: Option<f64>,
}

// ---------------------------------------------------------------------------
// Cosmic recipe — request
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Default, Deserialize, Serialize)]
pub struct CosmicRecipeRequest {
    #[serde(default = "default_recipe_prompt")]
    pub prompt: String,
    #[serde(rename = "dominantElement", default)]
    pub dominant_element: Option<String>,
    #[serde(default)]
    pub cuisine: Option<String>,
    #[serde(rename = "topIngredients", default)]
    pub top_ingredients: Vec<String>,
    #[serde(rename = "birthData", default)]
    pub birth_data: Option<Value>,
    #[serde(rename = "dietPreference", default)]
    pub diet_preference: Option<String>,
    #[serde(default)]
    pub dietary: Vec<String>,
    #[serde(rename = "alchemicalState", default)]
    pub alchemical_state: Option<Value>,
    #[serde(rename = "thermodynamicProperties", default)]
    pub thermodynamic_properties: Option<Value>,
    #[serde(rename = "disallowedIngredients", default)]
    pub disallowed_ingredients: Vec<String>,
    #[serde(rename = "userId", default)]
    pub user_id: Option<String>,
    #[serde(rename = "modelTier", default)]
    pub model_tier: Option<String>,
}

fn default_recipe_prompt() -> String {
    "A nourishing, restorative meal aligned with today's cosmic energies.".to_string()
}

/// Port of `CosmicRecipeRequest.normalize_context_and_aliases` (a Pydantic
/// `model_validator(mode="before")`). Merges a nested `context` object and maps
/// snake_case aliases onto the canonical camelCase keys, then the result is
/// deserialized into `CosmicRecipeRequest`.
pub fn normalize_recipe_request(value: Value) -> Value {
    let Value::Object(mut data) = value else {
        return value;
    };

    // Merge nested `context`: context values are the base, top-level non-null
    // values override.
    if let Some(Value::Object(context)) = data.remove("context") {
        let mut merged: Map<String, Value> = context;
        for (k, v) in data.into_iter() {
            if !v.is_null() {
                merged.insert(k, v);
            }
        }
        data = merged;
    }

    let alias = |data: &mut Map<String, Value>, from: &str, to: &str| {
        if data.contains_key(from)
            && !data.contains_key(to)
            && let Some(v) = data.get(from).cloned()
        {
            data.insert(to.to_string(), v);
        }
    };
    alias(&mut data, "diet", "dietPreference");
    alias(&mut data, "dietaryRestrictions", "dietary");
    alias(&mut data, "preferredCuisine", "cuisine");
    alias(&mut data, "ingredients_main", "topIngredients");
    alias(&mut data, "disallowed_ingredients", "disallowedIngredients");

    Value::Object(data)
}

// ---------------------------------------------------------------------------
// Cosmic recipe — response (validated; deserialization failure → retry)
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct AlignmentScore {
    pub overall: f64,
    pub ingredients_fit: f64,
    pub diet_fit: f64,
    pub time_fit: f64,
    pub astro_fit: f64,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct RecipeTags {
    pub diet: Vec<String>,
    pub cuisine: Vec<String>,
    pub meal_type: String,
    pub flavor_profile: Vec<String>,
    pub cooking_methods: Vec<String>,
    pub elements: Vec<String>,
    pub planets: Vec<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct RecipeIngredient {
    pub name: String,
    pub quantity: String,
    pub unit: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub household_description: Option<String>,
    pub optional: bool,
    pub substitutions: Vec<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct RecipeStep {
    pub step_number: i64,
    pub instruction: String,
    pub time_minutes: f64,
    pub cooking_method: String,
    pub tips: Vec<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct ElementalBalance {
    pub fire: f64,
    pub earth: f64,
    pub water: f64,
    pub air: f64,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct RecipeNutrition {
    pub calories: f64,
    pub protein: f64,
    pub carbohydrates: f64,
    pub fat: f64,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct FinishingAndServing {
    pub garnish_and_plating: String,
    pub doneness_cues: String,
    pub serving_suggestions: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct LeftoversAndStorage {
    pub can_store: bool,
    pub storage_instructions: String,
    pub storage_lifespan_days: f64,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct AstroExplanation {
    pub summary: String,
    pub correspondences: Vec<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct CosmicRecipeResponse {
    pub id: String,
    pub title: String,
    pub short_description: String,
    pub category: String,
    pub cuisine: String,
    pub difficulty: String,
    pub yields: f64,
    pub total_time: f64,
    pub alignment_score: AlignmentScore,
    pub alignment_notes: Vec<String>,
    pub tags: RecipeTags,
    pub ingredients: Vec<RecipeIngredient>,
    pub steps: Vec<RecipeStep>,
    #[serde(rename = "elementalBalance")]
    pub elemental_balance: ElementalBalance,
    pub nutrition: RecipeNutrition,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub vitamins: Option<Vec<String>>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub minerals: Option<Vec<String>>,
    pub finishing_and_serving: FinishingAndServing,
    pub leftovers_and_storage: LeftoversAndStorage,
    pub astro_explanation: AstroExplanation,
}

impl CosmicRecipeResponse {
    /// Light post-deserialization validation mirroring the Pydantic
    /// `min_length=1` constraints that serde itself can't express.
    pub fn validate(&self) -> Result<(), String> {
        if self.ingredients.is_empty() {
            return Err("ingredients: must contain at least one item".to_string());
        }
        if self.steps.is_empty() {
            return Err("steps: must contain at least one item".to_string());
        }
        Ok(())
    }
}
