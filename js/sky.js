/* Sky Quest: data (heroes, moves, spirits, quests, village), save helpers, and the quest game:
   a side-scrolling island stage that switches into turn-based anime battles. */
(function () {
'use strict';
const E = PUM.engine, K = PUM.SKYART, A = PUM.audio;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), lerp = (a, b, t) => a + (b - a) * t, TAU = Math.PI * 2;
const S = PUM.SKY = {};
PUM.games = PUM.games || {};

/* ---------- elements and moves ---------- */
S.EL = {
  blossom:{name:'Blossom', col:'#FF7FB5', soft:'rgba(255,140,200,.32)'},
  tide:{name:'Tide', col:'#46C8FF', soft:'rgba(110,200,255,.32)'},
  ember:{name:'Ember', col:'#FF9A3D', soft:'rgba(255,170,90,.32)'},
  storm:{name:'Storm', col:'#FFE24A', soft:'rgba(255,226,74,.3)'},
};
const BEATS = {blossom:'tide', tide:'ember', ember:'blossom'};
S.weakTo = el => Object.keys(BEATS).find(k => BEATS[k] === el);
S.mult = (att, def, mira) => att === 'storm' ? 1.3 : BEATS[att] === def ? (mira ? 2.3 : 2) : BEATS[def] === att ? .5 : 1;
S.MOVES = {blossom:['Petal Slash', 'Blossom Bloom', 'Petal Arrow'], tide:['Tide Cut', 'Tide Wave', 'Tide Arrow'], ember:['Ember Strike', 'Ember Flare', 'Ember Arrow'], storm:['Storm Edge', 'Storm Call', 'Storm Arrow']};
S.SPECIAL = ['SKY BLADE', 'STARFALL BLOOM', 'COMET ARROW'];
S.STYLE = ['Sword: every hit strikes twice', 'Staff: extra damage on weak spots', 'Bow: lucky critical hits'];
S.HERO_NAMES = ['Kai', 'Mira', 'Juno'];

/* ---------- hero level ---------- */
const LV_XP = [0, 40, 100, 180, 280, 400, 540, 700, 880, 1080, 1300, 1550, 1820, 2100, 2400, 2750];
S.level = xp => { let l = 1; while (l < LV_XP.length && xp >= LV_XP[l]) l++; return l; };
S.xpFrac = xp => { const l = S.level(xp); if (l >= LV_XP.length) return 1; return (xp - LV_XP[l - 1]) / (LV_XP[l] - LV_XP[l - 1]); };
S.title = l => l >= 8 ? 'Sky Hero' : l >= 4 ? 'Guardian' : 'Apprentice';
S.stats = p => {
  const lv = S.level(p.sky.xp), up = p.up;
  return {lv, hearts:3 + Math.floor((lv - 1) / 3) + (p.sky.b.spring ? 1 : 0), atk:10 + 2.5 * (lv - 1) + 5 * (up.weapon || 0), meter:.34 + .05 * (up.charm || 0), boots:up.boots || 0, storm:lv >= 3};
};

/* ---------- spirits ---------- */
S.stage = lv => lv >= 10 ? 3 : lv >= 5 ? 2 : 1;
S.compName = (k, c) => (c && c.name) || K.SPIRITS[k].name[S.stage(c ? c.lv : 1) - 1];
S.activeComp = p => { const k = p.sky.comps[p.sky.comp] ? p.sky.comp : Object.keys(p.sky.comps)[0]; const c = p.sky.comps[k] || {lv:1}; return {kind:k, lv:c.lv, stage:k === 'hanamori' ? 3 : S.stage(c.lv), el:K.SPIRITS[k].el, name:S.compName(k, c)}; };

/* ---------- Sky Village ---------- */
S.BUILD = [
  {k:'dojo', name:'Training dojo', cost:0, what:'Practice 10 quick questions for crystals and XP.'},
  {k:'garden', name:'Spirit garden', cost:20, what:'Feed snacks to your spirits so they level up and evolve.'},
  {k:'forge', name:'Forge', cost:30, what:'Upgrade your weapon, charm and boots.'},
  {k:'spring', name:'Healing spring', cost:40, what:'Start every quest with one extra heart.'},
  {k:'tower', name:'Lantern tower', cost:50, what:'Lights up secret paths on the islands.'},
  {k:'shrine', name:'Sky shrine', cost:0, guardians:2, what:'Unlocks your second special move. Purify 2 guardians to open it.'},
];

/* ---------- quests: Blossom Isle ---------- */
const FOES = {
  petal:{el:'blossom', name:'Petal Wisp', hp:70},
  puddle:{el:'tide', name:'Puddle Wisp', hp:70},
  cinder:{el:'ember', name:'Cinder Wisp', hp:74},
  thorn:{el:'blossom', name:'Thorn Shade', hp:110, big:true},
  surge:{el:'tide', name:'Surge Shade', hp:110, big:true},
};
S.FOES = FOES;
S.QUESTS = [
  {name:'The Lost Cubs', rec:1, goal:'cage', story:'Shadow wisps have trapped the blossom cubs. Find them and set them free!', obj:'Free the cubs',
    foes:['petal'], route:[['flat', 360], ['foe', 'petal'], ['gap', 100], ['flat', 260], ['chest', 'snack'], ['up', 60], ['flat', 220], ['gap', 110], ['down', 60], ['flat', 260], ['foe', 'petal'], ['secret'], ['flat', 160], ['goal']]},
  {name:'Lantern Path', rec:2, goal:'lanterns', story:'Light the three shrine lanterns so lost spirits can find their way home.', obj:'Light the lanterns',
    foes:['puddle', 'petal'], route:[['flat', 300], ['lantern'], ['hop', 2], ['flat', 200], ['foe', 'puddle'], ['lantern'], ['gate'], ['up', 70], ['flat', 220], ['gap', 110], ['chest', 'snack'], ['down', 70], ['foe', 'petal'], ['lantern'], ['secret'], ['goal']]},
  {name:'The Silent Bell', rec:3, goal:'bell', story:'Climb to the hilltop and ring the old bell to wake the island up.', obj:'Ring the bell',
    foes:['cinder', 'thorn'], route:[['flat', 300], ['up', 70], ['flat', 180], ['up', 80], ['foe', 'cinder'], ['hop', 3], ['chest', 'snack'], ['up', 60], ['gate'], ['flat', 200], ['foe', 'thorn'], ['gap', 110], ['secret'], ['goal']]},
  {name:'Sakura Falls', rec:4, goal:'falls', story:'Chase the shadows from the river so the waterfall can flow again.', obj:'Restore the falls',
    foes:['puddle', 'cinder', 'surge'], route:[['flat', 300], ['foe', 'puddle'], ['gap', 110], ['flat', 160], ['hop', 2], ['foe', 'cinder'], ['chest', 'snack'], ['down', 60], ['gate'], ['flat', 200], ['up', 80], ['foe', 'surge'], ['secret'], ['goal']]},
  {name:'Hanamori', rec:5, goal:'grove', boss:true, story:'Hanamori, the Blossom Deer, has been taken over by shadow. Purify the guardian!', obj:'Reach the grove',
    foes:['hanamori'], route:[['flat', 380], ['chest', 'snack'], ['gap', 110], ['flat', 260], ['foe', 'petal'], ['flat', 120], ['goal']]},
];
S.ACTIVE = S.QUESTS.length;
S.cleared = p => p.prog.anime.stars.slice(0, S.ACTIVE).filter(Boolean).length;
S.heal = p => S.cleared(p) / S.ACTIVE;
S.guardians = p => p.prog.anime.stars[4] ? 1 : 0;

/* ---------- save data ---------- */
const OLD_UPS = ['hearts', 'attack', 'energy', 'agility', 'shield'];
S.normalize = function (raw, p) {
  const num = v => Number.isFinite(+v) ? +v : 0, x = (raw && typeof raw === 'object') ? raw : {};
  const comps = {};
  if (x.comps && typeof x.comps === 'object') for (const k of Object.keys(K.SPIRITS)) { const c = x.comps[k]; if (c && typeof c === 'object') comps[k] = {lv:clamp(num(c.lv) || 1, 1, 15), name:String(c.name || '').slice(0, 14)}; }
  const b = (x.b && typeof x.b === 'object') ? x.b : {};
  const mv = (x.moves && typeof x.moves === 'object') ? x.moves : {};
  return {v:num(x.v), made:!!x.made, hair:K.HAIR[x.hair] ? x.hair : null, outfit:K.OUTFIT[x.outfit] ? x.outfit : null, xp:clamp(num(x.xp), 0, 1e6),
    comp:K.SPIRITS[x.comp] ? x.comp : null, comps, snacks:clamp(num(x.snacks), 0, 99),
    b:{garden:!!b.garden, forge:!!b.forge, spring:!!b.spring, tower:!!b.tower, shrine:!!b.shrine}, moves:{double:!!mv.double, dash:!!mv.dash, glide:!!mv.glide}};
};
/* Called by store.normalize. Sky Quest replaced the old runner: progress starts fresh once and
   old hero upgrades turn into crystals. */
S.migrate = function (p, rawUp) {
  if (p.sky.v >= 1) return;
  const u = (rawUp && typeof rawUp === 'object') ? rawUp : {};
  let refund = 0;
  for (const k of OLD_UPS) { const l = clamp(Number(u[k]) || 0, 0, 5); for (let i = 0; i < l; i++) refund += PUM.CAMPAIGN.cost[i]; }
  const pr = p.prog.anime; for (let i = 0; i < pr.stars.length; i++) refund += pr.stars[i] ? 2 : 0;
  p.prog.anime = {unlocked:0, stars:pr.stars.map(() => 0), plays:pr.plays};
  if (p.theme === 'anime' || refund) p.mp += refund;
  p.sky.v = 1;
};

/* ---------- sounds ---------- */
const sfx0 = A.sfx;
A.sfx = k => {
  if (PUM.store && PUM.store.S.muted) return;
  switch (k) {
    case 'slash': A.noise(.18, .14, 3200); A.tone(660, 0, .12, 'triangle', .06, 1320); return;
    case 'block': A.tone(1400, 0, .08, 'square', .05); A.tone(1800, .05, .14, 'sine', .06); return;
    case 'special': A.tone(220, 0, .6, 'sawtooth', .06, 1760); A.noise(.6, .1, 1800); return;
    case 'chest': [784, 988, 1175, 1568].forEach((f, i) => A.tone(f, i * .07, .2, 'triangle', .06)); return;
    case 'purify': [1047, 1319, 1568, 2093].forEach((f, i) => A.tone(f, i * .09, .35, 'sine', .06)); return;
    case 'shatter': A.noise(.5, .2, 4000); A.tone(1800, 0, .3, 'square', .04, 400); return;
  }
  sfx0(k);
};

/* ---------- avatars in menus: anime portraits ---------- */
PUM.heroSVG = (idx, shirt) => K.portraitImg(K.look(idx, null, null, shirt));
const av0 = PUM.avatarSVG;
PUM.avatarSVG = p => p.theme === 'anime' ? K.portraitImg(p.sky ? K.lookOf(p) : K.look(p.hero, null, null, p.color)) : av0(p);

/* ---------- island builder ---------- */
function build(Q, opts) {
  const W = {blocks:[], crystals:[], chests:[], gates:[], foes:[], lanterns:[], secrets:[], gaps:[], goal:null, len:0};
  let x = 0, h = 0;
  const ground = w => { W.blocks.push({x, w, top:h, ground:true}); };
  const row = (x0, w, y, n) => { for (let i = 0; i < n; i++) W.crystals.push({x:x0 + (i + .5) * w / n, y, got:false, v:1}); };
  for (const [kind, arg] of Q.route) {
    if (kind === 'flat') { ground(arg); row(x + 60, arg - 120, h - 46, Math.max(0, Math.floor(arg / 110))); x += arg; }
    else if (kind === 'gap') { W.gaps.push({x, w:arg, h}); for (let i = 0; i < 3; i++) W.crystals.push({x:x + arg * (i + 1) / 4, y:h - 120 - (i === 1 ? 24 : 0), got:false, v:1}); x += arg; }
    else if (kind === 'up') { ground(60); x += 60; h -= arg; ground(80); x += 80; }
    else if (kind === 'down') { ground(60); x += 60; h += arg; ground(80); x += 80; }
    else if (kind === 'hop') { W.gaps.push({x, w:arg * 230 + 100, h}); x += 100; for (let i = 0; i < arg; i++) { W.blocks.push({x, w:130, top:h - 40 - (i % 2) * 40, plat:true}); W.crystals.push({x:x + 65, y:h - 90 - (i % 2) * 40, got:false, v:1}); x += 230; } }
    else if (kind === 'chest') { ground(300); W.chests.push({x:x + 170, y:h, open:false, gift:arg || 'snack'}); x += 300; }
    else if (kind === 'gate') { ground(320); W.gates.push({x:x + 180, y:h, open:0, solved:false}); x += 320; }
    else if (kind === 'foe') { ground(440); W.foes.push({x:x + 280, y:h, kind:arg, done:false}); x += 440; }
    else if (kind === 'lantern') { ground(260); W.lanterns.push({x:x + 140, y:h, lit:false}); row(x + 40, 60, h - 46, 1); x += 260; }
    else if (kind === 'secret') { ground(460); const top = h - 240; W.blocks.push({x:x + 150, w:170, top, plat:true, secret:true}); W.secrets.push({x:x + 235, y:top, h}); for (let i = 0; i < 3; i++) W.crystals.push({x:x + 185 + i * 50, y:top - 44, got:false, v:3, big:true}); W.chests.push({x:x + 235, y:top, open:false, gift:'secret'}); x += 460; }
    else if (kind === 'goal') { ground(640); W.goal = {x:x + 330, y:h, kind:Q.goal, done:false}; x += 640; }
  }
  W.len = x;
  return W;
}
S.build = build;

/* ---------- the quest game ---------- */
PUM.games.sky = function (o) {
  const p = o.player, assist = o.assist, qi = o.levelIndex, api = o.api, Q = S.QUESTS[qi];
  const L = K.lookOf(p), st = S.stats(p), comp = S.activeComp(p), age = p.age, mira = p.hero === 1;
  const W = build(Q);
  const parts = E.Particles();
  const hero = {x:90, y:0, vx:0, vy:0, ground:true, face:1, run:0, coyote:0, buf:0, used2:false, inv:0, safe:{x:90, y:0}};
  const g = {mode:'explore', t:0, hearts:st.hearts, maxH:st.hearts, meter:0, revived:false, lost:0, right:0, asked:0, snacks:0, crystals:0, beaten:0,
    shake:0, banner:null, nums:[], trans:0, heal:S.heal(p), healTo:S.heal(p), camX:0, camY:0, comp:{x:40, y:-110}, endT:0, lit:0, xp:0};
  const ctl = {left:false, right:false};
  let Wd = 360, Hd = 640, s = 1, gy = 400, b = null, lock = null;
  const double = p.sky.moves.double, tower = p.sky.b.tower;
  const SPEED = 250 * (1 + .06 * st.boots), JV = -880 * (1 + .025 * st.boots), JV2 = -700, GRAV = 2300, HW = 14;
  const say = t => { if (p.speak) A.say(t); };
  const banner = (text, sub, dur = 1.6, col) => { g.banner = {text, sub, t:0, dur, col}; };
  const num = (x, y, text, col, big) => g.nums.push({x, y, text, col, big, t:0});
  const exploreCtrl = () => `<span class="ctl-pair"><button class="ctl sq move" data-ctl="left" aria-label="Move left">${PUM.icon('back')}</button><button class="ctl sq move" data-ctl="right" aria-label="Move right">${PUM.icon('next')}</button></span><button class="ctl sq jump" data-ctl="jump" aria-label="Jump">${PUM.icon('up')}<span>Jump</span></button>`;
  const guardCtrl = () => `<span></span><button class="ctl sq guard" data-ctl="guard" aria-label="Guard"><span>Guard</span></button><span></span>`;
  const objText = () => Q.goal === 'lanterns' ? `${Q.obj} ${g.lit} / ${W.lanterns.length}` : Q.obj;

  /* ---- explore ---- */
  function hurtFall() {
    hero.x = hero.safe.x; hero.y = hero.safe.y; hero.vx = 0; hero.vy = 0; hero.inv = 1.2;
    if (assist >= 2) { banner('Whoops!', 'Try that jump again', 1); A.sfx('hurt'); return; }
    g.hearts--; g.lost++; A.sfx('hurt'); g.shake = 8;
    banner('Ouch!', g.hearts > 0 ? 'You lost a heart' : '', 1);
    if (g.hearts <= 0) knockedOut();
  }
  function updateExplore(dt) {
    const h = hero, dir = (ctl.right ? 1 : 0) - (ctl.left ? 1 : 0), target = dir * SPEED;
    h.vx += clamp(target - h.vx, -2000 * dt, 2000 * dt); if (dir) h.face = dir;
    if (h.buf > 0) {
      if (h.ground || h.coyote > 0) { h.vy = JV; h.ground = false; h.coyote = 0; h.buf = 0; A.sfx('jump'); }
      else if (double && !h.used2) { h.vy = JV2; h.used2 = true; h.buf = 0; A.sfx('jump'); parts.burst(h.x, h.y, 10, {speed:140, life:.5, size:3, color:['#FFC6DD', '#7FF0FF'], g:200}); }
    }
    h.buf -= dt; h.coyote -= dt; h.inv -= dt;
    h.vy = Math.min(1400, h.vy + GRAV * dt);
    let nx = h.x + h.vx * dt;
    for (const bl of W.blocks) if (bl.ground && nx + HW > bl.x && nx - HW < bl.x + bl.w && h.y > bl.top + 3) { if (h.x <= bl.x) nx = bl.x - HW; else if (h.x >= bl.x + bl.w) nx = bl.x + bl.w + HW; h.vx = 0; }
    for (const gt of W.gates) if (!gt.solved && nx > gt.x - 46 && h.x <= gt.x - 45) { nx = gt.x - 46; h.vx = 0; if (!lock) openLock('gate', gt); }
    nx = clamp(nx, 20, W.len - 20);
    let ny = h.y + h.vy * dt, landed = null;
    if (h.vy >= 0) for (const bl of W.blocks) if (nx + HW * .7 > bl.x && nx - HW * .7 < bl.x + bl.w && h.y <= bl.top + .5 && ny >= bl.top) { if (!landed || bl.top < landed.top) landed = bl; }
    if (landed) { ny = landed.top; h.vy = 0; h.ground = true; h.coyote = .1; h.used2 = false; if (landed.ground) h.safe = {x:clamp(nx, landed.x + 40, landed.x + landed.w - 40), y:landed.top}; }
    else { if (h.ground) h.coyote = .1; h.ground = false; }
    h.x = nx; h.y = ny; h.run += Math.abs(h.vx) * dt * .045;
    if (h.y > 560) hurtFall();
    /* pickups and things */
    for (const c of W.crystals) if (!c.got && Math.hypot(c.x - h.x, c.y - (h.y - 46)) < (c.big ? 42 : 34)) { c.got = true; api.addMp(c.v); g.crystals += c.v; A.sfx('coin'); parts.burst(c.x, c.y, 8, {speed:120, life:.5, size:3, color:['#9BF6FF', '#FFFFFF'], shape:'star'}); }
    for (const l of W.lanterns) if (!l.lit && Math.abs(l.x - h.x) < 40) { l.lit = true; g.lit++; A.sfx('purify'); parts.burst(l.x, l.y - 90, 18, {speed:160, life:.8, size:3, color:['#FFD27A', '#FFF1C2'], shape:'star'}); banner('Lantern lit!', `${g.lit} of ${W.lanterns.length}`, 1.1); }
    for (const c of W.chests) if (!c.open && !lock && Math.abs(c.x - h.x) < 40 && Math.abs(c.y - h.y) < 40) openLock('chest', c);
    for (const f of W.foes) if (!f.done && Math.abs(f.x - h.x) < 92 && h.y > f.y - 170) { startBattle(f); break; }
    if (W.goal && !W.goal.done && h.x > W.goal.x - 60) reachGoal();
    /* companion follows */
    g.comp.x = lerp(g.comp.x, h.x - h.face * 52, 1 - Math.exp(-dt * 4)); g.comp.y = lerp(g.comp.y, h.y - 112, 1 - Math.exp(-dt * 4));
  }
  function camUpdate(dt) {
    const vw = Wd / s;
    const tx = clamp(hero.x - vw * .36, 0, Math.max(0, W.len - vw));
    g.camX = lerp(g.camX, tx, 1 - Math.exp(-dt * 8));
    const ty = clamp(hero.y + 150, -420, 0);
    g.camY = lerp(g.camY, Math.min(ty, 0), 1 - Math.exp(-dt * 4));
  }

  /* ---- math locks: chests and spirit gates ---- */
  function qPanel(title, q, opts, state, extra = '') {
    const btns = opts.map((v, i) => { const cls = state ? (v === q.ans ? 'good' : v === state.picked ? 'miss' : 'dim') : ''; return `<button class="sq-opt ${cls}" data-gp="ans" data-v="${v}" ${state ? 'disabled' : ''}><span>${v}</span><small>${i + 1}</small></button>`; }).join('');
    return `<div class="sq-card"><div class="sq-title">${title}</div><div class="sq-q">${PUM.questionHTML(q)}</div>${extra}<div class="sq-opts n${opts.length}">${btns}</div></div>`;
  }
  const nOpts = () => age <= 7 ? 3 : 4;
  function openLock(kind, ref) {
    const {q, options} = PUM.gateQuestion(p, nOpts());
    lock = {kind, ref, q, options, answered:false};
    hero.vx = 0; ctl.left = ctl.right = false;
    api.ctrl('');
    const title = kind === 'chest' ? (ref.gift === 'secret' ? 'Secret chest! Answer to open the lock' : 'Treasure chest! Answer to open the lock') : 'Spirit gate! Answer to open the way';
    api.panel(qPanel(title, q, options, null, kind === 'chest' ? `<button class="sq-leave" data-gp="leave">Leave it</button>` : ''), 'sky-q');
    say(q.spoken);
    g.mode = 'lock';
  }
  function answerLock(v) {
    if (!lock || lock.answered) return;
    const ok = v === lock.q.ans; lock.answered = true;
    g.asked++; if (ok) { g.right++; g.xp += 10; }
    api.answer(ok, lock.q);
    api.panel(qPanel(ok ? 'Unlocked!' : `Not quite. It's ${lock.q.ans}.`, lock.q, lock.options, {picked:v}), 'sky-q');
    setTimeout(() => {
      if (!lock) return;
      if (!ok) { const {kind, ref} = lock; lock = null; openLock(kind, ref); return; }
      const {kind, ref} = lock; lock = null; api.panel(null); api.ctrl(exploreCtrl()); g.mode = 'explore';
      if (kind === 'chest') {
        ref.open = true; A.sfx('chest');
        const sec = ref.gift === 'secret', sn = sec ? 2 : 1, cr = sec ? 8 : 4;
        g.snacks += sn; api.addMp(cr); g.crystals += cr;
        parts.burst(ref.x, ref.y - 40, 24, {speed:220, life:1, size:4, color:['#FFE27A', '#9BF6FF', '#FFC6DD'], shape:'star', g:300});
        banner(sec ? 'Secret treasure!' : 'Treasure!', `+${sn} spirit snack${sn > 1 ? 's' : ''} and +${cr} crystals`, 1.6);
      } else { ref.solved = true; A.sfx('purify'); banner('The gate opens!', '', 1); }
    }, ok ? 900 : 1400);
  }

  /* ---- battles ---- */
  function startBattle(f) {
    hero.vx = 0; ctl.left = ctl.right = false;
    g.mode = 'trans'; g.trans = 0; g.pending = f; api.ctrl('');
    A.sfx(f.kind === 'hanamori' ? 'boss' : 'blast');
  }
  function newBattle(f) {
    if (f.kind === 'hanamori') return {f, boss:true, el:'blossom', name:'Hanamori', hp:Math.round(240 * (assist >= 2 ? .7 : assist ? .85 : 1)), max:Math.round(240 * (assist >= 2 ? .7 : assist ? .85 : 1)), phase:0, shield:null, pure:0, x:0, state:'intro', tm:0};
    const F = FOES[f.kind], sc = (1 + .15 * qi) * (assist >= 2 ? .7 : assist ? .85 : 1);
    return {f, el:F.el, name:F.name, hp:Math.round(F.hp * sc), max:Math.round(F.hp * sc), big:F.big, state:'intro', tm:0, x:0, seed:Math.round(f.x)};
  }
  const bossPhases = [{name:'Tail Sweep', hits:[1.3]}, {name:'Petal Storm', hits:[1.2, 1.9]}, {name:'Antler Charge', hits:[.95]}];
  function setState(s2) { b.state = s2; b.tm = 0; }
  function moveName(el) { return S.MOVES[el][p.hero] || S.MOVES[el][0]; }
  function moveBtns() {
    const els = ['blossom', 'tide', 'ember'].concat(st.storm ? ['storm'] : []);
    const spec = g.meter >= 1 ? `<button class="sq-move special" data-gp="move" data-v="special"><b>${S.SPECIAL[p.hero]}</b><small>Special move ready!</small></button>` : '';
    return `<div class="sq-card moves"><div class="sq-title">${g.meter >= 1 ? 'Your Spirit meter is full!' : 'Pick a move'}</div>${spec}<div class="sq-moves n${els.length}">${els.map((el, i) => `<button class="sq-move el-${el}" data-gp="move" data-v="${el}"><small>${S.EL[el].name}</small><b>${moveName(el)}</b><i>${i + 1}</i></button>`).join('')}</div></div>`;
  }
  function toPick() {
    if (b.boss && b.shield) { toAsk('shield'); return; }
    if (assist >= 2) {
      if (g.meter >= 1) { api.panel(`<div class="sq-card moves"><div class="sq-title">Your Spirit meter is full!</div><button class="sq-move special" data-gp="move" data-v="special"><b>${S.SPECIAL[p.hero]}</b><small>Tap for your special move!</small></button></div>`, 'sky-q'); setState('pick'); say('Special move ready! Tap it!'); return; }
      toAsk(S.weakTo(b.el)); return;
    }
    api.panel(moveBtns(), 'sky-q'); setState('pick');
  }
  function toAsk(move) {
    b.move = move;
    const {q, options} = PUM.gateQuestion(p, nOpts());
    b.q = q; b.opts = options; b.answered = false; b.askT = 0;
    b.crit = age >= 10 ? 5 : age >= 8 ? 7 : 0;
    const title = move === 'shield' ? `Break the shadow shield! ${b.shield.got} of 3` : `${move === 'special' ? '' : moveName(move) + ': '}answer to power it up`;
    const bar = b.crit && move !== 'shield' ? `<div class="sq-crit"><i style="animation-duration:${b.crit}s"></i><span>Quick answer = critical hit!</span></div>` : '';
    api.panel(qPanel(title, q, options, null, bar), 'sky-q'); say(q.spoken);
    setState('ask');
  }
  function answerBattle(v) {
    if (b.state !== 'ask' || b.answered) return;
    const ok = v === b.q.ans; b.answered = true;
    g.asked++; api.answer(ok, b.q);
    const crit = ok && b.crit && b.askT <= b.crit && b.move !== 'shield';
    if (ok) { g.right++; g.xp += crit ? 15 : 10; }
    api.panel(qPanel(ok ? (crit ? 'CRITICAL!' : b.move === 'shield' ? 'Crack!' : 'Yes!') : `Not quite. It's ${b.q.ans}.`, b.q, b.opts, {picked:v}), 'sky-q');
    b.ok = ok; b.isCrit = crit;
    setState(ok ? 'resolve' : 'miss');
  }
  function damage(el, factor) {
    let m = S.mult(el, b.el, mira) * factor;
    if (p.hero === 2 && Math.random() < .2) { m *= 1.5; b.lucky = true; }
    return Math.max(1, Math.round(st.atk * m));
  }
  function hitFoe(dmg, col, big) {
    const fx = Wd * .66, fy = Hd * .3;
    if (b.boss && !b.finale && b.hp - dmg <= 0 && b.move !== 'special') { dmg = b.hp - 1; }
    b.hp = Math.max(0, b.hp - dmg); b.flash = 1; b.x = 18;
    num(fx + (Math.random() - .5) * 60, fy - 40, String(dmg), col, big);
    parts.burst(fx, fy, big ? 46 : 22, {speed:big ? 420 : 260, life:.7, size:big ? 5 : 3.5, color:[col, '#FFFFFF'], shape:'star', drag:2});
    g.shake = Math.max(g.shake, big ? 16 : 6); A.sfx(big ? 'blast' : 'slash');
  }
  function afterHeroTurn() {
    if (b.hp <= 0) { setState('win'); A.sfx('purify'); banner(b.boss ? 'Purified!' : 'Purified!', b.boss ? '' : `+3 crystals`, 1.6); if (!b.boss) { api.addMp(3); g.crystals += 3; } g.beaten++; return; }
    if (b.boss) {
      const th = b.phase === 0 ? .66 : b.phase === 1 ? .33 : -1;
      if (b.hp / b.max <= th) { b.hp = Math.ceil(th * b.max); b.shield = {got:0}; setState('shieldUp'); A.sfx('boss'); banner('Shadow shield!', '3 right answers in a row break it', 2); say('Shadow shield! Answer 3 in a row to break it!'); return; }
      if (b.phase === 2 && b.hp <= 1 && !b.finale) { b.finale = true; g.meter = 1; banner('Hanamori is weak!', 'Use your special move!', 1.8); say('Use your special move!'); }
    }
    enemyTurn();
  }
  function enemyTurn() {
    const base = b.boss ? bossPhases[b.phase].hits.slice() : [1.4];
    const slow = assist >= 2 ? 1.6 : assist ? 1.2 : 1;
    b.hits = base.map(t0 => ({t:t0 * slow + .3, done:false, blocked:false, tried:false}));
    b.windDur = b.hits[b.hits.length - 1].t + .7;
    api.panel(null); api.ctrl(guardCtrl());
    setState('wind');
    if (b.boss) banner(bossPhases[b.phase].name, '', .9, '#FF6FD8');
  }
  function guardTap() {
    if (!b || b.state !== 'wind') return;
    const h = b.hits.find(x => !x.done && !x.tried); if (!h) return;
    const dtI = h.t - b.tm, win = assist >= 2 ? 9 : assist ? .3 : .2;
    if (assist >= 2) { if (b.tm > .25) { h.tried = true; h.blocked = true; } return; }
    if (dtI > .75) return;
    h.tried = true;
    if (Math.abs(dtI) <= win) { h.blocked = true; h.perfect = Math.abs(dtI) <= .09; }
  }
  function enemyHit(h) {
    h.done = true; b.lunge = 1;
    const hx = Wd * .26, hy = Hd * .45;
    if (h.blocked) {
      A.sfx('block'); g.blockFx = 1; num(hx + 40, hy - 70, h.perfect ? 'PERFECT!' : 'BLOCK!', '#7FF0FF', true);
      if (h.perfect) g.meter = Math.min(1, g.meter + .1);
      parts.burst(hx, hy, 16, {speed:200, life:.5, size:3, color:['#7FF0FF', '#FFFFFF']});
    } else {
      g.hearts--; g.lost++; g.hurtFx = 1; g.shake = 14; A.sfx('hurt'); num(hx + 40, hy - 70, '-1', '#FF6FB0', true);
      if (g.hearts <= 0) { b.ko = true; }
    }
  }
  function knockedOut() {
    if (!g.revived) { g.revived = true; g.koWait = true; api.panel(null); api.ctrl(''); setTimeout(() => api.needRefuel('revive'), 500); }
    else { g.mode = 'lose'; g.endT = 0; api.panel(null); api.ctrl(''); banner('Knocked out', 'Train up and try again!', 3); }
  }
  function updateBattle(dt) {
    b.tm += dt; b.flash = Math.max(0, (b.flash || 0) - dt * 4); b.x *= Math.exp(-dt * 10); b.lunge = Math.max(0, (b.lunge || 0) - dt * 3);
    g.blockFx = Math.max(0, (g.blockFx || 0) - dt * 2.5); g.hurtFx = Math.max(0, (g.hurtFx || 0) - dt * 2.5);
    if (b.state === 'intro' && b.tm > 1.5) toPick();
    else if (b.state === 'ask') b.askT += dt;
    else if (b.state === 'resolve' && b.tm > .55) {
      api.panel(null);
      if (b.move === 'shield') {
        b.shield.got++; A.sfx('shatter'); parts.burst(Wd * .66, Hd * .3, 30, {speed:300, life:.6, size:4, color:['#B04CFF', '#FFFFFF'], shape:'rect'}); g.shake = 8;
        g.meter = Math.min(1, g.meter + st.meter * .5);
        if (b.shield.got >= 3) { b.shield = null; b.phase++; setState('shieldBreak'); banner('Shield broken!', `Phase ${b.phase + 1}: ${bossPhases[b.phase].name}`, 1.8); g.shake = 18; }
        else setState('crack');
        return;
      }
      setState('atk'); b.hitsLeft = p.hero === 0 ? 2 : 1;
      g.meter = Math.min(1, g.meter + st.meter);
    }
    else if (b.state === 'crack' && b.tm > .7) toAsk('shield');
    else if (b.state === 'shieldUp' && b.tm > 2.1) toPick();
    else if (b.state === 'shieldBreak' && b.tm > 1.9) toPick();
    else if (b.state === 'miss' && b.tm > 1.3) {
      api.panel(null);
      if (b.move === 'shield' && assist === 0) b.shield.got = 0;
      setState('dodge'); A.sfx('jump');
    }
    else if (b.state === 'dodge' && b.tm > .8) enemyTurn();
    else if (b.state === 'atk') {
      const col = S.EL[b.move].col;
      if (b.hitsLeft > 0 && b.tm > (p.hero === 0 ? (b.hitsLeft === 2 ? .3 : .55) : .35)) { b.hitsLeft--; hitFoe(damage(b.move, (p.hero === 0 ? .55 : 1) * (b.isCrit ? 1.35 : 1)), col, b.isCrit); }
      if (!b.compDone && b.tm > .95) { b.compDone = true; b.compFx = 1; hitFoe(Math.max(1, Math.round(st.atk * (.25 + .04 * comp.lv) * S.mult(comp.el, b.el))), S.EL[comp.el].col, false); }
      if (b.tm > 1.5) { b.compDone = false; afterHeroTurn(); }
    }
    else if (b.state === 'cutin' && b.tm > 1.8) { setState('specAtk'); }
    else if (b.state === 'specAtk') {
      if (!b.specHit && b.tm > .35) { b.specHit = true; b.move = 'special'; hitFoe(Math.round(st.atk * 3.2), '#E9FDFF', true); g.shake = 26; }
      if (b.tm > 1.4) { b.specHit = false; afterHeroTurn(); }
    }
    else if (b.state === 'wind') {
      for (const h of b.hits) if (!h.done && b.tm >= h.t) enemyHit(h);
      if (b.ko && !g.koWait) { b.ko = false; setState('ko'); knockedOut(); return; }
      if (b.tm > b.windDur) { api.ctrl(''); toPick(); }
    }
    else if (b.state === 'win') {
      if (b.boss) { b.pure = Math.min(1, b.tm / 2.4); if (b.tm > 1 && !b.joined) { b.joined = true; banner('Hanamori is free!', 'The Blossom Deer joins your team!', 2.4, '#FFC6DD'); } if (b.tm > 3.6) { finishQuest(); } }
      else if (b.tm > 1.8) { b.f.done = true; b = null; g.mode = 'trans2'; g.trans = 0; }
    }
  }
  function uiMove(v) {
    if (!b || b.state !== 'pick') return;
    if (v === 'special') { g.meter = 0; api.panel(null); setState('cutin'); A.sfx('special'); say(S.SPECIAL[p.hero]); return; }
    toAsk(v);
  }

  /* ---- goal and ending ---- */
  function reachGoal() {
    if (Q.goal === 'grove') { W.goal.done = true; startBattle({kind:'hanamori', x:W.goal.x, y:W.goal.y}); return; }
    if (Q.goal === 'lanterns' && g.lit < W.lanterns.length) { if (!g.warned) { g.warned = true; banner('Not yet!', 'Light every lantern first', 1.4); } hero.x = W.goal.x - 61; return; }
    W.goal.done = true; finishQuest();
  }
  function finishQuest() {
    g.mode = 'end'; g.endT = 0; api.panel(null); api.ctrl(''); hero.vx = 0;
    g.healTo = Math.max(g.heal, Math.min(1, (S.cleared(p) + (p.prog.anime.stars[qi] ? 0 : 1)) / S.ACTIVE));
    A.sfx('fanfare');
    const msg = {cage:['The cubs are free!', 'Blossom Isle blooms again'], lanterns:['The lanterns glow!', 'The spirits found their way home'], bell:['The bell rings out!', 'The island is waking up'], falls:['The falls flow again!', 'Colour returns to the river'], grove:['Blossom Isle is saved!', 'You learned DOUBLE JUMP!']}[Q.goal];
    banner(msg[0], msg[1], 3.4, '#FFE27A');
  }
  function result(ok) {
    api.finish({ok, quest:qi, right:g.right, asked:g.asked, lost:g.lost, snacks:g.snacks, crystals:g.crystals, xp:g.xp, beaten:g.beaten, reason:ok ? '' : 'ko'});
  }

  /* ---- drawing ---- */
  const glass = (c, x, y, w, h, r = 14) => { c.save(); E.rr(c, x, y, w, h, r); c.fillStyle = 'rgba(20,24,70,.66)'; c.fill(); c.shadowColor = '#7FF0FF'; c.shadowBlur = 10; c.strokeStyle = 'rgba(143,230,255,.7)'; c.lineWidth = 2; c.stroke(); c.restore(); };
  const heart = (c, x, y, r, on) => { c.fillStyle = on ? '#FF6FB0' : 'rgba(255,255,255,.22)'; c.beginPath(); c.moveTo(x, y + r); c.bezierCurveTo(x - r * 1.5, y, x - r, y - r * 1.1, x, y - r * .4); c.bezierCurveTo(x + r, y - r * 1.1, x + r * 1.5, y, x, y + r); c.fill(); if (on) { c.fillStyle = 'rgba(255,255,255,.6)'; c.beginPath(); c.arc(x - r * .4, y - r * .3, r * .22, 0, TAU); c.fill(); } };
  const label = (c, text, x, y, size, col = '#F3F6FF', align = 'center', font = 'Lexend') => { c.font = `800 ${size}px ${font === 'D' ? '"Dela Gothic One", Lexend' : '"Zen Kaku Gothic New", Lexend'}, sans-serif`; c.textAlign = align; c.textBaseline = 'middle'; c.fillStyle = col; c.fillText(text, x, y); };
  function drawHearts(c, x, y) { for (let i = 0; i < g.maxH; i++) heart(c, x + i * 22, y, 8, i < g.hearts); }
  function drawMeter(c, x, y, w) {
    c.save(); E.rr(c, x, y, w, 10, 5); c.fillStyle = 'rgba(0,0,0,.4)'; c.fill(); c.beginPath(); c.rect(x + 1, y + 1, (w - 2) * g.meter, 8); c.clip(); c.shadowColor = '#7FF0FF'; c.shadowBlur = 12; c.fillStyle = g.meter >= 1 ? `hsl(${(g.t * 200) % 360},90%,70%)` : '#7FF0FF'; c.fillRect(x, y, w, 10); c.restore();
    c.strokeStyle = 'rgba(143,230,255,.7)'; c.lineWidth = 1.5; E.rr(c, x, y, w, 10, 5); c.stroke();
    label(c, 'SPIRIT', x, y - 8, 10, '#B9C8FF', 'left');
  }
  function drawBanner(c) {
    const bn = g.banner; if (!bn) return;
    const k = bn.t / bn.dur, a = Math.min(1, bn.t * 6, (bn.dur - bn.t) * 4); if (a <= 0) return;
    const y = Hd * (g.mode === 'battle' ? .5 : .36), slide = (1 - Math.min(1, bn.t * 5)) * 60;
    c.save(); c.globalAlpha = a;
    c.fillStyle = 'rgba(12,14,46,.78)'; c.beginPath(); c.moveTo(0, y - 34 + 6); c.lineTo(Wd, y - 34 - 6); c.lineTo(Wd, y + (bn.sub ? 34 : 22) - 6); c.lineTo(0, y + (bn.sub ? 34 : 22) + 6); c.closePath(); c.fill();
    c.strokeStyle = bn.col || '#8FE6FF'; c.lineWidth = 2; c.stroke();
    c.save(); c.shadowColor = bn.col || '#7FF0FF'; c.shadowBlur = 16; label(c, bn.text, Wd / 2 + slide, y - 8, Math.min(30, Wd / 12), '#FFFFFF', 'center', 'D'); c.restore();
    if (bn.sub) label(c, bn.sub, Wd / 2 - slide, y + 20, 15, '#D9E4FF');
    c.restore();
    void k;
  }
  function drawNums(c) { for (const n of g.nums) { const a = 1 - n.t / 1.1; if (a <= 0) continue; c.save(); c.globalAlpha = Math.min(1, a * 2); const sz = n.big ? 34 : 24; c.font = `${sz}px "Dela Gothic One", Lexend, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineJoin = 'round'; c.lineWidth = 6; c.strokeStyle = '#120A20'; const yy = n.y - n.t * 50; c.strokeText(n.text, n.x, yy); c.shadowColor = n.col; c.shadowBlur = 12; c.fillStyle = n.col; c.fillText(n.text, n.x, yy); c.restore(); } }
  function drawExplore(c, t) {
    const cx = g.camX, sy0 = gy - g.camY * s;
    K.islandBg(c, Wd, Hd, cx, sy0, s, t);
    c.save(); c.translate(-cx * s, sy0); c.scale(s, s);
    const vx0 = cx - 60, vx1 = cx + Wd / s + 60;
    /* glowing path for little kids, and jump hints */
    for (const gp of W.gaps) if (gp.x > vx0 - 200 && gp.x < vx1) {
      if (assist >= 1 && gp.x > hero.x - 40) { const a = .6 + .4 * Math.sin(t * 6); c.save(); c.globalAlpha = a; c.shadowColor = '#FFE27A'; c.shadowBlur = 12; c.strokeStyle = '#FFE27A'; c.lineWidth = 4; c.setLineDash([10, 10]); c.beginPath(); c.moveTo(gp.x - 30, gp.h - 10); c.quadraticCurveTo(gp.x + gp.w / 2, gp.h - 200, gp.x + gp.w + 30, gp.h - 10); c.stroke(); c.setLineDash([]); label(c, 'JUMP!', gp.x - 10, gp.h - 70, 18, '#FFE27A', 'center', 'D'); c.restore(); }
    }
    for (const bl of W.blocks) if (bl.x + bl.w > vx0 && bl.x < vx1) {
      if (bl.secret && !double) { c.save(); c.globalAlpha = tower ? .9 : .45; K.ground(c, bl.x, bl.top, bl.w, 26, 1, 'plat'); c.restore(); if (tower) { c.save(); c.shadowColor = '#FFE27A'; c.shadowBlur = 20; c.strokeStyle = 'rgba(255,226,122,.8)'; c.lineWidth = 3; E.rr(c, bl.x - 6, bl.top - 10, bl.w + 12, 40, 10); c.stroke(); c.restore(); } continue; }
      K.ground(c, bl.x, bl.top, bl.w, bl.plat ? 26 : 520, 1, bl.plat ? 'plat' : 'ground');
    }
    for (const sc of W.secrets) if (sc.x > vx0 && sc.x < vx1 && !double) { label(c, '?', sc.x, sc.y - 70 + Math.sin(t * 3) * 4, 30, '#FFE27A', 'center', 'D'); if (Math.abs(hero.x - sc.x) < 200) label(c, 'Too high! A guardian can teach you double jump.', sc.x, sc.h - 150, 13, '#FFFFFF'); }
    for (const l of W.lanterns) if (l.x > vx0 && l.x < vx1) K.lantern(c, l.x, l.y, 1, l.lit, t);
    for (const gt of W.gates) if (gt.x > vx0 - 80 && gt.x < vx1 + 80) { gt.open = gt.solved ? Math.min(1, gt.open + .03) : 0; K.gate(c, gt.x, gt.y, 1, t, gt.open, ''); }
    for (const ch of W.chests) if (ch.x > vx0 && ch.x < vx1) K.chest(c, ch.x, ch.y, 1, ch.open, t);
    if (W.goal) { const gl = W.goal, done = g.mode === 'end';
      if (gl.kind === 'cage') K.cage(c, gl.x, gl.y, 1, t, done);
      else if (gl.kind === 'lanterns') { c.save(); c.translate(gl.x, gl.y); K.lantern(c, -60, 0, 1.2, done || g.lit >= W.lanterns.length, t); K.lantern(c, 60, 0, 1.2, done || g.lit >= W.lanterns.length, t); c.restore(); c.save(); c.translate(gl.x, gl.y); c.scale(.9, .9); c.translate(-gl.x, -gl.y); c.restore(); K.gate(c, gl.x, gl.y, 1.1, t, 1, ''); }
      else if (gl.kind === 'bell') K.bell(c, gl.x, gl.y, 1, t, done);
      else if (gl.kind === 'falls') K.falls(c, gl.x + 60, gl.y, 1, t, done ? Math.min(1, g.endT / 1.5) : 0);
      else if (gl.kind === 'grove') { c.save(); c.globalAlpha = .9; K.gate(c, gl.x, gl.y, 1.3, t, 1, ''); c.restore(); }
    }
    for (const cr of W.crystals) if (!cr.got && cr.x > vx0 && cr.x < vx1) K.crystal(c, cr.x, cr.y, cr.big ? 13 : 9, t);
    for (const f of W.foes) if (!f.done && f.x > vx0 - 100 && f.x < vx1 + 100) {
      c.fillStyle = 'rgba(0,0,0,.3)'; c.beginPath(); c.ellipse(f.x, f.y, 44, 9, 0, 0, TAU); c.fill();
      K.shadow(c, FOES[f.kind] ? FOES[f.kind].el : 'blossom', f.x, f.y - 80, FOES[f.kind] && FOES[f.kind].big ? .55 : .42, t + f.x, {face:-1, big:FOES[f.kind] && FOES[f.kind].big, seed:Math.round(f.x)});
    }
    K.spirit(c, comp.kind, comp.stage, g.comp.x, g.comp.y, .42, t, {face:hero.face});
    c.fillStyle = 'rgba(0,0,0,.28)'; c.beginPath(); c.ellipse(hero.x, hero.ground ? hero.y : hero.y + 4, 22, 5, 0, 0, TAU); c.fill();
    if (!(hero.inv > 0 && Math.floor(t * 16) % 2)) K.sprite(c, L, hero.x, hero.y, .92, {face:hero.face, run:hero.run, speed:Math.min(1, Math.abs(hero.vx) / SPEED), air:hero.ground ? null : Math.sign(hero.vy), t});
    parts.draw(c);
    c.restore();
    K.petals(c, Wd, Hd, t, 18);
    const heal = g.heal; if (heal < 1) { c.save(); c.globalCompositeOperation = 'saturation'; c.fillStyle = `rgba(128,128,128,${(1 - heal) * .55})`; c.fillRect(0, 0, Wd, Hd); c.restore(); }
    /* HUD */
    const top = 10 + (window.visualViewport ? 0 : 0);
    glass(c, 64, top, Math.min(Wd - 150, 210), 50);
    drawHearts(c, 82, top + 18);
    label(c, objText(), 74, top + 38, 12, '#D9E4FF', 'left');
  }
  function drawBattle(c, t) {
    K.battleBg(c, Wd, Hd, t, {boss:b.boss});
    const fx = Wd * .66 + b.x - (b.lunge || 0) * Wd * .2, fy = Hd * .3 + (b.lunge || 0) * Hd * .08, fk = Math.min(Wd / 420, Hd / 760);
    const winA = b.state === 'win' && !b.boss ? Math.max(0, 1 - b.tm / 1.2) : 1;
    if (b.boss) K.deer(c, fx + 20 * fk, Hd * .47, fk * .62, t, b.pure, {flash:b.flash, hit:b.flash > .5, charge:b.state === 'wind' && b.phase === 2});
    else K.shadow(c, b.el, fx, fy, fk * (b.big ? .95 : .8), t, {face:-1, big:b.big, flash:b.flash, alpha:winA, seed:b.seed});
    if (b.boss && b.shield) { c.save(); c.translate(Wd * .66, Hd * .3); const r = 150 * fk; c.shadowColor = '#B04CFF'; c.shadowBlur = 24; c.strokeStyle = 'rgba(200,120,255,.9)'; c.fillStyle = 'rgba(120,40,200,.18)'; c.lineWidth = 3; c.beginPath(); for (let i = 0; i < 6; i++) { const a = i * TAU / 6 + t * .3; c.lineTo(Math.cos(a) * r, Math.sin(a) * r); } c.closePath(); c.fill(); c.stroke();
      c.strokeStyle = 'rgba(255,255,255,.9)'; c.lineWidth = 2; for (let i = 0; i < b.shield.got; i++) { c.beginPath(); c.moveTo(0, 0); for (let j = 1; j < 5; j++) c.lineTo(Math.cos(i * 2.1 + j * .4) * r * j / 4, Math.sin(i * 2.1 + j * .3) * r * j / 4); c.stroke(); } c.restore(); }
    /* slash effects */
    if (b.state === 'atk' && b.tm < 1) { const col = S.EL[b.move].col, k2 = clamp((b.tm - .2) / .35, 0, 1); c.save(); c.shadowColor = col; c.shadowBlur = 20; c.strokeStyle = '#FFFFFF'; c.lineWidth = 6 * (1 - k2) + 1; c.beginPath(); c.arc(Wd * .66, Hd * .3, 90 * fk, -2.4 + k2 * 2.6, -2.4 + k2 * 2.6 + 1.2); c.stroke(); c.strokeStyle = col; c.lineWidth = 3; c.stroke(); c.restore(); }
    if (b.compFx > 0) { b.compFx -= .03; c.save(); c.globalAlpha = Math.max(0, b.compFx); c.strokeStyle = S.EL[comp.el].col; c.lineWidth = 5; c.beginPath(); c.moveTo(Wd * .42, Hd * .44); c.lineTo(Wd * .66, Hd * .3); c.stroke(); c.restore(); }
    /* hero bust, lower left */
    const bs = Math.min(Wd * .62 / 360, Hd * .32 / 300), lunge = b.state === 'atk' && b.tm < .5 ? Math.sin(b.tm / .5 * Math.PI) * 30 : 0, dodge = b.state === 'dodge' ? -Math.sin(b.tm / .8 * Math.PI) * 40 : 0;
    c.save(); c.beginPath(); c.rect(0, Hd * .3, Wd * .62, Hd * .3); c.clip();
    c.translate(Wd * .26 - 180 * bs + lunge, Hd * .47 - 220 * bs + dodge * .3); c.scale(bs, bs);
    K.bust(c, L, {fierce:b.state === 'atk' || b.state === 'wind', mouth:b.state === 'atk' ? 'shout' : b.state === 'win' ? 'grin' : 'smile', blink:Math.sin(t * 1.7) > .985 ? .1 : 1});
    c.restore();
    if (g.hurtFx > 0) { c.save(); c.globalAlpha = g.hurtFx * .5; c.fillStyle = '#FF2A5A'; c.fillRect(0, 0, Wd, Hd); c.restore(); }
    if (g.blockFx > 0) { c.save(); c.globalAlpha = g.blockFx; c.translate(Wd * .26, Hd * .45); c.shadowColor = '#7FF0FF'; c.shadowBlur = 20; c.strokeStyle = '#BFF6FF'; c.lineWidth = 4; const r = 90 * (1.2 - g.blockFx * .2); c.beginPath(); for (let i = 0; i < 6; i++) { const a = i * TAU / 6; c.lineTo(Math.cos(a) * r, Math.sin(a) * r); } c.closePath(); c.stroke(); c.restore(); }
    K.spirit(c, comp.kind, comp.stage, Wd * .48, Hd * .5, .5 * Math.min(1.2, Wd / 380), t, {face:1});
    /* guard ring */
    if (b.state === 'wind') {
      const h = b.hits.find(x => !x.done);
      const hx = Wd * .26, hy = Hd * .45, rT = 56;
      if (h) {
        const rem = h.t - b.tm, near = assist >= 2 ? b.tm > .25 : Math.abs(rem) <= (assist ? .3 : .2);
        c.save(); c.lineWidth = 4; c.strokeStyle = near ? '#FFE27A' : 'rgba(255,255,255,.55)'; c.shadowColor = near ? '#FFE27A' : '#7FF0FF'; c.shadowBlur = near ? 20 : 6; c.beginPath(); c.arc(hx, hy, rT, 0, TAU); c.stroke();
        if (rem < 1.1 && rem > -.1) { c.strokeStyle = '#FF6FD8'; c.lineWidth = 5; c.shadowColor = '#FF6FD8'; c.beginPath(); c.arc(hx, hy, rT + Math.max(0, rem) * 150, 0, TAU); c.stroke(); }
        c.restore();
        label(c, assist >= 2 ? 'Tap GUARD!' : 'Tap GUARD when the rings meet!', Wd / 2, Hd * .64, 16, '#FFFFFF', 'center');
        if (rem < .5 && rem > 0) K.speedLines(c, Wd, Hd, fx, fy, t, 'rgba(255,111,216,.18)', 30);
      }
    }
    /* enemy panel */
    const pw = Math.min(Wd - 140, 260), px = Wd - pw - 12;
    glass(c, px, 62, pw, 54);
    label(c, b.name, px + 14, 80, 15, '#FFFFFF', 'left', 'D');
    c.save(); E.rr(c, px + 14, 94, pw - 28, 10, 5); c.fillStyle = 'rgba(0,0,0,.45)'; c.fill(); c.beginPath(); c.rect(px + 15, 95, (pw - 30) * b.hp / b.max, 8); c.clip(); c.fillStyle = b.boss ? '#FF6FD8' : '#FF6FB0'; c.shadowColor = '#FF6FB0'; c.shadowBlur = 10; c.fillRect(px, 94, pw, 10); c.restore();
    if (b.boss) for (let i = 1; i < 3; i++) { c.fillStyle = '#FFFFFF'; c.fillRect(px + 14 + (pw - 28) * i / 3 - 1, 92, 2, 14); }
    const wk = S.weakTo(b.el); c.save(); E.rr(c, px + pw - 128, 120, 128, 24, 12); c.fillStyle = S.EL[wk].soft; c.fill(); c.strokeStyle = S.EL[wk].col; c.lineWidth = 2; c.stroke(); c.restore();
    label(c, `Weak to ${S.EL[wk].name.toUpperCase()}`, px + pw - 64, 132, 12, '#FFFFFF');
    /* hero status */
    const sy = Hd * .575;
    glass(c, 10, sy - 18, Math.min(Wd - 20, 360), 40);
    drawHearts(c, 28, sy + 2);
    drawMeter(c, Math.min(Wd - 20, 360) - 150, sy, 140);
    if (b.state === 'cutin') K.cutin(c, Wd, Hd, b.tm / 1.8, L, S.SPECIAL[p.hero], S.EL[comp.el].col, t);
    if (b.state === 'specAtk' && b.tm < .8) { c.save(); c.globalAlpha = Math.max(0, .9 - b.tm * 1.4); c.fillStyle = '#FFFFFF'; c.fillRect(0, 0, Wd, Hd); c.restore(); K.speedLines(c, Wd, Hd, Wd * .66, Hd * .3, t, 'rgba(255,255,255,.6)', 80); }
    if (b.state === 'intro') { const a = Math.min(1, b.tm * 3) * Math.min(1, (1.5 - b.tm) * 3); c.save(); c.globalAlpha = a; label(c, b.boss ? 'GUARDIAN BATTLE' : 'A shadow appears!', Wd / 2, Hd * .5, Math.min(28, Wd / 13), '#FFFFFF', 'center', 'D'); c.restore(); }
  }
  function drawTrans(c, k, into) {
    const n = 7, h = Hd / n;
    c.save();
    for (let i = 0; i < n; i++) { const d = clamp(k * 1.6 - i * .06, 0, 1), w = Wd * 1.4 * (into ? d : 1 - d); c.fillStyle = i % 2 ? '#0E1446' : '#7FF0FF'; c.beginPath(); const x0 = i % 2 ? Wd - w : -Wd * .2; c.moveTo(x0, i * h); c.lineTo(x0 + w, i * h); c.lineTo(x0 + w - 30, (i + 1) * h); c.lineTo(x0 - 30, (i + 1) * h); c.closePath(); c.fill(); }
    if (into && k > .55) { c.globalAlpha = clamp((k - .55) * 4, 0, 1); c.fillStyle = '#0E1446'; c.fillRect(0, 0, Wd, Hd); }
    c.restore();
  }

  return {
    onStart() { api.ctrl(exploreCtrl()); banner(Q.name, Q.story.length < 60 ? Q.story : Q.obj, 2.2, '#FFC6DD'); say(Q.story); },
    resize(w, h) { Wd = w; Hd = h; s = Math.min(h / 700, w / 380); gy = h * .64; },
    update(dt) {
      g.t += dt; parts.update(dt);
      if (g.banner) { g.banner.t += dt; if (g.banner.t > g.banner.dur) g.banner = null; }
      for (const n of g.nums) n.t += dt; g.nums = g.nums.filter(n => n.t < 1.1);
      g.shake *= Math.exp(-dt * 8);
      if (g.mode === 'explore') updateExplore(dt);
      else if (g.mode === 'trans') { g.trans += dt; if (g.trans > .75) { g.mode = 'battle'; b = newBattle(g.pending); api.ctrl(''); if (b.boss) say('Guardian battle! Purify Hanamori!'); else say(`${b.name}! It is weak to ${S.EL[S.weakTo(b.el)].name}.`); } }
      else if (g.mode === 'battle' && b && !g.koWait) updateBattle(dt);
      else if (g.mode === 'trans2') { g.trans += dt; if (g.trans > .6) { g.mode = 'explore'; api.ctrl(exploreCtrl()); } }
      else if (g.mode === 'end') { g.endT += dt; g.heal = lerp(g.heal, g.healTo, 1 - Math.exp(-dt * 1.5)); if (g.endT > .5 && Math.random() < .3) parts.burst(hero.x + (Math.random() - .5) * 400, hero.y - 200 - Math.random() * 200, 4, {speed:80, life:1.2, size:3, color:['#FFC6DD', '#FFE27A', '#9BF6FF'], shape:'star', g:60}); if (g.endT > 3.6) { g.mode = 'done'; result(true); } }
      else if (g.mode === 'lose') { g.endT += dt; if (g.endT > 2.6) { g.mode = 'done'; result(false); } }
      if (g.mode === 'explore' || g.mode === 'end') camUpdate(dt);
    },
    draw(c, w, h, t) {
      c.save();
      if (g.shake > .5) c.translate((Math.random() - .5) * g.shake, (Math.random() - .5) * g.shake);
      if (g.mode === 'battle' && b) drawBattle(c, t);
      else if (g.mode === 'trans') { drawExplore(c, t); drawTrans(c, g.trans / .75, true); }
      else if (g.mode === 'trans2') { drawExplore(c, t); drawTrans(c, g.trans / .6, false); }
      else if (g.mode === 'end' && b && b.boss) drawBattle(c, t);
      else drawExplore(c, t);
      if (g.mode === 'battle' || (b && b.boss)) parts.draw(c);
      drawNums(c);
      c.restore();
      drawBanner(c);
    },
    pointer() {},
    setControl(k, down) {
      if (k === 'left' || k === 'right') { ctl[k] = down && g.mode === 'explore'; return; }
      if (k === 'jump') { if (down) { if (g.mode === 'explore') hero.buf = .14; else if (b && b.state === 'wind') guardTap(); } return; }
      if (k === 'guard') { if (down) guardTap(); return; }
      if (/^k[1-4]$/.test(k) && down) { const els = document.querySelectorAll('#choose [data-gp]:not(.sq-leave)'); const el = els[Number(k[1]) - 1] || (els.length === 1 ? els[0] : null); if (el && !el.disabled) el.click(); }
      if (k === 'k0' && down) { const el = document.querySelector('#choose .special'); if (el) el.click(); }
    },
    ui(act, v) {
      if (act === 'ans') { const n = Number(v); if (g.mode === 'lock') answerLock(n); else if (b) answerBattle(n); }
      if (act === 'move') uiMove(v);
      if (act === 'leave' && lock) { const ch = lock.ref; lock = null; api.panel(null); api.ctrl(exploreCtrl()); g.mode = 'explore'; hero.x = ch.x - 60; }
    },
    /* the knock-out revive (shared refill overlay): each right answer gives a heart back */
    level() { return g.hearts / g.maxH; },
    refill() { g.hearts = Math.min(g.maxH, g.hearts + 1); },
    refillTarget() { return g.hearts >= Math.min(3, g.maxH); },
    resumeFromRefill() {
      g.koWait = false; hero.inv = 1.5;
      if (g.mode === 'battle' && b) { api.ctrl(''); toPick(); }
      else if (g.mode === 'explore') api.ctrl(exploreCtrl());
    },
    onStop() {},
    xpEarned: () => g.xp,
    _debug: () => ({g, hero, W, get b() { return b; }, get lock() { return lock; }}),
  };
};
})();
