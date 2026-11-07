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
/* the Sky shrine's special: every guardian you defeated attacks with you, and you get a heart back */
S.SPECIAL2 = 'GUARDIAN CALL';
S.STYLE = ['Sword: every hit strikes twice', 'Staff: extra damage on weak spots', 'Bow: lucky critical hits'];
/* The hero is called whatever the kid types; blank means the kid's own name. */
S.heroName = p => ((p.sky && p.sky.name) || '').trim() || p.name;
/* Move strength: a harder question powers a stronger hit. d = how many math steps above the kid's level. */
S.TIERS = [
  {k:'light', name:'Light', stars:1, d:-1, mult:.65, xp:6, what:'Easier question, small hit'},
  {k:'strong', name:'Strong', stars:2, d:0, mult:1, xp:10, what:'Your level, solid hit'},
  {k:'mega', name:'Mega', stars:3, d:1, mult:1.9, xp:16, what:'Harder question, huge hit'},
];
/* A question d steps from the kid's level; past the top of their math world it borrows the next world's first steps. */
S.question = function (p, d, n) {
  const LV = PUM.LEVELS, sh = PUM.util.shuffle;
  let world = p.world, tier = ((p.levels[world] || {tier:0}).tier) + d;
  const max = PUM.maxTier(world);
  if (tier > max) { const i = LV.findIndex(l => l.id === world); if (i >= 0 && i < LV.length - 1) { world = LV[i + 1].id; tier = Math.min(PUM.maxTier(world), tier - max - 1); } else tier = max; }
  tier = Math.max(0, tier);
  let q, g = 0;
  do { q = PUM.gen(world, tier, p.theme); } while (q.kind === 'group' && g++ < 10);
  if (q.kind === 'group') return PUM.gateQuestion(p, n);
  const opts = [q.ans, ...sh(q.choices.filter(c => c !== q.ans))].slice(0, n);
  while (opts.length < n) { const c = q.ans + opts.length + 1; if (!opts.includes(c)) opts.push(c); }
  return {q, options:sh(opts)};
};

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
S.isGuardian = k => !!(K.SPIRITS[k] && K.SPIRITS[k].guardian);
S.activeComp = p => { const k = p.sky.comps[p.sky.comp] ? p.sky.comp : Object.keys(p.sky.comps)[0] || 'petal'; const c = p.sky.comps[k] || {lv:1}; return {kind:k, lv:c.lv, stage:S.isGuardian(k) ? 3 : S.stage(c.lv), el:K.SPIRITS[k].el, name:S.compName(k, c)}; };

/* ---------- Sky Village ---------- */
S.BUILD = [
  {k:'dojo', name:'Training dojo', cost:0, what:'Practice 10 quick questions for crystals and XP.'},
  {k:'garden', name:'Spirit garden', cost:20, what:'Feed snacks to your spirits so they level up and evolve.'},
  {k:'forge', name:'Forge', cost:30, what:'Upgrade your weapon, charm and boots.'},
  {k:'spring', name:'Healing spring', cost:40, what:'Start every quest with one extra heart.'},
  {k:'tower', name:'Lantern tower', cost:50, what:'Lights up secret paths on the islands.'},
  {k:'shrine', name:'Sky shrine', cost:0, guardians:2, what:'Unlocks your second special move. Defeat 2 guardians to open it.'},
];

/* ---------- the three islands: five quests each, the fifth is the island's guardian ---------- */
S.ISLANDS = [
  {k:'blossom', name:'Blossom Isle', guardian:'hanamori', col:'#FF7FB5'},
  {k:'tide', name:'Tide Grotto', guardian:'umikaze', col:'#46C8FF'},
  {k:'ember', name:'Ember Peak', guardian:'homura', col:'#FF9A3D'},
];
S.isleOf = qi => clamp(Math.floor(qi / 5), 0, S.ISLANDS.length - 1);
/* Guardians: boss battles in three phases. Each one joins your team and teaches a new move. */
S.GUARDIANS = {
  hanamori:{name:'Hanamori', title:'the Blossom Deer', el:'blossom', hp:240, isle:0, teach:'double', goal:'grove',
    phases:[{name:'Tail Sweep', hits:[1.3]}, {name:'Petal Storm', hits:[1.2, 1.9]}, {name:'Antler Charge', hits:[.95]}]},
  umikaze:{name:'Umikaze', title:'the Tide Dragon', el:'tide', hp:330, isle:1, teach:'dash', goal:'lair',
    phases:[{name:'Tail Splash', hits:[1.2]}, {name:'Whirlpool', hits:[1.1, 1.8]}, {name:'Tidal Dive', hits:[.9, 1.5]}]},
  homura:{name:'Homura', title:'the Flame Fox', el:'ember', hp:420, isle:2, teach:'glide', goal:'summit',
    phases:[{name:'Fox Fire', hits:[1.1, 1.7]}, {name:'Ember Rain', hits:[1, 1.5, 2]}, {name:'Blazing Dash', hits:[.85, 1.4]}]},
};
S.MOVE_INFO = {double:{name:'Double jump', how:'Tap Jump again in the air'}, dash:{name:'Dash', how:'Tap Dash to zoom across long gaps'}, glide:{name:'Glide', how:'Hold Glide in the air to float down slowly'}};

