// Steps for the Iltifat pages (#138). The expected Iltifat come from the run's
// own Postgres (./iltifat); Arabic and Ayah translations from the sources;
// counts and direction names from the feature (the issue's words). Things are
// found by role, link address and visible text.
//
// The pages' shape these steps expect (PROPOSED, #138 stage 1):
// - The overview, /{lang}/iltifat: an <h1> "Iltifat"; a paragraph explaining
//   Iltifat before the directions; each direction one link to
//   /{lang}/iltifat/{slug}, inside its own list item holding the direction's
//   name, a one-line description and its count; "310 Iltifat · 16 disputed";
//   a sentence naming 36:22; and the source note after the directions.
// - A direction page, /{lang}/iltifat/{slug}: an <h1> naming the direction;
//   each entry an <article> in <main>, its heading (<h2>) holding one link to
//   /{lang}/{s}#{s}:{cited}; each Iltifat in it an element whose id is
//   `iltifat-<id>` (the article itself when it holds one Iltifat) holding its
//   reason; a direction badge whose name a screen reader says as "turns from
//   He to We"; a "Disputed" tag per Disputed Iltifat; each Ayah's Arabic in an
//   element of lang "ar".

import { expect, type Locator, type Page } from "@playwright/test";
import { ayahTranslation, cardLocations, nextFrames, PHONE, sourceSurahs, STRINGS, urduDigits, type Language } from "../support";
import { Given, Then, When, precedes, resolveColor } from "./fixtures";
import { PAPER, bodyBackground, closeSettings, fontSize, openSettings, translationSwitch, type Script, type Theme } from "./reader";
import { arabicPattern, whole } from "./share-page.steps";
import { chips } from "./themes";
import {
  ayahsOfRun,
  directionNamed,
  DIRECTIONS,
  entriesOf,
  fragmentOf,
  iltifatAt,
  iltifatCitedAt,
  iltifatOf,
  runOf,
  type Direction,
  type Iltifat,
} from "./iltifat";

const overviewAddress = (lang: Language) => `/${lang}/iltifat`;
const OTHER_SCRIPT: Record<Script, Script> = { uthmani: "indopak", indopak: "uthmani" };
const squash = (s: string) => s.replace(/\s+/g, " ").trim();
const digits = (n: number) => `(?:${n}|${urduDigits(n)})`;
/** A run as a heading may write it, in Western or Urdu digits, with an en dash or a hyphen. */
const runPattern = (i: { surah: number; ayahFrom: number; ayahTo: number }) =>
  i.ayahFrom === i.ayahTo
    ? `${digits(i.surah)}:${digits(i.ayahFrom)}(?!\\d)`
    : `${digits(i.surah)}:${digits(i.ayahFrom)}\\s*[–-]\\s*${digits(i.ayahTo)}(?!\\d)`;

/** The direction of the direction page on screen, from its address. */
function directionOnPage(page: Page): Direction {
  const slug = new URL(page.url()).pathname.split("/").pop();
  const d = DIRECTIONS.find((x) => x.slug === slug);
  if (!d) throw new Error(`not on a direction page: ${page.url()}`);
  return d;
}

