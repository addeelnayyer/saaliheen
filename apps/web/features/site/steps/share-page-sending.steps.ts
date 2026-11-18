// Sending a Share page (#56): its sharer's "Share" and "Copy text" buttons,
// in the edit strip. The browser's share sheet and clipboard are stood in for
// by the steps in ./ayah-share.steps.ts ("my browser has a native share
// sheet", …), which record what they were handed (`seen`); the copy message
// and "the share sheet did not open" steps are shared from there too. Expected text is read from the committed sources;
// the site, translator and reference format are typed here, like the
// interface strings, so the tests stay independent of the app.

import { expect } from "@playwright/test";
import { ayahTranslation, sourceAyahEnd, sourceSurahs, STRINGS, type Language } from "../support";
import { seen } from "./ayah-share.steps";
import { Given, Then, When } from "./fixtures";
import { ayahText, type Script } from "./reader";
import { editStrip } from "./share-page-edit-strip.steps";

/** The production site every link handed out points to, wherever the page is served. */
const SITE = "https://saaliheen.com";

/** Each Language's Ayah translation's translator (the Credits page). */
const CREDIT: Record<Language, string> = { ur: "Fateh Muhammad Jalandhari", en: "Saheeh International" };

/** A Share page address's parts: /<lang>/share/<surah>/<from>[-<to>]/<script>[/<layout>]. */
function addressParts(address: string) {
  const match = address.match(/^\/(ur|en)\/share\/(\d+)\/(\d+)(?:-(\d+))?\/(uthmani|indopak)(?:\/[a-z-]+)?$/);
  if (!match) throw new Error(`${address} is not a Share page address`);
  const [, lang, surah, from, to] = match;
  return { lang: lang as Language, surah: Number(surah), from: Number(from), to: Number(to ?? from), script: match[5] as Script };
}

/** The reference: the Surah's English name and the Shared Ayahs as the headpiece writes them, `Al-Kahf 18:83–88`. */
function reference(address: string) {
  const { surah, from, to } = addressParts(address);
  const ayahs = from === to ? `${surah}:${from}` : `${surah}:${from}–${to}`;
  return `${sourceSurahs()[surah - 1].nameLatin} ${ayahs}`;
}

/** The link handed out: the Share page's address on the production site. */
const productionLink = (address: string) => SITE + address;

/** What Share hands over: the reference and the link, a blank line between. */
const sharedText = (address: string) => [reference(address), productionLink(address)].join("\n\n");

/**
 * Ayah `s:a`'s Arabic as a printed mushaf ends it: its Words, then Digital
 * Khatt's Ayah-end entry as it is (the end-of-Ayah sign U+06DD, its number and
 * any marks), or for Uthmani the same sign before QPC Hafs's Ayah number.
 */
function sharedArabic(ayah: string, script: Script) {
  const end = script === "uthmani" ? `۝${sourceAyahEnd(ayah, script)}` : sourceAyahEnd(ayah, script);
  return `${ayahText(ayah, script)} ${end}`;
}

/** What Copy text copies: each Shared Ayah's Arabic and Ayah translation, then the translator, the reference and the link. */
function copyText(address: string) {
  const { lang, surah, from, to, script } = addressParts(address);
  const ayahs = Array.from({ length: to - from + 1 }, (_, k) => `${surah}:${from + k}`);
  const parts = ayahs.flatMap((ayah) => [sharedArabic(ayah, script), ayahTranslation(ayah, lang)]);
  return [...parts, CREDIT[lang], reference(address), productionLink(address)].join("\n\n");
}

/**
 * Open a Share page as the person sharing it: as the app opens it (an Ayah's
 * or a Passage heading's share button, "Share Ayahs", the edit strip), its
 * address with `?edit`, so the edit strip and the sharer's buttons in it show.
 */
Given("I open the Share page {string} as its sharer", async ({ reader, reading }, address: string) => {
  addressParts(address);
  reading.status = (await reader.page.goto(`${address}?edit`))?.status();
  expect(reading.status, `${address} is a Share page`).toBe(200);
  await expect(editStrip(reader.page), "the edit strip").toBeVisible();
});

/**
 * Tap the Share page's `name` button until the page has handed something to
 * the share sheet or the clipboard, or shown "Couldn't copy": a tap before the
 * page has hydrated does nothing, so a sharer taps again.
 */
When("I tap the Share page's {string} button", async ({ reader }, name: string) => {
  const { page } = reader;
  const handed = async () => {
    const { shared, copied } = await seen(page);
    return shared.length + copied.length;
  };
  const before = await handed();
  const button = page.getByRole("button", { name, exact: true });
  await expect(button, `the Share page's "${name}" button`).toBeVisible();
  await expect(async () => {
    await button.click();
    await expect.poll(async () => (await handed()) > before || (await page.getByText(STRINGS.copyFailed, { exact: true }).isVisible()), { timeout: 1000 }).toBe(true);
  }).toPass();
});

Then(
  "the share sheet opened once, with the reference and the production link of {string} as text alone, no title",
  async ({ reader }, address: string) => {
    expect((await seen(reader.page)).shared).toEqual([{ text: sharedText(address) }]);
  },
);

Then("the clipboard holds the reference and the production link of {string}", async ({ reader }, address: string) => {
  expect((await seen(reader.page)).copied.at(-1), "the text last copied").toBe(sharedText(address));
});

Then("the clipboard holds the Copy text of {string}", async ({ reader }, address: string) => {
  expect((await seen(reader.page)).copied.at(-1), "the text last copied").toBe(copyText(address));
});

Then("the copied Arabic of Ayah {word} carries the sajdah sign U+08DB", async ({ reader }, ayah: string) => {
  const copied = (await seen(reader.page)).copied.at(-1) ?? "";
  const arabic = copied.split("\n\n").find((part) => part.startsWith(ayahText(ayah, "indopak")));
  expect(arabic, `Ayah ${ayah}'s Arabic in the text last copied`).toBeDefined();
  expect(arabic).toContain("ࣛ");
});
