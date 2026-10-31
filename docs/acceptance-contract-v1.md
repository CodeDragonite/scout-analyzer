# Acceptance Contract: Scouting Analyzer v1
Session: scouting-analyzer-plan-review-20261030-1759 | PRD: prd.md | Status: locked (amended 2026-10-31: US-015 English/Spanish)

## Quality Gates
| Gate | Command | Required |
|---|---|---|
| backend tests | `pytest` (default stack) | yes |
| typecheck | `pyright` / `tsc --noEmit` | yes |
| frontend tests | `vitest run` | yes |
| build | SPA production build | yes |
| migrations + RLS | migration + RLS test suite on empty DB | yes |
| i18n | catalog check: no hard-coded strings, no missing en/es keys | yes |

Stack confirmed at first backend commit (Jan 2027); commands adjust if Node/TS is chosen. Test stubs are generated then.

## Acceptance Criteria

### US-001: YouTube & local spike (M0)

#### AC-001: Median seek ≤300 ms and clip start accurate to ≤0.3 s on 3 real livestream replays
- **Method:** metric
- **Test:** — (assigned when the stack is fixed)
- **Status:** pending
- **Evidence:** —
- **Verified-by:** —

#### AC-002: Clip-end overshoot ≤0.5 s at p90
- **Method:** metric
- **Test:** — (assigned when the stack is fixed)
- **Status:** pending
- **Evidence:** —
- **Verified-by:** —

#### AC-003: ≥30 opponent replay links sampled; embeddable share recorded (go ≥70%)
- **Method:** metric
- **Test:** — (assigned when the stack is fixed)
- **Status:** pending
- **Evidence:** —
- **Verified-by:** —

#### AC-004: Start/end clip links open at the right second from iMessage/GroupMe on a phone
- **Method:** unit-test
- **Test:** — (assigned when the stack is fixed)
- **Status:** pending
- **Evidence:** —
- **Verified-by:** —

#### AC-005: One full game tagged in ≤50 min with the prototype
- **Method:** metric
- **Test:** — (assigned when the stack is fixed)
- **Status:** pending
- **Evidence:** —
- **Verified-by:** —

#### AC-006: Current YouTube terms on paid tools built around embeds read and written down
- **Method:** metric
- **Test:** — (assigned when the stack is fixed)
- **Status:** pending
- **Evidence:** —
- **Verified-by:** —

#### AC-007: Round-trip latency from 2–3 pilot school networks to the chosen VM region recorded
- **Method:** metric
- **Test:** — (assigned when the stack is fixed)
- **Status:** pending
- **Evidence:** —
- **Verified-by:** —

### US-002: Tenancy, auth and data model foundation

#### AC-008: Migration 001 creates the 12 agreed tables with `org_id` on every row
- **Method:** integration-test
- **Test:** — (assigned when the stack is fixed)
- **Status:** pending
- **Evidence:** —
- **Verified-by:** —

#### AC-009: Postgres RLS denies cross-org reads and writes; app connects as a non-owner role
- **Method:** integration-test
- **Test:** — (assigned when the stack is fixed)
- **Status:** pending
- **Evidence:** —
- **Verified-by:** —

#### AC-010: Coach signs in by magic link: opening the link shows a confirm button (scanner-safe) and a 6-digit code works as fallback
- **Method:** e2e-test
- **Test:** — (assigned when the stack is fixed)
- **Status:** pending
- **Evidence:** —
- **Verified-by:** —

#### AC-011: Deleting a team removes all its rows and stored files
- **Method:** integration-test
- **Test:** — (assigned when the stack is fixed)
- **Status:** pending
- **Evidence:** —
- **Verified-by:** —

### US-003: Add video to a game

#### AC-012: Pasting a YouTube link validates embeddability (errors 100/101/150) and shows the reason if it can't be used
- **Method:** e2e-test
- **Test:** — (assigned when the stack is fixed)
- **Status:** pending
- **Evidence:** —
- **Verified-by:** —

#### AC-013: Opening a local MP4 plays in-browser and records a file fingerprint; re-opening a different file warns
- **Method:** e2e-test
- **Test:** — (assigned when the stack is fixed)
- **Status:** pending
- **Evidence:** —
- **Verified-by:** —

