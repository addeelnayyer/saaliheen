// Steps for listening to a Surah (#115). The Surah's audio is stubbed: the
// browser's requests for it from Tarteel's CDN are answered with silence, a WAV
// as long as the Surah's Recitation (or its first minutes), served in ranges as
// a CDN serves audio so the browser can move about in it. The Recitation plays
// on the browser's own clock; a step that moves it on sets the audio's time,
// as a reader dragging a player's slider would. The page's audio element is
// never in the document, so a script the browser runs before the page notes
// the one that plays, and notes each Word card as it becomes the Recited Word.
// Every step acts on the browser the reader is looking at (`reader.page`), so a
// Recitation can play in one of two signed-in browsers (#111).

import { expect, type Page, type Route } from "@playwright/test";
import { ayahSection, ayahSections, card, clickInPlace, nextFrames, sourceRecitedAyah, sourceWord, STRINGS, surahMeta } from "../support";
import { bismillah } from "./reader";
import { Given, Then, When } from "./fixtures";

/** What the script run before the page notes, on `window`. */
interface Listening {
  /** The audio element the page last played. */
  recitation?: HTMLAudioElement;
  /** Each Word card that became the Recited Word, by its Word location, in turn since the last press of play. */
  recited: string[];
  /** Where the audio was, in seconds, when it ended; unset until it ends. */
  endedAt?: number;
}

// ---------------------------------------------------------------- the audio

export const RATE = 8000;
/** The stub's longest audio: enough for every scenario here, small enough to make at once. */
const LONGEST_MS = 5 * 60_000;

/** `ms` of silence as a WAV file: 8-bit mono PCM, whose silence is 0x80. */
function silence(ms: number): Buffer {
  const samples = Math.ceil((ms / 1000) * RATE);
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + samples, 4);
  header.write("WAVEfmt ", 8);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(1, 22); // mono
  header.writeUInt32LE(RATE, 24);
  header.writeUInt32LE(RATE, 28); // bytes per second
  header.writeUInt16LE(1, 32); // bytes per sample
  header.writeUInt16LE(8, 34); // bits per sample
  header.write("data", 36);
  header.writeUInt32LE(samples, 40);
  return Buffer.concat([header, Buffer.alloc(samples, 0x80)]);
}

/** Where Surah `surah`'s Recitation ends in its audio: the end of its last Ayah, in ms. */
const recitationEnd = (surah: number) => sourceRecitedAyah(`${surah}:${surahMeta(surah).verses_count}`).to;

const audioFiles = new Map<number, Buffer>();
const audioFile = (surah: number) => {
  if (!audioFiles.has(surah)) audioFiles.set(surah, silence(Math.min(recitationEnd(surah), LONGEST_MS)));
  return audioFiles.get(surah)!;
};

/** What a request for a Surah's audio asks for: its file, and the bytes, all of them when no range is asked; null for no Surah. */
export async function audioAsked(route: Route) {
  const surah = Number(/(\d{3})\.mp3$/.exec(new URL(route.request().url()).pathname)?.[1]);
  if (!surah) return null;
  const file = audioFile(surah);
  const range = /^bytes=(\d+)-(\d*)$/.exec((await route.request().headerValue("range")) ?? "");
  const start = range ? Number(range[1]) : 0;
  const end = Math.min(range?.[2] ? Number(range[2]) : file.length - 1, file.length - 1);
  return { file, ranged: !!range, start, end };
}

const AUDIO_HEADERS = { "content-type": "audio/wav", "accept-ranges": "bytes", "access-control-allow-origin": "*" };

/** Answers with bytes `start` to `end` of `file`. */
export const fulfillRange = (route: Route, file: Buffer, start: number, end: number) =>
  route.fulfill({
    status: 206,
    headers: { ...AUDIO_HEADERS, "content-range": `bytes ${start}-${end}/${file.length}` },
    body: file.subarray(start, end + 1),
  });

