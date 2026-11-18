// Steps for opening a large Theme page from inside the app (#131): its header
// and first Passage groups at once, a skeleton for the rest, the rest arriving
// in Theme parts, and a direct load, reload or crawl still getting every Ayah
// in its HTML. The parts are held back through the same interception as the
// Surah parts (./parts-server); Ayahs, Passage groups and Ayah translations
// come from the Themes file, the Passages file and the sources.
//
// What these steps expect of the page (PROPOSED, #131 stage 1): the Theme page
// opened in parts keeps the shape theme-pages.steps.ts reads (an <h1>, each
// Passage group an <h2> link, each Ayah a list item with its link
// /{lang}/{s}#{s}:{a}); while parts are still to come its <main> is
// aria-busy="true" and holds the skeleton's [data-skeleton] rows, as the Surah
// opening's does; the Theme parts are fetched from addresses under /parts/.

import { expect, type Page } from "@playwright/test";
import { ayahTranslation, type Language } from "../support";
import { Given, Then, When } from "./fixtures";
import { partsServer, requestedParts } from "./parts-server";
import { groupHref, shownGroups } from "./theme-pages.steps";
import { ayahsOf, groupsOf, themeNamed } from "./themes";

const reading = (page: Page) => page.locator("main").first();
const skeleton = (page: Page) => page.locator("main [data-skeleton]");

/** The Ayahs (`s:a`) a page's HTML links to as Theme page Ayahs: `href="/{lang}/{s}#{s}:{a}"`. */
const ayahsInHtml = (html: string) => new Set([...html.matchAll(/ href="\/(?:ur|en)\/\d+#(\d+:\d+)"/g)].map((m) => m[1]));

function expectEveryAyah(html: string, en: string) {
  const shown = ayahsInHtml(html);
  const expected = ayahsOf(themeNamed(en).slug);
  expect(expected.length).toBeGreaterThan(0);
  expect(expected.filter((a) => !shown.has(a)), `Ayahs of "${en}" missing from the HTML`).toEqual([]);
}

/** The Theme page's Ayahs on screen, in order, as `s:a`. */
const shownAyahs = async (page: Page) =>
  (await shownGroups(page)).flatMap((g) => g.ayahs.map((href) => decodeURIComponent(href.split("#")[1])));

// ---------------------------------------------------------------- the server

Given("the server holds back every part of a Theme", async ({ reader }) => {
  await partsServer(reader.page, "hold");
});

// ---------------------------------------------------------------- getting around

When("I go back", async ({ reader }) => {
  await reader.page.evaluate(() => history.back());
});

When("I go forward", async ({ reader }) => {
  await reader.page.evaluate(() => history.forward());
});

When("I follow the top bar's link to the Surah index", async ({ reader }) => {
  const lang = reader.language;
  const from = reader.page.url();
  await reader.page.getByRole("banner").getByRole("link").and(reader.page.locator(`[href="/${lang}"]`)).first().click();
  await expect(reader.page).not.toHaveURL(from);
});

const reloads = new WeakMap<Page, string>();

When("I reload the Theme page", async ({ reader }) => {
  const res = await reader.page.reload();
  expect(res, "the reload got a response").not.toBeNull();
  expect(res!.status()).toBe(200);
  reloads.set(reader.page, await res!.text());
});

// ---------------------------------------------------------------- what the page shows

Then("the Theme's loading skeleton is shown", async ({ reader }) => {
  await expect(skeleton(reader.page).first()).toBeVisible();
  await expect(reading(reader.page)).toHaveAttribute("aria-busy", "true");
});

// Once every part has arrived: nothing busy, no skeleton left. A page loaded whole is never busy.
Then("the Theme page has finished loading", async ({ reader }) => {
  await expect(reading(reader.page)).not.toHaveAttribute("aria-busy", "true", { timeout: 30_000 });
  await expect(skeleton(reader.page)).toHaveCount(0);
});

Then(
  "the Theme page shows the first Passage group of {string} from the Themes file, with its Ayahs",
  async ({ reader }, en: string) => {
    const lang = reader.language;
    const first = groupsOf(themeNamed(en).slug)[0];
    const shown = await shownGroups(reader.page);
    expect(shown.length, "Passage groups shown").toBeGreaterThan(0);
    expect({ href: shown[0].href, ayahs: shown[0].ayahs }).toEqual({
      href: groupHref(lang, first),
      ayahs: first.ayahs.map((a) => `/${lang}/${first.surah}#${first.surah}:${a}`),
    });
  },
);

Then("the Theme page does not yet list every Ayah of {string}", async ({ reader }, en: string) => {
  expect((await shownAyahs(reader.page)).length).toBeLessThan(ayahsOf(themeNamed(en).slug).length);
});

