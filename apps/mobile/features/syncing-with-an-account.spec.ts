import { describeFeature, loadFeature } from "@amiceli/vitest-cucumber";
import { expect } from "vitest";
import { AccountWorld, defineAccountSteps } from "./account-world.ts";

const feature = await loadFeature("./syncing-with-an-account.feature");

describeFeature(feature, ({ Background, Scenario, ScenarioOutline, BeforeAllScenarios, AfterAllScenarios, defineSteps }) => {
  const aw = new AccountWorld();
  BeforeAllScenarios(() => aw.start());
  AfterAllScenarios(() => aw.close());

  defineSteps(({ Step }) => defineAccountSteps(Step, aw));

  Background(({ Given }) => {
    Given("the app is launched on a new device", () => aw.newScenario());
  });

  Scenario("Signing in applies the Script and Language the Account chose on the website", () => {});
  Scenario("An Account that has chosen no Script or Language takes the app's on signing in", () => {});

  // Predefined steps do not reach a Scenario Outline, so its steps are all defined here.
  ScenarioOutline(
    'Choosing the <setting> "<value>" in the app, signed in, saves it to the Account the website reads',
    ({ Given, When, Then }, { setting, value, email }) => {
      const key = setting === "Script" ? "script" : setting === "Language" ? "language" : undefined;
      Given('I sign in with Google as "<email>"', () => aw.signIn("Google", email));
      When('I choose the <setting> "<value>" <where>', () => (key === "script" ? aw.chooseScript(value) : aw.chooseLanguage(value)));
      Then('the website, signed in as "<email>", reads the <setting> "<value>"', async () => {
        expect(key, `a setting: ${setting}`).toBeDefined();
        await aw.websiteAs(email);
        expect((await (await aw.theWebsite()).settings())[key!]).toBe(value);
      });
    },
  );

  Scenario("A Script and Language chosen on the website show in the app the next time it is opened", () => {});
  Scenario("Signing in merges the app's Reading places with the Account's, keeping the newer for each Surah", () => {});
  Scenario("Reading in the app, signed in, moves the Reading place the website reads", () => {});
  Scenario("Reading on the website shows in the app the next time it is opened, and the Surah opens there", () => {});
  Scenario("Arabic size and Meaning size stay on the device and are never sent", () => {});
  Scenario("Signed out, choosing a Script or Language and reading send nothing anywhere", () => {});
});
