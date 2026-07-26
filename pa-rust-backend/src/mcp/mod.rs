//! Lightweight JSON-RPC 2.0 MCP tool server. Ports the tool *interface* of
//! `backend/planetary_agents_mcp_server.py` and `backend/alchm_mcp.py`.
//!
//! Tools that are pure functions of the astrological math are ported natively
//! and fully functional:
//!   - `get_live_sky_transits`   — current positions + alchemical summary
//!   - `compute_synastry_overlay`— inter-chart aspects + harmony score
//!   - `get_chart_alchemy`       — alchemize_detailed for a given moment
//!
//! Tools that depend on the external Alchm *data* MCP (the sibling Bun server's
//! ingredient/recipe catalog) or on the not-yet-ported RAG/persona chat pipeline
//! are advertised but return a clearly-labeled degraded result rather than
//! fabricating data:
//!   - `alchemize_ingredients`, `generate_cosmic_recipe`,
//!     `chat_with_planetary_agent`, `get_agent_feed_discussion`,
//!     `synthesize_culinary_debate`, `plan_weekly_menu`.

use crate::astro::alchemy::{self, PositionInput};
use crate::astro::aspects::Aspect;
use crate::astro::constants::ASPECT_DEFINITIONS;
use crate::astro::positions::{BirthInfo, datetime_from_parts, planetary_positions_for};
use chrono::{Duration, Utc};
use serde_json::{Value, json};

pub const SERVER_NAME: &str = "planetary-agents-mcp-server";
pub const SERVER_VERSION: &str = "1.0.0";
pub const PROTOCOL_VERSION: &str = "2024-11-05";

/// Tool catalog advertised by `tools/list`.
pub fn tool_list() -> Value {
    json!([
        {
            "name": "get_live_sky_transits",
            "description": "Current planetary positions and alchemical summary for the live sky (deterministic mean-motion model).",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "latitude": {"type": "number"},
                    "longitude": {"type": "number"}
                }
            }
        },
        {
            "name": "compute_synastry_overlay",
            "description": "Inter-chart (synastry) aspects and a harmony score between two charts.",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "chartA": {"type": "object", "description": "planet -> {sign, degree}"},
                    "chartB": {"type": "object", "description": "planet -> {sign, degree}"},
                    "maxOrb": {"type": "number", "description": "optional orb ceiling (default 6.0)"}
                },
                "required": ["chartA", "chartB"]
            }
        },
        {
            "name": "get_chart_alchemy",
            "description": "Full alchemical breakdown (ESMS, thermodynamics, aspects, per-planet) for a moment.",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "year": {"type": "integer"}, "month": {"type": "integer"},
                    "day": {"type": "integer"}, "hour": {"type": "integer"},
                    "minute": {"type": "integer"},
                    "customPlanets": {"type": "object"}
                }
            }
        },
        degraded_tool("alchemize_ingredients", "Map ingredients to alchemical properties (requires the Alchm data MCP catalog)."),
        degraded_tool("generate_cosmic_recipe", "Seed a cosmic recipe from the catalog (requires the Alchm data MCP catalog)."),
        degraded_tool("chat_with_planetary_agent", "Chat with a planetary agent (requires the not-yet-ported RAG/persona pipeline)."),
        degraded_tool("get_agent_feed_discussion", "Multi-agent feed discussion (requires the not-yet-ported chat pipeline)."),
        degraded_tool("synthesize_culinary_debate", "Synthesize a culinary debate (requires the not-yet-ported chat pipeline)."),
        degraded_tool("plan_weekly_menu", "Plan a weekly menu (requires the not-yet-ported chat + catalog pipeline).")
    ])
}

fn degraded_tool(name: &str, description: &str) -> Value {
    json!({
        "name": name,
        "description": description,
        "inputSchema": {"type": "object"}
    })
}

