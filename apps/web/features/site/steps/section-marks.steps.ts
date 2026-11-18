// Steps for Section marks (#194, ADR 0020), as a reader and a screen reader
// meet them on a Surah page. A Section mark is a note (role "note") in the
// Surah's <main> whose text is its medallion sign (۞ or ع) and its label; the
// Ayah it stands above is the first Ayah section after it. The marks each Surah
// should show are read from its Surah file as the dataset build last wrote it
// (../committed-output.ts, BEFORE_QURAN_MOVED), never typed.

import { expect, type Locator, type Page } from "@playwright/test";
import type { SectionMarks } from "@saaliheen/dataset/types";
import type { DataTable } from "playwright-bdd";
import { committedBuiltSurah } from "../committed-output";
import { PHONE, ayahSections, card, nextFrames, shot } from "../support";
import { Given, Then, When } from "./fixtures";
import { contrast } from "./phrase-colours.steps";
import { firstPaint, inSettings, scriptText, sectionMarksButton, sectionMarksGroup, settingsPanel, type Script } from "./reader";

type Mode = "Hizb quarters" | "Rukus";
const SIGN: Record<Mode, string> = { "Hizb quarters": "۞", Rukus: "ع" };
const VALUE: Record<Mode, string> = { "Hizb quarters": "hizb", Rukus: "ruku" };
const modeOf = (name: string): Mode => {
  if (name === "Hizb quarters" || name === "Rukus") return name;
  throw new Error(`no Section marks mode named "${name}"`);
};

/** A Section mark as the page shows it: the Ayah (`s:a`) it stands above, its sign and its label. */
interface SeenMark {
  above: string;
  sign: string;
  label: string;
}

/** Surah `n`'s marks of `mode` in its built Surah file (`sectionMarks`). */
function fileMarks(n: number, mode: Mode): SeenMark[] {
  const surah = committedBuiltSurah<{ sectionMarks?: SectionMarks }>(n);
  expect(surah.sectionMarks, `Surah ${n}'s generated Surah file carries its Section marks (sectionMarks)`).toBeDefined();
  const list = mode === "Hizb quarters" ? surah.sectionMarks!.hizbQuarters : surah.sectionMarks!.rukus;
  return list.map((m) => ({ above: `${n}:${m.ayah}`, sign: SIGN[mode], label: m.label }));
}

/** Every Section mark the page draws: each visible note in <main> carrying ۞ or ع, with the Ayah it stands above, and whether it is drawn above that Ayah's first line. */
const drawnMarks = (page: Page) =>
  page.locator("main").evaluate((main) => {
    const ayahs = Array.from(main.querySelectorAll<HTMLElement>("section[id]:not(:has(section[id]))"));
    return Array.from(main.querySelectorAll<HTMLElement>('[role="note"]'))
      .filter((n) => n.getClientRects().length > 0 && getComputedStyle(n).visibility !== "hidden")
      .map((n) => {
        const text = (n.textContent ?? "").replace(/\s+/g, " ").trim();
        const sign = text.includes("۞") ? "۞" : text.includes("ع") ? "ع" : "";
        const next = ayahs.find((a) => n.compareDocumentPosition(a) & Node.DOCUMENT_POSITION_FOLLOWING);
        const markBottom = n.getBoundingClientRect().bottom;
        const ayahTop = next?.getClientRects()[0]?.top ?? Number.NEGATIVE_INFINITY;
        return { above: next?.id ?? "", sign, label: text.replace(sign, "").trim(), drawnAbove: markBottom <= ayahTop + 1 };
      })
      .filter((m) => m.sign);
  });

async function expectMarks(page: Page, expected: SeenMark[]) {
  await expect
    .poll(async () => (await drawnMarks(page)).map(({ above, sign, label }) => ({ above, sign, label })), { message: "the Section marks drawn" })
    .toEqual(expected);
  for (const m of await drawnMarks(page)) expect(m.drawnAbove, `the Section mark "${m.label}" is drawn above Ayah ${m.above}`).toBe(true);
}

