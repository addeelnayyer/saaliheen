// The Surah index's Surahs and Juz tabs (#193): what Read shows, switching
// tabs by tap, swipe and arrow keys, the address following the tab, the
// remembered tab, searching both lists, the Juz rows of each Script and
// opening a Juz at its first Ayah. Where each Juz runs comes from steps/juz.ts
// (the sources and the issue's seven Indo-Pak starts); Juz names from the Juz
// list the build serves; Surah names from QUL's Surah metadata.

import { expect, type Locator, type Page } from "@playwright/test";
import { searchBox, sourceSurahs } from "../support";
import { Then, When, langOf } from "./fixtures";
import { indexMain, indexPanel, indexTab, rowLinks, rowsOf, type IndexTab } from "./index-tabs";
import { expectedJuz, juzHolding, juzOf, juzWithSurah, runsText, servedJuz } from "./juz";
import type { Script } from "./reader";

const ALL_SURAHS = sourceSurahs().map((s) => s.number);
const ALL_JUZ = Array.from({ length: 30 }, (_, i) => i + 1);

/** The Surah index's state between steps, keyed by page so parallel scenarios never share it. */
const noted = new WeakMap<Page, { history?: number; rows: Record<string, number> }>();
const notes = (page: Page) => {
  if (!noted.has(page)) noted.set(page, { rows: {} });
  return noted.get(page)!;
};

const tabName = (s: string): IndexTab => {
  if (s !== "Surahs" && s !== "Juz") throw new Error(`no "${s}" tab`);
  return s;
};
const listName = (s: string): IndexTab => (s === "Surah" ? "Surahs" : tabName(s));

/** The Juz numbers the Juz tab's list shows, in page order. */
const shownJuz = async (page: Page) => (await rowsOf(indexPanel(page, "Juz"))).map((r) => r.number);

/** The link of Juz `n`'s row in the Juz tab's list. */
async function juzRow(page: Page, n: number): Promise<Locator> {
  const panel = indexPanel(page, "Juz");
  await expect.poll(() => shownJuz(page), `Juz ${n}'s row is listed`).toContain(n);
  const i = (await shownJuz(page)).indexOf(n);
  return rowLinks(panel).nth(i);
}

/** A list's row: Surah `n`'s card or Juz `n`'s row. */
async function rowOf(page: Page, list: IndexTab, n: number): Promise<Locator> {
  if (list === "Juz") return juzRow(page, n);
  return rowLinks(indexPanel(page, "Surahs")).and(page.locator(`[href="/${new URL(page.url()).pathname.split("/")[1]}/${n}"]`));
}

/** How far a list's left edge is from its track's: 0 once the track shows it. */
const offsetInTrack = (panel: Locator) =>
  panel.evaluate((el) => {
    let track = el.parentElement;
    while (track && !/(auto|scroll)/.test(getComputedStyle(track).overflowX)) track = track.parentElement;
    const box = (track ?? document.documentElement).getBoundingClientRect();
    return Math.round(el.getBoundingClientRect().left - box.left);
  });

async function expectShown(page: Page, shown: IndexTab) {
  const other: IndexTab = shown === "Surahs" ? "Juz" : "Surahs";
  await expect.poll(() => offsetInTrack(indexPanel(page, shown)), `the ${shown} list is where its track shows it`).toBe(0);
  const width = await indexPanel(page, other).evaluate((el) => el.getBoundingClientRect().width);
  expect(Math.abs(await offsetInTrack(indexPanel(page, other))), `the ${other} list is beside the track's view`).toBeGreaterThanOrEqual(width - 1);
}

/** Whether `rows` are one column: one left edge and one width, each below the last. */
async function expectOneColumn(rows: Locator, what: string) {
  const boxes = await rows.evaluateAll((els) =>
    els.slice(0, 12).map((el) => {
      const r = el.getBoundingClientRect();
      return { x: Math.round(r.left), w: Math.round(r.width), y: Math.round(r.top) };
    }),
  );
  expect(boxes.length, `${what} rows`).toBeGreaterThan(1);
  expect(new Set(boxes.map((b) => b.x)).size, `${what}: every row starts at the same left edge`).toBe(1);
  expect(new Set(boxes.map((b) => b.w)).size, `${what}: every row is as wide`).toBe(1);
  for (let i = 1; i < boxes.length; i++) expect(boxes[i].y, `${what}: row ${i + 1} is below row ${i}`).toBeGreaterThan(boxes[i - 1].y);
}

const top = async (l: Locator) => (await l.boundingBox())?.y ?? NaN;

// ---------------------------------------------------------------- AC-1: what Read shows

