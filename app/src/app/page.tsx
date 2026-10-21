"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { AnchorProvider, BN } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { FEE_BPS, GRADUATION_THRESHOLD, PROGRAM_ID, RPC_URL, isDeploymentConfigured } from "../lib/constants";
import { solToLamports, SunnyPadClient, tokensToBaseUnits } from "../lib/sunnypad";

type Coin = { mint: string; creator: string; name: string; symbol: string; uri?: string | null; created_at?: string; is_revoked?: boolean; is_burned?: boolean; holder_count?: number };

export default function Home() {
  const wallet = useWallet();
  const { connection } = useConnection();
  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [uri, setUri] = useState("");
  const [coins, setCoins] = useState<Coin[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [messageKind, setMessageKind] = useState<"info" | "error" | "success">("info");
  const configured = isDeploymentConfigured();
  const client = useMemo(() => {
    if (!wallet.publicKey || !wallet.signTransaction || !wallet.signAllTransactions) return null;
    const anchorWallet = wallet as unknown as AnchorProvider["wallet"];
    return new SunnyPadClient(new AnchorProvider(connection, anchorWallet, { commitment: "confirmed" }));
  }, [connection, wallet]);

  useEffect(() => {
    let active = true;
    fetch("/api/coins", { cache: "no-store" }).then(r => r.ok ? r.json() : []).then(data => {
      if (active && Array.isArray(data)) setCoins(data as Coin[]);
    }).catch(() => { if (active) setCoins([]); });
    return () => { active = false; };
  }, []);

  async function submitLaunch(event: FormEvent) {
    event.preventDefault();
    setMessage("");
    if (!client) { setMessageKind("error"); setMessage("Connect a wallet before launching."); return; }
    if (!configured) { setMessageKind("error"); setMessage("Public deployment addresses are not configured yet."); return; }
    if (!name.trim() || !symbol.trim() || !uri.trim()) { setMessageKind("error"); setMessage("Name, symbol, and metadata URI are required."); return; }
    if (new TextEncoder().encode(name.trim()).length > 32 || new TextEncoder().encode(symbol.trim()).length > 10 || new TextEncoder().encode(uri.trim()).length > 200) {
      setMessageKind("error"); setMessage("Name must be ≤32 bytes, symbol ≤10 bytes, and URI ≤200 bytes."); return;
    }
    setBusy(true);
    try {
      const result = await client.launch(name, symbol, uri);
      setMessageKind("success");
      setMessage(`Launch transaction confirmed: ${result.signature} · Mint: ${result.mint.toBase58()}`);
      setName(""); setSymbol(""); setUri("");
    } catch (error) {
      setMessageKind("error");
      setMessage(error instanceof Error ? error.message : "Launch failed. Check wallet, network, IDL, and program configuration.");
    } finally { setBusy(false); }
  }

  return <main className="min-h-screen overflow-hidden">
    <header className="mx-auto flex max-w-7xl items-center justify-between px-5 py-6 md:px-8">
      <a href="#top" className="flex items-center gap-3 font-black tracking-tight"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-yellow-300 text-2xl text-black">☀</span><span className="text-xl">Sunny<span className="text-yellow-300">Pad</span></span></a>
      <nav className="hidden items-center gap-7 text-sm text-slate-300 md:flex"><a href="#launch" className="hover:text-yellow-300">Launch a coin</a><a href="#trending" className="hover:text-yellow-300">Explore</a><a href="#fees" className="hover:text-yellow-300">Fees</a></nav>
      <WalletMultiButton className="!rounded-xl !bg-yellow-300 !font-bold !text-black hover:!bg-yellow-200" />
    </header>

    <section id="top" className="relative mx-auto grid max-w-7xl gap-12 px-5 pb-20 pt-12 md:grid-cols-[1.15fr_.85fr] md:items-center md:px-8 md:pt-20">
      <div className="pointer-events-none absolute -left-40 top-0 h-96 w-96 rounded-full bg-yellow-400/10 blur-3xl" />
      <div className="relative">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-yellow-200/20 bg-yellow-200/5 px-4 py-2 text-xs font-bold uppercase tracking-[.18em] text-yellow-200"><span className="h-2 w-2 rounded-full bg-emerald-400" /> Built for Solana creators</div>
        <h1 className="max-w-3xl text-5xl font-black leading-[1.04] tracking-tight sm:text-6xl md:text-7xl">Your meme.<br/><span className="text-yellow-300">Your community.</span><br/>Your launchpad.</h1>
        <p className="mt-6 max-w-xl text-lg leading-8 text-slate-400">Launch a token with transparent fees and on-chain bonding-curve trading. No hidden creator allocation is assumed by the interface.</p>
        <div className="mt-8 flex flex-wrap gap-3"><a href="#launch" className="rounded-xl bg-yellow-300 px-6 py-3.5 font-extrabold text-black transition hover:-translate-y-0.5 hover:bg-yellow-200">Launch a token <span aria-hidden="true">↗</span></a><a href="#trending" className="rounded-xl border border-white/15 px-6 py-3.5 font-bold text-white hover:border-yellow-300/50">Explore tokens</a></div>
        <div className="mt-10 grid max-w-xl grid-cols-3 gap-3"><Metric value="0.02 SOL" label="Launch fee"/><Metric value="1%" label="Trading fee"/><Metric value="35 SOL" label="Graduation target"/></div>
      </div>
      <div className="relative rounded-3xl border border-white/10 bg-gradient-to-br from-white/[.08] to-white/[.02] p-5 shadow-2xl shadow-yellow-500/5 sm:p-7">
        <div className="flex items-center justify-between"><span className="text-sm font-bold text-slate-300">THE SUNNY ECOSYSTEM</span><span className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-400">Solana</span></div>
        <div className="relative mt-8 flex min-h-72 items-center justify-center overflow-hidden rounded-2xl border border-yellow-200/10 bg-[#0d1017]">
          <div className="absolute h-56 w-56 rounded-full border border-yellow-300/20"/><div className="absolute h-40 w-40 rounded-full border border-yellow-300/20"/><div className="absolute h-24 w-24 rounded-full bg-yellow-300/10 blur-xl"/>
          <div className="relative grid h-28 w-28 place-items-center rounded-[2rem] border border-yellow-100/60 bg-gradient-to-br from-yellow-200 to-amber-500 text-6xl text-black shadow-xl shadow-yellow-500/20">☀</div>
          <div className="absolute left-6 top-10 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-300">On-chain fees</div><div className="absolute bottom-10 right-5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-300">Creator-first</div><div className="absolute bottom-8 left-6 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-300">Bonding curve</div>
        </div>
        <div id="fees" className="mt-5 grid grid-cols-2 gap-3"><div className="rounded-2xl bg-white/[.04] p-4"><p className="text-xs text-slate-400">Launch fee</p><p className="mt-1 text-xl font-black">0.02 SOL</p><p className="mt-1 text-xs text-slate-500">0.01 treasury + 0.01 rent allocation</p></div><div className="rounded-2xl bg-white/[.04] p-4"><p className="text-xs text-slate-400">Trade fee</p><p className="mt-1 text-xl font-black">1.00%</p><p className="mt-1 text-xs text-slate-500">0.50% treasury + 0.50% creator / competition</p></div></div>
      </div>
    </section>

    <section id="launch" className="mx-auto grid max-w-7xl gap-8 px-5 py-14 md:grid-cols-[.8fr_1.2fr] md:px-8">
      <div className="py-4"><p className="text-sm font-bold uppercase tracking-[.2em] text-yellow-300">Make it real</p><h2 className="mt-4 text-4xl font-black tracking-tight">Launch your next<br/>community favorite.</h2><p className="mt-4 max-w-md leading-7 text-slate-400">Bring your token name, ticker, and metadata URI. Your wallet signs the transaction; SunnyPad does not ask for your seed phrase or private key.</p><div className="mt-7 space-y-3 text-sm text-slate-300"><Feature>Mint supply is fixed at launch</Feature><Feature>Mint authority is revoked by the program</Feature><Feature>Slippage and account checks enforced on-chain</Feature></div></div>
      <form onSubmit={submitLaunch} className="rounded-3xl border border-white/10 bg-[#101219] p-5 sm:p-8">
        <div className="flex items-start justify-between gap-4"><div><h3 className="text-2xl font-black">Create a token</h3><p className="mt-1 text-sm text-slate-400">Fill in the public token metadata.</p></div><span className="rounded-full bg-yellow-300/10 px-3 py-1 text-xs font-bold text-yellow-200">0.02 SOL</span></div>
        <label className="mt-7 block text-sm font-semibold text-slate-300">Token name<input value={name} onChange={e=>setName(e.target.value)} maxLength={32} placeholder="e.g. Sunny Dog" className="mt-2 w-full rounded-xl border border-white/10 bg-[#090b10] px-4 py-3.5 text-white outline-none transition placeholder:text-slate-600 focus:border-yellow-300/60" /></label>
        <label className="mt-4 block text-sm font-semibold text-slate-300">Ticker / symbol<input value={symbol} onChange={e=>setSymbol(e.target.value.toUpperCase())} maxLength={10} placeholder="e.g. SDOG" className="mt-2 w-full rounded-xl border border-white/10 bg-[#090b10] px-4 py-3.5 text-white outline-none transition placeholder:text-slate-600 focus:border-yellow-300/60" /></label>
        <label className="mt-4 block text-sm font-semibold text-slate-300">Metadata URI<input value={uri} onChange={e=>setUri(e.target.value)} maxLength={200} placeholder="https://.../metadata.json" className="mt-2 w-full rounded-xl border border-white/10 bg-[#090b10] px-4 py-3.5 text-white outline-none transition placeholder:text-slate-600 focus:border-yellow-300/60" /><span className="mt-2 block text-xs text-slate-500">Provide a hosted JSON metadata URI. Upload tooling can be configured separately.</span></label>
        {message && <div role="status" className={`mt-5 break-words rounded-xl border p-3 text-sm ${messageKind === "error" ? "border-rose-400/20 bg-rose-400/5 text-rose-200" : messageKind === "success" ? "border-emerald-400/20 bg-emerald-400/5 text-emerald-200" : "border-white/10 text-slate-300"}`}>{message}</div>}
        {!configured && <p className="mt-4 rounded-xl border border-amber-300/20 bg-amber-300/5 p-3 text-xs leading-5 text-amber-100">Setup mode: deployment addresses are intentionally not configured yet. Add verified public addresses and the generated Anchor IDL before sending transactions.</p>}
        <button disabled={busy || !wallet.publicKey || !configured} className="mt-5 w-full rounded-xl bg-yellow-300 px-5 py-4 font-black text-black transition hover:bg-yellow-200 disabled:cursor-not-allowed disabled:opacity-40">{busy ? "Waiting for transaction…" : !wallet.publicKey ? "Connect wallet to continue" : !configured ? "Deployment not configured" : "Launch token · 0.02 SOL"}</button>
        <p className="mt-3 text-center text-xs text-slate-500">Network: {RPC_URL.includes("devnet") ? "Devnet" : "Configured RPC"} · Program: {PROGRAM_ID.slice(0, 6)}…{PROGRAM_ID.slice(-4)}</p>
      </form>
    </section>

    <section id="trade" className="mx-auto max-w-7xl px-5 py-12 md:px-8">
      <div className="grid gap-8 md:grid-cols-[.75fr_1.25fr] md:items-start">
        <div><p className="text-sm font-bold uppercase tracking-[.2em] text-yellow-300">Trade carefully</p><h2 className="mt-3 text-3xl font-black">Quote before you swap.</h2><p className="mt-4 leading-7 text-slate-400">SunnyPad reads the current curve, estimates output, and sets a minimum output with slippage protection. Quotes can change before confirmation; always review the wallet transaction.</p><p className="mt-4 text-xs leading-5 text-slate-500">Default slippage is 1%. Quotes are estimates, not guarantees. Trading is unavailable until the IDL and public addresses are configured.</p></div>
        <TradePanel client={client} configured={configured} connected={Boolean(wallet.publicKey)} initialMint={coins[0]?.mint ?? ""} />
      </div>
    </section>

    <section id="trending" className="mx-auto max-w-7xl px-5 py-16 md:px-8"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-bold uppercase tracking-[.2em] text-yellow-300">Community radar</p><h2 className="mt-3 text-3xl font-black sm:text-4xl">Trending tokens</h2></div><span className="text-sm text-slate-500">Cached metadata · verify on-chain before trading</span></div>
      {coins.length ? <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{coins.map(coin => <article key={coin.mint} className="rounded-2xl border border-white/10 bg-white/[.03] p-5 transition hover:border-yellow-300/30"><div className="flex items-start justify-between"><div className="grid h-12 w-12 place-items-center rounded-2xl bg-yellow-300/10 text-2xl">☀</div><span className="rounded-full border border-white/10 px-2.5 py-1 text-xs text-slate-400">{coin.is_burned ? "Burned" : coin.is_revoked ? "Authority revoked" : "Token"}</span></div><h3 className="mt-4 text-lg font-extrabold">{coin.name}</h3><p className="text-sm font-bold text-yellow-200">${coin.symbol}</p><p className="mt-4 break-all text-xs text-slate-500">{coin.mint}</p><a className="mt-4 inline-flex text-sm font-bold text-slate-200 hover:text-yellow-200" href={`https://explorer.solana.com/address/${encodeURIComponent(coin.mint)}?cluster=${RPC_URL.includes("devnet") ? "devnet" : "mainnet-beta"}`} target="_blank" rel="noreferrer">View on Solana Explorer ↗</a></article>)}</div> : <div className="mt-8 rounded-2xl border border-dashed border-white/15 px-6 py-12 text-center"><div className="text-3xl">☀</div><h3 className="mt-3 font-bold">The board is warming up</h3><p className="mt-2 text-sm text-slate-500">Newly indexed coins will appear here when the Supabase cache is configured.</p></div>}
    </section>

    <footer className="border-t border-white/10 px-5 py-8 md:px-8"><div className="mx-auto flex max-w-7xl flex-col justify-between gap-4 text-xs text-slate-500 sm:flex-row"><span>© SunnyPad · Built for Solana creators</span><span>Fees are enforced by program code. Verify addresses and transactions independently.</span><span>Configured fee rate: {FEE_BPS / 100}% · Graduation target: {GRADUATION_THRESHOLD / 1_000_000_000} SOL</span></div></footer>
  </main>;
}

function Metric({ value, label }: { value: string; label: string }) { return <div className="rounded-2xl border border-white/10 bg-white/[.03] p-4"><p className="text-lg font-black sm:text-xl">{value}</p><p className="mt-1 text-xs text-slate-500">{label}</p></div>; }
function Feature({ children }: { children: React.ReactNode }) { return <p className="flex items-center gap-3"><span className="grid h-6 w-6 place-items-center rounded-full bg-emerald-400/10 text-emerald-300">✓</span>{children}</p>; }


type TradePreview = { side: "buy" | "sell"; mint: string; amount: string; expectedOut: string; minOut: string; fee: string; slippageBps: number };

function TradePanel({ client, configured, connected, initialMint }: { client: SunnyPadClient | null; configured: boolean; connected: boolean; initialMint: string }) {
  const [mint, setMint] = useState(initialMint);
  const [buyAmount, setBuyAmount] = useState("0.1");
  const [sellAmount, setSellAmount] = useState("1");
  const [slippage, setSlippage] = useState("100");
  const [preview, setPreview] = useState<TradePreview | null>(null);
  const [status, setStatus] = useState("");
  const [kind, setKind] = useState<"info" | "error" | "success">("info");
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (!mint && initialMint) setMint(initialMint); }, [initialMint, mint]);

  async function makeQuote(side: "buy" | "sell") {
    setStatus(""); setPreview(null);
    if (!client || !configured) { setKind("error"); setStatus("Connect a wallet and configure deployment addresses first."); return; }
    try {
      const publicKey = new PublicKey(mint.trim());
      const slippageBps = Number(slippage);
      const input = side === "buy" ? solToLamports(buyAmount) : tokensToBaseUnits(sellAmount);
      const quote = side === "buy" ? await client.quoteBuy(publicKey, input, slippageBps) : await client.quoteSell(publicKey, input, slippageBps);
      setPreview({ side, mint: publicKey.toBase58(), amount: input.toString(), expectedOut: quote.expectedOut.toString(), minOut: quote.minOut.toString(), fee: quote.fee.toString(), slippageBps });
      setKind("info");
      setStatus(`Quote ready. Estimated ${side === "buy" ? formatTokens(quote.expectedOut.toString()) + " tokens" : formatSol(quote.expectedOut.toString()) + " SOL"}. Review the minimum output below, then confirm.`);
    } catch (error) { setKind("error"); setStatus(error instanceof Error ? error.message : "Could not quote this trade."); }
  }

  async function confirmTrade() {
    if (!client || !preview) return;
    setBusy(true);
    try {
      const mintKey = new PublicKey(preview.mint);
      const signature = preview.side === "buy"
        ? await client.buy(mintKey, new BN(preview.amount), new BN(preview.minOut))
        : await client.sell(mintKey, new BN(preview.amount), new BN(preview.minOut));
      setKind("success"); setStatus(`Transaction submitted: ${signature}`); setPreview(null);
    } catch (error) { setKind("error"); setStatus(error instanceof Error ? error.message : "Trade failed. Check your wallet and account balances."); }
    finally { setBusy(false); }
  }

  return <div className="rounded-3xl border border-white/10 bg-[#101219] p-5 sm:p-7">
    <label className="block text-sm font-semibold text-slate-300">Token mint<input value={mint} onChange={e => { setMint(e.target.value); setPreview(null); }} placeholder="Paste a Solana mint address" className="mt-2 w-full rounded-xl border border-white/10 bg-[#090b10] px-4 py-3 outline-none focus:border-yellow-300/60" /></label>
    <div className="mt-5 grid gap-4 sm:grid-cols-2">
      <div className="rounded-2xl border border-white/10 p-4"><p className="font-bold">Buy with SOL</p><label className="mt-3 block text-xs text-slate-400">Amount (SOL)<input value={buyAmount} onChange={e => { setBuyAmount(e.target.value); setPreview(null); }} inputMode="decimal" className="mt-2 w-full rounded-lg border border-white/10 bg-[#090b10] px-3 py-3 text-white" /></label><button type="button" disabled={!connected || !configured || busy} onClick={() => makeQuote("buy")} className="mt-4 w-full rounded-xl bg-yellow-300 px-4 py-3 font-extrabold text-black disabled:opacity-40">Get buy quote</button></div>
      <div className="rounded-2xl border border-white/10 p-4"><p className="font-bold">Sell tokens</p><label className="mt-3 block text-xs text-slate-400">Amount (tokens)<input value={sellAmount} onChange={e => { setSellAmount(e.target.value); setPreview(null); }} inputMode="decimal" className="mt-2 w-full rounded-lg border border-white/10 bg-[#090b10] px-3 py-3 text-white" /></label><button type="button" disabled={!connected || !configured || busy} onClick={() => makeQuote("sell")} className="mt-4 w-full rounded-xl border border-white/15 px-4 py-3 font-extrabold text-white hover:border-yellow-300/60 disabled:opacity-40">Get sell quote</button></div>
    </div>
    <label className="mt-4 block text-xs text-slate-400">Slippage tolerance (basis points; 100 = 1%)<input value={slippage} onChange={e => { setSlippage(e.target.value); setPreview(null); }} inputMode="numeric" className="mt-2 w-full rounded-xl border border-white/10 bg-[#090b10] px-4 py-3 text-white" /></label>
    {preview && <div className="mt-5 rounded-2xl border border-yellow-300/20 bg-yellow-300/5 p-4"><div className="flex items-center justify-between"><span className="font-extrabold">Review {preview.side}</span><span className="text-xs text-yellow-200">{preview.slippageBps / 100}% slippage</span></div><div className="mt-3 grid grid-cols-2 gap-3 text-sm"><div><p className="text-slate-500">Expected output</p><p className="mt-1 font-bold">{preview.side === "buy" ? `${formatTokens(preview.expectedOut)} tokens` : `${formatSol(preview.expectedOut)} SOL`}</p></div><div><p className="text-slate-500">Minimum output</p><p className="mt-1 font-bold">{preview.side === "buy" ? `${formatTokens(preview.minOut)} tokens` : `${formatSol(preview.minOut)} SOL`}</p></div><div><p className="text-slate-500">Estimated fee</p><p className="mt-1 font-bold">{preview.side === "buy" ? `${formatSol(preview.fee)} SOL` : `${formatSol(preview.fee)} SOL`}</p></div><div><p className="text-slate-500">Fee split</p><p className="mt-1 font-bold">0.5% + 0.5%</p></div></div><button type="button" onClick={confirmTrade} disabled={busy} className="mt-4 w-full rounded-xl bg-emerald-300 px-4 py-3 font-extrabold text-black disabled:opacity-40">{busy ? "Waiting for wallet…" : `Confirm ${preview.side}`}</button></div>}
    {status && <p role="status" className={`mt-4 break-all rounded-xl border p-3 text-sm ${kind === "error" ? "border-rose-400/20 bg-rose-400/5 text-rose-200" : kind === "success" ? "border-emerald-400/20 bg-emerald-400/5 text-emerald-200" : "border-white/10 text-slate-300"}`}>{status}</p>}
  </div>;
}

function formatTokens(baseUnits: string): string {
  const value = BigInt(baseUnits);
  const whole = value / 1_000_000n;
  const fraction = (value % 1_000_000n).toString().padStart(6, "0").replace(/0+$/, "");
  return fraction ? `${whole}.${fraction}` : whole.toString();
}
function formatSol(lamports: string): string { return (Number(BigInt(lamports)) / 1_000_000_000).toFixed(9).replace(/0+$/, "").replace(/\.$/, ""); }
