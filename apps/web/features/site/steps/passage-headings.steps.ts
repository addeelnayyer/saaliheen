// Steps for Passage headings (#41), as a reader and a crawler see them. The
// Passages and their titles are read from the Passages file (as last committed, ./passages),
// never typed, as the run's Neon holds them: Surah 18 as the global setup
// arranged it (../passages-in-the-test-database.ts, #171). A Passage heading is any heading in the Surah's <main> that is not
// an Ayah heading ("Ayah 5"); the Ayah it is above is the Ayah of the first Ayah
// heading after it.

import { expect, type Locator, type Page } from "@playwright/test";
import { ayahSection, ayahTranslation, clickInPlace, shot, sourceSurahs, type Language } from "../support";
import { Then, When, resolveColor, expectLangDir, type Reading } from "./fixtures";
import { neonPassages } from "../passages-in-the-test-database";
import { titleOf, type FilePassage } from "./passages";
import { expectLoadedFace } from "./appearance.steps";

/** The Passages of Surah `surah`, in order, as the run's Neon holds them. */
const passagesOf = (surah: number) => neonPassages().filter((p) => p.surah_no === surah);
import type { Theme } from "./reader";

/** A Passage as its heading should show it: above `ayah` (`s:a`), its title in a Language, its Ayah range. */
interface Expected {
  ayah: string;
  title: string;
  range: string;
}

const rangeOf = (p: FilePassage) => (p.ayah_from === p.ayah_till ? `${p.ayah_from}` : `${p.ayah_from}–${p.ayah_till}`);

function expectedFor(surah: number, lang: Language): Expected[] {
  const ps = passagesOf(surah);
  return ps.map((p) => ({ ayah: `${surah}:${p.ayah_from}`, title: titleOf(p, lang), range: rangeOf(p) }));
}

/** The Passage that begins at `ayah` (`s:a`). */
function passageAt(ayah: string): FilePassage {
  const [s, a] = ayah.split(":").map(Number);
  const p = neonPassages().find((x) => x.surah_no === s && x.ayah_from === a);
  if (!p) throw new Error(`no Passage in the Passages file begins at ${ayah}`);
  return p;
}

// ---------------------------------------------------------------- what the page shows

/** A Passage heading as the page has it. */
interface Seen {
  level: number;
  text: string;
  /** The Ayah (`s:a`) it is above, or "inside s:a" when it sits inside another Ayah's section. */
  ayah: string | null;
  visible: boolean;
}

/** Every Passage heading in the page's <main> and every Ayah heading's level. Runs with or without scripts. */
const headingsIn = (page: Page) =>
  page.locator("main").evaluate((main) => {
    const all = Array.from(main.querySelectorAll<HTMLElement>('h1, h2, h3, h4, h5, h6, [role="heading"]'));
    const text = (el: Element) => (el.textContent ?? "").replace(/\s+/g, " ").trim();
    const level = (el: Element) => Number(el.getAttribute("aria-level")) || Number(el.tagName.slice(1)) || 2;
    const isAyah = (el: Element) => /^Ayah \d+$/.test(text(el));
    const ayahHeadings = all.filter(isAyah);
    const passages = all
      .filter((h) => !isAyah(h))
      .map((h) => {
        const next = ayahHeadings.find((a) => h.compareDocumentPosition(a) & Node.DOCUMENT_POSITION_FOLLOWING);
        const target = next?.closest("section[id]")?.id ?? null;
        const own = h.closest("section[id]")?.id ?? null;
        return {
          level: level(h),
          text: text(h),
          ayah: own && own !== target ? `inside ${own}` : target,
          visible: h.getClientRects().length > 0,
        };
      });
    return { passages, ayahLevels: ayahHeadings.map(level) };
  }) as Promise<{ passages: Seen[]; ayahLevels: number[] }>;

/**
 * The page's text a Passage title could be shown in: everything in <main>
 * outside the Ayahs, and inside an Ayah only what comes before its Ayah heading
 * (so an Ayah translation or Word meaning that happens to hold a title's words is not counted).
 * Surah `surah`'s Ayah translations in `lang` are taken out of it too, as Flowing
 * also sets them out after each Passage as one paragraph (#125).
 */
const textOutsideAyahs = async (page: Page, surah: number, lang: Language) => {
  const text = await textOutsideAyahSections(page);
  const translations = Array.from({ length: sourceSurahs()[surah - 1].ayahCount }, (_, k) => ayahTranslation(`${surah}:${k + 1}`, lang).replace(/\s+/g, " ").trim());
  // Longest first: a short one inside a longer one (2:1's "الم" in "عالم") would
  // otherwise cut the longer one apart before it is taken out.
  return translations.sort((a, b) => b.length - a.length).reduce((rest, t) => rest.split(t).join(" "), text);
};

