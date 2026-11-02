import { describe, expect, it } from "vitest";
import { formatDownDistance, formatFieldPosition, formatTimecode, parseYardLine } from "./format";

describe("formatDownDistance", () => {
  it.each([
    [3, 5, false, "en", "3rd & 5"],
    [1, 8, true, "en", "1st & Goal"],
    [3, 5, false, "es", "3.ª y 5"],
    [1, 8, true, "es", "1.ª y gol"],
    [null, null, false, "en", "– & –"],
    [null, null, false, "es", "– y –"],
  ] as const)("%s & %s goal=%s (%s) → %s", (down, dist, goal, locale, out) => {
    expect(formatDownDistance(down, dist, goal, locale)).toBe(out);
  });
});

describe("formatFieldPosition", () => {
  it.each([
    [65, "en", "Own 35"],
    [65, "es", "Propia 35"],
    [22, "en", "Opp 22"],
    [22, "es", "Rival 22"],
    [50, "en", "50"],
    [50, "es", "Medio campo"],
  ] as const)("%s (%s) → %s", (ytg, locale, out) => {
    expect(formatFieldPosition(ytg, locale)).toBe(out);
  });
});

describe("parseYardLine", () => {
  it("own side is negative", () => expect(parseYardLine("-35")).toBe(65));
  it("opponent side is plain or +", () => {
    expect(parseYardLine("35")).toBe(35);
    expect(parseYardLine("+22")).toBe(22);
  });
  it("midfield", () => expect(parseYardLine("50")).toBe(50));
  it("rejects out of range", () => {
    expect(parseYardLine("0")).toBeNull();
    expect(parseYardLine("60")).toBeNull();
    expect(parseYardLine("x")).toBeNull();
  });
});

describe("formatTimecode", () => {
  it("formats minutes and hours", () => {
    expect(formatTimecode(2_467_200)).toBe("41:07.2");
    expect(formatTimecode(3_723_400)).toBe("1:02:03.4");
  });
});