/** The visible Section mark labelled `label`. */
const markLabelled = (page: Page, label: string): Locator =>
  page.locator("main").getByRole("note").filter({ hasText: label });

// ---------------------------------------------------------------- choosing

When("I choose {string} for Section marks", async ({ reader }, name: string) => {
  const mode = modeOf(name);
  await inSettings(reader.page, async () => {
    await expect(sectionMarksGroup(reader.page), "the Section marks setting").toBeVisible();
    await sectionMarksButton(reader.page, mode).click();
    await expect(sectionMarksButton(reader.page, mode)).toHaveAttribute("aria-pressed", "true");
  });
  await expect(reader.page.locator("html")).toHaveAttribute("data-section-marks", VALUE[mode]);
});

Then("the Section marks setting shows {string} chosen", async ({ reader }, name: string) => {
  const mode = modeOf(name);
  await inSettings(reader.page, async () => {
    await expect(sectionMarksGroup(reader.page), "the Section marks setting").toBeVisible();
    await expect(sectionMarksButton(reader.page, mode)).toHaveAttribute("aria-pressed", "true");
  });
});

Then(
  "Me's reader settings offer {string} with {string} and {string}, {string} chosen",
  async ({ reader }, group: string, first: string, second: string, chosen: string) => {
    const panel = settingsPanel(reader.page);
    const setting = panel.getByRole("group", { name: group, exact: true });
    await expect(setting, `Me's ${group} setting`).toBeVisible();
    await expect(setting.getByRole("button")).toHaveText([first, second]);
    await expect(setting.getByRole("button", { name: chosen, exact: true })).toHaveAttribute("aria-pressed", "true");
  },
);

// ---------------------------------------------------------------- <html>

Then("the page's root element has data-section-marks {string}", async ({ reader }, value: string) => {
  await expect(reader.page.locator("html")).toHaveAttribute("data-section-marks", value);
});

Then(
  "when the first content entered the page and in the first animation frame, the page's root element had data-section-marks {string}",
  async ({ reader }, value: string) => {
    const { content, frame } = await firstPaint(reader.page);
    expect(content?.sectionMarks, "data-section-marks when the first content entered the page").toBe(value);
    expect(frame?.sectionMarks, "data-section-marks in the first animation frame").toBe(value);
  },
);

// ---------------------------------------------------------------- what the page shows

Then("Surah {int} shows exactly these Section marks", async ({ reader }, surah: number, table: DataTable) => {
  const expected = table.hashes().map((r) => ({ above: r.above, sign: r.sign, label: r.label }));
  for (const m of expected) expect(m.above.startsWith(`${surah}:`)).toBe(true);
  await expectMarks(reader.page, expected);
});

Then(
  /^Surah (\d+) shows exactly the (Hizb quarters|Rukus) marks of its Surah file, each above its Ayah$/,
  async ({ reader }, n: string, mode: string) => {
    await expectMarks(reader.page, fileMarks(Number(n), modeOf(mode)));
  },
);

When("I note the Ayahs on the page", async ({ reader }) => {
  const noted = await ayahSections(reader.page).evaluateAll((els) => {
    for (const el of els) (el as HTMLElement & { __noted194?: boolean }).__noted194 = true;
    return els.length;
  });
  expect(noted, "Ayahs on the page").toBeGreaterThan(0);
  await reader.page.evaluate((n) => ((window as unknown as { __notedAyahs194: number }).__notedAyahs194 = n), noted);
});

Then("the Ayahs on the page are the ones I noted, not drawn again", async ({ reader }) => {
  const seen = await ayahSections(reader.page).evaluateAll((els) => ({
    count: els.length,
    redrawn: els.filter((el) => !(el as HTMLElement & { __noted194?: boolean }).__noted194).map((el) => el.id),
  }));
  const noted = await reader.page.evaluate(() => (window as unknown as { __notedAyahs194?: number }).__notedAyahs194);
  expect(seen).toEqual({ count: noted, redrawn: [] });
});

