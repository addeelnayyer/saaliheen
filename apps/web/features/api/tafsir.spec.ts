import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describeFeature, loadFeature, type StepTest } from "@amiceli/vitest-cucumber";
import { expect } from "vitest";
import { TAFSIR_RELOAD_SECRET } from "../site/admin-settings.ts";
import { baseURL, database, runScript, send, type Answer, type Run } from "./support";

const feature = await loadFeature("./tafsir.feature");

type StepFn = Parameters<StepTest["Given"]>[1];

/** The sample in QUL's format: each Ayah key holds { text, ayah_keys } or the key holding its entry. */
type Qul = Record<string, { text: string; ayah_keys: string[] } | string>;
const SAMPLE: Qul = JSON.parse(fs.readFileSync(path.join(__dirname, "tafsir-sample.json"), "utf8"));

/** The table `pnpm db:migrate` makes for the Tafsir, written into directly only as the owner puts the Urdu edition in. */
const TABLE = "tafsir_entry";

/** Load `qul` as the owner loads QUL's file, refreshing the site under test. */
async function load(qul: Qul): Promise<Run> {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "tafsir-")), "tafsir.json");
  fs.writeFileSync(file, JSON.stringify(qul));
  return runScript("db:load-tafsir", [file, baseURL()], { TAFSIR_RELOAD_SECRET });
}

/** Ask the site to refresh the Tafsir of `surahs` (every Surah when none are named), sending `secret`. */
const refresh = (secret: string | undefined, surahs?: number[]) =>
  send("POST", "/api/v1/tafsir/reloads", secret === undefined ? {} : { authorization: `Bearer ${secret}` }, JSON.stringify(surahs ? { surahs } : {}));

/** A Tafsir entry as the endpoint answers it. */
interface Entry {
  firstAyah: number;
  lastAyah: number;
  text: string;
}

