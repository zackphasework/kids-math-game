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
let townSel = null, townConfirm = false, jobFrom = null, jobResult = null, bg = null, townScroll = false;
const P = () => S.players.find(p => p.id === pid);
const assistOf = p => p.age <= 5 ? 2 : p.age <= 7 ? 1 : 0;
const UPS = p => CP.upgrades[p.theme];
const camp = p => CP[p.theme];
const isRig = p => p && p.theme === 'trucks';
const isSky = p => p && p.theme === 'anime';
const curName = p => isRig(p) ? 'coins' : isSky(p) ? 'crystals' : 'math points';
const curIcon = p => isRig(p) ? icon('coin', 'coin') : isSky(p) ? icon('gem', 'gem') : icon('bolt');

/* ---------- small renderers ---------- */
const muteBtn = () => `<button class="icon-btn" id="mute" data-act="mute" aria-label="${S.muted ? 'Turn sound on' : 'Turn sound off'}" aria-pressed="${S.muted}">${icon(S.muted ? 'mute' : 'sound')}</button>`;
const backBtn = (to, label = 'Back') => `<button class="icon-btn" data-act="back" data-to="${to}" aria-label="${label}">${icon('back')}</button>`;
const avatar = (p, cls) => `<span class="avatar ${cls}">${PUM.avatarSVG(p)}</span>`;
const mpChip = p => `<span class="mp-chip" id="mp-chip">${curIcon(p)} <b>${p.mp}</b> ${curName(p)}</span>`;
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
store.sync.onPulled = () => { if (pid && !P()) { pid = null; if (view !== 'form') view = 'home'; } if (view === 'home' || view === 'games' || view === 'base' || view === 'map' || view === 'garage' || view === 'skyGarden' || view === 'skyForge') render(); };

/* ---------- screens ---------- */
/* ---------- install as an app ----------
   Chrome and Android offer a real install prompt; iPhone and iPad Safari need Share, then Add to Home Screen. */
let installEvt = null;
const isStandalone = () => { try { return matchMedia('(display-mode: standalone)').matches || navigator.standalone === true; } catch (e) { return false; } };
const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const installLater = () => { try { return Date.now() - Number(localStorage.getItem('pum-install-later') || 0) < 3 * 864e5; } catch (e) { return false; } };
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEvt = e; if (view === 'home') render(); });
window.addEventListener('appinstalled', () => { installEvt = null; if (view === 'home') render(); });
function installCard() {
  if (isStandalone() || installLater()) return '';
  const art = `<img class="inst-icon" src="icons/icon-192.png" alt="">`;
  if (installEvt) return `<section class="block install"><div class="inst-row">${art}<div><h2>Get the app</h2><p>Put Power-Up Math on this device's home screen. It opens full screen and works without internet.</p></div></div>
    <div class="inst-btns"><button class="btn go" data-act="install">${icon('plus')} Install</button><button class="btn ghost small" data-act="install-later">Not now</button></div></section>`;
  if (isIOS) return `<section class="block install"><div class="inst-row">${art}<div><h2>Get the app</h2><p>Tap <b>Share</b> <span class="inst-share" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 3v12M7 8l5-5 5 5M5 12v8h14v-8"/></svg></span> at the top or bottom of Safari, then <b>Add to Home Screen</b>.</p></div></div>
    <div class="inst-btns"><button class="btn ghost small" data-act="install-later">Got it</button></div></section>`;
  return '';
}

function renderHome() {
  const ps = [...S.players].sort((a, b) => a.created - b.created);
  return `
  <header class="top"><div><h1>Power-Up Math</h1><p class="sub">Solve math to build a whole town with the truck crew, or save the three sky islands.</p></div>${muteBtn()}</header>
  <div class="hero-strip" aria-hidden="true">${PUM.truckSVG('excavator', 'marigold')}${PUM.SKYART.portraitImg(PUM.SKYART.look(0, null, null, 'berry'))}</div>
  ${installCard()}
  <section class="block"><h2>Who's playing?</h2>
    <div class="players">${ps.map(p => `<button class="player" data-act="open" data-id="${p.id}">${avatar(p, 'av')}<span class="pname">${esc(p.name)}</span><span class="pmeta">Last: ${PUM.THEMES[p.theme].game}</span></button>`).join('')}
      <button class="player add" data-act="add-player">${icon('plus')}<span>Add player</span></button></div>
    ${ps.length ? '' : `<p class="empty-note">Add each kid once with their name, age and colour. They'll start at the right math level and can play every game.</p>`}
    ${syncChip()}
  </section>`;
}
function renderForm() {
  const d = draft, editing = !!d.id;
  const [l, t] = PUM.AGE_START[d.age];
  return `
  <header class="top">${backBtn(editing ? 'games' : 'home')}<h2 class="title">${editing ? 'Edit player' : 'New player'}</h2><span style="width:52px"></span></header>
  <div class="form">
    <div class="preview">${avatar(d, 'av-big')}<span id="pv-name">${esc(d.name || 'Name')}</span></div>
    <label class="lab" for="pname">Name</label>
    <input id="pname" class="field" maxlength="16" autocomplete="off" autocapitalize="words" spellcheck="false" placeholder="Type a name" value="${esc(d.name)}">
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
      ${max ? '<span class="upg-max">Maxed out</span>' : `<button class="btn small ${can ? 'go' : ''}" data-act="upgrade" data-k="${u.k}" ${can ? '' : 'aria-disabled="true"'}>${curIcon(p)} ${can ? `Upgrade · ${cost}` : `Need ${cost}`}</button>`}
    </div>`;
  }).join('');
}
function nextLevel(p) { return CP.level(p.theme, p.prog[p.theme].unlocked); }
function renderBase() {
  const p = P(), th = PUM.THEMES[p.theme], nl = nextLevel(p), pw = CP.power(p), w = PUM.LV[p.world], L = p.levels[p.world], tier = L ? L.tier : 0;
  const weak = pw < nl.power;
  const wd = camp(p).worlds[nl.world];
  return `
  <header class="top">${backBtn('games', 'Back to games')}<div class="who">${avatar(p, 'av-sm')}<div style="min-width:0"><h2 class="title">${esc(p.name)}</h2><span class="pmeta">${th.game}</span></div></div><button class="icon-btn" data-act="edit" aria-label="Edit ${esc(p.name)}">${icon('pencil')}</button></header>
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
    <p class="rmsg">${t.res.filter(Boolean).length} of ${t.len} right. You have ${p.mp} ${curName(p)} to spend ${isSky(p) ? 'in Sky Village' : `at your ${PUM.THEMES[p.theme].base.toLowerCase()}`}.</p>
    ${isSky(p) ? `<p class="rnote">+${t.xp || 0} XP${t.snack ? ' &middot; +1 spirit snack for getting 8 or more right!' : ''}</p>` : ''}
    <div class="ractions"><button class="btn go big" data-act="${isRig(p) ? 'garage' : 'back'}" data-to="base">${curIcon(p)} Spend them</button><button class="btn" data-act="train">Earn more</button>${isRig(p) ? '<button class="btn" data-act="back" data-to="base">Back to town</button>' : ''}</div>
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
  if (view === 'skyDone' && !skyResult) view = 'base';
  if (isSky(P()) && !P().sky.made && ['base', 'map', 'skyGarden', 'skyForge'].includes(view)) view = 'skySetup';
  if (view === 'skySetup' && !setup) setup = P() ? initSetup(P()) : null;
  if (view === 'skySetup' && !setup) view = 'home';
  document.documentElement.classList.toggle('playing', view === 'train');
  app.hidden = view === 'game';
  stopBg();
  if (view === 'game') return;
  const rig = isRig(P()), sky = !!isSky(P()) && view !== 'home' && view !== 'form' && view !== 'games';
  document.documentElement.classList.toggle('skyui', sky);
  app.innerHTML = view === 'form' ? renderForm() : view === 'games' ? renderGames() : view === 'base' ? (rig ? renderTown() : sky ? renderVillage() : renderBase()) : view === 'garage' ? renderGarage() : view === 'job' ? renderJob() : view === 'jobDone' ? renderJobDone()
    : view === 'map' ? (sky ? renderSkyMap() : renderMap()) : view === 'skySetup' ? renderSkySetup() : view === 'skyGarden' ? renderGarden() : view === 'skyForge' ? renderForge() : view === 'skyDone' ? renderSkyDone()
    : view === 'train' ? renderTrain() : view === 'trainDone' ? renderTrainDone() : view === 'result' ? renderResult() : renderHome();
  afterRender();
  if (view === 'train' && quiz) { quiz.destroy(); quiz = null; }
  if (view === 'train') { quiz = PUM.Quiz(document.getElementById('quiz-mount'), {player:P, onAnswer:onTrainAnswer, onAdvance:advanceTrain}); quiz.next(); }
}
function go(v) { if (quiz && v !== 'train') { quiz.destroy(); quiz = null; } view = v; render(); try { window.scrollTo(0, 0); } catch (e) {} }