#### AC-014: Video source stores provider, duration at tag time, part number and offset
- **Method:** integration-test
- **Test:** — (assigned when the stack is fixed)
- **Status:** pending
- **Evidence:** —
- **Verified-by:** —

#### AC-015: Local-file sources are marked as "film on Coach X's laptop" for other staff
- **Method:** unit-test
- **Test:** — (assigned when the stack is fixed)
- **Status:** pending
- **Evidence:** —
- **Verified-by:** —

### US-004: Breakdown core loop

#### AC-016: `I` saves `snap_ms`, opens the play and arms the first tag group; digits pick options; `Enter` saves
- **Method:** metric
- **Test:** — (assigned when the stack is fixed)
- **Status:** pending
- **Evidence:** —
- **Verified-by:** —

#### AC-017: `N` jumps to the next snap after saving; `G` sets kickoff, `Shift+Q` halftime; skip ranges are honored
- **Method:** unit-test
- **Test:** — (assigned when the stack is fixed)
- **Status:** pending
- **Evidence:** —
- **Verified-by:** —

#### AC-018: Marks are ignored while the player reports ad or buffering
- **Method:** unit-test
- **Test:** — (assigned when the stack is fixed)
- **Status:** pending
- **Evidence:** —
- **Verified-by:** —

#### AC-019: Clicking in the YouTube player never leaves the keyboard dead
- **Method:** unit-test
- **Test:** — (assigned when the stack is fixed)
- **Status:** pending
- **Evidence:** —
- **Verified-by:** —

#### AC-020: Every hotkey has a visible button; focus is always visible
- **Method:** e2e-test
- **Test:** — (assigned when the stack is fixed)
- **Status:** pending
- **Evidence:** —
- **Verified-by:** —

#### AC-021: In-app timer records minutes per game (first `I` to last `Enter`)
- **Method:** integration-test
- **Test:** — (assigned when the stack is fixed)
- **Status:** pending
- **Evidence:** —
- **Verified-by:** —

### US-005: Carry-forward

#### AC-022: All rows of the carry-forward table produce the expected next values (shared test vectors)
- **Method:** unit-test
- **Test:** — (assigned when the stack is fixed)
- **Status:** pending
- **Evidence:** —
- **Verified-by:** —

#### AC-023: Carried values show as unconfirmed and are confirmed on save (`carried_fields[]`)
- **Method:** unit-test
- **Test:** — (assigned when the stack is fixed)
- **Status:** pending
- **Evidence:** —
- **Verified-by:** —

#### AC-024: Editing an earlier play recomputes later plays only while values are still carried
- **Method:** unit-test
- **Test:** — (assigned when the stack is fixed)
- **Status:** pending
- **Evidence:** —
- **Verified-by:** —

#### AC-025: Server rejects invalid values (down 1–4, yards_to_goal 1–99, foreign ids)
- **Method:** integration-test
- **Test:** — (assigned when the stack is fixed)
- **Status:** pending
- **Evidence:** —
- **Verified-by:** —

### US-006: Team vocabulary

#### AC-026: Seed vocabulary loads with decomposed dimensions (structure, strength, backfield, motion, personnel…)
- **Method:** unit-test
- **Test:** — (assigned when the stack is fixed)
- **Status:** pending
- **Evidence:** —
- **Verified-by:** —

#### AC-027: Rename, hide and reorder terms inline from the tag panel; number keys follow the order
- **Method:** metric
- **Test:** — (assigned when the stack is fixed)
- **Status:** pending
- **Evidence:** —
- **Verified-by:** —

#### AC-028: Every team label maps to a canonical term
- **Method:** unit-test
- **Test:** — (assigned when the stack is fixed)
- **Status:** pending
- **Evidence:** —
- **Verified-by:** —

### US-007: Saves and conflicts

#### AC-029: Saves are optimistic with client UUIDs and retried idempotently; header shows "N plays waiting to save"
- **Method:** e2e-test
- **Test:** — (assigned when the stack is fixed)
- **Status:** pending
- **Evidence:** —
- **Verified-by:** —

