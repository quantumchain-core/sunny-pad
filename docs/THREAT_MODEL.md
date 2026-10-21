# SunnyPad threat model (initial)

## Assets to protect

- SOL held in each curve vault, including rent and the locked launch allocation.
- Fixed-supply SPL token mint and curve token vault.
- Treasury and competition-vault fee destinations.
- Creator identity and the one-time SunnyPad configuration.
- Curve reserve state, slippage limits, and graduation state.

## Trust boundaries

- User wallet and all client-provided values are untrusted.
- Supabase rows are an untrusted cache, not proof of on-chain state.
- Treasury/competition/mint addresses are configuration inputs and must be verified before the one-time config initialization.
- SPL Token is an external program invoked through Anchor SPL CPIs.
- Raydium CPMM is a separate program and is not yet integrated in this version.

## Attack scenarios to test

- Unauthorized config initialization or reinitialization.
- Fake mint, wrong token account, wrong PDA, wrong creator, or wrong fee recipient.
- Zero/dust trades, oversized amounts, checked arithmetic overflow, reserve underflow, and token balance mismatch.
- Slippage attacks and stale frontend quotes.
- Direct donations to the vault or token vault that desynchronize recorded and actual reserves.
- Unauthorized treasury withdrawal, withdrawal of rent, or withdrawal of active curve liquidity.
- Duplicate launch, repeated graduation, graduation below threshold, and trades after threshold.
- Failed CPI or transfer leaving partial state (transaction should roll back).
- Metadata injection and cache poisoning in the frontend/Supabase layer.

## Known limitation

Graduation is deliberately disabled until the exact Raydium CPMM instruction interface and account constraints are implemented and tested. This version must not be deployed to mainnet.