const textOutsideAyahSections = (page: Page) =>
  page.locator("main").evaluate((main) => {
    const walker = document.createTreeWalker(main, NodeFilter.SHOW_TEXT);
    let out = "";
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const section = n.parentElement?.closest("section[id]");
      if (section) {
        const head = Array.from(section.querySelectorAll("h1, h2, h3, h4, h5, h6, [role=heading]")).find((h) =>
          /^Ayah \d+$/.test((h.textContent ?? "").trim()),
        );
        if (!head || !(n.compareDocumentPosition(head) & Node.DOCUMENT_POSITION_FOLLOWING)) continue;
      }
      out += ` ${n.textContent}`;
    }
    return out.replace(/\s+/g, " ");
  });

const hasRange = (text: string, range: string) => new RegExp(`(^|[^\\d])${range}($|[^\\d])`).test(text);

/** What is wrong with the page's Passage headings against the Passages file's, one line each; empty when right. */
function problems(seen: Seen[], expected: Expected[], where: string): string[] {
  const out: string[] = [];
  for (const e of expected) {
    const at = seen.filter((s) => s.ayah === e.ayah);
    if (at.length !== 1) out.push(`${where}: ${at.length} Passage headings above ${e.ayah}, expected 1 ("${e.title} · ${e.range}")`);
    else if (!at[0].text.includes(e.title) || !hasRange(at[0].text, e.range))
      out.push(`${where}: the heading above ${e.ayah} reads "${at[0].text}", expected "${e.title}" and "${e.range}"`);
    else if (!at[0].visible) out.push(`${where}: the heading above ${e.ayah} is not shown`);
  }
  const places = new Set(expected.map((e) => e.ayah));
  for (const s of seen) if (!places.has(s.ayah ?? "")) out.push(`${where}: an unexpected heading "${s.text}" above ${s.ayah}`);
  return out;
}

const expectHeadings = async (page: Page, surah: number, lang: Language) => {
  await expect
    .poll(async () => problems((await headingsIn(page)).passages, expectedFor(surah, lang), `/${lang}/${surah}`), {
      message: `the Passage headings of /${lang}/${surah}`,
    })
    .toEqual([]);
};

/** The Passage heading of the Passage beginning at `ayah`, found by its title in the page's Language. */
function passageHeading(page: Page, lang: Language, ayah: string): Locator {
  return page.locator("main").getByRole("heading").filter({ hasText: titleOf(passageAt(ayah), lang) });
}

/** The Passage title inside that heading, as its own text. */
const passageTitle = (page: Page, lang: Language, ayah: string) =>
  passageHeading(page, lang, ayah).getByText(titleOf(passageAt(ayah), lang), { exact: true });

/** That heading is the one Passage heading above `ayah`. */
async function expectAbove(page: Page, lang: Language, ayah: string) {
  const heading = passageHeading(page, lang, ayah);
  await expect(heading).toHaveCount(1);
  await expect(heading).toBeAttached();
  const title = titleOf(passageAt(ayah), lang);
  await expect
    .poll(async () => (await headingsIn(page)).passages.filter((s) => s.text.includes(title)).map((s) => s.ayah))
    .toEqual([ayah]);
}

const notedHeadings = new WeakMap<Reading, { ayah: string | null; text: string }[]>();
const notedColour = new WeakMap<Reading, { tokens: string[]; colour: string }>();
const notedSize = new WeakMap<Reading, number>();

// ---------------------------------------------------------------- crawler: every Surah page

Then(
  "every Surah page in {language}, fetched without scripts, shows a {language} Passage heading for each of the Surah's Passages in the run's database, above its first Ayah, and no other",
  async ({ browser, reader, $testInfo }, lang: Language, titles: Language) => {
    $testInfo.setTimeout(600_000);
    // A crawler: no scripts run, so this is the served HTML alone.
    const page = await browser.newPage({ javaScriptEnabled: false, baseURL: reader.baseURL });
    const out: string[] = [];
    for (const { number } of sourceSurahs()) {
      const res = await page.goto(`/${lang}/${number}`, { waitUntil: "domcontentloaded" });
      expect(res?.status(), `/${lang}/${number}`).toBe(200);
      const { passages, ayahLevels } = await headingsIn(page);
      out.push(...problems(passages, expectedFor(number, titles), `/${lang}/${number}`));
      const lowest = Math.min(...ayahLevels);
      for (const p of passages) if (p.level >= lowest) out.push(`/${lang}/${number}: "${p.text}" is level ${p.level}, not above the Ayah headings' ${lowest}`);
    }
    await page.close();
    expect(out.slice(0, 40), `${out.length} problems`).toEqual([]);
  },
);

