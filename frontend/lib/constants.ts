// Kontrat sabitleri — deploy sonrası .env.local ile güncellenir
export const PACKAGE_ID = process.env.NEXT_PUBLIC_GARDEN_PACKAGE_ID as string;
export const GARDEN_OBJECT_ID = process.env.NEXT_PUBLIC_GARDEN_OBJECT_ID as string;
export const NETWORK = (process.env.NEXT_PUBLIC_NETWORK ?? "testnet") as
  | "testnet"
  | "mainnet"
  | "devnet";

// Aşama adları
export const STAGE_NAMES = ["🌱 Tohum", "🌿 Fide", "🍃 Genç Bitki", "🌻 Olgun", "🏆 Hasat"];
export const STAGE_EMOJIS = ["🌱", "🌿", "🍃", "🌻", "🏆"];

// Cooldown ms (kontratla aynı: 1 saat)
export const COOLDOWN_MS = 3_600_000;

// Bir aşama için gereken su
export const WATER_PER_STAGE = 10;

// SUI mist → SUI
export const MIST_PER_SUI = 1_000_000_000n;

export function mistToSui(mist: bigint | number): string {
  const m = typeof mist === "number" ? BigInt(mist) : mist;
  const whole = m / MIST_PER_SUI;
  const frac = m % MIST_PER_SUI;
  const fracStr = frac.toString().padStart(9, "0").replace(/0+$/, "");
  return fracStr ? `${whole}.${fracStr}` : `${whole}`;
}

export function shortenAddress(addr: string, chars = 6): string {
  if (!addr) return "";
  return `${addr.slice(0, chars + 2)}…${addr.slice(-chars)}`;
}

export function msToCountdown(ms: number): string {
  if (ms <= 0) return "Hazır!";
  const totalSec = Math.ceil(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return [h > 0 ? `${h}s` : null, m > 0 ? `${m}d` : null, `${s}sn`]
    .filter(Boolean)
    .join(" ");
}

