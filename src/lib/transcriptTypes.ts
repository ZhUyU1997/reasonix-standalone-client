/**
 * transcriptTypes.ts — types for the Transcript state machine.
 */
import type { WireTool, WireUsage, WireApproval, WireAsk, WireCompaction } from "./types";

// ── Item kinds ──

export interface UserItem {
  kind: "user";
  id: string;
  text: string;
}

export interface AssistantItem {
  kind: "assistant";
  id: string;
  text: string;
  reasoning: string;
  streaming: boolean;
  reasoningComplete: boolean;
}

export interface ToolItem {
  kind: "tool";
  id: string;
  tool: WireTool;
  status: "running" | "done" | "error";
  outputText: string;
  hadProgress?: boolean;
}

export interface PhaseItem {
  kind: "phase";
  id: string;
  text: string;
}

export interface NoticeItem {
  kind: "notice";
  id: string;
  level: "info" | "warn";
  text: string;
}

export interface CompactItem {
  kind: "compaction";
  id: string;
  pending: boolean;
  trigger?: string;
  summary?: string;
  messages?: number;
}

export interface MetricItem {
  kind: "metric";
  id: string;
  usage: WireUsage;
}

export interface ApprovalItem {
  kind: "approval";
  id: string;
  approval: WireApproval;
}

export interface AskItem {
  kind: "ask";
  id: string;
  ask: WireAsk;
}

export type Item = UserItem | AssistantItem | ToolItem | PhaseItem | NoticeItem | CompactItem | MetricItem | ApprovalItem | AskItem;

// ── Live stream ──

export interface LiveStream {
  id: string;
  text: string;
  reasoning: string;
  reasoningComplete: boolean;
}

// ── Transcript state ──

export interface TranscriptState {
  items: Item[];
  live: LiveStream | null;
}

export const initialState: TranscriptState = {
  items: [],
  live: null,
};

// ── Actions ──

export type Action =
  | { type: "user"; text: string }
  | { type: "history"; messages: HistoryMessage[] }
  | { type: "event"; e: Record<string, any> }
  | { type: "clear" }
  | { type: "remove"; id: string };

// ── Re-export HistoryMessage shape ──
export interface HistoryMessage {
  role: string;
  content?: string;
  reasoning?: string;
  toolCall?: WireTool;
  toolResult?: WireTool;
}
