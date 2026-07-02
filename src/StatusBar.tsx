/**
 * StatusBar.tsx — presentational React component for the footer status bar.
 * Receives all state as props from main.ts (no internal polling).
 */
import { __ } from "./i18n";

interface StatusBarProps {
  running: boolean;
  connState: string;
  goalActive: boolean;
  turnText: string;
  balanceText: string;
}

const COLORS: Record<string, string> = { connected: "var(--success)", reconnecting: "var(--warning)", disconnected: "var(--danger)" };
const LABELS: Record<string, string> = { connected: __("connected"), reconnecting: __("reconnecting"), disconnected: __("disconnected") };

export function StatusBar({ running, connState, goalActive, turnText, balanceText }: StatusBarProps) {
  const isBusy = running || connState === "reconnecting";
  const dotClass = "status__dot" + (isBusy ? " status__dot--busy" : "");
  const statusLabel = running
    ? (goalActive ? __("goal_active") + " · " : "") + __("thinking")
    : connState === "connected" ? __("ready") : (LABELS[connState] || connState);
  const dotColor = COLORS[connState] || "";

  return (
    <>
      <div className="toolbar__sep"></div>
      <div className="status">
        <span className={dotClass} style={dotColor ? { background: dotColor } : undefined}></span>
        <span>{statusLabel}</span>
      </div>
      <div className="toolbar__spacer"></div>
      <div className="status">{turnText}</div>
      <div className="status">{balanceText}</div>
    </>
  );
}
