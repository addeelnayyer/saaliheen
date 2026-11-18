# Saaliheen

A product for people who want to understand the Quran, and later the Hadith, offered as a website (saaliheen.com) and a mobile app with the same features and the same words. Its first feature is Quran Analysis. More features will follow, so no single feature describes the product.

_Avoid_: Quran Word by Word, Quran Says (earlier names for the product)

## Language

### Features

**Quran Analysis**:
The feature for reading the whole Quran one Word at a time, where every Word shows its Arabic text, its Word meaning and its Root, or, in Flowing, reading the Arabic on its own. A reader can listen to a Recitation while reading, and the page follows it.
_Avoid_: Reader, Word by Word, Study (now the name of an Ayah layout), Quran Word by Word

**Quran Chat**:
The feature where a person signed in with an Account asks questions about the Quran in Conversations and gets answers, in their Language, drawn only from Ayah translations and the Tafsir, in both Languages, each citing the Ayahs and Tafsir entries it rests on. It does not give rulings; for those it points to a Scholar.
_Avoid_: Quran Says, search, search engine, chatbot

**Quran Grammar**:
The feature for studying the grammar of every Word, a Surah at a time on its Grammar page: each Word's Part of speech, its grammatical features and its Segments. It is reached from Explore and kept apart from Quran Analysis: Study and Flowing do not lead into it. Visiting it is studying, not reading, so it leaves the Reading place where it was, never finishes a Surah, and offers no Recitation.
_Avoid_: Corpus (corpus.quran.com is a source, not this feature), morphology view, syntax, i'rab screen

**Read**:
One of Saaliheen's main destinations, and where Saaliheen opens: the Surah index. It is the one way back to the Surah index from anywhere.
_Avoid_: Home, Index

**Explore**:
One of Saaliheen's main destinations, listing every way to look into the Quran other than reading it in order, each with a line saying what it is, so a reader finds them all in one place: today the Themes list, the Roots list, the Iltifat pages, the Supplications page, Quran Chat and Quran Grammar, with more to come.
_Avoid_: Discover, features, more, browse

**Me**:
One of Saaliheen's main destinations, holding what belongs to the reader rather than the Quran: signing in or their Account, their Reading places, their Known words, their Language and settings, then the Credits, Privacy and Terms. It begins with Sign in for anyone not signed in.
_Avoid_: Profile, account page, settings page, You

**Tab bar**:
Read, Explore and Me as a row at the foot of the screen, on a phone or a narrow window and in the mobile app, the current one marked. On a Surah page it leaves while the reader reads down and returns on scrolling up, and stays away while the Recitation bar is on screen.
_Avoid_: Bottom nav, menu, footer

**Top bar**:
The slim strip at the top of every reading page: the brand, Sign in for anyone not signed in, and on a wide screen Read, Explore and Me, the current one marked. On a Surah page it is the top of the Surah bar's full form.
_Avoid_: App bar, header, navbar

**Conversation**:
One chat thread in Quran Chat that a person can come back to, holding their questions and the answers in order.
_Avoid_: Session, chat, thread

### Text

**Surah**:
One of the 114 chapters of the Quran, identified by its number (1–114).
_Avoid_: Chapter, sura

**Ayah**:
A single verse within a Surah, identified as `surah:ayah` (e.g. `2:255`).
_Avoid_: Verse, aya

**Word**:
One space-separated unit of Quranic text, including any attached particles or pronouns (e.g. وَٱلسَّمَآءَ is one Word).
_Avoid_: Token, segment, term

**Word location**:
The address of a Word as `surah:ayah:word`, with words counted from 1 within their Ayah (e.g. `1:5:2` is نَعْبُدُ).
_Avoid_: Word id, position, key

**Word meaning**:
The Urdu or English meaning of a Word at one specific Word location.
_Avoid_: Gloss, word translation

**Word card**:
One Word as Quran Analysis shows it: its Arabic text in the chosen Script, its Word meaning and, when it has one, its Root tag. A Word card does not show its Word location.
_Avoid_: Tile, word box

**Ayah translation**:
A full translation of one Ayah, shown under it when switched on: Fateh Muhammad Jalandhari in Urdu, Saheeh International in English, without footnotes.
_Avoid_: Tarjuma, verse translation

**Passage**:
A run of consecutive Ayahs within one Surah that talks about one thing and whose Tafsir is shown as a unit (e.g. 18:83–88, Dhul-Qarnayn's journey to the setting sun). The Passages divide the whole Quran: every Ayah belongs to exactly one Passage, a Passage never crosses from one Surah into the next, and a Passage never splits a Tafsir entry in either Language. A short Surah may be a single Passage.
_Avoid_: Section, group, range, topic. A Passage is not a Ruku.

**Juz**:
One of the 30 divisions of the Quran by length, identified by its number (1–30). A Juz can start and end partway through a Surah. Where the Juz start depends on the reader's Script, as each mushaf prints them: Uthmani follows the Madinah mushaf, where each Juz is two Hizb; Indo-Pak starts seven Juz elsewhere (e.g. Juz 23 at 36:22 rather than Uthmani's 36:28). The two agree for 23 of the 30. In either Script a Juz is named by the opening Words of its first Ayah in that Script, without the ۞ sign (e.g. وَمَا لِيَ for Indo-Pak Juz 23).
_Avoid_: Para, sipara, ajza, Surah part

**Hide Word meanings**:
A Reading setting for testing oneself: while it is on, no Word card in Study shows its Word meaning, known Word or not, though the meaning's space is kept so no card moves. While no Recitation plays, tapping a Word card shows that one meaning until it is tapped again or the reader leaves the page; while one plays, a tap carries the Recitation on from that Word, as always, and reveals nothing. Root tags, Ayah translations and the Tafsir are untouched, and so are Share pages and the Passage editor. It does nothing in Flowing, which shows no Word meanings. Off by default, kept per device and never synced to an Account.
_Avoid_: Study mode, Memorisation view, Revision mode, quiz mode

**Hizb**:
One of the 60 halves of a Juz, each divided into four Hizb quarters.
_Avoid_: Hizb sign (for the mark), half-Juz

**Hizb quarter**:
One of the 240 quarters of a Hizb, named by its place: Hizb 3, ¼ Hizb 3, ½ Hizb 3, ¾ Hizb 3. It is what the ۞ mark in a Madinah mushaf stands for.
_Avoid_: Rub', rub' al-hizb, maqra'

