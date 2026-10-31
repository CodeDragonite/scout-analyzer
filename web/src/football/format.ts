import type { Locale } from "../i18n/i18n";

const ORD_EN = ["1st", "2nd", "3rd", "4th"] as const;

/** "3rd & 5", "1st & Goal" / "3.ª y 5", "1.ª y gol". Unknown → "– & –" / "– y –". */
export function formatDownDistance(
  down: number | null,
  distance: number | null,
  goalToGo: boolean,
  locale: Locale,
): string {
  const amp = locale === "es" ? "y" : "&";
  if (down === null || down < 1 || down > 4) return `– ${amp} –`;
  const d = locale === "es" ? `${down}.ª` : ORD_EN[down - 1];
  const dist = goalToGo ? (locale === "es" ? "gol" : "Goal") : distance === null ? "–" : String(distance);
  return `${d} ${amp} ${dist}`;
}

/** yardsToGoal 65 → "Own 35" / "Propia 35"; 22 → "Opp 22" / "Rival 22"; 50 → "50" / "Medio campo". */
export function formatFieldPosition(yardsToGoal: number | null, locale: Locale): string {
  if (yardsToGoal === null) return "–";
  if (yardsToGoal === 50) return locale === "es" ? "Medio campo" : "50";
  if (yardsToGoal > 50) return `${locale === "es" ? "Propia" : "Own"} ${100 - yardsToGoal}`;
  return `${locale === "es" ? "Rival" : "Opp"} ${yardsToGoal}`;
}

/** "-35" → own 35 (65 to goal); "+35" or "35" → opponent 35; "50" → midfield. */
export function parseYardLine(input: string): number | null {
  const m = /^([+-]?)(\d{1,2})$/.exec(input.trim());
  if (!m?.[2]) return null;
  const n = Number(m[2]);
  if (n < 1 || n > 50) return null;
  if (n === 50) return 50;
  return m[1] === "-" ? 100 - n : n;
}

/** ms → "41:07.2" or "1:02:03.4". */
export function formatTimecode(ms: number): string {
  const sign = ms < 0 ? "−" : "";
  const t = Math.abs(ms);
  const h = Math.floor(t / 3_600_000);
  const m = Math.floor((t % 3_600_000) / 60_000);
  const s = Math.floor((t % 60_000) / 1000);
  const tenth = Math.floor((t % 1000) / 100);
  const mm = h > 0 ? String(m).padStart(2, "0") : String(m);
  return `${sign}${h > 0 ? `${h}:` : ""}${mm}:${String(s).padStart(2, "0")}.${tenth}`;
}
