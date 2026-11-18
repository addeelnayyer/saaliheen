// What the reader settings look like to a user (#4), shared by the site steps.
// Controls are found by role and accessible name, English in every Language
// (STRINGS in ../support); expected Arabic and Ayah translations are read from
// the committed sources through features/site/support.ts, never typed.

import { expect, type Locator, type Page } from "@playwright/test";
import {
  STRINGS,
  ayahTranslation,
  card,
  cardLocations,
  clickInPlace,
  indopakText,
  SIZE_STEPS,
  sourceSurahs,
  sourceWords,
  type Language,
} from "../support";
import { OTHER, precedes } from "./fixtures";

export type Script = "uthmani" | "indopak";
export type Theme = "light" | "dark";

// The Language switch's links keep each Language's own name (اردو / English).
export const LANGUAGE_NAME: Record<Language, string> = { ur: "اردو", en: "English" };

/** The control that switches to `target` Language: a link or a button named in that Language. */
export const languageControl = (page: Page, target: Language) =>
  page
    .getByRole("link", { name: LANGUAGE_NAME[target], exact: true })
    .or(page.getByRole("button", { name: LANGUAGE_NAME[target], exact: true }))
    .first();

// ---------------------------------------------------------------- the Settings drawer

/** The Surah bar's Reading settings button (#192). */
export const settingsButton = (page: Page) => page.getByRole("button", { name: STRINGS.settings, exact: true });

/** The Reading settings sheet: a dialog named "Reading settings". */
export const settingsDrawer = (page: Page) => page.getByRole("dialog", { name: STRINGS.settings, exact: true });

/**
 * Where the reader settings are on screen: the Reading settings sheet, or Me's
 * own Reading settings section (#192). Me holds the same controls as the sheet.
 */
export const settingsPanel = (page: Page) =>
  settingsDrawer(page).or(page.getByRole("region", { name: STRINGS.settings, exact: true }));

/** The text of the reader settings' control after `control`, in document order, or null. */
export const controlAfter = async (page: Page, control: Locator) =>
  settingsPanel(page).evaluate((panel, control) => {
    const controls = Array.from(panel.querySelectorAll("button, input, select, [role=switch]")).filter((c) => !c.closest("[aria-hidden=true]"));
    return controls[controls.indexOf(control!) + 1]?.textContent?.trim() ?? null;
  }, await control.elementHandle());

/** The page a step left for Me to change a setting, to come back to after (#192). */
const leftFor = new WeakMap<Page, string>();

/** The Language of the page's address, or English for a page outside both. */
const languageOf = (page: Page) => (new URL(page.url()).pathname.match(/^\/(ur|en)(\/|$)/)?.[1] ?? "en") as Language;

/**
 * Show the reader settings, unless they are on screen already: on a Surah
 * page by its Reading settings button (a tap before the page has hydrated
 * does nothing, so tap again, as a reader would); on any other page, which
 * has no sheet since #192, by going to Me as a reader does, to come back
 * after (closeSettings).
 */
export async function openSettings(page: Page) {
  if (await settingsPanel(page).isVisible()) return;
  if ((await settingsButton(page).count()) === 0) {
    leftFor.set(page, page.url());
    await page.goto(`/${languageOf(page)}/me`);
    await expect(settingsPanel(page)).toBeVisible();
    return;
  }
  await expect(async () => {
    await clickInPlace(settingsButton(page));
    await expect(settingsDrawer(page)).toBeVisible({ timeout: 1000 });
  }).toPass();
}

/** Close the Reading settings sheet with Escape, if it is open, or go back from Me to the page left for it. */
export async function closeSettings(page: Page) {
  const left = leftFor.get(page);
  if (left) {
    leftFor.delete(page);
    await page.goto(left);
    return;
  }
  if (!(await settingsDrawer(page).isVisible())) return;
  await page.keyboard.press("Escape");
  // The closed drawer can stay in the page a moment before React removes it, its preview with it: wait until it is gone.
  await expect(page.getByRole("dialog", { name: STRINGS.settings, exact: true, includeHidden: true })).toHaveCount(0);
}

/**
 * Do `act` with the reader settings on screen. Settings not on screen are
 * shown for it and put away again after, so the steps after read the page
 * as it was; a sheet a scenario opened itself, or Me's own, stays.
 */
export async function inSettings<T>(page: Page, act: () => Promise<T>): Promise<T> {
  const wasOpen = await settingsPanel(page).isVisible();
  await openSettings(page);
  const result = await act();
  if (!wasOpen) await closeSettings(page);
  return result;
}

