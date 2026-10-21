use anchor_lang::prelude::*;
use anchor_lang::system_program::{self, Transfer as SolTransfer};
use anchor_spl::token::{self, Mint, MintTo, SetAuthority, Token, TokenAccount, Transfer as TokenTransfer};
use anchor_spl::token::spl_token::instruction::AuthorityType;

pub mod state;
use state::{bonding_curve::BondingCurve, config::SunnyConfig, vault::Vault};

declare_id!("H5Fn8aB1RekmvbnzmFW1W8F5wte8sBg9E1ZJUNbsdZ5U"); // TEMPORARY valid public key; replace with your generated program ID before deployment.
pub const INITIAL_AUTHORITY: Pubkey = pubkey!("4Tgi8fLT6zEHFTUpoNDLDdHTuYVXMohHSdaJFdjkQR68"); // TEMPORARY: replace with the authorized initializer wallet.

pub const LAUNCH_FEE_LAMPORTS: u64 = 20_000_000; // 0.02 SOL
pub const LAUNCH_TREASURY_LAMPORTS: u64 = 10_000_000; // 0.01 SOL
pub const LAUNCH_RENT_ALLOCATION_LAMPORTS: u64 = 10_000_000; // 0.01 SOL rent allocation
pub const TRADING_FEE_BPS: u64 = 100; // 1%
pub const TREASURY_FEE_BPS: u64 = 50; // 0.5%
pub const GRADUATION_THRESHOLD_LAMPORTS: u64 = 35_000_000_000; // 35 SOL
pub const TOKEN_DECIMALS: u8 = 6;
pub const INITIAL_TOKEN_SUPPLY: u64 = 1_073_000_000_000_000; // 1,073,000,000 * 10^6 base units
pub const VIRTUAL_SOL_RESERVES: u64 = 30_000_000_000; // 30 SOL

#[program]
pub mod sunny_pad {
    use super::*;

    pub fn initialize_config(
        ctx: Context<InitializeConfig>,
        treasury: Pubkey,
        competition_vault: Pubkey,
        sunny_mint: Pubkey,
    ) -> Result<()> {
        require_keys_eq!(ctx.accounts.authority.key(), INITIAL_AUTHORITY, ErrorCode::Unauthorized);
        require_keys_neq!(treasury, Pubkey::default(), ErrorCode::InvalidConfiguration);
        require_keys_neq!(competition_vault, Pubkey::default(), ErrorCode::InvalidConfiguration);
        require_keys_neq!(sunny_mint, Pubkey::default(), ErrorCode::InvalidConfiguration);
        require_keys_neq!(treasury, competition_vault, ErrorCode::InvalidConfiguration);

        let config = &mut ctx.accounts.config;
        config.authority = ctx.accounts.authority.key();
        config.treasury = treasury;
        config.competition_vault = competition_vault;
        config.sunny_mint = sunny_mint;
        config.bump = ctx.bumps.config;
        Ok(())
    }

