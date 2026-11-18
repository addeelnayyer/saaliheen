// Steps for Marked Words (#143), in the Iltifat editor and on the Iltifat
// pages: features/site/iltifat-editor-marked-words.feature and
// features/site/iltifat-pages-marked-words.feature.
//
// Each scenario first says, through the API, which Iltifat have Marked Words
// (PUT /api/v1/iltifat/{id} as the Admin, the save features/api/
// iltifat-marked-words.feature specifies), every other Iltifat being saved
// with none. The Iltifat, their ids and Marked Words are read from GET
// /api/v1/iltifat each time a step needs them, and the fields and version a
// save sends from the `iltifat` table; how Marked Words are stored is the
// implementation's. Arabic comes from the sources; persons, sides and
// messages from the features (the issue's words).
//
// The shapes these steps expect (PROPOSED, #143 stage 1):
// - the editor: radio buttons "From" and "To" choose the side a tap marks;
//   tapping a Word card (the element whose id is its Word location) marks it
//   on that side, or takes it out when it is already marked; a marked card is
//   drawn in its side's tint, and a screen reader hears its side ("from He",
//   "to You") with it.
// - the list: a marked Iltifat's link says "Marked"; "Not yet marked" is a
//   checkbox, or a toggle button (aria-pressed), filtering the list.
// - an Iltifat page: each Marked Word of a marked entry is an element whose
//   `data-location` is its Word location, inside the entry's Arabic (an
//   element with lang="ar"), drawn in its side's tint, a screen reader
//   hearing its Arabic and its side; the entry's key, outside its Arabic,
//   holds for each side an element whose text is just "From He" (or "To We",
//   ...) beside a swatch drawn in that side's tint.

import { expect, type Locator, type Page } from "@playwright/test";
import type { DataTable } from "playwright-bdd";
import { Pool } from "pg";
import { ADMIN_EMAIL } from "../admin-settings";
import { testDatabase } from "../test-database";
import { sourceWord } from "../support";
import { Given, Then, When, type Reading } from "./fixtures";
import { DIRECTIONS, directionNamed } from "./iltifat";
import { contrast, DRAWN } from "./phrase-colours.steps";
import { scriptText, type Script } from "./reader";

// ---------------------------------------------------------------- the API, as the Admin

type Side = "from" | "to";
interface Marked {
  location: string;
  side: Side;
}
/** An Iltifat as GET /api/v1/iltifat answers it. */
interface Answered {
  id: number;
  direction: string;
  surah: number;
  ayahFrom: number;
  ayahTo: number;
  citedAyah: number;
  reason: string;
  disputed: boolean;
  version: number;
  markedWords: Marked[];
}

const baseURL = () => `http://127.0.0.1:${Number(process.env.PORT)}`;

let adminCookie: string | undefined;
/** The Admin's session cookie, from the Account test sign-in (as if through Google). */
async function admin(): Promise<string> {
  if (adminCookie) return adminCookie;
  const res = await fetch(`${baseURL()}/api/v1/auth/test-sign-in`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: baseURL() },
    body: JSON.stringify({ email: ADMIN_EMAIL, method: "google" }),
  });
  expect(res.status, `the test sign-in signs ${ADMIN_EMAIL} in`).toBe(200);
  adminCookie = res.headers
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .join("; ");
  return adminCookie;
}

/** Every Iltifat as the API answers it now. */
async function everyAnswered(): Promise<Answered[]> {
  const res = await fetch(`${baseURL()}/api/v1/iltifat`);
  expect(res.status, "GET /api/v1/iltifat").toBe(200);
  return ((await res.json()) as { iltifat: Answered[] }).iltifat;
}

/** "He → We cited at 17:1" as the API answers it now. */
async function answeredNamed(named: string): Promise<Answered> {
  const m = named.match(/^(.+?)(?: Iltifat)? cited at (\d+):(\d+)$/);
  if (!m) throw new Error(`not an Iltifat named by its direction and cited Ayah: "${named}"`);
  const slug = directionNamed(m[1]).slug;
  const found = (await everyAnswered()).filter((i) => i.direction === slug && i.surah === Number(m[2]) && i.citedAyah === Number(m[3]));
  expect(found.length, `one ${named} in /api/v1/iltifat`).toBe(1);
  return found[0];
}

