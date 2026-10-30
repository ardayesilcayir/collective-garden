// Zincirden bahçe verisi okuma ve işlem oluşturma.
import { bcs } from "@mysten/sui/bcs";
import type { ClientWithCoreApi } from "@mysten/sui/client";
import { Transaction, coinWithBalance } from "@mysten/sui/transactions";
import { GARDEN_ID, MODULE, PACKAGE_ID } from "./config";

const ZERO_ADDRESS = "0x" + "0".repeat(64);

// === BCS şeması (garden.move içindeki alan sırasıyla aynı olmalı) ===

const UID = bcs.struct("UID", { id: bcs.Address });
const TableRef = bcs.struct("Table", { id: UID, size: bcs.u64() });

const ConfigBcs = bcs.struct("Config", {
  max_stage: bcs.u8(),
  water_per_stage: bcs.u64(),
  min_stage_duration_ms: bcs.u64(),
  cooldown_ms: bcs.u64(),
  base_points: bcs.u64(),
  daily_point_cap: bcs.u64(),
  diminish_after: bcs.u64(),
  late_stage_divisor: bcs.u64(),
});

const GardenBcs = bcs.struct("Garden", {
  id: UID,
  name: bcs.string(),
  stage: bcs.u8(),
  water_level: bcs.u64(),
  last_water_ms: bcs.u64(),
  last_growth_ms: bcs.u64(),
  created_ms: bcs.u64(),
  total_points: bcs.u64(),
  contributions: TableRef,
  last_water_by: TableRef,
  daily: TableRef,
  claimed: TableRef,
  participants: bcs.vector(bcs.Address),
  reward_pool: bcs.struct("Balance", { value: bcs.u64() }),
  total_funded: bcs.u64(),
  total_claimed: bcs.u64(),
  matured: bcs.bool(),
  config: ConfigBcs,
});

export type GardenState = {
  id: string;
  name: string;
  stage: number;
  maxStage: number;
  waterLevel: number;
  waterPerStage: number;
  lastWaterMs: number;
  lastGrowthMs: number;
  createdMs: number;
  minStageDurationMs: number;
  cooldownMs: number;
  basePoints: number;
  dailyPointCap: number;
  diminishAfter: number;
  lateStageDivisor: number;
  totalPoints: bigint;
  participants: string[];
  poolMist: bigint;
  totalFundedMist: bigint;
  totalClaimedMist: bigint;
  matured: boolean;
};

export type UserState = {
  points: bigint;
  claimed: boolean;
  nextWaterMs: number;
  pendingRewardMist: bigint;
};

export type LeaderboardRow = { address: string; points: bigint };

export type GardenEvent = {
  kind: "GardenCreated" | "Watered" | "StageAdvanced" | "Funded" | "Claimed";
  sender: string;
  data: Record<string, unknown>;
  key: string;
};

function requireIds() {
  if (!PACKAGE_ID || !GARDEN_ID) throw new Error("Paket veya bahçe kimliği yapılandırılmamış.");
  return { pkg: PACKAGE_ID, garden: GARDEN_ID };
}

const target = (fn: string) => `${requireIds().pkg}::${MODULE}::${fn}` as const;

// === Okuma ===

export async function fetchGarden(client: ClientWithCoreApi): Promise<GardenState> {
  const { garden } = requireIds();
  const { object } = await client.core.getObject({ objectId: garden, include: { content: true } });
  const expectedType = `${requireIds().pkg}::${MODULE}::Garden`;
  if (object.type !== expectedType) {
    throw new Error("Yapılandırılan nesne bu paketin bahçesi değil.");
  }
  const g = GardenBcs.parse(object.content);
  return {
    id: g.id.id,
    name: g.name,
    stage: g.stage,
    maxStage: g.config.max_stage,
    waterLevel: Number(g.water_level),
    waterPerStage: Number(g.config.water_per_stage),
    lastWaterMs: Number(g.last_water_ms),
    lastGrowthMs: Number(g.last_growth_ms),
    createdMs: Number(g.created_ms),
    minStageDurationMs: Number(g.config.min_stage_duration_ms),
    cooldownMs: Number(g.config.cooldown_ms),
    basePoints: Number(g.config.base_points),
    dailyPointCap: Number(g.config.daily_point_cap),
    diminishAfter: Number(g.config.diminish_after),
    lateStageDivisor: Number(g.config.late_stage_divisor),
    totalPoints: BigInt(g.total_points),
    participants: g.participants,
    poolMist: BigInt(g.reward_pool.value),
    totalFundedMist: BigInt(g.total_funded),
    totalClaimedMist: BigInt(g.total_claimed),
    matured: g.matured,
  };
}

/** Kontratın okuma fonksiyonlarını simülasyonla çağırıp dönüş değerlerini verir. */
async function simulateViews(
  client: ClientWithCoreApi,
  build: (tx: Transaction) => void,
  sender: string,
) {
  const tx = new Transaction();
  tx.setSender(sender);
  build(tx);
  const result = await client.core.simulateTransaction({
    transaction: tx,
    include: { commandResults: true },
    checksEnabled: false,
  });
  if (result.$kind === "FailedTransaction" || !result.commandResults) {
    throw new Error("Bahçe verisi okunamadı.");
  }
  return result.commandResults.map((r) => r.returnValues[0]?.bcs ?? new Uint8Array());
}

