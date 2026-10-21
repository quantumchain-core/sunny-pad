# SunnyPad — Full Development, Testing, Security Review & Mainnet Readiness Plan

> **Purpose:** This is the master milestone checklist for building SunnyPad, testing it, reviewing its compiled program defensively, organizing external review, and deciding whether it is safe to consider a mainnet release.
>
> **Status rule:** Check a box only after the work has been completed and evidence has been recorded. A passing test suite is not proof that a financial program is vulnerability-free.
>
> **Economics guardrail:** Preserve the specified 0.02 SOL launch fee, 1% trading fee and split, virtual reserves, and 35 SOL graduation threshold unless the project owner explicitly approves a change. Do not silently change program behavior to make tests pass.
>
> **Key/address guardrail:** Program ID, treasury, competition vault, SUNNY mint, and other deployment addresses remain pending until supplied and verified. Never commit private keys or keypair JSON files.

---

## M0 — Project inventory and baseline

- [ ] Inspect the complete uploaded repository and record the current directory/file structure.
- [ ] Identify the Anchor workspace, program crate, tests, app, Supabase schema, and existing CI.
- [ ] Record current behavior and known defects before modifying code.
- [ ] Check for duplicate, stale, generated, or conflicting configuration files.
- [ ] Confirm the exact economic parameters and account-flow requirements against the approved specification.
- [ ] Create a baseline issue list grouped by critical, high, medium, low, and informational.
- [ ] Create a safe backup/branch before making changes; preserve existing ledger/user data and configuration.
- [ ] Record the Rust, Solana CLI, Anchor CLI, Node.js, and package-manager versions used for verification.

**Evidence to record:** file inventory, baseline commit/hash, tool versions, initial issue list.

## M1 — Program architecture and account security

- [ ] Confirm the final valid program ID before a deployable build.
- [ ] Define account layouts, PDA seeds, bump handling, ownership checks, and signer requirements.
- [ ] Define initialization rules and prevent unintended reinitialization.
- [ ] Validate mint, token program, system program, vault, curve, treasury, creator, and fee-recipient accounts.
- [ ] Use typed Anchor accounts where appropriate; justify every `UncheckedAccount`.
- [ ] Ensure creator and treasury destinations cannot be changed by unauthorized instructions.
- [ ] Ensure PDA authority and token-account authority match the intended design.
- [ ] Review rent funding, account closure, close destination, and lamport conservation.
- [ ] Document state transitions, including launched, trading, graduated, and closed states.
- [ ] Document trust boundaries and all external program CPIs.

**Evidence to record:** account/authority matrix, PDA map, state-transition table, reviewed source commit.

## M2 — Launch and mint initialization

- [ ] Implement `launch_meme(name, symbol, uri)` with validated lengths and input constraints.
- [ ] Collect the specified 0.02 SOL launch cost without silently changing its economics.
- [ ] Account explicitly for actual rent-exempt costs of every created account and define treatment of any remainder.
- [ ] Create and initialize the SPL mint and required token accounts correctly.
- [ ] Initialize curve/vault PDAs with the specified seeds and stored fields.
- [ ] Initialize virtual SOL reserves to 30 SOL and virtual token reserves to `1_073_000_000 * 10^6` in the correct base units.
- [ ] Establish the intended mint-authority lifecycle and verify revocation through the correct Token Program CPI.
- [ ] Prevent duplicate launches/reinitialization and invalid metadata inputs.
- [ ] Ensure all state writes and transfers are atomic within the transaction.

**Evidence to record:** launch tests, mint-authority verification, account balances before/after, rent accounting.

## M3 — Bonding-curve math and fee accounting

- [ ] Specify the exact constant-product calculation and rounding policy.
- [ ] Use checked arithmetic for every amount, multiplication, division, addition, and subtraction.
- [ ] Define behavior for zero amounts, dust trades, zero denominators, insufficient reserves, and overflow.
- [ ] Implement the exact 1% trading fee (`amount * 100 / 10000`) with checked math.
- [ ] Calculate creator share as `fee / 2` and treasury share as `fee - creator_share`.
- [ ] For `SUNNY_MINT`, route the second 0.5% share to the competition vault rather than creator.
- [ ] Ensure fees are transferred to validated destinations before the swap, as specified.
- [ ] Ensure rounding and minimum-output checks cannot be bypassed.
- [ ] Document whether invariant comparisons use gross input, net input, virtual reserves, and post-fee reserves.

**Evidence to record:** written formula/spec, boundary tests, fee-ledger reconciliation.

## M4 — Buy instruction

