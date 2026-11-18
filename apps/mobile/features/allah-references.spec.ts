import { describeFeature, loadFeature } from "@amiceli/vitest-cucumber";
import { expect } from "vitest";
import type { SurahOptions, SurahScreen } from "../src/quran-analysis.ts";
import {
  Device,
  World,
  allahReferenceColourSwitch,
  ayahsOf,
  datasetRecitation,
  datasetSurah,
  languageCode,
  launchApp,
  markedAsAllahReference,
  recitedAyah,
  scriptCode,
  timedLocation,
  wordCardAt,
  wordCardsOf,
} from "./support.ts";

const feature = await loadFeature("./allah-references.feature");

/** How a scenario opens a Surah: in `script` and `language`, the Ayah translation off. */
const opened = (script: string, language: string): SurahOptions => ({ script: scriptCode(script), language: languageCode(language), ayahTranslation: false });

/** The Word locations on `screen` whose cards are marked as Allah references, in the order it shows them. */
const markedOn = (screen: SurahScreen) => wordCardsOf(screen).filter((card) => markedAsAllahReference(card)).map((card) => card.location);

/** Expects the Word cards at `locations` to be marked as Allah references on `screen`, and no other. */
function marksExactly(screen: SurahScreen, locations: string[]) {
  expect(locations.length, `Surah ${screen.number} has Allah references to mark`).toBeGreaterThan(0);
  const onScreen = new Set(wordCardsOf(screen).map((card) => card.location));
  expect(locations.filter((l) => !onScreen.has(l)), "every Allah reference is a Word card on the screen").toEqual([]);
  expect(markedOn(screen)).toEqual(locations);
}

