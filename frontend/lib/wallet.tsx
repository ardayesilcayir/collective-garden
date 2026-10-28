"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { SuiClient, getFullnodeUrl } from "@mysten/sui/client";
import { NETWORK } from "./constants";

// ─── Sui istemcisi ─────────────────────────────────────────────────────────────

export const suiClient = new SuiClient({ url: getFullnodeUrl(NETWORK) });

// ─── Cüzdan Context ────────────────────────────────────────────────────────────

interface WalletContextType {
  address: string | null;
  connected: boolean;
  connecting: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  signAndExecuteTransaction: (txBytes: Uint8Array) => Promise<string>;
}

const WalletContext = createContext<WalletContextType>({
  address: null,
  connected: false,
  connecting: false,
  connect: async () => {},
  disconnect: () => {},
  signAndExecuteTransaction: async () => "",
});

// Sui cüzdan standart arayüzü (window.suiWallet veya EIP-1193 benzeri)
declare global {
  interface Window {
    suiWallet?: {
      requestPermissions: () => Promise<{ accounts: { address: string }[] }>;
      getAccounts: () => Promise<{ address: string }[]>;
      signAndExecuteTransaction: (params: {
        transactionBlock: string;
        options?: object;
      }) => Promise<{ digest: string }>;
      disconnect?: () => void;
    };
    // Slush / Sui Wallet browser ext
    slush?: Window["suiWallet"];
  }
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);

  // Sayfa yüklenince önceki bağlantıyı kontrol et
  useEffect(() => {
    const saved = localStorage.getItem("wallet_address");
    if (saved) setAddress(saved);
  }, []);

  const getWallet = () => window.suiWallet ?? window.slush ?? null;

  const connect = async () => {
    const wallet = getWallet();
    if (!wallet) {
      alert("Sui cüzdanı bulunamadı. Lütfen Slush veya Sui Wallet eklentisini yükleyin.");
      return;
    }
    setConnecting(true);
    try {
      const res = await wallet.requestPermissions();
      const addr = res.accounts[0]?.address ?? null;
      setAddress(addr);
      if (addr) localStorage.setItem("wallet_address", addr);
    } catch (e) {
      console.error("Cüzdan bağlantısı reddedildi:", e);
    } finally {
      setConnecting(false);
    }
  };

  const disconnect = () => {
    const wallet = getWallet();
    wallet?.disconnect?.();
    setAddress(null);
    localStorage.removeItem("wallet_address");
  };

  const signAndExecuteTransaction = async (txBytes: Uint8Array): Promise<string> => {
    const wallet = getWallet();
    if (!wallet || !address) throw new Error("Cüzdan bağlı değil");
    const b64 = Buffer.from(txBytes).toString("base64");
    const result = await wallet.signAndExecuteTransaction({
      transactionBlock: b64,
      options: { showEffects: true },
    });
    return result.digest;
  };

  return (
    <WalletContext.Provider
      value={{
        address,
        connected: !!address,
        connecting,
        connect,
        disconnect,
        signAndExecuteTransaction,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  return useContext(WalletContext);
}

