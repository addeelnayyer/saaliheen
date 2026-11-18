// Steps for #4's reader settings: Language switch, Script, Ayah translation
// and theme, as a user drives them on the production build. All but Language
// are in the Settings drawer (#17): a step opens it, uses or reads the control
// and closes it again, so the steps after read the page with no drawer over it. Settings are made
// through the page's own controls, never by writing storage: the storage key
// is the implementation's business, what a user sees before and after a
// reload is the test's.

import { expect } from "@playwright/test";
import type { DataTable } from "playwright-bdd";
import {
  PHONE,
  ayahTranslation,
  card,
  clickInPlace,
  fontFileHash,
  sha256,
  shot,
  sourceSurahs,
  sourceWord,
  type Language,
} from "../support";
import { Given, STRINGS, Then, When, expectLangDir, resolveColor } from "./fixtures";
import {
  PAPER,
  bismillah,
  bodyBackground,
  expectControlsShow,
  expectFatihahIn,
  expectPath,
  expectTranslations,
  closeSettings,
  firstPaint,
  inSettings,
  languageControl,
  openSettings,
  openSettingsWatchingFrames,
  scriptButton,
  stepper,
  scriptText,
  sectionMarksButton,
  themeButton,
  translationSwitch,
  type HtmlState,
  type Script,
  type Theme,
} from "./reader";

const FONT: Record<Script, string> = { uthmani: "UthmanicHafs_V22.woff2", indopak: "DigitalKhattIndoPak.otf" };

// ---------------------------------------------------------------- the browser

Given("a browser with no saved reader settings", async ({ context }) => {
  const state = await context.storageState();
  expect(state.origins, "saved browser storage").toEqual([]);
  expect(state.cookies, "saved cookies").toEqual([]);
});

Given("my system prefers a {theme} colour scheme", async ({ reader }, theme: Theme) => {
  reader.colorScheme = theme;
  await reader.page.emulateMedia({ colorScheme: theme });
});

When("I reload the page", async ({ reader }) => {
  await reader.page.reload();
});

When("I view the page on a 390×844 phone", async ({ reader }) => {
  await reader.page.setViewportSize(PHONE);
});

Then("I save a screenshot {string}", async ({ reader }, name: string) => {
  await reader.page.evaluate(() => window.scrollTo(0, 0));
  await shot(reader.page, name);
});

Given(
  "on an earlier visit to {string} I chose, in order:",
  async ({ reader }, path: string, choices: DataTable) => {
    const context = await reader.newContext();
    const page = await context.newPage();
    await page.goto(path);
    const byName: Record<string, () => ReturnType<typeof scriptButton>> = {
      Uthmani: () => scriptButton(page, "uthmani"),
      "Indo-Pak": () => scriptButton(page, "indopak"),
      Light: () => themeButton(page, "light"),
      Dark: () => themeButton(page, "dark"),
      "Ayah translation": () => translationSwitch(page),
      "Arabic size larger": () => stepper(page, "Arabic size").larger,
      "Arabic size smaller": () => stepper(page, "Arabic size").smaller,
      "Meaning size larger": () => stepper(page, "Meaning size").larger,
      "Meaning size smaller": () => stepper(page, "Meaning size").smaller,
      "Hizb quarters": () => sectionMarksButton(page, "Hizb quarters"),
      Rukus: () => sectionMarksButton(page, "Rukus"),
    };
    const names = choices.raw().map(([name]) => name);
    await openSettings(page);
    for (const name of names) {
      if (!byName[name]) throw new Error(`no reader setting named "${name}"`);
      await byName[name]().click();
    }
    // Each group's last choice is the one now selected; the switch is on after an odd number of turns.
    const last = (options: string[]) => names.filter((n) => options.includes(n)).at(-1);
    for (const name of [last(["Uthmani", "Indo-Pak"]), last(["Light", "Dark"]), last(["Hizb quarters", "Rukus"])]) {
      if (name) await expect(byName[name](), name).toHaveAttribute("aria-pressed", "true");
    }
    const turns = names.filter((n) => n === "Ayah translation").length;
    if (turns % 2) await expect(translationSwitch(page)).toBeChecked();
    else if (turns) await expect(translationSwitch(page)).not.toBeChecked();
    await closeSettings(page);
    reader.saved = await context.storageState();
    await context.close();
  },
);

