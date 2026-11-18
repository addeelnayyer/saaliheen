<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Controls

A control on the website is a shadcn/ui component when one exists, styled through the mapped tokens; the reading surface stays CSS Modules (ADR 0067, `docs/adr/0067-website-controls-are-shadcn-ui-on-tailwind-beside-css-modules.md`).

- Add a component from `apps/web` with `pnpm dlx shadcn@latest add <name>`; it lands in `src/components/ui/`. Check what it wrote: it can import `cn` from an npm package named `cn` instead of `@/lib/utils`, and add that package.
- Style a control with Tailwind's token colours (`bg-primary`, `text-muted-foreground`, `border-input`…), never a new colour. The site's CSS Modules are unlayered and win over any utility on the same element.
- Tailwind's Preflight is loaded: an element that needs a browser default (a heading's size, a list's bullets, a button's padding) sets it itself.
- A dialog, sheet or drawer keeps Radix's `Content` but never its `Overlay`, whose scroll lock moves the page: the vendored component draws `HeldBackdrop` and keeps its open state in `BackdropClosingRoot` (`src/components/ui/held-backdrop.tsx`: the page hold of `src/lib/hold-page.ts`, and a click on the backdrop closes the dialog, as it closes every dialog on the site), and sets `aria-modal` on the `Content`. `src/components/ui/alert-dialog.tsx` and `dialog.tsx` are the pattern (ADR 0067, "The page-hold contract").
