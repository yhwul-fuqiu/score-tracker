// university-theme / v2.0: 梦想大学主题 + 录取线目标对标
// 用户选择梦想大学后，全局 UI 换用该校校色、校训与校园风景插画；
// 并可设置科类与高考日期，首页 hero 卡自动对比最新总分与投档线差距。
// 纯客户端功能：偏好存 localStorage（st_university_theme / st_goal_settings），
// 不改数据层。录取线数据见 admission-data.js（每年更新一次即可）。
(function () {
  var UT_KEY = 'st_university_theme';
  var GOAL_KEY = 'st_goal_settings';
  var UT_BASE_TITLE = document.title;
  var UT_META = document.querySelector('meta[name="theme-color"]');

  var THEMES = [
    { id: 'classic', name: '经典', motto: '默认配色', landmark: '' },
    { id: 'tsinghua', name: '清华大学', motto: '自强不息 · 厚德载物', landmark: '二校门 · 银杏道', accent: '#660874', deep: '#4A0557', soft: '#F5ECF9', tint: '#FAF6FC', glow: 'rgba(102,8,116,.22)', img: './assets/campuses/tsinghua.jpg' },
    { id: 'pku', name: '北京大学', motto: '思想自由 · 兼容并包', landmark: '博雅塔 · 未名湖', accent: '#94070A', deep: '#6E0507', soft: '#FBEDEE', tint: '#FCF4F5', glow: 'rgba(148,7,10,.22)', img: './assets/campuses/pku.jpg' },
    { id: 'fudan', name: '复旦大学', motto: '博学而笃志 · 切问而近思', landmark: '光华楼 · 梧桐道', accent: '#014098', deep: '#01306F', soft: '#E9F0FB', tint: '#F3F7FD', glow: 'rgba(1,64,152,.22)', img: './assets/campuses/fudan.jpg' },
    { id: 'sjtu', name: '上海交通大学', motto: '饮水思源 · 爱国荣校', landmark: '思源门 · 思源湖', accent: '#C8102E', deep: '#970B22', soft: '#FCEBED', tint: '#FDF4F5', glow: 'rgba(200,16,46,.22)', img: './assets/campuses/sjtu.jpg' },
    { id: 'zju', name: '浙江大学', motto: '求是创新', landmark: '求是大讲堂', accent: '#003F88', deep: '#002F66', soft: '#E8F0F9', tint: '#F2F7FC', glow: 'rgba(0,63,136,.22)', img: './assets/campuses/zju.jpg' },
    { id: 'nju', name: '南京大学', motto: '诚朴雄伟 · 励学敦行', landmark: '北大楼 · 爬山虎', accent: '#660691', deep: '#4C046B', soft: '#F4EBF9', tint: '#F9F5FB', glow: 'rgba(102,6,145,.22)', img: './assets/campuses/nju.jpg' },
    { id: 'ustc', name: '中国科学技术大学', motto: '红专并进 · 理实交融', landmark: '也西湖 · 图书馆', accent: '#003567', deep: '#002650', soft: '#E7EEF6', tint: '#F1F6FA', glow: 'rgba(0,53,103,.22)', img: './assets/campuses/ustc.jpg' },
    { id: 'ruc', name: '中国人民大学', motto: '实事求是', landmark: '明德楼群 · 一勺池', accent: '#A6192E', deep: '#7D1222', soft: '#FBECEE', tint: '#FCF4F6', glow: 'rgba(166,25,46,.22)', img: './assets/campuses/ruc.jpg' },
    { id: 'whu', name: '武汉大学', motto: '自强 · 弘毅 · 求是 · 拓新', landmark: '樱顶 · 老斋舍', accent: '#AD4D62', deep: '#863A4B', soft: '#FAEFF2', tint: '#FCF5F7', glow: 'rgba(173,77,98,.22)', img: './assets/campuses/whu.jpg' },
    { id: 'sysu', name: '中山大学', motto: '博学 审问 慎思 明辨 笃行', landmark: '怀士堂 · 康乐园', accent: '#006443', deep: '#004B32', soft: '#E8F4EE', tint: '#F2F9F5', glow: 'rgba(0,100,67,.22)', img: './assets/campuses/sysu.jpg' }
  ];

  function themeById(id) {
    for (var i = 0; i < THEMES.length; i++) if (THEMES[i].id === id) return THEMES[i];
    return null;
  }

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  // ---------- 目标设定 ----------
  function loadGoal() {
    try {
      var raw = localStorage.getItem(GOAL_KEY);
      var g = raw ? JSON.parse(raw) : null;
      return g && typeof g === 'object' ? g : {};
    } catch (e) { return {}; }
  }
  var GOAL = loadGoal();

  function saveGoal() {
    try { localStorage.setItem(GOAL_KEY, JSON.stringify(GOAL)); } catch (e) {}
  }

  function goalTrack() { return GOAL.track === 'history' ? 'history' : 'physics'; }

  function admissionLine(themeId) {
    var data = window.UT_ADMISSION;
    if (!data || !data.tracks) return null;
    var track = data.tracks[goalTrack()];
    if (!track) return null;
    var line = track.lines && track.lines[themeId];
    return line ? {
      score: line.score,
      rank: line.rank,
      label: data.year + ' ' + data.province + track.label + '投档线',
      trackLabel: track.label
    } : null;
  }

  function effectiveLine(themeId) {
    var official = admissionLine(themeId);
    var custom = Number(GOAL.customLine);
    if (GOAL.customLine && custom > 0) {
      return { score: custom, rank: official ? official.rank : null, label: '自定义目标线', official: official };
    }
    return official;
  }

  function fmtDateStr(d) {
    return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
  }

  function nextGaokaoDefault() {
    var now = new Date();
    var y = now.getFullYear();
    return now > new Date(y, 5, 9) ? fmtDateStr(new Date(y + 1, 5, 7)) : fmtDateStr(new Date(y, 5, 7));
  }

  function daysUntil(dateStr) {
    if (!dateStr) return null;
    var d = new Date(dateStr + 'T00:00:00');
    if (isNaN(d.getTime())) return null;
    var now = new Date();
    now.setHours(0, 0, 0, 0);
    return Math.round((d - now) / 86400000);
  }

  function gaokaoDate() { return GOAL.gaokaoDate || nextGaokaoDefault(); }

  function latestScore() {
    try {
      return typeof latestActualTotal === 'function' ? latestActualTotal() : null;
    } catch (e) { return null; }
  }

  // ---------- styles ----------
  function injectStyles() {
    if (document.getElementById('university-theme-style')) return;
    var style = document.createElement('style');
    style.id = 'university-theme-style';
    style.textContent = `
      /* ---- 主题变量消费（仅在选择大学后生效） ---- */
      /* 所有内页底色：校色光斑 + 轻纱 + 校园淡彩插画（fixed 固定视口尺寸，长页不拉伸） */
      html[data-ut] body{
        background:
          radial-gradient(circle at 8% 0%,var(--ut-soft) 0,transparent 30%),
          radial-gradient(circle at 92% 8%,var(--ut-tint) 0,transparent 26%),
          linear-gradient(rgba(253,254,255,.52),rgba(253,254,255,.72)),
          var(--ut-img);
        background-size:auto,auto,cover,cover;
        background-position:0 0,0 0,center,center;
        background-repeat:no-repeat;
        background-attachment:fixed;
      }
      html[data-ut] .logo{background:linear-gradient(145deg,var(--ut-deep),var(--accent))}
      html[data-ut] .splash .brand-mark{background:linear-gradient(145deg,var(--ut-deep),var(--accent))}
      html[data-ut] .hero-main{background:linear-gradient(145deg,rgba(255,255,255,.95),var(--ut-tint))}
      html[data-ut] .primary{background:linear-gradient(145deg,var(--accent),var(--ut-deep));box-shadow:0 8px 22px var(--ut-glow)}
      html[data-ut] .chip.active{background:var(--accent);border-color:var(--accent)}
      html[data-ut] .nav-btn.active{background:var(--accent-soft);color:var(--accent)}
      html[data-ut] .bottom-nav button.active{background:var(--accent-soft);color:var(--accent)}
      html[data-ut] .field input:focus{border-color:var(--accent);box-shadow:0 0 0 3px var(--ut-soft)}
      html[data-ut] .auth-page{background-image:linear-gradient(rgba(245,247,251,.88),rgba(245,247,251,.95)),var(--ut-img);background-size:cover;background-position:center}
      html[data-ut] .exclude-total-v17 input,html[data-ut] .radar-pick-option-v25 input{accent-color:var(--accent)}

      /* ---- 首页梦想大学 hero 卡片 ---- */
      .ut-hero{position:relative;overflow:hidden;border-radius:var(--radius);min-height:158px;display:flex;align-items:flex-end;margin-bottom:18px;box-shadow:var(--shadow);border:1px solid rgba(255,255,255,.9)}
      .ut-hero-media{position:absolute;inset:0;background-image:var(--ut-img);background-size:cover;background-position:center 62%}
      .ut-hero-veil{position:absolute;inset:0;background:linear-gradient(96deg,rgba(10,14,22,.76) 0%,rgba(10,14,22,.46) 46%,rgba(10,14,22,.06) 78%),linear-gradient(0deg,rgba(10,14,22,.36) 0,transparent 42%)}
      .ut-hero-body{position:relative;z-index:2;padding:20px 22px 19px;color:#fff;min-width:0;flex:1}
      .ut-hero-tag{display:inline-block;font-size:10px;letter-spacing:.28em;color:rgba(255,255,255,.85);border:1px solid rgba(255,255,255,.42);border-radius:999px;padding:4px 10px 4px 13px;background:rgba(255,255,255,.12)}
      .ut-hero-name{font-size:23px;font-weight:800;letter-spacing:.5px;margin:11px 0 3px;line-height:1.2;text-shadow:0 2px 14px rgba(0,0,0,.28)}
      .ut-hero-motto{font-size:12.5px;color:rgba(255,255,255,.92);letter-spacing:.08em}
      .ut-hero-landmark{font-size:11px;color:rgba(255,255,255,.62);margin-top:3px;letter-spacing:.04em}
      .ut-hero-actions{position:absolute;top:12px;right:12px;z-index:3;display:flex;gap:8px}
      .ut-hero-swap{border:1px solid rgba(255,255,255,.5);background:rgba(255,255,255,.16);color:#fff;font-size:11.5px;font-weight:650;padding:7px 12px;border-radius:999px}
      .ut-hero-swap:hover{background:rgba(255,255,255,.28)}

      /* ---- hero 对标面板 ---- */
      .ut-bench{margin-top:15px;padding:13px 15px;border-radius:14px;background:rgba(255,255,255,.13);border:1px solid rgba(255,255,255,.24);backdrop-filter:blur(6px)}
      .ut-bench-countdown{display:flex;justify-content:space-between;align-items:baseline;gap:10px;font-size:11.5px;color:rgba(255,255,255,.85);margin-bottom:10px}
      .ut-bench-countdown b{font-size:17px;font-weight:800;letter-spacing:-.3px}
      .ut-bench-row{display:flex;gap:26px;flex-wrap:wrap;align-items:baseline}
      .ut-bench-item span{display:block;font-size:10.5px;color:rgba(255,255,255,.66);letter-spacing:.04em}
      .ut-bench-item b{font-size:22px;font-weight:800;letter-spacing:-.6px;line-height:1.25}
      .ut-bench-item b.ut-gap-short{color:#FFD98E}
      .ut-bench-item b.ut-gap-reached{color:#8BEFC0}
      .ut-bench-bar{margin-top:11px;height:6px;border-radius:999px;background:rgba(255,255,255,.24);overflow:hidden}
      .ut-bench-bar i{display:block;height:100%;border-radius:999px;background:#fff;box-shadow:0 0 12px rgba(255,255,255,.6);transition:width .5s ease}
      .ut-bench-note{margin-top:9px;font-size:10.5px;color:rgba(255,255,255,.74);letter-spacing:.02em}
      .ut-bench-empty{margin-top:14px;padding:12px 14px;border-radius:14px;background:rgba(255,255,255,.13);border:1px dashed rgba(255,255,255,.34);font-size:12px;color:rgba(255,255,255,.88);display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}
      .ut-bench-empty button{border:1px solid rgba(255,255,255,.5);background:rgba(255,255,255,.16);color:#fff;font-size:11.5px;font-weight:650;padding:6px 12px;border-radius:999px}

      /* ---- 登录页入口条 ---- */
      .ut-login-strip{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:16px;padding:12px 14px;border-radius:14px;border:1px dashed var(--line);background:var(--accent-soft)}
      .ut-login-copy{min-width:0}
      .ut-login-copy b{display:block;font-size:13px;color:var(--text)}
      .ut-login-copy span{display:block;font-size:11px;color:var(--muted);margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      .ut-login-btn{flex:0 0 auto;border:1px solid var(--accent);color:var(--accent);background:#fff;border-radius:999px;padding:8px 14px;font-size:12px;font-weight:700}

      /* ---- 账号页设置卡 ---- */
      .ut-account-card{margin-top:18px;padding:24px}
      .ut-account-current{display:flex;align-items:center;gap:13px;margin-top:14px;padding:12px;border:1px solid var(--line);border-radius:14px;background:#fff}
      .ut-account-thumb{width:66px;height:47px;border-radius:10px;background-color:var(--accent-soft);background-size:cover;background-position:center;flex:0 0 auto}
      .ut-account-plain-thumb{display:grid;place-items:center;color:var(--muted);font-size:11px;letter-spacing:.2em}
      .ut-account-meta{min-width:0}
      .ut-account-meta b{display:block;font-size:14px}
      .ut-account-meta span{display:block;font-size:11px;color:var(--muted);margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      .ut-account-btn{margin-left:auto;flex:0 0 auto}
      .ut-account-goal{display:flex;align-items:center;gap:13px;margin-top:10px;padding:12px;border:1px solid var(--line);border-radius:14px;background:#fff}
      .ut-account-goal-meta{min-width:0}
      .ut-account-goal-meta b{display:block;font-size:14px}
      .ut-account-goal-meta span{display:block;font-size:11px;color:var(--muted);margin-top:2px}

      /* ---- 选择器 / 目标设定弹窗 ---- */
      .ut-picker{width:min(720px,100%)}
      .ut-goal-modal{width:min(520px,100%)}
      .ut-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
      .ut-card{position:relative;border:2px solid var(--line);border-radius:16px;overflow:hidden;background:#fff;padding:0;text-align:left;display:block;transition:transform .15s}
      .ut-card:hover{transform:translateY(-2px)}
      .ut-card.active{border-color:var(--accent);box-shadow:0 0 0 3px var(--accent-soft)}
      .ut-card-img{display:block;height:84px;background-color:var(--accent-soft);background-size:cover;background-position:center}
      .ut-card-plain .ut-card-img{background:linear-gradient(145deg,#eef1ff,#f6f8fc);display:grid;place-items:center;color:var(--muted);font-size:11px;letter-spacing:.3em}
      .ut-card-body{display:block;padding:10px 12px 12px}
      .ut-card-body b{display:block;font-size:13.5px}
      .ut-card-body span{display:block;font-size:10.5px;color:var(--muted);margin-top:3px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      .ut-card-badge{position:absolute;top:8px;right:8px;background:var(--accent);color:#fff;font-size:10px;font-weight:700;padding:3px 8px;border-radius:999px}
      .ut-goal-line-preview{font-size:12px;color:var(--muted);margin:6px 0 0}
      .ut-goal-line-preview b{color:var(--text)}

      @media(max-width:620px){
        .ut-hero{min-height:138px}
        .ut-hero-name{font-size:19px}
        .ut-hero-body{padding:16px 16px 15px}
        .ut-grid{grid-template-columns:repeat(2,1fr)}
        .ut-bench{padding:11px 12px}
        .ut-bench-item b{font-size:19px}
        .ut-bench-row{gap:18px}
      }
    `;
    document.head.appendChild(style);
  }

  // ---------- 应用主题 ----------
  function setMetaColor(color) {
    if (UT_META) UT_META.setAttribute('content', color);
  }

  function applyTheme(id) {
    var t = themeById(id) || THEMES[0];
    CURRENT = t;
    var root = document.documentElement;
    var vars = ['--accent', '--accent-soft', '--ut-deep', '--ut-soft', '--ut-glow', '--ut-tint', '--ut-img'];
    for (var i = 0; i < vars.length; i++) root.style.removeProperty(vars[i]);
    if (t.id === 'classic') {
      root.removeAttribute('data-ut');
      try { localStorage.removeItem(UT_KEY); } catch (e) {}
      document.title = UT_BASE_TITLE;
      setMetaColor('#f7f8fb');
      if (typeof toast === 'function') toast('已恢复默认主题');
    } else {
      root.setAttribute('data-ut', t.id);
      root.style.setProperty('--accent', t.accent);
      root.style.setProperty('--accent-soft', t.soft);
      root.style.setProperty('--ut-deep', t.deep);
      root.style.setProperty('--ut-soft', t.soft);
      root.style.setProperty('--ut-glow', t.glow);
      root.style.setProperty('--ut-tint', t.tint);
      root.style.setProperty('--ut-img', 'url("' + t.img + '")');
      try { localStorage.setItem(UT_KEY, t.id); } catch (e) {}
      document.title = '成绩轨迹 · ' + t.name;
      setMetaColor(t.soft);
      if (typeof toast === 'function') toast('已切换为' + t.name + '主题');
    }
    refreshInjected();
  }

  // ---------- 界面注入 ----------
  function benchHtml(t) {
    var line = effectiveLine(t.id);
    var days = daysUntil(gaokaoDate());
    var gkYear = gaokaoDate().slice(0, 4);
    var countdown = '';
    if (days !== null && days >= 0) {
      countdown = '<span>距 ' + gkYear + ' 年高考</span><span><b>' + days + '</b> 天</span>';
    }
    if (!line) {
      return '<div class="ut-bench-empty"><span>' + esc(t.name) + '在广东' + esc(goalTrack() === 'history' ? '历史类' : '物理类') + '暂无招生计划，可设置自定义目标线</span>'
        + '<button type="button" id="utBenchGoalBtn">设置目标</button></div>';
    }
    var actual = latestScore();
    var items = '<div class="ut-bench-item"><span>最新总分</span><b>' + (actual === null ? '—' : actual) + '</b></div>'
      + '<div class="ut-bench-item"><span>目标线</span><b>' + line.score + '</b></div>';
    var barNote = esc(line.label) + (line.rank ? ' · 最低排位 ' + line.rank : '') + '，投档线每年浮动，仅供参考';
    var bar = '';
    if (actual !== null) {
      var pct = Math.max(2, Math.min(100, Math.round(actual / line.score * 100)));
      var gap = Math.round((actual - line.score) * 10) / 10;
      items += '<div class="ut-bench-item"><span>' + (gap >= 0 ? '超出' : '差距') + '</span><b class="' + (gap >= 0 ? 'ut-gap-reached' : 'ut-gap-short') + '">' + (gap >= 0 ? '+' : '') + gap + '</b></div>';
      bar = '<div class="ut-bench-bar"><i style="width:' + pct + '%"></i></div>'
        + '<div class="ut-bench-note">当前达成率 ' + pct + '% · ' + barNote + '</div>';
    } else {
      bar = '<div class="ut-bench-note">记录真实成绩后，这里会自动对比目标线 · ' + barNote + '</div>';
    }
    return '<div class="ut-bench">'
      + (countdown ? '<div class="ut-bench-countdown">' + countdown + '</div>' : '')
      + '<div class="ut-bench-row">' + items + '</div>' + bar + '</div>';
  }

  function utHeroHtml() {
    var t = CURRENT;
    return '<section class="ut-hero" id="utHero">'
      + '<div class="ut-hero-media"></div><div class="ut-hero-veil"></div>'
      + '<div class="ut-hero-body">'
      + '<span class="ut-hero-tag">梦想大学</span>'
      + '<div class="ut-hero-name">' + esc(t.name) + '</div>'
      + '<div class="ut-hero-motto">' + esc(t.motto) + '</div>'
      + '<div class="ut-hero-landmark">' + esc(t.landmark) + '</div>'
      + benchHtml(t)
      + '</div>'
      + '<div class="ut-hero-actions">'
      + '<button type="button" class="ut-hero-swap" id="utGoalBtn">目标设定</button>'
      + '<button type="button" class="ut-hero-swap" id="utSwapBtn">换大学</button>'
      + '</div>'
      + '</section>';
  }

  function utLoginStripHtml() {
    var t = CURRENT;
    var copy;
    var btn;
    if (t.id === 'classic') {
      copy = '<b>为梦想而战</b><span>选一所梦想大学，换上它的校色与校园风景</span>';
      btn = '选择大学';
    } else {
      var line = effectiveLine(t.id);
      copy = '<b>' + esc(t.name) + '</b><span>' + esc(t.motto) + (line ? ' · ' + line.label + ' ' + line.score + ' 分' : '') + '</span>';
      btn = '更换';
    }
    return '<div class="ut-login-strip" id="utLoginStrip">'
      + '<div class="ut-login-copy">' + copy + '</div>'
      + '<button type="button" class="ut-login-btn" id="utLoginPickBtn">' + btn + '</button>'
      + '</div>';
  }

  function utAccountHtml() {
    var t = CURRENT;
    var thumb;
    var meta;
    if (t.id === 'classic') {
      thumb = '<div class="ut-account-thumb ut-account-plain-thumb">默认</div>';
      meta = '<b>经典</b><span>默认蓝灰配色，尚未选择梦想大学</span>';
    } else {
      thumb = '<div class="ut-account-thumb" style="background-image:url(&quot;' + t.img + '&quot;)"></div>';
      meta = '<b>' + esc(t.name) + '</b><span>' + esc(t.motto) + '</span>';
    }
    var goalRow = '';
    if (t.id !== 'classic') {
      var line = effectiveLine(t.id);
      var trackLabel = goalTrack() === 'history' ? '历史类' : '物理类';
      var goalMeta = line
        ? '<b>目标线 ' + line.score + ' 分' + (line.rank ? ' · 排位 ' + line.rank : '') + '</b><span>' + esc(line.label) + ' · 高考 ' + esc(gaokaoDate()) + ' · ' + trackLabel + '</span>'
        : '<b>目标未设置</b><span>' + esc(t.name) + '在广东' + trackLabel + '暂无招生，可设自定义目标线</span>';
      goalRow = '<div class="ut-account-goal">'
        + '<div class="ut-account-goal-meta">' + goalMeta + '</div>'
        + '<button type="button" class="secondary ut-account-btn" id="utGoalBtn2">目标设定</button>'
        + '</div>';
    }
    return '<div class="card ut-account-card" id="utAccount">'
      + '<div class="card-title-row"><div><h3 class="card-title">外观 · 梦想大学主题</h3><p class="card-sub">选择你的梦想大学，整个界面换用该校校色与校园风景，并对标录取线</p></div></div>'
      + '<div class="ut-account-current">' + thumb
      + '<div class="ut-account-meta">' + meta + '</div>'
      + '<button type="button" class="secondary ut-account-btn" id="utAccountBtn">更换</button>'
      + '</div>' + goalRow + '</div>';
  }

  function bindGoalButtons() {
    var b1 = document.getElementById('utGoalBtn');
    if (b1) b1.onclick = openGoalModal;
    var b2 = document.getElementById('utGoalBtn2');
    if (b2) b2.onclick = openGoalModal;
    var b3 = document.getElementById('utBenchGoalBtn');
    if (b3) b3.onclick = openGoalModal;
  }

  function enhance() {
    var logged = (typeof state !== 'undefined') && state && state.user;
    if (logged) {
      var content = document.getElementById('content');
      if (content) {
        if (state.page === 'home' && CURRENT.id !== 'classic' && !document.getElementById('utHero')) {
          content.insertAdjacentHTML('afterbegin', utHeroHtml());
          var swap = document.getElementById('utSwapBtn');
          if (swap) swap.onclick = openPicker;
          bindGoalButtons();
        }
        if (state.page === 'account' && !document.getElementById('utAccount')) {
          content.insertAdjacentHTML('beforeend', utAccountHtml());
          var accBtn = document.getElementById('utAccountBtn');
          if (accBtn) accBtn.onclick = openPicker;
          bindGoalButtons();
        }
      }
    } else {
      var card = document.querySelector('.auth-card');
      if (card && !card.querySelector('#utLoginStrip')) {
        var help = card.querySelector('.auth-help');
        if (help) help.insertAdjacentHTML('beforebegin', utLoginStripHtml());
        else card.insertAdjacentHTML('beforeend', utLoginStripHtml());
        var pick = document.getElementById('utLoginPickBtn');
        if (pick) pick.onclick = openPicker;
      }
    }
  }

  function refreshInjected() {
    var ids = ['utHero', 'utLoginStrip', 'utAccount'];
    for (var i = 0; i < ids.length; i++) {
      var n = document.getElementById(ids[i]);
      if (n && n.parentNode) n.parentNode.removeChild(n);
    }
    enhance();
  }

  // ---------- 选择器弹窗 ----------
  function pickerCardHtml(t) {
    var active = t.id === CURRENT.id;
    var img = t.id === 'classic'
      ? ''
      : ' style="background-image:url(&quot;' + t.img + '&quot;)"';
    return '<button type="button" class="ut-card' + (t.id === 'classic' ? ' ut-card-plain' : '') + (active ? ' active' : '') + '" data-ut-pick="' + t.id + '">'
      + '<span class="ut-card-img"' + img + '></span>'
      + '<span class="ut-card-body"><b>' + esc(t.name) + '</b><span>' + esc(t.motto) + '</span></span>'
      + (active ? '<span class="ut-card-badge">当前</span>' : '')
      + '</button>';
  }

  function closePicker() {
    var w = document.getElementById('utPicker');
    if (w && w.parentNode) w.parentNode.removeChild(w);
  }

  function openPicker() {
    closePicker();
    var wrap = document.createElement('div');
    wrap.className = 'modal-backdrop';
    wrap.id = 'utPicker';
    wrap.innerHTML = '<div class="modal ut-picker">'
      + '<div class="modal-head"><h3>选择你的梦想大学</h3><button type="button" class="close-btn" data-ut-close aria-label="关闭">×</button></div>'
      + '<div class="modal-body">'
      + '<div class="ut-grid">' + THEMES.map(pickerCardHtml).join('') + '</div>'
      + '<p class="form-note" style="margin-bottom:0">主题与目标设定只保存在这台设备上，不影响成绩数据；录取线为 2026 年广东投档参考，每年更新。</p>'
      + '</div></div>';
    wrap.addEventListener('click', function (e) {
      if (e.target === wrap) { closePicker(); return; }
      if (e.target.closest && e.target.closest('[data-ut-close]')) { closePicker(); return; }
      var btn = e.target.closest && e.target.closest('[data-ut-pick]');
      if (btn) {
        applyTheme(btn.getAttribute('data-ut-pick'));
        closePicker();
      }
    });
    document.body.appendChild(wrap);
  }

  // ---------- 目标设定弹窗 ----------
  function closeGoalModal() {
    var w = document.getElementById('utGoalModal');
    if (w && w.parentNode) w.parentNode.removeChild(w);
  }

  function openGoalModal() {
    closeGoalModal();
    var wrap = document.createElement('div');
    wrap.className = 'modal-backdrop';
    wrap.id = 'utGoalModal';
    var track = goalTrack();
    var official = admissionLine(CURRENT.id);
    var placeholder = official ? official.score : 675;
    wrap.innerHTML = '<div class="modal ut-goal-modal">'
      + '<div class="modal-head"><h3>目标设定 · ' + esc(CURRENT.name) + '</h3><button type="button" class="close-btn" data-utg-close aria-label="关闭">×</button></div>'
      + '<div class="modal-body">'
      + '<div class="form-grid">'
      + '<div class="field"><label>科类（2026 广东投档线）</label><div class="chips">'
      + '<button type="button" class="chip' + (track === 'physics' ? ' active' : '') + '" data-utg-track="physics">物理类</button>'
      + '<button type="button" class="chip' + (track === 'history' ? ' active' : '') + '" data-utg-track="history">历史类</button>'
      + '</div></div>'
      + '<div class="field"><label>高考日期</label><input id="utGaokaoDate" type="date" value="' + esc(gaokaoDate()) + '"></div>'
      + '</div>'
      + '<div class="field" style="margin-top:14px"><label>自定义目标线（留空使用官方投档线）</label>'
      + '<input id="utCustomLine" inputmode="decimal" placeholder="例如 ' + placeholder + '" value="' + (GOAL.customLine || '') + '">'
      + '<p class="ut-goal-line-preview" id="utLinePreview"></p>'
      + '</div>'
      + '<p class="form-note">总分对比按高考 750 分制；若学校考试满分不同，建议按比例换算后设置自定义目标线。设定仅保存在本机。</p>'
      + '<div class="modal-actions"><button type="button" class="secondary" data-utg-close>取消</button><button type="button" class="primary" id="utGoalSave">保存</button></div>'
      + '</div></div>';

    var preview = wrap.querySelector('#utLinePreview');
    var trackBtns = wrap.querySelectorAll('[data-utg-track]');
    var dateInput = wrap.querySelector('#utGaokaoDate');
    var customInput = wrap.querySelector('#utCustomLine');

    function refreshPreview() {
      var activeTrack = wrap.querySelector('[data-utg-track].active');
      var tk = activeTrack ? activeTrack.getAttribute('data-utg-track') : 'physics';
      var data = window.UT_ADMISSION;
      var line = data && data.tracks[tk] ? data.tracks[tk].lines[CURRENT.id] : null;
      if (line) {
        preview.innerHTML = '官方参考：' + data.year + ' 广东' + data.tracks[tk].label + '投档线 <b>' + line.score + '</b> 分 · 最低排位 ' + line.rank;
      } else {
        preview.textContent = '官方参考：该校在广东' + (tk === 'history' ? '历史类' : '物理类') + '暂无招生计划，建议设置自定义目标线';
      }
    }
    refreshPreview();

    trackBtns.forEach(function (b) {
      b.onclick = function () {
        trackBtns.forEach(function (x) { x.classList.remove('active'); });
        b.classList.add('active');
        refreshPreview();
      };
    });

    wrap.addEventListener('click', function (e) {
      if (e.target === wrap) { closeGoalModal(); return; }
      if (e.target.closest && e.target.closest('[data-utg-close]')) { closeGoalModal(); return; }
    });
    wrap.querySelector('#utGoalSave').onclick = function () {
      var activeTrack = wrap.querySelector('[data-utg-track].active');
      GOAL.track = activeTrack ? activeTrack.getAttribute('data-utg-track') : 'physics';
      GOAL.gaokaoDate = dateInput.value || nextGaokaoDefault();
      var custom = parseFloat(customInput.value);
      GOAL.customLine = (!isNaN(custom) && custom > 0) ? custom : '';
      saveGoal();
      closeGoalModal();
      if (typeof toast === 'function') toast('目标已保存');
      refreshInjected();
    };
    document.body.appendChild(wrap);
  }

  // ---------- init ----------
  injectStyles();
  var saved = null;
  try { saved = localStorage.getItem(UT_KEY); } catch (e) {}
  var CURRENT = themeById(saved) || THEMES[0];
  applyTheme(CURRENT.id);
  var appRoot = document.getElementById('app');
  if (appRoot && typeof MutationObserver !== 'undefined') {
    new MutationObserver(function () { enhance(); }).observe(appRoot, { childList: true, subtree: true });
  }
  enhance();
})();