/** Answers a request for a Surah's audio, the whole file or the range of it asked for. */
async function serveAudio(route: Route) {
  const asked = await audioAsked(route);
  if (!asked) return route.abort();
  const { file, ranged, start, end } = asked;
  if (!ranged) return route.fulfill({ status: 200, headers: AUDIO_HEADERS, body: file });
  return fulfillRange(route, file, start, end);
}

/** Notes, before the page runs, the audio element it plays and each Word card it marks as the Recited Word. */
function noteTheRecitation() {
  const listening = window as unknown as Listening;
  listening.recited = [];
  const play = HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play = function (this: HTMLAudioElement) {
    if (listening.recitation !== this) {
      listening.recitation = this;
      this.addEventListener("ended", () => (listening.endedAt = this.currentTime));
    }
    return play.call(this);
  };
  new MutationObserver((records) => {
    for (const { target } of records) {
      const el = target as Element;
      if (/^\d+:\d+:\d+$/.test(el.id) && el.hasAttribute("data-recited") && listening.recited.at(-1) !== el.id) listening.recited.push(el.id);
    }
  }).observe(document, { subtree: true, attributes: true, attributeFilter: ["data-recited"] });
}

/** Reads something from what the page noted, handing `read` a string from the step. */
export async function noted<T>(page: Page, read: (l: Listening, arg: string) => T, arg = ""): Promise<T> {
  const notes = await page.evaluateHandle(() => window as unknown as Listening);
  return notes.evaluate(read, arg);
}

/** Where the page's Recitation is, in ms of its Surah's audio, and whether it is playing. */
export const audioState = (page: Page) =>
  noted(page, (l) => (l.recitation ? { ms: l.recitation.currentTime * 1000, playing: !l.recitation.paused } : null));

/** Moves the Recitation to `ms`, and waits until the audio is there. */
export async function reach(page: Page, ms: number) {
  await page.evaluate(
    (at) =>
      new Promise<void>((done) => {
        const audio = (window as unknown as Listening).recitation!;
        audio.addEventListener("seeked", () => done(), { once: true });
        audio.currentTime = at / 1000;
      }),
    ms,
  );
}

/** The Word location of an Ayah's `nth` timing, counting from 1 in the order the Reciter says them. */
export const timedWord = (ayah: string, nth: number) => `${ayah}:${sourceRecitedAyah(ayah).timings[nth - 1][0]}`;

/** Locations in turn, a Word said twice running counting once, as the marks change. */
const inTurn = (locations: string[]) => locations.filter((l, k) => l !== locations[k - 1]);

// ---------------------------------------------------------------- steps

Given("the Surah audio is served as silence as long as each Surah's Recitation, or its first {int} minutes", async ({ reader: { page } }, minutes: number) => {
  expect(minutes * 60_000).toBe(LONGEST_MS);
  await page.route("https://audio-cdn.tarteel.ai/**", serveAudio);
  await page.addInitScript(noteTheRecitation);
});

export const recitationBar = (page: Page) => page.getByRole("region", { name: STRINGS.recitationBar, exact: true });

/** Forgets the Words marked so far, so the next step reads only those marked after this press. */
export const forgetRecited = (page: Page) => page.evaluate(() => void ((window as unknown as Listening).recited = []));

When("I press the Surah bar's play button", async ({ reader: { page } }) => {
  await forgetRecited(page);
  await clickInPlace(page.getByRole("button", { name: STRINGS.listenFrom }));
});

When("I press the Recitation bar's pause button", async ({ reader: { page } }) => {
  await recitationBar(page).getByRole("button", { name: STRINGS.pause, exact: true }).click();
});

When("I press the Recitation bar's play button", async ({ reader: { page } }) => {
  await recitationBar(page).getByRole("button", { name: STRINGS.play, exact: true }).click();
});

Then("the Recitation bar is on screen, offering to pause", async ({ reader: { page } }) => {
  await expect(recitationBar(page)).toBeInViewport();
  await expect(recitationBar(page).getByRole("button", { name: STRINGS.pause, exact: true })).toBeVisible();
});

Then("the Recitation bar is not on screen", async ({ reader: { page } }) => {
  await expect(recitationBar(page)).toHaveCount(0);
});

