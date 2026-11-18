// Steps for #125: reading a Surah Flowing in Quran Analysis. The Ayah layout
// switch is found by role and name on the Surah bar; what each layout shows is
// read from what the browser draws: which text of a Word is visible, where
// Words, Ayah end markers, Passage headings and Ayah translations sit on the
// screen. Words are found by their Word location (the id a Word location link
// targets) and Ayahs by their `surah:ayah` (the id an Ayah link targets).
// Passages are those the run's database holds (#171: the committed Passages
// file as Surah 18 is arranged there, ../passages-in-the-test-database.ts),
// Arabic and Ayah translations from the committed sources, never typed.

import { expect, type Locator, type Page } from "@playwright/test";
import {
  ayahSections,
  ayahTranslation,
  card,
  clickInPlace,
  indopakText,
  sourceAyahEnd,
  sourceWords,
  urduDigits,
  type Language,
} from "../support";
import { ALLAH_REFERENCE_CONTRAST, isSeededAllahReference } from "./allah-references";
import { Given, langOf, Then, When, type Reading } from "./fixtures";
import { neonPassages } from "../passages-in-the-test-database";
import { titleOf, type FilePassage } from "./passages";
import { chosen, editorSwitch, switchChoice } from "./passage-editor.steps";
import { contrast, DRAWN, expectFatihahTinted, expectUntinted } from "./phrase-colours.steps";
import { bismillah, type Script } from "./reader";
import { loose, numberPattern, whole } from "./share-page.steps";

/** The Passages of Surah `surah` the run's database holds, in order. */
function passagesOf(surah: number): FilePassage[] {
  const ps = neonPassages().filter((p) => p.surah_no === surah);
  if (ps.length === 0) throw new Error(`the run's database has no Passage in Surah ${surah}`);
  return ps;
}

/** The Passage the run's database holds that holds `ayah` (`s:a`). */
function passageHolding(ayah: string): FilePassage {
  const [s, a] = ayah.split(":").map(Number);
  const p = passagesOf(s).find((x) => x.ayah_from <= a && a <= x.ayah_till);
  if (!p) throw new Error(`no Passage in the run's database holds ${ayah}`);
  return p;
}

type Layout = "Study" | "Flowing";

// ---------------------------------------------------------------- the switch

/** The Surah bar's Ayah layout switch: a group (or radio group) named "Ayah layout", offering Study and Flowing. */
const layoutSwitch = (page: Page) => editorSwitch(page, "Ayah layout");
const layoutChoice = (page: Page, layout: Layout) => switchChoice(page, "Ayah layout", layout);
const slimRow = (page: Page) => page.getByRole("navigation", { name: "Surah", exact: true });

Then("the Surah bar's full form has the Ayah layout switch, offering Study and Flowing", async ({ reader }) => {
  const { page } = reader;
  await expect(layoutSwitch(page), "the Ayah layout switch").toHaveCount(1);
  await expect(layoutSwitch(page)).toBeInViewport({ ratio: 1 });
  for (const layout of ["Study", "Flowing"] as const) await expect(layoutChoice(page, layout), layout).toBeVisible();
  // On the Surah bar: no lower than its slim row, and above the Surah's heading.
  const box = (await layoutSwitch(page).boundingBox())!;
  const row = (await slimRow(page).boundingBox())!;
  const heading = (await page.getByRole("heading", { level: 1 }).boundingBox())!;
  expect(box.y + box.height, "the switch's bottom, against the Surah bar's slim row's").toBeLessThanOrEqual(row.y + row.height + 1);
  expect(box.y + box.height, "the switch's bottom, against the Surah's heading's top").toBeLessThanOrEqual(heading.y + 1);
});

Then(/^the Surah bar's Ayah layout switch shows (Study|Flowing) chosen$/, async ({ reader }, layout: Layout) => {
  for (const other of ["Study", "Flowing"] as const) {
    await expect
      .poll(() => chosen(layoutChoice(reader.page, other)), { message: `Ayah layout: ${other}` })
      .toBe(String(other === layout));
  }
});

/** Whether keyboard focus is on `target`, or anywhere in the switch when `target` is null. */
const focusOn = (page: Page, target: Locator | null) =>
  (target ?? layoutSwitch(page)).evaluate((el) => el === document.activeElement || el.contains(document.activeElement));

/** Reach the switch with Tab from the top of the page, then choose `layout` with the keyboard alone. */
async function chooseWithKeyboard(page: Page, layout: Layout) {
  const choice = layoutChoice(page, layout);
  await page.evaluate(() => {
    (document.activeElement as HTMLElement | null)?.blur();
    window.scrollTo(0, 0);
  });
  for (let presses = 0; !(await focusOn(page, null)); presses++) {
    expect(presses, "Tab presses to reach the Ayah layout switch").toBeLessThan(60);
    await page.keyboard.press("Tab");
  }
  const isRadio = await choice.evaluate((el) => el.getAttribute("role") === "radio" || (el as HTMLInputElement).type === "radio");
  for (let presses = 0; !(await focusOn(page, choice)) || (isRadio && (await chosen(choice)) !== "true"); presses++) {
    expect(presses, `key presses to reach ${layout} in the switch`).toBeLessThan(6);
    // A radio group moves its choice with the arrows; a group of buttons with Tab.
    await page.keyboard.press(isRadio ? "ArrowLeft" : "Tab");
    if (isRadio && !(await focusOn(page, null))) await page.keyboard.press("Shift+Tab");
  }
  if (!isRadio) await page.keyboard.press("Enter");
}

