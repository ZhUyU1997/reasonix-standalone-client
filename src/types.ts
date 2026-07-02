/** Types for the reasonix serve JSON API (mirrors internal/eventwire/wire.go). */

export interface WireTool {
  id: string;
  name: string;
  args?: string;
  output?: string;
  err?: string;
  readOnly?: boolean;
  truncated?: boolean;
  partial?: boolean;
  parentId?: string;
  diff?: string;
}

export interface WireUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  cacheHitTokens: number;
  cacheMissTokens: number;
  cost?: number;
  currency?: string;
}

export interface WireApproval {
  id: string;
  tool: string;
  subject: string;
  reason?: string;
}

export interface WireAskOption {
  label: string;
  description?: string;
}

export interface WireAskQuestion {
  id: string;
  header?: string;
  prompt: string;
  options: WireAskOption[];
  multi?: boolean;
}

export interface WireAsk {
  id: string;
  questions: WireAskQuestion[];
}

export interface WireCompaction {
  trigger?: string;
  messages?: number;
  summary?: string;
}

export interface WireEvent {
  kind: string;
  text?: string;
  reasoning?: string;
  level?: string;
  tool?: WireTool;
  usage?: WireUsage;
  approval?: WireApproval;
  ask?: WireAsk;
  compaction?: WireCompaction;
  err?: string;
  retryAttempt?: number;
  retryMax?: number;
}

export interface SessionMeta {
  name: string;
  path: string;
  title?: string;
  turns?: number;
  current?: boolean;
}

export interface StatusResponse {
  running: boolean;
  plan: boolean;
  bypass: boolean;
  autoApproveTools: boolean;
  label: string;
  toolApprovalMode: string;
  used: number;
  window: number;
  goal?: string;
  goalStatus?: string;
  cwd: string;
  cacheHit?: number;
  cacheMiss?: number;
  balance?: { available: boolean; display: string; };
  lastUsage?: { cost?: number; currency?: string; };
}

export interface CheckpointMeta {
  turn: number;
  prompt: string;
  files: number;
}

export interface HistoryMessage {
  role: string;
  content?: string;
  reasoning?: string;
  toolCalls?: Array<{
    id: string;
    name: string;
    arguments?: string;
  }>;
  toolCallId?: string;
  toolName?: string;
}

export interface TodoItem {
  content: string;
  status: string;
  activeForm?: string;
  level?: number;
}

export interface MessageState {
  currentMsg: HTMLElement | null;
  currentText: HTMLElement | null;
  currentReasoning: HTMLElement | null;
}

export interface SlashCmd {
  cmd: string;
  desc: string;
}
