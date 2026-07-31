use anchor_lang::{
    prelude::*,
    solana_program::{
        ed25519_program,
        instruction::{AccountMeta, Instruction},
        program::invoke_signed,
        program_option::COption,
        system_instruction,
        sysvar::instructions::{load_current_index_checked, load_instruction_at_checked},
    },
};
use anchor_spl::token_2022_extensions::spl_token_metadata_interface::borsh::BorshDeserialize;
use anchor_spl::{
    associated_token::{self, AssociatedToken, Create as CreateAssociatedToken},
    token_2022::{self, spl_token_2022, InitializeMint2, MintTo, Token2022},
    token_2022_extensions::{
        metadata_pointer::{metadata_pointer_initialize, MetadataPointerInitialize},
        non_transferable::{non_transferable_mint_initialize, NonTransferableMintInitialize},
        permanent_delegate::{permanent_delegate_initialize, PermanentDelegateInitialize},
        spl_token_metadata_interface,
        token_metadata::{token_metadata_initialize, TokenMetadataInitialize},
    },
    token_interface::{Mint, TokenAccount},
};

use crate::{
    constants::{
        CLAIM_RECEIPT_SEED, ED25519_PUBLIC_KEY_SIZE, ED25519_SIGNATURE_SIZE, ESMS_DECIMALS,
        ESMS_METADATA_URIS, ESMS_MINT_COUNT, ESMS_MINT_SEED, ESMS_NAMES, ESMS_SYMBOLS,
        MAX_LEDGER_ATOMS, ORDER_RECEIPT_SEED, PERMISSIONED_BURN_BURN_CHECKED_TAG,
        PERMISSIONED_BURN_EXTENSION_TYPE, PERMISSIONED_BURN_INITIALIZE_TAG,
        PERMISSIONED_BURN_INSTRUCTION_TAG, PROGRAM_AUTHORITY_SEED, REDEEM_AUTHORIZATION_DOMAIN,
        REDEMPTION_MODE_SELF, REDEMPTION_MODE_SPONSORED, STATE_VERSION,
    },
    errors::AaeError,
    state::{ClaimReceipt, OrderReceipt, ProgramConfig},
};

const TOKEN_2022_TLV_START: usize = 166;
const TLV_HEADER_LEN: usize = 4;

pub fn initialize_mints(ctx: Context<InitializeEsmsMints>) -> Result<()> {
    require_keys_eq!(
        ctx.accounts.admin.key(),
        ctx.accounts.program_config.admin,
        AaeError::Unauthorized
    );

    let mints = [
        ctx.accounts.spirit_mint.to_account_info(),
        ctx.accounts.essence_mint.to_account_info(),
        ctx.accounts.matter_mint.to_account_info(),
        ctx.accounts.substance_mint.to_account_info(),
    ];
    let bumps = [
        ctx.bumps.spirit_mint,
        ctx.bumps.essence_mint,
        ctx.bumps.matter_mint,
        ctx.bumps.substance_mint,
    ];

    for mint_id in 0..ESMS_MINT_COUNT {
        initialize_or_validate_mint(
            &ctx.accounts.admin.to_account_info(),
            &ctx.accounts.program_config.to_account_info(),
            &mints[mint_id],
            &ctx.accounts.token_program.to_account_info(),
            mint_id as u8,
            bumps[mint_id],
            ctx.accounts.program_config.bump,
        )?;
    }
    Ok(())
}

