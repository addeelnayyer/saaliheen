// #172 AC-3: the Iltifat API's Marked Word checks, the Iltifat direction pages
// and the Admin area read the Quran text, Word counts, Ayah translations and
// Surah names from Neon, not the generated files. One Surah's Quran rows are
// changed by SQL before any page reads them (the Background), and each address
// is then asked for over HTTP, as the Iltifat editor, a browser or the Admin
// does; the database only arranges that and tells that a refused save wrote
// nothing. The Iltifat is chosen from Neon, the expected text from the
// generated output as committed before the Quran moved (BEFORE_QURAN_MOVED),
// never typed.

import { describeFeature, loadFeature, type StepTest } from "@amiceli/vitest-cucumber";
import { expect } from "vitest";
import { baseURL, credentialHeaders, database, send, signIn, type Answer, type SignedIn } from "../api/support";
import { BEFORE_QURAN_MOVED, committedJson, committedPhrases, committedSurahIndex, committedSurahPath } from "../site/committed-output.ts";
import { langOf, type Lang } from "./neon-passages";

const feature = await loadFeature("./iltifat-and-admin-read-quran-from-neon.feature");

type StepFn = Parameters<StepTest["Given"]>[1];

const NEON = " (Neon)";
/** The Surahs the other features of this seam change: published-passages-reach-readers' and passage-publishing's. */
const OTHER_FEATURES_SURAHS = new Set([87, 107, 108]);

// ---------------------------------------------------------------- the chosen Surah and Iltifat

/**
 * The first Surah after Al-Fatihah that holds a Phrase, as last committed:
 * passages-read-from-neon chooses a Surah that holds none, so the two
 * Backgrounds never change one Surah.
 */
function chosenSurah(): number {
  const phrased = [...new Set(committedPhrases().map((p) => Number(p.first.split(":")[0])))].sort((a, b) => a - b);
  const surah = phrased.find((s) => s > 1 && !OTHER_FEATURES_SURAHS.has(s));
  if (!surah) throw new Error("no Surah after Al-Fatihah holds a Phrase");
  return surah;
}

type Person = "first" | "second" | "third";
/** Each Iltifat direction's address, by its from and to persons. */
const DIRECTIONS: Record<string, string> = {
  "third→first": "he-to-we",
  "first→third": "we-to-he",
  "third→second": "he-to-you",
  "second→third": "you-to-he",
};

interface IltifatRow {
  id: number;
  from_person: Person;
  to_person: Person;
  surah: number;
  ayah_from: number;
  ayah_to: number;
  cited_ayah: number;
  reason: string;
  disputed: boolean;
  version: number;
}
interface Marked {
  location: string;
  side: "from" | "to";
}
/** An Iltifat as the API answers it. */
interface Answered {
  id: number;
  version: number;
  markedWords: Marked[];
}

const numeric = (r: IltifatRow): IltifatRow => ({
  ...r,
  id: Number(r.id),
  surah: Number(r.surah),
  ayah_from: Number(r.ayah_from),
  ayah_to: Number(r.ayah_to),
  cited_ayah: Number(r.cited_ayah),
  version: Number(r.version),
});

let chosenOnce: Promise<IltifatRow> | undefined;
/** The chosen Surah's Iltifat with the lowest cited Ayah, then the lowest id, as Neon held it when first chosen. */
function chosenIltifat(): Promise<IltifatRow> {
  return (chosenOnce ??= (async () => {
    const { rows } = await database().query<IltifatRow>(`select * from iltifat where surah = $1 order by cited_ayah, id limit 1`, [chosenSurah()]);
    expect(rows.length, `an Iltifat of Surah ${chosenSurah()} in Neon`).toBe(1);
    return numeric(rows[0]);
  })());
}
/** The chosen Iltifat as Neon holds it now. */
async function iltifatNow(): Promise<IltifatRow> {
  const { id } = await chosenIltifat();
  const { rows } = await database().query<IltifatRow>(`select * from iltifat where id = $1`, [id]);
  expect(rows.length, `Iltifat ${id} in Neon`).toBe(1);
  return numeric(rows[0]);
}
const directionOf = (r: IltifatRow) => DIRECTIONS[`${r.from_person}→${r.to_person}`];

