import fs from "node:fs";
import path from "node:path";
import { describeFeature, loadFeature, type StepTest } from "@amiceli/vitest-cucumber";
import { expect } from "vitest";
import { credentialHeaders, send, type Answer } from "./support";

// Every Iltifat as the mobile app reads them (#139): GET /api/v1/iltifat over
// HTTP against the production build and the run's Postgres, which db:migrate
// loaded with the catalogue (#138). Expected values other than the counts are
// read from the catalogue committed as the data migration's frozen input.

const feature = await loadFeature("./iltifat-read.feature");

const APP = path.resolve(import.meta.dirname, "../..");
const CATALOGUE = path.join(APP, "data/iltifat/quran_iltifat_person_shifts_2.json");

type Person = "first" | "second" | "third";
interface CatalogueEntry {
  surah: number;
  ayah_from: number;
  ayah_to: number;
  from_person: Person;
  to_person: Person;
  reason: string;
  attestation_status: "well_attested" | "disputed";
  verse_url: string;
}

/** The four Iltifat directions, as the glossary writes them, by their slugs and persons, in the overview's order. */
const DIRECTIONS: { name: string; slug: string; persons: [Person, Person] }[] = [
  { name: "He → We", slug: "he-to-we", persons: ["third", "first"] },
  { name: "We → He", slug: "we-to-he", persons: ["first", "third"] },
  { name: "He → You", slug: "he-to-you", persons: ["third", "second"] },
  { name: "You → He", slug: "you-to-he", persons: ["second", "third"] },
];
const nameOfSlug = (slug: unknown) => DIRECTIONS.find((d) => d.slug === slug)?.name ?? `unknown direction ${String(slug)}`;
const slugOfName = (name: string) => {
  const found = DIRECTIONS.find((d) => d.name === name);
  if (!found) throw new Error(`no Iltifat direction named "${name}"`);
  return found.slug;
};
const slugOfPersons = (from: Person, to: Person) =>
  DIRECTIONS.find((d) => d.persons[0] === from && d.persons[1] === to)?.slug ?? `${from}-to-${to}`;

/** An Iltifat as the answer gives it. */
interface Listed {
  id: number;
  direction: string;
  surah: number;
  ayahFrom: number;
  ayahTo: number;
  citedAyah: number;
  reason: string;
  disputed: boolean;
  markedWords: unknown[];
}
interface Count {
  direction: string;
  counted: number;
  disputed: number;
}

const runOf = (i: { surah: number; ayahFrom: number; ayahTo: number }) =>
  i.ayahFrom === i.ayahTo ? `${i.surah}:${i.ayahFrom}` : `${i.surah}:${i.ayahFrom}–${i.ayahTo}`;
/** An Iltifat as a scenario names it: "He → We 17:1". */
const named = (i: { direction: string; surah: number; ayahFrom: number; ayahTo: number }) => `${nameOfSlug(i.direction)} ${runOf(i)}`;

/** The catalogue's entries, in the answer's shape less its id and Marked Words: read once. */
const CATALOGUE_ENTRIES = (() => {
  const { entries } = JSON.parse(fs.readFileSync(CATALOGUE, "utf8")) as { entries: CatalogueEntry[] };
  return entries.map((e) => ({
    direction: slugOfPersons(e.from_person, e.to_person),
    surah: e.surah,
    ayahFrom: e.ayah_from,
    ayahTo: e.ayah_to,
    citedAyah: Number(new URL(e.verse_url).searchParams.get("verse")),
    reason: e.reason,
    disputed: e.attestation_status === "disputed",
  }));
})();
type Fields = (typeof CATALOGUE_ENTRIES)[number];
const fieldsOf = (i: Listed): Fields => ({
  direction: i.direction,
  surah: i.surah,
  ayahFrom: i.ayahFrom,
  ayahTo: i.ayahTo,
  citedAyah: i.citedAyah,
  reason: i.reason,
  disputed: i.disputed,
});
const quranOrder = (a: Fields, b: Fields) => a.surah - b.surah || a.ayahFrom - b.ayahFrom || a.ayahTo - b.ayahTo || a.citedAyah - b.citedAyah;
const fullOrder = (a: Fields, b: Fields) => quranOrder(a, b) || a.direction.localeCompare(b.direction) || a.reason.localeCompare(b.reason);

type StepFn = Parameters<StepTest["Given"]>[1];

