import type { Metadata } from "next";
import "./globals.css";
import Providers from "./Providers";

export const metadata: Metadata = {
  title: "SunnyPad — Solana Meme Launchpad",
  description: "A creator-first Solana launchpad with transparent on-chain fees and bonding-curve trading.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body><Providers>{children}</Providers></body></html>;
}
