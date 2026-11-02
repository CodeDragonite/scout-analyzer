# M0 spike results

Fill this in as you run the spike (Nov 1 – Dec 31, 2026). Attach the exported JSON files from the harness next to it (`docs/spike-data/`). The Dec 31 gate decides whether v1 stays YouTube-first.

## How to run
1. `cd web && npm install && npm run dev`, open the URL Vite prints, in Chrome on the laptop you'd really tag on.
   Type your name when asked (no password). Tags save in this browser after every change; reopening the same YouTube link or the same file restores them. Use **Switch coach** on a shared laptop.
2. **Accuracy and speed:** load a real opponent replay, tag one full half with the keyboard. Every few plays, select a play and press `V` to replay it; that records clip start error and end overshoot. Press **Export results** at the end.
3. **Same test on a local file:** open one game file from the laptop and repeat step 2.
4. **Embed rate:** open `/embed-check.html`, paste 30+ opponent replay links from pilot coaches, run, copy the CSV here.
5. **Phone links:** use **Copy link** on a few plays, send them to yourself on iMessage/WhatsApp/GroupMe, and note whether the short link and the embed link open at the right second and stop at the end.
6. **School networks:** from 2–3 pilot schools, open the harness and load a video; note whether YouTube loads at all.
7. **YouTube terms:** read the current YouTube API Services Terms and Developer Policies on charging for a product built around embedded videos. Quote the relevant lines below with the date read.

## Gate (docs/plan-v1.md)

| Check | Target | Result | Pass? |
|---|---|---|---|
| Seek latency, median | ≤ 300 ms | | |
| Clip start error | ≤ 0.3 s | | |
| Clip end overshoot, p90 | ≤ 0.5 s | | |
| One full game tagged | ≤ 50 min | | |
| Embeddable share of ≥30 opponent replays | ≥ 70% | | |
| Start/end links open correctly from phone chat apps | yes | | |
| YouTube terms written down | yes | | |

Also record: split-stream share, mid-roll ad count per game, marks ignored during ads, school networks that block YouTube.

**Responses** if a check fails: speed > 60 min → rethink YouTube-first; embed rate 50–70% → hosted upload first in v1.1; < 50% → hosted upload into M3 and apply the cut list; terms block charging → reprice ("film free, reports paid") or stop.

## Known limits of the harness
- On YouTube, `getCurrentTime()` reports the target right after a paused seek, so paused seek latency is a lower bound. Seeks while playing wait for the clock to move and are the better number.
- "Ad or stall" is detected as the player saying *playing* while the clock is frozen for 700 ms; the IFrame API doesn't expose ads directly.
- Local-file frame stepping uses the measured frame duration when the browser supports `requestVideoFrameCallback`, otherwise 1/30 s.

- Autosave is browser `localStorage` only: clearing site data, another browser or another laptop won't see the tags. Export the JSON after each session; it is the record for the gate.
- The pace timer uses the wall clock, so if the page is closed mid-game and reopened later, the gap counts toward minutes tagged. Note any long break next to the result.

## Results
_Not run yet._

## YouTube terms notes
_Not read yet._
