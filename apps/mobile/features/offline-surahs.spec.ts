import { describeFeature, loadFeature } from "@amiceli/vitest-cucumber";
import { MIN_APP_VERSION } from "@saaliheen/dataset/published";
import { expect } from "vitest";
import { SurahNotDownloaded, type PassageHeading, type SurahOptions, type SurahScreen, type UpdateCheck } from "../src/quran-analysis.ts";
import { World, ayahsOf, datasetSurah, datasetSurahIndex, languageCode, scriptCode, shippedVersion } from "./support.ts";

const feature = await loadFeature("./offline-surahs.feature");

/** How a scenario opens a Surah: in `script` and `language`, the Ayah translation off unless asked for. */
const opened = (script: string, language: string, ayahTranslation = false): SurahOptions => ({
  script: scriptCode(script),
  language: languageCode(language),
  ayahTranslation,
});

/** The Surah index's rows as /data/v1/surahs.json gives them. */
const publishedIndex = () =>
  datasetSurahIndex().map(({ number, nameArabic, nameLatin, revelationPlace, ayahCount }) => ({ number, nameArabic, nameLatin, revelationPlace, ayahCount }));

/** What a rejected promise rejected with, or null when it resolved. */
const rejectionOf = (promise: Promise<unknown>) => promise.then(
  () => null,
  (error: unknown) => error,
);

