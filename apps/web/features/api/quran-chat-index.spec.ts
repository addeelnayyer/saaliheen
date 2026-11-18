import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describeFeature, loadFeature, type StepTest } from "@amiceli/vitest-cucumber";
import { expect } from "vitest";
import { openAiEmbedder } from "../../src/quran-chat/embeddings.ts";
import { searchQuranChatSources, type QuranChatSource } from "../../src/quran-chat/sources.ts";
import { database, runScript, type Run } from "./support";

const feature = await loadFeature("./quran-chat-index.feature");

type StepFn = Parameters<StepTest["Given"]>[1];

/** The sample in QUL's format: each Ayah key holds { text, ayah_keys } or the key holding its entry. */
type Qul = Record<string, { text: string; ayah_keys: string[] } | string>;
const SAMPLE: Qul = JSON.parse(fs.readFileSync(path.join(__dirname, "tafsir-sample.json"), "utf8"));

/** The sample's text of the Tafsir entry holding Ayah `key`. */
function sampleText(key: string): string {
  const held = SAMPLE[key];
  return typeof held === "string" ? sampleText(held) : held.text;
}

/** Load `qul` as the owner loads QUL's file, with no deployment to refresh. */
function load(qul: Qul, env: Record<string, string> = {}): Promise<Run> {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "tafsir-")), "tafsir.json");
  fs.writeFileSync(file, JSON.stringify(qul));
  return runScript("db:load-tafsir", [file], env);
}

/** The Ayahs `range` names: "2:3–4" is 2:3 and 2:4; "2:3 and 2:4" and "2:3 or 2:4" name theirs. */
function ayahsOf(range: string): string[] {
  const whole = /^(\d+):(\d+)–(\d+)$/.exec(range.trim());
  if (whole) {
    const [, surah, first, last] = whole.map(Number);
    return Array.from({ length: last - first + 1 }, (_, i) => `${surah}:${first + i}`);
  }
  return range.split(/,\s*|\s+and\s+|\s+or\s+/).map((key) => key.trim());
}

const LANGUAGES: Record<string, string> = { English: "en", Urdu: "ur" };

