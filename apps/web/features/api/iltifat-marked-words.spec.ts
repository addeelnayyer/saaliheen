import fs from "node:fs";
import path from "node:path";
import { describeFeature, loadFeature, type StepTest } from "@amiceli/vitest-cucumber";
import { expect } from "vitest";
import { ADMIN_EMAIL } from "../site/admin-settings.ts";
import { credentialHeaders, database, send, signIn, type Answer, type SignedIn } from "./support";

// Marked Words (#143): saved with an Iltifat through PUT /api/v1/iltifat/{id},
// kept in its Iltifat revision, and read from GET /api/v1/iltifat, over HTTP
// as the Iltifat editor and the mobile app send and read them. The `iltifat`
// row and its revisions in `iltifat_revision` are read directly, as
// ./iltifat-saves.spec.ts reads them; Marked Words only through the API, since
// how they are stored is the implementation's. Every Iltifat a scenario saves
// is put back afterwards, Marked Words and all, through the endpoint.

const feature = await loadFeature("./iltifat-marked-words.feature");

const QPC = path.resolve(import.meta.dirname, "../../data/qul/qpc-hafs-word-by-word.json");

type Person = "first" | "second" | "third";
/** The Iltifat directions a scenario names, by their slugs and persons. */
const DIRECTIONS: Record<string, { slug: string; from: Person; to: Person }> = {
  "He → We": { slug: "he-to-we", from: "third", to: "first" },
  "We → He": { slug: "we-to-he", from: "first", to: "third" },
  "He → You": { slug: "he-to-you", from: "third", to: "second" },
  "You → He": { slug: "you-to-he", from: "second", to: "third" },
};

interface Row {
  id: number;
  from_person: string;
  to_person: string;
  surah: number;
  ayah_from: number;
  ayah_to: number;
  cited_ayah: number;
  reason: string;
  disputed: boolean;
  section: string;
  version: number;
}
interface Revision {
  iltifat_id: number;
  author: string;
  base: number;
  version: number;
  before: Record<string, unknown>;
  after: Record<string, unknown>;
}
interface Marked {
  location: string;
  side: "from" | "to";
}
/** An Iltifat as the API answers it. */
interface Answered {
  id: number;
  direction: string;
  surah: number;
  ayahFrom: number;
  ayahTo: number;
  citedAyah: number;
  reason: string;
  disputed: boolean;
  version: number;
  markedWords: Marked[];
}

const numeric = (r: Row): Row => ({
  ...r,
  id: Number(r.id),
  surah: Number(r.surah),
  ayah_from: Number(r.ayah_from),
  ayah_to: Number(r.ayah_to),
  cited_ayah: Number(r.cited_ayah),
  version: Number(r.version),
});

/** The Iltifat of direction `name` cited at `ayah` ("17:1"), as the database holds it now. */
async function rowCitedAt(name: string, ayah: string): Promise<Row> {
  const d = DIRECTIONS[name];
  if (!d) throw new Error(`no Iltifat direction named "${name}"`);
  const [surah, cited] = ayah.split(":").map(Number);
  const { rows } = await database().query<Row>(
    `select * from iltifat where from_person = $1 and to_person = $2 and surah = $3 and cited_ayah = $4`,
    [d.from, d.to, surah, cited],
  );
  expect(rows.length, `one ${name} Iltifat cited at ${ayah} in the database`).toBe(1);
  return numeric(rows[0]);
}
async function rowById(id: number): Promise<Row> {
  const { rows } = await database().query<Row>(`select * from iltifat where id = $1`, [id]);
  expect(rows.length, `Iltifat ${id} in the database`).toBe(1);
  return numeric(rows[0]);
}

/** Every Iltifat as GET /api/v1/iltifat answers it now. */
async function everyAnswered(): Promise<Answered[]> {
  const res = await send("GET", "/api/v1/iltifat", credentialHeaders("neither cookie nor token"));
  expect(res.status, "GET /api/v1/iltifat").toBe(200);
  return (res.json as { iltifat: Answered[] }).iltifat;
}
/** The Marked Words GET /api/v1/iltifat answers for Iltifat `id` now. */
async function markedNow(id: number): Promise<unknown> {
  const found = (await everyAnswered()).find((i) => i.id === id);
  expect(found, `Iltifat ${id} in /api/v1/iltifat`).toBeDefined();
  return found!.markedWords;
}

