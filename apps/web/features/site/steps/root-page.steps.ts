// Steps for a Root page (#287): features/site/root-page.feature. What a Root
// holds (its Lemmas in the Root dialog's order, their Spellings, meanings and
// Word locations) is read from QUL's databases and the sources through
// ./roots, as the Root dialog's steps read it; Arabic and Ayah translations
// from the sources. Things are found by role, link address, `data-ayah` and
// `data-location`.
//
// The page's shape these steps expect: the Root's letters in the <h1> of
// <main>'s <header>, with its transliteration, counts and Memorized?; the
// Lemma row a navigation named "Lemmas", one link per Lemma to its section;
// each Lemma section a <section> of <main> headed by an <h2>, its Lemma's
// Arabic marked lang="ar" (none for the Words with no Lemma); each Spelling
// part headed by an <h3> and followed by its list of Ayahs, the parts in
// order; each Ayah an item whose `data-ayah` is its `s:a` and whose link is
// named by it; each marked Word an element whose `data-location` is its Word
// location, inside the Ayah's Arabic.

import { expect, type Locator, type Page } from "@playwright/test";
import { ayahTranslation, cardLocations, nextFrames, PHONE, STRINGS, type Language } from "../support";
import { Given, Then, When, type Reading } from "./fixtures";
import { expectMarkedUnlikeUntargeted } from "./flowing.steps";
import { drawnOf, lettersOf, tintedIn, wordIn } from "./marked-words.steps";
import { fetchPage, type App } from "./link-preview.steps";
import { contrast } from "./phrase-colours.steps";
import { closeSettings, fontSize, openSettings, scriptText, translationSwitch, type Script } from "./reader";
import { holdsNumber } from "./roots.steps";
import { compareLocations, expectedRoot, rootPagePath, scriptShown, spellingText, type ExpectedRoot, type ExpectedSpelling } from "./roots";
import { arabicPattern, whole } from "./share-page.steps";

const OTHER_SCRIPT: Record<Script, Script> = { uthmani: "indopak", indopak: "uthmani" };
/** The `s:a` of a Word location. */
export const ayahOf = (location: string) => location.split(":").slice(0, 2).join(":");
const byAyah = (a: string, b: string) => compareLocations(`${a}:0`, `${b}:0`);

export const main = (page: Page) => page.locator("main");
/** The Lemma sections, in order. */
export const lemmaSections = (page: Page) => main(page).locator("section");
/** The Root page's Memorized? choice. */
const memorized = (page: Page) => main(page).locator("header").getByRole("switch", { name: STRINGS.memorized, exact: true });

/** Every Spelling of `root`, in the page's order, beside its Lemma's place. */
export const spellingsOf = (root: ExpectedRoot) => root.lemmas.flatMap((lemma, l) => lemma.spellings.map((spelling) => ({ l, spelling })));

/** The Spelling parts of the page, in order: each its heading and its list of Ayahs. */
async function spellingSections(page: Page): Promise<{ heading: Locator; ayahs: Locator }[]> {
  const sections = lemmaSections(page);
  await expect(sections.first(), "a Lemma section").toBeVisible();
  const parts: { heading: Locator; ayahs: Locator }[] = [];
  for (let s = 0; s < (await sections.count()); s++) {
    const section = sections.nth(s);
    const headings = section.getByRole("heading", { level: 3 });
    const lists = section.locator("ol");
    expect(await lists.count(), `the Ayah lists of Lemma section ${s + 1}, beside its Spelling headings`).toBe(await headings.count());
    for (let p = 0; p < (await headings.count()); p++) parts.push({ heading: headings.nth(p), ayahs: lists.nth(p).locator("li[data-ayah]") });
  }
  return parts;
}

/** The parts of the page beside the Spellings of `root` they should show, after checking there are as many. */
async function partsOf(page: Page, root: ExpectedRoot) {
  const parts = await spellingSections(page);
  const spellings = spellingsOf(root);
  expect(parts.length, `the Spelling parts of ${root.letters}`).toBe(spellings.length);
  return spellings.map((s, n) => ({ ...s, ...parts[n] }));
}

