// The particles read from Neon (#249): each particle with its Spellings, as
// the import (./import.ts) loads them, read back key for key in the shape the
// dataset builder gives them, so a particle file /data/v1 serves keeps its
// bytes. Plain reads, each taking the database it reads, as ./roots.ts's are:
// the pages read them through ./cached.ts.

import type { Pool } from "pg";
import type { ListedParticle, Particle, ParticleKind } from "@saaliheen/dataset/types";
import { database } from "../database.ts";
import { spellingOf, type SpellingRow } from "./roots.ts";

/** What the module reads through: the site's pool unless a caller passes its own. */
type Database = Pick<Pool, "query">;

interface ParticleRow {
  kind: ParticleKind;
  text: string;
  indopak: string;
  occurrences: number;
}

/** The particle numbered `id`, its Spellings in the builder's order; undefined when no particle has that number. */
export async function readParticle(id: number, db: Database = database()): Promise<Particle | undefined> {
  const [particle, spellings] = await Promise.all([
    db.query<ParticleRow>(`select kind, text, indopak, occurrences from particle where id = $1`, [id]),
    db.query<SpellingRow>(
      `select s.uthmani, s.indopak, s.meaning_ur, s.meaning_en,
              array_agg(w.location order by w.surah, w.ayah, w.position) as locations
         from particle_spelling s
         join particle_word pw on (pw.particle, pw.spelling) = (s.particle, s.position)
         join word w on w.location = pw.location
        where s.particle = $1
        group by s.particle, s.position
        order by s.position`,
      [id],
    ),
  ]);
  if (!particle.rows.length) return undefined;
  const { kind, text, indopak, occurrences } = particle.rows[0];
  return {
    id,
    kind,
    text,
    indopak,
    occurrences,
    spellings: spellings.rows.map(spellingOf),
  };
}

/** Every particle's stored hash, by number: one per particle file. */
export async function readParticleHashes(db: Database = database()): Promise<string[]> {
  return (await db.query<{ hash: string }>(`select hash from particle order by id`)).rows.map((r) => r.hash);
}

/** Every particle (#251), by number, so most frequent first, with its Spellings' meanings in each Language. */
export async function readParticleList(db: Database = database()): Promise<ListedParticle[]> {
  const { rows } = await db.query<Omit<ParticleRow, "occurrences"> & { id: number; ur: string[]; en: string[] }>(
    `select p.id, p.kind, p.text, p.indopak,
            array_remove(array_agg(s.meaning_ur order by s.position), '') as ur,
            array_remove(array_agg(s.meaning_en order by s.position), '') as en
       from particle p
       join particle_spelling s on s.particle = p.id
      group by p.id
      order by p.id`,
  );
  return rows.map(({ id, kind, text, indopak, ur, en }) => ({
    id,
    kind,
    text,
    indopak,
    meanings: { ur: [...new Set(ur)], en: [...new Set(en)] },
  }));
}
