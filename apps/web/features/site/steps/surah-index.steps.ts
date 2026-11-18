// The root redirect, the Surah index with its search and Makki/Madani filter,
// and the credits pages (#3 AC-1 … AC-8). Surah names, Ayah counts and
// Makki/Madani are read from QUL's Surah metadata (../support), never typed.

import fs from "node:fs";
import path from "node:path";
import { expect, type Page } from "@playwright/test";
import { DATA, searchBox, shot, sourceSurahs, urduDigits, type Language, type SourceSurah } from "../support";
import { Given, STRINGS, Then, When, langOf, type Reading } from "./fixtures";
import { indexPanel, rowLinks } from "./index-tabs";

const SURAHS = sourceSurahs();
const byNumber = (n: number) => SURAHS[n - 1];
const numbers = (list: SourceSurah[]) => list.map((s) => s.number);
const ALL = numbers(SURAHS);

/**
 * The index's Surah list's links: every index card in the Surahs tab's list (#193), and not
 * Continue reading above the list nor the Juz rows of the Juz tab.
 */
const listLinks = (page: Page) => rowLinks(indexPanel(page, "Surahs"));

/** The Surah numbers whose index cards a user can see, in page order: links to `/<lang>/<n>`. */
const visibleSurahs = (page: Page, lang: Language) =>
  listLinks(page).evaluateAll(
    (links, lang) =>
      links
        .map((a) => a.getAttribute("href") ?? "")
        .filter((href) => new RegExp(`^/${lang}/\\d+$`).test(href))
        .map((href) => Number(href.split("/")[2])),
    lang,
  );

/** What each visible index card shows: its link, its whole text and its separate text pieces. */
const visibleCards = (page: Page, lang: Language) =>
  listLinks(page).evaluateAll(
    (links, lang) =>
      links
        .filter((a) => new RegExp(`^/${lang}/\\d+$`).test(a.getAttribute("href") ?? ""))
        .map((a) => ({
          surah: Number(a.getAttribute("href")!.split("/")[2]),
          text: (a as HTMLElement).innerText.replace(/\s+/g, " ").trim(),
          pieces: Array.from(a.querySelectorAll("*"))
            .filter((el) => el.children.length === 0)
            .map((el) => (el.textContent ?? "").trim())
            .filter(Boolean),
        })),
    lang,
  );

/** The index cards, after checking they are exactly the 114 Surahs in order. */
async function allCards(page: Page, lang: Language) {
  const cards = await visibleCards(page, lang);
  expect(cards.map((c) => c.surah)).toEqual(ALL);
  return cards;
}

const filter = (page: Page, name: string) => page.getByRole("button", { name, exact: true });
const creditsLink = (page: Page, lang: Language) =>
  page.getByRole("link").and(page.locator(`[href="/${lang}/credits"]`));

async function search(page: Page, reading: Reading, query: string) {
  await searchBox(page).fill(query);
  reading.query = query;
}

function nameIn(script: string, surah: number) {
  if (script === "Latin") return byNumber(surah).nameLatin;
  if (script === "Arabic") return byNumber(surah).nameArabic;
  throw new Error(`no ${script} Surah name`);
}

// QUL's name as an Urdu keyboard types it: Farsi yeh (U+06CC) for yeh and alef
// maksura, heh goruna (U+06C1) for teh marbuta and heh, keheh (U+06A9) for kaf.
const urduKeyboard = (name: string) => name.replace(/[يى]/g, "ی").replace(/[ةه]/g, "ہ").replace(/ك/g, "ک");
const withoutArticle = (name: string) => name.replace(/^ال/, "");

// ---------------------------------------------------------------- opening pages

Given("I open the Surah index in {language}", async ({ page, reading }, lang: Language) => {
  reading.status = (await page.goto(`/${lang}`))?.status();
  reading.lang = lang;
  reading.surah = undefined;
});

Given("I open the credits page in {language}", async ({ page, reading }, lang: Language) => {
  reading.status = (await page.goto(`/${lang}/credits`))?.status();
  reading.lang = lang;
  reading.surah = undefined;
});

Then("the page is found", async ({ reading }) => {
  expect(reading.status).toBe(200);
});

Then("{string} answers with a redirect to {string}", async ({ request }, from: string, to: string) => {
  const res = await request.get(from, { maxRedirects: 0 });
  expect([301, 302, 307, 308], `status ${res.status()}`).toContain(res.status());
  expect(new URL(res.headers()["location"], "http://x").pathname).toBe(to);
});

Then("I am on the Surah index in {language}", async ({ page, reading }, lang: Language) => {
  await expect(page).toHaveURL(`/${lang}`);
  reading.lang = lang;
  reading.surah = undefined;
});

