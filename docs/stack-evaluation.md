# Architect — Stack Evaluation for Scouting Analyzer v1

Requested by JJ before approving the converged design (design.md). The scope is **this v1 only**: about 344 h planned, about 400 h available at 10 h/week, a pilot in Aug–Sep 2027, 7 screens + 2 modals, one VM, one person. The method follows scout/library-evaluation, adapted from libraries to stacks: candidates, then fitness criteria, then weights, then 1–5 scores, then deal-breakers.

**Labeling rule:** every hour figure and latency statement below is an **estimate** unless it is quoted from design.md. No benchmarks were run. Where a number matters, the doc says how to measure it.

---

## 0. Facts from the design that decide most of this

1. **The hot path is entirely client-side.** The YouTube IFrame API, `<video>` with `requestVideoFrameCallback`, the hotkey shell, the carry-forward suggestion and the ≤150 ms feedback all run in the browser. Saves are optimistic and idempotent, with a `version` check that returns 409. The server sits outside the per-keystroke loop in every option except B1 done naively.
2. **Realtime is cut from v1.** Live co-tagging, presence and the offline queue were removed. Conflicts become a 409 version check. This is where Elixir/Phoenix is strongest, and v1 doesn't contain it.
3. **The server's job is ordinary:** CRUD on 12 tables, RLS with `SET LOCAL app.org_id` per transaction, `GROUP BY` tendency queries, magic-link auth, a payment link with manual `paid_through`, nightly backups, and a cron availability check. No workers, no ffmpeg, no queue.
4. **The print sheet is browser print CSS** rendered by the client. No server PDF in v1.
5. **Carry-forward doesn't have to be recomputed on the server.** The coach confirms every carried value with Enter. The server stores confirmed values plus `carried_fields[]`, and it has to validate **invariants**, not re-derive suggestions. Invariants means: down 1–4, `yards_to_goal` 1–99, valid enums/FKs, `snap_ms` inside the clip range, and correct `org_id`/`team_id`. Even "edits recompute later carried plays" is a client-side batch recompute that ends in a batch save. This makes the duplication argument for option C much smaller than it first looks.
6. **Slack is thin.** design.md gives about 16 h before August. My round-3 count is about 40 h (≈360 h against 400). **Any option costing more than about 16–40 h of net extra effort breaks the plan or forces cuts beyond the pre-agreed list.**

---

## 1. Candidates

| ID | Stack | Notes |
|---|---|---|
| **A** | Python/FastAPI + Postgres + React/TS SPA (Vite) | Current plan. Two languages: Python server, TS client. |
| **B1** | Elixir/Phoenix + LiveView for the app; breakdown player and hotkeys in JS hooks | Server-rendered UI over a websocket |
| **B2** | Phoenix JSON API + React/TS SPA | Elixir backend, same client as A |
| **C** | Node/TS end to end: Fastify or Hono API, Kysely or Drizzle, zod, React/TS SPA, shared `packages/domain` | Full-stack meta-frameworks (Next/Remix) rejected for v1: the breakdown is a client island anyway, and RSC/server actions add concepts without hot-path value |
| **D** | Hybrid: A as the base, with a named second server language added only on a trigger | Evaluated in §3 |

---

## 2. Weighted scoring

Weights total 100. Scores run 1 (poor) to 5 (best) for this v1.

| # | Criterion | Weight | A FastAPI + SPA | B1 Phoenix LiveView | B2 Phoenix API + SPA | C Node/TS end to end |
|---|---|---|---|---|---|---|
| 1 | **Net v1 hour impact** (learning + duplication + tooling, vs 344 h) | **30** | **5**: baseline; +3–6 h for codegen and fixtures | **1**: +62 to +152 h (see §2.1); breaks the plan | **1**: +64 to +136 h; pays the Elixir cost without the LiveView savings | **3**: +2 to +29 h; uses most or all of the slack |
| 2 | **Breakdown hot path** (IFrame/`<video>`, hotkeys, ≤150 ms) | **15** | **5**: pure client | **3**: works only if the screen is a large JS hook that owns all keyboard and tag state; any per-key `phx-*` round trip spends the budget on school Wi-Fi (RTT unmeasured; see note) | **5**: same client as A | **5**: same client as A |
| 3 | **Carry-forward single source + validation** | **8** | **3**: logic in TS only; server checks invariants (Pydantic); types from OpenAPI codegen; one shared JSON fixture file | **3**: logic in a JS hook, invariants in Ecto changesets; state split between hook and LiveView assigns | **2**: same split as A; Elixir OpenAPI → TS tooling is thinner | **5**: one `domain` package for zod schemas, carry-forward and invariants on both sides |
| 4 | **Postgres RLS + tenancy + SQL reports** | **10** | **5**: asyncpg/SQLAlchemy; `SET LOCAL` in a request-scoped transaction dependency; raw SQL `GROUP BY` is easy; JJ knows it | **4**: Ecto is excellent with SQL fragments and transactions, but it is new to JJ | **4**: same | **4**: Kysely/Drizzle handle it well; pool + `SET LOCAL` needs a careful transaction wrapper; Drizzle can declare policies |
| 5 | **Built-in leverage** (magic links, CRUD screens, print) | **7** | **3**: magic link is hand-rolled (already costed); print is CSS | **5**: `phx.gen.auth` generates magic-link login (default in Phoenix 1.8, **verify**); LiveView makes Home/Game/Report/Sign-in cheap; confirm-button + 6-digit code still custom | **4**: auth generator; no LiveView savings | **3**: better-auth has a magic-link plugin; confirm-button + code still custom |
| 6 | **One-person ops, one small VM** | **10** | **5**: one container JJ can debug at 11 pm in game week | **3**: releases are excellent and light on memory, but debugging an unfamiliar runtime during the season is the risk | **3**: same | **4**: one container; known runtime; more dependency churn |
| 7 | **Help, hiring, AI-assist corpus later** | **8** | **5** | **2**: small hiring pool, especially part-time | **2** | **5** |
| 8 | **Future fit**: v1.1 hosted upload/ffmpeg, server PDF, v3 ML/CV | **7** | **5**: ffmpeg is a subprocess in any language; ML/CV is native Python | **3**: Ports supervise ffmpeg well; ML needs a Python sidecar (Nx/Bumblebee exist but not for CV at this depth) | **3** | **3**: ffmpeg fine; ML needs a Python sidecar |
| 9 | **Realtime** (live co-tagging, **cut from v1**) | **5** | **2**: FastAPI websockets + LISTEN/NOTIFY is enough for HS scale | **5**: Channels/Presence are best in class | **4** | **3** |
| | **Weighted total (out of 5)** | 100 | **4.55** | **2.66** | **2.76** | **3.82** |

