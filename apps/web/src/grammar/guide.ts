// The Grammar guide's content (#280): how to read a Grammar page, for a reader
// who does not know Arabic grammar yet. The three Part of speech colours, the
// three Cases, the Aspects, the Verb forms with their patterns, and every
// kind an Ism's or a Harf's Grammar line can name. Every label and Arabic term
// is the grammar terms module's (@saaliheen/dataset/grammar), as the Grammar
// line's and the Word grammar dialog's are, so the three never disagree; only
// what each means is said here, keyed by the same codes, so a term the module
// adds cannot go unexplained. English, in either Language, as a Grammar page's
// labels are; a Harf is never called a particle.

import {
  ASPECTS,
  CASES,
  HARF_KINDS,
  ISM_KINDS,
  PARTS_OF_SPEECH,
  VERB_FORMS,
  verbFormTerm,
  type Aspect,
  type Case,
  type PartOfSpeech,
  type Term,
  type VerbForm,
} from "@saaliheen/dataset/grammar";

/** One label: as a Grammar line shows it, in English with its Arabic term, and what it means. */
export interface GuideEntry extends Term {
  /** How the Arabic term is said, where the guide gives it. */
  say?: string;
  meaning: string;
  /** The Part of speech whose colour the label is drawn in, as on a Grammar line. */
  partOfSpeech?: PartOfSpeech;
}

/** One part of the guide: its heading, what it says first, and its labels. */
export interface GuideSection {
  id: "colours" | "cases" | "aspects" | "verb-forms" | "ism-kinds" | "harf-kinds";
  title: string;
  intro: string;
  entries: GuideEntry[];
}

const PART_OF_SPEECH_MEANINGS: Record<PartOfSpeech, string> = {
  N:
    "A noun in the grammarians' broad sense: nouns, adjectives, pronouns, proper nouns and the like. Its Grammar line gives its Case, or, when it has none, what kind of Ism it is.",
  V:
    "A verb: a Word for something done or happening. Its Grammar line gives its Aspect and its Verb form, as Imperfect · Form IV.",
  P:
    "Any Word that is neither an Ism nor a Fi'l: prepositions, conjunctions, negatives and the like, most of them short. Its Grammar line gives what kind of Harf it is, as Preposition.",
};

const CASE_MEANINGS: Record<Case, { say: string; meaning: string }> = {
  NOM: { say: "marfoo'", meaning: "Most often the one a sentence is about, or what is said of it: the doer of a Fi'l, or the subject and its news." },
  ACC: { say: "mansoob", meaning: "Most often the one a Fi'l is done to, or an Ism after a Harf such as inna (indeed)." },
  GEN: { say: "majroor", meaning: "After a preposition, or the second of two Isms joined as \"the … of …\": the Lord of the worlds." },
};

const ASPECT_MEANINGS: Record<Aspect, { say: string; meaning: string }> = {
  PERF: { say: "madi", meaning: "Something done and complete, most often told in the past: he created." },
  IMPF: { say: "mudari'", meaning: "Something going on, done again and again, or still to come: he creates, he will create." },
  IMPV: { say: "amr", meaning: "A command or a request: create!, guide us!" },
};

const VERB_FORM_MEANINGS: Record<VerbForm, string> = {
  1: "The plain Fi'l, built from its Root's letters alone.",
  2: "The middle letter doubled: often doing it much, or making another do it.",
  3: "A long a after the first letter: often doing it with or to another.",
  4: "An a- before the first letter: often making something happen, or making another do it.",
  5: "Form II with ta- before it: often what Form II does, done to or by oneself.",
  6: "Form III with ta- before it: often doing it together, to one another.",
  7: "An in- before the first letter: often having it done to one, undergoing it.",
  8: "A -ta- after the first letter: often doing it for or to oneself.",
  9: "The last letter doubled: becoming a colour or having a mark.",
  10: "An ista- before the first letter: often seeking it, asking for it, or holding a thing to be so.",
  11: "As Form IX with a long a: becoming a colour, more strongly. Rare.",
  12: "The middle letter repeated around a w: doing it intensely. Rare.",
};

const ISM_KIND_MEANINGS: Record<keyof typeof ISM_KINDS, string> = {
  PN: "A name: of Allah, of a prophet, a people or a place.",
  PRON: "Stands for someone or something already known: he, you, we, them.",
  DEM: "Points to something: this, that, these, those.",
  REL: "Joins a description to what it describes: who, which, that which.",
  T: "Says when: when, then, the day that.",
  LOC: "Says where: where, in front of, beneath, with.",
  COND: "An Ism that sets a condition: whoever, whatever, wherever.",
  INTG: "An Ism that asks: who?, what?, how?, when?",
  NV: "An Ism that does a Fi'l's work, as a word of command or feeling does: fie!, far it is!",
  ADDR: "The ending that turns a Word toward the one spoken to, as the -ka of dhalika (that).",
};

