# Kolektif Bahçe — arayüz

Next.js (App Router), TypeScript, Tailwind CSS ve `@mysten/dapp-kit-react` (gRPC istemcisi).

```bash
npm install
cp .env.example .env.local   # veya kökteki scripts/deploy.sh
npm run dev
```

| Yol | İçerik |
| --- | --- |
| `app/` | Sayfalar: ana sayfa, `/garden`, `/leaderboard`, `/harvest`, `/fund` |
| `lib/config.ts` | Ağ ve doğrulanmış paket/bahçe kimlikleri |
| `lib/garden.ts` | BCS şeması, zincirden okuma, işlem oluşturma |
| `lib/errors.ts` | Abort kodu → okunur mesaj |
| `hooks/` | Canlı veri (`useGarden`) ve işlem durumu (`useTx`) |
| `components/` | Bitki çizimi, su ölçer, işlem bandı, gezinme |

Cüzdanlar yalnızca tarayıcıda algılandığı için dApp Kit sağlayıcısı `ssr: false` ile yüklenir
(`components/Providers.tsx`).

Proje genel bakışı için kökteki [README](../README.md) dosyasına bak.
