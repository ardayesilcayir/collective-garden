# Kolektif Bahçe

Topluluğunuzun birlikte büyüttüğü, katkıya göre ödül dağıtan zincir üstü bahçe.

Bitki Sui üzerinde **paylaşılan (shared) bir `Garden` nesnesi** olarak yaşar. Kullanıcılar bitkiyi
sular ve katkı puanı kazanır. Yeterli su ve süre birikince bitki aşama atlar; son aşamada çiçek açar
ve ödül havuzu puan oranına göre katılımcılar arasında paylaşılır. Her kullanıcı payını kendisi çeker.

Gereksinimler: [Kolektif Bahçe — Ürün Gereksinimleri Dokümanı (PRD).md](./Kolektif%20Bahçe%20—%20Ürün%20Gereksinimleri%20Dokümanı%20(PRD).md)

## Depo yapısı

```
contract/              Sui Move paketi (kolektif_bahce)
  sources/garden.move  Garden nesnesi, create / water / grow / fund / claim, olaylar
  tests/garden_tests.move  26 birim testi (başarılı ve abort senaryoları)
frontend/              Next.js (App Router) + TypeScript + Tailwind + dApp Kit
scripts/deploy.sh      Yayınla, bahçe oluştur, frontend/.env.local yaz
scripts/smoke.sh       CLI ile uçtan uca akış testi
deployments/           Ağ başına paket/nesne kimlikleri (deploy.sh yazar)
```

## Mimari

```
 Cüzdan (Slush vb.)                     Sui ağı
 ┌──────────────┐  imzala & gönder  ┌──────────────────────────────────┐
 │  Next.js UI  │ ────────────────▶ │ kolektif_bahce::garden           │
 │  dApp Kit    │                   │  Garden (shared)                 │
 │              │ ◀──────────────── │   contributions / claimed ...    │
 └──────────────┘  gRPC: nesne oku, │   reward_pool: Balance<SUI>      │
        │          view simülasyonu,│  AdminCap (yayıncıda)            │
        │          olay listesi     │  Clock 0x6 (zaman kaynağı)       │
        ▼                           └──────────────────────────────────┘
 Bahçe · Sıralama · Hasat · Fonla
```

- **Okuma:** `Garden` nesnesi BCS olarak okunur. Kullanıcıya özel değerler (`points_of`,
  `has_claimed`, `next_water_ms`, `pending_reward`) kontratın okuma fonksiyonları simüle edilerek
  alınır. Sıralama, nesnedeki `participants` listesi ve `points_of` ile hesaplanır. "Son
  hareketler" akışı kontrat olaylarından gelir.
- **Yazma:** Her işlem cüzdanda imzalanır. İstemci zamanı kullanılmaz; kontrat yalnızca `Clock`
  nesnesini okur.

## Kontrat

| Fonksiyon | Görev |
| --- | --- |
| `create(&AdminCap, ...)` | Parametrelerle yeni bahçe oluşturur ve paylaşır |
| `water(garden, clock)` | Cooldown ve günlük sınırı kontrol eder, su ve puan ekler |
| `grow(garden, clock)` | Su ve süre yeterliyse aşama ilerletir; son aşamada `matured = true` |
| `fund(garden, coin)` | Olgunlaşmadan önce havuza SUI ekler |
| `claim(garden): Coin<SUI>` | Olgun bahçede `toplam_fon × puan ÷ toplam_puan` payını verir, bir kez |

Olaylar: `GardenCreated`, `Watered`, `StageAdvanced`, `Funded`, `Claimed`.

### Abort kodları

| Kod | Sabit | Anlamı |
| --- | --- | --- |
| 0 | `EInvalidParams` | Bahçe parametreleri geçersiz |
| 1 | `ECooldownActive` | Adresin sulama beklemesi dolmadı |
| 2 | `EAlreadyMatured` | Olgun bahçede sulama / büyütme / fonlama |
| 3 | `ENotMatured` | Olgunlaşmadan claim |
| 4 | `ETooEarlyToGrow` | Aşama süresi dolmadı |
| 5 | `ENotEnoughWater` | Aşama için su yetersiz |
| 6 | `EZeroAmount` | Sıfır SUI ile fonlama |
| 7 | `EAlreadyClaimed` | Çift claim |
| 8 | `ENoContribution` | Katkısı olmayan adres claim etmeye çalıştı |
| 9 | `EDailyCapReached` | Günlük puan sınırı doldu |

Arayüz bu kodları [frontend/lib/errors.ts](frontend/lib/errors.ts) içinde Türkçe mesajlara çevirir.

### Güvenlik ve adalet kararları

- **Sybil azaltma:** adres başına cooldown, günlük puan sınırı ve gün içinde `diminish_after`
  sulamadan sonra yarıya inen puan. Tam çözüm değildir; çok hesaplı saldırıyı pahalılaştırır.