- [ ] Implement `buy(amount_in, min_out)` with actual SOL and token movements.
- [ ] Reject zero input, invalid mint, graduated curve, insufficient liquidity, and invalid accounts.
- [ ] Transfer the specified fee split to validated fee destinations.
- [ ] Calculate output with checked arithmetic and the documented rounding policy.
- [ ] Enforce `min_out` after the output calculation and revert atomically on slippage failure.
- [ ] Update real and virtual reserves consistently with actual transfers.
- [ ] Prevent unauthorized access to vault/curve token authority.
- [ ] Test direct account-balance changes as well as stored reserve changes.

**Evidence to record:** successful buy trace, failed-buy rollback checks, balance/reserve reconciliation.

## M5 — Sell instruction

- [ ] Implement `sell(amount_in, min_out)` with actual token input and SOL payout.
- [ ] Require the seller to own and authorize the amount of tokens being sold.
- [ ] Reject zero input, overselling, graduated curves, invalid accounts, and insufficient SOL liquidity.
- [ ] Calculate the output and 1% fee split using the approved formulas.
- [ ] Enforce `min_out` and revert atomically when it is not met.
- [ ] Use checked subtraction to prevent reserve underflow.
- [ ] Validate the vault PDA signer seeds and SOL payout destination.
- [ ] Reconcile token transfers, SOL movements, fees, and recorded reserves.

**Evidence to record:** sell traces, insufficient-balance test, reserve/lamport reconciliation.

## M6 — Treasury and competition-vault controls

- [ ] Implement `withdraw_treasury()` with an explicit treasury signer check.
- [ ] Validate the configured treasury identity using trusted on-chain configuration or an explicit verified constraint.
- [ ] Prevent arbitrary destination accounts from receiving treasury funds.
- [ ] Define which funds are withdrawable and prevent withdrawal of rent or funds backing active swaps.
- [ ] Validate the competition-vault destination and its authority.
- [ ] Test unauthorized signer, wrong destination, insufficient balance, and repeated withdrawal scenarios.
- [ ] Confirm failed withdrawals leave balances and state unchanged.
- [ ] Consider multisig governance for treasury control before mainnet.

**Evidence to record:** authorization matrix, positive/negative tests, balance traces.

## M7 — Graduation and Raydium CPMM integration

- [ ] Define the exact graduation eligibility rule using the approved 35 SOL threshold.
- [ ] Reject graduation below threshold and reject repeated graduation.
- [ ] Integrate the actual Raydium CPMM program using its required accounts, authorities, instructions, and CPI checks.
- [ ] Validate every Raydium program ID and pool-related account.
- [ ] Define liquidity amounts and the source of each asset before creating the pool.
- [ ] Verify pool creation and liquidity addition with actual token/SOL transfers.
- [ ] Send LP tokens to the explicitly approved irrecoverable destination only after verifying the correct LP mint and amount.
- [ ] Verify that curve closure cannot redirect rent or drain remaining funds.
- [ ] Handle CPI failures atomically; do not merely set `is_graduated = true`.
- [ ] Test against the intended Raydium version/program on local validator and devnet.
- [ ] Document any limitation of local validator cloning or mainnet-state simulation.

**Evidence to record:** end-to-end graduation transaction, pool/account verification, LP-token balance proof, failure-path tests.

## M8 — Functional and regression testing

- [ ] Test successful launch, buy, sell, treasury withdrawal, and graduation.
- [ ] Test zero-amount buy and sell.
- [ ] Test sell amount greater than the seller's balance.
- [ ] Test `min_out = 0` and `min_out` above the expected output; confirm documented slippage behavior.
- [ ] Test duplicate launch for the same mint/PDA.
- [ ] Test repeated graduation.
- [ ] Test unauthorized treasury withdrawal.
- [ ] Test `u64::MAX` and near-boundary values at the relevant math boundary.
- [ ] Test normal fee split: 0.5% treasury and 0.5% creator.
- [ ] Test SUNNY mint fee split: 0.5% treasury and 0.5% competition vault.
- [ ] Test buy/sell reserve updates and real token/SOL transfers.
- [ ] Test insufficient reserves, dust amounts, invalid metadata, wrong mint, wrong token program, and wrong PDA.
- [ ] Test account closure, reinitialization, and unauthorized account substitutions.
- [ ] Test transaction rollback: failed instructions must not leave partial changes.
- [ ] Test state persistence and account decoding across repeated calls.
- [ ] Run `anchor test -- --nocapture` on the supported local validator setup.
- [ ] Save logs and test results; do not mark unchecked cases as passed.

**Evidence to record:** test report, CI run URL or logs, commit hash, known failures.

## M9 — Fuzzing and invariant testing

