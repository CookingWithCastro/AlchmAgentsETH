#!/usr/bin/env bash
# One-command deploy of the Pentacle Star Vaults stack to Circle Arc testnet.
# Reads contracts/.env (never echoes the key). Prints a ready-to-paste env block.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/contracts"

if [[ ! -f .env ]]; then
  echo "❌ contracts/.env not found. Copy contracts/.env.example -> contracts/.env and fill DEPLOYER_PRIVATE_KEY." >&2
  exit 1
fi

# Load env without printing it.
set -a; source .env; set +a

: "${DEPLOYER_PRIVATE_KEY:?Set DEPLOYER_PRIVATE_KEY in contracts/.env}"
export ARC_RPC_URL="${ARC_RPC_URL:-${ARC_TESTNET_RPC_URL:-https://rpc.testnet.arc.io}}"
export ESMS_METADATA_URI="${ESMS_METADATA_URI:-https://alchmagents.eth.limo/esms/{id}.json}"

# Default the attestor to the deployer address (fast demo path).
if [[ -z "${ATTESTOR_ADDRESS:-}" ]]; then
  ATTESTOR_ADDRESS="$(cast wallet address --private-key "$DEPLOYER_PRIVATE_KEY")"
  export ATTESTOR_ADDRESS
fi

DEPLOYER_ADDR="$(cast wallet address --private-key "$DEPLOYER_PRIVATE_KEY")"
echo "▶ Deployer:  $DEPLOYER_ADDR"
echo "▶ Attestor:  $ATTESTOR_ADDRESS"
echo "▶ RPC:       $ARC_RPC_URL"
echo "▶ USDC(gas): ${ARC_USDC_ADDRESS:-0x3600000000000000000000000000000000000000}"
echo "▶ Balance:   $(cast balance "$DEPLOYER_ADDR" --rpc-url "$ARC_RPC_URL" 2>/dev/null || echo '??') wei"
echo

forge script script/DeployStarVault.s.sol:DeployStarVault \
  --rpc-url "$ARC_RPC_URL" --broadcast --slow -vv

echo
echo "✅ Deploy complete. Paste these into the project root .env:"
echo "─────────────────────────────────────────────────────────"
# Pull addresses from the broadcast artifact (most reliable source).
B="broadcast/DeployStarVault.s.sol/${ARC_TESTNET_CHAIN_ID:-5042002}/run-latest.json"
if [[ -f "$B" ]]; then
  echo "# from $B"
fi
echo "(addresses are also in the console.log output above, labelled with their NEXT_PUBLIC_ names)"
