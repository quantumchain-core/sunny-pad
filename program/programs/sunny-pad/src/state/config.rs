use anchor_lang::prelude::*;

#[account]
pub struct SunnyConfig {
    pub authority: Pubkey,
    pub treasury: Pubkey,
    pub competition_vault: Pubkey,
    pub sunny_mint: Pubkey,
    pub bump: u8,
}

impl SunnyConfig {
    pub const LEN: usize = 32 * 4 + 1;
}
