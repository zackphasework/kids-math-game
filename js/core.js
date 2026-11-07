/* Power-Up Math: shared helpers, constants, UI art and sound. */
(function () {
'use strict';
const PUM = window.PUM = {};
const W = window;

/* ---------- utils ---------- */
const U = PUM.util = {};
U.rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
U.pick = a => a[Math.floor(Math.random() * a.length)];
U.coin = (p = .5) => Math.random() < p;
U.shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
U.esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
U.num = v => (Number.isFinite(+v) && +v >= 0) ? Math.floor(+v) : 0;
U.clamp = (v, a, b) => Math.max(a, Math.min(b, v));
U.lerp = (a, b, t) => a + (b - a) * t;
U.uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
U.reduced = () => { try { return W.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };
U.mulberry32 = a => function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
U.smooth = t => { t = U.clamp(t, 0, 1); return t * t * (3 - 2 * t); };
const varCache = {};
U.cssVar = name => {
  if (varCache[name]) return varCache[name];
  const v = getComputedStyle(document.documentElement).getPropertyValue('--' + name).trim() || '#888';
  varCache[name] = v; return v;
};
try { W.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { for (const k in varCache) delete varCache[k]; }); } catch (e) {}

/* ---------- constants ---------- */
PUM.COLORS = ['rose','marigold','star','leaf','sea','berry','mint','plum'];
PUM.AGES = [3,4,5,6,7,8,9,10,11,12];
PUM.THEMES = {
  trucks: {name:'Trucks', base:'Garage', game:'Big Rig Builders', pc:'marigold', fuel:'Fuel'},
  soccer: {name:'Soccer', base:'Clubhouse', game:'Striker Rush', pc:'leaf', fuel:'Stamina'},
  anime:  {name:'Hero',   base:'Sky Village', game:'Sky Quest', pc:'berry', fuel:'Hearts'},
};
PUM.THEME_IDS = Object.keys(PUM.THEMES);
PUM.UPGRADES = {
  trucks: [
    {k:'cap', name:'Fuel tank', what:'Holds more fuel, so you drive longer.'},
    {k:'rech', name:'Fuel pump', what:'Each right answer adds more fuel.'},
    {k:'str', name:'Engine', what:'More power for steep hills and speed.'},
    {k:'spec', name:'Tires', what:'Better grip, fewer slips and flips.'},
  ],
  soccer: [
    {k:'cap', name:'Stamina', what:'More shots and saves before a break.'},
    {k:'rech', name:'Recovery', what:'Each right answer refills more stamina.'},
    {k:'str', name:'Shot power', what:'Faster shots that keepers struggle to stop.'},
    {k:'spec', name:'Keeper gloves', what:'Dive faster and reach farther.'},
  ],
  anime: [
    {k:'cap', name:'Energy', what:'Run longer before recharging.'},
    {k:'rech', name:'Recharge', what:'Each right answer refills more energy.'},
    {k:'str', name:'Strength', what:'Power blasts hit bosses harder.'},
    {k:'spec', name:'Agility', what:'Jump higher. Level 1 unlocks double jump.'},
  ],
};
PUM.UP_COST = [8, 15, 25, 40, 60];
PUM.UP_MAX = 5;
PUM.HEROES = [
  {name:'Kai', skin:'skin1', hair:'hair1', iris:'marigold'},
  {name:'Mira', skin:'skin2', hair:'hair2', iris:'berry'},
  {name:'Juno', skin:'skin3', hair:'hair3', iris:'sea'},
];
PUM.TEAMS = [
  {name:'River Foxes', color:'marigold'}, {name:'Thunder Owls', color:'berry'}, {name:'Maple Rockets', color:'rose'},
  {name:'Harbour Lions', color:'sea'}, {name:'Pine Bears', color:'leaf'}, {name:'Comet Kids', color:'plum'},
];
PUM.CUPS = ['Autumn Cup','Snow Cup','Spring Cup','Summer Cup','City Cup','Golden Boot Cup'];
PUM.BUILDINGS = [
  {name:'Treehouse', color:'leaf'}, {name:'Fire station', color:'rose'}, {name:'Ice cream shop', color:'plum'},
  {name:'Library', color:'sea'}, {name:'Train station', color:'marigold'}, {name:'Stadium', color:'berry'}, {name:'Skyscraper', color:'mint'},
];
PUM.BRICKS_PER_BUILDING = 12;
PUM.WORLDS = [
  {name:'Misty Forest', color:'leaf', sky:['#9FD9C9','#E6F7EE'], hills:'#5FA889', ground:'#4E8A5F', boss:'Gloom Blob'},
  {name:'Crystal Caves', color:'sea', sky:['#6E86D8','#C9D8FF'], hills:'#4A5FAE', ground:'#5A5F8E', boss:'Crystal Snapper'},
  {name:'Cloud Temple', color:'star', sky:['#FFC98A','#FFF1D6'], hills:'#E0A76A', ground:'#B98455', boss:'Storm Wisp'},
  {name:'Volcano Peak', color:'rose', sky:['#E86A5A','#FFD0A8'], hills:'#9A4A42', ground:'#6E3A36', boss:'Magma Muncher'},
  {name:'Starlight City', color:'berry', sky:['#3B2E7A','#8C6FD6'], hills:'#2A2160', ground:'#3F3470', boss:'Shadow King'},
];

/* ---------- icons ---------- */
const IC = {
  x:'<path d="M6 6l12 12M18 6L6 18"/>', back:'<path d="M15 5l-7 7 7 7"/>', next:'<path d="M5 12h13M13 6l6 6-6 6"/>',
  check:'<path d="M5 13l4 4 10-10"/>', plus:'<path d="M12 5v14M5 12h14"/>', up:'<path d="M12 19V5M6 11l6-6 6 6"/>',
  sound:'<path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/>',
  mute:'<path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M17 9.5l5 5M22 9.5l-5 5"/>',
  talk:'<path d="M4 5h16v11H10l-5 4v-4H4z"/><path d="M8.5 10.5h.01M12 10.5h.01M15.5 10.5h.01"/>',
  pencil:'<path d="M4 20l4-1L19 8l-3-3L5 16z"/><path d="M14 7l3 3"/>',
  bulb:'<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"/>',
  bolt:'<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',
  pause:'<path d="M8 5v14M16 5v14"/>',
  play:'<path d="M7 5l12 7-12 7z"/>',
  star:'<path d="M12 2.6l2.8 5.9 6.5.8-4.8 4.5 1.2 6.4L12 17.1l-5.7 3.1 1.2-6.4-4.8-4.5 6.5-.8z"/>',
  gem:'<path d="M12 3l6.5 7L12 21 5.5 10z"/><path d="M5.5 10h13M9 10l3-7 3 7-3 11z"/>',
  coin:'<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5v9M9.5 9.5h4a1.5 1.5 0 0 1 0 3h-3a1.5 1.5 0 0 0 0 3h4"/>',
  wrench:'<path d="M14.5 4.5a4.5 4.5 0 0 0-5.6 5.8L4 15.2 6.8 18l4.9-4.9a4.5 4.5 0 0 0 5.8-5.6l-2.6 2.6-2.4-.6-.6-2.4z"/>',
  down:'<path d="M12 5v14M6 13l6 6 6-6"/>',
  brain:'<path d="M9 4a3 3 0 0 0-3 3 3 3 0 0 0-2 5 3 3 0 0 0 2 5 3 3 0 0 0 3 3h1V4z"/><path d="M15 4a3 3 0 0 1 3 3 3 3 0 0 1 2 5 3 3 0 0 1-2 5 3 3 0 0 1-3 3h-1V4z"/>',
};
PUM.icon = (n, cls = '') => `<svg class="ic ${cls}" viewBox="0 0 24 24" aria-hidden="true">${IC[n]}</svg>`;

/* ---------- UI art (SVG, all original) ---------- */
const F = c => `style="fill:var(--${c})"`;
PUM.F = F;
function starPts(cx, cy, R, r, n, rot = -90) {
  const steps = R === r ? n : n * 2, pts = [];
  for (let i = 0; i < steps; i++) { const rad = (R === r || i % 2 === 0) ? R : r, a = (rot + i * 360 / steps) * Math.PI / 180; pts.push((cx + rad * Math.cos(a)).toFixed(1) + ',' + (cy + rad * Math.sin(a)).toFixed(1)); }
  return pts.join(' ');
}
PUM.starPts = starPts;
function shapeInner(s) {
  switch (s) {
    case 'star': return `<polygon points="${starPts(50,54,45,20,5)}"/>`;
    case 'heart': return '<path d="M50 86C22 66 8 50 12 32 16 14 40 10 50 28 60 10 84 14 88 32 92 50 78 66 50 86Z"/>';
    case 'cone': return `<path d="M50 10L80 84H20Z"/><path d="M39 38H61L65 50H35ZM31 62H69L73 74H27Z" stroke-width="3" ${F('ball')}/><rect x="12" y="82" width="76" height="9" rx="3"/>`;
    case 'wheel': return `<circle cx="50" cy="50" r="42"/><circle cx="50" cy="50" r="18" ${F('concrete')}/><circle cx="50" cy="50" r="5" stroke="none" ${F('line')}/>`;
    case 'ball': return `<circle cx="50" cy="50" r="42"/><polygon points="${starPts(50,50,13,13,5)}" stroke="none" ${F('line')}/><path d="M50 37V9M62 46L89 37M58 61L74 85M42 61L26 85M38 46L11 37" fill="none" stroke-width="4"/>`;
    case 'orb': return `<circle cx="50" cy="50" r="40"/><circle cx="36" cy="35" r="10" stroke="none" opacity=".7" ${F('ball')}/>`;
    default: return '<circle cx="50" cy="50" r="40"/>';
  }
}
PUM.shapeSVG = (s, c) => `<svg class="art" viewBox="0 0 100 100" aria-hidden="true"><g ${F(c)} stroke-width="6" stroke-linejoin="round">${shapeInner(s)}</g></svg>`;
function wheels(xs) { return xs.map(x => `<circle cx="${x}" cy="72" r="11" ${F('metal')}/><circle cx="${x}" cy="72" r="4" ${F('concrete')}/>`).join(''); }
function truckParts(kind, color) {
  const cab = `<path d="M74 32H96Q104 32 106 42L110 60H74Z" ${F(color)}/><path d="M80 37H94Q99 37 100 43L101 48H80Z" ${F('glass')}/>`;
  const chassis = `<rect x="6" y="58" width="106" height="8" rx="3" ${F('metal')}/>`;
  const arm = d => `<path d="${d}" fill="none" stroke-width="10"/><path d="${d}" fill="none" stroke-width="5" style="stroke:var(--star)"/>`;
  if (kind === 'excavator') return `<rect x="8" y="62" width="74" height="20" rx="10" ${F('metal')}/>${[19,35,51,67].map(x => `<circle cx="${x}" cy="72" r="4.5" ${F('concrete')}/>`).join('')}
    <rect x="14" y="40" width="54" height="22" rx="4" ${F(color)}/><path d="M40 20H62Q66 20 66 24V40H40Z" ${F(color)}/><rect x="45" y="25" width="16" height="11" rx="2" ${F('glass')}/>
    ${arm('M64 46L88 18L106 44')}<path d="M98 42L116 45L111 60L96 54Z" ${F('metal')}/>`;
  return `${chassis}<path d="M8 26H70L64 58H14Z" ${F('star')}/><path d="M18 34H60M16 44H62" fill="none" stroke-width="2.5" opacity=".5"/>${cab}${wheels([24,50,94])}`;
}
PUM.truckSVG = (kind, color) => `<svg class="art" viewBox="0 0 120 90" aria-hidden="true"><g stroke-width="3" stroke-linejoin="round" stroke-linecap="round">${truckParts(kind, color)}</g></svg>`;
PUM.jerseySVG = (color, label) => `<svg class="art" viewBox="0 0 100 90" aria-hidden="true"><g stroke-width="3.5" stroke-linejoin="round">
    <path d="M30 8L42 4Q50 12 58 4L70 8L94 24L83 42L72 36V86H28V36L17 42L6 24Z" ${F(color)}/>
    <path d="M42 4Q50 14 58 4" fill="none" stroke-width="3.5"/><path d="M6 24L17 42M94 24L83 42" fill="none" stroke-width="3" opacity=".4"/>
    <text x="50" y="66" text-anchor="middle" font-family="Sniglet, sans-serif" font-weight="800" font-size="30" stroke-width="5" paint-order="stroke" style="fill:#FFFFFF">${U.esc(label)}</text></g></svg>`;
function heroParts(idx, shirt) {
  const h = PUM.HEROES[idx] || PUM.HEROES[0];
  let back = '', front = '';
  if (idx === 0) {
    back = `<polygon points="21,48 15,22 31,30 32,8 46,24 54,4 61,24 74,10 71,30 86,22 79,48" ${F(h.hair)}/>`;
    front = `<path d="M23 46Q28 26 50 24Q72 26 77 46L67 37L58 43L50 33L42 43L33 37Z" ${F(h.hair)}/><rect x="22" y="36" width="56" height="7" rx="2" ${F('rose')}/><path d="M77 38L94 31L90 44Z" ${F('rose')}/>`;
  } else if (idx === 1) {
    back = `<circle cx="25" cy="24" r="12" ${F(h.hair)}/><circle cx="75" cy="24" r="12" ${F(h.hair)}/><path d="M22 50Q18 76 30 80L32 52ZM78 50Q82 76 70 80L68 52Z" ${F(h.hair)}/>`;
    front = `<path d="M22 50Q21 23 50 21Q79 23 78 50Q71 36 61 34Q57 42 48 36Q40 43 34 34Q27 39 22 50Z" ${F(h.hair)}/><polygon points="${starPts(71,32,7,3,5)}" stroke-width="2" ${F('star')}/>`;
  } else {
    front = `<path d="M23 52Q19 21 50 19Q81 21 77 52Q74 38 66 34L60 41L54 32L46 41L38 32L31 41Q26 45 23 52Z" ${F(h.hair)}/><rect x="27" y="29" width="46" height="13" rx="6.5" ${F('metal')}/><circle cx="41" cy="35.5" r="4.5" ${F('glass')}/><circle cx="59" cy="35.5" r="4.5" ${F('glass')}/>`;
  }
  const eye = x => `<ellipse cx="${x}" cy="55" rx="6" ry="8" stroke-width="2.5" ${F('eye')}/><ellipse cx="${x + .5}" cy="56" rx="4.2" ry="6" stroke="none" ${F(h.iris)}/><circle cx="${x + .6}" cy="56.5" r="2.2" stroke="none" ${F('line')}/><circle cx="${x - 1.4}" cy="52.5" r="1.7" stroke="none" ${F('eye')}/>`;
  return `${back}<path d="M20 112Q22 82 50 80Q78 82 80 112Z" ${F(shirt)}/><rect x="44" y="72" width="12" height="10" ${F(h.skin)}/>
    <circle cx="50" cy="50" r="27" ${F(h.skin)}/>${front}${eye(40)}${eye(60)}
    <circle cx="33" cy="64" r="3.5" stroke="none" opacity=".4" ${F('rose')}/><circle cx="67" cy="64" r="3.5" stroke="none" opacity=".4" ${F('rose')}/>
    <path d="M45 67q5 4 10 0" fill="none" stroke-width="2.8"/>`;
}
PUM.heroSVG = (idx, shirt) => `<svg class="art" viewBox="0 0 100 112" aria-hidden="true"><g stroke-width="3" stroke-linejoin="round" stroke-linecap="round">${heroParts(idx, shirt)}</g></svg>`;
PUM.trophySVG = medal => `<svg class="art" viewBox="0 0 100 92" aria-hidden="true"><g stroke-width="3.5" stroke-linejoin="round">
    <path d="M26 14H74V34Q74 58 50 62Q26 58 26 34Z" ${F(medal)}/><path d="M26 20H14Q12 40 30 44M74 20H86Q88 40 70 44" fill="none" stroke-width="5"/>
    <rect x="44" y="62" width="12" height="12" ${F(medal)}/><rect x="30" y="74" width="40" height="12" rx="3" ${F('metal')}/>
    <polygon points="${starPts(50,34,10,4.5,5)}" stroke-width="2" ${F('ball')}/></g></svg>`;
PUM.badgeSVG = (color, n) => `<svg class="art" viewBox="0 0 100 92" aria-hidden="true"><g stroke-width="3.5" stroke-linejoin="round">
    <path d="M34 60L24 90L40 82L50 92L56 60ZM66 60L76 90L60 82L50 92L44 60Z" ${F('rose')}/>
    <polygon points="${starPts(50,40,38,30,10)}" ${F(color)}/><circle cx="50" cy="40" r="22" ${F('star')}/>
    <text x="50" y="49" text-anchor="middle" font-family="Sniglet, sans-serif" font-weight="800" font-size="26" stroke-width="4" paint-order="stroke" style="fill:#FFFFFF">${n}</text></g></svg>`;
PUM.buildingSVG = (color, frac = 1) => {
  const h = Math.round(42 * frac);
  return `<svg class="art" viewBox="0 0 100 92" aria-hidden="true"><g stroke-width="3" stroke-linejoin="round">
    <rect x="0" y="80" width="100" height="12" stroke="none" ${F('grass')}/>
    ${frac < 1 ? `<path d="M16 82V36M84 82V36M16 50H84M16 66H84" fill="none" stroke-width="2.5" opacity=".5"/>` : ''}
    ${h > 0 ? `<rect x="18" y="${82 - h}" width="64" height="${h}" ${F(color)}/>` : ''}
    ${frac >= 1 ? `<polygon points="12,42 50,12 88,42" ${F('roof')}/><rect x="26" y="50" width="12" height="12" ${F('glass')}/><rect x="62" y="50" width="12" height="12" ${F('glass')}/><rect x="43" y="60" width="14" height="22" ${F('metal')}/><path d="M50 12V0" fill="none"/><path d="M50 1L64 5L50 9Z" ${F('star')}/>` : ''}
  </g></svg>`;
};
PUM.avatarSVG = p => {
  if (p.theme === 'soccer') return PUM.jerseySVG(p.color, (p.name || '?').trim().charAt(0).toUpperCase() || '?');
  if (p.theme === 'anime') return PUM.heroSVG(p.hero, p.color);
  return PUM.truckSVG('dump', p.color);
};

/* ---------- sound (WebAudio, only after a tap) ---------- */
const A = PUM.audio = {ctx:null, engine:null};
const muted = () => !!(PUM.store && PUM.store.S.muted);
A.ac = () => {
  try {
    if (!A.ctx) { const C = W.AudioContext || W.webkitAudioContext; if (!C) return null; A.ctx = new C(); }
    if (A.ctx.state === 'suspended') A.ctx.resume();
    return A.ctx;
  } catch (e) { return null; }
};
A.tone = (f, t0, d, type = 'triangle', g = .16, f2) => {
  if (muted()) return; const c = A.ac(); if (!c) return;
  try {
    const o = c.createOscillator(), v = c.createGain(), s = c.currentTime + t0;
    o.type = type; o.frequency.setValueAtTime(f, s); if (f2) o.frequency.exponentialRampToValueAtTime(f2, s + d);
    v.gain.setValueAtTime(.0001, s); v.gain.exponentialRampToValueAtTime(g, s + .015); v.gain.exponentialRampToValueAtTime(.0001, s + d);
    o.connect(v); v.connect(c.destination); o.start(s); o.stop(s + d + .05);
  } catch (e) {}
};
let noiseBuf = null;
A.noise = (d, g = .12, freq = 1200, t0 = 0) => {
  if (muted()) return; const c = A.ac(); if (!c) return;
  try {
    if (!noiseBuf) { noiseBuf = c.createBuffer(1, c.sampleRate, c.sampleRate); const ch = noiseBuf.getChannelData(0); for (let i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1; }
    const src = c.createBufferSource(), flt = c.createBiquadFilter(), v = c.createGain(), s = c.currentTime + t0;
    src.buffer = noiseBuf; flt.type = 'bandpass'; flt.frequency.value = freq; flt.Q.value = .8;
    v.gain.setValueAtTime(.0001, s); v.gain.exponentialRampToValueAtTime(g, s + .03); v.gain.exponentialRampToValueAtTime(.0001, s + d);
    src.connect(flt); flt.connect(v); v.connect(c.destination); src.start(s); src.stop(s + d + .05);
  } catch (e) {}
};
A.sfx = k => {
  switch (k) {
    case 'tap': A.tone(880, 0, .06, 'sine', .04); break;
    case 'yes': A.tone(523, 0, .18); A.tone(659, .09, .18); A.tone(784, .18, .3); break;
    case 'no': A.tone(392, 0, .22, 'sine', .08); A.tone(330, .16, .3, 'sine', .07); break;
    case 'coin': A.tone(988, 0, .08, 'square', .05); A.tone(1319, .07, .16, 'square', .05); break;
    case 'up': [523, 659, 784, 1047, 1319].forEach((f, i) => A.tone(f, i * .07, .25)); break;
    case 'refuel': A.tone(330, 0, .35, 'sawtooth', .05, 660); break;
    case 'thud': A.tone(90, 0, .18, 'sine', .25, 50); A.noise(.12, .1, 300); break;
    case 'crash': A.noise(.5, .25, 500); A.tone(120, 0, .4, 'sawtooth', .1, 40); break;
    case 'brick': A.tone(240, 0, .1, 'square', .06, 120); break;
    case 'kick': A.tone(160, 0, .12, 'sine', .3, 60); A.noise(.06, .12, 2000); break;
    case 'goal': A.noise(1.6, .22, 900); [523, 659, 784, 1047].forEach((f, i) => A.tone(f, .1 + i * .1, .4)); break;
    case 'save': A.noise(.6, .12, 600); A.tone(300, 0, .25, 'sine', .08, 200); break;
    case 'post': A.tone(1800, 0, .5, 'sine', .12, 1700); break;
    case 'whistle': A.tone(2200, 0, .25, 'sine', .08); A.tone(2400, .28, .35, 'sine', .08); break;
    case 'jump': A.tone(440, 0, .15, 'square', .05, 880); break;
    case 'hurt': A.tone(300, 0, .3, 'sawtooth', .08, 120); break;
    case 'blast': A.noise(.35, .14, 2500); A.tone(220, 0, .4, 'sawtooth', .08, 880); break;
    case 'boss': A.tone(110, 0, .6, 'sawtooth', .1, 70); break;
    case 'fanfare': [523, 659, 784, 659, 784, 1047].forEach((f, i) => A.tone(f, i * .12, .3)); break;
  }
};
A.engineOn = () => {
  if (muted() || A.engine) return; const c = A.ac(); if (!c) return;
  try {
    const o = c.createOscillator(), o2 = c.createOscillator(), v = c.createGain(), flt = c.createBiquadFilter();
    o.type = 'sawtooth'; o2.type = 'square'; o.frequency.value = 55; o2.frequency.value = 27.5;
    flt.type = 'lowpass'; flt.frequency.value = 500; v.gain.value = .0001;
    o.connect(flt); o2.connect(flt); flt.connect(v); v.connect(c.destination); o.start(); o2.start();
    A.engine = {o, o2, v};
  } catch (e) {}
};
A.engineSet = (rpm, load) => {
  if (!A.engine) return; const c = A.ctx;
  if (muted()) { A.engine.v.gain.setTargetAtTime(.0001, c.currentTime, .05); return; }
  A.engine.o.frequency.setTargetAtTime(50 + rpm * 90, c.currentTime, .08);
  A.engine.o2.frequency.setTargetAtTime(25 + rpm * 45, c.currentTime, .08);
  A.engine.v.gain.setTargetAtTime(.025 + load * .045, c.currentTime, .1);
};
A.engineOff = () => {
  if (!A.engine) return;
  try { const t = A.ctx.currentTime; A.engine.v.gain.setTargetAtTime(.0001, t, .05); A.engine.o.stop(t + .3); A.engine.o2.stop(t + .3); } catch (e) {}
  A.engine = null;
};
A.say = t => {
  if (muted() || !('speechSynthesis' in W)) return;
  try { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(t); u.rate = .92; u.pitch = 1.1; speechSynthesis.speak(u); } catch (e) {}
};
A.hush = () => { try { speechSynthesis.cancel(); } catch (e) {} };
})();
