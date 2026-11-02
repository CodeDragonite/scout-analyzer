import { beforeEach, describe, expect, it } from "vitest";
import { newLog } from "./metrics";
import { createStore, type KeyValue, type Snapshot } from "./store";

class MemoryStorage implements KeyValue {
  data = new Map<string, string>();
  failWrites = false;
  get length() {
    return this.data.size;
  }
  key(i: number) {
    return [...this.data.keys()][i] ?? null;
  }
  getItem(k: string) {
    return this.data.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    if (this.failWrites) throw new DOMException("full", "QuotaExceededError");
    this.data.set(k, v);
  }
  removeItem(k: string) {
    this.data.delete(k);
  }
}

const snap = (plays: number): Snapshot<{ n: number }> => ({
  plays: Array.from({ length: plays }, (_, i) => ({ n: i + 1 })),
  draft: null,
  next: { situation: { quarter: 1, down: null, distance: null, goalToGo: false, yardsToGoal: null, possession: null }, carried: ["quarter"] },
  side: "defense",
  markers: { kickoffMs: null, halftimeMs: null },
  log: newLog(),
});

describe("store", () => {
  let mem: MemoryStorage;
  beforeEach(() => {
    mem = new MemoryStorage();
  });

  it("remembers the coach name, trimmed; blank names are refused", () => {
    const s = createStore(mem);
    expect(s.user()).toBeNull();
    expect(s.setUser("  Coach Ruiz ")).toBe(true);
    expect(createStore(mem).user()).toBe("Coach Ruiz");
    expect(s.setUser("   ")).toBe(false);
    expect(s.user()).toBe("Coach Ruiz");
    s.signOut();
    expect(s.user()).toBeNull();
  });

  it("saves and restores a session per coach and video", () => {
    const s = createStore(mem);
    expect(s.save("Ana", "youtube:abc", snap(3))).toBe(true);
    expect(s.load<{ n: number }>("Ana", "youtube:abc")?.plays).toHaveLength(3);
    expect(s.load("Ana", "youtube:other")).toBeNull();
    expect(s.load("Ben", "youtube:abc")).toBeNull();
  });

  it("signing out keeps the coach's tags", () => {
    const s = createStore(mem);
    s.setUser("Ana");
    s.save("Ana", "youtube:abc", snap(2));
    s.signOut();
    expect(s.load("Ana", "youtube:abc")?.plays).toHaveLength(2);
  });

  it("names are case-insensitive for keys", () => {
    const s = createStore(mem);
    s.save("Ana", "youtube:abc", snap(1));
    expect(s.load("ana", "youtube:abc")).not.toBeNull();
  });

  it("lists a coach's sessions, newest first", () => {
    let clock = 1000;
    const s = createStore(mem, () => clock);
    s.save("Ana", "youtube:a", snap(1));
    clock = 2000;
    s.save("Ana", "youtube:b", snap(4));
    s.save("Ben", "youtube:c", snap(9));
    expect(s.list("Ana")).toEqual([
      { sourceKey: "youtube:b", plays: 4, savedAt: 2000 },
      { sourceKey: "youtube:a", plays: 1, savedAt: 1000 },
    ]);
  });

  it("clear removes only that session", () => {
    const s = createStore(mem);
    s.save("Ana", "youtube:a", snap(1));
    s.save("Ana", "youtube:b", snap(1));
    s.clear("Ana", "youtube:a");
    expect(s.load("Ana", "youtube:a")).toBeNull();
    expect(s.load("Ana", "youtube:b")).not.toBeNull();
  });

  it("reports a failed write instead of throwing (storage full or blocked)", () => {
    const s = createStore(mem);
    mem.failWrites = true;
    expect(s.save("Ana", "youtube:a", snap(1))).toBe(false);
    expect(s.setUser("Ana")).toBe(false);
  });

  it("ignores corrupt or other-version data", () => {
    const s = createStore(mem);
    s.save("Ana", "youtube:a", snap(1));
    const key = [...mem.data.keys()].find((k) => k.includes("youtube:a"))!;
    mem.data.set(key, "{not json");
    expect(s.load("Ana", "youtube:a")).toBeNull();
    mem.data.set(key, JSON.stringify({ v: 999, plays: [] }));
    expect(s.load("Ana", "youtube:a")).toBeNull();
    expect(s.list("Ana")).toEqual([]);
  });

  it("works with no storage at all (private window)", () => {
    const s = createStore(null);
    expect(s.user()).toBeNull();
    expect(s.setUser("Ana")).toBe(false);
    expect(s.save("Ana", "youtube:a", snap(1))).toBe(false);
    expect(s.load("Ana", "youtube:a")).toBeNull();
  });
});
