import { describeFeature, loadFeature } from "@amiceli/vitest-cucumber";
import { expect } from "vitest";
import {
  join,
  message,
  moveStart,
  publishable,
  retitle,
  split,
  type Passage,
  type PassageEdit,
} from "@saaliheen/passages";
import { filePassages, parseRange, passageAt, range } from "./passage-support";
import { SURAH_META, metadataAyahCount, readSource, type SurahMeta } from "./support";

const feature = await loadFeature("./passage-edits.feature");

const SURAH = 18;
const R = "(\\d+(?:–\\d+)?)";
const ACTIONS: [RegExp, (m: string[]) => Action][] = [
  [new RegExp(`^retitle ${R} with the Passage titles of ${R}$`), ([, p, q]) => ({ kind: "retitle", p, en: q, ur: q })],
  [
    new RegExp(`^retitle ${R} with the English title of ${R} and its own Urdu title$`),
    ([, p, q]) => ({ kind: "retitle", p, en: q, ur: p }),
  ],
  [
    new RegExp(`^retitle ${R} with the English title of ${R} and no Urdu title$`),
    ([, p, q]) => ({ kind: "retitle", p, en: q, ur: null }),
  ],
  [new RegExp(`^retitle ${R} with its own Passage titles$`), ([, p]) => ({ kind: "retitle", p, en: p, ur: p })],
  [new RegExp(`^split ${R} at (\\d+)$`), ([, p, n]) => ({ kind: "split", p, n: Number(n) })],
  [new RegExp(`^join ${R}$`), ([, p]) => ({ kind: "join", p })],
  [new RegExp(`^move the start of ${R} to (\\d+)$`), ([, p, n]) => ({ kind: "moveStart", p, n: Number(n) })],
];
type Action =
  | { kind: "retitle"; p: string; en: string; ur: string | null }
  | { kind: "split" | "moveStart"; p: string; n: number }
  | { kind: "join"; p: string };