/** The Ayahs a Spelling occurs in, each once, in Quran order. */
export const ayahsOfSpelling = (s: ExpectedSpelling) => [...new Set(s.locations.map(ayahOf))].sort(byAyah);

/** What the scenario noted of the Root page. */
const noted = new WeakMap<Reading, { tint?: string; opened?: string }>();
const notesOf = (reading: Reading) => {
  if (!noted.has(reading)) noted.set(reading, {});
  return noted.get(reading)!;
};

/** The one tint every marked Word on the page is drawn in. */
async function markedTint(page: Page): Promise<string> {
  const marked = main(page).locator('li[data-ayah] [lang="ar"] [data-location]').filter({ visible: true });
  await expect(marked.first(), "a marked Word on the Root page").toBeVisible();
  const tints = new Set<string>();
  for (let i = 0; i < (await marked.count()); i++) tints.add(await drawnOf(marked.nth(i)));
  expect([...tints], "the tints of the Root page's marked Words").toHaveLength(1);
  return [...tints][0];
}

// ---------------------------------------------------------------- the header

Then(
  "the Root page's heading is {string}, with {string}, {int} occurrences and {int} unique Words",
  async ({ reader }, letters: string, transliteration: string, occurrences: number, unique: number) => {
    const root = expectedRoot(letters);
    expect([root.wordsCount, root.uniqueWords], "QUL's word root database counts").toEqual([occurrences, unique]);
    const header = main(reader.page).locator("header");
    await expect(header.getByRole("heading", { level: 1 })).toHaveText(letters);
    const text = await header.innerText();
    expect(text, "transliteration").toContain(transliteration);
    expect(holdsNumber(text, occurrences), `${occurrences} in "${text}"`).toBe(true);
    expect(holdsNumber(text, unique), `${unique} in "${text}"`).toBe(true);
  },
);

/** The Lemma row's links, in order. */
const lemmaLinks = (page: Page) => main(page).getByRole("navigation", { name: STRINGS.lemmasTitle, exact: true }).getByRole("link");

Then(
  "the Root page's Lemma row lists the {int} Lemmas of {string} in the Root dialog's order, each with its count",
  async ({ reader }, n: number, letters: string) => {
    const root = expectedRoot(letters);
    expect(root.lemmas, `QUL's Lemmas of ${letters}`).toHaveLength(n);
    const links = lemmaLinks(reader.page);
    await expect(links).toHaveCount(n);
    for (const [i, lemma] of root.lemmas.entries()) {
      const link = links.nth(i);
      const arabic = link.locator('[lang="ar"]');
      if (lemma.text === null) await expect(arabic, `Lemma ${i + 1}, with none, shows no Arabic`).toHaveCount(0);
      else await expect(arabic, `Lemma ${i + 1}'s text`).toHaveText(lemma.text);
      const text = await link.innerText();
      expect(holdsNumber(text, lemma.occurrences), `Lemma ${i + 1}'s count ${lemma.occurrences} in "${text}"`).toBe(true);
      const href = await link.getAttribute("href");
      expect(href, `Lemma ${i + 1}'s link`).toMatch(/^#./);
      const target = await reader.page.evaluate((id) => {
        const el = document.getElementById(id);
        return el ? Array.from(document.querySelectorAll("main section")).indexOf(el as HTMLElement) : -2;
      }, decodeURIComponent(href!.slice(1)));
      expect(target, `Lemma ${i + 1}'s link leads to its own section`).toBe(i);
    }
  },
);

When("I follow the Root page's Lemma row to its last Lemma", async ({ reader }) => {
  await lemmaLinks(reader.page).last().click();
});

Then("the address leads to the last Lemma's section of {string}, which is on screen", async ({ reader }, letters: string) => {
  const root = expectedRoot(letters);
  const last = lemmaSections(reader.page).nth(root.lemmas.length - 1);
  const id = await last.getAttribute("id");
  await expect.poll(() => decodeURIComponent(new URL(reader.page.url()).hash)).toBe(`#${id}`);
  await expect(last.getByRole("heading", { level: 2 })).toBeInViewport();
});

Then(/^the Root page's Memorized\? is (on|off)$/, async ({ reader }, state: string) => {
  await expect(memorized(reader.page)).toHaveAttribute("aria-checked", String(state === "on"));
});

