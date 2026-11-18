@issue-115
Feature: The Recitation in the dataset
  A reader listens to Yasser ad-Dussary's Recitation of a Surah while its Word
  cards follow it (ADR 0010). The builder imports QUL resource 422's Word
  timings, `[word, start ms, end ms]` per Ayah on the clock of the Surah's one
  audio file, and the dataset holds one Recitation per Surah, published beside
  its Surah file so any client can read it. The timings follow the Reciter,
  not the text: they go back when he repeats Words, and a few Words have none.
  Expected timings are read from the committed source, never typed. That
  every Recitation is timed from the source is now the import's to show
  (features/import/quran-import.feature, #172).

  Background:
    Given the dataset is built from the committed sources

  @AC-115-1
  Scenario: Each Recitation is published as its own file, listed in the manifest
    When I make the manifest
    Then it lists 114 Recitation files, Surah 1 first, each at "/data/v1/recitations/<n>.json"
    And each Recitation file's hash is the SHA-256 of that Recitation's published file, in hex

  @AC-115-6
  Scenario: The Reciter repeats Words of 2:9, and its timings go back with him
    Then the Word timings of 2:9 run through Words 1 to 9, then 6 to 10

  @AC-115-2
  Scenario: The report lists the Words with no timing
    Then the report lists the untimed Words "21:87:9", "40:40:20", "49:11:33", "74:31:45" and "74:31:46"
    And every Word the source gives no timing is listed, and nothing else

  # Played from an Ayah, the Word the Reciter was saying before it, unheard,
  # is not the Recited Word: 2:8's last Word is said up to after 2:9 starts.
  @AC-115-3
  Scenario: Played from the start of 2:9, no Word is recited until 2:9's first Word starts
    Then played from the start of 2:9, the Recited Word at the start of 2:9 is none
    And played from the start of 2:9, the Recited Word at the start of 2:9's timing 1 is "2:9:1"

  @AC-115-6 @AC-115-7
  Scenario Outline: The Recited Word at <time> is <word>
    Then the Recited Word of Surah <surah> at <time> is "<word>"

    # Times come from the source: `start` and `end` of a Word's timing, by its
    # place in its Ayah's timings (the 10th timing of 2:9 is its second Word 6).
    # As the first Word starts; just before the second; as 2:9's repeat starts;
    # in the pause between two Ayahs; over 21:87:9, which has no timing.
    Examples:
      | surah | time                                  | word    |
      | 1     | the start of 1:1's timing 1           | 1:1:1   |
      | 1     | the start of 1:1's timing 2 less 1 ms | 1:1:1   |
      | 2     | the start of 2:9's timing 10          | 2:9:6   |
      | 1     | the end of 1:1's timing 4 plus 100 ms | 1:1:4   |
      | 21    | the end of 21:87's timing 8 plus 1 ms | 21:87:8 |

  # Tapping a Word card carries the Recitation on from where the Reciter first
  # says that Word (#109): the earliest of its timings, as he may repeat it.
  @issue-109 @AC-2
  Scenario Outline: The Reciter first says <word> at <time>
    Then the Reciter first says "<word>" at <time>

    # The 6th and the 10th timings of 2:9 are both its Word 6.
    Examples:
      | word  | time                        |
      | 1:1:1 | the start of 1:1's timing 1 |
      | 2:9:6 | the start of 2:9's timing 6 |

  @issue-109 @AC-2
  Scenario: A Word with no timing is never said
    Then the Reciter never says "21:87:9"