When(/^I switch the Ayah layout to (Study|Flowing)( with the keyboard)?$/, async ({ reader }, layout: Layout, keyboard?: string) => {
  const choice = layoutChoice(reader.page, layout);
  await expect(choice, `the Ayah layout switch offers ${layout}`).toHaveCount(1);
  if (keyboard) await chooseWithKeyboard(reader.page, layout);
  else await clickInPlace(choice);
  await expect.poll(() => chosen(choice), { message: `Ayah layout: ${layout} chosen` }).toBe("true");
});

// ---------------------------------------------------------------- what a Word shows

/** The Script the page shows now, as <html> carries it (the Settings drawer's steps read it the same way). */
const scriptOf = async (page: Page): Promise<Script> =>
  (await page.locator("html").getAttribute("data-script")) === "indopak" ? "indopak" : "uthmani";

const arabicOf = (location: string, script: Script) =>
  script === "uthmani" ? sourceWords(Number(location.split(":")[0])).find((w) => w.location === location)!.uthmani : indopakText(location);

/**
 * In the page: the text of each element named by id that is drawn, its text
 * nodes whose element is visible and has a box, and how many of the buttons in
 * it are drawn. Self-contained: it is sent into the page as source.
 */
function drawnTextInPage(ids: string[]): { id: string; text: string | null; buttons: number }[] {
  const drawn = (el: Element) => el.getClientRects().length > 0 && el.checkVisibility({ opacityProperty: true, visibilityProperty: true });
  return ids.map((id) => {
    const el = document.getElementById(id);
    if (!el) return { id, text: null, buttons: 0 };
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    let text = "";
    for (let n = walker.nextNode(); n; n = walker.nextNode()) if (n.parentElement && drawn(n.parentElement)) text += n.nodeValue;
    return { id, text: text.replace(/\s+/g, ""), buttons: Array.from(el.querySelectorAll("button")).filter(drawn).length };
  });
}

/** Each Word of Surah `surah` whose drawn text is not its Arabic in the page's Script alone, or that draws a button. */
async function wordsShowingMore(page: Page, surah: number, script: Script) {
  const words = sourceWords(surah);
  await expect(card(page, words.at(-1)!.location)).toBeAttached({ timeout: 30_000 });
  const drawn = await page.evaluate(drawnTextInPage, words.map((w) => w.location));
  return drawn
    .map((d) => ({ ...d, want: arabicOf(d.id, script).replace(/\s+/g, "") }))
    .filter((d) => d.text !== d.want || d.buttons > 0)
    .slice(0, 10)
    .map((d) => `${d.id}: draws "${d.text}"${d.buttons ? ` and ${d.buttons} button(s)` : ""}, not only "${d.want}"`);
}

Then("no Word of Surah {int} shows anything but its Arabic: no Word meaning and no Root tag", async ({ reader }, surah: number) => {
  const script = await scriptOf(reader.page);
  await expect.poll(() => wordsShowingMore(reader.page, surah, script), { timeout: 10_000 }).toEqual([]);
});

Then("every Word of Surah {int} shows only its {script} text", async ({ reader }, surah: number, script: Script) => {
  expect(await scriptOf(reader.page), "the Script the page is in").toBe(script);
  await expect.poll(() => wordsShowingMore(reader.page, surah, script), { timeout: 10_000 }).toEqual([]);
});

/** Every button in an Ayah heading of Surah `surah` that is drawn: its share button and its listen button. */
const drawnAyahHeadingButtons = (page: Page, surah: number) =>
  page.locator("main button").evaluateAll(
    (buttons, surah) =>
      buttons
        .filter((b) => new RegExp(`^(Share|Listen from) Ayah ${surah}:\\d+$`).test(b.getAttribute("aria-label") ?? ""))
        .filter((b) => b.getClientRects().length > 0 && b.checkVisibility({ opacityProperty: true, visibilityProperty: true }))
        .map((b) => b.getAttribute("aria-label")),
    surah,
  );

Then("no Ayah heading of Surah {int} is shown", async ({ reader }, surah: number) => {
  await expect.poll(() => drawnAyahHeadingButtons(reader.page, surah)).toEqual([]);
});

/** The links to Theme pages drawn in the reading area: an Ayah's Theme chips (#129), which Study shows and Flowing does not. */
const drawnThemeChips = (page: Page) =>
  page
    .locator('main a[href*="/themes/"]')
    .evaluateAll((links) => links.filter((a) => a.getClientRects().length > 0).map((a) => a.getAttribute("href")));

Then("no Theme chip of Surah {int} is shown", async ({ reader }, surah: number) => {
  // Study draws them, so their absence is Flowing's doing, not a Surah without Themes.
  await expect(reader.page.locator(`section[id^="${surah}:"] a[href*="/themes/"]`).first()).toBeAttached();
  await expect.poll(() => drawnThemeChips(reader.page)).toEqual([]);
});

// ---------------------------------------------------------------- the page's geometry

/** Where the Words, Ayah end markers and Passage groups of one Surah sit, as the page draws them. */
interface Geometry {
  surah: number;
  /** Each Ayah's acceptable end marker texts, Ayah 1 first: its number in any digits, or its end sign in either Script. */
  ends: string[][];
}

const geometries = new Map<number, Geometry>();
/** Built once per Surah: reading every Ayah's end marker from the sources takes a few seconds for a long Surah, too long to repeat on every poll. */
const geometry = (surah: number): Geometry => {
  if (!geometries.has(surah)) geometries.set(surah, geometryOf(surah));
  return geometries.get(surah)!;
};

