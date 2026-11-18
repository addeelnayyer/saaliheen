import { describeFeature, loadFeature } from "@amiceli/vitest-cucumber";
import { expect } from "vitest";
import * as destinations from "../src/destinations.ts";
import type { Script } from "../src/quran-analysis.ts";
import { openReadingPlaces, type SurahVisit } from "../src/reading-places.ts";
import { juzHolding } from "../src/surah-index.ts";
import { World, datasetJuz, datasetSurahIndex, readIndex, scriptCode, type IndexSearch, type JuzRow } from "./support.ts";

const feature = await loadFeature("./surahs-and-juz-index.feature");

/** Surah `n` as the committed Surah list gives it. */
const surah = (n: number) => datasetSurahIndex().find((s) => s.number === n)!;
/** "36:28" as [36, 28]. */
const ayahOf = (id: string) => id.split(":").map(Number) as [number, number];
/** Whether Ayah `a` comes before Ayah `b`, or is it. */
const atOrBefore = ([s1, a1]: [number, number], [s2, a2]: [number, number]) => s1 < s2 || (s1 === s2 && a1 <= a2);

/** The committed Juz list of `script`. */
const committedJuz = (script: Script) => datasetJuz()[script];

describeFeature(feature, ({ Background, Scenario, ScenarioOutline, BeforeAllScenarios, AfterAllScenarios }) => {
  const world = new World();
  BeforeAllScenarios(() => world.start());
  AfterAllScenarios(() => world.close());

  let rows: JuzRow[] = [];
  let found: IndexSearch;
  let script: Script;
  let visit: SurahVisit;

  const row = (n: number) => {
    const r = rows.find((j) => j.number === n);
    expect(r, `the Juz tab lists Juz ${n}`).toBeDefined();
    return r!;
  };
  const openJuzTab = async (name: string) => {
    script = scriptCode(name);
    rows = await readIndex(world.app).juzIndex(script);
  };
  const search = async (query: string, name: string) => {
    script = scriptCode(name);
    found = await readIndex(world.app).search(query, script);
  };

  Background(({ Given }) => {
    Given("the app is launched on a new device", () => {
      world.launch();
    });
  });

  Scenario("The Read screen's index has the Surahs and Juz tabs, Surahs first", ({ Then }) => {
    Then('the Read screen\'s index has the tabs "Surahs" and "Juz", in that order', () => {
      const indexTabs = (destinations as unknown as Record<string, unknown>).indexTabs;
      expect(typeof indexTabs, "the app offers indexTabs").toBe("function");
      expect((indexTabs as () => string[])()).toEqual(["Surahs", "Juz"]);
    });
  });

  ScenarioOutline("The Juz tab lists the <Script> Juz as /data/v1/juz.json gives them", ({ When, Then }, { Script }) => {
    When("I open the Juz tab in the <Script> Script", () => openJuzTab(Script));
    Then(
      "it lists Juz 1 to 30 in order, each with its <Script> name, first Ayah and last Ayah as /data/v1/juz.json gives them",
      () => {
        expect(rows.map(({ number, name, firstAyah, lastAyah }) => ({ number, name, firstAyah, lastAyah }))).toEqual(committedJuz(script));
        expect(rows.map((r) => r.number)).toEqual(Array.from({ length: 30 }, (_, k) => k + 1));
      },
    );
  });

  ScenarioOutline("Juz 23 starts where the <Script> Script starts it", ({ When, Then }, { Script, first }) => {
    When("I open the Juz tab in the <Script> Script", () => openJuzTab(Script));
    Then('Juz 23 starts at "<first>"', () => {
      expect(row(23).firstAyah).toBe(first);
    });
  });

  Scenario("Indo-Pak Juz 23 is named وَمَا لِيَ", ({ When, Then }) => {
    When("I open the Juz tab in the Indo-Pak Script", () => openJuzTab("Indo-Pak"));
    Then("Juz 23 is named {string}", (_, name: string) => {
      expect(row(23).name).toBe(name);
    });
  });

  Scenario("A Juz row says where the Juz runs", ({ When, Then, And }) => {
    When("I open the Juz tab in the Uthmani Script", () => openJuzTab("Uthmani"));
    Then("Juz 2's row says it runs {string}", (_, runs: string) => {
      // The issue's own example; its Surah name is the Surah list's Latin name.
      expect(runs.startsWith(surah(2).nameLatin + " ")).toBe(true);
      expect(row(2).runs).toBe(runs);
    });
    And("Juz 23's row names Surah 36 and its Ayah 28, then Surah 39 and its Ayah 31", () => {
      const runs = row(23).runs;
      const at = (part: string, from = 0) => runs.indexOf(part, from);
      const from = at(surah(36).nameLatin);
      expect(from, `"${runs}" names ${surah(36).nameLatin}`).toBeGreaterThanOrEqual(0);
      const firstAyah = at("28", from);
      const to = at(surah(39).nameLatin, firstAyah);
      const lastAyah = at("31", to);
      expect([firstAyah, to, lastAyah].every((k) => k > from), `"${runs}" runs 36:28 → 39:31`).toBe(true);
    });
  });

  ScenarioOutline("A number finds the Surah and the Juz with that number in <Script>", ({ When, Then }, { Script }) => {
    When('I search the index for "23" in the <Script> Script', () => search("23", Script));
    Then("it finds Surah 23 alone and Juz 23 alone", () => {
      expect(found.surahs).toEqual([23]);
      expect(found.juz).toEqual([23]);
    });
  });

  ScenarioOutline("Searching \"Yasin\" finds Surah 36 and every <Script> Juz holding part of it", ({ When, Then, And }, { Script }) => {
    When('I search the index for "Yasin" in the <Script> Script', () => search("Yasin", Script));
    Then("it finds Surah 36 alone", () => {
      expect(found.surahs).toEqual([36]);
    });
    And("it finds every <Script> Juz that holds an Ayah of Surah 36, and no other Juz", () => {
      const holding = committedJuz(script)
        .filter((j) => atOrBefore(ayahOf(j.firstAyah), [36, surah(36).ayahCount]) && atOrBefore([36, 1], ayahOf(j.lastAyah)))
        .map((j) => j.number);
      expect(holding.length).toBeGreaterThan(0);
      expect(found.juz).toEqual(holding);
    });
  });

  Scenario("Surah 36's Arabic name finds it", ({ When, Then }) => {
    When("I search the index for Surah 36's Arabic name in the Uthmani Script", () => search(surah(36).nameArabic, "Uthmani"));
    Then("it finds Surah 36 alone", () => {
      expect(found.surahs).toEqual([36]);
    });
  });

  ScenarioOutline('The search reads "<query>" by the website\'s rules', ({ When, Then }, { query, surahs, juz }) => {
    When('I search the index for "<query>" in the Uthmani Script', () => search(query, "Uthmani"));
    Then('it finds the Surahs "<surahs>" and the Juz "<juz>"', () => {
      const numbers = (list: string) => (list === "" ? [] : list.split(",").map(Number));
      expect(found.surahs).toEqual(numbers(surahs));
      expect(found.juz).toEqual(numbers(juz));
    });
  });

  Scenario("Surah 36's Arabic name typed with an Urdu keyboard's letters finds it", ({ When, Then }) => {
    When(
      "I search the index for Surah 36's Arabic name, without harakat and in an Urdu keyboard's yeh, kaf and heh, in the Uthmani Script",
      () => {
        // Derived from the Surah list's own spelling, never typed.
        const urdu = surah(36)
          .nameArabic.replace(/[\u064B-\u065F\u0670]/g, "")
          .replace(/\u064A/g, "\u06CC")
          .replace(/\u0643/g, "\u06A9")
          .replace(/\u0647/g, "\u06C1");
        return search(urdu, "Uthmani");
      },
    );
    Then("it finds Surah 36 alone", () => {
      expect(found.surahs).toEqual([36]);
    });
  });

  Scenario("A search that finds nothing says what to search by", ({ When, Then, And }) => {
    When('I search the index for "qqqq" in the Uthmani Script', () => search("qqqq", "Uthmani"));
    Then("it finds no Surah and no Juz", () => {
      expect(found.surahs).toEqual([]);
      expect(found.juz).toEqual([]);
    });
    And("it says to search by a number or a name", () => {
      expect(found.nothingFound).toMatch(/number/i);
      expect(found.nothingFound).toMatch(/name/i);
    });
  });

  Scenario("A blank search finds every Surah and every Juz", ({ When, Then, And }) => {
    When("I search the index for only spaces in the Uthmani Script", () => search("   ", "Uthmani"));
    Then("it finds all 114 Surahs and all 30 Juz, in order", () => {
      expect(found.surahs).toEqual(Array.from({ length: 114 }, (_, k) => k + 1));
      expect(found.juz).toEqual(Array.from({ length: 30 }, (_, k) => k + 1));
    });
    And("it says nothing about what to search by", () => {
      expect(found.nothingFound).toBeNull();
    });
  });

  ScenarioOutline("Opening Juz 23 in <Script> opens Surah 36 at Ayah <ayah>", ({ When, Then }, { Script, ayah }) => {
    When("I open Juz 23 from the Juz tab in the <Script> Script", async () => {
      await openJuzTab(Script);
      const [s, a] = ayahOf(row(23).firstAyah);
      // A Juz row opens its Surah's screen at the Juz's first Ayah.
      const open = openReadingPlaces(world.device).open as (surah: number, options: { ayah: number }) => Promise<SurahVisit>;
      visit = await open(s, { ayah: a });
    });
    Then("Surah 36's screen opens at Ayah <ayah>", () => {
      expect(visit.surah).toBe(36);
      expect(visit.opensAt).toBe(Number(ayah));
    });
  });

  ScenarioOutline("The <Script> Juz holding the latest Reading place is marked", ({ Given, When, Then }, { Script, juz }) => {
    Given("I read Surah 36 up to Ayah 25", async () => {
      const read = await openReadingPlaces(world.device).open(36);
      await read.scrolledTo(25);
    });
    When("I open the Juz tab in the <Script> Script", () => openJuzTab(Script));
    Then("only Juz <juz> is marked as holding the latest Reading place", async () => {
      // The Juz tab marks the Juz holding the newest of the device's Reading places.
      const [latest] = await openReadingPlaces(world.device).list();
      expect(latest).toEqual({ surah: 36, ayah: 25 });
      expect(rows.filter((r) => juzHolding(rows, latest) === r.number).map((r) => r.number)).toEqual([Number(juz)]);
    });
  });

  Scenario("No Juz is marked before any Reading place", ({ When, Then }) => {
    When("I open the Juz tab in the Uthmani Script", () => openJuzTab("Uthmani"));
    Then("no Juz is marked as holding the latest Reading place", async () => {
      const [latest] = await openReadingPlaces(world.device).list();
      expect(latest).toBeUndefined();
      expect(juzHolding(rows, latest)).toBeNull();
    });
  });
});