#### AC-030: Closing the tab with unsaved plays warns
- **Method:** e2e-test
- **Test:** — (assigned when the stack is fixed)
- **Status:** pending
- **Evidence:** —
- **Verified-by:** —

#### AC-031: A stale write returns 409 and shows a conflict notice; no silent overwrite
- **Method:** e2e-test
- **Test:** — (assigned when the stack is fixed)
- **Status:** pending
- **Evidence:** —
- **Verified-by:** —

### US-008: Review list

#### AC-032: Lists plays that are flagged, auto-ended or still carrying unconfirmed values
- **Method:** unit-test
- **Test:** — (assigned when the stack is fixed)
- **Status:** pending
- **Evidence:** —
- **Verified-by:** —

#### AC-033: Filter and inline edit; Enter jumps to the play in breakdown
- **Method:** unit-test
- **Test:** — (assigned when the stack is fixed)
- **Status:** pending
- **Evidence:** —
- **Verified-by:** —

### US-009: Tendency report

#### AC-034: Filter chips for opponent, games included, side, down, distance bucket, field zone, hash, structure, personnel
- **Method:** unit-test
- **Test:** — (assigned when the stack is fixed)
- **Status:** pending
- **Evidence:** —
- **Verified-by:** —

#### AC-035: Every cell shows its play count; cells with n < 5 are muted
- **Method:** e2e-test
- **Test:** — (assigned when the stack is fixed)
- **Status:** pending
- **Evidence:** —
- **Verified-by:** —

#### AC-036: Clicking a number opens the clips behind it
- **Method:** e2e-test
- **Test:** — (assigned when the stack is fixed)
- **Status:** pending
- **Evidence:** —
- **Verified-by:** —

### US-010: Print sheet and CSV

#### AC-037: Letter-size, black-and-white safe, fits one page for a 4-game opponent
- **Method:** e2e-test
- **Test:** — (assigned when the stack is fixed)
- **Status:** pending
- **Evidence:** —
- **Verified-by:** —

#### AC-038: Sample sizes printed; muted cells readable in grayscale
- **Method:** e2e-test
- **Test:** — (assigned when the stack is fixed)
- **Status:** pending
- **Evidence:** —
- **Verified-by:** —

#### AC-039: CSV export of the team's own tags is always free
- **Method:** unit-test
- **Test:** — (assigned when the stack is fixed)
- **Status:** pending
- **Evidence:** —
- **Verified-by:** —

### US-011: Copy clips for the group chat

#### AC-040: Opens from a report cell, the review list or a single clip; ≤10 clips; coach note; team labels
- **Method:** e2e-test
- **Test:** — (assigned when the stack is fixed)
- **Status:** pending
- **Evidence:** —
- **Verified-by:** —

#### AC-041: Links start 4 s before the snap (start/end links if M0 proves they work on phones)
- **Method:** unit-test
- **Test:** — (assigned when the stack is fixed)
- **Status:** pending
- **Evidence:** —
- **Verified-by:** —

#### AC-042: Local-file clips are listed as not shareable with the reason
- **Method:** e2e-test
- **Test:** — (assigned when the stack is fixed)
- **Status:** pending
- **Evidence:** —
- **Verified-by:** —

#### AC-043: No player names or contact data are collected
- **Method:** unit-test
- **Test:** — (assigned when the stack is fixed)
- **Status:** pending
- **Evidence:** —
- **Verified-by:** —

### US-012: Paywall and billing

#### AC-044: First opponent fully free including the print sheet
- **Method:** e2e-test
- **Test:** — (assigned when the stack is fixed)
- **Status:** pending
- **Evidence:** —
- **Verified-by:** —

#### AC-045: Running the report for opponent #2 shows a blurred preview and a payment link; warning shown before tagging opponent #2 starts
- **Method:** e2e-test
- **Test:** — (assigned when the stack is fixed)
- **Status:** pending
- **Evidence:** —
- **Verified-by:** —

#### AC-046: Access governed by `season.paid_through`; no lockout during a game week (grace)
- **Method:** unit-test
- **Test:** — (assigned when the stack is fixed)
- **Status:** pending
- **Evidence:** —
- **Verified-by:** —

