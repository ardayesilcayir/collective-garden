#[test_only]
module kolektif_bahce::garden_tests;

use kolektif_bahce::garden::{Self, Garden, AdminCap};
use std::unit_test::{assert_eq, destroy};
use sui::clock::{Self, Clock};
use sui::coin;
use sui::sui::SUI;
use sui::test_scenario::{Self as ts, Scenario};

const ADMIN: address = @0xAD;
const ALICE: address = @0xA1;
const BOB: address = @0xB0;
const CAROL: address = @0xC0;

const DAY_MS: u64 = 86_400_000;
const START_MS: u64 = 1_000_000;

// Test parametreleri
const MAX_STAGE: u8 = 3;
const WATER_PER_STAGE: u64 = 2;
const MIN_STAGE_MS: u64 = 1_000;
const COOLDOWN_MS: u64 = 100;
const BASE_POINTS: u64 = 10;
const DAILY_CAP: u64 = 50;
const DIMINISH_AFTER: u64 = 3;
const LATE_DIVISOR: u64 = 2;

// === Yardımcılar ===

fun setup(): (Scenario, Clock) {
    let mut scenario = ts::begin(ADMIN);
    garden::init_for_testing(scenario.ctx());
    let mut clock = clock::create_for_testing(scenario.ctx());
    clock.set_for_testing(START_MS);

    scenario.next_tx(ADMIN);
    let cap = scenario.take_from_sender<AdminCap>();
    garden::create(
        &cap,
        b"Test Bahcesi".to_string(),
        MAX_STAGE,
        WATER_PER_STAGE,
        MIN_STAGE_MS,
        COOLDOWN_MS,
        BASE_POINTS,
        DAILY_CAP,
        DIMINISH_AFTER,
        LATE_DIVISOR,
        &clock,
        scenario.ctx(),
    );
    scenario.return_to_sender(cap);
    scenario.next_tx(ADMIN);
    (scenario, clock)
}

fun finish(scenario: Scenario, clock: Clock) {
    clock.destroy_for_testing();
    scenario.end();
}

fun water_as(scenario: &mut Scenario, user: address, clock: &Clock) {
    scenario.next_tx(user);
    let mut g = scenario.take_shared<Garden>();
    garden::water(&mut g, clock, scenario.ctx());
    ts::return_shared(g);
}

fun grow_as(scenario: &mut Scenario, user: address, clock: &Clock) {
    scenario.next_tx(user);
    let mut g = scenario.take_shared<Garden>();
    garden::grow(&mut g, clock, scenario.ctx());
    ts::return_shared(g);
}

fun fund_as(scenario: &mut Scenario, user: address, amount: u64) {
    scenario.next_tx(user);
    let mut g = scenario.take_shared<Garden>();
    let payment = coin::mint_for_testing<SUI>(amount, scenario.ctx());
    garden::fund(&mut g, payment, scenario.ctx());
    ts::return_shared(g);
}

/// Claim eder ve çekilen miktarı döner.
fun claim_as(scenario: &mut Scenario, user: address): u64 {
    scenario.next_tx(user);
    let mut g = scenario.take_shared<Garden>();
    let reward = garden::claim(&mut g, scenario.ctx());
    let amount = reward.value();
    destroy(reward);
    ts::return_shared(g);
    amount
}

fun points_of(scenario: &mut Scenario, user: address): u64 {
    scenario.next_tx(user);
    let g = scenario.take_shared<Garden>();
    let p = g.points_of(user);
    ts::return_shared(g);
    p
}

/// Bahçeyi bir aşama ilerletir: yeterli su + bekleme süresi.
fun advance_one_stage(scenario: &mut Scenario, clock: &mut Clock) {
    let mut i = 0;
    while (i < WATER_PER_STAGE) {
        clock.increment_for_testing(COOLDOWN_MS);
        water_as(scenario, ALICE, clock);
        i = i + 1;
    };
    clock.increment_for_testing(MIN_STAGE_MS);
    grow_as(scenario, ADMIN, clock);
}

