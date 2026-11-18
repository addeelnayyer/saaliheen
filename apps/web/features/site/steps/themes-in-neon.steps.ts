// Steps for Themes read from Neon (#170): every page that shows Themes,
// fetched from the production build as a browser loading it directly, the
// app opening it in parts, or a link-preview app does, and compared with what
// the website served before the move (../committed-output.ts). Each step walks
// every Theme or every Surah, so it reads the served HTML and JSON over HTTP
// rather than drawing each page, a few requests at a time. Since Passages
// moved into Neon too (#171), a Theme's committed Ayahs are grouped by the
// Passages the run's database holds (neonPassages), as its page groups them.

import { expect, type APIRequestContext } from "@playwright/test";
import type { DataTable } from "playwright-bdd";
import { partUrl, surahPartsAddress, themeGroups, themeParts, themePartsAddress } from "@saaliheen/dataset/parts";
import { committedSurah, committedThemes, type CommittedGroup, type CommittedTheme } from "../committed-output";
import { neonPassages } from "../passages-in-the-test-database";
import { urduDigits, type Language } from "../support";
import { Then } from "./fixtures";
import { alt, fetchPage, lastPage, tag, type Fetched } from "./link-preview.steps";

/** Long enough for a step that requests every Theme or every Surah page. */
const SWEEP_TIMEOUT = 900_000;
/** How many requests a sweep keeps in flight at once. */
const AT_ONCE = 6;

/** Run `fn` over `items`, AT_ONCE at a time, in order of completion; failures are collected, not thrown one by one. */
async function sweep<T>(items: T[], fn: (item: T) => Promise<string[]>): Promise<string[]> {
  const wrong: string[] = [];
  for (let i = 0; i < items.length; i += AT_ONCE) {
    for (const found of await Promise.all(items.slice(i, i + AT_ONCE).map(fn))) wrong.push(...found);
  }
  return wrong;
}

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', "#39": "'", "#x27": "'", nbsp: " " };
/** `html`'s text: its tags and React's markers dropped, its entities decoded, its white space collapsed. */
const textOf = (html: string) =>
  html
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&(#?\w+);/g, (m, e: string) => ENTITIES[e] ?? m)
    .replace(/\s+/g, " ")
    .trim();

/** The HTML of the first <main> of `html`. */
const mainOf = (html: string) => {
  const start = html.indexOf("<main");
  const end = html.indexOf("</main>", start);
  return start < 0 || end < 0 ? "" : html.slice(start, end);
};

/** Whether `text` gives `n` as a count: in Western digits (with or without a thousands comma) or Urdu digits, standing alone. */
const givesCount = (text: string, n: number) =>
  [String(n), n.toLocaleString("en-US"), urduDigits(n)].some((w) => new RegExp(`(?:^|[^\\d۰-۹,])${w}(?:$|[^\\d۰-۹,])`).test(text));

const themeAddress = (lang: Language, slug: string) => `/${lang}/themes/${slug}`;
const openingAddress = (lang: Language, slug: string) => `/${lang}/opening/themes/${slug}`;
const categoryName = (t: CommittedTheme, lang: Language) => committedThemes().categories.find((c) => c.slug === t.category)![lang];

async function getText(request: APIRequestContext, address: string) {
  const res = await request.get(address, { maxRedirects: 0 });
  return { status: res.status(), text: res.status() === 200 ? await res.text() : "" };
}

// ---------------------------------------------------------------- a Theme page's Passage groups, read from its HTML

/** A Passage group as a Theme page shows it: its heading's link and the links of the Ayahs under it. */
interface ShownGroup {
  href: string;
  ayahs: string[];
}

/** The Passage groups a Theme page's HTML shows, in order: each <h2>'s link, then the Ayah links up to the next <h2>. */
function shownGroups(html: string): ShownGroup[] {
  const groups: ShownGroup[] = [];
  const ayahLink = /^\/(ur|en)\/\d+#\d+:\d+$/;
  let inHeading = false;
  for (const m of mainOf(html).matchAll(/<h2\b|<\/h2>|<a\b[^>]*?\shref="([^"]*)"/g)) {
    if (m[0] === "<h2") {
      inHeading = true;
      groups.push({ href: "", ayahs: [] });
    } else if (m[0] === "</h2>") inHeading = false;
    else if (inHeading && groups.length && !groups.at(-1)!.href) groups.at(-1)!.href = m[1];
    else if (!inHeading && groups.length && ayahLink.test(m[1])) groups.at(-1)!.ayahs.push(m[1]);
  }
  return groups;
}