    pub fn launch_meme(ctx: Context<Launch>, name: String, symbol: String, uri: String) -> Result<()> {
        require!(LAUNCH_TREASURY_LAMPORTS.checked_add(LAUNCH_RENT_ALLOCATION_LAMPORTS) == Some(LAUNCH_FEE_LAMPORTS), ErrorCode::InvalidConfiguration);
        require!(!name.trim().is_empty(), ErrorCode::InvalidMetadata);
        require!(!symbol.trim().is_empty(), ErrorCode::InvalidMetadata);
        require!(!uri.trim().is_empty(), ErrorCode::InvalidMetadata);
        require!(name.len() <= 32, ErrorCode::NameTooLong);
        require!(symbol.len() <= 10, ErrorCode::SymbolTooLong);
        require!(uri.len() <= 200, ErrorCode::UriTooLong);

        // The fixed launch charge is split exactly as specified. Anchor account
        // creation is paid by the creator first; the rent allocation reimburses
        // those account-rent costs, and any unused amount remains locked.
        system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                SolTransfer {
                    from: ctx.accounts.creator.to_account_info(),
                    to: ctx.accounts.treasury.to_account_info(),
                },
            ),
            LAUNCH_TREASURY_LAMPORTS,
        )?;
        system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                SolTransfer {
                    from: ctx.accounts.creator.to_account_info(),
                    to: ctx.accounts.vault.to_account_info(),
                },
            ),
            LAUNCH_RENT_ALLOCATION_LAMPORTS,
        )?;

        // Anchor has to front the rent for the newly-created accounts. Reimburse
        // that rent from the 0.01 SOL rent allocation so the nominal launch charge
        // remains 0.02 SOL (excluding network transaction fees). Any unused rent
        // allocation remains locked in the vault; if it cannot cover rent, launch
        // fails atomically rather than silently charging more than specified.
        let rent = Rent::get()?;
        // SPL Token mint and token-account data lengths are 82 and 165 bytes.
        let rent_reimbursement = rent.minimum_balance(8 + BondingCurve::LEN)
            .checked_add(rent.minimum_balance(82)).ok_or(ErrorCode::MathOverflow)?
            .checked_add(rent.minimum_balance(8 + Vault::LEN)).ok_or(ErrorCode::MathOverflow)?
            .checked_add(rent.minimum_balance(165)).ok_or(ErrorCode::MathOverflow)?;
        require!(rent_reimbursement <= LAUNCH_RENT_ALLOCATION_LAMPORTS, ErrorCode::RentBudgetExceeded);
        pay_from_vault(&ctx.accounts.vault.to_account_info(), &ctx.accounts.creator.to_account_info(), rent_reimbursement)?;

        let mint_key = ctx.accounts.mint.key();
        let curve_bump = [ctx.bumps.bonding_curve];
        let curve_seeds: &[&[u8]] = &[b"curve", mint_key.as_ref(), &curve_bump];
        let signer_seeds = &[curve_seeds];

        token::mint_to(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                MintTo {
                    mint: ctx.accounts.mint.to_account_info(),
                    to: ctx.accounts.curve_token_vault.to_account_info(),
                    authority: ctx.accounts.bonding_curve.to_account_info(),
                },
                signer_seeds,
            ),
            INITIAL_TOKEN_SUPPLY,
        )?;

        // Supply is minted once into the curve vault, then mint authority is
        // revoked. The curve PDA remains the token-account authority, not mint authority.
        token::set_authority(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                SetAuthority {
                    account_or_mint: ctx.accounts.mint.to_account_info(),
                    current_authority: ctx.accounts.bonding_curve.to_account_info(),
                },
                signer_seeds,
            ),
            AuthorityType::MintTokens,
            None,
        )?;

        let curve = &mut ctx.accounts.bonding_curve;
        curve.creator = ctx.accounts.creator.key();
        curve.mint = mint_key;
        curve.vault = ctx.accounts.vault.key();
        curve.curve_token_vault = ctx.accounts.curve_token_vault.key();
        curve.virtual_sol_reserves = VIRTUAL_SOL_RESERVES;
        curve.virtual_token_reserves = INITIAL_TOKEN_SUPPLY;
        curve.real_sol_reserves = 0;
        curve.real_token_reserves = INITIAL_TOKEN_SUPPLY;
        curve.is_graduated = false;
        curve.bump = ctx.bumps.bonding_curve;

        let vault = &mut ctx.accounts.vault;
        vault.mint = mint_key;
        vault.treasury = ctx.accounts.config.treasury;
        vault.bump = ctx.bumps.vault;
        vault.locked_lamports = LAUNCH_RENT_ALLOCATION_LAMPORTS.checked_sub(rent_reimbursement).ok_or(ErrorCode::MathOverflow)?;

        emit!(LaunchEvent {
            mint: mint_key,
            creator: ctx.accounts.creator.key(),
            name,
            symbol,
            uri,
        });
        Ok(())
    }

    pub fn buy(ctx: Context<Trade>, amount_in: u64, min_out: u64) -> Result<()> {
        require!(amount_in > 0, ErrorCode::ZeroAmount);
        require!(!ctx.accounts.bonding_curve.is_graduated, ErrorCode::AlreadyGraduated);
        require!(ctx.accounts.bonding_curve.real_sol_reserves < GRADUATION_THRESHOLD_LAMPORTS, ErrorCode::GraduationPending);
        require_keys_eq!(ctx.accounts.creator.key(), ctx.accounts.bonding_curve.creator, ErrorCode::InvalidCreator);

        let (fee, treasury_fee, recipient_fee) = fee_breakdown(amount_in)?;
        let amount_after_fee = amount_in.checked_sub(fee).ok_or(ErrorCode::MathOverflow)?;
        require!(amount_after_fee > 0, ErrorCode::ZeroAmount);

        let curve = &ctx.accounts.bonding_curve;
        require!(ctx.accounts.curve_token_vault.amount == curve.real_token_reserves, ErrorCode::ReserveMismatch);
        let tokens_out = buy_output(curve.virtual_sol_reserves, curve.virtual_token_reserves, amount_after_fee)?;
        require!(tokens_out > 0, ErrorCode::DustTrade);
        require!(tokens_out >= min_out, ErrorCode::SlippageTooHigh);
        require!(tokens_out <= curve.real_token_reserves, ErrorCode::InsufficientTokenReserves);

        // Fees are paid first, then net input is added to the SOL vault.
        system_program::transfer(
            CpiContext::new(ctx.accounts.system_program.to_account_info(), SolTransfer {
                from: ctx.accounts.trader.to_account_info(),
                to: ctx.accounts.treasury.to_account_info(),
            }),
            treasury_fee,
        )?;
        let recipient_info = if ctx.accounts.mint.key() == ctx.accounts.config.sunny_mint {
            ctx.accounts.competition_vault.to_account_info()
        } else {
            ctx.accounts.creator.to_account_info()
        };
        system_program::transfer(
            CpiContext::new(ctx.accounts.system_program.to_account_info(), SolTransfer {
                from: ctx.accounts.trader.to_account_info(),
                to: recipient_info,
            }),
            recipient_fee,
        )?;
        system_program::transfer(
            CpiContext::new(ctx.accounts.system_program.to_account_info(), SolTransfer {
                from: ctx.accounts.trader.to_account_info(),
                to: ctx.accounts.vault.to_account_info(),
            }),
            amount_after_fee,
        )?;

        let mint_key = ctx.accounts.mint.key();
        let curve_bump = [ctx.accounts.bonding_curve.bump];
        let curve_seeds: &[&[u8]] = &[b"curve", mint_key.as_ref(), &curve_bump];
        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                TokenTransfer {
                    from: ctx.accounts.curve_token_vault.to_account_info(),
                    to: ctx.accounts.trader_token_account.to_account_info(),
                    authority: ctx.accounts.bonding_curve.to_account_info(),
                },
                &[curve_seeds],
            ),
            tokens_out,
        )?;

        let curve = &mut ctx.accounts.bonding_curve;
        curve.virtual_sol_reserves = curve.virtual_sol_reserves.checked_add(amount_after_fee).ok_or(ErrorCode::MathOverflow)?;
        curve.virtual_token_reserves = curve.virtual_token_reserves.checked_sub(tokens_out).ok_or(ErrorCode::MathOverflow)?;
        curve.real_sol_reserves = curve.real_sol_reserves.checked_add(amount_after_fee).ok_or(ErrorCode::MathOverflow)?;
        curve.real_token_reserves = curve.real_token_reserves.checked_sub(tokens_out).ok_or(ErrorCode::MathOverflow)?;
        emit!(TradeEvent { mint: mint_key, trader: ctx.accounts.trader.key(), is_buy: true, amount_in, amount_out: tokens_out, fee });
        Ok(())
    }

    pub fn sell(ctx: Context<Trade>, amount_in: u64, min_out: u64) -> Result<()> {
        require!(amount_in > 0, ErrorCode::ZeroAmount);
        require!(!ctx.accounts.bonding_curve.is_graduated, ErrorCode::AlreadyGraduated);
        require!(ctx.accounts.bonding_curve.real_sol_reserves < GRADUATION_THRESHOLD_LAMPORTS, ErrorCode::GraduationPending);
        require_keys_eq!(ctx.accounts.creator.key(), ctx.accounts.bonding_curve.creator, ErrorCode::InvalidCreator);

        let curve = &ctx.accounts.bonding_curve;
        require!(ctx.accounts.curve_token_vault.amount == curve.real_token_reserves, ErrorCode::ReserveMismatch);
        let gross_sol_out = sell_output(curve.virtual_sol_reserves, curve.virtual_token_reserves, amount_in)?;
        require!(gross_sol_out > 0, ErrorCode::DustTrade);
        require!(gross_sol_out <= curve.real_sol_reserves, ErrorCode::InsufficientSolReserves);
        let (fee, treasury_fee, recipient_fee) = fee_breakdown(gross_sol_out)?;
        let net_sol_out = gross_sol_out.checked_sub(fee).ok_or(ErrorCode::MathOverflow)?;
        require!(net_sol_out >= min_out, ErrorCode::SlippageTooHigh);

        // First transfer the seller's tokens into the curve vault. Any later
        // failure rolls the whole transaction back atomically.
        token::transfer(
            CpiContext::new(ctx.accounts.token_program.to_account_info(), TokenTransfer {
                from: ctx.accounts.trader_token_account.to_account_info(),
                to: ctx.accounts.curve_token_vault.to_account_info(),
                authority: ctx.accounts.trader.to_account_info(),
            }),
            amount_in,
        )?;

        let vault_info = ctx.accounts.vault.to_account_info();
        let rent_floor = Rent::get()?.minimum_balance(vault_info.data_len());
        let protected_floor = rent_floor.checked_add(ctx.accounts.vault.locked_lamports).ok_or(ErrorCode::MathOverflow)?;
        let spendable = vault_info.lamports().checked_sub(protected_floor).ok_or(ErrorCode::InsufficientSolReserves)?;
        require!(gross_sol_out <= spendable, ErrorCode::InsufficientSolReserves);

        pay_from_vault(&vault_info, &ctx.accounts.treasury.to_account_info(), treasury_fee)?;
        let recipient_info = if ctx.accounts.mint.key() == ctx.accounts.config.sunny_mint {
            ctx.accounts.competition_vault.to_account_info()
        } else {
            ctx.accounts.creator.to_account_info()
        };
        pay_from_vault(&vault_info, &recipient_info, recipient_fee)?;
        pay_from_vault(&vault_info, &ctx.accounts.trader.to_account_info(), net_sol_out)?;

        let mint_key = ctx.accounts.mint.key();
        let curve = &mut ctx.accounts.bonding_curve;
        curve.virtual_sol_reserves = curve.virtual_sol_reserves.checked_sub(gross_sol_out).ok_or(ErrorCode::MathOverflow)?;
        curve.virtual_token_reserves = curve.virtual_token_reserves.checked_add(amount_in).ok_or(ErrorCode::MathOverflow)?;
        curve.real_sol_reserves = curve.real_sol_reserves.checked_sub(gross_sol_out).ok_or(ErrorCode::MathOverflow)?;
        curve.real_token_reserves = curve.real_token_reserves.checked_add(amount_in).ok_or(ErrorCode::MathOverflow)?;
        emit!(TradeEvent { mint: mint_key, trader: ctx.accounts.trader.key(), is_buy: false, amount_in, amount_out: net_sol_out, fee });
        Ok(())
    }

    pub fn withdraw_treasury(ctx: Context<WithdrawTreasury>, amount: u64) -> Result<()> {
        require!(amount > 0, ErrorCode::ZeroAmount);
        let vault_info = ctx.accounts.vault.to_account_info();
        let rent_floor = Rent::get()?.minimum_balance(vault_info.data_len());
        let protected_floor = rent_floor
            .checked_add(ctx.accounts.vault.locked_lamports)
            .and_then(|n| n.checked_add(ctx.accounts.bonding_curve.real_sol_reserves))
            .ok_or(ErrorCode::MathOverflow)?;
        let available = vault_info.lamports().checked_sub(protected_floor).ok_or(ErrorCode::InsufficientSolReserves)?;
        require!(amount <= available, ErrorCode::InsufficientSolReserves);
        pay_from_vault(&vault_info, &ctx.accounts.treasury.to_account_info(), amount)?;
        Ok(())
    }

    pub fn graduate(ctx: Context<Graduate>) -> Result<()> {
        require!(!ctx.accounts.bonding_curve.is_graduated, ErrorCode::AlreadyGraduated);
        require!(ctx.accounts.bonding_curve.real_sol_reserves >= GRADUATION_THRESHOLD_LAMPORTS, ErrorCode::GraduationThresholdNotMet);
        // Fail closed until the exact Raydium CPMM program/IDL, accounts, and CPI
        // have been integrated and tested. Never mark a curve graduated without
        // actually creating the pool and migrating liquidity.
        err!(ErrorCode::RaydiumIntegrationUnavailable)
    }
}

