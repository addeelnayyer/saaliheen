// A Share page's Words (#146): each Shared Ayah's Arabic drawn Word by Word,
// every Word marked with its Word location (`data-location`, `s:a:w`, as the
// Surah page's `#s:a:w` deep link names a Word), while what a visitor sees is
// what the Ayah's plain text drew before. Expected Words and Ayah ends are read
// from the committed sources (../support), never typed.
//
// "Looks the same" is measured, not eyeballed: beside the page's Arabic the
// step lays out, with the same paragraph's own styles and width, the plain
// text a Share page drew before #146 (each Ayah's Words joined by spaces, its
// last Word and end held on one line, a space after each Ayah in Flowing), and
// expects every Word and Ayah end at the same place on the same line, in the
// same colour (a seeded Allah reference, from #149, in the frame's gold) and typeface, and the paragraph the same size, so the frame
// around it is too.
//
// One reflow is tolerated, by the user's ruling on #146: Chromium rounds the
// width of each separately laid-out piece of text up to 1/64px, so a line of
// Words drawn one by one can be a hair wider than the same line as one string.
// Where the plain line had less than 1/64px spare per Word on it, its last Word
// may go to the next line. The step then lays the plain text out again with the
// line broken there and holds everything, that line and those after it
// included, to that layout just as strictly. No other break may differ.

import { expect, type Locator, type Page } from "@playwright/test";
import { sourceAyahEnd, sourceWords } from "../support";
import { isSeededAllahReference } from "./allah-references";
import { GOLD, rgb } from "./allah-references.steps";
import { Then, type SharedAyahs } from "./fixtures";
import { ayahText, scriptText, type Script } from "./reader";
import { arabicPattern, whole } from "./share-page.steps";

/** The Ayahs of `shared`, each as `s:a`. */
const ayahsOf = ({ surah, from, to }: SharedAyahs) => Array.from({ length: to - from + 1 }, (_, k) => `${surah}:${from + k}`);

/** The Word locations of Ayah `s:a`, in order, from the sources. */
const locationsOf = (ayah: string) =>
  sourceWords(Number(ayah.split(":")[0]))
    .map((w) => w.location)
    .filter((l) => l.startsWith(`${ayah}:`));

/**
 * The paragraphs holding the Arabic of `shared` as the page shows it now: one
 * running all the Shared Ayahs on (Flowing), else one per Ayah (Ayah by Ayah),
 * each with the Ayahs it holds.
 */
async function arabicParagraphs(page: Page, shared: SharedAyahs, script: Script): Promise<{ paragraph: Locator; ayahs: string[] }[]> {
  const ayahs = ayahsOf(shared);
  const flowing = page.getByText(whole(ayahs.map((a) => arabicPattern(a, script)).join("\\s+")));
  if (ayahs.length > 1 && (await flowing.count()) > 0) return [{ paragraph: flowing.first(), ayahs }];
  return ayahs.map((a) => ({ paragraph: page.getByText(whole(arabicPattern(a, script))).first(), ayahs: [a] }));
}

// ---------------------------------------------------------------- AC-1: every Word on its own, with its Word location

Then(
  "every Word of {ayahs} is drawn on its own in the Arabic, in order, marked with its Word location and showing its {script} text",
  async ({ reader }, shared: SharedAyahs, script: Script) => {
    const { page } = reader;
    for (const { paragraph, ayahs } of await arabicParagraphs(page, shared, script)) {
      await expect(paragraph, `the Arabic of ${ayahs.join(", ")}`).toBeVisible();
      const drawn = await paragraph.evaluate((p) =>
        Array.from(p.querySelectorAll("[data-location]")).map((w) => ({
          location: w.getAttribute("data-location"),
          text: (w.textContent ?? "").trim(),
        })),
      );
      const expected = ayahs.flatMap(locationsOf).map((location) => ({ location, text: scriptText(location, script) }));
      expect(drawn, `the Words drawn in the Arabic of ${ayahs.join(", ")}, each with its Word location and ${script} text`).toEqual(expected);
    }
  },
);

// ---------------------------------------------------------------- AC-2: laid out as the plain text was

/** One run of letters in a paragraph (a Word or an Ayah end), where and how it is drawn. */
interface Drawn {
  text: string;
  /** Its box, from the paragraph's top right corner (the Arabic runs right to left). */
  right: number;
  top: number;
  width: number;
  height: number;
  /** Its colour and typeface. */
  look: string;
}