/** Waits until the origin has received a request for `path`. */
async function untilReceived(world: World, path: string) {
  for (let waited = 0; waited < 5_000; waited += 10) {
    if (world.data.received.includes(path)) return;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error(`the origin never received ${path}`);
}

describeFeature(feature, ({ Scenario, ScenarioOutline, BeforeAllScenarios, BeforeEachScenario, AfterAllScenarios }) => {
  const world = new World();
  BeforeAllScenarios(() => world.start());
  BeforeEachScenario(() => {
    world.goOnline();
    world.data.reset();
  });
  AfterAllScenarios(() => world.close());

  /** The app closed and opened again on the device it ran on: a fresh launch, which checks the manifest. */
  const launchAgain = async (): Promise<UpdateCheck> => {
    world.launch(world.device);
    return world.app.checkForUpdates();
  };

  ScenarioOutline(
    "Surah 18, opened once, opens again in airplane mode in the <Script> Script and <Language>",
    ({ Given, When, Then, And }, { Script, Language }) => {
      let online: SurahScreen;
      Given("the app is launched on a new device", () => {
        world.launch();
      });
      And("I open the Surah index", async () => {
        expect(await world.app.surahIndex()).toHaveLength(114);
      });
      And("I open Surah 18 in the Uthmani Script and Urdu", async () => {
        await world.app.surah(18, opened("Uthmani", "Urdu"));
      });
      And("Surah 18 in the <Script> Script and <Language> with the Ayah translation on is noted as it shows online", async () => {
        // On another device, so the reader's own device has opened Surah 18 just once.
        const [reader, readersApp] = [world.device, world.app];
        world.launch();
        online = await world.app.surah(18, opened(Script, Language, true));
        [world.device, world.app] = [reader, readersApp];
        expect(ayahsOf(online)).toHaveLength(datasetSurah(18).ayahCount);
      });
      When("the device goes into airplane mode", () => {
        world.goOffline();
        world.data.received.length = 0;
      });
      And("the app is closed and launched again on the same device", async () => {
        const device = world.device;
        world.launch(device);
        expect(world.device).toBe(device);
        await expect(world.app.checkForUpdates(), "the launch's manifest check, with no connection").resolves.toEqual({ updatePrompt: false });
      });
      Then("the Surah index lists all 114 Surahs as /data/v1/surahs.json gives them", async () => {
        const index = await world.app.surahIndex().catch((error: unknown) => error);
        expect(index, "the Surah index in airplane mode").toEqual(publishedIndex());
      });
      And("Surah 18 opens in the <Script> Script and <Language> with the Ayah translation on just as it shows online", async () => {
        await expect(world.app.surah(18, opened(Script, Language, true)), "Surah 18 in airplane mode").resolves.toEqual(online);
      });
      And("no request reached the origin since the device went into airplane mode", () => {
        expect(world.data.received).toEqual([]);
      });
    },
  );

  Scenario("A deploy that changes Surah 18's hash refreshes Surah 18, and only Surah 18, once the app is online", ({ Given, When, Then, And }) => {
    let revisedTitle: string;
    let surah1Before: SurahScreen;
    Given("the app is launched on a new device", () => {
      world.launch();
    });
    And("I open Surah 1 and Surah 18 in the Uthmani Script and English", async () => {
      surah1Before = await world.app.surah(1, opened("Uthmani", "English"));
      await world.app.surah(18, opened("Uthmani", "English"));
    });
    And(
      "a deploy revises the English title of Surah 18's first Passage, which changes Surah 18's hash in /data/v1/manifest.json and no other Surah's",
      () => {
        const before = world.data.manifest().surahs;
        const surah = datasetSurah(18);
        revisedTitle = `${surah.passages[0].en} (revised)`;
        surah.passages[0] = { ...surah.passages[0], en: revisedTitle };
        world.data.deploySurah(surah);
        const after = world.data.manifest().surahs;
        expect(after.filter((s, k) => s.hash !== before[k].hash).map((s) => s.number)).toEqual([18]);
      },
    );
    When("the app is closed and launched again on the same device, online", async () => {
      world.data.received.length = 0;
      await launchAgain();
    });
    Then("the app read /data/v1/manifest.json and downloaded /data/v1/surahs/18.json again, and not /data/v1/surahs/1.json", () => {
      expect(world.data.received).toContain("/data/v1/manifest.json");
      expect(world.data.received).toContain("/data/v1/surahs/18.json");
      expect(world.data.received).not.toContain("/data/v1/surahs/1.json");
    });
    When("the device goes into airplane mode", () => {
      world.goOffline();
    });
    And("I open Surah 18 in the Uthmani Script and English", async () => {
      world.screen = await world.app.surah(18, opened("Uthmani", "English"));
    });
    Then("the Passage heading above Ayah 1 shows the revised English title", () => {
      const first = world.screen!.items[0] as PassageHeading;
      expect(first.kind).toBe("passage-heading");
      expect(first.title).toBe(revisedTitle);
    });
    And("Surah 1 opens in the Uthmani Script and English as it did before the deploy", async () => {
      await expect(world.app.surah(1, opened("Uthmani", "English"))).resolves.toEqual(surah1Before);
    });
  });

  Scenario("Surahs whose hash did not change are not downloaded again", ({ Given, When, Then, And }) => {
    Given("the app is launched on a new device", () => {
      world.launch();
    });
    And("I open Surah 1 and Surah 18 in the Uthmani Script and English", async () => {
      await world.app.surah(1, opened("Uthmani", "English"));
      await world.app.surah(18, opened("Uthmani", "English"));
    });
    When("the app is closed and launched again on the same device, online", async () => {
      world.data.received.length = 0;
      await launchAgain();
    });
    And("I open Surah 1 and Surah 18 again in the Uthmani Script and English", async () => {
      await world.app.surah(1, opened("Uthmani", "English"));
      await world.app.surah(18, opened("Uthmani", "English"));
    });
    Then("the app read /data/v1/manifest.json and downloaded no Surah file again", () => {
      expect(world.data.received).toContain("/data/v1/manifest.json");
      expect(world.data.received.filter((path) => path.startsWith("/data/v1/surahs/"))).toEqual([]);
    });
  });

  ScenarioOutline(
    "Opening Surah 18 in airplane mode before it was ever downloaded says why it is not there, in <Language>",
    ({ Given, When, Then, And }, { Language }) => {
      let refusal: unknown;
      Given("the app is launched on a new device", () => {
        world.launch();
      });
      And("I open the Surah index", async () => {
        await world.app.surahIndex();
      });
      And("I open Surah 1 in the Uthmani Script and English", async () => {
        await world.app.surah(1, opened("Uthmani", "English"));
      });
      When("the device goes into airplane mode", () => {
        world.goOffline();
      });
      And("I open Surah 18 in the Uthmani Script and <Language>", async () => {
        refusal = await rejectionOf(world.app.surah(18, opened("Uthmani", Language)));
      });
      Then("the Surah screen shows no Ayahs and says, in <Language>, that Surah 18 is not downloaded yet and needs a connection", () => {
        expect(refusal, "opening Surah 18 offline gives the not-downloaded message").toBeInstanceOf(SurahNotDownloaded);
        const { surah, message } = refusal as SurahNotDownloaded;
        expect(surah).toBe(18);
        expect(message, "the message names Surah 18").toMatch(/18|۱۸/);
        if (Language === "English") {
          expect(message).toMatch(/download/i);
          expect(message).toMatch(/connect|online|internet/i);
        } else {
          expect(message, "the Urdu message is in Urdu").toMatch(/[؀-ۿ]/);
          expect(message, "the Urdu message has no English in it").not.toMatch(/[A-Za-z]/);
        }
      });
    },
  );

  ScenarioOutline(
    "An app at version <App version>, with the manifest's minAppVersion at <Minimum>, <Prompt> the update prompt",
    ({ Given, When, Then }, { Minimum, Prompt, ...versions }) => {
      const appVersion = (versions as Record<string, string>)["App version"];
      let check: UpdateCheck;
      Given("/data/v1/manifest.json gives minAppVersion <Minimum>", () => {
        world.data.minAppVersion = Minimum;
        expect(world.data.manifest().minAppVersion).toBe(Minimum);
      });
      When("the app at version <App version> is launched on a new device, online", async () => {
        world.launch(undefined, true, appVersion);
        check = await world.app.checkForUpdates();
      });
      Then("the app <Prompt> the update prompt", () => {
        expect(check.updatePrompt, `app ${appVersion} with minAppVersion ${Minimum}`).toBe(Prompt === "shows");
      });
    },
  );

  Scenario("The app at the version app.json ships is supported by the dataset as it is published", ({ Given, When, Then }) => {
    let check: UpdateCheck;
    Given("/data/v1/manifest.json gives minAppVersion as the published dataset sets it", () => {
      expect(world.data.manifest().minAppVersion).toBe(MIN_APP_VERSION);
    });
    When("the app at the version app.json ships is launched on a new device, online", async () => {
      world.launch(undefined, true, shippedVersion());
      check = await world.app.checkForUpdates();
    });
    Then("the app does not show the update prompt", () => {
      expect(check.updatePrompt, `app.json's version ${shippedVersion()} with minAppVersion ${MIN_APP_VERSION}`).toBe(false);
    });
  });

  Scenario("A skeleton of Surah 18's Ayahs shows while Surah 18 downloads", ({ Given, When, Then, And }) => {
    let release: () => void;
    let opening: Promise<SurahScreen>;
    let settled = false;
    Given("the app is launched on a new device", () => {
      world.launch();
    });
    And("I open the Surah index", async () => {
      await world.app.surahIndex();
    });
    And("the origin holds back its answer to /data/v1/surahs/18.json", () => {
      release = world.data.hold("/data/v1/surahs/18.json");
    });
    When("I open Surah 18 in the Uthmani Script and English", async () => {
      opening = world.app.surah(18, opened("Uthmani", "English"));
      void opening.finally(() => (settled = true)).catch(() => undefined);
      await untilReceived(world, "/data/v1/surahs/18.json");
    });
    Then(
      "while it downloads, its screen shows Surah 18's Arabic and Latin names over a skeleton of Ayahs 1 to 110, as /data/v1/surahs.json gives them",
      async () => {
        const entry = publishedIndex().find((s) => s.number === 18)!;
        const skeleton = await world.app.surahSkeleton(18);
        expect(settled, "Surah 18 is still downloading").toBe(false);
        expect(skeleton).toEqual({
          number: 18,
          nameArabic: entry.nameArabic,
          nameLatin: entry.nameLatin,
          ayahs: Array.from({ length: entry.ayahCount }, (_, k) => k + 1),
        });
        expect(entry.ayahCount).toBe(110);
      },
    );
    When("its download finishes", () => {
      release();
    });
    Then("Surah 18 shows its Ayahs from 1 to 110 in place of the skeleton", async () => {
      const screen = await opening;
      expect(ayahsOf(screen).map((a) => a.number)).toEqual(Array.from({ length: 110 }, (_, k) => k + 1));
    });
  });
});
