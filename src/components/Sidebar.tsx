/**
 * Sidebar.tsx — sidebar with nav buttons, session list, and status metrics.
 * Self-contained: polls /sessions and /status internally.
 */
import { useEffect, useState, useCallback } from "react";
import { __ } from "../lib/i18n";
import { post, getJSON } from "../lib/api";
import { escHtml, escAttr, fmtTok, fmtMoney } from "../lib/ui";

interface SessionMeta {
  name: string;
  path: string;
  current: boolean;
  title?: string;
  turns?: number;
}

interface StatusSnapshot {
  label: string;
  used: number;
  window: number;
  cacheHit: number;
  cacheMiss: number;
  lastUsage?: { cost?: number; totalCost?: number; currency?: string };
  balance?: { display: string };
  plan: boolean;
  toolApprovalMode: string;
  goal?: string;
  goalStatus?: string;
}

interface SidebarProps {
  running: boolean;
}

export function Sidebar({ running }: SidebarProps) {
  const [sessions, setSessions] = useState<SessionMeta[]>([]);
  const [status, setStatus] = useState<StatusSnapshot | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  // stats modal
  const [showStats, setShowStats] = useState(false);
  const [connState, setConnState] = useState("connected");
  const [statsData, setStatsData] = useState({ model: "-", count: 0, tokens: 0, cost: 0, currency: "", cacheHit: 0, cacheMiss: 0, used: 0, window: 0, balance: "-" });

  // ── fetch sessions ──
  const fetchSessions = useCallback(async () => {
    try {
      const ss = await getJSON<SessionMeta[]>("/sessions");
      setSessions(ss || []);
    } catch {}
  }, []);

  // ── fetch status ──
  const fetchStatus = useCallback(async () => {
    try {
      const s = await getJSON<StatusSnapshot>("/status");
      setStatus(s);
    } catch {}
  }, []);

  useEffect(() => {
    fetchSessions();
    fetchStatus();
    const si = setInterval(fetchSessions, 30000);
    const ti = setInterval(fetchStatus, 30000);
    return () => { clearInterval(si); clearInterval(ti); };
  }, [fetchSessions, fetchStatus]);

  // listen for refresh events from other components (new session, submit, etc.)
  useEffect(() => {
    const onRefresh = () => { fetchSessions(); fetchStatus(); };
    window.addEventListener("__refresh-sidebar", onRefresh);
    return () => window.removeEventListener("__refresh-sidebar", onRefresh);
  }, [fetchSessions, fetchStatus]);

  // listen for connection state changes from main.ts
  useEffect(() => {
    const handler = (e: Event) => setConnState((e as CustomEvent).detail || "");
    window.addEventListener("__conn-state", handler);
    return () => window.removeEventListener("__conn-state", handler);
  }, []);

  // sync sidebar--open class on the mount point (used for mobile transform)
  useEffect(() => {
    const el = document.getElementById("sidebar");
    if (el) el.classList.toggle("sidebar--open", isOpen);
  }, [isOpen]);

  // ── nav handlers ──
  const handleNew = () => {
    if (running) return;
    post("/new").then(() => {
      window.dispatchEvent(new CustomEvent("__new-session"));
      fetchSessions();
    });
  };

  const handleCompact = () => { if (!running) post("/compact"); };
  const handleRewind = () => { window.dispatchEvent(new CustomEvent("__open-rewind")); };
  const handleTree = () => { post("/submit", { input: "/tree" }); };
  const handleStats = async () => {
    try {
      const s = await getJSON<any>('/status');
      const cum: any = (window as any).__cumulativeStats?.() || {};
      setStatsData({
        model: s.label || '-',
        count: sessions.length,
        tokens: cum.tokens || s.used || 0,
        cost: cum.cost || s.lastUsage?.cost || 0,
        currency: s.lastUsage?.currency || '',
        cacheHit: cum.cacheHit || s.cacheHit || 0,
        cacheMiss: cum.cacheMiss || s.cacheMiss || 0,
        used: s.used || 0,
        window: s.window || 0,
        balance: s.balance?.display || '-',
      });
    } catch { /* ignore */ }
    setShowStats(true);
  };

  const handleResume = (s: SessionMeta) => {
    if (running || s.current) return;
    post("/resume", { path: s.path }).then(() => {
      window.dispatchEvent(new CustomEvent("__new-session"));
      fetchSessions();
    });
  };

  const handleDelete = (e: React.MouseEvent, name: string) => {
    e.stopPropagation();
    if (confirm(__("delete_confirm"))) {
      post("/delete-session", { name }).then(() => fetchSessions());
    }
  };

  // ── render helpers ──
  const s = status;
  const ctxPct = s?.window ? Math.min(100, Math.round((s.used || 0) / s.window * 100)) : 0;
  const ctxColor = ctxPct > 95 ? "var(--danger)" : ctxPct > 85 ? "var(--warning)" : "var(--accent)";
  const cacheTotal = (s?.cacheHit || 0) + (s?.cacheMiss || 0);
  const cachePct = cacheTotal > 0 ? Math.round((s?.cacheHit || 0) / cacheTotal * 100) + "%" : "—";
  const lastCost = s?.lastUsage?.cost ?? s?.lastUsage?.totalCost;
  const costStr = typeof lastCost === "number" ? fmtMoney(lastCost, s?.lastUsage?.currency) : "—";
  const balanceStr = s?.balance?.display || "—";
  const modelLabel = s?.label || "-";
  const isRunning = running;
  const connColors: Record<string, string> = { connected: "var(--success)", reconnecting: "var(--warning)", disconnected: "var(--danger)" };
  const isBusy = isRunning || connState === "reconnecting";

  const toggleMenu = () => setIsOpen(!isOpen);

  return (
    <>
      {/* mobile menu button */}
      <button className="menu-btn" id="menu-btn" aria-label="Toggle sidebar" onClick={toggleMenu}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
        </svg>
      </button>

      {/* mobile overlay */}
      {isOpen && <div className="sidebar-overlay" id="sidebar-overlay" onClick={toggleMenu}></div>}

      <div className="sidebar__brand">
          <div className="sidebar__logo">R</div>
          <span className="sidebar__name">Reasonix</span>
        </div>

        <nav className="sidebar__nav" style={{ borderTop: "none", paddingTop: 0 }}>
          <div
            className={"sidebar__item" + (running ? "" : " sidebar__item--accent")}
            id="btn-new"
            onClick={handleNew}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
            <span>{__("new_session")}</span>
          </div>
          <div className="sidebar__item" id="btn-compact" onClick={handleCompact}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/><line x1="14" y1="10" x2="21" y2="3"/><line x1="3" y1="21" x2="10" y2="14"/></svg>
            <span>{__("compact")}</span>
          </div>
          <div className="sidebar__item" id="btn-rewind" onClick={handleRewind}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
            <span>{__("rewind")}</span>
          </div>
          <div className="sidebar__item" id="btn-tree" onClick={handleTree}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="6" y1="3" x2="6" y2="15"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M18 9a9 9 0 0 1-9 9"/></svg>
            <span>{__("branches")}</span>
          </div>
          <div className="sidebar__sep"></div>
          <div className="sidebar__item" id="btn-stats" onClick={handleStats}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/></svg>
            <span>{__("stats")}</span>
          </div>
        </nav>

        <div className="sidebar__label" style={{ padding: "8px 10px 4px" }}>{__("sessions")}</div>
        <div className="session-list">
          {sessions.length === 0 ? (
            <div style={{ padding: "10px", color: "var(--muted-2)", fontSize: "12px" }}>{__("no_sessions")}</div>
          ) : sessions.map(s => {
            const name = (s.name || "").replace(/^.*\//, "").replace(/\.jsonl$/, "");
            const title = s.title || name.replace(/^\w+-/, "").replace(/T/, " ").replace(/[-_]/g, " ").slice(0, 30);
            const meta = s.turns ? s.turns + " turns" : "";
            return (
              <div
                key={s.name}
                className={"session-item" + (s.current ? " session-item--active" : "")}
                onClick={() => handleResume(s)}
              >
                <svg className="session-item__icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                <div className="session-item__body">
                  <div className="session-item__title">{escHtml(title)}</div>
                  <div className="session-item__meta">{escHtml(meta)}</div>
                </div>
                <button type="button" className="session-del" data-name={s.name} title={__("delete_confirm")} onClick={(e) => handleDelete(e, s.name)}>&times;</button>
              </div>
            );
          })}
        </div>

        <div className="sidebar__section">
          <div className="sidebar__label">{__("status")}</div>
          <div className="sidebar__ctx">
            <div className="ctx-bar">
              <div className="ctx-bar__fill" style={{ width: ctxPct + "%", background: ctxColor }}></div>
            </div>
            <div className="ctx-label">
              <span>{fmtTok(s?.used || 0)} tok</span>
              <span>{fmtTok(s?.window || 0)} tok</span>
            </div>
          </div>
          <div className="status-metrics">
            <div className="sm-item"><span className="sm-val">{cachePct}</span><span>{__("cache")}</span></div>
            <div className="sm-item"><span className="sm-val">{costStr}</span><span>{__("cost")}</span></div>
            <div className="sm-item"><span className={"sm-val" + (balanceStr !== "—" ? " acc" : "")}>{balanceStr}</span><span>{__("balance")}</span></div>
          </div>
          <div style={{ padding: "4px 10px" }}>
            <div className="status">
              <span className={"status__dot" + (isBusy ? " status__dot--busy" : "")} style={{ background: connColors[connState] || "" }}></span>
              <span>{modelLabel}</span>
            </div>
          </div>
        </div>
      {/* stats modal */}
      {showStats && (
        <div className="modal-overlay" id="stats-modal" style={{ display: "flex" }} onClick={() => setShowStats(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal__head">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/></svg>
              {__("statistics")}
              <span className="modal__close" id="stats-modal-close" onClick={() => setShowStats(false)}>&times;</span>
            </div>
            <div className="modal__body">
              <div className="stat-grid">
                <div className="stat-card">
                  <div className="stat-card__label">{__("model")}</div>
                  <div className="stat-card__value">{statsData.model}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-card__label">{__("sessions")}</div>
                  <div className="stat-card__value">{statsData.count}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-card__label">{__("total_tokens")}</div>
                  <div className="stat-card__value acc">{statsData.tokens >= 1000 ? fmtTok(statsData.tokens) : String(statsData.tokens)}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-card__label">{__("cache_hit_rate")}</div>
                  <div className="stat-card__value ok">{statsData.cacheHit + statsData.cacheMiss > 0 ? Math.round(statsData.cacheHit / Math.max(1, statsData.cacheHit + statsData.cacheMiss) * 100) + "%" : "0%"}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-card__label">{__("total_cost")}</div>
                  <div className="stat-card__value">{statsData.cost > 0 ? fmtMoney(statsData.cost, statsData.currency) : "-"}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-card__label">{__("balance")}</div>
                  <div className="stat-card__value">{statsData.balance}</div>
                </div>
                <div className="stat-card stat-card--wide">
                  <div className="stat-card__label">{__("context_usage")}</div>
                  <div className="ctx-bar" style={{ marginTop: "8px" }}>
                    <div className="ctx-bar__fill" style={{ width: Math.min(100, statsData.window > 0 ? Math.round(statsData.used / statsData.window * 100) : 0) + "%" }}></div>
                  </div>
                  <div className="ctx-label" style={{ marginTop: "4px" }}>
                    <span>{fmtTok(statsData.used)} tok</span>
                    <span>{fmtTok(statsData.window)} tok</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
