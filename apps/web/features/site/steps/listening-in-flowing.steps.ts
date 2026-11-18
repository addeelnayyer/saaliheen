// Steps for #126: listening to a Recitation in Flowing. The Recitation, its
// stubbed audio and what the page notes as the Recited Word are the
// Recitation's steps (./recitation.steps.ts); the Ayah layout switch and the
// page's geometry are Flowing's (./flowing.steps.ts). Here: tapping a Word in
// the running text, by pointer or keyboard, and reading how the page draws the
// mark and the dimming.
//
// How a thing is drawn is read from what the browser paints: each piece of its
// text in its colour, through the opacity of every element holding it (and any
// opacity() filter), over every background from the page's canvas down to it,
// composited on a one-pixel canvas. Its contrast with what is behind it says
// whether it is dimmed: at most 80% of the contrast noted before the
// Recitation played is dimmed, at least 90% of it is drawn as noted. A Word's
// Phrase colour is its own background, through the same opacity.

import { expect, type Page } from "@playwright/test";
import { card, clickInPlace, shot } from "../support";
import { Given, Then, When } from "./fixtures";
import { inPage, translationParagraph, type PageGeometry } from "./flowing.steps";
import { contrast } from "./phrase-colours.steps";
import { isSeededAllahReference } from "./allah-references";
import { passagesOf } from "./passages";
import { audioState, forgetRecited, noted, recitedCard, recitedCardInSight } from "./recitation.steps";

/** At most this share of the noted contrast is dimmed. */
const DIMMED = 0.8;
/** At least this share of the noted contrast is drawn as noted. */
const AS_NOTED = 0.9;

// ---------------------------------------------------------------- reading what is drawn, in the page

/**
 * In the page: helpers that read how things are drawn. Self-contained: it is
 * sent into the page as source and rebuilt there.
 */
