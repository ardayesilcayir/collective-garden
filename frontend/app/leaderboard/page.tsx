"use client";

import { useEffect, useState } from "react";
import { fetchLeaderboard, type ContributionEntry } from "@/lib/garden";
import { shortenAddress } from "@/lib/constants";

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<ContributionEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboard().then((data) => {
      setEntries(data);
      setLoading(false);
    });
  }, []);

  const medals = ["🥇", "🥈", "🥉"];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <h1 className="text-3xl font-bold text-white">🏆 Katkı Sıralaması</h1>
      </div>

      {loading ? (
        <div className="text-center text-gray-400 py-16 animate-pulse">Yükleniyor…</div>
      ) : entries.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center text-gray-400">
          <div className="text-4xl mb-3">🌱</div>
          <p>Henüz sulama yapılmamış. İlk siz olun!</p>
        </div>
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800 text-xs text-gray-500 uppercase">
                <th className="px-4 py-3 text-left">#</th>
                <th className="px-4 py-3 text-left">Adres</th>
                <th className="px-4 py-3 text-right">Puan</th>
                <th className="px-4 py-3 text-right">Pay %</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e, i) => (
                <tr
                  key={e.address}
                  className="border-b border-gray-800 last:border-0 hover:bg-gray-800/50 transition-colors"
                >
                  <td className="px-4 py-3 text-lg">{medals[i] ?? `${i + 1}.`}</td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-sm text-gray-300">
                      {shortenAddress(e.address, 8)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-white">
                    {e.points.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-16 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full"
                          style={{ width: `${e.percentage}%` }}
                        />
                      </div>
                      <span className="text-emerald-400 text-sm font-mono">
                        {e.percentage}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-gray-600 text-center">
        Veriler olaylardan (events) elde edilir. Gerçek zamanlı değil.
      </p>
    </div>
  );
}

