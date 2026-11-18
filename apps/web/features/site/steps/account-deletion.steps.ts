// Deleting an Account (#68), and the Accounts sections of the privacy policy
// and the terms of service. Steps delete through the Sign-in page as a person
// does; which Account a browser is signed in to comes from the site's session
// answer (./account.steps.ts), and what is left of an Account from the
// Account database, the run's own Postgres (../test-database.ts).

import { expect, request, type Page } from "@playwright/test";
import { Pool } from "pg";
import { testDatabase } from "../test-database";
import { clickOutside, expectFocusStayedInside, focusInside, isModal, nextFrames, type Language } from "../support";
import { AUTH_BASE, control, noted, signedInAccount } from "./account.steps";
import { Then, When, type Reading } from "./fixtures";
import { backdropPoint, centreOf, pressScrollKeys, swipeUp, wheelAt } from "./root-dialog-scroll.steps";

// ------------------------------------------------------- the Account database

let pool: Pool | undefined;
/** The run's Account database, as the site under test reaches it. */
const database = () => (pool ??= new Pool({ connectionString: testDatabase(Number(process.env.PORT)).url, max: 2, idleTimeoutMillis: 1_000, allowExitOnIdle: true }));

/**
 * Every row tied to the Account `id`, by table: the Account's own row in
 * "user", and every row of any table with a "userId" column, so tables later
 * issues tie to an Account are counted too.
 */
async function rowsOf(id: string): Promise<Record<string, Record<string, unknown>[]>> {
  const db = database();
  const tables = await db.query<{ table_name: string }>(
    `select table_name from information_schema.columns
      where table_schema = 'public' and column_name = 'userId' order by table_name`,
  );
  const rows: Record<string, Record<string, unknown>[]> = {
    user: (await db.query(`select * from "user" where id = $1`, [id])).rows,
  };
  for (const { table_name } of tables.rows) {
    rows[table_name] = (await db.query(`select * from "${table_name}" where "userId" = $1`, [id])).rows;
  }
  return rows;
}

Then("the Account database holds nothing of the Account I noted", async ({ reading }) => {
  const left = Object.entries(await rowsOf(noted(reading).id)).filter(([, rows]) => rows.length > 0);
  expect(Object.fromEntries(left), "rows left for the deleted Account, by table").toEqual({});
});

Then("the Account database still holds the Account I noted", async ({ reading }) => {
  const rows = await rowsOf(noted(reading).id);
  expect(rows.user, "the Account's own row").toHaveLength(1);
  expect(rows.account?.length ?? 0, "its sign-in").toBeGreaterThan(0);
});

Then(
  "the Account the site knows me by is new and empty, holding only its sign-in via {word}",
  async ({ reader }, via: string) => {
    const account = await signedInAccount(reader.page);
    expect(account, "signed in to an Account").toBeDefined();
    const rows = await rowsOf(account!.id);
    expect(rows.user, "the Account's own row").toHaveLength(1);
    expect(
      (rows.account ?? []).map((row) => row.providerId),
      `only the sign-in via ${via}`,
    ).toEqual([via.toLowerCase()]);
    // A new Account takes the signing-in device's Script and Language (#70): its
    // "settings" row is this sign-in's, as its session is, not the deleted Account's.
    const others = Object.entries(rows).filter(([table, r]) => !["user", "account", "session", "settings"].includes(table) && r.length);
    expect(Object.fromEntries(others), "no other data tied to the new Account").toEqual({});
  },
);

// ------------------------------------------------------ another device

When("I note this browser's sign-in, as if on another device", async ({ reader, reading }) => {
  reading.otherDevice = await reader.page.context().storageState();
  expect(reading.otherDevice.cookies.length, "signed in, the browser holds a session cookie").toBeGreaterThan(0);
});

Then("the sign-in I noted on the other device is signed out too", async ({ reader, reading }) => {
  if (!reading.otherDevice) throw new Error("no other device's sign-in noted in this scenario");
  const device = await request.newContext({ baseURL: reader.baseURL, storageState: reading.otherDevice });
  try {
    const res = await device.get(`${AUTH_BASE}/get-session`);
    expect(res.status()).toBe(200);
    const body = (await res.json().catch(() => null)) as { user?: unknown } | null;
    expect(body?.user, "the other device's session no longer signs it in").toBeUndefined();
  } finally {
    await device.dispose();
  }
});

// ------------------------------------------------- deleting on the Sign-in page

