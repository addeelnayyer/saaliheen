import { execFile } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { describeFeature, loadFeature, type StepTest } from "@amiceli/vitest-cucumber";
import { expect } from "vitest";
import { testDatabase } from "../site/test-database.ts";
import { credentialHeaders, database, send, type Answer } from "./support";

const feature = await loadFeature("./allah-references.feature");

type StepFn = Parameters<StepTest["Given"]>[1];

/** The endpoint of Surah `surah`'s Allah references. */
const ENDPOINT = (surah: number | string) => `/api/v1/allah-references/${surah}`;

/** The two tables of Allah references (ADR 0014), as Better Auth's schema names them. */
const REFERENCES = "allahReference";
const REVISIONS = "allahReferenceRevision";

/** Every Surah these scenarios arrange, emptied before and after each scenario so no other feature meets their rows. */
const ARRANGED = [2, 59, 108, 114];

/** Who an Admin's revision names as its author here: a publish names the Admin's Account id. */
const ADMIN = "admin-of-issue-150";

/** The website's own directory, where its scripts run. */
const WEB = path.join(__dirname, "..", "..");

/** Run the seed the owner runs, `pnpm db:seed-allah-references <file>`, against the run's own Postgres. */
async function runSeed(file: string): Promise<{ ok: boolean; output: string }> {
  const env = { ...process.env, DATABASE_URL: testDatabase(Number(process.env.PORT)).url };
  try {
    const { stdout, stderr } = await promisify(execFile)("pnpm", ["run", "--silent", "db:seed-allah-references", file], { cwd: WEB, env, encoding: "utf8" });
    return { ok: true, output: `${stdout}\n${stderr}` };
  } catch (error) {
    const { stdout = "", stderr = "", message } = error as { stdout?: string; stderr?: string; message: string };
    return { ok: false, output: `${stdout}\n${stderr}\n${message}` };
  }
}

/** Empty Surahs `surahs` of Allah references and Allah reference revisions. */
async function empty(surahs: number[]) {
  await database().query(`delete from "${REFERENCES}" where surah = any($1::int[])`, [surahs]);
  await database().query(`delete from "${REVISIONS}" where surah = any($1::int[])`, [surahs]);
}

/** Every Word location written in `text` (`s:a:w`), in the order written. */
const locationsIn = (text: string | undefined): string[] => text?.match(/\d+:\d+:\d+/g) ?? [];

/**
 * Write an Admin's Allah reference revision of Surah `surah`, as a publish
 * writes one (ADR 0014): the Word locations it adds and removes, and one
 * revision made against the Surah's current version, moving it one version on.
 */