/** A Word, Ayah and Surah of a Surah file as committed before the Quran moved, the parts the scenarios read, among the rest. */
interface BaseWord {
  location: string;
  uthmani: string;
  indopak: string;
  meaning: { ur: string | null; en: string | null };
}
interface BaseAyah {
  number: number;
  translation: { ur: string | null; en: string | null };
  words: BaseWord[];
}

/** The cited Ayah as committed before the Quran moved, its last Word, the Word location it gains and the one after that. */
async function cited(): Promise<{ ayah: BaseAyah; last: BaseWord; gained: string; after: string }> {
  const { surah, cited_ayah } = await chosenIltifat();
  const ayah = committedJson<{ ayahs: BaseAyah[] }>(committedSurahPath(surah), BEFORE_QURAN_MOVED).ayahs[cited_ayah - 1];
  expect(ayah?.number, `Ayah ${surah}:${cited_ayah} as committed`).toBe(cited_ayah);
  const count = ayah.words.length;
  return { ayah, last: ayah.words.at(-1)!, gained: `${surah}:${cited_ayah}:${count + 1}`, after: `${surah}:${cited_ayah}:${count + 2}` };
}
/** The chosen Surah's Latin name as Neon is made to hold it. */
const neonLatinName = () => committedSurahIndex()[chosenSurah() - 1].nameLatin + NEON;

// ---------------------------------------------------------------- the Background's SQL

/** Why the Background's changes are not there, when they are not. */
let quranUnchanged: string | undefined;
const why = (what: string) => (quranUnchanged ? `${what} (${quranUnchanged})` : what);

let arranged: Promise<void> | undefined;
/** The Background's changes, made once for the feature, in one transaction; none where Neon has no Quran table yet. */
function arrange(): Promise<void> {
  return (arranged ??= (async () => {
    const { surah, cited_ayah } = await chosenIltifat();
    const { last, gained } = await cited();
    const db = await database().connect();
    try {
      const { rows } = await db.query(`select to_regclass('public.word') is not null as present`);
      if (!rows[0].present) {
        quranUnchanged = "Neon has no word table: the Background changed no Quran row";
        return;
      }
      await db.query("begin");
      const copied = await db.query(
        `insert into word (location, surah, ayah, position, uthmani, indopak, meaning_ur, meaning_en, root_id)
         select $2, surah, ayah, position + 1, uthmani, indopak, meaning_ur, meaning_en, root_id from word where location = $1`,
        [last.location, gained],
      );
      expect(copied.rowCount, `Neon holds the Word ${last.location}`).toBe(1);
      const translated = await db.query(
        `update ayah set translation_en = translation_en || $3, translation_ur = translation_ur || $3 where surah = $1 and number = $2`,
        [surah, cited_ayah, NEON],
      );
      expect(translated.rowCount, `Neon holds the Ayah ${surah}:${cited_ayah}`).toBe(1);
      const named = await db.query(`update surah set name_latin = name_latin || $2 where number = $1`, [surah, NEON]);
      expect(named.rowCount, `Neon holds the Surah ${surah}`).toBe(1);
      await db.query("commit");
    } catch (error) {
      await db.query("rollback");
      throw error;
    } finally {
      db.release();
    }
  })());
}

// ---------------------------------------------------------------- reading what an address answers

/** `html`'s text as a reader sees it: React's entities decoded and its text separators dropped. */
const shownText = (html: string) =>
  html
    .replace(/<!-- -->/g, "")
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");

const escaped = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
/** Whether `text` names Word location `location`, not a longer one it begins. */
const names = (text: string, location: string) => new RegExp(`(?<![\\d:])${escaped(location)}(?![\\d:])`).test(text);

