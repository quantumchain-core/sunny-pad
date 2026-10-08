use anchor_lang::prelude::*;

#[account]
pub struct BondingCurve {
    pub creator: Pubkey, // 32
    pub mint: Pubkey, // 32
    pub vault: Pubkey, // 32
    pub virtual_sol_reserves: u64, // 8
    pub virtual_token_reserves: u64, // 8
    pub real_sol_reserves: u64, // 8
    pub real_token_reserves: u64, // 8
    pub complete: bool, // 1
    pub bump: u8, // 1
}

impl BondingCurve {
    pub const LEN: usize = 32 + 32 + 32 + 8 + 8 + 8 + 8 + 1 + 1 + 8; // +8 padding
}
