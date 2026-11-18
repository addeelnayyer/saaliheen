// A Tafsir entry's text as the pages draw it (#234): its bold and italic
// markup, <b> and <i> as published, honoured; everything else, any other tag
// included, is text, shown word for word (ADR 0053).

/** A stretch of a Tafsir entry's text in one style. */
export interface TafsirRun {
  text: string;
  bold: boolean;
  italic: boolean;
}

/** The tags honoured: bold and italic, opening or closing. */
const TAG = /<(\/?)([bi])>/g;

/** A <b> or <i> tag in a Tafsir entry's text: where it is, how long, which and whether it closes. */
interface Tag {
  at: number;
  length: number;
  name: "b" | "i";
  closing: boolean;
}

/** The tags of `text` that are honoured, in order: each <b> or <i> with its own closing tag after it, pairs nesting. */
function pairedTags(text: string): Tag[] {
  const paired: Tag[] = [];
  const open: Tag[] = [];
  for (const { index, 0: { length }, 1: closing, 2: name } of text.matchAll(TAG)) {
    const tag = { at: index, length, name: name as Tag["name"], closing: !!closing };
    if (!closing) open.push(tag);
    else {
      const opener = open.findLastIndex((o) => o.name === name);
      if (opener < 0) continue;
      paired.push(open[opener], tag);
      open.splice(opener);
    }
  }
  return paired.sort((a, b) => a.at - b.at);
}

/**
 * `text` as runs of one style each, in order: a <b> or <i> opens its style
 * and its closing tag ends it; a tag with no partner, a closing tag with none
 * open or an opening tag never closed, is text.
 */
export function tafsirRuns(text: string): TafsirRun[] {
  const runs: TafsirRun[] = [];
  const open = { b: 0, i: 0 };
  const add = (piece: string) => {
    if (!piece) return;
    const style = { bold: open.b > 0, italic: open.i > 0 };
    const last = runs.at(-1);
    if (last && last.bold === style.bold && last.italic === style.italic) last.text += piece;
    else runs.push({ text: piece, ...style });
  };
  let from = 0;
  for (const { at, length, name, closing } of pairedTags(text)) {
    add(text.slice(from, at));
    from = at + length;
    open[name] += closing ? -1 : 1;
  }
  add(text.slice(from));
  return runs;
}
