// Read, Explore and Me (#192), the pages behind the destinations: Explore and
// its cards, Me and what it holds, the admin area's way back, the documents
// keeping the reader's Language, the Share page's brand bar, a Surah page's
// one Prev/Next and its Reading settings sheet, and the in-app links of the
// Iltifat pages. Names, counts and Ayah translations come from the sources; the
// Supplications card's count is checked in ./supplications-page.steps.ts (#199).

import { expect, type Locator, type Page } from "@playwright/test";
import type { DataTable } from "playwright-bdd";
import { ayahSection, ayahTranslation, isModal, sourceSurahs, STRINGS, urduDigits, type Language } from "../support";
import { brandLink, controlsOnRowOf, destinationBars, DESTINATIONS, expectDrawnIn } from "./destinations.steps";
import { Given, Then, When, precedes, OTHER, type SharedAyahs } from "./fixtures";
import { directionNamed, DIRECTIONS } from "./iltifat";
import { LANGUAGE_NAME, type Theme } from "./reader";
import { qulAnalysis } from "./roots";
import { readThemes } from "./themes";

const pathOf = (page: Page, href: string | null) => new URL(href ?? "", page.url()).pathname;
const langOfAddress = (page: Page) => new URL(page.url()).pathname.split("/")[1] as Language;
const main = (page: Page) => page.getByRole("main");
export const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** A shown link in `scope` that leads to `path`; `links` narrows which of its links count. */
async function linkTo(scope: Locator, page: Page, path: string, links = scope.locator("a[href]")): Promise<Locator | undefined> {
  for (let i = 0; i < (await links.count()); i++) {
    const link = links.nth(i);
    if ((await link.isVisible()) && pathOf(page, await link.getAttribute("href")) === path) return link;
  }
  return undefined;
}

// ---------------------------------------------------------------- Explore

Given("I open Explore in {language}", async ({ reader, reading }, lang: Language) => {
  reading.status = (await reader.page.goto(`/${lang}/explore`))?.status();
  reading.lang = lang;
  reading.surah = undefined;
});

/** Explore's card named `name`: a link in the page's content whose name starts with it. */
export const exploreCard = (page: Page, name: string) => main(page).getByRole("link", { name: new RegExp(`^\\W*${escape(name)}\\b`) });

Then(/^Explore's cards are, in order, ((?:"[^"]+", )*"[^"]+" and "[^"]+")$/, async ({ reader }, list: string) => {
  const names = [...list.matchAll(/"([^"]+)"/g)].map((m) => m[1]);
  const cards = names.map((name) => exploreCard(reader.page, name));
  for (const [n, card] of cards.entries()) {
    await expect(card, `the "${names[n]}" card`).toHaveCount(1);
    await expect(card).toBeVisible();
  }
  for (let n = 1; n < cards.length; n++) {
    expect(await precedes(cards[n - 1], cards[n]), `"${names[n - 1]}" before "${names[n]}"`).toBe(true);
  }
});

Then("the {string} card says what it is for in one line written in {language}", async ({ reader }, name: string, lang: Language) => {
  const card = exploreCard(reader.page, name);
  // Every piece of text on the card other than its name and its count.
  const lines = await card.evaluate((el, name) => {
    const out: { text: string; lang: string | null }[] = [];
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const text = (n.textContent ?? "").trim();
      if (!text || text === name || /^[\d۰-۹][\d۰-۹,]*(\s+\S+)?$/u.test(text)) continue;
      out.push({ text, lang: n.parentElement?.closest("[lang]")?.getAttribute("lang") ?? null });
    }
    return out;
  }, name);
  expect(lines.length, `the "${name}" card's line saying what it is for`).toBeGreaterThan(0);
  for (const { text, lang: marked } of lines) {
    expect(marked, `"${text}" is marked as ${lang}`).toBe(lang);
    if (lang === "ur") expect(text, `"${text}" is written in Urdu`).toMatch(/\p{Script=Arabic}/u);
    else expect(text, `"${text}" is written in English`).toMatch(/^[^\p{Script=Arabic}]*\p{Script=Latin}[^\p{Script=Arabic}]*$/u);
  }
});

