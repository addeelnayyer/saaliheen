// The id an editor's address or a save's path segment names (#142, #201): the
// whole number a content row is keyed by, short enough to be one.

/** The row id path segment `segment` names; undefined when it is no whole number of up to nine digits. */
export const rowIdOf = (segment: string): number | undefined => (/^\d{1,9}$/.test(segment) ? Number(segment) : undefined);
