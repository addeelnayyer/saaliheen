// Steps for Supplication spans on the Supplications page (#270, ADR 0063):
// features/site/supplications-page-spans.feature, and the Supplication
// editor sending them back unchanged (features/site/supplication-editor.feature).
//
// Each scenario first says, through the API, which Supplications have spans
// (PUT /api/v1/supplications/{id} as the Admin, the save features/api/
// supplication-spans.feature specifies), every other Supplication that has
// any being saved with none. A save's fields and version, and which
// Supplications have spans, are read from the run's Postgres, never from the
// API's read: the build's data cache can outlive a run's database. Arabic
// comes from the sources; labels from the feature.
//
// The page's shape these steps expect: each entry an <article> in <main>,
// its heading linking to its first Ayah (`/{lang}/{s}#{s}:{a}`); each piece
// of a span an element with role "group", named in the reader's Language,
// inside the entry's Arabic (an element with lang="ar"), in each Script the
// page holds, the one shown being the reader's Script.

import { expect, type Locator, type Page } from "@playwright/test";
import type { DataTable } from "playwright-bdd";
import { Pool } from "pg";
import { ADMIN_EMAIL } from "../admin-settings";
import { testDatabase } from "../test-database";
import { shot, sourceWords } from "../support";
import { parseRun } from "../supplications-data";
import { Given, Then, When, resolveColor, type Reading, type SharedAyahs } from "./fixtures";
import { contrast, DRAWN } from "./phrase-colours.steps";
import { scriptText, type Script } from "./reader";

// ---------------------------------------------------------------- the API, as the Admin

interface Span {
  from: string;
  to: string;
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

let pool: Pool | undefined;
const database = () =>
  (pool ??= new Pool({ connectionString: testDatabase(Number(process.env.PORT)).url, max: 2, idleTimeoutMillis: 1_000, allowExitOnIdle: true }));

const COLUMNS = `id, surah, ayah_from as "ayahFrom", ayah_to as "ayahTo", speaker_id as "speakerId", openings::text[] as openings, kind, version`;

/** The id of the Supplication whose run is `run`, exactly. */
export async function idAt(run: string): Promise<number> {
  const { surah, ayahFrom, ayahTo } = parseRun(run);
  const { rows } = await database().query(`select id from supplication where surah = $1 and ayah_from = $2 and ayah_to = $3`, [surah, ayahFrom, ayahTo]);
  expect(rows.length, `one Supplication at ${run} in the database`).toBe(1);
  return Number(rows[0].id);
}

/** Save Supplication `id` as the Admin, as the database holds it now but with `spans`, and `change` made. */
async function saveSpans(id: number, spans: Span[], change: { openings?: string[] } = {}) {
  const { rows } = await database().query(`select ${COLUMNS} from supplication where id = $1`, [id]);
  expect(rows.length, `Supplication ${id} in the database`).toBe(1);
  const r = rows[0];
  const res = await fetch(`${baseURL()}/api/v1/supplications/${id}`, {
    method: "PUT",
    headers: { "content-type": "application/json", origin: baseURL(), cookie: await admin() },
    body: JSON.stringify({
      base: Number(r.version),
      surah: Number(r.surah),
      ayahFrom: Number(r.ayahFrom),
      ayahTo: Number(r.ayahTo),
      speakerId: r.speakerId,
      openings: r.openings,
      kind: r.kind,
      spans,
      ...change,
    }),
  });
  expect(res.status, `Supplication ${id} is saved with its spans (${(await res.text()).slice(0, 200)})`).toBe(200);
}

/** The number of Words of Ayah `s:a`, from the sources. */
const wordCount = (ayah: string) => sourceWords(Number(ayah.split(":")[0])).filter((w) => w.location.startsWith(`${ayah}:`)).length;
/** "2:127:8", or "2:127:last" for an Ayah's last Word. */
const locationOf = (written: string) => {
  const m = written.trim().match(/^(\d+:\d+):last$/);
  return m ? `${m[1]}:${wordCount(m[1])}` : written.trim();
};
/** Spans as a scenario writes them: "2:127:8–2:128:5, 2:129:3–2:129:6". */
export const spansIn = (written: string): Span[] =>
  written
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      const [from, to] = s.split("–");
      if (to === undefined) throw new Error(`not a span: "${s}"`);
      return { from: locationOf(from), to: locationOf(to) };
    });

