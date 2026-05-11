"use client";

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
  const handleBuy = (outcome: "YES" | "NO") => {
    alert(`Buy ${outcome} clicked. Contract transaction will be connected next.`);
  };

  return (
    <div className="border rounded-xl p-6 shadow-sm mt-6">
      <h3 className="text-xl font-semibold">{question}</h3>

      <div className="flex gap-4 mt-4">
        <div className="bg-green-100 px-4 py-2 rounded-lg">
          YES: {yesPrice}
        </div>

        <div className="bg-red-100 px-4 py-2 rounded-lg">
          NO: {noPrice}
        </div>
      </div>

      <div className="flex gap-4 mt-6">
        <button
          onClick={() => handleBuy("YES")}
          className="bg-green-500 text-white px-4 py-2 rounded-lg"
        >
          Buy YES
        </button>

        <button
          onClick={() => handleBuy("NO")}
          className="bg-red-500 text-white px-4 py-2 rounded-lg"
        >
          Buy NO
        </button>
      </div>
    </div>
  );
}
