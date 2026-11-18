// Opening Surah pages and reading their Word cards (#2 AC-7, AC-8, AC-13, AC-14).
// Expected Arabic and Word meanings come from the QUL sources (../support).

import { expect, type Page } from "@playwright/test";
import { PHONE, card, cardLocations, expectNoWordLocation, shot, sourceWord, sourceWords, type Language } from "../support";
import { Given, OTHER, Then, When, langOf, resolveColor, surahOf } from "./fixtures";

const SURAHS = Array.from({ length: 114 }, (_, i) => i + 1);

// ---------------------------------------------------------------- opening pages

Given("I open Surah {int} in {language}", async ({ page, reading }, surah: number, lang: Language) => {
  await page.goto(`/${lang}/${surah}`);
  reading.lang = lang;
  reading.surah = surah;
});

Given("I open {string}", async ({ reader, reading }, address: string) => {
  reading.status = (await reader.page.goto(address))?.status();
  // `/ur/2#2:255:3` is Surah 2 in Urdu; `/en/credits` is an English page with no Surah.
  const [, lang, surah] = address.match(/^\/(ur|en)(?:\/(\d+))?/) ?? [];
  reading.lang = lang as Language | undefined;
  reading.surah = surah ? Number(surah) : undefined;
});

Given("the browser is a {word}", async ({ page, reading }, viewport: string) => {
  if (viewport !== "desktop" && viewport !== "phone") throw new Error(`no ${viewport} viewport`);
  // A desktop is the project's own Desktop Chrome viewport (1280×720).
  if (viewport === "phone") await page.setViewportSize(PHONE);
  reading.viewport = viewport;
});

// ---------------------------------------------------------------- the build serves every Surah

Then(
  "each of the 114 Surahs has a page in {language} whose served HTML already holds the Word card of the Surah's first Word",
  async ({ request }, lang: Language) => {
    for (const n of SURAHS) {
      const res = await request.get(`/${lang}/${n}`);
      expect(res.status(), `/${lang}/${n}`).toBe(200);
      // The cards are in the server HTML, not fetched after load (ADR 0001).
      expect(await res.text(), `/${lang}/${n} HTML has card ${n}:1:1`).toContain(`id="${n}:1:1"`);
    }
  },
);

Then("these addresses are not found:", async ({ request }, table) => {
  const paths: string[] = table.raw().flat();
  expect(paths.length).toBeGreaterThan(0);
  for (const path of paths) {
    expect((await request.get(path)).status(), path).toBe(404);
  }
});

// ---------------------------------------------------------------- Word cards

Then(
  "the Word cards are exactly Surah {int}'s Word locations from the QPC Hafs text, in reading order",
  async ({ page }, surah: number) => {
    expect(await cardLocations(page)).toEqual(sourceWords(surah).map((w) => w.location));
  },
);

Then(
  "every Word card shows its Uthmani text and its Word meaning in the page's Language",
  async ({ page, reading }) => {
    const lang = langOf(reading);
    for (const w of sourceWords(surahOf(reading))) {
      const c = card(page, w.location);
      await expect(c.getByText(w.uthmani, { exact: true }), `${w.location} Uthmani`).toBeVisible();
      await expect(c.getByText(w.meaning[lang], { exact: true }), `${w.location} ${lang} meaning`).toBeVisible();
    }
  },
);

Then(
  "no Word card shows a Word meaning in the other Language that differs from its own",
  async ({ page, reading }) => {
    const lang = langOf(reading);
    for (const w of sourceWords(surahOf(reading))) {
      if (w.meaning[OTHER[lang]] !== w.meaning[lang]) {
        await expect(card(page, w.location).getByText(w.meaning[OTHER[lang]], { exact: true })).toHaveCount(0);
      }
    }
  },
);

Then("no Word card shows its Word location, on screen or to a screen reader", async ({ page, reading }) => {
  const words = sourceWords(surahOf(reading));
  expect(await cardLocations(page)).toEqual(words.map((w) => w.location));
  for (const w of words) await expectNoWordLocation(card(page, w.location), w.location);
});

Then("there is exactly one Word card at {location}", async ({ page }, location: string) => {
  await expect(card(page, location)).toHaveCount(1);
});

When("I scroll to the Word card at {location}", async ({ page }, location: string) => {
  await card(page, location).scrollIntoViewIfNeeded();
});

