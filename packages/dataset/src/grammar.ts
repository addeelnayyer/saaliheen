// Word grammar (#275, ADR 0064): a Word's Segments as the Quranic Arabic
// Corpus publishes them, each with its Part of speech, finer kind and
// features, and the grammar terms: each tag and feature value the Corpus uses,
// by its Corpus code, with its English label and its Arabic term, never Urdu.
// The Grammar line, the Word grammar dialog and the Grammar guide all name
// them from here, so the three never disagree. Pure: a page may import it
// without the builder's file readers (./word-grammar.ts reads the source).

/** A grammar term: its English label and the Arabic grammarians' term. */
export interface Term {
  en: string;
  ar: string;
}

/** The grammarians' three Parts of speech, by the Corpus's tag. */
export const PARTS_OF_SPEECH = {
  N: { en: "Ism", ar: "اِسْم" },
  V: { en: "Fi'l", ar: "فِعْل" },
  P: { en: "Harf", ar: "حَرْف" },
} as const satisfies Record<string, Term>;
export type PartOfSpeech = keyof typeof PARTS_OF_SPEECH;

/** An Ism's finer kinds. */
export const ISM_KINDS = {
  PN: { en: "Proper noun", ar: "اِسْم عَلَم" },
  PRON: { en: "Pronoun", ar: "ضَمِير" },
  DEM: { en: "Demonstrative", ar: "اِسْم إِشَارَة" },
  REL: { en: "Relative pronoun", ar: "اِسْم مَوْصُول" },
  T: { en: "Time adverb", ar: "ظَرْف زَمَان" },
  LOC: { en: "Place adverb", ar: "ظَرْف مَكَان" },
  COND: { en: "Conditional noun", ar: "اِسْم شَرْط" },
  INTG: { en: "Interrogative noun", ar: "اِسْم اِسْتِفْهَام" },
  NV: { en: "Verbal noun of command", ar: "اِسْم فِعْل" },
  ADDR: { en: "Address suffix", ar: "ضَمِير خِطَاب" },
} as const satisfies Record<string, Term>;

/** A Harf's finer kinds: every Harf has one. */
export const HARF_KINDS = {
  P: { en: "Preposition", ar: "حَرْف جَرّ" },
  DET: { en: "Definite article", ar: "أَدَاة تَعْرِيف" },
  CONJ: { en: "Conjunction", ar: "حَرْف عَطْف" },
  SUB: { en: "Subordinating Harf", ar: "حَرْف مَصْدَرِيّ" },
  ACC: { en: "Accusative Harf", ar: "حَرْف نَصْب" },
  NEG: { en: "Negative Harf", ar: "حَرْف نَفْي" },
  REM: { en: "Resumption Harf", ar: "حَرْف اِسْتِئْنَاف" },
  EMPH: { en: "Emphatic lam", ar: "لَام التَّوْكِيد" },
  IMPV: { en: "Lam of command", ar: "لَام الأَمْر" },
  PRP: { en: "Lam of purpose", ar: "لَام التَّعْلِيل" },
  RES: { en: "Restriction Harf", ar: "أَدَاة حَصْر" },
  CERT: { en: "Harf of certainty", ar: "حَرْف تَحْقِيق" },
  COND: { en: "Conditional Harf", ar: "حَرْف شَرْط" },
  PRO: { en: "Prohibition Harf", ar: "حَرْف نَهْي" },
  VOC: { en: "Vocative Harf", ar: "حَرْف نِدَاء" },
  RSLT: { en: "Result Harf", ar: "حَرْف وَاقِع فِي جَوَاب الشَّرْط" },
  CIRC: { en: "Circumstantial Harf", ar: "حَرْف حَال" },
  ADDR: { en: "Address Harf", ar: "حَرْف خِطَاب" },
  DIST: { en: "Lam of distance", ar: "لَام البُعْد" },
  ATT: { en: "Attention Harf", ar: "حَرْف تَنْبِيه" },
  PREV: { en: "Preventive Harf", ar: "حَرْف كَافّ" },
  SUP: { en: "Supplemental Harf", ar: "حَرْف زَائِد" },
  INTG: { en: "Interrogative Harf", ar: "حَرْف اِسْتِفْهَام" },
  FUT: { en: "Future Harf", ar: "حَرْف اِسْتِقْبَال" },
  CAUS: { en: "Harf of cause", ar: "حَرْف سَبَبِيَّة" },
  ANS: { en: "Answer Harf", ar: "حَرْف جَوَاب" },
  RET: { en: "Retraction Harf", ar: "حَرْف إِضْرَاب" },
  EXP: { en: "Exceptive Harf", ar: "أَدَاة اِسْتِثْنَاء" },
  AMD: { en: "Amendment Harf", ar: "حَرْف اِسْتِدْرَاك" },
  INC: { en: "Inceptive Harf", ar: "حَرْف اِبْتِدَاء" },
  SUR: { en: "Surprise Harf", ar: "حَرْف فُجَاءَة" },
  AVR: { en: "Aversion Harf", ar: "حَرْف رَدْع" },
  EXH: { en: "Exhortation Harf", ar: "حَرْف تَحْضِيض" },
  EXL: { en: "Explanation Harf", ar: "حَرْف تَفْصِيل" },
  INT: { en: "Harf of interpretation", ar: "حَرْف تَفْسِير" },
  EQ: { en: "Equalization Harf", ar: "حَرْف تَسْوِيَة" },
  COM: { en: "Comitative Harf", ar: "وَاو المَعِيَّة" },
  INL: { en: "Quranic initials", ar: "حُرُوف مُقَطَّعَة" },
} as const satisfies Record<string, Term>;

