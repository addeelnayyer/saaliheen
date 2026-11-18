// Steps for the Supplications page (#199, #195). The expected Supplications and
// Speakers come from the curated file (../supplications-data.ts), which
// db:migrate loaded into the run's own Postgres before the build; Arabic and
// Ayah translations from the sources; the page's name from the feature (the
// issue's words). Things are found by role, link address and visible text.
//
// The page's shape these steps expect (PROPOSED, #199 stage 1, following the
// Iltifat direction pages):
// - /{lang}/supplications: an <h1> "Supplications"; each Supplication an
//   <article> in <main>, in Quran order, its heading (<h2>) naming its Surah
//   and run and holding one link to its first Ayah in its Surah,
//   /{lang}/{s}#{s}:{from}; the Speaker's name in the reader's Language; each
//   Ayah's Arabic in an element of lang "ar", and its Ayah translation when on.
// - Explore's card to it is named "Supplications", counts the Supplications
//   and is not prefetched (#199, user decisions once #193 made the home page
//   the Surah index and #207 made Explore read Neon); the site bar marks
//   Explore on it, and its content leads back to Explore.

import fs from "node:fs";
import path from "node:path";
import { expect, type Page } from "@playwright/test";
import { ayahTranslation, LANGUAGES, nextFrames, urduDigits, type Language } from "../support";
import { exploreCard } from "./explore-and-me.steps";
import { Then, When } from "./fixtures";
import type { Script } from "./reader";
import { arabicPattern } from "./share-page.steps";
import { ayahsOf, choicesIn, curated, curatedEntriesFor, curatedSupplicationsOnly, runOf, type CuratedSupplication } from "../supplications-data";

const APP = path.join(__dirname, "..", "..", "..");
const pageAddress = (lang: Language) => `/${lang}/supplications`;
const OTHER_SCRIPT: Record<Script, Script> = { uthmani: "indopak", indopak: "uthmani" };
const squash = (s: string) => s.replace(/\s+/g, " ").trim();
const digits = (n: number) => `(?:${n}|${urduDigits(n)})`;
/** A run as a heading may write it, in Western or Urdu digits, with an en dash or a hyphen. */
const runPattern = (s: { surah: number; ayahFrom: number; ayahTo: number }) =>
  new RegExp(
    s.ayahFrom === s.ayahTo
      ? `${digits(s.surah)}:${digits(s.ayahFrom)}(?!\\d)`
      : `${digits(s.surah)}:${digits(s.ayahFrom)}\\s*[–-]\\s*${digits(s.ayahTo)}(?!\\d)`,
  );
/** The address of a Supplication's first Ayah in its Surah. */
const ayahAddress = (lang: Language, s: { surah: number; ayahFrom: number }) => `/${lang}/${s.surah}#${s.surah}:${s.ayahFrom}`;
const speakerName = (s: CuratedSupplication, lang: Language) => {
  const speaker = curated().speakers.find((p) => p.id === s.speakerId);
  if (!speaker) throw new Error(`the curated file has no Speaker "${s.speakerId}"`);
  return lang === "ur" ? speaker.nameUr : speaker.nameEn;
};

/** One entry on the page as a reader meets it. */
export interface ShownEntry {
  /** Its heading's text. */
  heading: string;
  /** The addresses its heading links to. */
  links: string[];
  /** Its text as drawn (innerText), and all its text, drawn or not (textContent). */
  shown: string;
  all: string;
}

/** Every entry on the Supplications page on screen, in order. */
export async function shownEntries(page: Page): Promise<ShownEntry[]> {
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  return page.locator("main article").evaluateAll((articles) =>
    articles.map((a) => {
      const heading = a.querySelector("h2, h3");
      return {
        heading: (heading as HTMLElement | null)?.innerText ?? "",
        links: [...(heading?.querySelectorAll("a") ?? [])].map((l) => l.getAttribute("href") ?? ""),
        shown: (a as HTMLElement).innerText,
        all: a.textContent ?? "",
      };
    }),
  );
}

/**
 * The curated file's entries for the choices in the page's link (#200; its
 * Supplications only, with none), paired with the entries on the page, which
 * must be one each, in order.
 */
async function pairedEntries(page: Page, lang: Language): Promise<{ s: CuratedSupplication; e: ShownEntry }[]> {
  const expected = curatedEntriesFor(choicesIn(new URL(page.url()).searchParams));
  const shown = await shownEntries(page);
  expect(shown.map((e) => e.links[0] ?? e.heading), "the entries on the page, by their heading's link").toEqual(expected.map((s) => ayahAddress(lang, s)));
  return expected.map((s, n) => ({ s, e: shown[n] }));
}

