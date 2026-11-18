// Steps for #249: Particle tags on Word cards and the Particle dialog. Controls
// are found by role, accessible name and visible text; expected particles,
// Spellings, counts and meanings come from the committed sources through
// ./particles. The steps the Particle dialog shares with the Root dialog
// (closing it, its focus, its pinned head, the page beneath holding still)
// are ./roots.steps' and ./root-dialog-scroll.steps'.

import { expect, type Locator, type Page } from "@playwright/test";
import { card, sourceWords, type Language } from "../support";
import { STRINGS, Then, When, expectLangDir, langOf, type Reading } from "./fixtures";
import type { Script } from "./reader";
import { particleAt, particleText, type ExpectedParticle } from "./particles";
import { qulAnalysis, rootDialog, scriptShown, showsArrow } from "./roots";
import { expectCurrentLink, expectSpellings, expectTintedSpelling } from "./roots.steps";

/** The Particle dialog: the one dialog on the page. */
const particleDialog = rootDialog;

/** The Particle dialog's Spellings: its one list. */
const spellingList = (page: Page) => particleDialog(page).getByRole("list");

/** A Word card's Particle tag: the button in the card named by its particle's text in the Script shown. */
const particleTag = (c: Locator, text: string) => c.getByRole("button", { name: text, exact: true });

/** The particle of the dialog last opened, as the sources give it. */
function openedParticle(reading: Reading): ExpectedParticle {
  if (!reading.particle) throw new Error("no Particle tag opened yet in this scenario");
  return particleAt(reading.particle)!;
}

const rootless = (surah: number) => sourceWords(surah).map((w) => w.location).filter((l) => !qulAnalysis().rootOf.has(l));
const rooted = (surah: number) => sourceWords(surah).map((w) => w.location).filter((l) => qulAnalysis().rootOf.has(l));
const surahShown = (page: Page) => Number(new URL(page.url()).pathname.split("/")[2]);

// ---------------------------------------------------------------- Particle tags

async function expectParticleTag(page: Page, location: string, script: Script) {
  const c = card(page, location);
  await c.scrollIntoViewIfNeeded();
  const text = particleText(particleAt(location)!, script);
  const tag = particleTag(c, text);
  await expect(tag, `${location} Particle tag ${text}`).toHaveCount(1);
  await expect(tag, `${location} Particle tag`).toBeVisible();
  await expect(tag, `${location} Particle tag text`).toHaveText(text, { useInnerText: true });
  await expect(tag, `${location} Particle tag`).toHaveAttribute("lang", "ar");
  expect(await showsArrow(tag), `${location} Particle tag shows ↗`).toBe(true);
}

Then(
  "every Word card whose Word QUL gives no Root shows one Particle tag with its particle's text in {script} and ↗",
  async ({ page }, script: Script) => {
    expect(await scriptShown(page), "the Script shown").toBe(script);
    const locations = rootless(surahShown(page));
    expect(locations.length, "Words with no Root").toBeGreaterThan(0);
    for (const location of locations) await expectParticleTag(page, location, script);
  },
);

Then("no Word card whose Word QUL gives a Root shows a Particle tag", async ({ page }) => {
  const locations = rooted(surahShown(page));
  expect(locations.length, "Words with a Root").toBeGreaterThan(0);
  // Its one button is its Root tag, named by the Root's letters (./roots.steps checks which).
  const counts = await page.evaluate(
    (ids) => ids.map((id) => document.getElementById(id)?.querySelectorAll("button").length ?? -1),
    locations,
  );
  expect(locations.filter((_, i) => counts[i] !== 1), "Word cards with a Root and other than one button").toEqual([]);
  for (const location of locations) {
    const text = (await card(page, location).getByRole("button").textContent()) ?? "";
    expect(text.replace(/\s+/g, " ").trim(), `${location}'s one button is its Root tag`).not.toBe("");
  }
});

Then("the Word card at {location} shows a Particle tag for {string}", async ({ page }, location: string, text: string) => {
  const script = await scriptShown(page);
  expect(particleText(particleAt(location)!, script), `the particle at ${location} in ${script}`).toBe(text);
  await expectParticleTag(page, location, script);
});

