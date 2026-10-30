"use client";

import dynamic from "next/dynamic";
import type { ReactNode } from "react";

const WalletProviders = dynamic(
  () => import("./WalletProviders").then((m) => m.WalletProviders),
  {
    ssr: false,
    loading: () => (
      <div className="grid min-h-[60vh] place-items-center text-ink-soft">Bahçe hazırlanıyor…</div>
    ),
  },
);

export const WalletButton = dynamic(
  () => import("./WalletProviders").then((m) => m.WalletButton),
  { ssr: false, loading: () => <span className="h-10 w-36 rounded-full bg-mist" aria-hidden /> },
);

export function Providers({ children }: { children: ReactNode }) {
  return <WalletProviders>{children}</WalletProviders>;
}
