// #173: the app's Root dialog and Juz tab served by the site itself, the
// website's production build on PORT reading /data/v1 from the run's own
// Postgres (serve-site.ts), rather than by features/support.ts's stand-in
// origin. What the app shows is compared with the Root files and Juz file as
// committed before they moved into Neon, read from git at BEFORE_ROOTS_MOVED
// by the website's own helpers (apps/web/features/site/committed-output.ts).

import { describeFeature, loadFeature } from "@amiceli/vitest-cucumber";
import type { JuzLists, Root } from "@saaliheen/dataset/types";
import { expect } from "vitest";
import { committedJuz, committedRoot } from "../../../web/features/site/committed-output.ts";
import type { Language, RootDialog, Script } from "../../src/quran-analysis.ts";
import { languageCode, readIndex, scriptCode, wordCardAt, wordCardsOf } from "../support.ts";
import { SiteWorld, siteOrigin } from "./site-world.ts";

const feature = await loadFeature("./roots-and-juz-served-by-the-site.feature");

/** Root `id`'s file as committed before the Roots moved into Neon. */
function rootFile(id: number): Root {
  const root = committedRoot<Root>(id);
  if (!root) throw new Error(`no Root file ${id} was committed`);
  return root;
}

/** The Root dialog `root`'s committed file gives, in `script` and `language`, opened on no Word. */
const dialogOf = (root: Root, script: Script, language: Language): RootDialog => ({
  letters: root.letters,
  transliteration: root.transliteration,
  occurrences: root.occurrences,
  uniqueWords: root.uniqueWords,
  lemmas: root.lemmas.map((l) => ({
    text: l.text,
    occurrences: l.occurrences,
    meaning: l.meaning[language],
    spellings: l.spellings.map((s) => ({ text: s[script], meaning: s.meaning[language], locations: s.locations })),
    openAtFirst: false,
  })),
  marked: null,
});

/** The Root dialog's header and Lemmas without their Spellings. */
const header = ({ lemmas, ...rest }: RootDialog) => ({ ...rest, lemmas: lemmas.map(({ spellings, ...lemma }) => (void spellings, lemma)) });

describeFeature(feature, ({ Background, Scenario, ScenarioOutline, BeforeAllScenarios, AfterAllScenarios, BeforeEachScenario }) => {
  const world = new SiteWorld();
  BeforeAllScenarios(() => world.start());
  BeforeEachScenario(() => world.stopRecording());
  AfterAllScenarios(() => world.close());

  Background(({ Given }) => {
    Given("the app is launched on a new device, with the site as its data origin", () => {
      expect(world.data.origin, "the app's data origin").toBe(siteOrigin());
      world.launch();
    });
  });

  ScenarioOutline(
    "The Root dialog for ر ح م in <Language> with the <Script> Script is its committed Root file",
    ({ Given, When, Then, And }, { Script, Language }) => {
      const [script, language] = [scriptCode(Script), languageCode(Language)];
      let dialog: RootDialog;
      Given("every request the app makes is recorded", () => world.record());
      And("I open Surah 1 in the <Script> Script and <Language>", async () => {
        world.screen = await world.app.surah(1, { script, language, ayahTranslation: false });
      });
      When("I open the Root tag on the Word card at 1:1:3", async () => {
        const tag = wordCardAt(world.screen!, "1:1:3").root;
        expect(tag, "the Word card at 1:1:3 has a Root tag").not.toBeNull();
        dialog = await world.app.rootDialog(tag!.id, { script, language });
      });
      Then("the app read the Root from the site's /data/v1/roots/1356.json", () => {
        expect(world.recording!.urls, "what the app fetched").toContain(`${siteOrigin()}/data/v1/roots/1356.json`);
      });
      And(
        'the Root dialog shows "ر ح م", its transliteration, its counts and its Lemmas, each with its count and its <Language> meaning, as the committed Root file gave them',
        () => {
          expect(dialog.letters).toBe("ر ح م");
          expect(header(dialog)).toEqual(header(dialogOf(rootFile(1356), script, language)));
        },
      );
      And(
        "each Lemma lists its Spellings in their <Script> text, with their <Language> meanings and Word locations, as the committed Root file gave them",
        () => {
          const expected = dialogOf(rootFile(1356), script, language);
          expect(expected.lemmas.flatMap((l) => l.spellings), "the committed Spellings").toHaveLength(84);
          expect(dialog.lemmas.map((l) => l.spellings)).toEqual(expected.lemmas.map((l) => l.spellings));
        },
      );
    },
  );

  Scenario("Each Root tag of Surah 1 opens the Root dialog its committed Root file gave", ({ Given, When, Then }) => {
    const opened: { id: number; dialog: RootDialog }[] = [];
    Given("I open Surah 1 in the Uthmani Script and English", async () => {
      world.screen = await world.app.surah(1, { script: "uthmani", language: "en", ayahTranslation: false });
    });
    When("I open the Root tag on every Word card of Surah 1 that has one", async () => {
      for (const card of wordCardsOf(world.screen!)) {
        if (card.root) opened.push({ id: card.root.id, dialog: await world.app.rootDialog(card.root.id, { script: "uthmani", language: "en" }) });
      }
      expect(opened.length, "Surah 1 has Root tags").toBeGreaterThan(0);
    });
    Then("each Root dialog shows the letters, transliteration, counts and Lemmas its committed Root file gave", () => {
      for (const { id, dialog } of opened) expect(dialog, `Root ${id}`).toEqual(dialogOf(rootFile(id), "uthmani", "en"));
    });
  });

  ScenarioOutline("The Juz tab lists the <Script> Juz as the committed Juz file did", ({ When, Then }, { Script }) => {
    const script = scriptCode(Script);
    let rows: Awaited<ReturnType<ReturnType<typeof readIndex>["juzIndex"]>>;
    When("I open the Juz tab in the <Script> Script", async () => {
      rows = await readIndex(world.app).juzIndex(script);
    });
    Then(
      "it lists Juz 1 to 30 in order, each with its <Script> name, first Ayah and last Ayah as the committed Juz file gave them",
      () => {
        const expected = (committedJuz() as JuzLists)[script];
        expect(expected.map((j) => j.number), "the committed Juz list").toEqual(Array.from({ length: 30 }, (_, k) => k + 1));
        expect(rows.map(({ number, name, firstAyah, lastAyah }) => ({ number, name, firstAyah, lastAyah }))).toEqual(expected);
      },
    );
  });
});
