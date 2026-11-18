# Each Script uses its own font-matched Quran text

Uthmani is shown in QPC Hafs (QUL font 245) and Indo-Pak in Digital Khatt Indopak (QUL font 568). Neither font renders correctly with generic Unicode Quran text, so each Script carries its own word-by-word text from QUL (KFGQPC Hafs word by word for Uthmani, Digital Khatt Indopak word by word for Indo-Pak), looked up by Word location. Word meanings, Roots and Lemmas are shared across Scripts; only the Arabic text changes when the Script switches. The import checks that both texts have the same Word locations.

## Considered Options

- One shared text (e.g. Quran.com `text_uthmani`) with only the font swapped: rejected because QPC Hafs and Digital Khatt draw some marks wrongly or not at all with text that wasn't written for them.
- KFGQPC Uthman Taha font: rejected because it isn't available from QUL and would need the Tanzil text.
