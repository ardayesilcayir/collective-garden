import { IS_CONFIGURED } from "@/lib/config";
import { friendlyError } from "@/lib/errors";

export function NotConfigured() {
  return (
    <div className="rounded-2xl border border-dashed border-line bg-paper-raised p-6">
      <h2 className="font-display text-xl font-semibold">Bahçe henüz bağlanmadı</h2>
      <p className="mt-2 max-w-prose text-ink-soft">
        Kontratı testnet&apos;e yükleyip <code>frontend/.env.local</code> dosyasına{" "}
        <code>NEXT_PUBLIC_PACKAGE_ID</code> ve <code>NEXT_PUBLIC_GARDEN_ID</code> değerlerini yaz. Depo
        kökündeki <code>scripts/deploy.sh</code> bunu senin için yapar.
      </p>
    </div>
  );
}

export function LoadError({ error }: { error: unknown }) {
  return (
    <div className="rounded-2xl border border-danger/40 bg-danger/10 p-6 text-danger">
      Bahçe okunamadı. {friendlyError(error)}
    </div>
  );
}

export function Loading({ label = "Bahçe okunuyor…" }: { label?: string }) {
  return <div className="py-16 text-center text-ink-soft">{label}</div>;
}

/** Yapılandırma yoksa uyarı, varsa içeriği gösterir. */
export function RequireConfig({ children }: { children: React.ReactNode }) {
  return IS_CONFIGURED ? <>{children}</> : <NotConfigured />;
}
