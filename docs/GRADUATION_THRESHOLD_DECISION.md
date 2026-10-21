# Graduation threshold decision

- Approved target: **35 SOL** of recorded real SOL reserves (`35_000_000_000` lamports).
- This replaces the prior 85 SOL target.
- Virtual SOL reserves are not used to decide graduation eligibility.
- The actual Raydium CPMM migration must be implemented and verified before graduation can complete.
- Until then, the program deliberately fails closed at the graduation instruction and must not be used on mainnet.
- Keep the program constant, frontend constant/display, tests, README, and milestone checklist in sync if this value is changed later.
