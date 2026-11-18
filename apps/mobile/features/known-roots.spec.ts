import { describeFeature, loadFeature } from "@amiceli/vitest-cucumber";
import { compareRootLetters, knownLookup, knownRootLetters, parseKnownWords, type KnownWordEntry } from "@saaliheen/known-words";
import { expect } from "vitest";
import { DARK, LIGHT, type Colors } from "../src/colours.ts";
import { me } from "../src/destinations.ts";
import {
  knownRootsTab,
  knownWordsCount,
  openKnownWords,
  rootKey,
  wordCardLook,
  type KnownRootsTab,
  type ListedParticleIn,
  type ListedRootIn,
} from "../src/known-words.ts";
import type { Language, Script, WordCard } from "../src/quran-analysis.ts";
import { openReadingPlaces } from "../src/reading-places.ts";
import { World, datasetRootList, datasetSurahIndex, languageCode, scriptCode, wordCardAt, wordCardsOf } from "./support.ts";

const feature = await loadFeature("./known-roots.feature");

const MARKS = "qwt-known-words";
const SWITCH = "qwt-known-words-colour";

/** The relative luminance of a #RRGGBB colour, by WCAG 2's formula. */
function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
/** The contrast ratio of two #RRGGBB colours, by WCAG 2's formula. */
function contrast(a: string, b: string): number {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}
const THEMES: Record<string, Colors> = { light: LIGHT, dark: DARK };

