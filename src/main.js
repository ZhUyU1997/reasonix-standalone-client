/**
 * main.js — entry point. Imports api.js and ui.js, wires up the UI.
 */

import { post, getJSON, connectSSE } from "./api.js";
import {
  el, escHtml, escAttr, fmtTok, fmtMoney, fmtElapsed, currencySymbol,
  addUserMsg, appendText, appendReasoning, finalizeMsg,
  renderToolDispatch, renderToolResult, renderToolProgress,
  showApproval, showAsk, showCompaction,
  openRewindPicker, renderHistoryMessages, parseTodos, renderTodoPanel, openStats,
  setupRewindKeyboardNav, renderRewindPicker,
} from "./ui.js";

// ── i18n ──
const __LANG_PREF = '__LANG__';
const __LANG = (__LANG_PREF === 'zh' || __LANG_PREF === 'en') ? __LANG_PREF : ((navigator.language || '').startsWith('zh') ? 'zh' : 'en');
document.documentElement.lang = __LANG;
const __T = {
  en: {
    'new_session': 'New Session', 'compact': 'Compact', 'rewind': 'Rewind',
    'branches': 'Branches', 'sessions': 'Sessions', 'status': 'Status',
    'loading': 'Loading...', 'cache': 'Cache', 'cost': 'Cost', 'balance': 'Balance',
    'ready': 'Ready', 'thinking': 'Thinking...', 'retrying_status': 'Retrying ({attempt}/{max})...',
    'stats': 'Stats', 'statistics': 'Statistics', 'model': 'Model',
    'total_tokens': 'Total Tokens', 'cache_hit_rate': 'Cache Hit Rate',
    'total_cost': 'Total Cost', 'context_usage': 'Context Usage',
    'connected': 'Connected', 'reconnecting': 'Reconnecting...', 'disconnected': 'Disconnected',
    'placeholder': 'Message Reasonix...  / for commands',
    'cmd_compact': 'Compact conversation', 'cmd_new': 'New session',
    'cmd_resume': 'Resume session', 'cmd_rewind': 'Rewind to checkpoint',
    'cmd_tree': 'Show branch tree', 'cmd_branch': 'Create branch',
    'cmd_switch': 'Switch branch', 'cmd_model': 'List/switch models',
    'cmd_effort': 'Reasoning effort level', 'cmd_mcp': 'MCP servers',
    'cmd_skill': 'Skills', 'cmd_hooks': 'Hooks', 'cmd_memory': 'Show memory',
    'cmd_forget': 'Forget memory', 'cmd_goal': 'Set a goal for the agent to pursue autonomously',
    'cmd_thinking': 'Thinking effort', 'cmd_verbose': 'Toggle reasoning', 'cmd_help': 'Help',
    'submit': 'Submit', 'approval_title': 'Approval Required',
    'allow': 'Allow', 'session': 'Allow for session',
    'session_command': 'Command for session', 'session_prefix': 'Command prefix for session',
    'persist_command': 'Always allow command (save)', 'persist_prefix': 'Always allow command prefix (save)',
    'persist_edit': 'Always allow edits (save)', 'persist_tool': 'Always allow (save)',
    'session_edit': 'Edits for session', 'session_tool': 'Tool for session',
    'deny': 'Deny', 'auto_mode': 'Auto mode (auto-approve fallback approvals)',
    'plan_mode': 'Plan mode (read-only)',
    'yolo_mode': 'YOLO mode (auto-approve tool approvals; ask and plan still wait)',
    'goal_mode_desc': 'Goal mode — type a task for the agent to pursue autonomously',
    'goal_mode': 'Goal mode', 'goal_placeholder': 'Describe your goal...',
    'goal_active': 'Active goal', 'goal_exit': 'Exit goal mode',
    'auto': 'Auto', 'plan': 'Plan', 'goal_btn': 'Goal', 'yolo': 'YOLO',
    'send': 'Send (Enter)', 'cancel': 'Cancel (Esc)',
    'no_sessions': 'No sessions', 'error_loading': 'Error loading',
    'no_checkpoints': 'No checkpoints available.',
    'compacted': 'Compacted', 'messages': 'messages', 'compacting': 'Compacting...',
    'scope_both': 'Code + conversation', 'scope_conversation': 'Conversation only',
    'scope_code': 'Code only', 'scope_fork': 'Fork (new branch)',
    'scope_sumfrom': 'Summarize from here', 'scope_sumupto': 'Summarize up to here',
    'delete_confirm': 'Delete this session?', 'welcome_tag': 'AI coding agent',
    'hint_commands': '/ commands', 'hint_mode': 'Plan', 'hint_yolo': 'YOLO',
    'hint_rewind': 'Esc×2 rewind',
    'example_explain': 'Explain the project structure',
    'example_fix': 'Find and fix any bugs',
    'example_test': 'Write tests for the main module',
    'total': 'Total', 'in': 'In', 'out': 'Out',
    'nav_jk': 'j/k or ↑↓ to navigate', 'nav_enter_esc': 'Enter to select · Esc to close',
    'nav_keys': 'b/c/d/f/s/u quick keys', 'nav_apply_esc': 'Enter to apply · Esc to go back',
    'rewind_title': 'Rewind — Select Turn',
    'action_title': 'Turn #{turn} — Select Action',
    'files': 'files',
  },
  zh: {
    'new_session': '新会话', 'compact': '压缩', 'rewind': '回退',
    'branches': '分支', 'sessions': '会话', 'status': '状态',
    'loading': '加载中...', 'cache': '缓存', 'cost': '费用', 'balance': '余额',
    'ready': '就绪', 'thinking': '思考中...', 'retrying_status': '正在重试 ({attempt}/{max})...',
    'stats': '统计', 'statistics': '统计', 'model': '模型',
    'total_tokens': '总 Token', 'cache_hit_rate': '缓存命中率',
    'total_cost': '总费用', 'context_usage': '上下文用量',
    'connected': '已连接', 'reconnecting': '重新连接...', 'disconnected': '已断开',
    'placeholder': '给 Reasonix 发消息...  / 查看命令',
    'cmd_compact': '压缩对话', 'cmd_new': '新建会话', 'cmd_resume': '恢复会话',
    'cmd_rewind': '回退到检查点', 'cmd_tree': '显示分支树', 'cmd_branch': '创建分支',
    'cmd_switch': '切换分支', 'cmd_model': '列出/切换模型', 'cmd_effort': '推理努力级别',
    'cmd_mcp': 'MCP 服务器', 'cmd_skill': '技能', 'cmd_hooks': '钩子',
    'cmd_memory': '显示记忆', 'cmd_forget': '忘记记忆',
    'cmd_goal': '设置目标让代理自主执行', 'cmd_thinking': '思考努力',
    'cmd_verbose': '切换推理显示', 'cmd_help': '帮助',
    'submit': '提交', 'approval_title': '需要批准', 'allow': '允许',
    'session': '本会话允许', 'session_command': '本会话允许此命令',
    'session_prefix': '本会话允许命令前缀',
    'persist_command': '总是允许此命令（保存）', 'persist_prefix': '总是允许命令前缀（保存）',
    'persist_edit': '总是允许编辑（保存）', 'persist_tool': '总是允许（保存）',
    'session_edit': '本会话允许编辑', 'session_tool': '本会话允许此工具',
    'deny': '拒绝', 'auto_mode': '自动模式（自动批准兜底审批）',
    'plan_mode': '计划模式（只读）',
    'yolo_mode': 'YOLO 模式（自动批准工具权限；ask 和计划仍会等待）',
    'goal_mode_desc': '目标模式 — 输入任务让代理自主执行', 'goal_mode': '目标模式',
    'goal_placeholder': '描述你的目标...', 'goal_active': '活跃目标',
    'goal_exit': '退出目标模式', 'auto': '自动', 'plan': '计划',
    'goal_btn': '目标', 'yolo': 'YOLO',
    'send': '发送 (Enter)', 'cancel': '取消 (Esc)',
    'no_sessions': '暂无会话', 'error_loading': '加载失败',
    'no_checkpoints': '暂无可用检查点', 'compacted': '已压缩',
    'messages': '条消息', 'compacting': '压缩中...',
    'scope_both': '代码 + 对话', 'scope_conversation': '仅对话',
    'scope_code': '仅代码', 'scope_fork': '分叉（新分支）',
    'scope_sumfrom': '从此处总结', 'scope_sumupto': '总结到此处',
    'delete_confirm': '删除此会话？', 'welcome_tag': 'AI 编码助手',
    'hint_commands': '/ 命令', 'hint_mode': '计划', 'hint_yolo': 'YOLO',
    'hint_rewind': 'Esc×2 回退',
    'example_explain': '解释项目结构', 'example_fix': '查找并修复错误',
    'example_test': '为主模块编写测试',
    'total': '总计', 'in': '输入', 'out': '输出',
    'nav_jk': 'j/k 或 ↑↓ 导航', 'nav_enter_esc': 'Enter 选择 · Esc 关闭',
    'nav_keys': 'b/c/d/f/s/u 快捷键', 'nav_apply_esc': 'Enter 应用 · Esc 返回',
    'rewind_title': '回退 — 选择轮次',
    'action_title': '第 #{turn} 轮 — 选择操作',
    'files': '个文件',
  }
};
const __ = (key, ...args) => {
  let s = __T[__LANG]?.[key] ?? __T.en[key] ?? key;
  if (args.length) args.forEach((v, i) => { s = s.replace('#{' + ['turn','n'][i] + '}', v); });
  return s;
};
function translateTokens(text) {
  return String(text).replace(/__\('([^']+)'\)/g, (_, key) => __(key));
}

