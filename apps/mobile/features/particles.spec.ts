import { describeFeature, loadFeature } from "@amiceli/vitest-cucumber";
import type { Particle, ParticleTag } from "@saaliheen/dataset/types";
import { expect } from "vitest";
import type { Language, ParticleDialog, Script, WordCard } from "../src/quran-analysis.ts";
import { World, datasetParticle, datasetSurah, languageCode, scriptCode, wordCardAt, wordCardsOf } from "./support.ts";

const feature = await loadFeature("./particles.feature");

/** Each served Surah file's particles by Word location, read once a Surah: building the file is slow, and Surah 2 asks for thousands. */
const particlesBySurah = new Map<number, Map<string, ParticleTag | undefined>>();

/** The particle the served Surah file gives the Word at `location`, if any. */
function particleOf(location: string): ParticleTag | undefined {
  const surah = Number(location.split(":")[0]);
  if (!particlesBySurah.has(surah)) {
    const words = datasetSurah(surah).ayahs.flatMap((a) => a.words);
    particlesBySurah.set(surah, new Map(words.map((w) => [w.location, w.particle])));
  }
  return particlesBySurah.get(surah)!.get(location);
}

/** The builder's particle `id`, as /data/v1/particles/<id>.json gives it. */
function particleFile(id: number): Particle {
  const file = datasetParticle(id);
  if (!file) throw new Error(`no particle ${id}`);
  return file;
}

/** A particle's text, or a Spelling's, in `script`. */
const inScript = (particle: { text?: string; uthmani?: string; indopak: string }, script: Script) =>
  script === "indopak" ? particle.indopak : (particle.text ?? particle.uthmani);

/** Particle `id`'s dialog as its particle file gives it, in `script` and `language`, marking `marked`. */
const expectedDialog = (id: number, script: Script, language: Language, marked: ParticleDialog["marked"] = null): ParticleDialog => {
  const file = particleFile(id);
  return {
    id,
    kind: file.kind,
    text: file.text,
    arabic: script === "indopak" ? file.indopak : file.text,
    occurrences: file.occurrences,
    spellings: file.spellings.map((s) => ({ text: s[script], meaning: s.meaning[language], locations: s.locations })),
    marked,
  };
};

/** A Word location as numbers, for Quran order. */
const locationKey = (location: string) => location.split(":").map(Number);
const inQuranOrder = (locations: string[]) =>
  locations.every((loc, i) => {
    if (i === 0) return true;
    const [a, b] = [locationKey(locations[i - 1]), locationKey(loc)];
    return a[0] < b[0] || (a[0] === b[0] && (a[1] < b[1] || (a[1] === b[1] && a[2] < b[2])));
  });
const nonIncreasing = (counts: number[]) => counts.every((c, i) => i === 0 || c <= counts[i - 1]);