/** What each entry on the direction page holds, in page order. Runs with or without scripts. */
interface ShownEntry {
  ids: string[];
  heading: string;
  href: string;
  /** What a reader sees of it. */
  text: string;
  /** Each Iltifat's own place in it, by element id: its text, and the Language its reason is marked as. */
  blocks: Record<string, { text: string; reasonLangs: string[] }>;
  disputedTags: number;
}
async function shownEntries(page: Page, reasons: Record<string, string> = {}): Promise<ShownEntry[]> {
  const main = page.locator("main").first();
  await expect(main.locator("article").first(), "an entry on the direction page").toBeAttached();
  return main.evaluate((main, reasons) => {
    const squash = (s: string) => s.replace(/\s+/g, " ").trim();
    return Array.from(main.querySelectorAll("article")).map((article) => {
      const own = article.id.startsWith("iltifat-") ? [article as HTMLElement] : [];
      const blocks = [...own, ...Array.from(article.querySelectorAll<HTMLElement>('[id^="iltifat-"]'))];
      const heading = article.querySelector("h2, h3");
      const reasonLangs = (block: HTMLElement) => {
        const reason = reasons[block.id];
        if (!reason) return [];
        // The innermost elements holding the whole reason, and the Language each is marked as.
        const holders = [block, ...Array.from(block.querySelectorAll<HTMLElement>("*"))].filter((el) => squash(el.textContent ?? "").includes(reason));
        const innermost = holders.filter((el) => !holders.some((o) => o !== el && el.contains(o)));
        return innermost.map((el) => el.closest("[lang]")?.getAttribute("lang") ?? "");
      };
      return {
        ids: blocks.map((b) => b.id),
        heading: squash(heading?.textContent ?? ""),
        href: heading?.querySelector("a")?.getAttribute("href") ?? "",
        text: (article as HTMLElement).innerText,
        blocks: Object.fromEntries(blocks.map((b) => [b.id, { text: squash(b.textContent ?? ""), reasonLangs: reasonLangs(b) }])),
        disputedTags: Array.from(article.querySelectorAll<HTMLElement>("*")).filter(
          (el) => squash(el.textContent ?? "") === "Disputed" && el.checkVisibility() && !Array.from(el.children).some((c) => squash(c.textContent ?? "") === "Disputed"),
        ).length,
      };
    });
  }, reasons);
}

/** The reasons of a direction's Iltifat, by element id. */
const reasonsOf = (list: Iltifat[]) => Object.fromEntries(list.map((i) => [fragmentOf(i), squash(i.reason)]));

/** Where each Ayah's Arabic, in `script`, first stands in `text`; -1 when it is not there. */
const placesOf = (text: string, ayahs: string[], script: Script) => ayahs.map((a) => text.search(new RegExp(arabicPattern(a, script), "u")));
const timesIn = (text: string, ayah: string, script: Script) => (text.match(new RegExp(arabicPattern(ayah, script), "gu")) ?? []).length;

/** The entry holding an Iltifat: its <article>. */
const entryOf = (page: Page, i: Iltifat): Locator => page.locator("main article").filter({ has: page.locator(`[id="${fragmentOf(i)}"]`) }).or(page.locator(`main article[id="${fragmentOf(i)}"]`));

/** Every Ayah of every entry on the direction page on screen. */
async function ayahsOnPage(page: Page): Promise<string[]> {
  return (await entriesOf(directionOnPage(page))).flatMap((e) => ayahsOfRun(e[0]));
}

// ---------------------------------------------------------------- AC-4: reached from Explore (#193)

Then("I am on the Iltifat overview in {language}", async ({ reader }, lang: Language) => {
  await expect.poll(() => new URL(reader.page.url()).pathname).toBe(overviewAddress(lang));
  await expect(reader.page.getByRole("heading", { level: 1 })).toBeVisible();
});

Then("I am on the Iltifat page {string}", async ({ reader }, path: string) => {
  await expect.poll(() => new URL(reader.page.url()).pathname).toBe(path);
  await expect(reader.page.getByRole("heading", { level: 1 })).toBeVisible();
});

// ---------------------------------------------------------------- AC-5: the overview

Then("the Iltifat overview's heading is {string}", async ({ reader }, title: string) => {
  await expect(reader.page.getByRole("heading", { level: 1 })).toHaveText(title);
});

/** The first direction link on the overview. */
const firstDirectionLink = (page: Page) => page.locator("main").first().locator('a[href*="/iltifat/"]').first();

