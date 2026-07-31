use anchor_lang::prelude::*;

use crate::{
    constants::{PERSONA_COMMITMENT_SEED, PROGRAM_AUTHORITY_SEED, STATE_VERSION},
    errors::AaeError,
    state::{PersonaCommitment, ProgramConfig},
};

pub fn record(
    ctx: Context<RecordPersonaCommitment>,
    agent_id: [u8; 32],
    target_persona_hash: [u8; 32],
    epoch_hash: [u8; 32],
    sequence: u64,
) -> Result<()> {
    require!(
        ctx.accounts
            .program_config
            .can_attest(&ctx.accounts.writer.key()),
        AaeError::Unauthorized
    );
    require!(
        agent_id != [0_u8; 32] && target_persona_hash != [0_u8; 32] && epoch_hash != [0_u8; 32],
        AaeError::ZeroCommitment
    );

    let commitment = &mut ctx.accounts.persona_commitment;
    let expected_sequence = if commitment.version == 0 {
        1
    } else {
        commitment
            .sequence
            .checked_add(1)
            .ok_or(AaeError::ArithmeticOverflow)?
    };
    require_eq!(sequence, expected_sequence, AaeError::InvalidSequence);

    commitment.set_inner(PersonaCommitment {
        version: STATE_VERSION,
        agent_id,
        target_persona_hash,
        epoch_hash,
        sequence,
        writer: ctx.accounts.writer.key(),
        updated_slot: Clock::get()?.slot,
        bump: ctx.bumps.persona_commitment,
    });
    Ok(())
}

#[derive(Accounts)]
#[instruction(agent_id: [u8; 32])]
pub struct RecordPersonaCommitment<'info> {
    #[account(
        seeds = [PROGRAM_AUTHORITY_SEED],
        bump = program_config.bump
    )]
    pub program_config: Account<'info, ProgramConfig>,
    #[account(
        init_if_needed,
        payer = writer,
        space = 8 + PersonaCommitment::INIT_SPACE,
        seeds = [PERSONA_COMMITMENT_SEED, agent_id.as_ref()],
        bump
    )]
    pub persona_commitment: Account<'info, PersonaCommitment>,
    #[account(mut)]
    pub writer: Signer<'info>,
    pub system_program: Program<'info, System>,
}
