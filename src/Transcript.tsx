/**
 * Transcript.tsx — main transcript component.
 * Renders welcome + message items, handles auto-scroll during streaming.
 */
import { useEffect, useReducer, useRef, useCallback } from "react";
import { __ } from "./i18n";
import { reducer } from "./transcriptReducer";
import type { TranscriptState, Action, Item, LiveStream } from "./transcriptTypes";
import { initialState } from "./transcriptTypes";
import { ChatMessage } from "./ChatMessage";
import { ToolCard } from "./ToolCard";
import { ApprovalCard } from "./ApprovalCard";
import { AskCard } from "./AskCard";
import { fmtMoney, fmtTok } from "./ui";

// expose a dispatch function so main.ts SSE handler can send events
let _dispatch: ((a: Action) => void) | null = null;
export function getDispatch(): (a: Action) => void {
  return (a: Action) => _dispatch?.(a);
}

export function Transcript() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const scrollRef = useRef<HTMLDivElement>(null);
  const parentRef = useRef<HTMLElement | null>(null);
  const stickRef = useRef(true);
  const autoScrollFrame = useRef<number | null>(null);

  // expose dispatch globally
  _dispatch = dispatch;
  useEffect(() => {
    parentRef.current = document.getElementById("transcript-root");
    return () => { _dispatch = null; };
  }, []);

  // auto-scroll during streaming
  useEffect(() => {
    if (!stickRef.current) return;
    if (autoScrollFrame.current !== null) return;
    const el = parentRef.current || scrollRef.current;
    if (!el) return;
    autoScrollFrame.current = requestAnimationFrame(() => {
      autoScrollFrame.current = null;
      if (!stickRef.current || !el) return;
      el.scrollTop = el.scrollHeight;
    });
  }, [state.items.length, state.live?.text?.length ?? 0, state.live?.reasoning?.length ?? 0]);

  const live = state.live;

  const scrollDown = useCallback(() => {
    const el = parentRef.current || scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, []);

  // handle welcome examples trigger
  const handleExPrompt = (text: string) => {
    (window as any).__setComposerText?.(text);
  };

  const isEmpty = state.items.length === 0 && !live;

  return (
    <section className="transcript" id="log" ref={scrollRef}
      onScroll={() => {
        const el = parentRef.current || scrollRef.current;
        if (!el) return;
        stickRef.current = el.scrollTop + el.clientHeight >= el.scrollHeight - 60;
      }}
    >
      {/* welcome */}
      {isEmpty && (
        <div className="welcome" id="welcome">
          <div className="welcome__logo">R</div>
          <div className="welcome__title">Reasonix</div>
          <div className="welcome__tag">{__("welcome_tag")}</div>
          <div className="welcome__hints">
            <span><kbd>/</kbd> {__("hint_commands")}</span>
            <span><kbd>Shift+Tab</kbd> {__("hint_mode")}</span>
            <span><kbd>Ctrl+Y</kbd> {__("hint_yolo")}</span>
            <span><kbd>Esc&times;2</kbd> {__("hint_rewind")}</span>
          </div>
          <div className="welcome__examples">
            <button className="welcome__ex" data-prompt="" onClick={() => handleExPrompt(__("example_explain"))}>{__("example_explain")}</button>
            <button className="welcome__ex" data-prompt="" onClick={() => handleExPrompt(__("example_fix"))}>{__("example_fix")}</button>
            <button className="welcome__ex" data-prompt="" onClick={() => handleExPrompt(__("example_test"))}>{__("example_test")}</button>
          </div>
        </div>
      )}

      {/* message items */}
      {state.items.map((item) => {
        switch (item.kind) {
          case "user":
          case "assistant":
            return (
              <ChatMessage
                key={item.id}
                item={item}
                live={live?.id === item.id ? live : undefined}
              />
            );
          case "tool":
            return <ToolCard key={item.id} item={item} />;
          case "phase":
            return <div key={item.id} className="phase">{item.text}</div>;
          case "notice":
            return <div key={item.id} className={"notice" + (item.level === "warn" ? " notice--warn" : "")}>{item.level === "warn" ? "! " : ""}{item.text}</div>;
          case "compaction":
            return (
              <div key={item.id} className={item.pending ? "phase" : "notice compacted"}>
                {item.pending ? __("compacting") : (__("compacted") + (item.trigger ? ` (${item.trigger})` : ""))}
              </div>
            );
          case "metric": {
            const u = item.usage;
            const cacheTotal = (u.cacheHitTokens || 0) + (u.cacheMissTokens || 0);
            const cachePct = cacheTotal > 0 ? Math.round((u.cacheHitTokens || 0) / cacheTotal * 100) + "%" : "";
            const cost = u.cost && u.cost > 0 ? fmtMoney(u.cost, u.currency) : "";
            return (
              <div key={item.id} className="metric-strip">
                <span className="item">{__("total")} <span className="v">{fmtTok(u.totalTokens)}</span></span>
                <span className="item">{__("in")} <span className="v acc">{fmtTok(u.promptTokens)}</span></span>
                <span className="item">{__("out")} <span className="v ok">{fmtTok(u.completionTokens)}</span></span>
                {cachePct && <span className="item">{__("cache")} <span className="v acc">{cachePct}</span></span>}
                {cost && <span className="item">{__("cost")} <span className="v">{cost}</span></span>}
              </div>
            );
          }
          case "approval":
            return <ApprovalCard key={item.id} approval={item.approval} onDone={() => dispatch({ type: "remove", id: item.id })} />;
          case "ask":
            return <AskCard key={item.id} ask={item.ask} onDone={() => dispatch({ type: "remove", id: item.id })} />;
          default:
            return null;
        }
      })}

      {/* live assistant (streaming, not yet in items) */}
      {live && state.items.every(it => it.id !== live.id) && (
        <ChatMessage
          item={{ kind: "assistant", id: live.id, text: live.text, reasoning: live.reasoning, streaming: true, reasoningComplete: live.reasoningComplete }}
          live={live}
        />
      )}
    </section>
  );
}
