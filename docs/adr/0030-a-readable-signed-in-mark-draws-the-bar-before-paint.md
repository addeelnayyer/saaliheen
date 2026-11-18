# A readable signed-in mark draws the bar before paint

The website's top bar offers Sign in while signed out (#192). Reading pages are prerendered and the Better Auth session cookie is httpOnly, so a page could only learn it is signed in by asking the site once it runs, and a signed-in reader would see Sign in flash on every page. Better Auth therefore sets a second cookie, `saaliheen-signed-in=1`, readable by the page's own scripts and never trusted for anything else, with every new session (an after-hook on every auth endpoint, so the test sign-in too), and clears it on signing out and on deleting the Account. The reader settings' pre-paint script puts it on `<html>` as `data-signed-in`, and CSS hides Sign in by it. When a page does ask the site (`useSession`) and hears otherwise, it corrects both the attribute and the cookie.

The mark only says a session cookie was set; it is never used to decide what a reader may see or do. Me still asks the site for the Account, and whether it is an Admin's (a server action reading the session).

## Considered options

- Ask the site on each page and hide Sign in until it answers: signed-out readers, the usual case, would wait for a round trip to see it.
- A proxy (middleware) mirroring the session cookie on every request: it would put every prerendered page behind a function.

## Consequences

A mark left behind by a session that has since expired hides Sign in until the page asks the site; the first `useSession` answer puts it back. Me always asks, so Sign in there is never hidden for long.
