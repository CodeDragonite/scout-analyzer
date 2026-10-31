import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import en from "./en.json";
import es from "./es.json";
import { t } from "./i18n";

const SRC = fileURLToPath(new URL("..", import.meta.url));
const ROOT = join(SRC, "..");

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    const p = join(dir, d.name);
    if (d.isDirectory()) return sourceFiles(p);
    return /\.ts$/.test(d.name) && !/\.test\.ts$/.test(d.name) ? [p] : [];
  });
}

describe("catalogs", () => {
  it("en and es have exactly the same keys", () => {
    expect(Object.keys(es).sort()).toEqual(Object.keys(en).sort());
  });

  it("no empty translations", () => {
    for (const [k, v] of Object.entries({ ...en, ...es })) expect(v.trim(), k).not.toBe("");
  });

  it("placeholders match between languages", () => {
    const ph = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join(",");
    for (const k of Object.keys(en) as Array<keyof typeof en>) expect(ph(es[k]), k).toBe(ph(en[k]));
  });

  it("every literal key used in code and HTML exists", () => {
    const files = [...sourceFiles(SRC), join(ROOT, "index.html"), join(ROOT, "embed-check.html")];
    const used = new Set<string>();
    for (const f of files) {
      const txt = readFileSync(f, "utf8");
      for (const m of txt.matchAll(/\bt\("([\w.]+)"/g)) used.add(m[1]!);
      for (const m of txt.matchAll(/data-i18n(?:-placeholder|-aria)?="([\w.]+)"/g)) used.add(m[1]!);
    }
    const missing = [...used].filter((k) => !(k in en));
    expect(missing).toEqual([]);
  });

  it("dynamic key families are complete", () => {
    const families: Record<string, string[]> = {
      state: ["loading", "unstarted", "playing", "paused", "buffering", "stalled", "ended", "error"],
      error: ["invalid", "html5", "notFound", "embedBlocked", "unknown"],
      type: ["run", "pass", "rpo", "screen", "special"],
      side: ["offense", "defense", "special"],
      provider: ["youtube", "local"],
      "embed.status": ["ok", "embedBlocked", "notFound", "invalid", "timeout", "error"],
    };
    for (const [prefix, names] of Object.entries(families))
      for (const n of names) expect(`${prefix}.${n}` in en, `${prefix}.${n}`).toBe(true);
  });
});

describe("t()", () => {
  it("fills placeholders per locale", () => {
    expect(t("msg.undone", { n: 4 }, "en")).toBe("Play 4 removed.");
    expect(t("msg.undone", { n: 4 }, "es")).toBe("Jugada 4 eliminada.");
  });
});
