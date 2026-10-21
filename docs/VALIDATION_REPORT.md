# Validation report for this generated source package

Date: 2026-10-10

## Checks completed in the authoring environment

- TypeScript/TSX syntax transpilation check: **8 files parsed, 0 syntax diagnostics**. This is syntax-only and is not a TypeScript typecheck.
- JSON parsing: passed for all JSON configuration files.
- TOML parsing: passed for all Cargo and Anchor TOML files.
- YAML parsing: passed for all three GitHub workflow files.
- Public-key placeholder decoding: both temporary public addresses decode to 32 bytes. They are placeholders and are not deployment credentials.
- Independent Python reference math: 100,000 randomized cases passed for fee conservation and constant-product rounding invariants. This does not execute the Rust program.

## Not run

- `cargo fmt`, `cargo check`, `cargo test`, `cargo clippy`, `cargo audit`.
- `anchor build`, local-validator integration tests, or a Solana transaction test.
- `cargo fuzz` execution.
- Full TypeScript typecheck, Next.js production build, or npm dependency audit.
- Supabase SQL execution or Vercel deployment.

## Why these checks were not run

Rust/Cargo, Solana CLI, and Anchor CLI are not installed in the authoring environment. The attempted frontend `npm install` did not finish before the execution timeout, so frontend typechecking/building was not possible here.

## Required next verification

Use the `anchor-test` CI workflow or a local machine with the compatible toolchain. Resolve all failures rather than bypassing checks. Do not deploy this package to mainnet while the Raydium CPMM graduation CPI remains disabled or while any required test/review is outstanding.
