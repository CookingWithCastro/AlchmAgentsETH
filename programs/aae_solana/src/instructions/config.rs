use anchor_lang::prelude::*;

use crate::{
    constants::{PROGRAM_AUTHORITY_SEED, STATE_VERSION},
    errors::AaeError,
    state::ProgramConfig,
};

pub fn initialize(
    ctx: Context<InitializeConfig>,
    attestor: Pubkey,
    pauser: Pubkey,
    cluster_domain: [u8; 32],
) -> Result<()> {
    require_keys_neq!(attestor, Pubkey::default(), AaeError::DefaultAuthority);
    require_keys_neq!(pauser, Pubkey::default(), AaeError::DefaultAuthority);
    require!(cluster_domain != [0_u8; 32], AaeError::InvalidClusterDomain);

    ctx.accounts.program_config.set_inner(ProgramConfig {
        version: STATE_VERSION,
        admin: ctx.accounts.admin.key(),
        attestor,
        pauser,
        cluster_domain,
        pause_claims: false,
        pause_redemptions: false,
        bump: ctx.bumps.program_config,
    });
    Ok(())
}

pub fn set_pause_state(
    ctx: Context<SetPauseState>,
    pause_claims: bool,
    pause_redemptions: bool,
) -> Result<()> {
    require!(
        ctx.accounts
            .program_config
            .can_pause(&ctx.accounts.authority.key()),
        AaeError::Unauthorized
    );
    ctx.accounts.program_config.pause_claims = pause_claims;
    ctx.accounts.program_config.pause_redemptions = pause_redemptions;
    Ok(())
}

#[derive(Accounts)]
pub struct InitializeConfig<'info> {
    #[account(
        init,
        payer = admin,
        space = 8 + ProgramConfig::INIT_SPACE,
        seeds = [PROGRAM_AUTHORITY_SEED],
        bump
    )]
    pub program_config: Account<'info, ProgramConfig>,
    #[account(mut)]
    pub admin: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SetPauseState<'info> {
    #[account(
        mut,
        seeds = [PROGRAM_AUTHORITY_SEED],
        bump = program_config.bump
    )]
    pub program_config: Account<'info, ProgramConfig>,
    pub authority: Signer<'info>,
}
