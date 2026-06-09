//! Cost-tier resolution. Mirrors `main.py:_resolve_tier` and `ANTHROPIC_TIER_MODEL`.

/// Tier rank: lower index = cheaper. Unknown tiers sort as `primary`.
fn rank(tier: &str) -> usize {
    match tier {
        "free" => 0,
        "cheap_fast" => 1,
        "primary" => 2,
        "reflective" => 3,
        _ => 2,
    }
}

const ORDER: [&str; 4] = ["free", "cheap_fast", "primary", "reflective"];

/// Cap the requested tier by the configured ceiling (`HISTORICAL_AGENT_MAX_TIER`).
pub fn resolve_tier(requested: &str, max_tier: &str) -> String {
    let r = rank(requested).min(rank(max_tier));
    ORDER[r].to_string()
}

/// First-choice Anthropic model for a tier (`ANTHROPIC_TIER_MODEL`). `free` has none.
pub fn anthropic_model_for(tier: &str) -> Option<&'static str> {
    match tier {
        "cheap_fast" => Some("claude-haiku-4-5-20251001"),
        "primary" => Some("claude-sonnet-4-6"),
        "reflective" => Some("claude-opus-4-7"),
        _ => None,
    }
}
