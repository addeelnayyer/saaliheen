// Steps for Theme chips and Theme pages (#129). Theme names in English come
// from the feature (the issue's words); Urdu names, Theme categories, Ayahs,
// descriptions and Passage groups come from the Themes file and the Passages
// file (./themes, ./passages); Arabic and Ayah translations from the sources.
// Things are found by role, link address and visible text.
//
// The Theme page's shape these steps expect (PROPOSED, #129 stage 1): an <h1>
// with the Theme's name; its Theme category and "<n> ayahs" before the first
// Passage group; each Passage group an <h2> holding one link to the Passage's
// first Ayah (/{lang}/{s}#{s}:{from}); each Ayah after its group's heading,
// with a link to it (/{lang}/{s}#{s}:{a}).

import { expect, type Locator, type Page } from "@playwright/test";
import { ayahSection, ayahTranslation, cardLocations, nextFrames, PHONE, shot, sourceSurahs, STRINGS, urduDigits, type Language } from "../support";
import { Then, When, precedes, resolveColor } from "./fixtures";
import { filePassages, titleOf } from "./passages";
import { PAPER, bodyBackground, closeSettings, fontSize, openSettings, translationSwitch, type Script, type Theme } from "./reader";
import { arabicPattern, whole } from "./share-page.steps";
import { ayahsOf, categoryOf, chips, groupsOf, nameIn, readThemes, themeLinks, themeNamed, type Group } from "./themes";

const names = (list: string) => list.split(",").map((n) => n.trim()).filter(Boolean);
const OTHER_SCRIPT: Record<Script, Script> = { uthmani: "indopak", indopak: "uthmani" };
/** The slug of the Theme page the reader is on: the last part of its address. */
const slugOnPage = (page: Page) => new URL(page.url()).pathname.split("/").pop()!;

// ---------------------------------------------------------------- chips in Study

async function expectChips(page: Page, ayah: string, expected: string[]) {
  const c = chips(ayahSection(page, ayah));
  await expect(c.first(), `Ayah ${ayah} has Theme chips`).toBeVisible();
  await expect(c).toHaveText(expected);
}

Then(
  "Ayah {word} shows the Theme chips {string} in {language}, in that order",
  async ({ reader }, ayah: string, list: string, lang: Language) => {
    await expectChips(reader.page, ayah, names(list).map((n) => nameIn(n, lang)));
  },
);

Then("Ayah {word}'s Theme chips come after its last Word card and its Ayah translation", async ({ reader }, ayah: string) => {
  const section = ayahSection(reader.page, ayah);
  const first = chips(section).first();
  await expect(first, `Ayah ${ayah} has Theme chips`).toBeVisible();
  const lang = reader.language;
  expect(await precedes(section.locator('[id^="' + ayah + ':"]').last(), first), "after the last Word card").toBe(true);
  const translation = section.getByText(ayahTranslation(ayah, lang), { exact: true });
  await expect(translation).toBeVisible();
  expect(await precedes(translation, first), "after the Ayah translation").toBe(true);
});

Then(
  "Ayah {word}'s Theme chips come after its last Word card and before Ayah {word}",
  async ({ reader }, ayah: string, next: string) => {
    const first = chips(ayahSection(reader.page, ayah)).first();
    await expect(first, `Ayah ${ayah} has Theme chips`).toBeVisible();
    expect(await precedes(ayahSection(reader.page, ayah).locator(`[id^="${ayah}:"]`).last(), first)).toBe(true);
    expect(await precedes(chips(ayahSection(reader.page, ayah)).last(), ayahSection(reader.page, next))).toBe(true);
  },
);

Then(
  "every Ayah of Surah {int} shows its Theme chips from the Themes file, in {language}",
  async ({ reader }, surah: number, lang: Language) => {
    const file = readThemes();
    const bySlug = new Map(file.themes.map((t) => [t.slug, t]));
    const count = sourceSurahs()[surah - 1].ayahCount;
    for (let a = 1; a <= count; a++) {
      const ayah = `${surah}:${a}`;
      await expectChips(reader.page, ayah, (file.ayahs[ayah] ?? []).map((s) => bySlug.get(s)?.[lang] ?? s));
    }
  },
);

