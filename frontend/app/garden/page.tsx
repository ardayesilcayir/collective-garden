"use client";

import { useCurrentAccount } from "@mysten/dapp-kit-react";
import { useState } from "react";
import { ActivityFeed } from "@/components/ActivityFeed";
import { PlantArt } from "@/components/PlantArt";
import { RainGauge } from "@/components/RainGauge";
import { LoadError, Loading, RequireConfig } from "@/components/States";
import { TxStatusBanner } from "@/components/TxStatusBanner";
import { useGarden, useNow, useUserState } from "@/hooks/useGarden";
import { useTx } from "@/hooks/useTx";
import { formatDuration, formatSui, percent } from "@/lib/format";
import {
  buildGrowTx,
  buildWaterTx,
  canGrowNow,
  stageName,
  waterProgress,
  waterWillGrow,
} from "@/lib/garden";

export default function GardenPage() {
  return (
    <RequireConfig>
      <GardenView />
    </RequireConfig>
  );
}

function GardenView() {
  const account = useCurrentAccount();
  const { data: garden, error, isLoading } = useGarden();
  const { data: user } = useUserState();
  const { run, status, reset, busy } = useTx();
  const now = useNow();
  const [dropKey, setDropKey] = useState(0);

  if (isLoading) return <Loading />;
  if (error || !garden) return <LoadError error={error} />;

  const growReadyAt = garden.lastGrowthMs + garden.minStageDurationMs;
  const timeLeft = Math.max(0, growReadyAt - now);
  const waterLeft = Math.max(0, garden.waterPerStage - garden.waterLevel);
  const canGrow = canGrowNow(garden, now);
  const cooldownLeft = user ? Math.max(0, user.nextWaterMs - now) : 0;
  const isLateStage = !garden.matured && garden.stage + 1 >= garden.maxStage;
  const nextWaterGrows = waterWillGrow(garden, now);

  let waterDisabledReason: string | null = null;
  if (!account) waterDisabledReason = "Sulamak için cüzdanını bağla.";
  else if (garden.matured) waterDisabledReason = "Bitki olgunlaştı. Hasat sayfasından payını çekebilirsin.";
  else if (cooldownLeft > 0) waterDisabledReason = `Tekrar sulamak için ${formatDuration(cooldownLeft)} bekle.`;

  async function water() {
    if (!garden) return;
    const plain = { pending: "Sulanıyor.", success: "Bitkiyi suladın." };
    let outcome;
    if (waterWillGrow(garden, Date.now())) {
      const blooms = garden.stage + 1 >= garden.maxStage;
      outcome = await run(buildWaterTx(true), {
        pending: "Sulanıyor ve bitki büyütülüyor.",
        success: blooms ? "Suladın ve bitki çiçek açtı. Hasat başladı!" : "Suladın ve bitki bir aşama büyüdü.",
        // Biri bizden önce büyüttüyse (su/süre artık yetmiyor) sadece sulamayı dene.
        silentFailure: (code) => code === 4 || code === 5,
      });
      if (!outcome.ok && (outcome.abortCode === 4 || outcome.abortCode === 5)) {
        outcome = await run(buildWaterTx(false), plain);
      }
    } else {
      outcome = await run(buildWaterTx(false), plain);
    }
    if (outcome.ok) setDropKey((k) => k + 1);
  }

  async function grow() {
    await run(buildGrowTx(), { pending: "Bitki büyütülüyor.", success: "Bitki bir aşama büyüdü." });
  }

  return (
    <div className="space-y-8">
      <div className="grid gap-8 md:grid-cols-[1fr_1fr]">
        <section className="flex gap-4 rounded-3xl bg-paper-raised p-5 sm:p-6" aria-label="Bitki">
          <div className="flex-1">
            <PlantArt
              stage={garden.stage}
              maxStage={garden.maxStage}
              progress={waterProgress(garden)}
              dropKey={dropKey}
            />
          </div>
          <div className="w-14 py-6">
            <RainGauge level={garden.waterLevel} perStage={garden.waterPerStage} />
          </div>
        </section>

        <section className="flex flex-col gap-6">
          <header>
            <h1 className="font-display text-4xl font-semibold tracking-tight">{garden.name}</h1>
            <p className="mt-1 text-lg text-ink-soft">
              {stageName(garden.stage, garden.maxStage)}, aşama {garden.stage} / {garden.maxStage}
            </p>
          </header>

          <dl className="grid grid-cols-2 gap-x-6 gap-y-4 border-y border-line py-4">
            <div>
              <dt className="text-sm text-ink-soft">Sonraki aşama</dt>
              <dd className="mt-0.5 text-lg font-medium">
                {garden.matured
                  ? "Çiçek açtı"
                  : nextWaterGrows
                    ? "Bir sonraki sulamada"
                    : waterLeft > 0
                    ? `${waterLeft} sulama daha`
                    : timeLeft > 0
                      ? `${formatDuration(timeLeft)} sonra`
                      : "Büyümeye hazır"}
              </dd>
              {!garden.matured && !nextWaterGrows && waterLeft > 0 && timeLeft > 0 && (
                <dd className="text-sm text-ink-soft">ve en erken {formatDuration(timeLeft)} sonra</dd>
              )}
            </div>
            <div>
              <dt className="text-sm text-ink-soft">Ödül havuzu</dt>
              <dd className="mt-0.5 text-lg font-medium">{formatSui(garden.poolMist)} SUI</dd>
            </div>
            <div>
              <dt className="text-sm text-ink-soft">Katkın</dt>
              <dd className="mt-0.5 text-lg font-medium">
                {user ? `${user.points.toString()} puan` : account ? "…" : "Cüzdan bağlı değil"}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-ink-soft">Payın</dt>
              <dd className="mt-0.5 text-lg font-medium">
                {user ? `%${percent(user.points, garden.totalPoints)}` : "—"}
              </dd>
            </div>
          </dl>

          <div className="space-y-3">
            <div className="flex flex-wrap gap-3">
              <button
                onClick={water}
                disabled={!!waterDisabledReason || busy}
                className="flex-1 rounded-full bg-water px-6 py-3.5 text-lg font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {cooldownLeft > 0 && account ? `Sula (${formatDuration(cooldownLeft)})` : "Sula"}
              </button>
              {canGrow && (
                <button
                  onClick={grow}
                  disabled={!account || busy}
                  className="rounded-full border-2 border-leaf px-6 py-3 font-semibold text-leaf-deep hover:bg-leaf/10 disabled:opacity-40"
                >
                  Bitkiyi büyüt
                </button>
              )}
            </div>
            {waterDisabledReason && <p className="text-ink-soft">{waterDisabledReason}</p>}
            {!waterDisabledReason && isLateStage && (
              <p className="text-ink-soft">
                Son aşamadasın: sulamalar 1/{garden.lateStageDivisor} puan kazandırır.
              </p>
            )}
            {nextWaterGrows && !waterDisabledReason && (
              <p className="text-ink-soft">Su ve süre tamam: sularsan bitki aynı işlemde bir aşama büyür.</p>
            )}
            {canGrow && account && waterDisabledReason && (
              <p className="text-ink-soft">Su ve süre tamam. Bitkiyi bir sonraki aşamaya herkes taşıyabilir.</p>
            )}
            <TxStatusBanner status={status} onClose={reset} />
          </div>

          <p className="text-sm text-ink-soft">
            Sulama başına {garden.basePoints} puan, günde en fazla {garden.dailyPointCap} puan. Gün içinde{" "}
            {garden.diminishAfter}. sulamadan sonra puan yarıya iner. Bekleme süresi{" "}
            {formatDuration(garden.cooldownMs)}.
          </p>
        </section>
      </div>

      <ActivityFeed />
    </div>
  );
}
