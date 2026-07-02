/**
 * main.ts — entry point. Imports api and ui modules, wires up the UI.
 */

import { __ } from "./i18n";
import { post, getJSON, connectSSE } from "./api";
import { createElement } from "react";
import { createRoot } from "react-dom/client";
import { StatusBar } from "./StatusBar";
import { ModeBar } from "./ModeBar";
import { Sidebar } from "./Sidebar";
import { Composer } from "./Composer";
import { Transcript, getDispatch } from "./Transcript";
import {
  fmtTok, fmtElapsed,
  parseTodos, renderTodoPanel,
  openRewindPicker,
  setupRewindKeyboardNav,
} from "./ui";
import type { StatusResponse, HistoryMessage, TodoItem } from "./types";

// ── DOM refs ──
// ── state ──
let running = false;
let connState = "connected";
let turnStartAt = 0, turnTokens = 0;
let tickTimer: ReturnType<typeof setInterval> | null = null;
let balanceText = "";
let connGoalActive = false;
let retryStatus: { attempt: number; max: number } | null = null;
let todosState: TodoItem[] = [], todosDismissed = false;

// ── helpers ──
function setRunning(on: boolean): void {
  running = on;
  retryStatus = null;
  if (on) {
    turnStartAt = Date.now(); turnTokens = 0;
    if (!tickTimer) {
      tickTimer = setInterval(() => { renderSB(); }, 500);
    }
  } else {
    if (tickTimer) { clearInterval(tickTimer); tickTimer = null; }
  }
  renderCP();
  renderSB();
  renderSidebar();
}

function setRetrying(attempt: number, max: number): void {
  retryStatus = { attempt: attempt || 0, max: max || 0 };
}

function clearRetrying(): void {
  if (!retryStatus) return;
  retryStatus = null;
}

function setConnState(state: string): void {
  connState = state;
  window.dispatchEvent(new CustomEvent("__conn-state", { detail: state }));
  renderSB();
}

// ── cumulative stats (for stats modal) ──
let cumulativeTokens = 0, cumulativeCost = 0, cumulativeCacheHit = 0, cumulativeCacheMiss = 0;
(window as any).__cumulativeStats = () => ({ tokens: cumulativeTokens, cost: cumulativeCost, cacheHit: cumulativeCacheHit, cacheMiss: cumulativeCacheMiss });

// ── SSE ──
connectSSE(
  (data: unknown) => {
    const e = data as Record<string, any>;
    setConnState("connected");
    if (e.kind !== "retrying") clearRetrying();
    // dispatch to Transcript React state
    const d = getDispatch();
    if (d) d({ type: "event", e });
    // side effects + vanilla overlays
    switch (e.kind) {
      case "turn_started": setRunning(true); todosDismissed = false; break;
      case "tool_result":
        if (e.tool) {
          if (e.tool.name === "todo_write" && !e.tool.parentId && !e.tool.err) {
            try { const ts = parseTodos(e.tool.args); if (ts.length) { todosState = ts; renderTodoPanel(todosState, todosDismissed); } } catch { /* ignore */ }
          }
        }
        break;
      case "usage":
        if (e.usage) {
          if (e.usage?.completionTokens) { turnTokens = e.usage.completionTokens || 0; }
          cumulativeTokens += e.usage.tokens || 0;
          cumulativeCost += e.usage.costUsd || 0;
          cumulativeCacheHit += e.usage.cacheHit || 0;
          cumulativeCacheMiss += e.usage.cacheMiss || 0;
        }
        break;
      case "retrying": setRetrying(e.retryAttempt, e.retryMax); break;
      case "turn_done": setRunning(false); fetchStatus(); fetchTodos(); break;
    }
  },
  () => { setConnState("connected"); fetchStatus(); fetchTodos(); },
  (readyState: number) => { if (readyState === EventSource.CONNECTING) setConnState("reconnecting"); else setConnState("disconnected"); },
);

// ── status polling ──
async function fetchStatus(): Promise<void> {
  try {
    const s = await getJSON<StatusResponse>("/status");
    if (s.balance) balanceText = "💰 " + (s.balance.display || "");
    connGoalActive = !!(s.goal && (s.goalStatus || "") === "running");
  } catch { /* ignore polling errors */ }
  renderSB();
}

setInterval(fetchStatus, 30000);

// ── i18n static text rendering ──
// ── history (load into Transcript) ──
getJSON<HistoryMessage[]>("/history").then(msgs => {
  const d = getDispatch();
  if (d) d({ type: "history", messages: msgs });
  fetchTodos();
}).catch(() => {});

// ── todo panel ──
function fetchTodos(): void {
  getJSON<TodoItem[]>("/todos").then(ts => { if (Array.isArray(ts)) { todosState = ts; renderTodoPanel(todosState, todosDismissed); } }).catch(() => {});
}
const todosHead = document.getElementById("todos-head") as HTMLElement | null;
if (todosHead) {
  todosHead.onclick = function(this: HTMLElement, e: MouseEvent) {
    if ((e.target as HTMLElement).closest(".todos__dismiss")) { todosDismissed = true; renderTodoPanel(todosState, todosDismissed); return; }
    const panel = document.getElementById("todo-panel") as HTMLElement | null;
    if (panel) panel.classList.toggle("todos--collapsed");
  };
}

// ── rewind keyboard nav ──
setupRewindKeyboardNav(__);
// rewind esc trigger from Composer
window.addEventListener("__rewind-esc", () => openRewindPicker(__));

// ── global event handlers (from Sidebar/Composer) ──
window.addEventListener("__new-session", () => {
  const d = getDispatch();
  if (d) d({ type: "clear" });
  todosState = []; todosDismissed = false;
  // fetch new session's history + todos (matches original 300ms delay)
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

// ── React mounts ──
const sbEl = document.getElementById("statusbar-root");
let sbRoot: ReturnType<typeof createRoot> | null = null;
const sideEl = document.getElementById("sidebar");
let sideRoot: ReturnType<typeof createRoot> | null = null;
function renderSidebar() {
  if (sideEl) {
    if (!sideRoot) sideRoot = createRoot(sideEl);
    sideRoot.render(createElement(Sidebar, { running }));
  }
}
function renderSB() {
  if (sbEl) {
    if (!sbRoot) sbRoot = createRoot(sbEl);
    const ms = running ? (Date.now() - turnStartAt) : 0;
    const turnText = running ? fmtElapsed(ms) + (turnTokens > 0 ? " · ↓ " + fmtTok(turnTokens) + " tok" : "") : "";
    sbRoot.render(createElement(StatusBar, { running, connState, goalActive: connGoalActive, turnText, balanceText }));
  }
  renderSidebar();
}
renderSB();
const mbRoot = document.getElementById("modebar-root");
if (mbRoot) createRoot(mbRoot).render(createElement(ModeBar));
const cpEl = document.getElementById("composer-root");
let cpRoot: ReturnType<typeof createRoot> | null = null;
function renderCP() {
  if (cpEl) {
    if (!cpRoot) cpRoot = createRoot(cpEl);
    cpRoot.render(createElement(Composer, { running, onSend: (text: string) => { post("/submit", {input: text}).then(r => { if (r.ok && r.status === 204) { fetchStatus(); window.dispatchEvent(new CustomEvent("__refresh-sidebar")); } }); }, onStop: () => post("/cancel"), goalActive: false, goalText: "" }));
  }
}
renderCP();
renderSidebar();

// ── React mount: transcript ──
const trEl = document.getElementById("transcript-root");
if (trEl) createRoot(trEl).render(createElement(Transcript));
