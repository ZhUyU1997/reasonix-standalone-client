/**
 * ui.js — all DOM rendering functions. Pure functions that take/return DOM.
 * No side-effectful imports; the caller (main.js) passes in DOM refs.
 */

import { post, getJSON } from "./api.js";

// ── helpers ──
export function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
}
export function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
export function escAttr(s) {
  return escHtml(s).replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
export function fmtTok(n) {
  return n >= 1000 ? (n/1000).toFixed(1).replace(/\.0$/,'')+'k' : String(n);
}
export function currencySymbol(c) {
  const v = String(c||'¥').trim();
  if (/^(cny|rmb|yuan)$/i.test(v)) return '¥';
  if (/^(usd|dollar)$/i.test(v)) return '$';
  return v || '¥';
}
export function fmtMoney(n, c) {
  if (typeof n !== 'number' || !isFinite(n)) return '—';
  const s = currencySymbol(c);
  return s + (n < 1 ? n.toFixed(4) : n.toFixed(2));
}
export function fmtElapsed(ms) {
  const s = Math.floor(ms / 1000);
  return s < 60 ? s + 's' : Math.floor(s/60) + 'm ' + s%60 + 's';
}

// ── message rendering ──
export function addUserMsg(log, welcome, text, scrollCb) {
  if (welcome) welcome.style.display = 'none';
  const d = el('div', 'msg msg--user');
  d.appendChild(el('span', 'msg__caret', '›'));
  d.appendChild(el('div', 'msg__text', text));
  log.appendChild(d);
  scrollCb?.();
}

export function ensureMsg(log, welcome, state) {
  if (!state.currentMsg) {
    if (welcome) welcome.style.display = 'none';
    state.currentMsg = el('div', 'msg msg--assistant');
    log.appendChild(state.currentMsg);
  }
  return state.currentMsg;
}

export function appendText(log, welcome, state, t, scrollCb) {
  const m = ensureMsg(log, welcome, state);
  if (!state.currentText) {
    state.currentText = document.createElement('span');
    state.currentText.className = 'msg__text';
    const old = m.querySelector('.cursor');
    if (old) old.remove();
    m.appendChild(state.currentText);
    m.appendChild(el('span', 'cursor'));
  }
  state.currentText.textContent += t;
  scrollCb?.();
}

export function appendReasoning(log, welcome, state, t, __, scrollCb) {
  const m = ensureMsg(log, welcome, state);
  if (!state.currentReasoning) {
    const w = el('div', 'reasoning');
    const b = el('button', 'reasoning__toggle');
    b.innerHTML = '<span class="reasoning__chevron">▶</span> ' + __('thinking');
    const body = el('div', 'reasoning__body');
    body.style.display = 'none';
    b.onclick = () => {
      body.style.display = body.style.display === 'none' ? '' : 'none';
      b.querySelector('.reasoning__chevron').className = 'reasoning__chevron' + (body.style.display !== 'none' ? ' reasoning__chevron--open' : '');
    };
    w.appendChild(b);
    w.appendChild(body);
    if (state.currentText) m.insertBefore(w, state.currentText);
    else m.appendChild(w);
    state.currentReasoning = body;
  }
  state.currentReasoning.textContent += t;
  scrollCb?.();
}

export function finalizeMsg(state) {
  if (state.currentMsg) {
    const c = state.currentMsg.querySelector('.cursor');
    if (c) c.remove();
  }
  state.currentMsg = null;
  state.currentText = null;
  state.currentReasoning = null;
}

// ── tool cards ──
export function renderToolDispatch(log, tool, toolCards, welcome, scrollCb) {
  if (welcome) welcome.style.display = 'none';
  const card = el('div', 'card');
  card.id = 'tool-' + tool.id;
  card.dataset.open = 'false';
  card.dataset.tone = 'accent';
  const head = el('div', 'card-head');
  head.innerHTML = '<span class="ico spin"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10" stroke-dasharray="60" stroke-dashoffset="20"/></svg></span><span class="name">' + escHtml(tool.name) + '</span>' + (tool.args ? '<span class="subject">' + escHtml(tool.args.slice(0,80)) + '</span>' : '') + '<span class="grow"></span><span class="chev"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg></span>';
  const body = el('div', 'card-body');
  body.style.display = 'none';
  head.onclick = () => {
    const open = card.dataset.open === 'true';
    card.dataset.open = open ? 'false' : 'true';
    body.style.display = open ? 'none' : '';
  };
  card.appendChild(head);
  card.appendChild(body);
  log.appendChild(card);
  toolCards[tool.id] = card;
  scrollCb?.();
}

export function renderToolResult(tool, toolCards, scrollCb) {
  const card = toolCards[tool.id];
  if (!card) return;
  const ico = card.querySelector('.ico');
  if (ico) {
    ico.className = 'ico';
    ico.innerHTML = tool.err
      ? '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>'
      : '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>';
  }
  card.dataset.tone = tool.err ? 'danger' : 'success';
  if (tool.err) {
    card.appendChild(el('div', 'err-body', tool.err));
  } else if (tool.output) {
    const body = card.querySelector('.card-body');
    if (body) body.textContent = tool.output.slice(0, 2000) + (tool.truncated ? '\n...[truncated]' : '');
  }
  scrollCb?.();
}

export function renderToolProgress(tool, toolCards, scrollCb) {
  const card = toolCards[tool.id];
  if (!card) return;
  const body = card.querySelector('.card-body');
  if (!body) return;
  body.style.display = '';
  card.dataset.open = 'true';
  body.textContent += tool.output || '';
  if (body.textContent.length > 4000) body.textContent = body.textContent.slice(-3000);
  scrollCb?.();
}

// ── approval ──
function approvalSessionLabel(a, __) { return __('session') + ' ' + approvalSessionRule(a); }
function approvalPersistentLabel(a, __) { return __('persist_tool') + ' ' + approvalPersistentRule(a); }
function approvalSessionRule(a) {
  if (a.tool === 'bash' && a.subject) return 'Bash('+String(a.subject).trim()+')';
  if (['write_file','edit_file','multi_edit','move_file','notebook_edit','delete_range','delete_symbol'].includes(a.tool)) return 'Edit';
  return a.tool;
}
function approvalPersistentRule(a) {
  if (a.tool === 'bash' && a.subject) return 'Bash('+String(a.subject).trim()+')';
  if (['write_file','edit_file','multi_edit','move_file','notebook_edit','delete_range','delete_symbol'].includes(a.tool)) return a.subject ? 'Edit('+String(a.subject).trim()+')' : 'Edit';
  return a.tool;
}
export function bashCommandPrefix(subject) {
  const command = String(subject || '').trim();
  if (!command || command.includes('`') || command.includes('$(') || /[;|&<>\n]/.test(command)) return '';
  const fields = command.split(/\s+/).filter(Boolean);
  if (fields.length < 2) return '';
  if (dangerousBashCommand(command)) return '';
  const base = fields[0].toLowerCase();
  if (['npm','pnpm','yarn','bun'].includes(base) && fields[1] && fields[1].toLowerCase() === 'run') return fields.length >= 3 ? fields[0]+' '+fields[1]+' '+fields[2]+':*' : '';
  return fields[0]+' '+fields[1]+':*';
}
export function dangerousBashCommand(command) {
  return /^rm\s+-[^\s]*[rf][^\s]*\b/.test(command)
    || /^git\s+push\b.*\s--force\b/.test(command)
    || /^git\s+push\b.*\s-f\b/.test(command)
    || /^git\s+reset\s+--hard\b/.test(command)
    || /^git\s+clean\s+-f\b/.test(command)
    || /^chmod\s+(?:-R\s+)?777\b/.test(command)
    || /^chown\b/.test(command)
    || /^sudo\b/.test(command)
    || /^mkfs\b/.test(command)
    || /^dd\s+if=/.test(command)
    || /^fdisk\b/.test(command);
}
export function showApproval(log, a, __, scrollCb) {
  const d = el('div', 'approval');
  const prefix = a.tool === 'bash' ? bashCommandPrefix(a.subject) : '';
  const hasPrefix = prefix !== '';
  const prefixRule = hasPrefix ? 'Bash('+prefix+')' : '';
  const actions = [
    '<button class="approval__btn approval__btn--allow" data-allow="true" data-session="false"><span class="approval__key">Y</span> '+__('allow')+'</button>',
  ];
  if (hasPrefix) {
    actions.push('<button class="approval__btn approval__btn--allow" data-allow="true" data-session="true" data-scope="prefix"><span class="approval__key">A</span> '+escHtml(__('session')+' '+prefixRule)+'</button>');
    actions.push('<button class="approval__btn approval__btn--allow" data-allow="true" data-session="true" data-persist="true" data-scope="prefix"><span class="approval__key">P</span> '+escHtml(__('persist_tool')+' '+prefixRule)+'</button>');
  } else {
    actions.push('<button class="approval__btn approval__btn--allow" data-allow="true" data-session="true"><span class="approval__key">A</span> '+escHtml(approvalSessionLabel(a,__))+'</button>');
    actions.push('<button class="approval__btn approval__btn--allow" data-allow="true" data-session="true" data-persist="true"><span class="approval__key">P</span> '+escHtml(approvalPersistentLabel(a,__))+'</button>');
  }
  actions.push('<button class="approval__btn approval__btn--deny" data-allow="false"><span class="approval__key">N</span> '+__('deny')+'</button>');
  d.innerHTML='<div class="approval__header"><svg class="approval__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg><span class="approval__title">'+__('approval_title')+'</span></div><div class="approval__subject">'+escHtml(a.tool)+(a.subject?' — '+escHtml(a.subject):'')+'</div><div class="approval__actions">'+actions.join('')+'</div>';
  log.appendChild(d);
  scrollCb?.();
  const resolve = payload => { post('/approve', Object.assign({id:a.id}, payload)); d.remove(); document.removeEventListener('keydown', onkey); };
  d.querySelectorAll('.approval__btn').forEach(btn => {
    btn.onclick = () => resolve({allow:btn.dataset.allow==='true',session:btn.dataset.session==='true',persist:btn.dataset.persist==='true',scope:btn.dataset.scope||''});
  });
  const onkey = e => {
    const k = e.key.toLowerCase();
    if (k === 'y' || k === '1') { resolve({allow:true,session:false}); }
    else if (k === 'a' || k === '2') { resolve({allow:true,session:true}); }
    else if (hasPrefix && k === '3') { resolve({allow:true,session:true,scope:'prefix'}); }
    else if (k === 'p' || (!hasPrefix && k === '3') || (hasPrefix && k === '4')) { resolve({allow:true,session:true,persist:true,scope:hasPrefix?'prefix':''}); }
    else if (k === 'n' || k === 'escape' || (!hasPrefix && k === '4') || (hasPrefix && k === '5')) { resolve({allow:false,session:false}); }
  };
  document.addEventListener('keydown', onkey);
}

// ── ask ──
export function showAsk(log, ask, __, scrollCb) {
  const d = el('div', 'ask');
  ask.questions.forEach(q => {
    const qDiv = el('div');
    qDiv.appendChild(el('div', 'ask__prompt', q.prompt));
    const opts = el('div', 'ask__options');
    const selected = new Set();
    q.options.forEach((o, i) => {
      const opt = el('button', 'ask__opt');
      opt.innerHTML = '<div><div class="ask__opt-label">' + escHtml(o.label) + '</div>' + (o.description ? '<div class="ask__opt-desc">' + escHtml(o.description) + '</div>' : '') + '</div>';
      opt.onclick = () => {
        if (q.multi) { selected.has(i) ? selected.delete(i) : selected.add(i); opt.classList.toggle('ask__opt--selected', selected.has(i)); }
        else { selected.clear(); selected.add(i); opts.querySelectorAll('.ask__opt').forEach((o,j) => o.classList.toggle('ask__opt--selected', j === i)); }
      };
      opts.appendChild(opt);
    });
    qDiv.appendChild(opts);
    const submit = el('button', 'ask__submit', __('submit'));
    submit.disabled = true;
    opts.addEventListener('click', () => { submit.disabled = selected.size === 0; });
    submit.onclick = () => {
      const answers = ask.questions.map(qq => ({questionId:qq.id, selected:Array.from(selected).map(i => qq.options[i].label)}));
      post('/answer', {id:ask.id, answers});
      d.remove();
    };
    qDiv.appendChild(submit);
    d.appendChild(qDiv);
  });
  log.appendChild(d);
  scrollCb?.();
}

// ── compaction ──
export function showCompaction(log, c, __, scrollCb) {
  const d = el('div', 'compaction');
  if (c.summary) {
    const head = el('div', 'compaction__head');
    head.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/><line x1="14" y1="10" x2="21" y2="3"/><line x1="3" y1="21" x2="10" y2="14"/></svg>';
    head.appendChild(el('span', 'compaction__title', __('compacted')));
    head.appendChild(el('span', '', c.messages + ' ' + __('messages')));
    const body = el('div', 'compaction__body', c.summary);
    head.onclick = () => body.classList.toggle('compaction__body--open');
    d.appendChild(head);
    d.appendChild(body);
  } else {
    d.textContent = __('compacting');
  }
  log.appendChild(d);
  scrollCb?.();
}

// ── rewind picker ──
export let rewindCheckpoints = [];
let rewindStage = 0, rewindSelected = 0, rewindScope = 0;
export { rewindStage, rewindSelected, rewindScope };
export const SCOPES = [
  {key:'b', label:'scope_both', scope:'both'},
  {key:'c', label:'scope_conversation', scope:'conversation'},
  {key:'d', label:'scope_code', scope:'code'},
  {key:'f', label:'fork', scope:'fork'},
  {key:'s', label:'scope_sumfrom', scope:'sumfrom'},
  {key:'u', label:'scope_sumupto', scope:'sumupto'},
];

export function openRewindPicker(__) {
  getJSON('/checkpoints').then(cps => {
    if (!cps || cps.length === 0) {
      document.body.appendChild(el('div', 'notice', __('no_checkpoints')));
      return;
    }
    rewindCheckpoints = cps;
    rewindStage = 0;
    rewindSelected = 0;
    rewindScope = 0;
    renderRewindPicker(__);
  }).catch(() => {});
}

export function renderRewindPicker(__) {
  let overlay = document.getElementById('rewind-overlay');
  if (overlay) overlay.remove();
  overlay = el('div', 'rewind-overlay');
  overlay.id = 'rewind-overlay';
  const picker = el('div', 'rewind-picker');

  if (rewindStage === 0) {
    picker.innerHTML = '<div class="rewind-picker__head"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg> ' + __('rewind_title') + '</div>';
    const list = el('div', 'rewind-picker__list');
    rewindCheckpoints.forEach((cp, i) => {
      const item = el('div', 'rewind-picker__item' + (i === rewindSelected ? ' rewind-picker__item--active' : ''));
      item.innerHTML = '<span class="rewind-picker__turn">#' + cp.turn + '</span><span class="rewind-picker__prompt">' + escHtml((cp.prompt||'').slice(0,80)) + '</span><span class="rewind-picker__files">' + cp.files + ' ' + __('files') + '</span>';
      item.onclick = () => { rewindSelected = i; renderRewindPicker(__); };
      list.appendChild(item);
    });
    picker.appendChild(list);
    picker.appendChild(el('div', 'rewind-picker__foot', '<span>'+__('nav_jk')+'</span><span>'+__('nav_enter_esc')+'</span>'));
  } else {
    const cp = rewindCheckpoints[rewindSelected];
    picker.innerHTML = '<div class="rewind-picker__head"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg> ' + __('action_title').replace('#{turn}', cp.turn) + '</div>';
    const scopes = el('div', 'rewind-picker__scopes');
    SCOPES.forEach((s, i) => {
      const item = el('div', 'rewind-picker__scope' + (i === rewindScope ? ' rewind-picker__scope--active' : ''));
      item.innerHTML = '<span class="rewind-picker__scope-key">' + s.key + '</span>' + __(s.label);
      item.onclick = () => { rewindScope = i; applyRewind(); };
      scopes.appendChild(item);
    });
    picker.appendChild(scopes);
    picker.appendChild(el('div', 'rewind-picker__foot', '<span>'+__('nav_keys')+'</span><span>'+__('nav_apply_esc')+'</span>'));
  }

  overlay.appendChild(picker);
  overlay.onclick = e => { if (e.target === overlay) overlay.remove(); };
  document.body.appendChild(overlay);
}

export function applyRewind() {
  const cp = rewindCheckpoints[rewindSelected];
  const sc = SCOPES[rewindScope];
  const overlay = document.getElementById('rewind-overlay');
  if (overlay) overlay.remove();
  if (sc.scope === 'fork') { post('/fork', {turn:cp.turn, name:''}); }
  else if (sc.scope === 'sumfrom') { post('/summarize', {turn:cp.turn, mode:'from'}); }
  else if (sc.scope === 'sumupto') { post('/summarize', {turn:cp.turn, mode:'upto'}); }
  else { post('/rewind', {turn:cp.turn, scope:sc.scope}); }
}

export function setupRewindKeyboardNav(__, renderRewindPicker) {
  document.addEventListener('keydown', e => {
    const overlay = document.getElementById('rewind-overlay');
    if (!overlay) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      if (rewindStage === 0) overlay.remove();
      else { rewindStage = 0; renderRewindPicker(__); }
      return;
    }
    if (rewindStage === 0) {
      if (e.key === 'j' || e.key === 'ArrowDown') { e.preventDefault(); rewindSelected = Math.min(rewindSelected + 1, rewindCheckpoints.length - 1); renderRewindPicker(__); }
      if (e.key === 'k' || e.key === 'ArrowUp') { e.preventDefault(); rewindSelected = Math.max(rewindSelected - 1, 0); renderRewindPicker(__); }
      if (e.key === 'Enter') { e.preventDefault(); rewindStage = 1; rewindScope = 0; renderRewindPicker(__); }
    } else {
      if (e.key === 'j' || e.key === 'ArrowDown') { e.preventDefault(); rewindScope = Math.min(rewindScope + 1, SCOPES.length - 1); renderRewindPicker(__); }
      if (e.key === 'k' || e.key === 'ArrowUp') { e.preventDefault(); rewindScope = Math.max(rewindScope - 1, 0); renderRewindPicker(__); }
      if (e.key === 'Enter') { e.preventDefault(); applyRewind(); }
      const idx = SCOPES.findIndex(s => s.key === e.key);
      if (idx >= 0) { e.preventDefault(); rewindScope = idx; applyRewind(); }
    }
  });
}

