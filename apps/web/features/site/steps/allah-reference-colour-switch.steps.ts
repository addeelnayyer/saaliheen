// Steps for #148: the Allah reference colour switch in the Settings drawer.
// Modelled on the Phrase colours switch's steps (./phrase-colours.steps.ts);
// whether an Allah reference is gold is read as #147's steps read it
// (./allah-references.steps.ts). The Allah references are the seeded list,
// their Arabic in each Script read from the QUL sources, never typed.

import { expect, type Page, type Request } from "@playwright/test";
import { indopakText, sourceWords, STRINGS } from "../support";
import { seededAllahReferences } from "./allah-references";
import { GOLDS, goldOnPage, seededIn } from "./allah-references.steps";
import { Given, Then, When, type Reading } from "./fixtures";
import { closeSettings, inSettings, openSettingsWatchingFrames, settingsPanel } from "./reader";

// ---------------------------------------------------------------- the switch

/** A switch (or checkbox) in the Settings drawer, by its name. */
export const drawerSwitch = (page: Page, name: string) =>
  settingsPanel(page)
    .getByRole("switch", { name, exact: true })
    .or(settingsPanel(page).getByRole("checkbox", { name, exact: true }))
    .first();

const allahSwitch = (page: Page) => drawerSwitch(page, STRINGS.allahReferenceColour);

When(/^I turn Allah reference colour (on|off)$/, async ({ reader }, state: string) => {
  await inSettings(reader.page, async () => {
    const toggle = allahSwitch(reader.page);
    // Turning it on starts from off, and off from on.
    if (state === "on") await expect(toggle).not.toBeChecked();
    else await expect(toggle).toBeChecked();
    await toggle.click();
    if (state === "on") await expect(toggle).toBeChecked();
    else await expect(toggle).not.toBeChecked();
  });
});

Then(/^the Allah reference colour switch is (on|off)$/, async ({ reader }, state: string) => {
  await inSettings(reader.page, async () => {
    const toggle = allahSwitch(reader.page);
    if (state === "on") await expect(toggle).toBeChecked();
    else await expect(toggle).not.toBeChecked();
  });
});

/** The on/off switches of the Settings drawer, by the name a scenario gives them. */
const SWITCH_NAMES: Record<string, string> = {
  "Allah reference colour": STRINGS.allahReferenceColour,
  "Phrase colours": STRINGS.phraseColours,
  "Ayah translation": STRINGS.translation,
  "Hide Word meanings": STRINGS.hideWordMeanings,
};

/**
 * What the switch looks like, not what its ARIA says: where its knob is drawn,
 * in every frame from the first one the Settings drawer is drawn in, opened
 * afresh. The knob must sit at the end matching `state` throughout, never sliding.
 */
Then(
  /^the (Allah reference colour|Phrase colours|Ayah translation|Hide Word meanings) switch looks (on|off) from the first frame the Settings drawer is drawn in$/,
  async ({ reader }, name: string, state: string) => {
    const page = reader.page;
    await closeSettings(page);
    const frames = await openSettingsWatchingFrames(page, SWITCH_NAMES[name]);
    await closeSettings(page);
    expect(frames.length, "frames painted with the drawer").toBeGreaterThan(0);
    frames.forEach((f, i) => expect(f.knob, `the ${name} switch's knob in frame ${i + 1} of ${frames.length}`).toBe(state));
    expect(new Set(frames.map((f) => f.offset)).size, `the ${name} switch's knob slid as the drawer opened`).toBe(1);
  },
);

Then(
  "the Allah reference colour switch sits next to the Phrase colours switch, with no other control between them",
  async ({ reader }) => {
    const page = reader.page;
    const allah = allahSwitch(page);
    const phrase = drawerSwitch(page, STRINGS.phraseColours);
    await expect(allah).toHaveCount(1);
    await expect(phrase).toHaveCount(1);
    const [allahHandle, phraseHandle] = [await allah.elementHandle(), await phrase.elementHandle()];
    // The drawer's controls in document order, each switch counted once.
    const neighbours = await settingsPanel(page).evaluate(
      (drawer, [allah, phrase]) => {
        const is = (c: Element, s: Element) => c === s || s.contains(c) || c.contains(s);
        const controls = Array.from(drawer.querySelectorAll("button, input, select, textarea, [role=switch], [role=checkbox]"))
          .filter((c) => !c.closest("[aria-hidden=true]"))
          .map((c) => (is(c, allah!) ? "Allah reference colour" : is(c, phrase!) ? "Phrase colours" : c.getAttribute("aria-label") || c.textContent?.trim() || c.tagName))
          .filter((name, i, all) => i === 0 || name !== all[i - 1]);
        const at = controls.indexOf("Allah reference colour");
        return { at, before: controls[at - 1] ?? null, after: controls[at + 1] ?? null };
      },
      [allahHandle, phraseHandle] as const,
    );
    expect(neighbours.at, "the Allah reference colour switch is among the drawer's controls").toBeGreaterThanOrEqual(0);
    expect([neighbours.before, neighbours.after], "the controls on either side of the Allah reference colour switch").toContain("Phrase colours");
  },
);

// ---------------------------------------------------------------- the first frame

/** By Word location: each colour the Arabic's letters were drawn in, in the first frame the Word card's Arabic existed. */
type FirstFrames = Record<string, string[]>;