Then("the Recitation plays from the start of Ayah {word}", async ({ reader: { page } }, ayah: string) => {
  const { from } = sourceRecitedAyah(ayah);
  await expect.poll(() => audioState(page)).toMatchObject({ playing: true });
  // It started there, never before: still within the Ayah's first moments.
  const { ms } = (await audioState(page))!;
  expect(ms).toBeGreaterThanOrEqual(from);
  expect(ms).toBeLessThan(from + 3000);
});

When("the Recitation is playing", async ({ reader: { page } }) => {
  // A Radix dialog over the page (the Root dialog, #302, or the Settings drawer, #305) hides the bar from the accessibility tree.
  const underDialog = (await page.getByRole("dialog").count()) > 0;
  await expect(recitationBar(page).getByRole("button", { name: STRINGS.pause, exact: true, includeHidden: underDialog })).toBeVisible();
  await expect.poll(() => audioState(page)).toMatchObject({ playing: true });
  const { ms } = (await audioState(page))!;
  // The audio's clock runs on.
  await expect.poll(async () => (await audioState(page))!.ms).toBeGreaterThan(ms);
});

Then("the Recitation is paused, and the Recitation bar offers to play", async ({ reader: { page } }) => {
  await expect(recitationBar(page).getByRole("button", { name: STRINGS.play, exact: true })).toBeVisible();
  await expect.poll(() => audioState(page)).toMatchObject({ playing: false });
});

Then("the first Recited Word is the first Word the Reciter says in Ayah {word}", async ({ reader: { page } }, ayah: string) => {
  await expect.poll(() => noted(page, (l) => l.recited[0])).toBe(timedWord(ayah, 1));
});

Then("the Bismillah line is not marked", async ({ reader: { page } }) => {
  const line = page
    .getByText(bismillah("uthmani"), { exact: true })
    .or(page.getByText(bismillah("indopak"), { exact: true }))
    .locator("visible=true");
  await expect(line).toBeVisible();
  // A Word is marked, and the Bismillah line is not, nor anything holding it.
  await expect(page.locator("[data-recited]")).not.toHaveCount(0);
  expect(await line.evaluate((el) => el.closest("[data-recited]") === null && el.querySelector("[data-recited]") === null)).toBe(true);
});

When(
  "the Recitation reaches {int} second(s) before the end of Ayah {word}, the last of the Surah",
  async ({ reader: { page } }, seconds: number, ayah: string) => {
    const [surah, last] = ayah.split(":").map(Number);
    expect(last, `Ayah ${ayah} ends Surah ${surah}`).toBe(surahMeta(surah).verses_count);
    await reach(page, sourceRecitedAyah(ayah).to - seconds * 1000);
  },
);

When("the Recitation reaches the start of {word}'s timing {int}", async ({ reader: { page } }, ayah: string, nth: number) => {
  await reach(page, sourceRecitedAyah(ayah).timings[nth - 1][1]);
});

Then("the Recitation stops at the end of the Surah", async ({ reader: { page }, reading }) => {
  await expect.poll(() => noted(page, (l) => l.endedAt ?? null), { timeout: 5000 }).not.toBeNull();
  const endedAt = (await noted(page, (l) => l.endedAt!)) * 1000;
  expect(endedAt).toBeGreaterThanOrEqual(recitationEnd(reading.surah!) - 50);
});

Then("no Word card and no Ayah is marked", async ({ reader: { page } }) => {
  await expect(page.locator("[data-recited]")).toHaveCount(0);
});

Then("the Recited Word moves through every timing of Ayah {word} in turn", async ({ reader: { page } }, ayah: string) => {
  const expected = inTurn(sourceRecitedAyah(ayah).timings.map(([word]) => `${ayah}:${word}`));
  await expect.poll(() => noted(page, (l) => l.recited.length), { timeout: 15_000 }).toBeGreaterThanOrEqual(expected.length);
  expect((await noted(page, (l) => l.recited)).slice(0, expected.length)).toEqual(expected);
});

