// While the page follows the Recited Word (#109) it is the Recitation, not the
// reader, that scrolls it: the Reading place tracker then leaves the Reading
// place where listening put it, at the Recited Word's Ayah (#111), rather than
// moving it to whatever Ayah that scroll leaves at the top. A scroll by hand
// stops the following first, so it is read as ever.

let following = false;

/** Notes whether the page is following the Recited Word now. */
export function notePageFollowing(on: boolean) {
  following = on;
}

/** Whether the page's scrolls are the Recitation following its Recited Word, not the reader's. */
export const pageIsFollowing = () => following;
