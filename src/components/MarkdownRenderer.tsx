/**
 * MarkdownRenderer.tsx — Markdown rendering via react-markdown + remark-gfm.
 *
 * Mirrors desktop/frontend/src/components/MarkdownRenderer.tsx.
 * Fenced code blocks render through CodeViewer (lazy-loaded hljs seam).
 */

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { lazy, memo, Suspense, useMemo } from "react";
import type { Components } from "react-markdown";
import { CodeViewer } from "./CodeViewer";

const MermaidDiagram = lazy(() => import("./MermaidDiagram"));

// ── Markdown component ──

interface Props {
  text: string;
}

export const MarkdownRenderer = memo(function MarkdownRenderer({ text }: Props) {
  const components = useMemo(() => ({
    // Strip the <pre> wrapper react-markdown adds around fenced code blocks —
    // CodeViewer renders its own <pre class="code hljs">.
    pre: ({ children }: any) => <>{children}</>,
    code: ({ className, children, ...props }: any) => {
      const text = String(children ?? "");
      const match = /language-([\w-]+)/.exec(className ?? "");
      const lang = match?.[1] || "";
      const isBlock = match !== null || text.includes("\n");
      if (isBlock) {
        const value = text.replace(/\n$/, "");
        if (lang === "mermaid") {
          return (
            <Suspense fallback={<CodeViewer value={value} language="mermaid" maxHeight={360} />}>
              <MermaidDiagram definition={value} />
            </Suspense>
          );
        }
        return (
          <CodeViewer
            value={value}
            language={lang || undefined}
            maxHeight={360}
          />
        );
      }
      return <code className="md-code">{text}</code>;
    },
    a: ({ href, children }: any) => (
      <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>
    ),
  }), []);

  return (
    <div className="md-body">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {text}
      </ReactMarkdown>
    </div>
  );
});
