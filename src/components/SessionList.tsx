/**
 * SessionList.tsx — session list in the sidebar. Fetches /sessions, renders items,
 * handles resume/delete. Exposes window.__reloadSessions for vanilla code to trigger refresh.
 */
import { useEffect, useState, useCallback } from "react";
import { __ } from "../lib/i18n";
import { app } from "../lib/bridge";
import type { SessionMeta } from "../lib/types";

interface SessionListProps {
  onResume?: () => void;
}

export function SessionList({ onResume }: SessionListProps) {
  const [sessions, setSessions] = useState<SessionMeta[]>([]);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setError(false);
    try {
      const ss = await app.ListSessions();
      if (!ss || ss.length === 0) {
        setSessions([]);
      } else {
        setSessions(ss);
        (window as any).__sessionCount = ss.length;
      }
    } catch {
      setError(true);
    }
  }, []);

  useEffect(() => {
    load();
    (window as any).__reloadSessions = load;
    return () => { delete (window as any).__reloadSessions; };
  }, [load]);

  const handleClick = (s: SessionMeta) => {
    if (s.current) return;
    app.ResumeSession(s.path).then(() => {
      const log = document.getElementById("log");
      const welcome = document.getElementById("welcome");
      if (log) {
        log.innerHTML = "";
        if (welcome) { log.appendChild(welcome); welcome.style.display = ""; }
      }
      load();
      setTimeout(() => {
        (window as any).__reloadHistory?.();
      }, 300);
    });
  };

  const handleDelete = (e: React.MouseEvent, name: string) => {
    e.stopPropagation();
    if (confirm(__("delete_confirm"))) {
      app.DeleteSession(name).then(() => load());
    }
  };

  const escName = (n: string) => n.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const escAttr = (n: string) => n.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

  if (error) {
    return <div style={{ padding: "10px", color: "var(--muted-2)", fontSize: "12px" }}>{__("error_loading")}</div>;
  }

  if (sessions.length === 0) {
    return <div style={{ padding: "10px", color: "var(--muted-2)", fontSize: "12px" }}>{__("no_sessions")}</div>;
  }

  return (
    <>
      {sessions.map(s => {
        const name = (s.name || "").replace(/^.*\//, "").replace(/\.jsonl$/, "");
        const title = s.title || name.replace(/^\w+-/, "").replace(/T/, " ").replace(/[-_]/g, " ").slice(0, 30);
        const meta = s.turns ? s.turns + " turns" : "";
        return (
          <div
            key={s.name}
            className={"session-item" + (s.current ? " session-item--active" : "")}
            onClick={() => handleClick(s)}
          >
            <svg className="session-item__icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            <div className="session-item__body">
              <div className="session-item__title">{escName(title)}</div>
              <div className="session-item__meta">{escName(meta)}</div>
            </div>
            <button
              type="button"
              className="session-del"
              data-name={s.name}
              title={escAttr(__("delete_confirm"))}
              onClick={(e) => handleDelete(e, s.name)}
            >&times;</button>
          </div>
        );
      })}
    </>
  );
}
