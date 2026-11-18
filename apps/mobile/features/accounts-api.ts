// The Account side of /api/v1 the app's Account scenarios (#75) talk to: a
// faithful stand-in, on the data origin (./support.ts), for the website's
// Account resources, which the website's API contract
// (apps/web/features/api/settings.feature, reading-places.feature and
// accounts-in-the-app.feature) pins against the real build and Postgres. The
// app's scenarios run in Node with `pnpm test`, with no build or Postgres, so
// they meet this stand-in instead; it answers exactly as that contract says:
//
// - POST /api/v1/auth/sign-in/social { provider, idToken: { token, nonce? } }:
//   Better Auth's native sign-in. An id token the device's Google or Apple
//   sheet gave (issueIdToken) for that provider signs in to the Account with
//   its email, one Account per email whichever method; it answers 200
//   { redirect: false, token, user } and, in its set-auth-token header, the
//   bearer token, which alone is accepted as Authorization: Bearer. Any other
//   id token is refused, 401 { code: "INVALID_TOKEN" }, and makes no Account.
// - POST /api/v1/auth/test-sign-in { email, method }: the website's sign-in, as
//   the Account test-only sign-in stands in for it; it answers set-auth-token
//   too, which stands in for the website's session cookie.
// - GET /api/v1/auth/get-session: { session, user } or null.
// - POST /api/v1/auth/sign-out: ends the session; its bearer token is refused from then on.
// - POST /api/v1/auth/delete-user: deletes the Account, its sessions on every
//   device, its settings, its Reading places and its Known words, 200
//   { success: true }; from a session made more than a day ago (Better Auth's
//   freshAge), 400 { code: "SESSION_EXPIRED" } and nothing is deleted.
// - GET and PATCH /api/v1/settings { script, language }, each null until chosen.
// - GET and PATCH /api/v1/reading-places { readingPlaces: [{ surah, ayah, readAt }] },
//   merged by @saaliheen/reading-places' own rule, as the website merges them.
// - GET and PATCH /api/v1/known-words { knownWords: [{ kind, text, known, markedAt }] },
//   unmarks included, merged by @saaliheen/known-words' own rule (the newer per
//   entry, a tie going to the unmark), as the website merges them
//   (apps/web/features/api/known-words.feature); PATCHing none reads them.
// - 401 { error } for a request with no bearer token the API knows; 400 { error }
//   for a body that is not one; every answer carries Min-App-Version.
//
// It records every request it gets, with its body, so a scenario can say what
// the app sent, and what it never sent.

import { randomUUID } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import { MIN_APP_VERSION } from "@saaliheen/dataset/published";
import { entryOf, isKnownWordEntry, mergeKnownWords, type KnownWordEntry } from "@saaliheen/known-words";
import { isTimedReadingPlace, mergeReadingPlaces, type TimedReadingPlace } from "@saaliheen/reading-places";
import type { Conversation, ConversationListed } from "@saaliheen/quran-chat";
import type { IdToken, SignInMethod } from "../src/account.ts";

/** How long a session stays fresh enough to delete its Account: Better Auth's freshAge, a day. */
export const FRESH_FOR_MS = 24 * 60 * 60 * 1000;

const SCRIPTS = ["uthmani", "indopak"];
const LANGUAGES = ["ur", "en"];

interface Account {
  id: string;
  email: string;
  script: string | null;
  language: string | null;
  readingPlaces: TimedReadingPlace[];
  knownWords: KnownWordEntry[];
}

interface Session {
  accountId: string;
  createdAt: number;
}

/** One request the API got: its method, path, Authorization header and JSON body, when it had one, and whether the website sent it or the app. */
export interface ApiRequest {
  from: "the website" | "the app";
  method: string;
  path: string;
  authorization: string | null;
  body: unknown;
}