pub fn quote_fee(amount: u64) -> Result<(u64, u64, u64)> { fee_breakdown(amount) }
pub fn quote_buy(virtual_sol: u64, virtual_tokens: u64, net_sol: u64) -> Result<u64> { buy_output(virtual_sol, virtual_tokens, net_sol) }
pub fn quote_sell(virtual_sol: u64, virtual_tokens: u64, tokens_in: u64) -> Result<u64> { sell_output(virtual_sol, virtual_tokens, tokens_in) }

fn fee_breakdown(amount: u64) -> Result<(u64, u64, u64)> {
    let fee = amount.checked_mul(TRADING_FEE_BPS).ok_or(ErrorCode::MathOverflow)?
        .checked_div(10_000).ok_or(ErrorCode::MathOverflow)?;
    let recipient_fee = fee.checked_div(2).ok_or(ErrorCode::MathOverflow)?;
    let treasury_fee = fee.checked_sub(recipient_fee).ok_or(ErrorCode::MathOverflow)?;
    Ok((fee, treasury_fee, recipient_fee))
}

fn buy_output(virtual_sol: u64, virtual_tokens: u64, net_sol: u64) -> Result<u64> {
    require!(virtual_sol > 0 && virtual_tokens > 0 && net_sol > 0, ErrorCode::InvalidReserves);
    let numerator = (virtual_tokens as u128).checked_mul(net_sol as u128).ok_or(ErrorCode::MathOverflow)?;
    let denominator = (virtual_sol as u128).checked_add(net_sol as u128).ok_or(ErrorCode::MathOverflow)?;
    u64::try_from(numerator.checked_div(denominator).ok_or(ErrorCode::MathOverflow)?).map_err(|_| error!(ErrorCode::MathOverflow))
}

