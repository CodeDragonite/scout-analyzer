/**
 * M0 gate check: what share of opponent replays can be embedded?
 * Each link is loaded muted with autoplay in the official player; a
 * 101/150 error means the owner disabled embedding.
 */
import "./styles.css";
import { getLocale, type MessageKey, onLocaleChange, setLocale, t } from "./i18n/i18n";
import { loadYouTubeApi } from "./player/YouTubeAdapter";
import { parseYouTubeId } from "./player/youtubeUrl";

type Status = "ok" | "embedBlocked" | "notFound" | "invalid" | "timeout" | "error";
interface Row {
  url: string;
  id: string | null;
  status: Status;
}

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
let rows: Row[] = [];
let lastChecked = 0;

function probe(id: string): Promise<Status> {
  return new Promise((resolve) => {
    const host = document.createElement("div");
    $("probe").replaceChildren(host);
    let done = false;
    let player: YT.Player | null = null;
    const finish = (s: Status) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      try {
        player?.destroy();
      } catch {
        /* already gone */
      }
      resolve(s);
    };
    const timer = setTimeout(() => finish("timeout"), 12_000);
    player = new YT.Player(host, {
      videoId: id,
      width: "320",
      height: "180",
      playerVars: { autoplay: 1, mute: 1, playsinline: 1, disablekb: 1, origin: window.location.origin },
      events: {
        onReady: (e) => {
          e.target.mute();
          e.target.playVideo();
        },
        onStateChange: (e) => {
          if (e.data === YT.PlayerState.PLAYING || e.data === YT.PlayerState.BUFFERING) finish("ok");
        },
        onError: (e) => {
          finish(e.data === 101 || e.data === 150 ? "embedBlocked" : e.data === 100 ? "notFound" : e.data === 2 ? "invalid" : "error");
        },
      },
    });
  });
}

async function runAll(): Promise<void> {
  const lines = ($("links") as HTMLTextAreaElement).value
    .split(/\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  rows = lines.map((url) => ({ url, id: parseYouTubeId(url), status: "invalid" as Status }));
  render(0);
  await loadYouTubeApi();
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row) continue;
    if (row.id) row.status = await probe(row.id);
    render(i + 1);
  }
  $("probe").replaceChildren();
}

function render(checked: number): void {
  lastChecked = checked;
  const total = rows.length;
  const ok = rows.slice(0, checked).filter((r) => r.status === "ok").length;
  const share = checked ? Math.round((ok / checked) * 100) : 0;
  $("summary").textContent = total
    ? t("embed.summary", { ok, checked, total, share }) + (checked === total ? ` ${t(share >= 70 ? "embed.gatePass" : "embed.gateFail")}` : "")
    : "";
  $("results").innerHTML =
    `<tr><th align="left">${esc(t("embed.col.link"))}</th><th align="left">${esc(t("embed.col.result"))}</th></tr>` +
    rows
      .map((r, i) => {
        const st = i < checked ? t(`embed.status.${r.status}` as MessageKey) : "…";
        const cls = i >= checked ? "" : r.status === "ok" ? "pass" : "fail";
        return `<tr><td style="padding:6px 8px;border-bottom:1px solid var(--border);word-break:break-all">${esc(r.url)}</td><td class="${cls}" style="padding:6px 8px;border-bottom:1px solid var(--border)">${esc(st)}</td></tr>`;
      })
      .join("");
}

function applyI18n(): void {
  document.querySelectorAll<HTMLElement>("[data-i18n]").forEach((el) => (el.textContent = t(el.dataset.i18n as MessageKey)));
  document.querySelectorAll<HTMLElement>("[data-i18n-aria]").forEach((el) => el.setAttribute("aria-label", t(el.dataset.i18nAria as MessageKey)));
  $("lang-en").setAttribute("aria-pressed", String(getLocale() === "en"));
  $("lang-es").setAttribute("aria-pressed", String(getLocale() === "es"));
  document.title = t("embed.title");
  render(lastChecked);
}

$("run").addEventListener("click", () => void runAll());
$("copy").addEventListener("click", () => {
  const csv = ["url,video_id,result", ...rows.map((r) => `"${r.url}",${r.id ?? ""},${r.status}`)].join("\n");
  void navigator.clipboard.writeText(csv);
});
$("lang-en").addEventListener("click", () => setLocale("en"));
$("lang-es").addEventListener("click", () => setLocale("es"));
onLocaleChange(applyI18n);
document.documentElement.lang = getLocale();
applyI18n();
