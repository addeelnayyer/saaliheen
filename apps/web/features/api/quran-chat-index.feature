@issue-77
Feature: Quran Chat's sources, embedded into Neon and searched by meaning
  Quran Chat answers only from the Ayah translations and the Tafsir, in both
  Languages (ADR 0053), so it finds what to answer from in an index of them in
  Neon (ADR 0056): every Ayah translation and every Tafsir entry, English and
  Urdu, embedded with OpenAI's text-embedding-3-small into pgvector. A Tafsir
  entry written for several Ayahs is one source pointing to each of them.

  The index follows its sources: `pnpm db:migrate`, which imports the Ayah
  translations, `pnpm db:load-tafsir`, which reloads the English Tafsir, and
  `pnpm db:index-quran-chat`, which the owner runs after putting the Urdu
  Tafsir in, each embed every source that is new or changed and drop every
  source that is gone, and embed nothing that is unchanged. Without
  OPENAI_API_KEY they leave the index as it is and say so.

  Here OpenAI is a fake that serves its embeddings endpoint on the run's
  machine, embedding a text by its words, so a question finds the sources that
  share its words, and a source's own text finds that source first. Each
  scenario starts with the sample's English Tafsir loaded and indexed:
  al-Mukhtasar's entries for Al-Baqarah 1–5, where 2:3–4 is one entry, and
  Al-Kawthar 1–3 (features/api/tafsir-sample.json).

  Scenario: Every Ayah translation is indexed in both Languages, and a question finds the Ayahs about it
    Dhul-Qarnayn is named in these Ayahs' translations in each Language, the English footnotes aside, and in no others.
    When I ask Quran Chat's sources "Dhul-Qarnayn"
    Then the 8 sources found first include the English Ayah translations of 18:83, 18:86, 18:88, 18:94 and 18:98
    When I ask Quran Chat's sources "ذوالقرنین"
    Then the 8 sources found first include the Urdu Ayah translations of 18:83, 18:86, 18:87, 18:94 and 18:95

  Scenario: `pnpm db:migrate` run again embeds nothing
    When I run `pnpm db:migrate` again
    Then it succeeds, saying Quran Chat's index embedded 0 sources and dropped 0

  Scenario: A Tafsir entry for several Ayahs is indexed once, pointing to each of its Ayahs
    When I ask Quran Chat's sources the sample's text of the Tafsir entry for 2:3
    Then the first source found is the English Tafsir entry for 2:3–4, pointing to 2:3 and 2:4, with that text
    And no other source found is a Tafsir entry for 2:3 or 2:4

  Scenario: Reloading the Tafsir indexes its changed entries and drops its old text
    When I load the sample with the text of 108:1 changed to "A corrected Tafsir of Al-Kawthar's first Ayah"
    Then the load succeeds, saying Quran Chat's index embedded 1 source and dropped 1
    When I ask Quran Chat's sources "A corrected Tafsir of Al-Kawthar's first Ayah"
    Then the first source found is the English Tafsir entry for 108:1, with that text
    When I ask Quran Chat's sources the sample's text of the Tafsir entry for 108:1
    Then no source found has that text

  Scenario: An entry a reload leaves out is dropped from the index
    When I load a file in QUL's format holding only the sample's entries for Surah 108
    Then the load succeeds, saying Quran Chat's index embedded 0 sources and dropped 4
    When I ask Quran Chat's sources the sample's text of the Tafsir entry for 2:3
    Then no source found is a Tafsir entry

  Scenario: The Tafsir's bold and italic markup is not part of what is indexed
    When I load the sample with the text of 108:2 changed to "Be <b>grateful</b> to <i>Allah</i> for this blessing"
    And I ask Quran Chat's sources "Be grateful to Allah for this blessing"
    Then the first source found is the English Tafsir entry for 108:2, with the text "Be grateful to Allah for this blessing"

  Scenario: The Urdu Tafsir the owner puts into Neon is indexed by `pnpm db:index-quran-chat`
    Given the owner has put the Urdu Tafsir entries "کوثر کی پہلی آیت کی تفسیر" for 108:1 and "کوثر کی آخری دو آیتوں کی تفسیر" for 108:2–3 into Neon
    When I run `pnpm db:index-quran-chat`
    Then it succeeds, saying Quran Chat's index embedded 2 sources and dropped 0
    When I ask Quran Chat's sources "کوثر کی آخری دو آیتوں کی تفسیر"
    Then the first source found is the Urdu Tafsir entry for 108:2–3, pointing to 108:2 and 108:3, with that text

  Scenario: Without OPENAI_API_KEY a reload loads the Tafsir and says the index was left as it was
    When I load the sample without OPENAI_API_KEY, with the text of 108:1 changed to "A Tafsir the index has not seen"
    Then the load succeeds, saying Quran Chat's index was not updated
    When I ask Quran Chat's sources "A Tafsir the index has not seen"
    Then no source found has that text