const geometryOf = (surah: number): Geometry => {
  const words = sourceWords(surah);
  const count = Number(words.at(-1)!.location.split(":")[1]);
  return {
    surah,
    ends: Array.from({ length: count }, (_, k) => {
      const n = k + 1;
      const texts = [String(n), urduDigits(n), n.toLocaleString("ar-EG", { useGrouping: false })];
      for (const script of ["uthmani", "indopak"] as const) texts.push(sourceAyahEnd(`${surah}:${n}`, script));
      return texts.map((t) => t.replace(/[\s۝]/g, ""));
    }),
  };
};

/**
 * In the page: the geometry helpers the checks below share, built for Surah
 * `g.surah`. Self-contained, sent into the page as source and rebuilt there.
 */
function pageGeometry(g: Geometry) {
  const rect = (el: Element) => el.getBoundingClientRect();
  const isWordId = (id: string) => /^\d+:\d+:\d+$/.test(id);
  const wordsOf = (ayah: number) => {
    const out: HTMLElement[] = [];
    for (let w = 1; document.getElementById(`${g.surah}:${ayah}:${w}`); w++) out.push(document.getElementById(`${g.surah}:${ayah}:${w}`)!);
    return out;
  };
  const sameLine = (a: Element, b: Element) => {
    const r = rect(a);
    const q = rect(b);
    return Math.min(r.bottom, q.bottom) - Math.max(r.top, q.top) > Math.min(r.height, q.height) / 2;
  };
  const drawn = (el: Element) => el.getClientRects().length > 0 && el.checkVisibility({ opacityProperty: true, visibilityProperty: true });
  /** Ayah `ayah`'s end marker: the last drawn element in its section, outside its Words, headings and buttons, that shows its number or end sign. */
  const endOf = (ayah: number): HTMLElement | null => {
    const section = document.getElementById(`${g.surah}:${ayah}`);
    if (!section) return null;
    const texts = g.ends[ayah - 1];
    // The cheap test first: few leaves show the Ayah's number or end sign, so the costlier tests run on those alone.
    const marks = Array.from(section.querySelectorAll<HTMLElement>("*")).filter((el) => {
      if (el.children.length > 0 || !texts.includes((el.textContent ?? "").replace(/[\s۝]/g, ""))) return false;
      if (el.closest("h1, h2, h3, h4, h5, h6, button, a")) return false;
      for (let p: Element | null = el; p && p !== section; p = p.parentElement) if (isWordId(p.id)) return false;
      return drawn(el);
    });
    return marks.at(-1) ?? null;
  };
  /** The block box whose lines `el` is laid out in: its nearest ancestor that is not inline, as its content box. */
  const columnOf = (el: Element) => {
    let p = el.parentElement!;
    while (p.parentElement && ["inline", "contents"].includes(getComputedStyle(p).display)) p = p.parentElement;
    const r = rect(p);
    const s = getComputedStyle(p);
    return { left: r.left + parseFloat(s.paddingLeft), right: r.right - parseFloat(s.paddingRight) };
  };
  return { rect, wordsOf, sameLine, endOf, columnOf, drawn };
}
const GEOMETRY = pageGeometry.toString();
export type PageGeometry = ReturnType<typeof pageGeometry>;

/** Run `check` in the page with the geometry helpers for Surah `surah`; it returns the problems it found. */
export async function inPage<A, R = string[]>(page: Page, surah: number, check: (h: PageGeometry, arg: A) => R, arg: A): Promise<R> {
  return page.evaluate(
    ([src, g, checkSrc, arg]) => {
      const helpers = new Function(`return (${src})`)()(g);
      return (new Function(`return (${checkSrc})`)() as (h: unknown, a: unknown) => unknown)(helpers, arg);
    },
    [GEOMETRY, geometry(surah), check.toString(), arg] as const,
  ) as Promise<R>;
}

const ranges = (passages: FilePassage[]) => passages.map((p) => [p.ayah_from, p.ayah_till] as const);

/**
 * Each Passage's Ayahs run on: each Ayah's first Word shares a line with the
 * end of the Ayah before it, or starts the next line because that line had no
 * room left for it.
 */
async function runOn(page: Page, surah: number, passages: FilePassage[]) {
  return inPage(
    page,
    surah,
    (h, passages: (readonly [number, number])[]) => {
      const problems: string[] = [];
      // Each Ayah's Words and end marker, found once: finding them is the costly part, and every check below reads them.
      const found = new Map<number, { words: HTMLElement[]; end: HTMLElement | null }>();
      const ayah = (a: number) => {
        if (!found.has(a)) found.set(a, { words: h.wordsOf(a), end: h.endOf(a) });
        return found.get(a)!;
      };
      for (const [from, till] of passages) {
        const all = Array.from({ length: till - from + 1 }, (_, k) => from + k).flatMap((a) => [...ayah(a).words, ayah(a).end].filter(Boolean) as HTMLElement[]);
        for (let a = from; a < till; a++) {
          const last = ayah(a).words.at(-1);
          const end = ayah(a).end ?? last;
          const first = ayah(a + 1).words[0];
          if (!last || !end || !first) {
            problems.push(`Ayah ${a} or ${a + 1} has no Words on the page`);
            continue;
          }
          if (h.sameLine(end, first)) continue;
          const onLine = all.filter((el) => h.sameLine(el, end));
          const column = h.columnOf(end);
          const used = Math.max(...onLine.map((el) => h.rect(el).right)) - Math.min(...onLine.map((el) => h.rect(el).left));
          const room = column.right - column.left - used;
          if (h.rect(first).top < h.rect(end).bottom - 2) problems.push(`Ayah ${a + 1}'s first Word is neither on the line Ayah ${a} ends on nor below it`);
          else if (room >= h.rect(first).width + 16)
            problems.push(`Ayah ${a + 1} starts a new line though ${Math.round(room)}px were left on the line Ayah ${a} ends on`);
        }
      }
      return problems;
    },
    ranges(passages),
  );
}

