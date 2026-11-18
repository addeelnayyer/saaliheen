// Steps for #20: the Root dialog's pinned head, and the page beneath it holding
// still while it is open. The page is scrolled as a reader does: by mouse
// wheel, and by touch swipes Chromium synthesises as a finger would make them.
// And #324's: the tapped Word's Spelling brought into view once the Root's
// file has loaded, and the dialog holding still after that.

import { expect, type Locator, type Page } from "@playwright/test";
import { card } from "../support";
import { Given, STRINGS, Then, When, resolveColor, type PageAt, type Reading } from "./fixtures";
import { lemmaRows, qulRootNamed, rootAt, rootDialog, rootTag } from "./roots";

/** The Root dialog's head: the banner at its top. */
const head = (page: Page) => rootDialog(page).locator("header");

/** Let two frames pass, so scroll events and anything they set off have been handled. */
const settle = (page: Page) =>
  page.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))));

/** How far the Root dialog's Lemmas are scrolled. */
const dialogScrollTop = (page: Page) => rootDialog(page).evaluate((el) => el.scrollTop);

/** Where the page is now: the page's laid-out width, the first Word card's place across it, and the stored Reading places. */
const pageAt = (page: Page): Promise<PageAt> =>
  page.evaluate(() => {
    // The Reading places as `surah:ayah`s, newest first, without the times they were read (#69):
    // a Reading place stored again where it was is unchanged.
    const readingPlaces = () => {
      const stored = localStorage.getItem("qwt-reading-places");
      try {
        return (JSON.parse(stored ?? "null") as { surah: number; ayah: number }[] | null)?.map((p) => `${p.surah}:${p.ayah}`).join(" ") ?? null;
      } catch {
        return stored;
      }
    };
    const first = document.querySelector("main [id*=':']")!;
    return {
      y: window.scrollY,
      width: document.body.getBoundingClientRect().width,
      cardX: first.getBoundingClientRect().left,
      form: document.querySelector("[data-form]")?.getAttribute("data-form") ?? null,
      place: readingPlaces(),
    };
  });

/** The centre of a part of the screen `dialog` does not cover: the backdrop. */
export async function backdropPoint(dialog: Locator) {
  const page = dialog.page();
  const box = (await dialog.boundingBox())!;
  const { width, height } = page.viewportSize()!;
  // Below the dialog if there is room there, else beside it.
  const below = height - (box.y + box.height);
  return below > 20 ? { x: width / 2, y: box.y + box.height + below / 2 } : { x: box.x / 2, y: height / 2 };
}

export async function centreOf(locator: Locator) {
  const box = (await locator.boundingBox())!;
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

// ---------------------------------------------------------------- the pinned head

When("I scroll the Root/Particle dialog's Lemmas/Spellings {word} by {int} pixels", async ({ reader }, way: string, dy: number) => {
  const page = reader.page;
  if (way !== "down" && way !== "up") throw new Error(`scroll "down" or "up", not "${way}"`);
  const top = way === "down" ? dy : -dy;
  await rootDialog(page).evaluate((el, top) => el.scrollBy({ top, behavior: "instant" }), top);
  await settle(page);
});

When("I scroll the Root/Particle dialog's Lemmas/Spellings back to the top", async ({ reader }) => {
  const page = reader.page;
  await rootDialog(page).evaluate((el) => el.scrollTo({ top: 0, behavior: "instant" }));
  await settle(page);
});

Then(
  "the Root dialog's head is pinned at its top, showing its label, its close button, {string} and {string}",
  async ({ reader }, translit: string, letters: string) => {
    const page = reader.page;
    const dialog = rootDialog(page);
    expect(await dialogScrollTop(page), "the Lemmas have scrolled").toBeGreaterThan(0);
    const [d, h] = [(await dialog.boundingBox())!, (await head(page).boundingBox())!];
    expect(Math.abs(h.y - d.y), "the head's top is the dialog's top").toBeLessThan(1);
    for (const part of [
      head(page).getByText("Root", { exact: true }),
      head(page).getByRole("button", { name: STRINGS.close }),
      head(page).getByText(translit, { exact: true }),
      head(page).getByText(letters, { exact: true }),
    ]) {
      await expect(part).toBeVisible();
      const box = (await part.boundingBox())!;
      expect(box.y, `${await part.textContent()} is inside the dialog`).toBeGreaterThanOrEqual(d.y);
    }
    // Nothing that scrolled beneath the head shows through it: the head is what is on top at its middle.
    const { x, y } = await centreOf(head(page));
    expect(await head(page).evaluate((el, [x, y]) => el.contains(document.elementFromPoint(x, y)), [x, y])).toBe(true);
  },
);

const headLine = (page: Page) =>
  head(page).evaluate((el) => {
    const style = getComputedStyle(el);
    return { width: parseFloat(style.borderBottomWidth), color: style.borderBottomColor };
  });

Then("the Root/Particle dialog's head has a line under it", async ({ reader }) => {
  const page = reader.page;
  const line = await headLine(page);
  expect(line.width, "the line's width").toBe(1);
  expect(line.color, "the line is var(--line)").toBe(await resolveColor(page, "var(--line)"));
});

Then("the Root/Particle dialog's head has no line under it", async ({ reader }) => {
  const page = reader.page;
  const line = await headLine(page);
  const transparent = line.width === 0 || /rgba\(.*,\s*0\)$/.test(line.color) || line.color === "transparent";
  expect(transparent, `the head's bottom border, ${line.width}px ${line.color}`).toBe(true);
});

// ---------------------------------------------------------------- the page beneath holds still

Given("I open {string} on a desktop whose scrollbar takes up room, as on Windows", async ({ reader }, address: string) => {
  await reader.openWithScrollbars(address);
  const room = await reader.page.evaluate(() => window.innerWidth - document.documentElement.clientWidth);
  expect(room, "the scrollbar's width").toBe(15);
});

When("I turn the mouse wheel down by {int} pixels over the page", async ({ reader }, dy: number) => {
  const page = reader.page;
  const { width, height } = page.viewportSize()!;
  await page.mouse.move(width / 2, height / 2);
  await page.mouse.wheel(0, dy);
  // The page comes to rest near `dy`, not on it: the browser shifts it as the
  // Ayahs where it lands lay out (#37). At rest once scrollY holds for 300ms.
  await page.waitForFunction(
    (dy) =>
      new Promise<boolean>((done) => {
        const y = window.scrollY;
        setTimeout(() => done(y > dy / 2 && window.scrollY === y), 300);
      }),
    dy,
  );
  await settle(page);
});

When("I note where the page is", async ({ reader, reading }) => {
  const page = reader.page;
  await settle(page);
  // The Reading place is stored once scrolling stops; wait for it, so a renamed storage key cannot pass unnoticed.
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem("qwt-reading-places")), "the stored Reading places")
    .not.toBeNull();
  reading.pageAt = await pageAt(page);
});

