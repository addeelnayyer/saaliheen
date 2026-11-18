// The Sign-in page's Admin entry (#67): opening the admin area while signed
// out sends the browser to the Sign-in page with `?admin=<the admin page asked
// for>`, which offers GitHub beside Google and Apple and, once signed in,
// comes back to that admin page. Shared by the admin area's gate (server) and
// the Sign-in page's panel (browser), so plain: no server-only imports.

/** The query parameter that marks the Sign-in page's Admin entry. */
export const ADMIN_ENTRY_PARAM = "admin";

/**
 * An admin page's address, as the Admin entry may come back to: /admin, or
 * /admin followed by any number of segments, such as /admin/18 or
 * /admin/iltifat/1 (#142). Each segment is letters, digits and hyphens only, so
 * no other host (`//`), no `..`, no escapes, query or fragment.
 */
const ADMIN_PAGE = /^\/admin(\/[A-Za-z0-9-]+)*$/;

/** The admin page a sign-in from the Admin entry comes back to: `asked` when it is one, else /admin. */
export const adminPageOrHome = (asked: string | null | undefined) => (asked && ADMIN_PAGE.test(asked) ? asked : "/admin");

/** The Sign-in page's Admin entry, coming back to the admin page `path`. Admin pages are in English. */
export const adminEntry = (path: string) =>
  `/en/sign-in?${new URLSearchParams({ [ADMIN_ENTRY_PARAM]: adminPageOrHome(path) })}`;
