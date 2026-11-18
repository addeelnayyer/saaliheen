// Steps for #5: Root tags on Word cards, the Root dialog, going to a Word
// location from it, and the Root files it loads. Controls are found by role,
// accessible name and visible text; expected Roots, Lemmas, Spellings, counts
// and meanings come from the committed sources through ./roots.

import { expect, type Locator, type Page } from "@playwright/test";
import { committedRoot } from "../committed-output";
import { card, clickOutside, expectFocusStayedInside, focusInside, isModal, shot, sourceWords, type Language } from "../support";
import { Given, STRINGS, Then, When, expectLangDir, langOf, precedes, resolveColor, surahOf, type Reading } from "./fixtures";
import type { Script } from "./reader";
import {
  inOrder,
  lemmaList,
  lemmaPanel,
  lemmaRows,
  openedRoot,
  qulAnalysis,
  qulLocationsOf,
  qulRootNamed,
  rootAt,
  rootDialog,
  rootsJsonMeanings,
  rootTag,
  scriptShown,
  showsArrow,
  spellingText,
  type ExpectedSpelling,
} from "./roots";
import { particleAt, particleText } from "./particles";

/** `n` as a whole number in `text`, not part of a longer number. */
export const holdsNumber = (text: string, n: number) => new RegExp(`(?<!\\d)${n}(?!\\d)`).test(text);

// ---------------------------------------------------------------- Root tags

async function expectRootTags(page: Page, locations: string[]) {
  const script = await scriptShown(page);
  for (const location of locations) {
    const c = card(page, location);
    await c.scrollIntoViewIfNeeded();
    const root = rootAt(location);
    if (root) {
      const tag = rootTag(c, root.letters);
      await expect(tag, `${location} Root tag ${root.letters}`).toHaveCount(1);
      await expect(tag, `${location} Root tag`).toBeVisible();
      await expect(tag, `${location} Root tag text`).toContainText(root.letters);
      expect(await showsArrow(tag), `${location} Root tag shows ↗`).toBe(true);
    } else {
      // Its one button is its Particle tag (#249), named by its particle's text, never a Root's letters.
      const particle = particleAt(location)!;
      await expect(c.getByRole("button"), `${location} has no Root tag, only its Particle tag`).toHaveCount(1);
      await expect(c.getByRole("button"), `${location}'s Particle tag`).toHaveAccessibleName(particleText(particle, script));
    }
  }
}

/** The Surah the page shows: the one this scenario opened, else the one in its URL. */
const surahShown = (page: Page, reading: Reading) =>
  reading.surah ?? Number(new URL(page.url()).pathname.split("/")[2]);

const locationsWith = (surah: number, hasRoot: boolean, prefix = "") =>
  sourceWords(surah)
    .map((w) => w.location)
    .filter((l) => l.startsWith(prefix) && !!rootAt(l) === hasRoot);

Then(
  "every Word card whose Word QUL gives a Root shows one Root tag with that Root's letters and ↗",
  async ({ page, reading }) => {
    const withRoot = locationsWith(surahShown(page, reading), true);
    expect(withRoot.length, "Words with a Root").toBeGreaterThan(0);
    await expectRootTags(page, withRoot);
  },
);

Then("every other Word card shows no Root tag", async ({ page, reading }) => {
  const without = locationsWith(surahShown(page, reading), false);
  expect(without.length, "Words with no Root").toBeGreaterThan(0);
  await expectRootTags(page, without);
});

Then(
  "every Word card in Ayah {word} whose Word QUL gives a Root shows one Root tag with that Root's letters and ↗",
  async ({ page, reading }, ayah: string) => {
    const withRoot = locationsWith(surahOf(reading), true, `${ayah}:`);
    expect(withRoot.length, `Words of ${ayah} with a Root`).toBeGreaterThan(0);
    await expectRootTags(page, withRoot);
  },
);

Then("every other Word card in Ayah {word} shows no Root tag", async ({ page, reading }, ayah: string) => {
  const without = locationsWith(surahOf(reading), false, `${ayah}:`);
  expect(without.length, `Words of ${ayah} with no Root`).toBeGreaterThan(0);
  await expectRootTags(page, without);
});

Then("the Word card at {location} shows no Root tag", async ({ page }, location: string) => {
  expect(rootAt(location), `QUL gives ${location} no Root`).toBeNull();
  await expectRootTags(page, [location]);
});

Then("the Word card at {location} shows a Root tag for {string}", async ({ page }, location: string, letters: string) => {
  expect(rootAt(location)?.letters, `QUL's Root at ${location}`).toBe(letters);
  await expectRootTags(page, [location]);
});

