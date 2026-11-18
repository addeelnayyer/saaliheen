import { describeFeature, loadFeature } from "@amiceli/vitest-cucumber";
import { expect } from "vitest";
import type { Language } from "../src/quran-analysis.ts";
import { tafsirOn } from "../src/release.ts";
import { World, datasetSurah, expectAnsweredTafsir, expectEveryAyah, expectNoTafsir, plainTafsir, shippedConfig, tafsirAfter, tafsirOf } from "./support.ts";

const feature = await loadFeature("./tafsir.feature");

describeFeature(feature, ({ Scenario, BeforeAllScenarios, BeforeEachScenario, AfterAllScenarios, defineSteps }) => {
  const world = new World();
  BeforeAllScenarios(() => world.start());
  BeforeEachScenario(() => {
    world.goOnline();
    world.stopRecording();
    world.data.reset();
  });
  AfterAllScenarios(() => world.close());

  const screen = () => {
    if (!world.screen) throw new Error("no Surah screen is open");
    return world.screen;
  };
  let script: "uthmani" | "indopak" = "uthmani";
  const open = async (surah: number, language: Language, inScript: "uthmani" | "indopak" = "uthmani") => {
    script = inScript;
    world.screen = await world.app.surah(surah, { script, language, ayahTranslation: false });
  };

  /** Expects Surah `surah`'s Tafsir in `language` as the endpoint answers it now, directly after Ayah `ayah`, with the ranges `ranges`. */
  const showsAnswered = (surah: number, ayah: number, language: Language, ranges: string[]) => {
    const answer = world.data.tafsir(surah, language);
    const shown = tafsirAfter(screen(), ayah);
    expect(shown.entries.map((e) => e.range)).toEqual(ranges);
    expectAnsweredTafsir(shown, answer);
  };
  const showsSurah2 = () => showsAnswered(2, 5, "en", ["1", "2", "3–4", "5"]);
  const showsSurah108InUrdu = () => {
    showsAnswered(108, 3, "ur", ["1", "2–3"]);
    expect(tafsirAfter(screen(), 3).credit, "the Urdu edition's credit line").toMatch(/Urdu/);
  };
  const noTafsir = () => expectNoTafsir(screen());
  const everyAyah = (surah: number) => () => expectEveryAyah(screen(), surah);

  defineSteps(({ Step }) => {
    Step("the app is launched on a new device", () => void world.launch());
    Step("I open Surah 2 in the Uthmani Script and English", () => open(2, "en"));
    Step("I open Surah 2 in the Uthmani Script and English again", () => open(2, "en"));
    Step("I open Surah 1 in the Uthmani Script and English", () => open(1, "en"));
    Step(
      'directly after Ayah 2:5, the last of the Passage 1–5, the Surah shows the Tafsir entries "1", "2", "3–4" and "5" with their texts as /api/v1/tafsir/2 answers them in "en", then its credit line',
      showsSurah2,
    );
    Step(
      'directly after Ayah 108:3, the last of the Passage 1–3, the Surah shows the Tafsir entries "1" and "2–3" in "ur" with the Urdu credit line',
      showsSurah108InUrdu,
    );
    Step("the Surah shows no Tafsir at all", noTafsir);
    Step("it shows every Ayah of Surah 2 from its /data/v1 Surah file", everyAyah(2));
    Step("it shows every Ayah of Surah 1 from its /data/v1 Surah file", everyAyah(1));
    Step("the Surah shows no Passage heading at all", () => {
      expect(screen().items.filter((item) => item.kind === "passage-heading")).toEqual([]);
    });
  });

  Scenario("Surah 2 in English shows its first Passage's Tafsir after Ayah 2:5, a grouped entry once, with its credit line", ({ Then, And }) => {
    Then('the app asked /api/v1/tafsir/2 for Surah 2\'s Tafsir in "en"', () => {
      expect(world.data.tafsirAsked).toEqual(["/api/v1/tafsir/2?lang=en"]);
    });
    And("the Surah shows no other Tafsir", () => {
      expect(datasetSurah(2).passages[0], "Surah 2's first Passage").toMatchObject({ from: 1, till: 5 });
      expect(tafsirOf(screen()).map((t) => t.after)).toEqual([5]);
    });
  });

  Scenario("Surah 108 in Urdu shows its Urdu Tafsir after its last Ayah, bold and italic kept", ({ When, And }) => {
    When("I open Surah 108 in the Indo-Pak Script and Urdu", () => open(108, "ur", "indopak"));
    And("the bold and italic of the Urdu sample's markup are kept, and nothing else of it is", () => {
      expect(tafsirAfter(screen(), 3).entries.map((e) => e.runs)).toEqual([
        [
          { text: "سورۃ الکوثر کی آیت ۱ کی ", bold: false, italic: false },
          { text: "تفسیر", bold: true, italic: false },
          { text: " کا نمونہ", bold: false, italic: false },
        ],
        [
          { text: "سورۃ الکوثر کی آیات ۲ اور ۳ کی ", bold: false, italic: false },
          { text: "تفسیر", bold: false, italic: true },
          { text: " کا <p>نمونہ</p>", bold: false, italic: false },
        ],
      ]);
    });
  });

  Scenario("Switching Language switches the Tafsir", ({ And, When }) => {
    And("I open Surah 108 in the Uthmani Script and English", async () => {
      await open(108, "en");
      showsAnswered(108, 3, "en", ["1", "2", "3"]);
    });
    When("I switch Language to Urdu", () => open(108, "ur", script));
  });

  Scenario("Markup other than bold and italic is shown as text", ({ And, When, Then }) => {
    And(
      'the English Tafsir of Surah 112 is one entry for 112:1–4 reading "Say <b>He</b> is <i>One</i>, <strong>the</strong> <em>Eternal</em> <span>x</span> & <b>not <i>both</i></b>"',
      () => {
        const text = "Say <b>He</b> is <i>One</i>, <strong>the</strong> <em>Eternal</em> <span>x</span> & <b>not <i>both</i></b>";
        world.data.putTafsir(112, "en", [{ firstAyah: 1, lastAyah: 4, text }]);
      },
    );
    When("I open Surah 112 in the Uthmani Script and English", () => open(112, "en"));
    Then(
      'the entry "1–4" after Ayah 112:4 shows "He" and "the" in bold, "One" and "Eternal" in italic, "both" in bold italic, and "<span>x</span> &" as text',
      () => {
        const [entry] = tafsirAfter(screen(), 4).entries;
        expect(entry.range).toBe("1–4");
        expect(entry.runs).toEqual([
          { text: "Say ", bold: false, italic: false },
          { text: "He", bold: true, italic: false },
          { text: " is ", bold: false, italic: false },
          { text: "One", bold: false, italic: true },
          { text: ", ", bold: false, italic: false },
          { text: "the", bold: true, italic: false },
          { text: " ", bold: false, italic: false },
          { text: "Eternal", bold: false, italic: true },
          { text: " <span>x</span> & ", bold: false, italic: false },
          { text: "not ", bold: true, italic: false },
          { text: "both", bold: true, italic: true },
        ]);
      },
    );
  });

  Scenario("The Tafsir follows the Passages even with Passage headings held back", ({ Given }) => {
    Given("the app is launched on a new device with Passage headings off and the Tafsir on", () => void world.launch(undefined, false, undefined, true));
  });

  Scenario("Launched as app.json ships it, with the Tafsir held back, Surah 2 shows no Tafsir and never asks for it", ({ Given, And }) => {
    Given("the app is launched on a new device with the Tafsir switch as app.json sets it", () => {
      world.launch(undefined, true, undefined, tafsirOn(undefined, shippedConfig()));
    });
    And("every request the app makes is recorded", () => world.record());
    And("the app never asked /api/v1/tafsir", () => {
      expect(world.recording!.urls.length, "the app made requests").toBeGreaterThan(0);
      expect(world.recording!.urls.filter((url) => url.includes("/api/v1/tafsir"))).toEqual([]);
      expect(world.data.tafsirAsked).toEqual([]);
    });
  });

  Scenario("The Passage 2:47–60, longer than the screen draws at first, shows its Tafsir once, after Ayah 2:60", ({ And, Then }) => {
    And("the English Tafsir of Surah 2 has one entry for each Ayah of 2:47–60", () => {
      expect(datasetSurah(2).passages.find((p) => p.from === 47), "a Passage of Surah 2 runs 47–60").toMatchObject({ till: 60 });
      const entries = Array.from({ length: 14 }, (_, k) => ({ firstAyah: 47 + k, lastAyah: 47 + k, text: `Entry for 2:${47 + k}` }));
      world.data.putTafsir(2, "en", entries);
    });
    Then('the Surah shows one Tafsir, directly after Ayah 2:60, with the 14 entries "47" to "60" in order', () => {
      expect(tafsirOf(screen()).map((t) => t.after)).toEqual([60]);
      const shown = tafsirAfter(screen(), 60).entries;
      expect(shown.map((e) => e.range)).toEqual(["47", "48", "49", "50", "51", "52", "53", "54", "55", "56", "57", "58", "59", "60"]);
      expect(shown.map((e) => plainTafsir(e.runs))).toEqual(shown.map((e) => `Entry for 2:${e.range}`));
    });
  });

  Scenario("An entry a Passage not yet redrawn splits is shown whole, after the later Passage", ({ And, Then }) => {
    And("the English Tafsir of Surah 1 is entries for 1:1–3, 1:4–5 and 1:6–7", () => {
      expect(datasetSurah(1).passages.map((p) => [p.from, p.till]), "Surah 1's Passages").toEqual([
        [1, 4],
        [5, 7],
      ]);
      world.data.putTafsir(1, "en", [
        { firstAyah: 1, lastAyah: 3, text: "Entry for 1:1–3" },
        { firstAyah: 4, lastAyah: 5, text: "Entry for 1:4–5" },
        { firstAyah: 6, lastAyah: 7, text: "Entry for 1:6–7" },
      ]);
    });
    Then('directly after Ayah 1:4, the last of the Passage 1–4, the Surah shows the Tafsir entry "1–3"', () => {
      expect(tafsirAfter(screen(), 4).entries.map((e) => e.range)).toEqual(["1–3"]);
    });
    And('directly after Ayah 1:7, the last of the Passage 5–7, the Surah shows the Tafsir entries "4–5" and "6–7"', () => {
      expect(tafsirAfter(screen(), 7).entries.map((e) => e.range)).toEqual(["4–5", "6–7"]);
      expect(tafsirOf(screen()).map((t) => t.after)).toEqual([4, 7]);
    });
  });

  Scenario("When the endpoint cannot read the Tafsir, Surah 2 opens without it, and the next opening shows it", ({ And, When }) => {
    And("/api/v1/tafsir answers 503", () => {
      world.data.tafsirUnread = true;
    });
    When("/api/v1/tafsir answers again", () => {
      world.data.tafsirUnread = false;
    });
  });

  Scenario("When the endpoint answers with something that is no Tafsir, Surah 2 opens without it", ({ And }) => {
    And("/api/v1/tafsir answers 200 with entries that are no Tafsir entries", () => {
      world.data.tafsirMalformed = true;
    });
  });

  Scenario("A Surah with no Tafsir in the Language shows none", ({ When }) => {
    When("I open Surah 1 in the Uthmani Script and Urdu", () => open(1, "ur"));
  });
});