Then("I am on the credits page in {language}", async ({ page, reading }, lang: Language) => {
  await expect(page).toHaveURL(`/${lang}/credits`);
  reading.lang = lang;
});

Then("the page is captured as the evidence screen {string}", async ({ page }, name: string) => {
  await shot(page, name);
});

// ---------------------------------------------------------------- the Surah index

Then(
  "the Surah index in {language} is served with a link to each of the 114 Surah pages in its HTML",
  async ({ request }, lang: Language) => {
    const res = await request.get(`/${lang}`);
    expect(res.status()).toBe(200);
    const html = await res.text();
    for (const n of ALL) expect(html, `/${lang} HTML links to /${lang}/${n}`).toContain(`href="/${lang}/${n}"`);
  },
);

Then("the index cards are all 114 Surahs in order", async ({ page, reading }) => {
  const lang = langOf(reading);
  await expect.poll(() => visibleSurahs(page, lang)).toEqual(ALL);
});

Then(
  "every index card shows its Surah's number, Latin and Arabic names, Ayah count and Meccan or Medinan in English, as the Surah metadata says",
  async ({ page, reading }) => {
    const t = STRINGS;
    for (const c of await allCards(page, langOf(reading))) {
      const s = byNumber(c.surah);
      expect(c.pieces, `Surah ${s.number} card shows its number`).toContain(String(s.number));
      expect(c.pieces, `Surah ${s.number} card shows its Latin name`).toContain(s.nameLatin);
      expect(c.pieces, `Surah ${s.number} card shows its Arabic name`).toContain(s.nameArabic);
      expect(c.text, `Surah ${s.number} card has no Urdu digits`).not.toMatch(/[۰-۹]/);
      expect(c.text, `Surah ${s.number} card shows its Ayah count`).toContain(t.ayahCount(s.ayahCount));
      const [place, other] = s.revelationPlace === "makki" ? [t.makki, t.madani] : [t.madani, t.makki];
      expect(c.text, `Surah ${s.number} card says ${place}`).toContain(place);
      expect(c.text, `Surah ${s.number} card does not say ${other}`).not.toContain(other);
    }
  },
);

Then("every index card shows its Surah's {word} name from the Surah metadata", async ({ page, reading }, script: string) => {
  for (const c of await allCards(page, langOf(reading))) {
    expect(c.text, `Surah ${c.surah}`).toContain(nameIn(script, c.surah));
  }
});

When("I note what every index card shows", async ({ page, reading }) => {
  reading.cardTexts = (await allCards(page, langOf(reading))).map((c) => c.text);
});

Then("every index card shows what the Urdu index card of its Surah showed", async ({ page, reading }) => {
  expect(reading.cardTexts, "the Urdu index cards, noted").toHaveLength(ALL.length);
  expect((await allCards(page, langOf(reading))).map((c) => c.text)).toEqual(reading.cardTexts);
});

// ---------------------------------------------------------------- search

When("I search for {string}", async ({ page, reading }, query: string) => {
  await search(page, reading, query);
});

When("I clear the search", async ({ page, reading }) => {
  await search(page, reading, "");
});

When("I search for Surah {int}'s {word} name", async ({ page, reading }, surah: number, script: string) => {
  await search(page, reading, nameIn(script, surah));
});

When("I search for the last part of Surah {int}'s Latin name, in lower case", async ({ page, reading }, surah: number) => {
  // "kahf" from Al-Kahf.
  await search(page, reading, byNumber(surah).nameLatin.split("-").pop()!.toLowerCase());
});

When("I search for Surah {int}'s Arabic name as an Urdu keyboard types it", async ({ page, reading }, surah: number) => {
  await search(page, reading, urduKeyboard(byNumber(surah).nameArabic));
});

When(
  "I search for Surah {int}'s Arabic name as an Urdu keyboard types it, without its article",
  async ({ page, reading }, surah: number) => {
    await search(page, reading, withoutArticle(urduKeyboard(byNumber(surah).nameArabic)));
  },
);

When(
  "I search for Surah {int}'s Latin name in lower case, with its hyphens {word}",
  async ({ page, reading }, surah: number, hyphens: string) => {
    // "Ya-Sin" as "yasin" (removed) and "ya sin" (spaced).
    if (hyphens !== "removed" && hyphens !== "spaced") throw new Error(`no hyphens ${hyphens}`);
    const name = byNumber(surah).nameLatin.toLowerCase();
    await search(page, reading, name.replace(/-/g, hyphens === "removed" ? "" : " "));
  },
);

When("I search for Surah {int}'s number in Urdu digits", async ({ page, reading }, surah: number) => {
  await search(page, reading, urduDigits(surah));
});

