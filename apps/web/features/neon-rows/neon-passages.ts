// What the features of features/neon-rows/ share (#171): putting a Surah's
// Passage tables back as #171's load left them, and reading what an address
// answers over HTTP, as a browser, the app or a client does.

import type { Page } from "@playwright/test";
import type { PoolClient } from "pg";
import { baseURL, database } from "../api/support";
import { committedPassages } from "../site/committed-output.ts";

export type Lang = "ur" | "en";
export const LANGS: Lang[] = ["ur", "en"];
export const langOf = (language: string): Lang => {
  const lang = ({ Urdu: "ur", English: "en" } as const)[language as "Urdu" | "English"];
  if (!lang) throw new Error(`no Language ${language}`);
  return lang;
};

/** Run `work` in one transaction of the run's database. */
export async function inTransaction(work: (db: PoolClient) => Promise<void>) {
  const db = await database().connect();
  try {
    await db.query("begin");
    await work(db);
    await db.query("commit");
  } catch (error) {
    await db.query("rollback");
    throw error;
  } finally {
    db.release();
  }
}

/** Each Surah's stored content hash as first noted, null when none was stored. */
const notedHashes = new Map<number, string | null>();

/**
 * Surah `surah` put back by SQL as loaded, in one transaction, after `first`:
 * its Passages as the Passages file held them, no Phrase, its seed Passage
 * revision only, no Allah reference or Allah reference revision, and its
 * stored content hash as first noted.
 */
export async function putBackAsLoaded(surah: number, first?: (db: PoolClient) => Promise<void>) {
  await inTransaction(async (db) => {
    await first?.(db);
    await db.query(`delete from passage where surah = $1`, [surah]);
    for (const p of committedPassages().filter((p) => p.surah_no === surah)) {
      await db.query(`insert into passage (surah, ayah_from, ayah_till, title_en, title_ur) values ($1, $2, $3, $4, $5)`, [surah, p.ayah_from, p.ayah_till, p.title_en, p.title_ur]);
    }
    await db.query(`delete from phrase where surah = $1`, [surah]);
    await db.query(`delete from passage_revision where surah = $1 and author <> 'seed'`, [surah]);
    await db.query(`delete from "allahReference" where surah = $1`, [surah]);
    await db.query(`delete from "allahReferenceRevision" where surah = $1`, [surah]);
    if (!notedHashes.has(surah)) {
      const { rows } = await db.query<{ hash: string }>(`select hash from surah_content_hash where surah = $1`, [surah]);
      notedHashes.set(surah, rows[0]?.hash ?? null);
    }
    const noted = notedHashes.get(surah);
    if (noted === null) await db.query(`delete from surah_content_hash where surah = $1`, [surah]);
    else await db.query(`update surah_content_hash set hash = $2 where surah = $1`, [surah, noted]);
  });
}

/** Surah `surah`'s stored content hash as first noted, null when none was stored. */
export const notedHash = (surah: number) => notedHashes.get(surah) ?? null;

/** GET `address`, once more if a kept-alive connection was reset. */
export async function get(address: string): Promise<Response> {
  try {
    return await fetch(`${baseURL()}${address}`, { redirect: "manual" });
  } catch {
    return fetch(`${baseURL()}${address}`, { redirect: "manual" });
  }
}

/** The Ayahs of `surah` on the page, grouped as the page groups them: each run of Ayahs sharing one parent, as its first and last Ayah. */
export async function ayahGroups(page: Page, surah: number): Promise<{ from: number; till: number }[]> {
  return page.evaluate((surah) => {
    const groups: { from: number; till: number; parent: Element | null }[] = [];
    const ayah = new RegExp(`^${surah}:(\\d+)$`);
    for (const el of Array.from(document.querySelectorAll("[id]"))) {
      const m = ayah.exec(el.id);
      if (!m) continue;
      const n = Number(m[1]);
      const last = groups.at(-1);
      if (last && last.parent === el.parentElement) last.till = n;
      else groups.push({ from: n, till: n, parent: el.parentElement });
    }
    return groups.map(({ from, till }) => ({ from, till }));
  }, surah);
}

/** The HTML of the first <main> of `html`. */
const mainOf = (html: string) => {
  const start = html.indexOf("<main");
  const end = html.indexOf("</main>", start);
  return start < 0 || end < 0 ? "" : html.slice(start, end);
};

/** The Passage groups a Theme page's HTML shows, in order: each <h2>'s link, then the Ayah links up to the next <h2> (as ../site/steps/themes-in-neon.steps.ts reads them). */
export function shownGroups(html: string): { href: string; ayahs: string[] }[] {
  const groups: { href: string; ayahs: string[] }[] = [];
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

/** The content of the meta tag named or with property `key`. */
export function metaContent(html: string, key: string): string | undefined {
  for (const m of html.matchAll(/<meta\b[^>]*>/g)) {
    const tag = m[0];
    if (new RegExp(`(?:name|property)="${key}"`).test(tag)) return tag.match(/content="([^"]*)"/)?.[1]?.replace(/&amp;/g, "&");
  }
  return undefined;
}

/** One Ayah of a Surah part, as its file carries it. */
export interface PartAyah {
  number: number;
  passage?: { from: number; till: number; title: string };
  words: { location: string; phraseColour?: string }[];
}
