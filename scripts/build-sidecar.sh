#!/usr/bin/env bash
# Build the Tauri sidecar binaries that get dropped into src-tauri/bin/.
#
# Sidecars and how they're produced:
#   orchestrator    - Bun-compiled TS binary from this repo's server.ts.
#   alchm-mcp       - Bun-compiled TS binary from the sibling WTEN repo
#                     (../WhatToEatNext-master/mcp-server/src/index.ts).
#   pa-mcp          - PyInstaller-frozen Python from
#                     backend/planetary_agents_mcp_server.py.
#   pa-rust-backend - Rust-compiled backend from pa-rust-backend/ directory.
#   llama-server    - User-supplied; not built here. Drop a Metal-compiled
#                     llama-cli into src-tauri/bin/llama-server-<triple>
#                     before packaging. See src-tauri/bin/README.md.
#
# Default behavior: build everything we can for the current host arch.
#
# Flags:
#   --skip-orchestrator     skip the orchestrator build
#   --skip-alchm-mcp        skip the alchm-mcp build
#   --skip-pa-mcp           skip the pa-mcp build
#   --skip-pa-rust-backend  skip the pa-rust-backend build
#   --arch <triple>       override default host arch
#                         (aarch64-apple-darwin | x86_64-apple-darwin)
#   --all-mac-archs       build both Mac arches (requires Rosetta for x86_64)
#
# Environment:
#   PA_MCP_VENV          arm64 (host) venv with PyInstaller. Default:
#                        backend/venv.
#   PA_MCP_VENV_X86_64   x86_64 venv with PyInstaller, used when
#                        cross-building for Intel Macs from Apple
#                        Silicon under Rosetta. Default:
#                        backend/venv-x86_64. Auto-created if missing
#                        when Rosetta is available.
#
# Why two venvs: PyInstaller's --target-arch is *not* a true
# cross-compiler. It rewrites the bootloader's load commands but still
# requires every bundled native .so to already exist for the target
# arch. On Apple Silicon, `pip install` resolves arm64-only wheels for
# psycopg2-binary, pydantic_core, zstandard, sqlalchemy.cyextension,
# etc., so a single venv cannot produce both binaries. Spawning pip via
# `arch -x86_64` forces pip to resolve x86_64 wheels — that's the
# clean fix.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BIN_DIR="$ROOT_DIR/src-tauri/bin"
BACKEND_DIR="$ROOT_DIR/backend"
WTEN_MCP_SRC="$ROOT_DIR/../WhatToEatNext-master/mcp-server/src/index.ts"

PA_MCP_VENV="${PA_MCP_VENV:-$BACKEND_DIR/venv}"
PA_MCP_VENV_X86_64="${PA_MCP_VENV_X86_64:-$BACKEND_DIR/venv-x86_64}"
PA_MCP_DEPS=(httpx sqlalchemy python-dotenv pyinstaller)

SKIP_ORCHESTRATOR=0
SKIP_ALCHM_MCP=0
SKIP_PA_MCP=0
SKIP_PA_RUST_BACKEND=0
ALL_MAC_ARCHS=0

case "$(uname -sm)" in
  "Darwin arm64") DEFAULT_TRIPLE="aarch64-apple-darwin" ;;
  "Darwin x86_64") DEFAULT_TRIPLE="x86_64-apple-darwin" ;;
  Linux*) DEFAULT_TRIPLE="x86_64-unknown-linux-gnu" ;;
  *) DEFAULT_TRIPLE="" ;;
esac
TRIPLE="${TRIPLE:-$DEFAULT_TRIPLE}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --skip-orchestrator) SKIP_ORCHESTRATOR=1; shift ;;
    --skip-alchm-mcp) SKIP_ALCHM_MCP=1; shift ;;
    --skip-pa-mcp) SKIP_PA_MCP=1; shift ;;
    --skip-pa-rust-backend) SKIP_PA_RUST_BACKEND=1; shift ;;
    --arch) TRIPLE="$2"; shift 2 ;;
    --all-mac-archs) ALL_MAC_ARCHS=1; shift ;;
    -h|--help) sed -n '1,40p' "$0"; exit 0 ;;
    *) echo "Unknown flag: $1" >&2; exit 1 ;;
  esac
done

if [[ -z "$TRIPLE" ]]; then
  echo "Cannot infer target triple from $(uname -sm). Pass --arch <triple>." >&2
  exit 1
fi

log() { printf "\n\033[1;36m[build-sidecar]\033[0m %s\n" "$*"; }

atomic_move() {
  local src="$1" dest="$2"
  chmod +x "$src"
  mv "$src" "$dest"
}

build_orchestrator() {
  local arch="$1"
  local out="$BIN_DIR/orchestrator-$arch"
  local tmp="$out.tmp"
  log "Building orchestrator → $out"
  rm -f "$tmp"
  bun build "$ROOT_DIR/server.ts" --compile --outfile "$tmp"
  atomic_move "$tmp" "$out"
}

build_alchm_mcp() {
  local arch="$1"
  local out="$BIN_DIR/alchm-mcp-$arch"
  local tmp="$out.tmp"
  if [[ ! -f "$WTEN_MCP_SRC" ]]; then
    echo "[build-sidecar] alchm-mcp source not found at $WTEN_MCP_SRC; skipping." >&2
    echo "                Clone the WhatToEatNext-master sibling repo to enable." >&2
    return 0
  fi
  log "Building alchm-mcp → $out"
  rm -f "$tmp"
  bun build "$WTEN_MCP_SRC" --compile --outfile "$tmp"
  atomic_move "$tmp" "$out"
}

