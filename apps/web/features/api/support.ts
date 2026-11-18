// The API contract's client (#70): talks to the production build that
// ./serve-api.ts serves on PORT, over HTTP, as the website and the mobile app
// do. A person signs in through the Account test-only sign-in (#66), whose
// answer carries the session cookie the website keeps and, in its
// set-auth-token header, the bearer token the mobile app keeps.

import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";
import { expect } from "vitest";
import { Pool } from "pg";
import { LANGUAGE_NAME, type Language } from "@saaliheen/passages";
import type { AnswerEvent } from "@saaliheen/quran-chat";
import { testDatabase } from "../site/test-database.ts";

/** What a run of a script left: whether it succeeded, and everything it printed. */
export interface Run {
  ok: boolean;
  output: string;
}

/** Run `pnpm run <script> [...args]` in the website's directory against the run's own Postgres, as the owner runs it against Neon, with `env` over the run's own. */
export async function runScript(script: string, args: string[] = [], env: Record<string, string> = {}): Promise<Run> {
  const all = { ...process.env, DATABASE_URL: testDatabase(Number(process.env.PORT)).url, ...env };
  try {
    const { stdout, stderr } = await promisify(execFile)("pnpm", ["run", "--silent", script, ...args], {
      cwd: path.join(__dirname, "..", ".."),
      env: all,
      encoding: "utf8",
    });
    return { ok: true, output: `${stdout}\n${stderr}` };
  } catch (error) {
    const { stdout = "", stderr = "", message } = error as { stdout?: string; stderr?: string; message: string };
    return { ok: false, output: `${stdout}\n${stderr}\n${message}` };
  }
}

/** The server under test. */
export const baseURL = () => {
  const port = Number(process.env.PORT);
  if (!Number.isInteger(port) || port <= 0) throw new Error("set PORT, e.g. `PORT=3070 pnpm test:api`");
  return `http://127.0.0.1:${port}`;
};

/** The bytes a published /data/v1 file serves for `value`: its JSON. */
export const published = (value: unknown) => JSON.stringify(value);

/** One file as a client fetched it. */
export interface Fetched {
  address: string;
  status: number;
  headers: Headers;
  text: string;
}

/** GET `address` from the server, once more if a kept-alive connection was reset. */
export async function fetched(address: string): Promise<Fetched> {
  let res: Response;
  try {
    res = await fetch(`${baseURL()}${address}`);
  } catch {
    res = await fetch(`${baseURL()}${address}`);
  }
  return { address, status: res.status, headers: res.headers, text: await res.text() };
}

/**
 * Every particle file /data/v1 serves (#249), /data/v1/particles/1.json up to
 * the first number not found, as a client would walk them: the manifest names
 * none, its dataset version covers them all.
 */
export async function servedParticles(): Promise<Fetched[]> {
  const files: Fetched[] = [];
  for (let from = 1; ; from += 16) {
    const batch = await Promise.all(Array.from({ length: 16 }, (_, i) => fetched(`/data/v1/particles/${from + i}.json`)));
    const missing = batch.findIndex((f) => f.status === 404);
    files.push(...(missing === -1 ? batch : batch.slice(0, missing)));
    if (missing !== -1) return files;
  }
}

/** A cache directive's seconds in `header`, or 0. */
function seconds(header: string | null, directive: string): number {
  const match = new RegExp(`(?:^|[,\\s])${directive}=(\\d+)`).exec(header ?? "");
  return match ? Number(match[1]) : 0;
}

/** Expect `file`'s answer to tell a CDN to keep it for at least a day. */
export function expectKeptByACdnForADay({ headers, address }: Fetched) {
  const cdn = Math.max(
    seconds(headers.get("cache-control"), "s-maxage"),
    seconds(headers.get("cdn-cache-control"), "max-age"),
    seconds(headers.get("cdn-cache-control"), "s-maxage"),
    seconds(headers.get("vercel-cdn-cache-control"), "max-age"),
    seconds(headers.get("vercel-cdn-cache-control"), "s-maxage"),
  );
  const shown = ["cache-control", "cdn-cache-control", "vercel-cdn-cache-control"].map((h) => `${h}: ${headers.get(h)}`).join("; ");
  expect(cdn, `${address} answers ${shown}`).toBeGreaterThanOrEqual(24 * 60 * 60);
}

/** What a sign-in left a client holding. */
export interface SignedIn {
  email: string;
  /** The session cookie, as a Cookie header. */
  cookie: string;
  /** The bearer token from the sign-in's set-auth-token header, when it gave one. */
  token: string | null;
}

/** An answer from the API: its status, headers and body, parsed when JSON. */
export interface Answer {
  status: number;
  headers: Headers;
  text: string;
  json: unknown;
}

async function answerOf(res: Response): Promise<Answer> {
  const text = await res.text();
  let json: unknown = undefined;
  if ((res.headers.get("content-type") ?? "").includes("application/json")) {
    try {
      json = JSON.parse(text);
    } catch {
      json = undefined;
    }
  }
  return { status: res.status, headers: res.headers, text, json };
}