When("I open the first Root tag on screen", async ({ reader, reading }) => {
  const page = reader.page;
  // The first Word card wholly on screen below the Surah bar that has a Root tag,
  // and below the page's scroll padding too: Playwright scrolls a tag inside it
  // into view before clicking, and the page would move for the click, not the dialog.
  const location = await page.evaluate(() => {
    const bar = document.querySelector("[data-form]")!.getBoundingClientRect().bottom;
    const padding = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
    const tags = Array.from(document.querySelectorAll<HTMLElement>("main [id*=':'] button[data-root]"));
    const tag = tags.find((el) => {
      const r = el.getBoundingClientRect();
      return r.top > Math.max(bar + 8, padding) && r.bottom < window.innerHeight - 8;
    });
    return tag?.closest("[id*=':']")?.id ?? null;
  });
  expect(location, "a Root tag on screen").toBeTruthy();
  const root = rootAt(location!)!;
  await rootTag(card(page, location!), root.letters).click();
  await expect(rootDialog(page)).toBeVisible();
  await expect(rootDialog(page).getByRole("button", { name: STRINGS.close })).toBeVisible();
  reading.root = root.letters;
});

/** Turn the mouse wheel down by `dy` pixels at (x, y). */
export async function wheelAt(page: Page, { x, y }: { x: number; y: number }, dy: number) {
  await page.mouse.move(x, y);
  await page.mouse.wheel(0, dy);
  await settle(page);
}

When("I turn the mouse wheel down by {int} pixels over the backdrop", async ({ reader }, dy: number) => {
  await wheelAt(reader.page, await backdropPoint(rootDialog(reader.page)), dy);
});

When("I turn the mouse wheel down by {int} pixels over the Root/Particle dialog", async ({ reader }, dy: number) => {
  const page = reader.page;
  const { x, y } = await centreOf(rootDialog(page));
  await page.mouse.move(x, y);
  // In steps, so the dialog reaches its end and the rest would chain to the page.
  for (let left = dy; left > 0; left -= 400) await page.mouse.wheel(0, Math.min(400, left));
  await settle(page);
});

/** A touch swipe up by `dy` pixels from (x, y), as a finger makes it. */
export async function swipeUp(page: Page, { x, y }: { x: number; y: number }, dy: number) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Input.synthesizeScrollGesture", {
    x,
    y,
    yDistance: -dy,
    gestureSourceType: "touch",
    speed: 2000,
  });
  await cdp.detach();
  await settle(page);
}

When("I swipe up by {int} pixels on the backdrop", async ({ reader }, dy: number) => {
  const page = reader.page;
  await swipeUp(page, await backdropPoint(rootDialog(page)), dy);
});

When("I swipe up by {int} pixels on the Root/Particle dialog", async ({ reader }, dy: number) => {
  const page = reader.page;
  await swipeUp(page, await centreOf(rootDialog(page)), dy);
});

/** Press the keys that scroll a page, in `dialog`, and check they left it open. */
export async function pressScrollKeys(dialog: Locator) {
  const page = dialog.page();
  for (const key of ["PageDown", "End", "ArrowDown", "ArrowDown", "PageDown"]) {
    await page.keyboard.press(key);
    await settle(page);
  }
  await expect(dialog, "the keys left the dialog open").toBeVisible();
}