// ── DOM refs ──
const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);
const log = $('#log'), input = $('#in'), btnSend = $('#btn-send'), btnStop = $('#btn-stop');
const statusDot = $('#status-dot-footer'), statusText = $('#status-text');
const turnInfo = $('#turn-info'), balanceInfo = $('#balance-info');
const ctxFill = $('#ctx-fill'), ctxUsed = $('#ctx-used'), ctxWindow = $('#ctx-window');
const statusDotSidebar = $('#status-dot'), statusModel = $('#status-model');
const welcome = $('#welcome');
const slashAnchor = $('#slash-menu-anchor');

// ── state ──
let running = false, planMode = false, bypassMode = false, toolApprovalMode = 'ask', yoloRestoreMode = 'ask';
let goalMode = false, goalActive = false, goalText = '';
const msgState = { currentMsg: null, currentText: null, currentReasoning: null };
let turnStartAt = 0, turnTokens = 0, tickTimer = null, retryStatus = null;
let toolCards = {};
let escTimer = null;
let sessionCount = 0;
let todosState = [], todosDismissed = false;
let cumulativeTokens = 0, cumulativeCost = 0, cumulativeCacheHit = 0, cumulativeCacheMiss = 0;

// ── helpers ──
function scrollDown() { requestAnimationFrame(() => { log.scrollTop = log.scrollHeight; }); }

