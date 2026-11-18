// The Passage editor (#44): an Admin edits a Surah's Passages at /admin/<Surah>.
// Steps find each Passage as the region named "Passage <range>", its controls
// by their names, and the Unpublished changes bar as the region of that name.
// Expected Passages and Passage titles come from what Neon holds: the run's
// Postgres as ../passages-in-the-test-database.ts arranges it (#171), or as a
// step changed it. Arabic and Ayah translations come from the sources; none is
// typed. On a phone every action is a tap; on a desktop, a click. The run's
// Postgres is written only to arrange a precondition (another Admin's
// Publish, a title changed), and each Surah so changed is put back when the
// scenario ends.

import { expect, type Locator, type Page } from "@playwright/test";
import { Pool } from "pg";
import { ayahTranslation, PHONE, type Language } from "../support";
import { ADMIN_EMAIL } from "../admin-settings";
import { joined, neonPassages, neonPhrases, putSurahBack, written, NEON_CHANGE, NEON_PHRASED, NEON_VERSION } from "../passages-in-the-test-database";
import { testDatabase } from "../test-database";
import { passagesOf, type FilePassage } from "./passages";
import { ayahText, closeSettings, openSettings, scriptButton, type Script } from "./reader";
import { testSignIn } from "./admin.steps";
import { Given, OTHER, Then, When, type Reader, type Reading } from "./fixtures";

// ------------------------------------------------------------------ locators

/** Every Passage the editor shows, in page order. */
export const passages = (page: Page) => page.getByRole("region", { name: /^Passage \d/ });
/** The Passage the editor shows as `range` (83–88, or 88). */
export const passage = (page: Page, range: string) => page.getByRole("region", { name: `Passage ${range}`, exact: true });
const LANGUAGE_NAME: Record<Language, string> = { en: "English", ur: "Urdu" };
const titleField = (scope: Locator, lang: Language) =>
  scope.getByRole("textbox", { name: `${LANGUAGE_NAME[lang]} Passage title`, exact: true });
const bar = (page: Page) => page.getByRole("region", { name: "Unpublished changes", exact: true });
const barButton = (page: Page, name: string) => bar(page).getByRole("button", { name, exact: true });
const MOVE = { earlier: "Start one Ayah earlier", later: "Start one Ayah later" } as const;

/** Tap on a phone, click on a desktop. */
export const act = (reading: Reading, control: Locator) => (reading.viewport === "phone" ? control.tap() : control.click());

/** The ranges of the Passages the editor shows, in order, from their regions' names. */
export const shownRanges = (page: Page) =>
  passages(page).evaluateAll((regions) =>
    regions.map((r) => {
      const name = r.getAttribute("aria-label") ?? document.getElementById(r.getAttribute("aria-labelledby") ?? "")?.textContent ?? "";
      return name.trim().replace(/^Passage /, "");
    }),
  );

/** The text a person sees in the page's main area, whitespace collapsed. */
export const shownText = (page: Page) =>
  page.locator("main").first().evaluate((m) => (m as HTMLElement).innerText.replace(/\s+/g, " "));
export const collapse = (s: string) => s.replace(/\s+/g, " ").trim();

// ---------------------------------------------------------------- Neon's copy

export function surahOf(reading: Reading): number {
  if (!reading.surah) throw new Error("no Passage editor opened yet in this scenario");
  return reading.surah;
}

/** The Passages Neon holds for Surah `surah`: as arranged, unless a step changed them in this scenario. */
function neonOf(reading: Reading, surah: number): FilePassage[] {
  return (reading.neon ?? neonPassages()).filter((p) => p.surah_no === surah);
}

export function neonPassage(reading: Reading, range: string): FilePassage {
  const found = neonOf(reading, surahOf(reading)).find((p) => written(p) === range);
  if (!found) throw new Error(`Neon has no Passage ${range} in Surah ${surahOf(reading)}`);
  return found;
}

// --------------------------------------------------------- signing in, opening