When("I open {string} in a fresh browser with an empty cache that keeps those choices", async ({ reader }, path: string) => {
  await reader.openFresh(path);
});

// ---------------------------------------------------------------- Language

When("I switch Language to {language}", async ({ reader }, target: Language) => {
  await clickInPlace(languageControl(reader.page, target));
});

Then("I am on {string} with nothing added to the URL", async ({ reader }, path: string) => {
  await expectPath(reader.page, path);
});

// The interface is English in every Language: <html> says so, and a
// Language switch, where the page has one (a Surah page's Surah bar, Me: #192),
// is named for what it chooses, the translation language.
Then("the interface is English and runs left to right", async ({ reader }) => {
  await expect(reader.page.locator("html")).toHaveAttribute("lang", "en");
  await expect(reader.page.locator("html")).toHaveAttribute("dir", "ltr");
  const switches = reader.page.getByRole("group", { name: /language/i });
  for (const name of await switches.evaluateAll((gs) => gs.map((g) => g.getAttribute("aria-label")))) {
    expect(name, "a Language switch's name").toBe("Translation language");
  }
});

// A registered parameter type also claims a regex capture with its pattern,
// so these steps use cucumber expressions ({language}, {script}) throughout.
Then("the Word card at {location} shows its {language} Word meaning", async ({ reader }, location: string, lang: Language) => {
  await expect(card(reader.page, location).getByText(sourceWord(location).meaning[lang], { exact: true })).toBeVisible();
});

Then(
  "the Word card at {location} shows its {language} Word meaning, marked {string} and running {string}",
  async ({ reader }, location: string, lang: Language, marked: string, dir: string) => {
    const meaning = card(reader.page, location).getByText(sourceWord(location).meaning[lang], { exact: true });
    await expect(meaning).toBeVisible();
    await expectLangDir(meaning, marked, dir);
  },
);

// ---------------------------------------------------------------- Script

When("I choose the {script} Script", async ({ reader }, script: Script) => {
  await inSettings(reader.page, () => scriptButton(reader.page, script).click());
});

Then("the {script} Script is selected", async ({ reader }, script: Script) => {
  await inSettings(reader.page, () => expect(scriptButton(reader.page, script)).toHaveAttribute("aria-pressed", "true"));
});

Then("the {script} Script is selected and {script} is not", async ({ reader }, chosen: Script, other: Script) => {
  await inSettings(reader.page, async () => {
    await expect(scriptButton(reader.page, chosen)).toHaveAttribute("aria-pressed", "true");
    await expect(scriptButton(reader.page, other)).toHaveAttribute("aria-pressed", "false");
  });
});

Then(
  "every Al-Fatihah Word card shows its Word meaning and only its {script} text",
  async ({ reader }, script: Script) => {
    await expectFatihahIn(reader.page, reader.language, script);
  },
);

Then("the Word card at {location} shows its {script} text", async ({ reader }, location: string, script: Script) => {
  // Not its Particle tag (#249), which can read as the Word does (الٓمٓ).
  const word = card(reader.page, location).getByText(scriptText(location, script), { exact: true });
  await expect(word.and(reader.page.locator("xpath=//*[not(ancestor-or-self::button)]"))).toBeVisible();
});

Then("the Bismillah is shown in its {script} text and not in its {script} text", async ({ reader }, shown: Script, hidden: Script) => {
  await expect(reader.page.getByText(bismillah(shown), { exact: true })).toBeVisible();
  await expect(reader.page.getByText(bismillah(hidden), { exact: true })).toBeHidden();
});

// ---------------------------------------------------------------- Arabic font

Then("the {script} Arabic font file is downloaded", async ({ reader }, script: Script) => {
  await reader.page.evaluate(() => document.fonts.ready);
  await expect.poll(() => reader.fonts.map(sha256)).toContain(fontFileHash(FONT[script]));
});

