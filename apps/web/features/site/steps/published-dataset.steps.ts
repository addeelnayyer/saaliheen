// Steps for #65: the dataset published as versioned static files under
// /data/v1. A client here is Playwright's request context, as the mobile app
// would fetch the files. Each file's shape is written in the feature as a doc
// string (described in its Feature text); expected content is the committed
// generated dataset, read here, never typed: the Surah index and Surah files as
// last committed before the Quran moved into Neon (#172, ../committed-output.ts),
// the Root files as last committed before the Roots moved into Neon (#173).

import { createHash } from "node:crypto";
import { expect, type APIResponse } from "@playwright/test";
import { committedRoot, committedSurah, committedSurahIndex } from "../committed-output";
import { arrangedSurah } from "../passages-in-the-test-database";
import { Then, When, type FetchedFile, type Reading } from "./fixtures";

/** A shape as the feature writes it: a type name, null, [shape], {"oneOf": [...]} or an object of shapes. */
type Shape = string | null | Shape[] | { [field: string]: Shape };

const TYPES: Record<string, (value: unknown) => boolean> = {
  string: (v) => typeof v === "string",
  number: (v) => typeof v === "number",
  boolean: (v) => typeof v === "boolean",
  sha256: (v) => typeof v === "string" && /^[0-9a-f]{64}$/.test(v),
  version: (v) => typeof v === "string" && /^\d+\.\d+\.\d+$/.test(v),
};

/** Where `value` departs from `shape`, each as `<path>: <problem>`; extra fields are allowed (v1 only gains fields). */
function departures(value: unknown, shape: Shape, at = "$", out: string[] = []): string[] {
  if (out.length >= 20) return out;
  if (shape === null) {
    if (value !== null) out.push(`${at}: expected null`);
  } else if (typeof shape === "string") {
    const is = TYPES[shape];
    if (!is) throw new Error(`no such type in a shape: ${shape}`);
    if (!is(value)) out.push(`${at}: expected ${shape}, got ${JSON.stringify(value)?.slice(0, 60)}`);
  } else if (Array.isArray(shape)) {
    if (!Array.isArray(value) || value.length === 0) out.push(`${at}: expected a non-empty array`);
    else value.forEach((item, i) => departures(item, shape[0], `${at}[${i}]`, out));
  } else if (Array.isArray(shape.oneOf)) {
    if (!shape.oneOf.some((option) => departures(value, option, at).length === 0)) out.push(`${at}: matches none of ${JSON.stringify(shape.oneOf)}`);
  } else if (typeof value !== "object" || value === null || Array.isArray(value)) {
    out.push(`${at}: expected an object`);
  } else {
    for (const [field, inner] of Object.entries(shape)) {
      if (!(field in value)) out.push(`${at}.${field}: missing`);
      else departures((value as Record<string, unknown>)[field], inner, `${at}.${field}`, out);
    }
  }
  return out;
}

const expectShape = (value: unknown, docString: string, label: string) =>
  expect(departures(value, JSON.parse(docString) as Shape), label).toEqual([]);

/** Status 200, a JSON content type, and a Cache-Control a CDN may cache by (s-maxage, neither private nor no-store). */
function servedProblems(url: string, status: number, headers: Record<string, string>): string[] {
  const problems: string[] = [];
  const cache = headers["cache-control"] ?? "";
  if (status !== 200) problems.push(`${url}: status ${status}`);
  if (!/application\/json/.test(headers["content-type"] ?? "")) problems.push(`${url}: content type ${headers["content-type"]}`);
  if (!/s-maxage=\d+/.test(cache) || /private|no-store/.test(cache)) problems.push(`${url}: Cache-Control ${cache}`);
  return problems;
}

async function fetchFile(res: APIResponse, url: string): Promise<FetchedFile> {
  return { url, status: res.status(), headers: res.headers(), body: await res.text() };
}

const sha256 = (body: string) => createHash("sha256").update(body).digest("hex");

