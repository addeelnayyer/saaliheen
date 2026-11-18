// Steps for filtering the Supplications page (#200, #195). What the page
// should list and count is worked out from the curated file and #195's rules
// (../supplications-data.ts), never typed in. A chip counts what it would give
// with the switches as they are.
//
// The page's shape these steps expect:
// - the Opening chips: buttons in a group named "Opening", each naming its
//   Opening (All, Rabbana, Rabbi, Other) and its count, the chosen one pressed;
// - the switches "Prophets only" and "Show other words to Allah";
// - a Language switch in the page's own content (its banner has none, #192);
// - each entry an <article> in <main>, as ./supplications-page.steps.ts reads
//   them, one of the Other words to Allah carrying its kind's label.

import { expect, type Page } from "@playwright/test";
import type { Language } from "../support";
import { Then, When } from "./fixtures";
import { languageChoice, languageSwitch } from "./explore-and-me.steps";
import { shownEntries, type ShownEntry } from "./supplications-page.steps";
import { choicesIn, curated, curatedAt, curatedEntriesFor, keptBySwitches, KINDS, labelOfKind, runOf, withOpening, type Opening } from "../supplications-data";

const CHIPS = ["All", "Rabbana", "Rabbi", "Other"] as const;
type Chip = (typeof CHIPS)[number];
const OPENING_OF: Record<Chip, Opening | null> = { All: null, Rabbana: "rabbana", Rabbi: "rabbi", Other: "other" };

const main = (page: Page) => page.getByRole("main");
const chipGroup = (page: Page) => main(page).getByRole("group", { name: "Opening", exact: true });
/** A chip's name: its Opening, standing alone among the Arabic and the count. */
const chipName = (name: Chip) => new RegExp(`(^|\\s)${name}(\\s|$)`);
const chip = (page: Page, name: Chip) => chipGroup(page).getByRole("button", { name: chipName(name) });
/** That `chosen` is the one chip pressed, or, for `null`, that none is. */
async function expectChosen(page: Page, chosen: Chip | null) {
  for (const c of CHIPS) await expect(chip(page, c), `the ${c} chip`).toHaveAttribute("aria-pressed", String(c === chosen));
}
const onOff = (page: Page, name: string) => main(page).getByRole("switch", { name, exact: true });
/** Marks the page as loaded, so that a later step can tell it was not loaded again. */
const markLoaded = (page: Page) => page.evaluate(() => ((window as unknown as { stayed: boolean }).stayed = true));
/** A run as a step names it (`{ayahs}`) as the curated file writes it. */
type Run = { surah: number; from: number; to: number };
const asSupplicationRun = ({ surah, from, to }: Run) => ({ surah, ayahFrom: from, ayahTo: to });

/** The choices in the page's link. */
const choicesInLink = (page: Page) => choicesIn(new URL(page.url()).searchParams);

/** The curated file's entries for the choices in the page's link. */
const expectedEntries = (page: Page) => curatedEntriesFor(choicesInLink(page));

/** An entry's first Ayah, read from its heading's link (`/{lang}/{s}#{s}:{from}`). */
const firstAyahOf = (e: ShownEntry) => e.links[0]?.split("#")[1] ?? "";
/** The first Ayah of each entry on the page, in order. */
const shownRuns = async (page: Page) => (await shownEntries(page)).map(firstAyahOf);
const firstAyah = (s: { surah: number; ayahFrom: number }) => `${s.surah}:${s.ayahFrom}`;

// ---------------------------------------------------------------- the chips

Then("the Supplications page's Opening chips are All, Rabbana, Rabbi and Other, and {string} is chosen", async ({ reader }, chosen: Chip) => {
  const names = await chipGroup(reader.page).getByRole("button").allInnerTexts();
  expect(names.map((n) => CHIPS.find((c) => chipName(c).test(n))), "the Opening chips, in order").toEqual([...CHIPS]);
  await expect(chip(reader.page, "Rabbana"), "the Rabbana chip").toContainText("رَبَّنَا");
  await expect(chip(reader.page, "Rabbi"), "the Rabbi chip").toContainText("رَبِّ");
  await expectChosen(reader.page, chosen);
});

Then("the {string} Opening chip is chosen, and no other", async ({ reader }, chosen: Chip) => expectChosen(reader.page, chosen));

Then("no Opening chip is chosen", async ({ reader }) => expectChosen(reader.page, null));

Then(
  "each Opening chip counts the entries it would give, as the curated file has them for the choices in the link",
  async ({ reader }) => {
    const kept = keptBySwitches(choicesInLink(reader.page));
    for (const c of CHIPS) {
      const n = withOpening(kept, OPENING_OF[c]).length;
      // The count stands alone, never a part of a longer number.
      await expect(chip(reader.page, c), `the ${c} chip's count`).toHaveText(new RegExp(`(^|\\D)${n}(\\D|$)`));
    }
  },
);

When("I choose the {string} Opening chip on the Supplications page", async ({ reader }, name: Chip) => {
  await markLoaded(reader.page);
  await chip(reader.page, name).click();
  await expect(chip(reader.page, name)).toHaveAttribute("aria-pressed", "true");
});

// ---------------------------------------------------------------- the switches

