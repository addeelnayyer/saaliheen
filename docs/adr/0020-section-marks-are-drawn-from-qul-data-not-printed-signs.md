Superseded in part by [0045](0045-taking-the-printed-hizb-sign-out-of-the-text-merges-the-spellings-it-split.md): taking out ۞ does change Roots' Spellings, merging 40 into the Spellings they belong to.

# Section marks are drawn from QUL data, not the printed signs

Each Script's text arrives with its own traditional marks printed into it: QPC Hafs glues the Hizb quarter sign ۞ to the front of a Word (199 times, e.g. `63:4:1`), and Digital Khatt Indo-Pak carries the Ruku sign ع in its Ayah-end text. So today an Uthmani reader sees only Hizb quarters and an Indo-Pak reader only Rukus. To let any reader choose either in either Script, Section marks are drawn by Saaliheen between Ayahs from QUL's Hizb quarter and Ruku metadata, and the printed ۞ and ع are removed from each Script's text when the dataset is built, so a mark never shows twice. The text Saaliheen shows therefore differs from its QUL source by exactly these signs, and only these.

## Considered Options

- Toggling the printed signs, hiding ۞ in Ruku mode and adding our own ع: rejected because Indo-Pak would keep its printed marks while Uthmani got drawn ones, so the same choice would look different in each Script, and a printed sign cannot carry a label such as "Ruku 3 of Al-Baqarah".
- Leaving the text alone and drawing marks beside the printed ones: rejected because each reader would see one division twice in one Script.

## Consequences

- The 41 Hizb quarters that start a Surah have no printed ۞, so the Hizb quarters come from QUL's metadata, not from the glyphs.
- Roots already strip ۞ when building a Spelling, so they are unaffected.