**Ruku**:
One of the traditional divisions of a Surah that Indo-Pak mushafs mark with ع, numbered within its Surah (e.g. Ruku 3 of Al-Baqarah). Saaliheen takes them as published and never edits them. A Ruku is not a Passage: the two often start and end at different Ayahs.
_Avoid_: Section, Passage, rukuh

**Phrase**:
A run of consecutive Words within one Passage that a reciter can say in one go, from a Word they may start at to a Word they may stop at. It may run past the end of an Ayah but never across the edge of a Passage. A Word belongs to at most one Phrase, so where the Quran allows a choice of where to stop (e.g. at رَيۡبَ or at فِيهِ in 2:2) an Admin picks one. Admins mark Phrases by hand; the pause marks printed in the Quranic text are not Phrases and are left as printed. A Passage is covered once every one of its Words is in a Phrase, and partly covered before that.
_Avoid_: Sentence, segment, clause, waqf, breath

**Phrase colours**:
The two soft tints that alternate, Phrase by Phrase, behind the Words of a Passage in Quran Analysis, in either of its Ayah layouts, and the Passage editor, so a reader sees where to start and stop without knowing the meaning. Readers see them in a Passage only once every Word in it is in a Phrase. A reader can switch them off; the choice is kept per device.
_Avoid_: Highlighting, stripes, waqf colours

**Allah reference**:
A Word that refers to Allah, by His name (ٱللَّه), one of His attributes (ٱلرَّحِيمُ), or a pronoun or verb whose subject or object is Allah (إِنَّهُۥ, جَعَلۡنَا). The whole Word counts, so وَرَسُولَهُۥ ("and His Messenger") is one. A Word only counts where it refers to Allah: رَبِّكَ in 12:42, where it means the king, is not one. Admins mark them by hand, Word location by Word location.
_Avoid_: Divine Name, Name of Allah, Asma' al-Husna (the 99 Names are a different, smaller set)

**Allah reference colour**:
The gold that the Arabic letters of every Allah reference are shown in, in Quran Analysis, on Share pages and in the mobile app, and in the Passage editor while marking Allah references. A reader can switch it off; the choice is kept per device, and marking Allah references shows it even then.
_Avoid_: Highlighting, gold highlight, divine colour

**Allah reference revision**:
One change to a Surah's Allah references, kept for good: the first loading of the owner's list, an Admin's publish, or an Admin's undo of an earlier publish or undo, which turns back that revision's own Word locations as a revision of its own, so no revision is ever rewritten. The seed's revision cannot be undone. It names who made it and when, the Word locations it added and removed, and the version of that Surah's Allah references it was made against. Each revision moves the Surah one version on, so a publish or an undo made against an older version is refused. Scholars review Allah reference revisions after the fact.
_Avoid_: Commit, edit, change log, history entry

**Passage title**:
A short phrase saying what a Passage is about, written by Saaliheen in both Urdu and English and shown in the reader's Language. It is Saaliheen's own wording, checked by a Scholar after the fact: an Admin's change to it reaches readers without waiting for a Scholar.
_Avoid_: Heading, caption, topic, subject

**Passage revision**:
One change to a Surah's Passages, Passage titles and Phrases, kept for good: their first loading, an Admin's publish, or an Admin's undo of an earlier publish or undo, which puts back the Passages and Phrases that revision changed as a revision of its own, so no revision is ever rewritten. An undo is refused when a later revision changed one of those Passages or Phrases again. The seed's revision cannot be undone. It names who made it and when, the edits it made and the Passages and Phrases it changed, and the version of that Surah's Passages and Phrases it was made against. Each revision moves the Surah one version on, so a publish or an undo made against an older version is refused. A publish that also changes the Surah's Allah references makes one revision of each, together or not at all.
_Avoid_: Commit, edit, change log, history entry

**Theme**:
Something the Quran speaks of (e.g. Patience, Hypocrisy, Prophet Musa), named in both Urdu and English and shown in the reader's Language. Every Ayah has at least one Theme, and an Ayah's Themes are shown under it in Study as chips that lead to its Theme page. The Themes are Saaliheen's own data, first imported from quran-says and cleaned up; each belongs to one Theme category. A Theme is not the light or dark paper the reader chooses.
_Avoid_: Tag, Topic, label, subject, keyword

**Theme category**:
One of the 13 groups the Themes fall into (e.g. Prophets, Worship), named in both Urdu and English. Every Theme is in exactly one Theme category.
_Avoid_: Tag group, Topic category, section

**Theme page**:
A page for one Theme at `/{lang}/themes/{slug}`: its name, Theme category and count of Ayahs, then its Ayahs in Quran order under their Passage groups, each Ayah's Arabic in the reader's Script with its Ayah translation when that is on, and a link to the Ayah in its Surah. It has no Word cards, Theme chips or Recitation.
_Avoid_: Tag page, Topic page

**Themes list**:
The page at `/{lang}/themes`, reached from Explore, that shows every Theme under its Theme category, the 13 Theme categories in a fixed order, each Theme with its count of Ayahs and leading to its Theme page. Its names are in the reader's Language; it shows no Theme's description, which is English only.
_Avoid_: Tag cloud, Topic index, Themes index, Theme directory

**Admin**:
One of a few named people who maintain Saaliheen's own content: they edit Passage titles, split, merge or move the boundaries of Passages, keeping every Ayah in exactly one Passage, mark Phrases and Allah references, keep the Iltifat in the Iltifat editor and the Supplications in the Supplication editor. An Admin signs in on the same Sign-in page as everyone else and is recognised by their email; GitHub is offered to Admins only. One person can be both an Admin and a Scholar.
_Avoid_: Editor, moderator, staff, user

**Passage editor**:
The Admin's page for one Surah's Passages, laid out like a Surah page, showing Word cards only in Phrases mode or while marking Allah references, where they edit Passage titles, boundaries, Phrases and Allah references and review them, choosing the Ayah layout, which Ayah translation is shown or none, and which Passages are collapsed. These choices change only what the Admin sees, never the Passages.
_Avoid_: Admin page, review page, editor screen

**Phrases mode**:
The Passage editor's mode, switched on and off from its toolbar, for marking Phrases: each open Passage shows its Ayahs Ayah by Ayah as Word cards tinted with the Phrase colours, even in a Passage not yet covered, and each Passage heading shows how many of its Words are in a Phrase. A Word in no Phrase is an unmarked Word, drawn with no tint and a dashed outline.
_Avoid_: Phrase editor, marking view, waqf mode

