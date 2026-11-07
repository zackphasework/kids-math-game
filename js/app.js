/* Power-Up Math: screens (players, base and upgrades, world map, training, and the Big Rig Builders
   town, garage and job site), and the game shell: HUD, controls, in-game math banner and refills. */
(function () {
'use strict';
const {esc, pick, clamp} = PUM.util;
const icon = PUM.icon, store = PUM.store, S = store.S, A = PUM.audio, CP = PUM.CAMPAIGN, R = PUM.RIG;
const app = document.getElementById('app');
const shell = document.getElementById('game');

/* ---------- effects ---------- */
PUM.fx = {
  burst(el) {
    if (!el || PUM.util.reduced()) return;
    const r = el.getBoundingClientRect(), fx = document.getElementById('fx');
    for (let i = 0; i < 12; i++) {
      const s = document.createElement('span'), a = Math.random() * Math.PI * 2, d = 60 + Math.random() * 80;
      s.className = 'spark'; s.style.left = (r.left + r.width / 2) + 'px'; s.style.top = (r.top + r.height / 2) + 'px';
      s.style.setProperty('--dx', (Math.cos(a) * d).toFixed(0) + 'px'); s.style.setProperty('--dy', (Math.sin(a) * d - 30).toFixed(0) + 'px');
      s.style.setProperty('--c', `var(--${pick(['star', 'marigold', 'mint', 'rose'])})`);
      s.innerHTML = icon('star', 'fill'); fx.appendChild(s); setTimeout(() => s.remove(), 900);
    }
  },
  toast(html) {
    const t = document.getElementById('toast'); t.innerHTML = html; t.hidden = false;
    clearTimeout(PUM.fx._t); PUM.fx._t = setTimeout(() => { t.hidden = true; }, 1800);
  },
};

/* ---------- state ---------- */
let view = 'home', pid = null, draft = null, confirmDel = false, showSync = false, showWorlds = false, sel = null;
let quiz = null, train = null, play = null, result = null;
let townSel = null, townConfirm = false, jobFrom = null, jobResult = null, bg = null;
const P = () => S.players.find(p => p.id === pid);
const assistOf = p => p.age <= 5 ? 2 : p.age <= 7 ? 1 : 0;
const UPS = p => CP.upgrades[p.theme];
const camp = p => CP[p.theme];
const isRig = p => p && p.theme === 'trucks';
const curName = p => isRig(p) ? 'coins' : 'math points';

/* ---------- small renderers ---------- */
const muteBtn = () => `<button class="icon-btn" id="mute" data-act="mute" aria-label="${S.muted ? 'Turn sound on' : 'Turn sound off'}" aria-pressed="${S.muted}">${icon(S.muted ? 'mute' : 'sound')}</button>`;
const backBtn = (to, label = 'Back') => `<button class="icon-btn" data-act="back" data-to="${to}" aria-label="${label}">${icon('back')}</button>`;
const avatar = (p, cls) => `<span class="avatar ${cls}">${PUM.avatarSVG(p)}</span>`;
const mpChip = p => `<span class="mp-chip" id="mp-chip">${icon(isRig(p) ? 'coin' : 'bolt', isRig(p) ? 'coin' : '')} <b>${p.mp}</b> ${curName(p)}</span>`;
const starsRow = (n, size = '') => `<span class="mini-stars ${size}">${[0, 1, 2].map(i => `<i class="${i < n ? 'on' : ''}">${icon('star', 'fill')}</i>`).join('')}</span>`;
function syncChip() {
  const s = store.sync.state, fam = store.family();
  let panel = '';
  if (showSync) {
    if (fam && s !== 'badcode') panel = `<div class="sync-panel"><p>Players and progress show up on every phone or tablet that has joined with this family code: <span class="code">${store.prettyCode(fam)}</span></p><div class="join-row"><button class="btn small" data-act="copy-link">Copy family link</button></div><p id="copy-note" hidden style="overflow-wrap:anywhere"></p></div>`;
    else panel = `<div class="sync-panel"><p>Enter the family code to share players and progress with the family's other phones and tablets.</p><div class="join-row"><input id="joincode" class="field" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="ABCD-EFGH-JKLM"><button class="btn small primary" data-act="join">Join</button></div>${store.sync.joinErr ? `<p class="err">${esc(store.sync.joinErr)}</p>` : ''}</div>`;
  }
  return `<div class="sync" id="sync"><button class="sync-b" data-s="${s}" data-act="sync-info" aria-expanded="${showSync}"><span class="dot"></span>${store.SYNC_TEXT[s]}${!fam ? ' · Join family' : ''}</button>${panel}</div>`;
}
store.sync.onChange = () => { const el = document.getElementById('sync'); if (el) el.outerHTML = syncChip(); };
store.sync.onPulled = () => { if (pid && !P()) { pid = null; if (view !== 'form') view = 'home'; } if (view === 'home' || view === 'base' || view === 'map' || view === 'garage') render(); };

/* ---------- screens ---------- */
function renderHome() {
  const ps = [...S.players].sort((a, b) => a.created - b.created);
  return `
  <header class="top"><div><h1>Power-Up Math</h1><p class="sub">Solve math to power up your trucks, your soccer team or your hero.</p></div>${muteBtn()}</header>
  <div class="hero-strip" aria-hidden="true">${PUM.truckSVG('excavator', 'marigold')}${PUM.jerseySVG('sea', '9')}${PUM.heroSVG(0, 'berry')}</div>
  <section class="block"><h2>Who's playing?</h2>
    <div class="players">${ps.map(p => { const pr = p.prog[p.theme]; return `<button class="player" data-act="open" data-id="${p.id}">${avatar(p, 'av')}<span class="pname">${esc(p.name)}</span><span class="pmeta">${PUM.THEMES[p.theme].name} &middot; ${isRig(p) ? `${R.builtCount(p)} built` : `level ${pr.unlocked + 1}`}</span></button>`; }).join('')}
      <button class="player add" data-act="add-player">${icon('plus')}<span>Add player</span></button></div>
    ${ps.length ? '' : `<p class="empty-note">Add each kid once with their name, age and favourite theme. They'll start at the right math level.</p>`}
    ${syncChip()}
  </section>`;
}
function renderForm() {
  const d = draft, editing = !!d.id;
  const art = {trucks:PUM.truckSVG('dump', d.color), soccer:PUM.jerseySVG(d.color, (d.name || '?').trim().charAt(0).toUpperCase() || '?'), anime:PUM.heroSVG(d.hero, d.color)};
  const [l, t] = PUM.AGE_START[d.age];
  return `
  <header class="top">${backBtn(editing ? 'base' : 'home')}<h2 class="title">${editing ? 'Edit player' : 'New player'}</h2><span style="width:52px"></span></header>
  <div class="form">
    <div class="preview">${avatar(d, 'av-big')}<span id="pv-name">${esc(d.name || 'Name')}</span></div>
    <label class="lab" for="pname">Name</label>
    <input id="pname" class="field" maxlength="16" autocomplete="off" autocapitalize="words" spellcheck="false" placeholder="Type a name" value="${esc(d.name)}">
    <div class="lab">Pick a theme</div>
    <div class="themes">${PUM.THEME_IDS.map(th => `<button class="theme-b ${d.theme === th ? 'on' : ''}" data-act="pick" data-k="theme" data-v="${th}" aria-pressed="${d.theme === th}">${art[th]}<span>${PUM.THEMES[th].name}</span></button>`).join('')}</div>
    ${d.theme === 'anime' ? `<div class="lab">Pick a hero</div><div class="themes">${PUM.HEROES.map((h, i) => `<button class="theme-b ${d.hero === i ? 'on' : ''}" data-act="pick" data-k="hero" data-v="${i}" aria-pressed="${d.hero === i}">${PUM.heroSVG(i, d.color)}<span>${h.name}</span></button>`).join('')}</div>` : ''}
    <div class="lab">Colour</div>
    <div class="swatches">${PUM.COLORS.map(c => `<button class="sw ${d.color === c ? 'on' : ''}" data-act="pick" data-k="color" data-v="${c}" style="--c:var(--${c})" aria-label="${c}" aria-pressed="${d.color === c}"></button>`).join('')}</div>
    <div class="lab">Age</div>
    <div class="ages">${PUM.AGES.map(a => `<button class="age ${d.age === a ? 'on' : ''}" data-act="pick" data-k="age" data-v="${a}" aria-pressed="${d.age === a}">${a === 12 ? '12+' : a}</button>`).join('')}</div>
    <p class="hint-text">Math starts at ${PUM.LV[l].name}, step ${t + 1}. It gets easier or harder as they play.</p>
    <button class="btn primary wide" id="save-btn" data-act="save-player" ${d.name.trim() ? '' : 'disabled'}>${editing ? 'Save changes' : 'Add player'}</button>
    ${editing ? `<button class="btn ghost wide" data-act="del-player">${confirmDel ? `Tap again to remove ${esc(d.name)} and their progress` : 'Remove player'}</button>` : ''}
  </div>`;
}
function upgradeCards(p) {
  return UPS(p).map(u => {
    const lvl = p.up[u.k], max = lvl >= CP.maxUp, cost = max ? 0 : CP.cost[lvl], can = !max && p.mp >= cost;
    return `<div class="upg ${max ? 'max' : ''}">
      <div class="upg-head"><b>${u.name}</b><span class="pips" aria-label="Level ${lvl} of ${CP.maxUp}">${Array.from({length:CP.maxUp}, (_, i) => `<i class="${i < lvl ? 'on' : ''}"></i>`).join('')}</span></div>
      <p>${u.what}</p>
      ${max ? '<span class="upg-max">Maxed out</span>' : `<button class="btn small ${can ? 'go' : ''}" data-act="upgrade" data-k="${u.k}" ${can ? '' : 'aria-disabled="true"'}>${icon(isRig(p) ? 'coin' : 'bolt', isRig(p) ? 'coin' : '')} ${can ? `Upgrade · ${cost}` : `Need ${cost}`}</button>`}
    </div>`;
  }).join('');
}
function nextLevel(p) { return CP.level(p.theme, p.prog[p.theme].unlocked); }
function renderBase() {
  const p = P(), th = PUM.THEMES[p.theme], nl = nextLevel(p), pw = CP.power(p), w = PUM.LV[p.world], L = p.levels[p.world], tier = L ? L.tier : 0;
  const weak = pw < nl.power;
  const wd = camp(p).worlds[nl.world];
  return `
  <header class="top">${backBtn('home', 'Back to players')}<div class="who">${avatar(p, 'av-sm')}<div style="min-width:0"><h2 class="title">${esc(p.name)}</h2><span class="pmeta">${th.base}</span></div></div><button class="icon-btn" data-act="edit" aria-label="Edit ${esc(p.name)}">${icon('pencil')}</button></header>
  <section class="mission">
    <div class="mission-head"><span class="kicker">${th.game} &middot; ${esc(wd.name)}</span>${mpChip(p)}</div>
    <h3>Level ${nl.i + 1}: ${esc(nl.name)}</h3>
    <p class="act-sub">${esc(nl.nw)}</p>
    <div class="power-row ${weak ? 'weak' : ''}"><span>${icon('bolt')} Your power <b>${pw}</b></span><span>Recommended <b>${nl.power}</b></span></div>
    ${weak ? `<p class="hint-text warn">This level is tough at your power. Earn math points and upgrade first!</p>` : ''}
    <button class="btn go big wide" data-act="map">${icon('play')} Play</button>
    <button class="btn primary wide" data-act="train">${icon('brain')} Earn math points</button>
  </section>
  <section class="block"><h2>Upgrade your ${th.base.toLowerCase()}</h2><p class="hint-text" style="margin:-6px 0 12px">Spend math points to get stronger. Harder levels need more power.</p><div class="upgs">${upgradeCards(p)}</div></section>
  ${renderSettings(p)}`;
}
function renderSettings(p) {
  const w = PUM.LV[p.world], L = p.levels[p.world], tier = L ? L.tier : 0;
  return `
  <section class="block"><h2>Math level</h2>
    <div class="worldrow"><span class="badge" style="--wc:var(--${w.color})">${w.ex}</span><span class="wtext"><b>${w.name}</b><small>Step ${tier + 1} of ${w.steps.length}: ${w.steps[tier]}</small></span><button class="btn small" data-act="toggle-worlds" aria-expanded="${showWorlds}">${showWorlds ? 'Close' : 'Change'}</button></div>
    ${showWorlds ? `<div class="worlds">${PUM.LEVELS.map(l => { const LL = p.levels[l.id], tr = LL ? LL.tier : 0; return `<button class="world ${p.world === l.id ? 'on' : ''}" data-act="set-world" data-level="${l.id}" style="--wc:var(--${l.color})"><span class="badge">${l.ex}</span><span class="wtext"><b>${l.name}</b><small>${l.ages} &middot; Step ${tr + 1}: ${l.steps[tr]}</small></span>${p.start === l.id ? '<span class="ribbon">Start here</span>' : ''}</button>`; }).join('')}</div>` : ''}
  </section>
  <section class="block"><h2>Settings for ${esc(p.name)}</h2>
    <div class="set-row"><span>Answer with</span><div class="seg">${seg('mode', 'choices', 'Big buttons', p.mode)}${seg('mode', 'keypad', 'Number pad', p.mode)}</div></div>
    <div class="set-row"><span>Read questions aloud</span><div class="seg">${seg('speak', 'on', 'On', p.speak ? 'on' : 'off')}${seg('speak', 'off', 'Off', p.speak ? 'on' : 'off')}</div></div>
    ${syncChip()}
  </section>`;
}
const seg = (k, v, label, cur) => `<button class="seg-b ${cur === v ? 'on' : ''}" data-act="set" data-k="${k}" data-v="${v}" aria-pressed="${cur === v}">${label}</button>`;
function renderMap() {
  const p = P(), c = camp(p), pr = p.prog[p.theme], pw = CP.power(p);
  const worlds = c.worlds.map((wd, wi) => {
    const nodes = c.levels.slice(wi * 5, wi * 5 + 5).map(lv => {
      const locked = lv.i > pr.unlocked, st = pr.stars[lv.i], cur = lv.i === pr.unlocked;
      return `<button class="node ${lv.boss ? 'boss' : ''} ${locked ? 'locked' : ''} ${cur ? 'cur' : ''} ${sel === lv.i ? 'sel' : ''}" data-act="sel-level" data-i="${lv.i}" ${locked ? 'aria-disabled="true"' : ''} aria-label="Level ${lv.i + 1}: ${esc(lv.name)}${locked ? ', locked' : ''}">
        <span class="node-n">${lv.boss ? '☠' : lv.i + 1}</span>${st ? starsRow(st, 'tiny') : ''}</button>`;
    }).join('<span class="node-path"></span>');
    return `<section class="wmap" style="--wc:var(--${wd.color})"><h3>World ${wi + 1}: ${esc(wd.name)}</h3><div class="nodes">${nodes}</div></section>`;
  }).join('');
  let card = '';
  if (sel != null) {
    const lv = c.levels[sel], weak = pw < lv.power, best = pr.stars[sel];
    const goal = p.theme === 'trucks' ? (lv.boss ? `Beat ${c.worlds[lv.world].boss} to the finish line.` : `Deliver the ${lv.cargo} before the clock runs out.`) : p.theme === 'soccer' ? `Score ${lv.goals} goal${lv.goals > 1 ? 's' : ''} before full time.` : (lv.boss ? `Defeat ${c.worlds[lv.world].boss}.` : 'Reach the portal at the end.');
    card = `<div class="lvl-card" id="lvl-card">
      <div class="lvl-head"><span class="kicker">Level ${sel + 1}${lv.boss ? ' · BOSS' : ''}</span>${best ? starsRow(best) : ''}</div>
      <h3>${esc(lv.name)}</h3>
      <p class="goal">${icon('star', 'fill')} ${esc(goal)}</p>
      <p class="act-sub">${esc(lv.nw)}</p>
      <div class="power-row ${weak ? 'weak' : ''}"><span>${icon('bolt')} Your power <b>${pw}</b></span><span>Recommended <b>${lv.power}</b></span></div>
      ${weak ? '<p class="hint-text warn">You might need upgrades for this one.</p>' : ''}
      <button class="btn go big wide" data-act="start" data-i="${sel}">${icon('play')} Start</button>
      ${weak ? '<button class="btn wide" data-act="back" data-to="base">Upgrade first</button>' : ''}
      <p class="stars-help">Stars: 1 for finishing, 1 for no breakdowns or knockouts, 1 for getting most of the in-game math right.</p>
    </div>`;
  }
  return `<header class="top">${backBtn('base', 'Back to base')}<h2 class="title">${PUM.THEMES[p.theme].game}</h2>${mpChip(p)}</header>${card}${worlds}`;
}
function renderTrain() {
  const p = P(), t = train;
  return `<div class="play">
    <header class="bar"><button class="icon-btn" data-act="end-train" aria-label="Back to base">${icon('x')}</button>
      <div class="pips" aria-label="Question ${Math.min(t.n + 1, t.len)} of ${t.len}">${Array.from({length:t.len}, (_, i) => `<span class="pip ${i < t.res.length ? (t.res[i] ? 'hit' : 'miss') : i === t.n ? 'now' : ''}">${i < t.res.length && t.res[i] ? icon('star', 'fill') : ''}</span>`).join('')}</div>
      ${mpChip(p)}</header>
    <div id="quiz-mount" class="quiz-mount"></div>
  </div>`;
}
function renderTrainDone() {
  const p = P(), t = train;
  return `<div class="results">
    <h2 class="rtitle">+${t.earned} ${curName(p)}!</h2>
    <div class="reward-art">${PUM.avatarSVG(p)}</div>
    <p class="rmsg">${t.res.filter(Boolean).length} of ${t.len} right. You have ${p.mp} ${curName(p)} to spend at your ${PUM.THEMES[p.theme].base.toLowerCase()}.</p>
    <div class="ractions"><button class="btn go big" data-act="${isRig(p) ? 'garage' : 'back'}" data-to="base">${icon(isRig(p) ? 'coin' : 'bolt', isRig(p) ? 'coin' : '')} Spend them</button><button class="btn" data-act="train">Earn more</button>${isRig(p) ? '<button class="btn" data-act="back" data-to="base">Back to town</button>' : ''}</div>
  </div>`;
}
function renderResult() {
  const p = P(), r = result;
  return `<div class="results">
    <h2 class="rtitle">${esc(r.title)}</h2>
    ${r.ok ? `<div class="rstars">${[0, 1, 2].map(i => `<span class="rs ${i < r.stars ? 'on' : ''}" style="--i:${i}">${icon('star', 'fill')}</span>`).join('')}</div>` : ''}
    <div class="reward-art">${r.art}</div>
    <p class="rmsg">${esc(r.msg)}</p>
    <p class="rnote">${icon('bolt')} +${r.mp} math points this game</p>
    <div class="ractions">
      ${r.ok && r.next != null ? `<button class="btn go big" data-act="start" data-i="${r.next}">${icon('play')} Next level</button>` : ''}
      <button class="btn ${r.ok ? '' : 'go big'}" data-act="start" data-i="${r.level}">${r.ok ? 'Play again for more stars' : `${icon('play')} Try again`}</button>
      <button class="btn primary" data-act="back" data-to="base">Upgrade at the ${PUM.THEMES[p.theme].base.toLowerCase()}</button>
    </div>
  </div>`;
}
function render() {
  if (view !== 'home' && view !== 'form' && !P()) view = 'home';
  if (view === 'form' && !draft) view = 'home';
  if (view === 'job' && !(P().rig && P().rig.job)) view = 'base';
  if (view === 'jobDone' && !jobResult) view = 'base';
  document.documentElement.classList.toggle('playing', view === 'train');
  app.hidden = view === 'game';
  stopBg();
  if (view === 'game') return;
  const rig = isRig(P());
  app.innerHTML = view === 'form' ? renderForm() : view === 'base' ? (rig ? renderTown() : renderBase()) : view === 'garage' ? renderGarage() : view === 'job' ? renderJob() : view === 'jobDone' ? renderJobDone()
    : view === 'map' ? renderMap() : view === 'train' ? renderTrain() : view === 'trainDone' ? renderTrainDone() : view === 'result' ? renderResult() : renderHome();
  afterRender();
  if (view === 'train' && quiz) { quiz.destroy(); quiz = null; }
  if (view === 'train') { quiz = PUM.Quiz(document.getElementById('quiz-mount'), {player:P, onAnswer:onTrainAnswer, onAdvance:advanceTrain}); quiz.next(); }
}
function go(v) { if (quiz && v !== 'train') { quiz.destroy(); quiz = null; } view = v; render(); try { window.scrollTo(0, 0); } catch (e) {} }

/* ---------- Big Rig Builders: town, garage, job site ---------- */
function stopBg() { if (bg) { bg.stop(); bg = null; } }
function bgRun(canvas, game) { stopBg(); bg = PUM.engine.Runner(canvas, game); bg.start(); }
function drawTruckCanvases() {
  const p = P();
  app.querySelectorAll('canvas[data-truck]').forEach(c => {
    const r = c.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1);
    c.width = Math.round(r.width * dpr); c.height = Math.round(r.height * dpr);
    const ctx = c.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const k = c.dataset.truck, s = Math.min(r.width * .9, r.height * 1.6);
    R.drawTruck(ctx, k, r.width / 2, r.height - 6, s, R.paint(p, k), {load:c.dataset.mat ? 4 : 0, mat:c.dataset.mat || null, t:1});
  });
}
function afterRender() {
  const p = P(); if (!p) return;
  if (view === 'base' && isRig(p)) {
    const c = document.getElementById('town'); if (!c) return;
    const w = c.parentElement.clientWidth || 360; c.style.height = R.townHeight(w) + 'px';
    const cur = p.rig.job ? p.rig.job.i : Math.min(p.prog.trucks.unlocked, R.ACTIVE - 1);
    let t = 0, lots = [], down = null;
    bgRun(c, {
      update(dt) { t += dt; }, draw(ctx, W, H) { lots = R.drawTown(ctx, W, H, p, t, cur); },
      pointer(type, x, y) {
        if (type === 'down') down = [x, y];
        if (type === 'up' && down && Math.hypot(x - down[0], y - down[1]) < 12) {
          const hit = lots.find(l => Math.hypot(l.x - x, l.y - y) < l.r);
          if (hit) { A.ac(); selectLot(hit.i); }
          down = null;
        }
      },
    });
    c.style.touchAction = 'pan-y';
  }
  if (view === 'job' || view === 'jobDone') {
    const c = document.getElementById('site'); if (!c) return;
    const j = view === 'job' ? p.rig.job : null, i = j ? j.i : jobResult.i, J = R.job(i);
    bgRun(c, PUM.games.site({job:J, stage:j ? j.stage : J.steps.length, from:view === 'job' ? jobFrom : J.steps.length - 1, color:R.paint(p, 'dump'), party:view === 'jobDone'}));
    jobFrom = null;
  }
  if (view === 'garage' || view === 'job') drawTruckCanvases();
}
function selectLot(i) {
  const p = P(), pr = p.prog.trucks, J = R.job(i);
  if (J.soon) { PUM.fx.toast('Coming soon!'); return; }
  if (i > pr.unlocked) { PUM.fx.toast('Finish the building before this one to unlock it'); A.sfx('no'); return; }
  townSel = i; townConfirm = false; A.sfx('tap'); render();
}
function renderTown() {
  const p = P(), pr = p.prog.trucks, j = p.rig.job;
  let sheet = '';
  if (townSel != null) {
    const i = townSel, J = R.job(i), built = R.built(p, i), pw = CP.power(p), weak = pw < J.power, mine = j && j.i === i;
    const steps = J.steps.map((st, k) => `<li class="${mine && k < j.stage ? 'done' : mine && k === j.stage ? 'now' : ''}"><span class="snum">${mine && k < j.stage ? icon('check') : k + 1}</span>${esc(R.stepLabel(st, J))}</li>`).join('');
    const btn = mine ? `<button class="btn go big wide" data-act="job-go" data-i="${i}">${icon('play')} Keep building (step ${j.stage + 1} of ${J.steps.length})</button>`
      : (j && townConfirm) ? `<button class="btn go big wide" data-act="job-start" data-i="${i}">Yes, start over</button><p class="hint-text warn">Your work on the ${esc(R.job(j.i).name.toLowerCase())} will be lost.</p>`
      : `<button class="btn go big wide" data-act="job-start" data-i="${i}">${icon('play')} ${built ? 'Build it again for more stars' : 'Start this job'}</button>`;
    sheet = `<div class="sheet" id="sheet" role="dialog" aria-label="${esc(J.name)}">
      <button class="icon-btn sheet-x" data-act="close-sheet" aria-label="Close">${icon('x')}</button>
      <span class="kicker">Job ${i + 1} of ${R.ACTIVE} &middot; Main Street${J.boss ? ' &middot; BOSS' : ''}</span>
      <h3>${esc(J.name)} ${built ? starsRow(pr.stars[i]) : ''}</h3>
      <ol class="steps mini">${steps}</ol>
      <p class="goal">${icon('star', 'fill')} ${esc(J.givesText)}</p>
      <p class="act-sub">${esc(J.nw)}</p>
      <div class="power-row ${weak ? 'weak' : ''}"><span>${icon('bolt')} Your power <b>${pw}</b></span><span>Recommended <b>${J.power}</b></span></div>
      ${weak ? '<p class="hint-text warn">This job is tough at your power. Upgrade your trucks at the garage first!</p>' : ''}
      ${btn}
    </div>`;
  }
  return `
  <header class="top">${backBtn('home', 'Back to players')}<div class="who">${avatar(p, 'av-sm')}<div style="min-width:0"><h2 class="title">${esc(p.name)}</h2><span class="pmeta">Big Rig Builders &middot; ${R.builtCount(p)} of ${R.ACTIVE} built</span></div></div><button class="icon-btn" data-act="edit" aria-label="Edit ${esc(p.name)}">${icon('pencil')}</button></header>
  <div class="town-bar">${mpChip(p)}<button class="btn small" data-act="garage">${icon('wrench')} Garage</button><button class="btn small primary" data-act="train">${icon('brain')} Practice yard</button></div>
  <div class="town-wrap"><canvas id="town" aria-label="Main Street. Tap a building lot to see the job."></canvas></div>
  ${sheet}
  ${renderSettings(p)}`;
}
function renderGarage() {
  const p = P();
  const cards = R.TRUCKS.map(t => {
    const own = R.owns(p, t.k), cur = R.paint(p, t.k);
    const sw = own ? `<div class="swatches small">${PUM.COLORS.map(c => `<button class="sw ${cur === c ? 'on' : ''}" data-act="paint" data-k="${t.k}" data-v="${c}" style="--c:var(--${c})" aria-label="Paint the ${t.name.toLowerCase()} ${c}" aria-pressed="${cur === c}"></button>`).join('')}</div>` : `<span class="lock-note">${t.need >= 5 ? 'Unlocks in the Hills' : `Unlocks after ${t.need} buildings`}</span>`;
    return `<div class="truck-card ${own ? '' : 'locked'}"><canvas data-truck="${t.k}" aria-hidden="true"></canvas><b>${t.name}</b><small>${t.carries}. ${t.how}.</small>${sw}</div>`;
  }).join('');
  return `<header class="top">${backBtn('base', 'Back to town')}<h2 class="title">Garage</h2>${mpChip(p)}</header>
  <section class="block"><h2>Your trucks</h2><p class="hint-text" style="margin:-6px 0 12px">Tap a colour to paint a truck. Each paint job costs ${R.paintCost} coins.</p><div class="truck-cards">${cards}</div></section>
  <section class="block"><h2>Upgrades</h2><p class="hint-text" style="margin:-6px 0 12px">Upgrades work on every truck. Harder jobs need more power.</p><div class="upgs">${upgradeCards(p)}</div></section>
  <button class="btn primary wide" data-act="train">${icon('brain')} Earn coins at the practice yard</button>`;
}
function renderJob() {
  const p = P(), j = p.rig.job, J = R.job(j.i), step = J.steps[j.stage];
  const steps = J.steps.map((st, k) => `<li class="${k < j.stage ? 'done' : k === j.stage ? 'now' : ''}"><span class="snum">${k < j.stage ? icon('check') : k + 1}</span>${esc(R.stepLabel(st, J))}</li>`).join('');
  let act = '';
  if (step === 'dig') act = `<button class="btn go big wide" data-act="rig-dig">${icon('play')} Dig the foundation</button><p class="hint-text">Work the excavator. Dig exactly the right number of scoops.</p>`;
  else if (step === 'crane') act = `<button class="btn go big wide" data-act="rig-crane">${icon('play')} Lift the ${R.PIECE[J.piece]} into place</button><p class="hint-text">The crane swings. Tap at the right moment to drop it on top.</p>`;
  else {
    const M = R.MATS[step];
    act = `<h3 class="next-load">Next load: ${esc(M.name)}</h3><p class="hint-text">Which truck carries ${esc(M.name)}? Tap it.</p>
      <div class="truck-pick">${R.TRUCKS.filter(t => R.owns(p, t.k) && t.k !== 'crane').map(t => `<button class="pick-truck" data-act="pick-truck" data-k="${t.k}" aria-label="${t.name}"><canvas data-truck="${t.k}" aria-hidden="true"></canvas><span>${t.name}</span></button>`).join('')}</div>`;
  }
  return `<header class="top">${backBtn('base', 'Back to town')}<h2 class="title">${esc(J.name)}</h2>${mpChip(p)}</header>
    <div class="site-card"><canvas id="site" aria-label="The ${esc(J.name.toLowerCase())} building site"></canvas></div>
    ${j.msg ? `<p class="trip-msg">${esc(j.msg)}</p>` : ''}
    <ol class="steps">${steps}</ol>
    <div class="job-act">${act}</div>`;
}
function renderJobDone() {
  const p = P(), r = jobResult, J = R.job(r.i);
  return `<div class="results">
    <h2 class="rtitle">${esc(J.name)} built!</h2>
    <div class="rstars">${[0, 1, 2].map(i => `<span class="rs ${i < r.stars ? 'on' : ''}" style="--i:${i}">${icon('star', 'fill')}</span>`).join('')}</div>
    <div class="site-card"><canvas id="site" aria-label="The finished ${esc(J.name.toLowerCase())}"></canvas></div>
    <p class="rmsg">${esc(J.givesText)}</p>
    ${r.newTrucks.map(t => `<p class="unlock">${icon('star', 'fill')} New truck: the ${esc(t.toLowerCase())}!</p>`).join('')}
    <p class="rnote">${icon('coin', 'coin')} +${r.coins} coins this job &middot; ${Math.round(r.cargo * 100)}% of the cargo delivered</p>
    <p class="stars-help">Stars: 1 for building it, 1 for keeping most of the cargo on, 1 for getting most of the math right.</p>
    <div class="ractions"><button class="btn go big" data-act="back" data-to="base">Back to town</button><button class="btn primary" data-act="garage">Go to the garage</button></div>
  </div>`;
}
function rigJob() { const p = P(); return p && p.rig.job; }
function rigAdvance(shown) { const p = P(), j = p.rig.job, J = R.job(j.i); jobFrom = shown ? null : j.stage; j.stage++; j.msg = ''; store.savePlayer(p); if (j.stage >= J.steps.length) rigComplete(); else go('job'); }
function rigComplete() {
  const p = P(), j = p.rig.job, i = j.i, J = R.job(i), pr = p.prog.trucks;
  const cargo = j.cargo.length ? j.cargo.reduce((a, b) => a + b, 0) / j.cargo.length : 1, math = j.n ? j.ok / j.n : 1;
  const stars = 1 + (cargo >= .8 ? 1 : 0) + (math >= .66 ? 1 : 0);
  const before = R.TRUCKS.filter(t => R.owns(p, t.k)).map(t => t.k);
  pr.stars[i] = Math.max(pr.stars[i], stars);
  if (pr.unlocked === i && i < R.ACTIVE - 1) pr.unlocked = i + 1;
  const bonus = stars * 2 + (J.boss ? 5 : 0);
  p.mp += bonus; p.mpTotal += bonus;
  jobResult = {i, stars, coins:j.coins + bonus, cargo, newTrucks:R.TRUCKS.filter(t => R.owns(p, t.k) && !before.includes(t.k)).map(t => t.name)};
  p.rig.job = null; townSel = Math.min(pr.unlocked, R.ACTIVE - 1);
  store.savePlayer(p); A.sfx('fanfare');
  go('jobDone');
}
const LOADKEYS = {'+':'add1', '=':'add1', ArrowUp:'add1', '-':'less', ArrowDown:'less', Enter:'done'};
function loaderCtrl(p) { return `<div class="load-ctl"><button class="ctl less" data-ctl="less" aria-label="One less">&minus;1</button>${R.scoops(p).map(n => `<button class="ctl add ${n > 1 ? 'big' : ''}" data-ctl="add${n}" aria-label="Add ${n}">+${n}</button>`).join('')}<button class="ctl done" data-ctl="done">${icon('check')}<span>Done</span></button></div>`; }
const truckCtrl = () => `<button class="ctl steer" data-ctl="left" aria-label="Steer left">${icon('back')}</button><button class="ctl brake" data-ctl="brake" aria-label="Brake"><span>Brake</span></button><button class="ctl steer" data-ctl="right" aria-label="Steer right">${icon('next')}</button>`;
function rigLoad(mat, truck) {
  const p = P(), j = p.rig.job, dig = mat === 'dirt';
  openShell({cls:'loader', ctrl:loaderCtrl(p), gauge:false, keymap:LOADKEYS, onExit:() => go('job'),
    make:api => PUM.games.load({player:p, assist:assistOf(p), mat, dig, color:R.paint(p, truck), api}),
    onFinish:r => {
      const mp = play ? play.mp : 0; stopGame();
      j.n++; if (r.exact) j.ok++; j.coins += mp;
      if (dig) { rigAdvance(); return; }
      store.savePlayer(p); rigDrive(mat, truck);
    }});
}
function rigDrive(mat, truck) {
  const p = P(), j = p.rig.job;
  openShell({cls:'trucks', ctrl:truckCtrl(), gauge:true, keymap:KEYMAP.trucks, onExit:() => { j.msg = 'You stopped the trip. Load up and go again!'; store.savePlayer(p); go('job'); },
    make:api => PUM.games.trucks({player:p, assist:assistOf(p), levelIndex:j.i, api, trip:{mat, truck, color:R.paint(p, truck)}}),
    onFinish:r => {
      const mp = play ? play.mp : 0; stopGame();
      j.coins += mp;
      if (r.ok) {
        j.n += r.gates || 0; j.ok += r.gatesOk || 0;
        const pay = Math.max(1, Math.round((5 + j.i) * r.cargo * (1 + .25 * p.up.bed)));
        j.cargo.push(r.cargo); store.savePlayer(p);
        rigUnload(mat, truck, r.cargo, pay);
      } else {
        j.msg = r.reason === 'lost' ? 'The whole load fell off! Load up and try again. Slow down for potholes and dodge the rocks.'
          : truck === 'mixer' ? 'Oh no, the concrete set before you got there! Load up and try again.' : "Time's up! Load up and try again. Upgrade your engine to go faster.";
        store.savePlayer(p); go('job');
      }
    }});
}
function rigUnload(mat, truck, cargo, pay) {
  const p = P(), j = p.rig.job, J = R.job(j.i);
  let game = null;
  const done = paid => { const rest = pay - (paid || 0); if (rest > 0) { p.mp += rest; p.mpTotal += rest; } j.coins += pay; jobFrom = null; rigAdvance(true); };
  openShell({cls:'unload', ctrl:'', gauge:false, keymap:{' ':'skip', Enter:'skip'}, onExit:() => done(game ? game.paid() : 0),
    make:api => (game = PUM.games.unload({api, job:J, stage:j.stage, mat, truck, color:R.paint(p, truck), cargo, pay})),
    onFinish:r => { stopGame(); done(r.paid); }});
}
function rigCrane() {
  const p = P(), j = p.rig.job, J = R.job(j.i);
  openShell({cls:'crane', ctrl:`<span></span><button class="ctl drop" data-ctl="drop">${icon('down')}<span>Drop</span></button>`, gauge:false, keymap:{' ':'drop', Enter:'drop', ArrowDown:'drop'}, onExit:() => go('job'),
    make:api => PUM.games.crane({player:p, assist:assistOf(p), job:J, api}),
    onFinish:r => {
      stopGame();
      j.crane = r.grade; p.mp += r.grade; p.mpTotal += r.grade; j.coins += r.grade;
      rigAdvance();
    }});
}

/* ---------- training ---------- */
function startTrain() { train = {n:0, len:10, res:[], earned:0}; go('train'); }
function onTrainAnswer(ok, info) {
  train.res.push(ok); train.earned += info.mp;
  store.savePlayer(P());
  const chip = document.getElementById('mp-chip'); if (chip) chip.outerHTML = mpChip(P());
  const pips = app.querySelectorAll('.pip'), i = train.res.length - 1;
  if (pips[i]) { pips[i].className = 'pip ' + (ok ? 'hit' : 'miss'); pips[i].innerHTML = ok ? icon('star', 'fill') : ''; }
}
function advanceTrain() {
  train.n++;
  if (train.n >= train.len) { if (quiz) { quiz.destroy(); quiz = null; } A.sfx('fanfare'); go('trainDone'); return; }
  const pips = app.querySelectorAll('.pip'); if (pips[train.n]) pips[train.n].classList.add('now');
  quiz.next();
}

/* ---------- game shell ---------- */
function hudHTML(p, cfg = {}) {
  const th = PUM.THEMES[p.theme];
  const ctrl = cfg.ctrl != null ? cfg.ctrl : p.theme === 'trucks'
    ? `<button class="ctl steer" data-ctl="left" aria-label="Steer left">${icon('back')}</button><button class="ctl brake" data-ctl="brake" aria-label="Brake"><span>Brake</span></button><button class="ctl steer" data-ctl="right" aria-label="Steer right">${icon('next')}</button>`
    : p.theme === 'soccer'
      ? `<span></span><span class="ctl-col"><button class="ctl power" data-ctl="power" id="power-btn" aria-label="Power shot">${icon('bolt')}<span>Power</span></button><button class="ctl shoot" data-ctl="shoot" id="shoot-btn" aria-label="Shoot"><span>Shoot</span></button></span>`
      : `<button class="ctl slide" data-ctl="slide" aria-label="Slide"><span>Slide</span></button><button class="ctl jump" data-ctl="jump" aria-label="Jump">${icon('up')}<span>Jump</span></button>`;
  return `<canvas id="gc" aria-label="${th.game}"></canvas>
    <div class="hud">
      <button class="icon-btn" data-g="exit" aria-label="Stop and go back">${icon('x')}</button>
      ${cfg.gauge === false ? '<span style="flex:1"></span>' : `<div class="gauge" style="--pc:var(--${th.pc})"><span class="gl">${th.fuel}</span><span class="gbar"><i id="g-fuel"></i></span></div>`}
      <span class="hud-mp">${icon(isRig(p) ? 'coin' : 'bolt', isRig(p) ? 'coin' : '')}<b id="g-mp">0</b></span>
    </div>
    <div class="hud2" id="hud2"></div>
    <div class="qbanner" id="qbanner" hidden></div>
    <div class="choose" id="choose" hidden></div>
    <div class="controls ${cfg.cls || p.theme}">${ctrl}</div>
    <div class="overlay" id="overlay" hidden></div>`;
}
function startGame(levelIndex) {
  const p = P(); if (!p) return go('home');
  const pr = p.prog[p.theme];
  if (levelIndex > pr.unlocked) return;
  openShell({cls:p.theme, ctrl:null, gauge:true, keymap:KEYMAP[p.theme], level:levelIndex, onExit:() => go('map'), onFinish:r => finishGame(r),
    make:api => PUM.games[p.theme]({player:p, assist:assistOf(p), levelIndex, api})});
  pr.plays++;
}
function openShell(cfg) {
  const p = P(); if (!p) return go('home');
  if (quiz) { quiz.destroy(); quiz = null; }
  view = 'game'; render();
  const toastEl = document.getElementById('toast'); if (toastEl) toastEl.hidden = true;
  shell.hidden = false; shell.innerHTML = hudHTML(p, cfg);
  document.documentElement.classList.add('in-game');
  const api = {
    hud: h => hud(h),
    addMp: n => { p.mp += n; p.mpTotal += n; play.mp += n; const el = document.getElementById('g-mp'); if (el) el.textContent = play.mp; },
    toast: m => PUM.fx.toast(esc(m)),
    needRefuel: reason => openRefuel(reason),
    finish: r => cfg.onFinish(r),
    showQuestion: (q, hint) => { const b = document.getElementById('qbanner'); if (!b) return; b.innerHTML = `<span class="qb-hint">${esc(hint || '')}</span><span class="qb-q">${PUM.questionHTML(q)}</span>`; b.hidden = false; b.classList.remove('ok', 'bad'); if (p.speak) A.say(q.spoken); },
    hideQuestion: ok => { const b = document.getElementById('qbanner'); if (!b) return; b.classList.add(ok ? 'ok' : 'bad'); setTimeout(() => { b.hidden = true; }, 900); },
    answer: (ok, q) => { const r = PUM.recordAnswer(p, ok, false); play.mp += r.mp; const el = document.getElementById('g-mp'); if (el) el.textContent = play.mp; if (r.up) PUM.fx.toast(`${icon('up')} Math step up!`); if (p.speak) A.say(ok ? pick(['Yes!', 'Great!', 'Nice!']) : `It was ${q.ans}`); A.sfx(ok ? 'yes' : 'no'); store.savePlayer(p); return r; },
    choose: (q, options, title, cb) => {
      const box = document.getElementById('choose'); if (!box) return;
      box.innerHTML = `<div class="choose-card"><span class="qb-hint">${esc(title)}</span><span class="qb-q">${PUM.questionHTML(q)}</span><div class="choose-opts">${options.map(v => `<button class="choice" data-pick="${v}"><span class="cnum">${v}</span></button>`).join('')}</div></div>`;
      box.hidden = false;
      if (p.speak) A.say(q.spoken);
      const onPick = e => { const b = e.target.closest('[data-pick]'); if (!b) return; box.removeEventListener('click', onPick); box.hidden = true; box.innerHTML = ''; cb(Number(b.dataset.pick)); };
      box.addEventListener('click', onPick);
      play.choosing = {q, options, cb};
    },
  };
  const game = cfg.make(api);
  const canvas = document.getElementById('gc');
  const runner = PUM.engine.Runner(canvas, game);
  play = {game, runner, mp:0, reason:null, refuelQuiz:null, last:{}, level:cfg.level, keymap:cfg.keymap || {}, onExit:cfg.onExit};
  runner.start(); game.onStart && game.onStart();
  const ctlDown = e => { const b = e.target.closest('[data-ctl]'); if (!b) return; e.preventDefault(); A.ac(); b.classList.add('down'); game.setControl && game.setControl(b.dataset.ctl, true); try { b.setPointerCapture(e.pointerId); } catch (_) {} };
  const ctlUp = e => { const b = e.target.closest('[data-ctl]'); if (!b) return; b.classList.remove('down'); game.setControl && game.setControl(b.dataset.ctl, false); };
  shell.addEventListener('pointerdown', ctlDown); shell.addEventListener('pointerup', ctlUp); shell.addEventListener('pointercancel', ctlUp);
  play.cleanup = () => { shell.removeEventListener('pointerdown', ctlDown); shell.removeEventListener('pointerup', ctlUp); shell.removeEventListener('pointercancel', ctlUp); };
}
function hud(h) {
  if (!play) return;
  const last = play.last, set = (id, fn) => { const el = document.getElementById(id); if (el) fn(el); };
  const fuel = h.fuel != null ? h.fuel : h.energy;
  if (fuel != null && Math.abs((last.fuel || 0) - fuel) > .004) { last.fuel = fuel; set('g-fuel', el => { el.style.width = (clamp(fuel, 0, 1) * 100).toFixed(1) + '%'; el.classList.toggle('low', fuel < .25); }); }
  const chips = [];
  if (h.cargo != null) chips.push(`<span class="chip">Load <span class="cbar"><i class="${h.cargo < .5 ? 'low' : ''}" style="width:${(h.cargo * 100).toFixed(0)}%"></i></span></span>`);
  if (h.hp != null) chips.push(`<span class="chip">${'<i class="wrench"></i>'.repeat(Math.max(0, h.hp))}${'<i class="wrench off"></i>'.repeat(Math.max(0, h.hpMax - h.hp))}</span>`);
  if (h.hearts != null) chips.push(`<span class="chip">${'<i class="heart"></i>'.repeat(Math.max(0, h.hearts))}${'<i class="heart off"></i>'.repeat(Math.max(0, h.max - h.hearts))}</span>`);
  if (h.goals != null) chips.push(`<span class="chip big">${icon('star', 'fill')} ${h.goals} / ${h.need} goals</span>`);
  if (h.time != null) chips.push(`<span class="chip time ${h.time <= 10 ? 'low' : ''}">${h.timeLabel ? esc(h.timeLabel) + ' ' : ''}${Math.floor(h.time / 60)}:${String(h.time % 60).padStart(2, '0')}</span>`);
  if (h.rival) chips.push(`<span class="chip ${h.rival.ahead ? 'low' : 'good'}">${h.rival.ahead ? `${esc(h.rival.name)} ahead` : 'You lead!'}</span>`);
  if (h.boss) chips.push(`<span class="chip">${esc(h.boss.name)} <span class="bossbar"><i style="width:${(h.boss.hp / h.boss.max * 100).toFixed(0)}%"></i></span></span>`);
  if (h.orbs != null && !h.boss) chips.push(`<span class="chip">${h.orbs} orbs</span>`);
  if (h.progress != null && !h.boss) chips.push(`<span class="prog"><i style="width:${(h.progress * 100).toFixed(1)}%"></i></span>`);
  const html = chips.join('');
  if (html !== last.html) { last.html = html; set('hud2', el => { el.innerHTML = html; }); }
  if (h.power != null && h.power !== last.power) { last.power = h.power; set('power-btn', el => { el.classList.toggle('ready', h.power >= 1); el.style.setProperty('--pw', (h.power * 100).toFixed(0) + '%'); }); }
  if (h.canShoot != null && h.canShoot !== last.canShoot) { last.canShoot = h.canShoot; set('shoot-btn', el => el.classList.toggle('ready', h.canShoot)); }
}
function openRefuel(reason) {
  if (!play) return;
  const p = P(), th = PUM.THEMES[p.theme], frac = .5;
  play.runner.pause(); play.reason = reason;
  ['left', 'right', 'brake'].forEach(c => play.game.setControl && play.game.setControl(c, false));
  shell.querySelectorAll('.ctl.down').forEach(b => b.classList.remove('down'));
  const titles = {revive:'Knocked out!', repair:'Truck broke down!', fuel:'Out of fuel!', stamina:'Out of stamina!', energy:'Out of energy!'};
  const subs = {revive:'Answer one question to get back up. You only get one second chance per level!', repair:'Answer a question to fix your truck. You only get one repair per level, so upgrade Armor to take more hits!', fuel:'Each right answer adds half a tank. Upgrade your Fuel tank to drive farther.', stamina:'Each right answer refills half your stamina. Upgrade Stamina to play longer.', energy:'Each right answer refills half your energy. Upgrade Energy to run longer.'};
  const ov = document.getElementById('overlay');
  ov.hidden = false;
  ov.innerHTML = `<div class="refuel"><div class="refuel-head"><h2>${titles[reason] || 'Recharge!'}</h2><p>${subs[reason] || ''}</p>
    <div class="gauge big" style="--pc:var(--${th.pc})"><span class="gl">${reason === 'repair' ? 'Armor' : reason === 'revive' ? 'Hearts' : th.fuel}</span><span class="gbar"><i id="r-fuel" style="width:${(play.game.level(reason) * 100).toFixed(0)}%"></i></span></div></div>
    <div id="refuel-quiz" class="quiz-mount compact"></div>
    <button class="btn go wide" id="refuel-go" data-g="resume" hidden>${icon('play')} Back to the game</button></div>`;
  A.sfx('no');
  play.refuelQuiz = PUM.Quiz(document.getElementById('refuel-quiz'), {player:P, compact:true, onAnswer:(ok, info) => {
    if (!ok) return;
    play.game.refill(frac, reason);
    play.mp += info.mp; const gm = document.getElementById('g-mp'); if (gm) gm.textContent = play.mp;
    const rf = document.getElementById('r-fuel'); if (rf) rf.style.width = (play.game.level(reason) * 100).toFixed(0) + '%';
    store.savePlayer(P());
    const btn = document.getElementById('refuel-go'); if (btn) btn.hidden = false;
    if (play.game.refillTarget(reason)) { setTimeout(closeRefuel, 900); return 'hold'; }
  }});
  play.refuelQuiz.next();
}
function closeRefuel() {
  if (!play || !play.refuelQuiz) return;
  play.refuelQuiz.destroy(); play.refuelQuiz = null;
  const ov = document.getElementById('overlay'); if (ov) { ov.hidden = true; ov.innerHTML = ''; }
  A.hush(); play.runner.resume(); play.game.resumeFromRefill && play.game.resumeFromRefill();
}
function stopGame() {
  if (!play) return;
  if (play.refuelQuiz) play.refuelQuiz.destroy();
  play.runner.stop(); play.game.onStop && play.game.onStop(); play.cleanup();
  shell.hidden = true; shell.innerHTML = ''; document.documentElement.classList.remove('in-game');
  A.engineOff(); A.hush();
  const p = P(); if (p) store.savePlayer(p);
  play = null;
}
function finishGame(r) {
  const p = P(); if (!p || !play) return;
  const li = play.level, lv = CP.level(p.theme, li), pr = p.prog[p.theme], c = camp(p), wd = c.worlds[lv.world];
  let bonus = 0, res;
  const weakest = UPS(p).reduce((a, u) => p.up[u.k] < p.up[a.k] ? u : a, UPS(p)[0]);
  if (r.ok) {
    pr.stars[li] = Math.max(pr.stars[li], r.stars);
    const first = pr.unlocked === li;
    if (first && li < CP.count - 1) pr.unlocked = li + 1;
    bonus = r.stars + (lv.boss ? 4 : 0);
    const art = p.theme === 'soccer' ? PUM.trophySVG(r.stars >= 3 ? 'gold' : r.stars === 2 ? 'silver' : 'bronze') : p.theme === 'anime' ? PUM.badgeSVG(wd.color, li + 1) : PUM.buildingSVG(PUM.BUILDINGS[li % PUM.BUILDINGS.length].color);
    res = {ok:true, stars:r.stars, art, level:li, next:li < CP.count - 1 ? li + 1 : null,
      title:lv.boss ? `${wd.boss} beaten!` : p.theme === 'trucks' ? 'Delivered!' : p.theme === 'soccer' ? 'You won!' : 'Level clear!',
      msg:li === CP.count - 1 ? 'You beat the whole game! Replay levels to collect every star.' : lv.boss ? `World ${lv.world + 2} is open!` : `Level ${li + 2} is unlocked.`};
  } else {
    const why = r.reason === 'time' ? (p.theme === 'soccer' ? 'Full time came before you scored enough.' : 'The clock ran out.') : r.reason === 'boss' ? `${wd.boss} got to the finish first.` : r.reason === 'broke' ? 'Your truck broke down too many times.' : 'You were knocked out.';
    res = {ok:false, art:PUM.avatarSVG(p), level:li, title:'So close!',
      msg:`${why} Earn math points and upgrade your ${weakest.name.toLowerCase()} to make it easier, then try again.`};
  }
  p.mp += bonus; p.mpTotal += bonus;
  res.mp = play.mp + bonus;
  result = res;
  stopGame();
  store.savePlayer(p);
  A.sfx(r.ok ? 'fanfare' : 'no');
  go('result');
}

/* ---------- events ---------- */
app.addEventListener('click', e => {
  const el = e.target.closest('[data-act]');
  if (!el || el.disabled) return;
  A.ac();
  const a = el.dataset.act;
  switch (a) {
    case 'add-player': draft = {name:'', color:pick(PUM.COLORS), theme:'trucks', hero:0, age:5}; confirmDel = false; A.sfx('tap'); go('form'); break;
    case 'open': { pid = el.dataset.id; showWorlds = false; A.sfx('tap'); const p = P(); townSel = isRig(p) ? (p.rig.job ? p.rig.job.i : Math.min(p.prog.trucks.unlocked, R.ACTIVE - 1)) : null; go('base'); break; }
    case 'edit': { const p = P(); if (!p) break; draft = {id:p.id, name:p.name, color:p.color, theme:p.theme, hero:p.hero, age:p.age}; confirmDel = false; A.sfx('tap'); go('form'); break; }
    case 'pick': { const k = el.dataset.k; draft[k] = (k === 'age' || k === 'hero') ? Number(el.dataset.v) : el.dataset.v; confirmDel = false; A.sfx('tap'); render(); break; }
    case 'save-player': saveForm(); break;
    case 'del-player': {
      if (!confirmDel) { confirmDel = true; render(); break; }
      const id = draft.id; S.players = S.players.filter(p => p.id !== id); store.saveLocal(); store.deleteRemote(id);
      pid = null; draft = null; go('home'); break;
    }
    case 'back': { const to = el.dataset.to; if ((to === 'base' || to === 'map') && !P()) go('home'); else { go(to); if (to === 'home') store.pull(); } break; }
    case 'end-train': if (quiz) quiz.destroy(); quiz = null; train && train.earned ? go('trainDone') : go('base'); break;
    case 'train': A.sfx('tap'); startTrain(); break;
    case 'map': { const p = P(); sel = p.prog[p.theme].unlocked; A.sfx('tap'); go('map'); break; }
    case 'sel-level': { const p = P(), i = Number(el.dataset.i); if (i > p.prog[p.theme].unlocked) { PUM.fx.toast('Beat the level before to unlock this one'); A.sfx('no'); break; } sel = i; A.sfx('tap'); render(); const c = document.getElementById('lvl-card'); if (c) c.scrollIntoView({block:'nearest'}); break; }
    case 'start': A.sfx('tap'); startGame(Number(el.dataset.i)); break;
    case 'garage': A.sfx('tap'); go('garage'); break;
    case 'close-sheet': townSel = null; A.sfx('tap'); render(); break;
    case 'job-go': A.sfx('tap'); go('job'); break;
    case 'job-start': {
      const p = P(), i = Number(el.dataset.i), j = p.rig.job;
      if (j && j.i !== i && !townConfirm) { townConfirm = true; render(); break; }
      p.rig.job = {i, stage:0, cargo:[], ok:0, n:0, coins:0, crane:0, msg:''}; townConfirm = false;
      store.savePlayer(p); A.sfx('whistle'); jobFrom = null; go('job'); break;
    }
    case 'rig-dig': A.sfx('tap'); rigLoad('dirt', 'dump'); break;
    case 'rig-crane': A.sfx('tap'); rigCrane(); break;
    case 'pick-truck': {
      const p = P(), j = p.rig.job, step = R.job(j.i).steps[j.stage], M = R.MATS[step], k = el.dataset.k;
      if (!M) break;
      if (M.truck !== k) { A.sfx('no'); PUM.fx.toast(`The ${R.truckName(k).toLowerCase()} can't carry ${M.name}. Try another truck!`); if (p.speak) A.say(`${M.name} goes in the ${R.truckName(M.truck).toLowerCase()}`); el.classList.add('nope'); setTimeout(() => el.classList.remove('nope'), 500); break; }
      A.sfx('up'); rigLoad(step, k); break;
    }
    case 'paint': {
      const p = P(), k = el.dataset.k, c = el.dataset.v;
      if (!R.owns(p, k) || R.paint(p, k) === c) break;
      if (p.mp < R.paintCost) { PUM.fx.toast(`Painting costs ${R.paintCost} coins. Earn more at the practice yard!`); A.sfx('no'); break; }
      p.mp -= R.paintCost; p.rig.paint[k] = c; store.savePlayer(p); A.sfx('up'); render();
      PUM.fx.burst(app.querySelector(`canvas[data-truck="${k}"]`)); break;
    }
    case 'upgrade': {
      const p = P(), k = el.dataset.k, lvl = p.up[k];
      if (lvl >= CP.maxUp) break;
      const cost = CP.cost[lvl];
      if (p.mp < cost) { PUM.fx.toast(isRig(p) ? `Need ${cost - p.mp} more coins. Earn them at the practice yard or on jobs!` : `Need ${cost - p.mp} more math points. Tap Earn math points!`); A.sfx('no'); break; }
      p.mp -= cost; p.up[k]++; store.savePlayer(p); A.sfx('up');
      PUM.fx.toast(`${icon('up')} ${UPS(p).find(u => u.k === k).name} level ${p.up[k]}!`);
      render(); PUM.fx.burst(app.querySelector(`[data-k="${k}"]`) || app.querySelector('.upgs'));
      break;
    }
    case 'mute': { S.muted = !S.muted; store.saveLocal(); if (S.muted) A.hush(); else A.sfx('tap'); const m = document.getElementById('mute'); if (m) m.outerHTML = muteBtn(); break; }
    case 'set': {
      const p = P(); if (!p) break;
      if (el.dataset.k === 'mode') p.mode = el.dataset.v === 'keypad' ? 'keypad' : 'choices';
      if (el.dataset.k === 'speak') { p.speak = el.dataset.v === 'on'; if (p.speak) A.say(`Hi ${p.name}!`); }
      store.savePlayer(p); A.sfx('tap'); render(); break;
    }
    case 'toggle-worlds': showWorlds = !showWorlds; A.sfx('tap'); render(); break;
    case 'set-world': { const p = P(); if (!p || !PUM.LV[el.dataset.level]) break; p.world = el.dataset.level; store.lv(p, p.world); showWorlds = false; store.savePlayer(p); A.sfx('tap'); render(); break; }
    case 'sync-info': showSync = !showSync; store.sync.joinErr = ''; store.sync.onChange(); break;
    case 'join': { const f = document.getElementById('joincode'); store.join(f ? f.value : '').then(ok => { if (ok) showSync = false; render(); }); break; }
    case 'copy-link': {
      const link = store.familyLink(), note = document.getElementById('copy-note');
      const show = msg => { if (note) { note.textContent = msg; note.hidden = false; } };
      const manual = () => show(`Copy this link: ${link}`);
      try { navigator.clipboard.writeText(link).then(() => show('Copied. Send it to anyone in the family.'), manual); } catch (err) { manual(); }
      break;
    }
  }
});
shell.addEventListener('click', e => {
  const el = e.target.closest('[data-g]'); if (!el) return;
  if (el.dataset.g === 'exit') { const ex = play && play.onExit; stopGame(); if (ex) ex(); else go('base'); }
  if (el.dataset.g === 'resume') closeRefuel();
});
app.addEventListener('input', e => {
  if (e.target.id !== 'pname' || !draft) return;
  draft.name = e.target.value.slice(0, 16);
  const pv = document.getElementById('pv-name'); if (pv) pv.textContent = draft.name || 'Name';
  const sb = document.getElementById('save-btn'); if (sb) sb.disabled = !draft.name.trim();
});
app.addEventListener('keydown', e => {
  if (e.target.id === 'pname' && e.key === 'Enter' && draft && draft.name.trim()) { e.preventDefault(); saveForm(); }
  if (e.target.id === 'joincode' && e.key === 'Enter') { e.preventDefault(); store.join(e.target.value).then(ok => { if (ok) showSync = false; render(); }); }
});
const KEYMAP = {
  trucks:{ArrowLeft:'left', ArrowRight:'right', ArrowDown:'brake', ' ':'brake'},
  soccer:{ArrowLeft:'left', ArrowRight:'right', ArrowUp:'up', ArrowDown:'down', ' ':'shoot', p:'power'},
  anime:{ArrowUp:'jump', ' ':'jump', ArrowDown:'slide'},
};
document.addEventListener('keydown', e => {
  if (e.target && e.target.tagName === 'INPUT') return;
  if (view === 'train' && quiz) { quiz.key(e); return; }
  if (play) {
    if (play.refuelQuiz) { play.refuelQuiz.key(e); return; }
    const c = play.keymap[e.key];
    if (c && !e.repeat) { e.preventDefault(); A.ac(); play.game.setControl && play.game.setControl(c, true); }
  }
});
document.addEventListener('keyup', e => { if (play && !play.refuelQuiz) { const c = play.keymap[e.key]; if (c) play.game.setControl && play.game.setControl(c, false); } });
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') { store.pull(); if (play && !play.refuelQuiz && play.runner.paused) play.runner.resume(); }
  else if (play && !play.refuelQuiz) { play.runner.pause(); A.engineSet(0, 0); }
});
setInterval(() => { if (document.visibilityState === 'visible' && (view === 'home' || view === 'base')) store.pull(); }, 45000);

function saveForm() {
  const d = draft, name = d.name.trim().slice(0, 16);
  if (!name) return;
  const [start, tier] = PUM.AGE_START[d.age] || ['count', 0];
  if (d.id) {
    const p = S.players.find(x => x.id === d.id); if (!p) return go('home');
    const ageChanged = p.age !== d.age;
    Object.assign(p, {name, color:d.color, theme:d.theme, hero:d.hero, age:d.age});
    if (ageChanged) { p.start = start; p.world = start; if (!p.levels[start]) store.lv(p, start).tier = tier; }
    store.savePlayer(p); pid = p.id;
  } else {
    const p = store.normalize({id:PUM.util.uid(), name, color:d.color, theme:d.theme, hero:d.hero, age:d.age, start, world:start, speak:d.age <= 6, created:Date.now(), mp:6});
    store.lv(p, start).tier = tier;
    S.players.push(p); store.savePlayer(p); pid = p.id;
  }
  draft = null; A.sfx('tap'); go('base');
}

PUM.app = {go, P, get play() { return play; }, startGame, rigLoad, rigDrive, rigCrane, rigUnload, get view() { return view; }};
render();
store.pull();
})();
