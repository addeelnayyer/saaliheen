import { describe, expect, it } from "vitest";
import { tafsirRuns } from "./runs.ts";

describe("tafsirRuns", () => {
  it("reads a text with no markup as one plain run", () => {
    expect(tafsirRuns("Alif Lām Mīm – letters like these")).toEqual([{ text: "Alif Lām Mīm – letters like these", bold: false, italic: false }]);
  });

  it("keeps bold and italic, nested either way", () => {
    expect(tafsirRuns("a <b>bold <i>both</i></b> and <i>slanted</i>.")).toEqual([
      { text: "a ", bold: false, italic: false },
      { text: "bold ", bold: true, italic: false },
      { text: "both", bold: true, italic: true },
      { text: " and ", bold: false, italic: false },
      { text: "slanted", bold: false, italic: true },
      { text: ".", bold: false, italic: false },
    ]);
  });

  it("shows any other markup as text, word for word", () => {
    expect(tafsirRuns('<span class="x">see</span> <a href="/">here</a> <B>loud</B> & <br/>')).toEqual([
      { text: '<span class="x">see</span> <a href="/">here</a> <B>loud</B> & <br/>', bold: false, italic: false },
    ]);
  });

  it("shows a tag with no partner as text, a closing tag with none open or an opening tag never closed", () => {
    expect(tafsirRuns("x</b> <i>y <b>z</b>")).toEqual([
      { text: "x</b> <i>y ", bold: false, italic: false },
      { text: "z", bold: true, italic: false },
    ]);
  });
});