Then("the Iltifat overview explains Iltifat in plain English before its directions", async ({ reader }) => {
  const main = reader.page.locator("main").first();
  const first = firstDirectionLink(reader.page);
  await expect(first, "a direction on the overview").toBeAttached();
  const paragraphs = main.locator("p").filter({ hasText: /Iltifat/ });
  const explained = await paragraphs.evaluateAll((ps) => ps.map((p) => (p.textContent ?? "").trim().split(/\s+/).length));
  expect(Math.max(0, ...explained), "the words of the overview's explanation of Iltifat").toBeGreaterThanOrEqual(12);
  const at = explained.findIndex((n) => n >= 12);
  expect(await precedes(paragraphs.nth(at), first), "the explanation comes before the directions").toBe(true);
});

Then(
  "the Iltifat overview shows these Iltifat directions, in this order, each with a one-line description and its count, linking to its page:",
  async ({ reader }, table) => {
    const rows = (table.hashes() as { direction: string; count: string; page: string }[]).map((r) => ({ ...r, page: r.page.trim() }));
    const main = reader.page.locator("main").first();
    const shown = await main.evaluate((main) =>
      Array.from(main.querySelectorAll('a[href*="/iltifat/"]')).map((a) => ({
        href: a.getAttribute("href") ?? "",
        text: ((a.closest("li") ?? a).textContent ?? "").replace(/\s+/g, " ").trim(),
      })),
    );
    expect(shown.map((s) => s.href), "the overview's direction links, in order").toEqual(rows.map((r) => r.page));
    for (const [k, r] of rows.entries()) {
      const { text } = shown[k];
      expect(text, `${r.direction}: its name`).toContain(r.direction);
      expect(text, `${r.direction}: its count`).toMatch(new RegExp(`(?:^|\\D)${digits(Number(r.count))}(?:\\D|$)`));
      const rest = text.replace(r.direction, " ").replace(new RegExp(digits(Number(r.count))), " ");
      expect(rest.split(/\s+/).filter((w) => /\p{L}/u.test(w)).length, `${r.direction}: a one-line description`).toBeGreaterThanOrEqual(4);
    }
  },
);

Then("the Iltifat overview shows {string}", async ({ reader }, text: string) => {
  const main = squash(await reader.page.locator("main").first().innerText());
  expect(main).toContain(text);
});

Then("the Iltifat overview has a sentence about 36:22", async ({ reader }) => {
  const main = reader.page.locator("main").first();
  await expect(main.getByText(/36:22/).first(), "a sentence about 36:22").toBeVisible();
});

Then(
  "at its foot the Iltifat overview has a source note naming Abdel Haleem \\(1992), saying his lists are not final and that the reasons are Saaliheen's short summaries guided by his account",
  async ({ reader }) => {
    const main = reader.page.locator("main").first();
    const note = main
      .locator("p, footer, aside, small")
      .filter({ hasText: /Abdel Haleem/ })
      .filter({ hasText: /1992/ })
      .filter({ hasText: /not final/i })
      .filter({ hasText: /Saaliheen/ })
      .filter({ hasText: /summar/i })
      .last();
    await expect(note, "the source note").toBeVisible();
    const lastDirection = main.locator('a[href*="/iltifat/"]').last();
    expect(await precedes(lastDirection, note), "the source note comes after the directions").toBe(true);
  },
);

// ---------------------------------------------------------------- AC-6: Quran order, fragments

Then("the page's heading names the Iltifat direction {string}", async ({ reader }, name: string) => {
  await expect(reader.page.getByRole("heading", { level: 1 })).toContainText(name);
});

Then(/^the page lists every (.+) Iltifat in the database, in Quran order, each in an entry of its own run$/, async ({ reader }, name: string) => {
  const direction = directionNamed(name);
  const expected = (await entriesOf(direction)).map((e) => e.map(fragmentOf));
  const shown = (await shownEntries(reader.page)).map((e) => e.ids);
  expect(shown.length, `entries on the ${name} page`).toBe(expected.length);
  expect(shown).toEqual(expected);
});