const HARF_KIND_MEANINGS: Record<keyof typeof HARF_KINDS, string> = {
  P: "Puts the Ism after it in the Genitive: in, on, from, to, with, by.",
  DET: "Al-, the: makes the Ism it begins definite.",
  CONJ: "Joins Words or sentences: and, or, then.",
  SUB: "Turns the sentence after it into the sense of an Ism: that, to.",
  ACC: "Puts the Ism after it in the Accusative: inna (indeed) and its sisters.",
  NEG: "Denies what follows: not, never.",
  REM: "A wa- or fa- that opens a fresh statement, not joined to what came before in its grammar: and, so.",
  EMPH: "A la- that stresses what follows: surely, truly.",
  IMPV: "A li- that makes an imperfect Fi'l a command: let him do it.",
  PRP: "A li- of purpose: so that, in order to.",
  RES: "Limits what is said to one thing: only, none but.",
  CERT: "Qad: with a perfect Fi'l, certainly, already; with an imperfect, at times.",
  COND: "Sets a condition: if.",
  PRO: "A la that forbids: do not.",
  VOC: "Calls on someone: O.",
  RSLT: "Begins what follows from a condition: then.",
  CIRC: "A wa- that begins how things stood as something happened: while.",
  ADDR: "Turns what is said toward the one spoken to.",
  DIST: "The -l- of dhalika (that): what is pointed to is far.",
  ATT: "Calls attention to what follows: lo, now.",
  PREV: "A ma joined to a Harf such as inna that stops it changing the Case of what follows: innama, only.",
  SUP: "Added for emphasis; the sense would stand without it.",
  INTG: "Asks a question: is it?, do?",
  FUT: "Sa- or sawfa before an imperfect Fi'l: will, shall.",
  CAUS: "Gives the cause or the result of what came before: so, for.",
  ANS: "Answers what was asked or said: yes, yes indeed, no.",
  RET: "Bal: rather, nay; it sets aside what came before for what follows.",
  EXP: "Illa: except.",
  AMD: "Lakin: but, yet; it corrects or qualifies what was said.",
  INC: "Most often hatta: until, till; a whole new sentence follows it, not a single Ism.",
  SUR: "Idha of surprise: and behold, suddenly.",
  AVR: "Kalla: no indeed, by no means; it turns away what was said.",
  EXH: "Urges: why not?, if only.",
  EXL: "Amma: as for; it sets out the parts of what follows.",
  INT: "An in the sense of namely, that is: it explains what came before.",
  EQ: "The a- of \"whether … or\": it makes two things alike.",
  COM: "A wa- meaning with, together with.",
  INL: "The letters some Surahs open with, as Alif Lam Mim, whose meaning Allah knows best.",
};

// A record's codes, typed: a Verb form's are numbers, which index it as their strings do.
const keys = <K extends string | number>(record: Record<K, unknown>) => Object.keys(record) as unknown as K[];

/** The guide's parts, in the order it reads. */
export const GRAMMAR_GUIDE: GuideSection[] = [
  {
    id: "colours",
    title: "The three colours",
    intro:
      "Every Word on a Grammar page is one of the grammarians' three Parts of speech. Its Grammar line, and the line beneath its Arabic, are drawn in that Part of speech's colour, so the shape of an Ayah shows before any label is read.",
    entries: keys(PARTS_OF_SPEECH).map((code) => ({
      ...PARTS_OF_SPEECH[code],
      meaning: PART_OF_SPEECH_MEANINGS[code],
      partOfSpeech: code,
    })),
  },
  {
    id: "cases",
    title: "The three Cases",
    intro:
      "An Ism takes one of three Cases, by the part it plays in its sentence. Its Grammar line names its Case; why it takes it is not given.",
    entries: keys(CASES).map((code) => ({ ...CASES[code], ...CASE_MEANINGS[code], partOfSpeech: "N" })),
  },
  {
    id: "aspects",
    title: "Aspects",
    intro: "A Fi'l's Grammar line begins with its Aspect: whether what it tells of is done, is going on, or is commanded.",
    entries: keys(ASPECTS).map((code) => ({ ...ASPECTS[code], ...ASPECT_MEANINGS[code], partOfSpeech: "V" })),
  },
  {
    id: "verb-forms",
    title: "Verb forms",
    intro:
      "A Fi'l is built on one of a set of patterns from its Root's letters, here written with ف ع ل. Its Grammar line names the pattern's numeral; its Word grammar dialog gives the pattern too.",
    entries: keys(VERB_FORMS).map((form) => ({ ...verbFormTerm(form), meaning: VERB_FORM_MEANINGS[form], partOfSpeech: "V" })),
  },
  {
    id: "ism-kinds",
    title: "Kinds of Ism",
    intro: "An Ism with no Case, as a pronoun or a Word that never changes its ending is, has its kind on its Grammar line instead.",
    entries: keys(ISM_KINDS).map((code) => ({ ...ISM_KINDS[code], meaning: ISM_KIND_MEANINGS[code], partOfSpeech: "N" })),
  },
  {
    id: "harf-kinds",
    title: "Kinds of Harf",
    intro: "A Harf's Grammar line gives what kind of Harf it is.",
    entries: keys(HARF_KINDS).map((code) => ({ ...HARF_KINDS[code], meaning: HARF_KIND_MEANINGS[code], partOfSpeech: "P" })),
  },
];
