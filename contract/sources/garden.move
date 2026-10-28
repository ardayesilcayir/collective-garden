/// Kolektif Bahçe — Topluluk tarafından birlikte büyütülen zincir üstü bitki.
/// Sui Move 2024 sözdizimi kullanılmıştır.
#[allow(lint(self_transfer))]
module kolektif_bahce::garden {

    use sui::balance::{Self, Balance};
    use sui::clock::Clock;
    use sui::coin::{Self, Coin};
    use sui::event;
    use sui::sui::SUI;
    use sui::table::{Self, Table};

    // ─── Sabitler ──────────────────────────────────────────────────────────────

    /// Sulama arası minimum bekleme süresi: 1 saat (ms)
    const COOLDOWN_MS: u64 = 3_600_000;

    /// Toplam büyüme aşaması sayısı (0 = Tohum … 4 = Hasat)
    const MAX_STAGE: u8 = 4;

    /// Bir aşama için gereken minimum su (sulama sayısı)
    const WATER_PER_STAGE: u64 = 10;

    /// Bir aşama için gereken minimum süre (ms) — 1 saat
    const TIME_PER_STAGE_MS: u64 = 3_600_000;

    /// Her sulamada kazanılan temel puan
    const BASE_POINTS: u64 = 10;

    // ─── Hata Kodları ──────────────────────────────────────────────────────────

    /// Cooldown süresi henüz dolmadı
    const ECooldownNotElapsed: u64 = 1;

    /// Bahçe henüz olgunlaşmadı
    const ENotMatured: u64 = 2;

    /// Bu adres zaten claim etti
    const EAlreadyClaimed: u64 = 3;

    /// Kullanıcının hiç puanı yok
    const ENoContribution: u64 = 4;

    /// Bahçe zaten olgunlaşmış, daha fazla sulama kabul edilmiyor
    const EAlreadyMatured: u64 = 5;

    /// Ödül havuzu boş
    const EEmptyPool: u64 = 6;

    // ─── Olaylar ───────────────────────────────────────────────────────────────

    public struct GardenCreated has copy, drop {
        garden_id: address,
        creator: address,
        timestamp_ms: u64,
    }

    public struct Watered has copy, drop {
        garden_id: address,
        waterer: address,
        points_earned: u64,
        new_water_level: u64,
        timestamp_ms: u64,
    }

    public struct StageAdvanced has copy, drop {
        garden_id: address,
        new_stage: u8,
        matured: bool,
        timestamp_ms: u64,
    }

    public struct Funded has copy, drop {
        garden_id: address,
        funder: address,
        amount: u64,
        total_pool: u64,
        timestamp_ms: u64,
    }

    public struct Claimed has copy, drop {
        garden_id: address,
        claimer: address,
        amount: u64,
        timestamp_ms: u64,
    }

    // ─── AdminCap ──────────────────────────────────────────────────────────────

    /// Bahçe yöneticisine verilen yetki nesnesi.
    public struct AdminCap has key, store {
        id: UID,
    }

    // ─── Ana Nesne: Garden ─────────────────────────────────────────────────────

    public struct Garden has key {
        id: UID,
        /// 0 = Tohum, 1 = Fide, 2 = Genç Bitki, 3 = Olgun, 4 = Hasat (matured)
        stage: u8,
        /// Birikmiş toplam sulama sayısı (su seviyesi)
        water_level: u64,
        /// Son sulamanın gerçekleştiği an (ms) — büyüme zamanlaması için
        last_growth_ms: u64,
        /// Toplam katkı puanı (tüm kullanıcılar)
        total_points: u64,
        /// Adres → katkı puanı
        contributions: Table<address, u64>,
        /// Adres → son sulama zamanı (cooldown kontrolü)
        last_water_by: Table<address, u64>,
        /// Adres → claim edildi mi?
        claimed: Table<address, bool>,
        /// Ödül havuzu
        reward_pool: Balance<SUI>,
        /// Bahçe olgunlaştı mı?
        matured: bool,
    }

    // ─── Fonksiyonlar ──────────────────────────────────────────────────────────

