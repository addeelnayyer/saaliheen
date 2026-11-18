import { describeFeature, loadFeature } from "@amiceli/vitest-cucumber";
import { firstSaidAt } from "@saaliheen/dataset/recitation";
import type { Recitation } from "@saaliheen/dataset/types";
import { expect } from "vitest";
import { ayahAtTop, type AyahOnScreen } from "../src/recitation.ts";
import {
  World,
  datasetRecitation,
  datasetSurah,
  languageCode,
  parity,
  recitedAyah,
  scriptCode,
  timedLocation,
  timingOf,
  wordCardAt,
} from "./support.ts";

const feature = await loadFeature("./recitation-from-any-ayah.feature");

describeFeature(feature, ({ Scenario, ScenarioOutline, BeforeAllScenarios, AfterAllScenarios }) => {
  const world = new World();
  BeforeAllScenarios(() => world.start());
  AfterAllScenarios(() => world.close());

  /** The Surah's committed Recitation file. */
  let recitation: Recitation;
  /** The Word location the scenario last expected as the Recited Word. */
  let expected: string;

  const playing = () => {
    if (!world.recitation) throw new Error("the Recitation was never started");
    return world.recitation;
  };
  const launch = () => {
    world.launch();
  };
  const openSurah = async (number: number, script: string, language: string) => {
    world.screen = await world.app.surah(number, { script: scriptCode(script), language: languageCode(language), ayahTranslation: false });
    recitation = datasetRecitation(number);
  };
  const playsFromStartOf = (ayah: number) => {
    expect(world.audio.loaded, "the Surah's audio, at the address its Recitation file gives").toBe(recitation.audio);
    expect(world.audio.playing, "the audio is playing").toBe(true);
    expect(world.audio.position, `the audio is at the start of Ayah ${recitation.surah}:${ayah}`).toBe(recitedAyah(recitation, ayah).from);
  };
  const playsOnFromStartOf = (ayah: number) => {
    playsFromStartOf(ayah);
    expect(world.audio.loads, "the app loaded the Surah's audio once").toEqual([recitation.audio]);
  };
  const reachFirstWordOf = (ayah: number) => {
    const timing = timingOf(recitation, ayah);
    expected = timedLocation(recitation, ayah, timing);
    world.audio.reach(timing[1]);
  };
  const recitedWordIs = (location: string, ayah?: number) => {
    expect(playing().recitedWord, "the Recited Word").toBe(location);
    if (ayah !== undefined) expect(playing().markedAyah, "the Ayah marked faintly").toBe(ayah);
  };
  const nothingMarked = () => {
    expect(playing().recitedWord, "the Recited Word").toBeNull();
    expect(playing().markedAyah, "the Ayah marked faintly").toBeNull();
  };
  const tapWord = (location: string) => parity(playing()).call("tapWord", location);

  Scenario("With no Recitation on, each Ayah of Al-Kawthar starts the Recitation from it", ({ Given, Then, And }) => {
    Given("the app is launched on a new device", launch);
    And("I open Surah 108 in the Uthmani Script and English", () => openSurah(108, "Uthmani", "English"));
    Then(
      "listening from each Ayah of Surah 108 in turn, with no Recitation on, plays the Surah's audio from the start of that Ayah, with the Recitation bar offering to pause",
      async () => {
        const ayahs = datasetSurah(108).ayahs.map((a) => a.number);
        expect(ayahs, "Al-Kawthar's Ayahs").toEqual(recitation.ayahs.map((a) => a.number));
        for (const ayah of ayahs) {
          world.launch(world.device);
          await world.listenFrom(ayah);
          playsFromStartOf(ayah);
          expect(playing().bar, `the Recitation bar, listening from 108:${ayah}`).toMatchObject({ offers: "pause" });
        }
      },
    );
  });

  ScenarioOutline(
    "In the <Script> Script and <Language>, listening from Ayah 2:9 starts the Recitation there, though Ayah 2:6 is at the top of the screen",
    ({ Given, When, Then, And }, { Script, Language }) => {
      Given("the app is launched on a new device", launch);
      And("I open Surah 2 in the <Script> Script and <Language>", () => openSurah(2, Script, Language));
      And("the screen is laid out with Ayah 2:6 at the top of the screen", () => {
        /** A phone's window, 874 px tall, under a Surah bar 120 px tall, each Ayah 200 px tall from 2:6 down. */
        const seen = { top: 120, bottom: 874 };
        const ayahs: AyahOnScreen[] = [5, 6, 7, 8, 9, 10].map((number, i) => ({ number, top: -80 + i * 200, bottom: 120 + i * 200 }));
        expect(ayahAtTop(ayahs, seen), "the Ayah at the top of the screen").toBe(6);
        world.layout = { ayahs, seen };
      });
      When("I listen from Ayah 2:9", async () => {
        await world.listenFrom(9);
      });
      Then(
        "the audio playing is the Surah's audio at the address its Recitation file gives, from the start of Ayah 2:9",
        () => playsFromStartOf(9),
      );
      And("the Recitation bar is on screen, offering to pause", () => {
        expect(playing().bar).toMatchObject({ offers: "pause" });
      });
      When("the Recitation reaches the start of the first Word the Reciter says in Ayah 2:9", () => reachFirstWordOf(9));
      Then("the Recited Word is that Word, and its Word card shows its <Script> text and its <Language> Word meaning", () => {
        recitedWordIs(expected, 9);
        const card = wordCardAt(world.screen!, expected);
        const word = datasetSurah(2)
          .ayahs.flatMap((a) => a.words)
          .find((w) => w.location === expected)!;
        expect(card.arabic, `${expected}'s ${Script} text`).toBe(word[scriptCode(Script)]);
        expect(card.meaning, `${expected}'s ${Language} Word meaning`).toBe(word.meaning[languageCode(Language)]);
      });
    },
  );

  Scenario("While the Recitation plays, listening from another Ayah moves it there, later or earlier", ({ Given, When, Then, And }) => {
    Given("the app is launched on a new device", launch);
    And("I open Surah 108 in the Uthmani Script and English", () => openSurah(108, "Uthmani", "English"));
    When("I press the play control with Ayah 108:1 at the top of the screen", async () => {
      await world.pressPlay(1);
    });
    And("the Recitation reaches the start of the first Word the Reciter says in Ayah 108:1", () => reachFirstWordOf(1));
    And("I listen from Ayah 108:3", async () => {
      await world.listenFrom(3);
    });
    Then("the audio is playing on from the start of Ayah 108:3, the Surah's audio loaded only once", () => playsOnFromStartOf(3));
    And("no Word card is marked until the Reciter says Ayah 108:3's first Word", nothingMarked);
    When("the Recitation reaches the start of the first Word the Reciter says in Ayah 108:3", () => reachFirstWordOf(3));
    Then("the Recited Word is that Word, and Ayah 108:3 is marked faintly", () => recitedWordIs(expected, 3));
    When("I listen from Ayah 108:2", async () => {
      await world.listenFrom(2);
    });
    Then("the audio is playing on from the start of Ayah 108:2, the Surah's audio loaded only once", () => playsOnFromStartOf(2));
    And("no Word card is marked until the Reciter says Ayah 108:2's first Word", nothingMarked);
    When("the Recitation reaches the start of the first Word the Reciter says in Ayah 108:2", () => reachFirstWordOf(2));
    Then("the Recited Word is that Word, and Ayah 108:2 is marked faintly", () => recitedWordIs(expected, 2));
  });

  ScenarioOutline(
    "While the Recitation plays in Ayah <Ayah>, tapping the Word card at <Location> carries it on from that Word",
    ({ Given, When, Then, And }, { Ayah, Location }) => {
      Given("the app is launched on a new device", launch);
      And("I open Surah 1 in the Uthmani Script and English", () => openSurah(1, "Uthmani", "English"));
      When("I press the play control with Ayah 1:1 at the top of the screen", async () => {
        await world.pressPlay(1);
      });
      And("the Recitation reaches the start of 1:<Ayah>'s timing 1", () => {
        world.audio.reach(timingOf(recitation, Number(Ayah))[1]);
        recitedWordIs(timedLocation(recitation, Number(Ayah), timingOf(recitation, Number(Ayah))), Number(Ayah));
      });
      And("I tap the Word card at <Location>", () => {
        wordCardAt(world.screen!, Location);
        return tapWord(Location);
      });
      Then("the audio is playing on from where the Reciter first says the Word at <Location>", () => {
        const at = firstSaidAt(recitation, Location);
        expect(at, `the Reciter says ${Location}`).not.toBeNull();
        expect(world.audio.playing, "the audio is playing").toBe(true);
        expect(world.audio.position, `where the Reciter first says ${Location}`).toBe(at);
        expect(world.audio.loads, "the app loaded the Surah's audio once").toEqual([recitation.audio]);
      });
      And("the Recited Word is the Word at <Location>, and its Ayah is marked faintly", () =>
        recitedWordIs(Location, Number(Location.split(":")[1])),
      );
    },
  );

  Scenario("Tapping a Word the Reciter says twice carries the Recitation on from where he first says it", ({ Given, When, Then, And }) => {
    let location: string;
    Given("the app is launched on a new device", launch);
    And("I open Surah 2 in the Uthmani Script and English", () => openSurah(2, "Uthmani", "English"));
    When("I press the play control with Ayah 2:9 at the top of the screen", async () => {
      await world.pressPlay(9);
    });
    And("the Recitation reaches the start of 2:9's timing 11", () => world.audio.reach(timingOf(recitation, 9, 11)[1]));
    And("I tap the Word card of 2:9's timing 10, which the Reciter says twice in the Ayah", () => {
      location = timedLocation(recitation, 9, timingOf(recitation, 9, 10));
      return tapWord(location);
    });
    Then("the audio is playing on from the first of that Word's two timings, not the second", () => {
      const word = timingOf(recitation, 9, 10)[0];
      const starts = recitedAyah(recitation, 9)
        .words.filter(([w]) => w === word)
        .map(([, start]) => start);
      expect(starts.length, `the Reciter says ${location} twice`).toBe(2);
      expect(world.audio.playing, "the audio is playing").toBe(true);
      expect(world.audio.position, `where the Reciter first says ${location}`).toBe(starts[0]);
    });
    And("the Recited Word is that Word, and Ayah 2:9 is marked faintly", () => recitedWordIs(location, 9));
  });

  Scenario("Tapping 21:87:9, a Word with no timing, leaves the Recitation where it was", ({ Given, When, Then, And }) => {
    let eighth: number;
    Given("the app is launched on a new device", launch);
    And("I open Surah 21 in the Indo-Pak Script and Urdu", () => openSurah(21, "Indo-Pak", "Urdu"));
    When("I press the play control with Ayah 21:87 at the top of the screen", async () => {
      await world.pressPlay(87);
    });
    And("the Recitation reaches the start of 21:87:8's timing", () => {
      const timing = recitedAyah(recitation, 87).words.find(([word]) => word === 8)!;
      eighth = timing[1];
      world.audio.reach(eighth);
    });
    And("I tap the Word card at 21:87:9", () => {
      expect(firstSaidAt(recitation, "21:87:9"), "21:87:9 has no timing").toBeNull();
      wordCardAt(world.screen!, "21:87:9");
      return tapWord("21:87:9");
    });
    Then("the audio is still playing at the start of 21:87:8's timing", () => {
      expect(world.audio.playing, "the audio is playing").toBe(true);
      expect(world.audio.position).toBe(eighth);
    });
    And("the Recited Word is still 21:87:8", () => recitedWordIs("21:87:8", 87));
  });
});