// ---------------------------------------------------------------- opening and closing

When("I open the Root tag on the Word card at {location}", async ({ page, reading }, location: string) => {
  const root = rootAt(location);
  if (!root) throw new Error(`QUL gives ${location} no Root`);
  await card(page, location).scrollIntoViewIfNeeded();
  const tag = rootTag(card(page, location), root.letters);
  await expect(tag, `the Root tag for ${root.letters} on the Word card at ${location}`).toBeVisible();
  await tag.click();
  reading.root = root.letters;
});

async function expectRootDialogOpen(page: Page, letters: string) {
  const dialog = rootDialog(page);
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveAccessibleName(new RegExp(letters));
  await expect(dialog.getByText(letters, { exact: true }).first()).toBeVisible();
}

Then("the Root dialog for {string} is open", async ({ page }, letters: string) => {
  await expectRootDialogOpen(page, letters);
});

Then("the Root dialog for the Root QUL gives {location} is open", async ({ page }, location: string) => {
  await expectRootDialogOpen(page, rootAt(location)!.letters);
});

Then("no Root dialog for {string} is open", async ({ page }, letters: string) => {
  await expect(page.getByRole("dialog", { name: letters })).toHaveCount(0);
});

Then("no Root/Particle dialog is open", async ({ reader }) => {
  await expect(rootDialog(reader.page)).toHaveCount(0);
});

When("I close the Root/Particle dialog with its close button", async ({ reader }) => {
  await rootDialog(reader.page).getByRole("button", { name: STRINGS.close, exact: true }).click();
});

When("I close the Root/Particle dialog with Escape", async ({ reader }) => {
  await reader.page.keyboard.press("Escape");
});

When("I close the Root/Particle dialog with a click outside", async ({ reader }) => {
  await clickOutside(rootDialog(reader.page));
});

Then("the Root tag on the Word card at {location} has focus", async ({ page }, location: string) => {
  await expect(rootTag(card(page, location), rootAt(location)!.letters)).toBeFocused();
});

// ---------------------------------------------------------------- accessibility

Then("the Root/Particle dialog is a modal dialog whose accessible name holds {string}", async ({ page }, letters: string) => {
  const dialog = rootDialog(page);
  await expect(dialog).toHaveAccessibleName(new RegExp(letters));
  expect(await isModal(dialog), "aria-modal").toBe(true);
});

Then("focus is inside the Root/Particle dialog", async ({ page }) => {
  await expect.poll(() => focusInside(rootDialog(page))).toBe(true);
});

Then("its close button is named {string}", async ({ page }, name: string) => {
  await expect(rootDialog(page).getByRole("button", { name, exact: true })).toBeVisible();
});

// Notes, after each press, whether focus is inside the open dialog (the Root dialog, the Settings drawer or the Delete Account confirmation, an alertdialog).
When("I press {word} {int} times", async ({ page, reading }, key: string, times: number) => {
  reading.focusTrail = [];
  for (let i = 0; i < times; i++) {
    await page.keyboard.press(key);
    reading.focusTrail.push(await focusInside(page.getByRole("dialog").or(page.getByRole("alertdialog"))));
  }
});

Then("focus stayed inside the Root/Particle dialog after every press", async ({ reading }) => {
  expectFocusStayedInside(reading.focusTrail);
});

Then(
  "every Lemma row is a button that says whether it is expanded and names the Spellings it controls",
  async ({ page, reading }) => {
    const rows = lemmaRows(rootDialog(page));
    await expect(rows).toHaveCount(openedRoot(reading).lemmas.length);
    for (const row of await rows.all()) {
      await expect(row).toHaveRole("button");
      expect(["true", "false"]).toContain(await row.getAttribute("aria-expanded"));
      const id = await row.getAttribute("aria-controls");
      expect(id, "aria-controls").toBeTruthy();
      await expect(page.locator(`[id="${id}"]`), `the Spellings ${id} names`).toHaveCount(1);
    }
  },
);

// ---------------------------------------------------------------- header and Lemma rows

Then("the Root dialog is centred on the screen", async ({ page }) => {
  const box = (await rootDialog(page).boundingBox())!;
  const { width, height } = page.viewportSize()!;
  expect(Math.abs(box.x + box.width / 2 - width / 2), "horizontal centre").toBeLessThanOrEqual(2);
  expect(Math.abs(box.y + box.height / 2 - height / 2), "vertical centre").toBeLessThanOrEqual(2);
});