/* ---------- game picker: one player plays all three games ---------- */
/* Striker Rush (soccer) is parked until it's ready: its code stays in js/soccer.js but isn't loaded. */
const GAME_ORDER = ['trucks', 'anime'];
const coinIcon = g => g === 'trucks' ? icon('coin', 'coin') : g === 'anime' ? icon('gem', 'gem') : icon('bolt');
const coinName = g => g === 'trucks' ? 'coins' : g === 'anime' ? 'crystals' : 'math points';
function gameTile(p, g) {
  const init = (p.name || '?').trim().charAt(0).toUpperCase() || '?';
  let art, what, prog;
  if (g === 'trucks') { art = PUM.truckSVG('excavator', p.color); what = 'Build the town with the truck crew'; prog = `${R.builtCount(p)} of ${R.ACTIVE} built`; }
  else if (g === 'soccer') { const pr = p.prog.soccer, st = pr.stars.reduce((a, b) => a + b, 0); art = PUM.jerseySVG(p.color, init); what = 'Score goals and win the cup'; prog = `Level ${Math.min(pr.unlocked + 1, CP.count)} &middot; ${st} ${icon('star', 'fill')}`; }
  else { const s = p.sky; art = KA.portraitImg(s.made ? KA.lookOf(p) : KA.look(0, null, null, p.color)); what = SK.cleared(p) >= SK.ACTIVE ? 'You saved all three sky islands!' : `Heal ${SK.ISLANDS[SK.curIsle(p)].name} with your spirit`; prog = s.made ? `Lv ${SK.level(s.xp)} &middot; ${SK.cleared(p)} of ${SK.ACTIVE} quests` : 'Make your hero to start'; }
  const last = p.theme === g && p.mpTotal > 0;
  return `<button class="game-t g-${g} ${last ? 'last' : ''}" data-act="pick-game" data-g="${g}">
    <span class="game-art">${art}</span>
    <span class="game-txt"><b>${PUM.THEMES[g].game}</b><small>${what}</small><span class="game-prog">${prog}</span><span class="game-coins">${coinIcon(g)} <b>${p.coins[g]}</b> ${coinName(g)}</span></span>
    ${last ? '<span class="game-last">Last played</span>' : ''}
  </button>`;
}
function renderGames() {
  const p = P();
  return `
  <header class="top">${backBtn('home', 'Back to players')}<div class="who">${avatar(p, 'av-sm')}<div style="min-width:0"><h2 class="title">${esc(p.name)}</h2><span class="pmeta">Pick a game</span></div></div><button class="icon-btn" data-act="edit" aria-label="Edit ${esc(p.name)}">${icon('pencil')}</button></header>
  <div class="games">${GAME_ORDER.map(g => gameTile(p, g)).join('')}</div>
  <p class="hint-text">Your math level comes with you to every game. Each game keeps its own coins.</p>`;
}

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
  const p = P(); if (!p || view === 'games') return;
  if (isSky(p)) { skyAfterRender(p); return; }
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
    if (townScroll) { townScroll = false; const ly = R.lotY(cur); const top = c.getBoundingClientRect().top + window.scrollY; if (ly > 260) setTimeout(() => { try { window.scrollTo({top:Math.max(0, top + ly - window.innerHeight * .55), behavior:'smooth'}); } catch (e) {} }, 60); }
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
function nextJobBtn(p) {
  const pr = p.prog.trucks, j = p.rig.job, all = R.builtCount(p) >= R.ACTIVE;
  const i = j ? j.i : Math.min(pr.unlocked, R.ACTIVE - 1), J = R.job(i);
  const what = j ? `Keep building: step ${j.stage + 1} of ${J.steps.length}` : all ? 'The whole town is built! Replay for stars' : i % 5 === 0 && i && !R.built(p, i) ? `New: ${CP.trucks.worlds[J.world].name}! ${J.steps.length} steps` : R.built(p, i) ? 'Build it again for more stars' : `Next job: ${J.steps.length} steps`;
  return `<button class="next-job" data-act="sel-lot" data-i="${i}"><span class="nj-t"><small>${esc(what)}</small><b>${esc(J.name)}</b></span><span class="nj-go">${icon('play')} Go</span></button>`;
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
      <span class="kicker">Job ${i + 1} of ${R.ACTIVE} &middot; ${esc(CP.trucks.worlds[J.world].name)}${J.boss ? ' &middot; BOSS' : ''}</span>
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
  <header class="top">${backBtn('games', 'Back to games')}<div class="who">${avatar(p, 'av-sm')}<div style="min-width:0"><h2 class="title">${esc(p.name)}</h2><span class="pmeta">Big Rig Builders &middot; ${R.builtCount(p)} of ${R.ACTIVE} built</span></div></div><button class="icon-btn" data-act="edit" aria-label="Edit ${esc(p.name)}">${icon('pencil')}</button></header>
  ${nextJobBtn(p)}
  <div class="town-bar">${mpChip(p)}<button class="btn small" data-act="garage">${icon('wrench')} Garage</button><button class="btn small primary" data-act="train">${icon('brain')} Practice yard</button></div>
  <div class="town-wrap"><canvas id="town" aria-label="The town: Main Street, the Hills and Big City. Tap a building lot to see the job."></canvas></div>
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
  <section class="block"><h2>Your trucks</h2><p class="hint-text" style="margin:-6px 0 12px">Tap a colour to paint a truck. ${R.paintPrice(p) ? `Each paint job costs ${R.paintPrice(p)} coins.` : 'Painting is free at your paint shop!'}</p><div class="truck-cards">${cards}</div></section>
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
  const bonus = stars * 2 + (J.boss ? 5 : 0) + (R.bonus(p, 'crew') ? 5 : 0);
  p.mp += bonus; p.mpTotal += bonus;
  jobResult = {i, stars, coins:j.coins + bonus, cargo, newTrucks:R.TRUCKS.filter(t => R.owns(p, t.k) && !before.includes(t.k)).map(t => t.name)};
  p.rig.job = null; townSel = null; townScroll = true;
  store.savePlayer(p); A.sfx('fanfare');
  go('jobDone');
}
const LOADKEYS = {'+':'add1', '=':'add1', ArrowUp:'add1', '-':'less', ArrowDown:'less', Enter:'done'};
function loaderCtrl(p) { return `<div class="load-ctl"><button class="ctl less" data-ctl="less" aria-label="One less">&minus;1</button>${R.scoops(p).map(n => `<button class="ctl add ${n > 1 ? 'big' : ''}" data-ctl="add${n}" aria-label="Add ${n}">+${n}</button>`).join('')}<button class="ctl done" data-ctl="done">${icon('check')}<span>Done</span></button></div>`; }
const truckCtrl = () => `<button class="ctl steer" data-ctl="left" aria-label="Steer left">${icon('back')}</button><button class="ctl brake" data-ctl="brake" aria-label="Brake"><span>Brake</span></button><button class="ctl steer" data-ctl="right" aria-label="Steer right">${icon('next')}</button>`;
function rigLoad(mat, truck) {
  const p = P(), j = p.rig.job, dig = mat === 'dirt';
  openShell({cls:'loader', ctrl:loaderCtrl(p), gauge:false, keymap:LOADKEYS, onExit:() => go('job'),
    make:api => PUM.games.load({player:p, assist:assistOf(p), mat, dig, color:R.paint(p, truck), world:R.world(j.i), api}),
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
    make:api => PUM.games.trucks({player:p, assist:assistOf(p), levelIndex:j.i, api, trip:{mat, truck, color:R.paint(p, truck), race:R.job(j.i).steps.findLastIndex(s => R.MATS[s]) === j.stage}}),
    onFinish:r => {
      const mp = play ? play.mp : 0; stopGame();
      j.coins += mp;
      if (r.ok) {
        j.n += r.gates || 0; j.ok += r.gatesOk || 0;
        const pay = Math.max(1, Math.round((5 + j.i) * r.cargo * (1 + .25 * p.up.bed))) + R.tripBonus(p, mat);
        j.cargo.push(r.cargo); store.savePlayer(p);
        rigUnload(mat, truck, r.cargo, pay);
      } else {
        j.msg = r.reason === 'lost' ? 'The whole load fell off! Load up and try again. Slow down for potholes and dodge the rocks.'
          : r.reason === 'boss' ? `${CP.trucks.worlds[R.world(j.i)].racer || 'The rival'} won the race! Load up and try again. Right answers at the gates give you turbo.`
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


/* ---------- Sky Quest: village, sky map, hero setup, spirit garden, forge, results ---------- */
const SK = PUM.SKY, KA = PUM.SKYART;
let skySel = null, questSel = null, skyIsle = null, setup = null, skyResult = null, evo = null;
const SKYKEYS = {ArrowLeft:'left', ArrowRight:'right', ArrowUp:'jump', ' ':'jump', '1':'k1', '2':'k2', '3':'k3', '4':'k4', s:'k0', d:'dash', Shift:'dash', f:'glide', ArrowDown:'glide'};
const spiritImg = (k, stage) => `<img class="sq-spirit" src="${KA.spiritImg(k, stage)}" alt="" draggable="false">`;
function compList(p) { return Object.keys(p.sky.comps).map(k => ({k, kind:k, c:p.sky.comps[k], stage:SK.isGuardian(k) ? 3 : SK.stage(p.sky.comps[k].lv), name:SK.compName(k, p.sky.comps[k])})); }
/* what the sky map and village need to know about each island */
function isleInfo(p) {
  const pr = p.prog.anime;
  return SK.ISLANDS.map((I, k) => ({name:I.name, open:SK.isleOpen(p, k), heal:SK.heal(p, k), cleared:SK.cleared(p, k),
    quests:[0, 1, 2, 3, 4].map(j => { const i = k * 5 + j; return {i, boss:!!SK.QUESTS[i].boss, locked:i > pr.unlocked, cur:i === pr.unlocked && !pr.stars[i], stars:pr.stars[i]}; })}));
}
const lockedIsleMsg = k => `Defeat ${SK.GUARDIANS[SK.ISLANDS[k - 1].guardian].name} on ${SK.ISLANDS[k - 1].name} to open ${SK.ISLANDS[k].name}`;
function heroCard(p) {
  const s = p.sky, lv = SK.level(s.xp), c = SK.activeComp(p);
  return `<div class="sq-hero">${KA.portraitImg(KA.lookOf(p), 'sq-port')}<div class="sq-hero-t"><b>${esc(SK.heroName(p))} &middot; Lv ${lv}</b><span>${SK.title(lv)}</span><span class="xpbar" aria-label="Experience to next level"><i style="width:${(SK.xpFrac(s.xp) * 100).toFixed(0)}%"></i></span><small>${spiritImg(c.kind, c.stage)} ${esc(c.name)} is with you</small>${['double', 'dash', 'glide'].some(m => s.moves[m]) ? `<span class="sq-movechips">${['double', 'dash', 'glide'].filter(m => s.moves[m]).map(m => `<i>${SK.MOVE_INFO[m].name}</i>`).join('')}</span>` : ''}</div></div>`;
}
function buildCard(p, B) {
  const s = p.sky, built = B.k === 'dojo' || s.b[B.k];
  let act;
  if (B.k === 'shrine' && built) act = `<span class="upg-max">Open! Use ${SK.SPECIAL2} when your Spirit meter is full</span>`;
  else if (B.k === 'shrine' && SK.guardians(p) >= B.guardians) act = `<button class="btn small go" data-act="sky-build" data-k="shrine">${icon('star', 'fill')} Open the shrine</button>`;
  else if (B.k === 'shrine') act = `<span class="lock-note">Defeat ${B.guardians} guardians to open (${SK.guardians(p)} of ${B.guardians})</span>`;
  else if (built) act = ['dojo', 'garden', 'forge'].includes(B.k) ? `<button class="btn small go" data-act="sky-open" data-k="${B.k}">${B.k === 'dojo' ? 'Train' : 'Open'}</button>` : '<span class="upg-max">Built</span>';
  else { const can = p.mp >= B.cost; act = `<button class="btn small ${can ? 'go' : ''}" data-act="sky-build" data-k="${B.k}" ${can ? '' : 'aria-disabled="true"'}>${icon('gem', 'gem')} ${can ? `Rebuild · ${B.cost}` : `Need ${B.cost}`}</button>`; }
  return `<div class="upg sq-build ${built ? 'built' : 'broken'} ${skySel === B.k ? 'sel' : ''}" id="b-${B.k}"><div class="upg-head"><b>${B.name}</b>${built ? icon('check') : ''}</div><p>${B.what}</p>${act}</div>`;
}
function renderVillage() {
  const p = P(), s = p.sky, nq = Math.min(p.prog.anime.unlocked, SK.ACTIVE - 1), Q = SK.QUESTS[nq], lv = SK.level(s.xp), all = SK.cleared(p) >= SK.ACTIVE, isleName = SK.ISLANDS[Q.isle].name;
  return `
  <header class="top">${backBtn('games', 'Back to games')}<div class="who">${avatar(p, 'av-sm')}<div style="min-width:0"><h2 class="title">${esc(p.name)}</h2><span class="pmeta">Sky Quest &middot; Lv ${lv} ${SK.title(lv)}</span></div></div><button class="icon-btn" data-act="edit" aria-label="Edit ${esc(p.name)}">${icon('pencil')}</button></header>
  <div class="town-bar">${mpChip(p)}<span class="mp-chip snack">${spiritImg('petal', 1)} <b>${s.snacks}</b> snacks</span><button class="btn small" data-act="sky-setup">${icon('pencil')} Hero</button></div>
  <div class="town-wrap sq-wrap"><canvas id="village" aria-label="Sky Village. Tap a building to see it."></canvas></div>
  <section class="sq-next">${heroCard(p)}
    <div class="sq-quest"><span class="kicker">${all ? 'All three islands saved!' : `Next quest &middot; ${isleName}`}</span><h3>${all ? 'Replay for more stars' : esc(Q.name)}</h3><p>${all ? 'You defeated Hanamori, Umikaze and Homura. Replay quests for stars, crystals and snacks, and glide to the secret islands!' : esc(Q.story)}</p>
    <button class="btn go big wide" data-act="sky-quest-card" data-i="${nq}">${icon('play')} Sky map</button></div></section>
  <section class="block"><h2>Sky Village</h2><p class="hint-text" style="margin:-6px 0 12px">Spend crystals to rebuild the village. Every building helps you.</p><div class="upgs sq-builds">${SK.BUILD.map(B => buildCard(p, B)).join('')}</div></section>
  ${renderSettings(p)}`;
}
function foeLine(k) {
  const G = SK.GUARDIANS[k], F = G || SK.FOES[k], wk = SK.weakTo(F.el);
  const TY = !G && F.type && SK.TYPES[F.type];
  return `${G ? `<b>${G.name}</b>` : F.name}${TY ? ` <span class="sq-tag t-${F.type}">${TY.tag}</span>` : ''} (${TY && TY.trick ? 'its weakness keeps changing!' : `weak to <b class="el-${wk}">${SK.EL[wk].name}</b>`})`;
}
function renderSkyMap() {
  const p = P(), pr = p.prog.anime, lv = SK.level(p.sky.xp);
  if (questSel != null) skyIsle = SK.isleOf(questSel);
  if (skyIsle == null || !SK.isleOpen(p, skyIsle)) skyIsle = SK.curIsle(p);
  const k0 = skyIsle, I0 = SK.ISLANDS[k0];
  let sheet = '';
  if (questSel != null) {
    const i = questSel, Q = SK.QUESTS[i], weak = lv < Q.rec, best = pr.stars[i];
    const foes = Q.foes.map(foeLine).join(', ');
    const comps = compList(p).map(x => `<button class="sq-pick ${p.sky.comp === x.k ? 'on' : ''}" data-act="sky-comp" data-k="${x.k}" aria-pressed="${p.sky.comp === x.k}">${spiritImg(x.k, x.stage)}<span>${esc(x.name)}</span><small class="el-${KA.SPIRITS[x.k].el}">${SK.EL[KA.SPIRITS[x.k].el].name}</small></button>`).join('');
    const needs = Q.route.some(r => r[0] === 'dash') ? '<p class="hint-text">Long gaps here! Jump, then tap <b>Dash</b> in the air.</p>' : '';
    sheet = `<div class="sheet sq-sheet isle-${I0.k}" id="sheet" role="dialog" aria-label="${esc(Q.name)}">
      <button class="icon-btn sheet-x" data-act="close-qsheet" aria-label="Close">${icon('x')}</button>
      <span class="kicker">${I0.name} &middot; Quest ${i % 5 + 1} of 5${Q.boss ? ' &middot; GUARDIAN' : ''}</span>
      <h3>${esc(Q.name)} ${best ? starsRow(best) : ''}</h3>
      <p class="act-sub">${esc(Q.story)}</p>
      <p class="hint-text">Shadows here: ${foes}</p>
      ${needs}
      <div class="lab">Bring a spirit</div><div class="sq-picks">${comps}</div>
      <p class="hint-text">Your spirit attacks after every right answer, and hits twice as hard when the shadow is weak to its element.</p>
      <div class="power-row ${weak ? 'weak' : ''}"><span>Your level <b>${lv}</b></span><span>Recommended <b>${Q.rec}</b></span></div>
      ${weak ? '<p class="hint-text warn">This quest is tough at your level. Train at the dojo or upgrade at the forge first!</p>' : ''}
      <button class="btn go big wide" data-act="sky-quest" data-i="${i}">${icon('play')} ${best ? 'Play again for more stars' : 'Start quest'}</button>
      <p class="stars-help">Stars: 1 for finishing, 1 for losing at most one heart, 1 for getting most of the math right.</p>
    </div>`;
  }
  const tabs = SK.ISLANDS.map((I, k) => { const open = SK.isleOpen(p, k); return `<button class="sq-isle isle-${I.k} ${k === k0 ? 'on' : ''} ${open ? '' : 'locked'}" data-act="sky-isle" data-k="${k}" aria-pressed="${k === k0}" ${open ? '' : 'aria-disabled="true"'}><b>${I.name}</b><small>${open ? `${SK.cleared(p, k)} of 5 ${SK.cleared(p, k) === 5 ? '&middot; saved!' : ''}` : 'Locked'}</small></button>`; }).join('');
  const rows = SK.QUESTS.map((Q, i) => ({Q, i})).filter(o => o.Q.isle === k0).map(({Q, i}) => `<button class="sq-qrow ${i > pr.unlocked ? 'locked' : ''} ${questSel === i ? 'on' : ''}" data-act="sel-quest" data-i="${i}" ${i > pr.unlocked ? 'aria-disabled="true"' : ''}><span class="sq-qn isle-${I0.k}">${Q.boss ? icon('star', 'fill') : i % 5 + 1}</span><span class="sq-qt"><b>${esc(Q.name)}</b><small>${i > pr.unlocked ? 'Locked' : Q.boss ? `Guardian &middot; Recommended level ${Q.rec}` : `Recommended level ${Q.rec}`}</small></span>${pr.stars[i] ? starsRow(pr.stars[i], 'tiny') : ''}</button>`).join('');
  return `<header class="top">${backBtn('base', 'Back to Sky Village')}<h2 class="title">Sky map</h2>${mpChip(p)}</header>
    <div class="town-wrap sq-wrap"><canvas id="skymap" aria-label="The sky map. Tap a quest on ${I0.name}, or tap another island to fly there."></canvas></div>
    <div class="sq-isles" role="group" aria-label="Islands">${tabs}</div>
    <div class="sq-qlist">${rows}</div>
    ${sheet}`;
}
function initSetup(p) { const s = p.sky, d = KA.heroDefaults(p.hero); return {hero:p.hero, hair:s.hair || d.hair, outfit:s.outfit || d.outfit, comp:s.comp || 'petal', name:'', heroName:s.name || p.name}; }
function renderSkySetup() {
  const p = P(), d = setup, made = p.sky.made, L = KA.look(d.hero, d.hair, d.outfit, p.color);
  const sw = (k, map) => Object.keys(map).map(c => `<button class="sw ${d[k] === c ? 'on' : ''}" data-act="sky-pick" data-k="${k}" data-v="${c}" style="--c:${map[c]}" aria-label="${c}" aria-pressed="${d[k] === c}"></button>`).join('');
  return `<header class="top">${made ? backBtn('base', 'Back to Sky Village') : backBtn('games', 'Back to games')}<h2 class="title">${made ? 'Your hero' : 'Make your hero'}</h2><span style="width:52px"></span></header>
  <div class="form sq-setup">
    <div class="sq-preview">${KA.portraitImg(L, 'sq-big')}${made ? '' : spiritImg(d.comp, 1)}</div>
    <label class="lab" for="hname">Your hero's name</label>
    <input id="hname" class="field" maxlength="16" autocomplete="off" autocapitalize="words" spellcheck="false" placeholder="${esc(p.name)}" value="${esc(d.heroName)}">
    <div class="lab">Pick a look and a weapon</div>
    <div class="themes">${SK.STYLE.map((style, i) => { const [wpn, how] = style.split(': '); return `<button class="theme-b ${d.hero === i ? 'on' : ''}" data-act="sky-pick" data-k="hero" data-v="${i}" aria-pressed="${d.hero === i}" aria-label="${SK.LOOKS[i]}, ${wpn}">${KA.portraitImg(KA.look(i, d.hair, d.outfit, p.color))}<span>${wpn}</span><small>${i >= 3 ? 'Villain look! ' : ''}${how.charAt(0).toUpperCase() + how.slice(1)}</small></button>`; }).join('')}</div>
    <div class="lab">Hair colour</div><div class="swatches">${sw('hair', KA.HAIR)}</div>
    <div class="lab">Outfit colour</div><div class="swatches">${sw('outfit', KA.OUTFIT)}</div>
    <p class="hint-text">The scarf is ${esc(p.name)}'s player colour. Change it with the pencil on the village screen.</p>
    ${made ? '' : `<div class="lab">Pick a spirit companion</div>
    <div class="themes">${['petal', 'ripple', 'ember'].map(k => `<button class="theme-b ${d.comp === k ? 'on' : ''}" data-act="sky-pick" data-k="comp" data-v="${k}" aria-pressed="${d.comp === k}">${spiritImg(k, 1)}<span>${KA.SPIRITS[k].name[0]}</span><small class="el-${KA.SPIRITS[k].el}">${SK.EL[KA.SPIRITS[k].el].name} spirit</small></button>`).join('')}</div>
    <label class="lab" for="spname">Name your spirit (or keep ${KA.SPIRITS[d.comp].name[0]})</label>
    <input id="spname" class="field" maxlength="14" autocomplete="off" autocapitalize="words" spellcheck="false" placeholder="${KA.SPIRITS[d.comp].name[0]}" value="${esc(d.name)}">`}
    <button class="btn go big wide" data-act="sky-begin">${made ? 'Save' : `${icon('play')} Begin the adventure`}</button>
  </div>`;
}
function renderGarden() {
  const p = P(), s = p.sky;
  const cards = compList(p).map(x => {
    const guard = SK.isGuardian(x.k), lv = x.c.lv, next = lv < 5 ? 5 : lv < 10 ? 10 : null;
    return `<div class="upg sq-comp ${s.comp === x.k ? 'sel' : ''}">${spiritImg(x.k, x.stage)}<div class="upg-head"><b>${esc(x.name)}</b><span class="pmeta">Lv ${lv}</span></div>
      <p>${guard ? `Guardian of ${SK.ISLANDS[KA.SPIRITS[x.k].isle].name}. Already fully grown.` : next ? `${next - lv} more snack${next - lv > 1 ? 's' : ''} until it evolves into ${KA.SPIRITS[x.k].name[x.stage]}.` : 'Fully evolved!'}</p>
      <div class="sq-row">${guard || lv >= 15 ? '' : `<button class="btn small ${s.snacks ? 'go' : ''}" data-act="sky-feed" data-k="${x.k}" ${s.snacks ? '' : 'aria-disabled="true"'}>Feed a snack</button>`}${s.comp === x.k ? '<span class="upg-max">On quests with you</span>' : `<button class="btn small" data-act="sky-comp" data-k="${x.k}">Bring on quests</button>`}</div>
      ${guard ? '' : `<input class="field small" data-rename="${x.k}" maxlength="14" placeholder="Rename ${esc(KA.SPIRITS[x.k].name[x.stage - 1])}" value="${esc(x.c.name || '')}" aria-label="Rename">`}
    </div>`;
  }).join('');
  return `<header class="top">${backBtn('base', 'Back to Sky Village')}<h2 class="title">Spirit garden</h2><span class="mp-chip snack">${spiritImg('petal', 1)} <b>${s.snacks}</b> snacks</span></header>
  <div class="town-wrap sq-wrap"><canvas id="garden" aria-label="Your spirits in the garden"></canvas></div>
  <section class="block"><h2>Your spirits</h2><p class="hint-text" style="margin:-6px 0 12px">Each snack is one level. Spirits evolve at levels 5 and 10. Find snacks in treasure chests, from guardians, and by getting 8 or more right at the dojo.</p><div class="upgs">${cards}</div></section>`;
}
function renderForge() {
  const p = P();
  return `<header class="top">${backBtn('base', 'Back to Sky Village')}<h2 class="title">Forge</h2>${mpChip(p)}</header>
  <section class="block"><h2>Gear</h2><p class="hint-text" style="margin:-6px 0 12px">Spend crystals to upgrade your gear. Harder quests need a stronger hero.</p><div class="upgs">${upgradeCards(p)}</div></section>
  <button class="btn primary wide" data-act="sky-open" data-k="dojo">${icon('brain')} Earn crystals at the dojo</button>`;
}
function renderSkyDone() {
  const p = P(), r = skyResult, Q = SK.QUESTS[r.qi];
  const lvUp = r.lv1 > r.lv0, G = Q.boss ? SK.GUARDIANS[SK.ISLANDS[Q.isle].guardian] : null;
  return `<div class="results sq-results">
    <h2 class="rtitle">${r.ok ? (G ? `${G.name} defeated!` : 'Quest complete!') : 'So close!'}</h2>
    ${r.ok ? `<div class="rstars">${[0, 1, 2].map(i => `<span class="rs ${i < r.stars ? 'on' : ''}" style="--i:${i}">${icon('star', 'fill')}</span>`).join('')}</div>` : ''}
    <div class="site-card sq-wrap"><canvas id="skydone" aria-label="${esc(Q.name)}"></canvas></div>
    ${r.ok ? '' : `<p class="rmsg">You were knocked out. Train at the dojo, upgrade at the forge, or bring a spirit the shadows are weak to.</p>`}
    ${lvUp ? `<p class="unlock">${icon('up')} Level up! You're now level ${r.lv1}, ${SK.title(r.lv1)}.${r.lv0 < 3 && r.lv1 >= 3 ? ' New move: Storm!' : ''}</p>` : ''}
    ${r.unlocks.map(u => `<p class="unlock">${icon('star', 'fill')} ${esc(u)}</p>`).join('')}
    <p class="rnote">${icon('gem', 'gem')} +${r.crystals} crystals &middot; +${r.xp} XP${r.snacks ? ` &middot; +${r.snacks} spirit snack${r.snacks > 1 ? 's' : ''}` : ''}</p>
    <div class="ractions">
      ${r.ok && r.qi < SK.ACTIVE - 1 ? `<button class="btn go big" data-act="sky-quest-card" data-i="${r.qi + 1}">${icon('play')} Next quest</button>` : ''}
      ${r.ok ? '' : `<button class="btn go big" data-act="sky-quest" data-i="${r.qi}">${icon('play')} Try again</button>`}
      <button class="btn primary" data-act="back" data-to="base">Back to Sky Village</button>
      ${r.snacks && p.sky.b.garden ? '<button class="btn" data-act="sky-open" data-k="garden">Feed your spirits</button>' : ''}
    </div>
  </div>`;
}
function skyCanvas(id, scene, hFn) {
  const c = document.getElementById(id); if (!c) return null;
  const w = c.parentElement.clientWidth || 360; c.style.height = Math.round(hFn(w)) + 'px';
  let t = 0, down = null;
  const g = {update(dt) { t += dt; }, draw(ctx, W, H) { scene.draw(ctx, W, H, t); }, pointer(type, x, y) { if (type === 'down') down = [x, y]; if (type === 'up' && down && Math.hypot(x - down[0], y - down[1]) < 12) { scene.tap && scene.tap(x, y); down = null; } }};
  bgRun(c, g); c.style.touchAction = 'pan-y'; return g;
}
function skyAfterRender(p) {
  if (PUM.SKY3D) PUM.SKY3D.ensure();
  if (view === 'base') {
    let hits = [];
    const isles = isleInfo(p);
    skyCanvas('village', {draw(ctx, W, H, t) { hits = KA.village(ctx, W, H, t, {buildings:p.sky.b, comps:compList(p), isles}, skySel); },
      tap(x, y) { const h = hits.find(o => Math.hypot(o.x - x, o.y - y) < o.r); if (!h) return; A.ac(); A.sfx('tap'); skySel = h.k; render(); const el = document.getElementById('b-' + h.k); if (el) el.scrollIntoView({block:'center', behavior:'smooth'}); }}, w => Math.min(500, w * 1.02));
  }
  if (view === 'map') {
    let nodes = []; const isles = isleInfo(p), look = KA.lookOf(p);
    skyCanvas('skymap', {draw(ctx, W, H, t) { nodes = KA.skyMap(ctx, W, H, t, {isle:skyIsle || 0, sel:questSel, isles, look}); },
      tap(x, y) { const n = nodes.find(o => Math.hypot(o.x - x, o.y - y) < o.r); if (!n) return; A.ac(); if (n.isle != null) pickIsle(n.isle); else selQuest(n.i); }}, w => Math.min(540, w * 1.14));
  }
  if (view === 'skyGarden') {
    let t0 = null;
    skyCanvas('garden', {draw(ctx, W, H, t) {
      KA.skyGradient(ctx, W, H, '#101A52', '#40308E', '#C77BB8', '#FFC2A8'); KA.stars(ctx, W, H * .6, t, 40, 5);
      ctx.fillStyle = '#4FBF9A'; ctx.beginPath(); ctx.ellipse(W / 2, H * .92, W * .7, H * .26, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#7FE0BC'; ctx.beginPath(); ctx.ellipse(W / 2, H * .88, W * .64, H * .18, 0, Math.PI, Math.PI * 2); ctx.fill();
      for (let i = 0; i < 9; i++) KA.blossom(ctx, (i + .5) * W / 9, H * .88 + (i % 2) * 8, 8, '#FFC6DD');
      const list = compList(p), u = Math.min(W / 360, H / 260);
      if (evo) {
        if (t0 == null) t0 = t;
        const k = (t - t0) / 3.4, x = W / 2, y = H * .52;
        if (k < .45) { const sp = Math.sin(t * (10 + k * 40)) * .06; ctx.save(); ctx.translate(x, y); ctx.scale(1 + sp, 1 - sp); ctx.translate(-x, -y); KA.spirit(ctx, evo.kind, evo.from, x, y, .8 * u, t); ctx.restore(); ctx.save(); ctx.globalAlpha = k / .45 * .8; ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(x, y, 90 * u * k / .45, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
        else {
          KA.speedLines(ctx, W, H, x, y, t, 'rgba(255,255,255,.25)', 40); KA.spirit(ctx, evo.kind, evo.to, x, y, .8 * u, t);
          if (k < .6) { ctx.save(); ctx.globalAlpha = 1 - (k - .45) / .15; ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, W, H); ctx.restore(); }
          ctx.font = `${Math.min(22, W / 16)}px "Dela Gothic One", Lexend, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#FFFFFF'; ctx.lineWidth = 5; ctx.strokeStyle = '#150E1C'; const msg = `${KA.SPIRITS[evo.kind].name[evo.to - 1]}!`; ctx.strokeText(msg, x, H * .12); ctx.fillText(msg, x, H * .12);
        }
        if (k > 1.6) { evo = null; t0 = null; }
      } else list.forEach((x, i) => { const n = list.length, px = W * (i + 1) / (n + 1), py = H * .55 + Math.sin(t * 2 + i) * 6; if (SK.isGuardian(x.k)) KA.guardian(ctx, x.k, px, H * .9, .26 * u, t, 1, {}); else KA.spirit(ctx, x.k, x.stage, px, py, .58 * u, t + i, {face:Math.sin(t * .5 + i) > 0 ? 1 : -1}); });
      KA.petals(ctx, W, H, t, 10);
    }}, w => Math.min(300, w * .7));
  }
  if (view === 'skyDone') {
    const r = skyResult, Q = SK.QUESTS[r.qi], L = KA.lookOf(p), c = SK.activeComp(p), gk = SK.ISLANDS[Q.isle].guardian;
    skyCanvas('skydone', {draw(ctx, W, H, t) {
      KA.battleBg(ctx, W, H, t, {isle:Q.isle});
      const bs = Math.min(W * .7 / 360, H * .95 / 440), boss = Q.boss && r.ok;
      if (boss) KA.guardian(ctx, gk, W * .74, H * .96, Math.min(W / 900, H / 480), t, 1, {});
      ctx.save(); ctx.translate(W * (boss ? .3 : .4) - 180 * bs, H - 440 * bs); ctx.scale(bs, bs); KA.bust(ctx, L, {mouth:r.ok ? 'grin' : 'smile', blink:Math.sin(t * 1.7) > .985 ? .1 : 1}); ctx.restore();
      if (!boss) KA.spirit(ctx, c.kind, c.stage, W * .78, H * .5, Math.min(W / 420, H / 260) * .7, t);
      if (r.ok) KA.drift(ctx, W, H, t, 26, Q.isle); else { ctx.fillStyle = 'rgba(10,10,40,.25)'; ctx.fillRect(0, 0, W, H); }
    }}, w => Math.min(300, w * .66));
  }
}
function selQuest(i) {
  const p = P();
  if (i > p.prog.anime.unlocked) { PUM.fx.toast(SK.isleOpen(p, SK.isleOf(i)) ? 'Finish the quest before this one to unlock it' : lockedIsleMsg(SK.isleOf(i))); A.sfx('no'); return; }
  questSel = i; A.sfx('tap'); render();
}
function pickIsle(k) {
  const p = P();
  if (!SK.isleOpen(p, k)) { PUM.fx.toast(lockedIsleMsg(k)); A.sfx('no'); return; }
  skyIsle = k; questSel = null; A.sfx('tap'); render();
}
function startQuest(i) {
  const p = P(); if (!p || i > p.prog.anime.unlocked) return;
  let game = null;
  openShell({cls:'sky', shellCls:'sky', ctrl:'', gauge:false, keymap:SKYKEYS, level:i,
    onExit:() => { if (game) { p.sky.xp += game.xpEarned(); store.savePlayer(p); } questSel = i; go('map'); },
    onFinish:r => skyFinish(r),
    make:api => (game = PUM.games.sky({player:p, assist:assistOf(p), levelIndex:i, api}))});
  p.prog.anime.plays++;
}
function skyFinish(r) {
  const p = P(); if (!p || !play) return;
  const mp = play.mp, s = p.sky, pr = p.prog.anime, qi = r.quest, Q = SK.QUESTS[qi];
  stopGame();
  const lv0 = SK.level(s.xp); s.xp += r.xp; const lv1 = SK.level(s.xp);
  let stars = 0, bonus = 0, snacks = r.snacks;
  const unlocks = [];
  if (r.ok) {
    const math = r.asked ? r.right / r.asked : 1, first = !pr.stars[qi];
    stars = 1 + (r.lost <= 1 ? 1 : 0) + (math >= .66 ? 1 : 0);
    pr.stars[qi] = Math.max(pr.stars[qi], stars);
    if (pr.unlocked === qi && qi < SK.ACTIVE - 1) pr.unlocked = qi + 1;
    bonus = stars * 2 + (Q.boss ? 5 : 0);
    if (Q.boss && first) {
      const I = SK.ISLANDS[Q.isle], gk = I.guardian, G = SK.GUARDIANS[gk];
      s.comps[gk] = s.comps[gk] || {lv:8, name:''}; s.moves[G.teach] = true; snacks += 2;
      unlocks.push(`${G.name} joined your team!`, {double:'You learned double jump. Go back and reach the secret ledges!', dash:'You learned dash! Jump, then tap Dash to zoom across long gaps.', glide:'You learned glide! Jump, then hold Glide to float down. Fly to the secret islands!'}[G.teach], `${I.name.split(' ')[0]} badge earned`);
      if (SK.ISLANDS[Q.isle + 1]) unlocks.push(`${SK.ISLANDS[Q.isle + 1].name} is open! Find it on the sky map.`);
      else unlocks.push('You saved all three sky islands!');
      if (SK.guardians(p) === 2 && !s.b.shrine) unlocks.push('The Sky shrine can open now. Visit Sky Village!');
    }
  }
  s.snacks = Math.min(99, s.snacks + snacks);
  p.mp += bonus; p.mpTotal += bonus;
  skyResult = {qi, ok:r.ok, stars, crystals:mp + bonus, xp:r.xp, lv0, lv1, snacks, unlocks};
  store.savePlayer(p); A.sfx(r.ok ? 'fanfare' : 'no');
  go('skyDone');
}
function skyEvent(a, el) {
  const p = P(); if (!p) return false;
  const s = p.sky;
  switch (a) {
    case 'sky-setup': setup = initSetup(p); A.sfx('tap'); go('skySetup'); return true;
    case 'sky-pick': { const k = el.dataset.k; setup[k] = k === 'hero' ? Number(el.dataset.v) : el.dataset.v; if (k === 'hero' && !s.made) { const d = KA.heroDefaults(setup.hero); setup.hair = d.hair; setup.outfit = d.outfit; } A.sfx('tap'); render(); return true; }
    case 'sky-begin': {
      p.hero = setup.hero; s.hair = setup.hair; s.outfit = setup.outfit;
      { const n = String(setup.heroName || '').trim().slice(0, 16); s.name = n && n !== p.name ? n : ''; }
      if (!s.made) { s.comps[setup.comp] = {lv:1, name:setup.name.trim().slice(0, 14)}; s.comp = setup.comp; s.made = true; }
      setup = null; store.savePlayer(p); A.sfx('fanfare'); go('base'); return true;
    }
    case 'sky-build': {
      const B = SK.BUILD.find(x => x.k === el.dataset.k); if (!B || s.b[B.k]) return true;
      if (B.guardians && SK.guardians(p) < B.guardians) { PUM.fx.toast(`Defeat ${B.guardians} guardians to open the ${B.name.toLowerCase()}`); A.sfx('no'); return true; }
      if (p.mp < B.cost) { PUM.fx.toast(`Need ${B.cost - p.mp} more crystals. Go on a quest or train at the dojo!`); A.sfx('no'); return true; }
      p.mp -= B.cost; s.b[B.k] = true; skySel = B.k; store.savePlayer(p); A.sfx('up'); PUM.fx.toast(B.k === 'shrine' ? `${icon('star', 'fill')} The Sky shrine is open! New special: ${SK.SPECIAL2}` : `${icon('up')} ${B.name} rebuilt!`); render();
      PUM.fx.burst(document.getElementById('b-' + B.k)); return true;
    }
    case 'sky-open': { const k = el.dataset.k; A.sfx('tap'); if (k === 'dojo') startTrain(); else go(k === 'garden' ? 'skyGarden' : 'skyForge'); return true; }
    case 'sky-quest-card': questSel = Number(el.dataset.i); skyIsle = SK.isleOf(questSel); A.sfx('tap'); go('map'); return true;
    case 'sel-quest': selQuest(Number(el.dataset.i)); return true;
    case 'sky-isle': pickIsle(Number(el.dataset.k)); return true;
    case 'close-qsheet': questSel = null; A.sfx('tap'); render(); return true;
    case 'sky-comp': { const k = el.dataset.k; if (!s.comps[k]) return true; s.comp = k; store.savePlayer(p); A.sfx('tap'); render(); return true; }
    case 'sky-quest': A.sfx('tap'); startQuest(Number(el.dataset.i)); return true;
    case 'sky-feed': {
      const k = el.dataset.k, c = s.comps[k]; if (!c || SK.isGuardian(k)) return true;
      if (s.snacks < 1) { PUM.fx.toast('No snacks yet. Find them in treasure chests!'); A.sfx('no'); return true; }
      const st0 = SK.stage(c.lv); s.snacks--; c.lv = Math.min(15, c.lv + 1); const st1 = SK.stage(c.lv);
      store.savePlayer(p); A.sfx(st1 > st0 ? 'fanfare' : 'up');
      if (st1 > st0) { evo = {kind:k, from:st0, to:st1}; PUM.fx.toast(`${KA.SPIRITS[k].name[st0 - 1]} evolved into ${KA.SPIRITS[k].name[st1 - 1]}!`); if (p.speak) A.say(`Evolved into ${KA.SPIRITS[k].name[st1 - 1]}!`); }
      else PUM.fx.toast(`${esc(SK.compName(k, c))} is now level ${c.lv}!`);
      render(); window.scrollTo(0, 0); return true;
    }
  }
  return false;
}