Then(
  "every Surah page in {language}, fetched without scripts, shows no Passage heading and none of the Surah's Passage titles",
  async ({ browser, reader, $testInfo }, lang: Language) => {
    $testInfo.setTimeout(600_000);
    // A crawler: no scripts run, so this is the served HTML alone.
    const page = await browser.newPage({ javaScriptEnabled: false, baseURL: reader.baseURL });
    const out: string[] = [];
    for (const { number } of sourceSurahs()) {
      const res = await page.goto(`/${lang}/${number}`, { waitUntil: "domcontentloaded" });
      expect(res?.status(), `/${lang}/${number}`).toBe(200);
      const { passages, ayahLevels } = await headingsIn(page);
      expect(ayahLevels.length, `/${lang}/${number}'s Ayah headings`).toBe(sourceSurahs()[number - 1].ayahCount);
      for (const p of passages) out.push(`/${lang}/${number}: a heading "${p.text}" above ${p.ayah}`);
      const text = await textOutsideAyahs(page, number, lang);
      for (const e of expectedFor(number, lang)) if (text.includes(e.title)) out.push(`/${lang}/${number}: shows "${e.title}"`);
    }
    await page.close();
    expect(out.slice(0, 40), `${out.length} problems`).toEqual([]);
  },
);

// ---------------------------------------------------------------- a Surah on screen

Then(
  "the Passage headings shown are the Passages file's for Surah {int} in {language}, each above its first Ayah",
  async ({ reader }, surah: number, lang: Language) => {
    await expectHeadings(reader.page, surah, lang);
  },
);

When("I note the Passage headings shown and the Ayahs they are above", async ({ reader, reading }) => {
  const { passages } = await headingsIn(reader.page);
  expect(passages.length, "Passage headings on the page").toBeGreaterThan(0);
  notedHeadings.set(reading, passages.map(({ ayah, text }) => ({ ayah, text })));
});

Then("the Passage headings shown are the noted ones, above the same Ayahs", async ({ reader, reading }) => {
  const noted = notedHeadings.get(reading);
  if (!noted) throw new Error("no Passage headings were noted");
  await expect
    .poll(async () => (await headingsIn(reader.page)).passages.map(({ ayah, text }) => ({ ayah, text })))
    .toEqual(noted);
});

Then(
  "the Passage heading above Ayah {word} shows the {language} Passage title of {word} from the Passages file and the Ayah range {string}",
  async ({ reader }, ayah: string, lang: Language, of: string, range: string) => {
    expect(of, "the Passage is the one beginning at the Ayah").toBe(ayah);
    expect(rangeOf(passageAt(ayah)), "the Passages file's range").toBe(range);
    await expect(passageTitle(reader.page, lang, ayah)).toBeVisible();
    await expect(passageHeading(reader.page, lang, ayah)).toContainText(range);
    await expectAbove(reader.page, lang, ayah);
  },
);

Then(
  "there is exactly one Passage heading, above Ayah {word}, with the {language} Passage title of {word} from the Passages file and the Ayah range {string}",
  async ({ reader }, ayah: string, lang: Language, of: string, range: string) => {
    expect(of).toBe(ayah);
    const surah = Number(ayah.split(":")[0]);
    expect(expectedFor(surah, lang), `the Passages file's Passages of Surah ${surah}`).toEqual([
      { ayah, title: titleOf(passageAt(ayah), lang), range },
    ]);
    await expectHeadings(reader.page, surah, lang);
    await expect(passageTitle(reader.page, lang, ayah)).toBeVisible();
  },
);

Then("the Passage heading of Surah {int}'s last Passage is not shown yet", async ({ reader }, surah: number) => {
  const last = passagesOf(surah).at(-1)!;
  await expect(reader.page.locator("main").getByText(titleOf(last, reader.language), { exact: true })).toHaveCount(0);
});

Then(
  "the Passage title above Ayah {word} is marked lang {string}, runs {string} and is set in the loaded font {string}",
  async ({ reader }, ayah: string, lang: string, dir: string, family: string) => {
    const title = passageTitle(reader.page, reader.language, ayah);
    await expectLangDir(title, lang, dir, "the Passage title");
    await expectLoadedFace(title, family);
  },
);

Then(
  "I save a screenshot of the Passage heading above Ayah {word} {string}",
  async ({ reader }, ayah: string, name: string) => {
    const heading = passageHeading(reader.page, reader.language, ayah);
    await heading.evaluate((el) => el.scrollIntoView({ block: "center" }));
    await shot(reader.page, name);
  },
);

Then("every Passage heading is a heading of a higher rank than every Ayah heading", async ({ reader }) => {
  const { passages, ayahLevels } = await headingsIn(reader.page);
  expect(passages.length, "Passage headings on the page").toBeGreaterThan(0);
  expect(ayahLevels.length, "Ayah headings on the page").toBeGreaterThan(0);
  const lowest = Math.min(...ayahLevels);
  expect(passages.filter((p) => p.level >= lowest).map((p) => `"${p.text}" is level ${p.level}, Ayah headings ${lowest}`)).toEqual([]);
});