/** The dialog's visible text before its first Lemma row: its header. */
async function headerText(page: Page) {
  const dialog = rootDialog(page);
  const all = await dialog.innerText();
  const first = await lemmaRows(dialog).first().innerText();
  const at = all.indexOf(first);
  expect(at, "the first Lemma row's text in the dialog").toBeGreaterThan(0);
  return all.slice(0, at);
}

Then(
  "the Root dialog's header shows {string}, {string}, {int} occurrences and {int} unique Words",
  async ({ page, reading }, letters: string, transliteration: string, occurrences: number, unique: number) => {
    const root = openedRoot(reading);
    expect(root.letters, "the opened Root").toBe(letters);
    expect([root.wordsCount, root.uniqueWords], "QUL's word root database counts").toEqual([occurrences, unique]);
    await expect(rootDialog(page).getByRole("heading", { name: letters, exact: true })).toBeVisible();
    const header = await headerText(page);
    expect(header, "letters").toContain(letters);
    expect(header, "transliteration").toContain(transliteration);
    expect(holdsNumber(header, occurrences), `${occurrences} in "${header}"`).toBe(true);
    expect(holdsNumber(header, unique), `${unique} in "${header}"`).toBe(true);
  },
);

Then("the Root dialog's header shows no meaning", async ({ page, reading }) => {
  const root = openedRoot(reading);
  const meanings = new Set(
    [
      ...rootsJsonMeanings(root.letters),
      ...root.lemmas.flatMap((l) => [l.meaning.ur, l.meaning.en, ...l.spellings.flatMap((s) => [s.meaning.ur, s.meaning.en])]),
    ].filter((m) => m && m.trim().length >= 3),
  );
  const header = await headerText(page);
  expect([...meanings].filter((m) => header.includes(m)), "meanings in the header").toEqual([]);
});

Then(
  "the Root dialog lists ر ح م's {int} Lemmas, most frequent first, each with its Lemma, its count and its representative meaning in {language}",
  async ({ page, reading }, count: number, lang: Language) => {
    const root = openedRoot(reading);
    expect(root.letters).toBe("ر ح م");
    expect(root.lemmas.length, "QUL's Lemmas of ر ح م").toBe(count);
    const rows = lemmaRows(rootDialog(page));
    await expect(rows).toHaveCount(count);
    for (const [i, lemma] of root.lemmas.entries()) {
      const text = await rows.nth(i).innerText();
      if (lemma.text) expect(text, `row ${i + 1} Lemma`).toContain(lemma.text);
      expect(holdsNumber(text, lemma.occurrences), `row ${i + 1} count ${lemma.occurrences} in "${text}"`).toBe(true);
      expect(text, `row ${i + 1} count in English`).toContain(`${lemma.occurrences}×`);
      expect(text, `row ${i + 1} meaning`).toContain(lemma.meaning[lang]);
    }
  },
);

Then(
  "the Root dialog is English and runs left to right, with its {string} label, its {string} title and its counts as {string}",
  async ({ page }, label: string, title: string, counts: string) => {
    const dialog = rootDialog(page);
    // The dialog has no lang of its own: it is the page's English.
    expect(await dialog.evaluate((el) => el.closest("[lang]")?.getAttribute("lang")), "the dialog's language").toBe("en");
    expect(await dialog.evaluate((el) => getComputedStyle(el).direction), "the dialog's direction").toBe("ltr");
    await expect(dialog.getByText(label, { exact: true })).toBeVisible();
    await expect(dialog.getByText(title, { exact: true })).toBeVisible();
    await expect(dialog.getByText(counts, { exact: true })).toBeVisible();
  },
);

/** Every element in `scope` showing `meaning` (or the dash shown for none) is marked `lang` and runs `dir`. */
const expectMeaningIn = (scope: Locator, meaning: string, lang: string, dir: string, what: string) =>
  expectLangDir(scope.getByText(meaning || "—", { exact: true }), lang, dir, `${what} "${meaning}"`);

Then("each Lemma row's representative meaning is marked lang {string} and runs {string}", async ({ page, reading }, lang: string, dir: string) => {
  const rows = lemmaRows(rootDialog(page));
  for (const [i, lemma] of openedRoot(reading).lemmas.entries()) {
    await expectMeaningIn(rows.nth(i), lemma.meaning[langOf(reading)], lang, dir, `row ${i + 1} meaning`);
  }
});

