#[test_only]
module kolektif_bahce::garden_tests {
    use sui::clock;
    use sui::coin;
    use sui::sui::SUI;
    use sui::test_scenario::{Self as ts};
    use kolektif_bahce::garden::{Self, Garden};

    // Test adresleri
    const ALICE: address = @0xA11CE;
    const BOB: address   = @0xB0B;
    const CAROL: address = @0xCA901;

    // ─── Yardımcı: zaman ilerlet ──────────────────────────────────────────────

    /// Saati `ms` kadar ilerletir
    fun advance_clock(clock: &mut clock::Clock, ms: u64) {
        clock.increment_for_testing(ms);
    }

    // ─── Test 1: create ────────────────────────────────────────────────────────

    #[test]
    fun test_create_garden() {
        let mut scenario = ts::begin(ALICE);
        let mut clock = clock::create_for_testing(scenario.ctx());

        {
            garden::create(&clock, scenario.ctx());
        };

        // AdminCap Alice'e gitmeli
        scenario.next_tx(ALICE);
        {
            let _cap = scenario.take_from_sender<garden::AdminCap>();
            ts::return_to_sender(&scenario, _cap);
        };

        clock.destroy_for_testing();
        scenario.end();
    }

    // ─── Test 2: water — başarılı ─────────────────────────────────────────────

    #[test]
    fun test_water_success() {
        let mut scenario = ts::begin(ALICE);
        let mut clock = clock::create_for_testing(scenario.ctx());

        {
            garden::create(&clock, scenario.ctx());
        };

        scenario.next_tx(ALICE);
        {
            let mut garden = scenario.take_shared<Garden>();
            garden::water(&mut garden, &clock, scenario.ctx());
            assert!(garden::water_level(&garden) == 1, 0);
            assert!(garden::get_contribution(&garden, ALICE) == 10, 1);
            ts::return_shared(garden);
        };

        clock.destroy_for_testing();
        scenario.end();
    }

    // ─── Test 3: water — cooldown hatası ──────────────────────────────────────

    #[test]
    #[expected_failure(abort_code = garden::ECooldownNotElapsed)]
    fun test_water_cooldown_fail() {
        let mut scenario = ts::begin(ALICE);
        let mut clock = clock::create_for_testing(scenario.ctx());

        {
            garden::create(&clock, scenario.ctx());
        };

        scenario.next_tx(ALICE);
        {
            let mut garden = scenario.take_shared<Garden>();
            garden::water(&mut garden, &clock, scenario.ctx());
            // Cooldown dolmadan tekrar sula → HATA
            garden::water(&mut garden, &clock, scenario.ctx());
            ts::return_shared(garden);
        };

        clock.destroy_for_testing();
        scenario.end();
    }

    // ─── Test 4: grow — başarılı ──────────────────────────────────────────────

    #[test]
    fun test_grow_success() {
        let mut scenario = ts::begin(ALICE);
        let mut clock = clock::create_for_testing(scenario.ctx());

        {
            garden::create(&clock, scenario.ctx());
        };

        // 10 kez sula (farklı kullanıcılar, cooldown yok sorun çıkmasın diye)
        let mut i = 0u8;
        while (i < 10) {
            // Her kullanıcı bir kez sula
            let addr = if (i % 2 == 0) { ALICE } else { BOB };
            scenario.next_tx(addr);
            {
                let mut garden = scenario.take_shared<Garden>();
                garden::water(&mut garden, &clock, scenario.ctx());
                ts::return_shared(garden);
            };
            advance_clock(&mut clock, 3_600_001); // 1 saat + 1 ms
            i = i + 1;
        };

        // grow çağır
        scenario.next_tx(ALICE);
        {
            let mut garden = scenario.take_shared<Garden>();
            garden::grow(&mut garden, &clock);
            assert!(garden::stage(&garden) == 1, 0);
            ts::return_shared(garden);
        };

        clock.destroy_for_testing();
        scenario.end();
    }

    // ─── Test 5: fund + claim ─────────────────────────────────────────────────

    #[test]
    fun test_fund_and_claim() {
        let mut scenario = ts::begin(ALICE);
        let mut clock = clock::create_for_testing(scenario.ctx());

        {
            garden::create(&clock, scenario.ctx());
        };

        // 4 aşamayı tamamla (her aşama 10 su + 1 saat)
        // Her aşama için 10 farklı sulama
        let stages_needed: u8 = 4;
        let mut stage_i = 0u8;
        while (stage_i < stages_needed) {
            // Bu aşama için yeterli su ekle
            let mut water_i = 0u8;
            while (water_i < 10) {
                let addr = if (water_i % 2 == 0) { ALICE } else { BOB };
                scenario.next_tx(addr);
                {
                    let mut garden = scenario.take_shared<Garden>();
                    garden::water(&mut garden, &clock, scenario.ctx());
                    ts::return_shared(garden);
                };
                advance_clock(&mut clock, 3_600_001);
                water_i = water_i + 1;
            };
            // grow
            scenario.next_tx(ALICE);
            {
                let mut garden = scenario.take_shared<Garden>();
                garden::grow(&mut garden, &clock);
                ts::return_shared(garden);
            };
            stage_i = stage_i + 1;
        };

        // Ödül havuzunu fonla (1 SUI = 1_000_000_000 MIST)
        scenario.next_tx(CAROL);
        {
            let mut garden = scenario.take_shared<Garden>();
            let payment = coin::mint_for_testing<SUI>(1_000_000_000, scenario.ctx());
            garden::fund(&mut garden, payment, &clock, scenario.ctx());
            assert!(garden::reward_pool_value(&garden) == 1_000_000_000, 0);
            ts::return_shared(garden);
        };

        // Alice claim ediyor
        scenario.next_tx(ALICE);
        {
            let mut garden = scenario.take_shared<Garden>();
            assert!(garden::matured(&garden), 1);
            garden::claim(&mut garden, &clock, scenario.ctx());
            assert!(garden::has_claimed(&garden, ALICE), 2);
            ts::return_shared(garden);
        };

        // Alice tekrar claim edemez
        // (ayrı test_expected_failure testinde)

        clock.destroy_for_testing();
        scenario.end();
    }

