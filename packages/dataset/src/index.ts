// The dataset build (#64): the QUL import, Surah parts and Roots, as a shared
// package so the website, the server and the coming mobile app build the same
// dataset. `buildDataset` turns a directory of committed sources into the
// dataset and its report, which the Quran import loads into Neon (#172, #173):
// nothing is written to files.
//
// Pure pieces a reader also needs have their own entry points, which never
// load the builder's file and database readers: `@saaliheen/dataset/types`
// (the dataset's shape), `@saaliheen/dataset/grammar` (Word grammar's terms),
// `@saaliheen/dataset/parts` (how a Surah splits into parts),
// `@saaliheen/dataset/recitation` (which Word a Recitation is saying) and
// `@saaliheen/dataset/phrase-rules` (the Phrase rules the Passage editor shares).

export { buildDataset, type BuildOptions } from "./builder.ts";
export type * from "./types.ts";
export { LANGUAGES } from "./types.ts";
export { readWordGrammar, WORD_GRAMMAR_SOURCE, type GrammarSurahs, type WordGrammar } from "./word-grammar.ts";