/** Sign in as the Admin in a fresh browser context made with `options`, and look at it from now on. */
async function signInFresh(reader: Reader, options: Parameters<Reader["newContext"]>[1] = {}) {
  const context = await reader.newContext(undefined, options);
  const page = await context.newPage();
  await testSignIn(page, ADMIN_EMAIL, "GitHub");
  reader.page = page;
  return page;
}

Given("I am signed in as the Admin on a 390×844 phone with a touch screen", async ({ reader, reading }) => {
  await signInFresh(reader, { viewport: PHONE, hasTouch: true, isMobile: true });
  reading.viewport = "phone";
});

Given("I am signed in as the Admin in a browser that chose the {script} Script", async ({ reader }, script: Script) => {
  const context = await reader.newContext();
  const page = await context.newPage();
  // Signing in brings the Account's Script to the browser (#70), so the
  // Script is chosen once signed in, after the page has applied the Account's.
  await testSignIn(page, ADMIN_EMAIL, "GitHub");
  await page.goto("/en/18", { waitUntil: "networkidle" });
  await openSettings(page);
  await scriptButton(page, script).click();
  await expect(scriptButton(page, script)).toHaveAttribute("aria-pressed", "true");
  await closeSettings(page);
  reader.page = page;
});

async function openEditor(reader: Reader, reading: Reading, surah: number, base = "") {
  const res = await reader.page.goto(`${base}/admin/${surah}`);
  expect(res?.status(), `/admin/${surah} is found`).toBe(200);
  reading.surah = surah;
  await expect(passages(reader.page).first(), "the Passage editor shows its Passages").toBeVisible();
}

When("I open the Passage editor for Surah {int}", async ({ reader, reading }, surah: number) => {
  await openEditor(reader, reading, surah);
});

When("I open the Passage editor for Surah {int} on that server", async ({ reader, reading }, surah: number) => {
  if (!reading.server) throw new Error("no second server started in this scenario");
  await openEditor(reader, reading, surah, reading.server);
});

When("I sign in on that server as the Admin {string} via GitHub", async ({ reader, reading }, email: string) => {
  if (!reading.server) throw new Error("no second server started in this scenario");
  await testSignIn(reader.page, email, "GitHub", reading.server);
});

// ------------------------------------------------------------ Neon's rows

let pool: Pool | undefined;
/** The run's Postgres, which the production build reads as DATABASE_URL. */
export const neonDatabase = () =>
  (pool ??= new Pool({ connectionString: testDatabase(Number(process.env.PORT)).url, max: 2, idleTimeoutMillis: 1_000, allowExitOnIdle: true }));

/** Fail, saying so, while the run's database has no #171 table `table` (stage 2 writes the migration). */
export async function expectTable(table: "passage" | "phrase" | "passage_revision") {
  const { rows } = await neonDatabase().query<{ t: string | null }>(`select to_regclass($1)::text as t`, [`public.${table}`]);
  expect(rows[0].t, `the run's database holds #171's ${table} table`).toBe(table);
}

/** Surah `surah`'s Passages as the `passage` table holds them, in order. */
export async function passageRows(surah: number): Promise<FilePassage[]> {
  await expectTable("passage");
  const { rows } = await neonDatabase().query<{ ayah_from: number; ayah_till: number; title_en: string; title_ur: string }>(
    `select ayah_from, ayah_till, title_en, title_ur from passage where surah = $1 order by ayah_from`,
    [surah],
  );
  return rows.map((r) => ({ surah_no: surah, ayah_from: Number(r.ayah_from), ayah_till: Number(r.ayah_till), title_en: r.title_en, title_ur: r.title_ur }));
}

/** Surah `surah`'s Passage version: its latest Passage revision's. */
export async function versionOf(surah: number): Promise<number> {
  await expectTable("passage_revision");
  const { rows } = await neonDatabase().query<{ version: number | null }>(`select max(version) as version from passage_revision where surah = $1`, [surah]);
  return Number(rows[0]?.version ?? 0);
}

/** Put Surah `surah` back as arranged (or loaded) when the scenario ends, however it ends. */
function putBackAfter(reader: Reader, surah: number) {
  if (!reader.cleanups.some((c) => (c as { surah?: number }).surah === surah)) {
    reader.cleanups.push(Object.assign(() => putSurahBack(surah), { surah }));
  }
}

