import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col items-center gap-12 py-16 text-center">
      {/* Hero */}
      <div className="flex flex-col items-center gap-4">
        <div className="text-8xl animate-bounce">🌿</div>
        <h1 className="text-5xl font-extrabold text-white">
          Kolektif Bahçe
        </h1>
        <p className="text-xl text-gray-400 max-w-xl">
          Topluluğunuzun birlikte büyüttüğü, katkıya göre ödül dağıtan zincir üstü bahçe.
        </p>
        <p className="text-sm text-emerald-500 font-mono">
          Sui Testnet · Move
        </p>
      </div>

      {/* CTA Butonları */}
      <div className="flex flex-wrap gap-4 justify-center">
        <Link
          href="/garden"
          className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-8 py-3 rounded-xl text-lg transition-colors"
        >
          🌱 Bahçeye Git
        </Link>
        <Link
          href="/leaderboard"
          className="bg-gray-800 hover:bg-gray-700 text-white font-bold px-8 py-3 rounded-xl text-lg transition-colors"
        >
          🏆 Sıralama
        </Link>
      </div>

      {/* Özellikler */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 w-full max-w-3xl">
        {[
          { icon: "💧", title: "Sulayarak Kazan", desc: "Her sulama katkı puanı kazandırır. Cooldown: 1 saat." },
          { icon: "🌻", title: "Birlikte Büyüt", desc: "5 aşamalı büyüme: su ve zaman koşullarını birlikte karşılayın." },
          { icon: "🎯", title: "Adil Ödül", desc: "Olgunlaşınca ödül havuzu katkı oranına göre dağıtılır." },
        ].map(({ icon, title, desc }) => (
          <div key={title} className="bg-gray-900 border border-gray-800 rounded-xl p-5 text-left">
            <div className="text-3xl mb-2">{icon}</div>
            <h3 className="font-bold text-white mb-1">{title}</h3>
            <p className="text-sm text-gray-400">{desc}</p>
          </div>
        ))}
      </div>

      {/* Aşamalar */}
      <div className="w-full max-w-3xl bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h2 className="font-bold text-lg text-white mb-4">Büyüme Aşamaları</h2>
        <div className="flex gap-3 justify-around flex-wrap">
          {["🌱 Tohum", "🌿 Fide", "🍃 Genç", "🌻 Olgun", "🏆 Hasat"].map((s, i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <span className="text-2xl">{s.split(" ")[0]}</span>
              <span className="text-xs text-gray-400">{s.split(" ")[1]}</span>
              <span className="text-xs text-gray-600">Aşama {i + 1}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
