// Steps for listening moving the Reading place (#111). The Recitation and its
// stubbed audio are the Recitation's steps (./recitation.steps.ts); the Reading
// places are read off the Surah index (./reading-place.steps.ts). Here: waiting
// until the Recitation has reached an Ayah, and a second tab in the same
// browser, as a reader keeps two Surahs open at once.

import { expect, type Page } from "@playwright/test";
import { nextFrames } from "../support";
import { type Reader, Then, When } from "./fixtures";
import { noted } from "./recitation.steps";

/** The tab each reader opened first, once a step opened another. */
const firstTabs = new WeakMap<Reader, Page>();

// The Recited Word, the Word card last marked, is one of the Ayah's: the
// Recitation has reached it, by playing on or by being moved there. A reader's
// next act comes after the page has drawn it.
Then("the Recited Word is in Ayah {word}", async ({ reader }, ayah: string) => {
  await expect
    .poll(() => noted(reader.page, (l) => l.recited.at(-1)?.split(":").slice(0, 2).join(":") ?? null), {
      message: `the Recited Word is in Ayah ${ayah}`,
      timeout: 20_000,
    })
    .toBe(ayah);
  await nextFrames(reader.page);
});

// Another tab of the same browser: it shares the browser's storage, and the
// first tab, left where it was, keeps its page open.
When("I open {string} in a new tab", async ({ reader }, address: string) => {
  firstTabs.set(reader, reader.page);
  const tab = await reader.page.context().newPage();
  reader.page = tab;
  await tab.goto(address);
});

When("I turn back to the first tab", async ({ reader }) => {
  const first = firstTabs.get(reader);
  if (!first) throw new Error("no second tab opened in this scenario");
  reader.page = first;
  await first.bringToFront();
});