/** Every Iltifat as GET /api/v1/iltifat answers it now. */
async function everyAnswered(): Promise<Answered[]> {
  const res = await send("GET", "/api/v1/iltifat", credentialHeaders("neither cookie nor token"));
  expect(res.status, "GET /api/v1/iltifat").toBe(200);
  return (res.json as { iltifat: Answered[] }).iltifat;
}
/** The chosen Iltifat's Marked Words as GET /api/v1/iltifat answers them now. */
async function markedNow(): Promise<Marked[]> {
  const { id } = await chosenIltifat();
  const found = (await everyAnswered()).find((i) => Number(i.id) === id);
  expect(found, `Iltifat ${id} in /api/v1/iltifat`).toBeDefined();
  return found!.markedWords.map(({ location, side }) => ({ location, side }));
}

/** The chosen Iltifat's row, its Marked Words' rows and its Iltifat revisions, as text, to tell that nothing was written. */
async function iltifatRows(): Promise<string> {
  const { id } = await chosenIltifat();
  const row = await database().query(`select * from iltifat where id = $1`, [id]);
  const marked = await database().query(`select * from iltifat_marked_word where iltifat_id = $1 order by ayah, word`, [id]);
  const revisions = await database().query(`select * from iltifat_revision where iltifat_id = $1 order by version, created_at`, [id]);
  return JSON.stringify([row.rows, marked.rows, revisions.rows]);
}

// ---------------------------------------------------------------- the scenarios

