"use client";

import Link from "next/link";
import { useCurrentAccount } from "@mysten/dapp-kit-react";
import { PlantArt } from "@/components/PlantArt";
import { WalletButton } from "@/components/Providers";
import { useGarden } from "@/hooks/useGarden";
import { IS_CONFIGURED } from "@/lib/config";
import { formatSui } from "@/lib/format";
import { stageName } from "@/lib/garden";

const LOOP = [
  { title: "Sula", body: "Her sulama bitkiye su, sana katkı puanı kazandırır. Aynı adres kısa bir beklemeden sonra tekrar sulayabilir." },
  { title: "Büyüt", body: "Yeterli su birikip aşama süresi dolunca herkes bitkiyi bir sonraki aşamaya taşıyabilir." },
  { title: "Fonla", body: "Sponsorlar ve topluluk, bitki olgunlaşmadan önce ödül havuzuna SUI ekler." },
  { title: "Hasat et", body: "Bitki çiçek açınca her katılımcı puanı oranında payını kendisi çeker." },
];

export default function Home() {
  const account = useCurrentAccount();
  const { data: garden } = useGarden();

  return (
    <div className="space-y-16">
      <section className="grid items-center gap-8 pt-4 md:grid-cols-[1.1fr_1fr]">
        <div>
          <h1 className="font-display text-[2.6rem] font-semibold leading-[1.05] tracking-tight sm:text-6xl">
            Topluluğunun birlikte büyüttüğü bir bitki.
          </h1>
          <p className="mt-5 max-w-[34ch] text-lg leading-relaxed text-ink-soft">
            Bitki Sui üzerinde tek bir ortak nesne olarak yaşar. Sulayan kazanır; çiçek açtığında ödül
            havuzu katkıya göre paylaşılır.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            {account ? (
              <Link
                href="/garden"
                className="rounded-full bg-water px-6 py-3 font-medium text-white hover:opacity-90"
              >
                Bahçeye git
              </Link>
            ) : (
              <WalletButton />
            )}
            <Link href="/leaderboard" className="rounded-full px-4 py-3 text-ink-soft hover:text-ink">
              Sıralamayı gör
            </Link>
          </div>
        </div>

        <figure className="relative mx-auto w-full max-w-sm">
          <PlantArt stage={garden?.stage ?? 3} maxStage={garden?.maxStage ?? 5} />
          {IS_CONFIGURED && garden && (
            <figcaption className="mt-2 text-center text-ink-soft">
              <span className="font-medium text-ink">{garden.name}</span> şu an{" "}
              {stageName(garden.stage, garden.maxStage).toLocaleLowerCase("tr")} aşamasında,{" "}
              {garden.participants.length} kişi suladı, havuzda {formatSui(garden.poolMist)} SUI var.
            </figcaption>
          )}
        </figure>
      </section>

      <section aria-labelledby="loop-title">
        <h2 id="loop-title" className="font-display text-2xl font-semibold">
          Bir bahçe döngüsü
        </h2>
        <ol className="mt-6 grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-4">
          {LOOP.map((step, i) => (
            <li key={step.title} className="border-t-2 border-ink pt-3">
              <p className="font-display text-3xl font-semibold text-leaf">{i + 1}</p>
              <h3 className="mt-1 text-lg font-semibold">{step.title}</h3>
              <p className="mt-1 leading-relaxed text-ink-soft">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="max-w-prose space-y-3 leading-relaxed text-ink-soft">
        <h2 className="font-display text-2xl font-semibold text-ink">Adil kalması için</h2>
        <p>
          Her adres için sulama beklemesi, günlük puan sınırı ve gün içinde azalan getiri var. Son
          aşamada sulamanın puanı düşer; böylece son dakikada gelip payı kapmak işe yaramaz.
        </p>
        <p>
          Ödüller toplu gönderilmez: herkes kendi payını çeker ve her adres yalnızca bir kez çekebilir.
          Zaman bilgisi sadece Sui&apos;nin zincir saatinden okunur.
        </p>
      </section>
    </div>
  );
}
