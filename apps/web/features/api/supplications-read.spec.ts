import fs from "node:fs";
import path from "node:path";
import { describeFeature, loadFeature, type StepTest } from "@amiceli/vitest-cucumber";
import { expect } from "vitest";
import { credentialHeaders, database, send, type Answer } from "./support";
import {
  CURATED_FILE,
  OPENINGS,
  RAW_FILE,
  curated,
  curatedFileExists,
  holds,
  kindOfLabel,
  parseRun,
  quranOrder,
  rawRows,
  rawRuns,
  runOf,
  type Opening,
} from "../site/supplications-data.ts";

// Every Supplication and Speaker as a client reads them (#199, #195 § Testing
// Decisions): GET /api/v1/supplications over HTTP against the production build
// and the run's Postgres, which db:migrate loaded from the curated file.
// Expected values are read from the raw list and the curated file
// (../site/supplications-data.ts), apart from what #195 names.

const feature = await loadFeature("./supplications-read.feature");

const APP = path.resolve(import.meta.dirname, "../..");

/** A Supplication, or one of the Other words to Allah, as the answer gives it. */
interface Listed {
  id: unknown;
  surah: number;
  ayahFrom: number;
  ayahTo: number;
  speakerId: string;
  openings: Opening[];
  kind: string;
  version: unknown;
  spans: unknown;
}
/** A Speaker as the answer gives it. */
interface ListedSpeaker {
  id: string;
  nameEn: string;
  nameUr: string;
  includesProphet: boolean;
}

/** The Ayah count of every Surah, from QUL's Surah metadata. */
function surahAyahCounts(): Map<number, number> {
  const meta = JSON.parse(fs.readFileSync(path.join(APP, "data/qul/quran-metadata-surah-name.json"), "utf8")) as Record<string, { id: number; verses_count: number }>;
  return new Map(Object.values(meta).map((s) => [s.id, s.verses_count]));
}

/** Openings as a scenario names them ("Rabbana, Rabbi"), in the answer's order. */
const openingsNamed = (named: string): Opening[] =>
  named
    .split(",")
    .map((o) => o.trim().toLowerCase() as Opening)
    .toSorted((a, b) => OPENINGS.indexOf(a) - OPENINGS.indexOf(b));

/** A name as an HTML page writes its text, its entities undone. */
const unescapeHtml = (html: string) =>
  html.replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");

type StepFn = Parameters<StepTest["Given"]>[1];