function setRunning(on) {
  running = on;
  retryStatus = null;
  btnSend.style.display = on ? 'none' : '';
  btnStop.style.display = on ? '' : 'none';
  statusDot.className = on ? 'status__dot status__dot--busy' : 'status__dot';
  statusDotSidebar.className = statusDot.className;
  statusText.textContent = on ? (goalActive ? __('goal_active') + ' · ' : '') + __('thinking') : __('ready');
  if (on) {
    turnStartAt = Date.now(); turnTokens = 0;
    tickTimer = setInterval(() => {
      const ms = Date.now() - turnStartAt;
      const tok = turnTokens > 0 ? ' · ↓ ' + fmtTok(turnTokens) + ' tok' : '';
      turnInfo.textContent = fmtElapsed(ms) + tok;
    }, 1000);
  } else {
    clearInterval(tickTimer);
    turnInfo.textContent = '';
  }
}

function setRetrying(attempt, max) {
  retryStatus = { attempt: attempt || 0, max: max || 0 };
  statusDot.className = 'status__dot status__dot--busy';
  statusDotSidebar.className = statusDot.className;
  statusText.textContent = __('retrying_status').replace('{attempt}', retryStatus.attempt).replace('{max}', retryStatus.max);
}

function clearRetrying() {
  if (!retryStatus) return;
  retryStatus = null;
  if (running) statusText.textContent = __('thinking');
}