Then("no Particle tag is drawn on any Word of Surah {int}", async ({ page }, surah: number) => {
  const drawn = await page.evaluate(
    (ids) =>
      ids.filter((id) =>
        Array.from(document.getElementById(id)?.querySelectorAll("button") ?? []).some((b) => b.getClientRects().length > 0),
      ),
    rootless(surah),
  );
  expect(drawn, "Words drawing a Particle tag").toEqual([]);
});

// ---------------------------------------------------------------- the Particle dialog

When("I open the Particle tag on the Word card at {location}", async ({ page, reading }, location: string) => {
  const particle = particleAt(location);
  if (!particle) throw new Error(`QUL gives ${location} a Root`);
  await card(page, location).scrollIntoViewIfNeeded();
  const tag = particleTag(card(page, location), particleText(particle, await scriptShown(page)));
  await expect(tag, `the Particle tag on the Word card at ${location}`).toBeVisible();
  await tag.click();
  reading.particle = location;
});

When("I open the first Particle tag on screen", async ({ reader, reading }) => {
  const page = reader.page;
  // The first Word card wholly on screen below the Surah bar and the page's
  // scroll padding that has no Root (as the Root tag's step picks it).
  const rootlessIds = rootless(surahShown(page));
  const location = await page.evaluate((ids) => {
    const bar = document.querySelector("[data-form]")!.getBoundingClientRect().bottom;
    const padding = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
    return (
      ids.find((id) => {
        const r = document.getElementById(id)?.querySelector("button")?.getBoundingClientRect();
        return r && r.top > Math.max(bar + 8, padding) && r.bottom < window.innerHeight - 8;
      }) ?? null
    );
  }, rootlessIds);
  expect(location, "a Particle tag on screen").toBeTruthy();
  await particleTag(card(page, location!), particleText(particleAt(location!)!, await scriptShown(page))).click();
  await expect(particleDialog(page)).toBeVisible();
  await expect(particleDialog(page).getByRole("button", { name: STRINGS.close })).toBeVisible();
  reading.particle = location!;
});

Then("the Particle dialog for {string} is open", async ({ page, reading }, text: string) => {
  expect(particleText(openedParticle(reading), await scriptShown(page)), "the opened particle").toBe(text);
  const dialog = particleDialog(page);
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveAccessibleName(text);
  await expect(dialog.getByRole("heading", { name: text, exact: true })).toBeVisible();
  // Its Spellings show once the particle's file has arrived.
  await expect(spellingList(page).getByRole("listitem").first()).toBeVisible();
});

Then(
  "the Particle dialog is English and runs left to right, with its {string} label, its {string} title and its count as {string}",
  async ({ page }, label: string, title: string, count: string) => {
    const dialog = particleDialog(page);
    expect(await dialog.evaluate((el) => el.closest("[lang]")?.getAttribute("lang")), "the dialog's language").toBe("en");
    expect(await dialog.evaluate((el) => getComputedStyle(el).direction), "the dialog's direction").toBe("ltr");
    for (const text of [label, title, count]) await expect(dialog.getByText(text, { exact: true })).toBeVisible();
  },
);

Then("the Particle dialog's count is its particle's {int} occurrences", async ({ page, reading }, occurrences: number) => {
  expect(openedParticle(reading).occurrences, "the particle's occurrences in the sources").toBe(occurrences);
  await expect(particleDialog(page).getByText(`${occurrences} occurrences`, { exact: true })).toBeVisible();
});

Then(
  "the Particle dialog lists its {int} Spelling(s), most frequent first, each in its {script} text only, with its meaning in {language} and a link to each of its Word locations in Quran order",
  async ({ page, reading }, count: number, script: Script, lang: Language) => {
    const particle = openedParticle(reading);
    expect(particle.spellings.length, "the particle's Spellings in the sources").toBe(count);
    await expect(spellingList(page).locator(":scope > li")).toHaveCount(count);
    await expectSpellings(spellingList(page), particle.spellings, script, lang, "the Particle dialog's");
  },
);

