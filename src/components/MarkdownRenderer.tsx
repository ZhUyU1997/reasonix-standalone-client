/**
 * MarkdownRenderer.tsx — Markdown rendering via react-markdown + remark-gfm.
 *
 * Mirrors desktop/frontend/src/components/MarkdownRenderer.tsx.
 * Fenced code blocks render through CodeViewer (lazy-loaded hljs seam).
 */

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { memo } from "react";
import type { Components } from "react-markdown";
import { CodeViewer } from "./CodeViewer";

// ── Markdown component ──

interface Props {
  text: string;
}

export const MarkdownRenderer = memo(function MarkdownRenderer({ text }: Props) {
  const components: Partial<Components> = {
    // Strip the <pre> wrapper react-markdown adds around fenced code blocks —
    // CodeViewer renders its own <pre class="code hljs">.
    pre: ({ children }) => <>{children}</>,
    code: ({ className, children, ...props }) => {
      const text = String(children ?? "");
      const match = /language-([\w-]+)/.exec(className ?? "");
      const isBlock = match !== null || text.includes("\n");
      if (isBlock) {
        const lang = match?.[1] || "";
        return (
          <CodeViewer
            value={text.replace(/\n$/, "")}
            language={lang || undefined}
            maxHeight={360}
          />
        );
      }
      return <code className="md-code">{text}</code>;
    },
    a: ({ href, children }) => (
      <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>
    ),
  };

  return (
    <div className="md-body">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {text}
      </ReactMarkdown>
    </div>
  );
});
