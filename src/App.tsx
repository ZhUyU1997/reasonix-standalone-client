/**
 * App.tsx — Single React root for the standalone client.
 *
 * Renders the same DOM structure as the original index.html mount points.
 * Subscribes to appState (published by main.tsx's SSE/polling callbacks)
 * and passes live state to child components.
 */

import { useEffect, useState, useCallback } from "react";
import { Sidebar } from "./components/Sidebar";
import { Transcript } from "./components/Transcript";
import { ModeBar } from "./components/ModeBar";
import { StatusBar } from "./components/StatusBar";
import { Composer } from "./components/Composer";
import { app } from "./lib/bridge";
import { getApp, subscribe, setApp } from "./lib/appState";
import { AppContextProvider } from "./lib/AppContext";
import { getDispatch } from "./components/Transcript";
import { openRewindPicker } from "./lib/ui";
import { __ } from "./lib/i18n";
import { fmtElapsed, fmtTok } from "./lib/ui";

export default function App() {
  const [s, setS] = useState(getApp());
  useEffect(() => subscribe(() => setS({ ...getApp() })), []);

  // Tick timer: re-render every 500ms when running so StatusBar's elapsed clock ticks
  useEffect(() => {
    if (!s.running) return;
    const t = setInterval(() => setS(prev => ({ ...prev })), 500);
    return () => clearInterval(t);
  }, [s.running]);

  const onNewSession = useCallback(() => {
    window.dispatchEvent(new CustomEvent("__new-session"));
  }, []);

  const onOpenRewind = useCallback(() => {
    openRewindPicker(__);
  }, []);

  const ctx = {
    running: s.running,
    connState: s.connState,
    dispatch: getDispatch(),
    onNewSession,
    onOpenRewind,
  };

  const ms = s.running ? (Date.now() - s.turnStartAt) : 0;
  const turnText = s.running
    ? fmtElapsed(ms) + (s.turnTokens > 0 ? " · ↓ " + fmtTok(s.turnTokens) + " tok" : "")
    : "";

  return (
    <AppContextProvider value={ctx}>
    <div className="app">
      <aside id="sidebar" className="sidebar" style={{ gridRow: "1/3" }}>
        <Sidebar />
      </aside>

      <div id="transcript-root" className="transcript">
        <Transcript />
      </div>

      <footer className="footer">
        {/*
         * Todo panel — rendered as static HTML so vanilla DOM helpers in ui.ts
         * (renderTodoPanel, parseTodos) can still find and manipulate it.
         */}
        <div id="todo-panel" className="todos">
          <div className="todos__head" id="todos-head">
            <span className="todos__title" id="todos-title">To-dos</span>
            <span className="todos__badge" id="todos-badge"></span>
            <span className="todos__summary" id="todos-summary"></span>
            <span className="todos__dismiss" id="todos-dismiss" title="Close" style={{ display: "none" }}>&times;</span>
            <span className="todos__chev">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </span>
          </div>
          <ul className="todos__list" id="todos-list"></ul>
        </div>

        <div className="toolbar">
          <div id="modebar-root" style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
            <ModeBar />
          </div>
          <div id="statusbar-root" style={{ display: "flex", flex: 1, alignItems: "center", gap: 5 }}>
            <StatusBar
              running={s.running}
              connState={s.connState}
              goalActive={s.goalActive}
              turnText={turnText}
              balanceText={s.balanceText}
            />
          </div>
        </div>

        <div id="composer-root">
          <Composer
            running={s.running}
            onSend={(text: string) => {
              app.Submit(text).then((r) => {
                if (r.ok && r.status === 204) {
                  window.dispatchEvent(new CustomEvent("__refresh-sidebar"));
                  app.Balance().then(st => {
                    setApp({
                      balanceText: st.balance ? "💰 " + (st.balance.display || "") : "",
                      goalActive: !!(st.goal && (st.goalStatus || "") === "running"),
                    });
                  }).catch(() => {});
                }
              });
            }}
            onStop={() => app.Cancel()}
            goalActive={false}
            goalText=""
          />
        </div>
      </footer>
    </div>
    </AppContextProvider>
  );
}

