# Static text is unselectable; only what a person types can be selected

On a phone, tapping or holding a Word card often started a text selection instead of opening the Root dialog: selection handles, a highlight, the iOS long-press callout or a grey tap flash. So no static text on Saaliheen can be selected. One global rule in `src/app/globals.css` turns off text selection for the whole document, turns off the iOS touch callout and makes the tap highlight transparent. The rule names `dialog` as well as the document root, because Chromium's own stylesheet makes a modal dialog such as the Root dialog selectable again. Text inputs and textareas turn selection back on, so the Surah search box (and any field added later, such as a Quran Chat input) can still be edited, selected and pasted into. The theme's selection colour stays and now only shows inside those fields.

This is about tap and long-press feel, not copy protection. Nothing blocks copying, the context menu or dragging in JavaScript, and screen readers and find-in-page work as before.

The cost is that people can no longer copy Quran text, Word meanings or Ayah translations by selecting them. The deliberate replacement is Copy text on the Share page ([#56](https://github.com/addeelnayyer/quran-word-by-word/issues/56)): it copies each Shared Ayah's Arabic and Ayah translation, then the translator, the reference and the link.

## Considered Options

- Turning off selection only on Word cards: rejected because the same stray highlights show up on the Surah index, the Surah bar, the Root dialog and the credits page, and one global rule with an opt-in for editable fields leaves nothing to remember per component.
- Blocking copy, the context menu or drag in JavaScript: rejected because the goal is feel, not protection, and blocking them would get in the way of assistive tools and browser features.
