// university-theme / v1.0: 梦想大学主题系统
// 用户选择梦想大学后，全局 UI 换用该校校色、校训与校园风景插画。
// 纯客户端功能：偏好存 localStorage（st_university_theme），不改数据层。
// 结构：配置表 → CSS 变量注入 → MutationObserver 注入界面元素（首页 hero 卡、
// 登录页入口、账号页设置卡）→ 选择器弹窗（复用应用既有 modal 样式）。
(function () {
  var UT_KEY = 'st_university_theme';
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

  var saved = null;
  try { saved = localStorage.getItem(UT_KEY); } catch (e) {}
  var CURRENT = themeById(saved) || THEMES[0];

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  // ---------- styles ----------
  function injectStyles() {
    if (document.getElementById('university-theme-style')) return;
    var style = document.createElement('style');
    style.id = 'university-theme-style';
    style.textContent = `
      /* ---- 主题变量消费（仅在选择大学后生效） ---- */
      /* 所有内页底色：校色光斑 + 白色薄纱遮罩 + 校园淡彩插画（全站生效，卡片仍为净白） */
      html[data-ut] body{
        background:
          radial-gradient(circle at 8% 0%,var(--ut-soft) 0,transparent 30%),
          radial-gradient(circle at 92% 8%,var(--ut-tint) 0,transparent 26%),
          linear-gradient(rgba(253,254,255,.86),rgba(253,254,255,.94)),
          var(--ut-img);
        background-size:auto,auto,cover,cover;
        background-position:0 0,0 0,center,center;
        background-repeat:no-repeat;
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
      .ut-hero-veil{position:absolute;inset:0;background:linear-gradient(96deg,rgba(10,14,22,.74) 0%,rgba(10,14,22,.4) 46%,rgba(10,14,22,.06) 78%),linear-gradient(0deg,rgba(10,14,22,.32) 0,transparent 42%)}
      .ut-hero-body{position:relative;z-index:2;padding:20px 22px 19px;color:#fff;min-width:0}
      .ut-hero-tag{display:inline-block;font-size:10px;letter-spacing:.28em;color:rgba(255,255,255,.85);border:1px solid rgba(255,255,255,.42);border-radius:999px;padding:4px 10px 4px 13px;background:rgba(255,255,255,.12)}
      .ut-hero-name{font-size:23px;font-weight:800;letter-spacing:.5px;margin:11px 0 3px;line-height:1.2;text-shadow:0 2px 14px rgba(0,0,0,.28)}
      .ut-hero-motto{font-size:12.5px;color:rgba(255,255,255,.92);letter-spacing:.08em}
      .ut-hero-landmark{font-size:11px;color:rgba(255,255,255,.62);margin-top:3px;letter-spacing:.04em}
      .ut-hero-swap{position:absolute;top:12px;right:12px;z-index:3;border:1px solid rgba(255,255,255,.5);background:rgba(255,255,255,.16);color:#fff;font-size:11.5px;font-weight:650;padding:7px 12px;border-radius:999px}
      .ut-hero-swap:hover{background:rgba(255,255,255,.28)}

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

      /* ---- 选择器弹窗 ---- */
      .ut-picker{width:min(720px,100%)}
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

      @media(max-width:620px){
        .ut-hero{min-height:138px}
        .ut-hero-name{font-size:19px}
        .ut-hero-body{padding:16px 16px 15px}
        .ut-grid{grid-template-columns:repeat(2,1fr)}
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
    var vars = ['--accent', '--accent-soft', '--ut-deep', '--ut-glow', '--ut-tint', '--ut-img'];
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
  function utHeroHtml() {
    var t = CURRENT;
    return '<section class="ut-hero" id="utHero">'
      + '<div class="ut-hero-media"></div><div class="ut-hero-veil"></div>'
      + '<div class="ut-hero-body">'
      + '<span class="ut-hero-tag">梦想大学</span>'
      + '<div class="ut-hero-name">' + esc(t.name) + '</div>'
      + '<div class="ut-hero-motto">' + esc(t.motto) + '</div>'
      + '<div class="ut-hero-landmark">' + esc(t.landmark) + '</div>'
      + '</div>'
      + '<button type="button" class="ut-hero-swap" id="utSwapBtn">更换主题</button>'
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
      copy = '<b>' + esc(t.name) + '</b><span>' + esc(t.motto) + ' · 主题已应用</span>';
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
    return '<div class="card ut-account-card" id="utAccount">'
      + '<div class="card-title-row"><div><h3 class="card-title">外观 · 梦想大学主题</h3><p class="card-sub">选择你的梦想大学，整个界面换用该校校色与校园风景</p></div></div>'
      + '<div class="ut-account-current">' + thumb
      + '<div class="ut-account-meta">' + meta + '</div>'
      + '<button type="button" class="secondary ut-account-btn" id="utAccountBtn">更换</button>'
      + '</div></div>';
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
        }
        if (state.page === 'account' && !document.getElementById('utAccount')) {
          content.insertAdjacentHTML('beforeend', utAccountHtml());
          var accBtn = document.getElementById('utAccountBtn');
          if (accBtn) accBtn.onclick = openPicker;
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
      + '<p class="form-note" style="margin-bottom:0">主题只影响这台设备上的界面外观，不影响成绩数据；后续将与目标院校对标功能联动。</p>'
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

  // ---------- init ----------
  injectStyles();
  applyTheme(CURRENT.id);
  var appRoot = document.getElementById('app');
  if (appRoot && typeof MutationObserver !== 'undefined') {
    new MutationObserver(function () { enhance(); }).observe(appRoot, { childList: true, subtree: true });
  }
  enhance();
})();
