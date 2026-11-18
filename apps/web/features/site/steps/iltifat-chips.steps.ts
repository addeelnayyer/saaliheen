// Steps for the Iltifat chips in Study (#140). The Iltifat come from the run's
// own Postgres (./iltifat), never the catalogue file; direction names,
// Ayahs and "Disputed" from the feature (the issue's words). Things are found
// by role, link address and visible text.
//
// The chip's shape these steps expect (PROPOSED, #140 stage 1):
// - an <a> in the Ayah's <section>, one per Iltifat cited at that Ayah, whose
//   href is /{lang}/iltifat/{direction slug}#iltifat-{id} (the Iltifat's own
//   fragment, #138); the Iltifat pages' only other links into /iltifat/ are
//   not in a Surah's reading area;
// - it sits after the Ayah's last Word card and Ayah translation, in the one
//   container (the "footer") that also holds the Ayah's Theme chips;
// - its text reads "Iltifat · He → We" (arrows as the direction's name), with
//   " · Disputed" after it for a Disputed Iltifat; its accessible name says
//   "Iltifat, turns from He to We" (the direction badge's words, #138), with
//   ", disputed" after it; its text is English (lang="en") and left to right;
// - it is outlined (a visible border, no fill) where a Theme chip is filled.

import { expect, type Locator, type Page } from "@playwright/test";
import { ayahSection, ayahTranslation, nextFrames, shot, type Language } from "../support";
import { Then, When, precedes } from "./fixtures";
import { chips as themeChips } from "./themes";
import { DIRECTIONS, directionNamed, everyIltifat, fragmentOf, iltifatCitedAt, ayahsOfRun, iltifatAt, type Direction, type Iltifat } from "./iltifat";

const names = (list: string) => list.split(",").map((n) => n.trim()).filter(Boolean);

/** The Ayah an Iltifat is cited at, as `s:a`. */
const citedAyah = (i: Iltifat) => `${i.surah}:${i.cited}`;

const directionOf = (i: Iltifat): Direction => DIRECTIONS.find((d) => d.from === i.from && d.to === i.to)!;

/** The address a chip for `i` links to, in `lang`. */
const hrefOf = (lang: Language, i: Iltifat) => `/${lang}/iltifat/${directionOf(i).slug}#${fragmentOf(i)}`;

/** What a screen reader says for a direction: "turns from He to You". */
const said = (name: string) => `turns from ${name.replace(" → ", " to ")}`;

/** The Iltifat the database cites at `ayah`. */
const citedAt = async (ayah: string) => (await everyIltifat()).filter((i) => citedAyah(i) === ayah);

/** An Ayah's Iltifat chips: its links into a direction page. */
export const iltifatChips = (section: Locator): Locator => section.locator('a[href*="/iltifat/"]');

/** The chip of the Iltifat direction `name` at `ayah`. */
const chipOf = (page: Page, ayah: string, name: string): Locator =>
  iltifatChips(ayahSection(page, ayah)).filter({ hasText: name }).first();

// ---------------------------------------------------------------- where a chip stands

Then("Ayah {word} shows the Iltifat chips {string}", async ({ reader }, ayah: string, list: string) => {
  const lang = reader.language;
  const wanted = names(list);
  const cited = await citedAt(ayah);
  // The feature's words and the database agree on what is cited here.
  expect(cited.map((i) => directionOf(i).name).sort(), `the Iltifat the database cites at ${ayah}`).toEqual([...wanted].sort());
  const c = iltifatChips(ayahSection(reader.page, ayah));
  await expect(c.first(), `Ayah ${ayah} has Iltifat chips`).toBeVisible();
  await expect(c, `Ayah ${ayah}'s Iltifat chips`).toHaveCount(cited.length);
  for (const i of cited) {
    const chip = c.and(reader.page.locator(`a[href="${hrefOf(lang, i)}"]`));
    await expect(chip, `the chip of the ${directionOf(i).name} Iltifat at ${ayah}`).toHaveCount(1);
    await expect(chip).toContainText(`Iltifat · ${directionOf(i).name}`);
    await expect(chip).toBeVisible();
  }
});

