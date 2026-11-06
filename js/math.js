/* Power-Up Math: question generators and the reusable quiz panel. */
(function () {
'use strict';
const {rnd, pick, coin, shuffle, esc, clamp} = PUM.util;
const icon = PUM.icon;
const MINUS = '−', TIMES = '×', DIV = '÷';

const LEVELS = PUM.LEVELS = [
  {id:'count',  name:'Counting',              ages:'Ages 3–5',  ex:'1 2 3', color:'rose',     steps:['Count to 3','Count to 5','Count to 10','Find the group','Count to 20']},
  {id:'add10',  name:'Add & take away to 10', ages:'Ages 5–6',  ex:'3+2',   color:'marigold', steps:['Sums to 5','Sums to 10','Take away','Mixed']},
  {id:'add20',  name:'Add & take away to 20', ages:'Ages 6–7',  ex:'8+7',   color:'leaf',     steps:['Add to 20','Take away from 20','Mixed','Missing numbers']},
  {id:'add100', name:'Numbers to 100',        ages:'Ages 7–8',  ex:'45+30', color:'sea',      steps:['Tens','Add & take ones','Two-digit','Carrying & borrowing']},
  {id:'times',  name:'Times tables',          ages:'Ages 8–9',  ex:'6×7',  color:'berry', steps:['2, 5 and 10','3 and 4','6 to 9','Up to 12']},
  {id:'divide', name:'Sharing & dividing',    ages:'Ages 9–11', ex:'24÷6', color:'plum',  steps:['÷ 2, 5 and 10','÷ 3 and 4','÷ 6 to 9','Up to 12']},
  {id:'mix',    name:'Big challenges',        ages:'Ages 11–12', ex:'25%',  color:'mint',     steps:['Big times','Big sharing','Fractions of','Percentages']},
];
const LV = PUM.LV = Object.fromEntries(LEVELS.map(l => [l.id, l]));
PUM.maxTier = id => LV[id].steps.length - 1;
PUM.AGE_START = {3:['count',0],4:['count',1],5:['add10',0],6:['add10',2],7:['add20',0],8:['add100',0],9:['times',0],10:['times',2],11:['divide',0],12:['mix',0]};
const OBJ_BY_THEME = {trucks:['cone','wheel','star'], soccer:['ball','star','heart'], anime:['star','orb','heart']};
const OBJ_COLOR = {cone:'marigold', wheel:'metal', ball:'ball'};
const PRAISE = ['Yes!','Great job!','You got it!','Super!','Nice one!','Brilliant!','Spot on!'];

function choicesFor(ans, k, {min = 0, max = Infinity, extra = []} = {}) {
  const out = new Set([ans]);
  const near = shuffle([1, -1, 2, -2]).map(d => ans + d);
  const far = ans >= 10 ? shuffle([10, -10]).map(d => ans + d) : [];
  const more = shuffle([3, -3, 4, -4, 5, -5]).map(d => ans + d);
  const pool = [...shuffle(extra.slice()).slice(0, 2), near[0], ...far.slice(0, 1), near[1], near[2], near[3], ...far.slice(1), ...more];
  for (const c of pool) { if (out.size >= k) break; if (Number.isInteger(c) && c >= min && c <= max) out.add(c); }
  let guard = 0;
  while (out.size < k && guard++ < 80) { const c = ans + rnd(-8, 8); if (c >= min && c <= max) out.add(c); }
  return shuffle([...out]);
}
function Q(parts, ans, spoken, aid = null, show = false, copt = {}) { return {disp:{t:'expr', parts}, ans, spoken, kind:'num', aid, aidShown:show, choices:choicesFor(ans, 4, copt)}; }
const addAid = (a, b) => ({t:'dots', a, b});
const takeAid = (total, remove) => ({t:'take', total, remove});
const NUMW = ['zero','one','two','three','four','five','six','seven','eight','nine'];
const DENW = {2:'half',3:'third',4:'quarter',5:'fifth',10:'tenth'};
const fracWords = (n, d) => d === 2 ? 'one half' : `${NUMW[n]} ${DENW[d]}${n > 1 ? 's' : ''}`;

function genCount(t, theme) {
  const obj = pick(OBJ_BY_THEME[theme] || OBJ_BY_THEME.trucks), color = OBJ_COLOR[obj] || pick(PUM.COLORS);
  if (t === 3 && coin()) { const n = rnd(1, 10); return {disp:{t:'numeral', n}, ans:n, label:'Find', spoken:`Find ${n}.`, kind:'group', color:pick(PUM.COLORS), choices:choicesFor(n, 4, {min:1, max:10})}; }
  if (t === 4 && coin()) { const s = rnd(1, 16); return {disp:{t:'seq', nums:[s, s + 1, s + 2]}, ans:s + 3, label:'What comes next?', spoken:`${s}, ${s + 1}, ${s + 2}. What comes next?`, kind:'num', choices:choicesFor(s + 3, 4, {min:1, max:20})}; }
  const n = [rnd(1, 3), rnd(1, 5), rnd(1, 10), rnd(3, 10), rnd(8, 20)][t];
  const k = t <= 1 ? 3 : 4, max = [4, 6, 12, 12, 22][t];
  return {disp:{t:'count', n, obj, color}, ans:n, label:'How many?', spoken:'How many?', kind:'num', mini:t <= 3, choices:choicesFor(n, k, {min:1, max})};
}
function genAdd10(t) {
  const add = (cap, show) => { const a = rnd(1, cap - 1), b = rnd(1, cap - a); return Q([a, '+', b, '=', '?'], a + b, `${a} plus ${b}`, addAid(a, b), show); };
  const sub = show => { const a = rnd(2, 10), b = rnd(1, a); return Q([a, MINUS, b, '=', '?'], a - b, `${a} take away ${b}`, takeAid(a, b), show); };
  if (t === 0) return add(5, true);
  if (t === 1) return add(10, true);
  if (t === 2) return sub(true);
  return coin() ? add(10, false) : sub(false);
}
function genAdd20(t) {
  const add = () => { const a = rnd(4, 12), b = rnd(Math.max(2, 11 - a), Math.min(9, 20 - a)); return Q([a, '+', b, '=', '?'], a + b, `${a} plus ${b}`, addAid(a, b)); };
  const sub = () => { const a = rnd(11, 20), b = rnd(2, Math.min(10, a - 1)); return Q([a, MINUS, b, '=', '?'], a - b, `${a} take away ${b}`, takeAid(a, b)); };
  if (t === 0) return add();
  if (t === 1) return sub();
  if (t === 2) return coin() ? add() : sub();
  if (coin()) { const a = rnd(2, 12), c = rnd(a + 1, 20); return Q([a, '+', '?', '=', c], c - a, `${a} plus what makes ${c}?`, takeAid(c, a)); }
  const b = rnd(2, 9), c = rnd(1, 20 - b);
  return Q(['?', MINUS, b, '=', c], b + c, `What take away ${b} leaves ${c}?`, addAid(c, b));
}
function genAdd100(t) {
  const A = (a, b) => Q([a, '+', b, '=', '?'], a + b, `${a} plus ${b}`, {t:'blocks', a, b, op:'+'});
  const S = (a, b) => Q([a, MINUS, b, '=', '?'], a - b, `${a} take away ${b}`, {t:'blocks', a, b, op:MINUS});
  if (t === 0) {
    const r = rnd(1, 3);
    if (r === 1) { const a = 10 * rnd(1, 8); return A(a, 10 * rnd(1, 10 - a / 10)); }
    if (r === 2) { const a = 10 * rnd(2, 10); return S(a, 10 * rnd(1, a / 10 - 1)); }
    const a = rnd(11, 69); return A(a, 10 * rnd(1, Math.floor((99 - a) / 10)));
  }
  if (t === 1) { if (coin()) { const a = rnd(12, 89); return A(a, rnd(2, Math.min(9, 99 - a))); } return S(rnd(12, 99), rnd(2, 9)); }
  if (t === 2) {
    if (coin()) { const at = rnd(1, 7), bt = rnd(1, 8 - at), ao = rnd(0, 8), bo = rnd(0, 9 - ao); return A(10 * at + ao, 10 * bt + bo); }
    const at = rnd(2, 9), bt = rnd(1, at - 1), ao = rnd(1, 9), bo = rnd(0, ao); return S(10 * at + ao, 10 * bt + bo);
  }
  if (coin()) { const ao = rnd(1, 9), bo = rnd(Math.max(1, 10 - ao), 9), at = rnd(1, 7), bt = rnd(1, 8 - at); return A(10 * at + ao, 10 * bt + bo); }
  const at = rnd(2, 9), bt = rnd(1, at - 1), ao = rnd(0, 8), bo = rnd(ao + 1, 9); return S(10 * at + ao, 10 * bt + bo);
}
function genTimes(t) {
  let a, b;
  if (t === 0) { a = pick([2, 5, 10]); b = rnd(1, 10); }
  else if (t === 1) { a = coin(.7) ? pick([3, 4]) : pick([2, 5, 10]); b = rnd(1, 10); }
  else if (t === 2) { a = rnd(6, 9); b = rnd(2, 10); }
  else { a = rnd(2, 12); b = rnd(2, 12); }
  const p = a * b, aid = p <= 72 ? {t:'array', rows:Math.min(a, b), cols:Math.max(a, b)} : null;
  if (t === 3 && coin(.25)) return Q([a, TIMES, '?', '=', p], b, `${a} times what makes ${p}?`, aid, false, {min:1, extra:[b + 1, b - 1, b + 2].filter(x => x > 0)});
  const [x, y] = coin() ? [a, b] : [b, a];
  return Q([x, TIMES, y, '=', '?'], p, `${x} times ${y}`, aid, false, {min:0, extra:[a * (b + 1), a * (b - 1), (a + 1) * b, (a - 1) * b, a + b].filter(v => v > 0 && v !== p)});
}
function genDivide(t) {
  let d, q;
  if (t === 0) { d = pick([2, 5, 10]); q = rnd(1, 10); }
  else if (t === 1) { d = coin(.7) ? pick([3, 4]) : pick([2, 5, 10]); q = rnd(1, 10); }
  else if (t === 2) { d = rnd(6, 9); q = rnd(2, 10); }
  else { d = rnd(2, 12); q = rnd(2, 12); }
  const n = d * q;
  return Q([n, DIV, d, '=', '?'], q, `${n} divided by ${d}`, n <= 60 ? {t:'share', groups:d, each:q} : null, false, {min:1, extra:[q + 1, q - 1, d, q + 2].filter(x => x > 0 && x !== q)});
}
function genMix(t) {
  if (t === 0) { const a = rnd(12, 49), b = rnd(3, 9), p = a * b, [x, y] = coin() ? [a, b] : [b, a]; return Q([x, TIMES, y, '=', '?'], p, `${x} times ${y}`, null, false, {min:1, extra:[p + 10, p - 10, a * (b + 1), a * (b - 1)]}); }
  if (t === 1) { const d = rnd(3, 9), q = rnd(12, 99), n = d * q; return Q([n, DIV, d, '=', '?'], q, `${n} divided by ${d}`, null, false, {min:1, extra:[q + 10, q - 10]}); }
  if (t === 2) {
    const den = pick([2, 3, 4, 5, 10]), nu = den === 2 ? 1 : rnd(1, den - 1), unit = rnd(2, 12), n = den * unit, ans = unit * nu;
    return Q([{frac:[nu, den]}, 'of', n, '=', '?'], ans, `${fracWords(nu, den)} of ${n}`, n <= 60 ? {t:'frac', den, nu, unit} : null, false, {min:1, extra:[unit, n - ans, ans + unit, ans - unit].filter(x => x > 0 && x !== ans)});
  }
  const pc = pick([10, 20, 25, 50, 75]), base = (pc === 25 || pc === 75) ? 4 * rnd(3, 25) : 10 * rnd(2, 20), ans = base * pc / 100;
  return Q([pc + '%', 'of', base, '=', '?'], ans, `${pc} percent of ${base}`, null, false, {min:1, extra:[base / 10, base / 2, base / 4, ans + base / 10].filter(x => Number.isInteger(x) && x > 0 && x !== ans)});
}
const GEN = {count:genCount, add10:genAdd10, add20:genAdd20, add100:genAdd100, times:genTimes, divide:genDivide, mix:genMix};
PUM.gen = function (level, tier, theme = 'trucks') {
  const q = GEN[level](clamp(tier, 0, PUM.maxTier(level)), theme);
  q.key = JSON.stringify([q.disp, q.ans]);
  return q;
};

/* ---------- rendering pieces ---------- */
const dots = (n, color, cls = '') => n === 0 ? `<span class="dots zero ${cls}"></span>` : `<span class="dots ${cls}" style="--c:var(--${color})">${'<i></i>'.repeat(n)}</span>`;
const blocks = n => `<span class="blocks"><span class="rods">${'<i class="rod"></i>'.repeat(Math.floor(n / 10))}</span><span class="ones">${'<i></i>'.repeat(n % 10)}</span></span>`;
function renderAid(a) {
  switch (a.t) {
    case 'dots': return `<div class="aid-row">${dots(a.a, 'sea')}<span class="aop">+</span>${dots(a.b, 'marigold')}</div>`;
    case 'take': return `<div class="aid-row"><span class="dots" style="--c:var(--sea)">${Array.from({length:a.total}, (_, i) => i >= a.total - a.remove ? '<i class="x"></i>' : '<i></i>').join('')}</span></div><div class="aid-cap">${a.total} take away ${a.remove}</div>`;
    case 'blocks': return `<div class="aid-row">${blocks(a.a)}<span class="aop">${a.op}</span>${blocks(a.b)}</div><div class="aid-cap">Tall bars are tens, small squares are ones</div>`;
    case 'array': return `<div class="arr" style="--cols:${a.cols}">${'<i></i>'.repeat(a.rows * a.cols)}</div><div class="aid-cap">${a.rows} rows of ${a.cols}</div>`;
    case 'share': return `<div class="bowls">${Array.from({length:a.groups}, () => `<span class="bowl">${dots(a.each, 'plum')}</span>`).join('')}</div><div class="aid-cap">${a.groups * a.each} shared into ${a.groups} equal groups</div>`;
    case 'frac': return `<div class="bowls">${Array.from({length:a.den}, (_, i) => `<span class="bowl ${i < a.nu ? 'hi' : ''}">${dots(a.unit, i < a.nu ? 'leaf' : 'line-soft')}</span>`).join('')}</div><div class="aid-cap">${a.den * a.unit} split into ${a.den} equal groups, take ${a.nu}</div>`;
  }
  return '';
}
function tok(p) {
  if (p && typeof p === 'object' && p.frac) return `<span class="tok frac"><sup>${p.frac[0]}</sup><sub>${p.frac[1]}</sub></span>`;
  const op = ['+', MINUS, TIMES, DIV, '='].includes(p);
  return `<span class="tok ${op ? 'op' : ''} ${p === 'of' ? 'word' : ''}">${esc(p)}</span>`;
}

/* ---------- quiz panel: used for training rounds and mid-game refuels ---------- */
PUM.Quiz = function (mount, opts) {
  const self = {q:null, answered:false, picked:null, correct:null, typed:'', hint:false, msg:'', fresh:true, lastKey:'', timer:null, stopped:false};
  const player = () => opts.player();
  const lv = (p, id) => p.levels[id] || (p.levels[id] = {tier:0, streak:0, misses:0, stars:0});

  self.next = () => {
    clearTimeout(self.timer);
    const p = player(); if (!p) return;
    const L = lv(p, p.world);
    let q, g = 0;
    do { q = PUM.gen(p.world, L.tier, p.theme); } while (q.key === self.lastKey && g++ < 8);
    Object.assign(self, {q, lastKey:q.key, tier:L.tier, answered:false, picked:null, correct:null, typed:'', hint:false, msg:'', fresh:true});
    self.render();
    if (p.speak) PUM.audio.say(q.spoken);
  };
  self.answer = v => {
    if (self.answered || self.stopped) return;
    const p = player(); if (!p) return;
    const q = self.q, ok = v === q.ans, L = lv(p, p.world);
    let up = false, mp = 0;
    Object.assign(self, {answered:true, picked:v, correct:ok, msg:ok ? pick(PRAISE) : ''});
    if (ok) {
      p.stars++; L.stars++; L.misses = 0;
      if (!self.hint) L.streak++;
      mp = 1 + (L.streak > 0 && L.streak % 3 === 0 ? 2 : 0);
      if (L.streak >= 3 && L.tier < PUM.maxTier(p.world) && L.streak % 3 === 0) { L.tier++; up = true; }
      p.mp += mp; p.mpTotal += mp;
    } else {
      L.streak = 0; L.misses++;
      if (L.misses >= 2 && L.tier > 0) { L.tier--; L.misses = 0; }
    }
    PUM.audio.sfx(ok ? 'yes' : 'no');
    const res = opts.onAnswer ? opts.onAnswer(ok, {mp, up}) : null;
    self.render();
    if (ok) {
      PUM.fx.burst(mount.querySelector('.choice.good') || mount.querySelector('.slot'));
      if (mp > 1) PUM.fx.toast(`+${mp} math points! Streak bonus`);
      else if (up) PUM.fx.toast(`${icon('up')} Math step up!`);
      if (p.speak) PUM.audio.say(self.msg);
      if (res !== 'hold') self.timer = setTimeout(() => { if (!self.stopped) (opts.onAdvance ? opts.onAdvance() : self.next()); }, up ? 1300 : 1000);
    } else if (p.speak) PUM.audio.say(`Nice try. It's ${q.ans}.`);
  };
  self.stop = () => { self.stopped = true; clearTimeout(self.timer); };
  self.render = () => {
    const p = player(); if (!p || !self.q) return;
    const q = self.q, l = LV[p.world];
    const keypad = p.mode === 'keypad' && p.world !== 'count' && q.kind === 'num';
    let aid = '';
    if (q.aid && (q.aidShown || self.hint || (self.answered && !self.correct))) aid = `<div class="aid">${renderAid(q.aid)}</div>`;
    else if (q.aid && !self.answered) aid = `<button class="btn small" data-q="hint">${icon('bulb')} Show me</button>`;
    let fb = '';
    if (self.answered) {
      const msg = self.correct ? self.msg : q.kind === 'group' ? `Nice try! This group has <b>${q.ans}</b>.` : `Nice try! It's <b>${q.ans}</b>.`;
      fb = `<div class="fb ${self.correct ? 'good' : 'soft'}"><span class="fb-msg">${msg}</span>${self.correct ? '' : `<button class="btn primary next" data-q="next" aria-label="Next question">${icon('next')}</button>`}</div>`;
    }
    mount.innerHTML = `<div class="quiz ${opts.compact ? 'compact' : ''}">
      <div class="qstage">
        <div class="wtag" style="--wc:var(--${l.color})">${esc(l.name)} &middot; Step ${self.tier + 1} of ${l.steps.length}<button class="say" data-q="say" aria-label="Read the question out loud">${icon('talk')}</button></div>
        ${q.label ? `<div class="qlabel">${q.label}</div>` : ''}
        <div class="q">${renderDisp(q)}</div>
        ${aid}${fb}
      </div>
      <div class="answers">${keypad ? renderPad() : renderChoices(q)}</div>
    </div>`;
    self.fresh = false;
  };
  const slot = q => `<span class="slot ${self.answered ? (self.correct ? 'good' : 'reveal') : ''}">${esc(self.answered ? q.ans : (self.typed || '?'))}</span>`;
  function renderDisp(q) {
    const d = q.disp;
    if (d.t === 'count') {
      const reveal = self.answered && !self.correct;
      return `<div class="objs ${d.n > 10 ? 'many' : d.n <= 3 ? 'few' : ''} ${self.fresh ? 'enter' : ''}" style="--cols:${Math.min(d.n, 5)}" role="img" aria-label="${d.n} things">${Array.from({length:d.n}, (_, i) => `<span class="obj" style="--i:${i}">${PUM.shapeSVG(d.obj, d.color)}${reveal ? `<b class="num">${i + 1}</b>` : ''}</span>`).join('')}</div>`;
    }
    if (d.t === 'numeral') return `<div class="bignum">${d.n}</div>`;
    if (d.t === 'seq') return `<div class="expr">${d.nums.map(n => `<span class="tok tile">${n}</span>`).join('')}${slot(q)}</div>`;
    return `<div class="expr" role="text">${d.parts.map(p => p === '?' ? slot(q) : tok(p)).join('')}</div>`;
  }
  function renderChoices(q) {
    return `<div class="choices c${q.choices.length} ${q.kind === 'group' ? 'groups' : ''}">${q.choices.map(c => {
      const st = self.answered ? (c === q.ans ? 'good' : c === self.picked ? 'miss' : 'dim') : '';
      const inner = q.kind === 'group' ? dots(c, q.color || 'sea', 'gdots') : `<span class="cnum">${c}</span>${q.mini && c <= 10 ? dots(c, 'ink-soft', 'mini') : ''}`;
      return `<button class="choice ${st}" data-q="choose" data-v="${c}" aria-label="${c}" ${self.answered ? 'disabled' : ''}>${inner}</button>`;
    }).join('')}</div>`;
  }
  function renderPad() {
    return `<div class="pad">${['1','2','3','4','5','6','7','8','9','del','0','ok'].map(k => {
      const label = k === 'del' ? 'Delete' : k === 'ok' ? 'Check answer' : k;
      return `<button class="key ${k === 'ok' ? 'ok' : ''} ${k === 'del' ? 'del' : ''}" data-q="key" data-k="${k}" aria-label="${label}" ${(self.answered || (k === 'ok' && !self.typed)) ? 'disabled' : ''}>${k === 'del' ? icon('back') : k === 'ok' ? icon('check') : k}</button>`;
    }).join('')}</div>`;
  }
  function updateSlot() {
    const s = mount.querySelector('.slot'); if (s) s.textContent = self.typed || '?';
    const ok = mount.querySelector('.key.ok'); if (ok) ok.disabled = !self.typed;
  }
  function onClick(e) {
    const el = e.target.closest('[data-q]'); if (!el || el.disabled || self.stopped) return;
    PUM.audio.ac();
    const a = el.dataset.q;
    if (a === 'choose') self.answer(Number(el.dataset.v));
    else if (a === 'next') { if (opts.onAdvance) opts.onAdvance(); else self.next(); }
    else if (a === 'hint') { self.hint = true; PUM.audio.sfx('tap'); self.render(); }
    else if (a === 'say') { if (PUM.store.S.muted) PUM.fx.toast('Sound is off'); else PUM.audio.say(self.q.spoken); }
    else if (a === 'key') {
      if (self.answered) return;
      const k = el.dataset.k;
      if (k === 'ok') { if (self.typed) self.answer(Number(self.typed)); return; }
      if (k === 'del') self.typed = self.typed.slice(0, -1);
      else if (self.typed.length < 4) self.typed = (self.typed === '0' ? '' : self.typed) + k;
      PUM.audio.sfx('tap'); updateSlot();
    }
  }
  self.key = e => {
    if (self.stopped || !self.q) return false;
    if (self.answered) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (!self.correct) (opts.onAdvance ? opts.onAdvance() : self.next()); } return true; }
    if (!mount.querySelector('.slot')) return false;
    if (/^[0-9]$/.test(e.key)) { if (self.typed.length < 4) { self.typed = (self.typed === '0' ? '' : self.typed) + e.key; updateSlot(); } return true; }
    if (e.key === 'Backspace') { self.typed = self.typed.slice(0, -1); updateSlot(); return true; }
    if (e.key === 'Enter' && self.typed) { e.preventDefault(); self.answer(Number(self.typed)); return true; }
    return false;
  };
  mount.addEventListener('click', onClick);
  self.destroy = () => { self.stop(); mount.removeEventListener('click', onClick); };
  return self;
};
})();