describeFeature(feature, ({ Background, Scenario, ScenarioOutline, BeforeAllScenarios, BeforeEachScenario, AfterAllScenarios, defineSteps }) => {
  const world = new World();
  BeforeAllScenarios(() => world.start());
  BeforeEachScenario(() => {
    world.goOnline();
    world.stopRecording();
  });
  AfterAllScenarios(() => world.close());

  const knownWords = () => openKnownWords(world.device);
  /** The open Root dialog's Root letters, and whether its Memorized? is on. */
  let dialog: { letters: string; memorized: boolean } | undefined;
  /** The open Known words page's Root and particle lists, in its Language, and its search. */
  let page: { roots: ListedRootIn[]; particles: ListedParticleIn[]; language: Language; search: string } | undefined;
  /** Me's entries' labels, in order, once the Me tab is open. */
  let labels: string[] = [];
  /** Whether the open Surah screen's Known words colour switch is on, as it read it on opening. */
  let colour = false;
  /** The open Surah screen's Recited Word, if any. */
  let recitedWord: string | null = null;

  const screen = () => {
    if (!world.screen) throw new Error("no Surah screen is open");
    return world.screen;
  };
  const openDialog = () => {
    if (!dialog) throw new Error("no Root dialog is open");
    return dialog;
  };
  const tab = async (): Promise<KnownRootsTab> => {
    if (!page) throw new Error("Known words is not open");
    return knownRootsTab(page.roots, knownLookup(await knownWords().entries()), page.search);
  };
  /** The open Known words page's head. */
  const count = async () => {
    if (!page) throw new Error("Known words is not open");
    return knownWordsCount(page.roots, page.particles, knownLookup(await knownWords().entries()));
  };
  /** Surah `surah`'s screen in `script` and `language`, with no Ayah translation. */
  const surahScreen = (surah: number, script: Script = "uthmani", language: Language = "en") =>
    world.app.surah(surah, { script, language, ayahTranslation: false });
  /** The Root letters of the Word at `location`, as its Surah's file gives them. */
  const lettersAt = async (location: string) => {
    const root = wordCardAt(await surahScreen(Number(location.split(":")[0])), location).root;
    if (!root) throw new Error(`the Word at ${location} has no Root`);
    return root.letters;
  };
  const mark = async (location: string) => void (await knownWords().mark(rootKey(await lettersAt(location)), true));
  const isKnownRoot = async (location: string) => knownRootLetters(await knownWords().entries()).has(await lettersAt(location));

  const open = async (surah: number, script: string, language: string) => {
    world.screen = await surahScreen(surah, scriptCode(script), languageCode(language));
    colour = await world.app.knownWordsColour();
    recitedWord = null;
  };
  /** How the open Surah screen draws the Word card `card`, with the marks as they are now. */
  const lookOf = async (card: WordCard, colors: Colors = LIGHT) =>
    wordCardLook(
      card,
      {
        knownWordsColour: colour,
        known: knownLookup(await knownWords().entries()),
        allahReferenceColour: true,
        recited: card.location === recitedWord,
      },
      colors,
    );
  const tinted = async () => {
    const cards = wordCardsOf(screen());
    const looks = await Promise.all(cards.map((card) => lookOf(card)));
    return cards.filter((_, i) => looks[i].tinted).map((card) => card.location);
  };

  const openKnownWordsPage = async (language: string) => {
    const lang = languageCode(language);
    page = {
      roots: await world.app.rootList(lang),
      particles: await world.app.particleList(lang),
      language: lang,
      search: "",
    };
  };
  const chooseMemorizedOnRow = async (letters: string) => {
    const row = (await tab()).rows.find((r) => r.letters === letters);
    if (!row) throw new Error(`the Roots tab has no row of ${letters}`);
    await knownWords().mark(rootKey(letters), !row.known);
  };
  const openMe = async () => {
    const surahName = (n: number) => datasetSurahIndex().find((s) => s.number === n)!.nameLatin;
    labels = (
      await me({
        origin: world.data.origin,
        device: world.device,
        readingPlaces: openReadingPlaces(world.device),
        surahName,
      })
    ).entries.map((e) => e.label);
  };
  /** Every Root the Roots tab lists has the letters searched for, vowel marks and spaces aside, or a meaning holding the search, case aside. */
  const listsOnlyMatches = async () => {
    const { rows } = await tab();
    expect(rows.length).toBeLessThan(1642);
    const all = new Map(page!.roots.map((r) => [r.letters, r.meanings]));
    const search = page!.search.toLowerCase();
    const bare = page!.search.replace(/[^ء-ي]/g, "");
    for (const row of rows) {
      const found = all.get(row.letters)!.some((m) => m.toLowerCase().includes(search)) || (bare !== "" && row.letters.replace(/ /g, "").includes(bare));
      expect(found, `${row.letters} has "${page!.search}"`).toBe(true);
    }
  };
  const searchFor = (search: string) => {
    page!.search = search;
  };
  const switchTo = async (on: boolean) => expect(await world.app.setKnownWordsColour(on)).toBe(on);
  const switchIs = async (on: boolean) => expect(await world.app.knownWordsColour()).toBe(on);
  const launchAgain = () => void world.launch(world.device);

  defineSteps(({ Step }) => {
    Step("I close the app and open it again on the same device", launchAgain);
    Step("the app is launched again on the same device", launchAgain);
    Step("every request the app makes is recorded", () => world.record());
    Step("the app made no request", () => {
      expect(world.recording!.urls).toEqual([]);
      expect(world.data.received).toEqual([]);
      world.stopRecording();
    });
    Step("the device goes offline", () => world.goOffline());

    Step("I open the Root dialog of the Root tag at {any}", async (_, location: string) => {
      const root = wordCardAt(await surahScreen(Number(location.split(":")[0])), location).root!;
      const shown = await world.app.rootDialog(root.id, {
        script: "uthmani",
        language: "en",
      });
      expect(shown.letters).toBe(root.letters);
      dialog = {
        letters: shown.letters,
        memorized: knownRootLetters(await knownWords().entries()).has(shown.letters),
      };
    });
    Step("its Memorized? is off again", () => expect(openDialog().memorized).toBe(false));
    Step("its Memorized? is off", () => expect(openDialog().memorized).toBe(false));
    Step("its Memorized? is on", () => expect(openDialog().memorized).toBe(true));
    const chooseMemorized = async () => {
      const { letters, memorized } = openDialog();
      const entries = await knownWords().mark(rootKey(letters), !memorized);
      dialog = { letters, memorized: knownRootLetters(entries).has(letters) };
    };
    Step("I choose Memorized? in the Root dialog again", chooseMemorized);
    Step("I choose Memorized? in the Root dialog", chooseMemorized);
    Step("the Root of {any} is not a Known Root", async (_, location: string) => expect(await isKnownRoot(location)).toBe(false));
    Step("the Root of {any} is a Known Root", async (_, location: string) => expect(await isKnownRoot(location)).toBe(true));
    Step("I mark the Roots of {any} and {any} as Known Roots at once", async (_, a: string, b: string) => {
      const [first, second] = await Promise.all([lettersAt(a), lettersAt(b)]);
      const words = knownWords();
      await Promise.all([words.mark(rootKey(first), true), words.mark(rootKey(second), true)]);
    });
    Step("I mark the Roots of {any} and {any} as Known Roots", async (_, a: string, b: string) => {
      await mark(a);
      await mark(b);
    });
    Step("I mark the Root of {any} as a Known Root", (_, location: string) => mark(location));
    Step('the device keeps the marks under "qwt-known-words"', async () => {
      const kept = parseKnownWords(await world.device.getItem(MARKS));
      expect(kept.filter((e: KnownWordEntry) => e.known)).toHaveLength(1);
    });

    Step("I open the Me tab", openMe);
    Step('Me offers "Known words" right after "Reading places"', () => {
      expect(labels).toContain("Known words");
      expect(labels.indexOf("Known words")).toBe(labels.indexOf("Reading places") + 1);
    });
    Step('Me offers "Known words colour" right after "Allah reference colour", before "Hide Word meanings"', () => {
      expect(labels).toContain("Known words colour");
      expect(labels.indexOf("Known words colour")).toBe(labels.indexOf("Allah reference colour") + 1);
      expect(labels.indexOf("Hide Word meanings")).toBe(labels.indexOf("Known words colour") + 1);
    });

    Step("I open Known words in {any}", (_, language: string) => openKnownWordsPage(language));
    Step("its Roots tab lists every Root of the Root list, in Arabic letter order", async () => {
      const rows = (await tab()).rows.map((r) => r.letters);
      expect(rows).toHaveLength(1642);
      expect(new Set(rows)).toEqual(new Set(datasetRootList().map((r) => r.letters)));
      for (let i = 1; i < rows.length; i++) expect(compareRootLetters(rows[i - 1], rows[i]), `${rows[i - 1]} before ${rows[i]}`).toBeLessThanOrEqual(0);
    });
    Step('each row shows the Root\'s first three meanings, joined by " · "', async () => {
      const meanings = new Map(datasetRootList().map((r) => [r.letters, r.meanings.en]));
      const { rows } = await tab();
      expect(
        rows.some((r) => meanings.get(r.letters)!.length > 3),
        "some Root has more than three meanings",
      ).toBe(true);
      for (const row of rows) expect(row.meanings).toBe(meanings.get(row.letters)!.slice(0, 3).join(" · "));
    });
    Step("its count is {string}", async (_, shown: string) => expect(await count()).toBe(shown));
    Step("I choose Memorized? on the row of {string}", (_, letters: string) => chooseMemorizedOnRow(letters));
    Step("the row of {string} is memorized", async (_, letters: string) => {
      expect((await tab()).rows.find((r) => r.letters === letters)?.known).toBe(true);
    });
    Step("I search the Roots tab for {string}", (_, search: string) => searchFor(search));
    Step("every Root it lists has the letters or a meaning searched for", listsOnlyMatches);
    Step("the Roots tab lists no Root and says {string}", async (_, none: string) => {
      const shown = await tab();
      expect(shown.rows).toEqual([]);
      expect(shown.none).toBe(none);
    });

    Step("I switch Known words colour on", () => switchTo(true));
    Step("I switch Known words colour off", () => switchTo(false));
    Step("the Known words colour switch is on", () => switchIs(true));
    Step("the Known words colour switch is off", () => switchIs(false));
    Step('the device keeps "on" under "qwt-known-words-colour"', async () => expect(await world.device.getItem(SWITCH)).toBe("on"));

    Step("I open Surah {int} in the {any} Script and {any}", (_, surah: number, script: string, language: string) => open(surah, script, language));
    Step("no Word card of Surah {int} is tinted", async () => {
      expect(wordCardsOf(screen()).length).toBeGreaterThan(0);
      expect(await tinted()).toEqual([]);
    });
    Step("the Word cards tinted are those whose Root is the Root of {any}", async (_, location: string) => {
      const letters = wordCardAt(screen(), location).root!.letters;
      const expected = wordCardsOf(screen())
        .filter((card) => card.root?.letters === letters)
        .map((card) => card.location);
      expect(expected.length, "the Surah has Words of that Root").toBeGreaterThan(1);
      expect(await tinted()).toEqual(expected);
    });
    Step("no Word card without a Root is tinted", async () => {
      const rootless = wordCardsOf(screen()).filter((card) => card.root === null);
      expect(rootless.length, "the Surah has Words with no Root").toBeGreaterThan(0);
      for (const card of rootless) expect((await lookOf(card)).tinted).toBe(false);
    });
    Step("the Recited Word is the Word at {any}", (_, location: string) => {
      recitedWord = location;
    });
    Step("the Word card at {any} is tinted with its Arabic in Allah reference colour", async (_, location: string) => {
      const card = wordCardAt(screen(), location);
      expect(card.allahReference, `${location} is an Allah reference`).toBe(true);
      const look = await lookOf(card);
      expect(look).toMatchObject({
        tinted: true,
        background: LIGHT.known,
        arabic: LIGHT.allah,
      });
    });
    Step("the Word card at {any} is tinted and marked as the Recited Word", async (_, location: string) => {
      const look = await lookOf(wordCardAt(screen(), location));
      expect(look).toMatchObject({
        tinted: true,
        background: LIGHT.known,
        border: LIGHT.accent,
      });
    });

  });
  const readsAt45 = (theme: string) => {
    const colors = THEMES[theme];
    const look = wordCardLook(
      { root: { id: 1, letters: "ر ح م" }, particle: null, allahReference: false },
      {
        knownWordsColour: true,
        known: knownLookup([{ kind: "root", text: "ر ح م", known: true, markedAt: 1 }]),
        allahReferenceColour: true,
        recited: false,
      },
      colors,
    );
    expect(look.background).toBe(colors.known);
    expect(contrast(look.arabic, look.background)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(look.meaning, look.background)).toBeGreaterThanOrEqual(4.5);
  };
  const readsAt3 = (theme: string) => {
    const colors = THEMES[theme];
    const look = wordCardLook(
      { root: { id: 1, letters: "ا ل ه" }, particle: null, allahReference: true },
      {
        knownWordsColour: true,
        known: knownLookup([{ kind: "root", text: "ا ل ه", known: true, markedAt: 1 }]),
        allahReferenceColour: true,
        recited: true,
      },
      colors,
    );
    expect(look.arabic).toBe(colors.allah);
    expect(contrast(look.arabic, look.background)).toBeGreaterThanOrEqual(3);
    expect(contrast(look.border, look.background)).toBeGreaterThanOrEqual(3);
  };
  const notPlain = (theme: string) => {
    const colors = THEMES[theme];
    expect(colors.known).not.toBe(colors.paper);
    const plain = wordCardLook(
      { root: null, particle: null, allahReference: false },
      {
        knownWordsColour: true,
        known: () => true,
        allahReferenceColour: true,
        recited: false,
      },
      colors,
    );
    expect(plain).toMatchObject({
      tinted: false,
      arabic: colors.ink,
      meaning: colors.muted,
    });
  };

  Background(({ Given }) => {
    Given("the app is launched on a new device", () => void world.launch());
  });
  Scenario("Memorized? in the Root dialog marks the Root, and unmarks it", () => {});
  Scenario("Marking a Root sends nothing anywhere", () => {});
  Scenario("Me links to Known words right after Reading places", () => {});
  Scenario("The Roots tab lists every Root in letter order, with its count", () => {});
  Scenario("Memorized? on a row marks the Root and counts it", () => {});
  ScenarioOutline('Searching "<search>" finds "<root>"', ({ When, And, Then }, { search, root, Language }) => {
    When("I open Known words in <Language>", () => openKnownWordsPage(Language));
    And('I search the Roots tab for "<search>"', () => searchFor(search));
    Then('the Roots tab lists "<root>"', async () => expect((await tab()).rows.map((r) => r.letters)).toContain(root));
    And("every Root it lists has the letters or a meaning searched for", listsOnlyMatches);
  });
  Scenario("A search no Root matches says so", () => {});
  Scenario("A new device has Known words colour off, and tints no Word card", () => {});
  Scenario("Switched on, the switch stays on after the app is closed and opened again, and off once switched off", () => {});
  ScenarioOutline('A saved switch of "<value>" reads as off', ({ Given, And, When, Then }, { value }) => {
    Given("I switch Known words colour on", () => switchTo(true));
    And('the device\'s "qwt-known-words-colour" was since changed to "<value>"', () => world.device.setItem(SWITCH, value));
    When("I close the app and open it again on the same device", launchAgain);
    Then("the Known words colour switch is off", () => switchIs(false));
  });
  Scenario("Switching Known words colour sends nothing anywhere", () => {});
  Scenario("Me offers Known words colour right after Allah reference colour, among the settings", () => {});
  Scenario("With Known words colour on, exactly the Known Roots' Word cards are tinted", () => {});
  Scenario("An Allah reference keeps its colour, and the Recited Word its mark, on the green", () => {});
  ScenarioOutline(
    "On the <theme> green, the Arabic and Word meaning read at 4.5:1, the Allah reference colour and the Recited Word's mark at 3:1",
    ({ Then, And }, { theme }) => {
      Then("on the <theme> theme's known green the Arabic and the Word meaning have a contrast of at least 4.5:1", () => readsAt45(theme));
      And("on the <theme> theme's known green the Allah reference colour and the Recited Word's mark have a contrast of at least 3:1", () => readsAt3(theme));
      And("the <theme> theme's known green is not the Word card's own background", () => notPlain(theme));
    },
  );
  Scenario("Marks survive closing the app and opening it again", () => {});
  Scenario("Two Roots marked at once are both kept", () => {});
  Scenario("With no connection, Known words opens from the kept Root list and a Root is marked", () => {});
  Scenario("Marking a Root tints the open Surah's Word cards at once", () => {});
});