export async function fetchUserState(
  client: ClientWithCoreApi,
  address: string,
): Promise<UserState> {
  const { garden } = requireIds();
  const values = await simulateViews(
    client,
    (tx) => {
      for (const fn of ["points_of", "has_claimed", "next_water_ms", "pending_reward"]) {
        tx.moveCall({ target: target(fn), arguments: [tx.object(garden), tx.pure.address(address)] });
      }
    },
    address,
  );
  return {
    points: BigInt(bcs.u64().parse(values[0])),
    claimed: bcs.bool().parse(values[1]),
    nextWaterMs: Number(bcs.u64().parse(values[2])),
    pendingRewardMist: BigInt(bcs.u64().parse(values[3])),
  };
}

const LEADERBOARD_CHUNK = 200;

export async function fetchLeaderboard(
  client: ClientWithCoreApi,
  participants: string[],
): Promise<LeaderboardRow[]> {
  const { garden } = requireIds();
  const rows: LeaderboardRow[] = [];
  for (let i = 0; i < participants.length; i += LEADERBOARD_CHUNK) {
    const chunk = participants.slice(i, i + LEADERBOARD_CHUNK);
    const values = await simulateViews(
      client,
      (tx) => {
        for (const addr of chunk) {
          tx.moveCall({
            target: target("points_of"),
            arguments: [tx.object(garden), tx.pure.address(addr)],
          });
        }
      },
      ZERO_ADDRESS,
    );
    chunk.forEach((address, j) => rows.push({ address, points: BigInt(bcs.u64().parse(values[j])) }));
  }
  return rows.sort((a, b) => (b.points > a.points ? 1 : b.points < a.points ? -1 : 0));
}

const EVENT_KINDS = ["GardenCreated", "Watered", "StageAdvanced", "Funded", "Claimed"] as const;

/** Bu bahçeye ait son olaylar (en yeni önce). */
export async function fetchRecentEvents(client: ClientWithCoreApi, limit = 25): Promise<GardenEvent[]> {
  const { pkg, garden } = requireIds();
  const { events } = await client.core.listEvents({
    filter: { emitModule: `${pkg}::${MODULE}` },
    order: "descending",
    limit,
  });
  return events.flatMap((e, i) => {
    const kind = EVENT_KINDS.find((k) => e.eventType.endsWith(`::${MODULE}::${k}`));
    const data = e.json ?? {};
    if (!kind || String(data.garden_id ?? "").toLowerCase() !== garden) return [];
    return [{ kind, sender: e.sender, data, key: `${e.eventType}-${i}-${JSON.stringify(data)}` }];
  });
}

// === İşlemler ===

/** Sular; `withGrow` ise aynı işlemde bitkiyi bir aşama büyütür. */
export function buildWaterTx(withGrow = false) {
  const { garden } = requireIds();
  const tx = new Transaction();
  tx.moveCall({ target: target("water"), arguments: [tx.object(garden), tx.object.clock()] });
  if (withGrow) {
    tx.moveCall({ target: target("grow"), arguments: [tx.object(garden), tx.object.clock()] });
  }
  return tx;
}

export function buildGrowTx() {
  const { garden } = requireIds();
  const tx = new Transaction();
  tx.moveCall({ target: target("grow"), arguments: [tx.object(garden), tx.object.clock()] });
  return tx;
}

export function buildFundTx(amountMist: bigint) {
  const { garden } = requireIds();
  const tx = new Transaction();
  const payment = coinWithBalance({ balance: amountMist });
  tx.moveCall({ target: target("fund"), arguments: [tx.object(garden), payment] });
  return tx;
}

export function buildClaimTx(recipient: string) {
  const { garden } = requireIds();
  const tx = new Transaction();
  const reward = tx.moveCall({ target: target("claim"), arguments: [tx.object(garden)] });
  tx.transferObjects([reward], recipient);
  return tx;
}

// === Türetilmiş durum ===

/** Bitki şu an büyüyebilir mi (kontrattaki can_grow ile aynı kural). */
export function canGrowNow(g: GardenState, now: number) {
  return !g.matured && now >= g.lastGrowthMs + g.minStageDurationMs && g.waterLevel >= g.waterPerStage;
}

/**
 * Zincir saati ile bu bilgisayarın saati arasında küçük fark olabilir. Otomatik büyütme
 * yalnızca süre bu pay kadar aşıldıysa eklenir; aksi halde sulama da başarısız olurdu.
 */
const CLOCK_SAFETY_MS = 10_000;

/** Bir sonraki sulama aynı işlemde bitkiyi büyütebilir mi. */
export function waterWillGrow(g: GardenState, now: number) {
  return (
    !g.matured &&
    g.waterLevel + 1 >= g.waterPerStage &&
    now >= g.lastGrowthMs + g.minStageDurationMs + CLOCK_SAFETY_MS
  );
}

/** Bu aşamadaki su ilerlemesi (0–1). */
export function waterProgress(g: GardenState) {
  if (g.matured || g.waterPerStage <= 0) return 0;
  return Math.min(1, g.waterLevel / g.waterPerStage);
}

export const STAGE_NAMES = ["Tohum", "Filiz", "Fide", "Genç bitki", "Tomurcuk", "Çiçek"];

/** Herhangi bir aşama sayısını 0–5 arası görsel seviyeye eşler. */
export function visualLevel(stage: number, maxStage: number) {
  if (maxStage <= 0) return 0;
  return Math.min(5, Math.round((stage / maxStage) * 5));
}

export function stageName(stage: number, maxStage: number) {
  return STAGE_NAMES[visualLevel(stage, maxStage)];
}