pub fn claim_mint(
    ctx: Context<ClaimMintEsms>,
    claim_id: [u8; 32],
    ledger_reference_hash: [u8; 32],
    amounts: [u64; ESMS_MINT_COUNT],
) -> Result<()> {
    let config = &ctx.accounts.program_config;
    require!(!config.pause_claims, AaeError::ClaimsPaused);
    require!(
        config.can_attest(&ctx.accounts.authority.key()),
        AaeError::Unauthorized
    );
    require!(
        claim_id != [0; 32] && ledger_reference_hash != [0; 32],
        AaeError::ZeroReceiptIdentifier
    );
    validate_amounts(&amounts)?;

    let mints = [
        ctx.accounts.spirit_mint.to_account_info(),
        ctx.accounts.essence_mint.to_account_info(),
        ctx.accounts.matter_mint.to_account_info(),
        ctx.accounts.substance_mint.to_account_info(),
    ];
    let destinations = [
        ctx.accounts.spirit_account.to_account_info(),
        ctx.accounts.essence_account.to_account_info(),
        ctx.accounts.matter_account.to_account_info(),
        ctx.accounts.substance_account.to_account_info(),
    ];
    let config_bump = [config.bump];
    let signer = [PROGRAM_AUTHORITY_SEED, config_bump.as_ref()];

    for index in 0..ESMS_MINT_COUNT {
        let expected_ata = associated_token::get_associated_token_address_with_program_id(
            &ctx.accounts.recipient.key(),
            mints[index].key,
            &spl_token_2022::ID,
        );
        require_keys_eq!(
            *destinations[index].key,
            expected_ata,
            AaeError::InvalidTokenAccount
        );
        associated_token::create_idempotent(CpiContext::new(
            ctx.accounts.associated_token_program.to_account_info(),
            CreateAssociatedToken {
                payer: ctx.accounts.authority.to_account_info(),
                associated_token: destinations[index].clone(),
                authority: ctx.accounts.recipient.to_account_info(),
                mint: mints[index].clone(),
                system_program: ctx.accounts.system_program.to_account_info(),
                token_program: ctx.accounts.token_program.to_account_info(),
            },
        ))?;
        if amounts[index] == 0 {
            continue;
        }
        token_2022::mint_to(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                MintTo {
                    mint: mints[index].clone(),
                    to: destinations[index].clone(),
                    authority: ctx.accounts.program_config.to_account_info(),
                },
                &[&signer],
            ),
            amounts[index],
        )?;
    }

    ctx.accounts.claim_receipt.set_inner(ClaimReceipt {
        version: STATE_VERSION,
        claim_id,
        ledger_reference_hash,
        recipient: ctx.accounts.recipient.key(),
        amounts,
        authority: ctx.accounts.authority.key(),
        settled_slot: Clock::get()?.slot,
        bump: ctx.bumps.claim_receipt,
    });
    Ok(())
}

pub fn redeem(
    ctx: Context<RedeemEsms>,
    order_id: [u8; 32],
    amounts: [u64; ESMS_MINT_COUNT],
) -> Result<()> {
    require!(
        !ctx.accounts.program_config.pause_redemptions,
        AaeError::RedemptionsPaused
    );
    require!(order_id != [0; 32], AaeError::ZeroReceiptIdentifier);
    validate_amounts(&amounts)?;

    let sources = redemption_sources(ctx.accounts);
    let mints = redemption_mints(ctx.accounts);
    burn_all(
        &ctx.accounts.program_config,
        &ctx.accounts.holder.to_account_info(),
        &sources,
        &mints,
        &ctx.accounts.token_program.to_account_info(),
        &amounts,
    )?;

    write_order_receipt(
        &mut ctx.accounts.order_receipt,
        order_id,
        ctx.accounts.holder.key(),
        amounts,
        ctx.accounts.holder.key(),
        REDEMPTION_MODE_SELF,
        ctx.bumps.order_receipt,
    )
}

pub fn redeem_for(
    ctx: Context<RedeemForEsms>,
    order_id: [u8; 32],
    amounts: [u64; ESMS_MINT_COUNT],
    deadline: i64,
) -> Result<()> {
    require!(
        !ctx.accounts.program_config.pause_redemptions,
        AaeError::RedemptionsPaused
    );
    require!(order_id != [0; 32], AaeError::ZeroReceiptIdentifier);
    validate_amounts(&amounts)?;
    require!(
        Clock::get()?.unix_timestamp <= deadline,
        AaeError::AuthorizationExpired
    );
    require_keys_eq!(
        ctx.accounts.instructions.key(),
        anchor_lang::solana_program::sysvar::instructions::ID,
        AaeError::InvalidInstructionsSysvar
    );

    let expected_message = redeem_authorization_message(
        &crate::ID,
        &ctx.accounts.program_config.cluster_domain,
        &ctx.accounts.holder.key(),
        &order_id,
        &amounts,
        deadline,
    );
    verify_preceding_ed25519_instruction(
        &ctx.accounts.instructions.to_account_info(),
        &ctx.accounts.holder.key(),
        &expected_message,
    )?;

    let sources = sponsored_sources(ctx.accounts);
    let mints = sponsored_mints(ctx.accounts);
    let delegate = ctx.accounts.program_config.to_account_info();
    burn_all(
        &ctx.accounts.program_config,
        &delegate,
        &sources,
        &mints,
        &ctx.accounts.token_program.to_account_info(),
        &amounts,
    )?;

    write_order_receipt(
        &mut ctx.accounts.order_receipt,
        order_id,
        ctx.accounts.holder.key(),
        amounts,
        ctx.accounts.sponsor.key(),
        REDEMPTION_MODE_SPONSORED,
        ctx.bumps.order_receipt,
    )
}