// The settings controls: found only while they are on screen (inSettings).
export const scriptButton = (page: Page, script: Script) =>
  settingsPanel(page).getByRole("group", { name: STRINGS.script }).getByRole("button", { name: STRINGS[script], exact: true });

export const themeButton = (page: Page, theme: Theme) =>
  settingsPanel(page).getByRole("group", { name: STRINGS.theme }).getByRole("button", { name: STRINGS[theme], exact: true });

/** The Section marks setting (#194): a group "Section marks" of two buttons, "Hizb quarters" and "Rukus", the chosen one pressed. */
export const sectionMarksGroup = (page: Page) => settingsPanel(page).getByRole("group", { name: "Section marks", exact: true });
export const sectionMarksButton = (page: Page, mode: "Hizb quarters" | "Rukus") =>
  sectionMarksGroup(page).getByRole("button", { name: mode, exact: true });

/** The Ayah translation switch: a switch (or checkbox) by its name. */
export const translationSwitch = (page: Page) =>
  settingsPanel(page)
    .getByRole("switch", { name: STRINGS.translation, exact: true })
    .or(settingsPanel(page).getByRole("checkbox", { name: STRINGS.translation, exact: true }))
    .first();

export type SizeSetting = "Arabic size" | "Meaning size";

/** Arabic size's or Meaning size's stepper: a group by its name, with Smaller and Larger buttons and its current step. */
export const stepper = (page: Page, setting: SizeSetting) => {
  const group = settingsPanel(page).getByRole("group", { name: setting, exact: true });
  return {
    group,
    smaller: group.getByRole("button", { name: STRINGS.smaller, exact: true }),
    larger: group.getByRole("button", { name: STRINGS.larger, exact: true }),
    /** The step it shows, e.g. "115%". */
    value: group.getByText(/^\d+%$/),
  };
};

/** Step a size from 100% to `percent` (one of the steps) with its − or + button, in the open drawer. */
export async function stepTo(page: Page, setting: SizeSetting, percent: number) {
  const s = stepper(page, setting);
  const from = SIZE_STEPS.indexOf(Number((await s.value.textContent())!.replace("%", "")));
  const to = SIZE_STEPS.indexOf(percent);
  if (to < 0) throw new Error(`${percent}% is not a step`);
  for (let i = from; i !== to; i += Math.sign(to - from)) await (to > from ? s.larger : s.smaller).click();
  await expect(s.value).toHaveText(`${percent}%`);
}

// The design's paper token per theme (src/app/globals.css), what a user sees behind the page.
export const PAPER: Record<Theme, string> = { light: "#FFFFFF", dark: "#111412" };
export const bodyBackground = (page: Page) => page.locator("body").evaluate((el) => getComputedStyle(el).backgroundColor);

/** The page is still `path` exactly: no setting went into the URL. */
export const expectPath = (page: Page, path: string) =>
  expect(page).toHaveURL((url) => url.pathname === path && url.search === "" && url.hash === "");

/** Al-Fatihah's Ayahs, each with its first and last Word location, from the sources. */
export const fatihahAyahs = () => {
  const words = sourceWords(1);
  return Array.from({ length: sourceSurahs()[0].ayahCount }, (_, k) => {
    const locations = words.filter((w) => w.location.startsWith(`1:${k + 1}:`)).map((w) => w.location);
    return { number: k + 1, ayah: `1:${k + 1}`, first: locations[0], last: locations.at(-1)! };
  });
};

/** Ayah `s:a` as a Script writes it: its Words in that Script, from the sources. */
export const ayahText = (ayah: string, script: Script) =>
  sourceWords(Number(ayah.split(":")[0]))
    .filter((w) => w.location.startsWith(`${ayah}:`))
    .map((w) => (script === "uthmani" ? w.uthmani : indopakText(w.location)))
    .join(" ");

/** The Bismillah as a Script writes it: Ayah 1:1. */
export const bismillah = (script: Script) => ayahText("1:1", script);

/** A Word's text in a Script, from the sources (ADR 0002). */
export const scriptText = (location: string, script: Script) =>
  script === "uthmani" ? sourceWords(Number(location.split(":")[0])).find((w) => w.location === location)!.uthmani : indopakText(location);

