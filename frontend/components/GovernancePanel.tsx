"use client";

import { useEffect, useState } from "react";
import { ethers } from "ethers";
import { useAccount } from "wagmi";

import { CONTRACTS } from "../lib/contracts";

import GovernanceTokenABI from "../lib/abis/GovernanceToken.json";
import PredictionGovernorABI from "../lib/abis/PredictionGovernor.json";

type Proposal = {
  id: string;
  description: string;
  state: string;
};

const PROPOSAL_IDS = [
  "80268601578126344581279231529372598173974493326949254733823214190979497332081",
];

export default function GovernancePanel() {
  const { isConnected } = useAccount();
  const [proposals, setProposals] = useState<Proposal[]>([]);

  useEffect(() => {
    if (isConnected) {
      loadProposals();
    }
  }, [isConnected]);

  const loadProposals = async () => {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);

      const governor = new ethers.Contract(
        CONTRACTS.PredictionGovernor,
        PredictionGovernorABI,
        provider
      );

      const loaded: Proposal[] = [];

      for (const proposalId of PROPOSAL_IDS) {
        const state = await governor.state(proposalId);

        loaded.push({
          id: proposalId,
          description: "Proposal #1: Demo governance proposal",
          state: getProposalState(Number(state)),
        });
      }

      setProposals(loaded);
    } catch (error) {
      console.error(error);
    }
  };

  const vote = async (proposalId: string, support: boolean) => {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      const governor = new ethers.Contract(
        CONTRACTS.PredictionGovernor,
        PredictionGovernorABI,
        signer
      );

      const tx = await governor.castVote(proposalId, support ? 1 : 0);
      await tx.wait();

      alert("Vote submitted");
      loadProposals();
    } catch (error) {
      console.error(error);
      alert("Voting failed");
    }
  };

  const delegateToSelf = async () => {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      const governanceToken = new ethers.Contract(
        CONTRACTS.GovernanceToken,
        GovernanceTokenABI,
        signer
      );

      const signerAddress = await signer.getAddress();
      const tx = await governanceToken.delegate(signerAddress);

      await tx.wait();

      alert("Delegated to self");
      loadProposals();
    } catch (error) {
      console.error(error);
      alert("Delegation failed");
    }
  };

  if (!isConnected) return null;

  return (
    <section className="mt-10 border border-zinc-700 bg-[#0f1220] rounded-2xl p-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">Governance</h2>

        <button
          onClick={delegateToSelf}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-xl"
        >
          Delegate to Self
        </button>
      </div>

      {proposals.length === 0 ? (
        <p className="text-zinc-400 mt-4">No proposals yet.</p>
      ) : (
        <div className="mt-6 grid gap-4">
          {proposals.map((proposal) => (
            <div
              key={proposal.id}
              className="border border-zinc-700 rounded-xl p-4"
            >
              <h3 className="text-white font-semibold">
                {proposal.description}
              </h3>

              <p className="text-zinc-400 mt-2">State: {proposal.state}</p>

              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => vote(proposal.id, true)}
                  className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-xl"
                >
                  Vote For
                </button>

                <button
                  onClick={() => vote(proposal.id, false)}
                  className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-xl"
                >
                  Vote Against
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function getProposalState(state: number) {
  switch (state) {
    case 0:
      return "Pending";
    case 1:
      return "Active";
    case 2:
      return "Canceled";
    case 3:
      return "Defeated";
    case 4:
      return "Succeeded";
    case 5:
      return "Queued";
    case 6:
      return "Expired";
    case 7:
      return "Executed";
    default:
      return "Unknown";
  }
}