/** Word locations in reading order. */
const byLocation = (a: Marked, b: Marked) => {
  const [x, y] = [a.location, b.location].map((l) => l.split(":").map(Number));
  return x[0] - y[0] || x[1] - y[1] || x[2] - y[2] || a.side.localeCompare(b.side);
};
export const listOf = (s: string | undefined) =>
  (s ?? "")
    .split(",")
    .map((w) => w.trim())
    .filter(Boolean);
const sides = (from: string | undefined, to: string | undefined): Marked[] =>
  [...listOf(from).map((location) => ({ location, side: "from" as const })), ...listOf(to).map((location) => ({ location, side: "to" as const }))].sort(byLocation);
const sameMarks = (a: unknown, b: Marked[]) => Array.isArray(a) && JSON.stringify([...(a as Marked[])].sort(byLocation)) === JSON.stringify(b);

let pool: Pool | undefined;
const database = () =>
  (pool ??= new Pool({ connectionString: testDatabase(Number(process.env.PORT)).url, max: 2, idleTimeoutMillis: 1_000, allowExitOnIdle: true }));

/**
 * Save Iltifat `id` as the Admin, as the database holds it now but with
 * `marked` as its Marked Words. Its fields and version are read from the
 * `iltifat` table, as features/site/steps/iltifat-editor.steps.ts reads them,
 * never from the API's read: the build's data cache can outlive a run's
 * database, so a read made before this run's first save may be an older one.
 */
async function saveMarks(id: number, marked: Marked[]) {
  const { rows } = await database().query(`select reason, ayah_from, ayah_to, disputed, version from iltifat where id = $1`, [id]);
  expect(rows.length, `Iltifat ${id} in the database`).toBe(1);
  const r = rows[0];
  const res = await fetch(`${baseURL()}/api/v1/iltifat/${id}`, {
    method: "PUT",
    headers: { "content-type": "application/json", origin: baseURL(), cookie: await admin() },
    body: JSON.stringify({ base: Number(r.version), reason: r.reason, ayahFrom: Number(r.ayah_from), ayahTo: Number(r.ayah_to), disputed: r.disputed === true, markedWords: marked }),
  });
  expect(res.status, `Iltifat ${id} is saved with its Marked Words (${(await res.text()).slice(0, 200)})`).toBe(200);
}

/** Give the named Iltifat these Marked Words, and every other Iltifat none. */
async function onlyThese(wanted: Map<string, Marked[]>) {
  const byId = new Map<number, Marked[]>();
  for (const [named, marked] of wanted) byId.set((await answeredNamed(named)).id, marked);
  // One save first, so that the read the rest compare against is this database's, refreshed by the save.
  const first = (await everyAnswered())[0].id;
  await saveMarks(first, byId.get(first) ?? []);
  for (const i of await everyAnswered()) {
    const marked = byId.get(i.id) ?? [];
    if (!sameMarks(i.markedWords, marked)) await saveMarks(i.id, marked);
  }
}

// ---------------------------------------------------------------- what a scenario noted

interface Tints {
  from: string;
  to: string;
}
interface Noted {
  /** How the editor draws a Word card no side holds. */
  unmarked?: string;
  /** The tints the editor drew its marked Word cards in. */
  editor?: Tints;
  /** The tints each Iltifat page drew its Marked Words in, in the order seen. */
  pages: Tints[];
  /** The last entry an Iltifat page step looked at, with its Marked Words. */
  entry?: { locator: Locator; marked: Marked[] };
}
const noted = new WeakMap<Reading, Noted>();
const notesOf = (reading: Reading): Noted => {
  if (!noted.has(reading)) noted.set(reading, { pages: [] });
  return noted.get(reading)!;
};

// ---------------------------------------------------------------- drawing and speaking

/** The colour `el` is drawn in, its own background over all those behind it, as `rgb(r, g, b)`. */
export const drawnOf = (el: Locator): Promise<string> =>
  el.evaluate((el, src) => {
    for (const a of document.getAnimations()) if (a instanceof CSSTransition) a.finish();
    const drawn = new Function(`return (${src})`)() as (el: Element) => { behind: string };
    return drawn(el).behind;
  }, DRAWN);

/** A Word's letters with its marks taken out and the dagger alif written as an alif, to compare two spellings. */
export const lettersOf = (word: string) => word.replace(/ٰ/g, "ا").replace(/[ً-ٟۖ-ۭـ]/g, "");

