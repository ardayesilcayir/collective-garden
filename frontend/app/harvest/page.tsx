"use client";

import { useEffect, useState } from "react";
import { useWallet } from "@/lib/wallet";
import { fetchGarden, fetchLeaderboard, buildClaimTx, serializeTx } from "@/lib/garden";
import { useTx } from "@/hooks/useTx";
import { mistToSui, shortenAddress } from "@/lib/constants";
import TxStatusBanner from "@/components/TxStatusBanner";

export default function HarvestPage() {
  const { address, connected, connect, signAndExecuteTransaction } = useWallet();
  const { txStatus, execute, reset } = useTx();
  const [matured, setMatured] = useState<boolean | null>(null);
  const [rewardPool, setRewardPool] = useState<bigint>(0n);
  const [myPoints, setMyPoints] = useState(0);
  const [totalPoints, setTotalPoints] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [garden, lb] = await Promise.all([fetchGarden(), fetchLeaderboard()]);
      if (garden) {
        setMatured(garden.matured);
        setRewardPool(BigInt(garden.reward_pool));
        setTotalPoints(garden.total_points);
      }
      if (address) {
        const entry = lb.find((e) => e.address === address);
        setMyPoints(entry?.points ?? 0);
      }
      setLoading(false);
    };
    load();
  }, [address]);

  const myShare =
    totalPoints > 0 && myPoints > 0
      ? (rewardPool * BigInt(myPoints)) / BigInt(totalPoints)
      : 0n;

  const myPercentage =
    totalPoints > 0 && myPoints > 0
      ? ((myPoints / totalPoints) * 100).toFixed(1)
      : "0";

  const handleClaim = async () => {
    if (!address) return;
    await execute(async () => {
      const tx = buildClaimTx();
      const bytes = await serializeTx(tx, address);
      return await signAndExecuteTransaction(bytes);
    });
  };

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <h1 className="text-3xl font-bold text-white">🌾 Hasat</h1>

      {loading ? (
        <div className="text-center text-gray-400 py-16 animate-pulse">Yükleniyor…</div>
      ) : (
        <>
          {/* Olgunlaşma durumu */}
          <div className={`rounded-xl p-6 border text-center ${
            matured
              ? "bg-emerald-950 border-emerald-700"
              : "bg-gray-900 border-gray-800"
          }`}>
            <div className="text-5xl mb-3">{matured ? "🏆" : "⏳"}</div>
            <h2 className="text-xl font-bold text-white mb-1">
              {matured ? "Bahçe Olgunlaştı!" : "Bahçe Henüz Hazır Değil"}
            </h2>
            <p className="text-sm text-gray-400">
              {matured
                ? "Katkınıza göre ödülünüzü çekebilirsiniz."
                : "Bahçe 5. aşamaya ulaştığında claim açılır."}
            </p>
          </div>

          {/* Ödül havuzu */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="text-sm text-gray-500 mb-1">Toplam Ödül Havuzu</div>
              <div className="text-2xl font-bold text-white">
                {mistToSui(rewardPool)} SUI
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm text-gray-500 mb-1">Sizin Payınız</div>
              <div className="text-2xl font-bold text-emerald-400">
                {myPoints > 0 ? `${mistToSui(myShare)} SUI` : "—"}
              </div>
              {myPoints > 0 && (
                <div className="text-xs text-gray-500 mt-0.5">
                  {myPercentage}% · {myPoints} puan
                </div>
              )}
            </div>
          </div>

          {/* Kullanıcı durumu */}
          {connected && address && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-sm text-gray-400">
              <span className="text-gray-500">Adresiniz: </span>
              <span className="font-mono text-gray-300">{shortenAddress(address, 10)}</span>
            </div>
          )}

          {/* İşlem durumu */}
          <TxStatusBanner {...txStatus} onDismiss={reset} />

          {/* Claim butonu */}
          {!connected ? (
            <button
              onClick={connect}
              className="w-full bg-emerald-700 hover:bg-emerald-600 text-white font-bold py-3 rounded-xl"
            >
              Cüzdanı Bağla
            </button>
          ) : !matured ? (
            <button
              disabled
              className="w-full bg-gray-800 opacity-50 cursor-not-allowed text-white font-bold py-3 rounded-xl"
            >
              Bahçe henüz olgunlaşmadı
            </button>
          ) : myPoints === 0 ? (
            <div className="text-center text-gray-500 py-4">
              Bu bahçede katkınız bulunmuyor.
            </div>
          ) : (
            <button
              onClick={handleClaim}
              disabled={txStatus.status === "pending"}
              className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-colors"
            >
              {txStatus.status === "pending" ? "İşleniyor…" : "🌾 Ödülü Çek"}
            </button>
          )}
        </>
      )}
    </div>
  );
}