Then("the Recited Word moves through {word}'s timings {int} to {int} in turn", async ({ reader: { page } }, ayah: string, first: number, last: number) => {
  const expected = inTurn(Array.from({ length: last - first + 1 }, (_, k) => timedWord(ayah, first + k)));
  await expect.poll(() => noted(page, (l) => l.recited.at(-1)), { timeout: 15_000 }).toBe(expected.at(-1));
  // The marks before it, in turn, end with the Words these timings time.
  expect((await noted(page, (l) => l.recited)).slice(-expected.length)).toEqual(expected);
});

Then("only the Recited Word's card and its Ayah are marked", async ({ reader: { page } }) => {
  const marked = await page.locator("[data-recited]").evaluateAll((els) => els.map((el) => el.id));
  const cards = marked.filter((id) => /^\d+:\d+:\d+$/.test(id));
  expect(cards).toHaveLength(1);
  const ayah = cards[0].split(":").slice(0, 2).join(":");
  expect(marked.toSorted()).toEqual([cards[0], ayah].toSorted());
  await expect(ayahSections(page).filter({ has: page.locator(`[id="${cards[0]}"]`) })).toHaveAttribute("id", ayah);
});

Then("the Recited Word's card is still marked", async ({ reader: { page } }) => {
  const recited = await noted(page, (l) => l.recited.at(-1)!);
  await expect(page.locator(`[id="${recited}"]`)).toHaveAttribute("data-recited", "");
});

/** Each Word card's background and border colour, noted before the Recitation played. */
const unmarked = new WeakMap<Page, Record<string, { background: string; border: string }>>();

Given("I note the background and border of every Word card", async ({ reader: { page } }) => {
  const cards = await page.locator("main section[id] [id]").evaluateAll((els) =>
    els.filter((el) => /^\d+:\d+:\d+$/.test(el.id)).map((el) => [el.id, { background: getComputedStyle(el).backgroundColor, border: getComputedStyle(el).borderTopColor }] as const),
  );
  expect(cards.length).toBeGreaterThan(0);
  unmarked.set(page, Object.fromEntries(cards));
});

Then("the Recited Word's card keeps the background it had before, and its border is the mark's", async ({ reader: { page } }) => {
  const before = unmarked.get(page)!;
  // Read at once, while it is the Recited Word; its border eases into the mark's colour.
  await expect
    .poll(async () => {
      // The marked Word card, not its Ayah.
      const { id, background, border } = await page.locator("[data-recited]").evaluateAll((els) => {
        const el = els.find((e) => /^\d+:\d+:\d+$/.test(e.id))!;
        return { id: el.id, background: getComputedStyle(el).backgroundColor, border: getComputedStyle(el).borderTopColor };
      });
      return { "same background": before[id]?.background === background, "border changed": before[id]?.border !== border };
    })
    .toEqual({ "same background": true, "border changed": true });
});

// ---------------------------------------------------------------- #109: from any Ayah, from a Word, following

/** The button in Ayah `ayah`'s heading, beside its number, that listens from it. */
const listenFromAyah = (page: Page, ayah: string) =>
  ayahSection(page, ayah).getByRole("heading").getByRole("button", { name: STRINGS.listenFromAyah(ayah), exact: true });

/** The button that takes the page back to the Recited Word, once it has stopped following it. */
const backToRecitedWord = (page: Page) => page.getByRole("button", { name: STRINGS.backToRecitedWord, exact: true });

/** The Word card marked as the Recited Word now. */
export const recitedCard = (page: Page) => page.locator("main section[id] [id][data-recited]");

/** Where the Reciter first says the Word at `location` in its Ayah, in ms of the Surah's audio. */
function firstSaid(location: string): number {
  const [s, a, w] = location.split(":").map(Number);
  const timing = sourceRecitedAyah(`${s}:${a}`).timings.find(([word]) => word === w);
  if (!timing) throw new Error(`the Recitation source never times the Word at ${location}`);
  return timing[1];
}

