# SunnyPad file replacement and creation map

This package is based on the previously uploaded `sunny-pad-main.zip`. It contains the full project tree, including all replacement files and new files. Extract the full project ZIP to a new folder first; do not overwrite your only original copy.

## Existing files to replace

Copy these paths from this package over the same paths in your existing repository after making a backup/branch:

- `.gitignore`
- `.env.example`
- `README.md`
- `vercel.json`
- `supabase/schema.sql`
- `program/Anchor.toml`
- `program/Cargo.toml`
- `program/package.json` (new file in this version; create it)
- `program/tsconfig.json` (new file in this version; create it)
- `program/programs/sunny-pad/Cargo.toml`
- `program/programs/sunny-pad/src/lib.rs`
- `program/programs/sunny-pad/src/state/bonding_curve.rs`
- `program/programs/sunny-pad/src/state/vault.rs`
- `program/programs/sunny-pad/src/state/mod.rs`
- `app/package.json`
- `app/src/app/layout.tsx`
- `app/src/app/page.tsx`
- `app/src/app/globals.css`
- `app/src/lib/constants.ts`
- `app/src/lib/sunnypad.ts`

## New files/folders to create

These paths were not present in the original uploaded ZIP and should be added:

- `MILESTONES.md`
- `docs/THREAT_MODEL.md`
- `docs/IMPLEMENTATION_STATUS.md`
- `docs/VALIDATION_REPORT.md`
- `docs/GRADUATION_THRESHOLD_DECISION.md`
- `.github/workflows/anchor-test.yml`
- `.github/workflows/fuzz.yml`
- `.github/workflows/vercel.yml`
- `app/.eslintrc.json`
- `app/postcss.config.js`
- `app/tsconfig.json`
- `app/scripts/sync-idl.mjs`
- `app/public/idl/README.md`
- `app/src/app/Providers.tsx`
- `app/src/app/api/coins/route.ts`
- `program/programs/sunny-pad/src/state/config.rs`
- `program/tests/sunny-pad.ts`
- `program/fuzz/Cargo.toml`
- `program/fuzz/fuzz_targets/quote_math.rs`

## Existing files that remain unchanged

- `LICENSE`
- `docs/architecture.jpg`
- `app/next.config.js`
- `app/tailwind.config.ts`

## Approved threshold change

The graduation threshold is now **35 SOL** (`35_000_000_000` lamports). This is reflected in:

- `program/programs/sunny-pad/src/lib.rs`
- `program/tests/sunny-pad.ts`
- `app/src/lib/constants.ts`
- `app/src/app/page.tsx`
- `README.md`
- `MILESTONES.md`
- `docs/IMPLEMENTATION_STATUS.md`

The integration test now uses four 10 SOL buys to cross the 35 SOL real-reserve threshold. A successful Raydium migration is **not implemented yet**; `graduate` fails closed intentionally. Do not deploy this version to mainnet or accept real funds.

## Apply safely

1. Make a Git branch or backup of the existing repository.
2. Prefer the `sunnypad-changed-and-new-files.zip` patch if you want to copy only changed/new files over your existing project.
3. Prefer the `sunnypad-full-project-35-sol.zip` archive if you want a complete separate project copy.
4. Never overwrite a real deployment keypair. Never commit private keys or keypair JSON files.
5. After applying the files, review `README.md`, `MILESTONES.md`, and `docs/VALIDATION_REPORT.md` before running tests.