Then("the Word card at {location} shows its {script} text without a printed ۞", async ({ reader }, location: string, script: Script) => {
  const expected = scriptText(location, script).replace(/^۞ /, "");
  await expect(card(reader.page, location)).toContainText(expected);
  await expect(card(reader.page, location)).not.toContainText("۞");
});

Then(
  "the Section mark {string} is drawn above the Passage heading above Ayah {word}",
  async ({ reader }, label: string, ayah: string) => {
    const mark = markLabelled(reader.page, label);
    await expect(mark, `the Section mark "${label}"`).toBeVisible();
    const placed = await mark.evaluate((n, target) => {
      const main = n.closest("main")!;
      const isAyahHeading = (h: Element) => /^Ayah \d+$/.test((h.textContent ?? "").trim());
      const all = Array.from(main.querySelectorAll<HTMLElement>('h1, h2, h3, h4, h5, h6, [role="heading"]'));
      const ayahHeadings = all.filter(isAyahHeading);
      const heading = all
        .filter((h) => !isAyahHeading(h) && h.getClientRects().length > 0)
        .find((h) => ayahHeadings.find((a) => h.compareDocumentPosition(a) & Node.DOCUMENT_POSITION_FOLLOWING)?.closest("section[id]")?.id === target);
      if (!heading) return { heading: false, before: false, above: false };
      return {
        heading: true,
        before: Boolean(n.compareDocumentPosition(heading) & Node.DOCUMENT_POSITION_FOLLOWING),
        above: n.getBoundingClientRect().bottom <= heading.getBoundingClientRect().top + 1,
      };
    }, ayah);
    expect(placed, `the Section mark "${label}" and the Passage heading above Ayah ${ayah}`).toEqual({ heading: true, before: true, above: true });
  },
);

// ---------------------------------------------------------------- screen readers, themes, motion

Then("the page's accessibility tree holds exactly these Section marks", async ({ reader }, table: DataTable) => {
  const labels = table.hashes().map((r) => r.label);
  // getByRole leaves out what is hidden from screen readers (display: none, visibility: hidden, aria-hidden).
  const notes = reader.page.locator("main").getByRole("note").filter({ hasText: /Hizb \d+|Ruku \d+ of \d+/ });
  await expect(notes, "Section marks a screen reader is told of").toHaveCount(labels.length);
  for (const [k, label] of labels.entries()) {
    await expect(notes.nth(k), `Section mark ${k + 1}`).toContainText(label);
    expect(await notes.nth(k).ariaSnapshot(), `what a screen reader is told of Section mark ${k + 1}`).toContain(label);
  }
});

Given("I open {string} on a {word} screen", async ({ reader, reading }, path: string, viewport: string) => {
  if (viewport !== "desktop" && viewport !== "phone") throw new Error(`no viewport named "${viewport}"`);
  reading.viewport = viewport;
  if (viewport === "phone") await reader.page.setViewportSize(PHONE);
  await reader.page.goto(path);
});