When("I press PageDown, End and ArrowDown in the Root/Particle dialog", async ({ reader }) => {
  await pressScrollKeys(rootDialog(reader.page));
});

Then("nothing on the page has moved, even sideways", async ({ reader, reading }) => {
  const page = reader.page;
  const before = reading.pageAt!;
  // Give a smooth scroll, had one started, time to show.
  await page.waitForTimeout(300);
  expect(await pageAt(page)).toEqual(before);
});

// ---------------------------------------------------------------- the marked Spelling brought into view (#324)

/** Holds back the files `glob` matches until a step calls `reading.letFileThrough`. */
export async function holdBack(page: Page, reading: Reading, glob: string) {
  const through = new Promise<void>((done) => (reading.letFileThrough = done));
  await page.route(glob, async (route) => {
    await through;
    await route.continue();
  });
}

Given("the Root file of {string} is held back until I let it through", async ({ reader, reading }, letters: string) => {
  await holdBack(reader.page, reading, `**/roots/${qulRootNamed(letters).id}.json`);
});

Given("the Particle's file is held back until I let it through", async ({ reader, reading }) => {
  await holdBack(reader.page, reading, "**/particles/*.json");
});

When("I let the Root/Particle file through", async ({ reading }) => {
  reading.letFileThrough!();
});

Then("the Root dialog shows {string} while its Lemmas load", async ({ reader }, letters: string) => {
  const dialog = rootDialog(reader.page);
  await expect(dialog).toBeVisible();
  await expect(head(reader.page).getByText(letters, { exact: true })).toBeVisible();
  await expect(dialog.locator('[aria-busy="true"]')).toHaveCount(1);
  await expect(lemmaRows(dialog)).toHaveCount(0);
});

/** The Spelling in the Root dialog (or the Particle dialog) that links to `location`. */
const spellingHolding = (page: Page, location: string) =>
  rootDialog(page)
    .locator("ol > li")
    .filter({ has: page.getByRole("link", { name: location, exact: true }) });

/** Whether all of `part` shows in its dialog, beneath its head; off by at most half a pixel. */
const whollyInView = (part: Locator) =>
  part.evaluate((el) => {
    const dialog = el.closest("[role=dialog]")!;
    const [box, outer, head] = [el, dialog, dialog.querySelector("header")!].map((e) => e.getBoundingClientRect());
    return box.top >= head.bottom - 0.5 && box.bottom <= outer.bottom + 0.5;
  });

/** That the one element `part` finds shows wholly beneath its dialog's head. */
async function expectWhollyInView(part: Locator, what: string) {
  await expect(part).toHaveCount(1);
  await expect.poll(() => whollyInView(part), `${what} in view`).toBe(true);
}

const expectSpellingInView = (page: Page, location: string) =>
  expectWhollyInView(spellingHolding(page, location), `the Spelling holding ${location}`);

Then("the Spelling holding {location} is wholly in view beneath the Root/Particle dialog's head", async ({ reader }, location: string) => {
  await expectSpellingInView(reader.page, location);
});

Then("the Word location link {location} is in view beneath the Root/Particle dialog's head", async ({ reader }, location: string) => {
  const link = rootDialog(reader.page).locator("ol").getByRole("link", { name: location, exact: true });
  await expectWhollyInView(link, `the Word location link ${location}`);
});

Then(
  "Lemma row {int} and the Spelling holding {location} are both wholly in view beneath the Root dialog's head",
  async ({ reader }, n: number, location: string) => {
    const page = reader.page;
    await expectSpellingInView(page, location);
    expect(await dialogScrollTop(page), "the dialog had to scroll to them").toBeGreaterThan(0);
    await expect.poll(() => whollyInView(lemmaRows(rootDialog(page)).nth(n - 1)), `Lemma row ${n} in view`).toBe(true);
  },
);

When("I note where the Root/Particle dialog is scrolled", async ({ reader, reading }) => {
  await settle(reader.page);
  reading.dialogScrollTop = await dialogScrollTop(reader.page);
});

/** That the Root (or Particle) dialog is scrolled to `at`, and stays there: long enough for a late scroll, had one been set off, to show. */
async function expectDialogToStayAt(page: Page, at: number) {
  expect(await dialogScrollTop(page), "where it is").toBeCloseTo(at, 0);
  await page.waitForTimeout(1000);
  expect(await dialogScrollTop(page), "where it is a second later").toBeCloseTo(at, 0);
}

Then("the Root/Particle dialog has scrolled up by {int} pixels since I noted it, and stays there", async ({ reader, reading }, dy: number) => {
  await expectDialogToStayAt(reader.page, reading.dialogScrollTop! - dy);
});

Then("the Root dialog has not moved since I noted it, and stays where it is", async ({ reader, reading }) => {
  await expectDialogToStayAt(reader.page, reading.dialogScrollTop!);
});
