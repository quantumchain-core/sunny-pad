"use client";

import { useState } from "react";

export default function Home() {
  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");

  const validName = name.trim().length > 0 && name.trim().length <= 32;
  const validSymbol = symbol.trim().length > 0 && symbol.trim().length <= 10;

  return (
    <main className="min-h-screen bg-[#080b12] px-4 py-10 text-white sm:px-6">
      <div className="mx-auto w-full max-w-3xl">
        <header className="mb-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-300/25 bg-amber-300/10 px-3 py-1 text-sm text-amber-200">
            <span aria-hidden="true">☀</span> Early preview
          </div>
          <h1 className="mt-5 text-4xl font-black tracking-tight sm:text-6xl">
            Sunny <span className="text-amber-300">Pad</span>
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
            A Solana token-launchpad prototype. We are building and testing the
            on-chain program before enabling launches or trades.
          </p>
        </header>

        <section
          aria-labelledby="status-heading"
          className="rounded-2xl border border-amber-300/30 bg-amber-300/[0.07] p-5 sm:p-6"
        >
          <div className="flex items-start gap-3">
            <span className="mt-0.5 text-xl" aria-hidden="true">⚠️</span>
            <div>
              <h2 id="status-heading" className="font-bold text-amber-100">
                On-chain launch is not available yet
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-200">
                The Sunny Pad Solana program has not been deployed. Wallet
                transactions, token creation, buying, selling, and graduation
                are disabled while the program is implemented and tested.
                This page will not request a wallet signature or payment.
              </p>
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-white/10 bg-white/[0.04] p-5 sm:p-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-xl font-bold">Launch preview</h2>
              <p className="mt-1 text-sm text-slate-400">
                Preview your token details. Submitting is not enabled.
              </p>
            </div>
            <span className="w-fit rounded-full border border-slate-500/40 px-3 py-1 text-xs font-semibold text-slate-300">
              NOT CONNECTED TO SOLANA
            </span>
          </div>

          <form className="mt-6 space-y-4" onSubmit={(event) => event.preventDefault()}>
            <div>
              <label htmlFor="token-name" className="mb-2 block text-sm font-medium text-slate-200">
                Token name
              </label>
              <input
                id="token-name"
                autoComplete="off"
                maxLength={32}
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g. Sunny Dog"
                className="w-full rounded-xl border border-white/15 bg-[#0b101a] px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-amber-300 focus:ring-2 focus:ring-amber-300/20"
              />
              <p className="mt-1 text-right text-xs text-slate-500">{name.length}/32</p>
            </div>

            <div>
              <label htmlFor="token-symbol" className="mb-2 block text-sm font-medium text-slate-200">
                Token symbol
              </label>
              <input
                id="token-symbol"
                autoComplete="off"
                maxLength={10}
                value={symbol}
                onChange={(event) => setSymbol(event.target.value.toUpperCase())}
                placeholder="e.g. SDOG"
                className="w-full rounded-xl border border-white/15 bg-[#0b101a] px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-amber-300 focus:ring-2 focus:ring-amber-300/20"
              />
              <p className="mt-1 text-right text-xs text-slate-500">{symbol.length}/10</p>
            </div>

            <button
              type="button"
              disabled
              title="Token launches will be enabled after the on-chain program passes testing."
              className="w-full cursor-not-allowed rounded-xl bg-amber-300/40 px-5 py-4 font-extrabold text-slate-950/70"
            >
              Launching disabled during development
            </button>
            <p aria-live="polite" className="text-center text-xs text-slate-400">
              {validName && validSymbol
                ? "Preview details entered. No transaction has been created."
                : "Enter a name (up to 32 characters) and symbol (up to 10 characters) to preview details."}
            </p>
          </form>
        </section>

        <section className="mt-6 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <p className="text-sm text-slate-400">Planned launch fee</p>
            <p className="mt-1 text-2xl font-bold">0.02 SOL</p>
            <p className="mt-1 text-xs leading-5 text-slate-500">Proposed only; not collected on this preview.</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <p className="text-sm text-slate-400">Planned trading fee</p>
            <p className="mt-1 text-2xl font-bold">1%</p>
            <p className="mt-1 text-xs leading-5 text-slate-500">Not active until settlement and fee routing are tested.</p>
          </div>
        </section>

        <footer className="mt-8 border-t border-white/10 pt-5 text-sm leading-6 text-slate-500">
          Sunny Pad is under development. No token launches, trading, wallet
          connections, or on-chain fee collection are currently available.
        </footer>
      </div>
    </main>
  );
}
