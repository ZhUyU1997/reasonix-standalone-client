/**
 * MarkdownRenderer.tsx — Markdown rendering via react-markdown + remark-gfm.
 *
 * Mirrors desktop/frontend/src/components/MarkdownRenderer.tsx.
 * Renders fenced code blocks with highlight.js syntax highlighting
 * and inline code with styled <code> spans.
 */

import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";

// ── Syntax highlighting via highlight.js ──

async function highlight(code: string, lang: string): Promise<string> {
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

const LANG_MAP: Record<string, string> = {
  js: "javascript", ts: "typescript", py: "python", rb: "ruby",
  go: "go", rs: "rust", sh: "bash", bash: "bash", zsh: "bash",
  json: "json", yaml: "yaml", yml: "yaml", md: "markdown",
  html: "html", css: "css", sql: "sql", xml: "xml",
};

// ── Code block component (async highlighting) ──

function CodeBlock({ code, lang }: { code: string; lang: string }) {
  const [html, setHtml] = useState("");

  useEffect(() => {
    highlight(code, lang).then(setHtml);
  }, [code, lang]);

  return (
    <div className="code-block">
      {lang && <span className="code-block__lang">{lang}</span>}
      {html ? (
        <pre><code dangerouslySetInnerHTML={{ __html: html }} /></pre>
      ) : (
        <pre><code>{code}</code></pre>
      )}
    </div>
  );
}

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
      return <CodeBlock code={String(children).replace(/\n$/, "")} lang={lang} />;
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