/** "from He", "to You": a Word's side as a screen reader hears it, spaces aside. */
const saying = (said: string) => new RegExp(said.trim().split(/\s+/).join("\\s+"), "i");
/** Any side of any person. */
const ANY_SIDE = /\b(from|to)\s+(He|We|You)\b/i;

// ---------------------------------------------------------------- arranging

Given("only these Iltifat have Marked Words:", async ({}, table: DataTable) => {
  await onlyThese(new Map(table.hashes().map((row) => [row.Iltifat, sides(row.from, row.to)])));
});

Given("no Iltifat has Marked Words", async () => {
  await onlyThese(new Map());
});

Given("the Word at 17:1:13 is the Word the issue names, بَارَكْنَا", async () => {
  expect(lettersOf(sourceWord("17:1:13").uthmani), "the letters of the Word at 17:1:13").toBe(lettersOf("بَارَكْنَا"));
});

Then(/^the API answers the (.+ cited at \S+) with the "from" Words (.+) and the "to" Words (.+)$/, async ({}, named: string, from: string, to: string) => {
  const marked = (await answeredNamed(named)).markedWords;
  expect(Array.isArray(marked) ? [...marked].sort(byLocation) : marked, `the ${named}'s Marked Words`).toEqual(sides(from, to));
});

// ---------------------------------------------------------------- an Iltifat page's entry

/** The entry on the Iltifat page that holds the named Iltifat. */
async function entryOf(page: Page, named: string): Promise<Locator> {
  const fragment = `iltifat-${(await answeredNamed(named)).id}`;
  const entry = page.locator("main article").filter({ has: page.locator(`[id="${fragment}"]`) }).or(page.locator(`main article[id="${fragment}"]`));
  await expect(entry, `the entry of the ${named}`).toHaveCount(1);
  return entry;
}
/** The element of `entry` that shows the Word at `location`, in the Script on screen. */
export const wordIn = (entry: Locator, location: string) => entry.locator(`[lang="ar"] [data-location="${location}"]`).filter({ visible: true });

/** Which Words of the Arabic on screen in `entry`'s elements are drawn on a background of their own, by their Word locations, sorted. */
export const tintedIn = (entry: Locator) =>
  entry.evaluateAll((elements) => {
    const seen = new Set<string>();
    for (const element of elements) {
      for (const el of Array.from(element.querySelectorAll<HTMLElement>('[lang="ar"] *'))) {
        if (el.getClientRects().length === 0) continue;
        const bg = getComputedStyle(el).backgroundColor;
        if (bg === "transparent" || /^rgba\(.*,\s*0\)$/.test(bg)) continue;
        seen.add(el.closest("[data-location]")?.getAttribute("data-location") ?? `an element <${el.tagName.toLowerCase()}> of no Word`);
      }
    }
    return [...seen].sort();
  });

/** The elements of `entry`, outside its Arabic, whose text is just a key's "From He", "To We" and so on: their texts. */
const keyTextsIn = (entry: Locator) =>
  entry.evaluate((article) =>
    Array.from(article.querySelectorAll<HTMLElement>("*"))
      .filter((el) => !el.closest('[lang="ar"]') && el.getClientRects().length > 0)
      .map((el) => (el.textContent ?? "").replace(/\s+/g, " ").trim())
      .filter((t) => /^(from|to) (He|We|You)$/i.test(t)),
  );

/** The colours of the swatches beside the key's `label` in `entry`: the element whose text is just the label, its descendants and its textless siblings. */
const swatchesBeside = (entry: Locator, label: string) =>
  entry.evaluate(
    (article, [label, src]) => {
      for (const a of document.getAnimations()) if (a instanceof CSSTransition) a.finish();
      const drawn = new Function(`return (${src})`)() as (el: Element) => { behind: string };
      const squash = (s: string) => s.replace(/\s+/g, " ").trim().toLowerCase();
      const items = Array.from(article.querySelectorAll<HTMLElement>("*")).filter(
        (el) => !el.closest('[lang="ar"]') && el.getClientRects().length > 0 && squash(el.textContent ?? "") === squash(label),
      );
      // The innermost elements holding just the label.
      const innermost = items.filter((el) => !items.some((other) => other !== el && el.contains(other)));
      const colours = new Set<string>();
      for (const item of innermost) {
        const near = [item, ...Array.from(item.querySelectorAll("*")), ...Array.from(item.parentElement?.children ?? []).filter((s) => s !== item && !(s.textContent ?? "").trim())];
        for (const el of near) {
          const bg = getComputedStyle(el).backgroundColor;
          if (bg === "transparent" || /^rgba\(.*,\s*0\)$/.test(bg)) continue;
          colours.add(drawn(el).behind);
        }
      }
      return { found: innermost.length, colours: [...colours] };
    },
    [label, DRAWN] as const,
  );

