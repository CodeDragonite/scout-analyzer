/**
 * Carry-forward: compute the next play's situation from the previous play's
 * result. Unknown values stay null — never guessed (docs/breakdown-spec.md).
 *
 * Field position is `yardsToGoal`: 1–99 from the offense's point of view.
 */

export type Possession = "us" | "them";

export interface Situation {
  quarter: number | null;
  down: number | null;
  distance: number | null;
  /** True when distance is "& goal". */
  goalToGo: boolean;
  yardsToGoal: number | null;
  possession: Possession | null;
}

export type PlayResult =
  | { kind: "gain"; yards: number }
  | { kind: "incomplete" }
  | { kind: "touchdown" }
  | { kind: "turnover" }
  | { kind: "penalty"; yards: number }
  | { kind: "kick" }
  | { kind: "safety" };

/** Fields the next play receives by carry-forward (unconfirmed until saved). */
export type CarriedField = "quarter" | "down" | "distance" | "yardsToGoal" | "possession";

export interface CarryOutcome {
  next: Situation;
  carried: CarriedField[];
}

const flip = (p: Possession | null): Possession | null =>
  p === null ? null : p === "us" ? "them" : "us";

const clampYtg = (n: number) => Math.min(99, Math.max(1, n));

function firstDownAt(ytg: number): Pick<Situation, "down" | "distance" | "goalToGo"> {
  return ytg <= 10
    ? { down: 1, distance: ytg, goalToGo: true }
    : { down: 1, distance: 10, goalToGo: false };
}

function blank(quarter: number | null, possession: Possession | null): Situation {
  return { quarter, down: null, distance: null, goalToGo: false, yardsToGoal: null, possession };
}

function carriedOf(s: Situation): CarriedField[] {
  const out: CarriedField[] = [];
  if (s.quarter !== null) out.push("quarter");
  if (s.down !== null) out.push("down");
  if (s.distance !== null) out.push("distance");
  if (s.yardsToGoal !== null) out.push("yardsToGoal");
  if (s.possession !== null) out.push("possession");
  return out;
}

function advance(prev: Situation, yards: number): Situation {
  const { quarter, down, distance, yardsToGoal, possession } = prev;
  if (down === null || distance === null || yardsToGoal === null) {
    return blank(quarter, possession);
  }
  const ytg = yardsToGoal - yards;
  if (ytg <= 0) return blank(quarter, null); // scored: coach confirms what follows
  if (ytg >= 100) return blank(quarter, flip(possession)); // safety territory: don't guess
  if (yards >= distance) {
    return { quarter, possession, yardsToGoal: ytg, ...firstDownAt(ytg) };
  }
  if (down < 4) {
    const dist = distance - yards;
    return { quarter, possession, yardsToGoal: ytg, down: down + 1, distance: dist, goalToGo: dist >= ytg };
  }
  // Turnover on downs: ball goes the other way from the same spot.
  const mirrored = clampYtg(100 - ytg);
  return { quarter, possession: flip(possession), yardsToGoal: mirrored, ...firstDownAt(mirrored) };
}

function penalty(prev: Situation, yards: number): Situation {
  const { quarter, down, distance, yardsToGoal, possession } = prev;
  if (down === null || distance === null || yardsToGoal === null) {
    return blank(quarter, possession);
  }
  const ytg = clampYtg(yardsToGoal - yards);
  const dist = distance - yards;
  if (dist <= 0) return { quarter, possession, yardsToGoal: ytg, ...firstDownAt(ytg) };
  return { quarter, possession, yardsToGoal: ytg, down, distance: Math.min(dist, 99), goalToGo: dist >= ytg };
}

export function carryForward(prev: Situation, result: PlayResult): CarryOutcome {
  let next: Situation;
  switch (result.kind) {
    case "gain":
      next = advance(prev, result.yards);
      break;
    case "incomplete":
      next = advance(prev, 0);
      break;
    case "penalty":
      next = penalty(prev, result.yards);
      break;
    case "touchdown":
      next = blank(prev.quarter, null);
      break;
    case "turnover":
      next = { ...blank(prev.quarter, flip(prev.possession)), down: 1, distance: 10 };
      break;
    case "kick":
    case "safety":
      next = blank(prev.quarter, flip(prev.possession));
      break;
  }
  return { next, carried: carriedOf(next) };
}

/** Parse the result field as typed by the coach: "+7", "-2", "inc", "td", "int", "fum", "pen +5", "punt". */
export function parseResult(input: string): PlayResult | null {
  const s = input.trim().toLowerCase();
  const n = /^[+-]?\d{1,2}$/.test(s) ? Number(s) : null;
  if (n !== null) return { kind: "gain", yards: n };
  if (s === "inc" || s === "incomplete") return { kind: "incomplete" };
  if (s === "td") return { kind: "touchdown" };
  if (s === "int" || s === "fum") return { kind: "turnover" };
  if (s === "punt" || s === "kick" || s === "fg") return { kind: "kick" };
  if (s === "sfty" || s === "safety") return { kind: "safety" };
  const pen = /^pen\s*([+-]?\d{1,2})$/.exec(s);
  if (pen?.[1]) return { kind: "penalty", yards: Number(pen[1]) };
  return null;
}