/** Give the Supplications named these spans, and every other that has any none. */
async function onlyThese(wanted: Map<string, Span[]>) {
  const byId = new Map<number, Span[]>();
  for (const [run, spans] of wanted) byId.set(await idAt(run), spans);
  const { rows } = await database().query(`select distinct supplication_id as id from supplication_span`);
  for (const { id } of rows) if (!byId.has(Number(id))) await saveSpans(Number(id), []);
  for (const [id, spans] of byId) await saveSpans(id, spans);
}

Given("only these Supplications have spans:", async ({}, table: DataTable) => {
  await onlyThese(new Map(table.hashes().map((row) => [row.Supplication, spansIn(row.spans)])));
});

Given("no Supplication has spans", async () => {
  await onlyThese(new Map());
});

// ---------------------------------------------------------------- the Supplication editor (features/site/supplication-editor.feature)

/** The spans of Supplication `id` as the database holds them, in reading order. */
async function spansInDatabase(id: number): Promise<Span[]> {
  const { rows } = await database().query(
    `select s.surah || ':' || p.from_ayah || ':' || p.from_word as "from", s.surah || ':' || p.to_ayah || ':' || p.to_word as "to"
       from supplication_span p join supplication s on s.id = p.supplication_id
      where p.supplication_id = $1 order by p.from_ayah, p.from_word`,
    [id],
  );
  return rows;
}

/** The Supplications a scenario gave spans, by run, with their Openings before it did. */
const openingsBefore = new WeakMap<Reading, Map<string, string[]>>();

Given("the Supplication at {word} has the spans {string}, saved through the API", async ({ reading }, run: string, spans: string) => {
  const id = await idAt(run);
  const before = openingsBefore.get(reading) ?? new Map<string, string[]>();
  openingsBefore.set(reading, before);
  if (!before.has(run)) before.set(run, (await database().query(`select openings::text[] as openings from supplication where id = $1`, [id])).rows[0].openings);
  await saveSpans(id, spansIn(spans));
});

Then("the Supplication at {word} in the database has the spans {string}", async ({}, run: string, spans: string) => {
  const id = await idAt(run);
  await expect.poll(() => spansInDatabase(id), { message: `the spans of the Supplication at ${run}` }).toEqual(spansIn(spans));
});

When("the Supplication at {word} is put back as it was, with no spans", async ({ reading }, run: string) => {
  const openings = openingsBefore.get(reading)?.get(run);
  if (!openings) throw new Error(`the Supplication at ${run} was given no spans in this scenario`);
  await saveSpans(await idAt(run), [], { openings });
});

// ---------------------------------------------------------------- an entry and its pieces

interface Noted {
  /** The last entry a step looked at, and the pieces it drew. */
  entry?: { locator: Locator; label: string };
}
const noted = new WeakMap<Reading, Noted>();
const notesOf = (reading: Reading): Noted => {
  if (!noted.has(reading)) noted.set(reading, {});
  return noted.get(reading)!;
};
const theEntry = (reading: Reading) => {
  const e = notesOf(reading).entry;
  if (!e) throw new Error("no entry looked at yet in this scenario");
  return e;
};

/** The entry on the Supplications page whose heading links to Ayah `s:a`. */
async function entryAt(page: Page, { surah, from }: SharedAyahs): Promise<Locator> {
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  const entry = page.locator("main article").filter({ has: page.locator(`h2 a[href$="#${surah}:${from}"], h3 a[href$="#${surah}:${from}"]`) });
  await expect(entry, `the entry at ${surah}:${from}`).toHaveCount(1);
  return entry;
}
/** The pieces a reader sees in `entry`: its groups named `label`, in the Script on screen. */
const piecesIn = (entry: Locator, label: string) => entry.locator('[lang="ar"]').filter({ visible: true }).getByRole("group", { name: label, exact: true });

