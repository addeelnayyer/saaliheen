// The Surah a /api/v1 path segment names (#150, #171): a whole number from 1
// to 114, written without leading zeros.

/** The Surah numbered by path segment `segment`; undefined when it is no whole number from 1 to 114. */
export function surahOf(segment: string): number | undefined {
  const surah = /^[1-9]\d{0,2}$/.test(segment) ? Number(segment) : 0;
  return surah >= 1 && surah <= 114 ? surah : undefined;
}

export const NOT_A_SURAH = "no Surah has this number: ask for a whole number from 1 to 114";
