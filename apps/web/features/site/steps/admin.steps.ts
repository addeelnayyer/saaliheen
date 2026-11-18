// The admin area (#42): Admin sign-in, the "not an Admin" page, the Surah
// picker, noindex, and the reading pages left static. Admins sign in to their
// Account (#67): steps sign in through the Account test-only sign-in at
// /en/test-sign-in, which the test configuration (../admin-settings.ts)
// switches on, then open the admin area; they never reach GitHub or Google,
// whose sign-in pages a stub answers. Surah names are read from QUL's Surah
// metadata (../support), never typed.

import { spawn } from "node:child_process";
import net from "node:net";
import path from "node:path";
import { expect, type Page } from "@playwright/test";
import { searchBox, sourceSurahs } from "../support";
import { ADMIN_SETTINGS, NON_ADMIN_EMAIL } from "../admin-settings";
// Admins sign in with Accounts' apps (#67), so their sign-in pages are the Accounts' PROVIDER table.
import { AUTH_BASE, PROVIDER } from "./account.steps";
import { Given, Then, When, type Reader, type Reading } from "./fixtures";

const SURAHS = sourceSurahs();
const ALL = SURAHS.map((s) => s.number);
const byNumber = (n: number) => SURAHS[n - 1];
const REPO = path.join(__dirname, "..", "..", "..");

type Method = "GitHub" | "Google";
function method(name: string): Method {
  if (name !== "GitHub" && name !== "Google") throw new Error(`no sign-in method ${name}`);
  return name;
}

/** A button or link the page offers, by its exact name. */
const control = (page: Page, name: string) =>
  page.getByRole("button", { name, exact: true }).or(page.getByRole("link", { name, exact: true }));

// ------------------------------------------------------------------ sign-in

Given("I am not signed in", async ({ reader, reading }) => {
  const context = reader.page.context();
  expect(await context.cookies(), "a fresh browser holds no cookie").toEqual([]);
  reading.providerRequests = [];
  // Each social sign-in the Sign-in page asks Better Auth to start, with where to come back to (#67).
  reading.socialSignIns = [];
  context.on("request", (request) => {
    if (request.method() === "POST" && new URL(request.url()).pathname === `${AUTH_BASE}/sign-in/social`) {
      reading.socialSignIns!.push(request.postData() ?? "");
    }
  });
  // Apple's too, for Account sign-in (#66).
  await context.route(/^https:\/\/(github\.com|accounts\.google\.com|appleid\.apple\.com)\//, async (route) => {
    reading.providerRequests!.push(route.request().url());
    await route.fulfill({ status: 200, contentType: "text/html", body: "<title>Provider sign-in (stub)</title>" });
  });
});

/**
 * Sign in to an Account through the Account test-only sign-in as `email`, as
 * if through `via`, on the server at `base` (this one when empty), and open
 * the admin area there, as an Admin coming back from the Admin entry does (#67).
 */
export async function testSignIn(page: Page, email: string, via: Method, base = "") {
  const res = await page.goto(`${base}/en/test-sign-in`);
  expect(res?.status(), "the test sign-in page is found").toBe(200);
  const button = page.getByRole("button", { name: `Test sign-in via ${via}`, exact: true });
  await expect(button, `the test sign-in offers ${via}`).toBeVisible();
  await page.getByRole("textbox", { name: "Email" }).fill(email);
  await button.click();
  await expect(page, `signed in via ${via}, the test sign-in moves on`).toHaveURL((url) => url.pathname !== "/en/test-sign-in");
  await page.goto(`${base}/admin`);
}

When("I sign in through the test sign-in as {string} via {word}", async ({ reader }, email: string, via: string) => {
  await testSignIn(reader.page, email, method(via));
});

Given("I am signed in as the Admin {string} via {word}", async ({ reader }, email: string, via: string) => {
  await testSignIn(reader.page, email, method(via));
  await expectPicker(reader.page);
});

Given("I am signed in as {string}, who is not an Admin", async ({ reader }, email: string) => {
  expect(email).toBe(NON_ADMIN_EMAIL);
  // Through Google: GitHub is refused to anyone not on the Admin allow-list (#67).
  await testSignIn(reader.page, email, "Google");
  await expectNotAnAdmin(reader.page);
});

When("I choose {string}", async ({ reader }, name: string) => {
  const chosen = control(reader.page, name);
  await expect(chosen, `the page offers "${name}"`).toBeVisible();
  await chosen.click();
});

