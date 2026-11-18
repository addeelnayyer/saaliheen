Partly superseded by [0048](0048-the-mobile-app-signs-in-itself-with-the-phones-google-and-apple-sheets.md): Me's Sign in signs the app in itself; the other entries stand.

# App entries without a screen open the website in the reader's Language

The mobile app's root is three tabs, Read, Explore and Me, with the same entries and words as the website's destinations, in the same order (#192). Several of those entries have no screen in the app yet: Explore's Themes and Iltifat, and Me's Sign in, Credits, Privacy and Terms. Each opens the website's page in the device's browser, on the origin the app reads `/data/v1` from (`dataOrigin()`, `src/config.ts`), under the reader's Language: `/<lang>/themes`, `/<lang>/iltifat`, `/<lang>/sign-in`, `/<lang>/credits`, `/<lang>/privacy`, `/<lang>/terms`. The addresses are built in one place, `src/destinations.ts`, which the app's scenarios drive in Node.

Signing in on the website does not sign the app in: the browser's session is the website's, and the app has no Account of its own yet. Me's Reading places stay this device's, as before.

Me also takes over the Language from the Settings sheet. It is kept where it always was, under the website's key `qwt-language` in the device's storage, read and written through `src/language.ts` by both `ReaderProvider` and Me, so every screen follows a choice made in Me at once. The other reader settings (Arabic script, Ayah translation, Arabic size, Meaning size) show in Me and stay in the Settings sheet too, for changing them while reading.

Explore's cards in the app show a name and one line, no counts; the website's show live counts. No count endpoint is added for the app.

## Consequences

- The website owes each of these paths under both Languages; renaming one breaks the app's entry until the app ships again, so a change of path keeps a redirect.
- An in-app screen for any of these entries replaces its website entry later; it is a follow-up, not a change to this decision's addresses.
- The words both apps show are kept in each: the website's in `apps/web/src/app/[lang]/strings.ts` (`STRINGS`, `EXPLORE_LINES`), the app's in `apps/mobile/src/destinations.ts`, and Quran Chat's screen's in `apps/mobile/src/quran-chat.ts` (`QURAN_CHAT_WORDS`, #81). Only the tab icons are checked against each other (ADR [0031](0031-the-app-draws-the-websites-tab-icons-with-react-native-svg.md)); a change to a word or an Explore line is made in both.
- Signing in inside the app (an Account on the device, synced Script and Language, ADR [0008](0008-reader-data-in-neon-behind-a-nextjs-api.md)) is later work; until then the app's reader data stays on the device.

## Considered Options

- Leaving the entries out of the app until it has screens for them: the tabs would not have the website's entries and words, which the issue asks for.
- Opening the pages in an in-app browser: it would suggest the app is signed in when it is not, and adds a dependency for no gain over the system browser.
