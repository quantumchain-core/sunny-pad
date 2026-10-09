use anchor_lang::prelude::*;
use anchor_spl::token::Mint;

pub mod state;
use state::bonding_curve::*;
use state::vault::*;

declare_id!("SunnyPad1111111111111111111111111111111");

/// SAFETY HOLD:
/// The uploaded implementation does not initialize an SPL mint, does not settle
/// buy/sell token transfers, and does not securely bind fee recipients. Allowing
/// its financial instructions to run could lose user funds or create inconsistent
/// curve accounting. These instructions intentionally fail closed until the full
/// token/vault/account-validation implementation and adversarial tests are ready.
#[program]
pub mod sunny_pad {
    use super::*;

    pub fn launch(
        _ctx: Context<Launch>,
        _name: String,
        _symbol: String,
        _uri: String,
    ) -> Result<()> {
        err!(ErrorCode::ProgramNotReady)
    }

    pub fn buy(_ctx: Context<Trade>, _amount_sol: u64, _min_tokens: u64) -> Result<()> {
        err!(ErrorCode::ProgramNotReady)
    }

    pub fn sell(_ctx: Context<Trade>, _amount_tokens: u64, _min_sol: u64) -> Result<()> {
        err!(ErrorCode::ProgramNotReady)
    }
}

#[derive(Accounts)]
pub struct Launch<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,
    #[account(
        init,
        payer = creator,
        space = 8 + BondingCurve::LEN,
        seeds = [b"bonding_curve", mint.key().as_ref()],
        bump
    )]
    pub bonding_curve: Account<'info, BondingCurve>,
    #[account(mut)]
    pub mint: Signer<'info>,
    /// CHECK: Will be replaced with a configured, validated treasury address.
    #[account(mut)]
    pub treasury: AccountInfo<'info>,
    #[account(
        init,
        payer = creator,
        space = 8 + 32,
        seeds = [b"vault", mint.key().as_ref()],
        bump
    )]
    pub vault: Account<'info, Vault>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Trade<'info> {
    #[account(mut)]
    pub buyer: Signer<'info>,
    #[account(
        mut,
        seeds = [b"bonding_curve", mint.key().as_ref()],
        bump = bonding_curve.bump,
        constraint = bonding_curve.mint == mint.key() @ ErrorCode::InvalidMint
    )]
    pub bonding_curve: Account<'info, BondingCurve>,
    pub mint: Account<'info, Mint>,
    /// CHECK: Must be checked against the creator stored in the curve before enabling trading.
    #[account(mut)]
    pub creator: AccountInfo<'info>,
    /// CHECK: Must be checked against a program configuration PDA before enabling trading.
    #[account(mut)]
    pub treasury: AccountInfo<'info>,
    /// CHECK: Must be checked against a program configuration PDA before enabling trading.
    pub competition_vault: AccountInfo<'info>,
    /// CHECK: Must be checked against a program configuration PDA before enabling trading.
    pub sunny_mint: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}

#[event]
pub struct LaunchEvent {
    pub mint: Pubkey,
    pub creator: Pubkey,
    pub name: String,
    pub symbol: String,
    pub uri: String,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Program is not ready: launch and trading are disabled until token settlement and account validation are implemented and audited")]
    ProgramNotReady,
    #[msg("The supplied mint does not match the bonding curve")]
    InvalidMint,
}
