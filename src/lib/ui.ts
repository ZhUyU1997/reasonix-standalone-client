/**
 * ui.ts — Formatting helpers and shared utilities.
 * No DOM manipulation — all rendering is done via React.
 */

import type { WireApproval, TodoItem } from "./types";

// ── formatting ──
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

// ── approval helpers ──
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

// ── todo parsing (pure, no DOM) ──
export function parseTodos(args: string): TodoItem[] {
  try { const a = JSON.parse(args); return Array.isArray(a.todos) ? a.todos : []; }
  catch { return []; }
}
