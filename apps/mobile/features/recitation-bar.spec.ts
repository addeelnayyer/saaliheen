import { describeFeature, loadFeature } from "@amiceli/vitest-cucumber";
import type { Recitation } from "@saaliheen/dataset/types";
import { expect } from "vitest";
import {
  World,
  datasetRecitation,
  languageCode,
  parity,
  recitedAyah,
  scriptCode,
  timedLocation,
  timingOf,
  wordCardAt,
  wordCardsOf,
} from "./support.ts";

const feature = await loadFeature("./recitation-bar.feature");

/** "1.25×" as the Recitation speed 1.25. */
const speedOf = (shown: string) => {
  const match = /^(\d+(?:\.\d+)?)×$/.exec(shown);
  if (!match) throw new Error(`not a Recitation speed: ${shown}`);
  return Number(match[1]);
};

describeFeature(feature, ({ Scenario, ScenarioOutline, BeforeAllScenarios, AfterAllScenarios, BeforeEachScenario }) => {
  const world = new World();
  BeforeAllScenarios(() => world.start());
  AfterAllScenarios(() => world.close());
  BeforeEachScenario(() => {
    world.data.failing.clear();
  });

  /** The Surah's committed Recitation file. */
  let recitation: Recitation;
  /** The Word location the scenario last expected as the Recited Word. */
  let expected: string;

  const playing = () => {
    if (!world.recitation) throw new Error("the play control was never pressed");
    return world.recitation;
  };
  const bar = () => parity(playing()).bar;
  const press = (button: string) => parity(playing()).call(button);
  const launch = () => {
    world.launch();
  };
  const openSurah = async (number: number, script: string, language: string) => {
    world.screen = await world.app.surah(number, { script: scriptCode(script), language: languageCode(language), ayahTranslation: false });
    recitation = datasetRecitation(number);
  };
  const pressPlay = async (ayah: number) => {
    await world.pressPlay(ayah);
  };
  const playsOnFromStartOf = (ayah: number) => {
    expect(world.audio.playing, "the audio is playing").toBe(true);
    expect(world.audio.position, `the audio is at the start of Ayah ${recitation.surah}:${ayah}`).toBe(recitedAyah(recitation, ayah).from);
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
  const notPlaying = () => {
    expect(world.audio.playing, "the audio is playing").toBe(false);
  };
  const speedIs = (shown: string) => {
    const speed = speedOf(shown);
    expect(bar()?.speed, "the Recitation bar's Recitation speed").toBe(speed);
    expect(world.audio.speed, "the speed the audio plays at").toBe(speed);
  };
  const chooseSpeed = (shown: string) => parity(playing()).call("chooseSpeed", speedOf(shown));

  Scenario("Next and previous Ayah move Al-Fatihah's Recitation to the start of that Ayah", ({ Given, When, Then, And }) => {
    Given("the app is launched on a new device", launch);
    And("I open Surah 1 in the Uthmani Script and English", () => openSurah(1, "Uthmani", "English"));
    When("I press the play control with Ayah 1:1 at the top of the screen", () => pressPlay(1));
    And("I press the Recitation bar's next Ayah button", () => press("nextAyah"));
    Then("the audio is playing on from the start of Ayah 1:2", () => playsOnFromStartOf(2));
    When("the Recitation reaches the start of the first Word the Reciter says in Ayah 1:2", () => reachFirstWordOf(2));
    Then("the Recited Word is that Word, and Ayah 1:2 is marked faintly", () => recitedWordIs(expected, 2));
    When("the Recitation reaches the start of 1:4's timing 2", () => {
      world.audio.reach(timingOf(recitation, 4, 2)[1]);
      recitedWordIs(timedLocation(recitation, 4, timingOf(recitation, 4, 2)), 4);
    });
    And("I press the Recitation bar's previous Ayah button", () => press("previousAyah"));
    Then("the audio is playing on from the start of Ayah 1:3", () => playsOnFromStartOf(3));
    When("the Recitation reaches the start of the first Word the Reciter says in Ayah 1:3", () => reachFirstWordOf(3));
    Then("the Recited Word is that Word, and Ayah 1:3 is marked faintly", () => recitedWordIs(expected, 3));
    When("I press the Recitation bar's next Ayah button again", () => press("nextAyah"));
    Then("the audio is playing on from the start of Ayah 1:4", () => playsOnFromStartOf(4));
  });

  Scenario("Al-Kawthar's first Ayah has no previous Ayah, and its last no next Ayah", ({ Given, When, Then, And }) => {
    Given("the app is launched on a new device", launch);
    And("I open Surah 108 in the Uthmani Script and English", () => openSurah(108, "Uthmani", "English"));
    When("I press the play control with Ayah 108:1 at the top of the screen", () => pressPlay(1));
    Then("the Recitation bar's previous Ayah button is disabled, and its next Ayah button is not", () => {
      expect(bar()).toMatchObject({ previousAyah: "disabled", nextAyah: "enabled" });
    });
    When("the Recitation reaches the start of the first Word the Reciter says in Ayah 108:3", () => {
      expect(recitation.ayahs.at(-1)!.number, "Ayah 3 is Al-Kawthar's last").toBe(3);
      reachFirstWordOf(3);
    });
    Then("the Recitation bar's next Ayah button is disabled, and its previous Ayah button is not", () => {
      expect(bar()).toMatchObject({ previousAyah: "enabled", nextAyah: "disabled" });
    });
  });

  Scenario("Stop ends the Recitation and takes away the Recitation bar and the marks", ({ Given, When, Then, And }) => {
    Given("the app is launched on a new device", launch);
    And("I open Surah 1 in the Uthmani Script and English", () => openSurah(1, "Uthmani", "English"));
    When("I press the play control with Ayah 1:1 at the top of the screen", () => pressPlay(1));
    And("the Recitation reaches the start of the first Word the Reciter says in Ayah 1:2", () => reachFirstWordOf(2));
    Then("a Word card and its Ayah are marked", () => recitedWordIs(expected, 2));
    When("I press the Recitation bar's stop button", () => press("stop"));
    Then("the Recitation bar is not on screen, and the play control is", () => {
      expect(playing().bar, "the Recitation bar").toBeNull();
    });
    And("no Word card and no Ayah is marked", nothingMarked);
    And("the audio is not playing", notPlaying);
  });

  Scenario(
    "The Recitation speed offers a few fixed steps around normal, starting at normal on a new device",
    ({ Given, When, Then, And }) => {
      Given("the app is launched on a new device", launch);
      And("I open Surah 1 in the Uthmani Script and English", () => openSurah(1, "Uthmani", "English"));
      When("I press the play control with Ayah 1:1 at the top of the screen", () => pressPlay(1));
      Then("the Recitation bar's Recitation speed offers, in order:", (_ctx, table: { "Recitation speed": string }[]) => {
        expect(bar()?.speeds, "the Recitation speeds the bar offers, slowest first").toEqual(table.map((row) => speedOf(row["Recitation speed"])));
      });
      And("the Recitation speed is 1×, and the audio plays at 1×", () => speedIs("1×"));
      When("I choose the Recitation speed 1.25×", () => chooseSpeed("1.25×"));
      Then("the Recitation speed is 1.25×, and the audio plays at 1.25×", () => speedIs("1.25×"));
      When("I choose the Recitation speed 0.75×", () => chooseSpeed("0.75×"));
      Then("the Recitation speed is 0.75×, and the audio plays at 0.75×", () => speedIs("0.75×"));
    },
  );

  ScenarioOutline("The Recitation speed <Speed> is kept on this device, and only on it", ({ Given, When, Then, And }, { Speed }) => {
    Given("the app is launched on a new device", launch);
    And("I open Surah 1 in the Uthmani Script and English", () => openSurah(1, "Uthmani", "English"));
    When("I press the play control with Ayah 1:1 at the top of the screen", () => pressPlay(1));
    And("I choose the Recitation speed <Speed>", async () => {
      await chooseSpeed(Speed);
    });
    And("the app is closed and launched again on the same device, and I open Surah 1 in it", async () => {
      world.launch(world.device);
      await openSurah(1, "Uthmani", "English");
    });
    And("I press the play control again with Ayah 1:1 at the top of the screen", () => pressPlay(1));
    Then("the Recitation speed is <Speed>, and the audio plays at <Speed>", () => speedIs(Speed));
    When("I open Surah 2 in the Indo-Pak Script and Urdu", () => openSurah(2, "Indo-Pak", "Urdu"));
    And("I press the play control with Ayah 2:1 at the top of the screen", () => pressPlay(1));
    Then("on Surah 2 too the Recitation speed is <Speed>, and the audio plays at <Speed>", () => speedIs(Speed));
    When("the app is launched on another, new device, and I open Surah 1 in it", async () => {
      world.launch();
      await openSurah(1, "Uthmani", "English");
    });
    And("I press the play control on that device with Ayah 1:1 at the top of the screen", () => pressPlay(1));
    Then("on that device the Recitation speed is 1×, and the audio plays at 1×", () => speedIs("1×"));
  });

  Scenario(
    "While the audio waits for more of its file, the Recitation bar says it is loading and the mark holds on the last Word",
    ({ Given, When, Then, And }) => {
      Given("the app is launched on a new device", launch);
      And("I open Surah 1 in the Uthmani Script and English", () => openSurah(1, "Uthmani", "English"));
      When("I press the play control with Ayah 1:1 at the top of the screen", () => pressPlay(1));
      And("the Recitation reaches the start of 1:6's timing 2", () => world.audio.reach(timingOf(recitation, 6, 2)[1]));
      And("the audio waits for the rest of the Surah's audio to arrive", () => world.audio.waitForMore());
      Then("the Recitation bar says it is loading, still offering to pause", () => {
        expect(bar()).toMatchObject({ says: "loading", offers: "pause" });
      });
      And("the Recited Word is still 1:6's timing 2's Word, and Ayah 1:6 is marked faintly", () =>
        recitedWordIs(timedLocation(recitation, 6, timingOf(recitation, 6, 2)), 6),
      );
      When("the rest of the Surah's audio arrives", () => world.audio.arriveRest());
      Then("the Recitation bar no longer says it is loading", () => {
        expect(bar()).toMatchObject({ says: null, offers: "pause" });
      });
      When("the Recitation reaches the start of 1:6's timing 3", () => world.audio.reach(timingOf(recitation, 6, 3)[1]));
      Then("the Recited Word moves on to 1:6's timing 3's Word", () => recitedWordIs(timedLocation(recitation, 6, timingOf(recitation, 6, 3)), 6));
    },
  );

  ScenarioOutline(
    "When <Fails>, the Recitation bar says it is unavailable right now and offers to try again, and reading carries on",
    ({ Given, When, Then, And }, { Fails }) => {
      let dialogLetters: string;
      Given("the app is launched on a new device", launch);
      And("<Fails>", () => {
        if (Fails.startsWith("the Surah's audio cannot be reached")) world.audio.unreachable = true;
        else if (Fails.startsWith("the app's origin answers the Recitation file")) world.data.failing.add("/data/v1/recitations/1.json");
        else throw new Error(`not a failure: ${Fails}`);
      });
      And("I open Surah 1 in the Uthmani Script and English", () => openSurah(1, "Uthmani", "English"));
      When("I press the play control with Ayah 1:1 at the top of the screen", async () => {
        const failed = await world.pressPlay(1).then(
          () => null,
          (error: unknown) => String(error),
        );
        expect(failed, "the play control shows the Recitation bar, rather than failing").toBeNull();
        await world.settle();
      });
      Then("the Recitation bar says the Recitation is unavailable right now, and offers to try again", () => {
        expect(bar()).toMatchObject({ says: "unavailable right now", offers: "try again" });
      });
      And("the audio is not playing", notPlaying);
      And("no Word card and no Ayah is marked", nothingMarked);
      When("I open the Root tag on the Word card at 1:2:1", async () => {
        const tag = wordCardAt(world.screen!, "1:2:1").root;
        expect(tag, "the Word card at 1:2:1 has a Root tag").not.toBeNull();
        dialogLetters = tag!.letters;
        world.dialog = await world.app.rootDialog(tag!.id, { script: "uthmani", language: "en" });
      });
      Then("the Root dialog for the Root QUL gives 1:2:1 is open", () => {
        expect(world.dialog!.letters).toBe(dialogLetters);
      });
      And("Surah 1's screen still shows every one of its Word cards", async () => {
        const again = await world.app.surah(1, { script: "uthmani", language: "en", ayahTranslation: false });
        expect(wordCardsOf(world.screen!).map((c) => c.location)).toEqual(wordCardsOf(again).map((c) => c.location));
      });
      When("the Recitation can be reached again", () => {
        world.audio.unreachable = false;
        world.data.failing.clear();
      });
      And("I press the Recitation bar's try again button", async () => {
        await press("tryAgain");
        await world.settle();
      });
      Then("the Recitation bar is on screen, offering to pause, and says nothing more", () => {
        expect(bar()).toMatchObject({ offers: "pause", says: null });
      });
      And(
        "the audio playing is the Surah's audio at the address its Recitation file gives, from the start of Ayah 1:1",
        () => {
          expect(world.audio.loaded, "the Surah's audio, at the address its Recitation file gives").toBe(recitation.audio);
          expect(world.audio.playing, "the audio is playing").toBe(true);
          expect(world.audio.position, "the audio is at the start of Ayah 1:1").toBe(recitedAyah(recitation, 1).from);
        },
      );
      When("the Recitation reaches the start of the first Word the Reciter says in Ayah 1:1", () => reachFirstWordOf(1));
      Then("the Recited Word is that Word, and Ayah 1:1 is marked faintly", () => recitedWordIs(expected, 1));
    },
  );
});