// ---------------------------------------------------------------- theme and Meaning size

// The design's colour tokens (src/app/globals.css :root), less those only used behind text.
const TEXT_TOKENS = ["ink", "muted", "accent", "on-accent", "madani"];
const colourOf = (l: Locator) => l.evaluate((el) => getComputedStyle(el).color);
const tokensMatching = async (page: Page, colour: string) => {
  const out: string[] = [];
  for (const t of TEXT_TOKENS) if ((await resolveColor(page, `var(--${t})`)) === colour) out.push(t);
  return out;
};

Then(
  "the Passage heading above Ayah {word} is drawn in one of the {theme} theme's colour tokens, which I note",
  async ({ reader, reading }, ayah: string, theme: Theme) => {
    await expect(reader.page.locator("html")).toHaveAttribute("data-theme", theme);
    const title = passageTitle(reader.page, reader.language, ayah);
    await expect(title).toBeVisible();
    const colour = await colourOf(title);
    const tokens = await tokensMatching(reader.page, colour);
    expect(tokens, `the Passage title's colour ${colour} is one of the ${theme} theme's text tokens`).not.toEqual([]);
    notedColour.set(reading, { tokens, colour });
  },
);

Then(
  "the Passage heading above Ayah {word} is drawn in the {theme} theme's value of the noted colour token",
  async ({ reader, reading }, ayah: string, theme: Theme) => {
    const noted = notedColour.get(reading);
    if (!noted) throw new Error("no colour token was noted");
    await expect(reader.page.locator("html")).toHaveAttribute("data-theme", theme);
    const title = passageTitle(reader.page, reader.language, ayah);
    await expect.poll(() => colourOf(title)).not.toBe(noted.colour);
    const tokens = await tokensMatching(reader.page, await colourOf(title));
    expect(tokens.filter((t) => noted.tokens.includes(t)), `the ${theme} theme's value of ${noted.tokens.join(" or ")}`).not.toEqual([]);
  },
);

const sizeOf = (l: Locator) => l.evaluate((el) => parseFloat(getComputedStyle(el).fontSize));

When("I note the size of the Passage title above Ayah {word}", async ({ reader, reading }, ayah: string) => {
  const title = passageTitle(reader.page, reader.language, ayah);
  await expect(title).toBeVisible();
  notedSize.set(reading, await sizeOf(title));
});

Then(
  "the Passage title above Ayah {word} is {int}% of its noted size",
  async ({ reader, reading }, ayah: string, percent: number) => {
    const noted = notedSize.get(reading);
    if (noted === undefined) throw new Error("the Passage title's size was not noted");
    const title = passageTitle(reader.page, reader.language, ayah);
    await expect.poll(() => sizeOf(title), "the Passage title's size").toBeCloseTo((noted * percent) / 100, 1);
  },
);

// ---------------------------------------------------------------- the link to its first Ayah

Then(
  "the Passage heading above Ayah {word} links to Ayah {word}'s anchor {string}",
  async ({ reader }, ayah: string, target: string, hash: string) => {
    await expectAbove(reader.page, reader.language, ayah);
    const link = passageHeading(reader.page, reader.language, ayah).getByRole("link");
    await expect(link).toHaveCount(1);
    const where = await link.evaluate((a: HTMLAnchorElement) => ({ hash: a.hash, samePage: a.pathname === location.pathname }));
    expect(where).toEqual({ hash, samePage: true });
    // The anchor is the Ayah's own, the one a `#s:a` link already goes to.
    await expect(ayahSection(reader.page, target)).toHaveCount(1);
    expect(decodeURIComponent(hash.slice(1))).toBe(target);
  },
);

When("I follow the Passage heading above Ayah {word}", async ({ reader }, ayah: string) => {
  await clickInPlace(passageHeading(reader.page, reader.language, ayah).getByRole("link"));
});

// ---------------------------------------------------------------- titles gone

Then("no {language} Passage title of Surah {int} is shown", async ({ reader }, lang: Language, surah: number) => {
  const text = await textOutsideAyahs(reader.page, surah, lang);
  expect(expectedFor(surah, lang).filter((e) => text.includes(e.title)).map((e) => e.title)).toEqual([]);
});

Then("no Passage heading is shown and no Passage title of Surah {int} is shown", async ({ reader }, surah: number) => {
  await expect(ayahSection(reader.page, `${surah}:1`)).toBeVisible();
  const { passages } = await headingsIn(reader.page);
  expect(passages.map((p) => `"${p.text}" above ${p.ayah}`)).toEqual([]);
  const text = await textOutsideAyahs(reader.page, surah, reader.language);
  expect(expectedFor(surah, reader.language).filter((e) => text.includes(e.title)).map((e) => e.title)).toEqual([]);
});
