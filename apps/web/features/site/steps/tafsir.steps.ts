// Steps for #234: each Passage's Tafsir after its last Ayah. A Passage's
// Tafsir is found by role and name, a note (ARIA role) named "Tafsir of 1:5–7"; its
// entries are its list's items, each its Ayah range then its text, and its
// last paragraph the credit line. Where it sits is read from the page: after
// the Passage's last Ayah and before the next one, in the page's order and on
// the screen. The Tafsir is the tests' own (../tafsir-in-the-test-database.ts)
// and the Passages those the run's database holds, never typed.

import { expect, type Locator, type Page } from "@playwright/test";
import { shot, type Language } from "../support";
import { Then, expectLangDir } from "./fixtures";
import { neonPassages } from "../passages-in-the-test-database";
import { MARKED_UP, ayahRange, testTafsir } from "../tafsir-in-the-test-database";
import { expectLoadedFace } from "./appearance.steps";



/** Every Passage's Tafsir on the page, in order. */
const passageTafsirs = (page: Page) => page.getByRole("note", { name: /^Tafsir of / });

/** The Ayah range and the text of Tafsir entries `entries`, the first and second paragraphs of each list item. */
const entryParts = (entries: Locator) => ({ ayahs: entries.locator("p:nth-child(1)"), text: entries.locator("p:nth-child(2)") });

/** A Tafsir entry under Ayah range `ayahs` (`1:6–7`), as a filter inside a Passage's Tafsir. */
const entryUnder = (page: Page, ayahs: string) => page.getByRole("listitem").filter({ has: page.getByText(ayahs, { exact: true }) });

/** The entry under Ayah range `ayahs`, wherever it is on the page. */
const entryOf = (page: Page, ayahs: string) => passageTafsirs(page).locator(entryUnder(page, ayahs));

/** The Tafsir holding the entry under Ayah range `ayahs`. */
const tafsirHolding = (page: Page, ayahs: string) => passageTafsirs(page).filter({ has: entryUnder(page, ayahs) });

/** The text of a Tafsir entry as a reader reads it: its bold and italic tags drawn, not shown. */
const shown = (text: string) => text.replace(/<\/?[bi]>/g, "");

/** Each Passage of Surah `surah` with Tafsir in `lang`: its last Ayah and the entries whose last Ayah it holds, in order. */
function expectedTafsir(surah: number, lang: Language) {
  const entries = testTafsir(lang).filter((e) => e.surah === surah);
  return neonPassages()
    .filter((p) => p.surah_no === surah)
    .map((p) => ({ till: p.ayah_till, entries: entries.filter((e) => p.ayah_from <= e.lastAyah && e.lastAyah <= p.ayah_till) }))
    .filter((p) => p.entries.length > 0);
}

/**
 * The Tafsir sits after Ayah `after`'s last Word and before Ayah `before`'s
 * first Word, if the Surah has that Ayah, in the page's order and on the
 * screen: Words, since in Flowing an Ayah's section draws no box of its own.
 * Each try scrolls it into view and reads it two frames later, once it and
 * the Words around it are drawn at their own sizes, not their placeholders'.
 * Each try scrolls again: a layout just switched keeps its Ayah at the top
 * for a while, and may scroll back.
 */
async function expectBetween(tafsir: Locator, after: string, before: string, what: string) {
  const placed = () =>
    tafsir.evaluate(
      async (el, [a, b]) => {
        el.scrollIntoView({ block: "center" });
        await new Promise((drawn) => requestAnimationFrame(() => requestAnimationFrame(drawn)));
        const words = document.querySelectorAll(`[id^="${a}:"]`);
        const last = words[words.length - 1];
        const next = document.getElementById(`${b}:1`);
        const box = el.getBoundingClientRect();
        return {
          afterInOrder: !!last && !!(last.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING),
          beforeInOrder: !next || !!(el.compareDocumentPosition(next) & Node.DOCUMENT_POSITION_FOLLOWING),
          belowLast: !!last && box.top >= last.getBoundingClientRect().bottom - 1,
          aboveNext: !next || box.bottom <= next.getBoundingClientRect().top + 1,
        };
      },
      [after, before],
    );
  await expect.poll(placed, { message: what }).toEqual({ afterInOrder: true, beforeInOrder: true, belowLast: true, aboveNext: true });
}

/** Ayah `ayah` (`s:a`) and the one after it. */
const andNext = (ayah: string) => {
  const [s, a] = ayah.split(":").map(Number);
  return [ayah, `${s}:${a + 1}`] as const;
};

