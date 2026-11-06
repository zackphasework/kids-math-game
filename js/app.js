/* Power-Up Math: screens, the base and upgrades, training rounds, and the game shell with mid-game refuels. */
(function () {
'use strict';
const {esc, pick, clamp} = PUM.util;
const icon = PUM.icon, store = PUM.store, S = store.S, A = PUM.audio;
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
    clearTimeout(PUM.fx._t); PUM.fx._t = setTimeout(() => { t.hidden = true; }, 1700);
  },
};

/* ---------- state ---------- */
let view = 'home', pid = null, draft = null, confirmDel = false, showSync = false, showWorlds = false;
let quiz = null, train = null, play = null, result = null;
const P = () => S.players.find(p => p.id === pid);
const assistOf = p => p.age <= 5 ? 2 : p.age <= 7 ? 1 : 0;
const levelOf = p => p.theme === 'trucks' ? p.prog.trucks.level : p.theme === 'soccer' ? p.prog.soccer.season * 5 + p.prog.soccer.match : p.prog.anime.world;
const refillFrac = p => .34 + .11 * p.up.rech;

/* ---------- small renderers ---------- */
const muteBtn = () => `<button class="icon-btn" id="mute" data-act="mute" aria-label="${S.muted ? 'Turn sound on' : 'Turn sound off'}" aria-pressed="${S.muted}">${icon(S.muted ? 'mute' : 'sound')}</button>`;
const backBtn = (to, label = 'Back') => `<button class="icon-btn" data-act="back" data-to="${to}" aria-label="${label}">${icon('back')}</button>`;
const avatar = (p, cls) => `<span class="avatar ${cls}">${PUM.avatarSVG(p)}</span>`;
const mpChip = p => `<span class="mp-chip" id="mp-chip">${icon('bolt')} <b>${p.mp}</b> math points</span>`;
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
store.sync.onPulled = () => { if (pid && !P()) { pid = null; if (view !== 'form') view = 'home'; } if (view === 'home' || view === 'base') render(); };