Then("the {script} Arabic font file is not downloaded", async ({ reader }, script: Script) => {
  await reader.page.evaluate(() => document.fonts.ready);
  expect(reader.fonts.map(sha256)).not.toContain(fontFileHash(FONT[script]));
});

Then("the {script} text of the Word at {location} is set in a font face that has loaded", async ({ reader }, script: Script, location: string) => {
  const arabic = card(reader.page, location).getByText(scriptText(location, script), { exact: true });
  await expect(arabic).toBeVisible();
  const loaded = await arabic.evaluate((el) => {
    const family = getComputedStyle(el).fontFamily.split(",")[0].trim().replace(/^['"]|['"]$/g, "");
    return Array.from(document.fonts).some((f) => f.family.replace(/^['"]|['"]$/g, "") === family && f.status === "loaded");
  });
  expect(loaded).toBe(true);
});

// ---------------------------------------------------------------- Ayah translation

When(/^I turn the Ayah translation switch (on|off)$/, async ({ reader }, state: string) => {
  await inSettings(reader.page, async () => {
    const toggle = translationSwitch(reader.page);
    // Turning it on starts from off, and off from on.
    if (state === "on") await expect(toggle).not.toBeChecked();
    else await expect(toggle).toBeChecked();
    await toggle.click();
  });
});

Then(/^the Ayah translation switch is (on|off)$/, async ({ reader }, state: string) => {
  await inSettings(reader.page, async () => {
    const toggle = translationSwitch(reader.page);
    if (state === "on") await expect(toggle).toBeChecked();
    else await expect(toggle).not.toBeChecked();
  });
});

Then("no Al-Fatihah Ayah translation is shown", async ({ reader }) => {
  await expectTranslations(reader.page, reader.language, false);
});

Then(
  /^each Al-Fatihah Ayah shows its (Jalandhari|Saheeh International) Ayah translation after its last Word card and before the next Ayah, and never the other Language's$/,
  async ({ reader }, translator: string) => {
    expect(translator, "the page's Language's translator").toBe(reader.language === "ur" ? "Jalandhari" : "Saheeh International");
    await expectTranslations(reader.page, reader.language, true);
  },
);

Then("the Ayah translation of 2:1 shows Saheeh International's text without its footnotes", async ({ reader }) => {
  await expect(reader.page.getByText(ayahTranslation("2:1", "en"), { exact: true })).toBeVisible();
});

Then("the shown Ayah translation of 2:1 contains no {string}", async ({ reader }, bracket: string) => {
  const text = reader.page.getByText(ayahTranslation("2:1", "en"), { exact: true });
  expect(await text.textContent()).not.toContain(bracket);
});

// The Ayah translation's box is as wide as the row of Word cards above it, so neither edge is left with a gap the other has not.
Then("the Ayah translation of {word} starts and ends where its Ayah's row of Word cards does", async ({ reader }, ayah: string) => {
  const cards = (await card(reader.page, `${ayah}:1`).locator("..").boundingBox())!;
  const text = (await reader.page.getByText(ayahTranslation(ayah, reader.language), { exact: true }).boundingBox())!;
  expect(text.x, "the translation's left edge against the row of Word cards'").toBeCloseTo(cards.x, 0);
  expect(text.x + text.width, "the translation's right edge against the row of Word cards'").toBeCloseTo(cards.x + cards.width, 0);
});

Then("the {language} Ayah translation of {word} is shown", async ({ reader }, lang: Language, ayah: string) => {
  await expect(reader.page.getByText(ayahTranslation(ayah, lang), { exact: true })).toBeVisible();
});

Then("the {language} Ayah translation of {word} is not shown", async ({ reader }, lang: Language, ayah: string) => {
  await expect(reader.page.getByText(ayahTranslation(ayah, lang), { exact: true })).toBeHidden();
});

// The page's text, not its scripts: React's flight data writes "[[" as JSON.
const pageText = (html: string) => html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "");

When("I fetch every English Surah page from \\/en\\/1 to \\/en\\/114", async ({ reader, request }) => {
  reader.fetched.clear();
  for (const { number } of sourceSurahs()) {
    const res = await request.get(`/en/${number}`);
    expect(res.status(), `/en/${number}`).toBe(200);
    reader.fetched.set(`/en/${number}`, pageText(await res.text()));
  }
});

Then("there are {int} of them", async ({ reader }, count: number) => {
  expect(reader.fetched.size).toBe(count);
});

Then("none of their page text contains {string}", async ({ reader }, bracket: string) => {
  for (const [path, text] of reader.fetched) expect(text, path).not.toContain(bracket);
});

// Control: the server HTML does carry the Ayah translation (it is shown or
// hidden by the saved setting before first paint, AC-8), so the check above is
// not vacuous. 1:1 has two footnotes in the source and no HTML-escaped characters.
Then("the page text of \\/en\\/1 carries the English Ayah translation of 1:1", async ({ reader }) => {
  expect(reader.fetched.get("/en/1")).toContain(ayahTranslation("1:1", "en"));
});

// ---------------------------------------------------------------- theme

When("I choose the {theme} theme", async ({ reader }, theme: Theme) => {
  await inSettings(reader.page, () => themeButton(reader.page, theme).click());
});

Then("the {theme} theme is selected", async ({ reader }, theme: Theme) => {
  await inSettings(reader.page, () => expect(themeButton(reader.page, theme)).toHaveAttribute("aria-pressed", "true"));
});

Then("the page's root element carries data-theme {string}", async ({ reader }, theme: string) => {
  await expect(reader.page.locator("html")).toHaveAttribute("data-theme", theme);
});

Then("the page is drawn on the {theme} paper", async ({ reader }, theme: Theme) => {
  expect(await bodyBackground(reader.page)).toBe(await resolveColor(reader.page, PAPER[theme]));
});

// ---------------------------------------------------------------- first paint

const expectHtml = (state: HtmlState | null, moment: string, script: string, theme: string, translations: (string | null)[]) => {
  expect(state, moment).not.toBeNull();
  expect(state!.script, `${moment}: Script`).toBe(script);
  expect(state!.theme, `${moment}: theme`).toBe(theme);
  expect(translations, `${moment}: translation`).toContain(state!.translation);
};

const momentOf = async (page: Parameters<typeof firstPaint>[0], moment: string) => {
  const { content, frame } = await firstPaint(page);
  return moment.startsWith("when") ? content : frame;
};

Then(
  /^(when the first content entered the page|in the first animation frame), <html> had data-script "(\w+)", data-theme "(\w+)" and data-translation "(on|off)"( or none)?$/,
  async ({ reader }, moment: string, script: string, theme: string, translation: string, orNone: string | undefined) => {
    expectHtml(await momentOf(reader.page, moment), moment, script, theme, orNone ? [translation, null] : [translation]);
  },
);

Then(
  /^(when the first content entered the page|in the first animation frame), <html> had data-arabic-size "(\d+)" and data-meaning-size "(\d+)"$/,
  async ({ reader }, moment: string, arabicSize: number, meaningSize: number) => {
    const state = await momentOf(reader.page, moment);
    expect(state, moment).not.toBeNull();
    expect({ arabicSize: state!.arabicSize, meaningSize: state!.meaningSize }, moment).toEqual({
      arabicSize: String(arabicSize),
      meaningSize: String(meaningSize),
    });
  },
);

Then(
  "when I open the Settings drawer, from the first frame it is drawn in it shows {script} and {theme} selected, the Ayah translation knob {word} without sliding, Arabic size {word} and Meaning size {word}",
  async ({ reader }, script: Script, theme: Theme, knob: string, arabicSize: string, meaningSize: string) => {
    expectControlsShow(await openSettingsWatchingFrames(reader.page), {
      script: STRINGS[script],
      theme: STRINGS[theme],
      knob: knob as "on" | "off",
      arabicSize,
      meaningSize,
    });
    await closeSettings(reader.page);
  },
);
