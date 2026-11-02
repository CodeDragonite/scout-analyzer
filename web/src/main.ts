/**
 * M0 spike harness. Throwaway UI around keepable parts (PlayerAdapter,
 * carry-forward, formats, i18n). Measures what the Dec 31 gate needs:
 * seek latency, clip accuracy, pace per game, marks ignored during ads.
 */
import "./styles.css";
import { carryForward, type CarriedField, parseResult, type Situation } from "./football/carryForward";
import { formatDownDistance, formatFieldPosition, formatTimecode, parseYardLine } from "./football/format";
import { getLocale, type MessageKey, onLocaleChange, setLocale, t } from "./i18n/i18n";
import { LocalAdapter } from "./player/LocalAdapter";
import type { PlayerAdapter, PlayerState } from "./player/PlayerAdapter";
import { YouTubeAdapter } from "./player/YouTubeAdapter";
import { parseYouTubeId } from "./player/youtubeUrl";
import { newLog, summarize } from "./spike/metrics";
import { browserStorage, createStore } from "./spike/store";

type PlayType = "run" | "pass" | "rpo" | "screen" | "special";
const PLAY_TYPES: PlayType[] = ["run", "pass", "rpo", "screen", "special"];
type Side = "offense" | "defense" | "special";
const SIDES: Side[] = ["offense", "defense", "special"];
const PRE_ROLL_MS = 4000;
const POST_ROLL_MS = 500;

interface Play {
  id: string;
  n: number;
  snapMs: number;
  endMs: number;
  endAuto: boolean;
  side: Side;
  situation: Situation;
  carried: CarriedField[];
  playType: PlayType | null;
  result: string;
}

interface Draft {
  snapMs: number;
  endMs: number | null;
  situation: Situation;
  carried: CarriedField[];
  playType: PlayType | null;
}

const BLANK: Situation = { quarter: 1, down: null, distance: null, goalToGo: false, yardsToGoal: null, possession: null };

const store = createStore(browserStorage());

const app = {
  /** Coach name typed at the start; null until they enter it. */
  user: store.user(),
  /** "youtube:<id>" or "local:<fingerprint>": one saved session per coach and video. */
  sourceKey: null as string | null,
  saveFailed: false,
  adapter: null as PlayerAdapter | null,
  plays: [] as Play[],
  draft: null as Draft | null,
  next: { situation: BLANK, carried: ["quarter"] as CarriedField[] },
  side: "defense" as Side, // scouting an opponent's offense = our defense's view
  selected: -1,
  skipping: false,
  rateIdx: 2,
  markers: { kickoffMs: null as number | null, halftimeMs: null as number | null },
  log: newLog(),
  armed: false,
};

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

// ---------- autosave (localStorage, M0 only) ----------

/** Save after every change. A failed write shows a banner until a later save works. */
function persist(): void {
  if (!app.user || !app.sourceKey) return;
  const ok = store.save(app.user, app.sourceKey, {
    plays: app.plays,
    draft: app.draft,
    next: app.next,
    side: app.side,
    markers: app.markers,
    log: app.log,
  });
  if (ok === !app.saveFailed) return;
  app.saveFailed = !ok;
  banner(ok ? "" : t("msg.saveFailed"));
}

function restore(sourceKey: string): number {
  const saved = app.user ? store.load<Play, Draft>(app.user, sourceKey) : null;
  if (!saved) return 0;
  app.plays = saved.plays;
  app.draft = saved.draft;
  app.next = saved.next;
  app.side = SIDES.includes(saved.side as Side) ? (saved.side as Side) : app.side;
  app.markers = saved.markers;
  app.log = saved.log;
  app.selected = app.plays.length - 1;
  return app.plays.length;
}

// ---------- actions ----------

type Action =
  | "playPause" | "back10" | "fwd10" | "stepBack" | "stepFwd" | "back5" | "fwd5" | "slower" | "faster"
  | "markSnap" | "markWhistle" | "save" | "nextSnap" | "kickoff" | "halftime" | "toggleSide"
  | "prevPlay" | "nextPlay" | "undo" | "replayClip" | "focusYard" | "focusResult" | "help";

