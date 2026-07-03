/**
 * CodeViewer.tsx — Lazy-loading seam for syntax-highlighted code blocks.
 *
 * Every code view renders through this component. Swap the lazy import
 * to upgrade the editor (e.g. Monaco, CodeMirror).
 * Matches desktop/frontend/src/components/CodeViewer.tsx.
 */

import { lazy, Suspense } from "react";

export interface CodeViewerProps {
  value: string;
  language?: string;
  maxHeight?: number;
}

const Impl = lazy(() => import("./editors/HljsCode"));

export function CodeViewer(props: CodeViewerProps) {
  return (
    <div className="code-block">
      {props.language && <span className="code-block__lang">{props.language}</span>}
      <Suspense fallback={<pre className="code--loading"><code>{props.value}</code></pre>}>
        <Impl {...props} />
      </Suspense>
    </div>
  );
}