    /// Yeni bir kolektif bahçe oluşturur.
    /// AdminCap oluşturucuya verilir; Garden herkese paylaşılır (shared).
    public fun create(clock: &Clock, ctx: &mut TxContext) {
        let admin_cap = AdminCap { id: object::new(ctx) };
        let garden = Garden {
            id: object::new(ctx),
            stage: 0,
            water_level: 0,
            last_growth_ms: clock.timestamp_ms(),
            total_points: 0,
            contributions: table::new(ctx),
            last_water_by: table::new(ctx),
            claimed: table::new(ctx),
            reward_pool: balance::zero(),
            matured: false,
        };

        event::emit(GardenCreated {
            garden_id: object::id_address(&garden),
            creator: ctx.sender(),
            timestamp_ms: clock.timestamp_ms(),
        });

        transfer::share_object(garden);
        transfer::transfer(admin_cap, ctx.sender());
    }

    /// Bahçeyi sular: cooldown kontrolü yapar, su seviyesini ve puanı artırır.
    public fun water(garden: &mut Garden, clock: &Clock, ctx: &mut TxContext) {
        assert!(!garden.matured, EAlreadyMatured);

        let sender = ctx.sender();
        let now_ms = clock.timestamp_ms();

        // Cooldown kontrolü
        if (table::contains(&garden.last_water_by, sender)) {
            let last_time = *table::borrow(&garden.last_water_by, sender);
            assert!(now_ms - last_time >= COOLDOWN_MS, ECooldownNotElapsed);
            *table::borrow_mut(&mut garden.last_water_by, sender) = now_ms;
        } else {
            table::add(&mut garden.last_water_by, sender, now_ms);
        };

        // Su seviyesini artır
        garden.water_level = garden.water_level + 1;

        // Puan ekle (azalan getiri: 6. sulamadan sonra %50 puan)
        let points = calculate_points(garden, sender);
        if (table::contains(&garden.contributions, sender)) {
            let existing = table::borrow_mut(&mut garden.contributions, sender);
            *existing = *existing + points;
        } else {
            table::add(&mut garden.contributions, sender, points);
        };
        garden.total_points = garden.total_points + points;

        event::emit(Watered {
            garden_id: object::id_address(garden),
            waterer: sender,
            points_earned: points,
            new_water_level: garden.water_level,
            timestamp_ms: now_ms,
        });
    }

    /// Zaman ve su koşulu sağlanmışsa bahçeyi bir aşama ilerletir.
    /// Son aşamaya ulaşıldığında `matured = true` yapar.
    public fun grow(garden: &mut Garden, clock: &Clock) {
        assert!(!garden.matured, EAlreadyMatured);

        let now_ms = clock.timestamp_ms();
        let elapsed_ms = now_ms - garden.last_growth_ms;

        // Bir sonraki aşama için gereken su eşiği
        let required_water = ((garden.stage as u64) + 1) * WATER_PER_STAGE;

        assert!(elapsed_ms >= TIME_PER_STAGE_MS, ECooldownNotElapsed);
        assert!(garden.water_level >= required_water, ECooldownNotElapsed);

        garden.stage = garden.stage + 1;
        garden.last_growth_ms = now_ms;

        if (garden.stage >= MAX_STAGE) {
            garden.matured = true;
        };

        event::emit(StageAdvanced {
            garden_id: object::id_address(garden),
            new_stage: garden.stage,
            matured: garden.matured,
            timestamp_ms: now_ms,
        });
    }

    /// Ödül havuzuna SUI ekler. Herkes fonlayabilir.
    public fun fund(garden: &mut Garden, payment: Coin<SUI>, clock: &Clock, ctx: &mut TxContext) {
        let amount = coin::value(&payment);
        assert!(amount > 0, EEmptyPool);

        let balance = coin::into_balance(payment);
        balance::join(&mut garden.reward_pool, balance);

        event::emit(Funded {
            garden_id: object::id_address(garden),
            funder: ctx.sender(),
            amount,
            total_pool: balance::value(&garden.reward_pool),
            timestamp_ms: clock.timestamp_ms(),
        });
    }

