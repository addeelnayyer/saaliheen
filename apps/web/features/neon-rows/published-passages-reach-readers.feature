Feature: A Publish reaches every page and file showing its Surah's Passages and Phrases, with no deploy
  Within moments of an Admin's Publish (passage-publishing.feature), the
  Surah's page, its parts, its Share pages, its `/data/v1` file, the
  manifest's hash for it and the Theme pages using its Passages show the
  change, with no deploy (AC-5): the Publish refreshes the Surah's cache tags
  and the tags of the Theme pages whose Passage groups use it, stores the
  Surah's new content hash, and warms the Surah's page and parts in Urdu and
  English again (AC-6).

  These scenarios run on the neon-rows seam (vitest.neon-rows.config.ts),
  whose server and database no parity scenario reads, and publish in Surah 87
  only, which neither passages-read-from-neon.feature's chosen Surah (86) nor
  its chosen Theme uses. Surah 87's Passages are 1–5, 6–8, 9–13 and 14–19, it
  has no Phrase, and the Theme remembrance-of-allah has Ayahs in both 9–13 and
  14–19, as the Passages, Phrases and Themes files last held them
  (features/site/committed-output.ts), which the Background checks. Each
  scenario's Publish, against Passage version 1, makes:
  - the merged Passage: 14–19 joined into 9–13, which then runs 9–19 and is
    retitled with " (Published <n>)" added to its English and Urdu Passage
    titles, <n> the scenario's own number, so a page cached by an earlier
    scenario never passes for this one's;
  - the phrased Passage: one Phrase over 6–8, from its first Word to its last,
    so each of its Words takes Phrase colour "a" (ADR 0009).
  After each scenario Surah 87 is put back by SQL as loaded. Passage headings
  are not released in this build, so a Surah page shows its Passages by
  grouping its Ayahs, and Share pages show no Passage title.

  Background:
    Given Surah 87 holds its Passages as loaded, no Phrase and its seed Passage revision only
    And I am signed in as "admin@saaliheen.test"

  # ---------------------------------------------------------------- AC-6: warmed after each Publish

  # First, so no request of this feature has asked for Surah 87 before.
  @issue-171 @AC-6
  Scenario: After a Publish, the Surah's page and every Surah part in Urdu and English are warmed again, served from Next's cache on their first request
    When the Admin publishes the merged Passage and the phrased Passage
    Then the Publish is answered 200
    When 15 seconds have passed since the Publish was answered, with no request for Surah 87's page or parts
    Then Surah 87's page in Urdu and in English answers 200 from Next's cache on its first request
    And every Surah part of Surah 87 in Urdu and in English answers 200 from Next's cache on its first request, the merged Passage beginning at Ayah 9 with its published Passage title

  # ---------------------------------------------------------------- AC-5: what each address shows

  @issue-171 @AC-5
  Scenario Outline: Within moments of a Publish, Surah 87's page in <Language> groups its Ayahs by the published Passages
    When the Admin publishes the merged Passage and the phrased Passage
    Then the Publish is answered 200
    When I open Surah 87's page in <Language> in a browser
    Then the page answers 200
    And its Ayahs are grouped as published: 1–5, 6–8 and 9–19, none beginning at Ayah 14

    Examples:
      | Language |
      | Urdu     |
      | English  |

  @issue-171 @AC-5
  Scenario Outline: Within moments of a Publish, Surah 87's parts in <Language> carry the published Passages and Phrase colours
    When the Admin publishes the merged Passage and the phrased Passage
    Then the Publish is answered 200
    When I fetch every Surah part of Surah 87 in <Language>
    Then each part answers 200 with JSON
    And the merged Passage begins at Ayah 9, running to Ayah 19, with its published Passage title in <Language>
    And no Ayah of any part begins a Passage at Ayah 14
    And every Word of the phrased Passage has Phrase colour "a"

    Examples:
      | Language |
      | Urdu     |
      | English  |

  @issue-171 @AC-5
  Scenario Outline: Within moments of a Publish, the merged Passage, longer than 10 Ayahs, can be shared whole in <Language>
    When the Admin publishes the merged Passage and the phrased Passage
    Then the Publish is answered 200
    When I fetch the Share page of Surah 87's Ayahs 9–19 in <Language> in Uthmani
    Then the page answers 200
    And its Link preview title names Surah 87's Ayahs 9–19

    Examples:
      | Language |
      | Urdu     |
      | English  |

  @issue-171 @AC-5
  Scenario: Within moments of a Publish, Surah 87's /data/v1 file carries the published Passages and Phrase, and the manifest names its new stored hash
    When the Admin publishes the merged Passage and the phrased Passage
    Then the Publish is answered 200
    When a client fetches Surah 87's file from /data/v1
    Then it answers 200 with JSON
    And its Passages are 1–5 and 6–8 as loaded and the merged Passage 9–19 with its published English and Urdu Passage titles
    And its Phrases are exactly the phrased Passage's one Phrase
    And each Word of the phrased Passage has Phrase colour "a", and no other Word of the Surah has one
    When a client fetches the manifest from /data/v1
    Then the manifest names, for Surah 87, the SHA-256 of the Surah file /data/v1 just served
    And Neon stores that hash for Surah 87, in place of the one it stored before the Publish

  @issue-171 @AC-5
  Scenario Outline: Within moments of a Publish, the Theme page of remembrance-of-allah in <Language> groups its Ayahs by the published Passages
    When the Admin publishes the merged Passage and the phrased Passage
    Then the Publish is answered 200
    When I fetch the Theme page of remembrance-of-allah in <Language>
    Then the page answers 200
    And it shows one Passage group for Surah 87's merged Passage, its heading linking to Ayah 87:9, with the Theme's Ayahs of 9–19 under it
    And it shows no Passage group headed at Ayah 87:14

    Examples:
      | Language |
      | Urdu     |
      | English  |

  # ---------------------------------------------------------------- #172 AC-5: the manifest answered from stored hashes

  @issue-172 @AC-5
  Scenario: A Publish changes its own Surah's hash in the manifest, and no other file's
    When a client fetches the manifest from /data/v1, before the Publish
    And the Admin publishes the merged Passage and the phrased Passage
    Then the Publish is answered 200
    When a client fetches the manifest from /data/v1
    Then the manifest names, for Surah 87, the hash Neon now stores for it, not the one it named before the Publish
    And every other Surah's hash and every Recitation's hash is the one the manifest named before the Publish
    And the dataset version is not the one the manifest named before the Publish
