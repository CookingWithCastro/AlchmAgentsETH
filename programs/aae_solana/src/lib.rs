#![allow(unexpected_cfgs)]

use anchor_lang::prelude::*;

pub mod constants;
pub mod errors;
pub mod instructions;
pub mod state;
pub mod vectors;

use instructions::*;

declare_id!("5QheuqaicKvPPRFEoEXwaE5xaFp7gauvJCfsjpQv8WzD");

#[program]
pub mod aae_solana {
    use super::*;

    pub fn initialize_config(
        ctx: Context<InitializeConfig>,
        attestor: Pubkey,
        pauser: Pubkey,
        cluster_domain: [u8; 32],
    ) -> Result<()> {
        config::initialize(ctx, attestor, pauser, cluster_domain)
    }

    pub fn set_pause_state(
        ctx: Context<SetPauseState>,
        pause_claims: bool,
        pause_redemptions: bool,
    ) -> Result<()> {
        config::set_pause_state(ctx, pause_claims, pause_redemptions)
    }

    pub fn initialize_esms_mints(ctx: Context<InitializeEsmsMints>) -> Result<()> {
        esms::initialize_mints(ctx)
    }

    pub fn claim_mint_esms(
        ctx: Context<ClaimMintEsms>,
        claim_id: [u8; 32],
        ledger_reference_hash: [u8; 32],
        amounts: [u64; 4],
    ) -> Result<()> {
        esms::claim_mint(ctx, claim_id, ledger_reference_hash, amounts)
    }

    pub fn redeem_esms(
        ctx: Context<RedeemEsms>,
        order_id: [u8; 32],
        amounts: [u64; 4],
    ) -> Result<()> {
        esms::redeem(ctx, order_id, amounts)
    }

    pub fn redeem_for_esms(
        ctx: Context<RedeemForEsms>,
        order_id: [u8; 32],
        amounts: [u64; 4],
        deadline: i64,
    ) -> Result<()> {
        esms::redeem_for(ctx, order_id, amounts, deadline)
    }

    pub fn record_persona_commitment(
        ctx: Context<RecordPersonaCommitment>,
        agent_id: [u8; 32],
        target_persona_hash: [u8; 32],
        epoch_hash: [u8; 32],
        sequence: u64,
    ) -> Result<()> {
        persona::record(ctx, agent_id, target_persona_hash, epoch_hash, sequence)
    }
}