describeFeature(feature, ({ Background, Scenario, ScenarioOutline, BeforeEachScenario, defineSteps }) => {
  let signedIn: SignedIn | undefined;
  let answer: Answer | undefined;
  let status: number | undefined;
  let html = "";
  let rowsBefore = "";
  let lang: Lang = "en";

  BeforeEachScenario(() => {
    signedIn = undefined;
    answer = undefined;
    status = undefined;
    html = "";
    rowsBefore = "";
  });

  const fetchPage = async (address: string, headers: Record<string, string> = {}) => {
    const res = await fetch(`${baseURL()}${address}`, { headers, redirect: "manual" });
    status = res.status;
    html = await res.text();
  };
  /** An Admin page, asked for with the signed-in Admin's session cookie, as the browser sends it. */
  const fetchAdminPage = (address: string) => fetchPage(address, credentialHeaders("session cookie", signedIn));

  /** Save the chosen Iltifat as the editor does: its whole state as Neon holds it, its own version, its Marked Words and `marking` on `side`. */
  const save = async (marking: Marked[]) => {
    const r = await iltifatNow();
    const kept = (await markedNow()).filter((w) => !marking.some((m) => m.location === w.location));
    const body = {
      base: r.version,
      reason: r.reason,
      ayahFrom: r.ayah_from,
      ayahTo: r.ayah_to,
      disputed: r.disputed,
      markedWords: [...kept, ...marking],
    };
    answer = await send("PUT", `/api/v1/iltifat/${r.id}`, credentialHeaders("session cookie", signedIn), JSON.stringify(body));
  };

  defineSteps((keywords) => {
    const step = (text: string, fn: StepFn) => {
      for (const define of [keywords.Given, keywords.When, keywords.Then, keywords.And, keywords.But]) define(text, fn);
    };

    step("I am signed in as {string}", async (_, email: string) => {
      signedIn = await signIn(email);
    });

    step("the page answers {int}", (_, expected: number) => {
      expect(status, why(`the page: ${html.slice(0, 300)}`)).toBe(expected);
    });

    // -------------------------------------------------- the Iltifat API

    step(
      "I save the chosen Iltifat with its own version, keeping its Marked Words and marking the Word its cited Ayah gained on the {string} side",
      async (_, side: Marked["side"]) => {
        await save([{ location: (await cited()).gained, side }]);
      },
    );

    step(
      "I save the chosen Iltifat with its own version, keeping its Marked Words, marking the Word its cited Ayah gained on the {string} side and the cited Ayah's first Word on the {string} side",
      async (_, gainedSide: Marked["side"], firstSide: Marked["side"]) => {
        const { ayah, gained } = await cited();
        await save([
          { location: gained, side: gainedSide },
          { location: ayah.words[0].location, side: firstSide },
        ]);
      },
    );

    step(
      "I save the chosen Iltifat with its own version, keeping its Marked Words and marking both the Word its cited Ayah gained and the Word location after it on the {string} side",
      async (_, side: Marked["side"]) => {
        const { gained, after } = await cited();
        await save([gained, after].map((location) => ({ location, side })));
      },
    );

    step("the save answers {int}", async (_, expected: number) => {
      const { gained } = await cited();
      expect(answer?.status, why(`the save marking ${gained}: ${answer?.text.slice(0, 300)}`)).toBe(expected);
    });

    step("the answered Iltifat holds the Word its cited Ayah gained as a Marked Word on the {string} side", async (_, side: string) => {
      const { gained } = await cited();
      const marked = (answer?.json as { iltifat?: Answered } | undefined)?.iltifat?.markedWords ?? [];
      expect(marked.map(({ location, side }) => ({ location, side }))).toContainEqual({ location: gained, side });
    });

    step("GET /api/v1/iltifat lists the chosen Iltifat with the Word its cited Ayah gained as a Marked Word on the {string} side", async (_, side: string) => {
      expect(await markedNow()).toContainEqual({ location: (await cited()).gained, side });
    });

    step("I note the chosen Iltifat, its Marked Words and its Iltifat revisions", async () => {
      rowsBefore = await iltifatRows();
    });

    step("the answer's error names the Word location after the gained Word, and not the gained Word", async () => {
      const { gained, after } = await cited();
      const error = String((answer?.json as { error?: unknown } | undefined)?.error ?? "");
      expect(names(error, after), why(`the error "${error}" names ${after}, which is no Word of Neon's Quran text`)).toBe(true);
      expect(names(error, gained), why(`the error "${error}" names ${gained}, which Neon holds as a Word`)).toBe(false);
    });

    step("the chosen Iltifat, its Marked Words and its Iltifat revisions are as I noted them", async () => {
      expect(await iltifatRows()).toBe(rowsBefore);
    });

    // -------------------------------------------------- the Admin area

    step("I fetch, as the Admin, the Iltifat editor of the chosen Iltifat", async () => {
      await fetchAdminPage(`/admin/iltifat/${(await chosenIltifat()).id}`);
    });

    step("it is headed with the chosen Surah's Latin name as Neon holds it", () => {
      const heading = shownText(html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/)?.[1] ?? "");
      expect(heading, why("the editor's heading")).toContain(neonLatinName());
    });

    step(
      "it has a Word card for the Word its cited Ayah gained, holding the English Word meaning of the cited Ayah's last Word, whose copy it is",
      async () => {
        const { gained, last } = await cited();
        const at = html.indexOf(`id="${gained}"`);
        expect(at, why(`a Word card with the id ${gained}`)).toBeGreaterThan(-1);
        const card = shownText(html.slice(at, html.indexOf("</button>", at)));
        expect(card, `the Word card of ${gained}`).toContain(`>${last.meaning.en}<`);
      },
    );

    step(
      "I publish, against the chosen Surah's latest Allah reference version, the Word the chosen Iltifat's cited Ayah gained as an Allah reference",
      async () => {
        const surah = chosenSurah();
        const { rows } = await database().query(`select coalesce(max(version), 0) as version from "allahReferenceRevision" where surah = $1`, [surah]);
        answer = await send(
          "POST",
          `/api/v1/allah-references/${surah}`,
          credentialHeaders("session cookie", signedIn),
          JSON.stringify({ base: Number(rows[0].version), changes: [(await cited()).gained] }),
        );
      },
    );

    step("the Publish answers {int}", async (_, expected: number) => {
      const { gained } = await cited();
      expect(answer?.status, why(`the Publish of ${gained}: ${answer?.text.slice(0, 300)}`)).toBe(expected);
    });

    step("I fetch, as the Admin, the Allah references page of the chosen Surah", async () => {
      await fetchAdminPage(`/admin/${chosenSurah()}/allah-references`);
    });

    step("it is headed with the chosen Surah's number and its Latin name as Neon holds it", () => {
      const heading = shownText(html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/)?.[1] ?? "");
      expect(heading, why("the Allah references page's heading")).toBe(`${chosenSurah()}. ${neonLatinName()}`);
    });

    step("it lists the Word the cited Ayah gained beside the Uthmani Arabic of the cited Ayah's last Word, whose copy it is", async () => {
      const { gained, last } = await cited();
      const at = html.indexOf(`>${gained}</span>`);
      expect(at, `the page lists ${gained}`).toBeGreaterThan(-1);
      const arabicAt = html.lastIndexOf('lang="ar"', at);
      const arabic = shownText(html.slice(html.indexOf(">", arabicAt) + 1, html.indexOf("</span>", arabicAt)));
      expect(arabic, why(`the Arabic beside ${gained}`)).toBe(last.uthmani);
    });

    step("I fetch, as the Admin, the Admin's Surah list", async () => {
      await fetchAdminPage("/admin");
    });

    step("its link to the chosen Surah's Passage editor names the chosen Surah by its Latin name as Neon holds it", () => {
      const link = html.match(new RegExp(`<a\\b[^>]*href="/admin/${chosenSurah()}"[^>]*>([\\s\\S]*?)</a>`))?.[1];
      expect(link, `a link to /admin/${chosenSurah()}`).toBeDefined();
      expect(shownText(link!), why(`the link to Surah ${chosenSurah()}'s Passage editor`)).toContain(`>${neonLatinName()}<`);
    });
  });

  Background(({ Given }) => {
    Given(
      "Neon's Quran text, Word count, Ayah translations and Surah name of the chosen Iltifat's Surah were changed by SQL, before any page read them",
      async () => {
        await arrange();
      },
    );
  });

  Scenario("An Admin's save of the chosen Iltifat marking the Word its cited Ayah gained is accepted", () => {});
  Scenario("A save marking the gained Word and the Word location after it is refused for the location after it alone, and changes nothing", () => {});

  ScenarioOutline("The chosen Iltifat's direction page in <Language> shows its cited Ayah as Neon holds it", ({ When, And }, variables) => {
    When("I fetch the chosen Iltifat's direction page in <Language>", async () => {
      lang = langOf(variables.Language);
      await fetchPage(`/${lang}/iltifat/${directionOf(await chosenIltifat())}`);
    });
    And("its entry for the chosen Iltifat is headed with the chosen Surah's Latin name as Neon holds it", async () => {
      const { surah, ayah_from } = await chosenIltifat();
      const headings = [...html.matchAll(/<h2\b[^>]*>([\s\S]*?)<\/h2>/g)].map((m) => shownText(m[1].replace(/<[^>]*>/g, "")));
      const run = new RegExp(`^${escaped(neonLatinName())} ${surah}:${ayah_from}(?!\\d)`);
      expect(headings.some((h) => run.test(h)), why(`an entry headed "${neonLatinName()} ${surah}:${ayah_from}…" among ${headings.length}`)).toBe(true);
    });
    And("it shows the cited Ayah's Ayah translation in <Language> as Neon holds it", async () => {
      const translation = (await cited()).ayah.translation[lang];
      expect(translation, "the cited Ayah's committed Ayah translation").toBeTruthy();
      expect(shownText(html).includes(`>${translation}${NEON}<`), why(`the Ayah translation "${translation}${NEON}"`)).toBe(true);
    });
    And(
      "it shows the Word its cited Ayah gained as a Marked Word, in Uthmani and in Indo-Pak the Arabic of the cited Ayah's last Word, whose copy it is",
      async () => {
        const { gained, last } = await cited();
        const shown = [...html.matchAll(new RegExp(`<span\\b[^>]*data-location="${escaped(gained)}"[^>]*>([^<]*)</span>`, "g"))].map((m) => shownText(m[1]));
        expect(shown, why(`the Marked Word ${gained}, in each Script`)).toEqual([last.uthmani, last.indopak]);
      },
    );
  });

  Scenario("The Admin's Iltifat editor of the chosen Iltifat shows the Word its cited Ayah gained", () => {});
  Scenario("An Admin's Allah reference Publish of the Word the cited Ayah gained is accepted, and the Surah's Allah references page shows its Arabic", () => {});
  Scenario("The Admin's Surah list names the chosen Surah as Neon holds it", () => {});
});
