// Link preview for each Share page (#57), as a link-preview app gets it: the
// Share page's HTML fetched with the app's user agent and no scripts run, its
// Open Graph and Twitter card tags read from <head>, and the picture they
// point to requested from this server at the same path. What the picture
// shows in words is read from its alt text; its look is measured from its
// pixels where a user could tell (a dark band around a light sheet) and left
// to the saved pictures otherwise. Surah names, Passage titles, Ayah
// translations and Arabic are read from the committed sources, never typed.

import fs from "node:fs";
import path from "node:path";
import { expect, type APIRequestContext } from "@playwright/test";
import { defineParameterType, type DataTable } from "playwright-bdd";
import { ayahTranslation, sourceSurahs, type Language } from "../support";
import { Then, When, parseSharedAyahs, type Reading, type SharedAyahs, type ShareLayout } from "./fixtures";
import { passagesOf, filePassages, titleOf } from "./passages";
import { ayahText, type Script } from "./reader";
import { shareAddress, type Address } from "./share-page.steps";

// ---------------------------------------------------------------- the apps

/** The user agent each app sends when it fetches a pasted link for its Link preview. */
const USER_AGENTS = {
  WhatsApp: "WhatsApp/2.23.20.0 A",
  X: "Twitterbot/1.0",
} as const;
export type App = keyof typeof USER_AGENTS;

defineParameterType({
  name: "app",
  regexp: /WhatsApp|X/,
  transformer: (s: string): App => s as App,
});

// ---------------------------------------------------------------- the Share page as written in a step

/** "18:83–88 in English and Uthmani" or "112:1–4 in Urdu and Indo-Pak, Flowing", as an address. */
function parseShared(text: string): Address {
  const m = text.trim().match(/^(\S+) in (Urdu|English) and (Uthmani|Indo-Pak)(?:, (Ayah by Ayah|Flowing))?$/);
  if (!m) throw new Error(`"${text}" names no Share page`);
  const [, ayahs, language, script, layout] = m;
  const shared = parseSharedAyahs(ayahs);
  return {
    ...shared,
    lang: language === "Urdu" ? "ur" : "en",
    script: script === "Uthmani" ? "uthmani" : "indopak",
    layout: layout === "Flowing" ? ("flowing" satisfies ShareLayout) : undefined,
  };
}

defineParameterType({
  name: "sharePage",
  regexp: /\d+:\d+(?:[–-]\d+)? in (?:Urdu|English) and (?:Uthmani|Indo-Pak)(?:, (?:Ayah by Ayah|Flowing))?/,
  transformer: parseShared,
});

// ---------------------------------------------------------------- fetching as an app

/** Every <meta> in <head>, keyed by its property or name, each with its content(s), entities decoded. */
type Tags = Map<string, string[]>;

const decode = (s: string) =>
  s
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&amp;/g, "&");