/** Sign in to an Account as `email` through the Account test sign-in, as if through Google. */
export async function signIn(email: string): Promise<SignedIn> {
  const res = await fetch(`${baseURL()}/api/v1/auth/test-sign-in`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: baseURL() },
    body: JSON.stringify({ email, method: "google" }),
  });
  expect(res.status, `the test sign-in signs ${email} in`).toBe(200);
  const cookie = res.headers
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .join("; ");
  expect(cookie, "the sign-in set a session cookie").not.toBe("");
  return { email, cookie, token: res.headers.get("set-auth-token") };
}

/** The credentials a request carries, by how a scenario names them. */
export function credentialHeaders(credential: string, signedIn?: SignedIn): Record<string, string> {
  switch (credential) {
    case "session cookie":
      if (!signedIn) throw new Error("not signed in in this scenario");
      return { cookie: signedIn.cookie, origin: baseURL() };
    case "bearer token":
      if (!signedIn) throw new Error("not signed in in this scenario");
      expect(signedIn.token, "the sign-in answered a bearer token in its set-auth-token header").toBeTruthy();
      return { authorization: `Bearer ${signedIn.token}` };
    case "neither cookie nor token":
      return {};
    case "a bearer token that is made up":
      return { authorization: "Bearer made-up-token-that-no-sign-in-gave-0123456789" };
    case "a session cookie that is forged":
      return { cookie: "better-auth.session_token=forged-session-token.forged-signature", origin: baseURL() };
    default:
      throw new Error(`no credential named "${credential}"`);
  }
}

/** Send `method path` with `headers` and, when given, `body` as JSON. */
export async function send(method: string, path: string, headers: Record<string, string>, body?: string): Promise<Answer> {
  const res = await fetch(`${baseURL()}${path}`, {
    method,
    headers: body === undefined ? headers : { ...headers, "content-type": "application/json" },
    body,
  });
  return answerOf(res);
}

/** The Account id the signed-in session belongs to, from Better Auth's session answer. */
export async function accountId(signedIn: SignedIn): Promise<string> {
  const answer = await send("GET", "/api/v1/auth/get-session", credentialHeaders("session cookie", signedIn));
  const id = (answer.json as { user?: { id?: unknown } } | null)?.user?.id;
  expect(typeof id, "signed in to an Account").toBe("string");
  return id as string;
}

/** What the fake Claude last received, as the Messages API takes it. */
export interface Recorded {
  model: string;
  messages: { role: string; content: string | { type: string; text?: string }[] }[];
}

/** Where the fake Claude records the last request it received: GET reads it, DELETE forgets it. */
export const fakeClaude = () => {
  const base = process.env.ANTHROPIC_BASE_URL;
  if (!base) throw new Error("no ANTHROPIC_BASE_URL: ./serve-api.ts names the fake Claude");
  return `${base}/recorded`;
};
/** What the fake Claude last received; null when nothing since it was last reset. */
export const recorded = async () => (await (await fetch(fakeClaude())).json()) as Recorded | null;

let pool: Pool | undefined;
/** The run's Account database, as the server under test reaches it. */
export const database = () =>
  (pool ??= new Pool({ connectionString: testDatabase(Number(process.env.PORT)).url, max: 2, idleTimeoutMillis: 1_000, allowExitOnIdle: true }));

/** Every row tied to Account `id`, by table: each row of any table with a "userId" column, and its own "user" row. */
export async function rowsOf(id: string): Promise<Record<string, Record<string, unknown>[]>> {
  const db = database();
  const tables = await db.query<{ table_name: string }>(
    `select table_name from information_schema.columns
      where table_schema = 'public' and column_name = 'userId' order by table_name`,
  );
  const rows: Record<string, Record<string, unknown>[]> = {
    user: (await db.query(`select * from "user" where id = $1`, [id])).rows,
  };
  for (const { table_name } of tables.rows) {
    rows[table_name] = (await db.query(`select * from "${table_name}" where "userId" = $1`, [id])).rows;
  }
  return rows;
}

// ---------------------------------------------------------------- Quran Chat (#78, #79)

/** Each Language by its name, as a scenario writes it: "English", "Urdu". */
export const LANGUAGES = Object.fromEntries(Object.entries(LANGUAGE_NAME).map(([code, name]) => [name, code as Language])) as Record<
  string,
  Language | undefined
>;

/** A streamed answer's events, one a line. */
export const answerEvents = (answer: Answer): AnswerEvent[] =>
  answer.text
    .split("\n")
    .filter((line) => line.trim())
    .map((line) => JSON.parse(line) as AnswerEvent);

/** A message's text, its text blocks joined. */
export const textOf = (content: Recorded["messages"][number]["content"]) =>
  typeof content === "string" ? content : content.map((block) => block.text ?? "").join("\n");

/** Make the fake Claude forget the last request it received. */
export const forgetClaude = async () => {
  await fetch(fakeClaude(), { method: "DELETE" });
};