Given(
  "the committed Passages have Surah {int}'s Passages {string} and {string}",
  async ({}, surah: number, upper: string, lower: string) => {
    const ranges = passagesOf(surah).map(written);
    expect(ranges).toContain(upper);
    expect(ranges).toContain(lower);
  },
);

Given(
  "Neon holds Surah {int}'s {string} and {string} joined as {string}",
  async ({ reading }, surah: number, upper: string, lower: string, both: string) => {
    expect({ surah, upper, lower, joined: both }, "Surah 18 as passages-in-the-test-database.ts arranges it").toEqual(NEON_CHANGE);
    const held = await passageRows(surah);
    expect(held, `the run's database holds Surah ${surah}'s Passages as arranged`).toEqual(neonPassages().filter((p) => p.surah_no === surah));
    expect(await versionOf(surah), `Surah ${surah}'s Passage version as arranged`).toBe(NEON_VERSION);
    reading.neon = neonPassages();
  },
);

Given("Neon holds Phrases covering Surah {int}'s {word}, which the committed Phrases don't", async ({}, surah: number, range: string) => {
  expect({ surah, covered: range }, "the Phrases passages-in-the-test-database.ts arranges").toEqual({ surah: NEON_PHRASED.surah, covered: NEON_PHRASED.covered });
  await expectTable("phrase");
  const { rows } = await neonDatabase().query<{ first_word: string; last_word: string }>(
    `select first_word, last_word from phrase where surah = $1 order by first_word`,
    [surah],
  );
  const arranged = neonPhrases().filter((p) => p.first.startsWith(`${surah}:`));
  expect(
    rows.map((r) => ({ first: r.first_word, last: r.last_word })).sort((x, y) => x.first.localeCompare(y.first)),
    `the run's database holds Surah ${surah}'s Phrases as arranged`,
  ).toEqual([...arranged].sort((x, y) => x.first.localeCompare(y.first)));
});

Given("Neon holds Surah {int} as arranged, put back when the scenario ends", async ({ reader, reading }, surah: number) => {
  await expectTable("passage_revision");
  await putSurahBack(surah);
  putBackAfter(reader, surah);
  expect(await versionOf(surah), `Surah ${surah}'s Passage version as arranged`).toBe(surah === NEON_CHANGE.surah ? NEON_VERSION : 1);
  reading.neon = neonPassages();
});

/**
 * Passage `range` of Surah `surah` given the Passage titles of `source`
 * straight in the `passage` table, as no page refresh announces. The Surah
 * is put back when the scenario ends.
 */
When("Neon's Surah {int} Passage {word} is given the Passage titles of {word}", async ({ reader, reading }, surah: number, range: string, source: string) => {
  const before = neonOf(reading, surah);
  const target = before.find((p) => written(p) === range);
  const from = before.find((p) => written(p) === source);
  if (!target || !from) throw new Error(`Neon has no Passages ${range} and ${source} in Surah ${surah}`);
  await expectTable("passage");
  putBackAfter(reader, surah);
  const { rowCount } = await neonDatabase().query(`update passage set title_en = $3, title_ur = $4 where surah = $1 and ayah_from = $2`, [
    surah, target.ayah_from, from.title_en, from.title_ur,
  ]);
  expect(rowCount, `the run's database holds Surah ${surah}'s Passage ${range}`).toBe(1);
  reading.neon = (reading.neon ?? neonPassages()).map((p) => (p === target ? { ...p, title_en: from.title_en, title_ur: from.title_ur } : p));
});

/** Who "another Publish" names as its author. */
const ANOTHER_ADMIN = "another-admin-of-issue-171";

/**
 * Another Admin's Publish, as one is written (#171): Surah `surah`'s Passages
 * `upper` and `lower` joined in the `passage` table, and a Passage revision
 * made on the Surah's current version, one version on. Written straight into
 * Postgres, so it refreshes no page. The Surah is put back when the scenario ends.
 */
