use anchor_lang::prelude::*;

#[account]
pub struct BondingCurve {
    pub creator: Pubkey,
    pub mint: Pubkey,
    pub vault: Pubkey,
    pub curve_token_vault: Pubkey,
    pub virtual_sol_reserves: u64,
    pub virtual_token_reserves: u64,
    pub real_sol_reserves: u64,
    pub real_token_reserves: u64,
    pub is_graduated: bool,
    pub bump: u8,
}

impl BondingCurve {
    pub const LEN: usize = 32 * 4 + 8 * 4 + 1 + 1;
}
