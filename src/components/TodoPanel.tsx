/**
 * TodoPanel.tsx — To-do list panel rendered above the composer.
 * Replaces the vanilla-DOM renderTodoPanel + click handler.
 */

import { useState } from "react";
import type { TodoItem } from "../lib/types";

interface Props {
  todos: TodoItem[];
  onDismiss: () => void;
}

export function TodoPanel({ todos, onDismiss }: Props) {
  const [collapsed, setCollapsed] = useState(false);

  if (!todos.length) return null;

  const done = todos.filter(t => String(t.status || "").trim() === "completed").length;
  const total = todos.length;
  const current = todos.find(t => String(t.status || "").trim() === "in_progress");
  const allDone = done === total;
  const summary = current?.activeForm || current?.content || todos[todos.length - 1]?.content || "";

  return (
    <div className={"todos todos--visible" + (collapsed ? " todos--collapsed" : "")}>
      <div className="todos__head" onClick={() => setCollapsed(!collapsed)}>
        <span className="todos__title">To-dos</span>
        <span className="todos__badge">{done}/{total}</span>
        <span className="todos__summary">{summary.slice(0, 60)}</span>
        {allDone && (
          <span className="todos__dismiss" onClick={(e) => { e.stopPropagation(); onDismiss(); }}>&times;</span>
        )}
        <span className="todos__chev">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </span>
      </div>
      {!collapsed && (
        <ul className="todos__list">
          {todos.map((t, i) => {
            const status = String(t.status || "").trim() || "pending";
            const cls = "todos__item" + (status === "completed" ? " todos__item--completed" : "") + (status === "in_progress" ? " todos__item--in_progress" : "");
            return (
              <li key={i} className={cls}>
                <span className={"todos__status todos__status--" + status}>{status.replace("_", " ")}</span>
                <span className="todos__text">{t.content}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