**Marking Allah references**:
The Passage editor's mode, switched on and off from its toolbar beside Phrases mode and never on with it, for marking Allah references: each open Passage shows its Ayahs Ayah by Ayah as Word cards, the Arabic of every Allah reference in Allah reference colour exactly as readers see it, and tapping a Word card turns it into an Allah reference or stops it being one.
_Avoid_: Allah mode, gold mode, Allah reference editor, highlighting mode

**Collapsed Passage**:
A Passage in the Passage editor showing only its Passage heading, its Ayahs hidden, so an Admin can scan titles and boundaries. It can still be retitled, joined or moved, but not split.
_Avoid_: Folded, hidden, minimised

**Unpublished changes**:
The edits an Admin has made to Passages, Passage titles and Phrases that readers cannot see yet. They are kept in the Admin's browser by Surah and by the version of that Surah's Passages and Phrases they were made on, can be undone freely, and reach readers only when the Admin publishes them, all together. They cannot be published while any Passage is missing a title in either Language or splits a Tafsir entry; a Passage only partly covered by Phrases can be. An Admin's changes to Allah references are Unpublished changes of their own, counted apart in the Unpublished changes bar and kept by Surah and by the version of its Allah references they were made on; Undo steps back the changes of the mode in effect, one at a time. One Publish sends the Passage, Phrase and Allah reference changes together, written to Neon all at once or not at all: readers see them on their next load, with no deploy. A publish made against an older version of either is refused and shows the Admin the latest, and the changes kept under the version that moved are set aside rather than applied.
_Avoid_: Draft, pending edits, changeset

**Content audit**:
The record, kept in Neon, of every change to Saaliheen's own content: Themes and Theme categories, the Iltifat with their Marked Words and Iltifat revisions, Allah references and Allah reference revisions, Supplications and Speakers with their revisions, and Passages, Phrases and Passage revisions. Each change is one entry naming what changed, the row before and after, when, and who made it: an Admin, a content migration, the Allah reference seed, or `unknown` for a change made any other way. The database writes it itself, and nothing changes or removes an entry. Unlike a revision, which is one Admin's publish or save, it also holds loads and hand-made fixes. The Quran text, Word meanings, Recitation timings, Roots and Tafsir are not in it, since they are rebuilt from the sources.
_Avoid_: Audit log, change log, history, revision

**Tafsir**:
A published commentary on the Quran by scholars other than Saaliheen, shown word for word and credited to its authors. Saaliheen shows one Tafsir, al-Mukhtasar, chosen once by a Scholar, in the reader's Language: its published English and Urdu editions, never Saaliheen's own translation. Its text is never edited and is not approved piece by piece. Saaliheen has no interpretation of its own. In Quran Analysis each Passage's Tafsir follows its last Ayah, open, in Study and in Flowing, with a short line crediting the edition; the Credits name it in full. A Surah downloaded in the mobile app keeps its Tafsir in the reader's Language. Share pages show no Tafsir.