/** Whether db:migrate made the table of Iltifat revisions. */
async function revisionsOf(id: number): Promise<Revision[]> {
  const { rows } = await database().query<Revision>(`select * from iltifat_revision where iltifat_id = $1 order by version, created_at`, [id]);
  return rows.map((r) => ({ ...r, iltifat_id: Number(r.iltifat_id), base: Number(r.base), version: Number(r.version) }));
}

/** Words as a scenario lists them, "1:5:3, 1:5:1", on one side. */
const wordsOf = (list: string, side: Marked["side"]): Marked[] =>
  list
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((location) => ({ location, side }));
const sides = (from: string, to: string) => [...wordsOf(from, "from"), ...wordsOf(to, "to")];
const tableOf = (rows: { location: string; side: string }[]) => rows.map(({ location, side }) => ({ location, side }));

/** What a save sends: the whole editable state, its base, and the Marked Words. */
const bodyOf = (r: Row, markedWords: unknown, change: Record<string, unknown> = {}) => ({
  base: r.version,
  reason: r.reason,
  ayahFrom: r.ayah_from,
  ayahTo: r.ayah_to,
  disputed: r.disputed,
  markedWords,
  ...change,
});

/** The Words of the Quran text by Word location (Ayah-end markers left out), from the QPC Hafs source. */
const QURAN_WORDS = (() => {
  const source = JSON.parse(fs.readFileSync(QPC, "utf8")) as Record<string, { location: string; text: string }>;
  return new Map(Object.values(source).filter((w) => !/^[٠-٩]+$/.test(w.text)).map((w) => [w.location, w.text]));
})();
/** A Word's letters with its marks taken out and the dagger alif written as an alif, to compare two spellings. */
const lettersOf = (word: string) => word.replace(/ٰ/g, "ا").replace(/[ً-ٟۖ-ۭـ]/g, "");

type StepFn = Parameters<StepTest["Given"]>[1];

/** What a body that is not a save sends as its Marked Words, by how a scenario names it. */
const NOT_A_SAVE: Record<string, (keep: Record<string, unknown>) => Record<string, unknown>> = {
  "left out": (b) => Object.fromEntries(Object.entries(b).filter(([k]) => k !== "markedWords")),
  'a side that is "sideways"': (b) => ({ ...b, markedWords: [{ location: "1:2:2", side: "sideways" }] }),
  "a location that is a number": (b) => ({ ...b, markedWords: [{ location: 122, side: "from" }] }),
  "not a list": (b) => ({ ...b, markedWords: "1:2:2 from" }),
};