When("I switch the Root page's Memorized?", async ({ reader }) => {
  const choice = memorized(reader.page);
  // A tap before the page has hydrated does nothing.
  await expect(async () => {
    const was = await choice.getAttribute("aria-checked");
    await choice.click();
    await expect(choice).not.toHaveAttribute("aria-checked", was ?? "", { timeout: 1000 });
  }).toPass();
});

// ---------------------------------------------------------------- Lemma sections and Spellings

Then(
  "the Root page has a section for each Lemma of {string}, in the Root dialog's order, the Words with no Lemma in a section of their own",
  async ({ reader }, letters: string) => {
    const root = expectedRoot(letters);
    const sections = lemmaSections(reader.page);
    await expect(sections).toHaveCount(root.lemmas.length);
    for (const [i, lemma] of root.lemmas.entries()) {
      const heading = sections.nth(i).getByRole("heading", { level: 2 });
      const arabic = heading.locator('[lang="ar"]');
      if (lemma.text === null) await expect(heading, `Lemma section ${i + 1}, of the Words with no Lemma`).toContainText(STRINGS.withoutLemma);
      if (lemma.text === null) await expect(arabic, `Lemma section ${i + 1} shows no Lemma`).toHaveCount(0);
      else await expect(arabic, `Lemma section ${i + 1}'s Lemma`).toHaveText(lemma.text);
      const text = await heading.innerText();
      expect(holdsNumber(text, lemma.occurrences), `Lemma section ${i + 1}'s count ${lemma.occurrences} in "${text}"`).toBe(true);
    }
    if (root.lemmas.some((l) => l.text === null)) expect(root.lemmas.filter((l) => l.text === null), "sections of Words with no Lemma").toHaveLength(1);
  },
);

// The (Urdu|English) group is the {language} parameter type's pattern, so it arrives as "ur" or "en".
Then(
  /^each Spelling of "([^"]+)" shows its meaning in (Urdu|English) and its count, then the Ayahs it occurs in, in Quran order, each once$/,
  async ({ reader }, letters: string, lang: Language) => {
    const root = expectedRoot(letters);
    const script = await scriptShown(reader.page);
    for (const { spelling, heading, ayahs } of await partsOf(reader.page, root)) {
      const what = `the Spelling at ${spelling.locations[0]}`;
      await expect(heading.locator('[lang="ar"]').filter({ visible: true }), `${what}'s text`).toHaveText(spellingText(spelling, script));
      const meaning = spelling.meaning[lang] || STRINGS.noMeaning;
      await expect(heading.getByText(meaning, { exact: true }), `${what}'s meaning`).toBeVisible();
      await expect(heading.getByText(meaning, { exact: true })).toHaveAttribute("lang", lang);
      const text = await heading.innerText();
      expect(holdsNumber(text, spelling.locations.length), `${what}'s count ${spelling.locations.length} in "${text}"`).toBe(true);
      expect(await ayahs.evaluateAll((items) => items.map((i) => i.getAttribute("data-ayah"))), `${what}'s Ayahs`).toEqual(ayahsOfSpelling(spelling));
    }
  },
);

// ---------------------------------------------------------------- marking

Then(
  "under each Spelling of {string} exactly the Words of that Spelling are tinted, all in one tint, and a screen reader hears each as marked",
  async ({ reader }, letters: string) => {
    const { page } = reader;
    const root = expectedRoot(letters);
    const script = await scriptShown(page);
    const tints = new Set<string>();
    for (const { spelling, ayahs } of await partsOf(page, root)) {
      const what = `the Ayahs under the Spelling at ${spelling.locations[0]}`;
      await expect.poll(() => tintedIn(ayahs), { message: `the Words of ${what} drawn on a tint` }).toEqual([...spelling.locations].sort());
      for (const location of spelling.locations) {
        const word = wordIn(ayahs, location);
        await expect(word, `the Word at ${location}, on screen`).toHaveCount(1);
        tints.add(await drawnOf(word));
        const heard = await word.ariaSnapshot();
        expect(lettersOf(heard), `a screen reader hears the Word at ${location}'s Arabic`).toContain(lettersOf(scriptText(location, script)));
        expect(heard, `a screen reader hears the Word at ${location} as marked`).toMatch(/marked/i);
      }
    }
    expect([...tints], "the tints of the Root page's marked Words").toHaveLength(1);
    const behind = await drawnOf(main(page).locator('li[data-ayah] [lang="ar"]').filter({ visible: true }).first());
    expect([...tints][0], "the marked Words' tint, beside the Ayahs' own background").not.toBe(behind);
  },
);

