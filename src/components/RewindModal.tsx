/**
 * RewindModal.tsx — Modal for selecting a checkpoint and rewind scope.
 * Replaces the vanilla-DOM openRewindPicker / renderRewindPicker / setupRewindKeyboardNav.
 */

import { useEffect, useState, useCallback, useRef } from "react";
import { app } from "../lib/bridge";
import { __ } from "../lib/i18n";
import type { CheckpointMeta } from "../lib/types";

const SCOPES = [
  { key: "b", label: "scope_both", scope: "both" },
  { key: "c", label: "scope_conversation", scope: "conversation" },
  { key: "d", label: "scope_code", scope: "code" },
  { key: "f", label: "fork", scope: "fork" },
  { key: "s", label: "scope_sumfrom", scope: "sumfrom" },
  { key: "u", label: "scope_sumupto", scope: "sumupto" },
];

const RE_TRANSIENT_BLOCK = /^\s*<(?:response-language|reasoning-language|memory-update|background-jobs|active-goal|hook-context|capability-route)(?:\s+[^>]*)?>[\s\S]*?<\/(?:response-language|reasoning-language|memory-update|background-jobs|active-goal|hook-context|capability-route)>\s*\n?/;
function stripTransient(text: string): string {
  let s = text;
  let prev: string;
  do { prev = s; s = s.replace(RE_TRANSIENT_BLOCK, ""); } while (s !== prev);
  return s.trimStart();
}

interface Props {
  onClose: () => void;
}

export function RewindModal({ onClose }: Props) {
  const [checkpoints, setCheckpoints] = useState<CheckpointMeta[]>([]);
  const [stage, setStage] = useState(0); // 0 = pick turn, 1 = pick scope
  const [sel, setSel] = useState(0);
  const [scopeIdx, setScopeIdx] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    app.Checkpoints().then(cps => {
      if (!cps || cps.length === 0) {
        setCheckpoints([]);
      } else {
        setCheckpoints([...cps].reverse());
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const applyRewind = useCallback(() => {
    const cp = checkpoints[sel];
    if (!cp) return;
    const sc = SCOPES[scopeIdx];
    if (sc.scope === "fork") { app.Fork(cp.turn); }
    else if (sc.scope === "sumfrom") { app.SummarizeFrom(cp.turn); }
    else if (sc.scope === "sumupto") { app.SummarizeUpTo(cp.turn); }
    else { app.Rewind(cp.turn, sc.scope); }
    onClose();
  }, [checkpoints, sel, scopeIdx, onClose]);

  // keyboard nav
  useEffect(() => {
    const onkey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { onClose(); return; }
      if (e.key === "Enter") {
        e.preventDefault();
        if (stage === 0) {
          if (checkpoints.length) setStage(1);
        } else {
          applyRewind();
        }
        return;
      }
      const dir = (e.key === "ArrowDown" || e.key === "j") ? 1 : (e.key === "ArrowUp" || e.key === "k") ? -1 : 0;
      if (!dir) return;
      e.preventDefault();
      if (stage === 0) {
        setSel(i => Math.max(0, Math.min(checkpoints.length - 1, i + dir)));
      } else {
        setScopeIdx(i => Math.max(0, Math.min(SCOPES.length - 1, i + dir)));
      }
    };
    document.addEventListener("keydown", onkey);
    return () => document.removeEventListener("keydown", onkey);
  }, [stage, checkpoints.length, applyRewind, onClose]);

  // close on backdrop click
  const overlayRef = useRef<HTMLDivElement>(null);

  if (loading) return null;

  if (!checkpoints.length) {
    return (
      <div className="rewind-overlay" ref={overlayRef} onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}>
        <div className="rewind-picker">
          <div className="notice">{__("no_checkpoints")}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="rewind-overlay" ref={overlayRef} onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}>
      <div className="rewind-picker">
        {stage === 0 ? (
          <>
            <div className="rewind-picker__head">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>
              </svg>
              {" "}{__("rewind_title")}
            </div>
            <div className="rewind-picker__list">
              {checkpoints.map((cp, i) => (
                <div
                  key={cp.turn}
                  className={"rewind-picker__item" + (i === sel ? " rewind-picker__item--active" : "")}
                  onClick={() => { setSel(i); setStage(1); }}
                >
                  <span className="rewind-picker__turn">#{cp.turn}</span>
                  <span className="rewind-picker__prompt">{stripTransient(cp.prompt || "").slice(0, 80)}</span>
                  <span className="rewind-picker__files">{cp.files} {__("files")}</span>
                </div>
              ))}
            </div>
            <div className="rewind-picker__foot">
              <span>{__("nav_jk")}</span><span>{__("nav_enter_esc")}</span>
            </div>
          </>
        ) : (
          <>
            <div className="rewind-picker__head">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>
              </svg>
              {" "}{__("action_title", { turn: checkpoints[sel].turn })}
            </div>
            <div className="rewind-picker__scopes">
              {SCOPES.map((s, i) => (
                <div
                  key={s.key}
                  className={"rewind-picker__scope" + (i === scopeIdx ? " rewind-picker__scope--active" : "")}
                  onClick={() => { setScopeIdx(i); applyRewind(); }}
                >
                  <span className="rewind-picker__scope-key">{s.key}</span>
                  {__(s.label)}
                </div>
              ))}
            </div>
            <div className="rewind-picker__foot">
              <span>{__("nav_keys")}</span><span>{__("nav_apply_esc")}</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