**Tafsir entry**:
One piece of the Tafsir, written for one Ayah or for a few consecutive Ayahs together (e.g. 2:3–4), as its authors divided it. The English and Urdu editions may divide the Ayahs differently. A Passage's Tafsir is its Tafsir entries in order.
_Avoid_: Tafsir passage, note, comment, Explanation (an earlier, retired idea of Saaliheen's own interpretation), commentary, interpretation

**Scholar**:
A person qualified to choose which Tafsir Saaliheen shows and to review Saaliheen's own wording, such as Passage titles and revisions, after the fact.
_Avoid_: Reviewer, editor, alim

### Roots

**Root**:
The three or four Arabic letters that a Word derives from, written with spaces (e.g. ر ح م). Particles have no Root.
_Avoid_: Stem, radical, مادہ in English text

**Particle**:
A Word with no Root: prepositions, conjunctions and the like, and here also pronouns, alone or joined to a preposition (e.g. مِنْ, فِي, هُوَ, لَهُمْ), though a grammarian would not call a pronoun a particle. A particle is known by its Lemma (e.g. مِن covers مِنْ, وَمِن and مِنْهُمْ), or, when Morphology gives it none, by its Spelling with pause marks set aside. Every Word has a Root or a particle, never both, and a particle has one or more Spellings, as a Lemma has ([0060](docs/adr/0060-a-rootless-word-belongs-to-a-particle-numbered-by-frequency-and-published-beside-the-roots.md)).
_Avoid_: Rootless word, function word, harf (a Part of speech: a pronoun is a Particle but an Ism, not a Harf)

**Lemma**:
The dictionary form that a group of Words share under one Root (e.g. رَحِيم covers رَّحِيمٌ and ٱلرَّحِيمُ). A Root has one or more Lemmas.
_Avoid_: Form, headword, base word

**Morphology**:
The grammatical breakdown of every Word, giving its Root and Lemma, as published by QUL (Tarteel's Quranic Universal Library).
_Avoid_: Word analysis, analysis (Analysis is only used in Quran Analysis), Word grammar (a Word's Part of speech, features and Segments, from the Quranic Arabic Corpus)

**Spelling**:
The exact written text of a Word, including prefixes, suffixes and case endings (e.g. ٱلرَّحِيمُ). A Lemma has one or more Spellings, and each Spelling occurs at one or more Word locations.
_Avoid_: Form, variant, instance

**Root dialog**:
The window that opens over the page when a reader taps a Word's Root, showing the Root's letters, its Lemmas and each Lemma's Spellings. It opens on the Word whose Root tag was tapped: that Word's Lemma (or the Words with no Lemma, when it has none) stays in its usual place but is marked and opened, with the Word's Spelling and Word location marked within it, and the dialog brings that Spelling into view. Its Lemma keeps its mark when closed, until the dialog closes. Its head, the Root's letters, its Memorized? choice and the close button, stays in view while the Lemmas scroll, and the page beneath stays still until it closes. Its head also leads to the Root's Root page.
_Avoid_: Pop-up, modal, sheet, roots pop-up

**Root page**:
A page for one Root at `/{lang}/roots/{letters}`, its letters written without spaces (e.g. `/en/roots/رحم`, [0065](docs/adr/0065-a-root-page-is-addressed-by-its-letters-not-quls-id.md)): the Root's letters, transliteration, count of occurrences and of unique Words, and its Memorized? choice, then one section per Lemma in the Root dialog's order, the Words with no Lemma in a section of their own, and in each section one part per Spelling with its meaning and count. A row of the Lemmas with their counts leads to each section. Under each Spelling are the Ayahs it occurs in, in Quran order, each written out whole in the reader's Script with its Ayah translation when that is on, every Word of that Spelling in it marked on a pale tint, and a link to the Word location in its Surah; an Ayah holding two of the Root's Spellings appears under each. Each Spelling starts closed and shows its Ayahs, fifty at a time, when opened, except on a Root of fifty occurrences or fewer, whose Spellings all start open. It is reached from the Root dialog, the Roots list and the Known words page. It has no Word cards, Word meanings, Recitation, Phrase colours or Known words colour, and Study and Flowing do not apply. Visiting it is a look-up, not reading: it leaves the Reading place where it was and never finishes a Surah. It carries the site's default Link preview.
_Avoid_: Root view, concordance page, Root dialog

**Roots list**:
The page at `/{lang}/roots`, reached from Explore, that shows every Root under its first letter in alphabetical order, each with its transliteration, its count of occurrences and a tick when it is a Known Root, and leading to its Root page. Typing narrows it by letters, spaces ignored, or by transliteration. It does not list particles, and marking a Root is left to its Root page, the Root dialog and the Known words page.
_Avoid_: Roots index, Root directory, dictionary

**Particle tag**:
What a particle's Word card shows where a Root tag would be: its Lemma, or its Spelling when it has no Lemma. Tapping it opens the Particle dialog.
_Avoid_: Root tag (a particle has no Root), particle badge

**Particle dialog**:
The window that opens over the page when a reader taps a Particle tag, built like the Root dialog: the particle's Lemma and its Spellings with their meanings, or the one Spelling of a particle with no Lemma, and the reader's Memorized? choice for it. Like the Root dialog, it marks the tapped Word's Spelling and Word location and brings them into view.
_Avoid_: Particle pop-up, Root dialog

**Known words**:
The Roots and particles a reader has marked as memorised, each a Known Root or a Known particle, or not known at all: there is no state in between. A reader marks or unmarks one with Memorized? in the Root dialog or the Particle dialog, or on the Known words page on Me, whose two tabs, Roots and Particles, list every one with the same choice and count those marked, each Root leading to its Root page. A Known word is kept by its letters, so it outlasts the Quran's next import ([0057](docs/adr/0057-known-words-are-kept-by-their-letters-and-merged-per-entry-with-unmarks-kept.md)). Every browser and phone keeps its own Known words; with an Account they follow the person to every device, and for each Root or particle the newer mark or unmark wins, as Reading places do. They are private: Share pages and Quran Chat never see them.
_Avoid_: Memorised Roots, vocabulary, learned words, word bank

**Known Root**:
A Root a reader has marked in their Known words. Every Word with that Root is a known Word.
_Avoid_: Memorised Root, learned Root

**Known particle**:
A particle, by its Lemma or Spelling, that a reader has marked in their Known words. Every Word it covers is a known Word.
_Avoid_: Known function word

**Known word**:
A Word whose Root is a Known Root or which is a Known particle's Word.
_Avoid_: Familiar word, learned word

### Grammar

**Grammar page**:
One Surah in Quran Grammar, at `/{lang}/grammar/{surah}`: its Ayahs under their Passage headings, each Word whole in the reader's Script with its Word meaning and its Grammar line, each Ayah followed by its Ayah translation when that is on, a way to open any other Surah at its head and the previous and next Surahs by name at its foot. Arabic size, Meaning size, the Script, Ayah translation and light or dark apply there; Hide Word meanings does not, so Word meanings always show. It carries the site's default Link preview. It shows no Tafsir, Theme or Iltifat chips, and none of the Phrase colours, Allah reference colour or Known words colour: the Arabic is plain. A link to a Word location opens it at that Word, marked. Tapping a Word opens its Word grammar dialog. Its labels are interface, so they are in English with the Arabic grammar term beside them (e.g. Accusative · مَنْصُوب) in either Language, never in Urdu. It links to the Grammar guide.
_Avoid_: Grammar view, corpus page, i'rab page

**Word grammar**:
A Word's Part of speech, its grammatical features (Case, definite or not, gender, number, and for a Fi'l its Aspect, Verb form, mood, voice and person) and its Segments, as published by the Quranic Arabic Corpus, used as published. It is not Morphology, which gives Roots and Lemmas from QUL; where the two differ, the Word's Root and Lemma are Morphology's. It is Word by Word, never i'rab: it does not say why a Word takes its Case. A few Words the Corpus divides differently from Saaliheen's text have no Word grammar, and say so.
_Avoid_: Morphology, i'rab, syntax, analysis, tags

**Grammar line**:
The one short line under a Word on its Grammar page, coloured by its Part of speech and underlining the Word in the same colour: its Case for an Ism, its Aspect and Verb form for a Fi'l (Imperfect · Form IV), its kind for a Harf (Preposition). Everything else in its Word grammar is in its Word grammar dialog.
_Avoid_: Tag, label, badge, Root tag

**Word grammar dialog**:
The window that opens over a Grammar page when a reader taps a Word, built like the Root dialog: its head, the Word and its Word location, stays in view while its Segments follow in order, each with its Part of speech and every feature, a Verb form also by its pattern (Form IV · أَفْعَلَ). The Segments' Arabic is the Corpus's Uthmani text, even for a reader in Indo-Pak, and says so. It leads to the Word's Root dialog or Particle dialog.
_Avoid_: Grammar pop-up, details panel, Root dialog

**Case**:
Whether an Ism is nominative (marfoo', مَرْفُوع), accusative (mansoob, مَنْصُوب) or genitive (majroor, مَجْرُور). A Grammar page names it; it never marks the case ending in the Arabic.
_Avoid_: I'rab (the reasons, which Quran Grammar does not give), ending, harakah

**Verb form**:
Which of the derived patterns a Fi'l is built on, Form I to Form X and beyond (Form II, فَعَّلَ), named by its numeral on the Grammar line and by numeral and pattern in the Word grammar dialog.
_Avoid_: Bab, measure, wazn, binyan

**Aspect**:
Whether a Fi'l is perfect (madi, مَاضِي), imperfect (mudari', مُضَارِع) or imperative (amr, أَمْر).
_Avoid_: Tense

**Grammar guide**:
The one page that explains how to read a Grammar page: the three Part of speech colours, the three Cases, the Verb forms with their patterns, and what each label means. It is at `/{lang}/grammar/guide`, in English with the Arabic terms in either Language, as a Grammar page's labels are, and carries the site's default Link preview. Every Grammar page links to it, as does Quran Grammar's entry on Explore.
_Avoid_: Legend, key, help, tutorial

**Part of speech**:
What kind of Word or Segment it is, in the grammarians' three classes: Ism, Fi'l or Harf, each with finer kinds where useful (e.g. a pronoun or proper noun is an Ism, a preposition a Harf).
_Avoid_: Word type, POS, category

**Ism**:
A noun in the grammarians' broad sense: nouns, adjectives, pronouns, proper nouns and the like. Glossed in English as noun.
_Avoid_: Noun (as the term), nominal

**Fi'l**:
A verb. Glossed in English as verb.
_Avoid_: Verb (as the term), fiil, fe'l

**Harf**:
A word that is neither Ism nor Fi'l: prepositions, conjunctions and the like. It is a Part of speech, not a Particle: a pronoun is a Particle but an Ism, never a Harf. On screen it is never called a particle.
_Avoid_: Particle (a different idea, of Roots and Known words), letter

**Segment**:
One piece of a Word as grammar splits it: a prefix, its stem or a suffix, each with its own Part of speech and features (وَبِٱلْيَوْمِ is three: وَ + بِ + ٱلْيَوْمِ). A Word has one or more Segments; a Segment never stands alone as a Word.
_Avoid_: Piece, morpheme, affix (for the whole set), token

### Rhetoric

**Iltifat**:
A sudden turn in the Quran between the one speaking (I, We), the one spoken to (you) and the one spoken about (he, they, or a name such as Allah or your Lord), while still meaning the same person, for rhetorical effect (e.g. 1:2–5, where praise of Allah turns into "You alone we worship"). Saaliheen lists the Iltifat that M. A. S. Abdel Haleem catalogued, each at the Ayah he cites and shown with the run of Ayahs around it that the turn needs. One Ayah can hold more than one Iltifat: 17:1 turns from He to We and back to He. Each Iltifat has an Iltifat direction and a short reason saying what the turn does, written by Saaliheen and always in English whatever the reader's Language.
_Avoid_: Person shift, grammatical shift, turn, iltifāt (with diacritics)

**Iltifat direction**:
Which way an Iltifat turns, one of four: He → We, We → He, He → You and You → He, where "He" stands for anyone spoken about, "they" included. The other two, between I or We and You, have no Iltifat on Abdel Haleem's list: 36:22, the one classical example of I → You, is one he rejects.
_Avoid_: Shift type, category

**Disputed Iltifat**:
An Iltifat on Abdel Haleem's list that Saaliheen doubts, because the "I" or "We" belongs to people being quoted or the two persons may not be the same person. Its reason says why. It is shown with a Disputed tag but not counted with the others.
_Avoid_: Rejected, uncertain, weak

**Iltifat pages**:
The overview page, reached from Explore, that explains Iltifat and shows the four Iltifat directions with their counts, and one page for each direction listing its Iltifat in Quran order, each with its Ayahs and its reason. Visiting them leaves the Reading place where it was.
_Avoid_: Iltifat list, rhetoric page

**Marked Words**:
The Words of an Iltifat that carry its turn, marked by an Admin: the "from" Words, holding the person it turns from (لِلَّهِ in 1:2), and the "to" Words, holding the person it turns to (إِيَّاكَ in 1:5). Whole Words are marked even when the person is only an attached ending, as in أَنزَلْنَا. A Word can be marked in two Iltifat. An Iltifat is marked once both sides have a Word, and only then does its Iltifat page tint them; until then it shows its Ayahs plain.
_Avoid_: Highlighted words, pivot, turning point

**Iltifat editor**:
The Admin's page for going through the Iltifat one at a time, setting their Marked Words, reason, run of Ayahs and Disputed tag. Each Iltifat is saved on its own and reaches readers at once, without a Scholar. Iltifat are not added or removed there.
_Avoid_: Iltifat admin, annotation tool

**Iltifat revision**:
One save of one Iltifat in the Iltifat editor, kept for good. It names the Admin who saved it and when, holds the Iltifat as it was before and after, and the version of that Iltifat it was made against. Each revision moves the Iltifat one version on, so a save made against an older version is refused. The Iltifat's first loading from Abdel Haleem's list is its version 1 and has no revision.
_Avoid_: Commit, edit, change log, history entry

**Iltifat chip**:
The small chip at the foot of an Ayah in Study, after its Ayah translation, naming an Iltifat cited at that Ayah by its Iltifat direction and opening it on its Iltifat page. Flowing shows none.
_Avoid_: Badge, tag, marker

### Supplications

**Supplication**:
Words that someone in the Quran says to Allah asking something of Him (e.g. 2:201, "Our Lord, give us good in this world and good in the Hereafter"), held as a run of one or more consecutive Ayahs said by one Speaker: Ibrahim and Ismail's prayer at the Kaaba, 2:127–129, is one Supplication. Saaliheen's own data. Words addressed to Allah that ask nothing of Him in hope, such as the pleas of the people of Hell or a mocking demand, are not Supplications.
_Avoid_: Dua, du'a, prayer (kept for salah), invocation

**Opening**:
How a Supplication calls on Allah: Rabbana (رَبَّنَا, "Our Lord"), Rabbi (رَبِّ, "My Lord") or Other (e.g. Yunus's لَّآ إِلَٰهَ إِلَّآ أَنتَ in 21:87). A Supplication that calls on Allah both ways, as Ibrahim's in 14:35–41 does, has both Openings.
_Avoid_: Category, invocation form, rabbana category

**Other words to Allah**:
Words in the Quran addressed to Allah, mostly opening with Rabbana or Rabbi, that are not Supplications: the pleas of the people of Hell at the Judgment, a request for this world only, a complaint, a mocking demand, hypothetical or reported words. Each carries a plain label of its kind (e.g. Plea at the Judgment). They are kept beside the Supplications, with a Speaker and Opening, but the Supplications page shows them only when a reader asks to see them.
_Avoid_: Non-supplication, false dua, context type

**Supplication span**:
A stretch of consecutive Words in a Supplication's Ayahs that its Speaker says to Allah, from the first Word that addresses Him to the last Word asked, marked by an Admin. It can cross from one Ayah into the next (2:127:8 to the end of 2:129) and stop partway through one (7:143, before Allah's reply). The narrator's words (قَالَ, فَدَعَا رَبَّهُۥٓ), narrative, words said to others and Allah's replies lie outside it, so one Supplication can have several spans: 3:35–36 has two, with فَلَمَّا وَضَعَتۡهَا قَالَتۡ between them. Where a call is only reported, the span is what is said (أَنِّي مَغۡلُوبٞ فَٱنتَصِرۡ in 54:10). Other words to Allah have spans the same way. A Supplication with no span yet is not yet marked, and its Ayahs show plain.
_Avoid_: Highlight, Opening Words, dua text, marked range

**Speaker**:
Who says a Supplication, as the Quran or its immediate context identifies them: a Prophet (Musa), several people together (Ibrahim and Ismail) or a described group (the people of understanding). One Speaker says many Supplications: Musa is one Speaker, not one per Supplication. Named by Saaliheen in both Urdu and English and shown in the reader's Language, and marked as including a Prophet or not.
_Avoid_: Entity, supplicant, narrator, attribution

**Prophet's supplication**:
A Supplication whose Speaker includes a Prophet, counted even when others say it with him (Shuayb and the believers with him) and when Allah commands the Prophet Muhammad ﷺ to say it ("Say: My Lord, increase me in knowledge"). It is not the Prophet Muhammad ﷺ's own duas recorded in the Hadith.
_Avoid_: Prophetic dua, masnoon dua, sunnah dua

**Supplications page**:
The page at `/{lang}/supplications`, reached from Explore, that lists every Supplication in Quran order with its Speaker, each Ayah's Arabic in the reader's Script with its Ayah translation when that is on, and a link to the Ayah in its Surah. The whole Ayah is shown even where the Supplication is only part of it, its Supplication spans drawn on a pale tint of their own, whatever the reader narrows it to, and the rest left plain as context; the Ayah translation is never marked. A reader narrows it by Opening and to Prophet's supplications, the two together, and can ask to see the Other words to Allah beside them; the link carries these choices. It has no Word cards or Recitation.
_Avoid_: Duas page, Supplication list, Rabbana page

**Supplication editor**:
The Admin's pages for keeping the Supplications and their Speakers: changing a Supplication's Speaker, Openings, run of Ayahs, Supplication spans (marked on the run's Word cards by tapping a span's first and last Word) and whether it is a Supplication or Other words to Allah, adding and deleting Supplications, and adding, naming, marking which include a Prophet and deleting Speakers, though never a Speaker who still says a Supplication. Splitting a Supplication is shortening its run and adding the rest; joining two is deleting one and lengthening the other. A run never crosses into the next Surah, no Ayah is in two Supplications, and a Supplication span never leaves its run or overlaps another of its Supplication. Each save stands on its own and reaches readers at once, without a Scholar.
_Avoid_: Supplication admin, dua editor

**Supplication revision**:
One add, save or delete of one Supplication or one Speaker in the Supplication editor, kept for good, even after what it saved is deleted; one of a Speaker is also called a Speaker revision. It names the Admin who made it and when, holds what it saved as it was before and after (nothing before an add, nothing after a delete), and the version it was made against, 0 for an add. Each revision moves that Supplication or Speaker one version on, so a save or delete made against an older version is refused. The first loading of the Supplications is their version 1 and has no revision. Scholars review Supplication revisions after the fact.
_Avoid_: Commit, edit, change log, history entry

### Reading

**Surah index**:
The home page of Quran Analysis, where a reader finds where to read: their Reading places on top, then two tabs, Surahs (first, and where it starts) and Juz, switched by tapping a tab or swiping left and right. On the website the tab the reader last chose is remembered per browser and shown again when they come back to Read from inside the app, never on a shared link or a direct load, which show the tab their address names ([0036](docs/adr/0036-the-remembered-index-tab-applies-only-on-in-app-arrivals.md)). Search works in both tabs. Opening a Juz opens the Surah page where it starts, at its first Ayah; that is reading, not a look-up, so the Reading place moves there and goes on moving as they read.
_Avoid_: Home, contents, Juz index (the Juz tab is part of the Surah index)

**Section marks**:
The reader's choice of which traditional division is marked between Ayahs in Quran Analysis: Hizb quarters, where every reader starts, or Rukus. It looks the same in either Script and is kept per device, never on the Account.
_Avoid_: Dividers, markers, hizb signs, ruku signs

**Section mark**:
One mark of the reader's chosen division, standing between Ayahs above the Ayah where a Hizb quarter or a Ruku starts, and above any Passage heading there. It is a rule with a medallion holding its sign, ۞ (Hizb quarter) or ع (Ruku), centred on a disc, and a label: a Hizb quarter reads by its place (Hizb 3, ¼ Hizb 3, ½ Hizb 3, ¾ Hizb 3), a Ruku by its number in its Surah, the Surah's Ruku count and its Ayah count (Ruku 2 of 2 · 3 Ayahs). Saaliheen draws it from QUL's data; the ۞ and ع signs printed into each Script's text are not shown.
_Avoid_: Divider, marker, Hizb sign, Ruku sign, Section

**Script**:
The style of Arabic writing that the Quranic text is shown in: either Uthmani (Madinah mushaf) or Indo-Pak. Each Script has its own copy of the text, written to match its typeface.
_Avoid_: Font, rasm, khatt, Uthman Taha (no longer used)

**Language**:
The language that the Word meanings, Ayah translations, Tafsir, Root dialog meanings and Speakers' names are shown in: Urdu or English. The interface is always English, but for one message a reader must understand to go on: the mobile app's word that a Surah is not downloaded yet and needs a connection, which is in the Language.
_Avoid_: Locale, translation

**Surah bar**:
The bar that stays at the top of the screen on a Surah page. Its full form is the top bar (the brand, and from 900px wide Read, Explore and Me), then the Ayah layout switch, the Translation language switch and "Share Ayahs", then a slim row (the Reading settings button, the Surah's number and names with the title of the Passage being read beneath them, and the play button); its mini form is only the slim row. Reading down shows the mini form; scrolling up shows the full form. On a phone the tab bar leaves and returns with it, and stays away while the Recitation bar is on screen. Switching the Ayah layout is not reading, so the bar keeps its form. The top of the screen, where the Ayah at the top is read, is just below the bar in the form it shows. The previous and next Surahs are at the Surah's foot, by name, not on the bar.

**Passage heading**:
The line above the first Ayah of each Passage in Quran Analysis, showing its Passage title in the reader's Language and its Ayah range (e.g. 83–88). Every Passage has one, including a Surah that is a single Passage.
_Avoid_: Section header, divider, banner

**Reading place**:
The Ayah where a reader last stopped reading in one Surah in Quran Analysis, shared across Languages. A Surah has at most one Reading place, which moves on its own as they read, including while they listen to a Recitation; they never set it by hand. Finishing a Surah takes its Reading place away, and reading in it again starts a new one. Following a link to a Word location is a look-up, not reading, so it leaves the Reading place where it was. Where reading stops, the Reading place is the Ayah at the top of the screen: in Study, the first Ayah not yet read past; in Flowing, where one line can hold the end of one Ayah and the start of the next, the first Ayah that starts on the top line, or else the Ayah running through it.
_Avoid_: Bookmark (kept free for Ayahs a reader marks on purpose), last read, progress

**Reading places**:
A reader's ten most recent Reading places, newest first, so ten different Surahs they can continue. Reading in a Surah brings its Reading place to the top. Every browser and phone keeps its own Reading places; with an Account they follow the person to every device, and on first sign-in the two lists merge, keeping the newer Reading place for each Surah. Each keeps when it was read, so Reading places read in the mobile app with no connection reach the Account once the phone is back online and still take their place by when they were read. A Surah the reader has finished has no Reading place, and a finish follows the Account the same way: for each Surah, whichever is newer, the last read or the finish, wins.
_Avoid_: Reading history, recent reads, last read

**Finishing a Surah**:
Reading or listening to the end of a Surah in Quran Analysis, which takes its Surah's Reading place out of the Reading places, so it is no longer offered to continue. A reader finishes a Surah when scrolling stops, or they leave the Surah page, with the end of its last Ayah on screen, in Study or Flowing, but never just by opening it; or when a Recitation plays to the end of the Surah and stops there on its own. Where the reading began, a Juz's first Ayah or Ayah 1, makes no difference. A look-up never finishes a Surah, nor does the page following the Recited Word. Scrolling back up on the same visit leaves the Surah finished; only opening it again and reading starts a new Reading place.
_Avoid_: Completing, Khatm (the whole Quran read through), Done

**Surah part**:
A run of a Surah's Ayahs, in order, that arrives in one piece when the Surah is opened from inside the app: the first is small so the first Ayahs show quickly, the rest larger. Until its parts arrive the Surah shows a skeleton of its Ayahs. It is only how a Surah is delivered, never something a reader chooses or sees named.
_Avoid_: Juz, para, chunk, page

**Skeleton**:
The outline that stands in for a Surah's Ayahs until they arrive: the Surah's names over one placeholder per Ayah, replaced by the Ayahs themselves as they come. On the website it shows until a Surah's parts (or a Theme page's Theme parts, or a Grammar page's Grammar parts) arrive; in the mobile app it shows while a Surah downloads for the first time.
_Avoid_: Placeholder screen, shimmer, loading state, spinner

**Update prompt**:
What the mobile app shows when its version is below the oldest version the published Quran data still supports, asking the reader to update the app. The app checks at launch and whenever its connection comes back; offline it never shows it.
_Avoid_: Force update, upgrade nag

**Theme part**:
A run of whole Passage groups of a Theme page, in order, that arrives in one piece when the Theme page is opened from inside the app, as Surah parts do for a Surah: the first comes with the page, so its header and first Passage groups show at once, and the rest fill in below a skeleton. A Passage group is never split between two Theme parts, and a small Theme is a single one. Like a Surah part, it is only how a Theme page is delivered, never something a reader sees named.
_Avoid_: Theme chunk, Theme page part, page

**Grammar part**:
A run of a Grammar page's Ayahs, cut as its Surah's parts are, that arrives in one piece: the first comes with the page however it is reached, so its first Ayahs show at once, and the rest fill in below a skeleton. Like a Surah part, it is only how a Grammar page is delivered, never something a reader sees named.
_Avoid_: Grammar chunk, page

**Spelling part**:
A run of up to fifty of the Ayahs a Spelling of a Root occurs in, in Quran order, each Ayah once, that arrives in one piece. A large Root's page (one of more than fifty occurrences) arrives with every Spelling closed and none of its Ayahs: opening a Spelling, or choosing its Lemma, brings its first Spelling part, and Show more the next. A small Root's page arrives with each Spelling open, its one Spelling part with it. Like a Surah part, it is only how a Root page's Ayahs are delivered, never something a reader sees named.
_Avoid_: Spelling page, chunk, page

**Reading settings**:
The reader's choices of how Quran Analysis looks: Arabic size, Meaning size, Phrase colours, Allah reference colour, Known words colour, Hide Word meanings, the Script, Ayah translation and light or dark. They are all on Me, and while reading the Surah bar's Reading settings button opens the same choices in a sheet over the page (the Settings drawer on the website, the Settings sheet in the mobile app). Language is not one of them.
_Avoid_: Preferences, options, settings page

**Known words colour**:
The green tint behind every known Word in Quran Analysis, in Study and Flowing, where the Phrase colours sit, so a reader sees which Words they should already understand. While it is on the Phrase colours are not shown, though the reader's Phrase colours choice is left as it was and returns when it is switched off. The Allah reference colour and the Recited Word still show on a known Word. A reader switches it on; the choice is kept per device. It is never on Share pages or in the Passage editor.
_Avoid_: Known Roots view, Memorisation view, Revision mode, Study mode, green highlighting

**Arabic size**:
How large the Quranic text of Words is shown, in Quran Analysis and the Root dialog, chosen by the reader from a few fixed steps, shared across Languages and kept per device, since it depends on the screen. The Arabic Surah names on the Surah index are interface, not Quranic text, and keep their size.
_Avoid_: Font size, Arabic font size, zoom

**Meaning size**:
How large Word meanings and Ayah translations are shown, chosen by the reader as one setting for both, from a few fixed steps, shared across Languages and kept per device.
_Avoid_: Translation size, translation font size, font size, zoom

**Ayah layout**:
How a run of Ayahs is set out: Ayah by Ayah, Study or Flowing. A Share page uses Ayah by Ayah or Flowing as its Share layout; the Passage editor lets an Admin pick it for all Passages, each Passage set out on its own; a reader of Quran Analysis switches between Study and Flowing from the Surah bar while reading, starting in Study, each Passage set out on its own under its Passage heading, and the choice is kept per device. Switching keeps the Ayah at the top of the screen at the top, in view below the Surah bar; while the Recitation bar is on screen it keeps the Recited Word in view instead, and leaves the Reading place where listening put it. In Flowing a Word is as wide as its Arabic, a word space from the next, and a line breaks wherever the next Word no longer fits, an Ayah's last Word held with its end marker.
_Avoid_: Reading mode, view, verse by verse

**Ayah by Ayah**:
The Ayah layout where each Ayah's Arabic is followed by its Ayah translation, when one is shown, before the next Ayah begins. It is where a run of Ayahs starts unless someone picked otherwise.
_Avoid_: Verse by verse, interleaved

**Study**:
The Ayah layout of Quran Analysis where each Ayah's Arabic is its Word cards, with their Word meanings and Root tags, under the Ayah's own heading and followed by its Ayah translation, when one is shown, before the next Ayah begins. It is where Quran Analysis starts.
_Avoid_: Study mode, Root analysis, Word by Word, word cards view

**Flowing**:
The Ayah layout where the Arabic of all the Ayahs in a run goes on together, each ending as a printed mushaf ends it, followed, when an Ayah translation is shown, by their Ayah translations as one paragraph with each Ayah's number marked in it. In Quran Analysis it shows no Word cards, so no Word meanings or Root tags, and no Theme chips, but keeps the Phrase colours behind the Words.
_Avoid_: Reading, continuous, mushaf style

### Listening

**Reciter**:
The qari whose voice a Recitation is, e.g. Yasser ad-Dussary. For now Saaliheen offers one Reciter.
_Avoid_: Qari, voice, narrator

**Recitation**:
One Reciter's recorded reading of the Quran, timed Word by Word so Saaliheen knows when each Word is said. A reader plays it from an Ayah on to the end of its Surah, where it stops, and can tap a Word card while it plays to carry on from that Word. In Flowing, which has no Ayah headings, tapping a Word, or pressing Enter or Space on it, also plays from it when the Recitation is paused or stopped, from where the Reciter first says it; in Study a tap only carries on a Recitation already playing. It needs no Account. It begins at Ayah 1, so the Bismillah line above a Surah is not recited.
_Avoid_: Audio, tilawat, recording, playback

**Recited Word**:
The Word the Reciter is saying at this moment, whose Word card is marked, over its Phrase colour, while the Recitation plays; the Ayah it is in is marked faintly. In Flowing the Word itself is marked and, instead of marking its Ayah, the Arabic and Ayah ends of the other Ayahs are dimmed, their Phrase colours left as they are, for as long as the Recitation bar is on screen, paused or playing. When the Reciter goes back to repeat Words, the Recited Word goes back with them. The page follows the Recited Word unless the reader has scrolled away.
_Avoid_: Highlighting, highlighted word, current word, karaoke

**Recitation bar**:
The small bar that stays on screen while a Recitation plays, with play and pause, the previous and next Ayah, the Recitation speed and a way to stop. It tells the reader when the Recitation is loading or cannot play right now; reading carries on either way.
_Avoid_: Player, mini-player, audio controls

**Recitation speed**:
How fast the Recitation plays, chosen by the reader from a few fixed steps around normal, kept per device.
_Avoid_: Playback rate, tempo

### Accounts

**Account**:
One person's sign-in to Saaliheen, the same on the website and the mobile app, that carries their Script, Language, Reading places and Known words to every device they sign in on and is needed for Quran Chat. Every Account is on a Plan. Reading never needs an Account. Admin and Scholar are roles an Account holds, not Accounts of their own.
_Avoid_: User, Member, profile, login

**Sign-in**:
One device signed in to an Account: on the website through the Sign-in page, in the mobile app on Me through the phone's own Sign in with Google or Sign in with Apple sheet. Each device has its own, kept until that device signs out; deleting the Account ends every Sign-in to it, and deleting it asks for a Sign-in made in the last day, so the app asks for the same method's sheet again first. Signing out or deleting leaves the device's own Reading places and settings on it.
_Avoid_: Session, login, logged in

**Plan**:
What an Account is allowed to do, today only its Question limits. Every Account is on the Free Plan, the only Plan for now; paid Plans may follow.
_Avoid_: Tier, subscription, package

**Question limit**:
How many questions an Account may ask Quran Chat in one day and in one month, set by its Plan. Days and months are counted in UTC. Starting a new Conversation does not reset them. A change to a Plan's Question limits applies at once, even partway through a day.
_Avoid_: Quota, credits, rate limit, chat limit

### Sharing

**Shared Ayahs**:
What one Share page holds: a single Ayah, or a run of consecutive Ayahs within one Surah, up to a fixed limit unless the run is exactly one Passage. A link records the Ayahs by number, so it shows the same Ayahs forever; the Passage title appears on top only while the Shared Ayahs still match a Passage exactly.
_Avoid_: Selection, clip, excerpt, quote

**Share page**:
The page, at its own address, that shows Shared Ayahs inside a decorated Islamic frame with their Ayah translations, in the Language and Script of the person who shared it. It is a real page, not a picture: it is at least one screen tall and grows with its Ayahs, never cutting them short. Visiting it is not reading, so it leaves the Reading place where it was. Above the frame is a slim brand bar, the brand leading to the visitor's Surah index and a Language switch that keeps the Shared Ayahs; it has no tab bar.
_Avoid_: Share screen, frame, Ayah card, poster

**Link preview**:
The picture, title and short description that a messaging or social app shows under a Saaliheen link someone pastes, made for what that link points to rather than one picture for the whole site: a Share page's Shared Ayahs, a Theme page's Theme with its count of Ayahs, the Iltifat overview's Iltifat with their total, or an Iltifat direction page's Iltifat direction with its count of Iltifat. The Iltifat counts leave Disputed Iltifat out, as the pages do. Its picture is in English on both Languages and never shows Quranic Arabic. Other pages, such as the Surah index and the Themes list, carry the site's default preview.
_Avoid_: OG image, OPG, thumbnail, card

**Share layout**:
The Ayah layout a Share page sets out a run of Shared Ayahs in. The person sharing picks it and the link carries it; a visitor can switch it for themselves. A single Ayah looks the same either way, so it has no Share layout.
_Avoid_: Reading mode, view, verse by verse

**App link**:
A Share page link that, on a phone with the mobile app, opens the Share page in the app instead of the browser; on a phone without the app it opens on the website as before. Only Share page links are app links, so every other Saaliheen link still opens the website. A Share page opened from an app link shows the Shared Ayahs alone, as a visitor sees them, and like any Share page it leaves the Reading places as they were.
_Avoid_: Deep link, universal link, intent link