describeFeature(feature, ({ Scenario, ScenarioOutline, BeforeAllScenarios, BeforeEachScenario, AfterAllScenarios, defineSteps }) => {
  const world = new World();
  BeforeAllScenarios(() => world.start());
  BeforeEachScenario(() => {
    world.goOnline();
    world.stopRecording();
    world.data.reset();
  });
  AfterAllScenarios(() => world.close());

  /** The device the app was first launched on in this scenario. */
  let first: Device;
  /** The app as launched on a second device, when a scenario launches one. */
  let second: ReturnType<typeof launchApp> | undefined;

  const open = async (surah: number, script: string, language: string): Promise<void> => {
    world.screen = await world.app.surah(surah, opened(script, language));
  };
  const screen = () => {
    if (!world.screen) throw new Error("no Surah screen is open");
    return world.screen;
  };
  const colourSwitch = () => allahReferenceColourSwitch(world.app);
  const launchNew = () => {
    world.launch();
    first = world.device;
    second = undefined;
  };
  const goOffline = () => {
    world.goOffline();
    world.data.received.length = 0;
  };
  const launchAgainOffline = async () => {
    world.launch(world.device);
    await expect(world.app.checkForUpdates(), "the launch's manifest check, with no connection").resolves.toEqual({ updatePrompt: false });
  };
  const nothingReceived = () => {
    expect(world.data.received).toEqual([]);
  };
  const marksSurah1 = () => marksExactly(screen(), world.data.allahReferences(1).locations);

  defineSteps(({ Step }) => {
    Step("the app is launched on a new device", launchNew);
    Step("I open Surah 1 in the Uthmani Script and English", () => open(1, "Uthmani", "English"));
    Step("I open Surah 1 in the Uthmani Script and English again", () => open(1, "Uthmani", "English"));
    Step("I open Surah 1 in the Uthmani Script and English in airplane mode", () => open(1, "Uthmani", "English"));
    Step("an Admin's Allah reference revision of Surah 1 has added 1:2:1 and removed 1:1:2, moving it to version 2", () => {
      const before = world.data.allahReferences(1);
      expect(before.locations, "the owner's list names 1:1:2").toContain("1:1:2");
      expect(before.locations, "the owner's list does not name 1:2:1").not.toContain("1:2:1");
      world.data.reviseAllahReferences(1, { added: ["1:2:1"], removed: ["1:1:2"] });
      expect(world.data.allahReferences(1).version).toBe(2);
    });
    Step("the Word card at 1:2:1 is marked as an Allah reference and the Word card at 1:1:2 is not", () => {
      expect(markedAsAllahReference(wordCardAt(screen(), "1:2:1")), "1:2:1, added by the revision").toBe(true);
      expect(markedAsAllahReference(wordCardAt(screen(), "1:1:2")), "1:1:2, removed by the revision").toBe(false);
      marksExactly(screen(), world.data.allahReferences(1).locations);
    });
    Step("the Word card at 1:2:1 is still marked as an Allah reference and the Word card at 1:1:2 still is not", () => {
      expect(markedAsAllahReference(wordCardAt(screen(), "1:2:1")), "1:2:1, added by the revision").toBe(true);
      expect(markedAsAllahReference(wordCardAt(screen(), "1:1:2")), "1:1:2, removed by the revision").toBe(false);
      marksExactly(screen(), world.data.allahReferences(1).locations);
    });
    Step("/api/v1/allah-references answers 503", () => {
      world.data.allahReferencesUnread = true;
    });
    Step("/api/v1/allah-references answers again", () => {
      world.data.allahReferencesUnread = false;
    });
    Step(
      "the Word cards at the Word locations /api/v1/allah-references/1 answers are marked as Allah references, and no other Word card is",
      marksSurah1,
    );
    Step("the device goes into airplane mode", goOffline);
    Step("the app is closed and launched again on the same device", launchAgainOffline);
    Step("the app is closed and launched again on the same device, online", async () => {
      world.data.received.length = 0;
      world.launch(world.device);
      await world.app.checkForUpdates();
    });
    Step("no request reached the origin since the device went into airplane mode", nothingReceived);
    Step("the Allah reference colour switch is on", async () => {
      expect(await colourSwitch().isOn()).toBe(true);
    });
    Step("the Allah reference colour switch is off", async () => {
      expect(await colourSwitch().isOn()).toBe(false);
    });
    Step("I switch the Allah reference colour off", async () => {
      expect(await colourSwitch().set(false), "the switch is off once switched off").toBe(false);
    });
    Step("I switch the Allah reference colour on", async () => {
      expect(await colourSwitch().set(true), "the switch is on once switched on").toBe(true);
    });
    Step("I close the app and open it again on the same device", () => {
      world.launch(world.device);
    });
  });

  ScenarioOutline(
    "Opening Surah <Surah> in the <Script> Script and <Language> marks exactly the Words /api/v1/allah-references/<Surah> answers",
    ({ Given, When, Then, And }, { Surah, Script, Language }) => {
      const surah = Number(Surah);
      Given("the app is launched on a new device", launchNew);
      When("I open Surah <Surah> in the <Script> Script and <Language>", async () => {
        world.record();
        await open(surah, Script, Language);
      });
      Then("the app asked /api/v1/allah-references/<Surah> for Surah <Surah>'s Allah references", () => {
        expect(world.data.received).toContain(`/api/v1/allah-references/${surah}`);
        world.stopRecording();
      });
      And(
        "the Word cards at the Word locations /api/v1/allah-references/<Surah> answers are marked as Allah references, and no other Word card is",
        () => marksExactly(screen(), world.data.allahReferences(surah).locations),
      );
      And(
        "every Word card shows its <Script> text, its <Language> Word meaning and its Root tag as /data/v1/surahs/<Surah>.json gives them",
        () => {
          const [script, language] = [scriptCode(Script), languageCode(Language)];
          const published = datasetSurah(surah).ayahs.flatMap((ayah) => ayah.words);
          const shown = wordCardsOf(screen()).map(({ location, arabic, meaning, root }) => ({ location, arabic, meaning, root }));
          expect(shown).toEqual(published.map((w) => ({ location: w.location, arabic: w[script], meaning: w.meaning[language], root: w.root })));
        },
      );
    },
  );

  Scenario("The marks follow the endpoint's answer, not the owner's list", () => {});

  Scenario("When the endpoint cannot read the Allah references, Surah 1 still opens, unmarked, and the next opening marks them", ({ Then }) => {
    Then(
      "Surah 1 shows all its Ayahs as /data/v1/surahs/1.json gives them, and no Word card is marked as an Allah reference",
      () => {
        expect(ayahsOf(screen()).map((a) => a.number)).toEqual(datasetSurah(1).ayahs.map((a) => a.number));
        expect(markedOn(screen())).toEqual([]);
      },
    );
  });

  Scenario("The Recited Word keeps its mark when it is an Allah reference", ({ And, Then }) => {
    let allahReference: string;
    And("I press the play control with Ayah 1:1 at the top of the screen", async () => {
      await world.pressPlay(1);
    });
    And("the Recitation reaches the start of the first Allah reference the Reciter says in Ayah 1:1", () => {
      const recitation = datasetRecitation(1);
      const locations = world.data.allahReferences(1).locations;
      const timing = recitedAyah(recitation, 1).words.find((t) => locations.includes(timedLocation(recitation, 1, t)));
      if (!timing) throw new Error("the Reciter says no Allah reference in Ayah 1:1");
      allahReference = timedLocation(recitation, 1, timing);
      world.audio.reach(timing[1]);
    });
    Then("the Recited Word is that Allah reference", () => {
      expect(world.recitation!.recitedWord).toBe(allahReference);
    });
    And("its Word card is marked as an Allah reference", () => {
      expect(markedAsAllahReference(wordCardAt(screen(), allahReference))).toBe(true);
    });
  });

  ScenarioOutline(
    "Surah 1, opened once, shows its Allah references in airplane mode in the <Script> Script and <Language>",
    ({ Given, When, And, Then }, { Script, Language }) => {
      Given("the app is launched on a new device", launchNew);
      And("I open Surah 1 in the Uthmani Script and English", () => open(1, "Uthmani", "English"));
      When("the device goes into airplane mode", goOffline);
      And("the app is closed and launched again on the same device", launchAgainOffline);
      And("I open Surah 1 in the <Script> Script and <Language>", () => open(1, Script, Language));
      Then(
        "the Word cards at the Word locations /api/v1/allah-references/1 answers are marked as Allah references, and no other Word card is",
        marksSurah1,
      );
      And("no request reached the origin since the device went into airplane mode", nothingReceived);
    },
  );

  Scenario("A kept Surah keeps its Allah references while the endpoint cannot read them", ({ Then }) => {
    Then(
      "the Word cards at the Word locations /api/v1/allah-references/1 answered before are marked as Allah references, and no other Word card is",
      () => marksExactly(screen(), world.data.allahReferences(1).locations),
    );
  });

  Scenario("A new version of a kept Surah's Allah references reaches the app, which keeps it for offline reading", ({ And }) => {
    And("the app did not download /data/v1/surahs/1.json again", () => {
      expect(world.data.received, "the launch read the manifest").toContain("/data/v1/manifest.json");
      expect(world.data.received).not.toContain("/data/v1/surahs/1.json");
    });
  });

  Scenario("A new device has the Allah reference colour switch on", () => {});

  Scenario("Switched off, the switch stays off after the app is closed and opened again", () => {});

  Scenario("Switched off and on again, the switch stays on after the app is closed and opened again", () => {});

  Scenario("Each device keeps its own switch", ({ And, Then, When }) => {
    And("the app is launched on a second, new device", () => {
      second = launchApp(world.data.origin, new Device());
    });
    Then("on the second device the Allah reference colour switch is on", async () => {
      expect(await allahReferenceColourSwitch(second!).isOn()).toBe(true);
    });
    When("I close the app and open it again on the first device", () => {
      world.launch(first);
    });
  });

  ScenarioOutline('A saved switch of "<value>" reads as on', ({ Given, And, When, Then }, { value }) => {
    Given("the app is launched on a new device", launchNew);
    And("I switch the Allah reference colour off", async () => {
      expect(await colourSwitch().set(false), "the switch is off once switched off").toBe(false);
    });
    And('every value the app saved on this device was since changed to "<value>"', () => {
      expect(world.device.items.size, "the app saved the switch on the device").toBeGreaterThan(0);
      for (const key of world.device.items.keys()) world.device.items.set(key, value);
    });
    When("I close the app and open it again on the same device", () => {
      world.launch(world.device);
    });
    Then("the Allah reference colour switch is on", async () => {
      expect(await colourSwitch().isOn()).toBe(true);
    });
  });

  Scenario("Switching the Allah reference colour sends nothing anywhere", ({ And, Then }) => {
    And("every request the app makes is recorded", () => world.record());
    Then("the app made no request", () => {
      expect(world.recording!.urls).toEqual([]);
      expect(world.data.received).toEqual([]);
      world.stopRecording();
    });
  });
});