describeFeature(feature, ({ Background, Scenario, ScenarioOutline, BeforeAllScenarios, BeforeEachScenario, AfterAllScenarios, defineSteps }) => {
  const world = new World();
  BeforeAllScenarios(() => world.start());
  BeforeEachScenario(() => {
    world.goOnline();
    world.data.reset();
  });
  AfterAllScenarios(() => world.close());

  /** The open Surah screen's Script and Language. */
  let opened: { script: Script; language: Language } = { script: "uthmani", language: "en" };
  /** The open Particle dialog. */
  let dialog: ParticleDialog | undefined;
  /** Surah 1's hash in the manifest before a deploy. */
  let hashBefore: string | undefined;

  const screen = () => {
    if (!world.screen) throw new Error("no Surah screen is open");
    return world.screen;
  };
  const openDialog = () => {
    if (!dialog) throw new Error("no Particle dialog is open");
    return dialog;
  };
  const tagged = (cards: WordCard[]) => cards.filter((card) => card.particle !== null);
  const surah1Hash = () => world.data.manifest().surahs.find((s) => s.number === 1)!.hash;

  defineSteps(({ Given, When, Then, And }) => {
    const step = (text: string, fn: (...args: never[]) => unknown) => {
      for (const define of [Given, When, Then, And]) define(text, fn as never);
    };
    const openSurah = async (_: unknown, surah: number, script: string, language: string) => {
      opened = { script: scriptCode(script), language: languageCode(language) };
      world.screen = await world.app.surah(surah, { ...opened, ayahTranslation: false });
    };
    step("I open Surah {int} in the {any} Script and {any}", openSurah);
    step("I open Surah {int} again in the {any} Script and {any}", openSurah);
    step("the Word card at {any} has a Particle tag showing its particle in {any}", (_: unknown, location: string, script: string) => {
      const particle = particleOf(location);
      expect(particle, `the Word at ${location} has a particle`).toBeDefined();
      expect(wordCardAt(screen(), location).particle).toEqual({ ...particle!, arabic: inScript(particle!, scriptCode(script)) });
    });
    step("I open the Particle tag on the Word card at {any}", async (_: unknown, location: string) => {
      const tag = wordCardAt(screen(), location).particle;
      expect(tag, `the Word card at ${location} has a Particle tag`).not.toBeNull();
      dialog = await world.app.particleDialog(tag!.id, { ...opened, word: location });
    });
    step("I open the Particle dialog of the Particle tag on the Word card at {any} without naming its Word", async (_: unknown, location: string) => {
      dialog = await world.app.particleDialog(wordCardAt(screen(), location).particle!.id, opened);
    });
    step("it marks nothing", () => expect(openDialog().marked).toBeNull());
    step("the Particle dialog for {string} is open", (_: unknown, text: string) => expect(openDialog().text).toBe(text));
    step("it shows the particle in {any} and its {int} occurrences", (_: unknown, script: string, occurrences: number) => {
      const { id, arabic } = openDialog();
      expect(arabic).toBe(inScript(particleFile(id), scriptCode(script)));
      expect(openDialog().occurrences).toBe(occurrences);
    });
    step(
      "it lists its {int} Spellings, most frequent first, each in its {any} text only, with its meaning in {any} and its Word locations in Quran order",
      (_: unknown, count: number, script: string, language: string) => {
        const { id, spellings, marked } = openDialog();
        expect(spellings).toHaveLength(count);
        expect(nonIncreasing(spellings.map((s) => s.locations.length)), "most frequent first").toBe(true);
        for (const s of spellings) expect(inQuranOrder(s.locations), `${s.text}: Quran order`).toBe(true);
        // The Word it marks is checked on its own.
        expect(openDialog()).toEqual(expectedDialog(id, scriptCode(script), languageCode(language), marked));
      },
    );
    step(
      "it marks the Spelling {string}, which holds {any}, and the Word location {any}",
      (_: unknown, text: string, holds: string, location: string) => {
        const { spellings, marked } = openDialog();
        expect(marked, "the dialog marks a Word").not.toBeNull();
        expect(spellings[marked!.spelling].text).toBe(text);
        expect(spellings[marked!.spelling].locations).toContain(holds);
        expect(marked!.location).toBe(location);
      },
    );
    step("every Word card with no Root has a Particle tag naming the particle its Surah file gives it", () => {
      const rootless = wordCardsOf(screen()).filter((card) => card.root === null);
      expect(rootless.length, "the Surah has Words with no Root").toBeGreaterThan(0);
      for (const card of rootless) {
        const particle = particleOf(card.location)!;
        expect(card.particle, card.location).toEqual({ ...particle, arabic: inScript(particle, opened.script) });
      }
    });
    step("no Word card with a Root has a Particle tag", () => {
      expect(wordCardsOf(screen()).filter((card) => card.root !== null && card.particle !== null)).toEqual([]);
    });
    step("no Word card of Surah 1 has a Particle tag", () => {
      expect(wordCardsOf(screen()).length).toBeGreaterThan(0);
      expect(tagged(wordCardsOf(screen()))).toEqual([]);
    });
    step("the device goes into airplane mode", () => {
      world.goOffline();
      world.data.received.length = 0;
    });
    step("the app is closed and launched again on the same device", async () => {
      world.launch(world.device);
      await world.app.checkForUpdates();
    });
    step("the app is closed and launched again on the same device, online", async () => {
      world.data.received.length = 0;
      world.launch(world.device);
      await world.app.checkForUpdates();
    });
    step("each Particle tag of Surah 1 opens its Particle dialog just as /data/v1 gives it", async () => {
      const tags = tagged(wordCardsOf(screen()));
      expect(tags.length, "Surah 1 has Particle tags").toBeGreaterThan(0);
      for (const card of tags) {
        await expect(world.app.particleDialog(card.particle!.id, opened), card.location).resolves.toEqual(
          expectedDialog(card.particle!.id, opened.script, opened.language),
        );
      }
    });
    step("no request reached the origin since the device went into airplane mode", () => expect(world.data.received).toEqual([]));
    step("the device keeps the particle file of each particle Surah 1's Words name, and no other particle file", () => {
      const named = new Set(datasetSurah(1).ayahs.flatMap((a) => a.words.flatMap((w) => (w.particle ? [`particles/${w.particle.id}.json`] : []))));
      expect(named.size).toBeGreaterThan(0);
      const kept = [...world.device.files.keys()].filter((name) => /^particles\/\d+\.json$/.test(name));
      expect(new Set(kept)).toEqual(named);
      for (const name of kept) expect(JSON.parse(world.device.files.get(name)!)).toEqual(particleFile(Number(/\d+/.exec(name)![0])));
    });
    step("the Particle dialog of the particle at {any} cannot be read", async (_: unknown, location: string) => {
      await expect(world.app.particleDialog(particleOf(location)!.id, opened)).rejects.toThrow();
    });
    step("/data/v1 is as it was deployed before Surah files carried particles", () => {
      world.data.particles = false;
      hashBefore = surah1Hash();
    });
    step("the deploy that adds particles to Surah files changes Surah 1's hash in /data/v1/manifest.json", () => {
      world.data.particles = true;
      expect(surah1Hash()).not.toBe(hashBefore);
    });
    step(
      "the device keeps Surah 1's file, as /data/v1 serves it, with no particle file, as the app before this release kept it",
      async () => {
        const body = await (await world.otherDeviceFetch(`${world.data.origin}/data/v1/surahs/1.json`)).text();
        await world.device.write("surahs/1.json", body);
        await world.device.write("surahs/1.json.sha256", surah1Hash());
      },
    );
    step("the app read /data/v1/manifest.json and did not download /data/v1/surahs/1.json again", () => {
      expect(world.data.received).toContain("/data/v1/manifest.json");
      expect(world.data.received).not.toContain("/data/v1/surahs/1.json");
    });
  });

  Background(({ Given }) => {
    Given("the app is launched on a new device", () => void world.launch());
  });
  ScenarioOutline("The Particle dialog for إِيَّا in <Language> with the <Script> Script", () => {});
  Scenario("A Spelling particle's dialog lists its one Spelling", () => {});
  Scenario("The Particle dialog opens on the tapped Word's Spelling, مِن at 2:22:9", () => {});
  Scenario("With no Word, the Particle dialog marks nothing", () => {});
  Scenario("Every Word card of Surah 2 with no Root has its particle's Particle tag, and no other Word card has one", () => {});
  Scenario("Surah 1, opened once, opens every Particle dialog of its Word cards in airplane mode", () => {});
  Scenario("Surah 1 opened once keeps its particle files and no other", () => {});
  Scenario("The Particle dialog of a Surah never opened says, in airplane mode, that it cannot be read", () => {});
  Scenario("A Surah kept before its file carried particles opens as before, and gets them with the deploy that adds them", () => {});
  Scenario("A Surah kept with particles by an app before this release gets its particle files at the next update check", () => {});
});
