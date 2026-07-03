/**
 * HljsDiff.tsx — Syntax-highlighted LCS line diff using highlight.js.
 * Matches desktop/frontend/src/components/editors/HljsDiff.tsx.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { DiffProps } from "../DiffView";
import { diffLines, diffRowsFromUnifiedDiff } from "../../lib/diff";
import type { DiffRow } from "../../lib/diff";
import { highlightToHtml } from "../../lib/highlight";

const SIGN: Record<string, string> = { ctx: " ", add: "+", del: "-" };

function lineNo(n?: number): string {
  return typeof n === "number" ? String(n) : "";
}

export default function HljsDiff({ original = "", modified = "", diff = "", language, maxHeight }: DiffProps) {
  const rows = useMemo(
    () => diff ? diffRowsFromUnifiedDiff(diff) : diffLines(original, modified),
    [original, modified, diff],
  );
  const scrollRef = useRef<HTMLDivElement>(null);
  const [highlighted, setHighlighted] = useState<string[]>([]);

  // Highlight all rows asynchronously
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const htmls = await Promise.all(rows.map(r => highlightToHtml(r.text, language)));
      if (!cancelled) setHighlighted(htmls);
    })();
    return () => { cancelled = true; };
  }, [rows, language]);

  const isVirtual = rows.length > 200;

  const virtualizer = isVirtual ? useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 24,
    overscan: 10,
  }) : null;

  const renderRow = (r: DiffRow, idx: number, html?: string) => (
    <div key={idx} className={"diff__row diff__row--" + r.type}>
      <span className="diff__gutter">
        <span className="diff__line diff__line--old">{lineNo(r.oldLine)}</span>
        <span className="diff__line diff__line--new">{lineNo(r.newLine)}</span>
        <span className="diff__sign">{SIGN[r.type]}</span>
      </span>
      {html ? (
        <code className="diff__text" dangerouslySetInnerHTML={{ __html: html }} />
      ) : (
        <code className="diff__text">{r.text}</code>
      )}
    </div>
  );

  return (
    <div
      ref={scrollRef}
      className="diff hljs"
      style={{
        maxHeight: maxHeight || undefined,
        overflow: (maxHeight || isVirtual) ? "auto" : undefined,
        position: (maxHeight || isVirtual) ? "relative" : undefined,
      }}
    >
      {isVirtual && virtualizer ? (
        <div
          className="diff__table"
          style={{
            height: virtualizer.getTotalSize(),
            width: "100%",
            position: "relative",
          }}
        >
          {virtualizer.getVirtualItems().map((row) => {
            const item = rows[row.index];
            if (!item) return null;
            return (
              <div
                key={row.key}
                data-index={row.index}
                ref={virtualizer.measureElement}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  transform: "translateY(" + row.start + "px)",
                }}
              >
                {renderRow(item, row.index, highlighted[row.index])}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="diff__table">
          {rows.map((r, idx) => renderRow(r, idx, highlighted[idx]))}
        </div>
      )}
    </div>
  );
}