// === create (F1) ===

#[test]
fun create_shares_garden_with_initial_state() {
    let (scenario, clock) = setup();
    let g = scenario.take_shared<Garden>();
    assert_eq!(g.stage(), 0);
    assert_eq!(g.water_level(), 0);
    assert_eq!(g.total_points(), 0);
    assert_eq!(g.pool_value(), 0);
    assert_eq!(g.max_stage(), MAX_STAGE);
    assert_eq!(g.last_growth_ms(), START_MS);
    assert!(!g.is_matured());
    ts::return_shared(g);
    finish(scenario, clock);
}

#[test, expected_failure(abort_code = garden::EInvalidParams)]
fun create_rejects_zero_stages() {
    let mut scenario = ts::begin(ADMIN);
    garden::init_for_testing(scenario.ctx());
    let clock = clock::create_for_testing(scenario.ctx());
    scenario.next_tx(ADMIN);
    let cap = scenario.take_from_sender<AdminCap>();
    garden::create(
        &cap, b"x".to_string(), 0, 1, 0, 0, 10, 10, 1, 1, &clock, scenario.ctx(),
    );
    abort
}

#[test, expected_failure(abort_code = garden::EInvalidParams)]
fun create_rejects_cap_below_base_points() {
    let mut scenario = ts::begin(ADMIN);
    garden::init_for_testing(scenario.ctx());
    let clock = clock::create_for_testing(scenario.ctx());
    scenario.next_tx(ADMIN);
    let cap = scenario.take_from_sender<AdminCap>();
    garden::create(
        &cap, b"x".to_string(), 3, 1, 0, 0, 10, 5, 1, 1, &clock, scenario.ctx(),
    );
    abort
}

// === water (F2, F3) ===

#[test]
fun water_adds_points_and_water() {
    let (mut scenario, clock) = setup();
    water_as(&mut scenario, ALICE, &clock);

    scenario.next_tx(ALICE);
    let g = scenario.take_shared<Garden>();
    assert_eq!(g.points_of(ALICE), BASE_POINTS);
    assert_eq!(g.total_points(), BASE_POINTS);
    assert_eq!(g.water_level(), 1);
    assert_eq!(g.participants(), vector[ALICE]);
    assert_eq!(g.next_water_ms(ALICE), START_MS + COOLDOWN_MS);
    ts::return_shared(g);
    finish(scenario, clock);
}

#[test, expected_failure(abort_code = garden::ECooldownActive)]
fun water_twice_within_cooldown_aborts() {
    let (mut scenario, mut clock) = setup();
    water_as(&mut scenario, ALICE, &clock);
    clock.increment_for_testing(COOLDOWN_MS - 1);
    water_as(&mut scenario, ALICE, &clock);
    finish(scenario, clock);
}

#[test]
fun water_after_cooldown_succeeds() {
    let (mut scenario, mut clock) = setup();
    water_as(&mut scenario, ALICE, &clock);
    clock.increment_for_testing(COOLDOWN_MS);
    water_as(&mut scenario, ALICE, &clock);
    assert_eq!(points_of(&mut scenario, ALICE), 2 * BASE_POINTS);
    finish(scenario, clock);
}

#[test]
fun cooldown_is_per_address() {
    let (mut scenario, clock) = setup();
    water_as(&mut scenario, ALICE, &clock);
    water_as(&mut scenario, BOB, &clock);

    scenario.next_tx(ADMIN);
    let g = scenario.take_shared<Garden>();
    assert_eq!(g.total_points(), 2 * BASE_POINTS);
    assert_eq!(g.participants(), vector[ALICE, BOB]);
    ts::return_shared(g);
    finish(scenario, clock);
}

