import { describeFeature, loadFeature } from "@amiceli/vitest-cucumber";
import { expect } from "vitest";
import type { Language, RootDialog, Script } from "../src/quran-analysis.ts";
import { World, datasetRoot, languageCode, scriptCode, wordCardAt, wordCardsOf } from "./support.ts";

const feature = await loadFeature("./root-dialog.feature");

/** A Word location as numbers, for Quran order. */
const locationKey = (location: string) => location.split(":").map(Number);
const inQuranOrder = (locations: string[]) =>
  locations.every((loc, i) => {
    if (i === 0) return true;
    const [a, b] = [locationKey(locations[i - 1]), locationKey(loc)];
    return a[0] < b[0] || (a[0] === b[0] && (a[1] < b[1] || (a[1] === b[1] && a[2] < b[2])));
  });
const nonIncreasing = (counts: number[]) => counts.every((c, i) => i === 0 || c <= counts[i - 1]);

describeFeature(feature, ({ Background, Scenario, ScenarioOutline, BeforeAllScenarios, AfterAllScenarios }) => {
  const world = new World();
  BeforeAllScenarios(() => world.start());
  AfterAllScenarios(() => world.close());

  /** Opens the Root tag on the Word card at `word` of the Surah on screen, naming that Word, as the Surah screen does. */
  const openRootTagAt = async (word: string, options: { script: Script; language: Language }) => {
    const tag = wordCardAt(world.screen!, word).root;
    expect(tag, `the Word card at ${word} has a Root tag`).not.toBeNull();
    world.dialog = await world.app.rootDialog(tag!.id, { ...options, word });
    return tag!.id;
  };
  /** The Lemma the dialog marks, the Spelling and Word location it marks within it. */
  const markedIn = (dialog: RootDialog) => {
    expect(dialog.marked, "the dialog marks a Word").not.toBeNull();
    const lemma = dialog.lemmas[dialog.marked!.lemma];
    return { lemma, spelling: lemma.spellings[dialog.marked!.spelling], location: dialog.marked!.location };
  };
  const openAtFirst = (dialog: RootDialog) => dialog.lemmas.filter((l) => l.openAtFirst);

  Background(({ Given }) => {
    Given("the app is launched on a new device", () => {
      world.launch();
    });
  });

  ScenarioOutline(
    "The Root dialog for ر ح م in <Language> with the <Script> Script",
    ({ Given, When, Then, And }, { Script, Language }) => {
      const script = scriptCode(Script);
      const language = languageCode(Language);
      let rootId: number;

      Given("I open Surah 1 in the <Script> Script and <Language>", async () => {
        world.screen = await world.app.surah(1, { script, language, ayahTranslation: false });
      });
      When("I open the Root tag on the Word card at 1:1:3", async () => {
        rootId = await openRootTagAt("1:1:3", { script, language });
      });
      Then('the Root dialog for "ر ح م" is open', () => {
        expect(world.dialog!.letters).toBe("ر ح م");
      });
      And('its header shows "ر ح م", "r-ḥ-m", 339 occurrences and 47 unique Words', () => {
        const { letters, transliteration, occurrences, uniqueWords } = world.dialog!;
        expect({ letters, transliteration, occurrences, uniqueWords }).toEqual({
          letters: "ر ح م",
          transliteration: "r-ḥ-m",
          occurrences: 339,
          uniqueWords: 47,
        });
      });
      And(
        "it lists ر ح م's 9 Lemmas, most frequent first, each with its Lemma, its count and its representative meaning in <Language>",
        () => {
          const file = datasetRoot(rootId);
          const lemmas = world.dialog!.lemmas.map(({ text, occurrences, meaning }) => ({ text, occurrences, meaning }));
          expect(lemmas).toHaveLength(9);
          expect(nonIncreasing(lemmas.map((l) => l.occurrences)), "most frequent first").toBe(true);
          expect(lemmas).toEqual(file.lemmas.map((l) => ({ text: l.text, occurrences: l.occurrences, meaning: l.meaning[language] })));
        },
      );
      And(
        "each Lemma lists its Spellings, most frequent first, each in its <Script> text only, with its meaning in <Language> and its Word locations in Quran order",
        () => {
          const file = datasetRoot(rootId);
          world.dialog!.lemmas.forEach((lemma, i) => {
            expect(nonIncreasing(lemma.spellings.map((s) => s.locations.length)), `Lemma ${i + 1}: most frequent first`).toBe(true);
            for (const s of lemma.spellings) expect(inQuranOrder(s.locations), `${s.text}: Quran order`).toBe(true);
            expect(lemma.spellings).toEqual(
              file.lemmas[i].spellings.map((s) => ({ text: s[script], meaning: s.meaning[language], locations: s.locations })),
            );
          });
        },
      );
      And("it shows 84 Spellings and 339 Word locations in all", () => {
        const spellings = (world.dialog as RootDialog).lemmas.flatMap((l) => l.spellings);
        expect(spellings).toHaveLength(84);
        expect(spellings.flatMap((s) => s.locations)).toHaveLength(339);
      });
    },
  );

  ScenarioOutline(
    "The Root dialog opens on the tapped Word's Lemma, <Word> in the <Script> Script",
    ({ Given, When, Then, And }, { Word, Lemma, Script }) => {
      const script = scriptCode(Script);
      let rootId: number;
      Given("I open Surah 1 in the <Script> Script and English", async () => {
        world.screen = await world.app.surah(1, { script, language: "en", ayahTranslation: false });
      });
      When("I open the Root tag on the Word card at <Word>", async () => {
        rootId = await openRootTagAt(Word, { script, language: "en" });
      });
      Then('the Root dialog for "ر ح م" is open', () => {
        expect(world.dialog!.letters).toBe("ر ح م");
      });
      And('it marks the Lemma "<Lemma>", the Spelling that holds <Word>, and the Word location <Word>', () => {
        const { lemma, spelling, location } = markedIn(world.dialog!);
        expect(lemma.text).toBe(Lemma);
        expect(spelling.locations).toContain(Word);
        expect(location).toBe(Word);
      });
      And('the Lemma "<Lemma>" is the one open at first, and every other Lemma starts closed', () => {
        expect(openAtFirst(world.dialog!).map((l) => l.text)).toEqual([Lemma]);
      });
      And("ر ح م's Lemmas are in the order its /data/v1 Root file gives them", () => {
        expect(world.dialog!.lemmas.map((l) => l.text)).toEqual(datasetRoot(rootId).lemmas.map((l) => l.text));
      });
    },
  );

  Scenario("A Word with no Lemma marks the row of Words with no Lemma", ({ Given, When, Then, And }) => {
    Given("I open Surah 24 in the Uthmani Script and English", async () => {
      world.screen = await world.app.surah(24, { script: "uthmani", language: "en", ayahTranslation: false });
    });
    When("I open the Root tag on the Word card at 24:33:30", async () => {
      await openRootTagAt("24:33:30", { script: "uthmani", language: "en" });
    });
    Then('the Root dialog for "ف ت ي" is open', () => {
      expect(world.dialog!.letters).toBe("ف ت ي");
    });
    And("it marks the row of Words with no Lemma, the Spelling that holds 24:33:30, and the Word location 24:33:30", () => {
      const { lemma, spelling, location } = markedIn(world.dialog!);
      expect(lemma.text).toBeNull();
      expect(spelling.locations).toContain("24:33:30");
      expect(location).toBe("24:33:30");
    });
    And("the row of Words with no Lemma is the one open at first, and every other Lemma starts closed", () => {
      expect(openAtFirst(world.dialog!).map((l) => l.text)).toEqual([null]);
    });
  });

  Scenario("With no Word, the Root dialog marks nothing", ({ Given, When, Then, And }) => {
    Given("I open Surah 1 in the Uthmani Script and English", async () => {
      world.screen = await world.app.surah(1, { script: "uthmani", language: "en", ayahTranslation: false });
    });
    When("I open the Root dialog of the Root tag on the Word card at 1:1:3 without naming its Word", async () => {
      world.dialog = await world.app.rootDialog(wordCardAt(world.screen!, "1:1:3").root!.id, { script: "uthmani", language: "en" });
    });
    Then('the Root dialog for "ر ح م" is open', () => {
      expect(world.dialog!.letters).toBe("ر ح م");
    });
    And("it marks nothing, and every Lemma starts closed", () => {
      expect(world.dialog!.marked).toBeNull();
      expect(openAtFirst(world.dialog!)).toEqual([]);
    });
  });

  Scenario("Each Root tag of Surah 1 opens the Root dialog of the Root it names", ({ Given, When, Then }) => {
    const opened: { letters: string; id: number; dialog: RootDialog }[] = [];
    Given("I open Surah 1 in the Uthmani Script and English", async () => {
      world.screen = await world.app.surah(1, { script: "uthmani", language: "en", ayahTranslation: false });
    });
    When("I open the Root tag on every Word card of Surah 1 that has one", async () => {
      for (const card of wordCardsOf(world.screen!)) {
        if (!card.root) continue;
        opened.push({ ...card.root, dialog: await world.app.rootDialog(card.root.id, { script: "uthmani", language: "en" }) });
      }
      expect(opened.length).toBeGreaterThan(0);
    });
    Then("each opens the Root dialog for that Root tag's letters, as its /data/v1 Root file gives them", () => {
      expect(opened.length, "Surah 1 has Root tags").toBeGreaterThan(0);
      for (const { id, letters, dialog } of opened) {
        const file = datasetRoot(id);
        expect(file.letters).toBe(letters);
        expect({ letters: dialog.letters, occurrences: dialog.occurrences, lemmas: dialog.lemmas.length }).toEqual({
          letters: file.letters,
          occurrences: file.occurrences,
          lemmas: file.lemmas.length,
        });
      }
    });
  });
});