Then(
  "the index shows exactly the Surahs whose {word} name contains the search, among them Surah {int}",
  async ({ page, reading }, script: string, surah: number) => {
    const q = reading.query ?? "";
    const matches = (s: SourceSurah) =>
      script === "Latin" ? s.nameLatin.toLowerCase().includes(q.toLowerCase()) : nameIn(script, s.number).includes(q);
    const expected = numbers(SURAHS.filter(matches));
    expect(expected, `"${q}" matches Surah ${surah}`).toContain(surah);
    await expect.poll(() => visibleSurahs(page, langOf(reading)), { message: `search "${q}"` }).toEqual(expected);
  },
);

Then("the index shows only Surah {int}", async ({ page, reading }, surah: number) => {
  await expect
    .poll(() => visibleSurahs(page, langOf(reading)), { message: `search "${reading.query}"` })
    .toEqual([surah]);
});

Then("the index shows no Surah cards", async ({ page, reading }) => {
  await expect.poll(() => visibleSurahs(page, langOf(reading))).toEqual([]);
});

// ---------------------------------------------------------------- the Makki/Madani filter

When("I choose the {string} filter", async ({ page }, name: string) => {
  await filter(page, name).click();
});

Then("the {string} filter is pressed", async ({ page }, name: string) => {
  await expect(filter(page, name)).toHaveAttribute("aria-pressed", "true");
});

Then("the {string} filter is not pressed", async ({ page }, name: string) => {
  await expect(filter(page, name)).toHaveAttribute("aria-pressed", "false");
});

Then("the index shows exactly the {word} Surahs of the Surah metadata, in order", async ({ page, reading }, place: string) => {
  const revelationPlace = place.toLowerCase();
  if (revelationPlace !== "makki" && revelationPlace !== "madani") throw new Error(`no ${place} Surahs`);
  const expected = numbers(SURAHS.filter((s) => s.revelationPlace === revelationPlace));
  expect(expected.length).toBeGreaterThan(0);
  await expect.poll(() => visibleSurahs(page, langOf(reading))).toEqual(expected);
});

// ---------------------------------------------------------------- index cards open Surah pages

When("I follow the index card of Surah {int}", async ({ page, reading }, surah: number) => {
  // The Surahs tab's card, not a Juz row or a Reading place leading to the same Surah (#193).
  await listLinks(page).and(page.locator(`[href="/${langOf(reading)}/${surah}"]`)).click();
});

Then("the page's main heading is Surah {int}'s Arabic name from the Surah metadata", async ({ page }, surah: number) => {
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(byNumber(surah).nameArabic);
});

// ---------------------------------------------------------------- credits

Then("the page names each of these sources:", async ({ page }, table) => {
  const sources: string[] = table.raw().flat();
  expect(sources.length).toBeGreaterThan(0);
  const text = await page.locator("body").innerText();
  for (const source of sources) expect(text, `credits name ${source}`).toContain(source);
});

Then("the page names {string}", async ({ page }, name: string) => {
  await expect(page.locator("body")).toContainText(name);
});

Then(
  "the page gives the copyright notice the Word grammar source carries: the Corpus's name and version, its copyright and its licence",
  async ({ page }) => {
    // The notice's own lines, as quran-morphology.txt's copyright block at its head writes them (#274).
    const head = Buffer.alloc(4096);
    const fd = fs.openSync(path.join(DATA, "quran-morphology.txt"), "r");
    fs.readSync(fd, head);
    fs.closeSync(fd);
    const notice = head
      .toString("utf8")
      .split("\n")
      .filter((line) => line.startsWith("#"))
      .map((line) => line.replace(/^#\s*/, "").trim())
      .filter((line) => /^(Quranic Arabic Corpus \(|Copyright |License: )/.test(line));
    expect(notice).toHaveLength(3);
    const text = (await page.locator("main").innerText()).replace(/\s+/g, " ");
    for (const line of notice) expect(text, "the credits' copyright notice").toContain(line.replace(/\s+/g, " "));
  },
);

Then("the page links to {string}", async ({ page }, href: string) => {
  await expect(page.locator(`main a[href="${href}"]`)).toBeVisible();
});

Then("a link to the credits page is visible", async ({ page, reading }) => {
  await expect(creditsLink(page, langOf(reading))).toBeVisible();
});

Then("the credits link reads {string}", async ({ page, reading }, label: string) => {
  await expect(creditsLink(page, langOf(reading))).toHaveText(new RegExp(label, "i"));
});

When("I follow the credits link", async ({ page, reading }) => {
  await creditsLink(page, langOf(reading)).click();
});