async function expectCardCounts(page: Page, name: string, n: number) {
  const text = await exploreCard(page, name).innerText();
  expect(text, `the "${name}" card counts ${n}`).toMatch(new RegExp(`(^|[^\\d۰-۹])(${n}|${n.toLocaleString("en-US")}|${urduDigits(n)})([^\\d۰-۹]|$)`, "u"));
}

Then(`the "Themes" card counts the Theme categories in the Themes file`, async ({ reader }) => {
  await expectCardCounts(reader.page, "Themes", readThemes().categories.length);
});

Then(`the "Roots" card counts every Root of QUL's word root database`, async ({ reader }) => {
  await expectCardCounts(reader.page, "Roots", qulAnalysis().roots.size);
});

Then(`the "Iltifat" card counts the {int} Iltifat directions`, async ({ reader }, n: number) => {
  expect(DIRECTIONS.length, "the Iltifat directions").toBe(n);
  await expectCardCounts(reader.page, "Iltifat", n);
});

When("I follow Explore's {string} card", async ({ reader }, name: string) => {
  const card = exploreCard(reader.page, name);
  await expect(card, `Explore's "${name}" card`).toBeVisible();
  await card.click();
});

Then("the page's own content has a link back to Explore in {language}", async ({ reader }, lang: Language) => {
  const page = reader.page;
  await expect(main(page)).toBeVisible();
  expect(await linkTo(main(page), page, `/${lang}/explore`), `a link to /${lang}/explore in the page's content`).toBeDefined();
});

When("I follow the page's way back to Explore", async ({ reader }) => {
  const page = reader.page;
  await expect(main(page)).toBeVisible();
  // The page's content: <main>, or a head outside it (a Grammar page's, #278), but never the destination bars.
  const body = page.locator("body");
  const link = await linkTo(body, page, `/${langOfAddress(page)}/explore`, body.locator("a[href]:not(nav a)"));
  expect(link, "a link back to Explore in the page's content").toBeDefined();
  await link!.click();
});

// ---------------------------------------------------------------- Me

Given("I open Me in {language}", async ({ reader, reading }, lang: Language) => {
  reading.status = (await reader.page.goto(`/${lang}/me`))?.status();
  reading.lang = lang;
  reading.surah = undefined;
});

/** A shown link or button named exactly `name`. */
const control = (scope: Locator, name: string) =>
  scope.getByRole("link", { name, exact: true }).or(scope.getByRole("button", { name, exact: true })).filter({ visible: true });

/** Every reader setting the Settings drawer held, by the control a reader finds it by. */
const readerSettings = (scope: Locator): [string, Locator][] => [
  [STRINGS.arabicSize, scope.getByRole("group", { name: STRINGS.arabicSize, exact: true })],
  [STRINGS.meaningSize, scope.getByRole("group", { name: STRINGS.meaningSize, exact: true })],
  [STRINGS.resetSizes, scope.getByRole("button", { name: STRINGS.resetSizes, exact: true })],
  [STRINGS.phraseColours, scope.getByRole("switch", { name: STRINGS.phraseColours, exact: true })],
  [STRINGS.allahReferenceColour, scope.getByRole("switch", { name: STRINGS.allahReferenceColour, exact: true })],
  // Hide Word meanings (#256).
  [STRINGS.hideWordMeanings, scope.getByRole("switch", { name: STRINGS.hideWordMeanings, exact: true })],
  [STRINGS.script, scope.getByRole("group", { name: STRINGS.script, exact: true })],
  [STRINGS.translation, scope.getByRole("switch", { name: STRINGS.translation, exact: true })],
  [STRINGS.theme, scope.getByRole("group", { name: STRINGS.theme, exact: true })],
  // Section marks (#194): Hizb quarters or Rukus.
  ["Section marks", scope.getByRole("group", { name: "Section marks", exact: true })],
];

/** Me's Language switch. */
export const languageSwitch = (scope: Locator) => scope.getByRole("group", { name: /^(translation )?language$/i });