Then("the Ayahs of each Passage of Surah {int} run on together", async ({ reader }, surah: number) => {
  await expect.poll(() => runOn(reader.page, surah, passagesOf(surah)), { timeout: 10_000 }).toEqual([]);
});

/** The Passage a scenario noted, split across a Surah's parts. */
const notedPassage = new WeakMap<Reading, FilePassage>();

Then("the Ayahs of that Passage run on together", async ({ reader, reading }) => {
  const passage = notedPassage.get(reading);
  expect(passage, "a Passage noted earlier in the scenario").toBeDefined();
  await expect.poll(() => runOn(reader.page, passage!.surah_no, [passage!]), { timeout: 10_000 }).toEqual([]);
});

Then("each Passage of Surah {int} starts on its own, below the Passage before it", async ({ reader }, surah: number) => {
  const problems = () =>
    inPage(
      reader.page,
      surah,
      (h, passages: (readonly [number, number])[]) =>
        passages.slice(1).flatMap(([from]) => {
          const first = h.wordsOf(from)[0];
          const end = h.endOf(from - 1) ?? h.wordsOf(from - 1).at(-1);
          if (!first || !end) return [`Ayah ${from} or ${from - 1} has no Words on the page`];
          return h.rect(first).top >= h.rect(end).bottom - 1 ? [] : [`the Passage from Ayah ${from} starts on the line the Passage before it ends on`];
        }),
      ranges(passagesOf(surah)),
    );
  await expect.poll(problems, { timeout: 10_000 }).toEqual([]);
});

/** A Passage heading on the page, found by its Passage title in `lang`. */
const passageHeading = (page: Page, p: FilePassage, lang: Language) =>
  page.locator("main").getByRole("heading").filter({ hasText: titleOf(p, lang) }).first();

Then("each Passage of Surah {int} starts under its {language} Passage heading", async ({ reader }, surah: number, lang: Language) => {
  const { page } = reader;
  for (const p of passagesOf(surah)) {
    const heading = passageHeading(page, p, lang);
    await expect(heading, `the Passage heading of ${surah}:${p.ayah_from}–${p.ayah_till}`).toBeAttached();
    const box = await heading.evaluate((el) => el.getBoundingClientRect().toJSON() as DOMRect);
    const first = await card(page, `${surah}:${p.ayah_from}:1`).evaluate((el) => el.getBoundingClientRect().toJSON() as DOMRect);
    expect(box.bottom, `the Passage heading of ${surah}:${p.ayah_from} is above its first Word`).toBeLessThanOrEqual(first.top + 1);
    if (p.ayah_from > 1) {
      const before = await card(page, `${surah}:${p.ayah_from - 1}:1`).evaluate((el) => el.getBoundingClientRect().toJSON() as DOMRect);
      expect(box.top, `the Passage heading of ${surah}:${p.ayah_from} is below the Passage before it`).toBeGreaterThanOrEqual(before.bottom - 1);
    }
  }
});

Then("no Passage heading is shown", async ({ reader }) => {
  const { page } = reader;
  await expect(page.locator("main").getByRole("button", { name: /^Share Passage / })).toHaveCount(0);
  await expect(page.locator("main").getByRole("heading", { level: 2 })).toHaveCount(0);
});

Then(
  "every Ayah of Surah {int} ends with its end marker showing its number, on the same line as its last Word and after it",
  async ({ reader }, surah: number) => {
    const count = geometry(surah).ends.length;
    const problems = () =>
      inPage(
        reader.page,
        surah,
        (h, count: number) =>
          Array.from({ length: count }, (_, k) => k + 1).flatMap((a) => {
            const last = h.wordsOf(a).at(-1);
            const end = h.endOf(a);
            if (!last) return [`Ayah ${a} has no Words on the page`];
            if (!end) return [`Ayah ${a} shows no end marker with its number`];
            if (!h.sameLine(last, end)) return [`Ayah ${a}'s end marker is not on the line of its last Word`];
            // Right to left: the marker comes after the last Word, to its left.
            if (h.rect(end).right > h.rect(last).left + 2) return [`Ayah ${a}'s end marker is not after its last Word`];
            return [];
          }),
        count,
      );
    await expect.poll(problems, { timeout: 10_000 }).toEqual([]);
  },
);

// ---------------------------------------------------------------- the layout as a whole

Then(/^Surah (\d+) is shown Flowing$/, async ({ reader }, n: string) => {
  const surah = Number(n);
  const { page } = reader;
  const script = await scriptOf(page);
  await expect.poll(() => wordsShowingMore(page, surah, script), { message: "Words drawing more than their Arabic", timeout: 10_000 }).toEqual([]);
  await expect.poll(() => drawnAyahHeadingButtons(page, surah), { message: "Ayah headings drawn" }).toEqual([]);
  await expect.poll(() => runOn(page, surah, passagesOf(surah)), { message: "Ayahs that do not run on", timeout: 10_000 }).toEqual([]);
});

Then(/^Surah (\d+) is shown in Study$/, async ({ reader, reading }, n: string) => {
  const surah = Number(n);
  const { page } = reader;
  const first = sourceWords(surah)[0];
  await expect(card(page, first.location).getByText(first.meaning[langOf(reading)], { exact: true }), "the first Word card's Word meaning").toBeVisible();
  await expect(page.getByRole("button", { name: `Share Ayah ${surah}:1`, exact: true }), "the first Ayah's heading").toBeVisible();
});