When(
  "another Admin publishes Surah {int}'s {word} and {word} joined, moving its version on",
  async ({ reader, reading }, surah: number, upper: string, lower: string) => {
    const now = reading.neon ?? neonPassages();
    const after = joined(now, surah, upper, lower);
    const top = now.find((p) => p.surah_no === surah && written(p) === upper)!;
    const below = now.find((p) => p.surah_no === surah && written(p) === lower)!;
    await expectTable("passage_revision");
    putBackAfter(reader, surah);
    const client = await neonDatabase().connect();
    try {
      await client.query("begin");
      const { rows } = await client.query<{ version: number | null }>(`select max(version) as version from passage_revision where surah = $1`, [surah]);
      const base = Number(rows[0]?.version ?? 0);
      await client.query(`update passage set ayah_till = $3 where surah = $1 and ayah_from = $2`, [surah, top.ayah_from, below.ayah_till]);
      await client.query(`delete from passage where surah = $1 and ayah_from = $2`, [surah, below.ayah_from]);
      await client.query(
        `insert into passage_revision (surah, author, created_at, edits, base, version) values ($1, $2, now(), $3::jsonb, $4, $5)`,
        [surah, ANOTHER_ADMIN, JSON.stringify([{ kind: "join", from: below.ayah_from }]), base, base + 1],
      );
      await client.query("commit");
    } catch (error) {
      await client.query("rollback");
      throw error;
    } finally {
      client.release();
    }
    reading.neon = after;
  },
);

Then(
  "Neon holds Surah {int}'s Passages as Neon's, with {string} in place of {string}, at version {int}",
  async ({ reading }, surah: number, by: string, replaced: string, version: number) => {
    const held = await passageRows(surah);
    expect(held.map(written), `the run's database's Surah ${surah} Passages`).toEqual(rangesWith(neonOf(reading, surah).map(written), by, replaced));
    expect(await versionOf(surah), `Surah ${surah}'s Passage version`).toBe(version);
  },
);

// ------------------------------------------------------------- the Passages

/** `ranges` with `replaced` (consecutive, comma-separated) swapped for `by`. */
function rangesWith(ranges: string[], by: string, replaced: string): string[] {
  const old = replaced.split(",").map((s) => s.trim());
  const at = ranges.indexOf(old[0]);
  expect(ranges.slice(at, at + old.length), `Neon has ${replaced} in a row`).toEqual(old);
  return [...ranges.slice(0, at), ...by.split(",").map((s) => s.trim()), ...ranges.slice(at + old.length)];
}

/** Neon's ranges for the open Surah, with `replaced` swapped for `by` when given. */
export function expectedRanges(reading: Reading, by?: string, replaced?: string): string[] {
  const ranges = neonOf(reading, surahOf(reading)).map(written);
  return by === undefined || replaced === undefined ? ranges : rangesWith(ranges, by, replaced);
}

Then("the editor's Passages are Neon's", async ({ reader, reading }) => {
  await expect.poll(() => shownRanges(reader.page), { message: "the editor's Passages" }).toEqual(expectedRanges(reading));
});

Then("the editor's Passages are Neon's, with {string} in place of {string}", async ({ reader, reading }, by: string, replaced: string) => {
  await expect.poll(() => shownRanges(reader.page), { message: "the editor's Passages" }).toEqual(expectedRanges(reading, by, replaced));
});

/** The titles in `range`'s title fields, opening them first (and closing them with Escape) unless they are open. */
async function titlesOf(page: Page, reading: Reading, range: string) {
  const region = passage(page, range);
  const en = titleField(region, "en");
  const wasOpen = await en.isVisible();
  if (!wasOpen) await act(reading, region.getByRole("button", { name: `Edit the Passage titles of ${range}`, exact: true }));
  await expect(en, `${range}'s title fields open`).toBeVisible();
  const titles = { en: await en.inputValue(), ur: await titleField(region, "ur").inputValue() };
  if (!wasOpen) {
    await page.keyboard.press("Escape");
    await expect(en, `${range}'s title fields close`).toBeHidden();
  }
  return titles;
}

Then("{word} has the Passage titles of {word}", async ({ reader, reading }, range: string, source: string) => {
  const from = neonPassage(reading, source);
  expect(await titlesOf(reader.page, reading, range)).toEqual({ en: from.title_en, ur: from.title_ur });
});

