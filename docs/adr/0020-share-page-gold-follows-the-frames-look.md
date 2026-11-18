# A Share page's Allah reference gold follows the frame's look, not the reader's saved theme

A Share page's frame B has a light and a dark look that follow the device's colour scheme alone ([#55](https://github.com/addeelnayyer/quran-word-by-word/issues/55)): the same address shows the same page to every visitor, and the saved theme is not read. Allah references on it are drawn in `--allah` ([0012](0012-allah-references-are-hand-marked-word-locations.md)), whose value the site sets on `<html>` from the saved theme.

So the Share frame sets `--allah` itself, per look: `#A87A0A` in the light look and `#E3B84F` in the dark look, the same values as the site's tokens. A reader whose saved theme is dark on a light-scheme device sees dark ink on cream paper, so a dark-theme gold on it would be unreadable.

- Only the reader's Allah reference colour switch ([#148](https://github.com/addeelnayyer/quran-word-by-word/issues/148)) is read from `<html>`: off means no gold, from the first frame, since the pre-paint script sets it.
- The gold is the Word's own text colour, so it dims with any Ayah that is dimmed.
- Allah references are marked on the Share page's Words through the same cached data module as a Surah page's, so a publish revalidates Share pages too. Copy text and the Link preview are built from the dataset's Words and are unchanged.
