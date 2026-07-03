/**
 * ChatMessage.tsx — renders a user or assistant message bubble.
 * Matches original internal/serve/index.html DOM structure exactly.
 */
import { useState } from "react";
import { __ } from "../lib/i18n";
import type { UserItem, AssistantItem, LiveStream } from "../lib/transcriptTypes";
import { MarkdownRenderer } from "./MarkdownRenderer";

interface Props {
  item: UserItem | AssistantItem;
  live?: LiveStream;
}

export function ChatMessage({ item, live }: Props) {
  if (item.kind === "user") {
    return (
      <div className="msg msg--user">
        <span className="msg__caret">&rsaquo;</span>
        <div className="msg__text">{item.text}</div>
      </div>
    );
  }

  // assistant
  const text = live?.id === item.id ? (live?.text || "") : (item.text || "");
  const rawReasoning = live?.id === item.id ? (live?.reasoning || "") : (item.reasoning || "");
  const reasoning = rawReasoning;
  const reasoningComplete = live?.id === item.id ? (live?.reasoningComplete ?? false) : (item as any).reasoningComplete ?? false;
  const isStreaming = live?.id === item.id || item.streaming;
  const [showReasoning, setShowReasoning] = useState(false);

  return (
    <div className="msg msg--assistant">
      {/* reasoning toggle — matches desktop: shows thinking+meta suffix */}
      {reasoning && (
        <div className="reasoning">
          <button
            className="reasoning__toggle"
            data-running={isStreaming && !reasoningComplete ? "" : undefined}
            onClick={() => setShowReasoning(!showReasoning)}
          >
            <span className={"reasoning__chevron" + (showReasoning ? " reasoning__chevron--open" : "")}>&#9654;</span>
            {" "}{__("thinking")}
            <span className="reasoning__meta">{isStreaming && !reasoningComplete ? __("thinking") + "…" : __("done")}</span>
          </button>
          {showReasoning && (
            <div className="reasoning__body">{reasoning}</div>
          )}
        </div>
      )}

      {/* message text — rendered as markdown */}
      {text ? (
        <div className="msg__text"><MarkdownRenderer text={text} /></div>
      ) : null}

      {/* cursor as sibling after msg__text during streaming — matches original (only after first text chunk) */}
      {isStreaming && text && <span className="cursor"></span>}
    </div>
  );
}
