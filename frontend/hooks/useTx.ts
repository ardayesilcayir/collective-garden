"use client";

import { useState } from "react";

interface TxStatus {
  status: "idle" | "pending" | "success" | "error";
  message: string;
  digest?: string;
}

interface UseTxResult {
  txStatus: TxStatus;
  execute: (fn: () => Promise<string>) => Promise<void>;
  reset: () => void;
}

export function useTx(): UseTxResult {
  const [txStatus, setTxStatus] = useState<TxStatus>({ status: "idle", message: "" });

  const execute = async (fn: () => Promise<string>) => {
    setTxStatus({ status: "pending", message: "İşlem gönderiliyor…" });
    try {
      const digest = await fn();
      setTxStatus({
        status: "success",
        message: "İşlem başarılı!",
        digest,
      });
    } catch (e: unknown) {
      const msg = parseContractError(e);
      setTxStatus({ status: "error", message: msg });
    }
  };

  const reset = () => setTxStatus({ status: "idle", message: "" });

  return { txStatus, execute, reset };
}

// Kontrat abort kodlarını anlaşılır mesajlara çevir
function parseContractError(e: unknown): string {
  const str = String(e);
  if (str.includes("ECooldownNotElapsed") || str.includes("MoveAbort") && str.includes("1"))
    return "Cooldown süresi henüz dolmadı. Lütfen bekleyin.";
  if (str.includes("ENotMatured") || str.includes("MoveAbort") && str.includes("2"))
    return "Bahçe henüz olgunlaşmadı.";
  if (str.includes("EAlreadyClaimed") || str.includes("MoveAbort") && str.includes("3"))
    return "Bu bahçeden zaten ödül çektiniz.";
  if (str.includes("ENoContribution") || str.includes("MoveAbort") && str.includes("4"))
    return "Bu bahçede katkınız bulunmuyor.";
  if (str.includes("EAlreadyMatured") || str.includes("MoveAbort") && str.includes("5"))
    return "Bahçe zaten olgunlaşmış, sulama kabul edilmiyor.";
  if (str.includes("InsufficientGas") || str.includes("gas"))
    return "Yetersiz SUI bakiyesi. Faucet'ten SUI alın.";
  if (str.includes("Cüzdan bağlı değil"))
    return "Lütfen önce cüzdanınızı bağlayın.";
  return `Hata: ${str.slice(0, 120)}`;
}