const KEYS: Array<{ key: string; shift?: boolean; action: Action; label: string }> = [
  { key: " ", action: "playPause", label: "Space" },
  { key: "k", action: "playPause", label: "K" },
  { key: "j", action: "back10", label: "J" },
  { key: "l", action: "fwd10", label: "L" },
  { key: "ArrowLeft", action: "stepBack", label: "←" },
  { key: "ArrowRight", action: "stepFwd", label: "→" },
  { key: "ArrowLeft", shift: true, action: "back5", label: "⇧←" },
  { key: "ArrowRight", shift: true, action: "fwd5", label: "⇧→" },
  { key: ",", action: "slower", label: "," },
  { key: ".", action: "faster", label: "." },
  { key: "i", action: "markSnap", label: "I" },
  { key: "o", action: "markWhistle", label: "O" },
  { key: "Enter", action: "save", label: "↵" },
  { key: "n", action: "nextSnap", label: "N" },
  { key: "g", action: "kickoff", label: "G" },
  { key: "q", shift: true, action: "halftime", label: "⇧Q" },
  { key: "t", action: "toggleSide", label: "T" },
  { key: "ArrowUp", action: "prevPlay", label: "↑" },
  { key: "ArrowDown", action: "nextPlay", label: "↓" },
  { key: "u", action: "undo", label: "U" },
  { key: "v", action: "replayClip", label: "V" },
  { key: "y", action: "focusYard", label: "Y" },
  { key: "r", action: "focusResult", label: "R" },
  { key: "?", shift: true, action: "help", label: "?" },
];

const BUTTONS: Action[] = [
  "playPause", "back10", "fwd10", "stepBack", "stepFwd", "slower", "faster",
  "markSnap", "markWhistle", "save", "nextSnap", "kickoff", "halftime", "toggleSide", "replayClip", "undo",
];

function labelFor(action: Action): string {
  return KEYS.find((k) => k.action === action)?.label ?? "";
}

async function timedSeek(ms: number): Promise<void> {
  const a = app.adapter;
  if (!a) return;
  const r = await a.seek(Math.max(0, Math.min(ms, a.duration() || ms)));
  app.log.seeks.push(r);
  persist();
  renderMetrics();
}

const blocked = (s: PlayerState) => s === "buffering" || s === "stalled" || s === "loading";

function run(action: Action): void {
  const a = app.adapter;
  if (action === "help") return openSheet();
  if (action === "focusYard") return void ($("yard") as HTMLInputElement | null)?.focus();
  if (action === "focusResult") return void ($("result") as HTMLInputElement | null)?.focus();
  if (action === "prevPlay" || action === "nextPlay") {
    if (!app.plays.length) return;
    const d = action === "prevPlay" ? -1 : 1;
    app.selected = Math.min(app.plays.length - 1, Math.max(0, (app.selected < 0 ? app.plays.length : app.selected) + d));
    return renderRail();
  }
  if (action === "toggleSide") {
    app.side = SIDES[(SIDES.indexOf(app.side) + 1) % SIDES.length] ?? "offense";
    persist();
    return renderDraft();
  }
  if (action === "undo") {
    const last = app.plays.pop();
    if (last) {
      app.log.playsSaved = Math.max(0, app.log.playsSaved - 1);
      app.next = { situation: last.situation, carried: last.carried };
      flash(t("msg.undone", { n: last.n }));
      persist();
    }
    return render();
  }
  if (action === "save") return save();
  if (!a) return flash(t("msg.noVideo"));

  switch (action) {
    case "playPause":
      return a.state() === "playing" || a.state() === "stalled" ? a.pause() : a.play();
    case "back10":
      return void timedSeek(a.now() - 10_000);
    case "fwd10":
      return void timedSeek(a.now() + 10_000);
    case "back5":
      return void timedSeek(a.now() - 5_000);
    case "fwd5":
      return void timedSeek(a.now() + 5_000);
    case "stepBack":
      return void a.step(-1).then(renderStatus);
    case "stepFwd":
      return void a.step(1).then(renderStatus);
    case "slower":
    case "faster": {
      const rates = a.capabilities.rates;
      app.rateIdx = Math.min(rates.length - 1, Math.max(0, app.rateIdx + (action === "faster" ? 1 : -1)));
      a.setRate(rates[app.rateIdx] ?? 1);
      return renderStatus();
    }
    case "markSnap":
      return markSnap(a);
    case "markWhistle":
      return markWhistle(a);
    case "nextSnap": {
      const last = app.plays[app.plays.length - 1];
      app.skipping = true;
      a.setRate(2);
      void timedSeek(last ? last.endMs : a.now()).then(() => a.play());
      return renderStatus();
    }
    case "kickoff":
      app.markers.kickoffMs = a.now();
      persist();
      return flash(t("msg.kickoff", { time: formatTimecode(a.now()) }));
    case "halftime":
      app.markers.halftimeMs = a.now();
      app.next = { situation: { ...BLANK, quarter: 3 }, carried: ["quarter"] };
      persist();
      flash(t("msg.halftime", { time: formatTimecode(a.now()) }));
      return renderDraft();
    case "replayClip":
      return void replayClip(a);
  }
}

