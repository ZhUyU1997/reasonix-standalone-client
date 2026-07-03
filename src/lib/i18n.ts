/**
 * i18n.ts — internationalization for the Reasonix standalone client.
 * Provides `__()` for runtime lookups and `applyStaticI18n()` to translate
 * static HTML content containing `__('key')` placeholders.
 */

const __LANG_PREF = "__LANG__" as string;
const __LANG: string =
  (__LANG_PREF === "zh" || __LANG_PREF === "en")
    ? __LANG_PREF
    : ((navigator.language || "").startsWith("zh") ? "zh" : "en");
document.documentElement.lang = __LANG;

interface Translations {
  [key: string]: Record<string, string>;
}

const __T: Translations = {
  en: {
    "new_session": "New Session", "compact": "Compact", "rewind": "Rewind",
    "branches": "Branches", "sessions": "Sessions", "status": "Status",
    "loading": "Loading...", "cache": "Cache", "cost": "Cost", "balance": "Balance",
    "ready": "Ready", "thinking": "Thinking...", "retrying_status": "Retrying ({attempt}/{max})...",
    "stats": "Stats", "statistics": "Statistics", "model": "Model",
    "total_tokens": "Total Tokens", "cache_hit_rate": "Cache Hit Rate",
    "total_cost": "Total Cost", "context_usage": "Context Usage",
    "connected": "Connected", "reconnecting": "Reconnecting...", "disconnected": "Disconnected",
    "placeholder": "Message Reasonix...  / for commands",
    "cmd_compact": "Compact conversation", "cmd_new": "New session",
    "cmd_resume": "Resume session", "cmd_rewind": "Rewind to checkpoint",
    "cmd_tree": "Show branch tree", "cmd_branch": "Create branch",
    "cmd_switch": "Switch branch", "cmd_model": "List/switch models",
    "cmd_effort": "Reasoning effort level", "cmd_mcp": "MCP servers",
    "cmd_skill": "Skills", "cmd_hooks": "Hooks", "cmd_memory": "Show memory",
    "cmd_forget": "Forget memory",
    "cmd_goal": "Set a goal for the agent to pursue autonomously",
    "cmd_thinking": "Thinking effort", "cmd_verbose": "Toggle reasoning", "cmd_help": "Help",
    "submit": "Submit", "approval_title": "Approval Required",
    "allow": "Allow", "session": "Allow for session",
    "persist_tool": "Always allow (save)",
    "deny": "Deny", "auto_mode": "Auto mode (auto-approve fallback approvals)",
    "plan_mode": "Plan mode (read-only)",
    "yolo_mode": "YOLO mode (auto-approve tool approvals; ask and plan still wait)",
    "goal_mode_desc": "Goal mode — type a task for the agent to pursue autonomously",
    "goal_mode": "Goal mode", "goal_placeholder": "Describe your goal...",
    "goal_active": "Active goal", "goal_exit": "Exit goal mode",
    "auto": "Auto", "plan": "Plan", "goal_btn": "Goal", "yolo": "YOLO",
    "send": "Send (Enter)", "cancel": "Cancel (Esc)",
    "no_sessions": "No sessions", "error_loading": "Error loading",
    "no_checkpoints": "No checkpoints available.",
    "compacted": "Compacted", "messages": "messages", "compacting": "Compacting...",
    "scope_both": "Code + conversation", "scope_conversation": "Conversation only",
    "scope_code": "Code only", "scope_fork": "Fork (new branch)",
    "scope_sumfrom": "Summarize from here", "scope_sumupto": "Summarize up to here",
    "delete_confirm": "Delete this session?", "welcome_tag": "AI coding agent",
    "hint_commands": "/ commands", "hint_mode": "Plan", "hint_yolo": "YOLO",
    "hint_rewind": "Esc×2 rewind",
    "example_explain": "Explain the project structure",
    "example_fix": "Find and fix any bugs",
    "example_test": "Write tests for the main module",
    "total": "Total", "in": "In", "out": "Out",
    "nav_jk": "j/k or ↑↓ to navigate", "nav_enter_esc": "Enter to select · Esc to close",
    "nav_keys": "b/c/d/f/s/u quick keys", "nav_apply_esc": "Enter to apply · Esc to go back",
    "rewind_title": "Rewind — Select Turn",
    "action_title": "Turn #{turn} — Select Action",
    "files": "files",
  },
  zh: {
    "new_session": "新会话", "compact": "压缩", "rewind": "回退",
    "branches": "分支", "sessions": "会话", "status": "状态",
    "loading": "加载中...", "cache": "缓存", "cost": "费用", "balance": "余额",
    "ready": "就绪", "thinking": "思考中...", "retrying_status": "正在重试 ({attempt}/{max})...",
    "stats": "统计", "statistics": "统计", "model": "模型",
    "total_tokens": "总 Token", "cache_hit_rate": "缓存命中率",
    "total_cost": "总费用", "context_usage": "上下文用量",
    "connected": "已连接", "reconnecting": "重新连接...", "disconnected": "已断开",
    "placeholder": "给 Reasonix 发消息...  / 查看命令",
    "cmd_compact": "压缩对话", "cmd_new": "新建会话", "cmd_resume": "恢复会话",
    "cmd_rewind": "回退到检查点", "cmd_tree": "显示分支树", "cmd_branch": "创建分支",
    "cmd_switch": "切换分支", "cmd_model": "列出/切换模型", "cmd_effort": "推理努力级别",
    "cmd_mcp": "MCP 服务器", "cmd_skill": "技能", "cmd_hooks": "钩子",
    "cmd_memory": "显示记忆", "cmd_forget": "忘记记忆",
    "cmd_goal": "设置目标让代理自主执行", "cmd_thinking": "思考努力",
    "cmd_verbose": "切换推理显示", "cmd_help": "帮助",
    "submit": "提交", "approval_title": "需要批准", "allow": "允许",
    "session": "本会话允许",
    "persist_tool": "总是允许（保存）",
    "deny": "拒绝", "auto_mode": "自动模式（自动批准兜底审批）",
    "plan_mode": "计划模式（只读）",
    "yolo_mode": "YOLO 模式（自动批准工具权限；ask 和计划仍会等待）",
    "goal_mode_desc": "目标模式 — 输入任务让代理自主执行", "goal_mode": "目标模式",
    "goal_placeholder": "描述你的目标...", "goal_active": "活跃目标",
    "goal_exit": "退出目标模式", "auto": "自动", "plan": "计划",
    "goal_btn": "目标", "yolo": "YOLO",
    "send": "发送 (Enter)", "cancel": "取消 (Esc)",
    "no_sessions": "暂无会话", "error_loading": "加载失败",
    "no_checkpoints": "暂无可用检查点", "compacted": "已压缩",
    "messages": "条消息", "compacting": "压缩中...",
    "scope_both": "代码 + 对话", "scope_conversation": "仅对话",
    "scope_code": "仅代码", "scope_fork": "分叉（新分支）",
    "scope_sumfrom": "从此处总结", "scope_sumupto": "总结到此处",
    "delete_confirm": "删除此会话？", "welcome_tag": "AI 编码助手",
    "hint_commands": "/ 命令", "hint_mode": "计划", "hint_yolo": "YOLO",
    "hint_rewind": "Esc×2 回退",
    "example_explain": "解释项目结构", "example_fix": "查找并修复错误",
    "example_test": "为主模块编写测试",
    "total": "总计", "in": "输入", "out": "输出",
    "nav_jk": "j/k 或 ↑↓ 导航", "nav_enter_esc": "Enter 选择 · Esc 关闭",
    "nav_keys": "b/c/d/f/s/u 快捷键", "nav_apply_esc": "Enter 应用 · Esc 返回",
    "rewind_title": "回退 — 选择轮次",
    "action_title": "第 #{turn} 轮 — 选择操作",
    "files": "个文件",
  },
};

