// Steps for the Iltifat editor (#142). The Iltifat are read from the run's own
// Postgres each time a step needs them, never from a cache kept across steps,
// because these scenarios save them. Arabic comes from the sources; direction
// names, runs and messages from the feature (the issue's words). Things are
// found by role, label and visible text.
//
// The editor's shape these steps expect (PROPOSED, #142 stage 1):
// - /admin/iltifat: an <h1> "Iltifat"; in <main>, each Iltifat direction an
//   <h2> naming it ("He → We"), followed, before the next <h2>, by one link
//   per Iltifat of that direction, in Quran order, to /admin/iltifat/{id},
//   its text holding the run ("1:2–5", "17:1").
// - /admin/iltifat/{id}: an <h1> holding the direction's name and the saved
//   run; the run's Word cards, each an element whose id is its Word location
//   (`s:a:w`) holding its text in the chosen Script; a text box "Reason",
//   number fields ("spinbutton") "First Ayah" and "Last Ayah", a checkbox
//   "Disputed" and a button "Save"; after a save, "Saved" in a role="status"
//   element; a refused save's message in a role="alert" element; links (or
//   buttons) "Previous Iltifat" and "Next Iltifat"; and, with unsaved
//   changes, the browser's own confirm dialog on following them, and its
//   beforeunload dialog on leaving the page.

import { expect, type Locator, type Page } from "@playwright/test";
import { Pool } from "pg";
import { cardLocations, sourceWords } from "../support";
import { testDatabase } from "../test-database";
import { Given, Then, When, type Reading } from "./fixtures";
import { scriptText, type Script } from "./reader";
import { DIRECTIONS, directionNamed, runOf, type Direction } from "./iltifat";

// ---------------------------------------------------------------- the Iltifat, read fresh

interface Row {
  id: number;
  direction: Direction;
  surah: number;
  ayahFrom: number;
  ayahTo: number;
  cited: number;
  reason: string;
  disputed: boolean;
  version: number;
}

let pool: Pool | undefined;
const database = () =>
  (pool ??= new Pool({ connectionString: testDatabase(Number(process.env.PORT)).url, max: 2, idleTimeoutMillis: 1_000, allowExitOnIdle: true }));

/** Every Iltifat as the database holds it now. */
async function everyRow(): Promise<Row[]> {
  const { rows } = await database().query(`select id, from_person, to_person, surah, ayah_from, ayah_to, cited_ayah, reason, disputed, version from iltifat`);
  return rows.map((r) => ({
    id: Number(r.id),
    direction: DIRECTIONS.find((d) => d.from === r.from_person && d.to === r.to_person)!,
    surah: Number(r.surah),
    ayahFrom: Number(r.ayah_from),
    ayahTo: Number(r.ayah_to),
    cited: Number(r.cited_ayah),
    reason: r.reason,
    disputed: r.disputed === true,
    version: Number(r.version),
  }));
}

const quranOrder = (a: Row, b: Row) => a.surah - b.surah || a.ayahFrom - b.ayahFrom || a.ayahTo - b.ayahTo || a.cited - b.cited || a.id - b.id;

/** The list's order: by Iltifat direction, in the overview's order, then Quran order. */
async function listOrder(): Promise<Row[]> {
  const rows = await everyRow();
  return DIRECTIONS.flatMap((d) => rows.filter((r) => r.direction.slug === d.slug).sort(quranOrder));
}

async function rowAt(name: string, run: string): Promise<Row> {
  const found = (await everyRow()).filter((r) => r.direction.slug === directionNamed(name).slug && runOf(r) === run);
  expect(found.length, `one ${name} Iltifat at ${run} in the database`).toBe(1);
  return found[0];
}
async function rowCitedAt(name: string, ayah: string): Promise<Row> {
  const [s, a] = ayah.split(":").map(Number);
  const found = (await everyRow()).filter((r) => r.direction.slug === directionNamed(name).slug && r.surah === s && r.cited === a);
  expect(found.length, `one ${name} Iltifat cited at ${ayah} in the database`).toBe(1);
  return found[0];
}
async function rowById(id: number): Promise<Row> {
  const found = (await everyRow()).find((r) => r.id === id);
  expect(found, `Iltifat ${id} in the database`).toBeDefined();
  return found!;
}

