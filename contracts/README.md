# Alchm ESMS contracts (Foundry)

`EsmsToken` — a **soulbound, upgradeable ERC-1155** for the on-chain ESMS economy
(Spirit/Essence/Matter/Substance) on **Base**. Phase 1 = claim/mirror: the off-chain
WTEN ledger stays authoritative; the PA backend debits off-chain then mints here.

## Prereqs — install Foundry

```bash
curl -L https://foundry.paradigm.xyz | bash   # installs `foundryup`
foundryup                                       # installs forge / cast / anvil
```

## Setup (from `contracts/`)

```bash
forge install OpenZeppelin/openzeppelin-contracts-upgradeable@v5.1.0 --no-commit
forge install OpenZeppelin/openzeppelin-contracts@v5.1.0 --no-commit
forge install foundry-rs/forge-std --no-commit
forge build
forge test -vvv     # mint, idempotency, soulbound, pause, roles, UUPS upgrade
```

## Deploy (Base Sepolia testnet first)

```bash
export DEPLOYER_PRIVATE_KEY=0x...          # a funded testnet key (gets ADMIN/PAUSER/UPGRADER)
export MINTER_ADDRESS=0x...                # the PA backend minter wallet (gets MINTER_ROLE)
export ESMS_METADATA_URI="https://agents.alchm.kitchen/api/esms/metadata/{id}"
export BASE_SEPOLIA_RPC_URL="https://sepolia.base.org"
export BASESCAN_API_KEY=...                # optional, for --verify

forge script script/Deploy.s.sol:Deploy --rpc-url base_sepolia --broadcast --verify
# → prints the proxy address. Set it as ESMS_CONTRACT_ADDRESS in the PA env.
```

## Key properties

- **Soulbound:** `_update` reverts on account-to-account transfer; only mint (from 0x0)
  and burn (to 0x0) are allowed.
- **Idempotent claims:** `claimMint(to, claimId, ids, amounts)` reverts if `claimId`
  was already processed — a retried claim never double-mints.
- **Roles:** `MINTER_ROLE` (backend), `PAUSER_ROLE` + `UPGRADER_ROLE` + `DEFAULT_ADMIN`
  (deployer/multisig). **Protect the minter key** — it can mint unlimited ESMS.
- **Upgradeable (UUPS):** fix bugs / add Phase 2 (redeem, transfers) without migrating state.
- **Pausable:** emergency kill switch on all mint/burn/transfer.

Phase 2 (later): public `burn` for redeem-back, transferability unlock, paymaster for
user-paid txs, external-wallet targets, mainnet promotion.
