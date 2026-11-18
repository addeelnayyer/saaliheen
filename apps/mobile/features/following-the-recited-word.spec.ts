import { describeFeature, loadFeature } from "@amiceli/vitest-cucumber";
import type { Recitation } from "@saaliheen/dataset/types";
import { expect } from "vitest";
import * as recitationModule from "../src/recitation.ts";
import type { CardOnScreen, SeenArea } from "../src/recitation.ts";
import { World, datasetRecitation, languageCode, parity, scriptCode, timedLocation, timingOf } from "./support.ts";

const feature = await loadFeature("./following-the-recited-word.feature");

/**
 * How far the Surah screen scrolls, in px down the Surah (negative: back up
 * it), to bring `card` clear of the Surah bar and the Recitation bar, `seen`
 * being the window between them; 0 when it is clear already. The seam #114
 * specifies as src/recitation.ts's scrollToFollow(card, seen), which the
 * screen calls with the Recited Word's card as it measures it.
 */
function scrollToFollow(card: CardOnScreen, seen: SeenArea): number {
  const follow = (recitationModule as unknown as Record<string, unknown>).scrollToFollow;
  expect(typeof follow, "src/recitation.ts offers scrollToFollow(card, seen) (#114)").toBe("function");
  return (follow as (card: CardOnScreen, seen: SeenArea) => number)(card, seen);
}

describeFeature(feature, ({ Scenario, ScenarioOutline, BeforeAllScenarios, AfterAllScenarios }) => {
  const world = new World();
  BeforeAllScenarios(() => world.start());
  AfterAllScenarios(() => world.close());

  /** The Surah's committed Recitation file. */
  let recitation: Recitation;

  const playing = () => {
    if (!world.recitation) throw new Error("the play control was never pressed");
    return world.recitation;
  };
  const launch = () => {
    world.launch();
  };
  const openSurah2 = async () => {
    world.screen = await world.app.surah(2, { script: scriptCode("Uthmani"), language: languageCode("English"), ayahTranslation: false });
    recitation = datasetRecitation(2);
  };
  const pressPlay = async () => {
    await world.pressPlay(1);
  };
  const reachFirstWordOf = (ayah: number) => world.audio.reach(timingOf(recitation, ayah)[1]);
  const firstWordOf = (ayah: number) => timedLocation(recitation, ayah, timingOf(recitation, ayah));
  const follows = (ayah: number) => {
    expect(playing().recitedWord, "the Recited Word").toBe(firstWordOf(ayah));
    expect(parity(playing()).read<string | null>("followed"), "the Word card the screen keeps on screen").toBe(firstWordOf(ayah));
  };
  const wayBack = (offered: boolean) => {
    expect(parity(playing()).read<boolean>("offersWayBack"), "the button back to the Recited Word is on screen").toBe(offered);
  };
  const followsNothing = () => {
    expect(parity(playing()).read<string | null>("followed"), "the Word card the screen keeps on screen").toBeNull();
  };

  Scenario("The screen follows the Recited Word down Al-Baqarah", ({ Given, When, Then, And }) => {
    Given("the app is launched on a new device", launch);
    And("I open Surah 2 in the Uthmani Script and English", openSurah2);
    When("I press the play control with Ayah 2:1 at the top of the screen", pressPlay);
    Then("there is no button back to the Recited Word", () => wayBack(false));
    When("the Recitation reaches the start of 2:9's timing 1", () => reachFirstWordOf(9));
    Then("the screen follows the Recited Word, the first Word the Reciter says in Ayah 2:9", () => follows(9));
    When("the Recitation reaches the start of 2:17's timing 1", () => reachFirstWordOf(17));
    Then("the screen follows the Recited Word, the first Word the Reciter says in Ayah 2:17", () => follows(17));
    And("there is still no button back to the Recited Word", () => wayBack(false));
  });

  ScenarioOutline(
    "Following the Recited Word, the screen brings its card clear of the Surah bar and the Recitation bar when <Where>",
    ({ Given, When, Then }, { Top, Bottom, Moving }) => {
      let seen: SeenArea;
      let card: CardOnScreen;
      Given("a Surah bar 120 px tall and a Recitation bar whose top is 790 px down the window", () => {
        seen = { top: 120, bottom: 790 };
      });
      When("the Recited Word's card is laid out from <Top> px to <Bottom> px down the window, so that <Where>", () => {
        card = { top: Number(Top), bottom: Number(Bottom) };
      });
      Then("the screen scrolls the card clear of the Surah bar and the Recitation bar, <Moving>", () => {
        const by = scrollToFollow(card, seen);
        if (Moving === "not scrolling at all") expect(by, "the screen does not scroll").toBe(0);
        else if (Moving === "scrolling down the Surah") expect(by, "the screen scrolls down the Surah").toBeGreaterThan(0);
        else if (Moving === "scrolling back up the Surah") expect(by, "the screen scrolls back up the Surah").toBeLessThan(0);
        else throw new Error(`not a way of scrolling: ${Moving}`);
        const after = { top: card.top - by, bottom: card.bottom - by };
        expect(after.top, "the card's top, clear of the Surah bar").toBeGreaterThanOrEqual(seen.top);
        expect(after.bottom, "the card's bottom, clear of the Recitation bar").toBeLessThanOrEqual(seen.bottom);
      });
    },
  );

  Scenario("Scrolling by hand stops the following, and the button back to the Recited Word starts it again", ({ Given, When, Then, And }) => {
    Given("the app is launched on a new device", launch);
    And("I open Surah 2 in the Uthmani Script and English", openSurah2);
    When("I press the play control with Ayah 2:1 at the top of the screen", pressPlay);
    And("the Recitation reaches the start of 2:9's timing 1", () => reachFirstWordOf(9));
    Then("the screen follows the Recited Word, the first Word the Reciter says in Ayah 2:9", () => follows(9));
    When("I scroll the screen by hand", () => parity(playing()).call("scrolledByHand"));
    Then("the audio is still playing", () => {
      expect(world.audio.playing, "the audio is playing").toBe(true);
      expect(playing().bar).toMatchObject({ offers: "pause" });
    });
    And("the screen follows no Word, staying where I scrolled it", followsNothing);
    And("a button back to the Recited Word is on screen", () => wayBack(true));
    When("the Recitation reaches the start of 2:17's timing 1", () => reachFirstWordOf(17));
    Then("the Recited Word is the first Word the Reciter says in Ayah 2:17", () => {
      expect(playing().recitedWord, "the Recited Word").toBe(firstWordOf(17));
    });
    And("the screen still follows no Word, staying where I scrolled it", followsNothing);
    And("the button back to the Recited Word is still on screen", () => wayBack(true));
    When("I press the button back to the Recited Word", () => parity(playing()).call("backToRecitedWord"));
    Then("the screen follows the Recited Word, the first Word the Reciter says in Ayah 2:17", () => follows(17));
    And("there is no button back to the Recited Word", () => wayBack(false));
    When("the Recitation reaches the start of 2:20's timing 1", () => reachFirstWordOf(20));
    Then("the screen follows the Recited Word, the first Word the Reciter says in Ayah 2:20", () => follows(20));
  });
});