// ---------------------------------------------------------------- AC-15: from Explore, not prefetched

Then("Explore's {string} card links to the Supplications page in {language}", async ({ reader }, name: string, lang: Language) => {
  const card = exploreCard(reader.page, name);
  await expect(card, `Explore's "${name}" card`).toHaveCount(1);
  await expect(card).toBeVisible();
  await expect(card).toHaveAttribute("href", pageAddress(lang));
});

Then(
  "the {string} card counts {int} Supplications, as the API serves them and the Supplications page shows them",
  async ({ reader }, name: string, n: number) => {
    const page = reader.page;
    expect(curatedSupplicationsOnly().length, "the curated file's Supplications").toBe(n);
    const answer = await page.request.get(new URL("/api/v1/supplications", reader.baseURL).toString());
    expect(answer.ok(), "GET /api/v1/supplications").toBe(true);
    const { supplications } = (await answer.json()) as { supplications: { kind: string }[] };
    expect(supplications.filter((s) => s.kind === "supplication").length, "the Supplications /api/v1/supplications serves").toBe(n);
    const listing = await (await page.request.get(new URL(pageAddress(reader.language), reader.baseURL).toString())).text();
    expect(listing.match(/<article\b/g)?.length ?? 0, "the entries the Supplications page shows").toBe(n);
    expect(listing, "the Supplications page's own count").toContain(`${n} Supplications`);
    await expect(exploreCard(page, name), `the "${name}" card's count`).toContainText(new RegExp(`(^|[^\\d۰-۹])${digits(n)} Supplications`, "u"));
  },
);

Then(
  "once Explore has settled, it has prefetched its {string} card but not its {string} card",
  async ({ reader }, prefetched: string, notPrefetched: string) => {
    const page = reader.page;
    const [settles, stays] = [exploreCard(page, prefetched), exploreCard(page, notPrefetched)];
    await stays.scrollIntoViewIfNeeded();
    const [settlesAt, staysAt] = [await settles.getAttribute("href"), await stays.getAttribute("href")];
    // What the browser fetched for the page's links: a prefetch asks for the linked address with `?_rsc=`.
    const fetchedFor = (address: string | null) =>
      page.evaluate((a) => performance.getEntriesByType("resource").filter((e) => new URL(e.name).pathname === a).length, address);
    // The first card is prefetched as it comes into view: once it has been, the page has settled.
    await expect.poll(() => fetchedFor(settlesAt), { message: `the prefetch of ${settlesAt}` }).toBeGreaterThan(0);
    await page.waitForLoadState("networkidle");
    expect(await fetchedFor(staysAt), `requests for ${staysAt} before it was followed`).toBe(0);
  },
);

Then("I am on the Supplications page in {language}", async ({ reader }, lang: Language) => {
  await expect.poll(() => new URL(reader.page.url()).pathname).toBe(pageAddress(lang));
  await expect(reader.page.getByRole("heading", { level: 1 })).toHaveText("Supplications");
});

// ---------------------------------------------------------------- AC-12: the listing

Then("the Supplications page's heading is {string}", async ({ reader }, title: string) => {
  await expect(reader.page.getByRole("heading", { level: 1 })).toHaveText(title);
});

Then(
  "the page lists every Supplication of the curated file in Quran order, each in an entry of its own headed by its Surah and run",
  async ({ reader }) => {
    const paired = await pairedEntries(reader.page, reader.language);
    const wrong = paired.filter(({ s, e }) => !runPattern(s).test(squash(e.heading))).map(({ s, e }) => `${runOf(s)}: "${squash(e.heading)}"`);
    expect(wrong, "entries whose heading does not name their run").toEqual([]);
  },
);

Then("the page lists none of the curated file's Other words to Allah", async ({ reader }) => {
  const lang = reader.language;
  const others = curated().supplications.filter((s) => s.kind !== "supplication");
  expect(others.length, "Other words to Allah in the curated file").toBeGreaterThan(0);
  const addresses = new Set((await shownEntries(reader.page)).flatMap((e) => e.links));
  expect(others.filter((s) => addresses.has(ayahAddress(lang, s))).map(runOf), "Other words to Allah on the page").toEqual([]);
});