/** Whether the Recited Word's card is wholly on screen and nothing (the Surah bar, the Recitation bar) lies over its top or its bottom. */
export const recitedCardInSight = (page: Page) =>
  recitedCard(page).evaluateAll((els) => {
    if (els.length !== 1) return `${els.length} Word cards marked`;
    const el = els[0];
    const r = el.getBoundingClientRect();
    if (r.top < 0 || r.bottom > innerHeight || r.left < 0 || r.right > innerWidth) return `${el.id} is not wholly on screen`;
    const x = r.left + r.width / 2;
    for (const y of [r.top + 2, r.bottom - 2]) {
      const over = document.elementFromPoint(x, y);
      if (!over || !el.contains(over)) return `${el.id} lies under ${over?.tagName ?? "nothing"} at ${Math.round(y)}px`;
    }
    return "in sight";
  });

/** Where the reader left the page by hand, by page. */
const scrolledTo = new WeakMap<Page, number>();

Then("every Ayah of Surah {int} offers to listen from it in its heading, beside its number", async ({ reader: { page } }, surah: number) => {
  const count = surahMeta(surah).verses_count;
  for (let n = 1; n <= count; n++) {
    const heading = ayahSection(page, `${surah}:${n}`).getByRole("heading");
    await expect(heading.getByText(STRINGS.ayah(n), { exact: true }), `Ayah ${surah}:${n}'s number`).toBeVisible();
    await expect(listenFromAyah(page, `${surah}:${n}`), `listen from Ayah ${surah}:${n}`).toBeVisible();
  }
  await expect(page.getByRole("button", { name: /^Listen from Ayah \d+:\d+$/ })).toHaveCount(count);
});

/** Releases the Word timings held back from the page, by page. */
const heldTimings = new WeakMap<Page, () => void>();

Given("the Recitation's Word timings are held back on their way to the page", async ({ reader: { page } }) => {
  let release!: () => void;
  const released = new Promise<void>((done) => (release = done));
  heldTimings.set(page, release);
  await page.route("**/data/v1/recitations/*.json", async (route) => {
    await released;
    await route.continue();
  });
});

When("the Recitation's Word timings arrive", async ({ reader: { page } }) => {
  // Asked for by the press of play, and held until now: the tap came before them.
  const arrived = page.waitForResponse((response) => /\/data\/v1\/recitations\/\d+\.json$/.test(response.url()));
  heldTimings.get(page)!();
  expect((await arrived).ok()).toBe(true);
});

When("I press listen from Ayah {word}", async ({ reader: { page } }, ayah: string) => {
  await page.evaluate(() => void ((window as unknown as Listening).recited = []));
  const button = listenFromAyah(page, ayah);
  await expect(button, `listen from Ayah ${ayah}, in its heading`).toHaveCount(1);
  await button.scrollIntoViewIfNeeded();
  await clickInPlace(button);
});

Then("the Recited Word moves to the first Word the Reciter says in Ayah {word}", async ({ reader: { page } }, ayah: string) => {
  // The first Word of that Ayah marked since the press; Words after it may follow as it plays on.
  await expect.poll(() => noted(page, (l, a) => l.recited.find((loc) => loc.startsWith(`${a}:`)) ?? null, ayah)).toBe(timedWord(ayah, 1));
});

When("I tap the Word card at {location}, away from its Root tag", async ({ reader: { page } }, location: string) => {
  await page.evaluate(() => void ((window as unknown as Listening).recited = []));
  const arabic = card(page, location).getByText(sourceWord(location).uthmani, { exact: true });
  await arabic.scrollIntoViewIfNeeded();
  await clickInPlace(arabic);
});

Then("the Recitation plays on from where the Reciter first says the Word at {location}", async ({ reader: { page } }, location: string) => {
  const from = firstSaid(location);
  // Playing, from that Word's start, not before it and not long after.
  await expect
    .poll(async () => {
      const state = await audioState(page);
      return state ? { playing: state.playing, "from the Word": state.ms >= from - 50 && state.ms < from + 3000 } : null;
    })
    .toEqual({ playing: true, "from the Word": true });
});

Then("the Recited Word is the Word at {location}", async ({ reader: { page } }, location: string) => {
  // Marked since the tap: it may be marked only briefly, as the Recitation plays on.
  await expect.poll(() => noted(page, (l, at) => l.recited.includes(at), location)).toBe(true);
});

