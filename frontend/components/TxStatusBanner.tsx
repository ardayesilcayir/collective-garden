import { EXPLORER_URL } from "@/lib/config";
import type { TxStatus } from "@/hooks/useTx";

export function TxStatusBanner({ status, onClose }: { status: TxStatus; onClose: () => void }) {
  if (status.state === "idle") return null;

  const styles = {
    pending: "border-water/40 bg-water-soft",
    success: "border-leaf/50 bg-leaf/10",
    error: "border-danger/50 bg-danger/10",
  }[status.state];

  return (
    <div role="status" aria-live="polite" className={`flex items-start gap-3 rounded-xl border px-4 py-3 ${styles}`}>
      <div className="flex-1 text-[15px]">
        {status.state === "pending" && (
          <p className="flex items-center gap-2">
            <span className="size-3 animate-spin rounded-full border-2 border-water border-t-transparent" />
            {status.label} Cüzdanından onaylaman bekleniyor.
          </p>
        )}
        {status.state === "success" && (
          <p>
            {status.label}{" "}
            <a
              className="underline underline-offset-2"
              href={`${EXPLORER_URL}/tx/${status.digest}`}
              target="_blank"
              rel="noreferrer"
            >
              İşlemi explorer&apos;da gör
            </a>
          </p>
        )}
        {status.state === "error" && <p className="text-danger">{status.message}</p>}
      </div>
      {status.state !== "pending" && (
        <button onClick={onClose} className="text-ink-soft hover:text-ink" aria-label="Kapat">
          ✕
        </button>
      )}
    </div>
  );
}
