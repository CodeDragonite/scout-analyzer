import { describe, expect, it } from "vitest";
import { carryForward, parseResult, type Situation } from "./carryForward";

const sit = (p: Partial<Situation>): Situation => ({
  quarter: 2,
  down: 1,
  distance: 10,
  goalToGo: false,
  yardsToGoal: 65,
  possession: "them",
  ...p,
});

// Table-driven: one row per line of the carry-forward table in docs/breakdown-spec.md.
const cases: Array<{ name: string; prev: Situation; result: string; expect: Partial<Situation> }> = [
  { name: "gain ≥ distance → 1st & 10", prev: sit({ down: 2, distance: 6, yardsToGoal: 61 }), result: "+7",
    expect: { down: 1, distance: 10, yardsToGoal: 54, goalToGo: false, possession: "them" } },
  { name: "gain into the 10 → 1st & goal", prev: sit({ down: 3, distance: 4, yardsToGoal: 14 }), result: "+6",
    expect: { down: 1, distance: 8, yardsToGoal: 8, goalToGo: true } },
  { name: "gain < distance → next down", prev: sit({ down: 1, distance: 10, yardsToGoal: 65 }), result: "+4",
    expect: { down: 2, distance: 6, yardsToGoal: 61 } },
  { name: "loss → longer distance", prev: sit({ down: 2, distance: 6, yardsToGoal: 61 }), result: "-3",
    expect: { down: 3, distance: 9, yardsToGoal: 64 } },
  { name: "incomplete → next down, same spot", prev: sit({ down: 2, distance: 6, yardsToGoal: 61 }), result: "inc",
    expect: { down: 3, distance: 6, yardsToGoal: 61 } },
  { name: "4th down short → turnover on downs, mirrored", prev: sit({ down: 4, distance: 3, yardsToGoal: 40 }), result: "+1",
    expect: { down: 1, distance: 10, yardsToGoal: 61, possession: "us" } },
  { name: "touchdown → blank", prev: sit({ yardsToGoal: 5 }), result: "td",
    expect: { down: null, distance: null, yardsToGoal: null, possession: null, quarter: 2 } },
  { name: "gain past the goal line → blank (scored)", prev: sit({ down: 2, distance: 4, yardsToGoal: 4 }), result: "+6",
    expect: { down: null, yardsToGoal: null } },
  { name: "interception → 1st & 10, spot blank, flips", prev: sit({}), result: "int",
    expect: { down: 1, distance: 10, yardsToGoal: null, possession: "us" } },
  { name: "penalty against offense → same down, longer", prev: sit({ down: 2, distance: 6, yardsToGoal: 61 }), result: "pen -5",
    expect: { down: 2, distance: 11, yardsToGoal: 66 } },
  { name: "penalty for offense, short of the line → same down", prev: sit({ down: 3, distance: 8, yardsToGoal: 50 }), result: "pen +5",
    expect: { down: 3, distance: 3, yardsToGoal: 45 } },
  { name: "penalty reaching the line → first down by yardage", prev: sit({ down: 3, distance: 4, yardsToGoal: 50 }), result: "pen +5",
    expect: { down: 1, distance: 10, yardsToGoal: 45 } },
  { name: "punt → blank, flips", prev: sit({ down: 4 }), result: "punt",
    expect: { down: null, yardsToGoal: null, possession: "us" } },
  { name: "unknown previous situation → stays blank", prev: sit({ down: null, distance: null }), result: "+5",
    expect: { down: null, distance: null, yardsToGoal: null } },
];

describe("carryForward", () => {
  for (const c of cases) {
    it(c.name, () => {
      const result = parseResult(c.result);
      expect(result).not.toBeNull();
      const { next } = carryForward(c.prev, result!);
      expect(next).toMatchObject(c.expect);
    });
  }

  it("quarter always carries", () => {
    expect(carryForward(sit({ quarter: 3 }), { kind: "touchdown" }).next.quarter).toBe(3);
  });

  it("reports only non-null fields as carried", () => {
    const { carried } = carryForward(sit({}), { kind: "turnover" });
    expect(carried).toEqual(["quarter", "down", "distance", "possession"]);
  });
});

describe("parseResult", () => {
  it.each([
    ["+7", { kind: "gain", yards: 7 }],
    ["-2", { kind: "gain", yards: -2 }],
    ["0", { kind: "gain", yards: 0 }],
    ["INC", { kind: "incomplete" }],
    ["fum", { kind: "turnover" }],
    ["pen -10", { kind: "penalty", yards: -10 }],
    ["fg", { kind: "kick" }],
  ])("%s", (input, expected) => {
    expect(parseResult(input)).toEqual(expected);
  });

  it("rejects nonsense", () => {
    expect(parseResult("banana")).toBeNull();
    expect(parseResult("+123")).toBeNull();
  });
});
