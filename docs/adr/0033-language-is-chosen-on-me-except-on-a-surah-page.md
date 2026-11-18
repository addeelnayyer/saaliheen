# Language is chosen on Me, except on a Surah page

The parent spec of #192 (#191) moves Language from the bar into Me, and on every page but one it is: the index, Explore, Theme pages, Iltifat pages, Credits and the documents have no Language switch, and a reader switches on Me, then comes back by a destination. On a Surah page the Translation language switch stays, in the Surah bar's full form beside the Ayah layout switch, because there switching keeps the reader on the same Surah, at the same Ayah, and on a look-up's Word or Ayah, which a trip through Me would lose. A Share page keeps its own Language switch on its brand bar, keeping the Shared Ayahs and, for a sharer, the edit strip.

## Consequences

- One component, `LanguageSwitch` (`apps/web/src/app/[lang]/language-link.tsx`), draws the switch on the Surah bar, Me and the Share page's brand bar.
- The mobile app's Surah screen has no Language switch: there Language moved from the Settings sheet into Me and is chosen only there (ADR [0029](0029-app-entries-without-a-screen-open-the-website-in-the-readers-language.md)).