**Sensitivity check.** Set criterion 1 to weight 0, which ignores hours entirely, and renormalize the rest. The scores become A 4.36, C 4.17, B1 3.37, B2 3.51. Elixir loses even when learning is free, because its advantages (realtime, LiveView CRUD) fall on features v1 cut or on screens that are cheap in any stack. C comes close to A only when hours don't count.

**Deal-breakers:**
- **B1 and B2:** the learning cost alone (≥60 h, estimate) is larger than the whole slack (16–40 h). That makes them deal-breakers for the Aug 2027 pilot, not just lower scores.
- **None for A or C.**

**Latency note on B1.** I have no measured RTT from Panama or pilot schools to the VM. Measure it during the M0 spike, whatever the stack: from 2–3 pilot schools' Wi-Fi and a phone hotspot, record p50/p95 RTT to the chosen VM region (Hetzner US vs EU). With LiveView, every interaction that touches the server costs at least one RTT plus a render diff. A p95 above about 100 ms would make any server-routed keystroke miss the 150 ms target. B1 is only viable if **zero** breakdown keystrokes go through the server, and at that point the breakdown is a SPA inside a hook.

### 2.1 Hour impact vs the 344 h plan (all estimates)

Rough split of the 344 h, an estimate from design.md scope: backend (schema/RLS, API, auth, reports SQL, billing, backups, cron) about 90–110 h; client (breakdown, report, print, screens) about 150–170 h; spike, landing, terms, pre-sell and ops about 70–90 h.

| Line item | A | B1 | B2 | C |
|---|---|---|---|---|
| Language/framework learning to production quality (JJ: Python strongest; Node known; Ruby/Rails known, which eases Elixir syntax but not OTP, immutability, Ecto or LiveView) | 0 | +80 to +150 (Elixir + Ecto + Phoenix + LiveView + hooks + releases) | +60 to +120 (no LiveView) | +10 to +20 (Fastify/Hono, Kysely/Drizzle, zod, test setup; mostly choosing and wiring) |
| Backend velocity vs Python on ~100 h of backend | 0 | included above | included above | +5 to +15 (familiar but not strongest) |
| Contract tooling: OpenAPI → TS types, shared fixtures | +2 to +4 | 0 (no API for LiveView screens) | +4 to +8 (thinner tooling) | −2 (no codegen; shared package) |
| Carry-forward/validation duplication | +1 to +2 (Pydantic invariants; carry-forward stays TS-only) | +4 to +8 (hook ↔ assigns sync, Ecto invariants) | +2 to +4 | −4 to −8 (written once) |
| Auth (magic link + confirm + code) | 0 (costed) | −4 to −6 | −4 to −6 | −2 to −4 |
| CRUD screens (Home, Game, Review, Report, Sign-in) | 0 | −10 to −20 (no API/client state for those) | 0 | 0 |
| Ops: Dockerfile, deploy, rollback, backup | 0 | +4 to +8 (releases, runtime migrations, remote console) | +4 to +8 | +1 to +2 |
| **Net vs 344 h** (low = every line at its cheapest end) | **+3 to +6** | **+62 to +152** | **+64 to +136** | **+2 to +29** |
| **Projected total** | **~347–350 h** | **~406–496 h** | **~408–480 h** | **~346–373 h** |
| Inside the 400 h budget? | Yes; uses at most 6 h of the 16–40 h slack | **No**, even at the low end once the 16–40 h slack is counted | **No** | Likely: the midpoint (~+15 h) uses nearly all of design.md's 16 h slack; the high end needs the cut list |