Then(
  "the browser is sent to {word}'s sign-in page for this site's {word} app, to come back to this site",
  async ({ reader, reading }, name: string, app: string) => {
    expect(app).toBe(name);
    const provider = PROVIDER[method(name)];
    const site = new URL(reader.baseURL).origin;
    await expect
      .poll(() => (reading.providerRequests ?? []).map((u) => new URL(u)).find((u) => u.hostname === provider.host)?.href, {
        message: `the browser went to ${provider.host}`,
      })
      .toBeTruthy();
    const url = new URL(reading.providerRequests!.find((u) => new URL(u).hostname === provider.host)!);
    expect(url.pathname, `${name}'s sign-in page`).toMatch(provider.path);
    expect(url.searchParams.get("client_id"), `this site's ${name} app`).toBe(provider.clientId);
    const back = url.searchParams.get("redirect_uri") ?? "";
    expect(back ? new URL(back).origin : "", "comes back to this site").toBe(site);
  },
);

// The Sign-in page's Admin entry (#67): the Sign-in page, in either Language, offering GitHub too.
Then("I am on the admin sign-in page, offering GitHub and Google", async ({ reader }) => {
  const page = reader.page;
  await expect(page).toHaveURL((url) => /^\/(en|ur)\/sign-in$/.test(url.pathname));
  await expect(control(page, "Sign in with GitHub")).toBeVisible();
  await expect(control(page, "Sign in with Google")).toBeVisible();
});

async function expectNotAnAdmin(page: Page) {
  await expect(page.getByRole("heading", { name: /not an Admin/i })).toBeVisible();
  await expect(page.locator("body")).not.toContainText(/Application error|Internal Server Error|This page could not be found/);
}

Then('I see the "not an Admin" page, not an error', async ({ reader }) => {
  await expectNotAnAdmin(reader.page);
});

Then("the admin area names me as {string}", async ({ reader }, email: string) => {
  await expect(reader.page.getByText(email, { exact: false }).first()).toBeVisible();
});

Then("the page offers {string}", async ({ reader }, name: string) => {
  await expect(control(reader.page, name)).toBeVisible();
});

Then("the page offers the test sign-in", async ({ reader }) => {
  const page = reader.page;
  await expect(page.getByRole("textbox", { name: "Email" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Test sign-in via GitHub", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Test sign-in via Google", exact: true })).toBeVisible();
});

Then("the page offers no test sign-in", async ({ reader }) => {
  const page = reader.page;
  await expect(page.getByText(/test sign-in/i)).toHaveCount(0);
  await expect(page.getByRole("button", { name: /^Test sign-in via/ })).toHaveCount(0);
  await expect(page.locator('a[href*="test-sign-in"]')).toHaveCount(0);
});

// ------------------------------------------------- a second server (AC-7)

const freePort = () =>
  new Promise<number>((resolve, reject) => {
    const probe = net.createServer();
    probe.once("error", reject);
    probe.listen(0, "127.0.0.1", () => {
      const { port } = probe.address() as net.AddressInfo;
      probe.close(() => resolve(port));
    });
  });

/**
 * Serve the production build the site tests made a second time, on a port
 * the system picks, with the admin settings and `settings` (`KEY=value`
 * pairs, as text where anything else is a note, or as a record). It is
 * stopped when the scenario ends.
 */
export async function serveAgain(reader: Reader, reading: Reading, settings: string | Record<string, string>) {
  const port = await freePort();
  const env: NodeJS.ProcessEnv = { ...process.env, ...ADMIN_SETTINGS };
  for (const name of ["ACCOUNT_TEST_SIGN_IN", "VERCEL", "VERCEL_ENV", "PORT"]) delete env[name];
  const pairs = typeof settings === "string" ? [...settings.matchAll(/([A-Z_]+)=(\S+)/g)].map(([, key, value]) => [key, value]) : Object.entries(settings);
  for (const [key, value] of pairs) env[key] = value;
  const server = spawn("pnpm", ["exec", "next", "start", "-p", String(port), "-H", "127.0.0.1"], {
    cwd: REPO,
    env,
    stdio: "ignore",
    detached: true,
  });
  reader.cleanups.push(() => {
    try {
      process.kill(-server.pid!, "SIGTERM");
    } catch {
      // already gone
    }
  });
  const base = `http://127.0.0.1:${port}`;
  await expect
    .poll(async () => (await fetch(`${base}/ur/1`).catch(() => undefined))?.status, { timeout: 60_000, message: `${base} serves` })
    .toBe(200);
  reading.server = base;
}

