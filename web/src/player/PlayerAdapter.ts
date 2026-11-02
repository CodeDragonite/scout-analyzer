/**
 * The only video API the breakdown shell may use. Providers (YouTube, local
 * file, later hosted upload) implement it; the shell reads `capabilities`,
 * never the provider name.
 */

export type PlayerState =
  | "loading"
  | "unstarted"
  | "playing"
  | "paused"
  | "buffering"
  /** Reports "playing" but the clock isn't moving: an ad or a stall. Marks are ignored. */
  | "stalled"
  | "ended"
  | "error";

export interface Capabilities {
  /** Smallest step for ←/→ while paused. */
  stepMs: number;
  rates: number[];
  frameAccurate: boolean;
  /** Clips can be shared as links (YouTube only). */
  linkable: boolean;
  /** Other coaches can play this source (false for a file on one laptop). */
  shared: boolean;
}

export interface SeekResult {
  targetMs: number;
  landedMs: number;
  latencyMs: number;
  timedOut: boolean;
}

export interface RangeResult {
  startMs: number;
  endMs: number;
  seek: SeekResult;
  /** How far past `endMs` playback was when it stopped. */
  endOvershootMs: number;
}

export type PlayerErrorCode = "invalid" | "html5" | "notFound" | "embedBlocked" | "unknown";

export interface ClipLinks {
  /** Plain link with a start time (works everywhere, no end). */
  short: string;
  /** Embed link with start and end (to verify on phones in M0). */
  embed: string;
}

export interface PlayerAdapter {
  readonly provider: "youtube" | "local";
  readonly capabilities: Capabilities;
  load(container: HTMLElement): Promise<void>;
  play(): void;
  pause(): void;
  seek(ms: number): Promise<SeekResult>;
  step(direction: 1 | -1): Promise<void>;
  setRate(rate: number): void;
  rate(): number;
  now(): number;
  duration(): number;
  playRange(startMs: number, endMs: number): Promise<RangeResult>;
  state(): PlayerState;
  onState(fn: (s: PlayerState) => void): () => void;
  onError(fn: (code: PlayerErrorCode) => void): () => void;
  linksFor(startMs: number, endMs: number): ClipLinks | null;
  destroy(): void;
}

/** Shared helper: resolve when `pred` is true or after `timeoutMs`. */
export function waitFor(pred: () => boolean, timeoutMs: number, everyMs = 16): Promise<boolean> {
  return new Promise((resolve) => {
    const start = performance.now();
    const tick = () => {
      if (pred()) return resolve(true);
      if (performance.now() - start > timeoutMs) return resolve(false);
      setTimeout(tick, everyMs);
    };
    tick();
  });
}

export class Emitter<T> {
  private fns = new Set<(v: T) => void>();
  on(fn: (v: T) => void): () => void {
    this.fns.add(fn);
    return () => this.fns.delete(fn);
  }
  emit(v: T): void {
    this.fns.forEach((fn) => fn(v));
  }
  clear(): void {
    this.fns.clear();
  }
}