/** The reader's Script, as <html> carries it. */
const scriptOf = async (page: Page): Promise<Script> => ((await page.evaluate(() => document.documentElement.dataset.script)) === "indopak" ? "indopak" : "uthmani");

/** The Arabic of the Words `from` to `to` of one Ayah, in `script`, one space between Words. */
function arabicOf(from: string, to: string, script: Script): string {
  const [s, a, w1] = from.split(":").map(Number);
  const w2 = Number(to.split(":")[2]);
  expect(to.split(":").slice(0, 2).join(":"), `a piece from ${from} lies in one Ayah`).toBe(`${s}:${a}`);
  return Array.from({ length: w2 - w1 + 1 }, (_, n) => scriptText(`${s}:${a}:${w1 + n}`, script).trim()).join(" ");
}

const squash = (s: string) => s.replace(/\s+/g, " ").trim();

Then(
  "the entry at {ayahs} draws these pieces as groups named {string}, each exactly its Words' Arabic, and nothing else:",
  async ({ reader, reading }, run: SharedAyahs, label: string, table: DataTable) => {
    const entry = await entryAt(reader.page, run);
    const script = await scriptOf(reader.page);
    const expected = table.hashes().map((row) => arabicOf(locationOf(row.from), locationOf(row.to), script));
    const pieces = piecesIn(entry, label);
    await expect(pieces, `the groups named "${label}" in the entry`).toHaveCount(expected.length);
    expect((await pieces.allTextContents()).map((t) => t.trim()), "the text of each group, in reading order").toEqual(expected);
    // Each piece's Words are written one space apart, so the spaces are inside the group, tinted with them.
    for (const text of await pieces.allTextContents()) expect(text, "a group's text, one space between Words").toBe(squash(text));
    notesOf(reading).entry = { locator: entry, label };
  },
);

/** The colour drawn behind `el`, every background from the root composited, as `rgb(r, g, b)`. */
const drawnOf = (el: Locator): Promise<string> =>
  el.evaluate((el, src) => {
    for (const a of document.getAnimations()) if (a instanceof CSSTransition) a.finish();
    const drawn = new Function(`return (${src})`)() as (el: Element) => { behind: string };
    return drawn(el).behind;
  }, DRAWN);

/** The tint of each piece of the entry last looked at. */
async function tintsOf(reading: Reading): Promise<{ pieces: Locator; tints: string[] }> {
  const { locator, label } = theEntry(reading);
  const pieces = piecesIn(locator, label);
  const tints: string[] = [];
  for (let n = 0; n < (await pieces.count()); n++) tints.push(await drawnOf(pieces.nth(n)));
  return { pieces, tints };
}

Then("each piece of that entry is drawn on one opaque tint, the spaces between its Words included", async ({ reading }) => {
  const { pieces, tints } = await tintsOf(reading);
  expect(new Set(tints).size, "the tints of the entry's pieces").toBe(1);
  for (let n = 0; n < (await pieces.count()); n++) {
    const own = await pieces.nth(n).evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(own, `piece ${n + 1}'s own background, opaque`).toMatch(/^rgb\(\d+, \d+, \d+\)$/);
    expect(await pieces.nth(n).evaluate((el) => el.children.length), `piece ${n + 1} is one element, its Words and spaces its own text`).toBe(0);
  }
});

Then("that tint is not the page's paper, an Iltifat tint or the Allah gold", async ({ reader, reading }) => {
  const { locator } = theEntry(reading);
  const [tint] = (await tintsOf(reading)).tints;
  const paper = await drawnOf(locator.locator('[lang="ar"]').filter({ visible: true }).first());
  const others = await Promise.all(["var(--iltifat-from)", "var(--iltifat-to)", "var(--allah)"].map((v) => resolveColor(reader.page, v)));
  expect([paper, ...others], "the paper, the Iltifat tints and the Allah gold").not.toContain(tint);
});

Then("the Arabic of each piece contrasts with its tint by at least 4.5 to 1", async ({ reading }) => {
  const { pieces, tints } = await tintsOf(reading);
  const low: string[] = [];
  for (let n = 0; n < tints.length; n++) {
    const ink = await pieces.nth(n).evaluate((el) => getComputedStyle(el).color);
    const ratio = contrast(ink, tints[n]);
    if (ratio < 4.5) low.push(`piece ${n + 1}: ${ink} on ${tints[n]} is ${ratio.toFixed(2)} to 1`);
  }
  expect(low, "pieces whose Arabic is hard to read on their tint").toEqual([]);
});

