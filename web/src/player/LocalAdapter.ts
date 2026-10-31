import {
  type Capabilities,
  Emitter,
  type PlayerAdapter,
  type PlayerErrorCode,
  type PlayerState,
  type RangeResult,
  type SeekResult,
  waitFor,
} from "./PlayerAdapter";

/**
 * A video file on the coach's own laptop, played in the browser. Nothing is
 * uploaded. Other coaches see the tags and reports, not this film.
 */
export class LocalAdapter implements PlayerAdapter {
  readonly provider = "local" as const;
  readonly capabilities: Capabilities = {
    stepMs: 1000 / 30,
    rates: [0.25, 0.5, 1, 2],
    frameAccurate: true,
    linkable: false,
    shared: false,
  };

  private video: HTMLVideoElement | null = null;
  private url = "";
  private current: PlayerState = "loading";
  private states = new Emitter<PlayerState>();
  private errors = new Emitter<PlayerErrorCode>();

  /** Size + SHA-256 of the first MiB: detects reopening a different file. */
  readonly fingerprint: Promise<string>;

  constructor(readonly file: File) {
    this.fingerprint = fingerprintFile(file);
  }

  async load(container: HTMLElement): Promise<void> {
    const v = document.createElement("video");
    v.playsInline = true;
    v.preload = "auto";
    v.controls = false; // keyboard stays with the shell
    v.tabIndex = -1;
    v.style.width = "100%";
    v.style.height = "100%";
    v.style.background = "#000";
    this.url = URL.createObjectURL(this.file);
    v.src = this.url;
    container.replaceChildren(v);
    this.video = v;

    const set = (s: PlayerState) => () => this.setState(s);
    v.addEventListener("playing", set("playing"));
    v.addEventListener("pause", set("paused"));
    v.addEventListener("waiting", set("buffering"));
    v.addEventListener("ended", set("ended"));
    v.addEventListener("error", () => {
      this.setState("error");
      this.errors.emit("html5");
    });

    await new Promise<void>((resolve) => {
      v.addEventListener("loadedmetadata", () => resolve(), { once: true });
      v.addEventListener("error", () => resolve(), { once: true });
    });
    if (this.current !== "error") this.setState("unstarted");
    this.measureFrameDuration();
  }

  /** Use requestVideoFrameCallback when available to learn the real frame duration. */
  private measureFrameDuration(): void {
    const v = this.video;
    if (!v || !("requestVideoFrameCallback" in v)) return;
    let last = -1;
    const samples: number[] = [];
    const cb = (_now: number, meta: VideoFrameCallbackMetadata) => {
      if (last >= 0) {
        const d = (meta.mediaTime - last) * 1000;
        if (d > 5 && d < 100) samples.push(d);
      }
      last = meta.mediaTime;
      if (samples.length < 10 && this.video) v.requestVideoFrameCallback(cb);
      else if (samples.length) {
        samples.sort((a, b) => a - b);
        this.capabilities.stepMs = samples[Math.floor(samples.length / 2)] ?? this.capabilities.stepMs;
      }
    };
    v.requestVideoFrameCallback(cb);
  }

  private setState(s: PlayerState): void {
    if (s === this.current) return;
    this.current = s;
    this.states.emit(s);
  }

  play(): void {
    void this.video?.play();
  }

  pause(): void {
    this.video?.pause();
  }

  now(): number {
    return (this.video?.currentTime ?? 0) * 1000;
  }

  duration(): number {
    const d = this.video?.duration ?? 0;
    return Number.isFinite(d) ? d * 1000 : 0;
  }

  rate(): number {
    return this.video?.playbackRate ?? 1;
  }

  setRate(rate: number): void {
    if (this.video) this.video.playbackRate = rate;
  }

  async seek(ms: number): Promise<SeekResult> {
    const v = this.video;
    const t0 = performance.now();
    if (!v) return { targetMs: ms, landedMs: 0, latencyMs: 0, timedOut: true };
    let done = false;
    v.addEventListener("seeked", () => (done = true), { once: true });
    v.currentTime = ms / 1000;
    const ok = await waitFor(() => done, 5000);
    return { targetMs: ms, landedMs: this.now(), latencyMs: performance.now() - t0, timedOut: !ok };
  }

  async step(direction: 1 | -1): Promise<void> {
    this.pause();
    await this.seek(Math.max(0, this.now() + direction * this.capabilities.stepMs));
  }

  async playRange(startMs: number, endMs: number): Promise<RangeResult> {
    const seek = await this.seek(startMs);
    this.play();
    await waitFor(() => this.now() >= endMs, Math.max(1000, (endMs - startMs) * 3 + 5000), 10);
    this.pause();
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

  linksFor(): null {
    return null; // a file on one laptop can't be shared
  }

  destroy(): void {
    this.video?.pause();
    this.video?.removeAttribute("src");
    this.video?.load();
    if (this.url) URL.revokeObjectURL(this.url);
    this.video = null;
    this.states.clear();
    this.errors.clear();
  }
}

async function fingerprintFile(file: File): Promise<string> {
  const head = await file.slice(0, 1024 * 1024).arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", head);
  const hex = Array.from(new Uint8Array(digest).slice(0, 8), (b) => b.toString(16).padStart(2, "0")).join("");
  return `${file.size}-${hex}`;
}
