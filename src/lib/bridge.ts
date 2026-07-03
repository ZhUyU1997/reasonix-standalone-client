/**
 * bridge.ts — Lightweight AppBindings interface for the standalone HTTP client.
 *
 * Mirrors the desktop/frontend/src/lib/bridge.ts contract, but only covers
 * methods exposed by `reasonix serve` via its HTTP/SSE API.
 *
 * The actual implementations live in api.ts (HTTP helpers) and main.tsx (SSE
 * event wiring). This interface exists purely for type alignment — any method
 * added to the server should be added here first.
 */

export interface AppBindings {
  Submit(input: string): Promise<void>;
  Cancel(): Promise<void>;
  Approve(id: string, allow: boolean, session: boolean, persist: boolean): Promise<void>;
  AnswerQuestion(id: string, answers: { id: string; label: string }[]): Promise<void>;
  NewSession(): Promise<void>;
  ResumeSession(sessionId: string): Promise<void>;
  DeleteSession(sessionId: string): Promise<void>;
  History(): Promise<import("./types").HistoryMessage[]>;
  ListSessions(): Promise<import("./types").SessionMeta[]>;
  Compact(): Promise<void>;
  SetMode(mode: string): Promise<void>;
  SetGoal(goal: string): Promise<void>;
  ClearGoal(): Promise<void>;
  Balance(): Promise<import("./types").StatusResponse>;
  Todos(): Promise<import("./types").TodoItem[]>;
  Rewind(turn: number, scope: string): Promise<void>;
  Fork(turn: number): Promise<void>;
}
