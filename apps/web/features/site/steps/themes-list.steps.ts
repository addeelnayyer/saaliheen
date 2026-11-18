// Steps for the Themes list (#130). Theme names in English come from the
// feature (the issue's words); Urdu names, Theme categories, which Themes each
// holds and every Ayah count come from the Themes file (./themes). Things are
// found by role, link address and visible text.
//
// The Themes list's shape these steps expect (PROPOSED, #130 stage 1): an <h1>
// "Themes"; each Theme category an <h2> with its name in the Language, followed
// by its Themes, each one link to /{lang}/themes/{slug} holding the Theme's name
// (in an element carrying the Language's lang) and "<n> ayahs". Explore's
// "Themes" card leads to /{lang}/themes (the Surah index's link went in #193).

import { expect, type Page } from "@playwright/test";
import { LANGUAGES, PHONE, urduDigits, type Language } from "../support";
import { Then, When, resolveColor } from "./fixtures";
import { PAPER, bodyBackground, type Theme } from "./reader";
import { ayahsOf, nameIn, readThemes, themeNamed } from "./themes";

const listAddress = (lang: Language) => `/${lang}/themes`;
const themeAddress = (lang: Language, slug: string) => `/${lang}/themes/${slug}`;
const countPattern = (n: number) => new RegExp(`(?:^|\\s)(?:${n}|${urduDigits(n)}) ayahs?(?:\\s|$)`);

