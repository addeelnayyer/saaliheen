// Link previews for the Iltifat pages (#144), as a link-preview app gets them:
// the page's HTML fetched with the app's user agent and no scripts run, its
// Open Graph and Twitter card tags read from <head>, and the picture they
// point to requested from this server. The fetching, the tags and the picture
// are the Share page's Link preview steps' (./link-preview.steps); these add
// what names an Iltifat page. Counts are the feature's (the issue's words),
// each checked against the run's own Postgres (./iltifat), Disputed Iltifat
// left out.

import { expect } from "@playwright/test";
import type { DataTable } from "playwright-bdd";
import { urduDigits, type Language } from "../support";
import { Then, When } from "./fixtures";
import { alt, fetchPage, lastPage, previewTags, tag, type App, type Fetched } from "./link-preview.steps";
import { directionNamed, everyIltifat, iltifatOf } from "./iltifat";

const OVERVIEW = "the overview";

/** The address of the Iltifat overview, or of a direction's page, in `lang`. */
function iltifatAddress(lang: Language, page: string) {
  return page === OVERVIEW ? `/${lang}/iltifat` : `/${lang}/iltifat/${directionNamed(page).slug}`;
}

When("{app} fetches the Iltifat direction page of {string} in {language}", async ({ reader, reading }, app: App, name: string, lang: Language) => {
  await fetchPage(reader.page.request, reading, app, iltifatAddress(lang, name));
});

When("{app} fetches the Iltifat overview in {language}", async ({ reader, reading }, app: App, lang: Language) => {
  await fetchPage(reader.page.request, reading, app, iltifatAddress(lang, OVERVIEW));
});

When("{app} fetches the Iltifat pages of:", async ({ reader, reading }, app: App, table: DataTable) => {
  for (const [row] of table.raw()) {
    const m = row.trim().match(/^(.+) in (Urdu|English)$/);
    if (!m) throw new Error(`"${row}" names no Iltifat page`);
    await fetchPage(reader.page.request, reading, app, iltifatAddress(m[2] === "Urdu" ? "ur" : "en", m[1]));
  }
});

// ---------------------------------------------------------------- the tags

const holds = (where: string, f: Fetched, keys: string[], text: string) => {
  for (const key of keys) expect(tag(f, key), `${key} of ${f.path} (${where})`).toContain(text);
};

Then("the Link preview's title, in both, holds {string}", async ({ reading }, text: string) => {
  holds("the title", lastPage(reading), ["og:title", "twitter:title"], text);
});

Then("the Link preview's description, in both, holds {string}", async ({ reading }, text: string) => {
  holds("the description", lastPage(reading), ["og:description", "twitter:description"], text);
});

Then("the Link preview picture's alt text holds {string}", async ({ reading }, text: string) => {
  const f = lastPage(reading);
  expect(alt(f), `the picture's alt text for ${f.path}`).toContain(text);
});

Then("the Link preview's page address is this page's address on {string}", async ({ reading }, site: string) => {
  const f = lastPage(reading);
  expect(tag(f, "og:url"), `og:url of ${f.path}`).toBe(`${site}${f.path}`);
});

Then("the Link preview's picture address, in both, is on {string}, under this page's address", async ({ reading }, site: string) => {
  const f = lastPage(reading);
  for (const key of ["og:image", "twitter:image"]) {
    const address = tag(f, key);
    expect(address.startsWith(`${site}/`), `${key} of ${f.path} (${address}) is on ${site}`).toBe(true);
    expect(new URL(address).pathname.startsWith(`${f.path}/`), `${key} of ${f.path} (${address}) is under ${f.path}`).toBe(true);
  }
});

// ---------------------------------------------------------------- the counts, Disputed Iltifat left out

Then(/^(\d+) is the number of (.+) Iltifat in the run's database that are not Disputed$/, async ({}, count: string, name: string) => {
  const counted = (await iltifatOf(directionNamed(name))).filter((i) => !i.disputed);
  expect(counted.length, `${name} Iltifat in the run's database that are not Disputed`).toBe(Number(count));
});

Then(/^(\d+) is the number of Iltifat in the run's database that are not Disputed$/, async ({}, count: string) => {
  const counted = (await everyIltifat()).filter((i) => !i.disputed);
  expect(counted.length, "Iltifat in the run's database that are not Disputed").toBe(Number(count));
});

/** Whether `text` gives `n` as a count: in Western digits (with or without a thousands comma) or Urdu digits, standing alone. */
const givesCount = (text: string, n: number) =>
  [String(n), n.toLocaleString("en-US"), urduDigits(n)].some((written) => new RegExp(`(?:^|[^\\d۰-۹,])${written}(?:$|[^\\d۰-۹,])`).test(text));

function givesNoCount(f: Fetched, all: number, counted: number, what: string) {
  expect(all, `${what} counting the Disputed ones differ from those not Disputed`).not.toBe(counted);
  const giving = [...previewTags(f)].filter(([, v]) => givesCount(v, all)).map(([key, v]) => `${key}=${v}`);
  expect(giving, `Link preview tags of ${f.path} giving ${all}, the number of ${what} counting the Disputed ones`).toEqual([]);
}

Then(/^no Link preview tag gives the number of (.+) Iltifat counting the Disputed ones$/, async ({ reading }, name: string) => {
  const list = await iltifatOf(directionNamed(name));
  givesNoCount(lastPage(reading), list.length, list.filter((i) => !i.disputed).length, `${name} Iltifat`);
});

Then(/^no Link preview tag gives the number of Iltifat counting the Disputed ones$/, async ({ reading }) => {
  const list = await everyIltifat();
  givesNoCount(lastPage(reading), list.length, list.filter((i) => !i.disputed).length, "Iltifat");
});

// ---------------------------------------------------------------- no Arabic, and the existing previews' design

const ARABIC_SCRIPT = /[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]/u;

Then("no Link preview tag holds an Arabic-script letter", async ({ reading }) => {
  const f = lastPage(reading);
  const arabic = [...previewTags(f)].filter(([, v]) => ARABIC_SCRIPT.test(v)).map(([key, v]) => `${key}=${v}`);
  expect(arabic, `Link preview tags of ${f.path} holding an Arabic-script letter`).toEqual([]);
});

Then("the Link preview names the site {string} and is an article, as a Theme page's and a Share page's do", async ({ reading }, site: string) => {
  const f = lastPage(reading);
  expect(tag(f, "og:site_name"), `og:site_name of ${f.path}`).toBe(site);
  expect(tag(f, "og:type"), `og:type of ${f.path}`).toBe("article");
});
