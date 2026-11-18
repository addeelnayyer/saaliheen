// The app with an Account (#75), as the Account scenarios drive it: launched
// on a device of ./support.ts's World, its Account opened with the device's
// keychain, its connection and a Sign in with Google or Apple sheet that does
// what the scenario has the reader do there (sign in as an email, or cancel);
// its Me, Reading places and Script and Language read through the storage the
// Account keeps; the website, signed in to the same Account, as a second
// device on the same API (./accounts-api.ts). The clock is the scenario's:
// "at <time>" sets it, and it stands still between steps.
//
// What Me shows of the Account is read loosely, so the scenarios compile
// before src/destinations.ts has it and fail on these assertions instead:
// signed out, its "Sign in" entry offers each method, `methods: [{ method,
// label }]`, inside the app, opening no website page; signed in, an "Account"
// entry says who, `signedInAs`, and offers `actions: ["Sign out", "Delete Account"]`.

import type { defineSteps } from "@amiceli/vitest-cucumber";
import { expect, vi } from "vitest";
import {
  openAccount,
  type AppAccount,
  type DeleteOutcome,
  type IdToken,
  type SignInMethod,
  type SignInOutcome,
} from "../src/account.ts";
import { me, type MeScreen } from "../src/destinations.ts";
import { storedLanguage } from "../src/language.ts";
import { openQuranAnalysis, type QuranAnalysis, type SizeSetting } from "../src/quran-analysis.ts";
import { openReadingPlaces, type DeviceReadingPlaces, type ReadingPlace } from "../src/reading-places.ts";
import { configuredOrigin } from "../src/release.ts";
import type { Website } from "./accounts-api.ts";
import { Device, World, datasetSurah, datasetSurahIndex, shippedVersion } from "./support.ts";

/** Each scenario's clock starts here, before any time it names. */
const SCENARIO_STARTS = "2026-10-01T06:00:00Z";

/** "Google" or "Apple" as a sign-in method. */
export const signInMethod = (name: string): SignInMethod => {
  if (name === "Google") return "google";
  if (name === "Apple") return "apple";
  throw new Error(`not a sign-in method: ${name}`);
};

/** A Gherkin table of `| Surah | Ayah |` rows as Reading places. */
export const placesIn = (table: Record<string, string>[]): ReadingPlace[] =>
  table.map((row) => ({ surah: Number(row.Surah), ayah: Number(row.Ayah) }));

/** A Gherkin table of `| Surah | Ayah | read at |` rows as Reading places read at those times. */
export const timedPlacesIn = (table: Record<string, string>[]) =>
  table.map((row) => ({ surah: Number(row.Surah), ayah: Number(row.Ayah), readAt: at(row["read at"]) }));

/** An ISO time ("2026-10-05T09:00:00Z") in milliseconds. */
export const at = (time: string): number => {
  const ms = Date.parse(time);
  if (Number.isNaN(ms)) throw new Error(`not a time: ${time}`);
  return ms;
};

/** Throws unless Ayah `surah`:`ayah` is in the committed dataset, so no scenario reads past a Surah's end. */
function mustExist(surah: number, ayah: number) {
  if (!datasetSurah(surah).ayahs.some((a) => a.number === ayah)) throw new Error(`Surah ${surah} has no Ayah ${ayah}`);
}

const surahName = (n: number) => datasetSurahIndex().find((s) => s.number === n)!.nameLatin;

/** What the reader does on the next sign-in sheet the app opens: sign in there (an id token) or cancel it (null). */
type AtTheSheet = (method: SignInMethod) => IdToken | null;