Then("Ayah {word}'s Theme chips all lie within the screen's width, on more than one line", async ({ reader }, ayah: string) => {
  const c = chips(ayahSection(reader.page, ayah));
  await expect(c.first(), `Ayah ${ayah} has Theme chips`).toBeVisible();
  const boxes = await c.evaluateAll((els) => els.map((el) => el.getBoundingClientRect()).map((r) => ({ left: r.left, right: r.right, top: r.top })));
  const width = await reader.page.evaluate(() => document.documentElement.clientWidth);
  for (const b of boxes) {
    expect(b.left, "a chip's left edge").toBeGreaterThanOrEqual(0);
    expect(b.right, "a chip's right edge").toBeLessThanOrEqual(width);
  }
  expect(new Set(boxes.map((b) => Math.round(b.top))).size, "lines of chips").toBeGreaterThan(1);
});

Then("I save a screenshot of Ayah {word}'s Theme chips {string}", async ({ reader }, ayah: string, name: string) => {
  await ayahSection(reader.page, ayah).scrollIntoViewIfNeeded();
  await shot(ayahSection(reader.page, ayah), name);
});

Then("the page does not scroll sideways", async ({ reader }) => {
  const overflow = await reader.page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow, "how far the page scrolls sideways").toBeLessThanOrEqual(0);
});

Then("the page has no link to a Theme page and no Theme name {string}", async ({ reader }, en: string) => {
  await expect(reader.page.locator("main").first()).toBeVisible();
  await expect(themeLinks(reader.page), "links to Theme pages").toHaveCount(0);
  await expect(reader.page.getByText(en, { exact: true }), `the Theme name "${en}"`).toHaveCount(0);
});

// ---------------------------------------------------------------- chips are links

Then(
  "each of Ayah {word}'s Theme chips is a link named for its Theme, to {string} and the like",
  async ({ reader }, ayah: string, example: string) => {
    const lang = reader.language;
    const file = readThemes();
    const slugs = file.ayahs[ayah] ?? [];
    expect(slugs.length, `Ayah ${ayah}'s Themes in the Themes file`).toBeGreaterThan(0);
    expect(slugs.map((s) => `/${lang}/themes/${s}`), "the example address").toContain(example);
    const section = ayahSection(reader.page, ayah);
    for (const slug of slugs) {
      const name = file.themes.find((t) => t.slug === slug)![lang];
      const link = section.getByRole("link", { name, exact: false });
      await expect(link, `the chip "${name}" is a link`).toHaveCount(1);
      await expect(link).toHaveAttribute("href", `/${lang}/themes/${slug}`);
    }
  },
);

When("I follow Ayah {word}'s Theme chip {string}", async ({ reader }, ayah: string, en: string) => {
  const lang = reader.language;
  await ayahSection(reader.page, ayah).getByRole("link", { name: nameIn(en, lang) }).click();
});

Then("I am on the Theme page {string}", async ({ reader }, path: string) => {
  await expect.poll(() => new URL(reader.page.url()).pathname).toBe(path);
  await expect(reader.page.getByRole("heading", { level: 1 })).toBeVisible();
});

When(
  "I press Tab from {string} until Ayah {word}'s Theme chip {string} has the focus",
  async ({ reader }, from: string, ayah: string, en: string) => {
    const page = reader.page;
    await page.getByRole("button", { name: from, exact: true }).focus();
    const chip = ayahSection(page, ayah).getByRole("link", { name: nameIn(en, reader.language) });
    await expect(chip, `Ayah ${ayah}'s Theme chip "${en}"`).toHaveCount(1);
    for (let i = 0; i < 80; i++) {
      if (await chip.evaluate((el) => el === document.activeElement)) return;
      await page.keyboard.press("Tab");
    }
    throw new Error(`Tab never reached Ayah ${ayah}'s Theme chip "${en}"`);
  },
);

