/**
 * Composer.tsx — input textarea + send/stop buttons + slash menu.
 */
import { useEffect, useRef, useState, useCallback } from "react";
import { __ } from "../lib/i18n";
import { app } from "../lib/bridge";

interface SlashCmd {
  cmd: string;
  desc: string;
}

const SLASH_CMDS: SlashCmd[] = [
  {cmd: "compact", desc: __("cmd_compact")},
  {cmd: "new", desc: __("cmd_new")},
  {cmd: "resume", desc: __("cmd_resume")},
  {cmd: "rewind", desc: __("cmd_rewind")},
  {cmd: "tree", desc: __("cmd_tree")},
  {cmd: "branch", desc: __("cmd_branch")},
  {cmd: "switch", desc: __("cmd_switch")},
  {cmd: "model", desc: __("cmd_model")},
  {cmd: "effort", desc: __("cmd_effort")},
  {cmd: "mcp", desc: __("cmd_mcp")},
  {cmd: "skill", desc: __("cmd_skill")},
  {cmd: "hooks", desc: __("cmd_hooks")},
  {cmd: "memory", desc: __("cmd_memory")},
  {cmd: "forget", desc: __("cmd_forget")},
  {cmd: "goal", desc: __("cmd_goal")},
  {cmd: "thinking", desc: __("cmd_thinking")},
  {cmd: "verbose", desc: __("cmd_verbose")},
  {cmd: "help", desc: __("cmd_help")},
];

interface ComposerProps {
  running: boolean;
  onSend: (text: string) => void;
  onStop: () => void;
  goalActive: boolean;
  goalText: string;
}

export function Composer({ running, onSend, onStop, goalActive, goalText }: ComposerProps) {
  const [text, setText] = useState("");
  const [slashOpen, setSlashOpen] = useState(false);
  const [slashIndex, setSlashIndex] = useState(0);
  const [slashFiltered, setSlashFiltered] = useState<SlashCmd[]>([]);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Expose a global setter so welcome examples & other vanilla code can set the text
  useEffect(() => {
    (window as any).__setComposerText = (v: string) => {
      setText(v);
      inputRef.current?.focus();
    };
    return () => { delete (window as any).__setComposerText; };
  }, []);

  const doSend = useCallback(async () => {
    const v = text.trim();
    if (!v) return;
    // Sync mode before submit
    await app.SetPlanMode(false);
    await app.SetToolApprovalMode("ask");
    let submitInput = v;
    if (goalActive && !v.startsWith("/goal")) {
      submitInput = "/goal " + v;
    }
    onSend(submitInput);
    setText("");
    setSlashOpen(false);
  }, [text, onSend, goalActive]);

  // ── slash menu ──
  const updateSlash = useCallback((val: string) => {
    if (!val.startsWith("/") || val.includes(" ")) {
      setSlashOpen(false);
      return;
    }
    const q = val.slice(1).toLowerCase();
    const filtered = SLASH_CMDS.filter(c => c.cmd.includes(q));
    if (filtered.length === 0) { setSlashOpen(false); return; }
    setSlashFiltered(filtered);
    setSlashIndex(0);
    setSlashOpen(true);
  }, []);

  const acceptSlash = useCallback(() => {
    if (!slashOpen || slashIndex >= slashFiltered.length) return;
    setText("/" + slashFiltered[slashIndex].cmd + " ");
    setSlashOpen(false);
    inputRef.current?.focus();
  }, [slashOpen, slashIndex, slashFiltered]);

  // ── input change ──
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setText(val);
    updateSlash(val);
    // auto-resize
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 140) + "px";
  };

  // ── keyboard ──
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (slashOpen) {
      if (e.key === "ArrowDown") { e.preventDefault(); setSlashIndex(i => Math.min(i + 1, slashFiltered.length - 1)); return; }
      if (e.key === "ArrowUp") { e.preventDefault(); setSlashIndex(i => Math.max(i - 1, 0)); return; }
      if (e.key === "Tab" || e.key === "Enter") { e.preventDefault(); acceptSlash(); return; }
      if (e.key === "Escape") { e.preventDefault(); setSlashOpen(false); return; }
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      doSend();
      return;
    }
    // Esc handled at document level (global rewind / cancel)
  };

  // ── global keyboard ──
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target !== inputRef.current) return;
      // Shift+Tab mode cycle
      if (e.key === "Tab" && e.shiftKey) {
        e.preventDefault();
        // Trigger mode cycle via programmatic click on plan btn
        const autoBtn = document.getElementById("btn-auto") as HTMLElement | null;
        if (autoBtn) autoBtn.click();
        return;
      }
      // Ctrl+Y toggle yolo
      if ((e.key === "y" || e.key === "Y") && (e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey) {
        e.preventDefault();
        const yoloBtn = document.getElementById("btn-bypass") as HTMLElement | null;
        if (yoloBtn) yoloBtn.click();
        return;
      }
      // Esc handling
      if (e.key === "Escape") {
        if (running) { e.preventDefault(); onStop(); return; }
        if (text === "") {
          // rewind — triggers escTimer equivalent
          const ev = new CustomEvent("__rewind-esc");
          window.dispatchEvent(ev);
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [running, text, onStop]);

  const placeholder = goalActive ? __("goal_placeholder") : __("placeholder");

  return (
    <>
      {/* slash menu */}
      {slashOpen && (
        <div className="slash-menu" id="slash-menu">
          {slashFiltered.map((c, i) => (
            <button
              key={c.cmd}
              className={"slash-menu__item" + (i === slashIndex ? " slash-menu__item--active" : "")}
              onMouseEnter={() => setSlashIndex(i)}
              onClick={() => { setText("/" + c.cmd + " "); setSlashOpen(false); inputRef.current?.focus(); }}
            >
              <span className="slash-menu__name">/{c.cmd}</span>
              <span className="slash-menu__desc">{c.desc}</span>
            </button>
          ))}
        </div>
      )}
      <div className="composer">
        <span className="composer__caret">&rsaquo;</span>
        <textarea
          ref={inputRef}
          className="composer__input"
          id="in"
          placeholder={placeholder}
          rows={1}
          autoFocus
          value={text}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
        />
        <button
          className="composer__btn composer__btn--send"
          id="btn-send"
          title={__("send")}
          style={{ display: running ? "none" : "" }}
          onClick={doSend}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/>
          </svg>
        </button>
        <button
          className="composer__btn composer__btn--stop"
          id="btn-stop"
          title={__("cancel")}
          style={{ display: running ? "" : "none" }}
          onClick={onStop}
        >
          <svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>
        </button>
      </div>
    </>
  );
}