interface Layout {
  width: number;
  height: number;
  /** The width its lines are laid out in (inside its padding). */
  inner: number;
  text: string;
  runs: Drawn[];
}

/**
 * In the page: the paragraph `p` as drawn, and the plain text of `ayahs` laid
 * out with `p`'s own styles and width, as a Share page drew it before #146.
 * `breaks` are the runs (Words and Ayah ends, counted in order) the plain text
 * is broken before, for the tolerated reflows.
 * Self-contained: it is sent into the page as source.
 */
function asDrawnAndAsPlain(
  p: Element,
  { ayahs, flowing, breaks }: { ayahs: { words: string[]; end: string }[]; flowing: boolean; breaks: number[] },
): { drawn: Layout; plain: Layout } {
  type Char = { node: Text; offset: number; ch: string };
  /** Every character of `el`'s text, with the text node and offset it sits at. */
  const charsOf = (el: Element) => {
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const chars: Char[] = [];
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const t = n as Text;
      for (let i = 0; i < t.data.length; i++) chars.push({ node: t, offset: i, ch: t.data[i] });
    }
    return chars;
  };
  /** The last character of the run of letters starting at `chars[i]`. */
  const runEnd = (chars: Char[], i: number) => {
    let j = i;
    while (j + 1 < chars.length && !/\s/.test(chars[j + 1].ch)) j++;
    return j;
  };
  /** The run `chars[i..j]`, where and how it is drawn inside `box`. */
  const runOf = (chars: Char[], i: number, j: number, box: DOMRect) => {
    const range = document.createRange();
    range.setStart(chars[i].node, chars[i].offset);
    range.setEnd(chars[j].node, chars[j].offset + 1);
    const r = range.getBoundingClientRect();
    const s = getComputedStyle(chars[i].node.parentElement!);
    return {
      text: chars.slice(i, j + 1).map((c) => c.ch).join(""),
      right: box.right - r.right,
      top: r.top - box.top,
      width: r.width,
      height: r.height,
      look: [s.color, s.fontFamily, s.fontSize, s.fontWeight, s.fontStyle, s.letterSpacing, s.wordSpacing].join(" | "),
    };
  };
  /** The width `el`'s lines are laid out in: inside its padding and border. */
  const innerOf = (el: Element, box: DOMRect) => {
    const cs = getComputedStyle(el);
    return box.width - ["paddingLeft", "paddingRight", "borderLeftWidth", "borderRightWidth"].reduce((sum, k) => sum + parseFloat(cs[k as "paddingLeft"]), 0);
  };
  const measure = (el: Element) => {
    const box = el.getBoundingClientRect();
    const chars = charsOf(el);
    const runs = [];
    for (let i = 0; i < chars.length; ) {
      if (/\s/.test(chars[i].ch)) {
        i++;
        continue;
      }
      const j = runEnd(chars, i);
      runs.push(runOf(chars, i, j, box));
      i = j + 1;
    }
    return { width: box.width, height: box.height, inner: innerOf(el, box), text: (el.textContent ?? "").replace(/\s+/g, " ").trim(), runs };
  };

  const plain = p.cloneNode(false) as HTMLElement;
  plain.removeAttribute("id");
  let run = 0;
  const breakHere = () => {
    if (breaks.includes(run)) plain.append(document.createElement("br"));
    run++;
  };
  for (const { words, end } of ayahs) {
    for (const w of words.slice(0, -1)) {
      breakHere();
      plain.append(w + " ");
    }
    breakHere();
    run++; // the Ayah end, held on its last Word's line
    const ending = document.createElement("span");
    ending.style.whiteSpace = "nowrap";
    ending.textContent = `${words.at(-1)} ${end}`;
    plain.append(ending);
    if (flowing) plain.append(" ");
  }
  Object.assign(plain.style, { position: "absolute", visibility: "hidden", left: "0", top: "0", margin: "0", width: getComputedStyle(p).width });
  const drawn = measure(p);
  p.parentElement!.append(plain);
  const asPlain = measure(plain);
  plain.remove();
  return { drawn, plain: asPlain };
}

/** Within this many CSS pixels is the same place: the page and the plain text sit at different fractional offsets. */
const NEAR = 1;

