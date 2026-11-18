# Allah references are hand-marked Word locations, not derived from Morphology

An Allah reference is shown in gold, so a Word in gold tells the reader "this is Allah". QUL's Morphology gives every Word a Lemma ([0003](0003-qul-owns-word-analysis.md)), and colouring every Word whose Lemma is ٱللَّه, رَبّ, رَحِيم and so on would need no list at all. We don't do that, because a Lemma doesn't say who a Word refers to:
- رَبِّكَ means the king in 12:42.
- ٱلۡعَزِيزِ is the Aziz of Egypt in 12:30.
- رَءُوفٞ رَّحِيمٞ describe the Prophet ﷺ in 9:128.
- إِلَٰه is mostly a false god.
- Many Allah references are pronouns and verbs (إِنَّهُۥ, جَعَلۡنَا, وَرَسُولَهُۥ) whose Lemma says nothing about Allah at all.

So Allah references are a list of Word locations, marked by hand.

The list is Saaliheen's own data, so it lives only in Neon from the start ([0011](0011-all-data-in-neon-behind-the-versioned-api.md)):
- A one-off seed loads it, exactly as given, from a self-prepared file, and the file is not kept in the repo.
- Admins correct it from then on in the Passage editor.
- Their publish is a transaction of its own: separate from the git commit that still publishes Passages and Phrases, refused when made against an older version of that Surah's Allah references, and kept as a revision naming the Admin.
- Pages showing a Surah are revalidated by that publish, so a fix reaches readers with no deploy.

## Considered Options

- **Derive from Lemmas with a hand-kept list of exceptions.** This needs fewer rows, but it can never reach pronouns and verbs. Every exception would also be a judgment hidden in code instead of data an Admin can see and edit.
- **One publish for Passages, Phrases and Allah references together.** The first two still publish to git and Allah references publish to Neon. Two systems can't share a transaction, so half a publish could land. Allah references publish on their own until Passages and Phrases move to Neon.
