// Browser storage for what the site remembers: the reader settings
// (settings.ts), the Reading places (reading-place.ts) and the Known words
// (known-words.ts). Storage can be
// missing or throw (private mode, blocked site data); that only loses memory.
// settings.ts keeps its own copy of the read for its self-contained pre-paint script.

/** Read one stored value; missing or unreadable storage reads as null. */
export function readStored(name: string): string | null {
  try {
    return window.localStorage.getItem(name);
  } catch {
    return null;
  }
}

/** Store one value, or clear it with null. */
export function store(name: string, value: string | null) {
  try {
    if (value === null) window.localStorage.removeItem(name);
    else window.localStorage.setItem(name, value);
  } catch {}
}
