import type { RangeResult, SeekResult } from "../player/PlayerAdapter";

export function percentile(values: number[], p: number): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[idx] ?? null;
}

export const median = (values: number[]) => percentile(values, 50);

/** M0 gate thresholds (docs/plan-v1.md, US-001). */
export const GATES = {
  seekMedianMs: 300,
  clipStartErrorMs: 300,
  clipEndOvershootP90Ms: 500,
  minutesPerGame: 50,
  playsPerGame: 70,
} as const;

export interface IgnoredMark {
  key: "I" | "O";
  atMs: number;
  state: string;
  wallClock: string;
}

export interface SpikeLog {
  source: { provider: string; id: string; durationMs: number };
  seeks: SeekResult[];
  clipChecks: RangeResult[];
  ignoredMarks: IgnoredMark[];
  firstSnapAt: number | null;
  lastSaveAt: number | null;
  playsSaved: number;
}

export function newLog(): SpikeLog {
  return {
    source: { provider: "", id: "", durationMs: 0 },
    seeks: [],
    clipChecks: [],
    ignoredMarks: [],
    firstSnapAt: null,
    lastSaveAt: null,
    playsSaved: 0,
  };
}

export interface Summary {
  seekMedianMs: number | null;
  seekP90Ms: number | null;
  clipStartErrorP90Ms: number | null;
  clipEndOvershootP90Ms: number | null;
  elapsedMin: number | null;
  minutesPer70Plays: number | null;
  ignoredMarks: number;
  pass: {
    seek: boolean | null;
    clipStart: boolean | null;
    clipEnd: boolean | null;
    pace: boolean | null;
  };
}

export function summarize(log: SpikeLog): Summary {
  const lat = log.seeks.filter((s) => !s.timedOut).map((s) => s.latencyMs);
  const startErr = log.clipChecks.map((c) => Math.abs(c.seek.landedMs - c.startMs));
  const overshoot = log.clipChecks.map((c) => Math.max(0, c.endOvershootMs));
  const elapsedMin =
    log.firstSnapAt !== null && log.lastSaveAt !== null ? (log.lastSaveAt - log.firstSnapAt) / 60000 : null;
  const per70 =
    elapsedMin !== null && log.playsSaved >= 5 ? (elapsedMin / log.playsSaved) * GATES.playsPerGame : null;
  const seekMedianMs = median(lat);
  const clipStartErrorP90Ms = percentile(startErr, 90);
  const clipEndOvershootP90Ms = percentile(overshoot, 90);
  const check = (v: number | null, max: number) => (v === null ? null : v <= max);
  return {
    seekMedianMs,
    seekP90Ms: percentile(lat, 90),
    clipStartErrorP90Ms,
    clipEndOvershootP90Ms,
    elapsedMin,
    minutesPer70Plays: per70,
    ignoredMarks: log.ignoredMarks.length,
    pass: {
      seek: check(seekMedianMs, GATES.seekMedianMs),
      clipStart: check(clipStartErrorP90Ms, GATES.clipStartErrorMs),
      clipEnd: check(clipEndOvershootP90Ms, GATES.clipEndOvershootP90Ms),
      pace: check(per70, GATES.minutesPerGame),
    },
  };
}
