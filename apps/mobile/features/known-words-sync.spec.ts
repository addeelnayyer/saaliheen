import { describeFeature, loadFeature } from "@amiceli/vitest-cucumber";
import { knownRootLetters, type KnownWordEntry } from "@saaliheen/known-words";
import { expect } from "vitest";
import { KNOWN_WORDS, openKnownWords, rootKey } from "../src/known-words.ts";
import { AccountWorld, at, defineAccountSteps } from "./account-world.ts";

const feature = await loadFeature("./known-words-sync.feature");

/** A Gherkin table of `| Root | known | marked at |` rows as Known words entries. */
const entriesIn = (table: Record<string, string>[]): KnownWordEntry[] =>
  table.map((row) => ({ kind: "root", text: row.Root, known: row.known === "yes", markedAt: at(row["marked at"]) }));

/** A Gherkin table of `| Root |` rows as Root letters, in Arabic letter order as given. */
const rootsIn = (table: Record<string, string>[]) => table.map((row) => row.Root);

describeFeature(feature, ({ Background, Scenario, ScenarioOutline, BeforeAllScenarios, AfterAllScenarios, defineSteps }) => {
  const aw = new AccountWorld();
  BeforeAllScenarios(() => aw.start());
  AfterAllScenarios(() => aw.close());

  /** The app's Known words, through the Account's storage, as the Root dialog and the Known words page keep them. */
  const knownWords = () => openKnownWords(aw.account.storage);
  /** Marks (`known`) or unmarks the Root `letters` in the app at `time`. */
  const markInApp = async (time: string, letters: string, known: boolean) => {
    aw.setTime(time);
    await knownWords().mark(rootKey(letters), known);
    await aw.account.settled();
  };
  /** Marks or unmarks the Root `letters` on the website, signed in as `email`, at `time`. */
  const markOnWebsite = async (email: string, time: string, letters: string, known: boolean) =>
    (await aw.websiteAs(email)).markKnownWords([{ kind: "root", text: letters, known, markedAt: at(time) }]);
  /** The website, signed in as the step before named, reads exactly `entries`. */
  const websiteReads = async (entries: KnownWordEntry[]) => expect(await (await aw.theWebsite()).knownWords()).toEqual(entries);
  /** The Known Roots the app shows, once it has finished syncing. */
  const appKnownRoots = async () => {
    await aw.account.settled();
    return [...knownRootLetters(await knownWords().entries())].sort();
  };

  defineSteps(({ Step }) => {
    defineAccountSteps(Step, aw);
    Step("at {string}, I mark the Root {string} as known in the app", (_, time: string, letters: string) => markInApp(time, letters, true));
    Step("at {string}, I unmark the Root {string} in the app", (_, time: string, letters: string) => markInApp(time, letters, false));
    Step(
      "on the website, signed in as {string}, at {string}, I mark the Root {string} as known",
      (_, email: string, time: string, letters: string) => markOnWebsite(email, time, letters, true),
    );
    Step(
      "on the website, signed in as {string}, at {string}, I unmark the Root {string}",
      (_, email: string, time: string, letters: string) => markOnWebsite(email, time, letters, false),
    );
    Step("the website, signed in as {string}, reads these Known words:", async (_, email: string, table: Record<string, string>[]) => {
      await aw.websiteAs(email);
      await websiteReads(entriesIn(table));
    });
    Step("the website reads these Known words:", (_, table: Record<string, string>[]) => websiteReads(entriesIn(table)));
    Step("the app shows these Known Roots:", async (_, table: Record<string, string>[]) => {
      expect(await appKnownRoots()).toEqual(rootsIn(table).sort());
    });
    Step(
      'the phone comes back online, and at {string} I mark the Root {string} as known in the app just as the sync keeps the Account\'s Known words on the phone',
      async (_, time: string, letters: string) => {
        // The sync's own write of the Known words is held until the mark has been made.
        const device = aw.first;
        const keep = device.setItem.bind(device);
        let reached!: () => void;
        const syncWrites = new Promise<void>((resolve) => (reached = resolve));
        let release!: () => void;
        const released = new Promise<void>((resolve) => (release = resolve));
        device.setItem = async (key, value) => {
          if (key !== KNOWN_WORDS) return keep(key, value);
          device.setItem = keep;
          reached();
          await released;
          return keep(key, value);
        };
        aw.world.goOnline();
        await syncWrites;
        aw.setTime(time);
        // The sync's write goes on once the mark has been handed to the app's storage.
        let handOver!: () => void;
        const handedOver = new Promise<void>((resolve) => (handOver = resolve));
        const marking = openKnownWords({
          getItem: (key) => aw.account.storage.getItem(key),
          setItem: (key, value) => {
            const kept = aw.account.storage.setItem(key, value);
            handOver();
            return kept;
          },
        });
        const marked = marking.mark(rootKey(letters), true);
        await handedOver;
        release();
        await marked;
        await aw.account.settled();
      },
    );
    Step("the app shows no Known Roots", async () => expect(await appKnownRoots()).toEqual([]));
    Step("the website now reads these Known words:", (_, table: Record<string, string>[]) => websiteReads(entriesIn(table)));
    Step("signing in on the website again as {string} makes a new Account with no Known words", async (_, email: string) => {
      expect(aw.api.account(email), `the API holds no Account for ${email}`).toBeUndefined();
      expect(await (await aw.api.website(email, aw.world.otherDeviceFetch)).knownWords()).toEqual([]);
    });
  });

  Background(({ Given }) => {
    Given("the app is launched on a new device", () => aw.newScenario());
  });

  Scenario("A Root marked in the app, signed in, shows as known on the website", () => {});
  Scenario("A Root marked on the website shows as known in the app the next time it is opened", () => {});
  Scenario("Signing in merges the phone's Known words with the Account's, keeping the newer for each Root", () => {});
  Scenario("Marks and unmarks made offline go to the Account when the phone comes back online, each winning or losing by when it was made", () => {});

  // Predefined steps do not reach a Scenario Outline, so its steps are all defined here.
  ScenarioOutline(
    "A mark and an unmark made at the same moment, one offline in the app and one on the website, leave the Root unmarked",
    ({ Given, And, When, Then }, variables) => {
      const { email } = variables;
      const inApp = variables["in the app"] === "mark as known";
      const onWebsite = variables["on the website"] === "mark as known";
      Given('at "2026-10-05T07:00:00Z", I sign in with Google as "<email>"', () => aw.signIn("Google", email, "2026-10-05T07:00:00Z"));
      And("the phone has no connection", () => aw.goOffline());
      When('at "2026-10-05T09:00:00Z", I <in the app> the Root "ر ح م" in the app', () => markInApp("2026-10-05T09:00:00Z", "ر ح م", inApp));
      And('on the website, signed in as "<email>", at "2026-10-05T09:00:00Z", I <on the website> the Root "ر ح م"', () =>
        markOnWebsite(email, "2026-10-05T09:00:00Z", "ر ح م", onWebsite),
      );
      And('at "2026-10-05T12:00:00Z", the phone comes back online', () => aw.goOnline("2026-10-05T12:00:00Z"));
      Then("the website reads these Known words:", async () => {
        await websiteReads([{ kind: "root", text: "ر ح م", known: false, markedAt: at("2026-10-05T09:00:00Z") }]);
      });
      And("the app shows no Known Roots", async () => expect(await appKnownRoots()).toEqual([]));
    },
  );

  Scenario("A Root marked in the app just as a sync keeps the Account's Known words on the phone is kept, and reaches the Account", () => {});
  Scenario("Closed offline and opened again online, the app brings the marks made offline as it opens", () => {});
  Scenario("Signing out leaves the phone's Known words, and marking after it sends nothing", () => {});
  Scenario("Deleting the Account leaves the phone's Known words on the phone, and takes the Account's with it", () => {});
});
