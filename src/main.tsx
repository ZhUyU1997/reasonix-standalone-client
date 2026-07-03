/**
 * main.tsx — Entry point for the standalone client.
 *
 * Very thin: mounts <App /> and wires a few vanilla-DOM side-effects
 * that don't belong in React (todo panel click, rewind keyboard nav).
 * All SSE / state / actions live in useController.ts.
 */

import { createRoot } from "react-dom/client";
import App from "./App";
import { setupRewindKeyboardNav, openRewindPicker, renderTodoPanel } from "./lib/ui";
import { __ } from "./lib/i18n";

// ── React mount ──
const rootEl = document.getElementById("root");
if (rootEl) createRoot(rootEl).render(<App />);

// ── Todo panel click (vanilla DOM, rendered by App.tsx) ──
// Kept as document-level delegation because the DOM is managed by React
let todosDismissed = false;
let todosState: any[] = [];
document.addEventListener("click", (e: Event) => {
  const head = (e.target as HTMLElement).closest("#todos-head") as HTMLElement | null;
  if (!head) return;
  if ((e.target as HTMLElement).closest(".todos__dismiss")) {
    todosDismissed = true;
    renderTodoPanel(todosState, todosDismissed);
    return;
  }
  const panel = document.getElementById("todo-panel") as HTMLElement | null;
  if (panel) panel.classList.toggle("todos--collapsed");
});

// ── Rewind keyboard nav ──
setupRewindKeyboardNav(__);
window.addEventListener("__rewind-esc", () => openRewindPicker(__));
