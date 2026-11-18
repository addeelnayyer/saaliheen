import { describeFeature, loadFeature } from "@amiceli/vitest-cucumber";
import { firstSaidAt } from "@saaliheen/dataset/recitation";
import type { Recitation } from "@saaliheen/dataset/types";
import { expect } from "vitest";
import { me } from "../src/destinations.ts";
import type { SurahScreen } from "../src/quran-analysis.ts";
import { openReadingPlaces } from "../src/reading-places.ts";
import { plays } from "../src/recitation.ts";
import { NONE_REVEALED, showsMeaning, tapWordCard } from "../src/word-meanings.ts";
import { World, datasetRecitation, datasetSurahIndex, languageCode, scriptCode, timingOf, wordCardAt, wordCardsOf } from "./support.ts";

const feature = await loadFeature("./hide-word-meanings.feature");

const STORED_AS = "qwt-hide-word-meanings";

describeFeature(feature, ({ Background, Scenario, ScenarioOutline, BeforeAllScenarios, BeforeEachScenario, AfterAllScenarios, defineSteps }) => {
  const world = new World();
  BeforeAllScenarios(() => world.start());
  BeforeEachScenario(() => {
    world.goOnline();
    world.stopRecording();
  });
  AfterAllScenarios(() => world.close());

  /** Whether the open Surah screen hides Word meanings: the switch as the screen read it on opening. */
  let hidden = false;
  /** The Word meanings revealed on the open Surah screen. */
  let revealed = NONE_REVEALED;
  /** The open Surah's committed Recitation file. */
  let recitation: Recitation;
  /** The Surah screen the scenario opened first, when it compares two. */
  let before: SurahScreen | undefined;
  /** Me's entries' labels, in order, once the Me tab is open. */
  let labels: string[] = [];
  const screen = () => {
    if (!world.screen) throw new Error("no Surah screen is open");
    return world.screen;
  };
  /** Opens Surah `surah` as its screen does: reading the switch, with no meaning revealed. */
  const open = async (surah: number, script: string, language: string, ayahTranslation = false) => {
    world.screen = await world.app.surah(surah, { script: scriptCode(script), language: languageCode(language), ayahTranslation });
    hidden = await world.app.hideWordMeanings();
    revealed = NONE_REVEALED;
    recitation = datasetRecitation(surah);
  };
  const playing = () => {
    if (!world.recitation) throw new Error("the Recitation was never started");
    return world.recitation;
  };
  const tap = (location: string) => {
    wordCardAt(screen(), location);
    const on = world.recitation;
    revealed = tapWordCard(location, { hidden, revealed, plays: plays(on?.bar?.offers), tapWord: (at) => on?.tapWord(at) });
  };
  /** The Word locations whose cards show their Word meaning, in the order the screen shows them. */
  const shown = () => wordCardsOf(screen()).filter((card) => showsMeaning(hidden, revealed, card.location)).map((card) => card.location);
  const showsOnly = (...locations: string[]) => expect(shown()).toEqual(locations);
  const noneShown = () => {
    expect(wordCardsOf(screen()).length).toBeGreaterThan(0);
    showsOnly();
  };
  const launchNew = () => void world.launch();
  const launchAgain = () => void world.launch(world.device);
  const switchTo = async (on: boolean) => {
    expect(await world.app.setHideWordMeanings(on)).toBe(on);
  };
  const switchIs = async (on: boolean) => {
    expect(await world.app.hideWordMeanings()).toBe(on);
  };
  const changeEverySavedValue = (value: string) => {
    expect(world.device.items.size, "the app saved the switch on the device").toBeGreaterThan(0);
    for (const key of world.device.items.keys()) world.device.items.set(key, value);
  };
  const atTiming1 = (ayah: number) => timingOf(recitation, ayah)[1];

  defineSteps(({ Step }) => {
    Step("I close the app and open it again on the same device", launchAgain);
    Step("the app is launched again on the same device", launchAgain);
    Step("I switch Hide Word meanings on", () => switchTo(true));
    Step("I switch Hide Word meanings off", () => switchTo(false));
    Step("the Hide Word meanings switch is on", () => switchIs(true));
    Step("the Hide Word meanings switch is off", () => switchIs(false));
    Step('the device keeps "on" under "qwt-hide-word-meanings"', async () => {
      expect(await world.device.getItem(STORED_AS)).toBe("on");
    });
    Step("every request the app makes is recorded", () => world.record());
    Step("the app made no request", () => {
      expect(world.recording!.urls).toEqual([]);
      expect(world.data.received).toEqual([]);
      world.stopRecording();
    });
    Step("the device goes offline", () => world.goOffline());

    Step("I open Surah {int} in the {any} Script and {any} with the Ayah translation on again", async (_, surah: number, script: string, language: string) => {
      before = world.screen;
      await open(surah, script, language, true);
    });
    Step("I open Surah {int} in the {any} Script and {any} with the Ayah translation on", (_, surah: number, script: string, language: string) =>
      open(surah, script, language, true),
    );
    Step("I leave the Surah and open Surah {int} in the {any} Script and {any} again", (_, surah: number, script: string, language: string) =>
      open(surah, script, language),
    );
    Step("I open Surah {int} in the {any} Script and {any}", (_, surah: number, script: string, language: string) => open(surah, script, language));

    Step("every Word card of Surah {int} shows its Word meaning", () => {
      expect(wordCardsOf(screen()).length).toBeGreaterThan(0);
      showsOnly(...wordCardsOf(screen()).map((card) => card.location));
    });
    Step("no Word card of Surah {int} shows its Word meaning", noneShown);
    Step("I tap the Word card at {any} again", (_, location: string) => tap(location));
    Step("I tap the Word card at {any}", (_, location: string) => tap(location));
    Step("the Word card at {any} shows its Word meaning, and no other Word card does", (_, location: string) => showsOnly(location));
    Step("the Word cards at {any} and {any} show their Word meanings, and no other Word card does", (_, a: string, b: string) => showsOnly(a, b));

    Step("I press the play control with Ayah {int}:{int} at the top of the screen", async (_, _surah: number, ayah: number) => {
      await world.pressPlay(ayah);
    });
    Step("the Recitation reaches the start of {int}:{int}'s timing 1", (_, _surah: number, ayah: number) => world.audio.reach(atTiming1(ayah)));
    Step("I pause the Recitation", () => playing().pause());
    Step("the audio is still paused at the start of {int}:{int}'s timing 1", (_, _surah: number, ayah: number) => {
      expect(world.audio.playing, "the audio is paused").toBe(false);
      expect(world.audio.position).toBe(atTiming1(ayah));
    });
    Step("the audio is playing on from where the Reciter first says the Word at {any}", (_, location: string) => {
      const at = firstSaidAt(recitation, location);
      expect(at, `the Reciter says ${location}`).not.toBeNull();
      expect(world.audio.playing, "the audio is playing").toBe(true);
      expect(world.audio.position).toBe(at);
    });
    Step("the Recited Word is the Word at {any}", (_, location: string) => expect(playing().recitedWord).toBe(location));

    Step("the two screens show the same Word cards, Root tags, Ayah translations and Tafsir", () => {
      const after = screen();
      expect(wordCardsOf(after).some((card) => card.root !== null), "the Surah has Root tags").toBe(true);
      expect(after.items.some((item) => item.kind === "ayah" && item.translation !== null), "the Surah shows its Ayah translations").toBe(true);
      expect(after.items.some((item) => item.kind === "tafsir"), "the Surah shows its Tafsir").toBe(true);
      expect(after).toEqual(before);
    });

    Step("I open the Me tab", async () => {
      const surahName = (n: number) => datasetSurahIndex().find((s) => s.number === n)!.nameLatin;
      const screen = await me({ origin: world.data.origin, device: world.device, readingPlaces: openReadingPlaces(world.device), surahName });
      labels = screen.entries.map((e) => e.label);
    });
    Step('Me offers "Allah reference colour" right after "Ayah translation"', () => {
      expect(labels.indexOf("Allah reference colour"), "Allah reference colour comes right after Ayah translation").toBe(labels.indexOf("Ayah translation") + 1);
    });
    Step('Me offers "Hide Word meanings" right after "Known words colour", before "Arabic size"', () => {
      expect(labels).toContain("Hide Word meanings");
      expect(labels.indexOf("Hide Word meanings")).toBe(labels.indexOf("Known words colour") + 1);
      expect(labels.indexOf("Arabic size")).toBe(labels.indexOf("Hide Word meanings") + 1);
    });
  });

  Background(({ Given }) => {
    Given("the app is launched on a new device", launchNew);
  });
  Scenario("A new device has Hide Word meanings off, and every Word card shows its meaning", () => {});
  Scenario("Switched on, the switch stays on after the app is closed and opened again, and off once switched off", () => {});
  ScenarioOutline('A saved switch of "<value>" reads as off', ({ Given, And, When, Then }, { value }) => {
    Given("I switch Hide Word meanings on", () => switchTo(true));
    And('every value the app saved on this device was since changed to "<value>"', () => changeEverySavedValue(value));
    When("I close the app and open it again on the same device", launchAgain);
    Then("the Hide Word meanings switch is off", () => switchIs(false));
  });
  Scenario("Switching Hide Word meanings sends nothing anywhere", () => {});
  Scenario("Me offers Hide Word meanings right after Known words colour, among the settings", () => {});
  ScenarioOutline("With Hide Word meanings on, no Word card of Surah <Surah> in <Script> shows its meaning", ({ Given, When, Then }, { Surah, Script, Language }) => {
    Given("I switch Hide Word meanings on", () => switchTo(true));
    When("I open Surah <Surah> in the <Script> Script and <Language>", () => open(Number(Surah), Script, Language));
    Then("no Word card of Surah <Surah> shows its Word meaning", noneShown);
  });
  Scenario("With no Recitation on, a tap shows one Word card's meaning and a second tap hides it", () => {});
  Scenario("Leaving the Surah hides every meaning again", () => {});
  Scenario("With the Recitation paused, a tap shows the Word card's meaning and leaves the Recitation where it was", () => {});
  Scenario("While the Recitation plays, a tap carries it on from that Word and reveals nothing", () => {});
  Scenario("With Hide Word meanings off, a tap with no Recitation on changes nothing", () => {});
  Scenario("Root tags, Ayah translations and the Tafsir are the same with Hide Word meanings on as off", () => {});
  Scenario("In a downloaded Surah with no connection, the meanings are hidden and a tap shows one", () => {});
});
