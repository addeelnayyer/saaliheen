// Link preview for each Theme page (#132), as a link-preview app gets it: the
// page's HTML fetched with the app's user agent and no scripts run, its Open
// Graph and Twitter card tags read from <head>, and the picture they point to
// requested from this server. The fetching, the tags and the picture are the
// Share page's Link preview steps' (./link-preview.steps); these add what
// names a Theme. Urdu names, Ayahs and counts are read from the Themes file.

import { expect, type APIRequestContext } from "@playwright/test";
import type { DataTable } from "playwright-bdd";
import { urduDigits, type Language } from "../support";
import { Then, When, type Reading } from "./fixtures";
import { alt, fetchPage, lastPage, previewTags, tag, type App, type Fetched } from "./link-preview.steps";
import { ayahText, type Script } from "./reader";
import { ayahsOf, nameIn, themeNamed } from "./themes";

const themeAddress = (lang: Language, slug: string) => `/${lang}/themes/${slug}`;

/** Each Theme page the scenario fetched, by its address: the Theme's English name and the page's Language. */
const themeOfPage = new Map<string, { en: string; lang: Language }>();

function theme(f: Fetched) {
  const t = themeOfPage.get(f.path);
  if (!t) throw new Error(`${f.path} is not a Theme page`);
  const named = themeNamed(t.en);
  return { ...t, ...named, count: ayahsOf(named.slug).length };
}

async function fetchTheme(request: APIRequestContext, reading: Reading, app: App, en: string, lang: Language) {
  const p = themeAddress(lang, themeNamed(en).slug);
  themeOfPage.set(p, { en, lang });
  await fetchPage(request, reading, app, p);
}

When("{app} fetches the Theme page of {string} in {language}", async ({ reader, reading }, app: App, en: string, lang: Language) => {
  await fetchTheme(reader.page.request, reading, app, en, lang);
});

When("{app} fetches the Theme pages of:", async ({ reader, reading }, app: App, table: DataTable) => {
  for (const [row] of table.raw()) {
    const m = row.trim().match(/^(.+) in (Urdu|English)$/);
    if (!m) throw new Error(`"${row}" names no Theme page`);
    await fetchTheme(reader.page.request, reading, app, m[1], m[2] === "Urdu" ? "ur" : "en");
  }
});

When("{app} fetches the Themes list in {language}", async ({ reader, reading }, app: App, lang: Language) => {
  await fetchPage(reader.page.request, reading, app, `/${lang}/themes`);
});

// ---------------------------------------------------------------- the tags

/** Whether `text` gives `n` as a count: in Western digits (with or without a thousands comma) or Urdu digits, standing alone. */
const givesCount = (text: string, n: number) =>
  [String(n), n.toLocaleString("en-US"), urduDigits(n)].some((written) => new RegExp(`(?:^|[^\\d۰-۹,])${written}(?:$|[^\\d۰-۹,])`).test(text));

Then("the Link preview's title, in both, names the Theme in {language}", async ({ reading }, lang: Language) => {
  const f = lastPage(reading);
  const t = theme(f);
  for (const key of ["og:title", "twitter:title"]) expect(tag(f, key), `${key} of ${f.path}`).toContain(nameIn(t.en, lang));
});

Then("the Link preview's description, in both, gives the Theme's number of Ayahs", async ({ reading }) => {
  const f = lastPage(reading);
  const { count } = theme(f);
  for (const key of ["og:description", "twitter:description"]) {
    const description = tag(f, key);
    expect(givesCount(description, count), `${key} of ${f.path} ("${description}") gives ${count} Ayahs`).toBe(true);
  }
});

Then("the Link preview's page address is this Theme page's address on {string}", async ({ reading }, site: string) => {
  const f = lastPage(reading);
  theme(f);
  expect(tag(f, "og:url"), `og:url of ${f.path}`).toBe(`${site}${f.path}`);
});

Then("the Link preview's picture address, in both, is on {string} and names this Theme", async ({ reading }, site: string) => {
  const f = lastPage(reading);
  const { slug } = theme(f);
  for (const key of ["og:image", "twitter:image"]) {
    const address = tag(f, key);
    expect(address.startsWith(`${site}/`), `${key} of ${f.path} (${address}) is on ${site}`).toBe(true);
    expect(new URL(address).pathname.split("/"), `${key} of ${f.path} (${address}) names the Theme "${slug}"`).toContain(slug);
  }
});

Then("the Link preview picture's alt text names the Theme's English name and its number of Ayahs", async ({ reading }) => {
  const f = lastPage(reading);
  const { en, count } = theme(f);
  const text = alt(f);
  expect(text, `the picture's alt text for ${f.path}`).toContain(en);
  expect(givesCount(text, count), `the picture's alt text for ${f.path} ("${text}") gives ${count} Ayahs`).toBe(true);
});

// ---------------------------------------------------------------- no Arabic

/** The page's Open Graph and Twitter card tags, sorted, as `key=content`. */
const previewTagsOf = (f: Fetched) => previewTags(f).map(([key, v]) => `${key}=${v}`).sort();

/** A harakah, or another mark only Quranic text carries: a Word holding one is Quranic Arabic, not an Urdu name. */
const QURANIC_MARK = /[ً-ٰٟۖ-ۭ]/u;

/** Each Quranic Word of the Ayahs, in both Scripts, with the first Ayah and Script it was read from. */
function quranicWordsOf(ayahs: string[]) {
  const words = new Map<string, string>();
  for (const ayah of ayahs)
    for (const script of ["uthmani", "indopak"] satisfies Script[])
      for (const word of ayahText(ayah, script).split(" "))
        if (QURANIC_MARK.test(word) && !words.has(word)) words.set(word, `${ayah} in ${script}`);
  return words;
}

Then("no Link preview tag holds a Word of the Theme's Ayahs in either Script", async ({ reading }) => {
  const f = lastPage(reading);
  const { slug } = theme(f);
  const words = quranicWordsOf(ayahsOf(slug));
  const held = previewTagsOf(f).flatMap((t) => [...words].filter(([word]) => t.includes(word)).map(([word, from]) => `${t} holds ${word} (${from})`));
  expect(held, `Link preview tags of ${f.path} holding a Word of the Theme's Ayahs`).toEqual([]);
});

// ---------------------------------------------------------------- the Themes list: the site's default preview

Then("the page's head carries no Link preview picture", async ({ reading }) => {
  const f = lastPage(reading);
  const pictures = previewTagsOf(f).filter((t) => /^(og:image|twitter:image)/.test(t));
  expect(pictures, `Link preview picture tags of ${f.path}`).toEqual([]);
});

Then("its Link preview tags are those of the Surah index in {language}", async ({ reader, reading }, lang: Language) => {
  const list = lastPage(reading);
  const index = await fetchPage(reader.page.request, reading, "WhatsApp", `/${lang}`);
  expect(previewTagsOf(list), `the Link preview tags of ${list.path}, beside those of ${index.path}`).toEqual(previewTagsOf(index));
});