Then(
  "the label of the Section mark {string} contrasts with what is behind it by at least {float} to {int}, and its sign by at least {int} to {int}",
  async ({ reader }, label: string, labelRatio: number, _one: number, signRatio: number, _alsoOne: number) => {
    const mark = markLabelled(reader.page, label);
    await expect(mark, `the Section mark "${label}"`).toBeVisible();
    const colours = await mark.evaluate((n) => {
      const behind = (el: Element | null): string => {
        for (let e = el; e; e = e.parentElement) {
          const bg = getComputedStyle(e).backgroundColor;
          if (bg && bg !== "transparent" && !/rgba\(.*,\s*0\)$/.test(bg)) return bg;
        }
        return getComputedStyle(document.body).backgroundColor;
      };
      const texts: { what: "sign" | "label"; colour: string; background: string }[] = [];
      const walker = document.createTreeWalker(n, NodeFilter.SHOW_TEXT);
      for (let t = walker.nextNode(); t; t = walker.nextNode()) {
        const value = (t.textContent ?? "").trim();
        if (!value || !t.parentElement) continue;
        const what = /[۞ع]/.test(value) ? "sign" : "label";
        texts.push({ what, colour: getComputedStyle(t.parentElement).color, background: behind(t.parentElement) });
      }
      return texts;
    });
    expect(colours.map((c) => c.what), `the Section mark "${label}" draws its sign and its label`).toEqual(expect.arrayContaining(["sign", "label"]));
    for (const c of colours) {
      const ratio = contrast(c.colour, c.background);
      const least = c.what === "label" ? labelRatio : signRatio;
      expect(ratio, `the ${c.what} of "${label}": ${c.colour} on ${c.background}`).toBeGreaterThanOrEqual(least);
    }
  },
);

Then("I save a screenshot of the Section mark {string} {string}", async ({ reader }, label: string, name: string) => {
  await heldStill(reader.page, markLabelled(reader.page, label));
  await shot(reader.page, name);
});

/**
 * Scrolls `target` into the middle of the screen until it holds still there:
 * the Ayahs coming on screen take their real heights (content-visibility),
 * which moves what is below them.
 */
async function heldStill(page: Page, target: Locator) {
  await expect(async () => {
    await target.evaluate((el) => el.scrollIntoView({ block: "center" }));
    const before = await target.boundingBox();
    await nextFrames(page);
    expect(await target.boundingBox()).toEqual(before);
  }).toPass();
}

// ---------------------------------------------------------------- the medallion's sign

/** How many device pixels to each CSS pixel the medallion is drawn at, to measure its sign's ink and to shoot it enlarged. */
const ENLARGED = 4;

/**
 * Runs `job` on the reader's page as drawn at ENLARGED device pixels to each
 * CSS pixel: the same address, settings and viewport opened in a context of
 * that scale beside the reader's, closed after.
 */
async function enlarged<T>(page: Page, job: (page: Page) => Promise<T>): Promise<T> {
  const context = page.context();
  const big = await context.browser()!.newContext({
    deviceScaleFactor: ENLARGED,
    viewport: page.viewportSize(),
    storageState: await context.storageState(),
    reducedMotion: "reduce",
  });
  try {
    const twin = await big.newPage();
    await twin.goto(page.url());
    return await job(twin);
  } finally {
    await big.close();
  }
}

/** The disc holding the sign of the Section mark labelled `label`, scrolled into the middle of the screen. */
async function discOf(page: Page, label: string): Promise<Locator> {
  const disc = markLabelled(page, label).locator('[aria-hidden="true"]').first();
  await expect(disc, `the sign's disc of the Section mark "${label}"`).toBeVisible();
  await disc.evaluate(async (el) => {
    const { fontSize, fontFamily } = getComputedStyle(el);
    await document.fonts.load(`${fontSize} ${fontFamily}`, el.textContent ?? "");
    await document.fonts.ready;
  });
  await heldStill(page, disc);
  return disc;
}

/**
 * The bounding box of the pixels the sign's ink changes, and the disc's
 * middle, in CSS pixels within the medallion: the medallion shot as drawn and
 * again with the sign transparent, compared pixel by pixel.
 */
