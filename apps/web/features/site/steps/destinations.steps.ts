// Read, Explore and Me (#192): the destinations on every reading page, as a
// tab bar along the bottom below 900px and a top bar from 900px up; Sign in
// while signed out; how they look in each colour theme; the tab bar on a Surah
// page; and whether following a link loaded a new page.
//
// The destinations are found as a reader finds them: the navigation landmark
// holding the links Read, Explore and Me. Which bar it is, is told by where it
// sits on screen, never by its markup.

import { expect, type Locator, type Page } from "@playwright/test";
import { nextFrames, STRINGS, type Language } from "../support";
import { Given, Then, When, precedes } from "./fixtures";
import type { Theme } from "./reader";

export const DESTINATIONS = ["Read", "Explore", "Me"] as const;
type Destination = (typeof DESTINATIONS)[number];

/** Every navigation landmark holding Read, Explore and Me, shown or not. */
export const destinationBars = (page: Page) => {
  let bars = page.getByRole("navigation");
  for (const name of DESTINATIONS) bars = bars.filter({ has: page.getByRole("link", { name, exact: true }) });
  return bars;
};

/** The one set of destinations a reader sees now. */
export async function shownBar(page: Page): Promise<Locator> {
  const bars = destinationBars(page).filter({ visible: true });
  await expect(bars, "one shown set of Read, Explore and Me").toHaveCount(1);
  return bars.first();
}

/** The address each destination leads to in `lang`. */
const addressOf = (destination: Destination, lang: Language) =>
  ({ Read: `/${lang}`, Explore: `/${lang}/explore`, Me: `/${lang}/me` })[destination];

const pathOf = (page: Page, href: string | null) => new URL(href ?? "", page.url()).pathname;

const viewport = (page: Page) => page.viewportSize()!;

/** Where `bar` sits: "bottom" when it runs along the screen's foot, "top" along its head, else "elsewhere". */
async function placeOf(page: Page, bar: Locator): Promise<"top" | "bottom" | "elsewhere"> {
  const box = (await bar.boundingBox())!;
  const { height } = viewport(page);
  if (Math.abs(box.y + box.height - height) <= 2 && box.y > height / 2) return "bottom";
  if (box.y <= 2 && box.height < height / 4) return "top";
  return "elsewhere";
}

/** The brand link a reader sees on the page. */
export const brandLink = (page: Page) => page.getByRole("link", { name: STRINGS.brand, exact: true }).filter({ visible: true }).first();

/** The names of every shown link, button and switch whose middle lies within `bar`'s height on screen: the controls on that bar's row. */
export async function controlsOnRowOf(bar: Locator): Promise<string[]> {
  return bar.evaluate((el) => {
    const row = el.getBoundingClientRect();
    const named = (c: Element) =>
      (c.getAttribute("aria-label") ?? (c as HTMLElement).innerText ?? "").replace(/\s+/g, " ").trim();
    return Array.from(document.querySelectorAll("a[href], button, [role=switch], [role=link], [role=button], input, select"))
      .filter((c) => {
        const box = c.getBoundingClientRect();
        if (box.width === 0 || box.height === 0 || getComputedStyle(c).visibility === "hidden") return false;
        const middle = box.top + box.height / 2;
        return middle >= row.top && middle <= row.bottom;
      })
      .map(named);
  });
}

// ---------------------------------------------------------------- viewports

Given("the browser window is {int} pixels wide", async ({ reader, reading }, width: number) => {
  await reader.page.setViewportSize({ width, height: 844 });
  reading.viewport = width < 900 ? "phone" : "desktop";
});

// ---------------------------------------------------------------- the bars

Then(
  "the destinations are a tab bar along the bottom of the screen: Read, Explore and Me, in order",
  async ({ reader }) => {
    const bar = await shownBar(reader.page);
    await expectInOrder(bar);
    expect(await placeOf(reader.page, bar), "where the destinations sit").toBe("bottom");
  },
);

