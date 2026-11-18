// The Passage editor and the Tafsir (#235): Surah 18's Tafsir entries are put
// straight into the run's Postgres (../test-database.ts), which the production
// build reads as DATABASE_URL, one per Ayah but the groups a step names, and
// removed when the scenario ends. What the editor marks and lists is read as
// the Admin sees it; what a refused Publish wrote, by publishing.steps.ts.

import { expect, type Locator } from "@playwright/test";
import { Given, Then, When, type Reader } from "./fixtures";
import { sourceSurahs } from "../support";
import { LANGUAGE_NAMED, tafsirEntries } from "../tafsir-entries";
import { neonDatabase, passage } from "./passage-editor.steps";

/** The name the Tafsir's table has while a scenario keeps it from being read. */
const AWAY = "tafsir_entry_away_issue_235";

/** Replace Surah `surah`'s `language` Tafsir entries with one per Ayah, but `grouped` (`85–86`, `85–86 and 90–91`), each one entry. */
async function holdTafsir(reader: Reader, surah: number, language: string, grouped: string | undefined) {
  // Removing a Surah's entries twice is harmless, so each step registers it.
  reader.cleanups.unshift(() => neonDatabase().query(`delete from tafsir_entry where surah = $1`, [surah]).then(() => {}));
  const entries = tafsirEntries(sourceSurahs()[surah - 1].ayahCount, grouped);
  await neonDatabase().query(`delete from tafsir_entry where language = $1 and surah = $2`, [LANGUAGE_NAMED[language], surah]);
  await neonDatabase().query(
    `insert into tafsir_entry (language, surah, first_ayah, last_ayah, text)
     select $1, $2::int, f, l, format('Tafsir of %s:%s', $2::int, f) from unnest($3::int[], $4::int[]) as e(f, l)`,
    [LANGUAGE_NAMED[language], surah, entries.map((e) => e.firstAyah), entries.map((e) => e.lastAyah)],
  );
}

Given(
  /^Neon holds Surah (\d+)'s (English|Urdu) Tafsir entries one per Ayah(?:, but (.+))?$/,
  async ({ reader }, surah: string, language: string, grouped: string | undefined) => {
    await holdTafsir(reader, Number(surah), language, grouped);
  },
);

When(
  /^Neon's (English|Urdu) Tafsir entries of Surah (\d+) become one per Ayah, but (.+)$/,
  async ({ reader }, language: string, surah: string, grouped: string) => {
    await holdTafsir(reader, Number(surah), language, grouped);
  },
);

Given("the run's database can't give the Tafsir", async ({ reader }) => {
  reader.cleanups.unshift(async () => {
    await neonDatabase().query(`alter table if exists ${AWAY} rename to tafsir_entry`);
  });
  await neonDatabase().query(`alter table tafsir_entry rename to ${AWAY}`);
});

// ---------------------------------------------------------- what is marked

/** Each Ayah of `region` a Tafsir mark sits on, with the mark's text, in reading order. */
async function marksIn(region: Locator): Promise<Map<number, string>> {
  await expect(region.getByText(/^\d+:\d+$/).first(), "the Passage's Ayahs have arrived").toBeVisible();
  const pairs = await region.locator("p, span").evaluateAll((elements) => {
    const found: [number, string][] = [];
    let mark: string | undefined;
    for (const el of elements) {
      const text = (el.textContent ?? "").trim();
      if (text.startsWith("Tafsir entry:")) mark = text;
      const ayah = /^\d+:(\d+)$/.exec(text);
      if (ayah && mark) found.push([Number(ayah[1]), mark]);
      if (ayah) mark = undefined;
    }
    return found;
  });
  return new Map(pairs);
}

Then(/^in Passage (\S+), Ayah (\d+) is marked "([^"]+)"$/, async ({ reader }, range: string, ayah: string, mark: string) => {
  await expect.poll(async () => (await marksIn(passage(reader.page, range))).get(Number(ayah)), `Ayah ${ayah}'s Tafsir mark`).toBe(mark);
});

Then(/^in Passage (\S+), Ayah (\d+) is marked as starting no Tafsir entry$/, async ({ reader }, range: string, ayah: string) => {
  expect((await marksIn(passage(reader.page, range))).get(Number(ayah)), `Ayah ${ayah}'s Tafsir mark`).toBeUndefined();
});

/** The gap holding the ✂︎ before Ayah `ayah` in Passage `range`. */
const gapBefore = (reader: Reader, range: string, ayah: string) =>
  passage(reader.page, range).getByRole("button", { name: `New Passage from Ayah ${ayah}`, exact: true }).locator("xpath=..");

Then(/^in Passage (\S+), the ✂︎ before Ayah (\d+) says it is inside (the .+)$/, async ({ reader }, range: string, ayah: string, entries: string) => {
  await expect(gapBefore(reader, range, ayah), `the ✂︎ before Ayah ${ayah}`).toContainText(`inside ${entries}`);
});

Then(/^in Passage (\S+), the ✂︎ before Ayah (\d+) says it is inside no Tafsir entry$/, async ({ reader }, range: string, ayah: string) => {
  const gap = gapBefore(reader, range, ayah);
  await expect(gap.getByRole("button"), `the ✂︎ before Ayah ${ayah}`).toHaveCount(1);
  await expect(gap, `the ✂︎ before Ayah ${ayah}`).not.toContainText("inside");
});

// ----------------------------------------------------------- what is listed

const splitsList = (reader: Reader) => reader.page.getByRole("list", { name: "Passages splitting a Tafsir entry" });

Then("the Passages listed as splitting a Tafsir entry are exactly:", async ({ reader }, table: { raw(): string[][] }) => {
  await expect(splitsList(reader).getByRole("listitem"), "the Passages splitting a Tafsir entry").toHaveText(table.raw().map(([row]) => row));
});

Then("no Passage is listed as splitting a Tafsir entry", async ({ reader }) => {
  await expect(reader.page.getByText(/^\d+:\d+$/).first(), "the Ayahs have arrived").toBeVisible();
  await expect(splitsList(reader), "no list of Passages splitting a Tafsir entry").toHaveCount(0);
});
