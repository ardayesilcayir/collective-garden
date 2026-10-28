# Kolektif Bahçe — Ürün Gereksinimleri Dokümanı (PRD)

**Zincir / Dil:** Sui · Move\
**Arayüz:** Next.js

## 1. Özet

Kolektif Bahçe, bir topluluğun tek bir zincir üstü bitkiyi birlikte büyüttüğü bir dApp'tir. Bitki, Sui üzerinde **paylaşılan (shared) bir nesne** olarak yaşar. Kullanıcılar bitkiyi sular, her sulama işlemi katkı puanı kazandırır. Bitki olgunlaştığında oluşan ödül havuzu, katkı oranına göre katılımcılar arasında paylaştırılır.

Proje; zaman bağlı büyüme, paylaşılan durum, adil ödül dağıtımı ve kötüye kullanım önleme gibi gerçek smart contract problemlerini küçük ve anlaşılır bir ürün içinde bir araya getirir.

## 2. Projenin Amacı

### 2.1 Ürün amacı

- Küçük toplulukların (Discord/Telegram grupları, kampüs kulüpleri, DAO'lar) ortak ve canlı bir dijital varlık etrafında etkileşim kurmasını sağlamak.
- Katkıyı şeffaf ve doğrulanabilir biçimde ödüllendirmek.

### 2.2 Teknik / öğrenme amacı

- Move dilinde kaynak (resource) odaklı tasarım, Sui nesne modeli ve shared object kullanımını uygulamalı öğrenmek.
- Zaman kontrolü (Clock), erişim sınırlaması, pull-based ödeme ve olay (event) tasarımı gibi kontrat güvenliği konularını pratik etmek.
- Next.js ile cüzdan bağlantılı, zincir verisini okuyan ve işlem gönderen bir web arayüzü geliştirmek.
- Hackathon / portfolyo için tamamlanmış, sunulabilir bir ürün çıkarmak.

### 2.3 Tek cümlelik konumlandırma

> Topluluğunuzun birlikte büyüttüğü, katkıya göre ödül dağıtan zincir üstü bahçe.

## 3. Hedef Kitle

| Öncelik | Kitle | İhtiyaç |
| --- | --- | --- |
| Birincil | Web3 topluluk üyeleri | Cüzdanı olan, zincir üstü deneyler arayan kullanıcılar |
| Birincil | Discord/Telegram toplulukları, DAO'lar | Katılımı canlı tutan ortak bir hedef |
| İkincil | Kampüs kulüpleri | Düşük riskli, eğlenceli etkileşim aracı |
| İkincil | Web3'e yeni giren meraklılar | Testnet'te cüzdan ve işlem mantığını öğrenme |

Genel kitleye değil, birbirini tanıyan küçük gruplara odaklanılır.

## 4. Kapsam

### 4.1 Kapsam içi (MVP)

- Ortak bahçe (bitki) oluşturma
- Sulama ve katkı puanı kazanma
- Zaman ve suya bağlı aşama ilerlemesi
- Ödül havuzunu fonlama
- Olgunlaşınca katkı oranına göre ödül çekme (claim)
- Cüzdan bağlama, bahçe görüntüleme, sulama ve claim arayüzü
- Katkı sıralaması (leaderboard)
- Testnet'e deploy

### 4.2 Kapsam dışı (MVP sonrası)

- Ölümlü ve miras bırakan bitki mekaniği (bakımsız kalırsa solma, tohum bırakma)
- Bitki türleri ve nadirlik
- Gerçek hava verisiyle oracle entegrasyonu
- Mainnet yayını ve gerçek değerli ödüller
- Mobil uygulama

## 5. Kullanıcı Hikâyeleri

1. Bir kullanıcı olarak cüzdanımı bağlayıp mevcut bahçeyi ve durumunu görmek istiyorum.
2. Bir kullanıcı olarak bahçeyi sulayıp katkı puanı kazanmak istiyorum.
3. Bir kullanıcı olarak cooldown süresi dolmadan tekrar sulayamadığımı ve ne zaman sulayabileceğimi görmek istiyorum.
4. Bir sponsor/topluluk yöneticisi olarak ödül havuzuna SUI eklemek istiyorum.
5. Bir katılımcı olarak bitki olgunlaşınca payımı görmek ve çekmek istiyorum.
6. Bir kullanıcı olarak katkı sıralamasını görüp topluluktaki yerimi bilmek istiyorum.
7. Bir yönetici olarak yeni bir bahçe başlatabilmek istiyorum.

## 6. İşlevsel Gereksinimler

| No | Gereksinim | Öncelik |
| --- | --- | --- |
| F1 | Sistem, paylaşılan bir `Garden` nesnesi oluşturabilmelidir | Zorunlu |
| F2 | Kullanıcılar `water` ile bahçeyi sulayabilmeli, her işlem puan kazandırmalıdır | Zorunlu |
| F3 | Aynı adres için sulama cooldown'u zorlanmalıdır | Zorunlu |
| F4 | Bahçe aşaması; geçen zamana ve su seviyesine göre ilerlemelidir | Zorunlu |
| F5 | Ödül havuzuna SUI eklenebilmelidir (`fund`) | Zorunlu |
| F6 | Bahçe olgunlaşınca katılımcılar `claim` ile paylarını çekebilmelidir | Zorunlu |
| F7 | Bir adres aynı bahçeden yalnızca bir kez claim edebilmelidir | Zorunlu |
| F8 | Her önemli işlem için olay (event) yayınlanmalıdır | Zorunlu |
| F9 | Arayüz, bahçe durumunu ve kullanıcı katkısını canlı göstermelidir | Zorunlu |
| F10 | Katkı sıralaması gösterilebilmelidir | İstenen |

## 7. Teknoloji Yığını

### 7.1 Akıllı kontrat

- **Sui blockchain** (başlangıçta testnet)
- **Move** (Sui Move, 2024 sürümü sözdizimi)
- **Sui CLI** (derleme, test, deploy; `suiup` ile kurulum)
- **Move testleri** (`sui move test`) kontrat birim testleri için

### 7.2 Arayüz

- **Next.js** (App Router) ve **TypeScript**
- **@mysten/dapp-kit** — cüzdan bağlantısı, işlem imzalama ve veri okuma hook'ları
- **@mysten/sui** — Sui istemci SDK'sı
- **Slush** ve diğer Sui cüzdanları
- **Tailwind CSS** — hızlı ve tutarlı arayüz
- **Vercel** — arayüz yayını

### 7.3 Geliştirme araçları

- Git ve GitHub
- VS Code (Move için Sui Move eklentisi / move-analyzer)
- Sui Explorer — işlem ve nesne doğrulama

## 8. Kontrat Tasarımı

### 8.1 Ana nesne: `Garden` (shared)

| Alan | Tür | Açıklama |
| --- | --- | --- |
| `id` | UID | Nesne kimliği |
| `stage` | u8 | Mevcut büyüme aşaması (0..N) |
| `water_level` | u64 | Biriken su miktarı |
| `last_water_ms` | u64 | Son sulama zamanı |
| `last_growth_ms` | u64 | Son aşama ilerleme zamanı |
| `total_points` | u64 | Toplam katkı puanı |
| `contributions` | Table\<address, u64> | Adres → puan eşlemesi |
| `last_water_by` | Table\<address, u64> | Adres → son sulama zamanı (cooldown için) |
| `claimed` | Table\<address, bool> | Çift claim engeli |
| `reward_pool` | Balance\<SUI> | Ödül havuzu |
| `matured` | bool | Olgunlaşma durumu |

### 8.2 Fonksiyonlar

| Fonksiyon | Görev |
| --- | --- |
| `create` | Yeni ortak bahçe oluşturur ve paylaşır |
| `water` | Cooldown'u kontrol eder, su seviyesini artırır, puan yazar, olay yayınlar |
| `grow` | Zaman ve su koşulu sağlanmışsa aşamayı ilerletir; son aşamada `matured = true` yapar |
| `fund` | Ödül havuzuna SUI ekler |
| `claim` | Olgun bahçede, çağıranın payını `puan / toplam_puan` oranıyla hesaplayıp aktarır |

Zaman bilgisi için Sui'nin paylaşılan `Clock` nesnesi kullanılır.

### 8.3 Olaylar (events)

`GardenCreated`, `Watered`, `StageAdvanced`, `Funded`, `Claimed`. Arayüz ve leaderboard bu olaylardan beslenir.

### 8.4 Başlangıç parametreleri (ayarlanabilir)

- Aşama sayısı, aşama başına gereken su ve minimum bekleme süresi
- Adres başına sulama cooldown'u
- Günlük puan sınırı ve azalan getiri eşiği

Değerler sabitlenmeden önce testlerle dengelenir.

## 9. Güvenlik ve Kötüye Kullanım Önlemleri

| Risk | Önlem |
| --- | --- |
| Çoklu hesapla puan farmlama (Sybil) | Adres başına cooldown, günlük sınır, azalan getiri; MVP'de tam çözüm değil, azaltma hedeflenir |
| Son anda sulayıp pay kapma | Puanı aşamalara yayılmış katkıyla ağırlıklandırma veya olgunlaşmaya yakın pencerede puan çarpanını düşürme |
| Çift claim | `claimed` tablosu, claim sonrası kayıt |
| Toplu dağıtımda gas tükenmesi | Push yerine **pull-based claim**; her kullanıcı kendi payını çeker |
| Tamsayı bölme kayıpları | Pay hesabında çarpma önce, bölme sonra; kalan toz (dust) davranışı belgelenir |
| Yetkisiz yönetim | Parametre değişimi gerekiyorsa yetki için `AdminCap` nesnesi |
| Zaman manipülasyonu | Yalnızca Sui `Clock` nesnesi, istemciden gelen zaman verisi asla kullanılmaz |
| Frontend güvenliği | Özel anahtar/kurtarma ifadesi hiçbir koşulda istenmez; girdi doğrulama; yalnızca doğrulanmış paket ID'sine işlem gönderme |

Tüm kritik yollar için hem başarılı hem başarısız (abort) senaryo testi yazılır.

## 10. Arayüz Tasarımı

### 10.1 Sayfalar

1. **Ana sayfa:** Proje özeti, cüzdan bağla butonu
2. **Bahçe sayfası:** Bitki görseli (aşamaya göre), su seviyesi çubuğu, sonraki aşamaya kalan süre, "Sula" butonu, cooldown sayacı
3. **Katkı sıralaması:** Adres / puan / pay yüzdesi tablosu
4. **Hasat sayfası:** Kullanıcının payı, claim butonu, claim durumu
5. **Fonlama paneli:** Ödül havuzuna SUI ekleme

### 10.2 Arayüz gereksinimleri

- İşlem durumu (bekliyor / başarılı / hata) açıkça gösterilmelidir
- Cüzdan bağlı değilse işlem butonları devre dışı olmalıdır
- Hata mesajları kontrat abort kodlarıyla eşleşip anlaşılır metne çevrilmelidir
- Mobilde de kullanılabilir (responsive)

## 11. Geliştirme Adımları

### Faz 0 — Hazırlık

- Sui CLI kurulumu (`suiup`), `sui --version` doğrulaması
- Client yapılandırması, testnet ortamı, CLI adresi
- Faucet'ten test SUI alma (CLI adresine)
- Kurtarma ifadesinin çevrimdışı saklanması
- GitHub reposu oluşturma

**Çıktı:** Çalışan ortam, bakiyeli testnet adresi.

### Faz 1 — Kontrat iskeleti

- `sui move new kolektif_bahce` ile proje oluşturma
- `Garden` yapısı ve `create` fonksiyonu
- `sui move build` ile derleme

**Çıktı:** Derlenen temel modül.

### Faz 2 — Sulama ve puan sistemi

- `water` fonksiyonu, `Clock` ile cooldown
- `contributions` ve `total_points` güncellemesi
- `Watered` olayı
- Birim testleri

**Çıktı:** Cooldown'lu, puan veren sulama.

### Faz 3 — Büyüme mantığı

- `grow` fonksiyonu, aşama eşikleri
- Olgunlaşma durumu ve `StageAdvanced` olayı
- Sınır durumu testleri

**Çıktı:** Zaman ve suya bağlı aşama ilerlemesi.

### Faz 4 — Ödül havuzu ve claim

- `fund` fonksiyonu
- `claim` ile oransal pay, `claimed` kaydı
- Çift claim, olgun olmayan bahçede claim, sıfır puan gibi hata testleri

**Çıktı:** Güvenli ve adil ödül dağıtımı.

### Faz 5 — Güvenlik gözden geçirme

- Sybil ve son an katkı önlemlerinin gözden geçirilmesi
- Yetki modeli (`AdminCap`) kararı
- Tüm abort yollarının ve olayların kontrolü
- Kod incelemesi (kendi kendine kontrol listesi)

**Çıktı:** Testnet'e hazır, gözden geçirilmiş kontrat.

### Faz 6 — Testnet deploy

- `sui client publish` ile yayınlama
- Paket ID ve oluşan nesne kimliklerinin kaydı
- Explorer'da işlem doğrulama, CLI'dan manuel akış testi

**Çıktı:** Testnet'te çalışan kontrat.

### Faz 7 — Next.js arayüz

- Proje kurulumu (Next.js + TypeScript + Tailwind)
- dapp-kit ile cüzdan bağlantısı
- Bahçe nesnesini okuma ve durum gösterimi
- Sula, fonla, claim işlemleri
- Olaylardan leaderboard oluşturma
- Hata ve yükleniyor durumları

**Çıktı:** Uçtan uca çalışan arayüz.

### Faz 8 — Cila ve yayın

- Aşamaya göre bitki görselleri/animasyonlar
- Responsive düzenleme
- Vercel'e deploy
- README, mimari şema ve demo akışı

**Çıktı:** Sunulabilir MVP.

### Faz 9 — Genişletme (opsiyonel)

- Ölümlü ve miras bırakan bitki (solma, tohum nesnesi)
- Çoklu bahçe ve bahçe listesi
- Bitki türleri ve nadirlik
- Gerçek hava verisi için oracle

## 12. Test Stratejisi

- **Birim testleri (Move):** Her fonksiyon için başarılı ve beklenen-hatalı senaryolar; sahte zaman ilerletme ile cooldown ve büyüme testleri
- **Entegrasyon:** CLI ile testnet'te uçtan uca akış (create → water → grow → fund → claim)
- **Arayüz testi:** Farklı cüzdanlarla manuel akış, hatalı işlem senaryoları
- **Güvenlik kontrol listesi:** Çift claim, yetkisiz çağrı, sıfıra bölme, taşma, zaman manipülasyonu

## 13. Başarı Ölçütleri

- Tüm zorunlu gereksinimler (F1–F9) testnet'te çalışır
- Tüm Move testleri geçer; kritik hata yolları test kapsamındadır
- Farklı en az 3 cüzdanla tam bir bahçe döngüsü sorunsuz tamamlanır
- Arayüzden cüzdan bağlamadan claim'e kadar akış kesintisiz çalışır
- 3 dakikalık demo ile proje anlatılabilir

## 14. Riskler

| Risk | Etki | Azaltma |
| --- | --- | --- |
| Move/Sui'ye yeni olmak | Gecikme | Küçük adımlarla ilerleme, her adımda derleme ve test |
| Ödül dengesinin kötü ayarlanması | Haksız dağılım | Parametreleri testlerle ayarlama, MVP'de sabit ve basit kurallar |
| Sybil saldırıları | Adaletsizlik | MVP'de azaltma, ileride kimlik/davet mekanizması |
| Zincirden veri okuma karmaşıklığı | Arayüz gecikmesi | Olay tabanlı basit leaderboard, gerekirse sadece nesne alanlarını okuma |
| Kapsam büyümesi | Teslim gecikmesi | MVP kapsamı sabit, ek fikirler Faz 9'a |
