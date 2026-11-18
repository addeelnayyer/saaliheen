// The signed-in mark (#192, ADR 0030): a cookie the page's own scripts can
// read, saying this browser holds an Account's session. The session cookie
// itself is httpOnly, and the reading pages are prerendered, so without the
// mark a page could only learn it was signed in after asking the site, and
// its bar would offer Sign in for a moment first. Better Auth sets the mark
// with every new session and clears it on signing out or deleting the Account
// (auth-options.ts); the pre-paint script puts it on <html> as data-signed-in
// ([lang]/settings.ts); a page that asks the site and hears otherwise corrects
// both ([lang]/sign-in-link.tsx).

/** The mark's cookie name. Its value is always "1". */
export const SIGNED_IN_COOKIE = "saaliheen-signed-in";

/** The <html> attribute the mark shows as. */
export const SIGNED_IN_ATTRIBUTE = "data-signed-in";

/**
 * Put the mark on <html>, or take it off. Self-contained, so it also runs as
 * part of the pre-paint script.
 */
export function showSignedIn(name: string, attribute: string) {
  const html = document.documentElement;
  if (document.cookie.split(/;\s*/).includes(`${name}=1`)) html.setAttribute(attribute, "");
  else html.removeAttribute(attribute);
}