Then(
  /^the entry of the (.+ cited at \S+) tints its "from" Words (.+) in one colour and its "to" Words (.+) in another, and no other Word$/,
  async ({ reader, reading }, named: string, from: string, to: string) => {
    const page = reader.page;
    const entry = await entryOf(page, named);
    const marked = sides(from, to);
    for (const m of marked) await expect(wordIn(entry, m.location), `the Word at ${m.location} in the entry, on screen`).toHaveCount(1);
    await expect.poll(() => tintedIn(entry), { message: "the Words of the entry drawn on a tint" }).toEqual(marked.map((m) => m.location).sort());
    const tintOf = async (side: Side) => {
      const colours = new Set<string>();
      for (const m of marked.filter((x) => x.side === side)) colours.add(await drawnOf(wordIn(entry, m.location)));
      expect([...colours].length, `the "${side}" Words are drawn in one tint`).toBe(1);
      return [...colours][0];
    };
    const tints = { from: await tintOf("from"), to: await tintOf("to") };
    expect(tints.from, 'the "from" tint and the "to" tint').not.toBe(tints.to);
    const behind = await drawnOf(entry.locator('[lang="ar"]').filter({ visible: true }).first());
    expect([tints.from, tints.to], "tints drawn on the entry's own background").not.toContain(behind);
    notesOf(reading).pages.push(tints);
    notesOf(reading).entry = { locator: entry, marked };
  },
);

const theEntry = (reading: Reading) => {
  const e = notesOf(reading).entry;
  if (!e) throw new Error("no entry looked at yet in this scenario");
  return e;
};
const pageTints = (reading: Reading) => {
  const t = notesOf(reading).pages.at(-1);
  if (!t) throw new Error("no Iltifat page's tints noted yet in this scenario");
  return t;
};

Then(/^that entry's key shows "(.+)" beside a swatch of the "from" tint and "(.+)" beside a swatch of the "to" tint$/, async ({ reading }, fromLabel: string, toLabel: string) => {
  const { locator } = theEntry(reading);
  const tints = pageTints(reading);
  for (const [label, tint] of [
    [fromLabel, tints.from],
    [toLabel, tints.to],
  ]) {
    const { found, colours } = await swatchesBeside(locator, label);
    expect(found, `the key's "${label}", outside the entry's Arabic`).toBeGreaterThan(0);
    expect(colours, `the swatch beside "${label}"`).toContain(tint);
  }
});

Then("that entry's key shows a swatch of each tint", async ({ reading }) => {
  const { locator } = theEntry(reading);
  const tints = pageTints(reading);
  const labels = await keyTextsIn(locator);
  expect(labels.length, "the key's two sides, outside the entry's Arabic").toBeGreaterThanOrEqual(2);
  const colours = new Set<string>();
  for (const label of labels) for (const c of (await swatchesBeside(locator, label)).colours) colours.add(c);
  expect([...colours], "the key's swatches").toEqual(expect.arrayContaining([tints.from, tints.to]));
});

Then(
  /^a screen reader hears the Word at (\S+) as its Arabic and "([^"]+)"(?:, and the Word at (\S+) as its Arabic and "([^"]+)")?$/,
  async ({ reader, reading }, location: string, said: string, location2?: string, said2?: string) => {
    const { locator } = theEntry(reading);
    // The Arabic of the reader's Script: a signed-in Admin's Script is the one synced to the Account (#70).
    const script: Script = (await reader.page.evaluate(() => document.documentElement.dataset.script)) === "indopak" ? "indopak" : "uthmani";
    for (const [loc, words] of [[location, said], ...(location2 ? [[location2, said2!]] : [])]) {
      const heard = await wordIn(locator, loc).ariaSnapshot();
      expect(lettersOf(heard), `a screen reader hears the Word at ${loc}'s Arabic`).toContain(lettersOf(scriptText(loc, script)));
      expect(heard, `a screen reader hears the Word at ${loc}'s side`).toMatch(saying(words));
    }
  },
);

