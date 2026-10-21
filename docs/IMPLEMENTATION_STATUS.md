# Implementation status and release blockers

This file describes what is present in this source package. It is not an audit certificate.

## Included in this package

- Anchor 0.30.1 program scaffold with one-time config initialization, launch, buy, sell, restricted surplus withdrawal, PDA/account constraints, mint supply initialization, mint-authority revocation, checked fee math, slippage checks, reserve accounting, and events.
- Next.js 14 App Router frontend, wallet adapter provider, launch form, on-chain quote preview/trade panel, and read-only Supabase coin-cache API.
- Rust unit tests, Anchor local-validator integration tests, a `cargo-fuzz` quote-math target, CI workflows, and the master milestone checklist.

## Explicit blockers

1. **Replace temporary program ID.** The source and Anchor config currently use a valid temporary public key with no associated deployment keypair. It is not a deployment identity.
2. **Replace `INITIAL_AUTHORITY`.** This temporary public key must be replaced with the intended initializer wallet public address. The local integration-test wallet must match it.
3. **Configure and verify public addresses.** Treasury, competition vault, and SUNNY mint must be confirmed before the one-time config is initialized.
4. **Implement Raydium CPMM graduation.** The current `graduate` instruction checks the 35 SOL threshold and then fails closed with `RaydiumIntegrationUnavailable`. It does not create a pool, add liquidity, burn LP tokens, or close the curve. Trading is paused at/above the threshold to avoid continuing to operate a curve that should migrate.
5. **Run real builds and tests.** This authoring environment did not have Rust, Solana CLI, or Anchor CLI; npm installation timed out. No Rust/Anchor build or integration-test pass is claimed.
6. **Independent review required.** A source-level scaffold and successful tests cannot substitute for an independent review of mainnet financial code.

## Security behavior to verify locally

- `initialize_config` is one-time and gated by the hardcoded initializer public key.
- Launch mint authority is revoked after initial supply is minted into the curve token vault.
- Buy/sell account constraints validate mint, creator, treasury, competition vault, PDAs, token authority, and reserve reconciliation.
- Trading fees are transferred directly to treasury and creator/competition recipient. `withdraw_treasury` is only for surplus vault lamports and cannot withdraw recorded curve liquidity.
- Every transaction is atomic at the Solana runtime level; test failed instruction rollback.
- Any account size, CPI, rent reimbursement, token authority, or arithmetic behavior must be confirmed by `anchor test` and review against the exact toolchain.
