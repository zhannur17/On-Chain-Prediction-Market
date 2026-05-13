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
};

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();

  const [markets, setMarkets] = useState<Market[]>([]);
  const [indexedMarkets, setIndexedMarkets] = useState<Market[]>([]);

  const isWrongNetwork = isConnected && chainId !== BASE_SEPOLIA_CHAIN_ID;

  useEffect(() => {
    setMounted(true);
    loadMarkets();
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
          params: [
            {
              chainId: "0x14A34",
              chainName: "Base Sepolia",
              nativeCurrency: {
                name: "ETH",
                symbol: "ETH",
                decimals: 18,
              },
              rpcUrls: ["https://sepolia.base.org"],
              blockExplorerUrls: ["https://sepolia.basescan.org"],
            },
          ],
        });
      } else {
        console.error("Failed to switch network:", error);
      }
    }
  };

  const loadMarkets = async () => {
    try {
      const provider = new ethers.JsonRpcProvider("https://sepolia.base.org");

      const factory = new ethers.Contract(
        CONTRACTS.MarketFactory,
        MarketFactoryABI,
        provider
      );

      const count = await factory.getMarketsCount();
      const loadedMarkets: Market[] = [];

      for (let i = Number(count) - 1; i < Number(count); i++){
        const marketAddress = await factory.markets(i);

        const market = new ethers.Contract(
          marketAddress,
          PredictionMarketABI,
          provider
        );

        const question = await market.question();
        const yesReserve = await market.yesReserve();
        const noReserve = await market.noReserve();
        const total = Number(yesReserve) + Number(noReserve);

        loadedMarkets.push({
          address: marketAddress,
          question,
          yesPrice: total > 0 ? (Number(noReserve) / total).toFixed(2) : "0.50",
          noPrice: total > 0 ? (Number(yesReserve) / total).toFixed(2) : "0.50",
        });
      }

      setMarkets(loadedMarkets);
    } catch (error) {
      console.error("Failed to load markets:", error);
    }
  };

  const loadIndexedMarkets = async () => {
    if (!SUBGRAPH_URL) return;

    try {
      const response = await fetch(SUBGRAPH_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
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

      const loadedIndexedMarkets: Market[] = result.data.markets.map(
        (market: any) => ({
          address: market.marketAddress,
          question: market.question,
          yesPrice: "Indexed",
          noPrice: "Indexed",
        })
      );

      setIndexedMarkets(loadedIndexedMarkets);
    } catch (error) {
      console.error("Failed to load indexed markets:", error);
    }
  };

  if (!mounted) return null;

  return (
    <main className="min-h-screen p-8">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">On-Chain Prediction Market</h1>

        {!isConnected ? (
          <button
            onClick={() => connect({ connector: injected() })}
            className="bg-black text-white px-4 py-2 rounded"
          >
            Connect Wallet
          </button>
        ) : (
          <div className="flex gap-4 items-center">
            <span className="text-sm truncate max-w-xs">{address}</span>
            <button
              onClick={() => disconnect()}
              className="bg-red-500 text-white px-4 py-2 rounded"
            >
              Disconnect
            </button>
          </div>
        )}
      </div>

      {isWrongNetwork && (
        <div className="mt-6 rounded border border-red-300 bg-red-50 p-4">
          <p className="text-red-700 font-medium">
            Wrong network. Please switch to Base Sepolia.
          </p>
          <button
            onClick={switchToBaseSepolia}
            className="mt-3 bg-black text-white px-4 py-2 rounded"
          >
            Switch to Base Sepolia
          </button>
        </div>
      )}

      <AccountInfo />
      <GovernancePanel />

      <section className="mt-12">
        <h2 className="text-xl font-semibold">Markets</h2>

        {markets.length === 0 ? (
          <p className="text-gray-500 mt-4">No markets yet.</p>
        ) : (
          <div className="grid gap-4 mt-4">
            {markets.map((market) => (
              <MarketCard
                key={market.address}
                address={market.address}
                question={market.question}
                yesPrice={market.yesPrice}
                noPrice={market.noPrice}
              />
            ))}
          </div>
        )}
      </section>

      <section className="mt-12">
        <h2 className="text-xl font-semibold">Indexed Markets from The Graph</h2>

        {indexedMarkets.length === 0 ? (
          <p className="text-gray-500 mt-4">
            No indexed markets yet or subgraph URL is not configured.
          </p>
        ) : (
          <div className="grid gap-4 mt-4">
            {indexedMarkets.map((market) => (
              <MarketCard
                key={market.address}
                address={market.address}
                question={market.question}
                yesPrice={market.yesPrice}
                noPrice={market.noPrice}
              />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}