"use client";

import { useState } from "react";
import { useWallet } from "@/lib/wallet";
import { buildFundTx, serializeTx } from "@/lib/garden";
import { useTx } from "@/hooks/useTx";
import { MIST_PER_SUI } from "@/lib/constants";
import TxStatusBanner from "@/components/TxStatusBanner";

export default function FundPage() {
  const { address, connected, connect, signAndExecuteTransaction } = useWallet();
  const { txStatus, execute, reset } = useTx();
  const [amount, setAmount] = useState("1");

  const handleFund = async () => {
    if (!address) return;
    const sui = parseFloat(amount);
    if (isNaN(sui) || sui <= 0) return;

    const mist = BigInt(Math.floor(sui * Number(MIST_PER_SUI)));
    await execute(async () => {
      const tx = buildFundTx(mist);
      const bytes = await serializeTx(tx, address);
      return await signAndExecuteTransaction(bytes);
    });
  };

  const presets = [0.1, 0.5, 1, 5];

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">💰 Bahçeyi Fonla</h1>
        <p className="text-gray-400 mt-1 text-sm">
          Ödül havuzuna SUI ekleyin. Bahçe olgunlaşınca katkı sahiplerine dağıtılır.
        </p>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-5">
        {/* Miktar girişi */}
        <div>
          <label className="text-sm text-gray-400 mb-2 block">Miktar (SUI)</label>
          <div className="flex gap-2">
            <input
              type="number"
              min="0.001"
              step="0.1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white font-mono focus:border-emerald-500 focus:outline-none"
              placeholder="0.0"
            />
            <span className="flex items-center text-gray-400 px-2">SUI</span>
          </div>
        </div>

        {/* Hızlı seçim */}
        <div>
          <label className="text-sm text-gray-500 mb-2 block">Hızlı Seçim</label>
          <div className="flex gap-2 flex-wrap">
            {presets.map((p) => (
              <button
                key={p}
                onClick={() => setAmount(String(p))}
                className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                  amount === String(p)
                    ? "border-emerald-500 bg-emerald-900 text-emerald-300"
                    : "border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-600"
                }`}
              >
                {p} SUI
              </button>
            ))}
          </div>
        </div>

        {/* Uyarı */}
        <div className="bg-yellow-950 border border-yellow-800 rounded-lg p-3 text-xs text-yellow-300">
          ⚠️ Testnet üzerinde çalışıyorsunuz. Gerçek SUI kullanmayın; faucet SUI kullanın.
        </div>

        {/* İşlem durumu */}
        <TxStatusBanner {...txStatus} onDismiss={reset} />

        {/* Fon butonu */}
        {!connected ? (
          <button
            onClick={connect}
            className="w-full bg-emerald-700 hover:bg-emerald-600 text-white font-bold py-3 rounded-xl"
          >
            Cüzdanı Bağla
          </button>
        ) : (
          <button
            onClick={handleFund}
            disabled={txStatus.status === "pending" || !amount || parseFloat(amount) <= 0}
            className="w-full bg-yellow-600 hover:bg-yellow-500 disabled:opacity-40 text-white font-bold py-3 rounded-xl transition-colors"
          >
            {txStatus.status === "pending" ? "İşleniyor…" : `💰 ${amount || "?"} SUI Ekle`}
          </button>
        )}
      </div>

      {/* Açıklama */}
      <div className="text-xs text-gray-600 space-y-1">
        <p>• Herkes ödül havuzuna katkıda bulunabilir.</p>
        <p>• Havuz yalnızca bitki olgunlaştığında dağıtılır.</p>
        <p>• Dağıtım katkı puanıyla orantılıdır.</p>
      </div>
    </div>
  );
}