Then("Ayah {word} shows no Iltifat chip", async ({ reader }, ayah: string) => {
  // The Ayah itself is drawn, so the absence is the page's, not a page still loading.
  await expect(ayahSection(reader.page, ayah), `Ayah ${ayah}`).toBeVisible();
  await expect(iltifatChips(ayahSection(reader.page, ayah)), `Ayah ${ayah}'s Iltifat chips`).toHaveCount(0);
});

Then(
  /^no other Ayah of the run of the (.+) Iltifat at (\S+) shows a chip for it$/,
  async ({ reader }, name: string, run: string) => {
    const i = await iltifatAt(directionNamed(name), run);
    const others = ayahsOfRun(i).filter((a) => a !== citedAyah(i));
    expect(others.length, `Ayahs of ${run} besides its cited Ayah`).toBeGreaterThan(0);
    for (const a of others) {
      await expect(ayahSection(reader.page, a), `Ayah ${a}`).toBeVisible();
      await expect(
        iltifatChips(ayahSection(reader.page, a)).and(reader.page.locator(`a[href$="#${fragmentOf(i)}"]`)),
        `a chip for the Iltifat at ${run} on Ayah ${a}`,
      ).toHaveCount(0);
    }
  },
);

Then("Ayah {word}'s Iltifat chips come after its last Word card and its Ayah translation", async ({ reader }, ayah: string) => {
  const section = ayahSection(reader.page, ayah);
  const first = iltifatChips(section).first();
  await expect(first, `Ayah ${ayah} has Iltifat chips`).toBeVisible();
  expect(await precedes(section.locator(`[id^="${ayah}:"]`).last(), first), "after the last Word card").toBe(true);
  const translation = section.getByText(ayahTranslation(ayah, reader.language), { exact: true });
  await expect(translation).toBeVisible();
  expect(await precedes(translation, first), "after the Ayah translation").toBe(true);
});

Then("Ayah {word}'s Iltifat chips come after its last Word card and before Ayah {word}", async ({ reader }, ayah: string, next: string) => {
  const section = ayahSection(reader.page, ayah);
  const chips = iltifatChips(section);
  await expect(chips.first(), `Ayah ${ayah} has Iltifat chips`).toBeVisible();
  expect(await precedes(section.locator(`[id^="${ayah}:"]`).last(), chips.first())).toBe(true);
  expect(await precedes(chips.last(), ayahSection(reader.page, next))).toBe(true);
});

Then("Ayah {word}'s Iltifat chips are in the same footer as its Theme chips", async ({ reader }, ayah: string) => {
  const section = ayahSection(reader.page, ayah);
  await expect(iltifatChips(section).first()).toBeVisible();
  await expect(themeChips(section).first()).toBeVisible();
  // The nearest element holding both kinds of chip is neither the Ayah's section
  // nor anything holding its Word cards or its translation: a footer of chips.
  const footer = await section.evaluate((sec) => {
    const a = sec.querySelector('a[href*="/iltifat/"]')!;
    const b = sec.querySelector('a[href*="/themes/"]')!;
    let node: Element | null = a;
    while (node && !node.contains(b)) node = node.parentElement;
    return {
      isSection: node === sec,
      holdsWords: !!node?.querySelector(`[id^="${sec.id}:"]`),
      holdsTranslation: !!node?.querySelector("p"),
    };
  });
  expect(footer.isSection, "the Iltifat chips share a footer with the Theme chips, not just the section").toBe(false);
  expect(footer.holdsWords, "the footer holds no Word card").toBe(false);
  expect(footer.holdsTranslation, "the footer holds no Ayah translation").toBe(false);
});

// ---------------------------------------------------------------- how a chip is drawn