fn initialize_or_validate_mint<'info>(
    payer: &AccountInfo<'info>,
    config: &AccountInfo<'info>,
    mint: &AccountInfo<'info>,
    token_program: &AccountInfo<'info>,
    mint_id: u8,
    mint_bump: u8,
    config_bump: u8,
) -> Result<()> {
    require_keys_eq!(
        *token_program.key,
        spl_token_2022::ID,
        AaeError::InvalidTokenProgram
    );

    if mint.owner == token_program.key && !mint.data_is_empty() {
        return validate_existing_mint(mint, config.key, mint_id as usize);
    }
    require!(mint.data_is_empty(), AaeError::InvalidMint);

    let space = esms_mint_fixed_account_len()?;
    let lamports = Rent::get()?.minimum_balance(esms_mint_account_len(mint_id as usize)?);
    let mint_id_seed = [mint_id];
    let mint_bump_seed = [mint_bump];
    let mint_signer = [
        ESMS_MINT_SEED,
        mint_id_seed.as_ref(),
        mint_bump_seed.as_ref(),
    ];
    if mint.lamports() == 0 {
        invoke_signed(
            &system_instruction::create_account(
                payer.key,
                mint.key,
                lamports,
                space as u64,
                token_program.key,
            ),
            &[payer.clone(), mint.clone()],
            &[&mint_signer],
        )?;
    } else {
        require_keys_eq!(
            *mint.owner,
            anchor_lang::system_program::ID,
            AaeError::InvalidMint
        );
        let rent_top_up = lamports.saturating_sub(mint.lamports());
        if rent_top_up > 0 {
            invoke_signed(
                &system_instruction::transfer(payer.key, mint.key, rent_top_up),
                &[payer.clone(), mint.clone()],
                &[],
            )?;
        }
        invoke_signed(
            &system_instruction::allocate(mint.key, space as u64),
            &[mint.clone()],
            &[&mint_signer],
        )?;
        invoke_signed(
            &system_instruction::assign(mint.key, token_program.key),
            &[mint.clone()],
            &[&mint_signer],
        )?;
    }

    non_transferable_mint_initialize(CpiContext::new(
        token_program.clone(),
        NonTransferableMintInitialize {
            token_program_id: token_program.clone(),
            mint: mint.clone(),
        },
    ))?;
    permanent_delegate_initialize(
        CpiContext::new(
            token_program.clone(),
            PermanentDelegateInitialize {
                token_program_id: token_program.clone(),
                mint: mint.clone(),
            },
        ),
        config.key,
    )?;
    metadata_pointer_initialize(
        CpiContext::new(
            token_program.clone(),
            MetadataPointerInitialize {
                token_program_id: token_program.clone(),
                mint: mint.clone(),
            },
        ),
        Some(*config.key),
        Some(*mint.key),
    )?;
    initialize_permissioned_burn(mint, token_program, config.key)?;
    token_2022::initialize_mint2(
        CpiContext::new(
            token_program.clone(),
            InitializeMint2 { mint: mint.clone() },
        ),
        ESMS_DECIMALS,
        config.key,
        None,
    )?;

    let config_bump_seed = [config_bump];
    let config_signer = [PROGRAM_AUTHORITY_SEED, config_bump_seed.as_ref()];
    token_metadata_initialize(
        CpiContext::new_with_signer(
            token_program.clone(),
            TokenMetadataInitialize {
                token_program_id: token_program.clone(),
                metadata: mint.clone(),
                update_authority: config.clone(),
                mint_authority: config.clone(),
                mint: mint.clone(),
            },
            &[&config_signer],
        ),
        ESMS_NAMES[mint_id as usize].to_owned(),
        ESMS_SYMBOLS[mint_id as usize].to_owned(),
        ESMS_METADATA_URIS[mint_id as usize].to_owned(),
    )?;

    validate_existing_mint(mint, config.key, mint_id as usize)
}

fn esms_mint_account_len(mint_id: usize) -> Result<usize> {
    esms_mint_fixed_account_len()?
        .checked_add(TLV_HEADER_LEN + esms_metadata_value_len(mint_id))
        .ok_or_else(|| error!(AaeError::ArithmeticOverflow))
}