Then("no other entry on the page tints a Word or shows a key", async ({ reader, reading }) => {
  const { locator } = theEntry(reading);
  const handle = await locator.elementHandle();
  const others = await reader.page.locator("main article").evaluateAll(
    (articles, entry) =>
      articles
        .filter((a) => a !== entry)
        .flatMap((article) => {
          const tinted = Array.from(article.querySelectorAll<HTMLElement>('[lang="ar"] *')).some((el) => {
            if (el.getClientRects().length === 0) return false;
            const bg = getComputedStyle(el).backgroundColor;
            return !(bg === "transparent" || /^rgba\(.*,\s*0\)$/.test(bg));
          });
          const key = Array.from(article.querySelectorAll<HTMLElement>("*")).some(
            (el) => !el.closest('[lang="ar"]') && /^(from|to) (He|We|You)$/i.test((el.textContent ?? "").replace(/\s+/g, " ").trim()),
          );
          return tinted || key ? [article.id || article.querySelector('[id^="iltifat-"]')?.id || "an entry"] : [];
        }),
    handle,
  );
  expect(others, "other entries with a tinted Word or a key").toEqual([]);
});

Then(
  /^the entry of the (.+ cited at \S+) is shown plain: no Word tinted, no key, and nothing said of a "from" or "to" side$/,
  async ({ reader }, named: string) => {
    const entry = await entryOf(reader.page, named);
    await expect(entry.locator('[lang="ar"]').filter({ visible: true }).first(), "the entry's Arabic").toBeVisible();
    expect(await tintedIn(entry), "the entry's Words drawn on a tint").toEqual([]);
    expect(await keyTextsIn(entry), "the entry's key").toEqual([]);
    const arabic = entry.locator('[lang="ar"]').filter({ visible: true });
    for (let k = 0; k < (await arabic.count()); k++) {
      expect(await arabic.nth(k).ariaSnapshot(), "what a screen reader hears of the entry's Arabic").not.toMatch(ANY_SIDE);
    }
  },
);

Then('the two pages drew their "from" Words in one tint and their "to" Words in the other', async ({ reading }) => {
  const pages = notesOf(reading).pages;
  expect(pages.length, "two Iltifat pages' tints noted").toBeGreaterThanOrEqual(2);
  expect(new Set(pages.map((t) => t.from)).size, 'the "from" tints of the pages').toBe(1);
  expect(new Set(pages.map((t) => t.to)).size, 'the "to" tints of the pages').toBe(1);
});

Then("each Marked Word shows its {script} text", async ({ reading }, script: Script) => {
  const { locator, marked } = theEntry(reading);
  for (const m of marked) {
    const text = ((await wordIn(locator, m.location).textContent()) ?? "").trim();
    expect(text, `the Word at ${m.location} on screen`).toBe(scriptText(m.location, script).trim());
  }
});

Then("the Arabic of each Marked Word contrasts with its tint by at least 4.5 to 1", async ({ reading }) => {
  const { locator, marked } = theEntry(reading);
  const low: string[] = [];
  for (const m of marked) {
    const word = wordIn(locator, m.location);
    const [ink, tint] = [await word.evaluate((el) => getComputedStyle(el).color), await drawnOf(word)];
    const ratio = contrast(ink, tint);
    if (ratio < 4.5) low.push(`${m.location} (${m.side}): ${ink} on ${tint} is ${ratio.toFixed(2)} to 1`);
  }
  expect(low, "Marked Words whose Arabic is hard to read on their tint").toEqual([]);
});

Then(/^no Word of (\d+):(\d+) says it is a "from" or "to" Word$/, async ({ reader }, s: string, a: string) => {
  const words = await reader.page.evaluate(
    (prefix) => Array.from(document.querySelectorAll("[id]")).map((el) => el.id).filter((id) => id.startsWith(prefix) && /^\d+:\d+:\d+$/.test(id)),
    `${s}:${a}:`,
  );
  expect(words.length, `the Words of ${s}:${a} on the page`).toBeGreaterThan(0);
  const saying: string[] = [];
  for (const id of words) {
    const heard = await reader.page.locator(`[id="${id}"]`).ariaSnapshot();
    if (ANY_SIDE.test(heard)) saying.push(id);
  }
  expect(saying, `Words of ${s}:${a} said to be a "from" or "to" Word`).toEqual([]);
});