// ---------------------------------------------------------------- Passages grouped on the page

Then(
  "each Passage of Surah {int} has its Ayahs in one group on the page, holding no other Passage's Ayahs",
  async ({ reader }, surah: number) => {
    const problems = () =>
      reader.page.locator("main").evaluate(
        (main, { surah, passages }) =>
          passages.flatMap(([from, till]) => {
            const name = `${surah}:${from}–${till}`;
            const parents = Array.from({ length: till - from + 1 }, (_, k) => document.getElementById(`${surah}:${from + k}`)?.parentElement);
            if (parents.some((p) => !p)) return [`Passage ${name} is missing an Ayah`];
            // The group: the smallest element holding every one of the Passage's Ayahs, apart from the Ayahs themselves.
            let group: Element = parents[0]!;
            while (!parents.every((p) => group.contains(p!))) group = group.parentElement!;
            if (group === main || !main.contains(group)) return [`Passage ${name}'s Ayahs are not grouped inside <main>`];
            const others = Array.from(group.querySelectorAll("[id]"))
              .map((el) => el.id.match(/^(\d+):(\d+)$/))
              .filter((m) => m && (Number(m[1]) !== surah || Number(m[2]) < from || Number(m[2]) > till))
              .map((m) => m![0]);
            return others.length ? [`Passage ${name}'s group also holds ${others.join(", ")}`] : [];
          }),
        { surah, passages: ranges(passagesOf(surah)) },
      );
    await expect.poll(problems, { timeout: 10_000 }).toEqual([]);
  },
);

Then("the last Ayah shown while the Surah is still loading is inside a Passage that runs on past it", async ({ reader, reading }) => {
  const { page } = reader;
  await expect(page.locator("main")).toHaveAttribute("aria-busy", "true");
  const ids = await ayahSections(page).evaluateAll((els) => els.map((el) => el.id));
  expect(ids.length, "Ayahs shown while loading").toBeGreaterThan(0);
  const last = ids.at(-1)!;
  const passage = passageHolding(last);
  expect(passage.ayah_till, `the Passage holding ${last} runs on past it`).toBeGreaterThan(Number(last.split(":")[1]));
  notedPassage.set(reading, passage);
});

// ---------------------------------------------------------------- the Bismillah

const notedBismillah = new WeakMap<Reading, { size: number; centre: number; family: string }>();

const bismillahLook = async (page: Page) => {
  const text = page.getByText(bismillah(await scriptOf(page)), { exact: true });
  await expect(text, "the Bismillah").toBeVisible();
  return text.evaluate((el) => {
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    return { size: parseFloat(s.fontSize), centre: Math.round(r.left + r.width / 2), family: s.fontFamily };
  });
};

Given("I note how the Bismillah is drawn", async ({ reader, reading }) => {
  notedBismillah.set(reading, await bismillahLook(reader.page));
});

Then("the Bismillah is drawn as noted", async ({ reader, reading }) => {
  const noted = notedBismillah.get(reading);
  expect(noted, "the Bismillah noted earlier").toBeDefined();
  await expect.poll(() => bismillahLook(reader.page)).toEqual(noted);
});

// ---------------------------------------------------------------- Phrase colours

Then(
  "Al-Fatihah's Words alternate between tint A and tint B Phrase by Phrase, each Passage starting on tint A",
  async ({ reader, reading }) => {
    await expectFatihahTinted(reader.page, langOf(reading));
  },
);

Then("no Word of Surah {int} is tinted", async ({ reader, reading }, surah: number) => {
  await expectUntinted(reader.page, surah, langOf(reading));
});

// ---------------------------------------------------------------- the Ayah translation paragraph

/** The Passages of Surah `surah` from Ayah `from` to Ayah `to`. */
const passagesBetween = (surah: number, from: number, to: number) =>
  passagesOf(surah).filter((p) => p.ayah_till >= from && p.ayah_from <= to);

/** One Passage's Ayah translations in `lang` as one paragraph, each after its Ayah's number. */
export const translationParagraph = (page: Page, p: FilePassage, lang: Language) =>
  page
    .locator("main")
    .getByText(
      whole(
        Array.from({ length: p.ayah_till - p.ayah_from + 1 }, (_, k) => p.ayah_from + k)
          .map((a) => `${numberPattern(a)}\\s*${loose(ayahTranslation(`${p.surah_no}:${a}`, lang))}`)
          .join("\\s+"),
      ),
    )
    .first();

const box = (l: Locator) => l.evaluate((el) => el.getBoundingClientRect().toJSON() as DOMRect);

Then(
  "each Passage of Surah {int} from Ayah {int} to Ayah {int} is followed by its {language} Ayah translations as one paragraph, each after its Ayah's number",
  async ({ reader }, surah: number, from: number, to: number, lang: Language) => {
    const { page } = reader;
    for (const p of passagesBetween(surah, from, to)) {
      const name = `${surah}:${p.ayah_from}–${p.ayah_till}`;
      const paragraph = translationParagraph(page, p, lang);
      await expect(paragraph, `Passage ${name}'s Ayah translations as one paragraph`).toBeAttached();
      await paragraph.scrollIntoViewIfNeeded();
      await expect(paragraph).toBeVisible();
      const at = await box(paragraph);
      const lastWord = await box(card(page, sourceWords(surah).filter((w) => w.location.startsWith(`${surah}:${p.ayah_till}:`)).at(-1)!.location));
      expect(at.top, `Passage ${name}'s paragraph is below its last Word`).toBeGreaterThanOrEqual(lastWord.bottom - 1);
      const next = sourceWords(surah).find((w) => w.location.startsWith(`${surah}:${p.ayah_till + 1}:`));
      if (next) expect(at.bottom, `Passage ${name}'s paragraph is above the next Passage's first Word`).toBeLessThanOrEqual((await box(card(page, next.location))).top + 1);
    }
  },
);

