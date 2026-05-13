"use client";

import "@rainbow-me/rainbowkit/styles.css";

import { getDefaultConfig, RainbowKitProvider } from "@rainbow-me/rainbowkit";

import { WagmiProvider } from "wagmi";

import { baseSepolia } from "wagmi/chains";

import {
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";

const config = getDefaultConfig({
  appName: "On-Chain Prediction Market",

  projectId: "local",

  chains: [baseSepolia],

  ssr: false,
});

const queryClient = new QueryClient();

export function Providers({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}