Then(/^every (.+) Iltifat has one element on the page whose id is "iltifat-" and its id$/, async ({ reader }, name: string) => {
  const ids = await reader.page.locator('[id^="iltifat-"]').evaluateAll((els) => els.map((el) => el.id));
  for (const i of await iltifatOf(directionNamed(name))) {
    expect(ids.filter((id) => id === fragmentOf(i)).length, `elements with the id ${fragmentOf(i)} (${runOf(i)})`).toBe(1);
  }
});

When(/^I open the (.+) page in (Urdu|English) at the fragment of the Iltifat at (\S+)$/, async ({ reader }, name: string, lang: Language, run: string) => {
  const direction = directionNamed(name);
  const i = await iltifatAt(direction, run);
  await reader.page.goto(`/${lang}/iltifat/${direction.slug}#${fragmentOf(i)}`);
  await nextFrames(reader.page);
});

Then(/^the entry of the (.+) Iltifat at (\S+) is at the top of the screen$/, async ({ reader }, name: string, run: string) => {
  const i = await iltifatAt(directionNamed(name), run);
  const entry = entryOf(reader.page, i);
  await expect(entry).toHaveCount(1);
  await expect
    .poll(() =>
      entry.evaluate((el) => {
        const box = el.getBoundingClientRect();
        const seen = document.elementFromPoint(box.left + box.width / 2, box.top + 4);
        return box.top >= -1 && box.top <= window.innerHeight / 3 && !!seen && el.contains(seen);
      }),
    )
    .toBe(true);
});

// ---------------------------------------------------------------- AC-7, AC-13: each entry

Then("each entry's heading names its Surah and its run, and links into its Surah at the cited Ayah of one of its Iltifat", async ({ reader }) => {
  const lang = reader.language;
  const expected = await entriesOf(directionOnPage(reader.page));
  const shown = await shownEntries(reader.page);
  expect(shown.length).toBe(expected.length);
  expected.forEach((e, k) => {
    const first = e[0];
    expect(shown[k].heading, `entry ${runOf(first)}: its Surah's name`).toContain(sourceSurahs()[first.surah - 1].nameLatin);
    expect(shown[k].heading, `entry ${runOf(first)}: its run`).toMatch(new RegExp(runPattern(first), "u"));
    expect(e.map((i) => `/${lang}/${i.surah}#${i.surah}:${i.cited}`), `entry ${runOf(first)}: its heading's link`).toContain(shown[k].href);
  });
});

Then(/^each entry shows the direction badge "(.+)", announced as "(.+)"$/, async ({ reader }, name: string, said: string) => {
  const entries = reader.page.locator("main article");
  const n = await entries.count();
  expect(n, "entries on the page").toBeGreaterThan(0);
  for (let k = 0; k < n; k++) {
    const entry = entries.nth(k);
    expect(await entry.innerText(), `entry ${k + 1} shows its badge`).toContain(name);
    expect((await entry.ariaSnapshot()).toLowerCase(), `entry ${k + 1}'s badge is announced`).toContain(said.toLowerCase());
  }
});

Then('each entry shows a Disputed tag for each of its Disputed Iltifat, announced as "disputed", and none for the others', async ({ reader }) => {
  const expected = await entriesOf(directionOnPage(reader.page));
  const shown = await shownEntries(reader.page);
  expect(shown.length).toBe(expected.length);
  const entries = reader.page.locator("main article");
  for (const [k, e] of expected.entries()) {
    const disputed = e.filter((i) => i.disputed).length;
    expect(shown[k].disputedTags, `entry ${runOf(e[0])}: its Disputed tags`).toBe(disputed);
    if (disputed) expect(await entries.nth(k).ariaSnapshot(), `entry ${runOf(e[0])}: its Disputed tag is announced`).toMatch(/\bdisputed\b/i);
  }
});

