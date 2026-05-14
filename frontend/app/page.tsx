"use client";

import { useEffect, useState } from "react";
import { useAccount, useChainId, useConnect, useDisconnect } from "wagmi";
import { injected } from "wagmi/connectors";
import { ethers } from "ethers";

import MarketCard from "../components/MarketCard";
import { CONTRACTS, BASE_SEPOLIA_CHAIN_ID } from "../lib/contracts";
import { SUBGRAPH_URL } from "../lib/subgraph";
import MarketFactoryABI from "../lib/abis/MarketFactory.json";
import PredictionMarketABI from "../lib/abis/PredictionMarket.json";
import AccountInfo from "../components/AccountInfo";
import GovernancePanel from "../components/GovernancePanel";

type Market = {
  address: string;
  question: string;
  yesPrice: string;
  noPrice: string;
  category?: string;
  endDate?: string;
};

const STATIC_MARKETS: Market[] = [
  {
    address: "0x0000000000000000000000000000000000000001",
    question: "Will LeBron James retire before the next NBA season?",
    yesPrice: "0.32",
    noPrice: "0.68",
    category: "Sports",
    endDate: "Sep 30, 2025",
  },
  {
    address: "0x0000000000000000000000000000000000000002",
    question: "Will MrBeast get married before December 31, 2025?",
    yesPrice: "0.14",
    noPrice: "0.86",
    category: "Entertainment",
    endDate: "Dec 31, 2025",
  },
  {
    address: "0x0000000000000000000000000000000000000003",
    question: "Will Bitcoin reach $150,000 before the end of 2025?",
    yesPrice: "0.47",
    noPrice: "0.53",
    category: "Crypto",
    endDate: "Dec 31, 2025",
  },
  {
    address: "0x0000000000000000000000000000000000000004",
    question: "Will the US Federal Reserve cut rates 3+ times in 2025?",
    yesPrice: "0.29",
    noPrice: "0.71",
    category: "Finance",
    endDate: "Dec 31, 2025",
  },
];

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();
  const [onchainMarket, setOnchainMarket] = useState<Market | null>(null);
  const [indexedMarkets, setIndexedMarkets] = useState<Market[]>([]);
  const isWrongNetwork = isConnected && chainId !== BASE_SEPOLIA_CHAIN_ID;

  useEffect(() => {
    setMounted(true);
    loadMarket();
    loadIndexedMarkets();
  }, []);

  const switchToBaseSepolia = async () => {
    if (!window.ethereum) return;
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: "0x14A34" }],
      });
    } catch (error: any) {
      if (error.code === 4902) {
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [{
            chainId: "0x14A34",
            chainName: "Base Sepolia",
            nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
            rpcUrls: ["https://sepolia.base.org"],
            blockExplorerUrls: ["https://sepolia.basescan.org"],
          }],
        });
      }
    }
  };

  const loadMarket = async () => {
    try {
      const provider = new ethers.JsonRpcProvider("https://sepolia.base.org");
      const factory = new ethers.Contract(CONTRACTS.MarketFactory, MarketFactoryABI, provider);
      const count = await factory.getMarketsCount();
      if (Number(count) === 0) return;

      const marketAddress = await factory.markets(Number(count) - 1);
      const m = new ethers.Contract(marketAddress, PredictionMarketABI, provider);
      const question = await m.question();
      const yesReserve = await m.yesReserve();
      const noReserve = await m.noReserve();
      const total = Number(yesReserve) + Number(noReserve);

      setOnchainMarket({
        address: marketAddress,
        question,
        yesPrice: total > 0 ? (Number(noReserve) / total).toFixed(2) : "0.50",
        noPrice: total > 0 ? (Number(yesReserve) / total).toFixed(2) : "0.50",
        category: "On-Chain",
      });
    } catch (error) {
      console.error("Failed to load market:", error);
    }
  };

  const loadIndexedMarkets = async () => {
    if (!SUBGRAPH_URL) return;
    try {
      const response = await fetch(SUBGRAPH_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: `
            {
              markets(first: 10, orderBy: createdAt, orderDirection: desc) {
                id
                marketAddress
                question
                endTime
                createdAt
              }
            }
          `,
        }),
      });
      const result = await response.json();
      const loaded: Market[] = result.data.markets.map((m: any) => ({
        address: m.marketAddress,
        question: m.question,
        yesPrice: "0.50",
        noPrice: "0.50",
        category: "The Graph",
      }));
      setIndexedMarkets(loaded);
    } catch (error) {
      console.error("Failed to load indexed markets:", error);
    }
  };

  if (!mounted) return null;

  const allMarkets: Market[] = [
    ...STATIC_MARKETS,
    ...(onchainMarket ? [onchainMarket] : []),
  ];

  return (
    <main className="min-h-screen bg-[#080c18] text-white">
      {/* Header */}
      <header className="border-b border-white/10 px-8 py-5 flex justify-between items-center sticky top-0 z-10 backdrop-blur bg-[#080c18]/80">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center text-sm font-bold">P</div>
          <span className="font-semibold tracking-tight text-lg">Predict</span>
        </div>

        {!isConnected ? (
          <button
            onClick={() => connect({ connector: injected() })}
            className="bg-indigo-600 hover:bg-indigo-500 transition text-white text-sm font-semibold px-4 py-2 rounded-xl"
          >
            Connect Wallet
          </button>
        ) : (
          <div className="flex gap-3 items-center">
            <span className="text-xs text-zinc-400 bg-white/5 px-3 py-1.5 rounded-lg font-mono truncate max-w-[140px]">
              {address}
            </span>
            <button
              onClick={() => disconnect()}
              className="text-sm text-red-400 hover:text-red-300 border border-red-500/30 hover:border-red-400/50 transition px-3 py-1.5 rounded-lg"
            >
              Disconnect
            </button>
          </div>
        )}
      </header>

      {isWrongNetwork && (
        <div className="mx-8 mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-4 flex items-center justify-between">
          <p className="text-red-400 text-sm font-medium">Wrong network — please switch to Base Sepolia.</p>
          <button
            onClick={switchToBaseSepolia}
            className="bg-red-500 hover:bg-red-400 transition text-white text-sm font-semibold px-4 py-2 rounded-lg"
          >
            Switch Network
          </button>
        </div>
      )}

      <div className="px-8 py-10 max-w-5xl mx-auto">
        <AccountInfo />
        <GovernancePanel />

        {/* Hero */}
        <div className="mb-10">
          <h1 className="text-4xl font-bold tracking-tight">Prediction Markets</h1>
          <p className="text-zinc-400 mt-2 text-base">
            Trade on real-world outcomes. Prices reflect crowd probability.
          </p>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-3 gap-4 mb-10">
          {[
            { label: "Open Markets", value: allMarkets.length.toString() },
            { label: "Total Volume", value: "$1.2M" },
            { label: "Active Traders", value: "3,241" },
          ].map(({ label, value }) => (
            <div key={label} className="bg-white/5 border border-white/10 rounded-2xl p-4">
              <p className="text-xs text-zinc-500 uppercase tracking-widest mb-1">{label}</p>
              <p className="text-2xl font-bold">{value}</p>
            </div>
          ))}
        </div>

        {/* Markets grid */}
        <section className="mb-14">
          <h2 className="text-xl font-semibold mb-5">Markets</h2>
          {allMarkets.length === 0 ? (
            <p className="text-zinc-500">No markets yet.</p>
          ) : (
            <div className="grid gap-5 md:grid-cols-2">
              {allMarkets.map((m) => (
                <MarketCard
                  key={m.address}
                  address={m.address}
                  question={m.question}
                  yesPrice={m.yesPrice}
                  noPrice={m.noPrice}
                  category={m.category}
                  endDate={m.endDate}
                />
              ))}
            </div>
          )}
        </section>

        {/* The Graph section — restored */}
        <section>
          <h2 className="text-xl font-semibold mb-5">Indexed Markets from The Graph</h2>
          {indexedMarkets.length === 0 ? (
            <p className="text-zinc-500">
              No indexed markets yet or subgraph URL is not configured.
            </p>
          ) : (
            <div className="grid gap-5 md:grid-cols-2">
              {indexedMarkets.map((m) => (
                <MarketCard
                  key={m.address}
                  address={m.address}
                  question={m.question}
                  yesPrice={m.yesPrice}
                  noPrice={m.noPrice}
                  category={m.category}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
