use anchor_lang::prelude::*;

#[account]
pub struct Vault {
    pub mint: Pubkey,
    pub treasury: Pubkey,
    pub bump: u8,
    /// Launch-funded SOL that is locked and never counted as trade liquidity.
    pub locked_lamports: u64,
}

impl Vault {
    pub const LEN: usize = 32 + 32 + 1 + 8;
}
