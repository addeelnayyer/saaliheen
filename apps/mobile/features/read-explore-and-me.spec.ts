import { describeFeature, loadFeature } from "@amiceli/vitest-cucumber";
import { expect } from "vitest";
import { readFileSync } from "node:fs";
import { explore, followTabBar, me, opensOn, tabIconPath, tabs, type ExploreScreen, type MeEntry, type MeScreen, type TabBarFollower } from "../src/destinations.ts";
import type { Language } from "../src/quran-analysis.ts";
import { openReadingPlaces } from "../src/reading-places.ts";
import { World, datasetSurahIndex, languageCode, parity } from "./support.ts";

/** The website's tab icon paths, as its site bar draws them (apps/web site-bar.tsx ICON_PATHS). */
const websiteIconPaths = () => {
  const source = readFileSync(new URL("../../web/src/app/[lang]/site-bar.tsx", import.meta.url), "utf8");
  const block = /const ICON_PATHS[^{]*\{([^}]*)\}/.exec(source)![1];
  return Object.fromEntries([...block.matchAll(/(\w+): "([^"]+)"/g)].map(([, key, path]) => [key, path]));
};

const feature = await loadFeature("./read-explore-and-me.feature");

/** A Surah's Latin name, as the Surah index shows it. */
const surahName = (n: number) => datasetSurahIndex().find((s) => s.number === n)!.nameLatin;

describeFeature(feature, ({ Background, Scenario, ScenarioOutline, BeforeAllScenarios, AfterAllScenarios }) => {
  const world = new World();
  BeforeAllScenarios(() => world.start());
  AfterAllScenarios(() => world.close());

  let explored: ExploreScreen;
  let meScreen: MeScreen;
  let tabBar: TabBarFollower;

  const readingPlaces = () => openReadingPlaces(world.device);
  const openMe = async () => {
    meScreen = await me({ origin: world.data.origin, device: world.device, readingPlaces: readingPlaces(), surahName });
  };
  const entry = <K extends MeEntry["kind"]>(kind: K, label?: string) => {
    const found = meScreen.entries.find((e) => e.kind === kind && (label === undefined || e.label === label));
    if (!found) throw new Error(`Me has no ${label ?? kind} entry`);
    return found as Extract<MeEntry, { kind: K }>;
  };
  const languageEntry = () => entry("language");
  const chooseLanguage = async (language: Language) => {
    await openMe();
    await languageEntry().choose(language);
  };
  /** The website page `path` on the app's origin. */
  const website = (path: string) => world.data.origin + path;
  /** Whether `address` is the website's `document` page in `lang`: on the origin, naming the document, and carrying the Language in its path or a `lang` query. */
  const isDocumentIn = (address: string, document: string, lang: string) => {
    const url = new URL(address);
    expect(url.origin, `${document} opens on the website`).toBe(new URL(world.data.origin).origin);
    expect(url.pathname.split("/").at(-1), `${document} opens the ${document} page`).toBe(document);
    const inLanguage = url.pathname.split("/").includes(lang) || url.searchParams.get("lang") === lang;
    expect(inLanguage, `${address} keeps the reader's Language (${lang})`).toBe(true);
  };
  const playing = () => {
    if (!world.recitation) throw new Error("the play control was never pressed");
    return world.recitation;
  };
  const recitationBarOnScreen = () => parity(playing()).bar !== null;

  Background(({ Given }) => {
    Given("the app is launched on a new device", () => {
      world.launch();
    });
  });

  Scenario("The app opens on Read, with Read, Explore and Me as tabs", ({ Then, And }) => {
    Then("the tab bar shows, in order:", (_, table: { tab: string }[]) => {
      expect(tabs().map((t) => t.label)).toEqual(table.map((row) => row.tab));
      expect(tabs().map((t) => t.destination)).toEqual(["read", "explore", "me"]);
    });
    And("the app opens on the Read tab", () => {
      expect(opensOn()).toBe("read");
    });
  });

  Scenario("Each tab carries the website's icon over its word", ({ Then, And }) => {
    Then("each tab shows its icon over its word:", (_, table: { tab: string; icon: string }[]) => {
      expect(tabs().map((t) => ({ tab: t.label, icon: t.icon }))).toEqual(table);
    });
    And("each tab's icon is drawn from the same path as the website's", () => {
      const website = websiteIconPaths();
      for (const { destination, icon } of tabs()) expect(tabIconPath(icon)).toBe(website[destination]);
    });
  });

  ScenarioOutline(
    "Explore lists Themes, Iltifat, Supplications, then Quran Chat, each with its line in <Language>",
    ({ Given, When, Then, And }, { Language: name, lang, themes, iltifat, supplications, quranChat }) => {
      Given("the Language is <Language>", () => chooseLanguage(languageCode(name)));
      When("I open the Explore tab", async () => {
        await openMe();
        explored = explore(world.data.origin, languageEntry().chosen);
      });
      Then('its title is "Explore"', () => {
        expect(explored.title).toBe("Explore");
      });
      And("it shows four ways of exploring, Themes, Iltifat, Supplications, then Quran Chat", () => {
        expect(explored.cards.map((c) => c.name)).toEqual(["Themes", "Iltifat", "Supplications", "Quran Chat"]);
      });
      And('Themes\' line is "<themes>"', () => {
        expect(explored.cards[0].line).toBe(themes);
      });
      And('Iltifat\'s line is "<iltifat>"', () => {
        expect(explored.cards[1].line).toBe(iltifat);
      });
      And('Supplications\' line is "<supplications>"', () => {
        expect(explored.cards[2].line).toBe(supplications);
      });
      And('Quran Chat\'s line is "<quranChat>"', () => {
        expect(explored.cards[3].line).toBe(quranChat);
      });
      And('each but Quran Chat opens its page on the website under "/<lang>/"', () => {
        expect(explored.cards.slice(0, 3).map((c) => c.opens)).toEqual([
          { website: website(`/${lang}/themes`) },
          { website: website(`/${lang}/iltifat`) },
          { website: website(`/${lang}/supplications`) },
        ]);
      });
      And("Quran Chat opens the app's own Quran Chat screen", () => {
        expect(explored.cards[3].opens).toEqual({ screen: "/explore/quran-chat" });
      });
    },
  );

  Scenario("Me holds Sign in, Reading places, Known words, Language, the settings, then Credits, Privacy and Terms", ({ When, Then, And }) => {
    When("I open the Me tab", () => openMe());
    Then('its title is "Me"', () => {
      expect(meScreen.title).toBe("Me");
    });
    And("it shows these entries, in order:", (_, table: { entry: string }[]) => {
      expect(meScreen.entries.map((e) => e.label)).toEqual(table.map((row) => row.entry));
      expect(meScreen.entries.map((e) => e.kind)).toEqual([
        "sign-in",
        "reading-places",
        "known-words",
        "language",
        "setting",
        "setting",
        "setting",
        "setting",
        "setting",
        "setting",
        "setting",
        "setting",
        "document",
        "document",
        "document",
      ]);
    });
  });

  ScenarioOutline("Me's website entries open the website in <Language>", ({ Given, When, Then, And }, { Language: name, lang }) => {
    Given("the Language is <Language>", () => chooseLanguage(languageCode(name)));
    When("I open the Me tab", () => openMe());
    // Sign in no longer opens the website: the app signs in itself (#75, features/signing-in-in-the-app.feature).
    Then('Credits opens the website\'s "/<lang>/credits"', () => {
      expect(entry("document", "Credits").opens).toBe(website(`/${lang}/credits`));
    });
    And("Privacy opens the website's Privacy and Terms opens the website's Terms, both in <Language>", () => {
      isDocumentIn(entry("document", "Privacy").opens, "privacy", lang);
      isDocumentIn(entry("document", "Terms").opens, "terms", lang);
    });
  });

  Scenario("Me lists this device's Reading places, newest first, each opening its Surah at that Ayah", ({ Given, When, Then, And }) => {
    Given("I read Surah 18 to Ayah 45 and then Surah 2 to Ayah 255", async () => {
      const places = readingPlaces();
      await (await places.open(18)).scrolledTo(45);
      await (await places.open(2)).scrolledTo(255);
    });
    When("I open the Me tab", () => openMe());
    Then('its Reading places are "2. Al-Baqarah · Ayah 255" then "18. Al-Kahf · Ayah 45"', () => {
      expect(entry("reading-places").places.map((p) => p.label)).toEqual(["2. Al-Baqarah · Ayah 255", "18. Al-Kahf · Ayah 45"]);
    });
    And("the first opens Surah 2 at Ayah 255 and the second Surah 18 at Ayah 45", async () => {
      const [first, second] = entry("reading-places").places;
      expect([first.surah, first.ayah, second.surah, second.ayah]).toEqual([2, 255, 18, 45]);
      expect((await readingPlaces().open(first.surah)).opensAt).toBe(255);
      expect((await readingPlaces().open(second.surah)).opensAt).toBe(45);
    });
  });

  Scenario("The Language is chosen in Me, and kept after the app is closed and opened again", ({ When, Then, And }) => {
    const offers = (chosen: string) => {
      const language = languageEntry();
      expect(language.label).toBe("Language");
      expect(language.choices.map(([, name]) => name).sort()).toEqual(["English", "اردو"].sort());
      expect(language.choices.find(([code]) => code === language.chosen)?.[1]).toBe(chosen);
    };
    When("I open the Me tab", () => openMe());
    Then('its Language offers "English" and "اردو", with "اردو" chosen', () => offers("اردو"));
    When('I choose "English" in Me\'s Language', () => languageEntry().choose("en"));
    And("I close the app and open it again on the same device", () => {
      world.launch(world.device);
    });
    And("I open the Me tab again", () => openMe());
    Then('its Language offers "English" and "اردو", with "English" chosen', () => offers("English"));
  });

  Scenario("A Surah screen's tab bar hides while reading down and comes back on scrolling up", ({ Given, When, Then }) => {
    Given("I open Surah 2", async () => {
      world.screen = await world.app.surah(2, { script: "uthmani", language: "ur", ayahTranslation: false });
      tabBar = followTabBar();
    });
    Then("the tab bar shows as the Surah opens", () => expect(tabBar.shown).toBe(true));
    When("I scroll down to 40 points", () => tabBar.scrolledTo(40));
    Then("the tab bar still shows", () => expect(tabBar.shown, "a little scrolling at the top keeps the tab bar").toBe(true));
    When("I scroll down to 600 points", () => tabBar.scrolledTo(600));
    Then("the tab bar is hidden", () => expect(tabBar.shown).toBe(false));
    When("I scroll down to 1200 points", () => tabBar.scrolledTo(1200));
    Then("the tab bar stays hidden", () => expect(tabBar.shown).toBe(false));
    When("I scroll up to 1100 points", () => tabBar.scrolledTo(1100));
    Then("the tab bar shows again", () => expect(tabBar.shown).toBe(true));
  });

  Scenario("A Surah screen's tab bar never shows with the Recitation bar", ({ Given, And, When, Then }) => {
    Given("I open Surah 2", async () => {
      world.screen = await world.app.surah(2, { script: "uthmani", language: "ur", ayahTranslation: false });
      tabBar = followTabBar();
    });
    And("I scroll down to 600 points", () => tabBar.scrolledTo(600));
    When("I press play with Ayah 1 at the top of the screen", async () => {
      await world.pressPlay(1);
      tabBar.recitationBar(recitationBarOnScreen());
    });
    Then("the Recitation bar is on screen", () => expect(recitationBarOnScreen()).toBe(true));
    When("I scroll up to 300 points", () => tabBar.scrolledTo(300));
    Then("the tab bar is hidden", () => expect(tabBar.shown).toBe(false));
    When("I scroll up to 0 points", () => tabBar.scrolledTo(0));
    Then("the tab bar stays hidden", () => expect(tabBar.shown).toBe(false));
    When("I press Stop on the Recitation bar", async () => {
      await parity(playing()).call("stop");
      tabBar.recitationBar(recitationBarOnScreen());
    });
    And("I scroll down to 20 points", () => tabBar.scrolledTo(20));
    And("I scroll up to 0 points", () => tabBar.scrolledTo(0));
    Then("the tab bar shows", () => {
      expect(recitationBarOnScreen(), "the Recitation bar left the screen").toBe(false);
      expect(tabBar.shown).toBe(true);
    });
  });
});