Then(
  "Me holds, in order, Sign in, Reading places, Known words, Language, every reader setting, Credits, Privacy and Terms",
  async ({ reader }) => {
    const m = main(reader.page);
    const signIn = control(m, "Sign in");
    const places = m.getByRole("heading", { name: "Reading places", exact: true });
    const knownWords = m.getByRole("link", { name: "Known words", exact: true });
    const language = languageSwitch(m);
    const settings = readerSettings(m);
    const about = ["Credits", "Privacy", "Terms"].map((name) => [name, m.getByRole("link", { name, exact: true })] as const);
    const all: (readonly [string, Locator])[] = [
      ["Sign in", signIn],
      ["Reading places", places],
      ["Known words", knownWords],
      ["Language", language],
      ...settings,
      ...about,
    ];
    for (const [name, l] of all) await expect(l, `Me's ${name}`).toHaveCount(1);
    const inOrder = async (a: readonly [string, Locator], b: readonly [string, Locator]) =>
      expect(await precedes(a[1], b[1]), `${a[0]} before ${b[0]}`).toBe(true);
    await inOrder(all[0], all[1]);
    await inOrder(all[1], all[2]);
    await inOrder(all[2], all[3]);
    // The settings come after the Language and before Credits, in any order among themselves.
    for (const s of settings) {
      await inOrder(all[3], s);
      await inOrder(s, about[0]);
    }
    await inOrder(about[0], about[1]);
    await inOrder(about[1], about[2]);
  },
);

/** Links on Me into the admin area. */
async function adminLinks(page: Page): Promise<Locator[]> {
  const links = main(page).locator("a[href]");
  const found: Locator[] = [];
  for (let i = 0; i < (await links.count()); i++) {
    const path = pathOf(page, await links.nth(i).getAttribute("href"));
    if (path === "/admin" || path.startsWith("/admin/")) found.push(links.nth(i));
  }
  return found;
}

Then("Me offers no link to the admin area", async ({ reader }) => {
  await expect(main(reader.page).getByRole("heading", { level: 1 })).toBeVisible();
  expect((await adminLinks(reader.page)).length, "links to the admin area on Me").toBe(0);
});

Then("Me offers a link to the admin area", async ({ reader }) => {
  await expect(main(reader.page).getByRole("heading", { level: 1 })).toBeVisible();
  // Me is prerendered: it asks whether the Account is an Admin's once it runs in the browser.
  await expect.poll(async () => (await adminLinks(reader.page)).length, { message: "links to the admin area on Me" }).toBeGreaterThan(0);
  const links = await adminLinks(reader.page);
  await expect(links[0]).toBeVisible();
});

When("I follow Me's link to the admin area", async ({ reader }) => {
  const links = await adminLinks(reader.page);
  expect(links.length, "a link to the admin area on Me").toBeGreaterThan(0);
  await links[0].click();
});

Then("Me shows me signed in as {string}", async ({ reader }, email: string) => {
  await expect(main(reader.page).getByText(email, { exact: false }).first(), `Me shows ${email}`).toBeVisible();
});

Then("Me does not offer {string}", async ({ reader }, name: string) => {
  await expect(main(reader.page).getByRole("heading", { level: 1 })).toBeVisible();
  await expect(control(main(reader.page), name), `"${name}" on Me`).toHaveCount(0);
});

When("I follow Me's {string}", async ({ reader }, name: string) => {
  const c = control(main(reader.page), name);
  await expect(c, `Me's "${name}"`).toHaveCount(1);
  await c.click();
});

Then("Me lists these Reading places, newest first:", async ({ reader }, table: DataTable) => {
  const page = reader.page;
  const expected = table.hashes();
  // The Reading places are links into Surah pages, in Me's content.
  const places = main(page).locator("a[href]").filter({ visible: true }).filter({ hasText: /\d+\.\s/ });
  await expect(places, "Me's Reading places").toHaveCount(expected.length);
  for (const [i, { place, link }] of expected.entries()) {
    await expect(places.nth(i), `Reading place ${i + 1}`).toContainText(place);
    expect(pathOf(page, await places.nth(i).getAttribute("href")), `Reading place ${i + 1} leads to`).toBe(link);
  }
});

/** The control in `group` that switches to `lang`. */
export const languageChoice = (group: Locator, lang: Language) =>
  group
    .getByRole("link", { name: LANGUAGE_NAME[lang], exact: true })
    .or(group.getByRole("button", { name: LANGUAGE_NAME[lang], exact: true }))
    .first();

When("I choose {language} on Me's Language switch", async ({ reader }, lang: Language) => {
  const choice = languageChoice(languageSwitch(main(reader.page)), lang);
  await expect(choice, `${lang} on Me's Language switch`).toBeVisible();
  await choice.click();
});

