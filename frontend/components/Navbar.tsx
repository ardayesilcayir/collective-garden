"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import WalletButton from "./WalletButton";

const NAV = [
  { href: "/", label: "🏠 Ana Sayfa" },
  { href: "/garden", label: "🌱 Bahçe" },
  { href: "/leaderboard", label: "🏆 Sıralama" },
  { href: "/harvest", label: "🌾 Hasat" },
  { href: "/fund", label: "💰 Fonla" },
];

export default function Navbar() {
  const pathname = usePathname();
  return (
    <nav className="border-b border-gray-800 bg-gray-950 sticky top-0 z-50">
      <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <span className="text-xl font-bold text-emerald-400">🌿 Kolektif Bahçe</span>
          <div className="hidden sm:flex gap-1">
            {NAV.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  pathname === href
                    ? "bg-emerald-900 text-emerald-300 font-semibold"
                    : "text-gray-400 hover:text-gray-200 hover:bg-gray-800"
                }`}
              >
                {label}
              </Link>
            ))}
          </div>
        </div>
        <WalletButton />
      </div>
    </nav>
  );
}