/** The website, signed in to an Account, as it reads and writes that Account through /api/v1. */
export interface Website {
  readonly email: string;
  settings(): Promise<{ script: string | null; language: string | null }>;
  saveSettings(change: { script?: string; language?: string }): Promise<void>;
  readingPlaces(): Promise<TimedReadingPlace[]>;
  /** Reading on the website: brings one Reading place, read at `readAt`, to the Account. */
  read(place: { surah: number; ayah: number }, readAt: number): Promise<void>;
  /** The Account's Known words, unmarks included, oldest marked first. */
  knownWords(): Promise<KnownWordEntry[]>;
  /** Marking or unmarking on the website: brings `entries` to the Account. */
  markKnownWords(entries: KnownWordEntry[]): Promise<void>;
  /** Whether the API still knows this website's sign-in. */
  stillSignedIn(): Promise<boolean>;
  /** Deletes the Account from the website's Sign-in page. */
  deleteAccount(): Promise<void>;
  /** Asks Quran Chat `question` in English on the website's Quran Chat page, starting a Conversation (#81). */
  ask(question: string): Promise<void>;
  /** The Account's Conversations as the website's Quran Chat page lists them. */
  conversations(): Promise<ConversationListed[]>;
  /** The Account's Conversation `id`, reopened on the website. */
  conversation(id: string): Promise<Conversation>;
  /** Deletes the Account's Conversation `id` on the website. */
  deleteConversation(id: string): Promise<void>;
}

export const isObject = (body: unknown): body is Record<string, unknown> =>
  typeof body === "object" && body !== null && !Array.isArray(body);

export async function bodyOf(req: IncomingMessage): Promise<{ text: string; json: unknown }> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  const text = Buffer.concat(chunks).toString("utf8");
  try {
    return { text, json: text ? JSON.parse(text) : undefined };
  } catch {
    return { text, json: undefined };
  }
}

export class AccountsApi {
  /** Accounts by email. */
  readonly accounts = new Map<string, Account>();
  /** Sessions by the bearer token set-auth-token gave. */
  private readonly sessions = new Map<string, Session>();
  /** The bearer tokens the website's sign-ins were given, kept after they end. */
  private readonly websiteBearers = new Set<string>();
  /** Id tokens the device's sheets gave, by token. */
  private readonly idTokens = new Map<string, { method: SignInMethod; email: string }>();
  /** Every /api/v1 request the API got, in order. */
  readonly requests: ApiRequest[] = [];

  constructor(private readonly origin: () => string) {}

  /** What the device's Sign in with `method` sheet gives a reader who signs in there as `email`. */
  issueIdToken(method: SignInMethod, email: string): IdToken {
    const token = `id-token-${method}-${randomUUID()}`;
    this.idTokens.set(token, { method, email });
    return { token, nonce: randomUUID() };
  }

  /** The Account with `email`, or undefined. */
  account(email: string): Account | undefined {
    return this.accounts.get(email);
  }

  /** How many sessions Account `email` has, on every device. */
  sessionsOf(email: string): number {
    const id = this.accounts.get(email)?.id;
    return [...this.sessions.values()].filter((s) => s.accountId === id).length;
  }

  /** The email of the Account an `Authorization` header's bearer token signs in to, or null when the API does not know it. */
  whoIs(authorization: string | null): string | null {
    const bearer = /^Bearer (.+)$/.exec(authorization ?? "")?.[1];
    const session = bearer ? this.sessions.get(bearer) : undefined;
    return [...this.accounts.values()].find((a) => a.id === session?.accountId)?.email ?? null;
  }

