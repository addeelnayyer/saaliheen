// An Account in the mobile app (#75): signing in with Google or Apple through
// the device's own sign-in sheet, staying signed in across launches, syncing
// the Script, the Language, the Reading places and the Known words (#254) with
// the Account through /api/v1 with a bearer token, signing out and deleting
// the Account. This module imports nothing from React Native or Expo, so the
// app's scenarios (features/signing-in-in-the-app.feature and the Account
// features beside it) run it in Node; the screens give it the device's sheet,
// keychain and connection.
//
// Signed in, the app keeps a sign-in (the bearer token Better Auth's native
// sign-in answered, the Account's email and the method) in the keychain. Each
// change to the Script, the Language, the Reading places or the Known words
// made through `storage` is marked unsent on the device and sent at once; with
// no connection it waits for the connection to come back, or for the next
// launch.
// A sync (at sign-in, at launch and when the connection comes back) applies
// the Account's Script and Language to the device unless the device's are
// unsent, gives the Account the device's where it has none, and sends the
// device's Reading places, writing back the Account's merge of them (newest
// per Surah, then the ten newest), so offline reading lands in the order it
// was read (docs/adr/0048). It sends the device's Known words the same way,
// unmarks included, and keeps the Account's merge of them (the newer per Root
// or particle, a tie going to the unmark,
// docs/adr/0057-known-words-are-kept-by-their-letters-and-merged-per-entry-with-unmarks-kept.md),
// so a mark made offline wins or loses by when it was made, and on first
// sign-in the device's and the Account's merge. A mark and a sync writing the
// Known words at once are merged one after the other, so neither is lost.
// Signing out or deleting the Account leaves the device's. Quran Chat
// (src/quran-chat.ts, #81) asks the API through `request`, with the same
// sign-in, its answers streaming.

import { mergeReadingPlaces, parseReadingPlaces, writeReadingPlaces, type TimedReadingPlace } from "@saaliheen/reading-places";
import { entryOf, isKnownWordEntry, mergeKnownWords, parseKnownWords, writeKnownWords, type KnownWordEntry } from "@saaliheen/known-words";
import { KNOWN_WORDS } from "./known-words";
import type { DeviceStorage } from "./quran-analysis";

/** The ways a reader signs in to an Account in the app: Google and Apple, as on the website's Sign-in page. */
export type SignInMethod = "google" | "apple";

/** What the device's Sign in with Google or Sign in with Apple sheet gives back: the provider's id token, and the nonce it was asked with. */
export interface IdToken {
  token: string;
  nonce?: string;
}

/** The device's own sign-in sheet for `method`: its id token, or null when the reader cancels it. */
export type SignInSheet = (method: SignInMethod) => Promise<IdToken | null>;

/** Where the app keeps what keeps it signed in: the device's keychain (expo-secure-store), never its plain storage. */
export interface Keychain {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  deleteItem(key: string): Promise<void>;
}

/** The device's connection (expo-network): tells each listener when the device goes online (true) or offline (false). */
export interface Connection {
  subscribe(listener: (online: boolean) => void): () => void;
}

export interface AccountOptions {
  /** The origin the app reads /data/v1 and /api/v1 from (dataOrigin()). */
  origin: string;
  /** This device's storage, where the Script, Language and Reading places are kept under the website's keys. */
  device: DeviceStorage;
  keychain: Keychain;
  sheet: SignInSheet;
  connection: Connection;
  /** The fetch Quran Chat's requests go through, whose answer's body streams (expo/fetch on the device); the global fetch when not given. */
  streamingFetch?: typeof fetch;
}

/** Who the app is signed in as, as Me shows it. */
export interface SignedInAs {
  email: string;
}

/** How a sign-in ended. */
export type SignInOutcome = "signed in" | "cancelled" | "no connection" | "refused";

/** How deleting the Account ended. */
export type DeleteOutcome = "deleted" | "cancelled" | "no connection" | "refused";