/** A colour as [r, g, b, a], through a one-pixel canvas, so any CSS colour syntax reads alike. */
type Rgba = [number, number, number, number];

interface Paint {
  text: Rgba;
  fill: Rgba;
  border: Rgba;
  borderWidth: number;
  borderStyle: string;
  /** What is painted behind the chip's box: every ancestor's background, composited. */
  behind: Rgba;
}

/**
 * In the page: how each element is painted, its text colour, fill and outline,
 * and what is behind it. Self-contained: it is sent into the page as source.
 */
function paintsOf(els: Element[]): Paint[] {
  const ctx = document.createElement("canvas").getContext("2d", { willReadFrequently: true })!;
  ctx.canvas.width = ctx.canvas.height = 1;
  const read = (css: string): Rgba => {
    ctx.clearRect(0, 0, 1, 1);
    ctx.fillStyle = "#000";
    ctx.fillStyle = css;
    ctx.fillRect(0, 0, 1, 1);
    return Array.from(ctx.getImageData(0, 0, 1, 1).data) as Rgba;
  };
  return els.map((el) => {
    const style = getComputedStyle(el);
    const stack: Element[] = [];
    for (let n = el.parentElement; n; n = n.parentElement) stack.unshift(n);
    ctx.clearRect(0, 0, 1, 1);
    for (const n of stack) {
      ctx.fillStyle = getComputedStyle(n).backgroundColor;
      ctx.fillRect(0, 0, 1, 1);
    }
    const behind = Array.from(ctx.getImageData(0, 0, 1, 1).data) as Rgba;
    return {
      text: read(style.color),
      fill: read(style.backgroundColor),
      border: read(style.borderTopColor),
      borderWidth: parseFloat(style.borderTopWidth),
      borderStyle: style.borderTopStyle,
      behind,
    };
  });
}

const luminance = ([r, g, b]: Rgba | number[]) => {
  const [lr, lg, lb] = [r, g, b].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
};
const ratio = (a: number[], b: number[]) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};
/** `fg` over an opaque `bg`, as the browser composites it. */
const over = (fg: Rgba, bg: Rgba) => fg.slice(0, 3).map((c, k) => Math.round((c * fg[3]) / 255 + (bg[k] * (255 - fg[3])) / 255));

Then("Ayah {word}'s Iltifat chips are outlined and its Theme chips are filled", async ({ reader }, ayah: string) => {
  const section = ayahSection(reader.page, ayah);
  const [iltifat] = await iltifatChips(section).first().evaluateAll(paintsOf);
  const [theme] = await themeChips(section).first().evaluateAll(paintsOf);
  expect(iltifat.fill[3], "an Iltifat chip has no fill of its own").toBe(0);
  expect(iltifat.borderStyle, "an Iltifat chip's outline").not.toBe("none");
  expect(iltifat.borderWidth, "an Iltifat chip's outline width").toBeGreaterThanOrEqual(1);
  expect(iltifat.border[3], "an Iltifat chip's outline is drawn").toBeGreaterThan(0);
  expect(theme.fill[3], "a Theme chip is filled").toBeGreaterThan(0);
});

Then("Ayah {word}'s Iltifat chips read clearly against what is behind them, their text and their outline", async ({ reader }, ayah: string) => {
  const chips = iltifatChips(ayahSection(reader.page, ayah));
  await expect(chips.first(), `Ayah ${ayah} has Iltifat chips`).toBeVisible();
  const paints = await chips.evaluateAll(paintsOf);
  expect(paints.length, `Ayah ${ayah}'s Iltifat chips`).toBeGreaterThan(0);
  for (const p of paints) {
    // Its own fill over what is behind it is what its text sits on; its outline is read against what is behind it.
    const background = over(p.fill, p.behind);
    expect(ratio(over(p.text, background as Rgba), background), "a chip's text against its background").toBeGreaterThanOrEqual(4.5);
    expect(ratio(over(p.border, p.behind), p.behind), "a chip's outline against the paper").toBeGreaterThanOrEqual(3);
  }
});

