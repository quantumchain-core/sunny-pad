"use client";
import { useState } from "react";

export default function Home() {
  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center p-6">
      <div className="max-w-2xl w-full">
        <h1 className="text-5xl font-black mt-10">Sunny Pad ☀️</h1>
        <p className="text-xl text-gray-400 mt-3">Launch meme coin in 10 seconds. Creator earns forever.</p>
        
        <div className="bg-[#1a1a1a] border border-yellow-500/20 rounded-2xl p-6 mt-8">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>Launch: <b>0.02 SOL</b><br/><span className="text-gray-400">0.01 treasury + 0.01 rent</span></div>
            <div>Trading: <b>1% total</b><br/><span className="text-gray-400">0.5% treasury + 0.5% creator</span></div>
          </div>
          <div className="mt-4 text-sm text-gray-300">Creator: Auto on-chain every trade • Program: SunnyPad111... • Verified</div>
        </div>

        <div className="bg-white text-black rounded-2xl p-6 mt-6">
          <h2 className="font-bold text-lg">Launch Your Meme</h2>
          <input value={name} onChange={e=>setName(e.target.value)} placeholder="Token Name (e.g. Sunny Dog)" className="w-full border rounded-xl p-3 mt-3" />
          <input value={symbol} onChange={e=>setSymbol(e.target.value)} placeholder="Symbol (e.g. SDOG)" className="w-full border rounded-xl p-3 mt-3" />
          <input type="file" className="w-full border rounded-xl p-3 mt-3" />
          <button className="w-full bg-yellow-400 hover:bg-yellow-300 text-black font-black py-4 rounded-xl mt-4 text-lg">
            Launch - 0.02 SOL ☀️
          </button>
          <p className="text-xs text-gray-500 mt-2 text-center">Live: sunnypad.fun | No KYC | Non-custodial | MIT</p>
        </div>

        <div className="text-center mt-8 text-gray-500 text-sm">
          Fees go on-chain to vault.rs • bonding_curve.rs • lib.rs
        </div>
      </div>
    </main>
  );
      }