  /**
   * The website, signed in to the Account with `email` (made if new) through
   * its own sign-in. It is another device: it reaches the API with `send`, the
   * fetch the phone's airplane mode never touches.
   */
  async website(email: string, send: typeof fetch = fetch): Promise<Website> {
    const origin = this.origin();
    const signedIn = await send(`${origin}/api/v1/auth/test-sign-in`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, method: "google" }),
    });
    const token = signedIn.headers.get("set-auth-token");
    if (!signedIn.ok || !token) throw new Error(`the website could not sign in as ${email}`);
    const headers = { authorization: `Bearer ${token}`, "content-type": "application/json" };
    const call = async (method: string, path: string, body?: unknown) => {
      const res = await send(`${origin}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
      return { status: res.status, json: (await res.json().catch(() => null)) as unknown };
    };
    const ok = async (method: string, path: string, body?: unknown) => {
      const answer = await call(method, path, body);
      if (answer.status !== 200) throw new Error(`the website's ${method} ${path} answered ${answer.status}`);
      return answer.json;
    };
    return {
      email,
      settings: async () => (await ok("GET", "/api/v1/settings")) as { script: string | null; language: string | null },
      saveSettings: async (change) => void (await ok("PATCH", "/api/v1/settings", change)),
      readingPlaces: async () => ((await ok("GET", "/api/v1/reading-places")) as { readingPlaces: TimedReadingPlace[] }).readingPlaces,
      read: async (place, readAt) => void (await ok("PATCH", "/api/v1/reading-places", { readingPlaces: [{ ...place, readAt }] })),
      knownWords: async () => ((await ok("GET", "/api/v1/known-words")) as { knownWords: KnownWordEntry[] }).knownWords,
      markKnownWords: async (entries) => void (await ok("PATCH", "/api/v1/known-words", { knownWords: entries })),
      stillSignedIn: async () => (await call("GET", "/api/v1/settings")).status === 200,
      deleteAccount: async () => void (await ok("POST", "/api/v1/auth/delete-user", {})),
      ask: async (question) => {
        const res = await send(`${origin}/api/v1/questions`, { method: "POST", headers, body: JSON.stringify({ question, language: "en" }) });
        if (res.status !== 200) throw new Error(`the website's question answered ${res.status}`);
        await res.text();
      },
      conversations: async () => ((await ok("GET", "/api/v1/conversations")) as { conversations: ConversationListed[] }).conversations,
      conversation: async (id) => (await ok("GET", `/api/v1/conversations/${encodeURIComponent(id)}`)) as Conversation,
      deleteConversation: async (id) => {
        const res = await send(`${origin}/api/v1/conversations/${encodeURIComponent(id)}`, { method: "DELETE", headers });
        if (res.status !== 204) throw new Error(`the website's DELETE answered ${res.status}`);
      },
    };
  }

  /** Whether an `Authorization` header's bearer token is one the website's sign-in was given. */
  isWebsite(authorization: string | null): boolean {
    const bearer = /^Bearer (.+)$/.exec(authorization ?? "")?.[1];
    return bearer !== undefined && this.websiteBearers.has(bearer);
  }

  /** Forgets every Account, session, id token and request. */
  reset() {
    this.accounts.clear();
    this.sessions.clear();
    this.idTokens.clear();
    this.websiteBearers.clear();
    this.requests.length = 0;
  }

  /** Whether `pathname` is one of the Account resources this API answers. */
  handles(pathname: string): boolean {
    return pathname.startsWith("/api/v1/auth/") || pathname === "/api/v1/settings" || pathname === "/api/v1/reading-places" || pathname === "/api/v1/known-words";
  }

  /** Answers one request to an Account resource. */
  async answer(req: IncomingMessage, res: ServerResponse, pathname: string) {
    const { json } = await bodyOf(req);
    const method = req.method ?? "GET";
    const authorization = req.headers.authorization ?? null;
    const bearer = /^Bearer (.+)$/.exec(authorization ?? "")?.[1];
    const fromWebsite = pathname === "/api/v1/auth/test-sign-in" || (bearer !== undefined && this.websiteBearers.has(bearer));
    this.requests.push({ from: fromWebsite ? "the website" : "the app", method, path: pathname, authorization, body: json });
    const send = (status: number, body: unknown, headers: Record<string, string> = {}) =>
      res.writeHead(status, { "content-type": "application/json", "Min-App-Version": MIN_APP_VERSION, ...headers }).end(JSON.stringify(body));
    const session = bearer ? this.sessions.get(bearer) : undefined;
    const account = session ? [...this.accounts.values()].find((a) => a.id === session.accountId) : undefined;
    const notSignedIn = () => send(401, { error: "not signed in: send the session cookie or a bearer token" });

    switch (`${method} ${pathname}`) {
      case "POST /api/v1/auth/sign-in/social":
        return this.signInSocial(json, send);
      case "POST /api/v1/auth/test-sign-in": {
        const { email } = isObject(json) ? json : {};
        if (typeof email !== "string" || !email.includes("@")) return send(400, { message: "an email and a method" });
        this.websiteBearers.add(this.startSession(email, send));
        return;
      }
      case "GET /api/v1/auth/get-session":
        return account && session
          ? send(200, { session: { userId: account.id, createdAt: new Date(session.createdAt).toISOString() }, user: { id: account.id, email: account.email } })
          : send(200, null);
      case "POST /api/v1/auth/sign-out":
        if (bearer) this.sessions.delete(bearer);
        return send(200, { success: true });
      case "POST /api/v1/auth/delete-user":
        if (!account || !session) return send(401, { code: "UNAUTHORIZED", message: "Unauthorized" });
        if (Date.now() - session.createdAt >= FRESH_FOR_MS) {
          return send(400, { code: "SESSION_EXPIRED", message: "Session expired. Re-authenticate to perform this action." });
        }
        this.accounts.delete(account.email);
        for (const [token, s] of this.sessions) if (s.accountId === account.id) this.sessions.delete(token);
        return send(200, { success: true, message: "User deleted" });
      case "GET /api/v1/settings":
        return account ? send(200, { script: account.script, language: account.language }) : notSignedIn();
      case "PATCH /api/v1/settings": {
        if (!account) return notSignedIn();
        const change = isObject(json) ? json : undefined;
        const valid =
          change &&
          (change.script === undefined || SCRIPTS.includes(change.script as string)) &&
          (change.language === undefined || LANGUAGES.includes(change.language as string));
        if (!valid) return send(400, { error: "send a JSON object naming a script (uthmani or indopak) and/or a language (ur or en)" });
        if (change.script !== undefined) account.script = change.script as string;
        if (change.language !== undefined) account.language = change.language as string;
        return send(200, { script: account.script, language: account.language });
      }
      case "GET /api/v1/reading-places":
        return account ? send(200, { readingPlaces: account.readingPlaces }) : notSignedIn();
      case "PATCH /api/v1/reading-places": {
        if (!account) return notSignedIn();
        const brought = isObject(json) ? json.readingPlaces : undefined;
        if (!Array.isArray(brought) || !brought.every(isTimedReadingPlace)) {
          return send(400, { error: "send a JSON object whose readingPlaces is a list of { surah, ayah, readAt }" });
        }
        account.readingPlaces = mergeReadingPlaces(account.readingPlaces, brought);
        return send(200, { readingPlaces: account.readingPlaces });
      }
      case "GET /api/v1/known-words":
        return account ? send(200, { knownWords: account.knownWords }) : notSignedIn();
      case "PATCH /api/v1/known-words": {
        if (!account) return notSignedIn();
        const brought = isObject(json) ? json.knownWords : undefined;
        if (!Array.isArray(brought) || !brought.every(isKnownWordEntry)) {
          return send(400, { error: "send a JSON object whose knownWords is a list of { kind, text, known, markedAt }" });
        }
        account.knownWords = mergeKnownWords(account.knownWords, brought.map(entryOf));
        return send(200, { knownWords: account.knownWords });
      }
      default:
        return send(404, { error: "no such resource" });
    }
  }

  private signInSocial(json: unknown, send: (status: number, body: unknown, headers?: Record<string, string>) => void) {
    const { provider, idToken } = isObject(json) ? json : {};
    const token = isObject(idToken) ? idToken.token : undefined;
    const given = typeof token === "string" ? this.idTokens.get(token) : undefined;
    if (!given || given.method !== provider) return send(401, { code: "INVALID_TOKEN", message: "Invalid token" });
    this.idTokens.delete(token as string);
    this.startSession(given.email, send);
  }

  /** Signs in to the Account with `email`, made when new, and answers its new session; returns its bearer token. */
  private startSession(email: string, send: (status: number, body: unknown, headers?: Record<string, string>) => void): string {
    let account = this.accounts.get(email);
    if (!account) {
      account = { id: randomUUID(), email, script: null, language: null, readingPlaces: [], knownWords: [] };
      this.accounts.set(email, account);
    }
    const plain = randomUUID();
    const bearer = `${plain}.${randomUUID()}`;
    this.sessions.set(bearer, { accountId: account.id, createdAt: Date.now() });
    send(200, { redirect: false, token: plain, user: { id: account.id, email: account.email, name: account.email } }, { "set-auth-token": bearer });
    return bearer;
  }
}
