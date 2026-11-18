// Steps for the Reading places (#69): scrolling a Surah page as a reader does,
// and the Surah index's Continue reading links, one per Reading place, newest
// first. The Reading places are read only through what the pages show, never
// from storage. The one exception is a browser that saved a single Reading
// place before there were Reading places (#69 AC-5): that browser's storage is
// set up as the site before #69 left it, under its old name and form.

import { expect, type Page } from "@playwright/test";
import type { DataTable } from "playwright-bdd";
import { ayahAtTop, ayahSection, clickInPlace, nextFrames } from "../support";
import { Given, Then, When } from "./fixtures";
import { indexPanel } from "./index-tabs";

/** Every Continue reading link on the Surah index, in page order: one per Reading place. */
const continueReading = (page: Page) => page.getByRole("link", { name: /^Continue reading/ });

/** The Continue reading link of one Reading place, by what it shows: "18. Al-Kahf · Ayah 45". */
const continueReadingAt = (page: Page, place: string) =>
  page.getByRole("link", { name: `Continue reading ${place}`, exact: true });

// The Ayahs above render at their real heights only once on screen
// (content-visibility), which can shift the page after the scroll: scroll
// again until it holds, as a reader nudging the page would. A reader scrolls
// with the wheel, a touch or a key, which takes the page over from a landing
// still seating the Ayah it opened at; the scroll here starts with a wheel event.
/** After the Surah bar has heard the last scroll and finished sliding to the form it chose. */
async function barSettled(page: Page) {
  await nextFrames(page);
  await page.evaluate(() => document.getAnimations().forEach((a) => a instanceof CSSTransition && a.finish()));
}

When("I scroll until Ayah {word} is at the top of the screen", async ({ reader }, ayah: string) => {
  await expect
    .poll(async () => {
      await ayahSection(reader.page, ayah).evaluate((el) => {
        window.dispatchEvent(new WheelEvent("wheel"));
        // An Ayah section with no box of its own is scrolled to by its first Word; one set inline (Flowing) by its first line.
        (el.getClientRects().length > 0 ? el : document.getElementById(`${el.id}:1`)!).scrollIntoView({ block: "start" });
      });
      // That clears the Surah bar's mini form. Once the bar has taken the form
      // the scroll gives it, a full form (scrolled up) is cleared too, scrolling
      // on up, which keeps it full.
      await barSettled(reader.page);
      await reader.page.evaluate(() => {
        const below = Math.max(0, document.querySelector('nav[aria-label="Surah"]')?.getBoundingClientRect().top ?? 0);
        if (below > 0) window.scrollBy({ top: -below, behavior: "instant" });
      });
      await barSettled(reader.page);
      return ayahAtTop(reader.page);
    })
    .toBe(ayah);
  // A reader's next act comes after the page has drawn where they scrolled to:
  // the Reading place tracker notes the Ayah at the top once a frame.
  await nextFrames(reader.page);
});

Then("Ayah {word} is at the top of the screen", async ({ reader }, ayah: string) => {
  await expect.poll(() => ayahAtTop(reader.page)).toBe(ayah);
});

Then("the Surah index offers no Continue reading", async ({ reader }) => {
  // The index is on screen, and nothing offers to continue. Its Surahs tab's
  // Al-Fatihah, as Juz 1's row on the Juz tab names Al-Fatihah too (#193).
  await expect(indexPanel(reader.page, "Surahs").getByRole("link", { name: /Al-Fatihah/ })).toBeVisible();
  await expect(continueReading(reader.page)).toHaveCount(0);
});

// The browser's Reading places are exactly this one: the Surah index offers to continue from it and from nothing else.
Then(
  "the Surah index offers Continue reading only at {string}, linking to {string}",
  async ({ reader }, place: string, href: string) => {
    const link = continueReadingAt(reader.page, place);
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute("href", href);
    await expect(continueReading(reader.page)).toHaveCount(1);
  },
);

// The browser's Reading places, newest first: one Continue reading link each, in this order, and no others.
Then("the Surah index lists these Reading places, newest first:", async ({ reader }, table: DataTable) => {
  const expected = table.hashes();
  const links = continueReading(reader.page);
  // Only the browser knows its Reading places: the links appear once the index is running.
  await expect(links, "the Surah index's Reading places").toHaveCount(expected.length);
  for (const [i, { place, link }] of expected.entries()) {
    await expect(links.nth(i), `Reading place ${i + 1}`).toHaveAccessibleName(`Continue reading ${place}`);
    await expect(links.nth(i), `Reading place ${i + 1}`).toHaveAttribute("href", link);
    await expect(links.nth(i)).toBeVisible();
  }
});

When("I follow Continue reading", async ({ reader }) => {
  await continueReading(reader.page).click();
});

When("I follow Continue reading at {string}", async ({ reader }, place: string) => {
  const link = continueReadingAt(reader.page, place);
  await expect(link, `Continue reading ${place}`).toBeVisible();
  await link.click();
});

// The sticky bar's brand link: on screen wherever the reader is, so following it scrolls nothing.
When("I follow the Saaliheen link in the bar", async ({ reader }) => {
  await clickInPlace(reader.page.getByRole("link", { name: /Saaliheen/ }).first());
});

// Before #69 a browser kept one Reading place, stored as `surah:ayah` under
// `qwt-reading-place`. Set it once, before the site's first page in this
// browser runs, as a browser the site left before #69 would hold it; a later
// page finds whatever the site has made of it since.
Given(
  "this browser saved the single Reading place {word} before there were Reading places",
  async ({ reader }, place: string) => {
    await reader.page.addInitScript((place) => {
      if (sessionStorage.getItem("qwt-test-old-reading-place-set")) return;
      sessionStorage.setItem("qwt-test-old-reading-place-set", "1");
      localStorage.setItem("qwt-reading-place", place);
    }, place);
  },
);