#### AC-047: Playback, tagging, CSV and clip sharing never gated
- **Method:** unit-test
- **Test:** — (assigned when the stack is fixed)
- **Status:** pending
- **Evidence:** —
- **Verified-by:** —

#### AC-048: Funnel events recorded: signup, first play, first sheet printed, paywall seen, paid
- **Method:** e2e-test
- **Test:** — (assigned when the stack is fixed)
- **Status:** pending
- **Evidence:** —
- **Verified-by:** —

### US-013: Pilot operations

#### AC-049: Nightly encrypted Postgres backup to R2 with missed-backup alert; one timed restore drill done
- **Method:** manual-check
- **Test:** — (assigned when the stack is fixed)
- **Status:** pending
- **Evidence:** —
- **Verified-by:** —

#### AC-050: Error tracking, `/healthz` uptime check, billing alerts at $15 and $22
- **Method:** unit-test
- **Test:** — (assigned when the stack is fixed)
- **Status:** pending
- **Evidence:** —
- **Verified-by:** —

#### AC-051: Deploys tagged by git SHA with one-command rollback; add-only migrations
- **Method:** integration-test
- **Test:** — (assigned when the stack is fixed)
- **Status:** pending
- **Evidence:** —
- **Verified-by:** —

#### AC-052: SPF/DKIM/DMARC on a dedicated sending subdomain; magic link tested against a district Microsoft 365 inbox
- **Method:** manual-check
- **Test:** — (assigned when the stack is fixed)
- **Status:** pending
- **Evidence:** —
- **Verified-by:** —

### US-014: Pre-invoice checks and terms

#### AC-053: YouTube terms reading on file (from US-001)
- **Method:** metric
- **Test:** — (assigned when the stack is fixed)
- **Status:** pending
- **Evidence:** —
- **Verified-by:** —

#### AC-054: $1 charge and refund from Panama completed with the chosen merchant of record
- **Method:** manual-check
- **Test:** — (assigned when the stack is fixed)
- **Status:** pending
- **Evidence:** —
- **Verified-by:** —

#### AC-055: Terms + privacy page live: data ownership, refund clause tied to YouTube embedding, no stored minors' contacts, deletion
- **Method:** metric
- **Test:** — (assigned when the stack is fixed)
- **Status:** pending
- **Evidence:** —
- **Verified-by:** —

#### AC-056: Static landing page with founding pre-order link
- **Method:** manual-check
- **Test:** — (assigned when the stack is fixed)
- **Status:** pending
- **Evidence:** —
- **Verified-by:** —

### US-015: English and Spanish

#### AC-057: Every UI string comes from message catalogs (`en`, `es`); a CI check fails on hard-coded strings or keys missing in either catalog
- **Method:** build-output
- **Test:** — (assigned when the stack is fixed)
- **Status:** pending
- **Evidence:** —
- **Verified-by:** —

#### AC-058: Language follows the browser on first visit, can be switched from any screen, and is saved per user
- **Method:** e2e-test
- **Test:** — (assigned when the stack is fixed)
- **Status:** pending
- **Evidence:** —
- **Verified-by:** —

#### AC-059: Each team has a report language; the print sheet, CSV headers and clip-link text use it, independent of each coach's UI language
- **Method:** e2e-test
- **Test:** — (assigned when the stack is fixed)
- **Status:** pending
- **Evidence:** —
- **Verified-by:** —

#### AC-060: Vocabulary seed ships English and Spanish labels for every canonical term; team labels stay whatever the staff types
- **Method:** unit-test
- **Test:** — (assigned when the stack is fixed)
- **Status:** pending
- **Evidence:** —
- **Verified-by:** —

#### AC-061: Hotkeys are the same physical keys in both languages; only the labels and the hotkey sheet are translated
- **Method:** unit-test
- **Test:** — (assigned when the stack is fixed)
- **Status:** pending
- **Evidence:** —
- **Verified-by:** —

#### AC-062: Down & distance, field position, dates and numbers use per-language formats (e.g. "3rd & 5" / "3.ª y 5", "Own 35" / "Propia 35")
- **Method:** unit-test
- **Test:** — (assigned when the stack is fixed)
- **Status:** pending
- **Evidence:** —
- **Verified-by:** —

