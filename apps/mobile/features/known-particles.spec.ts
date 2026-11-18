import { describeFeature, loadFeature } from "@amiceli/vitest-cucumber";
import { knownLookup, parseKnownWords, type KnownWordEntry } from "@saaliheen/known-words";
import { expect } from "vitest";
import { LIGHT } from "../src/colours.ts";
import {
  KNOWN_WORDS,
  knownParticlesTab,
  knownWordsCount,
  openKnownWords,
  particleKey,
  wordCardLook,
  type KnownParticlesTab,
  type ListedParticleIn,
  type ListedRootIn,
} from "../src/known-words.ts";
import type { Language, Script } from "../src/quran-analysis.ts";
import { World, datasetParticle, datasetParticleList, languageCode, scriptCode, wordCardAt, wordCardsOf } from "./support.ts";

const feature = await loadFeature("./known-particles.feature");

describeFeature(feature, ({ Background, Scenario, ScenarioOutline, BeforeAllScenarios, BeforeEachScenario, AfterAllScenarios, defineSteps }) => {
  const world = new World();
  BeforeAllScenarios(() => world.start());
  BeforeEachScenario(() => {
    world.goOnline();
    world.stopRecording();
  });
  AfterAllScenarios(() => world.close());

  const knownWords = () => openKnownWords(world.device);
  const known = async () => knownLookup(await knownWords().entries());
  /** The open Particle dialog's particle, and whether its Memorized? is on. */
  let dialog: { kind: "lemma" | "spelling"; text: string; memorized: boolean } | undefined;
  /** The open Known words page's lists, in its Language, its Script and its search. */
  let page: { roots: ListedRootIn[]; particles: ListedParticleIn[]; language: Language; script: Script; search: string } | undefined;
  /** Whether the open Surah screen's Known words colour switch is on, as it read it on opening. */
  let colour = false;

  const openPage = () => {
    if (!page) throw new Error("Known words is not open");
    return page;
  };
  const openDialog = () => {
    if (!dialog) throw new Error("no Particle dialog is open");
    return dialog;
  };
  const screen = () => {
    if (!world.screen) throw new Error("no Surah screen is open");
    return world.screen;
  };
  const tab = async (): Promise<KnownParticlesTab> => {
    const { particles, script, search } = openPage();
    return knownParticlesTab(particles, script, await known(), search);
  };
  /** The kept Known particles, as kind and text. */
  const keptParticles = async () =>
    parseKnownWords(await world.device.getItem(KNOWN_WORDS))
      .filter((e: KnownWordEntry) => e.known && e.kind !== "root")
      .map(({ kind, text }) => ({ kind, text }));
  const launchAgain = () => void world.launch(world.device);

  const openKnownWordsPage = async (language: string, script: string) => {
    const lang = languageCode(language);
    page = {
      roots: await world.app.rootList(lang),
      particles: await world.app.particleList(lang),
      language: lang,
      script: scriptCode(script),
      search: "",
    };
  };
  const rowOf = async (text: string) => {
    const row = (await tab()).rows.find((r) => r.key.text === text);
    if (!row) throw new Error(`the Particles tab has no row of ${text}`);
    return row;
  };
  const chooseMemorizedOnRow = async (text: string) => {
    const row = await rowOf(text);
    await knownWords().mark(row.key, !row.known);
  };
  const tinted = async () => {
    const lookup = await known();
    return wordCardsOf(screen())
      .filter((card) => wordCardLook(card, { knownWordsColour: colour, known: lookup, allahReferenceColour: true, recited: false }, LIGHT).tinted)
      .map((card) => card.location);
  };

  defineSteps(({ Step }) => {
    Step("I close the app and open it again on the same device", launchAgain);
    Step("every request the app makes is recorded", () => world.record());
    Step("the app made no request", () => {
      expect(world.recording!.urls).toEqual([]);
      expect(world.data.received).toEqual([]);
      world.stopRecording();
    });
    Step("the device goes offline", () => world.goOffline());

    Step("I open the Particle dialog of the Particle tag at {any}", async (_, location: string) => {
      const screenOf = await world.app.surah(Number(location.split(":")[0]), { script: "uthmani", language: "en", ayahTranslation: false });
      const tag = wordCardAt(screenOf, location).particle;
      if (!tag) throw new Error(`the Word card at ${location} has no Particle tag`);
      const shown = await world.app.particleDialog(tag.id, { script: "uthmani", language: "en" });
      dialog = { kind: shown.kind, text: shown.text, memorized: (await known())(particleKey(shown)) };
    });
    Step("its Memorized? is off again", () => expect(openDialog().memorized).toBe(false));
    Step("its Memorized? is off", () => expect(openDialog().memorized).toBe(false));
    Step("its Memorized? is on", () => expect(openDialog().memorized).toBe(true));
    const chooseMemorized = async () => {
      const { kind, text, memorized } = openDialog();
      const entries = await knownWords().mark(particleKey({ kind, text }), !memorized);
      dialog = { kind, text, memorized: knownLookup(entries)(particleKey({ kind, text })) };
    };
    Step("I choose Memorized? in the Particle dialog again", chooseMemorized);
    Step("I choose Memorized? in the Particle dialog", chooseMemorized);
    Step("the device keeps the Lemma particle {string} as a Known particle", async (_, text: string) =>
      expect(await keptParticles()).toEqual([{ kind: "lemma", text }]),
    );
    Step("the device keeps the Spelling particle {string} as a Known particle", async (_, text: string) =>
      expect(await keptParticles()).toEqual([{ kind: "spelling", text }]),
    );
    Step("the device keeps no Known particle", async () => expect(await keptParticles()).toEqual([]));

    Step("I open the Known words page again, in {any} with the {any} Script", (_, language: string, script: string) => openKnownWordsPage(language, script));
    Step("I open Known words in {any} with the {any} Script", (_, language: string, script: string) => openKnownWordsPage(language, script));
    Step("its head reads {string}", (_, head: string) => headReads(head));
  });
  const headReads = async (head: string) => {
    const { roots, particles } = openPage();
    expect(knownWordsCount(roots, particles, await known())).toBe(head);
  };
  const noRowMemorized = async () => expect((await tab()).rows.filter((r) => r.known)).toEqual([]);
  const listsEveryParticle = async (script: string, language: string) => {
    const listed = datasetParticleList();
    expect(listed).toHaveLength(352);
    const occurrences = listed.map((p) => datasetParticle(p.id)!.occurrences);
    expect(
      occurrences.every((c, i) => i === 0 || c <= occurrences[i - 1]),
      "most frequent first",
    ).toBe(true);
    const lang = languageCode(language);
    expect(
      listed.some((p) => p.meanings[lang].length > 3),
      "some particle has more than three meanings",
    ).toBe(true);
    expect((await tab()).rows).toEqual(
      listed.map((p) => ({
        key: { kind: p.kind, text: p.text },
        arabic: scriptCode(script) === "indopak" ? p.indopak : p.text,
        meanings: p.meanings[lang].slice(0, 3).join(" · "),
        known: false,
      })),
    );
  };
  defineSteps(({ Step }) => {
    Step("I search the Particles tab for {string}", (_, search: string) => {
      openPage().search = search;
    });
    Step("the Particles tab lists {string}", async (_, text: string) => expect((await tab()).rows.map((r) => r.key.text)).toContain(text));
    Step("the Particles tab does not list {string}", async (_, text: string) => expect((await tab()).rows.map((r) => r.key.text)).not.toContain(text));
    Step("the Particles tab lists no particle and says {string}", async (_, none: string) => {
      const shown = await tab();
      expect(shown.rows).toEqual([]);
      expect(shown.none).toBe(none);
    });
    Step("I choose Memorized? again on the Particles tab's row of {string}", (_, text: string) => chooseMemorizedOnRow(text));
    Step("I choose Memorized? on the Particles tab's row of {string}", (_, text: string) => chooseMemorizedOnRow(text));
    Step("the Particles tab's row of {string} is memorized", async (_, text: string) => expect((await rowOf(text)).known).toBe(true));

    Step("I switch Known words colour on", async () => expect(await world.app.setKnownWordsColour(true)).toBe(true));
    Step("I open Surah {int} in the {any} Script and {any}", async (_, surah: number, script: string, language: string) => {
      world.screen = await world.app.surah(surah, { script: scriptCode(script), language: languageCode(language), ayahTranslation: false });
      colour = await world.app.knownWordsColour();
    });
    Step("the Word cards tinted are those whose particle is the {any} {string}", async (_, kind: string, text: string) => {
      const expected = wordCardsOf(screen())
        .filter((card) => card.particle?.kind === kind.toLowerCase() && card.particle.text === text)
        .map((card) => card.location);
      expect(expected.length, "the Surah has Words of that particle").toBeGreaterThan(0);
      expect(await tinted()).toEqual(expected);
    });
    Step("no Word card of Surah {int} is tinted", async () => {
      expect(wordCardsOf(screen()).length).toBeGreaterThan(0);
      expect(await tinted()).toEqual([]);
    });
  });

  Background(({ Given }) => {
    Given("the app is launched on a new device", () => void world.launch());
  });
  Scenario("Memorized? in the Particle dialog marks its particle, kept by its kind and text, and unmarks it", () => {});
  Scenario("Marking a particle sends nothing anywhere", () => {});
  ScenarioOutline("The Particles tab in <Language> lists every particle most frequent first, in the <Script> Script", ({ When, Then, And }, { Language, Script }) => {
    When("I open Known words in <Language> with the <Script> Script", () => openKnownWordsPage(Language, Script));
    Then('its head reads "0 of 1,642 Roots · 0 of 352 particles"', () => headReads("0 of 1,642 Roots · 0 of 352 particles"));
    And(
      'its Particles tab lists every particle of the particle list, most frequent first, each in its <Script> text with its first three meanings in <Language>, joined by " · "',
      () => listsEveryParticle(Script, Language),
    );
    And("no row of the Particles tab is memorized", noRowMemorized);
  });
  ScenarioOutline('The Particles tab finds particles by their Arabic, "<search>"', ({ When, And, Then }, { search, found, other }) => {
    When("I open Known words in English with the Uthmani Script", () => openKnownWordsPage("English", "Uthmani"));
    And('I search the Particles tab for "<search>"', () => {
      openPage().search = search;
    });
    Then('the Particles tab lists "<found>"', async () => expect((await tab()).rows.map((r) => r.key.text)).toContain(found));
    And('the Particles tab does not list "<other>"', async () => expect((await tab()).rows.map((r) => r.key.text)).not.toContain(other));
  });
  Scenario("The Particles tab finds particles by their meanings", () => {});
  Scenario("A search no particle matches says so", () => {});
  Scenario("Memorized? on rows marks particles, counts them in the head and shows in the Particle dialog", () => {});
  Scenario("With no connection, the Particles tab opens from the kept particle list and a particle is marked", () => {});
  Scenario("With Known words colour on, the Word cards of a Known Lemma particle are tinted, at once, and no other", () => {});
  Scenario("With Known words colour on, the Word cards of a Known Spelling particle are tinted, and no other", () => {});
  Scenario("With Known words colour off, a Known particle's Word cards are not tinted", () => {});
});