fn esms_mint_fixed_account_len() -> Result<usize> {
    let fixed = spl_token_2022::extension::ExtensionType::try_calculate_account_len::<
        spl_token_2022::state::Mint,
    >(&[
        spl_token_2022::extension::ExtensionType::NonTransferable,
        spl_token_2022::extension::ExtensionType::PermanentDelegate,
        spl_token_2022::extension::ExtensionType::MetadataPointer,
    ])?;
    let permissioned_burn_tlv = TLV_HEADER_LEN + ED25519_PUBLIC_KEY_SIZE;
    fixed
        .checked_add(permissioned_burn_tlv)
        .ok_or_else(|| error!(AaeError::ArithmeticOverflow))
}

fn esms_metadata_value_len(mint_id: usize) -> usize {
    80 + ESMS_NAMES[mint_id].len() + ESMS_SYMBOLS[mint_id].len() + ESMS_METADATA_URIS[mint_id].len()
}

fn initialize_permissioned_burn<'info>(
    mint: &AccountInfo<'info>,
    token_program: &AccountInfo<'info>,
    authority: &Pubkey,
) -> Result<()> {
    let mut data = Vec::with_capacity(34);
    data.push(PERMISSIONED_BURN_INSTRUCTION_TAG);
    data.push(PERMISSIONED_BURN_INITIALIZE_TAG);
    data.extend_from_slice(authority.as_ref());
    let instruction = Instruction {
        program_id: *token_program.key,
        accounts: vec![AccountMeta::new(*mint.key, false)],
        data,
    };
    invoke_signed(&instruction, &[mint.clone()], &[]).map_err(Into::into)
}

fn validate_existing_mint(mint: &AccountInfo, authority: &Pubkey, mint_id: usize) -> Result<()> {
    require_keys_eq!(*mint.owner, spl_token_2022::ID, AaeError::InvalidMint);
    let data = mint.try_borrow_data()?;
    let state =
        spl_token_2022::extension::StateWithExtensions::<spl_token_2022::state::Mint>::unpack(
            &data,
        )
        .map_err(|_| error!(AaeError::InvalidMint))?;
    require!(state.base.is_initialized, AaeError::InvalidMint);
    require_eq!(state.base.decimals, ESMS_DECIMALS, AaeError::InvalidMint);
    require!(
        state.base.mint_authority == COption::Some(*authority)
            && state.base.freeze_authority == COption::None,
        AaeError::InvalidMint
    );

    let mut has_non_transferable = false;
    let mut has_permanent_delegate = false;
    let mut has_metadata_pointer = false;
    let mut has_metadata = false;
    let mut has_permissioned_burn = false;
    let mut cursor = TOKEN_2022_TLV_START;
    while cursor + TLV_HEADER_LEN <= data.len() {
        let extension_type = u16::from_le_bytes([data[cursor], data[cursor + 1]]);
        let extension_len = u16::from_le_bytes([data[cursor + 2], data[cursor + 3]]) as usize;
        if extension_type == 0 && extension_len == 0 {
            break;
        }
        let value_start = cursor + TLV_HEADER_LEN;
        let value_end = value_start
            .checked_add(extension_len)
            .ok_or(AaeError::ArithmeticOverflow)?;
        require!(value_end <= data.len(), AaeError::InvalidMintExtensions);
        let value = &data[value_start..value_end];
        match extension_type {
            9 => {
                require!(!has_non_transferable, AaeError::InvalidMintExtensions);
                has_non_transferable = extension_len == 0;
            }
            12 => {
                require!(!has_permanent_delegate, AaeError::InvalidMintExtensions);
                has_permanent_delegate = extension_len == 32 && value == authority.as_ref();
            }
            18 => {
                require!(!has_metadata_pointer, AaeError::InvalidMintExtensions);
                has_metadata_pointer = extension_len == 64
                    && &value[..32] == authority.as_ref()
                    && &value[32..] == mint.key.as_ref();
            }
            19 => {
                require!(!has_metadata, AaeError::InvalidMintExtensions);
                let mut metadata_bytes = value;
                let metadata = spl_token_metadata_interface::state::TokenMetadata::deserialize(
                    &mut metadata_bytes,
                )
                .map_err(|_| error!(AaeError::InvalidMintExtensions))?;
                has_metadata = metadata.update_authority.0 == *authority
                    && metadata.mint == *mint.key
                    && metadata.name == ESMS_NAMES[mint_id]
                    && metadata.symbol == ESMS_SYMBOLS[mint_id]
                    && metadata.uri == ESMS_METADATA_URIS[mint_id]
                    && metadata.additional_metadata.is_empty()
                    && metadata_bytes.is_empty();
            }
            PERMISSIONED_BURN_EXTENSION_TYPE => {
                require!(!has_permissioned_burn, AaeError::InvalidMintExtensions);
                has_permissioned_burn = extension_len == 32 && value == authority.as_ref();
            }
            _ => return err!(AaeError::InvalidMintExtensions),
        }
        cursor = value_end;
    }
    require!(
        has_non_transferable
            && has_permanent_delegate
            && has_metadata_pointer
            && has_metadata
            && has_permissioned_burn,
        AaeError::InvalidMintExtensions
    );
    Ok(())
}

