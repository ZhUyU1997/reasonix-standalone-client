/**
 * ui.ts — all DOM rendering functions. Pure functions that take/return DOM.
 */

import { post, getJSON } from "./api";
import type {
  WireApproval,
  CheckpointMeta, TodoItem,
} from "./types";

// ── helpers ──
export function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

export function escHtml(s: unknown): string {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function escAttr(s: string): string {
  return escHtml(s).replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

export function fmtTok(n: number): string {
  return n >= 1000 ? (n / 1000).toFixed(1).replace(/\.0$/, "") + "k" : String(n);
}

export function currencySymbol(c?: string): string {
  const v = String(c || "¥").trim();
  if (/^(cny|rmb|yuan)$/i.test(v)) return "¥";
  if (/^(usd|dollar)$/i.test(v)) return "$";
  return v || "¥";
}

export function fmtMoney(n: number, c?: string): string {
  if (typeof n !== "number" || !isFinite(n)) return "—";
  const s = currencySymbol(c);
  return s + (n < 1 ? n.toFixed(4) : n.toFixed(2));
}

export function fmtElapsed(ms: number): string {
  const s = Math.floor(ms / 1000);
  return s < 60 ? s + "s" : Math.floor(s / 60) + "m " + (s % 60) + "s";
}

// ── message rendering ──
// ── approval ──
export function approvalSessionRule(a: WireApproval): string {
  if (a.tool === "bash" && a.subject) return "Bash(" + String(a.subject).trim() + ")";
  if (["write_file","edit_file","multi_edit","move_file","notebook_edit","delete_range","delete_symbol"].includes(a.tool)) return "Edit";
  return a.tool;
}

export function approvalPersistentRule(a: WireApproval): string {
  if (a.tool === "bash" && a.subject) return "Bash(" + String(a.subject).trim() + ")";
  if (["write_file","edit_file","multi_edit","move_file","notebook_edit","delete_range","delete_symbol"].includes(a.tool)) return a.subject ? "Edit(" + String(a.subject).trim() + ")" : "Edit";
  return a.tool;
}

export function bashCommandPrefix(subject: string): string {
  const command = String(subject || "").trim();
  if (!command || command.includes("`") || command.includes("$(") || /[;|&<>\n]/.test(command)) return "";
  const fields = command.split(/\s+/).filter(Boolean);
  if (fields.length < 2) return "";
  if (dangerousBashCommand(command)) return "";
  const base = fields[0].toLowerCase();
  if (["npm","pnpm","yarn","bun"].includes(base) && fields[1] && fields[1].toLowerCase() === "run") return fields.length >= 3 ? fields[0] + " " + fields[1] + " " + fields[2] + ":*" : "";
  return fields[0] + " " + fields[1] + ":*";
}

export function dangerousBashCommand(command: string): boolean {
  return /^rm\s+-[^\s]*[rf][^\s]*\b/.test(command)
    || /^git\s+push\b.*\s--force\b/.test(command)
    || /^git\s+push\b.*\s-f\b/.test(command)
    || /^git\s+reset\s+--hard\b/.test(command)
    || /^git\s+clean\s+-f\b/.test(command)
    || /^chmod\s+(?:-R\s+)?777\b/.test(command)
    || /^chown\b/.test(command)
    || /^sudo\b/.test(command)
    || /^mkfs\b/.test(command)
    || /^dd\s+if=/.test(command)
    || /^fdisk\b/.test(command);
}



// ── rewind picker ──
export let rewindCheckpoints: CheckpointMeta[] = [];
let rewindStage = 0, rewindSelected = 0, rewindScope = 0;
export { rewindStage, rewindSelected, rewindScope };

export const SCOPES = [
  {key: "b" as const, label: "scope_both", scope: "both"},
  {key: "c" as const, label: "scope_conversation", scope: "conversation"},
  {key: "d" as const, label: "scope_code", scope: "code"},
  {key: "f" as const, label: "fork", scope: "fork"},
  {key: "s" as const, label: "scope_sumfrom", scope: "sumfrom"},
  {key: "u" as const, label: "scope_sumupto", scope: "sumupto"},
];

export function openRewindPicker(__: (s: string) => string): void {
  getJSON<CheckpointMeta[]>("/checkpoints").then(cps => {
    if (!cps || cps.length === 0) {
      document.body.appendChild(el("div", "notice", __("no_checkpoints")));
      return;
    }
    rewindCheckpoints = cps;
    rewindStage = 0;
    rewindSelected = 0;
    rewindScope = 0;
    renderRewindPicker(__);
  }).catch(() => {});
}

export function renderRewindPicker(__: (s: string) => string): void {
  let overlay = document.getElementById("rewind-overlay") as HTMLElement | null;
  if (overlay) overlay.remove();
  overlay = el("div", "rewind-overlay");
  overlay.id = "rewind-overlay";
  const picker = el("div", "rewind-picker");

  if (rewindStage === 0) {
    picker.innerHTML = '<div class="rewind-picker__head"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg> ' + __("rewind_title") + "</div>";
    const list = el("div", "rewind-picker__list");
    rewindCheckpoints.forEach((cp, i) => {
      const item = el("div", "rewind-picker__item" + (i === rewindSelected ? " rewind-picker__item--active" : ""));
      item.innerHTML = '<span class="rewind-picker__turn">#' + cp.turn + '</span><span class="rewind-picker__prompt">' + escHtml((cp.prompt || "").slice(0, 80)) + '</span><span class="rewind-picker__files">' + cp.files + " " + __("files") + "</span>";
      item.onclick = () => { rewindSelected = i; renderRewindPicker(__); };
      list.appendChild(item);
    });
    picker.appendChild(list);
    picker.appendChild(el("div", "rewind-picker__foot", '<span>' + __("nav_jk") + '</span><span>' + __("nav_enter_esc") + "</span>"));
  } else {
    const cp = rewindCheckpoints[rewindSelected];
    picker.innerHTML = '<div class="rewind-picker__head"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg> ' + __("action_title").replace("#{turn}", String(cp.turn)) + "</div>";
    const scopes = el("div", "rewind-picker__scopes");
    SCOPES.forEach((s, i) => {
      const item = el("div", "rewind-picker__scope" + (i === rewindScope ? " rewind-picker__scope--active" : ""));
      item.innerHTML = '<span class="rewind-picker__scope-key">' + s.key + "</span>" + __(s.label);
      item.onclick = () => { rewindScope = i; applyRewind(); };
      scopes.appendChild(item);
    });
    picker.appendChild(scopes);
    picker.appendChild(el("div", "rewind-picker__foot", '<span>' + __("nav_keys") + '</span><span>' + __("nav_apply_esc") + "</span>"));
  }

  overlay.appendChild(picker);
  overlay.onclick = e => { if (e.target === overlay) overlay.remove(); };
  document.body.appendChild(overlay);
}

export function applyRewind(): void {
  const cp = rewindCheckpoints[rewindSelected];
  const sc = SCOPES[rewindScope];
  const overlay = document.getElementById("rewind-overlay");
  if (overlay) overlay.remove();
  if (sc.scope === "fork") { post("/fork", {turn: cp.turn, name: ""}); }
  else if (sc.scope === "sumfrom") { post("/summarize", {turn: cp.turn, mode: "from"}); }
  else if (sc.scope === "sumupto") { post("/summarize", {turn: cp.turn, mode: "upto"}); }
  else { post("/rewind", {turn: cp.turn, scope: sc.scope}); }
}

export function setupRewindKeyboardNav(__: (s: string) => string): void {
  document.addEventListener("keydown", e => {
    const overlay = document.getElementById("rewind-overlay");
    if (!overlay) return;
    if (e.key === "Escape") {
      e.preventDefault();
      if (rewindStage === 0) overlay.remove();
      else { rewindStage = 0; renderRewindPicker(__); }
      return;
    }
    if (rewindStage === 0) {
      if (e.key === "j" || e.key === "ArrowDown") { e.preventDefault(); rewindSelected = Math.min(rewindSelected + 1, rewindCheckpoints.length - 1); renderRewindPicker(__); }
      if (e.key === "k" || e.key === "ArrowUp") { e.preventDefault(); rewindSelected = Math.max(rewindSelected - 1, 0); renderRewindPicker(__); }
      if (e.key === "Enter") { e.preventDefault(); rewindStage = 1; rewindScope = 0; renderRewindPicker(__); }
    } else {
      if (e.key === "j" || e.key === "ArrowDown") { e.preventDefault(); rewindScope = Math.min(rewindScope + 1, SCOPES.length - 1); renderRewindPicker(__); }
      if (e.key === "k" || e.key === "ArrowUp") { e.preventDefault(); rewindScope = Math.max(rewindScope - 1, 0); renderRewindPicker(__); }
      if (e.key === "Enter") { e.preventDefault(); applyRewind(); }
      const idx = SCOPES.findIndex(s => s.key === e.key);
      if (idx >= 0) { e.preventDefault(); rewindScope = idx; applyRewind(); }
    }
  });
}

// ── todo panel ──
export function parseTodos(args: string): TodoItem[] {
  try { const a = JSON.parse(args); return Array.isArray(a.todos) ? a.todos : []; }
  catch { return []; }
}

export function renderTodoPanel(todosState: TodoItem[], todosDismissed: boolean): void {
  const panel = document.getElementById("todo-panel") as HTMLElement | null;
  const list = document.getElementById("todos-list") as HTMLElement | null;
  const badge = document.getElementById("todos-badge") as HTMLElement | null;
  const summary = document.getElementById("todos-summary") as HTMLElement | null;
  const dismiss = document.getElementById("todos-dismiss") as HTMLElement | null;
  if (!panel || todosDismissed) { panel?.classList.remove("todos--visible"); return; }
  if (!todosState.length) { panel.classList.remove("todos--visible"); return; }
  const done = todosState.filter(t => String(t.status || "").trim() === "completed").length;
  const total = todosState.length;
  const current = todosState.find(t => String(t.status || "").trim() === "in_progress");
  const allDone = done === total;
  badge!.textContent = done + "/" + total;
  summary!.textContent = (current?.activeForm || current?.content || todosState[todosState.length - 1]?.content || "").slice(0, 60);
  dismiss!.style.display = allDone ? "" : "none";
  if (allDone) panel.classList.add("todos--collapsed");
  list!.innerHTML = "";
  todosState.forEach((t) => {
    const st = String(t.status || "").trim();
    const li = el("li", "todos__item todos__item--" + st + (t.level ? " todos__item--sub" : ""));
    li.innerHTML = '<span class="todos__status todos__status--' + st + '">' + (st === "completed" ? "✓" : st === "in_progress" ? "▶" : "○") + '</span><span class="todos__text">' + escHtml((st === "in_progress" && t.activeForm) ? t.activeForm : t.content) + "</span>";
    list!.appendChild(li);
  });
  panel.classList.add("todos--visible");
}