/** The confirmation dialog the Sign-in page opens over itself. */
const confirmation = (page: Page) => page.getByRole("alertdialog");

Then(
  "a dialog asks me to confirm, saying the Account and all its data are deleted at once and this cannot be undone",
  async ({ reader }) => {
    const dialog = confirmation(reader.page);
    await expect(dialog, "a confirmation dialog").toBeVisible();
    await expect(dialog).toContainText(/at once/i);
    await expect(dialog).toContainText(/cannot be undone/i);
    await expect(dialog.getByRole("button", { name: "Delete Account", exact: true })).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Cancel", exact: true })).toBeVisible();
  },
);

When("I answer the dialog with {string}", async ({ reader }, name: string) => {
  const button = confirmation(reader.page).getByRole("button", { name, exact: true });
  await expect(button, `the dialog offers "${name}"`).toBeVisible();
  await button.click();
});

Then("no dialog is open", async ({ reader }) => {
  await expect(confirmation(reader.page)).toHaveCount(0);
});

When("I delete my Account on the Sign-in page in {language}", async ({ reader }, lang: Language) => {
  const page = reader.page;
  await page.goto(`/${lang}/sign-in`);
  const open = control(page, "Delete Account");
  await expect(open, "the Sign-in page offers Delete Account").toBeVisible();
  await open.click();
  await confirmation(page).getByRole("button", { name: "Delete Account", exact: true }).click();
  // The page beneath is hidden from the accessibility tree while the confirmation is open, Sign out with it (#301).
  await expect(confirmation(page), "deleted, the confirmation closes").toHaveCount(0);
  await expect(control(page, "Sign out"), "deleted, the person is signed out").toHaveCount(0);
  expect(await signedInAccount(page), "the site no longer knows me").toBeUndefined();
});

// ------------------------------------------- the confirmation, a modal dialog (#301)

Then("the confirmation is a modal dialog named {string}", async ({ reader }, name: string) => {
  const dialog = confirmation(reader.page);
  await expect(dialog).toHaveAccessibleName(name);
  expect(await isModal(dialog), "aria-modal").toBe(true);
});

Then("focus is inside the confirmation", async ({ reader }) => {
  await expect.poll(() => focusInside(confirmation(reader.page))).toBe(true);
});

// After "I press Tab 6 times" (roots.steps.ts).
Then("focus stayed inside the confirmation after every press", async ({ reader, reading }) => {
  await expect(confirmation(reader.page)).toBeVisible();
  expectFocusStayedInside(reading.focusTrail);
});

Then("focus is back on {string}", async ({ reader }, name: string) => {
  await expect(control(reader.page, name)).toBeFocused();
});

// --------------------------------- the Sign-in page holds still beneath it (#301)

/**
 * Makes the Sign-in page longer than the screen, above its panel, and scrolls
 * it down until the control `name` is in the middle of the screen: the page is
 * shorter than a screen, so it would have nowhere to scroll from. The control
 * is then on screen, so choosing it does not scroll the page to it.
 */
async function lengthenTo(page: Page, name: string) {
  await expect(control(page, name), `the Sign-in page offers "${name}"`).toBeVisible();
  await page.evaluate(() => {
    const spacer = document.createElement("div");
    spacer.style.height = `${2 * window.innerHeight}px`;
    document.querySelector("main")!.prepend(spacer);
  });
  await control(page, name).evaluate((el) => el.scrollIntoView({ block: "center", behavior: "instant" }));
  await nextFrames(page);
  expect(await page.evaluate(() => window.scrollY), "the page has scrolled down").toBeGreaterThan(0);
}

When(
  "I open the Sign-in page in {language}, longer than the screen and scrolled down to {string}",
  async ({ reader }, lang: Language, name: string) => {
    await reader.page.goto(`/${lang}/sign-in`);
    await lengthenTo(reader.page, name);
  },
);

When(
  "I open the Sign-in page in {language} on a desktop whose scrollbar takes up room, longer than the screen and scrolled down to {string}",
  async ({ reader }, lang: Language, name: string) => {
    // A browser of its own, signed in as this one is.
    await reader.openWithScrollbars(`/${lang}/sign-in`, await reader.page.context().storageState());
    await lengthenTo(reader.page, name);
    const room = await reader.page.evaluate(() => window.innerWidth - document.documentElement.clientWidth);
    expect(room, "the scrollbar's width").toBe(15);
  },
);