fn validate_amounts(amounts: &[u64; ESMS_MINT_COUNT]) -> Result<()> {
    require!(
        amounts.iter().any(|amount| *amount != 0),
        AaeError::EmptyAmounts
    );
    require!(
        amounts.iter().all(|amount| *amount <= MAX_LEDGER_ATOMS),
        AaeError::AmountOutOfRange
    );
    Ok(())
}

fn burn_all<'info>(
    config: &Account<'info, ProgramConfig>,
    token_owner_or_delegate: &AccountInfo<'info>,
    sources: &[AccountInfo<'info>; ESMS_MINT_COUNT],
    mints: &[AccountInfo<'info>; ESMS_MINT_COUNT],
    token_program: &AccountInfo<'info>,
    amounts: &[u64; ESMS_MINT_COUNT],
) -> Result<()> {
    let config_info = config.to_account_info();
    let config_bump = [config.bump];
    let config_signer = [PROGRAM_AUTHORITY_SEED, config_bump.as_ref()];
    for index in 0..ESMS_MINT_COUNT {
        if amounts[index] == 0 {
            continue;
        }
        permissioned_burn_checked(
            &sources[index],
            &mints[index],
            &config_info,
            token_owner_or_delegate,
            token_program,
            amounts[index],
            &[&config_signer],
        )?;
    }
    Ok(())
}

fn permissioned_burn_checked<'info>(
    source: &AccountInfo<'info>,
    mint: &AccountInfo<'info>,
    permissioned_burn_authority: &AccountInfo<'info>,
    owner_or_delegate: &AccountInfo<'info>,
    token_program: &AccountInfo<'info>,
    amount: u64,
    signer_seeds: &[&[&[u8]]],
) -> Result<()> {
    let mut data = Vec::with_capacity(11);
    data.push(PERMISSIONED_BURN_INSTRUCTION_TAG);
    data.push(PERMISSIONED_BURN_BURN_CHECKED_TAG);
    data.extend_from_slice(&amount.to_le_bytes());
    data.push(ESMS_DECIMALS);
    let instruction = Instruction {
        program_id: *token_program.key,
        accounts: vec![
            AccountMeta::new(*source.key, false),
            AccountMeta::new(*mint.key, false),
            AccountMeta::new_readonly(*permissioned_burn_authority.key, true),
            AccountMeta::new_readonly(*owner_or_delegate.key, true),
        ],
        data,
    };
    invoke_signed(
        &instruction,
        &[
            source.clone(),
            mint.clone(),
            permissioned_burn_authority.clone(),
            owner_or_delegate.clone(),
        ],
        signer_seeds,
    )
    .map_err(Into::into)
}

pub fn redeem_authorization_message(
    program_id: &Pubkey,
    cluster_domain: &[u8; 32],
    holder: &Pubkey,
    order_id: &[u8; 32],
    amounts: &[u64; ESMS_MINT_COUNT],
    deadline: i64,
) -> Vec<u8> {
    let mut message = Vec::with_capacity(
        REDEEM_AUTHORIZATION_DOMAIN.len() + 32 + 32 + 32 + 32 + 8 * ESMS_MINT_COUNT + 8,
    );
    message.extend_from_slice(REDEEM_AUTHORIZATION_DOMAIN);
    message.extend_from_slice(program_id.as_ref());
    message.extend_from_slice(cluster_domain);
    message.extend_from_slice(holder.as_ref());
    message.extend_from_slice(order_id);
    for amount in amounts {
        message.extend_from_slice(&amount.to_le_bytes());
    }
    message.extend_from_slice(&deadline.to_le_bytes());
    message
}

