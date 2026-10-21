import { LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";

// TEMPORARY public key only. Replace with the generated deployed program ID.
export const TEMPORARY_PROGRAM_ID = "H5Fn8aB1RekmvbnzmFW1W8F5wte8sBg9E1ZJUNbsdZ5U";
export const PROGRAM_ID = process.env.NEXT_PUBLIC_PROGRAM_ID || TEMPORARY_PROGRAM_ID;
export const PROGRAM_PUBLIC_KEY = new PublicKey(PROGRAM_ID);
export const TREASURY_WALLET = process.env.NEXT_PUBLIC_TREASURY_WALLET ?? "";
export const COMPETITION_VAULT = process.env.NEXT_PUBLIC_COMPETITION_VAULT ?? "";
export const SUNNY_MINT = process.env.NEXT_PUBLIC_SUNNY_MINT ?? "";
export const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || "https://api.devnet.solana.com";
export const LAUNCH_FEE = 0.02 * LAMPORTS_PER_SOL;
export const LAUNCH_TREASURY_FEE = 0.01 * LAMPORTS_PER_SOL;
export const LAUNCH_RENT_ALLOCATION = 0.01 * LAMPORTS_PER_SOL;
export const GRADUATION_THRESHOLD = 35 * LAMPORTS_PER_SOL;
export const FEE_BPS = 100;
export const TREASURY_FEE_BPS = 50;
export const CREATOR_FEE_BPS = 50;

export function isDeploymentConfigured(): boolean {
  if (PROGRAM_ID === TEMPORARY_PROGRAM_ID || !TREASURY_WALLET || !COMPETITION_VAULT || !SUNNY_MINT) return false;
  try {
    new PublicKey(TREASURY_WALLET);
    new PublicKey(COMPETITION_VAULT);
    new PublicKey(SUNNY_MINT);
    return true;
  } catch {
    return false;
  }
}