Then("the Recitation has not moved on to Ayah {word}", async ({ reader: { page } }, ayah: string) => {
  const state = await audioState(page);
  expect(state, "a Recitation playing").not.toBeNull();
  expect(state!.ms).toBeLessThan(sourceRecitedAyah(ayah).from);
});

Then("the Recitation has stopped", async ({ reader: { page } }) => {
  // A page loaded afresh has no audio at all; one reached inside the app keeps the old, which must be paused and still.
  await expect.poll(async () => (await audioState(page))?.playing ?? false).toBe(false);
  const before = await audioState(page);
  await page.waitForTimeout(500);
  expect(await audioState(page)).toEqual(before);
});

Then("the Recited Word is a Word of Ayah {word}", async ({ reader: { page } }, ayah: string) => {
  await expect.poll(() => noted(page, (l) => l.recited.at(-1) ?? null)).toMatch(new RegExp(`^${ayah}:\\d+$`));
});

Then("the Recited Word's card is on screen, clear of the Surah bar and the Recitation bar", async ({ reader: { page } }) => {
  await expect.poll(() => recitedCardInSight(page)).toBe("in sight");
});

Then("the Recited Word's card is not on screen", async ({ reader: { page } }) => {
  await expect(recitedCard(page)).toHaveCount(1);
  await expect(recitedCard(page)).not.toBeInViewport();
});

Then("the Recited Word's card stays on screen as the Recitation plays on through {int} more Words", async ({ reader: { page } }, more: number) => {
  const start = await noted(page, (l) => l.recited.length);
  for (let k = 1; k <= more; k++) {
    await expect.poll(() => noted(page, (l) => l.recited.length), { timeout: 15_000 }).toBeGreaterThanOrEqual(start + k);
    await expect.poll(() => recitedCardInSight(page)).toBe("in sight");
  }
});

Then("there is no button to go back to the Recited Word", async ({ reader: { page } }) => {
  await expect(backToRecitedWord(page)).not.toBeVisible();
});

Then("a button to go back to the Recited Word is on screen", async ({ reader: { page } }) => {
  await expect(backToRecitedWord(page)).toBeInViewport();
});

When("I press the button to go back to the Recited Word", async ({ reader: { page } }) => {
  await clickInPlace(backToRecitedWord(page));
});

/** Scrolls the page by `dy` pixels with the mouse wheel, as a reader does by hand, and notes where it settles. */
async function scrollByHand(page: Page, dy: number) {
  const { width, height } = page.viewportSize()!;
  await page.mouse.move(width / 2, height / 2);
  await page.mouse.wheel(0, dy);
  // Settled once the scroll position holds for a few frames.
  let last = -1;
  await expect
    .poll(async () => {
      await nextFrames(page);
      const now = await page.evaluate(() => Math.round(scrollY));
      const held = now === last;
      last = now;
      return held;
    })
    .toBe(true);
  scrolledTo.set(page, last);
}

When("I scroll up by hand by {int} pixels with the mouse wheel", async ({ reader: { page } }, dy: number) => {
  await scrollByHand(page, -dy);
});

When("I scroll down by hand by {int} pixels with the mouse wheel", async ({ reader: { page } }, dy: number) => {
  await scrollByHand(page, dy);
});

When("I note how far down the page is scrolled", async ({ reader: { page } }) => {
  scrolledTo.set(page, await page.evaluate(() => Math.round(scrollY)));
});

// Through the Recited Word's moves, for a while: the page never scrolls after it. Beneath the
// Settings drawer the Reading place moves with the Recitation; only the scroll must hold (#305).
for (const text of ["the page stays where I scrolled it by hand", "the page has not scrolled since I noted it"]) {
  Then(text, async ({ reader: { page } }) => {
    const at = scrolledTo.get(page)!;
    for (let k = 0; k < 5; k++) {
      expect(Math.abs((await page.evaluate(() => scrollY)) - at), "pixels the page moved from where I left it").toBeLessThanOrEqual(2);
      await page.waitForTimeout(200);
    }
  });
}