fn verify_preceding_ed25519_instruction(
    instructions: &AccountInfo,
    holder: &Pubkey,
    expected_message: &[u8],
) -> Result<()> {
    let current_index = load_current_index_checked(instructions)
        .map_err(|_| error!(AaeError::InvalidInstructionsSysvar))?;
    require!(current_index > 0, AaeError::InvalidEd25519Authorization);
    let ed25519_instruction = load_instruction_at_checked(current_index as usize - 1, instructions)
        .map_err(|_| error!(AaeError::InvalidEd25519Authorization))?;
    require_keys_eq!(
        ed25519_instruction.program_id,
        ed25519_program::ID,
        AaeError::InvalidEd25519Authorization
    );
    let data = &ed25519_instruction.data;
    require!(data.len() >= 16, AaeError::InvalidEd25519Authorization);
    require!(
        data[0] == 1 && data[1] == 0,
        AaeError::InvalidEd25519Authorization
    );

    let read_u16 = |offset: usize| u16::from_le_bytes([data[offset], data[offset + 1]]);
    let signature_offset = read_u16(2) as usize;
    let signature_instruction_index = read_u16(4);
    let public_key_offset = read_u16(6) as usize;
    let public_key_instruction_index = read_u16(8);
    let message_offset = read_u16(10) as usize;
    let message_size = read_u16(12) as usize;
    let message_instruction_index = read_u16(14);
    require!(
        signature_instruction_index == u16::MAX
            && public_key_instruction_index == u16::MAX
            && message_instruction_index == u16::MAX,
        AaeError::InvalidEd25519Authorization
    );
    require!(
        signature_offset
            .checked_add(ED25519_SIGNATURE_SIZE)
            .is_some_and(|end| end <= data.len())
            && public_key_offset
                .checked_add(ED25519_PUBLIC_KEY_SIZE)
                .is_some_and(|end| end <= data.len())
            && message_offset
                .checked_add(message_size)
                .is_some_and(|end| end <= data.len()),
        AaeError::InvalidEd25519Authorization
    );
    require!(
        &data[public_key_offset..public_key_offset + ED25519_PUBLIC_KEY_SIZE] == holder.as_ref()
            && message_size == expected_message.len()
            && &data[message_offset..message_offset + message_size] == expected_message,
        AaeError::InvalidEd25519Authorization
    );
    Ok(())
}

fn write_order_receipt(
    receipt: &mut Account<OrderReceipt>,
    order_id: [u8; 32],
    holder: Pubkey,
    amounts: [u64; ESMS_MINT_COUNT],
    submitter: Pubkey,
    mode: u8,
    bump: u8,
) -> Result<()> {
    receipt.set_inner(OrderReceipt {
        version: STATE_VERSION,
        order_id,
        holder,
        amounts,
        submitter,
        mode,
        settled_slot: Clock::get()?.slot,
        bump,
    });
    Ok(())
}

fn redemption_sources<'info>(
    accounts: &RedeemEsms<'info>,
) -> [AccountInfo<'info>; ESMS_MINT_COUNT] {
    [
        accounts.spirit_account.to_account_info(),
        accounts.essence_account.to_account_info(),
        accounts.matter_account.to_account_info(),
        accounts.substance_account.to_account_info(),
    ]
}

fn redemption_mints<'info>(accounts: &RedeemEsms<'info>) -> [AccountInfo<'info>; ESMS_MINT_COUNT] {
    [
        accounts.spirit_mint.to_account_info(),
        accounts.essence_mint.to_account_info(),
        accounts.matter_mint.to_account_info(),
        accounts.substance_mint.to_account_info(),
    ]
}

fn sponsored_sources<'info>(
    accounts: &RedeemForEsms<'info>,
) -> [AccountInfo<'info>; ESMS_MINT_COUNT] {
    [
        accounts.spirit_account.to_account_info(),
        accounts.essence_account.to_account_info(),
        accounts.matter_account.to_account_info(),
        accounts.substance_account.to_account_info(),
    ]
}

fn sponsored_mints<'info>(
    accounts: &RedeemForEsms<'info>,
) -> [AccountInfo<'info>; ESMS_MINT_COUNT] {
    [
        accounts.spirit_mint.to_account_info(),
        accounts.essence_mint.to_account_info(),
        accounts.matter_mint.to_account_info(),
        accounts.substance_mint.to_account_info(),
    ]
}

