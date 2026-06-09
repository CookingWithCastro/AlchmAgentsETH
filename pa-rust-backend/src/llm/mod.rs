//! Multi-provider LLM fallback chain. Port of `backend/providers.py`.
//!
//! The chain is walked top-to-bottom; keyless providers are skipped, and on a
//! quota/rate-limit error we fall through to the next provider. Anthropic is
//! special-cased for prompt caching (`cache_control: ephemeral`) and tool-forced
//! structured output; every other provider speaks the OpenAI-compatible
//! chat-completions API.

pub mod anthropic;
pub mod openai_compat;

use serde_json::{Value, json};
use std::env;
use std::time::Instant;

/// Substring heuristic for "this provider is rate-limited or out of credit".
pub const QUOTA_ERROR_TERMS: [&str; 7] = [
    "429",
    "quota",
    "rate",
    "billing",
    "insufficient",
    "exceeded",
    "limit",
];

pub fn is_quota_error(msg: &str) -> bool {
    let s = msg.to_lowercase();
    QUOTA_ERROR_TERMS.iter().any(|t| s.contains(t))
}

#[derive(Debug, Clone)]
pub struct ProviderConfig {
    pub name: &'static str,
    pub model: String,
    pub api_key_env: &'static str,
    pub base_url: Option<String>,
    pub is_paid_lastditch: bool,
    pub api_key_override: Option<String>,
}

impl ProviderConfig {
    /// Resolve the API key: a per-request override wins, else the env var.
    /// Anthropic additionally falls back to `AI_GATEWAY_API_KEY`.
    pub fn api_key(&self) -> Option<String> {
        if let Some(k) = &self.api_key_override
            && !k.trim().is_empty()
        {
            return Some(k.clone());
        }
        if let Ok(k) = env::var(self.api_key_env)
            && !k.trim().is_empty()
        {
            return Some(k);
        }
        if self.name == "anthropic"
            && let Ok(k) = env::var("AI_GATEWAY_API_KEY")
            && !k.trim().is_empty()
        {
            return Some(k);
        }
        None
    }
}

fn env_model(key: &str, default: &str) -> String {
    env::var(key)
        .ok()
        .filter(|s| !s.trim().is_empty())
        .unwrap_or_else(|| default.to_string())
}

/// Free providers, preferred-first. Each model id is overridable via a
/// `<PROVIDER>_FREE_MODEL` env var. Mirrors `providers.py:FREE_CHAIN`.
pub fn free_chain() -> Vec<ProviderConfig> {
    vec![
        ProviderConfig {
            name: "groq",
            model: env_model("GROQ_FREE_MODEL", "llama-3.3-70b-versatile"),
            api_key_env: "GROQ_API_KEY",
            base_url: Some("https://api.groq.com/openai/v1".to_string()),
            is_paid_lastditch: false,
            api_key_override: None,
        },
        ProviderConfig {
            name: "cerebras",
            model: env_model("CEREBRAS_FREE_MODEL", "gpt-oss-120b"),
            api_key_env: "CEREBRAS_API_KEY",
            base_url: Some("https://api.cerebras.ai/v1".to_string()),
            is_paid_lastditch: false,
            api_key_override: None,
        },
        ProviderConfig {
            name: "gemini",
            model: env_model("GEMINI_FREE_MODEL", "gemini-flash-latest"),
            api_key_env: "GEMINI_API_KEY",
            base_url: Some("https://generativelanguage.googleapis.com/v1beta/openai/".to_string()),
            is_paid_lastditch: false,
            api_key_override: None,
        },
        ProviderConfig {
            name: "openrouter",
            model: env_model("OPENROUTER_FREE_MODEL", "moonshotai/kimi-k2.6:free"),
            api_key_env: "OPENROUTER_API_KEY",
            base_url: Some("https://openrouter.ai/api/v1".to_string()),
            is_paid_lastditch: false,
            api_key_override: None,
        },
    ]
}

fn openai_lastditch(override_key: Option<String>) -> ProviderConfig {
    ProviderConfig {
        name: "openai",
        model: env_model("MONICA_DEFAULT_MODEL", "gpt-4o-mini"),
        api_key_env: "OPENAI_API_KEY",
        base_url: None,
        is_paid_lastditch: true,
        api_key_override: override_key,
    }
}