function setConnState(state) {
  const colors = { connected: 'var(--success)', reconnecting: 'var(--warning)', disconnected: 'var(--danger)' };
  const labels = { connected: __('connected'), reconnecting: __('reconnecting'), disconnected: __('disconnected') };
  if (!running) {
    statusDot.style.background = colors[state] || '';
    statusDot.className = 'status__dot' + (state === 'reconnecting' ? ' status__dot--busy' : '');
    statusText.textContent = labels[state] || state;
  }
  statusDotSidebar.style.background = colors[state] || '';
}

// ── SSE ──
connectSSE(
  // onEvent
  (e) => {
    setConnState('connected');
    if (e.kind !== 'retrying') clearRetrying();
    switch (e.kind) {
      case 'turn_started': setRunning(true); finalizeMsg(msgState); toolCards = {}; todosDismissed = false; break;
      case 'reasoning': currentReasoning = null; appendReasoning(log, welcome, msgState, e.reasoning || e.text || '', __, scrollDown); break;
      case 'text': msgState.currentReasoning = null; appendText(log, welcome, msgState, e.text || '', scrollDown); break;
      case 'message': finalizeMsg(msgState); break;
      case 'tool_dispatch': if (e.tool) renderToolDispatch(log, e.tool, toolCards, welcome, scrollDown); break;
      case 'tool_result':
        if (e.tool) {
          renderToolResult(e.tool, toolCards, scrollDown);
          if (e.tool.name === 'todo_write' && !e.tool.parentId && !e.tool.err) {
            try { const ts = parseTodos(e.tool.args); if (ts.length) { todosState = ts; renderTodoPanel(todosState, todosDismissed); } } catch {}
          }
        }
        break;
      case 'tool_progress': if (e.tool) renderToolProgress(e.tool, toolCards, scrollDown); break;
      case 'usage':
        if (e.usage) {
          turnTokens = e.usage.completionTokens || 0;
          cumulativeTokens += e.usage.totalTokens || 0;
          const usageCost = e.usage.cost ?? e.usage.costUsd;
          if (typeof usageCost === 'number') cumulativeCost += usageCost;
          cumulativeCacheHit += e.usage.cacheHitTokens || 0;
          cumulativeCacheMiss += e.usage.cacheMissTokens || 0;
          const strip = el('div', 'metric-strip');
          [{l:__('total'), v:fmtTok(e.usage.totalTokens), c:''}, {l:__('in'), v:fmtTok(e.usage.promptTokens), c:'acc'}, {l:__('out'), v:fmtTok(e.usage.completionTokens), c:'ok'}].forEach(it => {
            const sp = el('span', 'item'); sp.innerHTML = it.l + ' <span class="v ' + it.c + '">' + it.v + '</span>'; strip.appendChild(sp);
          });
          if (e.usage.cacheHitTokens) {
            const sp = el('span', 'item');
            sp.innerHTML = __('cache') + ' <span class="v acc">' + Math.round(e.usage.cacheHitTokens / Math.max(1, e.usage.cacheHitTokens + e.usage.cacheMissTokens) * 100) + '%</span>';
            strip.appendChild(sp);
          }
          if (typeof usageCost === 'number' && usageCost > 0) {
            const sp = el('span', 'item'); sp.innerHTML = __('cost') + ' <span class="v">' + fmtMoney(usageCost, e.usage.currency) + '</span>'; strip.appendChild(sp);
          }
          log.appendChild(strip); scrollDown();
        }
        break;
      case 'notice': log.appendChild(el('div', 'notice' + (e.level === 'warn' ? ' notice--warn' : ''), (e.level === 'warn' ? '! ' : '') + (e.text || ''))); scrollDown(); break;
      case 'phase': finalizeMsg(msgState); log.appendChild(el('div', 'phase', e.text || '')); scrollDown(); break;
      case 'approval_request': if (e.approval) showApproval(log, e.approval, __, scrollDown); break;
      case 'ask_request': if (e.ask) showAsk(log, e.ask, __, scrollDown); break;
      case 'compaction_started': showCompaction(log, {trigger:e.compaction?.trigger}, __, scrollDown); break;
      case 'compaction_done': showCompaction(log, e.compaction||{}, __, scrollDown); break;
      case 'retrying': setRetrying(e.retryAttempt, e.retryMax); break;
      case 'turn_done': finalizeMsg(msgState); setRunning(false); if (e.err) { log.appendChild(el('div', 'msg--error', '✗ ' + e.err)); scrollDown(); } fetchStatus(); fetchTodos(); break;
    }
  },
  // onOpen
  () => { setConnState('connected'); fetchStatus(); fetchTodos(); },
  // onError
  (readyState) => { if (readyState === EventSource.CONNECTING) setConnState('reconnecting'); else setConnState('disconnected'); }
);

