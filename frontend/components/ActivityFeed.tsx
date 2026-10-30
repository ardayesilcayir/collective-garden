"use client";

import { useRecentEvents } from "@/hooks/useGarden";
import { formatSui, shortAddress } from "@/lib/format";
import type { GardenEvent } from "@/lib/garden";

function describe(e: GardenEvent) {
  const who = shortAddress(e.sender);
  const d = e.data;
  switch (e.kind) {
    case "Watered":
      return `${who} suladı, +${d.points} puan`;
    case "StageAdvanced":
      return d.matured ? `Bitki çiçek açtı. Hasat başladı.` : `Bitki ${d.new_stage}. aşamaya geçti`;
    case "Funded":
      return `${who} havuza ${formatSui(BigInt(String(d.amount ?? 0)))} SUI ekledi`;
    case "Claimed":
      return `${who} payını çekti: ${formatSui(BigInt(String(d.amount ?? 0)))} SUI`;
    case "GardenCreated":
      return `Bahçe kuruldu`;
  }
}

const DOT: Record<GardenEvent["kind"], string> = {
  Watered: "bg-water",
  StageAdvanced: "bg-leaf",
  Funded: "bg-pollen",
  Claimed: "bg-pollen",
  GardenCreated: "bg-ink-soft",
};

export function ActivityFeed() {
  const { data: events, isLoading } = useRecentEvents();

  return (
    <section aria-labelledby="activity-title">
      <h2 id="activity-title" className="font-display text-xl font-semibold">
        Son hareketler
      </h2>
      {isLoading ? (
        <p className="mt-3 text-ink-soft">Olaylar okunuyor…</p>
      ) : !events?.length ? (
        <p className="mt-3 text-ink-soft">Henüz kayıtlı hareket yok. İlk sulayan sen ol.</p>
      ) : (
        <ul className="mt-3 divide-y divide-line">
          {events.map((e) => (
            <li key={e.key} className="flex items-center gap-3 py-2.5">
              <span className={`size-2.5 shrink-0 rounded-full ${DOT[e.kind]}`} aria-hidden />
              <span>{describe(e)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