/* ---------- shadow foes ---------- */
const FOES = {
  petal:{el:'blossom', name:'Petal Wisp', hp:70},
  puddle:{el:'tide', name:'Puddle Wisp', hp:70},
  cinder:{el:'ember', name:'Cinder Wisp', hp:74},
  thorn:{el:'blossom', name:'Thorn Shade', hp:110, big:true},
  surge:{el:'tide', name:'Surge Shade', hp:110, big:true},
  /* Tide Grotto */
  jelly:{el:'tide', name:'Jelly Wisp', hp:80, look:'jelly'},
  coral:{el:'blossom', name:'Coral Wisp', hp:80, look:'coral'},
  steam:{el:'ember', name:'Steam Wisp', hp:84, look:'steam'},
  reef:{el:'blossom', name:'Reef Shade', hp:122, big:true, look:'coral'},
  abyss:{el:'tide', name:'Abyss Shade', hp:128, big:true, look:'jelly'},
  /* Ember Peak */
  ash:{el:'ember', name:'Ash Wisp', hp:88, look:'ash'},
  geyser:{el:'tide', name:'Geyser Wisp', hp:88, look:'steam'},
  bramble:{el:'blossom', name:'Bramble Shade', hp:132, big:true, look:'thorn'},
  magma:{el:'ember', name:'Magma Shade', hp:138, big:true, look:'magma'},
};
S.FOES = FOES;
/* foes get tougher quest by quest */
S.foeScale = qi => 1 + .15 * Math.min(qi, 4) + .08 * Math.max(0, qi - 4);
S.QUESTS = [
  {name:'The Lost Cubs', rec:1, goal:'cage', story:'Shadow wisps have trapped the blossom cubs. Find them and set them free!', obj:'Free the cubs',
    foes:['petal'], route:[['flat', 360], ['foe', 'petal'], ['gap', 100], ['flat', 260], ['chest', 'snack'], ['up', 60], ['flat', 220], ['gap', 110], ['down', 60], ['flat', 260], ['foe', 'petal'], ['secret'], ['flat', 160], ['goal']]},
  {name:'Lantern Path', rec:2, goal:'lanterns', story:'Light the three shrine lanterns so lost spirits can find their way home.', obj:'Light the lanterns',
    foes:['puddle', 'petal'], route:[['flat', 300], ['lantern'], ['hop', 2], ['flat', 200], ['foe', 'puddle'], ['lantern'], ['gate'], ['up', 70], ['flat', 220], ['gap', 110], ['chest', 'snack'], ['down', 70], ['foe', 'petal'], ['lantern'], ['secret'], ['goal']]},
  {name:'The Silent Bell', rec:3, goal:'bell', story:'Climb to the hilltop and ring the old bell to wake the island up.', obj:'Ring the bell',
    foes:['cinder', 'thorn'], route:[['flat', 300], ['up', 70], ['flat', 180], ['up', 80], ['foe', 'cinder'], ['hop', 3], ['chest', 'snack'], ['up', 60], ['gate'], ['flat', 200], ['foe', 'thorn'], ['gap', 110], ['secret'], ['goal']]},
  {name:'Sakura Falls', rec:4, goal:'falls', story:'Chase the shadows from the river so the waterfall can flow again.', obj:'Restore the falls',
    foes:['puddle', 'cinder', 'surge'], route:[['flat', 300], ['foe', 'puddle'], ['gap', 110], ['flat', 160], ['hop', 2], ['foe', 'cinder'], ['chest', 'snack'], ['down', 60], ['gate'], ['flat', 200], ['up', 80], ['foe', 'surge'], ['secret'], ['goal']]},
  {name:'Hanamori', rec:5, goal:'grove', boss:true, story:'Hanamori, the Blossom Deer, has been taken over by shadow. Defeat the guardian!', obj:'Reach the grove',
    foes:['hanamori'], route:[['flat', 380], ['chest', 'snack'], ['gap', 110], ['flat', 260], ['foe', 'petal'], ['flat', 120], ['goal']]},
  /* ---- Tide Grotto: sea caves, tide pools and glowing jellyfish. 'secret' ledges need double jump;
     a 'cliff' is a high ledge with a far-away secret island that needs dash or glide. ---- */
  {name:'Pearl of the Grotto', rec:5, goal:'pearl', story:'Shadows hid the great pearl of the sea caves. Find the giant shell and wake the pearl!', obj:'Find the pearl',
    foes:['jelly', 'coral'], route:[['flat', 340], ['foe', 'jelly'], ['gap', 120], ['flat', 240], ['chest', 'snack'], ['up', 70], ['flat', 200], ['hop', 2], ['foe', 'coral'], ['down', 70], ['flat', 220], ['gap', 130], ['flat', 160], ['secret'], ['foe', 'jelly'], ['flat', 200], ['goal']]},
  {name:'Jelly Lights', rec:6, goal:'jellies', story:'The glowing jellyfish fell asleep. Wake all three so the dark tunnel shines again!', obj:'Wake the jellies',
    foes:['steam', 'jelly', 'coral'], route:[['flat', 300], ['lantern'], ['hop', 3], ['foe', 'steam'], ['lantern'], ['gate'], ['up', 80], ['flat', 200], ['gap', 130], ['chest', 'snack'], ['down', 80], ['foe', 'coral'], ['flat', 180], ['lantern'], ['secret'], ['foe', 'jelly'], ['goal']]},
  {name:'Coral Garden', rec:7, goal:'coral', story:'Shadow ink covered the coral garden. Chase it away so the coral can bloom!', obj:'Save the coral',
    foes:['coral', 'steam', 'reef'], route:[['flat', 300], ['foe', 'coral'], ['gap', 130], ['flat', 200], ['up', 90], ['up', 90], ['up', 90], ['up', 90], ['cliff', 'dash'], ['foe', 'steam'], ['hop', 3], ['chest', 'snack'], ['gate'], ['flat', 200], ['foe', 'reef'], ['secret'], ['goal']]},
  {name:'The Sleepy Turtle', rec:8, goal:'turtle', story:'A giant sea turtle is stuck in shadow vines. Free it so it can carry you to the dragon!', obj:'Free the turtle',
    foes:['jelly', 'steam', 'abyss', 'reef'], route:[['flat', 300], ['foe', 'jelly'], ['hop', 3], ['flat', 160], ['up', 80], ['foe', 'steam'], ['gap', 140], ['chest', 'snack'], ['down', 80], ['gate'], ['flat', 200], ['foe', 'abyss'], ['up', 90], ['up', 90], ['up', 90], ['up', 90], ['cliff', 'glide'], ['hop', 2], ['foe', 'reef'], ['secret'], ['flat', 200], ['goal']]},
  {name:'Umikaze', rec:9, goal:'lair', boss:true, story:'Umikaze, the Tide Dragon, has been taken over by shadow. Defeat the guardian!', obj:'Reach the dragon\'s cave',
    foes:['umikaze', 'jelly', 'coral'], route:[['flat', 360], ['chest', 'snack'], ['gap', 130], ['flat', 240], ['foe', 'jelly'], ['hop', 2], ['flat', 160], ['foe', 'coral'], ['flat', 140], ['goal']]},
  /* ---- Ember Peak: volcano slopes, lava glow and torii on the cliffs. 'dash' gaps are too long to jump. ---- */
  {name:'Ash Trail', rec:10, goal:'spring', story:'Grey ash covered the hot spring. Clear the trail so the warm water can bubble again!', obj:'Wake the hot spring',
    foes:['ash', 'geyser'], route:[['flat', 320], ['foe', 'ash'], ['dash', 330], ['flat', 240], ['chest', 'snack'], ['up', 80], ['flat', 200], ['foe', 'geyser'], ['gap', 140], ['flat', 160], ['hop', 2], ['down', 80], ['flat', 200], ['secret'], ['foe', 'ash'], ['flat', 200], ['goal']]},
  {name:'Fire Bowls', rec:11, goal:'bowls', story:'Light the three fire bowls on the cliff path so travellers can find the way up.', obj:'Light the fire bowls',
    foes:['geyser', 'ash', 'bramble'], route:[['flat', 300], ['lantern'], ['up', 80], ['flat', 160], ['foe', 'geyser'], ['dash', 340], ['lantern'], ['gate'], ['hop', 3], ['foe', 'bramble'], ['up', 80], ['flat', 200], ['chest', 'snack'], ['dash', 340], ['down', 80], ['lantern'], ['foe', 'ash'], ['secret'], ['goal']]},
  {name:'The Great Drum', rec:12, goal:'drum', story:'Climb the high cliffs and beat the great drum to wake the mountain up!', obj:'Beat the drum',
    foes:['ash', 'geyser', 'magma'], route:[['flat', 300], ['foe', 'ash'], ['up', 90], ['up', 90], ['foe', 'geyser'], ['up', 90], ['up', 90], ['cliff', 'glide'], ['dash', 340], ['chest', 'snack'], ['foe', 'magma'], ['hop', 3], ['gate'], ['secret'], ['flat', 200], ['goal']]},
  {name:'Lava River', rec:13, goal:'flame', story:'The sacred flame on the peak went dark. Cross the lava river and light it again!', obj:'Light the sacred flame',
    foes:['cinder', 'bramble', 'magma', 'ash'], route:[['flat', 300], ['foe', 'cinder'], ['dash', 350], ['flat', 200], ['hop', 3], ['foe', 'bramble'], ['up', 80], ['flat', 160], ['dash', 350], ['chest', 'snack'], ['gate'], ['down', 80], ['foe', 'magma'], ['gap', 140], ['flat', 160], ['dash', 350], ['foe', 'ash'], ['secret'], ['flat', 200], ['goal']]},
  {name:'Homura', rec:14, goal:'summit', boss:true, story:'Homura, the Flame Fox, has been taken over by shadow. Defeat the last guardian!', obj:'Reach the summit',
    foes:['homura', 'ash', 'magma'], route:[['flat', 360], ['chest', 'snack'], ['dash', 340], ['flat', 240], ['foe', 'ash'], ['up', 80], ['flat', 160], ['hop', 2], ['foe', 'magma'], ['flat', 160], ['goal']]},
];
S.QUESTS.forEach((Q, i) => { Q.isle = S.isleOf(i); });
S.ACTIVE = S.QUESTS.length;
/* quests cleared: all of them, or on one island */
S.cleared = (p, isle) => { const st = p.prog.anime.stars; return (isle == null ? st.slice(0, S.ACTIVE) : st.slice(isle * 5, isle * 5 + 5)).filter(Boolean).length; };
/* how healed an island is, 0..1 (or the whole sky with no island given) */
S.heal = (p, isle) => isle == null ? S.cleared(p) / S.ACTIVE : S.cleared(p, isle) / 5;
S.guardians = p => S.ISLANDS.filter((I, k) => p.prog.anime.stars[k * 5 + 4]).length;
S.isleOpen = (p, k) => k === 0 || p.prog.anime.unlocked >= k * 5;
S.curIsle = p => S.isleOf(Math.min(p.prog.anime.unlocked, S.ACTIVE - 1));