// ---------------------------------------------------------------- what a scenario remembers

interface EditorState {
  /** The Iltifat as they were when their editor was first opened, by id. */
  opened: Map<number, Row>;
  /** The two tabs of a two-tab scenario. */
  tabs: Page[];
  /** Whether the browser asked to confirm leaving since the last step that watched. */
  asked: boolean;
}
const states = new WeakMap<Reading, EditorState>();
const stateOf = (reading: Reading) => {
  let s = states.get(reading);
  if (!s) states.set(reading, (s = { opened: new Map(), tabs: [], asked: false }));
  return s;
};

const editorAddress = (r: Row) => `/admin/iltifat/${r.id}`;
/** The id of the Iltifat whose editor `page` shows. */
function idOnPage(page: Page): number {
  const m = new URL(page.url()).pathname.match(/^\/admin\/iltifat\/(\d+)$/);
  if (!m) throw new Error(`not on an Iltifat's editor: ${page.url()}`);
  return Number(m[1]);
}

async function openEditor(page: Page, reading: Reading, r: Row) {
  const res = await page.goto(editorAddress(r));
  expect(res?.status(), `the editor of Iltifat ${r.id} is found`).toBe(200);
  if (!stateOf(reading).opened.has(r.id)) stateOf(reading).opened.set(r.id, r);
}

// ---------------------------------------------------------------- the editor's parts

const reasonField = (page: Page) => page.getByRole("textbox", { name: "Reason", exact: true });
const firstAyah = (page: Page) => page.getByRole("spinbutton", { name: "First Ayah", exact: true });
const lastAyah = (page: Page) => page.getByRole("spinbutton", { name: "Last Ayah", exact: true });
const disputedBox = (page: Page) => page.getByRole("checkbox", { name: "Disputed", exact: true });
const control = (page: Page, name: string) =>
  page.getByRole("button", { name, exact: true }).or(page.getByRole("link", { name, exact: true }));
const heading = (page: Page) => page.getByRole("heading", { level: 1 });
const squash = (s: string) => s.replace(/\s+/g, " ").trim();

/** Each <h2> of the list's <main> with the admin links that follow it, before the next. */
async function listedByHeading(page: Page): Promise<{ heading: string; links: { href: string; text: string }[] }[]> {
  await expect(page.locator("main h2").first(), "a direction heading on the list").toBeVisible();
  return page.locator("main").first().evaluate((main) => {
    const squash = (s: string) => s.replace(/\s+/g, " ").trim();
    const groups: { heading: string; links: { href: string; text: string }[] }[] = [];
    for (const el of Array.from(main.querySelectorAll("h2, a[href^='/admin/iltifat/']"))) {
      if (el.tagName === "H2") groups.push({ heading: squash(el.textContent ?? ""), links: [] });
      else groups.at(-1)?.links.push({ href: el.getAttribute("href") ?? "", text: squash(el.textContent ?? "") });
    }
    return groups;
  });
}

/** Watch for the browser's own dialogs on `page`: confirm and beforeunload, answered `accept` or not. */
function answerDialogs(page: Page, reading: Reading, accept: boolean) {
  stateOf(reading).asked = false;
  page.removeAllListeners("dialog");
  page.on("dialog", async (dialog) => {
    if (dialog.type() === "confirm" || dialog.type() === "beforeunload") stateOf(reading).asked = true;
    if (accept) await dialog.accept();
    else await dialog.dismiss();
  });
}

// ---------------------------------------------------------------- AC-1