/* ---------- screens ---------- */
function renderHome() {
  const ps = [...S.players].sort((a, b) => a.created - b.created);
  return `
  <header class="top"><div><h1>Power-Up Math</h1><p class="sub">Solve math to power up your trucks, your soccer team or your hero.</p></div>${muteBtn()}</header>
  <div class="hero-strip" aria-hidden="true">${PUM.truckSVG('excavator', 'marigold')}${PUM.jerseySVG('sea', '9')}${PUM.heroSVG(0, 'berry')}</div>
  <section class="block"><h2>Who's playing?</h2>
    <div class="players">${ps.map(p => `<button class="player" data-act="open" data-id="${p.id}">${avatar(p, 'av')}<span class="pname">${esc(p.name)}</span><span class="pmeta">${icon('bolt')} ${p.mp} &middot; ${PUM.THEMES[p.theme].name}</span></button>`).join('')}
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
  return PUM.UPGRADES[p.theme].map(u => {
    const lvl = p.up[u.k], max = lvl >= PUM.UP_MAX, cost = max ? 0 : PUM.UP_COST[lvl], can = !max && p.mp >= cost;
    return `<div class="upg ${max ? 'max' : ''}">
      <div class="upg-head"><b>${u.name}</b><span class="pips" aria-label="Level ${lvl} of ${PUM.UP_MAX}">${Array.from({length:PUM.UP_MAX}, (_, i) => `<i class="${i < lvl ? 'on' : ''}"></i>`).join('')}</span></div>
      <p>${u.what}</p>
      ${max ? '<span class="upg-max">Maxed out</span>' : `<button class="btn small ${can ? 'go' : ''}" data-act="upgrade" data-k="${u.k}" ${can ? '' : 'aria-disabled="true"'}>${icon('bolt')} ${can ? `Upgrade · ${cost}` : `Need ${cost}`}</button>`}
    </div>`;
  }).join('');
}
function shelf(p) {
  if (p.theme === 'trucks') {
    const t = p.prog.trucks, cur = PUM.BUILDINGS[t.built.length % PUM.BUILDINGS.length], frac = (t.bricks % PUM.BRICKS_PER_BUILDING) / PUM.BRICKS_PER_BUILDING;
    return `<div class="shelf"><span class="shelf-item now">${PUM.buildingSVG(cur.color, frac)}<span>${cur.name}: ${t.bricks % PUM.BRICKS_PER_BUILDING} of ${PUM.BRICKS_PER_BUILDING} bricks</span></span>${t.built.slice().reverse().slice(0, 40).map(i => { const b = PUM.BUILDINGS[i % PUM.BUILDINGS.length]; return `<span class="shelf-item">${PUM.buildingSVG(b.color)}<span>${b.name}</span></span>`; }).join('')}</div>`;
  }
  if (p.theme === 'soccer') {
    const s = p.prog.soccer;
    const items = s.trophies.slice().reverse().slice(0, 40).map(tr => `<span class="shelf-item">${PUM.trophySVG(tr.m)}<span>${PUM.CUPS[tr.i % PUM.CUPS.length]}</span></span>`).join('');
    return `${items ? `<div class="shelf">${items}</div>` : '<div class="shelf empty">Finish a cup and your trophy goes here.</div>'}<p class="record">${PUM.CUPS[s.season % PUM.CUPS.length]}: match ${s.match + 1} of 5, ${s.sw} win${s.sw === 1 ? '' : 's'} so far. All matches: ${s.w} won, ${s.d} drawn, ${s.l} lost.</p>`;
  }
  const h = p.prog.anime;
  const items = h.badges.slice().reverse().slice(0, 40).map(i => { const w = PUM.WORLDS[i % PUM.WORLDS.length]; return `<span class="shelf-item">${PUM.badgeSVG(w.color, i + 1)}<span>${w.name}</span></span>`; }).join('');
  return items ? `<div class="shelf">${items}</div>` : '<div class="shelf empty">Beat a world boss and its badge goes here.</div>';
}
function nextMission(p) {
  if (p.theme === 'trucks') { const b = PUM.BUILDINGS[p.prog.trucks.built.length % PUM.BUILDINGS.length]; return {title:`Delivery ${p.prog.trucks.level + 1}`, sub:`Carry 6 bricks to the ${b.name.toLowerCase()} site. Don't tip over!`}; }
  if (p.theme === 'soccer') { const s = p.prog.soccer, t = PUM.TEAMS[(s.season * 5 + s.match) % PUM.TEAMS.length]; return {title:`vs ${t.name}`, sub:`${PUM.CUPS[s.season % PUM.CUPS.length]}, match ${s.match + 1} of 5. Penalty shootout!`}; }
  const w = PUM.WORLDS[p.prog.anime.world % PUM.WORLDS.length]; return {title:w.name, sub:`Run, jump and slide to the ${w.boss}, then beat it with power blasts.`};
}
const seg = (k, v, label, cur) => `<button class="seg-b ${cur === v ? 'on' : ''}" data-act="set" data-k="${k}" data-v="${v}" aria-pressed="${cur === v}">${label}</button>`;
function worldCard(p, l) {
  const L = p.levels[l.id], tier = L ? L.tier : 0;
  return `<button class="world ${p.world === l.id ? 'on' : ''}" data-act="set-world" data-level="${l.id}" style="--wc:var(--${l.color})">
    <span class="badge">${l.ex}</span><span class="wtext"><b>${l.name}</b><small>${l.ages} &middot; Step ${tier + 1}: ${l.steps[tier]}</small></span>
    <span class="steps" aria-hidden="true">${l.steps.map((_, i) => `<i class="${i <= tier ? 'on' : ''}"></i>`).join('')}</span>${p.start === l.id ? '<span class="ribbon">Start here</span>' : ''}</button>`;
}
function renderBase() {
  const p = P(), th = PUM.THEMES[p.theme], m = nextMission(p), w = PUM.LV[p.world], L = p.levels[p.world], tier = L ? L.tier : 0;
  const shelfTitle = p.theme === 'trucks' ? 'Your town' : p.theme === 'soccer' ? 'Trophy shelf' : 'Hero badges';
  return `
  <header class="top">${backBtn('home', 'Back to players')}<div class="who">${avatar(p, 'av-sm')}<div style="min-width:0"><h2 class="title">${esc(p.name)}</h2><span class="pmeta">${th.base}</span></div></div><button class="icon-btn" data-act="edit" aria-label="Edit ${esc(p.name)}">${icon('pencil')}</button></header>
  <section class="mission">
    <div class="mission-head"><span class="kicker">${th.game}</span>${mpChip(p)}</div>
    <h3>${esc(m.title)}</h3><p class="act-sub">${esc(m.sub)}</p>
    <button class="btn go big wide" data-act="play">${icon('play')} Play</button>
    <button class="btn primary wide" data-act="train">${icon('brain')} Earn math points</button>
  </section>
  <section class="block"><h2>Upgrade your ${th.base.toLowerCase()}</h2><p class="hint-text" style="margin:-6px 0 12px">Spend math points to make your ${p.theme === 'trucks' ? 'truck' : p.theme === 'soccer' ? 'team' : 'hero'} stronger.</p><div class="upgs">${upgradeCards(p)}</div></section>
  <section class="block"><h2>${shelfTitle}</h2>${shelf(p)}</section>
  <section class="block"><h2>Math level</h2>
    <div class="worldrow"><span class="badge" style="--wc:var(--${w.color})">${w.ex}</span><span class="wtext"><b>${w.name}</b><small>Step ${tier + 1} of ${w.steps.length}: ${w.steps[tier]}</small></span><button class="btn small" data-act="toggle-worlds" aria-expanded="${showWorlds}">${showWorlds ? 'Close' : 'Change'}</button></div>
    ${showWorlds ? `<div class="worlds">${PUM.LEVELS.map(l => worldCard(p, l)).join('')}</div>` : ''}
  </section>
  <section class="block"><h2>Settings for ${esc(p.name)}</h2>
    <div class="set-row"><span>Answer with</span><div class="seg">${seg('mode', 'choices', 'Big buttons', p.mode)}${seg('mode', 'keypad', 'Number pad', p.mode)}</div></div>
    <div class="set-row"><span>Read questions aloud</span><div class="seg">${seg('speak', 'on', 'On', p.speak ? 'on' : 'off')}${seg('speak', 'off', 'Off', p.speak ? 'on' : 'off')}</div></div>
    ${syncChip()}
  </section>`;
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
    <h2 class="rtitle">+${t.earned} math points!</h2>
    <div class="reward-art">${PUM.avatarSVG(p)}</div>
    <p class="rmsg">${t.res.filter(Boolean).length} of ${t.len} right. You have ${p.mp} math points to spend at your ${PUM.THEMES[p.theme].base.toLowerCase()}.</p>
    <div class="ractions"><button class="btn go big" data-act="back" data-to="base">${icon('bolt')} Spend them</button><button class="btn" data-act="train">Earn more</button></div>
  </div>`;
}
function renderResult() {
  const p = P(), r = result;
  return `<div class="results">
    <h2 class="rtitle">${esc(r.title)}</h2>
    ${r.stars != null ? `<div class="rstars">${[0, 1, 2].map(i => `<span class="rs ${i < r.stars ? 'on' : ''}" style="--i:${i}">${icon('star', 'fill')}</span>`).join('')}</div>` : ''}
    <div class="reward-art">${r.art}</div>
    <p class="rmsg">${esc(r.msg)}</p>
    <p class="rnote">${icon('bolt')} +${r.mp} math points this game</p>
    <div class="ractions"><button class="btn go big" data-act="play">${icon('play')} ${esc(r.again)}</button><button class="btn primary" data-act="back" data-to="base">Upgrade at the ${PUM.THEMES[p.theme].base.toLowerCase()}</button></div>
  </div>`;
}
function render() {
  if (view !== 'home' && view !== 'form' && !P()) view = 'home';
  if (view === 'form' && !draft) view = 'home';
  document.documentElement.classList.toggle('playing', view === 'train');
  app.hidden = view === 'game';
  if (view === 'game') return;
  app.innerHTML = view === 'form' ? renderForm() : view === 'base' ? renderBase() : view === 'train' ? renderTrain() : view === 'trainDone' ? renderTrainDone() : view === 'result' ? renderResult() : renderHome();
  if (view === 'train' && quiz) { quiz.destroy(); quiz = null; }
  if (view === 'train') {
    quiz = PUM.Quiz(document.getElementById('quiz-mount'), {player:P, onAnswer:onTrainAnswer, onAdvance:advanceTrain});
    quiz.next();
  }
}
function go(v) { if (quiz && v !== 'train') { quiz.destroy(); quiz = null; } view = v; render(); try { window.scrollTo(0, 0); } catch (e) {} }

/* ---------- training ---------- */
function startTrain() { train = {n:0, len:10, res:[], earned:0}; go('train'); }
function onTrainAnswer(ok, info) {
  train.res.push(ok); train.earned += info.mp;
  store.savePlayer(P());
  const chip = document.getElementById('mp-chip'); if (chip) chip.outerHTML = mpChip(P());
  const pips = app.querySelectorAll('.pip'); const i = train.res.length - 1;
  if (pips[i]) { pips[i].className = 'pip ' + (ok ? 'hit' : 'miss'); pips[i].innerHTML = ok ? icon('star', 'fill') : ''; }
}
function advanceTrain() {
  train.n++;
  if (train.n >= train.len) { if (quiz) { quiz.destroy(); quiz = null; } A.sfx('fanfare'); go('trainDone'); return; }
  const pips = app.querySelectorAll('.pip'); if (pips[train.n]) pips[train.n].classList.add('now');
  quiz.next();
}

/* ---------- game shell ---------- */
function hudHTML(p) {
  const th = PUM.THEMES[p.theme];
  const ctrl = p.theme === 'trucks'
    ? `<button class="ctl brake" data-ctl="brake" aria-label="Brake">${icon('back')}<span>Brake</span></button><button class="ctl gas" data-ctl="gas" aria-label="Gas">${icon('next')}<span>Gas</span></button>`
    : p.theme === 'anime'
      ? `<button class="ctl slide" data-ctl="slide" aria-label="Slide"><span>Slide</span></button><button class="ctl blast" data-ctl="blast" id="blast-btn" hidden aria-label="Power blast">${icon('bolt')}<span>Blast</span></button><button class="ctl jump" data-ctl="jump" aria-label="Jump">${icon('up')}<span>Jump</span></button>`
      : '';
  return `<canvas id="gc" aria-label="${th.game}"></canvas>
    <div class="hud">
      <button class="icon-btn" data-g="exit" aria-label="Stop and go back">${icon('x')}</button>
      <div class="gauge" style="--pc:var(--${th.pc})"><span class="gl">${th.fuel}</span><span class="gbar"><i id="g-fuel"></i></span></div>
      <span class="hud-mp">${icon('bolt')}<b id="g-mp">0</b></span>
    </div>
    <div class="hud2" id="hud2"></div>
    ${p.theme === 'trucks' ? '<div class="rot-tip" id="rot-tip">Tip: turn your phone sideways to see further ahead</div>' : ''}
    <div class="controls ${p.theme}">${ctrl}</div>
    <div class="overlay" id="overlay" hidden></div>`;
}
function startGame() {
  const p = P(); if (!p) return go('home');
  if (quiz) { quiz.destroy(); quiz = null; }
  view = 'game'; render();
  shell.hidden = false; shell.innerHTML = hudHTML(p);
  document.documentElement.classList.add('in-game');
  const api = {
    hud: h => hud(h),
    addMp: n => { p.mp += n; p.mpTotal += n; play.mp += n; const el = document.getElementById('g-mp'); if (el) el.textContent = play.mp; },
    toast: m => PUM.fx.toast(esc(m)),
    needRefuel: reason => openRefuel(reason),
    finish: r => finishGame(r),
  };
  const game = PUM.games[p.theme]({player:p, stats:p.up, assist:assistOf(p), level:levelOf(p), api});
  const canvas = document.getElementById('gc');
  const runner = PUM.engine.Runner(canvas, game);
  play = {game, runner, mp:0, reason:null, refuelQuiz:null, last:{}};
  runner.start(); game.onStart && game.onStart();
  const ctlDown = e => { const b = e.target.closest('[data-ctl]'); if (!b) return; e.preventDefault(); A.ac(); b.classList.add('down'); game.setControl && game.setControl(b.dataset.ctl, true); try { b.setPointerCapture(e.pointerId); } catch (_) {} };
  const ctlUp = e => { const b = e.target.closest('[data-ctl]'); if (!b) return; b.classList.remove('down'); game.setControl && game.setControl(b.dataset.ctl, false); };
  shell.addEventListener('pointerdown', ctlDown); shell.addEventListener('pointerup', ctlUp); shell.addEventListener('pointercancel', ctlUp);
  play.cleanup = () => { shell.removeEventListener('pointerdown', ctlDown); shell.removeEventListener('pointerup', ctlUp); shell.removeEventListener('pointercancel', ctlUp); };
}
function hud(h) {
  if (!play) return;
  const last = play.last, set = (id, fn) => { const el = document.getElementById(id); if (el) fn(el); };
  const fuel = h.fuel != null ? h.fuel : h.energy != null ? h.energy : h.st / h.max;
  if (Math.abs((last.fuel || 0) - fuel) > .004) { last.fuel = fuel; set('g-fuel', el => { el.style.width = (clamp(fuel, 0, 1) * 100).toFixed(1) + '%'; el.classList.toggle('low', fuel < .25); }); }
  let html = '';
  if (h.bricks != null) html = `<span class="chip">${'<i class="brick"></i>'.repeat(h.bricks)}${'<i class="brick off"></i>'.repeat(h.max - h.bricks)}</span><span class="prog"><i style="width:${(h.progress * 100).toFixed(1)}%"></i></span>`;
  else if (h.hearts != null) html = `<span class="chip">${'<i class="heart"></i>'.repeat(Math.max(0, h.hearts))}${'<i class="heart off"></i>'.repeat(Math.max(0, h.max - h.hearts))}</span><span class="chip orbs">${h.orbs} orbs${h.boss ? ` &middot; ${h.charge} blast${h.charge === 1 ? '' : 's'}` : ''}</span>${h.boss ? '' : `<span class="prog"><i style="width:${(h.progress * 100).toFixed(1)}%"></i></span>`}`;
  else if (h.st != null) html = `<span class="chip">${h.power ? '<b class="pw">POWER SHOT</b>' : `${h.st} of ${h.max} stamina`}</span>`;
  if (html !== last.html) { last.html = html; set('hud2', el => { el.innerHTML = html; }); }
  if (h.boss != null && h.boss !== last.boss) { last.boss = h.boss; set('blast-btn', el => { el.hidden = !h.boss; }); }
}
function openRefuel(reason) {
  if (!play) return;
  const p = P(), th = PUM.THEMES[p.theme], frac = refillFrac(p);
  play.runner.pause(); play.reason = reason;
  ['gas', 'brake'].forEach(c => play.game.setControl && p.theme === 'trucks' && play.game.setControl(c, false));
  const title = reason === 'revive' ? 'Knocked out!' : `Out of ${th.fuel.toLowerCase()}!`;
  const sub = reason === 'revive' ? 'Answer one question to get back up.' : `Each right answer adds ${Math.round(frac * 100)}% ${th.fuel.toLowerCase()}. Upgrade your ${th.base.toLowerCase()} to refill faster.`;
  const ov = document.getElementById('overlay');
  ov.hidden = false;
  ov.innerHTML = `<div class="refuel"><div class="refuel-head"><h2>${title}</h2><p>${sub}</p>
    <div class="gauge big" style="--pc:var(--${th.pc})"><span class="gl">${th.fuel}</span><span class="gbar"><i id="r-fuel" style="width:${(play.game.level() * 100).toFixed(0)}%"></i></span></div></div>
    <div id="refuel-quiz" class="quiz-mount compact"></div>
    <button class="btn go wide" id="refuel-go" data-g="resume" hidden>${icon('play')} Back to the game</button></div>`;
  A.sfx('no');
  play.refuelQuiz = PUM.Quiz(document.getElementById('refuel-quiz'), {player:P, compact:true, onAnswer:(ok, info) => {
    if (!ok) return;
    play.game.refill(frac, reason);
    play.mp += info.mp; const gm = document.getElementById('g-mp'); if (gm) gm.textContent = play.mp;
    const rf = document.getElementById('r-fuel'); if (rf) rf.style.width = (play.game.level() * 100).toFixed(0) + '%';
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
  const gameMp = play.mp;
  let bonus = 0, res;
  if (p.theme === 'trucks') {
    const t = p.prog.trucks, before = Math.floor(t.bricks / PUM.BRICKS_PER_BUILDING);
    t.bricks += r.bricks; const after = Math.floor(t.bricks / PUM.BRICKS_PER_BUILDING);
    const doneB = [];
    for (let i = before; i < after; i++) { doneB.push(t.built.length); t.built.push(t.built.length); }
    if (r.bricks > 0) t.level++;
    bonus = r.stars;
    const cur = PUM.BUILDINGS[t.built.length % PUM.BUILDINGS.length];
    res = {title:r.bricks ? `Delivered ${r.bricks} of ${r.max} bricks!` : 'No bricks made it', stars:r.stars,
      art:doneB.length ? PUM.buildingSVG(PUM.BUILDINGS[doneB[doneB.length - 1] % PUM.BUILDINGS.length].color) : PUM.buildingSVG(cur.color, (t.bricks % PUM.BRICKS_PER_BUILDING) / PUM.BRICKS_PER_BUILDING),
      msg:doneB.length ? `The ${PUM.BUILDINGS[doneB[doneB.length - 1] % PUM.BUILDINGS.length].name.toLowerCase()} is finished and part of your town!` : r.bricks ? `The ${cur.name.toLowerCase()} now has ${t.bricks % PUM.BRICKS_PER_BUILDING} of ${PUM.BRICKS_PER_BUILDING} bricks.` : 'Drive gently over the bumps so the bricks stay in. Try again!',
      again:r.bricks ? 'Next delivery' : 'Try again'};
  } else if (p.theme === 'soccer') {
    const s = p.prog.soccer;
    s[r.result]++; if (r.result === 'w') s.sw++;
    s.match++;
    let cup = null;
    if (s.match >= 5) { const m = s.sw >= 4 ? 'gold' : s.sw >= 2 ? 'silver' : 'bronze'; cup = {i:s.season, m}; s.trophies.push(cup); s.season++; s.match = 0; s.sw = 0; }
    bonus = r.result === 'w' ? 3 : r.result === 'd' ? 1 : 0;
    res = {title:r.result === 'w' ? `You won ${r.you}–${r.them}!` : r.result === 'd' ? `A draw, ${r.you}–${r.them}` : `Lost ${r.you}–${r.them}`, stars:r.result === 'w' ? (r.you - r.them >= 2 ? 3 : 2) : r.result === 'd' ? 1 : 0,
      art:cup ? PUM.trophySVG(cup.m) : PUM.jerseySVG(p.color, (p.name || '?').charAt(0).toUpperCase()),
      msg:cup ? `${PUM.CUPS[cup.i % PUM.CUPS.length]} finished: you earned the ${cup.m} trophy!` : r.result === 'w' ? `Beat the ${r.team.name}. On to the next match!` : `The ${r.team.name} were tough. Upgrade your shot power or gloves and try the next match.`,
      again:'Next match'};
  } else {
    const h = p.prog.anime;
    if (r.cleared) { h.badges.push(h.world); h.world++; }
    bonus = r.cleared ? 4 : 0;
    res = {title:`${r.world.boss} defeated!`, stars:3, art:PUM.badgeSVG(r.world.color, h.world), msg:`${PUM.HEROES[p.hero].name} cleared ${r.world.name} and earned a badge.`, again:'Next world'};
  }
  p.mp += bonus; p.mpTotal += bonus;
  res.mp = gameMp + bonus;
  result = res;
  stopGame();
  store.savePlayer(p);
  A.sfx('fanfare');
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
    case 'open': pid = el.dataset.id; showWorlds = false; A.sfx('tap'); go('base'); break;
    case 'edit': { const p = P(); if (!p) break; draft = {id:p.id, name:p.name, color:p.color, theme:p.theme, hero:p.hero, age:p.age}; confirmDel = false; A.sfx('tap'); go('form'); break; }
    case 'pick': { const k = el.dataset.k; draft[k] = (k === 'age' || k === 'hero') ? Number(el.dataset.v) : el.dataset.v; confirmDel = false; A.sfx('tap'); render(); break; }
    case 'save-player': saveForm(); break;
    case 'del-player': {
      if (!confirmDel) { confirmDel = true; render(); break; }
      const id = draft.id; S.players = S.players.filter(p => p.id !== id); store.S.players = S.players; store.saveLocal(); store.deleteRemote(id);
      pid = null; draft = null; go('home'); break;
    }
    case 'back': { const to = el.dataset.to; if (to === 'base' && !P()) go('home'); else { go(to); if (to === 'home') store.pull(); } break; }
    case 'end-train': if (quiz) quiz.destroy(); quiz = null; train && train.earned ? go('trainDone') : go('base'); break;
    case 'train': A.sfx('tap'); startTrain(); break;
    case 'play': A.sfx('tap'); startGame(); break;
    case 'upgrade': {
      const p = P(), k = el.dataset.k, lvl = p.up[k];
      if (lvl >= PUM.UP_MAX) break;
      const cost = PUM.UP_COST[lvl];
      if (p.mp < cost) { PUM.fx.toast(`Need ${cost - p.mp} more math points. Tap Earn math points!`); A.sfx('no'); break; }
      p.mp -= cost; p.up[k]++; store.savePlayer(p); A.sfx('up');
      const name = PUM.UPGRADES[p.theme].find(u => u.k === k).name;
      PUM.fx.toast(`${icon('up')} ${name} level ${p.up[k]}!`);
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
  if (el.dataset.g === 'exit') { stopGame(); go('base'); }
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
const KEYMAP = {ArrowRight:'gas', ArrowLeft:'brake', ArrowUp:'jump', ' ':'jump', ArrowDown:'slide', b:'blast', Enter:'blast'};
document.addEventListener('keydown', e => {
  if (e.target && e.target.tagName === 'INPUT') return;
  if (view === 'train' && quiz) { quiz.key(e); return; }
  if (play) {
    if (play.refuelQuiz) { play.refuelQuiz.key(e); return; }
    const c = KEYMAP[e.key]; if (c && !e.repeat) { e.preventDefault(); A.ac(); play.game.setControl && play.game.setControl(c, true); }
  }
});
document.addEventListener('keyup', e => { if (play && !play.refuelQuiz) { const c = KEYMAP[e.key]; if (c) play.game.setControl && play.game.setControl(c, false); } });
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') store.pull();
  else if (play && !play.refuelQuiz) { play.runner.pause(); A.engineSet(0, 0); }
  if (document.visibilityState === 'visible' && play && !play.refuelQuiz && play.runner.paused) play.runner.resume();
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
    const p = store.normalize({id:PUM.util.uid(), name, color:d.color, theme:d.theme, hero:d.hero, age:d.age, start, world:start, speak:d.age <= 6, created:Date.now(), mp:5});
    store.lv(p, start).tier = tier;
    S.players.push(p); store.savePlayer(p); pid = p.id;
  }
  draft = null; A.sfx('tap'); go('base');
}

PUM.app = {go, P, get play() { return play; }, startGame};
render();
store.pull();
})();