Then("{word} has no Passage titles", async ({ reader, reading }, range: string) => {
  expect(await titlesOf(reader.page, reading, range)).toEqual({ en: "", ur: "" });
});

// -------------------------------------------------------------------- retitle

When("I edit the Passage titles of {word}", async ({ reader, reading }, range: string) => {
  const region = passage(reader.page, range);
  await act(reading, region.getByRole("button", { name: `Edit the Passage titles of ${range}`, exact: true }));
  await expect(titleField(region, "en")).toBeVisible();
  await expect(titleField(region, "ur")).toBeVisible();
  // Into the English field, as a person would before typing or pressing Enter there.
  await act(reading, titleField(region, "en"));
});

When("I type the Passage titles of {word} into {word}'s title fields", async ({ reader, reading }, source: string, range: string) => {
  const from = neonPassage(reading, source);
  const region = passage(reader.page, range);
  await titleField(region, "ur").fill(from.title_ur);
  await titleField(region, "en").fill(from.title_en);
});

When("I type the English title of {word} into {word}'s English title field", async ({ reader, reading }, source: string, range: string) => {
  await titleField(passage(reader.page, range), "en").fill(neonPassage(reading, source).title_en);
});

/** An English title exactly `length` characters long, not ending in a space. */
const longTitle = (length: number) => {
  const text = "A long English Passage title that runs on and on ".repeat(Math.ceil(length / 40)).slice(0, length);
  return text.endsWith(" ") ? `${text.slice(0, -1)}s` : text;
};

When("I type an English title of {int} characters into {word}'s title field", async ({ reader }, length: number, range: string) => {
  await titleField(passage(reader.page, range), "en").fill(longTitle(length));
});

When("I clear {word}'s {language} title field", async ({ reader }, range: string, lang: Language) => {
  await titleField(passage(reader.page, range), lang).fill("");
});

When("I press Enter", async ({ reader }) => {
  await reader.page.keyboard.press("Enter");
});

When("I press Escape", async ({ reader }) => {
  await reader.page.keyboard.press("Escape");
});

When("I tap elsewhere on the page", async ({ reader, reading }) => {
  await act(reading, reader.page.getByRole("heading", { level: 1 }).first());
});

Then("{word}'s title fields are closed", async ({ reader }, range: string) => {
  const region = passage(reader.page, range);
  await expect(titleField(region, "en")).toBeHidden();
  await expect(titleField(region, "ur")).toBeHidden();
});

Then("{word}'s title fields are open", async ({ reader }, range: string) => {
  const region = passage(reader.page, range);
  await expect(titleField(region, "en")).toBeVisible();
  await expect(titleField(region, "ur")).toBeVisible();
});

Then("the focus is in {word}'s title fields", async ({ reader }, range: string) => {
  const region = passage(reader.page, range);
  const focused = async () =>
    (await titleField(region, "en").evaluate((e) => e === document.activeElement)) ||
    (await titleField(region, "ur").evaluate((e) => e === document.activeElement));
  await expect.poll(focused, { message: `the focus is in ${range}'s title fields` }).toBe(true);
});

Then(/^(\S+)'s (English|Urdu) title field is (not )?marked as empty$/, async ({ reader }, range: string, name: string, not?: string) => {
  const field = titleField(passage(reader.page, range), name === "Urdu" ? "ur" : "en");
  if (not) await expect(field).not.toHaveAttribute("aria-invalid", "true");
  else await expect(field).toHaveAttribute("aria-invalid", "true");
});

Then("{word}'s Urdu title field runs right to left", async ({ reader }, range: string) => {
  const field = titleField(passage(reader.page, range), "ur");
  await expect.poll(() => field.evaluate((e) => [e.getAttribute("lang"), getComputedStyle(e).direction])).toEqual(["ur", "rtl"]);
});

