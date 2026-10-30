/// Kolektif Bahçe — bir topluluğun birlikte büyüttüğü zincir üstü bitki.
///
/// Akış: `create` → (`water` ... `grow`) × N → `fund` (istenen zamanda, olgunlaşmadan önce)
/// → olgunlaşma → her katılımcı `claim` ile kendi payını çeker (pull-based).
///
/// Pay hesabı: `toplam_fon * kullanici_puani / toplam_puan` (u128, önce çarpma sonra bölme).
/// Bölmeden kalan toz (dust) havuzda kalır; bu bilinçli bir tercihtir.
module kolektif_bahce::garden;

use std::string::String;
use sui::balance::{Self, Balance};
use sui::clock::Clock;
use sui::coin::{Self, Coin};
use sui::event;
use sui::sui::SUI;
use sui::table::{Self, Table};

// === Hata kodları (arayüz bu kodları okunur mesajlara çevirir) ===

const EInvalidParams: u64 = 0;
const ECooldownActive: u64 = 1;
const EAlreadyMatured: u64 = 2;
const ENotMatured: u64 = 3;
const ETooEarlyToGrow: u64 = 4;
const ENotEnoughWater: u64 = 5;
const EZeroAmount: u64 = 6;
const EAlreadyClaimed: u64 = 7;
const ENoContribution: u64 = 8;
const EDailyCapReached: u64 = 9;

// === Sabitler ===

const DAY_MS: u64 = 86_400_000;
/// Her sulama su seviyesini bu kadar artırır.
const WATER_PER_ACTION: u64 = 1;
/// Parametre üst sınırları (taşma ve saçma değerlere karşı).
const MAX_STAGES: u8 = 20;
const MAX_DURATION_MS: u64 = 30 * 86_400_000;
const MAX_POINTS: u64 = 1_000_000;

// === Nesneler ===

/// Yeni bahçe başlatma yetkisi. Paket yayınlanırken yayıncıya verilir.
public struct AdminCap has key, store {
    id: UID,
}

/// Bahçe oluşturulurken sabitlenen oyun parametreleri.
public struct Config has copy, drop, store {
    /// Olgunlaşma aşaması. `stage == max_stage` olduğunda bahçe olgundur.
    max_stage: u8,
    /// Bir aşama ilerlemesi için gereken su.
    water_per_stage: u64,
    /// İki aşama arasında geçmesi gereken en kısa süre.
    min_stage_duration_ms: u64,
    /// Aynı adres için iki sulama arasındaki bekleme.
    cooldown_ms: u64,
    /// Tam puanlı bir sulamanın değeri.
    base_points: u64,
    /// Adres başına günlük puan sınırı.
    daily_point_cap: u64,
    /// Günde bu kadar sulamadan sonra puan yarıya iner (azalan getiri).
    diminish_after: u64,
    /// Son aşamada (olgunlaşmaya yakın) puan bu sayıya bölünür.
    late_stage_divisor: u64,
}

/// Adresin o günkü sulama sayısı ve kazandığı puan.
public struct DailyStat has copy, drop, store {
    day: u64,
    count: u64,
    points: u64,
}

/// Paylaşılan bahçe nesnesi.
public struct Garden has key {
    id: UID,
    name: String,
    stage: u8,
    water_level: u64,
    last_water_ms: u64,
    last_growth_ms: u64,
    created_ms: u64,
    total_points: u64,
    contributions: Table<address, u64>,
    last_water_by: Table<address, u64>,
    daily: Table<address, DailyStat>,
    claimed: Table<address, bool>,
    /// Katkı sıralaması için katılımcı listesi (ilk sulamada eklenir).
    participants: vector<address>,
    reward_pool: Balance<SUI>,
    /// Olgunlaşmaya kadar eklenen toplam fon; pay hesabının tabanı.
    total_funded: u64,
    total_claimed: u64,
    matured: bool,
    config: Config,
}

// === Olaylar ===

public struct GardenCreated has copy, drop {
    garden_id: ID,
    creator: address,
    name: String,
    max_stage: u8,
    water_per_stage: u64,
    min_stage_duration_ms: u64,
    cooldown_ms: u64,
}

public struct Watered has copy, drop {
    garden_id: ID,
    by: address,
    points: u64,
    user_points: u64,
    total_points: u64,
    water_level: u64,
    stage: u8,
    timestamp_ms: u64,
}

public struct StageAdvanced has copy, drop {
    garden_id: ID,
    new_stage: u8,
    matured: bool,
    by: address,
    timestamp_ms: u64,
}

public struct Funded has copy, drop {
    garden_id: ID,
    by: address,
    amount: u64,
    total_funded: u64,
}

public struct Claimed has copy, drop {
    garden_id: ID,
    by: address,
    amount: u64,
    points: u64,
}

// === Başlatma ===

fun init(ctx: &mut TxContext) {
    transfer::public_transfer(AdminCap { id: object::new(ctx) }, ctx.sender());
}

// === Ana fonksiyonlar ===