When("I choose {string} on Me's {string} setting", async ({ reader }, option: string, setting: string) => {
  const group = main(reader.page).getByRole("group", { name: setting, exact: true });
  await expect(group, `Me's "${setting}" setting`).toBeVisible();
  await group.getByRole("button", { name: option, exact: true }).click();
  await expect(group.getByRole("button", { name: option, exact: true })).toHaveAttribute("aria-pressed", "true");
});

// ---------------------------------------------------------------- the Reading settings sheet

/** The Surah bar's shown button named `name`. */
const surahBarButton = (page: Page, name: string) => page.getByRole("button", { name, exact: true }).filter({ visible: true }).first();

When("I press the Surah bar's {string} button", async ({ reader }, name: string) => {
  const button = surahBarButton(reader.page, name);
  await expect(button, `the Surah bar's "${name}" button`).toBeVisible();
  await button.click();
});

Then("a modal dialog named {string} is open, holding every reader setting", async ({ reader }, name: string) => {
  const dialog = reader.page.getByRole("dialog", { name, exact: true });
  await expect(dialog, `the "${name}" dialog`).toBeVisible();
  expect(await isModal(dialog), `the "${name}" dialog is modal`).toBe(true);
  for (const [setting, l] of readerSettings(dialog)) await expect(l, `${setting} in the "${name}" dialog`).toHaveCount(1);
});

Then("the Surah bar's {string} button has focus", async ({ reader }, name: string) => {
  await expect(surahBarButton(reader.page, name)).toBeFocused();
});

// ---------------------------------------------------------------- the admin area's way back

