"use client";

import { useDAppKit } from "@mysten/dapp-kit-react";
import type { Transaction } from "@mysten/sui/transactions";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { extractAbortCode, friendlyError } from "@/lib/errors";

export type TxOutcome = { ok: boolean; abortCode: number | null };

type RunOptions = {
  pending: string;
  success: string;
  /** true dönerse hata kullanıcıya gösterilmez (ör. otomatik yeniden deneme yapılacaksa). */
  silentFailure?: (abortCode: number | null) => boolean;
};

export type TxStatus =
  | { state: "idle" }
  | { state: "pending"; label: string }
  | { state: "success"; label: string; digest: string }
  | { state: "error"; message: string };

/** İşlemi imzalatır, sonucu izler ve zincir verisini yeniler. */
export function useTx() {
  const dAppKit = useDAppKit();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<TxStatus>({ state: "idle" });

  const run = useCallback(
    async (tx: Transaction, labels: RunOptions): Promise<TxOutcome> => {
      setStatus({ state: "pending", label: labels.pending });
      const fail = (abortCode: number | null, message: string): TxOutcome => {
        if (labels.silentFailure?.(abortCode)) setStatus({ state: "idle" });
        else setStatus({ state: "error", message });
        return { ok: false, abortCode };
      };
      try {
        const result = await dAppKit.signAndExecuteTransaction({ transaction: tx });
        if (result.FailedTransaction) {
          const err = result.FailedTransaction.status.error;
          const code = err?.$kind === "MoveAbort" ? Number(err.MoveAbort.abortCode) : null;
          return fail(code, friendlyError(err?.message ?? "", code));
        }
        const digest = result.Transaction.digest;
        await dAppKit.getClient().core.waitForTransaction({ digest }).catch(() => undefined);
        setStatus({ state: "success", label: labels.success, digest });
        await queryClient.invalidateQueries();
        return { ok: true, abortCode: null };
      } catch (error) {
        const text = error instanceof Error ? error.message : String(error ?? "");
        return fail(extractAbortCode(text), friendlyError(error));
      }
    },
    [dAppKit, queryClient],
  );

  const reset = useCallback(() => setStatus({ state: "idle" }), []);
  return { run, status, reset, busy: status.state === "pending" };
}
