Amends [0050](0050-the-import-loads-the-roots-and-juz-lists-and-the-generated-dataset-is-gone.md): the import loads the particles too, and a Word names a Root or a particle, never both.

# A rootless Word belongs to a particle, numbered by frequency and published beside the Roots

A Word QUL gives no Root, a third of the Quran's Words, had no tag on its Word card and nothing to open (#249). Each now belongs to one particle. The particle is the Lemma QUL's word lemma database gives the Word's location. When it gives none, the particle is the Word's Spelling: its Uthmani text with pause marks set aside, as a Root's Spellings are (ADR 0003). So هُوَ, هُوَۖ and ۞ هُوَ are one particle. A particle has a kind (`lemma` or `spelling`), a text in each Script, an occurrence count and its Spellings, which have the same shape as a Root's Lemma's Spellings. The committed sources give 188 Lemma particles and 164 Spelling particles. The issue counted 226 Spelling particles by Uthmani text as written, before pause marks were set aside. Together they hold the 27,134 Words QUL gives no Root: 23,878 with a Lemma and 3,256 without. A Lemma particle has only QUL's Uthmani Lemma text, as a Root's Lemma does, so it reads alike in either Script. A Spelling particle's Indo-Pak text is its most frequent Spelling's, and can carry that Spelling's Indo-Pak pause marks.

**Numbers.** Particles have no id in QUL, so the dataset builder numbers them from 1, most frequent first, ties by first Word location. Particle 1 is مِن. A change to the sources can renumber them, as it can change any file. The dataset version then changes, so the app takes the new files together.

**Neon.** The import writes `particle (id, kind, text, indopak, occurrences, hash)`, `particle_spelling (particle, position, …)` and `particle_word (location, particle, spelling)`, as it writes a Root's Lemmas and Spellings. `word.particle_id` names a rootless Word's particle. The check `word_root_or_particle` refuses a Word with both a Root and a particle, or with neither. The import adds the column and the check to a Postgres it loaded before particles, then loads it again.

**/data/v1.** Each particle is one file, `/data/v1/particles/<id>.json`, beside the Root files. The website's Particle dialog reads the same file at `/particles/<id>.json`. The dataset version hashes the particle files last, after the Juz file. A rootless Word in a Surah file and a Surah part carries `particle: {id, kind, text, indopak}` right after its `root: null`. The field is new and optional, so an app that does not know it reads the Word as before.

**Website.** In Study, a rootless Word card shows a Particle tag in the reader's Script where a rooted card shows its Root tag. Flowing shows neither tag. Tapping the tag opens the Particle dialog, which is the Root dialog's sheet: it has the same sticky head, focus trap and still page, with the particle's Spellings in place of Lemmas. Its head carries Memorized?, which marks the particle Known by its kind and text (#251, ADR 0057).

## Considered Options

- particles by Uthmani text as written: hides that هُوَ and هُوَۖ are one word, and splits a particle across its pause marks.
- Every rootless Word a Spelling particle, ignoring QUL's Lemmas: loses that عَلَيۡهِمۡ and عَلَىٰ are one preposition, the grouping a reader most wants.
- QUL's Lemma ids as particle ids: only Lemma particles would have one. Spelling particles would need a second numbering, and the two would mix.
- particles inside the Root files, or as a Root with no letters: the app reads a Root file as a Root, letters included, and would need to tell the two apart everywhere.