async function writeRevision(surah: number, added: string[], removed: string[]) {
  const client = await database().connect();
  try {
    await client.query("begin");
    const { rows } = await client.query(`select coalesce(max(version), 0) as version from "${REVISIONS}" where surah = $1`, [surah]);
    const base = Number(rows[0].version);
    await client.query(`delete from "${REFERENCES}" where location = any($1::text[])`, [removed]);
    await client.query(
      `insert into "${REFERENCES}" (id, location, surah) select gen_random_uuid()::text, l, $2 from unnest($1::text[]) as l`,
      [added, surah],
    );
    await client.query(
      `insert into "${REVISIONS}" (id, surah, author, "createdAt", added, removed, base, version)
       values (gen_random_uuid()::text, $1, $2, now(), $3::jsonb, $4::jsonb, $5, $6)`,
      [surah, ADMIN, JSON.stringify(added), JSON.stringify(removed), base, base + 1],
    );
    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

/** A Word location's Surah, Ayah and Word numbers. */
const numbersOf = (location: string) => location.split(":").map(Number);

/** Whether Word location `a` comes before `b` in Quran order: by Surah, then Ayah, then Word. */
function before(a: string, b: string): boolean {
  const [x, y] = [numbersOf(a), numbersOf(b)];
  const at = x.findIndex((n, i) => n !== y[i]);
  return at >= 0 && x[at] < y[at];
}

/** What an answer of the endpoint holds. */
interface SurahAnswer {
  surah: unknown;
  version: unknown;
  locations: unknown;
}

describeFeature(feature, ({ Scenario, ScenarioOutline, BeforeEachScenario, AfterEachScenario, defineSteps }) => {
  /** The API's last answer. */
  let answer: Answer | undefined;
  /** An answer a step noted, to compare after. */
  let noted: unknown;
  /** The answers to a request for every Surah, by Surah. */
  let every: Map<number, Answer> | undefined;

  BeforeEachScenario(async () => {
    answer = undefined;
    noted = undefined;
    every = undefined;
    await empty(ARRANGED);
  });
  AfterEachScenario(async () => {
    await empty(ARRANGED);
  });

  const answered = () => {
    if (!answer) throw new Error("no request sent yet in this scenario");
    return answer;
  };
  const body = () => answered().json as SurahAnswer;
  const answeredLocations = () => {
    const { locations } = body();
    expect(Array.isArray(locations), `the answer's locations, a list: ${answered().text.slice(0, 200)}`).toBe(true);
    return locations as unknown[];
  };
  const everyAnswer = () => {
    if (!every) throw new Error("no Surah's Allah references read yet in this scenario");
    return every;
  };

  /** Expect `got` to hold exactly a surah, a version and its locations. */
  const holdsExactlySurahVersionLocations = (got: unknown, what: string) => {
    expect(typeof got, `${what}, a JSON object`).toBe("object");
    expect(Object.keys(got as object).sort(), `${what}'s fields`).toEqual(["locations", "surah", "version"]);
  };

  // Each step reads the same under any keyword, so it is defined under all of them.
  defineSteps((keywords) => {
    const step = (text: string, fn: StepFn) => {
      for (const define of [keywords.Given, keywords.When, keywords.Then, keywords.And, keywords.But]) define(text, fn);
    };

    step("the seed has loaded a file of Allah references holding, in this order:", async (_, table: { location: string }[]) => {
      const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "allah-references-")), "allah-references.json");
      fs.writeFileSync(file, JSON.stringify(table.map((row) => row.location)));
      const { ok, output } = await runSeed(file);
      expect(ok, `the seed ran: ${output}`).toBe(true);
    });

    step("Surah {int} holds no Allah references and no Allah reference revision", async (_, surah: number) => {
      await empty([surah]);
    });

    step("an Admin's Allah reference revision of Surah {int} has {any}", async (_, surah: number, change: string) => {
      const match = /^(?:added (.+?))?(?:(?:^| and )removed (.+))?$/.exec(change);
      if (!match) throw new Error(`no change named "${change}"`);
      await writeRevision(surah, locationsIn(match[1]), locationsIn(match[2]));
    });

    step("I GET {string} with {any}", async (_, url: string, credential: string) => {
      answer = await send("GET", url, credentialHeaders(credential));
    });

    step("I have read the Allah references of Surah {int} and noted the answer", async (_, surah: number) => {
      const read = await send("GET", ENDPOINT(surah), {});
      expect(read.status, `the API's answer: ${read.text.slice(0, 200)}`).toBe(200);
      noted = read.json;
    });

    step("the API answers {int} with JSON", (_, status: number) => {
      const { status: got, headers, text, json } = answered();
      expect(got, `the API's answer: ${text.slice(0, 200)}`).toBe(status);
      expect(headers.get("content-type"), "a JSON answer").toMatch(/^application\/json\b/);
      expect(typeof json, "a JSON object").toBe("object");
    });

    step("the API answers {int} with a JSON error", (_, status: number) => {
      const { status: got, headers, text, json } = answered();
      expect(got, `the API's answer: ${text.slice(0, 200)}`).toBe(status);
      expect(headers.get("content-type"), "a JSON answer").toMatch(/^application\/json\b/);
      expect(typeof (json as { error?: unknown } | undefined)?.error, "an error named in the answer's `error`").toBe("string");
    });

    step("the answer holds exactly a surah, a version and its locations", () => {
      holdsExactlySurahVersionLocations(answered().json, "the answer");
    });

    step("the answer is for Surah {int}, at version {int}", (_, surah: number, version: number) => {
      expect({ surah: body().surah, version: body().version }, answered().text.slice(0, 200)).toEqual({ surah, version });
    });

    step("the answer's Word locations are, in this order:", (_, table: { location: string }[]) => {
      expect(answeredLocations()).toEqual(table.map((row) => row.location));
    });

    step("the answer lists no Word locations", () => {
      expect(answeredLocations()).toEqual([]);
    });

    step("the answer's version is not the one noted", () => {
      expect(typeof body().version, "the answer's version, a number").toBe("number");
      expect(body().version, "the version noted before the change").not.toBe((noted as SurahAnswer | undefined)?.version);
    });

    step("the answer is the one noted", () => {
      expect(answered().json).toEqual(noted);
    });

    step("the answer names the minimum app version in its Min-App-Version header", () => {
      expect(answered().headers.get("min-app-version"), "the Min-App-Version header").toMatch(/^\d+\.\d+\.\d+$/);
    });

    step("that minimum app version is the one {string} names, {string}", async (_, manifestPath: string, version: string) => {
      const manifest = await send("GET", manifestPath, {});
      expect(manifest.status).toBe(200);
      const named = (manifest.json as { minAppVersion?: unknown }).minAppVersion;
      expect(named, `${manifestPath}'s minimum app version`).toBe(version);
      expect(answered().headers.get("min-app-version")).toBe(named);
    });

    step("I GET the Allah references of every Surah from 1 to 114 with neither cookie nor token", async () => {
      const surahs = Array.from({ length: 114 }, (_, i) => i + 1);
      every = new Map(await Promise.all(surahs.map(async (surah) => [surah, await send("GET", ENDPOINT(surah), {})] as const)));
    });

    step("each answer is 200, holding exactly a surah, a version and its locations", () => {
      for (const [surah, got] of everyAnswer()) {
        expect(got.status, `Surah ${surah}'s answer: ${got.text.slice(0, 200)}`).toBe(200);
        holdsExactlySurahVersionLocations(got.json, `Surah ${surah}'s answer`);
      }
    });

    step("each answer is for the Surah asked for, at a version that is a whole number of 0 or more", () => {
      for (const [surah, got] of everyAnswer()) {
        const { surah: named, version } = got.json as SurahAnswer;
        expect(named, `Surah ${surah}'s answer names its Surah`).toBe(surah);
        expect(Number.isInteger(version) && (version as number) >= 0, `Surah ${surah}'s version, ${JSON.stringify(version)}`).toBe(true);
      }
    });

    step("each answer's Word locations are Word locations of that Surah, in Quran order, none twice", () => {
      for (const [surah, got] of everyAnswer()) {
        const locations = (got.json as SurahAnswer).locations as unknown[];
        expect(Array.isArray(locations), `Surah ${surah}'s locations, a list`).toBe(true);
        const strangers = locations.filter((l) => typeof l !== "string" || !new RegExp(`^${surah}:[1-9]\\d*:[1-9]\\d*$`).test(l));
        expect(strangers, `Surah ${surah}'s answer lists only Word locations of Surah ${surah}`).toEqual([]);
        const outOfOrder = (locations as string[]).filter((l, i) => i > 0 && !before(locations[i - 1] as string, l));
        expect(outOfOrder, `Surah ${surah}'s Word locations out of Quran order, or twice`).toEqual([]);
      }
    });
  });

  Scenario("A seeded Surah's Allah references are answered in Quran order, with the seed's version", () => {});
  Scenario("After an Admin's revision, a Surah's answer is at that revision's version", () => {});
  Scenario("Every Surah from 1 to 114 answers its own number, a version, and Word locations of that Surah only, in Quran order", () => {});
  Scenario("A Surah that has never held Allah references answers an empty list, at version 0", () => {});
  Scenario("A Surah whose every Allah reference an Admin's revision removed answers an empty list, at that revision's version", () => {});
  ScenarioOutline("GET /api/v1/allah-references/<surah> is not a Surah, and gets the API's usual error", () => {});
  ScenarioOutline("With <credential>, a Surah's Allah references are answered all the same", () => {});
  Scenario("An Admin's revision adding an Allah reference moves the Surah's version, and the answer shows it at once", () => {});
  Scenario("An Admin's revision removing an Allah reference moves the Surah's version again, and the answer shows it at once", () => {});
  Scenario("A change to another Surah's Allah references leaves this Surah's answer as it was", () => {});
});
