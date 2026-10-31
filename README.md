# Scout Analyzer

Film breakdown for high school football staffs without cameras: paste a YouTube link, tag every play from the keyboard, print the opponent's tendencies on one page, and send clips to the group chat. English and Spanish.

**Status:** M0 spike (Nov–Dec 2026). The goal of the spike is to prove the YouTube player is accurate and fast enough before building the app. See `docs/plan-v1.md` for the gates.

## Run the spike

```bash
cd web
npm install
npm run dev
```

- `/` — breakdown harness: load a YouTube link or a local video file, mark snaps and whistles with the keyboard, and export the measurements as JSON.
- `/embed-check.html` — paste a list of opponent replay links and see which ones can be embedded.

Record results in `docs/spike-results.md` and compare them to the Dec 31 gate.

## Docs
| File | What's in it |
|---|---|
| `docs/project-context.md` | Scope, architecture, data model, decisions |
| `docs/breakdown-spec.md` | Hotkeys, carry-forward, states for the core screen |
| `docs/prd-v1.md` | 15 user stories |
| `docs/acceptance-contract-v1.md` | 64 checks the build is verified against |
| `docs/plan-v1.md` | Milestones, gates, cut list |
| `docs/council-v1-design.md` | Council review: decisions and trade-offs |
| `docs/stack-evaluation.md` | Python vs Node vs Elixir comparison |
| `docs/design-tokens.json` | Design system tokens (dark + light themes) |