// ── status polling ──
async function fetchStatus() {
  try {
    const s = await getJSON('/status');
    if (s.label) statusModel.textContent = s.label;
    planMode = !!s.plan;
    toolApprovalMode = s.toolApprovalMode || ((s.autoApproveTools ?? s.bypass) ? 'yolo' : 'ask');
    bypassMode = toolApprovalMode === 'yolo';
    if (!bypassMode && toolApprovalMode === 'auto') yoloRestoreMode = 'auto';
    updateModeButtons();
    if (s.window) {
      const pct = Math.min(100, Math.round(s.used / s.window * 100));
      ctxFill.style.width = pct + '%';
      ctxFill.style.background = pct > 85 ? 'var(--warning)' : pct > 95 ? 'var(--danger)' : 'var(--accent)';
      ctxUsed.textContent = fmtTok(s.used) + ' tok';
      ctxWindow.textContent = fmtTok(s.window) + ' tok';
    }
    goalText = (s.goal || '').trim();
    goalActive = goalText !== '' && (s.goalStatus || '') === 'running';
    updateGoalUI();
    const cacheTotal = (s.cacheHit || 0) + (s.cacheMiss || 0);
    $('#sm-cache').textContent = cacheTotal > 0 ? Math.round((s.cacheHit || 0) / cacheTotal * 100) + '%' : '—';
    const lastCost = s.lastUsage?.cost ?? s.lastUsage?.costUsd ?? s.lastUsage?.totalCost;
    if (typeof lastCost === 'number') $('#sm-cost').textContent = fmtMoney(lastCost, s.lastUsage?.currency);
    if (s.balance) { $('#sm-balance').textContent = s.balance.display || '--'; balanceInfo.textContent = '💰 ' + (s.balance.display || '--'); }
  } catch {}
}

setInterval(fetchStatus, 30000);

// ── i18n static text rendering ──
function applyStaticI18n() {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      if (!parent || parent.closest('script,style')) return NodeFilter.FILTER_REJECT;
      return node.nodeValue.includes("__('") ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
    }
  });
  const nodes = [];
  for (let node = walker.nextNode(); node; node = walker.nextNode()) nodes.push(node);
  nodes.forEach(node => { node.nodeValue = translateTokens(node.nodeValue); });
  document.querySelectorAll('[title],[placeholder]').forEach(node => {
    if (node.hasAttribute('title')) node.setAttribute('title', translateTokens(node.getAttribute('title')));
    if (node.hasAttribute('placeholder')) node.setAttribute('placeholder', translateTokens(node.getAttribute('placeholder')));
  });
}
applyStaticI18n();

// ── populate welcome examples ──
document.querySelectorAll('.welcome__ex').forEach((btn, i) => {
  const keys = ['example_explain', 'example_fix', 'example_test'];
  if (i < keys.length) btn.dataset.prompt = __(keys[i]);
});

// ── history ──
getJSON('/history').then(msgs => {
  renderHistoryMessages(log, welcome, msgState, msgs, toolCards, __, scrollDown);
  fetchTodos();
}).catch(() => {});

