// The Surah bar: sticky at every width, mini while reading down, full on the
// way back up, and never changing height. Its forms are told apart by what is
// on screen: the full form shows the top bar (its brand link), the mini form
// only the slim row.

import { expect, type Locator, type Page } from "@playwright/test";
import { ayahAtTop, card, shot, sourceSurahs, type Language } from "../support";
import { DIR, STRINGS, Then, When, surahOf, type Reading } from "./fixtures";
import { filePassages, passageHolding, passagesOf, titleOf, type FilePassage } from "./passages";

const brandLink = (page: Page) => page.getByRole("link", { name: STRINGS.brand });
/** The top bar: the banner holding the brand link (the Surah's heading is a banner too). */
const topBar = (page: Page) => page.getByRole("banner").filter({ has: brandLink(page) });
const brand = (page: Page) => topBar(page).getByRole("link", { name: STRINGS.brand });
const slimRow = (page: Page) => page.getByRole("navigation", { name: "Surah", exact: true });

/** The top and bottom of an element on screen, in CSS pixels from the top of the viewport. */
const edges = async (locator: Locator) => {
  const box = await locator.boundingBox();
  if (!box) throw new Error("not rendered");
  return { top: box.y, bottom: box.y + box.height };
};

/** Scroll the page as a reader does, then let two frames pass so the scroll events have been handled. */
async function scrollBy(page: Page, dy: number) {
  await page.evaluate(async (dy) => {
    window.scrollBy({ top: dy, behavior: "instant" });
    await new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)));
  }, dy);
}

When("I scroll down by {int} pixels", async ({ page }, dy: number) => {
  await scrollBy(page, dy);
});

When("I scroll up by {int} pixels", async ({ page }, dy: number) => {
  await scrollBy(page, -dy);
});

When("the page settles where it landed", async ({ page }) => {
  // The Ayahs around the landing spot lay out (content-visibility) and fonts
  // load; settled once the scroll position and page height hold for 500ms.
  const now = () => page.evaluate(() => `${Math.round(scrollY)} ${document.documentElement.scrollHeight}`);
  let last = await now();
  await expect
    .poll(async () => {
      await page.waitForTimeout(500);
      const next = await now();
      const settled = next === last;
      last = next;
      return settled;
    }, { message: "the page settles", intervals: [0] })
    .toBe(true);
});

Then("the Surah bar is in its full form", async ({ page }) => {
  // The top bar slides back fully on screen (the slide takes about 200ms).
  await expect.poll(async () => Math.round((await edges(topBar(page))).top), "the top bar's top").toBe(0);
  await expect(brand(page)).toBeInViewport({ ratio: 1 });
  await expect(slimRow(page)).toBeInViewport({ ratio: 1 });
});

Then("the Surah bar is in its mini form", async ({ page }) => {
  await expect(brand(page)).not.toBeInViewport();
  await expect.poll(async () => Math.round((await edges(slimRow(page))).top), "the slim row's top").toBe(0);
  await expect(slimRow(page)).toBeInViewport({ ratio: 1 });
});

Then("the Surah bar is at the top of the screen", async ({ page }) => {
  expect(Math.round((await edges(topBar(page))).top)).toBe(0);
  await expect(slimRow(page)).toBeInViewport({ ratio: 1 });
});

Then("the Surah bar's slim row is at the top of the screen", async ({ page }) => {
  expect(Math.round((await edges(slimRow(page))).top)).toBe(0);
  // The slim row holds the Reading settings button and the play button (#192).
  await expect(slimRow(page).getByRole("button", { name: STRINGS.settings, exact: true })).toBeInViewport();
  await expect(slimRow(page).getByRole("button", { name: STRINGS.listenFrom })).toBeInViewport();
});

Then("the Word card at {location} is fully on screen below the Surah bar", async ({ page }, location: string) => {
  // Polled: Ayahs above the Word lay out (content-visibility) and fonts load after the jump.
  await expect
    .poll(async () => {
      const barBottom = (await edges(slimRow(page))).bottom;
      const word = await edges(card(page, location));
      const problems = [];
      if (word.top < barBottom) problems.push(`its top ${word.top} is above the slim row's bottom ${barBottom}`);
      if (word.bottom > page.viewportSize()!.height) {
        problems.push(`its bottom ${word.bottom} is below the screen (scrolled to ${await page.evaluate(() => window.scrollY)})`);
      }
      return problems;
    }, `the Word card at ${location} is clear below the Surah bar`)
    .toEqual([]);
});

/** Note where the deep-linked Word card is on screen, for a later step to check it has not moved. */
const noteTarget = async (page: Page, reading: { targetTop?: number }) => {
  reading.targetTop = (await edges(page.locator(":target"))).top;
};