function ignoreMark(a: PlayerAdapter, key: "I" | "O"): boolean {
  if (!blocked(a.state())) return false;
  app.log.ignoredMarks.push({ key, atMs: a.now(), state: a.state(), wallClock: new Date().toISOString() });
  persist();
  flash(t("msg.markIgnored", { key, state: t(`state.${a.state()}` as MessageKey) }));
  renderMetrics();
  return true;
}

function markSnap(a: PlayerAdapter): void {
  if (ignoreMark(a, "I")) return;
  const snapMs = a.now();
  if (app.draft) {
    // A new snap closes the open play: end = this snap − 1 s, flagged auto end.
    commit(app.draft, Math.max(app.draft.snapMs, snapMs - 1000), true, "");
  }
  if (app.skipping) {
    app.skipping = false;
    a.setRate(app.adapter?.capabilities.rates[app.rateIdx] ?? 1);
  }
  if (app.log.firstSnapAt === null) app.log.firstSnapAt = Date.now();
  app.draft = { snapMs, endMs: null, situation: { ...app.next.situation }, carried: [...app.next.carried], playType: null };
  app.armed = true; // I arms the first tag group: digits pick play type
  persist();
  render();
}

function markWhistle(a: PlayerAdapter): void {
  if (!app.draft) return flash(t("msg.noOpenPlay"));
  if (ignoreMark(a, "O")) return;
  app.draft.endMs = a.now();
  persist();
  renderDraft();
}

function pickType(i: number): void {
  if (!app.draft) return;
  const type = PLAY_TYPES[i - 1];
  if (!type) return;
  app.draft.playType = type;
  app.armed = false;
  persist();
  renderDraft(); // focus stays on the shell: O, R and Enter keep working
}

function save(): void {
  const d = app.draft;
  if (!d) return flash(t("msg.noOpenPlay"));
  const resultText = ($("result") as HTMLInputElement | null)?.value.trim() ?? "";
  if (resultText && !parseResult(resultText)) return flash(t("msg.badResult", { value: resultText }));
  const yardText = ($("yard") as HTMLInputElement | null)?.value.trim() ?? "";
  if (yardText) {
    const ytg = parseYardLine(yardText);
    if (ytg === null) return flash(t("msg.badYard", { value: yardText }));
    d.situation.yardsToGoal = ytg;
  }
  const ddText = ($("dd") as HTMLInputElement | null)?.value.trim() ?? "";
  if (ddText) {
    const m = /^([1-4])\s*[&y ]?\s*(\d{1,2}|g)$/i.exec(ddText);
    if (!m?.[1] || !m[2]) return flash(t("msg.badDownDistance", { value: ddText }));
    d.situation.down = Number(m[1]);
    const goal = m[2].toLowerCase() === "g";
    d.situation.goalToGo = goal;
    d.situation.distance = goal ? d.situation.yardsToGoal : Number(m[2]);
  }
  const now = app.adapter?.now() ?? d.snapMs;
  commit(d, d.endMs ?? now, d.endMs === null, resultText);
  app.draft = null;
  app.armed = false;
  persist();
  render();
  $("app").focus();
}

