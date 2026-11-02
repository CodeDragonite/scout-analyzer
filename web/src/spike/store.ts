/**
 * M0 spike persistence: everything lives in this browser's localStorage.
 * No backend, no password. A coach types a name so two coaches on one laptop
 * keep separate tags, and so exported results say who tagged.
 *
 * One session per (coach, video). Every change is saved immediately; a failed
 * write returns false so the UI can warn instead of silently losing tags.
 */
import type { CarriedField, Situation } from "../football/carryForward";
import type { SpikeLog } from "./metrics";

/** The subset of Web Storage we use (injectable for tests). */
export interface KeyValue {
  readonly length: number;
  key(i: number): string | null;
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
  removeItem(k: string): void;
}

export interface Snapshot<P, D = unknown> {
  plays: P[];
  draft: D | null;
  next: { situation: Situation; carried: CarriedField[] };
  side: string;
  markers: { kickoffMs: number | null; halftimeMs: number | null };
  log: SpikeLog;
}

export interface SessionInfo {
  sourceKey: string;
  plays: number;
  savedAt: number;
}

const VERSION = 1;
const USER_KEY = "sa.user";
const PREFIX = "sa.session.";

interface Stored<P, D> extends Snapshot<P, D> {
  v: number;
  user: string;
  sourceKey: string;
  savedAt: number;
}

const userPart = (user: string) => encodeURIComponent(user.trim().toLowerCase());
const keyFor = (user: string, sourceKey: string) => `${PREFIX}${userPart(user)}|${sourceKey}`;

export function createStore(storage: KeyValue | null, now: () => number = Date.now) {
  const read = <P, D>(key: string): Stored<P, D> | null => {
    try {
      const raw = storage?.getItem(key);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as Stored<P, D>;
      return parsed?.v === VERSION && Array.isArray(parsed.plays) ? parsed : null;
    } catch {
      return null;
    }
  };

  const write = (key: string, value: string): boolean => {
    if (!storage) return false;
    try {
      storage.setItem(key, value);
      return true;
    } catch {
      return false;
    }
  };

  return {
    user(): string | null {
      try {
        return storage?.getItem(USER_KEY) || null;
      } catch {
        return null;
      }
    },

    setUser(name: string): boolean {
      const n = name.trim();
      return n ? write(USER_KEY, n) : false;
    },

    /** Forget who is signed in on this laptop; their tags stay. */
    signOut(): void {
      try {
        storage?.removeItem(USER_KEY);
      } catch {
        /* storage unavailable */
      }
    },

    save<P, D>(user: string, sourceKey: string, snap: Snapshot<P, D>): boolean {
      const stored: Stored<P, D> = { ...snap, v: VERSION, user: user.trim(), sourceKey, savedAt: now() };
      return write(keyFor(user, sourceKey), JSON.stringify(stored));
    },

    load<P, D = unknown>(user: string, sourceKey: string): Snapshot<P, D> | null {
      const s = read<P, D>(keyFor(user, sourceKey));
      if (!s) return null;
      const { plays, draft, next, side, markers, log } = s;
      return { plays, draft, next, side, markers, log };
    },

    list(user: string): SessionInfo[] {
      if (!storage) return [];
      const prefix = `${PREFIX}${userPart(user)}|`;
      const out: SessionInfo[] = [];
      try {
        for (let i = 0; i < storage.length; i++) {
          const k = storage.key(i);
          if (!k?.startsWith(prefix)) continue;
          const s = read(k);
          if (s) out.push({ sourceKey: s.sourceKey, plays: s.plays.length, savedAt: s.savedAt });
        }
      } catch {
        return [];
      }
      return out.sort((a, b) => b.savedAt - a.savedAt);
    },

    clear(user: string, sourceKey: string): void {
      try {
        storage?.removeItem(keyFor(user, sourceKey));
      } catch {
        /* storage unavailable */
      }
    },
  };
}

export type Store = ReturnType<typeof createStore>;

/** The browser's localStorage, or null when it's blocked. */
export function browserStorage(): KeyValue | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}
