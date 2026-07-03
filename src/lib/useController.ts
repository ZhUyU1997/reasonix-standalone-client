/**
 * useController.ts — Frontend state machine over the agent's event stream.
 *
 * Mirrors desktop/frontend/src/lib/useController.ts in spirit:
 *   - Owns all per-session state (items, running, connState, usage, …)
 *   - Registers app.onEvent() internally and updates state synchronously
 *   - Exposes action methods (submit, cancel, approve, newSession, …)
 *   - Components receive state + actions as props from App.tsx
 */

import { useEffect, useReducer, useState, useCallback } from "react";
import { app } from "./bridge";
import { reducer } from "./transcriptReducer";
import { initialState } from "./transcriptTypes";
import type { Action, Item } from "./transcriptTypes";
import type { TodoItem, HistoryMessage } from "./types";
import { parseTodos } from "./ui";

// ── Helpers ──
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

// ── State shape returned to App.tsx ──
export interface ControllerState {
  items: Item[];
  live: import("./transcriptTypes").LiveStream | null;
  running: boolean;
  connState: "connected" | "reconnecting" | "disconnected";
  turnStartAt: number;
  turnTokens: number;
  balanceText: string;
  goalActive: boolean;
  retryStatus: { attempt: number; max: number } | null;
  todos: TodoItem[];
  cumulativeTokens: number;
  cumulativeCost: number;
  cumulativeCacheHit: number;
  cumulativeCacheMiss: number;
}

export interface Controller {
  state: ControllerState;
  submit: (text: string) => Promise<void>;
  cancel: () => Promise<void>;
  newSession: () => Promise<void>;
  openRewind: () => void;
  rewindOpen: boolean;
  closeRewind: () => void;
  dismissTodos: () => void;
  dispatch: (action: any) => void;
}

export function useController(): Controller {
  // ── Items (transcript reducer) ──
  const [{ items, live }, dispatch] = useReducer(reducer, initialState);

  // ── App state ──
  const [running, setRunning] = useState(false);
  const [connState, setConnState] = useState<"connected" | "reconnecting" | "disconnected">("connected");
  const [turnStartAt, setTurnStartAt] = useState(0);
  const [turnTokens, setTurnTokens] = useState(0);
  const [balanceText, setBalanceText] = useState("");
  const [goalActive, setGoalActive] = useState(false);
  const [retryStatus, setRetryStatus] = useState<{ attempt: number; max: number } | null>(null);
  const [cumulativeTokens, setCumulativeTokens] = useState(0);
  const [cumulativeCost, setCumulativeCost] = useState(0);
  const [cumulativeCacheHit, setCumulativeCacheHit] = useState(0);
  const [cumulativeCacheMiss, setCumulativeCacheMiss] = useState(0);

  // ── Todos (React state) ──
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [todosDismissed, setTodosDismissed] = useState(false);

  // ── Rewind modal state ──
  const [rewindOpen, setRewindOpen] = useState(false);

  // ── Helpers (memoized) ──
  const refreshStatus = useCallback(async () => {
    try {
      const s = await app.Balance();
      setBalanceText(s.balance ? "💰 " + (s.balance.display || "") : "");
      setGoalActive(!!(s.goal && (s.goalStatus || "") === "running"));
    } catch { /* ignore */ }
  }, []);

  const fetchTodos = useCallback(() => {
    app.Todos().then(ts => {
      if (Array.isArray(ts)) setTodos(ts);
    }).catch(() => {});
  }, []);

  // ── SSE connection — runs once on mount ──
  useEffect(() => {
    // Load history on boot
    app.History().then((msgs: HistoryMessage[]) => {
      dispatch({ type: "history", messages: msgs } as any);
      fetchTodos();
    }).catch(() => {});

    // SSE event handler
    app.onEvent((e: Record<string, any>) => {
      setConnState("connected");
      if (e.kind !== "retrying") setRetryStatus(null);
      dispatch({ type: "event", e } as any);

      switch (e.kind) {
        case "turn_started":
          setRunning(true);
          setTurnStartAt(Date.now());
          setTurnTokens(0);
          setTodosDismissed(false);
          break;
        case "tool_result":
          if (e.tool && e.tool.name === "todo_write" && !e.tool.parentId && !e.tool.err) {
            try {
              const ts = parseTodos(e.tool.args);
              if (ts.length) setTodos(ts);
            } catch { /* ignore */ }
          }
          break;
        case "usage":
          if (e.usage) {
            setTurnTokens((e.usage as any).completionTokens || 0);
            setCumulativeTokens(prev => prev + ((e.usage as any).tokens || 0));
            setCumulativeCost(prev => prev + ((e.usage as any).costUsd || 0));
            setCumulativeCacheHit(prev => prev + ((e.usage as any).cacheHit || 0));
            setCumulativeCacheMiss(prev => prev + ((e.usage as any).cacheMiss || 0));
          }
          break;
        case "retrying":
          setRetryStatus({ attempt: (e as any).retryAttempt || 0, max: (e as any).retryMax || 0 });
          break;
        case "turn_done":
          setRunning(false);
          refreshStatus();
          fetchTodos();
          break;
      }
    });

    app.onReconnect(() => {
      setConnState("connected");
      refreshStatus();
      fetchTodos();
    });

    app.onConnState((s) => setConnState(s));
    app.connect();

    // status polling
    const pollTimer = setInterval(refreshStatus, 30000);
    return () => {
      clearInterval(pollTimer);
      app.disconnect();
    };
  }, [refreshStatus, fetchTodos]);

  // Tick timer — re-render every 500ms when running so elapsed clock ticks
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setTick(x => x + 1), 500);
    return () => clearInterval(t);
  }, [running]);

  // ── Actions ──
  const submit = useCallback(async (text: string) => {
    // Show the user message immediately (before SSE confirms)
    dispatch({ type: "user", text } as any);
    const r = await app.Submit(text);
    if (r.ok && r.status === 204) {
      window.dispatchEvent(new CustomEvent("__refresh-sidebar"));
      refreshStatus();
    }
  }, [dispatch, refreshStatus]);

  const cancel = useCallback(async () => {
    await app.Cancel();
  }, []);

  const newSession = useCallback(async () => {
    dispatch({ type: "clear" } as any);
    setTodos([]);
    setTodosDismissed(false);
    // Fetch new history after short delay (matches original 300ms)
    await sleep(300);
    try {
      const msgs = await app.History();
      dispatch({ type: "history", messages: msgs } as any);
      fetchTodos();
    } catch { /* ignore */ }
  }, [fetchTodos]);

  const openRewind = useCallback(() => {
    setRewindOpen(true);
  }, []);

  const closeRewind = useCallback(() => {
    setRewindOpen(false);
  }, []);

  // ── Expose cumulative stats to vanilla code ──
  (window as any).__cumulativeStats = () => ({
    tokens: cumulativeTokens,
    cost: cumulativeCost,
    cacheHit: cumulativeCacheHit,
    cacheMiss: cumulativeCacheMiss,
  });

  return {
    state: {
      items,
      live,
      running,
      connState,
      turnStartAt,
      turnTokens,
      balanceText,
      goalActive,
      retryStatus,
      todos,
      cumulativeTokens,
      cumulativeCost,
      cumulativeCacheHit,
      cumulativeCacheMiss,
    },
    dispatch: (a: any) => dispatch(a),
    submit,
    cancel,
    newSession,
    openRewind,
    dismissTodos: () => setTodosDismissed(true),
    rewindOpen,
    closeRewind,
  };
}
