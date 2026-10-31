# Scouting Analyzer — Project Context

_Last updated: 2026-10-30 · Status: pre-build. Council plan review done (conditional GO); next: M0 spike by Dec 31, 2026._

Companion docs: `claude/council-v1-design.md` (decisions + architecture), `claude/prd-v1.md` (14 user stories), `claude/acceptance-contract-v1.md` (56 criteria), `claude/plan-v1.md` (milestones, gates, cut list), `claude/vocab-taxonomy-seed.yaml`.

## 1. What we're building

A web SaaS for **high school American football staffs** to break down game film, scout opponents and self-scout — **without camera hardware**. It works with the film teams already have, which for the target pilots is mostly **YouTube / livestream replays**.

### Core jobs (v1)
1. **Add film** with zero download friction: paste a YouTube link (official embed, never downloaded) or open a video file already on the coach's laptop.
2. **Mark and tag** every play from the keyboard: down, distance, field position, hash, personnel, structure + strength + backfield + motion, play type, concept, result — with carry-forward.
3. **Analyze tendencies** across the games a coach picks: down × distance, field/boundary, top concepts, every number opens its clips.
4. **Print** a one-page B&W tendency sheet for the Monday meeting.
5. **Share** clips by pasting links into the team group chat (no player accounts).

### Primary user
The coordinator on film duty at 10pm Sunday with a laptop. Secondary: head coach reading the sheet; players opening links on phones.

### Positioning vs. Hudl
No hardware, any source, low price, bad video is normal, output coaches use (the sheet). Don't fight Hudl's film exchange; pitch Hudl teams for opponents whose film is only on YouTube, and camera-less teams whose real competitor is the spreadsheet.

## 2. Product principles
- **Human-in-the-loop first.** Manual tagging is the product; ML only suggests, later.
- **Speed of breakdown is the #1 metric.** Two-stage target: ≤50 min per game side at the Dec spike, ≤45 at pilot game 1, ≤30 by game 3; rethink if median >40 by game 3. Measured in the product.
- **Wrong auto-tags are worse than none.** Unconfirmed values look unfinished until a coach confirms.
- **Every staff names things differently.** Team labels map to canonical terms (`vocab-taxonomy-seed.yaml`); formations are decomposed.
- **Private by default.** Video of minors: no public pages, no stored minors' contact data, per-team deletion.
- **Film is free; analysis is paid.** Never charge for playback or for sharing clips with players.
- **Bilingual from day one (decision 2026-10-31).** The whole app works in English and Spanish: UI language per coach, report language per team (print sheet, CSV, clip-link text), vocab seed with English and Spanish labels, same hotkeys in both.

## 3. Scope (decision 2026-10-30, council review)

Builder capacity: solo, ~10 h/week, ~400 h before the Aug–Sep 2027 pilot. v1 ≈ 366 h (344 h + ~22 h for English/Spanish); real slack before August is near zero, so expect to use the pre-agreed cut list (plan-v1.md).