/** How many drawn elements on the page show Ayah `ayah`'s translation in `lang`, each the innermost holding all of it, and how many of those are inside `paragraph`. */
const translationsShown = (page: Page, ayah: string, lang: Language, paragraph?: Locator) =>
  page.locator("main").evaluate(
    (main, { text, inside }) => {
      const norm = (s: string | null) => (s ?? "").replace(/\s+/g, " ").trim();
      const holding = Array.from(main.querySelectorAll("*")).filter(
        (el) =>
          norm(el.textContent).includes(text) &&
          !Array.from(el.children).some((c) => norm(c.textContent).includes(text)) &&
          el.getClientRects().length > 0 &&
          el.checkVisibility({ opacityProperty: true, visibilityProperty: true }),
      );
      const paragraphs = inside ? Array.from(main.querySelectorAll("*")).filter((el) => el.getAttribute("data-flowing-check") === inside) : [];
      return { shown: holding.length, inParagraph: holding.filter((el) => paragraphs.some((p) => p.contains(el))).length };
    },
    { text: ayahTranslation(ayah, lang).replace(/\s+/g, " ").trim(), inside: paragraph ? "paragraph" : null },
  );

Then(
  "each {language} Ayah translation of Surah {int} from Ayah {int} to Ayah {int} is shown once, in its Passage's paragraph",
  async ({ reader }, lang: Language, surah: number, from: number, to: number) => {
    const { page } = reader;
    for (const p of passagesBetween(surah, from, to)) {
      const paragraph = translationParagraph(page, p, lang);
      await expect(paragraph).toBeAttached();
      // Marked for the count below only, and unmarked straight after.
      await paragraph.evaluate((el) => el.setAttribute("data-flowing-check", "paragraph"));
      try {
        for (let a = Math.max(from, p.ayah_from); a <= Math.min(to, p.ayah_till); a++) {
          expect(await translationsShown(page, `${surah}:${a}`, lang, paragraph), `the Ayah translation of ${surah}:${a}`).toEqual({ shown: 1, inParagraph: 1 });
        }
      } finally {
        await paragraph.evaluate((el) => el.removeAttribute("data-flowing-check"));
      }
    }
  },
);

Then("no Ayah translation of Surah {int} from Ayah {int} to Ayah {int} is shown", async ({ reader }, surah: number, from: number, to: number) => {
  for (let a = from; a <= to; a++) {
    for (const lang of ["ur", "en"] as const) {
      await expect.poll(() => translationsShown(reader.page, `${surah}:${a}`, lang).then((t) => t.shown), { message: `${lang} ${surah}:${a}` }).toBe(0);
    }
  }
});

// ---------------------------------------------------------------- unselectable Arabic

When("I triple-click the Arabic of the Word at {location}", async ({ reader }, location: string) => {
  const arabic = card(reader.page, location).getByText(arabicOf(location, await scriptOf(reader.page)), { exact: true });
  await arabic.scrollIntoViewIfNeeded();
  await expect(arabic, `the Arabic of the Word at ${location}`).toBeVisible();
  await arabic.click({ clickCount: 3 });
});

// ---------------------------------------------------------------- the first frame

interface FirstWords {
  /** The Word at 1:1:1's drawn text, white space removed. */
  text: string;
  /** Whether Ayah 1:1's heading (its share button) was drawn. */
  heading: boolean;
}

/** Record, in the first animation frame in which the Word at 1:1:1 exists, its drawn text and whether Ayah 1:1's heading is drawn. */
async function watchFirstWordsFrame(page: Page) {
  await page.addInitScript(() => {
    const w = window as unknown as { __firstWords?: FirstWords | null };
    w.__firstWords = null;
    const drawn = (el: Element) => el.getClientRects().length > 0 && el.checkVisibility({ opacityProperty: true, visibilityProperty: true });
    const look = () => {
      const el = document.getElementById("1:1:1");
      if (!el || !document.body) {
        requestAnimationFrame(look);
        return;
      }
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      let text = "";
      for (let n = walker.nextNode(); n; n = walker.nextNode()) if (n.parentElement && drawn(n.parentElement)) text += n.nodeValue;
      const share = document.querySelector('[aria-label="Share Ayah 1:1"]');
      w.__firstWords = { text: text.replace(/\s+/g, ""), heading: !!share && drawn(share) };
    };
    requestAnimationFrame(look);
  });
}

const watchedWords = new WeakSet<Page>();

When("I reload the page, watching the first frame its Words are drawn in", async ({ reader }) => {
  if (!watchedWords.has(reader.page)) {
    await watchFirstWordsFrame(reader.page);
    watchedWords.add(reader.page);
  }
  await reader.page.reload();
});

async function firstWordsFrame(page: Page): Promise<FirstWords> {
  await page.waitForLoadState("load");
  const read = () => page.evaluate(() => (window as unknown as { __firstWords?: FirstWords | null }).__firstWords ?? null);
  await expect.poll(read, { message: "the Word at 1:1:1 was drawn" }).not.toBeNull();
  return (await read())!;
}

