import { readFileSync } from "node:fs";
import { describeFeature, loadFeature, type StepTest } from "@amiceli/vitest-cucumber";
import { expect } from "vitest";
import type { Language, Script } from "../src/quran-analysis.ts";
import { openReadingPlaces, type DeviceReadingPlaces, type ReadingPlace, type SurahVisit } from "../src/reading-places.ts";
import {
  chipRowOffset,
  EDIT_STRIP_CHIP,
  openSharePage,
  shareRequestOfLink,
  SHARE_AYAHS_START,
  type SharePage,
  type ShareSheet,
  type ShareLayout,
} from "../src/share.ts";
import { Device, World, ayahRange, datasetSurah, datasetSurahIndex, languageCode, scriptCode } from "./support.ts";

const feature = await loadFeature("./sharing-ayahs.feature");

type StepFn = Parameters<StepTest["Given"]>[1];

/** The production site every Share page link points to, as on the website (#53). */
const SITE = "https://saaliheen.com";

/** "2:255" or "2:255–257" (an en dash, or a hyphen) as a Surah and its from and to Ayahs. */
function sharedIn(text: string) {
  const m = /^(\d+):(\d+)(?:[–-](\d+))?$/.exec(text.trim());
  if (!m) throw new Error(`not Shared Ayahs: ${text}`);
  const from = Number(m[2]);
  return { surah: Number(m[1]), from, to: m[3] === undefined ? from : Number(m[3]) };
}

/** "Ayah by Ayah" or "Flowing" as a Share layout. */
function layoutCode(name: string): ShareLayout {
  const code = ({ "Ayah by Ayah": "ayah-by-ayah", Flowing: "flowing" } as const)[name.trim() as "Ayah by Ayah" | "Flowing"];
  if (!code) throw new Error(`no Share layout ${name}`);
  return code;
}

/** "English and Uthmani" or "English and Uthmani, Flowing" as a Language, a Script and a Share layout (null when none is named). */
function openIn(text: string): { lang: Language; script: Script; layout: ShareLayout | null } {
  const m = /^(\S+) and ([^,]+)(?:, (.+))?$/.exec(text.trim());
  if (!m) throw new Error(`not "<Language> and <Script>[, <layout>]": ${text}`);
  return { lang: languageCode(m[1]), script: scriptCode(m[2]), layout: m[3] === undefined ? null : layoutCode(m[3]) };
}

/** "255 to 264" or "24 to 33, and 36" as the Ayah numbers it names. */
function ayahsNamed(text: string): number[] {
  const m = /^(\d+) to (\d+)(?:, and (\d+))?$/.exec(text.trim());
  if (!m) throw new Error(`not "<from> to <to>[, and <n>]": ${text}`);
  const run = Array.from({ length: Number(m[2]) - Number(m[1]) + 1 }, (_, k) => Number(m[1]) + k);
  return m[3] === undefined ? run : [...run, Number(m[3])];
}

/** The path of the Share page of these Shared Ayahs, as the website addresses it: /<lang>/share/<surah>/<from>[-<to>]/<script>[/flowing]. */
const sharePath = (lang: Language, script: Script, surah: number, from: number, to: number, layout: ShareLayout | null) =>
  `/${lang}/share/${surah}/${from === to ? from : `${from}-${to}`}/${script}${from !== to && layout === "flowing" ? "/flowing" : ""}`;

/** Surah `surah`'s Passage that is exactly Ayahs `from`..`till`, as the website serves it from the Passage load. */
const passageOf = (surah: number, from: number, till: number) => datasetSurah(surah).passages.find((p) => p.from === from && p.till === till);

/** The phone's share sheet, stood in for: it records what it is handed and is sent or dismissed as the scenario says. */
class FakeShareSheet implements ShareSheet {
  handed: string[] = [];
  answer: "shared" | "dismissed" = "shared";
  async share({ message }: { message: string }) {
    this.handed.push(message);
    return this.answer;
  }
}

