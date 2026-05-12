"use client";

import { useAccount, useConnect, useDisconnect, useChainId } from "wagmi";
import { injected } from "wagmi/connectors";

import MarketCard from "../components/MarketCard";

export default function Home() {
  const { address, isConnected } = useAccount();

  const { connect } = useConnect();

  const { disconnect } = useDisconnect();

  const chainId = useChainId();

  const shortAddress = address
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : "";

  return (
    <main className="min-h-screen bg-[#050816] text-white">
      <header className="border-b border-white/10 bg-[#0d1025]">
        <div className="max-w-7xl mx-auto px-8 py-6 flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-purple-400">
              On-Chain Prediction Market
            </h1>

            <p className="text-gray-400 mt-2">
              Decentralized prediction protocol powered by Solidity
            </p>
          </div>

          {!isConnected ? (
            <button
              onClick={() => connect({ connector: injected() })}
              className="bg-purple-600 hover:bg-purple-500 transition px-6 py-3 rounded-xl font-semibold shadow-lg"
            >
              Connect Wallet
            </button>
          ) : (
            <div className="flex items-center gap-4">
              <div className="bg-[#171b34] border border-white/10 px-4 py-2 rounded-xl">
                <p className="text-sm text-gray-400">Network</p>
                <p className="font-semibold">
                  Chain ID: {chainId}
                </p>
              </div>

              <div className="bg-[#171b34] border border-white/10 px-4 py-2 rounded-xl">
                <p className="text-sm text-gray-400">Wallet</p>
                <p className="font-semibold text-cyan-400">
                  {shortAddress}
                </p>
              </div>

              <button
                onClick={() => disconnect()}
                className="bg-red-500 hover:bg-red-400 transition px-4 py-2 rounded-xl font-semibold"
              >
                Disconnect
              </button>
            </div>
          )}
        </div>
      </header>

      <section className="max-w-7xl mx-auto px-8 py-12">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold">
              Prediction Markets
            </h2>

            <p className="text-gray-400 mt-2">
              Trade tokenized outcome shares using AMM pricing
            </p>
          </div>

          <div className="bg-[#171b34] border border-white/10 px-5 py-3 rounded-xl">
            <p className="text-gray-400 text-sm">
              Protocol Status
            </p>

            <p className="text-green-400 font-semibold">
              Active
            </p>
          </div>
        </div>

        <MarketCard
          question="Will ETH be above $5000 by 2026?"
          yesPrice="62"
          noPrice="38"
        />
      </section>
    </main>
  );
}
``