/** How `drawn` differs from `plain` in place, size or look; nothing when they match. */
const unlike = (drawn: Partial<Drawn>, plain: Partial<Drawn>): string[] => [
  ...(["right", "top", "width", "height"] as const)
    .filter((k) => drawn[k] !== undefined && Math.abs(drawn[k]! - plain[k]!) > NEAR)
    .map((k) => `${k} ${drawn[k]!.toFixed(1)}, not ${plain[k]!.toFixed(1)}`),
  ...(drawn.look !== plain.look ? [`drawn as ${drawn.look}, not ${plain.look}`] : []),
];

/**
 * `plain`'s look as the Share page draws it from #149 on: the same, but for a
 * run that is a seeded Allah reference, whose colour is the gold of the frame's
 * look (its scheme's, as the device prefers). Every other run keeps its ink.
 */
const asGoldened = (look: string, gold: string) => [gold, ...look.split(" | ").slice(1)].join(" | ");

/** The runs of `layout` on the same line as run `i`. */
const lineOf = (layout: Layout, i: number) => layout.runs.filter((r) => Math.abs(r.top - layout.runs[i].top) < layout.runs[i].height / 2);

/**
 * Whether run `i`, the first run drawn on a lower line than in the `plain`
 * text, went there by the tolerated reflow: it is a Word not already starting
 * a line in the plain text, and its plain line had under 1/64px spare per Word
 * on it. (The rest of that line, re-centred, is then held to the plain text
 * broken before run `i`.) `isWord` tells Words from Ayah ends.
 */
function toleratedReflow(plain: Layout, i: number, isWord: boolean[], breaks: number[]): string | undefined {
  if (i === 0 || breaks.includes(i) || !isWord[i]) return undefined;
  const line = lineOf(plain, i);
  if (!line.includes(plain.runs[i - 1])) return undefined;
  const used = Math.max(...line.map((r) => r.right + r.width)) - Math.min(...line.map((r) => r.right));
  const words = line.filter((r) => isWord[plain.runs.indexOf(r)]).length;
  const spare = plain.inner - used;
  if (spare >= words / 64) return undefined;
  return `${plain.runs[i].text} went to the next line: its plain line of ${words} Words had ${spare.toFixed(3)}px spare, under ${words}/64px`;
}

Then(
  "the Arabic of {ayahs} in {script} is laid out exactly as its plain text: every Word and Ayah end on the same line, at the same place, in the same colour and typeface, and the same size overall",
  async ({ reader }, shared: SharedAyahs, script: Script) => {
    const { page } = reader;
    await page.evaluate(() => document.fonts.ready);
    for (const { paragraph, ayahs } of await arabicParagraphs(page, shared, script)) {
      await expect(paragraph, `the Arabic of ${ayahs.join(", ")}`).toBeVisible();
      const plain = ayahs.map((a) => ({ words: ayahText(a, script).split(" "), end: sourceAyahEnd(a, script) }));
      const isWord = plain.flatMap(({ words }) => [...words.map(() => true), false]);
      // #149: which runs are Allah references in the seeded list, drawn in gold
      const allah = ayahs.flatMap((a) => [...locationsOf(a).map(isSeededAllahReference), false]);
      const dark = await page.evaluate(() => matchMedia("(prefers-color-scheme: dark)").matches);
      const gold = rgb(dark ? GOLD.dark : GOLD.light);
      const what = `the Arabic of ${ayahs.join(", ")}`;
      const breaks: number[] = [];
      let drawn: Layout, expected: Layout;
      for (;;) {
        ({ drawn, plain: expected } = await paragraph.evaluate(asDrawnAndAsPlain, { ayahs: plain, flowing: ayahs.length > 1, breaks }));
        expect(drawn.text, `${what}: the same text as its plain text`).toBe(expected.text);
        expect(drawn.runs.map((r) => r.text), `${what}: the same Words and Ayah ends`).toEqual(expected.runs.map((r) => r.text));
        const lower = drawn.runs.findIndex((r, i) => r.top > expected.runs[i].top + NEAR);
        const reflow = lower < 0 ? undefined : toleratedReflow(expected, lower, isWord, breaks);
        if (!reflow) break;
        console.log(`${what}: tolerated reflow (#146 ruling): ${reflow}`);
        breaks.push(lower);
      }
      const moved = drawn.runs.flatMap((r, i) => unlike(r, allah[i] ? { ...expected.runs[i], look: asGoldened(expected.runs[i].look, gold) } : expected.runs[i]).map((d) => `${r.text}: ${d}`));
      expect(moved, `${what}: each Word and Ayah end where, and as, its plain text draws it`).toEqual([]);
      expect(unlike(drawn, expected), `${what}: the same size`).toEqual([]);
    }
  },
);