export class AccountWorld {
  readonly world = new World();
  /** The device the app was first launched on in this scenario. */
  first!: Device;
  /** The app's Account on the device it runs on now. */
  account!: AppAccount;
  /** The app's Reading places, through the Account's storage. */
  places!: DeviceReadingPlaces;
  /** The sign-in sheets the app opened since it was last launched, by method. */
  sheetsOpened: SignInMethod[] = [];
  /** What the reader does at each sheet still to open, in order; a sheet nobody planned for is cancelled. */
  private readonly atTheSheets: AtTheSheet[] = [];
  /** How the last sign-in and the last deletion ended. */
  signedIn?: SignInOutcome;
  deleted?: DeleteOutcome;
  /** How many sheets had opened when the last deletion began. */
  private sheetsBeforeDeleting = 0;
  /** What the app kept in the keychain just before it signed out. */
  heldBeforeSigningOut: string[] = [];
  /** How many API requests had come in when the app was last launched. */
  private requestsAtLaunch = 0;
  /** The website, signed in to an Account, by email; and the one a step last used. */
  private readonly websites = new Map<string, Website>();
  private website?: Website;

  get api() {
    return this.world.data.accounts;
  }
  get device() {
    return this.world.device;
  }

  start() {
    return this.world.start();
  }
  async close() {
    vi.useRealTimers();
    await this.world.close();
  }

  /** A new scenario: the clock at its start, the phone online, no Account anywhere, the app launched on a new device. */
  async newScenario() {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(at(SCENARIO_STARTS));
    this.world.stopRecording();
    this.world.goOnline();
    this.api.reset();
    this.world.data.quranChat.reset();
    this.websites.clear();
    this.website = undefined;
    this.atTheSheets.length = 0;
    this.signedIn = this.deleted = this.email = undefined;
    this.first = new Device();
    await this.launch(this.first);
  }

  /** The clock reads `time`. */
  setTime(time: string) {
    vi.setSystemTime(at(time));
  }

  /** Closes the app: nothing of it runs, and it no longer hears the connection. */
  closeApp() {
    this.world.forgetListeners();
  }

  /** The app, freshly launched on `device`, done with whatever it does as it opens. */
  async launch(device: Device) {
    this.closeApp();
    this.world.launch(device);
    this.sheetsOpened = [];
    this.requestsAtLaunch = this.api.requests.length;
    this.account = openAccount({
      origin: this.world.data.origin,
      device,
      keychain: device.keychain,
      connection: this.world.connection,
      sheet: async (method) => {
        this.sheetsOpened.push(method);
        const reader = this.atTheSheets.shift();
        return reader ? reader(method) : null;
      },
    });
    this.places = openReadingPlaces(this.account.storage);
    await this.account.settled();
  }

  /** Me as the app shows it now. */
  async me(): Promise<MeScreen> {
    // Me is also given the Account, which src/destinations.ts may read or not.
    const options = { origin: this.world.data.origin, device: this.account.storage, readingPlaces: this.places, surahName, account: this.account };
    return me(options);
  }

  /** Me's entry of `kind`, read loosely, or undefined. */
  async meEntry(kind: string): Promise<Record<string, unknown> | undefined> {
    return (await this.me()).entries.find((e) => e.kind === kind) as Record<string, unknown> | undefined;
  }

  /** Me shows the reader signed out: Sign in, offering Google then Apple inside the app. */
  async showsSignedOut() {
    const signIn = await this.meEntry("sign-in");
    expect(signIn?.label, "Me has a Sign in entry").toBe("Sign in");
    expect(signIn?.methods, "Me's Sign in offers each method").toEqual([
      { method: "google", label: "Sign in with Google" },
      { method: "apple", label: "Sign in with Apple" },
    ]);
    expect(await this.meEntry("account"), "Me shows no Account").toBeUndefined();
  }

  /** Me shows the reader signed in as `email`, offering to sign out and to delete the Account. */
  async showsSignedInAs(email: string) {
    expect(await this.meEntry("account"), "Me shows the Account signed in to").toMatchObject({
      label: "Account",
      signedInAs: email,
      actions: ["Sign out", "Delete Account"],
    });
    expect(await this.meEntry("sign-in"), "Me offers no Sign in while signed in").toBeUndefined();
    expect(await this.account.signedInAs()).toEqual({ email });
  }

