/**
 * transcriptReducer.ts — state machine for the transcript.
 * Converts SSE wire events and history into a flat Item[] array + LiveStream.
 */
import type { WireTool, WireUsage, WireApproval, WireAsk, HistoryMessage } from "./types";
import type { TranscriptState, Action, Item, LiveStream, AssistantItem } from "./transcriptTypes";
import { initialState } from "./transcriptTypes";

let _nextId = 1;
function nextId(prefix = "m"): string { return prefix + (_nextId++); }

// ── helpers ──

function ensureAssistant(s: TranscriptState): { id: string; seq: number } {
  // find the last assistant item that is still streaming
  const last = s.items[s.items.length - 1];
  if (last?.kind === "assistant" && last.streaming) {
    return { id: last.id, seq: 0 };
  }
  const id = nextId("a");
  const item: AssistantItem = { kind: "assistant", id, text: "", reasoning: "", streaming: true, reasoningComplete: false };
  s.items.push(item);
  return { id, seq: 0 };
}

// ── reducer ──

export function reducer(state: TranscriptState, action: Action): TranscriptState {
  const s = structuredClone(state);
  switch (action.type) {
    case "user": {
      const id = nextId("u");
      s.items.push({ kind: "user", id, text: action.text });
      return s;
    }
    case "history": {
      // Convert HistoryMessage[] → Item[]
      s.items = historyToItems(action.messages);
      return s;
    }
    case "clear": {
      return initialState;
    }
    case "remove": {
      s.items = s.items.filter(it => it.id !== action.id);
      return s;
    }
    case "event": {
      const e = action.e;
      switch (e.kind) {
        case "turn_started": {
          ensureAssistant(s);
          return s;
        }
        case "reasoning": {
          const delta = e.reasoning || e.text || "";
          if (s.live && s.live.id === s.items[s.items.length - 1]?.id) {
            s.live = { ...s.live, reasoning: s.live.reasoning + delta, reasoningComplete: false };
          } else {
            const { id } = ensureAssistant(s);
            s.live = { id, text: "", reasoning: delta, reasoningComplete: false };
          }
          return s;
        }
        case "text": {
          const delta = e.text || "";
          if (s.live && s.live.id === s.items[s.items.length - 1]?.id) {
            s.live = { ...s.live, text: s.live.text + delta, reasoningComplete: s.live.reasoning !== "" || s.live.reasoningComplete };
          } else {
            const { id } = ensureAssistant(s);
            s.live = { id, text: delta, reasoning: "", reasoningComplete: false };
          }
          return s;
        }
        case "message": {
          // Finalize live → replace the last assistant item
          if (s.live) {
            const lastIdx = s.items.length - 1;
            for (let i = lastIdx; i >= 0; i--) {
              const item = s.items[i];
              if (item?.kind === "assistant" && item.streaming) {
                s.items[i] = { ...item, text: s.live.text, reasoning: s.live.reasoning, streaming: false, reasoningComplete: true };
                break;
              }
            }
            s.live = null;
          }
          return s;
        }
        case "tool_dispatch": {
          if (e.tool) {
            const t = e.tool as WireTool;
            // If a tool with this ID already exists (e.g. partial → full dispatch), update it
            let existing = -1;
            for (let i = s.items.length - 1; i >= 0; i--) {
              const it = s.items[i];
              if (it?.kind === "tool" && (it as any).tool.id === t.id) { existing = i; break; }
            }
            if (existing >= 0) {
              s.items[existing] = { ...s.items[existing], tool: t, status: "running", outputText: "" } as Item;
            } else {
              const id = nextId("t");
              s.items.push({ kind: "tool", id, tool: t, status: "running", outputText: "" });
            }
          }
          return s;
        }
        case "tool_result": {
          if (e.tool) {
            const t = e.tool as WireTool;
            for (let i = s.items.length - 1; i >= 0; i--) {
              const item = s.items[i];
              if (item?.kind === "tool" && (t.id !== "" ? item.tool.id === t.id : item.tool.name === t.name)) {
                s.items[i] = { ...item, tool: { ...t, diff: t.diff || item.tool.diff }, status: t.err ? "error" : "done", outputText: t.output || "" };
                break;
              }
            }
          }
          return s;
        }
        case "tool_progress": {
          if (e.tool) {
            const t = e.tool as WireTool;
            for (let i = s.items.length - 1; i >= 0; i--) {
              const item = s.items[i];
              if (item?.kind === "tool" && item.tool.id === t.id) {
                s.items[i] = { ...item, outputText: (item.outputText || "") + (t.output || ""), hadProgress: true };
                break;
              }
            }
          }
          return s;
        }
        case "usage": {
          if (e.usage) {
            s.items.push({ kind: "metric", id: nextId("m"), usage: e.usage as WireUsage });
          }
          return s;
        }
        case "notice": {
          s.items.push({ kind: "notice", id: nextId("n"), level: e.level === "warn" ? "warn" : "info", text: e.text || "" });
          return s;
        }
        case "phase": {
          s.items.push({ kind: "phase", id: nextId("p"), text: e.text || "" });
          return s;
        }
        case "approval_request": {
          if (e.approval) s.items.push({ kind: "approval", id: nextId("ap"), approval: e.approval as WireApproval });
          return s;
        }
        case "ask_request": {
          if (e.ask) s.items.push({ kind: "ask", id: nextId("ak"), ask: e.ask as WireAsk });
          return s;
        }
        case "compaction_started":
        case "compaction_done": {
          const pending = e.kind === "compaction_started";
          s.items.push({
            kind: "compaction",
            id: nextId("c"),
            pending,
            trigger: e.compaction?.trigger,
            summary: e.compaction?.summary,
            messages: e.compaction?.messages,
          });
          return s;
        }
        case "retrying": {
          // ignore for now
          return s;
        }
        case "turn_done": {
          if (s.live) {
            for (let i = s.items.length - 1; i >= 0; i--) {
              const item = s.items[i];
              if (item?.kind === "assistant" && item.streaming) {
                s.items[i] = { ...item, text: s.live.text, reasoning: s.live.reasoning, streaming: false, reasoningComplete: true };
                break;
              }
            }
            s.live = null;
          }
          return s;
        }
        default:
          return s;
      }
    }
    default:
      return s;
  }
}