describeFeature(feature, ({ Scenario, ScenarioOutline, BeforeEachScenario, defineSteps }) => {
  /** The API's last answer. */
  let answer: Answer | undefined;

  BeforeEachScenario(() => {
    answer = undefined;
  });

  const answered = () => {
    if (!answer) throw new Error("no request sent yet in this scenario");
    return answer;
  };
  const body = () => {
    const json = answered().json as { iltifat?: unknown; counts?: unknown } | undefined;
    expect(json, "the answer is a JSON object").toBeTypeOf("object");
    return json!;
  };
  const listed = () => {
    const list = body().iltifat;
    expect(Array.isArray(list), 'the answer\'s "iltifat" is a list').toBe(true);
    return list as Listed[];
  };
  const counts = () => {
    const list = body().counts;
    expect(Array.isArray(list), 'the answer\'s "counts" is a list').toBe(true);
    return list as Count[];
  };
  /** "Surah:Ayah" of an Iltifat's cited Ayah. */
  const citedAt = (i: { surah: number; citedAyah: number }) => `${i.surah}:${i.citedAyah}`;

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

    // ---------------------------------------------------------------- AC-1

    step("the answer lists {int} Iltifat", (_, count: number) => {
      expect(listed().length, "Iltifat in the answer").toBe(count);
    });

    step(
      "each Iltifat in the answer has an id, an Iltifat direction, a Surah, a run, a cited Ayah, a reason, a Disputed flag and Marked Words",
      () => {
        const slugs = DIRECTIONS.map((d) => d.slug);
        const wrong = listed().filter(
          (i) =>
            !Number.isInteger(i.id) ||
            !slugs.includes(i.direction) ||
            !Number.isInteger(i.surah) ||
            !Number.isInteger(i.ayahFrom) ||
            !Number.isInteger(i.ayahTo) ||
            !Number.isInteger(i.citedAyah) ||
            typeof i.reason !== "string" ||
            i.reason === "" ||
            typeof i.disputed !== "boolean" ||
            !Array.isArray(i.markedWords),
        );
        expect(wrong.slice(0, 3), "Iltifat missing a field, or with one of the wrong kind").toEqual([]);
      },
    );

    step("no two Iltifat in the answer share an id", () => {
      const ids = listed().map((i) => i.id);
      expect(new Set(ids).size, "distinct ids").toBe(ids.length);
    });

    step("the Iltifat in the answer are in Quran order", () => {
      const fields = listed().map(fieldsOf);
      const outOfOrder = fields.slice(1).filter((f, n) => quranOrder(fields[n], f) > 0).map((f) => `${f.surah}:${f.ayahFrom}–${f.ayahTo}`);
      expect(outOfOrder, "Iltifat listed before one that comes earlier in the Quran").toEqual([]);
    });

    step("the Iltifat in the answer are the catalogue's, each with its direction, Surah, run, cited Ayah, reason and Disputed flag", () => {
      const expected = CATALOGUE_ENTRIES.toSorted(fullOrder);
      expect(expected.length, "entries in the catalogue").toBe(326);
      expect(listed().map(fieldsOf).sort(fullOrder)).toEqual(expected);
    });

    step("every Iltifat in the answer has no Marked Words, as the catalogue marks none", () => {
      const marked = listed().filter((i) => !Array.isArray(i.markedWords) || i.markedWords.length > 0).map(named);
      expect(marked, "Iltifat whose Marked Words are not an empty list").toEqual([]);
    });

    // ---------------------------------------------------------------- AC-2

    step("the answer counts these Iltifat by Iltifat direction, in this order:", (_, table: { direction: string; counted: string; disputed: string }[]) => {
      expect(counts()).toEqual(table.map((t) => ({ direction: slugOfName(t.direction), counted: Number(t.counted), disputed: Number(t.disputed) })));
    });

    step("the answer's counts are those of the Iltifat it lists", () => {
      const list = listed();
      const fromList = DIRECTIONS.map(({ slug }) => {
        const of = list.filter((i) => i.direction === slug);
        return { direction: slug, counted: of.filter((i) => !i.disputed).length, disputed: of.filter((i) => i.disputed).length };
      });
      expect(counts()).toEqual(fromList);
    });

    // ---------------------------------------------------------------- AC-3

    step("the answer names the minimum app version in its Min-App-Version header", () => {
      expect(answered().headers.get("min-app-version"), "the Min-App-Version header").toMatch(/^\d+\.\d+\.\d+$/);
    });

    step("that minimum app version is the one {string} names, {string}", async (_, manifestPath: string, version: string) => {
      const manifest = await send("GET", manifestPath, {});
      expect(manifest.status).toBe(200);
      const minAppVersion = (manifest.json as { minAppVersion?: unknown }).minAppVersion;
      expect(minAppVersion, `${manifestPath}'s minimum app version`).toBe(version);
      expect(answered().headers.get("min-app-version")).toBe(minAppVersion);
    });

    // ---------------------------------------------------------------- AC-4

    step("the Iltifat the answer cites at {any} are {any}", (_, ayah: string, cited: string) => {
      const expected = cited === "none" ? [] : cited.split(", ");
      const found = listed().filter((i) => citedAt(i) === ayah).map(named);
      expect(found.sort(), `the Iltifat cited at ${ayah}`).toEqual(expected.sort());
      // What the scenario names is what the catalogue cites there.
      const fromCatalogue = CATALOGUE_ENTRIES.filter((e) => citedAt(e) === ayah).map(named);
      expect(fromCatalogue.sort(), `the catalogue's entries cited at ${ayah}`).toEqual(expected.sort());
    });

    step("for every Ayah the catalogue cites, the Iltifat the answer cites there are the catalogue's entries cited there", () => {
      const byAyah = (list: Fields[]) =>
        Object.fromEntries(Object.entries(Object.groupBy(list, citedAt)).map(([ayah, of]) => [ayah, of!.toSorted(fullOrder)]));
      expect(byAyah(listed().map(fieldsOf))).toEqual(byAyah(CATALOGUE_ENTRIES));
    });
  });

  Scenario("With no Account, GET /api/v1/iltifat answers all 326 Iltifat in Quran order, each with every field", () => {});
  Scenario("The answer counts each Iltifat direction, with its Disputed Iltifat counted apart", () => {});
  Scenario("The answer to GET /api/v1/iltifat names the minimum app version the manifest names", () => {});
  ScenarioOutline("From the answer alone, an app finds the Iltifat cited at <ayah>", () => {});
  Scenario("From the answer alone, an app finds the Iltifat cited at every Ayah the catalogue cites", () => {});
});