/** How a Theme page links `g`: its heading to the Passage's first Ayah, each Ayah to itself. */
const expectedGroup = (lang: Language, g: CommittedGroup): ShownGroup => ({
  href: `/${lang}/${g.surah}#${g.surah}:${g.from}`,
  ayahs: g.ayahs.map((a) => `/${lang}/${g.surah}#${g.surah}:${a}`),
});

/** Theme `t`'s committed Ayahs in Passage groups by the Passages the run's database holds (#171). */
function groupsOf(t: CommittedTheme): CommittedGroup[] {
  const passages = neonPassages().map((p) => ({ surah: p.surah_no, from: p.ayah_from, till: p.ayah_till }));
  const ayahs = t.groups.flatMap((g) => g.ayahs.map((ayah) => ({ surah: g.surah, ayah })));
  return themeGroups(ayahs, (surah) => passages.filter((p) => p.surah === surah));
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/** Every committed Theme's page in `lang`, loaded directly, once per scenario. */
const pagesSeen = new Map<string, Map<string, string>>();

async function everyThemePage(request: APIRequestContext, lang: Language, address = themeAddress) {
  const key = `${address === themeAddress ? "page" : "opening"}:${lang}`;
  if (pagesSeen.has(key)) return pagesSeen.get(key)!;
  const themes = committedThemes().themes;
  expect(themes, "the committed Themes").toHaveLength(258);
  const pages = new Map<string, string>();
  const wrong = await sweep(themes, async (t) => {
    const { status, text } = await getText(request, address(lang, t.slug));
    pages.set(t.slug, text);
    return status === 200 ? [] : [`${address(lang, t.slug)} answered ${status}`];
  });
  expect(wrong, `Theme pages in ${lang} that did not answer`).toEqual([]);
  pagesSeen.set(key, pages);
  return pages;
}

Then(
  "every committed Theme's page in {language}, loaded directly, is headed with its name in {language}",
  // The Language is named twice; both times the same one.
  async ({ request, $testInfo }, lang: Language, headedIn: Language) => {
    expect(headedIn, "the Language the heading is in").toBe(lang);
    $testInfo.setTimeout(SWEEP_TIMEOUT);
    pagesSeen.clear();
    const pages = await everyThemePage(request, lang);
    const wrong = committedThemes().themes.flatMap((t) => {
      const h1 = pages.get(t.slug)!.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/);
      const heading = h1 ? textOf(h1[1]) : "(no heading)";
      return heading === t[lang] ? [] : [`${themeAddress(lang, t.slug)} is headed "${heading}", not "${t[lang]}"`];
    });
    expect(wrong).toEqual([]);
  },
);

Then(
  "shows its committed Theme category in {language} and its committed count of Ayahs before its first Passage group",
  async ({ request }, lang: Language) => {
    const pages = await everyThemePage(request, lang);
    const wrong = committedThemes().themes.flatMap((t) => {
      const main = mainOf(pages.get(t.slug)!);
      const header = textOf(main.slice(0, Math.max(0, main.indexOf("<h2"))));
      const found: string[] = [];
      if (!header.includes(categoryName(t, lang))) found.push(`${themeAddress(lang, t.slug)} does not show "${categoryName(t, lang)}" before its first Passage group`);
      if (!givesCount(header, t.ayahCount)) found.push(`${themeAddress(lang, t.slug)} does not give ${t.ayahCount} Ayahs before its first Passage group ("${header}")`);
      return found;
    });
    expect(wrong).toEqual([]);
  },
);

Then(
  "lists exactly its committed Passage groups, in order, each with a link to its Passage and its committed Ayahs under it",
  async () => {
    const wrong: string[] = [];
    for (const [key, pages] of pagesSeen) {
      if (!key.startsWith("page:")) continue;
      const lang = key.slice(5) as Language;
      for (const t of committedThemes().themes) {
        const shown = shownGroups(pages.get(t.slug)!);
        const expected = groupsOf(t).map((g) => expectedGroup(lang, g));
        if (!same(shown, expected)) wrong.push(`${themeAddress(lang, t.slug)} shows ${JSON.stringify(shown).slice(0, 300)}, not ${JSON.stringify(expected).slice(0, 300)}`);
      }
    }
    expect(pagesSeen.size, "Theme pages fetched in this scenario").toBeGreaterThan(0);
    expect(wrong).toEqual([]);
  },
);

