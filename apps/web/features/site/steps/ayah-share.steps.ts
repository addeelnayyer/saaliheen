// Sharing Ayahs from the app (#19, rewritten for #56): each Ayah's heading and
// each Passage heading has a share button, and the Surah bar a "Share Ayahs"
// link (the site bar's until #192); each opens a Share page with the edit strip and hands nothing to the
// share sheet or the clipboard. The browser's share sheet and clipboard are
// stood in for before the page loads, so a step can see exactly what was handed
// to them; the Share page's own Share and Copy text use the same stand-ins.

import { expect, type Locator, type Page } from "@playwright/test";
import { STRINGS } from "../support";
import { Given, Then, When, type SharedAyahs } from "./fixtures";
import { neonPassages } from "../passages-in-the-test-database";

/** The Passages of Surah `surah`, in order, as the run's Neon holds them (Surah 18 as arranged, #171). */
const passagesOf = (surah: number) => neonPassages().filter((p) => p.surah_no === surah);
import { fatihahAyahs } from "./reader";

// ---------------------------------------------------------------- the browser's share sheet and clipboard

export type Sheet = "present" | "cancelled" | "absent";
export type Clipboard = "works" | "fails";

/** Stand in for navigator.share and the clipboard on every page `page` opens, recording what they are given. */
export async function standIn(page: Page, sheet: Sheet, clipboard: Clipboard) {
  await page.addInitScript(
    ({ sheet, clipboard }) => {
      const seen = { shared: [] as ShareData[], copied: [] as string[] };
      Object.assign(window, { __seen: seen });
      if (sheet === "absent") {
        delete (Navigator.prototype as { share?: unknown }).share;
      } else {
        Object.defineProperty(Navigator.prototype, "share", {
          configurable: true,
          value: async (data: ShareData) => {
            seen.shared.push(data);
            if (sheet === "cancelled") throw new DOMException("Share canceled", "AbortError");
          },
        });
      }
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: {
          writeText: async (text: string) => {
            if (clipboard === "fails") throw new DOMException("Write permission denied", "NotAllowedError");
            seen.copied.push(text);
          },
        },
      });
    },
    { sheet, clipboard },
  );
}

export const seen = (page: Page) =>
  page.evaluate(() => (window as unknown as { __seen: { shared: ShareData[]; copied: string[] } }).__seen);

Given("my browser has a native share sheet", async ({ reader }) => standIn(reader.page, "present", "works"));
Given("my browser has a native share sheet that I cancel", async ({ reader }) => standIn(reader.page, "cancelled", "works"));
Given("my browser has no native share sheet", async ({ reader }) => standIn(reader.page, "absent", "works"));
Given("my browser has no native share sheet and copying fails", async ({ reader }) => standIn(reader.page, "absent", "fails"));

// ---------------------------------------------------------------- the share buttons

/** A share button: a button, or a link, since each now opens a page. */
const shareControl = (scope: Page | Locator, name: string) =>
  scope.getByRole("button", { name, exact: true }).or(scope.getByRole("link", { name, exact: true }));

export const shareButton = (page: Page, ayah: string) => shareControl(page, STRINGS.shareAyah(ayah));

/** A Passage's share button's name: "Share Passage 18:83–88", or "Share Passage 2:255" for a one-Ayah Passage. */
const sharePassageName = ({ surah, from, to }: SharedAyahs) => `Share Passage ${surah}:${from === to ? from : `${from}–${to}`}`;

Then(
  `each Al-Fatihah Ayah's "Ayah N" heading is a share button named "Share Ayah 1:N" with a share icon`,
  async ({ reader }) => {
    const { page } = reader;
    for (const { number, ayah } of fatihahAyahs()) {
      const button = shareButton(page, ayah);
      await expect(button, `Ayah ${ayah}'s share button`).toBeVisible();
      await expect(button).toHaveText(STRINGS.ayah(number));
      await expect(page.getByRole("heading", { name: STRINGS.shareAyah(ayah), exact: true }), `the heading holding it`).toBeVisible();
      // A user sees something drawn beside the label: the button is clearly wider than "Ayah N" and its padding.
      const room = await button.evaluate((el) => {
        const label = document.createRange();
        label.selectNodeContents(el);
        const text = Array.from(label.getClientRects()).reduce((w, r) => w + r.width, 0);
        const style = getComputedStyle(el);
        return el.getBoundingClientRect().width - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight) - text;
      });
      expect(room, `room beside Ayah ${ayah}'s label for its share icon`).toBeGreaterThan(10);
    }
  },
);