function commit(d: Draft, endMs: number, endAuto: boolean, resultText: string): void {
  const play: Play = {
    id: crypto.randomUUID(),
    n: (app.plays[app.plays.length - 1]?.n ?? 0) + 1,
    snapMs: d.snapMs,
    endMs,
    endAuto,
    side: app.side,
    situation: d.situation,
    carried: d.carried,
    playType: d.playType,
    result: resultText,
  };
  app.plays.push(play);
  app.selected = app.plays.length - 1;
  app.log.playsSaved = app.plays.length;
  app.log.lastSaveAt = Date.now();
  const parsed = resultText ? parseResult(resultText) : null;
  if (parsed) {
    const { next, carried } = carryForward(play.situation, parsed);
    app.next = { situation: next, carried };
  } else {
    app.next = { situation: { ...BLANK, quarter: play.situation.quarter }, carried: ["quarter"] };
  }
}

async function replayClip(a: PlayerAdapter): Promise<void> {
  const p = app.plays[app.selected] ?? app.plays[app.plays.length - 1];
  if (!p) return flash(t("msg.noPlays"));
  const r = await a.playRange(Math.max(0, p.snapMs - PRE_ROLL_MS), p.endMs + POST_ROLL_MS);
  app.log.clipChecks.push(r);
  app.log.seeks.push(r.seek);
  persist();
  flash(
    t("msg.clipChecked", {
      start: Math.round(Math.abs(r.seek.landedMs - r.startMs)),
      end: Math.round(r.endOvershootMs),
    }),
  );
  renderMetrics();
}

// ---------- loading sources ----------

function resetSession(): void {
  app.log = newLog();
  app.plays = [];
  app.draft = null;
  app.selected = -1;
  app.next = { situation: BLANK, carried: ["quarter"] };
  app.markers = { kickoffMs: null, halftimeMs: null };
}

async function useAdapter(a: PlayerAdapter, sourceKey: string, label: string): Promise<void> {
  if (!app.user) return askName();
  app.adapter?.destroy();
  app.adapter = a;
  app.sourceKey = sourceKey;
  resetSession();
  const restored = restore(sourceKey);
  app.rateIdx = a.capabilities.rates.indexOf(1);
  $("banner").textContent = "";
  app.saveFailed = false;
  a.onState(() => renderStatus());
  a.onError((code) => banner(t(`error.${code}` as MessageKey)));
  await a.load($("well"));
  app.log.source = { provider: a.provider, id: label, durationMs: a.duration() };
  persist();
  render();
  if (restored) flash(t("msg.restored", { n: restored }));
  $("app").focus();
}

$("source").addEventListener("submit", (e) => {
  e.preventDefault();
  const raw = ($("url") as HTMLInputElement).value;
  const id = parseYouTubeId(raw);
  if (!id) return banner(t("error.badLink"));
  void useAdapter(new YouTubeAdapter(id), `youtube:${id}`, id).catch(() => banner(t("error.apiLoad")));
});

$("file").addEventListener("change", (e) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;
  const adapter = new LocalAdapter(file);
  // Keyed by fingerprint, so reopening the same file restores its tags.
  void adapter.fingerprint.then((fp) => useAdapter(adapter, `local:${fp}`, `${file.name} (${fp})`));
});

// ---------- keyboard ----------

window.addEventListener("keydown", (e) => {
  if (document.querySelector("dialog[open]")) return; // login or hotkey sheet owns the keyboard
  const target = e.target as HTMLElement;
  const typing = target.tagName === "INPUT" || target.tagName === "TEXTAREA";
  if (typing) {
    if (e.key === "Escape") (target as HTMLInputElement).blur();
    if (e.key === "Enter" && target.closest("#draft")) {
      e.preventDefault();
      save();
    }
    return;
  }
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.key === "Escape") {
    app.armed = false;
    return renderDraft();
  }
  if (app.draft && app.armed && /^[1-5]$/.test(e.key)) {
    e.preventDefault();
    return pickType(Number(e.key));
  }
  const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  const binding = KEYS.find((k) => k.key === (k.key.length === 1 ? key : e.key) && !!k.shift === e.shiftKey);
  if (!binding) return;
  e.preventDefault();
  run(binding.action);
});

