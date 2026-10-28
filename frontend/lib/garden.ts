import { suiClient } from "./wallet";
import { Transaction } from "@mysten/sui/transactions";
import { PACKAGE_ID, GARDEN_OBJECT_ID } from "./constants";

// Sui saatinin nesne ID'si (global shared)
const CLOCK_OBJECT_ID = "0x6";

// ─── Garden nesnesini oku ──────────────────────────────────────────────────────

export interface GardenData {
  stage: number;
  water_level: number;
  total_points: number;
  matured: boolean;
  reward_pool: string; // MIST
}

export async function fetchGarden(): Promise<GardenData | null> {
  if (!GARDEN_OBJECT_ID || GARDEN_OBJECT_ID.includes("0000")) return null;
  try {
    const obj = await suiClient.getObject({
      id: GARDEN_OBJECT_ID,
      options: { showContent: true },
    });
    if (obj.data?.content?.dataType !== "moveObject") return null;
    const fields = (obj.data.content as { fields: Record<string, unknown> }).fields;
    return {
      stage: Number(fields.stage),
      water_level: Number(fields.water_level),
      total_points: Number(fields.total_points),
      matured: Boolean(fields.matured),
      reward_pool: String((fields.reward_pool as { fields: { value: string } })?.fields?.value ?? "0"),
    };
  } catch (e) {
    console.error("fetchGarden hatası:", e);
    return null;
  }
}

// ─── Olaylardan katkı listesi ──────────────────────────────────────────────────

export interface ContributionEntry {
  address: string;
  points: number;
  percentage: string;
}

export async function fetchLeaderboard(): Promise<ContributionEntry[]> {
  if (!PACKAGE_ID || PACKAGE_ID.includes("0000")) return [];
  try {
    const events = await suiClient.queryEvents({
      query: { MoveEventType: `${PACKAGE_ID}::garden::Watered` },
      limit: 200,
    });

    const pointsMap: Record<string, number> = {};
    for (const e of events.data) {
      const parsed = e.parsedJson as { waterer: string; points_earned: string } | undefined;
      if (!parsed) continue;
      const addr = parsed.waterer;
      pointsMap[addr] = (pointsMap[addr] ?? 0) + Number(parsed.points_earned);
    }

    const total = Object.values(pointsMap).reduce((a, b) => a + b, 0);
    const entries: ContributionEntry[] = Object.entries(pointsMap)
      .map(([address, points]) => ({
        address,
        points,
        percentage: total > 0 ? ((points / total) * 100).toFixed(1) : "0",
      }))
      .sort((a, b) => b.points - a.points);

    return entries;
  } catch (e) {
    console.error("fetchLeaderboard hatası:", e);
    return [];
  }
}

// ─── İşlem builder'ları ───────────────────────────────────────────────────────

/** Bahçeyi sular */
export function buildWaterTx(): Transaction {
  const tx = new Transaction();
  tx.moveCall({
    target: `${PACKAGE_ID}::garden::water`,
    arguments: [
      tx.object(GARDEN_OBJECT_ID),
      tx.object(CLOCK_OBJECT_ID),
    ],
  });
  return tx;
}

/** Ödül havuzunu fonlar (amount: MIST cinsinden) */
export function buildFundTx(amount: bigint): Transaction {
  const tx = new Transaction();
  const [coin] = tx.splitCoins(tx.gas, [amount]);
  tx.moveCall({
    target: `${PACKAGE_ID}::garden::fund`,
    arguments: [
      tx.object(GARDEN_OBJECT_ID),
      coin,
      tx.object(CLOCK_OBJECT_ID),
    ],
  });
  return tx;
}

/** Bahçeyi büyütür (grow) */
export function buildGrowTx(): Transaction {
  const tx = new Transaction();
  tx.moveCall({
    target: `${PACKAGE_ID}::garden::grow`,
    arguments: [
      tx.object(GARDEN_OBJECT_ID),
      tx.object(CLOCK_OBJECT_ID),
    ],
  });
  return tx;
}

/** Ödül çeker (claim) */
export function buildClaimTx(): Transaction {
  const tx = new Transaction();
  tx.moveCall({
    target: `${PACKAGE_ID}::garden::claim`,
    arguments: [
      tx.object(GARDEN_OBJECT_ID),
      tx.object(CLOCK_OBJECT_ID),
    ],
  });
  return tx;
}

/** Yeni bahçe oluşturur */
export function buildCreateTx(): Transaction {
  const tx = new Transaction();
  tx.moveCall({
    target: `${PACKAGE_ID}::garden::create`,
    arguments: [tx.object(CLOCK_OBJECT_ID)],
  });
  return tx;
}

/** İşlemi serialize et (cüzdana göndermeden önce) */
export async function serializeTx(tx: Transaction, sender: string): Promise<Uint8Array> {
  tx.setSender(sender);
  return await tx.build({ client: suiClient });
}