// ---------------------------------------------------------------- opened in parts

Then(
  "every committed Theme's page in {language}, opened inside the app, shows the Passage groups of its first Theme part",
  async ({ request, $testInfo }, lang: Language) => {
    $testInfo.setTimeout(SWEEP_TIMEOUT);
    pagesSeen.clear();
    const openings = await everyThemePage(request, lang, openingAddress);
    const wrong = committedThemes().themes.flatMap((t) => {
      const first = themeParts(groupsOf(t))[0].map((g) => expectedGroup(lang, g));
      const shown = shownGroups(openings.get(t.slug)!);
      return same(shown, first) ? [] : [`${openingAddress(lang, t.slug)} shows ${JSON.stringify(shown).slice(0, 300)}, not its first part ${JSON.stringify(first).slice(0, 300)}`];
    });
    expect(wrong).toEqual([]);
  },
);

/** A Theme part's Passage group as its JSON holds it (PartThemeGroup), reduced to its range and Ayah numbers. */
interface PartGroup {
  surah: number;
  passage: { from: number; till: number };
  ayahs: { number: number }[];
}
const plainGroup = (g: PartGroup): CommittedGroup => ({ surah: g.surah, from: g.passage.from, till: g.passage.till, ayahs: g.ayahs.map((a) => a.number) });

Then(
  "its Theme parts in {language}, from the second on, hold the rest of its committed Passage groups, split into parts as before",
  async ({ request, $testInfo }, lang: Language) => {
    $testInfo.setTimeout(SWEEP_TIMEOUT);
    const wanted = committedThemes().themes.flatMap((t) =>
      themeParts(groupsOf(t))
        .slice(1)
        .map((groups, i) => ({ t, part: i + 2, groups })),
    );
    expect(wanted.length, "Theme parts after the first, as the committed Passage groups split").toBeGreaterThan(0);
    const wrong = await sweep(wanted, async ({ t, part, groups }) => {
      const address = partUrl(themePartsAddress(lang, t.slug), part);
      const res = await request.get(address);
      if (res.status() !== 200) return [`${address} answered ${res.status()}`];
      if (!(res.headers()["content-type"] ?? "").includes("application/json")) return [`${address} is not JSON`];
      const held = ((await res.json()) as PartGroup[]).map(plainGroup);
      const expected = groups.map(({ surah, from, till, ayahs }) => ({ surah, from, till, ayahs }));
      return same(held, expected) ? [] : [`${address} holds ${JSON.stringify(held).slice(0, 300)}, not ${JSON.stringify(expected).slice(0, 300)}`];
    });
    expect(wrong).toEqual([]);
  },
);

Then("no committed Theme has a Theme part in {language} past its last", async ({ request, $testInfo }, lang: Language) => {
  $testInfo.setTimeout(SWEEP_TIMEOUT);
  const wrong = await sweep(committedThemes().themes, async (t) => {
    const address = partUrl(themePartsAddress(lang, t.slug), themeParts(groupsOf(t)).length + 1);
    const status = (await request.get(address)).status();
    return status === 404 ? [] : [`${address} answered ${status}, not 404`];
  });
  expect(wrong).toEqual([]);
});

// ---------------------------------------------------------------- Theme chips on every Surah

/** A chip as a page's HTML has it: its Theme's slug and the name it shows. */
interface Chip {
  slug: string;
  name: string;
}

/** Each Ayah's Theme chips in a Surah page's HTML, by `s:a`: the Theme links between its <section> and the next Ayah's. */
function chipsByAyah(html: string, lang: Language): Map<string, Chip[]> {
  const starts = [...html.matchAll(/<section\b[^>]*?\sid="(\d+:\d+)"/g)];
  const chips = new Map<string, Chip[]>();
  starts.forEach((m, i) => {
    const chunk = html.slice(m.index, starts[i + 1]?.index ?? html.length);
    const links = [...chunk.matchAll(new RegExp(`<a\\b[^>]*?\\shref="/${lang}/themes/([^"#?]+)"[^>]*>(.*?)</a>`, "gs"))];
    chips.set(m[1], links.map((l) => ({ slug: l[1], name: textOf(l[2]) })));
  });
  return chips;
}

