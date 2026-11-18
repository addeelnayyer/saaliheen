import { describeFeature, loadFeature } from "@amiceli/vitest-cucumber";
import { expect } from "vitest";
import { AccountWorld, defineAccountSteps } from "./account-world.ts";

const feature = await loadFeature("./signing-out-and-deleting-the-account.feature");

describeFeature(feature, ({ Background, Scenario, ScenarioOutline, BeforeAllScenarios, AfterAllScenarios, defineSteps }) => {
  const aw = new AccountWorld();
  BeforeAllScenarios(() => aw.start());
  AfterAllScenarios(() => aw.close());

  defineSteps(({ Step }) => defineAccountSteps(Step, aw));

  Background(({ Given }) => {
    Given("the app is launched on a new device", () => aw.newScenario());
  });

  Scenario("Signing out on Me signs the app out, and the Account no longer knows its sign-in", () => {});
  Scenario("After signing out, reading and choosing send nothing, and the app stays signed out when opened again", () => {});
  Scenario("Signing out with no connection still signs the app out", () => {});

  // Predefined steps do not reach a Scenario Outline, so its steps are all defined here.
  ScenarioOutline(
    "Deleting the Account on Me, signed in with <Method>, removes it and all its data at once and signs the app out",
    ({ Given, And, When, Then }, { Method, email }) => {
      // Signed in an hour before reading, so the sign-in is less than a day old when deleting.
      Given('at "2026-10-06T08:00:00Z", I sign in with <Method> as "<email>"', () => aw.signIn(Method, email, "2026-10-06T08:00:00Z"));
      And('I choose the Language "en" on Me', () => aw.chooseLanguage("en"));
      And('at "2026-10-06T09:00:00Z", I read Surah 18 in the app until Ayah 18:40 is at the top of the screen', () =>
        aw.read(18, 40, "2026-10-06T09:00:00Z"),
      );
      And('the website is signed in as "<email>" too', async () => void (await aw.websiteAs(email)));
      When("I delete my Account on Me, confirming", () => aw.deleteAccount());
      Then('deleting the Account ends as "deleted"', () => expect(aw.deleted).toBe("deleted"));
      And("Me offers signing in with Google and with Apple, in that order", () => aw.showsSignedOut());
      And("the app holds no sign-in", () => aw.holdsNoSignIn());
      And('the API holds no Account for "<email>", and no sign-in to it on any device', () => {
        expect(aw.api.account(email)).toBeUndefined();
        expect(aw.api.sessionsOf(email)).toBe(0);
      });
      And("the website is signed out of it too", async () => {
        expect(await (await aw.theWebsite()).stillSignedIn(), "the API refuses the website's sign-in").toBe(false);
      });
      And('signing in on the website again as "<email>" makes a new Account with no Script, Language or Reading places', async () => {
        const again = await aw.api.website(email, aw.world.otherDeviceFetch);
        expect(await again.settings()).toEqual({ script: null, language: null });
        expect(await again.readingPlaces()).toEqual([]);
      });
    },
  );

  Scenario("Deleting with a sign-in more than a day old asks to sign in again with the same method, then deletes", () => {});
  Scenario("Cancelling the sign-in asked for before deleting keeps the Account and the app signed in", () => {});
  Scenario("Deleting with no connection keeps the Account and says it needs one", () => {});
  Scenario("Deleting the Account on the website signs the app out the next time it is opened, keeping the device's Reading places", () => {});
});
