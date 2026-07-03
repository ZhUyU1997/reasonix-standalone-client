# reasonix-standalone-client

基于 Vite + React + TypeScript 构建的 [Reasonix](https://github.com/ZhUyU1997/DeepSeek-Reasonix) 独立 Web 客户端。

## 为什么需要它

`reasonix serve` 内置了一个极简的[单文件 HTML 客户端](https://github.com/ZhUyU1997/DeepSeek-Reasonix/blob/main/internal/serve/index.html)。本项目是**功能完整的替代品**：

- 提供桌面级 UI，无需 Wails 桌面二进制
- 任何浏览器均可运行——非常适合 WSL、远程服务器或无桌面环境
- 与原始的 `serve` 客户端共用同一套 SSE/HTTP 后端

## 功能对比

| 功能 | `serve/index.html` | standalone-client |
|---|---|---|
| 技术栈 | Vanilla JS 内联 | Vite + React 18 + TypeScript |
| 构建 | 无（直接输出） | 打包 + 压缩 |
| Markdown 渲染 | 无（纯文本） | `react-markdown` + `remark-gfm` |
| 代码高亮 | 无 | `highlight.js`（12+ 种语言） |
| Diff 视图 | 无 | 并排 diff + 高亮（edit_file/multi_edit） |
| 复制按钮 | 无 | Clipboard API + 降级（代码块上） |
| 审批/问答弹窗 | DOM append | React 组件（ApprovalCard, AskCard） |
| 会话管理 | 基础列表 | 异步列表 + 状态轮询 |
| 国际化 | 内联 `__()` | 独立语言文件（`en.ts`, `zh.ts`）+ `LocaleProvider` |
| 压缩记录 | 可折叠 `.compaction` 头部 + 正文 | 相同结构，React 管理 |
| 会话记录 | DOM 操作，全量重渲染 | Reducer 驱动（`useReducer`） |
| 热更新 | 无 | Vite HMR（开发环境） |
| 文件数 | 1 个文件 | ~25 个文件（组件、库、类型） |

### 保持一致的行为

两者均：
- 连接同一套 SSE（`/events`）和 HTTP API
- 使用相同的 CSS 变量和颜色方案
- 支持 auto/plan/yolo 模式、goal 模式和工具审批
- 处理压缩、回退、会话切换

## WSL / 远程工作流

如果你在 WSL（或任何远程 Linux 主机）中运行 Reasonix，并且没有桌面环境，本客户端让你无需 Wails 二进制即可获得桌面级体验。

### 快速开始

```bash
# 1. 在 WSL 中启动 reasonix serve（默认端口 8787）
cd /path/to/DeepSeek-Reasonix
go run . serve --dir /path/to/project

# 2. 在同一个 WSL 终端中启动开发服务器
cd reasonix-standalone-client
pnpm dev

# 3. 在 Windows 浏览器中打开 http://localhost:5173
```

Vite 开发服务器会自动将所有 API 调用（`/events`、`/submit`、`/history` 等）代理到 `reasonix serve` 后端——无需配置 CORS。

### 生产构建

```bash
pnpm build
pnpm vite preview   # 运行在 http://localhost:4173
```

你也可以用任意静态文件服务器托管 `dist/` 目录：

```bash
cd dist && python3 -m http.server 8080
```

然后配置反向代理（Caddy、nginx）将 `/events`、`/submit`、`/history` 等路径转发到 `reasonix serve` 后端。

## 开发

```bash
pnpm dev          # Vite 开发服务器（HMR）
pnpm build        # TypeScript 检查 + 生产构建
pnpm vite preview # 本地预览生产构建
```

## 项目结构

```
src/
  App.tsx              — 根组件、布局、状态栏集成
  main.tsx             — 入口、挂载 React 根节点
  components/          — React UI 组件（StatusBar、Composer、Sidebar、Transcript 等）
  lib/
    bridge.ts          — AppBindings 实现（HTTP + SSE）
    useController.ts   — 状态 Hook：reducer + SSE + 轮询
    transcriptReducer.ts  — 会话记录 reducer
    transcriptTypes.ts — 记录项类型和动作
    types.ts           — 共享 WireEvent 类型
    api.ts             — HTTP/SSE 辅助函数
    ui.ts              — 工具函数（转义、格式化）
    i18n.tsx           — 语言提供者 + useT() Hook
    diff.ts            — 行 diff + 统一 diff 解析器
    highlight.ts       — highlight.js 封装（12 种语言）
  locales/             — 英文 + 中文翻译
```
