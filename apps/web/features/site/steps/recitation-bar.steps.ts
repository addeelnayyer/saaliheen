// Steps for the Recitation bar (#110): the previous and next Ayah, stop, the
// Recitation speed, and loading and unavailable. The Surah's audio is stubbed
// as in recitation.steps.ts; a step here can put a stub of its own in front of
// that one (Playwright tries the last route added first): one that sends the
// audio only part of the way and holds the rest back until a later step lets
// it through, as a slow network does, or one that fails every request for it,
// as when the browser is offline or the CDN is down.

import { expect, type Page, type Route } from "@playwright/test";
import type { DataTable } from "playwright-bdd";
import { sourceRecitedAyah, STRINGS, surahMeta } from "../support";
import { Given, Then, When } from "./fixtures";
import { RATE, audioAsked, audioState, forgetRecited, fulfillRange, noted, reach, recitationBar, timedWord } from "./recitation.steps";

const CDN = "https://audio-cdn.tarteel.ai/**";

// ---------------------------------------------------------------- the audio, part of the way or not at all

/** The middle of an Ayah's `nth` timing, in ms of its Surah's audio. */
const middleOf = (ayah: string, nth: number) => {
  const [, from, to] = sourceRecitedAyah(ayah).timings[nth - 1];
  return Math.round((from + to) / 2);
};

/** Each page's stub put in front of the plain one, and what lets its held-back requests through. */
const stubs = new WeakMap<Page, { route: (route: Route) => Promise<void>; release?: () => void }>();

/**
 * Serves Surah audio only up to `ms` into it; a request for anything past that
 * (but its last bytes) waits until `held` resolves, then gets it. The audio is
 * moved only to well before where its data ends: the browser finishes a seek
 * once it holds a few seconds of audio past it.
 */
function partway(ms: number, held: Promise<void>) {
  const limit = 44 + Math.floor((ms / 1000) * RATE); // the WAV's header, then one byte a sample
  return async (route: Route) => {
    const asked = await audioAsked(route);
    if (!asked) return route.abort();
    const { file, start } = asked;
    let { end } = asked;
    // The file's last bytes come at once: the browser reads its end before it plays.
    if (start >= limit && start < file.length - 4096) await held;
    else end = Math.min(end, limit - 1);
    return fulfillRange(route, file, start, end);
  };
}

async function putInFront(page: Page, route: (route: Route) => Promise<void>, release?: () => void) {
  stubs.set(page, { route, release });
  await page.route(CDN, route);
}

async function takeAway(page: Page) {
  const stub = stubs.get(page);
  if (!stub) throw new Error("no stub in front of the Surah audio");
  stub.release?.();
  await page.unroute(CDN, stub.route);
  stubs.delete(page);
}

Given("the Surah audio arrives only as far as the middle of {word}'s timing {int}, the rest held back", async ({ reader: { page } }, ayah: string, nth: number) => {
  let release!: () => void;
  const held = new Promise<void>((done) => (release = done));
  await putInFront(page, partway(middleOf(ayah, nth), held), release);
});

When("the rest of the Surah audio arrives", async ({ reader: { page } }) => {
  await takeAway(page);
});

Given("the Surah audio cannot be reached, as when the browser is offline", async ({ reader: { page } }) => {
  await putInFront(page, (route) => route.abort("internetdisconnected"));
});

Given("the Surah audio is answered with a server error, as when the CDN is down", async ({ reader: { page } }) => {
  await putInFront(page, (route) => route.fulfill({ status: 503, headers: { "access-control-allow-origin": "*" }, body: "Service Unavailable" }));
});

When("the Surah audio can be reached again", async ({ reader: { page } }) => {
  await takeAway(page);
});

// ---------------------------------------------------------------- the Recitation bar's controls

const control = (page: Page, name: string) => recitationBar(page).getByRole("button", { name, exact: true });
const speedControl = (page: Page) => recitationBar(page).getByRole("combobox", { name: STRINGS.recitationSpeed, exact: true });

/** Presses a control of the Recitation bar, once it is there. */
async function press(page: Page, name: string) {
  await expect(control(page, name), `the Recitation bar's "${name}" button`).toBeVisible();
  await control(page, name).click();
}