#[derive(Accounts)]
pub struct InitializeEsmsMints<'info> {
    #[account(seeds = [PROGRAM_AUTHORITY_SEED], bump = program_config.bump)]
    pub program_config: Box<Account<'info, ProgramConfig>>,
    #[account(mut)]
    pub admin: Signer<'info>,
    /// CHECK: The PDA and Token-2022 owner are checked before initialization or reuse.
    #[account(mut, seeds = [ESMS_MINT_SEED, &[0]], bump)]
    pub spirit_mint: UncheckedAccount<'info>,
    /// CHECK: The PDA and Token-2022 owner are checked before initialization or reuse.
    #[account(mut, seeds = [ESMS_MINT_SEED, &[1]], bump)]
    pub essence_mint: UncheckedAccount<'info>,
    /// CHECK: The PDA and Token-2022 owner are checked before initialization or reuse.
    #[account(mut, seeds = [ESMS_MINT_SEED, &[2]], bump)]
    pub matter_mint: UncheckedAccount<'info>,
    /// CHECK: The PDA and Token-2022 owner are checked before initialization or reuse.
    #[account(mut, seeds = [ESMS_MINT_SEED, &[3]], bump)]
    pub substance_mint: UncheckedAccount<'info>,
    pub token_program: Program<'info, Token2022>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(claim_id: [u8; 32])]
pub struct ClaimMintEsms<'info> {
    #[account(seeds = [PROGRAM_AUTHORITY_SEED], bump = program_config.bump)]
    pub program_config: Box<Account<'info, ProgramConfig>>,
    #[account(
        init,
        payer = authority,
        space = 8 + ClaimReceipt::INIT_SPACE,
        seeds = [CLAIM_RECEIPT_SEED, claim_id.as_ref()],
        bump
    )]
    pub claim_receipt: Box<Account<'info, ClaimReceipt>>,
    #[account(mut)]
    pub authority: Signer<'info>,
    /// CHECK: May be any wallet; its key is enforced by all ATA constraints.
    pub recipient: UncheckedAccount<'info>,
    #[account(mut, seeds = [ESMS_MINT_SEED, &[0]], bump, owner = spl_token_2022::ID)]
    pub spirit_mint: InterfaceAccount<'info, Mint>,
    #[account(mut, seeds = [ESMS_MINT_SEED, &[1]], bump, owner = spl_token_2022::ID)]
    pub essence_mint: InterfaceAccount<'info, Mint>,
    #[account(mut, seeds = [ESMS_MINT_SEED, &[2]], bump, owner = spl_token_2022::ID)]
    pub matter_mint: InterfaceAccount<'info, Mint>,
    #[account(mut, seeds = [ESMS_MINT_SEED, &[3]], bump, owner = spl_token_2022::ID)]
    pub substance_mint: InterfaceAccount<'info, Mint>,
    /// CHECK: The handler verifies the Token-2022 ATA address and creates it idempotently.
    #[account(mut)]
    pub spirit_account: UncheckedAccount<'info>,
    /// CHECK: The handler verifies the Token-2022 ATA address and creates it idempotently.
    #[account(mut)]
    pub essence_account: UncheckedAccount<'info>,
    /// CHECK: The handler verifies the Token-2022 ATA address and creates it idempotently.
    #[account(mut)]
    pub matter_account: UncheckedAccount<'info>,
    /// CHECK: The handler verifies the Token-2022 ATA address and creates it idempotently.
    #[account(mut)]
    pub substance_account: UncheckedAccount<'info>,
    pub token_program: Program<'info, Token2022>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(order_id: [u8; 32])]
pub struct RedeemEsms<'info> {
    #[account(seeds = [PROGRAM_AUTHORITY_SEED], bump = program_config.bump)]
    pub program_config: Box<Account<'info, ProgramConfig>>,
    #[account(
        init,
        payer = holder,
        space = 8 + OrderReceipt::INIT_SPACE,
        seeds = [ORDER_RECEIPT_SEED, order_id.as_ref()],
        bump
    )]
    pub order_receipt: Box<Account<'info, OrderReceipt>>,
    #[account(mut)]
    pub holder: Signer<'info>,
    #[account(mut, seeds = [ESMS_MINT_SEED, &[0]], bump, owner = spl_token_2022::ID)]
    pub spirit_mint: InterfaceAccount<'info, Mint>,
    #[account(mut, seeds = [ESMS_MINT_SEED, &[1]], bump, owner = spl_token_2022::ID)]
    pub essence_mint: InterfaceAccount<'info, Mint>,
    #[account(mut, seeds = [ESMS_MINT_SEED, &[2]], bump, owner = spl_token_2022::ID)]
    pub matter_mint: InterfaceAccount<'info, Mint>,
    #[account(mut, seeds = [ESMS_MINT_SEED, &[3]], bump, owner = spl_token_2022::ID)]
    pub substance_mint: InterfaceAccount<'info, Mint>,
    #[account(mut, associated_token::mint = spirit_mint, associated_token::authority = holder, associated_token::token_program = token_program)]
    pub spirit_account: Box<InterfaceAccount<'info, TokenAccount>>,
    #[account(mut, associated_token::mint = essence_mint, associated_token::authority = holder, associated_token::token_program = token_program)]
    pub essence_account: Box<InterfaceAccount<'info, TokenAccount>>,
    #[account(mut, associated_token::mint = matter_mint, associated_token::authority = holder, associated_token::token_program = token_program)]
    pub matter_account: Box<InterfaceAccount<'info, TokenAccount>>,
    #[account(mut, associated_token::mint = substance_mint, associated_token::authority = holder, associated_token::token_program = token_program)]
    pub substance_account: Box<InterfaceAccount<'info, TokenAccount>>,
    pub token_program: Program<'info, Token2022>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(order_id: [u8; 32])]