/**
 * Record, for every Allah reference in the seeded list, the colours of its
 * Arabic's letters in the first animation frame in which its Word card's
 * Arabic exists (just before the browser paints it). Installed before any of
 * the page's scripts on every load of `page`.
 */
async function watchFirstFrames(page: Page) {
  const words = seededAllahReferences().map((location) => {
    const surah = Number(location.split(":")[0]);
    const word = sourceWords(surah).find((w) => w.location === location);
    if (!word) throw new Error(`the QUL sources have no Word at ${location}`);
    return { location, arabic: [word.uthmani, indopakText(location)] };
  });
  await page.addInitScript((words: { location: string; arabic: string[] }[]) => {
    const w = window as unknown as { __allahFirstFrames?: Record<string, string[]> };
    const seen: Record<string, string[]> = (w.__allahFirstFrames = {});
    /** The Word card's Arabic at `location`, once it exists. */
    const arabicAt = (location: string, arabic: string[]) => {
      const card = document.getElementById(location);
      return card && Array.from(card.children).find((c) => c.tagName !== "BUTTON" && arabic.includes(c.textContent ?? ""));
    };
    /** Each colour the letters under `ar` are drawn in. */
    const letterColours = (ar: Element) => {
      const colours = new Set<string>();
      const walk = document.createTreeWalker(ar, NodeFilter.SHOW_TEXT);
      for (let n = walk.nextNode(); n; n = walk.nextNode()) if (n.textContent?.trim()) colours.add(getComputedStyle(n.parentElement!).color);
      return Array.from(colours);
    };
    const look = () => {
      for (const { location, arabic } of words) {
        const ar = seen[location] ? null : arabicAt(location, arabic);
        if (ar) seen[location] = letterColours(ar);
      }
      if (document.readyState !== "complete" || Object.keys(seen).length < words.length) requestAnimationFrame(look);
    };
    requestAnimationFrame(look);
  }, words);
}

const watched = new WeakSet<Page>();
async function watching(page: Page) {
  if (watched.has(page)) return;
  await watchFirstFrames(page);
  watched.add(page);
}

/** The first frame of every seeded Allah reference of Surah `surah`, once each was drawn. */
async function firstFrames(page: Page, surah: number): Promise<FirstFrames> {
  const locations = seededIn(surah);
  await page.waitForLoadState("load");
  let seen: FirstFrames = {};
  await expect
    .poll(async () => {
      seen = await page.evaluate(() => (window as unknown as { __allahFirstFrames?: FirstFrames }).__allahFirstFrames ?? {});
      return locations.filter((l) => !(l in seen));
    }, { message: "Allah references not yet drawn" })
    .toEqual([]);
  return Object.fromEntries(locations.map((l) => [l, seen[l]]));
}

When("I reload the page, watching the first frame each Allah reference is drawn in", async ({ reader }) => {
  await watching(reader.page);
  await reader.page.reload();
});

When("I open {string}, watching the first frame each Allah reference is drawn in", async ({ reader, reading }, address: string) => {
  await watching(reader.page);
  reading.status = (await reader.page.goto(address))?.status();
});

Then(
  "no Allah reference of Surah {int} in the seeded list was gold in the first frame it was drawn in",
  async ({ reader }, surah: number) => {
    const frames = await firstFrames(reader.page, surah);
    const gold = Object.entries(frames)
      .filter(([, colours]) => colours.some((c) => GOLDS.includes(c)))
      .map(([location, colours]) => `${location}: ${colours.join(", ")}`);
    expect(gold, "Allah references gold in their first frame").toEqual([]);
  },
);

Then(
  "every Allah reference of Surah {int} in the seeded list was already gold in the first frame it was drawn in",
  async ({ reader }, surah: number) => {
    const frames = await firstFrames(reader.page, surah);
    const gold = await goldOnPage(reader.page);
    expect(frames).toEqual(Object.fromEntries(Object.keys(frames).map((l) => [l, [gold]])));
  },
);

// ---------------------------------------------------------------- the Account

/** Every request a browser sent to the site's API since noting began: its method, address and body. */
interface SentRequest {
  method: string;
  url: string;
  body: string | null;
}
const sentBy = new WeakMap<Reading, SentRequest[]>();

Given("I note every request either browser sends to the site's API", async ({ reading }) => {
  const browsers = reading.browsers;
  if (!browsers) throw new Error("no two browsers in this scenario");
  const sent: SentRequest[] = [];
  sentBy.set(reading, sent);
  const note = (request: Request) => {
    if (new URL(request.url()).pathname.startsWith("/api/")) sent.push({ method: request.method(), url: request.url(), body: request.postData() });
  };
  for (const page of [browsers.first, browsers.second]) page.context().on("request", note);
});

Then("the Account's synced settings name no Allah reference colour", async ({ reader }) => {
  const response = await reader.page.request.get("/api/v1/settings");
  expect(response.status(), "GET /api/v1/settings while signed in").toBe(200);
  const settings = await response.json();
  expect(Object.keys(settings).sort(), "the Account's synced settings").toEqual(["language", "script"]);
});

Then("no request either browser sent to the site's API named Allah reference colour", async ({ reading }) => {
  const sent = sentBy.get(reading);
  expect(sent, "requests noted earlier in the scenario").toBeDefined();
  const naming = sent!.filter((r) => /allah/i.test(`${r.url} ${r.body ?? ""}`)).map((r) => `${r.method} ${r.url} ${r.body ?? ""}`);
  expect(naming, "requests to the site's API naming Allah reference colour").toEqual([]);
});