Then(
  "the Surah index shows, from the top, the Reading places, the Surahs and Juz tabs, the search box and the selected tab's list",
  async ({ page }) => {
    const places = page.getByRole("link", { name: /^Continue reading/ }).first();
    await expect(places, "a Reading place").toBeVisible();
    const tabs = indexMain(page).getByRole("tablist");
    await expect(tabs).toBeVisible();
    const order = [
      ["the Reading places", await top(places)],
      ["the tabs", await top(tabs)],
      ["the search box", await top(searchBox(page))],
      ["the Surahs list", await top(indexPanel(page, "Surahs"))],
    ] as const;
    for (let i = 1; i < order.length; i++) {
      expect(order[i][1], `${order[i][0]} is below ${order[i - 1][0]}`).toBeGreaterThan(order[i - 1][1]);
    }
  },
);

Then("the tabs are {string} then {string}, and {string} is selected", async ({ page }, first: string, second: string, selected: string) => {
  const tabs = indexMain(page).getByRole("tablist").getByRole("tab");
  await expect(tabs).toHaveCount(2);
  await expect(tabs.nth(0)).toHaveAccessibleName(new RegExp(`^\\W*${first}\\b`));
  await expect(tabs.nth(1)).toHaveAccessibleName(new RegExp(`^\\W*${second}\\b`));
  await expect(indexTab(page, tabName(selected))).toHaveAttribute("aria-selected", "true");
});

Then("the page has exactly one search box", async ({ page }) => {
  await expect(searchBox(page)).toHaveCount(1);
});

Then("the Surahs tab lists all 114 Surahs in one column", async ({ page }) => {
  await expect.poll(async () => (await rowsOf(indexPanel(page, "Surahs"))).map((r) => Number(r.href.split("/")[2]))).toEqual(ALL_SURAHS);
  await expectOneColumn(indexPanel(page, "Surahs").getByRole("listitem"), "the Surahs list");
});

Then("the Juz tab lists all 30 Juz in one column", async ({ page }) => {
  await expect.poll(() => shownJuz(page)).toEqual(ALL_JUZ);
  await expectOneColumn(indexPanel(page, "Juz").getByRole("listitem"), "the Juz list");
});

Then("the Surah index shows no stats line and no link to the Themes list or the Iltifat overview", async ({ page, reading }) => {
  const lang = langOf(reading);
  const main = indexMain(page);
  await expect(main).toBeVisible();
  await expect(main.locator(`a[href="/${lang}/themes"]`), "a link to the Themes list").toHaveCount(0);
  await expect(main.locator(`a[href="/${lang}/iltifat"]`), "a link to the Iltifat overview").toHaveCount(0);
  expect(await main.innerText(), "the stats line").not.toMatch(/\d+ surahs · [\d,]+ ayahs/i);
});

Then("every Juz row shows its number, its {script} name from the served Juz list and where it runs", async ({ page, request }, script: Script) => {
  const served = (await servedJuz(request))[script];
  expect(served.map((j) => j.number), `the served ${script} Juz`).toEqual(ALL_JUZ);
  await expect.poll(() => shownJuz(page)).toEqual(ALL_JUZ);
  const rows = await rowsOf(indexPanel(page, "Juz"));
  for (const row of rows) {
    const juz = served[row.number - 1];
    expect(juz.name, `Juz ${row.number}'s ${script} name`).not.toBe("");
    expect(row.text, `Juz ${row.number}'s row shows its ${script} name`).toContain(juz.name);
    expect(row.text, `Juz ${row.number}'s row shows where it runs`).toContain(runsText(juzOf(script, row.number)));
  }
});

// ---------------------------------------------------------------- the Makki/Madani filter

Then("the {string} filter is visible", async ({ page }, name: string) => {
  await expect(page.getByRole("button", { name, exact: true })).toBeVisible();
});

Then("no Makki or Madani filter is visible", async ({ page }) => {
  for (const name of ["All", "Meccan", "Medinan"]) {
    await expect(page.getByRole("button", { name, exact: true }), `the "${name}" filter`).not.toBeVisible();
  }
});

// ---------------------------------------------------------------- AC-2: switching tabs

When("I choose the {string} tab", async ({ page }, name: string) => {
  await indexTab(page, tabName(name)).click();
});

Then("the {string} tab is selected", async ({ page }, name: string) => {
  const tab = tabName(name);
  await expect(indexTab(page, tab)).toHaveAttribute("aria-selected", "true");
  await expect(indexTab(page, tab === "Surahs" ? "Juz" : "Surahs")).toHaveAttribute("aria-selected", "false");
});

/** How far the tab underline's middle is from tab `name`'s middle, in pixels: 0 when it sits under it. */
const underlineOff = (page: Page, name: IndexTab) =>
  indexTab(page, name).evaluate((tab) => {
    const ink = tab.closest('[role="tablist"]')!.querySelector('[aria-hidden="true"]')!;
    const middle = (r: DOMRect) => r.left + r.width / 2;
    return Math.round(Math.abs(middle(ink.getBoundingClientRect()) - middle(tab.getBoundingClientRect())));
  });

