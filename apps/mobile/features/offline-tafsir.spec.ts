import { describeFeature, loadFeature } from "@amiceli/vitest-cucumber";
import { expect } from "vitest";
import type { Language, SurahScreen } from "../src/quran-analysis.ts";
import { tafsirOn } from "../src/release.ts";
import { World, shippedConfig, expectAnsweredTafsir, expectEveryAyah, expectNoTafsir, languageCode, plainTafsir, tafsirAfter } from "./support.ts";

const feature = await loadFeature("./offline-tafsir.feature");

describeFeature(feature, ({ Scenario, ScenarioOutline, BeforeAllScenarios, BeforeEachScenario, AfterAllScenarios, defineSteps }) => {
  const world = new World();
  BeforeAllScenarios(() => world.start());
  BeforeEachScenario(() => {
    world.goOnline();
    world.stopRecording();
    world.data.reset();
  });
  AfterAllScenarios(() => world.close());

  const screen = (): SurahScreen => {
    if (!world.screen) throw new Error("no Surah screen is open");
    return world.screen;
  };
  /** Opens Surah `surah` in the Uthmani Script and `language` (its name), the Ayah translation off. */
  const open = async (surah: number, language: string) => {
    world.screen = await world.app.surah(surah, { script: "uthmani", language: languageCode(language), ayahTranslation: false });
  };
  /** The app closed and opened again on the device it ran on: a fresh launch, which checks the manifest. */
  const launchAgain = async () => {
    world.launch(world.device);
    await world.app.checkForUpdates();
  };
  const airplaneMode = () => {
    world.goOffline();
    world.data.received.length = 0;
  };

  /** Expects Surah `surah`'s Tafsir in `language` (its name), as the endpoint answers it now, directly after Ayah `ayah`. */
  const showsTafsir = (surah: number, ayah: number, language: string) => () =>
    expectAnsweredTafsir(tafsirAfter(screen(), ayah), world.data.tafsir(surah, languageCode(language)));
  /** The texts of the Tafsir directly after Ayah `ayah` of the open Surah `surah`, as one string. */
  const plainTexts = (surah: number, ayah: number) => {
    expect(screen().number).toBe(surah);
    return tafsirAfter(screen(), ayah).entries.map((e) => plainTafsir(e.runs)).join("\n");
  };
  const everyAyah = (surah: number) => () => expectEveryAyah(screen(), surah);
  const noTafsir = () => expectNoTafsir(screen());

  defineSteps(({ Step }) => {
    Step("the app is launched on a new device", () => void world.launch());
    Step("the device goes into airplane mode", airplaneMode);
    Step("the app is closed and launched again on the same device", launchAgain);
    Step("I open Surah 108 in the Uthmani Script and English", () => open(108, "English"));
    Step("I open Surah 108 in the Uthmani Script and Urdu", () => open(108, "Urdu"));
    Step("I open Surah 2 in the Uthmani Script and English", () => open(2, "English"));
    Step("I open Surah 2 in the Uthmani Script and English again", () => open(2, "English"));
    Step("I open Surah 108 in the Uthmani Script and English once more", () => open(108, "English"));
    Step("I switch Language to Urdu", () => open(108, "Urdu"));
    Step("I switch Language to English", () => open(108, "English"));
    for (const language of ["English", "Urdu"])
      Step(`directly after Ayah 108:3 the Surah shows Surah 108's Tafsir in ${language} as /api/v1/tafsir/108 answers it, with its credit line`, showsTafsir(108, 3, language));
    Step("it shows every Ayah of Surah 108 from its /data/v1 Surah file", everyAyah(108));
    Step("the Surah shows no Tafsir at all", noTafsir);
  });

  ScenarioOutline(
    "Surah 108, opened once in <Language>, shows its Tafsir in <Language> in airplane mode",
    ({ Given, When, Then, And }, { Language }) => {
      Given("the app is launched on a new device", () => void world.launch());
      And("I open Surah 108 in the Uthmani Script and <Language>", () => open(108, Language));
      When("the device goes into airplane mode", airplaneMode);
      And("the app is closed and launched again on the same device", launchAgain);
      And("I open Surah 108 in the Uthmani Script and <Language> again", () => open(108, Language));
      Then(
        "directly after Ayah 108:3 the Surah shows Surah 108's Tafsir in <Language> as /api/v1/tafsir/108 answers it, with its credit line",
        showsTafsir(108, 3, Language),
      );
      And("no request reached the origin since the device went into airplane mode", () => {
        expect(world.data.received).toEqual([]);
      });
    },
  );

  Scenario("Switching Language online keeps the new Language's Tafsir too", ({ When, Then }) => {
    When("I switch Language to Urdu, online", () => open(108, "Urdu"));
    Then('the app asked /api/v1/tafsir/108 for Surah 108\'s Tafsir in "en" and then in "ur"', () => {
      expect(world.data.tafsirAsked).toEqual(["/api/v1/tafsir/108?lang=en", "/api/v1/tafsir/108?lang=ur"]);
    });
  });

  Scenario("Switching, in airplane mode, to a Language whose Tafsir is not kept shows Surah 108 without Tafsir", () => {});

  ScenarioOutline(
    "A kept Tafsir file that is <Damage> still opens Surah 108, and the next online opening keeps it again",
    ({ Given, When, Then, And }, { Damage }) => {
      const kept = () => [...world.device.files.keys()].filter((name) => name.startsWith("tafsir/"));
      Given("the app is launched on a new device", () => void world.launch());
      And("I open Surah 108 in the Uthmani Script and English", () => open(108, "English"));
      And("the device's kept Tafsir file of Surah 108 in English is <Damage>", () => {
        const files = kept();
        expect(files, "the one Tafsir file the device keeps").toHaveLength(1);
        const [name] = files;
        const body = world.device.files.get(name)!;
        if (Damage === "missing") world.device.files.delete(name);
        else if (Damage === "cut short") world.device.files.set(name, body.slice(0, body.length / 2));
        else world.device.files.set(name, JSON.stringify({ ...JSON.parse(body), entries: [{ firstAyah: 1 }] }));
      });
      When("the device goes into airplane mode", airplaneMode);
      And("I open Surah 108 in the Uthmani Script and English again", () => open(108, "English"));
      Then("it shows every Ayah of Surah 108 from its /data/v1 Surah file", everyAyah(108));
      And("the Surah shows no Tafsir at all", noTafsir);
      When("the device comes out of airplane mode", () => world.goOnline());
      And("I open Surah 108 in the Uthmani Script and English, online", () => open(108, "English"));
      And("the device goes back into airplane mode", airplaneMode);
      And("I open Surah 108 in the Uthmani Script and English once more", () => open(108, "English"));
      Then("directly after Ayah 108:3 the Surah shows Surah 108's Tafsir in English as /api/v1/tafsir/108 answers it, with its credit line", showsTafsir(108, 3, "English"));
    },
  );

  Scenario("When the endpoint cannot read the Tafsir, a kept Surah 108 shows the Tafsir it kept, and keeps it", ({ And, When, Then }) => {
    And("/api/v1/tafsir answers 503", () => {
      world.data.tafsirUnread = true;
    });
    When("I open Surah 108 in the Uthmani Script and English again", () => open(108, "English"));
    Then("the Surah still shows, directly after Ayah 108:3, the English Tafsir it kept before the 503", showsTafsir(108, 3, "English"));
  });

  Scenario("A reloaded Tafsir reaches the kept Surahs at the next update check, asking only for the Tafsir kept", ({ And, When, Then }) => {
    And("I open Surah 108 in the Uthmani Script and English, then in Urdu", async () => {
      await open(108, "English");
      await open(108, "Urdu");
    });
    And("the Tafsir is reloaded with new text for Surah 2's entry 2:3–4 in English and Surah 108's entry 108:2–3 in Urdu", () => {
      const reloaded = (surah: number, language: Language, first: number) =>
        world.data.putTafsir(
          surah,
          language,
          world.data.tafsir(surah, language).entries.map((e) => (e.firstAyah === first ? { ...e, text: `Reloaded: ${e.text}` } : e)),
        );
      reloaded(2, "en", 3);
      reloaded(108, "ur", 2);
    });
    When("the app is closed and launched again on the same device, online", async () => {
      world.data.tafsirAsked.length = 0;
      await launchAgain();
    });
    Then('the update check asked /api/v1/tafsir/2 in "en" and /api/v1/tafsir/108 in "en" and in "ur", and for no other Tafsir', () => {
      expect(world.data.tafsirAsked.toSorted()).toEqual(["/api/v1/tafsir/108?lang=en", "/api/v1/tafsir/108?lang=ur", "/api/v1/tafsir/2?lang=en"]);
    });
    Then("directly after Ayah 2:5 the Surah shows the reloaded English Tafsir of Surah 2, with its credit line", () => {
      expect(plainTexts(2, 5)).toContain("Reloaded: ");
      showsTafsir(2, 5, "English")();
    });
    When("I open Surah 108 in the Uthmani Script and Urdu", () => open(108, "Urdu"));
    Then("directly after Ayah 108:3 the Surah shows the reloaded Urdu Tafsir of Surah 108, with its credit line", () => {
      expect(plainTexts(108, 3)).toContain("Reloaded: ");
      showsTafsir(108, 3, "Urdu")();
    });
  });

  Scenario("A launch with the Tafsir held back checks the manifest and never asks for the Tafsir it keeps", ({ When, Then }) => {
    When("the app is closed and launched again on the same device, online, with the Tafsir switch as app.json sets it", async () => {
      expect(tafsirOn(undefined, shippedConfig()), "the switch as app.json ships it").toBe(false);
      world.data.received.length = 0;
      world.data.tafsirAsked.length = 0;
      world.launch(world.device, true, undefined, /* the Tafsir switch */ false);
      await world.app.checkForUpdates();
    });
    Then("the app read /data/v1/manifest.json and never asked /api/v1/tafsir", () => {
      expect(world.data.received).toContain("/data/v1/manifest.json");
      expect(world.data.tafsirAsked).toEqual([]);
    });
  });
});