// ── history rendering ──
export function renderHistoryMessages(log, welcome, state, ms, toolCards, __, scrollCb) {
  if (!ms || ms.length === 0) return;
  if (welcome) welcome.style.display = 'none';
  toolCards = {};
  const resultById = new Map();
  ms.forEach(m => { if (m.role === 'tool' && m.toolCallId && !resultById.has(m.toolCallId)) resultById.set(m.toolCallId, m); });
  const consumed = new Set();
  let seq = 0;
  ms.forEach(m => {
    if (m.role === 'system') return;
    if (m.role === 'user') { if (m.content) addUserMsg(log, welcome, m.content, scrollCb); return; }
    if (m.role === 'assistant') {
      if (m.reasoning) { appendReasoning(log, welcome, state, m.reasoning, __, scrollCb); }
      if (m.content) { appendText(log, welcome, state, m.content, scrollCb); }
      if (m.content || m.reasoning) finalizeMsg(state);
      (m.toolCalls || []).forEach(tc => {
        const id = tc.id || 'hist-tool-' + (seq++);
        renderToolDispatch(log, {id, name:tc.name, args:tc.arguments||'', readOnly:false}, toolCards, welcome, scrollCb);
        const result = resultById.get(tc.id);
        if (tc.id) consumed.add(tc.id);
        if (result) renderToolResult({id, name:tc.name, output:result.content||''}, toolCards, scrollCb);
      });
      return;
    }
    if (m.role === 'tool') {
      if (m.toolCallId && consumed.has(m.toolCallId)) return;
      const id = m.toolCallId || 'hist-tool-' + (seq++);
      renderToolDispatch(log, {id, name:m.toolName||'tool', args:'', readOnly:false}, toolCards, welcome, scrollCb);
      renderToolResult({id, name:m.toolName||'tool', output:m.content||''}, toolCards, scrollCb);
    }
  });
  state.currentMsg = null;
  state.currentText = null;
  state.currentReasoning = null;
  scrollCb?.();
}

