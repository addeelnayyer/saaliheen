// Handing text to the device (#19, #56): the share sheet where there is one,
// the clipboard otherwise. Each returns the message to show afterwards, or
// null for none.

import { STRINGS } from "../strings";

/** Copy `text` to the clipboard; the message says whether it worked. */
export async function copy(text: string): Promise<string> {
  try {
    await navigator.clipboard.writeText(text);
    return STRINGS.copied;
  } catch {
    return STRINGS.copyFailed;
  }
}

/**
 * Open the share sheet with `text` as text alone (given a title too, many
 * apps put it above the text), or, without one, copy it. No message after the
 * sheet, shared or cancelled; a sheet that fails for any other reason copies instead.
 */
export async function shareOrCopy(text: string): Promise<string | null> {
  if (typeof navigator.share === "function") {
    try {
      await navigator.share({ text });
      return null;
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return null;
    }
  }
  return copy(text);
}