// The underline is placed as the page starts running; a load that misses it leaves it under the other tab
// for good, and only some loads miss it, so the check is made on several loads, each a new document.
Then(
  "on each of {int} fresh loads of {string} the {string} tab is selected and the tab underline sits under it",
  async ({ page }, loads: number, address: string, name: string) => {
    const tab = tabName(name);
    for (let load = 1; load <= loads; load++) {
      await page.goto(address);
      await expect(indexTab(page, tab), `load ${load}: the ${tab} tab`).toHaveAttribute("aria-selected", "true");
      await expect.poll(() => underlineOff(page, tab), { message: `load ${load}: the underline sits under the ${tab} tab`, timeout: 3_000 }).toBeLessThanOrEqual(1);
    }
  },
);

Then("the {string} tab is selected and has the focus", async ({ page }, name: string) => {
  await expect(indexTab(page, tabName(name))).toHaveAttribute("aria-selected", "true");
  await expect(indexTab(page, tabName(name))).toBeFocused();
});

Then(/^the (Surah|Juz) list is on screen and the (?:Surah|Juz) list is not$/, async ({ page }, list: string) => {
  await expectShown(page, listName(list));
});

When("I note how long the browser's history is", async ({ page }) => {
  notes(page).history = await page.evaluate(() => history.length);
});

Then("the browser's history is as long as noted", async ({ page }) => {
  expect(await page.evaluate(() => history.length), "history entries").toBe(notes(page).history);
});

// ---------------------------------------------------------------- AC-2, AC-9: the keyboard and the tablist

When("I move keyboard focus to the {string} tab", async ({ page }, name: string) => {
  await indexTab(page, tabName(name)).focus();
});

When(/^I press the arrow key toward the (next|previous) tab$/, async ({ page }, way: string) => {
  // The tablist runs with the page's direction: in a right-to-left page the next tab is to the left.
  const rtl = (await page.evaluate(() => getComputedStyle(document.documentElement).direction)) === "rtl";
  await page.keyboard.press((way === "next") !== rtl ? "ArrowRight" : "ArrowLeft");
});

Then("the tabs are a tablist whose selected tab names and controls the list on screen", async ({ page }) => {
  const tablist = indexMain(page).getByRole("tablist");
  await expect(tablist).toHaveCount(1);
  const selected = tablist.getByRole("tab", { selected: true });
  await expect(selected).toHaveCount(1);
  const other = tablist.getByRole("tab", { selected: false });
  await expect(other).toHaveCount(1);
  // Only the selected tab is in the Tab order (a roving tabindex).
  await expect(selected).toHaveAttribute("tabindex", "0");
  await expect(other).toHaveAttribute("tabindex", "-1");
  const panelId = await selected.getAttribute("aria-controls");
  expect(panelId, "the selected tab's aria-controls").toBeTruthy();
  const panel = page.locator(`[id="${panelId}"]`);
  await expect(panel).toHaveRole("tabpanel");
  const name = ((await selected.textContent()) ?? "").trim().match(/^\W*(Surahs|Juz)/)?.[1] as IndexTab;
  await expect(panel, "the list is named by its tab").toHaveAccessibleName(new RegExp(`^\\W*${name}\\b`));
  await expectShown(page, name);
});

// ---------------------------------------------------------------- AC-2: swiping

Then("the lists lie side by side on a track that scrolls sideways and snaps to one list", async ({ page }) => {
  const track = await indexPanel(page, "Surahs").evaluate((el) => {
    let t = el.parentElement;
    while (t && !/(auto|scroll)/.test(getComputedStyle(t).overflowX)) t = t.parentElement;
    if (!t) return null;
    const lists = Array.from(t.querySelectorAll('[role="tabpanel"]')) as HTMLElement[];
    return {
      snap: getComputedStyle(t).scrollSnapType,
      width: t.clientWidth,
      lists: lists.map((l) => ({
        align: getComputedStyle(l).scrollSnapAlign,
        width: Math.round(l.getBoundingClientRect().width),
        top: Math.round(l.getBoundingClientRect().top),
      })),
    };
  });
  expect(track, "a track that scrolls sideways around the lists").not.toBeNull();
  expect(track!.snap, "the track snaps sideways, to one list").toMatch(/^x mandatory$/);
  expect(track!.lists, "both lists on the track").toHaveLength(2);
  for (const l of track!.lists) {
    expect(l.align, "each list is a snap point").not.toBe("none");
    expect(Math.abs(l.width - track!.width), "each list fills the track's width").toBeLessThanOrEqual(1);
  }
  expect(track!.lists[0].top, "the lists side by side").toBe(track!.lists[1].top);
});