When("I follow the admin page's link back to the reading site", async ({ reader }) => {
  const page = reader.page;
  await expect(page.getByRole("heading").first()).toBeVisible();
  const links = page.locator("a[href]");
  for (let i = 0; i < (await links.count()); i++) {
    const link = links.nth(i);
    if (!(await link.isVisible())) continue;
    const href = await link.getAttribute("href");
    if (/^(https?:)?\/\//.test(href ?? "") && new URL(href!, page.url()).origin !== new URL(page.url()).origin) continue;
    if (/^\/((ur|en)\/?)?$/.test(pathOf(page, href))) return link.click();
  }
  throw new Error("the admin page has no link back to the reading site (/, /ur or /en)");
});

Then("I am on a Surah index", async ({ reader }) => {
  await expect.poll(() => new URL(reader.page.url()).pathname, "the address").toMatch(/^\/(ur|en)$/);
});

// ---------------------------------------------------------------- the documents

Then("every link on the page into this site keeps {language} in its address", async ({ reader }, lang: Language) => {
  const page = reader.page;
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  const origin = new URL(page.url()).origin;
  const hrefs = await page.locator("a[href]").evaluateAll((as) => as.map((a) => a.getAttribute("href") ?? ""));
  const into = hrefs
    .filter((h) => !/^(mailto|tel):/.test(h) && !h.startsWith("#"))
    .map((h) => new URL(h, page.url()))
    .filter((u) => u.origin === origin);
  expect(into.length, "links into the site").toBeGreaterThan(0);
  for (const u of into) {
    const marks = [...u.pathname.split("/"), ...u.searchParams.values()];
    expect(marks.includes(lang), `${u.pathname}${u.search} keeps ${lang}`).toBe(true);
    expect(marks.includes(OTHER[lang]), `${u.pathname}${u.search} names no other Language`).toBe(false);
  }
});

When("I follow the page's brand", async ({ reader }) => {
  await brandLink(reader.page).click();
});

When("I follow the page's link {string}", async ({ reader }, name: string) => {
  const link = reader.page.getByRole("link", { name, exact: true }).filter({ visible: true }).first();
  await expect(link, `the link "${name}"`).toBeVisible();
  await link.click();
});

// ---------------------------------------------------------------- the Share page's brand bar

/** The bar holding the brand. */
const brandBar = (page: Page) => page.getByRole("banner").filter({ has: page.getByRole("link", { name: STRINGS.brand, exact: true }) }).first();

Then("the page's bar holds only the brand and the Language switch", async ({ reader }) => {
  const page = reader.page;
  const bar = brandBar(page);
  await expect(bar, "the brand bar").toBeVisible();
  await expect(bar.getByRole("link", { name: STRINGS.brand, exact: true })).toBeVisible();
  await expect(languageSwitch(bar), "the brand bar's Language switch").toBeVisible();
  const allowed = [STRINGS.brand, ...Object.values(LANGUAGE_NAME)];
  for (const name of await controlsOnRowOf(bar)) expect(allowed, `"${name}" on the brand bar`).toContain(name);
});

Then("the brand bar's brand leads to the Surah index in {language}", async ({ reader }, lang: Language) => {
  const href = await brandBar(reader.page).getByRole("link", { name: STRINGS.brand, exact: true }).getAttribute("href");
  expect(pathOf(reader.page, href), "where the brand leads").toBe(`/${lang}`);
});

Then("no destinations are shown, neither a tab bar nor a top bar", async ({ reader }) => {
  const page = reader.page;
  await expect(brandBar(page)).toBeVisible();
  await expect(destinationBars(page).filter({ visible: true }), "a shown set of destinations").toHaveCount(0);
  for (const name of DESTINATIONS) {
    await expect(page.getByRole("link", { name, exact: true }).filter({ visible: true }), `a shown "${name}"`).toHaveCount(0);
  }
});

Then(
  /^the brand bar is drawn in the (light|dark) colour theme, every word on it readable against its background$/,
  async ({ reader }, theme: Theme) => {
    await expectDrawnIn(brandBar(reader.page), theme, "the brand bar");
  },
);

When("I choose {language} on the brand bar's Language switch", async ({ reader, reading }, lang: Language) => {
  const choice = languageChoice(languageSwitch(brandBar(reader.page)), lang);
  await expect(choice, `${lang} on the brand bar's Language switch`).toBeVisible();
  await choice.click();
  reading.lang = lang;
});

Then("the address is {string}", async ({ reader }, path: string) => {
  await expect.poll(() => new URL(reader.page.url()).pathname, "the address").toBe(path);
});

Then(
  "the Share page shows the {language} Ayah translation of each of {ayahs}",
  async ({ reader }, lang: Language, shared: SharedAyahs) => {
    for (let a = shared.from; a <= shared.to; a++) {
      const ayah = `${shared.surah}:${a}`;
      await expect(reader.page.getByText(ayahTranslation(ayah, lang), { exact: true }).first(), `${ayah}'s ${lang} Ayah translation`).toBeVisible();
    }
  },
);

// ---------------------------------------------------------------- a Surah page's one Prev/Next

Then(
  "the page has exactly one link to Surah {int} in {language} and one to Surah {int}, both after the last Ayah of Surah {int}",
  async ({ reader }, prev: number, lang: Language, next: number, surah: number) => {
    const page = reader.page;
    const last = ayahSection(page, `${surah}:${sourceSurahs()[surah - 1].ayahCount}`);
    await expect(last, "the last Ayah").toHaveCount(1);
    for (const n of [prev, next]) {
      const links = page.locator(`a[href="/${lang}/${n}"]`);
      await expect(links, `links to Surah ${n} in ${lang}`).toHaveCount(1);
      expect(await precedes(last, links), `the link to Surah ${n} after the last Ayah`).toBe(true);
    }
  },
);

Then(
  "the link to Surah {int} names it by its Latin name from the Surah metadata, and the link to Surah {int} likewise",
  async ({ reader }, prev: number, next: number) => {
    const lang = langOfAddress(reader.page);
    for (const n of [prev, next]) {
      await expect(reader.page.locator(`a[href="/${lang}/${n}"]`), `the link to Surah ${n}`).toContainText(sourceSurahs()[n - 1].nameLatin);
    }
  },
);

// ---------------------------------------------------------------- the Iltifat pages' in-app links

When("I follow the Iltifat overview's card for {string}", async ({ reader }, name: string) => {
  const page = reader.page;
  const link = await linkTo(main(page), page, `/${langOfAddress(page)}/iltifat/${directionNamed(name).slug}`);
  expect(link, `the Iltifat overview's card for ${name}`).toBeDefined();
  await link!.click();
});

When("I follow the Iltifat page's link to all Iltifat", async ({ reader }) => {
  const page = reader.page;
  const link = await linkTo(main(page), page, `/${langOfAddress(page)}/iltifat`);
  expect(link, "the Iltifat page's link to all Iltifat").toBeDefined();
  await link!.click();
});
