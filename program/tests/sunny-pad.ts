import * as anchor from "@coral-xyz/anchor";
import { Program, BN, AnchorProvider } from "@coral-xyz/anchor";
import { expect } from "chai";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  getAccount,
  getAssociatedTokenAddressSync,
  getMint,
  createAssociatedTokenAccountInstruction,
} from "@solana/spl-token";
import { Keypair, PublicKey, SystemProgram, LAMPORTS_PER_SOL, Transaction } from "@solana/web3.js";

describe("sunny_pad", () => {
  const provider = AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.SunnyPad as Program;
  const methods = program.methods as any;
  const connection = provider.connection;
  const creator = provider.wallet;
  const treasury = Keypair.generate();
  const competitionVault = Keypair.generate();
  const sunnyMintKeypair = Keypair.generate();
  const sunnyMint = sunnyMintKeypair.publicKey;
  const buyer = Keypair.generate();
  let configPda: PublicKey;

  const pda = (seed: string, mint: PublicKey) => PublicKey.findProgramAddressSync(
    [Buffer.from(seed), mint.toBuffer()], program.programId
  )[0];

  async function airdrop(pubkey: PublicKey, sol = 100) {
    const sig = await connection.requestAirdrop(pubkey, sol * LAMPORTS_PER_SOL);
    await connection.confirmTransaction(sig, "confirmed");
  }

  async function launchCoin(name = "Test Sunny", symbol = "TSUN", suppliedMint?: Keypair) {
    const mint = suppliedMint ?? Keypair.generate();
    const curve = pda("curve", mint.publicKey);
    const vault = pda("vault", mint.publicKey);
    const tokenVault = pda("tokens", mint.publicKey);
    const tx = await methods.launchMeme(name, symbol, "https://example.com/metadata.json")
      .accounts({
        creator: creator.publicKey,
        config: configPda,
        bondingCurve: curve,
        mint: mint.publicKey,
        vault,
        curveTokenVault: tokenVault,
        treasury: treasury.publicKey,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([mint])
      .rpc();
    const traderAta = getAssociatedTokenAddressSync(mint.publicKey, buyer.publicKey);
    const createAta = new Transaction().add(createAssociatedTokenAccountInstruction(
      buyer.publicKey, traderAta, buyer.publicKey, mint.publicKey,
      TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID
    ));
    await provider.sendAndConfirm(createAta, [buyer]);
    return { mint: mint.publicKey, curve, vault, tokenVault, traderAta, signature: tx };
  }

  before(async () => {
    await airdrop(buyer.publicKey);
    await airdrop(treasury.publicKey, 1);
    await airdrop(competitionVault.publicKey, 1);
    [configPda] = PublicKey.findProgramAddressSync([Buffer.from("config")], program.programId);
    await methods.initializeConfig(treasury.publicKey, competitionVault.publicKey, sunnyMint)
      .accounts({ authority: creator.publicKey, config: configPda, systemProgram: SystemProgram.programId })
      .rpc();
  });

  it("rejects config reinitialization", async () => {
    await expectRejected(methods.initializeConfig(treasury.publicKey, competitionVault.publicKey, sunnyMint)
      .accounts({ authority: creator.publicKey, config: configPda, systemProgram: SystemProgram.programId }).rpc());
  });

  it("launches a mint, allocates the launch fee, and revokes mint authority", async () => {
    const treasuryBefore = await connection.getBalance(treasury.publicKey);
    const coin = await launchCoin();
    const treasuryAfter = await connection.getBalance(treasury.publicKey);
    const mintInfo = await getMint(connection, coin.mint);
    const curve = await (program.account as any).bondingCurve.fetch(coin.curve);
    expect(treasuryAfter - treasuryBefore).to.equal(10_000_000);
    expect(mintInfo.mintAuthority).to.equal(null);
    expect(mintInfo.supply).to.equal(BigInt("1073000000000000"));
    expect(curve.realSolReserves.toString()).to.equal("0");
    expect(curve.virtualSolReserves.toString()).to.equal("30000000000");
    const vaultState = await (program.account as any).vault.fetch(coin.vault);
    expect(vaultState.lockedLamports.toNumber()).to.be.greaterThan(0);
    expect(vaultState.lockedLamports.toNumber()).to.be.lessThan(10_000_000);
  });

  it("buys tokens and routes the exact 1% fee split", async () => {
    const coin = await launchCoin("Buy Test", "BUY");
    const treasuryBefore = await connection.getBalance(treasury.publicKey);
    const creatorBefore = await connection.getBalance(creator.publicKey);
    const signature = await methods.buy(new BN(100_000_000), new BN(1))
      .accounts(tradeAccounts(coin)).signers([buyer]).rpc();
    const treasuryAfter = await connection.getBalance(treasury.publicKey);
    const creatorAfter = await connection.getBalance(creator.publicKey);
    const fee = await transactionFee(signature);
    const traderTokens = await getAccount(connection, coin.traderAta);
    const curve = await (program.account as any).bondingCurve.fetch(coin.curve);
    const curveTokens = await getAccount(connection, coin.tokenVault);
    expect(treasuryAfter - treasuryBefore).to.equal(500_000);
    expect(creatorAfter - creatorBefore + fee).to.equal(500_000);
    expect(traderTokens.amount > 0n).to.equal(true);
    expect(curve.realSolReserves.toString()).to.equal("99000000");
    expect(traderTokens.amount + curveTokens.amount).to.equal(BigInt("1073000000000000"));
  });

  it("routes the second half-fee to the competition vault for SUNNY_MINT", async () => {
    const coin = await launchCoin("Sunny Fee Test", "SUNNY", sunnyMintKeypair);
    const treasuryBefore = await connection.getBalance(treasury.publicKey);
    const competitionBefore = await connection.getBalance(competitionVault.publicKey);
    const creatorBefore = await connection.getBalance(creator.publicKey);
    await methods.buy(new BN(100_000_000), new BN(1))
      .accounts(tradeAccounts(coin)).signers([buyer]).rpc();
    expect((await connection.getBalance(treasury.publicKey)) - treasuryBefore).to.equal(500_000);
    expect((await connection.getBalance(competitionVault.publicKey)) - competitionBefore).to.equal(500_000);
    expect((await connection.getBalance(creator.publicKey)) - creatorBefore).to.be.lessThan(0);
  });

  it("sells tokens and routes the exact fee split", async () => {
    const coin = await launchCoin("Sell Test", "SELL");
    await methods.buy(new BN(1_000_000_000), new BN(1))
      .accounts(tradeAccounts(coin)).signers([buyer]).rpc();
    const beforeTokens = (await getAccount(connection, coin.traderAta)).amount;
    const sellAmount = beforeTokens / 2n;
    const curveBefore = await (program.account as any).bondingCurve.fetch(coin.curve);
    const virtualSol = BigInt(curveBefore.virtualSolReserves.toString());
    const virtualTokens = BigInt(curveBefore.virtualTokenReserves.toString());
    const grossOut = virtualSol * sellAmount / (virtualTokens + sellAmount);
    const totalFee = grossOut * 100n / 10_000n;
    const creatorFee = totalFee / 2n;
    const treasuryFee = totalFee - creatorFee;
    const netOut = grossOut - totalFee;
    const treasuryBefore = await connection.getBalance(treasury.publicKey);
    const creatorBefore = await connection.getBalance(creator.publicKey);
    const signature = await methods.sell(new BN(sellAmount.toString()), new BN(netOut.toString()))
      .accounts(tradeAccounts(coin)).signers([buyer]).rpc();
    const treasuryAfter = await connection.getBalance(treasury.publicKey);
    const creatorAfter = await connection.getBalance(creator.publicKey);
    const fee = await transactionFee(signature);
    expect(treasuryAfter - treasuryBefore).to.equal(Number(treasuryFee));
    expect(creatorAfter - creatorBefore + fee).to.equal(Number(creatorFee));
    expect((await getAccount(connection, coin.traderAta)).amount).to.equal(beforeTokens - sellAmount);
  });

  it("rejects zero input, impossible slippage, and fee overflow", async () => {
    const coin = await launchCoin("Edge Test", "EDGE");
    await expectRejected(methods.buy(new BN(0), new BN(0)).accounts(tradeAccounts(coin)).signers([buyer]).rpc());
    await expectRejected(methods.buy(new BN(100_000_000), new BN("999999999999999999"))
      .accounts(tradeAccounts(coin)).signers([buyer]).rpc());
    await expectRejected(methods.buy(new BN("18446744073709551615"), new BN(0))
      .accounts(tradeAccounts(coin)).signers([buyer]).rpc());
  });

  it("rejects selling more tokens than the seller owns", async () => {
    const coin = await launchCoin("Oversell Test", "OVER");
    await methods.buy(new BN(100_000_000), new BN(1)).accounts(tradeAccounts(coin)).signers([buyer]).rpc();
    const owned = (await getAccount(connection, coin.traderAta)).amount;
    await expectRejected(methods.sell(new BN((owned + 1n).toString()), new BN(0))
      .accounts(tradeAccounts(coin)).signers([buyer]).rpc());
  });

  it("rejects a second launch for the same mint/PDA", async () => {
    const mint = Keypair.generate();
    const coin = await launchCoin("Duplicate Test", "DUP", mint);
    await expectRejected(methods.launchMeme("Duplicate Test", "DUP", "https://example.com/metadata.json")
      .accounts({ creator: creator.publicKey, config: configPda, bondingCurve: coin.curve, mint: mint.publicKey,
        vault: coin.vault, curveTokenVault: coin.tokenVault, treasury: treasury.publicKey,
        systemProgram: SystemProgram.programId, tokenProgram: TOKEN_PROGRAM_ID })
      .signers([mint]).rpc());
  });

  it("rejects a substituted creator fee recipient", async () => {
    const coin = await launchCoin("Creator Check", "CRTR");
    const attacker = Keypair.generate();
    await airdrop(attacker.publicKey, 1);
    await expectRejected(methods.buy(new BN(100_000_000), new BN(1))
      .accounts({ ...tradeAccounts(coin), creator: attacker.publicKey }).signers([buyer]).rpc());
  });

  it("rejects unauthorized treasury withdrawals", async () => {
    const coin = await launchCoin("Withdraw Test", "WITH");
    await expectRejected(methods.withdrawTreasury(new BN(1)).accounts({
      treasury: buyer.publicKey, config: configPda, mint: coin.mint, bondingCurve: coin.curve, vault: coin.vault,
    }).signers([buyer]).rpc());
  });

  it("does not let treasury withdraw active curve liquidity", async () => {
    const coin = await launchCoin("Treasury Reserve Test", "TRSV");
    await methods.buy(new BN(100_000_000), new BN(1)).accounts(tradeAccounts(coin)).signers([buyer]).rpc();
    await expectRejected(methods.withdrawTreasury(new BN(1)).accounts({
      treasury: treasury.publicKey, config: configPda, mint: coin.mint, bondingCurve: coin.curve, vault: coin.vault,
    }).signers([treasury]).rpc());
  });

  it("rejects graduation below the threshold", async () => {
    const coin = await launchCoin("Below Threshold", "LOW");
    await expectRejected(methods.graduate().accounts({ config: configPda, mint: coin.mint,
      bondingCurve: coin.curve, vault: coin.vault, raydiumProgram: SystemProgram.programId }).rpc());
  });

  it("fails closed at the graduation threshold until Raydium CPI exists", async () => {
    const coin = await launchCoin("Graduate Test", "GRAD");
    for (let i = 0; i < 4; i++) {
      await methods.buy(new BN(10 * LAMPORTS_PER_SOL), new BN(1))
        .accounts(tradeAccounts(coin)).signers([buyer]).rpc();
    }
    const before = await (program.account as any).bondingCurve.fetch(coin.curve);
    expect(BigInt(before.realSolReserves.toString()) >= 35_000_000_000n).to.equal(true);
    await expectRejected(methods.buy(new BN(1_000_000), new BN(1)).accounts(tradeAccounts(coin)).signers([buyer]).rpc());
    await expectRejected(methods.graduate().accounts({ config: configPda, mint: coin.mint,
      bondingCurve: coin.curve, vault: coin.vault, raydiumProgram: SystemProgram.programId }).rpc());
    const after = await (program.account as any).bondingCurve.fetch(coin.curve);
    expect(after.isGraduated).to.equal(false);
  });

  it("rejects invalid metadata and oversized fields", async () => {
    const mint = Keypair.generate();
    const curve = pda("curve", mint.publicKey);
    const vault = pda("vault", mint.publicKey);
    const tokenVault = pda("tokens", mint.publicKey);
    const accounts = { creator: creator.publicKey, config: configPda, bondingCurve: curve, mint: mint.publicKey,
      vault, curveTokenVault: tokenVault, treasury: treasury.publicKey, systemProgram: SystemProgram.programId,
      tokenProgram: TOKEN_PROGRAM_ID };
    await expectRejected(methods.launchMeme("", "BAD", "https://example.com/meta.json")
      .accounts(accounts).signers([mint]).rpc());
    await expectRejected(methods.launchMeme("A".repeat(33), "BAD", "https://example.com/meta.json")
      .accounts(accounts).signers([mint]).rpc());
    await expectRejected(methods.launchMeme("Valid", "TOOLONGSYMBOL", "https://example.com/meta.json")
      .accounts(accounts).signers([mint]).rpc());
    await expectRejected(methods.launchMeme("Valid", "OK", "u".repeat(201))
      .accounts(accounts).signers([mint]).rpc());
  });

  function tradeAccounts(coin: Awaited<ReturnType<typeof launchCoin>>) {
    return { trader: buyer.publicKey, config: configPda, bondingCurve: coin.curve, mint: coin.mint,
      vault: coin.vault, curveTokenVault: coin.tokenVault, traderTokenAccount: coin.traderAta,
      treasury: treasury.publicKey, creator: creator.publicKey, competitionVault: competitionVault.publicKey,
      systemProgram: SystemProgram.programId, tokenProgram: TOKEN_PROGRAM_ID };
  }

  async function transactionFee(signature: string): Promise<number> {
    const tx = await connection.getTransaction(signature, { commitment: "confirmed", maxSupportedTransactionVersion: 0 });
    if (!tx?.meta) throw new Error("Transaction metadata unavailable for fee reconciliation");
    return tx.meta.fee;
  }

  async function expectRejected(promise: Promise<unknown>) {
    let failed = false;
    try { await promise; } catch { failed = true; }
    expect(failed, "transaction should have failed").to.equal(true);
  }
});
