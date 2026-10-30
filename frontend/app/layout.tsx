import type { Metadata } from "next";
import { Bricolage_Grotesque, Figtree } from "next/font/google";
import { Navbar } from "@/components/Navbar";
import { Providers } from "@/components/Providers";
import "./globals.css";

const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin", "latin-ext"],
});

const figtree = Figtree({
  variable: "--font-figtree",
  subsets: ["latin", "latin-ext"],
});

export const metadata: Metadata = {
  title: "Kolektif Bahçe",
  description: "Topluluğunuzun birlikte büyüttüğü, katkıya göre ödül dağıtan zincir üstü bahçe.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="tr" className={`${bricolage.variable} ${figtree.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <Providers>
          <Navbar />
          <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-16 pt-6 sm:px-6">{children}</main>
        </Providers>
        <footer className="mx-auto w-full max-w-5xl px-4 py-6 text-sm text-ink-soft sm:px-6">
          Sui testnet üzerinde çalışır. Kurtarma ifadeni veya özel anahtarını hiçbir zaman isteyen
          olmaz; isteyen bir sayfa görürsen kapat.
        </footer>
      </body>
    </html>
  );
}