/* ---------- training ---------- */
function startTrain() { train = {n:0, len:10, res:[], earned:0}; go('train'); }
function onTrainAnswer(ok, info) {
  train.res.push(ok); train.earned += info.mp;
  if (isSky(P()) && ok) { P().sky.xp += 10; train.xp = (train.xp || 0) + 10; }
  store.savePlayer(P());
  const chip = document.getElementById('mp-chip'); if (chip) chip.outerHTML = mpChip(P());
  const pips = app.querySelectorAll('.pip'), i = train.res.length - 1;
  if (pips[i]) { pips[i].className = 'pip ' + (ok ? 'hit' : 'miss'); pips[i].innerHTML = ok ? icon('star', 'fill') : ''; }
}
function advanceTrain() {
  train.n++;
  if (train.n >= train.len) {
    if (quiz) { quiz.destroy(); quiz = null; }
    const p = P(); if (isSky(p) && train.res.filter(Boolean).length >= 8) { p.sky.snacks = Math.min(99, p.sky.snacks + 1); train.snack = true; store.savePlayer(p); }
    A.sfx('fanfare'); go('trainDone'); return;
  }
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
      <span class="hud-mp">${curIcon(p)}<b id="g-mp">0</b></span>
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
  shell.hidden = false; shell.className = cfg.shellCls || ''; shell.innerHTML = hudHTML(p, cfg);
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
    say: t => { if (p.speak) A.say(t); },
    ctrl: html => { const el = shell.querySelector('.controls'); if (el) el.innerHTML = html; },
    panel: (html, cls) => { const box = document.getElementById('choose'); if (!box) return; if (!html) { box.hidden = true; box.innerHTML = ''; return; } box.className = 'choose ' + (cls || ''); box.innerHTML = html; box.hidden = false; },
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
  const subs = {revive:isSky(p) ? 'Answer 3 questions to get your hearts back. You get one second chance per quest!' : 'Answer one question to get back up. You only get one second chance per level!', repair:'Answer a question to fix your truck. You only get one repair per level, so upgrade Armor to take more hits!', fuel:'Each right answer adds half a tank. Upgrade your Fuel tank to drive farther.', stamina:'Each right answer refills half your stamina. Upgrade Stamina to play longer.', energy:'Each right answer refills half your energy. Upgrade Energy to run longer.'};
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
  shell.hidden = true; shell.innerHTML = ''; shell.className = ''; document.documentElement.classList.remove('in-game');
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
  if (a.startsWith('sky-') || a === 'sel-quest' || a === 'close-qsheet') { if (skyEvent(a, el)) return; }
  switch (a) {
    case 'add-player': draft = {name:'', color:pick(PUM.COLORS), theme:'trucks', hero:0, age:5}; confirmDel = false; A.sfx('tap'); go('form'); break;
    case 'open': { pid = el.dataset.id; A.sfx('tap'); go('games'); if (PUM.SKY3D) PUM.SKY3D.ensure(); break; }
    case 'pick-game': { const p = P(), g = el.dataset.g; if (!p || !PUM.THEMES[g]) break; p.theme = g; store.savePlayer(p); showWorlds = false; skySel = null; questSel = null; setup = null; townSel = null; townScroll = isRig(p); A.sfx('tap'); go('base'); break; }
    case 'edit': { const p = P(); if (!p) break; draft = {id:p.id, name:p.name, color:p.color, theme:p.theme, hero:p.hero, age:p.age}; confirmDel = false; A.sfx('tap'); go('form'); break; }
    case 'pick': { const k = el.dataset.k; draft[k] = (k === 'age' || k === 'hero') ? Number(el.dataset.v) : el.dataset.v; confirmDel = false; A.sfx('tap'); render(); break; }
    case 'save-player': saveForm(); break;
    case 'del-player': {
      if (!confirmDel) { confirmDel = true; render(); break; }
      const id = draft.id; S.players = S.players.filter(p => p.id !== id); store.saveLocal(); store.deleteRemote(id);
      pid = null; draft = null; go('home'); break;
    }
    case 'back': { const to = el.dataset.to; if ((to === 'base' || to === 'map' || to === 'games') && !P()) go('home'); else { go(to); if (to === 'home') store.pull(); } break; }
    case 'end-train': if (quiz) quiz.destroy(); quiz = null; train && train.earned ? go('trainDone') : go('base'); break;
    case 'train': A.sfx('tap'); startTrain(); break;
    case 'map': { const p = P(); sel = p.prog[p.theme].unlocked; if (isSky(p)) questSel = Math.min(sel, SK.ACTIVE - 1); A.sfx('tap'); go('map'); break; }
    case 'sel-level': { const p = P(), i = Number(el.dataset.i); if (i > p.prog[p.theme].unlocked) { PUM.fx.toast('Beat the level before to unlock this one'); A.sfx('no'); break; } sel = i; A.sfx('tap'); render(); const c = document.getElementById('lvl-card'); if (c) c.scrollIntoView({block:'nearest'}); break; }
    case 'start': A.sfx('tap'); startGame(Number(el.dataset.i)); break;
    case 'garage': A.sfx('tap'); go('garage'); break;
    case 'close-sheet': townSel = null; A.sfx('tap'); render(); break;
    case 'sel-lot': A.ac(); selectLot(Number(el.dataset.i)); break;
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
      const price = R.paintPrice(p);
      if (p.mp < price) { PUM.fx.toast(`Painting costs ${price} coins. Earn more at the practice yard!`); A.sfx('no'); break; }
      p.mp -= price; p.rig.paint[k] = c; store.savePlayer(p); A.sfx('up'); render();
      PUM.fx.burst(app.querySelector(`canvas[data-truck="${k}"]`)); break;
    }
    case 'upgrade': {
      const p = P(), k = el.dataset.k, lvl = p.up[k];
      if (lvl >= CP.maxUp) break;
      const cost = CP.cost[lvl];
      if (p.mp < cost) { PUM.fx.toast(isRig(p) ? `Need ${cost - p.mp} more coins. Earn them at the practice yard or on jobs!` : isSky(p) ? `Need ${cost - p.mp} more crystals. Go on a quest or train at the dojo!` : `Need ${cost - p.mp} more math points. Tap Earn math points!`); A.sfx('no'); break; }
      p.mp -= cost; p.up[k]++; store.savePlayer(p); A.sfx('up');
      PUM.fx.toast(`${icon('up')} ${UPS(p).find(u => u.k === k).name} level ${p.up[k]}!`);
      render(); PUM.fx.burst(app.querySelector(`[data-k="${k}"]`) || app.querySelector('.upgs'));
      break;
    }
    case 'install': { if (!installEvt) break; const ev = installEvt; installEvt = null; ev.prompt(); ev.userChoice.finally(() => render()); break; }
    case 'install-later': { try { localStorage.setItem('pum-install-later', String(Date.now())); } catch (e) {} A.sfx('tap'); render(); break; }
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
shell.addEventListener('click', e => {
  const el = e.target.closest('[data-gp]'); if (!el || el.disabled || !play || !play.game.ui) return;
  A.ac(); play.game.ui(el.dataset.gp, el.dataset.v);
});
app.addEventListener('input', e => {
  if (e.target.id === 'spname' && setup) { setup.name = e.target.value.slice(0, 14); return; }
  if (e.target.id === 'hname' && setup) { setup.heroName = e.target.value.slice(0, 16); return; }
  if (e.target.dataset.rename) { const p = P(), c = p && p.sky.comps[e.target.dataset.rename]; if (c) { c.name = e.target.value.trim().slice(0, 14); store.savePlayer(p); } return; }
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
setInterval(() => { if (document.visibilityState === 'visible' && (view === 'home' || view === 'games' || view === 'base')) store.pull(); }, 45000);

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
    const p = store.normalize({id:PUM.util.uid(), name, color:d.color, theme:d.theme, hero:d.hero, age:d.age, start, world:start, speak:d.age <= 6, created:Date.now(), coins:{trucks:6, soccer:6, anime:6}});
    store.lv(p, start).tier = tier;
    S.players.push(p); store.savePlayer(p); pid = p.id;
  }
  draft = null; A.sfx('tap'); go('games');
}

PUM.app = {go, P, get play() { return play; }, startGame, startQuest, rigLoad, rigDrive, rigCrane, rigUnload, get view() { return view; }};
render();
store.pull();
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost') && !/[?&]nosw/.test(location.search)) navigator.serviceWorker.register('sw.js').catch(() => {});
})();