// ── slash commands registry ──
const SLASH_CMDS = [
  {cmd:'compact', desc:__('cmd_compact')},
  {cmd:'new', desc:__('cmd_new')},
  {cmd:'resume', desc:__('cmd_resume')},
  {cmd:'rewind', desc:__('cmd_rewind')},
  {cmd:'tree', desc:__('cmd_tree')},
  {cmd:'branch', desc:__('cmd_branch')},
  {cmd:'switch', desc:__('cmd_switch')},
  {cmd:'model', desc:__('cmd_model')},
  {cmd:'effort', desc:__('cmd_effort')},
  {cmd:'mcp', desc:__('cmd_mcp')},
  {cmd:'skill', desc:__('cmd_skill')},
  {cmd:'hooks', desc:__('cmd_hooks')},
  {cmd:'memory', desc:__('cmd_memory')},
  {cmd:'forget', desc:__('cmd_forget')},
  {cmd:'goal', desc:__('cmd_goal')},
  {cmd:'thinking', desc:__('cmd_thinking')},
  {cmd:'verbose', desc:__('cmd_verbose')},
  {cmd:'help', desc:__('cmd_help')},
];

// ── slash menu ──
let slashOpen = false, slashIndex = 0, slashFiltered = [];

function updateSlashMenu() {
  const v = input.value;
  if (!v.startsWith('/') || v.includes(' ')) { closeSlashMenu(); return; }
  const q = v.slice(1).toLowerCase();
  slashFiltered = SLASH_CMDS.filter(c => c.cmd.includes(q));
  if (slashFiltered.length === 0) { closeSlashMenu(); return; }
  slashOpen = true; slashIndex = 0;
  renderSlashMenu();
}

function renderSlashMenu() {
  let menu = $('#slash-menu');
  if (!menu) { menu = el('div', 'slash-menu'); menu.id = 'slash-menu'; slashAnchor.appendChild(menu); }
  menu.innerHTML = '';
  slashFiltered.forEach((c, i) => {
    const item = el('button', 'slash-menu__item' + (i === slashIndex ? ' slash-menu__item--active' : ''));
    item.innerHTML = '<span class="slash-menu__name">/' + c.cmd + '</span><span class="slash-menu__desc">' + c.desc + '</span>';
    item.onmouseenter = () => { slashIndex = i; renderSlashMenu(); };
    item.onclick = () => { input.value = '/' + c.cmd + ' '; closeSlashMenu(); input.focus(); };
    menu.appendChild(item);
  });
}

function closeSlashMenu() { slashOpen = false; const m = $('#slash-menu'); if (m) m.remove(); }
function acceptSlash() { if (!slashOpen) return; const c = slashFiltered[slashIndex]; if (c) { input.value = '/' + c.cmd + ' '; } closeSlashMenu(); input.focus(); }

// ── input handling ──
async function syncModeBeforeSubmit() {
  await post('/plan', {on: planMode});
  await post('/tool-approval-mode', {mode: bypassMode ? 'yolo' : toolApprovalMode});
}

async function send() {
  const v = input.value.trim(); if (!v) return;
  await syncModeBeforeSubmit();
  let submitInput = v;
  if (goalMode && !v.startsWith('/goal')) {
    submitInput = '/goal ' + v;
    goalMode = false;
    updateGoalUI();
  } else if (goalMode) {
    goalMode = false;
    updateGoalUI();
  }
  addUserMsg(log, welcome, v, scrollDown);
  post('/submit', {input: submitInput}).then(r => { if (r.ok && r.status === 204) { fetchStatus(); loadSessions(); } });
  input.value = ''; input.style.height = ''; closeSlashMenu();
}

input.addEventListener('input', () => {
  input.style.height = 'auto'; input.style.height = Math.min(input.scrollHeight, 140) + 'px';
  updateSlashMenu();
});

input.addEventListener('keydown', e => {
  if (slashOpen) {
    if (e.key === 'ArrowDown') { e.preventDefault(); slashIndex = Math.min(slashIndex + 1, slashFiltered.length - 1); renderSlashMenu(); return; }
    if (e.key === 'ArrowUp') { e.preventDefault(); slashIndex = Math.max(slashIndex - 1, 0); renderSlashMenu(); return; }
    if (e.key === 'Tab' || e.key === 'Enter') { e.preventDefault(); acceptSlash(); return; }
    if (e.key === 'Escape') { e.preventDefault(); closeSlashMenu(); return; }
  }
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); return; }
  if (e.key === 'Escape') {
    if (goalMode && !running) { goalMode = false; updateGoalUI(); input.value = ''; closeSlashMenu(); return; }
    if (running) { post('/cancel'); return; }
    if (input.value === '') {
      if (escTimer) { clearTimeout(escTimer); escTimer = null; openRewindPicker(__); }
      else { escTimer = setTimeout(() => escTimer = null, 600); }
      return;
    }
  }
});

