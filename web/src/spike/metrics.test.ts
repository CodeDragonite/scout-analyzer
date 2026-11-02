import { describe, expect, it } from "vitest";
import { median, newLog, percentile, summarize } from "./metrics";

describe("percentile", () => {
  it("handles empty input", () => expect(percentile([], 50)).toBeNull());
  it("nearest-rank", () => {
    expect(median([5, 1, 3])).toBe(3);
    expect(percentile([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 90)).toBe(9);
  });
});

describe("summarize", () => {
  it("projects pace to 70 plays and checks gates", () => {
    const log = newLog();
    log.firstSnapAt = 0;
    log.lastSaveAt = 10 * 60_000; // 10 min
    log.playsSaved = 20;
    log.seeks = [
      { targetMs: 0, landedMs: 0, latencyMs: 200, timedOut: false },
      { targetMs: 0, landedMs: 0, latencyMs: 400, timedOut: false },
      { targetMs: 0, landedMs: 0, latencyMs: 250, timedOut: false },
    ];
    log.clipChecks = [
      { startMs: 1000, endMs: 5000, endOvershootMs: 300, seek: { targetMs: 1000, landedMs: 1100, latencyMs: 0, timedOut: false } },
    ];
    const s = summarize(log);
    expect(s.minutesPer70Plays).toBeCloseTo(35);
    expect(s.pass.pace).toBe(true);
    expect(s.seekMedianMs).toBe(250);
    expect(s.pass.seek).toBe(true);
    expect(s.clipStartErrorP90Ms).toBe(100);
    expect(s.pass.clipEnd).toBe(true);
  });

  it("needs at least 5 plays to project pace", () => {
    const log = newLog();
    log.firstSnapAt = 0;
    log.lastSaveAt = 60_000;
    log.playsSaved = 2;
    expect(summarize(log).minutesPer70Plays).toBeNull();
  });
});
