# The app draws the website's tab icons with react-native-svg

The app's tabs, Read, Explore and Me, show an icon over each word, as the website's tab bar does (#192): an open book for Read, a compass for Explore, a person for Me, with the current tab's icon on a pill. The icons are the website's own SVG paths (`apps/web/src/app/[lang]/site-bar.tsx`, `ICON_PATHS`), drawn in the app with `react-native-svg`, a new native dependency of `@saaliheen/mobile` (installed through `expo install`, so its version matches the Expo SDK). The paths are copied into `apps/mobile/src/destinations.ts` with a comment naming their source, and the app's scenarios (`features/read-explore-and-me.feature`) check that each tab's path still equals the website's.

The icons are decorative: each tab is named by its word, and the icon is hidden from VoiceOver and TalkBack. The pill appears and leaves without animating, so Reduce Motion is respected.

## Consequences

- `react-native-svg` has native code: the next development build must be rebuilt (`expo prebuild` / a new dev client) before the app runs with the icons; an old dev build fails to find the module.
- A change to the website's icon paths fails the app's scenario until the app's copy follows it.
- Any later icon or drawing in the app can use the same dependency.

## Considered Options

- An icon font such as `@expo/vector-icons`: its book, compass and person differ from the website's, so the two apps would not look the same.
- Sharing the paths through a package in `packages/`: three short strings do not earn a package and a change to the website's imports; the scenario keeps the copy honest instead.
- Pre-rendered PNGs: they cannot follow the active and inactive tints or the dark theme without a set per colour.