// ---------------------------------------------------------------- static pages

Then(
  "every Theme page of the Themes file, in Urdu and in English, is served as a static page from Next's cache, setting no cookie",
  async ({ reader }) => {
    const slugs = readThemes().themes.map((t) => t.slug);
    expect(slugs.length).toBe(258);
    for (const lang of ["ur", "en"]) {
      for (const slug of slugs) {
        const address = `/${lang}/themes/${slug}`;
        const res = await reader.page.request.get(address, { maxRedirects: 0 });
        const headers = res.headers();
        expect(res.status(), address).toBe(200);
        expect(headers["x-nextjs-prerender"] ?? "", `${address} is a prerendered page`).toMatch(/1/);
        expect(headers["set-cookie"], `${address} sets no cookie`).toBeUndefined();
      }
    }
  },
);

// ---------------------------------------------------------------- the page

/** What the Theme page shows, in order: each Passage group's heading link, and the Ayah links under it. */
export async function shownGroups(page: Page) {
  await expect(page.locator("main h2").first(), "a Passage group's heading on the Theme page").toBeVisible();
  return page.locator("main").first().evaluate((main) => {
    const groups: { heading: string; href: string; ayahs: string[] }[] = [];
    const ayahLink = /^\/(ur|en)\/\d+#\d+:\d+$/;
    for (const el of Array.from(main.querySelectorAll("h2, a[href]"))) {
      if (el.tagName === "H2") {
        groups.push({ heading: (el.textContent ?? "").replace(/\s+/g, " ").trim(), href: el.querySelector("a")?.getAttribute("href") ?? "", ayahs: [] });
      } else if (!el.closest("h2") && ayahLink.test(el.getAttribute("href") ?? "") && groups.length) {
        groups.at(-1)!.ayahs.push(el.getAttribute("href")!);
      }
    }
    return groups;
  });
}

export const groupHref = (lang: Language, g: Group) => `/${lang}/${g.surah}#${g.surah}:${g.from}`;
const digits = (n: number, lang: Language) => (lang === "ur" ? `(?:${n}|${urduDigits(n)})` : `${n}`);
const rangeIn = (g: Group, lang: Language) => new RegExp(g.from === g.till ? digits(g.from, lang) : `${digits(g.from, lang)}\\s*[–-]\\s*${digits(g.till, lang)}`);

Then("the Theme page's heading is the name of {string} in {language}", async ({ reader }, en: string, lang: Language) => {
  await expect(reader.page.getByRole("heading", { level: 1 })).toHaveText(nameIn(en, lang));
});

Then(
  "the Theme page shows the Theme category of {string} in {language}, and its count of Ayahs, before its first Passage group",
  async ({ reader }, en: string, lang: Language) => {
    const t = themeNamed(en);
    const main = reader.page.locator("main").first();
    const firstGroup = main.getByRole("heading", { level: 2 }).first();
    await expect(firstGroup, "a first Passage group").toBeVisible();
    const category = main.getByText(categoryOf(t, lang), { exact: true }).first();
    await expect(category).toBeVisible();
    expect(await precedes(category, firstGroup), "the Theme category is before the first Passage group").toBe(true);
    const n = ayahsOf(t.slug).length;
    const count = main.getByText(new RegExp(`^\\s*(?:${n}|${urduDigits(n)}) ayahs\\s*$`)).first();
    await expect(count, STRINGS.ayahCount(n)).toBeVisible();
    expect(await precedes(count, firstGroup), "the count is before the first Passage group").toBe(true);
  },
);

