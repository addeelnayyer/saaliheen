import { describeFeature, loadFeature } from "@amiceli/vitest-cucumber";
import { expect } from "vitest";
import {
  INDOPAK,
  JUZ_META,
  buildFromCommittedSources,
  juzListOf,
  readSource,
  wordAt,
  type Juz,
  type JuzMeta,
  type JuzScript,
  type TextSource,
} from "./support";

const feature = await loadFeature("./juz.feature");

const scriptOf = (name: string): JuzScript => {
  if (name === "Uthmani") return "uthmani";
  if (name === "Indo-Pak") return "indopak";
  throw new Error(`unknown Script ${name}`);
};

/** The ۞ sign QPC Hafs writes before the Word a Hizb starts at. */
const HIZB_SIGN = "۞";

describeFeature(feature, ({ Background, Scenario, ScenarioOutline, BeforeAllScenarios }) => {
  const built = buildFromCommittedSources;
  const madinah = readSource<JuzMeta>(JUZ_META);
  const madinahStart = (n: number) => madinah[String(n)].first_verse_key;
  /** Every Ayah of the built dataset, in order, as "s:a". */
  let ayahIds: string[] | undefined;
  const ayahs = () =>
    (ayahIds ??= built().dataset.surahs.flatMap((s) => s.ayahs.map((a) => `${s.number}:${a.number}`)));

  BeforeAllScenarios(() => {
    built();
  });

  Background(({ Given }) => {
    Given("the dataset is built from the committed sources", () => {
      expect(built().dataset.surahs.length).toBeGreaterThan(0);
    });
  });

  let list: Juz[] = [];
  const juz = (n: number) => {
    const found = list.find((j) => j.number === n);
    expect(found, `Juz ${n} is in the list`).toBeDefined();
    return found!;
  };
  const read = (script: JuzScript) => {
    list = juzListOf(built(), script);
  };
  const oneToThirty = Array.from({ length: 30 }, (_, k) => k + 1);

  Scenario("The Uthmani Juz are QUL's Madinah Juz", ({ When, Then, And }) => {
    When("I read the Uthmani Juz list", () => read("uthmani"));
    Then("it holds Juz 1 to 30 in order", () => {
      expect(list.map((j) => j.number)).toEqual(oneToThirty);
    });
    And("each Juz's first and last Ayah are the ones QUL's Madinah Juz file gives it", () => {
      for (const j of list) {
        const meta = madinah[String(j.number)];
        expect({ firstAyah: j.firstAyah, lastAyah: j.lastAyah }, `Uthmani Juz ${j.number}`).toEqual({
          firstAyah: meta.first_verse_key,
          lastAyah: meta.last_verse_key,
        });
      }
    });
  });

  Scenario("The Indo-Pak Juz start where Saaliheen's Indo-Pak Juz start", ({ When, Then, And }) => {
    const differing = new Set<number>();
    When("I read the Indo-Pak Juz list", () => read("indopak"));
    Then("it holds Juz 1 to 30 in order", () => {
      expect(list.map((j) => j.number)).toEqual(oneToThirty);
    });
    And(
      "these Juz start at these Ayahs, unlike QUL's Madinah Juz",
      (_, table: { juz: string; firstAyah: string }[]) => {
        for (const row of table) differing.add(Number(row.juz));
        for (const row of table) {
          const n = Number(row.juz);
          expect(row.firstAyah, `Madinah Juz ${n} starts elsewhere`).not.toBe(madinahStart(n));
          expect(juz(n).firstAyah, `Indo-Pak Juz ${n}`).toBe(row.firstAyah);
        }
      },
    );
    And("every other Juz starts at the Ayah QUL's Madinah Juz file starts it", () => {
      const others = oneToThirty.filter((n) => !differing.has(n));
      expect(others).toHaveLength(23);
      for (const n of others) expect(juz(n).firstAyah, `Indo-Pak Juz ${n}`).toBe(madinahStart(n));
    });
  });

  ScenarioOutline("The <Script> Juz cover the Quran end to end", ({ When, Then, And }, { Script }) => {
    When("I read the <Script> Juz list", () => read(scriptOf(Script)));
    Then("Juz 1 starts at {string} and Juz 30 ends at {string}", (_, first: string, last: string) => {
      expect(juz(1).firstAyah).toBe(first);
      expect(juz(30).lastAyah).toBe(last);
    });
    And("each Juz ends at the Ayah just before the next Juz starts", () => {
      for (const n of oneToThirty.slice(0, -1)) {
        const next = ayahs().indexOf(juz(n + 1).firstAyah);
        expect(next, `Juz ${n + 1}'s first Ayah is an Ayah`).toBeGreaterThan(0);
        expect(juz(n).lastAyah, `${Script} Juz ${n}'s last Ayah`).toBe(ayahs()[next - 1]);
      }
    });
    And("together the Juz hold all {int} Ayahs, each once", (_, count: number) => {
      const held = list.flatMap((j) => ayahs().slice(ayahs().indexOf(j.firstAyah), ayahs().indexOf(j.lastAyah) + 1));
      expect(held).toHaveLength(count);
      expect(held).toEqual(ayahs());
    });
  });

  ScenarioOutline("Each <Script> Juz is named by its opening words in <Script>", ({ When, Then, And }, { Script }) => {
    const script = scriptOf(Script);
    When("I read the <Script> Juz list", () => read(script));
    Then("each Juz's name is the opening Words of its first Ayah in the <Script> text, joined by spaces", () => {
      expect(list).toHaveLength(30);
      for (const j of list) {
        const [s, a] = j.firstAyah.split(":").map(Number);
        const words = built()
          .dataset.surahs[s - 1].ayahs[a - 1].words.map((w) => w[script].replaceAll(HIZB_SIGN, "").trim())
          .filter((w) => w !== "");
        const openings = words.map((_, k) => words.slice(0, k + 1).join(" "));
        expect(openings, `${Script} Juz ${j.number}'s name "${j.name}" opens Ayah ${j.firstAyah}`).toContain(j.name);
      }
    });
    And("no Juz's name carries the ۞ sign that marks where a Hizb starts", () => {
      for (const j of list) expect(j.name.includes(HIZB_SIGN), `${Script} Juz ${j.number}'s name`).toBe(false);
    });
  });

  Scenario("Uthmani Juz 23 runs 36:28 to 39:31", ({ When, Then, And }) => {
    When("I read the Uthmani Juz list", () => read("uthmani"));
    Then("Juz 23 runs from {string} to {string}", (_, first: string, last: string) => {
      expect({ firstAyah: juz(23).firstAyah, lastAyah: juz(23).lastAyah }).toEqual({ firstAyah: first, lastAyah: last });
    });
    And("Juz 23's name starts with the Uthmani text of Word {string}", (_, location: string) => {
      const first = wordAt(built(), location).uthmani.replaceAll(HIZB_SIGN, "").trim();
      expect(juz(23).name.startsWith(first)).toBe(true);
    });
  });

  Scenario("Indo-Pak Juz 23 starts at 36:22 and is named وَمَا لِيَ", ({ When, Then, And }) => {
    const indopak = readSource<TextSource>(INDOPAK);
    When("I read the Indo-Pak Juz list", () => read("indopak"));
    Then("Juz 23 starts at {string}", (_, first: string) => {
      expect(juz(23).firstAyah).toBe(first);
    });
    And("Juz 23 is named {string}", (_, name: string) => {
      expect(juz(23).name).toBe(name);
    });
    And(
      "that name is the Indo-Pak text of Words {string} and {string}, joined by a space",
      (_, first: string, second: string) => {
        expect(juz(23).name).toBe(`${indopak[first].text} ${indopak[second].text}`);
      },
    );
  });
});
