# SunnyPad — Solana meme launchpad (development scaffold)

SunnyPad is a custom Anchor/Solana launchpad project. This repository includes the program source, frontend, Supabase metadata cache schema, integration-test scaffolding, fuzz target, and CI workflows.

> **Not mainnet-ready.** The program ID and initializer authority in source are temporary public-key placeholders. The Raydium CPMM graduation CPI is intentionally disabled and fails closed. Do not deploy this build to mainnet or accept real user funds until the addresses are configured, graduation is implemented against the exact Raydium program/IDL, all tests pass, and independent security review is complete.

## Preserved protocol parameters

- Launch charge: **0.02 SOL** — 0.01 SOL to treasury and a 0.01 SOL rent allocation. Account rent is initially paid by the launch transaction payer and reimbursed from that allocation; any unused allocation remains locked in the vault. Network transaction fees are separate.
- Trading fee: **1%** total, split into 0.5% treasury and 0.5% creator; the second half goes to the competition vault when the mint equals the configured SUNNY mint.
- Virtual SOL reserve: **30 SOL**.
- Initial token supply and virtual token reserve: **1,073,000,000 tokens at 6 decimals**.
- Graduation threshold: **35 SOL** of recorded real trading SOL reserves.
- Curve PDA: `[b"curve", mint]`; SOL vault PDA: `[b"vault", mint]`; token vault PDA: `[b"tokens", mint]`; config PDA: `[b"config"]`.

## Repository map

```text
.github/workflows/
  anchor-test.yml        # program checks/tests + app typecheck/build
  fuzz.yml               # scheduled/manual math fuzzing
app/
  src/app/                # Next.js App Router UI and API route
  src/lib/                # constants and Anchor client
  public/idl/             # generated IDL copied here after Anchor build
program/
  Anchor.toml
  programs/sunny-pad/src/
    lib.rs                # Anchor instructions, account constraints, checked math
    state/                # config, bonding curve, and vault state
  tests/sunny-pad.ts      # local-validator integration tests
  fuzz/                   # cargo-fuzz math target
supabase/schema.sql       # public metadata cache only; no user profiles
MILESTONES.md             # full development/security checklist
```

## Configure keys and addresses later

1. Install compatible Solana CLI 1.18.x, Anchor 0.30.1, Rust, Node.js 20+, and npm.
2. From `program/`, create a deployment keypair **only if one does not already exist**:

   ```bash
   mkdir -p target/deploy
   solana-keygen new --outfile target/deploy/sunny_pad-keypair.json
   ```

   Never overwrite an existing deployment keypair. Never commit or share the JSON/private key.
3. Run `anchor keys sync` from `program/` to synchronize `declare_id!` and `Anchor.toml` with that keypair. Copy the resulting **public** program address to `app/.env.local` as `NEXT_PUBLIC_PROGRAM_ID`; the frontend reads it from the environment.
4. Replace `INITIAL_AUTHORITY` in `program/programs/sunny-pad/src/lib.rs` with the public key of the wallet authorized to initialize the on-chain config. The integration-test wallet must match it. This is a public address, not a secret.
5. Add the verified treasury wallet, competition vault, and SUNNY mint public addresses to `app/.env.local`. The on-chain config is initialized once, so verify these addresses before initializing it.
6. Generate the IDL and copy it into the app:

   ```bash
   cd program
   anchor build
   cd ../app
   npm run sync:idl
   ```

   The IDL is a build artifact and is not hand-written. The UI will show a setup message until it is present.

## Local checks

From `program/`:

```bash
npm install
cargo fmt --all
cargo fmt --all -- --check
cargo check --workspace --all-targets
cargo test --workspace
cargo clippy --workspace --all-targets -- -D warnings
cargo audit
anchor test
```

`anchor test` starts a local validator through Anchor. The integration tests need a valid generated program keypair and `INITIAL_AUTHORITY` matching the local test wallet. Test failures are not to be ignored; keep logs and add regression tests for fixes.

From `app/`:

```bash
npm install
npm run typecheck
npm run build
npm run dev
```

The Supabase table is only a cache; on-chain accounts remain authoritative. The included API route is read-only. A trusted indexer/service role is needed to populate the cache; never expose a Supabase service-role key in browser code.

## Security notes and known limitations

- `graduate` currently validates the 35 SOL threshold and then returns `RaydiumIntegrationUnavailable`. It does **not** create a Raydium pool, add liquidity, burn LP tokens, or close the curve. This is deliberately fail-closed rather than falsely marking migration complete.
- The included fuzz target fuzzes the checked quote/fee math, not full randomized on-chain instruction sequences. Full stateful Trident/instruction-sequence fuzzing remains a required hardening task.
- `withdraw_treasury` can withdraw only surplus vault lamports above rent, locked launch allocation, and recorded trading reserves. Trading fees are paid directly to the configured treasury wallet, so this is not a fee-collection withdrawal endpoint.
- Frontend transaction code requires the generated IDL and verified public addresses. Do not expose secrets through `NEXT_PUBLIC_*` environment variables.
- CI generates temporary program and initializer keypairs in the ephemeral runner to test the code. Those keys must never be reused for deployment.
- This scaffold has not been compiled or executed in this authoring environment because Rust, Solana CLI, and Anchor CLI are unavailable here. Treat all code as requiring your local/CI validation, and do not assume tests passed.

See [`MILESTONES.md`](./MILESTONES.md) for the complete development, functional testing, fuzzing, static analysis, reverse-engineering, external review, devnet soak, and mainnet go/no-go checklist.

## License

MIT. See [`LICENSE`](./LICENSE).