Then(
  "each Spelling meaning of Lemma row {int} is marked lang {string} and runs {string}",
  async ({ page, reading }, n: number, lang: string, dir: string) => {
    const panel = await lemmaPanel(page, row(page, n));
    for (const s of openedRoot(reading).lemmas[n - 1].spellings) {
      await expectMeaningIn(panel, s.meaning[langOf(reading)], lang, dir, `Spelling ${s.locations[0]} meaning`);
    }
  },
);

/** Half a pixel, for subpixel rounding of box edges. */
const EDGE = 0.5;

/**
 * The Arabic in `scope` sits flush with its right side (bar the scope's own
 * padding) and wholly to the right of the text marked `lang` that goes with it: its meaning or transliteration.
 */
async function expectArabicRightOf(scope: Locator, lang: string, what: string) {
  const [box, arabic, meaning] = await Promise.all(
    [scope, scope.locator(':scope [lang="ar"]').first(), scope.locator(`:scope [lang="${lang}"]`).first()].map(async (l) => {
      const b = await l.boundingBox();
      expect(b, `${what}: shown`).not.toBeNull();
      return b!;
    }),
  );
  const padding = await scope.evaluate((el) => parseFloat(getComputedStyle(el).paddingRight));
  expect(box.x + box.width - padding - (arabic.x + arabic.width), `${what}: the Arabic is flush right`).toBeLessThanOrEqual(EDGE);
  expect(arabic.x, `${what}: the Arabic's left edge is right of its meaning's right edge`).toBeGreaterThanOrEqual(
    meaning.x + meaning.width - EDGE,
  );
}

Then("the Root dialog's header shows its letters flush right and their transliteration to their left", async ({ page }) => {
  await expectArabicRightOf(rootDialog(page).locator("header"), "ar-Latn", "the Root dialog's header");
});

Then("every Lemma row shows its Lemma to the right of its representative meaning", async ({ page, reading }) => {
  const rows = await lemmaRows(rootDialog(page)).all();
  expect(rows.length, "Lemma rows").toBeGreaterThan(0);
  for (const [i, r] of rows.entries()) await expectArabicRightOf(r, langOf(reading), `Lemma row ${i + 1}`);
});

Then(
  "every Spelling of Lemma row {int} shows its text to the right of its meaning",
  async ({ page, reading }, n: number) => {
    const spellings = await (await lemmaPanel(page, row(page, n))).locator(":scope > li").all();
    expect(spellings.length, `Spellings of Lemma row ${n}`).toBeGreaterThan(0);
    for (const [i, s] of spellings.entries()) await expectArabicRightOf(s, langOf(reading), `Spelling ${i + 1}`);
  },
);

Then("every Lemma row is collapsed and no Spelling is shown", async ({ page }) => {
  const dialog = rootDialog(page);
  for (const row of await lemmaRows(dialog).all()) await expect(row).toHaveAttribute("aria-expanded", "false");
  await expect(lemmaList(dialog).getByRole("link")).toHaveCount(0);
});

// ---------------------------------------------------------------- Spellings

const row = (page: Page, n: number) => lemmaRows(rootDialog(page)).nth(n - 1);

async function expand(page: Page, n: number) {
  const r = row(page, n);
  if ((await r.getAttribute("aria-expanded")) !== "true") await r.click();
  await expect(r).toHaveAttribute("aria-expanded", "true");
}

// A no-op on a Lemma row already open: the tapped Word's own opens with the dialog (#322).
When("I expand Lemma row {int} of the Root dialog", async ({ page }, n: number) => {
  await expand(page, n);
});

When("I expand every Lemma row of the Root dialog", async ({ page, reading }) => {
  const lemmas = openedRoot(reading).lemmas.length;
  for (let n = 1; n <= lemmas; n++) await expand(page, n);
});

When("I collapse Lemma row {int} of the Root dialog", async ({ page }, n: number) => {
  await row(page, n).click();
});

Then("Lemma row {int} is expanded", async ({ page }, n: number) => {
  await expect(row(page, n)).toHaveAttribute("aria-expanded", "true");
  await expect(await lemmaPanel(page, row(page, n))).toBeVisible();
});

Then("Lemma row {int} is collapsed and its Spellings are hidden", async ({ page }, n: number) => {
  await expect(row(page, n)).toHaveAttribute("aria-expanded", "false");
  await expect(await lemmaPanel(page, row(page, n))).toBeHidden();
});