describeFeature(feature, ({ Scenario, ScenarioOutline, BeforeEachScenario, AfterEachScenario, defineSteps }) => {
  /** The API's last answer. */
  let answer: Answer | undefined;
  /** The page a step last fetched: its status and HTML. */
  let fetched: { status: number; html: string } | undefined;
  /** The Speaker whose English name a step changed, and its name before. */
  let changed: { id: string; nameEn: string } | undefined;
  /** The raw speakers a step named as including a Prophet. */
  let prophets: Set<string> | undefined;

  BeforeEachScenario(() => {
    prophets = undefined;
    answer = undefined;
    fetched = undefined;
    changed = undefined;
  });

  // Put back a name a scenario changed, so later scenarios see the curated file's.
  AfterEachScenario(async () => {
    if (changed) await database().query(`update supplication_speaker set name_en = $1 where id = $2`, [changed.nameEn, changed.id]);
  });

  const answered = () => {
    if (!answer) throw new Error("no request sent yet in this scenario");
    return answer;
  };
  const body = () => {
    const json = answered().json as { supplications?: unknown; speakers?: unknown } | undefined;
    expect(answered().status, `the answer's status (${answered().text.slice(0, 200)})`).toBe(200);
    expect(json, "the answer is a JSON object").toBeTypeOf("object");
    return json!;
  };
  const listed = () => {
    const list = body().supplications;
    expect(Array.isArray(list), 'the answer\'s "supplications" is a list').toBe(true);
    return list as Listed[];
  };
  const speakers = () => {
    const list = body().speakers;
    expect(Array.isArray(list), 'the answer\'s "speakers" is a list').toBe(true);
    return list as ListedSpeaker[];
  };
  const speakerById = (id: string) => speakers().find((s) => s.id === id);
  /** The one run in the answer at `run`. */
  const oneAt = (run: string) => {
    const want = parseRun(run);
    const found = listed().filter((s) => runOf(s) === runOf(want));
    expect(found.length, `runs in the answer at ${run}`).toBe(1);
    return found[0];
  };
  /** The one run in the answer holding `surah:ayah`. */
  const runHolding = (surah: number, ayah: number) => {
    const found = listed().filter((s) => holds(s, surah, ayah));
    expect(found.length, `runs in the answer holding ${surah}:${ayah}`).toBe(1);
    return found[0];
  };
  /** The Speakers of the runs holding the raw rows of `entity`. */
  const speakersOfRaw = (entity: string) => {
    const rows = rawRows().filter((r) => r.entity === entity);
    expect(rows.length, `raw rows of "${entity}"`).toBeGreaterThan(0);
    return [...new Set(rows.map((r) => runHolding(r.surah, r.ayah).speakerId))];
  };
  /** The curated file's Supplication at `run`. */
  const curatedAt = (run: string) => {
    const found = curated().supplications.filter((s) => runOf(s) === runOf(parseRun(run)));
    expect(found.length, `the curated file's runs at ${run}`).toBe(1);
    return found[0];
  };
  const curatedSpeaker = (id: string) => {
    const found = curated().speakers.find((s) => s.id === id);
    expect(found, `the curated file's Speaker "${id}"`).toBeDefined();
    return found!;
  };

  defineSteps((keywords) => {
    const step = (text: string, fn: StepFn) => {
      for (const define of [keywords.Given, keywords.When, keywords.Then, keywords.And, keywords.But]) define(text, fn);
    };

    step("I GET {string} with {any}", async (_, url: string, credential: string) => {
      answer = await send("GET", url, credentialHeaders(credential));
    });

    step("the answer's status is {int}", (_, status: number) => {
      expect(answered().status, `the answer's status (${answered().text.slice(0, 200)})`).toBe(status);
    });

    // ---------------------------------------------------------------- AC-9, AC-10

    step("each Supplication in the answer has an id, a Surah, a run, a Speaker id, Openings, a kind, a version and its spans", () => {
      const wrong = listed().filter(
        (s) =>
          s.id === null ||
          s.id === undefined ||
          !Number.isInteger(s.surah) ||
          !Number.isInteger(s.ayahFrom) ||
          !Number.isInteger(s.ayahTo) ||
          typeof s.speakerId !== "string" ||
          !Array.isArray(s.openings) ||
          s.openings.length === 0 ||
          s.openings.some((o) => !OPENINGS.includes(o)) ||
          typeof s.kind !== "string" ||
          !Number.isInteger(s.version) ||
          !Array.isArray(s.spans),
      );
      expect(listed().length, "Supplications in the answer").toBeGreaterThan(0);
      expect(wrong.slice(0, 3), "Supplications missing a field, or with one of the wrong kind").toEqual([]);
    });

    step("no two Supplications in the answer share an id", () => {
      const ids = listed().map((s) => String(s.id));
      expect(new Set(ids).size, "distinct ids").toBe(ids.length);
    });

    step("the Supplications in the answer are in Quran order", () => {
      const list = listed();
      const outOfOrder = list.slice(1).filter((s, n) => quranOrder(list[n], s) > 0).map(runOf);
      expect(outOfOrder, "runs listed before one that comes earlier in the Quran").toEqual([]);
    });

    step("the Supplications in the answer are the curated file's, each with its Surah, run, Speaker, Openings and kind", () => {
      const fields = (s: { surah: number; ayahFrom: number; ayahTo: number; speakerId: string; openings: Opening[]; kind: string }) => ({
        surah: s.surah,
        ayahFrom: s.ayahFrom,
        ayahTo: s.ayahTo,
        speakerId: s.speakerId,
        openings: s.openings,
        kind: s.kind,
      });
      expect(listed().map(fields)).toEqual(curated().supplications.map(fields).toSorted(quranOrder));
    });

    step("each Speaker in the answer has an id, an English name, an Urdu name and a Prophet mark", () => {
      const wrong = speakers().filter(
        (s) => typeof s.id !== "string" || s.id === "" || typeof s.nameEn !== "string" || s.nameEn === "" || typeof s.nameUr !== "string" || s.nameUr === "" || typeof s.includesProphet !== "boolean",
      );
      expect(speakers().length, "Speakers in the answer").toBeGreaterThan(0);
      expect(wrong.slice(0, 3), "Speakers missing a field, or with one of the wrong kind").toEqual([]);
    });

    step("the Speakers in the answer are the curated file's, each with its English name, Urdu name and Prophet mark", () => {
      const fields = (s: ListedSpeaker) => ({ id: s.id, nameEn: s.nameEn, nameUr: s.nameUr, includesProphet: s.includesProphet });
      const byId = (a: { id: string }, b: { id: string }) => a.id.localeCompare(b.id);
      expect(speakers().map(fields).toSorted(byId)).toEqual(curated().speakers.map(fields).toSorted(byId));
    });

    step("every Supplication in the answer is said by a Speaker in the answer", () => {
      const ids = new Set(speakers().map((s) => s.id));
      expect(listed().filter((s) => !ids.has(s.speakerId)).map(runOf), "runs whose Speaker is not in the answer").toEqual([]);
    });

    step("the answer names the minimum app version in its Min-App-Version header", () => {
      expect(answered().headers.get("min-app-version") ?? "", "the Min-App-Version header").toMatch(/^\d+\.\d+\.\d+$/);
    });

    step("that minimum app version is the one {string} names, {string}", async (_, manifestPath: string, version: string) => {
      const manifest = await send("GET", manifestPath, {});
      expect(manifest.status).toBe(200);
      const minAppVersion = (manifest.json as { minAppVersion?: unknown }).minAppVersion;
      expect(minAppVersion, `${manifestPath}'s minimum app version`).toBe(version);
      expect(answered().headers.get("min-app-version")).toBe(minAppVersion);
    });

    step("every Supplication in the answer is at version {int}", (_, version: number) => {
      expect(listed().length, "Supplications in the answer").toBeGreaterThan(0);
      expect(listed().filter((s) => s.version !== version).map(runOf), `runs not at version ${version}`).toEqual([]);
    });

    // ---------------------------------------------------------------- AC-1, AC-2

    step("the curated file {string} is committed beside the raw list {string}", (_, curatedFile: string, rawFile: string) => {
      expect(curatedFile).toBe(CURATED_FILE);
      expect(rawFile).toBe(RAW_FILE);
      expect(fs.existsSync(path.join(APP, rawFile)), `the raw list ${rawFile}`).toBe(true);
      expect(curatedFileExists(), `the curated file ${curatedFile}`).toBe(true);
      // Beside it: in the same dataset folder, data/.
      expect(path.dirname(path.dirname(curatedFile))).toBe(path.dirname(rawFile));
      expect(curated().supplications.length, "runs in the curated file").toBeGreaterThan(0);
    });

    step("every row of the raw list lies inside exactly one run in the answer", () => {
      const rows = rawRows();
      expect(rows.length, "rows in the raw list").toBe(132);
      const wrong = rows
        .map((r) => ({ at: `${r.surah}:${r.ayah}`, runs: listed().filter((s) => holds(s, r.surah, r.ayah)).length }))
        .filter((r) => r.runs !== 1);
      expect(wrong, "raw rows in no run, or in more than one").toEqual([]);
    });

    step("every Ayah of every run in the answer is a row of the raw list, but {any}", (_, except: string) => {
      const raw = new Set(rawRows().map((r) => `${r.surah}:${r.ayah}`));
      const extra = listed().flatMap((s) => Array.from({ length: s.ayahTo - s.ayahFrom + 1 }, (_, n) => `${s.surah}:${s.ayahFrom + n}`)).filter((a) => !raw.has(a));
      expect(extra, "Ayahs in a run that the raw list has no row for").toEqual([except]);
    });

    // ---------------------------------------------------------------- AC-7

    step("no Ayah lies in two runs in the answer", () => {
      const seen = new Map<string, number>();
      for (const s of listed()) for (let a = s.ayahFrom; a <= s.ayahTo; a++) seen.set(`${s.surah}:${a}`, (seen.get(`${s.surah}:${a}`) ?? 0) + 1);
      expect([...seen].filter(([, n]) => n > 1).map(([a]) => a), "Ayahs in two runs").toEqual([]);
    });

    step(
      "every run in the answer names a Surah from 1 to 114, starts at Ayah 1 or later, ends at or before its Surah's last Ayah in the Surah metadata, and starts at or before it ends",
      () => {
        const counts = surahAyahCounts();
        const wrong = listed().filter((s) => !(s.surah >= 1 && s.surah <= 114) || s.ayahFrom < 1 || s.ayahTo > (counts.get(s.surah) ?? 0) || s.ayahFrom > s.ayahTo);
        expect(listed().length, "runs in the answer").toBeGreaterThan(0);
        expect(wrong.map(runOf), "runs that leave their Surah").toEqual([]);
      },
    );

    // ---------------------------------------------------------------- AC-3

    step(
      "the runs in the answer are the raw list's runs of consecutive Ayahs with one speaker, except that:",
      (_, table: { "raw runs": string; become: string }[]) => {
        const runs = new Set(rawRuns().map(runOf));
        for (const { "raw runs": from, become } of table) {
          for (const r of from.split(", ")) {
            expect(runs.has(r), `${r} is a raw run`).toBe(true);
            runs.delete(r);
          }
          for (const r of become.split(", ")) runs.add(r);
        }
        expect(rawRuns().length, "the raw list's runs").toBe(94);
        const order = (a: string, b: string) => quranOrder(parseRun(a), parseRun(b));
        expect(listed().map(runOf)).toEqual([...runs].toSorted(order));
      },
    );

    step("the answer has one run at {any}, a {any}, with the Openings {any}", (_, run: string, kindLabel: string, openings: string) => {
      const s = oneAt(run);
      expect(s.kind, `the kind of ${run}`).toBe(kindOfLabel(kindLabel));
      const expected =
        openings === "as the raw list's rows give them"
          ? OPENINGS.filter((o) => rawRows().some((r) => holds(s, r.surah, r.ayah) && r.invocation_form === o))
          : openingsNamed(openings);
      expect(s.openings, `the Openings of ${run}`).toEqual(expected);
    });

    step(`each run's Openings in the answer are the invocation forms of the raw rows inside it, leaving out "continuation"`, () => {
      const wrong = listed()
        .map((s) => ({
          run: runOf(s),
          openings: s.openings,
          forms: OPENINGS.filter((o) => rawRows().some((r) => holds(s, r.surah, r.ayah) && r.invocation_form === o)),
        }))
        .filter((s) => JSON.stringify(s.openings) !== JSON.stringify(s.forms));
      expect(listed().length, "runs in the answer").toBeGreaterThan(0);
      expect(wrong, "runs whose Openings are not their raw rows' forms").toEqual([]);
    });

    // ---------------------------------------------------------------- AC-4

    step("the run each raw row lies in has the kind its context type gives:", (_, table: { "context type": string; kind: string }[]) => {
      const kindOf = Object.fromEntries(table.map((t) => [t["context type"], kindOfLabel(t.kind)]));
      const rows = rawRows();
      expect(rows.filter((r) => !(r.context_type in kindOf)).map((r) => r.context_type), "context types the table does not map").toEqual([]);
      const wrong = rows
        .map((r) => ({ at: `${r.surah}:${r.ayah}`, context: r.context_type, kind: runHolding(r.surah, r.ayah).kind }))
        .filter((r) => r.kind !== kindOf[r.context]);
      expect(wrong, "raw rows in a run of another kind").toEqual([]);
    });

    // ---------------------------------------------------------------- AC-5

    step("all the raw rows of each raw speaker lie in runs said by one Speaker", () => {
      const entities = [...new Set(rawRows().map((r) => r.entity))];
      expect(entities.length, "the raw list's speakers").toBe(62);
      const split = entities.map((e) => ({ entity: e, speakers: speakersOfRaw(e) })).filter((e) => e.speakers.length !== 1);
      expect(split, "raw speakers whose rows lie in runs of more than one Speaker").toEqual([]);
    });

    step("every Speaker in the answer says at least one run in the answer", () => {
      const saying = new Set(listed().map((s) => s.speakerId));
      expect(speakers().filter((s) => !saying.has(s.id)).map((s) => s.id), "Speakers who say nothing").toEqual([]);
    });

    step("there are no more Speakers in the answer than the raw list's {int} speakers", (_, count: number) => {
      expect(new Set(rawRows().map((r) => r.entity)).size, "the raw list's speakers").toBe(count);
      expect(speakers().length, "Speakers in the answer").toBeGreaterThan(0);
      expect(speakers().length, "Speakers in the answer").toBeLessThanOrEqual(count);
    });

    step("no Speaker's English name has a bracket in it, and no two Speakers share an English name", () => {
      const names = speakers().map((s) => s.nameEn);
      expect(names.filter((n) => /[()[\]]/.test(n) || n !== n.trim()), "English names with a bracket, or untrimmed").toEqual([]);
      expect(new Set(names).size, "distinct English names").toBe(names.length);
    });

    step("every Speaker's Urdu name is written in Urdu letters, and no two Speakers share an Urdu name", () => {
      const names = speakers().map((s) => s.nameUr);
      // Arabic-script letters, with spaces, marks and the Urdu punctuation a name may need; no Latin letter or bracket.
      expect(names.filter((n) => !/\p{Script=Arabic}/u.test(n) || /[A-Za-z()[\]]/.test(n)), "Urdu names not in Urdu letters").toEqual([]);
      expect(new Set(names).size, "distinct Urdu names").toBe(names.length);
    });

    step("the {int} raw rows of {string} lie in runs said by one Speaker, who includes a Prophet", (_, count: number, entity: string) => {
      expect(rawRows().filter((r) => r.entity === entity).length, `raw rows of "${entity}"`).toBe(count);
      const ids = speakersOfRaw(entity);
      expect(ids.length, `Speakers of "${entity}"`).toBe(1);
      expect(speakerById(ids[0])?.includesProphet, `the Prophet mark of ${ids[0]}`).toBe(true);
    });

    step("the raw rows of {string} lie in runs said by one Speaker, who does not include a Prophet", (_, entity: string) => {
      const ids = speakersOfRaw(entity);
      expect(ids.length, `Speakers of "${entity}"`).toBe(1);
      expect(speakerById(ids[0])?.includesProphet, `the Prophet mark of ${ids[0]}`).toBe(false);
    });

    step("the Speaker of each of these raw speakers includes a Prophet:", (_, table: { "raw speaker": string }[]) => {
      prophets = new Set(table.map((t) => t["raw speaker"]));
      const wrong = table
        .map((t) => t["raw speaker"])
        .flatMap((e) => speakersOfRaw(e).map((id) => ({ entity: e, id, includesProphet: speakerById(id)?.includesProphet })))
        .filter((s) => s.includesProphet !== true);
      expect(wrong, "Speakers of a Prophet's raw rows not marked as including a Prophet").toEqual([]);
    });

    step(
      "the Speaker of every other raw speaker does not include a Prophet, leaving these, which a Scholar is asked about:",
      (_, table: { "raw speaker": string }[]) => {
        if (!prophets) throw new Error("no raw speakers named as including a Prophet in this scenario");
        const left = new Set(table.map((t) => t["raw speaker"]));
        const entities = new Set(rawRows().map((r) => r.entity));
        for (const e of [...left, ...prophets]) expect(entities.has(e), `"${e}" is a raw speaker`).toBe(true);
        const wrong = [...entities]
          .filter((e) => !left.has(e) && !prophets!.has(e))
          .flatMap((e) => speakersOfRaw(e).map((id) => ({ entity: e, id, includesProphet: speakerById(id)?.includesProphet })))
          .filter((s) => s.includesProphet !== false);
        expect(wrong, "Speakers of other raw speakers not marked as without a Prophet").toEqual([]);
      },
    );

    // ---------------------------------------------------------------- AC-11, AC-14

    const fetchPage = async (address: string) => {
      const page = await send("GET", address, {});
      fetched = { status: page.status, html: page.text };
      expect(page.status, `${address} answers`).toBe(200);
    };
    step("I fetch {string}", (_, address: string) => fetchPage(address));
    step("I fetch {string} again", (_, address: string) => fetchPage(address));

    step("the English name of the Speaker of the run at {any} has since been changed in the database to {string}", async (_, run: string, name: string) => {
      // As an Admin's save will, once the Supplication editor exists: arranged directly in the database.
      const id = curatedAt(run).speakerId;
      const before = await database().query<{ name_en: string }>(`select name_en from supplication_speaker where id = $1`, [id]);
      expect(before.rows.length, `the Speaker "${id}" in the database`).toBe(1);
      changed = { id, nameEn: before.rows[0].name_en };
      await database().query(`update supplication_speaker set name_en = $1 where id = $2`, [name, id]);
    });

    step("the answer names the Speaker of the run at {any} as the curated file does", (_, run: string) => {
      const s = oneAt(run);
      const want = curatedSpeaker(curatedAt(run).speakerId);
      expect(s.speakerId).toBe(want.id);
      expect(speakerById(s.speakerId)?.nameEn, `the English name of ${want.id}`).toBe(want.nameEn);
    });

    step("the page names the Speaker of the run at {any} as the curated file does, and not {string}", (_, run: string, name: string) => {
      if (!fetched) throw new Error("no page fetched yet in this scenario");
      const text = unescapeHtml(fetched.html);
      const want = curatedSpeaker(curatedAt(run).speakerId);
      expect(text.includes(want.nameEn), `the page names "${want.nameEn}"`).toBe(true);
      expect(text.includes(name), `the page names "${name}"`).toBe(false);
    });
  });

  Scenario("With no Account, GET /api/v1/supplications answers every Supplication and Speaker of the curated file, in Quran order", () => {});
  Scenario("The answer to GET /api/v1/supplications names the minimum app version the manifest names", () => {});
  Scenario("Every Supplication in the answer is at version 1, as the content migrations loaded it", () => {});
  Scenario("Every row of the raw list lies inside exactly one Supplication or one of the Other words to Allah", () => {});
  Scenario("In the answer no Ayah is in two Supplications and no run crosses its Surah", () => {});
  Scenario("The runs in the answer are the raw list's runs of one speaker, with 28:16–17 split in two and 14:35–41 made one", () => {});
  ScenarioOutline("<run> is one <kind> with the Openings <openings>", () => {});
  Scenario("Each run's Openings are the invocation forms of its raw rows, a continuation taking its run's", () => {});
  Scenario("Each raw row's context type gives the kind of the run it lies in, as #195 maps them", () => {});
  ScenarioOutline("<run> is <kind>", () => {});
  Scenario("The raw speakers become clean Speakers, one per person or group, named in English and Urdu", () => {});
  Scenario("Musa is one Speaker who includes a Prophet; the wife of Imran's Speaker does not", () => {});
  Scenario("Each raw speaker's Speaker is marked as including a Prophet as #195 lists them", () => {});
  Scenario("The answer is kept in the cache: a change made in Neon since does not reach it", () => {});
  Scenario("The answer and the Supplications page are kept in the cache: a change made in Neon since reaches neither", () => {});
});
