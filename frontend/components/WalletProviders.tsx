"use client";

import { DAppKitProvider } from "@mysten/dapp-kit-react";
import { ConnectButton } from "@mysten/dapp-kit-react/ui";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { dAppKit } from "@/lib/dapp-kit";

// Cüzdanlar yalnızca tarayıcıda algılanır; bu dosya ssr:false ile yüklenir.
export function WalletProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () => new QueryClient({ defaultOptions: { queries: { refetchOnWindowFocus: true, retry: 1 } } }),
  );
  return (
    <QueryClientProvider client={queryClient}>
      <DAppKitProvider dAppKit={dAppKit}>{children}</DAppKitProvider>
    </QueryClientProvider>
  );
}

export function WalletButton() {
  return <ConnectButton>Cüzdan bağla</ConnectButton>;
}
