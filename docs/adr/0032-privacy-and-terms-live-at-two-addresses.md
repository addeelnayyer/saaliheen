# Privacy and Terms live at two addresses

Privacy and Terms keep the reader's Language in every link (#192), so they are now also at `/<lang>/privacy` and `/<lang>/terms`, under the reading pages' bars with Me marked; Me, the Surah index's footer and the documents' links to each other all lead there, and the mobile app opens them there (ADR [0029](0029-app-entries-without-a-screen-open-the-website-in-the-readers-language.md)). The unprefixed `/privacy` and `/terms` stay as they were, under the brand alone and without a redirect, because they are the addresses Google's and Apple's sign-in setups name. Both addresses render one text per document (`(documents)/<doc>/<doc>-text.tsx`), in English in either Language, as Credits is.

## Considered Options

- Redirecting `/privacy` and `/terms` to a Language: the sign-in providers' review fetches the address they were given, and a redirect to one Language would pick for a visitor whose Language is not known.
- Changing the providers' setups to the Language addresses: it names one Language for every visitor, and the old addresses would still need to answer for links already out.
