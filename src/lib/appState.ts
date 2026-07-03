/**
 * appState.ts — Reactive module-level state for the standalone client.
 *
 * The SSE handler and polling callbacks in main.tsx update state via setApp(),
 * which notifies every subscriber (React roots in App.tsx) to re-render.
 *
 * This replaces:
 *   - module-level `let` variables + manual render*() calls
 *   - window.dispatchEvent(new CustomEvent("__conn-state", ...))
 */

// ── State shape ──

export interface AppState {
  running: boolean;
  connState: "connected" | "reconnecting" | "disconnected";
  turnStartAt: number;
  turnTokens: number;
  balanceText: string;
  goalActive: boolean;
  retryStatus: { attempt: number; max: number } | null;
  // cumulative stats (for stats modal)
  cumulativeTokens: number;
  cumulativeCost: number;
  cumulativeCacheHit: number;
  cumulativeCacheMiss: number;
}

let state: AppState = {
  running: false,
  connState: "connected",
  turnStartAt: 0,
  turnTokens: 0,
  balanceText: "",
  goalActive: false,
  retryStatus: null,
  cumulativeTokens: 0,
  cumulativeCost: 0,
  cumulativeCacheHit: 0,
  cumulativeCacheMiss: 0,
};

// ── Publish / subscribe ──

type Listener = () => void;
const listeners: Listener[] = [];

/** Call from main.tsx to update state and trigger re-renders. */
export function setApp(partial: Partial<AppState>): void {
  Object.assign(state, partial);
  // Fire synchronously so React batching can coalesce them
  listeners.forEach(fn => fn());
}

/** Return the current snapshot (for non-React code). */
export function getApp(): AppState {
  return state;
}

/**
 * Subscribe to state changes. Returns an unsubscribe function.
 * Used by App.tsx to keep React state in sync.
 */
export function subscribe(fn: Listener): () => void {
  listeners.push(fn);
  return () => {
    const i = listeners.indexOf(fn);
    if (i >= 0) listeners.splice(i, 1);
  };
}