Then("the Ayah holding a Spelling of {string} twice is listed once under it, with both its Words tinted", async ({ reader }, letters: string) => {
  const root = expectedRoot(letters);
  const found = (await partsOf(reader.page, root)).flatMap(({ spelling, ayahs }) => {
    const twice = ayahsOfSpelling(spelling).filter((a) => spelling.locations.filter((l) => ayahOf(l) === a).length > 1);
    return twice.map((ayah) => ({ ayah, spelling, ayahs }));
  });
  expect(found.length, `an Ayah holding a Spelling of ${letters} twice, in the sources`).toBeGreaterThan(0);
  for (const { ayah, spelling, ayahs } of found) {
    const item = ayahs.and(reader.page.locator(`[data-ayah="${ayah}"]`));
    await expect(item, `Ayah ${ayah} under the Spelling at ${spelling.locations[0]}`).toHaveCount(1);
    const words = spelling.locations.filter((l) => ayahOf(l) === ayah);
    expect(await tintedIn(item), `the tinted Words of Ayah ${ayah}`).toEqual([...words].sort());
  }
});

Then("the Ayah holding two Spellings of {string} is listed under each, tinted for that Spelling's Word only", async ({ reader }, letters: string) => {
  const root = expectedRoot(letters);
  const parts = await partsOf(reader.page, root);
  const shared = [...new Set(parts.flatMap(({ spelling }) => ayahsOfSpelling(spelling)))].filter(
    (ayah) => parts.filter(({ spelling }) => ayahsOfSpelling(spelling).includes(ayah)).length > 1,
  );
  expect(shared.length, `an Ayah holding two Spellings of ${letters}, in the sources`).toBeGreaterThan(0);
  for (const ayah of shared) {
    for (const { spelling, ayahs } of parts.filter(({ spelling }) => ayahsOfSpelling(spelling).includes(ayah))) {
      const item = ayahs.and(reader.page.locator(`[data-ayah="${ayah}"]`));
      await expect(item, `Ayah ${ayah} under the Spelling at ${spelling.locations[0]}`).toHaveCount(1);
      expect(await tintedIn(item), `the tinted Words of Ayah ${ayah} under the Spelling at ${spelling.locations[0]}`).toEqual(
        spelling.locations.filter((l) => ayahOf(l) === ayah).sort(),
      );
    }
  }
});

Then("no Ayah translation on the Root page is tinted", async ({ reader }) => {
  const { page } = reader;
  const lang = reader.language;
  const first = main(page).locator("li[data-ayah]").first();
  await expect(first.getByText(ayahTranslation((await first.getAttribute("data-ayah"))!, lang), { exact: true }), "an Ayah translation on screen").toBeVisible();
  const tinted = await main(page)
    .locator("li[data-ayah]")
    .evaluateAll((items) =>
      items.flatMap((item) =>
        Array.from(item.querySelectorAll<HTMLElement>("*"))
          .filter((el) => !el.closest('[lang="ar"]') && el.getClientRects().length > 0)
          .filter((el) => {
            const bg = getComputedStyle(el).backgroundColor;
            return bg !== "transparent" && !/^rgba\(.*,\s*0\)$/.test(bg);
          })
          .map((el) => `${item.getAttribute("data-ayah")}: <${el.tagName.toLowerCase()}> "${(el.textContent ?? "").slice(0, 30)}"`),
      ),
    );
  expect(tinted, "elements outside the Ayahs' Arabic drawn on a tint").toEqual([]);
});

Given("I note the tint of the Root page's marked Words", async ({ reader, reading }) => {
  notesOf(reading).tint = await markedTint(reader.page);
});