Then("the page shows no Iltifat editor", async ({ reader }) => {
  await expect(reasonField(reader.page)).toHaveCount(0);
  await expect(reader.page.getByRole("button", { name: "Save", exact: true })).toHaveCount(0);
  await expect(reader.page.locator("main a[href^='/admin/iltifat/']")).toHaveCount(0);
});

// ---------------------------------------------------------------- AC-2: the list

When("I follow the Admin home's link {string}", async ({ reader }, name: string) => {
  await reader.page.goto("/admin");
  const link = reader.page.getByRole("link", { name, exact: true });
  await expect(link, `the Admin home links to "${name}"`).toHaveAttribute("href", `/admin/${name.toLowerCase()}`);
  await link.click();
});

When("I open the Iltifat editor's list", async ({ reader }) => {
  const res = await reader.page.goto("/admin/iltifat");
  expect(res?.status(), "the Iltifat editor's list is found").toBe(200);
});

Then("the Iltifat editor's list is headed {string}", async ({ reader }, title: string) => {
  await expect(heading(reader.page)).toHaveText(title);
});

Then("the Iltifat editor's list shows these Iltifat directions, in this order, each heading its own Iltifat:", async ({ reader }, table) => {
  const wanted = (table.hashes() as { direction: string }[]).map((r) => r.direction);
  expect(wanted, "the feature's directions are the overview's").toEqual(DIRECTIONS.map((d) => d.name));
  const groups = await listedByHeading(reader.page);
  expect(groups.map((g) => g.heading)).toEqual(wanted);
  for (const g of groups) expect(g.links.length, `Iltifat under ${g.heading}`).toBeGreaterThan(0);
});

Then("under each direction the list links to every Iltifat of that direction in the database, in Quran order, each link naming its run", async ({ reader }) => {
  const groups = await listedByHeading(reader.page);
  const rows = await listOrder();
  for (const d of DIRECTIONS) {
    const expected = rows.filter((r) => r.direction.slug === d.slug);
    const group = groups.find((g) => g.heading === d.name);
    expect(group?.links.map((l) => l.href), `the ${d.name} links`).toEqual(expected.map(editorAddress));
    const unnamed = expected.filter((r, k) => !group!.links[k].text.includes(runOf(r))).map(runOf);
    expect(unnamed, `${d.name} links not naming their run`).toEqual([]);
  }
  expect(groups.flatMap((g) => g.links).length, "every Iltifat once").toBe(rows.length);
});

Then("every link of the Iltifat editor's list opens an editor headed with that Iltifat's direction and run", async ({ reader }) => {
  const rows = await listOrder();
  const hrefs = (await listedByHeading(reader.page)).flatMap((g) => g.links.map((l) => l.href));
  expect(hrefs, "the list's links").toEqual(rows.map(editorAddress));
  const problems: string[] = [];
  const request = reader.page.context().request;
  for (let k = 0; k < rows.length; k += 8) {
    await Promise.all(
      rows.slice(k, k + 8).map(async (r) => {
        const res = await request.get(editorAddress(r), { maxRedirects: 0 });
        const html = await res.text();
        const h1 = squash((html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)?.[1] ?? "").replace(/<!--[\s\S]*?-->/g, "").replace(/<[^>]+>/g, " "));
        if (res.status() !== 200 || !h1.includes(r.direction.name) || !h1.includes(runOf(r))) problems.push(`${editorAddress(r)}: ${res.status()} "${h1}"`);
      }),
    );
  }
  expect(problems.slice(0, 10), `${problems.length} editors not opened as expected`).toEqual([]);
});

When(/^I follow the list's link to the (.+) Iltifat at (\S+)$/, async ({ reader, reading }, name: string, run: string) => {
  const r = await rowAt(name, run);
  await reader.page.locator(`main a[href="${editorAddress(r)}"]`).click();
  await expect(reader.page).toHaveURL((url) => url.pathname === editorAddress(r));
  stateOf(reading).opened.set(r.id, r);
});

// ---------------------------------------------------------------- an Iltifat's editor

