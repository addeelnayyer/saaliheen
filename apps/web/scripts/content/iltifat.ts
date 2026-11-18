// The Iltifat's table and their first load (#138, ADR 0012, ADR 0015). The
// catalogue, version 2.0 (data/iltifat/quran_iltifat_person_shifts_2.json), is
// this data migration's frozen input: it is read only here, once per
// database, and from then on the "iltifat" table is the only place the Iltifat
// are kept or changed. The website reads them through src/iltifat/.

import fs from "node:fs";
import { fileURLToPath } from "node:url";
import type { PoolClient } from "pg";

const CATALOGUE = fileURLToPath(new URL("../../data/iltifat/quran_iltifat_person_shifts_2.json", import.meta.url));

/**
 * One row per Iltifat: its Iltifat direction as the persons it turns from and
 * to, its Surah and run of Ayahs, the Ayah Abdel Haleem cites, its reason, its
 * Disputed flag, its section of Abdel Haleem's list, and a version that a
 * later save will raise. The checks hold every row, an Admin's edits
 * included, to a cited Ayah within its run and a run within Surahs 1–114.
 */
export async function createIltifatTable(client: PoolClient) {
  await client.query(`
    create table iltifat (
      id integer primary key,
      from_person text not null check (from_person in ('first', 'second', 'third')),
      to_person text not null check (to_person in ('first', 'second', 'third')),
      surah smallint not null check (surah between 1 and 114),
      ayah_from smallint not null check (ayah_from >= 1),
      ayah_to smallint not null,
      cited_ayah smallint not null,
      reason text not null,
      disputed boolean not null,
      section text not null,
      version integer not null default 1,
      check (from_person <> to_person),
      check (ayah_from <= ayah_to),
      check (cited_ayah between ayah_from and ayah_to)
    )`);
  await client.query(`create index iltifat_by_direction on iltifat (from_person, to_person, surah, ayah_from)`);
}

type Person = "first" | "second" | "third";
interface CatalogueEntry {
  surah: number;
  ayah_from: number;
  ayah_to: number;
  from_person: Person;
  to_person: Person;
  reason: string;
  attestation_status: "well_attested" | "disputed";
  source_section: string;
  verse_url: string;
}

/** An entry as its row: ids follow the catalogue's own order, from 1. */
function rowOf(entry: CatalogueEntry, index: number) {
  return {
    id: index + 1,
    from_person: entry.from_person,
    to_person: entry.to_person,
    surah: entry.surah,
    ayah_from: entry.ayah_from,
    ayah_to: entry.ayah_to,
    cited_ayah: Number(new URL(entry.verse_url).searchParams.get("verse")),
    reason: entry.reason,
    disputed: entry.attestation_status === "disputed",
    section: entry.source_section,
  };
}

/** Load the catalogue's 326 Iltifat, each at version 1, in one statement. */
export async function loadIltifatCatalogue(client: PoolClient) {
  const { entries } = JSON.parse(fs.readFileSync(CATALOGUE, "utf8")) as { entries: CatalogueEntry[] };
  await client.query(
    `insert into iltifat (id, from_person, to_person, surah, ayah_from, ayah_to, cited_ayah, reason, disputed, section)
     select id, from_person, to_person, surah, ayah_from, ayah_to, cited_ayah, reason, disputed, section
       from jsonb_to_recordset($1::jsonb) as r(id integer, from_person text, to_person text, surah smallint,
            ayah_from smallint, ayah_to smallint, cited_ayah smallint, reason text, disputed boolean, section text)`,
    [JSON.stringify(entries.map(rowOf))],
  );
}
