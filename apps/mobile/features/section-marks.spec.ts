import { describeFeature, loadFeature } from "@amiceli/vitest-cucumber";
import { expect } from "vitest";
import { me } from "../src/destinations.ts";
import type { QuranAnalysis, Script, SurahScreen } from "../src/quran-analysis.ts";
import { openReadingPlaces } from "../src/reading-places.ts";
import { World, datasetSurah, datasetSurahIndex, languageCode, scriptCode, wordCardsOf } from "./support.ts";

const feature = await loadFeature("./section-marks.feature");

/** The reader's choice, as the website stores it (#194): "hizb" for Hizb quarters, "ruku" for Rukus. */
type Choice = "hizb" | "ruku";
const STORED_AS = "qwt-section-marks";
const choiceOf = (mode: string): Choice => {
  if (mode === "Hizb quarters") return "hizb";
  if (mode === "Rukus") return "ruku";
  throw new Error(`no Section marks mode named "${mode}"`);
};

/** What the app offers for Section marks (#194), looked up loosely so the features compile before the app has it, and fail on this assertion instead. */
interface SectionMarksSetting {
  sectionMarks(): Promise<Choice>;
  setSectionMarks(choice: Choice): Promise<Choice>;
}
function setting(app: QuranAnalysis): SectionMarksSetting {
  const s = app as QuranAnalysis & Partial<SectionMarksSetting>;
  expect(typeof s.sectionMarks, "the app reads the Section marks setting (sectionMarks)").toBe("function");
  expect(typeof s.setSectionMarks, "the app keeps the Section marks setting (setSectionMarks)").toBe("function");
  return s as SectionMarksSetting;
}

/** A Section mark as the screen shows it: the Ayah it stands above, its medallion sign and its label. */
interface SeenMark {
  above: number;
  sign: string;
  label: string;
}
interface ScreenItem {
  kind: string;
  number?: number;
  sign?: string;
  label?: string;
}
/** Each Section mark on `screen`, with the Ayah it stands above: the first Ayah after it, past a Passage heading at most. */
function marksOn(screen: SurahScreen): SeenMark[] {
  const items = screen.items as ScreenItem[];
  return items.flatMap((item, k) => {
    if (item.kind !== "section-mark") return [];
    const next = items[k + 1]?.kind === "passage-heading" ? items[k + 2] : items[k + 1];
    expect(next?.kind, `the Section mark "${item.label}" stands directly above an Ayah or its Passage heading`).toBe("ayah");
    return [{ above: next!.number!, sign: item.sign!, label: item.label! }];
  });
}

/** A Surah file's marks of one mode (`sectionMarks` in its /data/v1 Surah file), looked up loosely. */
function fileMarks(surah: number, choice: Choice): SeenMark[] {
  const marks = (datasetSurah(surah) as unknown as { sectionMarks?: Record<"hizbQuarters" | "rukus", { ayah: number; label: string }[]> }).sectionMarks;
  expect(marks, `Surah ${surah}'s /data/v1 Surah file carries its Section marks (sectionMarks)`).toBeDefined();
  const list = choice === "hizb" ? marks!.hizbQuarters : marks!.rukus;
  return list.map((m) => ({ above: m.ayah, sign: choice === "hizb" ? "۞" : "ع", label: m.label }));
}

const rowsOf = (table: { above: string; sign: string; label: string }[]): SeenMark[] =>
  table.map((r) => ({ above: Number(r.above), sign: r.sign, label: r.label }));