/** app.json's `expo`, as a build of the app ships it. */
interface ShippedApp {
  scheme?: string | string[];
  ios?: { associatedDomains?: string[] };
  android?: { intentFilters?: IntentFilter[] };
}
interface IntentData {
  scheme?: string;
  host?: string;
  path?: string;
  pathPrefix?: string;
  pathPattern?: string;
  pathAdvancedPattern?: string;
}
interface IntentFilter {
  action?: string | string[];
  autoVerify?: boolean;
  category?: string | string[];
  data?: IntentData | IntentData[];
}
const shippedApp = (): ShippedApp => (JSON.parse(readFileSync(new URL("../app.json", import.meta.url), "utf8")) as { expo: ShippedApp }).expo;
const listOf = <T>(value: T | T[] | undefined): T[] => (value === undefined ? [] : Array.isArray(value) ? value : [value]);

/** Android's simple glob for pathPattern: `.` any character, `*` any number of the one before it, `\` quotes the next. */
function androidPattern(pattern: string): RegExp {
  let source = "";
  for (let i = 0; i < pattern.length; i++) {
    const c = pattern[i];
    if (c === "\\" && i + 1 < pattern.length) source += pattern[++i].replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");
    else if (c === "." || c === "*") source += c;
    else source += c.replace(/[+?^${}()|[\]\\/]/g, "\\$&");
  }
  return new RegExp(`^${source}$`);
}

/** Whether an https link to `path` on `host` opens in the app through `filter`, by Android's matching of its data. */
function filterOpens(filter: IntentFilter, host: string, path: string): boolean {
  const data = listOf(filter.data);
  const schemes = data.flatMap((d) => listOf(d.scheme));
  const hosts = data.flatMap((d) => listOf(d.host));
  if (!schemes.includes("https") || !hosts.includes(host)) return false;
  const paths = data.filter((d) => d.path ?? d.pathPrefix ?? d.pathPattern ?? d.pathAdvancedPattern);
  if (paths.length === 0) return true;
  return paths.some(
    (d) =>
      d.path === path ||
      (d.pathPrefix !== undefined && path.startsWith(d.pathPrefix)) ||
      (d.pathPattern !== undefined && androidPattern(d.pathPattern).test(path)) ||
      (d.pathAdvancedPattern !== undefined && new RegExp(`^${d.pathAdvancedPattern}$`).test(path)),
  );
}

/** The Android intent filters that open https links on `host` and are verified automatically. */
const verifiedFiltersFor = (host: string) =>
  listOf(shippedApp().android?.intentFilters).filter(
    (f) =>
      f.autoVerify === true &&
      listOf(f.action).includes("VIEW") &&
      listOf(f.category).includes("BROWSABLE") &&
      listOf(f.category).includes("DEFAULT") &&
      listOf(f.data).some((d) => d.scheme === "https") &&
      listOf(f.data).some((d) => d.host === host),
  );