/** Where the Sign-in page is: how far down, its laid-out width, and its title's and Delete Account's places across it. */
const signInPageAt = (page: Page): Promise<NonNullable<Reading["signInPageAt"]>> =>
  page.evaluate(() => ({
    y: window.scrollY,
    width: document.body.getBoundingClientRect().width,
    titleX: document.querySelector("h1")!.getBoundingClientRect().left,
    buttonX: Array.from(document.querySelectorAll("main button")).find((b) => b.textContent === "Delete Account")!.getBoundingClientRect().left,
  }));

When("I note where the Sign-in page is", async ({ reader, reading }) => {
  const page = reader.page;
  await nextFrames(page);
  reading.signInPageAt = await signInPageAt(page);
  // Every scroll event the page fires from now on.
  await page.evaluate(() => {
    const w = window as unknown as { scrolls: number };
    w.scrolls = 0;
    window.addEventListener("scroll", () => w.scrolls++);
  });
});

Then("nothing on the Sign-in page has moved, even sideways, and it fired no scroll event", async ({ reader, reading }) => {
  const page = reader.page;
  // Give a smooth scroll, had one started, time to show.
  await page.waitForTimeout(300);
  expect(await signInPageAt(page)).toEqual(reading.signInPageAt);
  expect(await page.evaluate(() => (window as unknown as { scrolls: number }).scrolls), "scroll events fired").toBe(0);
});

When("I click the confirmation's backdrop", async ({ reader }) => {
  await clickOutside(confirmation(reader.page));
});

When("I turn the mouse wheel down by {int} pixels over the confirmation's backdrop", async ({ reader }, dy: number) => {
  await wheelAt(reader.page, await backdropPoint(confirmation(reader.page)), dy);
});

When("I turn the mouse wheel down by {int} pixels over the confirmation", async ({ reader }, dy: number) => {
  await wheelAt(reader.page, await centreOf(confirmation(reader.page)), dy);
});

When("I swipe up by {int} pixels on the confirmation's backdrop", async ({ reader }, dy: number) => {
  await swipeUp(reader.page, await backdropPoint(confirmation(reader.page)), dy);
});

When("I swipe up by {int} pixels on the confirmation", async ({ reader }, dy: number) => {
  await swipeUp(reader.page, await centreOf(confirmation(reader.page)), dy);
});

When("I press PageDown, End and ArrowDown in the confirmation", async ({ reader }) => {
  await pressScrollKeys(confirmation(reader.page));
});

// ------------------------------------------------------- the site documents

/** The text of a site document's section: its h2 and what follows, up to the next h2. */
async function sectionText(page: Page, heading: string): Promise<string[]> {
  const found = page.getByRole("heading", { level: 2, name: heading, exact: true });
  await expect(found, `the page has a section "${heading}"`).toHaveCount(1);
  return found.evaluate((h2) => {
    const blocks: string[] = [];
    for (let el = h2.nextElementSibling; el && el.tagName !== "H2"; el = el.nextElementSibling) {
      blocks.push((el as HTMLElement).innerText.replace(/\s+/g, " ").trim());
    }
    return blocks;
  });
}

Then("the page's section {string} names each of these:", async ({ page }, heading: string, table) => {
  const names: string[] = table.raw().flat();
  const text = (await sectionText(page, heading)).join(" ");
  for (const name of names) expect(text, `the section "${heading}" names ${name}`).toContain(name);
});

Then("the page's section {string} reads, word for word:", async ({ page }, heading: string, docString: string) => {
  const expected = docString.split("\n").map((line) => line.trim()).filter(Boolean);
  expect(await sectionText(page, heading)).toEqual(expected);
});

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** A date as the site documents write it, "3 October 2026", as a UTC time. */
function documentDate(text: string): number {
  const [, day, month, year] = /^(\d{1,2}) ([A-Z][a-z]+) (\d{4})$/.exec(text.trim()) ?? [];
  const m = MONTHS.indexOf(month ?? "");
  if (!day || m < 0) throw new Error(`not a document date: "${text}"`);
  return Date.UTC(Number(year), m, Number(day));
}

Then("the page is dated later than {string}", async ({ page }, date: string) => {
  const line = page.getByText(/^Last updated /);
  await expect(line, "the page names the date it last changed").toHaveCount(1);
  const updated = ((await line.textContent()) ?? "").replace(/^Last updated /, "");
  expect(documentDate(updated), `last updated ${updated}, after ${date}`).toBeGreaterThan(documentDate(date));
});