fn sell_output(virtual_sol: u64, virtual_tokens: u64, tokens_in: u64) -> Result<u64> {
    require!(virtual_sol > 0 && virtual_tokens > 0 && tokens_in > 0, ErrorCode::InvalidReserves);
    let numerator = (virtual_sol as u128).checked_mul(tokens_in as u128).ok_or(ErrorCode::MathOverflow)?;
    let denominator = (virtual_tokens as u128).checked_add(tokens_in as u128).ok_or(ErrorCode::MathOverflow)?;
    u64::try_from(numerator.checked_div(denominator).ok_or(ErrorCode::MathOverflow)?).map_err(|_| error!(ErrorCode::MathOverflow))
}

fn pay_from_vault(vault: &AccountInfo, recipient: &AccountInfo, amount: u64) -> Result<()> {
    if amount == 0 { return Ok(()); }
    require_keys_neq!(*vault.key, *recipient.key, ErrorCode::InvalidRecipient);
    let new_vault_balance = vault.lamports().checked_sub(amount).ok_or(ErrorCode::InsufficientSolReserves)?;
    let new_recipient_balance = recipient.lamports().checked_add(amount).ok_or(ErrorCode::MathOverflow)?;
    **vault.try_borrow_mut_lamports()? = new_vault_balance;
    **recipient.try_borrow_mut_lamports()? = new_recipient_balance;
    Ok(())
}

