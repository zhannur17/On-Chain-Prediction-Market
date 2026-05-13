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

export default function MarketCard({ address, question, yesPrice, noPrice }: MarketCardProps) {
  const [amount, setAmount] = useState("");

  const handleBuy = async (outcome: "YES" | "NO") => {
    try {
      if (!window.ethereum) { alert("Please install MetaMask."); return; }
      if (!amount || Number(amount) <= 0) { alert("Please enter a valid amount greater than 0."); return; }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const network = await provider.getNetwork();
      if (Number(network.chainId) !== 84532) { alert("Wrong network. Please switch to Base Sepolia."); return; }

      const signer = await provider.getSigner();

      const collateral = new ethers.Contract(CONTRACTS.MockCollateral, MockCollateralABI, signer);
      const market = new ethers.Contract(address, PredictionMarketABI, signer);

      // Проверка состояния маркета
      const state = await market.state();
      if (Number(state) !== 0) {
        alert(`Market is not open (state: ${state}). Cannot buy shares.`);
        return;
      }

      const parsedAmount = ethers.parseEther(amount);

      const balance = await collateral.balanceOf(await signer.getAddress());
      if (balance < parsedAmount) { alert("Insufficient collateral balance."); return; }

      const approveTx = await collateral.approve(address, parsedAmount);
      await approveTx.wait();

      const tx = await market.buyShares(outcome === "YES", parsedAmount, 0, { gasLimit: 500000 });
      await tx.wait();

      alert("Trade successful.");
      setAmount("");
    } catch (error: any) {
      console.error(error);
      const message = String(error?.shortMessage || error?.message || "");

      if (error?.code === 4001 || message.toLowerCase().includes("user rejected")) {
        alert("Transaction rejected in MetaMask."); return;
      }
      if (message.includes("MarketNotOpen")) { alert("Market is not open."); return; }
      if (message.includes("DeadlinePassed")) { alert("Market deadline has passed."); return; }
      if (message.includes("SlippageExceeded")) { alert("Slippage too high. Try a smaller amount."); return; }
      if (message.includes("ZeroAmount")) { alert("Amount cannot be zero."); return; }

      alert("Transaction failed: " + (error?.shortMessage || message));
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