/** The links of a Lemma's Spellings, as the page resolves them: `pathname#hash` and their accessible text. */
const linksOf = (panel: Locator) =>
  panel.getByRole("link").evaluateAll((links) =>
    links.map((a) => {
      const url = new URL((a as HTMLAnchorElement).href);
      return { target: url.pathname + url.hash, name: a.getAttribute("aria-label") ?? a.textContent ?? "" };
    }),
  );

/**
 * `spellings` are shown in `panel` in order (a Lemma row's, or the Particle
 * dialog's), each as its text in `script` (never the other Script's, where
 * they differ), then its meaning in `lang`, then one link per Word location,
 * in Quran order, to `/<lang>/<s>#<s:a:w>`.
 */
export async function expectSpellings(panel: Locator, spellings: ExpectedSpelling[], script: Script, lang: Language, what: string) {
  await expect(panel).toBeVisible();
  const other: Script = script === "uthmani" ? "indopak" : "uthmani";
  const visible = (text: string) => panel.getByText(text, { exact: true }).filter({ visible: true });
  // Spellings differ in Uthmani text, but two can share their Indo-Pak text
  // (رَّحِيمٞ and رَّحِيمٌ are both رَّحِيْمٌ): a text shows once for each Spelling written that way.
  const shown = spellings.map((s) => spellingText(s, script));
  const shownCount = (text: string) => shown.filter((t) => t === text).length;
  /** Spelling `i`'s own element: the k-th element with its text, k counting earlier Spellings written alike. */
  const textOf = (i: number) => visible(shown[i]).nth(shown.slice(0, i).filter((t) => t === shown[i]).length);
  for (const s of spellings) {
    await expect(visible(spellingText(s, script)), `Spelling ${s.locations[0]} in ${script}`).toHaveCount(
      shownCount(spellingText(s, script)),
    );
    if (s.uthmani !== s.indopak) {
      await expect(visible(spellingText(s, other)), `Spelling ${s.locations[0]} not in ${other}`).toHaveCount(
        shownCount(spellingText(s, other)),
      );
    }
  }
  // Each Spelling's text comes before its meaning, which comes before the next Spelling's text.
  inOrder(
    await panel.innerText(),
    spellings.flatMap((s) => [spellingText(s, script), s.meaning[lang]]),
    `${what} Spellings and meanings`,
  );
  // One link per Word location, in order, each after its Spelling's text and before the next Spelling's.
  const links = await linksOf(panel);
  const locations = spellings.flatMap((s) => s.locations);
  expect(
    links.map((l) => l.target),
    `${what} Word location links`,
  ).toEqual(locations.map((l) => `/${lang}/${l.split(":")[0]}#${l}`));
  links.forEach((l, i) => expect(l.name, `link to ${locations[i]}`).toContain(locations[i]));
  const all = panel.getByRole("link");
  let at = 0;
  for (const [i, s] of spellings.entries()) {
    expect(await precedes(textOf(i), all.nth(at)), `${s.locations[0]}'s text before its links`).toBe(true);
    at += s.locations.length;
    if (i + 1 < spellings.length) {
      expect(await precedes(all.nth(at - 1), textOf(i + 1)), `${s.locations[0]}'s links before the next Spelling`).toBe(true);
    }
  }
}

Then(
  "Lemma row {int} shows its {int} Spellings, most frequent first, each in its {script} text only, with its meaning in {language} and a link to each of its Word locations in Quran order",
  async ({ page, reading }, n: number, count: number, script: Script, lang: Language) => {
    const lemma = openedRoot(reading).lemmas[n - 1];
    expect(lemma.spellings.length, `Spellings of Lemma ${n} in the sources`).toBe(count);
    await expect(row(page, n)).toHaveAttribute("aria-expanded", "true");
    await expectSpellings(await lemmaPanel(page, row(page, n)), lemma.spellings, script, lang, `Lemma row ${n}`);
  },
);

Then(
  "every Lemma row shows its Spellings, most frequent first, each in its {script} text only, with its meaning in {language} and a link to each of its Word locations in Quran order",
  async ({ page, reading }, script: Script, lang: Language) => {
    for (const [i, lemma] of openedRoot(reading).lemmas.entries()) {
      await expectSpellings(await lemmaPanel(page, row(page, i + 1)), lemma.spellings, script, lang, `Lemma row ${i + 1}`);
    }
  },
);