Then("{word}'s Urdu title field is below its English one", async ({ reader }, range: string) => {
  const region = passage(reader.page, range);
  const en = await titleField(region, "en").boundingBox();
  const ur = await titleField(region, "ur").boundingBox();
  expect(en && ur, "both title fields are laid out").toBeTruthy();
  expect(ur!.y, "the Urdu title field starts below the English one's bottom").toBeGreaterThanOrEqual(en!.y + en!.height - 1);
});

Then(/^(\S+) shows (no )?a warning that its English title will be cut short in the Surah bar$/, async ({ reader }, range: string, no?: string) => {
  const region = passage(reader.page, range);
  if (no) await expect(region).not.toContainText(/cut short in the Surah bar/i);
  else await expect(region.getByText(/cut short in the Surah bar/i)).toBeVisible();
});

Then("{word}'s English title field holds all {int} characters", async ({ reader }, range: string, length: number) => {
  await expect(titleField(passage(reader.page, range), "en")).toHaveValue(longTitle(length));
});

// --------------------------------------------------------- split, join, move

When("I split {word} at Ayah {int}", async ({ reader, reading }, range: string, ayah: number) => {
  await act(reading, passage(reader.page, range).getByRole("button", { name: new RegExp(`New Passage from Ayah ${ayah}$`) }));
});

Then("the ✂︎ New Passage from Ayah {int} control is visible without hovering", async ({ reader }, ayah: number) => {
  const control = reader.page.getByRole("button", { name: new RegExp(`New Passage from Ayah ${ayah}$`) });
  await control.scrollIntoViewIfNeeded();
  await expect(control).toBeVisible();
  const opacity = await control.evaluate((el) => {
    let o = 1;
    for (let e: Element | null = el; e; e = e.parentElement) o *= Number(getComputedStyle(e).opacity);
    return o;
  });
  expect(opacity, "the ✂︎ control is not see-through").toBeGreaterThan(0.1);
});

When("I join {word} with the Passage above", async ({ reader, reading }, range: string) => {
  await act(reading, passage(reader.page, range).getByRole("button", { name: "Join with above", exact: true }));
});

Then("{word} offers no Join with above", async ({ reader }, range: string) => {
  await expect(passage(reader.page, range)).toBeVisible();
  await expect(passage(reader.page, range).getByRole("button", { name: "Join with above", exact: true })).toHaveCount(0);
});

Then("every Passage but the first offers Join with above", async ({ reader, reading }) => {
  const ranges = expectedRanges(reading);
  await expect(reader.page.getByRole("button", { name: "Join with above", exact: true })).toHaveCount(ranges.length - 1);
  for (const range of ranges.slice(1)) {
    await expect(passage(reader.page, range).getByRole("button", { name: "Join with above", exact: true }), range).toHaveCount(1);
  }
});

Then("{word} offers no way to move its start", async ({ reader }, range: string) => {
  const region = passage(reader.page, range);
  await expect(region).toBeVisible();
  for (const name of Object.values(MOVE)) await expect(region.getByRole("button", { name, exact: true }), name).toHaveCount(0);
  await expect(region.getByRole("heading").first()).not.toHaveAttribute("draggable", "true");
});

When(/^I move the start of (\S+) one Ayah (earlier|later)$/, async ({ reader, reading }, range: string, way: "earlier" | "later") => {
  await act(reading, passage(reader.page, range).getByRole("button", { name: MOVE[way], exact: true }));
});

Then(/^moving the start of (\S+) one Ayah (earlier|later) is (disabled|enabled)$/, async ({ reader }, range: string, way: "earlier" | "later", state: string) => {
  const control = passage(reader.page, range).getByRole("button", { name: MOVE[way], exact: true });
  if (state === "disabled") await expect(control).toBeDisabled();
  else await expect(control).toBeEnabled();
});

/** The Ayahs whose gap shows "Start at Ayah <n>" as a drop place a person can see. */
export const dropPlaces = (page: Page) =>
  page
    .getByText(/^Start at Ayah \d+$/)
    .evaluateAll((els) =>
      els.filter((e) => (e as HTMLElement).checkVisibility()).map((e) => Number(e.textContent!.trim().replace("Start at Ayah ", ""))),
    );

When("I start dragging the Passage heading of {word}", async ({ reader }, range: string) => {
  await startDragging(reader.page, range);
});

