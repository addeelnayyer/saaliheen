# Share page links open the app through app links set per request from two variables

A Share page link opens the mobile app on a phone that has it (#76). We made Share page links app links (iOS universal links and Android App Links) rather than links to an app-only scheme or a link service, so one link, `https://saaliheen.com/<lang>/share/…`, opens the app where it is installed and the website everywhere else, and the links already shared keep working.

- **What the app claims.** Only the Share pages' paths, `/ur/share/` and `/en/share/` (`SHARE_PATH_PREFIXES` in `@saaliheen/share`), in the website's `/.well-known/apple-app-site-association` and `/.well-known/assetlinks.json` and in the app's `associatedDomains` and Android intent filter. Every other page still opens the website, and the app needs no screen for it.
- **Where the identities come from.** The two files are built from `APPLE_TEAM_ID` (the Apple team that signs `com.saaliheen.app`) and `ANDROID_SHA256` (the signing certificates' SHA-256 fingerprints, comma-separated), read on each request (`connection()`), not at build time, so setting or rotating them in Vercel needs no new build. With a variable unset its file is still served, as valid JSON that claims nothing (`{"applinks":{"details":[]}}`, `[]`): the website is unchanged and Share page links open in the browser.
- **The simulator.** A simulator build is not signed by the team the file names, so app links cannot be checked there. The app also answers to its own scheme, `saaliheen://<lang>/share/…`, which `app/+native-intent.tsx` sends to the same Share page as the `https` link; the app never makes such links, it only opens them.
- **One copy of the rules.** The Share rules (which Shared Ayahs may be shared, a Share page's address and link, the text Share hands over) moved from the website into `packages/share` (`@saaliheen/share`), which the website and the app both use, so a link the app makes is one the website opens and the other way round.

## Considered Options

- A link service (Branch, Firebase Dynamic Links): another party in every link, and links that no longer point at saaliheen.com.
- Writing the two files at build time, or committing them: a new build or commit for each certificate change, and the team id in the repository.
- Claiming every path: every Saaliheen link would open the app, including pages the app does not have.
