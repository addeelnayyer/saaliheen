# Supplication spans are hand-marked from–to rows, saved with their Supplication

The Supplications page shows each Supplication's whole Ayahs, and in 83 of the 94 entries the call to Allah is not the run's first Word (#230). An Admin marks each Supplication's spans, the Words its Speaker says to Allah, in the Supplication editor, and the page draws them on a pale tint; narrative around them is left plain.

They are kept in a new content table made by a content migration ([0015](0015-content-tables-and-recorded-content-migrations.md)): one row per span, `supplication_id` (references `supplication`), `from` and `to`, each a Word location that may lie in a different Ayah of the run. A Supplication may have several spans (3:35–36 needs two, around its narrative) or none, in which case its Ayahs show plain, as an Iltifat with no Marked Words does ([0027](0027-marked-words-are-drawn-on-two-tints-of-their-own-and-said-by-side.md)).

Spans are part of a Supplication's whole saved state, as Marked Words are of an Iltifat's ([0026](0026-marked-words-are-rows-saved-with-their-iltifat.md)): a save must send `spans`, replaces the rows in the same transaction as the row and its Supplication revision, whose before and after carry them, and is refused 422 when a span's end is no Word of the Quran, lies outside the run, comes before its start, or overlaps another span, which also refuses a change of run that would strand one.

No span is loaded at the start: all 94 are marked by hand.

## Considered Options

- **Marking only the call** (رَبَّنَا, رَبِّ, ٱللَّهُمَّ): rejected. It shows why an Ayah was picked, but not where the Supplication ends: 7:143 and 3:41 stop before Allah's reply, and 3:35–36 has narrative between its two parts.
- **Finding the call by matching the Lemma رَبّ**: rejected. It finds nothing in 21:87 or in the reported calls (54:10), and it catches رَبّ used in narrative (7:89:25, 7:89:27).
- **A seed of "first call to the end of the run" for Admins to correct**: rejected, because it is wrong in exactly the hard cases, and readers would see it before anyone had checked it.
- **One row per marked Word**, as Marked Words are kept: rejected. A span is usually long (2:127–129 is about 50 Words), and from–to rows let a save check order and overlap once rather than infer spans from loose Words.

## Consequences

- Study and Flowing read no spans. The mobile app gets them because its Supplications entry opens the website's page.
- The Supplication editor shows the run's Ayahs as Word cards, where a span is added by tapping its first and last Word, and lists "Not yet marked" Supplications.
- The page draws each span as one element per Ayah piece, so the tint covers the spaces between its Words. It is said to a screen reader as a group, and the Ayah translation is not marked.