When("I tap the Surah's name on the Surah bar", async ({ page, reading }) => {
  await noteTarget(page, reading);
  // One tap where the name is: on the mini bar it shows the full bar and opens
  // no picker (#193). Not clickInPlace, whose own tap to show the full bar
  // would make this a second tap, opening the picker over the page (#304).
  const { nameLatin } = sourceSurahs()[surahOf(reading) - 1];
  // A mouse tap where it is now: a locator click would scroll it into view first.
  const box = (await slimRow(page).getByText(nameLatin, { exact: true }).boundingBox())!;
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
});

Then("the Word card at {location} has not moved", async ({ page, reading }, location: string) => {
  expect((await edges(card(page, location))).top).toBe(reading.targetTop);
});

When("I move keyboard focus to the Reading settings button", async ({ page, reading }) => {
  await noteTarget(page, reading);
  await slimRow(page).getByRole("button", { name: STRINGS.settings, exact: true }).focus();
});

When("I press Shift+Tab", async ({ page }) => {
  await page.keyboard.press("Shift+Tab");
});

Then("the focused control is on the Surah bar and on screen", async ({ page }) => {
  const focused = page.locator(":focus");
  await expect(topBar(page).locator(":focus")).toHaveCount(1);
  await expect(focused).toBeInViewport({ ratio: 1 });
});

// ---------------------------------------------------------------- the current Passage's title (#43)

// With the Passage headings release switch on, the slim row shows the Passage
// title of the Passage being read under the Surah's number and names. It is
// found by its text, read from the Passages file; the Passage expected is the
// one holding the Ayah at the top of the screen, or the Surah's first Passage
// at the top of the page.

/** The Passage title last expected on the Surah bar, for a later step about how it is drawn. */
const barTitle = new WeakMap<Reading, string>();
/** The Surah bar's height, noted before a step that must not change it. */
const barHeight = new WeakMap<Reading, number>();

const LANGUAGE_NAME: Record<Language, string> = { ur: "Urdu", en: "English" };

/** The Passage title on the slim row, by its exact text. */
const titleOnBar = (page: Page, title: string) => slimRow(page).getByText(title, { exact: true });

/** The whole Surah bar's height: from the top bar's top (slid off in the mini form) to the slim row's bottom. */
const heightOfBar = async (page: Page) => (await edges(slimRow(page))).bottom - (await edges(topBar(page))).top;

/**
 * What is wrong with the slim row against showing `passage`'s title in `lang`,
 * one line each; empty when right. `under`: also below the Surah's names.
 */
async function barProblems(page: Page, passage: FilePassage, lang: Language, under: boolean): Promise<string[]> {
  const title = titleOf(passage, lang);
  const where = `the Passage title "${title}" of ${passage.surah_no}:${passage.ayah_from}–${passage.ayah_till}`;
  const shown = titleOnBar(page, title);
  const count = await shown.count();
  if (count !== 1) return [`the slim row shows ${where} ${count} times, not once`];
  const out: string[] = [];
  if (!(await shown.isVisible())) out.push(`${where} is not visible`);
  const seen = await shown.evaluate((el) => ({
    lang: el.closest("[lang]")?.getAttribute("lang") ?? null,
    dir: getComputedStyle(el).direction,
  }));
  if (seen.lang !== lang || seen.dir !== DIR[lang]) out.push(`${where} is lang ${seen.lang}, ${seen.dir}; expected ${lang}, ${DIR[lang]}`);
  const box = await shown.boundingBox();
  const row = await slimRow(page).boundingBox();
  const { width, height } = page.viewportSize()!;
  if (!box || !row) return [...out, `${where} is not laid out`];
  if (box.x < -1 || box.x + box.width > width + 1 || box.y < -1 || box.y + box.height > height + 1) out.push(`${where} is not wholly on screen`);
  if (box.y < row.y - 1 || box.y + box.height > row.y + row.height + 1) out.push(`${where} is not inside the slim row`);
  if (under) {
    const { nameLatin, nameArabic } = sourceSurahs()[passage.surah_no - 1];
    for (const [what, name] of [["Latin", nameLatin], ["Arabic", nameArabic]]) {
      const named = await slimRow(page).getByText(name, { exact: true }).first().boundingBox();
      if (!named) out.push(`the slim row shows no ${what} name of Surah ${passage.surah_no}`);
      else if (box.y < named.y + named.height - 1) out.push(`${where} (top ${box.y}) is not under the Surah's ${what} name (bottom ${named.y + named.height})`);
    }
  }
  // Only this Passage's title: no other Passage title of the Surah, in either Language.
  const text = (await slimRow(page).textContent()) ?? "";
  for (const other of passagesOf(passage.surah_no))
    for (const l of ["ur", "en"] as Language[]) {
      const t = titleOf(other, l);
      if (t !== title && !title.includes(t) && text.includes(t)) out.push(`the slim row also shows "${t}"`);
    }
  return out;
}