  /** Me's Sign in offers `method`. */
  private async offersSigningInWith(method: SignInMethod) {
    const methods = (await this.meEntry("sign-in"))?.methods as { method?: string }[] | undefined;
    expect(
      (methods ?? []).map((m) => m.method),
      `Me's Sign in offers signing in with ${method}`,
    ).toContain(method);
  }

  /** Me's Account entry offers `action`. */
  private async offers(action: string) {
    const actions = (await this.meEntry("account"))?.actions as string[] | undefined;
    expect(actions ?? [], `Me offers "${action}"`).toContain(action);
  }

  /** On Me, the reader picks Sign in with `method` and does `atTheSheet` there. */
  private async signInThrough(method: SignInMethod, atTheSheet: AtTheSheet) {
    await this.offersSigningInWith(method);
    this.atTheSheets.push(atTheSheet);
    this.signedIn = await this.account.signIn(method);
    await this.account.settled();
  }

  /** The email the reader last signed in to the app as. */
  email?: string;

  /** Signs in on Me with `methodName` ("Google" or "Apple") as `email`, at `time` when given. */
  async signIn(methodName: string, email: string, time?: string) {
    if (time) this.setTime(time);
    this.email = email;
    await this.signInThrough(signInMethod(methodName), (method) => this.api.issueIdToken(method, email));
  }

  /** Opens the Sign in with `methodName` sheet from Me and cancels it. */
  cancelSignIn(methodName: string) {
    return this.signInThrough(signInMethod(methodName), () => null);
  }

  /** The Sign in with `methodName` sheet gives an id token its provider never issued. */
  signInRefused(methodName: string) {
    return this.signInThrough(signInMethod(methodName), () => ({ token: "an-id-token-no-provider-issued", nonce: "a-nonce" }));
  }

  /** Signs out on Me. */
  async signOut() {
    await this.offers("Sign out");
    this.heldBeforeSigningOut = [...this.device.secrets.values()];
    await this.account.signOut();
    await this.account.settled();
  }

  /** Deletes the Account on Me, confirming it; at any sheet it opens, the reader does `atTheSheet` (cancels it, unless given). */
  async deleteAccount(atTheSheet?: AtTheSheet) {
    await this.offers("Delete Account");
    if (atTheSheet) this.atTheSheets.push(atTheSheet);
    this.sheetsBeforeDeleting = this.sheetsOpened.length;
    this.deleted = await this.account.deleteAccount();
    await this.account.settled();
  }

  /** The sheets that opened while the Account was being deleted. */
  sheetsOpenedWhileDeleting() {
    return this.sheetsOpened.slice(this.sheetsBeforeDeleting);
  }

  /** The app holds no sign-in: it is signed in to no Account, and keeps nothing in the keychain. */
  async holdsNoSignIn() {
    expect(await this.account.signedInAs(), "the app is signed in to no Account").toBeNull();
    expect([...this.device.secrets.keys()], "the app keeps nothing in the keychain").toEqual([]);
  }

  /** The app holds a sign-in to `email`'s Account, kept in the keychain. */
  async holdsSignInTo(email: string) {
    expect(await this.account.signedInAs()).toEqual({ email });
    const kept = [...this.device.secrets.values()];
    expect(
      kept.some((value) => this.api.whoIs(`Bearer ${value}`) === email || value.includes(this.bearerOf(email) ?? "\u0000")),
      `the keychain keeps a sign-in to ${email}'s Account`,
    ).toBe(true);
  }

  /** The bearer token the app last sent for `email`'s Account, or undefined. */
  private bearerOf(email: string): string | undefined {
    return this.api.requests
      .filter((r) => r.from === "the app" && this.api.whoIs(r.authorization) === email)
      .map((r) => r.authorization!.slice("Bearer ".length))
      .at(-1);
  }

