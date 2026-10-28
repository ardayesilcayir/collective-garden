"use client";

import { useWallet } from "@/lib/wallet";
import { shortenAddress } from "@/lib/constants";

export default function WalletButton() {
  const { address, connected, connecting, connect, disconnect } = useWallet();

  if (connected && address) {
    return (
      <div className="flex items-center gap-3">
        <span className="text-sm text-emerald-400 font-mono bg-gray-800 px-3 py-1 rounded-full">
          🟢 {shortenAddress(address)}
        </span>
        <button
          onClick={disconnect}
          className="text-sm text-gray-400 hover:text-red-400 transition-colors"
        >
          Çıkış
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={connect}
      disabled={connecting}
      className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold px-4 py-2 rounded-lg transition-colors"
    >
      {connecting ? "Bağlanıyor…" : "Cüzdanı Bağla"}
    </button>
  );
}