Then(
  "the destinations are a top bar along the top of the screen, after the brand: Read, Explore and Me, in order",
  async ({ reader }) => {
    const page = reader.page;
    const bar = await shownBar(page);
    await expectInOrder(bar);
    expect(await placeOf(page, bar), "where the destinations sit").toBe("top");
    const brand = brandLink(page);
    await expect(brand, "the brand").toBeInViewport({ ratio: 1 });
    expect(await precedes(brand, bar.getByRole("link", { name: "Read", exact: true })), "the brand before Read").toBe(true);
    expect((await controlsOnRowOf(bar)).includes(STRINGS.brand), "the brand on the top bar's row").toBe(true);
  },
);

async function expectInOrder(bar: Locator) {
  const links = DESTINATIONS.map((name) => bar.getByRole("link", { name, exact: true }));
  for (const [i, link] of links.entries()) {
    await expect(link, DESTINATIONS[i]).toHaveCount(1);
    await expect(link, DESTINATIONS[i]).toBeInViewport({ ratio: 1 });
  }
  for (let i = 1; i < links.length; i++) {
    expect(await precedes(links[i - 1], links[i]), `${DESTINATIONS[i - 1]} before ${DESTINATIONS[i]}`).toBe(true);
  }
}

Then("the destinations lead to the Surah index, Explore and Me in {language}", async ({ reader }, lang: Language) => {
  const bar = await shownBar(reader.page);
  for (const name of DESTINATIONS) {
    const href = await bar.getByRole("link", { name, exact: true }).getAttribute("href");
    expect(pathOf(reader.page, href), `where ${name} leads`).toBe(addressOf(name, lang));
  }
});

Then("the top bar's brand leads to the Surah index in {language}", async ({ reader }, lang: Language) => {
  expect(pathOf(reader.page, await brandLink(reader.page).getAttribute("href")), "where the brand leads").toBe(`/${lang}`);
});

Then(/^(Read|Explore|Me) is marked as the current destination, and no other$/, async ({ reader }, current: Destination) => {
  const bar = await shownBar(reader.page);
  const link = (name: Destination) => bar.getByRole("link", { name, exact: true });
  // Marked for a screen reader…
  await expect(link(current), `${current} is the current page`).toHaveAttribute("aria-current", "page");
  for (const other of DESTINATIONS.filter((d) => d !== current)) {
    await expect(link(other), `${other} is not the current page`).not.toHaveAttribute("aria-current", /.+/);
  }
  // …and to the eye: the current one is drawn differently from the others.
  const look = (l: Locator) => l.evaluate((el) => { const s = getComputedStyle(el); return `${s.color} ${s.backgroundColor} ${s.fontWeight}`; });
  const other = DESTINATIONS.find((d) => d !== current)!;
  expect(await look(link(current)), `${current} looks marked beside ${other}`).not.toBe(await look(link(other)));
});

Then("no top bar of destinations is shown", async ({ reader }) => {
  await expectNoBarAt(reader.page, "top");
});

Then("no tab bar is shown", async ({ reader }) => {
  await expectNoBarAt(reader.page, "bottom");
});

async function expectNoBarAt(page: Page, where: "top" | "bottom") {
  const bars = destinationBars(page).filter({ visible: true });
  for (let i = 0; i < (await bars.count()); i++) {
    expect(await placeOf(page, bars.nth(i)), `a set of destinations at the ${where}`).not.toBe(where);
  }
}

Then(/^the destinations are shown as a (tab bar|top bar) only$/, async ({ reader }, bar: string) => {
  const shown = await shownBar(reader.page);
  expect(await placeOf(reader.page, shown), "where the destinations sit").toBe(bar === "tab bar" ? "bottom" : "top");
});

Then("the top bar holds only the brand, Read, Explore, Me and Sign in", async ({ reader }) => {
  const bar = await shownBar(reader.page);
  const names = await controlsOnRowOf(bar);
  expect([...names].sort(), "the controls on the top bar").toEqual([STRINGS.brand, ...DESTINATIONS, "Sign in"].sort());
});