describeFeature(feature, ({ Scenario, ScenarioOutline, BeforeEachScenario, AfterEachScenario, defineSteps }) => {
  let answer: Answer | undefined;
  let signedIn: SignedIn | undefined;
  /** The Iltifat noted, its Marked Words then, and how many revisions it had. */
  let noted: { row: Row; marked: unknown; revisions: number } | undefined;
  /** Each Iltifat the scenario saved, as it was before its first save, to put back. */
  let touched = new Map<number, { row: Row; marked: unknown }>();
  let revision: Revision | undefined;

  BeforeEachScenario(() => {
    answer = signedIn = noted = revision = undefined;
    touched = new Map();
  });

  AfterEachScenario(async () => {
    if (touched.size === 0) return;
    const admin = await signIn(ADMIN_EMAIL);
    for (const [id, was] of touched) {
      const now = await rowById(id);
      const back = await send("PUT", `/api/v1/iltifat/${id}`, credentialHeaders("session cookie", admin), JSON.stringify(bodyOf(was.row, was.marked ?? [], { base: now.version })));
      expect(back.status, `Iltifat ${id} is put back (${back.text.slice(0, 200)})`).toBe(200);
    }
  });

  /** Remember `row` as it was, before the scenario's first save of it. */
  const touch = async (row: Row) => {
    if (!touched.has(row.id)) touched.set(row.id, { row, marked: await markedNow(row.id) });
  };
  const save = async (row: Row, body: Record<string, unknown>, credential = "session cookie") => {
    await touch(row);
    answer = await send("PUT", `/api/v1/iltifat/${row.id}`, credentialHeaders(credential, signedIn), JSON.stringify(body));
    return answer;
  };
  /** Arrange: save `row` with `marked`, as an Admin, and expect it to pass. */
  const arrange = async (row: Row, marked: Marked[]) => {
    const admin = signedIn ?? (await signIn(ADMIN_EMAIL));
    await touch(row);
    const res = await send("PUT", `/api/v1/iltifat/${row.id}`, credentialHeaders("session cookie", admin), JSON.stringify(bodyOf(row, marked)));
    expect(res.status, `the arranging save passes (${res.text.slice(0, 200)})`).toBe(200);
  };

  const answered = () => {
    if (!answer) throw new Error("no request sent yet in this scenario");
    return answer;
  };
  const json = () => {
    const body = answered().json as Record<string, unknown> | undefined;
    expect(body, `the answer is a JSON object (${answered().text.slice(0, 200)})`).toBeTypeOf("object");
    return body!;
  };
  const answeredIltifat = () => {
    const i = json().iltifat as Answered | undefined;
    expect(i, 'the answer holds the Iltifat as "iltifat"').toBeTypeOf("object");
    return i!;
  };
  const listed = () => {
    const list = json().iltifat;
    expect(Array.isArray(list), 'the answer\'s "iltifat" is a list').toBe(true);
    return list as Answered[];
  };
  const notedOne = () => {
    if (!noted) throw new Error("no Iltifat noted in this scenario");
    return noted;
  };
  const listedCitedAt = async (name: string, ayah: string) => {
    const row = await rowCitedAt(name, ayah);
    const found = listed().find((i) => i.id === row.id);
    expect(found, `the ${name} Iltifat cited at ${ayah} in the answer`).toBeDefined();
    return found!;
  };
  const theRevision = () => {
    if (!revision) throw new Error("no Iltifat revision found yet in this scenario");
    return revision;
  };

  defineSteps((keywords) => {
    const step = (text: string, fn: StepFn) => {
      for (const define of [keywords.Given, keywords.When, keywords.Then, keywords.And, keywords.But]) define(text, fn);
    };

    // ---------------------------------------------------------------- arranging

    step("I note the He → You Iltifat cited at 1:5, its Marked Words and its Iltifat revisions", async () => {
      const row = await rowCitedAt("He → You", "1:5");
      noted = { row, marked: await markedNow(row.id), revisions: (await revisionsOf(row.id)).length };
    });

    step("I am signed in as {string}", async (_, email: string) => {
      signedIn = await signIn(email);
    });

    step("the He → You Iltifat cited at 1:5 has no Marked Words", async () => {
      const row = await rowCitedAt("He → You", "1:5");
      const marked = await markedNow(row.id);
      if (Array.isArray(marked) && marked.length === 0) return;
      await arrange(row, []);
      if (noted?.row.id === row.id) noted = { row: await rowById(row.id), marked: [], revisions: (await revisionsOf(row.id)).length };
    });

    step('the He → You Iltifat cited at 1:5 has the "from" Words {any} and the "to" Words {any}', async (_, from: string, to: string) => {
      await arrange(await rowCitedAt("He → You", "1:5"), sides(from, to));
    });

    step('the He → You Iltifat cited at 1:5 has been saved since I noted it, with the "from" Words {any} and the "to" Words {any}', async (_, from: string, to: string) => {
      await arrange(await rowById(notedOne().row.id), sides(from, to));
    });

    step("the Word at 17:1:13 is the Word the issue names, بَارَكْنَا", () => {
      const word = QURAN_WORDS.get("17:1:13");
      expect(word, "a Word at 17:1:13 in the QPC Hafs text").toBeDefined();
      expect(lettersOf(word!), "the letters of the Word at 17:1:13").toBe(lettersOf("بَارَكْنَا"));
    });

    // ---------------------------------------------------------------- saving

    step('I save the He → You Iltifat cited at 1:5 with the "from" Words {any} and the "to" Words {any}, with {any}', async (_, from: string, to: string, credential: string) => {
      const row = await rowCitedAt("He → You", "1:5");
      await save(row, bodyOf(row, sides(from, to)), credential);
    });

    step('I save the {any} Iltifat cited at 17:1 with the "from" Words {any} and the "to" Words {any}, with {any}', async (_, name: string, from: string, to: string, credential: string) => {
      const row = await rowCitedAt(name, "17:1");
      await save(row, bodyOf(row, sides(from, to)), credential);
    });

    step("I save the He → You Iltifat cited at 1:5 with no Marked Words, with {any}", async (_, credential: string) => {
      const row = await rowCitedAt("He → You", "1:5");
      await save(row, bodyOf(row, []), credential);
    });

    step(
      'I save the He → You Iltifat cited at 1:5 against its noted version, with the "from" Words {any} and the "to" Words {any}, with {any}',
      async (_, from: string, to: string, credential: string) => {
        const row = await rowCitedAt("He → You", "1:5");
        await save(row, bodyOf(row, sides(from, to), { base: notedOne().row.version }), credential);
      },
    );

    step("I save the He → You Iltifat cited at 1:5 with the run from Ayah {any} to Ayah {any}, keeping its Marked Words, with {any}", async (_, from: string, to: string, credential: string) => {
      const row = await rowCitedAt("He → You", "1:5");
      await save(row, bodyOf(row, await markedNow(row.id), { ayahFrom: Number(from), ayahTo: Number(to) }), credential);
    });

    step(
      'I save the He → You Iltifat cited at 1:5 with the run from Ayah {int} to Ayah {int}, the "from" Words {any} and the "to" Words {any}, with {any}',
      async (_, from: number, to: number, fromWords: string, toWords: string, credential: string) => {
        const row = await rowCitedAt("He → You", "1:5");
        await save(row, bodyOf(row, sides(fromWords, toWords), { ayahFrom: from, ayahTo: to }), credential);
      },
    );

    step("I save the He → You Iltifat cited at 1:5 with its own fields and the Marked Words sent as {any}, with {any}", async (_, what: string, credential: string) => {
      const make = NOT_A_SAVE[what];
      expect(make, `a way to send the Marked Words named "${what}"`).toBeDefined();
      const row = await rowCitedAt("He → You", "1:5");
      await save(row, make(bodyOf(row, await markedNow(row.id))), credential);
    });

    step("I GET {string} with {any}", async (_, url: string, credential: string) => {
      answer = await send("GET", url, credentialHeaders(credential, signedIn));
    });

    // ---------------------------------------------------------------- the answer

    step("the answer's status is {int}", (_, status: number) => {
      expect(answered().status, `the answer's status (${answered().text.slice(0, 300)})`).toBe(status);
    });

    step("the answer's status is again {int}", (_, status: number) => {
      expect(answered().status, `the answer's status (${answered().text.slice(0, 300)})`).toBe(status);
    });

    step("the answer has an error", () => {
      const error = json().error;
      expect(typeof error === "string" && error.trim() !== "", 'the answer says what is wrong in "error"').toBe(true);
    });

    step("the answer's error is {string}", (_, error: string) => {
      expect(json().error, 'the answer\'s "error"').toBe(error);
    });

    step("the answer's Iltifat has these Marked Words, in this order:", (_, table: { location: string; side: string }[]) => {
      expect(answeredIltifat().markedWords, "the answered Iltifat's Marked Words").toEqual(tableOf(table));
    });

    step("the answer's Iltifat has its noted version plus one", () => {
      expect(answeredIltifat().version, "the saved Iltifat's version").toBe(notedOne().row.version + 1);
    });

    step("the answer lists the {any} Iltifat cited at {any} with these Marked Words, in this order:", async (_, name: string, ayah: string, table: { location: string; side: string }[]) => {
      expect((await listedCitedAt(name, ayah)).markedWords, `the ${name} Iltifat cited at ${ayah}'s Marked Words`).toEqual(tableOf(table));
    });

    step("the answer lists the He → You Iltifat cited at 1:5 with no Marked Words", async () => {
      expect((await listedCitedAt("He → You", "1:5")).markedWords).toEqual([]);
    });

    step("every other Iltifat in the answer has no Marked Words", () => {
      const id = notedOne().row.id;
      const marked = listed().filter((i) => i.id !== id && !(Array.isArray(i.markedWords) && i.markedWords.length === 0)).map((i) => i.id);
      expect(marked, "other Iltifat with Marked Words").toEqual([]);
    });

    step('each Iltifat in the answer has its Marked Words as a list, each a Word location of its Surah, within its run, and the side "from" or "to"', () => {
      const wrong: string[] = [];
      for (const i of listed()) {
        if (!Array.isArray(i.markedWords)) {
          wrong.push(`${i.id}: markedWords is not a list`);
          continue;
        }
        for (const m of i.markedWords as unknown[]) {
          const { location, side } = (m ?? {}) as { location?: unknown; side?: unknown };
          const [s, a] = typeof location === "string" ? location.split(":").map(Number) : [NaN, NaN];
          const ok =
            typeof location === "string" && QURAN_WORDS.has(location) && s === i.surah && a >= i.ayahFrom && a <= i.ayahTo && (side === "from" || side === "to");
          if (!ok) wrong.push(`${i.id}: ${JSON.stringify(m)}`);
        }
      }
      expect(wrong.slice(0, 10), "Marked Words that are no Word of the Iltifat's run, or have no side").toEqual([]);
    });

    // ---------------------------------------------------------------- the database and the revisions

    step("the He → You Iltifat cited at 1:5 is as I noted it, Marked Words and all, with no new Iltifat revision", async () => {
      const n = notedOne();
      expect(await rowById(n.row.id), "the Iltifat").toEqual(n.row);
      expect(await markedNow(n.row.id), "its Marked Words").toEqual(n.marked);
      expect((await revisionsOf(n.row.id)).length, "its Iltifat revisions").toBe(n.revisions);
    });

    step('the He → You Iltifat cited at 1:5 still has the "from" Words {any} and the "to" Words {any}, with one new Iltifat revision', async (_, from: string, to: string) => {
      const n = notedOne();
      expect(await markedNow(n.row.id), "its Marked Words").toEqual(sides(from, to));
      expect((await revisionsOf(n.row.id)).length, "its Iltifat revisions").toBe(n.revisions + 1);
    });

    step("exactly one new Iltifat revision names the He → You Iltifat cited at 1:5", async () => {
      const n = notedOne();
      const added = (await revisionsOf(n.row.id)).slice(n.revisions);
      expect(added.length, "new Iltifat revisions of the He → You Iltifat at 1:5").toBe(1);
      revision = added[0];
    });

    step("that Iltifat revision's author is {string}", (_, author: string) => {
      expect(theRevision().author, "the revision's author").toBe(author);
    });

    step("that Iltifat revision holds, before the save, no Marked Words", () => {
      expect(theRevision().before.markedWords, "the revision's before").toEqual([]);
    });

    step("that Iltifat revision holds, before the save, the Marked Words I noted", () => {
      expect(theRevision().before.markedWords, "the revision's before").toEqual(notedOne().marked);
    });

    step("that Iltifat revision holds, after the save, these Marked Words, in this order:", (_, table: { location: string; side: string }[]) => {
      expect(theRevision().after.markedWords, "the revision's after").toEqual(tableOf(table));
    });
  });

  Scenario('An Admin marks the "from" and "to" Words of the He → You Iltifat at 1:2–5, and the save and the read answer them', () => {});
  Scenario("Every Iltifat that /api/v1/iltifat answers carries its Marked Words, each a Word location and its side", () => {});
  Scenario("The Iltifat revision holds the Marked Words before and after the save", () => {});
  Scenario("A later save without a Word takes it out, and its revision shows the Word going", () => {});
  Scenario("A save made against an older version is refused, and its answer's latest Iltifat carries the Marked Words saved since", () => {});
  ScenarioOutline('A save marking <from> as "from" and <to> as "to" in the He → You Iltifat at 1:2–5 is refused with its reason', () => {});
  ScenarioOutline("A change of run that would leave a Marked Word outside it is refused with the reason, run <from> to <to>", () => {});
  Scenario("A change of run that takes out the Words it would leave outside passes", () => {});
  ScenarioOutline("A save whose Marked Words are <what> is not a save, and changes nothing", () => {});
  Scenario('The Word at 17:1:13 is marked as the "to" of the He → We Iltifat and the "from" of the We → He Iltifat cited at 17:1', () => {});
});