Then("the Root page's marked Words are drawn in the tint noted", async ({ reader, reading }) => {
  const noted = notesOf(reading).tint;
  if (!noted) throw new Error("no tint noted yet in this scenario");
  expect(await markedTint(reader.page), "the marked Words' tint").toBe(noted);
});

Then("the Arabic of each of the Root page's marked Words contrasts with its tint by at least 4.5 to 1", async ({ reader }) => {
  const marked = main(reader.page).locator('li[data-ayah] [lang="ar"] [data-location]').filter({ visible: true });
  await expect(marked.first()).toBeVisible();
  const low: string[] = [];
  for (let i = 0; i < (await marked.count()); i++) {
    const word = marked.nth(i);
    const [ink, tint] = [await word.evaluate((el) => getComputedStyle(el).color), await drawnOf(word)];
    const ratio = contrast(ink, tint);
    if (ratio < 4.5) low.push(`${await word.getAttribute("data-location")}: ${ink} on ${tint} is ${ratio.toFixed(2)} to 1`);
  }
  expect(low, "marked Words whose Arabic is hard to read on their tint").toEqual([]);
});

// ---------------------------------------------------------------- each Ayah as the reader sets it

/** Every Ayah under every Spelling of `root`, beside its item on the page. */
async function listedAyahs(page: Page, root: ExpectedRoot) {
  return (await partsOf(page, root)).flatMap(({ spelling, ayahs }) =>
    ayahsOfSpelling(spelling).map((ayah) => ({ ayah, item: ayahs.and(page.locator(`[data-ayah="${ayah}"]`)) })),
  );
}

Then(
  "each Ayah under each Spelling of {string} shows its Arabic in {script}, with its end-of-Ayah marker, and not in the other Script",
  async ({ reader }, letters: string, script: Script) => {
    for (const { ayah, item } of await listedAyahs(reader.page, expectedRoot(letters))) {
      const arabic = item.locator('[lang="ar"]').filter({ visible: true });
      await expect(arabic, `${ayah} on screen`).toHaveCount(1);
      await expect(arabic, `${ayah} in ${script}`).toHaveText(whole(arabicPattern(ayah, script)));
      await expect(arabic, `${ayah} not in ${OTHER_SCRIPT[script]}`).not.toHaveText(whole(arabicPattern(ayah, OTHER_SCRIPT[script])));
    }
  },
);

Then(
  /^each Ayah under each Spelling of "([^"]+)" shows its Ayah translation in (Urdu|English): (on|off)$/,
  async ({ reader }, letters: string, lang: Language, state: string) => {
    await expect(reader.page.getByRole("heading", { level: 1 })).toBeVisible();
    for (const { ayah, item } of await listedAyahs(reader.page, expectedRoot(letters))) {
      const t = item.getByText(ayahTranslation(ayah, lang), { exact: true });
      if (state === "on") await expect(t, `${ayah}'s Ayah translation`).toBeVisible();
      else await expect(t, `${ayah}'s Ayah translation`).toHaveCount(0);
    }
  },
);

/** The Arabic of the Ayahs on the Root page. */
const ayahArabic = (page: Page) => main(page).locator('li[data-ayah] [lang="ar"]').filter({ visible: true });

Then("the Root page's Arabic is {int}% and its Ayah translations {int}% of a fresh browser's", async ({ reader }, arabicPct: number, meaningPct: number) => {
  const { page } = reader;
  const path = new URL(page.url()).pathname;
  const lang = reader.language;
  const first = main(page).locator("li[data-ayah]").first();
  const ayah = (await first.getAttribute("data-ayah"))!;
  const meaning = first.getByText(ayahTranslation(ayah, lang), { exact: true });
  await expect(ayahArabic(page).first()).toBeVisible();
  const [a, m] = [await fontSize(ayahArabic(page).first()), (await meaning.count()) ? await fontSize(meaning) : undefined];
  const context = await reader.newContext();
  const fresh = await context.newPage();
  await fresh.goto(path);
  await page.bringToFront();
  const a0 = await fontSize(ayahArabic(fresh).first());
  // A fresh browser starts with the Ayah translation off: turn it on to measure it at its first size.
  await openSettings(fresh);
  await translationSwitch(fresh).click();
  await closeSettings(fresh);
  const freshMeaning = main(fresh).locator("li[data-ayah]").first().getByText(ayahTranslation(ayah, lang), { exact: true });
  const m0 = (await freshMeaning.count()) ? await fontSize(freshMeaning) : undefined;
  await context.close();
  expect(a, "the Arabic's size").toBeCloseTo((a0 * arabicPct) / 100, 0);
  if (m !== undefined && m0 !== undefined) expect(m, "the Ayah translation's size").toBeCloseTo((m0 * meaningPct) / 100, 0);
});

