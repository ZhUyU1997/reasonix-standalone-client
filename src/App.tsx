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
import { TodoPanel } from "./components/TodoPanel";
import { RewindModal } from "./components/RewindModal";
import { useLayoutStore } from "./lib/store/layout";
import { app } from "./lib/bridge";
import { LocaleProvider } from "./lib/i18n";
import { useController } from "./lib/useController";
import { fmtElapsed, fmtTok } from "./lib/ui";

export default function App() {
  const { state, submit, cancel, newSession, openRewind, dispatch, dismissTodos, rewindOpen, closeRewind } = useController();
  const sidebarOpen = useLayoutStore((s) => s.sidebarOpen);

  // turnText is recomputed on every render (controller's tick timer keeps it alive)
  const ms = state.running ? (Date.now() - state.turnStartAt) : 0;
  const turnText = state.running
    ? fmtElapsed(ms) + (state.turnTokens > 0 ? " · ↓ " + fmtTok(state.turnTokens) + " tok" : "")
    : "";

  return (
    <LocaleProvider>
    <>
    <div className="app">
      <aside id="sidebar" className={"sidebar" + (sidebarOpen ? " sidebar--open" : "")} style={{ gridRow: "1/3" }}>
        <Sidebar
          running={state.running}
          connState={state.connState}
          onNewSession={newSession}
          onOpenRewind={openRewind}
        />
      </aside>

      <Transcript items={state.items} live={state.live} dispatch={dispatch} model={state.model} cwd={state.cwd} />

      <footer className="footer">
        <TodoPanel todos={state.todos} onDismiss={dismissTodos} />

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
            onOpenRewind={openRewind}
            onShiftTab={() => app.Balance().then(s => app.SetToolApprovalMode(s.toolApprovalMode === "auto" ? "ask" : "auto"))}
            onCtrlY={() => app.SetToolApprovalMode("yolo")}
          />
        </div>
      </footer>
    </div>
    {rewindOpen && <RewindModal onClose={closeRewind} />}
    </>
    </LocaleProvider>
  );
}