// shift+tab mode cycle
document.addEventListener('keydown', e => {
  if (e.target === input && e.key === 'Tab' && e.shiftKey) { e.preventDefault(); cycleMode(); return; }
  if (e.target === input && (e.key === 'y' || e.key === 'Y') && (e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey) { e.preventDefault(); toggleYolo(); return; }
  if (e.key === '/' && e.target !== input) { e.preventDefault(); input.focus(); return; }
});

// ── mode helpers ──
function updateModeButtons() {
  const auto = !bypassMode && toolApprovalMode === 'auto';
  $('#btn-auto').classList.toggle('toolbar__btn--ok', auto);
  $('#btn-plan').classList.toggle('toolbar__btn--active', planMode);
  $('#btn-bypass').classList.toggle('toolbar__btn--danger', bypassMode);
  $('#btn-goal').classList.toggle('toolbar__btn--goal', goalMode && !goalActive);
  $('#btn-goal').classList.toggle('toolbar__btn--goal-active', goalActive);
}

function updateGoalUI() {
  updateModeButtons();
  const bar = $('#goal-active-bar');
  if (goalActive && goalText) {
    bar.style.display = '';
    $('#goal-chip-text').textContent = goalText;
  } else {
    bar.style.display = 'none';
  }
  input.placeholder = goalMode ? __('goal_placeholder') : __('placeholder');
}

async function setToolApprovalMode(mode) { toolApprovalMode = mode; bypassMode = mode === 'yolo'; updateModeButtons(); await post('/tool-approval-mode', {mode}); }
async function setPlan(on) { planMode = on; updateModeButtons(); await post('/plan', {on}); }
async function cycleMode() { if (goalMode) { goalMode = false; updateGoalUI(); return; } await setPlan(!planMode); setTimeout(fetchStatus, 200); }
async function toggleYolo() { if (bypassMode) { const restore = yoloRestoreMode === 'auto' ? 'auto' : 'ask'; await setToolApprovalMode(restore); } else { yoloRestoreMode = toolApprovalMode === 'auto' ? 'auto' : 'ask'; await setToolApprovalMode('yolo'); } setTimeout(fetchStatus, 200); }
async function setMode(m) { if (m === 'auto') await setToolApprovalMode('auto'); else if (m === 'plan') await setPlan(!planMode); else if (m === 'yolo') await toggleYolo(); else if (m === 'goal') toggleGoalMode(); }
function toggleGoalMode() {
  if (goalActive) { post('/goal', {goal:''}).then(() => { goalActive = false; goalText = ''; updateGoalUI(); fetchStatus(); }); return; }
  if (goalMode) { goalMode = false; updateGoalUI(); } else { goalMode = true; updateGoalUI(); input.focus(); }
}

// ── todo panel ──
function fetchTodos() {
  getJSON('/todos').then(ts => { if (Array.isArray(ts)) { todosState = ts; renderTodoPanel(todosState, todosDismissed); } }).catch(() => {});
}
document.getElementById('todos-head').onclick = function(e) {
  if (e.target.closest('.todos__dismiss')) { todosDismissed = true; renderTodoPanel(todosState, todosDismissed); return; }
  const panel = document.getElementById('todo-panel');
  panel.classList.toggle('todos--collapsed');
};

// ── toolbar buttons ──
btnSend.onclick = () => void send();
btnStop.onclick = () => post('/cancel');
document.getElementById('btn-auto').onclick = () => void setMode('auto');
document.getElementById('btn-plan').onclick = () => void setPlan(!planMode);
document.getElementById('btn-bypass').onclick = () => void toggleYolo();
document.getElementById('btn-goal').onclick = () => toggleGoalMode();
document.getElementById('goal-chip').onclick = () => toggleGoalMode();
document.getElementById('btn-new').onclick = () => { if (running) return; post('/new').then(() => { log.innerHTML = ''; log.appendChild(welcome); welcome.style.display = ''; todosState = []; todosDismissed = false; renderTodoPanel(todosState, todosDismissed); loadSessions(); }); };
document.getElementById('btn-compact').onclick = () => { if (!running) post('/compact'); };
document.getElementById('btn-rewind').onclick = () => openRewindPicker(__);
document.getElementById('btn-tree').onclick = () => { post('/submit', {input:'/tree'}); };
document.getElementById('btn-stats').onclick = () => openStats(sessionCount, cumulativeTokens, cumulativeCost, cumulativeCacheHit, cumulativeCacheMiss, fmtTok, fmtMoney);
document.getElementById('stats-modal-close').onclick = () => { const m = document.getElementById('stats-modal'); if (m) m.style.display = 'none'; };
document.getElementById('stats-modal').onclick = e => { if (e.target === e.currentTarget) { const m = document.getElementById('stats-modal'); if (m) m.style.display = 'none'; } };

// ── session list ──
async function loadSessions() {
  sessionCount = 0;
  try {
    const ss = await getJSON('/sessions');
    const list = document.getElementById('session-list');
    if (!list) return;
    if (!ss || ss.length === 0) { list.innerHTML = '<div style="padding:10px;color:var(--muted-2);font-size:12px">' + __('no_sessions') + '</div>'; return; }
    list.innerHTML = '';
    ss.forEach(s => {
      sessionCount++;
      const item = el('div', 'session-item' + (s.current ? ' session-item--active' : ''));
      const name = s.name.replace(/^.*\//, '').replace(/\.jsonl$/, '');
      const title = s.title || name.replace(/^\w+-/, '').replace(/T/, ' ').replace(/[-_]/g, ' ').slice(0, 30);
      const meta = s.turns ? s.turns + ' turns' : '';
      item.innerHTML = '<svg class="session-item__icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg><div class="session-item__body"><div class="session-item__title">' + escHtml(title) + '</div><div class="session-item__meta">' + escHtml(meta) + '</div></div><button type="button" class="session-del" data-name="' + escAttr(s.name) + '" title="' + escAttr(__('delete_confirm')) + '">&times;</button>';
      item.onclick = () => { if (running || s.current) return; post('/resume', {path:s.path}).then(() => { log.innerHTML = ''; log.appendChild(welcome); welcome.style.display = ''; todosDismissed = false; loadSessions(); setTimeout(() => getJSON('/history').then(msgs => { renderHistoryMessages(log, welcome, msgState, msgs, toolCards, __, scrollDown); fetchTodos(); }).catch(() => {}), 300); }); };
      list.appendChild(item);
    });
  } catch {
    const list = document.getElementById('session-list');
    if (list) list.innerHTML = '<div style="padding:10px;color:var(--muted-2);font-size:12px">' + __('error_loading') + '</div>';
  }
}
loadSessions();

// ── mobile sidebar ──
const sidebar = document.querySelector('.sidebar'), sidebarOverlay = document.getElementById('sidebar-overlay'), menuBtn = document.getElementById('menu-btn');
menuBtn.onclick = () => { sidebar.classList.add('sidebar--open'); sidebarOverlay.classList.add('sidebar-overlay--visible'); menuBtn.style.opacity = '0'; };
sidebarOverlay.onclick = () => { sidebar.classList.remove('sidebar--open'); sidebarOverlay.classList.remove('sidebar-overlay--visible'); menuBtn.style.opacity = ''; };
document.addEventListener('keydown', e => { if (e.key === 'Escape' && sidebar.classList.contains('sidebar--open')) { sidebar.classList.remove('sidebar--open'); sidebarOverlay.classList.remove('sidebar-overlay--visible'); menuBtn.style.opacity = ''; } });

// ── session delete ──
document.addEventListener('click', e => {
  const del = e.target.closest('.session-del');
  if (!del) return;
  e.stopPropagation();
  const name = del.dataset.name;
  if (name && confirm(__('delete_confirm'))) { post('/delete-session', {name}).then(() => loadSessions()); }
});

// ── welcome examples ──
document.querySelectorAll('.welcome__ex').forEach(btn => { btn.onclick = () => { input.value = btn.dataset.prompt; send(); }; });

// ── initial fetch ──
setupRewindKeyboardNav(__, renderRewindPicker);
fetchStatus();
