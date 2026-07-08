/**
 * ToolCard.tsx — renders a tool call card.
 * Matches original internal/serve/index.html behavior.
 */
import { useEffect, useState } from "react";
import type { ToolItem } from "../lib/transcriptTypes";
import { DiffView } from "./DiffView";
import { ReadFileView } from "./ReadFileView";

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

  useEffect(() => {
    if (item.hadProgress && item.outputText) setOpen(true);
  }, [item.hadProgress, item.outputText]);

  const tone = isErr ? "danger" : isDone ? "success" : "accent";
  const hasOutput = !!item.outputText;
  const hasErrText = !!t.err;

  return (
    <div className="card" data-open={open ? "true" : "false"} data-tone={tone}>
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

      {open && hasOutput && renderBody(item, t.diff)}
      {isErr && hasErrText && (
        <div className="err-body">{t.err}</div>
      )}
    </div>
  );
}

function renderBody(item: ToolItem, dvDiff: string | undefined) {
  const t = item.tool;
  if (dvDiff) {
    const lang = t.name === "edit_file" || t.name === "write_file" || t.name === "multi_edit" ? detectLang(t.args || "") : "";
    return (
      <div className="card-body" style={{ padding: 0, background: "none", maxHeight: "none" }}>
        <DiffView diff={dvDiff} language={lang} />
      </div>
    );
  }
  // Fallback: compute diff from args (write_file: empty→content, edit_file: old→new)
  if (t.name === "edit_file" || t.name === "multi_edit" || t.name === "write_file") {
    const diffs = diffsFromArgs(t.name, t.args || "");
    if (diffs.length) {
      return (
        <div className="card-body" style={{ padding: 0, background: "none", maxHeight: "none" }}>
          {diffs.map((d, i) => (
            <DiffView key={i} original={d.original} modified={d.modified} language={d.lang} />
          ))}
        </div>
      );
    }
  }
  if (t.name === "read_file" && item.outputText) {
    const lang = detectLang(t.args || "");
    return (
      <div className="card-body" style={{ padding: 0, background: "none", maxHeight: "none" }}>
        <ReadFileView text={item.outputText} language={lang} />
      </div>
    );
  }
  return <div className="card-body">{item.outputText}</div>;
}

function diffsFromArgs(name: string, args: string): { original: string; modified: string; lang: string }[] {
  try {
    const a = JSON.parse(args);
    const lang = detectLang(args);
    if (name === "write_file" && a.content != null) {
      return [{ original: "", modified: a.content, lang }];
    }
    if (name === "edit_file" && a.old_string != null && a.new_string != null) {
      return [{ original: a.old_string, modified: a.new_string, lang }];
    }
    if (name === "multi_edit" && Array.isArray(a.edits)) {
      return a.edits.map((e: any) => ({
        original: e.old_string || "",
        modified: e.new_string || "",
        lang,
      }));
    }
  } catch {}
  return [];
}

function trunc(s: string, n: number): string {
  return s.length > n ? s.slice(0, n) + "…" : s;
}

const EXT_LANG: Record<string, string> = {
  js: "javascript", ts: "typescript", jsx: "javascript", tsx: "typescript",
  py: "python", rb: "ruby", go: "go", rs: "rust", sh: "bash", bash: "bash",
  json: "json", yaml: "yaml", yml: "yaml", md: "markdown",
  html: "html", css: "css", scss: "css", sql: "sql",
  xml: "xml", c: "c", cpp: "cpp", h: "c", java: "java",
};

function detectLang(args: string): string {
  try {
    const parsed = JSON.parse(args);
    const path = parsed.file_path || parsed.path || "";
    const ext = path.split(".").pop()?.toLowerCase() || "";
    return EXT_LANG[ext] || ext || "";
  } catch { return ""; }
}
