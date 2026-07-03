# reasonix-standalone-client [中文版](README.zh.md)

A standalone web client for [Reasonix](https://github.com/ZhUyU1997/DeepSeek-Reasonix), built with Vite + React + TypeScript.

## Why this exists

`reasonix serve` embeds a minimal [single-file HTML client](https://github.com/ZhUyU1997/DeepSeek-Reasonix/blob/main/internal/serve/index.html). This project is a **full-featured alternative** that:

- Provides a desktop-class UI without requiring the Wails desktop binary
- Works in any browser — perfect for WSL, remote servers, or headless environments
- Shares the same SSE/HTTP backend as the original `serve` client

## Feature comparison

| Feature | `serve/index.html` | standalone-client |
|---|---|---|
| Stack | Vanilla JS, inline | Vite + React 18 + TypeScript |
| Build | None (served as-is) | Bundled + minified |
| Markdown rendering | None (raw text) | `react-markdown` + `remark-gfm` |
| Code highlighting | None | `highlight.js` with 12+ languages |
| Diff viewer | None | Side-by-side diff with highlight (edit_file/multi_edit) |
| Copy button | None | Clipboard API + fallback on code blocks |
| Overlays (approval/ask) | DOM append | React components (ApprovalCard, AskCard) |
| Session management | Basic list | Async session list with status polling |
| i18n | Inline `__()` | Dedicated locale files (`en.ts`, `zh.ts`) + `LocaleProvider` |
| Compaction UI | Collapsible `.compaction` head + body | Same structure, React-managed |
| Transcript | DOM-managed, full re-render | Virtualized reducer (`useReducer`) |
| Hot reload | None | Vite HMR during development |
| File count | 1 file | ~25 files (components, lib, types) |

### Preserved behavior

Both clients:
- Connect to the same SSE (`/events`) and HTTP API
- Use the same CSS variables and color scheme
- Support auto/plan/yolo modes, goal mode, and tool approval
- Handle compaction, rewind, session switching

## WSL / remote workflow

If you're running Reasonix inside WSL (or any remote Linux host) and don't have a desktop environment, this client gives you a desktop-like experience without needing the Wails binary.

### Quick start

```bash
# 1. In WSL, start reasonix serve (default port 8787)
cd /path/to/DeepSeek-Reasonix
go run . serve --dir /path/to/project

# 2. In the same WSL terminal, start the dev server
cd reasonix-standalone-client
pnpm dev

# 3. Open http://localhost:5173 in your Windows browser
```

The Vite dev server proxies all API calls (`/events`, `/submit`, `/history`, etc.) to the `reasonix serve` backend automatically — no CORS configuration needed.

### Production build

```bash
pnpm build
pnpm vite preview   # serves on http://localhost:4173
```

You can also serve the `dist/` directory with any static file server:

```bash
cd dist && python3 -m http.server 8080
```

Then set up a reverse proxy (Caddy, nginx) to forward `/events`, `/submit`, `/history` etc. to the `reasonix serve` backend.

## Development

```bash
pnpm dev          # Vite dev server with HMR
pnpm build        # TypeScript check + production build
pnpm vite preview # Preview production build locally
```

## Project structure

```
src/
  App.tsx              — Root component, layout, status bar integration
  main.tsx             — Entry point, mounts React root
  components/          — React UI components (StatusBar, Composer, Sidebar, Transcript, etc.)
  lib/
    bridge.ts          — AppBindings implementation (HTTP + SSE)
    useController.ts   — State hook: reducer + SSE + polling
    transcriptReducer.ts  — Reducer for transcript items
    transcriptTypes.ts — Item types & actions
    types.ts           — Shared WireEvent types
    api.ts             — HTTP/SSE helpers
    ui.ts              — Utility functions (escaping, formatting)
    i18n.tsx           — Locale provider + useT() hook
    diff.ts            — Line diff + unified diff parser
    highlight.ts       — highlight.js wrapper (12 languages)
  locales/             — English + Chinese translations
```
