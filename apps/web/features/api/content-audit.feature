@issue-170
Feature: Every change to Saaliheen's own data is audited in content_audit
  Every insert, update and delete on a table of Saaliheen's own data is
  written by a trigger to one `content_audit` table (ADR 0022, ADR 0038): the
  table, the row's key (its primary key's columns and values), the operation,
  the row before and after as JSON, the time and the actor. The app names the
  actor for each transaction: `migration` for a content migration, `seed` for
  the Allah reference seed, the Admin's Account id for an Admin's Iltifat save
  or Allah reference publish. A transaction that names none is recorded as
  `unknown`. The site's database role, the one in its DATABASE_URL, may only
  insert into `content_audit`, never update or delete its rows.

  The audited tables are the Theme tables (`theme_category`, `theme`,
  `ayah_theme`), the Iltifat's (`iltifat`, `iltifat_revision`,
  `iltifat_marked_word`), Better Auth's Allah reference tables
  (`allahReference`, `allahReferenceRevision`) and, since #199, the
  Supplications' (`supplication_speaker`, `supplication`,
  `supplication_speaker_revision`, `supplication_revision`, and since #270
  `supplication_span`), audited from
  their creation, as the Theme tables are. These scenarios run against the
  run's own Postgres (features/api/serve-api.ts) and read `content_audit`
  directly, which no endpoint answers. An Allah reference publish has no
  endpoint yet, so its scenario writes the publish's two rows as the publish
  will, in one transaction that names the Admin's Account id through the app's
  helper. Every scenario takes out the rows it added and puts back what it
  changed.

  # ---------------------------------------------------------------- AC-8: the actor the app names

  @AC-8
  Scenario: The Theme load is audited as an insert of every Theme row, by `migration`
    Given `pnpm db:migrate` has loaded the Themes into the run's database
    Then every row of `theme_category`, `theme` and `ayah_theme` has one insert audited by "migration", keyed by its primary key, with the row as loaded after it and nothing before

  @issue-199 @AC-6 @AC-17
  Scenario: The Supplication load is audited as an insert of every Speaker and Supplication row, by `migration`
    Given `pnpm db:migrate` has loaded the Supplications into the run's database
    Then every row of `supplication_speaker` and `supplication` has one insert audited by "migration", keyed by its primary key, with the row as loaded after it and nothing before

  @AC-8
  Scenario: An Admin's Iltifat save is audited under the Admin's Account id
    Given I am signed in as the Admin
    And I note the latest content audit row
    When I save the He → You Iltifat at 1:2–5 with the reason "A reason the audit sees."
    Then the save succeeds
    And the content audit since holds an update of that Iltifat in `iltifat`, by the Admin's Account id, keyed by its id, with its old reason before and "A reason the audit sees." after
    And the content audit since holds an insert into `iltifat_revision`, by the Admin's Account id, of the revision the save wrote

  @AC-8
  Scenario: An Admin's Allah reference publish is audited under the Admin's Account id
    Given I am signed in as the Admin
    And Surah 114 holds no Allah reference
    And I note the latest content audit row
    When an Allah reference publish by the Admin adds 114:1:1 to Surah 114, in one transaction that names the Admin's Account id as its actor
    Then the content audit since holds an insert into `allahReference` of 114:1:1, by the Admin's Account id
    And the content audit since holds an insert into `allahReferenceRevision` of the publish's revision, by the Admin's Account id

  @AC-8
  Scenario: The Allah reference seed is audited as `seed`
    Given Surah 114 holds no Allah reference
    And I note the latest content audit row
    When I run the Allah reference seed with a file holding 114:1:1 and 114:2:1
    Then the seed succeeds
    And the content audit since holds an insert into `allahReference` of each of 114:1:1 and 114:2:1, by "seed"
    And the content audit since holds an insert into `allahReferenceRevision` of the seed revision for Surah 114, by "seed"

  @AC-8
  Scenario Outline: A change to `<table>` that names no actor is audited as an insert, an update and a delete by `unknown`
    Given I note the latest content audit row
    When I insert a row into `<table>`, update it and delete it, each in a transaction that names no actor
    Then the content audit since holds, for `<table>`, exactly an insert, an update and a delete of that row, in that order, each by "unknown" and keyed by its primary key
    And the insert has nothing before and the row as inserted after
    And the update has the row as inserted before and as updated after
    And the delete has the row as updated before and nothing after

    Examples:
      | table                  |
      | theme_category         |
      | theme                  |
      | ayah_theme             |
      | iltifat                |
      | iltifat_revision       |
      | iltifat_marked_word    |
      | allahReference         |
      | allahReferenceRevision |

  @issue-199 @AC-6 @AC-17
  Scenario Outline: A change to the Supplications' `<table>` that names no actor is audited as an insert, an update and a delete by `unknown`
    Given I note the latest content audit row
    When I insert a row into `<table>`, update it and delete it, each in a transaction that names no actor
    Then the content audit since holds, for `<table>`, exactly an insert, an update and a delete of that row, in that order, each by "unknown" and keyed by its primary key
    And the insert has nothing before and the row as inserted after
    And the update has the row as inserted before and as updated after
    And the delete has the row as updated before and nothing after

    Examples:
      | table                         |
      | supplication_speaker          |
      | supplication                  |
      | supplication_span             |
      | supplication_speaker_revision |
      | supplication_revision         |

  # ---------------------------------------------------------------- AC-9: the audit cannot be rewritten

  @AC-9
  Scenario Outline: The site's database role cannot <change>
    Given the content audit holds rows
    And I note every content audit row
    When I <change>, connected as the site's database role
    Then the database refuses it
    And every content audit row is as noted

    Examples:
      | change                                    |
      | update a content audit row's actor        |
      | update every content audit row's after    |
      | delete a content audit row                |
      | delete every content audit row            |
      | truncate the content audit                |