    /// Olgun bahçede, çağıranın katkı oranına göre ödül payını çeker.
    public fun claim(garden: &mut Garden, clock: &Clock, ctx: &mut TxContext) {
        assert!(garden.matured, ENotMatured);

        let sender = ctx.sender();

        // Çift claim engeli
        assert!(!table::contains(&garden.claimed, sender), EAlreadyClaimed);

        // Katkı puanı kontrolü
        assert!(table::contains(&garden.contributions, sender), ENoContribution);
        let user_points = *table::borrow(&garden.contributions, sender);
        assert!(user_points > 0, ENoContribution);

        // Oransal pay: (kullanıcı_puanı * toplam_havuz) / toplam_puan
        // Çarpma önce, bölme sonra — tamsayı kayıplarını en aza indirir
        let total_pool = balance::value(&garden.reward_pool);
        let share = (user_points * total_pool) / garden.total_points;
        assert!(share > 0, ENoContribution);

        // Claim kaydı
        table::add(&mut garden.claimed, sender, true);

        // Ödülü transfer et
        let reward_coin = coin::from_balance(
            balance::split(&mut garden.reward_pool, share),
            ctx,
        );

        event::emit(Claimed {
            garden_id: object::id_address(garden),
            claimer: sender,
            amount: share,
            timestamp_ms: clock.timestamp_ms(),
        });

        transfer::public_transfer(reward_coin, sender);
    }

    // ─── Yardımcı / View Fonksiyonları ────────────────────────────────────────

    /// Kullanıcının katkı puanını döndürür (0 = yoksa)
    public fun get_contribution(garden: &Garden, addr: address): u64 {
        if (table::contains(&garden.contributions, addr)) {
            *table::borrow(&garden.contributions, addr)
        } else {
            0
        }
    }

    /// Kullanıcının claim edip etmediğini döndürür
    public fun has_claimed(garden: &Garden, addr: address): bool {
        table::contains(&garden.claimed, addr)
    }

    /// Kullanıcının cooldown bitmesi için gereken ms cinsinden süreyi döndürür
    public fun cooldown_remaining_ms(garden: &Garden, addr: address, now_ms: u64): u64 {
        if (!table::contains(&garden.last_water_by, addr)) {
            return 0
        };
        let last = *table::borrow(&garden.last_water_by, addr);
        let elapsed = now_ms - last;
        if (elapsed >= COOLDOWN_MS) { 0 } else { COOLDOWN_MS - elapsed }
    }

    // Getters (arayüz için)
    public fun stage(garden: &Garden): u8 { garden.stage }
    public fun water_level(garden: &Garden): u64 { garden.water_level }
    public fun total_points(garden: &Garden): u64 { garden.total_points }
    public fun matured(garden: &Garden): bool { garden.matured }
    public fun reward_pool_value(garden: &Garden): u64 { balance::value(&garden.reward_pool) }

    // ─── İç Yardımcılar ───────────────────────────────────────────────────────

    /// Azalan getiri uygulamalı puan hesabı.
    /// Adresin 5'ten fazla sulaması varsa yarım puan alır.
    fun calculate_points(garden: &Garden, addr: address): u64 {
        if (!table::contains(&garden.contributions, addr)) {
            return BASE_POINTS
        };
        let existing = *table::borrow(&garden.contributions, addr);
        // Her 10 puanlık sulama = 1 sulama (BASE_POINTS = 10)
        let water_count = existing / BASE_POINTS;
        if (water_count >= 5) {
            BASE_POINTS / 2  // Azalan getiri: %50
        } else {
            BASE_POINTS
        }
    }

    // ─── Testler ───────────────────────────────────────────────────────────────
    #[test_only]
    public fun create_for_testing(clock: &Clock, ctx: &mut TxContext): Garden {
        Garden {
            id: object::new(ctx),
            stage: 0,
            water_level: 0,
            last_growth_ms: clock.timestamp_ms(),
            total_points: 0,
            contributions: table::new(ctx),
            last_water_by: table::new(ctx),
            claimed: table::new(ctx),
            reward_pool: balance::zero(),
            matured: false,
        }
    }

    #[test_only]
    public fun destroy_for_testing(garden: Garden) {
        let Garden {
            id,
            stage: _,
            water_level: _,
            last_growth_ms: _,
            total_points: _,
            contributions,
            last_water_by,
            claimed,
            reward_pool,
            matured: _,
        } = garden;
        object::delete(id);
        table::drop(contributions);
        table::drop(last_water_by);
        table::drop(claimed);
        balance::destroy_zero(reward_pool);
    }
}