#[test]
fun diminishing_returns_after_threshold() {
    let (mut scenario, mut clock) = setup();
    // İlk 3 sulama tam puan, 4. yarım puan.
    let mut i = 0;
    while (i < DIMINISH_AFTER + 1) {
        water_as(&mut scenario, ALICE, &clock);
        clock.increment_for_testing(COOLDOWN_MS);
        i = i + 1;
    };
    assert_eq!(points_of(&mut scenario, ALICE), DIMINISH_AFTER * BASE_POINTS + BASE_POINTS / 2);
    finish(scenario, clock);
}

#[test, expected_failure(abort_code = garden::EDailyCapReached)]
fun daily_cap_blocks_extra_watering() {
    let (mut scenario, mut clock) = setup();
    // 10+10+10+5+5+5+5 = 50 = DAILY_CAP, 8. sulama abort etmeli.
    let mut i = 0u64;
    while (i < 8) {
        water_as(&mut scenario, ALICE, &clock);
        clock.increment_for_testing(COOLDOWN_MS);
        i = i + 1;
    };
    finish(scenario, clock);
}

#[test]
fun daily_cap_resets_next_day() {
    let (mut scenario, mut clock) = setup();
    let mut i = 0u64;
    while (i < 7) {
        water_as(&mut scenario, ALICE, &clock);
        clock.increment_for_testing(COOLDOWN_MS);
        i = i + 1;
    };
    assert_eq!(points_of(&mut scenario, ALICE), DAILY_CAP);

    clock.increment_for_testing(DAY_MS);
    water_as(&mut scenario, ALICE, &clock);
    assert_eq!(points_of(&mut scenario, ALICE), DAILY_CAP + BASE_POINTS);

    scenario.next_tx(ALICE);
    let g = scenario.take_shared<Garden>();
    assert_eq!(garden::daily_points_of(&g, ALICE), BASE_POINTS);
    ts::return_shared(g);
    finish(scenario, clock);
}

#[test]
fun late_stage_points_are_reduced() {
    let (mut scenario, mut clock) = setup();
    // Aşama 0 -> 2 (MAX_STAGE - 1 = son aşama).
    advance_one_stage(&mut scenario, &mut clock);
    advance_one_stage(&mut scenario, &mut clock);

    let before = points_of(&mut scenario, BOB);
    water_as(&mut scenario, BOB, &clock);
    assert_eq!(points_of(&mut scenario, BOB) - before, BASE_POINTS / LATE_DIVISOR);
    finish(scenario, clock);
}

// === grow (F4) ===

#[test, expected_failure(abort_code = garden::ETooEarlyToGrow)]
fun grow_too_early_aborts() {
    let (mut scenario, mut clock) = setup();
    water_as(&mut scenario, ALICE, &clock);
    water_as(&mut scenario, BOB, &clock);
    clock.increment_for_testing(MIN_STAGE_MS - 1);
    grow_as(&mut scenario, ADMIN, &clock);
    finish(scenario, clock);
}

#[test, expected_failure(abort_code = garden::ENotEnoughWater)]
fun grow_without_enough_water_aborts() {
    let (mut scenario, mut clock) = setup();
    water_as(&mut scenario, ALICE, &clock);
    clock.increment_for_testing(MIN_STAGE_MS);
    grow_as(&mut scenario, ADMIN, &clock);
    finish(scenario, clock);
}

#[test]
fun grow_advances_stage_and_consumes_water() {
    let (mut scenario, mut clock) = setup();
    water_as(&mut scenario, ALICE, &clock);
    water_as(&mut scenario, BOB, &clock);
    water_as(&mut scenario, CAROL, &clock);
    clock.increment_for_testing(MIN_STAGE_MS);

    scenario.next_tx(ADMIN);
    let g = scenario.take_shared<Garden>();
    assert!(g.can_grow(&clock));
    ts::return_shared(g);

    grow_as(&mut scenario, ADMIN, &clock);

    scenario.next_tx(ADMIN);
    let g = scenario.take_shared<Garden>();
    assert_eq!(g.stage(), 1);
    assert_eq!(g.water_level(), 3 - WATER_PER_STAGE);
    assert_eq!(g.last_growth_ms(), START_MS + MIN_STAGE_MS);
    assert!(!g.is_matured());
    assert!(!g.can_grow(&clock));
    ts::return_shared(g);
    finish(scenario, clock);
}