/** What an Ism is derived as, when the Corpus says. */
export const DERIVATIONS = {
  ACT_PCPL: { en: "Active participle", ar: "اِسْم فَاعِل" },
  PASS_PCPL: { en: "Passive participle", ar: "اِسْم مَفْعُول" },
  VN: { en: "Verbal noun", ar: "مَصْدَر" },
} as const satisfies Record<string, Term>;
export type Derivation = keyof typeof DERIVATIONS;

/** An Ism's Case. */
export const CASES = {
  NOM: { en: "Nominative", ar: "مَرْفُوع" },
  ACC: { en: "Accusative", ar: "مَنْصُوب" },
  GEN: { en: "Genitive", ar: "مَجْرُور" },
} as const satisfies Record<string, Term>;
export type Case = keyof typeof CASES;

/** A Fi'l's Aspect (and a verbal noun of command's). */
export const ASPECTS = {
  PERF: { en: "Perfect", ar: "مَاضِي" },
  IMPF: { en: "Imperfect", ar: "مُضَارِع" },
  IMPV: { en: "Imperative", ar: "أَمْر" },
} as const satisfies Record<string, Term>;
export type Aspect = keyof typeof ASPECTS;

/** An imperfect Fi'l's mood. */
export const MOODS = {
  IND: { en: "Indicative", ar: "مَرْفُوع" },
  SUBJ: { en: "Subjunctive", ar: "مَنْصُوب" },
  JUS: { en: "Jussive", ar: "مَجْزُوم" },
} as const satisfies Record<string, Term>;
export type Mood = keyof typeof MOODS;

export const PERSONS = {
  1: { en: "First person", ar: "مُتَكَلِّم" },
  2: { en: "Second person", ar: "مُخَاطَب" },
  3: { en: "Third person", ar: "غَائِب" },
} as const satisfies Record<number, Term>;
export type Person = keyof typeof PERSONS;

export const GENDERS = {
  M: { en: "Masculine", ar: "مُذَكَّر" },
  F: { en: "Feminine", ar: "مُؤَنَّث" },
} as const satisfies Record<string, Term>;
export type Gender = keyof typeof GENDERS;

export const NUMBERS = {
  S: { en: "Singular", ar: "مُفْرَد" },
  D: { en: "Dual", ar: "مُثَنًّى" },
  P: { en: "Plural", ar: "جَمْع" },
} as const satisfies Record<string, Term>;
export type GrammaticalNumber = keyof typeof NUMBERS;

/** The family a Word that changes its sentence's Case belongs to, each with the head the Corpus names it by (FAM:). */
export const FAMILIES = {
  INNA: { en: "Inna and her sisters", ar: "إِنَّ وَأَخَوَاتُهَا", corpus: "إِنّ" },
  KANA: { en: "Kana and her sisters", ar: "كَانَ وَأَخَوَاتُهَا", corpus: "كَان" },
  KADA: { en: "Verbs of nearness", ar: "أَفْعَال المُقَارَبَة", corpus: "كَاد" },
} as const satisfies Record<string, Term & { corpus: string }>;
export type Family = keyof typeof FAMILIES;

/** Each Verb form by number: its numeral and its pattern. */
export const VERB_FORMS = {
  1: { numeral: "I", pattern: "فَعَلَ" },
  2: { numeral: "II", pattern: "فَعَّلَ" },
  3: { numeral: "III", pattern: "فَاعَلَ" },
  4: { numeral: "IV", pattern: "أَفْعَلَ" },
  5: { numeral: "V", pattern: "تَفَعَّلَ" },
  6: { numeral: "VI", pattern: "تَفَاعَلَ" },
  7: { numeral: "VII", pattern: "اِنْفَعَلَ" },
  8: { numeral: "VIII", pattern: "اِفْتَعَلَ" },
  9: { numeral: "IX", pattern: "اِفْعَلَّ" },
  10: { numeral: "X", pattern: "اِسْتَفْعَلَ" },
  11: { numeral: "XI", pattern: "اِفْعَالَّ" },
  12: { numeral: "XII", pattern: "اِفْعَوْعَلَ" },
} as const satisfies Record<number, { numeral: string; pattern: string }>;
export type VerbForm = keyof typeof VERB_FORMS;

