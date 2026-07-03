/**
 * bridge.ts — AppBindings implementation backed by reasonix serve HTTP/SSE API.
 *
 * Every method maps to a `reasonix serve` endpoint. Callers use the `app` object
 * instead of calling `post("/submit", ...)` directly, keeping the API contract
 * visible and making it drop-in replaceable with the desktop Wails bridge.
 */

import { post, getJSON, connectSSE } from "./api";
import type {
  HistoryMessage, SessionMeta, StatusResponse, TodoItem,
  WireEvent, SlashCmd,
} from "./types";

// ── Callback types ──
type EventCallback = (e: WireEvent) => void;
type ConnStateCallback = (state: "connected" | "reconnecting" | "disconnected") => void;

let _onEvent: EventCallback | null = null;
let _onReconnect: (() => void) | null = null;
let _onConnState: ConnStateCallback | null = null;

// ── AppBindings implementation ──

export interface AppBindings {
  Submit(input: string): Promise<Response>;
  Cancel(): Promise<Response>;
  Approve(id: string, allow: boolean, session: boolean, persist: boolean, scope?: string): Promise<Response>;
  AnswerQuestion(id: string, answers: { questionId: string; selected: string[] }[]): Promise<Response>;
  NewSession(): Promise<Response>;
  ResumeSession(sessionId: string): Promise<Response>;
  DeleteSession(name: string): Promise<Response>;
  History(): Promise<HistoryMessage[]>;
  ListSessions(): Promise<SessionMeta[]>;
  Compact(): Promise<Response>;
  SetMode(mode: string): Promise<Response>;
  SetGoal(goal: string): Promise<Response>;
  ClearGoal(): Promise<Response>;
  SetPlanMode(on: boolean): Promise<Response>;
  SetToolApprovalMode(mode: string): Promise<Response>;
  Balance(): Promise<StatusResponse>;
  Todos(): Promise<TodoItem[]>;
  Rewind(turn: number, scope: string): Promise<Response>;
  Fork(turn: number): Promise<Response>;

  /** Register an SSE event callback. Call once before boot. */
  onEvent(cb: EventCallback): void;
  /** Register a reconnect callback. */
  onReconnect(cb: () => void): void;
  /** Register a connection-state callback. */
  onConnState(cb: ConnStateCallback): void;

  /** Start the SSE connection. Call after setting up callbacks. */
  connect(): void;
}

export const app: AppBindings = {
  async Submit(input: string): Promise<Response> {
    return post("/submit", { input });
  },
  async Cancel(): Promise<Response> {
    return post("/cancel");
  },
  async Approve(id: string, allow: boolean, session: boolean, persist: boolean, scope?: string): Promise<Response> {
    return post("/approve", { id, allow, session, persist, ...(scope ? { scope } : {}) });
  },
  async AnswerQuestion(id: string, answers: { questionId: string; selected: string[] }[]): Promise<Response> {
    return post("/answer", { id, answers });
  },
  async NewSession(): Promise<Response> {
    return post("/new");
  },
  async ResumeSession(sessionId: string): Promise<Response> {
    return post("/resume", { path: sessionId });
  },
  async DeleteSession(name: string): Promise<Response> {
    return post("/delete-session", { name });
  },
  async History(): Promise<HistoryMessage[]> {
    return getJSON<HistoryMessage[]>("/history");
  },
  async ListSessions(): Promise<SessionMeta[]> {
    return getJSON<SessionMeta[]>("/sessions");
  },
  async Compact(): Promise<Response> {
    return post("/compact");
  },
  async SetMode(mode: string): Promise<Response> {
    return post("/mode", { mode });
  },
  async SetGoal(goal: string): Promise<Response> {
    return post("/goal", { goal });
  },
  async ClearGoal(): Promise<Response> {
    return post("/clear-goal");
  },
  async SetPlanMode(on: boolean): Promise<Response> {
    return post("/plan", { on });
  },
  async SetToolApprovalMode(mode: string): Promise<Response> {
    return post("/tool-approval-mode", { mode });
  },
  async Balance(): Promise<StatusResponse> {
    return getJSON<StatusResponse>("/status");
  },
  async Todos(): Promise<TodoItem[]> {
    return getJSON<TodoItem[]>("/todos");
  },
  async Rewind(turn: number, scope: string): Promise<Response> {
    return post("/rewind", { turn, scope });
  },
  async Fork(turn: number): Promise<Response> {
    return post("/fork", { turn });
  },

  // ── SSE callbacks ──
  onEvent(cb: EventCallback): void { _onEvent = cb; },
  onReconnect(cb: () => void): void { _onReconnect = cb; },
  onConnState(cb: ConnStateCallback): void { _onConnState = cb; },

  // ── SSE connection ──
  connect(): void {
    connectSSE(
      (data: unknown) => { if (_onEvent) _onEvent(data as WireEvent); },
      () => { if (_onReconnect) _onReconnect(); },
      (readyState: number) => {
        if (_onConnState) {
          if (readyState === EventSource.CONNECTING) _onConnState("reconnecting");
          else _onConnState("disconnected");
        }
      },
    );
  },
};
