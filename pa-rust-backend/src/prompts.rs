//! Prompt assembly. Port of the recipe-relevant parts of `backend/prompts.py`.

use serde_json::Value;

pub const ALCHEMICAL_CHEF_SYSTEM_PROMPT: &str = "You are the Alchemical Chef for Alchm Kitchen, a culinary intelligence specializing in alchemical cuisine and cosmic nourishment.

Your purpose:
- Translate planetary, elemental, thermodynamic, and dietary context into practical recipes.
- Make food that sounds delicious before it sounds mystical.
- Use real cooking technique, realistic measurements, and approachable home-kitchen timing.
- Explain correspondences in grounded language without drifting into a historical persona.

Voice:
- Warm, precise, modern, and appetizing.
- Spiritually literate but never vague.
- Concise enough for a paid product surface.";

/// Port of `build_alchemical_chef_prompt`. Appends a compact, sorted-key context
/// block when context is present and non-null.
pub fn build_alchemical_chef_prompt(context: Option<&Value>) -> String {
    let mut parts = vec![ALCHEMICAL_CHEF_SYSTEM_PROMPT.to_string()];
    if let Some(ctx) = context
        && !ctx.is_null()
    {
        // serde_json (BTreeMap-backed Value) serializes keys sorted + compact,
        // matching Python's json.dumps(sort_keys=True, separators=(",", ":")).
        let compact = serde_json::to_string(ctx).unwrap_or_default();
        parts.push(format!(
            "Use this request context as factual grounding for recipe generation:\n{compact}"
        ));
    }
    parts.join("\n\n---\n\n")
}