/// Yeni bir ortak bahçe oluşturur ve paylaşır (F1).
public fun create(
    _: &AdminCap,
    name: String,
    max_stage: u8,
    water_per_stage: u64,
    min_stage_duration_ms: u64,
    cooldown_ms: u64,
    base_points: u64,
    daily_point_cap: u64,
    diminish_after: u64,
    late_stage_divisor: u64,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    assert!(max_stage > 0 && max_stage <= MAX_STAGES, EInvalidParams);
    assert!(water_per_stage > 0 && water_per_stage <= MAX_POINTS, EInvalidParams);
    assert!(min_stage_duration_ms <= MAX_DURATION_MS, EInvalidParams);
    assert!(cooldown_ms <= MAX_DURATION_MS, EInvalidParams);
    assert!(base_points > 0 && base_points <= MAX_POINTS, EInvalidParams);
    assert!(daily_point_cap >= base_points && daily_point_cap <= MAX_POINTS, EInvalidParams);
    assert!(diminish_after > 0, EInvalidParams);
    assert!(late_stage_divisor > 0 && late_stage_divisor <= base_points, EInvalidParams);

    let now = clock.timestamp_ms();
    let config = Config {
        max_stage,
        water_per_stage,
        min_stage_duration_ms,
        cooldown_ms,
        base_points,
        daily_point_cap,
        diminish_after,
        late_stage_divisor,
    };
    let garden = Garden {
        id: object::new(ctx),
        name,
        stage: 0,
        water_level: 0,
        last_water_ms: 0,
        last_growth_ms: now,
        created_ms: now,
        total_points: 0,
        contributions: table::new(ctx),
        last_water_by: table::new(ctx),
        daily: table::new(ctx),
        claimed: table::new(ctx),
        participants: vector[],
        reward_pool: balance::zero(),
        total_funded: 0,
        total_claimed: 0,
        matured: false,
        config,
    };

    event::emit(GardenCreated {
        garden_id: object::id(&garden),
        creator: ctx.sender(),
        name: garden.name,
        max_stage,
        water_per_stage,
        min_stage_duration_ms,
        cooldown_ms,
    });
    transfer::share_object(garden);
}

/// Bahçeyi sular ve çağırana katkı puanı yazar (F2, F3).
/// Sybil/son-an önlemleri: adres cooldown'u, günlük puan sınırı,
/// azalan getiri ve son aşamada düşürülmüş puan çarpanı.
public fun water(garden: &mut Garden, clock: &Clock, ctx: &TxContext) {
    assert!(!garden.matured, EAlreadyMatured);
    let now = clock.timestamp_ms();
    let sender = ctx.sender();

    // Cooldown (yalnızca Clock zamanı kullanılır).
    if (garden.last_water_by.contains(sender)) {
        let last = *garden.last_water_by.borrow(sender);
        assert!(now >= last + garden.config.cooldown_ms, ECooldownActive);
        *garden.last_water_by.borrow_mut(sender) = now;
    } else {
        garden.last_water_by.add(sender, now);
    };

    // Günlük istatistik (gün değiştiyse sıfırlanır).
    let day = now / DAY_MS;
    let mut stat = if (garden.daily.contains(sender)) {
        *garden.daily.borrow(sender)
    } else {
        DailyStat { day, count: 0, points: 0 }
    };
    if (stat.day != day) {
        stat = DailyStat { day, count: 0, points: 0 };
    };
    let points = compute_points(&garden.config, garden.stage, &stat);
    assert!(points > 0, EDailyCapReached);

    stat.count = stat.count + 1;
    stat.points = stat.points + points;
    if (garden.daily.contains(sender)) {
        *garden.daily.borrow_mut(sender) = stat;
    } else {
        garden.daily.add(sender, stat);
    };

    // Katkı kaydı.
    let user_points = if (garden.contributions.contains(sender)) {
        let p = garden.contributions.borrow_mut(sender);
        *p = *p + points;
        *p
    } else {
        garden.contributions.add(sender, points);
        garden.participants.push_back(sender);
        points
    };
    garden.total_points = garden.total_points + points;
    garden.water_level = garden.water_level + WATER_PER_ACTION;
    garden.last_water_ms = now;

    event::emit(Watered {
        garden_id: object::id(garden),
        by: sender,
        points,
        user_points,
        total_points: garden.total_points,
        water_level: garden.water_level,
        stage: garden.stage,
        timestamp_ms: now,
    });
}

/// Zaman ve su koşulu sağlanmışsa bahçeyi bir aşama ilerletir (F4).
/// Herkes çağırabilir; son aşamada bahçe olgunlaşır.
public fun grow(garden: &mut Garden, clock: &Clock, ctx: &TxContext) {
    assert!(!garden.matured, EAlreadyMatured);
    let now = clock.timestamp_ms();
    assert!(now >= garden.last_growth_ms + garden.config.min_stage_duration_ms, ETooEarlyToGrow);
    assert!(garden.water_level >= garden.config.water_per_stage, ENotEnoughWater);

    garden.water_level = garden.water_level - garden.config.water_per_stage;
    garden.stage = garden.stage + 1;
    garden.last_growth_ms = now;
    if (garden.stage >= garden.config.max_stage) {
        garden.matured = true;
    };

    event::emit(StageAdvanced {
        garden_id: object::id(garden),
        new_stage: garden.stage,
        matured: garden.matured,
        by: ctx.sender(),
        timestamp_ms: now,
    });
}