  /** The API requests the app made since it was last launched. */
  appRequestsSinceLaunch() {
    return this.api.requests.slice(this.requestsAtLaunch).filter((r) => r.from === "the app");
  }

  /** Every API request the app made in this scenario. */
  appRequests() {
    return this.api.requests.filter((r) => r.from === "the app");
  }

  /** The website, signed in as `email` (signing it in the first time); the website a later step means. */
  async websiteAs(email: string): Promise<Website> {
    let website = this.websites.get(email);
    if (!website) {
      website = await this.api.website(email, this.world.otherDeviceFetch);
      this.websites.set(email, website);
    }
    this.website = website;
    return website;
  }

  /** The website a step last used, once the app has finished what it was doing. */
  async theWebsite(): Promise<Website> {
    await this.account.settled();
    if (!this.website && this.email) await this.websiteAs(this.email);
    expect(this.website, "a website is signed in").toBeDefined();
    return this.website!;
  }

  /** Reads Surah `surah` in the app, at `time` when given, until Ayah `ayah` is at the top of the screen. */
  async read(surah: number, ayah: number, time?: string) {
    if (time) this.setTime(time);
    mustExist(surah, ayah);
    await (await this.places.open(surah)).scrolledTo(ayah);
    await this.account.settled();
  }

  /** The Surah index offers `expected`, newest first. */
  async indexOffers(expected: ReadingPlace[]) {
    expect(await this.places.list()).toEqual(expected);
  }

  /** Chooses the Script `script` in the app's settings sheet, which keeps it in the app's storage under the website's key. */
  async chooseScript(script: string) {
    await this.account.storage.setItem("qwt-script", script);
    await this.account.settled();
  }

  /** Chooses the Language `language` on Me. */
  async chooseLanguage(language: string) {
    const entry = (await this.me()).entries.find((e) => e.kind === "language");
    if (entry?.kind !== "language") throw new Error("Me has no Language entry");
    await entry.choose(language as "ur" | "en");
    await this.account.settled();
  }

  /** The Script and Language the app shows. */
  async shows() {
    const script = (await this.account.storage.getItem("qwt-script")) === "indopak" ? "indopak" : "uthmani";
    return { script, language: await storedLanguage(this.account.storage) };
  }

  /** The app, as the settings sheet keeps its sizes, reading and keeping them through the Account's storage. */
  sizesApp(): QuranAnalysis {
    return openQuranAnalysis({
      origin: configuredOrigin(this.world.data.origin),
      device: this.account.storage,
      files: this.device,
      passageHeadings: true,
      appVersion: shippedVersion(),
    });
  }

  /** Presses `setting`'s buttons until it shows `target` percent. */
  async setSize(setting: SizeSetting, target: number) {
    const app = this.sizesApp();
    for (let presses = 0; (await app.sizes())[setting] !== target; presses++) {
      if (presses > 10) throw new Error(`${setting} never reached ${target}%`);
      await app.changeSize(setting, (await app.sizes())[setting] < target ? "larger" : "smaller");
    }
    await this.account.settled();
  }

  /** The phone loses its connection. */
  goOffline() {
    this.world.goOffline();
  }

  /** The phone's connection comes back, at `time` when given; the app, open, finishes what that starts. */
  async goOnline(time?: string) {
    if (time) this.setTime(time);
    this.world.goOnline();
    await this.account.settled();
  }
}

/** A step definer, as describeFeature's defineSteps hands it over. */
type DefineStep = Parameters<Parameters<typeof defineSteps>[0]>[0]["Step"];

/** Ten Reading places, Surah 1 then Surahs 114 down to 106, each at Ayah 3: the ten newest of Surahs 105 to 114 then Surah 1 read an hour apart from `from`. */
const tenNewest = (from: number) =>
  [1, 114, 113, 112, 111, 110, 109, 108, 107, 106].map((surah) => ({
    surah,
    ayah: 3,
    readAt: from + (surah === 1 ? 10 : surah - 105) * 60 * 60 * 1000,
  }));
