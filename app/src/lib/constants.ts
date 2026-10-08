export const PROGRAM_ID = "SunnyPad1111111111111111111111111111111";
export const TREASURY_WALLET = process.env.NEXT_PUBLIC_TREASURY_WALLET!;
export const COMPETITION_VAULT = process.env.NEXT_PUBLIC_COMPETITION_VAULT!;
export const SUNNY_MINT = process.env.NEXT_PUBLIC_SUNNY_MINT!;

export const FEES = {
  LAUNCH_TOTAL: 0.02, // SOL
  LAUNCH_TREASURY: 0.01,
  LAUNCH_RENT: 0.01,
  TRADING_TOTAL: 0.01, // 1%
  TREASURY: 0.005, // 0.5%
  CREATOR_OR_COMPETITION: 0.005, // 0.5%
} as const;

export const GRADUATION_THRESHOLD = 85; // SOL

export const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || "https://api.mainnet-beta.solana.com";
