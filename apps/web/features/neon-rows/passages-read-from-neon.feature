Feature: Every page and file that shows a Surah's Passages, Phrases and Quran text reads them from Neon
  Passages, Passage titles and Phrases live in Neon (ADR 0011): the Surah
  page, its parts, its Share pages, its `/data/v1` Surah file, the manifest's
  hash for it and the Theme pages using its Passages all show what Neon holds,
  with no deploy (AC-5). Surah pages and parts render on request, are cached
  by tag, and are warmed after each deploy, every Surah in both Languages
  (AC-6).

  These scenarios run against the production build served on the run's own
  Postgres (features/api/serve-api.ts), on a server no other feature has asked
  for a page yet (vitest.neon-rows.config.ts). Before any page reads them,
  the Background changes one Surah's rows in Neon by SQL, as only a Publish could
  otherwise: it is how a scenario sees that a page reads Neon and not the
  files, since a page that read the files would show them unchanged. The
  Surah, its Passages and the Theme are chosen by the step from the Passages,
  Phrases and Themes files as last committed (features/site/committed-output.ts):
  the shortest Surah after Al-Fatihah that has no Phrase, whose two
  neighbouring Passages hold more than 10 Ayahs together and both hold Ayahs
  of one Theme. Its changes:
  - the first of the two Passages has " (Neon)" added to its English and Urdu
    Passage titles, and runs on to the second's last Ayah (the merged
    Passage); the second is deleted (the merged-away Passage);
  - the shortest other Passage of the Surah becomes one Phrase, from its first
    Word to its last (the phrased Passage), so each of its Words takes Phrase
    colour "a" (ADR 0009);
  - the Surah's stored content hash becomes the SHA-256 of a marker string.
  Passage headings are not released in this build, so a Surah page shows its
  Passages by grouping its Ayahs, and Share pages show no Passage title.

  The Quran text, Word meanings, Word counts and Recitation timings live in
  Neon too (#172, ADR 0049): every page, part, Share page and file showing the
  chosen Surah, the Admin's Allah reference Publish and the Allah references
  seed read them from there, and the manifest names each Recitation by the
  hash stored when the Quran was imported. The Background changes the chosen
  Surah's Quran rows as well, as nothing but an import could otherwise, the
  expected text read from the generated output as committed before the move
  (BEFORE_QURAN_MOVED); where no Quran table exists yet it changes nothing,
  and the scenarios that read those changes fail on their own. Its changes:
  - every Word meaning and Ayah translation of the chosen Surah, in English
    and Urdu, and the Surah's Latin name have " (Neon)" added;
  - the changed Ayah, the first of the chosen Theme's Ayahs in the merged
    Passage with more than one Word whose last Word the Recitation times,
    loses its last Word and that Word's Recitation timing, and its first
    Recitation timing ends 1 ms earlier;
  - the grown Ayah, the first other Ayah of the Surah for which the Surah's
    parts are cut the same with both changes, gains a Word after its last, a
    copy of that Word at the next Word location; so the Word counts change
    and the part addresses do not.
  These rows are not put back: no later feature of this seam reads the chosen
  Surah.

  Background:
    Given Neon's Passages, Phrases and content hash of the chosen Surah were changed by SQL, before any page read them
    And Neon's Quran text, Word meanings, Word count and Recitation timings of the chosen Surah were changed by SQL, before any page read them

  # ---------------------------------------------------------------- AC-5, AC-6: what each address shows

  @issue-171 @AC-5 @AC-6
  Scenario Outline: The chosen Surah's page in <Language>, asked for the first time, shows Neon's Passages and Phrases
    When I open the chosen Surah's page in <Language> in a browser
    Then the page answers 200
    And its Ayahs are grouped Passage by Passage as Neon holds them: the merged Passage one group, and no group beginning at the merged-away Passage's first Ayah
    And every Word card of the phrased Passage is drawn in tint A, the tint of Al-Fatihah's first Word card in <Language>

    Examples:
      | Language |
      | Urdu     |
      | English  |

  @issue-171 @AC-5 @AC-6
  Scenario Outline: The chosen Surah's parts in <Language> carry Neon's Passages and Phrase colours
    When I fetch every Surah part of the chosen Surah in <Language>
    Then each part answers 200 with JSON
    And the merged Passage begins at its first Ayah, running to the merged-away Passage's last Ayah, with its Passage title in <Language> as Neon holds it
    And no Ayah of any part begins a Passage at the merged-away Passage's first Ayah
    And every Word of the phrased Passage has Phrase colour "a"

    Examples:
      | Language |
      | Urdu     |
      | English  |

  @issue-171 @AC-5
  Scenario Outline: The merged Passage, longer than 10 Ayahs, can be shared whole in <Language>, as only a Passage can
    When I fetch the Share page of the merged Passage in <Language> in Uthmani
    Then the page answers 200
    And its Link preview title names the chosen Surah and the merged Passage's Ayahs
    When I open that Share page in <Language> from inside the app, in a browser
    Then its edit strip offers the merged Passage's last Ayah as the To Ayah from the merged Passage's first Ayah

    Examples:
      | Language |
      | Urdu     |
      | English  |

  @issue-171 @AC-5
  Scenario: The chosen Surah's /data/v1 file carries Neon's Passages and Phrases, and the manifest names Neon's stored hash
    When a client fetches the chosen Surah's file from /data/v1
    Then it answers 200 with JSON
    And its Passages are the chosen Surah's Passages as Neon holds them, each with its English and Urdu Passage titles
    And its Phrases are the chosen Surah's Phrases as Neon holds them
    And each Word of the phrased Passage has Phrase colour "a", and no other Word of the Surah has one
    When a client fetches the manifest from /data/v1
    Then the manifest names, for the chosen Surah, the content hash Neon stores for it

  @issue-171 @AC-5
  Scenario Outline: The chosen Theme's page in <Language> groups its Ayahs by Neon's Passages
    When I fetch the chosen Theme's page in <Language>
    Then the page answers 200
    And it shows one Passage group for the merged Passage, its heading linking to the merged Passage's first Ayah, with the Theme's Ayahs of both Passages under it
    And it shows no Passage group headed at the merged-away Passage's first Ayah

    Examples:
      | Language |
      | Urdu     |
      | English  |

  # ---------------------------------------------------------------- #172 AC-3, AC-5: the Quran text read from Neon

  @issue-172 @AC-3
  Scenario Outline: The chosen Surah's page in <Language> shows Neon's Quran text, Word meanings and Ayah translations
    When I fetch the chosen Surah's page in <Language>
    Then the page answers 200
    And it shows every Ayah translation and every Word meaning of the chosen Surah in <Language> as Neon holds them
    And it has no Word card for the changed Ayah's last Word, and one for the Word the grown Ayah gained

    Examples:
      | Language |
      | Urdu     |
      | English  |

  @issue-172 @AC-3
  Scenario Outline: The chosen Surah's parts in <Language> carry Neon's Quran text and Word count
    When I fetch every Surah part of the chosen Surah in <Language>, cut by Word count
    Then each part answers 200 with JSON
    And every Ayah translation and every Word meaning of the parts in <Language> is as Neon holds it
    And the changed Ayah and the grown Ayah hold their Words as Neon holds them

    Examples:
      | Language |
      | Urdu     |
      | English  |

  @issue-172 @AC-3
  Scenario Outline: The merged Passage's Share page in <Language> shows Neon's Ayah translations
    When I fetch the Share page of the merged Passage in <Language> in Uthmani, for its Ayah translations
    Then the page answers 200
    And it shows the changed Ayah's translation in <Language> as Neon holds it

    Examples:
      | Language |
      | Urdu     |
      | English  |

  @issue-172 @AC-3
  Scenario Outline: The chosen Theme's page in <Language> shows Neon's Ayah translations
    When I fetch the chosen Theme's page in <Language>, for its Ayah translations
    Then the page answers 200
    And it shows the changed Ayah's translation in <Language> as Neon holds it

    Examples:
      | Language |
      | Urdu     |
      | English  |

  @issue-172 @AC-3
  Scenario: The Passage editor's Ayahs of the chosen Surah are Neon's
    When the Passage editor fetches the chosen Surah's Ayahs
    Then it answers 200 with JSON
    And every Ayah translation and every Word meaning in it is as Neon holds it, in English and Urdu
    And its changed Ayah and grown Ayah hold their Words as Neon holds them

  @issue-172 @AC-3 @AC-4
  Scenario: The chosen Surah's /data/v1 file, the Surah index and its Recitation file are made from Neon's rows
    When a client fetches the chosen Surah's file from /data/v1
    Then it answers 200 with JSON
    And it is the chosen Surah's committed Surah file as Neon's rows now make it, its Passages, Phrases, Phrase colours and Themes set aside
    When a client fetches the Surah index from /data/v1
    Then the Surah index answers 200 with JSON
    And it is the committed Surah index, the chosen Surah's Latin name as Neon holds it
    When a client fetches the chosen Surah's Recitation file from /data/v1
    Then the Recitation file answers 200 with JSON
    And it is the chosen Surah's committed Recitation file with Neon's Recitation timings: the changed Ayah's last Word untimed, its first timing ending 1 ms earlier

  @issue-172 @AC-5
  Scenario: The manifest names the chosen Surah's Recitation by the hash stored at import, not one made from its rows
    When a client fetches the manifest from /data/v1
    Then it answers 200 with JSON
    And the manifest names, for the chosen Surah's Recitation, the SHA-256 of its committed Recitation file
    And that is not the SHA-256 of the Recitation file /data/v1 now serves for it
    And its dataset version is not one made from the Surah index and the Recitation files /data/v1 now serves

  @issue-172 @AC-3
  Scenario: An Admin's Allah reference Publish is checked against Neon's Words
    Given I am signed in as "admin@saaliheen.test"
    When I publish, against the chosen Surah's latest Allah reference version, the changed Ayah's last Word as an Allah reference
    Then the Publish is refused 422
    And nothing of the chosen Surah's Allah references or their revisions is written

  @issue-172 @AC-3
  Scenario: The Allah references seed is checked against Neon's Words
    When the seed runs with a file holding the changed Ayah's last Word
    Then it exits non-zero, refused, naming the changed Ayah's last Word
    And nothing of the chosen Surah's Allah references or their revisions is written

  # ---------------------------------------------------------------- AC-6: cached by tag, warmed after each deploy

  @issue-171 @AC-6
  Scenario: The chosen Surah's pages, parts and files are served from Next's cache, until a Publish refreshes them
    When I ask for each of the chosen Surah's addresses twice
    Then each answers 200 the second time, from Next's cache
    When the merged Passage's Passage titles are changed again in Neon, by SQL and not by a Publish
    Then each of those addresses still answers from Next's cache, with the same body as before

  @issue-171 @issue-172 @AC-6
  Scenario: After the warm-up, every Surah page and every Surah part in Urdu and English is served from Next's cache on its first request
    When the warm-up runs against the site with the run's database
    Then it finishes without failing
    And every Surah page of the 114 Surahs in Urdu and in English answers 200 from Next's cache
    And every Surah part of the 114 Surahs in Urdu and in English answers 200 from Next's cache