Then(
  "the Root dialog shows {int} Spellings and links to all {int} of ر ح م's Word locations",
  async ({ page, reading }, spellings: number, occurrences: number) => {
    const root = openedRoot(reading);
    expect(root.lemmas.reduce((n, l) => n + l.spellings.length, 0), "Spellings in the sources").toBe(spellings);
    expect(root.wordsCount, "QUL's occurrences").toBe(occurrences);
    const targets = await linksOf(lemmaList(rootDialog(page)));
    expect(targets.length).toBe(occurrences);
    expect(new Set(targets.map((t) => t.target.split("#")[1]))).toEqual(new Set(qulLocationsOf(root.id)));
  },
);

// ---------------------------------------------------------------- phones and themes

Then("the Root/Particle dialog fits within the screen", async ({ page }) => {
  const box = (await rootDialog(page).boundingBox())!;
  const { width, height } = page.viewportSize()!;
  expect(box.x, "left").toBeGreaterThanOrEqual(0);
  expect(box.y, "top").toBeGreaterThanOrEqual(0);
  expect(box.x + box.width, "right").toBeLessThanOrEqual(width);
  expect(box.y + box.height, "bottom").toBeLessThanOrEqual(height);
});

Then("every Spelling of Lemma row {int} fits within the screen's width", async ({ page }, n: number) => {
  const panel = await lemmaPanel(page, row(page, n));
  const width = page.viewportSize()!.width;
  const boxes = await panel.locator("*").evaluateAll((els) =>
    els
      .map((el) => el.getBoundingClientRect())
      .filter((r) => r.width > 0 && r.height > 0)
      .map((r) => ({ left: r.left, right: r.right })),
  );
  expect(boxes.length).toBeGreaterThan(0);
  expect(boxes.filter((b) => b.left < -0.5 || b.right > width + 0.5), "parts of the Spellings off the screen's width").toEqual([]);
});

Then(
  "the last Word location link of Lemma row {int} can be scrolled into view inside the Root dialog",
  async ({ page }, n: number) => {
    const panel = await lemmaPanel(page, row(page, n));
    const last = panel.getByRole("link").last();
    await last.scrollIntoViewIfNeeded();
    await expect(last).toBeInViewport();
    const [link, dialog] = [(await last.boundingBox())!, (await rootDialog(page).boundingBox())!];
    expect(link.y, "inside the dialog, top").toBeGreaterThanOrEqual(dialog.y);
    expect(link.y + link.height, "inside the dialog, bottom").toBeLessThanOrEqual(dialog.y + dialog.height + 0.5);
  },
);

Then("I save a screenshot of the Root/Particle dialog {string}", async ({ page }, name: string) => {
  await shot(page, name);
});

// ---------------------------------------------------------------- going to a Word location

When("I choose the Word location {location} in the Root dialog", async ({ page, reading }, location: string) => {
  const lemmas = openedRoot(reading).lemmas;
  const n = lemmas.findIndex((l) => l.spellings.some((s) => s.locations.includes(location))) + 1;
  expect(n, `a Lemma of ${reading.root} holding ${location}`).toBeGreaterThan(0);
  await expand(page, n);
  const panel = await lemmaPanel(page, row(page, n));
  // A location's text may prefix a longer one's (2:16:3, 2:16:30): pick the link that goes exactly there.
  const index = (await linksOf(panel)).findIndex((t) => t.target.endsWith(`#${location}`));
  expect(index, `a link to ${location}`).toBeGreaterThanOrEqual(0);
  const target = panel.getByRole("link").nth(index);
  await target.scrollIntoViewIfNeeded();
  await target.click();
});

Then("I am on {string}", async ({ page, reading }, address: string) => {
  await expect(page).toHaveURL((url) => url.pathname + url.hash === address);
  const [, lang, surah] = address.match(/^\/(ur|en)\/(\d+)/)!;
  reading.lang = lang as Language;
  reading.surah = Number(surah);
});

const borderColor = (page: Page, location: string) => card(page, location).evaluate((el) => getComputedStyle(el).borderTopColor);

Then("the Word card at {location} is highlighted with the accent border", async ({ page }, location: string) => {
  const accent = await resolveColor(page, "var(--accent)");
  await expect.poll(() => borderColor(page, location)).toBe(accent);
});

Then("the Word card at {location} is not highlighted with the accent border", async ({ page }, location: string) => {
  const accent = await resolveColor(page, "var(--accent)");
  expect(await borderColor(page, location)).not.toBe(accent);
});

Then("I save a screenshot of the Word card at {location} {string}", async ({ page }, location: string, name: string) => {
  await expect(card(page, location)).toBeInViewport();
  await shot(page, name);
});

// ---------------------------------------------------------------- Root files

const TEXTUAL = /json|javascript|html|text|x-component/;

