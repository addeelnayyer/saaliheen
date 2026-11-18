Feature: Root disagreements in the report
  The builder reports every Word location whose Root differs between QUL's
  word root database and `roots.json`, or that only one of them gives a Root,
  instead of resolving it (ADR 0003). QUL writes a hamza Root letter as ا and
  `roots.json` writes the hamza itself, so Root letters are compared with every
  hamza letter read as ا. Each Root named here is checked against the sources.

  Background:
    Given the dataset is built from the committed sources

  @AC-5-5
  Scenario Outline: The report lists <location>, where the sources' Roots disagree
    Then the sources give "<location>" the QUL Root "<qul>" and the roots.json Root "<rootsJson>"
    And the report lists "<location>" with exactly those Roots

    # The two Roots differ; only QUL gives a Root; only roots.json gives one.
    Examples:
      | location | qul   | rootsJson |
      | 57:14:1  | ن د و | ن د ي     |
      | 2:181:10 | ب د ل |           |
      | 2:181:6  |       | أ ث م     |

  @AC-5-5
  Scenario: A Root written with a different hamza is not a disagreement
    Then the sources write the Root at "59:6:2" differently only in its hamza
    And the report does not list "59:6:2"

  @AC-5-5
  Scenario: The report lists every Root disagreement and nothing else
    Then the report lists 456 Root disagreements, in Word location order
    And 312 of them have Roots that differ, 87 only a QUL Root and 57 only a roots.json Root
    And each one's Roots are the sources' Roots at that Word location, which differ once hamza is read as ا
    And every Word location the sources disagree on is listed