interface FetchedManifest {
  surahs: { number: number; url: string; hash: string }[];
  minAppVersion: string;
}
const readManifest = (body: string | undefined) => {
  expect(body, "no manifest fetched").toBeDefined();
  return JSON.parse(body!) as FetchedManifest;
};

When("a client fetches {string}", async ({ request, reading }, url: string) => {
  reading.file = await fetchFile(await request.get(url), url);
});

Then("it answers with status 200, a JSON content type and a CDN-cacheable response", async ({ reading }) => {
  const { url, status, headers } = reading.file!;
  expect(servedProblems(url, status, headers)).toEqual([]);
});

Then("the file has this shape:", async ({ reading }, docString: string) => {
  expectShape(JSON.parse(reading.file!.body), docString, reading.file!.url);
});

Then("the file is data\\/generated\\/surahs.json as last committed, which lists {int} Surahs", async ({ reading }, count: number) => {
  const index = JSON.parse(reading.file!.body) as unknown[];
  expect(index).toEqual(committedSurahIndex());
  expect(index).toHaveLength(count);
});

Then("the file is data\\/generated\\/roots\\/{int}.json as last committed", async ({ reading }, id: number) => {
  expect(JSON.parse(reading.file!.body)).toEqual(committedRoot(id));
});

Then("the manifest lists Surahs 1 to {int} in order, each at {string}", async ({ reading }, last: number, template: string) => {
  const { surahs } = readManifest(reading.file?.body);
  expect(surahs.map((s) => s.number)).toEqual(Array.from({ length: last }, (_, i) => i + 1));
  for (const s of surahs) expect(s.url).toBe(template.replace("<n>", String(s.number)));
});

Then("the manifest's minimum app version is {string}", async ({ reading }, version: string) => {
  expect(readManifest(reading.file?.body).minAppVersion).toBe(version);
});

/** The Surah files the fetched manifest lists, fetched once per scenario by the first step that needs them. */
async function fetchSurahFiles(request: { get(url: string): Promise<APIResponse> }, reading: Reading): Promise<FetchedFile[]> {
  if (!reading.surahFiles) {
    const files: FetchedFile[] = [];
    for (const { url } of readManifest(reading.file?.body).surahs) files.push(await fetchFile(await request.get(url), url));
    reading.surahFiles = files;
  }
  return reading.surahFiles;
}

Then(
  "every Surah file in the manifest answers with status 200, a JSON content type and a CDN-cacheable response",
  async ({ request, reading }) => {
    const files = await fetchSurahFiles(request, reading);
    expect(files).toHaveLength(114);
    expect(files.flatMap((f) => servedProblems(f.url, f.status, f.headers))).toEqual([]);
  },
);

Then("the SHA-256 of each Surah file's bytes is its hash in the manifest", async ({ request, reading }) => {
  const { surahs } = readManifest(reading.file?.body);
  const files = await fetchSurahFiles(request, reading);
  expect(files.map((f) => `${f.url} ${sha256(f.body)}`)).toEqual(surahs.map((s) => `${s.url} ${s.hash}`));
});

// Since #170 the generated Surah files hold no Themes (each Ayah's `themes` is
// an empty list, ADR 0041), and since #171 no Passages, Phrases or Phrase
// colours: /data/v1 puts in each Ayah's Themes and the Surah's Passages and
// Phrases from Neon, which their loads filled from the files as last committed
// (../committed-output.ts) and the run's global setup arranged in Surah 18
// (../passages-in-the-test-database.ts).
Then(
  "each Surah file is its file in data\\/generated\\/surahs\\/ as last committed, each Ayah's Themes those Neon holds",
  async ({ request, reading }) => {
    const files = await fetchSurahFiles(request, reading);
    files.forEach((f, i) => {
      const themes = committedSurah(i + 1).ayahs.map((a) => a.themes);
      expect(JSON.parse(f.body), f.url).toEqual(arrangedSurah(i + 1, themes));
    });
  },
);

Then("every Surah file has this shape:", async ({ request, reading }, docString: string) => {
  for (const f of await fetchSurahFiles(request, reading)) expectShape(JSON.parse(f.body), docString, f.url);
});
