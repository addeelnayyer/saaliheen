## Layout

A pnpm monorepo (#63). The website, a Next.js app, is `apps/web` (`@saaliheen/web`), holding its sources (`src/`), its dataset (`data/`) and its scenarios (`features/`); the mobile app and shared packages join it under `apps/` and `packages/`. `apps/web/AGENTS.md` carries Next.js's own rules: read it before changing the website.

Run commands from the root: `pnpm dev`, `pnpm build`, `pnpm start` and `PORT=3<nnn> pnpm test:e2e` run the website's scripts; `pnpm lint`, `pnpm typecheck` and `pnpm test` run in every workspace package. `pnpm exec <tool>` (vitest, playwright, bddgen) runs from `apps/web`.

`pnpm dev` needs Docker: it starts its own Postgres (container and volume `saaliheen-dev-db`, `127.0.0.1:55432`) and runs `db:migrate` on it before `next dev`; a `DATABASE_URL` in the environment or `apps/web/.env.local` overrides it, and then nothing is started or migrated (ADR 0041). `next dev` rewrites `apps/web/tsconfig.json`: never commit that. The Quran, its Roots and Juz lists live in Neon, loaded by the Quran import in `db:migrate`, and nothing writes a generated file (#173). Themes live in Neon too, loaded by the content migration `0008-load-themes-file` from its own input, `apps/web/scripts/content/0008-load-themes-file.json`, which is never edited. `PORT=3<nnn> pnpm test:dev` runs `pnpm dev`'s own scenarios (features/dev/); it shares `test:api`'s Postgres, so never run the two together on one PORT.

## Agent skills

### Issue tracker

Issues are tracked in this repo's GitHub Issues via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Default five-role vocabulary (needs-triage, needs-info, ready-for-agent, ready-for-human, wontfix). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `CONTEXT.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.
