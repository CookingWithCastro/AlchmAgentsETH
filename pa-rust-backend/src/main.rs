//! Binary entrypoint. All logic lives in the `pa_rust_backend` library so the
//! integration tests in `tests/` can exercise the same code.

#[tokio::main]
async fn main() {
    if let Err(e) = pa_rust_backend::run().await {
        eprintln!("fatal: {e}");
        std::process::exit(1);
    }
}
