"use client";

import { useCurrentAccount } from "@mysten/dapp-kit-react";
import { useState } from "react";
import { LoadError, Loading, RequireConfig } from "@/components/States";
import { TxStatusBanner } from "@/components/TxStatusBanner";
import { useGarden } from "@/hooks/useGarden";
import { useTx } from "@/hooks/useTx";
import { formatSui, parseSuiInput } from "@/lib/format";
import { buildFundTx } from "@/lib/garden";

const PRESETS = ["0.1", "0.5", "1"];

export default function FundPage() {
  return (
    <RequireConfig>
      <Fund />
    </RequireConfig>
  );
}

function Fund() {
  const account = useCurrentAccount();
  const { data: garden, error, isLoading } = useGarden();
  const { run, status, reset, busy } = useTx();
  const [amount, setAmount] = useState("0.5");

  if (isLoading) return <Loading />;
  if (error || !garden) return <LoadError error={error} />;

  const mist = parseSuiInput(amount);
  let blocked: string | null = null;
  if (!account) blocked = "Fonlamak için cüzdanını bağla.";
  else if (garden.matured) blocked = "Bitki olgunlaştı; payların sabit kalması için fonlama kapandı.";
  else if (amount.trim() && mist === null) blocked = "Geçerli bir SUI miktarı gir (en fazla 9 ondalık).";

  async function fund() {
    if (!mist) return;
    await run(buildFundTx(mist), {
      pending: "Havuz fonlanıyor.",
      success: `Havuza ${formatSui(mist)} SUI eklendi.`,
    });
  }

  return (
    <div className="mx-auto max-w-xl space-y-8">
      <header>
        <h1 className="font-display text-4xl font-semibold tracking-tight">Ödül havuzunu fonla</h1>
        <p className="mt-2 text-lg text-ink-soft">
          Eklediğin SUI, bitki çiçek açınca sulayanlara katkılarına göre dağıtılır. Fonlama yalnızca
          olgunlaşmadan önce açıktır.
        </p>
      </header>

      <dl className="grid grid-cols-2 gap-4 border-y border-line py-4">
        <div>
          <dt className="text-sm text-ink-soft">Havuzda</dt>
          <dd className="font-display text-2xl font-semibold">{formatSui(garden.poolMist)} SUI</dd>
        </div>
        <div>
          <dt className="text-sm text-ink-soft">Toplam fon</dt>
          <dd className="font-display text-2xl font-semibold">{formatSui(garden.totalFundedMist)} SUI</dd>
        </div>
      </dl>

      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          fund();
        }}
      >
        <label htmlFor="amount" className="block font-medium">
          Miktar (SUI)
        </label>
        <div className="flex items-center gap-2 rounded-full border-2 border-line bg-paper-raised px-5 focus-within:border-water">
          <input
            id="amount"
            inputMode="decimal"
            autoComplete="off"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="min-w-0 flex-1 bg-transparent py-3 text-xl outline-none"
          />
          <span className="text-ink-soft">SUI</span>
        </div>
        <div className="flex gap-2">
          {PRESETS.map((p) => (
            <button
              type="button"
              key={p}
              onClick={() => setAmount(p)}
              className={`rounded-full border px-4 py-1.5 ${amount === p ? "border-ink bg-ink text-paper" : "border-line hover:bg-mist"}`}
            >
              {p.replace(".", ",")}
            </button>
          ))}
        </div>
        <button
          type="submit"
          disabled={!!blocked || !mist || busy}
          className="w-full rounded-full bg-ink px-6 py-3.5 text-lg font-semibold text-paper hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Havuza {mist ? formatSui(mist) : "0"} SUI ekle
        </button>
        {blocked && <p className="text-ink-soft">{blocked}</p>}
        <TxStatusBanner status={status} onClose={reset} />
      </form>
    </div>
  );
}
