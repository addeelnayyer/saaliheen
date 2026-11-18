# Marked Words are drawn on two tints of their own and said by their side

An Iltifat's Marked Words (#143, [0026](0026-marked-words-are-rows-saved-with-their-iltifat.md)) are drawn the same way in two places: on its Iltifat page, once it is marked (both sides hold a Word), and on the Word cards of its editor. Each Word is drawn on its side's tint, two new tokens in `globals.css`: `--iltifat-from`, a sage, and `--iltifat-to`, a sand, one pair for light and one for dark. They are deeper than the Phrase colours (`--phrase-a`, `--phrase-b`), which are pale enough to sit under a whole Ayah, because Marked Words are a few Words that must stand out of one; the ink keeps well over 4.5:1 on both in both themes. The tints are opaque, so a Word reads the same colour on the editor's paper and on an Iltifat page's tinted panel of Ayahs.

On the page, a Marked Word is an element of its own inside the Ayah's Arabic, carrying `data-location` (its `s:a:w`) and `data-side`; an Ayah with no Marked Word stays one run of text, as before. A screen reader hears its side and person ("from He", "to We") through `role="group"` and `aria-label` on that element, so the text drawn stays exactly the Word's Arabic; a hidden span would change the text, and `<mark>` may not carry a label. Below the Ayahs, outside the Arabic, a key lists each side as "From He" / "To We" beside a swatch in its tint. An entry that holds two Iltifat of one run tints the Words of those that are marked; where two of them mark one Word, the first in Quran order gives its side.

In the editor, each Word card is a button. Two radio buttons, "From" and "To", choose the side a tap marks; a tap on a marked card takes it out whichever side holds it. The marked card's side is said with it in a visually hidden span. The cards and the fields share one editing state (`iltifat-editing.tsx`), so Save sends the Marked Words with the rest.

## Consequences

- Study and Flowing read nothing of Marked Words and draw none.
- The editor's list says "Marked" for an Iltifat both of whose sides hold a Word; "Not yet marked" is a checkbox that hides those with CSS, so the list stays one server render.