Then("the Words of Surah 1 were already drawn Flowing in the first frame the page was drawn in", async ({ reader }) => {
  const first = await firstWordsFrame(reader.page);
  const arabic = arabicOf("1:1:1", await scriptOf(reader.page)).replace(/\s+/g, "");
  expect(first, "the Word at 1:1:1 and Ayah 1:1's heading in the first frame").toEqual({ text: arabic, heading: false });
});

Then("the Words of Surah 1 were drawn in Study in the first frame the page was drawn in", async ({ reader, reading }) => {
  const first = await firstWordsFrame(reader.page);
  const meaning = sourceWords(1)[0].meaning[langOf(reading)].replace(/\s+/g, "");
  expect(first.text, "the Word at 1:1:1 in the first frame shows its Word meaning").toContain(meaning);
  expect(first.heading, "Ayah 1:1's heading in the first frame").toBe(true);
});

// ---------------------------------------------------------------- the skeleton

Then("the Surah's loading skeleton is drawn as lines of running text, not as Word cards", async ({ reader }) => {
  const { page } = reader;
  const shapes = await page.locator("main").evaluate((main) => {
    const width = main.getBoundingClientRect().width;
    return Array.from(main.querySelectorAll("[data-skeleton], [data-skeleton] *"))
      .filter((el) => getComputedStyle(el).backgroundImage.includes("gradient") && el.getClientRects().length > 0)
      .map((el) => {
        const r = el.getBoundingClientRect();
        return { width: r.width, height: r.height, share: r.width / width };
      });
  });
  expect(shapes.length, "shimmering placeholders in the skeleton").toBeGreaterThanOrEqual(3);
  const cardShaped = shapes.filter((s) => s.width <= s.height);
  expect(cardShaped, "placeholders as tall as they are wide, as Word cards are").toEqual([]);
  const lines = shapes.filter((s) => s.share >= 0.5);
  expect(lines.length, "placeholders spanning at least half the reading area, as lines of text do").toBeGreaterThanOrEqual(Math.max(3, Math.ceil(shapes.length * 0.75)));
});

// ---------------------------------------------------------------- a look-up

Then("the Word at {location} is in the viewport", async ({ reader }, location: string) => {
  await expect(card(reader.page, location)).toBeInViewport();
});

/** How a Word is drawn: everything a mark could change. */
const lookOf = (page: Page, location: string) =>
  card(page, location).evaluate((el) => {
    for (const a of document.getAnimations()) if (a instanceof CSSTransition) a.finish();
    const s = getComputedStyle(el);
    return [s.backgroundColor, s.color, s.outlineStyle, s.outlineColor, s.outlineWidth, s.borderTopColor, s.borderTopWidth, s.borderBottomColor, s.borderBottomWidth, s.boxShadow, s.textDecorationLine].join(" | ");
  });

/** The Word at `location` is drawn otherwise once the link's fragment no longer names it. */
export async function expectMarkedUnlikeUntargeted(page: Page, location: string) {
  await page.mouse.move(0, 0);
  const marked = await lookOf(page, location);
  // A fragment that names nothing on the page: the Word is no longer the link's target.
  await page.evaluate(() => {
    window.location.hash = "nothing-here";
  });
  await expect.poll(() => lookOf(page, location), `the Word at ${location} once the link no longer points at it`).not.toBe(marked);
}

Then("the Word at {location} is drawn marked, unlike once the link no longer points at it", async ({ reader }, location: string) => {
  await expectMarkedUnlikeUntargeted(reader.page, location);
});

// ---------------------------------------------------------------- reading well

Then(
  "every Word of Surah {int} fits within the screen's width, its Arabic contrasting with what is drawn behind it by at least {float} to {int}",
  async ({ reader }, surah: number, ratio: number, one: number) => {
    expect(one).toBe(1);
    const { page } = reader;
    await page.mouse.move(0, 0);
    const drawn = await page.evaluate(
      ([src, ids]) => {
        for (const a of document.getAnimations()) if (a instanceof CSSTransition) a.finish();
        const paint = new Function(`return (${src})`)() as (el: Element, over?: string[]) => { behind: string; over: string[] };
        const width = document.documentElement.clientWidth;
        return ids.map((id) => {
          const el = document.getElementById(id)!;
          const r = el.getBoundingClientRect();
          const text = document.createTreeWalker(el, NodeFilter.SHOW_TEXT).nextNode()?.parentElement ?? el;
          const { behind, over } = paint(el, [getComputedStyle(text).color]);
          return { id, fits: r.left >= 0 && r.right <= width, behind, arabic: over[0] };
        });
      },
      [DRAWN, sourceWords(surah).map((w) => w.location)] as const,
    );
    expect(drawn.filter((d) => !d.fits).map((d) => d.id), "Words reaching past the screen's edge").toEqual([]);
    // An Allah reference's Arabic is in Allah reference colour (#147), held to the large-text minimum.
    const least = (id: string) => (isSeededAllahReference(id) ? ALLAH_REFERENCE_CONTRAST : ratio);
    const low = drawn.filter((d) => contrast(d.arabic, d.behind) < least(d.id)).map((d) => `${d.id}: ${d.arabic} on ${d.behind} is ${contrast(d.arabic, d.behind).toFixed(2)} to 1`);
    expect(low).toEqual([]);
  },
);

/** The Passages of Surah `surah` from Ayah `from` to Ayah `till`, each cut to that range. */
const passagesWithin = (surah: number, from: number, till: number) =>
  ranges(passagesOf(surah))
    .filter(([a, b]) => b >= from && a <= till)
    .map(([a, b]) => [Math.max(a, from), Math.min(b, till)] as const);