/** When the eleven Surahs began to be read, in the scenario that reads them. */
let elevenFrom = 0;

/** The steps every Account feature shares, with `aw`'s app, phone and website. */
export function defineAccountSteps(Step: DefineStep, aw: AccountWorld) {
  // Signing in and Me.
  Step("Me offers signing in with Google and with Apple, in that order", () => aw.showsSignedOut());
  Step("Me's Sign in does not open the website's Sign-in page", async () => {
    const signIn = await aw.meEntry("sign-in");
    expect(signIn, "Me has a Sign in entry").toBeDefined();
    expect(signIn?.opens, "Me's Sign in opens no website page").toBeUndefined();
  });
  Step("I sign in with {word} as {string}", (_, method: string, email: string) => aw.signIn(method, email));
  Step("at {string}, I sign in with {word} as {string}", (_, time: string, method: string, email: string) => aw.signIn(method, email, time));
  Step('Me shows me signed in as {string}, offering "Sign out" and "Delete Account"', (_, email: string) => aw.showsSignedInAs(email));
  Step("I open the Sign in with {word} sheet and cancel it", (_, method: string) => aw.cancelSignIn(method));
  Step("the Sign in with {word} sheet gives an id token the API refuses", (_, method: string) => aw.signInRefused(method));
  Step("the sign-in ends as {string}", (_, outcome: string) => expect(aw.signedIn).toBe(outcome));
  Step("the app holds no sign-in", () => aw.holdsNoSignIn());
  Step("the app holds a sign-in", () => aw.holdsSignInTo(aw.email!));
  Step("the API holds one Account for {string}", (_, email: string) => {
    expect(aw.api.account(email), `the API holds an Account for ${email}`).toBeDefined();
  });
  Step("the API holds no Account for {string}", (_, email: string) => {
    expect(aw.api.account(email), `the API holds no Account for ${email}`).toBeUndefined();
  });
  Step("no sign-in sheet opened since the app was opened again", () => expect(aw.sheetsOpened).toEqual([]));
  Step("the app has read my Account's settings with the sign-in it kept", () => {
    const read = aw.appRequestsSinceLaunch().filter((r) => r.method === "GET" && r.path === "/api/v1/settings");
    expect(
      read.map((r) => aw.api.whoIs(r.authorization)),
      "the app read the Account's settings, signed in, as it opened",
    ).toContain(aw.email);
  });
  Step("the app keeps its sign-in in the device's keychain, and nothing of it in the device's storage", () => {
    const sent = aw
      .appRequestsSinceLaunch()
      .filter((r) => aw.api.whoIs(r.authorization) === aw.email)
      .map((r) => r.authorization!.slice("Bearer ".length));
    expect(sent.length, "the app sent its sign-in since it opened").toBeGreaterThan(0);
    const [bearer] = sent;
    const kept = [...aw.device.secrets.values()];
    expect(kept.some((value) => value.includes(bearer)), "the keychain keeps the bearer token").toBe(true);
    for (const [key, value] of aw.device.items) {
      expect(value.includes(bearer) || value.includes(bearer.split(".")[0]), `the device's storage keeps none of it, under ${key}`).toBe(false);
    }
  });

  // Devices, launches and the connection.
  Step("I close the app and open it again on the same device", () => aw.launch(aw.device));
  Step("the app is launched on a second, new device", () => aw.launch(new Device()));
  Step("I close the app and open it again on the first device", () => aw.launch(aw.first));
  Step("I close the app", () => aw.closeApp());
  Step("I open the app again on the same device", () => aw.launch(aw.device));
  Step("the phone has no connection", () => aw.goOffline());
  Step("the phone comes back online", () => aw.goOnline());
  Step("at {string}, the phone comes back online", (_, time: string) => aw.goOnline(time));
  Step("the phone comes back online while the app is closed", () => aw.world.goOnline());
  Step("every request the app makes is recorded", () => aw.world.record());
  Step("the app sent nothing to the API", () => {
    const api = (urls: string[]) => urls.filter((url) => new URL(url, "http://origin").pathname.startsWith("/api/"));
    expect(api(aw.world.recording!.urls), "the app fetched nothing of the API").toEqual([]);
    expect(api(aw.world.data.received), "the API got nothing").toEqual([]);
    aw.world.stopRecording();
  });
  Step("it is {string}", (_, time: string) => aw.setTime(time));

  // Script, Language and sizes.
  Step("I choose the Script {string} in the app", (_, script: string) => aw.chooseScript(script));
  Step("I choose the Language {string} on Me", (_, language: string) => aw.chooseLanguage(language));
  Step("the app shows the Script {string} and the Language {string}", async (_, script: string, language: string) => {
    await aw.account.settled();
    expect(await aw.shows()).toEqual({ script, language });
  });
  Step("Me shows the Language {string} chosen", async (_, language: string) => {
    expect((await aw.meEntry("language"))?.chosen).toBe(language);
  });
  Step("I set Arabic size to {int}% and Meaning size to {int}% in the app", async (_, arabic: number, meaning: number) => {
    await aw.setSize("arabicSize", arabic);
    await aw.setSize("meaningSize", meaning);
  });
  Step("nothing the app sent named an Arabic size or a Meaning size", () => {
    const sent = aw.appRequests();
    expect(sent.length, "the app sent its Account something").toBeGreaterThan(0);
    for (const request of sent) {
      expect(`${request.path} ${JSON.stringify(request.body ?? null)}`, `${request.method} ${request.path}`).not.toMatch(/size/i);
    }
  });

  // The website.
  Step(
    "on the website, signed in as {string}, I choose the Script {string} and the Language {string}",
    async (_, email: string, script: string, language: string) => (await aw.websiteAs(email)).saveSettings({ script, language }),
  );
  Step("on the website, signed in as {string}, I read these Reading places:", async (_, email: string, table: Record<string, string>[]) => {
    const website = await aw.websiteAs(email);
    for (const { readAt, ...place } of timedPlacesIn(table)) await website.read(place, readAt);
  });
  Step("on the website, signed in as {string}, I delete the Account", async (_, email: string) => (await aw.websiteAs(email)).deleteAccount());
  Step("the website is signed in as {string} too", async (_, email: string) => void (await aw.websiteAs(email)));
  Step(
    "the website, signed in as {string}, reads the Script {string} and the Language {string}",
    async (_, email: string, script: string, language: string) => {
      await aw.websiteAs(email);
      expect(await (await aw.theWebsite()).settings()).toEqual({ script, language });
    },
  );
  Step("the website, signed in as {string}, reads the Language {string}", async (_, email: string, language: string) => {
    await aw.websiteAs(email);
    expect((await (await aw.theWebsite()).settings()).language).toBe(language);
  });
  Step("the website, signed in as {string}, reads settings holding exactly a Script and a Language", async (_, email: string) => {
    await aw.websiteAs(email);
    expect(Object.keys(await (await aw.theWebsite()).settings()).sort()).toEqual(["language", "script"]);
  });
  Step("the website reads these Reading places, newest first:", async (_, table: Record<string, string>[]) => {
    expect(await (await aw.theWebsite()).readingPlaces()).toEqual(timedPlacesIn(table));
  });
  Step("the website now reads these Reading places, newest first:", async (_, table: Record<string, string>[]) => {
    expect(await (await aw.theWebsite()).readingPlaces()).toEqual(timedPlacesIn(table));
  });
  Step(
    "the website, signed in as {string}, reads these Reading places, newest first:",
    async (_, email: string, table: Record<string, string>[]) => {
      await aw.websiteAs(email);
      expect(await (await aw.theWebsite()).readingPlaces()).toEqual(timedPlacesIn(table));
    },
  );
  Step("the website reads ten Reading places, Surah 1 then Surahs 114 down to 106, each at Ayah 3 when it was read", async () => {
    expect(await (await aw.theWebsite()).readingPlaces()).toEqual(tenNewest(elevenFrom));
  });

  // Reading.
  Step(
    "at {string}, I read Surah {int} in the app until Ayah {int}:{int} is at the top of the screen",
    (_, time: string, surah: number, inSurah: number, ayah: number) => {
      expect(inSurah, "the Ayah is in the Surah").toBe(surah);
      return aw.read(surah, ayah, time);
    },
  );
  Step(
    "I read Surahs 105 to 114 and then Surah 1 in the app, an hour apart from {string}, each until its Ayah 3 is at the top of the screen",
    async (_, from: string) => {
      elevenFrom = at(from);
      const surahs = [105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 1];
      for (const [k, surah] of surahs.entries()) {
        vi.setSystemTime(elevenFrom + k * 60 * 60 * 1000);
        await aw.read(surah, 3);
      }
    },
  );
  Step("the Surah index offers these Reading places, newest first:", async (_, table: Record<string, string>[]) => {
    await aw.account.settled();
    await aw.indexOffers(placesIn(table));
  });
  Step("the Surah index offers ten Reading places, Surah 1 then Surahs 114 down to 106, each at Ayah 3", async () => {
    await aw.account.settled();
    await aw.indexOffers(tenNewest(0).map(({ surah, ayah }) => ({ surah, ayah })));
  });
  Step("opening Surah {int} from the Surah index opens it with Ayah {int}:{int} at the top", async (_, surah: number, inSurah: number, ayah: number) => {
    expect(inSurah, "the Ayah is in the Surah").toBe(surah);
    expect((await aw.places.open(surah)).opensAt).toBe(ayah);
  });

  // Signing out and deleting the Account.
  Step("I sign out on Me", () => aw.signOut());
  Step("the API refuses the sign-in the app held", async () => {
    expect(aw.heldBeforeSigningOut.length, "the app held a sign-in before signing out").toBeGreaterThan(0);
    for (const held of aw.heldBeforeSigningOut) {
      const answer = await aw.world.otherDeviceFetch(`${aw.world.data.origin}/api/v1/settings`, { headers: { authorization: `Bearer ${held}` } });
      expect(answer.status, "the API refuses the bearer token the app held").toBe(401);
    }
  });
  Step("I delete my Account on Me, confirming", () => aw.deleteAccount());
  Step("I delete my Account on Me, confirming, and sign in again as {string} when asked", (_, email: string) =>
    aw.deleteAccount((method) => aw.api.issueIdToken(method, email)),
  );
  Step("I delete my Account on Me, confirming, and cancel the sign-in it asks for", () => aw.deleteAccount(() => null));
  Step("deleting the Account ends as {string}", (_, outcome: string) => expect(aw.deleted).toBe(outcome));
  Step("the Sign in with {word} sheet opened again", (_, method: string) => {
    expect(aw.sheetsOpenedWhileDeleting()).toEqual([signInMethod(method)]);
  });
  Step("the API holds no Account for {string}, and no sign-in to it on any device", (_, email: string) => {
    expect(aw.api.account(email), `the API holds no Account for ${email}`).toBeUndefined();
    expect(aw.api.sessionsOf(email)).toBe(0);
  });
  Step("the website is signed out of it too", async () => {
    expect(await (await aw.theWebsite()).stillSignedIn(), "the API refuses the website's sign-in").toBe(false);
  });
  Step(
    "signing in on the website again as {string} makes a new Account with no Script, Language or Reading places",
    async (_, email: string) => {
      const again = await aw.api.website(email, aw.world.otherDeviceFetch);
      expect(await again.settings()).toEqual({ script: null, language: null });
      expect(await again.readingPlaces()).toEqual([]);
    },
  );
}
