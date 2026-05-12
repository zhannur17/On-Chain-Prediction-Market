"use client";

import { useState } from "react";

import { ethers } from "ethers";

import PredictionMarketABI from "../lib/abis/PredictionMarket.json";
import MockCollateralABI from "../lib/abis/MockCollateral.json";

import { CONTRACTS } from "../lib/contracts";

type MarketCardProps = {
  address: string;
  question: string;
  yesPrice: string;
  noPrice: string;
};

export default function MarketCard({
  address,
  question,
  yesPrice,
  noPrice,
}: MarketCardProps) {
  const [amount, setAmount] = useState("");

  const handleBuy = async (
    outcome: "YES" | "NO"
  ) => {
    try {
      if (!window.ethereum) {
        alert("Install MetaMask");
        return;
      }

      if (!amount) {
        alert("Enter amount first");
        return;
      }

      const provider =
        new ethers.BrowserProvider(window.ethereum);

      const signer = await provider.getSigner();

      const collateral = new ethers.Contract(
        CONTRACTS.MockCollateral,
        MockCollateralABI.abi,
        signer
      );

      const market = new ethers.Contract(
        address,
        PredictionMarketABI,
        signer
      );

      const parsedAmount =
        ethers.parseEther(amount);

      const approveTx = await collateral.approve(
        address,
        parsedAmount
      );

      await approveTx.wait();

      const tx = await market.buyShares(
        outcome === "YES",
        parsedAmount,
        0,
        {
          gasLimit: 500000,
        }
      );

      await tx.wait();

      alert("Trade successful");
    } catch (error) {
      console.error(error);

      alert("Transaction failed");
    }
  };

  return (
    <div className="border border-zinc-700 bg-[#0f1220] rounded-2xl p-6 shadow-sm mt-6">
      <h3 className="text-2xl font-bold text-white">
        {question}
      </h3>

      <div className="flex gap-4 mt-5">
        <div className="bg-green-100 text-green-900 px-4 py-2 rounded-xl font-semibold">
          YES: {yesPrice}
        </div>

        <div className="bg-red-100 text-red-900 px-4 py-2 rounded-xl font-semibold">
          NO: {noPrice}
        </div>
      </div>

      <input
        type="number"
        placeholder="Enter amount"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        className="mt-6 px-4 py-3 rounded-xl bg-zinc-900 border border-zinc-700 w-full text-white outline-none"
      />

      <div className="flex gap-4 mt-6">
        <button
          onClick={() => handleBuy("YES")}
          className="bg-green-500 hover:bg-green-600 transition text-white px-5 py-3 rounded-xl font-semibold"
        >
          Buy YES
        </button>

        <button
          onClick={() => handleBuy("NO")}
          className="bg-red-500 hover:bg-red-600 transition text-white px-5 py-3 rounded-xl font-semibold"
        >
          Buy NO
        </button>
      </div>
    </div>
  );
}