/** The range of the Passage whose heading each page last started dragging. */
export const draggedRange = new WeakMap<Page, string>();

/** Press on Passage `range`'s heading and start moving it, as a mouse drag does. */
export async function startDragging(page: Page, range: string) {
  draggedRange.set(page, range);
  const heading = passage(page, range).getByRole("heading").first();
  await heading.scrollIntoViewIfNeeded();
  const box = await heading.boundingBox();
  if (!box) throw new Error(`${range}'s Passage heading is not laid out`);
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 8, box.y + box.height / 2 + 24, { steps: 6 });
}

Then("only the gaps before Ayahs {string} are highlighted as drop places", async ({ reader }, list: string) => {
  const expected = list.split(",").map((s) => Number(s.trim()));
  await expect.poll(() => dropPlaces(reader.page), { message: "the drop places shown while dragging" }).toEqual(expected);
});

When("I drop it on the gap before Ayah {int}", async ({ reader }, ayah: number) => {
  const page = reader.page;
  const place = page.getByText(`Start at Ayah ${ayah}`, { exact: true });
  const box = await place.boundingBox();
  if (!box) throw new Error(`no drop place before Ayah ${ayah} is shown`);
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 12 });
  await page.mouse.up();
});

// ------------------------------------------------------------- the Ayahs

/** Ayah `s:a` is in the open Surah; its Arabic and translation are read from the sources. */
function ayahOf(reading: Reading, ayah: string) {
  expect(Number(ayah.split(":")[0]), `${ayah} is in the open Surah`).toBe(surahOf(reading));
  return ayah;
}

Then("Ayah {word} shows its {script} text and not its {script} text", async ({ reader, reading }, ayah: string, shown: Script, hidden: Script) => {
  const [want, unwanted] = [collapse(ayahText(ayahOf(reading, ayah), shown)), collapse(ayahText(ayah, hidden))];
  expect(want, "the two Scripts write this Ayah differently").not.toBe(unwanted);
  await expect.poll(async () => (await shownText(reader.page)).includes(want), { message: `${ayah}'s ${shown} text is shown` }).toBe(true);
  expect((await shownText(reader.page)).includes(unwanted), `${ayah}'s ${hidden} text is not shown`).toBe(false);
});

Then(
  "Ayah {word} shows its {language} Ayah translation and not its {language} one",
  async ({ reader, reading }, ayah: string, lang: Language, other: Language) => {
    expect(other).toBe(OTHER[lang]);
    const [want, unwanted] = [collapse(ayahTranslation(ayahOf(reading, ayah), lang)), collapse(ayahTranslation(ayah, other))];
    await expect.poll(async () => (await shownText(reader.page)).includes(want), { message: `${ayah}'s ${lang} Ayah translation is shown` }).toBe(true);
    expect((await shownText(reader.page)).includes(unwanted), `${ayah}'s ${other} Ayah translation is not shown`).toBe(false);
  },
);

/** One of the editor's switches, "Ayah translation" or "Ayah layout" (#86): a group or radio group of that name. */
export type SwitchName = "Ayah translation" | "Ayah layout";
export const editorSwitch = (scope: Page | Locator, name: SwitchName) =>
  scope.getByRole("group", { name, exact: true }).or(scope.getByRole("radiogroup", { name, exact: true }));

/** A switch's choice named `name`: a radio or a pressable button in it. */
export const switchChoice = (page: Page, group: SwitchName, name: string) => {
  const g = editorSwitch(page, group);
  return g.getByRole("radio", { name, exact: true }).or(g.getByRole("button", { name, exact: true }));
};

/** Whether a switch's choice is chosen: "true" or "false", as aria-checked, aria-pressed or a radio's checked says. */
export const chosen = (choice: Locator) =>
  choice.evaluate((e) => e.getAttribute("aria-checked") ?? e.getAttribute("aria-pressed") ?? String((e as HTMLInputElement).checked));

