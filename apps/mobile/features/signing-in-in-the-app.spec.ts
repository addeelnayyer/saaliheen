import { describeFeature, loadFeature } from "@amiceli/vitest-cucumber";
import { expect } from "vitest";
import { AccountWorld, defineAccountSteps } from "./account-world.ts";

const feature = await loadFeature("./signing-in-in-the-app.feature");

describeFeature(feature, ({ Background, Scenario, ScenarioOutline, BeforeAllScenarios, AfterAllScenarios, defineSteps }) => {
  const aw = new AccountWorld();
  BeforeAllScenarios(() => aw.start());
  AfterAllScenarios(() => aw.close());

  defineSteps(({ Step }) => defineAccountSteps(Step, aw));

  Background(({ Given }) => {
    Given("the app is launched on a new device", () => aw.newScenario());
  });

  Scenario("Signed out, Me offers signing in with Google and with Apple inside the app", () => {});

  // Predefined steps do not reach a Scenario Outline, so its steps are all defined here.
  ScenarioOutline("Signing in with <Method> signs the app in to the Account, and Me shows it", ({ When, Then, And }, { Method, email }) => {
    When('I sign in with <Method> as "<email>"', () => aw.signIn(Method, email));
    Then('Me shows me signed in as "<email>", offering "Sign out" and "Delete Account"', () => aw.showsSignedInAs(email));
    And('the API holds one Account for "<email>"', () => expect(aw.api.account(email)).toBeDefined());
  });

  ScenarioOutline(
    "Signed in with <Method>, the app stays signed in after it is closed and opened again",
    ({ When, Then, And }, { Method, email }) => {
      let bearer = "";
      When('I sign in with <Method> as "<email>"', () => aw.signIn(Method, email));
      And("I close the app and open it again on the same device", () => aw.launch(aw.device));
      Then('Me shows me signed in as "<email>", offering "Sign out" and "Delete Account"', () => aw.showsSignedInAs(email));
      And("no sign-in sheet opened since the app was opened again", () => expect(aw.sheetsOpened).toEqual([]));
      And("the app has read my Account's settings with the sign-in it kept", () => {
        const read = aw.appRequestsSinceLaunch().find((r) => r.method === "GET" && r.path === "/api/v1/settings" && aw.api.whoIs(r.authorization) === email);
        expect(read, "the app read the Account's settings, signed in, as it opened").toBeDefined();
        bearer = read!.authorization!.slice("Bearer ".length);
      });
      And("the app keeps its sign-in in the device's keychain, and nothing of it in the device's storage", () => {
        expect([...aw.device.secrets.values()].some((value) => value.includes(bearer)), "the keychain keeps the bearer token").toBe(true);
        for (const [key, value] of aw.device.items) {
          expect(value.includes(bearer) || value.includes(bearer.split(".")[0]), `the device's storage keeps none of it, under ${key}`).toBe(false);
        }
      });
    },
  );

  Scenario("Signing in with Google and then with Apple by the same email is one Account", () => {});

  ScenarioOutline("Cancelling the Sign in with <Method> sheet leaves the app signed out and sends nothing", ({ Given, When, Then, And }, { Method }) => {
    Given("every request the app makes is recorded", () => aw.world.record());
    When("I open the Sign in with <Method> sheet and cancel it", () => aw.cancelSignIn(Method));
    Then("Me offers signing in with Google and with Apple, in that order", () => aw.showsSignedOut());
    And("the app sent nothing to the API", () => {
      const api = (urls: string[]) => urls.filter((url) => new URL(url, "http://origin").pathname.startsWith("/api/"));
      expect(api(aw.world.recording!.urls)).toEqual([]);
      expect(api(aw.world.data.received)).toEqual([]);
      aw.world.stopRecording();
    });
    And("the app holds no sign-in", () => aw.holdsNoSignIn());
  });

  Scenario("A sign-in the API refuses leaves the app signed out", () => {});
  Scenario("With no connection, signing in leaves the app signed out and says it needs one", () => {});
  Scenario("Each device has its own sign-in", () => {});
  Scenario("Opened offline, the app stays signed in and keeps the Account for when the connection comes back", () => {});
});