Then(
  "Surah {int}'s Tafsir in {language} follows the last Ayah of each Passage that has any, each entry under its Ayah range, then its credit line",
  async ({ reader }, surah: number, lang: Language) => {
    const page = reader.page;
    const want = expectedTafsir(surah, lang);
    if (want.length === 0) throw new Error(`the run's database holds no ${lang} Tafsir of Surah ${surah}`);
    const tafsirs = passageTafsirs(page);
    await expect(tafsirs).toHaveCount(want.length, { timeout: 30_000 });
    for (const [i, { till, entries }] of want.entries()) {
      const tafsir = tafsirs.nth(i);
      const what = `the Tafsir after ${surah}:${till}`;
      await expect(tafsir, what).toHaveAccessibleName(`Tafsir of ${ayahRange(surah, entries[0].firstAyah, entries.at(-1)!.lastAyah)}`);
      await expect(tafsir, what).toHaveAttribute("lang", lang);
      const { ayahs, text } = entryParts(tafsir.getByRole("listitem"));
      await expect(ayahs, what).toHaveText(entries.map((e) => ayahRange(surah, e.firstAyah, e.lastAyah)));
      await expect(text, what).toHaveText(entries.map((e) => shown(e.text)));
      const credit = tafsir.locator(":scope > p").last();
      await expect(credit, what).toContainText("al-Mukhtasar");
      await expect(credit, what).toContainText(lang === "ur" ? "Urdu edition" : "English edition");
      await expectBetween(tafsir, ...andNext(`${surah}:${till}`), what);
    }
  },
);

Then("the Passage ending at Ayah {word} is followed by its Tafsir", async ({ reader }, ayah: string) => {
  const [surah, till] = ayah.split(":").map(Number);
  const passage = expectedTafsir(surah, reader.language).find((p) => p.till === till);
  if (!passage) throw new Error(`no Passage with Tafsir ends at ${ayah} in the run's database`);
  const { entries } = passage;
  const tafsir = reader.page.getByRole("note", { name: `Tafsir of ${ayahRange(surah, entries[0].firstAyah, entries.at(-1)!.lastAyah)}`, exact: true });
  await expect(tafsir).toHaveCount(1);
  await expectBetween(tafsir, ...andNext(ayah), `the Tafsir after ${ayah}`);
});

Then("the first Passage's Tafsir is open on screen once scrolled to", async ({ reader }) => {
  const tafsir = passageTafsirs(reader.page).first();
  await tafsir.evaluate((el) => el.scrollIntoView({ block: "center" }));
  await expect(entryParts(tafsir.getByRole("listitem").first()).text).toBeInViewport();
});

Then(
  "the Tafsir entry of {word} is marked lang {string}, runs {string} and is set in the loaded font {string}",
  async ({ reader }, ayahs: string, lang: string, dir: string, family: string) => {
    const tafsir = tafsirHolding(reader.page, ayahs);
    const { text } = entryParts(entryOf(reader.page, ayahs));
    await text.evaluate((el) => el.scrollIntoView({ block: "center" }));
    await expect(text).toBeVisible();
    // The Tafsir is marked with the Language; its entries' text is set in the Language's typeface.
    await expectLangDir(tafsir, lang, dir, "the Tafsir");
    await expect(text).toHaveCSS("direction", dir);
    await expectLoadedFace(text, family);
  },
);

Then("I save a screenshot of the Tafsir after Ayah {word} {string}", async ({ reader }, ayah: string, name: string) => {
  const tafsir = tafsirHolding(reader.page, ayah);
  await tafsir.evaluate((el) => el.scrollIntoView({ block: "center" }));
  await shot(reader.page, name);
});

Then(
  "the Tafsir entry of {word} is shown once, under the Ayah range {string}, after Ayah {word}",
  async ({ reader }, ayahs: string, label: string, after: string) => {
    const page = reader.page;
    await expect(entryOf(page, label)).toHaveCount(1);
    // Neither of its Ayahs has an entry of its own.
    const [surah, span] = ayahs.split(":");
    for (const a of span.split("–")) await expect(entryOf(page, `${surah}:${a}`)).toHaveCount(0);
    const tafsir = tafsirHolding(page, label);
    await expectBetween(tafsir, ...andNext(after), `the Tafsir holding ${label}`);
  },
);

Then("the Tafsir entry of {word} shows its bold and its italic as such, and its other markup as text", async ({ reader }, ayahs: string) => {
  const page = reader.page;
  const marked = MARKED_UP[reader.language];
  const { text } = entryParts(entryOf(page, ayahs));
  await expect(text).toHaveText(shown(marked));
  const bold = text.locator("b");
  const italic = text.locator("i");
  await expect(bold).toHaveText(marked.match(/<b>(.*?)<\/b>/)![1]);
  await expect(italic).toHaveText(marked.match(/<i>(.*?)<\/i>/)![1]);
  const drawn = await text.evaluate((el) => ({
    bold: Number(getComputedStyle(el.querySelector("b")!).fontWeight),
    italic: getComputedStyle(el.querySelector("i")!).fontStyle,
    plain: Number(getComputedStyle(el).fontWeight),
  }));
  expect(drawn.bold, "the bold is drawn heavier than the text around it").toBeGreaterThan(drawn.plain);
  expect(drawn.italic).toBe("italic");
  // The <span> is text, word for word, and no element.
  await expect(text).toContainText(marked.match(/<span[^>]*>.*?<\/span>/)![0]);
  await expect(text.locator("*:not(b):not(i)")).toHaveCount(0);
});

Then("the page shows no Tafsir", async ({ reader }) => {
  const page = reader.page;
  await expect(page.locator("main")).toBeVisible();
  await expect(passageTafsirs(page)).toHaveCount(0);
  await expect(page.locator("main")).not.toContainText("al-Mukhtasar");
});

Then("the page doesn't name {string}", async ({ page }, name: string) => {
  await expect(page.locator("main")).toBeVisible();
  await expect(page.locator("body")).not.toContainText(name);
});