// Clicking in the YouTube iframe steals focus; give it back on the next tick.
window.addEventListener("blur", () => {
  setTimeout(() => {
    if (document.activeElement?.tagName === "IFRAME") {
      (document.activeElement as HTMLElement).blur();
      window.focus();
      $("app").focus();
    }
  }, 0);
});

// ---------- rendering ----------

function flash(msg: string): void {
  const el = $("status").querySelector(".msg");
  if (el) el.textContent = msg;
}

function banner(msg: string): void {
  $("banner").textContent = msg;
}

function applyI18n(): void {
  document.querySelectorAll<HTMLElement>("[data-i18n]").forEach((el) => {
    el.textContent = t(el.dataset.i18n as MessageKey);
  });
  document.querySelectorAll<HTMLInputElement>("[data-i18n-placeholder]").forEach((el) => {
    el.placeholder = t(el.dataset.i18nPlaceholder as MessageKey);
  });
  document.querySelectorAll<HTMLElement>("[data-i18n-aria]").forEach((el) => {
    el.setAttribute("aria-label", t(el.dataset.i18nAria as MessageKey));
  });
  $("lang-en").setAttribute("aria-pressed", String(getLocale() === "en"));
  $("lang-es").setAttribute("aria-pressed", String(getLocale() === "es"));
  document.title = t("app.title");
  $("user-name").textContent = app.user ? t("user.label", { name: app.user }) : "";
}

function renderStatus(): void {
  const a = app.adapter;
  const s = $("status");
  const keepMsg = s.querySelector(".msg")?.textContent ?? "";
  if (!a) {
    s.innerHTML = `<span class="msg">${esc(keepMsg)}</span>`;
    return;
  }
  const st = a.state();
  s.innerHTML = `
    <span>${esc(t(`provider.${a.provider}` as MessageKey))}</span>
    <span class="state-${st}">${esc(t(`state.${st}` as MessageKey))}</span>
    <span>${formatTimecode(a.now())}</span>
    <span>${a.rate()}×${app.skipping ? ` · ${esc(t("status.skipping"))}` : ""}</span>
    <span>${esc(t("status.step", { ms: Math.round(a.capabilities.stepMs) }))}</span>
    <span class="msg">${esc(keepMsg)}</span>`;
}

function renderControls(): void {
  $("controls").innerHTML = BUTTONS.map(
    (act) => `<button class="btn sm" data-action="${act}"><kbd>${esc(labelFor(act))}</kbd> ${esc(t(`action.${act}` as MessageKey))}</button>`,
  ).join("");
}

const TYPE_COLOR: Record<PlayType, string> = {
  run: "var(--play-run)", pass: "var(--play-pass)", rpo: "var(--play-rpo)", screen: "var(--play-screen)", special: "var(--play-special)",
};

function renderRail(): void {
  const l = getLocale();
  const linkable = app.adapter?.capabilities.linkable ?? false;
  $("plays").innerHTML =
    app.plays
      .map((p, i) => {
        const s = p.situation;
        const type = p.playType
          ? `<span class="dot" style="background:${TYPE_COLOR[p.playType]}"></span>${esc(t(`type.${p.playType}` as MessageKey))}`
          : esc(t("rail.untagged"));
        return `<li class="${i === app.selected ? "sel" : ""}" data-i="${i}">
          <span class="n">${String(p.n).padStart(3, "0")}</span>
          <span class="dd">${esc(formatDownDistance(s.down, s.distance, s.goalToGo, l))}</span>
          <span class="meta">${type}, ${esc(formatFieldPosition(s.yardsToGoal, l))}${p.endAuto ? `, ${esc(t("rail.autoEnd"))}` : ""}</span>
          ${linkable ? `<button class="btn sm" data-copy="${i}">${esc(t("rail.copyLink"))}</button>` : "<span></span>"}
        </li>`;
      })
      .join("") || `<li class="hint">${esc(t("rail.empty"))}</li>`;
}