When("I press the Recitation bar's next Ayah button", async ({ reader: { page } }) => {
  await forgetRecited(page);
  await press(page, STRINGS.nextAyah);
});

When("I press the Recitation bar's previous Ayah button", async ({ reader: { page } }) => {
  await forgetRecited(page);
  await press(page, STRINGS.previousAyah);
});

When("I press the Recitation bar's stop button", async ({ reader: { page } }) => {
  await press(page, STRINGS.stopRecitation);
});

When("I press the Recitation bar's try again button", async ({ reader: { page } }) => {
  await forgetRecited(page);
  await press(page, STRINGS.tryAgain);
});

Then("the Recitation bar's previous Ayah button is disabled, and its next Ayah button is not", async ({ reader: { page } }) => {
  await expect(control(page, STRINGS.previousAyah)).toBeDisabled();
  await expect(control(page, STRINGS.nextAyah)).toBeEnabled();
});

Then("the Recitation bar's next Ayah button is disabled, and its previous Ayah button is not", async ({ reader: { page } }) => {
  await expect(control(page, STRINGS.nextAyah)).toBeDisabled();
  await expect(control(page, STRINGS.previousAyah)).toBeEnabled();
});

// ---------------------------------------------------------------- the Recited Word and the marks

/** The Word card marked now as the Recited Word, by its Word location; null when none is. */
const markedCard = (page: Page) =>
  page.locator("[data-recited]").evaluateAll((els) => els.map((el) => el.id).find((id) => /^\d+:\d+:\d+$/.test(id)) ?? null);

// Read from the Words noted as marked since the press, not the mark now: a
// Word said for under a second can come and go between two looks.
Then("the Recited Word is the first Word the Reciter says in Ayah {word}", async ({ reader: { page } }, ayah: string) => {
  const firstIn = async () => (await noted(page, (l) => l.recited)).find((location) => location.startsWith(`${ayah}:`)) ?? null;
  await expect.poll(firstIn).toBe(timedWord(ayah, 1));
});

Then("a Word card and its Ayah are marked", async ({ reader: { page } }) => {
  await expect.poll(() => markedCard(page)).not.toBeNull();
  const card = (await markedCard(page))!;
  const ayah = card.split(":").slice(0, 2).join(":");
  await expect(page.locator(`[id="${ayah}"]`)).toHaveAttribute("data-recited", "");
});

/** The Word card the mark held on while the audio waited, by page. */
const held = new WeakMap<Page, string>();

/** The Word the Reciter last began to say at `ms` into Surah `surah`'s audio, by its Word location. */
function wordSaidAt(surah: number, ms: number): string | null {
  let said: string | null = null;
  for (let ayah = 1; ayah <= surahMeta(surah).verses_count; ayah++) {
    const { from, timings } = sourceRecitedAyah(`${surah}:${ayah}`);
    if (from > ms) break;
    for (const [word, start] of timings) if (start <= ms) said = `${surah}:${ayah}:${word}`;
  }
  return said;
}

Then(
  "for {int} seconds, while the audio waits, the mark holds on the Word the Reciter last said and its Ayah, and nothing else is marked",
  async ({ reader: { page }, reading }, seconds: number) => {
    const marked = () => page.locator("[data-recited]").evaluateAll((els) => els.map((el) => el.id).toSorted());
    const at = (await audioState(page))!.ms;
    const word = wordSaidAt(reading.surah!, at);
    expect(word, `a Word said by ${Math.round(at)} ms`).not.toBeNull();
    const expected = [word!, word!.split(":").slice(0, 2).join(":")].toSorted();
    await expect.poll(marked).toEqual(expected);
    // The audio waits where it is, and the mark holds there, never moving on nor coming off.
    const until = Date.now() + seconds * 1000;
    while (Date.now() < until) {
      expect(await marked()).toEqual(expected);
      expect((await audioState(page))!.ms).toBeCloseTo(at, -2);
      await page.waitForTimeout(100);
    }
    held.set(page, word!);
  },
);

