# QUL owns word analysis; roots.json only supplies Spelling meanings

_Terminology note (2026-09-30): "word analysis" here means what the glossary now calls Morphology. "Analysis" now names only the Quran Analysis feature._

Every Word's Root, Lemma and the counts in the Root dialog come from QUL's word-by-word morphology (root #76, lemma #75). Our approved `data/roots.json` is used only to look up the meaning shown for a Spelling in the Root dialog, matched by Word location. A Spelling with no entry there falls back to QUL's word-by-word meaning. The import writes a report of every disagreement (a Word location whose Root differs between the two, or that only one source covers) instead of silently resolving it.

Word cards always show QUL's word-by-word meaning for that Word location, because a meaning in `roots.json` is shared by every place a Spelling appears and can be wrong in a particular context.

## Considered Options

- `roots.json` as the authority for Roots: rejected so that the structure (Root, Lemma, counts) comes from one consistent, maintained source, while the hand-approved meanings still appear.
- Grouping the dialog by exact Spelling, as `roots.json` does: rejected in favour of grouping Spellings under QUL Lemmas (e.g. ر ح م has 78 Spellings).
