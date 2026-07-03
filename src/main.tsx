/**
 * main.tsx — Entry point for the standalone client.
 *
 * Responsibilities:
 *   1. Mount the React <App /> into #root.
 *   2. Wire up SSE (EventSource) and push events into Transcript via getDispatch().
 *   3. Poll /status and push state changes via setApp().
 *   4. Manage vanilla-DOM side-effects (todo panel, rewind picker, cumulative stats).
 *
 * State flow: SSE/polling callbacks → setApp() → notify React subscribers → re-render.
 */

import { createRoot } from "react-dom/client";
import App from "./App";
import { getJSON, connectSSE } from "./lib/api";
import { setApp, getApp } from "./lib/appState";
import { getDispatch } from "./components/Transcript";
import { __ } from "./lib/i18n";
import {
  parseTodos, renderTodoPanel,
  openRewindPicker, setupRewindKeyboardNav,
} from "./lib/ui";
import type { StatusResponse, HistoryMessage, TodoItem } from "./lib/types";

// ── React mount (single root) ──
const rootEl = document.getElementById("root");
if (rootEl) createRoot(rootEl).render(<App />);

// ── cumulative stats (for stats modal; read by Sidebar) ──
// ── cumulative stats (for stats modal; read by Sidebar) ──
(window as any).__cumulativeStats = () => {
  const s = getApp();
  return { tokens: s.cumulativeTokens, cost: s.cumulativeCost, cacheHit: s.cumulativeCacheHit, cacheMiss: s.cumulativeCacheMiss };
};

// ── vanilla DOM state (not in appState) ──
let todosState: TodoItem[] = [];
let todosDismissed = false;

// ── SSE connection ──
connectSSE(
  (data: unknown) => {
    const e = data as Record<string, any>;

    // Always reset connState on any event
    setApp({ connState: "connected" });

    // Clear retry status unless this IS a retry event
    if (e.kind !== "retrying") setApp({ retryStatus: null });

    // Dispatch into Transcript reducer
    const d = getDispatch();
    if (d) d({ type: "event", e });

    // Side-effects (vanilla DOM + state updates not handled by reducer)
    switch (e.kind) {
      case "turn_started":
        setApp({ running: true, turnStartAt: Date.now(), turnTokens: 0 });
        todosDismissed = false;
        break;
      case "tool_result":
        if (e.tool && e.tool.name === "todo_write" && !e.tool.parentId && !e.tool.err) {
          try {
            const ts = parseTodos(e.tool.args);
            if (ts.length) { todosState = ts; renderTodoPanel(todosState, todosDismissed); }
          } catch { /* ignore parse errors */ }
        }
        break;
      case "usage":
        if (e.usage) {
          const cur = getApp();
          setApp({
            turnTokens: (e.usage as any).completionTokens || 0,
            cumulativeTokens: cur.cumulativeTokens + ((e.usage as any).tokens || 0),
            cumulativeCost: cur.cumulativeCost + ((e.usage as any).costUsd || 0),
            cumulativeCacheHit: cur.cumulativeCacheHit + ((e.usage as any).cacheHit || 0),
            cumulativeCacheMiss: cur.cumulativeCacheMiss + ((e.usage as any).cacheMiss || 0),
          });
        }
        break;
      case "retrying":
        setApp({ retryStatus: { attempt: (e as any).retryAttempt || 0, max: (e as any).retryMax || 0 } });
        break;
      case "turn_done":
        setApp({ running: false });
        fetchStatus();
        fetchTodos();
        break;
    }
  },
  // reconnect callback
  () => {
    setApp({ connState: "connected" });
    fetchStatus();
    fetchTodos();
  },
  // readyState callback
  (readyState: number) => {
    if (readyState === EventSource.CONNECTING) setApp({ connState: "reconnecting" });
    else setApp({ connState: "disconnected" });
  },
);

// ── status polling ──
async function fetchStatus(): Promise<void> {
  try {
    const s = await getJSON<StatusResponse>("/status");
    setApp({
      balanceText: s.balance ? "💰 " + (s.balance.display || "") : "",
      goalActive: !!(s.goal && (s.goalStatus || "") === "running"),
    });
  } catch { /* ignore polling errors */ }
}
setInterval(fetchStatus, 30000);

// ── history (load into Transcript on boot) ──
getJSON<HistoryMessage[]>("/history").then(msgs => {
  const d = getDispatch();
  if (d) d({ type: "history", messages: msgs });
  fetchTodos();
}).catch(() => {});

// ── todo panel ──
function fetchTodos(): void {
  getJSON<TodoItem[]>("/todos")
    .then(ts => { if (Array.isArray(ts)) { todosState = ts; renderTodoPanel(todosState, todosDismissed); } })
    .catch(() => {});
}
const todosHead = document.getElementById("todos-head") as HTMLElement | null;
if (todosHead) {
  todosHead.addEventListener("click", (e: MouseEvent) => {
    if ((e.target as HTMLElement).closest(".todos__dismiss")) {
      todosDismissed = true;
      renderTodoPanel(todosState, todosDismissed);
      return;
    }
    const panel = document.getElementById("todo-panel") as HTMLElement | null;
    if (panel) panel.classList.toggle("todos--collapsed");
  });
}

// ── rewind keyboard nav ──
setupRewindKeyboardNav(__);
window.addEventListener("__rewind-esc", () => openRewindPicker(__));

// ── global event handlers (from Sidebar / Composer) ──
window.addEventListener("__new-session", () => {
  const d = getDispatch();
  if (d) d({ type: "clear" });
  todosState = [];
  todosDismissed = false;
  setTimeout(() => {
    getJSON<HistoryMessage[]>("/history").then(msgs => {
      const d2 = getDispatch();
      if (d2) d2({ type: "history", messages: msgs });
      fetchTodos();
    }).catch(() => {});
  }, 300);
});
window.addEventListener("__open-rewind", () => openRewindPicker(__));

// ── initial fetch ──
fetchStatus();
