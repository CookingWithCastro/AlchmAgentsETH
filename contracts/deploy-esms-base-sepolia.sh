#!/usr/bin/env bash
#
# Deploy the Alchm ESMS stack to Base-Sepolia (EsmsToken UUPS proxy +
# ConstellationDeed + ConstellationAMM + 12 demo pools), via script/Deploy.s.sol.
#
# The EsmsToken proxy it prints is the `ESMS_CONTRACT_ADDRESS` the Bazaar /shop
# burns against (lib/esms-chain/contract.ts → esmsOnchainConfigured()).
#
# SAFE BY DEFAULT: runs a dry-run simulation only. It broadcasts a real,
# irreversible deployment ONLY when you pass BROADCAST=1. No private key is ever
# written to disk or committed — everything is read from the environment.
#
#   Dry run (recommended first):
#     DEPLOYER_PRIVATE_KEY=0x… MINTER_ADDRESS=0x… ATTESTOR_ADDRESS=0x… \
#     ESMS_METADATA_URI=ipfs://… ./deploy-esms-base-sepolia.sh
#
#   Real deploy (spends Base-Sepolia gas; fund the deployer from a faucet first):
#     BROADCAST=1 BASESCAN_API_KEY=… DEPLOYER_PRIVATE_KEY=0x… MINTER_ADDRESS=0x… \
#     ATTESTOR_ADDRESS=0x… ESMS_METADATA_URI=ipfs://… ./deploy-esms-base-sepolia.sh
#
set -euo pipefail
cd "$(dirname "$0")" # contracts/

# ── Required inputs ────────────────────────────────────────────────────────
: "${DEPLOYER_PRIVATE_KEY:?required — funded Base-Sepolia deployer; becomes ESMS DEFAULT_ADMIN/UPGRADER}"
: "${MINTER_ADDRESS:?required — gets ESMS MINTER_ROLE (the backend that seeds on-chain ESMS)}"
: "${ATTESTOR_ADDRESS:?required — gets AMM ATTESTOR_ROLE (the Pentacles feeder signing key)}"
: "${ESMS_METADATA_URI:?required — ERC-1155 metadata base URI}"
RPC="${BASE_SEPOLIA_RPC_URL:-https://sepolia.base.org}"

echo "▶ Deployer: $(cast wallet address --private-key "$DEPLOYER_PRIVATE_KEY")"
echo "▶ RPC:      $RPC  (chain $(cast chain-id --rpc-url "$RPC"))"
echo "▶ Building…"
forge build

echo "▶ Dry-run simulation (no broadcast)…"
set +e
sim_out=$(forge script script/Deploy.s.sol:Deploy --rpc-url "$RPC" 2>&1)
set -e
echo "$sim_out"
if ! grep -q "Script ran successfully" <<<"$sim_out"; then
  echo "✗ Simulation failed — the deploy script reverted (not a funds issue). Fix before deploying."
  exit 1
fi
if grep -qiE "lack of funds|insufficient funds" <<<"$sim_out"; then
  echo "ℹ️  Script logic is valid; the deployer just isn't funded yet — fund it before BROADCAST=1."
fi

if [[ "${BROADCAST:-0}" != "1" ]]; then
  cat <<EOF

✅ Dry run complete — nothing was broadcast, no funds moved.
   Fund the deployer with Base-Sepolia ETH (e.g. https://www.alchemy.com/faucets/base-sepolia),
   then re-run with BROADCAST=1 to deploy for real:

     BROADCAST=1 BASESCAN_API_KEY=… DEPLOYER_PRIVATE_KEY=… MINTER_ADDRESS=… \\
       ATTESTOR_ADDRESS=… ESMS_METADATA_URI=… $0
EOF
  exit 0
fi

echo "▶ BROADCASTING real deployment…"
verify=()
[[ -n "${BASESCAN_API_KEY:-}" ]] && verify=(--verify)
forge script script/Deploy.s.sol:Deploy --rpc-url "$RPC" --broadcast "${verify[@]}"

cat <<'EOF'

✅ Deployed. Finish wiring it up (operator):
  1. Copy the printed "EsmsToken proxy (ESMS_CONTRACT_ADDRESS)".
  2. Grant BURNER_ROLE to your Bazaar redeemer settlement wallet (holder-signed
     redeemFor path — never an arbitrary-burn EOA):
       cast send <ESMS_PROXY> 'grantRole(bytes32,address)' \
         "$(cast keccak 'BURNER_ROLE')" <REDEEMER_ADDRESS> \
         --rpc-url "$RPC" --private-key "$DEPLOYER_PRIVATE_KEY"
  3. Set Vercel env (project alchm-agents-eth, Production) and redeploy:
       ESMS_CONTRACT_ADDRESS = <ESMS_PROXY>
       NEXT_PUBLIC_ESMS_CHAIN = base-sepolia
       PRIVY_REDEEMER_WALLET_ID (or REDEEMER_PRIVATE_KEY) = <redeemer>
       AUTH_SECRET = <openssl rand -base64 32>   # also fixes the /shop 500
  4. Verify: esmsOnchainConfigured() === true and a test redeem burns on-chain.
EOF
