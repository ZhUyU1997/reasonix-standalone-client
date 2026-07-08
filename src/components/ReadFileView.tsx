/**
 * ReadFileView.tsx — renders read_file tool output in diff-like style
 * with line-number gutter and syntax highlighting.
 *
 * Line numbers (from the "109→" prefix in tool output) are parsed out
 * and shown in a gutter, separated from the code body.
 */
import { memo, useEffect, useMemo, useState } from "react";
import { highlightToHtml } from "../lib/highlight";

interface Props {
  text: string;
  language: string;
}

export const ReadFileView = memo(function ReadFileView({ text, language }: Props) {
  // Parse each line into { lineNo, body } — split on the first "→"
  const parsed = useMemo(() => {
    const lines = text.split("\n");
    return lines.map(l => {
      const idx = l.indexOf("→");
      if (idx > 0) return { lineNo: l.slice(0, idx).trim(), body: l.slice(idx + 1) };
      return { lineNo: "", body: l };
    });
  }, [text]);

  const [highlighted, setHighlighted] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const htmls = await Promise.all(parsed.map(p => highlightToHtml(p.body, language)));
      if (!cancelled) setHighlighted(htmls);
    })();
    return () => { cancelled = true; };
  }, [text, language]);

  return (
    <div className="diff hljs" style={{ maxHeight: 400 }}>
      <div className="diff__table">
        {parsed.map((p, i) => (
          <div key={i} className="diff__row diff__row--ctx">
            {p.lineNo && (
              <span className="diff__gutter" style={{ gridTemplateColumns: "5ch", padding: "0 8px 0 12px" }}>
                <span className="diff__line diff__line--old" style={{ textAlign: "right", width: "5ch" }}>{p.lineNo}</span>
              </span>
            )}
            {highlighted[i] ? (
              <code className="diff__text" dangerouslySetInnerHTML={{ __html: highlighted[i] }} />
            ) : (
              <code className="diff__text" style={{ whiteSpace: "pre" }}>{p.body || " "}</code>
            )}
          </div>
        ))}
      </div>
    </div>
  );
});
