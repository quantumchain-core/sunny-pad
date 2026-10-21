import { AnchorProvider, BN, Idl, Program } from "@coral-xyz/anchor";
import { ASSOCIATED_TOKEN_PROGRAM_ID, createAssociatedTokenAccountIdempotentInstruction, getAssociatedTokenAddressSync, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { Keypair, PublicKey, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { COMPETITION_VAULT, isDeploymentConfigured, PROGRAM_PUBLIC_KEY, SUNNY_MINT, TREASURY_WALLET } from "./constants";



export class SunnyPadClient {
  private readonly provider: AnchorProvider;
  private programPromise?: Promise<Program>;

  constructor(provider: AnchorProvider) {
    this.provider = provider;
  }

  private async program(): Promise<Program> {
    if (!this.programPromise) {
      this.programPromise = fetch("/idl/sunny_pad.json", { cache: "no-store" }).then(async (response) => {
        if (!response.ok) throw new Error("SunnyPad IDL is not installed. Build the Anchor program and copy its generated IDL first.");
        const idl = (await response.json()) as Idl;
        return new Program({ ...idl, address: PROGRAM_PUBLIC_KEY.toBase58() } as Idl, this.provider);
      });
    }
    return this.programPromise;
  }

  async launch(name: string, symbol: string, uri: string): Promise<{ signature: string; mint: PublicKey }> {
    this.assertAddresses();
    const wallet = this.requireWallet();
    const program = await this.program();
    const mint = Keypair.generate();
    const [config] = PublicKey.findProgramAddressSync([Buffer.from("config")], PROGRAM_PUBLIC_KEY);
    const [curve] = PublicKey.findProgramAddressSync([Buffer.from("curve"), mint.publicKey.toBuffer()], PROGRAM_PUBLIC_KEY);
    const [vault] = PublicKey.findProgramAddressSync([Buffer.from("vault"), mint.publicKey.toBuffer()], PROGRAM_PUBLIC_KEY);
    const [curveTokenVault] = PublicKey.findProgramAddressSync([Buffer.from("tokens"), mint.publicKey.toBuffer()], PROGRAM_PUBLIC_KEY);
    const signature = await (program.methods as any).launchMeme(name.trim(), symbol.trim(), uri.trim()).accounts({
      creator: wallet,
      config,
      bondingCurve: curve,
      mint: mint.publicKey,
      vault,
      curveTokenVault,
      treasury: new PublicKey(TREASURY_WALLET),
      systemProgram: SystemProgram.programId,
      tokenProgram: TOKEN_PROGRAM_ID,
    }).signers([mint]).rpc();
    return { signature, mint: mint.publicKey };
  }

  async buy(mint: PublicKey, amountLamports: BN, minTokensOut: BN): Promise<string> {
    return this.trade("buy", mint, amountLamports, minTokensOut);
  }

  async sell(mint: PublicKey, amountTokens: BN, minSolOut: BN): Promise<string> {
    return this.trade("sell", mint, amountTokens, minSolOut);
  }

  async quoteBuy(mint: PublicKey, amountLamports: BN, slippageBps = 100): Promise<{ expectedOut: BN; minOut: BN; fee: BN }> {
    validateSlippage(slippageBps);
    const maxU64 = new BN("18446744073709551615");
    if (amountLamports.lte(new BN(0)) || amountLamports.gt(maxU64.divn(100))) throw new Error("Buy amount is outside the safe on-chain fee-math range.");
    const curve: any = await this.getCurve(mint);
    const fee = amountLamports.muln(100).divn(10_000);
    const net = amountLamports.sub(fee);
    const virtualSol = new BN(curve.virtualSolReserves.toString());
    const virtualTokens = new BN(curve.virtualTokenReserves.toString());
    if (virtualSol.isZero() || virtualTokens.isZero() || net.isZero()) throw new Error("Curve reserves or trade amount are invalid.");
    const expectedOut = virtualTokens.mul(net).div(virtualSol.add(net));
    if (expectedOut.isZero()) throw new Error("This amount rounds down to zero tokens.");
    const minOut = expectedOut.muln(10_000 - slippageBps).divn(10_000);
    if (minOut.isZero()) throw new Error("Slippage setting makes minimum output zero; increase trade size or reduce slippage.");
    return { expectedOut, minOut, fee };
  }

  async quoteSell(mint: PublicKey, amountTokens: BN, slippageBps = 100): Promise<{ expectedOut: BN; minOut: BN; fee: BN }> {
    validateSlippage(slippageBps);
    if (amountTokens.lte(new BN(0)) || amountTokens.gt(new BN("18446744073709551615"))) throw new Error("Sell amount is outside the supported u64 range.");
    const curve: any = await this.getCurve(mint);
    const virtualSol = new BN(curve.virtualSolReserves.toString());
    const virtualTokens = new BN(curve.virtualTokenReserves.toString());
    if (virtualSol.isZero() || virtualTokens.isZero()) throw new Error("Curve reserves are invalid.");
    const gross = virtualSol.mul(amountTokens).div(virtualTokens.add(amountTokens));
    const maxU64 = new BN("18446744073709551615");
    if (gross.gt(maxU64.divn(100))) throw new Error("Sell quote exceeds the safe on-chain fee-math range.");
    const fee = gross.muln(100).divn(10_000);
    const expectedOut = gross.sub(fee);
    if (expectedOut.isZero()) throw new Error("This amount rounds down to zero SOL.");
    const minOut = expectedOut.muln(10_000 - slippageBps).divn(10_000);
    if (minOut.isZero()) throw new Error("Slippage setting makes minimum output zero; increase trade size or reduce slippage.");
    return { expectedOut, minOut, fee };
  }

  async getCurve(mint: PublicKey): Promise<unknown> {
    const program = await this.program();
    const [curve] = PublicKey.findProgramAddressSync([Buffer.from("curve"), mint.toBuffer()], PROGRAM_PUBLIC_KEY);
    return (program.account as any).bondingCurve.fetch(curve);
  }

  async getVault(mint: PublicKey): Promise<unknown> {
    const program = await this.program();
    const [vault] = PublicKey.findProgramAddressSync([Buffer.from("vault"), mint.toBuffer()], PROGRAM_PUBLIC_KEY);
    return (program.account as any).vault.fetch(vault);
  }

  private async trade(method: "buy" | "sell", mint: PublicKey, amount: BN, minOut: BN): Promise<string> {
    this.assertAddresses();
    const wallet = this.requireWallet();
    const program = await this.program();
    const [config] = PublicKey.findProgramAddressSync([Buffer.from("config")], PROGRAM_PUBLIC_KEY);
    const [curve] = PublicKey.findProgramAddressSync([Buffer.from("curve"), mint.toBuffer()], PROGRAM_PUBLIC_KEY);
    const [vault] = PublicKey.findProgramAddressSync([Buffer.from("vault"), mint.toBuffer()], PROGRAM_PUBLIC_KEY);
    const [curveTokenVault] = PublicKey.findProgramAddressSync([Buffer.from("tokens"), mint.toBuffer()], PROGRAM_PUBLIC_KEY);
    const traderTokenAccount = getAssociatedTokenAddressSync(mint, wallet);
    const curveAccount = await (program.account as any).bondingCurve.fetch(curve);
    const accounts = {
      trader: wallet,
      config,
      bondingCurve: curve,
      mint,
      vault,
      curveTokenVault,
      traderTokenAccount,
      treasury: new PublicKey(TREASURY_WALLET),
      creator: new PublicKey(curveAccount.creator),
      competitionVault: new PublicKey(COMPETITION_VAULT),
      systemProgram: SystemProgram.programId,
      tokenProgram: TOKEN_PROGRAM_ID,
    };
    const ensureAta = createAssociatedTokenAccountIdempotentInstruction(
      wallet, traderTokenAccount, wallet, mint, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID
    );
    const methods = program.methods as any;
    if (method === "buy") {
      return methods.buy(amount, minOut).preInstructions([ensureAta]).accounts(accounts).rpc();
    }
    return methods.sell(amount, minOut).preInstructions([ensureAta]).accounts(accounts).rpc();
  }

  private requireWallet(): PublicKey {
    if (!this.provider.wallet.publicKey) throw new Error("Connect a Solana wallet first.");
    return this.provider.wallet.publicKey;
  }

  private assertAddresses(): void {
    if (!isDeploymentConfigured()) {
      throw new Error("Deployment addresses are not configured yet. Replace the temporary program ID and add verified public addresses to app/.env.local.");
    }
    // Validate all strings before building a transaction.
    new PublicKey(TREASURY_WALLET);
    new PublicKey(COMPETITION_VAULT);
    new PublicKey(SUNNY_MINT);
  }
}

export function solToLamports(amount: string): BN {
  if (!/^\d+(\.\d{1,9})?$/.test(amount)) throw new Error("Enter a SOL amount with at most 9 decimal places.");
  const [whole, fraction = ""] = amount.split(".");
  return new BN(whole).mul(new BN(LAMPORTS_PER_SOL)).add(new BN((fraction + "000000000").slice(0, 9)));
}

function validateSlippage(slippageBps: number): void {
  if (!Number.isInteger(slippageBps) || slippageBps < 0 || slippageBps > 5_000) {
    throw new Error("Slippage must be an integer from 0 to 5000 basis points (0–50%).");
  }
}

export function tokensToBaseUnits(amount: string): BN {
  if (!/^\d+(\.\d{1,6})?$/.test(amount)) throw new Error("Enter a token amount with at most 6 decimal places.");
  const [whole, fraction = ""] = amount.split(".");
  return new BN(whole).mul(new BN(1_000_000)).add(new BN((fraction + "000000").slice(0, 6)));
}