ensure_x86_64_venv() {
  if [[ -x "$PA_MCP_VENV_X86_64/bin/pyinstaller" ]]; then
    return 0
  fi
  if ! /usr/bin/arch -x86_64 /usr/bin/true 2>/dev/null; then
    echo "[build-sidecar] x86_64 cross-build requires Rosetta 2." >&2
    echo "                Install: sudo softwareupdate --install-rosetta --agree-to-license" >&2
    return 1
  fi
  log "Bootstrapping x86_64 venv at $PA_MCP_VENV_X86_64"
  # Use the system universal2 python; the arm64 venv's python wrapper
  # cannot be launched as x86_64.
  local sys_py="/Library/Developer/CommandLineTools/Library/Frameworks/Python3.framework/Versions/3.9/bin/python3.9"
  if [[ ! -x "$sys_py" ]]; then
    sys_py="$(command -v python3.9 || command -v python3)"
  fi
  /usr/bin/arch -x86_64 "$sys_py" -m venv "$PA_MCP_VENV_X86_64"
  /usr/bin/arch -x86_64 "$PA_MCP_VENV_X86_64/bin/pip" install --upgrade pip >&2
  /usr/bin/arch -x86_64 "$PA_MCP_VENV_X86_64/bin/pip" install "${PA_MCP_DEPS[@]}" >&2
}

build_pa_mcp() {
  local arch="$1"
  local out="$BIN_DIR/pa-mcp-$arch"
  local tmp="$out.tmp"

  local target_arch=""
  local venv=""
  local arch_wrap=""
  case "$arch" in
    aarch64-apple-darwin)
      target_arch="arm64"
      venv="$PA_MCP_VENV"
      ;;
    x86_64-apple-darwin)
      target_arch="x86_64"
      venv="$PA_MCP_VENV_X86_64"
      arch_wrap="/usr/bin/arch -x86_64"
      ensure_x86_64_venv || return 1
      ;;
    *)
      echo "[build-sidecar] pa-mcp arch $arch not supported on macOS host." >&2
      echo "                For Windows/Linux, run this script on a native or CI runner." >&2
      return 1 ;;
  esac

  if [[ ! -x "$venv/bin/pyinstaller" ]]; then
    echo "[build-sidecar] PyInstaller not found at $venv/bin/pyinstaller." >&2
    echo "                Run: $venv/bin/pip install pyinstaller" >&2
    return 1
  fi

  log "Building pa-mcp ($target_arch) → $out"
  local dist_path="$BACKEND_DIR/dist"
  local work_path="$BACKEND_DIR/build"
  if [[ "$target_arch" != "arm64" ]]; then
    dist_path="$BACKEND_DIR/dist-$target_arch"
    work_path="$BACKEND_DIR/build-$target_arch"
  fi

  (cd "$BACKEND_DIR" && TARGET_ARCH="$target_arch" $arch_wrap "$venv/bin/pyinstaller" \
      pa-mcp.spec --noconfirm --clean \
      --distpath "$dist_path" --workpath "$work_path") \
      >&2

  cp "$dist_path/pa-mcp" "$tmp"
  atomic_move "$tmp" "$out"
}

build_pa_rust_backend() {
  local arch="$1"
  local out="$BIN_DIR/pa-rust-backend-$arch"
  local tmp="$out.tmp"

  log "Building pa-rust-backend ($arch) → $out"
  rm -f "$tmp"

  local target_flag=""
  # Only cross-compile if building a specific arch and we have it configured.
  # Otherwise cargo will compile for host architecture.
  if [[ "$arch" == "x86_64-apple-darwin" || "$arch" == "aarch64-apple-darwin" || "$arch" == "x86_64-unknown-linux-gnu" || "$arch" == "x86_64-pc-windows-msvc" ]]; then
    target_flag="--target $arch"
  fi

  cargo build --release $target_flag --manifest-path "$ROOT_DIR/pa-rust-backend/Cargo.toml"

  local target_dir="$ROOT_DIR/pa-rust-backend/target"
  local bin_path=""
  if [[ -n "$target_flag" ]]; then
    bin_path="$target_dir/$arch/release/pa-rust-backend"
  else
    bin_path="$target_dir/release/pa-rust-backend"
  fi

  if [[ ! -f "$bin_path" ]]; then
    # Fallback to local default build directory if target was not used
    bin_path="$target_dir/release/pa-rust-backend"
  fi

  if [[ ! -f "$bin_path" ]]; then
    echo "[build-sidecar] Compiled binary not found at $bin_path" >&2
    return 1
  fi

  cp "$bin_path" "$tmp"
  atomic_move "$tmp" "$out"
}

build_for_triple() {
  local arch="$1"
  log "=== Target: $arch ==="
  [[ "$SKIP_ORCHESTRATOR" == 1 ]] || build_orchestrator "$arch"
  [[ "$SKIP_ALCHM_MCP" == 1 ]] || build_alchm_mcp "$arch"
  [[ "$SKIP_PA_MCP" == 1 ]] || build_pa_mcp "$arch"
  [[ "$SKIP_PA_RUST_BACKEND" == 1 ]] || build_pa_rust_backend "$arch"
}

if [[ "$ALL_MAC_ARCHS" == 1 ]]; then
  if [[ "$(uname -s)" != "Darwin" ]]; then
    echo "--all-mac-archs only valid on macOS host." >&2
    exit 1
  fi
  build_for_triple "aarch64-apple-darwin"
  build_for_triple "x86_64-apple-darwin"
else
  build_for_triple "$TRIPLE"
fi

log "Sidecar inventory:"
ls -lh "$BIN_DIR" | awk '/-(aarch64|x86_64)-/ {print}' >&2
