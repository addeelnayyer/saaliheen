@issue-172
Feature: The Iltifat API, the Iltifat pages and the Admin area read the Quran text, Word counts and Ayah translations from Neon
  The Quran text, Word meanings, Ayah translations, Surah metadata and Word
  counts live in Neon (#172, ADR 0049). An Admin's save of an Iltifat checks
  its Marked Words against Neon's Words; an Iltifat direction page shows
  Neon's Ayahs and Ayah translations; and the Admin's Surah list, Iltifat
  editor and Allah references page show Neon's Words and Surah names. Nothing
  reads the generated Surah, Surah index or Word counts files (AC-3).

  These scenarios run against the production build served on the run's own
  Postgres (features/api/serve-api.ts), after passages-read-from-neon
  (vitest.neon-rows.config.ts). No feature of this seam asks for an Iltifat
  page before them, and the Admin pages are read from Neon on each request.
  Before any of them, the Background changes one Surah's Quran rows in Neon by
  SQL, as nothing but an import could otherwise: a page or check that read the
  files would show them unchanged. The chosen Iltifat is the Iltifat in Neon,
  as the Iltifat migration loaded the catalogue, of the chosen Surah: the
  first Surah after Al-Fatihah that holds a Phrase (passages-read-from-neon
  chooses one that holds none, and the other features of this seam work in
  Surahs 87, 107 and 108), with the lowest cited Ayah, then the lowest id. Its
  changes, in one transaction:
  - the cited Ayah gains a Word after its last, a copy of that Word at the
    next Word location (the gained Word), so its Word count grows by one;
  - the cited Ayah's English and Urdu Ayah translations, and the chosen
    Surah's Latin name, have " (Neon)" added.
  The expected Arabic, Word meanings, Ayah translations and Latin name are read
  from the generated output as committed before the Quran moved
  (BEFORE_QURAN_MOVED), never typed. Where Neon has no word table yet, the
  rows are left as they are, and the scenarios fail on their own assertions.
  These rows, the saved Iltifat and the published Allah reference are not put
  back: no later feature of this seam reads the chosen Surah or the Iltifat.

  The Admin signs in through the Account test sign-in as admin@saaliheen.test,
  on the test configuration's Admin allow-list. Saves go through PUT
  /api/v1/iltifat/{id} with the Iltifat's whole editable state, as the
  Iltifat editor sends it.

  Background:
    Given Neon's Quran text, Word count, Ayah translations and Surah name of the chosen Iltifat's Surah were changed by SQL, before any page read them

  # ---------------------------------------------------------------- the Iltifat API's Word counts

  @issue-172 @AC-3
  Scenario: An Admin's save of the chosen Iltifat marking the Word its cited Ayah gained is accepted
    Given I am signed in as "admin@saaliheen.test"
    When I save the chosen Iltifat with its own version, keeping its Marked Words and marking the Word its cited Ayah gained on the "to" side
    Then the save answers 200
    And the answered Iltifat holds the Word its cited Ayah gained as a Marked Word on the "to" side
    And GET /api/v1/iltifat lists the chosen Iltifat with the Word its cited Ayah gained as a Marked Word on the "to" side

  @issue-172 @AC-3
  Scenario: A save marking the gained Word and the Word location after it is refused for the location after it alone, and changes nothing
    Given I am signed in as "admin@saaliheen.test"
    And I note the chosen Iltifat, its Marked Words and its Iltifat revisions
    When I save the chosen Iltifat with its own version, keeping its Marked Words and marking both the Word its cited Ayah gained and the Word location after it on the "to" side
    Then the save answers 422
    And the answer's error names the Word location after the gained Word, and not the gained Word
    And the chosen Iltifat, its Marked Words and its Iltifat revisions are as I noted them

  # ---------------------------------------------------------------- the Iltifat pages' Ayahs

  @issue-172 @AC-3
  # A direction page tints the Marked Words of an Iltifat marked on both sides only (#143).
  Scenario Outline: The chosen Iltifat's direction page in <Language> shows its cited Ayah as Neon holds it
    Given I am signed in as "admin@saaliheen.test"
    And I save the chosen Iltifat with its own version, keeping its Marked Words, marking the Word its cited Ayah gained on the "to" side and the cited Ayah's first Word on the "from" side
    And the save answers 200
    When I fetch the chosen Iltifat's direction page in <Language>
    Then the page answers 200
    And its entry for the chosen Iltifat is headed with the chosen Surah's Latin name as Neon holds it
    And it shows the cited Ayah's Ayah translation in <Language> as Neon holds it
    And it shows the Word its cited Ayah gained as a Marked Word, in Uthmani and in Indo-Pak the Arabic of the cited Ayah's last Word, whose copy it is

    Examples:
      | Language |
      | Urdu     |
      | English  |

  # ---------------------------------------------------------------- the Admin area

  @issue-172 @AC-3
  Scenario: The Admin's Iltifat editor of the chosen Iltifat shows the Word its cited Ayah gained
    Given I am signed in as "admin@saaliheen.test"
    When I fetch, as the Admin, the Iltifat editor of the chosen Iltifat
    Then the page answers 200
    And it is headed with the chosen Surah's Latin name as Neon holds it
    And it has a Word card for the Word its cited Ayah gained, holding the English Word meaning of the cited Ayah's last Word, whose copy it is

  @issue-172 @AC-3
  Scenario: An Admin's Allah reference Publish of the Word the cited Ayah gained is accepted, and the Surah's Allah references page shows its Arabic
    Given I am signed in as "admin@saaliheen.test"
    When I publish, against the chosen Surah's latest Allah reference version, the Word the chosen Iltifat's cited Ayah gained as an Allah reference
    Then the Publish answers 200
    When I fetch, as the Admin, the Allah references page of the chosen Surah
    Then the page answers 200
    And it is headed with the chosen Surah's number and its Latin name as Neon holds it
    And it lists the Word the cited Ayah gained beside the Uthmani Arabic of the cited Ayah's last Word, whose copy it is

  @issue-172 @AC-3
  Scenario: The Admin's Surah list names the chosen Surah as Neon holds it
    Given I am signed in as "admin@saaliheen.test"
    When I fetch, as the Admin, the Admin's Surah list
    Then the page answers 200
    And its link to the chosen Surah's Passage editor names the chosen Surah by its Latin name as Neon holds it
