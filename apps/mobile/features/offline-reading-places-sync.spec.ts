import { describeFeature, loadFeature } from "@amiceli/vitest-cucumber";
import { AccountWorld, defineAccountSteps } from "./account-world.ts";

const feature = await loadFeature("./offline-reading-places-sync.feature");

describeFeature(feature, ({ Background, Scenario, BeforeAllScenarios, AfterAllScenarios, defineSteps }) => {
  const aw = new AccountWorld();
  BeforeAllScenarios(() => aw.start());
  AfterAllScenarios(() => aw.close());

  defineSteps(({ Step }) => defineAccountSteps(Step, aw));

  Background(({ Given, And }) => {
    Given("the app is launched on a new device", () => aw.newScenario());
    And('at "2026-10-05T07:00:00Z", I sign in with Google as "flyer@saaliheen.test"', () =>
      aw.signIn("Google", "flyer@saaliheen.test", "2026-10-05T07:00:00Z"),
    );
  });

  Scenario("Reading places read offline go to the Account by when they were read, around one read on the website meanwhile", () => {});
  Scenario("A Reading place read offline before a later read of the same Surah on the website does not replace it", () => {});
  Scenario("A Reading place read offline after an earlier read of the same Surah on the website replaces it", () => {});
  Scenario("Closed offline and opened again online, the app brings what was read offline as it opens", () => {});
  Scenario("Eleven Surahs read offline keep the ten read most recently, the same in the app and on the website", () => {});
  Scenario("The Language chosen offline goes to the Account when the phone comes back online", () => {});
});