Then("the Theme page filled in from more than one part", async ({ reader }) => {
  expect(requestedParts(reader.page).length, "Theme parts requested").toBeGreaterThan(1);
});

/** Every string a parsed JSON value holds, however deep. */
const strings = (value: unknown): string[] =>
  typeof value === "string" ? [value] : value && typeof value === "object" ? Object.values(value).flatMap(strings) : [];

Then(
  "each Theme part the page fetched is a static JSON file holding Ayah translations of {string} in {language} only",
  async ({ reader }, en: string, lang: Language) => {
    const other: Language = lang === "ur" ? "en" : "ur";
    const fetched = [...new Set(requestedParts(reader.page))];
    expect(fetched.length, "Theme parts fetched").toBeGreaterThan(0);
    const ayahs = ayahsOf(themeNamed(en).slug);
    let held = "";
    for (const address of fetched) {
      const res = await reader.page.request.get(address);
      expect(res.status(), address).toBe(200);
      expect(res.headers()["content-type"] ?? "", `${address} is JSON`).toContain("application/json");
      expect(res.headers()["set-cookie"], `${address} sets no cookie`).toBeUndefined();
      // Prerendered at build, as the Surah parts are: the same bytes on every request.
      const again = await reader.page.request.get(address);
      expect(await again.text(), `${address} is the same file twice`).toBe(await res.text());
      held += `\n${strings(await res.json()).join("\n")}`;
    }
    // The last Ayah of the Theme is in a later part, never the first, for a Theme that loads in parts.
    expect(held, `the ${lang} Ayah translation of ${ayahs.at(-1)}`).toContain(ayahTranslation(ayahs.at(-1)!, lang));
    const foreign = ayahs.filter((a) => held.includes(ayahTranslation(a, other)));
    expect(foreign, `Ayah translations in the other Language`).toEqual([]);
  },
);

// A browser loading the page itself, not the app moving to it, asks for no RSC payload (no `rsc` header).
Then(
  "the page {string} as loaded directly carries every Ayah of {string}",
  async ({ request }, address: string, en: string) => {
    const res = await request.get(address);
    expect(res.status()).toBe(200);
    expectEveryAyah(await res.text(), en);
  },
);

Then(
  "the page {string} as a search engine crawls it carries every Ayah of {string}",
  async ({ request }, address: string, en: string) => {
    const res = await request.get(address, {
      headers: { "user-agent": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)" },
    });
    expect(res.status()).toBe(200);
    expectEveryAyah(await res.text(), en);
  },
);

Then("the HTML the reload got carries every Ayah of {string}", async ({ reader }, en: string) => {
  const html = reloads.get(reader.page);
  expect(html, "the page was reloaded").toBeDefined();
  expectEveryAyah(html!, en);
});

// ---------------------------------------------------------------- where the page is

/** The Theme page's Ayah at the top of the reading area, below the sticky bar (html's scroll-padding-top), as `s:a`. */
const themeAyahAtTop = (page: Page) =>
  reading(page).evaluate((main) => {
    const top = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
    const ayahLink = /^\/(?:ur|en)\/\d+#(\d+:\d+)$/;
    for (const item of Array.from(main.querySelectorAll("li"))) {
      const link = Array.from(item.querySelectorAll("a[href]")).find((a) => ayahLink.test(a.getAttribute("href") ?? ""));
      if (!link || item.getBoundingClientRect().bottom <= top + 4) continue;
      return ayahLink.exec(link.getAttribute("href")!)![1];
    }
    return null;
  });

/** The list item of the Theme page's Ayah `ayah` (`s:a`), found by its link. */
const themeAyah = (page: Page, ayah: string) =>
  reading(page).locator("li").filter({ has: page.locator(`a[href$="/${ayah.split(":")[0]}#${ayah}"]`) }).first();

When("I scroll until the Theme page's Ayah {word} is at the top of the screen", async ({ reader }, ayah: string) => {
  await expect(themeAyah(reader.page, ayah), `the Theme page's Ayah ${ayah}`).toBeAttached({ timeout: 30_000 });
  await expect
    .poll(async () => {
      await themeAyah(reader.page, ayah).evaluate((el) => {
        // A reader scrolls with the wheel, which takes the page over from any landing still under way.
        window.dispatchEvent(new WheelEvent("wheel"));
        el.scrollIntoView({ block: "start" });
      });
      return themeAyahAtTop(reader.page);
    })
    .toBe(ayah);
});

Then("the Theme page's Ayah {word} is at the top of the screen", async ({ reader }, ayah: string) => {
  await expect.poll(() => themeAyahAtTop(reader.page), { timeout: 30_000 }).toBe(ayah);
});
