"use client";

import { useState } from "react";
import { useWalletClient, usePublicClient } from "wagmi";
import { parseEther } from "viem";

import PredictionMarketABI from "../lib/abis/PredictionMarket.json";
import MockCollateralABI from "../lib/abis/MockCollateral.json";
import { CONTRACTS } from "../lib/contracts";

type MarketCardProps = {
  address: string;
  question: string;
  yesPrice: string;
  noPrice: string;
  category?: string;
  endDate?: string;
};

const CATEGORY_COLORS: Record<string, string> = {
  Sports: "bg-blue-500/15 text-blue-300 border-blue-500/30",
  Entertainment: "bg-pink-500/15 text-pink-300 border-pink-500/30",
  Crypto: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  Finance: "bg-teal-500/15 text-teal-300 border-teal-500/30",
  "On-Chain": "bg-indigo-500/15 text-indigo-300 border-indigo-500/30",
};

export default function MarketCard({
  address,
  question,
  yesPrice,
  noPrice,
  category,
  endDate,
}: MarketCardProps) {
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();

  const yesPercent = Math.round(parseFloat(yesPrice) * 100);
  const noPercent = Math.round(parseFloat(noPrice) * 100);

  const isStatic = address.startsWith("0x00000000000000000000000000000000000000");

  const handleBuy = async (outcome: "YES" | "NO") => {
    if (isStatic) {
      alert("This is a demo market. Connect a real market to trade.");
      return;
    }
    try {
      if (!walletClient) { alert("Please connect wallet."); return; }
      if (!amount || Number(amount) <= 0) { alert("Please enter a valid amount greater than 0."); return; }

      setLoading(true);
      const parsedAmount = parseEther(amount);
      const marketAddress = address as `0x${string}`;
      const collateralAddress = CONTRACTS.MockCollateral as `0x${string}`;

      const approveTx = await walletClient.writeContract({
        address: collateralAddress,
        abi: MockCollateralABI,
        functionName: "approve",
        args: [marketAddress, parsedAmount],
      });
      await publicClient!.waitForTransactionReceipt({ hash: approveTx });

      const buyTx = await walletClient.writeContract({
        address: marketAddress,
        abi: PredictionMarketABI,
        functionName: "buyShares",
        args: [outcome === "YES", parsedAmount, BigInt(0)],
        gas: BigInt(500000),
      });
      await publicClient!.waitForTransactionReceipt({ hash: buyTx });

      alert("Trade successful!");
      setAmount("");
    } catch (error: any) {
      console.error(error);
      const message = String(error?.shortMessage || error?.message || "");
      if (message.includes("User rejected") || message.includes("user rejected")) {
        alert("Transaction rejected in MetaMask."); return;
      }
      if (message.includes("MarketNotOpen")) { alert("Market is not open."); return; }
      if (message.includes("DeadlinePassed")) { alert("Market deadline has passed."); return; }
      if (message.includes("SlippageExceeded")) { alert("Slippage too high."); return; }
      alert("Transaction failed: " + message);
    } finally {
      setLoading(false);
    }
  };

  const categoryStyle = category ? (CATEGORY_COLORS[category] ?? "bg-white/10 text-zinc-300 border-white/10") : "";

  return (
    <div className="group relative bg-[#0e1424] border border-white/10 hover:border-indigo-500/40 transition-all duration-300 rounded-2xl p-5 flex flex-col gap-4 overflow-hidden">
      {/* Subtle background glow on hover */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none bg-indigo-500/5 rounded-2xl" />

      {/* Top row: category + end date */}
      <div className="flex items-center justify-between gap-2">
        {category && (
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${categoryStyle}`}>
            {category}
          </span>
        )}
        {endDate && (
          <span className="text-xs text-zinc-500 ml-auto">Ends {endDate}</span>
        )}
      </div>

      {/* Question */}
      <h3 className="text-base font-semibold text-white leading-snug">{question}</h3>

      {/* Probability bar */}
      <div className="space-y-1.5">
        <div className="h-2 rounded-full bg-white/10 overflow-hidden flex">
          <div
            className="h-full bg-emerald-500 transition-all duration-500"
            style={{ width: `${yesPercent}%` }}
          />
          <div
            className="h-full bg-rose-500 transition-all duration-500"
            style={{ width: `${noPercent}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-zinc-400">
          <span>YES {yesPercent}%</span>
          <span>NO {noPercent}%</span>
        </div>
      </div>

      {/* Price badges */}
      <div className="flex gap-3">
        <div className="flex-1 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-3 py-2 text-center">
          <p className="text-xs text-emerald-400/70 mb-0.5">YES</p>
          <p className="text-lg font-bold text-emerald-400">{yesPrice}</p>
        </div>
        <div className="flex-1 bg-rose-500/10 border border-rose-500/20 rounded-xl px-3 py-2 text-center">
          <p className="text-xs text-rose-400/70 mb-0.5">NO</p>
          <p className="text-lg font-bold text-rose-400">{noPrice}</p>
        </div>
      </div>

      {/* Amount input */}
      <input
        type="number"
        placeholder="Amount (ETH)"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        disabled={loading}
        className="bg-white/5 border border-white/10 focus:border-indigo-500/50 outline-none text-white placeholder:text-zinc-600 text-sm rounded-xl px-4 py-2.5 w-full transition-colors"
      />

      {/* Buttons */}
      <div className="flex gap-3">
        <button
          onClick={() => handleBuy("YES")}
          disabled={loading}
          className="flex-1 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed transition text-white text-sm font-semibold py-2.5 rounded-xl"
        >
          {loading ? "..." : "Buy YES"}
        </button>
        <button
          onClick={() => handleBuy("NO")}
          disabled={loading}
          className="flex-1 bg-rose-500 hover:bg-rose-400 disabled:opacity-50 disabled:cursor-not-allowed transition text-white text-sm font-semibold py-2.5 rounded-xl"
        >
          {loading ? "..." : "Buy NO"}
        </button>
      </div>
    </div>
  );
}