Then("no Ayah translation of that entry is marked, and no Word outside a piece is tinted or dimmed", async ({ reading }) => {
  const { locator, label } = theEntry(reading);
  const found = await locator.evaluate((article, label) => {
    const clear = (bg: string) => bg === "transparent" || /^rgba\(.*,\s*0\)$/.test(bg);
    const drawn = (el: Element) => (el as HTMLElement).getClientRects().length > 0;
    const groups = Array.from(article.querySelectorAll('[role="group"]')).filter((g) => g.getAttribute("aria-label") === label);
    const inPiece = (el: Element) => groups.some((g) => g === el || g.contains(el));
    const wrong: string[] = [];
    for (const el of Array.from(article.querySelectorAll("*")).filter(drawn)) {
      const style = getComputedStyle(el);
      const arabic = el.closest('[lang="ar"]');
      if (!arabic && groups.includes(el)) wrong.push(`a group outside the Arabic: "${el.textContent}"`);
      if (arabic && !inPiece(el) && !clear(style.backgroundColor)) wrong.push(`a tinted element outside a piece: "${el.textContent}"`);
      if (arabic && (Number(style.opacity) < 1 || style.filter !== "none")) wrong.push(`a dimmed element: "${el.textContent}"`);
    }
    for (const p of Array.from(article.querySelectorAll('[lang="ar"]')).filter(drawn)) {
      const ink = getComputedStyle(p).color;
      for (const g of groups.filter((g) => p.contains(g))) if (getComputedStyle(g).color !== ink) wrong.push("a piece in another ink than the Words around it");
    }
    return wrong;
  }, label);
  expect(found, "marks outside the pieces, or Words dimmed").toEqual([]);
});

/** The entries of the page with a group named `label`, by their heading's link. */
const entriesWithGroups = (page: Page, label: string, except?: Locator) =>
  (except ? except.elementHandle() : Promise.resolve(null)).then((skip) =>
    page.locator("main article").evaluateAll(
      (articles, [label, skip]) =>
        articles
          .filter((a) => a !== skip)
          .filter((a) => Array.from(a.querySelectorAll('[role="group"]')).some((g) => g.getAttribute("aria-label") === label))
          .map((a) => a.querySelector("h2 a, h3 a")?.getAttribute("href") ?? "an entry"),
      [label, skip] as const,
    ),
  );

Then("no other entry on the page draws a group named {string}", async ({ reader, reading }, label: string) => {
  expect(await entriesWithGroups(reader.page, label, theEntry(reading).locator), `other entries with a group named "${label}"`).toEqual([]);
});

Then("no entry on the page draws a group named {string}", async ({ reader }, label: string) => {
  await expect(reader.page.getByRole("heading", { level: 1 })).toBeVisible();
  expect(await entriesWithGroups(reader.page, label), `entries with a group named "${label}"`).toEqual([]);
});

Then("no Word on the Supplications page is tinted", async ({ reader }) => {
  const tinted = await reader.page.locator('main article [lang="ar"] *').evaluateAll((els) =>
    els
      .filter((el) => (el as HTMLElement).getClientRects().length > 0)
      .filter((el) => !/^(transparent|rgba\(.*,\s*0\))$/.test(getComputedStyle(el).backgroundColor))
      .map((el) => el.textContent ?? ""),
  );
  expect(tinted, "tinted Arabic on the Supplications page").toEqual([]);
});

Then("the page draws no group named {string}", async ({ reader }, label: string) => {
  await expect(reader.page.locator("main")).toBeVisible();
  await expect(reader.page.getByRole("group", { name: label, exact: true }), `groups named "${label}"`).toHaveCount(0);
});

When("I save a screenshot of that entry {string}", async ({ reading }, name: string) => {
  const { locator } = theEntry(reading);
  await locator.scrollIntoViewIfNeeded();
  await shot(locator, name);
});
