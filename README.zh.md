# reasonix-standalone-client [English](README.md)

基于 Vite + React + TypeScript 构建的 [Reasonix](https://github.com/ZhUyU1997/DeepSeek-Reasonix) 独立 Web 客户端。

## 为什么需要它

`reasonix serve` 内置了一个极简的[单文件 HTML 客户端](https://github.com/ZhUyU1997/DeepSeek-Reasonix/blob/main/internal/serve/index.html)。本项目是**功能完整的替代品**：

- 提供桌面级 UI，无需 Wails 桌面二进制
- 任何浏览器均可运行——非常适合 WSL、远程服务器或无桌面环境
- 与原始的 `serve` 客户端共用同一套 SSE/HTTP 后端

## 功能对比

| 使用体验 | `serve/index.html` | standalone-client |
|---|---|---|
| 消息渲染 | 纯文本 + 换行 | Markdown（加粗、列表、表格、链接） |
| 代码展示 | 纯等宽文本 | 语法高亮 + 语言标签 |
| 代码差异（edit_file） | 原始输出文本 | 并排 diff 视图 + 高亮 |
| 复制代码 | 手动选中 + 复制 | 一键复制按钮（每个代码块） |
| 审批/问答弹窗 | 纯文本提示 | 样式化模态框 + 键盘快捷键 |
| 切换会话 | 刷新页面 | 侧边栏列表一键切换 |
| 语言 | 仅英文 | 英文 + 中文（自动检测） |
| 压缩记录 | 可折叠头部 + 摘要 | 相同行为，交互更流畅 |
| 会话记录滚动 | 每次事件全量重渲染 | 增量更新，响应迅速 |
| 开发反馈 | 修改 → 刷新浏览器 | 热更新 — 修改即时生效 |

### 保持一致的行为

两者连接同一后端、共享相同 CSS 配色方案、支持所有相同模式（auto/plan/yolo、goal、工具审批、压缩、回退、会话管理）。

## WSL / 远程工作流

如果你在 WSL（或任何远程 Linux 主机）中运行 Reasonix，并且没有桌面环境，本客户端让你无需 Wails 二进制即可获得桌面级体验。

### 快速开始

```bash
# 1. 确保已安装 reasonix 并启动了 serve（默认端口 8787）
reasonix serve

# 2. 在另一个终端中启动独立客户端开发服务器
cd reasonix-standalone-client
npm run dev

# 3. 在浏览器中打开 http://localhost:5173
```

Vite 开发服务器会自动将所有 API 调用（`/events`、`/submit`、`/history` 等）代理到 `reasonix serve` 后端。

> **为什么需要代理？** `reasonix serve` 出于安全原因（无认证）默认禁用了 CORS。内置的 HTML 客户端通过同源访问（`/`），所以没问题。如果前端运行在不同端口，要么通过代理（Vite 开发服务器），要么手动添加 CORS 头。Vite 代理自动处理了这一切。

### 生产构建

```bash
npm build          # 生成 dist/
```

> **注意：** 生产构建仅提供静态文件。API 路由（`/events`、`/submit`、`/history` 等）需要反向代理到 `reasonix serve` 后端。本地开发请使用 `npm run dev`（Vite 开发代理会自动处理）。

## 开发

```bash
npm run dev          # Vite 开发服务器（HMR，已配置代理）
npm build        # TypeScript 检查 + 生产构建
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