Then("each entry shows the Arabic of every Ayah of its run, in order, in Uthmani", async ({ reader }) => {
  const expected = await entriesOf(directionOnPage(reader.page));
  const shown = await shownEntries(reader.page);
  expect(shown.length).toBe(expected.length);
  const problems: string[] = [];
  expected.forEach((e, k) => {
    const ayahs = ayahsOfRun(e[0]);
    const places = placesOf(shown[k].text, ayahs, "uthmani");
    ayahs.forEach((a, j) => {
      if (places[j] < 0) problems.push(`entry ${runOf(e[0])} lacks ${a}`);
      else if (j > 0 && places[j] < places[j - 1]) problems.push(`entry ${runOf(e[0])}: ${a} before ${ayahs[j - 1]}`);
    });
  });
  expect(problems.slice(0, 20), `${problems.length} problems`).toEqual([]);
});

Then("each Iltifat's own place in its entry shows its reason from the database", async ({ reader }) => {
  const list = await iltifatOf(directionOnPage(reader.page));
  const reasons = reasonsOf(list);
  const blocks = Object.assign({}, ...(await shownEntries(reader.page, reasons)).map((e) => e.blocks)) as ShownEntry["blocks"];
  const missing = list.filter((i) => !blocks[fragmentOf(i)]?.text.includes(reasons[fragmentOf(i)])).map((i) => `${runOf(i)} cited at ${i.cited}`);
  expect(missing.slice(0, 20), `${missing.length} Iltifat without their reason`).toEqual([]);
});

Then("the entry of the He → You Iltifat at 1:2–5 is headed {string}", async ({ reader }, heading: string) => {
  const i = await iltifatAt(directionNamed("He → You"), "1:2–5");
  const h = entryOf(reader.page, i).locator("h2, h3").first();
  expect(squash(await h.innerText())).toContain(heading);
});

// ---------------------------------------------------------------- AC-8: the reader's settings

const arabicOf = (page: Page, ayah: string, script: Script): Locator => page.locator("main").first().getByText(whole(arabicPattern(ayah, script)));
const arabicOnPage = (page: Page) => page.locator('main [lang="ar"]');

Then(
  "each Ayah on the Iltifat page shows its Arabic in {script}, with its end-of-Ayah marker and number, and not in the other Script",
  async ({ reader }, script: Script) => {
    for (const ayah of await ayahsOnPage(reader.page)) {
      await expect(arabicOf(reader.page, ayah, script).first(), `${ayah} in ${script}`).toBeVisible();
      await expect(arabicOf(reader.page, ayah, OTHER_SCRIPT[script]), `${ayah} in ${OTHER_SCRIPT[script]}`).toHaveCount(0);
    }
  },
);

// The (Urdu|English) group is the {language} parameter type's pattern, so it arrives as "ur" or "en".
Then(/^each Ayah on the Iltifat page shows its Ayah translation in (Urdu|English): (on|off)$/, async ({ reader }, lang: Language, state: string) => {
  await expect(reader.page.getByRole("heading", { level: 1 })).toBeVisible();
  for (const ayah of await ayahsOnPage(reader.page)) {
    const t = reader.page.getByText(ayahTranslation(ayah, lang), { exact: true });
    if (state === "on") await expect(t.first(), `${ayah}'s Ayah translation`).toBeVisible();
    else await expect(t, `${ayah}'s Ayah translation`).toHaveCount(0);
  }
});

Then("no Arabic on the Iltifat page can be selected", async ({ reader }) => {
  const arabic = arabicOnPage(reader.page);
  await expect(arabic.first(), "Arabic on the Iltifat page").toBeVisible();
  const selectable = await arabic.evaluateAll((els) => els.filter((el) => getComputedStyle(el).userSelect !== "none").length);
  expect(selectable, "Arabic that can be selected").toBe(0);
});

