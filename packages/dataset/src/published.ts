// The dataset as any client reads it (#65, ADR 0008): versioned static files
// under /data/v1. Version 1 is the Surah index, one file per Surah (its Words
// in both Scripts, its Word meanings, Ayah translations and Passages in both
// Languages) and one file per Root and one Recitation file per Surah (#115),
// each Script's Juz list (#193) and one file per particle (#249), each exactly as the dataset builder gives it,
// plus a manifest. The website serves every one of them from Neon (#172,
// #173). Inside v1 the shapes only ever gain fields; a change that removes or
// renames one is v2, served beside v1 while installed apps still read it.
//
// The manifest lists every Surah file with the SHA-256 of its bytes, so an
// installed app can tell which of its offline Surahs have changed (an Admin's
// Passage edit changes its own Surah's file and no other), the dataset's
// version, which changes whenever any published file does, and the minimum
// app version still supported. It lists every Recitation file the same way.

import { createHash } from "node:crypto";
import type { Dataset, Surah, SurahSummary } from "./types.ts";

/** Where version 1 of the published dataset is served. */
export const DATA_V1 = "/data/v1";

/** The oldest app version that can still read this dataset; raised when an app can no longer be served. */
export const MIN_APP_VERSION = "1.0.0";

/** A Surah's, Root's or particle's file name, `18.json` for 18: the last segment of its address. */
export const numberedFileName = (number: number) => `${number}.json`;

/** The number a file name names (`18.json` is 18), or NaN for any other name. */
export const numberFromFileName = (name: string) => (/^\d+\.json$/.test(name) ? Number(name.slice(0, -5)) : NaN);

/** `/data/v1/surahs/<n>.json`, `n` from 1 to 114. */
export const publishedSurahUrl = (number: number) => `${DATA_V1}/surahs/${numberedFileName(number)}`;

/** `/data/v1/recitations/<n>.json`, Surah `n`'s Recitation (#115). */
export const publishedRecitationUrl = (number: number) => `${DATA_V1}/recitations/${numberedFileName(number)}`;

/** The bytes a published file serves for `value`: its JSON, so a hash of them is the hash of what a client downloads. */
export const publishedFile = (value: unknown) => JSON.stringify(value);

/** The SHA-256 of `body`, in hex. */
export const contentHash = (body: string) => createHash("sha256").update(body).digest("hex");

/** One Surah's file in the manifest: its Surah file or its Recitation file. */
export interface ManifestFile {
  number: number;
  /** Where the file is served, e.g. `/data/v1/surahs/18.json`. */
  url: string;
  /** The SHA-256 of the file's bytes, in hex. */
  hash: string;
}

export interface Manifest {
  /** A hash over every published file: it changes whenever any of them does. */
  datasetVersion: string;
  /** The oldest app version this dataset still supports (MIN_APP_VERSION). */
  minAppVersion: string;
  /** Every Surah file, Surah 1 first. */
  surahs: ManifestFile[];
  /** Every Recitation file, Surah 1 first (#115). */
  recitations: ManifestFile[];
}

const summaryOf = ({ ayahs, passages, phrases, sectionMarks, ...summary }: Surah): SurahSummary => (
  void [ayahs, passages, phrases, sectionMarks], summary
);

/** The Surah index: each Surah without its Passages, Phrases, Section marks and Ayahs, as /data/v1/surahs.json serves it. */
export const surahIndex = ({ surahs }: Pick<Dataset, "surahs">): SurahSummary[] => surahs.map(summaryOf);

/** What /data/v1 publishes: every Surah, Root and Recitation, each Script's Juz list (#193) and every particle (#249). */
export type PublishedDataset = Pick<Dataset, "surahs" | "roots" | "recitations" | "juz" | "particles">;

/** The hash of each file /data/v1 publishes, which its manifest is made of. */
export interface PublishedHashes {
  /** The Surah index's. */
  index: string;
  /** Each Surah file's, Surah 1 first. */
  surahs: { number: number; hash: string }[];
  /** Each Root file's, by id. */
  roots: string[];
  /** Each Recitation file's, Surah 1 first. */
  recitations: { number: number; hash: string }[];
  /** The Juz file's. */
  juz: string;
  /** Each particle file's, by id (#249). */
  particles: string[];
}

/** The manifest of the files `hashes` names: each Surah and Recitation file by its hash, the dataset version over them all. */
export function manifestOfHashes(hashes: PublishedHashes): Manifest {
  const surahs = hashes.surahs.map(({ number, hash }) => ({ number, url: publishedSurahUrl(number), hash }));
  const recitations = hashes.recitations.map(({ number, hash }) => ({ number, url: publishedRecitationUrl(number), hash }));
  const files = [hashes.index, ...surahs.map((s) => s.hash), ...hashes.roots, ...recitations.map((r) => r.hash), hashes.juz, ...hashes.particles];
  return { datasetVersion: contentHash(files.join("\n")), minAppVersion: MIN_APP_VERSION, surahs, recitations };
}

/** The hash of the bytes /data/v1 serves for `value`. */
export const publishedHash = (value: unknown) => contentHash(publishedFile(value));

/** The manifest of `dataset` as /data/v1 publishes it, each file named by the hash of its bytes in `dataset`. */
export function manifestOf(dataset: PublishedDataset): Manifest {
  return manifestOfHashes({
    index: publishedHash(surahIndex(dataset)),
    surahs: dataset.surahs.map((s) => ({ number: s.number, hash: publishedHash(s) })),
    roots: dataset.roots.map(publishedHash),
    recitations: dataset.recitations.map((r) => ({ number: r.surah, hash: publishedHash(r) })),
    juz: publishedHash(dataset.juz),
    particles: dataset.particles.map(publishedHash),
  });
}