When(/^I open the editor of the (.+) Iltifat at (\S+?)( in two tabs)?$/, async ({ reader, reading }, name: string, run: string, two?: string) => {
  const r = await rowAt(name, run);
  await openEditor(reader.page, reading, r);
  if (two) {
    const second = await reader.page.context().newPage();
    await openEditor(second, reading, r);
    stateOf(reading).tabs = [reader.page, second];
  }
});

When(/^I open the editor of the (first|last) Iltifat of the list$/, async ({ reader, reading }, which: string) => {
  const rows = await listOrder();
  await openEditor(reader.page, reading, which === "first" ? rows[0] : rows.at(-1)!);
});

When(/^I open the editor of the last (.+) Iltifat of the list$/, async ({ reader, reading }, name: string) => {
  const rows = (await listOrder()).filter((r) => r.direction.slug === directionNamed(name).slug);
  await openEditor(reader.page, reading, rows.at(-1)!);
});

When(/^I reload the editor of the (.+) Iltifat cited at (\S+)$/, async ({ reader, reading }, name: string, ayah: string) => {
  await openEditor(reader.page, reading, await rowCitedAt(name, ayah));
});

Then("the editor is headed with the Iltifat direction {string} and the run {string}", async ({ reader }, name: string, run: string) => {
  await expect(heading(reader.page)).toContainText(name);
  await expect(heading(reader.page)).toContainText(run);
});

Then(/^the editor's Word cards are exactly the Word locations of Ayahs (\d+):(\d+) to \1:(\d+), in reading order$/, async ({ reader }, s: string, from: string, to: string) => {
  const wanted = sourceWords(Number(s))
    .filter((w) => {
      const a = Number(w.location.split(":")[1]);
      return a >= Number(from) && a <= Number(to);
    })
    .map((w) => w.location);
  await expect.poll(() => cardLocations(reader.page), { message: "the editor's Word cards" }).toEqual(wanted);
});

Then("every Word card of the editor shows its {script} text and not its {script} text", async ({ reader }, shown: Script, hidden: Script) => {
  const r = await rowById(idOnPage(reader.page));
  const locations = sourceWords(r.surah)
    .filter((w) => {
      const a = Number(w.location.split(":")[1]);
      return a >= r.ayahFrom && a <= r.ayahTo;
    })
    .map((w) => w.location);
  await expect.poll(() => cardLocations(reader.page)).toEqual(locations);
  const wrong: string[] = [];
  for (const location of locations) {
    const text = squash(await reader.page.locator(`[id="${location}"]`).innerText());
    const [want, unwanted] = [squash(scriptText(location, shown)), squash(scriptText(location, hidden))];
    if (!text.includes(want) || (want !== unwanted && text.includes(unwanted))) wrong.push(location);
  }
  expect(wrong, `Word cards not in ${shown}`).toEqual([]);
});

Then("the editor's Reason holds that Iltifat's reason from the database", async ({ reader }) => {
  await expect(reasonField(reader.page)).toHaveValue((await rowById(idOnPage(reader.page))).reason);
});

Then("the editor's Reason holds {string}", async ({ reader }, reason: string) => {
  await expect(reasonField(reader.page)).toHaveValue(reason);
});

Then("the editor's run is First Ayah {int} and Last Ayah {int}", async ({ reader }, from: number, to: number) => {
  await expect(firstAyah(reader.page)).toHaveValue(String(from));
  await expect(lastAyah(reader.page)).toHaveValue(String(to));
});

Then("the editor's Disputed checkbox is not checked", async ({ reader }) => {
  await expect(disputedBox(reader.page)).not.toBeChecked();
});

// ---------------------------------------------------------------- editing and saving

Given("a reader has opened {string}", async ({ reader }, address: string) => {
  const context = await reader.newContext();
  const page = await context.newPage();
  const res = await page.goto(address);
  expect(res?.status(), `${address} is served`).toBe(200);
  await page.close();
});