// ── history conversion ──

function historyToItems(msgs: HistoryMessage[]): Item[] {
  const items: Item[] = [];
  let seq = 0;

  // First pass: build result lookup
  const resultById = new Map<string, HistoryMessage>();
  for (const m of msgs) {
    if (m.role === "tool" && m.toolCallId) {
      resultById.set(m.toolCallId, m);
    }
  }

  const consumed = new Set<string>();

  for (const m of msgs) {
    if (m.role === "user") {
      items.push({ kind: "user", id: `h-u-${seq}`, text: m.content || "" });
    } else if (m.role === "assistant") {
      const id = `h-a-${seq}`;
      const tcArray = (m as any).toolCalls || [];
      const hasContent = !!(m.content || m.reasoning || tcArray.length);
      if (hasContent) {
        items.push({
          kind: "assistant", id,
          text: m.content || "",
          reasoning: m.reasoning || "",
          streaming: false,
          reasoningComplete: true,
        });
      }
      // Tool calls from assistant
      for (const tc of tcArray) {
        if (tc.id) consumed.add(tc.id);
        const result = resultById.get(tc.id);
        const output = result?.content || "";
        items.push({
          kind: "tool",
          id: tc.id || `h-t-${seq}`,
          tool: { id: tc.id || "", name: tc.name || "tool", args: tc.arguments || "", err: "", output },
          status: result ? "done" : "running",
          outputText: output,
        });
      }
    } else if (m.role === "tool") {
      // Skip if already consumed as assistant tool call result
      if (m.toolCallId && consumed.has(m.toolCallId)) { seq++; continue; }
      items.push({
        kind: "tool",
        id: m.toolCallId || `h-t-${seq}`,
        tool: { id: m.toolCallId || "", name: m.toolName || "tool", args: "", err: "", output: m.content || "" },
        status: "done",
        outputText: m.content || "",
      });
    }
    seq++;
  }
  return items;
}