async function expectBarShows(page: Page, reading: Reading, lang: Language, passage: () => Promise<FilePassage> | FilePassage, under: boolean) {
  let expected = "";
  await expect
    .poll(
      async () => {
        const p = await passage();
        expected = titleOf(p, lang);
        return barProblems(page, p, lang, under);
      },
      { message: `the slim row shows the current Passage's ${LANGUAGE_NAME[lang]} title` },
    )
    .toEqual([]);
  barTitle.set(reading, expected);
}

const atTop = async (page: Page) => {
  const ayah = await ayahAtTop(page);
  if (!ayah) throw new Error("no Ayah on the page");
  return passageHolding(ayah);
};

const firstPassage = (surah: number) => passagesOf(surah)[0];

Then(
  "the Surah bar's slim row shows the {language} Passage title of the Passage holding Ayah {word}, under the Surah's names",
  async ({ page, reading }, lang: Language, ayah: string) => {
    await expectBarShows(page, reading, lang, () => passageHolding(ayah), true);
  },
);

Then(
  "the Surah bar's slim row shows the {language} Passage title of the Passage holding Ayah {word}",
  async ({ page, reading }, lang: Language, ayah: string) => {
    await expectBarShows(page, reading, lang, () => passageHolding(ayah), false);
  },
);

Then(
  "the Surah bar's slim row shows the {language} Passage title of the Passage holding the Ayah at the top of the screen, under the Surah's names",
  async ({ page, reading }, lang: Language) => {
    await expectBarShows(page, reading, lang, () => atTop(page), true);
  },
);

Then(
  "the Surah bar's slim row shows the {language} Passage title of Surah {int}'s first Passage, under the Surah's names",
  async ({ page, reading }, lang: Language, surah: number) => {
    await expectBarShows(page, reading, lang, () => firstPassage(surah), true);
  },
);

Then(
  "the Surah bar's slim row shows the {language} Passage title of Surah {int}'s first Passage",
  async ({ page, reading }, lang: Language, surah: number) => {
    await expectBarShows(page, reading, lang, () => firstPassage(surah), false);
  },
);

Then("the Surah bar's slim row shows no {language} Passage title of Surah {int}", async ({ page }, lang: Language, surah: number) => {
  const text = (await slimRow(page).textContent()) ?? "";
  expect(passagesOf(surah).map((p) => titleOf(p, lang)).filter((t) => text.includes(t))).toEqual([]);
});

Then(
  "the Surah bar's slim row shows only the Reading settings button, the play button and Surah {int}'s number and names",
  async ({ page }, surah: number) => {
    const { nameArabic, nameLatin } = sourceSurahs()[surah - 1];
    const row = slimRow(page);
    await expect(row.getByText(nameLatin, { exact: true })).toBeVisible();
    // No links: the index link and the previous and next Surah links left it (#192).
    await expect(row.getByRole("link")).toHaveCount(0);
    // Its three buttons, Reading settings (#192), play (#115) and the Surah's
    // number and names, which open the quick picker (#193).
    await expect(row.getByRole("button")).toHaveCount(3);
    await expect(row.getByRole("button", { name: nameLatin })).toHaveAttribute("aria-haspopup", "dialog");
    await expect(row.getByRole("button", { name: STRINGS.settings, exact: true })).toBeVisible();
    await expect(row.getByRole("button", { name: STRINGS.listenFrom })).toBeVisible();
    // Outside its buttons: the Surah's number and names, and nothing more.
    const rest = await row.evaluate((nav) => {
      const copy = nav.cloneNode(true) as HTMLElement;
      copy.querySelectorAll("a, button").forEach((a) => a.remove());
      return copy.textContent ?? "";
    });
    const left = [String(surah), nameArabic, nameLatin].reduce((t, piece) => t.replace(piece, ""), rest).replace(/\s+/g, "");
    expect(left, "the slim row's text beyond its links and the Surah's number and names").toBe("");
    // None of the Surah's Passage titles, in either Language.
    const text = (await row.textContent()) ?? "";
    expect(passagesOf(surah).flatMap((p) => [p.title_ur, p.title_en]).filter((t) => text.includes(t))).toEqual([]);
  },
);

Then("the Passage holding Ayah {word} is not the one holding Ayah {word}", async ({}, a: string, b: string) => {
  // A guard on the scenario's own data: the two Ayahs are in different Passages of the Passages file.
  expect(passageHolding(a)).not.toBe(passageHolding(b));
});

