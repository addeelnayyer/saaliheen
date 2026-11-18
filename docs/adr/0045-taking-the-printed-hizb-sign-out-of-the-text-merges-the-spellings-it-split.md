# Taking the printed ۞ out of the text merges the Spellings it split

[0020](0020-section-marks-are-drawn-from-qul-data-not-printed-signs.md) said Roots are unaffected by taking the printed ۞ out of QPC Hafs's Words, because a Spelling's text already sets ۞ aside. That was wrong. QPC Hafs writes the sign as `۞ ` at the front of a Word, and the Spelling text dropped only the ۞, keeping its space, so the Words at a Hizb quarter (e.g. `4:36:1`, `5:97:1`) made 67 Spellings of their own, shown in the Root dialog with a ۞ before them. Now the builder takes `۞ ` off the Word (#194), so each of those Words is spelled as its Arabic letters alone: 40 of the 67 join the Spelling they always were, in 29 Roots, and the other 27 stay Spellings of their own without the sign. The generated Roots go from 18,842 Spellings to 18,802. Every Root and Lemma, every Word location's Root and Lemma, and every count of occurrences stay as QUL gives them ([0003](0003-qul-owns-word-analysis.md)); only how a Lemma's Word locations are grouped into Spellings changes. This supersedes 0020's consequence about Roots and nothing else in it.

## Consequences

- A merged Spelling's meaning comes from `roots.json` at its first Word location in Quran order, as for every Spelling, so a few Spellings may show a meaning from an earlier Word than before.
- The Spelling text keeps setting ۞ aside, as it does the pause and sajdah marks, so a Word's Spelling does not change if a source ever prints the sign again.

## Considered Options

- Keeping the old grouping, a Spelling of its own for each Word at a Hizb quarter: rejected because the ۞ is a division of the mushaf, not part of how the Word is written, and the split gave one written form two Spellings in the Root dialog.
