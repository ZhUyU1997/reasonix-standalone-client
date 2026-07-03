/**
 * i18n.tsx — Internationalization for the Reasonix standalone client.
 *
 * Dual-delivery pattern matching desktop/frontend/src/lib/i18n.tsx:
 *   - useT() hook for React components (reactive, re-renders on locale switch)
 *   - t() module-level function for utility code (non-reactive, reads currentLocale)
 *
 * Legacy __() alias is kept for backward compat during migration.
 */

import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { en } from "../locales/en";
import zh from "../locales/zh";
import type { DictKey } from "../locales/en";

// ── Locales ──

type Locale = "en" | "zh";

function detectLocale(): Locale {
  const navLang = navigator.language || "";
  if (navLang.startsWith("zh")) return "zh";
  return "en";
}

const DICTS: Record<string, Record<string, string>> = { en, zh };

// ── Module-level mirror (updated by LocaleProvider) ──
let currentLocale: Locale = detectLocale();

// ── Translation core ──
function translate(locale: Locale, key: string, vars?: Record<string, string | number>): string {
  let s = DICTS[locale]?.[key] ?? DICTS.en[key] ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      s = s.replace(`{${k}}`, String(v));
    }
  }
  // Legacy #{turn} placeholder support
  s = s.replace(/#\{turn\}/g, String(vars?.turn ?? ""));
  return s;
}

// ── Non-React API (reads module-level mirror) ──
export function t(key: string, vars?: Record<string, string | number>): string {
  return translate(currentLocale, key, vars);
}

/** Legacy alias for backward compat. */
export const __ = t;

// ── React API ──

interface LocaleCtx {
  locale: Locale;
  t: (key: string, vars?: Record<string, string | number>) => string;
}

const LocaleContext = createContext<LocaleCtx>({
  locale: currentLocale,
  t: (key, vars) => translate(currentLocale, key, vars),
});

/** Hook: returns a reactive translate function. Use in React components. */
export function useT(): (key: string, vars?: Record<string, string | number>) => string {
  return useContext(LocaleContext).t;
}

/** Provider: wraps the app, updates currentLocale on changes. */
export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>(detectLocale);

  useEffect(() => {
    currentLocale = locale;
    document.documentElement.lang = locale;
  }, [locale]);

  const ctx: LocaleCtx = {
    locale,
    t: (key, vars) => translate(locale, key, vars),
  };

  return <LocaleContext.Provider value={ctx}>{children}</LocaleContext.Provider>;
}