Then(
  "the Word card at {location} shows its Uthmani text and its Word meaning in the page's Language",
  async ({ page, reading }, location: string) => {
    const w = sourceWord(location);
    const c = card(page, w.location);
    await expect(c.getByText(w.uthmani, { exact: true })).toBeVisible();
    await expect(c.getByText(w.meaning[langOf(reading)], { exact: true })).toBeVisible();
  },
);

Then("the Word card at {location} is visible", async ({ reader }, location: string) => {
  await expect(card(reader.page, location)).toBeVisible();
});

// ---------------------------------------------------------------- long Surahs and phones

Then(
  "the Word card at {location} sits in a part of the page, not holding the Word card at {location}, whose content-visibility is auto",
  async ({ page }, location: string, first: string) => {
    // Some ancestor of the card, narrower than the whole Surah, is content-visibility: auto.
    const skipped = await card(page, location).evaluate((el, firstId) => {
      const firstCard = document.getElementById(firstId);
      for (let node = el.parentElement; node && node !== document.body; node = node.parentElement) {
        if (getComputedStyle(node).contentVisibility === "auto" && !node.contains(firstCard)) return true;
      }
      return false;
    }, first);
    expect(skipped).toBe(true);
  },
);

Then("the page does not scroll horizontally", async ({ page }) => {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});

Then(
  "the Word cards of the Surah's first {int} Words are visible and fit within the screen's width",
  async ({ page, reading }, count: number) => {
    const surah = surahOf(reading);
    const width = page.viewportSize()!.width;
    for (const w of sourceWords(surah).slice(0, count)) {
      await expect(card(page, w.location), w.location).toBeVisible();
      const box = await card(page, w.location).boundingBox();
      expect(box, w.location).not.toBeNull();
      expect(box!.x, `${w.location} left`).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width, `${w.location} right`).toBeLessThanOrEqual(width);
    }
    if (surah === 1) await shot(page, `AC-13-surah-1-${langOf(reading)}-light-${reading.viewport}`);
  },
);

// iOS WebKit has shown Word cards laid out narrower than their Word after
// scrolling (cured by a rotation); the Word's Arabic must still never break.
When("every Word card is squeezed narrower than its Word", async ({ page }) => {
  await page.evaluate(() => {
    for (const c of Array.from(document.querySelectorAll<HTMLElement>("[id]")).filter((el) => /^\d+:\d+:\d+$/.test(el.id))) {
      c.style.setProperty("min-width", "0", "important");
      c.style.setProperty("max-width", "24px", "important");
      // Lay out every Ayah, not only those on screen, so every card can be measured.
      c.parentElement!.parentElement!.style.contentVisibility = "visible";
    }
  });
});

Then("every Word card's Arabic is on one line", async ({ page }) => {
  const result = await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll<HTMLElement>("[id]")).filter((el) => /^\d+:\d+:\d+$/.test(el.id));
    const broken: string[] = [];
    for (const c of cards) {
      // The Arabic (in the Uthmani Script, the default) is the card's first line.
      const arabic = c.children[0] as HTMLElement;
      const style = getComputedStyle(arabic);
      const lineHeight = parseFloat(style.lineHeight) || 1.75 * parseFloat(style.fontSize);
      if (arabic.getBoundingClientRect().height > lineHeight * 1.5) broken.push(`${c.id}: "${arabic.textContent}"`);
    }
    return { count: cards.length, broken };
  });
  expect(result.count, "Word cards on the page").toBeGreaterThan(0);
  expect(result.broken).toEqual([]);
});

When("I scroll to the bottom of the page", async ({ page }) => {
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
});

// ---------------------------------------------------------------- deep links

const borderColor = (page: Page, location: string) =>
  card(page, location).evaluate((el) => getComputedStyle(el).borderTopColor);

Then("the Word card at {location} is in the viewport", async ({ page }, location: string) => {
  await expect(card(page, location)).toBeInViewport();
});

Then("the Word card at {location} has the accent colour as its border", async ({ page }, location: string) => {
  const accent = await resolveColor(page, "var(--accent)");
  await expect.poll(() => borderColor(page, location)).toBe(accent);
  await shot(page, `AC-14-deep-link-${location.replaceAll(":", "-")}-light-desktop`);
});

Then(
  "the Word card at {location} does not have the accent colour as its border",
  async ({ page }, location: string) => {
    const accent = await resolveColor(page, "var(--accent)");
    expect(await borderColor(page, location)).not.toBe(accent);
  },
);
