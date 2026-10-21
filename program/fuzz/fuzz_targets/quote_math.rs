#![no_main]
use libfuzzer_sys::fuzz_target;
use sunny_pad::{quote_buy, quote_fee, quote_sell};

fuzz_target!(|data: &[u8]| {
    if data.len() < 32 { return; }
    let virtual_sol = u64::from_le_bytes(data[0..8].try_into().unwrap());
    let virtual_tokens = u64::from_le_bytes(data[8..16].try_into().unwrap());
    let amount = u64::from_le_bytes(data[16..24].try_into().unwrap());
    let other = u64::from_le_bytes(data[24..32].try_into().unwrap());

    if let Ok((fee, treasury, creator)) = quote_fee(amount) {
        assert_eq!(fee, treasury.checked_add(creator).unwrap());
        assert!(fee <= amount);
    }
    if let Ok(out) = quote_buy(virtual_sol, virtual_tokens, other) {
        assert!(out <= virtual_tokens);
    }
    if let Ok(out) = quote_sell(virtual_sol, virtual_tokens, amount) {
        assert!(out <= virtual_sol);
    }
});
