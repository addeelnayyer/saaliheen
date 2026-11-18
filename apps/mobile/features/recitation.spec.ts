import { describeFeature, loadFeature } from "@amiceli/vitest-cucumber";
import type { Recitation, WordTiming } from "@saaliheen/dataset/types";
import { expect } from "vitest";
import type { AyahOnScreen } from "../src/recitation.ts";
import { World, datasetRecitation, datasetSurah, languageCode, recitedAyah, scriptCode, timedLocation, wordCardAt, wordCardsOf } from "./support.ts";

const feature = await loadFeature("./recitation.feature");

/** What opening Surah 108 asks /api/v1 for: its Allah references (#151) and its Tafsir (#236). */
const SURAH_108_API = ["/api/v1/allah-references/108", "/api/v1/tafsir/108"];

/** The first timing of Ayah `ayah`: the first Word the Reciter says in it. */
const firstTiming = (recitation: Recitation, ayah: number): WordTiming => recitedAyah(recitation, ayah).words[0];

describeFeature(feature, ({ Scenario, ScenarioOutline, BeforeAllScenarios, AfterAllScenarios, BeforeEachScenario }) => {
  const world = new World();
  BeforeAllScenarios(() => world.start());
  AfterAllScenarios(() => world.close());

  /** Every Word location marked as the Recited Word during the scenario, in order. */
  let marked: string[] = [];
  /** The Surah's committed Recitation file. */
  let recitation: Recitation;
  /** The Word location the scenario last expected as the Recited Word. */
  let expected: string;
  BeforeEachScenario(() => {
    world.stopRecording();
    marked = [];
  });

  const playing = () => {
    if (!world.recitation) throw new Error("the play control was never pressed");
    return world.recitation;
  };
  /** The Recitation reaches `ms` into the Surah's audio; whatever Word is then marked is noted. */
  const reach = (ms: number) => {
    world.audio.reach(ms);
    const word = playing().recitedWord;
    if (word !== null) marked.push(word);
  };
  const openSurah = async (number: number, script: string, language: string) => {
    world.screen = await world.app.surah(number, { script: scriptCode(script), language: languageCode(language), ayahTranslation: false });
    recitation = datasetRecitation(number);
  };
  const pressPlay = async (ayah: number) => {
    await world.pressPlay(ayah);
  };
  const playsFromStartOf = (ayah: number) => {
    expect(world.audio.loaded, "the Surah's audio, at the address its Recitation file gives").toBe(recitation.audio);
    expect(world.audio.playing, "the audio is playing").toBe(true);
    expect(world.audio.position, `the audio is at the start of Ayah ${recitation.surah}:${ayah}`).toBe(recitedAyah(recitation, ayah).from);
  };
  const reachFirstWordOf = (ayah: number) => {
    const timing = firstTiming(recitation, ayah);
    expected = timedLocation(recitation, ayah, timing);
    reach(timing[1]);
  };
  const recitedWordIs = (location: string, ayah?: number) => {
    expect(playing().recitedWord, "the Recited Word").toBe(location);
    if (ayah !== undefined) expect(playing().markedAyah, "the Ayah marked faintly").toBe(ayah);
  };

  ScenarioOutline(
    "In the <Script> Script and <Language>, Al-Kawthar plays from its first Ayah to its end, with no Account",
    ({ Given, When, Then, And }, { Script, Language }) => {
      const cardShowsTheRecitedWord = () => {
        recitedWordIs(expected);
        const card = wordCardAt(world.screen!, expected);
        const word = datasetSurah(108)
          .ayahs.flatMap((a) => a.words)
          .find((w) => w.location === expected)!;
        expect(card.arabic, `${expected}'s ${Script} text`).toBe(word[scriptCode(Script)]);
        expect(card.meaning, `${expected}'s ${Language} Word meaning`).toBe(word.meaning[languageCode(Language)]);
      };

      Given("the app is launched on a new device", () => {
        world.launch();
      });
      And("every request the app makes is recorded", () => world.record());
      And("I open Surah 108 in the <Script> Script and <Language>", () => openSurah(108, Script, Language));
      When("I press the play control with Ayah 108:1 at the top of the screen", () => pressPlay(1));
      Then("the app read Surah 108's Recitation from /data/v1/recitations/108.json", () => {
        expect(world.data.received).toContain("/data/v1/recitations/108.json");
      });
      And(
        "the audio playing is the Surah's audio at the address its Recitation file gives, from the start of Ayah 108:1",
        () => playsFromStartOf(1),
      );
      And("the Recitation bar is on screen, offering to pause", () => {
        expect(playing().bar).toMatchObject({ offers: "pause" });
      });
      When("the Recitation reaches the start of the first Word the Reciter says in Ayah 108:1", () => reachFirstWordOf(1));
      Then(
        "the Recited Word is that Word, and its Word card shows its <Script> text and its <Language> Word meaning",
        cardShowsTheRecitedWord,
      );
      And("Ayah 108:1 is marked faintly", () => {
        expect(playing().markedAyah).toBe(1);
      });
      When("the Recitation reaches the start of the first Word the Reciter says in Ayah 108:3, the last of the Surah", () => {
        expect(recitation.ayahs.at(-1)!.number, "Ayah 3 is Al-Kawthar's last").toBe(3);
        reachFirstWordOf(3);
      });
      Then(
        "the Recited Word moves on to that Word, whose Word card shows its <Script> text and its <Language> Word meaning",
        cardShowsTheRecitedWord,
      );
      When("the Recitation plays to the end of the Surah's audio", () => {
        world.audio.playToEnd(recitation.ayahs.at(-1)!.to);
      });
      Then("the Recitation stops at the end of the Surah", () => {
        expect(world.audio.playing, "the audio is not playing").toBe(false);
        expect(world.audio.loads, "the app loaded no other audio").toEqual([recitation.audio]);
        expect(world.audio.position, "the audio stayed at the end of the Surah").toBe(recitation.ayahs.at(-1)!.to);
      });
      And("the Recitation bar is not on screen", () => {
        expect(playing().bar).toBeNull();
      });
      And("no Word card and no Ayah is marked", () => {
        expect(playing().recitedWord).toBeNull();
        expect(playing().markedAyah).toBeNull();
      });
      And("every Word marked was a Word card on the screen, never the Bismillah", () => {
        const cards = new Set(wordCardsOf(world.screen!).map((c) => c.location));
        expect(marked.length, "some Word was marked").toBeGreaterThan(0);
        expect(marked.filter((location) => !cards.has(location))).toEqual([]);
      });
      And("the app asked /api/v1 for nothing but Surah 108's Allah references and Tafsir, so no Account was needed", () => {
        // Opening a Surah reads its Allah references (#151) and its Tafsir (#236), which need no Account.
        const otherApi = (path: string) => path.startsWith("/api/") && !SURAH_108_API.includes(path);
        expect(world.data.received.filter(otherApi)).toEqual([]);
        expect(world.recording!.urls.filter((url) => otherApi(new URL(url, world.data.origin).pathname))).toEqual([]);
      });
      And(
        "every request the app made went to its origin, under /data/v1/ or for /api/v1/allah-references/108 or /api/v1/tafsir/108; the Surah's audio was its only other address",
        () => {
          const urls = world.recording!.urls;
          expect(urls.length, "the app fetched what it showed").toBeGreaterThan(0);
          const outside = urls.filter((url) => {
            const u = new URL(url, world.data.origin);
            return u.origin !== world.data.origin || !(u.pathname.startsWith("/data/v1/") || SURAH_108_API.includes(u.pathname));
          });
          expect(outside, "requests outside the origin's /data/v1/").toEqual([]);
          expect(world.audio.loads).toEqual([recitation.audio]);
          world.stopRecording();
        },
      );
    },
  );

  Scenario(
    "The Recited Word moves on through Al-Fatihah's first Ayah, and only its Word card and its Ayah are marked",
    ({ Given, When, Then, And }) => {
      Given("the app is launched on a new device", () => {
        world.launch();
      });
      And("I open Surah 1 in the Uthmani Script and English", () => openSurah(1, "Uthmani", "English"));
      When("I press the play control with Ayah 1:1 at the top of the screen", () => pressPlay(1));
      Then(
        "as the Recitation reaches the start of each of 1:1's timings in turn, that timing's Word is the Recited Word and Ayah 1:1 is marked faintly",
        () => {
          const timings = recitedAyah(recitation, 1).words;
          expect(timings.length).toBeGreaterThan(1);
          for (const timing of timings) {
            reach(timing[1]);
            recitedWordIs(timedLocation(recitation, 1, timing), 1);
          }
        },
      );
      When("the Recitation reaches the pause after 1:1's last timing, before Ayah 1:2's first", () => {
        const last = recitedAyah(recitation, 1).words.at(-1)!;
        const next = firstTiming(recitation, 2);
        expect(next[1] - 1, "a pause after 1:1's last timing starts").toBeGreaterThan(last[2]);
        expected = timedLocation(recitation, 1, last);
        reach(next[1] - 1);
      });
      Then("the Recited Word is still 1:1's last timed Word, and Ayah 1:1 is still marked faintly", () => recitedWordIs(expected, 1));
      When("the Recitation reaches the start of the first Word the Reciter says in Ayah 1:2", () => reachFirstWordOf(2));
      Then("the Recited Word is that Word, and Ayah 1:2 is marked faintly instead of Ayah 1:1", () => recitedWordIs(expected, 2));
    },
  );

  Scenario("The Recitation bar pauses the Recitation and plays it on", ({ Given, When, Then, And }) => {
    let pausedAt = 0;
    Given("the app is launched on a new device", () => {
      world.launch();
    });
    And("I open Surah 1 in the Uthmani Script and English", () => openSurah(1, "Uthmani", "English"));
    When("I press the play control with Ayah 1:1 at the top of the screen", () => pressPlay(1));
    And("the Recitation reaches the start of the first Word the Reciter says in Ayah 1:2", () => reachFirstWordOf(2));
    And("I press the Recitation bar's pause button", () => {
      pausedAt = world.audio.position;
      playing().pause();
    });
    Then("the audio is paused, and the Recitation bar is on screen, offering to play", () => {
      expect(world.audio.playing, "the audio is playing").toBe(false);
      expect(playing().bar).toMatchObject({ offers: "play" });
    });
    And("the Recited Word is still the first Word the Reciter says in Ayah 1:2", () => recitedWordIs(expected, 2));
    When("I press the Recitation bar's play button", () => playing().play());
    Then("the audio is playing on from where it was paused, and the Recitation bar offers to pause", () => {
      expect(world.audio.playing, "the audio is playing").toBe(true);
      expect(world.audio.position, "where it was paused").toBe(pausedAt);
      expect(world.audio.loads, "the app loaded the Surah's audio once").toEqual([recitation.audio]);
      expect(playing().bar).toMatchObject({ offers: "pause" });
    });
  });

  ScenarioOutline(
    "The play control plays from the Ayah a reader sees at the top of the screen, below the Surah bar",
    ({ Given, When, Then, And }, { First, Height, Ends, Top }) => {
      /** A phone's window, 874 px tall, under a Surah bar (status bar included) 120 px tall. */
      const seen = { top: 120, bottom: 874 };
      /** Every Ayah after the first on screen is this tall. */
      const NEXT_HEIGHT = 400;
      Given("the app is launched on a new device", () => {
        world.launch();
      });
      And("I open Surah 2 in the Indo-Pak Script and Urdu", () => openSurah(2, "Indo-Pak", "Urdu"));
      And(
        "the screen is laid out so that <Case>: Ayah 2:<First>, <Height> px tall, ending <Ends> px below the Surah bar, and the Ayahs after it under it",
        () => {
          const first = Number(First);
          const bottom = seen.top + Number(Ends);
          const ayahs: AyahOnScreen[] = [{ number: first, top: bottom - Number(Height), bottom }];
          const last = recitation.ayahs.at(-1)!.number;
          for (let number = first + 1, top = bottom; number <= last && top < seen.bottom; number++, top += NEXT_HEIGHT) {
            ayahs.push({ number, top, bottom: top + NEXT_HEIGHT });
          }
          // An Ayah above it, scrolled out of sight, still rendered; and the
          // screen hands the Ayahs over in no particular order.
          if (first > 1) ayahs.push({ number: first - 1, top: ayahs[0].top - NEXT_HEIGHT, bottom: ayahs[0].top });
          world.layout = { ayahs: ayahs.reverse(), seen };
        },
      );
      When("I press the play control", async () => {
        await world.pressPlayOnScreen();
      });
      Then(
        "the audio playing is the Surah's audio at the address its Recitation file gives, from the start of Ayah 2:<Top>",
        () => playsFromStartOf(Number(Top)),
      );
    },
  );

  Scenario(
    "Started from Ayah 2:9 at the top of the screen, the mark goes back as the Reciter repeats Words",
    ({ Given, When, Then, And }) => {
      Given("the app is launched on a new device", () => {
        world.launch();
      });
      And("I open Surah 2 in the Uthmani Script and English", () => openSurah(2, "Uthmani", "English"));
      When("I press the play control with Ayah 2:9 at the top of the screen", () => pressPlay(9));
      Then(
        "the audio playing is the Surah's audio at the address its Recitation file gives, from the start of Ayah 2:9",
        () => playsFromStartOf(9),
      );
      And(
        "no Word card is marked from the start of Ayah 2:9 until the Reciter says its first Word, though 2:8's last Word was said before it",
        () => {
          const { from } = recitedAyah(recitation, 9);
          const first = firstTiming(recitation, 9)[1];
          expect(recitedAyah(recitation, 8).words.at(-1)![1], "2:8's last Word starts before 2:9 does").toBeLessThan(from);
          expect(first - 1, "a moment after 2:9 starts and before its first Word").toBeGreaterThan(from);
          for (const ms of [from, from + 1, first - 1]) {
            reach(ms);
            expect(playing().recitedWord, `the Recited Word at ${ms} ms`).toBeNull();
            expect(playing().markedAyah, `the Ayah marked at ${ms} ms`).toBeNull();
          }
        },
      );
      When("the Recitation reaches the start of the first Word the Reciter says in Ayah 2:9", () => reachFirstWordOf(9));
      Then("the Recited Word is that Word, and Ayah 2:9 is marked faintly", () => recitedWordIs(expected, 9));
      When("the Recitation reaches the start of 2:9's timing 9", () => {
        const timing = recitedAyah(recitation, 9).words[8];
        reach(timing[1]);
        recitedWordIs(timedLocation(recitation, 9, timing), 9);
      });
      Then(
        "the Recited Word moves through 2:9's timings 9 to 11 in turn, going back to an earlier Word of the Ayah at timing 10",
        () => {
          const [ninth, tenth, eleventh] = recitedAyah(recitation, 9).words.slice(8, 11);
          expect(tenth[0], "timing 10 goes back to an earlier Word than timing 9").toBeLessThan(ninth[0]);
          for (const timing of [tenth, eleventh]) {
            reach(timing[1]);
            recitedWordIs(timedLocation(recitation, 9, timing), 9);
          }
          expect(marked.slice(-3)).toEqual([ninth, tenth, eleventh].map((t) => timedLocation(recitation, 9, t)));
        },
      );
    },
  );

  Scenario("Over 21:87:9, which has no timing, the previous Word stays marked", ({ Given, When, Then, And }) => {
    /** 21:87:8's timing and the one the Reciter says next. */
    const around = () => {
      const timings = recitedAyah(recitation, 87).words;
      const at = timings.findIndex(([word]) => word === 8);
      expect(timings.some(([word]) => word === 9), "21:87:9 has no timing").toBe(false);
      return { eighth: timings[at], next: timings[at + 1] };
    };
    Given("the app is launched on a new device", () => {
      world.launch();
    });
    And("I open Surah 21 in the Indo-Pak Script and Urdu", () => openSurah(21, "Indo-Pak", "Urdu"));
    When("I press the play control with Ayah 21:87 at the top of the screen", () => pressPlay(87));
    And("the Recitation reaches the end of 21:87:8's timing plus 1 ms", () => reach(around().eighth[2] + 1));
    Then("the Recited Word is 21:87:8", () => recitedWordIs("21:87:8", 87));
    When("the Recitation reaches 1 ms before the timing that follows 21:87:8's", () => reach(around().next[1] - 1));
    Then("the Recited Word is still 21:87:8, and 21:87:9 has never been the Recited Word", () => {
      recitedWordIs("21:87:8", 87);
      expect(marked).not.toContain("21:87:9");
    });
    When("the Recitation reaches the start of the timing that follows 21:87:8's", () => reach(around().next[1]));
    Then("the Recited Word is 21:87:10", () => {
      expect(timedLocation(recitation, 87, around().next)).toBe("21:87:10");
      recitedWordIs("21:87:10", 87);
    });
  });
});