Then(
  "the Theme page shows the Passage groups of {string} from the Themes file, in order, each Ayah under its own group",
  async ({ reader }, en: string) => {
    const lang = reader.language;
    const expected = groupsOf(themeNamed(en).slug).map((g) => ({
      href: groupHref(lang, g),
      ayahs: g.ayahs.map((a) => `/${lang}/${g.surah}#${g.surah}:${a}`),
    }));
    const shown = (await shownGroups(reader.page)).map(({ href, ayahs }) => ({ href, ayahs }));
    expect(shown).toEqual(expected);
  },
);

Then("each Passage group's heading names its Surah and the Passage's full Ayah range, in {language}", async ({ reader }, lang: Language) => {
  const groups = groupsOf(slugOnPage(reader.page));
  const shown = await shownGroups(reader.page);
  expect(shown.length, "Passage groups shown").toBe(groups.length);
  groups.forEach((g, i) => {
    expect(shown[i].heading, `group ${i + 1}`).toContain(sourceSurahs()[g.surah - 1].nameLatin);
    expect(shown[i].heading, `group ${i + 1}`).toMatch(rangeIn(g, lang));
  });
});

async function headingsAndTitles(page: Page, lang: Language) {
  const shown = await shownGroups(page);
  expect(shown.length, "Passage groups shown").toBeGreaterThan(0);
  return shown.map((s) => {
    const m = s.href.match(/^\/(?:ur|en)\/(\d+)#\d+:(\d+)$/);
    expect(m, `the heading "${s.heading}" links to its Passage's first Ayah`).not.toBeNull();
    const p = filePassages().find((x) => x.surah_no === Number(m![1]) && x.ayah_from === Number(m![2]));
    expect(p, `a Passage begins at ${m![1]}:${m![2]}`).toBeDefined();
    return { heading: s.heading, title: titleOf(p!, lang) };
  });
}

Then("each Passage group's heading has its Passage's title in {language}", async ({ reader }, lang: Language) => {
  for (const { heading, title } of await headingsAndTitles(reader.page, lang)) expect(heading).toContain(title);
});

Then("no Passage group's heading has its Passage's title in {language}", async ({ reader }, lang: Language) => {
  for (const { heading, title } of await headingsAndTitles(reader.page, lang)) expect(heading).not.toContain(title);
});

Then(
  "the Theme page lists {int} Ayahs, the same Ayahs as the Themes file gives {string}",
  async ({ reader }, count: number, en: string) => {
    const lang = reader.language;
    const expected = ayahsOf(themeNamed(en).slug).map((a) => `/${lang}/${a.split(":")[0]}#${a}`);
    expect(expected.length).toBe(count);
    expect((await shownGroups(reader.page)).flatMap((g) => g.ayahs)).toEqual(expected);
  },
);

// ---------------------------------------------------------------- look-ups

When("I follow the heading of the Passage group {word}", async ({ reader }, range: string) => {
  const [s, from] = range.split(/[:–-]/).map(Number);
  const lang = reader.language;
  const link = reader.page.locator(`main h2 a[href="/${lang}/${s}#${s}:${from}"]`);
  await expect(link, `the heading of the Passage group ${range}`).toBeVisible();
  await link.click();
});

When("I follow the link of Ayah {word}", async ({ reader }, ayah: string) => {
  const lang = reader.language;
  const link = reader.page.locator(`main a[href="/${lang}/${ayah.split(":")[0]}#${ayah}"]`).first();
  await expect(link, `the link of Ayah ${ayah}`).toBeVisible();
  await link.click();
});

Then("I am on {string} at Ayah {word}", async ({ reader }, path: string, ayah: string) => {
  await expect.poll(() => new URL(reader.page.url()).pathname).toBe(path);
  expect(decodeURIComponent(new URL(reader.page.url()).hash)).toBe(`#${ayah}`);
});

When("I scroll to the bottom of the Theme page", async ({ reader }) => {
  await reader.page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await nextFrames(reader.page);
});

// ---------------------------------------------------------------- each Ayah on the page

const arabicOf = (page: Page, ayah: string, script: Script): Locator => page.locator("main").first().getByText(whole(arabicPattern(ayah, script)));

Then(
  "each Ayah of {string} shows its Arabic in {script}, with its end-of-Ayah marker and number, and not in the other Script",
  async ({ reader }, en: string, script: Script) => {
    for (const ayah of ayahsOf(themeNamed(en).slug)) {
      await expect(arabicOf(reader.page, ayah, script).first(), `${ayah} in ${script}`).toBeVisible();
      await expect(arabicOf(reader.page, ayah, OTHER_SCRIPT[script]), `${ayah} in ${OTHER_SCRIPT[script]}`).toHaveCount(0);
    }
  },
);

// The (Urdu|English) group is the {language} parameter type's pattern, so it arrives as "ur" or "en".
Then(/^each Ayah of "([^"]+)" shows its Ayah translation in (Urdu|English): (on|off)$/, async ({ reader }, en: string, lang: Language, state: string) => {
  await expect(reader.page.getByRole("heading", { level: 1 })).toBeVisible();
  for (const ayah of ayahsOf(themeNamed(en).slug)) {
    const t = reader.page.getByText(ayahTranslation(ayah, lang), { exact: true });
    if (state === "on") await expect(t.first(), `${ayah}'s Ayah translation`).toBeVisible();
    else await expect(t, `${ayah}'s Ayah translation`).toHaveCount(0);
  }
});

