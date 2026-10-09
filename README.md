# Sunny Pad 🌞 — Solana Launchpad Prototype

> **Development status: NOT LIVE ON-CHAIN.** The currently deployed Vercel site is only a frontend preview. No Sunny Pad Solana program has been deployed, no valid Sunny Pad program ID has been assigned, and launch/buy/sell transactions are not available.

Do not send funds or treat the fee model, token-launch flow, creator rewards, graduation, or Raydium integration described in earlier drafts as implemented.

## Current stack

- `app/`: Next.js 14 frontend preview.
- `program/`: Anchor/Rust program source, incomplete and not currently build-verified.
- `supabase/`: proposed cache schema; it is not the source of truth for ownership or balances.

## Current frontend behavior

The preview allows visitors to enter token name/symbol for display only. It does not connect a wallet, create transactions, launch tokens, or collect fees. The default RPC URL is Solana Devnet to avoid accidental mainnet use during development.

## Program status and ID

A real program ID must be derived from the public key in a newly generated Solana program keypair, then used consistently in the Anchor source/config and frontend after a successful build and deployment. Do not use the former `SunnyPad111...` string; it is not a valid assigned program ID. Keep the program keypair private and backed up securely. Never commit secret keypairs or seed phrases to this repository.

## Zero-budget development plan

1. Restore a complete Anchor source tree and establish a reproducible build with a compatible Rust/Solana/Anchor toolchain.
2. Define and test account/PDA authority constraints.
3. Implement SPL mint and vault initialization.
4. Implement checked bonding-curve math and atomic buy/sell settlement.
5. Add adversarial Anchor tests for fee routing, account substitution, slippage, and reserve limits.
6. Deploy to Devnet only after tests pass, using a real program keypair.
7. Connect the frontend to the verified program interface.
8. Consider Mainnet only after an independent review and a documented incident plan.

## Build status

No successful Rust/Anchor compilation is claimed. The uploaded source is missing the referenced state module files, and the available review environment does not currently have `rustc`, `cargo`, `solana`, or `anchor`. Frontend build verification is also pending because the Next.js dependency is not installed in this environment.
