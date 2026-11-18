Feature: A warm-up after each deploy renders every Theme page and Surah page into the cache
  Pages that read Themes render on their first request and are then served
  from Next's cache (ADR 0040). So that no reader meets a cold page, the
  deploy runs a warm-up against each new deployment, production's and each
  preview's (.github/workflows/deploy.yml, ADR 0020, ADR 0041):
  `pnpm warm-up <origin>`, with the deployment's DATABASE_URL. It requests
  every Theme page, by the slugs the database holds, and every Surah page, in
  Urdu and in English, and fails, naming each page, when one does not answer.

  These scenarios run the warm-up against the production build served on the
  run's own Postgres (./serve-api.ts), through a recording proxy that notes
  each page the warm-up asks for. The Theme slugs expected are the Themes file's
  as last committed (data/themes.json at 5127e94), which the Theme load put
  into the database; the Surahs are 1 to 114.

  @issue-170 @AC-5
  Scenario: The warm-up requests every Theme page and every Surah page in Urdu and English
    When the warm-up runs against the site
    Then it finishes without failing
    And it requested every Theme page of the 258 Themes in Urdu and in English, and each answered 200
    And it requested every Surah page of the 114 Surahs in Urdu and in English, and each answered 200
    And every one of those pages is then served from Next's cache

  @issue-170 @AC-5
  Scenario: The warm-up fails, naming each page that did not answer
    When the warm-up runs against the site while these pages answer 503:
      | page             |
      | /en/themes/faith |
      | /ur/2            |
    Then it fails, naming "/en/themes/faith" and "/ur/2"

  # A preview's deployment reads production's database, which has not had a
  # PR's new content migrations until it merges (ADR 0041): its pages that
  # read their tables cannot render, so the warm-up names them and warms
  # nothing. These run against a database of their own on the run's Postgres
  # that has had every content migration but one.
  @issue-170 @AC-5 @issue-171
  Scenario: The warm-up fails, naming each content migration the database has not had
    Given a database that has had every content migration but "0013-load-passages-and-phrases-files"
    When the warm-up runs against the site with that database
    Then it fails, naming "0013-load-passages-and-phrases-files"
    And it requested no pages

  @issue-170 @AC-5 @issue-171
  Scenario: With --skip-when-unmigrated, the warm-up names the content migration the database has not had and finishes without warming
    Given a database that has had every content migration but "0013-load-passages-and-phrases-files"
    When the warm-up runs against the site with that database and "--skip-when-unmigrated"
    Then it finishes without failing
    And it names "0013-load-passages-and-phrases-files"
    And it requested no pages
    And the step summary says the preview is not warmed until the migrations reach production

  # A PR that changes the Quran import's sources or tables (#173) reaches
  # production's database only on merge too: until then its last import is of
  # other sources, and the preview's pages that read the new tables cannot
  # render, so the warm-up names the Quran import as it names a content
  # migration.
  @issue-173
  Scenario: With --skip-when-unmigrated, the warm-up names the Quran import when the database's last import was of other sources
    Given a database that has had every content migration and an import of other sources
    When the warm-up runs against the site with that database and "--skip-when-unmigrated"
    Then it finishes without failing
    And it names "the Quran import"
    And it requested no pages

  # The Word counts that cut each Surah into parts live in Neon (#172, ADR
  # 0049): the warm-up reads them from the database it is given, as every page
  # does, not from a generated file. This runs against a database of its own
  # on the run's Postgres, made by `pnpm db:migrate`, in which every Ayah of
  # Surah 2 is then left only its first Word by SQL; the site it warms reads
  # the run's database, so each of the parts asked for still answers.
  @issue-172 @AC-6
  Scenario: The warm-up asks for each Surah's parts as the Word counts in its database cut them
    Given a database made by db:migrate in which every Ayah of Surah 2 holds only its first Word
    When the warm-up runs against the site with that database
    Then it finishes without failing
    And it requested every Surah page of the 114 Surahs in Urdu and in English, and each answered 200
    And it requested exactly the parts of Surah 2 that 286 Ayahs of one Word each make, in Urdu and in English