Then("Ayah {word}'s Iltifat chips all lie within the screen's width", async ({ reader }, ayah: string) => {
  const c = iltifatChips(ayahSection(reader.page, ayah));
  await expect(c.first(), `Ayah ${ayah} has Iltifat chips`).toBeVisible();
  const boxes = await c.evaluateAll((els) => els.map((el) => el.getBoundingClientRect()).map((r) => ({ left: r.left, right: r.right })));
  const width = await reader.page.evaluate(() => document.documentElement.clientWidth);
  for (const b of boxes) {
    expect(b.left, "a chip's left edge").toBeGreaterThanOrEqual(0);
    expect(b.right, "a chip's right edge").toBeLessThanOrEqual(width);
  }
});

Then("I save a screenshot of Ayah {word}'s Iltifat chips {string}", async ({ reader }, ayah: string, name: string) => {
  await ayahSection(reader.page, ayah).scrollIntoViewIfNeeded();
  await nextFrames(reader.page);
  await shot(ayahSection(reader.page, ayah), name);
});

// ---------------------------------------------------------------- Disputed

const says = async (reader: { page: Page }, ayah: string, name: string, disputed: boolean) => {
  const chip = chipOf(reader.page, ayah, name);
  await expect(chip, `Ayah ${ayah}'s ${name} chip`).toBeVisible();
  const [i] = (await citedAt(ayah)).filter((x) => directionOf(x).name === name);
  expect(i.disputed, `the database's Disputed flag of the ${name} Iltifat at ${ayah}`).toBe(disputed);
  if (disputed) await expect(chip).toContainText("Disputed");
  else await expect(chip).not.toContainText(/disputed/i);
};

Then(/^Ayah (\S+)'s Iltifat chip "(.+)" (says|does not say) Disputed$/, async ({ reader }, ayah: string, name: string, verb: string) => {
  await says(reader, ayah, name, verb === "says");
});

Then(/^neither of Ayah (\S+)'s Iltifat chips says Disputed$/, async ({ reader }, ayah: string) => {
  const cited = await citedAt(ayah);
  expect(cited.length, `Iltifat cited at ${ayah}`).toBe(2);
  for (const i of cited) {
    expect(i.disputed, `the ${directionOf(i).name} Iltifat at ${ayah} is not Disputed`).toBe(false);
    await expect(iltifatChips(ayahSection(reader.page, ayah)).and(reader.page.locator(`a[href="${hrefOf(reader.language, i)}"]`))).not.toContainText(/disputed/i);
  }
});

// ---------------------------------------------------------------- links

Then("each of Ayah {word}'s Iltifat chips is a link to its Iltifat's entry on its direction page", async ({ reader }, ayah: string) => {
  const lang = reader.language;
  const cited = await citedAt(ayah);
  expect(cited.length, `Iltifat cited at ${ayah}`).toBeGreaterThan(0);
  const section = ayahSection(reader.page, ayah);
  await expect(iltifatChips(section), `Ayah ${ayah}'s Iltifat chips`).toHaveCount(cited.length);
  for (const i of cited) {
    const link = section.getByRole("link").and(reader.page.locator(`a[href="${hrefOf(lang, i)}"]`));
    await expect(link, `the chip of the ${directionOf(i).name} Iltifat is a link to ${hrefOf(lang, i)}`).toHaveCount(1);
  }
});

When("I follow Ayah {word}'s Iltifat chip {string}", async ({ reader }, ayah: string, name: string) => {
  const chip = chipOf(reader.page, ayah, name);
  await expect(chip, `Ayah ${ayah}'s ${name} chip`).toBeVisible();
  await chip.click();
});