/** A <meta>'s key (its property or name) and content, from its attributes; none when it lacks either. */
function metaOf(attrs: string): [string, string] | undefined {
  const a = Object.fromEntries([...attrs.matchAll(/([\w:-]+)="([^"]*)"/g)].map(([, k, v]) => [k, decode(v)]));
  const key = a.property ?? a.name;
  return key && a.content !== undefined ? [key, a.content] : undefined;
}

function headTags(html: string): Tags {
  const end = html.indexOf("</head>");
  const head = end < 0 ? "" : html.slice(0, end);
  const tags: Tags = new Map();
  for (const [, attrs] of head.matchAll(/<meta\s([^>]*?)\/?>/g)) {
    const meta = metaOf(attrs);
    if (meta) tags.set(meta[0], [...(tags.get(meta[0]) ?? []), meta[1]]);
  }
  return tags;
}

/** One page as an app fetched it: a Share page, with its address, or another page (a Theme page, #132). */
export interface Fetched {
  address?: Address;
  path: string;
  tags: Tags;
  /** The picture last requested from this server, once a step did. */
  picture?: { og: Buffer; twitter: Buffer; ogType: string; twitterType: string };
}

/** Every page the scenario fetched, last one last. */
const fetchedIn = new WeakMap<Reading, Fetched[]>();

/** The page the scenario fetched last. */
export const lastPage = (reading: Reading) => {
  const f = fetchedIn.get(reading)?.at(-1);
  if (!f) throw new Error("no page fetched yet in this scenario");
  return f;
};

/** The Share page the scenario fetched last. */
const last = (reading: Reading) => {
  const f = lastPage(reading);
  if (!f.address) throw new Error(`${f.path} is not a Share page`);
  return f as Fetched & { address: Address };
};

/** Page `p` fetched as `app` fetches a pasted link, its head's tags kept for the scenario. */
export async function fetchPage(request: APIRequestContext, reading: Reading, app: App, p: string, address?: Address) {
  const res = await request.get(p, { headers: { "user-agent": USER_AGENTS[app] } });
  expect(res.status(), `${app} fetching ${p}`).toBe(200);
  const fetched: Fetched = { address, path: p, tags: headTags(await res.text()) };
  fetchedIn.set(reading, [...(fetchedIn.get(reading) ?? []), fetched]);
  return fetched;
}

const fetchAs = (request: APIRequestContext, reading: Reading, app: App, address: Address) =>
  fetchPage(request, reading, app, shareAddress(address), address);

When("{app} fetches the Share page of {sharePage}", async ({ reader, reading }, app: App, address: Address) => {
  await fetchAs(reader.page.request, reading, app, address);
});

When("{app} fetches the Share pages of:", async ({ reader, reading }, app: App, table: DataTable) => {
  for (const [row] of table.raw()) await fetchAs(reader.page.request, reading, app, parseShared(row));
});

// ---------------------------------------------------------------- reading the tags

/** The one content of tag `key`; fails naming the tag when it is missing or repeated. */
export function tag(f: Fetched, key: string): string {
  const values = f.tags.get(key) ?? [];
  expect(values, `<meta ${key}> in the head of ${f.path}`).toHaveLength(1);
  return values[0];
}

/** The Shared Ayahs as the headpiece writes them: `18:83–88`, or `2:255`. */
const range = ({ surah, from, to }: SharedAyahs) => (from === to ? `${surah}:${from}` : `${surah}:${from}–${to}`);
const englishName = (surah: number) => sourceSurahs()[surah - 1].nameLatin;

Then("the page's head carries Open Graph and Twitter card tags for a Link preview with a large picture", async ({ reading }) => {
  const f = lastPage(reading);
  for (const key of ["og:title", "og:description", "og:url", "og:image", "twitter:title", "twitter:description", "twitter:image"]) tag(f, key);
  expect(tag(f, "twitter:card"), `twitter:card of ${f.path}`).toBe("summary_large_image");
});

Then("the Link preview's title, in both, names the Surah's English name and the Ayah range", async ({ reading }) => {
  const f = last(reading);
  for (const key of ["og:title", "twitter:title"]) {
    const title = tag(f, key);
    expect(title, `${key} of ${f.path}`).toContain(englishName(f.address.surah));
    expect(title, `${key} of ${f.path}`).toContain(range(f.address));
  }
});

Then("the Link preview has a description, in both", async ({ reading }) => {
  const f = lastPage(reading);
  for (const key of ["og:description", "twitter:description"]) expect(tag(f, key).trim(), `${key} of ${f.path}`).not.toBe("");
});

Then("the Link preview's page address is this Share page's address on {string}", async ({ reading }, site: string) => {
  const f = last(reading);
  expect(tag(f, "og:url"), `og:url of ${f.path}`).toBe(`${site}${f.path}`);
});

/** Whether the digits of `address` (path and query) hold the Surah, then the from Ayah, then the to Ayah. */
function namesShared(address: string, { surah, from, to }: SharedAyahs): boolean {
  const u = new URL(address);
  const numbers = `${u.pathname}${u.search}`.split(/\D+/).filter(Boolean).map(Number);
  const wanted = from === to ? [surah, from] : [surah, from, to];
  let i = 0;
  for (const n of numbers) if (n === wanted[i]) i++;
  return i === wanted.length;
}

Then("the Link preview's picture address, in both, is on {string} and names these Shared Ayahs", async ({ reading }, site: string) => {
  const f = last(reading);
  for (const key of ["og:image", "twitter:image"]) {
    const address = tag(f, key);
    expect(address.startsWith(`${site}/`), `${key} of ${f.path} (${address}) is on ${site}`).toBe(true);
    expect(namesShared(address, f.address), `${key} of ${f.path} (${address}) names ${range(f.address)}`).toBe(true);
  }
});

/** The page's Open Graph and Twitter card tags, each value as its own `[key, content]`. */
export const previewTags = (f: Fetched) =>
  [...f.tags]
    .filter(([key]) => key.startsWith("og:") || key.startsWith("twitter:"))
    .flatMap(([key, values]) => values.map((v) => [key, v] as const));

Then("no Link preview tag points anywhere but {string}", async ({ reading }, site: string) => {
  const f = lastPage(reading);
  const elsewhere = previewTags(f).filter(([, v]) => /^[a-z]+:\/\//i.test(v) && !v.startsWith(`${site}/`) && v !== site);
  expect(elsewhere, `Link preview tags of ${f.path} pointing elsewhere`).toEqual([]);
});

Then("each Share/Theme/Iltifat page's Link preview picture address differs from every other's", async ({ reading }) => {
  const all = fetchedIn.get(reading) ?? [];
  for (const key of ["og:image", "twitter:image"]) {
    const seen = new Map<string, string>();
    for (const f of all) {
      const address = tag(f, key);
      expect(seen.get(address), `${key} of ${f.path} is also that of`).toBeUndefined();
      seen.set(address, f.path);
    }
  }
});

// ---------------------------------------------------------------- the picture

/** The picture at `address`, requested from this server at the same path and query. */
async function requestPicture(request: APIRequestContext, address: string) {
  const u = new URL(address);
  const res = await request.get(`${u.pathname}${u.search}`);
  expect(res.status(), `requesting ${u.pathname}${u.search} from this server`).toBe(200);
  return { body: await res.body(), type: res.headers()["content-type"] ?? "" };
}

When("I request its Link preview picture address from this server", async ({ reader, reading }) => {
  const f = lastPage(reading);
  const og = await requestPicture(reader.page.request, tag(f, "og:image"));
  const twitter = await requestPicture(reader.page.request, tag(f, "twitter:image"));
  f.picture = { og: og.body, ogType: og.type, twitter: twitter.body, twitterType: twitter.type };
});

const picture = (reading: Reading) => {
  const p = lastPage(reading).picture;
  if (!p) throw new Error("no Link preview picture requested yet in this scenario");
  return p;
};

/** A PNG's width and height from its IHDR chunk, or undefined when it is not a PNG. */
function pngSize(body: Buffer) {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (body.length < 24 || !body.subarray(0, 8).equals(signature) || body.toString("ascii", 12, 16) !== "IHDR") return undefined;
  return { width: body.readUInt32BE(16), height: body.readUInt32BE(20) };
}

Then("both its Open Graph and its Twitter card picture address answer with a PNG picture 1200×630", async ({ reading }) => {
  const p = picture(reading);
  for (const [what, body, type] of [
    ["Open Graph", p.og, p.ogType],
    ["Twitter card", p.twitter, p.twitterType],
  ] as const) {
    expect(type, `the ${what} picture's content type`).toMatch(/^image\/png\b/);
    expect(pngSize(body), `the ${what} picture is a PNG 1200×630`).toEqual({ width: 1200, height: 630 });
  }
});

Then("the picture has frame B's light look: a dark band along each edge around a light paper sheet", async ({ reader, reading }) => {
  const page = await reader.newContext().then((c) => c.newPage());
  const seen = await page.evaluate(async (src) => {
    const img = new Image();
    img.src = src;
    await img.decode();
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(img, 0, 0);
    const { width: w, height: h } = canvas;
    const data = ctx.getImageData(0, 0, w, h).data;
    const lum = (x: number, y: number) => {
      const i = (y * w + x) * 4;
      return (0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]) / 255;
    };
    // Along each side's midline, how many pixels within its outer 12% are dark (the band, between its gold stars).
    const dark = (points: [number, number][]) => points.filter(([x, y]) => lum(x, y) < 0.3).length;
    const strip = (n: number) => Array.from({ length: Math.round(n * 0.12) }, (_, k) => k);
    const sides = {
      left: dark(strip(w).map((k) => [k, h >> 1])),
      right: dark(strip(w).map((k) => [w - 1 - k, h >> 1])),
      top: dark(strip(h).map((k) => [w >> 1, k])),
      bottom: dark(strip(h).map((k) => [w >> 1, h - 1 - k])),
    };
    // The middle 40% × 40%: mostly paper, so its median brightness is the paper's.
    const middle: number[] = [];
    for (let y = Math.round(h * 0.3); y < h * 0.7; y += 2) for (let x = Math.round(w * 0.3); x < w * 0.7; x += 2) middle.push(lum(x, y));
    middle.sort((a, b) => a - b);
    return { sides, paper: middle[middle.length >> 1] };
  }, `data:image/png;base64,${picture(reading).og.toString("base64")}`);
  for (const [side, count] of Object.entries(seen.sides)) expect(count, `dark band pixels along the ${side} edge`).toBeGreaterThanOrEqual(8);
  expect(seen.paper, "the median brightness of the picture's middle (the paper sheet)").toBeGreaterThan(0.7);
});

Then("I save the Link preview picture as {string}", async ({ reading }, name: string) => {
  const dir = process.env.SCREENS_DIR;
  if (!dir) return;
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `${name}.png`), picture(reading).og);
});