function inkInPage() {
  const ctx = document.createElement("canvas").getContext("2d", { willReadFrequently: true })!;
  const opacity = (el: Element | null) => {
    let o = 1;
    for (let e = el; e; e = e.parentElement) {
      const s = getComputedStyle(e);
      o *= Number(s.opacity);
      const f = /opacity\(\s*([\d.]+)(%?)\s*\)/.exec(s.filter);
      if (f) o *= Number(f[1]) / (f[2] ? 100 : 1);
    }
    return o;
  };
  const paintBehind = (el: Element) => {
    const chain: Element[] = [];
    for (let e: Element | null = el; e; e = e.parentElement) chain.unshift(e);
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, 1, 1);
    for (const e of chain) {
      ctx.globalAlpha = opacity(e);
      ctx.fillStyle = getComputedStyle(e).backgroundColor;
      ctx.fillRect(0, 0, 1, 1);
    }
    ctx.globalAlpha = 1;
  };
  const read = () => Array.from(ctx.getImageData(0, 0, 1, 1).data.slice(0, 3));
  const luminance = (c: number[]) => {
    const [r, g, b] = c.map((v) => {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const contrast = (a: number[], b: number[]) => {
    const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
    return (hi + 0.05) / (lo + 0.05);
  };
  const drawn = (el: Element) => el.getClientRects().length > 0 && el.checkVisibility({ visibilityProperty: true });
  /** The lowest contrast any drawn text in `el` has with what is drawn behind it; null when it draws no text. */
  const inkContrast = (el: Element): number | null => {
    let low: number | null = null;
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const p = n.parentElement;
      if (!p || !n.nodeValue?.trim() || !drawn(p)) continue;
      paintBehind(p);
      const behind = read();
      ctx.globalAlpha = opacity(p);
      ctx.fillStyle = getComputedStyle(p).color;
      ctx.fillRect(0, 0, 1, 1);
      ctx.globalAlpha = 1;
      const c = contrast(read(), behind);
      low = low === null ? c : Math.min(low, c);
    }
    return low;
  };
  /** The colour drawn behind `el`'s content: every background down to its own. */
  const behindOf = (el: Element) => {
    paintBehind(el);
    return `rgb(${read().join(", ")})`;
  };
  /** Everything a mark could change on `el` and what it draws inside it. */
  const look = (el: Element) =>
    [el, ...Array.from(el.querySelectorAll("*")).filter(drawn)]
      .map((e) => {
        const s = getComputedStyle(e);
        return [s.backgroundColor, s.color, s.outlineStyle, s.outlineColor, s.outlineWidth, s.borderTopColor, s.borderTopWidth, s.borderBottomColor, s.boxShadow, s.textDecorationLine, s.fontWeight, opacity(e).toFixed(3)].join(" ");
      })
      .join(" / ");
  /** A Word's Phrase colour: its own background, through the opacity of everything holding it. */
  const tint = (el: Element) => `${getComputedStyle(el).backgroundColor} @ ${opacity(el).toFixed(3)}`;
  const finish = () => {
    for (const a of document.getAnimations()) if (a instanceof CSSTransition) a.finish();
  };
  return { inkContrast, behindOf, look, tint, finish };
}
const INK = inkInPage.toString();

/** How one Word is drawn. */
interface DrawnWord {
  id: string;
  contrast: number | null;
  look: string;
  tint: string;
}

/** How one Ayah is drawn: its Words, its end marker's contrast, and what is drawn behind its section. */
interface DrawnAyah {
  ayah: string;
  words: DrawnWord[];
  end: number | null;
  section: string;
  /** The Word marked as the Recited Word, if one of this Ayah's is. */
  recited: string | null;
}

/** How Surah `surah`'s Ayahs `ayahs` are drawn now, once their transitions end. */
const drawnAyahs = (page: Page, surah: number, ayahs: number[]) =>
  inPage<{ ink: string; ayahs: number[]; surah: number }, DrawnAyah[]>(
    page,
    surah,
    (h: PageGeometry, { ink, ayahs, surah }) => {
      const k = (new Function(`return (${ink})`)() as () => ReturnType<typeof inkInPage>)();
      k.finish();
      return ayahs.map((a) => {
        const words = h.wordsOf(a);
        const end = h.endOf(a);
        const section = document.getElementById(`${surah}:${a}`)!;
        return {
          ayah: `${surah}:${a}`,
          words: words.map((w) => ({ id: w.id, contrast: k.inkContrast(w), look: k.look(w), tint: k.tint(w) })),
          end: end ? k.inkContrast(end) : null,
          section: k.behindOf(section),
          recited: words.find((w) => w.hasAttribute("data-recited"))?.id ?? null,
        };
      });
    },
    { ink: INK, ayahs, surah },
  );

const ayahCount = (page: Page, surah: number) => page.locator(`section[id^="${surah}:"]`).evaluateAll((els) => els.filter((el) => /^\d+:\d+$/.test(el.id)).length);

/** What a scenario noted before the Recitation played, by page. */
interface Noted {
  words: Map<string, DrawnWord>;
  ends: Map<string, number | null>;
  sections: Map<string, string>;
  paragraphs: Map<string, number | null>;
}
const notes = new WeakMap<Page, Noted>();
const notesOf = (page: Page): Noted => {
  if (!notes.has(page)) notes.set(page, { words: new Map(), ends: new Map(), sections: new Map(), paragraphs: new Map() });
  return notes.get(page)!;
};

async function note(page: Page, surah: number, ayahs: number[]) {
  await page.mouse.move(0, 0);
  const n = notesOf(page);
  for (const a of await drawnAyahs(page, surah, ayahs)) {
    for (const w of a.words) n.words.set(w.id, w);
    n.ends.set(a.ayah, a.end);
    n.sections.set(a.ayah, a.section);
  }
  expect(n.words.size, "Words noted").toBeGreaterThan(0);
}

/** The Language of the page, from its address. */
const langOfPage = (page: Page) => (new URL(page.url()).pathname.startsWith("/ur") ? "ur" : "en");

/** The lowest contrast of the text of each of Surah `surah`'s Ayah translation paragraphs, by Passage. */
async function drawnParagraphs(page: Page, surah: number) {
  const out = new Map<string, number | null>();
  for (const p of passagesOf(surah)) {
    const paragraph = translationParagraph(page, p, langOfPage(page));
    await expect(paragraph, `Passage ${surah}:${p.ayah_from}–${p.ayah_till}'s Ayah translation paragraph`).toBeVisible();
    out.set(
      `${surah}:${p.ayah_from}–${p.ayah_till}`,
      await paragraph.evaluate((el, ink) => {
        const k = (new Function(`return (${ink})`)() as () => ReturnType<typeof inkInPage>)();
        k.finish();
        return k.inkContrast(el);
      }, INK),
    );
  }
  return out;
}

const ayahsOf = (count: number) => Array.from({ length: count }, (_, k) => k + 1);
const fmt = (c: number | null) => (c === null ? "no text" : c.toFixed(2));

/** Each Word and end marker of Surah `surah`'s Ayahs `ayahs` whose contrast against the noted is not what `ok` wants, skipping the Recited Word. */
async function unlike(page: Page, surah: number, ayahs: number[], ok: (now: number, before: number) => boolean, want: string) {
  const n = notesOf(page);
  const problems: string[] = [];
  for (const a of await drawnAyahs(page, surah, ayahs)) {
    for (const w of a.words) {
      if (w.id === a.recited) continue;
      const before = n.words.get(w.id)?.contrast;
      if (before == null || w.contrast === null) problems.push(`${w.id}: noted ${fmt(before ?? null)}, now ${fmt(w.contrast)}`);
      else if (!ok(w.contrast, before)) problems.push(`${w.id}'s Arabic: ${fmt(w.contrast)} to 1, noted ${fmt(before)}, not ${want}`);
    }
    const before = n.ends.get(a.ayah);
    if (before == null || a.end === null) problems.push(`${a.ayah}'s end: noted ${fmt(before ?? null)}, now ${fmt(a.end)}`);
    else if (!ok(a.end, before)) problems.push(`${a.ayah}'s end: ${fmt(a.end)} to 1, noted ${fmt(before)}, not ${want}`);
  }
  return problems.slice(0, 12);
}

const dimmed = (now: number, before: number) => now <= before * DIMMED;
const asNoted = (now: number, before: number) => now >= before * AS_NOTED;

// ---------------------------------------------------------------- tapping a Word

When("I tap the Word at {location}", async ({ reader: { page } }, location: string) => {
  await forgetRecited(page);
  const word = card(page, location);
  await expect(word, `the Word at ${location}`).toHaveCount(1);
  await word.scrollIntoViewIfNeeded();
  await clickInPlace(word);
});

When("I move keyboard focus to the Word at {location} with Tab", async ({ reader: { page } }, location: string) => {
  await page.evaluate(() => {
    (document.activeElement as HTMLElement | null)?.blur();
    window.scrollTo(0, 0);
  });
  const focused = () => card(page, location).evaluate((el) => el === document.activeElement || el.contains(document.activeElement));
  for (let presses = 0; !(await focused()); presses++) {
    expect(presses, `Tab presses to reach the Word at ${location}`).toBeLessThan(300);
    await page.keyboard.press("Tab");
  }
  await forgetRecited(page);
});

When("I press Space", async ({ reader: { page } }) => {
  await page.keyboard.press(" ");
});

/** Where the Recitation's audio was when last noted, per page. */
const audioNoted = new WeakMap<Page, number>();

When("I note where the Recitation's audio is", async ({ reader: { page } }) => {
  const state = await audioState(page);
  expect(state, "a Recitation on the page").not.toBeNull();
  audioNoted.set(page, state!.ms);
});

Then("the Recitation's audio is where I noted it", async ({ reader: { page } }) => {
  // Given time to move, had the tap played it or moved it to the Word.
  await page.waitForTimeout(500);
  expect((await audioState(page))?.ms).toBe(audioNoted.get(page));
});

Then("the first Recited Word is the Word at {location}", async ({ reader: { page } }, location: string) => {
  await expect.poll(() => noted(page, (l) => l.recited[0] ?? null)).toBe(location);
});

Then("no Word and no Ayah is marked", async ({ reader: { page } }) => {
  await expect(page.locator("[data-recited]")).toHaveCount(0);
});

// ---------------------------------------------------------------- the mark

Given("I note how every Word of Ayah {word} is drawn", async ({ reader: { page } }, ayah: string) => {
  const [surah, a] = ayah.split(":").map(Number);
  await note(page, surah, [a]);
});

Then(
  "the Recited Word is drawn marked in the running text, unlike before the Recitation played, and the other Words of its Ayah are drawn as noted",
  async ({ reader: { page } }) => {
    const n = notesOf(page);
    const problems = async () => {
      const recited = await recitedCard(page).evaluateAll((els) => els.map((el) => el.id));
      if (recited.length !== 1) return [`${recited.length} Words marked as the Recited Word`];
      const [surah, a] = recited[0].split(":").map(Number);
      if (!n.words.has(`${surah}:${a}:1`)) return [`Ayah ${surah}:${a}'s Words were not noted`];
      const [drawn] = await drawnAyahs(page, surah, [a]);
      const out: string[] = [];
      for (const w of drawn.words) {
        const before = n.words.get(w.id)!.look;
        if (w.id === recited[0] && w.look === before) out.push(`${w.id}, the Recited Word, is drawn as it was before the Recitation played`);
        if (w.id !== recited[0] && w.look !== before) out.push(`${w.id} is drawn unlike before: ${w.look}`);
      }
      return out;
    };
    await page.mouse.move(0, 0);
    await expect.poll(problems).toEqual([]);
  },
);

// ---------------------------------------------------------------- the dimming

Given(/^I note how every Ayah of Surah (\d+) is drawn(, with its Ayah translation paragraph)?$/, async ({ reader: { page } }, s: string, paragraphs?: string) => {
  const surah = Number(s);
  const count = await ayahCount(page, surah);
  expect(count, `Ayahs of Surah ${surah} on the page`).toBeGreaterThan(0);
  await note(page, surah, ayahsOf(count));
  if (paragraphs) notesOf(page).paragraphs = await drawnParagraphs(page, surah);
});

Then("the Arabic and the Ayah end of every Ayah of Surah {int} but Ayah {word} are dimmed", async ({ reader: { page } }, surah: number, but: string) => {
  const others = ayahsOf(await ayahCount(page, surah)).filter((a) => `${surah}:${a}` !== but);
  await page.mouse.move(0, 0);
  await expect.poll(() => unlike(page, surah, others, dimmed, "dimmed")).toEqual([]);
});

Then("the Arabic and the Ayah end of Ayah {word} are drawn as noted", async ({ reader: { page } }, ayah: string) => {
  const [surah, a] = ayah.split(":").map(Number);
  await page.mouse.move(0, 0);
  await expect.poll(() => unlike(page, surah, [a], asNoted, "as noted")).toEqual([]);
});

Then("the Arabic and the Ayah end of every Ayah of Surah {int} are drawn as noted", async ({ reader: { page } }, surah: number) => {
  const all = ayahsOf(await ayahCount(page, surah));
  await page.mouse.move(0, 0);
  await expect.poll(() => unlike(page, surah, all, asNoted, "as noted")).toEqual([]);
});

Then("every Word of Surah {int} but the Recited Word keeps its noted Phrase colour", async ({ reader: { page } }, surah: number) => {
  const n = notesOf(page);
  const all = ayahsOf(await ayahCount(page, surah));
  await page.mouse.move(0, 0);
  const problems = async () =>
    (await drawnAyahs(page, surah, all))
      .flatMap((a) => a.words.filter((w) => w.id !== a.recited && w.tint !== n.words.get(w.id)?.tint).map((w) => `${w.id}: ${w.tint}, noted ${n.words.get(w.id)?.tint}`))
      .slice(0, 12);
  await expect.poll(problems).toEqual([]);
});

Then("the Ayah translation paragraphs of Surah {int} are drawn as noted", async ({ reader: { page } }, surah: number) => {
  const before = notesOf(page).paragraphs;
  expect(before.size, "Ayah translation paragraphs noted").toBeGreaterThan(0);
  const problems = async () =>
    Array.from(await drawnParagraphs(page, surah))
      .filter(([name, now]) => now === null || before.get(name) == null || !asNoted(now, before.get(name)!))
      .map(([name, now]) => `${name}: ${fmt(now)} to 1, noted ${fmt(before.get(name) ?? null)}`);
  await expect.poll(problems).toEqual([]);
});

// ---------------------------------------------------------------- following the Recited Word

Then("the Recited Word is on screen, clear of the Surah bar and the Recitation bar", async ({ reader: { page } }) => {
  await expect.poll(() => recitedCardInSight(page)).toBe("in sight");
});

Then("the Recited Word is not on screen", async ({ reader: { page } }) => {
  await expect(recitedCard(page)).toHaveCount(1);
  await expect(recitedCard(page)).not.toBeInViewport();
});

// ---------------------------------------------------------------- Study as it was

Then("the Recited Word's Ayah is drawn faintly marked, unlike before the Recitation played", async ({ reader: { page } }) => {
  const n = notesOf(page);
  const problems = async () => {
    const recited = await recitedCard(page).evaluateAll((els) => els.map((el) => el.id));
    if (recited.length !== 1) return `${recited.length} Words marked as the Recited Word`;
    const [surah, a] = recited[0].split(":").map(Number);
    const [drawn] = await drawnAyahs(page, surah, [a]);
    const before = n.sections.get(drawn.ayah);
    if (!before) return `Ayah ${drawn.ayah} was not noted`;
    if (drawn.section === before) return `Ayah ${drawn.ayah} is drawn on ${before}, as before`;
    const k = contrast(drawn.section, before);
    return k < 1.25 ? "faintly marked" : `Ayah ${drawn.ayah} is drawn on ${drawn.section}, ${k.toFixed(2)} to 1 against ${before}: no faint mark`;
  };
  await page.mouse.move(0, 0);
  await expect.poll(problems).toBe("faintly marked");
});

// ---------------------------------------------------------------- reading well

Then(
  "the Arabic of every Word but the Allah references, and the Ayah end, of every Ayah of Surah {int} contrast with what is drawn behind them by at least {float} to {int}",
  async ({ reader: { page } }, surah: number, ratio: number, one: number) => {
    expect(one).toBe(1);
    const all = ayahsOf(await ayahCount(page, surah));
    await page.mouse.move(0, 0);
    const low = (await drawnAyahs(page, surah, all)).flatMap((a) => [
      ...a.words.filter((w) => !isSeededAllahReference(w.id) && (w.contrast ?? 0) < ratio).map((w) => `${w.id}'s Arabic: ${fmt(w.contrast)} to 1`),
      ...((a.end ?? 0) < ratio ? [`${a.ayah}'s end: ${fmt(a.end)} to 1`] : []),
    ]);
    expect(low).toEqual([]);
  },
);

Then("the Arabic of Ayah {word} contrasts with what is drawn behind it by at least {float} to {int}", async ({ reader: { page } }, ayah: string, ratio: number, one: number) => {
  expect(one).toBe(1);
  const [surah, a] = ayah.split(":").map(Number);
  await page.mouse.move(0, 0);
  const [drawn] = await drawnAyahs(page, surah, [a]);
  expect(drawn.words.filter((w) => (w.contrast ?? 0) < ratio).map((w) => `${w.id}'s Arabic: ${fmt(w.contrast)} to 1`)).toEqual([]);
});

Then("I save a screenshot of the page as it is {string}", async ({ reader: { page } }, name: string) => {
  await shot(page, name);
});
