// `pnpm db:load-tafsir <file> [<origin>]` (#233, ADR 0054): loads the English
// al-Mukhtasar from QUL's file (resource 266) into the Postgres DATABASE_URL
// names (Neon), replacing every English Tafsir row in one transaction
// (../src/tafsir/load.ts), so it can be run again at any time. A file that
// breaks QUL's format, or names an Ayah the Quran import did not load, is
// refused whole, naming the key, and nothing is written. Given the
// deployment's <origin>, it then asks it to refresh every Surah's Tafsir
// (POST /api/v1/tafsir/reloads, with TAFSIR_RELOAD_SECRET), so readers see
// the load with no deploy, and a refresh that failed is retried by running the
// load again; without one, the load is seen after the next deploy.
// Last, Quran Chat's index is brought to the loaded Tafsir (#77, ADR 0056),
// embedding only the entries that changed, when OPENAI_API_KEY is set.
//
//   DATABASE_URL=… TAFSIR_RELOAD_SECRET=… pnpm db:load-tafsir data/qul/<file>.json https://saaliheen.com

import fs from "node:fs";
import { database } from "../src/database.ts";
import { readSurahSummaries } from "../src/quran/quran.ts";
import { indexWhenKeyed } from "../src/quran-chat/sources.ts";
import { loadTafsir } from "../src/tafsir/load.ts";
import { tafsirEntriesOf, TafsirRefused } from "../src/tafsir/qul.ts";

const [file, originArgument] = process.argv.slice(2);
const origin = originArgument?.replace(/\/+$/, "");
if (!file) throw new Error("db:load-tafsir: name QUL's file, e.g. `pnpm db:load-tafsir tafsir.json https://saaliheen.com`");
if (!process.env.DATABASE_URL) throw new Error("db:load-tafsir: set DATABASE_URL");
if (origin && !/^https?:\/\//.test(origin)) throw new Error(`db:load-tafsir: ${origin} is no origin, e.g. https://saaliheen.com`);
const secret = process.env.TAFSIR_RELOAD_SECRET;
if (origin && !secret) throw new Error("db:load-tafsir: set TAFSIR_RELOAD_SECRET to the deployment's, to refresh it");

/** Ask the deployment at `origin` to refresh every Surah's Tafsir. */
async function refresh() {
  const response = await fetch(`${origin}/api/v1/tafsir/reloads`, {
    method: "POST",
    headers: { authorization: `Bearer ${secret}`, "content-type": "application/json" },
    body: "{}",
  });
  if (!response.ok)
    throw new Error(`${origin} refused to refresh the Tafsir (${response.status}): ${await response.text()}; the load is written: run it again to retry the refresh`);
}

const pool = database();
try {
  const surahs = await readSurahSummaries(pool);
  const entries = tafsirEntriesOf(JSON.parse(fs.readFileSync(file, "utf8")), (surah) => surahs[surah - 1]?.ayahCount ?? 0);
  await loadTafsir(pool, "en", entries);
  console.log(`db:load-tafsir: ${entries.length} English Tafsir entries loaded`);
  if (origin) {
    await refresh();
    console.log(`db:load-tafsir: ${origin} refreshed`);
  } else console.log("db:load-tafsir: no origin given, so readers see the load after the next deploy");
  const indexed = await indexWhenKeyed(pool).catch((error) => {
    throw new Error("the Tafsir is loaded, but Quran Chat's index was not updated: run `pnpm db:index-quran-chat`", { cause: error });
  });
  console.log(`db:load-tafsir: ${indexed}`);
} catch (error) {
  if (!(error instanceof TafsirRefused) && !(error instanceof SyntaxError)) throw error;
  console.error(`db:load-tafsir: refused: ${error.message}; nothing written`);
  process.exitCode = 1;
} finally {
  await pool.end();
}