Then("the Iltifat page's Arabic is {int}% and its Ayah translations {int}% of a fresh browser's", async ({ reader }, arabicPct: number, meaningPct: number) => {
  const page = reader.page;
  const path = new URL(page.url()).pathname;
  const lang = reader.language;
  const ayah = (await ayahsOnPage(page))[0];
  const arabic = arabicOnPage(page).first();
  const meaning = page.getByText(ayahTranslation(ayah, lang), { exact: true }).first();
  await expect(arabic).toBeVisible();
  const [a, m] = [await fontSize(arabic), (await meaning.count()) ? await fontSize(meaning) : undefined];
  const context = await reader.newContext();
  const fresh = await context.newPage();
  await fresh.goto(path);
  await reader.page.bringToFront();
  const a0 = await fontSize(arabicOnPage(fresh).first());
  // A fresh browser starts with the Ayah translation off: turn it on to measure it at its first size.
  await openSettings(fresh);
  await translationSwitch(fresh).click();
  await closeSettings(fresh);
  const freshMeaning = fresh.getByText(ayahTranslation(ayah, lang), { exact: true }).first();
  const m0 = (await freshMeaning.count()) ? await fontSize(freshMeaning) : undefined;
  await context.close();
  expect(a, "the Arabic's size").toBeCloseTo((a0 * arabicPct) / 100, 0);
  if (m !== undefined && m0 !== undefined) expect(m, "the Ayah translation's size").toBeCloseTo((m0 * meaningPct) / 100, 0);
});

Then("the Iltifat page has no Word card, no chip, no Phrase colour and no Recitation control", async ({ reader }) => {
  const page = reader.page;
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  expect(await cardLocations(page), "Word cards").toEqual([]);
  await expect(chips(page.locator("main")), "Theme chips").toHaveCount(0);
  const coloured = await arabicOnPage(page).evaluateAll((els) =>
    els.flatMap((el) => [el, ...Array.from(el.querySelectorAll("*"))]).filter((el) => {
      const bg = getComputedStyle(el).backgroundColor;
      return bg !== "rgba(0, 0, 0, 0)" && bg !== "transparent";
    }).length,
  );
  expect(coloured, "Arabic drawn on a Phrase colour").toBe(0);
  await expect(page.getByRole("button", { name: /^Listen from Ayah/ }), "Listen buttons").toHaveCount(0);
  await expect(page.getByRole("button", { name: STRINGS.play, exact: true }), "Play").toHaveCount(0);
  await expect(page.getByRole("region", { name: STRINGS.recitationBar }), "the Recitation bar").toHaveCount(0);
});

// ---------------------------------------------------------------- AC-9: reasons in English

Then("every reason on the page is marked as English", async ({ reader }) => {
  const list = await iltifatOf(directionOnPage(reader.page));
  const blocks = Object.assign({}, ...(await shownEntries(reader.page, reasonsOf(list))).map((e) => e.blocks)) as ShownEntry["blocks"];
  const unmarked = list
    .filter((i) => {
      const langs = blocks[fragmentOf(i)]?.reasonLangs ?? [];
      return langs.length === 0 || langs.some((l) => !l.startsWith("en"));
    })
    .map((i) => `${runOf(i)} cited at ${i.cited}`);
  expect(unmarked.slice(0, 20), `${unmarked.length} reasons not marked as English`).toEqual([]);
});

// ---------------------------------------------------------------- AC-10: shared and overlapping runs

const shared = new WeakMap<object, Iltifat[]>();

Given(
  /^the two (.+) Iltifat cited at (\S+) and (\S+) both have the run (\S+) in the database$/,
  async ({ reader }, name: string, a: string, b: string, run: string) => {
    const direction = directionNamed(name);
    const pair = [await iltifatCitedAt(direction, a), await iltifatCitedAt(direction, b)];
    for (const i of pair) expect(runOf(i), `the ${name} Iltifat cited at ${i.surah}:${i.cited}: its run in the database`).toBe(run);
    shared.set(reader, pair);
  },
);

