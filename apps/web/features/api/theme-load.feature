@issue-170
Feature: Themes loaded into Neon once, by a content migration
  Themes are Saaliheen's own data and move into Neon (ADR 0011, ADR 0020). A
  content migration (ADR 0015) creates the Theme tables (ADR 0037):
  `theme_category` (slug, English and Urdu names), `theme` (slug, English and
  Urdu names, Theme category, description) and `ayah_theme` (each Ayah's
  Themes, by position in tagged order). A second loads them once from the
  Themes file, and refuses the whole load, naming the Ayah, when an Ayah has
  no Theme or names one the file does not hold: the checks the dataset build
  made until now. A loaded database runs neither again.

  These scenarios read the run's own Postgres (features/api/serve-api.ts),
  which `pnpm db:migrate` has migrated, and compare it with the Themes file as
  last committed before Themes moved (data/themes.json at 5127e94), which
  outlives the file's deletion. The refused loads run in a database of their
  own, beside the run's, so the run's Themes are never touched.

  # ---------------------------------------------------------------- AC-1: the load

  @AC-1
  Scenario: Every Theme category is loaded, with its slug and its English and Urdu names
    Given `pnpm db:migrate` has made the Theme tables in the run's database
    Then the Theme categories in the database are exactly the Themes file's 13, each with its slug and its English and Urdu names

  @AC-1
  Scenario: Every Theme is loaded, with its slug, English and Urdu names, Theme category and description
    Given `pnpm db:migrate` has made the Theme tables in the run's database
    Then the Themes in the database are exactly the Themes file's 258, each with its slug, its English and Urdu names, its Theme category and its description

  @AC-1 @AC-11
  Scenario: Every one of the 6236 Ayahs has its Themes, in tagged order, and each is a Theme the database holds
    Given `pnpm db:migrate` has made the Theme tables in the run's database
    Then every one of the 6236 Ayahs has, in order, the Themes the Themes file tags it with, and no Ayah has another
    And every Theme an Ayah has is one of the database's Themes

  @AC-1
  Scenario Outline: Ayah <ayah> has the Themes <themes>, in that order
    Given `pnpm db:migrate` has made the Theme tables in the run's database
    Then Ayah <ayah> has the Themes "<themes>", in that order

    Examples:
      | ayah | themes                                                                                                                        |
      | 4:36 | Oneness of Allah, Parents, Kinship, Orphans, Travellers, Kindness, Arrogance, Worship, Poverty, Slavery and Emancipation |
      | 2:25 | Paradise, Good News, Faith, Good Deeds, Reward, Plants                                                                        |
      | 2:62 | Faith, Jews, Christians, Good Deeds, Reward, Fear, Sadness                                                                    |

  @AC-1
  Scenario: Running `pnpm db:migrate` again changes no row
    Given `pnpm db:migrate` has made the Theme tables in the run's database
    And I note every row of the Theme tables and the latest content audit row
    When I run `pnpm db:migrate` again
    Then it succeeds, reporting 0 content migrations run
    And every row of the Theme tables is as noted
    And no content audit row has been written since

  # ---------------------------------------------------------------- AC-11: the dataset's Theme checks, now the load's

  @AC-11
  Scenario Outline: The Theme load refuses Themes where Ayah 2:255 has <change>, naming it, and writes nothing
    Given a database of its own, migrated by `pnpm db:migrate`, whose Theme tables are then emptied and whose Theme load is no longer recorded as run
    When its content migrations run with the Themes file changed so that Ayah 2:255 has <change>
    Then they fail, naming <named>
    And that database holds no Theme category, Theme or Ayah's Theme
    And that database does not record the Theme load as run

    Examples:
      | change                                       | named                       |
      | no Themes                                    | "2:255"                     |
      | no entry                                     | "2:255"                     |
      | the Themes "oneness-of-allah, no-such-theme" | "2:255" and "no-such-theme" |