async function inkBox(page: Page, disc: Locator) {
  // The medallion around the disc is the frame: wider than the disc, so ink past its edge is not cut away.
  const medal = disc.locator("..");
  const shoot = () => medal.screenshot({ animations: "disabled", scale: "device" });
  const drawn = await shoot();
  const [at, frame] = [(await disc.boundingBox())!, (await medal.boundingBox())!];
  await disc.evaluate((el) => el.style.setProperty("color", "transparent"));
  const bare = await shoot();
  await disc.evaluate((el) => el.style.removeProperty("color"));
  const middle = { x: at.x - frame.x + at.width / 2, y: at.y - frame.y + at.height / 2 };
  return page.evaluate(
    async ({ drawn, bare, scale }) => {
      const pixels = async (png: string) => {
        const img = new Image();
        img.src = `data:image/png;base64,${png}`;
        await img.decode();
        const canvas = document.createElement("canvas");
        [canvas.width, canvas.height] = [img.width, img.height];
        const g = canvas.getContext("2d")!;
        g.drawImage(img, 0, 0);
        return g.getImageData(0, 0, img.width, img.height);
      };
      const [a, b] = [await pixels(drawn), await pixels(bare)];
      const box = { top: Infinity, bottom: 0, left: Infinity, right: 0 };
      for (let y = 0; y < a.height; y++)
        for (let x = 0; x < a.width; x++) {
          const k = (y * a.width + x) * 4;
          const change = Math.abs(a.data[k] - b.data[k]) + Math.abs(a.data[k + 1] - b.data[k + 1]) + Math.abs(a.data[k + 2] - b.data[k + 2]);
          if (change < 96) continue;
          box.top = Math.min(box.top, y);
          box.bottom = Math.max(box.bottom, y + 1);
          box.left = Math.min(box.left, x);
          box.right = Math.max(box.right, x + 1);
        }
      const css = (v: number) => v / scale;
      return { top: css(box.top), bottom: css(box.bottom), left: css(box.left), right: css(box.right) };
    },
    { drawn: drawn.toString("base64"), bare: bare.toString("base64"), scale: ENLARGED },
  ).then((ink) => ({ ...ink, middle }));
}

/**
 * The disc of the Section mark labelled `label` once its sign is painted, and
 * its ink: until the medallion is painted on screen (the page may still be
 * settling its scroll) there is no ink to measure, and a shot of it is blank.
 */
async function paintedDisc(page: Page, label: string) {
  let painted: { disc: Locator; ink: Awaited<ReturnType<typeof inkBox>> } | undefined;
  await expect(async () => {
    const disc = await discOf(page, label);
    const ink = await inkBox(page, disc);
    expect(ink.bottom - ink.top, `the sign of "${label}" draws ink`).toBeGreaterThan(0);
    painted = { disc, ink };
  }).toPass();
  return painted!;
}

Then(
  /^the ink of the Section mark "(.+)"'s sign is centred in its disc, within (\d+) pixels?$/,
  async ({ reader }, label: string, within: string) => {
    const { ink } = await enlarged(reader.page, (page) => paintedDisc(page, label));
    const seen = `"${label}": ink ${JSON.stringify(ink)}`;
    expect(Math.abs((ink.top + ink.bottom) / 2 - ink.middle.y), `how far the ink's middle is below or above the disc's, ${seen}`).toBeLessThanOrEqual(Number(within));
    expect(Math.abs((ink.left + ink.right) / 2 - ink.middle.x), `how far the ink's middle is beside the disc's, ${seen}`).toBeLessThanOrEqual(Number(within));
  },
);

Then("I save an enlarged screenshot of the Section mark {string} {string}", async ({ reader }, label: string, name: string) => {
  await enlarged(reader.page, async (page) => shot((await paintedDisc(page, label)).disc.locator(".."), name));
});

Then("nothing on the page is animating or in transition", async ({ reader }) => {
  const moving = await reader.page.evaluate(() =>
    document
      .getAnimations()
      .filter((a) => a.playState === "running")
      .map((a) => {
        const target = (a.effect as KeyframeEffect | null)?.target;
        return target && document.querySelector("main")?.contains(target) ? `${target.tagName}.${target.className}` : null;
      })
      .filter(Boolean),
  );
  expect(moving, "animations or transitions running in the Surah").toEqual([]);
});