/** Choose `name` on switch `group`, and wait until the switch shows it chosen. */
export async function choose(reading: Reading, page: Page, group: SwitchName, name: string) {
  const choice = switchChoice(page, group, name);
  await expect(choice, `the ${group} switch offers ${name}`).toBeVisible();
  await act(reading, choice);
  await expect.poll(() => chosen(choice), { message: `${group}: ${name} chosen` }).toBe("true");
}

When("I switch the Ayah translation to {language}", async ({ reader, reading }, lang: Language) => {
  await choose(reading, reader.page, "Ayah translation", LANGUAGE_NAME[lang]);
});

Then("no Word card is shown", async ({ reader }) => {
  await expect(passages(reader.page).first()).toBeVisible();
  const cards = await reader.page.locator("[id]").evaluateAll((els) => els.filter((e) => /^\d+:\d+:\d+$/.test(e.id)).length);
  expect(cards, "elements that are Word cards (id s:a:w)").toBe(0);
});

Then("every Passage's background differs from the next one's and matches the one after that", async ({ reader }) => {
  const backgrounds = await passages(reader.page).evaluateAll((regions) => regions.map((r) => getComputedStyle(r).backgroundColor));
  expect(backgrounds.length).toBeGreaterThan(2);
  const wrong = backgrounds.flatMap((bg, i) => [
    ...(i + 1 < backgrounds.length && bg === backgrounds[i + 1] ? [`Passages ${i + 1} and ${i + 2} share ${bg}`] : []),
    ...(i + 2 < backgrounds.length && bg !== backgrounds[i + 2] ? [`Passages ${i + 1} and ${i + 3} differ`] : []),
  ]);
  expect(wrong).toEqual([]);
});

// ---------------------------------------------------- Unpublished changes bar

Then(/^there (?:is|are) (no|\d+) Unpublished changes?$/, async ({ reader }, count: string) => {
  const n = count === "no" ? 0 : Number(count);
  const text = n === 0 ? /No Unpublished changes/ : new RegExp(`(^|\\D)${n} Unpublished change${n === 1 ? "(?!s)" : "s"}`);
  await expect(bar(reader.page)).toBeVisible();
  await expect(bar(reader.page)).toContainText(text);
});

Then("the summary is {string}", async ({ reader, reading }, message: string) => {
  const toggle = barButton(reader.page, "Summary");
  await expect(toggle, "the bar offers the summary").toBeVisible();
  if ((await toggle.getAttribute("aria-expanded")) !== "true") await act(reading, toggle);
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  const shown = () =>
    bar(reader.page).evaluate((b) => [
      (b as HTMLElement).innerText.replace(/\s+/g, " "),
      ...Array.from(b.querySelectorAll("input, textarea")).map((f) => (f as HTMLInputElement).value),
    ]);
  await expect
    .poll(async () => (await shown()).some((t) => t === message || t.includes(message)), { message: `the summary "${message}" is shown` })
    .toBe(true);
});

Then(/^the bar counts (\d+) (untitled|long titles?)$/, async ({ reader }, count: string, what: string) => {
  const word = what === "untitled" ? "untitled" : "long titles?";
  const n = Number(count);
  if (n === 0) await expect(bar(reader.page)).not.toContainText(new RegExp(`(^|\\D)[1-9]\\d* ${word}\\b`, "i"));
  else await expect(bar(reader.page)).toContainText(new RegExp(`(^|\\D)${n} ${word}\\b`, "i"));
});

Then(/^(Publish|Undo) is (disabled|enabled)$/, async ({ reader }, name: string, state: string) => {
  const control = barButton(reader.page, name);
  if (state === "disabled") await expect(control).toBeDisabled();
  else await expect(control).toBeEnabled();
});

When("I undo", async ({ reader, reading }) => {
  await act(reading, barButton(reader.page, "Undo"));
});

/** What a Publish's confirmation starts with (#171): no link to anything. */
export const CONFIRMED = /^(Allah references )?[Pp]ublished\b/;

Then("I see that the Publish went through", async ({ reader }) => {
  await expect(reader.page.getByText(CONFIRMED).first(), "the page confirms the Publish").toBeVisible({ timeout: 30_000 });
  await expect(reader.page.getByText("Someone published first"), "no refusal").toHaveCount(0);
});
