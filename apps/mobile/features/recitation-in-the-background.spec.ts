import { readFileSync } from "node:fs";
import { describeFeature, loadFeature } from "@amiceli/vitest-cucumber";
import type { Recitation, RecitedAyah, WordTiming } from "@saaliheen/dataset/types";
import { expect } from "vitest";
import * as recitationModule from "../src/recitation.ts";
import {
  BACKGROUND_LIMIT_MS,
  FakeAudio,
  World,
  datasetRecitation,
  datasetSurah,
  datasetSurahIndex,
  languageCode,
  scriptCode,
  wordCardAt,
} from "./support.ts";

const feature = await loadFeature("./recitation-in-the-background.feature");

/** Ayah `ayah` of `recitation`, as its committed file times it. */
function recitedAyah(recitation: Recitation, ayah: number): RecitedAyah {
  const found = recitation.ayahs.find((a) => a.number === ayah);
  if (!found) throw new Error(`Surah ${recitation.surah}'s Recitation has no Ayah ${ayah}`);
  return found;
}

/** The first timing of Ayah `ayah`: the first Word the Reciter says in it. */
const firstTiming = (recitation: Recitation, ayah: number): WordTiming => recitedAyah(recitation, ayah).words[0];

/** The Word location a timing of Ayah `ayah` times. */
const timedLocation = (recitation: Recitation, ayah: number, [word]: WordTiming) => `${recitation.surah}:${ayah}:${word}`;

/** app.json's expo-audio plugin entry, as the app's build ships it; undefined when app.json has none. */
function expoAudioPlugin(): string | [string, Record<string, unknown>] | undefined {
  const app = JSON.parse(readFileSync(new URL("../app.json", import.meta.url), "utf8")) as {
    expo: { plugins?: (string | [string, Record<string, unknown>])[] };
  };
  return (app.expo.plugins ?? []).find((plugin) => (Array.isArray(plugin) ? plugin[0] : plugin) === "expo-audio");
}

/**
 * A Surah screen opening, as the app tells src/recitation.ts (#113): the
 * screen calls its `surahOpened(surah)`, which stops a Recitation of any other
 * Surah, whose screen may stay open beneath it on the navigator's stack.
 */
function surahOpened(surah: number) {
  const opened = (recitationModule as unknown as Record<string, unknown>).surahOpened;
  expect(typeof opened, "src/recitation.ts's surahOpened(surah), which a Surah screen calls as it opens").toBe("function");
  (opened as (surah: number) => void)(surah);
}