/** The entry the shared run's Iltifat are in, as shown. */
async function sharedEntry(page: Page, pair: Iltifat[]): Promise<ShownEntry> {
  const shown = (await shownEntries(page, reasonsOf(pair))).filter((e) => pair.some((i) => e.ids.includes(fragmentOf(i))));
  expect(shown.length, "entries holding the two Iltifat").toBe(1);
  return shown[0];
}

Then(
  /^the (.+) Iltifat cited at (\S+) and (\S+) are in one entry, headed with Surah (\d+)'s name and "(.+)"$/,
  async ({ reader }, name: string, a: string, b: string, surah: string, run: string) => {
    const direction = directionNamed(name);
    const pair = [await iltifatCitedAt(direction, a), await iltifatCitedAt(direction, b)];
    const entry = await sharedEntry(reader.page, pair);
    expect(entry.ids).toEqual(pair.map(fragmentOf));
    expect(entry.heading).toContain(sourceSurahs()[Number(surah) - 1].nameLatin);
    expect(entry.heading).toMatch(new RegExp(runPattern(pair[0]), "u"));
    expect(runOf(pair[0])).toBe(run);
  },
);

Then(/^that entry shows the Arabic of Ayahs (\S+) and (\S+) once each, in order$/, async ({ reader }, a: string, b: string) => {
  const pair = shared.get(reader);
  if (!pair) throw new Error("no shared run in this scenario");
  const entry = await sharedEntry(reader.page, pair);
  for (const ayah of [a, b]) expect(timesIn(entry.text, ayah, "uthmani"), `${ayah}'s Arabic in the entry`).toBe(1);
  const [pa, pb] = placesOf(entry.text, [a, b], "uthmani");
  expect(pa, `${a} before ${b}`).toBeLessThan(pb);
});

Then("that entry shows both Iltifat's reasons from the database, after its Ayahs", async ({ reader }) => {
  const pair = shared.get(reader);
  if (!pair) throw new Error("no shared run in this scenario");
  const entry = await sharedEntry(reader.page, pair);
  const text = squash(entry.text);
  const last = ayahsOfRun(pair[0]).at(-1)!;
  const lastArabic = text.search(new RegExp(arabicPattern(last, "uthmani"), "u"));
  expect(lastArabic, `${last}'s Arabic in the entry`).toBeGreaterThanOrEqual(0);
  for (const i of pair) {
    expect(entry.blocks[fragmentOf(i)]?.text ?? "", `the reason of the Iltifat cited at ${i.surah}:${i.cited}`).toContain(squash(i.reason));
    expect(text.indexOf(squash(i.reason)), `the reason of the Iltifat cited at ${i.surah}:${i.cited} comes after the Ayahs`).toBeGreaterThan(lastArabic);
  }
});

Then(
  /^the (.+) Iltifat at (\S+) and the one at (\S+) are in two entries, one after the other$/,
  async ({ reader }, name: string, a: string, b: string) => {
    const direction = directionNamed(name);
    const [x, y] = [await iltifatAt(direction, a), await iltifatAt(direction, b)];
    const ids = (await shownEntries(reader.page)).map((e) => e.ids);
    const [kx, ky] = [ids.findIndex((e) => e.includes(fragmentOf(x))), ids.findIndex((e) => e.includes(fragmentOf(y)))];
    expect(kx, `the entry of ${a}`).toBeGreaterThanOrEqual(0);
    expect(ky, `the entry of ${b}`).toBe(kx + 1);
    expect(ids[kx], `the entry of ${a} holds it alone`).toEqual([fragmentOf(x)]);
    expect(ids[ky], `the entry of ${b} holds it alone`).toEqual([fragmentOf(y)]);
  },
);

