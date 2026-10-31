# Breakdown Interaction Spec (v1, consolidated)

Source of truth for the Breakdown screen. Consolidated from the "Breakdown Interaction Spec" doc after the council review (2026-10-30) and the bilingual decision (2026-10-31). Where they disagree, this file wins for code.

## Goal
Tag a game side fast: ≤50 min at the Dec spike, ≤45 min at pilot game 1, ≤30 min by game 3. An in-app timer measures from the first `I` to the last `Enter`.

## Zones and focus
- The app shell owns the keyboard. The player never keeps focus; when the YouTube iframe takes focus, focus returns to the shell on the next tick.
- YouTube embed loads with `disablekb=1`. Nothing is ever drawn over the player.
- Modes: **Watch** (all hotkeys), **Pick** (a tag group is armed; `1`–`9` pick, `0` more, `Esc` back), **Type** (text field focused; only `Esc`, `Enter`, `Tab`, `Shift+Tab` keep their meaning).

## Hotkeys (same physical keys in English and Spanish)

| Key | Action |
|---|---|
| `Space` / `K` | Play / pause |
| `J` / `L` | Back / forward 10 s |
| `←` / `→` | Step: 0.2 s on YouTube, one frame on a local file (paused) |
| `Shift+←` / `Shift+→` | Back / forward 5 s |
| `,` / `.` | Slower / faster (0.25×, 0.5×, 1×, 2×) |
| `I` | Mark snap: saves `snap_ms`, opens the play, arms the first tag group. Ignored during ad/buffering |
| `O` | Mark whistle (clip end). Ignored during ad/buffering |
| `Enter` | Save play |
| `N` | After save: jump to the last whistle and play forward to the next snap |
| `G` | Mark kickoff |
| `Shift+Q` | Mark halftime |
| `T` | Toggle side (offense/defense/special teams) |
| `↑` / `↓` | Previous / next play in the rail |
| `U` | Undo last save |
| `?` | Hotkey sheet |
| `Esc` | Back to Watch |

Tag field keys: `D` down & distance, `Q` quarter, `Y` yard line (`-35` own, `+35` opponent), `H` hash, `E` personnel, `F` structure, `S` strength, `B` backfield, `M` motion, `P` play type, `C` concept, `R` result (`+7`, `-2`, `inc`, `td`, `int`, `fum`, `pen +5`).

Every hotkey has a visible on-screen button; focus is always visible.

## Mark, tag, save
1. `I` at the snap → new play with carried values (unconfirmed) and the first tag group armed.
2. `O` at the whistle. If skipped, end = next snap − 1 s, flagged *auto end*.
3. Digits pick tags; each pick advances to the next group.
4. `R` result, `Enter` saves. Saving confirms carried values.
5. `N` skips dead time to the next snap.

Clips play from `snap_ms − 4 s` to the whistle (+0.5 s).

## Carry-forward
Field position is `yards_to_goal` (1–99) from the offense's view; display "Own 35" (`yards_to_goal` 65) / "Opp 22" (22).

| Previous result | Next down & distance | Next spot | Possession |
|---|---|---|---|
| Gain ≥ distance | 1st & 10, or 1st & goal if inside the 10 | Spot + gain | Same |
| Gain < distance, downs 1–3 | Down + 1, distance − gain | Spot + gain | Same |
| Incomplete | Down + 1, same distance | Same | Same |
| 4th down short of the line | 1st & 10 (or goal) | Mirrored | Flips |
| Touchdown | Blank | Blank | Blank |
| Interception, fumble lost | 1st & 10 | Blank | Flips |
| Penalty ±N | Same down, distance ∓ N; first down only if yardage reaches it | Spot ± N | Same |
| Punt, kick, safety | Blank | Blank | Flips |

Quarter carries. Unknown values stay blank, never guessed. Editing an earlier play recomputes later plays only while their values are still carried (`carried_fields[]`).

## States
- Saves are optimistic with client UUIDs and idempotent retries; header shows "N plays waiting to save". No offline queue, no live sync (409 conflict notice instead).
- YouTube video unavailable: "Your tags are safe" banner; tags and reports keep working.
- Trimmed/re-uploaded video (duration changed): banner + manual re-sync via `offset_ms`, never automatic.

## Motion
Only confirms an action, ≤150 ms, respects `prefers-reduced-motion`. No toasts for routine saves.

## Language
English and Spanish everywhere. Formats: "3rd & 5" / "3.ª y 5", "Own 35" / "Propia 35", "Opp 22" / "Rival 22", "1st & Goal" / "1.ª y gol".
