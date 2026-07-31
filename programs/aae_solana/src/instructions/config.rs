use anchor_lang::prelude::*;

use crate::{
    constants::{PROGRAM_AUTHORITY_SEED, STATE_VERSION},
    errors::AaeError,
    program::AaeSolana,
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

pub fn set_service_authorities(
    ctx: Context<SetServiceAuthorities>,
    attestor: Pubkey,
    pauser: Pubkey,
) -> Result<()> {
    require_keys_eq!(
        ctx.accounts.authority.key(),
        ctx.accounts.program_config.admin,
        AaeError::Unauthorized
    );
    ctx.accounts.program_config.attestor = attestor;
    ctx.accounts.program_config.pauser = pauser;
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
    #[account(constraint = program.programdata_address()? == Some(program_data.key()))]
    pub program: Program<'info, AaeSolana>,
    #[account(constraint = program_data.upgrade_authority_address == Some(admin.key()))]
    pub program_data: Account<'info, ProgramData>,
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

#[derive(Accounts)]
pub struct SetServiceAuthorities<'info> {
    #[account(
        mut,
        seeds = [PROGRAM_AUTHORITY_SEED],
        bump = program_config.bump
    )]
    pub program_config: Account<'info, ProgramConfig>,
    pub authority: Signer<'info>,
}
