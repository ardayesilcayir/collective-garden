"use client";

interface TxStatusBannerProps {
  status: "idle" | "pending" | "success" | "error";
  message: string;
  digest?: string;
  onDismiss?: () => void;
}

export default function TxStatusBanner({ status, message, digest, onDismiss }: TxStatusBannerProps) {
  if (status === "idle") return null;

  const styles = {
    pending: "bg-yellow-900 border-yellow-600 text-yellow-200",
    success: "bg-emerald-900 border-emerald-600 text-emerald-200",
    error: "bg-red-900 border-red-600 text-red-200",
  };

  const icons = {
    pending: "⏳",
    success: "✅",
    error: "❌",
  };

  return (
    <div className={`border rounded-lg p-3 flex items-start gap-2 ${styles[status]}`}>
      <span className="text-lg">{icons[status]}</span>
      <div className="flex-1 text-sm">
        <p>{message}</p>
        {digest && (
          <a
            href={`https://suiscan.xyz/testnet/tx/${digest}`}
            target="_blank"
            rel="noreferrer"
            className="underline opacity-70 hover:opacity-100 text-xs mt-1 block"
          >
            Explorer&apos;da görüntüle ↗
          </a>
        )}
      </div>
      {onDismiss && status !== "pending" && (
        <button onClick={onDismiss} className="opacity-60 hover:opacity-100 text-sm">
          ✕
        </button>
      )}
    </div>
  );
}

