# Word grammar is the Quranic Arabic Corpus, used as published, beside QUL's Roots

Quran Grammar needs each Word's Part of speech, features and Segments. QUL holds these, scraped from the Quranic Arabic Corpus, but publishes no download of them, only Roots, Lemmas and stems. So Word grammar comes from Corpus v0.4 as corrected in mustafa0x/quran-morphology, committed as published and never edited, but for the Corpus's copyright block, which the fork's file omits and the Corpus's terms require, restored above its lines with the commit it was taken from (#274), because the Corpus's terms forbid changing it and require naming the Quranic Arabic Corpus with a link to corpus.quran.com, which the Credits do. It is loaded into Neon by the Quran import like the rest of the Quran ([0049](0049-db-migrate-imports-the-quran-from-the-committed-sources-before-the-content-migrations.md)). Roots and Lemmas stay QUL's ([0003](0003-qul-owns-word-analysis.md)): the Corpus's own Root and Lemma are ignored, so a Word never shows two Roots.

## Consequences

- The Corpus counts 77,429 Words to our 77,432. The few Words it divides differently have no Word grammar; the import prints their Word locations, as it prints Root disagreements, and a scenario fixes their count.
- Segment text exists only in Uthmani. An Indo-Pak reader's Grammar page matches Word grammar by Word location and shows the Segments in Uthmani.
- No i'rab: the Corpus treebank covers about 40% of the Quran, and QUL's full-Quran treebank has no download or stated licence.
- The licence (GNU GPL with the Corpus's own terms of use) must be confirmed before the import merges.

## Considered Options

- QUL's segment tables: rejected, not published as a download.
- MASAQ (CC BY 3.0): a cleaner licence but a less established source, kept as the fallback if the Corpus's terms do not fit.
- Widening Morphology to take Roots from the Corpus too: rejected, it would reopen the 456 Root disagreements settled against QUL.
