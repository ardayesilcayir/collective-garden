import { MIST_PER_SUI } from "./config";

export function shortAddress(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

/** MIST → "1.25" biçiminde SUI metni (en fazla 4 ondalık). */
export function formatSui(mist: bigint, decimals = 4) {
  const whole = mist / MIST_PER_SUI;
  const frac = mist % MIST_PER_SUI;
  if (frac === 0n) return whole.toLocaleString("tr-TR");
  const fracStr = frac.toString().padStart(9, "0").slice(0, decimals).replace(/0+$/, "");
  return fracStr ? `${whole.toLocaleString("tr-TR")},${fracStr}` : whole.toLocaleString("tr-TR");
}

/** "1.5" / "1,5" girdisini MIST'e çevirir; geçersizse null. */
export function parseSuiInput(input: string): bigint | null {
  const normalized = input.trim().replace(",", ".");
  if (!/^\d+(\.\d{1,9})?$/.test(normalized)) return null;
  const [whole, frac = ""] = normalized.split(".");
  const mist = BigInt(whole) * MIST_PER_SUI + BigInt(frac.padEnd(9, "0"));
  return mist > 0n ? mist : null;
}

export function formatDuration(ms: number) {
  if (ms <= 0) return "şimdi";
  const total = Math.ceil(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h} sa ${m} dk`;
  if (m > 0) return `${m} dk ${s.toString().padStart(2, "0")} sn`;
  return `${s} sn`;
}

export function percent(part: bigint, total: bigint) {
  if (total === 0n) return "0";
  const basisPoints = Number((part * 10_000n) / total);
  return (basisPoints / 100).toLocaleString("tr-TR", { maximumFractionDigits: 2 });
}