Given(
  "a second copy of the production build is served with the admin settings and {string}",
  async ({ reader, reading }, settings: string) => {
    await serveAgain(reader, reading, settings);
  },
);

const serverOf = (reading: Reading) => {
  if (!reading.server) throw new Error("no second server started in this scenario");
  return reading.server;
};

When("I open that server's {string}", async ({ reader, reading }, address: string) => {
  await reader.page.goto(serverOf(reading) + address);
});

Then("that server's {string} is not found", async ({ reader, reading }, address: string) => {
  expect((await reader.page.request.get(serverOf(reading) + address)).status(), address).toBe(404);
});

// -------------------------------------------------------- the Surah picker

/** Each visible picker link's Surah and text, in page order: links to `/admin/<n>`. */
const pickerTexts = (page: Page) =>
  page.getByRole("link").evaluateAll((links) =>
    links
      .filter((a) => /^\/admin\/\d+$/.test(a.getAttribute("href") ?? "") && (a as HTMLElement).checkVisibility())
      .map((a) => ({ surah: Number(a.getAttribute("href")!.split("/")[2]), text: (a as HTMLElement).innerText.replace(/\s+/g, " ") })),
  );

/** The Surah numbers whose picker links a person can see, in page order. */
const pickerSurahs = async (page: Page) => (await pickerTexts(page)).map(({ surah }) => surah);

async function expectPicker(page: Page) {
  await expect(page).toHaveURL((url) => url.pathname === "/admin");
  await expect(searchBox(page)).toBeVisible();
  await expect.poll(() => pickerSurahs(page), { message: "the Surah picker lists the 114 Surahs" }).toEqual(ALL);
}

Then("I see the Surah picker", async ({ reader }) => {
  await expectPicker(reader.page);
});

Then("I do not see the Surah picker", async ({ reader }) => {
  const page = reader.page;
  await page.waitForLoadState("load");
  expect(await pickerSurahs(page), "no link to a Passage editor").toEqual([]);
  await expect(searchBox(page)).toHaveCount(0);
});

Then("I do not see a Passage editor", async ({ reader }) => {
  await expect(reader.page.locator("body")).not.toContainText(/Passage editor/i);
});

Then(
  "the Surah picker shows all {int} Surahs in order, each with its number and Latin name from the Surah metadata",
  async ({ reader }, count: number) => {
    expect(count).toBe(SURAHS.length);
    await expect.poll(() => pickerSurahs(reader.page)).toEqual(ALL);
    const wrong = (await pickerTexts(reader.page)).filter(
      ({ surah, text }) => !new RegExp(`(^|\\D)${surah}(\\D|$)`).test(text) || !text.includes(byNumber(surah).nameLatin),
    );
    expect(wrong, "picker links missing their Surah's number or Latin name").toEqual([]);
  },
);

async function searchPicker(page: Page, reading: Reading, query: string) {
  await searchBox(page).fill(query);
  reading.query = query;
}

When("I search the Surah picker for {string}", async ({ reader, reading }, query: string) => {
  await searchPicker(reader.page, reading, query);
});

When(
  "I search the Surah picker for the last part of Surah {int}'s Latin name, in lower case",
  async ({ reader, reading }, surah: number) => {
    await searchPicker(reader.page, reading, byNumber(surah).nameLatin.split("-").pop()!.toLowerCase());
  },
);

When("I search the Surah picker for Surah {int}'s Arabic name", async ({ reader, reading }, surah: number) => {
  await searchPicker(reader.page, reading, byNumber(surah).nameArabic);
});

When("I clear the Surah picker's search", async ({ reader, reading }) => {
  await searchPicker(reader.page, reading, "");
});

Then("the Surah picker shows only Surah {int}", async ({ reader }, surah: number) => {
  await expect.poll(() => pickerSurahs(reader.page)).toEqual([surah]);
});