/** Ayah `ayah`'s chips as its committed Surah file names them, each named in `lang`. */
const committedChips = (surah: number, ayah: number, lang: Language): Chip[] => {
  const byslug = new Map(committedThemes().themes.map((t) => [t.slug, t]));
  return committedSurah(surah).ayahs[ayah - 1].themes.map((slug) => ({ slug, name: byslug.get(slug)?.[lang] ?? `(no Theme ${slug})` }));
};

const SURAHS = Array.from({ length: 114 }, (_, i) => i + 1);

Then(
  "every Ayah of each of the {int} Surahs, loaded directly in {language}, shows the Theme chips its committed Surah file names, in tagged order, each named in {language} and linking to its Theme page in {language}",
  // The Language is named three times; all name the same one.
  async ({ request, $testInfo }, count: number, lang: Language, namedIn: Language, linkedIn: Language) => {
    expect([namedIn, linkedIn], "the Language the chips are named and link in").toEqual([lang, lang]);
    $testInfo.setTimeout(SWEEP_TIMEOUT);
    expect(SURAHS).toHaveLength(count);
    const wrong = await sweep(SURAHS, async (surah) => {
      const { status, text } = await getText(request, `/${lang}/${surah}`);
      if (status !== 200) return [`/${lang}/${surah} answered ${status}`];
      const shown = chipsByAyah(text, lang);
      return committedSurah(surah).ayahs.flatMap(({ number }) => {
        const ayah = `${surah}:${number}`;
        const expected = committedChips(surah, number, lang);
        return same(shown.get(ayah) ?? null, expected) ? [] : [`/${lang}/${surah} Ayah ${ayah} shows ${JSON.stringify(shown.get(ayah) ?? null)}, not ${JSON.stringify(expected)}`];
      });
    });
    expect(wrong).toEqual([]);
  },
);

Then(
  "every Ayah each Surah's opening page in {language} carries shows those same Theme chips",
  async ({ request, $testInfo }, lang: Language) => {
    $testInfo.setTimeout(SWEEP_TIMEOUT);
    const wrong = await sweep(SURAHS, async (surah) => {
      const { status, text } = await getText(request, `/${lang}/opening/${surah}`);
      if (status !== 200) return [`/${lang}/opening/${surah} answered ${status}`];
      return [...chipsByAyah(text, lang)].flatMap(([ayah, shown]) => {
        const expected = committedChips(surah, Number(ayah.split(":")[1]), lang);
        return same(shown, expected) ? [] : [`/${lang}/opening/${surah} Ayah ${ayah} shows ${JSON.stringify(shown)}, not ${JSON.stringify(expected)}`];
      });
    });
    expect(wrong).toEqual([]);
  },
);

Then(
  "every Surah part in {language} gives each of its Ayahs the Themes its committed Surah file names, in tagged order",
  async ({ request, $testInfo }, lang: Language) => {
    $testInfo.setTimeout(SWEEP_TIMEOUT);
    const wrong = await sweep(SURAHS, async (surah) => {
      const found: string[] = [];
      const seen: number[] = [];
      for (let part = 1; ; part++) {
        const address = partUrl(surahPartsAddress(lang, surah), part);
        const res = await request.get(address);
        if (res.status() === 404 && part > 1) break;
        if (res.status() !== 200) return [`${address} answered ${res.status()}`];
        for (const a of (await res.json()) as { number: number; themes?: string[] }[]) {
          seen.push(a.number);
          const expected = committedSurah(surah).ayahs[a.number - 1]?.themes;
          if (!same(a.themes ?? null, expected)) found.push(`${address} gives Ayah ${surah}:${a.number} the Themes ${JSON.stringify(a.themes ?? null)}, not ${JSON.stringify(expected)}`);
        }
      }
      const all = committedSurah(surah).ayahs.map((a) => a.number);
      if (!same(seen, all)) found.push(`Surah ${surah}'s parts in ${lang} hold Ayahs ${seen.join(",")}, not ${all.join(",")}`);
      return found;
    });
    expect(wrong).toEqual([]);
  },
);

// ---------------------------------------------------------------- every Theme page's Link preview

/** Each committed Theme's page this scenario fetched as a link-preview app, with its Theme, by Language. */
const previews = new Map<Language, { t: CommittedTheme; f: Fetched }[]>();