The +3 to +6 h for A is the codegen step and fixture file, which I recommend adding to the plan regardless.

The spike (M0, about 58 h) is mostly client-side TS and is **identical across options**. The stack decision can wait until the first backend commit (January 2027) at no cost. A paid stack experiment would come out of the slack.

---

## 3. Recommendation

**Choose A: FastAPI + Postgres + React/TS SPA, unchanged.** It is already the right hybrid: Python where the server work and the later ML live, TypeScript where the hot path lives. **No v1 or v1.1 function needs a second server-side language.**

### Hybrid rule: what goes where, when

| Function | Language | When | Notes |
|---|---|---|---|
| Breakdown shell, PlayerAdapter, hotkeys, carry-forward, client batch recompute | **TypeScript (client)** | v1 | **Single source of carry-forward.** Server never re-derives it in v1. |
| API, RLS transactions, tendency SQL, auth, billing state, cron checks, backups | **Python (FastAPI)** | v1 | Pydantic validates invariants only |
| Contract between them | OpenAPI → `openapi-typescript` generated types; `fixtures/carry_forward_cases.json` run by the TS tests (and later by Python) | v1, add ~3 h | Protects against drift without a shared runtime |
| Print sheet | CSS print from the SPA | v1 | Server PDF only if emailed sheets are requested; then WeasyPrint or headless Chromium, still in Python |
| Hosted upload / ffmpeg remux (v1.1 trigger) | **Python**: `asyncio` subprocess, or a second container running the same codebase as a worker | v1.1 | ffmpeg is a CLI; no language does it better |
| Live co-tagging / presence (if it returns) | **Python**: FastAPI websockets + Postgres LISTEN/NOTIFY | v1.1+ | HS-scale concurrency (a few coaches per game) doesn't need BEAM |
| ML/CV (v3) | **Python** worker, same repo, separate process/box | v3 | Already the stack's language |

**Triggers for adding a second server-side language.** Each must be measured, not hypothetical:

1. **Server-side carry-forward becomes necessary.** The first time the server writes plays a coach did not confirm in the UI (CSV/Hudl import, server-side bulk recompute, v2 model suggestions), **port carry-forward to Python against the shared fixture file** (≈6 h, estimate). Don't add a Node sidecar. If more than one such feature lands and the two ports drift (any fixture failure in production), then consider moving the API to Node/TS (C).
2. **Elixir (Phoenix Channels as a separate realtime service):** only if realtime collaboration becomes a top-2 paid pilot request **and** a FastAPI websocket process shows measured limits, for example sustained connection counts or fan-out latency the VM can't handle. At HS scale I don't expect this before v2.
3. **Node server:** only for SSR or OG-image rendering on a public marketing/share page, if one is ever needed. Not in v1.
4. **Never** add a language for a function the current one handles through a subprocess (ffmpeg, Chromium, pg_dump).

---

## 4. What would change my recommendation

| If this turns out true | Then |
|---|---|
| JJ's Node/TS backend fluency matches his Python (e.g. a production Fastify/Nest service shipped in the last ~2 years), so C's ramp and velocity costs fall to ~0–5 h | **C becomes a coin flip or a narrow win**, for one language and one domain package. Choose it before the first backend commit in January, not later. |
| Server-side play writes come into v1 scope (CSV/Hudl import, server bulk edit) | Criterion 3 weight rises; **C gains**, because single-sourcing carry-forward becomes real value instead of an edge case |
| JJ treats learning Elixir as a personal goal and accepts ~70–140 h more (pilot slips to 2028, or v1 is cut further) | **B1**, with the breakdown as one JS hook that owns all state and no server round trip per key. Start it only after G1 (Feb 28, 2027) proves there is a business. |
| Weekly hours rise substantially (e.g. 15+ h/week) | Learning cost matters less; B becomes defensible but still not preferred, because its strengths are cut from v1 |
| Live multi-coach co-tagging returns to v1 as a must-have | B's criterion 9 matters more. Prototype FastAPI websockets first (~6–10 h, estimate) before switching stacks. |
| A collaborator joins with deep Elixir or TS strength | Reweight criteria 1 and 7 around that person |
| The M0 spike moves the product to hosted video with heavy processing | Still A: Python is the best orchestrator for ffmpeg and later CV |

## Progress checklist (skill steps, adapted)
- [x] Candidates identified (A, B1, B2, C, D)
- [x] Ecosystem/maturity assessed qualitatively (no download metrics; stacks are mature, so fit decides)
- [x] Maintenance/bus factor: all mature; Elixir's risk is a small help/hiring pool, not abandonment
- [x] Runtime/footprint: all fit a CX22-class VM; BEAM is lightest; none is a constraint
- [x] DX/types: covered in criteria 3 and 5
- [x] License: all permissive (MIT/Apache/BSD); no concern
- [x] Weighted score + deal-breakers (B1/B2 hour deal-breaker)