    // ─── Test 6: çift claim engeli ────────────────────────────────────────────

    #[test]
    #[expected_failure(abort_code = garden::EAlreadyClaimed)]
    fun test_double_claim_fail() {
        let mut scenario = ts::begin(ALICE);
        let mut clock = clock::create_for_testing(scenario.ctx());

        {
            garden::create(&clock, scenario.ctx());
        };

        // Bahçeyi hızlıca olgunlaştır
        let mut stage_i = 0u8;
        while (stage_i < 4) {
            let mut water_i = 0u8;
            while (water_i < 10) {
                let addr = if (water_i % 2 == 0) { ALICE } else { BOB };
                scenario.next_tx(addr);
                {
                    let mut garden = scenario.take_shared<Garden>();
                    garden::water(&mut garden, &clock, scenario.ctx());
                    ts::return_shared(garden);
                };
                advance_clock(&mut clock, 3_600_001);
                water_i = water_i + 1;
            };
            scenario.next_tx(ALICE);
            {
                let mut garden = scenario.take_shared<Garden>();
                garden::grow(&mut garden, &clock);
                ts::return_shared(garden);
            };
            stage_i = stage_i + 1;
        };

        scenario.next_tx(CAROL);
        {
            let mut garden = scenario.take_shared<Garden>();
            let payment = coin::mint_for_testing<SUI>(1_000_000_000, scenario.ctx());
            garden::fund(&mut garden, payment, &clock, scenario.ctx());
            ts::return_shared(garden);
        };

        scenario.next_tx(ALICE);
        {
            let mut garden = scenario.take_shared<Garden>();
            garden::claim(&mut garden, &clock, scenario.ctx());
            // İkinci claim → HATA
            garden::claim(&mut garden, &clock, scenario.ctx());
            ts::return_shared(garden);
        };

        clock.destroy_for_testing();
        scenario.end();
    }

    // ─── Test 7: olgunlaşmamış bahçede claim hatası ───────────────────────────

    #[test]
    #[expected_failure(abort_code = garden::ENotMatured)]
    fun test_claim_not_matured_fail() {
        let mut scenario = ts::begin(ALICE);
        let mut clock = clock::create_for_testing(scenario.ctx());

        {
            garden::create(&clock, scenario.ctx());
        };

        scenario.next_tx(ALICE);
        {
            let mut garden = scenario.take_shared<Garden>();
            garden::water(&mut garden, &clock, scenario.ctx());
            // Olgunlaşmadan claim → HATA
            garden::claim(&mut garden, &clock, scenario.ctx());
            ts::return_shared(garden);
        };

        clock.destroy_for_testing();
        scenario.end();
    }

    // ─── Test 8: katkısı olmayan adres claim edemez ───────────────────────────

    #[test]
    #[expected_failure(abort_code = garden::ENoContribution)]
    fun test_claim_no_contribution_fail() {
        let mut scenario = ts::begin(ALICE);
        let mut clock = clock::create_for_testing(scenario.ctx());

        {
            garden::create(&clock, scenario.ctx());
        };

        // Bahçeyi olgunlaştır ama CAROL su vermeden claim etmeye çalışsın
        let mut stage_i = 0u8;
        while (stage_i < 4) {
            let mut water_i = 0u8;
            while (water_i < 10) {
                let addr = if (water_i % 2 == 0) { ALICE } else { BOB };
                scenario.next_tx(addr);
                {
                    let mut garden = scenario.take_shared<Garden>();
                    garden::water(&mut garden, &clock, scenario.ctx());
                    ts::return_shared(garden);
                };
                advance_clock(&mut clock, 3_600_001);
                water_i = water_i + 1;
            };
            scenario.next_tx(ALICE);
            {
                let mut garden = scenario.take_shared<Garden>();
                garden::grow(&mut garden, &clock);
                ts::return_shared(garden);
            };
            stage_i = stage_i + 1;
        };

        scenario.next_tx(CAROL);
        {
            let mut garden = scenario.take_shared<Garden>();
            let payment = coin::mint_for_testing<SUI>(1_000_000_000, scenario.ctx());
            garden::fund(&mut garden, payment, &clock, scenario.ctx());
            // CAROL hiç su vermedi → HATA
            garden::claim(&mut garden, &clock, scenario.ctx());
            ts::return_shared(garden);
        };

        clock.destroy_for_testing();
        scenario.end();
    }
}