Then(
  "every committed Theme's page in {language}, fetched by WhatsApp, has a Link preview title naming the Theme in {language} and a description giving its committed count of Ayahs",
  // The Language is named twice; both times the same one.
  async ({ request, reading, $testInfo }, lang: Language, titledIn: Language) => {
    expect(titledIn, "the Language the title is in").toBe(lang);
    $testInfo.setTimeout(SWEEP_TIMEOUT);
    previews.clear();
    const fetched: { t: CommittedTheme; f: Fetched }[] = [];
    const wrong: string[] = [];
    for (const t of committedThemes().themes) {
      await fetchPage(request, reading, "WhatsApp", themeAddress(lang, t.slug));
      const f = lastPage(reading);
      fetched.push({ t, f });
      for (const key of ["og:title", "twitter:title"]) if (!tag(f, key).includes(t[lang])) wrong.push(`${key} of ${f.path} ("${tag(f, key)}") does not name "${t[lang]}"`);
      for (const key of ["og:description", "twitter:description"]) {
        if (!givesCount(tag(f, key), t.ayahCount)) wrong.push(`${key} of ${f.path} ("${tag(f, key)}") does not give ${t.ayahCount} Ayahs`);
      }
    }
    previews.set(lang, fetched);
    expect(fetched, "Theme pages fetched").toHaveLength(258);
    expect(wrong).toEqual([]);
  },
);

/** Any letter of the Arabic script, Urdu's included. */
const ARABIC_SCRIPT = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;

Then(
  "each of those Link previews has a picture whose alt text gives the Theme's committed English name and count, and holds no Arabic-script letter",
  async () => {
    const fetched = [...previews.values()].flat();
    expect(fetched.length, "Theme pages fetched").toBeGreaterThan(0);
    const wrong = fetched.flatMap(({ t, f }) => {
      const a = alt(f);
      const found: string[] = [];
      if (!a.includes(t.en) || !givesCount(a, t.ayahCount)) found.push(`the picture's alt text of ${f.path} ("${a}") does not give "${t.en}" and ${t.ayahCount}`);
      if (ARABIC_SCRIPT.test(a)) found.push(`the picture's alt text of ${f.path} holds an Arabic-script letter`);
      return found;
    });
    expect(wrong).toEqual([]);
  },
);

/** A PNG's width and height from its IHDR chunk, or undefined when it is not a PNG. */
const pngSize = (b: Buffer) =>
  b.length > 24 && b.subarray(1, 4).toString("latin1") === "PNG" ? { width: b.readUInt32BE(16), height: b.readUInt32BE(20) } : undefined;

Then("each of those Link preview pictures answers with a PNG picture 1200×630", async ({ request, $testInfo }) => {
  $testInfo.setTimeout(SWEEP_TIMEOUT);
  const all = [...new Set([...previews.values()].flat().flatMap(({ f }) => [tag(f, "og:image"), tag(f, "twitter:image")]))];
  expect(all.length, "Link preview picture addresses").toBeGreaterThan(0);
  const wrong = await sweep(all, async (address) => {
    const u = new URL(address);
    const res = await request.get(`${u.pathname}${u.search}`);
    if (res.status() !== 200) return [`${u.pathname}${u.search} answered ${res.status()}`];
    const size = pngSize(await res.body());
    return size?.width === 1200 && size.height === 630 ? [] : [`${u.pathname}${u.search} is ${JSON.stringify(size ?? "not a PNG")}`];
  });
  expect(wrong).toEqual([]);
});

// ---------------------------------------------------------------- rendered once, then served from the cache

Then(
  "each of these addresses, asked for twice, answers 200 the second time from Next's cache with the same page, setting no cookie:",
  async ({ request }, table: DataTable) => {
    const addresses = table.raw().flat();
    expect(addresses.length).toBeGreaterThan(0);
    const wrong: string[] = [];
    for (const address of addresses) {
      const first = await request.get(address, { maxRedirects: 0 });
      const second = await request.get(address, { maxRedirects: 0 });
      const headers = second.headers();
      if (first.status() !== 200 || second.status() !== 200) wrong.push(`${address} answered ${first.status()}, then ${second.status()}`);
      else if (headers["x-nextjs-cache"] !== "HIT") wrong.push(`${address} was not served from the cache the second time (x-nextjs-cache: ${headers["x-nextjs-cache"]})`);
      else if ((await first.text()) !== (await second.text())) wrong.push(`${address} answered a different page the second time`);
      if (first.headers()["set-cookie"] || headers["set-cookie"]) wrong.push(`${address} set a cookie`);
    }
    expect(wrong).toEqual([]);
  },
);
