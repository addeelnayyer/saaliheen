@issue-171
Feature: Every change to Passages, Phrases and Passage revisions is audited in content_audit
  The Passage tables, `passage`, `phrase` and `passage_revision`
  (passage-load.feature), are tables of Saaliheen's own data, so a trigger
  writes each insert, update and delete on them to `content_audit` (ADR 0022,
  ADR 0038): the table, the row's key (its primary key's columns and values),
  the operation, the row before and after as JSON, the time and the actor the
  writing transaction named, or `unknown`. The Passage load is a content
  migration, so it is audited by `migration`, its seed revisions included; an
  Admin's Publish is audited under the Admin's Account id.

  These scenarios run against the run's own Postgres
  (features/api/serve-api.ts) and read `content_audit` directly, which no
  endpoint answers. The Publish scenario writes a Publish's rows as a Publish
  writes them: in one transaction that names the Admin's Account id through
  the app's helper (src/content-audit.ts), so it holds whichever way the
  Publish endpoint (#171's AC-3) reaches it. Every scenario takes out the rows
  it added and puts back what it changed.

  # ---------------------------------------------------------------- AC-9: who changed Passages and Phrases

  @AC-9 @AC-1
  Scenario: The Passage load is audited as an insert of every Passage, Phrase and seed Passage revision, by `migration`
    Given `pnpm db:migrate` has loaded the Passages and Phrases into the run's database
    Then every row of `passage`, `phrase` and `passage_revision` has one insert audited by "migration", keyed by its primary key, with the row as loaded after it and nothing before

  @AC-9
  Scenario: An Admin's Publish is audited under the Admin's Account id
    Given I am signed in as the Admin
    And I note Surah 114's Passages, Phrases and Passage revisions, and the latest content audit row
    When a Publish by the Admin retitles Surah 114's first Passage in English as "A title the audit sees.", marks a Phrase over 114:1:1–114:1:2 and writes its Passage revision, based on Surah 114's current version and making the next, in one transaction that names the Admin's Account id as its actor
    Then the content audit since holds an update of Surah 114's first Passage in `passage`, by the Admin's Account id, keyed by its primary key, with its old English Passage title before and "A title the audit sees." after
    And the content audit since holds an insert into `phrase` of the Phrase 114:1:1–114:1:2, by the Admin's Account id
    And the content audit since holds an insert into `passage_revision` of the Publish's revision, by the Admin's Account id

  @AC-9
  Scenario Outline: A change to `<table>` that names no actor is audited as an insert, an update and a delete by `unknown`
    Given I note the latest content audit row
    When I insert a row into `<table>`, update it and delete it, each in a transaction that names no actor
    Then the content audit since holds, for `<table>`, exactly an insert, an update and a delete of that row, in that order, each by "unknown" and keyed by its primary key
    And the insert has nothing before and the row as inserted after
    And the update has the row as inserted before and as updated after
    And the delete has the row as updated before and nothing after

    Examples:
      | table            |
      | passage          |
      | phrase           |
      | passage_revision |
