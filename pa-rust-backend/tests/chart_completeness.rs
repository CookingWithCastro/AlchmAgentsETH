//! A caller-supplied chart must be COMPLETE at the boundary.
//!
//! A partial chart is not a weaker chart, it is different physics: dropping
//! bodies collapses the ESMS axes toward each other, driving Kalchm to 1 and
//! Monica through its `1/ln K` singularity. The result is finite and
//! plausible-looking (a measured 3-body payload gives `kalchm 0.99996…`,
//! `monica -6309.85`), so nothing downstream can tell it from a real reading.
//! These tests pin the rejection — and pin that the paths which do NOT supply a
//! chart, plus complete supplied charts, are unaffected.
//!
//! The contract mirrors `_require_complete_chart` in `backend/main.py`, message
//! wording and singular/plural included.

use axum::body::Body;
use axum::http::{Request, StatusCode};
use pa_rust_backend::astro::alchemy::ensure_complete_from_value;
use pa_rust_backend::routes::build_router;
use pa_rust_backend::state::AppState;
use serde_json::{Value, json};
use tower::ServiceExt; // oneshot

fn test_state() -> AppState {
    let config = pa_rust_backend::config::AppConfig::from_env();
    AppState::new(config, reqwest::Client::new(), None)
}

async fn body_json(resp: axum::response::Response) -> Value {
    let bytes = axum::body::to_bytes(resp.into_body(), 4 * 1024 * 1024)
        .await
        .unwrap();
    serde_json::from_slice(&bytes).unwrap()
}

async fn post(uri: &str, body: Value) -> (StatusCode, Value) {
    let resp = build_router(test_state())
        .oneshot(
            Request::builder()
                .method("POST")
                .uri(uri)
                .header("content-type", "application/json")
                .body(Body::from(body.to_string()))
                .unwrap(),
        )
        .await
        .unwrap();
    let status = resp.status();
    (status, body_json(resp).await)
}

