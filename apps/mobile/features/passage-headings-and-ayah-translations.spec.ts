import { describeFeature, loadFeature } from "@amiceli/vitest-cucumber";
import { expect } from "vitest";
import type { Language, PassageHeading, Script, SurahScreen } from "../src/quran-analysis.ts";
import { passageHeadingsOn } from "../src/release.ts";
import { World, ayahRange, ayahsOf, datasetSurah, languageCode, scriptCode, shippedConfig, wordCardsOf } from "./support.ts";

const feature = await loadFeature("./passage-headings-and-ayah-translations.feature");

/** The Passage heading directly above Ayah `ayah` on `screen`, or undefined when none is. */
function headingAbove(screen: SurahScreen, ayah: number): PassageHeading | undefined {
  const at = screen.items.findIndex((item) => item.kind === "ayah" && item.number === ayah);
  expect(at, `Surah ${screen.number} shows Ayah ${ayah}`).toBeGreaterThanOrEqual(0);
  const before = screen.items[at - 1];
  return before?.kind === "passage-heading" ? before : undefined;
}

describeFeature(feature, ({ Background, Scenario, ScenarioOutline, BeforeAllScenarios, AfterAllScenarios }) => {
  const world = new World();
  BeforeAllScenarios(() => world.start());
  AfterAllScenarios(() => world.close());

  Background(({ Given }) => {
    Given("the app is launched on a new device", () => {
      world.launch();
    });
  });

  const open = async (surah: number, script: Script, language: Language, ayahTranslation = false): Promise<void> => {
    world.screen = await world.app.surah(surah, { script, language, ayahTranslation });
  };

  ScenarioOutline(
    "Surah <Surah> in <Language> shows one Passage heading per Passage, above its first Ayah",
    ({ When, Then, And }, { Surah, Language }) => {
      const surah = Number(Surah);
      const language = languageCode(Language);
      When("I open Surah <Surah> in the Uthmani Script and <Language>", () => open(surah, "uthmani", language));
      Then(
        "each of Surah <Surah>'s Passages in its /data/v1 Surah file has one Passage heading, directly above its first Ayah, showing its <Language> Passage title and its Ayah range",
        () => {
          // Never vacuous: Surah <Surah> has Passages in the file /data/v1 serves (#171).
          expect(datasetSurah(surah).passages.length, `Surah ${surah}'s Passages in its /data/v1 Surah file`).toBeGreaterThan(0);
          for (const passage of datasetSurah(surah).passages) {
            expect(headingAbove(world.screen!, passage.from), `the Passage heading above ${surah}:${passage.from}`).toEqual({
              kind: "passage-heading",
              title: passage[language],
              range: ayahRange(passage.from, passage.till),
            });
          }
        },
      );
      And("the Surah shows no other Passage heading", () => {
        const headings = world.screen!.items.filter((item) => item.kind === "passage-heading");
        expect(datasetSurah(surah).passages.length, `Surah ${surah}'s Passages in its /data/v1 Surah file`).toBeGreaterThan(0);
        expect(headings).toHaveLength(datasetSurah(surah).passages.length);
      });
    },
  );

  ScenarioOutline(
    'The Passage heading above Ayah 18:83 in <Language> shows its Passage title and "83–88"',
    ({ When, Then }, { Language }) => {
      const language = languageCode(Language);
      When("I open Surah 18 in the Uthmani Script and <Language>", () => open(18, "uthmani", language));
      Then(
        'the Passage heading above Ayah 18:83 shows the <Language> Passage title of 18:83 from its /data/v1 Surah file and the Ayah range "83–88"',
        () => {
          const passage = datasetSurah(18).passages.find((p) => p.from === 83);
          expect(passage, "a Passage starts at 18:83").toBeDefined();
          expect(headingAbove(world.screen!, 83)).toEqual({ kind: "passage-heading", title: passage![language], range: "83–88" });
        },
      );
    },
  );

  Scenario("A one-Ayah Passage's heading shows a single Ayah number", ({ When, Then }) => {
    When("I open Surah 2 in the Uthmani Script and English", () => open(2, "uthmani", "en"));
    Then('the Passage heading above Ayah 2:25 shows the Ayah range "25"', () => {
      expect(datasetSurah(2).passages.find((p) => p.from === 25)?.till, "2:25 is a one-Ayah Passage").toBe(25);
      expect(headingAbove(world.screen!, 25)?.range).toBe("25");
    });
  });

  ScenarioOutline(
    "With the Ayah translation on, each Ayah of Surah <Surah> shows its <Language> Ayah translation; off, none",
    ({ When, Then }, { Surah, Language }) => {
      const surah = Number(Surah);
      const language = languageCode(Language);
      When("I open Surah <Surah> in the Indo-Pak Script and <Language> with the Ayah translation on", () =>
        open(surah, "indopak", language, true),
      );
      Then("each Ayah shows its <Language> Ayah translation from its /data/v1 Surah file", () => {
        expect(ayahsOf(world.screen!).map((a) => a.translation)).toEqual(
          datasetSurah(surah).ayahs.map((a) => a.translation[language]),
        );
      });
      When("I open Surah <Surah> in the Indo-Pak Script and <Language> with the Ayah translation off", () =>
        open(surah, "indopak", language, false),
      );
      Then("no Ayah shows an Ayah translation", () => {
        const shown = ayahsOf(world.screen!).filter((a) => a.translation !== null);
        expect(ayahsOf(world.screen!).length).toBe(datasetSurah(surah).ayahCount);
        expect(shown).toEqual([]);
      });
    },
  );

  ScenarioOutline(
    "Switching Language from <From> to <To> changes every meaning and title and no Arabic",
    ({ Given, When, Then, And }, { Script, From, To }) => {
      const script = scriptCode(Script);
      const to = languageCode(To);
      let before: SurahScreen;
      Given("I open Surah 18 in the <Script> Script and <From> with the Ayah translation on", async () => {
        await open(18, script, languageCode(From), true);
        before = world.screen!;
      });
      When("I switch Language to <To>", () => open(18, script, to, true));
      Then(
        "every Word meaning, Ayah translation and Passage title on Surah 18 is the <To> one from its /data/v1 Surah file",
        () => {
          const surah = datasetSurah(18);
          const screen = world.screen!;
          expect(wordCardsOf(screen).map((c) => c.meaning)).toEqual(
            surah.ayahs.flatMap((a) => a.words.map((w) => w.meaning[to])),
          );
          expect(ayahsOf(screen).map((a) => a.translation)).toEqual(surah.ayahs.map((a) => a.translation[to]));
          expect(
            screen.items.filter((item): item is PassageHeading => item.kind === "passage-heading").map((h) => h.title),
          ).toEqual(surah.passages.map((p) => p[to]));
        },
      );
      And("every Word card shows the same <Script> text as before", () => {
        const arabic = (screen: SurahScreen) => wordCardsOf(screen).map((c) => [c.location, c.arabic]);
        expect(arabic(before).length).toBeGreaterThan(0);
        expect(arabic(world.screen!)).toEqual(arabic(before));
      });
    },
  );

  Scenario(
    "Launched as app.json ships it, with Passage headings held back, Surah 18 shows its Ayahs and Word cards and no Passage heading",
    ({ Given, When, Then, And }) => {
      Given("the app is launched on a new device with the Passage headings switch as app.json sets it", () => {
        world.launch(undefined, passageHeadingsOn(undefined, shippedConfig()));
      });
      When("I open Surah 18 in the Uthmani Script and English", () => open(18, "uthmani", "en"));
      Then("the Surah shows no Passage heading at all", () => {
        expect(datasetSurah(18).passages.length).toBeGreaterThan(0);
        expect(world.screen!.items.filter((item) => item.kind === "passage-heading")).toEqual([]);
      });
      And("it shows every Ayah of Surah 18 with its Word cards from its /data/v1 Surah file", () => {
        const surah = datasetSurah(18);
        expect(ayahsOf(world.screen!).map((a) => a.number)).toEqual(surah.ayahs.map((a) => a.number));
        expect(wordCardsOf(world.screen!).map((c) => [c.location, c.arabic, c.meaning])).toEqual(
          surah.ayahs.flatMap((a) => a.words.map((w) => [w.location, w.uthmani, w.meaning.en])),
        );
      });
    },
  );
});