When(/^I swipe the list to the (Surah|Juz) list$/, async ({ page }, list: string) => {
  // A swipe scrolls the track sideways until it snaps to the other list.
  await indexPanel(page, listName(list)).evaluate((el) => el.scrollIntoView({ inline: "start", block: "nearest", behavior: "instant" }));
});

// ---------------------------------------------------------------- AC-2: each tab's scroll

When(/^I scroll the (Surah|Juz) list until (?:Surah|Juz) (\d+)'s row is at its top$/, async ({ page }, list: string, n: string) => {
  const row = await rowOf(page, listName(list), Number(n));
  await row.evaluate((el) => el.scrollIntoView({ block: "start", inline: "nearest", behavior: "instant" }));
});

When(/^I note where (Surah|Juz) (\d+)'s row is$/, async ({ page }, list: string, n: string) => {
  notes(page).rows[`${list} ${n}`] = await top(await rowOf(page, listName(list), Number(n)));
});

Then(/^(Surah|Juz) (\d+)'s row is where it was noted$/, async ({ page }, list: string, n: string) => {
  const was = notes(page).rows[`${list} ${n}`];
  expect(was, `where ${list} ${n}'s row was, noted`).toBeDefined();
  await expect
    .poll(async () => Math.abs((await top(await rowOf(page, listName(list), Number(n)))) - was), `${list} ${n}'s row is still ${was}px down`)
    .toBeLessThanOrEqual(1);
});

// ---------------------------------------------------------------- AC-4: search

Then("the search box still holds {string}", async ({ page }, query: string) => {
  await expect(searchBox(page)).toHaveValue(query);
});

Then("the Juz tab shows exactly the {script} Juz holding an Ayah of Surah {int}", async ({ page }, script: Script, surah: number) => {
  const expected = juzWithSurah(script, surah);
  expect(expected.length, `Juz holding Surah ${surah}`).toBeGreaterThan(0);
  await expect.poll(() => shownJuz(page)).toEqual(expected);
});

Then("the Juz tab shows only Juz {int}", async ({ page }, n: number) => {
  await expect.poll(() => shownJuz(page)).toEqual([n]);
});

Then("the Juz tab shows no Juz rows", async ({ page }) => {
  await expect.poll(() => shownJuz(page)).toEqual([]);
});

Then(/^the (Surahs|Juz) tab says "(.*)"$/, async ({ page }, tab: string, message: string) => {
  await expect(indexPanel(page, tabName(tab))).toContainText(message);
});

// ---------------------------------------------------------------- AC-6: Juz rows and opening a Juz

Then(
  "Juz {int}'s row shows its {script} name from the served Juz list and runs {string}",
  async ({ page, request }, n: number, script: Script, runs: string) => {
    expect(runsText(juzOf(script, n)), `where ${script} Juz ${n} runs, from the sources`).toBe(runs);
    const name = (await servedJuz(request))[script][n - 1].name;
    const row = await juzRow(page, n);
    await expect(row).toContainText(name);
    await expect(row).toContainText(runs);
  },
);

Then("Juz {int}'s row shows {string}", async ({ page }, n: number, text: string) => {
  await expect(await juzRow(page, n)).toContainText(text);
});

When("I follow the Juz row of Juz {int}", async ({ page }, n: number) => {
  await (await juzRow(page, n)).click();
});

Then("I am on Surah {int}'s page in {language}", async ({ page, reading }, surah: number, lang: string) => {
  await expect.poll(() => new URL(page.url()).pathname, "the address").toBe(`/${lang}/${surah}`);
  reading.lang = lang as "ur" | "en";
  reading.surah = surah;
});

Then("only Juz {int}'s row is marked as holding the latest Reading place", async ({ page }, n: number) => {
  // The mark is a dot on screen and, for a screen reader, words in the row's name.
  const marked = /latest Reading place/i;
  await expect(await juzRow(page, n)).toHaveAccessibleName(marked);
  const links = rowLinks(indexPanel(page, "Juz"));
  for (const other of ALL_JUZ.filter((j) => j !== n)) {
    await expect(links.nth(other - 1), `Juz ${other}'s row`).not.toHaveAccessibleName(marked);
  }
});

// Kept beside the Juz the scenarios name, so a change to the sources shows up here first.
Then("Ayah {word} is in Juz {int} of the {script} Script", async ({}, ayah: string, n: number, script: Script) => {
  expect(juzHolding(script, ayah)).toBe(n);
  expect(expectedJuz(script)).toHaveLength(30);
});

// ---------------------------------------------------------------- AC-9: reduced motion

Then(/^the (Surah|Juz) list is wholly on screen within two frames$/, async ({ page }, list: string) => {
  const panel = indexPanel(page, listName(list));
  await page.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))));
  expect(await offsetInTrack(panel), `the ${list} list, two frames after the tap`).toBe(0);
});