- **Son an kapma:** olgunlaşmadan önceki son aşamada puan `late_stage_divisor`'a bölünür.
- **Çift claim:** `claimed` tablosu.
- **Gas tükenmesi:** toplu gönderim yok; her kullanıcı kendi payını çeker (pull-based).
- **Bölme kayıpları:** önce çarpma sonra bölme, `u128` ile. Kalan toz (birkaç MIST) havuzda kalır;
  bu `integer_division_dust_stays_in_pool` testiyle belgelenmiştir.
- **Pay tabanı sabit:** olgunlaştıktan sonra fonlama kapalıdır; böylece erken ve geç claim eden aynı
  oranı alır.
- **Yetki:** yeni bahçeyi yalnızca `AdminCap` sahibi başlatır. Parametreler bahçe oluşturulurken
  sabitlenir ve sonradan değiştirilemez.
- **Zaman:** yalnızca Sui `Clock` (`0x6`).
- **Arayüz:** kurtarma ifadesi veya özel anahtar hiçbir yerde istenmez; paket ve bahçe kimlikleri
  biçim olarak doğrulanır ve okunan nesnenin türü yapılandırılan paketle eşleşmezse veri kullanılmaz.

## Kurulum

Gerekenler: [Sui CLI](https://docs.sui.io/guides/developer/getting-started/sui-install) (`suiup`),
Node.js 20+.

```bash
cd contract
sui move build
sui move test
```

```bash
cd frontend
npm install
npm run dev
```

`frontend/.env.local` yoksa arayüz "Bahçe henüz bağlanmadı" uyarısı gösterir. Örnek:
[frontend/.env.example](frontend/.env.example).

## Testnet'e yayınlama

1. CLI'ı testnet'e al ve adresine test SUI yükle. Testnet faucet'i artık yalnızca web üzerinden
   veriyor:

   ```bash
   sui client switch --env testnet
   ```

   Ardından `https://faucet.sui.io/?address=<adresin>` sayfasından SUI iste
   (`sui client active-address` adresini gösterir).

2. Yayınla ve bahçeyi oluştur:

   ```bash
   ./scripts/deploy.sh
   ```

   Parametreler ortam değişkeniyle değiştirilebilir (`GARDEN_NAME`, `MAX_STAGE`,
   `WATER_PER_STAGE`, `MIN_STAGE_MS`, `COOLDOWN_MS`, `BASE_POINTS`, `DAILY_POINT_CAP`,
   `DIMINISH_AFTER`, `LATE_STAGE_DIVISOR`). Varsayılanlar 3 dakikalık demoya göre kısa tutuldu:
   5 aşama, aşama başına 5 sulama, aşamalar arası 2 dk, sulama beklemesi 30 sn.

   Script `frontend/.env.local` ve `deployments/testnet.json` dosyalarını yazar. Aynı paketi
   testnet'e yeniden yayınlamak için `contract/Published.toml` içindeki testnet kaydını sil; yalnızca
   yeni bir bahçe istiyorsan `create`'i AdminCap ile tekrar çağırman yeterli.

3. İsteğe bağlı uçtan uca CLI testi (bahçeyi olgunlaştırır; kısa parametreli bir test bahçesinde
   çalıştır):

   ```bash
   ./scripts/smoke.sh
   ```

### Yerel ağda deneme

```bash
sui start --with-faucet --force-regenesis
sui client switch --env local
sui client faucet
MIN_STAGE_MS=5000 COOLDOWN_MS=2000 WATER_PER_STAGE=2 MAX_STAGE=3 ./scripts/deploy.sh
./scripts/smoke.sh
```

## Vercel'e yayın

Vercel'de proje kökü olarak `frontend` klasörünü seç ve şu ortam değişkenlerini ekle:
`NEXT_PUBLIC_SUI_NETWORK`, `NEXT_PUBLIC_PACKAGE_ID`, `NEXT_PUBLIC_GARDEN_ID`
(değerler `deployments/testnet.json` içinde).

## 3 dakikalık demo akışı

1. **Ana sayfa:** tek cümlelik fikir, canlı bitki ve bahçe döngüsü.
2. **Fonla:** sponsor cüzdanıyla havuza 1 SUI ekle.
3. **Bahçe:** iki üç farklı cüzdanla sula. Cooldown sayacını ve çift sulamada çıkan "Bekleme süren
   dolmadı" mesajını göster.
4. Su ölçeri dolup süre geçince **Bitkiyi büyüt**; bitki görseli bir aşama büyür.
5. **Sıralama:** adres, puan ve pay yüzdesi; son hareketler akışı.
6. Son aşamada puanın düştüğünü göster, bitkiyi çiçeğe taşı.
7. **Hasat:** payını çek; ikinci denemede "Bu bahçeden payını zaten çektin" mesajı.

## Yol haritası (MVP sonrası)

Solan ve tohum bırakan bitki, çoklu bahçe listesi, bitki türleri ve nadirlik, hava verisi oracle'ı.
