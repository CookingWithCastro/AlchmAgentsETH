//! Unit tests for the recipe pipeline's parsing/validation (the parts that don't
//! require a live LLM): markdown-fence stripping, schema deserialization, and the
//! `min_length` validation that triggers the single retry.

use pa_rust_backend::recipe::strip_model_json;
use pa_rust_backend::schemas::CosmicRecipeResponse;

const VALID_RECIPE: &str = r#"{
  "id": "r-001",
  "title": "Libra Equinox Bowl",
  "short_description": "A balanced grain bowl.",
  "category": "Lunch",
  "cuisine": "Mediterranean",
  "difficulty": "beginner",
  "yields": 2,
  "total_time": 25,
  "alignment_score": {"overall": 88, "ingredients_fit": 90, "diet_fit": 85, "time_fit": 80, "astro_fit": 92},
  "alignment_notes": ["Airy and bright"],
  "tags": {"diet": ["vegetarian"], "cuisine": ["Mediterranean"], "meal_type": "lunch",
           "flavor_profile": ["bright"], "cooking_methods": ["toss"], "elements": ["Air"], "planets": ["Venus"]},
  "ingredients": [{"name": "quinoa", "quantity": "1", "unit": "cup", "optional": false, "substitutions": []}],
  "steps": [{"step_number": 1, "instruction": "Cook quinoa.", "time_minutes": 15, "cooking_method": "boil", "tips": []}],
  "elementalBalance": {"fire": 20, "earth": 25, "water": 25, "air": 30},
  "nutrition": {"calories": 420, "protein": 14, "carbohydrates": 60, "fat": 12},
  "finishing_and_serving": {"garnish_and_plating": "Herbs", "doneness_cues": "Tender", "serving_suggestions": "Warm"},
  "leftovers_and_storage": {"can_store": true, "storage_instructions": "Fridge", "storage_lifespan_days": 3},
  "astro_explanation": {"summary": "Balance", "correspondences": ["Libra"]}
}"#;

#[test]
fn strips_json_fences_and_prose() {
    let wrapped = format!("Here is your recipe:\n```json\n{VALID_RECIPE}\n```\nEnjoy!");
    let stripped = strip_model_json(&wrapped);
    assert!(stripped.starts_with('{'));
    assert!(stripped.ends_with('}'));
    let parsed: CosmicRecipeResponse = serde_json::from_str(&stripped).expect("parses");
    assert_eq!(parsed.title, "Libra Equinox Bowl");
    parsed.validate().expect("valid");
}

#[test]
fn parses_bare_object() {
    let stripped = strip_model_json(VALID_RECIPE);
    let parsed: CosmicRecipeResponse = serde_json::from_str(&stripped).unwrap();
    assert_eq!(parsed.ingredients.len(), 1);
    assert_eq!(parsed.steps.len(), 1);
}

#[test]
fn validation_rejects_empty_ingredients() {
    let mut v: serde_json::Value = serde_json::from_str(VALID_RECIPE).unwrap();
    v["ingredients"] = serde_json::json!([]);
    let parsed: CosmicRecipeResponse = serde_json::from_value(v).unwrap();
    assert!(parsed.validate().is_err(), "empty ingredients must fail");
}

#[test]
fn request_alias_normalization() {
    use pa_rust_backend::schemas::{CosmicRecipeRequest, normalize_recipe_request};
    // `context` is merged, snake_case aliases are mapped.
    let raw = serde_json::json!({
        "prompt": "warm soup",
        "context": {"diet": "vegan", "preferredCuisine": "Thai"},
        "dietaryRestrictions": ["gluten-free"]
    });
    let normalized = normalize_recipe_request(raw);
    let req: CosmicRecipeRequest = serde_json::from_value(normalized).unwrap();
    assert_eq!(req.diet_preference.as_deref(), Some("vegan"));
    assert_eq!(req.cuisine.as_deref(), Some("Thai"));
    assert_eq!(req.dietary, vec!["gluten-free"]);
    assert_eq!(req.prompt, "warm soup");
}
