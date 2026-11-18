import { describeFeature, loadFeature } from "@amiceli/vitest-cucumber";
import { expect } from "vitest";
import { openReadingPlaces, type DeviceReadingPlaces, type ReadingPlace, type SurahVisit } from "../src/reading-places.ts";
import { Device, World, datasetSurah } from "./support.ts";

const feature = await loadFeature("./reading-places.feature");

/** A Gherkin table of `| Surah | Ayah |` rows as Reading places. */
const placesIn = (table: Record<string, string>[]): ReadingPlace[] =>
  table.map((row) => ({ surah: Number(row.Surah), ayah: Number(row.Ayah) }));

/** Throws unless `surah:ayah` (and the Word, when given) is in the committed dataset, so no scenario reads past a Surah's end. */
function mustExist(surah: number, ayah: number, word?: number) {
  const found = datasetSurah(surah).ayahs.find((a) => a.number === ayah);
  if (!found) throw new Error(`Surah ${surah} has no Ayah ${ayah}`);
  if (word !== undefined && !found.words.some((w) => w.location === `${surah}:${ayah}:${word}`)) {
    throw new Error(`Ayah ${surah}:${ayah} has no Word ${word}`);
  }
}

describeFeature(feature, ({ Background, Scenario, ScenarioOutline, BeforeAllScenarios, AfterAllScenarios, defineSteps }) => {
  const world = new World();
  /** The device the app was first launched on in this scenario. */
  let first: Device;
  /** The app's Reading places on the device it runs on now. */
  let places: DeviceReadingPlaces;
  /** The open Surah screen, if any. */
  let visit: SurahVisit | undefined;

  /** The app, freshly launched on `device`: no Surah screen is open. */
  const launch = (device: Device) => {
    world.launch(device);
    places = openReadingPlaces(device);
    visit = undefined;
  };
  const openSurah = async (surah: number) => {
    visit = await places.open(surah);
  };
  const offered = (expected: ReadingPlace[]) => async () => expect(await places.list()).toEqual(expected);
  /** Continuing Surah `surah`'s Reading place from the Surah index, which must offer one. */
  const continueAt = async (surah: number) => {
    const offeredNow = await places.list();
    expect(
      offeredNow.map((p) => p.surah),
      `the Surah index offers Surah ${surah}'s Reading place`,
    ).toContain(surah);
    visit = await places.open(surah);
  };

  BeforeAllScenarios(() => world.start());
  AfterAllScenarios(() => world.close());

  defineSteps(({ Step }) => {
    Step("I open Surah {int} from the Surah index", (_, surah: number) => openSurah(surah));
    Step("I open Surah {int} from the Surah index again", (_, surah: number) => openSurah(surah));
    Step(
      "I open Surahs 105, 106, 107, 108, 109, 110, 111, 112, 113 and 114 from the Surah index, in that order",
      async () => {
        for (let surah = 105; surah <= 114; surah++) await openSurah(surah);
      },
    );
    Step("I scroll until Ayah {int}:{int} is at the top of the screen", async (_, surah: number, ayah: number) => {
      mustExist(surah, ayah);
      expect(visit?.surah, `the Surah ${surah} screen is open`).toBe(surah);
      await visit!.scrolledTo(ayah);
    });
    Step("I follow the Word location {int}:{int}:{int} in a Root dialog", async (_, surah: number, ayah: number, word: number) => {
      mustExist(surah, ayah, word);
      const location = `${surah}:${ayah}:${word}`;
      // As the Surah screen does: a Word location in the open Surah scrolls to it; any other opens its Surah there.
      if (visit?.surah === surah) await visit.wentTo(location);
      else visit = await places.open(surah, { word: location });
    });
    Step("the Surah {int} screen opens with Ayah {int}:{int} at the top", (_, surah: number, inSurah: number, ayah: number) => {
      expect(inSurah, "the Ayah is in the Surah").toBe(surah);
      mustExist(surah, ayah);
      expect({ surah: visit?.surah, opensAt: visit?.opensAt }).toEqual({ surah, opensAt: ayah });
    });
    Step("the Surah {int} screen is not a look-up", (_, surah: number) => {
      expect(visit?.surah).toBe(surah);
      expect(visit?.lookingUp).toBe(false);
    });
    Step("I continue reading at Surah {int}'s Reading place from the Surah index", (_, surah: number) => continueAt(surah));
    Step("I continue reading at Surah {int}'s Reading place from the Surah index again", (_, surah: number) => continueAt(surah));
    Step("the Surah index offers these Reading places, newest first:", (_, table: Record<string, string>[]) =>
      offered(placesIn(table))(),
    );
    Step("the Surah index now offers these Reading places, newest first:", (_, table: Record<string, string>[]) =>
      offered(placesIn(table))(),
    );
    Step("the Surah index offers no Reading places", () => offered([])());
    Step("I close the app and open it again on the same device", () => launch(world.device));
    Step("the app is launched on a second, new device", () => launch(new Device()));
    Step("I close the app and open it again on the first device", () => launch(first));
    Step("every request the app makes is recorded", () => world.record());
    Step("the app made no request", () => {
      expect(world.recording!.urls).toEqual([]);
      expect(world.data.received).toEqual([]);
      world.stopRecording();
    });
  });

  Background(({ Given }) => {
    Given("the app is launched on a new device", () => {
      world.stopRecording();
      first = new Device();
      launch(first);
    });
  });

  Scenario("Reading 18:1–40 then 2:255 offers Surah 2 at Ayah 255 above Surah 18 at Ayah 40", () => {});
  Scenario(
    "Returning to Surah 18 opens it at 18:40, and reading to 18:60 moves its Reading place there and to the top, without a duplicate",
    () => {},
  );
  Scenario("Reading another Surah leaves the first Surah's Reading place where it was", () => {});
  Scenario("Reading in an eleventh Surah drops the oldest Reading place", () => {});
  Scenario("The Reading place dropped is the one read longest ago, not the one listed first", () => {});
  Scenario("A look-up in another Surah leaves the Reading places, and their order, unchanged", () => {});
  Scenario("A look-up inside the open Surah leaves its Reading place where it was", () => {});
  Scenario("Reading places are kept on the device after the app is closed and opened again", () => {});
  Scenario("Each device keeps its own Reading places", () => {});

  // Predefined steps do not reach a Scenario Outline, so its steps are all defined here.
  ScenarioOutline('Saved Reading places changed to "<value>" read as none, and reading starts a new list', ({ When, And, Then }, { value }) => {
    When("I open Surah 18 from the Surah index", () => openSurah(18));
    And("I scroll until Ayah 18:40 is at the top of the screen", () => visit!.scrolledTo(40));
    And("I close the app and open it again on the same device", () => launch(world.device));
    Then("the Surah index offers no Reading places", () => offered([])());
    When("I open Surah 2 from the Surah index", () => openSurah(2));
    Then("the Surah index offers these Reading places, newest first:", (_, table: Record<string, string>[]) => offered(placesIn(table))());
    And('every value the app saved on this device was since changed to "<value>"', () => {
      expect(world.device.items.size, "the app saved its Reading places on the device").toBeGreaterThan(0);
      for (const key of world.device.items.keys()) world.device.items.set(key, value);
    });
  });

  Scenario("Reading and continuing Reading places sends nothing anywhere", () => {});
  Scenario("Any Reading place on the Surah index can be continued, not only the newest", () => {});

  Scenario("Each of ten Reading places on the Surah index opens its Surah at its Ayah", ({ When, Then, And }) => {
    const surahs = Array.from({ length: 10 }, (_, k) => 105 + k);
    When("I read Surahs 105 to 114, each until its Ayah 3 is at the top of the screen", async () => {
      for (const surah of surahs) {
        mustExist(surah, 3);
        await openSurah(surah);
        await visit!.scrolledTo(3);
      }
    });
    Then("the Surah index offers ten Reading places, Surahs 114 down to 105, each at Ayah 3", () =>
      offered([...surahs].reverse().map((surah) => ({ surah, ayah: 3 })))(),
    );
    And("continuing each of them from the Surah index, newest first, opens its Surah with its Ayah 3 at the top", async () => {
      for (const surah of [...surahs].reverse()) {
        await continueAt(surah);
        expect({ surah: visit?.surah, opensAt: visit?.opensAt, lookingUp: visit?.lookingUp }).toEqual({ surah, opensAt: 3, lookingUp: false });
      }
    });
    And("the Surah index offers ten Reading places, Surahs 105 up to 114, each at Ayah 3", () =>
      offered(surahs.map((surah) => ({ surah, ayah: 3 })))(),
    );
  });

  Scenario("Continuing a Reading place and scrolling on moves it", () => {});
});
