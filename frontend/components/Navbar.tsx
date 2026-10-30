"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { WalletButton } from "./Providers";

const LINKS = [
  { href: "/garden", label: "Bahçe" },
  { href: "/leaderboard", label: "Sıralama" },
  { href: "/harvest", label: "Hasat" },
  { href: "/fund", label: "Fonla" },
];

export function Navbar() {
  const pathname = usePathname();
  return (
    <header className="border-b border-line">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-display text-xl font-semibold">
          <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden>
            <path d="M13 24V11" stroke="var(--leaf-deep)" strokeWidth="2.4" strokeLinecap="round" />
            <path d="M13 13C13 7 8 4 3 5c0 5 4 8 10 8Z" fill="var(--leaf)" />
            <path d="M13 11c0-5 4-8 10-7 0 5-4 7-10 7Z" fill="var(--leaf-deep)" />
          </svg>
          Kolektif Bahçe
        </Link>
        <nav className="order-3 flex w-full gap-1 overflow-x-auto sm:order-none sm:w-auto" aria-label="Ana menü">
          {LINKS.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`whitespace-nowrap rounded-full px-3 py-1.5 text-[15px] transition-colors ${
                  active ? "bg-ink text-paper" : "text-ink-soft hover:bg-mist hover:text-ink"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto">
          <WalletButton />
        </div>
      </div>
    </header>
  );
}
