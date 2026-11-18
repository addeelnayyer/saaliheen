// The Juz of each Script (#193, ADR 0021), as the site scenarios expect them.
// Where each Juz starts and ends is worked out here, never typed whole: the
// Uthmani Juz are QUL's Madinah Juz file (data/qul/quran-metadata-juz.json);
// the Indo-Pak Juz start where the Madinah ones do but for the seven the
// issue and the reader's decisions name (DELIVERY/decisions-from-user.md),
// and each ends on the Ayah before the next Juz starts. A Juz's name is
// Arabic, so it is read from the Juz list the build serves
// (/data/v1/juz.json), never typed; the issue's own words (وَمَا لِيَ) are
// quoted by the scenarios themselves.

import fs from "node:fs";
import path from "node:path";
import type { APIRequestContext } from "@playwright/test";
import { sourceSurahs } from "../support";
import type { Script } from "./reader";

export interface ExpectedJuz {
  number: number;
  /** `s:a` */
  firstAyah: string;
  lastAyah: string;
}

/** A Juz as the build serves it (the agreed data contract). */
export interface ServedJuz extends ExpectedJuz {
  name: string;
}

/** The seven Juz whose Indo-Pak start differs from the Madinah one (#193), by Juz number. */
export const INDOPAK_STARTS: Record<number, string> = {
  4: "3:92",
  7: "5:83",
  11: "9:94",
  14: "15:2",
  20: "27:60",
  21: "29:45",
  23: "36:22",
};

type JuzSource = Record<string, { juz_number: number; first_verse_key: string; last_verse_key: string }>;
const juzSource = (): JuzSource =>
  JSON.parse(fs.readFileSync(path.join(__dirname, "..", "..", "..", "data", "qul", "quran-metadata-juz.json"), "utf8"));

const ayahBefore = (ayah: string): string => {
  const [s, a] = ayah.split(":").map(Number);
  if (a > 1) return `${s}:${a - 1}`;
  return `${s - 1}:${sourceSurahs()[s - 2].ayahCount}`;
};

const lists = new Map<Script, ExpectedJuz[]>();
/** The 30 Juz of a Script, in order. */
export function expectedJuz(script: Script): ExpectedJuz[] {
  const known = lists.get(script);
  if (known) return known;
  const madinah = Object.values(juzSource()).sort((a, b) => a.juz_number - b.juz_number);
  const starts = madinah.map((j) => (script === "indopak" && INDOPAK_STARTS[j.juz_number]) || j.first_verse_key);
  const list = madinah.map((j, i) => ({
    number: j.juz_number,
    firstAyah: starts[i],
    lastAyah: i + 1 < starts.length ? ayahBefore(starts[i + 1]) : j.last_verse_key,
  }));
  lists.set(script, list);
  return list;
}

export const juzOf = (script: Script, n: number): ExpectedJuz => expectedJuz(script)[n - 1];

const key = (ayah: string) => {
  const [s, a] = ayah.split(":").map(Number);
  return s * 1000 + a;
};

/** Whether Ayah `ayah` (`s:a`) is in Juz `juz`. */
export const holds = (juz: ExpectedJuz, ayah: string) => key(ayah) >= key(juz.firstAyah) && key(ayah) <= key(juz.lastAyah);

/** The number of the Juz of `script` holding Ayah `ayah`. */
export const juzHolding = (script: Script, ayah: string) => expectedJuz(script).find((j) => holds(j, ayah))!.number;

/** The Juz of `script` holding at least one Ayah of Surah `surah`, by number. */
export const juzWithSurah = (script: Script, surah: number) =>
  expectedJuz(script)
    .filter((j) => Number(j.firstAyah.split(":")[0]) <= surah && Number(j.lastAyah.split(":")[0]) >= surah)
    .map((j) => j.number);

/** Where a Juz runs, as its row says it: "Al-Baqarah 142 → 252", or "Ya-Sin 28 → Az-Zumar 31" across Surahs. */
export function runsText(juz: ExpectedJuz): string {
  const [fs_, fa] = juz.firstAyah.split(":").map(Number);
  const [ls, la] = juz.lastAyah.split(":").map(Number);
  const name = (s: number) => sourceSurahs()[s - 1].nameLatin;
  return fs_ === ls ? `${name(fs_)} ${fa} → ${la}` : `${name(fs_)} ${fa} → ${name(ls)} ${la}`;
}

/** The Juz list the build serves, by Script. */
export async function servedJuz(request: APIRequestContext): Promise<Record<Script, ServedJuz[]>> {
  const res = await request.get("/data/v1/juz.json");
  if (!res.ok()) throw new Error(`the Juz list /data/v1/juz.json answered ${res.status()}`);
  return res.json();
}