describeFeature(feature, ({ Background, Scenario, ScenarioOutline }) => {
  const ayahCount = () => metadataAyahCount(readSource<SurahMeta>(SURAH_META), SURAH) as number;

  /** Surah 18's Passages as the Passages file has them; never edited. */
  let file: Passage[];
  /** The Passages after the edits so far. */
  let current: Passage[];
  /** The edits so far, in order (no-ops and impossible edits leave none). */
  let edits: PassageEdit[];
  /** The last edit's result, the Passages it was given, and a copy of them taken before it ran. */
  let last: PassageEdit | null | undefined;
  let given: Passage[];
  let givenBefore: Passage[];
  /** The file's Passages the last action named, directly or as the one above. */
  let touched: Passage[];

  const fromFile = (text: string) => passageAt(file, text);
  const fromCurrent = (text: string) => passageAt(current, text);
  /** The Passage above the one starting at `from` in the file, if any. */
  const aboveInFile = (from: number) => file[file.findIndex((p) => p.from === from) - 1];

  function perform(text: string) {
    const found = ACTIONS.map(([re, make]) => [re.exec(text), make] as const).find(([m]) => m);
    expect(found, `no such edit: ${text}`).toBeDefined();
    const [m, make] = found!;
    const action = make([...m!]);
    const { from } = parseRange(action.p);
    const named = file.find((p) => range(p) === action.p);
    touched = [named, action.kind === "join" || action.kind === "moveStart" ? aboveInFile(from) : undefined].filter(
      (p): p is Passage => p !== undefined,
    );
    given = current;
    givenBefore = structuredClone(current);
    switch (action.kind) {
      case "retitle": {
        const own = fromCurrent(action.p);
        const en = fromCurrent(action.en).en;
        const ur = action.ur === null ? "" : action.ur === action.p ? own.ur : fromCurrent(action.ur).ur;
        last = retitle(current, from, en, ur);
        break;
      }
      case "split":
        last = split(current, from, action.n);
        break;
      case "join":
        last = join(current, from);
        break;
      case "moveStart":
        last = moveStart(current, from, action.n);
        break;
    }
    if (last) {
      current = last.passages;
      edits.push(last);
    }
  }

  /** The current Passages with one changed as an outline's <change> says (not an edit: a list as it might arrive). */
  function changed(change: string): Passage[] {
    const m = new RegExp(`^${R} (.+)$`).exec(change);
    expect(m, `unknown change: ${change}`).not.toBeNull();
    const target = fromCurrent(m![1]);
    const how = m![2];
    const p = { ...target };
    let n: RegExpExecArray | null;
    if ((n = /^ending at Ayah (\d+)$/.exec(how))) p.till = Number(n[1]);
    else if ((n = /^starting at Ayah (\d+)$/.exec(how))) p.from = Number(n[1]);
    else if (how === "with no English title") p.en = "";
    else if (how === "with no Urdu title") p.ur = "";
    else if (how === "with an English title of spaces") p.en = "   ";
    else expect.unreachable(`unknown change: ${how}`);
    return current.map((q) => (q === target ? p : q));
  }

  // Steps shared across scenarios.
  const edit = (text: string) => () => perform(text);
  const named = (_: unknown, label: string) => {
    expect(last, "there is no edit").toBeTruthy();
    expect(last!.label).toBe(label);
  };
  const noEdit = () => expect(last).toBeNull();
  const givenUnchanged = () => {
    expect(given).toBeDefined();
    expect(given).toEqual(givenBefore);
  };
  const hasTitlesOf = (target: string, source: string) => () => {
    const { en, ur } = fromFile(source);
    expect(fromCurrent(target)).toMatchObject({ en, ur });
  };
  const hasNoTitles = (target: string) => () => expect(fromCurrent(target)).toMatchObject({ en: "", ur: "" });
  const othersAsInFile = () => {
    const lo = Math.min(...touched.map((p) => p.from));
    const hi = Math.max(...touched.map((p) => p.till));
    const outside = (p: Passage) => p.till < lo || p.from > hi;
    expect(touched.length).toBeGreaterThan(0);
    expect(current.filter(outside)).toEqual(file.filter(outside));
  };
  const coverOnce = (_: unknown, count: number) => {
    expect(ayahCount()).toBe(count);
    const ayahs = current.flatMap((p) => Array.from({ length: p.till - p.from + 1 }, (_, k) => p.from + k));
    expect(ayahs).toEqual(Array.from({ length: count }, (_, k) => k + 1));
  };
  const isPublishable = () => expect(publishable(current, ayahCount())).toBe(true);
  const notPublishable = () => expect(publishable(current, ayahCount())).toBe(false);
  const summaryIs = (_: unknown, text: string) => expect(message(SURAH, edits)).toBe(text);

  Background(({ Given }) => {
    Given("Surah 18's Passages from the Passages file", () => {
      file = filePassages(SURAH);
      expect(file.length).toBeGreaterThan(0);
      current = structuredClone(file);
      edits = [];
      last = undefined;
      touched = [];
    });
  });

  Scenario("Retitling a Passage changes only its Passage titles", ({ When, Then, And }) => {
    When("I retitle 89–91 with the Passage titles of 92–94", edit("retitle 89–91 with the Passage titles of 92–94"));
    Then("the edit is named {string}", named);
    And("89–91 has the Passage titles of 92–94", hasTitlesOf("89–91", "92–94"));
    And("every other Passage is as the Passages file has it", othersAsInFile);
    And("the Passages given to the edit are unchanged", givenUnchanged);
  });

  Scenario("Retitling a Passage in one Language is an edit", ({ When, Then, And }) => {
    When(
      "I retitle 89–91 with the English title of 92–94 and its own Urdu title",
      edit("retitle 89–91 with the English title of 92–94 and its own Urdu title"),
    );
    Then("the edit is named {string}", named);
    And("89–91 has the English title of 92–94 and its own Urdu title", () => {
      expect(fromCurrent("89–91")).toMatchObject({ en: fromFile("92–94").en, ur: fromFile("89–91").ur });
    });
  });

  Scenario("Retitling a Passage with its own Passage titles is no edit", ({ When, Then, And }) => {
    When("I retitle 89–91 with its own Passage titles", edit("retitle 89–91 with its own Passage titles"));
    Then("there is no edit", noEdit);
    And("the Passages given to the edit are unchanged", givenUnchanged);
  });

  ScenarioOutline("Splitting 83–88 at <at>", ({ When, Then, And }, v) => {
    When("I split 83–88 at <at>", () => perform(`split 83–88 at ${v.at}`));
    Then('the edit is named "split 83–88 at <at>"', () => named(undefined, `split 83–88 at ${v.at}`));
    And("<upper> has the Passage titles of 83–88", () => hasTitlesOf(v.upper, "83–88")());
    And("<lower> has no Passage titles", () => hasNoTitles(v.lower)());
    And("every other Passage is as the Passages file has it", othersAsInFile);
    And("the Passages still cover Surah 18's {int} Ayahs once each, in order", coverOnce);
    And("the Passages given to the edit are unchanged", givenUnchanged);
  });

  Scenario("Joining a Passage into the one above", ({ When, Then, And }) => {
    When("I join 92–94", edit("join 92–94"));
    Then("the edit is named {string}", named);
    And("89–94 has the Passage titles of 89–91", hasTitlesOf("89–94", "89–91"));
    And("every other Passage is as the Passages file has it", othersAsInFile);
    And("the Passages still cover Surah 18's {int} Ayahs once each, in order", coverOnce);
    And("the Passages given to the edit are unchanged", givenUnchanged);
  });

  ScenarioOutline("Moving the start of 95–98 to <to>", ({ When, Then, And }, v) => {
    When("I move the start of 95–98 to <to>", () => perform(`move the start of 95–98 to ${v.to}`));
    Then('the edit is named "move start of 95–98 to <to>"', () => named(undefined, `move start of 95–98 to ${v.to}`));
    And("<above> has the Passage titles of 92–94", () => hasTitlesOf(v.above, "92–94")());
    And("<moved> has the Passage titles of 95–98", () => hasTitlesOf(v.moved, "95–98")());
    And("every other Passage is as the Passages file has it", othersAsInFile);
    And("the Passages still cover Surah 18's {int} Ayahs once each, in order", coverOnce);
    And("the Passages given to the edit are unchanged", givenUnchanged);
  });

  ScenarioOutline("An impossible edit is no edit: <edit>", ({ When, Then, And }, v) => {
    When("I <edit>", () => perform(v.edit));
    Then("there is no edit", noEdit);
    And("the Passages given to the edit are unchanged", givenUnchanged);
  });

  Scenario("Surah 18's Passages as the Passages file has them are publishable", ({ Then }) => {
    Then("Surah 18's Passages are publishable", isPublishable);
  });

  Scenario(
    "A split leaves an untitled Passage, which blocks publishing until it has both Passage titles",
    ({ When, Then }) => {
      When("I split 83–88 at 86", edit("split 83–88 at 86"));
      Then("Surah 18's Passages are not publishable", notPublishable);
      When(
        "I retitle 86–88 with the English title of 89–91 and no Urdu title",
        edit("retitle 86–88 with the English title of 89–91 and no Urdu title"),
      );
      Then("Surah 18's Passages are still not publishable", notPublishable);
      When("I retitle 86–88 with the Passage titles of 89–91", edit("retitle 86–88 with the Passage titles of 89–91"));
      Then("Surah 18's Passages are publishable", isPublishable);
    },
  );

  ScenarioOutline("Surah 18's Passages are not publishable with <problem>", ({ Given, Then }, v) => {
    Given("Surah 18's Passages with <problem>: <change>", () => {
      current = changed(v.change);
    });
    Then("Surah 18's Passages are not publishable", notPublishable);
  });

  Scenario(
    "The summary names the Surah and each edit, in order, and leaves out no-ops",
    ({ When, And, Then }) => {
      When("I split 83–88 at 86", edit("split 83–88 at 86"));
      And("I retitle 89–91 with the Passage titles of 92–94", edit("retitle 89–91 with the Passage titles of 92–94"));
      And("I retitle 89–91 with its own Passage titles", edit("retitle 89–91 with its own Passage titles"));
      And("I join 92–94", edit("join 92–94"));
      And("I move the start of 95–98 to 96", edit("move the start of 95–98 to 96"));
      Then("the summary is {string}", summaryIs);
    },
  );

  Scenario("The summary writes a one-Ayah Passage as its Ayah alone", ({ When, And, Then }) => {
    When("I split 83–88 at 88", edit("split 83–88 at 88"));
    And("I join 88", edit("join 88"));
    Then("the summary is {string}", summaryIs);
  });
});
