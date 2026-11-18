import { describeFeature, loadFeature, type StepTest } from "@amiceli/vitest-cucumber";
import { expect } from "vitest";
import { ADMIN_EMAIL } from "../site/admin-settings.ts";
import { credentialHeaders, database, send, signIn, type Answer, type SignedIn } from "./support";

// An Admin's save of an Iltifat (#142, ADR 0023): PUT /api/v1/iltifat/{id}
// over HTTP, as the Iltifat editor sends it, and what the save leaves in the
// run's Postgres: the `iltifat` row, read directly as features/api/iltifat.spec.ts
// reads it, and the Iltifat revisions in `iltifat_revision`, which no endpoint
// answers. Every scenario's Iltifat is the He → You Iltifat the catalogue
// loads at 1:2–5, cited at 1:5; it is found by its persons and run, and put
// back after the scenario through the endpoint, so that the caches the save
// refreshed show the catalogue again to the features that follow.

const feature = await loadFeature("./iltifat-saves.feature");

/** The He → You Iltifat direction, by its slug and persons. */
const HE_TO_YOU = { slug: "he-to-you", from: "third", to: "second" } as const;

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
  created_at: Date;
  base: number;
  version: number;
  before: Record<string, unknown>;
  after: Record<string, unknown>;
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
  section: string;
  version: number;
  markedWords: unknown[];
}
interface Count {
  direction: string;
  counted: number;
  disputed: number;
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

/** The He → You Iltifat of Surah 1 cited at 1:5, whatever its run now. */
async function heToYouCitedAt15(): Promise<Row> {
  const { rows } = await database().query<Row>(
    `select * from iltifat where from_person = $1 and to_person = $2 and surah = 1 and cited_ayah = 5`,
    [HE_TO_YOU.from, HE_TO_YOU.to],
  );
  expect(rows.length, "one He → You Iltifat cited at 1:5 in the database").toBe(1);
  return numeric(rows[0]);
}

/** Whether db:migrate made the table of Iltifat revisions. */
async function hasRevisions(): Promise<boolean> {
  const { rows } = await database().query<{ t: string | null }>(`select to_regclass('public.iltifat_revision')::text as t`);
  return rows[0].t === "iltifat_revision";
}

/** Every Iltifat revision of Iltifat `id`, oldest first. */
async function revisionsOf(id: number): Promise<Revision[]> {
  expect(await hasRevisions(), "db:migrate made the table `iltifat_revision`").toBe(true);
  const { rows } = await database().query<Revision>(`select * from iltifat_revision where iltifat_id = $1 order by version, created_at`, [id]);
  return rows.map((r) => ({ ...r, iltifat_id: Number(r.iltifat_id), base: Number(r.base), version: Number(r.version) }));
}
const revisionCount = async (id: number) => ((await hasRevisions()) ? (await revisionsOf(id)).length : 0);

/** A run as the feature writes it, "1:3–6", as its first and last Ayah of Surah 1. */
function runOf(run: string): { ayahFrom: number; ayahTo: number } {
  const m = run.match(/^1:(\d+)(?:[–-](\d+))?$/);
  if (!m) throw new Error(`"${run}" is no run of Surah 1`);
  return { ayahFrom: Number(m[1]), ayahTo: Number(m[2] ?? m[1]) };
}

/** The Iltifat a row holds, as the API answers it, Marked Words aside. */
const answeredOf = (r: Row) => ({
  id: r.id,
  direction: HE_TO_YOU.slug,
  surah: r.surah,
  ayahFrom: r.ayah_from,
  ayahTo: r.ayah_to,
  citedAyah: r.cited_ayah,
  reason: r.reason,
  disputed: r.disputed,
  section: r.section,
  version: r.version,
});

/** What the editor sends: the whole editable state, its Marked Words (#143) and its base. */
interface SaveBody {
  base: number;
  reason: string;
  ayahFrom: number;
  ayahTo: number;
  disputed: boolean;
  markedWords: { location: string; side: "from" | "to" }[];
}
const bodyOf = (r: Row, change: Partial<SaveBody> = {}): SaveBody => ({
  base: r.version,
  reason: r.reason,
  ayahFrom: r.ayah_from,
  ayahTo: r.ayah_to,
  disputed: r.disputed,
  markedWords: [],
  ...change,
});

/** Text a reader sees in a slice of served HTML: tags and comments taken out, spaces squashed. */
const textOf = (html: string) =>
  html
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();

type StepFn = Parameters<StepTest["Given"]>[1];

describeFeature(feature, ({ Scenario, ScenarioOutline, BeforeEachScenario, AfterEachScenario, defineSteps }) => {
  let answer: Answer | undefined;
  let signedIn: SignedIn | undefined;
  /** The Iltifat as noted, and how many revisions it had then. */
  let noted: Row | undefined;
  let notedRevisions = 0;
  let notedCount: Count | undefined;
  /** The revision the scenario's save wrote. */
  let revision: Revision | undefined;

  BeforeEachScenario(() => {
    answer = signedIn = noted = notedCount = revision = undefined;
    notedRevisions = 0;
  });

  // Put the noted Iltifat back through the endpoint, so the caches its save refreshed show the catalogue again.
  AfterEachScenario(async () => {
    if (!noted) return;
    const now = await heToYouCitedAt15();
    const same = now.reason === noted.reason && now.ayah_from === noted.ayah_from && now.ayah_to === noted.ayah_to && now.disputed === noted.disputed;
    if (same) return;
    const admin = await signIn(ADMIN_EMAIL);
    const back = await send("PUT", `/api/v1/iltifat/${noted.id}`, credentialHeaders("session cookie", admin), JSON.stringify(bodyOf(noted, { base: now.version })));
    expect(back.status, `the He → You Iltifat at 1:2–5 is put back (${back.text.slice(0, 200)})`).toBe(200);
  });

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
  const notedRow = () => {
    if (!noted) throw new Error("no Iltifat noted in this scenario");
    return noted;
  };
  const save = async (credential: string, body: SaveBody) => {
    answer = await send("PUT", `/api/v1/iltifat/${notedRow().id}`, credentialHeaders(credential, signedIn), JSON.stringify(body));
  };
  const newRevisions = async () => (await revisionsOf(notedRow().id)).slice(notedRevisions);
  const heToYouCount = () => {
    const counts = json().counts as Count[] | undefined;
    expect(Array.isArray(counts), 'the answer\'s "counts" is a list').toBe(true);
    const c = counts!.find((x) => x.direction === HE_TO_YOU.slug);
    expect(c, "the He → You count").toBeDefined();
    return c!;
  };

  defineSteps((keywords) => {
    const step = (text: string, fn: StepFn) => {
      for (const define of [keywords.Given, keywords.When, keywords.Then, keywords.And, keywords.But]) define(text, fn);
    };

    // ---------------------------------------------------------------- arranging

    step("I note the He → You Iltifat at 1:2–5 and its Iltifat revisions", async () => {
      noted = await heToYouCitedAt15();
      expect(`${noted.surah}:${noted.ayah_from}–${noted.ayah_to}`, "the catalogue's run of the He → You Iltifat cited at 1:5").toBe("1:2–5");
      expect(noted.disputed, "the He → You Iltifat at 1:2–5 is not Disputed in the catalogue").toBe(false);
      notedRevisions = await revisionCount(noted.id);
    });

    step("I am signed in as {string}", async (_, email: string) => {
      signedIn = await signIn(email);
    });

    step("the He → You Iltifat at 1:2–5 has been saved since I noted it, with the reason {string}", async (_, reason: string) => {
      const res = await send("PUT", `/api/v1/iltifat/${notedRow().id}`, credentialHeaders("session cookie", signedIn), JSON.stringify(bodyOf(notedRow(), { reason })));
      expect(res.status, `the earlier save passes (${res.text.slice(0, 200)})`).toBe(200);
    });

    // ---------------------------------------------------------------- saving

    step("I save the He → You Iltifat at 1:2–5 with the reason {string} and its own version, with {any}", async (_, reason: string, credential: string) => {
      await save(credential, bodyOf(await heToYouCitedAt15(), { reason }));
    });

    step("I save the He → You Iltifat at 1:2–5 with a blank reason, {any}, and its own version, with {any}", async (_, blank: string, credential: string) => {
      const reason = ({ empty: "", "five spaces only": "     " } as Record<string, string>)[blank];
      expect(reason, `a blank reason named "${blank}"`).toBeDefined();
      await save(credential, bodyOf(await heToYouCitedAt15(), { reason }));
    });

    step("I save the He → You Iltifat cited at 1:5 with the reason {string} and its own version, with {any}", async (_, reason: string, credential: string) => {
      await save(credential, bodyOf(await heToYouCitedAt15(), { reason }));
    });

    step("I save the He → You Iltifat cited at 1:5 with the reason {string} and its noted version, with {any}", async (_, reason: string, credential: string) => {
      await save(credential, bodyOf(await heToYouCitedAt15(), { reason, base: notedRow().version }));
    });

    step(
      "I save the He → You Iltifat at 1:2–5 with the reason {string}, the run {any}, Disputed, and its own version, with {any}",
      async (_, reason: string, run: string, credential: string) => {
        await save(credential, bodyOf(await heToYouCitedAt15(), { reason, ...runOf(run), disputed: true }));
      },
    );

    step("I save the He → You Iltifat at 1:2–5 with the run from Ayah {any} to Ayah {any} and its own version, with {any}", async (_, from: string, to: string, credential: string) => {
      await save(credential, bodyOf(await heToYouCitedAt15(), { ayahFrom: Number(from), ayahTo: Number(to) }));
    });

    step("I send {any} {string} with {any}", async (_, method: string, path: string, credential: string) => {
      const body = method === "DELETE" ? undefined : JSON.stringify({ base: 1, reason: "A reason.", ayahFrom: 1, ayahTo: 1, disputed: false, markedWords: [] });
      answer = await send(method, path, credentialHeaders(credential, signedIn), body);
    });

    step("I GET {string} with {any}", async (_, url: string, credential: string) => {
      answer = await send("GET", url, credentialHeaders(credential, signedIn));
      expect(answer.status, `GET ${url}`).toBe(200);
    });

    // ---------------------------------------------------------------- the answer

    // {any}, not {int}: an outline's <status> must match it before its Examples fill it in.
    step("the answer's status is {any}", (_, status: string) => {
      expect(answered().status, `the answer's status (${answered().text.slice(0, 200)})`).toBe(Number(status));
    });

    step("the second answer's status is {int} too", (_, status: number) => {
      expect(answered().status, `the second answer's status (${answered().text.slice(0, 200)})`).toBe(status);
    });

    step("the answer has an error", () => {
      const error = json().error;
      expect(typeof error === "string" && error.trim() !== "", 'the answer says what is wrong in "error"').toBe(true);
    });

    step("the answer's error is {string}", (_, error: string) => {
      expect(json().error, 'the answer\'s "error"').toBe(error);
    });

    step("the answer's Iltifat is the He → You Iltifat cited at 1:5, with the reason {string}, the run {any} and Disputed", (_, reason: string, run: string) => {
      const n = notedRow();
      expect(answeredIltifat()).toMatchObject({ id: n.id, direction: HE_TO_YOU.slug, surah: 1, citedAyah: 5, section: n.section, reason, ...runOf(run), disputed: true, markedWords: [] });
    });

    step("the answer's Iltifat has its noted version plus one", () => {
      expect(answeredIltifat().version, "the saved Iltifat's version").toBe(notedRow().version + 1);
    });

    step("the answer's Iltifat has the reason {string} and its noted version plus one", (_, reason: string) => {
      expect(answeredIltifat()).toMatchObject({ id: notedRow().id, reason, version: notedRow().version + 1 });
    });

    step("the answer lists the He → You Iltifat cited at 1:5 with the reason {string} and Disputed", (_, reason: string) => {
      const listed = (json().iltifat as Answered[]).find((i) => i.id === notedRow().id);
      expect(listed, "the Iltifat in /api/v1/iltifat").toMatchObject({ direction: HE_TO_YOU.slug, citedAyah: 5, reason, disputed: true });
    });

    // A read before the save, so the caches the save must refresh hold the Iltifat from before it.
    step("a reader has read {string}", async (_, url: string) => {
      answer = await send("GET", url, credentialHeaders("neither cookie nor token"));
      expect(answer.status, `GET ${url}`).toBe(200);
    });

    step("a reader has read {string}, and I note its He → You count", async (_, url: string) => {
      answer = await send("GET", url, credentialHeaders("neither cookie nor token"));
      expect(answer.status, `GET ${url}`).toBe(200);
      notedCount = heToYouCount();
    });

    step("the answer's He → You count has one Iltifat fewer counted and one more Disputed than I noted", () => {
      if (!notedCount) throw new Error("no count noted");
      expect(heToYouCount()).toEqual({ direction: HE_TO_YOU.slug, counted: notedCount.counted - 1, disputed: notedCount.disputed + 1 });
    });

    step("the page served holds the reason {string} in the entry of the Iltifat cited at 1:5", (_, reason: string) => {
      const html = answered().text;
      const at = html.indexOf(`id="iltifat-${notedRow().id}"`);
      expect(at, `the page has the element iltifat-${notedRow().id}`).toBeGreaterThan(-1);
      const start = html.lastIndexOf("<article", at);
      const end = html.indexOf("</article>", at);
      expect(textOf(html.slice(start, end))).toContain(reason);
    });

    step("the page served gives Ayah 1:5 an Iltifat chip that says Disputed", () => {
      const html = answered().text;
      const at = html.indexOf('<section id="1:5"');
      expect(at, "the page has Ayah 1:5").toBeGreaterThan(-1);
      const section = html.slice(at, html.indexOf("</section>", at));
      const href = `href="/en/iltifat/${HE_TO_YOU.slug}#iltifat-${notedRow().id}"`;
      const chipAt = section.indexOf(href);
      expect(chipAt, "Ayah 1:5 has the chip of the He → You Iltifat").toBeGreaterThan(-1);
      expect(textOf(section.slice(section.lastIndexOf("<a", chipAt), section.indexOf("</a>", chipAt)))).toContain("Disputed");
    });

    // ---------------------------------------------------------------- the database

    step("the He → You Iltifat at 1:2–5 is as I noted it, with no new Iltifat revision", async () => {
      expect(await heToYouCitedAt15(), "the Iltifat").toEqual(notedRow());
      expect(await revisionCount(notedRow().id), "its Iltifat revisions").toBe(notedRevisions);
    });

    step(
      "the He → You Iltifat cited at 1:5 in the database has the reason {string}, the run {any}, Disputed, and its noted version plus one",
      async (_, reason: string, run: string) => {
        const { ayahFrom, ayahTo } = runOf(run);
        expect(await heToYouCitedAt15()).toMatchObject({ reason, ayah_from: ayahFrom, ayah_to: ayahTo, disputed: true, version: notedRow().version + 1 });
      },
    );

    step("the He → You Iltifat cited at 1:5 in the database has the reason {string} and its noted version plus one", async (_, reason: string) => {
      expect(await heToYouCitedAt15()).toMatchObject({ reason, version: notedRow().version + 1 });
    });

    step("the He → You Iltifat cited at 1:5 in the database has the reason {string} and its noted version plus two", async (_, reason: string) => {
      expect(await heToYouCitedAt15()).toMatchObject({ reason, version: notedRow().version + 2 });
    });

    step("the He → You Iltifat cited at 1:5 in the database has the run {any}", async (_, run: string) => {
      const { ayahFrom, ayahTo } = runOf(run);
      expect(await heToYouCitedAt15()).toMatchObject({ ayah_from: ayahFrom, ayah_to: ayahTo });
    });

    step("its Surah, Iltifat direction, cited Ayah and Abdel Haleem section are as I noted them", async () => {
      const { id, from_person, to_person, surah, cited_ayah, section } = notedRow();
      expect(await heToYouCitedAt15()).toMatchObject({ id, from_person, to_person, surah, cited_ayah, section });
    });

    step("the database still holds {int} Iltifat", async (_, count: number) => {
      const { rows } = await database().query<{ n: number }>(`select count(*)::int as n from iltifat`);
      expect(rows[0].n).toBe(count);
    });

    // ---------------------------------------------------------------- Iltifat revisions

    step("exactly one new Iltifat revision names the He → You Iltifat cited at 1:5", async () => {
      const added = await newRevisions();
      expect(added.length, "new Iltifat revisions of the He → You Iltifat at 1:5").toBe(1);
      revision = added[0];
    });

    step(
      "exactly {int} new Iltifat revisions name the He → You Iltifat cited at 1:5, their versions the noted version plus one and plus two",
      async (_, count: number) => {
        const added = await newRevisions();
        expect(added.length, "new Iltifat revisions").toBe(count);
        const v = notedRow().version;
        expect(added.map((r) => [r.base, r.version])).toEqual([
          [v, v + 1],
          [v + 1, v + 2],
        ]);
      },
    );

    const theRevision = () => {
      if (!revision) throw new Error("no Iltifat revision found yet in this scenario");
      return revision;
    };

    step("that Iltifat revision's author is {string}, made within the last minute", (_, author: string) => {
      expect(theRevision().author, "the revision's author").toBe(author);
      const age = Date.now() - new Date(theRevision().created_at).getTime();
      expect(age >= -5_000 && age < 60_000, `the revision was made ${age} ms ago`).toBe(true);
    });

    step("that Iltifat revision's base is the noted version and its version the noted version plus one", () => {
      expect([theRevision().base, theRevision().version]).toEqual([notedRow().version, notedRow().version + 1]);
    });

    step("that Iltifat revision holds the Iltifat before the save as I noted it", () => {
      expect(theRevision().before, "the revision's before").toMatchObject(answeredOf(notedRow()));
    });

    step("that Iltifat revision holds the Iltifat after the save, with the reason {string}, the run {any} and Disputed", (_, reason: string, run: string) => {
      expect(theRevision().after, "the revision's after").toMatchObject({
        ...answeredOf(notedRow()),
        reason,
        ...runOf(run),
        disputed: true,
        version: notedRow().version + 1,
      });
    });
  });

  ScenarioOutline("A save with <credential> is refused <status>, and changes nothing", () => {});
  Scenario("An Admin changes the reason, the run within its Surah and the Disputed tag, and the save passes", () => {});
  Scenario("A save writes exactly one Iltifat revision, naming the Admin, with the Iltifat before and after", () => {});
  Scenario("A save through the bearer token passes too, and each save moves the version on by one", () => {});
  Scenario("After a save, /api/v1/iltifat, the direction page and the Surah's chip show it at once", () => {});
  ScenarioOutline("A save made against an older version is refused, with the latest Iltifat, through the <credential>", () => {});
  ScenarioOutline("A save whose reason is <blank> is refused", () => {});
  ScenarioOutline("A save of the run from Ayah <from> to Ayah <to> for the Iltifat cited at 1:5 is refused", () => {});
  Scenario("A run of the whole Surah, still holding the cited Ayah, is a run within the Surah", () => {});
  ScenarioOutline("An Admin's <method> of <path> is answered <status>, and adds or deletes no Iltifat", () => {});
});