function renderDraft(): void {
  const d = app.draft;
  const l = getLocale();
  const el = $("draft");
  if (!d) {
    const n = app.next.situation;
    el.innerHTML = `<p class="hint">${esc(t("panel.empty"))}</p>
      <p class="hint">${esc(t("panel.nextCarried"))} <b>${esc(formatDownDistance(n.down, n.distance, n.goalToGo, l))}, ${esc(formatFieldPosition(n.yardsToGoal, l))}</b></p>
      <p class="hint">${esc(t("panel.side"))}: <b>${esc(t(`side.${app.side}` as MessageKey))}</b> <kbd>T</kbd></p>`;
    return;
  }
  // Keep what the coach already typed across re-renders.
  const typed = Object.fromEntries(
    ["dd", "yard", "result"].map((id) => [id, (document.getElementById(id) as HTMLInputElement | null)?.value ?? ""]),
  );
  const s = d.situation;
  const carriedDD = d.carried.includes("down");
  el.innerHTML = `
    <div class="bigdd ${carriedDD ? "carried" : ""}">${esc(formatDownDistance(s.down, s.distance, s.goalToGo, l))}</div>
    <p class="hint">${carriedDD ? esc(t("panel.carriedHint")) : ""}</p>
    <p class="hint">${esc(t("panel.side"))}: <b>${esc(t(`side.${app.side}` as MessageKey))}</b> <kbd>T</kbd> · ${esc(t("panel.snap"))} ${formatTimecode(d.snapMs)} · ${esc(t("panel.whistle"))} ${d.endMs === null ? "—" : formatTimecode(d.endMs)}</p>
    <label class="field"><span class="lbl">${esc(t("panel.downDistance"))} <span class="hint">3 5, 1 g</span></span>
      <input id="dd" type="text" class="${carriedDD ? "carried" : ""}" placeholder="${esc(formatDownDistance(s.down, s.distance, s.goalToGo, l))}" autocomplete="off"></label>
    <label class="field"><span class="lbl">${esc(t("panel.yardLine"))} <kbd>Y</kbd></span>
      <input id="yard" type="text" class="${d.carried.includes("yardsToGoal") ? "carried" : ""}" placeholder="${esc(formatFieldPosition(s.yardsToGoal, l))} (-35 / +35)" autocomplete="off"></label>
    <div class="field"><span class="lbl">${esc(t("panel.playType"))} <span class="hint">${app.armed ? esc(t("panel.armed")) : ""}</span></span>
      <div class="opts ${app.armed ? "armed" : ""}">${PLAY_TYPES.map(
        (pt, i) => `<button class="btn sm ${d.playType === pt ? "on" : ""}" data-type="${i + 1}"><kbd>${i + 1}</kbd> <span class="dot" style="background:${TYPE_COLOR[pt]}"></span>${esc(t(`type.${pt}` as MessageKey))}</button>`,
      ).join("")}</div></div>
    <label class="field"><span class="lbl">${esc(t("panel.result"))} <kbd>R</kbd></span>
      <input id="result" type="text" placeholder="+7, -2, inc, td, int, pen +5, punt" autocomplete="off"></label>
    <div class="row"><button class="btn primary" data-action="save"><kbd>↵</kbd> ${esc(t("action.save"))}</button></div>`;
  for (const [id, value] of Object.entries(typed)) {
    const input = document.getElementById(id) as HTMLInputElement | null;
    if (input && value) input.value = value;
  }
}

function renderMetrics(): void {
  const s = summarize(app.log);
  const num = (v: number | null, digits = 0) => (v === null ? "—" : v.toFixed(digits));
  const badge = (ok: boolean | null) =>
    ok === null ? "" : ` <span class="${ok ? "pass" : "fail"}">${esc(t(ok ? "metrics.pass" : "metrics.fail"))}</span>`;
  const items: Array<[MessageKey, string]> = [
    ["metrics.plays", String(app.plays.length)],
    ["metrics.elapsed", num(s.elapsedMin, 1)],
    ["metrics.pace", num(s.minutesPer70Plays, 0) + badge(s.pass.pace)],
    ["metrics.seekMedian", num(s.seekMedianMs) + badge(s.pass.seek)],
    ["metrics.seekP90", num(s.seekP90Ms)],
    ["metrics.clipStart", num(s.clipStartErrorP90Ms) + badge(s.pass.clipStart)],
    ["metrics.clipEnd", num(s.clipEndOvershootP90Ms) + badge(s.pass.clipEnd)],
    ["metrics.ignored", String(s.ignoredMarks)],
  ];
  $("summary").innerHTML = items.map(([k, v]) => `<div><dt>${esc(t(k))}</dt><dd>${v}</dd></div>`).join("");
}

