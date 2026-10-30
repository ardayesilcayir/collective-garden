"use client";

import { useCurrentAccount } from "@mysten/dapp-kit-react";
import Link from "next/link";
import { LoadError, Loading, RequireConfig } from "@/components/States";
import { TxStatusBanner } from "@/components/TxStatusBanner";
import { useGarden, useUserState } from "@/hooks/useGarden";
import { useTx } from "@/hooks/useTx";
import { formatSui, percent } from "@/lib/format";
import { buildClaimTx } from "@/lib/garden";

export default function HarvestPage() {
  return (
    <RequireConfig>
      <Harvest />
    </RequireConfig>
  );
}

function Harvest() {
  const account = useCurrentAccount();
  const { data: garden, error, isLoading } = useGarden();
  const { data: user } = useUserState();
  const { run, status, reset, busy } = useTx();

  if (isLoading) return <Loading />;
  if (error || !garden) return <LoadError error={error} />;

  const stagesLeft = garden.maxStage - garden.stage;

  let blocked: string | null = null;
  if (!account) blocked = "Payını görmek için cüzdanını bağla.";
  else if (!garden.matured)
    blocked = `Hasat, bitki ${stagesLeft} aşama daha büyüyüp çiçek açınca başlar.`;
  else if (user?.claimed) blocked = "Payını bu bahçeden çektin. Teşekkürler!";
  else if (user && user.points === 0n) blocked = "Bu bahçeye katkın olmadığı için çekilecek pay yok.";

  async function claim() {
    if (!account) return;
    await run(buildClaimTx(account.address), {
      pending: "Pay çekiliyor.",
      success: "Payın cüzdanına aktarıldı.",
    });
  }

  return (
    <div className="mx-auto max-w-xl space-y-8">
      <header>
        <h1 className="font-display text-4xl font-semibold tracking-tight">Hasat</h1>
        <p className="mt-2 text-lg text-ink-soft">
          Bitki çiçek açınca ödül havuzu puan oranına göre paylaşılır. Herkes kendi payını bir kez çeker.
        </p>
      </header>

      <div className="rounded-3xl border-2 border-pollen bg-paper-raised p-6">
        <p className="text-ink-soft">{garden.matured ? "Çekebileceğin pay" : "Şu anki tahmini payın"}</p>
        <p className="mt-1 font-display text-5xl font-semibold tracking-tight">
          {user ? formatSui(user.pendingRewardMist) : "0"} <span className="text-2xl">SUI</span>
        </p>
        {user && (
          <p className="mt-2 text-ink-soft">
            {user.points.toString()} puan, toplamın %{percent(user.points, garden.totalPoints)}’i.
            Toplam fon {formatSui(garden.totalFundedMist)} SUI.
          </p>
        )}

        <button
          onClick={claim}
          disabled={!!blocked || busy || !user}
          className="mt-6 w-full rounded-full bg-ink px-6 py-3.5 text-lg font-semibold text-paper hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {user?.claimed ? "Pay çekildi" : "Payımı çek"}
        </button>
        {blocked && <p className="mt-3 text-ink-soft">{blocked}</p>}
        <div className="mt-4">
          <TxStatusBanner status={status} onClose={reset} />
        </div>
      </div>

      {!garden.matured && (
        <p className="text-ink-soft">
          Payını büyütmek için <Link href="/garden" className="underline">bahçeyi sulamaya</Link> devam et.
          Tahmin, havuza eklenen fonlarla ve diğer katılımcıların katkısıyla değişir.
        </p>
      )}
      <p className="text-sm text-ink-soft">
        Pay hesabı: toplam fon × senin puanın ÷ toplam puan. Tam sayı bölmesinden kalan birkaç MIST havuzda
        kalır.
      </p>
    </div>
  );
}
