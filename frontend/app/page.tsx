"use client";

import { useEffect, useState } from "react";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { injected } from "wagmi/connectors";
import { ethers } from "ethers";

import MarketCard from "../components/MarketCard";

import { CONTRACTS } from "../lib/contracts";

import MarketFactoryABI from "../lib/abis/MarketFactory.json";
import PredictionMarketABI from "../lib/abis/PredictionMarket.json";

type Market = {
  address: string;
  question: string;
  yesPrice: string;
  noPrice: string;
};

export default function Home() {
  const [mounted, setMounted] = useState(false);

  const { address, isConnected } = useAccount();

  const { connect } = useConnect();

  const { disconnect } = useDisconnect();

  const [markets, setMarkets] = useState<Market[]>([]);

  useEffect(() => {
    setMounted(true);
    loadMarkets();
  }, []);

  const loadMarkets = async () => {
    try {
      const provider = new ethers.JsonRpcProvider(
        "http://127.0.0.1:8545"
      );

      const factory = new ethers.Contract(
        CONTRACTS.MarketFactory,
        MarketFactoryABI,
        provider
      );

      const count = await factory.getMarketsCount();

      const loadedMarkets: Market[] = [];

      for (let i = 0; i < Number(count); i++) {
        const marketAddress = await factory.markets(i);

        const market = new ethers.Contract(
          marketAddress,
          PredictionMarketABI,
          provider
        );

        const question = await market.question();

        const yesReserve = await market.yesReserve();

        const noReserve = await market.noReserve();

        const total =
          Number(yesReserve) + Number(noReserve);

        const yesPrice = (
          Number(yesReserve) / total
        ).toFixed(2);

        const noPrice = (
          Number(noReserve) / total
        ).toFixed(2);

        loadedMarkets.push({
          address: marketAddress,
          question,
          yesPrice,
          noPrice,
        });
      }

      setMarkets(loadedMarkets);
    } catch (error) {
      console.error(error);
    }
  };

  if (!mounted) {
    return null;
  }

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
        <h2 className="text-xl font-semibold">
          Markets
        </h2>

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
      </section>
    </main>
  );
}