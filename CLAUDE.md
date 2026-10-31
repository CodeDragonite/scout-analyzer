# Scout Analyzer

Keyboard-first film breakdown for high school football staffs without cameras. v1 loop: add a YouTube link (or open a file from the coach's laptop) → tag every play with hotkeys and carry-forward → tendency report → one-page print sheet → paste clip links into the team group chat.

Read before building: `docs/project-context.md` (scope, architecture, data model), `docs/breakdown-spec.md` (hotkeys, carry-forward, states), `docs/prd-v1.md` + `docs/acceptance-contract-v1.md` (stories and their checks), `docs/plan-v1.md` (milestones, gates, cut list).

## Where we are
- **M0 spike (Nov–Dec 2026):** `web/` — browser-only TypeScript. Player adapters, hotkey harness, metrics, embed checker. No backend yet.
- **Backend language** is decided at the first backend commit (Jan 2027). Default Python/FastAPI + Postgres. See `docs/stack-evaluation.md`.

## Rules that are never broken
- Breakdown code talks only to `PlayerAdapter`, never to YouTube or `<video>` directly. The shell reads `capabilities`, never the provider name.
- Nothing is drawn over the video player. YouTube only through the official IFrame API: store the video id, never download, `disablekb=1`.
- Every UI string goes through `t()` with keys in both `en` and `es` catalogs. `npm run check:i18n` fails on missing keys.
- Same physical hotkeys in every language; only labels are translated.
- Carry-forward never guesses: unknown values stay `null`. Logic lives in `web/src/football/carryForward.ts` with table-driven tests; change the tests first.
- Field position is `yardsToGoal` (1–99, offense's view). Down & distance and field position are formatted per locale in `web/src/football/format.ts`.
- When the backend exists: `org_id` on every row and Postgres RLS from migration 001; no stored contact data for players (minors).
- Film and clip sharing are free; only analysis (reports, sheets) is ever paid.

## Commands (from `web/`)
- `npm install`
- `npm run dev` — spike harness at `/`, embed checker at `/embed-check.html`
- `npm test` — vitest
- `npm run typecheck`
- `npm run check:i18n`
- `npm run build`

## Working style
Small increments, one user story at a time. Write the failing tests from the story's acceptance criteria first. Hours are tight (~10 h/week, ~366 h plan): if something isn't in the PRD, it goes to the roadmap, not the code.