// ---------------------------------------------------------------- the editor's Word cards

export const cardAt = (page: Page, location: string) => page.locator(`[id="${location}"]`);

/** How the editor draws each of its Word cards now, by Word location. */
export async function drawnCards(page: Page): Promise<Map<string, string>> {
  await expect(page.locator('[id$=":1"]').first(), "a Word card in the editor").toBeAttached();
  await page.mouse.move(0, 0);
  const drawn = await page.evaluate((src) => {
    for (const a of document.getAnimations()) if (a instanceof CSSTransition) a.finish();
    const drawn = new Function(`return (${src})`)() as (el: Element) => { behind: string };
    return Array.from(document.querySelectorAll("[id]"))
      .filter((el) => /^\d+:\d+:\d+$/.test(el.id))
      .map((el) => [el.id, drawn(el).behind] as const);
  }, DRAWN);
  return new Map(drawn);
}

When("I note how the editor draws its Word cards unmarked", async ({ reader, reading }) => {
  const drawn = [...(await drawnCards(reader.page)).values()];
  expect(new Set(drawn).size, "every Word card of the editor drawn alike before any is marked").toBe(1);
  notesOf(reading).unmarked = drawn[0];
});

When("I choose the editor's side {string}", async ({ reader }, side: string) => {
  const radio = reader.page.getByRole("radio", { name: side, exact: true });
  await expect(radio, `the editor's side "${side}"`).toHaveCount(1);
  await radio.check();
  await expect(radio).toBeChecked();
});

When(/^I tap the Word cards at (.+)$/, async ({ reader }, locations: string) => {
  for (const location of listOf(locations)) await cardAt(reader.page, location).click();
});

Then(
  /^the editor draws the Word cards at (.+) in the "from" tint and the Word cards at (.+) in the "to" tint, and no other Word card tinted$/,
  async ({ reader, reading }, from: string, to: string) => {
    const notes = notesOf(reading);
    const marked = sides(from, to);
    let tints: Tints | undefined;
    await expect(async () => {
      const drawn = await drawnCards(reader.page);
      const colourOf = (side: Side) => [...new Set(marked.filter((m) => m.side === side).map((m) => drawn.get(m.location)))];
      const [f, t] = [colourOf("from"), colourOf("to")];
      expect(f.length, 'the "from" Word cards drawn in one colour').toBe(1);
      expect(t.length, 'the "to" Word cards drawn in one colour').toBe(1);
      tints = { from: f[0]!, to: t[0]! };
      expect({ from: f[0], to: t[0] }, "the marked Word cards' tints").toEqual(notes.editor ?? { from: f[0], to: t[0] });
      const unmarked = notes.unmarked ?? [...drawn.entries()].find(([l]) => !marked.some((m) => m.location === l))?.[1];
      expect([f[0], t[0]], "marked Word cards drawn unlike an unmarked one").not.toContain(unmarked);
      const others = [...drawn.entries()].filter(([l, c]) => !marked.some((m) => m.location === l) && c !== unmarked).map(([l, c]) => `${l}: ${c}`);
      expect(others, `Word cards no side holds, drawn unlike an unmarked one (${unmarked})`).toEqual([]);
    }).toPass({ timeout: 5_000 });
    notes.editor ??= tints;
  },
);

Then('the "from" tint and the "to" tint are two colours, neither of them how an unmarked Word card is drawn', async ({ reading }) => {
  const { editor, unmarked } = notesOf(reading);
  expect(editor, "the editor's tints, noted").toBeDefined();
  expect(editor!.from, 'the "from" tint').not.toBe(editor!.to);
  expect([editor!.from, editor!.to], "the tints").not.toContain(unmarked);
});

