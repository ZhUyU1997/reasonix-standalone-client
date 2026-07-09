/**
 * Transcript.tsx — main transcript component.
 * Renders welcome + message items, handles auto-scroll during streaming.
 */
import { useEffect, useRef, useCallback } from "react";
import { __ } from "../lib/i18n";
import type { Item, LiveStream } from "../lib/transcriptTypes";
import { ChatMessage } from "./ChatMessage";
import { ToolCard } from "./ToolCard";
import { ApprovalCard } from "./ApprovalCard";
import { AskCard } from "./AskCard";
import { fmtMoney, fmtTok } from "../lib/ui";

interface TranscriptProps {
  items: Item[];
  live: LiveStream | null;
  dispatch: (a: any) => void;
  model?: string;
  cwd?: string;
}

export function Transcript({ items, live: liv, dispatch, model, cwd }: TranscriptProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const stickRef = useRef(true);
  const autoScrollFrame = useRef<number | null>(null);

  // auto-scroll during streaming
  useEffect(() => {
    if (!stickRef.current) return;
    if (autoScrollFrame.current !== null) return;
    const el = scrollRef.current;
    if (!el) return;
    autoScrollFrame.current = requestAnimationFrame(() => {
      autoScrollFrame.current = null;
      if (!stickRef.current || !el) return;
      el.scrollTop = el.scrollHeight;
    });
  }, [items.length, liv?.text?.length ?? 0, liv?.reasoning?.length ?? 0]);

  const live = liv;

  const scrollDown = useCallback(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, []);

  // handle welcome examples trigger
  const handleExPrompt = (text: string) => {
    (window as any).__setComposerText?.(text);
  };

  const isEmpty = items.length === 0 && !live;

  return (
    <section className="transcript" id="log" ref={scrollRef}
      onScroll={() => {
        const el = scrollRef.current;
        if (!el) return;
        stickRef.current = el.scrollTop + el.clientHeight >= el.scrollHeight - 60;
      }}
    >
      {/* welcome */}
      {isEmpty && (
        <div className="welcome" id="welcome">
          <div className="welcome__brand">
            <img src="/logo-wordmark.svg" alt="Reasonix" className="brand-wordmark brand-wordmark--welcome" draggable={false} />
          </div>
          <div className="welcome__tag">{__("welcome_tag")}</div>
          {(model || cwd) && (
            <div className="welcome__meta">
              {model && <span className="welcome__pill"><strong>Model</strong><span id="welcome-model">{model}</span></span>}
              {cwd && <span className="welcome__pill"><strong>Workspace</strong><span id="welcome-cwd">{cwd}</span></span>}
            </div>
          )}
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
      {items.map((item) => {
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
              <div key={item.id} className="compaction">
                {item.pending ? (
                  __("compacting")
                ) : (
                  <>
                    <div className="compaction__head" onClick={() => {
                      const body = document.getElementById("cbody-" + item.id);
                      if (body) body.classList.toggle("compaction__body--open");
                    }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="4 14 10 14 10 20" />
                        <polyline points="20 10 14 10 14 4" />
                        <line x1="14" y1="10" x2="21" y2="3" />
                        <line x1="3" y1="21" x2="10" y2="14" />
                      </svg>
                      <span className="compaction__title">{__("compacted")}</span>
                      <span>{item.messages} {__("messages")}</span>
                    </div>
                    {item.summary && (
                      <div className="compaction__body" id={"cbody-" + item.id}>{item.summary}</div>
                    )}
                  </>
                )}
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
      {live && items.every(it => it.id !== live.id) && (
        <ChatMessage
          item={{ kind: "assistant", id: live.id, text: live.text, reasoning: live.reasoning, streaming: true, reasoningComplete: live.reasoningComplete }}
          live={live}
        />
      )}
    </section>
  );
}