Then(
  /^I am on the (.+) page "(.+)" at the fragment of the Iltifat cited at (\S+)$/,
  async ({ reader }, name: string, path: string, ayah: string) => {
    const i = await iltifatCitedAt(directionNamed(name), ayah);
    await expect.poll(() => new URL(reader.page.url()).pathname).toBe(path);
    expect(new URL(reader.page.url()).hash).toBe(`#${fragmentOf(i)}`);
    await expect(reader.page.getByRole("heading", { level: 1 })).toBeVisible();
  },
);

Then(/^the entry of the (.+) Iltifat cited at (\S+) is at the top of the screen$/, async ({ reader }, name: string, ayah: string) => {
  const i = await iltifatCitedAt(directionNamed(name), ayah);
  const mark = reader.page.locator(`[id="${fragmentOf(i)}"]`);
  await expect(mark, `the element ${fragmentOf(i)}`).toHaveCount(1);
  const entry = reader.page.locator("main article").filter({ has: mark }).or(reader.page.locator(`main article[id="${fragmentOf(i)}"]`));
  await expect(entry).toHaveCount(1);
  await expect
    .poll(() =>
      mark.evaluate((el) => {
        const box = el.getBoundingClientRect();
        return box.top >= -1 && box.top <= window.innerHeight / 3 + 1;
      }),
    )
    .toBe(true);
});

// ---------------------------------------------------------------- keyboard and screen reader

Then(/^Ayah (\S+)'s Iltifat chip "(.+)" is a link announced as "(.+)"$/, async ({ reader }, ayah: string, name: string, announced: string) => {
  const chip = chipOf(reader.page, ayah, name);
  await expect(chip, `Ayah ${ayah}'s ${name} chip`).toBeVisible();
  expect(announced, "the announcement says the direction as the direction badge does").toContain(said(name));
  const href = (await chip.getAttribute("href"))!;
  expect(href, "the chip's address").toMatch(/\/iltifat\/[a-z-]+#iltifat-\d+$/);
  // Its words in this order, whatever stands between them: "Iltifat, turns from He to You, disputed".
  const words = announced.split(", ").map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const link = ayahSection(reader.page, ayah).getByRole("link", { name: new RegExp(`^${words.join("\\W+")}$`, "i") });
  await expect(link, `a link announced as "${announced}"`).toHaveCount(1);
  await expect(link).toHaveAttribute("href", href);
});

Then(/^Ayah (\S+)'s Iltifat chip "(.+)" is English and runs left to right$/, async ({ reader }, ayah: string, name: string) => {
  const chip = chipOf(reader.page, ayah, name);
  await expect(chip).toBeVisible();
  const { lang, dir } = await chip.evaluate((el) => ({ lang: el.closest("[lang]")?.getAttribute("lang") ?? "", dir: getComputedStyle(el).direction }));
  expect(lang, "the language its text is marked as").toBe("en");
  expect(dir, "the direction its text runs").toBe("ltr");
});

When(/^I press Tab from "(.+)" until Ayah (\S+)'s Iltifat chip "(.+)" has the focus$/, async ({ reader }, from: string, ayah: string, name: string) => {
  const page = reader.page;
  await page.getByRole("button", { name: from, exact: true }).focus();
  const chip = chipOf(page, ayah, name);
  await expect(chip, `Ayah ${ayah}'s ${name} chip`).toHaveCount(1);
  for (let i = 0; i < 80; i++) {
    if (await chip.evaluate((el) => el === document.activeElement)) return;
    await page.keyboard.press("Tab");
  }
  throw new Error(`Tab never reached Ayah ${ayah}'s Iltifat chip "${name}"`);
});

Then(/^Ayah (\S+)'s Iltifat chip "(.+)" shows a focus ring$/, async ({ reader }, ayah: string, name: string) => {
  const chip = chipOf(reader.page, ayah, name);
  await expect(chip).toBeFocused();
  const ring = await chip.evaluate((el) => {
    const s = getComputedStyle(el);
    return { outline: parseFloat(s.outlineWidth) > 0 && s.outlineStyle !== "none", shadow: s.boxShadow !== "none" };
  });
  expect(ring.outline || ring.shadow, "an outline or a ring around the focused chip").toBe(true);
});