Then("the page has no Index link", async ({ reader }) => {
  await expect(reader.page.getByRole("link", { name: STRINGS.index }), "a link named Index").toHaveCount(0);
});

Then(`the page's banner offers no "Share Ayahs", no "Credits" and no Language switch`, async ({ reader }) => {
  const banners = reader.page.getByRole("banner");
  for (const name of ["Share Ayahs", "Credits"]) {
    await expect(banners.getByRole("link", { name, exact: true }), `"${name}" on the banner`).toHaveCount(0);
    await expect(banners.getByRole("button", { name, exact: true }), `"${name}" on the banner`).toHaveCount(0);
  }
  await expect(banners.getByRole("group", { name: /language/i }), "a Language switch on the banner").toHaveCount(0);
});

When(/^I follow the destination "(Read|Explore|Me)"$/, async ({ reader }, name: Destination) => {
  await (await shownBar(reader.page)).getByRole("link", { name, exact: true }).click();
});

Then("I am on Explore in {language}", async ({ reader, reading }, lang: Language) => {
  await expect.poll(() => new URL(reader.page.url()).pathname, "the address").toBe(`/${lang}/explore`);
  await expect(reader.page.getByRole("heading", { level: 1 })).toBeVisible();
  reading.lang = lang;
});

Then("I am on Me in {language}", async ({ reader, reading }, lang: Language) => {
  await expect.poll(() => new URL(reader.page.url()).pathname, "the address").toBe(`/${lang}/me`);
  await expect(reader.page.getByRole("heading", { level: 1 })).toBeVisible();
  reading.lang = lang;
});

Then("I am on the page {string}", async ({ reader }, path: string) => {
  await expect.poll(() => new URL(reader.page.url()).pathname, "the address").toBe(path);
});

// ---------------------------------------------------------------- Sign in

/** The shown link or button named `name` on the top bar's row. */
async function onTopBar(page: Page, name: string): Promise<Locator[]> {
  const bar = await shownBar(page);
  const row = (await bar.boundingBox())!;
  const found: Locator[] = [];
  for (const role of ["link", "button"] as const) {
    const all = page.getByRole(role, { name, exact: true }).filter({ visible: true });
    for (let i = 0; i < (await all.count()); i++) {
      const box = (await all.nth(i).boundingBox())!;
      const middle = box.y + box.height / 2;
      if (middle >= row.y && middle <= row.y + row.height) found.push(all.nth(i));
    }
  }
  return found;
}

When("I follow the top bar's {string}", async ({ reader }, name: string) => {
  const found = await onTopBar(reader.page, name);
  expect(found.length, `"${name}" on the top bar`).toBe(1);
  await found[0].click();
});

Then("the top bar does not offer {string}", async ({ reader }, name: string) => {
  expect((await onTopBar(reader.page, name)).length, `"${name}" on the top bar`).toBe(0);
});

Then("I am on the Sign-in page in {language}", async ({ reader }, lang: Language) => {
  await expect.poll(() => new URL(reader.page.url()).pathname, "the address").toBe(`/${lang}/sign-in`);
});

// ---------------------------------------------------------------- keyboard and screen reader

Then("the destinations are a navigation landmark with a name of its own", async ({ reader }) => {
  await expect(await shownBar(reader.page), "the destinations' accessible name").toHaveAccessibleName(/\S/);
});

// ---------------------------------------------------------------- colour themes

