"use client";

import { useCurrentAccount } from "@mysten/dapp-kit-react";
import { ActivityFeed } from "@/components/ActivityFeed";
import { LoadError, Loading, RequireConfig } from "@/components/States";
import { useGarden, useLeaderboard } from "@/hooks/useGarden";
import { EXPLORER_URL } from "@/lib/config";
import { percent, shortAddress } from "@/lib/format";
import { normalizeSuiAddress } from "@mysten/sui/utils";

export default function LeaderboardPage() {
  return (
    <RequireConfig>
      <Leaderboard />
    </RequireConfig>
  );
}

function Leaderboard() {
  const account = useCurrentAccount();
  const { data: garden, error, isLoading } = useGarden();
  const { data: rows, isLoading: rowsLoading } = useLeaderboard(garden?.participants);

  if (isLoading) return <Loading />;
  if (error || !garden) return <LoadError error={error} />;

  const me = account ? normalizeSuiAddress(account.address) : null;
  const myRank = rows?.findIndex((r) => r.address === me) ?? -1;

  return (
    <div className="space-y-10">
      <header>
        <h1 className="font-display text-4xl font-semibold tracking-tight">Katkı sıralaması</h1>
        <p className="mt-2 text-lg text-ink-soft">
          {garden.participants.length} katılımcı, toplam {garden.totalPoints.toString()} puan.
          {myRank >= 0 && ` Sen ${myRank + 1}. sıradasın.`}
        </p>
      </header>

      {rowsLoading ? (
        <Loading label="Sıralama hesaplanıyor…" />
      ) : !rows?.length ? (
        <p className="text-ink-soft">Henüz kimse sulamadı. Bahçe sayfasından ilk katkıyı yapabilirsin.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[420px] text-left">
            <thead className="border-b-2 border-ink text-sm text-ink-soft">
              <tr>
                <th scope="col" className="py-2 pr-4 font-medium">Sıra</th>
                <th scope="col" className="py-2 pr-4 font-medium">Adres</th>
                <th scope="col" className="py-2 pr-4 text-right font-medium">Puan</th>
                <th scope="col" className="py-2 text-right font-medium">Pay</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((row, i) => {
                const mine = row.address === me;
                const share = percent(row.points, garden.totalPoints);
                return (
                  <tr key={row.address} className={mine ? "bg-water-soft" : undefined}>
                    <td className="py-3 pr-4 font-display text-lg font-semibold">{i + 1}</td>
                    <td className="py-3 pr-4">
                      <a
                        href={`${EXPLORER_URL}/account/${row.address}`}
                        target="_blank"
                        rel="noreferrer"
                        className="hover:underline"
                      >
                        {shortAddress(row.address)}
                      </a>
                      {mine && <span className="ml-2 text-sm text-water">sen</span>}
                    </td>
                    <td className="py-3 pr-4 text-right">{row.points.toString()}</td>
                    <td className="py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <span className="hidden h-1.5 w-20 overflow-hidden rounded-full bg-mist sm:block">
                          <span className="block h-full bg-leaf" style={{ width: `${share.replace(",", ".")}%` }} />
                        </span>
                        %{share}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <ActivityFeed />
    </div>
  );
}
