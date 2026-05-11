"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";

export default function Home() {
  return (
    <main className="min-h-screen p-8">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">On-Chain Prediction Market</h1>
        <ConnectButton />
      </div>

      <section className="mt-12">
        <h2 className="text-xl font-semibold">Markets</h2>
        <p className="mt-2 text-gray-600">
          Wallet connection is ready. Market UI will be added next.
        </p>
      </section>
    </main>
  );
}