function renderSheet(): void {
  $("sheet-table").innerHTML = KEYS.filter((k, i, all) => all.findIndex((x) => x.action === k.action) === i)
    .map((k) => `<tr><td><kbd>${esc(k.label)}</kbd></td><td>${esc(t(`action.${k.action}` as MessageKey))}</td></tr>`)
    .join("") + `<tr><td><kbd>1</kbd>–<kbd>5</kbd></td><td>${esc(t("keys.digits"))}</td></tr>`;
}

function openSheet(): void {
  renderSheet();
  ($("sheet") as HTMLDialogElement).showModal();
}

function render(): void {
  applyI18n();
  renderStatus();
  renderControls();
  renderRail();
  renderDraft();
  renderMetrics();
}

// ---------- clicks ----------

document.addEventListener("click", (e) => {
  const el = (e.target as HTMLElement).closest<HTMLElement>("[data-action],[data-type],[data-copy],#plays li[data-i]");
  if (!el) return;
  if (el.dataset.action) run(el.dataset.action as Action);
  else if (el.dataset.type) pickType(Number(el.dataset.type));
  else if (el.dataset.copy) void copyLinks(Number(el.dataset.copy));
  else if (el.dataset.i) {
    app.selected = Number(el.dataset.i);
    renderRail();
  }
  if (!el.dataset.copy) $("app").focus();
});

async function copyLinks(i: number): Promise<void> {
  const p = app.plays[i];
  const links = p && app.adapter?.linksFor(Math.max(0, p.snapMs - PRE_ROLL_MS), p.endMs + POST_ROLL_MS);
  if (!p || !links) return;
  const label = `${formatDownDistance(p.situation.down, p.situation.distance, p.situation.goalToGo, getLocale())}${p.playType ? `, ${t(`type.${p.playType}` as MessageKey)}` : ""}`;
  await navigator.clipboard.writeText(`${label}\n${links.short}\n${links.embed}`);
  flash(t("msg.copied"));
}

$("export").addEventListener("click", () => {
  const payload = {
    exportedAt: new Date().toISOString(),
    user: app.user,
    userAgent: navigator.userAgent,
    locale: getLocale(),
    summary: summarize(app.log),
    markers: app.markers,
    log: app.log,
    plays: app.plays,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `spike-results-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-")}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
});

$("help").addEventListener("click", openSheet);

// ---------- coach name (no password, M0 only) ----------

function askName(): void {
  const dlg = $("login") as HTMLDialogElement;
  ($("login-name") as HTMLInputElement).value = "";
  if (!dlg.open) dlg.showModal();
}

$("login").addEventListener("cancel", (e) => e.preventDefault()); // a name is required
$("login-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const name = ($("login-name") as HTMLInputElement).value.trim();
  if (!name) return;
  ($("login") as HTMLDialogElement).close();
  app.user = name;
  // If storage is blocked, keep the name for this tab; persist() will warn on the first save.
  store.setUser(name);
  render();
  $("app").focus();
});

$("switch-user").addEventListener("click", () => {
  // Everything is already saved; reloading gives the next coach a clean screen.
  store.signOut();
  window.location.reload();
});

$("clear").addEventListener("click", () => {
  if (!app.user || !app.sourceKey || !app.plays.length) return;
  if (!window.confirm(t("confirm.clear", { n: app.plays.length }))) return;
  store.clear(app.user, app.sourceKey);
  const source = app.log.source;
  resetSession();
  app.log.source = source;
  persist();
  render();
  flash(t("msg.cleared"));
  $("app").focus();
});

window.addEventListener("beforeunload", (e) => {
  if (!app.saveFailed || !app.plays.length) return;
  e.preventDefault();
  e.returnValue = t("confirm.leave");
});
$("lang-en").addEventListener("click", () => setLocale("en"));
$("lang-es").addEventListener("click", () => setLocale("es"));
onLocaleChange(render);

setInterval(() => {
  renderStatus();
  if (app.log.firstSnapAt !== null) renderMetrics();
}, 500);

document.documentElement.lang = getLocale();
render();
if (!app.user) askName();
