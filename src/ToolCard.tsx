/**
 * ToolCard.tsx — renders a tool call card.
 * Matches original internal/serve/index.html behavior:
 * - dispatch: closed (data-open=false), body hidden, data-tone=accent
 * - progress: open (data-open=true), body text appended
 * - complete: data-tone=success/danger, body shows output
 */
import { useEffect, useState } from "react";
import type { ToolItem } from "./transcriptTypes";

interface Props {
  item: ToolItem;
}

export function ToolCard({ item }: Props) {
  const t = item.tool;
  const name = t.name || "";
  const args = t.args || "";
  const isErr = item.status === "error";
  const isDone = item.status === "done" || isErr;
  const isRunning = item.status === "running";

  const [open, setOpen] = useState(false);

  // auto-open on output only if this tool had progress events (streaming tool)
  useEffect(() => {
    if (item.hadProgress && item.outputText) setOpen(true);
  }, [item.hadProgress, item.outputText]);

  const tone = isErr ? "danger" : isDone ? "success" : "accent";
  const hasOutput = !!item.outputText;
  const hasErrText = !!t.err;

  return (
    <div className="card" data-open={open ? "true" : "false"} data-tone={tone}>
      {/* header */}
      <div className="card-head" onClick={() => setOpen(!open)}>
        <span className={"ico" + (isRunning ? " spin" : "")}>
          {isRunning ? (
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10" strokeDasharray="60" strokeDashoffset="20"/>
            </svg>
          ) : isErr ? (
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          ) : (
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          )}
        </span>
        <span className="name">{name}</span>
        {args && <span className="subject">{trunc(args, 80)}</span>}
        <span className="grow"></span>
        <span className="chev">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </span>
      </div>

      {/* card-body — output text only (no args), hidden until toggled or auto-opened on progress */}
      {open && hasOutput && (
        <div className="card-body">{item.outputText}</div>
      )}

      {/* err-body — always shown on error, as sibling of card-body (matching original) */}
      {isErr && hasErrText && (
        <div className="err-body">{t.err}</div>
      )}
    </div>
  );
}

function trunc(s: string, n: number): string {
  return s.length > n ? s.slice(0, n) + "…" : s;
}
