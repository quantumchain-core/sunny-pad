# Sunny Pad 🌞 — Decentralized Meme Launchpad on Solana

> Launch a meme coin in 10 seconds. Creator earns forever — automatically on-chain.

Live: **https://sunnypad.fun** | Program: `SunnyPad1111111111111111111111111111111` | License: MIT

### Fee Structure (Verifiable On-Chain)

**Launch:** `0.02 SOL` total
- `0.01 SOL` → Treasury wallet
- `0.01 SOL` → Rent / Vault

**Trading:** `1%` total on every buy/sell
- `0.5%` → Treasury wallet
- `0.5%` → Creator wallet (auto on-chain, forever) OR Competition Vault if mint == SUNNY
- 'Treasury: 0.5% every trade
- 'Creator: 0.5% every trade (lifetime, automatic)
- 'SUNNY token: 0.5% routes to competition vault

No KYC. Non-custodial. Verified on Solscan.

### Architecture

![Architecture](./docs/architecture.png)

**Flow:**
1.  **User** views `page.tsx` → fee display from `sunnypad.ts` → reads `constants.ts`
2.  **Launches / Trades** → calls `Anchor handlers [lib.rs]` in On-Chain Program
3.  `lib.rs` updates `Curve state [bonding_curve.rs]` and initializes `Vault state [vault.rs]`
4.  Executes on **Solana network**
5.  Routes fees: `Treasury wallet`, `Creator wallet`, `Competition vault`
6.  Supports: Token safeguards, Raydium graduation (at 85 SOL), Bundle check, IPFS metadata
7.  External: Pinata (metadata storage), Supabase (cache only)

### Repo Structure
program/ -> Anchor program (lib.rs, bonding_curve.rs, vault.rs)
app/ -> Next.js 14 frontend (page.tsx, sunnypad.ts, constants.ts)
supabase/ -> Cache schema (no user data)

### Verify on Solscan

1. Program ID: `SunnyPad1111111111111111111111111111111`
2. Check `constants.ts` matches on-chain fees
3. Treasury, creator, competition vault transfers are all SOL transfers in tx logs

### Deploy

```bash
# Frontend
cd app && npm install && npm run dev

# Program
cd program && anchor build && anchor deploy --provider.cluster devnet
Built with ❤️ for Solana meme culture. Creator-first, forever
