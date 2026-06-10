//! HTTP integration tests against the assembled Axum router. Exercises
//! `/api/health` and `/api/astrologize` end-to-end and checks the mathematical
//! outputs the migration task calls for.

use axum::body::Body;
use axum::http::{Request, StatusCode};
use pa_rust_backend::routes::build_router;
use pa_rust_backend::state::AppState;
use serde_json::{Value, json};
use tower::ServiceExt; // oneshot

/// Build state with no DB and an unused HTTP client.
fn test_state() -> AppState {
    let config = pa_rust_backend::config::AppConfig::from_env();
    let http = reqwest::Client::new();
    AppState::new(config, http, None)
}

async fn body_json(resp: axum::response::Response) -> Value {
    let bytes = axum::body::to_bytes(resp.into_body(), 4 * 1024 * 1024)
        .await
        .unwrap();
    serde_json::from_slice(&bytes).unwrap()
}

#[tokio::test]
async fn health_reports_status_and_db() {
    let app = build_router(test_state());
    let resp = app
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/api/health")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(resp.status(), StatusCode::OK);
    let v = body_json(resp).await;
    assert_eq!(v["status"], "healthy");
    assert_eq!(v["service"], "planetary-agents-core");
    // No DATABASE_URL in the test env → disconnected, reported honestly.
    assert_eq!(v["database"], "disconnected");
}

#[tokio::test]
async fn legacy_health_is_static() {
    let app = build_router(test_state());
    let resp = app
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/health")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(resp.status(), StatusCode::OK);
    let v = body_json(resp).await;
    assert_eq!(v["status"], "healthy");
    assert_eq!(v["database"], "connected"); // legacy contract is static
}

#[tokio::test]
async fn astrologize_returns_chart_with_correct_math() {
    let app = build_router(test_state());
    // Same moment as the golden fixture: 2026-06-08T14:30.
    let req_body = json!({
        "year": 2026, "month": 6, "day": 8, "hour": 14, "minute": 30
    });
    let resp = app
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/astrologize")
                .header("content-type", "application/json")
                .body(Body::from(req_body.to_string()))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(resp.status(), StatusCode::OK);
    let v = body_json(resp).await;

    // Positions: the Sun sits at Libra 4°19' (≈184.3244° longitude).
    let sun = &v["planetary_positions"]["Sun"];
    assert_eq!(sun["sign"], "Libra");
    assert_eq!(sun["degree"], 4);
    assert_eq!(sun["minute"], 19);
    let sun_long = sun["exactLongitude"].as_f64().unwrap();
    assert!(
        (sun_long - 184.3244).abs() < 1e-3,
        "sun longitude {sun_long}"
    );

    // Aspects: 25 for this moment (matches the golden fixture).
    assert_eq!(v["aspects"].as_array().unwrap().len(), 25);

    // Elemental balance equals the alchemize normalized elements; dominant Water.
    let eb = &v["elemental_balance"];
    assert!((eb["Water"].as_f64().unwrap() - 0.4).abs() < 1e-6);
    assert!((eb["Fire"].as_f64().unwrap() - 0.2).abs() < 1e-6);
    assert_eq!(v["alchemy"]["metadata"]["dominantElement"], "Water");

    // Modality balance present and normalized; 12 whole-sign houses.
    let mb = &v["modality_balance"];
    let sum = mb["cardinal"].as_f64().unwrap()
        + mb["fixed"].as_f64().unwrap()
        + mb["mutable"].as_f64().unwrap();
    assert!((sum - 1.0).abs() < 1e-6, "modality balance sums to 1");
    assert_eq!(v["houses"].as_array().unwrap().len(), 12);
    assert_eq!(v["house_system"], "whole_sign");
}

#[tokio::test]
async fn astrologize_accepts_iso_date_and_ascendant() {
    let app = build_router(test_state());
    let req_body = json!({ "date": "2026-06-08T14:30:00Z", "ascendant": "leo" });
    let resp = app
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/astrologize")
                .header("content-type", "application/json")
                .body(Body::from(req_body.to_string()))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(resp.status(), StatusCode::OK);
    let v = body_json(resp).await;
    // Ascendant canonicalized; house 1 is the ascendant sign.
    assert_eq!(v["ascendant"], "Leo");
    assert_eq!(v["houses"][0]["sign"], "Leo");
    assert_eq!(v["houses"][0]["house"], 1);
}

#[tokio::test]
async fn mcp_lists_and_calls_tools() {
    let app = build_router(test_state());

    // tools/list
    let resp = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/mcp")
                .header("content-type", "application/json")
                .body(Body::from(
                    json!({"jsonrpc":"2.0","id":1,"method":"tools/list"}).to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(resp.status(), StatusCode::OK);
    let v = body_json(resp).await;
    let tools = v["result"]["tools"].as_array().unwrap();
    let names: Vec<&str> = tools.iter().filter_map(|t| t["name"].as_str()).collect();
    assert!(names.contains(&"get_live_sky_transits"));
    assert!(names.contains(&"compute_synastry_overlay"));

    // tools/call get_live_sky_transits
    let resp = app
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/mcp")
                .header("content-type", "application/json")
                .body(Body::from(
                    json!({
                        "jsonrpc":"2.0","id":2,"method":"tools/call",
                        "params":{"name":"get_live_sky_transits","arguments":{}}
                    })
                    .to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(resp.status(), StatusCode::OK);
    let v = body_json(resp).await;
    let text = v["result"]["content"][0]["text"].as_str().unwrap();
    let payload: Value = serde_json::from_str(text).unwrap();
    assert!(payload["planetary_positions"]["Sun"]["sign"].is_string());
}

#[tokio::test]
async fn mcp_synastry_computes_aspects() {
    let app = build_router(test_state());
    let chart_a = json!({"Sun": {"sign": "Aries", "degree": 10}});
    let chart_b = json!({"Moon": {"sign": "Libra", "degree": 11}}); // ~opposition
    let resp = app
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/mcp")
                .header("content-type", "application/json")
                .body(Body::from(
                    json!({
                        "jsonrpc":"2.0","id":3,"method":"tools/call",
                        "params":{"name":"compute_synastry_overlay",
                                  "arguments":{"chartA": chart_a, "chartB": chart_b}}
                    })
                    .to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(resp.status(), StatusCode::OK);
    let v = body_json(resp).await;
    let text = v["result"]["content"][0]["text"].as_str().unwrap();
    let payload: Value = serde_json::from_str(text).unwrap();
    let aspects = payload["interchartAspects"].as_array().unwrap();
    assert!(
        aspects.iter().any(|a| a["type"] == "opposition"),
        "expected an opposition between Aries 10° and Libra 11°"
    );
}