/** `__(key)` looks up a translation for the active language, falling back to English then the raw key. */
export const __ = (key: string, ...args: string[]): string => {
  let s = __T[__LANG]?.[key] ?? __T.en[key] ?? key;
  if (args.length) args.forEach((v, i) => { s = s.replace("#{" + ["turn", "n"][i] + "}", v); });
  return s;
};

function translateTokens(text: string): string {
  return String(text).replace(/__\('([^']+)'\)/g, (_, key: string) => __(key));
}

/** Walk the DOM and replace `__('key')` placeholders with translated text. */
export function applyStaticI18n(): void {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = (node as Text).parentElement;
      if (!parent || parent.closest("script,style")) return NodeFilter.FILTER_REJECT;
      return (node as Text).nodeValue!.includes("__('") ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
    },
  } as NodeFilter);
  const nodes: Text[] = [];
  for (let node = walker.nextNode(); node; node = walker.nextNode()) nodes.push(node as Text);
  nodes.forEach(node => { node.nodeValue = translateTokens(node.nodeValue!); });
  document.querySelectorAll("[title],[placeholder]").forEach(node => {
    const el = node as HTMLElement;
    if (el.hasAttribute("title")) el.setAttribute("title", translateTokens(el.getAttribute("title")!));
    if (el.hasAttribute("placeholder")) el.setAttribute("placeholder", translateTokens(el.getAttribute("placeholder")!));
  });
}
