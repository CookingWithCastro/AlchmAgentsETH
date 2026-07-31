use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct ProgramConfig {
    pub version: u8,
    pub admin: Pubkey,
    pub attestor: Pubkey,
    pub pauser: Pubkey,
    pub cluster_domain: [u8; 32],
    pub pause_claims: bool,
    pub pause_redemptions: bool,
    pub bump: u8,
}

impl ProgramConfig {
    pub fn can_attest(&self, authority: &Pubkey) -> bool {
        authority == &self.admin || authority == &self.attestor
    }

    pub fn can_pause(&self, authority: &Pubkey) -> bool {
        authority == &self.admin || authority == &self.pauser
    }
}

#[account]
#[derive(InitSpace)]
pub struct PersonaCommitment {
    pub version: u8,
    pub agent_id: [u8; 32],
    pub target_persona_hash: [u8; 32],
    pub epoch_hash: [u8; 32],
    pub sequence: u64,
    pub writer: Pubkey,
    pub updated_slot: u64,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct ClaimReceipt {
    pub version: u8,
    pub claim_id: [u8; 32],
    pub ledger_reference_hash: [u8; 32],
    pub recipient: Pubkey,
    pub amounts: [u64; 4],
    pub authority: Pubkey,
    pub settled_slot: u64,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct OrderReceipt {
    pub version: u8,
    pub order_id: [u8; 32],
    pub holder: Pubkey,
    pub amounts: [u64; 4],
    pub submitter: Pubkey,
    pub mode: u8,
    pub settled_slot: u64,
    pub bump: u8,
}
