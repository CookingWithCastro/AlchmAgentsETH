//! Native Anthropic Messages API transport with prompt caching and tool-forced
//! structured output. Port of `providers.py:_call_anthropic`.

use super::{CallOptions, CallResult, ProviderConfig};
use serde_json::{Value, json};
use std::env;

const ANTHROPIC_VERSION: &str = "2023-06-01";

fn base_url() -> String {
    env::var("ANTHROPIC_BASE_URL")
        .ok()
        .filter(|s| !s.trim().is_empty())
        .unwrap_or_else(|| "https://api.anthropic.com".to_string())
}

pub async fn call(
    client: &reqwest::Client,
    cfg: &ProviderConfig,
    persona_block: &str,
    rag_block: &str,
    user_message: &str,
    opts: &CallOptions,
) -> Result<CallResult, String> {
    let api_key = cfg.api_key().ok_or_else(|| "no_api_key".to_string())?;

    // System blocks: the persona carries an ephemeral cache breakpoint; RAG (if
    // any) follows as a plain text block.
    let mut system_blocks = vec![json!({
        "type": "text",
        "text": persona_block,
        "cache_control": {"type": "ephemeral"},
    })];
    if !rag_block.is_empty() {
        system_blocks.push(json!({"type": "text", "text": rag_block}));
    }

    let mut body = json!({
        "model": cfg.model,
        "max_tokens": opts.max_tokens.max(1),
        "system": system_blocks,
        "messages": [{"role": "user", "content": user_message}],
    });

    if let Some(schema) = &opts.structured_schema {
        body["tools"] = json!([{
            "name": "emit_structured_response",
            "description": "Return the requested JSON object exactly.",
            "input_schema": schema,
        }]);
        body["tool_choice"] = json!({"type": "tool", "name": "emit_structured_response"});
    }

    let url = format!("{}/v1/messages", base_url().trim_end_matches('/'));
    let resp = client
        .post(&url)
        .header("x-api-key", api_key)
        .header("anthropic-version", ANTHROPIC_VERSION)
        .header("content-type", "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("anthropic request error: {e}"))?;

    let status = resp.status();
    let payload: Value = resp
        .json()
        .await
        .map_err(|e| format!("anthropic decode error: {e}"))?;

    if !status.is_success() {
        return Err(format!("anthropic {status}: {payload}"));
    }

    let content = payload
        .get("content")
        .and_then(Value::as_array)
        .ok_or_else(|| format!("anthropic malformed response: {payload}"))?;

    let mut text = String::new();
    if opts.structured_schema.is_some() {
        for block in content {
            if block.get("type").and_then(Value::as_str) == Some("tool_use") {
                let input = block.get("input").cloned().unwrap_or(Value::Null);
                text = serde_json::to_string(&input).unwrap_or_default();
                break;
            }
        }
    }
    if text.is_empty()
        && let Some(first) = content.first()
    {
        text = first
            .get("text")
            .and_then(Value::as_str)
            .unwrap_or("")
            .to_string();
    }

    Ok(CallResult {
        text,
        provider: cfg.name.to_string(),
        model: cfg.model.clone(),
    })
}
