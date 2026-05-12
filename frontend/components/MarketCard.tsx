"use client";

import { useState } from "react";

type MarketCardProps = {
  question: string;
  yesPrice: string;
  noPrice: string;
};

export default function MarketCard({
  question,
  yesPrice,
  noPrice,
}: MarketCardProps) {
  const [amount, setAmount] = useState("");

  const handleBuy = (outcome: "YES" | "NO") => {
    if (!amount) {
      alert("Enter amount first");
      return;
    }

    alert(
      `Buy ${outcome} clicked with amount ${amount}. Contract transaction will be connected next.`
    );
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