#[derive(Accounts)]
pub struct InitializeConfig<'info> {
    #[account(mut)] pub authority: Signer<'info>,
    #[account(init, payer = authority, space = 8 + SunnyConfig::LEN, seeds = [b"config"], bump)]
    pub config: Account<'info, SunnyConfig>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Launch<'info> {
    #[account(mut)] pub creator: Signer<'info>,
    #[account(seeds = [b"config"], bump = config.bump)] pub config: Account<'info, SunnyConfig>,
    #[account(init, payer = creator, space = 8 + BondingCurve::LEN, seeds = [b"curve", mint.key().as_ref()], bump)]
    pub bonding_curve: Account<'info, BondingCurve>,
    #[account(init, payer = creator, mint::decimals = TOKEN_DECIMALS, mint::authority = bonding_curve)]
    pub mint: Account<'info, Mint>,
    #[account(init, payer = creator, space = 8 + Vault::LEN, seeds = [b"vault", mint.key().as_ref()], bump)]
    pub vault: Account<'info, Vault>,
    #[account(init, payer = creator, seeds = [b"tokens", mint.key().as_ref()], bump, token::mint = mint, token::authority = bonding_curve)]
    pub curve_token_vault: Account<'info, TokenAccount>,
    #[account(mut, address = config.treasury)] pub treasury: SystemAccount<'info>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct Trade<'info> {
    #[account(mut)] pub trader: Signer<'info>,
    #[account(seeds = [b"config"], bump = config.bump)] pub config: Account<'info, SunnyConfig>,
    #[account(mut, seeds = [b"curve", mint.key().as_ref()], bump = bonding_curve.bump, has_one = mint)]
    pub bonding_curve: Account<'info, BondingCurve>,
    pub mint: Account<'info, Mint>,
    #[account(mut, seeds = [b"vault", mint.key().as_ref()], bump = vault.bump, has_one = mint, constraint = vault.treasury == config.treasury)]
    pub vault: Account<'info, Vault>,
    #[account(mut, seeds = [b"tokens", mint.key().as_ref()], bump, token::mint = mint, token::authority = bonding_curve)]
    pub curve_token_vault: Account<'info, TokenAccount>,
    #[account(mut, token::mint = mint, token::authority = trader)] pub trader_token_account: Account<'info, TokenAccount>,
    #[account(mut, address = config.treasury)] pub treasury: SystemAccount<'info>,
    #[account(mut, address = bonding_curve.creator)] pub creator: SystemAccount<'info>,
    #[account(mut, address = config.competition_vault)] pub competition_vault: SystemAccount<'info>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct WithdrawTreasury<'info> {
    #[account(mut, address = config.treasury)] pub treasury: Signer<'info>,
    #[account(seeds = [b"config"], bump = config.bump)] pub config: Account<'info, SunnyConfig>,
    pub mint: Account<'info, Mint>,
    #[account(seeds = [b"curve", mint.key().as_ref()], bump = bonding_curve.bump, has_one = mint)]
    pub bonding_curve: Account<'info, BondingCurve>,
    #[account(mut, seeds = [b"vault", mint.key().as_ref()], bump = vault.bump, has_one = mint, constraint = vault.treasury == config.treasury)]
    pub vault: Account<'info, Vault>,
}