export interface AppAccount {
  /**
   * The storage the app keeps its Script, Language, Reading places and Known
   * words in: this device's, with each change also brought to the Account
   * while signed in, and left for the next sync while offline. The Known words
   * written to it are merged into the device's, never put in their place.
   */
  readonly storage: DeviceStorage;
  /** The Account this device is signed in to, or null. */
  signedInAs(): Promise<SignedInAs | null>;
  /** Signs in through the device's sheet for `method`, then brings the Account's Script, Language and Reading places to the device and the device's to the Account. */
  signIn(method: SignInMethod): Promise<SignInOutcome>;
  /** Signs this device out: the Account forgets this sign-in, and the device keeps its own Reading places and settings. */
  signOut(): Promise<void>;
  /** Deletes the Account and all its data at once (after Me has asked the reader to confirm), signing the device out. */
  deleteAccount(): Promise<DeleteOutcome>;
  /**
   * Sends a request to /api/v1 `path` as the Account signed in to (Quran
   * Chat's, #81), its body streaming as it arrives: the answer, or null when
   * signed out or with no connection (or when `signal` stopped it). An answer
   * that the API no longer knows the sign-in signs the device out.
   */
  request(method: string, path: string, options?: { body?: unknown; signal?: AbortSignal }): Promise<Response | null>;
  /** Resolves once every sync and send the app has started so far has finished. */
  settled(): Promise<void>;
  /** Calls `listener` each time a sync, sign-in, sign-out or deletion has finished, as the device's settings may have changed; answers how to stop. */
  subscribe(listener: () => void): () => void;
}

/** The origin the app's requests name, as Expo's Better Auth client names it: the app's own scheme. */
export const APP_ORIGIN = "saaliheen://";

/** The keychain entry the sign-in is kept under. */
const SIGN_IN = "saaliheen-sign-in";

/** The device-storage key listing what is still to be sent to the Account. */
const UNSENT = "qwt-account-unsent";

/** The synced settings, by the website's keys they are kept under on the device. */
const SETTINGS = { script: "qwt-script", language: "qwt-language" } as const;
type Setting = keyof typeof SETTINGS;
const READING_PLACES = "qwt-reading-places";

/** What may be still to send: a setting, the Reading places or the Known words. */
type Unsent = Setting | "readingPlaces" | "knownWords";

/** Each synced key's name in the unsent list. */
const SYNCED: Record<string, Unsent> = {
  [SETTINGS.script]: "script",
  [SETTINGS.language]: "language",
  [READING_PLACES]: "readingPlaces",
  [KNOWN_WORDS]: "knownWords",
};

/** Each setting's value when the device has none: the website's default. */
const DEFAULTS: Record<Setting, string> = { script: "uthmani", language: "ur" };

/** The sign-in the keychain keeps. */
interface KeptSignIn {
  bearer: string;
  email: string;
  method: SignInMethod;
}

/** An answer from the API, or null when there was no connection. */
type Answer = { status: number; json: unknown; bearer: string | null } | null;

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;

/** The JSON `written` holds; anything else, and nothing, is null. */
function parsed(written: string | null): unknown {
  try {
    return JSON.parse(written ?? "null");
  } catch {
    return null;
  }
}

/** Whether `value` is a kept sign-in. */
const isSignIn = (value: unknown): value is KeptSignIn =>
  isObject(value) && typeof value.bearer === "string" && typeof value.email === "string";

/** The kept sign-in in `written`, or null. */
function parseSignIn(written: string | null): KeptSignIn | null {
  const value = parsed(written);
  return isSignIn(value) ? value : null;
}

/** The unsent list in `written`. */
function parseUnsent(written: string | null): Set<Unsent> {
  const value = parsed(written);
  return new Set(Array.isArray(value) ? value.filter((u): u is Unsent => Object.values(SYNCED).includes(u)) : []);
}

/** The email of the Account a sign-in answer names, or null. */
const emailIn = (json: unknown): string | null =>
  isObject(json) && isObject(json.user) && typeof json.user.email === "string" ? json.user.email : null;