Given("I watch every response the page receives", async ({ page, reading }) => {
  const seen = (reading.responses = [] as NonNullable<Reading["responses"]>);
  page.on("response", async (res) => {
    const contentType = res.headers()["content-type"] ?? "";
    const text = TEXTUAL.test(contentType) ? await res.text().catch(() => "") : "";
    seen.push({ url: res.url(), contentType, text });
  });
});

When("the page has finished loading", async ({ page }) => {
  await page.waitForLoadState("networkidle");
});

/** Whether a response body is a Root's file: JSON with a Root's letters, transliteration and Lemmas. */
const isRootFile = (text: string) => {
  try {
    const json = JSON.parse(text);
    return !!json && typeof json === "object" && "lemmas" in json && "transliteration" in json;
  } catch {
    return false;
  }
};

Then(
  "no response so far holds a Root's file or ر ح م's transliteration {string}",
  async ({ reading }, transliteration: string) => {
    const seen = reading.responses ?? [];
    expect(seen.length, "responses watched").toBeGreaterThan(0);
    // The transliteration as written, or with its ḥ escaped as JavaScript or JSON would write it.
    const escaped = transliteration.replace(/[^\x00-\x7f]/g, (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, "0")}`);
    const holding = seen.filter((r) => isRootFile(r.text) || r.text.includes(transliteration) || r.text.toLowerCase().includes(escaped));
    expect(holding.map((r) => r.url)).toEqual([]);
  },
);

Then(
  "the page has fetched {string} once and no other Root's file",
  async ({ reading }, address: string) => {
    const seen = () => (reading.responses ?? []).filter((r) => new URL(r.url).pathname === address);
    await expect.poll(() => seen().length, `a response for ${address}`).toBeGreaterThan(0);
    expect(seen().length, `responses for ${address}`).toBe(1);
    const others = (reading.responses ?? []).filter((r) => new URL(r.url).pathname !== address && isRootFile(r.text));
    expect(others.map((r) => r.url), "other Root files").toEqual([]);
  },
);

Then("that response is data\\/generated\\/roots\\/{int}.json as last committed", async ({ reading }, id: number) => {
  const response = (reading.responses ?? []).find((r) => new URL(r.url).pathname === `/roots/${id}.json`)!;
  expect(response.contentType).toMatch(/application\/json/);
  expect(JSON.parse(response.text)).toEqual(committedRoot(id));
});

Then(
  "every Root id in QUL's word root database answers at {string} with status 200, a JSON content type and its committed file",
  async ({ request }, pattern: string) => {
    const ids = [...qulAnalysis().roots.keys()].sort((a, b) => a - b);
    expect(ids.length, "QUL's Roots").toBe(1642);
    const failures: string[] = [];
    for (const id of ids) {
      const address = pattern.replace("<id>", String(id));
      const res = await request.get(address);
      if (failures.length >= 20) break;
      if (res.status() !== 200) {
        failures.push(`${address}: ${res.status()}`);
        continue;
      }
      if (!/application\/json/.test(res.headers()["content-type"] ?? "")) failures.push(`${address}: ${res.headers()["content-type"]}`);
      const served = await res.json();
      if (JSON.stringify(served) !== JSON.stringify(committedRoot(id))) failures.push(`${address}: differs from its committed file`);
    }
    expect(failures).toEqual([]);
  },
);

// ---------------------------------------------------------------- the tapped Word's mark (#322)

/** For each element `l` finds, whether it is drawn on the pale tint a Root page marks its Words with: its own background, not what shows through. */
export async function tintedOf(page: Page, l: Locator): Promise<boolean[]> {
  const tint = await resolveColor(page, "var(--root-word)");
  return l.evaluateAll((els, tint) => els.map((el) => getComputedStyle(el).backgroundColor === tint), tint);
}

/** The 1-based numbers of the Lemma rows drawn on the tint. */
const tintedRows = async (page: Page) =>
  (await tintedOf(page, lemmaRows(rootDialog(page)))).flatMap((tinted, i) => (tinted ? [i + 1] : []));

async function expectMarkedRow(page: Page, n: number, text: string | null, reading: Reading) {
  const lemmas = openedRoot(reading).lemmas;
  // Canonically, as the same Lemma may be typed with its marks in another order (a shadda before or after its fatha).
  expect(lemmas[n - 1].text?.normalize("NFC") ?? null, `Lemma ${n} of ${reading.root} in the sources`).toBe(text?.normalize("NFC") ?? null);
  await expect(lemmaRows(rootDialog(page))).toHaveCount(lemmas.length);
  await expect(row(page, n)).toHaveAttribute("aria-expanded", "true");
  await expect(await lemmaPanel(page, row(page, n))).toBeVisible();
  await expect.poll(() => tintedRows(page), "the tinted Lemma rows").toEqual([n]);
}

Then("Lemma row {int}, {string}, is the one marked, tinted and expanded", async ({ page, reading }, n: number, text: string) => {
  await expectMarkedRow(page, n, text, reading);
});

Then("Lemma row {int}, the Words with no Lemma, is the one marked, tinted and expanded", async ({ page, reading }, n: number) => {
  await expectMarkedRow(page, n, null, reading);
});

Then("every Lemma row but row {int}, the marked one, is collapsed", async ({ page }, n: number) => {
  const rows = await lemmaRows(rootDialog(page)).all();
  expect(rows.length, "Lemma rows").toBeGreaterThan(1);
  for (const [i, r] of rows.entries()) await expect(r, `Lemma row ${i + 1}`).toHaveAttribute("aria-expanded", i + 1 === n ? "true" : "false");
});

Given("ر ح م's Root file is served without the Word location {location}", async ({ page }, location: string) => {
  const { id } = qulRootNamed("ر ح م");
  await page.route(`**/roots/${id}.json`, async (route) => {
    const response = await route.fetch();
    const root = await response.json();
    for (const lemma of root.lemmas) for (const s of lemma.spellings) s.locations = s.locations.filter((l: string) => l !== location);
    await route.fulfill({ response, json: root });
  });
});

Then("no Lemma row is tinted", async ({ page }) => {
  await expect(lemmaRows(rootDialog(page)).first()).toBeVisible();
  expect(await tintedRows(page)).toEqual([]);
});

Then("only Lemma row {int} is tinted", async ({ page }, n: number) => {
  expect(await tintedRows(page)).toEqual([n]);
});

Then(
  "in Lemma row {int} only the Spelling holding {location} is tinted, in the Root page's tint",
  async ({ page, reading }, n: number, location: string) => {
    await expectTintedSpelling(page, await lemmaPanel(page, row(page, n)), openedRoot(reading).lemmas[n - 1].spellings, location);
  },
);

/** That of the `spellings` `list` shows only the one holding `location` is tinted. */
export async function expectTintedSpelling(page: Page, list: Locator, spellings: ExpectedSpelling[], location: string) {
  const marked = spellings.findIndex((s) => s.locations.includes(location));
  expect(marked, `a Spelling holding ${location}`).toBeGreaterThanOrEqual(0);
  const items = list.locator(":scope > li");
  await expect(items).toHaveCount(spellings.length);
  const tinted = (await tintedOf(page, items)).flatMap((t, i) => (t ? [spellings[i].locations[0]] : []));
  expect(tinted, "the tinted Spellings, by their first Word location").toEqual([spellings[marked].locations[0]]);
}

/** That of the Word location links in `list` only `location`'s is tinted, and it alone carries aria-current. */
export async function expectCurrentLink(page: Page, list: Locator, location: string) {
  const current = list.locator('a[aria-current="true"]');
  await expect(current).toHaveCount(1);
  expect(new URL((await current.getAttribute("href"))!, "http://x").hash, "the current link's target").toBe(`#${location}`);
  const links = list.getByRole("link");
  const [tinted, names] = await Promise.all([tintedOf(page, links), links.allInnerTexts()]);
  expect(names.filter((_, i) => tinted[i]), "the tinted Word location links").toEqual([location]);
}

Then("only the Word location link {location} is tinted and says it is the current one", async ({ page }, location: string) => {
  await expectCurrentLink(page, lemmaList(rootDialog(page)), location);
});

Then("Lemma row {int} says, to a screen reader only, that it is this Word's Lemma", async ({ page }, n: number) => {
  const rows = lemmaRows(rootDialog(page));
  await expect(row(page, n)).toHaveAccessibleName(new RegExp(STRINGS.thisWordsLemma));
  const said = row(page, n).getByText(STRINGS.thisWordsLemma);
  expect(await said.evaluate((el) => el.getBoundingClientRect().width * el.getBoundingClientRect().height), "its words take no room on screen").toBeLessThanOrEqual(1);
  const saying = (await rows.allInnerTexts()).flatMap((text, i) => (text.includes(STRINGS.thisWordsLemma) ? [i + 1] : []));
  expect(saying, "the Lemma rows saying they are this Word's Lemma").toEqual([n]);
});
