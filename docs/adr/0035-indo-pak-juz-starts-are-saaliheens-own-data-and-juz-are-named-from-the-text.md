# Indo-Pak Juz starts are Saaliheen's own data, and every Juz is named from its Script's text

[0021](0021-juz-boundaries-follow-the-script.md) gives each Script its own Juz, and needs an Indo-Pak Juz source beside QUL's Madinah Juz file. QUL publishes no Indo-Pak Juz file. So Saaliheen keeps its own: `apps/web/data/indopak-juz-starts.json`, beside the Passages and Themes files, lists only the seven Juz whose Indo-Pak start differs from Madinah's (4 → 3:92, 7 → 5:83, 11 → 9:94, 14 → 15:2, 20 → 27:60, 21 → 29:45, 23 → 36:22). The other 23 Indo-Pak Juz start where `data/qul/quran-metadata-juz.json` starts them. The builder reads both and writes each Script's 30 Juz to `data/generated/juz.json`, served as `/data/v1/juz.json`; each Juz ends at the Ayah before the next starts, and Juz 30 at 114:6. The seven starts were confirmed by the owner and await a Scholar's review; once the file moves into Neon, its rows are audited like the rest of Saaliheen's own data ([0022](0022-saaliheens-own-data-is-audited-row-by-row.md)).

0021 said an Indo-Pak Juz ends where a Ruku ends. That rule is withdrawn: against QUL's Ruku file and the Indo-Pak text's Ruku signs, eleven of the shared Madinah starts and 36:22 are not Ruku starts, so no Ruku rule derives these boundaries. The starts are data, not a rule.

No Juz name is typed or kept as data, which replaces 0021's "30 traditional names kept as Saaliheen's own data". Each Juz is named by the first two Words of its first Ayah in its own Script's Word text, joined by a space, with the ۞ sign QPC Hafs writes before a Hizb's first Word removed (Uthmani 36:28 opens with it). For Indo-Pak Juz 23 at 36:22 that gives وَمَا لِيَ.

## Consequences

- `juz.json` is new static data. Like every kind of data, it moves into Neon behind the versioned API ([0011](0011-all-data-in-neon-behind-the-versioned-api.md)), with the Indo-Pak starts as audited rows; until then 0001's rules apply to it.
- A name is two Words even where tradition knows the Juz by one (سَيَقُولُ is named with the Word after it); the rule is one line in the builder if a Scholar prefers another.
- `/data/v1/juz.json` joins the manifest's dataset version, so a change to any Juz changes it.

## Considered Options

- Derive the Indo-Pak starts from the Ruku signs: rejected, because the shared starts are not Ruku starts.
- Type the 30 traditional names: rejected, because scripture is quoted from the sources, never composed, and a typed name can drift from the text it names.
- List all 30 Indo-Pak starts in the file: rejected, because 23 would copy QUL's Madinah file and could drift from it.
