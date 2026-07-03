# reasonix-standalone-client [中文版](README.zh.md)

A standalone web client for [Reasonix](https://github.com/ZhUyU1997/DeepSeek-Reasonix), built with Vite + React + TypeScript.

## Why this exists

`reasonix serve` embeds a minimal [single-file HTML client](https://github.com/ZhUyU1997/DeepSeek-Reasonix/blob/main/internal/serve/index.html). This project is a **full-featured alternative** that:

- Provides a desktop-class UI without requiring the Wails desktop binary
- Works in any browser — perfect for WSL, remote servers, or headless environments
- Shares the same SSE/HTTP backend as the original `serve` client

## Feature comparison

| What you see / do | `serve/index.html` | standalone-client |
|---|---|---|
| Message rendering | Plain text with line breaks | Markdown (bold, lists, tables, links) |
| Code in messages | Plain monospace text | Syntax-highlighted code with language label |
| Code diffs (edit_file) | Raw output text | Side-by-side diff view with highlighting |
| Copying code | Manual select + copy | One-click copy button on every code block |

## WSL / remote workflow

If you're running Reasonix inside WSL (or any remote Linux host) and don't have a desktop environment, this client gives you a desktop-like experience without needing the Wails binary.

### Quick start

```bash
# 1. Make sure reasonix is installed and serve is running (default port 8787)
reasonix serve

# 2. In another terminal, start the standalone client dev server
cd reasonix-standalone-client
npm run dev

# 3. Open http://localhost:5173 in your browser
```

The Vite dev server proxies all API calls (`/events`, `/submit`, `/history`, etc.) to the `reasonix serve` backend automatically.

> **Why a proxy?** `reasonix serve` intentionally disables CORS for security (no auth). The built-in HTML client at `/` uses same-origin, so it works fine. A frontend on a different port has to either go through a proxy (Vite dev server) or add CORS headers. The Vite proxy handles this transparently.

### Production build

```bash
npm build          # produces dist/
```

> **Note:** The production build serves static files only. API routes (`/events`, `/submit`, `/history`, etc.) require a reverse proxy to `reasonix serve`. For local development, use `npm run dev` (Vite's dev proxy handles this automatically).

## Development

```bash
npm run dev          # Vite dev server with HMR (proxy configured)
npm build        # TypeScript check + production build
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
