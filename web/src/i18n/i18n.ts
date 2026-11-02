import en from "./en.json";
import es from "./es.json";

export type Locale = "en" | "es";
export type MessageKey = keyof typeof en;

const catalogs: Record<Locale, Record<MessageKey, string>> = { en, es };
const STORAGE_KEY = "sa.locale";

let current: Locale = detectLocale();
const listeners = new Set<(l: Locale) => void>();

function detectLocale(): Locale {
  try {
    const saved = globalThis.localStorage?.getItem(STORAGE_KEY);
    if (saved === "en" || saved === "es") return saved;
  } catch {
    /* storage unavailable */
  }
  const nav = globalThis.navigator?.language ?? "en";
  return nav.toLowerCase().startsWith("es") ? "es" : "en";
}

export function getLocale(): Locale {
  return current;
}

export function setLocale(l: Locale): void {
  current = l;
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, l);
  } catch {
    /* storage unavailable */
  }
  if (typeof document !== "undefined") document.documentElement.lang = l;
  listeners.forEach((fn) => fn(l));
}

export function onLocaleChange(fn: (l: Locale) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Translate a key; `{name}` placeholders are filled from `vars`. */
export function t(key: MessageKey, vars?: Record<string, string | number>, locale: Locale = current): string {
  const template = catalogs[locale][key] ?? catalogs.en[key] ?? key;
  return vars ? template.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? `{${k}}`)) : template;
}

export const _catalogsForTest = catalogs;