#[test]
fun reaching_max_stage_matures_garden() {
    let (mut scenario, mut clock) = setup();
    advance_one_stage(&mut scenario, &mut clock);
    advance_one_stage(&mut scenario, &mut clock);
    advance_one_stage(&mut scenario, &mut clock);

    scenario.next_tx(ADMIN);
    let g = scenario.take_shared<Garden>();
    assert_eq!(g.stage(), MAX_STAGE);
    assert!(g.is_matured());
    ts::return_shared(g);
    finish(scenario, clock);
}

#[test, expected_failure(abort_code = garden::EAlreadyMatured)]
fun water_after_maturity_aborts() {
    let (mut scenario, mut clock) = setup();
    advance_one_stage(&mut scenario, &mut clock);
    advance_one_stage(&mut scenario, &mut clock);
    advance_one_stage(&mut scenario, &mut clock);
    clock.increment_for_testing(COOLDOWN_MS);
    water_as(&mut scenario, BOB, &clock);
    finish(scenario, clock);
}

#[test, expected_failure(abort_code = garden::EAlreadyMatured)]
fun grow_after_maturity_aborts() {
    let (mut scenario, mut clock) = setup();
    advance_one_stage(&mut scenario, &mut clock);
    advance_one_stage(&mut scenario, &mut clock);
    advance_one_stage(&mut scenario, &mut clock);
    clock.increment_for_testing(MIN_STAGE_MS);
    grow_as(&mut scenario, ADMIN, &clock);
    finish(scenario, clock);
}

// === fund (F5) ===

#[test]
fun fund_adds_to_pool() {
    let (mut scenario, clock) = setup();
    fund_as(&mut scenario, ADMIN, 1_000);
    fund_as(&mut scenario, BOB, 500);

    scenario.next_tx(ADMIN);
    let g = scenario.take_shared<Garden>();
    assert_eq!(g.pool_value(), 1_500);
    assert_eq!(g.total_funded(), 1_500);
    ts::return_shared(g);
    finish(scenario, clock);
}

#[test, expected_failure(abort_code = garden::EZeroAmount)]
fun fund_zero_aborts() {
    let (mut scenario, clock) = setup();
    fund_as(&mut scenario, ADMIN, 0);
    finish(scenario, clock);
}

#[test, expected_failure(abort_code = garden::EAlreadyMatured)]
fun fund_after_maturity_aborts() {
    let (mut scenario, mut clock) = setup();
    advance_one_stage(&mut scenario, &mut clock);
    advance_one_stage(&mut scenario, &mut clock);
    advance_one_stage(&mut scenario, &mut clock);
    fund_as(&mut scenario, ADMIN, 100);
    finish(scenario, clock);
}

// === claim (F6, F7) ===

#[test, expected_failure(abort_code = garden::ENotMatured)]
fun claim_before_maturity_aborts() {
    let (mut scenario, clock) = setup();
    water_as(&mut scenario, ALICE, &clock);
    fund_as(&mut scenario, ADMIN, 1_000);
    claim_as(&mut scenario, ALICE);
    finish(scenario, clock);
}