Then("the Recited Word moves on from the Word the mark held on", async ({ reader: { page } }) => {
  const word = held.get(page)!;
  await expect.poll(() => markedCard(page), { timeout: 10_000 }).not.toBe(word);
  // On, not back: the held Word is among the marks, and Words came after it.
  const recited = await noted(page, (l) => l.recited);
  expect(recited).toContain(word);
  expect(recited.length - recited.lastIndexOf(word)).toBeGreaterThanOrEqual(2);
});

When("the Recitation reaches {int} seconds before the middle of {word}'s timing {int}", async ({ reader: { page } }, seconds: number, ayah: string, nth: number) => {
  await reach(page, middleOf(ayah, nth) - seconds * 1000);
});

// ---------------------------------------------------------------- stopping

Then("the Recitation has stopped, its audio no longer moving on", async ({ reader: { page } }) => {
  await expect.poll(() => audioState(page)).toMatchObject({ playing: false });
  const { ms } = (await audioState(page))!;
  await page.waitForTimeout(500);
  expect((await audioState(page))!.ms).toBe(ms);
});

Then("the Surah bar's play button is on screen", async ({ reader: { page } }) => {
  await expect(page.getByRole("button", { name: STRINGS.listenFrom })).toBeInViewport();
});

// ---------------------------------------------------------------- loading and unavailable

Then("the Recitation bar says it is loading", async ({ reader: { page } }) => {
  await expect(recitationBar(page)).toBeInViewport();
  await expect(recitationBar(page).getByText(STRINGS.recitationLoading, { exact: true })).toBeVisible();
});

Then("the Recitation bar no longer says it is loading", async ({ reader: { page } }) => {
  await expect(recitationBar(page).getByText(STRINGS.recitationLoading, { exact: true })).toHaveCount(0);
});

Then("the Recitation bar says the Recitation is unavailable right now, and offers to try again", async ({ reader: { page } }) => {
  await expect(recitationBar(page)).toBeInViewport();
  await expect(recitationBar(page).getByText(STRINGS.recitationUnavailable)).toBeVisible();
  await expect(control(page, STRINGS.tryAgain)).toBeVisible();
});

Then("the Recitation bar shows what it says in full, nothing cut off, and the page does not scroll sideways", async ({ reader: { page } }) => {
  const status = recitationBar(page).locator("[aria-live]");
  await expect(status).toBeVisible();
  await expect(status).toBeInViewport({ ratio: 1 });
  const said = await status.evaluate((el) => ({ text: el.textContent, cut: el.scrollWidth > el.clientWidth || el.scrollHeight > el.clientHeight + 1 }));
  expect(said.cut, `the Recitation bar's "${said.text}" is cut off`).toBe(false);
  const sideways = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(sideways, "the page scrolls sideways").toBeLessThanOrEqual(0);
});

// ---------------------------------------------------------------- the Recitation speed

/** The Recitation speed shown as chosen. */
const chosenSpeed = (page: Page) => speedControl(page).evaluate((el) => (el as HTMLSelectElement).selectedOptions[0]?.textContent?.trim() ?? null);

/** `1.25×` as the rate the audio plays at. */
const rate = (speed: string) => {
  const m = /^(\d+(?:\.\d+)?)×$/.exec(speed);
  if (!m) throw new Error(`no Recitation speed "${speed}"`);
  return Number(m[1]);
};

Then("the Recitation bar's Recitation speed offers, in order:", async ({ reader: { page } }, table: DataTable) => {
  const speeds = table.raw().map(([speed]) => speed);
  await expect(speedControl(page).getByRole("option")).toHaveText(speeds);
});

When("I choose the Recitation speed {word}", async ({ reader: { page } }, speed: string) => {
  await expect(speedControl(page), "the Recitation bar's Recitation speed").toBeVisible();
  await speedControl(page).selectOption({ label: speed });
});

Then("the Recitation speed is {word}, and the Recitation plays at {word}", async ({ reader: { page } }, shown: string, speed: string) => {
  expect(shown).toBe(speed);
  await expect.poll(() => chosenSpeed(page)).toBe(speed);
  await expect.poll(() => audioState(page)).toMatchObject({ playing: true });
  await expect.poll(() => noted(page, (l) => l.recitation?.playbackRate ?? null)).toBe(rate(speed));
});