When("I replace the editor's Reason with {string}", async ({ reader }, reason: string) => {
  await reasonField(reader.page).fill(reason);
});

When("I set the editor's run to First Ayah {int} and Last Ayah {int}", async ({ reader }, from: number, to: number) => {
  await firstAyah(reader.page).fill(String(from));
  await lastAyah(reader.page).fill(String(to));
});

When("I tick the editor's Disputed checkbox", async ({ reader }) => {
  await disputedBox(reader.page).click();
});

When("I press the editor's {string}", async ({ reader }, name: string) => {
  await reader.page.getByRole("button", { name, exact: true }).click();
});

Then("the editor says {string}", async ({ reader }, text: string) => {
  await expect(reader.page.getByRole("status").filter({ hasText: text })).toBeVisible();
});

Then("the editor shows the alert {string}", async ({ reader }, text: string) => {
  await expect(reader.page.getByRole("alert").filter({ hasText: text })).toBeVisible();
});

When(/^in the (first|second) tab I replace the editor's Reason with "(.*)" and press "(.+)"$/, async ({ reading }, which: string, reason: string, name: string) => {
  const page = stateOf(reading).tabs[which === "first" ? 0 : 1];
  await reasonField(page).fill(reason);
  await page.getByRole("button", { name, exact: true }).click();
});

Then(/^the (first|second) tab's editor says "(.+)"$/, async ({ reading }, which: string, text: string) => {
  await expect(stateOf(reading).tabs[which === "first" ? 0 : 1].getByRole("status").filter({ hasText: text })).toBeVisible();
});

Then(/^the (first|second) tab's editor shows the alert "(.+)"$/, async ({ reading }, which: string, text: string) => {
  await expect(stateOf(reading).tabs[which === "first" ? 0 : 1].getByRole("alert").filter({ hasText: text })).toBeVisible();
});

// ---------------------------------------------------------------- the database after

Then(/^the (.+) Iltifat at (\S+) in the database is unchanged$/, async ({ reading }, name: string, run: string) => {
  const now = await rowAt(name, run);
  expect(now, `the ${name} Iltifat at ${run}`).toEqual(stateOf(reading).opened.get(now.id));
});

Then(/^the (.+) Iltifat at (\S+) in the database has the reason "(.*)"$/, async ({}, name: string, run: string, reason: string) => {
  expect((await rowAt(name, run)).reason).toBe(reason);
});

Then(/^the (.+) Iltifat cited at (\S+) in the database has the reason "(.*)" and is Disputed$/, async ({}, name: string, ayah: string, reason: string) => {
  expect(await rowCitedAt(name, ayah)).toMatchObject({ reason, disputed: true });
});

Then(/^the (.+) Iltifat cited at (\S+) in the database does not have the reason "(.*)"$/, async ({}, name: string, ayah: string, reason: string) => {
  expect((await rowCitedAt(name, ayah)).reason).not.toBe(reason);
});

// ---------------------------------------------------------------- what readers see after a save

/** The element of Iltifat `r` on its direction page, holding its reason. */
const blockOf = (page: Page, r: Row): Locator => page.locator(`main [id="iltifat-${r.id}"]`);

Then(/^the entry of the (.+) Iltifat cited at (\S+) shows the reason "(.+)"$/, async ({ reader }, name: string, ayah: string, reason: string) => {
  await expect(blockOf(reader.page, await rowCitedAt(name, ayah))).toContainText(reason);
});

Then(/^the entry of the (.+) Iltifat cited at (\S+) shows a Disputed tag$/, async ({ reader }, name: string, ayah: string) => {
  await expect(blockOf(reader.page, await rowCitedAt(name, ayah))).toContainText("Disputed");
});

Then(/^the entry of the (.+) Iltifat cited at (\S+) is headed with the run "(.+)"$/, async ({ reader }, name: string, ayah: string, run: string) => {
  const r = await rowCitedAt(name, ayah);
  const entry = reader.page.locator("main article").filter({ has: reader.page.locator(`[id="iltifat-${r.id}"]`) }).or(reader.page.locator(`main article[id="iltifat-${r.id}"]`));
  await expect(entry.locator("h2, h3").first()).toContainText(run);
});

