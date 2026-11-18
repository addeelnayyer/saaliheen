// Direction, typefaces, interface strings and colour tokens (#2 AC-11, AC-12).

import { expect, type Locator, type Page } from "@playwright/test";
import {
  LANGUAGES,
  PHONE,
  ayahTranslation,
  card,
  cssFamily,
  fontFileHash,
  sha256,
  shot,
  sourceSurahs,
  sourceWord,
  type Language,
} from "../support";
import { Given, STRINGS, Then, When, expectLangDir, langOf, resolveColor, surahOf } from "./fixtures";

/** The first family in an element's computed font-family, and whether a loaded FontFace has it. */
export const firstFamily = (l: Locator) =>
  l.evaluate(async (el) => {
    await document.fonts.ready;
    const family = getComputedStyle(el).fontFamily.split(",")[0].trim().replace(/^['"]|['"]$/g, "");
    const loaded = Array.from(document.fonts).some(
      (f) => f.family.replace(/^['"]|['"]$/g, "") === family && f.status === "loaded",
    );
    return { family, loaded };
  });

// ---------------------------------------------------------------- direction, typefaces, strings

Given("I note every font the browser downloads", async ({ page, reading }) => {
  page.on("response", async (res) => {
    if (res.request().resourceType() === "font") reading.fonts.push(await res.body().catch(() => Buffer.alloc(0)));
  });
});

Then("the page's lang is {string} and its dir is {string}", async ({ page }, lang: string, dir: string) => {
  await expect(page.locator("html")).toHaveAttribute("lang", lang);
  await expect(page.locator("html")).toHaveAttribute("dir", dir);
});

/** An element's text is set in `typeface` (by the family the page's CSS names it), in a face that has loaded. */
export async function expectLoadedFace(l: Locator, typeface: string) {
  expect(await firstFamily(l)).toEqual({ family: cssFamily(typeface), loaded: true });
}

/** An element is marked with `lang` and its text runs `dir` in the loaded font `family`. */
async function expectLanguageFace(l: Locator, lang: string, dir: string, family: string) {
  await expectLangDir(l, lang, dir);
  await expectLoadedFace(l, family);
}

Then(
  "the Word meaning on the Word card at {location} is marked lang {string}, runs {string} and is set in the loaded font {string}",
  async ({ page, reading }, location: string, lang: string, dir: string, family: string) => {
    const w = sourceWord(location);
    await expectLanguageFace(card(page, w.location).getByText(w.meaning[langOf(reading)], { exact: true }), lang, dir, family);
  },
);

Then(
  "the {language} Ayah translation of {word} is marked lang {string}, runs {string} and is set in the loaded font {string}",
  async ({ page }, language: Language, ayah: string, lang: string, dir: string, family: string) => {
    const text = page.getByText(ayahTranslation(ayah, language), { exact: true });
    await expect(text).toBeVisible();
    await expectLanguageFace(text, lang, dir, family);
  },
);

Then("the next Surah link is set in the loaded font {string}", async ({ page }, family: string) => {
  const next = page.getByRole("link", { name: STRINGS.next }).first();
  await expectLoadedFace(next, family);
});

Then("Read, the next Surah link and the Ayah 1 marker are visible in English", async ({ page }) => {
  await expect(page.getByRole("link", { name: "Read", exact: true }).filter({ visible: true })).toBeVisible();
  await expect(page.getByRole("link", { name: STRINGS.next }).first()).toBeVisible();
  await expect(page.getByText(STRINGS.ayah(1), { exact: true })).toBeVisible();
});

// Interface text is text whose nearest lang is <html>'s "en": the Arabic, the
// Word meanings, the Ayah translations and the Language switch's اردو each
// carry their own lang. Decoration hidden from assistive technology is not text.
Then("no interface text on the page is written in Urdu or Arabic letters", async ({ page }) => {
  const found = await page.locator("body").evaluate((body) => {
    const walker = document.createTreeWalker(body, NodeFilter.SHOW_TEXT);
    const hits: string[] = [];
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const el = node.parentElement!;
      if (el.closest("script, style, [aria-hidden='true']")) continue;
      if (el.closest("[lang]")?.getAttribute("lang") !== "en") continue;
      if (/[\u0600-\u06ff]/.test(node.textContent ?? "")) hits.push(node.textContent!.trim());
    }
    return hits;
  });
  expect(found).toEqual([]);
});

Then("the Uthmani text on the Word card at {location} is set in a loaded font", async ({ page }, location: string) => {
  const w = sourceWord(location);
  const arabic = card(page, w.location).getByText(w.uthmani, { exact: true });
  expect((await firstFamily(arabic)).loaded).toBe(true);
});

Then("the browser downloaded the committed font file {string}", async ({ reading }, file: string) => {
  await expect.poll(() => reading.fonts.map(sha256)).toContain(fontFileHash(file));
});

Then("the browser did not download the committed font file {string}", async ({ page, reading }, file: string) => {
  await page.evaluate(() => document.fonts.ready);
  expect(reading.fonts.map(sha256)).not.toContain(fontFileHash(file));
});

// ---------------------------------------------------------------- the Surah header

const surahHeader = (page: Page) =>
  page.locator("header").filter({ has: page.getByRole("heading", { level: 1 }) });

Then(
  "the Surah header reads the Surah's Latin name, Meccan or Medinan and {string}, as the Surah metadata and the QPC Hafs text say",
  async ({ page, reading }, count: string) => {
    const n = surahOf(reading);
    const s = sourceSurahs()[n - 1];
    expect(count, "the Ayah count in the QPC Hafs text").toBe(STRINGS.ayahCount(s.ayahCount));
    const place = STRINGS[s.revelationPlace];
    // The pill beside the Latin name is its own box, so spaces around "·" are not asserted.
    const text = (await surahHeader(page).innerText()).replace(/\s*·\s*/g, " · ").replace(/\s+/g, " ");
    expect(text).toContain(`${s.nameLatin} · ${place} · ${count}`);
    expect(text, "no Urdu digits").not.toMatch(/[۰-۹]/);
    await shot(surahHeader(page), `AC-2-11-surah-${n}-${langOf(reading)}-header-light-desktop`);
  },
);

Then("the Surah header's main heading is the Surah's Arabic name", async ({ page, reading }) => {
  await expect(surahHeader(page).getByRole("heading", { level: 1 })).toHaveText(sourceSurahs()[surahOf(reading) - 1].nameArabic);
});

// ---------------------------------------------------------------- colour tokens

Given("the system colour scheme is {word}", async ({ page }, scheme: string) => {
  if (scheme !== "light" && scheme !== "dark") throw new Error(`no ${scheme} colour scheme`);
  await page.emulateMedia({ colorScheme: scheme });
});

Then("the page's colour tokens are the design's:", async ({ page, reading }, table) => {
  const rows: { token: string; colour: string }[] = table.hashes();
  expect(rows.length).toBeGreaterThan(0);
  for (const { token, colour } of rows) {
    reading.tokens[token] = colour;
    expect(await resolveColor(page, `var(--${token})`), `--${token}`).toBe(await resolveColor(page, colour));
  }
});

Then(
  "the page has the paper colour behind it and the ink colour for its text",
  async ({ page, reading }) => {
    const body = await page.locator("body").evaluate((el) => {
      const s = getComputedStyle(el);
      return { bg: s.backgroundColor, fg: s.color };
    });
    expect(body).toEqual({
      bg: await resolveColor(page, reading.tokens.paper),
      fg: await resolveColor(page, reading.tokens.ink),
    });
  },
);

Then("the Word card at {location} has the surface colour", async ({ page, reading }, location: string) => {
  // Polled: a card's background eases over .15s when a setting (Phrase colours, #99) changes it.
  const surface = await resolveColor(page, reading.tokens.surface);
  await expect.poll(() => card(page, location).evaluate((el) => getComputedStyle(el).backgroundColor)).toBe(surface);
});

When(
  "Surah {int} in each Language is captured as {string} evidence on a desktop and a phone",
  async ({ page }, surah: number, scheme: string) => {
    for (const lang of LANGUAGES) {
      await page.goto(`/${lang}/${surah}`);
      await shot(page, `AC-12-surah-${surah}-${lang}-${scheme}-desktop`);
      await page.setViewportSize(PHONE);
      await shot(page, `AC-12-surah-${surah}-${lang}-${scheme}-phone`);
      await page.setViewportSize({ width: 1280, height: 720 });
    }
  },
);
