import { FEES, SUNNY_MINT } from "./constants";

export function getFeeBreakdown(mint: string, tradeAmountSol: number) {
  const totalFee = tradeAmountSol * FEES.TRADING_TOTAL;
  const treasury = tradeAmountSol * FEES.TREASURY;
  const creatorOrCompetition = tradeAmountSol * FEES.CREATOR_OR_COMPETITION;

  const isSunny = mint === SUNNY_MINT;

  return {
    totalFee,
    treasuryFee: treasury,
    recipient: isSunny ? "competition" : "creator",
    recipientFee: creatorOrCompetition,
    breakdown: isSunny
      ? `0.5% treasury + 0.5% competition vault`
      : `0.5% treasury + 0.5% creator (auto on-chain)`,
  };
}

export function calculateBuyTokens(
  virtualSol: number,
  virtualTokens: number,
  amountSolAfterFee: number
) {
  return (virtualTokens * amountSolAfterFee) / (virtualSol + amountSolAfterFee);
}
