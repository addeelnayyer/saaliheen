# The remembered index tab applies only on in-app arrivals

The Surah index has two tabs, Surahs and Juz, each at its own address (`/{lang}`, `/{lang}/juz`), and #193 asks that the last tab used be remembered per device but never applied to a shared link. On the website the tab the reader chooses — by tapping it, an arrow key or a swipe — is stored in the browser as `qwt-index-tab` (`"surahs"` or `"juz"`) through `storage.ts`, like the other per-device settings, and `apps/web/src/app/[lang]/index-tab.ts` owns it. Only a tab the reader chooses is written: arriving at an address, and the Surah bar's quick picker (which always opens on Surahs), never write it.

It is applied only on an arrival at Read's plain address, `/{lang}`, from inside the app (an arrival at `/{lang}/juz` already names a tab): when the Navigation API's activation entry key differs from the current entry key, the same test `in-parts/visits.ts` uses to tell an in-app arrival from a load. A direct load, a reload or a shared link shows the tab its address names and leaves the stored tab as it was. A browser without the Navigation API never applies it, so a link always shows what it says there. Applying it replaces the address in the same history entry, so the address keeps naming the tab on screen.

The mobile app has no addresses to share and does not persist the tab: its Read screen keeps the chosen tab while the screen stays mounted and opens on Surahs when it is created again. Whether the app should remember the tab across launches is open, left for #193's review.

## Consequences

- A shared `/{lang}/juz` link always opens on Juz, and a shared `/{lang}` on Surahs, whatever the visitor last chose.
- Switching tabs never adds a history entry, so Back leaves Read rather than stepping through the tabs.

## Considered Options

- Apply the stored tab on every arrival at `/{lang}`: rejected, because a shared link would then show something other than what it names.
- Keep the tab in the URL only, with no memory: rejected, because the issue asks for it to be remembered per device.
