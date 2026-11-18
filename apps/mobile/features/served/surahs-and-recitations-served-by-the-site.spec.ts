// #172 AC-9: the app's Surah and Recitation scenarios served by the site
// itself, the website's production build on PORT reading /data/v1 from the
// run's own Postgres (serve-site.ts), rather than by features/support.ts's
// stand-in origin. The app is the World's, launched with the site as its data
// origin; what it shows is compared with the committed dataset as it was
// before the Quran moved into Neon, read from git at BEFORE_QURAN_MOVED by
// the website's own helpers (apps/web/features/site/committed-output.ts), so
// that the comparison outlives the generated files' deletion.

import { describeFeature, loadFeature } from "@amiceli/vitest-cucumber";
import { publishedSurahUrl, type Manifest } from "@saaliheen/dataset/published";
import type { Surah } from "@saaliheen/dataset/types";
import { expect } from "vitest";
import {
  committedBuiltSurah,
  committedRecitation,
  committedSurahIndex,
  type CommittedRecitation,
  type CommittedSurahEntry,
} from "../../../web/features/site/committed-output.ts";
import type { SurahOptions, SurahScreen } from "../../src/quran-analysis.ts";
import { ayahsOf, languageCode, scriptCode, wordCardAt } from "../support.ts";
import { SiteWorld, siteOrigin } from "./site-world.ts";

const feature = await loadFeature("./surahs-and-recitations-served-by-the-site.feature");

/** Surah `n`'s file as committed before the Quran moved into Neon. */
const committedSurah = (n: number) => committedBuiltSurah<Surah>(n);

/** How a scenario opens a Surah: in `script` and `language`, with the Ayah translation on. */
const opened = (script: string, language: string): SurahOptions => ({
  script: scriptCode(script),
  language: languageCode(language),
  ayahTranslation: true,
});

/** The committed Word at `location`. */
function committedWord(location: string) {
  const [surah, ayah] = location.split(":").map(Number);
  const word = committedSurah(surah)
    .ayahs.find((a) => a.number === ayah)
    ?.words.find((w) => w.location === location);
  if (!word) throw new Error(`the committed Surah file has no Word at ${location}`);
  return word;
}