describeFeature(feature, ({ Background, Scenario, ScenarioOutline, BeforeAllScenarios, AfterAllScenarios, defineSteps }) => {
  const world = new World();
  let places: DeviceReadingPlaces;
  let visit: SurahVisit | undefined;
  let reader: { lang: Language; script: Script } = { lang: "ur", script: "uthmani" };
  /** The Share page on screen, if one was opened; null when opening one opened none. */
  let page: SharePage | null | undefined;
  let sheet = new FakeShareSheet();
  /** What the app kept in this device's storage when the scenario noted it. */
  let noted: Map<string, string> | undefined;

  const launch = (device: Device) => {
    world.launch(device, true);
    places = openReadingPlaces(device);
    visit = undefined;
    world.screen = undefined;
    page = undefined;
    sheet = new FakeShareSheet();
  };

  /** The Share page on screen, which must have opened. */
  const open = (): SharePage => {
    expect(page, "a Share page is open").toBeTruthy();
    return page!;
  };

  /** Opens Surah `surah` from the Surah index, as the Read screen does: reading there, in the reader's Language and Script. */
  const openSurah = async (surah: number) => {
    visit = await places.open(surah);
    world.screen = await world.app.surah(surah, { script: reader.script, language: reader.lang, ayahTranslation: true });
  };

  /** A share button on the open Surah screen, or its Surah bar's "Share Ayahs": the Share page it opens, with the edit strip. */
  const shareFromScreen = async (shared: { surah: number; from: number; to: number }) => {
    page = await openSharePage(world.app, { ...reader, ...shared, layout: null }, { sharer: true });
  };

  const tapAyahShare = async (text: string) => {
    const { surah, from } = sharedIn(text);
    expect(world.screen?.number, `the Surah ${surah} screen is open`).toBe(surah);
    expect(
      world.screen!.items.some((item) => item.kind === "ayah" && item.number === from),
      `the Surah ${surah} screen shows Ayah ${text}`,
    ).toBe(true);
    await shareFromScreen({ surah, from, to: from });
  };

  const tapPassageShare = async (text: string) => {
    const { surah, from, to } = sharedIn(text);
    expect(world.screen?.number, `the Surah ${surah} screen is open`).toBe(surah);
    expect(
      world.screen!.items.some((item) => item.kind === "passage-heading" && item.range === ayahRange(from, to)),
      `the Surah ${surah} screen has the Passage heading ${text}`,
    ).toBe(true);
    await shareFromScreen({ surah, from, to });
  };

  const tapShareAyahs = async () => {
    expect(world.screen, "a Surah screen is open").toBeTruthy();
    await shareFromScreen({ ...SHARE_AYAHS_START });
  };

  /** A link opened on the phone: the Share page it names, opened in the app with no edit strip, or none. */
  const openLink = async (link: string) => {
    const request = shareRequestOfLink(link);
    page = request === null ? null : await openSharePage(world.app, request, { sharer: false });
  };

  const tapShare = async (answer: "shared" | "dismissed") => {
    sheet.answer = answer;
    await open().share(sheet);
  };

  const strip = () => {
    const s = open().editStrip;
    expect(s, "the Share page has the edit strip").not.toBeNull();
    return s!;
  };

  const expectOpen = (sharedText: string, inText: string, editStrip: boolean) => {
    const { surah, from, to } = sharedIn(sharedText);
    const { lang, script, layout } = openIn(inText);
    if (from !== to && layout === null) throw new Error(`a run names its Share layout: ${sharedText} in ${inText}`);
    const p = open();
    expect({ lang: p.lang, script: p.script, surah: p.surah, from: p.from, to: p.to, layout: p.layout, editStrip: p.editStrip !== null }).toEqual({
      lang,
      script,
      surah,
      from,
      to,
      layout,
      editStrip,
    });
    expect(p.link, "the Share page's link is its address on the production site").toBe(SITE + sharePath(lang, script, surah, from, to, layout));
  };

  BeforeAllScenarios(() => world.start());
  AfterAllScenarios(() => world.close());

  defineSteps((keywords) => {
    // Every step under every keyword: a predefined step reaches a Scenario Outline only under its own keyword.
    const Step = (text: string, fn: StepFn) => {
      for (const define of [keywords.Given, keywords.When, keywords.Then, keywords.And, keywords.But]) define(text, fn);
    };
    Step("the reader reads in {any} with the {any} Script", (_, language: string, script: string) => {
      reader = { lang: languageCode(language), script: scriptCode(script) };
    });
    Step("{any} is a Passage of {int} Ayahs in the Passage load", (_, text: string, count: number) => {
      const { surah, from, to } = sharedIn(text);
      expect(passageOf(surah, from, to), `${text} is a Passage`).toBeTruthy();
      expect(to - from + 1).toBe(count);
    });
    Step("{any} is not a Passage in the Passage load", (_, text: string) => {
      const { surah, from, to } = sharedIn(text);
      expect(passageOf(surah, from, to), `${text} is a Passage`).toBeUndefined();
    });

    Step("I open Surah {any} from the Surah index", (_, surah: string) => openSurah(Number(surah)));
    Step("I scroll until Ayah {int}:{int} is at the top of the screen", async (_, surah: number, ayah: number) => {
      expect(visit?.surah, `the Surah ${surah} screen is open`).toBe(surah);
      await visit!.scrolledTo(ayah);
    });
    Step("I tap the share button of Ayah {any}", (_, text: string) => tapAyahShare(text));
    Step("I tap the share button of the Passage heading {any}", (_, text: string) => tapPassageShare(text));
    Step('I tap the Surah bar\'s "Share Ayahs"', () => tapShareAyahs());
    Step("I open the link {string} on the phone", (_, link: string) => openLink(link));
    Step("I open the link the share sheet was handed on that phone", () => {
      expect(sheet.handed, "the share sheet was handed one text").toHaveLength(1);
      // Kept from the sharer's phone: the new device's own share sheet has handed nothing.
      const link = sheet.handed[0].split("\n\n").at(-1)!;
      return openLink(link);
    });
    Step("the app is launched on a second, new device", () => {
      const handed = sheet.handed;
      launch(new Device());
      sheet.handed = handed;
    });

    Step("I tap Share and send it", () => tapShare("shared"));
    Step("I tap Share and dismiss the share sheet", () => tapShare("dismissed"));
    Step("the share sheet was handed {string} and the link {string}, a blank line between", (_, ref: string, link: string) => {
      const m = /^(.+) (\d+):\d+(?:–\d+)?$/.exec(ref);
      if (!m) throw new Error(`not a reference: ${ref}`);
      expect(m[1], "the reference names the Surah by its English name").toBe(datasetSurahIndex()[Number(m[2]) - 1].nameLatin);
      expect(sheet.handed).toEqual([`${ref}\n\n${link}`]);
    });

    Step("the Share page of {any} is open in {any}, with the edit strip", (_, shared: string, inText: string) => expectOpen(shared, inText, true));
    Step("the Share page of {any} is open in {any}, with no edit strip", (_, shared: string, inText: string) => expectOpen(shared, inText, false));
    Step("the Share page shows {any} in {any} and {any}", (_, text: string, scriptName: string, languageName: string) => {
      const { surah, from, to } = sharedIn(text);
      const script = scriptCode(scriptName);
      const lang = languageCode(languageName);
      const expected = datasetSurah(surah)
        .ayahs.filter((a) => a.number >= from && a.number <= to)
        .map((a) => ({ number: a.number, words: a.words.map((w) => w[script]), translation: a.translation[lang] }));
      expect(expected, `Surah ${surah} has Ayahs ${text}`).toHaveLength(to - from + 1);
      const p = open();
      expect({ surah: p.surah, from: p.from, to: p.to }).toEqual({ surah, from, to });
      expect(p.ayahs).toEqual(expected);
    });
    Step("the Share page shows the Passage title of {any} in {any}", (_, text: string, languageName: string) => {
      const { surah, from, to } = sharedIn(text);
      const passage = passageOf(surah, from, to);
      expect(passage, `${text} is a Passage`).toBeTruthy();
      expect(open().passageTitle).toBe(passage![languageCode(languageName)]);
    });
    Step("the Share page shows no Passage title", () => expect(open().passageTitle).toBeNull());

    Step("the edit strip shows Surah {any}, from Ayah {any} to Ayah {any}", (_, surah: string, from: string, rest: string) => {
      const noLayout = ", with no Share layout to choose";
      const to = rest.endsWith(noLayout) ? rest.slice(0, -noLayout.length) : rest;
      const s = strip();
      expect({ surah: s.surah, from: s.from, to: s.to }).toEqual({ surah: Number(surah), from: Number(from), to: Number(to) });
      if (rest.endsWith(noLayout)) expect(s.layouts).toEqual([]);
    });
    Step("the edit strip offers the Share layouts Ayah by Ayah and Flowing", () => expect(strip().layouts).toEqual(["ayah-by-ayah", "flowing"]));
    Step("the edit strip offers each of the 114 Surahs in order, and every Ayah of Surah 2 as the from Ayah", () => {
      const index = datasetSurahIndex();
      expect(index).toHaveLength(114);
      const s = strip();
      expect(s.surahs).toEqual(index.map(({ number, nameLatin }) => ({ number, nameLatin })));
      expect(s.fromAyahs).toEqual(Array.from({ length: index[1].ayahCount }, (_, k) => k + 1));
    });
    Step("the edit strip offers to Ayahs {string} and no others", (_, choices: string) => expect(strip().toAyahs).toEqual(ayahsNamed(choices)));
    Step("on the edit strip I choose to Ayah {any}", async (_, ayah: string) => {
      page = await strip().chooseTo(Number(ayah));
    });
    Step("on the edit strip I choose from Ayah {any}", async (_, ayah: string) => {
      page = await strip().chooseFrom(Number(ayah));
    });
    Step("on the edit strip I choose Surah {any}", async (_, surah: string) => {
      page = await strip().chooseSurah(Number(surah));
    });
    Step("on the edit strip I choose the {any} Share layout", async (_, layout: string) => {
      page = await strip().chooseLayout(layoutCode(layout));
    });

    Step(
      "on a phone whose edit strip rows are {any} points wide, the Surah, from Ayah and to Ayah rows each open with the chosen chip wholly in view",
      (_, points: string) => {
        const rowLength = Number(points);
        const s = strip();
        const rows = [
          { row: "Surah", chosen: s.surahs.findIndex((c) => c.number === s.surah), count: s.surahs.length, chip: EDIT_STRIP_CHIP.surah },
          { row: "from Ayah", chosen: s.fromAyahs.indexOf(s.from), count: s.fromAyahs.length, chip: EDIT_STRIP_CHIP.ayah },
          { row: "to Ayah", chosen: s.toAyahs.indexOf(s.to), count: s.toAyahs.length, chip: EDIT_STRIP_CHIP.ayah },
        ];
        for (const { row, chosen, count, chip } of rows) {
          expect(chosen, `the ${row} row offers its chosen chip`).toBeGreaterThanOrEqual(0);
          const offset = chipRowOffset(chosen, count, chip, rowLength);
          const [start, end] = [chosen * chip, (chosen + 1) * chip - EDIT_STRIP_CHIP.gap];
          expect(offset, `the ${row} row opens scrolled no further than its chips reach`).toBeLessThanOrEqual(Math.max(0, count * chip - rowLength));
          expect(offset, `the ${row} row opens scrolled no further back than its start`).toBeGreaterThanOrEqual(0);
          expect(start, `the ${row} row's chosen chip starts in view`).toBeGreaterThanOrEqual(offset);
          expect(end, `the ${row} row's chosen chip ends in view`).toBeLessThanOrEqual(offset + rowLength);
        }
      },
    );

    Step("each of these links opens no Share page in the app:", async (_, table: Record<string, string>[]) => {
      for (const { link } of table) {
        await openLink(link);
        expect(page, `${link} opens no Share page`).toBeNull();
      }
    });

    Step('the app\'s config keeps the scheme "saaliheen"', () => expect(listOf(shippedApp().scheme)).toContain("saaliheen"));
    Step('the app\'s config names the iOS associated domain "applinks:saaliheen.com"', () =>
      expect(shippedApp().ios?.associatedDomains ?? []).toContain("applinks:saaliheen.com"),
    );
    Step("the app's config has an Android intent filter, verified automatically, that opens https links on saaliheen.com", () =>
      expect(verifiedFiltersFor("saaliheen.com").length, "a verified VIEW, BROWSABLE, DEFAULT intent filter for https://saaliheen.com").toBeGreaterThan(0),
    );
    Step("that intent filter opens these addresses on saaliheen.com in the app, and no others of them:", (_, table: Record<string, string>[]) => {
      const filters = verifiedFiltersFor("saaliheen.com");
      const opened = table.map(({ address }) => ({ address, claimed: filters.some((f) => filterOpens(f, "saaliheen.com", address)) ? "yes" : "no" }));
      expect(opened).toEqual(table.map(({ address, claimed }) => ({ address, claimed })));
    });

    Step("what the app keeps in this device's storage is noted", () => {
      noted = new Map(world.device.items);
      expect(noted.size, "the app keeps its Reading places on the device").toBeGreaterThan(0);
    });
    Step("what the app keeps in this device's storage is as it was noted", () => {
      expect(noted, "it was noted").toBeDefined();
      expect(new Map(world.device.items)).toEqual(noted);
    });
    Step("the Surah index offers these Reading places, newest first:", async (_, table: Record<string, string>[]) => {
      const expected: ReadingPlace[] = table.map((row) => ({ surah: Number(row.Surah), ayah: Number(row.Ayah) }));
      expect(await places.list()).toEqual(expected);
    });
  });

  Background(({ Given }) => {
    Given("the app is launched on a new device, with Passage headings on", () => {
      world.stopRecording();
      reader = { lang: "ur", script: "uthmani" };
      noted = undefined;
      launch(new Device());
    });
  });

  ScenarioOutline(
    "In <Language> with the <Script> Script, Ayah 2:255's share button opens its Share page with the edit strip, and Share hands over its link",
    () => {},
  );
  Scenario("On the edit strip I pick 2:255–257 set out Flowing, and Share hands over that Share page's link", () => {});
  ScenarioOutline("In <Language> with the <Script> Script, the share button of the Passage 18:83–88 opens the Share page of exactly that Passage", () => {});
  Scenario("The share button of a Passage longer than 10 Ayahs opens the Share page of the whole Passage", () => {});
  ScenarioOutline('In <Language>, the Surah bar\'s "Share Ayahs" opens the Share page on 1:1–7 with the edit strip', () => {});
  Scenario("The edit strip offers every Surah", () => {});
  ScenarioOutline("From Ayah <ayah>, the edit strip offers to Ayahs <choices> only", () => {});
  ScenarioOutline("Choosing from Ayah <from> with the run at 2:255–257 moves the run to 2:<from>–<to>", () => {});
  Scenario("Choosing another Surah on the edit strip opens its first Ayah, keeping the Language and Script", () => {});
  Scenario("Dismissing the share sheet sends nothing and leaves the Share page as it was", () => {});

  ScenarioOutline("The link <link> opens the Share page of <shared> in <Language> and <Script>, <layout>, with no edit strip", () => {});
  ScenarioOutline("The single-Ayah link <link> opens the Share page of 2:255 in <Language> with its Passage title and no edit strip", () => {});
  Scenario("The link I shared opens, on another phone with the app, the Share page I made, with no edit strip", () => {});
  Scenario("Links that name no Share page, or Ayahs that may not be shared, open no Share page", () => {});
  Scenario("The app as built claims Share page links on saaliheen.com, on iOS and Android, and keeps its saaliheen:// scheme", () => {});

  Scenario("Picking and sharing Ayahs from Surah 2 leaves the Reading places as they were", () => {});
  ScenarioOutline("Opening <how> leaves the Reading places as they were", ({ And }, { how }) => {
    And("I open <how>", async () => {
      const link = /^the link "(.+)" on the phone$/.exec(how);
      const passage = /^the Share page from the share button of the Passage heading (.+)$/.exec(how);
      if (link) return openLink(link[1]);
      if (passage) return tapPassageShare(passage[1]);
      if (how === 'the Share page from the Surah bar\'s "Share Ayahs"') return tapShareAyahs();
      throw new Error(`no way to open ${how}`);
    });
  });

  ScenarioOutline(
    "On a phone whose edit strip rows are <row> points wide, the share button of Ayah <ayah> opens each row with its chosen chip wholly in view",
    () => {},
  );
});
