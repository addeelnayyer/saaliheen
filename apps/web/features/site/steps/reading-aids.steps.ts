// Ayah markers, the Bismillah and moving between Surahs (#2 AC-9, AC-10).

import { expect, type Page } from "@playwright/test";
import { card, sourceWords, surahMeta, type Language } from "../support";
import { STRINGS, Then, When, precedes } from "./fixtures";

// ---------------------------------------------------------------- Ayah markers

Then("Surah {int} has {int} Ayahs in the Surah metadata", async ({}, surah: number, count: number) => {
  expect(surahMeta(surah).verses_count).toBe(count);
});

Then(
  "each Ayah of Surah {int} is marked in English, after the previous Ayah's last Word card and before its own first Word card",
  async ({ page }, surah: number) => {
    const words = sourceWords(surah);
    const ayahCount = surahMeta(surah).verses_count;
    for (let a = 1; a <= ayahCount; a++) {
      const marker = page.getByText(STRINGS.ayah(a), { exact: true });
      await expect(marker, `Ayah ${a} marker`).toBeVisible();
      const first = words.find((w) => w.location.startsWith(`${surah}:${a}:`))!;
      expect(await precedes(marker, card(page, first.location)), `marker ${a} before ${first.location}`).toBe(true);
      if (a > 1) {
        const lastOfPrev = words.filter((w) => w.location.startsWith(`${surah}:${a - 1}:`)).at(-1)!;
        expect(await precedes(card(page, lastOfPrev.location), marker), `${lastOfPrev.location} before marker ${a}`).toBe(true);
      }
    }
  },
);

// ---------------------------------------------------------------- the Bismillah

Then(
  "the Surah metadata says Surahs 1 and 9 do not open with the Bismillah and the other 112 Surahs do",
  async () => {
    const without = Array.from({ length: 114 }, (_, i) => i + 1).filter((n) => !surahMeta(n).bismillah_pre);
    expect(without).toEqual([1, 9]);
  },
);

// The Bismillah's text is Ayah 1:1's Uthmani Words, read from the source.
const bismillah = () =>
  sourceWords(1)
    .filter((w) => w.location.startsWith("1:1:"))
    .map((w) => w.uthmani)
    .join(" ");

Then(
  "the Bismillah is shown once, before the Word card at {location}, if the Surah metadata says Surah {int} opens with it, and not at all otherwise",
  async ({ page }, first: string, surah: number) => {
    const b = page.getByText(bismillah(), { exact: true });
    if (surahMeta(surah).bismillah_pre) {
      await expect(b).toHaveCount(1);
      await expect(b).toBeVisible();
      expect(await precedes(b, card(page, first))).toBe(true);
    } else {
      await expect(b).toHaveCount(0);
    }
  },
);

// ---------------------------------------------------------------- previous and next Surah links (at the Surah's foot since #192)

const linkName = (direction: string) => {
  if (direction !== "next" && direction !== "previous") throw new Error(`no ${direction} Surah link`);
  return STRINGS[direction === "next" ? "next" : "prev"];
};

// The Surah's foot names its links' nav "Surahs": a Theme chip such as "Previous Scriptures" is not one.
const surahLink = (page: Page, direction: string) =>
  page.getByRole("navigation", { name: "Surahs", exact: true }).getByRole("link", { name: linkName(direction) });

When("I follow the {word} Surah link", async ({ page }, direction: string) => {
  await surahLink(page, direction).first().click();
});

Then("I am on Surah {int} in {language}", async ({ page, reading }, surah: number, lang: Language) => {
  await expect(page).toHaveURL(`/${lang}/${surah}`);
  reading.lang = lang;
  reading.surah = surah;
});

Then("a {word} Surah link is visible", async ({ page }, direction: string) => {
  await expect(surahLink(page, direction).first()).toBeVisible();
});

Then("there is no {word} Surah link", async ({ page }, direction: string) => {
  await expect(surahLink(page, direction)).toHaveCount(0);
});