/** Every Al-Fatihah card shows the `script` text and the Word meaning, and not the other Script's text. */
export async function expectFatihahIn(page: Page, lang: Language, script: Script) {
  const words = sourceWords(1);
  expect(await cardLocations(page)).toEqual(words.map((w) => w.location));
  for (const w of words) {
    const c = card(page, w.location);
    const shown = script === "uthmani" ? w.uthmani : indopakText(w.location);
    const other = script === "uthmani" ? indopakText(w.location) : w.uthmani;
    await expect(c.getByText(w.meaning[lang], { exact: true }), `${w.location} ${lang} meaning`).toBeVisible();
    await expect(c.getByText(shown, { exact: true }), `${w.location} ${script} text`).toBeVisible();
    if (other !== shown) await expect(c.getByText(other, { exact: true }), `${w.location} other Script`).toBeHidden();
  }
}

/**
 * Every Al-Fatihah Ayah translation in `lang` is shown under its Ayah (after
 * its last Word card, before the next Ayah's marker), or none is; the other
 * Language's is never shown.
 */
export async function expectTranslations(page: Page, lang: Language, shown: boolean) {
  const ayahs = fatihahAyahs();
  for (const [i, a] of ayahs.entries()) {
    await card(page, a.first).scrollIntoViewIfNeeded();
    const text = page.getByText(ayahTranslation(a.ayah, lang), { exact: true });
    await expect(page.getByText(ayahTranslation(a.ayah, OTHER[lang]), { exact: true }), `${a.ayah} ${OTHER[lang]}`).toBeHidden();
    if (!shown) {
      await expect(text, `${a.ayah} hidden`).toBeHidden();
      continue;
    }
    await expect(text, `${a.ayah} ${lang}`).toBeVisible();
    expect(await precedes(card(page, a.last), text), `${a.ayah} after ${a.last}`).toBe(true);
    const next = ayahs[i + 1];
    if (next) {
      const marker = page.getByText(STRINGS.ayah(next.number), { exact: true });
      expect(await precedes(text, marker), `${a.ayah} before Ayah ${next.number}`).toBe(true);
    }
  }
}

// ---------------------------------------------------------------- first paint

export interface HtmlState {
  script: string | null;
  theme: string | null;
  translation: string | null;
  arabicSize: string | null;
  meaningSize: string | null;
  /** data-section-marks (#194): "hizb" or "ruku". */
  sectionMarks: string | null;
}

/**
 * Record <html>'s setting attributes at the two moments that decide a flash:
 * when the first content element enters <body> (nothing of the page can be
 * painted before it exists) and in the first animation frame (just before the
 * browser's first paint). Installed before any of the page's scripts.
 */
export async function watchFirstPaint(page: Page) {
  await page.addInitScript(() => {
    const w = window as unknown as { __firstContent?: HtmlState; __firstFrame?: HtmlState };
    const read = (): HtmlState => {
      const h = document.documentElement;
      return {
        script: h.getAttribute("data-script"),
        theme: h.getAttribute("data-theme"),
        translation: h.getAttribute("data-translation"),
        arabicSize: h.getAttribute("data-arabic-size"),
        meaningSize: h.getAttribute("data-meaning-size"),
        sectionMarks: h.getAttribute("data-section-marks"),
      };
    };
    const skip = new Set(["SCRIPT", "NOSCRIPT", "TEMPLATE", "LINK", "STYLE", "META"]);
    const observer = new MutationObserver((records) => {
      for (const r of records) {
        for (const n of Array.from(r.addedNodes)) {
          if (w.__firstContent || n.nodeType !== Node.ELEMENT_NODE || skip.has(n.nodeName)) continue;
          if (n.parentNode === document.body) {
            w.__firstContent = read();
            observer.disconnect();
          }
        }
      }
    });
    observer.observe(document, { childList: true, subtree: true });
    requestAnimationFrame(() => {
      if (!w.__firstFrame) w.__firstFrame = read();
    });
  });
}

/** <html>'s settings when the first content entered <body> and in the first animation frame, once both are known. */
export async function firstPaint(page: Page) {
  await page.waitForLoadState("load");
  const read = () =>
    page.evaluate(() => {
      const w = window as unknown as { __firstContent?: HtmlState; __firstFrame?: HtmlState };
      return { content: w.__firstContent ?? null, frame: w.__firstFrame ?? null };
    });
  await expect.poll(() => read().then((s) => s.frame)).not.toBeNull();
  return read();
}