/** The app's Account on this device, as it opens at launch. */
export function openAccount(options: AccountOptions): AppAccount {
  const { origin, device, keychain, sheet, connection, streamingFetch } = options;
  let queue: Promise<unknown> = Promise.resolve();

  /** Runs `op` after everything started before it; the queue goes on whatever it ends as. */
  function run<T>(op: () => Promise<T>): Promise<T> {
    const done = queue.then(op);
    queue = done.catch(() => undefined);
    return done;
  }

  const listeners = new Set<() => void>();
  /** Runs `op` as `run` does, then tells every listener the device may have changed. */
  const runAndTell = <T>(op: () => Promise<T>): Promise<T> =>
    run(async () => {
      try {
        return await op();
      } finally {
        for (const listener of listeners) listener();
      }
    });

  /** Sends one request to /api/v1 through `send`; null when there is no connection. */
  async function send(method: string, path: string, bearer: string | null, init: { body?: unknown; signal?: AbortSignal; fetcher?: typeof fetch } = {}) {
    const headers: Record<string, string> = { "content-type": "application/json", "expo-origin": APP_ORIGIN };
    if (bearer) headers.authorization = `Bearer ${bearer}`;
    const { body, signal } = init;
    try {
      return await (init.fetcher ?? fetch)(`${origin}/api/v1${path}`, { method, headers, signal, body: body === undefined ? undefined : JSON.stringify(body) });
    } catch {
      return null;
    }
  }

  /** Sends one request to /api/v1 and reads its JSON answer; null when there is no connection. */
  async function call(method: string, path: string, bearer: string | null, body?: unknown): Promise<Answer> {
    const res = await send(method, path, bearer, { body });
    if (!res) return null;
    return { status: res.status, json: await res.json().catch(() => null), bearer: res.headers.get("set-auth-token") };
  }

  const kept = async () => parseSignIn(await keychain.getItem(SIGN_IN));
  const unsent = async () => parseUnsent(await device.getItem(UNSENT));
  const keepUnsent = (list: Set<Unsent>) => device.setItem(UNSENT, JSON.stringify([...list]));

  /** Forgets the sign-in; the device keeps its own Reading places and settings. */
  async function forget() {
    await keychain.deleteItem(SIGN_IN);
    await keepUnsent(new Set());
  }

  /** The device's value of `setting`, its default when it has none. */
  const deviceSetting = async (setting: Setting) => (await device.getItem(SETTINGS[setting])) ?? DEFAULTS[setting];

  /** The settings to send: each unsent one, and each the Account has not chosen, from the device. */
  async function settingsToSend(account: Record<string, unknown>, pending: Set<Unsent>) {
    const change: Partial<Record<Setting, string>> = {};
    for (const setting of Object.keys(SETTINGS) as Setting[]) {
      if (pending.has(setting) || typeof account[setting] !== "string") change[setting] = await deviceSetting(setting);
      else await device.setItem(SETTINGS[setting], account[setting] as string);
    }
    return change;
  }

  /** Sends the device's Reading places and keeps the Account's merge of them; false with no connection. */
  async function sendReadingPlaces(bearer: string): Promise<boolean> {
    const places = parseReadingPlaces(await device.getItem(READING_PLACES));
    const answer = await call("PATCH", "/reading-places", bearer, { readingPlaces: places });
    if (answer?.status !== 200) return false;
    const merged = (answer.json as { readingPlaces: TimedReadingPlace[] }).readingPlaces;
    const now = parseReadingPlaces(await device.getItem(READING_PLACES));
    await device.setItem(READING_PLACES, writeReadingPlaces(mergeReadingPlaces(merged, now)));
    return true;
  }

  // Every write of the Known words, a mark's or a sync's, is merged into the
  // device's as they are then, one at a time, so neither loses the other's.
  let knownWordsKept: Promise<unknown> = Promise.resolve();
  function keepKnownWords(entries: KnownWordEntry[]): Promise<void> {
    const kept = knownWordsKept.then(async () => {
      const now = parseKnownWords(await device.getItem(KNOWN_WORDS));
      await device.setItem(KNOWN_WORDS, writeKnownWords(mergeKnownWords(now, entries)));
    });
    knownWordsKept = kept.catch(() => undefined);
    return kept;
  }

  /** Sends the device's Known words, unmarks included, and keeps the Account's merge of them; false with no connection. */
  async function sendKnownWords(bearer: string): Promise<boolean> {
    const entries = parseKnownWords(await device.getItem(KNOWN_WORDS));
    const answer = await call("PATCH", "/known-words", bearer, { knownWords: entries });
    const merged = isObject(answer?.json) ? answer.json.knownWords : undefined;
    if (answer?.status !== 200 || !Array.isArray(merged)) return false;
    await keepKnownWords(merged.filter(isKnownWordEntry).map(entryOf));
    return true;
  }

  /** Sends the settings in `change`, if any; false with no connection. */
  async function sendSettings(bearer: string, change: Partial<Record<Setting, string>>): Promise<boolean> {
    if (Object.keys(change).length === 0) return true;
    return (await call("PATCH", "/settings", bearer, change))?.status === 200;
  }

  /**
   * Brings the device and the Account together: the Account's settings to the
   * device and the device's unsent or missing ones to the Account, then the
   * Reading places and the Known words both ways. A sign-in the API no longer
   * knows (the Account was deleted elsewhere, or signed out) signs the device
   * out.
   */
  async function sync() {
    const signIn = await kept();
    if (signIn) await syncWith(signIn.bearer, await call("GET", "/settings", signIn.bearer));
  }

  /** Syncs with the Account's settings `answer`ed, signing out if the API no longer knows the sign-in. */
  async function syncWith(bearer: string, answer: Answer) {
    const status = answer ? answer.status : 0;
    if (status === 401) return forget();
    if (status !== 200) return;
    const change = await settingsToSend(answer!.json as Record<string, unknown>, await unsent());
    const settingsSent = await sendSettings(bearer, change);
    const placesSent = await sendReadingPlaces(bearer);
    const knownWordsSent = await sendKnownWords(bearer);
    if (settingsSent && placesSent && knownWordsSent) await keepUnsent(new Set());
  }

  /** Marks `what` unsent, then sends everything unsent. */
  async function changed(what: Unsent) {
    const signIn = await kept();
    if (!signIn) return;
    const pending = await unsent();
    pending.add(what);
    await keepUnsent(pending);
    await sync();
  }

  /** Signs in through the sheet for `method`, keeping the sign-in; how it ended, and the kept sign-in when it did. */
  async function signInThrough(method: SignInMethod): Promise<{ outcome: SignInOutcome; signIn?: KeptSignIn }> {
    const idToken = await sheet(method);
    if (!idToken) return { outcome: "cancelled" };
    const answer = await call("POST", "/auth/sign-in/social", null, { provider: method, idToken });
    if (!answer) return { outcome: "no connection" };
    const email = emailIn(answer.json);
    if (answer.status !== 200 || !answer.bearer || !email) return { outcome: "refused" };
    const signIn = { bearer: answer.bearer, email, method };
    await keychain.setItem(SIGN_IN, JSON.stringify(signIn));
    return { outcome: "signed in", signIn };
  }

  /** Deletes the Account with the kept sign-in, signing in again first when the API asks for a fresher one. */
  async function deleteWith(signIn: KeptSignIn, again = true): Promise<DeleteOutcome> {
    const answer = await call("POST", "/auth/delete-user", signIn.bearer, {});
    if (!answer) return "no connection";
    if (answer.status === 200) {
      await forget();
      return "deleted";
    }
    const expired = isObject(answer.json) && answer.json.code === "SESSION_EXPIRED";
    return expired && again ? deleteFresh(signIn.method) : "refused";
  }

  /** Signs in again with `method`, then deletes the Account with that fresh sign-in; cancelling keeps it. */
  async function deleteFresh(method: SignInMethod): Promise<DeleteOutcome> {
    const fresh = await signInThrough(method);
    return fresh.signIn ? deleteWith(fresh.signIn, false) : (fresh.outcome as DeleteOutcome);
  }

  const storage: DeviceStorage = {
    getItem: (key) => device.getItem(key),
    async setItem(key, value) {
      if (key === KNOWN_WORDS) await keepKnownWords(parseKnownWords(value));
      else await device.setItem(key, value);
      const what = SYNCED[key];
      if (what) void run(() => changed(what));
    },
  };

  connection.subscribe((online) => {
    if (online) void runAndTell(sync);
  });
  void runAndTell(sync);

  return {
    storage,
    signedInAs: async () => {
      const signIn = await kept();
      return signIn ? { email: signIn.email } : null;
    },
    signIn: (method) =>
      runAndTell(async () => {
        const { outcome } = await signInThrough(method);
        if (outcome === "signed in") await sync();
        return outcome;
      }),
    signOut: () =>
      runAndTell(async () => {
        const signIn = await kept();
        if (signIn) await call("POST", "/auth/sign-out", signIn.bearer, {});
        await forget();
      }),
    deleteAccount: () =>
      runAndTell(async () => {
        const signIn = await kept();
        return signIn ? deleteWith(signIn) : "refused";
      }),
    async request(method, path, { body, signal } = {}) {
      const signIn = await kept();
      if (!signIn) return null;
      const res = await send(method, path, signIn.bearer, { body, signal, fetcher: streamingFetch });
      if (res?.status === 401) {
        // Signed out elsewhere, or the Account deleted: forget this sign-in, unless another has replaced it since.
        void runAndTell(async () => {
          if ((await kept())?.bearer === signIn.bearer) await forget();
        });
      }
      return res;
    },
    settled: () => run(async () => {}),
    subscribe(listener) {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },
  };
}
