Feature: Root files served on demand
  Each Root's dialog data is its own JSON file, `/roots/<QUL Root id>.json`,
  read from Neon and cached (#173), each the Root file last committed before
  the Roots moved into Neon, read from git. A Surah page embeds
  only its Words' Root tags; it fetches a Root's file when, and only when,
  that Root's dialog opens.

  @AC-5-14 @AC-5-13
  Scenario Outline: /<lang>/1 fetches ر ح م's file only when its Root dialog opens
    Given I watch every response the page receives
    And I open "/<lang>/1"
    When the page has finished loading
    Then no response so far holds a Root's file or ر ح م's transliteration "r-ḥ-m"
    When I open the Root tag on the Word card at 1:1:3
    Then the Root dialog for "ر ح م" is open
    And the page has fetched "/roots/1356.json" once and no other Root's file
    And that response is data/generated/roots/1356.json as last committed

    Examples:
      | lang |
      | ur   |
      | en   |

  @AC-5-14
  Scenario: Every Root in QUL's word root database is served as its own JSON file
    Then every Root id in QUL's word root database answers at "/roots/<id>.json" with status 200, a JSON content type and its committed file
    And these addresses are not found:
      | /roots/0.json    |
      | /roots/1356      |
      | /roots/abc.json  |