/// Ödül havuzuna SUI ekler (F5). Pay tabanının sabit kalması için
/// yalnızca olgunlaşmadan önce fonlanabilir.
public fun fund(garden: &mut Garden, payment: Coin<SUI>, ctx: &TxContext) {
    assert!(!garden.matured, EAlreadyMatured);
    let amount = payment.value();
    assert!(amount > 0, EZeroAmount);

    garden.reward_pool.join(payment.into_balance());
    garden.total_funded = garden.total_funded + amount;

    event::emit(Funded {
        garden_id: object::id(garden),
        by: ctx.sender(),
        amount,
        total_funded: garden.total_funded,
    });
}

/// Olgun bahçeden çağıranın payını çeker (F6, F7). Her adres yalnızca bir kez claim edebilir.
public fun claim(garden: &mut Garden, ctx: &mut TxContext): Coin<SUI> {
    assert!(garden.matured, ENotMatured);
    let sender = ctx.sender();
    assert!(!garden.claimed.contains(sender), EAlreadyClaimed);
    assert!(garden.contributions.contains(sender), ENoContribution);

    let points = *garden.contributions.borrow(sender);
    let amount = share_of(garden.total_funded, points, garden.total_points);

    garden.claimed.add(sender, true);
    garden.total_claimed = garden.total_claimed + amount;

    event::emit(Claimed { garden_id: object::id(garden), by: sender, amount, points });
    coin::take(&mut garden.reward_pool, amount, ctx)
}

// === Yardımcılar ===

/// Bu sulamanın kazandıracağı puan. Günlük sınır doluysa 0 döner.
fun compute_points(config: &Config, stage: u8, stat: &DailyStat): u64 {
    if (stat.points >= config.daily_point_cap) return 0;
    let mut points = config.base_points;
    if (stat.count >= config.diminish_after) {
        points = points / 2;
    };
    // Olgunlaşmadan önceki son aşama: son an kapma önlemi.
    if (stage + 1 >= config.max_stage) {
        points = points / config.late_stage_divisor;
    };
    if (points == 0) points = 1;
    let remaining = config.daily_point_cap - stat.points;
    if (points > remaining) remaining else points
}

/// Önce çarpma sonra bölme; u128 ile taşma olmaz.
fun share_of(total_funded: u64, points: u64, total_points: u64): u64 {
    if (total_points == 0) return 0;
    ((total_funded as u128) * (points as u128) / (total_points as u128)) as u64
}

// === Okuma fonksiyonları ===

public fun name(garden: &Garden): String { garden.name }

public fun stage(garden: &Garden): u8 { garden.stage }

public fun water_level(garden: &Garden): u64 { garden.water_level }

public fun last_water_ms(garden: &Garden): u64 { garden.last_water_ms }

public fun last_growth_ms(garden: &Garden): u64 { garden.last_growth_ms }

public fun total_points(garden: &Garden): u64 { garden.total_points }

public fun total_funded(garden: &Garden): u64 { garden.total_funded }

public fun total_claimed(garden: &Garden): u64 { garden.total_claimed }

public fun pool_value(garden: &Garden): u64 { garden.reward_pool.value() }

public fun is_matured(garden: &Garden): bool { garden.matured }

public fun max_stage(garden: &Garden): u8 { garden.config.max_stage }

public fun cooldown_ms(garden: &Garden): u64 { garden.config.cooldown_ms }

public fun participants(garden: &Garden): vector<address> { garden.participants }

public fun points_of(garden: &Garden, user: address): u64 {
    if (garden.contributions.contains(user)) *garden.contributions.borrow(user) else 0
}

public fun has_claimed(garden: &Garden, user: address): bool {
    garden.claimed.contains(user)
}

/// Kullanıcının bir sonraki sulayabileceği zaman (ms). 0 = hemen.
public fun next_water_ms(garden: &Garden, user: address): u64 {
    if (garden.last_water_by.contains(user)) {
        *garden.last_water_by.borrow(user) + garden.config.cooldown_ms
    } else 0
}

/// Kullanıcının mevcut fon üzerinden payı (claim edilmişse 0).
public fun pending_reward(garden: &Garden, user: address): u64 {
    if (garden.claimed.contains(user)) return 0;
    share_of(garden.total_funded, garden.points_of(user), garden.total_points)
}

public fun can_grow(garden: &Garden, clock: &Clock): bool {
    !garden.matured
        && clock.timestamp_ms() >= garden.last_growth_ms + garden.config.min_stage_duration_ms
        && garden.water_level >= garden.config.water_per_stage
}

// === Test yardımcıları ===

#[test_only]
public fun init_for_testing(ctx: &mut TxContext) { init(ctx) }

#[test_only]
public fun daily_points_of(garden: &Garden, user: address): u64 {
    if (garden.daily.contains(user)) garden.daily.borrow(user).points else 0
}