Then(/^Ayah (\S+)'s chip for the (.+) Iltifat cited there (says|does not say) Disputed$/, async ({ reader }, ayah: string, name: string, verb: string) => {
  const r = await rowCitedAt(name, ayah);
  const chip = reader.page.locator(`main section[id="${ayah}"] a[href="/en/iltifat/${r.direction.slug}#iltifat-${r.id}"]`);
  await expect(chip, `Ayah ${ayah}'s ${name} chip`).toBeVisible();
  if (verb === "says") await expect(chip).toContainText("Disputed");
  else await expect(chip).not.toContainText(/disputed/i);
});

// ---------------------------------------------------------------- AC-9: next, previous, unsaved changes

Then("the editor offers no {string}", async ({ reader }, name: string) => {
  await expect(reasonField(reader.page), "the editor is shown").toBeVisible();
  await expect(control(reader.page, name)).toHaveCount(0);
});

When(/^I follow the editor's "(.+?)"(?:, choosing to (stay|leave) when asked)?$/, async ({ reader, reading }, name: string, choice?: string) => {
  const page = reader.page;
  answerDialogs(page, reading, choice !== "stay");
  const before = page.url();
  await control(page, name).click();
  if (choice === "stay") await page.waitForTimeout(500);
  else await expect(page).not.toHaveURL(before);
});

When("I reload the page, choosing to stay when asked", async ({ reader, reading }) => {
  answerDialogs(reader.page, reading, false);
  await reader.page.reload({ timeout: 3_000 }).catch(() => undefined);
});

Then(/^the browser (asked|did not ask) me to confirm leaving$/, async ({ reading }, verb: string) => {
  expect(stateOf(reading).asked, "the browser's own confirmation").toBe(verb === "asked");
});

const listPlace = async (page: Page) => {
  const rows = await listOrder();
  return { rows, at: rows.findIndex((r) => r.id === idOnPage(page)) };
};

Then(/^the editor is the list's (first|second) Iltifat$/, async ({ reader }, which: string) => {
  await expect(reasonField(reader.page)).toBeVisible();
  expect((await listPlace(reader.page)).at).toBe(which === "first" ? 0 : 1);
});

Then(/^the editor is the list's first (.+) Iltifat$/, async ({ reader }, name: string) => {
  await expect(reasonField(reader.page)).toBeVisible();
  const first = (await listOrder()).find((r) => r.direction.slug === directionNamed(name).slug)!;
  expect(idOnPage(reader.page)).toBe(first.id);
});

Then(/^the editor is the (.+) Iltifat at (\S+)$/, async ({ reader }, name: string, run: string) => {
  expect(idOnPage(reader.page)).toBe((await rowAt(name, run)).id);
});

Then(/^the editor is the Iltifat after the (.+) Iltifat at (\S+) in the list$/, async ({ reader }, name: string, run: string) => {
  await expect(reasonField(reader.page)).toBeVisible();
  const { rows } = await listPlace(reader.page);
  const k = rows.findIndex((r) => r.id === rowsIdAt(rows, name, run));
  expect(idOnPage(reader.page)).toBe(rows[k + 1].id);
});
const rowsIdAt = (rows: Row[], name: string, run: string) => rows.find((r) => r.direction.slug === directionNamed(name).slug && runOf(r) === run)?.id;

// ---------------------------------------------------------------- AC-10

Then("the page offers no control to add, create, delete or remove an Iltifat", async ({ reader }) => {
  const page = reader.page;
  await expect(page.locator("main").first()).toBeVisible();
  const names = /\b(add|new|create|delete|remove)\b/i;
  await expect(page.getByRole("button", { name: names })).toHaveCount(0);
  await expect(page.getByRole("link", { name: names })).toHaveCount(0);
});

