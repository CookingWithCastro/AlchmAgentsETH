# AAE Solana ESMS and Persona Core

Anchor program ID: `5QheuqaicKvPPRFEoEXwaE5xaFp7gauvJCfsjpQv8WzD` (Devnet)

The program owns four deterministic Token-2022 mints (Spirit, Essence, Matter, Substance), all with 4 decimals. Each mint combines NonTransferable, PermissionedBurn, PermanentDelegate, and a self-referential MetadataPointer/TokenMetadata record. The `program_authority` config PDA is the mint authority, permissioned-burn authority, and permanent delegate.

Claims create permanent `claim_receipt` PDAs and mint all four amounts atomically. Self and sponsored redemptions create permanent `order_receipt` PDAs. Sponsored redemptions require a holder Ed25519 instruction immediately before the Anchor instruction. Persona updates are limited to the configured admin/attestor and require a monotonic sequence.

The upgrade authority is the only signer allowed to bootstrap `ProgramConfig`. After bootstrap, the admin can rotate or revoke the attestor and pauser service keys with `set_service_authorities`; the admin itself is the permanent claim-minter/writer fallback. WTEN owns the cross-chain debit lock: `target_chain_namespace`, chain reference, destination, and amounts become immutable when its debit succeeds. The on-chain claim receipt is the Solana replay guard and stores the resulting ledger commitment.

## Toolchain

- Anchor CLI and crates: `0.30.1`
- Solana CLI: `1.18.17`
- SBF Rust: `1.75` (bundled by Solana)
- Host Rust for IDL generation: `1.79`
- JavaScript package manager: Bun `1.3.13`

Anchor 0.30's IDL build enables `procmacro2_semver_exempt`; on the pinned stable host compiler it therefore needs `RUSTC_BOOTSTRAP=1`. Use the repository script rather than invoking `anchor build` directly:

```bash
bun run solana:build
bun run test:solana:vectors
bun run test:solana
bun run test:solana:devnet
bun run test:solana:extensions
```

`test:solana` is deterministic and suitable for CI. `test:solana:devnet` is an opt-in, state-mutating smoke test that requires the configured Devnet admin wallet and spends Devnet SOL.

Deployment additionally requires the stable program keypair. Keep it outside Git and set `AAE_SOLANA_PROGRAM_KEYPAIR=/secure/path/aae_solana-keypair.json`, or provision it at `target/deploy/aae_solana-keypair.json`. The deploy wrapper refuses to continue unless that keypair resolves to `5QheuqaicKvPPRFEoEXwaE5xaFp7gauvJCfsjpQv8WzD`.

The local Solana 1.18 validator embeds a Token-2022 binary that predates Permissioned Burn. The lifecycle and extension-combination tests consequently target Devnet's current Token-2022 deployment. No production/mainnet deployment is configured.