async fn get(uri: &str) -> (StatusCode, Value) {
    let resp = build_router(test_state())
        .oneshot(
            Request::builder()
                .method("GET")
                .uri(uri)
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    let status = resp.status();
    (status, body_json(resp).await)
}

/// Every required body, each in a distinct sign. Complete by construction.
fn complete_chart() -> Value {
    json!({
        "Sun": {"sign": "Aries", "degree": 10},
        "Moon": {"sign": "Taurus", "degree": 5},
        "Mercury": {"sign": "Gemini", "degree": 12},
        "Venus": {"sign": "Cancer", "degree": 3},
        "Mars": {"sign": "Leo", "degree": 21},
        "Jupiter": {"sign": "Virgo", "degree": 7},
        "Saturn": {"sign": "Libra", "degree": 18},
        "Uranus": {"sign": "Scorpio", "degree": 2},
        "Neptune": {"sign": "Sagittarius", "degree": 25},
        "Pluto": {"sign": "Capricorn", "degree": 14},
    })
}

/// The 3-body payload that measured `monica -6309.85` before the guard existed.
fn three_body_chart() -> Value {
    json!({
        "Sun": {"sign": "Aries", "degree": 10},
        "Moon": {"sign": "Taurus", "degree": 5},
        "Mercury": {"sign": "Gemini", "degree": 12},
    })
}

// --- The guard itself -------------------------------------------------------

#[test]
fn missing_bodies_are_named_in_canonical_order_and_pluralized() {
    let err = ensure_complete_from_value(&three_body_chart()).unwrap_err();
    assert_eq!(
        err.missing,
        vec![
            "Venus", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune", "Pluto"
        ]
    );
    assert_eq!(
        err.detail(),
        "customPlanets must be a complete chart; missing required bodies: \
         Venus, Mars, Jupiter, Saturn, Uranus, Neptune, Pluto"
    );
}

#[test]
fn a_single_missing_body_uses_the_singular_wording() {
    let mut chart = complete_chart();
    chart.as_object_mut().unwrap().remove("Mars");
    let err = ensure_complete_from_value(&chart).unwrap_err();
    assert_eq!(err.missing, vec!["Mars"]);
    assert_eq!(
        err.detail(),
        "customPlanets must be a complete chart; missing required body: Mars"
    );
}

/// `ensure_from_value` silently drops entries that are neither a sign string
/// nor a position object, so a body sent as `42` must count as missing — the
/// same defect as omitting it. Verified against the Python for `Mars: 42`.
#[test]
fn a_garbage_value_counts_as_missing() {
    for garbage in [json!(42), json!(null), json!(["Leo"]), json!(true)] {
        let mut chart = complete_chart();
        chart
            .as_object_mut()
            .unwrap()
            .insert("Mars".into(), garbage);
        let err = ensure_complete_from_value(&chart).unwrap_err();
        assert_eq!(err.missing, vec!["Mars"]);
        assert_eq!(
            err.detail(),
            "customPlanets must be a complete chart; missing required body: Mars"
        );
    }
}

#[test]
fn a_complete_chart_normalizes_without_error() {
    let inputs = ensure_complete_from_value(&complete_chart()).unwrap();
    assert_eq!(inputs.len(), 10);
    let mars = inputs.iter().find(|(p, _)| p == "Mars").unwrap();
    assert_eq!(mars.1.sign, "Leo");
    assert_eq!(mars.1.degree, 21.0);
    // Sign strings are accepted too (the other `ensure_from_value` shape).
    let strings = json!({
        "Sun": "Aries", "Moon": "Taurus", "Mercury": "Gemini", "Venus": "Cancer",
        "Mars": "Leo", "Jupiter": "Virgo", "Saturn": "Libra", "Uranus": "Scorpio",
        "Neptune": "Sagittarius", "Pluto": "Capricorn",
    });
    assert_eq!(ensure_complete_from_value(&strings).unwrap().len(), 10);
}

// --- POST /api/philosophers-stone/positions ---------------------------------

#[tokio::test]
async fn philosophers_stone_rejects_a_partial_chart_with_422() {
    let (status, v) = post(
        "/api/philosophers-stone/positions",
        json!({"year": 2026, "month": 6, "day": 8, "hour": 14, "minute": 30,
               "customPlanets": three_body_chart()}),
    )
    .await;

    assert_eq!(status, StatusCode::UNPROCESSABLE_ENTITY);
    let detail = v["detail"].as_str().unwrap();
    assert!(
        detail.starts_with("customPlanets must be a complete chart; missing required bodies: "),
        "detail was {detail}"
    );
    for body in [
        "Venus", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune", "Pluto",
    ] {
        assert!(detail.contains(body), "{body} not named in {detail}");
    }
    // The plausible-but-wrong reading must not have been served.
    assert!(v.get("monica").is_none());
    assert!(v.get("kalchm").is_none());
}

#[tokio::test]
async fn philosophers_stone_rejects_a_garbage_body_naming_it() {
    let mut chart = complete_chart();
    chart
        .as_object_mut()
        .unwrap()
        .insert("Mars".into(), json!(42));
    let (status, v) = post(
        "/api/philosophers-stone/positions",
        json!({"year": 2026, "month": 6, "day": 8, "customPlanets": chart}),
    )
    .await;

    assert_eq!(status, StatusCode::UNPROCESSABLE_ENTITY);
    assert_eq!(
        v["detail"],
        "customPlanets must be a complete chart; missing required body: Mars"
    );
}

#[tokio::test]
async fn philosophers_stone_rejects_an_empty_chart_naming_every_body() {
    let (status, v) = post(
        "/api/philosophers-stone/positions",
        json!({"year": 2026, "month": 6, "day": 8, "customPlanets": {}}),
    )
    .await;

    assert_eq!(status, StatusCode::UNPROCESSABLE_ENTITY);
    assert_eq!(
        v["detail"],
        "customPlanets must be a complete chart; missing required bodies: \
         Sun, Moon, Mercury, Venus, Mars, Jupiter, Saturn, Uranus, Neptune, Pluto"
    );
}

#[tokio::test]
async fn philosophers_stone_accepts_a_complete_chart_and_honours_its_signs() {
    let (status, v) = post(
        "/api/philosophers-stone/positions",
        json!({"year": 2026, "month": 6, "day": 8, "hour": 14, "minute": 30,
               "customPlanets": complete_chart()}),
    )
    .await;

    assert_eq!(status, StatusCode::OK);
    // The SUPPLIED signs drive the reading, not the server's generated chart
    // (which puts the Sun in Libra at this moment).
    assert_eq!(v["metadata"]["sunSign"], "Aries");
    assert_eq!(v["perPlanet"]["Mars"]["sign"], "Leo");
    assert_eq!(v["perPlanet"]["Pluto"]["sign"], "Capricorn");
    assert_eq!(v["perPlanet"].as_object().unwrap().len(), 10);
    // A complete chart stays far from equilibrium: Monica is present and sane.
    let monica = v["monica"].as_f64().expect("monica is a number");
    assert!(monica.abs() < 100.0, "monica {monica} looks near-singular");
}

#[tokio::test]
async fn philosophers_stone_without_custom_planets_is_unchanged() {
    // POST with no customPlanets → the server's own complete chart.
    let (status, v) = post(
        "/api/philosophers-stone/positions",
        json!({"year": 2026, "month": 6, "day": 8, "hour": 14, "minute": 30}),
    )
    .await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(v["metadata"]["sunSign"], "Libra");
    assert_eq!(v["perPlanet"].as_object().unwrap().len(), 10);
    assert!(v["monica"].as_f64().is_some());

    // GET reaches the same helper with `None` and must behave identically.
    let (status, g) =
        get("/api/philosophers-stone/positions?year=2026&month=6&day=8&hour=14&minute=30").await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(g, v);
}

// --- POST /api/astrologize --------------------------------------------------

#[tokio::test]
async fn astrologize_rejects_a_partial_chart_with_422() {
    let (status, v) = post(
        "/api/astrologize",
        json!({"year": 2026, "month": 6, "day": 8, "customPlanets": three_body_chart()}),
    )
    .await;

    assert_eq!(status, StatusCode::UNPROCESSABLE_ENTITY);
    let detail = v["detail"].as_str().unwrap();
    assert!(detail.contains("missing required bodies: "), "{detail}");
    assert!(detail.contains("Pluto"), "{detail}");
    assert!(v.get("alchemy").is_none());
}

#[tokio::test]
async fn astrologize_accepts_a_complete_chart_and_honours_its_signs() {
    let (status, v) = post(
        "/api/astrologize",
        json!({"year": 2026, "month": 6, "day": 8, "hour": 14, "minute": 30,
               "customPlanets": complete_chart()}),
    )
    .await;

    assert_eq!(status, StatusCode::OK);
    assert_eq!(v["planetary_positions"]["Sun"]["sign"], "Aries");
    assert_eq!(v["planetary_positions"]["Mars"]["sign"], "Leo");
    assert_eq!(v["alchemy"]["metadata"]["sunSign"], "Aries");
    // Ascendant defaults to the supplied Sun sign; houses follow it.
    assert_eq!(v["ascendant"], "Aries");
}

#[tokio::test]
async fn astrologize_without_custom_planets_is_unchanged() {
    let (status, v) = post(
        "/api/astrologize",
        json!({"year": 2026, "month": 6, "day": 8, "hour": 14, "minute": 30}),
    )
    .await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(v["planetary_positions"]["Sun"]["sign"], "Libra");
    assert_eq!(v["aspects"].as_array().unwrap().len(), 25);
}

// --- MCP `get_chart_alchemy` ------------------------------------------------

async fn call_tool(name: &str, arguments: Value) -> Value {
    let (status, v) = post(
        "/mcp",
        json!({"jsonrpc":"2.0","id":1,"method":"tools/call",
               "params":{"name": name, "arguments": arguments}}),
    )
    .await;
    assert_eq!(status, StatusCode::OK);
    v
}

#[tokio::test]
async fn mcp_get_chart_alchemy_rejects_a_partial_chart_as_a_tool_error() {
    let v = call_tool(
        "get_chart_alchemy",
        json!({"year": 2026, "month": 6, "day": 8, "customPlanets": three_body_chart()}),
    )
    .await;

    // MCP surfaces failures as `isError` + an `{"error": ...}` payload, not an
    // HTTP status: the JSON-RPC envelope itself is still a 200.
    assert_eq!(v["result"]["isError"], true);
    let text = v["result"]["content"][0]["text"].as_str().unwrap();
    let payload: Value = serde_json::from_str(text).unwrap();
    let err = payload["error"].as_str().unwrap();
    assert!(
        err.starts_with("customPlanets must be a complete chart; missing required bodies: "),
        "error was {err}"
    );
    assert!(err.contains("Pluto"), "{err}");
    assert!(payload.get("alchemy").is_none());
}

#[tokio::test]
async fn mcp_get_chart_alchemy_rejects_a_garbage_body_naming_it() {
    let mut chart = complete_chart();
    chart
        .as_object_mut()
        .unwrap()
        .insert("Mars".into(), json!(42));
    let v = call_tool(
        "get_chart_alchemy",
        json!({"year": 2026, "month": 6, "day": 8, "customPlanets": chart}),
    )
    .await;

    assert_eq!(v["result"]["isError"], true);
    let text = v["result"]["content"][0]["text"].as_str().unwrap();
    let payload: Value = serde_json::from_str(text).unwrap();
    assert_eq!(
        payload["error"],
        "customPlanets must be a complete chart; missing required body: Mars"
    );
}

#[tokio::test]
async fn mcp_get_chart_alchemy_accepts_a_complete_chart_and_honours_its_signs() {
    let v = call_tool(
        "get_chart_alchemy",
        json!({"year": 2026, "month": 6, "day": 8, "hour": 14, "minute": 30,
               "customPlanets": complete_chart()}),
    )
    .await;

    assert_eq!(v["result"]["isError"], false);
    let text = v["result"]["content"][0]["text"].as_str().unwrap();
    let payload: Value = serde_json::from_str(text).unwrap();
    assert_eq!(payload["alchemy"]["metadata"]["sunSign"], "Aries");
    assert_eq!(payload["alchemy"]["perPlanet"]["Mars"]["sign"], "Leo");
}

#[tokio::test]
async fn mcp_get_chart_alchemy_without_custom_planets_is_unchanged() {
    let v = call_tool(
        "get_chart_alchemy",
        json!({"year": 2026, "month": 6, "day": 8, "hour": 14, "minute": 30}),
    )
    .await;

    assert_eq!(v["result"]["isError"], false);
    let text = v["result"]["content"][0]["text"].as_str().unwrap();
    let payload: Value = serde_json::from_str(text).unwrap();
    assert_eq!(payload["alchemy"]["metadata"]["sunSign"], "Libra");
    assert_eq!(payload["birth_info"]["year"], 2026);
}

/// The synastry overlay takes caller-supplied charts too, but they reach only
/// the pairwise-aspect math — never `alchemize`, so never Kalchm or Monica.
/// A deliberately partial overlay stays legal; the guard does not apply there.
#[tokio::test]
async fn mcp_synastry_still_accepts_partial_charts() {
    let v = call_tool(
        "compute_synastry_overlay",
        json!({"chartA": {"Sun": {"sign": "Aries", "degree": 10}},
               "chartB": {"Moon": {"sign": "Libra", "degree": 11}}}),
    )
    .await;

    assert_eq!(v["result"]["isError"], false);
    let text = v["result"]["content"][0]["text"].as_str().unwrap();
    let payload: Value = serde_json::from_str(text).unwrap();
    assert!(
        payload["interchartAspects"]
            .as_array()
            .unwrap()
            .iter()
            .any(|a| a["type"] == "opposition")
    );
}