- [ ] Choose and document the fuzzing tool (Trident, `cargo-fuzz`, or both).
- [ ] Build randomized instruction sequences for buy, sell, launch, and relevant state transitions.
- [ ] Generate amounts from 1 lamport to 10 SOL, plus boundary and adversarial values.
- [ ] Include randomized trade order, repeated instructions, and failed-transaction scenarios.
- [ ] Define invariants that account for fees, virtual reserves, rounding, and actual transfers.
- [ ] Verify actual balances reconcile with recorded reserves and accrued fees.
- [ ] Verify total token supply and token distribution remain within the specified supply rules.
- [ ] Verify unauthorized instructions cannot alter protected state or withdraw funds.
- [ ] Verify no reserve underflow, overflow, divide-by-zero, panic, or invalid state transition occurs.
- [ ] Run at least 10,000 generated cases as an initial target; extend the run after fixes.
- [ ] Save fuzz seeds, logs, tool versions, and minimized reproductions for every finding.
- [ ] Turn every discovered bug into a deterministic regression test.
- [ ] Do not interpret a clean fuzz run as proof of security.

**Evidence to record:** fuzz configuration, iteration count, corpus/seeds, findings, regression tests.

## M10 — CI, reproducible builds, and dependency security

- [ ] Add `.github/workflows/anchor-test.yml` for push and pull-request validation.
- [ ] Pin or explicitly control compatible Rust, Solana, Anchor, and Node.js tool versions.
- [ ] Run formatting, workspace checks, tests, and Clippy in CI.
- [ ] Build the Next.js app in CI.
- [ ] Run `cargo audit` and review the advisory database output.
- [ ] Add JavaScript dependency audit and lockfile consistency checks.
- [ ] Configure a scheduled or manually triggered longer fuzz job; avoid making every push run an excessively long fuzz campaign.
- [ ] Store logs and test artifacts for review.
- [ ] Add branch protection and require CI checks before merging.
- [ ] Add `.github/workflows/vercel.yml` only with correctly configured Vercel secrets; never commit tokens.
- [ ] Verify that CI fails when a test or build fails.
- [ ] Document toolchain limitations and any checks that cannot run in GitHub-hosted runners.

**Evidence to record:** successful CI runs, pinned tool versions, audit reports, branch protection settings.

## M11 — Frontend, wallet integration, and data layer

- [ ] Complete the Next.js 14 App Router structure and TypeScript configuration.
- [ ] Add the SunnyPad client wrapper using AnchorProvider and the verified IDL.
- [ ] Connect wallet adapter and display connection/network state clearly.
- [ ] Implement launch form validation, pending/success/error states, and transaction confirmation.
- [ ] Implement buy/sell UI with price impact, minimum output, fees, and confirmation details.
- [ ] Fetch curve/vault state from chain rather than trusting client-submitted values.
- [ ] Display trending coins from Supabase with loading, empty, and error states.
- [ ] Create the requested `coins` schema without collecting unnecessary user data.
- [ ] Treat indexed coin metadata as untrusted input and safely render it.
- [ ] Ensure frontend cannot present a transaction as successful before confirmation.
- [ ] Test responsive layout, wallet disconnect, wrong network, rejected signature, and RPC errors.
- [ ] Add accessible labels and useful error messages.
- [ ] Run the production app build and fix TypeScript/lint/build errors.

**Evidence to record:** build logs, wallet-flow tests, screenshots or short QA report.

## M12 — Static review and defensive reverse engineering

- [ ] Build the program reproducibly and record the artifact hash.
- [ ] Review the generated IDL against source instructions and account constraints.
- [ ] Inspect the compiled `.so` and program metadata using available supported tools.
- [ ] Fetch deployed IDL only after a valid program ID is deployed to the selected cluster.
- [ ] Use `cargo expand` selectively to inspect macro-expanded Rust where useful.
- [ ] Run `cargo audit` and additional dependency scanners where practical.
- [ ] Review all instructions, signer checks, account owners, PDA seeds, CPIs, and close destinations.
- [ ] Search for `UncheckedAccount`, `init_if_needed`, unchecked arithmetic, unwrap/expect/panic paths, and unsafe code; justify each occurrence.
- [ ] Verify no instruction permits changing the creator, treasury, mint authority, or protected configuration without authorization.
- [ ] Compare source and deployed artifact using appropriate reproducible-verification tooling when supported.
- [ ] Review transaction traces and account diffs for each sensitive instruction.
- [ ] Record limitations: disassembly or decompilation cannot by itself prove the absence of hidden vulnerabilities.

**Evidence to record:** artifact hash, IDL, scan reports, manual-review checklist, source/deployment comparison report.

## M13 — External review and bug bounty

