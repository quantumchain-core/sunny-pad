import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sunny Pad — Decentralized Launchpad on Solana",
  description: "Launch a meme coin in 10 seconds. 0.02 SOL launch, 1% trading fee (0.5% treasury + 0.5% creator/competition). Creator earns forever.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-black text-white antialiased">{children}</body>
    </html>
  );
}
