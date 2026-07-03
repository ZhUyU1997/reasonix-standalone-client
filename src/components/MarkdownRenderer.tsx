/**
 * MarkdownRenderer.tsx — Markdown rendering via react-markdown + remark-gfm.
 *
 * Mirrors desktop/frontend/src/components/MarkdownRenderer.tsx.
 * Fenced code blocks render through CodeViewer (lazy-loaded hljs seam).
 */

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";
import { CodeViewer } from "./CodeViewer";

// ── Markdown component ──

interface Props {
  text: string;
}

export function MarkdownRenderer({ text }: Props) {
  const components: Partial<Components> = {
    code: ({ className, children, ...props }) => {
      const isInline = !className;
      if (isInline) {
        return <code className="md-code">{String(children)}</code>;
      }
      const lang = (className || "").replace("language-", "");
      return (
        <CodeViewer
          value={String(children).replace(/\n$/, "")}
          language={lang || undefined}
        />
      );
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
}
