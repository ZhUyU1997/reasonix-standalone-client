/**
 * HljsCode.tsx — Syntax-highlighted code block via highlight.js.
 * Matches desktop/frontend/src/components/editors/HljsCode.tsx.
 */

import { useEffect, useState, memo } from "react";
import type { CodeViewerProps } from "../CodeViewer";
import { CopyButton } from "../CopyButton";
import { highlightToHtml } from "../../lib/highlight";

export default memo(function HljsCode({ value, language }: CodeViewerProps) {
  const [html, setHtml] = useState("");

  useEffect(() => {
    if (!language) { setHtml(""); return; }
    let cancelled = false;
    highlightToHtml(value, language).then(h => { if (!cancelled) setHtml(h); });
    return () => { cancelled = true; };
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
});
