//! Unified error type that renders to a FastAPI-style `{"detail": ...}` envelope.

use axum::Json;
use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use serde_json::{Value, json};

#[derive(Debug)]
pub enum AppError {
    /// 400 with a string detail.
    BadRequest(String),
    /// 403 — admin secret mismatch.
    Forbidden,
    /// 422 with a string detail — the payload parsed but is semantically
    /// unusable (e.g. a caller-supplied chart missing required bodies).
    /// Matches the status FastAPI's `HTTPException(422)` returns for the same
    /// rejection in `backend/main.py`.
    Unprocessable(String),
    /// 502/503 etc. with an arbitrary JSON detail (mirrors recipe failures).
    Upstream(StatusCode, Value),
    /// 503 with a string detail.
    Unavailable(String),
    /// 500 with a string detail.
    Internal(String),
}

impl std::fmt::Display for AppError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            AppError::BadRequest(m) => write!(f, "bad request: {m}"),
            AppError::Forbidden => write!(f, "forbidden"),
            AppError::Unprocessable(m) => write!(f, "unprocessable: {m}"),
            AppError::Upstream(s, d) => write!(f, "upstream {s}: {d}"),
            AppError::Unavailable(m) => write!(f, "unavailable: {m}"),
            AppError::Internal(m) => write!(f, "internal: {m}"),
        }
    }
}

impl std::error::Error for AppError {}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let (status, detail) = match self {
            AppError::BadRequest(m) => (StatusCode::BAD_REQUEST, Value::String(m)),
            AppError::Forbidden => (
                StatusCode::FORBIDDEN,
                Value::String("Forbidden".to_string()),
            ),
            AppError::Unprocessable(m) => (StatusCode::UNPROCESSABLE_ENTITY, Value::String(m)),
            AppError::Upstream(s, d) => (s, d),
            AppError::Unavailable(m) => (StatusCode::SERVICE_UNAVAILABLE, Value::String(m)),
            AppError::Internal(m) => (StatusCode::INTERNAL_SERVER_ERROR, Value::String(m)),
        };
        (status, Json(json!({ "detail": detail }))).into_response()
    }
}

/// A caller-supplied chart missing required bodies is a 422, exactly as in
/// `backend/main.py:_require_complete_chart`. The `From` impl lets every HTTP
/// handler propagate the rejection with `?` instead of restating the status.
impl From<crate::astro::alchemy::IncompleteChart> for AppError {
    fn from(err: crate::astro::alchemy::IncompleteChart) -> Self {
        AppError::Unprocessable(err.detail())
    }
}

pub type AppResult<T> = Result<T, AppError>;