Then(/^each entry on the Supplications page names its Speaker in (Urdu|English)$/, async ({ reader }, lang: Language) => {
  const other: Language = lang === "ur" ? "en" : "ur";
  const wrong = (await pairedEntries(reader.page, lang))
    .filter(({ s, e }) => {
      const text = squash(e.shown);
      const mine = squash(speakerName(s, lang));
      const theirs = squash(speakerName(s, other));
      return !text.includes(mine) || (theirs !== mine && text.includes(theirs));
    })
    .map(({ s }) => `${runOf(s)}: ${speakerName(s, lang)}`);
  expect(wrong, `entries not naming their Speaker in ${lang}, or naming them in the other Language too`).toEqual([]);
});

Then("each entry on the Supplications page shows the Arabic of every Ayah of its run, in order, in Uthmani", async ({ reader }) => {
  const wrong = (await pairedEntries(reader.page, reader.language))
    .map(({ s, e }) => ({ run: runOf(s), places: ayahsOf(s).map((a) => e.shown.search(new RegExp(arabicPattern(a, "uthmani"), "u"))) }))
    .filter(({ places }) => places.some((p) => p < 0) || places.some((p, n) => n > 0 && p < places[n - 1]));
  expect(wrong, "entries missing an Ayah's Arabic, or showing them out of order").toEqual([]);
});

Then(/^each entry on the Supplications page links to its first Ayah in its Surah, in (Urdu|English)$/, async ({ reader }, lang: Language) => {
  const wrong = (await pairedEntries(reader.page, lang)).filter(({ s, e }) => e.links.length !== 1 || e.links[0] !== ayahAddress(lang, s)).map(({ s, e }) => `${runOf(s)}: ${e.links.join(", ")}`);
  expect(wrong, "entries whose heading does not hold one link to their first Ayah").toEqual([]);
});

When("I follow the link of the Supplication at {ayahs}", async ({ reader }, run: { surah: number; from: number; to: number }) => {
  const link = reader.page.locator(`main article :is(h2, h3) a[href="${ayahAddress(reader.language, { surah: run.surah, ayahFrom: run.from })}"]`);
  await expect(link, `the link of the Supplication at ${run.surah}:${run.from}–${run.to}`).toHaveCount(1);
  await link.click();
});

// ---------------------------------------------------------------- AC-13: the reader's Script and Language

Then("each Ayah on the Supplications page shows its Arabic in {script}, and not in the other Script", async ({ reader }, script: Script) => {
  const wrong = (await pairedEntries(reader.page, reader.language)).flatMap(({ s, e }) =>
    ayahsOf(s)
      .filter((a) => !new RegExp(arabicPattern(a, script), "u").test(e.shown) || new RegExp(arabicPattern(a, OTHER_SCRIPT[script]), "u").test(e.all))
      .map((a) => `${a}`),
  );
  expect(wrong, `Ayahs not shown in ${script}, or also in ${OTHER_SCRIPT[script]}`).toEqual([]);
});

Then(/^each Ayah on the Supplications page shows its Ayah translation in (Urdu|English): (on|off)$/, async ({ reader }, lang: Language, state: string) => {
  const wrong = (await pairedEntries(reader.page, lang)).flatMap(({ s, e }) =>
    ayahsOf(s)
      .filter((a) => {
        const t = squash(ayahTranslation(a, lang));
        return state === "on" ? !squash(e.shown).includes(t) : squash(e.all).includes(t);
      })
      .map((a) => `${a}`),
  );
  expect(wrong, `Ayahs whose ${lang} Ayah translation is ${state === "on" ? "not shown" : "shown"}`).toEqual([]);
});

// ---------------------------------------------------------------- AC-14: on request, never prerendered

Then(
  "the Supplications page in Urdu and in English is rendered on request, not served from the build's prerendered pages",
  async ({ reader }) => {
    for (const lang of LANGUAGES) {
      const address = pageAddress(lang);
      const res = await reader.page.request.get(address, { maxRedirects: 0 });
      expect(res.status(), address).toBe(200);
      expect(res.headers()["x-nextjs-prerender"], `${address} is not a prerendered page`).toBeUndefined();
    }
  },
);

Then("the build's prerendered pages hold no Supplications page", () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(APP, ".next/prerender-manifest.json"), "utf8")) as { routes: Record<string, unknown> };
  const prerendered = Object.keys(manifest.routes);
  expect(prerendered.length, "pages the build prerendered").toBeGreaterThan(0);
  expect(prerendered.filter((r) => /\/supplications(\/|$)/.test(r)), "Supplications pages the build prerendered").toEqual([]);
});

// ---------------------------------------------------------------- AC-16: Reading places

When("I scroll to the bottom of the Supplications page", async ({ reader }) => {
  await reader.page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await nextFrames(reader.page);
});
