/**
 * HljsCode.tsx — Syntax-highlighted code block via highlight.js.
 * Matches desktop/frontend/src/components/editors/HljsCode.tsx.
 */

import { useEffect, useState } from "react";
import type { CodeViewerProps } from "../CodeViewer";
import { CopyButton } from "../CopyButton";

const LANG_MAP: Record<string, string> = {
  js: "javascript", ts: "typescript", py: "python", rb: "ruby",
  go: "go", rs: "rust", sh: "bash", bash: "bash", zsh: "bash",
  json: "json", yaml: "yaml", yml: "yaml", md: "markdown",
  html: "html", css: "css", sql: "sql", xml: "xml",
};

async function highlightCode(code: string, lang: string): Promise<string> {
  if (!lang) return "";
  try {
    const hljs = await import("highlight.js");
    const mapped = LANG_MAP[lang] || lang;
    if (hljs.default.getLanguage(mapped)) {
      return hljs.default.highlight(code, { language: mapped }).value;
    }
    return "";
  } catch { return ""; }
}

export default function HljsCode({ value, language }: CodeViewerProps) {
  const [html, setHtml] = useState("");

  useEffect(() => {
    highlightCode(value, language || "").then(setHtml);
  }, [value, language]);

  return (
    <div className="code-block__wrap">
      <pre className="code hljs" data-lang={language || undefined}>
        {html ? (
          <code dangerouslySetInnerHTML={{ __html: html }} />
        ) : (
          <code>{value}</code>
        )}
      </pre>
      <CopyButton text={value} />
    </div>
  );
}
