export default function Home() {
  return (
    <main className="min-h-screen bg-black text-white p-8">
      <h1 className="text-4xl font-bold">Sunny Pad 🌞</h1>
      <p className="mt-2 text-zinc-400">Launch meme coin in 10 seconds. Creator earns forever.</p>
      
      <div className="mt-8 grid grid-cols-3 gap-4 max-w-2xl">
        <div className="border border-zinc-800 p-4 rounded">Launch: 0.02 SOL<br/><span className="text-xs text-zinc-500">0.01 treasury + 0.01 rent</span></div>
        <div className="border border-zinc-800 p-4 rounded">Trading: 1% total<br/><span className="text-xs text-zinc-500">0.5% treasury + 0.5% creator/competition</span></div>
        <div className="border border-zinc-800 p-4 rounded">Creator: Auto on-chain<br/><span className="text-xs text-zinc-500">Every trade</span></div>
      </div>

      <div className="mt-12 text-sm text-zinc-500">
        Program: SunnyPad111... | Verified on Solscan | MIT License<br/>
        Live: sunnypad.fun | No KYC | Non-custodial
      </div>
    </main>
  );
}
