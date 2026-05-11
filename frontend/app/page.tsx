"use client";

import { useAccount, useConnect, useDisconnect } from "wagmi";
import { injected } from "wagmi/connectors";

import MarketCard from "../components/MarketCard";

export default function Home() {
  const { address, isConnected } = useAccount();

  const { connect } = useConnect();

  const { disconnect } = useDisconnect();

  return (
    <main className="min-h-screen p-8">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">
          On-Chain Prediction Market
        </h1>

        {!isConnected ? (
          <button
            onClick={() => connect({ connector: injected() })}
            className="bg-black text-white px-4 py-2 rounded"
          >
            Connect Wallet
          </button>
        ) : (
          <div className="flex gap-4 items-center">
            <span>{address}</span>

            <button
              onClick={() => disconnect()}
              className="bg-red-500 text-white px-4 py-2 rounded"
            >
              Disconnect
            </button>
          </div>
        )}
      </div>

      <section className="mt-12">
        <h2 className="text-xl font-semibold">Markets</h2>

        <MarketCard
          question="Will ETH be above $5000 by 2026?"
          yesPrice="0.62"
          noPrice="0.38"
        />
      </section>
    </main>
  );
}