pub struct RedeemForEsms<'info> {
    #[account(seeds = [PROGRAM_AUTHORITY_SEED], bump = program_config.bump)]
    pub program_config: Box<Account<'info, ProgramConfig>>,
    #[account(
        init,
        payer = sponsor,
        space = 8 + OrderReceipt::INIT_SPACE,
        seeds = [ORDER_RECEIPT_SEED, order_id.as_ref()],
        bump
    )]
    pub order_receipt: Box<Account<'info, OrderReceipt>>,
    #[account(mut)]
    pub sponsor: Signer<'info>,
    /// CHECK: The Ed25519 precompile verifies this key and all ATA constraints bind it.
    pub holder: UncheckedAccount<'info>,
    #[account(mut, seeds = [ESMS_MINT_SEED, &[0]], bump, owner = spl_token_2022::ID)]
    pub spirit_mint: InterfaceAccount<'info, Mint>,
    #[account(mut, seeds = [ESMS_MINT_SEED, &[1]], bump, owner = spl_token_2022::ID)]
    pub essence_mint: InterfaceAccount<'info, Mint>,
    #[account(mut, seeds = [ESMS_MINT_SEED, &[2]], bump, owner = spl_token_2022::ID)]
    pub matter_mint: InterfaceAccount<'info, Mint>,
    #[account(mut, seeds = [ESMS_MINT_SEED, &[3]], bump, owner = spl_token_2022::ID)]
    pub substance_mint: InterfaceAccount<'info, Mint>,
    #[account(mut, associated_token::mint = spirit_mint, associated_token::authority = holder, associated_token::token_program = token_program)]
    pub spirit_account: Box<InterfaceAccount<'info, TokenAccount>>,
    #[account(mut, associated_token::mint = essence_mint, associated_token::authority = holder, associated_token::token_program = token_program)]
    pub essence_account: Box<InterfaceAccount<'info, TokenAccount>>,
    #[account(mut, associated_token::mint = matter_mint, associated_token::authority = holder, associated_token::token_program = token_program)]
    pub matter_account: Box<InterfaceAccount<'info, TokenAccount>>,
    #[account(mut, associated_token::mint = substance_mint, associated_token::authority = holder, associated_token::token_program = token_program)]
    pub substance_account: Box<InterfaceAccount<'info, TokenAccount>>,
    /// CHECK: Its address is checked and its contents are parsed through the sysvar API.
    pub instructions: UncheckedAccount<'info>,
    pub token_program: Program<'info, Token2022>,
    pub system_program: Program<'info, System>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn redeem_authorization_serialization_is_unambiguous() {
        let program_id = Pubkey::new_from_array([1; 32]);
        let cluster = [2; 32];
        let holder = Pubkey::new_from_array([3; 32]);
        let order = [4; 32];
        let message = redeem_authorization_message(
            &program_id,
            &cluster,
            &holder,
            &order,
            &[1, 2, 3, 4],
            1_900_000_000,
        );
        assert_eq!(
            &message[..REDEEM_AUTHORIZATION_DOMAIN.len()],
            REDEEM_AUTHORIZATION_DOMAIN
        );
        assert_eq!(
            message.len(),
            REDEEM_AUTHORIZATION_DOMAIN.len() + 32 * 4 + 8 * 5
        );
        assert_eq!(
            &message[REDEEM_AUTHORIZATION_DOMAIN.len() + 32 * 4..][..8],
            1_u64.to_le_bytes()
        );
    }

    #[test]
    fn mint_space_covers_all_protocol_extensions() {
        assert_eq!(esms_mint_fixed_account_len().unwrap(), 310);
        for mint_id in 0..ESMS_MINT_COUNT {
            assert!(esms_mint_account_len(mint_id).unwrap() > TOKEN_2022_TLV_START + 140);
        }
    }
}