/** The relative luminance of a CSS rgb()/rgba() colour (WCAG 2). */
function luminance(rgb: string): number {
  const [r, g, b] = (rgb.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number).map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

const contrast = (a: string, b: string) => {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

/** The colour actually behind `el`: its own background, or the first ancestor's that is not transparent. */
const backgroundBehind = (el: Locator) =>
  el.evaluate((node) => {
    for (let n: Element | null = node; n; n = n.parentElement) {
      const bg = getComputedStyle(n).backgroundColor;
      if (bg && !/rgba\(.*,\s*0\)$/.test(bg) && bg !== "transparent") return bg;
    }
    return "rgb(255, 255, 255)";
  });

/** Whether `area` is drawn in `theme` (a dark or light ground), and every link and button on it is readable (4.5:1). */
export async function expectDrawnIn(area: Locator, theme: Theme, what: string) {
  const ground = luminance(await backgroundBehind(area));
  if (theme === "dark") expect(ground, `${what}'s background is dark`).toBeLessThan(0.2);
  else expect(ground, `${what}'s background is light`).toBeGreaterThan(0.6);
  const words = area.locator("a, button");
  expect(await words.count(), `the words on ${what}`).toBeGreaterThan(0);
  for (let i = 0; i < (await words.count()); i++) {
    const word = words.nth(i);
    if (!(await word.isVisible())) continue;
    const color = await word.evaluate((el) => getComputedStyle(el).color);
    const ratio = contrast(color, await backgroundBehind(word));
    expect(ratio, `"${(await word.innerText()).trim()}" on ${what} against its background`).toBeGreaterThanOrEqual(4.5);
  }
}

Then(
  /^the destinations are drawn in the (light|dark) colour theme, every word on them readable against its background$/,
  async ({ reader }, theme: Theme) => {
    await expectDrawnIn(await shownBar(reader.page), theme, "the destinations");
  },
);

Then(/^the page's own background is drawn in the (light|dark) colour theme$/, async ({ reader }, theme: Theme) => {
  const ground = luminance(await backgroundBehind(reader.page.locator("body")));
  if (theme === "dark") expect(ground, "the page's background is dark").toBeLessThan(0.2);
  else expect(ground, "the page's background is light").toBeGreaterThan(0.6);
});

// ---------------------------------------------------------------- the tab bar on a Surah page

/** Whether the destinations are on screen at all, and wholly. */
async function tabBarOnScreen(page: Page): Promise<{ any: boolean; whole: boolean }> {
  const bars = destinationBars(page);
  const { width, height } = viewport(page);
  let any = false;
  let whole = false;
  for (let i = 0; i < (await bars.count()); i++) {
    const bar = bars.nth(i);
    if (!(await bar.isVisible())) continue;
    const box = await bar.boundingBox();
    if (!box) continue;
    const overlaps = box.y < height && box.y + box.height > 0 && box.x < width && box.x + box.width > 0;
    any ||= overlaps;
    whole ||= box.y >= -0.5 && box.y + box.height <= height + 0.5;
  }
  return { any, whole };
}

Then("the tab bar is on screen", async ({ reader }) => {
  await expect.poll(async () => (await tabBarOnScreen(reader.page)).whole, "the tab bar wholly on screen").toBe(true);
  expect(await placeOf(reader.page, await shownBar(reader.page)), "the tab bar along the foot").toBe("bottom");
});

Then("the tab bar is not on screen", async ({ reader }) => {
  // It may slide away; give the slide time to end.
  await expect.poll(async () => (await tabBarOnScreen(reader.page)).any, "any of the tab bar on screen").toBe(false);
});

Then("the tab bar is already off screen, with no slide", async ({ reader }) => {
  // The scroll step has let two frames pass; a slide would still be partway.
  await nextFrames(reader.page);
  expect((await tabBarOnScreen(reader.page)).any, "any of the tab bar on screen two frames after reading down").toBe(false);
});

Then("the tab bar is already wholly on screen, with no slide", async ({ reader }) => {
  await nextFrames(reader.page);
  expect((await tabBarOnScreen(reader.page)).whole, "the tab bar wholly on screen two frames after scrolling up").toBe(true);
});

// ---------------------------------------------------------------- full page loads

const STILL_HERE = "__saaliheenStillThisPageLoad";

Given("I note the page as it is loaded now", async ({ reader }) => {
  await reader.page.evaluate((key) => ((window as unknown as Record<string, boolean>)[key] = true), STILL_HERE);
});

Then("the browser did not load a new page", async ({ reader }) => {
  const still = await reader.page.evaluate((key) => (window as unknown as Record<string, boolean>)[key] === true, STILL_HERE);
  expect(still, "the page noted before following the link is still the one loaded (no full page load)").toBe(true);
});
