"use client";

import { useEffect, useState, useCallback } from "react";
import { useWallet } from "@/lib/wallet";
import { fetchGarden, buildWaterTx, buildGrowTx, serializeTx, type GardenData } from "@/lib/garden";
import { useTx } from "@/hooks/useTx";
import { COOLDOWN_MS, mistToSui, msToCountdown } from "@/lib/constants";
import PlantDisplay from "@/components/PlantDisplay";
import TxStatusBanner from "@/components/TxStatusBanner";
import { suiClient } from "@/lib/wallet";

export default function GardenPage() {
  const { address, connected, connect, signAndExecuteTransaction } = useWallet();
  const { txStatus, execute, reset } = useTx();
  const [garden, setGarden] = useState<GardenData | null>(null);
  const [loading, setLoading] = useState(true);
  const [cooldownMs, setCooldownMs] = useState(0);
  const [lastWaterTime, setLastWaterTime] = useState<number | null>(null);

  const loadGarden = useCallback(async () => {
    setLoading(true);
    const data = await fetchGarden();
    setGarden(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadGarden();
    const iv = setInterval(loadGarden, 15_000);
    return () => clearInterval(iv);
  }, [loadGarden]);

  // Cooldown sayacı
  useEffect(() => {
    if (!address || !lastWaterTime) { setCooldownMs(0); return; }
    const update = () => {
      const elapsed = Date.now() - lastWaterTime;
      setCooldownMs(Math.max(0, COOLDOWN_MS - elapsed));
    };
    update();
    const iv = setInterval(update, 1000);
    return () => clearInterval(iv);
  }, [address, lastWaterTime]);

  // Kullanıcının son sulama zamanını çek
  useEffect(() => {
    if (!address) return;
    // Basit yaklaşım: son Watered eventinden bul
    const fetchLastWater = async () => {
      try {
        const { PACKAGE_ID, GARDEN_OBJECT_ID } = await import("@/lib/constants");
        if (PACKAGE_ID.includes("0000")) return;
        const events = await suiClient.queryEvents({
          query: { MoveEventType: `${PACKAGE_ID}::garden::Watered` },
          limit: 50,
        });
        const myEvents = events.data
          .filter((e) => {
            const p = e.parsedJson as { waterer: string; timestamp_ms: string } | undefined;
            return p?.waterer === address;
          })
          .map((e) => Number((e.parsedJson as { timestamp_ms: string }).timestamp_ms));
        if (myEvents.length > 0) setLastWaterTime(Math.max(...myEvents));
      } catch { /* sessiz hata */ }
    };
    fetchLastWater();
  }, [address]);

  const handleWater = async () => {
    if (!address) return;
    await execute(async () => {
      const tx = buildWaterTx();
      const bytes = await serializeTx(tx, address);
      const digest = await signAndExecuteTransaction(bytes);
      setLastWaterTime(Date.now());
      setTimeout(loadGarden, 2000);
      return digest;
    });
  };

  const handleGrow = async () => {
    if (!address) return;
    await execute(async () => {
      const tx = buildGrowTx();
      const bytes = await serializeTx(tx, address);
      const digest = await signAndExecuteTransaction(bytes);
      setTimeout(loadGarden, 2000);
      return digest;
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64 text-gray-400">
        <span className="animate-pulse text-4xl">🌿</span>
        <span className="ml-3">Bahçe yükleniyor…</span>
      </div>
    );
  }

  const isConfigured = process.env.NEXT_PUBLIC_GARDEN_OBJECT_ID && 
    !process.env.NEXT_PUBLIC_GARDEN_OBJECT_ID.includes("0000");

  if (!isConfigured || !garden) {
    return (
      <div className="max-w-lg mx-auto mt-8">
        <div className="bg-gray-900 border border-yellow-700 rounded-xl p-6 text-center">
          <div className="text-5xl mb-4">🏗️</div>
          <h2 className="text-xl font-bold text-yellow-400 mb-2">Bahçe Henüz Kurulmadı</h2>
          <p className="text-gray-400 text-sm mb-4">
            Kontrat testnet&apos;e deploy edilmeli ve{" "}
            <code className="bg-gray-800 px-1 rounded">.env.local</code> dosyasındaki
            <code className="bg-gray-800 px-1 rounded ml-1">NEXT_PUBLIC_GARDEN_OBJECT_ID</code>{" "}
            güncellenmeli.
          </p>
          <p className="text-xs text-gray-500">
            Bakınız: <code>DEPLOY.md</code>
          </p>
          {connected && (
            <button
              onClick={handleGrow}
              className="mt-4 text-xs text-gray-600 hover:text-gray-400"
            >
              (Demo: grow çağır)
            </button>
          )}
        </div>
      </div>
    );
  }

  const canWater = connected && cooldownMs === 0 && !garden.matured;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold text-white">🌱 Bahçe</h1>

      {/* Bitki görseli */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8">
        <PlantDisplay garden={garden} />
      </div>

      {/* İstatistikler */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Toplam Sulama", value: garden.water_level, icon: "💧" },
          { label: "Toplam Puan", value: garden.total_points, icon: "⭐" },
          { label: "Ödül Havuzu", value: `${mistToSui(BigInt(garden.reward_pool))} SUI`, icon: "💰" },
        ].map(({ label, value, icon }) => (
          <div key={label} className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
            <div className="text-2xl mb-1">{icon}</div>
            <div className="text-xl font-bold text-white">{value}</div>
            <div className="text-xs text-gray-500">{label}</div>
          </div>
        ))}
      </div>

      {/* İşlem durumu */}
      <TxStatusBanner {...txStatus} onDismiss={reset} />

      {/* Butonlar */}
      <div className="flex flex-col gap-3">
        {!connected ? (
          <button
            onClick={connect}
            className="w-full bg-emerald-700 hover:bg-emerald-600 text-white font-bold py-3 rounded-xl transition-colors"
          >
            Cüzdanı Bağla
          </button>
        ) : garden.matured ? (
          <div className="text-center text-emerald-400 font-semibold py-4">
            🏆 Bahçe olgunlaştı! Hasat sayfasından ödülünüzü çekin.
          </div>
        ) : (
          <>
            <button
              onClick={handleWater}
              disabled={!canWater || txStatus.status === "pending"}
              className="w-full bg-blue-700 hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition-colors"
            >
              {txStatus.status === "pending" ? "İşleniyor…" : cooldownMs > 0
                ? `⏳ Cooldown: ${msToCountdown(cooldownMs)}`
                : "💧 Sula"}
            </button>

            <button
              onClick={handleGrow}
              disabled={txStatus.status === "pending"}
              className="w-full bg-gray-800 hover:bg-gray-700 disabled:opacity-40 text-white font-semibold py-2 rounded-xl transition-colors text-sm"
            >
              🌱 Büyüt (Koşullar sağlanmışsa)
            </button>
          </>
        )}
      </div>
    </div>
  );
}

