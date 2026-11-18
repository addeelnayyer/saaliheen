@issue-236
Feature: Each Passage's Tafsir after its last Ayah in the app
  As on the website, the app shows al-Mukhtasar's Tafsir in the reader's
  Language (ADR 0053): opening a Surah, its data layer reads the Surah's Tafsir
  from GET /api/v1/tafsir/{surah}?lang=en|ur, which answers
  { surah, language, credit, entries }, and after each Passage's last Ayah
  shows that Passage's Tafsir entries in order, each with its Ayah range
  ("3–4", or one number for one Ayah), then the edition's credit line. A
  Passage's Tafsir is the entries whose last Ayah is in it, so an entry is
  never cut short, even where a Passage not yet redrawn splits it. Only bold
  and italic are honoured (<b>, <strong>, <i>, <em>); any other markup is shown
  as text. The Tafsir is held back by the app's own release switch, on only
  when EXPO_PUBLIC_TAFSIR, or else app.json's extra.tafsir, is "on", apart
  from the Passage headings switch; the scenarios run with it on unless they
  say otherwise. A Surah whose Tafsir cannot be read opens without it, or
  with the Tafsir it keeps (offline-tafsir.feature, #238).

  The origin (features/support.ts) answers /api/v1/tafsir/{surah} as the
  website does once the Tafsir is loaded: in English, al-Mukhtasar's entries
  in the website's sample (apps/web/features/api/tafsir-sample.json),
  Al-Baqarah 1–5, where 2:3–4 is one entry, and Al-Kawthar 1–3; in Urdu, the
  sample in features/tafsir-sample-ur.json, Al-Kawthar's 108:1 alone and
  108:2–3 together, its text marked up; each with the website's credit line.
  A scenario can put other entries in, or make the endpoint answer 503. How
  the Tafsir looks on screen (Urdu right to left in the Urdu typeface, bold
  and italic) is checked by hand.

  @AC-1 @AC-5
  Scenario: Surah 2 in English shows its first Passage's Tafsir after Ayah 2:5, a grouped entry once, with its credit line
    Given the app is launched on a new device
    When I open Surah 2 in the Uthmani Script and English
    Then the app asked /api/v1/tafsir/2 for Surah 2's Tafsir in "en"
    And directly after Ayah 2:5, the last of the Passage 1–5, the Surah shows the Tafsir entries "1", "2", "3–4" and "5" with their texts as /api/v1/tafsir/2 answers them in "en", then its credit line
    And the Surah shows no other Tafsir

  @AC-1 @AC-5
  Scenario: Surah 108 in Urdu shows its Urdu Tafsir after its last Ayah, bold and italic kept
    Given the app is launched on a new device
    When I open Surah 108 in the Indo-Pak Script and Urdu
    Then directly after Ayah 108:3, the last of the Passage 1–3, the Surah shows the Tafsir entries "1" and "2–3" in "ur" with the Urdu credit line
    And the bold and italic of the Urdu sample's markup are kept, and nothing else of it is

  @AC-1 @AC-5
  Scenario: Switching Language switches the Tafsir
    Given the app is launched on a new device
    And I open Surah 108 in the Uthmani Script and English
    When I switch Language to Urdu
    Then directly after Ayah 108:3, the last of the Passage 1–3, the Surah shows the Tafsir entries "1" and "2–3" in "ur" with the Urdu credit line

  @AC-1 @AC-5
  Scenario: Markup other than bold and italic is shown as text
    Given the app is launched on a new device
    And the English Tafsir of Surah 112 is one entry for 112:1–4 reading "Say <b>He</b> is <i>One</i>, <strong>the</strong> <em>Eternal</em> <span>x</span> & <b>not <i>both</i></b>"
    When I open Surah 112 in the Uthmani Script and English
    Then the entry "1–4" after Ayah 112:4 shows "He" and "the" in bold, "One" and "Eternal" in italic, "both" in bold italic, and "<span>x</span> &" as text

  @AC-1 @AC-5
  Scenario: The Tafsir follows the Passages even with Passage headings held back
    Given the app is launched on a new device with Passage headings off and the Tafsir on
    When I open Surah 2 in the Uthmani Script and English
    Then the Surah shows no Passage heading at all
    And directly after Ayah 2:5, the last of the Passage 1–5, the Surah shows the Tafsir entries "1", "2", "3–4" and "5" with their texts as /api/v1/tafsir/2 answers them in "en", then its credit line

  # ---------------------------------------------------------------- AC-2: the release switch

  @AC-2 @AC-5
  Scenario: Launched as app.json ships it, with the Tafsir held back, Surah 2 shows no Tafsir and never asks for it
    Given the app is launched on a new device with the Tafsir switch as app.json sets it
    And every request the app makes is recorded
    When I open Surah 2 in the Uthmani Script and English
    Then the Surah shows no Tafsir at all
    And it shows every Ayah of Surah 2 from its /data/v1 Surah file
    And the app never asked /api/v1/tafsir

  # ---------------------------------------------------------------- AC-3: a long Passage's Tafsir comes once, after its last Ayah

  # The app reads a Surah whole, but its screen draws a long Passage's Ayahs a
  # few at a time (eight at first); the Tafsir is one item after the Passage's
  # last Ayah, never after the Ayahs drawn first.
  @AC-3 @AC-5
  Scenario: The Passage 2:47–60, longer than the screen draws at first, shows its Tafsir once, after Ayah 2:60
    Given the app is launched on a new device
    And the English Tafsir of Surah 2 has one entry for each Ayah of 2:47–60
    When I open Surah 2 in the Uthmani Script and English
    Then the Surah shows one Tafsir, directly after Ayah 2:60, with the 14 entries "47" to "60" in order

  @AC-3 @AC-5
  Scenario: An entry a Passage not yet redrawn splits is shown whole, after the later Passage
    Given the app is launched on a new device
    And the English Tafsir of Surah 1 is entries for 1:1–3, 1:4–5 and 1:6–7
    When I open Surah 1 in the Uthmani Script and English
    Then directly after Ayah 1:4, the last of the Passage 1–4, the Surah shows the Tafsir entry "1–3"
    And directly after Ayah 1:7, the last of the Passage 5–7, the Surah shows the Tafsir entries "4–5" and "6–7"

  # ---------------------------------------------------------------- AC-4: a Surah opens without a Tafsir it cannot read

  @AC-4 @AC-5
  Scenario: When the endpoint cannot read the Tafsir, Surah 2 opens without it, and the next opening shows it
    Given the app is launched on a new device
    And /api/v1/tafsir answers 503
    When I open Surah 2 in the Uthmani Script and English
    Then it shows every Ayah of Surah 2 from its /data/v1 Surah file
    And the Surah shows no Tafsir at all
    When /api/v1/tafsir answers again
    And I open Surah 2 in the Uthmani Script and English again
    Then directly after Ayah 2:5, the last of the Passage 1–5, the Surah shows the Tafsir entries "1", "2", "3–4" and "5" with their texts as /api/v1/tafsir/2 answers them in "en", then its credit line

  @AC-4 @AC-5
  Scenario: When the endpoint answers with something that is no Tafsir, Surah 2 opens without it
    Given the app is launched on a new device
    And /api/v1/tafsir answers 200 with entries that are no Tafsir entries
    When I open Surah 2 in the Uthmani Script and English
    Then it shows every Ayah of Surah 2 from its /data/v1 Surah file
    And the Surah shows no Tafsir at all

  @AC-4 @AC-5
  Scenario: A Surah with no Tafsir in the Language shows none
    Given the app is launched on a new device
    When I open Surah 1 in the Uthmani Script and Urdu
    Then it shows every Ayah of Surah 1 from its /data/v1 Surah file
    And the Surah shows no Tafsir at all