// ── todo panel ──
export function parseTodos(args) {
  try { const a = JSON.parse(args); return Array.isArray(a.todos) ? a.todos : []; }
  catch { return []; }
}
export function renderTodoPanel(todosState, todosDismissed) {
  const panel = document.getElementById('todo-panel');
  const list = document.getElementById('todos-list');
  const badge = document.getElementById('todos-badge');
  const summary = document.getElementById('todos-summary');
  const dismiss = document.getElementById('todos-dismiss');
  if (!panel || todosDismissed) { panel?.classList.remove('todos--visible'); return; }
  if (!todosState.length) { panel.classList.remove('todos--visible'); return; }
  const done = todosState.filter(t => String(t.status||'').trim() === 'completed').length;
  const total = todosState.length;
  const current = todosState.find(t => String(t.status||'').trim() === 'in_progress');
  const allDone = done === total;
  badge.textContent = done + '/' + total;
  summary.textContent = (current?.activeForm || current?.content || todosState[todosState.length-1]?.content || '').slice(0, 60);
  dismiss.style.display = allDone ? '' : 'none';
  if (allDone) panel.classList.add('todos--collapsed');
  list.innerHTML = '';
  todosState.forEach((t) => {
    const st = String(t.status||'').trim();
    const li = el('li', 'todos__item todos__item--' + st + (t.level ? ' todos__item--sub' : ''));
    li.innerHTML = '<span class="todos__status todos__status--' + st + '">' + (st === 'completed' ? '✓' : st === 'in_progress' ? '▶' : '○') + '</span><span class="todos__text">' + escHtml((st === 'in_progress' && t.activeForm) ? t.activeForm : t.content) + '</span>';
    list.appendChild(li);
  });
  panel.classList.add('todos--visible');
}

