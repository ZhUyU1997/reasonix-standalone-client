/**
 * App.tsx — Single React root for the standalone client.
 *
 * Calls useController() for state + actions, then passes everything
 * down as props to child components (matching desktop's approach).
 */

import { Sidebar } from "./components/Sidebar";
import { Transcript } from "./components/Transcript";
import { ModeBar } from "./components/ModeBar";
import { StatusBar } from "./components/StatusBar";
import { Composer } from "./components/Composer";
import { useController } from "./lib/useController";
import { fmtElapsed, fmtTok } from "./lib/ui";

export default function App() {
  const { state, submit, cancel, newSession, openRewind, dispatch } = useController();

  // turnText is recomputed on every render (controller's tick timer keeps it alive)
  const ms = state.running ? (Date.now() - state.turnStartAt) : 0;
  const turnText = state.running
    ? fmtElapsed(ms) + (state.turnTokens > 0 ? " · ↓ " + fmtTok(state.turnTokens) + " tok" : "")
    : "";

  return (
    <div className="app">
      <aside id="sidebar" className="sidebar" style={{ gridRow: "1/3" }}>
        <Sidebar
          running={state.running}
          connState={state.connState}
          onNewSession={newSession}
          onOpenRewind={openRewind}
        />
      </aside>

      <div id="transcript-root" className="transcript">
        <Transcript items={state.items} live={state.live} dispatch={dispatch} />
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
              running={state.running}
              connState={state.connState}
              goalActive={state.goalActive}
              turnText={turnText}
              balanceText={state.balanceText}
            />
          </div>
        </div>

        <div id="composer-root">
          <Composer
            running={state.running}
            onSend={submit}
            onStop={cancel}
            goalActive={false}
            goalText=""
          />
        </div>
      </footer>
    </div>
  );
}
