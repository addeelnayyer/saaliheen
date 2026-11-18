import { describeFeature, loadFeature } from "@amiceli/vitest-cucumber";
import { expect } from "vitest";
import type { Language, Script } from "../src/quran-analysis.ts";
import { World, wordCardAt } from "./support.ts";

const feature = await loadFeature("./data-origin.feature");

describeFeature(feature, ({ Scenario, BeforeAllScenarios, AfterAllScenarios }) => {
  const world = new World();
  BeforeAllScenarios(() => world.start());
  AfterAllScenarios(() => world.close());

  Scenario(
    "Reading the Surah index, Surahs in both Scripts and Languages and a Root dialog asks only /data/v1 and /api/v1",
    ({ Given, When, And, Then }) => {
      Given("the app is launched on a new device", () => {
        world.launch();
      });
      And("every request the app makes is recorded", () => world.record());
      When("I open the Surah index", async () => {
        await world.app.surahIndex();
      });
      And("I open Surah 18 in each Script and Language with the Ayah translation on", async () => {
        for (const script of ["uthmani", "indopak"] as Script[]) {
          for (const language of ["ur", "en"] as Language[]) {
            await world.app.surah(18, { script, language, ayahTranslation: true });
          }
        }
      });
      And("I open Surah 1 in the Uthmani Script and Urdu", async () => {
        world.screen = await world.app.surah(1, { script: "uthmani", language: "ur", ayahTranslation: false });
      });
      And("I open the Root tag on the Word card at 1:1:3", async () => {
        const tag = wordCardAt(world.screen!, "1:1:3").root!;
        world.dialog = await world.app.rootDialog(tag.id, { script: "uthmani", language: "ur" });
      });
      And("I set Arabic size to 130% and Meaning size to 115%", async () => {
        await world.app.changeSize("arabicSize", "larger");
        await world.app.changeSize("arabicSize", "larger");
        await world.app.changeSize("meaningSize", "larger");
        expect(await world.app.sizes()).toEqual({ arabicSize: 130, meaningSize: 115 });
      });
      Then("every request the app made went to its origin, under /data/v1/ or /api/v1/", () => {
        const urls = world.recording!.urls;
        expect(urls.length, "the app fetched what it showed").toBeGreaterThan(0);
        const outside = urls.filter((url) => {
          const u = new URL(url, world.data.origin);
          return u.origin !== world.data.origin || !/^\/(data|api)\/v1\//.test(u.pathname);
        });
        expect(outside).toEqual([]);
        expect(world.data.received.filter((path) => !/^\/(data|api)\/v1\//.test(path))).toEqual([]);
      });
      And(
        "its origin received the requests for /data/v1/surahs.json, /data/v1/surahs/18.json, /data/v1/surahs/1.json and /data/v1/roots/1356.json",
        () => {
          expect(world.dialog!.letters).toBe("ر ح م");
          expect(world.data.received).toEqual(
            expect.arrayContaining([
              "/data/v1/surahs.json",
              "/data/v1/surahs/18.json",
              "/data/v1/surahs/1.json",
              "/data/v1/roots/1356.json",
            ]),
          );
          world.stopRecording();
        },
      );
    },
  );
});