**v1**
- Coach accounts (magic link), teams, seasons, games, opponents.
- Video: **YouTube** (embed check at paste) and **`local`** (file on the coach's laptop, plays in-browser, nothing uploaded; other coaches see reports but not that film).
- Breakdown per the updated Breakdown Interaction Spec: I/digits/Enter core loop, N skip to next snap, kickoff/halftime markers, snap time with 4 s pre-roll, marks ignored during ads/buffering, in-app timer.
- Carry-forward on `carried_fields[]` with shared test vectors.
- Team vocabulary, rename/hide/reorder inline.
- Optimistic idempotent saves + 409 conflict notice (no offline queue, no live sync).
- Review list of flagged/unconfirmed plays (replaces the play grid).
- Tendency report with filter chips (replaces opponent profile), n on every cell, drill-down to clips.
- Print sheet + CSV of own tags.
- "Copy for group chat" clip links (YouTube only, ≤10 clips, coach note).
- Paywall at opponent #2, payment link, `paid_through`; funnel events.
- Static landing, terms + privacy page.
- English and Spanish everywhere: message catalogs with a CI check, per-language formats ("3rd & 5" / "3.ª y 5"), Spanish emails and legal pages, every v1 screen checked in Spanish.
- Screens: 7 + 2 modals (Home "This week", Game detail, Breakdown, Review list, Tendency report, Print sheet, Sign in; modals Add video, Copy for group chat).

**v1.1 (Oct–Dec 2027, by unprompted pilot demand)**
Hosted upload to R2 (triggers: embed rate <70% → first in v1.1, <50% → pulled into M3; a pilot's main film is files and 2+ coaches need clips; 2+ unprompted requests), roster lite + player playlist page + magic links, multi-part streams, onboarding pack picker, bulk edit, practice drill.

**Later / cut**
Transcode/HLS, Drive/Dropbox import, player PWA, watch receipts, offline queue, live co-tagging, Cmd+K, depth chart, playbook, auto segmentation, scoreboard OCR, formation recognition, telestration, native apps.

## 4. Architecture

```
Browser: TypeScript/React SPA ── breakdown hot path entirely client-side
  ├─ YouTubeAdapter (IFrame API)      ┐ PlayerAdapter: load, play, pause, seek, step, setRate,
  └─ LocalAdapter (<video> from File) ┘ now, playRange, state(ad, buffering), on, destroy
         │  capabilities: stepMs, rates, frameAccurate, linkable, shared
         ▼
One small VM (Docker Compose): Caddy → API service (serves SPA) → Postgres (RLS)
         └─ nightly encrypted backup → Cloudflare R2
```

- **Backend language:** confirmed at the first backend commit (Jan 2027). Default **Python/FastAPI** (stack evaluation: Python 4.55/5, Node/TS 3.82, Phoenix 2.66–2.76). Switch to Node/TS only if backend fluency ≈ Python. No v1/v1.1 feature needs a third language.
- **No workers, no job queue, no ffmpeg in v1.** Scheduled checks run in-process or via cron.
- **YouTube rules:** official IFrame API only, `disablekb=1`, focus returned to the shell, clips via `seekTo` + end timer, nothing drawn over the player, store only the video id + duration at tag time, embed errors 100/101/150 caught at paste. Trimmed/re-uploaded videos are detected by duration and re-synced manually via `offset_ms` (never automatically).
- **Auth:** coach magic link opens a confirm button (school link scanners must not burn the token) + 6-digit code fallback; dedicated sending subdomain with SPF/DKIM/DMARC.
- **Hosting:** ~$7–11/month estimated (verify pricing); billing alerts at $15 and $22.

## 5. Data model (migration 001)

12 tables, `org_id` on every row, **Postgres RLS in migration 001**, app runs as a non-owner role:
`organization`, `team`, `season` (`paid_through`), `app_user`, `login_token`, `team_staff`, `opponent`, `game`, `video_source` (provider `youtube|local|hosted`, fingerprint, `upload_state`, `part_no`, `offset_ms`, `availability`, duration at tag time), `video_marker` (kickoff, halftime, skip ranges), `vocab_term` (team label → canonical key, order, hidden); `app_user.locale`, `team.report_locale`; seed terms carry `label_en`/`label_es`, `play` (client UUID, `snap_ms`, start/end ms, `flagged`, `possession`, `yards_to_goal` 1–99, generated distance bucket + field zone, quarter, down, distance, hash, personnel, structure, strength, receiver set, backfield, motion, play type, concept, direction, result, yards, `carried_fields[]`, `version`).

Roster, playlist, share and receipt tables arrive in an additive v1.1 migration. Tendency queries are SQL `GROUP BY` over indexed columns.

## 6. Design
- **Design system** artifact: dark "film room" default + light theme, team-color accent override, Barlow Condensed / Inter / JetBrains Mono, sentence-case labels.
- **Screens canvas:** 19 artboards drawn; v1 uses 7 screens + 2 modals (see §3). Others are marked v1.1 / cut on the canvas.
- **Breakdown Interaction Spec** doc: acceptance contract for the breakdown screen (updated to the council scope).

## 7. Business model
- **Team season pass**, one card payment, hypothesis **$99–199 per team per season** (validate with pilots).
- Free forever: watching, tagging, CSV, clip sharing. Paid: reports + sheets for every opponent after the first, multi-game merge, custom vocab, self-scout.
- Paywall at the report for opponent #2 (warned before tagging opponent #2, blurred preview). No lockout in a game week.
- Merchant-of-record payment link (Stripe-from-Panama unverified), manual `paid_through`, no auto-renew; founding pre-order refundable until first sheet or Aug 31; 3-season price lock with pro-rata refund tied to YouTube embedding.

## 8. Risks & guardrails
| Risk | Guardrail |
|---|---|
| YouTube terms restrict paid tools around embeds | Terms read before first invoice; film/sharing free, analysis paid; reprice or stop if blocked |
| Embed accuracy / speed on long livestreams | M0 spike with pass numbers; two-stage speed target; speed tools in v1 |
| Clips point to wrong plays after a replay is trimmed | Duration check on open + nightly; manual re-sync via `offset_ms` |
| Solo hours / calendar slip | 344 h plan, pre-agreed 28 h cut list, feature freeze Jul 15 |
| Cross-team leaks / minors' data | RLS in migration 001; no player contacts stored; per-team delete |
| Payment from Panama | $1 charge + refund test in Jan with a merchant of record |
| Single VM loses data | Nightly encrypted backups, dead-man alert, timed restore drill |
| School networks block YouTube | Network check; phone fallback |
| Willingness to pay | Feb 28 gate: ≥3 staffs committed, ≥1 with program money or outside JJ's circle |

## 9. Roadmap & gates
| Milestone | Window | Gate |
|---|---|---|
| M0 spike (~58 h) | Nov 1 – Dec 31, 2026 | ≤50 min game; ≥70% of ≥30 replays embeddable; clip start ≤0.3 s; phone links work; YouTube terms on file |
| Stack decision | Jan 2027 | Python/FastAPI default |
| Pre-sell | by Feb 28, 2027 | ≥3 staffs committed; $1 charge+refund from Panama — else business track stops, v1 stays JJ's staff tool |
| M1 alpha build | Jan – Apr 15, 2027 | Alpha to JJ's staff |
| Spring alpha + M2 | Apr – Jun 2027 | Median ≤40 min by 3rd game; 2nd coach tags alone; sheet used in planning |
| M3 pilot-ready | Jul 2027, freeze Jul 15 | 4 pre-invoice checks pass; ≥3 paid teams onboarded |
| Paid pilot | Aug – Sep 2027 | Game 1 ≤45 min, game 3 ≤30; weekly sheet use; ≥70% tag 6 of first 8 weeks |
| v1.1 | Oct – Dec 2027 | Top 1–2 unprompted pilot requests |
| Later | 2028+ | Speed-up suggestions (segmentation, OCR), formation suggestions on own data, playbook |

## 10. Open questions
- Backend language final call (Jan 2027).
- Exact price within $99–199 and the payment provider usable from Panama.
- Do draft plays count in reports? (Spec: no.)
- Exact Spanish football terminology: confirm with Spanish-speaking coaches during the spring alpha.
- Name/brand (must work in both languages).
