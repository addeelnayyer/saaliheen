// #278: a Grammar page reads like a Surah page. Its Ayahs are the page's
// `main section[id]`s (`s:a`), each Word an element whose id is its location;
// Ayah translations, Arabic and Word meanings are held to QUL's sources. Its
// parts are held back through the Surah and Theme openings' interception
// (./parts-server); while any are to come its <main> is aria-busy.

import { expect, type Page } from "@playwright/test";
import { ayahSection, ayahSections, ayahTranslation, card, sourceSurahs, sourceWord, sourceWords, type Language } from "../support";
import { Given, Then, When } from "./fixtures";
import { arabicOf } from "./grammar-page.steps";
import { partsServer, requestedParts } from "./parts-server";
import { closeSettings, fontSize, openSettings, scriptButton, scriptText, type Script } from "./reader";

/** Every Word on the page, by its location, in order. */
const wordLocations = (page: Page) => page.locator("main [data-word]").evaluateAll((els) => els.map((el) => el.id));

const meaningOf = (page: Page, location: string) => card(page, location).locator(":scope > span:is([lang=ur], [lang=en])");

const crawled = new WeakMap<Page, string>();

// ---------------------------------------------------------------- the server

Given("the server holds back every part of a Grammar page", async ({ reader }) => {
  await partsServer(reader.page, "hold");
});

When("I fetch the Grammar page of Surah {int} in {language} without scripts", async ({ reader }, surah: number, lang: Language) => {
  const res = await reader.page.request.get(`/${lang}/grammar/${surah}`);
  expect(res.status()).toBe(200);
  crawled.set(reader.page, await res.text());
});

// ---------------------------------------------------------------- loading

Then("the Grammar page has finished loading", async ({ reader, reading }) => {
  const page = reader.page;
  await expect(page.locator("main")).not.toHaveAttribute("aria-busy", "true", { timeout: 30_000 });
  const last = `${reading.surah}:${sourceSurahs()[reading.surah! - 1].ayahCount}`;
  await expect(ayahSection(page, last), `Ayah ${last}`).toBeAttached();
});

Then("the Grammar page does not yet show Ayah {word}", async ({ reader }, ayah: string) => {
  await expect(ayahSection(reader.page, ayah)).toHaveCount(0);
});

Then("the Grammar page shows every Ayah of Surah {int} in order, every Word of each from QUL", async ({ reader }, surah: number) => {
  const page = reader.page;
  const count = sourceSurahs()[surah - 1].ayahCount;
  const ayahs = await ayahSections(page).evaluateAll((els) => els.map((el) => el.id));
  expect(ayahs).toEqual(Array.from({ length: count }, (_, k) => `${surah}:${k + 1}`));
  expect(await wordLocations(page)).toEqual(sourceWords(surah).map((w) => w.location));
});

Then("every Grammar part the page fetched is a static JSON file under {string}", async ({ reader }, under: string) => {
  const parts = requestedParts(reader.page);
  expect(parts.length, "Grammar parts fetched").toBeGreaterThan(0);
  for (const path of parts) expect(path, "a Grammar part's address").toMatch(new RegExp(`^${under.replace(/\//g, "\\/")}\\d+\\.json$`));
  const answers = await Promise.all(parts.map((path) => reader.page.request.get(path)));
  answers.forEach((res, i) => {
    expect(res.status(), parts[i]).toBe(200);
    expect(res.headers()["content-type"], parts[i]).toContain("application/json");
  });
});

Then("its HTML holds Ayah {word} with Word {location}'s Uthmani text from QUL, and not Ayah {word}", async ({ reader }, ayah: string, location: string, not: string) => {
  const html = crawled.get(reader.page);
  expect(html, "the page fetched without scripts").toBeDefined();
  expect(html).toContain(`id="${ayah}"`);
  expect(html).toContain(`id="${location}"`);
  expect(html).toContain(sourceWord(location).uthmani);
  expect(html).not.toContain(`id="${not}"`);
});

// ---------------------------------------------------------------- the Ayah translation

Then("no Ayah translation is shown on the Grammar page", async ({ reader, reading }) => {
  const page = reader.page;
  const surah = reading.surah!;
  await expect(ayahSection(page, `${surah}:1`)).toBeVisible();
  for (let a = 1; a <= sourceSurahs()[surah - 1].ayahCount; a++) {
    const t = page.getByText(ayahTranslation(`${surah}:${a}`, reading.lang!), { exact: true });
    await expect(t, `${surah}:${a}'s Ayah translation`).toBeHidden();
  }
});

Then("each Ayah of the Grammar page is followed by its {language} Ayah translation", async ({ reader, reading }, lang: Language) => {
  const page = reader.page;
  const surah = reading.surah!;
  for (let a = 1; a <= sourceSurahs()[surah - 1].ayahCount; a++) {
    const section = ayahSection(page, `${surah}:${a}`);
    const t = section.getByText(ayahTranslation(`${surah}:${a}`, lang), { exact: true });
    await expect(t, `${surah}:${a}'s Ayah translation`).toBeVisible();
    // Under the Ayah's Words: below its last Word.
    const words = await section.locator("[data-word]").evaluateAll((els) => Math.max(...els.map((el) => el.getBoundingClientRect().bottom)));
    expect((await t.boundingBox())!.y, `${surah}:${a}'s Ayah translation below its Words`).toBeGreaterThanOrEqual(words - 1);
  }
});

// ---------------------------------------------------------------- settings

Then("every Word on the Grammar page shows its {script} text from QUL and not the other Script's", async ({ reader }, script: Script) => {
  const page = reader.page;
  const surah = Number(new URL(page.url()).pathname.split("/").at(-1));
  const words = sourceWords(surah);
  await expect.poll(() => wordLocations(page)).toEqual(words.map((w) => w.location));
  // One Arabic shown per Word, the Script's: where the two Scripts differ, the other's is hidden.
  for (const w of words) await expect(arabicOf(page, w.location), w.location).toHaveText([scriptText(w.location, script)]);
});

Then("the Grammar page's Arabic is {int}% and its Word meanings {int}% of a fresh browser's", async ({ reader }, arabicPct: number, meaningPct: number) => {
  const page = reader.page;
  const path = new URL(page.url()).pathname;
  const location = sourceWords(Number(path.split("/").at(-1)))[0].location;
  const measure = async (p: Page) => [await fontSize(arabicOf(p, location)), await fontSize(meaningOf(p, location))];
  const [a, m] = await measure(page);
  // A fresh browser in the same Script: each Script's Arabic has its own first size.
  const script = ((await page.locator("html").getAttribute("data-script")) ?? "uthmani") as Script;
  const context = await reader.newContext();
  const fresh = await context.newPage();
  await fresh.goto(path);
  await openSettings(fresh);
  await scriptButton(fresh, script).click();
  await closeSettings(fresh);
  const [a0, m0] = await measure(fresh);
  await context.close();
  expect(a, "the Arabic's size").toBeCloseTo((a0 * arabicPct) / 100, 0);
  expect(m, "the Word meaning's size").toBeCloseTo((m0 * meaningPct) / 100, 0);
});

// ---------------------------------------------------------------- what is not there

Then("the page has no Theme chip", async ({ reader }) => {
  await expect(reader.page.locator("main").first()).toBeVisible();
  await expect(reader.page.locator('main a[href*="/themes/"]'), "links to a Theme page").toHaveCount(0);
});