Then(
  /^the entry of (\S+) shows the Arabic of Ayahs (\S+) and (\S+), and the entry of (\S+) the Arabic of Ayahs (\S+) and (\S+)$/,
  async ({ reader }, runA: string, a1: string, a2: string, runB: string, b1: string, b2: string) => {
    const direction = directionOnPage(reader.page);
    const shown = await shownEntries(reader.page);
    for (const [run, ayahs] of [[runA, [a1, a2]], [runB, [b1, b2]]] as const) {
      const i = await iltifatAt(direction, run);
      const entry = shown.find((e) => e.ids.includes(fragmentOf(i)));
      expect(entry, `the entry of ${run}`).toBeDefined();
      for (const ayah of ayahs) expect(timesIn(entry!.text, ayah, "uthmani"), `${ayah}'s Arabic in the entry of ${run}`).toBe(1);
    }
  },
);

// ---------------------------------------------------------------- AC-11: the look-up link

When(/^I follow the heading of the (.+) Iltifat at (\S+)$/, async ({ reader }, name: string, run: string) => {
  const i = await iltifatAt(directionNamed(name), run);
  const link = entryOf(reader.page, i).locator("h2 a, h3 a").first();
  await expect(link, `the heading of the ${name} Iltifat at ${run}`).toBeVisible();
  await link.click();
});

When("I scroll to the bottom of the Iltifat page", async ({ reader }) => {
  await reader.page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await nextFrames(reader.page);
});

// ---------------------------------------------------------------- AC-12: without JavaScript

When("I open {string} without JavaScript", async ({ reader }, address: string) => {
  // A crawler: no scripts run, so this is the served HTML alone.
  const context = await reader.newContext(undefined, { javaScriptEnabled: false });
  reader.page = await context.newPage();
  const res = await reader.page.goto(address, { waitUntil: "domcontentloaded" });
  expect(res?.status(), address).toBe(200);
});

Then(
  /^every (.+) Iltifat in the database has its element "iltifat-" and its id, with its reason, in an entry holding the Arabic of every Ayah of its run$/,
  async ({ reader }, name: string) => {
    const list = await iltifatOf(directionNamed(name));
    const shown = await shownEntries(reader.page, reasonsOf(list));
    const problems: string[] = [];
    for (const i of list) {
      const entry = shown.find((e) => e.ids.includes(fragmentOf(i)));
      if (!entry) {
        problems.push(`${runOf(i)} cited at ${i.cited}: no element ${fragmentOf(i)}`);
        continue;
      }
      if (!entry.blocks[fragmentOf(i)].text.includes(squash(i.reason))) problems.push(`${runOf(i)} cited at ${i.cited}: no reason`);
      // Either Script will do: the served HTML is the page before any reader setting applies.
      const text = entry.text;
      for (const a of ayahsOfRun(i)) if (timesIn(text, a, "uthmani") + timesIn(text, a, "indopak") === 0) problems.push(`${runOf(i)}: no Arabic of ${a}`);
    }
    expect(problems.slice(0, 20), `${problems.length} problems`).toEqual([]);
  },
);

// ---------------------------------------------------------------- AC-14: colour themes, phone width

When("I view the Iltifat page on a {word}", async ({ reader }, viewport: string) => {
  if (viewport !== "desktop" && viewport !== "phone") throw new Error(`no ${viewport} viewport`);
  if (viewport === "phone") await reader.page.setViewportSize(PHONE);
});

Then("every entry on the Iltifat page lies within the screen's width", async ({ reader }) => {
  const page = reader.page;
  const width = page.viewportSize()!.width;
  await expect(page.locator("main article, main li").first(), "an entry or a direction on the page").toBeAttached();
  const outside = await page.locator("main article, main li").evaluateAll(
    (els, width) =>
      els
        .map((el, k) => ({ k, box: el.getBoundingClientRect() }))
        .filter(({ box }) => box.left < -0.5 || box.right > width + 0.5)
        .map(({ k }) => k),
    width,
  );
  expect(outside, "entries reaching past the screen's edges").toEqual([]);
});

Then("the Iltifat page is drawn on the {theme} paper", async ({ reader }, theme: Theme) => {
  const expected = await resolveColor(reader.page, PAPER[theme]);
  await expect.poll(() => bodyBackground(reader.page)).toBe(expected);
});
