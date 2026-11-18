# A published Tafsir replaces Saaliheen's own Explanations

Saaliheen was going to write its own Explanation of each Passage, in English and Urdu, each a Draft until a Scholar approved it. None was ever written, and approving thousands of them one by one would have held the feature back for years. Instead Saaliheen shows al-Mukhtasar fi Tafsir al-Quran al-Karim, written and reviewed by a committee at the Tafsir Center for Quranic Studies: its English edition from QUL (resource 266) and its published Urdu edition (mokhtasr.com), each in the reader's Language. A Scholar chose it once; its text is shown word for word, credited, and never edited or approved piece by piece, so Saaliheen has no interpretation of its own. The Tafsir lives only in Neon, read through the versioned API like the rest of the data ([0011](0011-all-data-in-neon-behind-the-versioned-api.md)). Since no one edits it, it can be reloaded from its sources at any time.

## Consequences

- Passages are redrawn so none splits a Tafsir entry in either Language, and the Passage editor refuses to publish one that does. The Tafsir's entries are mostly one Ayah long, so a Passage holds several of them and keeps its own topic and title.
- Quran Chat draws on the Ayah translations and the Tafsir in both Languages, not on Approved Explanations; issues #77 and #78 were written for Explanations.
- There is no Arabic Tafsir for now; QUL's Arabic edition (251) can be added later without new terms.
- The Tafsir is used as published, without a licence from the Tafsir Center, as Recitation is ([0010](0010-recitation-timings-imported-audio-streamed-from-qul.md)); mokhtasr.com's footer says "All rights reserved".

## Considered Options

- Saaliheen's own Explanations, each approved by a Scholar: the original plan, rejected because approval is the bottleneck and the interpretation would rest on Saaliheen rather than on recognised scholars.
- A different Urdu tafsir from QUL (Tazkirul Quran, As-Saadi) while QUL has no Urdu al-Mukhtasar: rejected, the two Languages would explain the Quran from different sources and Quran Chat would answer differently in each.
- Saaliheen's own Urdu translation of al-Mukhtasar: rejected once the published Urdu edition was found, as it would bring back Scholar approval of Saaliheen's wording.
- Tafsir entries as the Passages themselves: rejected, about 6,000 one-Ayah Passages would lose the one-topic, one-title reading unit.