/// Convert an arbitrary `planet -> {sign, degree}` object to alchemical inputs.
///
/// DELIBERATELY UNGUARDED by `ensure_complete_from_value`, unlike every other
/// caller-supplied chart. These inputs (`chartA`/`chartB` of
/// `compute_synastry_overlay`) are caller-supplied, but they reach only
/// `interchart_aspects` — pairwise angular separations. They never enter
/// `alchemize*`, so they cannot touch the ESMS accumulators, Kalchm, or the
/// Monica singularity that the completeness guard exists to prevent. A synastry
/// overlay of a few named bodies is a legitimate, self-describing request: every
/// aspect it found is listed in the response, so a partial chart yields fewer
/// aspects rather than a fabricated number. The empty-chart check in
/// `compute_synastry_overlay` remains the boundary for this tool.
fn chart_inputs(arg: Option<&Value>) -> Vec<(String, PositionInput)> {
    match arg {
        Some(v) => alchemy::ensure_from_value(v),
        None => Vec::new(),
    }
}

/// Longitude from a `PositionInput` (sign index × 30 + degree).
fn longitude(p: &PositionInput) -> f64 {
    use crate::astro::constants::SIGNS_LOWER;
    let sl = p.sign.to_lowercase();
    match SIGNS_LOWER.iter().position(|s| *s == sl) {
        Some(idx) => idx as f64 * 30.0 + p.degree,
        None => 0.0,
    }
}

/// Cross-chart aspects between two position sets (the synastry overlay).
fn interchart_aspects(
    a: &[(String, PositionInput)],
    b: &[(String, PositionInput)],
    max_orb: f64,
) -> Vec<Aspect> {
    let mut out = Vec::new();
    for (pa, posa) in a {
        for (pb, posb) in b {
            let mut diff = (longitude(posa) - longitude(posb)).abs();
            if diff > 180.0 {
                diff = 360.0 - diff;
            }
            for (name, def_orb, angle) in ASPECT_DEFINITIONS {
                let orb = (diff - angle).abs();
                if orb <= def_orb && orb <= max_orb {
                    out.push(Aspect {
                        planet1: pa.clone(),
                        planet2: pb.clone(),
                        aspect_type: name.to_string(),
                        orb,
                        strength: 1.0 - orb / def_orb,
                    });
                }
            }
        }
    }
    out
}