/**
 * What the drawer's controls look like, not what their ARIA says: the label
 * of each group's button that is drawn selected (the one with a filled
 * background), where the translation switch's knob sits, and the step each
 * size stepper shows. `knob` is "on" at the far end of its track, "off" at the
 * near end, "between" while it slides; `offset` is its raw position, to catch a slide.
 */
export interface VisibleControls {
  script: string | null;
  theme: string | null;
  knob: "on" | "off" | "between" | null;
  offset: string | null;
  arabicSize: string | null;
  meaningSize: string | null;
}

/**
 * Open the Settings drawer and record what its controls visibly show in every
 * animation frame from the first one it is drawn in, for 30 frames. `knob` is
 * the on/off switch named `switchName` (the Ayah translation switch unless named).
 */
export async function openSettingsWatchingFrames(page: Page, switchName: string = STRINGS.translation): Promise<VisibleControls[]> {
  await page.evaluate(
    ({ drawerName, scriptGroup, themeGroup, switchName, sizeGroups }) => {
      const w = window as unknown as { __frames?: VisibleControls[]; __framesDone?: boolean };
      const drawer = () =>
        Array.from(document.querySelectorAll('[role="dialog"]')).find(
          (d) => document.getElementById(d.getAttribute("aria-labelledby") ?? "")?.textContent === drawerName,
        );
      const selected = (label: string) => {
        const group = drawer()?.querySelector(`[role="group"][aria-label="${label}"]`);
        if (!group) return null;
        const filled = Array.from(group.querySelectorAll("button")).filter(
          (b) => getComputedStyle(b).backgroundColor !== "rgba(0, 0, 0, 0)",
        );
        return filled.map((b) => b.textContent!.trim()).join(" + ") || "none";
      };
      const knob = (): Pick<VisibleControls, "knob" | "offset"> => {
        const sw = Array.from(drawer()?.querySelectorAll('[role="switch"]') ?? []).find((e) => e.textContent!.trim() === switchName);
        const thumb = sw?.querySelector('[data-slot="switch-thumb"]');
        const track = thumb?.parentElement;
        if (!thumb || !track) return { knob: null, offset: null };
        const dot = getComputedStyle(thumb);
        const start = parseFloat(dot.insetInlineStart);
        const end = track.getBoundingClientRect().width - parseFloat(dot.width) - start;
        return { knob: start > end + 1 ? "on" : end > start + 1 ? "off" : "between", offset: dot.insetInlineStart };
      };
      const step = (label: string) =>
        (drawer()?.querySelector(`[role="group"][aria-label="${label}"]`)?.textContent ?? "").match(/\d+%/)?.[0] ?? null;
      w.__frames = [];
      w.__framesDone = false;
      const sample = () => {
        if (drawer()) {
          w.__frames!.push({
            script: selected(scriptGroup),
            theme: selected(themeGroup),
            ...knob(),
            arabicSize: step(sizeGroups[0]),
            meaningSize: step(sizeGroups[1]),
          });
        }
        if (w.__frames!.length >= 30) w.__framesDone = true;
        else requestAnimationFrame(sample);
      };
      requestAnimationFrame(sample);
    },
    {
      drawerName: STRINGS.settings,
      scriptGroup: STRINGS.script,
      themeGroup: STRINGS.theme,
      switchName,
      sizeGroups: [STRINGS.arabicSize, STRINGS.meaningSize],
    },
  );
  await openSettings(page);
  await expect.poll(() => page.evaluate(() => (window as unknown as { __framesDone?: boolean }).__framesDone)).toBe(true);
  return page.evaluate(() => (window as unknown as { __frames: VisibleControls[] }).__frames);
}

/**
 * The controls show the saved settings in the first frame the drawer is drawn
 * in and in every frame after, and the translation switch's knob never slides.
 */
export function expectControlsShow(frames: VisibleControls[], expected: Omit<VisibleControls, "offset">) {
  const shown = (f: VisibleControls) => ({ script: f.script, theme: f.theme, knob: f.knob, arabicSize: f.arabicSize, meaningSize: f.meaningSize });
  expect(frames.length, "frames painted with the drawer").toBeGreaterThan(0);
  expect(shown(frames[0]), "the first frame with the drawer").toEqual(expected);
  frames.forEach((f, i) => expect(shown(f), `frame ${i + 1} of ${frames.length}`).toEqual(expected));
  expect(new Set(frames.map((f) => f.offset)).size, "the translation knob slid as the drawer opened").toBe(1);
}

/** An element's computed text size, in CSS pixels. */
export const fontSize = (l: Locator) => l.evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