/** The flags a Segment may carry, each its own term. */
export const FLAGS = {
  ADJ: { en: "Adjective", ar: "نَعْت" },
  INDEF: { en: "Indefinite", ar: "نَكِرَة" },
  PASS: { en: "Passive", ar: "مَبْنِيّ لِلْمَجْهُول" },
  PREF: { en: "Prefix", ar: "سَابِقَة" },
  SUFF: { en: "Suffix", ar: "لَاحِقَة" },
} as const satisfies Record<string, Term>;

/** Where a Segment sits in its Word. */
export type Affix = "prefix" | "stem" | "suffix";

/** One Segment of a Word, as the Corpus gives it: the Corpus's own Root and Lemma are not kept (ADR 0064). */
export interface Segment {
  /** Its Word's Word location. */
  location: string;
  /** Its place in its Word, from 1. */
  position: number;
  /** Its Uthmani text, the Corpus's. */
  uthmani: string;
  partOfSpeech: PartOfSpeech;
  affix: Affix;
  /** Its finer kind: an Ism's when the Corpus gives one (a key of ISM_KINDS), a Harf's always (HARF_KINDS), a Fi'l's never. */
  kind: string | null;
  derivation: Derivation | null;
  adjective: boolean;
  case: Case | null;
  indefinite: boolean;
  person: Person | null;
  gender: Gender | null;
  number: GrammaticalNumber | null;
  aspect: Aspect | null;
  verbForm: VerbForm | null;
  mood: Mood | null;
  passive: boolean;
  family: Family | null;
}

/** The term for a Segment's finer kind: an Ism's or a Harf's. */
export function kindTerm(segment: Pick<Segment, "partOfSpeech" | "kind">): Term | undefined {
  if (segment.kind === null) return undefined;
  const kinds: Record<string, Term> = segment.partOfSpeech === "P" ? HARF_KINDS : ISM_KINDS;
  return kinds[segment.kind];
}

/** "Form IV". */
const verbFormName = (form: VerbForm) => `Form ${VERB_FORMS[form].numeral}`;

/** A Verb form by numeral and pattern: Form IV, أَفْعَلَ. */
export const verbFormTerm = (form: VerbForm): Term => ({ en: verbFormName(form), ar: VERB_FORMS[form].pattern });

/**
 * What the Word grammar dialog says of a Segment (#277), in order: its Part of
 * speech; whether it is a prefix or suffix; its finer kind and derivation; a
 * Fi'l's Aspect, Verb form, mood and voice; an Ism's Case, whether it is
 * indefinite or an adjective; its person, gender and number; the family it
 * belongs to. Only what the Corpus gives: a feature it leaves out is not said.
 */
export function segmentTerms(segment: Segment): Term[] {
  const terms: (Term | false | null | undefined)[] = [
    PARTS_OF_SPEECH[segment.partOfSpeech],
    segment.affix === "prefix" && FLAGS.PREF,
    segment.affix === "suffix" && FLAGS.SUFF,
    kindTerm(segment),
    segment.derivation && DERIVATIONS[segment.derivation],
    segment.aspect && ASPECTS[segment.aspect],
    segment.verbForm && verbFormTerm(segment.verbForm),
    segment.mood && MOODS[segment.mood],
    segment.passive && FLAGS.PASS,
    segment.case && CASES[segment.case],
    segment.indefinite && FLAGS.INDEF,
    segment.adjective && FLAGS.ADJ,
    segment.person && PERSONS[segment.person],
    segment.gender && GENDERS[segment.gender],
    segment.number && NUMBERS[segment.number],
    segment.family && FAMILIES[segment.family],
  ];
  return terms.filter((t): t is Term => Boolean(t));
}

/** A Grammar line: its English, the Arabic term beside it when it names one, and the Part of speech it is coloured by. */
export interface GrammarLine {
  partOfSpeech: PartOfSpeech;
  en: string;
  ar?: string;
}

/**
 * A Word's Grammar line, from its stem Segment (the first that is neither
 * prefix nor suffix): an Ism's Case (Genitive, مَجْرُور), or its kind when it
 * has no Case; a Fi'l's Aspect and Verb form (Imperfect · Form IV); a Harf's
 * kind (Preposition, حَرْف جَرّ). Undefined for a Word with no Segments.
 */
export function grammarLine(segments: readonly Segment[]): GrammarLine | undefined {
  const stem = segments.find((s) => s.affix === "stem");
  if (!stem) return undefined;
  const { partOfSpeech } = stem;
  if (partOfSpeech === "V") {
    const parts = [stem.aspect && ASPECTS[stem.aspect].en, stem.verbForm && verbFormName(stem.verbForm)].filter(Boolean);
    return parts.length > 0 ? { partOfSpeech, en: parts.join(" · ") } : { partOfSpeech, ...PARTS_OF_SPEECH.V };
  }
  const term = (partOfSpeech === "N" && stem.case && CASES[stem.case]) || kindTerm(stem) || PARTS_OF_SPEECH[partOfSpeech];
  return { partOfSpeech, ...term };
}