/** The path of the page on screen. */
const pathOf = (page: Page) => new URL(page.url()).pathname;

/**
 * Tap `control` until the browser is on another page, a Share page: a tap
 * before the page has hydrated may do nothing, so a reader taps again.
 */
export async function tapToSharePage(control: Locator) {
  const page = control.page();
  const from = page.url();
  await expect(control, "the control to tap").toHaveCount(1);
  await control.scrollIntoViewIfNeeded();
  await expect(async () => {
    if (page.url() === from) await control.click({ timeout: 2000 });
    await expect.poll(() => page.url(), { timeout: 2000 }).not.toBe(from);
  }, `tapping ${control} opens another page`).toPass({ timeout: 15_000 });
  await expect.poll(() => pathOf(page), `tapping ${control} opens a Share page`).toMatch(/^\/(ur|en)\/share\//);
}

When("I tap the share button of Ayah {word}", async ({ reader }, ayah: string) => {
  await tapToSharePage(shareButton(reader.page, ayah));
});

When("I tap the share button of the Passage {ayahs}", async ({ reader }, passage: SharedAyahs) => {
  await tapToSharePage(shareControl(reader.page.locator("main"), sharePassageName(passage)));
});

/** Whether two boxes share some of the same height on the page: the button is on the heading's line(s). */
const sameRow = (a: { y: number; height: number }, b: { y: number; height: number }) => a.y < b.y + b.height && b.y < a.y + a.height;

Then(
  "each Passage heading of Surah {int} has a share button on it, named for its Passage in the run's database",
  async ({ reader, reading }, surah: number) => {
    const { page } = reader;
    const lang = reading.lang!;
    for (const p of passagesOf(surah)) {
      const passage = { surah, from: p.ayah_from, to: p.ayah_till };
      const title = lang === "ur" ? p.title_ur : p.title_en;
      const heading = page.locator("main").getByRole("heading").filter({ hasText: title }).first();
      const button = shareControl(page.locator("main"), sharePassageName(passage));
      await expect(button, `"${sharePassageName(passage)}"`).toHaveCount(1);
      await button.scrollIntoViewIfNeeded();
      await expect(button).toBeVisible();
      // Polled: the sections around a scrolled-to heading are drawn a frame or two later, moving it.
      await expect
        .poll(async () => sameRow((await button.boundingBox())!, (await heading.boundingBox())!), {
          message: `"${sharePassageName(passage)}" is on the Passage heading "${title}"`,
        })
        .toBe(true);
    }
  },
);

Then("there is no Passage share button", async ({ reader }) => {
  const main = reader.page.locator("main");
  await expect(main.getByRole("button", { name: /^Share Passage / }).or(main.getByRole("link", { name: /^Share Passage / }))).toHaveCount(0);
});

/** The Surah bar: the bar holding the slim row, whose full form has the tools row with "Share Ayahs" (#192). */
const surahBar = (page: Page) => page.locator("div:has(> [data-slim-row])");

When("I follow the Surah bar's {string} link", async ({ reader }, name: string) => {
  await tapToSharePage(surahBar(reader.page).getByRole("link", { name, exact: true }));
});

When("I follow {string} below the frame", async ({ reader }, name: string) => {
  await tapToSharePage(reader.page.getByRole("link", { name, exact: true }));
});

// ---------------------------------------------------------------- what was shared

Then("the share sheet did not open", async ({ reader }) => {
  expect((await seen(reader.page)).shared).toEqual([]);
});

Then("the share sheet opened once", async ({ reader }) => {
  expect((await seen(reader.page)).shared).toHaveLength(1);
});

Then("nothing was copied to the clipboard", async ({ reader }) => {
  expect((await seen(reader.page)).copied).toEqual([]);
});

// ---------------------------------------------------------------- the copy message

const MESSAGES = [STRINGS.copied, STRINGS.copyFailed];

Then("the copy message {string} is shown", async ({ reader }, message: string) => {
  const status = reader.page.getByRole("status").filter({ hasText: message });
  await expect(status).toHaveText(message);
  await expect(status).toBeVisible();
});

Then("no copy message is shown", async ({ reader }) => {
  for (const message of MESSAGES) await expect(reader.page.getByText(message, { exact: true })).toBeHidden();
});

Then("the copy message soon goes away", async ({ reader }) => {
  for (const message of MESSAGES) await expect(reader.page.getByText(message, { exact: true })).toBeHidden({ timeout: 5000 });
});