Then("the Root page has no Word card, no Phrase colour and no Recitation control", async ({ reader }) => {
  const { page } = reader;
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  expect(await cardLocations(page), "Word cards").toEqual([]);
  // Only the Spelling's marked Words are drawn on a tint: no Phrase colour behind any other Arabic.
  const coloured = await ayahArabic(page).evaluateAll((els) =>
    els
      .flatMap((el) => [el, ...Array.from(el.querySelectorAll("*"))])
      .filter((el) => !el.closest("[data-location]"))
      .filter((el) => {
        const bg = getComputedStyle(el).backgroundColor;
        return bg !== "rgba(0, 0, 0, 0)" && bg !== "transparent";
      }).length,
  );
  expect(coloured, "Arabic drawn on a Phrase colour").toBe(0);
  await expect(page.getByRole("button", { name: /^Listen from Ayah/ }), "Listen buttons").toHaveCount(0);
  await expect(page.getByRole("button", { name: STRINGS.play, exact: true }), "Play").toHaveCount(0);
  await expect(page.getByRole("region", { name: STRINGS.recitationBar }), "the Recitation bar").toHaveCount(0);
});

// ---------------------------------------------------------------- the Ayah link, and the Reading places

When("I follow the Root page's link of Ayah {word}", async ({ reader }, ayah: string) => {
  const links = main(reader.page).getByRole("link", { name: ayah, exact: true });
  await expect(links.first()).toBeVisible();
  await links.first().click();
});

Then(
  /^I am on Surah (\d+) in (Urdu|English) at the first Word of "([^"]+)" in Ayah (\S+)$/,
  async ({ reader, reading }, surah: string, lang: Language, letters: string, ayah: string) => {
    const root = expectedRoot(letters);
    const first = root.lemmas
      .flatMap((l) => l.spellings)
      .find((s) => s.locations.some((l) => ayahOf(l) === ayah))!
      .locations.filter((l) => ayahOf(l) === ayah)
      .sort(compareLocations)[0];
    expect(first, `a Word of ${letters} in Ayah ${ayah}`).toBeTruthy();
    await expect.poll(() => new URL(reader.page.url()).pathname).toBe(`/${lang}/${surah}`);
    expect(decodeURIComponent(new URL(reader.page.url()).hash)).toBe(`#${first}`);
    notesOf(reading).opened = first;
  },
);

Then("the Word at that location is drawn marked, unlike once the link no longer points at it", async ({ reader, reading }) => {
  const location = notesOf(reading).opened;
  if (!location) throw new Error("no Word location opened yet in this scenario");
  await expectMarkedUnlikeUntargeted(reader.page, location);
});

When("I scroll to the bottom of the Root page", async ({ reader }) => {
  await expect(main(reader.page).getByRole("heading", { level: 3 }).first()).toBeVisible();
  await reader.page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await nextFrames(reader.page);
});

// ---------------------------------------------------------------- the Link preview, and the look

When("{app} fetches the Root page of {string} in {language}", async ({ reader, reading }, app: App, letters: string, lang: Language) => {
  await fetchPage(reader.page.request, reading, app, encodeURI(rootPagePath(lang, letters)));
});

When("I view the Root page on a {word}", async ({ reader }, viewport: string) => {
  if (viewport !== "desktop" && viewport !== "phone") throw new Error(`no ${viewport} viewport`);
  if (viewport === "phone") await reader.page.setViewportSize(PHONE);
});
