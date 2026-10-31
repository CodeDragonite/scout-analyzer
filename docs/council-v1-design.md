# Design Document: Scouting Analyzer v1 — Council Plan Review

Council: Strategist, Architect, Skeptic, Herald, Advocate, Operator · 3 rounds · 2026-10-30

## Overview

**Verdict: conditional GO on a much smaller v1.** The plan as written was roughly 2–3× the ~400 build hours a solo builder at ~10 h/week has before the Aug–Sep 2027 pilot. The council cut v1 to one loop — paste a YouTube link (or open a file on the coach's laptop) → keyboard breakdown → tendency report → Thursday print sheet → paste clip links into the team group chat — running as one FastAPI + Postgres + SPA service at about $7–11/month. That is ~344 h with a pre-agreed 28 h cut list, because only ~16 h of real slack exists before August.

Two unproven assumptions are tested before any production code: a ~15 h YouTube spike on real pilot film (seek accuracy, embed rate, speed, phone links) and a written read of YouTube's terms on charging for a tool built around embedded video. The business model follows Skeptic's reading: **film and player sharing are always free; the money buys the analysis** (reports and print sheets for every opponent after the first). Three warm-intro staffs must commit by Feb 28, 2027, or the business track stops and v1 stays JJ's own staff tool.

## Scope (v1 vs later)

| In v1 | v1.1 (Oct–Dec 2027, by pilot demand) | v2+ / cut |
|---|---|---|
| YouTube provider + `local` laptop-file provider | Hosted upload to R2 (triggered — see Decision Log) | Transcode/HLS, Drive/Dropbox import |
| Breakdown with speed tools (N, markers, digits-only tagging, snap pre-roll, ad/buffer guard, timer) | Multi-part streams, onboarding pack picker | Cmd+K, offline queue, live co-tagging |
| Decomposed vocab + inline rename/hide/reorder | Roster lite + player playlist page + magic links | Player PWA, watch receipts |
| Carry-forward on `carried_fields[]` | Bulk edit | Depth chart, playbook, CV/ML |
| Tendency report with n on every cell, filter chips (replaces opponent profile) | Practice drill | |
| Print sheet (B&W letter) + CSV | | |
| Flagged review list (replaces play grid) | | |
| "Copy for group chat" clip links (YouTube only) | | |
| Paywall at opponent #2, payment link, `paid_through` | | |
| Static landing page, terms + privacy page | | |

Screens: the 19 designed artboards collapse to **7 app screens + 2 modals** — "This week" Home (Home + Season merged), Game detail with add-video modal, Breakdown, Review list, Tendency report (with filter chips), Print sheet, Sign in; modals: add video, copy for group chat. Onboarding, playlist editor, roster, player inbox/clip view → v1.1; depth chart cut.

## Architecture

- **One deployable:** FastAPI monolith serving the React SPA, Postgres, Caddy, Docker Compose on one small VM (Hetzner CX22-class). No Redis/Celery, no job table, no ffmpeg, no workers in v1. Scheduled checks (video availability) run in-process or by cron.
- **PlayerAdapter:** `load, play, pause, seek, step, setRate, now, playRange, state (incl. ad, buffering), on, destroy`; capabilities `stepMs, rates, frameAccurate, linkable, shared`. The shell applies the video offset and reads capabilities, never the provider name.
  - `YouTubeAdapter`: IFrame API, `disablekb=1`, focus returned to shell, clips via `seekTo` + end timer (not `loadVideoById`), embed check at paste time (errors 100/101/150).
  - `LocalAdapter`: `<video>` from a File, `requestVideoFrameCallback` frame step, file fingerprint for re-open; `shared=false` (other coaches see reports, not that film).
- **Auth:** coaches by magic link only. Link opens a confirm button (school link scanners must not burn the token) plus a 6-digit code fallback; dedicated sending subdomain, SPF/DKIM/DMARC, plain text, no click tracking. Players have no accounts in v1.

## Language: English and Spanish (decision 2026-10-31)

JJ requires the whole app in both languages, from the first alpha.

- **Two settings:** each coach picks the UI language (`app_user.locale`, defaults from the browser); each team picks a report language (`team.report_locale`) used for the print sheet, CSV headers and clip-link text, so one staff can mix languages and still print one sheet.
- **Catalogs from day one:** every string goes through `en`/`es` message catalogs with a CI check for hard-coded or missing keys. Retrofitting later costs more than building it in.
- **Football vocabulary:** the seed gets `label_en`/`label_es` per canonical term; team labels are free text in whatever language the staff uses. Canonical keys keep reports comparable across languages.
- **Formats:** down & distance, field position, ordinals, dates and numbers formatted per language ("3rd & 5" / "3.ª y 5", "Own 35" / "Propia 35"). Exact Spanish football terms to confirm with Spanish-speaking coaches during the spring alpha.
- **Hotkeys:** same physical keys in both languages (muscle memory and shared docs); only labels and the hotkey sheet are translated.
- **Design:** Spanish runs ~20–30% longer; buttons and the tag panel must not clip at 1280 px. Every v1 screen is checked in Spanish.
- **Cost:** about +20–24 h (estimate). It comes out of the buffer, which drops from ~56 h to ~33 h, and leaves almost no real slack before August, so the cut list is more likely to be needed.

## Stack evaluation (added at JJ's request; full detail in deliberation/stack-evaluation.md)

| Option | Weighted score (of 5) | Hours vs 344 h plan (estimate) | Verdict |
|---|---|---|---|
| A. Python/FastAPI + Postgres + React/TS SPA | 4.55 | +3–6 h | **Keep** |
| C. Node/TypeScript end to end + React SPA | 3.82 | +2–29 h | Close second; coin flip only if Node backend fluency ≈ Python |
| B2. Elixir/Phoenix JSON API + React SPA | 2.76 | +64–136 h | Out for an Aug 2027 pilot |
| B1. Elixir/Phoenix LiveView (player via JS hooks) | 2.66 | +62–152 h | Out; server round-trips on the keyboard hot path are a risk |

- **A is already the right hybrid:** TypeScript owns the breakdown hot path in the browser, Python owns the server. No v1 or v1.1 feature needs a third language: ffmpeg, PDF and backups are CLIs Python calls; v3 ML is native Python; realtime (if it returns) is FastAPI websockets.
- **Carry-forward duplication is small:** the client computes, the coach confirms, the server only validates invariants. Generated API types + one shared JSON test-vector file (~3 h) keep them aligned. Port the logic to Python only when the server starts writing unconfirmed plays (imports, ML suggestions).
- **Elixir/Phoenix:** its real strengths (live co-tagging, presence) are cut from v1; learning it to production quality (~60+ h, estimate) exceeds the 16–40 h of slack.
- **Decision timing:** M0 is browser-side TypeScript in every option, so the backend choice can be confirmed by the first backend commit in January 2027 at no cost. The spike also measures round-trip latency from 2–3 pilot schools to the chosen VM region.
- **Would change the call:** proven Node backend fluency on par with Python; server-side play writes entering v1; Elixir as a personal learning goal with the pilot allowed to slip; live co-tagging becoming a must-have (try FastAPI websockets first, ~6–10 h).

## Data Model (migration 001)

12 tables: `organization`, `team`, `season` (`paid_through`, billed per team per season), `app_user`, `login_token`, `team_staff`, `opponent`, `game`, `video_source` (provider `youtube|local|hosted`, fingerprint, `upload_state`, `part_no`, `offset_ms`, `availability`, duration at tag time), `video_marker` (kickoff, halftime, skip ranges), `vocab_term` (team label → canonical key from the seed), `play` (client UUID, `snap_ms`, start/end ms, `flagged`, `possession`, `yards_to_goal`, generated distance bucket + field zone, decomposed formation columns, `carried_fields[]`, `version`).

- `org_id` on every row and **Postgres RLS in migration 001**; the app runs as a non-owner role from the first query.
- Re-linking a replaced or trimmed video updates `offset_ms` on the same source row; plays are never rewritten. `replaces_id` dropped.
- Per-field source/confidence collapses to `carried_fields[]`; live sync becomes a version check (409); offline queue becomes retryable idempotent saves.
- Roster, playlist, share and receipt tables come in an additive v1.1 migration.

## User Experience

- Core loop is five keys: Space, I (saves `snap_ms`, arms first tag group), digits, R, Enter. Letter keys are for corrections.
- New keys: N skip to next snap, G kickoff marker, Shift+Q halftime, T special teams, YouTube-style J/K/L, Shift+arrows, [ ]. Yard line typed −35/+35. I/O ignored during ads or buffering.
- Clips start ~4 s before the snap. Every report cell shows n; cells under 5 are muted, including on paper.
- Speed target is two-stage: ≤50 min/game at the spike, ≤45 at pilot game 1, ≤30 per side by game 3; rethink if median >40 by game 3. Time is measured in the product from the first alpha game.
- Player sharing: one "Copy for group chat" sheet from a report cell, the review list or a single clip — coach note, ≤10 clips, team's own labels, links starting at snap − 4 s (start/end embed links if the spike shows they work on phones). Local-file clips show why they can't be shared. No names, no tracking.

## Risk Assessment

| Risk | Owner | Trigger | Response |
|---|---|---|---|
| YouTube terms or enforcement block charging around embeds | JJ | Terms read before first invoice; any policy change | Keep "film free, analysis paid"; if still blocked, reprice or stop |
| Clips silently point to the wrong play (trimmed/re-uploaded replay) | Architect | Duration differs from tag time on open or nightly | Banner + manual re-sync via `offset_ms`; never auto-applied |
| Breakdown too slow on long streams | Strategist | Spike >60 min → rethink; median >40 by game 3 | July hours go to speed; paywall/landing move into buffer |
| Hours/calendar slip (only ~16 h slack before Aug) | Strategist | Spike overruns >15 h or <8 h/week for 3+ weeks | Apply pre-agreed cut list in order |
| Cross-team data leak / minors' data creep | Architect | Any query outside RLS; any request to store player contacts | RLS from migration 001; no minors' contact data; per-team delete purges everything |
| Payment provider unavailable from Panama | Herald/Operator | $1 charge + refund test in Jan | Merchant-of-record provider (Paddle / Lemon Squeezy type) |
| Single VM loses the tag database | Operator | Missed nightly backup | Encrypted nightly backup to R2, dead-man alert, timed restore drill |
| School networks block YouTube for players | Advocate | Pilot reports | "Test my network" check; phone fallback |

## Business Model

- **Team season pass**, one card payment, hypothesis $99–199 per team per season (to validate with pilots, not market data).
- Free forever: watching, tagging, CSV of own tags, everything players see, clip sharing. No ads.
- Paid: reports + print sheets for every opponent after the first, multi-game merge, custom vocab, self-scout.
- Paywall moment: running the report for opponent #2 (warned before tagging starts, blurred preview, one-click unlock). Never lock a staff out in a game week.
- Billing: hosted payment link from a merchant of record, manual `paid_through`, no auto-renew, renewal invoice June 2028, founding pre-order refundable until first printed sheet or Aug 31; 3-season price lock with pro-rata refund if YouTube embedding stops working.
- Funnel events table ships with v1.

## Operations

- Monthly cost: ~$7–11 (VM, R2 backups, email, domain; Sentry and uptime on free tiers) — all prices to verify. Billing alerts at $15 and $22.
- Non-negotiables: timed restore drill, `/healthz` + uptime check, deploys tagged by git SHA with one-command rollback, add-only migrations, no deploys Friday night → Monday noon in season, delete-team-data purges storage.
- If hosted upload is promoted: 50 GB per-team cap, abort incomplete multipart uploads after 24 h, presigned URLs ≤1 h, takedown process in place first.

## Plan & Gates

| Milestone | Window | Gate |
|---|---|---|
| M0 Spike (~58 h) | Nov 1 – Dec 31, 2026 | G0: full game ≤50 min; ≥70% of ≥30 opponent replays embeddable; clip start ≤0.3 s; start/end links work from phone chat apps; YouTube terms written down. Speed >60 min → rethink YouTube-first. |
| Pre-sell | by Feb 28, 2027 | G1: ≥3 staffs paid or committed (≥1 with booster/school money or from outside JJ's circle); $1 charge + refund works from Panama. <3 → stop business track. |
| M1 Alpha build | Jan – Apr 15, 2027 (cum ~222 h) | Alpha to JJ's staff by Apr 15 |
| Spring alpha | Apr – Jun 2027 (cum ~311 h) | G2: median ≤40 min by each tagger's 3rd game; a second coach tags a game alone; sheet used in planning |
| M3 Pilot-ready | Jul 2027 (cum ~344 h) | G3: Skeptic's 4 checks pass; ≥3 paid teams onboarded; feature freeze from Jul 15 |
| Paid pilot | Aug – Sep 2027 | G4: game 1 ≤45 min, game 3 ≤30 per side; ≥1 report per team per game week; ≥70% of teams tag 6 of first 8 weeks |
| v1.1 | Oct – Dec 2027 | Build the top 1–2 unprompted pilot requests |

**Pre-agreed cut order (~28 h):** browser print instead of print polish (−6) → read-only flagged list (−4) → kickoff marker only (−4) → clip links to v1.1 (−4) → defer `local` provider only if embed rate ≥85% (−10).

**Four checks before the first invoice (Skeptic):** YouTube terms read and on file; $1 charge + refund from Panama; spike passed (or spec relaxed); terms + privacy page live (data ownership, refund clause, no stored minors' contacts, deletion).

## Tension Resolutions

| Tension | Agents | Resolution | Reasoning |
|---|---|---|---|
| Lean scope vs breakdown-speed features | Strategist ↔ Advocate | Speed tools in (+~31 h), paid for by play grid → review list and opponent profile → filter chips; two-stage speed target | Without N/markers/digits-only the loop lands at 45–50 min and breaks the one promise the product sells |
| Paywall vs YouTube terms | Herald ↔ Skeptic | Film and player sharing free forever; charge only for analysis built from the coach's own tags, gate at opponent #2 | Charging for distribution of YouTube playback is the riskiest reading of the terms; analysis survives even if video disappears |
| Hosted upload in v1 | Strategist ↔ Architect (+ Skeptic, Operator) | `local` laptop-file provider in v1; hosted upload in v1.1 behind triggers | 4 of 5 final positions favored it: ~10 h vs ~26–29 h, no stored film of minors, no takedown duty; reports still reach the whole staff from tag data |
| RLS timing | Architect ↔ Skeptic | Migration 001 | Video of minors; retrofitting tenancy later is expensive and error-prone |

## Decision Log

| Decision | Options considered | Chosen | Reasoning |
|---|---|---|---|
| Stack | Full plan (API + queue + workers + R2/HLS + SPA + PWA) / PaaS / single VM monolith | Single VM monolith, no workers | Fits <$25/mo and one person's ops time |
| Video in v1 | YouTube only / + hosted upload / + local file | YouTube + `local` | Covers embed-blocked and file-only film cheaply |
| Hosted-upload triggers | Spike-gated / always | Embed rate <50% → into M3; 50–70% → first item in v1.1; or a pilot's main film is files and 2+ coaches need clips; or 2+ unprompted requests | Build it only when pilots prove the need |
| Player sharing | Magic-link playlists / timestamp links | Copy-for-group-chat links, no player accounts | No minors' contact data; players live in group chats |
| Coach login | Password + OAuth / magic link | Magic link with confirm button + code | Less to build; survives school link scanners |
| Data model | Draft / reviewed | Reviewed 12-table migration 001 with RLS, `yards_to_goal`, `possession`, `carried_fields[]`, `video_source` offsets | Cheap now, expensive after first migration |
| Pricing unit | Monthly / per program / per team per season | Per team per season, hypothesis $99–199 | Football budgets are yearly |
| Payment | Billing system / payment link | Merchant-of-record payment link + manual `paid_through` | ~6–10 h, handles tax; Stripe-from-Panama unverified |
| Screens | 19 artboards / 9 | 7 screens + 2 modals | Matches the one loop |
| Business go/no-go | — | 3 staffs committed by Feb 28, 2027 | Tests willingness to pay before most hours are spent |

## Open items for JJ

- Hour totals: Strategist's final ledger is ~344 h; Architect warned the Round 2 ledgers overlap and estimated ~360 h. Treat 344 as plan and the cut list as mandatory if M0 runs long.
- Design canvas and breakdown spec need updating to match (screens collapse, new keys, offline/live-sync/Cmd+K removed).
