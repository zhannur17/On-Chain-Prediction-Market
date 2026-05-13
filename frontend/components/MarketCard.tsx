"use client";

import { useState } from "react";
import { useWalletClient, usePublicClient } from "wagmi";
import { getContract, parseEther } from "viem";

import PredictionMarketABI from "../lib/abis/PredictionMarket.json";
import MockCollateralABI from "../lib/abis/MockCollateral.json";
import { CONTRACTS } from "../lib/contracts";

type MarketCardProps = {
  address: string;
  question: string;
  yesPrice: string;
  noPrice: string;
};

export default function MarketCard({ address, question, yesPrice, noPrice }: MarketCardProps) {
  const [amount, setAmount] = useState("");
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();

  const handleBuy = async (outcome: "YES" | "NO") => {
    try {
      if (!walletClient) { alert("Please connect wallet."); return; }
      if (!amount || Number(amount) <= 0) { alert("Please enter a valid amount greater than 0."); return; }

      const parsedAmount = parseEther(amount);
      const marketAddress = address as `0x${string}`;
      const collateralAddress = CONTRACTS.MockCollateral as `0x${string}`;

      // Approve
      const approveTx = await walletClient.writeContract({
        address: collateralAddress,
        abi: MockCollateralABI,
        functionName: "approve",
        args: [marketAddress, parsedAmount],
      });
      await publicClient!.waitForTransactionReceipt({ hash: approveTx });

      // Buy shares
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
    }
  };

  return (
    <div className="border border-zinc-700 bg-[#0f1220] rounded-2xl p-6 shadow-sm mt-6">
      <h3 className="text-2xl font-bold text-white">{question}</h3>
      <div className="flex gap-4 mt-5">
        <div className="bg-green-100 text-green-900 px-4 py-2 rounded-xl font-semibold">YES: {yesPrice}</div>
        <div className="bg-red-100 text-red-900 px-4 py-2 rounded-xl font-semibold">NO: {noPrice}</div>
      </div>
      <input
        type="number"
        placeholder="Enter amount"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        className="mt-6 px-4 py-3 rounded-xl bg-zinc-900 border border-zinc-700 w-full text-white outline-none"
      />
      <div className="flex gap-4 mt-6">
        <button onClick={() => handleBuy("YES")} className="bg-green-500 hover:bg-green-600 transition text-white px-5 py-3 rounded-xl font-semibold">Buy YES</button>
        <button onClick={() => handleBuy("NO")} className="bg-red-500 hover:bg-red-600 transition text-white px-5 py-3 rounded-xl font-semibold">Buy NO</button>
      </div>
    </div>
  );
}