- [ ] Publish source code, build instructions, scope, and known limitations.
- [ ] Prepare a threat model and list assets attackers may try to steal or corrupt.
- [ ] Invite independent reviewers and provide a reproducible test environment.
- [ ] Define severity levels, disclosure rules, response times, and a safe reporting channel.
- [ ] Fund and announce a bounty only after the reward amount and available funds are confirmed.
- [ ] Do not promise a bounty that cannot be paid.
- [ ] Triage all findings, assign severity, fix them, and add regression tests.
- [ ] Re-run the complete test and fuzz suite after each security-relevant fix.
- [ ] Require explicit review of any change to fee logic, authorities, or graduation behavior.

**Evidence to record:** review scope, findings tracker, fixes, retest results, bounty terms if funded.

## M14 — Devnet soak and adversarial rehearsal

- [ ] Deploy to devnet using verified public addresses and no production secrets.
- [ ] Confirm program ID, IDL, upgrade authority, treasury, competition vault, and mint addresses.
- [ ] Run end-to-end launch, buy, sell, and graduation scenarios.
- [ ] Run a monitoring bot or script to track failed transactions, balance drift, and unexpected state changes.
- [ ] Test unauthorized calls, wrong accounts, repeated instructions, dust trades, and slippage attacks.
- [ ] Test RPC interruptions, stale reads, wallet rejection, and transaction retries.
- [ ] Run a sustained test period (target: at least 7 days) and record observations.
- [ ] Reconcile on-chain account balances with the program's recorded accounting.
- [ ] Resolve or explicitly block release on all critical/high findings.
- [ ] Do not treat devnet SOL as real-value liquidity or risk mainnet funds for basic testing.

**Evidence to record:** deployment details, monitoring report, test transactions, incident/fix log.

## M15 — Governance, deployment, and mainnet go/no-go

- [ ] Confirm every release-blocking issue is closed or formally accepted by the project owner and reviewers.
- [ ] Confirm treasury is controlled by a suitable multisig or documented governance process.
- [ ] Decide upgrade-authority policy: retain under controlled governance or revoke only after considering recovery needs.
- [ ] If using a timelock, verify it is implemented and enforced; do not describe a policy document as an on-chain timelock.
- [ ] Verify the exact mainnet program ID and all configured public addresses.
- [ ] Confirm no private keys, seed phrases, or keypair JSON files are in Git history or build artifacts.
- [ ] Review deployment transaction and upgrade authority before signing.
- [ ] Confirm the final program binary and source commit correspond.
- [ ] Confirm the approved fee logic and 35 SOL graduation threshold are unchanged.
- [ ] Publish the final audit/review summary and known limitations.
- [ ] Obtain explicit release approval before mainnet deployment.
- [ ] Start with conservative operational exposure and monitoring; do not alter protocol economics without approval.
- [ ] Prepare an incident-response plan and user communications procedure.

**Evidence to record:** signed release checklist, source commit, artifact hash, program ID, authority state, reviewer sign-off, monitoring/incident plan.

---

## Release-blocking findings

Do **not** deploy to mainnet while any of these remain unresolved:

- [ ] Anyone other than the authorized treasury can withdraw protected funds.
- [ ] Buy/sell instructions update accounting without performing the corresponding real token/SOL transfers.
- [ ] User-controlled or unvalidated accounts can redirect fees or withdrawals.
- [ ] Arithmetic can overflow, underflow, divide by zero, or bypass slippage checks.
- [ ] Mint authority or creator/treasury configuration can be changed unexpectedly.
- [ ] Graduation is only a flag change rather than a verified Raydium CPMM migration.
- [ ] A failed instruction can leave inconsistent state or inaccessible funds.
- [ ] Critical/high security findings remain without an explicit, documented release decision.
- [ ] The deployed binary, program ID, or configured addresses cannot be verified.

## Suggested CI command set

Run from the repository root in an environment with the compatible toolchain installed:

```bash
cargo fmt --all -- --check
cargo check --workspace --all-targets
cargo test --workspace
cargo clippy --workspace --all-targets -- -D warnings
cargo audit
```

Then run the supported Anchor integration tests and frontend checks using the repository's actual package scripts. Do not assume these commands all work until dependencies and tool versions have been installed and verified.

## Final status

- [ ] All planned milestones complete.
- [ ] All release-blocking findings resolved.
- [ ] Independent review completed and findings retested.
- [ ] Devnet soak completed.
- [ ] Mainnet go/no-go decision documented.
- [ ] Mainnet deployment explicitly approved.

**Remember:** This checklist organizes engineering and security work; completing it does not guarantee the absence of vulnerabilities. Mainnet financial code should receive independent review appropriate to the risk.
