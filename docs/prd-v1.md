# PRD: Scouting Analyzer v1 (pilot season 2027)

## Overview
A keyboard-first film breakdown tool for high school football staffs without cameras. v1 is one loop: add a YouTube link (or open a file on the coach's laptop) → tag every play with hotkeys and carry-forward → tendency report with drill-down → one-page print sheet → paste clip links into the team group chat. One service (backend language decided at first backend commit, Jan 2027; default Python/FastAPI) + Postgres + TypeScript/React SPA on one small VM under $25/month. Film and player sharing are free; reports and sheets for every opponent after the first are paid per team per season.

## Goals
- Tag a full game side in ≤50 min at the Dec spike, ≤45 min at pilot game 1, ≤30 min by game 3.
- A coordinator prints a usable tendency sheet for the Monday meeting.
- 3+ staffs commit to pay by Feb 28, 2027; paid pilot Aug–Sep 2027.
- Hosting ≤ $25/month; one-person ops.
- The whole app works in English and Spanish from the first alpha (decision 2026-10-31).

## Non-Goals
Hosted upload, transcode/HLS, Drive/Dropbox import, roster, player accounts/playlists/receipts, player PWA, offline queue, live co-tagging, Cmd+K, depth chart, playbook, onboarding pack picker, multi-part streams, bulk edit, ML/CV, auto-renewing billing.

## Quality Gates
Stack-neutral until January; defaults for Python/FastAPI + TS/React:
- Backend tests (`pytest`) pass; type check (`mypy` or `pyright`) clean
- Frontend: `tsc --noEmit`, lint, unit tests (`vitest`) pass; production build succeeds
- Migrations apply on an empty DB and on a copy of production; RLS test suite passes
- Shared carry-forward test vectors pass on client (and server validators)

## User Stories

### US-001: YouTube & local spike (M0)
**Description:** As JJ, I want to prove the YouTube and laptop-file players on real pilot film so that the plan's riskiest assumptions are tested before building.
**Agent:** Skeptic / Architect
**Acceptance Criteria:**
- [ ] Median seek ≤300 ms and clip start accurate to ≤0.3 s on 3 real livestream replays
- [ ] Clip-end overshoot ≤0.5 s at p90
- [ ] ≥30 opponent replay links sampled; embeddable share recorded (go ≥70%)
- [ ] Start/end clip links open at the right second from iMessage/GroupMe on a phone
- [ ] One full game tagged in ≤50 min with the prototype
- [ ] Current YouTube terms on paid tools built around embeds read and written down
- [ ] Round-trip latency from 2–3 pilot school networks to the chosen VM region recorded

### US-002: Tenancy, auth and data model foundation
**Description:** As a coach, I want my team's film data visible only to my staff so that video of minors stays private.
**Agent:** Architect
**Acceptance Criteria:**
- [ ] Migration 001 creates the 12 agreed tables with `org_id` on every row
- [ ] Postgres RLS denies cross-org reads and writes; app connects as a non-owner role
- [ ] Coach signs in by magic link: opening the link shows a confirm button (scanner-safe) and a 6-digit code works as fallback
- [ ] Deleting a team removes all its rows and stored files

### US-003: Add video to a game
**Description:** As a coach, I want to add a YouTube link or open a film file from my laptop so that I can start tagging without downloading anything.
**Agent:** Architect / Advocate
**Acceptance Criteria:**
- [ ] Pasting a YouTube link validates embeddability (errors 100/101/150) and shows the reason if it can't be used
- [ ] Opening a local MP4 plays in-browser and records a file fingerprint; re-opening a different file warns
- [ ] Video source stores provider, duration at tag time, part number and offset
- [ ] Local-file sources are marked as "film on Coach X's laptop" for other staff

### US-004: Breakdown core loop
**Description:** As the film coordinator, I want to mark and tag each play from the keyboard so that a game side takes ≤30 min by my third game.
**Agent:** Advocate
**Acceptance Criteria:**
- [ ] `I` saves `snap_ms`, opens the play and arms the first tag group; digits pick options; `Enter` saves
- [ ] `N` jumps to the next snap after saving; `G` sets kickoff, `Shift+Q` halftime; skip ranges are honored
- [ ] Marks are ignored while the player reports ad or buffering
- [ ] Clicking in the YouTube player never leaves the keyboard dead
- [ ] Every hotkey has a visible button; focus is always visible
- [ ] In-app timer records minutes per game (first `I` to last `Enter`)

### US-005: Carry-forward
**Description:** As the film coordinator, I want down, distance, field position and possession filled from the last play so that most plays need only the call tags.
**Agent:** Architect
**Acceptance Criteria:**
- [ ] All rows of the carry-forward table produce the expected next values (shared test vectors)
- [ ] Carried values show as unconfirmed and are confirmed on save (`carried_fields[]`)
- [ ] Editing an earlier play recomputes later plays only while values are still carried
- [ ] Server rejects invalid values (down 1–4, yards_to_goal 1–99, foreign ids)

### US-006: Team vocabulary
**Description:** As a coach, I want to use my staff's own names for formations and plays so that tagging feels like our language.
**Agent:** Advocate
**Acceptance Criteria:**
- [ ] Seed vocabulary loads with decomposed dimensions (structure, strength, backfield, motion, personnel…)
- [ ] Rename, hide and reorder terms inline from the tag panel; number keys follow the order
- [ ] Every team label maps to a canonical term

### US-007: Saves and conflicts
**Description:** As a coach on bad school Wi-Fi, I want my tags never to be lost so that I trust the tool on a Sunday night.
**Agent:** Architect
**Acceptance Criteria:**
- [ ] Saves are optimistic with client UUIDs and retried idempotently; header shows "N plays waiting to save"
- [ ] Closing the tab with unsaved plays warns
- [ ] A stale write returns 409 and shows a conflict notice; no silent overwrite

### US-008: Review list
**Description:** As a coach, I want a list of flagged and suggested plays so that I can clean up a game quickly.
**Agent:** Advocate
**Acceptance Criteria:**
- [ ] Lists plays that are flagged, auto-ended or still carrying unconfirmed values
- [ ] Filter and inline edit; Enter jumps to the play in breakdown

### US-009: Tendency report
**Description:** As a coordinator, I want down × distance, field/boundary and top concepts across the games I choose so that I know what the opponent does.
**Agent:** Architect / Advocate
**Acceptance Criteria:**
- [ ] Filter chips for opponent, games included, side, down, distance bucket, field zone, hash, structure, personnel
- [ ] Every cell shows its play count; cells with n < 5 are muted
- [ ] Clicking a number opens the clips behind it

### US-010: Print sheet and CSV
**Description:** As a head coach, I want a one-page B&W sheet for the Monday meeting so that the staff plans from it.
**Agent:** Advocate
**Acceptance Criteria:**
- [ ] Letter-size, black-and-white safe, fits one page for a 4-game opponent
- [ ] Sample sizes printed; muted cells readable in grayscale
- [ ] CSV export of the team's own tags is always free

### US-011: Copy clips for the group chat
**Description:** As a coach, I want to paste a short list of clip links into the team chat so that players watch the right plays without accounts.
**Agent:** Advocate / Skeptic
**Acceptance Criteria:**
- [ ] Opens from a report cell, the review list or a single clip; ≤10 clips; coach note; team labels
- [ ] Links start 4 s before the snap (start/end links if M0 proves they work on phones)
- [ ] Local-file clips are listed as not shareable with the reason
- [ ] No player names or contact data are collected

### US-012: Paywall and billing
**Description:** As JJ, I want staffs to pay for analysis after the first opponent so that the pilot proves willingness to pay without building a billing system.
**Agent:** Herald
**Acceptance Criteria:**
- [ ] First opponent fully free including the print sheet
- [ ] Running the report for opponent #2 shows a blurred preview and a payment link; warning shown before tagging opponent #2 starts
- [ ] Access governed by `season.paid_through`; no lockout during a game week (grace)
- [ ] Playback, tagging, CSV and clip sharing never gated
- [ ] Funnel events recorded: signup, first play, first sheet printed, paywall seen, paid

### US-013: Pilot operations
**Description:** As the only operator, I want backups, monitoring and safe deploys so that one person can run the pilot.
**Agent:** Operator
**Acceptance Criteria:**
- [ ] Nightly encrypted Postgres backup to R2 with missed-backup alert; one timed restore drill done
- [ ] Error tracking, `/healthz` uptime check, billing alerts at $15 and $22
- [ ] Deploys tagged by git SHA with one-command rollback; add-only migrations
- [ ] SPF/DKIM/DMARC on a dedicated sending subdomain; magic link tested against a district Microsoft 365 inbox

### US-014: Pre-invoice checks and terms
**Description:** As JJ, I want legal and payment basics proven before charging anyone so that the pilot is safe to bill.
**Agent:** Skeptic / Herald
**Acceptance Criteria:**
- [ ] YouTube terms reading on file (from US-001)
- [ ] $1 charge and refund from Panama completed with the chosen merchant of record
- [ ] Terms + privacy page live: data ownership, refund clause tied to YouTube embedding, no stored minors' contacts, deletion
- [ ] Static landing page with founding pre-order link

### US-015: English and Spanish
**Description:** As a coach, I want to use the whole app in English or Spanish so that my staff works in the language they coach in.
**Agent:** Advocate / Architect
**Acceptance Criteria:**
- [ ] Every UI string comes from message catalogs (`en`, `es`); a CI check fails on hard-coded strings or keys missing in either catalog
- [ ] Language follows the browser on first visit, can be switched from any screen, and is saved per user
- [ ] Each team has a report language; the print sheet, CSV headers and clip-link text use it, independent of each coach's UI language
- [ ] Vocabulary seed ships English and Spanish labels for every canonical term; team labels stay whatever the staff types
- [ ] Hotkeys are the same physical keys in both languages; only the labels and the hotkey sheet are translated
- [ ] Down & distance, field position, dates and numbers use per-language formats (e.g. "3rd & 5" / "3.ª y 5", "Own 35" / "Propia 35")
- [ ] Magic-link emails, error messages, landing page, terms and privacy page exist in both languages
- [ ] Every v1 screen is checked in Spanish at 1280 px wide with no clipped or overflowing text

## Technical Notes
Bilingual: message catalogs `en`/`es` from the first screen; `app_user.locale`, `team.report_locale`; vocab seed carries `label_en`/`label_es` per canonical term. Estimated +20–24 h (setup ~5, Spanish strings ~8–10, seed labels ~4, emails/print/legal ~3–5).

See design.md: architecture, PlayerAdapter interface, migration-001 tables, stack evaluation. Backend language confirmed at the first backend commit (Jan 2027); default Python/FastAPI.

## Dependencies
YouTube IFrame Player API; Postgres 16+; Cloudflare R2 (backups); transactional email provider; merchant-of-record payment provider usable from Panama; one small VM.