describeFeature(feature, ({ Scenario, ScenarioOutline, BeforeAllScenarios, AfterAllScenarios }) => {
  const world = new World();
  BeforeAllScenarios(() => world.start());
  AfterAllScenarios(() => world.close());

  /** The Surah's committed Recitation file. */
  let recitation: Recitation;
  /** The Word location the scenario last expected as the Recited Word. */
  let expected: string;
  /** The Word timing the scenario last moved the Recitation to. */
  let reached: WordTiming;

  const playing = () => {
    if (!world.recitation) throw new Error("the play control was never pressed");
    return world.recitation;
  };
  const openSurah = async (number: number, script: string, language: string) => {
    world.screen = await world.app.surah(number, { script: scriptCode(script), language: languageCode(language), ayahTranslation: false });
    recitation = datasetRecitation(number);
  };
  const launch = () => {
    world.launch();
  };
  const pressPlay = async (ayah: number) => {
    await world.pressPlay(ayah);
  };
  const reachFirstWordOf = (ayah: number) => {
    reached = firstTiming(recitation, ayah);
    expected = timedLocation(recitation, ayah, reached);
    world.audio.reach(reached[1]);
  };
  /** "I lock the screen" or "I switch to another app": either way the app leaves the screen. */
  const leave = (leaving: string) => {
    if (leaving !== "I lock the screen" && leaving !== "I switch to another app") throw new Error(`not a way to leave the app: ${leaving}`);
    world.audio.leaveApp();
  };
  /** The Surah index's name of Surah `number`. */
  const surahName = (number: number) => datasetSurahIndex().find((s) => s.number === number)!.nameLatin;
  const lockScreenShowsAyah = (ayah: number) => {
    const shown = world.audio.lockScreen;
    expect(shown, "what the lock screen and the notification show of the app").not.toBeNull();
    expect(shown!.title, `the Surah's name, as the Surah index gives it`).toContain(surahName(recitation.surah));
    expect(shown!.title, `Ayah ${recitation.surah}:${ayah}`).toMatch(new RegExp(`(^|\\D)${recitation.surah}:${ayah}(\\D|$)`));
  };

  Scenario("The app's build lets its audio play in the background", ({ Given, Then }) => {
    let plugin: ReturnType<typeof expoAudioPlugin>;
    Given("the app's config as app.json ships it", () => {
      plugin = expoAudioPlugin();
    });
    Then(
      "app.json's plugins include expo-audio with background playback on, so iOS may play the app's audio in the background and Android in a media playback service",
      () => {
        expect(plugin, "app.json's expo-audio plugin, which writes UIBackgroundModes audio and Android's media playback service").toBeDefined();
        // expo-audio's plugin turns background playback on unless enableBackgroundPlayback is false.
        const options = Array.isArray(plugin) ? plugin[1] : {};
        expect(options.enableBackgroundPlayback, "enableBackgroundPlayback").not.toBe(false);
      },
    );
  });

  ScenarioOutline("After <Leaving>, Al-Baqarah's Recitation plays on past three minutes", ({ Given, When, Then, And }, { Leaving }) => {
    Given("the app is launched on a new device", launch);
    And("I open Surah 2 in the Uthmani Script and English", () => openSurah(2, "Uthmani", "English"));
    When("I press the play control with Ayah 2:1 at the top of the screen", () => pressPlay(1));
    And("<Leaving>", () => leave(Leaving));
    Then("the audio is still playing", () => {
      expect(world.audio.playing, "the audio is playing with the app off the screen").toBe(true);
    });
    When(
      "the Recitation reaches the start of the first Word the Reciter says in the first Ayah of Surah 2 starting more than three minutes after Ayah 2:1",
      () => {
        const start = recitedAyah(recitation, 1).from;
        const later = recitation.ayahs.find((a) => a.from - start > BACKGROUND_LIMIT_MS)!;
        reachFirstWordOf(later.number);
      },
    );
    Then("the audio is still playing, at the start of that Word", () => {
      expect(world.audio.playing, "the audio is playing past three minutes in the background").toBe(true);
      expect(world.audio.position, `the audio is at the start of ${expected}`).toBe(reached[1]);
    });
    And("the Recited Word is that Word", () => {
      expect(playing().recitedWord, "the Recited Word").toBe(expected);
    });
  });

  Scenario(
    "The lock screen and the notification show Al-Kawthar's Ayah being recited, and their play and pause control the Recitation",
    ({ Given, When, Then, And }) => {
      let pausedAt = 0;
      Given("the app is launched on a new device", launch);
      And("I open Surah 108 in the Indo-Pak Script and Urdu", () => openSurah(108, "Indo-Pak", "Urdu"));
      When("I press the play control with Ayah 108:1 at the top of the screen", () => pressPlay(1));
      And("I lock the screen", () => leave("I lock the screen"));
      Then(
        "the lock screen and the notification show Surah 108's name as the Surah index gives it, Ayah 108:1 and the Reciter's name as its Recitation file gives it",
        () => {
          lockScreenShowsAyah(1);
          expect(world.audio.lockScreen!.artist, "the Reciter's name").toBe(recitation.reciter);
        },
      );
      And("they offer play and pause", () => {
        expect(world.audio.lockScreen!.controls).toEqual(expect.arrayContaining(["play", "pause"]));
      });
      When("the Recitation reaches the start of the first Word the Reciter says in Ayah 108:2", () => reachFirstWordOf(2));
      Then("the lock screen and the notification show Ayah 108:2 in place of Ayah 108:1", () => {
        lockScreenShowsAyah(2);
        expect(world.audio.lockScreen!.title, "no longer Ayah 108:1").not.toMatch(/(^|\D)108:1(\D|$)/);
      });
      When("I press pause on the lock screen", () => {
        pausedAt = world.audio.position;
        world.audio.pressOnLockScreen("pause");
      });
      Then("the audio is paused", () => {
        expect(world.audio.playing, "the audio is playing").toBe(false);
      });
      When("I return to the app", () => world.audio.returnToApp());
      Then("the Recitation bar is on screen, offering to play", () => {
        expect(playing().bar, "the Recitation bar").not.toBeNull();
        expect(playing().bar!.offers, "what the Recitation bar's button offers").toBe("play");
      });
      When("I lock the screen again", () => leave("I lock the screen"));
      And("I press play on the lock screen", () => world.audio.pressOnLockScreen("play"));
      Then("the audio is playing on from where it was paused", () => {
        expect(world.audio.playing, "the audio is playing").toBe(true);
        expect(world.audio.position, "where it was paused").toBe(pausedAt);
        expect(world.audio.loads, "the app loaded the Surah's audio once").toEqual([recitation.audio]);
      });
      When("I return to the app again", () => world.audio.returnToApp());
      Then("the Recitation bar is on screen, offering to pause", () => {
        expect(playing().bar, "the Recitation bar").not.toBeNull();
        expect(playing().bar!.offers, "what the Recitation bar's button offers").toBe("pause");
      });
    },
  );

  ScenarioOutline(
    "Back in the app after <Leaving>, the Recited Word is where the Recitation is",
    ({ Given, When, Then, And }, { Leaving }) => {
      Given("the app is launched on a new device", launch);
      And("I open Surah 108 in the Uthmani Script and English", () => openSurah(108, "Uthmani", "English"));
      When("I press the play control with Ayah 108:1 at the top of the screen", () => pressPlay(1));
      And("the Recitation reaches the start of the first Word the Reciter says in Ayah 108:1", () => reachFirstWordOf(1));
      And("<Leaving>", () => leave(Leaving));
      And("the phone delivers the app none of the audio's updates while it is away", () => world.audio.suspendUpdates());
      And("the Recitation reaches the start of the first Word the Reciter says in Ayah 108:3", () => {
        reached = firstTiming(recitation, 3);
        expected = timedLocation(recitation, 3, reached);
        expect(world.audio.playing, "the audio is playing with the app off the screen").toBe(true);
        world.audio.reach(reached[1]);
      });
      When("I return to the app", () => world.audio.returnToApp());
      Then("the Recited Word is that Word, and its Word card shows its Uthmani text and its English Word meaning", () => {
        expect(playing().recitedWord, "the Recited Word").toBe(expected);
        const card = wordCardAt(world.screen!, expected);
        const word = datasetSurah(108)
          .ayahs.flatMap((a) => a.words)
          .find((w) => w.location === expected)!;
        expect(card.arabic, `${expected}'s Uthmani text`).toBe(word.uthmani);
        expect(card.meaning, `${expected}'s English Word meaning`).toBe(word.meaning.en);
      });
      And("Ayah 108:3 is marked faintly", () => {
        expect(playing().markedAyah, "the Ayah marked faintly").toBe(3);
      });
    },
  );

  Scenario(
    "Opening another Surah from a link stops the Recitation, though the Surah's screen stays open beneath it",
    ({ Given, When, Then, And }) => {
      /** Surah 108's screen, its audio and its Recitation, open beneath Surah 1's. */
      let beneath: { audio: FakeAudio; recitation: NonNullable<World["recitation"]>; position: number };
      Given("the app is launched on a new device", launch);
      And("I open Surah 108 in the Uthmani Script and English", () => openSurah(108, "Uthmani", "English"));
      When("I press the play control with Ayah 108:1 at the top of the screen", () => pressPlay(1));
      And("the Recitation reaches the start of the first Word the Reciter says in Ayah 108:2", () => reachFirstWordOf(2));
      And("I open Surah 1 from a link to one of its Words, with Surah 108's screen still open beneath it", async () => {
        beneath = { audio: world.audio, recitation: playing(), position: world.audio.position };
        // Each Surah screen has its own player; Surah 108's stays as it was.
        world.audio = new FakeAudio();
        world.recitation = undefined;
        await openSurah(1, "Uthmani", "English");
        surahOpened(1);
      });
      Then("Surah 108's audio is not playing", () => {
        expect(beneath.audio.playing, "Surah 108's audio is playing").toBe(false);
      });
      And("Surah 108's Recitation bar is not on screen, and no Word card and no Ayah is marked", () => {
        expect(beneath.recitation.bar, "Surah 108's Recitation bar").toBeNull();
        expect(beneath.recitation.recitedWord, "the Recited Word").toBeNull();
        expect(beneath.recitation.markedAyah, "the Ayah marked faintly").toBeNull();
      });
      And("the lock screen and the notification show nothing of the app", () => {
        expect(beneath.audio.lockScreen, "what the lock screen shows of Surah 108's Recitation").toBeNull();
      });
      When("I press the play control on Surah 1's screen with Ayah 1:1 at the top of the screen", () => pressPlay(1));
      Then("Surah 1's audio plays from the start of Ayah 1:1, and Surah 108's audio stays stopped", () => {
        expect(world.audio.loaded, "Surah 1's audio").toBe(recitation.audio);
        expect(world.audio.playing, "Surah 1's audio is playing").toBe(true);
        expect(world.audio.position, "the start of Ayah 1:1").toBe(recitedAyah(recitation, 1).from);
        expect(beneath.audio.playing, "Surah 108's audio is playing").toBe(false);
        expect(beneath.audio.loads, "Surah 108's audio loaded nothing else").toEqual([datasetRecitation(108).audio]);
      });
    },
  );
});