#[test]
fun claim_pays_proportional_share() {
    let (mut scenario, mut clock) = setup();
    fund_as(&mut scenario, ADMIN, 9_000);
    // BOB bir kez sular (10 puan), ALICE aşamaları ilerletir.
    water_as(&mut scenario, BOB, &clock);
    advance_one_stage(&mut scenario, &mut clock);
    advance_one_stage(&mut scenario, &mut clock);
    advance_one_stage(&mut scenario, &mut clock);

    let alice_points = points_of(&mut scenario, ALICE);
    let bob_points = points_of(&mut scenario, BOB);
    let total = alice_points + bob_points;

    scenario.next_tx(ALICE);
    let g = scenario.take_shared<Garden>();
    assert_eq!(g.total_points(), total);
    assert_eq!(g.pending_reward(ALICE), 9_000 * alice_points / total);
    ts::return_shared(g);

    let alice_amount = claim_as(&mut scenario, ALICE);
    let bob_amount = claim_as(&mut scenario, BOB);
    assert_eq!(alice_amount, 9_000 * alice_points / total);
    assert_eq!(bob_amount, 9_000 * bob_points / total);

    scenario.next_tx(ADMIN);
    let g = scenario.take_shared<Garden>();
    assert!(g.has_claimed(ALICE));
    assert!(g.has_claimed(BOB));
    assert_eq!(g.pending_reward(ALICE), 0);
    assert_eq!(g.total_claimed(), alice_amount + bob_amount);
    assert_eq!(g.pool_value(), 9_000 - alice_amount - bob_amount);
    ts::return_shared(g);
    finish(scenario, clock);
}

#[test]
fun integer_division_dust_stays_in_pool() {
    let (mut scenario, mut clock) = setup();
    fund_as(&mut scenario, ADMIN, 100);
    // Üç kullanıcı eşit puan: 100 / 3 = 33, 1 toz kalır.
    water_as(&mut scenario, ALICE, &clock);
    water_as(&mut scenario, BOB, &clock);
    water_as(&mut scenario, CAROL, &clock);
    clock.increment_for_testing(MIN_STAGE_MS);
    grow_as(&mut scenario, ADMIN, &clock);
    clock.increment_for_testing(MIN_STAGE_MS);
    // Olgunlaşmayı üç kullanıcının eşit sulamasıyla tamamlıyoruz.
    water_as(&mut scenario, ALICE, &clock);
    water_as(&mut scenario, BOB, &clock);
    water_as(&mut scenario, CAROL, &clock);
    grow_as(&mut scenario, ADMIN, &clock);
    clock.increment_for_testing(MIN_STAGE_MS);
    water_as(&mut scenario, ALICE, &clock);
    water_as(&mut scenario, BOB, &clock);
    water_as(&mut scenario, CAROL, &clock);
    grow_as(&mut scenario, ADMIN, &clock);

    assert_eq!(claim_as(&mut scenario, ALICE), 33);
    assert_eq!(claim_as(&mut scenario, BOB), 33);
    assert_eq!(claim_as(&mut scenario, CAROL), 33);

    scenario.next_tx(ADMIN);
    let g = scenario.take_shared<Garden>();
    assert!(g.is_matured());
    assert_eq!(g.pool_value(), 1);
    ts::return_shared(g);
    finish(scenario, clock);
}

#[test, expected_failure(abort_code = garden::EAlreadyClaimed)]
fun double_claim_aborts() {
    let (mut scenario, mut clock) = setup();
    fund_as(&mut scenario, ADMIN, 1_000);
    advance_one_stage(&mut scenario, &mut clock);
    advance_one_stage(&mut scenario, &mut clock);
    advance_one_stage(&mut scenario, &mut clock);
    claim_as(&mut scenario, ALICE);
    claim_as(&mut scenario, ALICE);
    finish(scenario, clock);
}

#[test, expected_failure(abort_code = garden::ENoContribution)]
fun claim_without_contribution_aborts() {
    let (mut scenario, mut clock) = setup();
    fund_as(&mut scenario, ADMIN, 1_000);
    advance_one_stage(&mut scenario, &mut clock);
    advance_one_stage(&mut scenario, &mut clock);
    advance_one_stage(&mut scenario, &mut clock);
    claim_as(&mut scenario, CAROL);
    finish(scenario, clock);
}

#[test]
fun claim_with_empty_pool_returns_zero() {
    let (mut scenario, mut clock) = setup();
    advance_one_stage(&mut scenario, &mut clock);
    advance_one_stage(&mut scenario, &mut clock);
    advance_one_stage(&mut scenario, &mut clock);
    assert_eq!(claim_as(&mut scenario, ALICE), 0);
    finish(scenario, clock);
}
