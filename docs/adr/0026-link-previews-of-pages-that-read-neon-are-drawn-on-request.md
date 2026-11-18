Amended by [0040](0040-pages-that-read-themes-render-on-request-and-are-the-error-page-for-a-second.md): the Theme pages' pictures read Neon on request, and answer no picture when Neon cannot answer.

# Link previews of pages that read Neon are drawn on request, never at build

A Link preview of a page that reads Neon reads it on request, as the page does ([0016](0016-iltifat-pages-render-on-request-cached-by-tag.md)): its tags in the page's `generateMetadata`, its picture and the picture's alt text when the picture is asked for. The Iltifat pages are the first (#144). Next.js runs an `opengraph-image` file's `generateImageMetadata` at build for every params set it knows, and it knows each Language, though `pnpm build` runs without a database. So:

- An Iltifat direction page keeps the `opengraph-image` and `twitter-image` files that Theme and Share pages use. At build Next.js asks their `generateImageMetadata` for a Language alone, with no direction; it answers no picture then, and reads Neon only for a request that names an Iltifat direction.
- The Iltifat overview, whose params are only its Language, has no `opengraph-image` file: its picture is a Route Handler, `/[lang]/iltifat/link-preview-picture` (`apps/web/src/app/[lang]/iltifat/link-preview-picture/route.tsx`), which waits on `connection()` before reading Neon, and the overview's `generateMetadata` names that address and the alt text in its Open Graph and Twitter card images.

Both previews read their counts through the Iltifat module's cache (`apps/web/src/iltifat/cached.ts`) under the pages' own tags, and leave Disputed Iltifat out as the pages do (`apps/web/src/app/[lang]/iltifat/link-preview.ts`).

## Consequences

- When Themes or Share pages move into Neon ([0020](0020-pages-read-neon-on-request-warmed-after-each-deploy-and-publish.md)), their `generateImageMetadata` must answer no picture for a params set without its own slug, and a preview picture of a page with no dynamic segment of its own becomes a Route Handler like the overview's.
- `link-preview-picture` is a fixed segment under `/[lang]/iltifat`, so no Iltifat direction may take that name.

## Considered Options

- An `opengraph-image` file for the overview with an alt text that names no count, so `generateImageMetadata` needs no Neon: the picture would still be prerendered at build from Neon unless it waited on `connection()`, and the alt text would no longer say what the picture shows.
- Reading Neon at build: rejected by [0016](0016-iltifat-pages-render-on-request-cached-by-tag.md), for the deploy order and database-less builds.