Then(/^a screen reader hears the Word cards at (.+) as "([^"]+)" and the Word cards at (.+) as "([^"]+)"$/, async ({ reader }, a: string, saidA: string, b: string, saidB: string) => {
  for (const [locations, said] of [
    [a, saidA],
    [b, saidB],
  ]) {
    for (const location of listOf(locations)) {
      expect(await cardAt(reader.page, location).ariaSnapshot(), `what a screen reader hears of the Word card at ${location}`).toMatch(saying(said));
    }
  }
});

Then("a screen reader hears nothing of a side on the Word card at {location}", async ({ reader }, location: string) => {
  await expect.poll(() => cardAt(reader.page, location).ariaSnapshot(), { message: `what a screen reader hears of the Word card at ${location}` }).not.toMatch(ANY_SIDE);
});

Then('the page drew the "from" Words in the editor\'s "from" tint and the "to" Words in its "to" tint', async ({ reading }) => {
  const { editor } = notesOf(reading);
  expect(editor, "the editor's tints, noted").toBeDefined();
  expect(pageTints(reading), "the Iltifat page's tints").toEqual({ from: editor!.from, to: editor!.to });
});

// ---------------------------------------------------------------- the editor's list

const notYetMarked = (page: Page) =>
  page.getByRole("checkbox", { name: "Not yet marked", exact: true }).or(page.getByRole("button", { name: "Not yet marked", exact: true }));

/** The list's links on screen, in order: their addresses and texts. */
const listedLinks = (page: Page) =>
  page.locator('main a[href^="/admin/iltifat/"]').evaluateAll((links) =>
    links
      .filter((a) => a.getClientRects().length > 0)
      .map((a) => ({ href: a.getAttribute("href") ?? "", text: (a.textContent ?? "").replace(/\s+/g, " ").trim() })),
  );

/** Every Iltifat in the list's order: by Iltifat direction, in the overview's order, then Quran order. */
async function listOrder(): Promise<Answered[]> {
  const all = await everyAnswered();
  const quranOrder = (a: Answered, b: Answered) => a.surah - b.surah || a.ayahFrom - b.ayahFrom || a.ayahTo - b.ayahTo || a.citedAyah - b.citedAyah || a.id - b.id;
  return DIRECTIONS.flatMap((d) => all.filter((i) => i.direction === d.slug).sort(quranOrder));
}
const addressOf = (i: Answered) => `/admin/iltifat/${i.id}`;
const namedIds = async (table: DataTable) => new Set(await Promise.all(table.hashes().map(async (row) => (await answeredNamed(row.Iltifat)).id)));

Then('the list\'s links to these Iltifat say "Marked", and no other link does:', async ({ reader }, table: DataTable) => {
  const marked = await namedIds(table);
  await expect(reader.page.locator('main a[href^="/admin/iltifat/"]').first(), "a link of the list").toBeVisible();
  const links = await listedLinks(reader.page);
  const wrong = (await listOrder()).flatMap((i) => {
    const link = links.find((l) => l.href === addressOf(i));
    if (!link) return [`no link to Iltifat ${i.id}`];
    const says = /\bMarked\b/.test(link.text);
    return says === marked.has(i.id) ? [] : [`${link.text} (${says ? "says" : "does not say"} "Marked")`];
  });
  expect(wrong, 'links saying "Marked" that should not, or not saying it that should').toEqual([]);
});

When(/^I turn the list's "Not yet marked" filter (on|off)$/, async ({ reader }, state: string) => {
  const control = notYetMarked(reader.page);
  await expect(control, 'the list\'s "Not yet marked" filter').toHaveCount(1);
  const role = await control.evaluate((el) => (el instanceof HTMLInputElement && el.type === "checkbox") || el.getAttribute("role") === "checkbox" ? "checkbox" : "button");
  if (role === "checkbox") {
    if (state === "on") await control.check();
    else await control.uncheck();
  } else {
    if ((await control.getAttribute("aria-pressed")) !== String(state === "on")) await control.click();
    await expect(control).toHaveAttribute("aria-pressed", String(state === "on"));
  }
});

Then("the list links to every Iltifat but these, in the list's order:", async ({ reader }, table: DataTable) => {
  const left = await namedIds(table);
  const expected = (await listOrder()).filter((i) => !left.has(i.id)).map(addressOf);
  await expect.poll(async () => (await listedLinks(reader.page)).map((l) => l.href), { message: "the list's links on screen" }).toEqual(expected);
});

Then("the list links to every Iltifat, in the list's order", async ({ reader }) => {
  const expected = (await listOrder()).map(addressOf);
  await expect.poll(async () => (await listedLinks(reader.page)).map((l) => l.href), { message: "the list's links on screen" }).toEqual(expected);
});