// ---------------------------------------------------------------- what the picture says: its alt text

/** The picture's alt text, in both tags; fails when they are missing or differ. */
export function alt(f: Fetched): string {
  const og = tag(f, "og:image:alt");
  expect(tag(f, "twitter:image:alt"), `twitter:image:alt of ${f.path} says what og:image:alt says`).toBe(og);
  return og;
}

/** Text compared word by word, ignoring case, punctuation and spacing. */
const words = (s: string) => s.toLowerCase().normalize("NFC").split(/[^\p{L}\p{N}']+/u).filter(Boolean);
const holds = (text: string, part: string) => ` ${words(text).join(" ")} `.includes(` ${words(part).join(" ")} `);

Then("the Link preview picture's alt text names the Surah's English name and the Ayah range", async ({ reading }) => {
  const f = last(reading);
  const text = alt(f);
  expect(text, `the picture's alt text for ${f.path}`).toContain(englishName(f.address.surah));
  expect(text, `the picture's alt text for ${f.path}`).toContain(range(f.address));
});

Then("the Link preview picture's alt text holds the start of the first Shared Ayah's English Ayah translation", async ({ reading }) => {
  const f = last(reading);
  const start = words(ayahTranslation(`${f.address.surah}:${f.address.from}`, "en")).slice(0, 4).join(" ");
  expect(holds(alt(f), start), `the picture's alt text for ${f.path} holds "${start}"`).toBe(true);
});

Then("the Link preview picture's alt text names the English Passage title of {ayahs}", async ({ reading }, shared: SharedAyahs) => {
  const f = last(reading);
  const passage = filePassages().find((p) => p.surah_no === shared.surah && p.ayah_from === shared.from && p.ayah_till === shared.to);
  if (!passage) throw new Error(`${range(shared)} is not a Passage in the Passages file`);
  expect(alt(f), `the picture's alt text for ${f.path}`).toContain(titleOf(passage, "en"));
});

Then("the Link preview picture's alt text names no Passage title of Surah {int}", async ({ reading }, surah: number) => {
  const f = last(reading);
  const text = alt(f);
  for (const p of passagesOf(surah))
    for (const lang of ["en", "ur"] satisfies Language[]) expect(text, `the picture's alt text for ${f.path}`).not.toContain(titleOf(p, lang));
});

const ARABIC_SCRIPT = /[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]/u;

Then(
  "the Link preview picture's alt text holds none of the Shared Ayahs' Arabic in either Script, nor the Surah's Arabic name",
  async ({ reading }) => {
    const f = last(reading);
    const text = alt(f);
    const { surah, from, to } = f.address;
    for (let a = from; a <= to; a++)
      for (const script of ["uthmani", "indopak"] satisfies Script[])
        for (const word of ayahText(`${surah}:${a}`, script).split(" "))
          expect(text, `the picture's alt text for ${f.path} holds a Word of ${surah}:${a} in ${script}`).not.toContain(word);
    expect(text, `the picture's alt text for ${f.path}`).not.toContain(sourceSurahs()[surah - 1].nameArabic);
  },
);

const noArabicScript = async ({ reading }: { reading: Reading }) => {
  const f = lastPage(reading);
  const text = alt(f);
  expect(text.match(ARABIC_SCRIPT)?.[0], `an Arabic-script letter in the picture's alt text for ${f.path}: "${text}"`).toBeUndefined();
};
Then("the Link preview picture's alt text holds no Arabic-script letter at all", noArabicScript);
Then("the Link preview picture's alt text holds no Arabic-script letter at all, so not the Urdu Ayah translation", async ({ reading }) => {
  await noArabicScript({ reading });
  const f = last(reading);
  const { surah, from } = f.address;
  expect(alt(f), `the picture's alt text for ${f.path}`).not.toContain(ayahTranslation(`${surah}:${from}`, "ur").split(" ").slice(0, 3).join(" "));
});