/** What the Themes list shows, in page order: each <h2> category and the Theme links under it. */
async function shownCategories(page: Page) {
  const main = page.locator("main").first();
  await expect(main.getByRole("heading", { level: 2 }).first(), "a Theme category's heading on the Themes list").toBeVisible();
  return main.evaluate((main) => {
    const themeLink = /^\/(ur|en)\/themes\/[^/#?]+$/;
    const text = (el: Element) => (el.textContent ?? "").replace(/\s+/g, " ").trim();
    const langOf = (el: Element) => el.closest("[lang]")?.getAttribute("lang") ?? "";
    const isThemeLink = (el: Element) => themeLink.test(el.getAttribute("href") ?? "");
    const themeOf = (el: Element) => ({
      href: el.getAttribute("href")!,
      text: text(el),
      names: Array.from(el.querySelectorAll("*"))
        .map((n) => ({ text: text(n), lang: langOf(n) }))
        .filter((n) => n.text),
    });
    const categories: { name: string; lang: string; themes: ReturnType<typeof themeOf>[] }[] = [];
    for (const el of Array.from(main.querySelectorAll("h2, a[href]"))) {
      if (el.tagName === "H2") categories.push({ name: text(el), lang: langOf(el), themes: [] });
      else if (categories.length && isThemeLink(el)) categories.at(-1)!.themes.push(themeOf(el));
    }
    return categories;
  });
}

// ---------------------------------------------------------------- AC-1: static pages

Then("the Themes list in Urdu and in English is served as a static page from Next's cache, setting no cookie", async ({ reader }) => {
  for (const lang of LANGUAGES) {
    const address = listAddress(lang);
    const res = await reader.page.request.get(address, { maxRedirects: 0 });
    const headers = res.headers();
    expect(res.status(), address).toBe(200);
    expect(headers["x-nextjs-prerender"] ?? "", `${address} is a prerendered page`).toMatch(/1/);
    expect(headers["set-cookie"], `${address} sets no cookie`).toBeUndefined();
  }
});

Then(
  "the served HTML of the Themes list in each Language links to the Theme page of every Theme in the Themes file",
  async ({ reader }) => {
    const slugs = readThemes().themes.map((t) => t.slug);
    expect(slugs.length, "Themes in the Themes file").toBe(258);
    for (const lang of LANGUAGES) {
      const html = await (await reader.page.request.get(listAddress(lang))).text();
      for (const slug of slugs) expect(html, `${listAddress(lang)} HTML links to ${themeAddress(lang, slug)}`).toContain(`href="${themeAddress(lang, slug)}"`);
    }
  },
);

// ---------------------------------------------------------------- AC-2: reached from Explore (#193)

Then("I am on the Themes list in {language}", async ({ reader }, lang: Language) => {
  await expect.poll(() => new URL(reader.page.url()).pathname).toBe(listAddress(lang));
  await expect(reader.page.getByRole("heading", { level: 1 })).toBeVisible();
});

// ---------------------------------------------------------------- AC-3: categories, Themes and counts

Then("the Themes list's heading is {string}", async ({ reader }, title: string) => {
  await expect(reader.page.getByRole("heading", { level: 1 })).toHaveText(title);
});

Then(
  "the Themes list shows the 13 Theme categories of the Themes file, in its order, each named in {language}",
  async ({ reader }, lang: Language) => {
    const categories = readThemes().categories;
    expect(categories.length, "Theme categories in the Themes file").toBe(13);
    const shown = await shownCategories(reader.page);
    expect(shown.map((c) => c.name), "the Theme categories' headings").toEqual(categories.map((c) => c[lang]));
    for (const c of shown) expect(c.lang, `the Theme category "${c.name}" is marked as ${lang}`).toBe(lang);
  },
);

Then(
  "under each Theme category the Themes list lists exactly that category's Themes from the Themes file, each named in {language}",
  async ({ reader }, lang: Language) => {
    const file = readThemes();
    const shown = await shownCategories(reader.page);
    expect(shown.length, "Theme categories shown").toBe(file.categories.length);
    file.categories.forEach((category, i) => {
      const expected = file.themes.filter((t) => t.category === category.slug);
      const listed = shown[i].themes;
      expect(listed.map((t) => t.href).sort(), `the Themes under "${category.en}"`).toEqual(expected.map((t) => themeAddress(lang, t.slug)).sort());
      for (const t of expected) {
        const link = listed.find((l) => l.href === themeAddress(lang, t.slug))!;
        const name = link.names.find((n) => n.text === t[lang]);
        expect(name, `"${t.en}" is named "${t[lang]}" on its link`).toBeDefined();
        expect(name!.lang, `"${t.en}"'s name is marked as ${lang}`).toBe(lang);
      }
    });
  },
);

Then("each Theme on the Themes list shows its count of Ayahs from the Themes file", async ({ reader }) => {
  const lang = reader.language;
  const shown = (await shownCategories(reader.page)).flatMap((c) => c.themes);
  const themes = readThemes().themes;
  expect(shown.length, "Themes shown").toBe(themes.length);
  for (const t of themes) {
    const n = ayahsOf(t.slug).length;
    expect(n, `"${t.en}" has Ayahs`).toBeGreaterThan(0);
    const link = shown.find((l) => l.href === themeAddress(lang, t.slug));
    expect(link?.text ?? "", `"${t.en}" shows "${n} ayahs"`).toMatch(countPattern(n));
  }
});

// ---------------------------------------------------------------- AC-4: each Theme opens its Theme page

Then(
  "every Theme of the Themes file has one link on the Themes list, to {string} and its slug, named with its name in {language}",
  async ({ reader }, prefix: string, lang: Language) => {
    expect(prefix, "the Theme pages' address").toBe(`${listAddress(lang)}/`);
    const main = reader.page.locator("main").first();
    for (const t of readThemes().themes) {
      const links = main.locator(`a[href="${prefix}${t.slug}"]`);
      await expect(links, `one link to ${prefix}${t.slug}`).toHaveCount(1);
      await expect(links, `the link to "${t.en}" is named with "${t[lang]}"`).toHaveAccessibleName(new RegExp(t[lang].replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    }
  },
);

When("I follow the Themes list's link to {string}", async ({ reader }, en: string) => {
  const lang = reader.language;
  const { slug } = themeNamed(en);
  const link = reader.page.locator("main").first().locator(`a[href="${themeAddress(lang, slug)}"]`);
  await expect(link, `the Themes list's link to "${nameIn(en, lang)}"`).toHaveCount(1);
  await link.click();
  // An in-app link (#131): the list stays on screen until the Theme page has arrived.
  await expect(reader.page).toHaveURL((url) => url.pathname === themeAddress(lang, slug));
});

// ---------------------------------------------------------------- AC-5: keyboard, colour themes, phone width

When("I press Tab until the link to {string} has the focus", async ({ reader }, href: string) => {
  const page = reader.page;
  // The one shown: a page may hold a second, hidden copy (the top bar's destinations below 900px, #192).
  const target = page.locator(`a[href="${href}"]:visible`).first();
  await expect(target, `a link to ${href}`).toBeAttached();
  for (let i = 0; i < 400; i++) {
    if (await target.evaluate((el) => el === document.activeElement)) return;
    await page.keyboard.press("Tab");
  }
  throw new Error(`Tab never reached the link to ${href}`);
});

Then("the focused link shows a focus ring", async ({ reader }) => {
  const ring = await reader.page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null;
    if (!el || el.tagName !== "A") return null;
    const s = getComputedStyle(el);
    return { outline: s.outlineStyle !== "none" && parseFloat(s.outlineWidth) > 0, shadow: s.boxShadow !== "none", visible: el.matches(":focus-visible") };
  });
  expect(ring, "a link has the focus").not.toBeNull();
  expect(ring!.visible, "the link is focused as the keyboard focuses it").toBe(true);
  expect(ring!.outline || ring!.shadow, "the focused link draws a ring").toBe(true);
});

When("I view the Themes list on a {word}", async ({ reader }, viewport: string) => {
  if (viewport !== "desktop" && viewport !== "phone") throw new Error(`no ${viewport} viewport`);
  if (viewport === "phone") await reader.page.setViewportSize(PHONE);
});

Then("every Theme name on the Themes list lies within the screen's width", async ({ reader }) => {
  const page = reader.page;
  const width = page.viewportSize()!.width;
  const outside = await page
    .locator("main")
    .first()
    .locator('a[href*="/themes/"]')
    .evaluateAll(
      (links, width) =>
        links
          .map((a) => ({ href: a.getAttribute("href"), box: a.getBoundingClientRect() }))
          .filter(({ box }) => box.left < 0 || box.right > width)
          .map(({ href }) => href),
      width,
    );
  expect(outside, "Theme links reaching past the screen's edges").toEqual([]);
});

Then("the Themes list is drawn on the {theme} paper", async ({ reader }, theme: Theme) => {
  const expected = await resolveColor(reader.page, PAPER[theme]);
  await expect.poll(() => bodyBackground(reader.page)).toBe(expected);
});
