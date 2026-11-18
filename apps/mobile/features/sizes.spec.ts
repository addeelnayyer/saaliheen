import { describeFeature, loadFeature } from "@amiceli/vitest-cucumber";
import { expect } from "vitest";
import type { QuranAnalysis, SizeSetting, Sizes } from "../src/quran-analysis.ts";
import { Device, World, launchApp, sizeSetting } from "./support.ts";

const feature = await loadFeature("./sizes.feature");

/** Press `setting`'s button in `direction` until the size stops at `target`. */
async function setSize(app: QuranAnalysis, setting: SizeSetting, target: number) {
  for (let presses = 0; (await app.sizes())[setting] !== target; presses++) {
    if (presses > 10) throw new Error(`${setting} never reached ${target}%`);
    await app.changeSize(setting, (await app.sizes())[setting] < target ? "larger" : "smaller");
  }
}

const shows = async (app: QuranAnalysis, sizes: Sizes) => expect(await app.sizes()).toEqual(sizes);

describeFeature(feature, ({ Background, Scenario, ScenarioOutline, BeforeAllScenarios, AfterAllScenarios }) => {
  const world = new World();
  BeforeAllScenarios(() => world.start());
  AfterAllScenarios(() => world.close());

  Background(({ Given }) => {
    Given("the app is launched on a new device", () => {
      world.stopRecording();
      world.launch();
    });
  });

  Scenario("A new device starts at 100% for both sizes", ({ Then }) => {
    Then("Arabic size shows 100% and Meaning size shows 100%", () => shows(world.app, { arabicSize: 100, meaningSize: 100 }));
  });

  ScenarioOutline(
    "<Size> steps from 85% to 150% and stops at both ends, leaving <Other> alone",
    ({ When, Then, And }, { Size, Other }) => {
      const setting = sizeSetting(Size);
      let went: number[] = [];
      const pressUntilDisabled = async (direction: "larger" | "smaller") => {
        went = [];
        for (let presses = 0; await world.app.canChangeSize(setting, direction); presses++) {
          if (presses > 10) throw new Error(`${Size}'s ${direction} button never disabled`);
          went.push((await world.app.changeSize(setting, direction))[setting]);
        }
      };
      const buttons = async () => ({
        larger: await world.app.canChangeSize(setting, "larger"),
        smaller: await world.app.canChangeSize(setting, "smaller"),
      });

      When("I press <Size>'s Larger button until it is disabled", () => pressUntilDisabled("larger"));
      Then("<Size> went through 115%, 130% and 150%, and shows 150%", async () => {
        expect(went).toEqual([115, 130, 150]);
        expect((await world.app.sizes())[setting]).toBe(150);
      });
      And("<Size>'s Larger button is disabled and its Smaller button is not", async () => {
        expect(await buttons()).toEqual({ larger: false, smaller: true });
      });
      When("I press <Size>'s Smaller button until it is disabled", () => pressUntilDisabled("smaller"));
      Then("<Size> went through 130%, 115%, 100% and 85%, and shows 85%", async () => {
        expect(went).toEqual([130, 115, 100, 85]);
        expect((await world.app.sizes())[setting]).toBe(85);
      });
      And("<Size>'s Smaller button is disabled and its Larger button is not", async () => {
        expect(await buttons()).toEqual({ larger: true, smaller: false });
      });
      And("<Other> shows 100%", async () => {
        expect((await world.app.sizes())[sizeSetting(Other)]).toBe(100);
      });
    },
  );

  Scenario("Reset sizes sets both sizes back to 100%", ({ When, And, Then }) => {
    When("I set Arabic size to 150% and Meaning size to 85%", async () => {
      await setSize(world.app, "arabicSize", 150);
      await setSize(world.app, "meaningSize", 85);
      await shows(world.app, { arabicSize: 150, meaningSize: 85 });
    });
    And("I reset the sizes", async () => {
      await world.app.resetSizes();
    });
    Then("Arabic size shows 100% and Meaning size shows 100%", () => shows(world.app, { arabicSize: 100, meaningSize: 100 }));
  });

  Scenario("Sizes are kept on the device after the app is closed and opened again", ({ When, And, Then }) => {
    When("I set Arabic size to 130% and Meaning size to 115%", async () => {
      await setSize(world.app, "arabicSize", 130);
      await setSize(world.app, "meaningSize", 115);
    });
    And("I close the app and open it again on the same device", () => {
      world.launch(world.device);
    });
    Then("Arabic size shows 130% and Meaning size shows 115%", () => shows(world.app, { arabicSize: 130, meaningSize: 115 }));
  });

  Scenario("Each device keeps its own sizes", ({ When, And, Then }) => {
    let first: Device;
    let second: QuranAnalysis;
    When("I set Arabic size to 150% and Meaning size to 85%", async () => {
      first = world.device;
      await setSize(world.app, "arabicSize", 150);
      await setSize(world.app, "meaningSize", 85);
    });
    And("the app is launched on a second, new device", () => {
      second = launchApp(world.data.origin, new Device());
    });
    Then("on the second device Arabic size shows 100% and Meaning size shows 100%", () =>
      shows(second, { arabicSize: 100, meaningSize: 100 }),
    );
    When("on the second device I set Meaning size to 130%", () => setSize(second, "meaningSize", 130));
    And("I close the app and open it again on the first device", () => {
      world.launch(first);
    });
    Then("Arabic size shows 150% and Meaning size shows 85%", () => shows(world.app, { arabicSize: 150, meaningSize: 85 }));
  });

  ScenarioOutline('A saved size of "<value>" reads as 100%', ({ Given, And, When, Then }, { value }) => {
    Given("I set Arabic size to 130% and Meaning size to 115%", async () => {
      await setSize(world.app, "arabicSize", 130);
      await setSize(world.app, "meaningSize", 115);
    });
    And('every value the app saved on this device was since changed to "<value>"', () => {
      expect(world.device.items.size, "the app saved its sizes on the device").toBeGreaterThan(0);
      for (const key of world.device.items.keys()) world.device.items.set(key, value);
    });
    When("I close the app and open it again on the same device", () => {
      world.launch(world.device);
    });
    Then("Arabic size shows 100% and Meaning size shows 100%", () => shows(world.app, { arabicSize: 100, meaningSize: 100 }));
  });

  Scenario("Choosing sizes sends nothing anywhere", ({ Given, When, And, Then }) => {
    Given("every request the app makes is recorded", () => world.record());
    When("I set Arabic size to 130% and Meaning size to 115%", async () => {
      await setSize(world.app, "arabicSize", 130);
      await setSize(world.app, "meaningSize", 115);
    });
    And("I reset the sizes", async () => {
      await world.app.resetSizes();
    });
    Then("the app made no request", async () => {
      expect(await world.app.sizes(), "the sizes were reset").toEqual({ arabicSize: 100, meaningSize: 100 });
      expect(world.recording!.urls).toEqual([]);
      expect(world.data.received).toEqual([]);
      world.stopRecording();
    });
  });
});