#[derive(Accounts)]
pub struct Graduate<'info> {
    #[account(seeds = [b"config"], bump = config.bump)] pub config: Account<'info, SunnyConfig>,
    pub mint: Account<'info, Mint>,
    #[account(mut, seeds = [b"curve", mint.key().as_ref()], bump = bonding_curve.bump, has_one = mint)]
    pub bonding_curve: Account<'info, BondingCurve>,
    #[account(mut, seeds = [b"vault", mint.key().as_ref()], bump = vault.bump, has_one = mint, constraint = vault.treasury == config.treasury)]
    pub vault: Account<'info, Vault>,
    /// CHECK: Required for the eventual Raydium CPI. The instruction intentionally fails closed until integration is implemented.
    pub raydium_program: UncheckedAccount<'info>,
}

#[event]
pub struct LaunchEvent { pub mint: Pubkey, pub creator: Pubkey, pub name: String, pub symbol: String, pub uri: String }
#[event]
pub struct TradeEvent { pub mint: Pubkey, pub trader: Pubkey, pub is_buy: bool, pub amount_in: u64, pub amount_out: u64, pub fee: u64 }

#[error_code]
pub enum ErrorCode {
    #[msg("Name exceeds 32 bytes")] NameTooLong,
    #[msg("Symbol exceeds 10 bytes")] SymbolTooLong,
    #[msg("Metadata URI exceeds 200 bytes")] UriTooLong,
    #[msg("Metadata fields cannot be empty")] InvalidMetadata,
    #[msg("Configuration is invalid")] InvalidConfiguration,
    #[msg("Only the configured initial authority can initialize SunnyPad")] Unauthorized,
    #[msg("Amount must be greater than zero")] ZeroAmount,
    #[msg("Trade rounds down to zero output")] DustTrade,
    #[msg("Slippage limit not met")] SlippageTooHigh,
    #[msg("Curve has already graduated")] AlreadyGraduated,
    #[msg("Creator account does not match the curve creator")] InvalidCreator,
    #[msg("Invalid recipient account")] InvalidRecipient,
    #[msg("Invalid reserve values")] InvalidReserves,
    #[msg("Insufficient token reserves")] InsufficientTokenReserves,
    #[msg("Recorded token reserves do not match the curve token account")] ReserveMismatch,
    #[msg("Insufficient SOL reserves")] InsufficientSolReserves,
    #[msg("Arithmetic overflow or underflow")] MathOverflow,
    #[msg("Graduation threshold has not been reached")] GraduationThresholdNotMet,
    #[msg("Curve reached the graduation threshold and trading is paused pending migration")] GraduationPending,
    #[msg("Raydium CPMM CPI is not yet integrated; graduation is disabled safely")] RaydiumIntegrationUnavailable,
    #[msg("The 0.01 SOL rent allocation is insufficient for the accounts being created")] RentBudgetExceeded,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn fee_split_is_exact_for_point_one_sol() {
        let (fee, treasury, creator) = fee_breakdown(100_000_000).unwrap();
        assert_eq!(fee, 1_000_000);
        assert_eq!(treasury, 500_000);
        assert_eq!(creator, 500_000);
    }

    #[test]
    fn fee_rounding_conserves_total() {
        for amount in 0..100_000_u64 {
            let (fee, treasury, creator) = fee_breakdown(amount).unwrap();
            assert_eq!(fee, treasury + creator);
            assert!(fee <= amount);
        }
    }

    #[test]
    fn buy_output_is_bounded_by_virtual_tokens() {
        let out = buy_output(VIRTUAL_SOL_RESERVES, INITIAL_TOKEN_SUPPLY, 99_000_000).unwrap();
        assert!(out > 0 && out < INITIAL_TOKEN_SUPPLY);
    }

    #[test]
    fn sell_output_is_bounded_by_virtual_sol() {
        let out = sell_output(VIRTUAL_SOL_RESERVES, INITIAL_TOKEN_SUPPLY, 1_000_000).unwrap();
        assert!(out > 0 && out < VIRTUAL_SOL_RESERVES);
    }

    #[test]
    fn u64_max_fee_multiplication_fails_checked() {
        assert!(fee_breakdown(u64::MAX).is_err());
    }

    #[test]
    fn zero_trade_inputs_fail() {
        assert!(buy_output(VIRTUAL_SOL_RESERVES, INITIAL_TOKEN_SUPPLY, 0).is_err());
        assert!(sell_output(VIRTUAL_SOL_RESERVES, INITIAL_TOKEN_SUPPLY, 0).is_err());
    }

    #[test]
    fn constant_product_does_not_decrease_from_integer_rounding() {
        for sol in [1_000_u64, 1_000_000, 30_000_000_000] {
            for tokens in [1_000_u64, 1_000_000, 1_073_000_000_000_000] {
                for input in [1_u64, 10_000, 1_000_000, 99_000_000] {
                    let before = (sol as u128) * (tokens as u128);
                    if let Ok(out) = buy_output(sol, tokens, input) {
                        let after = ((sol + input) as u128) * ((tokens - out) as u128);
                        assert!(after >= before, "buy reduced K: sol={sol} tokens={tokens} input={input}");
                    }
                    if input < tokens && input < sol {
                        if let Ok(out) = sell_output(sol, tokens, input) {
                            let after = ((sol - out) as u128) * ((tokens + input) as u128);
                            assert!(after >= before, "sell reduced K: sol={sol} tokens={tokens} input={input}");
                        }
                    }
                }
            }
        }
    }

    #[test]
    fn u64_max_quotes_do_not_panic() {
        let _ = buy_output(u64::MAX, u64::MAX, u64::MAX).unwrap();
        let _ = sell_output(u64::MAX, u64::MAX, u64::MAX).unwrap();
    }
}
