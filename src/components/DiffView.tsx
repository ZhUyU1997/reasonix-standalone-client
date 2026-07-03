/**
 * DiffView.tsx — Lazy-loading seam for before/after diff views.
 *
 * Matches desktop/frontend/src/components/DiffView.tsx.
 * Swap the lazy import to upgrade the diff editor (Monaco, CodeMirror merge).
 */

import { lazy, Suspense } from "react";

export interface DiffProps {
  original?: string;
  modified?: string;
  diff?: string;
  language?: string;
  maxHeight?: number;
}

const Impl = lazy(() => import("./editors/HljsDiff"));

export function DiffView(props: DiffProps) {
  return (
    <Suspense fallback={<pre className="code code--loading">{props.modified ?? props.diff ?? ""}</pre>}>
      <Impl {...props} />
    </Suspense>
  );
}
