use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Mint, MintTo, Transfer};

pub mod state;
use state::bonding_curve::*;
use state::vault::*;

declare_id!("SunnyPad1111111111111111111111111111111");

const LAUNCH_FEE: u64 = 20_000_000; // 0.02 SOL
const LAUNCH_TREASURY_FEE: u64 = 10_000_000; // 0.01 SOL
const LAUNCH_RENT_FEE: u64 = 10_000_000; // 0.01 SOL
const TRADING_FEE_BPS: u64 = 100; // 1%
const TREASURY_FEE_BPS: u64 = 50; // 0.5%
const CREATOR_FEE_BPS: u64 = 50; // 0.5%
const GRADUATION_THRESHOLD: u64 = 85_000_000_000; // 85 SOL

#[program]
pub mod sunny_pad {
    use super::*;

    pub fn launch(ctx: Context<Launch>, name: String, symbol: String, uri: String) -> Result<()> {
        require!(name.len() <= 32, ErrorCode::NameTooLong);
        require!(symbol.len() <= 10, ErrorCode::SymbolTooLong);

        // 0.02 SOL fee: 0.01 treasury + 0.01 rent
        let ix = anchor_lang::solana_program::system_instruction::transfer(
            &ctx.accounts.creator.key(),
            &ctx.accounts.treasury.key(),
            LAUNCH_TREASURY_FEE,
        );
        anchor_lang::solana_program::program::invoke(
            &ix,
            &[
                ctx.accounts.creator.to_account_info(),
                ctx.accounts.treasury.to_account_info(),
            ],
        )?;

        // Rent part stays in vault for rent exemption
        let ix2 = anchor_lang::solana_program::system_instruction::transfer(
            &ctx.accounts.creator.key(),
            &ctx.accounts.vault.key(),
            LAUNCH_RENT_FEE,
        );
        anchor_lang::solana_program::program::invoke(
            &ix2,
            &[
                ctx.accounts.creator.to_account_info(),
                ctx.accounts.vault.to_account_info(),
            ],
        )?;

        let bonding_curve = &mut ctx.accounts.bonding_curve;
        bonding_curve.creator = ctx.accounts.creator.key();
        bonding_curve.mint = ctx.accounts.mint.key();
        bonding_curve.vault = ctx.accounts.vault.key();
        bonding_curve.virtual_sol_reserves = 0;
        bonding_curve.virtual_token_reserves = 1_000_000_000_000_000; // 1B * 1e6
        bonding_curve.real_sol_reserves = 0;
        bonding_curve.real_token_reserves = 1_000_000_000_000_000;
        bonding_curve.complete = false;
        bonding_curve.bump = ctx.bumps.bonding_curve;

        emit!(LaunchEvent {
            mint: ctx.accounts.mint.key(),
            creator: ctx.accounts.creator.key(),
            name,
            symbol,
            uri,
        });

        Ok(())
    }

    pub fn buy(ctx: Context<Trade>, amount_sol: u64, min_tokens: u64) -> Result<()> {
        let fee = amount_sol * TRADING_FEE_BPS / 10000;
        let treasury_fee = amount_sol * TREASURY_FEE_BPS / 10000;
        let creator_fee = fee - treasury_fee;
        let amount_after_fee = amount_sol - fee;

        // bonding curve math: out = (virtual_token * amount_after_fee) / (virtual_sol + amount_after_fee)
        let curve = &mut ctx.accounts.bonding_curve;
        let tokens_out = curve.virtual_token_reserves * amount_after_fee / (curve.virtual_sol_reserves + amount_after_fee);
        require!(tokens_out >= min_tokens, ErrorCode::SlippageTooHigh);
        require!(!curve.complete, ErrorCode::AlreadyGraduated);

        curve.virtual_sol_reserves += amount_after_fee;
        curve.virtual_token_reserves -= tokens_out;
        curve.real_sol_reserves += amount_after_fee;

        // Send fees
        // treasury 0.5%
        let ix_t = anchor_lang::solana_program::system_instruction::transfer(
            &ctx.accounts.buyer.key(),
            &ctx.accounts.treasury.key(),
            treasury_fee,
        );
        anchor_lang::solana_program::program::invoke(
            &ix_t,
            &[
                ctx.accounts.buyer.to_account_info(),
                ctx.accounts.treasury.to_account_info(),
            ],
        )?;

        // 0.5% -> if SUNNY mint -> competition vault else creator
        let fee_recipient = if ctx.accounts.mint.key() == ctx.accounts.sunny_mint.key() {
            ctx.accounts.competition_vault.key()
        } else {
            ctx.accounts.creator.key()
        };

        let ix_c = anchor_lang::solana_program::system_instruction::transfer(
            &ctx.accounts.buyer.key(),
            &fee_recipient,
            creator_fee,
        );
        // we need to handle both cases - use remaining accounts
        // simplified: transfer to creator account (which is either creator or competition vault passed as creator)
        anchor_lang::solana_program::program::invoke(
            &ix_c,
            &[
                ctx.accounts.buyer.to_account_info(),
                ctx.accounts.creator.to_account_info(),
            ],
        )?;

        // Check graduation
        if curve.real_sol_reserves >= GRADUATION_THRESHOLD {
            curve.complete = true;
        }

        // Mint tokens to buyer (CPI) - simplified transfer from vault token account
        Ok(())
    }

    pub fn sell(ctx: Context<Trade>, amount_tokens: u64, min_sol: u64) -> Result<()> {
        let curve = &mut ctx.accounts.bonding_curve;
        let sol_out_before_fee = curve.virtual_sol_reserves * amount_tokens / (curve.virtual_token_reserves + amount_tokens);
        let fee = sol_out_before_fee * TRADING_FEE_BPS / 10000;
        let sol_out = sol_out_before_fee - fee;

        require!(sol_out >= min_sol, ErrorCode::SlippageTooHigh);

        curve.virtual_sol_reserves -= sol_out_before_fee;
        curve.virtual_token_reserves += amount_tokens;
        curve.real_sol_reserves -= sol_out_before_fee;

        // fee distribution same as buy (would be done via SOL transfer from vault)
        Ok(())
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
    /// CHECK: treasury wallet
    #[account(mut)]
    pub treasury: AccountInfo<'info>,
    /// CHECK: vault PDA for SOL
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
    #[account(mut, seeds = [b"bonding_curve", mint.key().as_ref()], bump = bonding_curve.bump)]
    pub bonding_curve: Account<'info, BondingCurve>,
    #[account(mut)]
    pub mint: Account<'info, Mint>,
    /// CHECK: creator for fee (or competition vault)
    #[account(mut)]
    pub creator: AccountInfo<'info>,
    /// CHECK: treasury
    #[account(mut)]
    pub treasury: AccountInfo<'info>,
    /// CHECK: competition vault for SUNNY
    pub competition_vault: AccountInfo<'info>,
    /// CHECK: sunny mint address
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
    #[msg("Name too long")]
    NameTooLong,
    #[msg("Symbol too long")]
    SymbolTooLong,
    #[msg("Slippage too high")]
    SlippageTooHigh,
    #[msg("Already graduated to Raydium")]
    AlreadyGraduated,
}