/** The Passage a scenario picked for its longest Passage title on the Surah bar. */
const longestPassage = new WeakMap<Reading, FilePassage>();

When(
  "I open the second Ayah of the Passage whose {language} Passage title is the longest on the Surah bar",
  async ({ page, reading }, lang: Language) => {
    // Longest as the Surah bar sets it, not by its characters: Urdu's letters, in Dubai as in
    // any Arabic-script face, differ widely in width by letter and joining form. Every title
    // is measured on one line in a copy of the title on the bar.
    const shown = barTitle.get(reading);
    if (!shown) throw new Error("no Passage title was seen on the Surah bar yet");
    const passages = filePassages();
    const widths = await titleOnBar(page, shown).evaluate(async (el, titles) => {
      await document.fonts.ready;
      const copy = el.cloneNode(false) as HTMLElement;
      Object.assign(copy.style, { position: "absolute", visibility: "hidden", whiteSpace: "nowrap", width: "auto", maxWidth: "none", overflow: "visible" });
      el.parentElement!.append(copy);
      const out = titles.map((t) => {
        copy.textContent = t;
        return copy.getBoundingClientRect().width;
      });
      copy.remove();
      return out;
    }, passages.map((p) => titleOf(p, lang)));
    const widest = Math.max(...widths);
    // Of titles as long, the first Passage of two Ayahs or more: its second Ayah is opened, so
    // scrolling up from it stays in the Passage (its first Ayah is above).
    const tied = passages.filter((_, i) => widths[i] >= widest - 1);
    const p = tied.find((x) => x.ayah_till > x.ayah_from);
    if (!p) throw new Error(`every Passage with the longest ${LANGUAGE_NAME[lang]} Passage title is of one Ayah: ${tied.map((x) => `${x.surah_no}:${x.ayah_from}`).join(", ")}`);
    longestPassage.set(reading, p);
    reading.status = (await page.goto(`/${lang}/${p.surah_no}#${p.surah_no}:${p.ayah_from + 1}`))?.status();
    reading.lang = lang;
    reading.surah = p.surah_no;
  },
);

Then("the Surah bar's slim row shows that Passage's {language} Passage title, under the Surah's names", async ({ page, reading }, lang: Language) => {
  const p = longestPassage.get(reading);
  if (!p) throw new Error("no Passage was picked for its longest Passage title");
  await expectBarShows(page, reading, lang, () => p, true);
});

Then("the page is at the top of the Surah, above its first Ayah", async ({ page }) => {
  await expect.poll(() => page.evaluate(() => window.scrollY), "the page's scroll position").toBe(0);
  await expect(page.getByRole("heading", { level: 1 })).toBeInViewport();
});

When("I scroll to the top of the page", async ({ page }) => {
  await page.evaluate(async () => {
    window.scrollTo({ top: 0, behavior: "instant" });
    await new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)));
  });
});

When("I note the Surah bar's height", async ({ page, reading }) => {
  barHeight.set(reading, await heightOfBar(page));
});

Then("the Surah bar is as tall as noted", async ({ page, reading }) => {
  const noted = barHeight.get(reading);
  if (noted === undefined) throw new Error("the Surah bar's height was not noted");
  expect(Math.round(await heightOfBar(page)), "the Surah bar's height").toBe(Math.round(noted));
});

Then("the Passage title on the Surah bar is cut short with \"…\" on one line", async ({ page, reading }) => {
  const title = barTitle.get(reading);
  if (!title) throw new Error("no Passage title was expected on the Surah bar yet");
  const seen = await titleOnBar(page, title).evaluate((el) => {
    // The box that cuts the title short: the title or the nearest box around it, within the slim row.
    let box: HTMLElement | null = el as HTMLElement;
    while (box && box.tagName !== "NAV" && getComputedStyle(box).textOverflow !== "ellipsis") box = box.parentElement;
    const cut = box && box.tagName !== "NAV" ? box : null;
    const titleText = document.createRange();
    titleText.selectNodeContents(el);
    const lines = new Set(Array.from(titleText.getClientRects()).map((r) => Math.round(r.top))).size;
    return {
      ellipsis: !!cut && getComputedStyle(cut).overflowX !== "visible",
      overflows: !!cut && cut.scrollWidth > cut.clientWidth,
      lines,
    };
  });
  expect(seen, "the title ends in an ellipsis because it is wider than its room, on one line").toEqual({ ellipsis: true, overflows: true, lines: 1 });
});

Then("I save a screenshot of the Surah bar {string}", async ({ page }, name: string) => {
  await shot(page, name);
});