/** The Arabic of every Ayah on the Theme page: text in an Arabic-script element of <main>. */
const arabicOnPage = (page: Page) => page.locator('main [lang="ar"]');

Then("no Arabic on the Theme page can be selected", async ({ reader }) => {
  const arabic = arabicOnPage(reader.page);
  await expect(arabic.first(), "Arabic on the Theme page").toBeVisible();
  const selectable = await arabic.evaluateAll((els) => els.filter((el) => getComputedStyle(el).userSelect !== "none").length);
  expect(selectable, "Arabic that can be selected").toBe(0);
});

Then("no Arabic on the Theme page is in the selection", async ({ reader }) => {
  const arabic = arabicOnPage(reader.page);
  await expect(arabic.first(), "Arabic on the Theme page").toBeVisible();
  const selected = await reader.page.evaluate(() => window.getSelection()?.toString() ?? "");
  expect(selected, "the selection").not.toMatch(/[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]/u);
});

Then("the Theme page's Arabic is {int}% and its Ayah translations {int}% of a fresh browser's", async ({ reader }, arabicPct: number, meaningPct: number) => {
  const page = reader.page;
  const path = new URL(page.url()).pathname;
  const lang = reader.language;
  const ayah = ayahsOf(slugOnPage(page))[0];
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

Then("the Theme page has no Word card, no Theme chip, no Phrase colour and no Recitation control", async ({ reader }) => {
  const page = reader.page;
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  expect(await cardLocations(page), "Word cards").toEqual([]);
  // The site bar's Translation language switch links to this Theme page in the other Language; a chip would be in <main>.
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

// ---------------------------------------------------------------- descriptions

Then("the page does not hold the description of {string}", async ({ reader }, en: string) => {
  const { description } = themeNamed(en);
  expect(description.trim().length, `"${en}" has a description`).toBeGreaterThan(0);
  await expect(reader.page.locator("main").first()).toBeVisible();
  const html = await reader.page.content();
  expect(html, "the page's HTML").not.toContain(description.trim().slice(0, 40));
});

// ---------------------------------------------------------------- AC-13

When("I view the Theme page on a {word}", async ({ reader }, viewport: string) => {
  if (viewport !== "desktop" && viewport !== "phone") throw new Error(`no ${viewport} viewport`);
  if (viewport === "phone") await reader.page.setViewportSize(PHONE);
});

Then("the Theme page is drawn on the {theme} paper", async ({ reader }, theme: Theme) => {
  const expected = await resolveColor(reader.page, PAPER[theme]);
  await expect.poll(() => bodyBackground(reader.page)).toBe(expected);
});