Then(
  "each Spelling meaning of the Particle dialog is marked lang {string} and runs {string}",
  async ({ page, reading }, lang: string, dir: string) => {
    for (const s of openedParticle(reading).spellings) {
      const meaning = s.meaning[langOf(reading)];
      await expectLangDir(spellingList(page).getByText(meaning || "—", { exact: true }), lang, dir, `Spelling ${s.locations[0]} meaning "${meaning}"`);
    }
  },
);

Then("the Particle tag on the Word card at {location} has focus", async ({ page }, location: string) => {
  await expect(particleTag(card(page, location), particleText(particleAt(location)!, await scriptShown(page)))).toBeFocused();
});

Then(
  "the Particle dialog's head is pinned at its top, showing its label, its close button and {string}",
  async ({ page }, text: string) => {
    const dialog = particleDialog(page);
    const head = dialog.locator("header");
    expect(await dialog.evaluate((el) => el.scrollTop), "the Spellings have scrolled").toBeGreaterThan(0);
    // Both read in one frame, as a phone's sheet may still be sliding into place.
    const offset = await dialog.evaluate((el) => el.querySelector("header")!.getBoundingClientRect().top - el.getBoundingClientRect().top);
    expect(Math.abs(offset), "the head's top is the dialog's top").toBeLessThan(1);
    const d = (await dialog.boundingBox())!;
    for (const part of [
      head.getByText(STRINGS.particleLabel, { exact: true }),
      head.getByRole("button", { name: STRINGS.close }),
      head.getByRole("heading", { name: text, exact: true }),
    ]) {
      await expect(part).toBeVisible();
      expect((await part.boundingBox())!.y, `${await part.textContent()} is inside the dialog`).toBeGreaterThanOrEqual(d.y);
    }
    // Nothing that scrolled beneath the head shows through it: the head is what is on top at its middle.
    const box = (await head.boundingBox())!;
    const [x, y] = [box.x + box.width / 2, box.y + box.height / 2];
    expect(await head.evaluate((el, [x, y]) => el.contains(document.elementFromPoint(x, y)), [x, y])).toBe(true);
  },
);

Then("every Spelling of the Particle dialog fits within the screen's width", async ({ page }) => {
  const width = page.viewportSize()!.width;
  await expect(spellingList(page).getByRole("listitem").first()).toBeVisible();
  const boxes = await spellingList(page)
    .locator("*")
    .evaluateAll((els) =>
      els
        .map((el) => el.getBoundingClientRect())
        .filter((r) => r.width > 0 && r.height > 0)
        .map((r) => ({ left: r.left, right: r.right })),
    );
  expect(boxes.length).toBeGreaterThan(0);
  expect(boxes.filter((b) => b.left < -0.5 || b.right > width + 0.5), "parts of the Spellings off the screen's width").toEqual([]);
});

When("I choose the Word location {location} in the Particle dialog", async ({ page }, location: string) => {
  const links = spellingList(page).getByRole("link");
  // Its Spellings show once the particle's file has arrived.
  await expect(links.first()).toBeVisible();
  // A location's text may prefix a longer one's (2:16:3, 2:16:30): pick the link that goes exactly there.
  const targets = await links.evaluateAll((as) => as.map((a) => new URL((a as HTMLAnchorElement).href).hash));
  const index = targets.indexOf(`#${location}`);
  expect(index, `a link to ${location}`).toBeGreaterThanOrEqual(0);
  await links.nth(index).scrollIntoViewIfNeeded();
  await links.nth(index).click();
});

// ---------------------------------------------------------------- the tapped Word's mark (#327)

Then(
  "in the Particle dialog only the Spelling holding {location} is tinted, in the Root dialog's tint",
  async ({ page }, location: string) => {
    await expectTintedSpelling(page, spellingList(page), particleAt(location)!.spellings, location);
  },
);

Then("in the Particle dialog only the Word location link {location} is tinted and says it is the current one", async ({ page }, location: string) => {
  await expectCurrentLink(page, spellingList(page), location);
});

Then("the Particle dialog shows {string} while its Spellings load", async ({ page }, text: string) => {
  const dialog = particleDialog(page);
  await expect(dialog.getByRole("heading", { name: text, exact: true })).toBeVisible();
  await expect(dialog.locator('[aria-busy="true"]')).toHaveCount(1);
  await expect(spellingList(page)).toHaveCount(0);
});