describeFeature(feature, ({ Background, Scenario, ScenarioOutline, BeforeAllScenarios, AfterAllScenarios }) => {
  const world = new World();
  BeforeAllScenarios(() => world.start());
  AfterAllScenarios(() => world.close());

  Background(({ Given }) => {
    Given("the app is launched on a new device", () => {
      world.launch();
    });
  });

  const open = async (surah: number, script: Script, language: string) => {
    world.screen = await world.app.surah(surah, { script, language: languageCode(language), ayahTranslation: false });
  };
  const choose = async (mode: string) => {
    expect(await setting(world.app).setSectionMarks(choiceOf(mode))).toBe(choiceOf(mode));
  };
  const screen = () => {
    expect(world.screen, "a Surah's screen is open").toBeDefined();
    return world.screen!;
  };

  ScenarioOutline(
    'On a new device, Surah 63 in <Script> marks its Hizb quarter "¼ Hizb 56" above Ayah 63:4, and no Ruku',
    ({ When, Then, And }, { Script }) => {
      When("I open Surah 63 in the <Script> Script and English", () => open(63, scriptCode(Script), "English"));
      Then("the Section marks setting is Hizb quarters", async () => {
        expect(await setting(world.app).sectionMarks()).toBe("hizb");
      });
      And("Surah 63 shows exactly these Section marks", (_, table: { above: string; sign: string; label: string }[]) => {
        expect(marksOn(screen())).toEqual(rowsOf(table));
      });
    },
  );

  ScenarioOutline(
    "With Rukus chosen, Surah 63 in <Script> marks its Rukus above 63:1 and 63:9, above their Passage headings",
    ({ Given, When, Then, And }, { Script }) => {
      Given("I choose Rukus for Section marks", () => choose("Rukus"));
      When("I open Surah 63 in the <Script> Script and English", () => open(63, scriptCode(Script), "English"));
      Then("Surah 63 shows exactly these Section marks", (_, table: { above: string; sign: string; label: string }[]) => {
        expect(marksOn(screen())).toEqual(rowsOf(table));
      });
      And("each of Surah 63's Section marks stands above the Passage heading at its Ayah, where there is one", () => {
        const items = screen().items as ScreenItem[];
        for (const passage of datasetSurah(63).passages) {
          const ayah = items.findIndex((i) => i.kind === "ayah" && i.number === passage.from);
          expect(items[ayah - 1]?.kind, `the item directly above Ayah 63:${passage.from}`).toBe("passage-heading");
          const mark = fileMarks(63, "ruku").some((m) => m.above === passage.from);
          if (mark) expect(items[ayah - 2]?.kind, `the item above 63:${passage.from}'s Passage heading`).toBe("section-mark");
        }
      });
    },
  );

  ScenarioOutline(
    "In <Mode> mode, every Section mark of Surah <Surah> is the one its /data/v1 Surah file gives, in both Scripts",
    ({ Given, When, Then }, { Mode, Surah }) => {
      const surah = Number(Surah);
      const expectFile = () => expect(marksOn(screen())).toEqual(fileMarks(surah, choiceOf(Mode)));
      Given("I choose <Mode> for Section marks", () => choose(Mode));
      When("I open Surah <Surah> in the Uthmani Script and Urdu", () => open(surah, "uthmani", "Urdu"));
      Then("Surah <Surah> shows exactly the <Mode> marks of its /data/v1 Surah file, each directly above its Ayah or that Ayah's Passage heading", expectFile);
      When("I open Surah <Surah> in the Indo-Pak Script and English", () => open(surah, "indopak", "English"));
      Then("in Indo-Pak too, Surah <Surah> shows exactly the <Mode> marks of its /data/v1 Surah file, each directly above its Ayah or that Ayah's Passage heading", expectFile);
    },
  );

  Scenario("The choice is kept on the device: after the app is launched again, Rukus are still chosen", ({ Given, When, Then, And }) => {
    Given("I choose Rukus for Section marks", () => choose("Rukus"));
    When("the app is launched again on the same device", () => {
      world.launch(world.device);
    });
    Then("the Section marks setting is Rukus", async () => {
      expect(await setting(world.app).sectionMarks()).toBe("ruku");
    });
    And('the device keeps "ruku" under "qwt-section-marks"', async () => {
      expect(await world.device.getItem(STORED_AS)).toBe("ruku");
    });
    When("I open Surah 63 in the Uthmani Script and English", () => open(63, "uthmani", "English"));
    Then('Surah 63 shows a Section mark "Ruku 2 of 2 · 3 Ayahs" above Ayah 63:9', () => {
      expect(marksOn(screen())).toContainEqual({ above: 9, sign: "ع", label: "Ruku 2 of 2 · 3 Ayahs" });
    });
    When("I choose Hizb quarters for Section marks", () => choose("Hizb quarters"));
    And("I open Surah 63 in the Uthmani Script and English", () => open(63, "uthmani", "English"));
    Then("Surah 63 shows exactly these Section marks", (_, table: { above: string; sign: string; label: string }[]) => {
      expect(marksOn(screen())).toEqual(rowsOf(table));
    });
  });

  Scenario("The Word cards of Surah 63 show no printed ۞", ({ When, Then, And }) => {
    When("I open Surah 63 in the Uthmani Script and English", () => open(63, "uthmani", "English"));
    Then("no Word card of Surah 63 holds ۞", () => {
      expect(wordCardsOf(screen()).filter((c) => c.arabic.includes("۞")).map((c) => c.location)).toEqual([]);
    });
    And("the Word card at 63:4:1 shows the Uthmani text its /data/v1 Surah file gives", () => {
      const card = wordCardsOf(screen()).find((c) => c.location === "63:4:1");
      expect(card?.arabic).toBe(datasetSurah(63).ayahs[3].words[0].uthmani);
    });
  });

  Scenario("Me offers the Section marks setting after the sizes", ({ When, Then }) => {
    let labels: string[] = [];
    When("I open the Me tab", async () => {
      const surahName = (n: number) => datasetSurahIndex().find((s) => s.number === n)!.nameLatin;
      const screen = await me({ origin: world.data.origin, device: world.device, readingPlaces: openReadingPlaces(world.device), surahName });
      labels = screen.entries.map((e) => e.label);
    });
    Then('Me offers a "Section marks" setting, after "Meaning size" and before "Credits"', () => {
      expect(labels).toContain("Section marks");
      expect(labels.indexOf("Section marks"), "Section marks comes right after Meaning size").toBe(labels.indexOf("Meaning size") + 1);
      expect(labels.indexOf("Section marks")).toBeLessThan(labels.indexOf("Credits"));
    });
  });
});
