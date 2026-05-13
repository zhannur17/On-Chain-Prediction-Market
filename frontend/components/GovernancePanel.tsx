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
  stateNum: number;
};

const PROPOSAL_IDS = [
  "54069103013522879307255454744435564975878246852546706449003528263570595120437",
];

export default function GovernancePanel() {
  const { isConnected } = useAccount();
  const [proposals, setProposals] = useState<Proposal[]>([]);

  useEffect(() => {
    if (isConnected) loadProposals();
  }, [isConnected]);

  const loadProposals = async () => {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const governor = new ethers.Contract(CONTRACTS.PredictionGovernor, PredictionGovernorABI, provider);
      const loaded: Proposal[] = [];

      for (const proposalId of PROPOSAL_IDS) {
        const state = await governor.state(proposalId);
        loaded.push({
          id: proposalId,
          description: "Proposal #1: Demo governance proposal",
          state: getProposalState(Number(state)),
          stateNum: Number(state),
        });
      }

      setProposals(loaded);
    } catch (error) {
      console.error(error);
    }
  };

  const delegateToSelf = async () => {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const governanceToken = new ethers.Contract(CONTRACTS.GovernanceToken, GovernanceTokenABI, signer);
      const tx = await governanceToken.delegate(await signer.getAddress());
      await tx.wait();
      alert("Delegated to self");
      loadProposals();
    } catch (error) {
      console.error(error);
      alert("Delegation failed");
    }
  };

  const vote = async (proposalId: string, support: boolean) => {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const governor = new ethers.Contract(CONTRACTS.PredictionGovernor, PredictionGovernorABI, signer);
      const tx = await governor.castVote(proposalId, support ? 1 : 0);
      await tx.wait();
      alert("Vote submitted!");
      loadProposals();
    } catch (error) {
      console.error(error);
      alert("Voting failed");
    }
  };

  const queue = async (proposalId: string) => {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const governor = new ethers.Contract(CONTRACTS.PredictionGovernor, PredictionGovernorABI, signer);
      // descriptionHash для "Demo governance proposal"
      const descriptionHash = ethers.id("Demo governance proposal");
      const tx = await governor.queue([], [], [], descriptionHash);
      await tx.wait();
      alert("Proposal queued!");
      loadProposals();
    } catch (error) {
      console.error(error);
      alert("Queue failed");
    }
  };

  const execute = async (proposalId: string) => {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const governor = new ethers.Contract(CONTRACTS.PredictionGovernor, PredictionGovernorABI, signer);
      const descriptionHash = ethers.id("Demo governance proposal");
      const tx = await governor.execute([], [], [], descriptionHash);
      await tx.wait();
      alert("Proposal executed!");
      loadProposals();
    } catch (error) {
      console.error(error);
      alert("Execute failed");
    }
  };

  if (!isConnected) return null;

  return (
    <section className="mt-10 border border-zinc-700 bg-[#0f1220] rounded-2xl p-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">Governance</h2>
        <button onClick={delegateToSelf} className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-xl">
          Delegate to Self
        </button>
      </div>

      {proposals.length === 0 ? (
        <p className="text-zinc-400 mt-4">No proposals yet.</p>
      ) : (
        <div className="mt-6 grid gap-4">
          {proposals.map((proposal) => (
            <div key={proposal.id} className="border border-zinc-700 rounded-xl p-4">
              <h3 className="text-white font-semibold">{proposal.description}</h3>
              <p className="text-zinc-400 mt-2">State: {proposal.state}</p>

              <div className="flex gap-3 mt-4 flex-wrap">
                {proposal.stateNum === 1 && (
                  <>
                    <button onClick={() => vote(proposal.id, true)} className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-xl">
                      Vote For
                    </button>
                    <button onClick={() => vote(proposal.id, false)} className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-xl">
                      Vote Against
                    </button>
                  </>
                )}

                {/* Queue — только когда Succeeded */}
                {proposal.stateNum === 4 && (
                  <button onClick={() => queue(proposal.id)} className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-xl">
                    Queue
                  </button>
                )}

                {/* Execute — только когда Queued */}
                {proposal.stateNum === 5 && (
                  <button onClick={() => execute(proposal.id)} className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-xl">
                    Execute
                  </button>
                )}
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
    case 0: return "Pending";
    case 1: return "Active";
    case 2: return "Canceled";
    case 3: return "Defeated";
    case 4: return "Succeeded";
    case 5: return "Queued";
    case 6: return "Expired";
    case 7: return "Executed";
    default: return "Unknown";
  }
}