Then(/^the Supplications page's "(Prophets only|Show other words to Allah)" switch is (on|off)$/, async ({ reader }, name: string, state: string) => {
  await expect(onOff(reader.page, name), `the "${name}" switch`).toHaveAttribute("aria-checked", String(state === "on"));
});

When(/^I turn (on|off) the Supplications page's "(Prophets only|Show other words to Allah)" switch$/, async ({ reader }, state: string, name: string) => {
  await markLoaded(reader.page);
  const toggle = onOff(reader.page, name);
  await expect(toggle, `the "${name}" switch`).toHaveAttribute("aria-checked", String(state !== "on"));
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-checked", String(state === "on"));
});

// ---------------------------------------------------------------- the link, and no reload

Then("the Supplications page's link is {string}", async ({ reader }, address: string) => {
  await expect.poll(() => {
    const url = new URL(reader.page.url());
    return url.pathname + url.search;
  }).toBe(address);
});

Then("the Supplications page did not reload", async ({ reader }) => {
  expect(await reader.page.evaluate(() => (window as unknown as { stayed?: boolean }).stayed),"the page from before the choice, still loaded").toBe(true);
});

When("I choose {language} on the Supplications page's Language switch", async ({ reader }, lang: Language) => {
  const choice = languageChoice(languageSwitch(main(reader.page)), lang);
  await expect(choice, `${lang} on the Supplications page's Language switch`).toBeVisible();
  await choice.click();
  await expect.poll(() => new URL(reader.page.url()).pathname).toBe(`/${lang}/supplications`);
});

// ---------------------------------------------------------------- the list

Then("the Supplications page lists the curated file's entries for the choices in the link, in Quran order", async ({ reader }) => {
  const expected = expectedEntries(reader.page);
  expect(expected.length, "entries the curated file has for the choices").toBeGreaterThan(0);
  await expect.poll(() => shownRuns(reader.page), { message: "the entries on the page, by their first Ayah" }).toEqual(expected.map(firstAyah));
});

Then("the Supplications page lists no entries", async ({ reader }) => {
  await expect(main(reader.page).locator("article")).toHaveCount(0);
});

Then(/^the Supplications page (says|does not say) "(.+)"$/, async ({ reader }, says: string, message: string) => {
  const shown = main(reader.page).getByText(message, { exact: true });
  if (says === "says") await expect(shown).toBeVisible();
  else await expect(shown).toHaveCount(0);
});

/** The Supplication at `run`, which the curated file must hold, and whether the page lists it. */
async function listed(page: Page, run: Run) {
  const s = asSupplicationRun(run);
  expect(curatedAt(s)?.kind, `a Supplication at ${runOf(s)} in the curated file`).toBe("supplication");
  return (await shownRuns(page)).includes(firstAyah(s));
}

Then("the Supplications page lists the Supplication at {ayahs}", async ({ reader }, run: Run) => {
  expect(await listed(reader.page, run), "the Supplication on the page").toBe(true);
});

Then("the Supplications page does not list the Supplication at {ayahs}", async ({ reader }, run: Run) => {
  expect(await listed(reader.page, run), "the Supplication on the page").toBe(false);
});

Then("every entry on the Supplications page is said by a Speaker who includes a Prophet", async ({ reader }) => {
  const { speakers, supplications } = curated();
  const shown = await shownRuns(reader.page);
  expect(shown.length).toBeGreaterThan(0);
  const not = shown.filter((at) => {
    const s = supplications.find((c) => firstAyah(c) === at);
    return !s || !speakers.find((p) => p.id === s.speakerId)?.includesProphet;
  });
  expect(not, "entries whose Speaker includes no Prophet").toEqual([]);
});

/** The label of each kind shown on the page, by entry. */
async function labelsShown(page: Page): Promise<{ run: string; labels: string[] }[]> {
  const labels = KINDS.filter((k) => k.slug !== "supplication").map((k) => k.label);
  return (await shownEntries(page)).map((e) => ({ run: firstAyahOf(e), labels: labels.filter((l) => e.shown.includes(l)) }));
}

Then("each of the Other words to Allah on the Supplications page is labelled with its kind, and no Supplication is", async ({ reader }) => {
  const expected = expectedEntries(reader.page);
  expect(expected.some((s) => s.kind !== "supplication"), "Other words to Allah among the entries").toBe(true);
  const shown = await labelsShown(reader.page);
  const wrong = expected
    .map((s, n) => ({ s, shown: shown[n]?.labels ?? [] }))
    .filter(({ s, shown }) => (s.kind === "supplication" ? shown.length > 0 : shown.length !== 1 || shown[0] !== labelOfKind(s.kind)))
    .map(({ s, shown }) => `${runOf(s)}: ${shown.join(", ") || "no label"}`);
  expect(wrong, "entries labelled wrongly").toEqual([]);
});

Then("the entry at {ayahs} is labelled {string}", async ({ reader }, run: Run, label: string) => {
  const s = asSupplicationRun(run);
  const kind = curatedAt(s)?.kind;
  expect(kind && labelOfKind(kind), `the kind the curated file gives ${runOf(s)}`).toBe(label);
  const entry = (await labelsShown(reader.page)).find((e) => e.run === `${run.surah}:${run.from}`);
  expect(entry, `the entry at ${run.surah}:${run.from}`).toBeDefined();
  expect(entry!.labels).toEqual([label]);
});