Then(
  "the Surah picker shows exactly the Surahs whose {word} name contains the search, among them Surah {int}",
  async ({ reader, reading }, which: string, surah: number) => {
    const query = reading.query ?? "";
    const name = (s: (typeof SURAHS)[number]) => (which === "Latin" ? s.nameLatin.toLowerCase() : which === "Arabic" ? s.nameArabic : undefined);
    if (!name(SURAHS[0])) throw new Error(`no ${which} name`);
    const expected = SURAHS.filter((s) => name(s)!.includes(which === "Latin" ? query.toLowerCase() : query)).map((s) => s.number);
    expect(expected).toContain(surah);
    expect(expected.length).toBeLessThan(SURAHS.length);
    await expect.poll(() => pickerSurahs(reader.page)).toEqual(expected);
  },
);

When("I choose Surah {int} in the Surah picker", async ({ reader }, surah: number) => {
  await reader.page.locator(`a[href="/admin/${surah}"]`).click();
});

Then("I am on the admin page {string}", async ({ reader }, address: string) => {
  await expect(reader.page).toHaveURL((url) => url.pathname === address);
});

Then("the page names Surah {int}'s Latin name and says it is the Passage editor", async ({ reader }, surah: number) => {
  const page = reader.page;
  await expect(page.getByRole("heading").filter({ hasText: byNumber(surah).nameLatin }).first()).toBeVisible();
  await expect(page.getByText(/Passage editor/i).first()).toBeVisible();
});

// ------------------------------------------------- noindex, links, static

When("I fetch {string} as this browser", async ({ reader, reading }, address: string) => {
  // The page's own request context shares this browser's cookies, so a
  // signed-in browser fetches as itself; redirects are followed.
  const res = await reader.page.request.get(address);
  reading.fetched = { url: res.url(), status: res.status(), headers: res.headers(), html: await res.text() };
});

/** Whether a robots meta tag in `html` says noindex. */
const metaNoindex = (html: string) =>
  [...html.matchAll(/<meta\b[^>]*>/gi)].some(([tag]) => /name=["']?robots["']?/i.test(tag) && /content=["'][^"']*noindex/i.test(tag));

Then("the page it ends on is an admin page that tells search engines not to index it", async ({ reading }) => {
  const fetched = reading.fetched;
  if (!fetched) throw new Error("nothing fetched yet in this scenario");
  expect(new URL(fetched.url).pathname, "an admin page").toMatch(/^\/admin(\/|$)/);
  // Not the site's 404 page, which carries noindex of its own, nor an error.
  expect(fetched.status, `${fetched.url} is found`).not.toBe(404);
  expect(fetched.status, `${fetched.url} is not an error`).toBeLessThan(500);
  const header = /noindex/i.test(fetched.headers["x-robots-tag"] ?? "");
  expect(header || metaNoindex(fetched.html), `${fetched.url} says noindex in an X-Robots-Tag header or a robots meta tag`).toBe(true);
});

Then("none of these reading pages, served or as shown, links to the admin area:", async ({ reader }, table) => {
  const paths: string[] = table.raw().flat();
  expect(paths.length).toBeGreaterThan(0);
  const page = reader.page;
  for (const address of paths) {
    const res = await page.request.get(address);
    expect(res.status(), address).toBe(200);
    const served = [...(await res.text()).matchAll(/href=["']([^"']*)["']/gi)].map((m) => m[1]);
    expect(served.filter((href) => /^(https?:\/\/[^/]+)?\/admin(\/|$|[?#])/.test(href)), `${address} as served`).toEqual([]);
    await page.goto(address);
    await page.waitForLoadState("load");
    const shown = await page.locator("a[href]").evaluateAll((links) =>
      links.map((a) => new URL((a as HTMLAnchorElement).href)).filter((u) => u.origin === location.origin && /^\/admin(\/|$)/.test(u.pathname)).map((u) => u.href),
    );
    expect(shown, `${address} as shown`).toEqual([]);
  }
});

Then("these reading pages are served as static pages from Next's cache, setting no cookie:", async ({ reader }, table) => {
  const paths: string[] = table.raw().flat();
  expect(paths.length).toBeGreaterThan(0);
  for (const address of paths) {
    const res = await reader.page.request.get(address, { maxRedirects: 0 });
    const headers = res.headers();
    expect(res.status(), address).toBe(200);
    expect(headers["x-nextjs-prerender"] ?? "", `${address} is a prerendered page`).toMatch(/1/);
    expect(headers["cache-control"] ?? "", `${address} is cacheable as a static page`).toMatch(/s-maxage=\d+/);
    expect(headers["set-cookie"], `${address} sets no cookie`).toBeUndefined();
  }
});
