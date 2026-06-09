# Multi-stage Docker build for high-performance Rust Axum backend
# =============================================================

# Stage 1: Build the binary
FROM rust:1.80-slim AS builder

WORKDIR /app

# Install build dependencies (needed for compilation / dependency linking)
RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    git \
    && rm -rf /var/lib/apt/lists/*

# Copy workspace cargo configuration and source files
COPY Cargo.toml Cargo.lock ./
COPY src/ ./src/

# Build release binary (no live DB required)
RUN cargo build --release

# Stage 2: Final runner image
FROM debian:bookworm-slim AS runner

WORKDIR /app

# Install runtime dependencies (like CA certificates for SSL/TLS LLM requests)
RUN apt-get update && apt-get install -y \
    ca-certificates \
    openssl \
    && rm -rf /var/lib/apt/lists/*

# Copy the built binary
COPY --from=builder /app/target/release/pa-rust-backend ./pa-rust-backend

# Expose port (Axum defaults to 8000 or reads $PORT)
EXPOSE 8000

# Set production environment defaults
ENV HOST=0.0.0.0
ENV PORT=8000

# Run the app
CMD ["./pa-rust-backend"]
