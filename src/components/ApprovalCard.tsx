/**
 * ApprovalCard.tsx — renders an approval request card.
 */
import { useEffect } from "react";
import { __ } from "../lib/i18n";
import { app } from "../lib/bridge";
import type { WireApproval } from "../lib/types";
import { bashCommandPrefix, approvalSessionRule, approvalPersistentRule } from "../lib/ui";

interface Props {
  approval: WireApproval;
  onDone: () => void;
}

export function ApprovalCard({ approval, onDone }: Props) {
  const a = approval;
  const prefix = a.tool === "bash" ? bashCommandPrefix(a.subject) : "";
  const hasPrefix = prefix !== "";
  const prefixRule = "Bash(" + prefix + ")";

  const resolve = (payload: { allow: boolean; session?: boolean; persist?: boolean; scope?: string }) => {
    app.Approve(a.id, payload.allow, payload.session ?? false, payload.persist ?? false, payload.scope);
    onDone();
  };

  useEffect(() => {
    const onkey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      const stop = () => { e.preventDefault(); e.stopPropagation(); resolve({ allow: false, session: false }); };
      if (k === "y" || k === "1") { e.preventDefault(); e.stopPropagation(); resolve({ allow: true, session: false }); }
      else if (k === "a" || k === "2") { e.preventDefault(); e.stopPropagation(); resolve({ allow: true, session: true }); }
      else if (hasPrefix && k === "3") { e.preventDefault(); e.stopPropagation(); resolve({ allow: true, session: true, scope: "prefix" }); }
      else if (k === "p" || (!hasPrefix && k === "3") || (hasPrefix && k === "4")) { e.preventDefault(); e.stopPropagation(); resolve({ allow: true, session: true, persist: true, scope: hasPrefix ? "prefix" : "" }); }
      else if (k === "n" || k === "escape" || (!hasPrefix && k === "4") || (hasPrefix && k === "5")) { stop(); }
    };
    document.addEventListener("keydown", onkey);
    return () => document.removeEventListener("keydown", onkey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="approval" style={{ margin: "8px 0" }}>
      <div className="approval__header">
        <svg className="approval__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
          <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
        <span className="approval__title">{__("approval_title")}</span>
      </div>
      <div className="approval__subject">{a.tool}{a.subject ? " — " + a.subject : ""}</div>
      <div className="approval__actions">
        <button className="approval__btn approval__btn--allow" onClick={() => resolve({ allow: true, session: false })}>
          <span className="approval__key">Y</span> {__("allow")}
        </button>
        {hasPrefix ? (
          <>
            <button className="approval__btn approval__btn--allow" onClick={() => resolve({ allow: true, session: true, scope: "prefix" })}>
              <span className="approval__key">A</span> {__("session")} {prefixRule}
            </button>
            <button className="approval__btn approval__btn--allow" onClick={() => resolve({ allow: true, session: true, persist: true, scope: "prefix" })}>
              <span className="approval__key">P</span> {__("persist_tool")} {prefixRule}
            </button>
          </>
        ) : (
          <>
            <button className="approval__btn approval__btn--allow" onClick={() => resolve({ allow: true, session: true })}>
              <span className="approval__key">A</span> {__("session")} {approvalSessionRule(a)}
            </button>
            <button className="approval__btn approval__btn--allow" onClick={() => resolve({ allow: true, session: true, persist: true })}>
              <span className="approval__key">P</span> {__("persist_tool")} {approvalPersistentRule(a)}
            </button>
          </>
        )}
        <button className="approval__btn approval__btn--deny" onClick={() => resolve({ allow: false, session: false })}>
          <span className="approval__key">N</span> {__("deny")}
        </button>
      </div>
    </div>
  );
}
