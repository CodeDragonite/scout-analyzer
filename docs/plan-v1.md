# Plan: Scouting Analyzer v1

Budget: ~366 h of ~400 h (344 h + ~22 h for English/Spanish, decision 2026-10-31) at ~10 h/week. Real slack before August is now near zero, so expect to use the pre-agreed cut list.

| Milestone | Window | Stories | Hours (cum.) | Gate |
|---|---|---|---|---|
| M0 Spike | Nov 1 – Dec 31, 2026 | US-001, US-002 (migration 001 + RLS skeleton), US-003 (adapters) | ~58 | G0 Dec 31: ≤50 min game, ≥70% embeddable, ≤0.3 s clip start, phone links, terms written down |
| Stack decision | first backend commit, Jan 2027 | — | — | Python/FastAPI default; Node/TS only if backend fluency ≈ Python |
| Pre-sell | Jan – Feb 28, 2027 | US-014 (payment test, terms page, landing) | — | G1: ≥3 staffs committed (≥1 program money / outside circle); $1 charge+refund from Panama |
| M1 Alpha build | Jan – Apr 15, 2027 | US-004, US-005, US-006, US-007, US-002 (auth), US-015 (catalogs + Spanish UI) | ~237 | Alpha to JJ's staff by Apr 15 |
| Spring alpha + M2 | Apr – Jun 2027 | US-008, US-009, US-010, US-011 | ~326 | G2 Jun 30: median ≤40 min by 3rd game; 2nd coach tags alone; sheet used in planning |
| M3 Pilot-ready | Jul 2027 (freeze Jul 15) | US-012, US-013, US-014 complete; Spanish emails, legal pages, print sheet | ~366 | G3 Jul 31: 4 pre-invoice checks pass; ≥3 paid teams onboarded |
| Paid pilot | Aug – Sep 2027 | support + speed fixes | — | G4: game 1 ≤45 min, game 3 ≤30 per side; weekly sheet use; ≥70% tag 6 of first 8 weeks |
| v1.1 | Oct – Dec 2027 | top 1–2 pilot requests (hosted upload, roster + player page, multi-part, pack picker) | — | ≥70% renewal intent |

## Pre-agreed cut order (~28 h)
Triggered if M0 overruns by >15 h or JJ averages <8 h/week for 3+ weeks:
1. Browser print of the report instead of a styled print sheet (−6 h)
2. Review list read-only, edits in the tag panel (−4 h)
3. Kickoff marker only (−4 h)
4. Clip links to v1.1 (−4 h)
5. Defer `local` provider only if embed rate ≥85% (−10 h)

## Follow-ups outside the build
- Update the design canvas to the 7 screens + 2 modals and the Breakdown Interaction Spec (new keys N/G/Shift+Q/T, J/K/L; remove offline queue, live sync, Cmd+K, 2× autoplay).
- Update `project-context.md` with the council decisions.
