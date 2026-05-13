"use client";

import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { ethers } from "ethers";

import { CONTRACTS } from "../lib/contracts";
import MockCollateralABI from "../lib/abis/MockCollateral.json";
import GovernanceTokenABI from "../lib/abis/GovernanceToken.json";

export default function AccountInfo() {
  const { address, isConnected } = useAccount();

  const [collateralBalance, setCollateralBalance] = useState("0");
  const [votingPower, setVotingPower] = useState("0");
  const [delegateAddress, setDelegateAddress] = useState("");

  useEffect(() => {
    if (isConnected && address) {
      loadAccountInfo();
    }
  }, [isConnected, address]);

  const loadAccountInfo = async () => {
    try {
      const provider = new ethers.JsonRpcProvider("https://sepolia.base.org");

      const collateral = new ethers.Contract(
        CONTRACTS.MockCollateral,
        MockCollateralABI.abi,
        provider
      );

      const governanceToken = new ethers.Contract(
        CONTRACTS.GovernanceToken,
        GovernanceTokenABI,
        provider
      );

      const collateralRaw = await collateral.balanceOf(address);
      const votesRaw = await governanceToken.getVotes(address);
      const delegate = await governanceToken.delegates(address);

      setCollateralBalance(ethers.formatEther(collateralRaw));
      setVotingPower(ethers.formatEther(votesRaw));
      setDelegateAddress(delegate);
    } catch (error) {
      console.error("Failed to load account info:", error);
    }
  };

  if (!isConnected) return null;

  return (
    <section className="mt-8 rounded-2xl border border-zinc-700 bg-[#0f1220] p-6">
      <h2 className="text-xl font-semibold text-white">Account Info</h2>

      <div className="mt-4 grid gap-3 text-sm text-zinc-200">
        <p>
          <span className="font-semibold">Collateral Balance:</span>{" "}
          {Number(collateralBalance).toFixed(4)}
        </p>

        <p>
          <span className="font-semibold">Voting Power:</span>{" "}
          {Number(votingPower).toFixed(4)}
        </p>

        <p className="break-all">
          <span className="font-semibold">Delegate Address:</span>{" "}
          {delegateAddress}
        </p>
      </div>
    </section>
  );
}