/* ---------- save data ---------- */
const OLD_UPS = ['hearts', 'attack', 'energy', 'agility', 'shield'];
S.normalize = function (raw, p) {
  const num = v => Number.isFinite(+v) ? +v : 0, x = (raw && typeof raw === 'object') ? raw : {};
  const comps = {};
  if (x.comps && typeof x.comps === 'object') for (const k of Object.keys(K.SPIRITS)) { const c = x.comps[k]; if (c && typeof c === 'object') comps[k] = {lv:clamp(num(c.lv) || 1, 1, 15), name:String(c.name || '').slice(0, 14)}; }
  const b = (x.b && typeof x.b === 'object') ? x.b : {};
  const mv = (x.moves && typeof x.moves === 'object') ? x.moves : {};
  return {v:num(x.v), made:!!x.made, name:String(x.name || '').trim().slice(0, 16), hair:K.HAIR[x.hair] ? x.hair : null, outfit:K.OUTFIT[x.outfit] ? x.outfit : null, xp:clamp(num(x.xp), 0, 1e6),
    comp:K.SPIRITS[x.comp] ? x.comp : null, comps, snacks:clamp(num(x.snacks), 0, 99),
    b:{garden:!!b.garden, forge:!!b.forge, spring:!!b.spring, tower:!!b.tower, shrine:!!b.shrine}, moves:{double:!!mv.double, dash:!!mv.dash, glide:!!mv.glide}};
};
/* Called by store.normalize. Sky Quest replaced the old runner: progress starts fresh once and
   old hero upgrades turn into crystals. */
S.migrate = function (p, rawUp) {
  /* Saves from when Blossom Isle was the only island stop at quest 5: open the next quest after the last one cleared. */
  const pa = p.prog.anime; while (pa.unlocked < S.ACTIVE - 1 && pa.stars[pa.unlocked]) pa.unlocked++;
  if (p.sky.v >= 1) return;
  const u = (rawUp && typeof rawUp === 'object') ? rawUp : {};
  let refund = 0;
  for (const k of OLD_UPS) { const l = clamp(Number(u[k]) || 0, 0, 5); for (let i = 0; i < l; i++) refund += PUM.CAMPAIGN.cost[i]; }
  const pr = p.prog.anime; for (let i = 0; i < pr.stars.length; i++) refund += pr.stars[i] ? 2 : 0;
  p.prog.anime = {unlocked:0, stars:pr.stars.map(() => 0), plays:pr.plays};
  p.coins.anime += refund;
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
    case 'chime': [1047, 1319, 1568, 2093].forEach((f, i) => A.tone(f, i * .09, .35, 'sine', .06)); return;
    case 'shatter': A.noise(.5, .2, 4000); A.tone(1800, 0, .3, 'square', .04, 400); return;
    case 'dash': A.noise(.22, .12, 2600); A.tone(440, 0, .18, 'triangle', .05, 1100); return;
    case 'glide': A.tone(660, 0, .35, 'sine', .035, 880); return;
  }
  sfx0(k);
};

/* ---------- avatars in menus: anime portraits ---------- */
PUM.heroSVG = (idx, shirt) => K.portraitImg(K.look(idx, null, null, shirt));
const av0 = PUM.avatarSVG;
PUM.avatarSVG = p => p.theme === 'anime' ? K.portraitImg(p.sky ? K.lookOf(p) : K.look(p.hero, null, null, p.color)) : av0(p);

/* ---------- island builder ---------- */
/* opts.dash: the hero knows dash. Without it, a long 'dash' gap gets a spirit stepping stone. */
function build(Q, opts = {}) {
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
    else if (kind === 'secret') { ground(460); const top = h - 240; W.blocks.push({x:x + 150, w:170, top, plat:true, secret:true, need:'double'}); W.secrets.push({x:x + 235, y:top, h, need:'double', mx:x + 235, my:h - 150}); for (let i = 0; i < 3; i++) W.crystals.push({x:x + 185 + i * 50, y:top - 44, got:false, v:3, big:true}); W.chests.push({x:x + 235, y:top, open:false, gift:'secret'}); x += 460; }
    else if (kind === 'dash') {
      W.gaps.push({x, w:arg, h, dash:true});
      for (let i = 0; i < 5; i++) W.crystals.push({x:x + arg * (i + 1) / 6, y:h - 150 - Math.sin((i + 1) / 6 * Math.PI) * 40, got:false, v:1});
      if (!opts.dash) W.blocks.push({x:x + arg / 2 - 55, w:110, top:h - 30, plat:true, step:true});
      x += arg;
    }
    else if (kind === 'cliff') {
      /* a high ledge, then a big drop to the path below. Far out at ledge height floats a secret island:
         too far for double jump, so it needs dash (or glide, which floats even farther). */
      const need = arg === 'glide' ? 'glide' : 'dash', hi = h;
      ground(240); x += 240;
      const edge = x, D = need === 'glide' ? 600 : 390, IW = need === 'glide' ? 220 : 170, top = need === 'glide' ? hi + 50 : hi - 10;
      h += 360; ground(D + 380);
      W.blocks.push({x:edge + D, w:IW, top, plat:true, secret:true, need});
      W.secrets.push({x:edge + D + IW / 2, y:top, h, need, mx:edge - 40, my:hi - 150});
      for (let i = 1; i <= 6; i++) { const k = i / 7; W.crystals.push({x:edge + D * k, y:lerp(hi, top, k) - 120 + Math.sin(k * Math.PI) * -40, got:false, v:1}); }
      for (let i = 0; i < 2; i++) W.crystals.push({x:edge + D + IW / 2 - 30 + i * 60, y:top - 44, got:false, v:3, big:true});
      W.chests.push({x:edge + D + IW / 2, y:top, open:false, gift:'secret'});
      row(edge + D + 240, 300, h - 46, 3);
      x += D + 380;
    }
    else if (kind === 'goal') { ground(640); W.goal = {x:x + 330, y:h, kind:Q.goal, done:false}; x += 640; }
  }
  W.len = x;
  return W;
}
S.build = build;

