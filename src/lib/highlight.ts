/**
 * highlight.ts — Syntax highlighting utilities using highlight.js.
 * Matches desktop/frontend/src/lib/highlight.ts (simplified).
 * Uses module-level lazy init so the first call loads hljs synchronously.
 */

let _hljs: any = null;
let _loading: Promise<any> | null = null;

async function getHljs(): Promise<any> {
  if (_hljs) return _hljs;
  if (!_loading) _loading = import("highlight.js").then(m => { _hljs = m.default; return _hljs; });
  return _loading;
}

export async function highlightToHtml(code: string, lang?: string): Promise<string> {
  if (!lang) return escHtml(code);
  try {
    const hljs = await getHljs();
    const mapped = LANG_MAP[lang] || lang;
    if (hljs.getLanguage(mapped)) {
      return hljs.highlight(code, { language: mapped, ignoreIllegals: true }).value;
    }
    return escHtml(code);
  } catch { return escHtml(code); }
}

function escHtml(s: string): string {
  return s.replace(/[&<>]/g, (c) => c === "&" ? "&amp;" : c === "<" ? "&lt;" : "&gt;");
}

const LANG_MAP: Record<string, string> = {
  js: "javascript", ts: "typescript", py: "python", rb: "ruby",
  go: "go", rs: "rust", sh: "bash", bash: "bash", zsh: "bash",
  json: "json", yaml: "yaml", yml: "yaml", md: "markdown",
  html: "html", css: "css", sql: "sql", xml: "xml",
};
