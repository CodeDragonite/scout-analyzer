import {
  type Capabilities,
  type ClipLinks,
  Emitter,
  type PlayerAdapter,
  type PlayerErrorCode,
  type PlayerState,
  type RangeResult,
  type SeekResult,
  waitFor,
} from "./PlayerAdapter";

declare global {
  interface Window {
    onYouTubeIframeAPIReady?: () => void;
  }
}

let apiPromise: Promise<void> | null = null;

/** Load the official IFrame Player API once. */
export function loadYouTubeApi(): Promise<void> {
  if (apiPromise) return apiPromise;
  apiPromise = new Promise((resolve, reject) => {
    if (window.YT?.Player) return resolve();
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      resolve();
    };
    const s = document.createElement("script");
    s.src = "https://www.youtube.com/iframe_api";
    s.onerror = () => {
      apiPromise = null;
      reject(new Error("YouTube IFrame API failed to load"));
    };
    document.head.appendChild(s);
  });
  return apiPromise;
}

const ERROR_MAP: Record<number, PlayerErrorCode> = {
  2: "invalid",
  5: "html5",
  100: "notFound",
  101: "embedBlocked",
  150: "embedBlocked",
};

/** A clock frozen this long while YouTube says "playing" counts as stalled (ad or stall). */
const STALL_MS = 700;

export class YouTubeAdapter implements PlayerAdapter {
  readonly provider = "youtube" as const;
  readonly capabilities: Capabilities = {
    stepMs: 200,
    rates: [0.25, 0.5, 1, 2],
    frameAccurate: false,
    linkable: true,
    shared: true,
  };

  private player: YT.Player | null = null;
  private ytState = -1;
  private current: PlayerState = "loading";
  private lastTime = 0;
  private lastMoveAt = 0;
  private poll: number | undefined;
  private states = new Emitter<PlayerState>();
  private errors = new Emitter<PlayerErrorCode>();

  constructor(readonly videoId: string) {}

  async load(container: HTMLElement): Promise<void> {
    await loadYouTubeApi();
    const host = document.createElement("div");
    container.replaceChildren(host);
    await new Promise<void>((resolve) => {
      this.player = new YT.Player(host, {
        videoId: this.videoId,
        width: "100%",
        height: "100%",
        playerVars: {
          disablekb: 1, // our shell owns the keyboard
          playsinline: 1,
          rel: 0,
          enablejsapi: 1,
          origin: window.location.origin,
        },
        events: {
          onReady: () => {
            this.setState("unstarted");
            resolve();
          },
          onStateChange: (e) => {
            this.ytState = e.data;
            this.recompute();
          },
          onError: (e) => {
            this.setState("error");
            this.errors.emit(ERROR_MAP[e.data] ?? "unknown");
            resolve();
          },
        },
      });
    });
    this.poll = window.setInterval(() => this.recompute(), 100);
  }

  private recompute(): void {
    if (!this.player || this.current === "error") return;
    const t = this.now();
    const nowMs = performance.now();
    if (Math.abs(t - this.lastTime) > 1) {
      this.lastTime = t;
      this.lastMoveAt = nowMs;
    }
    let next: PlayerState;
    switch (this.ytState) {
      case YT.PlayerState.PLAYING:
        next = nowMs - this.lastMoveAt > STALL_MS ? "stalled" : "playing";
        break;
      case YT.PlayerState.PAUSED:
        next = "paused";
        break;
      case YT.PlayerState.BUFFERING:
        next = "buffering";
        break;
      case YT.PlayerState.ENDED:
        next = "ended";
        break;
      default:
        next = "unstarted";
    }
    this.setState(next);
  }

  private setState(s: PlayerState): void {
    if (s === this.current) return;
    if (s === "playing") this.lastMoveAt = performance.now();
    this.current = s;
    this.states.emit(s);
  }

  play(): void {
    this.lastMoveAt = performance.now();
    this.player?.playVideo();
  }

  pause(): void {
    this.player?.pauseVideo();
  }

  now(): number {
    return (this.player?.getCurrentTime?.() ?? 0) * 1000;
  }

  duration(): number {
    return (this.player?.getDuration?.() ?? 0) * 1000;
  }

  rate(): number {
    return this.player?.getPlaybackRate?.() ?? 1;
  }

  setRate(rate: number): void {
    this.player?.setPlaybackRate(rate);
  }

  /**
   * Seek and wait until it has settled. While playing, "settled" means the
   * clock is moving again near the target; while paused, that YouTube is no
   * longer buffering. getCurrentTime() reports the target immediately, so the
   * paused latency is a lower bound — note this in the spike results.
   */
  async seek(ms: number): Promise<SeekResult> {
    const wasPlaying = this.ytState === YT.PlayerState.PLAYING;
    const t0 = performance.now();
    this.lastMoveAt = t0;
    this.player?.seekTo(ms / 1000, true);
    let firstSeen = -1;
    const ok = await waitFor(() => {
      if (this.ytState === YT.PlayerState.BUFFERING) return false;
      const t = this.now();
      if (Math.abs(t - ms) > 1500) return false;
      if (!wasPlaying) return true;
      if (firstSeen < 0) {
        firstSeen = t;
        return false;
      }
      return t > firstSeen + 20; // clock advancing = frames playing
    }, 8000);
    return { targetMs: ms, landedMs: this.now(), latencyMs: performance.now() - t0, timedOut: !ok };
  }

  async step(direction: 1 | -1): Promise<void> {
    this.pause();
    await this.seek(Math.max(0, this.now() + direction * this.capabilities.stepMs));
  }

  async playRange(startMs: number, endMs: number): Promise<RangeResult> {
    this.play();
    const seek = await this.seek(startMs);
    this.play();
    await waitFor(() => this.now() >= endMs, Math.max(1000, (endMs - startMs) * 3 + 5000), 10);
    this.pause();
    await waitFor(() => this.ytState !== YT.PlayerState.PLAYING, 1000);
    return { startMs, endMs, seek, endOvershootMs: this.now() - endMs };
  }

  state(): PlayerState {
    return this.current;
  }

  onState(fn: (s: PlayerState) => void): () => void {
    return this.states.on(fn);
  }

  onError(fn: (code: PlayerErrorCode) => void): () => void {
    return this.errors.on(fn);
  }

  linksFor(startMs: number, endMs: number): ClipLinks {
    const s = Math.max(0, Math.floor(startMs / 1000));
    const e = Math.ceil(endMs / 1000);
    return {
      short: `https://youtu.be/${this.videoId}?t=${s}`,
      embed: `https://www.youtube.com/embed/${this.videoId}?start=${s}&end=${e}`,
    };
  }

  destroy(): void {
    window.clearInterval(this.poll);
    this.player?.destroy();
    this.player = null;
    this.states.clear();
    this.errors.clear();
  }
}
