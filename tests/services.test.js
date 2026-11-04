/* =========================================================
   APPARA CHESS — SERVICES TESTS
   FILE: tests/services.test.js
   FULL FILE
   ========================================================= */

import {
  SettingsService,
  DEFAULT_SETTINGS,
  SETTINGS_EVENTS
} from "../js/services/settings-service.js";

import {
  EconomyService,
  ECONOMY_CONFIG,
  ECONOMY_EVENTS,
  CURRENCY_TYPES
} from "../js/services/economy-service.js";

import {
  InventoryService,
  INVENTORY_CATEGORIES,
  UPGRADE_CONFIG
} from "../js/services/inventory-service.js";

import {
  ProgressionService,
  PROGRESSION_CONFIG,
  PROGRESSION_EVENTS,
  ACHIEVEMENTS
} from "../js/services/progression-service.js";

import {
  RankService,
  RANK_TIERS,
  RATING_MODES,
  RANK_CONFIG
} from "../js/services/rank-service.js";

import {
  Assert,
  test,
  TestRegistry
} from "./test-utils.js";

/* ---------------------------------------------------------
   REGISTER SERVICES TEST SUITE
   --------------------------------------------------------- */

TestRegistry.register("Application Services", () => {

  const tests = [];

  /* SETTINGS SERVICE */

  tests.push(
    test("SettingsService initializes", () => {
      const service = new SettingsService();

      Assert.exists(service);
      Assert.equal(service.initialized, false);

      service.dispose();
    })
  );

  tests.push(
    test("Default settings contain all main sections", () => {
      Assert.exists(DEFAULT_SETTINGS.graphics);
      Assert.exists(DEFAULT_SETTINGS.audio);
      Assert.exists(DEFAULT_SETTINGS.controls);
      Assert.exists(DEFAULT_SETTINGS.gameplay);
      Assert.exists(DEFAULT_SETTINGS.privacy);
      Assert.exists(DEFAULT_SETTINGS.notifications);
    })
  );

  tests.push(
    test("SettingsService returns default settings", () => {
      const service = new SettingsService();

      const settings = service.getAll();

      Assert.equal(
        settings.language,
        DEFAULT_SETTINGS.language
      );

      Assert.equal(
        settings.theme,
        DEFAULT_SETTINGS.theme
      );

      service.dispose();
    })
  );

  tests.push(
    test("SettingsService reads nested settings", () => {
      const service = new SettingsService();

      Assert.equal(
        service.get("audio", "musicEnabled"),
        true
      );

      Assert.equal(
        service.get("graphics", "quality"),
        "high"
      );

      service.dispose();
    })
  );

  tests.push(
    test("SettingsService returns undefined for unknown section", () => {
      const service = new SettingsService();

      Assert.equal(
        service.get("unknown-section"),
        undefined
      );

      service.dispose();
    })
  );

  tests.push(
    test("SettingsService rejects unknown setting sections", () => {
      const service = new SettingsService();

      Assert.throws(() => {
        service.set("unknown", "value", true);
      });

      service.dispose();
    })
  );

  tests.push(
    test("SettingsService validates graphics quality", () => {
      const service = new SettingsService();

      service.settings.graphics.quality = "invalid";
      service.validateAll();

      Assert.equal(
        service.get("graphics", "quality"),
        "high"
      );

      service.dispose();
    })
  );

  tests.push(
    test("SettingsService validates volume range", () => {
      const service = new SettingsService();

      service.settings.audio.masterVolume = 5;
      service.validateAll();

      Assert.equal(
        service.get("audio", "masterVolume"),
        1
      );

      service.dispose();
    })
  );

  tests.push(
    test("SettingsService exports backup JSON", () => {
      const service = new SettingsService();

      const backup = service.exportSettings();

      Assert.equal(typeof backup, "string");

      const parsed = JSON.parse(backup);

      Assert.exists(parsed.audio);
      Assert.exists(parsed.graphics);

      service.dispose();
    })
  );

  tests.push(
    test("SettingsService rejects invalid backup JSON", () => {
      const service = new SettingsService();

      Assert.throws(() => {
        service.importSettings("{invalid-json");
      });

      service.dispose();
    })
  );

  tests.push(
    test("Settings event definitions exist", () => {
      Assert.exists(SETTINGS_EVENTS.LOADED);
      Assert.exists(SETTINGS_EVENTS.UPDATED);
      Assert.exists(SETTINGS_EVENTS.RESET);
      Assert.exists(SETTINGS_EVENTS.LANGUAGE_CHANGED);
    })
  );

  /* ECONOMY SERVICE */

  tests.push(
    test("EconomyService initializes", () => {
      const service = new EconomyService();

      Assert.exists(service);
      Assert.equal(service.initialized, false);
    })
  );

  tests.push(
    test("Economy starting currency is configured", () => {
      Assert.equal(ECONOMY_CONFIG.startingCoins, 2500);
      Assert.equal(ECONOMY_CONFIG.startingDiamonds, 0);
    })
  );

  tests.push(
    test("Economy currency types are available", () => {
      Assert.equal(CURRENCY_TYPES.COINS, "coins");
      Assert.equal(CURRENCY_TYPES.DIAMONDS, "diamonds");
    })
  );

  tests.push(
    test("Economy event definitions exist", () => {
      Assert.exists(ECONOMY_EVENTS.COINS_CHANGED);
      Assert.exists(ECONOMY_EVENTS.DIAMONDS_CHANGED);
      Assert.exists(ECONOMY_EVENTS.PURCHASE_COMPLETED);
      Assert.exists(ECONOMY_EVENTS.TRANSACTION_FAILED);
    })
  );

  tests.push(
    test("Economy rejects unsupported currency", () => {
      const service = new EconomyService();

      Assert.throws(() => {
        service.validateCurrency("gold");
      });
    })
  );

  /* INVENTORY SERVICE */

  tests.push(
    test("InventoryService initializes", () => {
      const service = new InventoryService();

      Assert.exists(service);
      Assert.equal(service.initialized, false);
    })
  );

  tests.push(
    test("Inventory categories are available", () => {
      Assert.includes(INVENTORY_CATEGORIES, "boards");
      Assert.includes(INVENTORY_CATEGORIES, "pieces");
      Assert.includes(INVENTORY_CATEGORIES, "tables");
      Assert.includes(INVENTORY_CATEGORIES, "environments");
      Assert.includes(INVENTORY_CATEGORIES, "lighting");
      Assert.includes(INVENTORY_CATEGORIES, "effects");
    })
  );

  tests.push(
    test("Inventory upgrade configuration is valid", () => {
      Assert.equal(UPGRADE_CONFIG.maxLevel, 7);

      Assert.true(
        UPGRADE_CONFIG.costMultiplier > 1
      );
    })
  );

  tests.push(
    test("Inventory upgrade price calculation works", () => {
      const service = new InventoryService();

      const price = service.getUpgradePrice(100, 1);

      Assert.equal(price, 100);
    })
  );

  tests.push(
    test("Inventory upgrade price increases by level", () => {
      const service = new InventoryService();

      const first = service.getUpgradePrice(100, 1);
      const second = service.getUpgradePrice(100, 2);

      Assert.true(second > first);
    })
  );

  tests.push(
    test("Inventory rejects invalid upgrade price", () => {
      const service = new InventoryService();

      Assert.throws(() => {
        service.getUpgradePrice(-10, 1);
      });
    })
  );

  tests.push(
    test("Inventory rejects unknown category", () => {
      const service = new InventoryService();

      Assert.throws(() => {
        service.validateCategory("unknown-category");
      });
    })
  );

  /* PROGRESSION SERVICE */

  tests.push(
    test("ProgressionService initializes", () => {
      const service = new ProgressionService();

      Assert.exists(service);
      Assert.equal(service.initialized, false);
    })
  );

  tests.push(
    test("Progression configuration is valid", () => {
      Assert.equal(PROGRESSION_CONFIG.maxLevel, 100);
      Assert.equal(PROGRESSION_CONFIG.baseXP, 100);

      Assert.true(
        PROGRESSION_CONFIG.growthRate > 1
      );
    })
  );

  tests.push(
    test("Achievement list is available", () => {
      Assert.true(Array.isArray(ACHIEVEMENTS));
      Assert.greaterThan(ACHIEVEMENTS.length, 0);
    })
  );

  tests.push(
    test("Achievement IDs are unique", () => {
      const ids = ACHIEVEMENTS.map(item => item.id);
      const uniqueIds = new Set(ids);

      Assert.equal(uniqueIds.size, ids.length);
    })
  );

  tests.push(
    test("First game achievement exists", () => {
      Assert.true(
        ACHIEVEMENTS.some(
          item => item.id === "first_game"
        )
      );
    })
  );

  tests.push(
    test("Progression event definitions exist", () => {
      Assert.exists(PROGRESSION_EVENTS.XP_ADDED);
      Assert.exists(PROGRESSION_EVENTS.LEVEL_UP);
      Assert.exists(PROGRESSION_EVENTS.ACHIEVEMENT_UNLOCKED);
      Assert.exists(PROGRESSION_EVENTS.DAILY_REWARD_CLAIMED);
    })
  );

  /* RANK SERVICE */

  tests.push(
    test("RankService initializes", () => {
      const service = new RankService();

      Assert.exists(service);
      Assert.equal(service.initialized, false);
    })
  );

  tests.push(
    test("Rank tiers are available", () => {
      Assert.true(Array.isArray(RANK_TIERS));

      Assert.greaterThan(
        RANK_TIERS.length,
        0
      );
    })
  );

  tests.push(
    test("Royal Legend rank exists", () => {
      Assert.true(
        RANK_TIERS.some(
          tier => tier.id === "royal_legend"
        )
      );
    })
  );

  tests.push(
    test("All rating modes are configured", () => {
      Assert.includes(RATING_MODES, "bullet");
      Assert.includes(RATING_MODES, "blitz");
      Assert.includes(RATING_MODES, "rapid");
      Assert.includes(RATING_MODES, "classical");
    })
  );

  tests.push(
    test("Default starting rating is 1000", () => {
      Assert.equal(
        RANK_CONFIG.startingRating,
        1000
      );
    })
  );

  tests.push(
    test("Rank tiers have valid rating boundaries", () => {
      for (const tier of RANK_TIERS) {
        Assert.exists(tier.id);
        Assert.exists(tier.name);

        Assert.true(
          tier.minRating <= tier.maxRating
        );
      }
    })
  );

  return tests;
});

/* =========================================================
   FILE: tests/services.test.js
   FULL FILE COMPLETE — NEW FILE 8/10
   ========================================================= */