/// Build the fallback chain for a request. Port of `providers.py:build_chain`.
pub fn build_chain(
    tier: &str,
    anthropic_model: Option<&str>,
    user_keys: Option<&Value>,
) -> Vec<ProviderConfig> {
    let user_anthropic = user_keys
        .and_then(|v| v.get("anthropic"))
        .and_then(Value::as_str)
        .map(str::to_string);
    let user_openai = user_keys
        .and_then(|v| v.get("openai"))
        .and_then(Value::as_str)
        .map(str::to_string);

    let mut chain = Vec::new();
    if tier != "free"
        && let Some(model) = anthropic_model
    {
        let has_key = env::var("ANTHROPIC_API_KEY").is_ok() || user_anthropic.is_some();
        if has_key {
            chain.push(ProviderConfig {
                name: "anthropic",
                model: model.to_string(),
                api_key_env: "ANTHROPIC_API_KEY",
                base_url: None,
                is_paid_lastditch: false,
                api_key_override: user_anthropic.clone(),
            });
        }
    }
    chain.extend(free_chain());
    chain.push(openai_lastditch(user_openai));
    chain
}

/// Every provider we know about, for `/api/providers/health`.
pub fn all_known_providers() -> Vec<ProviderConfig> {
    let mut v = vec![ProviderConfig {
        name: "anthropic",
        model: "claude-haiku-4-5-20251001".to_string(),
        api_key_env: "ANTHROPIC_API_KEY",
        base_url: None,
        is_paid_lastditch: false,
        api_key_override: None,
    }];
    v.extend(free_chain());
    v.push(openai_lastditch(None));
    v
}

#[derive(Debug, Clone)]
pub struct CallResult {
    pub text: String,
    pub provider: String,
    pub model: String,
}

/// Options threaded through a single provider call.
#[derive(Debug, Clone, Default)]
pub struct CallOptions {
    pub max_tokens: u32,
    pub temperature: Option<f64>,
    /// When set, request a JSON object (`response_format` / tool-forcing).
    pub json_object: bool,
    /// JSON Schema for Anthropic tool-forced structured output.
    pub structured_schema: Option<Value>,
}

/// Dispatch one call to the appropriate provider transport.
pub async fn call_provider(
    client: &reqwest::Client,
    cfg: &ProviderConfig,
    persona_block: &str,
    rag_block: &str,
    user_message: &str,
    opts: &CallOptions,
) -> Result<CallResult, String> {
    if cfg.name == "anthropic" {
        anthropic::call(client, cfg, persona_block, rag_block, user_message, opts).await
    } else {
        openai_compat::call(client, cfg, persona_block, rag_block, user_message, opts).await
    }
}

/// Ping a single provider with a 1-token "hi" prompt. Port of
/// `providers.py:health_check`. Returns `{ok, latency_ms, error, model}`.
pub async fn health_check(client: &reqwest::Client, cfg: &ProviderConfig) -> Value {
    let Some(_) = cfg.api_key() else {
        return json!({"ok": false, "latency_ms": Value::Null, "error": "no_api_key", "model": cfg.model});
    };
    let t0 = Instant::now();
    let opts = CallOptions {
        max_tokens: 1,
        ..Default::default()
    };
    let result = call_provider(client, cfg, "hi", "", "hi", &opts).await;
    let latency_ms = t0.elapsed().as_millis() as u64;
    match result {
        Ok(_) => {
            json!({"ok": true, "latency_ms": latency_ms, "error": Value::Null, "model": cfg.model})
        }
        Err(e) => json!({
            "ok": false,
            "latency_ms": latency_ms,
            "error": e.chars().take(200).collect::<String>(),
            "model": cfg.model,
        }),
    }
}

/// Walk the chain, returning the first successful result. Port of `run_chain`.
pub async fn run_chain(
    client: &reqwest::Client,
    chain: &[ProviderConfig],
    persona_block: &str,
    rag_block: &str,
    user_message: &str,
    opts: &CallOptions,
) -> Option<CallResult> {
    for (i, cfg) in chain.iter().enumerate() {
        if cfg.api_key().is_none() {
            continue;
        }
        match call_provider(client, cfg, persona_block, rag_block, user_message, opts).await {
            Ok(result) => {
                if cfg.is_paid_lastditch {
                    tracing::warn!(
                        provider = cfg.name,
                        model = %cfg.model,
                        "alert_event reason=paid_fallback"
                    );
                }
                return Some(result);
            }
            Err(e) => {
                let reason = if is_quota_error(&e) {
                    "rate_limit"
                } else {
                    "error"
                };
                let next = chain[i + 1..]
                    .iter()
                    .find(|n| n.api_key().is_some())
                    .map(|n| n.name)
                    .unwrap_or("none");
                tracing::warn!(
                    provider = cfg.name,
                    reason = reason,
                    next = next,
                    "fallback_event: {}",
                    &e.chars().take(200).collect::<String>()
                );
                continue;
            }
        }
    }
    None
}