#### AC-063: Magic-link emails, error messages, landing page, terms and privacy page exist in both languages
- **Method:** metric
- **Test:** — (assigned when the stack is fixed)
- **Status:** pending
- **Evidence:** —
- **Verified-by:** —

#### AC-064: Every v1 screen is checked in Spanish at 1280 px wide with no clipped or overflowing text
- **Method:** manual-check
- **Test:** — (assigned when the stack is fixed)
- **Status:** pending
- **Evidence:** —
- **Verified-by:** —

## Verification Summary
| ID | Story | Criterion | Method | Status | Evidence |
|---|---|---|---|---|---|
| AC-001 | US-001 | Median seek ≤300 ms and clip start accurate to ≤0.3 s on 3 real livest | metric | pending | — |
| AC-002 | US-001 | Clip-end overshoot ≤0.5 s at p90 | metric | pending | — |
| AC-003 | US-001 | ≥30 opponent replay links sampled; embeddable share recorded (go ≥70%) | metric | pending | — |
| AC-004 | US-001 | Start/end clip links open at the right second from iMessage/GroupMe on | unit-test | pending | — |
| AC-005 | US-001 | One full game tagged in ≤50 min with the prototype | metric | pending | — |
| AC-006 | US-001 | Current YouTube terms on paid tools built around embeds read and writt | metric | pending | — |
| AC-007 | US-001 | Round-trip latency from 2–3 pilot school networks to the chosen VM reg | metric | pending | — |
| AC-008 | US-002 | Migration 001 creates the 12 agreed tables with `org_id` on every row | integration-test | pending | — |
| AC-009 | US-002 | Postgres RLS denies cross-org reads and writes; app connects as a non- | integration-test | pending | — |
| AC-010 | US-002 | Coach signs in by magic link: opening the link shows a confirm button  | e2e-test | pending | — |
| AC-011 | US-002 | Deleting a team removes all its rows and stored files | integration-test | pending | — |
| AC-012 | US-003 | Pasting a YouTube link validates embeddability (errors 100/101/150) an | e2e-test | pending | — |
| AC-013 | US-003 | Opening a local MP4 plays in-browser and records a file fingerprint; r | e2e-test | pending | — |
| AC-014 | US-003 | Video source stores provider, duration at tag time, part number and of | integration-test | pending | — |
| AC-015 | US-003 | Local-file sources are marked as "film on Coach X's laptop" for other  | unit-test | pending | — |
| AC-016 | US-004 | `I` saves `snap_ms`, opens the play and arms the first tag group; digi | metric | pending | — |
| AC-017 | US-004 | `N` jumps to the next snap after saving; `G` sets kickoff, `Shift+Q` h | unit-test | pending | — |
| AC-018 | US-004 | Marks are ignored while the player reports ad or buffering | unit-test | pending | — |
| AC-019 | US-004 | Clicking in the YouTube player never leaves the keyboard dead | unit-test | pending | — |
| AC-020 | US-004 | Every hotkey has a visible button; focus is always visible | e2e-test | pending | — |
| AC-021 | US-004 | In-app timer records minutes per game (first `I` to last `Enter`) | integration-test | pending | — |
| AC-022 | US-005 | All rows of the carry-forward table produce the expected next values ( | unit-test | pending | — |
| AC-023 | US-005 | Carried values show as unconfirmed and are confirmed on save (`carried | unit-test | pending | — |
| AC-024 | US-005 | Editing an earlier play recomputes later plays only while values are s | unit-test | pending | — |
| AC-025 | US-005 | Server rejects invalid values (down 1–4, yards_to_goal 1–99, foreign i | integration-test | pending | — |
| AC-026 | US-006 | Seed vocabulary loads with decomposed dimensions (structure, strength, | unit-test | pending | — |
| AC-027 | US-006 | Rename, hide and reorder terms inline from the tag panel; number keys  | metric | pending | — |
| AC-028 | US-006 | Every team label maps to a canonical term | unit-test | pending | — |
| AC-029 | US-007 | Saves are optimistic with client UUIDs and retried idempotently; heade | e2e-test | pending | — |
| AC-030 | US-007 | Closing the tab with unsaved plays warns | e2e-test | pending | — |
| AC-031 | US-007 | A stale write returns 409 and shows a conflict notice; no silent overw | e2e-test | pending | — |
| AC-032 | US-008 | Lists plays that are flagged, auto-ended or still carrying unconfirmed | unit-test | pending | — |
| AC-033 | US-008 | Filter and inline edit; Enter jumps to the play in breakdown | unit-test | pending | — |
| AC-034 | US-009 | Filter chips for opponent, games included, side, down, distance bucket | unit-test | pending | — |
| AC-035 | US-009 | Every cell shows its play count; cells with n < 5 are muted | e2e-test | pending | — |
| AC-036 | US-009 | Clicking a number opens the clips behind it | e2e-test | pending | — |
| AC-037 | US-010 | Letter-size, black-and-white safe, fits one page for a 4-game opponent | e2e-test | pending | — |
| AC-038 | US-010 | Sample sizes printed; muted cells readable in grayscale | e2e-test | pending | — |
| AC-039 | US-010 | CSV export of the team's own tags is always free | unit-test | pending | — |
| AC-040 | US-011 | Opens from a report cell, the review list or a single clip; ≤10 clips; | e2e-test | pending | — |
| AC-041 | US-011 | Links start 4 s before the snap (start/end links if M0 proves they wor | unit-test | pending | — |
| AC-042 | US-011 | Local-file clips are listed as not shareable with the reason | e2e-test | pending | — |
| AC-043 | US-011 | No player names or contact data are collected | unit-test | pending | — |
| AC-044 | US-012 | First opponent fully free including the print sheet | e2e-test | pending | — |
| AC-045 | US-012 | Running the report for opponent #2 shows a blurred preview and a payme | e2e-test | pending | — |
| AC-046 | US-012 | Access governed by `season.paid_through`; no lockout during a game wee | unit-test | pending | — |
| AC-047 | US-012 | Playback, tagging, CSV and clip sharing never gated | unit-test | pending | — |
| AC-048 | US-012 | Funnel events recorded: signup, first play, first sheet printed, paywa | e2e-test | pending | — |
| AC-049 | US-013 | Nightly encrypted Postgres backup to R2 with missed-backup alert; one  | manual-check | pending | — |
| AC-050 | US-013 | Error tracking, `/healthz` uptime check, billing alerts at $15 and $22 | unit-test | pending | — |
| AC-051 | US-013 | Deploys tagged by git SHA with one-command rollback; add-only migratio | integration-test | pending | — |
| AC-052 | US-013 | SPF/DKIM/DMARC on a dedicated sending subdomain; magic link tested aga | manual-check | pending | — |
| AC-053 | US-014 | YouTube terms reading on file (from US-001) | metric | pending | — |
| AC-054 | US-014 | $1 charge and refund from Panama completed with the chosen merchant of | manual-check | pending | — |
| AC-055 | US-014 | Terms + privacy page live: data ownership, refund clause tied to YouTu | metric | pending | — |
| AC-056 | US-014 | Static landing page with founding pre-order link | manual-check | pending | — |
| AC-057 | US-015 | Every UI string comes from message catalogs (`en`, `es`); a CI check f | build-output | pending | — |
| AC-058 | US-015 | Language follows the browser on first visit, can be switched from any  | e2e-test | pending | — |
| AC-059 | US-015 | Each team has a report language; the print sheet, CSV headers and clip | e2e-test | pending | — |
| AC-060 | US-015 | Vocabulary seed ships English and Spanish labels for every canonical t | unit-test | pending | — |
| AC-061 | US-015 | Hotkeys are the same physical keys in both languages; only the labels  | unit-test | pending | — |
| AC-062 | US-015 | Down & distance, field position, dates and numbers use per-language fo | unit-test | pending | — |
| AC-063 | US-015 | Magic-link emails, error messages, landing page, terms and privacy pag | metric | pending | — |
| AC-064 | US-015 | Every v1 screen is checked in Spanish at 1280 px wide with no clipped  | manual-check | pending | — |

Progress: 0/64 verified
