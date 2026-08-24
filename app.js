// app.js - 由 app-v3.js ~ app-v27.js 按原 index.html 加载顺序合并而成（纯合并，逻辑未变）。
// 原始文件边界以 /* ===== 文件名 ===== */ 注释分隔；合并理由与验证见对应 PR 与 ROADMAP.md Phase 0。
/* ===== app-v3.js ===== */
const API = 'https://kdwpmcdxapwecbfrvqtm.supabase.co/functions/v1/score-tracker-api';
const SUBJECTS = ['语文', '数学', '英语', '物理', '化学', '生物', '历史', '地理', '政治'];
const SUBJECT_SHORT = { 语文: '语', 数学: '数', 英语: '英', 物理: '物', 化学: '化', 生物: '生', 历史: '史', 地理: '地', 政治: '政' };
const SUBJECT_MAX = { 语文: 150, 数学: 150, 英语: 150, 物理: 100, 化学: 100, 生物: 100, 历史: 100, 地理: 100, 政治: 100 };
const RADAR_COLORS = ['#5d72e8', '#32a77a', '#e59b45', '#df5f68'];
const state = {
  token: localStorage.getItem('st_token') || '',
  user: null,
  exams: [],
  page: 'home',
  subject: '总分',
  modal: null,
  onboarding: null,
  radarMode: 'actual',
  radarSelection: []
};

const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];

injectExtraStyles();

async function api(action, payload = {}) {
  const res = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, token: state.token, ...payload })
  });
  const data = await res.json().catch(() => ({ error: '网络响应异常' }));
  if (!res.ok) {
    if (res.status === 401 && action !== 'login' && action !== 'register') {
      localStorage.removeItem('st_token');
      state.token = '';
      state.user = null;
      renderLogin();
    }
    throw new Error(data.error || '请求失败');
  }
  return data;
}

function injectExtraStyles() {
  if ($('#app-v3-extra-style')) return;
  const style = document.createElement('style');
  style.id = 'app-v3-extra-style';
  style.textContent = `
    .stack-main{display:grid;gap:18px;min-width:0}
    .radar-card{padding:22px}
    .radar-toolbar{display:grid;gap:12px;margin-bottom:12px}
    .toggle-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
    .toggle-row .label{font-size:12px;color:var(--muted);font-weight:700}
    .subtle-note{font-size:12px;color:var(--muted);line-height:1.6}
    .multi-select{display:flex;gap:8px;overflow:auto;padding-bottom:4px;scrollbar-width:none}
    .multi-select::-webkit-scrollbar{display:none}
    .select-pill{border:1px solid var(--line);background:#fff;border-radius:999px;padding:8px 12px;font-size:12px;color:var(--muted);white-space:nowrap}
    .select-pill.active{background:var(--text);color:#fff;border-color:var(--text)}
    .radar-wrap{height:360px;position:relative;margin-top:4px}
    .radar-wrap svg{width:100%;height:100%}
    .radar-legend{display:flex;gap:10px;flex-wrap:wrap;margin-top:10px}
    .legend-pill{display:inline-flex;align-items:center;gap:8px;background:#f7f8fb;border:1px solid var(--line);border-radius:999px;padding:7px 10px;font-size:12px;color:#566172}
    .legend-pill i{width:10px;height:10px;border-radius:999px;display:inline-block}
    .radar-summary{margin-top:14px;display:grid;grid-template-columns:1fr 1fr;gap:12px}
    .summary-card{border:1px solid var(--line);background:#fafbfe;border-radius:16px;padding:14px}
    .summary-card h4{margin:0 0 8px;font-size:13px}
    .summary-list{display:grid;gap:7px;font-size:12px;color:#566172}
    .summary-item{display:flex;align-items:center;justify-content:space-between;gap:10px}
    .summary-item b{color:var(--text)}
    .comparison-grid{display:grid;gap:8px;font-size:12px;color:#566172}
    .comparison-strong{font-weight:700;color:var(--text)}
    .comparison-positive{color:var(--green);font-weight:700}
    .comparison-negative{color:var(--danger);font-weight:700}
    @media(max-width:880px){.radar-summary{grid-template-columns:1fr}.radar-wrap{height:330px}}
    @media(max-width:620px){.radar-card{padding:17px 14px}.radar-wrap{height:300px}.select-pill,.legend-pill{font-size:11px;padding:7px 10px}.summary-card{padding:12px}}
  `;
  document.head.appendChild(style);
}

function escapeHtml(v = '') {
  return String(v).replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}
function fmtDate(d) {
  if (!d) return '';
  const x = new Date(`${d}T00:00:00`);
  return `${x.getMonth() + 1}月${x.getDate()}日`;
}
function fmtYearDate(d) {
  if (!d) return '';
  const x = new Date(`${d}T00:00:00`);
  return `${x.getFullYear()}.${String(x.getMonth() + 1).padStart(2, '0')}.${String(x.getDate()).padStart(2, '0')}`;
}
function num(v) {
  return v === null || v === undefined || v === '' ? null : Number(v);
}
function formatScore(v) {
  if (v === null || v === undefined || Number.isNaN(Number(v))) return '—';
  const n = Number(v);
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}
function formatPercent(v) {
  if (v === null || v === undefined || Number.isNaN(Number(v))) return '—';
  const n = Math.round(Number(v) * 10) / 10;
  return `${Number.isInteger(n) ? n.toFixed(0) : n.toFixed(1)}%`;
}
function defaultMax(subject) {
  return SUBJECT_MAX[subject] || 100;
}
function examScore(exam, subject, key) {
  return num(exam?.scores?.[subject]?.[key]);
}
function examMax(exam, subject) {
  return num(exam?.scores?.[subject]?.max) ?? defaultMax(subject);
}
function scoreRate(exam, subject, key) {
  const score = examScore(exam, subject, key);
  const max = examMax(exam, subject);
  if (score === null || !max) return null;
  return Math.max(0, Math.min(100, (score / max) * 100));
}
function totalFor(exam, key) {
  let sum = 0;
  let count = 0;
  SUBJECTS.forEach((s) => {
    const v = examScore(exam, s, key);
    if (v !== null) {
      sum += v;
      count += 1;
    }
  });
  return count ? sum : null;
}
function totalMax(exam, key) {
  let sum = 0;
  let count = 0;
  SUBJECTS.forEach((s) => {
    const v = examScore(exam, s, key);
    if (v !== null) {
      sum += examMax(exam, s);
      count += 1;
    }
  });
  return count ? sum : null;
}
function totalRate(exam, key) {
  const score = totalFor(exam, key);
  const max = totalMax(exam, key);
  if (score === null || !max) return null;
  return (score / max) * 100;
}
function latestActualTotal() {
  const valid = [...state.exams].reverse().map((e) => ({ e, v: totalFor(e, 'actual') })).find((x) => x.v !== null);
  return valid?.v ?? null;
}
function latestTargetTotal() {
  const valid = [...state.exams].reverse().map((e) => ({ e, v: totalFor(e, 'target') })).find((x) => x.v !== null);
  return valid?.v ?? null;
}
function trendDelta() {
  const vals = state.exams.map((e) => totalFor(e, 'actual')).filter((v) => v !== null);
  return vals.length > 1 ? vals.at(-1) - vals.at(-2) : null;
}
function recordedCount() {
  return state.exams.filter((e) => SUBJECTS.some((s) => examScore(e, s, 'actual') !== null)).length;
}
function toast(msg) {
  let t = $('.toast');
  if (!t) {
    t = document.createElement('div');
    t.className = 'toast';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.remove('show'), 1800);
}

function radarAvailableExams(mode = state.radarMode) {
  return state.exams.filter((exam) => SUBJECTS.some((subject) => scoreRate(exam, subject, mode) !== null));
}
function ensureRadarSelection() {
  const available = radarAvailableExams();
  const availableIds = new Set(available.map((exam) => exam.id));
  state.radarSelection = state.radarSelection.filter((id) => availableIds.has(id)).slice(0, 4);
  if (!state.radarSelection.length && available.length) {
    state.radarSelection = available.slice(-2).map((exam) => exam.id);
  }
  if (!state.radarSelection.length && state.radarMode === 'actual') {
    const targetAvailable = radarAvailableExams('target');
    if (targetAvailable.length) {
      state.radarMode = 'target';
      state.radarSelection = targetAvailable.slice(-2).map((exam) => exam.id);
    }
  }
}
function selectedRadarExams() {
  ensureRadarSelection();
  return state.radarSelection
    .map((id) => state.exams.find((exam) => exam.id === id))
    .filter(Boolean)
    .sort((a, b) => new Date(a.exam_date) - new Date(b.exam_date));
}

async function init() {
  if (state.token) {
    try {
      const me = await api('me');
      state.user = me.user;
      await loadExams();
      render();
      return;
    } catch (e) {}
  }
  renderLogin();
}

async function startRegister() {
  $('#app').innerHTML = '<div class="splash"><div class="brand-mark">↗</div><div>正在创建你的专属账号</div><small>只需要几秒钟</small></div>';
  try {
    const data = await api('register');
    state.token = data.token;
    state.user = data.user;
    localStorage.setItem('st_token', data.token);
    localStorage.setItem('st_known_user', '1');
    state.onboarding = { username: data.user.username, password: data.password };
    await loadExams();
    state.page = 'home';
    render();
  } catch (e) {
    renderLogin(e.message);
  }
}

async function loadExams() {
  const data = await api('list_exams');
  state.exams = data.exams || [];
  ensureRadarSelection();
}

function render() {
  if (!state.user) {
    renderLogin();
    return;
  }
  const app = $('#app');
  app.innerHTML = `<div class="shell">
    <header class="topbar"><div class="brand"><div class="logo">↗</div><div><h1>成绩轨迹</h1><p>把每一次努力，连成一条向上的线</p></div></div>
    <nav class="desktop-nav">${navButton('home', '概览')}${navButton('records', '考试记录')}${navButton('account', '账号')}</nav></header>
    <main id="content"></main></div>
    <nav class="bottom-nav">${bottomButton('home', '⌂', '概览')}${bottomButton('records', '▤', '记录')}${bottomButton('account', '○', '账号')}</nav>`;
  renderPage();
  bindNav();
  if (state.onboarding) showOnboarding();
}
function navButton(p, label) {
  return `<button class="nav-btn ${state.page === p ? 'active' : ''}" data-page="${p}">${label}</button>`;
}
function bottomButton(p, icon, label) {
  return `<button class="${state.page === p ? 'active' : ''}" data-page="${p}"><span>${icon}</span><span>${label}</span></button>`;
}
function bindNav() {
  $$('[data-page]').forEach((b) => {
    b.onclick = () => {
      state.page = b.dataset.page;
      render();
    };
  });
}
function renderPage() {
  const c = $('#content');
  if (state.page === 'home') c.innerHTML = homeHtml();
  if (state.page === 'records') c.innerHTML = recordsHtml();
  if (state.page === 'account') c.innerHTML = accountHtml();
  bindPage();
}

function homeHtml() {
  const actual = latestActualTotal();
  const target = latestTargetTotal();
  const delta = trendDelta();
  const last = state.exams.at(-1);
  return `<section class="hero">
    <div class="card hero-main"><span class="eyebrow">✦ 本学年成长记录</span><h2>${state.exams.length ? '看见起伏，也看见自己在进步。' : '从第一次考试开始，记录你的上升轨迹。'}</h2><p class="hero-desc">记录语数英物化生史地政 9 科的目标与真实成绩，折线图看总趋势，雷达图看结构变化，更容易找到弱项并追踪改善。</p><div class="hero-actions"><button class="primary" id="addExamHome">＋ 记录一次考试</button><button class="secondary" data-page="records">查看全部记录</button></div></div>
    <div class="card hero-stat"><div><div class="stat-label">最近一次真实总分</div><div class="stat-value">${actual === null ? '—' : formatScore(actual)}</div><div class="stat-sub">${last ? `${escapeHtml(last.name)} · ${fmtDate(last.exam_date)}` : '还没有真实成绩记录'}</div></div>${delta === null ? '' : `<span class="trend-pill">${delta >= 0 ? '↗' : '↘'} 较上次 ${delta >= 0 ? '+' : ''}${formatScore(delta)} 分</span>`}</div>
  </section>
  <section class="grid-main"><div class="stack-main"><div class="card chart-card"><div class="card-title-row"><div><h3 class="card-title">成绩趋势</h3><p class="card-sub">真实成绩与目标成绩放在同一张图里</p></div><div class="legend"><span><i class="actual"></i>真实成绩</span><span><i class="target"></i>目标成绩</span></div></div><div class="chips">${['总分', ...SUBJECTS].map((s) => `<button class="chip ${state.subject === s ? 'active' : ''}" data-subject="${s}">${s}</button>`).join('')}</div><div class="chart-wrap" id="chart">${chartHtml()}</div></div>${radarCardHtml()}</div>
  <div class="side-stack"><div class="card quick-card"><h3 class="card-title">这一年的记录</h3><div class="quick-grid"><div class="mini-stat"><b>${state.exams.length}</b><span>次考试</span></div><div class="mini-stat"><b>${recordedCount()}</b><span>次已出分</span></div><div class="mini-stat"><b>${target === null ? '—' : formatScore(target)}</b><span>最近目标总分</span></div><div class="mini-stat"><b>${delta === null ? '—' : `${delta >= 0 ? '+' : ''}${formatScore(delta)}`}</b><span>最近变化</span></div></div></div>
  <div class="card recent-card"><div class="card-title-row"><div><h3 class="card-title">最近考试</h3><p class="card-sub">点击可编辑或补录成绩</p></div></div>${recentHtml()}</div></div></section>`;
}

function recentHtml() {
  if (!state.exams.length) return `<div class="empty-chart" style="height:150px"><div><div class="empty-icon">✎</div>第一条记录，会成为你的起点</div></div>`;
  return [...state.exams].reverse().slice(0, 4).map((e, i) => {
    const a = totalFor(e, 'actual');
    return `<div class="exam-item clickable" data-edit="${e.id}"><div class="exam-dot">${i + 1}</div><div class="exam-info"><b>${escapeHtml(e.name)}</b><span>${fmtYearDate(e.exam_date)}</span></div><div class="exam-score">${a === null ? '待补录' : formatScore(a)}</div></div>`;
  }).join('');
}

function chartHtml() {
  if (!state.exams.length) return `<div class="empty-chart"><div><div class="empty-icon">⌁</div>记录考试后，这里会自动出现趋势线</div></div>`;
  const points = state.exams.map((e) => ({
    name: e.name,
    date: e.exam_date,
    actual: state.subject === '总分' ? totalFor(e, 'actual') : examScore(e, state.subject, 'actual'),
    target: state.subject === '总分' ? totalFor(e, 'target') : examScore(e, state.subject, 'target')
  }));
  const vals = points.flatMap((p) => [p.actual, p.target]).filter((v) => v !== null);
  if (!vals.length) return `<div class="empty-chart"><div><div class="empty-icon">⌁</div>这个科目还没有成绩数据</div></div>`;
  let max = Math.max(...vals), min = Math.min(...vals);
  const pad = Math.max(10, (max - min) * 0.18);
  max = Math.ceil((max + pad) / 10) * 10;
  min = Math.max(0, Math.floor((min - pad) / 10) * 10);
  if (max === min) max = min + 100;
  const W = 760, H = 300, L = 46, R = 18, T = 20, B = 46;
  const cw = W - L - R, ch = H - T - B;
  const x = (i) => points.length === 1 ? L + cw / 2 : L + (i / (points.length - 1)) * cw;
  const y = (v) => T + (max - v) / (max - min) * ch;
  const ticks = 5;
  let grid = '';
  for (let i = 0; i <= ticks; i += 1) {
    const v = max - ((max - min) * i / ticks);
    const yy = T + (ch * i / ticks);
    grid += `<line x1="${L}" y1="${yy}" x2="${W - R}" y2="${yy}" stroke="#edf0f4"/><text x="${L - 9}" y="${yy + 4}" text-anchor="end" class="axis-label">${Math.round(v)}</text>`;
  }
  const line = (key, color, dash = '') => {
    let d = '';
    let started = false;
    let circles = '';
    points.forEach((p, i) => {
      const v = p[key];
      if (v === null) {
        started = false;
        return;
      }
      const xx = x(i), yy = y(v);
      d += `${started ? 'L' : 'M'} ${xx} ${yy} `;
      started = true;
      circles += `<circle cx="${xx}" cy="${yy}" r="5" fill="#fff" stroke="${color}" stroke-width="3" data-tip="${escapeHtml(p.name)} · ${key === 'actual' ? '真实' : '目标'} ${formatScore(v)}"/>`;
    });
    return `<path d="${d}" fill="none" stroke="${color}" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" ${dash ? `stroke-dasharray="${dash}"` : ''}/>${circles}`;
  };
  const labels = points.map((p, i) => `<text x="${x(i)}" y="${H - 17}" text-anchor="middle" class="axis-label">${fmtDate(p.date)}</text>`).join('');
  return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">${grid}${line('target', '#32a77a', '7 7')}${line('actual', '#5d72e8')}${labels}</svg><div class="tooltip-card" id="chartTip"></div>`;
}

function radarCardHtml() {
  const available = radarAvailableExams();
  const selected = selectedRadarExams();
  return `<div class="card radar-card"><div class="card-title-row"><div><h3 class="card-title">全部科目雷达图</h3><p class="card-sub">按得分率绘制，支持叠加多次考试，直观看出弱项是否改善</p></div></div>
    <div class="radar-toolbar"><div class="toggle-row"><span class="label">查看内容</span><button class="chip ${state.radarMode === 'actual' ? 'active' : ''}" data-radar-mode="actual">真实成绩</button><button class="chip ${state.radarMode === 'target' ? 'active' : ''}" data-radar-mode="target">目标成绩</button></div><div><div class="subtle-note">最多可叠加 4 次考试，推荐对比最近几次，找出最薄弱学科和进步最明显的学科。</div><div class="multi-select" style="margin-top:8px">${available.length ? available.map((exam) => `<button class="select-pill ${state.radarSelection.includes(exam.id) ? 'active' : ''}" data-radar-exam="${exam.id}">${escapeHtml(exam.name)} · ${fmtDate(exam.exam_date)}</button>`).join('') : '<span class="subtle-note">当前还没有可用于雷达图的数据</span>'}</div></div></div>
    <div class="radar-wrap" id="radarChart">${radarChartHtml(selected)}</div>${radarLegendHtml(selected)}${radarSummaryHtml(selected)}</div>`;
}

function radarLegendHtml(selected) {
  if (!selected.length) return '';
  return `<div class="radar-legend">${selected.map((exam, index) => `<span class="legend-pill"><i style="background:${RADAR_COLORS[index % RADAR_COLORS.length]}"></i>${escapeHtml(exam.name)} · ${fmtDate(exam.exam_date)}</span>`).join('')}</div>`;
}

function radarChartHtml(selected) {
  if (!selected.length) return `<div class="empty-chart"><div><div class="empty-icon">◎</div>选择 1 次或多次考试后，这里会显示全部科目的结构变化</div></div>`;
  const W = 760, H = 360;
  const cx = 380, cy = 180, radius = 122;
  const angleStep = (Math.PI * 2) / SUBJECTS.length;
  const angleAt = (i) => -Math.PI / 2 + i * angleStep;
  const pointAt = (ratio, i) => {
    const angle = angleAt(i);
    const r = radius * ratio;
    return [cx + Math.cos(angle) * r, cy + Math.sin(angle) * r];
  };
  let grid = '';
  [0.2, 0.4, 0.6, 0.8, 1].forEach((ratio) => {
    const pts = SUBJECTS.map((_, i) => pointAt(ratio, i).join(',')).join(' ');
    grid += `<polygon points="${pts}" fill="none" stroke="#edf0f4"/>`;
    grid += `<text x="${cx + 8}" y="${cy - radius * ratio + 4}" class="axis-label">${Math.round(ratio * 100)}%</text>`;
  });
  SUBJECTS.forEach((subject, i) => {
    const [x, y] = pointAt(1, i);
    grid += `<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" stroke="#edf0f4"/>`;
    const labelPos = pointAt(1.14, i);
    grid += `<text x="${labelPos[0]}" y="${labelPos[1]}" text-anchor="middle" dominant-baseline="middle" class="axis-label" style="font-size:12px;fill:#55627a">${SUBJECT_SHORT[subject]}</text>`;
  });
  const polygons = selected.map((exam, index) => {
    const color = RADAR_COLORS[index % RADAR_COLORS.length];
    const points = SUBJECTS.map((subject, i) => {
      const ratio = (scoreRate(exam, subject, state.radarMode) ?? 0) / 100;
      return pointAt(ratio, i).join(',');
    }).join(' ');
    const circles = SUBJECTS.map((subject, i) => {
      const rate = scoreRate(exam, subject, state.radarMode);
      const ratio = (rate ?? 0) / 100;
      const [x, y] = pointAt(ratio, i);
      return `<circle cx="${x}" cy="${y}" r="4" fill="#fff" stroke="${color}" stroke-width="2"/>`;
    }).join('');
    return `<polygon points="${points}" fill="${color}22" stroke="${color}" stroke-width="2.5"/>${circles}`;
  }).join('');
  return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${grid}${polygons}</svg>`;
}

function radarSummaryHtml(selected) {
  if (!selected.length) return '';
  const latest = selected.at(-1);
  const earliest = selected[0];
  const weakness = SUBJECTS
    .map((subject) => ({ subject, rate: scoreRate(latest, subject, state.radarMode) }))
    .filter((item) => item.rate !== null)
    .sort((a, b) => a.rate - b.rate)
    .slice(0, 3);
  const comparisons = SUBJECTS
    .map((subject) => {
      const latestRate = scoreRate(latest, subject, state.radarMode);
      const earliestRate = scoreRate(earliest, subject, state.radarMode);
      if (latestRate === null || earliestRate === null) return null;
      return { subject, delta: latestRate - earliestRate, latestRate };
    })
    .filter(Boolean)
    .sort((a, b) => b.delta - a.delta);
  const best = comparisons[0] || null;
  const worst = comparisons.at(-1) || null;
  const averageRate = totalRate(latest, state.radarMode);
  return `<div class="radar-summary"><div class="summary-card"><h4>当前薄弱科目</h4><div class="summary-list">${weakness.length ? weakness.map((item, index) => `<div class="summary-item"><span>${index + 1}. <b>${item.subject}</b></span><span>${formatPercent(item.rate)}</span></div>`).join('') : '<div class="subtle-note">这次考试还没有足够数据</div>'}</div></div><div class="summary-card"><h4>${selected.length > 1 ? '对比变化' : '本次概况'}</h4>${selected.length > 1 ? `<div class="comparison-grid"><div>当前对比：<span class="comparison-strong">${escapeHtml(earliest.name)}</span> → <span class="comparison-strong">${escapeHtml(latest.name)}</span></div><div>整体平均得分率：<span class="comparison-strong">${formatPercent(averageRate)}</span></div><div>进步最大：${best ? `<span class="comparison-positive">${best.subject} ${best.delta >= 0 ? '+' : ''}${formatPercent(best.delta).replace('%', '')}%</span>` : '—'}</div><div>需要关注：${worst ? `<span class="comparison-negative">${worst.subject} ${worst.delta >= 0 ? '+' : ''}${formatPercent(worst.delta).replace('%', '')}%</span>` : '—'}</div></div>` : `<div class="comparison-grid"><div>已选择：<span class="comparison-strong">${escapeHtml(latest.name)}</span></div><div>平均得分率：<span class="comparison-strong">${formatPercent(averageRate)}</span></div><div class="subtle-note">再多选几次考试，就可以直接看到弱项改善了多少。</div></div>`}</div></div>`;
}

function recordsHtml() {
  return `<div class="page-head"><div><h2>考试记录</h2><p>按时间整理目标成绩与真实成绩，任何时候都可以回来补录。</p></div><button class="primary" id="addExam">＋ 新建</button></div><div class="card records-card">${state.exams.length ? state.exams.map(recordHtml).join('') : `<div class="empty-chart" style="height:300px"><div><div class="empty-icon">📝</div>还没有考试记录<br><button class="secondary" id="emptyAdd" style="margin-top:14px">记录第一场考试</button></div></div>`}</div>`;
}

function recordHtml(e) {
  const actual = totalFor(e, 'actual');
  const target = totalFor(e, 'target');
  return `<div class="record"><div class="record-date">${fmtYearDate(e.exam_date)}<b>${escapeHtml(e.name)}</b></div><div class="record-scores">${SUBJECTS.map((s) => {
    const a = examScore(e, s, 'actual');
    const t = examScore(e, s, 'target');
    if (a === null && t === null) return '';
    return `<span class="score-tag">${s} ${a === null ? '—' : formatScore(a)}<span style="color:#a1a9b5"> / ${t === null ? '—' : formatScore(t)}</span></span>`;
  }).join('') || '<span class="score-tag">尚未填写分数</span>'}<span class="score-tag"><b>总分 ${actual === null ? '—' : formatScore(actual)}</b> / 目标 ${target === null ? '—' : formatScore(target)}</span></div><div class="record-actions"><button class="icon-btn" title="编辑" data-edit="${e.id}">✎</button><button class="icon-btn danger" title="删除" data-delete="${e.id}">⌫</button></div></div>`;
}

function accountHtml() {
  return `<div class="page-head"><div><h2>账号</h2><p>这个账号让你的成绩记录可以一直保存在云端。</p></div></div><div class="account-grid"><div class="card account-card"><h3 class="card-title">我的账号</h3><p class="card-sub">用户名可以用于以后重新登录</p><div class="account-chip"><code>${escapeHtml(state.user?.username || '')}</code><button class="copy-btn" data-copy="${escapeHtml(state.user?.username || '')}">复制</button></div><div class="info-box" style="margin-top:15px"><b>ⓘ 关于密码</b><br>为了安全，密码只在账号创建时展示一次，服务器只保存经过加密处理的密码摘要，无法再显示原密码。</div></div><div class="card account-card"><h3 class="card-title">数据与安全</h3><p class="card-sub">所有考试与成绩都保存在 Supabase 中，并按账号隔离。</p><div class="danger-zone"><button class="secondary text-danger" id="logoutBtn">退出登录</button></div></div></div>`;
}

function bindPage() {
  $$('[data-page]').forEach((b) => {
    b.onclick = () => {
      state.page = b.dataset.page;
      render();
    };
  });
  $('#addExamHome')?.addEventListener('click', () => openExam());
  $('#addExam')?.addEventListener('click', () => openExam());
  $('#emptyAdd')?.addEventListener('click', () => openExam());
  $$('[data-edit]').forEach((b) => b.onclick = () => openExam(state.exams.find((e) => e.id === b.dataset.edit)));
  $$('[data-delete]').forEach((b) => b.onclick = () => deleteExam(b.dataset.delete));
  $$('[data-subject]').forEach((b) => b.onclick = () => { state.subject = b.dataset.subject; render(); });
  $$('[data-copy]').forEach((b) => b.onclick = async () => {
    try {
      await navigator.clipboard.writeText(b.dataset.copy);
      toast('已复制');
    } catch (e) {
      toast('复制失败，请手动选择');
    }
  });
  $$('[data-radar-mode]').forEach((b) => b.onclick = () => {
    state.radarMode = b.dataset.radarMode;
    state.radarSelection = [];
    ensureRadarSelection();
    render();
  });
  $$('[data-radar-exam]').forEach((b) => b.onclick = () => toggleRadarExam(b.dataset.radarExam));
  $('#logoutBtn')?.addEventListener('click', logout);
  const chart = $('#chart');
  if (chart) {
    $$('[data-tip]', chart).forEach((p) => {
      const show = () => {
        const tip = $('#chartTip');
        tip.textContent = p.dataset.tip;
        tip.style.display = 'block';
        const rect = chart.getBoundingClientRect();
        const cr = p.getBoundingClientRect();
        tip.style.left = `${cr.left - rect.left + cr.width / 2}px`;
        tip.style.top = `${cr.top - rect.top}px`;
      };
      p.addEventListener('mouseenter', show);
      p.addEventListener('click', show);
      p.addEventListener('mouseleave', () => { $('#chartTip').style.display = 'none'; });
    });
  }
}

function toggleRadarExam(id) {
  const selected = new Set(state.radarSelection);
  if (selected.has(id)) {
    selected.delete(id);
  } else {
    if (selected.size >= 4) {
      toast('最多叠加 4 次考试');
      return;
    }
    selected.add(id);
  }
  state.radarSelection = [...selected];
  render();
}

function openExam(exam = null) {
  const editing = !!exam;
  const today = new Date().toISOString().slice(0, 10);
  const scores = exam?.scores || {};
  const modal = document.createElement('div');
  modal.className = 'modal-backdrop';
  modal.innerHTML = `<div class="modal"><div class="modal-head"><h3>${editing ? '编辑考试' : '记录一次考试'}</h3><button class="close-btn" aria-label="关闭">×</button></div><div class="modal-body"><div class="form-grid"><div class="field"><label>考试名称</label><input id="examName" maxlength="60" value="${escapeHtml(exam?.name || '')}" placeholder="例如：高二上学期期中考试"></div><div class="field"><label>考试日期</label><input id="examDate" type="date" value="${exam?.exam_date || today}"></div></div><div class="score-table"><div class="score-row header"><span>科目</span><span>目标成绩</span><span>真实成绩</span><span>满分</span></div>${SUBJECTS.map((s) => `<div class="score-row" data-score-row="${s}"><span class="subject-name">${s}</span><input inputmode="decimal" class="target-input" placeholder="目标" value="${scores[s]?.target ?? ''}"><input inputmode="decimal" class="actual-input" placeholder="考后补录" value="${scores[s]?.actual ?? ''}"><input inputmode="decimal" class="max-input" value="${scores[s]?.max ?? defaultMax(s)}"></div>`).join('')}</div><p class="form-note">语文、数学、英语默认满分 150，其余科目默认满分 100。可以先只填写目标成绩，考完再回来补录真实成绩。未填写的科目不会计入总分。</p><div class="modal-actions"><button class="secondary cancel-btn">取消</button><button class="primary save-btn">${editing ? '保存修改' : '保存考试'}</button></div></div></div>`;
  document.body.appendChild(modal);
  state.modal = modal;
  const close = () => { modal.remove(); state.modal = null; };
  $('.close-btn', modal).onclick = close;
  $('.cancel-btn', modal).onclick = close;
  modal.onclick = (e) => { if (e.target === modal) close(); };
  $('.save-btn', modal).onclick = () => saveExam(exam?.id || null, modal);
}

function validateExam(exam) {
  for (const subject of SUBJECTS) {
    const row = exam.scores[subject] || {};
    const max = num(row.max) ?? defaultMax(subject);
    const target = num(row.target);
    const actual = num(row.actual);
    if (max <= 0) return `${subject} 的满分必须大于 0`;
    if (target !== null && target > max) return `${subject} 的目标成绩不能超过满分 ${formatScore(max)}`;
    if (actual !== null && actual > max) return `${subject} 的真实成绩不能超过满分 ${formatScore(max)}`;
  }
  return '';
}

async function saveExam(id, modal) {
  const btn = $('.save-btn', modal);
  const exam = { id, name: $('#examName', modal).value.trim(), exam_date: $('#examDate', modal).value, scores: {} };
  $$('[data-score-row]', modal).forEach((r) => {
    exam.scores[r.dataset.scoreRow] = {
      target: $('.target-input', r).value,
      actual: $('.actual-input', r).value,
      max: $('.max-input', r).value
    };
  });
  if (!exam.name || !exam.exam_date) {
    toast('请填写考试名称和日期');
    return;
  }
  const error = validateExam(exam);
  if (error) {
    toast(error);
    return;
  }
  btn.disabled = true;
  btn.textContent = '保存中…';
  try {
    await api('save_exam', { exam });
    await loadExams();
    modal.remove();
    state.modal = null;
    render();
    toast(id ? '已保存修改' : '考试已记录');
  } catch (e) {
    toast(e.message);
    btn.disabled = false;
    btn.textContent = id ? '保存修改' : '保存考试';
  }
}

async function deleteExam(id) {
  const exam = state.exams.find((e) => e.id === id);
  if (!confirm(`确定删除「${exam?.name || '这次考试'}」？`)) return;
  try {
    await api('delete_exam', { examId: id });
    await loadExams();
    render();
    toast('已删除');
  } catch (e) {
    toast(e.message);
  }
}

function showOnboarding() {
  const d = state.onboarding;
  const modal = document.createElement('div');
  modal.className = 'modal-backdrop';
  modal.innerHTML = `<div class="modal onboard"><div class="big-icon">✓</div><h2>账号已经准备好了</h2><p>以后换手机或清除浏览器数据时，可以用下面的用户名和密码重新登录。</p><div class="credential"><small>用户名</small><div class="credential-row"><code>${escapeHtml(d.username)}</code><button class="copy-btn" data-copy="${escapeHtml(d.username)}">复制</button></div></div><div class="credential"><small>密码</small><div class="credential-row"><code>${escapeHtml(d.password)}</code><button class="copy-btn" data-copy="${escapeHtml(d.password)}">复制</button></div></div><div class="save-warning"><span class="i">i</span><div><b>请现在截图保存。</b><br>为了安全，密码关闭此窗口后将不会再次显示，我们也无法从服务器取回原密码。</div></div><button class="primary full" id="savedBtn">我已截图保存，开始记录</button></div>`;
  document.body.appendChild(modal);
  $$('[data-copy]', modal).forEach((b) => b.onclick = async () => {
    await navigator.clipboard.writeText(b.dataset.copy);
    toast('已复制');
  });
  $('#savedBtn', modal).onclick = () => {
    state.onboarding = null;
    modal.remove();
  };
}

function renderLogin(error = '') {
  $('#app').innerHTML = `<div class="auth-page"><div class="card auth-card"><div class="logo">↗</div><h2>欢迎使用成绩轨迹</h2><p>先登录已有账号；如果你是第一次使用，可以直接注册一个新账号，系统会自动生成用户名和 10 位纯数字密码，并提醒你截图保存。</p>${error ? `<div class="info-box" style="margin-bottom:15px">${escapeHtml(error)}</div>` : ''}<div class="field"><label>用户名</label><input id="loginUser" autocomplete="username" placeholder="例如 bright-panda-4821"></div><div class="field"><label>密码</label><input id="loginPass" type="password" inputmode="numeric" pattern="[0-9]*" autocomplete="current-password" placeholder="输入10位数字密码"></div><div class="auth-actions"><button class="primary" id="loginBtn">登录</button><button class="secondary" id="newAccountBtn">注册新账号</button></div><div class="auth-help">支持记录语数英物化生史地政 9 科成绩，自动生成趋势图与雷达图。</div></div></div>`;
  $('#loginBtn').onclick = login;
  $('#newAccountBtn').onclick = () => startRegister();
  $('#loginPass').addEventListener('keydown', (e) => { if (e.key === 'Enter') login(); });
}

async function login() {
  const btn = $('#loginBtn');
  btn.disabled = true;
  btn.textContent = '登录中…';
  try {
    const data = await api('login', { username: $('#loginUser').value.trim(), password: $('#loginPass').value });
    state.token = data.token;
    state.user = data.user;
    localStorage.setItem('st_token', data.token);
    localStorage.setItem('st_known_user', '1');
    await loadExams();
    state.page = 'home';
    render();
  } catch (e) {
    toast(e.message);
    btn.disabled = false;
    btn.textContent = '登录';
  }
}

async function logout() {
  if (!confirm('确定退出登录？请确认你已经保存好用户名和密码。')) return;
  try { await api('logout'); } catch (e) {}
  localStorage.removeItem('st_token');
  state.token = '';
  state.user = null;
  renderLogin();
}

init();
;
/* ===== app-v4.js ===== */
// v4 enhancement: dynamic radar axes + all-subject overview trend chart
const OVERVIEW_COLORS_V4 = ['#18212f', '#5d72e8', '#32a77a', '#e59b45', '#df5f68', '#8f62db', '#22a6b3', '#f06a8b', '#6c87ff', '#7a8a9a'];

function subjectsWithDataV4(exams, key = 'actual', strategy = 'all') {
  if (!exams.length) return [];
  return SUBJECTS.filter((subject) => {
    if (strategy === 'any') return exams.some((exam) => scoreRate(exam, subject, key) !== null);
    return exams.every((exam) => scoreRate(exam, subject, key) !== null);
  });
}

(function injectV4Styles() {
  if ($('#app-v4-extra-style')) return;
  const style = document.createElement('style');
  style.id = 'app-v4-extra-style';
  style.textContent = `
    .overview-card{padding:22px}
    .overview-wrap{height:340px;position:relative;margin-top:10px}
    .overview-wrap svg{width:100%;height:100%;overflow:visible}
    .overview-legend{display:flex;gap:10px;flex-wrap:wrap;margin-top:12px}
    .overview-pill{display:inline-flex;align-items:center;gap:8px;background:#f7f8fb;border:1px solid var(--line);border-radius:999px;padding:7px 10px;font-size:12px;color:#566172}
    .overview-pill i{width:10px;height:10px;border-radius:999px;display:inline-block}
    @media(max-width:620px){.overview-card{padding:17px 14px}.overview-wrap{height:300px}.overview-pill{font-size:11px;padding:7px 10px}}
  `;
  document.head.appendChild(style);
})();

function overviewSeriesV4() {
  const subjectList = subjectsWithDataV4(state.exams, 'actual', 'any');
  return [
    { label: '总分', color: OVERVIEW_COLORS_V4[0], getValue: (exam) => totalRate(exam, 'actual') },
    ...subjectList.map((subject, index) => ({
      label: subject,
      color: OVERVIEW_COLORS_V4[(index + 1) % OVERVIEW_COLORS_V4.length],
      getValue: (exam) => scoreRate(exam, subject, 'actual')
    }))
  ];
}

function overviewCardHtml() {
  const series = overviewSeriesV4();
  return `<div class="card overview-card"><div class="card-title-row"><div><h3 class="card-title">总览趋势图</h3><p class="card-sub">把总分和各科放在同一张图里统一观察。为便于比较，这里按得分率绘制；没有数据的科目不会显示。</p></div></div><div class="overview-wrap" id="overviewChart">${overviewChartHtmlV4(series)}</div>${overviewLegendHtmlV4(series)}</div>`;
}

function overviewLegendHtmlV4(series) {
  const visible = series.filter((item) => state.exams.some((exam) => item.getValue(exam) !== null));
  if (!visible.length) return '';
  return `<div class="overview-legend">${visible.map((item) => `<span class="overview-pill"><i style="background:${item.color}"></i>${item.label}</span>`).join('')}</div>`;
}

function overviewChartHtmlV4(series) {
  if (!state.exams.length) return `<div class="empty-chart"><div><div class="empty-icon">⌁</div>记录考试后，这里会自动汇总总分和各科趋势</div></div>`;
  const visible = series.filter((item) => state.exams.some((exam) => item.getValue(exam) !== null));
  if (!visible.length) return `<div class="empty-chart"><div><div class="empty-icon">⌁</div>还没有可用于总览图的真实成绩</div></div>`;

  const points = state.exams.map((exam) => ({
    name: exam.name,
    date: exam.exam_date,
    values: visible.map((item) => item.getValue(exam))
  }));
  const W = 760, H = 320, L = 46, R = 20, T = 18, B = 46;
  const cw = W - L - R, ch = H - T - B;
  const x = (i) => points.length === 1 ? L + cw / 2 : L + (i / (points.length - 1)) * cw;
  const y = (v) => T + (100 - v) / 100 * ch;

  let grid = '';
  for (let i = 0; i <= 5; i += 1) {
    const v = 100 - (100 * i / 5);
    const yy = T + (ch * i / 5);
    grid += `<line x1="${L}" y1="${yy}" x2="${W - R}" y2="${yy}" stroke="#edf0f4"/><text x="${L - 9}" y="${yy + 4}" text-anchor="end" class="axis-label">${Math.round(v)}%</text>`;
  }

  const lines = visible.map((seriesItem, seriesIndex) => {
    let d = '';
    let started = false;
    let circles = '';
    points.forEach((point, pointIndex) => {
      const value = point.values[seriesIndex];
      if (value === null) {
        started = false;
        return;
      }
      const xx = x(pointIndex), yy = y(value);
      d += `${started ? 'L' : 'M'} ${xx} ${yy} `;
      started = true;
      circles += `<circle cx="${xx}" cy="${yy}" r="4" fill="#fff" stroke="${seriesItem.color}" stroke-width="2.4" data-tip="${escapeHtml(point.name)} · ${seriesItem.label} ${formatPercent(value)}"/>`;
    });
    return `<path d="${d}" fill="none" stroke="${seriesItem.color}" stroke-width="${seriesIndex === 0 ? '3.4' : '2.4'}" stroke-linecap="round" stroke-linejoin="round"/>${circles}`;
  }).join('');
  const labels = points.map((point, index) => `<text x="${x(index)}" y="${H - 17}" text-anchor="middle" class="axis-label">${fmtDate(point.date)}</text>`).join('');
  return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">${grid}${lines}${labels}</svg><div class="tooltip-card" id="overviewChartTip"></div>`;
}

radarCardHtml = function radarCardHtmlV4() {
  const available = radarAvailableExams();
  const selected = selectedRadarExams();
  return `<div class="card radar-card"><div class="card-title-row"><div><h3 class="card-title">全部科目雷达图</h3><p class="card-sub">按得分率绘制，支持叠加多次考试；没有数据的科目会自动隐藏，6 科就显示六边形。</p></div></div>
    <div class="radar-toolbar"><div class="toggle-row"><span class="label">查看内容</span><button class="chip ${state.radarMode === 'actual' ? 'active' : ''}" data-radar-mode="actual">真实成绩</button><button class="chip ${state.radarMode === 'target' ? 'active' : ''}" data-radar-mode="target">目标成绩</button></div><div><div class="subtle-note">最多可叠加 4 次考试。叠加对比时，会自动只显示这些考试共同拥有数据的科目，避免空轴干扰判断。</div><div class="multi-select" style="margin-top:8px">${available.length ? available.map((exam) => `<button class="select-pill ${state.radarSelection.includes(exam.id) ? 'active' : ''}" data-radar-exam="${exam.id}">${escapeHtml(exam.name)} · ${fmtDate(exam.exam_date)}</button>`).join('') : '<span class="subtle-note">当前还没有可用于雷达图的数据</span>'}</div></div></div>
    <div class="radar-wrap" id="radarChart">${radarChartHtml(selected)}</div>${radarLegendHtml(selected)}${radarSummaryHtml(selected)}</div>`;
};

radarChartHtml = function radarChartHtmlV4(selected) {
  if (!selected.length) return `<div class="empty-chart"><div><div class="empty-icon">◎</div>选择 1 次或多次考试后，这里会显示全部科目的结构变化</div></div>`;
  const subjects = subjectsWithDataV4(selected, state.radarMode, 'all');
  if (!subjects.length) return `<div class="empty-chart"><div><div class="empty-icon">◎</div>所选考试没有共同的科目数据，暂时无法叠加比较</div></div>`;

  const W = 760, H = 360;
  const cx = 380, cy = 180, radius = 122;
  const angleStep = (Math.PI * 2) / subjects.length;
  const angleAt = (i) => -Math.PI / 2 + i * angleStep;
  const pointAt = (ratio, i) => {
    const angle = angleAt(i);
    const r = radius * ratio;
    return [cx + Math.cos(angle) * r, cy + Math.sin(angle) * r];
  };

  let grid = '';
  [0.2, 0.4, 0.6, 0.8, 1].forEach((ratio) => {
    const pts = subjects.map((_, i) => pointAt(ratio, i).join(',')).join(' ');
    grid += `<polygon points="${pts}" fill="none" stroke="#edf0f4"/>`;
    grid += `<text x="${cx + 8}" y="${cy - radius * ratio + 4}" class="axis-label">${Math.round(ratio * 100)}%</text>`;
  });
  subjects.forEach((subject, i) => {
    const [x, y] = pointAt(1, i);
    grid += `<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" stroke="#edf0f4"/>`;
    const labelPos = pointAt(1.14, i);
    grid += `<text x="${labelPos[0]}" y="${labelPos[1]}" text-anchor="middle" dominant-baseline="middle" class="axis-label" style="font-size:12px;fill:#55627a">${SUBJECT_SHORT[subject]}</text>`;
  });

  const polygons = selected.map((exam, index) => {
    const color = RADAR_COLORS[index % RADAR_COLORS.length];
    const points = subjects.map((subject, i) => pointAt(scoreRate(exam, subject, state.radarMode) / 100, i).join(',')).join(' ');
    const circles = subjects.map((subject, i) => {
      const [x, y] = pointAt(scoreRate(exam, subject, state.radarMode) / 100, i);
      return `<circle cx="${x}" cy="${y}" r="4" fill="#fff" stroke="${color}" stroke-width="2"/>`;
    }).join('');
    return `<polygon points="${points}" fill="${color}22" stroke="${color}" stroke-width="2.5"/>${circles}`;
  }).join('');
  return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${grid}${polygons}</svg>`;
};

radarSummaryHtml = function radarSummaryHtmlV4(selected) {
  if (!selected.length) return '';
  const subjects = subjectsWithDataV4(selected, state.radarMode, 'all');
  if (!subjects.length) return `<div class="radar-summary"><div class="summary-card"><h4>当前薄弱科目</h4><div class="subtle-note">所选考试没有共同科目，暂时无法计算结构变化。</div></div><div class="summary-card"><h4>对比说明</h4><div class="subtle-note">请改为选择数据范围更接近的几次考试，或者只查看单次考试雷达图。</div></div></div>`;

  const latest = selected.at(-1);
  const earliest = selected[0];
  const weakness = subjects
    .map((subject) => ({ subject, rate: scoreRate(latest, subject, state.radarMode) }))
    .sort((a, b) => a.rate - b.rate)
    .slice(0, 3);
  const comparisons = subjects
    .map((subject) => ({ subject, delta: scoreRate(latest, subject, state.radarMode) - scoreRate(earliest, subject, state.radarMode) }))
    .sort((a, b) => b.delta - a.delta);
  const best = comparisons[0] || null;
  const worst = comparisons.at(-1) || null;
  const averageRate = totalRate(latest, state.radarMode);

  return `<div class="radar-summary"><div class="summary-card"><h4>当前薄弱科目</h4><div class="summary-list">${weakness.map((item, index) => `<div class="summary-item"><span>${index + 1}. <b>${item.subject}</b></span><span>${formatPercent(item.rate)}</span></div>`).join('')}</div></div><div class="summary-card"><h4>${selected.length > 1 ? '对比变化' : '本次概况'}</h4>${selected.length > 1 ? `<div class="comparison-grid"><div>当前对比：<span class="comparison-strong">${escapeHtml(earliest.name)}</span> → <span class="comparison-strong">${escapeHtml(latest.name)}</span></div><div>参与对比科目：<span class="comparison-strong">${subjects.map((subject) => SUBJECT_SHORT[subject]).join(' / ')}</span></div><div>整体平均得分率：<span class="comparison-strong">${formatPercent(averageRate)}</span></div><div>进步最大：${best ? `<span class="comparison-positive">${best.subject} ${best.delta >= 0 ? '+' : ''}${formatPercent(best.delta)}</span>` : '—'}</div><div>需要关注：${worst ? `<span class="comparison-negative">${worst.subject} ${worst.delta >= 0 ? '+' : ''}${formatPercent(worst.delta)}</span>` : '—'}</div></div>` : `<div class="comparison-grid"><div>已选择：<span class="comparison-strong">${escapeHtml(latest.name)}</span></div><div>参与科目：<span class="comparison-strong">${subjects.map((subject) => SUBJECT_SHORT[subject]).join(' / ')}</span></div><div>平均得分率：<span class="comparison-strong">${formatPercent(averageRate)}</span></div><div class="subtle-note">再多选几次考试，就可以直接看到弱项改善了多少。</div></div>`}</div></div>`;
};

const homeHtmlV3 = homeHtml;
homeHtml = function homeHtmlV4() {
  const html = homeHtmlV3();
  const marker = '<div class="card radar-card">';
  const index = html.indexOf(marker);
  if (index < 0) return html;
  return `${html.slice(0, index)}${overviewCardHtml()}${html.slice(index)}`;
};

function bindOverviewTooltipV4() {
  const container = $('#overviewChart');
  const tip = $('#overviewChartTip', container || document);
  if (!container || !tip) return;
  $$('[data-tip]', container).forEach((point) => {
    const show = () => {
      tip.textContent = point.dataset.tip;
      tip.style.display = 'block';
      const rect = container.getBoundingClientRect();
      const pointRect = point.getBoundingClientRect();
      tip.style.left = `${pointRect.left - rect.left + pointRect.width / 2}px`;
      tip.style.top = `${pointRect.top - rect.top}px`;
    };
    point.addEventListener('mouseenter', show);
    point.addEventListener('click', show);
    point.addEventListener('mouseleave', () => { tip.style.display = 'none'; });
  });
}

const bindPageV3 = bindPage;
bindPage = function bindPageV4() {
  bindPageV3();
  bindOverviewTooltipV4();
};
;
/* ===== app-v5.js ===== */
// v5: move all-subject overview into the existing trend card
const chartHtmlBeforeV5 = chartHtml;
const bindPageBeforeV5 = bindPage;

(function injectV5Styles() {
  if ($('#app-v5-extra-style')) return;
  const style = document.createElement('style');
  style.id = 'app-v5-extra-style';
  style.textContent = `
    .chart-wrap.overview-mode-v5{height:auto}
    .overview-stage-v5{height:300px;position:relative;margin-top:4px}
    .overview-stage-v5 svg{width:100%;height:100%;overflow:visible}
    .overview-stage-v5 + .overview-legend{margin-top:12px}
    @media(max-width:620px){.overview-stage-v5{height:280px}}
  `;
  document.head.appendChild(style);
})();

function overviewTrendHtmlV5() {
  const series = overviewSeriesV4();
  const visible = series.filter((item) => state.exams.some((exam) => item.getValue(exam) !== null));
  if (!state.exams.length) {
    return `<div class="empty-chart" style="height:300px"><div><div class="empty-icon">⌁</div>记录考试后，这里会自动汇总总分和各科趋势</div></div>`;
  }
  if (!visible.length) {
    return `<div class="empty-chart" style="height:300px"><div><div class="empty-icon">⌁</div>还没有可用于总览的真实成绩</div></div>`;
  }
  return `<div class="overview-stage-v5">${overviewChartHtmlV4(series)}</div>${overviewLegendHtmlV4(series)}`;
}

chartHtml = function chartHtmlV5() {
  if (state.subject === '总览') return overviewTrendHtmlV5();
  return chartHtmlBeforeV5();
};

homeHtml = function homeHtmlV5() {
  let html = homeHtmlV3();
  const overviewButton = `<button class="chip ${state.subject === '总览' ? 'active' : ''}" data-subject="总览">总览</button>`;
  html = html.replace('<div class="chips">', `<div class="chips">${overviewButton}`);

  if (state.subject === '总览') {
    html = html.replace(
      '<p class="card-sub">真实成绩与目标成绩放在同一张图里</p>',
      '<p class="card-sub">总分与各科按得分率叠加展示，没有数据的科目会自动隐藏</p>'
    );
    html = html.replace(
      '<div class="legend"><span><i class="actual"></i>真实成绩</span><span><i class="target"></i>目标成绩</span></div>',
      '<div class="subtle-note">真实成绩 · 得分率</div>'
    );
    html = html.replace(
      '<div class="chart-wrap" id="chart">',
      '<div class="chart-wrap overview-mode-v5" id="chart">'
    );
  }
  return html;
};

function bindOverviewTrendTooltipV5() {
  if (state.subject !== '总览') return;
  const container = $('#chart');
  const tip = $('#overviewChartTip', container || document);
  if (!container || !tip) return;
  $$('[data-tip]', container).forEach((point) => {
    const show = () => {
      tip.textContent = point.dataset.tip;
      tip.style.display = 'block';
      const rect = container.getBoundingClientRect();
      const pointRect = point.getBoundingClientRect();
      tip.style.left = `${pointRect.left - rect.left + pointRect.width / 2}px`;
      tip.style.top = `${pointRect.top - rect.top}px`;
    };
    point.addEventListener('mouseenter', show);
    point.addEventListener('click', show);
    point.addEventListener('mouseleave', () => { tip.style.display = 'none'; });
  });
}

bindPage = function bindPageV5() {
  bindPageBeforeV5();
  bindOverviewTrendTooltipV5();
};
;
/* ===== app-v6.js ===== */
// v6: dynamic chart/radar axis ranges to improve visual separation on mobile
(function injectV6Styles() {
  if (document.getElementById('app-v6-extra-style')) return;
  const style = document.createElement('style');
  style.id = 'app-v6-extra-style';
  style.textContent = `
    .axis-caption-v6{font-size:11px;color:var(--muted);margin-top:8px}
    .radar-wrap{height:470px}
    .radar-wrap svg{display:block;width:100%;height:100%}
    @media(max-width:620px){.radar-wrap{height:430px}}
  `;
  document.head.appendChild(style);
})();

function calcDynamicAxisRangeV6(values, options = {}) {
  const nums = (values || []).filter((v) => v !== null && v !== undefined && !Number.isNaN(Number(v))).map(Number);
  const minLimit = options.minLimit ?? 0;
  const maxLimit = options.maxLimit ?? 100;
  const step = options.step ?? 5;
  const minSpan = options.minSpan ?? 20;
  const padRatio = options.padRatio ?? 0.18;
  if (!nums.length) return { min: minLimit, max: maxLimit, ticks: 5 };
  let min = Math.min(...nums);
  let max = Math.max(...nums);
  const rawSpan = Math.max(max - min, minSpan * 0.4);
  const pad = Math.max(step, rawSpan * padRatio);
  min = Math.max(minLimit, Math.floor((min - pad) / step) * step);
  max = Math.min(maxLimit, Math.ceil((max + pad) / step) * step);
  if (max - min < minSpan) {
    const mid = (max + min) / 2;
    min = Math.max(minLimit, Math.floor((mid - minSpan / 2) / step) * step);
    max = Math.min(maxLimit, Math.ceil((mid + minSpan / 2) / step) * step);
    if (max - min < minSpan) {
      if (min === minLimit) max = Math.min(maxLimit, min + minSpan);
      else min = Math.max(minLimit, max - minSpan);
    }
  }
  if (min === max) {
    max = Math.min(maxLimit, min + minSpan);
    min = Math.max(minLimit, max - minSpan);
  }
  return { min, max, ticks: 5 };
}

if (typeof overviewChartHtmlV4 === 'function') {
  overviewChartHtmlV4 = function overviewChartHtmlDynamicV6(series) {
    if (!state.exams.length) return `<div class="empty-chart"><div><div class="empty-icon">⌁</div>记录考试后，这里会自动汇总总分和各科趋势</div></div>`;
    const visible = series.filter((item) => state.exams.some((exam) => item.getValue(exam) !== null));
    if (!visible.length) return `<div class="empty-chart"><div><div class="empty-icon">⌁</div>还没有可用于总览图的真实成绩</div></div>`;

    const points = state.exams.map((exam) => ({
      name: exam.name,
      date: exam.exam_date,
      values: visible.map((item) => item.getValue(exam))
    }));
    const allValues = points.flatMap((point) => point.values).filter((v) => v !== null);
    const axis = calcDynamicAxisRangeV6(allValues, { minLimit: 0, maxLimit: 100, step: 5, minSpan: 20, padRatio: 0.16 });

    const W = 760, H = 320, L = 46, R = 20, T = 18, B = 46;
    const cw = W - L - R, ch = H - T - B;
    const x = (i) => points.length === 1 ? L + cw / 2 : L + (i / (points.length - 1)) * cw;
    const y = (v) => T + (axis.max - v) / (axis.max - axis.min) * ch;

    let grid = '';
    for (let i = 0; i <= axis.ticks; i += 1) {
      const value = axis.max - ((axis.max - axis.min) * i / axis.ticks);
      const yy = T + (ch * i / axis.ticks);
      grid += `<line x1="${L}" y1="${yy}" x2="${W - R}" y2="${yy}" stroke="#edf0f4"/><text x="${L - 9}" y="${yy + 4}" text-anchor="end" class="axis-label">${Math.round(value)}%</text>`;
    }

    const lines = visible.map((seriesItem, seriesIndex) => {
      let d = '';
      let started = false;
      let circles = '';
      points.forEach((point, pointIndex) => {
        const value = point.values[seriesIndex];
        if (value === null) {
          started = false;
          return;
        }
        const xx = x(pointIndex), yy = y(value);
        d += `${started ? 'L' : 'M'} ${xx} ${yy} `;
        started = true;
        circles += `<circle cx="${xx}" cy="${yy}" r="4" fill="#fff" stroke="${seriesItem.color}" stroke-width="2.4" data-tip="${escapeHtml(point.name)} · ${seriesItem.label} ${formatPercent(value)}"/>`;
      });
      return `<path d="${d}" fill="none" stroke="${seriesItem.color}" stroke-width="${seriesIndex === 0 ? '3.4' : '2.4'}" stroke-linecap="round" stroke-linejoin="round"/>${circles}`;
    }).join('');
    const labels = points.map((point, index) => `<text x="${x(index)}" y="${H - 17}" text-anchor="middle" class="axis-label">${fmtDate(point.date)}</text>`).join('');
    return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">${grid}${lines}${labels}</svg><div class="tooltip-card" id="overviewChartTip"></div><div class="axis-caption-v6">纵轴已按当前数据动态缩放（${axis.min}% - ${axis.max}%）</div>`;
  };
}

if (typeof radarChartHtml === 'function') {
  radarCardHtml = function radarCardHtmlV6() {
    const available = radarAvailableExams();
    const selected = selectedRadarExams();
    return `<div class="card radar-card"><div class="card-title-row"><div><h3 class="card-title">全部科目雷达图</h3><p class="card-sub">按得分率绘制，支持叠加多次考试；没有数据的科目会自动隐藏，6 科就显示六边形。</p></div></div>
      <div class="radar-toolbar"><div class="toggle-row"><span class="label">查看内容</span><button class="chip ${state.radarMode === 'actual' ? 'active' : ''}" data-radar-mode="actual">真实成绩</button><button class="chip ${state.radarMode === 'target' ? 'active' : ''}" data-radar-mode="target">目标成绩</button></div><div><div class="subtle-note">最多可叠加 4 次考试。叠加对比时，会自动只显示这些考试共同拥有数据的科目；纵轴会按当前选中的数据动态缩放，差异更清楚。</div><div class="multi-select" style="margin-top:8px">${available.length ? available.map((exam) => `<button class="select-pill ${state.radarSelection.includes(exam.id) ? 'active' : ''}" data-radar-exam="${exam.id}">${escapeHtml(exam.name)} · ${fmtDate(exam.exam_date)}</button>`).join('') : '<span class="subtle-note">当前还没有可用于雷达图的数据</span>'}</div></div></div>
      <div class="radar-wrap" id="radarChart">${radarChartHtml(selected)}</div>${radarLegendHtml(selected)}${radarSummaryHtml(selected)}</div>`;
  };

  radarChartHtml = function radarChartHtmlDynamicV6(selected) {
    if (!selected.length) return `<div class="empty-chart"><div><div class="empty-icon">◎</div>选择 1 次或多次考试后，这里会显示全部科目的结构变化</div></div>`;
    const subjects = (typeof subjectsWithDataV4 === 'function' ? subjectsWithDataV4(selected, state.radarMode, 'all') : SUBJECTS.filter((subject) => selected.every((exam) => scoreRate(exam, subject, state.radarMode) !== null)));
    if (!subjects.length) return `<div class="empty-chart"><div><div class="empty-icon">◎</div>所选考试没有共同的科目数据，暂时无法叠加比较</div></div>`;

    const allValues = [];
    selected.forEach((exam) => subjects.forEach((subject) => allValues.push(scoreRate(exam, subject, state.radarMode))));
    const axis = calcDynamicAxisRangeV6(allValues, { minLimit: 0, maxLimit: 100, step: 5, minSpan: 20, padRatio: 0.16 });

    const W = 620, H = 430;
    const cx = 310, cy = 210, radius = 190;
    const angleStep = (Math.PI * 2) / subjects.length;
    const angleAt = (i) => -Math.PI / 2 + i * angleStep;
    const pointAt = (ratio, i) => {
      const angle = angleAt(i);
      const r = radius * ratio;
      return [cx + Math.cos(angle) * r, cy + Math.sin(angle) * r];
    };
    const normalize = (value) => Math.max(0, Math.min(1, (value - axis.min) / (axis.max - axis.min)));

    let grid = `<text x="${cx + 8}" y="${cy + 4}" class="axis-label">${Math.round(axis.min)}%</text>`;
    for (let i = 1; i <= axis.ticks; i += 1) {
      const ratio = i / axis.ticks;
      const pts = subjects.map((_, idx) => pointAt(ratio, idx).join(',')).join(' ');
      const labelValue = axis.min + ((axis.max - axis.min) * i / axis.ticks);
      grid += `<polygon points="${pts}" fill="none" stroke="#edf0f4"/>`;
      grid += `<text x="${cx + 8}" y="${cy - radius * ratio + 4}" class="axis-label">${Math.round(labelValue)}%</text>`;
    }
    subjects.forEach((subject, i) => {
      const [x, y] = pointAt(1, i);
      grid += `<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" stroke="#edf0f4"/>`;
      const labelPos = pointAt(1.11, i);
      grid += `<text x="${labelPos[0]}" y="${labelPos[1]}" text-anchor="middle" dominant-baseline="middle" class="axis-label" style="font-size:12px;fill:#55627a">${SUBJECT_SHORT[subject]}</text>`;
    });

    const polygons = selected.map((exam, index) => {
      const color = RADAR_COLORS[index % RADAR_COLORS.length];
      const points = subjects.map((subject, i) => pointAt(normalize(scoreRate(exam, subject, state.radarMode)), i).join(',')).join(' ');
      const circles = subjects.map((subject, i) => {
        const [x, y] = pointAt(normalize(scoreRate(exam, subject, state.radarMode)), i);
        return `<circle cx="${x}" cy="${y}" r="4" fill="#fff" stroke="${color}" stroke-width="2"/>`;
      }).join('');
      return `<polygon points="${points}" fill="${color}22" stroke="${color}" stroke-width="2.5"/>${circles}`;
    }).join('');
    return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${grid}${polygons}</svg><div class="axis-caption-v6">纵轴已按当前数据动态缩放（${axis.min}% - ${axis.max}%）</div>`;
  };
}
;
/* ===== app-v7.js ===== */
// v7: customizable subjects + scientifically normalized rank trends
const DATA_API_V7 = 'https://kdwpmcdxapwecbfrvqtm.supabase.co/functions/v1/score-tracker-data-api';
state.subjectConfigs = state.subjectConfigs || [];
state.trendMetric = state.trendMetric || 'score';

(function injectV7Styles() {
  if ($('#app-v7-extra-style')) return;
  const style = document.createElement('style');
  style.id = 'app-v7-extra-style';
  style.textContent = `
    .trend-metric-toggle-v7{display:flex;align-items:center;gap:8px;margin:0 0 10px;flex-wrap:wrap}
    .trend-metric-toggle-v7 .label{font-size:12px;font-weight:700;color:var(--muted)}
    .metric-btn-v7{border:1px solid var(--line);background:#fff;color:var(--muted);border-radius:999px;padding:8px 12px;font-size:12px}
    .metric-btn-v7.active{background:var(--text);border-color:var(--text);color:#fff}
    .rank-method-v7{font-size:11px;line-height:1.6;color:var(--muted);margin-top:8px}
    .rank-method-v7 b{color:var(--text)}
    .chart-wrap.rank-mode-v7{height:auto}
    .rank-chart-stage-v7{height:310px;position:relative;margin-top:4px}
    .rank-chart-stage-v7 svg{width:100%;height:100%;overflow:visible}
    .rank-legend-v7{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}
    .rank-legend-v7 span{display:inline-flex;align-items:center;gap:7px;border:1px solid var(--line);background:#f7f8fb;border-radius:999px;padding:7px 10px;font-size:11px;color:#596474}
    .rank-legend-v7 i{width:9px;height:9px;border-radius:50%;display:block}
    .subject-settings-v7{margin-top:18px;padding:24px}
    .subject-settings-head-v7{display:flex;justify-content:space-between;align-items:flex-start;gap:14px}
    .subject-chip-list-v7{display:flex;gap:8px;flex-wrap:wrap;margin-top:15px}
    .subject-chip-v7{display:inline-flex;align-items:center;gap:6px;background:#f7f8fb;border:1px solid var(--line);border-radius:999px;padding:7px 10px;font-size:12px;color:#586477}
    .subject-config-list-v7{display:grid;gap:9px;margin-top:14px}
    .subject-config-row-v7{display:grid;grid-template-columns:minmax(0,1fr) 110px 38px;gap:8px;align-items:center}
    .subject-config-row-v7 input{width:100%;border:1px solid var(--line);border-radius:11px;padding:10px 11px;outline:none;min-width:0}
    .subject-config-row-v7 input:focus{border-color:#98a6f2;box-shadow:0 0 0 3px #eef0ff}
    .remove-subject-v7{width:38px;height:38px;border-radius:11px;border:1px solid var(--line);background:#fff;color:var(--danger);font-size:18px}
    .subject-manager-actions-v7{display:flex;justify-content:space-between;gap:10px;margin-top:12px;flex-wrap:wrap}
    .section-head-v7{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-top:22px;margin-bottom:10px}
    .section-head-v7 h4{margin:0;font-size:15px}
    .section-head-v7 p{margin:4px 0 0;font-size:11px;color:var(--muted);line-height:1.55}
    .rank-table-v7{border:1px solid var(--line);border-radius:17px;overflow:hidden}
    .rank-row-v7{display:grid;grid-template-columns:minmax(70px,1fr) 1fr 1fr;gap:8px;align-items:center;padding:10px 12px;border-bottom:1px solid var(--line)}
    .rank-row-v7:last-child{border-bottom:0}
    .rank-row-v7.header{background:#f7f8fb;color:var(--muted);font-size:11px;font-weight:700}
    .rank-row-v7.total{background:#fbfcff}
    .rank-row-v7 input{width:100%;min-width:0;border:1px solid var(--line);border-radius:10px;padding:9px 8px;outline:none;background:#fff}
    .rank-row-v7 input:focus{border-color:#98a6f2;box-shadow:0 0 0 3px #eef0ff}
    .rank-science-box-v7{margin-top:12px;background:#f4f8ff;border:1px solid #e3ebfb;border-radius:14px;padding:12px 13px;font-size:11px;color:#586477;line-height:1.65}
    .rank-science-box-v7 b{color:#27344a}
    @media(max-width:620px){
      .rank-chart-stage-v7{height:285px}
      .subject-settings-v7{padding:18px 16px}
      .subject-settings-head-v7{display:block}.subject-settings-head-v7 button{margin-top:12px}
      .subject-config-row-v7{grid-template-columns:minmax(0,1fr) 88px 36px}
      .rank-row-v7{grid-template-columns:72px minmax(0,1fr) minmax(0,1fr);padding:9px 9px;gap:6px}
      .rank-row-v7 input{font-size:12px;padding:9px 6px}
      .rank-row-v7 .subject-name{font-size:12px}
    }
  `;
  document.head.appendChild(style);
})();

async function dataApiV7(action, payload = {}) {
  const res = await fetch(DATA_API_V7, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, token: state.token, ...payload })
  });
  const data = await res.json().catch(() => ({ error: '网络响应异常' }));
  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem('st_token');
      state.token = '';
      state.user = null;
      renderLogin();
    }
    throw new Error(data.error || '请求失败');
  }
  return data;
}

function subjectShortV7(name) {
  const value = String(name || '');
  if (!value) return '';
  if (/^[\u4e00-\u9fff]/.test(value)) return value.slice(0, 2);
  return value.slice(0, 4);
}

function applySubjectConfigsV7(configs) {
  const clean = (configs || [])
    .map((item, index) => ({
      id: item.id || null,
      name: String(item.name || '').trim(),
      defaultMax: Number(item.defaultMax ?? 100),
      sortOrder: Number(item.sortOrder ?? index + 1)
    }))
    .filter((item) => item.name && Number.isFinite(item.defaultMax) && item.defaultMax > 0);
  if (!clean.length) return;
  state.subjectConfigs = clean;
  SUBJECTS.splice(0, SUBJECTS.length, ...clean.map((item) => item.name));
  clean.forEach((item) => {
    SUBJECT_MAX[item.name] = item.defaultMax;
    SUBJECT_SHORT[item.name] = subjectShortV7(item.name);
  });
  if (!['总览', '总分', ...SUBJECTS].includes(state.subject)) state.subject = '总分';
}

const loadExamsBeforeV7 = loadExams;
loadExams = async function loadExamsV7() {
  try {
    const data = await dataApiV7('list_exams');
    applySubjectConfigsV7(data.subjects || []);
    state.exams = data.exams || [];
    ensureRadarSelection();
  } catch (error) {
    console.error('v7 data api fallback', error);
    await loadExamsBeforeV7();
    if (!state.subjectConfigs.length) {
      applySubjectConfigsV7(SUBJECTS.map((name, index) => ({ name, defaultMax: defaultMax(name), sortOrder: index + 1 })));
    }
  }
};

function rankPerformanceV7(rank, participants) {
  const r = num(rank);
  const n = num(participants);
  if (r === null || n === null || r < 1 || n < 1 || r > n) return null;
  if (n === 1) return 100;
  return Math.max(0, Math.min(100, ((n - r) / (n - 1)) * 100));
}

function rankInfoV7(exam, subject) {
  if (!exam) return { rank: null, participants: null, performance: null };
  if (subject === '总分') {
    const rank = num(exam.total_rank);
    const participants = num(exam.total_participants);
    return { rank, participants, performance: rankPerformanceV7(rank, participants) };
  }
  const row = exam.scores?.[subject] || {};
  const rank = num(row.rank);
  const participants = num(row.participants) ?? num(exam.total_participants);
  return { rank, participants, performance: rankPerformanceV7(rank, participants) };
}

function rankSeriesColorsV7() {
  if (typeof OVERVIEW_COLORS_V4 !== 'undefined') return OVERVIEW_COLORS_V4;
  return ['#18212f', '#5d72e8', '#32a77a', '#e59b45', '#df5f68', '#8f62db', '#22a6b3', '#f06a8b', '#6c87ff', '#7a8a9a'];
}

function dynamicRangeV7(values) {
  if (typeof calcDynamicAxisRangeV6 === 'function') {
    return calcDynamicAxisRangeV6(values, { minLimit: 0, maxLimit: 100, step: 5, minSpan: 15, padRatio: 0.18 });
  }
  const nums = values.filter((v) => v !== null && Number.isFinite(Number(v))).map(Number);
  if (!nums.length) return { min: 0, max: 100, ticks: 5 };
  let min = Math.max(0, Math.floor((Math.min(...nums) - 5) / 5) * 5);
  let max = Math.min(100, Math.ceil((Math.max(...nums) + 5) / 5) * 5);
  if (max - min < 15) {
    min = Math.max(0, min - 5);
    max = Math.min(100, Math.max(max + 5, min + 15));
  }
  return { min, max, ticks: 5 };
}

function rankChartHtmlV7() {
  if (!state.exams.length) return `<div class="empty-chart" style="height:300px"><div><div class="empty-icon">⌁</div>记录排名后，这里会显示排名趋势</div></div>`;

  const colors = rankSeriesColorsV7();
  const series = state.subject === '总览'
    ? ['总分', ...SUBJECTS].map((subject, index) => ({ subject, color: colors[index % colors.length] }))
    : [{ subject: state.subject, color: '#5d72e8' }];
  const visible = series.filter((item) => state.exams.some((exam) => rankInfoV7(exam, item.subject).performance !== null));
  if (!visible.length) {
    const hasRawRank = series.some((item) => state.exams.some((exam) => rankInfoV7(exam, item.subject).rank !== null));
    return `<div class="empty-chart" style="height:300px"><div><div class="empty-icon">↕</div>${hasRawRank ? '已经录入名次，但还缺参考人数。补充参考人数后才能进行可比的排名趋势分析。' : '这个科目还没有排名数据'}</div></div>`;
  }

  const points = state.exams.map((exam) => ({
    exam,
    date: exam.exam_date,
    values: visible.map((item) => rankInfoV7(exam, item.subject))
  }));
  const axis = dynamicRangeV7(points.flatMap((point) => point.values.map((value) => value.performance)).filter((v) => v !== null));
  const W = 760, H = 310, L = 48, R = 20, T = 18, B = 46;
  const cw = W - L - R, ch = H - T - B;
  const x = (i) => points.length === 1 ? L + cw / 2 : L + (i / (points.length - 1)) * cw;
  const y = (v) => T + (axis.max - v) / (axis.max - axis.min) * ch;

  let grid = '';
  for (let i = 0; i <= axis.ticks; i += 1) {
    const value = axis.max - ((axis.max - axis.min) * i / axis.ticks);
    const yy = T + (ch * i / axis.ticks);
    grid += `<line x1="${L}" y1="${yy}" x2="${W - R}" y2="${yy}" stroke="#edf0f4"/><text x="${L - 8}" y="${yy + 4}" text-anchor="end" class="axis-label">${Math.round(value)}%</text>`;
  }

  const lines = visible.map((item, seriesIndex) => {
    let d = '';
    let started = false;
    let circles = '';
    points.forEach((point, pointIndex) => {
      const info = point.values[seriesIndex];
      if (info.performance === null) {
        started = false;
        return;
      }
      const xx = x(pointIndex), yy = y(info.performance);
      d += `${started ? 'L' : 'M'} ${xx} ${yy} `;
      started = true;
      const raw = `${info.rank}/${info.participants}`;
      circles += `<circle cx="${xx}" cy="${yy}" r="4.5" fill="#fff" stroke="${item.color}" stroke-width="2.5" data-tip="${escapeHtml(point.exam.name)} · ${item.subject} 第${raw}名 · 排名表现 ${formatPercent(info.performance)}"/>`;
    });
    return `<path d="${d}" fill="none" stroke="${item.color}" stroke-width="${seriesIndex === 0 && state.subject === '总览' ? '3.4' : '2.6'}" stroke-linecap="round" stroke-linejoin="round"/>${circles}`;
  }).join('');
  const labels = points.map((point, index) => `<text x="${x(index)}" y="${H - 17}" text-anchor="middle" class="axis-label">${fmtDate(point.date)}</text>`).join('');
  const legend = state.subject === '总览'
    ? `<div class="rank-legend-v7">${visible.map((item) => `<span><i style="background:${item.color}"></i>${escapeHtml(item.subject)}</span>`).join('')}</div>`
    : '';
  return `<div class="rank-chart-stage-v7"><svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">${grid}${lines}${labels}</svg><div class="tooltip-card" id="chartTip"></div></div>${legend}<div class="rank-method-v7"><b>排名表现</b> = 按参考人数标准化后的超越率；越高越好。这样不同考试参考人数变化时，比直接比较“第几名”更公平。</div>`;
}

const chartHtmlBeforeV7 = chartHtml;
chartHtml = function chartHtmlV7() {
  if (state.trendMetric === 'rank') return rankChartHtmlV7();
  return chartHtmlBeforeV7();
};

const homeHtmlBeforeV7 = homeHtml;
homeHtml = function homeHtmlV7() {
  let html = homeHtmlBeforeV7();
  html = html.replace('记录语数英物化生史地政 9 科的目标与真实成绩，折线图看总趋势，雷达图看结构变化，更容易找到弱项并追踪改善。', '科目可以自由设置：既能记录学校学科，也能拆成题型、模块或备考项目；成绩、排名和雷达图一起看，更容易找到真正的薄弱点。');
  const metricToggle = `<div class="trend-metric-toggle-v7"><span class="label">趋势类型</span><button class="metric-btn-v7 ${state.trendMetric === 'score' ? 'active' : ''}" data-trend-metric="score">成绩</button><button class="metric-btn-v7 ${state.trendMetric === 'rank' ? 'active' : ''}" data-trend-metric="rank">排名</button></div>`;
  html = html.replace('<div class="chips">', `${metricToggle}<div class="chips">`);

  if (state.trendMetric === 'rank') {
    html = html.replace('<h3 class="card-title">成绩趋势</h3>', '<h3 class="card-title">排名趋势</h3>');
    html = html.replace('<p class="card-sub">真实成绩与目标成绩放在同一张图里</p>', '<p class="card-sub">用参考人数把名次转换成可比较的“排名表现”，避免考试难度和人数变化干扰判断</p>');
    html = html.replace('<p class="card-sub">总分与各科按得分率叠加展示，没有数据的科目会自动隐藏</p>', '<p class="card-sub">总分与各科排名统一换算为排名表现；参考人数不同也能放在一起比较</p>');
    html = html.replace('<div class="legend"><span><i class="actual"></i>真实成绩</span><span><i class="target"></i>目标成绩</span></div>', '<div class="subtle-note">越高越好 · 原始名次会显示在数据点提示里</div>');
    html = html.replace('<div class="subtle-note">真实成绩 · 得分率</div>', '<div class="subtle-note">排名表现 · 标准化超越率</div>');
    html = html.replace('<div class="chart-wrap" id="chart">', '<div class="chart-wrap rank-mode-v7" id="chart">');
    html = html.replace('<div class="chart-wrap overview-mode-v5" id="chart">', '<div class="chart-wrap rank-mode-v7" id="chart">');
  }
  return html;
};

const accountHtmlBeforeV7 = accountHtml;
accountHtml = function accountHtmlV7() {
  const base = accountHtmlBeforeV7();
  const subjects = state.subjectConfigs.length
    ? state.subjectConfigs
    : SUBJECTS.map((name, index) => ({ name, defaultMax: defaultMax(name), sortOrder: index + 1 }));
  return `${base}<div class="card subject-settings-v7"><div class="subject-settings-head-v7"><div><h3 class="card-title">科目设置</h3><p class="card-sub">可以把“科目”改造成学科、题型、模块或备考项目。比如：阅读理解、完形填空、翻译、写作。</p></div><button class="secondary" id="manageSubjectsBtn">管理科目</button></div><div class="subject-chip-list-v7">${subjects.map((item) => `<span class="subject-chip-v7"><b>${escapeHtml(item.name)}</b> · 满分 ${formatScore(item.defaultMax)}</span>`).join('')}</div><div class="subtle-note" style="margin-top:12px">移除科目不会删除历史成绩；以后重新添加同名科目，历史数据会重新显示。</div></div>`;
};

function openSubjectManagerV7() {
  const subjects = (state.subjectConfigs.length
    ? state.subjectConfigs
    : SUBJECTS.map((name, index) => ({ name, defaultMax: defaultMax(name), sortOrder: index + 1 })))
    .map((item) => ({ ...item }));
  const modal = document.createElement('div');
  modal.className = 'modal-backdrop';
  modal.innerHTML = `<div class="modal"><div class="modal-head"><h3>管理科目</h3><button class="close-btn" aria-label="关闭">×</button></div><div class="modal-body"><div class="info-box"><b>可以自定义。</b> 科目不一定是学校学科，也可以是“阅读理解、写作、逻辑、数量关系”等你想长期追踪的模块。最多 20 个。</div><div class="subject-config-list-v7" id="subjectConfigList"></div><div class="subject-manager-actions-v7"><button class="secondary" id="addSubjectRowV7">＋ 添加科目</button><div><button class="secondary cancel-btn">取消</button> <button class="primary" id="saveSubjectsV7">保存设置</button></div></div><p class="form-note">修改已有科目名称会被视为新的科目；原名称的历史成绩仍保留在云端，只是暂时隐藏。</p></div></div>`;
  document.body.appendChild(modal);
  state.modal = modal;

  const list = $('#subjectConfigList', modal);
  const rowHtml = (item = { name: '', defaultMax: 100 }) => `<div class="subject-config-row-v7"><input class="subject-name-input-v7" maxlength="40" value="${escapeHtml(item.name || '')}" placeholder="科目/题型名称"><input class="subject-max-input-v7" inputmode="decimal" value="${item.defaultMax ?? 100}" placeholder="默认满分"><button class="remove-subject-v7" type="button" title="移除">×</button></div>`;
  const renderRows = () => {
    list.innerHTML = subjects.map((item) => rowHtml(item)).join('');
    $$('.remove-subject-v7', list).forEach((button, index) => button.onclick = () => {
      if (subjects.length <= 1) return toast('至少保留 1 个科目');
      subjects.splice(index, 1);
      renderRows();
    });
  };
  renderRows();

  const close = () => { modal.remove(); state.modal = null; };
  $('.close-btn', modal).onclick = close;
  $('.cancel-btn', modal).onclick = close;
  modal.onclick = (event) => { if (event.target === modal) close(); };
  $('#addSubjectRowV7', modal).onclick = () => {
    if (subjects.length >= 20) return toast('最多设置 20 个科目');
    subjects.push({ name: '', defaultMax: 100 });
    renderRows();
    $('.subject-config-row-v7:last-child .subject-name-input-v7', list)?.focus();
  };
  $('#saveSubjectsV7', modal).onclick = async () => {
    const rows = $$('.subject-config-row-v7', list);
    const payload = rows.map((row) => ({
      name: $('.subject-name-input-v7', row).value.trim(),
      defaultMax: $('.subject-max-input-v7', row).value
    }));
    if (payload.some((item) => !item.name)) return toast('请填写完整的科目名称');
    if (new Set(payload.map((item) => item.name)).size !== payload.length) return toast('科目名称不能重复');
    if (payload.some((item) => !Number(item.defaultMax) || Number(item.defaultMax) <= 0)) return toast('默认满分必须大于 0');
    const button = $('#saveSubjectsV7', modal);
    button.disabled = true;
    button.textContent = '保存中…';
    try {
      const data = await dataApiV7('save_subjects', { subjects: payload });
      applySubjectConfigsV7(data.subjects || []);
      close();
      render();
      toast('科目设置已保存');
    } catch (error) {
      toast(error.message);
      button.disabled = false;
      button.textContent = '保存设置';
    }
  };
}

openExam = function openExamV7(exam = null) {
  const editing = !!exam;
  const today = new Date().toISOString().slice(0, 10);
  const scores = exam?.scores || {};
  const modal = document.createElement('div');
  modal.className = 'modal-backdrop';
  modal.innerHTML = `<div class="modal"><div class="modal-head"><h3>${editing ? '编辑考试' : '记录一次考试'}</h3><button class="close-btn" aria-label="关闭">×</button></div><div class="modal-body"><div class="form-grid"><div class="field"><label>考试名称</label><input id="examName" maxlength="60" value="${escapeHtml(exam?.name || '')}" placeholder="例如：期中考试 / 2023 英语真题"></div><div class="field"><label>考试日期</label><input id="examDate" type="date" value="${exam?.exam_date || today}"></div></div>
    <div class="section-head-v7"><div><h4>成绩</h4><p>可以只录目标、只录真实成绩，或者两者都录。</p></div></div>
    <div class="score-table"><div class="score-row header"><span>科目</span><span>目标成绩</span><span>真实成绩</span><span>满分</span></div>${SUBJECTS.map((subject) => `<div class="score-row" data-score-row="${escapeHtml(subject)}"><span class="subject-name">${escapeHtml(subject)}</span><input inputmode="decimal" class="target-input" placeholder="目标" value="${scores[subject]?.target ?? ''}"><input inputmode="decimal" class="actual-input" placeholder="考后补录" value="${scores[subject]?.actual ?? ''}"><input inputmode="decimal" class="max-input" value="${scores[subject]?.max ?? defaultMax(subject)}"></div>`).join('')}</div>
    <div class="section-head-v7"><div><h4>排名（可选）</h4><p>建议同时填写参考人数。各科参考人数留空时，会自动使用“总分”的参考人数。</p></div></div>
    <div class="rank-table-v7"><div class="rank-row-v7 header"><span>科目</span><span>名次</span><span>参考人数</span></div><div class="rank-row-v7 total"><span class="subject-name">总分</span><input id="totalRankV7" inputmode="numeric" pattern="[0-9]*" placeholder="例如 36" value="${exam?.total_rank ?? ''}"><input id="totalParticipantsV7" inputmode="numeric" pattern="[0-9]*" placeholder="例如 620" value="${exam?.total_participants ?? ''}"></div>${SUBJECTS.map((subject) => `<div class="rank-row-v7" data-rank-row="${escapeHtml(subject)}"><span class="subject-name">${escapeHtml(subject)}</span><input class="rank-input-v7" inputmode="numeric" pattern="[0-9]*" placeholder="名次" value="${scores[subject]?.rank ?? ''}"><input class="participants-input-v7" inputmode="numeric" pattern="[0-9]*" placeholder="同总人数" value="${scores[subject]?.participants ?? ''}"></div>`).join('')}</div>
    <div class="rank-science-box-v7"><b>为什么要填参考人数？</b> 单看“第 30 名”无法判断是在 100 人里还是 1000 人里。趋势图会把名次换算成标准化的“排名表现（超越率）”：第 1 名接近 100%，越高越好，因此不同考试难度、不同参考人数之间更可比。</div>
    <p class="form-note">科目与默认满分可以在「账号 → 科目设置」中调整。未填写的科目不会计入总分。</p><div class="modal-actions"><button class="secondary cancel-btn">取消</button><button class="primary save-btn">${editing ? '保存修改' : '保存考试'}</button></div></div></div>`;
  document.body.appendChild(modal);
  state.modal = modal;
  const close = () => { modal.remove(); state.modal = null; };
  $('.close-btn', modal).onclick = close;
  $('.cancel-btn', modal).onclick = close;
  modal.onclick = (event) => { if (event.target === modal) close(); };
  $('.save-btn', modal).onclick = () => saveExam(exam?.id || null, modal);
};

validateExam = function validateExamV7(exam) {
  const totalRank = num(exam.total_rank);
  const totalParticipants = num(exam.total_participants);
  if (totalRank !== null && (!Number.isInteger(totalRank) || totalRank < 1)) return '总排名请输入正整数';
  if (totalParticipants !== null && (!Number.isInteger(totalParticipants) || totalParticipants < 1)) return '参考人数请输入正整数';
  if (totalRank !== null && totalParticipants !== null && totalRank > totalParticipants) return '总排名不能大于参考人数';

  for (const subject of SUBJECTS) {
    const row = exam.scores[subject] || {};
    const max = num(row.max) ?? defaultMax(subject);
    const target = num(row.target);
    const actual = num(row.actual);
    const rank = num(row.rank);
    const participants = num(row.participants);
    const effectiveParticipants = participants ?? totalParticipants;
    if (max <= 0) return `${subject} 的满分必须大于 0`;
    if (target !== null && target > max) return `${subject} 的目标成绩不能超过满分 ${formatScore(max)}`;
    if (actual !== null && actual > max) return `${subject} 的真实成绩不能超过满分 ${formatScore(max)}`;
    if (rank !== null && (!Number.isInteger(rank) || rank < 1)) return `${subject}排名请输入正整数`;
    if (participants !== null && (!Number.isInteger(participants) || participants < 1)) return `${subject}参考人数请输入正整数`;
    if (rank !== null && effectiveParticipants !== null && rank > effectiveParticipants) return `${subject}排名不能大于参考人数`;
  }
  return '';
};

saveExam = async function saveExamV7(id, modal) {
  const btn = $('.save-btn', modal);
  const exam = {
    id,
    name: $('#examName', modal).value.trim(),
    exam_date: $('#examDate', modal).value,
    total_rank: $('#totalRankV7', modal)?.value || '',
    total_participants: $('#totalParticipantsV7', modal)?.value || '',
    scores: {}
  };
  $$('[data-score-row]', modal).forEach((row) => {
    exam.scores[row.dataset.scoreRow] = {
      target: $('.target-input', row).value,
      actual: $('.actual-input', row).value,
      max: $('.max-input', row).value,
      rank: '',
      participants: ''
    };
  });
  $$('[data-rank-row]', modal).forEach((row) => {
    const subject = row.dataset.rankRow;
    exam.scores[subject] = exam.scores[subject] || { target: '', actual: '', max: defaultMax(subject) };
    exam.scores[subject].rank = $('.rank-input-v7', row).value;
    exam.scores[subject].participants = $('.participants-input-v7', row).value;
  });
  if (!exam.name || !exam.exam_date) return toast('请填写考试名称和日期');
  const error = validateExam(exam);
  if (error) return toast(error);

  btn.disabled = true;
  btn.textContent = '保存中…';
  try {
    await dataApiV7('save_exam', { exam });
    await loadExams();
    modal.remove();
    state.modal = null;
    render();
    toast(id ? '已保存修改' : '考试已记录');
  } catch (error) {
    toast(error.message);
    btn.disabled = false;
    btn.textContent = id ? '保存修改' : '保存考试';
  }
};

const recordHtmlBeforeV7 = recordHtml;
recordHtml = function recordHtmlV7(exam) {
  let html = recordHtmlBeforeV7(exam);
  const info = rankInfoV7(exam, '总分');
  if (info.rank !== null) {
    const badge = `<span class="score-tag"><b>总排名 ${info.rank}${info.participants ? ` / ${info.participants}` : ''}</b>${info.performance !== null ? ` · 排名表现 ${formatPercent(info.performance)}` : ''}</span>`;
    html = html.replace('</div><div class="record-actions">', `${badge}</div><div class="record-actions">`);
  }
  return html;
};

const bindPageBeforeV7 = bindPage;
bindPage = function bindPageV7() {
  bindPageBeforeV7();
  $$('[data-trend-metric]').forEach((button) => button.onclick = () => {
    state.trendMetric = button.dataset.trendMetric;
    render();
  });
  $('#manageSubjectsBtn')?.addEventListener('click', openSubjectManagerV7);
};

const renderLoginBeforeV7 = renderLogin;
renderLogin = function renderLoginV7(error = '') {
  renderLoginBeforeV7(error);
  const help = $('.auth-help');
  if (help) help.textContent = '支持自定义科目、目标/真实成绩、排名趋势与多次考试雷达对比。';
};
;
/* ===== app-v8.js ===== */
// v8: preserve edits while adding/removing custom subjects and clarify rank-comparison scope
openSubjectManagerV7 = function openSubjectManagerV8() {
  const subjects = (state.subjectConfigs.length
    ? state.subjectConfigs
    : SUBJECTS.map((name, index) => ({ name, defaultMax: defaultMax(name), sortOrder: index + 1 })))
    .map((item) => ({ ...item }));
  const modal = document.createElement('div');
  modal.className = 'modal-backdrop';
  modal.innerHTML = `<div class="modal"><div class="modal-head"><h3>管理科目</h3><button class="close-btn" aria-label="关闭">×</button></div><div class="modal-body"><div class="info-box"><b>可以自定义。</b> 科目不一定是学校学科，也可以是“阅读理解、写作、逻辑、数量关系”等你想长期追踪的模块。最多 20 个。</div><div class="subject-config-list-v7" id="subjectConfigList"></div><div class="subject-manager-actions-v7"><button class="secondary" id="addSubjectRowV7">＋ 添加科目</button><div><button class="secondary cancel-btn">取消</button> <button class="primary" id="saveSubjectsV7">保存设置</button></div></div><p class="form-note">移除科目不会删除历史成绩；修改名称会被视为新的科目，原名称的历史成绩仍保留在云端。</p></div></div>`;
  document.body.appendChild(modal);
  state.modal = modal;

  const list = $('#subjectConfigList', modal);
  const rowHtml = (item = { name: '', defaultMax: 100 }) => `<div class="subject-config-row-v7"><input class="subject-name-input-v7" maxlength="40" value="${escapeHtml(item.name || '')}" placeholder="科目/题型名称"><input class="subject-max-input-v7" inputmode="decimal" value="${item.defaultMax ?? 100}" placeholder="默认满分"><button class="remove-subject-v7" type="button" title="移除">×</button></div>`;

  const syncRows = () => {
    const rows = $$('.subject-config-row-v7', list);
    if (!rows.length) return;
    const next = rows.map((row) => ({
      name: $('.subject-name-input-v7', row).value,
      defaultMax: $('.subject-max-input-v7', row).value
    }));
    subjects.splice(0, subjects.length, ...next);
  };

  const renderRows = () => {
    list.innerHTML = subjects.map((item) => rowHtml(item)).join('');
    $$('.remove-subject-v7', list).forEach((button, index) => button.onclick = () => {
      if (subjects.length <= 1) return toast('至少保留 1 个科目');
      syncRows();
      subjects.splice(index, 1);
      renderRows();
    });
  };
  renderRows();

  const close = () => { modal.remove(); state.modal = null; };
  $('.close-btn', modal).onclick = close;
  $('.cancel-btn', modal).onclick = close;
  modal.onclick = (event) => { if (event.target === modal) close(); };
  $('#addSubjectRowV7', modal).onclick = () => {
    if (subjects.length >= 20) return toast('最多设置 20 个科目');
    syncRows();
    subjects.push({ name: '', defaultMax: 100 });
    renderRows();
    $('.subject-config-row-v7:last-child .subject-name-input-v7', list)?.focus();
  };
  $('#saveSubjectsV7', modal).onclick = async () => {
    syncRows();
    const payload = subjects.map((item) => ({ name: String(item.name || '').trim(), defaultMax: item.defaultMax }));
    if (payload.some((item) => !item.name)) return toast('请填写完整的科目名称');
    if (new Set(payload.map((item) => item.name)).size !== payload.length) return toast('科目名称不能重复');
    if (payload.some((item) => !Number(item.defaultMax) || Number(item.defaultMax) <= 0)) return toast('默认满分必须大于 0');
    const button = $('#saveSubjectsV7', modal);
    button.disabled = true;
    button.textContent = '保存中…';
    try {
      const data = await dataApiV7('save_subjects', { subjects: payload });
      applySubjectConfigsV7(data.subjects || []);
      close();
      render();
      toast('科目设置已保存');
    } catch (error) {
      toast(error.message);
      button.disabled = false;
      button.textContent = '保存设置';
    }
  };
};

const openExamBeforeV8 = openExam;
openExam = function openExamV8(exam = null) {
  openExamBeforeV8(exam);
  const box = $('.rank-science-box-v7', state.modal || document);
  if (box && !box.dataset.scopeNote) {
    box.dataset.scopeNote = '1';
    box.innerHTML += '<br><b>比较口径也要一致：</b>建议长期都使用同一种排名口径，例如都填“年级排名”，不要把班级排名和年级排名混在同一条趋势里。';
  }
};
;
/* ===== app-v9.js ===== */
// v9: add normalized rank percentile to radar comparison
(function injectV9Styles() {
  if ($('#app-v9-extra-style')) return;
  const style = document.createElement('style');
  style.id = 'app-v9-extra-style';
  style.textContent = `
    .radar-mode-note-v9{font-size:11px;line-height:1.6;color:var(--muted);margin-top:7px}
    .radar-mode-note-v9 b{color:var(--text)}
  `;
  document.head.appendChild(style);
})();

function radarValueV9(exam, subject, mode = state.radarMode) {
  if (mode === 'rank') {
    return typeof rankInfoV7 === 'function' ? rankInfoV7(exam, subject).performance : null;
  }
  return scoreRate(exam, subject, mode);
}

function radarSubjectsV9(exams, mode = state.radarMode) {
  if (!exams.length) return [];
  return SUBJECTS.filter((subject) => exams.every((exam) => radarValueV9(exam, subject, mode) !== null));
}

radarAvailableExams = function radarAvailableExamsV9(mode = state.radarMode) {
  return state.exams.filter((exam) => SUBJECTS.some((subject) => radarValueV9(exam, subject, mode) !== null));
};

radarCardHtml = function radarCardHtmlV9() {
  const available = radarAvailableExams();
  const selected = selectedRadarExams();
  const rankMode = state.radarMode === 'rank';
  return `<div class="card radar-card"><div class="card-title-row"><div><h3 class="card-title">全部科目雷达图</h3><p class="card-sub">${rankMode ? '按排名百分位绘制：越靠外代表相对排名越好；可叠加多次考试观察竞争力变化。' : '按得分率绘制，支持叠加多次考试；没有数据的科目会自动隐藏，6 科就显示六边形。'}</p></div></div>
    <div class="radar-toolbar"><div class="toggle-row"><span class="label">查看内容</span><button class="chip ${state.radarMode === 'actual' ? 'active' : ''}" data-radar-mode="actual">真实成绩</button><button class="chip ${state.radarMode === 'target' ? 'active' : ''}" data-radar-mode="target">目标成绩</button><button class="chip ${state.radarMode === 'rank' ? 'active' : ''}" data-radar-mode="rank">排名百分位</button></div><div><div class="subtle-note">最多可叠加 4 次考试。叠加时只显示所选考试共同拥有数据的科目；坐标轴会按当前数据动态缩放。</div>${rankMode ? '<div class="radar-mode-note-v9"><b>排名百分位不是直接用“第几名”：</b>会结合参考人数标准化。第 1 名接近 100%，越高越好；不同考试人数变化时也更可比。</div>' : ''}<div class="multi-select" style="margin-top:8px">${available.length ? available.map((exam) => `<button class="select-pill ${state.radarSelection.includes(exam.id) ? 'active' : ''}" data-radar-exam="${exam.id}">${escapeHtml(exam.name)} · ${fmtDate(exam.exam_date)}</button>`).join('') : `<span class="subtle-note">${rankMode ? '当前还没有同时填写“名次 + 参考人数”的科目排名数据' : '当前还没有可用于雷达图的数据'}</span>`}</div></div></div>
    <div class="radar-wrap" id="radarChart">${radarChartHtml(selected)}</div>${radarLegendHtml(selected)}${radarSummaryHtml(selected)}</div>`;
};

radarChartHtml = function radarChartHtmlV9(selected) {
  if (!selected.length) return `<div class="empty-chart"><div><div class="empty-icon">◎</div>${state.radarMode === 'rank' ? '选择有排名数据的考试后，这里会显示各科排名百分位' : '选择 1 次或多次考试后，这里会显示全部科目的结构变化'}</div></div>`;
  const subjects = radarSubjectsV9(selected);
  if (!subjects.length) return `<div class="empty-chart"><div><div class="empty-icon">◎</div>${state.radarMode === 'rank' ? '所选考试没有共同且完整的排名数据，请检查各科名次和参考人数' : '所选考试没有共同的科目数据，暂时无法叠加比较'}</div></div>`;

  const allValues = [];
  selected.forEach((exam) => subjects.forEach((subject) => allValues.push(radarValueV9(exam, subject))));
  const axis = typeof calcDynamicAxisRangeV6 === 'function'
    ? calcDynamicAxisRangeV6(allValues, { minLimit: 0, maxLimit: 100, step: 5, minSpan: 20, padRatio: 0.16 })
    : { min: 0, max: 100, ticks: 5 };

  const W = 620, H = 430;
  const cx = 310, cy = 210, radius = 190;
  const angleStep = (Math.PI * 2) / subjects.length;
  const angleAt = (i) => -Math.PI / 2 + i * angleStep;
  const pointAt = (ratio, i) => {
    const angle = angleAt(i);
    const r = radius * ratio;
    return [cx + Math.cos(angle) * r, cy + Math.sin(angle) * r];
  };
  const normalize = (value) => Math.max(0, Math.min(1, (value - axis.min) / (axis.max - axis.min)));

  let grid = `<text x="${cx + 8}" y="${cy + 4}" class="axis-label">${Math.round(axis.min)}%</text>`;
  for (let i = 1; i <= axis.ticks; i += 1) {
    const ratio = i / axis.ticks;
    const pts = subjects.map((_, idx) => pointAt(ratio, idx).join(',')).join(' ');
    const labelValue = axis.min + ((axis.max - axis.min) * i / axis.ticks);
    grid += `<polygon points="${pts}" fill="none" stroke="#edf0f4"/>`;
    grid += `<text x="${cx + 8}" y="${cy - radius * ratio + 4}" class="axis-label">${Math.round(labelValue)}%</text>`;
  }
  subjects.forEach((subject, i) => {
    const [x, y] = pointAt(1, i);
    grid += `<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" stroke="#edf0f4"/>`;
    const labelPos = pointAt(1.11, i);
    const label = SUBJECT_SHORT[subject] || subjectShortV7?.(subject) || String(subject).slice(0, 2);
    grid += `<text x="${labelPos[0]}" y="${labelPos[1]}" text-anchor="middle" dominant-baseline="middle" class="axis-label" style="font-size:12px;fill:#55627a">${escapeHtml(label)}</text>`;
  });

  const polygons = selected.map((exam, index) => {
    const color = RADAR_COLORS[index % RADAR_COLORS.length];
    const points = subjects.map((subject, i) => pointAt(normalize(radarValueV9(exam, subject)), i).join(',')).join(' ');
    const circles = subjects.map((subject, i) => {
      const value = radarValueV9(exam, subject);
      const [x, y] = pointAt(normalize(value), i);
      let tip = `${escapeHtml(exam.name)} · ${escapeHtml(subject)} ${formatPercent(value)}`;
      if (state.radarMode === 'rank' && typeof rankInfoV7 === 'function') {
        const info = rankInfoV7(exam, subject);
        tip = `${escapeHtml(exam.name)} · ${escapeHtml(subject)} 第${info.rank}/${info.participants}名 · 排名百分位 ${formatPercent(value)}`;
      }
      return `<circle cx="${x}" cy="${y}" r="4.5" fill="#fff" stroke="${color}" stroke-width="2.3" data-tip="${tip}"/>`;
    }).join('');
    return `<polygon points="${points}" fill="${color}22" stroke="${color}" stroke-width="2.7"/>${circles}`;
  }).join('');
  const label = state.radarMode === 'rank' ? '排名百分位' : '纵轴';
  return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${grid}${polygons}</svg><div class="axis-caption-v6">${label}已按当前数据动态缩放（${axis.min}% - ${axis.max}%）</div>`;
};

radarSummaryHtml = function radarSummaryHtmlV9(selected) {
  if (!selected.length) return '';
  const subjects = radarSubjectsV9(selected);
  if (!subjects.length) return `<div class="radar-summary"><div class="summary-card"><h4>当前薄弱科目</h4><div class="subtle-note">所选考试没有共同完整的数据，暂时无法计算。</div></div><div class="summary-card"><h4>对比说明</h4><div class="subtle-note">请减少叠加考试，或补齐相同科目的${state.radarMode === 'rank' ? '名次和参考人数' : '成绩'}。</div></div></div>`;

  const latest = selected.at(-1);
  const earliest = selected[0];
  const weakness = subjects
    .map((subject) => ({ subject, value: radarValueV9(latest, subject) }))
    .sort((a, b) => a.value - b.value)
    .slice(0, 3);
  const comparisons = subjects
    .map((subject) => ({
      subject,
      delta: radarValueV9(latest, subject) - radarValueV9(earliest, subject),
      latest: radarValueV9(latest, subject)
    }))
    .sort((a, b) => b.delta - a.delta);
  const best = comparisons[0] || null;
  const worst = comparisons.at(-1) || null;
  const average = subjects.reduce((sum, subject) => sum + radarValueV9(latest, subject), 0) / subjects.length;
  const isRank = state.radarMode === 'rank';

  return `<div class="radar-summary"><div class="summary-card"><h4>${isRank ? '当前排名相对薄弱科目' : '当前薄弱科目'}</h4><div class="summary-list">${weakness.map((item, index) => `<div class="summary-item"><span>${index + 1}. <b>${escapeHtml(item.subject)}</b></span><span>${formatPercent(item.value)}</span></div>`).join('')}</div></div><div class="summary-card"><h4>${selected.length > 1 ? '对比变化' : '本次概况'}</h4>${selected.length > 1 ? `<div class="comparison-grid"><div>当前对比：<span class="comparison-strong">${escapeHtml(earliest.name)}</span> → <span class="comparison-strong">${escapeHtml(latest.name)}</span></div><div>参与对比科目：<span class="comparison-strong">${subjects.map((subject) => escapeHtml(SUBJECT_SHORT[subject] || subject)).join(' / ')}</span></div><div>${isRank ? '平均排名百分位' : '整体平均得分率'}：<span class="comparison-strong">${formatPercent(average)}</span></div><div>${isRank ? '排名提升最大' : '进步最大'}：${best ? `<span class="comparison-positive">${escapeHtml(best.subject)} ${best.delta >= 0 ? '+' : ''}${formatPercent(best.delta).replace('%', '')}%</span>` : '—'}</div><div>需要关注：${worst ? `<span class="comparison-negative">${escapeHtml(worst.subject)} ${worst.delta >= 0 ? '+' : ''}${formatPercent(worst.delta).replace('%', '')}%</span>` : '—'}</div></div>` : `<div class="comparison-grid"><div>已选择：<span class="comparison-strong">${escapeHtml(latest.name)}</span></div><div>参与科目：<span class="comparison-strong">${subjects.map((subject) => escapeHtml(SUBJECT_SHORT[subject] || subject)).join(' / ')}</span></div><div>${isRank ? '平均排名百分位' : '平均得分率'}：<span class="comparison-strong">${formatPercent(average)}</span></div><div class="subtle-note">再多选几次考试，就可以直接看到${isRank ? '各科相对排名' : '弱项'}改善了多少。</div></div>`}</div></div>`;
};

// Radar points also support tap/hover tooltips in v9.
const bindPageBeforeV9 = bindPage;
bindPage = function bindPageV9() {
  bindPageBeforeV9();
  const radar = $('#radarChart');
  if (!radar) return;
  let tip = $('.tooltip-card', radar);
  if (!tip) {
    tip = document.createElement('div');
    tip.className = 'tooltip-card';
    radar.appendChild(tip);
  }
  $$('[data-tip]', radar).forEach((point) => {
    const show = () => {
      tip.textContent = point.dataset.tip;
      tip.style.display = 'block';
      const rect = radar.getBoundingClientRect();
      const pointRect = point.getBoundingClientRect();
      tip.style.left = `${pointRect.left - rect.left + pointRect.width / 2}px`;
      tip.style.top = `${pointRect.top - rect.top}px`;
    };
    point.addEventListener('mouseenter', show);
    point.addEventListener('click', show);
    point.addEventListener('mouseleave', () => { tip.style.display = 'none'; });
  });
};
;
/* ===== app-v10.js ===== */
// v10: subjects belong to each exam; hide/delete controls; hidden exams stay out of charts
state.allExams = state.allExams || [];

(function injectV10Styles() {
  if ($('#app-v10-extra-style')) return;
  const style = document.createElement('style');
  style.id = 'app-v10-extra-style';
  style.textContent = `
    .exam-subjects-v10{display:grid;gap:12px;margin-top:12px}
    .exam-subject-card-v10{border:1px solid var(--line);border-radius:16px;background:#fbfcfe;padding:13px}
    .exam-subject-head-v10{display:grid;grid-template-columns:minmax(0,1fr) 38px;gap:8px;align-items:center;margin-bottom:10px}
    .exam-subject-name-v10{border:1px solid var(--line);background:#fff;border-radius:11px;padding:10px 11px;font-weight:700;min-width:0;width:100%;outline:none}
    .exam-subject-card-v10 input:focus{border-color:#98a6f2;box-shadow:0 0 0 3px #eef0ff}
    .remove-exam-subject-v10{width:38px;height:38px;border:1px solid #f0d9dc;border-radius:11px;background:#fff;color:var(--danger);font-size:18px}
    .exam-score-grid-v10{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
    .exam-rank-grid-v10{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:8px}
    .mini-field-v10{display:grid;gap:5px;min-width:0}
    .mini-field-v10 label{font-size:10px;color:var(--muted);font-weight:700}
    .mini-field-v10 input{width:100%;min-width:0;border:1px solid var(--line);background:#fff;border-radius:10px;padding:9px 8px;outline:none}
    .exam-subject-toolbar-v10{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-top:12px}
    .template-note-v10{font-size:11px;color:var(--muted);line-height:1.55}
    .visibility-box-v10{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 13px;border:1px solid var(--line);border-radius:14px;background:#f7f8fb;margin-top:14px}
    .visibility-box-v10 b{display:block;font-size:12px;margin-bottom:3px}.visibility-box-v10 span{font-size:11px;color:var(--muted);line-height:1.5}
    .hidden-record-v10{opacity:.64;background:#fafafa}
    .hidden-badge-v10{display:inline-flex;align-items:center;border:1px solid #dfe3ea;background:#f2f4f7;color:#6d7787;border-radius:999px;padding:4px 8px;font-size:10px;font-weight:700;margin-left:7px}
    .record-actions-v10{display:flex;gap:6px;align-items:center;flex-wrap:wrap}
    .record-action-btn-v10{border:1px solid var(--line);background:#fff;border-radius:10px;padding:7px 9px;font-size:11px;color:#5f6b7b;white-space:nowrap}
    .record-action-btn-v10.danger{color:var(--danger);border-color:#f0d9dc}
    .modal-danger-row-v10{display:flex;justify-content:flex-start;margin-top:8px}
    .delete-exam-v10{border:1px solid #f1d6da;background:#fff;color:var(--danger);border-radius:12px;padding:10px 13px;font-weight:700}
    .account-note-v10{margin-top:18px;padding:22px}
    @media(max-width:620px){
      .exam-score-grid-v10{gap:6px}.exam-rank-grid-v10{gap:6px}
      .exam-subject-card-v10{padding:11px}.mini-field-v10 input{font-size:12px;padding:9px 6px}
    }
  `;
  document.head.appendChild(style);
})();

function deriveExamSubjectsV10(exams, templates = []) {
  const names = [], seen = new Set();
  for (const exam of exams || []) {
    for (const name of Object.keys(exam.scores || {})) {
      if (!seen.has(name)) { seen.add(name); names.push(name); }
    }
  }
  if (!names.length) {
    for (const item of templates || []) {
      const name = String(item.name || '').trim();
      if (name && !seen.has(name)) { seen.add(name); names.push(name); }
    }
  }
  return names;
}

function applyExamSubjectsV10(exams, templates = []) {
  state.subjectConfigs = templates || [];
  const names = deriveExamSubjectsV10(exams, templates);
  SUBJECTS.splice(0, SUBJECTS.length, ...names);
  for (const item of templates || []) {
    if (!item?.name) continue;
    SUBJECT_MAX[item.name] = Number(item.defaultMax ?? SUBJECT_MAX[item.name] ?? 100);
    SUBJECT_SHORT[item.name] = typeof subjectShortV7 === 'function' ? subjectShortV7(item.name) : String(item.name).slice(0, 2);
  }
  for (const exam of exams || []) {
    for (const [name, row] of Object.entries(exam.scores || {})) {
      if (row?.max) SUBJECT_MAX[name] = Number(row.max);
      SUBJECT_SHORT[name] = SUBJECT_SHORT[name] || (typeof subjectShortV7 === 'function' ? subjectShortV7(name) : String(name).slice(0, 2));
    }
  }
  if (!['总览', '总分', ...SUBJECTS].includes(state.subject)) state.subject = '总分';
}

loadExams = async function loadExamsV10() {
  const data = await dataApiV7('list_exams');
  state.allExams = data.exams || [];
  state.exams = state.allExams.filter((exam) => !exam.is_hidden);
  applyExamSubjectsV10(state.exams, data.subjects || []);
  state.radarSelection = (state.radarSelection || []).filter((id) => state.exams.some((exam) => exam.id === id));
  ensureRadarSelection();
};

function seedRowsV10(exam) {
  if (exam) {
    return Object.entries(exam.scores || {}).map(([name, row]) => ({
      name, target: row.target ?? '', actual: row.actual ?? '', max: row.max ?? defaultMax(name),
      rank: row.rank ?? '', participants: row.participants ?? ''
    }));
  }
  const last = state.exams.at(-1);
  if (last && Object.keys(last.scores || {}).length) {
    return Object.entries(last.scores).map(([name, row]) => ({ name, target: '', actual: '', max: row.max ?? defaultMax(name), rank: '', participants: '' }));
  }
  const templates = state.subjectConfigs?.length ? state.subjectConfigs : SUBJECTS.map((name) => ({ name, defaultMax: defaultMax(name) }));
  return templates.map((item) => ({ name: item.name, target: '', actual: '', max: item.defaultMax ?? 100, rank: '', participants: '' }));
}

openExam = function openExamV10(exam = null) {
  const editing = !!exam, today = new Date().toISOString().slice(0, 10), rows = seedRowsV10(exam);
  const modal = document.createElement('div');
  modal.className = 'modal-backdrop';
  modal.innerHTML = `<div class="modal"><div class="modal-head"><h3>${editing ? '编辑考试' : '记录一次考试'}</h3><button class="close-btn" aria-label="关闭">×</button></div><div class="modal-body">
    <div class="form-grid"><div class="field"><label>考试名称</label><input id="examName" maxlength="60" value="${escapeHtml(exam?.name || '')}" placeholder="例如：期中考试 / 2023 英语真题"></div><div class="field"><label>考试日期</label><input id="examDate" type="date" value="${exam?.exam_date || today}"></div></div>
    <div class="section-head-v7"><div><h4>本次考试科目</h4><p>科目只属于这一次考试，可以随意新增、删除或改成题型/模块，不影响其他考试。</p></div></div>
    <div class="exam-subjects-v10" id="examSubjectsV10"></div>
    <div class="exam-subject-toolbar-v10"><button class="secondary" id="addExamSubjectV10">＋ 添加科目 / 模块</button><span class="template-note-v10">新考试默认沿用最近一次的科目，减少重复输入。</span></div>
    <div class="section-head-v7"><div><h4>总排名（可选）</h4><p>各科排名在上面的科目卡里填写；参考人数留空时使用这里的总参考人数。</p></div></div>
    <div class="rank-table-v7"><div class="rank-row-v7 header"><span>项目</span><span>名次</span><span>参考人数</span></div><div class="rank-row-v7 total"><span class="subject-name">总分</span><input id="totalRankV10" inputmode="numeric" pattern="[0-9]*" placeholder="例如 36" value="${exam?.total_rank ?? ''}"><input id="totalParticipantsV10" inputmode="numeric" pattern="[0-9]*" placeholder="例如 620" value="${exam?.total_participants ?? ''}"></div></div>
    <div class="rank-science-box-v7"><b>排名比较：</b>趋势图和雷达图都会把“名次 + 参考人数”换算成排名百分位（超越率），越高越好。建议长期保持同一种口径，例如都记录年级排名。</div>
    <div class="visibility-box-v10"><div><b>图表显示状态</b><span>${exam?.is_hidden ? '这次考试已隐藏：记录仍保留，但不参与首页统计、趋势图和雷达图。' : '这次考试当前会参与首页统计、趋势图和雷达图。'}</span></div><button class="secondary" id="toggleHiddenModalV10">${exam?.is_hidden ? '恢复显示' : '从图表隐藏'}</button><input type="hidden" id="examHiddenV10" value="${exam?.is_hidden ? '1' : '0'}"></div>
    ${editing ? '<div class="modal-danger-row-v10"><button class="delete-exam-v10" id="deleteExamModalV10">删除这次考试</button></div>' : ''}
    <div class="modal-actions"><button class="secondary cancel-btn">取消</button><button class="primary save-btn">${editing ? '保存修改' : '保存考试'}</button></div>
  </div></div>`;
  document.body.appendChild(modal);
  state.modal = modal;
  const list = $('#examSubjectsV10', modal);

  const syncRows = () => {
    const next = $$('.exam-subject-card-v10', list).map((card) => ({
      name: $('.exam-subject-name-v10', card).value,
      target: $('.target-v10', card).value,
      actual: $('.actual-v10', card).value,
      max: $('.max-v10', card).value,
      rank: $('.rank-v10', card).value,
      participants: $('.participants-v10', card).value
    }));
    rows.splice(0, rows.length, ...next);
  };
  const cardHtml = (row) => `<div class="exam-subject-card-v10"><div class="exam-subject-head-v10"><input class="exam-subject-name-v10" maxlength="40" value="${escapeHtml(row.name || '')}" placeholder="科目 / 题型 / 模块名称"><button class="remove-exam-subject-v10" type="button" title="删除本次考试中的这个科目">×</button></div><div class="exam-score-grid-v10"><div class="mini-field-v10"><label>目标成绩</label><input class="target-v10" inputmode="decimal" placeholder="可留空" value="${row.target ?? ''}"></div><div class="mini-field-v10"><label>真实成绩</label><input class="actual-v10" inputmode="decimal" placeholder="可留空" value="${row.actual ?? ''}"></div><div class="mini-field-v10"><label>满分</label><input class="max-v10" inputmode="decimal" value="${row.max ?? 100}"></div></div><div class="exam-rank-grid-v10"><div class="mini-field-v10"><label>科目名次</label><input class="rank-v10" inputmode="numeric" pattern="[0-9]*" placeholder="可留空" value="${row.rank ?? ''}"></div><div class="mini-field-v10"><label>参考人数</label><input class="participants-v10" inputmode="numeric" pattern="[0-9]*" placeholder="留空=总人数" value="${row.participants ?? ''}"></div></div></div>`;
  const renderRows = () => {
    list.innerHTML = rows.map(cardHtml).join('');
    $$('.remove-exam-subject-v10', list).forEach((button, index) => button.onclick = () => { syncRows(); rows.splice(index, 1); renderRows(); });
    $$('.exam-subject-name-v10', list).forEach((input) => input.addEventListener('blur', () => {
      const card = input.closest('.exam-subject-card-v10'), max = $('.max-v10', card), known = SUBJECT_MAX[input.value.trim()];
      if (known && (!max.value || Number(max.value) === 100)) max.value = known;
    }));
  };
  renderRows();

  const close = () => { modal.remove(); state.modal = null; };
  $('.close-btn', modal).onclick = close; $('.cancel-btn', modal).onclick = close;
  modal.onclick = (event) => { if (event.target === modal) close(); };
  $('#addExamSubjectV10', modal).onclick = () => {
    if (rows.length >= 40) return toast('单次考试最多 40 个科目 / 模块');
    syncRows(); rows.push({ name: '', target: '', actual: '', max: 100, rank: '', participants: '' }); renderRows();
    $('.exam-subject-card-v10:last-child .exam-subject-name-v10', list)?.focus();
  };
  $('#toggleHiddenModalV10', modal).onclick = () => {
    const hiddenInput = $('#examHiddenV10', modal), next = hiddenInput.value !== '1';
    hiddenInput.value = next ? '1' : '0';
    $('#toggleHiddenModalV10', modal).textContent = next ? '恢复显示' : '从图表隐藏';
    $('.visibility-box-v10 span', modal).textContent = next ? '保存后，这次考试仍会保留在记录中，但不参与首页统计、趋势图和雷达图。' : '保存后，这次考试会重新参与首页统计、趋势图和雷达图。';
  };
  $('#deleteExamModalV10', modal)?.addEventListener('click', async () => {
    if (!confirm(`确定永久删除「${exam?.name || '这次考试'}」？成绩和排名都会一起删除。`)) return;
    try { await dataApiV7('delete_exam', { examId: exam.id }); await loadExams(); close(); render(); toast('已删除'); }
    catch (error) { toast(error.message); }
  });
  $('.save-btn', modal).onclick = () => saveExam(exam?.id || null, modal);
};

validateExam = function validateExamV10(exam) {
  const totalRank = num(exam.total_rank), totalParticipants = num(exam.total_participants);
  if (totalRank !== null && (!Number.isInteger(totalRank) || totalRank < 1)) return '总排名请输入正整数';
  if (totalParticipants !== null && (!Number.isInteger(totalParticipants) || totalParticipants < 1)) return '参考人数请输入正整数';
  if (totalRank !== null && totalParticipants !== null && totalRank > totalParticipants) return '总排名不能大于参考人数';
  const names = new Set();
  for (const [name, row] of Object.entries(exam.scores || {})) {
    if (!name || name.length > 40) return '科目名称不能为空且不能超过 40 个字符';
    if (names.has(name)) return `科目「${name}」重复了`; names.add(name);
    const max = num(row.max) ?? defaultMax(name), target = num(row.target), actual = num(row.actual), rank = num(row.rank), participants = num(row.participants), effective = participants ?? totalParticipants;
    if (!Number.isFinite(max) || max <= 0) return `${name} 的满分必须大于 0`;
    if (target !== null && target > max) return `${name} 的目标成绩不能超过满分 ${formatScore(max)}`;
    if (actual !== null && actual > max) return `${name} 的真实成绩不能超过满分 ${formatScore(max)}`;
    if (rank !== null && (!Number.isInteger(rank) || rank < 1)) return `${name}排名请输入正整数`;
    if (participants !== null && (!Number.isInteger(participants) || participants < 1)) return `${name}参考人数请输入正整数`;
    if (rank !== null && effective !== null && rank > effective) return `${name}排名不能大于参考人数`;
  }
  return '';
};

saveExam = async function saveExamV10(id, modal) {
  const btn = $('.save-btn', modal), exam = {
    id, name: $('#examName', modal).value.trim(), exam_date: $('#examDate', modal).value,
    total_rank: $('#totalRankV10', modal)?.value || '', total_participants: $('#totalParticipantsV10', modal)?.value || '',
    is_hidden: $('#examHiddenV10', modal)?.value === '1', scores: {}
  };
  const seen = new Set();
  for (const card of $$('.exam-subject-card-v10', modal)) {
    const name = $('.exam-subject-name-v10', card).value.trim();
    if (!name) return toast('请填写科目名称，或删除空白科目');
    if (seen.has(name)) return toast(`科目「${name}」重复了`); seen.add(name);
    exam.scores[name] = { target: $('.target-v10', card).value, actual: $('.actual-v10', card).value, max: $('.max-v10', card).value, rank: $('.rank-v10', card).value, participants: $('.participants-v10', card).value };
  }
  if (!exam.name || !exam.exam_date) return toast('请填写考试名称和日期');
  const error = validateExam(exam); if (error) return toast(error);
  btn.disabled = true; btn.textContent = '保存中…';
  try { await dataApiV7('save_exam', { exam }); await loadExams(); modal.remove(); state.modal = null; render(); toast(id ? '已保存修改' : '考试已记录'); }
  catch (error) { toast(error.message); btn.disabled = false; btn.textContent = id ? '保存修改' : '保存考试'; }
};

deleteExam = async function deleteExamV10(id) {
  const exam = (state.allExams || []).find((item) => item.id === id) || state.exams.find((item) => item.id === id);
  if (!confirm(`确定永久删除「${exam?.name || '这次考试'}」？成绩和排名都会一起删除。`)) return;
  try { await dataApiV7('delete_exam', { examId: id }); await loadExams(); render(); toast('已删除'); }
  catch (error) { toast(error.message); }
};

async function toggleExamHiddenV10(id) {
  const exam = (state.allExams || []).find((item) => item.id === id); if (!exam) return;
  try { await dataApiV7('toggle_exam_hidden', { examId: id, hidden: !exam.is_hidden }); await loadExams(); render(); toast(exam.is_hidden ? '已恢复到图表' : '已从图表隐藏'); }
  catch (error) { toast(error.message); }
}

recordHtml = function recordHtmlV10(exam) {
  const subjects = Object.keys(exam.scores || {}), rank = rankInfoV7(exam, '总分');
  const actualVals = subjects.map((s) => examScore(exam, s, 'actual')).filter((v) => v !== null), targetVals = subjects.map((s) => examScore(exam, s, 'target')).filter((v) => v !== null);
  const actual = actualVals.length ? actualVals.reduce((a, b) => a + b, 0) : null, target = targetVals.length ? targetVals.reduce((a, b) => a + b, 0) : null;
  return `<div class="record ${exam.is_hidden ? 'hidden-record-v10' : ''}"><div class="record-date">${fmtYearDate(exam.exam_date)}<b>${escapeHtml(exam.name)}${exam.is_hidden ? '<span class="hidden-badge-v10">已隐藏</span>' : ''}</b></div><div class="record-scores">${subjects.map((subject) => {
    const row = exam.scores[subject] || {}, a = num(row.actual), t = num(row.target), r = num(row.rank), n = num(row.participants) ?? num(exam.total_participants);
    if (a === null && t === null && r === null) return '';
    return `<span class="score-tag">${escapeHtml(subject)} ${a === null ? '—' : formatScore(a)}<span style="color:#a1a9b5"> / ${t === null ? '—' : formatScore(t)}</span>${r === null ? '' : `<span style="color:#667085"> · 第${r}${n ? `/${n}` : ''}</span>`}</span>`;
  }).join('') || '<span class="score-tag">尚未填写分数或排名</span>'}<span class="score-tag"><b>总分 ${actual === null ? '—' : formatScore(actual)}</b> / 目标 ${target === null ? '—' : formatScore(target)}</span>${rank.rank !== null ? `<span class="score-tag"><b>总排名 ${rank.rank}${rank.participants ? ` / ${rank.participants}` : ''}</b>${rank.performance !== null ? ` · ${formatPercent(rank.performance)}` : ''}</span>` : ''}</div><div class="record-actions record-actions-v10"><button class="record-action-btn-v10" data-edit="${exam.id}">编辑</button><button class="record-action-btn-v10" data-hidden-toggle="${exam.id}">${exam.is_hidden ? '恢复显示' : '隐藏'}</button><button class="record-action-btn-v10 danger" data-delete="${exam.id}">删除</button></div></div>`;
};

recordsHtml = function recordsHtmlV10() {
  const exams = state.allExams || [], hiddenCount = exams.filter((exam) => exam.is_hidden).length;
  return `<div class="page-head"><div><h2>考试记录</h2><p>每次考试可以有不同科目；“隐藏”只影响图表，不会删除记录。${hiddenCount ? ` 当前有 ${hiddenCount} 次已隐藏。` : ''}</p></div><button class="primary" id="addExam">＋ 新建</button></div><div class="card records-card">${exams.length ? exams.map(recordHtml).join('') : `<div class="empty-chart" style="height:300px"><div><div class="empty-icon">📝</div>还没有考试记录<br><button class="secondary" id="emptyAdd" style="margin-top:14px">记录第一场考试</button></div></div>`}</div>`;
};

accountHtml = function accountHtmlV10() {
  const base = typeof accountHtmlBeforeV7 === 'function' ? accountHtmlBeforeV7() : `<div class="page-head"><div><h2>账号</h2></div></div>`;
  return `${base}<div class="card account-note-v10"><h3 class="card-title">科目按考试单独设置</h3><p class="card-sub">现在不再需要维护一套全局科目。新建或编辑某次考试时，可以直接添加、删除、改名科目或题型，只影响那一次考试；新考试默认沿用最近一次的科目。</p></div>`;
};

const bindPageBeforeV10 = bindPage;
bindPage = function bindPageV10() {
  bindPageBeforeV10();
  $$('[data-edit]').forEach((button) => button.onclick = () => { const exam = (state.allExams || []).find((item) => item.id === button.dataset.edit); if (exam) openExam(exam); });
  $$('[data-delete]').forEach((button) => button.onclick = () => deleteExam(button.dataset.delete));
  $$('[data-hidden-toggle]').forEach((button) => button.onclick = () => toggleExamHiddenV10(button.dataset.hiddenToggle));
};

const renderLoginBeforeV10 = renderLogin;
renderLogin = function renderLoginV10(error = '') {
  renderLoginBeforeV10(error);
  const help = $('.auth-help'); if (help) help.textContent = '每次考试都可自由增减科目，并支持成绩、排名趋势与排名百分位雷达对比。';
};
;
/* ===== app-v11.js ===== */
// v11: add direct raw-rank views beside normalized rank percentile
state.trendMetric = state.trendMetric || 'score';

(function injectV11Styles() {
  if ($('#app-v11-extra-style')) return;
  const style = document.createElement('style');
  style.id = 'app-v11-extra-style';
  style.textContent = `
    .raw-rank-note-v11{font-size:11px;line-height:1.6;color:var(--muted);margin-top:8px}
    .raw-rank-note-v11 b{color:var(--text)}
  `;
  document.head.appendChild(style);
})();

function rawRankValueV11(exam, subject) {
  if (!exam) return null;
  if (subject === '总分') return num(exam.total_rank);
  return num(exam.scores?.[subject]?.rank);
}

function niceRankStepV11(rough) {
  if (!Number.isFinite(rough) || rough <= 1) return 1;
  const power = 10 ** Math.floor(Math.log10(rough));
  const fraction = rough / power;
  const nice = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 2.5 ? 2.5 : fraction <= 5 ? 5 : 10;
  return Math.max(1, nice * power);
}

function rawRankAxisV11(values) {
  const nums = (values || []).filter((v) => v !== null && Number.isFinite(Number(v))).map(Number);
  if (!nums.length) return { min: 1, max: 100, step: 20, ticks: 5 };
  const lo = Math.min(...nums), hi = Math.max(...nums);
  const span = Math.max(hi - lo, Math.max(8, hi * 0.08));
  const pad = Math.max(2, span * 0.14);
  const step = niceRankStepV11((span + pad * 2) / 5);
  let min = Math.max(1, Math.floor((lo - pad) / step) * step);
  let max = Math.ceil((hi + pad) / step) * step;
  if (min < 1) min = 1;
  if (max <= min) max = min + step * 4;
  let ticks = Math.round((max - min) / step);
  if (ticks < 3) { max = min + step * 4; ticks = 4; }
  if (ticks > 6) ticks = 6;
  return { min, max, step: (max - min) / ticks, ticks };
}

function rawRankChartHtmlV11() {
  if (!state.exams.length) return `<div class="empty-chart" style="height:300px"><div><div class="empty-icon">↕</div>记录名次后，这里会显示原始名次趋势</div></div>`;
  const colors = typeof rankSeriesColorsV7 === 'function' ? rankSeriesColorsV7() : ['#18212f','#5d72e8','#32a77a','#e59b45','#df5f68','#8f62db','#22a6b3','#f06a8b','#6c87ff','#7a8a9a'];
  const subjects = state.subject === '总览' ? ['总分', ...SUBJECTS] : [state.subject];
  const series = subjects.map((subject, index) => ({ subject, color: colors[index % colors.length] }));
  const visible = series.filter((item) => state.exams.some((exam) => rawRankValueV11(exam, item.subject) !== null));
  if (!visible.length) return `<div class="empty-chart" style="height:300px"><div><div class="empty-icon">↕</div>这个项目还没有名次数据</div></div>`;

  const points = state.exams.map((exam) => ({ exam, values: visible.map((item) => rawRankValueV11(exam, item.subject)) }));
  const axis = rawRankAxisV11(points.flatMap((point) => point.values));
  const W = 760, H = 310, L = 56, R = 20, T = 18, B = 46;
  const cw = W - L - R, ch = H - T - B;
  const x = (i) => points.length === 1 ? L + cw / 2 : L + (i / (points.length - 1)) * cw;
  // Raw rank is intentionally inverted: rank 1 stays at the top, larger/worse ranks go downward.
  const y = (v) => T + (v - axis.min) / (axis.max - axis.min) * ch;

  let grid = '';
  for (let i = 0; i <= axis.ticks; i += 1) {
    const value = axis.min + ((axis.max - axis.min) * i / axis.ticks);
    const yy = T + (ch * i / axis.ticks);
    grid += `<line x1="${L}" y1="${yy}" x2="${W - R}" y2="${yy}" stroke="#edf0f4"/><text x="${L - 8}" y="${yy + 4}" text-anchor="end" class="axis-label">第${Math.max(1, Math.round(value))}</text>`;
  }

  const lines = visible.map((item, seriesIndex) => {
    let d = '', started = false, circles = '';
    points.forEach((point, pointIndex) => {
      const value = point.values[seriesIndex];
      if (value === null) { started = false; return; }
      const xx = x(pointIndex), yy = y(value);
      d += `${started ? 'L' : 'M'} ${xx} ${yy} `;
      started = true;
      circles += `<circle cx="${xx}" cy="${yy}" r="4.5" fill="#fff" stroke="${item.color}" stroke-width="2.5" data-tip="${escapeHtml(point.exam.name)} · ${escapeHtml(item.subject)} 第${value}名"/>`;
    });
    return `<path d="${d}" fill="none" stroke="${item.color}" stroke-width="${seriesIndex === 0 && state.subject === '总览' ? '3.4' : '2.6'}" stroke-linecap="round" stroke-linejoin="round"/>${circles}`;
  }).join('');
  const labels = points.map((point, index) => `<text x="${x(index)}" y="${H - 17}" text-anchor="middle" class="axis-label">${fmtDate(point.exam.exam_date)}</text>`).join('');
  const legend = state.subject === '总览' ? `<div class="rank-legend-v7">${visible.map((item) => `<span><i style="background:${item.color}"></i>${escapeHtml(item.subject)}</span>`).join('')}</div>` : '';
  return `<div class="rank-chart-stage-v7"><svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">${grid}${lines}${labels}</svg><div class="tooltip-card" id="chartTip"></div></div>${legend}<div class="raw-rank-note-v11"><b>原始名次模式：</b>直接显示第几名，不换算百分位；纵轴越高越好，第 1 名在最上方。总览叠加时，最好保证各科使用相同的排名口径和相近的参考人数。</div>`;
}

const chartHtmlBeforeV11 = chartHtml;
chartHtml = function chartHtmlV11() {
  if (state.trendMetric === 'rank_raw') return rawRankChartHtmlV11();
  return chartHtmlBeforeV11();
};

const homeHtmlBeforeV11 = homeHtml;
homeHtml = function homeHtmlV11() {
  let html = homeHtmlBeforeV11();
  html = html.replace(/<button class="metric-btn-v7 [^"]*" data-trend-metric="rank">排名<\/button>/,
    `<button class="metric-btn-v7 ${state.trendMetric === 'rank_raw' ? 'active' : ''}" data-trend-metric="rank_raw">名次</button><button class="metric-btn-v7 ${state.trendMetric === 'rank' ? 'active' : ''}" data-trend-metric="rank">排名百分位</button>`);
  if (state.trendMetric === 'rank_raw') {
    html = html.replace('<h3 class="card-title">成绩趋势</h3>', '<h3 class="card-title">名次趋势</h3>');
    html = html.replace('<p class="card-sub">真实成绩与目标成绩放在同一张图里</p>', '<p class="card-sub">直接看原始第几名；纵轴反向显示，第 1 名在最上方</p>');
    html = html.replace('<p class="card-sub">总分与各科按得分率叠加展示，没有数据的科目会自动隐藏</p>', '<p class="card-sub">总分与各科直接叠加原始名次；越靠上代表名次越好</p>');
    html = html.replace('<div class="legend"><span><i class="actual"></i>真实成绩</span><span><i class="target"></i>目标成绩</span></div>', '<div class="subtle-note">原始名次 · 第 1 名最好</div>');
    html = html.replace('<div class="subtle-note">真实成绩 · 得分率</div>', '<div class="subtle-note">原始名次 · 越小越好</div>');
    html = html.replace('<div class="chart-wrap" id="chart">', '<div class="chart-wrap rank-mode-v7" id="chart">');
    html = html.replace('<div class="chart-wrap overview-mode-v5" id="chart">', '<div class="chart-wrap rank-mode-v7" id="chart">');
  }
  return html;
};

const radarValueBeforeV11 = radarValueV9;
radarValueV9 = function radarValueV11(exam, subject, mode = state.radarMode) {
  if (mode === 'rank_raw') return rawRankValueV11(exam, subject);
  return radarValueBeforeV11(exam, subject, mode);
};

const radarChartBeforeV11 = radarChartHtml;
radarChartHtml = function radarChartHtmlV11(selected) {
  if (state.radarMode !== 'rank_raw') return radarChartBeforeV11(selected);
  if (!selected.length) return `<div class="empty-chart"><div><div class="empty-icon">◎</div>选择有名次数据的考试后，这里会直接显示各科原始名次</div></div>`;
  const subjects = radarSubjectsV9(selected, 'rank_raw');
  if (!subjects.length) return `<div class="empty-chart"><div><div class="empty-icon">◎</div>所选考试没有共同的科目名次，暂时无法叠加比较</div></div>`;

  const allValues = [];
  selected.forEach((exam) => subjects.forEach((subject) => allValues.push(rawRankValueV11(exam, subject))));
  const axis = rawRankAxisV11(allValues);
  const W = 620, H = 430, cx = 310, cy = 210, radius = 190;
  const angleStep = (Math.PI * 2) / subjects.length;
  const angleAt = (i) => -Math.PI / 2 + i * angleStep;
  const pointAt = (ratio, i) => {
    const angle = angleAt(i), r = radius * ratio;
    return [cx + Math.cos(angle) * r, cy + Math.sin(angle) * r];
  };
  // Smaller/better rank is farther out, preserving the radar-chart meaning: outward = better.
  const normalize = (rank) => Math.max(0, Math.min(1, (axis.max - rank) / (axis.max - axis.min)));

  let grid = `<text x="${cx + 8}" y="${cy + 4}" class="axis-label">第${Math.round(axis.max)}</text>`;
  for (let i = 1; i <= axis.ticks; i += 1) {
    const ratio = i / axis.ticks;
    const pts = subjects.map((_, idx) => pointAt(ratio, idx).join(',')).join(' ');
    const rankValue = axis.max - ((axis.max - axis.min) * ratio);
    grid += `<polygon points="${pts}" fill="none" stroke="#edf0f4"/>`;
    grid += `<text x="${cx + 8}" y="${cy - radius * ratio + 4}" class="axis-label">第${Math.max(1, Math.round(rankValue))}</text>`;
  }
  subjects.forEach((subject, i) => {
    const [x, y] = pointAt(1, i), labelPos = pointAt(1.11, i);
    const label = SUBJECT_SHORT[subject] || (typeof subjectShortV7 === 'function' ? subjectShortV7(subject) : String(subject).slice(0, 2));
    grid += `<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" stroke="#edf0f4"/>`;
    grid += `<text x="${labelPos[0]}" y="${labelPos[1]}" text-anchor="middle" dominant-baseline="middle" class="axis-label" style="font-size:12px;fill:#55627a">${escapeHtml(label)}</text>`;
  });

  const polygons = selected.map((exam, index) => {
    const color = RADAR_COLORS[index % RADAR_COLORS.length];
    const points = subjects.map((subject, i) => pointAt(normalize(rawRankValueV11(exam, subject)), i).join(',')).join(' ');
    const circles = subjects.map((subject, i) => {
      const value = rawRankValueV11(exam, subject), [x, y] = pointAt(normalize(value), i);
      return `<circle cx="${x}" cy="${y}" r="4.5" fill="#fff" stroke="${color}" stroke-width="2.3" data-tip="${escapeHtml(exam.name)} · ${escapeHtml(subject)} 第${value}名"/>`;
    }).join('');
    return `<polygon points="${points}" fill="${color}22" stroke="${color}" stroke-width="2.7"/>${circles}`;
  }).join('');
  return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${grid}${polygons}</svg><div class="axis-caption-v6">原始名次动态缩放（外圈名次更好：第${Math.round(axis.min)} ～ 第${Math.round(axis.max)}）</div>`;
};

const radarSummaryBeforeV11 = radarSummaryHtml;
radarSummaryHtml = function radarSummaryHtmlV11(selected) {
  if (state.radarMode !== 'rank_raw') return radarSummaryBeforeV11(selected);
  if (!selected.length) return '';
  const subjects = radarSubjectsV9(selected, 'rank_raw');
  if (!subjects.length) return `<div class="radar-summary"><div class="summary-card"><h4>当前名次较弱科目</h4><div class="subtle-note">所选考试没有共同名次数据。</div></div></div>`;
  const latest = selected.at(-1), earliest = selected[0];
  const weakness = subjects.map((subject) => ({ subject, rank: rawRankValueV11(latest, subject) })).sort((a, b) => b.rank - a.rank).slice(0, 3);
  const comparisons = subjects.map((subject) => ({
    subject,
    before: rawRankValueV11(earliest, subject),
    after: rawRankValueV11(latest, subject),
    improvement: rawRankValueV11(earliest, subject) - rawRankValueV11(latest, subject)
  })).sort((a, b) => b.improvement - a.improvement);
  const best = comparisons[0] || null, worst = comparisons.at(-1) || null;
  return `<div class="radar-summary"><div class="summary-card"><h4>当前名次较弱科目</h4><div class="summary-list">${weakness.map((item, index) => `<div class="summary-item"><span>${index + 1}. <b>${escapeHtml(item.subject)}</b></span><span>第${item.rank}名</span></div>`).join('')}</div></div><div class="summary-card"><h4>${selected.length > 1 ? '名次变化' : '本次概况'}</h4>${selected.length > 1 ? `<div class="comparison-grid"><div>当前对比：<span class="comparison-strong">${escapeHtml(earliest.name)}</span> → <span class="comparison-strong">${escapeHtml(latest.name)}</span></div><div>参与科目：<span class="comparison-strong">${subjects.map((subject) => escapeHtml(SUBJECT_SHORT[subject] || subject)).join(' / ')}</span></div><div>进步最大：${best ? `<span class="comparison-positive">${escapeHtml(best.subject)} ${best.improvement >= 0 ? '↑' : '↓'}${Math.abs(best.improvement)}名</span>` : '—'}</div><div>需要关注：${worst ? `<span class="comparison-negative">${escapeHtml(worst.subject)} ${worst.improvement >= 0 ? '↑' : '↓'}${Math.abs(worst.improvement)}名</span>` : '—'}</div></div>` : `<div class="comparison-grid"><div>已选择：<span class="comparison-strong">${escapeHtml(latest.name)}</span></div><div class="subtle-note">再选择一次考试，就能直接比较各科前进或后退了多少名。</div></div>`}</div></div>`;
};

const radarCardBeforeV11 = radarCardHtml;
radarCardHtml = function radarCardHtmlV11() {
  let html = radarCardBeforeV11();
  html = html.replace(/<button class="chip [^"]*" data-radar-mode="rank">排名百分位<\/button>/,
    `<button class="chip ${state.radarMode === 'rank_raw' ? 'active' : ''}" data-radar-mode="rank_raw">名次</button><button class="chip ${state.radarMode === 'rank' ? 'active' : ''}" data-radar-mode="rank">排名百分位</button>`);
  if (state.radarMode === 'rank_raw') {
    html = html.replace('按得分率绘制，支持叠加多次考试；没有数据的科目会自动隐藏，6 科就显示六边形。', '直接按原始名次绘制：外圈代表更好的名次，第 1 名方向最外；不做参考人数百分位换算。');
    html = html.replace('最多可叠加 4 次考试。叠加时只显示所选考试共同拥有数据的科目；坐标轴会按当前数据动态缩放。', '最多可叠加 4 次考试。只显示共同拥有名次的科目；原始名次会动态缩放，外圈名次更好。');
  }
  return html;
};
;
/* ===== feedback-unread-dot.js ===== */
// Show unread feedback replies as a small red dot on the feedback button.
(() => {
  const apply = () => {
    if (document.getElementById('st-feedback-unread-dot-style')) return;
    const style = document.createElement('style');
    style.id = 'st-feedback-unread-dot-style';
    style.textContent = `
      .st-fb-btn{overflow:visible!important}
      .st-fb-btn b{display:none!important;position:absolute!important;top:-4px!important;right:-4px!important;width:12px!important;height:12px!important;min-width:0!important;margin:0!important;padding:0!important;border-radius:50%!important;background:#e5484d!important;color:transparent!important;font-size:0!important;line-height:0!important;box-shadow:0 0 0 3px #fff!important}
      .st-fb-btn.has-unread b{display:block!important}
    `;
    document.head.appendChild(style);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', apply, { once: true });
  else apply();
})();
;
/* ===== app-v12.js ===== */
// v12: mobile radar controls should wrap cleanly instead of overflowing the card
(() => {
  if (document.getElementById('app-v12-radar-layout')) return;
  const style = document.createElement('style');
  style.id = 'app-v12-radar-layout';
  style.textContent = `
    .radar-toolbar .toggle-row{flex-wrap:wrap}
    .radar-toolbar .multi-select{flex-wrap:wrap;overflow:visible}

    @media(max-width:620px){
      .radar-toolbar{gap:14px}
      .radar-toolbar .toggle-row{
        display:grid!important;
        grid-template-columns:repeat(2,minmax(0,1fr))!important;
        gap:8px!important;
        width:100%;
      }
      .radar-toolbar .toggle-row .label{
        grid-column:1 / -1;
        margin:0 0 2px;
      }
      .radar-toolbar .toggle-row .chip{
        width:100%!important;
        min-width:0!important;
        padding:10px 8px!important;
        justify-content:center;
        text-align:center;
        white-space:nowrap;
      }
      .radar-toolbar .multi-select{
        display:grid!important;
        grid-template-columns:repeat(2,minmax(0,1fr))!important;
        gap:8px!important;
        width:100%;
        max-width:100%;
        overflow:visible!important;
        padding:0!important;
      }
      .radar-toolbar .select-pill{
        width:100%!important;
        min-width:0!important;
        max-width:100%!important;
        white-space:normal!important;
        line-height:1.35;
        padding:10px 8px!important;
        text-align:center;
        overflow-wrap:anywhere;
      }
    }

    @media(max-width:360px){
      .radar-toolbar .toggle-row,
      .radar-toolbar .multi-select{grid-template-columns:1fr!important}
    }
  `;
  document.head.appendChild(style);
})();
;
/* ===== app-v13.js ===== */
// v13: raw-vs-assigned scores + grade grouping/filtering
state.gradeFilter = state.gradeFilter || '全部';
state.scoreBasis = state.scoreBasis || 'final';
state.unfilteredVisibleExamsV13 = state.unfilteredVisibleExamsV13 || [];

const GRADE_LEVELS_V13 = ['高一', '高二', '高三'];
const ASSIGNED_DEFAULT_SUBJECTS_V13 = new Set(['化学', '生物', '政治', '地理']);

(function injectV13Styles() {
  if ($('#app-v13-style')) return;
  const style = document.createElement('style');
  style.id = 'app-v13-style';
  style.textContent = `
    .grade-filter-v13{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:0 0 16px}
    .grade-filter-v13 .label{font-size:12px;color:var(--muted);font-weight:700;margin-right:2px}
    .grade-chip-v13{border:1px solid var(--line);background:#fff;color:#687487;border-radius:999px;padding:8px 13px;font-size:12px;white-space:nowrap}
    .grade-chip-v13.active{background:var(--text);border-color:var(--text);color:#fff}
    .score-basis-v13{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:10px 0 4px}
    .score-basis-v13 .label{font-size:12px;color:var(--muted);font-weight:700}
    .basis-btn-v13{border:1px solid var(--line);background:#fff;color:#687487;border-radius:999px;padding:7px 11px;font-size:11px}
    .basis-btn-v13.active{background:#eef1ff;color:#4e63d8;border-color:#cbd2ff;font-weight:700}
    .grade-select-v13{width:100%;border:1px solid var(--line);background:#fff;border-radius:12px;padding:11px 12px;outline:none;color:var(--text)}
    .exam-score-grid-v13{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}
    .raw-field-v13{background:#fffaf2;border-radius:11px;padding:7px}
    .final-field-v13{background:#f4fbf8;border-radius:11px;padding:7px}
    .score-total-preview-v13{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px}
    .score-total-box-v13{border:1px solid var(--line);background:#fafbfe;border-radius:14px;padding:12px}
    .score-total-box-v13 span{display:block;font-size:10px;color:var(--muted);font-weight:700;margin-bottom:4px}
    .score-total-box-v13 b{font-size:20px;color:var(--text)}
    .score-total-box-v13 small{font-size:10px;color:var(--muted);margin-left:5px}
    .grade-section-v13{margin-bottom:18px}
    .grade-section-head-v13{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:2px 2px 10px}
    .grade-section-head-v13 h3{margin:0;font-size:16px}.grade-section-head-v13 span{font-size:11px;color:var(--muted)}
    .grade-badge-v13{display:inline-flex;align-items:center;border:1px solid #dce2ee;background:#f5f7fb;border-radius:999px;padding:3px 7px;font-size:10px;color:#5f6b7b;margin-left:7px;vertical-align:middle}
    .raw-final-inline-v13{color:#667085;font-size:11px}
    .raw-final-inline-v13 b{color:#d38429}
    @media(max-width:620px){
      .grade-filter-v13{overflow-x:auto;flex-wrap:nowrap;padding-bottom:3px;scrollbar-width:none}.grade-filter-v13::-webkit-scrollbar{display:none}
      .grade-filter-v13 .label{position:sticky;left:0;background:var(--bg);padding-right:4px;z-index:1}
      .exam-score-grid-v13{grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}
      .score-basis-v13{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));width:100%}
      .score-basis-v13 .label{grid-column:1/-1}.basis-btn-v13{width:100%}
    }
  `;
  document.head.appendChild(style);
})();

function examRawScoreV13(exam, subject) {
  const row = exam?.scores?.[subject] || {};
  const raw = num(row.raw);
  return raw !== null ? raw : num(row.actual);
}
function rawScoreRateV13(exam, subject) {
  const score = examRawScoreV13(exam, subject), max = examMax(exam, subject);
  if (score === null || !max) return null;
  return Math.max(0, Math.min(100, score / max * 100));
}
function totalRawForV13(exam) {
  const names = Object.keys(exam?.scores || {});
  let sum = 0, count = 0;
  names.forEach((subject) => { const value = examRawScoreV13(exam, subject); if (value !== null) { sum += value; count += 1; } });
  return count ? sum : null;
}
function totalRawMaxV13(exam) {
  const names = Object.keys(exam?.scores || {});
  let sum = 0, count = 0;
  names.forEach((subject) => { const value = examRawScoreV13(exam, subject); if (value !== null) { sum += examMax(exam, subject); count += 1; } });
  return count ? sum : null;
}
function totalRawRateV13(exam) {
  const value = totalRawForV13(exam), max = totalRawMaxV13(exam);
  return value === null || !max ? null : value / max * 100;
}
function gradeLabelV13(exam) { return exam?.grade_level || '未分类'; }

function applyGradeFilterV13() {
  const source = state.unfilteredVisibleExamsV13 || [];
  state.exams = state.gradeFilter === '全部' ? [...source]
    : state.gradeFilter === '未分类' ? source.filter((exam) => !exam.grade_level)
    : source.filter((exam) => exam.grade_level === state.gradeFilter);
  if (typeof applyExamSubjectsV10 === 'function') applyExamSubjectsV10(state.exams, state.subjectConfigs || []);
  state.radarSelection = (state.radarSelection || []).filter((id) => state.exams.some((exam) => exam.id === id));
  ensureRadarSelection();
}

const loadExamsBeforeV13 = loadExams;
loadExams = async function loadExamsV13() {
  await loadExamsBeforeV13();
  state.unfilteredVisibleExamsV13 = (state.allExams || []).filter((exam) => !exam.is_hidden);
  applyGradeFilterV13();
};

function rawScoreOverviewHtmlV13() {
  const subjects = SUBJECTS.filter((subject) => state.exams.some((exam) => rawScoreRateV13(exam, subject) !== null));
  const series = [
    { label: '总分', color: (typeof OVERVIEW_COLORS !== 'undefined' ? OVERVIEW_COLORS[0] : '#18212f'), value: (exam) => totalRawRateV13(exam) },
    ...subjects.map((subject, index) => ({ label: subject, color: (typeof OVERVIEW_COLORS !== 'undefined' ? OVERVIEW_COLORS[index + 1] : null) || RADAR_COLORS[index % RADAR_COLORS.length], value: (exam) => rawScoreRateV13(exam, subject) }))
  ];
  const visible = series.filter((item) => state.exams.some((exam) => item.value(exam) !== null));
  if (!visible.length) return `<div class="empty-chart"><div><div class="empty-icon">⌁</div>当前分类还没有原始分数据</div></div>`;
  const points = state.exams.map((exam) => ({ exam, values: visible.map((item) => item.value(exam)) }));
  const vals = points.flatMap((point) => point.values).filter((v) => v !== null);
  const axis = typeof calcDynamicAxisRangeV6 === 'function' ? calcDynamicAxisRangeV6(vals, { minLimit: 0, maxLimit: 100, step: 5, minSpan: 20, padRatio: .16 }) : { min: 0, max: 100, ticks: 5 };
  const W = 760, H = 320, L = 46, R = 20, T = 18, B = 46, cw = W - L - R, ch = H - T - B;
  const x = (i) => points.length === 1 ? L + cw / 2 : L + i / (points.length - 1) * cw;
  const y = (v) => T + (axis.max - v) / (axis.max - axis.min) * ch;
  let grid = '';
  for (let i = 0; i <= axis.ticks; i += 1) { const value = axis.max - (axis.max - axis.min) * i / axis.ticks, yy = T + ch * i / axis.ticks; grid += `<line x1="${L}" y1="${yy}" x2="${W-R}" y2="${yy}" stroke="#edf0f4"/><text x="${L-8}" y="${yy+4}" text-anchor="end" class="axis-label">${Math.round(value)}%</text>`; }
  const lines = visible.map((item, sidx) => { let d = '', started = false, circles = ''; points.forEach((point, pidx) => { const value = point.values[sidx]; if (value === null) { started = false; return; } const xx=x(pidx), yy=y(value); d += `${started?'L':'M'} ${xx} ${yy} `; started=true; circles += `<circle cx="${xx}" cy="${yy}" r="4" fill="#fff" stroke="${item.color}" stroke-width="2.4" data-tip="${escapeHtml(point.exam.name)} · ${escapeHtml(item.label)} 原始得分率 ${formatPercent(value)}"/>`; }); return `<path d="${d}" fill="none" stroke="${item.color}" stroke-width="${sidx===0?'3.4':'2.4'}" stroke-linecap="round" stroke-linejoin="round"/>${circles}`; }).join('');
  const labels = points.map((point,index)=>`<text x="${x(index)}" y="${H-17}" text-anchor="middle" class="axis-label">${fmtDate(point.exam.exam_date)}</text>`).join('');
  const legend = `<div class="overview-legend">${visible.map((item)=>`<span class="overview-pill"><i style="background:${item.color}"></i>${escapeHtml(item.label)}</span>`).join('')}</div>`;
  return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">${grid}${lines}${labels}</svg><div class="tooltip-card" id="chartTip"></div>${legend}<div class="axis-caption-v6">原始分总览按得分率比较；未填写原始分的普通科目自动沿用最终分。</div>`;
}

function rawScoreSingleHtmlV13() {
  const isTotal = state.subject === '总分';
  const points = state.exams.map((exam) => ({ exam, value: isTotal ? totalRawForV13(exam) : examRawScoreV13(exam, state.subject) }));
  const values = points.map((p) => p.value).filter((v) => v !== null);
  if (!values.length) return `<div class="empty-chart"><div><div class="empty-icon">⌁</div>这个项目还没有原始分数据</div></div>`;
  let min = Math.min(...values), max = Math.max(...values), pad = Math.max(5, (max-min)*.18); min = Math.max(0, Math.floor((min-pad)/5)*5); max = Math.ceil((max+pad)/5)*5; if (max-min < 20) { const mid=(max+min)/2; min=Math.max(0,Math.floor((mid-10)/5)*5); max=Math.ceil((mid+10)/5)*5; } if(max===min) max=min+20;
  const W=760,H=300,L=50,R=18,T=20,B=46,cw=W-L-R,ch=H-T-B, x=(i)=>points.length===1?L+cw/2:L+i/(points.length-1)*cw, y=(v)=>T+(max-v)/(max-min)*ch;
  let grid=''; for(let i=0;i<=5;i++){const v=max-(max-min)*i/5,yy=T+ch*i/5;grid+=`<line x1="${L}" y1="${yy}" x2="${W-R}" y2="${yy}" stroke="#edf0f4"/><text x="${L-9}" y="${yy+4}" text-anchor="end" class="axis-label">${Math.round(v)}</text>`;}
  let d='',started=false,circles=''; points.forEach((point,index)=>{if(point.value===null){started=false;return;}const xx=x(index),yy=y(point.value);d+=`${started?'L':'M'} ${xx} ${yy} `;started=true;circles+=`<circle cx="${xx}" cy="${yy}" r="5" fill="#fff" stroke="#d38429" stroke-width="3" data-tip="${escapeHtml(point.exam.name)} · 原始${isTotal?'总分':state.subject} ${formatScore(point.value)}"/>`;});
  const labels=points.map((point,index)=>`<text x="${x(index)}" y="${H-17}" text-anchor="middle" class="axis-label">${fmtDate(point.exam.exam_date)}</text>`).join('');
  return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">${grid}<path d="${d}" fill="none" stroke="#d38429" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>${circles}${labels}</svg><div class="tooltip-card" id="chartTip"></div>`;
}

const chartHtmlBeforeV13 = chartHtml;
chartHtml = function chartHtmlV13() {
  if (state.trendMetric === 'score' && state.scoreBasis === 'raw') return state.subject === '总览' ? rawScoreOverviewHtmlV13() : rawScoreSingleHtmlV13();
  return chartHtmlBeforeV13();
};

const radarValueBeforeV13 = radarValueV9;
radarValueV9 = function radarValueV13(exam, subject, mode = state.radarMode) {
  if (mode === 'raw_score') return rawScoreRateV13(exam, subject);
  return radarValueBeforeV13(exam, subject, mode);
};

const radarCardBeforeV13 = radarCardHtml;
radarCardHtml = function radarCardHtmlV13() {
  let html = radarCardBeforeV13();
  html = html.replace(/<button class="chip ([^"]*)" data-radar-mode="actual">真实成绩<\/button>/,
    `<button class="chip $1" data-radar-mode="actual">赋分/最终分</button><button class="chip ${state.radarMode === 'raw_score' ? 'active' : ''}" data-radar-mode="raw_score">原始分</button>`);
  if (state.radarMode === 'raw_score') html = html.replace(/<p class="card-sub">.*?<\/p>/, '<p class="card-sub">按原始得分率绘制；未填写原始分的普通科目会沿用最终分，方便比较赋分前后的学科结构。</p>');
  return html;
};

const homeHtmlBeforeV13 = homeHtml;
homeHtml = function homeHtmlV13() {
  let html = homeHtmlBeforeV13();
  const gradeBar = `<div class="grade-filter-v13"><span class="label">年级</span>${['全部',...GRADE_LEVELS_V13,'未分类'].map((grade)=>`<button class="grade-chip-v13 ${state.gradeFilter===grade?'active':''}" data-grade-filter-v13="${grade}">${grade}</button>`).join('')}</div>`;
  html = html.replace('<section class="grid-main">', `${gradeBar}<section class="grid-main">`);
  if (state.trendMetric === 'score') {
    const basis = `<div class="score-basis-v13"><span class="label">成绩口径</span><button class="basis-btn-v13 ${state.scoreBasis==='final'?'active':''}" data-score-basis-v13="final">赋分 / 最终分</button><button class="basis-btn-v13 ${state.scoreBasis==='raw'?'active':''}" data-score-basis-v13="raw">原始分</button></div>`;
    html = html.replace('<div class="chips">', `${basis}<div class="chips">`);
    if (state.scoreBasis === 'raw') {
      html = html.replace('<p class="card-sub">真实成绩与目标成绩放在同一张图里</p>', '<p class="card-sub">查看赋分前的原始成绩变化；总览模式按原始得分率统一比较</p>');
      html = html.replace('<div class="legend"><span><i class="actual"></i>真实成绩</span><span><i class="target"></i>目标成绩</span></div>', '<div class="subtle-note">原始分 · 赋分科目可与最终分切换对照</div>');
    }
  }
  return html;
};

function seedRowsV13(exam) {
  if (exam) return Object.entries(exam.scores || {}).map(([name,row]) => ({ name, target: row.target ?? '', raw: row.raw ?? '', actual: row.actual ?? '', max: row.max ?? defaultMax(name), rank: row.rank ?? '', participants: row.participants ?? '' }));
  const last = state.exams.at(-1) || state.unfilteredVisibleExamsV13.at(-1);
  if (last && Object.keys(last.scores || {}).length) return Object.entries(last.scores).map(([name,row]) => ({ name, target:'', raw:'', actual:'', max:row.max ?? defaultMax(name), rank:'', participants:'' }));
  const templates = state.subjectConfigs?.length ? state.subjectConfigs : SUBJECTS.map((name)=>({name,defaultMax:defaultMax(name)}));
  return templates.map((item)=>({name:item.name,target:'',raw:'',actual:'',max:item.defaultMax ?? 100,rank:'',participants:''}));
}
function rawTotalFromRowsV13(rows) { let sum=0,count=0; rows.forEach((row)=>{const raw=num(row.raw),actual=num(row.actual),value=raw ?? actual;if(value!==null){sum+=value;count++;}}); return count?sum:null; }
function finalTotalFromRowsV13(rows) { let sum=0,count=0;rows.forEach((row)=>{const value=num(row.actual);if(value!==null){sum+=value;count++;}});return count?sum:null; }

openExam = function openExamV13(exam = null) {
  const editing=!!exam, today=new Date().toISOString().slice(0,10), rows=seedRowsV13(exam);
  const lastGrade=(state.unfilteredVisibleExamsV13.at(-1)?.grade_level || '高一'), selectedGrade=exam?.grade_level || (editing ? '' : lastGrade);
  const modal=document.createElement('div');modal.className='modal-backdrop';
  modal.innerHTML=`<div class="modal"><div class="modal-head"><h3>${editing?'编辑考试':'记录一次考试'}</h3><button class="close-btn" aria-label="关闭">×</button></div><div class="modal-body">
    <div class="form-grid"><div class="field"><label>考试名称</label><input id="examName" maxlength="60" value="${escapeHtml(exam?.name||'')}" placeholder="例如：高二上期中考试"></div><div class="field"><label>考试日期</label><input id="examDate" type="date" value="${exam?.exam_date||today}"></div><div class="field"><label>年级分类</label><select id="gradeLevelV13" class="grade-select-v13"><option value="">未分类</option>${GRADE_LEVELS_V13.map((grade)=>`<option value="${grade}" ${selectedGrade===grade?'selected':''}>${grade}</option>`).join('')}</select></div></div>
    <div class="section-head-v7"><div><h4>本次考试科目</h4><p>化学、生物、政治、地理等赋分科目可以同时记录原始分和赋分；其他科目原始分可留空。</p></div></div>
    <div class="exam-subjects-v10" id="examSubjectsV13"></div>
    <div class="exam-subject-toolbar-v10"><button class="secondary" id="addExamSubjectV13">＋ 添加科目 / 模块</button><span class="template-note-v10">原始分留空时，统计原始总分会自动沿用该科最终分。</span></div>
    <div class="score-total-preview-v13"><div class="score-total-box-v13"><span>原始总分</span><b id="rawTotalV13">—</b><small>赋分前</small></div><div class="score-total-box-v13"><span>赋分 / 最终总分</span><b id="finalTotalV13">—</b><small>用于正式总分</small></div></div>
    <div class="section-head-v7"><div><h4>总排名（可选）</h4><p>各科名次在科目卡中填写；参考人数留空时使用总参考人数。</p></div></div>
    <div class="rank-table-v7"><div class="rank-row-v7 header"><span>项目</span><span>名次</span><span>参考人数</span></div><div class="rank-row-v7 total"><span class="subject-name">总分</span><input id="totalRankV13" inputmode="numeric" pattern="[0-9]*" placeholder="例如 36" value="${exam?.total_rank??''}"><input id="totalParticipantsV13" inputmode="numeric" pattern="[0-9]*" placeholder="例如 620" value="${exam?.total_participants??''}"></div></div>
    <div class="rank-science-box-v7"><b>两种排名视图都保留：</b>“名次”直接看第几名；“排名百分位”结合参考人数，更适合跨考试比较。</div>
    <div class="visibility-box-v10"><div><b>图表显示状态</b><span>${exam?.is_hidden?'这次考试已隐藏：记录仍保留，但不参与图表。':'这次考试当前会参与首页统计和图表。'}</span></div><button class="secondary" id="toggleHiddenModalV13">${exam?.is_hidden?'恢复显示':'从图表隐藏'}</button><input type="hidden" id="examHiddenV13" value="${exam?.is_hidden?'1':'0'}"></div>
    ${editing?'<div class="modal-danger-row-v10"><button class="delete-exam-v10" id="deleteExamModalV13">删除这次考试</button></div>':''}
    <div class="modal-actions"><button class="secondary cancel-btn">取消</button><button class="primary save-btn">${editing?'保存修改':'保存考试'}</button></div>
  </div></div>`;
  document.body.appendChild(modal);state.modal=modal;const list=$('#examSubjectsV13',modal);
  const syncRows=()=>{const next=$$('.exam-subject-card-v10',list).map((card)=>({name:$('.exam-subject-name-v10',card).value,target:$('.target-v13',card).value,raw:$('.raw-v13',card).value,actual:$('.actual-v13',card).value,max:$('.max-v13',card).value,rank:$('.rank-v13',card).value,participants:$('.participants-v13',card).value}));rows.splice(0,rows.length,...next);};
  const updateTotals=()=>{syncRows();$('#rawTotalV13',modal).textContent=formatScore(rawTotalFromRowsV13(rows));$('#finalTotalV13',modal).textContent=formatScore(finalTotalFromRowsV13(rows));};
  const cardHtml=(row)=>{const assigned=ASSIGNED_DEFAULT_SUBJECTS_V13.has(String(row.name).trim()) || row.raw!=='';return `<div class="exam-subject-card-v10"><div class="exam-subject-head-v10"><input class="exam-subject-name-v10" maxlength="40" value="${escapeHtml(row.name||'')}" placeholder="科目 / 题型 / 模块名称"><button class="remove-exam-subject-v10" type="button" title="删除本次考试中的这个科目">×</button></div><div class="exam-score-grid-v13"><div class="mini-field-v10"><label>目标成绩</label><input class="target-v13" inputmode="decimal" placeholder="可留空" value="${row.target??''}"></div><div class="mini-field-v10 raw-field-v13"><label>原始分${assigned?'':'（可选）'}</label><input class="raw-v13" inputmode="decimal" placeholder="赋分前" value="${row.raw??''}"></div><div class="mini-field-v10 final-field-v13"><label>${assigned?'赋分':'最终分'}</label><input class="actual-v13" inputmode="decimal" placeholder="正式成绩" value="${row.actual??''}"></div><div class="mini-field-v10"><label>满分</label><input class="max-v13" inputmode="decimal" value="${row.max??100}"></div></div><div class="exam-rank-grid-v10"><div class="mini-field-v10"><label>科目名次</label><input class="rank-v13" inputmode="numeric" pattern="[0-9]*" placeholder="可留空" value="${row.rank??''}"></div><div class="mini-field-v10"><label>参考人数</label><input class="participants-v13" inputmode="numeric" pattern="[0-9]*" placeholder="留空=总人数" value="${row.participants??''}"></div></div></div>`;};
  const renderRows=()=>{list.innerHTML=rows.map(cardHtml).join('');$$('.remove-exam-subject-v10',list).forEach((button,index)=>button.onclick=()=>{syncRows();rows.splice(index,1);renderRows();updateTotals();});$$('input',list).forEach((input)=>input.addEventListener('input',updateTotals));};
  renderRows();updateTotals();
  const close=()=>{modal.remove();state.modal=null;};$('.close-btn',modal).onclick=close;$('.cancel-btn',modal).onclick=close;modal.onclick=(event)=>{if(event.target===modal)close();};
  $('#addExamSubjectV13',modal).onclick=()=>{if(rows.length>=40)return toast('单次考试最多 40 个科目 / 模块');syncRows();rows.push({name:'',target:'',raw:'',actual:'',max:100,rank:'',participants:''});renderRows();$('.exam-subject-card-v10:last-child .exam-subject-name-v10',list)?.focus();};
  $('#toggleHiddenModalV13',modal).onclick=()=>{const input=$('#examHiddenV13',modal),next=input.value!=='1';input.value=next?'1':'0';$('#toggleHiddenModalV13',modal).textContent=next?'恢复显示':'从图表隐藏';$('.visibility-box-v10 span',modal).textContent=next?'保存后仍保留记录，但不参与图表。':'保存后会重新参与首页统计和图表。';};
  $('#deleteExamModalV13',modal)?.addEventListener('click',async()=>{if(!confirm(`确定永久删除「${exam?.name||'这次考试'}」？成绩和排名都会一起删除。`))return;try{await dataApiV7('delete_exam',{examId:exam.id});await loadExams();close();render();toast('已删除');}catch(error){toast(error.message);}});
  $('.save-btn',modal).onclick=()=>saveExam(exam?.id||null,modal);
};

validateExam = function validateExamV13(exam) {
  const totalRank=num(exam.total_rank),totalParticipants=num(exam.total_participants);
  if(totalRank!==null&&(!Number.isInteger(totalRank)||totalRank<1))return'总排名请输入正整数';
  if(totalParticipants!==null&&(!Number.isInteger(totalParticipants)||totalParticipants<1))return'参考人数请输入正整数';
  if(totalRank!==null&&totalParticipants!==null&&totalRank>totalParticipants)return'总排名不能大于参考人数';
  const names=new Set();for(const[name,row]of Object.entries(exam.scores||{})){if(!name||name.length>40)return'科目名称不能为空且不能超过 40 个字符';if(names.has(name))return`科目「${name}」重复了`;names.add(name);const max=num(row.max)??defaultMax(name),target=num(row.target),raw=num(row.raw),actual=num(row.actual),rank=num(row.rank),participants=num(row.participants),effective=participants??totalParticipants;if(!Number.isFinite(max)||max<=0)return`${name} 的满分必须大于 0`;if(target!==null&&target>max)return`${name} 的目标成绩不能超过满分 ${formatScore(max)}`;if(raw!==null&&raw>max)return`${name} 的原始分不能超过满分 ${formatScore(max)}`;if(actual!==null&&actual>max)return`${name} 的赋分/最终分不能超过满分 ${formatScore(max)}`;if(rank!==null&&(!Number.isInteger(rank)||rank<1))return`${name}排名请输入正整数`;if(participants!==null&&(!Number.isInteger(participants)||participants<1))return`${name}参考人数请输入正整数`;if(rank!==null&&effective!==null&&rank>effective)return`${name}排名不能大于参考人数`;}
  return'';
};

saveExam = async function saveExamV13(id, modal) {
  const btn=$('.save-btn',modal),exam={id,name:$('#examName',modal).value.trim(),exam_date:$('#examDate',modal).value,grade_level:$('#gradeLevelV13',modal)?.value||'',total_rank:$('#totalRankV13',modal)?.value||'',total_participants:$('#totalParticipantsV13',modal)?.value||'',is_hidden:$('#examHiddenV13',modal)?.value==='1',scores:{}};
  const seen=new Set();for(const card of $$('.exam-subject-card-v10',modal)){const name=$('.exam-subject-name-v10',card).value.trim();if(!name)return toast('请填写科目名称，或删除空白科目');if(seen.has(name))return toast(`科目「${name}」重复了`);seen.add(name);exam.scores[name]={target:$('.target-v13',card).value,raw:$('.raw-v13',card).value,actual:$('.actual-v13',card).value,max:$('.max-v13',card).value,rank:$('.rank-v13',card).value,participants:$('.participants-v13',card).value};}
  if(!exam.name||!exam.exam_date)return toast('请填写考试名称和日期');const error=validateExam(exam);if(error)return toast(error);btn.disabled=true;btn.textContent='保存中…';
  try{await dataApiV7('save_exam',{exam});await loadExams();modal.remove();state.modal=null;render();toast(id?'已保存修改':'考试已记录');}catch(error){toast(error.message);btn.disabled=false;btn.textContent=id?'保存修改':'保存考试';}
};

recordHtml = function recordHtmlV13(exam) {
  const subjects=Object.keys(exam.scores||{}),rank=rankInfoV7(exam,'总分');
  const finalValues=subjects.map((s)=>examScore(exam,s,'actual')).filter((v)=>v!==null),finalTotal=finalValues.length?finalValues.reduce((a,b)=>a+b,0):null,rawTotal=totalRawForV13(exam);
  return `<div class="record ${exam.is_hidden?'hidden-record-v10':''}"><div class="record-date">${fmtYearDate(exam.exam_date)}<b>${escapeHtml(exam.name)}<span class="grade-badge-v13">${escapeHtml(gradeLabelV13(exam))}</span>${exam.is_hidden?'<span class="hidden-badge-v10">已隐藏</span>':''}</b></div><div class="record-scores">${subjects.map((subject)=>{const row=exam.scores[subject]||{},a=num(row.actual),raw=num(row.raw),t=num(row.target),r=num(row.rank),n=num(row.participants)??num(exam.total_participants);if(a===null&&raw===null&&t===null&&r===null)return'';return `<span class="score-tag">${escapeHtml(subject)} ${a===null?'—':formatScore(a)}${raw!==null?`<span class="raw-final-inline-v13"> · 原始 <b>${formatScore(raw)}</b></span>`:''}<span style="color:#a1a9b5"> / 目标 ${t===null?'—':formatScore(t)}</span>${r===null?'':`<span style="color:#667085"> · 第${r}${n?`/${n}`:''}</span>`}</span>`;}).join('')||'<span class="score-tag">尚未填写分数或排名</span>'}<span class="score-tag"><b>赋分总分 ${finalTotal===null?'—':formatScore(finalTotal)}</b>${rawTotal!==null?` · 原始总分 ${formatScore(rawTotal)}`:''}</span>${rank.rank!==null?`<span class="score-tag"><b>总排名 ${rank.rank}${rank.participants?` / ${rank.participants}`:''}</b>${rank.performance!==null?` · ${formatPercent(rank.performance)}`:''}</span>`:''}</div><div class="record-actions record-actions-v10"><button class="record-action-btn-v10" data-edit="${exam.id}">编辑</button><button class="record-action-btn-v10" data-hidden-toggle="${exam.id}">${exam.is_hidden?'恢复显示':'隐藏'}</button><button class="record-action-btn-v10 danger" data-delete="${exam.id}">删除</button></div></div>`;
};

recordsHtml = function recordsHtmlV13() {
  const exams=state.allExams||[],hiddenCount=exams.filter((exam)=>exam.is_hidden).length;
  const groups=[...GRADE_LEVELS_V13,'未分类'].map((grade)=>({grade,exams:exams.filter((exam)=>grade==='未分类'?!exam.grade_level:exam.grade_level===grade)})).filter((group)=>group.exams.length);
  return `<div class="page-head"><div><h2>考试记录</h2><p>按高一、高二、高三分类整理；每次考试仍可拥有自己的科目。${hiddenCount?` 当前有 ${hiddenCount} 次已隐藏。`:''}</p></div><button class="primary" id="addExam">＋ 新建</button></div>${groups.length?groups.map((group)=>`<section class="grade-section-v13"><div class="grade-section-head-v13"><h3>${group.grade}</h3><span>${group.exams.length} 次考试</span></div><div class="card records-card">${group.exams.map(recordHtml).join('')}</div></section>`).join(''):`<div class="card records-card"><div class="empty-chart" style="height:300px"><div><div class="empty-icon">📝</div>还没有考试记录<br><button class="secondary" id="emptyAdd" style="margin-top:14px">记录第一场考试</button></div></div></div>`}`;
};

const bindPageBeforeV13 = bindPage;
bindPage = function bindPageV13() {
  bindPageBeforeV13();
  $$('[data-grade-filter-v13]').forEach((button)=>button.onclick=()=>{state.gradeFilter=button.dataset.gradeFilterV13;state.radarSelection=[];applyGradeFilterV13();render();});
  $$('[data-score-basis-v13]').forEach((button)=>button.onclick=()=>{state.scoreBasis=button.dataset.scoreBasisV13;render();});
};

const renderLoginBeforeV13 = renderLogin;
renderLogin = function renderLoginV13(error='') { renderLoginBeforeV13(error); const help=$('.auth-help'); if(help) help.textContent='支持每次考试自由增减科目、原始分/赋分、名次/百分位，以及高一高二高三分类。'; };
;
/* ===== app-v14.js ===== */
// v14: customizable exam categories + separate raw/final full marks, kept intentionally simple
state.classification = state.classification || { label: '年级', options: ['高一', '高二', '高三'] };

(function injectV14Styles(){
  if ($('#app-v14-style')) return;
  const style=document.createElement('style'); style.id='app-v14-style'; style.textContent=`
    .category-settings-v14{margin-top:18px;padding:22px}
    .category-head-v14{display:flex;justify-content:space-between;align-items:flex-start;gap:12px}
    .category-chips-v14{display:flex;gap:8px;flex-wrap:wrap;margin-top:13px}
    .category-chip-v14{border:1px solid var(--line);background:#f7f8fb;border-radius:999px;padding:7px 10px;font-size:12px;color:#596474}
    .category-list-v14{display:grid;gap:8px;margin-top:14px}
    .category-row-v14{display:grid;grid-template-columns:minmax(0,1fr) 38px;gap:8px}
    .category-row-v14 input,.category-label-v14{width:100%;border:1px solid var(--line);border-radius:11px;padding:10px 11px;outline:none;background:#fff}
    .category-row-v14 button{border:1px solid #f0d9dc;background:#fff;color:var(--danger);border-radius:10px;font-size:17px}
    .score-compact-v14{display:grid;grid-template-columns:1fr 1.35fr 1.35fr;gap:8px}
    .score-with-max-v14{display:grid;grid-template-columns:minmax(0,1fr) auto 68px;gap:5px;align-items:center}
    .score-with-max-v14 span{font-size:11px;color:var(--muted)}
    .raw-box-v14{background:#fff9f1;border:1px solid #f3e2cb;border-radius:12px;padding:8px}
    .final-box-v14{background:#f4fbf8;border:1px solid #dbeee6;border-radius:12px;padding:8px}
    .target-box-v14{padding:8px}
    @media(max-width:620px){
      .category-settings-v14{padding:18px 16px}.category-head-v14{display:block}.category-head-v14 button{margin-top:10px}
      .score-compact-v14{grid-template-columns:1fr 1fr}.target-box-v14{grid-column:1/-1}.score-with-max-v14{grid-template-columns:minmax(0,1fr) auto 64px}
    }
  `; document.head.appendChild(style);
})();

function categoryOptionsV14(){
  const configured=(state.classification?.options||[]).map(v=>String(v||'').trim()).filter(Boolean);
  const used=(state.allExams||[]).map(e=>String(e.grade_level||'').trim()).filter(Boolean);
  return [...new Set([...configured,...used])];
}
function categoryLabelV14(){ return String(state.classification?.label||'分类').trim() || '分类'; }
function rawMaxV14(exam,subject){ const row=exam?.scores?.[subject]||{}; return num(row.rawMax) ?? num(row.max) ?? defaultMax(subject); }
rawScoreRateV13=function rawScoreRateV14(exam,subject){ const score=examRawScoreV13(exam,subject),max=rawMaxV14(exam,subject); return score===null||!max?null:Math.max(0,Math.min(100,score/max*100)); };
totalRawMaxV13=function totalRawMaxV14(exam){ const names=Object.keys(exam?.scores||{});let sum=0,count=0;names.forEach(subject=>{const value=examRawScoreV13(exam,subject);if(value!==null){sum+=rawMaxV14(exam,subject);count++;}});return count?sum:null; };

applyGradeFilterV13=function applyCategoryFilterV14(){
  const source=state.unfilteredVisibleExamsV13||[];
  state.exams=state.gradeFilter==='全部'?[...source]:state.gradeFilter==='未分类'?source.filter(e=>!e.grade_level):source.filter(e=>e.grade_level===state.gradeFilter);
  if(typeof applyExamSubjectsV10==='function') applyExamSubjectsV10(state.exams,state.subjectConfigs||[]);
  state.radarSelection=(state.radarSelection||[]).filter(id=>state.exams.some(e=>e.id===id)); ensureRadarSelection();
};

loadExams=async function loadExamsV14(){
  const data=await dataApiV7('list_exams');
  state.allExams=data.exams||[]; state.subjectConfigs=data.subjects||[];
  state.classification=data.classification||state.classification||{label:'年级',options:['高一','高二','高三']};
  state.unfilteredVisibleExamsV13=state.allExams.filter(e=>!e.is_hidden);
  if(state.gradeFilter!=='全部'&&state.gradeFilter!=='未分类'&&!categoryOptionsV14().includes(state.gradeFilter)) state.gradeFilter='全部';
  applyGradeFilterV13();
};

const homeHtmlBeforeV14=homeHtml;
homeHtml=function homeHtmlV14(){
  let html=homeHtmlBeforeV14();
  const opts=categoryOptionsV14();
  const bar=`<div class="grade-filter-v13"><span class="label">${escapeHtml(categoryLabelV14())}</span>${['全部',...opts,'未分类'].map(v=>`<button class="grade-chip-v13 ${state.gradeFilter===v?'active':''}" data-grade-filter-v13="${escapeHtml(v)}">${escapeHtml(v)}</button>`).join('')}</div>`;
  html=html.replace(/<div class="grade-filter-v13">[\s\S]*?<\/div><section class="grid-main">/,`${bar}<section class="grid-main">`);
  return html;
};

accountHtml=function accountHtmlV14(){
  const c=state.classification||{label:'年级',options:['高一','高二','高三']};
  return `<div class="page-head"><div><h2>账号</h2><p>账号与少量偏好设置。</p></div></div><div class="account-grid"><div class="card account-card"><h3 class="card-title">我的账号</h3><div class="account-chip"><code>${escapeHtml(state.user?.username||'')}</code><button class="copy-btn" data-copy="${escapeHtml(state.user?.username||'')}">复制</button></div></div><div class="card account-card"><h3 class="card-title">数据与安全</h3><p class="card-sub">考试与成绩保存在云端并按账号隔离。</p><div class="danger-zone"><button class="secondary text-danger" id="logoutBtn">退出登录</button></div></div></div><div class="card category-settings-v14"><div class="category-head-v14"><div><h3 class="card-title">考试分类</h3><p class="card-sub">只保留一个分类维度，名称和选项都可以自定义，例如“年级：高一/高二/高三”或“阶段：一轮/二轮/冲刺”。</p></div><button class="secondary" id="manageCategoriesV14">设置</button></div><div class="category-chips-v14"><span class="category-chip-v14"><b>${escapeHtml(c.label||'分类')}</b></span>${(c.options||[]).map(v=>`<span class="category-chip-v14">${escapeHtml(v)}</span>`).join('')}</div></div>`;
};

function openCategoryManagerV14(){
  const draft={label:categoryLabelV14(),options:[...(state.classification?.options||['高一','高二','高三'])]};
  const modal=document.createElement('div');modal.className='modal-backdrop';modal.innerHTML=`<div class="modal"><div class="modal-head"><h3>考试分类设置</h3><button class="close-btn">×</button></div><div class="modal-body"><div class="field"><label>分类名称</label><input class="category-label-v14" id="categoryLabelV14" maxlength="16" value="${escapeHtml(draft.label)}" placeholder="例如：年级 / 阶段 / 学期"></div><div class="category-list-v14" id="categoryListV14"></div><div class="subject-manager-actions-v7"><button class="secondary" id="addCategoryV14">＋ 添加选项</button><div><button class="secondary cancel-btn">取消</button> <button class="primary" id="saveCategoryV14">保存</button></div></div><p class="form-note">修改分类设置不会改动历史考试已有的分类值，避免误改旧数据；历史分类仍会正常显示。</p></div></div>`;document.body.appendChild(modal);state.modal=modal;
  const list=$('#categoryListV14',modal);const renderRows=()=>{list.innerHTML=draft.options.map(v=>`<div class="category-row-v14"><input maxlength="20" value="${escapeHtml(v)}" placeholder="分类选项"><button type="button">×</button></div>`).join('');$$('.category-row-v14 button',list).forEach((b,i)=>b.onclick=()=>{if(draft.options.length<=1)return toast('至少保留 1 个分类');sync();draft.options.splice(i,1);renderRows();});};
  const sync=()=>{draft.options=$$('.category-row-v14 input',list).map(i=>i.value.trim());}; renderRows();
  const close=()=>{modal.remove();state.modal=null};$('.close-btn',modal).onclick=close;$('.cancel-btn',modal).onclick=close;modal.onclick=e=>{if(e.target===modal)close()};
  $('#addCategoryV14',modal).onclick=()=>{sync();if(draft.options.length>=12)return toast('最多 12 个分类');draft.options.push('');renderRows();$('.category-row-v14:last-child input',list)?.focus();};
  $('#saveCategoryV14',modal).onclick=async()=>{sync();draft.label=$('#categoryLabelV14',modal).value.trim();if(!draft.label)return toast('请填写分类名称');if(draft.options.some(v=>!v))return toast('请填写完整的分类选项');if(new Set(draft.options).size!==draft.options.length)return toast('分类名称不能重复');const btn=$('#saveCategoryV14',modal);btn.disabled=true;btn.textContent='保存中…';try{const data=await dataApiV7('save_classification',{classification:draft});state.classification=data.classification;close();render();toast('分类设置已保存');}catch(e){toast(e.message);btn.disabled=false;btn.textContent='保存';}};
}

function seedRowsV14(exam){
  if(exam)return Object.entries(exam.scores||{}).map(([name,row])=>({name,target:row.target??'',raw:row.raw??'',actual:row.actual??'',rawMax:row.rawMax??row.max??defaultMax(name),max:row.max??defaultMax(name),rank:row.rank??'',participants:row.participants??''}));
  const last=state.exams.at(-1)||state.unfilteredVisibleExamsV13.at(-1);if(last&&Object.keys(last.scores||{}).length)return Object.entries(last.scores).map(([name,row])=>({name,target:'',raw:'',actual:'',rawMax:row.rawMax??row.max??defaultMax(name),max:row.max??defaultMax(name),rank:'',participants:''}));
  const templates=state.subjectConfigs?.length?state.subjectConfigs:SUBJECTS.map(name=>({name,defaultMax:defaultMax(name)}));return templates.map(item=>({name:item.name,target:'',raw:'',actual:'',rawMax:item.defaultMax??100,max:item.defaultMax??100,rank:'',participants:''}));
}

openExam=function openExamV14(exam=null){
  const editing=!!exam,today=new Date().toISOString().slice(0,10),rows=seedRowsV14(exam),options=categoryOptionsV14(),selected=exam?.grade_level||(!editing?(state.unfilteredVisibleExamsV13.at(-1)?.grade_level||''):'');
  const modal=document.createElement('div');modal.className='modal-backdrop';modal.innerHTML=`<div class="modal"><div class="modal-head"><h3>${editing?'编辑考试':'记录一次考试'}</h3><button class="close-btn">×</button></div><div class="modal-body"><div class="form-grid"><div class="field"><label>考试名称</label><input id="examName" maxlength="60" value="${escapeHtml(exam?.name||'')}" placeholder="例如：期中考试"></div><div class="field"><label>考试日期</label><input id="examDate" type="date" value="${exam?.exam_date||today}"></div><div class="field"><label>${escapeHtml(categoryLabelV14())}</label><select id="gradeLevelV14" class="grade-select-v13"><option value="">未分类</option>${options.map(v=>`<option value="${escapeHtml(v)}" ${selected===v?'selected':''}>${escapeHtml(v)}</option>`).join('')}</select></div></div><div class="section-head-v7"><div><h4>本次考试科目</h4><p>原始分和赋分/最终分使用各自的满分；例如上海小科可填“原始 85 / 100，赋分 61 / 70”。</p></div></div><div class="exam-subjects-v10" id="examSubjectsV14"></div><div class="exam-subject-toolbar-v10"><button class="secondary" id="addExamSubjectV14">＋ 添加科目 / 模块</button></div><div class="score-total-preview-v13"><div class="score-total-box-v13"><span>原始总分</span><b id="rawTotalV14">—</b></div><div class="score-total-box-v13"><span>赋分 / 最终总分</span><b id="finalTotalV14">—</b></div></div><div class="section-head-v7"><div><h4>总排名（可选）</h4></div></div><div class="rank-table-v7"><div class="rank-row-v7 header"><span>项目</span><span>名次</span><span>参考人数</span></div><div class="rank-row-v7 total"><span>总分</span><input id="totalRankV14" inputmode="numeric" value="${exam?.total_rank??''}"><input id="totalParticipantsV14" inputmode="numeric" value="${exam?.total_participants??''}"></div></div><div class="visibility-box-v10"><div><b>图表显示</b><span>${exam?.is_hidden?'已隐藏，不参与图表。':'正常参与图表。'}</span></div><button class="secondary" id="toggleHiddenV14">${exam?.is_hidden?'恢复显示':'隐藏'}</button><input type="hidden" id="examHiddenV14" value="${exam?.is_hidden?'1':'0'}"></div>${editing?'<div class="modal-danger-row-v10"><button class="delete-exam-v10" id="deleteExamV14">删除这次考试</button></div>':''}<div class="modal-actions"><button class="secondary cancel-btn">取消</button><button class="primary save-btn">${editing?'保存修改':'保存考试'}</button></div></div></div>`;document.body.appendChild(modal);state.modal=modal;const list=$('#examSubjectsV14',modal);
  const sync=()=>{const next=$$('.exam-subject-card-v10',list).map(card=>({name:$('.exam-subject-name-v10',card).value,target:$('.target-v14',card).value,raw:$('.raw-v14',card).value,actual:$('.actual-v14',card).value,rawMax:$('.rawmax-v14',card).value,max:$('.max-v14',card).value,rank:$('.rank-v14',card).value,participants:$('.participants-v14',card).value}));rows.splice(0,rows.length,...next);};
  const totals=()=>{sync();$('#rawTotalV14',modal).textContent=formatScore(rawTotalFromRowsV13(rows));$('#finalTotalV14',modal).textContent=formatScore(finalTotalFromRowsV13(rows));};
  const card=row=>`<div class="exam-subject-card-v10"><div class="exam-subject-head-v10"><input class="exam-subject-name-v10" maxlength="40" value="${escapeHtml(row.name||'')}" placeholder="科目 / 模块"><button class="remove-exam-subject-v10" type="button">×</button></div><div class="score-compact-v14"><div class="mini-field-v10 target-box-v14"><label>目标</label><input class="target-v14" inputmode="decimal" value="${row.target??''}" placeholder="可留空"></div><div class="mini-field-v10 final-box-v14"><label>赋分 / 最终分</label><div class="score-with-max-v14"><input class="actual-v14" inputmode="decimal" value="${row.actual??''}" placeholder="得分"><span>/</span><input class="max-v14" inputmode="decimal" value="${row.max??100}" placeholder="满分"></div></div><div class="mini-field-v10 raw-box-v14"><label>原始分</label><div class="score-with-max-v14"><input class="raw-v14" inputmode="decimal" value="${row.raw??''}" placeholder="得分"><span>/</span><input class="rawmax-v14" inputmode="decimal" value="${row.rawMax??row.max??100}" placeholder="满分"></div></div></div><div class="exam-rank-grid-v10"><div class="mini-field-v10"><label>名次</label><input class="rank-v14" inputmode="numeric" value="${row.rank??''}" placeholder="可留空"></div><div class="mini-field-v10"><label>参考人数</label><input class="participants-v14" inputmode="numeric" value="${row.participants??''}" placeholder="留空=总人数"></div></div></div>`;
  const renderRows=()=>{list.innerHTML=rows.map(card).join('');$$('.remove-exam-subject-v10',list).forEach((b,i)=>b.onclick=()=>{sync();rows.splice(i,1);renderRows();totals()});$$('input',list).forEach(i=>i.addEventListener('input',totals));};renderRows();totals();
  const close=()=>{modal.remove();state.modal=null};$('.close-btn',modal).onclick=close;$('.cancel-btn',modal).onclick=close;modal.onclick=e=>{if(e.target===modal)close()};$('#addExamSubjectV14',modal).onclick=()=>{sync();if(rows.length>=40)return toast('最多 40 个科目 / 模块');rows.push({name:'',target:'',raw:'',actual:'',rawMax:100,max:100,rank:'',participants:''});renderRows();$('.exam-subject-card-v10:last-child .exam-subject-name-v10',list)?.focus();};$('#toggleHiddenV14',modal).onclick=()=>{const input=$('#examHiddenV14',modal),next=input.value!=='1';input.value=next?'1':'0';$('#toggleHiddenV14',modal).textContent=next?'恢复显示':'隐藏';$('.visibility-box-v10 span',modal).textContent=next?'保存后不参与图表。':'保存后正常参与图表。';};$('#deleteExamV14',modal)?.addEventListener('click',async()=>{if(!confirm(`确定永久删除「${exam?.name||'这次考试'}」？`))return;try{await dataApiV7('delete_exam',{examId:exam.id});await loadExams();close();render();toast('已删除');}catch(e){toast(e.message)}});$('.save-btn',modal).onclick=()=>saveExam(exam?.id||null,modal);
};

validateExam=function validateExamV14(exam){
  const tr=num(exam.total_rank),tp=num(exam.total_participants);if(tr!==null&&(!Number.isInteger(tr)||tr<1))return'总排名请输入正整数';if(tp!==null&&(!Number.isInteger(tp)||tp<1))return'参考人数请输入正整数';if(tr!==null&&tp!==null&&tr>tp)return'总排名不能大于参考人数';
  for(const[name,row]of Object.entries(exam.scores||{})){const max=num(row.max)??defaultMax(name),rawMax=num(row.rawMax)??max,target=num(row.target),raw=num(row.raw),actual=num(row.actual),rank=num(row.rank),participants=num(row.participants),effective=participants??tp;if(max<=0||rawMax<=0)return`${name} 的满分必须大于 0`;if(target!==null&&target>max)return`${name}目标不能超过最终满分 ${formatScore(max)}`;if(actual!==null&&actual>max)return`${name}赋分/最终分不能超过最终满分 ${formatScore(max)}`;if(raw!==null&&raw>rawMax)return`${name}原始分不能超过原始满分 ${formatScore(rawMax)}`;if(rank!==null&&(!Number.isInteger(rank)||rank<1))return`${name}排名请输入正整数`;if(participants!==null&&(!Number.isInteger(participants)||participants<1))return`${name}参考人数请输入正整数`;if(rank!==null&&effective!==null&&rank>effective)return`${name}排名不能大于参考人数`;}
  return'';
};

saveExam=async function saveExamV14(id,modal){
  const btn=$('.save-btn',modal),exam={id,name:$('#examName',modal).value.trim(),exam_date:$('#examDate',modal).value,grade_level:$('#gradeLevelV14',modal)?.value||'',total_rank:$('#totalRankV14',modal)?.value||'',total_participants:$('#totalParticipantsV14',modal)?.value||'',is_hidden:$('#examHiddenV14',modal)?.value==='1',scores:{}};const seen=new Set();for(const card of $$('.exam-subject-card-v10',modal)){const name=$('.exam-subject-name-v10',card).value.trim();if(!name)return toast('请填写科目名称，或删除空白科目');if(seen.has(name))return toast(`科目「${name}」重复了`);seen.add(name);exam.scores[name]={target:$('.target-v14',card).value,raw:$('.raw-v14',card).value,actual:$('.actual-v14',card).value,rawMax:$('.rawmax-v14',card).value,max:$('.max-v14',card).value,rank:$('.rank-v14',card).value,participants:$('.participants-v14',card).value};}if(!exam.name||!exam.exam_date)return toast('请填写考试名称和日期');const error=validateExam(exam);if(error)return toast(error);btn.disabled=true;btn.textContent='保存中…';try{await dataApiV7('save_exam',{exam});await loadExams();modal.remove();state.modal=null;render();toast(id?'已保存修改':'考试已记录');}catch(e){toast(e.message);btn.disabled=false;btn.textContent=id?'保存修改':'保存考试';}
};

recordsHtml=function recordsHtmlV14(){
  const exams=state.allExams||[],hidden=exams.filter(e=>e.is_hidden).length,order=categoryOptionsV14(),groups=[...order.map(v=>({name:v,exams:exams.filter(e=>e.grade_level===v)})),{name:'未分类',exams:exams.filter(e=>!e.grade_level)}].filter(g=>g.exams.length);
  return `<div class="page-head"><div><h2>考试记录</h2><p>按${escapeHtml(categoryLabelV14())}分组；每次考试的科目彼此独立。${hidden?` ${hidden} 次已隐藏。`:''}</p></div><button class="primary" id="addExam">＋ 新建</button></div>${groups.length?groups.map(g=>`<section class="grade-section-v13"><div class="grade-section-head-v13"><h3>${escapeHtml(g.name)}</h3><span>${g.exams.length} 次</span></div><div class="card records-card">${g.exams.map(recordHtml).join('')}</div></section>`).join(''):`<div class="card records-card"><div class="empty-chart" style="height:260px"><div>还没有考试记录<br><button class="secondary" id="emptyAdd" style="margin-top:14px">记录第一场考试</button></div></div></div>`}`;
};

const recordHtmlBeforeV14=recordHtml;
recordHtml=function recordHtmlV14(exam){let html=recordHtmlBeforeV14(exam);html=html.replace(/<span class="grade-badge-v13">[\s\S]*?<\/span>/,`<span class="grade-badge-v13">${escapeHtml(exam.grade_level||'未分类')}</span>`);return html;};

const bindPageBeforeV14=bindPage;
bindPage=function bindPageV14(){bindPageBeforeV14();$('#manageCategoriesV14')?.addEventListener('click',openCategoryManagerV14);$$('[data-grade-filter-v13]').forEach(button=>button.onclick=()=>{state.gradeFilter=button.dataset.gradeFilterV13;state.radarSelection=[];applyGradeFilterV13();render();});};
;
/* ===== app-v15.js ===== */
// v15: simple in-app password change setting
(function injectV15Styles(){
  if (document.getElementById('app-v15-style')) return;
  var style=document.createElement('style');
  style.id='app-v15-style';
  style.textContent='\n    .password-card-v15{margin-top:18px;padding:22px}\n    .password-grid-v15{display:grid;grid-template-columns:1fr 1fr auto;gap:10px;align-items:end;margin-top:14px}\n    .password-grid-v15 .field{margin:0}\n    .password-note-v15{font-size:12px;color:var(--muted);line-height:1.6;margin-top:10px}\n    @media(max-width:620px){.password-card-v15{padding:18px 16px}.password-grid-v15{grid-template-columns:1fr}.password-grid-v15 button{width:100%}}\n  ';
  document.head.appendChild(style);
})();

var PASSWORD_API_V15='https://kdwpmcdxapwecbfrvqtm.supabase.co/functions/v1/score-tracker-password-api';

async function changePasswordApiV15(newPassword){
  var response=await fetch(PASSWORD_API_V15,{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({token:state.token,newPassword:newPassword})
  });
  var data=await response.json().catch(function(){return {error:'网络响应异常'};});
  if(!response.ok) throw new Error(data.error||'密码修改失败');
  return data;
}

var accountHtmlBeforeV15=accountHtml;
accountHtml=function accountHtmlV15(){
  var html=accountHtmlBeforeV15();
  return html+`<div class="card password-card-v15"><div><h3 class="card-title">修改密码</h3><p class="card-sub">已登录时可直接设置一个更好记的新密码。</p></div><div class="password-grid-v15"><div class="field"><label>新密码</label><input id="newPasswordV15" type="password" inputmode="numeric" pattern="[0-9]*" autocomplete="new-password" placeholder="6～20位数字"></div><div class="field"><label>再次输入</label><input id="confirmPasswordV15" type="password" inputmode="numeric" pattern="[0-9]*" autocomplete="new-password" placeholder="再次输入新密码"></div><button class="primary" id="changePasswordV15">保存新密码</button></div><div class="password-note-v15">修改成功后当前设备不会退出，以后重新登录请使用新密码。建议改成自己容易记住、但别人不容易猜到的数字组合。</div></div>`;
};

var bindPageBeforeV15=bindPage;
bindPage=function bindPageV15(){
  bindPageBeforeV15();
  var button=document.getElementById('changePasswordV15');
  if(button){
    button.onclick=async function(){
      var first=(document.getElementById('newPasswordV15')||{}).value||'';
      var second=(document.getElementById('confirmPasswordV15')||{}).value||'';
      if(!/^\d{6,20}$/.test(first)) return toast('新密码请设置为 6～20 位数字');
      if(first!==second) return toast('两次输入的密码不一致');
      button.disabled=true;
      button.textContent='保存中…';
      try{
        await changePasswordApiV15(first);
        document.getElementById('newPasswordV15').value='';
        document.getElementById('confirmPasswordV15').value='';
        toast('密码已修改，请记住新密码');
      }catch(e){
        toast(e&&e.message?e.message:'密码修改失败');
      }finally{
        button.disabled=false;
        button.textContent='保存新密码';
      }
    };
  }
};

var renderLoginBeforeV15=renderLogin;
renderLogin=function renderLoginV15(error){
  renderLoginBeforeV15(error);
  var passwordInput=document.getElementById('loginPass');
  if(passwordInput) passwordInput.placeholder='输入密码';
  var help=document.querySelector('.auth-help');
  if(help) help.textContent='新账号会生成 10 位数字密码；登录后可在账号页改成自己的 6～20 位数字密码。';
};
;
/* ===== app-v16.js ===== */
// v16: split rankings into year-grade rank and class rank while preserving all old rank data as year-grade rank.
state.rankScopeV16 = state.rankScopeV16 || 'year';

(function injectV16Styles(){
  if (document.getElementById('app-v16-style')) return;
  var style=document.createElement('style');
  style.id='app-v16-style';
  style.textContent=`
    .rank-scope-v16,.rank-view-v16{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:0 0 10px}
    .rank-scope-v16 .label,.rank-view-v16 .label{font-size:12px;font-weight:700;color:var(--muted)}
    .rank-view-v16{margin-top:-2px}
    .rank-view-v16 .metric-btn-v7{padding:6px 10px;font-size:11px}
    .total-ranks-v16{display:grid;grid-template-columns:1fr 1fr;gap:10px}
    .rank-scope-card-v16{border:1px solid var(--line);border-radius:14px;padding:11px;background:#fafbfe}
    .rank-scope-card-v16 b{display:block;font-size:12px;margin-bottom:8px}
    .rank-pair-v16{display:grid;grid-template-columns:1fr 1fr;gap:7px}
    .rank-pair-v16 label{display:block;font-size:10px;color:var(--muted);font-weight:700;margin-bottom:4px}
    .rank-pair-v16 input{width:100%;min-width:0;border:1px solid var(--line);border-radius:10px;padding:9px 8px;background:#fff;outline:none}
    .subject-ranks-v16{display:grid;gap:7px;margin-top:8px}
    .subject-rank-row-v16{display:grid;grid-template-columns:52px minmax(0,1fr) minmax(0,1fr);gap:7px;align-items:center}
    .subject-rank-row-v16>span{font-size:11px;font-weight:700;color:#596474}
    .subject-rank-row-v16 input{width:100%;min-width:0;border:1px solid var(--line);border-radius:10px;padding:8px 7px;background:#fff;outline:none;font-size:12px}
    .rank-compat-v16{font-size:11px;line-height:1.6;color:var(--muted);margin-top:9px}
    .record-ranks-v16{display:inline-flex;gap:6px;flex-wrap:wrap}
    @media(max-width:620px){
      .rank-scope-v16{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));width:100%}
      .rank-scope-v16 .label{grid-column:1/-1}.rank-scope-v16 .metric-btn-v7{width:100%}
      .rank-view-v16{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));width:100%}
      .rank-view-v16 .label{grid-column:1/-1}.rank-view-v16 .metric-btn-v7{width:100%}
      .total-ranks-v16{grid-template-columns:1fr}
      .subject-rank-row-v16{grid-template-columns:44px minmax(0,1fr) minmax(0,1fr)}
    }
  `;
  document.head.appendChild(style);
})();

function rankScopeLabelV16(scope){ return scope === 'class' ? '班排' : '年排'; }
function rankScopeLongLabelV16(scope){ return scope === 'class' ? '班级排名' : '年级排名'; }
function rankInfoByScopeV16(exam, subject, scope){
  if (!exam) return { rank:null, participants:null, performance:null };
  var isClass = scope === 'class';
  if (subject === '总分') {
    var rank = num(isClass ? exam.total_class_rank : exam.total_rank);
    var participants = num(isClass ? exam.total_class_participants : exam.total_participants);
    return { rank:rank, participants:participants, performance:rankPerformanceV7(rank,participants) };
  }
  var row = exam.scores?.[subject] || {};
  var rank = num(isClass ? row.classRank : row.rank);
  var participants = num(isClass ? row.classParticipants : row.participants);
  if (participants === null) participants = num(isClass ? exam.total_class_participants : exam.total_participants);
  return { rank:rank, participants:participants, performance:rankPerformanceV7(rank,participants) };
}

rankInfoV7 = function rankInfoV16(exam,subject){ return rankInfoByScopeV16(exam,subject,state.rankScopeV16); };
rawRankValueV11 = function rawRankValueV16(exam,subject){ return rankInfoByScopeV16(exam,subject,state.rankScopeV16).rank; };

var rawRankChartBeforeV16 = rawRankChartHtmlV11;
rawRankChartHtmlV11 = function rawRankChartHtmlV16(){
  var html=rawRankChartBeforeV16();
  var label=rankScopeLongLabelV16(state.rankScopeV16);
  return html
    .replace(/原始名次模式/g, label+'模式')
    .replace(/原始名次/g, label)
    .replace(/这个项目还没有名次数据/g, '这个项目还没有'+label+'数据')
    .replace(/记录名次后/g, '记录'+label+'后');
};

var rankChartBeforeV16 = rankChartHtmlV7;
rankChartHtmlV7 = function rankChartHtmlV16(){
  var html=rankChartBeforeV16();
  var label=rankScopeLongLabelV16(state.rankScopeV16);
  return html
    .replace(/排名趋势分析/g, label+'百分位趋势分析')
    .replace(/这个科目还没有排名数据/g, '这个科目还没有'+label+'数据')
    .replace(/排名表现/g, label+'百分位');
};

var homeHtmlBeforeV16 = homeHtml;
homeHtml = function homeHtmlV16(){
  var html=homeHtmlBeforeV16();
  var isRank=state.trendMetric==='rank_raw'||state.trendMetric==='rank';
  var scope=state.rankScopeV16;
  var scopeLabel=rankScopeLabelV16(scope);
  var toggle=`<div class="trend-metric-toggle-v7 rank-scope-v16"><span class="label">趋势类型</span><button class="metric-btn-v7 ${!isRank&&state.trendMetric==='score'?'active':''}" data-trend-scope-v16="score">成绩</button><button class="metric-btn-v7 ${isRank&&scope==='year'?'active':''}" data-trend-scope-v16="year">年排</button><button class="metric-btn-v7 ${isRank&&scope==='class'?'active':''}" data-trend-scope-v16="class">班排</button></div>${isRank?`<div class="rank-view-v16"><span class="label">查看</span><button class="metric-btn-v7 ${state.trendMetric==='rank_raw'?'active':''}" data-trend-metric="rank_raw">名次</button><button class="metric-btn-v7 ${state.trendMetric==='rank'?'active':''}" data-trend-metric="rank">百分位</button></div>`:''}`;
  html=html.replace(/<div class="trend-metric-toggle-v7">[\s\S]*?<\/div>/,toggle);
  if(isRank){
    var title=state.trendMetric==='rank_raw'?scopeLabel+'趋势':scopeLabel+'百分位趋势';
    html=html.replace(/<h3 class="card-title">(?:成绩趋势|名次趋势|排名趋势)<\/h3>/,`<h3 class="card-title">${title}</h3>`);
    if(state.trendMetric==='rank_raw'){
      html=html.replace('直接看原始第几名；纵轴反向显示，第 1 名在最上方',`直接看${scopeLabel}第几名；纵轴越高越好，第 1 名在最上方`);
      html=html.replace('总分与各科直接叠加原始名次；越靠上代表名次越好',`总分与各科叠加${scopeLabel}；越靠上代表名次越好`);
    }else{
      html=html.replace('用参考人数把名次转换成可比较的“排名表现”，避免考试难度和人数变化干扰判断',`${scopeLabel}结合对应参考人数换算成百分位，方便不同考试之间比较`);
      html=html.replace('总分与各科排名统一换算为排名表现；参考人数不同也能放在一起比较',`总分与各科${scopeLabel}统一换算成百分位；参考人数变化时也更可比`);
    }
  }
  return html;
};

var radarChartBeforeV16 = radarChartHtml;
radarChartHtml = function radarChartHtmlV16(selected){
  var html=radarChartBeforeV16(selected);
  if(state.radarMode==='rank_raw'){
    var label=rankScopeLongLabelV16(state.rankScopeV16);
    html=html.replace(/原始名次/g,label).replace(/名次数据/g,label+'数据');
  }
  if(state.radarMode==='rank'){
    var p=rankScopeLabelV16(state.rankScopeV16)+'百分位';
    html=html.replace(/排名百分位/g,p);
  }
  return html;
};
var radarSummaryBeforeV16 = radarSummaryHtml;
radarSummaryHtml = function radarSummaryHtmlV16(selected){
  var html=radarSummaryBeforeV16(selected);
  if(state.radarMode==='rank_raw') html=html.replace(/名次/g,rankScopeLabelV16(state.rankScopeV16));
  if(state.radarMode==='rank') html=html.replace(/排名百分位/g,rankScopeLabelV16(state.rankScopeV16)+'百分位');
  return html;
};
radarCardHtml = function radarCardHtmlV16(){
  var available=radarAvailableExams();
  var selected=selectedRadarExams();
  var isRank=state.radarMode==='rank_raw'||state.radarMode==='rank';
  var scope=state.rankScopeV16;
  var scopeLabel=rankScopeLabelV16(scope);
  var sub=state.radarMode==='rank_raw'
    ? `直接按${scopeLabel}绘制：越靠外代表名次越好，第 1 名方向最外。`
    : state.radarMode==='rank'
      ? `按${scopeLabel}百分位绘制：越靠外代表相对排名越好。`
      : state.radarMode==='raw_score'
        ? '按原始得分率绘制，方便比较赋分前后的学科结构。'
        : '按得分率绘制；没有数据的科目会自动隐藏，6 科就显示六边形。';
  return `<div class="card radar-card"><div class="card-title-row"><div><h3 class="card-title">全部科目雷达图</h3><p class="card-sub">${sub}</p></div></div>
    <div class="radar-toolbar"><div class="toggle-row"><span class="label">查看内容</span><button class="chip ${state.radarMode==='actual'?'active':''}" data-radar-mode="actual">最终分</button><button class="chip ${state.radarMode==='raw_score'?'active':''}" data-radar-mode="raw_score">原始分</button><button class="chip ${state.radarMode==='target'?'active':''}" data-radar-mode="target">目标</button><button class="chip ${isRank&&scope==='year'?'active':''}" data-radar-scope-v16="year">年排</button><button class="chip ${isRank&&scope==='class'?'active':''}" data-radar-scope-v16="class">班排</button></div>${isRank?`<div class="rank-view-v16"><span class="label">查看</span><button class="metric-btn-v7 ${state.radarMode==='rank_raw'?'active':''}" data-radar-mode="rank_raw">名次</button><button class="metric-btn-v7 ${state.radarMode==='rank'?'active':''}" data-radar-mode="rank">百分位</button></div>`:''}<div><div class="subtle-note">最多叠加 4 次考试，只显示所选考试共同拥有数据的科目；坐标会自动缩放。</div>${isRank?`<div class="rank-compat-v16">${scopeLabel}和${scopeLabel}人数都可按科目单独填写；科目人数留空时自动使用总${scopeLabel}人数。</div>`:''}<div class="multi-select" style="margin-top:8px">${available.length?available.map(function(exam){return `<button class="select-pill ${state.radarSelection.includes(exam.id)?'active':''}" data-radar-exam="${exam.id}">${escapeHtml(exam.name)} · ${fmtDate(exam.exam_date)}</button>`;}).join(''):`<span class="subtle-note">当前还没有可用于${isRank?scopeLabel+'雷达图':'雷达图'}的数据</span>`}</div></div></div>
    <div class="radar-wrap" id="radarChart">${radarChartHtml(selected)}</div>${radarLegendHtml(selected)}${radarSummaryHtml(selected)}</div>`;
};

function seedRowsV16(exam){
  if(exam) return Object.entries(exam.scores||{}).map(function(entry){
    var name=entry[0],row=entry[1]||{};
    return {name:name,target:row.target??'',raw:row.raw??'',actual:row.actual??'',rawMax:row.rawMax??row.max??defaultMax(name),max:row.max??defaultMax(name),rank:row.rank??'',participants:row.participants??'',classRank:row.classRank??'',classParticipants:row.classParticipants??''};
  });
  var source=state.exams&&state.exams.length?state.exams[state.exams.length-1]:((state.unfilteredVisibleExamsV13||[]).length?state.unfilteredVisibleExamsV13[state.unfilteredVisibleExamsV13.length-1]:null);
  if(source&&Object.keys(source.scores||{}).length) return Object.entries(source.scores).map(function(entry){
    var name=entry[0],row=entry[1]||{};
    return {name:name,target:'',raw:'',actual:'',rawMax:row.rawMax??row.max??defaultMax(name),max:row.max??defaultMax(name),rank:'',participants:'',classRank:'',classParticipants:''};
  });
  var templates=state.subjectConfigs?.length?state.subjectConfigs:SUBJECTS.map(function(name){return {name:name,defaultMax:defaultMax(name)};});
  return templates.map(function(item){return {name:item.name,target:'',raw:'',actual:'',rawMax:item.defaultMax??100,max:item.defaultMax??100,rank:'',participants:'',classRank:'',classParticipants:''};});
}

openExam = function openExamV16(exam=null){
  var editing=!!exam;
  var today=new Date().toISOString().slice(0,10);
  var rows=seedRowsV16(exam);
  var options=categoryOptionsV14();
  var previous=(state.unfilteredVisibleExamsV13||[]);
  var last=previous.length?previous[previous.length-1]:null;
  var selected=exam?.grade_level||(!editing?(last?.grade_level||''):'');
  var modal=document.createElement('div');
  modal.className='modal-backdrop';
  modal.innerHTML=`<div class="modal"><div class="modal-head"><h3>${editing?'编辑考试':'记录一次考试'}</h3><button class="close-btn">×</button></div><div class="modal-body"><div class="form-grid"><div class="field"><label>考试名称</label><input id="examName" maxlength="60" value="${escapeHtml(exam?.name||'')}" placeholder="例如：期中考试"></div><div class="field"><label>考试日期</label><input id="examDate" type="date" value="${exam?.exam_date||today}"></div><div class="field"><label>${escapeHtml(categoryLabelV14())}</label><select id="gradeLevelV14" class="grade-select-v13"><option value="">未分类</option>${options.map(function(v){return `<option value="${escapeHtml(v)}" ${selected===v?'selected':''}>${escapeHtml(v)}</option>`;}).join('')}</select></div></div>
  <div class="section-head-v7"><div><h4>本次考试科目</h4><p>科目可自由增减；原始分和最终分可以使用不同满分。</p></div></div><div class="exam-subjects-v10" id="examSubjectsV16"></div><div class="exam-subject-toolbar-v10"><button class="secondary" id="addExamSubjectV16">＋ 添加科目 / 模块</button></div>
  <div class="score-total-preview-v13"><div class="score-total-box-v13"><span>原始总分</span><b id="rawTotalV16">—</b></div><div class="score-total-box-v13"><span>赋分 / 最终总分</span><b id="finalTotalV16">—</b></div></div>
  <div class="section-head-v7"><div><h4>排名（可选）</h4><p>旧版“名次”已统一视为年排；班排是新增字段，不会改动已有数据。</p></div></div><div class="total-ranks-v16"><div class="rank-scope-card-v16"><b>年级排名</b><div class="rank-pair-v16"><div><label>名次</label><input id="totalRankV16" inputmode="numeric" pattern="[0-9]*" value="${exam?.total_rank??''}" placeholder="如 36"></div><div><label>年级人数</label><input id="totalParticipantsV16" inputmode="numeric" pattern="[0-9]*" value="${exam?.total_participants??''}" placeholder="如 620"></div></div></div><div class="rank-scope-card-v16"><b>班级排名</b><div class="rank-pair-v16"><div><label>名次</label><input id="totalClassRankV16" inputmode="numeric" pattern="[0-9]*" value="${exam?.total_class_rank??''}" placeholder="如 8"></div><div><label>班级人数</label><input id="totalClassParticipantsV16" inputmode="numeric" pattern="[0-9]*" value="${exam?.total_class_participants??''}" placeholder="如 45"></div></div></div></div>
  <div class="rank-compat-v16">各科的年级/班级人数可以留空，分别自动沿用上面的总年级人数 / 总班级人数。</div>
  <div class="visibility-box-v10"><div><b>图表显示</b><span>${exam?.is_hidden?'已隐藏，不参与图表。':'正常参与图表。'}</span></div><button class="secondary" id="toggleHiddenV16">${exam?.is_hidden?'恢复显示':'隐藏'}</button><input type="hidden" id="examHiddenV16" value="${exam?.is_hidden?'1':'0'}"></div>${editing?'<div class="modal-danger-row-v10"><button class="delete-exam-v10" id="deleteExamV16">删除这次考试</button></div>':''}<div class="modal-actions"><button class="secondary cancel-btn">取消</button><button class="primary save-btn">${editing?'保存修改':'保存考试'}</button></div></div></div>`;
  document.body.appendChild(modal);state.modal=modal;
  var list=document.getElementById('examSubjectsV16');
  function sync(){
    var next=$$('.exam-subject-card-v10',list).map(function(card){return {
      name:$('.exam-subject-name-v10',card).value,
      target:$('.target-v16',card).value,
      raw:$('.raw-v16',card).value,
      actual:$('.actual-v16',card).value,
      rawMax:$('.rawmax-v16',card).value,
      max:$('.max-v16',card).value,
      rank:$('.year-rank-v16',card).value,
      participants:$('.year-participants-v16',card).value,
      classRank:$('.class-rank-v16',card).value,
      classParticipants:$('.class-participants-v16',card).value
    };});
    rows.splice(0,rows.length,...next);
  }
  function totals(){sync();document.getElementById('rawTotalV16').textContent=formatScore(rawTotalFromRowsV13(rows));document.getElementById('finalTotalV16').textContent=formatScore(finalTotalFromRowsV13(rows));}
  function card(row){return `<div class="exam-subject-card-v10"><div class="exam-subject-head-v10"><input class="exam-subject-name-v10" maxlength="40" value="${escapeHtml(row.name||'')}" placeholder="科目 / 模块"><button class="remove-exam-subject-v10" type="button">×</button></div><div class="score-compact-v14"><div class="mini-field-v10 target-box-v14"><label>目标</label><input class="target-v16" inputmode="decimal" value="${row.target??''}" placeholder="可留空"></div><div class="mini-field-v10 final-box-v14"><label>赋分 / 最终分</label><div class="score-with-max-v14"><input class="actual-v16" inputmode="decimal" value="${row.actual??''}" placeholder="得分"><span>/</span><input class="max-v16" inputmode="decimal" value="${row.max??100}" placeholder="满分"></div></div><div class="mini-field-v10 raw-box-v14"><label>原始分</label><div class="score-with-max-v14"><input class="raw-v16" inputmode="decimal" value="${row.raw??''}" placeholder="得分"><span>/</span><input class="rawmax-v16" inputmode="decimal" value="${row.rawMax??row.max??100}" placeholder="满分"></div></div></div><div class="subject-ranks-v16"><div class="subject-rank-row-v16"><span>年排</span><input class="year-rank-v16" inputmode="numeric" pattern="[0-9]*" value="${row.rank??''}" placeholder="名次"><input class="year-participants-v16" inputmode="numeric" pattern="[0-9]*" value="${row.participants??''}" placeholder="年级人数"></div><div class="subject-rank-row-v16"><span>班排</span><input class="class-rank-v16" inputmode="numeric" pattern="[0-9]*" value="${row.classRank??''}" placeholder="名次"><input class="class-participants-v16" inputmode="numeric" pattern="[0-9]*" value="${row.classParticipants??''}" placeholder="班级人数"></div></div></div>`;}
  function renderRows(){
    list.innerHTML=rows.map(card).join('');
    $$('.remove-exam-subject-v10',list).forEach(function(button,index){button.onclick=function(){sync();rows.splice(index,1);renderRows();totals();};});
    $$('input',list).forEach(function(input){input.addEventListener('input',totals);});
  }
  renderRows();totals();
  function close(){modal.remove();state.modal=null;}
  $('.close-btn',modal).onclick=close;$('.cancel-btn',modal).onclick=close;modal.onclick=function(event){if(event.target===modal)close();};
  document.getElementById('addExamSubjectV16').onclick=function(){sync();if(rows.length>=40)return toast('最多 40 个科目 / 模块');rows.push({name:'',target:'',raw:'',actual:'',rawMax:100,max:100,rank:'',participants:'',classRank:'',classParticipants:''});renderRows();var inputs=list.querySelectorAll('.exam-subject-name-v10');if(inputs.length)inputs[inputs.length-1].focus();};
  document.getElementById('toggleHiddenV16').onclick=function(){var input=document.getElementById('examHiddenV16'),next=input.value!=='1';input.value=next?'1':'0';this.textContent=next?'恢复显示':'隐藏';$('.visibility-box-v10 span',modal).textContent=next?'保存后不参与图表。':'保存后正常参与图表。';};
  document.getElementById('deleteExamV16')?.addEventListener('click',async function(){if(!confirm(`确定永久删除「${exam?.name||'这次考试'}」？`))return;try{await dataApiV7('delete_exam',{examId:exam.id});await loadExams();close();render();toast('已删除');}catch(error){toast(error.message);}});
  $('.save-btn',modal).onclick=function(){saveExam(exam?.id||null,modal);};
};

validateExam = function validateExamV16(exam){
  function validatePair(rankValue,participantsValue,label){
    var r=num(rankValue),p=num(participantsValue);
    if(r!==null&&(!Number.isInteger(r)||r<1))return label+'请输入正整数';
    if(p!==null&&(!Number.isInteger(p)||p<1))return label.replace('排名','人数')+'请输入正整数';
    if(r!==null&&p!==null&&r>p)return label+'不能大于参考人数';
    return '';
  }
  var error=validatePair(exam.total_rank,exam.total_participants,'年级总排名');if(error)return error;
  error=validatePair(exam.total_class_rank,exam.total_class_participants,'班级总排名');if(error)return error;
  var yearTotal=num(exam.total_participants),classTotal=num(exam.total_class_participants);
  for(var entry of Object.entries(exam.scores||{})){
    var name=entry[0],row=entry[1]||{},max=num(row.max)??defaultMax(name),rawMax=num(row.rawMax)??max,target=num(row.target),raw=num(row.raw),actual=num(row.actual);
    if(max<=0||rawMax<=0)return `${name} 的满分必须大于 0`;
    if(target!==null&&target>max)return `${name}目标不能超过最终满分 ${formatScore(max)}`;
    if(actual!==null&&actual>max)return `${name}赋分/最终分不能超过最终满分 ${formatScore(max)}`;
    if(raw!==null&&raw>rawMax)return `${name}原始分不能超过原始满分 ${formatScore(rawMax)}`;
    var yr=num(row.rank),yp=num(row.participants),cr=num(row.classRank),cp=num(row.classParticipants);
    if(yr!==null&&(!Number.isInteger(yr)||yr<1))return `${name}年排请输入正整数`;
    if(yp!==null&&(!Number.isInteger(yp)||yp<1))return `${name}年级人数请输入正整数`;
    if(cr!==null&&(!Number.isInteger(cr)||cr<1))return `${name}班排请输入正整数`;
    if(cp!==null&&(!Number.isInteger(cp)||cp<1))return `${name}班级人数请输入正整数`;
    var yEffective=yp??yearTotal,cEffective=cp??classTotal;
    if(yr!==null&&yEffective!==null&&yr>yEffective)return `${name}年排不能大于年级人数`;
    if(cr!==null&&cEffective!==null&&cr>cEffective)return `${name}班排不能大于班级人数`;
  }
  return '';
};

saveExam = async function saveExamV16(id,modal){
  var button=$('.save-btn',modal);
  var exam={id:id,name:$('#examName',modal).value.trim(),exam_date:$('#examDate',modal).value,grade_level:$('#gradeLevelV14',modal)?.value||'',total_rank:$('#totalRankV16',modal)?.value||'',total_participants:$('#totalParticipantsV16',modal)?.value||'',total_class_rank:$('#totalClassRankV16',modal)?.value||'',total_class_participants:$('#totalClassParticipantsV16',modal)?.value||'',is_hidden:$('#examHiddenV16',modal)?.value==='1',scores:{}};
  var seen=new Set();
  for(var card of $$('.exam-subject-card-v10',modal)){
    var name=$('.exam-subject-name-v10',card).value.trim();
    if(!name)return toast('请填写科目名称，或删除空白科目');
    if(seen.has(name))return toast(`科目「${name}」重复了`);seen.add(name);
    exam.scores[name]={target:$('.target-v16',card).value,raw:$('.raw-v16',card).value,actual:$('.actual-v16',card).value,rawMax:$('.rawmax-v16',card).value,max:$('.max-v16',card).value,rank:$('.year-rank-v16',card).value,participants:$('.year-participants-v16',card).value,classRank:$('.class-rank-v16',card).value,classParticipants:$('.class-participants-v16',card).value};
  }
  if(!exam.name||!exam.exam_date)return toast('请填写考试名称和日期');
  var error=validateExam(exam);if(error)return toast(error);
  button.disabled=true;button.textContent='保存中…';
  try{await dataApiV7('save_exam',{exam:exam});await loadExams();modal.remove();state.modal=null;render();toast(id?'已保存修改':'考试已记录');}
  catch(e){toast(e.message);button.disabled=false;button.textContent=id?'保存修改':'保存考试';}
};

var recordHtmlBeforeV16=recordHtml;
recordHtml=function recordHtmlV16(exam){
  var html=recordHtmlBeforeV16(exam);
  html=html.replace(/<span class="score-tag"><b>总排名[\s\S]*?<\/span>/g,'');
  var year=rankInfoByScopeV16(exam,'总分','year');
  var cls=rankInfoByScopeV16(exam,'总分','class');
  var badges='';
  if(year.rank!==null)badges+=`<span class="score-tag"><b>年排 ${year.rank}${year.participants?` / ${year.participants}`:''}</b></span>`;
  if(cls.rank!==null)badges+=`<span class="score-tag"><b>班排 ${cls.rank}${cls.participants?` / ${cls.participants}`:''}</b></span>`;
  if(badges)html=html.replace('</div><div class="record-actions">',`${badges}</div><div class="record-actions">`);
  return html;
};

var bindPageBeforeV16=bindPage;
bindPage=function bindPageV16(){
  bindPageBeforeV16();
  $$('[data-trend-scope-v16]').forEach(function(button){button.onclick=function(){var scope=button.dataset.trendScopeV16;if(scope==='score'){state.trendMetric='score';}else{state.rankScopeV16=scope;if(state.trendMetric!=='rank_raw'&&state.trendMetric!=='rank')state.trendMetric='rank_raw';}render();};});
  $$('[data-radar-scope-v16]').forEach(function(button){button.onclick=function(){state.rankScopeV16=button.dataset.radarScopeV16;if(state.radarMode!=='rank_raw'&&state.radarMode!=='rank')state.radarMode='rank_raw';state.radarSelection=[];ensureRadarSelection();render();};});
};
;
/* ===== app-v17.js ===== */
// v17 / product v1.1: direct position-percent input, statistical subtotal items, newest-first records.
state.rankEntryModeV17 = state.rankEntryModeV17 || 'rank';

(function injectV17Styles(){
  if (document.getElementById('app-v17-style')) return;
  var style=document.createElement('style');
  style.id='app-v17-style';
  style.textContent=`
    .rank-entry-mode-v17{display:flex;align-items:center;gap:7px;flex-wrap:wrap;margin:4px 0 10px}
    .rank-entry-mode-v17 .label{font-size:11px;font-weight:700;color:var(--muted)}
    .rank-entry-mode-v17 button{border:1px solid var(--line);background:#fff;color:#667085;border-radius:999px;padding:7px 11px;font-size:11px}
    .rank-entry-mode-v17 button.active{background:var(--text);border-color:var(--text);color:#fff;font-weight:700}
    .position-total-v17{display:none;margin-top:8px}
    .position-total-v17 label{display:block;font-size:10px;color:var(--muted);font-weight:700;margin-bottom:4px}
    .position-total-v17 input,.position-percent-v17{width:100%;min-width:0;border:1px solid var(--line);border-radius:10px;padding:9px 8px;background:#fff;outline:none}
    .position-percent-v17{display:none;grid-column:2/4}
    .rank-entry-percent-v17 .rank-scope-card-v16 .rank-pair-v16{display:none}
    .rank-entry-percent-v17 .position-total-v17{display:block}
    .rank-entry-percent-v17 .subject-rank-row-v16>input:not(.position-percent-v17){display:none}
    .rank-entry-percent-v17 .position-percent-v17{display:block}
    .exclude-total-v17{display:flex;align-items:center;gap:7px;margin:-2px 0 9px;font-size:11px;color:#667085;cursor:pointer;user-select:none}
    .exclude-total-v17 input{width:16px!important;height:16px;margin:0;accent-color:#5d72e8}
    .stat-badge-v17{display:inline-flex;align-items:center;border:1px solid #d9e3f3;background:#f4f7fb;color:#65758b;border-radius:999px;padding:2px 6px;font-size:9px;font-weight:700;margin-left:5px}
    .position-note-v17{font-size:10px;line-height:1.55;color:var(--muted);margin-top:7px}
    #app-version-v17{text-align:center;color:#a0a8b6;font-size:11px;padding:10px 12px calc(18px + env(safe-area-inset-bottom));letter-spacing:.03em}
    @media(max-width:620px){.rank-entry-mode-v17{display:grid;grid-template-columns:auto 1fr 1fr}.rank-entry-mode-v17 button{width:100%}.exclude-total-v17{margin-top:1px}}
  `;
  document.head.appendChild(style);
})();

(function addVersionFooterV17(){
  if (document.getElementById('app-version-v17')) return;
  var footer=document.createElement('footer');footer.id='app-version-v17';footer.textContent='Score Tracker · v1.1';document.body.appendChild(footer);
})();

function positionPerformanceV17(positionPercent){var p=num(positionPercent);if(p===null||p<0||p>100)return null;return Math.max(0,Math.min(100,100-p));}
var rankInfoByScopeBeforeV17=rankInfoByScopeV16;
rankInfoByScopeV16=function rankInfoByScopeV17(exam,subject,scope){if(!exam)return{rank:null,participants:null,performance:null,positionPercent:null,directPercent:false};var isClass=scope==='class';var direct=subject==='总分'?num(isClass?exam.total_class_position_percent:exam.total_year_position_percent):num(exam.scores?.[subject]?.[isClass?'classPositionPercent':'yearPositionPercent']);var base=rankInfoByScopeBeforeV17(exam,subject,scope);if(direct!==null&&direct>=0&&direct<=100)return{...base,performance:positionPerformanceV17(direct),positionPercent:direct,directPercent:true};return{...base,positionPercent:null,directPercent:false};};
rankInfoV7=function rankInfoV17(exam,subject){return rankInfoByScopeV16(exam,subject,state.rankScopeV16);};
rawRankValueV11=function rawRankValueV17(exam,subject){return rankInfoByScopeV16(exam,subject,state.rankScopeV16).rank;};

function totalSubjectsV17(exam){return Object.keys(exam?.scores||{}).filter(function(name){return !exam.scores?.[name]?.excludeFromTotal;});}
totalFor=function totalForV17(exam,key){var sum=0,count=0;totalSubjectsV17(exam).forEach(function(s){var v=examScore(exam,s,key);if(v!==null){sum+=v;count++;}});return count?sum:null;};
totalMax=function totalMaxV17(exam,key){var sum=0,count=0;totalSubjectsV17(exam).forEach(function(s){var v=examScore(exam,s,key);if(v!==null){sum+=examMax(exam,s);count++;}});return count?sum:null;};
totalRawForV13=function totalRawForV17(exam){var sum=0,count=0;totalSubjectsV17(exam).forEach(function(s){var v=examRawScoreV13(exam,s);if(v!==null){sum+=v;count++;}});return count?sum:null;};
totalRawMaxV13=function totalRawMaxV17(exam){var sum=0,count=0;totalSubjectsV17(exam).forEach(function(s){var v=examRawScoreV13(exam,s);if(v!==null){sum+=rawMaxV14(exam,s);count++;}});return count?sum:null;};
rawTotalFromRowsV13=function rawTotalFromRowsV17(rows){var sum=0,count=0;(rows||[]).forEach(function(row){if(row.excludeFromTotal)return;var raw=num(row.raw),actual=num(row.actual),v=raw??actual;if(v!==null){sum+=v;count++;}});return count?sum:null;};
finalTotalFromRowsV13=function finalTotalFromRowsV17(rows){var sum=0,count=0;(rows||[]).forEach(function(row){if(row.excludeFromTotal)return;var v=num(row.actual);if(v!==null){sum+=v;count++;}});return count?sum:null;};

function hasDirectPercentV17(scope){var isClass=scope==='class';return(state.exams||[]).some(function(exam){if(num(isClass?exam.total_class_position_percent:exam.total_year_position_percent)!==null)return true;return Object.values(exam.scores||{}).some(function(row){return num(row?.[isClass?'classPositionPercent':'yearPositionPercent'])!==null;});});}
function hasRawRankV17(scope){var isClass=scope==='class';return(state.exams||[]).some(function(exam){if(num(isClass?exam.total_class_rank:exam.total_rank)!==null)return true;return Object.values(exam.scores||{}).some(function(row){return num(row?.[isClass?'classRank':'rank'])!==null;});});}

var openExamBeforeV17=openExam;
openExam=function openExamV17(exam=null){
  openExamBeforeV17(exam);var modal=state.modal;if(!modal)return;
  var initial={};Object.entries(exam?.scores||{}).forEach(function(entry){var name=entry[0],row=entry[1]||{};initial[name]={excludeFromTotal:!!row.excludeFromTotal,yearPositionPercent:row.yearPositionPercent??'',classPositionPercent:row.classPositionPercent??''};});var customState={...initial};
  var directExists=num(exam?.total_year_position_percent)!==null||num(exam?.total_class_position_percent)!==null||Object.values(exam?.scores||{}).some(function(row){return num(row?.yearPositionPercent)!==null||num(row?.classPositionPercent)!==null;});var rankExists=num(exam?.total_rank)!==null||num(exam?.total_class_rank)!==null||Object.values(exam?.scores||{}).some(function(row){return num(row?.rank)!==null||num(row?.classRank)!==null;});var mode=directExists&&!rankExists?'percent':'rank';modal.dataset.rankEntryModeV17=mode;modal.classList.toggle('rank-entry-percent-v17',mode==='percent');
  var totalRanks=modal.querySelector('.total-ranks-v16');
  if(totalRanks&&!modal.querySelector('.rank-entry-mode-v17')){var switcher=document.createElement('div');switcher.className='rank-entry-mode-v17';switcher.innerHTML='<span class="label">录入方式</span><button type="button" data-entry-mode-v17="rank">名次</button><button type="button" data-entry-mode-v17="percent">位比</button>';totalRanks.parentNode.insertBefore(switcher,totalRanks);var cards=totalRanks.querySelectorAll('.rank-scope-card-v16');cards.forEach(function(card,index){var wrap=document.createElement('div');wrap.className='position-total-v17';var value=index===0?(exam?.total_year_position_percent??''):(exam?.total_class_position_percent??'');wrap.innerHTML='<label>位比（前 %）</label><input class="'+(index===0?'total-year-position-v17':'total-class-position-v17')+'" inputmode="decimal" value="'+escapeHtml(value)+'" placeholder="如 12.5">';card.appendChild(wrap);});var note=document.createElement('div');note.className='position-note-v17';note.textContent='位比按成绩单“前 x%”原样填写；趋势图会自动换算成越高越好的百分位。';totalRanks.insertAdjacentElement('afterend',note);}
  function snapshotCustom(){modal.querySelectorAll('.exam-subject-card-v10').forEach(function(card){var name=card.querySelector('.exam-subject-name-v10')?.value.trim();if(!name)return;customState[name]={excludeFromTotal:!!card.querySelector('.exclude-total-check-v17')?.checked,yearPositionPercent:card.querySelector('.year-position-v17')?.value??'',classPositionPercent:card.querySelector('.class-position-v17')?.value??''};});}
  function decorate(){modal.querySelectorAll('.exam-subject-card-v10').forEach(function(card){if(card.dataset.v17Decorated==='1')return;card.dataset.v17Decorated='1';var name=card.querySelector('.exam-subject-name-v10')?.value.trim()||'',saved=customState[name]||initial[name]||{excludeFromTotal:false,yearPositionPercent:'',classPositionPercent:''};var head=card.querySelector('.exam-subject-head-v10');if(head){var label=document.createElement('label');label.className='exclude-total-v17';label.innerHTML='<input type="checkbox" class="exclude-total-check-v17" '+(saved.excludeFromTotal?'checked':'')+'> <span>统计项，不计入总分</span>';head.insertAdjacentElement('afterend',label);}var rankRows=card.querySelectorAll('.subject-rank-row-v16');rankRows.forEach(function(row,index){var input=document.createElement('input');input.className='position-percent-v17 '+(index===0?'year-position-v17':'class-position-v17');input.inputMode='decimal';input.placeholder='位比（前%）';input.value=index===0?(saved.yearPositionPercent??''):(saved.classPositionPercent??'');row.appendChild(input);});});}
  function updateMode(){var current=modal.dataset.rankEntryModeV17||'rank';modal.classList.toggle('rank-entry-percent-v17',current==='percent');modal.querySelectorAll('[data-entry-mode-v17]').forEach(function(button){button.classList.toggle('active',button.dataset.entryModeV17===current);});}
  function updateTotals(){var rows=[...modal.querySelectorAll('.exam-subject-card-v10')].map(function(card){return{raw:card.querySelector('.raw-v16')?.value,actual:card.querySelector('.actual-v16')?.value,excludeFromTotal:!!card.querySelector('.exclude-total-check-v17')?.checked};});var rawEl=modal.querySelector('#rawTotalV16'),finalEl=modal.querySelector('#finalTotalV16');if(rawEl)rawEl.textContent=formatScore(rawTotalFromRowsV13(rows));if(finalEl)finalEl.textContent=formatScore(finalTotalFromRowsV13(rows));}
  decorate();updateMode();updateTotals();modal.querySelectorAll('[data-entry-mode-v17]').forEach(function(button){button.onclick=function(){snapshotCustom();modal.dataset.rankEntryModeV17=button.dataset.entryModeV17;updateMode();};});modal.addEventListener('input',function(){snapshotCustom();setTimeout(updateTotals,0);});modal.addEventListener('change',function(){snapshotCustom();setTimeout(updateTotals,0);});modal.addEventListener('click',function(event){if(event.target.closest('#addExamSubjectV16,.remove-exam-subject-v10'))snapshotCustom();},true);var observer=new MutationObserver(function(){decorate();updateMode();updateTotals();});var list=modal.querySelector('#examSubjectsV16');if(list)observer.observe(list,{childList:true,subtree:true});
};

var validateExamBeforeV17=validateExam;
validateExam=function validateExamV17(exam){var base=validateExamBeforeV17(exam);if(base)return base;function check(v,label){if(v===null||v===undefined||v==='')return'';var n=Number(v);return Number.isFinite(n)&&n>=0&&n<=100?'':label+'请输入 0～100';}var e=check(exam.total_year_position_percent,'年级位比');if(e)return e;e=check(exam.total_class_position_percent,'班级位比');if(e)return e;for(var entry of Object.entries(exam.scores||{})){var name=entry[0],row=entry[1]||{};e=check(row.yearPositionPercent,name+'年级位比');if(e)return e;e=check(row.classPositionPercent,name+'班级位比');if(e)return e;}return'';};

saveExam=async function saveExamV17(id,modal){var button=modal.querySelector('.save-btn'),mode=modal.dataset.rankEntryModeV17||'rank';var exam={id:id,name:modal.querySelector('#examName').value.trim(),exam_date:modal.querySelector('#examDate').value,grade_level:modal.querySelector('#gradeLevelV14')?.value||'',total_rank:mode==='rank'?(modal.querySelector('#totalRankV16')?.value||''):'',total_participants:mode==='rank'?(modal.querySelector('#totalParticipantsV16')?.value||''):'',total_class_rank:mode==='rank'?(modal.querySelector('#totalClassRankV16')?.value||''):'',total_class_participants:mode==='rank'?(modal.querySelector('#totalClassParticipantsV16')?.value||''):'',total_year_position_percent:mode==='percent'?(modal.querySelector('.total-year-position-v17')?.value||''):'',total_class_position_percent:mode==='percent'?(modal.querySelector('.total-class-position-v17')?.value||''):'',is_hidden:modal.querySelector('#examHiddenV16')?.value==='1',scores:{}};var seen=new Set();for(var card of modal.querySelectorAll('.exam-subject-card-v10')){var name=card.querySelector('.exam-subject-name-v10').value.trim();if(!name)return toast('请填写科目名称，或删除空白科目');if(seen.has(name))return toast(`科目「${name}」重复了`);seen.add(name);exam.scores[name]={target:card.querySelector('.target-v16')?.value||'',raw:card.querySelector('.raw-v16')?.value||'',actual:card.querySelector('.actual-v16')?.value||'',rawMax:card.querySelector('.rawmax-v16')?.value||'',max:card.querySelector('.max-v16')?.value||'',rank:mode==='rank'?(card.querySelector('.year-rank-v16')?.value||''):'',participants:mode==='rank'?(card.querySelector('.year-participants-v16')?.value||''):'',classRank:mode==='rank'?(card.querySelector('.class-rank-v16')?.value||''):'',classParticipants:mode==='rank'?(card.querySelector('.class-participants-v16')?.value||''):'',yearPositionPercent:mode==='percent'?(card.querySelector('.year-position-v17')?.value||''):'',classPositionPercent:mode==='percent'?(card.querySelector('.class-position-v17')?.value||''):'',excludeFromTotal:!!card.querySelector('.exclude-total-check-v17')?.checked};}if(!exam.name||!exam.exam_date)return toast('请填写考试名称和日期');var error=validateExam(exam);if(error)return toast(error);button.disabled=true;button.textContent='保存中…';try{await dataApiV7('save_exam',{exam:exam});await loadExams();modal.remove();state.modal=null;render();toast(id?'已保存修改':'考试已记录');}catch(e){toast(e.message);button.disabled=false;button.textContent=id?'保存修改':'保存考试';}};

recordHtml=function recordHtmlV17(exam){var subjects=Object.keys(exam.scores||{}),finalTotal=totalFor(exam,'actual'),rawTotal=totalRawForV13(exam);var tags=subjects.map(function(subject){var row=exam.scores[subject]||{},a=num(row.actual),raw=num(row.raw),t=num(row.target),year=rankInfoByScopeV16(exam,subject,'year'),cls=rankInfoByScopeV16(exam,subject,'class');if(a===null&&raw===null&&t===null&&year.rank===null&&year.positionPercent===null&&cls.rank===null&&cls.positionPercent===null)return'';var rankText='';if(year.directPercent)rankText+=` · 年位比 前${formatPercent(year.positionPercent)}`;else if(year.rank!==null)rankText+=` · 年排 ${year.rank}${year.participants?`/${year.participants}`:''}`;if(cls.directPercent)rankText+=` · 班位比 前${formatPercent(cls.positionPercent)}`;else if(cls.rank!==null)rankText+=` · 班排 ${cls.rank}${cls.participants?`/${cls.participants}`:''}`;return `<span class="score-tag">${escapeHtml(subject)}${row.excludeFromTotal?'<span class="stat-badge-v17">统计项</span>':''} ${a===null?'—':formatScore(a)}${raw!==null?`<span class="raw-final-inline-v13"> · 原始 <b>${formatScore(raw)}</b></span>`:''}<span style="color:#a1a9b5"> / 目标 ${t===null?'—':formatScore(t)}</span>${rankText?`<span style="color:#667085">${rankText}</span>`:''}</span>`;}).join('');var year=rankInfoByScopeV16(exam,'总分','year'),cls=rankInfoByScopeV16(exam,'总分','class'),badges='';if(year.directPercent)badges+=`<span class="score-tag"><b>年位比 前${formatPercent(year.positionPercent)}</b></span>`;else if(year.rank!==null)badges+=`<span class="score-tag"><b>年排 ${year.rank}${year.participants?` / ${year.participants}`:''}</b></span>`;if(cls.directPercent)badges+=`<span class="score-tag"><b>班位比 前${formatPercent(cls.positionPercent)}</b></span>`;else if(cls.rank!==null)badges+=`<span class="score-tag"><b>班排 ${cls.rank}${cls.participants?` / ${cls.participants}`:''}</b></span>`;return `<div class="record ${exam.is_hidden?'hidden-record-v10':''}"><div class="record-date">${fmtYearDate(exam.exam_date)}<b>${escapeHtml(exam.name)}<span class="grade-badge-v13">${escapeHtml(exam.grade_level||'未分类')}</span>${exam.is_hidden?'<span class="hidden-badge-v10">已隐藏</span>':''}</b></div><div class="record-scores">${tags||'<span class="score-tag">尚未填写分数或排名</span>'}<span class="score-tag"><b>赋分总分 ${finalTotal===null?'—':formatScore(finalTotal)}</b>${rawTotal!==null?` · 原始总分 ${formatScore(rawTotal)}`:''}</span>${badges}</div><div class="record-actions record-actions-v10"><button class="record-action-btn-v10" data-edit="${exam.id}">编辑</button><button class="record-action-btn-v10" data-hidden-toggle="${exam.id}">${exam.is_hidden?'恢复显示':'隐藏'}</button><button class="record-action-btn-v10 danger" data-delete="${exam.id}">删除</button></div></div>`;};

recordsHtml=function recordsHtmlV17(){var exams=state.allExams||[],hidden=exams.filter(function(e){return e.is_hidden;}).length,order=categoryOptionsV14();function recentFirst(a,b){var d=String(b.exam_date||'').localeCompare(String(a.exam_date||''));if(d)return d;return String(b.created_at||'').localeCompare(String(a.created_at||''));}var groups=[...order.map(function(v){return{name:v,exams:exams.filter(function(e){return e.grade_level===v;}).sort(recentFirst)};}),{name:'未分类',exams:exams.filter(function(e){return !e.grade_level;}).sort(recentFirst)}].filter(function(g){return g.exams.length;});return `<div class="page-head"><div><h2>考试记录</h2><p>按${escapeHtml(categoryLabelV14())}分组，每组按考试时间从近到远。${hidden?` ${hidden} 次已隐藏。`:''}</p></div><button class="primary" id="addExam">＋ 新建</button></div>${groups.length?groups.map(function(g){return `<section class="grade-section-v13"><div class="grade-section-head-v13"><h3>${escapeHtml(g.name)}</h3><span>${g.exams.length} 次</span></div><div class="card records-card">${g.exams.map(recordHtml).join('')}</div></section>`;}).join(''):`<div class="card records-card"><div class="empty-chart" style="height:260px"><div>还没有考试记录<br><button class="secondary" id="emptyAdd" style="margin-top:14px">记录第一场考试</button></div></div></div>`}`;};

var bindPageBeforeV17=bindPage;
bindPage=function bindPageV17(){bindPageBeforeV17();document.querySelectorAll('[data-trend-scope-v16]').forEach(function(button){button.onclick=function(){var scope=button.dataset.trendScopeV16;if(scope==='score'){state.trendMetric='score';}else{state.rankScopeV16=scope;if(hasDirectPercentV17(scope)&&!hasRawRankV17(scope))state.trendMetric='rank';else if(state.trendMetric!=='rank_raw'&&state.trendMetric!=='rank')state.trendMetric='rank_raw';}render();};});document.querySelectorAll('[data-radar-scope-v16]').forEach(function(button){button.onclick=function(){var scope=button.dataset.radarScopeV16;state.rankScopeV16=scope;if(hasDirectPercentV17(scope)&&!hasRawRankV17(scope))state.radarMode='rank';else if(state.radarMode!=='rank_raw'&&state.radarMode!=='rank')state.radarMode='rank_raw';state.radarSelection=[];ensureRadarSelection();render();};});};
;
/* ===== app-v18.js ===== */
// v18 / product v1.1: score modules, subtle Study Planner cross-link, optional ranking stays optional.
state.modulesV18 = state.modulesV18 || [];

var MODULE_API_V18='https://kdwpmcdxapwecbfrvqtm.supabase.co/functions/v1/score-tracker-modules-api';
var STUDY_PLANNER_URL_V18='https://study-planner.yhwlwl.xyz/?utm_source=score-tracker&utm_campaign=tool-crosslink';
var STUDY_PLANNER_PROMO_V18='./study-planner-promo.webp';

(function injectV18Styles(){
  if(document.getElementById('app-v18-style'))return;
  var style=document.createElement('style');style.id='app-v18-style';style.textContent=`
    .module-settings-v18{margin-top:18px;padding:22px}
    .module-settings-head-v18{display:flex;justify-content:space-between;align-items:flex-start;gap:12px}
    .module-chips-v18{display:flex;gap:8px;flex-wrap:wrap;margin-top:13px}
    .module-chip-v18{display:inline-flex;align-items:center;gap:6px;border:1px solid var(--line);background:#f7f8fb;border-radius:999px;padding:7px 10px;font-size:11px;color:#596474}
    .module-chip-v18 b{color:var(--text)}
    .module-badge-v18{font-size:9px;border:1px solid #d9e3f3;background:#f4f7fb;color:#6b7890;border-radius:999px;padding:2px 6px}
    .module-manager-list-v18{display:grid;gap:12px;margin-top:12px}
    .module-editor-v18{border:1px solid var(--line);border-radius:16px;padding:13px;background:#fbfcfe}
    .module-editor-head-v18{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;align-items:center}
    .module-editor-head-v18 input{width:100%;border:1px solid var(--line);border-radius:11px;padding:10px 11px;background:#fff;outline:none;font-weight:700}
    .module-editor-head-v18 input[readonly]{background:#f5f7fa;color:#4d596b}
    .module-delete-v18{border:1px solid #f0d9dc;background:#fff;color:var(--danger);border-radius:10px;padding:8px 10px}
    .module-subjects-v18{display:flex;gap:7px;flex-wrap:wrap;margin-top:10px}
    .module-subject-v18{border:1px solid var(--line);background:#fff;color:#667085;border-radius:999px;padding:7px 9px;font-size:11px}
    .module-subject-v18.active{background:var(--text);border-color:var(--text);color:#fff}
    .module-subject-v18.locked{background:#eef1f5;color:#5c6675;border-color:#dfe4eb;cursor:default}
    .module-editor-note-v18{font-size:10px;color:var(--muted);line-height:1.55;margin-top:8px}
    .module-manager-actions-v18{display:flex;justify-content:space-between;gap:10px;align-items:center;margin-top:14px;flex-wrap:wrap}
    .record-module-summary-v18{display:flex;gap:6px;flex-wrap:wrap;margin-top:9px}
    .record-module-summary-v18 .module-chip-v18{background:#fbfcff}
    .study-tool-v18{display:grid;grid-template-columns:minmax(0,1fr) 180px;gap:16px;align-items:stretch;text-decoration:none;color:inherit;border:1px solid var(--line);border-radius:20px;background:linear-gradient(135deg,#fbfcff,#f7f9fc);padding:16px;margin:0 0 18px;overflow:hidden;transition:transform .16s ease,border-color .16s ease,box-shadow .16s ease}
    .study-tool-v18:hover{transform:translateY(-1px);border-color:#cfd7e6;box-shadow:0 10px 28px #25304a0d}
    .study-tool-copy-v18{display:flex;flex-direction:column;justify-content:center;min-width:0;padding:3px 2px}
    .study-tool-kicker-v18{font-size:10px;font-weight:800;letter-spacing:.08em;color:#7b8798;text-transform:uppercase}
    .study-tool-v18 h3{font-size:16px;margin:6px 0 5px;color:var(--text)}
    .study-tool-v18 p{font-size:12px;line-height:1.65;color:var(--muted);margin:0;max-width:520px}
    .study-tool-open-v18{margin-top:10px;font-size:11px;font-weight:700;color:#586781}
    .study-tool-thumb-v18{height:116px;border-radius:14px;overflow:hidden;border:1px solid #e5e9f0;background:#fff}
    .study-tool-thumb-v18 img{width:100%;height:100%;object-fit:cover;object-position:50% 18%;display:block;filter:saturate(.78) contrast(.96)}
    @media(max-width:620px){
      .module-settings-v18{padding:18px 16px}.module-settings-head-v18{display:block}.module-settings-head-v18 button{margin-top:10px}
      .study-tool-v18{grid-template-columns:minmax(0,1fr) 96px;gap:10px;padding:13px;border-radius:17px;margin-bottom:14px}
      .study-tool-v18 h3{font-size:14px}.study-tool-v18 p{font-size:11px;line-height:1.55}.study-tool-open-v18{margin-top:7px}
      .study-tool-thumb-v18{height:104px;border-radius:12px}
    }
  `;document.head.appendChild(style);
})();

async function modulesApiV18(action,payload={}){
  var res=await fetch(MODULE_API_V18,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:action,token:state.token,...payload})});
  var data=await res.json().catch(function(){return{error:'网络响应异常'}});
  if(!res.ok)throw new Error(data.error||'模块设置请求失败');
  return data;
}
async function loadModulesV18(){
  try{var data=await modulesApiV18('list_modules');state.modulesV18=data.modules||[];}
  catch(e){console.warn('module settings unavailable',e);state.modulesV18=state.modulesV18||[];}
}
function moduleNamesV18(){return new Set((state.modulesV18||[]).map(function(m){return m.name}));}
function moduleByNameV18(name){return(state.modulesV18||[]).find(function(m){return m.name===name})||null;}
function moduleSubjectOptionsV18(){
  var moduleNames=moduleNamesV18(),out=[],seen=new Set();
  function add(name){name=String(name||'').trim();if(!name||moduleNames.has(name)||seen.has(name))return;seen.add(name);out.push(name);}
  (state.subjectConfigs||[]).forEach(function(x){add(x.name)});
  (state.allExams||[]).forEach(function(exam){Object.keys(exam.scores||{}).forEach(add)});
  ['语文','数学','英语','物理','历史','化学','生物','政治','地理'].forEach(add);
  return out;
}
function appendModulesV18(){
  (state.modulesV18||[]).forEach(function(m){
    if(!m||!m.name)return;
    if(!SUBJECTS.includes(m.name))SUBJECTS.push(m.name);
    SUBJECT_SHORT[m.name]=m.name.length<=4?m.name:('模'+((state.modulesV18||[]).indexOf(m)+1));
  });
  if(!['总览','总分',...SUBJECTS].includes(state.subject))state.subject='总分';
}
if(typeof applyExamSubjectsV10==='function'){
  var applyExamSubjectsBeforeV18=applyExamSubjectsV10;
  applyExamSubjectsV10=function applyExamSubjectsV18(exams,templates){applyExamSubjectsBeforeV18(exams,templates);appendModulesV18();};
}
var loadExamsBeforeV18=loadExams;
loadExams=async function loadExamsV18(){await loadExamsBeforeV18();await loadModulesV18();if(typeof applyExamSubjectsV10==='function')applyExamSubjectsV10(state.exams||[],state.subjectConfigs||[]);else appendModulesV18();};

function moduleCompleteSumV18(exam,module,key,reader){
  if(!module||!Array.isArray(module.subjects)||module.subjects.length<2)return null;
  var sum=0;
  for(var i=0;i<module.subjects.length;i++){var v=reader(exam,module.subjects[i],key);if(v===null||v===undefined||Number.isNaN(Number(v)))return null;sum+=Number(v);}
  return Math.round(sum*100)/100;
}
var examScoreBeforeV18=examScore;
examScore=function examScoreV18(exam,subject,key){
  var direct=examScoreBeforeV18(exam,subject,key);if(direct!==null)return direct;
  var module=moduleByNameV18(subject);if(!module)return direct;
  return moduleCompleteSumV18(exam,module,key,function(e,s,k){return examScoreBeforeV18(e,s,k);});
};
var examMaxBeforeV18=examMax;
examMax=function examMaxV18(exam,subject){
  var module=moduleByNameV18(subject);if(!module)return examMaxBeforeV18(exam,subject);
  var explicit=num(exam?.scores?.[subject]?.max);if(explicit!==null)return explicit;
  var sum=0;for(var i=0;i<module.subjects.length;i++){var v=examMaxBeforeV18(exam,module.subjects[i]);if(v===null||!Number.isFinite(Number(v)))return null;sum+=Number(v);}return sum;
};
if(typeof examRawScoreV13==='function'){
  var examRawScoreBeforeV18=examRawScoreV13;
  examRawScoreV13=function examRawScoreV18(exam,subject){
    var direct=examRawScoreBeforeV18(exam,subject);if(direct!==null)return direct;
    var module=moduleByNameV18(subject);if(!module)return direct;
    return moduleCompleteSumV18(exam,module,'raw',function(e,s){return examRawScoreBeforeV18(e,s);});
  };
}
if(typeof rawMaxV14==='function'){
  var rawMaxBeforeV18=rawMaxV14;
  rawMaxV14=function rawMaxV18(exam,subject){
    var module=moduleByNameV18(subject);if(!module)return rawMaxBeforeV18(exam,subject);
    var explicit=num(exam?.scores?.[subject]?.rawMax);if(explicit!==null)return explicit;
    var sum=0;for(var i=0;i<module.subjects.length;i++){var v=rawMaxBeforeV18(exam,module.subjects[i]);if(v===null||!Number.isFinite(Number(v)))return null;sum+=Number(v);}return sum;
  };
}
if(typeof totalSubjectsV17==='function'){
  var totalSubjectsBeforeV18=totalSubjectsV17;
  totalSubjectsV17=function totalSubjectsV18(exam){var names=moduleNamesV18();return totalSubjectsBeforeV18(exam).filter(function(name){return !names.has(name)});};
}

function moduleCardHtmlV18(){
  if(!(state.modulesV18||[]).length)return'';
  return `<div class="card module-settings-v18"><div class="module-settings-head-v18"><div><h3 class="card-title">成绩模块</h3><p class="card-sub">自动汇总常用组合，不重复计入总分。内置语数外、四科和六科，也可以新增自己的模块。</p></div><button class="secondary" id="manageModulesV18">设置</button></div><div class="module-chips-v18">${state.modulesV18.map(function(m){return `<span class="module-chip-v18"><b>${escapeHtml(m.name)}</b>${m.isBuiltin?'<span class="module-badge-v18">内置</span>':''} · ${(m.subjects||[]).map(escapeHtml).join(' / ')}</span>`}).join('')}</div></div>`;
}
var accountHtmlBeforeV18=accountHtml;
accountHtml=function accountHtmlV18(){return accountHtmlBeforeV18()+moduleCardHtmlV18();};

function normalizeBuiltinV18(module){
  var core=['语文','数学','英语'],subjects=[...(module.subjects||[])],extras=subjects.filter(function(s){return !core.includes(s)});
  if(module.name==='语数外')return core;
  if(module.name==='语数外 + 物理/历史（四科）')return core.concat(extras.slice(0,1));
  if(module.name==='语数外 + 所选科（六科）')return core.concat(extras.slice(0,3));
  return subjects;
}
function openModuleManagerV18(){
  var options=moduleSubjectOptionsV18(),draft=(state.modulesV18||[]).map(function(m){return{id:m.id,name:m.name,subjects:[...(m.subjects||[])],isBuiltin:!!m.isBuiltin}});
  var modal=document.createElement('div');modal.className='modal-backdrop';modal.innerHTML=`<div class="modal"><div class="modal-head"><h3>成绩模块设置</h3><button class="close-btn">×</button></div><div class="modal-body"><p class="form-note">模块只做汇总展示，不会再次加入总分。内置四科请选择物理或历史之一；六科请选择 3 门选科。</p><div class="module-manager-list-v18" id="moduleListV18"></div><div class="module-manager-actions-v18"><button class="secondary" id="addModuleV18">＋ 自定义模块</button><div><button class="secondary cancel-btn">取消</button> <button class="primary" id="saveModulesV18">保存</button></div></div></div></div>`;document.body.appendChild(modal);state.modal=modal;
  var list=document.getElementById('moduleListV18');
  function syncNames(){list.querySelectorAll('.module-editor-v18').forEach(function(card,i){var input=card.querySelector('.module-name-v18');if(input&&!draft[i].isBuiltin)draft[i].name=input.value.trim();});}
  function toggleSubject(index,name){
    var m=draft[index],core=['语文','数学','英语'];
    if(m.isBuiltin&&core.includes(name))return;
    var has=m.subjects.includes(name);
    if(m.name==='语数外')return;
    if(m.name==='语数外 + 物理/历史（四科）'){
      if(!core.includes(name)&&!['物理','历史'].includes(name))return toast('四科模块只能选择物理或历史');
      if(has)m.subjects=core.slice();else m.subjects=core.concat([name]);
    }else if(m.name==='语数外 + 所选科（六科）'){
      var extras=m.subjects.filter(function(s){return !core.includes(s)});
      if(has)extras=extras.filter(function(s){return s!==name});else{if(extras.length>=3)return toast('六科模块最多选择 3 门选科');extras.push(name);}m.subjects=core.concat(extras);
    }else{if(has)m.subjects=m.subjects.filter(function(s){return s!==name});else m.subjects.push(name);}
    renderRows();
  }
  function renderRows(){
    list.innerHTML=draft.map(function(m,i){m.subjects=normalizeBuiltinV18(m);var note=m.name==='语数外'?'固定汇总语文、数学、英语。':m.name==='语数外 + 物理/历史（四科）'?'语数外 + 物理/历史，四科。':m.name==='语数外 + 所选科（六科）'?'语数外 + 3 门选科，六科。':'至少选择 2 个科目。';return `<div class="module-editor-v18" data-module-index="${i}"><div class="module-editor-head-v18"><input class="module-name-v18" maxlength="30" value="${escapeHtml(m.name||'')}" ${m.isBuiltin?'readonly':''} placeholder="模块名称">${m.isBuiltin?'<span class="module-badge-v18">内置</span>':`<button type="button" class="module-delete-v18">删除</button>`}</div><div class="module-subjects-v18">${options.map(function(name){if(m.name==='语数外 + 物理/历史（四科）'&&!['语文','数学','英语','物理','历史'].includes(name))return '';var active=m.subjects.includes(name),locked=m.isBuiltin&&['语文','数学','英语'].includes(name);return `<button type="button" class="module-subject-v18 ${active?'active':''} ${locked?'locked':''}" data-module-subject="${escapeHtml(name)}">${escapeHtml(name)}</button>`}).join('')}</div><div class="module-editor-note-v18">${note}</div></div>`}).join('');
    list.querySelectorAll('.module-editor-v18').forEach(function(card,index){
      card.querySelectorAll('[data-module-subject]').forEach(function(button){button.onclick=function(){syncNames();toggleSubject(index,button.dataset.moduleSubject)}});
      var del=card.querySelector('.module-delete-v18');if(del)del.onclick=function(){syncNames();draft.splice(index,1);renderRows();};
    });
  }
  renderRows();
  function close(){modal.remove();state.modal=null;}
  modal.querySelector('.close-btn').onclick=close;modal.querySelector('.cancel-btn').onclick=close;modal.onclick=function(e){if(e.target===modal)close()};
  document.getElementById('addModuleV18').onclick=function(){syncNames();if(draft.length>=12)return toast('最多 12 个模块');draft.push({id:null,name:'',subjects:[],isBuiltin:false});renderRows();list.querySelector('.module-editor-v18:last-child .module-name-v18')?.focus();};
  document.getElementById('saveModulesV18').onclick=async function(){
    syncNames();var names=new Set();
    for(var i=0;i<draft.length;i++){var m=draft[i];m.subjects=normalizeBuiltinV18(m);if(!m.name)return toast('请填写模块名称');if(names.has(m.name))return toast('模块名称不能重复');names.add(m.name);if(m.name==='语数外'&&m.subjects.length!==3)return toast('语数外模块应为 3 科');if(m.name==='语数外 + 物理/历史（四科）'&&m.subjects.length!==4)return toast('四科模块请选择物理或历史之一');if(m.name==='语数外 + 所选科（六科）'&&m.subjects.length!==6)return toast('六科模块请选择 3 门选科');if(!m.isBuiltin&&m.subjects.length<2)return toast(`模块「${m.name}」至少选择 2 个科目`);}
    var button=document.getElementById('saveModulesV18');button.disabled=true;button.textContent='保存中…';
    try{var data=await modulesApiV18('save_modules',{modules:draft});state.modulesV18=data.modules||[];if(typeof applyExamSubjectsV10==='function')applyExamSubjectsV10(state.exams||[],state.subjectConfigs||[]);close();render();toast('模块设置已保存');}
    catch(e){toast(e.message);button.disabled=false;button.textContent='保存';}
  };
}

function moduleSummaryV18(exam){
  var items=(state.modulesV18||[]).map(function(m){
    var final=examScore(exam,m.name,'actual'),raw=typeof examRawScoreV13==='function'?examRawScoreV13(exam,m.name):null,target=examScore(exam,m.name,'target');
    if(final===null&&raw===null&&target===null)return'';
    var max=examMax(exam,m.name),parts=[];if(final!==null)parts.push(formatScore(final)+(max?`/${formatScore(max)}`:''));if(raw!==null&&raw!==final)parts.push('原始 '+formatScore(raw));if(target!==null)parts.push('目标 '+formatScore(target));
    return `<span class="module-chip-v18"><b>${escapeHtml(m.name)}</b> ${parts.join(' · ')}</span>`;
  }).filter(Boolean);
  return items.length?`<div class="record-module-summary-v18">${items.join('')}</div>`:'';
}
var recordHtmlBeforeV18=recordHtml;
recordHtml=function recordHtmlV18(exam){var html=recordHtmlBeforeV18(exam),summary=moduleSummaryV18(exam);return summary?html.replace('<div class="record-actions record-actions-v10">',summary+'<div class="record-actions record-actions-v10">'):html;};

function studyPlannerCardV18(){
  return `<a class="study-tool-v18" id="studyPlannerToolV18" href="${STUDY_PLANNER_URL_V18}" target="_blank" rel="noopener noreferrer"><div class="study-tool-copy-v18"><span class="study-tool-kicker-v18">另一个学习工具</span><h3>Study Planner · 自动学习规划</h3><p>把目标、任务和可用时间交给它，自动排进日历。适合和成绩轨迹一起用：这里看结果，那里安排下一步。</p><span class="study-tool-open-v18">打开学习规划器 ↗</span></div><div class="study-tool-thumb-v18"><img src="${STUDY_PLANNER_PROMO_V18}" alt="Study Planner 月视图"></div></a>`;
}
var homeHtmlBeforeV18=homeHtml;
homeHtml=function homeHtmlV18(){
  var html=homeHtmlBeforeV18(),card=studyPlannerCardV18();
  if(html.includes('<section class="grid-main">'))return html.replace('<section class="grid-main">',card+'<section class="grid-main">');
  return card+html;
};

function uuidV18(){try{return crypto.randomUUID()}catch(e){return 'v18-'+Date.now()+'-'+Math.random().toString(16).slice(2)}}
function trackStudyPlannerV18(){
  var context={eventId:uuidV18(),sessionId:sessionStorage.getItem('st_session_id')||'',visitorId:localStorage.getItem('st_visitor_id')||'',clientTime:new Date().toISOString(),pathname:location.pathname,appPage:'home',referrerOrigin:document.referrer||'',firstReferrer:localStorage.getItem('st_first_referrer')||'',utmSource:localStorage.getItem('st_utm_source')||'',utmCampaign:localStorage.getItem('st_utm_campaign')||'',userAgent:navigator.userAgent,browserLanguage:navigator.language,clientTimezone:(Intl.DateTimeFormat().resolvedOptions().timeZone||''),screenWidth:screen.width,screenHeight:screen.height,viewportWidth:innerWidth,viewportHeight:innerHeight,isPwa:matchMedia('(display-mode: standalone)').matches||navigator.standalone===true,appVersion:'v1.1'};
  fetch('https://kdwpmcdxapwecbfrvqtm.supabase.co/functions/v1/score-tracker-api',{method:'POST',headers:{'Content-Type':'application/json'},keepalive:true,body:JSON.stringify({action:'track_event',token:state.token||'',eventType:'study_planner_opened',context:context,metadata:{source:'home_tool_card',destination:'https://study-planner.yhwlwl.xyz/'}})}).catch(function(){});
}
var bindPageBeforeV18=bindPage;
bindPage=function bindPageV18(){
  bindPageBeforeV18();
  var manage=document.getElementById('manageModulesV18');if(manage)manage.onclick=openModuleManagerV18;
  var tool=document.getElementById('studyPlannerToolV18');if(tool)tool.addEventListener('click',trackStudyPlannerV18,{capture:true});
};
;
/* ===== app-v19.js ===== */
// v19 / product v1.1: readable long trends + username rename while preserving original account name.
state.originalUsernameV19 = state.originalUsernameV19 || '';

var USERNAME_API_V19='https://kdwpmcdxapwecbfrvqtm.supabase.co/functions/v1/score-tracker-username-api';

(function injectV19Styles(){
  if(document.getElementById('app-v19-style'))return;
  var style=document.createElement('style');
  style.id='app-v19-style';
  style.textContent=`
    .trend-scroll-v19{overflow-x:auto!important;overflow-y:hidden!important;-webkit-overflow-scrolling:touch;scrollbar-width:none;overscroll-behavior-x:contain;touch-action:pan-x pan-y}
    .trend-scroll-v19::-webkit-scrollbar{display:none}
    .trend-scroll-v19 svg{max-width:none!important;display:block}
    .trend-scroll-hint-v19{display:none;font-size:10px;color:var(--muted);margin-top:6px;text-align:right}
    .username-origin-v19{font-size:11px;color:var(--muted);line-height:1.55;margin-top:8px}
    .username-origin-v19 code{color:#596474}
    .account-chip-v19{justify-content:flex-start!important;flex-wrap:wrap}
    .account-chip-v19 code{margin-right:auto}
    .rename-username-v19{border:1px solid var(--line);background:#fff;color:var(--muted);padding:7px 9px;border-radius:9px;font-size:11px;flex:0 0 auto}
    .username-modal-note-v19{font-size:11px;line-height:1.65;color:var(--muted);margin-top:10px}
    @media(max-width:620px){
      .trend-scroll-hint-v19{display:block}
      .tooltip-card{max-width:calc(100vw - 28px);overflow:hidden;text-overflow:ellipsis}
    }
  `;
  document.head.appendChild(style);
})();

async function usernameApiV19(action,payload){
  var response=await fetch(USERNAME_API_V19,{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify(Object.assign({action:action,token:state.token},payload||{}))
  });
  var data=await response.json().catch(function(){return{error:'网络响应异常'};});
  if(!response.ok)throw new Error(data.error||'用户名请求失败');
  return data;
}

function connectBrokenTrendPathsV19(stage){
  stage.querySelectorAll('svg path[fill="none"]').forEach(function(path){
    var d=path.getAttribute('d')||'';
    var seen=false;
    var next=d.replace(/\bM\b/g,function(){if(!seen){seen=true;return'M';}return'L';});
    if(next!==d)path.setAttribute('d',next);
  });
}

function enhanceTrendStageV19(stage){
  if(!stage||stage.dataset.v19Enhanced==='1')return;
  var svg=stage.querySelector('svg');
  if(!svg)return;
  stage.dataset.v19Enhanced='1';
  stage.classList.add('trend-scroll-v19');
  connectBrokenTrendPathsV19(stage);
  var examCount=Math.max(1,(state.exams||[]).length);
  var viewport=Math.max(280,stage.clientWidth||0);
  var desired=examCount>5?Math.max(viewport,110+examCount*72):viewport;
  svg.style.width=desired+'px';
  svg.style.minWidth=desired+'px';
  if(desired>viewport+4){
    var hint=document.createElement('div');
    hint.className='trend-scroll-hint-v19';
    hint.textContent='← 左右滑动查看全部考试 →';
    stage.insertAdjacentElement('afterend',hint);
    requestAnimationFrame(function(){stage.scrollLeft=Math.max(0,stage.scrollWidth-stage.clientWidth);});
  }
}

function enhanceTrendChartsV19(){
  var candidates=[];
  document.querySelectorAll('#chart,#overviewChart,.rank-chart-stage-v7').forEach(function(stage){
    if(stage.id==='chart'&&stage.querySelector('.rank-chart-stage-v7'))return;
    if(candidates.indexOf(stage)<0)candidates.push(stage);
  });
  candidates.forEach(enhanceTrendStageV19);
}

function clampTrendTooltipV19(point){
  var stage=point&&point.closest&&point.closest('#chart,#overviewChart,.rank-chart-stage-v7');
  if(!stage)return;
  var tip=stage.querySelector('.tooltip-card')||document.getElementById('chartTip')||document.getElementById('overviewChartTip');
  if(!tip||tip.style.display==='none')return;
  var sr=stage.getBoundingClientRect(),pr=point.getBoundingClientRect();
  tip.style.left=(pr.left-sr.left+stage.scrollLeft+pr.width/2)+'px';
  tip.style.top=(pr.top-sr.top+stage.scrollTop)+'px';
  var tr=tip.getBoundingClientRect();
  var minLeft=Math.max(8,sr.left+6),maxRight=Math.min(window.innerWidth-8,sr.right-6);
  var current=parseFloat(tip.style.left)||0;
  if(tr.left<minLeft)current+=minLeft-tr.left;
  if(tr.right>maxRight)current-=tr.right-maxRight;
  tip.style.left=current+'px';
}

document.addEventListener('click',function(event){
  var point=event.target&&event.target.closest&&event.target.closest('[data-tip]');
  if(point)setTimeout(function(){clampTrendTooltipV19(point);},0);
},false);
document.addEventListener('pointerover',function(event){
  var point=event.target&&event.target.closest&&event.target.closest('[data-tip]');
  if(point)setTimeout(function(){clampTrendTooltipV19(point);},0);
},false);

function usernameAccountPatchV19(html){
  var original=escapeHtml(state.originalUsernameV19||state.user?.username||'');
  return html.replace(/<div class="account-chip">([\s\S]*?)<\/div>/,function(match,inside){
    return `<div class="account-chip account-chip-v19">${inside}<button class="rename-username-v19" id="renameUsernameV19">修改</button></div><div class="username-origin-v19" id="usernameOriginV19">初始账号：<code>${original}</code> · 修改用户名不会改变原账号身份。</div>`;
  });
}

var accountHtmlBeforeV19=accountHtml;
accountHtml=function accountHtmlV19(){return usernameAccountPatchV19(accountHtmlBeforeV19());};

function openUsernameModalV19(){
  var modal=document.createElement('div');
  modal.className='modal-backdrop';
  modal.innerHTML=`<div class="modal"><div class="modal-head"><h3>修改用户名</h3><button class="close-btn">×</button></div><div class="modal-body"><div class="field"><label>新用户名</label><input id="usernameInputV19" maxlength="24" autocomplete="username" value="${escapeHtml(state.user?.username||'')}" placeholder="2～24 位中文、字母或数字"></div><div class="username-modal-note-v19">保存时会自动查重。初始账号会作为内部账号标识保留，不会因为改名而丢失成绩或反馈记录。</div><div class="modal-actions"><button class="secondary cancel-btn">取消</button><button class="primary" id="saveUsernameV19">保存用户名</button></div></div></div>`;
  document.body.appendChild(modal);state.modal=modal;
  var close=function(){modal.remove();if(state.modal===modal)state.modal=null;};
  modal.querySelector('.close-btn').onclick=close;modal.querySelector('.cancel-btn').onclick=close;
  modal.onclick=function(e){if(e.target===modal)close();};
  var input=modal.querySelector('#usernameInputV19');input.focus();input.select();
  modal.querySelector('#saveUsernameV19').onclick=async function(){
    var button=this,next=String(input.value||'').trim();
    if(!/^[\p{L}\p{N}_-]{2,24}$/u.test(next))return toast('用户名请使用 2～24 位中文、字母、数字、横线或下划线');
    button.disabled=true;button.textContent='检查并保存…';
    try{
      var data=await usernameApiV19('rename',{username:next});
      state.user=Object.assign({},state.user,{username:data.user.username});
      state.originalUsernameV19=data.user.originalUsername||state.originalUsernameV19||data.user.username;
      close();render();toast('用户名已修改');
    }catch(e){toast(e&&e.message?e.message:'用户名修改失败');}
    finally{if(button.isConnected){button.disabled=false;button.textContent='保存用户名';}}
  };
}

async function refreshUsernameIdentityV19(){
  if(state.page!=='account'||!state.token)return;
  try{
    var data=await usernameApiV19('get');
    state.originalUsernameV19=data.user.originalUsername||data.user.username;
    if(state.user&&data.user.username)state.user.username=data.user.username;
    var note=document.getElementById('usernameOriginV19');
    if(note)note.innerHTML='初始账号：<code>'+escapeHtml(state.originalUsernameV19)+'</code> · 修改用户名不会改变原账号身份。';
  }catch(e){console.warn('username identity unavailable',e);}
}

var bindPageBeforeV19=bindPage;
bindPage=function bindPageV19(){
  bindPageBeforeV19();
  enhanceTrendChartsV19();
  var rename=document.getElementById('renameUsernameV19');
  if(rename)rename.onclick=openUsernameModalV19;
  refreshUsernameIdentityV19();
};
;
/* ===== app-v20.js ===== */
// v20 / product v1.1: mobile record polish, compact radar controls, fair latest metric, collapsible groups, raw-only score fallback.
state.collapsedRecordGroupsV20 = state.collapsedRecordGroupsV20 || new Set();

(function injectV20Styles(){
  if(document.getElementById('app-v20-style')) return;
  var style=document.createElement('style');
  style.id='app-v20-style';
  style.textContent=`
    .record-group-toggle-v20{
      border:1px solid var(--line);background:#fff;color:#667085;border-radius:999px;
      padding:6px 10px;font-size:10px;line-height:1;white-space:nowrap
    }
    .grade-section-head-v13{display:flex;align-items:center;gap:8px}
    .grade-section-head-v13 h3{margin-right:auto}
    @media(max-width:620px){
      .records-card{padding:4px 14px!important;overflow:hidden}
      .record{
        width:100%;min-width:0;display:grid!important;
        grid-template-columns:1fr!important;
        grid-template-areas:"date" "actions" "scores"!important;
        gap:10px!important;align-items:start!important;padding:16px 0!important
      }
      .record-date{grid-area:date;min-width:0;line-height:1.45}
      .record-date b{max-width:100%;overflow-wrap:anywhere}
      .record-actions,.record-actions-v10{
        grid-area:actions;width:100%;max-width:none!important;min-width:0;
        display:flex!important;flex-direction:row!important;align-items:center!important;
        justify-content:flex-start!important;gap:7px!important
      }
      .record-action-btn-v10{width:auto!important;min-width:58px!important;padding:7px 10px!important}
      .record-scores{
        grid-area:scores;width:100%;min-width:0;display:flex!important;flex-wrap:wrap!important;
        align-items:flex-start;gap:7px!important
      }
      .record-scores .score-tag{
        flex:0 1 auto;max-width:100%;min-width:0;white-space:normal!important;
        overflow-wrap:anywhere;word-break:normal;line-height:1.45
      }

      .radar-toolbar>.toggle-row:first-child{
        width:100%;display:grid!important;
        grid-template-columns:repeat(5,minmax(0,1fr))!important;
        gap:5px!important;align-items:center
      }
      .radar-toolbar>.toggle-row:first-child>.label{grid-column:1/-1}
      .radar-toolbar>.toggle-row:first-child>.chip{
        width:100%!important;min-width:0!important;padding:7px 2px!important;
        font-size:10.5px!important;text-align:center
      }
      .record-group-toggle-v20{padding:6px 9px}
    }
    @media(max-width:420px){
      .records-card{padding-left:12px!important;padding-right:12px!important}
      .record-action-btn-v10{min-width:54px!important;padding:7px 9px!important}
      .radar-toolbar>.toggle-row:first-child{gap:4px!important}
      .radar-toolbar>.toggle-row:first-child>.chip{font-size:10px!important;padding:6px 1px!important}
    }
  `;
  document.head.appendChild(style);
})();

function effectiveScoreSubjectsV20(exam){
  var moduleNames=typeof moduleNamesV18==='function'?moduleNamesV18():new Set();
  return Object.entries(exam?.scores||{}).filter(function(entry){
    var name=entry[0],row=entry[1]||{};
    return !moduleNames.has(name)&&!row.excludeFromTotal&&examScore(exam,name,'actual')!==null;
  }).map(function(entry){return entry[0];});
}

function sortedVisibleExamsV20(){
  return [...(state.exams||[])].sort(function(a,b){
    var d=String(a.exam_date||'').localeCompare(String(b.exam_date||''));
    if(d)return d;
    return String(a.created_at||'').localeCompare(String(b.created_at||''));
  });
}

function sameSubjectSetV20(a,b){
  if(a.length!==b.length)return false;
  var aa=[...a].sort(),bb=[...b].sort();
  return aa.every(function(x,i){return x===bb[i];});
}

function latestMetricV20(){
  var exams=sortedVisibleExamsV20();
  for(var i=exams.length-1;i>=0;i--){
    var latest=exams[i],subjects=effectiveScoreSubjectsV20(latest);
    if(!subjects.length)continue;

    if(subjects.length===1){
      var subject=subjects[0],value=examScore(latest,subject,'actual');
      var previous=null;
      for(var j=i-1;j>=0;j--){
        var pv=examScore(exams[j],subject,'actual');
        if(pv!==null){previous={exam:exams[j],value:pv};break;}
      }
      return {
        label:'最近一次'+subject+'成绩',
        value:value,
        exam:latest,
        delta:previous?value-previous.value:null,
        deltaLabel:'较上次同科'
      };
    }

    var value=totalFor(latest,'actual');
    if(value===null)continue;
    var previous=null;
    for(var j=i-1;j>=0;j--){
      var prevSubjects=effectiveScoreSubjectsV20(exams[j]);
      if(!sameSubjectSetV20(subjects,prevSubjects))continue;
      var pv=totalFor(exams[j],'actual');
      if(pv!==null){previous={exam:exams[j],value:pv};break;}
    }
    return {
      label:'最近一次真实总分',
      value:value,
      exam:latest,
      delta:previous?value-previous.value:null,
      deltaLabel:'较上次'
    };
  }
  return null;
}

function patchLatestHeroV20(){
  if(state.page!=='home')return;
  var card=document.querySelector('.hero-stat');
  if(!card)return;
  var metric=latestMetricV20();
  if(!metric)return;
  var delta=metric.delta;
  card.innerHTML=`<div><div class="stat-label">${escapeHtml(metric.label)}</div><div class="stat-value">${formatScore(metric.value)}</div><div class="stat-sub">${escapeHtml(metric.exam.name)} · ${fmtDate(metric.exam.exam_date)}</div></div>${delta===null?'':`<span class="trend-pill">${delta>=0?'↗':'↘'} ${metric.deltaLabel} ${delta>=0?'+':''}${formatScore(delta)} 分</span>`}`;
}

function decorateRecordGroupCollapseV20(){
  if(state.page!=='records')return;
  document.querySelectorAll('.grade-section-v13').forEach(function(section){
    var head=section.querySelector('.grade-section-head-v13');
    var card=section.querySelector('.records-card');
    var title=head?.querySelector('h3');
    if(!head||!card||!title)return;
    var key=String(title.textContent||'').trim();
    var button=head.querySelector('.record-group-toggle-v20');
    if(!button){
      button=document.createElement('button');
      button.type='button';
      button.className='record-group-toggle-v20';
      head.appendChild(button);
    }
    function apply(){
      var collapsed=state.collapsedRecordGroupsV20.has(key);
      card.hidden=collapsed;
      button.textContent=collapsed?'展开':'收起';
      button.setAttribute('aria-expanded',collapsed?'false':'true');
    }
    button.onclick=function(){
      if(state.collapsedRecordGroupsV20.has(key))state.collapsedRecordGroupsV20.delete(key);
      else state.collapsedRecordGroupsV20.add(key);
      apply();
    };
    apply();
  });
}

var examScoreBeforeV20=examScore;
examScore=function examScoreV20(exam,subject,key){
  var value=examScoreBeforeV20(exam,subject,key);
  if(key==='actual'&&value===null){
    var raw=examScoreBeforeV20(exam,subject,'raw');
    if(raw!==null)return raw;
  }
  return value;
};

var saveExamBeforeV20=saveExam;
saveExam=async function saveExamV20(id,modal){
  modal.querySelectorAll('.exam-subject-card-v10').forEach(function(card){
    var raw=card.querySelector('.raw-v16');
    var actual=card.querySelector('.actual-v16');
    if(raw&&actual&&String(actual.value||'').trim()===''&&String(raw.value||'').trim()!==''){
      actual.value=raw.value;
    }
  });
  return saveExamBeforeV20(id,modal);
};

var recordHtmlBeforeV20=recordHtml;
recordHtml=function recordHtmlV20(exam){
  var clone=Object.assign({},exam,{scores:{}});
  var fallbackRawValues=[];
  Object.entries(exam?.scores||{}).forEach(function(entry){
    var name=entry[0],row=entry[1]||{},next=Object.assign({},row);
    if(num(next.actual)===null&&num(next.raw)!==null){
      next.actual=next.raw;
      fallbackRawValues.push(formatScore(next.raw));
    }
    clone.scores[name]=next;
  });
  var html=recordHtmlBeforeV20(clone);
  fallbackRawValues.forEach(function(value){
    html=html.replace(`<span class="raw-final-inline-v13"> · 原始 <b>${value}</b></span>`,'');
  });
  var finalTotal=totalFor(clone,'actual'),rawTotal=typeof totalRawForV13==='function'?totalRawForV13(clone):null;
  if(finalTotal!==null&&rawTotal!==null&&Math.abs(Number(finalTotal)-Number(rawTotal))<0.000001){
    html=html.replace(` · 原始总分 ${formatScore(rawTotal)}`,'');
  }
  return html;
};

var bindPageBeforeV20=bindPage;
bindPage=function bindPageV20(){
  bindPageBeforeV20();
  patchLatestHeroV20();
  decorateRecordGroupCollapseV20();
};
;
/* ===== app-v21.js ===== */
// v21 / product v1.1: separate subjects from score combinations and make combinations exam-specific.
(function injectV21Styles(){
  if(document.getElementById('app-v21-style'))return;
  var style=document.createElement('style');style.id='app-v21-style';style.textContent=`
    .subject-fixed-v21{display:flex;align-items:center;min-height:38px;padding:0 4px;font-size:14px;font-weight:800;color:var(--text)}
    .subject-history-v21{font-size:9px;border:1px solid var(--line);border-radius:999px;padding:2px 6px;color:var(--muted);margin-left:7px;font-weight:700}
    .subject-picker-v21,.combo-picker-v21{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:12px}
    .subject-picker-v21 select,.combo-picker-v21 select{width:auto;min-width:180px;border:1px solid var(--line);background:#fff;border-radius:11px;padding:9px 11px;color:#556070}
    .combo-section-v21{margin-top:18px}
    .combo-total-v21,.combo-card-v21{border:1px solid var(--line);border-radius:16px;background:#fafbfe;padding:13px;margin-top:10px}
    .combo-head-v21{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin-bottom:10px}
    .combo-head-v21 b{font-size:13px}.combo-head-v21 span{display:block;font-size:10px;color:var(--muted);margin-top:3px;line-height:1.5}
    .combo-remove-v21{border:1px solid #f0d9dc;background:#fff;color:var(--danger);border-radius:9px;padding:6px 9px;font-size:10px}
    .combo-list-v21{display:grid;gap:9px}.combo-card-v21{margin-top:0}
    .combo-score-v21{display:flex;gap:8px;flex-wrap:wrap}.combo-score-v21 span{font-size:11px;background:#fff;border:1px solid var(--line);border-radius:999px;padding:6px 9px;color:#657083}
    .combo-score-v21 b{color:var(--text)}
    .rank-entry-top-v21{margin:12px 0 4px;padding:10px 12px;border:1px solid var(--line);border-radius:14px;background:#f8f9fc}
    .rank-entry-top-v21 .rank-entry-mode-v17{margin:0}
    .exam-subject-head-v10 .exam-subject-name-v10{display:none!important}
    .exam-subject-card-v10 .exclude-total-v17{display:none!important}
    @media(max-width:620px){
      .subject-picker-v21 select,.combo-picker-v21 select{width:100%;min-width:0}
      .combo-total-v21,.combo-card-v21{padding:11px}.combo-head-v21{margin-bottom:8px}
      .rank-entry-top-v21{padding:9px 10px}
    }
  `;document.head.appendChild(style);
})();

function moduleIdSetV21(){return new Set((state.modulesV18||[]).map(function(m){return String(m.id)}));}
function moduleNameSetV21(){return new Set((state.modulesV18||[]).map(function(m){return m.name}));}
function cleanSubjectAxisV21(){
  var moduleNames=moduleNameSetV21(),out=[],seen=new Set();
  function add(name){name=String(name||'').trim();if(!name||moduleNames.has(name)||seen.has(name))return;seen.add(name);out.push(name);}
  (state.subjectConfigs||[]).forEach(function(x){add(x.name)});
  (state.allExams||[]).forEach(function(exam){Object.keys(exam.scores||{}).forEach(add)});
  SUBJECTS.splice(0,SUBJECTS.length,...out);
  if(!['总览','总分',...SUBJECTS].includes(state.subject))state.subject='总分';
}
var loadExamsBeforeV21=loadExams;
loadExams=async function loadExamsV21(){await loadExamsBeforeV21();cleanSubjectAxisV21();};

moduleSummaryV18=function moduleSummaryV21(exam){
  var selected=new Set((exam?.moduleIds||[]).map(String));
  if(!selected.size)return'';
  var items=(state.modulesV18||[]).filter(function(m){return selected.has(String(m.id));}).map(function(m){
    var final=examScore(exam,m.name,'actual'),raw=typeof examRawScoreV13==='function'?examRawScoreV13(exam,m.name):null,target=examScore(exam,m.name,'target'),max=examMax(exam,m.name),parts=[];
    if(final!==null)parts.push(formatScore(final)+(max?`/${formatScore(max)}`:''));
    if(raw!==null&&raw!==final)parts.push('原始 '+formatScore(raw));
    if(target!==null)parts.push('目标 '+formatScore(target));
    return parts.length?`<span class="module-chip-v18"><b>${escapeHtml(m.name)}</b> ${parts.join(' · ')}</span>`:'';
  }).filter(Boolean);
  return items.length?`<div class="record-module-summary-v18">${items.join('')}</div>`:'';
};

var accountHtmlBeforeV21=accountHtml;
accountHtml=function accountHtmlV21(){return accountHtmlBeforeV21().replace('成绩模块','组合设置').replace('自动汇总常用组合，不重复计入总分。内置语数外、四科和六科，也可以新增自己的模块。','先在这里定义常用组合；每次考试只显示你在“组合分”里主动添加的组合。');};
if(typeof openModuleManagerV18==='function'){
  var openModuleManagerBeforeV21=openModuleManagerV18;
  openModuleManagerV18=function openModuleManagerV21(){openModuleManagerBeforeV21();var modal=state.modal;if(!modal)return;var h=modal.querySelector('.modal-head h3');if(h)h.textContent='组合设置';var note=modal.querySelector('.form-note');if(note)note.textContent='这里只定义组合由哪些科目组成；不会自动出现在每场考试里。录成绩时可在“组合分”中按需添加。';var add=modal.querySelector('#addModuleV18');if(add)add.textContent='＋ 自定义组合';modal.querySelectorAll('.module-editor-note-v18').forEach(function(x){x.textContent=x.textContent.replaceAll('模块','组合')});};
}

function configuredSubjectsV21(){return (state.subjectConfigs||[]).map(function(x){return x.name}).filter(Boolean);}
function subjectDefaultV21(name){var x=(state.subjectConfigs||[]).find(function(s){return s.name===name});return Number(x?.defaultMax??defaultMax(name)??100);}
function cardNameV21(card){return card.querySelector('.exam-subject-name-v10')?.value.trim()||'';}
function selectedNamesV21(modal){return [...modal.querySelectorAll('.exam-subject-card-v10')].map(cardNameV21).filter(Boolean);}

function decorateExamV21(exam,modal){
  var list=modal.querySelector('#examSubjectsV16');if(!list||modal.dataset.v21Ready==='1')return;modal.dataset.v21Ready='1';
  var configured=new Set(configuredSubjectsV21());
  if(!exam){[...list.querySelectorAll('.exam-subject-card-v10')].forEach(function(card){var name=cardNameV21(card);if(name&&!configured.has(name))card.remove();});}
  var subjectHead=list.previousElementSibling;
  if(subjectHead?.classList.contains('section-head-v7')){var p=subjectHead.querySelector('p');if(p)p.textContent='科目统一在“账号 → 科目设置”维护；这里仅选择本次考试实际参加的科目。';}

  var entry=modal.querySelector('.rank-entry-mode-v17');
  var form=modal.querySelector('.form-grid');
  if(entry&&form){var box=document.createElement('div');box.className='rank-entry-top-v21';form.insertAdjacentElement('afterend',box);box.appendChild(entry);}

  var addOld=modal.querySelector('#addExamSubjectV16'),addOldFn=addOld?.onclick;
  if(addOld){addOld.style.display='none';var picker=document.createElement('div');picker.className='subject-picker-v21';picker.innerHTML='<select id="subjectPickerV21"><option value="">＋ 选择科目</option>'+configuredSubjectsV21().map(function(n){return `<option value="${escapeHtml(n)}">${escapeHtml(n)}</option>`}).join('')+'</select><span class="template-note-v10">新增科目请到账号设置。</span>';addOld.parentNode.insertBefore(picker,addOld);var select=picker.querySelector('select');select.onchange=function(){var name=this.value;if(!name)return;if(selectedNamesV21(modal).includes(name)){toast('本次考试已选择「'+name+'」');this.value='';return;}if(typeof addOldFn==='function')addOldFn.call(addOld);setTimeout(function(){var cards=modal.querySelectorAll('.exam-subject-card-v10'),card=cards[cards.length-1],input=card?.querySelector('.exam-subject-name-v10');if(input){input.value=name;var max=subjectDefaultV21(name),m=card.querySelector('.max-v16'),rm=card.querySelector('.rawmax-v16');if(m)m.value=max;if(rm)rm.value=max;input.dispatchEvent(new Event('input',{bubbles:true}));}decorateCards();select.value='';},0);};}

  function decorateCards(){modal.querySelectorAll('.exam-subject-card-v10').forEach(function(card){var input=card.querySelector('.exam-subject-name-v10');if(!input)return;var name=input.value.trim();var head=card.querySelector('.exam-subject-head-v10');var label=head?.querySelector('.subject-fixed-v21');if(!label&&head){label=document.createElement('div');label.className='subject-fixed-v21';head.insertBefore(label,input);}if(label)label.innerHTML=escapeHtml(name||'未选择')+(!configured.has(name)&&name?'<span class="subject-history-v21">历史项目</span>':'');input.readOnly=true;var ex=card.querySelector('.exclude-total-check-v17');if(ex&&configured.has(name))ex.checked=false;});}

  var totalRanks=modal.querySelector('.total-ranks-v16'),rankNote=modal.querySelector('.rank-compat-v16'),positionNote=modal.querySelector('.position-note-v17'),preview=modal.querySelector('.score-total-preview-v13');
  var rankHead=totalRanks?.previousElementSibling;
  while(rankHead&&(!rankHead.classList||!rankHead.classList.contains('section-head-v7')))rankHead=rankHead.previousElementSibling;
  if(rankHead){var h=rankHead.querySelector('h4'),p=rankHead.querySelector('p');if(h)h.textContent='组合分';if(p)p.textContent='总分自动汇总；下面可按需添加你在设置里定义的组合。';rankHead.classList.add('combo-section-v21');}
  if(totalRanks&&rankHead){var totalCard=document.createElement('div');totalCard.className='combo-total-v21';totalCard.innerHTML='<div class="combo-head-v21"><div><b>总分</b><span>自动汇总本次科目；排名/位比均可留空。</span></div></div>';rankHead.insertAdjacentElement('afterend',totalCard);if(preview)totalCard.appendChild(preview);totalCard.appendChild(totalRanks);if(positionNote)totalCard.appendChild(positionNote);if(rankNote)totalCard.appendChild(rankNote);
    var comboList=document.createElement('div');comboList.className='combo-list-v21';comboList.id='comboListV21';totalCard.insertAdjacentElement('afterend',comboList);
    var comboPicker=document.createElement('div');comboPicker.className='combo-picker-v21';comboPicker.innerHTML='<select id="comboPickerV21"><option value="">＋ 添加组合</option>'+ (state.modulesV18||[]).map(function(m){return `<option value="${escapeHtml(m.id)}">${escapeHtml(m.name)}</option>`}).join('') +'</select><span class="template-note-v10">组合内容在账号设置里维护。</span>';comboList.insertAdjacentElement('afterend',comboPicker);
    modal._moduleIdsV21=[...(exam?.moduleIds||[])].map(String).filter(function(id){return moduleIdSetV21().has(id)});
    function renderCombos(){comboList.innerHTML=modal._moduleIdsV21.map(function(id){var m=(state.modulesV18||[]).find(function(x){return String(x.id)===String(id)});if(!m)return'';return `<div class="combo-card-v21" data-combo-id="${escapeHtml(id)}"><div class="combo-head-v21"><div><b>${escapeHtml(m.name)}</b><span>${(m.subjects||[]).map(escapeHtml).join(' + ')}</span></div><button type="button" class="combo-remove-v21">移除</button></div><div class="combo-score-v21"><span>最终分 <b data-combo-final>—</b></span><span>原始分 <b data-combo-raw>—</b></span></div></div>`;}).join('');comboList.querySelectorAll('.combo-remove-v21').forEach(function(btn){btn.onclick=function(){var id=this.closest('[data-combo-id]').dataset.comboId;modal._moduleIdsV21=modal._moduleIdsV21.filter(function(x){return x!==id});renderCombos();};});updateComboScores();}
    function currentValue(name,klass){var card=[...modal.querySelectorAll('.exam-subject-card-v10')].find(function(c){return cardNameV21(c)===name});if(!card)return null;return num(card.querySelector(klass)?.value);}
    function comboSum(m,klass){var sum=0;for(var s of m.subjects||[]){var v=currentValue(s,klass);if(v===null)return null;sum+=v;}return sum;}
    function updateComboScores(){comboList.querySelectorAll('[data-combo-id]').forEach(function(card){var m=(state.modulesV18||[]).find(function(x){return String(x.id)===card.dataset.comboId});if(!m)return;var final=comboSum(m,'.actual-v16'),raw=comboSum(m,'.raw-v16');card.querySelector('[data-combo-final]').textContent=formatScore(final);card.querySelector('[data-combo-raw]').textContent=formatScore(raw);});}
    comboPicker.querySelector('select').onchange=function(){var id=this.value;if(!id)return;if(modal._moduleIdsV21.includes(id)){toast('这个组合已经添加了');this.value='';return;}modal._moduleIdsV21.push(id);renderCombos();this.value='';};modal.addEventListener('input',function(){setTimeout(updateComboScores,0)});renderCombos();
  }
  decorateCards();var obs=new MutationObserver(function(){decorateCards();});obs.observe(list,{childList:true,subtree:true});
}

var openExamBeforeV21=openExam;
openExam=function openExamV21(exam=null){openExamBeforeV21(exam);if(state.modal)decorateExamV21(exam,state.modal);};

saveExam=async function saveExamV21(id,modal){
  modal.querySelectorAll('.exam-subject-card-v10').forEach(function(card){var raw=card.querySelector('.raw-v16'),actual=card.querySelector('.actual-v16'),rawMax=num(card.querySelector('.rawmax-v16')?.value),finalMax=num(card.querySelector('.max-v16')?.value);if(raw&&actual&&String(actual.value||'').trim()===''&&String(raw.value||'').trim()!==''&&rawMax!==null&&finalMax!==null&&rawMax===finalMax)actual.value=raw.value;});
  var button=modal.querySelector('.save-btn'),mode=modal.dataset.rankEntryModeV17||'rank';
  var exam={id:id,name:modal.querySelector('#examName').value.trim(),exam_date:modal.querySelector('#examDate').value,grade_level:modal.querySelector('#gradeLevelV14')?.value||'',total_rank:mode==='rank'?(modal.querySelector('#totalRankV16')?.value||''):'',total_participants:mode==='rank'?(modal.querySelector('#totalParticipantsV16')?.value||''):'',total_class_rank:mode==='rank'?(modal.querySelector('#totalClassRankV16')?.value||''):'',total_class_participants:mode==='rank'?(modal.querySelector('#totalClassParticipantsV16')?.value||''):'',total_year_position_percent:mode==='percent'?(modal.querySelector('.total-year-position-v17')?.value||''):'',total_class_position_percent:mode==='percent'?(modal.querySelector('.total-class-position-v17')?.value||''):'',is_hidden:modal.querySelector('#examHiddenV16')?.value==='1',moduleIds:[...(modal._moduleIdsV21||[])],scores:{}};
  var configured=new Set(configuredSubjectsV21()),seen=new Set();
  for(var card of modal.querySelectorAll('.exam-subject-card-v10')){var name=cardNameV21(card);if(!name)return toast('请选择科目');if(seen.has(name))return toast(`科目「${name}」重复了`);seen.add(name);var historical=!configured.has(name);exam.scores[name]={target:card.querySelector('.target-v16')?.value||'',raw:card.querySelector('.raw-v16')?.value||'',actual:card.querySelector('.actual-v16')?.value||'',rawMax:card.querySelector('.rawmax-v16')?.value||'',max:card.querySelector('.max-v16')?.value||'',rank:mode==='rank'?(card.querySelector('.year-rank-v16')?.value||''):'',participants:mode==='rank'?(card.querySelector('.year-participants-v16')?.value||''):'',classRank:mode==='rank'?(card.querySelector('.class-rank-v16')?.value||''):'',classParticipants:mode==='rank'?(card.querySelector('.class-participants-v16')?.value||''):'',yearPositionPercent:mode==='percent'?(card.querySelector('.year-position-v17')?.value||''):'',classPositionPercent:mode==='percent'?(card.querySelector('.class-position-v17')?.value||''):'',excludeFromTotal:historical?!!card.querySelector('.exclude-total-check-v17')?.checked:false};}
  if(!exam.name||!exam.exam_date)return toast('请填写考试名称和日期');var error=validateExam(exam);if(error)return toast(error);button.disabled=true;button.textContent='保存中…';try{await dataApiV7('save_exam',{exam:exam});await loadExams();modal.remove();state.modal=null;render();toast(id?'已保存修改':'考试已记录');}catch(e){toast(e.message);button.disabled=false;button.textContent=id?'保存修改':'保存考试';}
};
;
/* ===== app-v22.js ===== */
// v22 / product v1.1: keep raw-only fallback scientifically safe across different score scales.
(function(){
  var base=typeof examScoreBeforeV20==='function'?examScoreBeforeV20:examScore;
  examScore=function examScoreV22(exam,subject,key){
    if(key!=='actual')return base(exam,subject,key);
    var row=exam?.scores?.[subject];
    if(row){
      var actual=num(row.actual);if(actual!==null)return actual;
      var raw=num(row.raw),max=num(row.max)??defaultMax(subject),rawMax=num(row.rawMax)??max;
      return raw!==null&&rawMax===max?raw:null;
    }
    return base(exam,subject,key);
  };
  if(typeof recordHtmlBeforeV20==='function')recordHtml=function recordHtmlV22(exam){return recordHtmlBeforeV20(exam);};
})();
;
/* ===== app-v23.js ===== */
// v23 / product v1.9: stop subject add/remove mutation storms and keep subject settings lightweight.
(function(){
  var PRODUCT_VERSION_V23='v1.9';

  function syncVersionV23(){
    var meta=document.querySelector('meta[name="application-version"]');
    if(meta)meta.setAttribute('content',PRODUCT_VERSION_V23);
    var footer=document.getElementById('app-version-v17');
    if(footer)footer.textContent='Score Tracker · '+PRODUCT_VERSION_V23;
  }
  syncVersionV23();

  // v17 and v21 both decorate the exam subject list with MutationObserver({subtree:true}).
  // Adding/removing a subject rebuilds the list, then each decorator mutates the same subtree,
  // causing the observers to wake each other repeatedly on slower/mobile browsers.
  // They only need to know when cards are added/removed, so observe direct children only.
  var openExamBeforeV23=openExam;
  openExam=function openExamV23(exam=null){
    var NativeMutationObserver=window.MutationObserver;
    if(typeof NativeMutationObserver!=='function')return openExamBeforeV23(exam);

    function DirectChildMutationObserver(callback){
      var observer=new NativeMutationObserver(callback);
      var nativeObserve=observer.observe.bind(observer);
      observer.observe=function(target,options){
        if(target&&target.id==='examSubjectsV16'&&options&&options.childList){
          return nativeObserve(target,Object.assign({},options,{subtree:false}));
        }
        return nativeObserve(target,options);
      };
      return observer;
    }
    DirectChildMutationObserver.prototype=NativeMutationObserver.prototype;

    try{
      window.MutationObserver=DirectChildMutationObserver;
      return openExamBeforeV23(exam);
    }finally{
      window.MutationObserver=NativeMutationObserver;
      syncVersionV23();
    }
  };

  // The global subject settings screen does not need to rebuild every row when one row changes.
  // Keep existing save validation/API logic, but make add/remove a local DOM operation.
  if(typeof openSubjectManagerV7==='function'){
    var openSubjectManagerBeforeV23=openSubjectManagerV7;
    openSubjectManagerV7=function openSubjectManagerV23(){
      openSubjectManagerBeforeV23();
      var modal=state.modal;
      var list=modal&&modal.querySelector('#subjectConfigList');
      var add=modal&&modal.querySelector('#addSubjectRowV7');
      if(!modal||!list||!add)return;

      function rowHtml(){
        return '<div class="subject-config-row-v7"><input class="subject-name-input-v7" maxlength="40" value="" placeholder="科目/题型名称"><input class="subject-max-input-v7" inputmode="decimal" value="100" placeholder="默认满分"><button class="remove-subject-v7" type="button" title="移除">×</button></div>';
      }
      function bindRemove(){
        list.querySelectorAll('.remove-subject-v7').forEach(function(button){
          button.onclick=function(){
            var rows=list.querySelectorAll('.subject-config-row-v7');
            if(rows.length<=1)return toast('至少保留 1 个科目');
            var row=button.closest('.subject-config-row-v7');
            if(row)row.remove();
          };
        });
      }
      bindRemove();
      add.onclick=function(){
        var count=list.querySelectorAll('.subject-config-row-v7').length;
        if(count>=20)return toast('最多设置 20 个科目');
        list.insertAdjacentHTML('beforeend',rowHtml());
        bindRemove();
        var inputs=list.querySelectorAll('.subject-name-input-v7');
        if(inputs.length)inputs[inputs.length-1].focus();
      };
    };
  }
})();
;
/* ===== app-v24.js ===== */
// v24 / product v2.0: explicit subject settings mapping, manual weighted totals, and bundled read requests.
(function(){
  var PRODUCT_VERSION_V24='v2.0';

  function syncVersionV24(){
    var meta=document.querySelector('meta[name="application-version"]');
    if(meta)meta.setAttribute('content',PRODUCT_VERSION_V24);
    var footer=document.getElementById('app-version-v17');
    if(footer)footer.textContent='Score Tracker · '+PRODUCT_VERSION_V24;
  }
  syncVersionV24();

  var style=document.createElement('style');
  style.id='app-v24-style';
  style.textContent=`
    .manual-total-v24{border-top:1px dashed var(--line);margin-top:10px;padding-top:11px}
    .manual-total-title-v24{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:8px}
    .manual-total-title-v24 b{font-size:12px;color:var(--text)}
    .manual-total-title-v24 span{font-size:9px;border:1px solid #dfe4ee;background:#fff;border-radius:999px;padding:3px 7px;color:var(--muted)}
    .manual-total-grid-v24{display:grid;grid-template-columns:1fr 1fr;gap:8px}
    .manual-total-field-v24{display:grid;gap:5px}
    .manual-total-field-v24 label{font-size:10px;color:var(--muted);font-weight:700}
    .manual-total-field-v24 input{width:100%;min-width:0;border:1px solid var(--line);border-radius:10px;padding:9px 10px;background:#fff;outline:none}
    .manual-total-field-v24 input:focus{border-color:#98a6f2;box-shadow:0 0 0 3px #eef0ff}
    .manual-total-note-v24{font-size:10px;color:var(--muted);line-height:1.6;margin-top:7px}
    .manual-total-note-v24 b{color:var(--text)}
    .subject-sync-note-v24{margin-top:10px;padding:10px 12px;border:1px solid #e2e7f0;background:#f8faff;border-radius:12px;font-size:11px;color:#667085;line-height:1.6}
    .subject-sync-note-v24 b{color:var(--text)}
    @media(max-width:620px){
      .manual-total-grid-v24{grid-template-columns:1fr}
      .manual-total-v24{margin-top:9px;padding-top:10px}
    }
  `;
  document.head.appendChild(style);

  // One list_exams response now also carries modules and account identity. Reuse it instead of issuing
  // a second modules request and a separate username identity read.
  if(typeof dataApiV7==='function'){
    var dataApiBeforeV24=dataApiV7;
    dataApiV7=async function dataApiV24(action,payload={}){
      if(action==='save_exam'&&payload&&payload.exam){
        var modal=state.modal&&state.modal.isConnected?state.modal:document.querySelector('.modal-backdrop');
        var finalInput=modal&&modal.querySelector('.total-actual-override-v24');
        var rawInput=modal&&modal.querySelector('.total-raw-override-v24');
        if(finalInput)payload.exam.total_actual_score=String(finalInput.value||'').trim();
        if(rawInput)payload.exam.total_raw_score=String(rawInput.value||'').trim();
      }
      var data=await dataApiBeforeV24(action,payload);
      if((action==='list_exams'||action==='bootstrap')&&data){
        if(Array.isArray(data.modules)){
          state.modulesV18=data.modules;
          state._modulesBundledV24=true;
        }
        if(data.user){
          state.user=Object.assign({},state.user||{},data.user);
          state.originalUsernameV19=data.user.originalUsername||state.originalUsernameV19||data.user.username||'';
          state._identityBundledV24=true;
        }
      }
      return data;
    };
  }
  if(typeof modulesApiV18==='function'){
    var modulesApiBeforeV24=modulesApiV18;
    modulesApiV18=async function modulesApiV24(action,payload={}){
      if(action==='list_modules'&&state._modulesBundledV24)return{modules:state.modulesV18||[]};
      var data=await modulesApiBeforeV24(action,payload);
      if(action==='save_modules'&&data&&Array.isArray(data.modules)){
        state.modulesV18=data.modules;
        state._modulesBundledV24=true;
      }
      return data;
    };
  }
  if(typeof usernameApiV19==='function'){
    var usernameApiBeforeV24=usernameApiV19;
    usernameApiV19=async function usernameApiV24(action,payload){
      if(action==='get'&&state._identityBundledV24&&state.user){
        return{user:{username:state.user.username,originalUsername:state.originalUsernameV19||state.user.username}};
      }
      return usernameApiBeforeV24(action,payload);
    };
  }

  // Manual total overrides are nullable. Null means "use automatic sum".
  var totalForBeforeV24=totalFor;
  totalFor=function totalForV24(exam,key){
    if(key==='actual'){
      var override=num(exam?.total_actual_score);
      if(override!==null)return override;
    }
    return totalForBeforeV24(exam,key);
  };
  if(typeof totalRawForV13==='function'){
    var totalRawBeforeV24=totalRawForV13;
    totalRawForV13=function totalRawForV24(exam){
      var override=num(exam?.total_raw_score);
      return override!==null?override:totalRawBeforeV24(exam);
    };
  }

  // If a user explicitly supplies a weighted final total, treat it as the exam's authoritative
  // headline even when the component subject rows are incomplete.
  if(typeof latestMetricV20==='function'){
    var latestMetricBeforeV24=latestMetricV20;
    latestMetricV20=function latestMetricV24(){
      var exams=typeof sortedVisibleExamsV20==='function'?sortedVisibleExamsV20():[...(state.exams||[])];
      for(var i=exams.length-1;i>=0;i--){
        var exam=exams[i],override=num(exam?.total_actual_score);
        if(override===null)continue;
        var subjects=typeof effectiveScoreSubjectsV20==='function'?effectiveScoreSubjectsV20(exam):[];
        var previous=null;
        for(var j=i-1;j>=0;j--){
          var prevSubjects=typeof effectiveScoreSubjectsV20==='function'?effectiveScoreSubjectsV20(exams[j]):[];
          if(subjects.length&&typeof sameSubjectSetV20==='function'&&!sameSubjectSetV20(subjects,prevSubjects))continue;
          var pv=totalFor(exams[j],'actual');
          if(pv!==null){previous=pv;break;}
        }
        return{label:'最近一次真实总分',value:override,exam:exam,delta:previous===null?null:override-previous,deltaLabel:'较上次'};
      }
      return latestMetricBeforeV24();
    };
  }

  function modalAutoTotalsV24(modal){
    var finalSum=0,rawSum=0,finalCount=0,rawCount=0;
    modal.querySelectorAll('.exam-subject-card-v10').forEach(function(card){
      var excluded=!!card.querySelector('.exclude-total-check-v17')?.checked;
      if(excluded)return;
      var actual=num(card.querySelector('.actual-v16')?.value);
      var raw=num(card.querySelector('.raw-v16')?.value);
      var finalMax=num(card.querySelector('.max-v16')?.value);
      var rawMax=num(card.querySelector('.rawmax-v16')?.value)??finalMax;
      if(actual===null&&raw!==null&&finalMax!==null&&rawMax===finalMax)actual=raw;
      if(actual!==null){finalSum+=actual;finalCount++;}
      var rawEffective=raw!==null?raw:actual;
      if(rawEffective!==null){rawSum+=rawEffective;rawCount++;}
    });
    return{final:finalCount?Math.round(finalSum*100)/100:null,raw:rawCount?Math.round(rawSum*100)/100:null};
  }

  function decorateManualTotalsV24(exam,modal){
    if(!modal||modal.dataset.v24Totals==='1')return;
    var totalCard=modal.querySelector('.combo-total-v21')||modal.querySelector('.score-total-preview-v13')?.parentElement;
    if(!totalCard)return;
    modal.dataset.v24Totals='1';
    var box=document.createElement('div');
    box.className='manual-total-v24';
    box.innerHTML=`<div class="manual-total-title-v24"><b>总分计算</b><span>可选手动值</span></div><div class="manual-total-grid-v24"><div class="manual-total-field-v24"><label>最终 / 赋分总分</label><input class="total-actual-override-v24" inputmode="decimal" value="${exam?.total_actual_score??''}" placeholder="自动计算"></div><div class="manual-total-field-v24"><label>原始总分</label><input class="total-raw-override-v24" inputmode="decimal" value="${exam?.total_raw_score??''}" placeholder="自动计算"></div></div><div class="manual-total-note-v24">留空时按本次科目自动汇总；如当地规则需要加权，可直接填写学校给出的总分。<b>手动值会用于记录、趋势和首页最近成绩。</b></div>`;
    var head=totalCard.querySelector('.combo-head-v21');
    if(head)head.insertAdjacentElement('afterend',box);else totalCard.insertBefore(box,totalCard.firstChild);
    var finalInput=box.querySelector('.total-actual-override-v24'),rawInput=box.querySelector('.total-raw-override-v24');
    function refresh(){
      var x=modalAutoTotalsV24(modal);
      finalInput.placeholder=x.final===null?'自动计算':'自动 '+formatScore(x.final);
      rawInput.placeholder=x.raw===null?'自动计算':'自动 '+formatScore(x.raw);
    }
    modal.addEventListener('input',function(e){if(!e.target.matches('.total-actual-override-v24,.total-raw-override-v24'))refresh();});
    refresh();
  }

  var openExamBeforeV24=openExam;
  openExam=function openExamV24(exam=null){
    var result=openExamBeforeV24(exam);
    if(state.modal)decorateManualTotalsV24(exam,state.modal);
    return result;
  };

  function subjectSettingsCardV24(){
    var subjects=(state.subjectConfigs&&state.subjectConfigs.length)
      ?state.subjectConfigs
      :SUBJECTS.map(function(name,index){return{name:name,defaultMax:defaultMax(name),sortOrder:index+1};});
    return '<div class="card subject-settings-v7"><div class="subject-settings-head-v7"><div><h3 class="card-title">科目设置</h3><p class="card-sub">在这里添加、改名、删除科目并设置默认满分；保存后会立即同步到“记录考试 → 选择科目”的列表。</p></div><button class="secondary" id="manageSubjectsBtn">管理科目</button></div><div class="subject-chip-list-v7">'+subjects.map(function(item){return '<span class="subject-chip-v7"><b>'+escapeHtml(item.name)+'</b> · 满分 '+formatScore(item.defaultMax)+'</span>';}).join('')+'</div><div class="subtle-note" style="margin-top:12px">移除科目不会删除历史成绩；以后重新添加同名科目，历史数据会重新显示。</div><div class="subject-sync-note-v24"><b>科目设置就是录入时的选择列表。</b> 这里没有的科目不会作为新考试的可选项；历史考试仍保留原数据。</div></div>';
  }

  // Make the settings -> entry-list relationship explicit. The underlying picker already reads
  // state.subjectConfigs; this wording makes the source of truth obvious to users.
  var accountHtmlBeforeV24=accountHtml;
  accountHtml=function accountHtmlV24(){
    var html=accountHtmlBeforeV24();
    if(html.indexOf('subject-settings-v7')===-1){
      // The account page dropped the subject settings card back in v10/v14; restore it here so
      // “账号 → 科目设置” exists again and the manager modal keeps its entry point.
      var card=subjectSettingsCardV24();
      var anchor='<div class="card category-settings-v14">';
      if(html.indexOf(anchor)!==-1)html=html.replace(anchor,card+anchor);
      else html+=card;
    }else{
      html=html.replace(/(<h3 class="card-title">科目设置<\/h3><p class="card-sub">)[\s\S]*?(<\/p>)/,
        '$1在这里添加、改名、删除科目并设置默认满分；保存后会立即同步到“记录考试 → 选择科目”的列表。$2');
      html=html.replace(/(<div class="subtle-note" style="margin-top:12px">移除科目不会删除历史成绩；以后重新添加同名科目，历史数据会重新显示。<\/div>)/,
        '$1<div class="subject-sync-note-v24"><b>科目设置就是录入时的选择列表。</b> 这里没有的科目不会作为新考试的可选项；历史考试仍保留原数据。</div>');
    }
    return html;
  };
  if(typeof openSubjectManagerV7==='function'){
    var openSubjectManagerBeforeV24=openSubjectManagerV7;
    openSubjectManagerV7=function openSubjectManagerV24(){
      var result=openSubjectManagerBeforeV24();
      var modal=state.modal;if(!modal)return result;
      var info=modal.querySelector('.info-box');
      if(info)info.innerHTML='<b>这里维护录分科目列表。</b> 可以新增、改名、移除并设置默认满分；保存后，新建/编辑考试里的“选择科目”会直接读取这里。最多 20 个。';
      return result;
    };
  }

  syncVersionV24();
})();
;
/* ===== app-v25.js ===== */
// v25 / product v2.4: combo ranks, combo trends, score/percent view, full-trend PNG export,
// tooltip clamping, record/group reordering, password rule update, overview redesign.
(function(){
  var PRODUCT_VERSION_V25='v2.4';

  function syncVersionV25(){
    var meta=document.querySelector('meta[name="application-version"]');
    if(meta)meta.setAttribute('content',PRODUCT_VERSION_V25);
    var footer=document.getElementById('app-version-v17');
    if(footer)footer.textContent='Score Tracker · '+PRODUCT_VERSION_V25;
  }
  syncVersionV25();

  state.scoreViewV25 = state.scoreViewV25 || 'score';

  // ---------- styles ----------
  if(typeof document!=='undefined'){
    var style=document.createElement('style');
    style.id='app-v25-style';
    style.textContent=`
      .combo-rank-v25{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:10px;padding-top:10px;border-top:1px dashed var(--line)}
      .combo-rank-v25>div{min-width:0}
      .combo-rank-v25 b{display:block;font-size:10px;color:var(--muted);font-weight:700;margin-bottom:5px}
      .combo-rank-pair-v25{display:grid;grid-template-columns:1fr 1fr;gap:6px}
      .combo-rank-pair-v25 input{width:100%;min-width:0;box-sizing:border-box;border:1px solid var(--line);border-radius:9px;padding:8px 7px;background:#fff;outline:none;font-size:12px}
      .trend-actions-v25{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:10px 0 2px}
      .trend-actions-v25 button{border:1px solid var(--line);background:#fff;color:#556070;border-radius:999px;padding:7px 12px;font-size:11px;cursor:pointer;transition:border-color .15s,color .15s}
      .trend-actions-v25 button:hover{border-color:#a9b4c8;color:#2c3648}
      .trend-actions-v25 button:active{transform:scale(.97)}
      .full-trend-modal-v25 .modal{max-width:920px}
      .full-trend-stage-v25{overflow:auto;-webkit-overflow-scrolling:touch;border:1px solid var(--line);border-radius:14px;background:#fff;padding:14px 12px}
      .full-trend-scroll-hint-v25{font-size:10px;color:var(--muted);margin-top:7px}
      .full-trend-actions-v25{display:flex;gap:10px;justify-content:flex-end;margin-top:14px;flex-wrap:wrap}
      .score-view-v25{display:flex;align-items:center;gap:8px;flex-wrap:nowrap;margin:0 0 4px}
      .score-view-v25 .label{font-size:12px;font-weight:700;color:var(--muted);white-space:nowrap}
      .score-view-v25 .basis-btn-v13{flex:0 1 auto;width:auto;padding:7px 11px;white-space:nowrap}
      .combo-chips-v25{display:flex;gap:8px;overflow:auto;padding:0 0 8px;margin-top:6px;scrollbar-width:none}
      .combo-chips-v25::-webkit-scrollbar{display:none}
      .order-btn-v25{border:1px solid var(--line);background:#fff;color:#667085;border-radius:8px;width:28px;height:28px;font-size:12px;line-height:1;padding:0;flex:0 0 auto;cursor:pointer}
      .order-btn-v25:hover, .order-btn-v25:active{border-color:#a9b4c8;color:#2c3648}
      .grade-section-head-v13 .order-btn-v25{width:30px;height:26px}
      .tooltip-card{white-space:normal;overflow-wrap:anywhere;word-break:break-word;max-width:min(300px,calc(100vw - 16px))}
      .people-total-v25{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:0 0 10px}
      .people-total-v25>div{display:grid;gap:5px;min-width:0}
      .people-total-v25 label{font-size:10px;color:var(--muted);font-weight:700}
      .people-total-v25 input{width:100%;min-width:0;box-sizing:border-box;border:1px solid var(--line);border-radius:10px;padding:9px 10px;background:#fff;outline:none}
      .end-date-field-v25{min-width:0}
      .combo-chips-v25 .label{font-size:12px;color:var(--muted);font-weight:700;white-space:nowrap}
      .basis-btn-v13.active{background:var(--text);color:#fff;border-color:var(--text)}
      .score-basis-v13{margin:0 0 10px}
      .radar-pick-v25{margin-top:8px}
      .radar-pick-v25 .secondary{border:1px solid var(--line);background:#fff;color:#556070;border-radius:999px;padding:8px 13px;font-size:12px;cursor:pointer}
      .radar-picked-v25{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px}
      .radar-pick-chip-v25{display:inline-flex;align-items:center;gap:6px;border:1px solid var(--line);background:#f7f8fb;color:#556070;border-radius:999px;padding:7px 10px;font-size:11px;cursor:pointer}
      .radar-pick-chip-v25:hover{border-color:#a9b4c8}
      .radar-pick-group-v25{margin:0 0 12px}
      .radar-pick-group-v25 h4{font-size:12px;color:var(--muted);margin:0 0 4px}
      .radar-pick-option-v25{display:flex;align-items:center;gap:8px;padding:9px 2px;font-size:13px;color:var(--text);border-bottom:1px solid var(--line);cursor:pointer}
      .radar-pick-option-v25 input{width:16px;height:16px;accent-color:#5d72e8}
      .trend-legend-row-v25{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-top:10px}
      .trend-legend-row-v25 .legend{margin:0}
      .trend-legend-row-v25 .trend-scroll-hint-v19{margin:0;margin-left:auto;text-align:right}
      .quick-card .mini-stat span{display:block;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      .rank-entry-mode-v17{gap:6px;margin:2px 0 28px}
      .rank-entry-mode-v17 button{padding:5px 9px;font-size:10.5px}
      .rank-entry-top-v21{margin:10px 0 14px;padding:9px 12px}
      .people-total-v25{margin-top:10px}
      @media(max-width:620px){
        .combo-rank-v25{grid-template-columns:1fr;gap:8px;padding-top:9px}
        .full-trend-stage-v25{padding:10px 8px}
        .order-btn-v25{width:32px;height:32px}
      }
    `;
    document.head.appendChild(style);
  }

  // ---------- helpers ----------
  function moduleByIdV25(id){return(state.modulesV18||[]).find(function(m){return String(m&&m.id)===String(id);})||null;}
  function comboIdV25(name){var m=(state.modulesV18||[]).find(function(x){return x&&x.name===name;});return m?String(m.id):null;}
  function isComboSubjectV25(s){return comboIdV25(s)!==null;}
  function comboRankInfoV25(exam,name,scope){
    if(!exam||!name)return{rank:null,participants:null,performance:null};
    var id=comboIdV25(name);if(!id)return{rank:null,participants:null,performance:null};
    var ranksMap=examRanksForV25(exam);
    var row=(ranksMap&&ranksMap[id])||{};
    var isClass=scope==='class';
    var rank=num(isClass?row.classRank:row.yearRank);
    var participants=num(isClass?row.classParticipants:row.yearParticipants);
    if(participants===null)participants=num(isClass?exam.total_class_participants:exam.total_participants);
    var performance=rank===null?null:(typeof rankPerformanceV7==='function'?rankPerformanceV7(rank,participants):null);
    return{rank:rank,participants:participants,performance:performance};
  }
  function scopeLabelV25(){return(state.rankScopeV16==='class')?'班排':'年排';}

  // A) 年级/班级总人数的本机记忆与自动填充
  function peopleKeyV25(){return 'st_people_v25_'+(state.user&&state.user.username||'anon');}
  function peopleLoadV25(){
    var raw=localStorage.getItem(peopleKeyV25())||'';var d=null;
    try{d=raw?JSON.parse(raw):null;}catch(e){d=null;}
    return(d&&typeof d==='object')?d:{};
  }
  function peopleSaveV25(d){try{localStorage.setItem(peopleKeyV25(),JSON.stringify(d||{}));}catch(e){}}

  // 首页侧栏概况：次数 / 平均得分率 / 达成目标次数 / 距最近目标分差
  // 得分率用于「平均」（科目数不同可比）；目标达成与差距按同一场考试的原始总分比较（同一场满分相同，分差最直观）
  function quickStatsV25(){
    var exams=state.exams||[];
    var rates=[];
    exams.forEach(function(e){var r=totalRate(e,'actual');if(r!==null)rates.push({rate:r,exam:e});});
    var sum=0;rates.forEach(function(x){sum+=x.rate;});
    var avg=rates.length?Math.round(sum/rates.length*10)/10:null;
    var met=0,targetExams=0,gap=null;
    for(var i=0;i<exams.length;i++){
      var e=exams[i],a=totalFor(e,'actual'),t=totalFor(e,'target');
      if(t===null)continue;
      targetExams++;
      if(a!==null&&a>=t)met++;
      if(gap===null&&a!==null)gap=Math.round((t-a)*10)/10;
    }
    return{count:exams.length,avg:avg,met:met,targetExams:targetExams,gap:gap};
  }

  // 组合排名：云端优先，本地兜底（后端 Edge Function 支持 moduleRanks 前先存在本机）
  function comboRanksKeyV25(){return 'st_moduleranks_v25_'+(state.user&&state.user.username||'anon');}
  function comboRanksCacheV25(){
    try{var raw=localStorage.getItem(comboRanksKeyV25())||'';var d=raw?JSON.parse(raw):null;return d&&typeof d==='object'?d:{};}catch(e){return{};}
  }
  function examRanksForV25(exam){
    if(exam&&exam.moduleRanks&&typeof exam.moduleRanks==='object'&&Object.keys(exam.moduleRanks).length)return exam.moduleRanks;
    if(!exam||!exam.exam_date||!exam.name)return{};
    return comboRanksCacheV25()[exam.exam_date+'|'+exam.name]||{};
  }
  function rememberRanksV25(examDate,examName,ranks){
    try{var c=comboRanksCacheV25();c[String(examDate||'')+'|'+String(examName||'')]=ranks||{};localStorage.setItem(comboRanksKeyV25(),JSON.stringify(c));}catch(e){}
  }
  function fillPeopleDownV25(modal,year,cls){
    if(!modal)return;
    function fill(input,val){
      if(!input||!val)return;
      if(input.dataset.userSetV25==='1')return;                 // 用户改过：以用户为准
      if(input.dataset.autoV25!=='1'&&String(input.value||'')!=='')return; // 已有保存值（编辑旧考试）
      input.value=val;input.dataset.autoV25='1';
    }
    fill(modal.querySelector('#totalParticipantsV16'),year);
    fill(modal.querySelector('#totalClassParticipantsV16'),cls);
    modal.querySelectorAll('.year-participants-v16').forEach(function(i){fill(i,year);});
    modal.querySelectorAll('.class-participants-v16').forEach(function(i){fill(i,cls);});
    // 组合分的人数空同样自动填（用户改过的不覆盖）
    modal.querySelectorAll('.combo-yp-v25').forEach(function(i){fill(i,year);});
    modal.querySelectorAll('.combo-cp-v25').forEach(function(i){fill(i,cls);});
  }
  // C1) 弹窗内文案精简：删纯说明文字，保留必要提示（防误删、状态说明）
  function declutterModalV25(modal){
    if(!modal)return;
    modal.querySelectorAll('.rank-science-box-v7,.rank-compat-v16,.position-note-v17,.template-note-v10').forEach(function(el){el.remove();});
    modal.querySelectorAll('.section-head-v7 p').forEach(function(p){p.remove();});
    // 科目设置弹窗里的「移除不删历史成绩」是必要提示，保留
    if(!modal.querySelector('#subjectConfigList')){
      modal.querySelectorAll('p.form-note').forEach(function(p){p.remove();});
    }
  }
  // C1) 页面文案精简：删冗余介绍，保留必要提示（防误删、功能前缀、空态、图例）
  function stripVerboseV25(html){
    return String(html||'')
      .replace(/<p class="card-sub">[\s\S]*?<\/p>/g,'')
      .replace(/<p class="hero-desc">[\s\S]*?<\/p>/g,'')
      .replace(/<div class="axis-caption-v6">[\s\S]*?<\/div>/g,'')
      .replace(/<div class="rank-method-v7">[\s\S]*?<\/div>/g,'')
      .replace(/<div class="raw-rank-note-v11">[\s\S]*?<\/div>/g,'')
      .replace(/<div class="rank-science-box-v7">[\s\S]*?<\/div>/g,'')
      .replace(/<div class="rank-compat-v16">[\s\S]*?<\/div>/g,'')
      .replace(/<div class="position-note-v17">[\s\S]*?<\/div>/g,'')
      .replace(/<div class="subject-sync-note-v24">[\s\S]*?<\/div>/g,'')
      .replace(/<div class="username-origin-v19">[\s\S]*?<\/div>/g,'')
      .replace(/<span class="template-note-v10">[\s\S]*?<\/span>/g,'')
      .replace(/<div class="subtle-note"([^>]*)>([\s\S]*?)<\/div>/g,function(m,attrs,inner){
        if(inner.indexOf('移除科目')!==-1||inner.indexOf('不会删除历史成绩')!==-1||inner.indexOf('组合：')!==-1)return m;
        return '';
      })
      .replace(/(<div class="card hero-main">[\s\S]*?<h2>)[\s\S]*?(<\/h2>)/,'$1看见起伏，也看见自己在进步。$2')
      .replace(/(<div class="page-head">[\s\S]*?<h2>[^<]*<\/h2>)<p>[\s\S]*?<\/p>/g,'$1');
  }

  // ---------- A) optional ranks per combo in the exam modal ----------
  var openExamBeforeV25=openExam;
  openExam=function openExamV25(exam){
    openExamBeforeV25(exam);
    var modal=state.modal;if(!modal)return;

    // A) 年级/班级总人数：一行设置，本机记住，自动填到下面所有人数空（用户改过的不覆盖）
    var entry=modal.querySelector('.rank-entry-mode-v17');
    if(entry&&!modal.querySelector('.people-total-v25')){
      var peopleBox=document.createElement('div');
      peopleBox.className='people-total-v25';
      peopleBox.innerHTML='<div><label>年级总人数</label><input class="pt-year-v25" inputmode="numeric" pattern="[0-9]*" placeholder="如 620"></div><div><label>班级总人数</label><input class="pt-class-v25" inputmode="numeric" pattern="[0-9]*" placeholder="如 45"></div>';
      entry.insertAdjacentElement('afterend',peopleBox);
      var pYear=peopleBox.querySelector('.pt-year-v25'),pClass=peopleBox.querySelector('.pt-class-v25');
      var savedPeople=peopleLoadV25();
      pYear.value=savedPeople.year??(modal.querySelector('#totalParticipantsV16')?.value||'');
      pClass.value=savedPeople.class??(modal.querySelector('#totalClassParticipantsV16')?.value||'');
      function fillDown(){fillPeopleDownV25(modal,pYear.value.trim(),pClass.value.trim());}
      pYear.addEventListener('input',function(){peopleSaveV25({year:pYear.value.trim(),class:pClass.value.trim()});fillDown();});
      pClass.addEventListener('input',function(){peopleSaveV25({year:pYear.value.trim(),class:pClass.value.trim()});fillDown();});
      modal.querySelectorAll('#totalParticipantsV16,#totalClassParticipantsV16,.year-participants-v16,.class-participants-v16').forEach(function(input){
        input.addEventListener('input',function(){input.dataset.userSetV25='1';delete input.dataset.autoV25;});
      });
      fillDown();
    }

    // B) 结束日期（时间段，可选；仅考试记录页展示，趋势图仍用开始日期）
    var dateField=modal.querySelector('#examDate')?.closest('.field');
    if(dateField&&!modal.querySelector('#examEndDateV25')){
      var endField=document.createElement('div');
      endField.className='field end-date-field-v25';
      endField.innerHTML='<label>结束日期（可选）</label><input id="examEndDateV25" type="date" value="'+escapeHtml(exam&&exam.end_date?exam.end_date:'')+'">';
      dateField.insertAdjacentElement('afterend',endField);
    }

    // C1) 弹窗文案精简
    declutterModalV25(modal);

    var list=modal.querySelector('#comboListV21');if(!list)return;
    var saved={};Object.entries(exam&&exam.moduleRanks?exam.moduleRanks:examRanksForV25(exam)).forEach(function(entry){saved[entry[0]]=entry[1]||{};});
    function decorateCard(card){
      if(card.querySelector('.combo-rank-v25'))return;
      var id=card.dataset.comboId;
      modal._comboRankCacheV25=modal._comboRankCacheV25||{};
      var s=(modal._comboRankCacheV25&&modal._comboRankCacheV25[id])||saved[id]||{};
      var block=document.createElement('div');
      block.className='combo-rank-v25';
      block.innerHTML=
        '<div><b>年排（可选）</b><div class="combo-rank-pair-v25">'+
        '<input class="combo-yr-v25" inputmode="numeric" pattern="[0-9]*" placeholder="名次" value="'+escapeHtml(s.yearRank??'')+'">'+
        '<input class="combo-yp-v25" inputmode="numeric" pattern="[0-9]*" placeholder="年级人数" value="'+escapeHtml(s.yearParticipants??'')+'">'+
        '</div></div>'+
        '<div><b>班排（可选）</b><div class="combo-rank-pair-v25">'+
        '<input class="combo-cr-v25" inputmode="numeric" pattern="[0-9]*" placeholder="名次" value="'+escapeHtml(s.classRank??'')+'">'+
        '<input class="combo-cp-v25" inputmode="numeric" pattern="[0-9]*" placeholder="班级人数" value="'+escapeHtml(s.classParticipants??'')+'">'+
        '</div></div>';
      card.appendChild(block);
      // 输入即缓存：组合卡被重建（增删组合）时已填排名不丢失；用户改过的人数不再被自动填充覆盖
      block.querySelectorAll('input').forEach(function(inp){
        inp.dataset.userSetV25=(String(inp.value||'').trim()!=='')?'1':'';
        inp.addEventListener('input',function(){
          inp.dataset.userSetV25='1';
          delete inp.dataset.autoV25;
          var c={};
          c.yearRank=(card.querySelector('.combo-yr-v25')?.value||'').trim();
          c.yearParticipants=(card.querySelector('.combo-yp-v25')?.value||'').trim();
          c.classRank=(card.querySelector('.combo-cr-v25')?.value||'').trim();
          c.classParticipants=(card.querySelector('.combo-cp-v25')?.value||'').trim();
          modal._comboRankCacheV25[id]=c;
        });
      });
    }
    function decorateAll(){list.querySelectorAll('.combo-card-v21').forEach(decorateCard);}
    decorateAll();
    try{
      var obs=new MutationObserver(function(){
        decorateAll();
        var ptY=modal.querySelector('.pt-year-v25'),ptC=modal.querySelector('.pt-class-v25');
        if(ptY)fillPeopleDownV25(modal,ptY.value.trim(),ptC?ptC.value.trim():'');
      });
      obs.observe(list,{childList:true,subtree:true});
      modal._comboRankObserverV25=obs;
    }catch(e){}
  };

  function validateComboRanksV25(ranks){
    function chkPair(rankValue,peopleValue,rLabel,pLabel){
      var r=num(rankValue),p=num(peopleValue);
      if(r!==null&&(!Number.isInteger(r)||r<1))return rLabel+'请输入正整数';
      if(p!==null&&(!Number.isInteger(p)||p<1))return pLabel+'请输入正整数';
      if(r!==null&&p!==null&&r>p)return rLabel+'不能大于'+pLabel;
      return '';
    }
    for(var id in ranks){
      var r=ranks[id],e=chkPair(r.yearRank,r.yearParticipants,'组合年排名次','年级人数');if(e)return e;
      e=chkPair(r.classRank,r.classParticipants,'组合班排名次','班级人数');if(e)return e;
    }
    return '';
  }

  if(typeof dataApiV7==='function'){
    var dataApiV25Before=dataApiV7;
    dataApiV7=async function dataApiV25(action,payload){
      if(action==='save_exam'&&payload&&payload.exam){
        var modal=state.modal&&state.modal.isConnected?state.modal:document.querySelector('.modal-backdrop');
        if(modal){
          var ranks={},has=false;
          modal.querySelectorAll('.combo-card-v21').forEach(function(card){
            var id=card.dataset.comboId;if(!id)return;
            has=true;
            ranks[id]={
              yearRank:(card.querySelector('.combo-yr-v25')?.value||'').trim(),
              yearParticipants:(card.querySelector('.combo-yp-v25')?.value||'').trim(),
              classRank:(card.querySelector('.combo-cr-v25')?.value||'').trim(),
              classParticipants:(card.querySelector('.combo-cp-v25')?.value||'').trim()
            };
          });
          if(has){
            var err=validateComboRanksV25(ranks);
            if(err)throw new Error(err);
            payload.exam.moduleRanks=ranks;
            rememberRanksV25(payload.exam.exam_date,payload.exam.name,ranks); // 本地兜底
          }
          var endInput=modal.querySelector('#examEndDateV25');
          if(endInput)payload.exam.end_date=String(endInput.value||'').trim();
        }
      }
      return dataApiV25Before(action,payload);
    };
  }

  // ---------- B) combo rank trend accessors ----------
  if(typeof rawRankValueV11==='function'){
    var rawRankValueBeforeV25=rawRankValueV11;
    rawRankValueV11=function rawRankValueV25(exam,subject){
      if(isComboSubjectV25(subject))return comboRankInfoV25(exam,subject,state.rankScopeV16||'year').rank;
      return rawRankValueBeforeV25(exam,subject);
    };
  }
  if(typeof rankInfoV7==='function'){
    var rankInfoBeforeV25=rankInfoV7;
    rankInfoV7=function rankInfoV25(exam,subject){
      if(isComboSubjectV25(subject))return comboRankInfoV25(exam,subject,state.rankScopeV16||'year');
      return rankInfoBeforeV25(exam,subject);
    };
  }

  if(typeof cleanSubjectAxisV21==='function'){
    var cleanSubjectAxisBeforeV25=cleanSubjectAxisV21;
    cleanSubjectAxisV21=function cleanSubjectAxisV25(){
      var combo=isComboSubjectV25(state.subject)?state.subject:null;
      cleanSubjectAxisBeforeV25();
      if(combo&&isComboSubjectV25(combo))state.subject=combo;
    };
  }

  // ---------- C) score/percent view chart ----------
  function percentTrendSingleV25(){
    var exams=state.exams||[];
    if(!exams.length)return '<div class="empty-chart"><div><div class="empty-icon">⌁</div>记录考试后，这里会自动出现趋势线</div></div>';
    var isTotal=state.subject==='总分';
    var points=exams.map(function(e){return{
      name:e.name,date:e.exam_date,
      actual:isTotal?totalRate(e,'actual'):scoreRate(e,state.subject,'actual'),
      target:isTotal?totalRate(e,'target'):scoreRate(e,state.subject,'target')
    };});
    var vals=[];
    points.forEach(function(p){if(p.actual!==null)vals.push(p.actual);if(p.target!==null)vals.push(p.target);});
    if(!vals.length)return '<div class="empty-chart"><div><div class="empty-icon">⌁</div>这个科目还没有成绩数据</div></div>';
    // 动态纵轴，与主成绩图同算法（v3 chartHtml）
    var axis=fullTrendAxisV25(vals,'scoreFinal');
    var W=760,H=300,L=46,R=18,T=20,B=46;
    var cw=W-L-R,ch=H-T-B;
    var x=function(i){return points.length===1?L+cw/2:L+(i/(points.length-1))*cw;};
    var y=function(v){return T+(axis.max-v)/(axis.max-axis.min)*ch;};
    var grid='';
    for(var i=0;i<=axis.ticks;i++){
      var v=axis.max-(axis.max-axis.min)*i/axis.ticks,yy=T+ch*i/axis.ticks;
      grid+='<line x1="'+L+'" y1="'+yy+'" x2="'+(W-R)+'" y2="'+yy+'" stroke="#edf0f4"/><text x="'+(L-9)+'" y="'+(yy+4)+'" text-anchor="end" class="axis-label">'+Math.round(v)+'%</text>';
    }
    function line(key,color,dash){
      var d='',started=false,circles='';
      points.forEach(function(p,i){
        var v=p[key];if(v===null){started=false;return;}
        var xx=x(i),yy=y(v);
        d+=(started?'L':'M')+' '+xx+' '+yy+' ';started=true;
        circles+='<circle cx="'+xx+'" cy="'+yy+'" r="5" fill="#fff" stroke="'+color+'" stroke-width="3" data-tip="'+escapeHtml(p.name)+' · '+(key==='actual'?'真实':'目标')+' '+formatPercent(v)+'"/>';
      });
      return '<path d="'+d+'" fill="none" stroke="'+color+'" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"'+(dash?' stroke-dasharray="'+dash+'"':'')+'/>'+circles;
    }
    var labels=points.map(function(p,i){return '<text x="'+x(i)+'" y="'+(H-17)+'" text-anchor="middle" class="axis-label">'+fmtDate(p.date)+'</text>';}).join('');
    return '<svg viewBox="0 0 '+W+' '+H+'" preserveAspectRatio="none">'+grid+line('target','#32a77a','7 7')+line('actual','#5d72e8')+labels+'</svg><div class="tooltip-card" id="chartTip"></div>';
  }

  var chartHtmlBeforeV25=(typeof chartHtml==='function')?chartHtml:null;
  chartHtml=function chartHtmlV25(){
    if(state.trendMetric==='score'&&state.scoreViewV25==='percent'&&state.subject!=='总览'&&state.scoreBasis!=='raw'){
      return percentTrendSingleV25();
    }
    return chartHtmlBeforeV25?chartHtmlBeforeV25():'';
  };

  // ---------- D) home page: view row, two-row chips, toolbar buttons ----------
  var homeHtmlBeforeV25=homeHtml;
  homeHtml=function homeHtmlV25(){
    var html=homeHtmlBeforeV25();
    // 1) 英雄区问候语：Hi，用户名！
    html=html.replace(/<span class="eyebrow">[^<]*<\/span>/,'<span class="eyebrow">Hi，'+escapeHtml((state.user&&state.user.username)||'')+'！</span>');
    // 查看：分数/百分比，与「趋势类型」同级（插入趋势类型行内末尾；仅成绩+最终分模式）
    if(state.trendMetric==='score'&&state.subject!=='总览'&&state.scoreBasis!=='raw'){
      var viewBtns='<span class="label">查看</span><button class="basis-btn-v13 '+(state.scoreViewV25==='score'?'active':'')+'" data-score-view-v25="score">分数</button><button class="basis-btn-v13 '+(state.scoreViewV25==='percent'?'active':'')+'" data-score-view-v25="percent">百分比</button>';
      html=html.replace(/(<div class="trend-metric-toggle-v7[^"]*">)([\s\S]*?)(<\/div>)/,'$1$2'+viewBtns+'$3');
    }
    if(state.trendMetric==='score'&&state.scoreViewV25==='percent'&&state.subject!=='总览'&&state.scoreBasis!=='raw'){
      html=html.replace('<p class="card-sub">真实成绩与目标成绩放在同一张图里</p>','<p class="card-sub">按得分率（百分比）查看真实与目标走势，不同满分的项目也能直接比较</p>');
    }
    // 3) chips 重排：组合行（组合：总览 总分 组合分）+ 科目行（科目：语文 数学 …）
    var combos=(state.modulesV18||[]).filter(function(m){return m&&m.name&&(m.subjects||[]).length>0;});
    var chip=function(s){var active=state.subject===s;return '<button class="chip '+(active?'active':'')+'" data-subject="'+escapeHtml(s)+'">'+escapeHtml(s)+'</button>';};
    var comboRow=(combos.length?'<span class="label">组合：</span>':'')+chip('总览')+chip('总分')+combos.map(function(c){return chip(c.name);}).join('');
    var subjectRow='<span class="label">科目：</span>'+(SUBJECTS||[]).map(function(s){return chip(s);}).join('');
    html=html.replace(/<div class="chips">([\s\S]*?)<\/div>/,function(m,inner){
      return '<div class="combo-chips-v25">'+comboRow+'</div><div class="combo-chips-v25">'+subjectRow+'</div>';
    });
    // 侧栏「这一年的记录」：只留最有信息量的指标（次数/最高分/平均分/最近目标；删「次已出分」和与 Hero 重复的「最近变化」）
    var qs=quickStatsV25();
    var quickGrid='<div class="quick-grid">'
      +'<div class="mini-stat"><b>'+qs.count+'</b><span>次考试</span></div>'
      +'<div class="mini-stat"><b>'+(qs.avg===null?'—':formatPercent(qs.avg))+'</b><span>平均得分率</span></div>'
      +'<div class="mini-stat"><b>'+(qs.targetExams?(qs.met+'/'+qs.targetExams):'—')+'</b><span>次达成目标</span></div>'
      +'<div class="mini-stat"><b>'+(qs.gap===null?'—':(qs.gap<=0?'✓':formatScore(Math.abs(qs.gap))))+'</b><span>'+(qs.gap===null?'最近目标':(qs.gap<=0?'已达成目标':'分 · 距目标'))+'</span></div>'
      +'</div>';
    html=html.replace(/<div class="quick-grid">[\s\S]*?<\/div><\/div>/,quickGrid);
    // 完整趋势 / 保存图片
    html=html.replace(/<div class="chart-wrap[^"]*" id="chart">/,
      '<div class="trend-actions-v25"><button type="button" id="trendFullV25">⛶ 完整趋势</button><button type="button" id="trendSaveV25">⭳ 保存图片</button></div><div class="chart-wrap" id="chart">');
    // C1) 精简文案
    return stripVerboseV25(html);
  };

  // ---------- E) PNG export (string-based: no DOM serialization quirks, blob URL + data URL fallback) ----------
  function finalizeExportSvgV25(svgText){
    var text=String(svgText||'').replace(/class="axis-label"/g,'style="font-size:11px;fill:#98a1ae"');
    var m=text.match(/^<svg[^>]*>/);
    if(!m)return null;
    var head=m[0];
    if(head.indexOf('xmlns')===-1)head=head.replace(/^<svg/,'<svg xmlns="http://www.w3.org/2000/svg"');
    var vb=(head.match(/viewBox="([^"]+)"/)||['','0 0 760 300'])[1].trim().split(/\s+/).map(Number);
    var w=vb[2]||760,h=vb[3]||300;
    if(head.indexOf('width=')===-1)head=head.replace(/(<svg[^>]*?)\/?>$/,'$1 width="'+w+'" height="'+h+'">');
    head=head.replace(/>\s*$/,'><rect width="100%" height="100%" fill="#ffffff"/>');
    return head+text.slice(m[0].length);
  }
  function extractChartSvgV25(){
    if(typeof chartHtml!=='function')return null;
    var html=chartHtml();
    var m=html.match(/<svg[\s\S]*?<\/svg>/);
    return m?m[0]:null;
  }
  function downloadSvgAsPngV25(svgText,filename){
    try{
      var finalSvg=finalizeExportSvgV25(svgText);
      if(!finalSvg)return toast('当前图表无法导出');
      var vb=(finalSvg.match(/viewBox="([^"]+)"/)||['','0 0 760 300'])[1].trim().split(/\s+/).map(Number);
      var w=vb[2]||760,h=vb[3]||300;
      var blob=new Blob([finalSvg],{type:'image/svg+xml;charset=utf-8'});
      var url=URL.createObjectURL(blob);
      var img=new Image();
      img.onload=function(){
        try{
          var scale=Math.min(2,2048/Math.max(w,h));
          var cw=Math.max(1,Math.round(w*scale)),chh=Math.max(1,Math.round(h*scale));
          var canvas=document.createElement('canvas');
          canvas.width=cw;canvas.height=chh;
          var ctx=canvas.getContext('2d');
          ctx.fillStyle='#ffffff';ctx.fillRect(0,0,cw,chh);
          ctx.drawImage(img,0,0,cw,chh);
          function finish(href,isBlobUrl){
            var a=document.createElement('a');
            a.href=href;a.download=filename||('score-tracker-'+Date.now()+'.png');
            document.body.appendChild(a);a.click();a.remove();
            if(isBlobUrl)setTimeout(function(){URL.revokeObjectURL(href);},1500);
            toast('图片已保存');
          }
          if(typeof canvas.toBlob==='function'){
            canvas.toBlob(function(png){
              if(png){var u2=URL.createObjectURL(png);finish(u2,true);}
              else finish(canvas.toDataURL('image/png'),false);
            },'image/png');
          }else finish(canvas.toDataURL('image/png'),false);
        }catch(e2){toast('导出失败');}
        try{URL.revokeObjectURL(url);}catch(e3){}
      };
      img.onerror=function(){
        try{URL.revokeObjectURL(url);}catch(e4){}
        // 兜底：换 data: URL 再试一次
        try{
          var img2=new Image();
          img2.onload=function(){
            var scale=Math.min(2,2048/Math.max(w,h));
            var cw=Math.max(1,Math.round(w*scale)),chh=Math.max(1,Math.round(h*scale));
            var canvas=document.createElement('canvas');
            canvas.width=cw;canvas.height=chh;
            var ctx=canvas.getContext('2d');
            ctx.fillStyle='#ffffff';ctx.fillRect(0,0,cw,chh);
            ctx.drawImage(img2,0,0,cw,chh);
            var href=canvas.toDataURL('image/png');
            var a=document.createElement('a');
            a.href=href;a.download=filename||('score-tracker-'+Date.now()+'.png');
            document.body.appendChild(a);a.click();a.remove();
            toast('图片已保存');
          };
          img2.onerror=function(){toast('图片渲染失败，请稍后再试');};
          img2.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(finalSvg);
        }catch(e5){toast('图片渲染失败，请稍后再试');}
      };
      img.src=url;
    }catch(e){toast('导出失败');}
  }
  function trendFileNameV25(label){return '成绩趋势-'+label+'-'+new Date().toISOString().slice(0,10)+'.png';}

  // ---------- F) full-trend wide chart + modal ----------
  function fullTrendAxisV25(vals,kind){
    var nums=vals.filter(function(v){return v!==null&&v!==undefined&&!Number.isNaN(Number(v));}).map(Number);
    if(!nums.length)return{min:0,max:100,ticks:5};
    var min=Math.min.apply(null,nums),max=Math.max.apply(null,nums),pad;
    if(kind==='scoreFinal'){
      pad=Math.max(10,(max-min)*0.18);
      max=Math.ceil((max+pad)/10)*10;
      min=Math.max(0,Math.floor((min-pad)/10)*10);
      if(max===min)max=min+100;
      return{min:min,max:max,ticks:5};
    }
    if(kind==='scoreRaw'){
      pad=Math.max(5,(max-min)*0.18);
      min=Math.max(0,Math.floor((min-pad)/5)*5);
      max=Math.ceil((max+pad)/5)*5;
      if(max-min<20){var mid=(max+min)/2;min=Math.max(0,Math.floor((mid-10)/5)*5);max=Math.ceil((mid+10)/5)*5;}
      if(max===min)max=min+20;
      return{min:min,max:max,ticks:5};
    }
    if(kind==='rate'){
      return (typeof calcDynamicAxisRangeV6==='function')
        ?calcDynamicAxisRangeV6(nums,{minLimit:0,maxLimit:100,step:5,minSpan:20,padRatio:.16})
        :{min:0,max:100,ticks:5};
    }
    if(kind==='rankRaw'){
      return (typeof rawRankAxisV11==='function')?rawRankAxisV11(nums):{min:Math.min.apply(null,nums),max:Math.max.apply(null,nums),ticks:5};
    }
    return{min:0,max:100,ticks:5};
  }

  function fullTrendSvgV25(){
    var exams=state.exams||[];
    var subject=state.subject||'总分';
    var metric=state.trendMetric||'score';
    var basis=state.scoreBasis||'final';
    var scope=state.rankScopeV16||'year';
    var n=Math.max(1,exams.length);
    var W=Math.max(760,150+n*78),H=340,L=58,R=24,T=20,B=54;
    var cw=W-L-R,ch=H-T-B;
    var x=function(i){return n===1?L+cw/2:L+(i/(n-1))*cw;};
    var colors=(typeof rankSeriesColorsV7==='function')?rankSeriesColorsV7():['#18212f','#5d72e8','#32a77a','#e59b45','#df5f68','#8f62db','#22a6b3','#f06a8b','#6c87ff','#7a8a9a'];
    var isPercent=metric==='rank',isRawRank=metric==='rank_raw';
    var scorePercent=!isRawRank&&!isPercent&&basis!=='raw'&&subject!=='总览'&&state.scoreViewV25==='percent';
    var series;
    if(isRawRank||isPercent){
      var rankSubjects=subject==='总览'?['总分'].concat(SUBJECTS):[subject];
      series=rankSubjects.map(function(s,i){
        return{label:s,color:colors[i%colors.length],value:function(e){return isRawRank?rawRankValueV11(e,s):rankInfoV7(e,s).performance;}};
      });
    }else if(basis==='raw'){
      if(subject==='总览'){
        series=['总分'].concat(SUBJECTS).map(function(s,i){return{label:s,color:colors[i%colors.length],value:function(e){return rawScoreRateV13(e,s);}};});
      }else{
        series=[{label:subject==='总分'?'原始总分':subject,color:'#d38429',value:function(e){return subject==='总分'?totalRawForV13(e):examRawScoreV13(e,subject);}}];
      }
    }else if(scorePercent){
      series=[
        {label:'真实',color:'#5d72e8',value:function(e){return subject==='总分'?totalRate(e,'actual'):scoreRate(e,subject,'actual');}},
        {label:'目标',color:'#32a77a',dash:'7 7',value:function(e){return subject==='总分'?totalRate(e,'target'):scoreRate(e,subject,'target');}}
      ];
    }else{
      if(subject==='总览'){
        series=['总分'].concat(SUBJECTS).map(function(s,i){return{label:s,color:colors[i%colors.length],value:function(e){return scoreRate(e,s,'actual');}};});
      }else{
        series=[
          {label:'真实',color:'#5d72e8',dash:'',value:function(e){return subject==='总分'?totalFor(e,'actual'):examScore(e,subject,'actual');}},
          {label:'目标',color:'#32a77a',dash:'7 7',value:function(e){return subject==='总分'?totalFor(e,'target'):examScore(e,subject,'target');}}
        ];
      }
    }
    var visible=series.filter(function(s){return exams.some(function(e){return s.value(e)!==null;});});
    if(!visible.length)return '<div class="empty-chart"><div><div class="empty-icon">⌁</div>当前还没有可用于完整趋势的数据</div></div>';
    var points=exams.map(function(e){return{exam:e,values:visible.map(function(s){return s.value(e);})};});
    var flat=[];
    points.forEach(function(p){p.values.forEach(function(v){if(v!==null)flat.push(v);});});
    var axisKind = scorePercent?'scoreFinal':(subject==='总览'
      ? (isRawRank?'rankRaw':(isPercent?'rankPercent':'rate'))
      : (isRawRank?'rankRaw':(isPercent?'rankPercent':(basis==='raw'?'scoreRaw':'scoreFinal'))));
    var axis=fullTrendAxisV25(flat,axisKind);
    var isRate = axisKind==='rate';
    var grid='';
    for(var g=0;g<=axis.ticks;g++){
      var value=axis.max-(axis.max-axis.min)*g/axis.ticks;
      if(isRawRank)value=axis.min+(axis.max-axis.min)*g/axis.ticks;
      var yy=T+ch*g/axis.ticks;
      var lbl=isRawRank?('第'+Math.max(1,Math.round(value))):(isPercent||isRate||scorePercent?Math.round(value)+'%':Math.round(value));
      grid+='<line x1="'+L+'" y1="'+yy+'" x2="'+(W-R)+'" y2="'+yy+'" stroke="#edf0f4"/><text x="'+(L-8)+'" y="'+(yy+4)+'" text-anchor="end" class="axis-label">'+lbl+'</text>';
    }
    var lines=visible.map(function(item,sidx){
      var d='',started=false,circles='';
      for(var pi=0;pi<points.length;pi++){
        var v=points[pi].values[sidx];
        if(v===null){started=false;continue;}
        var xx=x(pi);
        var yy=isRawRank?T+(v-axis.min)/(axis.max-axis.min)*ch:T+(axis.max-v)/(axis.max-axis.min)*ch;
        d+=(started?'L':'M')+' '+xx+' '+yy+' ';started=true;
        var tip;
        if(isRawRank)tip='第'+v+'名';
        else if(isPercent)tip=scopeLabelV25()+'百分位 '+formatPercent(v);
        else tip=formatScore(v);
        circles+='<circle cx="'+xx+'" cy="'+yy+'" r="5" fill="#fff" stroke="'+item.color+'" stroke-width="3" data-tip="'+escapeHtml(points[pi].exam.name)+' · '+escapeHtml(item.label)+' '+tip+'"/>';
      }
      return '<path d="'+d+'" fill="none" stroke="'+item.color+'" stroke-width="'+(sidx===0&&subject==='总览'?'3.2':'2.8')+'" stroke-linecap="round" stroke-linejoin="round"'+(item.dash?' stroke-dasharray="'+item.dash+'"':'')+'/>'+circles;
    }).join('');
    var labels=points.map(function(p,i){return '<text x="'+x(i)+'" y="'+(H-18)+'" text-anchor="middle" class="axis-label">'+fmtDate(p.exam.exam_date)+'</text>';}).join('');
    return '<svg viewBox="0 0 '+W+' '+H+'" preserveAspectRatio="none">'+grid+lines+labels+'</svg>';
  }

  function openFullTrendV25(){
    var exams=state.exams||[];
    if(!exams.length)return toast('还没有考试记录');
    var subject=state.subject||'总分';
    var svgText=fullTrendSvgV25();
    var modal=document.createElement('div');
    modal.className='modal-backdrop full-trend-modal-v25';
    modal.innerHTML='<div class="modal"><div class="modal-head"><h3>完整趋势 · '+escapeHtml(subject)+'</h3><button class="close-btn" type="button">×</button></div><div class="modal-body"><div class="full-trend-stage-v25" id="ftStageV25">'+svgText+'</div><div class="full-trend-scroll-hint-v25">全部考试都会显示在这里；图表较长时左右滑动查看。保存到手机的图片为完整宽度。</div><div class="full-trend-actions-v25"><button class="secondary" id="ftCloseV25" type="button">关闭</button><button class="primary" id="ftSaveV25" type="button">⭳ 保存图片</button></div></div></div>';
    document.body.appendChild(modal);
    var close=function(){modal.remove();};
    modal.querySelector('.close-btn').onclick=close;
    modal.querySelector('#ftCloseV25').onclick=close;
    modal.onclick=function(e){if(e.target===modal)close();};
    modal.querySelector('#ftSaveV25').onclick=function(){
      var m=String(svgText||'').match(/<svg[\s\S]*?<\/svg>/);
      if(!m)return toast('图形还没准备好');
      downloadSvgAsPngV25(m[0],trendFileNameV25(subject));
    };
  }

  // ---------- F2) 雷达图考试选择器：选择最近考试 → 分类勾选弹窗 → 只显示所选 ----------
  // 不再自动预选最近考试：初始为「选择最近考试」按钮，用户勾选后才显示所选
  var ensureRadarBeforeV25=(typeof ensureRadarSelection==='function')?ensureRadarSelection:null;
  if(ensureRadarBeforeV25){
    ensureRadarSelection=function ensureRadarSelectionV25(){
      var ids=state.radarSelection||[];
      var availableIds=new Set((typeof radarAvailableExams==='function'?radarAvailableExams():[]).map(function(e){return e.id;}));
      state.radarSelection=ids.filter(function(id){return availableIds.has(id);}).slice(0,4);
    };
  }
  var radarCardHtmlBeforeV25=(typeof radarCardHtml==='function')?radarCardHtml:null;
  if(radarCardHtmlBeforeV25){
    radarCardHtml=function radarCardHtmlV25(){
      var html=radarCardHtmlBeforeV25();
      var available=typeof radarAvailableExams==='function'?radarAvailableExams():[];
      var selected=state.radarSelection||[];
      var picker;
      if(!available.length){
        picker='<div class="multi-select" style="margin-top:8px"><span class="subtle-note">当前还没有可用于雷达图的数据</span></div>';
      }else if(selected.length){
        picker='<div class="radar-picked-v25">'+selected.map(function(id){
          var e=(state.exams||[]).find(function(x){return x.id===id;});
          return e?'<span class="radar-pick-chip-v25" data-radar-unpick="'+escapeHtml(id)+'">'+escapeHtml(e.name)+' · '+fmtDate(e.exam_date)+' ✕</span>':'';
        }).join('')+'</div>';
      }else{
        picker='<div class="radar-pick-v25"><button class="secondary" id="radarPickV25" type="button">选择最近考试</button></div>';
      }
      html=html.replace(/<div class="multi-select"[^>]*>[\s\S]*?<\/div>/,picker);
      return html;
    };
  }
  function openRadarPickerV25(){
    var available=typeof radarAvailableExams==='function'?radarAvailableExams():[];
    if(!available.length)return toast('暂无可用考试');
    var cats=typeof categoryOptionsV14==='function'?categoryOptionsV14():[];
    var groups=[].concat(
      cats.map(function(c){return{name:c,list:available.filter(function(e){return e.grade_level===c;})};}),
      [{name:'未分类',list:available.filter(function(e){return !e.grade_level;})}]
    ).filter(function(g){return g.list.length;});
    groups.forEach(function(g){g.list.sort(function(a,b){return String(a.exam_date||'').localeCompare(String(b.exam_date||''));});});
    var picked=new Set((state.radarSelection||[]).map(String));
    var modal=document.createElement('div');
    modal.className='modal-backdrop';
    modal.innerHTML='<div class="modal"><div class="modal-head"><h3>选择考试（最多 4 次）</h3><button class="close-btn" type="button">×</button></div><div class="modal-body">'
      +groups.map(function(g){
        return '<div class="radar-pick-group-v25"><h4>'+escapeHtml(g.name)+'</h4>'
          +g.list.map(function(e){
            return '<label class="radar-pick-option-v25"><input type="checkbox" value="'+escapeHtml(e.id)+'"'+(picked.has(String(e.id))?' checked':'')+'> '+escapeHtml(e.name)+' · '+fmtDate(e.exam_date)+'</label>';
          }).join('')
          +'</div>';
      }).join('')
      +'<div class="modal-actions"><button class="secondary cancel-btn">取消</button><button class="primary" id="radarPickOkV25">确定</button></div></div></div>';
    document.body.appendChild(modal);
    var close=function(){modal.remove();};
    modal.querySelector('.close-btn').onclick=close;
    modal.querySelector('.cancel-btn').onclick=close;
    modal.onclick=function(e){if(e.target===modal)close();};
    modal.querySelectorAll('input[type="checkbox"]').forEach(function(b){
      b.addEventListener('change',function(){
        if(modal.querySelectorAll('input[type="checkbox"]:checked').length>4){toast('最多选择 4 次考试');b.checked=false;}
      });
    });
    modal.querySelector('#radarPickOkV25').onclick=function(){
      state.radarSelection=[].slice.call(modal.querySelectorAll('input[type="checkbox"]:checked')).map(function(b){return b.value;});
      if(state.radarSelection.length&&typeof ensureRadarSelection==='function')ensureRadarSelection();
      close();render();
    };
  }

  // ---------- G) tooltip: fixed viewport positioning, never overflows the card ----------
  var tipPointV25=null;
  function hideChartTipsV25(){
    document.querySelectorAll('#chart .tooltip-card,#overviewChart .tooltip-card,.rank-chart-stage-v7 .tooltip-card').forEach(function(t){
      if(t.style.display!=='none')t.style.display='none';
    });
  }
  function positionChartTooltipV25(point){
    if(!point)return;
    var stage=point.closest&&point.closest('#chart,#overviewChart,.rank-chart-stage-v7');
    if(!stage)return;
    var tip=stage.querySelector('.tooltip-card')||document.getElementById('chartTip')||document.getElementById('overviewChartTip');
    if(!tip||tip.style.display==='none')return;
    if(!tip.textContent&&point.dataset&&point.dataset.tip)tip.textContent=point.dataset.tip;
    var pr=point.getBoundingClientRect();
    var wv=window.innerWidth,hv=window.innerHeight;
    tip.style.position='fixed';
    tip.style.transform='none';
    var w=Math.min(tip.offsetWidth||240,300,wv-16),h=tip.offsetHeight||40;
    if(w<40)w=40;
    var x=Math.round(pr.left+pr.width/2-w/2);
    x=Math.max(8,Math.min(wv-8-w,x));
    var y=Math.round(pr.top-12-h);
    if(y<8)y=Math.round(pr.bottom+12);
    y=Math.max(8,Math.min(hv-8-h,y));
    tip.style.left=x+'px';tip.style.top=y+'px';
    tipPointV25=point;
  }
  if(typeof clampTrendTooltipV19==='function'){
    clampTrendTooltipV19=function clampTrendTooltipV25(point){positionChartTooltipV25(point);};
  }
  // 统一接管：任何一个折线图数据点，点击/悬停都显示详情（并限制在屏幕内）
  function handleTipPointerV25(event){
    var point=event.target&&event.target.closest&&event.target.closest('[data-tip]');
    if(!point)return;
    var stage=point.closest('#chart,#overviewChart,.rank-chart-stage-v7');
    if(!stage)return;
    var tip=stage.querySelector('.tooltip-card')||document.getElementById('chartTip')||document.getElementById('overviewChartTip');
    if(!tip)return;
    tip.textContent=point.dataset.tip||'';
    tip.style.display='block';
    positionChartTooltipV25(point);
  }
  document.addEventListener('pointerover',handleTipPointerV25,false);
  document.addEventListener('click',handleTipPointerV25,false);
  document.addEventListener('pointerover',function(e){
    var inChart=e.target&&e.target.closest&&e.target.closest('#chart,#overviewChart,.rank-chart-stage-v7');
    if(!inChart)hideChartTipsV25();
  },false);
  window.addEventListener('scroll',function(){if(tipPointV25)setTimeout(function(){positionChartTooltipV25(tipPointV25);},0);},true);
  window.addEventListener('resize',function(){if(tipPointV25)setTimeout(function(){positionChartTooltipV25(tipPointV25);},0);});

  // ---------- H) records / group ordering (local persistence, up/down buttons) ----------
  function orderKeyV25(){return 'st_order_v25_'+(state.user&&state.user.username||'anon');}
  function orderDataV25(){
    var raw=localStorage.getItem(orderKeyV25())||'';
    var d=null;
    try{d=raw?JSON.parse(raw):null;}catch(e){d=null;}
    if(!d||typeof d!=='object')d={groups:[],exams:{}};
    if(!Array.isArray(d.groups))d.groups=[];
    if(!d.exams||typeof d.exams!=='object')d.exams={};
    return d;
  }
  function saveOrderV25(d){localStorage.setItem(orderKeyV25(),JSON.stringify(d));}
  function sectionTitleV25(section){return String((section.querySelector('.grade-section-head-v13 h3')||{}).textContent||'').trim();}
  function recordIdV25(record){var el=record.querySelector('[data-edit]');return el?String(el.dataset.edit):'';}

  function applyStoredOrderV25(){
    if(state.page!=='records')return;
    var d=orderDataV25();
    var sections=[].slice.call(document.querySelectorAll('.grade-section-v13'));
    if(!sections.length)return;
    // 组顺序
    if(d.groups.length){
      var byTitle={};sections.forEach(function(s){byTitle[sectionTitleV25(s)]=s;});
      var ordered=d.groups.map(function(t){return byTitle[t];}).filter(Boolean);
      var rest=sections.filter(function(s){return d.groups.indexOf(sectionTitleV25(s))===-1;});
      var parent=sections[0].parentNode;
      ordered.concat(rest).forEach(function(s){if(s.parentNode===parent)parent.appendChild(s);});
    }
    // 组内考试顺序
    [].slice.call(document.querySelectorAll('.grade-section-v13')).forEach(function(section){
      var card=section.querySelector('.records-card');
      if(!card)return;
      var records=[].slice.call(card.querySelectorAll('.record'));
      var ord=d.exams&&d.exams[sectionTitleV25(section)];
      if(ord&&ord.length){
        var byId={};records.forEach(function(r){byId[recordIdV25(r)]=r;});
        var ordered=ord.map(function(id){return byId[id];}).filter(Boolean);
        var restR=records.filter(function(r){return ord.indexOf(recordIdV25(r))===-1;});
        ordered.concat(restR).forEach(function(r){card.appendChild(r);});
      }
    });
  }

  function addOrderButtonsV25(){
    if(state.page!=='records')return;
    // 组头 ↑↓
    [].slice.call(document.querySelectorAll('.grade-section-head-v13')).forEach(function(head){
      if(head.querySelector('.order-grp-btn-v25'))return;
      var up=document.createElement('button');
      up.type='button';up.className='order-btn-v25 order-grp-btn-v25';up.title='上移分组';up.textContent='↑';up.dataset.grpUp='1';
      var down=document.createElement('button');
      down.type='button';down.className='order-btn-v25 order-grp-btn-v25';down.title='下移分组';down.textContent='↓';down.dataset.grpDown='1';
      head.appendChild(up);head.appendChild(down);
    });
    // 记录 ↑↓
    [].slice.call(document.querySelectorAll('.record-actions, .record-actions-v10')).forEach(function(actions){
      var record=actions.closest('.record');
      var id=recordIdV25(record);
      if(!record||!id||actions.querySelector('.order-rcd-btn-v25'))return;
      var up=document.createElement('button');
      up.type='button';up.className='order-btn-v25 order-rcd-btn-v25';up.title='上移';up.textContent='↑';up.dataset.id=id;up.dataset.rcdUp='1';
      var down=document.createElement('button');
      down.type='button';down.className='order-btn-v25 order-rcd-btn-v25';down.title='下移';down.textContent='↓';down.dataset.id=id;down.dataset.rcdDown='1';
      actions.appendChild(up);actions.appendChild(down);
    });
  }

  function moveRecordV25(id,dir){
    var d=orderDataV25();
    var section=[].slice.call(document.querySelectorAll('.grade-section-v13')).find(function(s){return s.querySelector('[data-edit="'+id+'"]');});
    if(!section)return;
    var g=sectionTitleV25(section);
    var card=section.querySelector('.records-card');if(!card)return;
    var records=[].slice.call(card.querySelectorAll('.record'));
    var curIds=records.map(recordIdV25);
    var ord=d.exams[g]=(d.exams[g]||[]).slice();
    curIds.forEach(function(x){if(x&&ord.indexOf(x)===-1)ord.push(x);});
    var a=ord.indexOf(id);if(a===-1)return;
    var b=a+dir;
    if(b<0||b>=ord.length)return toast(dir<0?'已经在最上面了':'已经在最下面了');
    var tmp=ord[a];ord[a]=ord[b];ord[b]=tmp;
    d.exams[g]=ord;
    saveOrderV25(d);
    applyStoredOrderV25();
  }

  function moveGroupV25(name,dir){
    var d=orderDataV25();
    var sections=[].slice.call(document.querySelectorAll('.grade-section-v13'));
    var titles=sections.map(sectionTitleV25);
    var a=titles.indexOf(name);
    if(a===-1)return;
    var b=a+dir;
    if(b<0||b>=titles.length)return toast(dir<0?'这组已经在最上面了':'这组已经在最下面了');
    if(!d.groups.length)d.groups=titles.slice();
    var ga=d.groups.indexOf(name);
    var gb=ga+dir;
    if(ga===-1){d.groups=titles.slice();ga=titles.indexOf(name);gb=ga+dir;}
    if(gb<0||gb>=d.groups.length)return;
    var tmp=d.groups[ga];d.groups[ga]=d.groups[gb];d.groups[gb]=tmp;
    saveOrderV25(d);
    applyStoredOrderV25();
  }

  if(!document._v25OrderWired){
    document._v25OrderWired=true;
    document.addEventListener('click',function(e){
      var up=e.target.closest&&e.target.closest('[data-rcd-up]');
      var down=e.target.closest&&e.target.closest('[data-rcd-down]');
      if(up)return moveRecordV25(up.dataset.id,-1);
      if(down)return moveRecordV25(down.dataset.id,1);
      var gup=e.target.closest&&e.target.closest('[data-grp-up]');
      var gdn=e.target.closest&&e.target.closest('[data-grp-down]');
      if(gup){var s1=gup.closest('.grade-section-v13');if(s1)moveGroupV25(sectionTitleV25(s1),-1);return;}
      if(gdn){var s2=gdn.closest('.grade-section-v13');if(s2)moveGroupV25(sectionTitleV25(s2),1);return;}
    },false);
  }

  // ---------- I) password rule: 6-20 chars, letters/digits/symbols; login input fits ----------
  var renderLoginBeforeV25=(typeof renderLogin==='function')?renderLogin:null;
  if(renderLoginBeforeV25){
    renderLogin=function renderLoginV25(error){
      renderLoginBeforeV25(error);
      var p=document.getElementById('loginPass');
      if(p){p.removeAttribute('inputmode');p.removeAttribute('pattern');p.placeholder='密码';}
      var help=document.querySelector('.auth-help');
      if(help)help.textContent='密码 6～20 位，可使用大小写字母、数字和符号；新注册账号会生成初始密码，登录后可在账号页修改。';
    };
  }

  // ---------- I2) 记录页/账号页：精简文案 + 时间段展示 ----------
  var recordHtmlBeforeV25=(typeof recordHtml==='function')?recordHtml:null;
  if(recordHtmlBeforeV25){
    recordHtml=function recordHtmlV25(exam){
      var html=recordHtmlBeforeV25(exam);
      if(exam&&exam.end_date){
        html=html.replace(/(<div class="record-date">)[^<]*(<b[^>]*>)/,function(m,a,b){
          return a+fmtYearDate(exam.exam_date)+' - '+fmtYearDate(exam.end_date)+b;
        });
      }
      return html;
    };
  }
  var recordsHtmlBeforeV25=(typeof recordsHtml==='function')?recordsHtml:null;
  if(recordsHtmlBeforeV25){
    recordsHtml=function recordsHtmlV25(){return stripVerboseV25(recordsHtmlBeforeV25());};
  }
  var accountHtmlBeforeV25=(typeof accountHtml==='function')?accountHtml:null;
  if(accountHtmlBeforeV25){
    accountHtml=function accountHtmlV25(){
      var html=accountHtmlBeforeV25();
      // 修改密码：源头去掉纯数字限制（inputmode/pattern），支持字母数字符号
      html=html.replace(/<input id="newPasswordV15"[^>]*>/,
        '<input id="newPasswordV15" type="password" autocomplete="new-password" placeholder="6～20位，可含字母数字符号">');
      html=html.replace(/<input id="confirmPasswordV15"[^>]*>/,
        '<input id="confirmPasswordV15" type="password" autocomplete="new-password" placeholder="再次输入新密码">');
      return stripVerboseV25(html);
    };
  }

  // ---------- J) bind page ----------
  function moveLegendBelowChartV25(){
    var wrap=document.getElementById('chart');
    if(!wrap||state.page!=='home')return;
    var legend=document.querySelector('.chart-card .legend');
    if(!legend)return;
    var row=legend.parentNode&&legend.parentNode.classList&&legend.parentNode.classList.contains('trend-legend-row-v25')
      ?legend.parentNode:null;
    if(!row){
      row=document.createElement('div');
      row.className='trend-legend-row-v25';
      legend.parentNode&&legend.parentNode.removeChild(legend);
      wrap.insertAdjacentElement('afterend',row);
      row.appendChild(legend);
    }
    var hint=document.querySelector('.trend-scroll-hint-v19');
    if(hint&&hint.parentNode!==row)row.appendChild(hint);
  }
  var bindPageBeforeV25=bindPage;
  bindPage=function bindPageV25(){
    bindPageBeforeV25();
    // 图例移到图表下方，与「左右滑动查看全部考试」同行
    moveLegendBelowChartV25();
    // 查看：分数/百分比
    $$('[data-score-view-v25]').forEach(function(b){b.onclick=function(){state.scoreViewV25=b.dataset.scoreViewV25;render();};});
    // 雷达图：选择考试/移除所选
    var pick=document.getElementById('radarPickV25');
    if(pick)pick.onclick=openRadarPickerV25;
    $$('[data-radar-unpick]').forEach(function(c){c.onclick=function(){state.radarSelection=(state.radarSelection||[]).filter(function(id){return id!==c.dataset.radarUnpick;});render();};});
    // 完整趋势 / 保存图片
    var full=document.getElementById('trendFullV25');
    if(full)full.onclick=openFullTrendV25;
    var save=document.getElementById('trendSaveV25');
    if(save)save.onclick=function(){
      var svgText=extractChartSvgV25();
      if(!svgText)return toast('当前还没有图表可保存');
      downloadSvgAsPngV25(svgText,trendFileNameV25(state.subject||'趋势'));
    };
    // 考试记录排序
    applyStoredOrderV25();
    addOrderButtonsV25();
    // 修改密码：6～20 位，可含大小写字母数字符号（覆盖 v15 纯数字规则）
    var pwBtn=document.getElementById('changePasswordV15');
    if(pwBtn){
      pwBtn.onclick=async function(){
        var first=(document.getElementById('newPasswordV15')||{}).value||'';
        var second=(document.getElementById('confirmPasswordV15')||{}).value||'';
        if(!/^[\x21-\x7E]{6,20}$/.test(first))return toast('新密码请设置为 6～20 位，可使用大小写字母、数字和符号');
        if(first!==second)return toast('两次输入的密码不一致');
        pwBtn.disabled=true;pwBtn.textContent='保存中…';
        try{
          await changePasswordApiV15(first);
          document.getElementById('newPasswordV15').value='';
          document.getElementById('confirmPasswordV15').value='';
          toast('密码已修改，请记住新密码');
        }catch(e){toast(e&&e.message?e.message:'密码修改失败');}
        finally{if(pwBtn.isConnected){pwBtn.disabled=false;pwBtn.textContent='保存新密码';}}
      };
      var np=document.getElementById('newPasswordV15'),cp=document.getElementById('confirmPasswordV15');
      if(np){np.removeAttribute('inputmode');np.removeAttribute('pattern');np.placeholder='6～20位，可含字母数字符号';}
      if(cp){cp.removeAttribute('inputmode');cp.removeAttribute('pattern');cp.placeholder='再次输入新密码';}
      var note=document.querySelector('.password-note-v15');
      if(note)note.textContent='建议设置 6～20 位，可使用大写字母、小写字母、数字和符号；保存后当前设备不会退出，以后登录请使用新密码。';
    }
  };

  // ---------- K) 记录页组合汇总：分数与排名独立展示（成员缺分时排名仍显示） ----------
  if(typeof moduleSummaryV18==='function'){
    moduleSummaryV18=function moduleSummaryV25(exam){
      if(!state.modulesV18||!exam)return '';
      var selected=new Set((exam.moduleIds||[]).map(String));
      if(!selected.size)return '';
      var items=(state.modulesV18||[]).filter(function(m){return selected.has(String(m&&m.id));}).map(function(m){
        if(!m||!m.name)return '';
        var final=examScore(exam,m.name,'actual');
        var raw=(typeof examRawScoreV13==='function')?examRawScoreV13(exam,m.name):null;
        var target=examScore(exam,m.name,'target');
        var max=(typeof examMax==='function')?examMax(exam,m.name):null;
        var parts=[];
        if(final!==null)parts.push(formatScore(final)+(max?('/'+formatScore(max)):''));
        if(raw!==null&&raw!==final)parts.push('原始 '+formatScore(raw));
        if(target!==null)parts.push('目标 '+formatScore(target));
        var ranksMap=examRanksForV25(exam);
        var r=ranksMap&&ranksMap[String(m.id)];
        if(r){
          if(num(r.yearRank)!==null)parts.push('年排 '+formatScore(r.yearRank)+(num(r.yearParticipants)!==null?('/'+formatScore(r.yearParticipants)):''));
          if(num(r.classRank)!==null)parts.push('班排 '+formatScore(r.classRank)+(num(r.classParticipants)!==null?('/'+formatScore(r.classParticipants)):''));
        }
        if(!parts.length)return '';
        return '<span class="module-chip-v18"><b>'+escapeHtml(m.name)+'</b> '+parts.join(' · ')+'</span>';
      }).filter(Boolean);
      return items.length?'<div class="record-module-summary-v18">'+items.join('')+'</div>':'';
    };
  }

  syncVersionV25();
})();
;
/* ===== app-v26.js ===== */
// v26 / product v3.0: 记录页分数显示重设计。
// 胶囊 pill（宽度随内容、换行锯齿）→ 总分强调条 + 等宽分数格（auto-fill 网格，任意宽度都排满整行）。
// 组合分与科目共用同一网格（浅蓝底区分），层级：总分条 > 科目格 > 组合格。
// 仅重写 recordHtml 的展示层；数据读取全部复用既有全局链（examScore/totalFor/rankInfoByScopeV16 等），
// 按钮 markup 与 data-* 属性保持不变，排序/编辑/隐藏/删除等既有绑定不受影响。
(function(){
  var PRODUCT_VERSION_V26='v3.0';
  function syncVersionV26(){
    var meta=document.querySelector('meta[name="application-version"]');
    if(meta)meta.setAttribute('content',PRODUCT_VERSION_V26);
    var footer=document.getElementById('app-version-v17');
    if(footer)footer.textContent='Score Tracker · '+PRODUCT_VERSION_V26;
  }

  // ---------- styles ----------
  if(typeof document!=='undefined'&&!document.getElementById('app-v26-style')){
    var style=document.createElement('style');
    style.id='app-v26-style';
    style.textContent=`
      .record-scores.record-scores-v26{display:block!important;min-width:0}
      .score-total-strip-v26{display:flex;align-items:baseline;flex-wrap:wrap;gap:4px 12px;background:#eef4ff;border-radius:11px;padding:9px 13px}
      .score-total-strip-v26 .t-label{font-size:11px;font-weight:700;color:#2f6bff;letter-spacing:.02em}
      .score-total-strip-v26 .t-big{font-size:20px;font-weight:800;color:var(--text);line-height:1.1;font-variant-numeric:tabular-nums}
      .score-total-strip-v26 .t-sub{font-size:11px;color:#6b7a99;font-variant-numeric:tabular-nums}
      .score-total-strip-v26 .t-pill{font-size:10px;font-weight:700;color:#41506b;background:#fff;border-radius:999px;padding:3px 9px;font-variant-numeric:tabular-nums;box-shadow:inset 0 0 0 1px #e3eaf8}
      .score-grid-v26{display:grid;grid-template-columns:repeat(auto-fill,minmax(97px,1fr));gap:6px;min-width:0}
      .score-total-strip-v26+.score-grid-v26{margin-top:7px}
      .score-cell-v26{background:#f6f7fa;border-radius:10px;padding:8px 10px 7px;min-width:0}
      .score-cell-v26.combo{background:#f6f9ff;box-shadow:inset 0 0 0 1px #d8e4fd}
      .sc-name-v26{display:flex;align-items:center;font-size:11px;font-weight:600;color:var(--muted);white-space:nowrap;overflow:hidden}
      .score-cell-v26.combo .sc-name-v26{color:#2f6bff}
      .sc-name-v26 .stat-badge-v17{flex:none;margin-left:5px}
      .sc-val-v26{font-size:17px;font-weight:700;color:var(--text);line-height:1.35;margin-top:1px;font-variant-numeric:tabular-nums;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .sc-sub-v26,.sc-rank-v26{font-size:10px;color:#98a2b3;line-height:1.55;font-variant-numeric:tabular-nums;overflow-wrap:break-word}
      .records-empty-v26{font-size:11px;color:var(--muted)}
      /* 手机端操作区：右侧竖列 → 独立底行横排（日期/分数/按钮三段式）。
         双类名 + !important 用于稳定覆盖 mobile-fix.css 的竖排规则 */
      @media(max-width:620px){
        .record.record{grid-template-columns:minmax(0,1fr)!important;grid-template-areas:"date" "scores" "actions";gap:12px 10px!important}
        .record-actions.record-actions-v10{grid-area:actions;display:flex!important;flex-direction:row!important;align-items:center!important;justify-content:flex-end;flex-wrap:nowrap;max-width:none!important}
        .record-action-btn-v10.record-action-btn-v10{width:auto;min-width:0;padding:6px 10px!important}
        .order-btn-v25.order-btn-v25{width:28px!important;height:28px!important}
      }
      @media(max-width:420px){
        .record.record{gap:10px 8px!important}
        .record-action-btn-v10.record-action-btn-v10{padding:6px 9px!important}
      }
    `;
    document.head.appendChild(style);
  }

  // ---------- helpers ----------
  function moduleNamesV26(){
    try{return (typeof moduleNameSetV21==='function')?moduleNameSetV21():new Set();}catch(e){return new Set();}
  }
  // 与 v25 examRanksForV25 同口径：云端 moduleRanks 优先，本机缓存兜底
  function moduleRanksForV26(exam){
    if(exam&&exam.moduleRanks&&typeof exam.moduleRanks==='object'&&Object.keys(exam.moduleRanks).length)return exam.moduleRanks;
    if(!exam||!exam.exam_date||!exam.name)return{};
    try{
      var raw=localStorage.getItem('st_moduleranks_v25_'+(((state&&state.user)&&state.user.username)||'anon'))||'';
      var d=raw?JSON.parse(raw):null;
      return (d&&typeof d==='object')?(d[exam.exam_date+'|'+exam.name]||{}):{};
    }catch(e){return{};}
  }
  // 单个 scope 的排名文案；prefix 为「年」或「班」。紧凑分数写法（12/450）减少窄格换行
  function scopeTextV26(info,prefix){
    if(!info)return '';
    if(info.directPercent)return prefix+'位比 前'+formatPercent(info.positionPercent);
    if(info.rank!==null&&info.rank!==undefined){
      return prefix+'排 '+formatScore(info.rank)+(info.participants!==null&&info.participants!==undefined?('/'+formatScore(info.participants)):'');
    }
    return '';
  }
  function subjectCellV26(exam,name){
    var row=(exam.scores&&exam.scores[name])||{};
    var a=num(row.actual),raw=num(row.raw),t=num(row.target);
    var eff=(a!==null)?a:raw; // 记录页沿用 v20 口径：actual 缺失时以原始分呈现
    var year=rankInfoByScopeV16(exam,name,'year'),cls=rankInfoByScopeV16(exam,name,'class');
    var rank=[scopeTextV26(year,'年'),scopeTextV26(cls,'班')].filter(Boolean).join(' · ');
    if(eff===null&&raw===null&&t===null&&!rank)return '';
    var sub=[];
    if(raw!==null&&(eff===null||Number(raw)!==Number(eff)))sub.push('原始 '+formatScore(raw));
    if(t!==null)sub.push('目标 '+(t===null?'—':formatScore(t)));
    var subText=sub.join(' · ');
    return '<div class="score-cell-v26">'
      +'<div class="sc-name-v26" title="'+escapeHtml(name)+'">'+escapeHtml(name)+(row.excludeFromTotal?'<span class="stat-badge-v17">统计项</span>':'')+'</div>'
      +'<div class="sc-val-v26">'+(eff===null?'—':formatScore(eff))+'</div>'
      +(subText?'<div class="sc-sub-v26" title="'+escapeHtml(subText)+'">'+subText+'</div>':'')
      +(rank?'<div class="sc-rank-v26" title="'+escapeHtml(rank)+'">'+rank+'</div>':'')
      +'</div>';
  }
  function comboCellV26(exam,m,ranksMap){
    var fin=examScore(exam,m.name,'actual');
    var raw=(typeof examRawScoreV13==='function')?examRawScoreV13(exam,m.name):null;
    var tgt=examScore(exam,m.name,'target');
    var max=examMax(exam,m.name);
    var r=(ranksMap&&ranksMap[String(m.id)])||{};
    var yr=num(r.yearRank),yp=num(r.yearParticipants),cr=num(r.classRank),cp=num(r.classParticipants);
    if(fin===null&&raw===null&&tgt===null&&yr===null&&cr===null)return '';
    var val=(fin!==null)?(formatScore(fin)+(max?'/'+formatScore(max):'')):(raw!==null?formatScore(raw):'—');
    var sub=[];
    if(raw!==null&&(fin===null||Number(raw)!==Number(fin)))sub.push('原始 '+formatScore(raw));
    if(tgt!==null)sub.push('目标 '+formatScore(tgt));
    var rank=[];
    if(yr!==null)rank.push('年排 '+formatScore(yr)+(yp!==null?('/'+formatScore(yp)):''));
    if(cr!==null)rank.push('班排 '+formatScore(cr)+(cp!==null?('/'+formatScore(cp)):''));
    var subText=sub.join(' · ');
    var rankText=rank.join(' · ');
    return '<div class="score-cell-v26 combo">'
      +'<div class="sc-name-v26" title="'+escapeHtml(m.name)+'">'+escapeHtml(m.name)+'</div>'
      +'<div class="sc-val-v26">'+val+'</div>'
      +(subText?'<div class="sc-sub-v26" title="'+escapeHtml(subText)+'">'+subText+'</div>':'')
      +(rankText?'<div class="sc-rank-v26" title="'+escapeHtml(rankText)+'">'+rankText+'</div>':'')
      +'</div>';
  }
  function totalStripV26(exam){
    var fin=totalFor(exam,'actual');
    var raw=(typeof totalRawForV13==='function')?totalRawForV13(exam):null;
    if(raw!==null&&fin!==null&&Math.abs(Number(fin)-Number(raw))<0.000001)raw=null;
    var year=rankInfoByScopeV16(exam,'总分','year'),cls=rankInfoByScopeV16(exam,'总分','class');
    var pills=[scopeTextV26(year,'年'),scopeTextV26(cls,'班')].filter(Boolean)
      .map(function(x){return '<span class="t-pill">'+x+'</span>';}).join('');
    if(fin===null&&raw===null&&!pills)return '';
    // 标签用中性「总分」：无赋分学段只见一个数，零歧义；有原始总分时并列展示自然区分口径
    return '<div class="score-total-strip-v26"><span class="t-label">总分</span>'
      +'<span class="t-big">'+(fin===null?'—':formatScore(fin))+'</span>'
      +(raw!==null?'<span class="t-sub">原始总分 '+formatScore(raw)+'</span>':'')
      +pills+'</div>';
  }

  // ---------- rewrite recordHtml ----------
  if(typeof recordHtml!=='function')return syncVersionV26();
  recordHtml=function recordHtmlV26(exam){
    var modules=state.modulesV18||[];
    var modNames=moduleNamesV26();
    var selected=new Set((exam.moduleIds||[]).map(String));
    var ranksMap=moduleRanksForV26(exam);
    var names=Object.keys(exam.scores||{}).filter(function(n){return !modNames.has(n);});
    var cells=names.map(function(n){return subjectCellV26(exam,n);}).filter(Boolean).join('');
    var combos=modules.filter(function(m){return m&&m.name&&selected.has(String(m.id));})
      .map(function(m){return comboCellV26(exam,m,ranksMap);}).filter(Boolean).join('');
    var strip=totalStripV26(exam);
    var zone=(cells||combos||strip)
      ?(strip+'<div class="score-grid-v26">'+cells+combos+'</div>')
      :'<div class="records-empty-v26">尚未填写分数或排名</div>';
    var dateHtml=fmtYearDate(exam.exam_date)+(exam.end_date?(' - '+fmtYearDate(exam.end_date)):'');
    return '<div class="record '+(exam.is_hidden?'hidden-record-v10':'')+'">'
      +'<div class="record-date">'+dateHtml
      +'<b>'+escapeHtml(exam.name)
      +'<span class="grade-badge-v13">'+escapeHtml(exam.grade_level||'未分类')+'</span>'
      +(exam.is_hidden?'<span class="hidden-badge-v10">已隐藏</span>':'')
      +'</b></div>'
      +'<div class="record-scores record-scores-v26">'+zone+'</div>'
      +'<div class="record-actions record-actions-v10">'
      +'<button class="record-action-btn-v10" data-edit="'+exam.id+'">编辑</button>'
      +'<button class="record-action-btn-v10" data-hidden-toggle="'+exam.id+'">'+(exam.is_hidden?'恢复显示':'隐藏')+'</button>'
      +'<button class="record-action-btn-v10 danger" data-delete="'+exam.id+'">删除</button>'
      +'</div></div>';
  };

  syncVersionV26();
})();
;
/* ===== app-v27.js ===== */
// app-v27 / product v3.1: 修复首页趋势卡「多科彩色图例」被裁切的问题。
// 根因：总览模式下 .overview-legend 生成在 #chart 容器内部（SVG 之后），而 v19 给 #chart
// 加了 .trend-scroll-v19{overflow-y:hidden!important}，叠加 .chart-wrap 固定高度
// （桌面 330px / 手机 285px）且 SVG 占满高度 → 图例溢出容器被下边缘切掉：
// 桌面露出上半截、手机几乎完全不可见。排名模式的 .rank-legend-v7 同样挤在定高容器内。
// 修法：渲染后将图例搬迁到 #chart 之后（容器外），脱离裁切与横向滚动上下文；
// 图例本身样式不变，仅外层提供排版。幂等，可重复 render。
(function(){
  var PRODUCT_VERSION_V27='v3.1';
  function syncVersionV27(){
    var meta=document.querySelector('meta[name="application-version"]');
    if(meta)meta.setAttribute('content',PRODUCT_VERSION_V27);
    var footer=document.getElementById('app-version-v17');
    if(footer)footer.textContent='Score Tracker · '+PRODUCT_VERSION_V27;
  }

  // ---------- styles ----------
  if(typeof document!=='undefined'&&!document.getElementById('app-v27-style')){
    var style=document.createElement('style');
    style.id='app-v27-style';
    style.textContent=`
      .legend-outside-v27{margin-top:10px;min-width:0}
      .legend-outside-v27 .overview-legend,.legend-outside-v27 .rank-legend-v7{margin-top:0}
    `;
    document.head.appendChild(style);
  }

  // ---------- move legends out of the clipped/fixed-height chart container ----------
  function moveLegendsOutV27(){
    ['chart','overviewChart'].forEach(function(id){
      var stage=document.getElementById(id);
      if(!stage)return;
      stage.querySelectorAll('.overview-legend,.rank-legend-v7').forEach(function(legend){
        if(legend.closest('.legend-outside-v27'))return; // 已搬迁
        var row=document.createElement('div');
        row.className='legend-outside-v27';
        stage.insertAdjacentElement('afterend',row);
        row.appendChild(legend);
      });
    });
  }

  var bindPageBeforeV27=(typeof bindPage==='function')?bindPage:null;
  if(bindPageBeforeV27){
    bindPage=function bindPageV27(){
      bindPageBeforeV27();
      try{moveLegendsOutV27();}catch(e){}
    };
  }

  syncVersionV27();
})();
;
/* ===== app-v28.js ===== */
// app-v28 / product v3.2: 数据安全与排名体验，四项改进——
// 1) 删除保护：删除考试前自动备份到本机回收站（最多 10 条），删除后 8 秒内可「撤销」，
//    账号页提供回收站卡片，随时恢复误删的整场考试（含全部成绩与排名）。
// 2) 市级排名：考试弹窗新增「市级排名」卡片与每科市排行；趋势图/雷达图口径按钮新增「市排」；
//    记录页总分徽章显示市排。数据字段：total_city_rank / total_city_participants / cityRank / cityParticipants。
// 3) 选科省略：账号页可设定「我的选科」，敲定后首页趋势科目按钮只保留所选科目
//    （附「＋其余科目」临时展开，一键恢复全部）。
// 4) 排名优先：最近两场考试有排名数据时，首页「较上次」优先展示排名变化（↑/↓ 名），
//    分数变化退居其次；无排名数据时保持原分数展示。
(function(){
  var PRODUCT_VERSION_V28='v3.2';
  var TRASH_KEY_V28='st_trash_v28';
  var SEL_KEY_V28='st_selected_subjects_v28';
  var SHOW_ALL_V28=false; // 会话内临时显示全部科目

  function syncVersionV28(){
    var meta=document.querySelector('meta[name="application-version"]');
    if(meta)meta.setAttribute('content',PRODUCT_VERSION_V28);
    var footer=document.getElementById('app-version-v17');
    if(footer)footer.textContent='Score Tracker · '+PRODUCT_VERSION_V28;
  }

  // ---------- styles ----------
  if(typeof document!=='undefined'&&!document.getElementById('app-v28-style')){
    var styleV28=document.createElement('style');
    styleV28.id='app-v28-style';
    styleV28.textContent=`
      .v28-undo{position:fixed;left:50%;transform:translateX(-50%);bottom:max(96px,calc(env(safe-area-inset-bottom) + 84px));z-index:90;display:flex;align-items:center;gap:14px;background:#1d2536;color:#fff;border-radius:14px;padding:12px 16px;font-size:13px;box-shadow:0 14px 40px rgba(20,28,46,.35);animation:v28In .2s ease}
      .v28-undo button{border:1px solid rgba(255,255,255,.45);background:rgba(255,255,255,.14);color:#fff;border-radius:999px;padding:6px 13px;font-size:12px;font-weight:700;cursor:pointer}
      .v28-undo button:hover{background:rgba(255,255,255,.26)}
      @keyframes v28In{from{opacity:0;transform:translateX(-50%) translateY(8px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}
      .v28-card{margin-top:18px;padding:24px}
      .v28-sub-list{display:flex;flex-wrap:wrap;gap:8px;margin-top:14px}
      .v28-sub-list button{border:1px solid var(--line);background:#fff;color:var(--text);border-radius:999px;padding:8px 13px;font-size:12.5px;font-weight:600;cursor:pointer}
      .v28-sub-list button.on{background:var(--accent-soft,var(--accent,#5d72e8));border-color:var(--accent,#5d72e8);color:var(--accent,#5d72e8)}
      .v28-note{font-size:11.5px;color:var(--muted,#788392);margin-top:10px;line-height:1.6}
      .v28-trash-item{display:flex;align-items:center;gap:12px;padding:11px 12px;border:1px solid var(--line);border-radius:13px;margin-top:10px;background:#fff}
      .v28-trash-item b{font-size:13.5px;display:block}
      .v28-trash-item span{font-size:11px;color:var(--muted,#788392);display:block;margin-top:2px}
      .v28-trash-item .v28-trash-btns{margin-left:auto;display:flex;gap:7px;flex:0 0 auto}
      .v28-trash-item .v28-trash-btns button{border-radius:999px;padding:6px 12px;font-size:11.5px;font-weight:650;cursor:pointer}
      .v28-restore{border:1px solid var(--green,#32a77a);color:var(--green,#32a77a);background:#fff}
      .v28-purge{border:1px solid var(--line);color:var(--muted,#788392);background:#fff}
      .v28-actions{display:flex;gap:9px;margin-top:14px;flex-wrap:wrap}
    `;
    document.head.appendChild(styleV28);
  }

  // ---------- 1. 市排口径 ----------
  var rankInfoByScopeBeforeV28=rankInfoByScopeV16;
  rankInfoByScopeV16=function rankInfoByScopeV28(exam,subject,scope){
    if(scope==='city'){
      if(!exam)return{rank:null,participants:null,performance:null};
      if(subject==='总分'){
        var tr=num(exam.total_city_rank),tp=num(exam.total_city_participants);
        return{rank:tr,participants:tp,performance:rankPerformanceV7(tr,tp)};
      }
      var row=(exam.scores&&exam.scores[subject])||{};
      var cr=num(row.cityRank),cp=num(row.cityParticipants);
      if(cp===null)cp=num(exam.total_city_participants);
      return{rank:cr,participants:cp,performance:rankPerformanceV7(cr,cp)};
    }
    return rankInfoByScopeBeforeV28(exam,subject,scope);
  };
  var rankScopeLabelBeforeV28=rankScopeLabelV16;
  rankScopeLabelV16=function(scope){return scope==='city'?'市排':rankScopeLabelBeforeV28(scope);};
  var rankScopeLongLabelBeforeV28=rankScopeLongLabelV16;
  rankScopeLongLabelV16=function(scope){return scope==='city'?'市级排名':rankScopeLongLabelBeforeV28(scope);};

  // ---------- 2. 首页：市排按钮 + 排名优先 pill ----------
  function rankMetricV28(exam,subject,scope){
    var info=rankInfoByScopeV16(exam,subject,scope);
    if(info.rank!==null)return{kind:'rank',value:info.rank};
    if(info.directPercent&&info.positionPercent!==null)return{kind:'percent',value:Number(info.positionPercent)};
    return null;
  }
  function rankDeltaV28(subject){
    subject=subject||'总分';
    var exams=(state.exams||[]).filter(function(e){return !e.is_hidden;}).slice().sort(function(a,b){return String(a.exam_date).localeCompare(String(b.exam_date));});
    var scopes=['year','class','city'];
    for(var i=0;i<scopes.length;i++){
      var last=null,prev=null,lastIdx=-1;
      for(var j=exams.length-1;j>=0;j--){
        var m=rankMetricV28(exams[j],subject,scopes[i]);
        if(m){
          if(last===null){last=m;lastIdx=j;}
          else if(j<lastIdx){prev=m;break;}
        }
      }
      if(last&&prev&&last.kind===prev.kind){
        var d=prev.value-last.value; // 正数 = 位次前进（名次变小 / 位比缩小）
        return{scope:scopes[i],kind:last.kind,delta:d,label:rankScopeLabelV16(scopes[i])+(last.kind==='percent'?'位比':''),lastValue:last.value};
      }
    }
    return null;
  }

  var homeHtmlBeforeV28=homeHtml;
  homeHtml=function homeHtmlV28(){
    var html=homeHtmlBeforeV28();
    var isRank=state.trendMetric==='rank_raw'||state.trendMetric==='rank';
    try{
      html=html.replace('data-trend-scope-v16="class">班排</button>',
        'data-trend-scope-v16="class">班排</button><button class="metric-btn-v7 '+(isRank&&state.rankScopeV16==='city'?'active':'')+'" data-trend-scope-v16="city">市排</button>');
      html=html.replace('data-radar-scope-v16="class">班排</button>',
        'data-radar-scope-v16="class">班排</button><button class="chip '+(isRank&&state.rankScopeV16==='city'?'active':'')+'" data-radar-scope-v16="city">市排</button>');
    }catch(e){}
    return html;
  };

  // v20 会在渲染后重写 hero-stat 的 DOM，因此排名优先的 pill 也必须在 bindPage 阶段直接改 DOM。
  // 高考录取看位次不看分数：有排名/位比就比位次；没有就引导补填，绝不退回分数对比。
  function applyRankPillV28(){
    if(state.page!=='home')return;
    var card=document.querySelector('.hero-stat');
    if(!card)return;
    var label=card.querySelector('.stat-label');
    if(!label)return;
    var lt=String(label.textContent||'');
    var subject=null;
    if(lt.indexOf('总分')>=0)subject='总分';
    else{var m=lt.match(/^最近一次(.+?)成绩$/);if(m)subject=m[1];}
    if(!subject)return;
    decorateRankPillV28(card,subject);
  }

  function latestRankTextV28(subject){
    subject=subject||'总分';
    var exams=(state.exams||[]).filter(function(e){return !e.is_hidden;}).sort(function(a,b){return String(b.exam_date).localeCompare(String(a.exam_date));});
    var e=exams[0];if(!e)return'';
    var parts=[];
    var yr=rankInfoByScopeV16(e,subject,'year');
    if(yr.rank!==null)parts.push('年排 '+yr.rank+(yr.participants?'/'+yr.participants:''));
    else if(yr.directPercent&&yr.positionPercent!==null)parts.push('年位比 前'+Number(yr.positionPercent).toFixed(1)+'%');
    if(subject==='总分'){
      var ct=rankInfoByScopeV16(e,'总分','city');
      if(ct.rank!==null)parts.push('市排 '+ct.rank+(ct.participants?'/'+ct.participants:''));
    }
    return parts.join(' · ');
  }

  function decorateRankPillV28(card,subject){
    var sub=card.querySelector('.stat-sub');
    if(sub){
      if(sub.dataset.v28Base===undefined)sub.dataset.v28Base=sub.textContent;
      var suffix=latestRankTextV28(subject);
      sub.textContent=sub.dataset.v28Base+(suffix?' · '+suffix:'');
    }
    var rd=rankDeltaV28(subject);
    var pill=card.querySelector('.trend-pill');
    if(!pill){pill=document.createElement('span');pill.className='trend-pill';card.appendChild(pill);}
    pill.onclick=null;pill.style.cursor='';pill.classList.remove('v28-nudge');
    if(rd){
      var up=rd.delta>0;
      if(rd.delta===0)pill.textContent='→ 较上次 '+rd.label+' 持平';
      else if(rd.kind==='percent')pill.textContent=(up?'↗':'↘')+' 较上次 '+rd.label+' '+(up?'缩小':'扩大')+Math.abs(rd.delta).toFixed(1)+'%';
      else pill.textContent=(up?'↗':'↘')+' 较上次 '+rd.label+' '+(up?'↑':'↓')+Math.abs(rd.delta)+' 名';
      return;
    }
    pill.textContent='✎ 补填排名，高考录取看位次不看分数';
    pill.classList.add('v28-nudge');
    pill.style.cursor='pointer';
    pill.title='点击打开最近一次考试，补填排名';
    pill.onclick=function(){
      var exams=(state.exams||[]).filter(function(e){return !e.is_hidden;}).sort(function(a,b){return String(b.exam_date).localeCompare(String(a.exam_date));});
      if(exams[0])openExam(exams[0]);
    };
  }

  // ---------- 3. 记录页：市排徽章 ----------
  var recordHtmlBeforeV28=(typeof recordHtml==='function')?recordHtml:null;
  if(recordHtmlBeforeV28){
    recordHtml=function recordHtmlV28(exam){
      var html=recordHtmlBeforeV28(exam);
      try{
        var city=rankInfoByScopeV16(exam,'总分','city');
        if(city.rank!==null){
          var badge='<span class="score-tag"><b>市排 '+city.rank+(city.participants?' / '+city.participants:'')+'</b></span>';
          html=html.replace('</div><div class="record-actions',badge+'</div><div class="record-actions');
        }
      }catch(e){}
      return html;
    };
  }

  // ---------- 4. 考试弹窗：市排录入 ----------
  function decorateModalV28(exam,modal){
    if(!modal)return;
    var total=modal.querySelector('.total-ranks-v16');
    if(total&&!modal.querySelector('#totalCityRankV28')){
      var card=document.createElement('div');
      card.className='rank-scope-card-v16';
      card.innerHTML='<b>市级排名</b><div class="rank-pair-v16"><div><label>名次</label><input id="totalCityRankV28" inputmode="numeric" pattern="[0-9]*" value="'+escapeHtml(exam&&exam.total_city_rank!=null?exam.total_city_rank:'')+'" placeholder="可留空"></div><div><label>参考人数</label><input id="totalCityParticipantsV28" inputmode="numeric" pattern="[0-9]*" value="'+escapeHtml(exam&&exam.total_city_participants!=null?exam.total_city_participants:'')+'" placeholder="如 12000"></div></div>';
      total.appendChild(card);
    }
    decorateCardsV28(exam,modal);
    if(!modal._v28Observer&&typeof MutationObserver!=='undefined'){
      modal._v28Observer=new MutationObserver(function(){if(modal.isConnected)decorateCardsV28(exam,modal);});
      modal._v28Observer.observe(modal,{childList:true,subtree:true});
    }
  }

  function decorateCardsV28(exam,modal){
    modal.querySelectorAll('.exam-subject-card-v10').forEach(function(card){
      if(card.dataset.v28City)return;
      card.dataset.v28City='1';
      var ranks=card.querySelector('.subject-ranks-v16');
      if(!ranks)return;
      var nameEl=card.querySelector('.exam-subject-name-v10');
      var name=nameEl?nameEl.value.trim():'';
      var row=exam&&exam.scores&&exam.scores[name]||{};
      var div=document.createElement('div');
      div.className='subject-rank-row-v16';
      div.innerHTML='<span>市排</span><input class="city-rank-v28" inputmode="numeric" pattern="[0-9]*" value="'+escapeHtml(row.cityRank!=null?row.cityRank:'')+'" placeholder="名次"><input class="city-participants-v28" inputmode="numeric" pattern="[0-9]*" value="'+escapeHtml(row.cityParticipants!=null?row.cityParticipants:'')+'" placeholder="参考人数">';
      ranks.appendChild(div);
    });
  }

  var openExamBeforeV28=(typeof openExam==='function')?openExam:null;
  if(openExamBeforeV28){
    openExam=function openExamV28(exam){
      openExamBeforeV28(exam);
      if(state.modal)decorateModalV28(exam&&exam.id?exam:null,state.modal);
    };
  }

  // ---------- 5. dataApiV7：市排保存合并 + 删除备份/撤销 ----------
  function readTrashV28(){
    try{var raw=localStorage.getItem(TRASH_KEY_V28);var arr=raw?JSON.parse(raw):[];return Array.isArray(arr)?arr:[];}catch(e){return[];}
  }
  function writeTrashV28(arr){
    try{localStorage.setItem(TRASH_KEY_V28,JSON.stringify(arr.slice(0,10)));}catch(e){}
  }

  function showUndoV28(examName,backup,entryAt){
    var old=document.getElementById('v28Undo');
    if(old&&old.parentNode)old.parentNode.removeChild(old);
    var bar=document.createElement('div');
    bar.className='v28-undo';
    bar.id='v28Undo';
    bar.innerHTML='<span>已删除「'+escapeHtml(examName)+'」，成绩已在本机留档</span><button type="button">撤销</button>';
    var timer=setTimeout(function(){if(bar.parentNode)bar.parentNode.removeChild(bar);},8000);
    bar.querySelector('button').onclick=async function(){
      clearTimeout(timer);
      if(bar.parentNode)bar.parentNode.removeChild(bar);
      try{
        await dataApiV7OrigV28('save_exam',{exam:Object.assign({},backup,{id:null})});
        var trashNow=readTrashV28();
        var idx=trashNow.findIndex(function(t){return t.at===entryAt;});
        if(idx>=0){trashNow.splice(idx,1);writeTrashV28(trashNow);}
        await loadExams();render();
        toast('已撤销删除，考试已恢复');
      }catch(e){toast('恢复失败：'+e.message);}
    };
    document.body.appendChild(bar);
  }

  var dataApiV7OrigV28=dataApiV7;
  dataApiV7=async function dataApiV28(action,payload){
    payload=payload||{};
    if(action==='save_exam'&&state.modal&&state.modal.isConnected&&state.modal.querySelector('#totalCityRankV28')){
      try{
        var exam=payload.exam||{};
        var modal=state.modal;
        exam.total_city_rank=modal.querySelector('#totalCityRankV28').value||'';
        exam.total_city_participants=modal.querySelector('#totalCityParticipantsV28').value||'';
        exam.scores=exam.scores||{};
        modal.querySelectorAll('.exam-subject-card-v10').forEach(function(card){
          var nameEl=card.querySelector('.exam-subject-name-v10');
          var name=nameEl?nameEl.value.trim():'';
          if(!name||!exam.scores[name])return;
          var cr=card.querySelector('.city-rank-v28'),cp=card.querySelector('.city-participants-v28');
          exam.scores[name].cityRank=cr?cr.value:'';
          exam.scores[name].cityParticipants=cp?cp.value:'';
        });
      }catch(e){}
    }
    if(action==='delete_exam'){
      var examId=payload.examId;
      var target=null;
      (state.exams||[]).forEach(function(e){if(String(e.id)===String(examId))target=e;});
      var res=await dataApiV7OrigV28(action,payload);
      if(target){
        var entryAt=Date.now();
        var trash=readTrashV28();
        trash.unshift({exam:target,at:entryAt});
        writeTrashV28(trash);
        showUndoV28(target.name||'这次考试',target,entryAt);
      }
      return res;
    }
    return dataApiV7OrigV28(action,payload);
  };

  // ---------- 6. 选科省略 ----------
  function loadSelectionV28(){
    try{var raw=localStorage.getItem(SEL_KEY_V28);var arr=raw?JSON.parse(raw):null;return Array.isArray(arr)&&arr.length?arr:null;}catch(e){return null;}
  }

  function trashCardHtmlV28(){
    var trash=readTrashV28();
    var items=trash.length?trash.map(function(item,i){
      var e=item.exam||{};
      return '<div class="v28-trash-item"><div><b>'+escapeHtml(e.name||'未命名考试')+'</b><span>'+escapeHtml(fmtYearDate?fmtYearDate(e.exam_date):(e.exam_date||''))+' 删除于 '+new Date(item.at).toLocaleString('zh-CN')+'</span></div><div class="v28-trash-btns"><button type="button" class="v28-restore" data-v28-restore="'+i+'">恢复</button><button type="button" class="v28-purge" data-v28-purge="'+i+'">彻底清除</button></div></div>';
    }).join(''):'<p class="v28-note" style="margin-top:10px">回收站是空的。删除考试时会自动在这里留档（本机最多 10 条），误删可一键恢复。</p>';
    return '<div class="card v28-card"><div class="card-title-row"><div><h3 class="card-title">回收站 · 删除保护</h3><p class="card-sub">删除考试前自动在本机留档，防止误触丢失数据；恢复会把整场考试（含成绩与排名）重新写回云端。</p></div></div>'+items+'</div>';
  }

  function subjectCardHtmlV28(){
    var sel=loadSelectionV28()||[];
    var pool=(state.subjectConfigs&&state.subjectConfigs.length?state.subjectConfigs.map(function(x){return x.name;}):SUBJECTS.slice());
    var chips=pool.map(function(name){
      var on=!sel.length||sel.indexOf(name)>=0;
      return '<button type="button" class="'+(on?'on':'')+'" data-v28-sub="'+escapeHtml(name)+'">'+escapeHtml(name)+'</button>';
    }).join('');
    return '<div class="card v28-card"><div class="card-title-row"><div><h3 class="card-title">我的选科</h3><p class="card-sub">敲定选科后，首页趋势图的科目按钮只保留所选科目，界面更清爽；历史数据不受影响。</p></div></div><div class="v28-sub-list" id="v28SubList">'+chips+'</div><div class="v28-actions"><button type="button" class="primary" id="v28SubSave">保存选科</button><button type="button" class="secondary" id="v28SubClear">显示全部科目</button></div><p class="v28-note">不勾选任何科目 = 未设置，显示全部。设置只保存在这台设备上。</p></div>';
  }

  var accountHtmlBeforeV28=(typeof accountHtml==='function')?accountHtml:null;
  if(accountHtmlBeforeV28){
    accountHtml=function accountHtmlV28(){
      return accountHtmlBeforeV28()+subjectCardHtmlV28()+trashCardHtmlV28();
    };
  }

  var bindPageBeforeV28=(typeof bindPage==='function')?bindPage:null;
  bindPage=function bindPageV28(){
    if(bindPageBeforeV28)bindPageBeforeV28();
    try{applySubjectFilterV28();}catch(e){}
    try{applyRankPillV28();}catch(e){}
    try{bindAccountV28();}catch(e){}
  };

  function applySubjectFilterV28(){
    if(state.page!=='home')return;
    var rows=document.querySelectorAll('.combo-chips-v25');
    var chipsWrap=rows.length?rows[rows.length-1]:document.querySelector('.chips');
    if(!chipsWrap)return;
    var sel=loadSelectionV28();
    if(!sel||SHOW_ALL_V28){
      ensureShowAllBtnV28(chipsWrap,false);
      return;
    }
    var keep={};keep['总览']=1;keep['总分']=1;sel.forEach(function(s){keep[s]=1;});
    (state.modulesV18||[]).forEach(function(m){if(m&&m.name)keep[m.name]=1;});
    var hidden=false,subjectInvalid=false;
    document.querySelectorAll('.combo-chips-v25 [data-subject], .chips [data-subject]').forEach(function(b){
      var s=b.getAttribute('data-subject');
      var show=!!keep[s];
      b.style.display=show?'':'none';
      if(!show){hidden=true;if(state.subject===s){state.subject='总分';subjectInvalid=true;}}
    });
    ensureShowAllBtnV28(chipsWrap,hidden);
    if(subjectInvalid)render();
  }

  function ensureShowAllBtnV28(chipsWrap,hidden){
    var btn=document.getElementById('v28ShowAll');
    if(!hidden){
      if(btn&&btn.parentNode)btn.parentNode.removeChild(btn);
      return;
    }
    if(btn||!hidden)return;
    btn=document.createElement('button');
    btn.className='chip';
    btn.id='v28ShowAll';
    btn.textContent='＋其余科目';
    btn.onclick=function(){SHOW_ALL_V28=true;render();};
    chipsWrap.appendChild(btn);
  }

  function bindAccountV28(){
    if(state.page!=='account')return;
    var list=document.getElementById('v28SubList');
    if(list){
      list.querySelectorAll('[data-v28-sub]').forEach(function(b){
        b.onclick=function(){b.classList.toggle('on');};
      });
    }
    var save=document.getElementById('v28SubSave');
    if(save){
      save.onclick=function(){
        var chosen=[];
        var listNow=document.getElementById('v28SubList');
        if(listNow)listNow.querySelectorAll('[data-v28-sub].on').forEach(function(b){chosen.push(b.getAttribute('data-v28-sub'));});
        try{localStorage.setItem(SEL_KEY_V28,JSON.stringify(chosen));}catch(e){}
        SHOW_ALL_V28=false;
        render();
        toast(chosen.length?'选科已保存，首页只显示所选科目':'已恢复显示全部科目');
      };
    }
    var clear=document.getElementById('v28SubClear');
    if(clear){
      clear.onclick=function(){
        try{localStorage.removeItem(SEL_KEY_V28);}catch(e){}
        SHOW_ALL_V28=false;
        render();
        toast('已恢复显示全部科目');
      };
    }
    document.querySelectorAll('[data-v28-restore]').forEach(function(b){
      b.onclick=async function(){
        var trash=readTrashV28();
        var item=trash[Number(b.getAttribute('data-v28-restore'))];
        if(!item)return;
        try{
          await dataApiV7OrigV28('save_exam',{exam:Object.assign({},item.exam,{id:null})});
          trash.splice(Number(b.getAttribute('data-v28-restore')),1);
          writeTrashV28(trash);
          await loadExams();render();
          toast('已恢复「'+(item.exam.name||'考试')+'」');
        }catch(e){toast('恢复失败：'+e.message);}
      };
    });
    document.querySelectorAll('[data-v28-purge]').forEach(function(b){
      b.onclick=function(){
        var trash=readTrashV28();
        trash.splice(Number(b.getAttribute('data-v28-purge')),1);
        writeTrashV28(trash);
        render();
        toast('已从回收站清除');
      };
    });
  }

  syncVersionV28();
})();
;

/* ===== app-v29.js ===== */
// app-v29 / product v3.3: 排名优先强化 + 成绩单图片识别。
// 1) 趋势图默认切「名次」视图（仅当本会话未手动选过且至少两场考试有排名数据）。
// 2) 考试弹窗新增「识别成绩单」：本地 OCR（Tesseract.js，中文语言包随项目分发在 /ocr 目录，
//    图片不上传、不依赖第三方语言包 CDN），自动填入各科分数与排名，核对后保存。
// 识别启发式：每行「科目 分数 年排 年人数 班排 班人数」依次取数；总分行同理填总排名；
// 表格型成绩单（一行科目名 + 下一行纯数字）按顺序配对。识别结果仅供参考，保存前请核对。
(function(){
  var PRODUCT_VERSION_V29='v3.3';

  function syncVersionV29(){
    var meta=document.querySelector('meta[name="application-version"]');
    if(meta)meta.setAttribute('content',PRODUCT_VERSION_V29);
    var footer=document.getElementById('app-version-v17');
    if(footer)footer.textContent='Score Tracker · '+PRODUCT_VERSION_V29;
  }

  if(typeof document!=='undefined'&&!document.getElementById('app-v29-style')){
    var styleV29=document.createElement('style');
    styleV29.id='app-v29-style';
    styleV29.textContent=`
      .trend-pill.v28-nudge{background:#f1f3f9;color:#4d5a6b}
      #v29OcrBtn{font-weight:650}
    `;
    document.head.appendChild(styleV29);
  }

  // ---------- 1) 趋势图默认名次 ----------
  var trendTouchedV29=false;
  document.addEventListener('click',function(ev){
    var t=ev.target;
    var b=t&&t.closest?t.closest('[data-trend-metric]'):null;
    if(b)trendTouchedV29=true;
  },true);

  function maybeDefaultRankV29(){
    if(trendTouchedV29||state.trendMetric!=='score')return;
    var ranked=0;
    (state.exams||[]).forEach(function(e){
      if(num(e.total_rank)!==null||num(e.total_class_rank)!==null||num(e.total_city_rank)!==null||num(e.total_year_position_percent)!==null)ranked++;
    });
    if(ranked>=2)state.trendMetric='rank_raw';
  }
  if(typeof loadExams==='function'){
    var loadExamsBeforeV29=loadExams;
    loadExams=async function loadExamsV29(){
      var r=await loadExamsBeforeV29();
      maybeDefaultRankV29();
      return r;
    };
  }

  // ---------- 2) OCR：引擎加载（本地 ocr/ 目录优先，CDN 兜底） ----------
  function ocrBaseV29(){return location.href.replace(/[^\/]*$/,'')+'ocr/';}
  var SCRIPT_URLS_V29=null;
  function scriptUrlsV29(){
    if(SCRIPT_URLS_V29)return SCRIPT_URLS_V29;
    var b=ocrBaseV29();
    SCRIPT_URLS_V29=[
      b+'tesseract.min.js',
      'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js',
      'https://registry.npmmirror.com/tesseract.js/5.1.1/files/dist/tesseract.min.js'
    ];
    return SCRIPT_URLS_V29;
  }
  function loadCodeV29(src){
    return fetch(src,{cache:'force-cache'}).then(function(r){
      if(!r.ok)throw new Error('http '+r.status);
      return r.text();
    }).then(function(code){
      (0,eval)(code);
    });
  }
  var tessPromiseV29=null;
  function ensureTesseractV29(){
    if(window.Tesseract)return Promise.resolve();
    if(!tessPromiseV29){
      tessPromiseV29=(async function(){
        var urls=scriptUrlsV29();
        for(var i=0;i<urls.length;i++){
          try{await loadCodeV29(urls[i]);if(window.Tesseract)return;}catch(e){}
        }
        tessPromiseV29=null;
        throw new Error('OCR 引擎加载失败，请检查网络后重试');
      })();
    }
    return tessPromiseV29;
  }
  function ocrConfigsV29(){
    var b=ocrBaseV29();
    return [
      {workerPath:b+'worker.min.js',corePath:b+'core/'},
      {}
    ];
  }

  // ---------- OCR：图片预处理 ----------
  function prepareImageV29(file){
    return new Promise(function(res){
      var url=URL.createObjectURL(file);
      var img=new Image();
      img.onload=function(){
        var maxW=1600,w=img.width,h=img.height;
        if(w>maxW){h=Math.round(h*maxW/w);w=maxW;}
        var c=document.createElement('canvas');
        c.width=w;c.height=h;
        c.getContext('2d').drawImage(img,0,0,w,h);
        URL.revokeObjectURL(url);
        res(c);
      };
      img.onerror=function(){URL.revokeObjectURL(url);res(null);};
      img.src=url;
    });
  }

  // ---------- OCR：解析 ----------
  var SUBJECT_ALIASES_V29=[
    ['思想政治','政治'],['西班牙语','西班牙语'],
    ['语文','语文'],['数学','数学'],['英语','英语'],['英文','英语'],
    ['物理','物理'],['化学','化学'],['生物','生物'],['政治','政治'],
    ['历史','历史'],['地理','地理'],['体育','体育'],['听力','听力'],
    ['日语','日语'],['俄语','俄语'],['法语','法语'],['德语','德语'],
    ['总分','总分']
  ];
  function matchSubjectV29(line){
    var best=null;
    for(var i=0;i<SUBJECT_ALIASES_V29.length;i++){
      var alias=SUBJECT_ALIASES_V29[i];
      var idx=line.indexOf(alias[0]);
      if(idx>=0&&(!best||alias[0].length>best.alias.length))best={alias:alias[0],name:alias[1],idx:idx};
    }
    return best;
  }
  function numsInV29(s){return (String(s).match(/\d+(?:\.\d+)?/g)||[]).map(Number);}

  // 行内关键词标记（年排/班排/市排）优先于位置推断：命中即摘出，避免市排数字被误当班排
  function extractMarkersV29(rest){
    var out={rest:String(rest),yearRank:null,classRank:null,cityRank:null};
    var m=out.rest.match(/(?:年|校|级)(?:级)?(?:排|排名|名次)\D{0,3}(\d+)/);
    if(m){out.yearRank=m[1];out.rest=out.rest.replace(m[0],' ');}
    m=out.rest.match(/班(?:级)?(?:排|排名|名次)\D{0,3}(\d+)/);
    if(m){out.classRank=m[1];out.rest=out.rest.replace(m[0],' ');}
    m=out.rest.match(/市(?:级)?(?:排|排名|名次)\D{0,3}(\d+)/);
    if(m){out.cityRank=m[1];out.rest=out.rest.replace(m[0],' ');}
    return out;
  }

  function parseReportV29(text){
    var lines=String(text||'').split(/\r?\n/);
    var rows={},total=null,seq=null;
    for(var i=0;i<lines.length;i++){
      var line=lines[i]||'';
      if(!line.trim())continue;
      var hit=matchSubjectV29(line);
      if(hit){
        var rest=line.slice(hit.idx+hit.alias.length);
        var mk=extractMarkersV29(rest);
        var nums=numsInV29(mk.rest);
        if(nums.length||mk.yearRank||mk.classRank||mk.cityRank){
          if(hit.name==='总分'){
            if(!total)total={nums:nums,line:line,cityRank:mk.cityRank,classRank:mk.classRank};
          }else if(!rows[hit.name]){
            rows[hit.name]={nums:nums,yearRank:mk.yearRank,classRank:mk.classRank,cityRank:mk.cityRank};
          }
          continue;
        }
        // 本行只有科目名（可能多个）：与下方纯数字行配对（表格型成绩单）
        var names=[],scan=line,j=0;
        while(j<40){
          var m=matchSubjectV29(scan);
          if(!m)break;
          names.push(m.name==='英语'&&m.alias==='英文'?'英语':m.name);
          scan=scan.slice(m.idx+m.alias.length);
          j++;
        }
        var next=lines[i+1]||'';
        var hasChinese=/[\u4e00-\u9fa5]/.test(next.replace(/[年月日排位名次分]/g,''));
        var nextNums=numsInV29(next);
        if(names.length>=2&&!hasChinese&&nextNums.length>=names.length){
          var third=lines[i+2]||'';
          var thirdChinese=/[\u4e00-\u9fa5]/.test(third.replace(/[年月日排位名次分]/g,''));
          var thirdNums=!thirdChinese?numsInV29(third):[];
          // 布局一：科目行 / 分数行 / 名次行（三行）
          if(nextNums.length===names.length&&thirdNums.length===names.length){
            seq={names:names,pairs:names.map(function(_,k){return[nextNums[k],thirdNums[k]];})};
            i+=2;
          }else if(nextNums.length===names.length){
            // 布局二：科目行 / 分数行（两行，只有分数）
            seq={names:names,pairs:names.map(function(_,k){return[nextNums[k]];})};
            i++;
          }else if(nextNums.length===names.length*2){
            // 布局三：科目行 / 「分数 名次 分数 名次…」交错一行
            seq={names:names,pairs:names.map(function(_,k){return[nextNums[k*2],nextNums[k*2+1]];})};
            i++;
          }
        }
        continue;
      }
    }
    if(seq){
      seq.names.forEach(function(name,k){
        if(name==='总分'){if(!total)total={nums:seq.pairs[k]||[],line:'',cityRank:null,classRank:null};return;}
        if(!rows[name]){
          var group=seq.pairs[k]||[];
          if(group.length)rows[name]={nums:group,yearRank:null,classRank:null,cityRank:null};
        }
      });
    }
    return {rows:rows,total:total};
  }

  // ---------- OCR：填表 ----------
  function setValV29(input,v){
    if(!input||v===undefined||v===null)return false;
    input.value=String(v);
    try{input.dispatchEvent(new Event('input',{bubbles:true}));}catch(e){}
    return true;
  }
  function findCardV29(modal,name){
    var found=null;
    modal.querySelectorAll('.exam-subject-card-v10').forEach(function(card){
      var el=card.querySelector('.exam-subject-name-v10');
      if(el&&el.value.trim()===name)found=card;
    });
    return found;
  }
  function addCardV29(modal){
    var btn=modal.querySelector('#addExamSubjectV16')||modal.querySelector('#addExamSubjectV14');
    if(!btn)return null;
    btn.click();
    var cards=modal.querySelectorAll('.exam-subject-card-v10');
    return cards[cards.length-1];
  }
  function applyParsedV29(modal,parsed){
    var filled=[];
    Object.keys(parsed.rows).forEach(function(name){
      var row=parsed.rows[name];
      var nums=row.nums;
      var card=findCardV29(modal,name);
      if(!card){card=addCardV29(modal);if(card)setValV29(card.querySelector('.exam-subject-name-v10'),name);}
      if(!card)return;
      setValV29(card.querySelector('.actual-v16'),nums[0]);
      setValV29(card.querySelector('.year-rank-v16'),row.yearRank!==null&&row.yearRank!==undefined?row.yearRank:nums[1]);
      setValV29(card.querySelector('.year-participants-v16'),row.yearRank!=null?nums[1]:nums[2]);
      setValV29(card.querySelector('.class-rank-v16'),row.classRank!==null&&row.classRank!==undefined?row.classRank:nums[3]);
      setValV29(card.querySelector('.city-rank-v28'),row.cityRank);
      filled.push(name+' '+(nums[0]!==undefined?nums[0]:'—')+(row.yearRank!=null||nums[1]!==undefined?'·年排'+(row.yearRank!=null?row.yearRank:nums[1]):''));
    });
    var sawRank=false;
    if(parsed.total){
      var t=parsed.total.nums;
      setValV29(modal.querySelector('.total-actual-override-v24'),t[0]);
      setValV29(modal.querySelector('#totalRankV16'),t[1]);
      setValV29(modal.querySelector('#totalParticipantsV16'),t[2]);
      setValV29(modal.querySelector('#totalClassRankV16'),parsed.total.classRank!=null?parsed.total.classRank:t[3]);
      setValV29(modal.querySelector('#totalClassParticipantsV16'),t[4]);
      if(parsed.total.cityRank!=null)setValV29(modal.querySelector('#totalCityRankV28'),parsed.total.cityRank);
      if(t[1]!==undefined||parsed.total.cityRank!=null)sawRank=true;
    }
    Object.keys(parsed.rows).forEach(function(n){
      var r=parsed.rows[n];
      if(r.yearRank!=null||r.cityRank!=null||r.classRank!=null||r.nums[1]!==undefined)sawRank=true;
    });
    if(sawRank){
      var modeBtn=modal.querySelector('[data-entry-mode-v17="rank"]');
      if(modeBtn&&modal.dataset.rankEntryModeV17!=='rank')modeBtn.click();
    }
    return filled;
  }

  // ---------- OCR：主流程 ----------
  async function runOcrV29(file,modal,btn){
    var orig=btn.textContent;
    btn.disabled=true;btn.textContent='识别中…';
    try{
      await ensureTesseractV29();
      var canvas=await prepareImageV29(file);
      if(!canvas)throw new Error('图片读取失败');
      var result=null,lastErr=null;
      var configs=ocrConfigsV29();
      for(var ci=0;ci<configs.length&&!result;ci++){
        try{
          result=await window.Tesseract.recognize(canvas,'chi_sim',Object.assign({
            langPath:ocrBaseV29(),
            gzip:true,
            logger:function(m){
              if(m&&m.status==='recognizing text'&&m.progress!=null)btn.textContent='识别中 '+Math.round(m.progress*100)+'%';
            }
          },configs[ci]));
        }catch(e){lastErr=e;}
      }
      if(!result)throw lastErr||new Error('识别失败');
      var text=result&&result.data&&result.data.text?result.data.text:'';
      var parsed=parseReportV29(text);
      var filled=applyParsedV29(modal,parsed);
      if(!filled.length)toast('没认出科目和分数，请换更清晰的成绩单截图（含科目名与数字）');
      else toast('已填入 '+filled.length+' 科：'+filled.slice(0,3).join('，')+(filled.length>3?'…':'')+'，请核对后保存');
    }catch(e){
      toast(e.message||'识别失败，请重试');
    }
    btn.disabled=false;btn.textContent=orig;
  }

  var openExamBeforeV29=(typeof openExam==='function')?openExam:null;
  if(openExamBeforeV29){
    openExam=function openExamV29(exam){
      openExamBeforeV29(exam);
      var modal=state.modal;
      if(!modal||modal.querySelector('#v29OcrBtn'))return;
      var toolbar=modal.querySelector('.exam-subject-toolbar-v10');
      if(!toolbar)return;
      var btn=document.createElement('button');
      btn.type='button';btn.id='v29OcrBtn';btn.className='secondary';
      btn.textContent='识别成绩单（拍照 / 截图自动填）';
      var file=document.createElement('input');
      file.type='file';file.accept='image/*';file.style.display='none';
      file.onchange=function(){
        if(file.files&&file.files[0])runOcrV29(file.files[0],modal,btn);
        file.value='';
      };
      btn.onclick=function(){file.click();};
      toolbar.insertBefore(btn,toolbar.firstChild);
      modal.appendChild(file);
    };
  }

  syncVersionV29();
})();
;
