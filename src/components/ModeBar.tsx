/**
 * ModeBar.tsx — mode selection buttons (Auto / Plan / Yolo / Goal) + goal chip bar.
 */
import { useEffect, useState } from "react";
import { __ } from "../lib/i18n";
import { app } from "../lib/bridge";

interface ModeBarProps {
  onModeChange?: () => void;
}

interface StatusSnapshot {
  running: boolean;
  plan: boolean;
  toolApprovalMode: string;
  goalMode: boolean;
  goalActive: boolean;
  goalText: string;
}

export function ModeBar({ onModeChange }: ModeBarProps) {
  const [s, setS] = useState<StatusSnapshot>({
    running: false, plan: false, toolApprovalMode: "ask",
    goalMode: false, goalActive: false, goalText: "",
  });
  const [localGoalMode, setLocalGoalMode] = useState(false);

  const refresh = async () => {
    try {
      const res = await fetch("/status");
      if (!res.ok) return;
      const d = await res.json() as any;
      setS({
        running: d.running,
        plan: d.plan,
        toolApprovalMode: d.toolApprovalMode || (d.autoApproveTools ?? d.bypass ? "yolo" : "ask"),
        goalMode: localGoalMode,
        goalActive: !!(d.goal && (d.goalStatus || "") === "running"),
        goalText: (d.goal || "").trim(),
      });
    } catch {}
  };

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 30000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => { refresh(); }, [localGoalMode]);

  const isAuto = s.toolApprovalMode === "auto" && !s.plan;
  const isPlan = s.plan;
  const isYolo = s.toolApprovalMode === "yolo";
  const isGoal = localGoalMode || s.goalActive;

  const handleAuto = async () => {
    if (s.plan) await app.SetPlanMode(false);
    // toggle: auto → ask, ask/other → auto
    const next = isAuto ? "ask" : "auto";
    await app.SetToolApprovalMode(next);
    if (localGoalMode) setLocalGoalMode(false);
    onModeChange?.();
    refresh();
  };

  const handlePlan = async () => {
    await app.SetPlanMode(!s.plan);
    if (localGoalMode) setLocalGoalMode(false);
    onModeChange?.();
    refresh();
  };

  const handleYolo = async () => {
    const next = isYolo ? "ask" : "yolo";
    await app.SetToolApprovalMode(next);
    if (localGoalMode) setLocalGoalMode(false);
    onModeChange?.();
    refresh();
  };

  const handleGoal = () => {
    if (s.goalActive) {
      app.ClearGoal().then(() => refresh());
      return;
    }
    setLocalGoalMode(!localGoalMode);
  };

  return (
    <>
      <button
        className={"toolbar__btn" + (isAuto ? " toolbar__btn--ok" : "")}
        id="btn-auto" title={__("auto_mode")}
        onClick={handleAuto}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10"/><path d="M8 12l2 2 4-4"/>
        </svg>
        {__("auto")}
      </button>
      <button
        className={"toolbar__btn" + (isPlan ? " toolbar__btn--active" : "")}
        id="btn-plan" title={__("plan_mode")}
        onClick={handlePlan}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
        </svg>
        {__("plan")}
      </button>
      <button
        className={"toolbar__btn" + (isYolo ? " toolbar__btn--danger" : "")}
        id="btn-bypass" title={__("yolo_mode")}
        onClick={handleYolo}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
        </svg>
        {__("yolo")}
      </button>
      <button
        className={"toolbar__btn" + (isGoal ? (s.goalActive ? " toolbar__btn--goal-active" : " toolbar__btn--goal") : "")}
        id="btn-goal" title={__("goal_mode_desc")}
        onClick={handleGoal}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/>
          <line x1="12" y1="2" x2="12" y2="4"/><line x1="12" y1="20" x2="12" y2="22"/>
          <line x1="2" y1="12" x2="4" y2="12"/><line x1="20" y1="12" x2="22" y2="12"/>
        </svg>
        {__("goal_btn")}
      </button>
      {/* goal chip bar - rendered below the toolbar line */}
      {s.goalActive && s.goalText && (
        <div id="goal-active-bar" style={{ marginBottom: "6px" }}>
          <span className="goal-chip" id="goal-chip" title={__("goal_exit")}>
            <svg className="goal-chip__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/>
            </svg>
            <span className="goal-chip__text" id="goal-chip-text">{s.goalText}</span>
            <span className="goal-chip__close">&times;</span>
          </span>
        </div>
      )}
    </>
  );
}