describeFeature(feature, ({ Background, Scenario, ScenarioOutline, BeforeAllScenarios, AfterAllScenarios, BeforeEachScenario }) => {
  const world = new SiteWorld();
  BeforeAllScenarios(() => world.start());
  BeforeEachScenario(() => {
    world.goOnline();
    world.stopRecording();
  });
  AfterAllScenarios(() => world.close());

  /** The Surah screen the scenario opened. */
  let screen: SurahScreen;
  const open = async (n: number, script: string, language: string) => {
    screen = await world.app.surah(n, opened(script, language));
    world.screen = screen;
  };

  Background(({ Given }) => {
    Given("the app is launched on a new device, with the site as its data origin", () => {
      expect(world.data.origin, "the app's data origin").toBe(siteOrigin());
      world.launch();
    });
  });

  Scenario("The Surah index lists all 114 Surahs as the committed Surah index did", ({ When, Then }) => {
    let index: Awaited<ReturnType<typeof world.app.surahIndex>>;
    When("I open the Surah index", async () => {
      index = await world.app.surahIndex();
    });
    Then(
      "it lists Surahs 1 to 114 in order, each with its Arabic name, Latin name, where it was revealed and its Ayah count as the committed Surah index gave them",
      () => {
        const row = ({ number, nameArabic, nameLatin, revelationPlace, ayahCount }: Omit<CommittedSurahEntry, "bismillah">) => ({
          number,
          nameArabic,
          nameLatin,
          revelationPlace,
          ayahCount,
        });
        const expected = committedSurahIndex().map(row);
        expect(expected.map((s) => s.number), "the committed Surah index").toEqual(Array.from({ length: 114 }, (_, k) => k + 1));
        expect(index.map(row), "the Surah index the site serves").toEqual(expected);
      },
    );
  });

  ScenarioOutline(
    "Surah <Surah> opens in the <Script> Script and <Language> as its committed Surah file showed it",
    ({ When, Then, And }, { Surah: surah, Script, Language }) => {
      const n = Number(surah);
      When("I open Surah <Surah> in the <Script> Script and <Language> with the Ayah translation on", () => open(n, Script, Language));
      Then("it shows its Ayahs from 1 to its Ayah count in the committed Surah index, in order", () => {
        const count = committedSurahIndex().find((s) => s.number === n)!.ayahCount;
        expect(
          ayahsOf(screen).map((a) => a.number),
          `Surah ${n}'s Ayahs`,
        ).toEqual(Array.from({ length: count }, (_, k) => k + 1));
      });
      And(
        "each Ayah shows a Word card for each of its Words, in order, with the Word's <Script> text and its <Language> Word meaning, as the committed Surah file gave them",
        () => {
          const [script, language] = [scriptCode(Script), languageCode(Language)];
          const expected = committedSurah(n).ayahs.map((ayah) =>
            ayah.words.map((w) => ({ location: w.location, arabic: w[script], meaning: w.meaning[language] })),
          );
          expect(expected.flat().length, `Words committed in Surah ${n}`).toBeGreaterThan(0);
          const actual = ayahsOf(screen).map((ayah) => ayah.wordCards.map(({ location, arabic, meaning }) => ({ location, arabic, meaning })));
          expect(actual, `Surah ${n}'s Word cards`).toEqual(expected);
        },
      );
      And("each Ayah shows its <Language> Ayah translation as the committed Surah file gave it", () => {
        const language = languageCode(Language);
        const expected = committedSurah(n).ayahs.map((ayah) => ({ number: ayah.number, translation: ayah.translation[language] }));
        expect(expected.every((a) => a.translation.length > 0), `every committed Ayah translation of Surah ${n} has text`).toBe(true);
        expect(
          ayahsOf(screen).map(({ number, translation }) => ({ number, translation })),
          `Surah ${n}'s ${Language} Ayah translations`,
        ).toEqual(expected);
      });
    },
  );

  ScenarioOutline(
    "The Word card at 2:255:3 shows its <Script> text and its <Language> Word meaning as the committed Surah file did",
    ({ When, Then }, { Script, Language }) => {
      When("I open Surah 2 in the <Script> Script and <Language> with the Ayah translation on", () => open(2, Script, Language));
      Then(
        "the Word card at 2:255:3 shows the Word's <Script> text and its <Language> Word meaning, as the committed Surah file gave them",
        () => {
          const word = committedWord("2:255:3");
          const card = wordCardAt(screen, "2:255:3");
          expect(card.arabic, `2:255:3's ${Script} text`).toBe(word[scriptCode(Script)]);
          expect(card.meaning, `2:255:3's ${Language} Word meaning`).toBe(word.meaning[languageCode(Language)]);
        },
      );
    },
  );

  Scenario(
    "Surah 1, opened once, is kept by the hash the site's manifest gives it and opens again in airplane mode",
    ({ When, Then }) => {
      let online: SurahScreen;
      When("I open Surah 1 in the Uthmani Script and English with the Ayah translation on", async () => {
        await open(1, "Uthmani", "English");
        online = screen;
      });
      Then("the device keeps Surah 1 with the hash that /data/v1/manifest.json gives Surah 1", async () => {
        const response = await fetch(`${siteOrigin()}/data/v1/manifest.json`);
        expect(response.status, "/data/v1/manifest.json's status").toBe(200);
        const listed = ((await response.json()) as Manifest).surahs.find((s) => s.number === 1);
        expect(listed?.url, "Surah 1's file in the manifest").toBe(publishedSurahUrl(1));
        expect(await world.device.read("surahs/1.json.sha256"), "the hash the device keeps Surah 1 by").toBe(listed?.hash);
      });
      When("the app is closed and launched again on the same device, online", async () => {
        world.record();
        world.launch(world.device);
        await world.app.checkForUpdates();
      });
      Then("the app read /data/v1/manifest.json and downloaded no Surah file again", () => {
        const paths = world.recording!.urls.map((url) => new URL(url).pathname);
        expect(paths, "what the app fetched").toContain("/data/v1/manifest.json");
        expect(paths.filter((p) => p.startsWith("/data/v1/surahs/")), "Surah files downloaded again").toEqual([]);
      });
      When("the device goes into airplane mode", () => {
        world.goOffline();
      });
      Then("Surah 1 opens in the Uthmani Script and English with the Ayah translation on just as it showed online", async () => {
        await expect(world.app.surah(1, opened("Uthmani", "English")), "Surah 1 in airplane mode").resolves.toEqual(online);
      });
    },
  );

  Scenario("The Recitation of Al-Fatihah plays with the committed Recitation file's timings", ({ Given, When, Then, And }) => {
    let recitation: CommittedRecitation;
    Given("every request the app makes is recorded", () => world.record());
    And("I open Surah 1 in the Uthmani Script and English with the Ayah translation on", async () => {
      await open(1, "Uthmani", "English");
      recitation = committedRecitation(1);
    });
    When("I press the play control with Ayah 1:1 at the top of the screen", async () => {
      await world.pressPlay(1);
    });
    Then("the app read Surah 1's Recitation from the site's /data/v1/recitations/1.json", () => {
      expect(world.recording!.urls, "what the app fetched").toContain(`${siteOrigin()}/data/v1/recitations/1.json`);
    });
    And(
      "the audio playing is the Surah's audio at the address the committed Recitation file gives, from the start of Ayah 1:1",
      () => {
        expect(world.audio.loaded, "the Surah's audio, at the address the committed Recitation file gives").toBe(recitation.audio);
        expect(world.audio.playing, "the audio is playing").toBe(true);
        expect(world.audio.position, "the audio is at the start of Ayah 1:1").toBe(recitation.ayahs.find((a) => a.number === 1)!.from);
      },
    );
    And(
      "as the Recitation reaches the start of each of Surah 1's timings in turn, Ayah by Ayah, that timing's Word is the Recited Word and its Ayah is marked faintly",
      () => {
        const playing = world.recitation!;
        const timings = recitation.ayahs.flatMap((ayah) => ayah.words.map(([word, start]) => ({ ayah: ayah.number, word, start })));
        expect(timings.length, "timings committed for Surah 1").toBeGreaterThan(0);
        const wrong = timings
          .map(({ ayah, word, start }) => {
            world.audio.reach(start);
            return { at: start, expected: [`1:${ayah}:${word}`, ayah], shown: [playing.recitedWord, playing.markedAyah] };
          })
          .filter(({ expected, shown }) => JSON.stringify(expected) !== JSON.stringify(shown));
        expect(wrong, "timings whose Word was not the Recited Word, or whose Ayah was not marked faintly").toEqual([]);
      },
    );
  });
});