// ---------------------------------------------------------------- no chips elsewhere

/** The links into a direction page drawn in the reading area, visible. */
const drawnIltifatChips = (page: Page) =>
  page
    .locator('main a[href*="/iltifat/"]')
    .evaluateAll((links) => links.filter((a) => a.getClientRects().length > 0).map((a) => a.getAttribute("href")));

Then("no Iltifat chip of Surah {int} is shown", async ({ reader }, surah: number) => {
  // Study draws them, so their absence is Flowing's doing, not a Surah without Iltifat.
  await expect(reader.page.locator(`section[id^="${surah}:"] a[href*="/iltifat/"]`).first()).toBeAttached();
  await expect.poll(() => drawnIltifatChips(reader.page)).toEqual([]);
});

Then("the page has no link to an Iltifat page and no Iltifat chip", async ({ reader }) => {
  await expect(reader.page.locator("main").first()).toBeVisible();
  await expect(reader.page.locator('a[href*="/iltifat/"]'), "links to an Iltifat direction page").toHaveCount(0);
  await expect(reader.page.getByText(/^Iltifat ·/), "an Iltifat chip's text").toHaveCount(0);
});

// ---------------------------------------------------------------- every Ayah

const SURAHS = Array.from({ length: 114 }, (_, k) => k + 1);

/** The chip links of each Ayah in a Surah page's HTML, by `s:a`: its anchors into a direction page, with their text. */
function chipsInHtml(html: string): Map<string, { href: string; text: string }[]> {
  const found = new Map<string, { href: string; text: string }[]>();
  const sections = html.split(/<section\b[^>]*\bid="(\d+:\d+)"/).slice(1);
  for (let k = 0; k < sections.length; k += 2) {
    const body = sections[k + 1].split(/<section\b/)[0];
    const links = [...body.matchAll(/<a\b[^>]*\bhref="([^"]*\/iltifat\/[^"]*)"[^>]*>([\s\S]*?)<\/a>/g)].map((m) => ({
      href: m[1],
      text: m[2].replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim(),
    }));
    found.set(sections[k], links);
  }
  return found;
}

Then(
  /^every one of the 114 Surahs served in (Urdu|English) carries, at each Ayah, the chips of exactly the Iltifat the database cites there, each linking to its entry$/,
  async ({ request }, language: string) => {
    const lang: Language = language === "Urdu" ? "ur" : "en";
    const every = await everyIltifat();
    const expected = new Map<string, Iltifat[]>();
    for (const i of every) expected.set(citedAyah(i), [...(expected.get(citedAyah(i)) ?? []), i]);
    const problems: string[] = [];
    let chips = 0;
    for (const n of SURAHS) {
      const res = await request.get(`/${lang}/${n}`);
      expect(res.status(), `/${lang}/${n}`).toBe(200);
      for (const [ayah, links] of chipsInHtml(await res.text())) {
        chips += links.length;
        const want = expected.get(ayah) ?? [];
        const got = links.map((l) => l.href).sort();
        const hrefs = want.map((i) => hrefOf(lang, i)).sort();
        if (JSON.stringify(got) !== JSON.stringify(hrefs)) problems.push(`${ayah}: chips ${JSON.stringify(got)}, expected ${JSON.stringify(hrefs)}`);
        for (const i of want) {
          const link = links.find((l) => l.href === hrefOf(lang, i));
          if (link && !link.text.includes(directionOf(i).name)) problems.push(`${ayah}: chip text "${link.text}" lacks ${directionOf(i).name}`);
          if (link && link.text.includes("Disputed") !== i.disputed) problems.push(`${ayah}: chip text "${link.text}" and Disputed=${i.disputed}`);
        }
      }
    }
    expect(problems.slice(0, 20), `${problems.length} problems`).toEqual([]);
    expect(chips, "chips drawn in all 114 Surahs").toBe(every.length);
  },
);
