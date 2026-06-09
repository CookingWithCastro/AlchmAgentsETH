//! OpenAI-compatible chat-completions transport for every non-Anthropic
//! provider (Groq, Cerebras, Gemini, OpenRouter, OpenAI). Port of
//! `providers.py:_call_openai_compatible`.

use super::{CallOptions, CallResult, ProviderConfig};
use serde_json::{Value, json};

fn chat_completions_url(base_url: &Option<String>) -> String {
    let base = base_url
        .clone()
        .unwrap_or_else(|| "https://api.openai.com/v1".to_string());
    format!("{}/chat/completions", base.trim_end_matches('/'))
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

    let full_system = if rag_block.is_empty() {
        persona_block.to_string()
    } else {
        format!("{persona_block}\n\n{rag_block}")
    };

    let mut body = json!({
        "model": cfg.model,
        "messages": [
            {"role": "system", "content": full_system},
            {"role": "user", "content": user_message},
        ],
        "max_tokens": opts.max_tokens.max(1),
    });
    if opts.json_object {
        body["response_format"] = json!({"type": "json_object"});
    }
    if let Some(t) = opts.temperature {
        body["temperature"] = json!(t);
    }

    let url = chat_completions_url(&cfg.base_url);
    let resp = client
        .post(&url)
        .bearer_auth(api_key)
        .header("content-type", "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("{} request error: {e}", cfg.name))?;

    let status = resp.status();
    let payload: Value = resp
        .json()
        .await
        .map_err(|e| format!("{} decode error: {e}", cfg.name))?;

    if !status.is_success() {
        return Err(format!("{} {status}: {payload}", cfg.name));
    }

    let text = payload
        .get("choices")
        .and_then(Value::as_array)
        .and_then(|c| c.first())
        .and_then(|c| c.get("message"))
        .and_then(|m| m.get("content"))
        .and_then(Value::as_str)
        .unwrap_or("")
        .to_string();

    Ok(CallResult {
        text,
        provider: cfg.name.to_string(),
        model: cfg.model.clone(),
    })
}