/// Dispatch a `tools/call` to the named tool. Returns the tool's JSON payload.
pub fn call_tool(name: &str, args: &Value) -> Value {
    match name {
        "get_live_sky_transits" => {
            let dt = Utc::now().naive_utc();
            let positions = planetary_positions_for(dt);
            let prev = planetary_positions_for(dt - Duration::days(1));
            let current = alchemy::ensure_from_positions(&positions);
            let historical = alchemy::ensure_from_positions(&prev);
            let result = alchemy::alchemize(&current, Some(&historical), dt);
            json!({
                "timestamp": dt.format("%Y-%m-%dT%H:%M:%S").to_string(),
                "planetary_positions": positions,
                "alchemy": {
                    "esms": result.esms,
                    "elementalProperties": result.elemental_properties,
                    "thermodynamicProperties": result.thermodynamic_properties,
                    "dominantElement": result.metadata.dominant_element,
                    "isDiurnal": result.metadata.is_diurnal,
                },
                "source": "pa-rust-backend/native",
            })
        }
        "compute_synastry_overlay" => {
            let a = chart_inputs(args.get("chartA"));
            let b = chart_inputs(args.get("chartB"));
            if a.is_empty() || b.is_empty() {
                return json!({
                    "error": "compute_synastry_overlay requires non-empty chartA and chartB",
                });
            }
            let max_orb = args.get("maxOrb").and_then(Value::as_f64).unwrap_or(6.0);
            let aspects = interchart_aspects(&a, &b, max_orb);
            let harmonious = ["trine", "sextile", "conjunction"];
            let challenging = ["square", "opposition"];
            let harmony = aspects
                .iter()
                .filter(|x| harmonious.contains(&x.aspect_type.as_str()))
                .count();
            let tension = aspects
                .iter()
                .filter(|x| challenging.contains(&x.aspect_type.as_str()))
                .count();
            let total = aspects.len();
            let harmony_ratio = if total > 0 {
                harmony as f64 / total as f64
            } else {
                0.0
            };
            json!({
                "interchartAspects": aspects,
                "scores": {
                    "total": total,
                    "harmonious": harmony,
                    "challenging": tension,
                    "harmonyRatio": harmony_ratio,
                },
            })
        }
        "get_chart_alchemy" => {
            let dt = datetime_from_parts(
                args.get("year").and_then(Value::as_i64),
                args.get("month").and_then(Value::as_i64),
                args.get("day").and_then(Value::as_i64),
                args.get("hour").and_then(Value::as_i64),
                args.get("minute").and_then(Value::as_i64),
            );
            let generated = planetary_positions_for(dt);
            let prev = planetary_positions_for(dt - Duration::days(1));
            // A caller-supplied chart must be COMPLETE. A partial one is
            // refused with the tool's normal `{"error": ...}` shape (which
            // `handle_jsonrpc` turns into `isError: true`) rather than
            // alchemized into a plausible-looking Monica — see
            // `alchemy::ensure_complete_from_value`. A present-but-malformed
            // value (a string, a number, a list) normalizes to nothing, so it
            // is reported as a chart missing every body instead of silently
            // falling back to the server's own chart. Absent or null
            // `customPlanets` keeps the generated-chart path exactly as before.
            let current = match args.get("customPlanets") {
                Some(v) if !v.is_null() => match alchemy::ensure_complete_from_value(v) {
                    Ok(inputs) => inputs,
                    Err(incomplete) => return json!({"error": incomplete.detail()}),
                },
                _ => alchemy::ensure_from_positions(&generated),
            };
            let historical = alchemy::ensure_from_positions(&prev);
            let result = alchemy::alchemize_detailed(&current, Some(&historical), dt);
            json!({
                "birth_info": BirthInfo::from_dt(dt),
                "alchemy": result,
            })
        }
        // Data/LLM-dependent tools: advertised, but honestly degraded.
        "alchemize_ingredients"
        | "generate_cosmic_recipe"
        | "chat_with_planetary_agent"
        | "get_agent_feed_discussion"
        | "synthesize_culinary_debate"
        | "plan_weekly_menu" => {
            json!({
                "degraded": true,
                "tool": name,
                "reason": "This tool depends on the external Alchm data MCP (Bun) server or the not-yet-ported RAG/persona chat pipeline, neither of which is part of the Rust core port.",
            })
        }
        other => json!({"error": format!("unknown tool: {other}")}),
    }
}

/// Handle one JSON-RPC request. Returns `None` for notifications (no response).
pub fn handle_jsonrpc(req: &Value) -> Option<Value> {
    let id = req.get("id").cloned();
    let method = req.get("method").and_then(Value::as_str).unwrap_or("");
    let params = req.get("params").cloned().unwrap_or(Value::Null);

    // Notifications have no id and expect no response.
    if id.is_none() && method.starts_with("notifications/") {
        return None;
    }

    let result = match method {
        "initialize" => Ok(json!({
            "protocolVersion": PROTOCOL_VERSION,
            "capabilities": {"tools": {}},
            "serverInfo": {"name": SERVER_NAME, "version": SERVER_VERSION},
        })),
        "ping" => Ok(json!({})),
        "tools/list" => Ok(json!({"tools": tool_list()})),
        "tools/call" => {
            let name = params.get("name").and_then(Value::as_str).unwrap_or("");
            let args = params.get("arguments").cloned().unwrap_or(json!({}));
            if name.is_empty() {
                Err((-32602, "missing tool name".to_string()))
            } else {
                let payload = call_tool(name, &args);
                let text = serde_json::to_string(&payload).unwrap_or_default();
                Ok(json!({
                    "content": [{"type": "text", "text": text}],
                    "isError": payload.get("error").is_some(),
                }))
            }
        }
        other => Err((-32601, format!("method not found: {other}"))),
    };

    Some(match result {
        Ok(value) => json!({"jsonrpc": "2.0", "id": id, "result": value}),
        Err((code, message)) => json!({
            "jsonrpc": "2.0",
            "id": id,
            "error": {"code": code, "message": message},
        }),
    })
}