/* ---------- the quest game ---------- */
PUM.games.sky = function (o) {
  const p = o.player, assist = o.assist, qi = o.levelIndex, api = o.api, Q = S.QUESTS[qi], isle = Q.isle || 0;
  const L = K.lookOf(p), st = S.stats(p), comp = S.activeComp(p), age = p.age, mira = p.hero === 1;
  const mv = p.sky.moves, double = mv.double, dash = mv.dash, glide = mv.glide, tower = p.sky.b.tower, shrine = p.sky.b.shrine;
  const known = need => !need || !!mv[need];
  const W = build(Q, {dash});
  const parts = E.Particles();
  const hero = {x:90, y:0, vx:0, vy:0, ground:true, face:1, run:0, coyote:0, buf:0, used2:false, inv:0, safe:{x:90, y:0}, dashT:0, dashQ:0, dashCd:0, usedDash:false, gliding:false};
  const g = {tier:1, mode:'explore', t:0, hearts:st.hearts, maxH:st.hearts, meter:0, revived:false, lost:0, right:0, asked:0, snacks:0, crystals:0, beaten:0,
    shake:0, banner:null, nums:[], trans:0, heal:S.heal(p, isle), healTo:S.heal(p, isle), camX:0, camY:0, comp:{x:40, y:-110}, endT:0, lit:0, xp:0, dashes:0, glides:0};
  const ctl = {left:false, right:false, glide:false};
  let Wd = 360, Hd = 640, s = 1, gy = 400, b = null, lock = null;
  const SPEED = 250 * (1 + .06 * st.boots), JV = -880 * (1 + .025 * st.boots), JV2 = -700, GRAV = 2300, HW = 14;
  const DASH_V = 680, DASH_T = .24, GLIDE_FALL = 140;
  const say = t => { if (p.speak) A.say(t); };
  const banner = (text, sub, dur = 1.6, col) => { g.banner = {text, sub, t:0, dur, col}; };
  const num = (x, y, text, col, big) => g.nums.push({x, y, text, col, big, t:0});
  const moveCtrl = () => dash || glide ? `<span class="ctl-col sq-acts">${glide ? `<button class="ctl sq mini glide" data-ctl="glide" aria-label="Glide: hold in the air">${PUM.icon('down')}<span>Glide</span></button>` : ''}${dash ? `<button class="ctl sq mini dash" data-ctl="dash" aria-label="Dash">${PUM.icon('next')}<span>Dash</span></button>` : ''}</span>` : '';
  const exploreCtrl = () => `<span class="ctl-pair"><button class="ctl sq move" data-ctl="left" aria-label="Move left">${PUM.icon('back')}</button><button class="ctl sq move" data-ctl="right" aria-label="Move right">${PUM.icon('next')}</button></span><span class="ctl-pair">${moveCtrl()}<button class="ctl sq jump" data-ctl="jump" aria-label="Jump">${PUM.icon('up')}<span>Jump</span></button></span>`;
  const LIT = {lanterns:1, jellies:1, bowls:1};
  const objText = () => LIT[Q.goal] ? `${Q.obj} ${g.lit} / ${W.lanterns.length}` : Q.obj;
  const litName = isle === 1 ? ['Jellyfish awake!', 'Wake every jellyfish first'] : isle === 2 ? ['Fire bowl lit!', 'Light every fire bowl first'] : ['Lantern lit!', 'Light every lantern first'];
  const NEED_MSG = {double:'Too high! A guardian can teach you double jump.', dash:'Too far! A guardian can teach you dash.', glide:'Too far! A guardian can teach you glide.'};

  /* ---- explore ---- */
  function hurtFall() {
    hero.x = hero.safe.x; hero.y = hero.safe.y; hero.vx = 0; hero.vy = 0; hero.inv = 1.2; hero.dashT = 0; hero.usedDash = false; hero.gliding = false;
    if (assist >= 2) { banner('Whoops!', 'Try that jump again', 1); A.sfx('hurt'); return; }
    g.hearts--; g.lost++; A.sfx('hurt'); g.shake = 8;
    banner('Ouch!', g.hearts > 0 ? 'You lost a heart' : '', 1);
    if (g.hearts <= 0) knockedOut();
  }
  function updateExplore(dt) {
    const h = hero, dir = (ctl.right ? 1 : 0) - (ctl.left ? 1 : 0);
    /* glide: hold Glide while falling to float down slowly, drifting forward */
    const wasGliding = h.gliding;
    h.gliding = glide && ctl.glide && !h.ground && h.vy > -60 && h.dashT <= 0;
    if (h.gliding && !wasGliding) { A.sfx('glide'); g.glides++; }
    const target = dir * SPEED || (h.gliding ? h.face * SPEED * .3 : 0);
    h.vx += clamp(target - h.vx, -2000 * dt, 2000 * dt); if (dir) h.face = dir;
    if (h.buf > 0) {
      if (h.ground || h.coyote > 0) { h.vy = JV; h.ground = false; h.coyote = 0; h.buf = 0; A.sfx('jump'); }
      else if (double && !h.used2) { h.vy = JV2; h.used2 = true; h.buf = 0; h.dashT = 0; A.sfx('jump'); parts.burst(h.x, h.y, 10, {speed:140, life:.5, size:3, color:['#FFC6DD', '#7FF0FF'], g:200}); }
    }
    /* dash: a quick burst forward that ignores gravity. Once per jump; a short wait on the ground. */
    if (h.dashQ > 0 && dash && h.dashT <= 0 && h.dashCd <= 0 && !h.usedDash) {
      h.dashT = DASH_T; h.dashQ = 0; h.dashCd = .45; if (!h.ground) h.usedDash = true; g.dashes++;
      A.sfx('dash'); parts.burst(h.x - h.face * 10, h.y - 46, 14, {speed:200, angle:h.face > 0 ? Math.PI : 0, spread:1.2, life:.45, size:3.5, color:['#7FF0FF', '#FFFFFF', S.EL[comp.el].col], drag:3});
    }
    if (h.dashT > 0) {
      h.dashT -= dt; h.vx = h.face * DASH_V; h.vy = 0;
      if (Math.random() < .7) parts.add({x:h.x - h.face * 16, y:h.y - 30 - Math.random() * 40, vx:-h.face * 60, vy:0, life:.3, size:2.5 + Math.random() * 2, color:Math.random() < .5 ? '#BFF6FF' : S.EL[comp.el].col});
    }
    h.buf -= dt; h.coyote -= dt; h.inv -= dt; h.dashQ -= dt; h.dashCd -= dt;
    if (h.dashT <= 0) h.vy = Math.min(1400, h.vy + GRAV * dt);
    if (h.gliding) { h.vy = Math.min(h.vy, GLIDE_FALL); if (Math.random() < .25) parts.add({x:h.x + (Math.random() - .5) * 40, y:h.y - 90, vx:-h.face * 30, vy:40, life:.6, size:2.5, color:'#FFFFFF'}); }
    let nx = h.x + h.vx * dt;
    for (const bl of W.blocks) if (bl.ground && nx + HW > bl.x && nx - HW < bl.x + bl.w && h.y > bl.top + 3) { if (h.x <= bl.x) nx = bl.x - HW; else if (h.x >= bl.x + bl.w) nx = bl.x + bl.w + HW; h.vx = 0; }
    for (const gt of W.gates) if (!gt.solved && nx > gt.x - 46 && h.x <= gt.x - 45) { nx = gt.x - 46; h.vx = 0; if (!lock) openLock('gate', gt); }
    nx = clamp(nx, 20, W.len - 20);
    let ny = h.y + h.vy * dt, landed = null;
    if (h.vy >= 0) for (const bl of W.blocks) if (nx + HW * .7 > bl.x && nx - HW * .7 < bl.x + bl.w && h.y <= bl.top + .5 && ny >= bl.top) { if (!landed || bl.top < landed.top) landed = bl; }
    if (landed) { ny = landed.top; h.vy = 0; h.ground = true; h.coyote = .1; h.used2 = false; h.usedDash = false; h.gliding = false; if (landed.ground) h.safe = {x:clamp(nx, landed.x + 40, landed.x + landed.w - 40), y:landed.top}; }
    else { if (h.ground) h.coyote = .1; h.ground = false; }
    h.x = nx; h.y = ny; h.run += Math.abs(h.vx) * dt * .045;
    if (h.y > 560) hurtFall();
    /* pickups and things */
    for (const c of W.crystals) if (!c.got && Math.hypot(c.x - h.x, c.y - (h.y - 46)) < (c.big ? 42 : 34)) { c.got = true; api.addMp(c.v); g.crystals += c.v; A.sfx('coin'); parts.burst(c.x, c.y, 8, {speed:120, life:.5, size:3, color:['#9BF6FF', '#FFFFFF'], shape:'star'}); }
    for (const l of W.lanterns) if (!l.lit && Math.abs(l.x - h.x) < 40) { l.lit = true; g.lit++; A.sfx('chime'); parts.burst(l.x, l.y - 90, 18, {speed:160, life:.8, size:3, color:isle === 1 ? ['#FF8FD8', '#BFF6FF'] : isle === 2 ? ['#FF8A3D', '#FFE27A'] : ['#FFD27A', '#FFF1C2'], shape:'star'}); banner(litName[0], `${g.lit} of ${W.lanterns.length}`, 1.1); }
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
    hero.vx = 0; hero.dashT = 0; ctl.left = ctl.right = ctl.glide = false;
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
      } else { ref.solved = true; A.sfx('chime'); banner('The gate opens!', '', 1); }
    }, ok ? 900 : 1400);
  }

  /* ---- battles ---- */
  function startBattle(f) {
    hero.vx = 0; hero.dashT = 0; hero.gliding = false; ctl.left = ctl.right = ctl.glide = false;
    g.mode = 'trans'; g.trans = 0; g.pending = f; api.ctrl('');
    A.sfx(S.GUARDIANS[f.kind] ? 'boss' : 'blast');
  }
  const easy = assist >= 2 ? .7 : assist ? .85 : 1;
  function newBattle(f) {
    const GD = S.GUARDIANS[f.kind];
    if (GD) { const hp = Math.round(GD.hp * easy); return {f, boss:true, guard:f.kind, el:GD.el, name:GD.name, hp, max:hp, phase:0, phases:GD.phases, shield:null, pure:0, x:0, state:'intro', tm:0}; }
    const F = FOES[f.kind], hp = Math.round(F.hp * S.foeScale(qi) * easy);
    return {f, el:F.el, name:F.name, hp, max:hp, big:F.big, look:F.look, state:'intro', tm:0, x:0, seed:Math.round(f.x)};
  }
  function setState(s2) { b.state = s2; b.tm = 0; }
  function moveName(el) { return S.MOVES[el][p.hero] || S.MOVES[el][0]; }
  const specBtns = sub => `<button class="sq-move special" data-gp="move" data-v="special"><b>${S.SPECIAL[p.hero]}</b><small>${sub}</small></button>${shrine ? `<button class="sq-move special two" data-gp="move" data-v="special2"><b>${S.SPECIAL2}</b><small>Your guardians attack, and you get a heart back</small></button>` : ''}`;
  function moveBtns() {
    const els = ['blossom', 'tide', 'ember'].concat(st.storm ? ['storm'] : []);
    const spec = g.meter >= 1 ? specBtns('Special move ready!') : '';
    const tiers = `<div class="sq-tiers" role="group" aria-label="Move strength">${S.TIERS.map((T, i) => `<button class="sq-tier ${g.tier === i ? 'on' : ''}" data-gp="tier" data-v="${i}" aria-pressed="${g.tier === i}"><b>${T.name} ${'&#9733;'.repeat(T.stars)}</b><small>${T.what}</small></button>`).join('')}</div>`;
    return `<div class="sq-card moves"><div class="sq-title">${g.meter >= 1 ? 'Your Spirit meter is full!' : 'Pick how strong, then a move'}</div>${spec}${tiers}<div class="sq-moves n${els.length}">${els.map((el, i) => `<button class="sq-move el-${el}" data-gp="move" data-v="${el}"><small>${S.EL[el].name}</small><b>${moveName(el)}</b><i>${i + 1}</i></button>`).join('')}</div></div>`;
  }
  function toPick() {
    if (b.boss && b.shield) { toAsk('shield'); return; }
    if (assist >= 2) {
      if (g.meter >= 1) { api.panel(`<div class="sq-card moves"><div class="sq-title">Your Spirit meter is full!</div>${specBtns('Tap for your special move!')}</div>`, 'sky-q'); setState('pick'); say('Special move ready! Tap it!'); return; }
      toAsk(S.weakTo(b.el)); return;
    }
    api.panel(moveBtns(), 'sky-q'); setState('pick');
  }
  function toAsk(move) {
    b.move = move;
    const T = move === 'shield' || assist >= 2 ? S.TIERS[1] : S.TIERS[g.tier]; b.tierUsed = T;
    const {q, options} = move === 'shield' ? PUM.gateQuestion(p, nOpts()) : S.question(p, T.d, nOpts());
    b.q = q; b.opts = options; b.answered = false; b.askT = 0;
    b.crit = age >= 10 ? 5 : age >= 8 ? 7 : 0; if (b.crit && T.k === 'mega') b.crit += 3;
    const title = move === 'shield' ? `Break the shadow shield! ${b.shield.got} of 3` : `${assist >= 2 ? '' : T.name + ' '}${moveName(move)}: answer to power it up`;
    const bar = b.crit && move !== 'shield' ? `<div class="sq-crit"><i style="animation-duration:${b.crit}s"></i><span>Quick answer = critical hit!</span></div>` : '';
    api.panel(qPanel(title, q, options, null, bar), 'sky-q'); say(q.spoken);
    setState('ask');
  }
  function answerBattle(v) {
    if (b.state !== 'ask' || b.answered) return;
    const ok = v === b.q.ans; b.answered = true;
    g.asked++; api.answer(ok, b.q);
    const crit = ok && b.crit && b.askT <= b.crit && b.move !== 'shield';
    if (ok) { g.right++; g.xp += (b.tierUsed ? b.tierUsed.xp : 10) + (crit ? 5 : 0); }
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
    if (b.boss && !b.finale && b.hp - dmg <= 0 && !/^special/.test(b.move)) { dmg = b.hp - 1; }
    b.hp = Math.max(0, b.hp - dmg); b.flash = 1; b.x = 18;
    num(fx + (Math.random() - .5) * 60, fy - 40, String(dmg), col, big);
    parts.burst(fx, fy, big ? 46 : 22, {speed:big ? 420 : 260, life:.7, size:big ? 5 : 3.5, color:[col, '#FFFFFF'], shape:'star', drag:2});
    g.shake = Math.max(g.shake, big ? 16 : 6); A.sfx(big ? 'blast' : 'slash');
  }
  function afterHeroTurn() {
    if (b.hp <= 0) { setState('win'); A.sfx('chime'); banner('Defeated!', b.boss ? '' : `+3 crystals`, 1.6); if (!b.boss) { api.addMp(3); g.crystals += 3; } g.beaten++; return; }
    if (b.boss) {
      const th = b.phase === 0 ? .66 : b.phase === 1 ? .33 : -1;
      if (b.hp / b.max <= th) { b.hp = Math.ceil(th * b.max); b.shield = {got:0}; setState('shieldUp'); A.sfx('boss'); banner('Shadow shield!', '3 right answers in a row break it', 2); say('Shadow shield! Answer 3 in a row to break it!'); return; }
      if (b.phase === 2 && b.hp <= 1 && !b.finale) { b.finale = true; g.meter = 1; banner(`${b.name} is weak!`, 'Use your special move!', 1.8); say('Use your special move!'); }
    }
    enemyTurn();
  }
  /* Enemy attacks are blocked with math: answer before the timer runs out to raise your shield.
     The block question is one step easier than the kid's level, because there's a clock. */
  const blockTime = () => (age <= 5 ? 10 : age <= 7 ? 8 : age <= 9 ? 7 : 6) * (assist >= 2 ? 1.6 : assist ? 1.25 : 1);
  function enemyTurn() {
    const base = b.boss ? b.phases[b.phase].hits.slice() : [1.4];
    b.hits = base.map(t0 => ({t:t0 * .7 + .25, done:false, blocked:false}));
    b.windDur = b.hits[b.hits.length - 1].t + .8;
    b.atkName = b.boss ? b.phases[b.phase].name : 'attack';
    const {q, options} = S.question(p, -1, nOpts());
    b.q = q; b.opts = options; b.answered = false; b.blockLim = blockTime();
    const bar = `<div class="sq-crit block"><i style="animation-duration:${b.blockLim}s"></i><span>Answer before it hits!</span></div>`;
    api.ctrl(''); api.panel(qPanel(`${b.name} is attacking! Answer to block`, q, options, null, bar), 'sky-q'); say(q.spoken);
    setState('block');
    if (b.boss) banner(b.atkName, 'Answer to block it!', 1.1, '#FF6FD8');
  }
  function answerBlock(v) {
    if (b.state !== 'block' || b.answered) return;
    const timeUp = v == null, ok = !timeUp && v === b.q.ans; b.answered = true;
    if (!timeUp) { g.asked++; api.answer(ok, b.q); }
    const perfect = ok && b.tm <= b.blockLim * .4;
    if (ok) { g.right++; g.xp += 6; }
    api.panel(qPanel(ok ? (perfect ? 'PERFECT BLOCK!' : 'Shield up!') : timeUp ? `Too slow! It was ${b.q.ans}.` : `Not quite. It's ${b.q.ans}.`, b.q, b.opts, timeUp ? null : {picked:v}), 'sky-q');
    for (const h of b.hits) { h.blocked = ok; h.perfect = perfect; }
    setState('wind');
  }
  function enemyHit(h) {
    h.done = true; b.lunge = 1;
    const hx = Wd * .26, hy = Hd * .45;
    if (h.blocked) {
      A.sfx('block'); g.blockFx = 1; num(hx + 40, hy - 70, h.perfect ? 'PERFECT!' : 'BLOCK!', '#7FF0FF', true);
      if (h.perfect && !b.perfectGiven) { b.perfectGiven = true; g.meter = Math.min(1, g.meter + .1); }
      parts.burst(hx, hy, 16, {speed:200, life:.5, size:3, color:['#7FF0FF', '#FFFFFF']});
    } else {
      g.hurtFx = 1; g.shake = 14; A.sfx('hurt');
      if (!b.hurt) { b.hurt = true; g.hearts--; g.lost++; num(hx + 40, hy - 70, '-1', '#FF6FB0', true); if (g.hearts <= 0) { b.ko = true; } }
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
        if (b.shield.got >= 3) { b.shield = null; b.phase++; setState('shieldBreak'); banner('Shield broken!', `Phase ${b.phase + 1}: ${b.phases[b.phase].name}`, 1.8); g.shake = 18; }
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
      if (b.hitsLeft > 0 && b.tm > (p.hero === 0 ? (b.hitsLeft === 2 ? .3 : .55) : .35)) { b.hitsLeft--; hitFoe(damage(b.move, (p.hero === 0 ? .55 : 1) * (b.isCrit ? 1.35 : 1) * (b.tierUsed ? b.tierUsed.mult : 1)), col, b.isCrit || (b.tierUsed && b.tierUsed.k === 'mega')); }
      if (!b.compDone && b.tm > .95) { b.compDone = true; b.compFx = 1; hitFoe(Math.max(1, Math.round(st.atk * (.25 + .04 * comp.lv) * S.mult(comp.el, b.el))), S.EL[comp.el].col, false); }
      if (b.tm > 1.5) { b.compDone = false; afterHeroTurn(); }
    }
    else if (b.state === 'cutin' && b.tm > 1.8) { setState('specAtk'); }
    else if (b.state === 'specAtk') {
      if (!b.specHit && b.tm > .35) {
        b.specHit = true; b.move = b.spec || 'special';
        if (b.move === 'special2') {
          hitFoe(Math.round(st.atk * (2.2 + .8 * S.guardians(p))), '#FFE27A', true);
          if (g.hearts < g.maxH) { g.hearts++; num(Wd * .26 + 40, Hd * .45 - 70, '+1', '#FF6FB0', true); }
        } else hitFoe(Math.round(st.atk * 3.2), '#E9FDFF', true);
        g.shake = 26;
      }
      if (b.tm > 1.4) { b.specHit = false; afterHeroTurn(); }
    }
    else if (b.state === 'block') { if (b.tm > b.blockLim) answerBlock(null); }
    else if (b.state === 'wind') {
      if (b.tm < .05) { b.hurt = false; b.perfectGiven = false; }
      for (const h of b.hits) if (!h.done && b.tm >= h.t) enemyHit(h);
      if (b.ko && !g.koWait) { b.ko = false; setState('ko'); api.panel(null); knockedOut(); return; }
      if (b.tm > b.windDur) { api.panel(null); api.ctrl(''); toPick(); }
    }
    else if (b.state === 'win') {
      if (b.boss) { b.pure = Math.min(1, b.tm / 2.4); if (b.tm > 1 && !b.joined) { const GD = S.GUARDIANS[b.guard]; b.joined = true; banner(`${b.name} is free!`, `${GD.title.replace(/^the/, 'The')} joins your team!`, 2.4, '#FFC6DD'); } if (b.tm > 3.6) { finishQuest(); } }
      else if (b.tm > 1.8) { b.f.done = true; b = null; g.mode = 'trans2'; g.trans = 0; }
    }
  }
  function uiMove(v) {
    if (!b || b.state !== 'pick') return;
    if (v === 'special' || (v === 'special2' && shrine)) { g.meter = 0; b.spec = v; api.panel(null); setState('cutin'); A.sfx('special'); say(v === 'special2' ? S.SPECIAL2 : S.SPECIAL[p.hero]); return; }
    toAsk(v);
  }

  /* ---- goal and ending ---- */
  const bossOf = goal => Object.keys(S.GUARDIANS).find(k => S.GUARDIANS[k].goal === goal);
  function reachGoal() {
    const gk = bossOf(Q.goal);
    if (gk) { W.goal.done = true; startBattle({kind:gk, x:W.goal.x, y:W.goal.y}); return; }
    if (LIT[Q.goal] && g.lit < W.lanterns.length) { if (!g.warned) { g.warned = true; banner('Not yet!', litName[1], 1.4); } hero.x = W.goal.x - 61; hero.vx = 0; hero.dashT = 0; return; }
    W.goal.done = true; finishQuest();
  }
  const GOAL_MSG = {
    cage:['The cubs are free!', 'Blossom Isle blooms again'], lanterns:['The lanterns glow!', 'The spirits found their way home'], bell:['The bell rings out!', 'The island is waking up'], falls:['The falls flow again!', 'Colour returns to the river'], grove:['Blossom Isle is saved!', 'You learned DOUBLE JUMP!'],
    pearl:['The pearl shines again!', 'Light fills the sea caves'], jellies:['The jellies glow!', 'The dark tunnel is bright now'], coral:['The coral blooms!', 'The fish swim home'], turtle:['The turtle is free!', 'It will carry you to the dragon'], lair:['Tide Grotto is saved!', 'You learned DASH!'],
    spring:['The hot spring bubbles!', 'Warm steam rises over the peak'], bowls:['The fire bowls blaze!', 'The path up the mountain is lit'], drum:['BOOM! The drum wakes the peak!', 'The mountain is listening'], flame:['The sacred flame burns!', 'Ember Peak glows gold again'], summit:['Ember Peak is saved!', 'You learned GLIDE!'],
  };
  function finishQuest() {
    g.mode = 'end'; g.endT = 0; api.panel(null); api.ctrl(''); hero.vx = 0; hero.dashT = 0;
    g.healTo = Math.max(g.heal, Math.min(1, (S.cleared(p, isle) + (p.prog.anime.stars[qi] ? 0 : 1)) / 5));
    A.sfx('fanfare');
    const msg = GOAL_MSG[Q.goal] || ['Quest complete!', ''];
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
  /* jump hints for little kids, dash hints for long gaps, and "?" over secret ledges a guardian's move will reach.
     pj maps world units to where they are drawn (the world itself in 2D, the screen over the 3D island). */
  function drawHints(c, t, pj, near) {
    for (const gp of W.gaps) {
      if (!near(gp.x, 200) || gp.x < hero.x - 40) continue;
      if (gp.dash && !dash) continue;
      const showArc = assist >= 1, showDash = gp.dash && gp.x - hero.x < 420;
      if (!showArc && !showDash) continue;
      const a = .6 + .4 * Math.sin(t * 6), top = gp.dash ? gp.h - 260 : gp.h - 200;
      c.save(); c.globalAlpha = a; c.shadowColor = gp.dash ? '#7FF0FF' : '#FFE27A'; c.shadowBlur = 12; c.strokeStyle = gp.dash ? '#7FF0FF' : '#FFE27A'; c.lineWidth = 4;
      if (showArc) { c.setLineDash([10, 10]); c.beginPath(); for (let i = 0; i <= 16; i++) { const k = i / 16, x = (1 - k) * (1 - k) * (gp.x - 30) + 2 * (1 - k) * k * (gp.x + gp.w / 2) + k * k * (gp.x + gp.w + 30), y = (1 - k) * (1 - k) * (gp.h - 10) + 2 * (1 - k) * k * top + k * k * (gp.h - 10); const [sx, sy] = pj(x, y); i ? c.lineTo(sx, sy) : c.moveTo(sx, sy); } c.stroke(); c.setLineDash([]); }
      const [lx, ly] = gp.dash ? pj(gp.x + gp.w / 2, gp.h - 120) : pj(gp.x - 10, gp.h - 70); label(c, gp.dash ? 'JUMP, then DASH!' : 'JUMP!', lx, ly, 18, gp.dash ? '#BFF6FF' : '#FFE27A', 'center', 'D');
      c.restore();
    }
    for (const sc of W.secrets) {
      if (!near(sc.x, 600)) continue;
      const ch = W.chests.find(o => o.x === sc.x && o.y === sc.y);
      if (!known(sc.need)) {
        const [qx, qy] = pj(sc.x, sc.y - 70); label(c, '?', qx, qy + Math.sin(t * 3) * 4, 30, '#FFE27A', 'center', 'D');
        if (Math.abs(hero.x - sc.mx) < 220) { const [mx, my] = pj(sc.mx, sc.my); label(c, NEED_MSG[sc.need], mx, my, 13, '#FFFFFF'); }
      } else if (sc.need !== 'double' && ch && !ch.open && Math.abs(hero.x - sc.mx) < 220 && hero.y < sc.h - 100) {
        const [mx, my] = pj(sc.mx + 40, sc.my); label(c, sc.need === 'glide' ? 'Secret island! Jump, then hold GLIDE' : 'Secret island! Jump, then DASH', mx, my, 14, '#BFF6FF', 'center');
      }
    }
  }
  function drawExplore(c, t) {
    const cx = g.camX, sy0 = gy - g.camY * s;
    K.islandBg(c, Wd, Hd, cx, sy0, s, t, {isle});
    c.save(); c.translate(-cx * s, sy0); c.scale(s, s);
    const vx0 = cx - 60, vx1 = cx + Wd / s + 60;
    for (const bl of W.blocks) if (bl.x + bl.w > vx0 && bl.x < vx1) {
      if (bl.secret && !known(bl.need)) { c.save(); c.globalAlpha = tower ? .9 : .45; K.ground(c, bl.x, bl.top, bl.w, 26, 1, 'plat', isle); c.restore(); if (tower) { c.save(); c.shadowColor = '#FFE27A'; c.shadowBlur = 20; c.strokeStyle = 'rgba(255,226,122,.8)'; c.lineWidth = 3; E.rr(c, bl.x - 6, bl.top - 10, bl.w + 12, 40, 10); c.stroke(); c.restore(); } continue; }
      if (bl.step) { K.stepStone(c, bl.x, bl.top, bl.w, t); continue; }
      K.ground(c, bl.x, bl.top, bl.w, bl.plat ? 26 : 520, 1, bl.plat ? 'plat' : 'ground', isle);
    }
    drawHints(c, t, (x, y) => [x, y], (x, m) => x > vx0 - m && x < vx1 + m);
    for (const l of W.lanterns) if (l.x > vx0 && l.x < vx1) K.litProp(c, isle, l.x, l.y, 1, l.lit, t);
    for (const gt of W.gates) if (gt.x > vx0 - 80 && gt.x < vx1 + 80) { gt.open = gt.solved ? Math.min(1, gt.open + .03) : 0; K.gate(c, gt.x, gt.y, 1, t, gt.open, '', isle); }
    for (const ch of W.chests) if (ch.x > vx0 && ch.x < vx1) K.chest(c, ch.x, ch.y, 1, ch.open, t);
    if (W.goal && W.goal.x > vx0 - 200 && W.goal.x < vx1 + 200) K.goal(c, W.goal.kind, W.goal.x, W.goal.y, 1, t, goalState());
    for (const cr of W.crystals) if (!cr.got && cr.x > vx0 && cr.x < vx1) K.crystal(c, cr.x, cr.y, cr.big ? 13 : 9, t);
    for (const f of W.foes) if (!f.done && f.x > vx0 - 100 && f.x < vx1 + 100) {
      const F = FOES[f.kind] || {el:'blossom'};
      c.fillStyle = 'rgba(0,0,0,.3)'; c.beginPath(); c.ellipse(f.x, f.y, 44, 9, 0, 0, TAU); c.fill();
      K.shadow(c, F.el, f.x, f.y - 80, F.big ? .55 : .42, t + f.x, {face:-1, big:F.big, seed:Math.round(f.x), look:F.look});
    }
    K.spirit(c, comp.kind, comp.stage, g.comp.x, g.comp.y, .42, t, {face:hero.face});
    c.fillStyle = 'rgba(0,0,0,.28)'; c.beginPath(); c.ellipse(hero.x, hero.ground ? hero.y : hero.y + 4, 22, 5, 0, 0, TAU); c.fill();
    if (hero.gliding) K.glider(c, hero.x, hero.y - 100, 1, t, S.EL[comp.el].col);
    if (!(hero.inv > 0 && Math.floor(t * 16) % 2)) K.sprite(c, L, hero.x, hero.y, .92, heroPose(t));
    parts.draw(c);
    c.restore();
    K.drift(c, Wd, Hd, t, 18, isle);
    const heal = g.heal; if (heal < 1) { c.save(); c.globalCompositeOperation = 'saturation'; c.fillStyle = `rgba(128,128,128,${(1 - heal) * .55})`; c.fillRect(0, 0, Wd, Hd); c.restore(); }
    hudExplore(c);
  }
  const heroPose = t => ({face:hero.face, run:hero.run, speed:Math.min(1, Math.abs(hero.vx) / SPEED), air:hero.ground ? null : hero.gliding ? 1 : Math.sign(hero.vy), t});
  const goalState = () => ({done:g.mode === 'end', k:g.mode === 'end' ? Math.min(1, g.endT / 1.5) : 0, lit:g.mode === 'end' || g.lit >= W.lanterns.length, isle});
  function hudExplore(c) {
    glass(c, 64, 10, Math.min(Wd - 150, 210), 50);
    drawHearts(c, 82, 28);
    label(c, objText(), 74, 48, 12, '#D9E4FF', 'left');
  }
  /* the same stage drawn as a 3D island; the 2D canvas on top keeps the hints, sparkles and HUD */
  let R3 = null, lastDraw = 0;
  function drawExplore3D(c, t) {
    const dt = Math.max(0, Math.min(.05, t - lastDraw)); lastDraw = t;
    c.clearRect(0, 0, Wd, Hd);
    R3.render(t, dt);
    drawHints(c, t, R3.project, (x, m) => Math.abs(x - hero.x) < 500 + m);
    const k = R3.ppu(), [ox, oy] = R3.project(hero.x, hero.y);
    c.save(); c.translate(ox - hero.x * k, oy - hero.y * k); c.scale(k, k); if (hero.gliding) K.glider(c, hero.x, hero.y - 100, 1, t, S.EL[comp.el].col); parts.draw(c); c.restore();
    hudExplore(c);
  }
  const drawWorld = (c, t) => R3 ? drawExplore3D(c, t) : drawExplore(c, t);
  function drawBattle(c, t) {
    K.battleBg(c, Wd, Hd, t, {boss:b.boss, isle});
    const fx = Wd * .66 + b.x - (b.lunge || 0) * Wd * .2, fy = Hd * .3 + (b.lunge || 0) * Hd * .08, fk = Math.min(Wd / 420, Hd / 760);
    const winA = b.state === 'win' && !b.boss ? Math.max(0, 1 - b.tm / 1.2) : 1;
    if (b.boss) K.guardian(c, b.guard, fx + 20 * fk, Hd * .47, fk * .62, t, b.pure, {flash:b.flash, hit:b.flash > .5, charge:(b.state === 'wind' || b.state === 'block') && b.phase === 2});
    else K.shadow(c, b.el, fx, fy, fk * (b.big ? .95 : .8), t, {face:-1, big:b.big, flash:b.flash, alpha:winA, seed:b.seed, look:b.look});
    if (b.boss && b.shield) { c.save(); c.translate(Wd * .66, Hd * .3); const r = 150 * fk; c.shadowColor = '#B04CFF'; c.shadowBlur = 24; c.strokeStyle = 'rgba(200,120,255,.9)'; c.fillStyle = 'rgba(120,40,200,.18)'; c.lineWidth = 3; c.beginPath(); for (let i = 0; i < 6; i++) { const a = i * TAU / 6 + t * .3; c.lineTo(Math.cos(a) * r, Math.sin(a) * r); } c.closePath(); c.fill(); c.stroke();
      c.strokeStyle = 'rgba(255,255,255,.9)'; c.lineWidth = 2; for (let i = 0; i < b.shield.got; i++) { c.beginPath(); c.moveTo(0, 0); for (let j = 1; j < 5; j++) c.lineTo(Math.cos(i * 2.1 + j * .4) * r * j / 4, Math.sin(i * 2.1 + j * .3) * r * j / 4); c.stroke(); } c.restore(); }
    /* slash effects */
    if (b.state === 'atk' && b.tm < 1) { const col = S.EL[b.move].col, k2 = clamp((b.tm - .2) / .35, 0, 1); c.save(); c.shadowColor = col; c.shadowBlur = 20; c.strokeStyle = '#FFFFFF'; c.lineWidth = 6 * (1 - k2) + 1; c.beginPath(); c.arc(Wd * .66, Hd * .3, 90 * fk, -2.4 + k2 * 2.6, -2.4 + k2 * 2.6 + 1.2); c.stroke(); c.strokeStyle = col; c.lineWidth = 3; c.stroke(); c.restore(); }
    if (b.compFx > 0) { b.compFx -= .03; c.save(); c.globalAlpha = Math.max(0, b.compFx); c.strokeStyle = S.EL[comp.el].col; c.lineWidth = 5; c.beginPath(); c.moveTo(Wd * .42, Hd * .44); c.lineTo(Wd * .66, Hd * .3); c.stroke(); c.restore(); }
    /* hero bust, lower left */
    const bs = Math.min(Wd * .62 / 360, Hd * .32 / 300), lunge = b.state === 'atk' && b.tm < .5 ? Math.sin(b.tm / .5 * Math.PI) * 30 : 0, dodge = b.state === 'dodge' ? -Math.sin(b.tm / .8 * Math.PI) * 40 : 0;
    c.save(); c.beginPath(); c.rect(0, Hd * .3, Wd * .62, Hd * .3); c.clip();
    c.translate(Wd * .26 - 180 * bs + lunge, Hd * .47 - 220 * bs + dodge * .3); c.scale(bs, bs);
    K.bust(c, L, {fierce:b.state === 'atk' || b.state === 'wind' || b.state === 'block', mouth:b.state === 'atk' ? 'shout' : b.state === 'win' ? 'grin' : 'smile', blink:Math.sin(t * 1.7) > .985 ? .1 : 1});
    c.restore();
    if (g.hurtFx > 0) { c.save(); c.globalAlpha = g.hurtFx * .5; c.fillStyle = '#FF2A5A'; c.fillRect(0, 0, Wd, Hd); c.restore(); }
    if (g.blockFx > 0) { c.save(); c.globalAlpha = g.blockFx; c.translate(Wd * .26, Hd * .45); c.shadowColor = '#7FF0FF'; c.shadowBlur = 20; c.strokeStyle = '#BFF6FF'; c.lineWidth = 4; const r = 90 * (1.2 - g.blockFx * .2); c.beginPath(); for (let i = 0; i < 6; i++) { const a = i * TAU / 6; c.lineTo(Math.cos(a) * r, Math.sin(a) * r); } c.closePath(); c.stroke(); c.restore(); }
    K.spirit(c, comp.kind, comp.stage, Wd * .48, Hd * .5, .5 * Math.min(1.2, Wd / 380), t, {face:1});
    /* guard ring */
    if (b.state === 'wind') {
      const h = b.hits.find(x => !x.done);
      const hx = Wd * .26, hy = Hd * .45, rT = 56;
      if (h) {
        const rem = h.t - b.tm;
        if (h.blocked) { c.save(); c.globalAlpha = .55 + .25 * Math.sin(t * 10); c.lineWidth = 5; c.strokeStyle = '#7FF0FF'; c.shadowColor = '#7FF0FF'; c.shadowBlur = 22; c.fillStyle = 'rgba(127,240,255,.12)'; c.beginPath(); c.arc(hx, hy, rT, 0, TAU); c.fill(); c.stroke(); c.restore(); }
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
    if (b.state === 'cutin') K.cutin(c, Wd, Hd, b.tm / 1.8, L, b.spec === 'special2' ? S.SPECIAL2 : S.SPECIAL[p.hero], b.spec === 'special2' ? '#FFB347' : S.EL[comp.el].col, t);
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
    onStart() {
      if (PUM.SKY3D && PUM.SKY3D.ready()) { try { R3 = PUM.SKY3D.create({world:W, hero, g, look:L, comp, double, tower, isle, known}); const gc = document.getElementById('gc'); gc.parentNode.insertBefore(R3.canvas, gc); R3.resize(Wd, Hd); } catch (e) { console.error(e); if (R3) R3.dispose(); R3 = null; } }
      api.ctrl(exploreCtrl()); banner(Q.name, Q.story.length < 60 ? Q.story : Q.obj, 2.2, ['#FFC6DD', '#9BF6FF', '#FFC27A'][isle]); say(Q.story); },
    resize(w, h) { Wd = w; Hd = h; s = Math.min(h / 700, w / 380); gy = h * .64; if (R3) R3.resize(w, h); },
    update(dt) {
      g.t += dt; parts.update(dt);
      if (g.banner) { g.banner.t += dt; if (g.banner.t > g.banner.dur) g.banner = null; }
      for (const n of g.nums) n.t += dt; g.nums = g.nums.filter(n => n.t < 1.1);
      g.shake *= Math.exp(-dt * 8);
      if (g.mode === 'explore') updateExplore(dt);
      else if (g.mode === 'trans') { g.trans += dt; if (g.trans > .75) { g.mode = 'battle'; b = newBattle(g.pending); api.ctrl(''); if (b.boss) say(`Guardian battle! Defeat ${b.name}!`); else say(`${b.name}! It is weak to ${S.EL[S.weakTo(b.el)].name}.`); } }
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
      else if (g.mode === 'trans') { drawWorld(c, t); drawTrans(c, g.trans / .75, true); }
      else if (g.mode === 'trans2') { drawWorld(c, t); drawTrans(c, g.trans / .6, false); }
      else if (g.mode === 'end' && b && b.boss) drawBattle(c, t);
      else drawWorld(c, t);
      if (g.mode === 'battle' || (b && b.boss)) parts.draw(c);
      drawNums(c);
      c.restore();
      drawBanner(c);
    },
    pointer() {},
    setControl(k, down) {
      if (k === 'left' || k === 'right' || k === 'glide') { ctl[k] = down && g.mode === 'explore'; return; }
      if (k === 'dash') { if (down && g.mode === 'explore') hero.dashQ = .15; return; }
      if (k === 'jump') { if (down && g.mode === 'explore') hero.buf = .14; return; }
      if (/^k[1-4]$/.test(k) && down) { const els = document.querySelectorAll('#choose [data-gp]:not(.sq-leave):not(.sq-tier)'); const el = els[Number(k[1]) - 1] || (els.length === 1 ? els[0] : null); if (el && !el.disabled) el.click(); }
      if (k === 'k0' && down) { const el = document.querySelector('#choose .special'); if (el) el.click(); }
    },
    ui(act, v) {
      if (act === 'ans') { const n = Number(v); if (g.mode === 'lock') answerLock(n); else if (b && b.state === 'block') answerBlock(n); else if (b) answerBattle(n); }
      if (act === 'move') uiMove(v);
      if (act === 'tier' && b && b.state === 'pick') { g.tier = Number(v) || 0; A.sfx('tap'); api.panel(moveBtns(), 'sky-q'); }
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
    onStop() { if (R3) { R3.dispose(); R3 = null; } },
    is3d: () => !!R3,
    xpEarned: () => g.xp,
    _debug: () => ({g, hero, W, get b() { return b; }, get lock() { return lock; }, get R3() { return R3; }}),
  };
};
})();