describeFeature(feature, ({ Scenario, ScenarioOutline, BeforeEachScenario, defineSteps }) => {
  let answer: Answer | undefined;
  /** The address last asked for. */
  let asked = "";
  let run: Run | undefined;
  let noted: Answer[] = [];

  BeforeEachScenario(async () => {
    answer = undefined;
    run = undefined;
    noted = [];
    await database().query(`delete from ${TABLE}`);
    expect((await refresh(TAFSIR_RELOAD_SECRET)).status, "every Surah's Tafsir refreshed").toBe(200);
  });

  const answered = () => {
    if (!answer) throw new Error("no request sent yet in this scenario");
    return answer;
  };
  const ran = () => {
    if (!run) throw new Error("nothing run yet in this scenario");
    return run;
  };
  const body = () => answered().json as { surah: unknown; language: unknown; credit: string; entries: Entry[] };
  const readBoth = (lang: string) => Promise.all([2, 108].map((surah) => send("GET", `/api/v1/tafsir/${surah}?lang=${lang}`, {})));

  defineSteps((keywords) => {
    const step = (text: string, fn: StepFn) => {
      for (const define of [keywords.Given, keywords.When, keywords.Then, keywords.And, keywords.But]) define(text, fn);
    };

    step("I run `pnpm db:migrate` again", async () => {
      run = await runScript("db:migrate");
    });

    step("it succeeds, running no content migration", () => {
      const { ok, output } = ran();
      expect(ok, output).toBe(true);
      expect(output).toContain("0 content migrations run");
    });

    step("I have loaded the sample", async () => {
      const loaded = await load(SAMPLE);
      expect(loaded.ok, loaded.output).toBe(true);
    });

    step("I load the sample again", async () => {
      run = await load(SAMPLE);
    });

    step("I load a file in QUL's format holding only the sample's entries for Surah 108", async () => {
      run = await load(Object.fromEntries(Object.entries(SAMPLE).filter(([key]) => key.startsWith("108:"))));
    });

    step("I load the sample with the text of 108:1 changed to {string}", async (_, text: string) => {
      run = await load({ ...SAMPLE, "108:1": { text, ayah_keys: ["108:1"] } });
      expect(run.ok, run.output).toBe(true);
    });

    step("I load the sample with 2:4 pointing to {string}", async (_, key: string) => {
      run = await load({ ...SAMPLE, "2:4": key });
    });

    step("the load succeeds", () => {
      expect(ran().ok, ran().output).toBe(true);
    });

    step("the load fails, naming {string}", (_, key: string) => {
      const { ok, output } = ran();
      expect(ok, output).toBe(false);
      expect(output).toContain(key);
    });

    step("I have read the Tafsir of Surahs 2 and 108 in {string} and noted the answers", async (_, lang: string) => {
      noted = await readBoth(lang);
      for (const read of noted) expect(read.status, read.text.slice(0, 200)).toBe(200);
    });

    step("the Tafsir of Surahs 2 and 108 in {string} is answered as noted", async (_, lang: string) => {
      const now = await readBoth(lang);
      expect(now.map((read) => read.json)).toEqual(noted.map((read) => read.json));
    });

    step(
      "the owner has put Urdu Tafsir entries for Surah 108 into Neon, 108:1 alone and 108:2–3 together, and refreshed it",
      async () => {
        await database().query(
          `insert into ${TABLE} (language, surah, first_ayah, last_ayah, text) values ('ur', 108, 2, 3, 'An Urdu entry for 108:2–3'), ('ur', 108, 1, 1, 'An Urdu entry for 108:1')`,
        );
        expect((await refresh(TAFSIR_RELOAD_SECRET, [108])).status).toBe(200);
      },
    );

    step("I GET {string} with neither cookie nor token", async (_, url: string) => {
      asked = url;
      answer = await send("GET", url, {});
    });

    step("I ask the site to refresh every Surah's Tafsir {any}", async (_, without: string) => {
      const secrets: Record<string, string | undefined> = {
        "without the secret": undefined,
        "with a secret not its own": `${TAFSIR_RELOAD_SECRET}-not`,
      };
      expect(Object.keys(secrets)).toContain(without);
      answer = await refresh(secrets[without]);
    });

    step("the API answers {int} with JSON", (_, status: number) => {
      const { status: got, headers, text } = answered();
      expect(got, `the API's answer: ${text.slice(0, 200)}`).toBe(status);
      expect(headers.get("content-type"), "a JSON answer").toMatch(/^application\/json\b/);
    });

    step("the API answers {int} with a JSON error", (_, status: number) => {
      const { status: got, headers, text, json } = answered();
      expect(got, `the API's answer: ${text.slice(0, 200)}`).toBe(status);
      expect(headers.get("content-type"), "a JSON answer").toMatch(/^application\/json\b/);
      expect(typeof (json as { error?: unknown } | undefined)?.error, "an error named in the answer's `error`").toBe("string");
    });

    step("the answer holds exactly a surah, a language, a credit and its entries", () => {
      expect(Object.keys(body()).sort()).toEqual(["credit", "entries", "language", "surah"]);
      for (const entry of body().entries) expect(Object.keys(entry).sort()).toEqual(["firstAyah", "lastAyah", "text"]);
    });

    step("the answer is for Surah {int} in {string}", (_, surah: number, lang: string) => {
      expect(body().surah).toBe(surah);
      expect(body().language).toBe(lang);
    });

    step("the answer is for the Surah and Language asked for", () => {
      const [, surah, lang] = /^\/api\/v1\/tafsir\/(\d+)\?lang=(\w+)$/.exec(asked)!;
      expect(body().surah).toBe(Number(surah));
      expect(body().language).toBe(lang);
    });

    step("the answer lists no Tafsir entries", () => {
      expect(body().entries).toEqual([]);
    });

    step("the answer's entries are, in this order:", (_, table: { first: string; last: string; "text begins": string }[]) => {
      const { entries } = body();
      expect(entries.map((e) => [e.firstAyah, e.lastAyah])).toEqual(table.map((row) => [Number(row.first), Number(row.last)]));
      entries.forEach((entry, i) => expect(entry.text.startsWith(table[i]["text begins"]), entry.text.slice(0, 80)).toBe(true));
    });

    step("the answer's entries cover, in this order:", (_, table: { first: string; last: string }[]) => {
      expect(body().entries.map((e) => [e.firstAyah, e.lastAyah])).toEqual(table.map((row) => [Number(row.first), Number(row.last)]));
    });

    step("each entry's text is the sample's text for it, exactly", () => {
      const { surah, entries } = body();
      for (const entry of entries) {
        const held = SAMPLE[`${surah}:${entry.firstAyah}`];
        expect(typeof held === "object" && held.text, `the sample's entry at ${surah}:${entry.firstAyah}`).toBe(entry.text);
      }
    });

    step("the answer's first entry's text is {string}", (_, text: string) => {
      expect(body().entries[0]?.text).toBe(text);
    });

    step("the credit line names al-Mukhtasar and its English edition", () => {
      expect(body().credit).toMatch(/al-Mukhtasar/);
      expect(body().credit).toMatch(/English/);
    });

    step("the credit line names al-Mukhtasar and its Urdu edition", () => {
      expect(body().credit).toMatch(/al-Mukhtasar/);
      expect(body().credit).toMatch(/Urdu/);
    });

    step("the answer names the minimum app version in its Min-App-Version header", () => {
      expect(answered().headers.get("min-app-version"), "the Min-App-Version header").toMatch(/^\d+\.\d+\.\d+$/);
    });
  });

  Scenario("`pnpm db:migrate` made the Tafsir's table, and running it again changes nothing", () => {});
  Scenario("A loaded Surah's Tafsir entries are answered in order, a grouped entry once, with the edition's credit line", () => {});
  Scenario("Loading the same file again leaves the same Tafsir", () => {});
  Scenario("A load replaces the English Tafsir with its file's, exactly", () => {});
  Scenario("A reload reaches readers with no deploy", () => {});
  Scenario("A file that breaks QUL's format is refused whole, and the Tafsir is left as it was", () => {});
  ScenarioOutline("A Surah with no Tafsir entries in <lang> answers an empty list", () => {});
  Scenario("The Urdu Tafsir, put into Neon by the owner, is answered as the English is", () => {});
  ScenarioOutline("GET /api/v1/tafsir/<surah> is not a Surah, and gets the API's usual error", () => {});
  ScenarioOutline('A Language that is not "en" or "ur" (<query>) is refused with the API\'s usual error', () => {});
  ScenarioOutline("Refreshing the Tafsir is refused <without>", () => {});
});