/**
 * In the page: each Passage's Words (each held with its end marker when it ends
 * its Ayah) as the lines they are drawn on, in reading order. A run is what may
 * not be parted by a line break: a Word, or an Ayah's last Word with its end
 * marker. `arabic` is each Word's drawn Arabic, its text's own box.
 */
function linesInPage(h: PageGeometry, passages: (readonly [number, number])[]) {
  const arabicOf = (word: HTMLElement) => Array.from(word.children).find((c) => h.drawn(c)) ?? word;
  return passages.map(([from, till]) => {
    const runs: { name: string; words: HTMLElement[]; boxes: HTMLElement[] }[] = [];
    for (let a = from; a <= till; a++) {
      const words = h.wordsOf(a);
      words.forEach((word, i) => {
        const end = i === words.length - 1 ? h.endOf(a) : null;
        runs.push({ name: word.id, words: [word], boxes: end ? [word, end] : [word] });
      });
    }
    const lines: (typeof runs)[] = [];
    for (const run of runs) {
      const line = lines.at(-1);
      if (line && h.sameLine(line[0].words[0], run.words[0])) line.push(run);
      else lines.push([run]);
    }
    return { lines, arabicOf };
  });
}
const LINES = linesInPage.toString();

Then(
  "the neighbouring Words of Surah {int} from Ayah {int} to Ayah {int} sit apart on their lines by no more than half their Arabic's size, and never touch",
  async ({ reader }, surah: number, from: number, till: number) => {
    const problems = () =>
      inPage(
        reader.page,
        surah,
        (h, [src, passages]: [string, (readonly [number, number])[]]) => {
          const lines = (new Function(`return (${src})`)() as typeof linesInPage)(h, passages);
          const out: string[] = [];
          for (const { lines: ls, arabicOf } of lines) {
            for (const line of ls) {
              for (let i = 1; i < line.length; i++) {
                // Right to left: each Word sits to the left of the one before it. An end marker between them is not a gap between Words.
                if (line[i - 1].boxes.length > 1) continue;
                const before = arabicOf(line[i - 1].words[0]);
                const word = arabicOf(line[i].words[0]);
                const gap = h.rect(before).left - h.rect(word).right;
                const size = parseFloat(getComputedStyle(word).fontSize);
                if (gap > size / 2) out.push(`${line[i - 1].name} and ${line[i].name} sit ${Math.round(gap)}px apart, more than half of ${size}px`);
                else if (gap < 1) out.push(`${line[i - 1].name} and ${line[i].name} touch (${Math.round(gap)}px apart)`);
              }
            }
          }
          return out;
        },
        [LINES, passagesWithin(surah, from, till)] as [string, (readonly [number, number])[]],
      );
    await expect.poll(problems, { timeout: 10_000 }).toEqual([]);
  },
);

Then(
  "no line of Surah {int} from Ayah {int} to Ayah {int} ends with room left for the Word that starts the next line of its Passage, held with its end marker when it ends its Ayah",
  async ({ reader }, surah: number, from: number, till: number) => {
    const problems = () =>
      inPage(
        reader.page,
        surah,
        (h, [src, passages]: [string, (readonly [number, number])[]]) => {
          const lines = (new Function(`return (${src})`)() as typeof linesInPage)(h, passages);
          const out: string[] = [];
          // A box with the margins it keeps around it (an end marker's).
          const outer = (el: Element) => {
            const r = h.rect(el);
            const s = getComputedStyle(el);
            return { left: r.left - parseFloat(s.marginLeft), right: r.right + parseFloat(s.marginRight) };
          };
          const span = (els: Element[]) => {
            const boxes = els.map(outer);
            return Math.max(...boxes.map((r) => r.right)) - Math.min(...boxes.map((r) => r.left));
          };
          for (const { lines: ls } of lines) {
            for (let l = 0; l + 1 < ls.length; l++) {
              // The Passage's block, its lines' width: the Ayah section's nearest ancestor that is not inline.
              const column = h.columnOf(document.getElementById(ls[l][0].name.split(":").slice(0, 2).join(":"))!);
              const room = column.right - column.left - span(ls[l].flatMap((run) => run.boxes));
              const next = ls[l + 1][0];
              const width = span(next.boxes);
              // A pixel's slack for the browser's rounding.
              if (room >= width + 1) out.push(`the line ending at ${ls[l].at(-1)!.name} has ${Math.round(room)}px left, room for ${next.name}'s ${Math.round(width)}px`);
            }
          }
          return out;
        },
        [LINES, passagesWithin(surah, from, till)] as [string, (readonly [number, number])[]],
      );
    await expect.poll(problems, { timeout: 10_000 }).toEqual([]);
  },
);

// ---------------------------------------------------------------- the Ayah at the top, in view

// Wholly on screen and not under the Surah bar, in either form: the slim row is the bar's last row, so its bottom is the bar's.
Then("the first Word of Ayah {word} is in view, below the Surah bar", async ({ reader }, ayah: string) => {
  const { page } = reader;
  const where = async () => {
    const word = (await card(page, `${ayah}:1`).boundingBox())!;
    const bar = (await slimRow(page).boundingBox())!;
    const height = page.viewportSize()!.height;
    if (word.y < bar.y + bar.height - 1) return `under the Surah bar: its top at ${Math.round(word.y)}px, the bar's bottom at ${Math.round(bar.y + bar.height)}px`;
    if (word.y + word.height > height) return `below the screen: its bottom at ${Math.round(word.y + word.height)}px`;
    return "in view";
  };
  await expect.poll(where, { message: `the first Word of Ayah ${ayah}` }).toBe("in view");
});