// ---------------------------------------------------------------- AC-11: phone width, keyboard

Then("nothing on the page reaches past the screen's width", async ({ reader }) => {
  await expect(reader.page.locator("main").first()).toBeVisible();
  const { scroll, width } = await reader.page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, width: window.innerWidth }));
  expect(scroll, "the page's width against the screen's").toBeLessThanOrEqual(width);
});

Then("the editor's Word cards, Reason, First Ayah, Last Ayah, Disputed and Save all lie within the screen's width", async ({ reader }) => {
  const page = reader.page;
  const width = page.viewportSize()!.width;
  const cards = (await cardLocations(page)).map((l) => page.locator(`[id="${l}"]`));
  const parts = [...cards, reasonField(page), firstAyah(page), lastAyah(page), disputedBox(page), page.getByRole("button", { name: "Save", exact: true })];
  expect(cards.length, "Word cards on the editor").toBeGreaterThan(0);
  for (const part of parts) {
    const box = await part.boundingBox();
    expect(box, "a part of the editor is drawn").not.toBeNull();
    expect(box!.x, "starts on screen").toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width, "ends on screen").toBeLessThanOrEqual(width + 0.5);
  }
});

When("I tap the editor's Reason and replace it with {string}", async ({ reader }, reason: string) => {
  await reasonField(reader.page).tap();
  await reasonField(reader.page).fill(reason);
});

When("I tap the editor's {string}", async ({ reader }, name: string) => {
  await reader.page.getByRole("button", { name, exact: true }).tap();
});

When("I press Tab from the top of the page", async ({ reader }) => {
  await reader.page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await reader.page.keyboard.press("Tab");
});

/** Which of the editor's fields has the focus, if any. */
async function focusedField(page: Page): Promise<string | null> {
  const fields: [string, Locator][] = [
    ["Reason", reasonField(page)],
    ["First Ayah", firstAyah(page)],
    ["Last Ayah", lastAyah(page)],
    ["Disputed", disputedBox(page)],
    ["Save", page.getByRole("button", { name: "Save", exact: true })],
  ];
  for (const [name, field] of fields) if (await field.evaluate((el) => el === document.activeElement).catch(() => false)) return name;
  return null;
}

const hasFocusRing = (page: Page) =>
  page.evaluate(() => {
    const el = document.activeElement as HTMLElement;
    const style = getComputedStyle(el);
    return (style.outlineStyle !== "none" && parseFloat(style.outlineWidth) > 0) || style.boxShadow !== "none";
  });

Then("pressing Tab reaches Reason, First Ayah, Last Ayah, Disputed and Save in that order, each showing a focus ring", async ({ reader }) => {
  const page = reader.page;
  const reached: string[] = [];
  const ringless: string[] = [];
  for (let k = 0; k < 80 && reached.length < 5; k++) {
    const field = await focusedField(page);
    if (field && !reached.includes(field)) {
      reached.push(field);
      if (!(await hasFocusRing(page))) ringless.push(field);
    }
    await page.keyboard.press("Tab");
  }
  expect(reached, "the fields Tab reaches, in order").toEqual(["Reason", "First Ayah", "Last Ayah", "Disputed", "Save"]);
  expect(ringless, "fields with no focus ring").toEqual([]);
});

When(/^I press Tab until the editor's (Reason|Disputed checkbox|"Save") has the focus$/, async ({ reader }, which: string) => {
  const want = which === "Disputed checkbox" ? "Disputed" : which.replace(/"/g, "");
  for (let k = 0; k < 80; k++) {
    if ((await focusedField(reader.page)) === want) return;
    await reader.page.keyboard.press("Tab");
  }
  throw new Error(`Tab never reached the editor's ${want}`);
});

When("I select all and type {string}", async ({ reader }, text: string) => {
  await reader.page.keyboard.press("ControlOrMeta+a");
  await reader.page.keyboard.type(text);
});