describeFeature(feature, ({ Scenario, BeforeEachScenario, defineSteps }) => {
  let run: Run | undefined;
  let asked = "";
  let found: QuranChatSource[] = [];

  const ask = async (question: string) => {
    const embedder = openAiEmbedder();
    if (!embedder) throw new Error("no OPENAI_API_KEY: ./serve-api.ts names the fake OpenAI");
    asked = question;
    found = await searchQuranChatSources(database(), embedder, question);
  };

  BeforeEachScenario(async () => {
    run = undefined;
    asked = "";
    found = [];
    await database().query(`delete from tafsir_entry`);
    const loaded = await load(SAMPLE);
    expect(loaded.ok, loaded.output).toBe(true);
  });

  const ran = () => {
    if (!run) throw new Error("nothing run yet in this scenario");
    return run;
  };
  const first = () => {
    expect(found.length, `something found for "${asked}"`).toBeGreaterThan(0);
    return found[0];
  };

  /** Expect the run to have succeeded, its index embedding `embedded` sources and dropping `dropped`. */
  const expectIndexed = (embedded: number, dropped: number) => {
    const { ok, output } = ran();
    expect(ok, output).toBe(true);
    expect(output).toContain(`Quran Chat's index: ${embedded} ${embedded === 1 ? "source" : "sources"} embedded, ${dropped} dropped`);
  };

  /** Expect the first source found to be `language`'s Tafsir entry for `range`, its text `text`. */
  const expectFirstTafsirEntry = (language: string, range: string, text: string) => {
    const ayahs = ayahsOf(range);
    expect(first()).toMatchObject({ kind: "tafsir-entry", language: LANGUAGES[language], ayahs, text });
  };

  defineSteps((keywords) => {
    const step = (text: string, fn: StepFn) => {
      for (const define of [keywords.Given, keywords.When, keywords.Then, keywords.And, keywords.But]) define(text, fn);
    };

    step("I ask Quran Chat's sources {string}", (_, question: string) => ask(question));

    step("I ask Quran Chat's sources the sample's text of the Tafsir entry for {any}", (_, key: string) => ask(sampleText(key)));

    for (const language of Object.keys(LANGUAGES)) {
      step(`the {int} sources found first include the ${language} Ayah translations of {any}`, (_, count: number, keys: string) => {
        const firsts = found.slice(0, count).map((s) => ({ kind: s.kind, language: s.language, ayahs: s.ayahs }));
        expect(firsts).toEqual(expect.arrayContaining(ayahsOf(keys).map((key) => ({ kind: "ayah-translation", language: LANGUAGES[language], ayahs: [key] }))));
      });
    }

    step("I run `pnpm db:migrate` again", async () => {
      run = await runScript("db:migrate");
    });

    step("I run `pnpm db:index-quran-chat`", async () => {
      run = await runScript("db:index-quran-chat");
    });

    for (const prefix of ["it succeeds", "the load succeeds"]) {
      step(`${prefix}, saying Quran Chat's index embedded {int} sources and dropped {int}`, (_, embedded: number, dropped: number) => expectIndexed(embedded, dropped));
      step(`${prefix}, saying Quran Chat's index embedded {int} source and dropped {int}`, (_, embedded: number, dropped: number) => expectIndexed(embedded, dropped));
    }

    step("the first source found is the {any} Tafsir entry for {any}, with that text", (_, language: string, range: string) => {
      // "2:3–4, pointing to 2:3 and 2:4" names the entry's Ayahs twice: the range is the entry's.
      expectFirstTafsirEntry(language, range.split(", pointing to ")[0], asked);
    });

    step("the first source found is the {any} Tafsir entry for {any}, with the text {string}", (_, language: string, range: string, text: string) =>
      expectFirstTafsirEntry(language, range, text),
    );

    step("no other source found is a Tafsir entry for {any}", (_, keys: string) => {
      const ayahs = ayahsOf(keys);
      const others = found.slice(1).filter((s) => s.kind === "tafsir-entry" && s.ayahs.some((key) => ayahs.includes(key)));
      expect(others).toEqual([]);
    });

    step("no source found has that text", () => {
      expect(found.filter((s) => s.text === asked)).toEqual([]);
    });

    step("no source found is a Tafsir entry", () => {
      expect(found.filter((s) => s.kind === "tafsir-entry")).toEqual([]);
    });

    step("I load the sample with the text of {any} changed to {string}", async (_, key: string, text: string) => {
      run = await load({ ...SAMPLE, [key]: { text, ayah_keys: [key] } });
    });

    step("I load the sample without OPENAI_API_KEY, with the text of {any} changed to {string}", async (_, key: string, text: string) => {
      run = await load({ ...SAMPLE, [key]: { text, ayah_keys: [key] } }, { OPENAI_API_KEY: "" });
    });

    step("I load a file in QUL's format holding only the sample's entries for Surah 108", async () => {
      run = await load(Object.fromEntries(Object.entries(SAMPLE).filter(([key]) => key.startsWith("108:"))));
    });

    step("the load succeeds, saying Quran Chat's index was not updated", () => {
      const { ok, output } = ran();
      expect(ok, output).toBe(true);
      expect(output).toContain("Quran Chat's index not updated");
    });

    step(
      "the owner has put the Urdu Tafsir entries {string} for 108:1 and {string} for 108:2–3 into Neon",
      async (_, first: string, second: string) => {
        await database().query(
          `insert into tafsir_entry (language, surah, first_ayah, last_ayah, text) values ('ur', 108, 1, 1, $1), ('ur', 108, 2, 3, $2)`,
          [first, second],
        );
      },
    );
  });

  Scenario("Every Ayah translation is indexed in both Languages, and a question finds the Ayahs about it", () => {});
  Scenario("`pnpm db:migrate` run again embeds nothing", () => {});
  Scenario("A Tafsir entry for several Ayahs is indexed once, pointing to each of its Ayahs", () => {});
  Scenario("Reloading the Tafsir indexes its changed entries and drops its old text", () => {});
  Scenario("An entry a reload leaves out is dropped from the index", () => {});
  Scenario("The Tafsir's bold and italic markup is not part of what is indexed", () => {});
  Scenario("The Urdu Tafsir the owner puts into Neon is indexed by `pnpm db:index-quran-chat`", () => {});
  Scenario("Without OPENAI_API_KEY a reload loads the Tafsir and says the index was left as it was", () => {});
});
