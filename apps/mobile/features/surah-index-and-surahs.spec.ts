import { describeFeature, loadFeature } from "@amiceli/vitest-cucumber";
import { expect } from "vitest";
import type { SurahScreen } from "../src/quran-analysis.ts";
import { World, ayahsOf, datasetSurah, datasetSurahIndex, languageCode, scriptCode } from "./support.ts";

const feature = await loadFeature("./surah-index-and-surahs.feature");

describeFeature(feature, ({ Background, Scenario, ScenarioOutline, BeforeAllScenarios, AfterAllScenarios }) => {
  const world = new World();
  BeforeAllScenarios(() => world.start());
  AfterAllScenarios(() => world.close());

  Background(({ Given }) => {
    Given("the app is launched on a new device", () => {
      world.launch();
    });
  });

  Scenario("The Surah index lists all 114 Surahs as /data/v1/surahs.json gives them", ({ When, Then }) => {
    let index: Awaited<ReturnType<typeof world.app.surahIndex>>;
    When("I open the Surah index", async () => {
      index = await world.app.surahIndex();
    });
    Then(
      "it lists Surahs 1 to 114 in order, each with its Arabic name, Latin name, where it was revealed and its Ayah count as /data/v1/surahs.json gives them",
      () => {
        const expected = datasetSurahIndex().map(({ number, nameArabic, nameLatin, revelationPlace, ayahCount }) => ({
          number,
          nameArabic,
          nameLatin,
          revelationPlace,
          ayahCount,
        }));
        expect(expected.map((s) => s.number)).toEqual(Array.from({ length: 114 }, (_, k) => k + 1));
        expect(
          index.map(({ number, nameArabic, nameLatin, revelationPlace, ayahCount }) => ({
            number,
            nameArabic,
            nameLatin,
            revelationPlace,
            ayahCount,
          })),
        ).toEqual(expected);
      },
    );
  });

  ScenarioOutline("Every Surah opens in the <Script> Script and <Language>", ({ When, Then, And }, { Script, Language }) => {
    const script = scriptCode(Script);
    const language = languageCode(Language);
    const screens: SurahScreen[] = [];

    When("I open each of the 114 Surahs in the <Script> Script and <Language>", async () => {
      for (let n = 1; n <= 114; n++) {
        screens.push(await world.app.surah(n, { script, language, ayahTranslation: false }));
      }
    });
    Then("each shows its Ayahs from 1 to its Ayah count, in order", () => {
      expect(screens.map((s) => s.number)).toEqual(Array.from({ length: 114 }, (_, k) => k + 1));
      for (const screen of screens) {
        const count = datasetSurah(screen.number).ayahCount;
        expect(
          ayahsOf(screen).map((a) => a.number),
          `Surah ${screen.number}'s Ayahs`,
        ).toEqual(Array.from({ length: count }, (_, k) => k + 1));
      }
    });
    And(
      "each Ayah shows a Word card for each of its Words, in order, with the Word's <Script> text, its <Language> Word meaning and its Root tag, as its /data/v1 Surah file gives them",
      () => {
        expect(screens, "all 114 Surahs opened").toHaveLength(114);
        for (const screen of screens) {
          const expected = datasetSurah(screen.number).ayahs.map((ayah) =>
            ayah.words.map((w) => ({ location: w.location, arabic: w[script], meaning: w.meaning[language], root: w.root })),
          );
          const actual = ayahsOf(screen).map((ayah) =>
            ayah.wordCards.map(({ location, arabic, meaning, root }) => ({ location, arabic, meaning, root })),
          );
          expect(actual, `Surah ${screen.number}'s Word cards`).toEqual(expected);
        }
      },
    );
  });
});