// ── stats modal ──
export function openStats(sessionCount, cumulativeTokens, cumulativeCost, cumulativeCacheHit, cumulativeCacheMiss, fmtTok, fmtMoney) {
  const modal = document.getElementById('stats-modal');
  if (!modal) return;
  getJSON('/status').then(s => {
    document.getElementById('stats-model').textContent = s.label || '-';
    document.getElementById('stats-sessions').textContent = sessionCount || '0';
    const total = cumulativeTokens || s.used || 0;
    document.getElementById('stats-total-tokens').textContent = total >= 1000 ? fmtTok(total) : String(total);
    const hit = cumulativeCacheHit || s.cacheHit || 0, miss = cumulativeCacheMiss || s.cacheMiss || 0;
    const rate = hit + miss > 0 ? Math.round(hit / (hit + miss) * 100) + '%' : '0%';
    document.getElementById('stats-cache-rate').textContent = rate;
    const cost = cumulativeCost || s.lastUsage?.cost || 0;
    document.getElementById('stats-total-cost').textContent = cost > 0 ? fmtMoney(cost, s.lastUsage?.currency) : '-';
    document.getElementById('stats-balance').textContent = s.balance?.display || '-';
    if (s.window) {
      const pct = Math.min(100, Math.round(s.used / s.window * 100));
      document.getElementById('stats-ctx-fill').style.width = pct + '%';
      document.getElementById('stats-ctx-used').textContent = fmtTok(s.used) + ' tok';
      document.getElementById('stats-ctx-window').textContent = fmtTok(s.window) + ' tok';
    }
  }).catch(() => {});
  modal.style.display = 'flex';
}
