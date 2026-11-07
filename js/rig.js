/* Power-Up Math: Big Rig Builders. Building jobs, truck and machine art, the town map,
   and the loading, building site and crane mini-games. */
(function () {
'use strict';
const {clamp, lerp, mulberry32} = PUM.util;
const E = PUM.engine, CR = PUM.CREW;
/* Storybook colours: brown ink, warm metal and glass, and every paint colour warmed. */
const P = c => c === 'ink' ? CR.LINE : c === 'tire' ? CR.PAL.tire : c === 'metal' ? CR.PAL.metal : c === 'glass' ? CR.PAL.glass : CR.warm(E.col(c));
const OT = (ctx, text, x, y, size, fill = '#FFF4DC') => CR.text(ctx, text, x, y, size * 1.12, fill);
const CP = PUM.CAMPAIGN;
const R = PUM.RIG = {};
PUM.games = PUM.games || {};

/* ---------- data ---------- */
R.TRUCKS = [
  {k:'dump', name:'Dump truck', carries:'Gravel and dirt', how:'Steady, the all-rounder', need:0, def:null},
  {k:'flatbed', name:'Flatbed', carries:'Bricks and steel beams', how:'Fast, but watch the bumps', need:0, def:'sea'},
  {k:'mixer', name:'Cement mixer', carries:'Concrete', how:'Concrete sets, so be quick', need:2, def:'star'},
  {k:'crane', name:'Crane truck', carries:'Lifts big pieces', how:'Heavy and wide', need:5, def:'marigold'},
];
R.MATS = {
  dirt:{name:'dirt', unit:'scoops', truck:'dump', col:'#A87A50', loader:'excavator'},
  gravel:{name:'gravel', unit:'tons', truck:'dump', col:'#9AA0AA', loader:'excavator'},
  bricks:{name:'bricks', unit:'pallets', truck:'flatbed', col:'#C8553D', loader:'forklift'},
  beams:{name:'steel beams', unit:'beams', truck:'flatbed', col:'#5E87B5', loader:'forklift'},
  concrete:{name:'concrete', unit:'tons', truck:'mixer', col:'#B9BFC7', loader:'chute'},
};
R.JOBS = [
  {b:'house', steps:['dig', 'gravel', 'bricks', 'crane'], piece:'roof', color:'#E8577A', h:.66, gives:null, givesText:'Your company\'s first building! The gas station lot opens next.'},
  {b:'gas', steps:['dig', 'gravel', 'bricks', 'crane'], piece:'canopy', color:'#2F95D6', h:.5, gives:'tank', givesText:'A bigger fuel tank on every trip.'},
  {b:'mechanic', steps:['dig', 'concrete', 'bricks', 'crane'], piece:'sign', color:'#FF8A3D', h:.52, gives:'bumper', givesText:'Your first crash on each trip loses no cargo.'},
  {b:'school', steps:['dig', 'concrete', 'bricks', 'bricks', 'crane'], piece:'bell', color:'#FFC233', h:.78, gives:'hint', givesText:'One wrong answer lane is crossed out at every math gate.'},
  {b:'bridge', steps:['dig', 'concrete', 'beams', 'concrete', 'beams', 'crane'], piece:'span', color:'#7357DB', h:.46, gives:'road', givesText:'Opens the road to the Hills.'},
  /* The Hills */
  {b:'quarry', steps:['dig', 'gravel', 'concrete', 'beams', 'crane'], piece:'conveyor', color:'#E0893F', h:.56, gives:'stone', givesText:'Your own quarry! Every gravel delivery pays 3 extra coins.'},
  {b:'soccer', steps:['dig', 'gravel', 'bricks', 'beams', 'crane'], piece:'goal', color:'#22A06B', h:.52, gives:'fans', givesText:'Your fans cheer you on: 5 extra seconds on the clock every trip.'},
  {b:'hospital', steps:['dig', 'concrete', 'bricks', 'bricks', 'beams', 'crane'], piece:'cross', color:'#F4EEE4', h:.76, gives:'medic', givesText:'The hospital looks after your trucks: less cargo falls off when you crash.'},
  {b:'fire', steps:['dig', 'gravel', 'concrete', 'bricks', 'beams', 'crane'], piece:'siren', color:'#D9493A', h:.58, gives:'siren', givesText:'Fire truck turbo: turbo from the math gates lasts longer.'},
  {b:'tunnel', steps:['dig', 'gravel', 'concrete', 'beams', 'concrete', 'bricks', 'crane'], piece:'portal', color:'#8E6640', h:.56, gives:'tunnel', givesText:'Opens the road to Big City.'},
  /* Big City */
  {b:'station', steps:['dig', 'gravel', 'concrete', 'bricks', 'beams', 'crane'], piece:'clock', color:'#2F95D6', h:.76, gives:'freight', givesText:'Freight trains help out: every delivery pays 2 more coins.'},
  {b:'apartment', steps:['dig', 'concrete', 'beams', 'bricks', 'bricks', 'bricks', 'crane'], piece:'tank', color:'#E8577A', h:1.04, gives:'crew', givesText:'Your crew moves in! Every finished job pays 5 more coins.'},
  {b:'mall', steps:['dig', 'gravel', 'concrete', 'beams', 'bricks', 'concrete', 'crane'], piece:'dome', color:'#7357DB', h:.5, gives:'paint', givesText:'The paint shop opens: painting your trucks is free!'},
  {b:'stadium', steps:['dig', 'gravel', 'concrete', 'concrete', 'bricks', 'beams', 'crane'], piece:'scoreboard', color:'#22A06B', h:.56, gives:'crowd', givesText:'The crowd cheers: every right answer at a math gate pays a bonus coin.'},
  {b:'skyscraper', steps:['dig', 'concrete', 'beams', 'beams', 'concrete', 'bricks', 'crane'], piece:'spire', color:'#5E87B5', h:1.34, gives:null, givesText:'The tallest tower in Big City. You built the whole town!'},
];
R.PIECE = {roof:'roof', canopy:'canopy', sign:'sign', bell:'bell tower', span:'bridge deck', conveyor:'conveyor belt', goal:'goal', cross:'red cross sign', siren:'fire siren', portal:'tunnel sign', clock:'clock tower', tank:'water tank', dome:'glass dome', scoreboard:'scoreboard', spire:'spire'};
R.PIECE_H = {roof:.27, canopy:.1, sign:.17, bell:.37, span:.16, conveyor:.26, goal:.14, cross:.24, siren:.2, portal:.15, clock:.3, tank:.2, dome:.18, scoreboard:.2, spire:.38};
/* building height without the crane piece, in building widths */
R.hb = job => Math.max(.2, (job.h || .6) - (R.PIECE_H[job.piece] || .2));
R.ACTIVE = R.JOBS.length;
R.job = i => Object.assign({i}, CP.trucks.levels[i], R.JOBS[i] || {});
R.built = (p, i) => p.prog.trucks.stars[i] > 0;
R.builtCount = p => R.JOBS.filter((_, i) => R.built(p, i)).length;
R.owns = (p, k) => { const t = R.TRUCKS.find(x => x.k === k); return !!t && R.builtCount(p) >= t.need; };
R.bonus = (p, key) => R.JOBS.some((j, i) => j.gives === key && R.built(p, i));
R.paint = (p, k) => (p.rig && p.rig.paint[k]) || (k === 'dump' ? p.color : R.TRUCKS.find(t => t.k === k).def);
R.stepLabel = (step, job) => step === 'dig' ? 'Dig the foundation' : step === 'crane' ? `Lift the ${R.PIECE[job.piece]}` : `Bring ${R.MATS[step].name}`;
R.truckName = k => R.TRUCKS.find(t => t.k === k).name;
/* Scoop buttons by math level, so the buttons don't give the answer away. */
R.scoops = p => ({count:[1], add10:[1], add20:[1, 5], add100:[1, 10], times:[1, 10], divide:[1, 5], mix:[1, 10, 100]})[p.world] || [1];
R.paintCost = 3;
R.paintPrice = p => R.bonus(p, 'paint') ? 0 : R.paintCost;
/* bonus coins from finished buildings on each delivery */
R.tripBonus = (p, mat) => (R.bonus(p, 'stone') && mat === 'gravel' ? 3 : 0) + (R.bonus(p, 'freight') ? 2 : 0);
R.world = i => CP.trucks.levels[Math.max(0, Math.min(CP.count - 1, i))].world;

/* ---------- art: side views, facing right. x = centre, y = ground, s = length in px ---------- */
function ink(ctx, s) { ctx.strokeStyle = P('ink'); ctx.lineWidth = Math.max(1.5, s * .014); ctx.lineJoin = 'round'; ctx.lineCap = 'round'; }
function wheel(ctx, x, y, r, t) {
  ctx.fillStyle = P('tire'); ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#B9BFC7'; ctx.beginPath(); ctx.arc(x, y, r * .45, 0, 7); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = '#6E7480'; ctx.beginPath(); const a = t || 0; ctx.moveTo(x + Math.cos(a) * r * .4, y + Math.sin(a) * r * .4); ctx.lineTo(x - Math.cos(a) * r * .4, y - Math.sin(a) * r * .4); ctx.stroke(); ctx.strokeStyle = P('ink');
}
function boxes(ctx, n, x0, x1, base, bw, bh, col, beams) {
  const per = Math.max(1, Math.floor((x1 - x0) / bw)), shown = Math.min(n, per * 4);
  for (let k = 0; k < shown; k++) {
    const row = Math.floor(k / per), c = k % per;
    if (beams) { ctx.fillStyle = col; E.rr(ctx, x0, base - (row + 1) * bh * .5 - c * 1.2, x1 - x0, bh * .42, bh * .1); ctx.fill(); ctx.stroke(); if (row * per + c >= shown - 1) break; continue; }
    const bx = x0 + c * bw, by = base - (row + 1) * bh;
    ctx.fillStyle = col; ctx.fillRect(bx + 1, by + 1, bw - 2, bh - 2); ctx.strokeRect(bx + 1, by + 1, bw - 2, bh - 2);
    ctx.strokeStyle = 'rgba(255,255,255,.45)'; ctx.beginPath(); ctx.moveTo(bx + 2, by + bh / 2); ctx.lineTo(bx + bw - 2, by + bh / 2); ctx.stroke(); ctx.strokeStyle = P('ink');
  }
  if (n > shown) OT(ctx, `+${n - shown}`, (x0 + x1) / 2, base - 4.6 * bh, bh * .9, '#FFFFFF');
}
/* load: a count (loader) or a 0..1 fraction (road); mat: material key */
R.drawTruck = function (ctx, kind, x, y, s, color, o = {}) {
  const mat = o.mat, load = o.load || 0, M = R.MATS[mat];
  const q = Object.assign({}, o, {t:o.t || 0, roll:o.roll || 0, spin:o.spin != null ? o.spin : (o.t || 0) * 2, loadCol:M ? M.col : null});
  if (kind === 'dump' && load > 0) q.loadFrac = o.frac != null ? o.frac : 1 - Math.exp(-load / 8);
  if (kind === 'flatbed' && load > 0) { q.boxes = o.frac != null ? Math.ceil(o.frac * 8) : load; q.beams = mat === 'beams'; }
  if (kind === 'mixer' && load > 0 && o.frac == null) q.drumNum = load;
  if (kind === 'crane' && !o.tip && o.len == null) { q.len = 150; q.boom = -1.3; q.hook = 34; }
  CR.truck(ctx, kind, x, y, s, E.col(color), q);
};
R.drawTruckOld = function (ctx, kind, x, y, s, color, o = {}) {
  const t = o.t || 0, mat = o.mat, load = o.load || 0, col = P(color);
  ctx.save(); ink(ctx, s);
  ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.beginPath(); ctx.ellipse(x, y, s * .5, s * .035, 0, 0, 7); ctx.fill();
  const wr = s * .085, wy = y - wr;
  ctx.fillStyle = P('metal'); E.rr(ctx, x - s * .48, wy - s * .07, s * .95, s * .06, s * .02); ctx.fill(); ctx.stroke();
  /* cab */
  ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x + s * .17, wy - s * .04); ctx.lineTo(x + s * .17, y - s * .44); ctx.lineTo(x + s * .35, y - s * .44); ctx.lineTo(x + s * .47, y - s * .29); ctx.lineTo(x + s * .48, wy - s * .04); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = P('glass'); ctx.beginPath(); ctx.moveTo(x + s * .22, y - s * .4); ctx.lineTo(x + s * .34, y - s * .4); ctx.lineTo(x + s * .43, y - s * .3); ctx.lineTo(x + s * .22, y - s * .3); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#FFF4B0'; ctx.beginPath(); ctx.arc(x + s * .46, wy - s * .1, s * .02, 0, 7); ctx.fill();
  const bx0 = x - s * .47, bx1 = x + s * .14, base = wy - s * .07;
  if (kind === 'dump') {
    const top = y - s * .43, tip = o.tip || 0;
    if (tip > 0) { ctx.fillStyle = P('metal'); ctx.fillRect(x - s * .05, base - s * .02 - tip * s * .2, s * .04, tip * s * .2 + s * .02); ctx.strokeRect(x - s * .05, base - s * .02 - tip * s * .2, s * .04, tip * s * .2 + s * .02); }
    ctx.save(); ctx.translate(bx0 + s * .03, base); ctx.rotate(-tip * .7); ctx.translate(-(bx0 + s * .03), -base);
    if (load > 0) {
      const f = o.frac != null ? o.frac : 1 - Math.exp(-load / 8), mc = R.MATS[mat] ? R.MATS[mat].col : '#9AA0AA';
      ctx.fillStyle = mc; ctx.beginPath(); ctx.moveTo(bx0 + s * .02, top + s * .04); ctx.quadraticCurveTo((bx0 + bx1) / 2, top - f * s * .3, bx1 - s * .02, top + s * .04); ctx.closePath(); ctx.fill(); ctx.stroke();
    }
    ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(bx0, top); ctx.lineTo(bx1, top); ctx.lineTo(bx1 - s * .03, base); ctx.lineTo(bx0 + s * .05, base); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); for (const f of [.3, .6]) { ctx.moveTo(bx0 + s * .04, lerp(top, base, f)); ctx.lineTo(bx1 - s * .03, lerp(top, base, f)); } ctx.stroke();
    ctx.restore(); ink(ctx, s);
  } else if (kind === 'flatbed') {
    ctx.fillStyle = P('metal'); ctx.fillRect(bx0, base - s * .05, bx1 - bx0, s * .05); ctx.strokeRect(bx0, base - s * .05, bx1 - bx0, s * .05);
    ctx.fillStyle = col; ctx.fillRect(bx1 - s * .02, base - s * .22, s * .03, s * .17); ctx.strokeRect(bx1 - s * .02, base - s * .22, s * .03, s * .17);
    if (load > 0) {
      const n = o.frac != null ? Math.ceil(o.frac * 8) : load;
      boxes(ctx, n, bx0 + s * .01, bx1 - s * .03, base - s * .05, s * .095, s * .075, R.MATS[mat] ? R.MATS[mat].col : P('brick'), mat === 'beams');
    }
  } else if (kind === 'mixer') {
    const cx = x - s * .17, cy = y - s * .33;
    ctx.fillStyle = P('metal'); ctx.fillRect(x - s * .44, base - s * .05, s * .58, s * .05); ctx.strokeRect(x - s * .44, base - s * .05, s * .58, s * .05);
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(-.18);
    ctx.fillStyle = '#E6E9EE'; ctx.beginPath(); ctx.ellipse(0, 0, s * .29, s * .13, 0, 0, 7); ctx.fill(); ctx.stroke();
    ctx.save(); ctx.beginPath(); ctx.ellipse(0, 0, s * .29, s * .13, 0, 0, 7); ctx.clip();
    ctx.strokeStyle = col; ctx.lineWidth = s * .045; const sp = (o.spin != null ? o.spin : t * 2) % 1;
    for (let k = -4; k < 5; k++) { const sx = (k + sp) * s * .12; ctx.beginPath(); ctx.moveTo(sx - s * .08, -s * .14); ctx.lineTo(sx + s * .08, s * .14); ctx.stroke(); }
    ctx.restore(); ctx.strokeStyle = P('ink'); ctx.lineWidth = Math.max(1.5, s * .014);
    ctx.beginPath(); ctx.ellipse(0, 0, s * .29, s * .13, 0, 0, 7); ctx.stroke();
    ctx.fillStyle = '#9AA0AA'; ctx.beginPath(); ctx.moveTo(-s * .29, -s * .05); ctx.lineTo(-s * .36, -s * .1); ctx.lineTo(-s * .36, s * .02); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
    if (o.pour) { ctx.lineWidth = s * .05; ctx.strokeStyle = P('ink'); ctx.beginPath(); ctx.moveTo(x - s * .46, y - s * .3); ctx.lineTo(x - s * .66, y - s * .16); ctx.stroke(); ctx.lineWidth = s * .03; ctx.strokeStyle = '#9AA0AA'; ctx.beginPath(); ctx.moveTo(x - s * .46, y - s * .3); ctx.lineTo(x - s * .66, y - s * .16); ctx.stroke(); ink(ctx, s); }
    if (load > 0 && o.frac == null) E.numText(ctx, String(load), cx, cy - s * .01, s * .1, '#FFFFFF');
  } else if (kind === 'crane') {
    ctx.fillStyle = P('metal'); ctx.fillRect(bx0, base - s * .05, bx1 - bx0, s * .05); ctx.strokeRect(bx0, base - s * .05, bx1 - bx0, s * .05);
    ctx.fillStyle = col; E.rr(ctx, x - s * .3, base - s * .14, s * .22, s * .1, s * .02); ctx.fill(); ctx.stroke();
    ctx.lineWidth = s * .05; ctx.strokeStyle = P('ink'); ctx.beginPath(); ctx.moveTo(x - s * .2, base - s * .12); ctx.lineTo(x - s * .55, y - s * .8); ctx.stroke();
    ctx.lineWidth = s * .03; ctx.strokeStyle = col; ctx.beginPath(); ctx.moveTo(x - s * .2, base - s * .12); ctx.lineTo(x - s * .55, y - s * .8); ctx.stroke();
    ink(ctx, s); ctx.beginPath(); ctx.moveTo(x - s * .55, y - s * .8); ctx.lineTo(x - s * .55, y - s * .5); ctx.stroke();
    ctx.fillStyle = P('star'); ctx.beginPath(); ctx.arc(x - s * .55, y - s * .48, s * .025, 0, 7); ctx.fill(); ctx.stroke();
  }
  for (const wx of [x - s * .33, x - s * .14, x + s * .32]) wheel(ctx, wx, wy, wr, (o.roll || 0));
  ctx.restore();
};
/* Excavator facing right. (bx, by) = where the bucket is; full = bucket holds dirt. */
R.drawExcavator = function (ctx, x, y, s, color, bx, by, o = {}) { CR.excavator(ctx, x, y, s, E.col(color), bx, by, o); };
R.drawExcavatorOld = function (ctx, x, y, s, color, bx, by, o = {}) {
  const col = P(color);
  ctx.save(); ink(ctx, s);
  ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.beginPath(); ctx.ellipse(x, y, s * .5, s * .04, 0, 0, 7); ctx.fill();
  ctx.fillStyle = P('metal'); E.rr(ctx, x - s * .46, y - s * .18, s * .84, s * .18, s * .09); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#9AA0AA'; for (let k = 0; k < 5; k++) { ctx.beginPath(); ctx.arc(x - s * .36 + k * s * .16, y - s * .09, s * .045, 0, 7); ctx.fill(); ctx.stroke(); }
  /* The upper body turns on the tracks: face 1 = facing right, -1 = facing left. (bx, by) is in the
     facing-right frame, so the caller gives the reach as if the machine faced right. */
  const face = o.face == null ? 1 : (Math.abs(o.face) < .12 ? (o.face < 0 ? -.12 : .12) : o.face);
  ctx.save(); ctx.translate(x, 0); ctx.scale(face, 1); ctx.translate(-x, 0);
  ctx.lineWidth = Math.max(1.5, s * .014) / Math.max(.4, Math.abs(face));
  ctx.fillStyle = col; E.rr(ctx, x - s * .42, y - s * .42, s * .64, s * .22, s * .04); ctx.fill(); ctx.stroke();
  ctx.fillStyle = E.shade(col, -.2); E.rr(ctx, x - s * .46, y - s * .4, s * .12, s * .18, s * .03); ctx.fill(); ctx.stroke();
  ctx.fillStyle = col; E.rr(ctx, x - s * .06, y - s * .7, s * .26, s * .3, s * .04); ctx.fill(); ctx.stroke();
  ctx.fillStyle = P('glass'); E.rr(ctx, x - s * .01, y - s * .65, s * .17, s * .16, s * .02); ctx.fill(); ctx.stroke();
  /* two-bone arm */
  const px = x + s * .2, py = y - s * .44, L1 = s * .58, L2 = s * .5;
  const dx = bx - px, dy = by - py, d = clamp(Math.hypot(dx, dy), s * .15, L1 + L2 - 1), a = Math.atan2(dy, dx);
  const e = a - Math.acos(clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1));
  const ex = px + Math.cos(e) * L1, ey = py + Math.sin(e) * L1;
  const tx = px + Math.cos(a) * d, ty = py + Math.sin(a) * d;
  for (const [w, c] of [[s * .085, P('ink')], [s * .055, P('star')]]) { ctx.strokeStyle = c; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(ex, ey); ctx.lineTo(tx, ty); ctx.stroke(); }
  ink(ctx, s); ctx.fillStyle = P('metal'); ctx.beginPath(); ctx.arc(ex, ey, s * .03, 0, 7); ctx.fill(); ctx.stroke();
  ctx.save(); ctx.translate(tx, ty); ctx.rotate(o.tip || 0);
  ctx.fillStyle = P('metal'); ctx.beginPath(); ctx.moveTo(-s * .04, -s * .04); ctx.lineTo(s * .1, -s * .02); ctx.lineTo(s * .08, s * .1); ctx.lineTo(-s * .06, s * .06); ctx.closePath(); ctx.fill(); ctx.stroke();
  if (o.full) { ctx.fillStyle = o.matCol || '#A87A50'; ctx.beginPath(); ctx.ellipse(s * .02, -s * .045, s * .07, s * .035, 0, 0, 7); ctx.fill(); ctx.stroke(); }
  ctx.restore();
  ctx.restore();
  ctx.restore();
};
R.drawForklift = function (ctx, x, y, s, color, lift, carry, mat) {
  ctx.save(); ink(ctx, s);
  ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.beginPath(); ctx.ellipse(x, y, s * .4, s * .04, 0, 0, 7); ctx.fill();
  ctx.fillStyle = P(color); E.rr(ctx, x - s * .3, y - s * .36, s * .5, s * .26, s * .05); ctx.fill(); ctx.stroke();
  ctx.fillStyle = P('glass'); E.rr(ctx, x - s * .2, y - s * .62, s * .26, s * .26, s * .03); ctx.fill(); ctx.stroke();
  ctx.fillStyle = P('metal'); ctx.fillRect(x - s * .22, y - s * .65, s * .3, s * .04); ctx.strokeRect(x - s * .22, y - s * .65, s * .3, s * .04);
  ctx.fillRect(x + s * .2, y - s * .8, s * .05, s * .72); ctx.strokeRect(x + s * .2, y - s * .8, s * .05, s * .72);
  const fy = y - s * .1 - lift;
  ctx.fillRect(x + s * .25, fy - s * .03, s * .3, s * .03); ctx.strokeRect(x + s * .25, fy - s * .03, s * .3, s * .03);
  if (carry) { const m = R.MATS[mat]; if (mat === 'beams') { ctx.fillStyle = m.col; for (let k = 0; k < Math.min(3, carry); k++) { E.rr(ctx, x + s * .2, fy - s * .1 - k * s * .07, s * .42, s * .06, s * .01); ctx.fill(); ctx.stroke(); } } else { ctx.fillStyle = m.col; const h = s * (carry > 1 ? .24 : .14); ctx.fillRect(x + s * .27, fy - s * .03 - h, s * .26, h); ctx.strokeRect(x + s * .27, fy - s * .03 - h, s * .26, h); } if (carry > 1) OT(ctx, `×${carry}`, x + s * .4, fy - s * .3, s * .14, '#FFFFFF'); }
  wheel(ctx, x - s * .18, y - s * .09, s * .09); wheel(ctx, x + s * .12, y - s * .09, s * .09);
  ctx.restore();
};
R.drawSilo = function (ctx, x, y, s, pour, toX, toY, t) {
  ctx.save(); ink(ctx, s);
  ctx.fillStyle = P('metal'); for (const lx of [-.18, .18]) ctx.fillRect(x + lx * s - s * .02, y - s * .5, s * .04, s * .5);
  ctx.fillStyle = '#D9DEE8'; E.rr(ctx, x - s * .24, y - s * 1.3, s * .48, s * .7, s * .06); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x - s * .24, y - s * .62); ctx.lineTo(x + s * .24, y - s * .62); ctx.lineTo(x + s * .04, y - s * .48); ctx.lineTo(x - s * .04, y - s * .48); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = P('marigold'); ctx.fillRect(x - s * .24, y - s * 1.14, s * .48, s * .07); ctx.strokeRect(x - s * .24, y - s * 1.14, s * .48, s * .07);
  ctx.lineWidth = s * .06; ctx.strokeStyle = P('ink'); ctx.beginPath(); ctx.moveTo(x, y - s * .48); ctx.lineTo(toX, toY - s * .06); ctx.stroke();
  ctx.lineWidth = s * .035; ctx.strokeStyle = '#9AA0AA'; ctx.beginPath(); ctx.moveTo(x, y - s * .48); ctx.lineTo(toX, toY - s * .06); ctx.stroke();
  if (pour) { ctx.fillStyle = '#B9BFC7'; for (let k = 0; k < 6; k++) { const f = ((t * 3 + k / 6) % 1); ctx.beginPath(); ctx.arc(toX + Math.sin(k * 3) * 3, toY - s * .06 + f * s * .1, s * .03, 0, 7); ctx.fill(); } }
  ctx.restore();
};

/* ---------- buildings ---------- */
function win(ctx, x, y, w, h) { ctx.fillStyle = P('glass'); ctx.fillRect(x, y, w, h); ctx.strokeRect(x, y, w, h); }
/* The finished top piece, drawn with its bottom edge at y. */
R.drawPiece = function (ctx, job, x, y, w, t = 0) {
  ctx.save(); ink(ctx, w);
  const pc = job.piece;
  if (pc === 'roof') { ctx.fillStyle = '#7A3B4F'; ctx.beginPath(); ctx.moveTo(x - w * .38, y); ctx.lineTo(x, y - w * .26); ctx.lineTo(x + w * .38, y); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillStyle = P('brick'); ctx.fillRect(x + w * .14, y - w * .22, w * .07, w * .12); ctx.strokeRect(x + w * .14, y - w * .22, w * .07, w * .12); }
  else if (pc === 'canopy') { ctx.fillStyle = '#FFFFFF'; E.rr(ctx, x - w * .48, y - w * .09, w * .96, w * .09, w * .02); ctx.fill(); ctx.stroke(); ctx.fillStyle = job.color; ctx.fillRect(x - w * .48, y - w * .045, w * .96, w * .03); OT(ctx, 'GAS', x, y - w * .045, w * .07, '#FFC233'); }
  else if (pc === 'sign') { ctx.fillStyle = P('metal'); ctx.fillRect(x - w * .2, y - w * .05, w * .03, w * .05); ctx.fillRect(x + w * .17, y - w * .05, w * .03, w * .05); ctx.fillStyle = job.color; E.rr(ctx, x - w * .3, y - w * .16, w * .6, w * .12, w * .03); ctx.fill(); ctx.stroke(); OT(ctx, 'FIX IT', x, y - w * .1, w * .07, '#FFFFFF'); }
  else if (pc === 'bell') { ctx.fillStyle = job.color; ctx.fillRect(x - w * .1, y - w * .16, w * .2, w * .16); ctx.strokeRect(x - w * .1, y - w * .16, w * .2, w * .16); ctx.fillStyle = '#7A3B4F'; ctx.beginPath(); ctx.moveTo(x - w * .14, y - w * .16); ctx.lineTo(x, y - w * .28); ctx.lineTo(x + w * .14, y - w * .16); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillStyle = P('star'); ctx.beginPath(); ctx.arc(x, y - w * .08, w * .04, Math.PI, 0); ctx.lineTo(x + w * .05, y - w * .05); ctx.lineTo(x - w * .05, y - w * .05); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x, y - w * .28); ctx.lineTo(x, y - w * .36); ctx.stroke(); ctx.fillStyle = P('rose'); ctx.beginPath(); ctx.moveTo(x, y - w * .36); ctx.lineTo(x + w * .08, y - w * .33); ctx.lineTo(x, y - w * .3); ctx.fill(); ctx.stroke(); }
  else if (pc === 'span') { ctx.fillStyle = job.color; E.rr(ctx, x - w * .58, y - w * .07, w * 1.16, w * .07, w * .02); ctx.fill(); ctx.stroke(); ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = Math.max(1, w * .012); ctx.beginPath(); ctx.moveTo(x - w * .56, y - w * .15); ctx.lineTo(x + w * .56, y - w * .15); for (let k = -5; k <= 5; k++) { ctx.moveTo(x + k * w * .1, y - w * .07); ctx.lineTo(x + k * w * .1, y - w * .15); } ctx.stroke(); }
  else if (pc === 'conveyor') {
    /* a belt sloping up to the right: rocks ride up from the hopper and tumble off the end */
    const x0 = x - w * .3, x1 = x + w * .3, y1 = y - w * .2, th = w * .045, at = u => [lerp(x0, x1, u), lerp(y, y1, u)];
    ctx.fillStyle = '#5A4A40'; ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y1); ctx.lineTo(x1, y1 - th); ctx.lineTo(x0, y - th); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = P('metal'); for (let k = 0; k <= 6; k++) { const [rx, ry] = at(k / 6); ctx.beginPath(); ctx.arc(rx, ry - th * .5, w * .016, 0, 7); ctx.fill(); ctx.stroke(); }
    ctx.fillStyle = '#9A958C'; for (let k = 0; k < 5; k++) { const u = (k / 5 + t * .12) % 1, [rx, ry] = at(u); ctx.beginPath(); ctx.moveTo(rx - w * .025, ry - th); ctx.lineTo(rx - w * .012, ry - th - w * .03); ctx.lineTo(rx + w * .02, ry - th - w * .025); ctx.lineTo(rx + w * .028, ry - th); ctx.closePath(); ctx.fill(); ctx.stroke(); }
    for (let k = 0; k < 3; k++) { const u = (k / 3 + t * .5) % 1; ctx.beginPath(); ctx.arc(x1 + w * .03 + u * w * .03, y1 + u * w * .17, w * .015, 0, 7); ctx.fill(); ctx.stroke(); }
    ctx.fillStyle = job.color; ctx.beginPath(); ctx.moveTo(x0 - w * .06, y - th - w * .11); ctx.lineTo(x0 + w * .1, y - th - w * .11); ctx.lineTo(x0 + w * .05, y - th); ctx.lineTo(x0 - w * .01, y - th); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#9A958C'; ctx.beginPath(); ctx.ellipse(x0 + w * .02, y - th - w * .11, w * .07, w * .025, 0, Math.PI, 0); ctx.fill(); ctx.stroke();
  }
  else if (pc === 'goal') {
    const gw = w * .36, gh = w * .13;
    ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = Math.max(1, w * .006); ctx.beginPath();
    for (let k = 1; k < 9; k++) { ctx.moveTo(x - gw / 2 + k * gw / 9, y - gh); ctx.lineTo(x - gw / 2 + k * gw / 9 + w * .01, y); }
    for (let k = 1; k < 4; k++) { ctx.moveTo(x - gw / 2, y - gh + k * gh / 4); ctx.lineTo(x + gw / 2, y - gh + k * gh / 4); }
    ctx.stroke(); ctx.restore(); ink(ctx, w);
    ctx.fillStyle = '#FFFFFF'; ctx.fillRect(x - gw / 2 - w * .015, y - gh, w * .03, gh); ctx.strokeRect(x - gw / 2 - w * .015, y - gh, w * .03, gh); ctx.fillRect(x + gw / 2 - w * .015, y - gh, w * .03, gh); ctx.strokeRect(x + gw / 2 - w * .015, y - gh, w * .03, gh);
    ctx.fillRect(x - gw / 2 - w * .015, y - gh - w * .025, gw + w * .03, w * .03); ctx.strokeRect(x - gw / 2 - w * .015, y - gh - w * .025, gw + w * .03, w * .03);
    const bx = x + gw / 2 + w * .07, br = w * .035; ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(bx, y - br, br, 0, 7); ctx.fill(); ctx.stroke();
    ctx.fillStyle = P('ink'); ctx.beginPath(); for (let k = 0; k < 5; k++) { const a = -Math.PI / 2 + k * Math.PI * 2 / 5; ctx[k ? 'lineTo' : 'moveTo'](bx + Math.cos(a) * br * .4, y - br + Math.sin(a) * br * .4); } ctx.closePath(); ctx.fill();
  }
  else if (pc === 'cross') {
    ctx.fillStyle = P('metal'); for (const lx of [-.07, .05]) { ctx.fillRect(x + lx * w, y - w * .04, w * .02, w * .04); ctx.strokeRect(x + lx * w, y - w * .04, w * .02, w * .04); }
    ctx.fillStyle = '#FFFFFF'; E.rr(ctx, x - w * .11, y - w * .24, w * .22, w * .2, w * .03); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#E2453A'; ctx.beginPath(); const a = w * .025, b = w * .075, cy = y - w * .14; ctx.moveTo(x - a, cy - b); ctx.lineTo(x + a, cy - b); ctx.lineTo(x + a, cy - a); ctx.lineTo(x + b, cy - a); ctx.lineTo(x + b, cy + a); ctx.lineTo(x + a, cy + a); ctx.lineTo(x + a, cy + b); ctx.lineTo(x - a, cy + b); ctx.lineTo(x - a, cy + a); ctx.lineTo(x - b, cy + a); ctx.lineTo(x - b, cy - a); ctx.lineTo(x - a, cy - a); ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  else if (pc === 'siren') {
    ctx.fillStyle = job.color; E.rr(ctx, x - w * .24, y - w * .11, w * .48, w * .11, w * .02); ctx.fill(); ctx.stroke();
    OT(ctx, 'FIRE', x, y - w * .055, w * .075, '#FFE27A');
    const on = Math.sin(t * 6) > 0;
    ctx.fillStyle = P('metal'); ctx.fillRect(x - w * .06, y - w * .13, w * .12, w * .02); ctx.strokeRect(x - w * .06, y - w * .13, w * .12, w * .02);
    if (on) { const gl = ctx.createRadialGradient(x, y - w * .16, 1, x, y - w * .16, w * .12); gl.addColorStop(0, 'rgba(255,90,70,.6)'); gl.addColorStop(1, 'rgba(255,90,70,0)'); ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(x, y - w * .16, w * .12, 0, 7); ctx.fill(); }
    ctx.fillStyle = on ? '#FF5A46' : '#C8402F'; ctx.beginPath(); ctx.arc(x, y - w * .13, w * .05, Math.PI, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = P('star'); ctx.beginPath(); ctx.arc(x + w * .17, y - w * .14, w * .03, Math.PI, 0); ctx.lineTo(x + w * .21, y - w * .11); ctx.lineTo(x + w * .13, y - w * .11); ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  else if (pc === 'portal') {
    ctx.fillStyle = '#9A7A5C'; E.rr(ctx, x - w * .29, y - w * .1, w * .58, w * .1, w * .02); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#2F6E4E'; E.rr(ctx, x - w * .17, y - w * .085, w * .34, w * .07, w * .015); ctx.fill(); ctx.stroke();
    OT(ctx, 'TUNNEL', x, y - w * .05, w * .055, '#FFFFFF');
    for (const s2 of [-1, 1]) { const lx = x + s2 * w * .24; ctx.fillStyle = P('metal'); ctx.fillRect(lx - w * .008, y - w * .14, w * .016, w * .04); ctx.fillStyle = '#FFE27A'; ctx.beginPath(); ctx.arc(lx, y - w * .145, w * .022, 0, 7); ctx.fill(); ctx.stroke(); }
  }
  else if (pc === 'clock') {
    ctx.fillStyle = '#F2E2C4'; ctx.fillRect(x - w * .085, y - w * .16, w * .17, w * .16); ctx.strokeRect(x - w * .085, y - w * .16, w * .17, w * .16);
    ctx.fillStyle = job.color; ctx.beginPath(); ctx.moveTo(x - w * .11, y - w * .16); ctx.lineTo(x, y - w * .29); ctx.lineTo(x + w * .11, y - w * .16); ctx.closePath(); ctx.fill(); ctx.stroke();
    const cy = y - w * .08, cr = w * .06; ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(x, cy, cr, 0, 7); ctx.fill(); ctx.stroke();
    ctx.beginPath(); for (let k = 0; k < 12; k += 3) { const a = k * Math.PI / 6; ctx.moveTo(x + Math.cos(a) * cr * .78, cy + Math.sin(a) * cr * .78); ctx.lineTo(x + Math.cos(a) * cr * .92, cy + Math.sin(a) * cr * .92); } ctx.stroke();
    const ha = -Math.PI / 2 + t * .05, ma = -Math.PI / 2 + t * .6; ctx.lineWidth = Math.max(1.5, w * .012); ctx.beginPath(); ctx.moveTo(x, cy); ctx.lineTo(x + Math.cos(ha) * cr * .45, cy + Math.sin(ha) * cr * .45); ctx.moveTo(x, cy); ctx.lineTo(x + Math.cos(ma) * cr * .72, cy + Math.sin(ma) * cr * .72); ctx.stroke();
  }
  else if (pc === 'tank') {
    ctx.fillStyle = P('metal'); for (const lx of [-.06, -.02, .02, .06]) { ctx.fillRect(x + lx * w - w * .008, y - w * .06, w * .016, w * .06); }
    ctx.fillStyle = '#A9744A'; E.rr(ctx, x - w * .08, y - w * .15, w * .16, w * .1, w * .02); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = 'rgba(60,40,30,.5)'; ctx.beginPath(); for (const ly of [.08, .11]) { ctx.moveTo(x - w * .08, y - w * ly); ctx.lineTo(x + w * .08, y - w * ly); } ctx.stroke(); ink(ctx, w);
    ctx.fillStyle = '#7A4F35'; ctx.beginPath(); ctx.moveTo(x - w * .095, y - w * .15); ctx.lineTo(x, y - w * .2); ctx.lineTo(x + w * .095, y - w * .15); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + w * .15, y); ctx.lineTo(x + w * .15, y - w * .17); ctx.stroke(); ctx.fillStyle = Math.sin(t * 3) > 0 ? '#FF5A46' : '#C8402F'; ctx.beginPath(); ctx.arc(x + w * .15, y - w * .175, w * .015, 0, 7); ctx.fill(); ctx.stroke();
  }
  else if (pc === 'dome') {
    ctx.fillStyle = job.color; ctx.fillRect(x - w * .19, y - w * .03, w * .38, w * .03); ctx.strokeRect(x - w * .19, y - w * .03, w * .38, w * .03);
    ctx.fillStyle = P('glass'); ctx.beginPath(); ctx.ellipse(x, y - w * .03, w * .16, w * .12, 0, Math.PI, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath(); for (const f2 of [-.5, 0, .5]) { ctx.moveTo(x + f2 * w * .16, y - w * .03); ctx.quadraticCurveTo(x + f2 * w * .08, y - w * .13, x, y - w * .15); } ctx.ellipse(x, y - w * .03, w * .16, w * .06, 0, Math.PI, 0); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.beginPath(); ctx.ellipse(x - w * .07, y - w * .09, w * .025, w * .04, -.5, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x, y - w * .15); ctx.lineTo(x, y - w * .23); ctx.stroke(); ctx.fillStyle = P('rose'); ctx.beginPath(); ctx.moveTo(x, y - w * .23); ctx.lineTo(x + w * .07, y - w * .21 + Math.sin(t * 4) * w * .005); ctx.lineTo(x, y - w * .19); ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  else if (pc === 'scoreboard') {
    ctx.fillStyle = P('metal'); for (const lx of [-.08, .06]) { ctx.fillRect(x + lx * w, y - w * .05, w * .02, w * .05); ctx.strokeRect(x + lx * w, y - w * .05, w * .02, w * .05); }
    ctx.fillStyle = '#3B2C5E'; E.rr(ctx, x - w * .15, y - w * .17, w * .3, w * .12, w * .02); ctx.fill(); ctx.stroke();
    E.numText(ctx, '2 : 1', x, y - w * .11, w * .065, '#FFE27A', null);
    for (const s2 of [-1, 1]) { const fx = x + s2 * w * .15; ctx.beginPath(); ctx.moveTo(fx, y - w * .17); ctx.lineTo(fx, y - w * .25); ctx.stroke(); ctx.fillStyle = s2 < 0 ? P('rose') : P('sea'); ctx.beginPath(); ctx.moveTo(fx, y - w * .25); ctx.lineTo(fx + s2 * w * .06, y - w * .23 + Math.sin(t * 4 + s2) * w * .006); ctx.lineTo(fx, y - w * .21); ctx.closePath(); ctx.fill(); ctx.stroke(); }
  }
  else if (pc === 'spire') {
    ctx.fillStyle = job.color; ctx.fillRect(x - w * .13, y - w * .05, w * .26, w * .05); ctx.strokeRect(x - w * .13, y - w * .05, w * .26, w * .05);
    ctx.fillStyle = E.shade(job.color, .2); ctx.fillRect(x - w * .08, y - w * .11, w * .16, w * .06); ctx.strokeRect(x - w * .08, y - w * .11, w * .16, w * .06);
    ctx.fillStyle = P('glass'); for (const lx of [-.06, -.02, .02]) ctx.fillRect(x + lx * w, y - w * .095, w * .03, w * .03);
    ctx.fillStyle = P('metal'); ctx.beginPath(); ctx.moveTo(x - w * .02, y - w * .11); ctx.lineTo(x, y - w * .34); ctx.lineTo(x + w * .02, y - w * .11); ctx.closePath(); ctx.fill(); ctx.stroke();
    const gl = .6 + .4 * Math.sin(t * 3); ctx.fillStyle = `rgba(255,226,122,${gl * .5})`; ctx.beginPath(); ctx.arc(x, y - w * .345, w * .05, 0, 7); ctx.fill();
    ctx.fillStyle = P('star'); E.starPath(ctx, x, y - w * .345, w * .035, w * .016, 5); ctx.fill(); ctx.stroke();
  }
  ctx.restore();
};
/* ---------- building helpers: every step is drawn as what was just delivered ---------- */
const CONC = '#CFC9BE', GRAV = '#ABA59B', STEEL = () => P('sea');
/* the lot: a patch of dirt, with stakes and a string line before the dig */
function lot(ctx, x, y, w, stage, col, rx = .52) {
  ctx.fillStyle = col || '#C9A57A'; ctx.beginPath(); ctx.ellipse(x, y, w * rx, w * .08, 0, 0, 7); ctx.fill();
  if (stage < .05) {
    ctx.strokeStyle = '#8E6640'; ctx.lineWidth = Math.max(1.5, w * .015);
    for (const sx of [-.36, .36]) { ctx.beginPath(); ctx.moveTo(x + sx * w, y + w * .02); ctx.lineTo(x + sx * w, y - w * .08); ctx.stroke(); }
    ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = Math.max(1, w * .008); ctx.beginPath(); ctx.moveTo(x - w * .36, y - w * .06); ctx.lineTo(x + w * .36, y - w * .06); ctx.stroke();
    ink(ctx, w);
  }
}
/* dig makes a pit, gravel fills it with a stone bed, concrete pours a smooth slab. Returns the top of the slab. */
function pit(ctx, x, y, w, dug, gravel, conc, pw = .84, deep = .08) {
  if (dug <= 0) return y;
  pw *= w; const d = w * deep * dug, px = x - pw / 2;
  ctx.fillStyle = '#7A5235'; ctx.fillRect(px, y, pw, d); ctx.fillStyle = 'rgba(40,20,10,.22)'; ctx.fillRect(px, y, pw, Math.min(d, w * .022)); ctx.strokeRect(px, y, pw, d);
  if (gravel + conc === 0) { ctx.fillStyle = '#9C6A42'; ctx.beginPath(); ctx.moveTo(px - w * .13 * dug, y); ctx.quadraticCurveTo(px - w * .06, y - w * .09 * dug, px + w * .01, y); ctx.closePath(); ctx.fill(); ctx.stroke(); }
  if (gravel > 0) {
    const gh = d * gravel, R2 = mulberry32(7);
    ctx.fillStyle = GRAV; ctx.fillRect(px, y + d - gh, pw, gh);
    ctx.fillStyle = '#7F7A72'; for (let i = 0; i < 90 * gravel * pw / (w * .84); i++) { ctx.beginPath(); ctx.arc(px + R2() * pw, y + d - R2() * gh, w * .005 + R2() * w * .005, 0, 7); ctx.fill(); }
    ctx.strokeRect(px, y + d - gh, pw, gh);
  }
  if (conc > 0) {
    const ch = (d + w * .025) * conc;
    ctx.fillStyle = CONC; ctx.fillRect(px, y + d - ch, pw, ch); ctx.strokeRect(px, y + d - ch, pw, ch);
    ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.fillRect(px + 3, y + d - ch + 2, pw - 6, Math.min(ch * .4, w * .01));
  }
  return y - w * .025 * conc;
}
/* walls going up course by course from base b; deco draws doors and windows (clipped to what's built) */
function rise(ctx, w, l, b, ww, hh, k, col, deco) {
  const h = hh * k; if (h <= 0) return;
  ctx.fillStyle = col; ctx.fillRect(l, b - h, ww, h); ctx.strokeRect(l, b - h, ww, h);
  if (deco) { ctx.save(); ctx.beginPath(); ctx.rect(l, b - h, ww, h); ctx.clip(); deco(l, b - hh, ww, hh); ctx.restore(); ink(ctx, w); }
  if (k < 1) { ctx.fillStyle = 'rgba(255,255,255,.35)'; for (let i = 0; i < ww / (w * .1); i++) ctx.fillRect(l + i * w * .1, b - h, Math.min(w * .05, l + ww - (l + i * w * .1)), w * .02); }
}
/* brick courses as faint lines */
function courses(ctx, w, l, t, ww, hh, col = 'rgba(80,40,30,.28)') {
  ctx.strokeStyle = col; ctx.lineWidth = Math.max(1, w * .006); ctx.beginPath();
  const rh = w * .03; for (let r = 1; r * rh < hh; r++) { const yy = t + hh - r * rh; ctx.moveTo(l, yy); ctx.lineTo(l + ww, yy); for (let c = (r % 2) * .5; c * w * .06 < ww; c++) { ctx.moveTo(l + c * w * .06, yy); ctx.lineTo(l + c * w * .06, yy + rh); } }
  ctx.stroke(); ink(ctx, w);
}
/* a steel skeleton: columns grow first, then each floor's beam, with cross braces */
function frame(ctx, w, l, b, ww, hh, k, cols, rows) {
  if (k <= 0) return;
  const top = b - hh * k, bt = Math.max(2, w * .02), col = STEEL();
  ctx.save();
  ctx.strokeStyle = E.shade(col, -.15); ctx.lineWidth = Math.max(1, bt * .4); ctx.beginPath();
  for (let r = 0; r < rows; r++) { const y0 = b - hh * r / rows, y1 = b - hh * (r + 1) / rows; if (y1 < top - .5) break; for (let c = 0; c < cols - 1; c++) if ((r + c) % 2 === 0) { const x0 = l + ww * c / (cols - 1), x1 = l + ww * (c + 1) / (cols - 1); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); } }
  ctx.stroke(); ink(ctx, w);
  ctx.fillStyle = col;
  for (let c = 0; c < cols; c++) { const cx = l + ww * c / (cols - 1); ctx.fillRect(cx - bt / 2, top, bt, b - top); ctx.strokeRect(cx - bt / 2, top, bt, b - top); }
  for (let r = 1; r <= rows; r++) { const ry = b - hh * r / rows; if (ry < top - .5) break; ctx.fillRect(l - bt / 2, ry - bt / 2, ww + bt, bt); ctx.strokeRect(l - bt / 2, ry - bt / 2, ww + bt, bt); }
  ctx.restore();
}
/* a narrow steel tower (crusher legs, floodlight masts, the fire station's hose tower) */
function trestle(ctx, w, cx, b, hh, k, tw = .06) {
  if (k <= 0) return;
  const h = hh * k, hw = w * tw / 2, bt = Math.max(1.5, w * .014), col = STEEL();
  ctx.strokeStyle = E.shade(col, -.15); ctx.lineWidth = Math.max(1, bt * .5); ctx.beginPath();
  const step = w * .06; for (let yy = 0; yy + step <= h + .5; yy += step) { ctx.moveTo(cx - hw, b - yy); ctx.lineTo(cx + hw, b - yy - step); ctx.moveTo(cx + hw, b - yy); ctx.lineTo(cx - hw, b - yy - step); }
  ctx.stroke(); ink(ctx, w);
  ctx.fillStyle = col; for (const s2 of [-1, 1]) { ctx.fillRect(cx + s2 * hw - bt / 2, b - h, bt, h); ctx.strokeRect(cx + s2 * hw - bt / 2, b - h, bt, h); }
  if (k >= 1) { ctx.fillRect(cx - hw - bt, b - h - bt, hw * 2 + bt * 2, bt); ctx.strokeRect(cx - hw - bt, b - h - bt, hw * 2 + bt * 2, bt); }
}
function heap(ctx, cx, b, rw, rh, col, seed) {
  if (rh <= .5) return;
  ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(cx - rw, b); ctx.quadraticCurveTo(cx, b - rh * 2, cx + rw, b); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.save(); ctx.clip(); const R2 = mulberry32(seed || 3); ctx.fillStyle = E.shade(col, -.25); for (let i = 0; i < 26; i++) { ctx.beginPath(); ctx.arc(cx + (R2() - .5) * rw * 1.8, b - R2() * rh, Math.max(1, rw * (.04 + R2() * .05)), 0, 7); ctx.fill(); } ctx.restore();
}
function lamp(ctx, w, x, y, on) { if (on) { const g = ctx.createRadialGradient(x, y, 1, x, y, w * .07); g.addColorStop(0, 'rgba(255,236,160,.85)'); g.addColorStop(1, 'rgba(255,236,160,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, w * .07, 0, 7); ctx.fill(); } ctx.fillStyle = '#FFE27A'; ctx.beginPath(); ctx.arc(x, y, w * .014, 0, 7); ctx.fill(); ctx.stroke(); }
/* floodlight mast with a panel of lamps on top */
function flood(ctx, w, cx, b, hh, k) {
  trestle(ctx, w, cx, b, hh, k, .035);
  if (k < .98) return;
  const py = b - hh - w * .06; ctx.fillStyle = P('metal'); ctx.fillRect(cx - w * .06, py, w * .12, w * .055); ctx.strokeRect(cx - w * .06, py, w * .12, w * .055);
  for (let r = 0; r < 2; r++) for (let c = 0; c < 3; c++) lamp(ctx, w, cx - w * .038 + c * w * .038, py + w * .015 + r * w * .025, r === 0 && c === 1);
}
function arched(ctx, x, y, ww, hh) { ctx.beginPath(); ctx.moveTo(x, y + hh); ctx.lineTo(x, y + ww / 2); ctx.arc(x + ww / 2, y + ww / 2, ww / 2, Math.PI, 0); ctx.lineTo(x + ww, y + hh); ctx.closePath(); }

/* Each new building: f(i) is how far step i has got (0..1). Returns the y the crane piece sits on. */
const ART = {
  quarry(ctx, x, y, w, f, o, stage, job) {
    /* dig a pit, gravel bed + rock piles, a concrete pad, steel legs, then the conveyor belt */
    lot(ctx, x, y, w, stage);
    const fy = pit(ctx, x, y, w, f(0), f(1), f(2), .52);
    heap(ctx, x - w * .39, y, w * .13, w * .07 * f(1), GRAV, 4); heap(ctx, x + w * .38, y, w * .14, w * .085 * f(1), GRAV, 9);
    const top = fy - w * .14;
    trestle(ctx, w, x - w * .2, fy, fy - (top - w * .2 * (.1 / .6)), f(3), .05);
    trestle(ctx, w, x + w * .2, fy, fy - (top - w * .2 * (.5 / .6)), f(3), .05);
    return top;
  },
  soccer(ctx, x, y, w, f, o, stage, job) {
    /* the pitch is already grass: dig and gravel a drain bed, brick stands, floodlights, then the goal */
    ctx.fillStyle = '#8DBA6A'; ctx.beginPath(); ctx.ellipse(x, y, w * .54, w * .085, 0, 0, 7); ctx.fill();
    ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = Math.max(1, w * .007); ctx.beginPath(); ctx.ellipse(x, y, w * .46, w * .065, 0, 0, 7); ctx.moveTo(x - w * .06, y + w * .065); ctx.lineTo(x + w * .06, y - w * .065); ctx.moveTo(x + w * .08, y); ctx.ellipse(x, y, w * .08, w * .022, 0, 0, 7); ctx.stroke(); ctx.restore(); ink(ctx, w);
    if (stage < .05) lot(ctx, x, y, w, stage, 'rgba(0,0,0,0)');
    const fy = pit(ctx, x, y, w, f(0), f(1), 0, .84);
    const sw = w * .8, sh = w * .2, l = x - sw / 2;
    rise(ctx, w, l, fy, sw, sh, f(2), P('brick'), (L, T, WW, HH) => {
      courses(ctx, w, L, T + HH * .62, WW, HH * .38);
      for (let r = 0; r < 3; r++) { const ry = T + HH * (.08 + r * .18); ctx.fillStyle = r === 1 ? '#FFFFFF' : r ? P('star') : '#22A06B'; for (let c = 0; c < 13; c++) { E.rr(ctx, L + WW * (.03 + c * .074), ry, WW * .06, HH * .12, 2); ctx.fill(); ctx.stroke(); } }
      ctx.fillStyle = '#4A3226'; for (const dx of [.2, .74]) { arched(ctx, L + WW * dx, T + HH * .7, WW * .06, HH * .3); ctx.fill(); }
    });
    flood(ctx, w, x - w * .46, fy, w * .42, f(3)); flood(ctx, w, x + w * .46, fy, w * .42, f(3));
    return fy;
  },
  hospital(ctx, x, y, w, f, o, stage, job) {
    /* dig, concrete slab, ground floor, top floor, a steel roof frame, then the big red cross */
    lot(ctx, x, y, w, stage);
    const fy = pit(ctx, x, y, w, f(0), 0, f(1)), ww = w * .7, fh = w * .19, l = x - ww / 2;
    rise(ctx, w, l, fy, ww, fh, f(2), '#F4EEE4', (L, T, WW, HH) => {
      ctx.fillStyle = '#E2453A'; ctx.fillRect(L, T, WW, HH * .1);
      win(ctx, L + WW * .06, T + HH * .3, WW * .14, HH * .36); win(ctx, L + WW * .24, T + HH * .3, WW * .14, HH * .36); win(ctx, L + WW * .62, T + HH * .3, WW * .14, HH * .36); win(ctx, L + WW * .8, T + HH * .3, WW * .14, HH * .36);
      ctx.fillStyle = P('glass'); ctx.fillRect(L + WW * .42, T + HH * .3, WW * .16, HH * .7); ctx.strokeRect(L + WW * .42, T + HH * .3, WW * .16, HH * .7); ctx.beginPath(); ctx.moveTo(L + WW * .5, T + HH * .3); ctx.lineTo(L + WW * .5, T + HH); ctx.stroke();
      ctx.fillStyle = '#E2453A'; ctx.fillRect(L + WW * .38, T + HH * .2, WW * .24, HH * .1); ctx.strokeRect(L + WW * .38, T + HH * .2, WW * .24, HH * .1);
    });
    rise(ctx, w, l, fy - fh, ww, fh, f(3), '#F4EEE4', (L, T, WW, HH) => { for (let c = 0; c < 5; c++) win(ctx, L + WW * (.06 + c * .185), T + HH * .25, WW * .13, HH * .42); });
    frame(ctx, w, x - w * .2, fy - fh * 2, w * .4, w * .07, f(4), 5, 1);
    return fy - fh * 2 - w * .07;
  },
  fire(ctx, x, y, w, f, o, stage, job) {
    /* dig, gravel bed, concrete slab, red brick walls with big doors, the steel hose tower, then the siren sign */
    lot(ctx, x, y, w, stage);
    const fy = pit(ctx, x, y, w, f(0), f(1), f(2)), ww = w * .6, hh = w * .3, l = x - ww / 2;
    trestle(ctx, w, x + w * .4, fy, w * .5, f(4), .1);
    rise(ctx, w, l, fy, ww, hh, f(3), '#C8553D', (L, T, WW, HH) => {
      courses(ctx, w, L, T, WW, HH);
      for (const dx of [.07, .53]) { const dl = L + WW * dx, dw = WW * .4, dt = T + HH * .3; ctx.fillStyle = '#F6EAD3'; arched(ctx, dl, dt, dw, HH * .7); ctx.fill(); ctx.stroke(); ctx.save(); arched(ctx, dl, dt, dw, HH * .7); ctx.clip(); ctx.fillStyle = '#E2453A'; for (let r = 0; r < 5; r++) ctx.fillRect(dl, dt + dw * .5 + r * HH * .1, dw, HH * .045); ctx.fillStyle = P('glass'); for (let c = 0; c < 3; c++) { ctx.fillRect(dl + dw * (.1 + c * .29), dt + dw * .5 - HH * .02, dw * .22, HH * .07); ctx.strokeRect(dl + dw * (.1 + c * .29), dt + dw * .5 - HH * .02, dw * .22, HH * .07); } ctx.restore(); ink(ctx, w); }
      ctx.fillStyle = P('glass'); ctx.beginPath(); ctx.arc(L + WW * .5, T + HH * .17, HH * .09, 0, 7); ctx.fill(); ctx.stroke();
    });
    return fy - hh;
  },
  tunnel(ctx, x, y, w, f, o, stage, job) {
    /* the hillside is always there: dig the hole, gravel road bed, concrete road, steel arches,
       a concrete ring, brick facing, then the tunnel sign */
    const dug = f(0), gr = f(1), road = f(2), ribs = f(3), ring = f(4), brick = f(5), aw = w * .16, ah = w * .27, acy = y - ah + aw;
    ctx.fillStyle = '#C9A57A'; ctx.beginPath(); ctx.ellipse(x, y, w * .64, w * .09, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#C98F5E'; ctx.beginPath(); ctx.moveTo(x - w * .64, y); ctx.bezierCurveTo(x - w * .52, y - w * .3, x - w * .3, y - w * .52, x, y - w * .52); ctx.bezierCurveTo(x + w * .3, y - w * .52, x + w * .52, y - w * .3, x + w * .64, y); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.save(); ctx.clip(); ctx.strokeStyle = 'rgba(120,70,40,.35)'; ctx.lineWidth = Math.max(1, w * .008); ctx.beginPath(); for (let i = -12; i < 14; i++) { ctx.moveTo(x + i * w * .05, y); ctx.lineTo(x + i * w * .05 + w * .2, y - w * .55); } ctx.stroke(); ctx.restore(); ink(ctx, w);
    for (const [bx, by] of [[-.4, .12], [.36, .2], [.12, .47]]) { ctx.fillStyle = '#8A9A5B'; ctx.beginPath(); ctx.arc(x + bx * w, y - by * w, w * .035, Math.PI, 0); ctx.closePath(); ctx.fill(); ctx.stroke(); }
    const hw = w * .27, hh = w * .38;
    rise(ctx, w, x - hw, y, hw * 2, hh, brick, '#B76A4B', (L, T, WW, HH) => courses(ctx, w, L, T, WW, HH));
    const arch = (s2, k = 1) => { const a2 = aw * s2, cy = y - (ah * s2 - a2) * k; ctx.beginPath(); ctx.moveTo(x - a2, y); ctx.lineTo(x - a2, cy); ctx.arc(x, cy, a2, Math.PI, 0); ctx.lineTo(x + a2, y); ctx.closePath(); };
    if (dug > 0) {
      ctx.save(); ctx.translate(x, y); ctx.scale(.4 + .6 * dug, dug); ctx.translate(-x, -y);
      arch(1); ctx.fillStyle = '#2E2420'; ctx.fill(); ctx.stroke();
      if (dug >= 1) { const g = ctx.createRadialGradient(x, y - w * .05, 1, x, y - w * .05, w * .08); g.addColorStop(0, 'rgba(255,230,170,.9)'); g.addColorStop(1, 'rgba(255,230,170,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, y - w * .05, w * .08, w * .06, 0, 0, 7); ctx.fill(); }
      ctx.restore();
      if (gr === 0) { ctx.fillStyle = '#9C6A42'; ctx.beginPath(); ctx.moveTo(x + w * .3, y); ctx.quadraticCurveTo(x + w * .4, y - w * .1 * dug, x + w * .5, y); ctx.closePath(); ctx.fill(); ctx.stroke(); }
    }
    if (ribs > 0) for (const s2 of [.94, .82, .7]) { const a2 = aw * s2, cy = y - (ah * s2 - a2), L = Math.PI + Math.PI * ribs; ctx.lineWidth = Math.max(2.5, w * .022); ctx.strokeStyle = P('ink'); ctx.beginPath(); ctx.moveTo(x - a2, y); ctx.lineTo(x - a2, cy); ctx.arc(x, cy, a2, Math.PI, L); if (ribs >= 1) ctx.lineTo(x + a2, y); ctx.stroke(); ctx.lineWidth = Math.max(1.5, w * .013); ctx.strokeStyle = STEEL(); ctx.stroke(); ink(ctx, w); }
    if (ring > 0) { ctx.save(); ctx.beginPath(); ctx.rect(x - w, y - (ah + w * .06) * ring, w * 2, (ah + w * .06) * ring + 2); ctx.clip(); ctx.beginPath(); const a2 = aw + w * .055, cy = y - ah + aw; ctx.moveTo(x - a2, y); ctx.lineTo(x - a2, cy); ctx.arc(x, cy, a2, Math.PI, 0); ctx.lineTo(x + a2, y); ctx.lineTo(x + aw, y); ctx.lineTo(x + aw, cy); ctx.arc(x, cy, aw, 0, Math.PI, true); ctx.lineTo(x - aw, y); ctx.closePath(); ctx.fillStyle = CONC; ctx.fill(); ctx.stroke(); ctx.restore(); ink(ctx, w); }
    if (gr > 0) { const k = gr; ctx.fillStyle = GRAV; ctx.beginPath(); ctx.moveTo(x - aw, y); ctx.lineTo(x + aw, y); ctx.lineTo(x + aw + w * .12 * k, y + w * .075 * k); ctx.lineTo(x - aw - w * .12 * k, y + w * .075 * k); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#7F7A72'; const R2 = mulberry32(5); for (let i = 0; i < 30 * k; i++) { ctx.beginPath(); ctx.arc(x + (R2() - .5) * (aw * 2 + w * .1 * k), y + R2() * w * .07 * k, w * .006, 0, 7); ctx.fill(); } }
    if (road > 0) { const k = road; ctx.fillStyle = '#A9AEB5'; ctx.beginPath(); ctx.moveTo(x - aw * .9, y); ctx.lineTo(x + aw * .9, y); ctx.lineTo(x + aw * .9 + w * .1 * k, y + w * .07 * k); ctx.lineTo(x - aw * .9 - w * .1 * k, y + w * .07 * k); ctx.closePath(); ctx.fill(); ctx.stroke(); if (k > .6) { ctx.strokeStyle = '#FFE27A'; ctx.lineWidth = Math.max(1.5, w * .01); ctx.setLineDash([w * .02, w * .02]); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + w * .07 * k); ctx.stroke(); ctx.setLineDash([]); ink(ctx, w); } }
    return y - hh;
  },
  station(ctx, x, y, w, f, o, stage, job) {
    /* dig, gravel track bed, concrete slab, brick hall and clock tower, steel canopy and rails, then the clock */
    lot(ctx, x, y, w, stage);
    const fy = pit(ctx, x, y, w, f(0), f(1), f(2));
    const bm = f(4);
    if (bm > 0) {
      const ry = fy - w * .21 * bm; ctx.fillStyle = STEEL();
      for (const px of [.14, .28, .42]) { ctx.fillRect(x + px * w - w * .01, ry, w * .02, fy - ry); ctx.strokeRect(x + px * w - w * .01, ry, w * .02, fy - ry); }
      if (bm >= .95) { ctx.fillStyle = job.color; ctx.beginPath(); ctx.moveTo(x + w * .06, fy - w * .2); ctx.lineTo(x + w * .5, fy - w * .23); ctx.lineTo(x + w * .5, fy - w * .2); ctx.lineTo(x + w * .06, fy - w * .17); ctx.closePath(); ctx.fill(); ctx.stroke(); }
      ctx.fillStyle = '#8E6640'; for (let k = 0; k < 7 * bm; k++) ctx.fillRect(x + w * (.1 + k * .06), fy + w * .005, w * .025, w * .03);
      ctx.fillStyle = STEEL(); ctx.fillRect(x + w * .08, fy + w * .008, w * .44 * bm, w * .012); ctx.strokeRect(x + w * .08, fy + w * .008, w * .44 * bm, w * .012);
    }
    const hk = f(3), col = '#C8704F';
    rise(ctx, w, x - w * .44, fy, w * .37, w * .22, hk, col, (L, T, WW, HH) => { courses(ctx, w, L, T, WW, HH); ctx.fillStyle = P('glass'); for (let c = 0; c < 3; c++) { arched(ctx, L + WW * (.08 + c * .3), T + HH * .2, WW * .2, HH * .55); ctx.fill(); ctx.stroke(); } });
    rise(ctx, w, x - w * .08, fy, w * .16, w * .44, hk, E.shade(col, -.08), (L, T, WW, HH) => { courses(ctx, w, L, T, WW, HH); ctx.fillStyle = '#7A5A3A'; arched(ctx, L + WW * .25, T + HH * .72, WW * .5, HH * .28); ctx.fill(); ctx.stroke(); ctx.fillStyle = P('glass'); for (let r = 0; r < 2; r++) { arched(ctx, L + WW * .33, T + HH * (.18 + r * .25), WW * .34, HH * .16); ctx.fill(); ctx.stroke(); } });
    return fy - w * .44;
  },
  apartment(ctx, x, y, w, f, o, stage, job) {
    /* dig, concrete slab, a steel skeleton, then the walls go up two floors per brick load, then the water tank */
    lot(ctx, x, y, w, stage);
    const fy = pit(ctx, x, y, w, f(0), 0, f(1)), ww = w * .46, H = w * .84, l = x - ww / 2, fh = H / 6;
    frame(ctx, w, l, fy, ww, H, f(2), 4, 6);
    const col = job.color;
    for (let s2 = 0; s2 < 3; s2++) rise(ctx, w, l, fy - s2 * 2 * fh, ww, 2 * fh, f(3 + s2), col, (L, T, WW, HH) => {
      for (let r = 0; r < 2; r++) { const ft = T + r * HH / 2; for (let c = 0; c < 3; c++) win(ctx, L + WW * (.08 + c * .31), ft + HH * .1, WW * .22, HH * .22); ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = Math.max(1, w * .007); ctx.beginPath(); for (const c of [0, 2]) { const bx = L + WW * (.04 + c * .31), by = ft + HH * .36; ctx.moveTo(bx, by); ctx.lineTo(bx + WW * .3, by); for (let i = 0; i <= 4; i++) { ctx.moveTo(bx + i * WW * .075, by); ctx.lineTo(bx + i * WW * .075, by + HH * .08); } } ctx.stroke(); ink(ctx, w); }
      if (s2 === 0) { ctx.fillStyle = '#7A5A3A'; ctx.fillRect(L + WW * .4, T + HH * .72, WW * .2, HH * .28); ctx.strokeRect(L + WW * .4, T + HH * .72, WW * .2, HH * .28); }
    });
    return fy - H;
  },
  mall(ctx, x, y, w, f, o, stage, job) {
    /* dig, gravel bed, concrete slab, a wide steel frame, shop walls with big windows, a concrete car park, then the glass dome */
    lot(ctx, x, y, w, stage, null, .54);
    const fy = pit(ctx, x, y, w, f(0), f(1), f(2), .9), ww = w * .9, hh = w * .26, l = x - ww / 2;
    frame(ctx, w, l, fy, ww, hh, f(3), 6, 2);
    rise(ctx, w, l, fy, ww, hh, f(4), '#EFE0CB', (L, T, WW, HH) => {
      ctx.fillStyle = job.color; ctx.fillRect(L, T, WW, HH * .22); ctx.strokeRect(L, T, WW, HH * .22);
      OT(ctx, 'SHOPS', L + WW / 2, T + HH * .11, HH * .17, '#FFE27A');
      const aw = ['#E8577A', '#FFC233', '#22A06B', '#2F95D6'];
      for (let c = 0; c < 4; c++) { const sl = L + WW * (.03 + c * .245), sw = WW * .2; ctx.fillStyle = P('glass'); ctx.fillRect(sl, T + HH * .5, sw, HH * .42); ctx.strokeRect(sl, T + HH * .5, sw, HH * .42); for (let k = 0; k < 4; k++) { ctx.fillStyle = k % 2 ? '#FFFFFF' : aw[c]; ctx.beginPath(); ctx.moveTo(sl + k * sw / 4, T + HH * .32); ctx.lineTo(sl + (k + 1) * sw / 4, T + HH * .32); ctx.lineTo(sl + (k + 1) * sw / 4 + sw * .02, T + HH * .44); ctx.lineTo(sl + k * sw / 4 + sw * .02, T + HH * .44); ctx.closePath(); ctx.fill(); } ctx.strokeRect(sl, T + HH * .32, sw + sw * .02, HH * .12); }
    });
    const pk = f(5);
    if (pk > 0) { ctx.save(); ctx.beginPath(); ctx.rect(x - w, fy + 1, w * 2, w * .3); ctx.clip(); ctx.fillStyle = '#B9BFC7'; ctx.beginPath(); ctx.ellipse(x, y + w * .005, w * .54 * pk, w * .095 * Math.min(1, pk * 2), 0, 0, 7); ctx.fill(); ctx.stroke(); if (pk > .6) { ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = Math.max(1, w * .007); ctx.beginPath(); for (let k = -4; k <= 4; k++) { ctx.moveTo(x + k * w * .1, y + w * .03); ctx.lineTo(x + k * w * .1 + w * .02, y + w * .08); } ctx.stroke(); } ctx.restore(); ink(ctx, w); }
    return fy - hh;
  },
  stadium(ctx, x, y, w, f, o, stage, job) {
    /* dig, gravel, concrete lower ring, concrete upper ring (you can see the seats inside the bowl),
       brick arches around the bottom, steel floodlights, then the scoreboard */
    lot(ctx, x, y, w, stage, null, .56);
    const fy = pit(ctx, x, y, w, f(0), f(1), 0, .9), t1 = w * .13, t2 = w * .27, dip = w * .075;
    const low = f(2), up = f(3), br = f(4);
    const lowPath = () => { ctx.beginPath(); ctx.moveTo(x - w * .4, fy); ctx.lineTo(x - w * .45, fy - t1); ctx.lineTo(x + w * .45, fy - t1); ctx.lineTo(x + w * .4, fy); ctx.closePath(); };
    const clipUp = (k, h0, h1) => { ctx.beginPath(); ctx.rect(x - w, fy - h0 - (h1 - h0) * k, w * 2, (h1 - h0) * k + 1); ctx.clip(); };
    if (up > 0) {
      ctx.save(); clipUp(up, t1, t2 + .5);
      ctx.fillStyle = CONC; ctx.beginPath(); ctx.moveTo(x - w * .45, fy - t1); ctx.lineTo(x - w * .52, fy - t2); ctx.lineTo(x + w * .52, fy - t2); ctx.lineTo(x + w * .45, fy - t1); ctx.closePath(); ctx.fill(); ctx.stroke();
      if (up >= 1) {
        const rows = ['#E8577A', '#FFFFFF', '#22A06B', '#FFC233'];
        ctx.save(); ctx.beginPath(); ctx.moveTo(x - w * .52, fy - t2); ctx.quadraticCurveTo(x, fy - t2 + dip * 2, x + w * .52, fy - t2); ctx.closePath(); ctx.clip();
        rows.forEach((c, r) => { ctx.fillStyle = c; ctx.fillRect(x - w * .52, fy - t2 + r * dip * .3, w * 1.04, dip * .3); });
        ctx.restore();
        ctx.beginPath(); ctx.moveTo(x - w * .52, fy - t2); ctx.quadraticCurveTo(x, fy - t2 + dip * 2, x + w * .52, fy - t2); ctx.stroke();
      }
      ctx.restore(); ink(ctx, w);
    }
    if (low > 0) { ctx.save(); clipUp(low, 0, t1); lowPath(); ctx.fillStyle = CONC; ctx.fill(); ctx.stroke(); ctx.strokeStyle = 'rgba(80,70,60,.3)'; ctx.beginPath(); for (let k = -8; k <= 8; k++) { ctx.moveTo(x + k * w * .05, fy); ctx.lineTo(x + k * w * .056, fy - t1); } ctx.stroke(); ctx.restore(); ink(ctx, w); }
    if (br > 0) { ctx.save(); clipUp(br, 0, t1); lowPath(); ctx.fillStyle = '#C8553D'; ctx.fill(); ctx.stroke(); lowPath(); ctx.clip(); courses(ctx, w, x - w * .45, fy - t1, w * .9, t1); ctx.fillStyle = '#4A3226'; for (let k = 0; k < 7; k++) { arched(ctx, x - w * .37 + k * w * .11, fy - t1 * .62, w * .05, t1 * .62); ctx.fill(); } ctx.restore(); ink(ctx, w); }
    flood(ctx, w, x - w * .47, fy - t2, w * .22, f(5)); flood(ctx, w, x + w * .47, fy - t2, w * .22, f(5));
    return fy - t2 + dip;
  },
  skyscraper(ctx, x, y, w, f, o, stage, job) {
    /* a deep dig, a thick concrete footing, two loads of steel frame, concrete floors poured, walls and windows, then the spire */
    lot(ctx, x, y, w, stage);
    const fy = pit(ctx, x, y, w, f(0), 0, f(1), .6, .12), ww = w * .34, H = w * .96, l = x - ww / 2, fl = 12;
    frame(ctx, w, l, fy, ww, H / 2, f(2), 4, 6);
    frame(ctx, w, l, fy - H / 2, ww, H / 2, f(3), 4, 6);
    const slabs = f(4);
    if (slabs > 0) { ctx.fillStyle = CONC; for (let r = 1; r <= fl; r++) { if (r / fl > slabs + .001) break; const ry = fy - H * r / fl; ctx.fillRect(l - w * .015, ry - w * .012, ww + w * .03, w * .02); ctx.strokeRect(l - w * .015, ry - w * .012, ww + w * .03, w * .02); } }
    const col = job.color;
    rise(ctx, w, l, fy, ww, H, f(5), E.shade(col, .25), (L, T, WW, HH) => {
      for (let r = 0; r < fl; r++) { const ft = T + r * HH / fl; ctx.fillStyle = CONC; ctx.fillRect(L, ft, WW, HH / fl * .18); for (let c = 0; c < 4; c++) { ctx.fillStyle = (r * 3 + c * 5) % 7 === 0 ? '#FFE9A8' : P('glass'); ctx.fillRect(L + WW * (.06 + c * .235), ft + HH / fl * .3, WW * .18, HH / fl * .55); } }
      ctx.strokeStyle = 'rgba(74,50,38,.45)'; ctx.lineWidth = Math.max(1, w * .006); ctx.beginPath(); for (let c = 1; c < 4; c++) { ctx.moveTo(L + WW * c / 4 - WW * .015, T); ctx.lineTo(L + WW * c / 4 - WW * .015, T + HH); } ctx.stroke();
      ctx.fillStyle = P('glass'); ctx.fillRect(L + WW * .3, T + HH - HH / fl * 1.2, WW * .4, HH / fl * 1.2); ctx.strokeRect(L + WW * .3, T + HH - HH / fl * 1.2, WW * .4, HH / fl * 1.2);
    });
    return fy - H;
  },
};
/* where each step's material goes, in building widths from the centre and up from the ground (for the unload animation) */
R.ZONE = {
  quarry:{3:[-.25, .25, .05, .3]},
  soccer:{2:[-.4, .4, .02, .2], 3:[-.46, .46, .1, .45]},
  hospital:{2:[-.33, .33, .03, .2], 3:[-.33, .33, .22, .4], 4:[-.2, .2, .42, .48]},
  fire:{3:[-.28, .28, .03, .3], 4:[.32, .46, .05, .5]},
  tunnel:{3:[-.14, .14, .05, .26], 4:[-.2, .2, .02, .3], 5:[-.26, .26, .05, .38]},
  station:{3:[-.42, .06, .03, .42], 4:[.1, .44, .05, .22]},
  apartment:{2:[-.22, .22, .05, .86], 3:[-.22, .22, .03, .28], 4:[-.22, .22, .3, .56], 5:[-.22, .22, .58, .84]},
  mall:{3:[-.44, .44, .05, .26], 4:[-.44, .44, .03, .26], 5:[-.42, .42, -.05, -.05]},
  stadium:{2:[-.42, .42, .01, .13], 3:[-.48, .48, .14, .27], 4:[-.42, .42, .02, .13], 5:[-.5, .5, .3, .5]},
  skyscraper:{2:[-.17, .17, .05, .48], 3:[-.17, .17, .5, .96], 4:[-.17, .17, .05, .96], 5:[-.17, .17, .03, .96]},
};
R.zone = (job, s) => (R.ZONE[job.b] && R.ZONE[job.b][s]) || null;
/* stage: steps done (can be fractional while it grows). Returns the y of the top of the walls. */
/* Each step shows as what it really is: dig makes a pit, gravel fills it with a stone bed, concrete pours a smooth
   slab, bricks raise the walls course by course, steel beams make the bridge's girders, and the crane adds the top piece. */
R.drawBuilding = function (ctx, job, x, y, w, stage, o = {}) {
  const steps = job.steps, f = i => clamp(stage - i, 0, 1);
  if (ART[job.b]) {
    ctx.save(); ink(ctx, w);
    const top = ART[job.b](ctx, x, y, w, f, o, stage, job), pf = f(steps.length - 1);
    if (pf > 0 && !o.noPiece) { ctx.globalAlpha = Math.min(1, pf * 2); R.drawPiece(ctx, job, x, top - (1 - pf) * w * .4, w, o.t); ctx.globalAlpha = 1; }
    ctx.restore();
    return top;
  }
  const part = type => { let sum = 0, c = 0; steps.forEach((st, i) => { if (st === type) { sum += f(i); c++; } }); return c ? sum / c : 0; };
  const dug = f(0), gravel = part('gravel'), conc = part('concrete'), k = part('bricks'), pf = part('crane'), hasConc = steps.includes('concrete');
  ctx.save(); ink(ctx, w);
  const bridge = job.b === 'bridge';
  if (!bridge) {
    ctx.fillStyle = '#C9A57A'; ctx.beginPath(); ctx.ellipse(x, y, w * .52, w * .08, 0, 0, 7); ctx.fill();
    if (stage < .05) {
      ctx.strokeStyle = '#8E6640'; ctx.lineWidth = Math.max(1.5, w * .015);
      for (const sx of [-.36, .36]) { ctx.beginPath(); ctx.moveTo(x + sx * w, y + w * .02); ctx.lineTo(x + sx * w, y - w * .08); ctx.stroke(); }
      ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = Math.max(1, w * .008); ctx.beginPath(); ctx.moveTo(x - w * .36, y - w * .06); ctx.lineTo(x + w * .36, y - w * .06); ctx.stroke();
      ink(ctx, w);
    }
    if (dug > 0) {
      const pw = w * .84, d = w * .08 * dug, px = x - pw / 2;
      ctx.fillStyle = '#7A5235'; ctx.fillRect(px, y, pw, d); ctx.fillStyle = 'rgba(40,20,10,.22)'; ctx.fillRect(px, y, pw, Math.min(d, w * .022)); ctx.strokeRect(px, y, pw, d);
      if (gravel + conc === 0 && k === 0) { ctx.fillStyle = '#9C6A42'; ctx.beginPath(); ctx.moveTo(px - w * .13 * dug, y); ctx.quadraticCurveTo(px - w * .06, y - w * .09 * dug, px + w * .01, y); ctx.closePath(); ctx.fill(); ctx.stroke(); }
      if (gravel > 0) {
        const gh = d * gravel, R2 = mulberry32(7);
        ctx.fillStyle = '#ABA59B'; ctx.fillRect(px, y + d - gh, pw, gh);
        ctx.fillStyle = '#7F7A72'; for (let i = 0; i < 90 * gravel; i++) { ctx.beginPath(); ctx.arc(px + R2() * pw, y + d - R2() * gh, w * .005 + R2() * w * .005, 0, 7); ctx.fill(); }
        ctx.strokeRect(px, y + d - gh, pw, gh);
      }
      if (conc > 0) {
        const ch = (d + w * .025) * conc;
        ctx.fillStyle = '#CFC9BE'; ctx.fillRect(px, y + d - ch, pw, ch); ctx.strokeRect(px, y + d - ch, pw, ch);
        ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.fillRect(px + 3, y + d - ch + 2, pw - 6, Math.min(ch * .4, w * .01));
      }
    }
  }
  const fy = y - (hasConc ? w * .025 * conc : 0);
  let top = fy;
  const walls = (bw, bh, col, deco) => {
    const h = bh * w * k; top = fy - bh * w;
    if (h <= 0) return;
    ctx.fillStyle = col; ctx.fillRect(x - bw * w / 2, fy - h, bw * w, h); ctx.strokeRect(x - bw * w / 2, fy - h, bw * w, h);
    ctx.save(); ctx.beginPath(); ctx.rect(x - bw * w / 2, fy - h, bw * w, h); ctx.clip(); deco(x - bw * w / 2, fy - bh * w, bw * w, bh * w); ctx.restore();
    if (k < 1) { ctx.fillStyle = 'rgba(255,255,255,.35)'; for (let i = 0; i < bw * 10; i++) ctx.fillRect(x - bw * w / 2 + i * w * .1, fy - h, w * .05, w * .02); }
  };
  if (job.b === 'house') walls(.62, .36, job.color, (l, t, ww, hh) => { win(ctx, l + ww * .12, t + hh * .22, ww * .2, hh * .26); win(ctx, l + ww * .68, t + hh * .22, ww * .2, hh * .26); ctx.fillStyle = '#7A5A3A'; ctx.fillRect(l + ww * .42, t + hh * .5, ww * .16, hh * .5); ctx.strokeRect(l + ww * .42, t + hh * .5, ww * .16, hh * .5); });
  else if (job.b === 'gas') {
    const h = w * .38 * k;
    ctx.fillStyle = '#FFFFFF'; for (const px of [-.38, .38]) if (h > 0) { ctx.fillRect(x + px * w - w * .025, fy - h, w * .05, h); ctx.strokeRect(x + px * w - w * .025, fy - h, w * .05, h); }
    const sh = w * .22 * k; if (sh > 0) { ctx.fillStyle = job.color; ctx.fillRect(x - w * .22, fy - sh, w * .3, sh); ctx.strokeRect(x - w * .22, fy - sh, w * .3, sh); if (k > .7) win(ctx, x - w * .17, fy - sh + w * .05, w * .2, w * .07); }
    if (k > .5) for (const px of [.2, .3]) { ctx.fillStyle = P('rose'); ctx.fillRect(x + px * w - w * .03, fy - w * .1, w * .06, w * .1); ctx.strokeRect(x + px * w - w * .03, fy - w * .1, w * .06, w * .1); }
    top = fy - w * .38;
  }
  else if (job.b === 'mechanic') walls(.74, .32, job.color, (l, t, ww, hh) => { for (const gx of [.1, .55]) { ctx.fillStyle = '#D9DEE8'; ctx.fillRect(l + ww * gx, t + hh * .3, ww * .35, hh * .7); ctx.strokeRect(l + ww * gx, t + hh * .3, ww * .35, hh * .7); ctx.strokeStyle = 'rgba(0,0,0,.25)'; for (let i = 1; i < 5; i++) { ctx.beginPath(); ctx.moveTo(l + ww * gx, t + hh * (.3 + i * .14)); ctx.lineTo(l + ww * (gx + .35), t + hh * (.3 + i * .14)); ctx.stroke(); } ctx.strokeStyle = P('ink'); } });
  else if (job.b === 'school') walls(.8, .38, job.color, (l, t, ww, hh) => { for (let r = 0; r < 2; r++) for (let c = 0; c < 4; c++) if (!(r === 1 && (c === 1 || c === 2))) win(ctx, l + ww * (.07 + c * .24), t + hh * (.14 + r * .44), ww * .13, hh * .26); ctx.fillStyle = '#7A5A3A'; ctx.fillRect(l + ww * .4, t + hh * .58, ww * .2, hh * .42); ctx.strokeRect(l + ww * .4, t + hh * .58, ww * .2, hh * .42); });
  else if (bridge) {
    const rl = o.river != null ? o.river : 0;
    ctx.fillStyle = '#8E6640'; ctx.fillRect(x - w * .62, y - w * .18, w * .16, w * .18); ctx.fillRect(x + w * .46, y - w * .18, w * .16, w * .18);
    ctx.fillStyle = '#4AA3DF'; ctx.fillRect(x - w * .46, y - w * (.06 + rl * .08), w * .92, w * (.06 + rl * .08) + 2);
    ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.beginPath(); for (let i = 0; i < 4; i++) { const wx = x - w * .4 + ((i * .25 + (o.t || 0) * .1) % 1) * w * .8; ctx.moveTo(wx, y - w * .04); ctx.lineTo(wx + w * .06, y - w * .04); } ctx.stroke(); ink(ctx, w);
    /* bridge order: dig footings, pour the piers, lay steel girders, pour the ramps, add the steel railings, lift the deck */
    const piers = f(1), girders = f(2), ramps = f(3), rails = f(4), deckY = y - w * .23;
    if (dug > 0) { ctx.fillStyle = '#7A5235'; for (const px of [-.22, .22]) { ctx.fillRect(x + px * w - w * .07, y - w * .03 * dug, w * .14, w * .03 * dug); ctx.strokeRect(x + px * w - w * .07, y - w * .03 * dug, w * .14, w * .03 * dug); } }
    const h = w * .2 * piers; ctx.fillStyle = '#CFC9BE'; if (h > 0) for (const px of [-.22, .22]) { ctx.fillRect(x + px * w - w * .045, y - w * .03 - h, w * .09, h); ctx.strokeRect(x + px * w - w * .045, y - w * .03 - h, w * .09, h); }
    if (girders > 0) { const L = w * 1.24 * girders; ctx.fillStyle = P('sea'); ctx.fillRect(x - w * .62, deckY - w * .035, L, w * .035); ctx.strokeRect(x - w * .62, deckY - w * .035, L, w * .035); ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); for (let i = 1; i < 12 * girders; i++) { ctx.moveTo(x - w * .62 + i * w * .1, deckY - w * .03); ctx.lineTo(x - w * .62 + i * w * .1, deckY - w * .005); } ctx.stroke(); ink(ctx, w); }
    if (ramps > 0) { ctx.fillStyle = '#CFC9BE'; for (const sgn of [-1, 1]) { const ex = x + sgn * w * .62, ix = x + sgn * w * (.62 - .2 * ramps); ctx.beginPath(); ctx.moveTo(ex, y - w * .18); ctx.lineTo(ex, deckY - w * .035 * ramps); ctx.lineTo(ix, deckY - w * .035 * ramps); ctx.lineTo(ix, y - w * .18); ctx.closePath(); ctx.fill(); ctx.stroke(); } }
    if (rails > 0) { const rh = w * .06 * rails; ctx.strokeStyle = P('sea'); ctx.lineWidth = Math.max(2, w * .012); ctx.beginPath(); ctx.moveTo(x - w * .6, deckY - w * .035 - rh); ctx.lineTo(x + w * .6, deckY - w * .035 - rh); for (let i = 0; i <= 12; i++) { const rx = x - w * .6 + i * w * .1; ctx.moveTo(rx, deckY - w * .035); ctx.lineTo(rx + (i % 2 ? -1 : 1) * w * .05, deckY - w * .035 - rh); } ctx.stroke(); ink(ctx, w); }
    top = deckY - w * .035;
  }
  if (pf > 0 && !o.noPiece) { ctx.globalAlpha = Math.min(1, pf * 2); R.drawPiece(ctx, job, x, top - (1 - pf) * w * .4, w, o.t); ctx.globalAlpha = 1; }
  ctx.restore();
  return top;
};

/* ---------- town map: Main Street, the Hills and Big City stacked down one winding road ---------- */
R.DH = 1020; /* three road wiggles, so every district's road and lots line up the same way */
R.townHeight = W => 3 * R.DH + 70;
/* the y of each lot's ground line on the map (the bosses sit on the river, the ridge and the plaza) */
R.lotY = i => { const d = Math.floor(i / 5), k = i % 5, B = d * R.DH; return k === 4 ? B + (d === 2 ? 900 : 868) : B + 190 + k * 170; };
R.districtOpen = (p, d) => d === 0 || R.built(p, d * 5 - 1);
R.drawTown = function (ctx, W, H, p, t, cur) {
  const lots = [], pr = p.prog.trucks, job = p.rig.job, WS = CP.trucks.worlds, DH = R.DH;
  const roadX = y => W / 2 + Math.sin(y / 170 * Math.PI) * W * .1;
  const featY = d => d * DH + (d === 2 ? 880 : 850);
  /* ground: each district its own colour, with a wavy edge where it starts */
  for (let d = 0; d < 3; d++) {
    const B = d * DH, gc = WS[d].grass, rand = mulberry32(42 + d * 17), bot = d === 2 ? H : B + DH + 12;
    ctx.fillStyle = gc[0]; ctx.beginPath(); ctx.moveTo(0, bot); ctx.lineTo(0, B); for (let x = 0; x < W + 12; x += 12) ctx.lineTo(Math.min(x, W), B + (d ? Math.sin(Math.min(x, W) / 38) * 7 : 0)); ctx.lineTo(W, bot); ctx.closePath(); ctx.fill();
    if (d) { ctx.strokeStyle = 'rgba(74,50,38,.35)'; ctx.lineWidth = 3; ctx.stroke(); }
    ctx.fillStyle = gc[1]; for (let i = 0; i < 22; i++) { ctx.beginPath(); ctx.ellipse(rand() * W, B + 20 + rand() * (DH - 30), 20 + rand() * 30, 8 + rand() * 8, 0, 0, 7); ctx.fill(); }
    /* scenery along the edges: trees on Main Street, rocks and cactus in the Hills, little towers in Big City */
    for (let i = 0; i < 12; i++) {
      const ty = B + 70 + rand() * (DH - 90), side = rand() < .5 ? -1 : 1, tx = roadX(ty) + side * (W * .42 + rand() * W * .1);
      if (Math.abs(ty - featY(d)) < 60) continue;
      if (d === 0) { ctx.fillStyle = '#5F4A38'; ctx.fillRect(tx - 3, ty - 4, 6, 14); ctx.fillStyle = rand() < .5 ? '#7E9E62' : '#6E8F55'; ctx.beginPath(); ctx.ellipse(tx, ty - 12, 13, 16, 0, 0, 7); ctx.fill(); }
      else if (d === 1) { if (rand() < .5) { ctx.fillStyle = '#7E9A52'; E.rr(ctx, tx - 4, ty - 26, 8, 28, 4); ctx.fill(); E.rr(ctx, tx - 13, ty - 18, 6, 12, 3); ctx.fill(); E.rr(ctx, tx + 7, ty - 22, 6, 12, 3); ctx.fill(); } else { ctx.fillStyle = '#B07A50'; ctx.beginPath(); ctx.ellipse(tx, ty, 16, 10, 0, Math.PI, 0); ctx.fill(); ctx.fillStyle = '#C08A5E'; ctx.beginPath(); ctx.ellipse(tx + 12, ty, 10, 7, 0, Math.PI, 0); ctx.fill(); } }
      else { const bh = 22 + rand() * 26, bw2 = 16 + rand() * 10; ctx.fillStyle = rand() < .5 ? '#9AA6B5' : '#B5A898'; ctx.fillRect(tx - bw2 / 2, ty - bh, bw2, bh); ctx.strokeStyle = 'rgba(74,50,38,.5)'; ctx.lineWidth = 2; ctx.strokeRect(tx - bw2 / 2, ty - bh, bw2, bh); ctx.fillStyle = '#E6EEF2'; for (let r = 0; r < bh / 9 - 1; r++) for (let c = 0; c < 2; c++) ctx.fillRect(tx - bw2 / 2 + 3 + c * (bw2 / 2), ty - bh + 4 + r * 9, bw2 / 2 - 6, 4); }
    }
  }
  /* the river under the bridge, and the mountain ridge the tunnel goes through */
  const riverY = featY(0), ridgeY = featY(1), plazaY = featY(2);
  ctx.fillStyle = '#7FB3BF'; ctx.beginPath(); ctx.moveTo(0, riverY - 34); for (let x = 0; x <= W; x += 10) ctx.lineTo(x, riverY - 34 + Math.sin(x / 40 + t) * 4); ctx.lineTo(W, riverY + 34); for (let x = W; x >= 0; x -= 10) ctx.lineTo(x, riverY + 34 + Math.sin(x / 40 + t + 1) * 4); ctx.closePath(); ctx.fill();
  for (let k = -1; k < 8; k++) { const mx = k * W / 6 + (k % 2) * 14, mh = 64 + (k % 3) * 16; ctx.fillStyle = k % 2 ? '#B5774A' : '#C4875A'; ctx.beginPath(); ctx.moveTo(mx - W * .16, ridgeY + 26); ctx.quadraticCurveTo(mx - W * .04, ridgeY + 26 - mh * 1.3, mx, ridgeY + 26 - mh); ctx.quadraticCurveTo(mx + W * .04, ridgeY + 26 - mh * 1.3, mx + W * .16, ridgeY + 26); ctx.closePath(); ctx.fill(); }
  ctx.fillStyle = '#D9D2C2'; ctx.strokeStyle = 'rgba(74,50,38,.45)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(roadX(plazaY), plazaY + 34, Math.min(W * .4, 170), 42, 0, 0, 7); ctx.fill(); ctx.stroke();
  /* locked districts are greyed out */
  for (let d = 1; d < 3; d++) if (!R.districtOpen(p, d)) { ctx.fillStyle = 'rgba(96,96,106,.42)'; ctx.fillRect(0, d * DH, W, d === 2 ? H - d * DH : DH + 14); }
  const gapAt = [[riverY, 40, R.built(p, 4)], [ridgeY, 46, R.built(p, 9)]];
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const road = (w, col, dash) => { ctx.strokeStyle = col; ctx.lineWidth = w; ctx.setLineDash(dash || []); ctx.beginPath(); let pen = false; for (let y = -10; y <= plazaY + 30; y += 10) { if (gapAt.some(([gy, r, ok]) => !ok && y > gy - r && y < gy + r)) { if (pen) ctx.stroke(); ctx.beginPath(); pen = false; continue; } ctx[pen ? 'lineTo' : 'moveTo'](roadX(y), y); pen = true; } ctx.stroke(); ctx.setLineDash([]); };
  road(56, CR.LINE); road(48, '#8E8478'); road(4, '#F6EAD3', [18, 16]);
  /* a road barrier where a locked district starts */
  for (let d = 1; d < 3; d++) if (!R.districtOpen(p, d)) { const by = d * DH + 104, bx = roadX(by); ctx.strokeStyle = '#4A3226'; ctx.lineWidth = 3; ctx.fillStyle = '#E8577A'; E.rr(ctx, bx - 44, by - 8, 88, 16, 4); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#FFFFFF'; for (let k = 0; k < 4; k++) ctx.fillRect(bx - 36 + k * 22, by - 8, 10, 16); }
  const bw = Math.min(150, W * .36), L2 = [];
  /* pass 1: the buildings (or ghosts of them, and fences on locked lots) */
  for (let i = 0; i < CP.count; i++) {
    const J = R.job(i), d = J.world, k = i % 5, boss = k === 4, n = J.steps.length;
    const ly = R.lotY(i), x = boss ? roadX(featY(d)) : roadX(ly - 40) + (k % 2 ? 1 : -1) * W * .26;
    const by = boss ? ly + 12 : ly, bwi = Math.min(boss ? bw * 1.15 : bw, 178 / (J.h || .6));
    const locked = i > pr.unlocked, built = R.built(p, i), next = i === cur && !locked, river = boss && d === 0;
    L2.push({i, J, d, k, boss, ly, x, bwi, locked, built, next});
    if (next) { const pu = .5 + .5 * Math.sin(t * 4); ctx.fillStyle = `rgba(255,226,122,${.35 + .3 * pu})`; ctx.beginPath(); ctx.ellipse(x, ly, bwi * .66 + pu * 6, bwi * .17 + pu * 2, 0, 0, 7); ctx.fill(); }
    if (!built) { ctx.save(); ctx.globalAlpha = locked ? .16 : .3; R.drawBuilding(ctx, J, x, by, bwi, n, {t, river:.4}); ctx.restore(); }
    const stage = built ? n : (job && job.i === i ? job.stage : 0);
    if (locked) {
      ctx.fillStyle = 'rgba(29,37,64,.18)'; ctx.beginPath(); ctx.ellipse(x, ly, bw * .5, bw * .1, 0, 0, 7); ctx.fill();
      ctx.strokeStyle = '#8E6640'; ctx.lineWidth = 3; ctx.beginPath(); for (let q = -3; q <= 3; q++) { ctx.moveTo(x + q * bw * .13, ly + 4); ctx.lineTo(x + q * bw * .13, ly - 22); } ctx.moveTo(x - bw * .4, ly - 16); ctx.lineTo(x + bw * .4, ly - 16); ctx.stroke();
      ctx.fillStyle = '#FFC233'; ctx.strokeStyle = '#4A3226'; ctx.lineWidth = 3; E.rr(ctx, x - 13, ly - 50, 26, 22, 5); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.arc(x, ly - 50, 8, Math.PI, 0); ctx.stroke();
    } else R.drawBuilding(ctx, J, x, by, bwi, stage, {t, river:river && !built ? .4 : 0});
    lots.push({i, x, y:ly - Math.min(bwi * (J.h || .6), 140) * .45, r:bwi * .62});
  }
  /* district signs, painted in each district's sky colours */
  for (let d = 0; d < 3; d++) {
    const B = d * DH, open = R.districtOpen(p, d), hy = B + 36, wd = WS[d];
    const name = wd.name.toUpperCase(), sub = open ? `${[0, 1, 2, 3, 4].filter(k => R.built(p, d * 5 + k)).length} of 5 built` : `Build the ${WS[d - 1].boss} to open`;
    ctx.font = '400 27px "Patrick Hand", "Comic Sans MS", cursive'; const tw = Math.max(170, ctx.measureText(name + (open ? '' : ' (locked)')).width + 48);
    const g = ctx.createLinearGradient(0, hy - 24, 0, hy + 24); g.addColorStop(0, open ? wd.sky[0] : '#9A9AA4'); g.addColorStop(1, open ? wd.sky[1] : '#C8C8CE');
    ctx.fillStyle = g; ctx.strokeStyle = '#4A3226'; ctx.lineWidth = 4; E.rr(ctx, W / 2 - tw / 2, hy - 24, tw, 48, 14); ctx.fill(); ctx.stroke();
    OT(ctx, name + (open ? '' : ' (locked)'), W / 2, hy, 22, open ? '#FFF4DC' : '#F2F2F2');
    OT(ctx, sub, W / 2, hy + 38, Math.min(16, W * .045), '#FFFFFF');
  }
  /* pass 2: name plates, check marks, stars and the next-job arrow always sit on top */
  for (const {i, J, d, k, boss, ly, x, bwi, locked, built, next} of L2) {
    const plateY = ly + 26;
    ctx.font = '700 15px Lexend, sans-serif'; const label = `${i + 1}. ${J.name}${locked ? ' (locked)' : ''}`, tw = ctx.measureText(label).width + (built ? 44 : 24);
    ctx.fillStyle = locked ? 'rgba(29,37,64,.55)' : '#FFFFFF'; ctx.strokeStyle = '#4A3226'; ctx.lineWidth = 3; E.rr(ctx, x - tw / 2, plateY, tw, 28, 10); ctx.fill(); ctx.stroke();
    ctx.fillStyle = locked ? '#FFFFFF' : '#4A3226'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(label, x - (built ? 10 : 0), plateY + 15);
    if (built) { ctx.fillStyle = '#6E9A4A'; ctx.beginPath(); ctx.arc(x + tw / 2 - 16, plateY + 14, 9, 0, 7); ctx.fill(); ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(x + tw / 2 - 20, plateY + 14); ctx.lineTo(x + tw / 2 - 17, plateY + 18); ctx.lineTo(x + tw / 2 - 11, plateY + 10); ctx.stroke(); }
    if (built) { const st = pr.stars[i]; for (let s2 = 0; s2 < 3; s2++) { ctx.fillStyle = s2 < st ? '#FFC233' : 'rgba(255,255,255,.7)'; E.starPath(ctx, x - 22 + s2 * 22, plateY + 44, 9, 4, 5); ctx.fill(); ctx.strokeStyle = '#4A3226'; ctx.lineWidth = 2; ctx.stroke(); } }
    if (!next) continue;
    /* the first lot of a district sits under the sign: keep the arrow below the sign there */
    let ay = ly - Math.min(bwi * (J.h || .6) + 12, 150); if (k === 0) ay = Math.max(ay, d * DH + 140); ay += Math.sin(t * 4) * 6;
    OT(ctx, job && job.i === i ? 'Keep building! Tap here' : 'Next job! Tap here', k === 0 ? x + (x < W / 2 ? 1 : -1) * 34 : x, k === 0 ? ay - 36 : ay - 44, 19, '#FFE27A');
    ctx.fillStyle = '#FFC233'; ctx.strokeStyle = '#4A3226'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x - 14, ay - 20); ctx.lineTo(x + 14, ay - 20); ctx.lineTo(x + 14, ay - 4); ctx.lineTo(x + 24, ay - 4); ctx.lineTo(x, ay + 18); ctx.lineTo(x - 24, ay - 4); ctx.lineTo(x - 14, ay - 4); ctx.closePath(); ctx.fill(); ctx.stroke();
    const hop = Math.max(0, Math.sin(t * 2.4)) ** 6, side = x < W / 2 ? 1 : -1, tx2 = boss ? x - bwi * .8 : x + side * bw * .78; R.drawTruck(ctx, 'dump', tx2, ly + 4, Math.min(96, W * .24), R.paint(p, 'dump'), {t, mood:'grin', hop:hop * .1, sq:-hop * .03, flip:side < 0, look:-1});
  }
  const endY = 3 * DH + 24, allDone = R.built(p, CP.count - 1);
  OT(ctx, allDone ? 'The whole town is built!' : R.districtOpen(p, 2) ? 'Build the Skyscraper to finish the town' : 'More of the town is waiting down the road', W / 2, endY, Math.min(18, W * .05), allDone ? '#FFE27A' : '#FFFFFF');
  CR.paper(ctx, W, H, .35);
  return lots;
};

/* ---------- building site (job screen) ---------- */
PUM.games.site = function (o) {
  const job = o.job;
  const g = {t:0, s:o.from != null ? o.from : o.stage, to:o.stage, dust:0, party:o.party};
  const parts = E.Particles();
  let W = 0, H = 0;
  return {
    resize(w, h) { W = w; H = h; },
    update(dt) {
      g.t += dt; parts.update(dt);
      if (g.s < g.to) { const prev = g.s; g.s = Math.min(g.to, g.s + dt * .8); if (Math.random() < .5) parts.add({x:W * .45 + (Math.random() - .5) * W * .4, y:H * .8, vx:(Math.random() - .5) * 40, vy:-30 - Math.random() * 30, life:.8, size:6, grow:2, color:'rgba(185,150,110,.6)'}); if (prev < g.to && g.s >= g.to) { PUM.audio.sfx('brick'); parts.burst(W * .45, H * .5, 16, {speed:180, color:['#FFC233', '#FFFFFF', '#22A06B'], shape:'star', size:6, life:.8}); } }
      if (g.party && Math.random() < .4) parts.add({x:Math.random() * W, y:-10, vx:(Math.random() - .5) * 40, vy:60 + Math.random() * 60, life:3, size:7, shape:'rect', vr:6, color:['#FFC233', '#E8577A', '#2F95D6', '#22A06B'][Math.floor(Math.random() * 4)], fade:false});
    },
    draw(ctx, w, h) {
      if (w !== W || h !== H) { W = w; H = h; }
      const gy = H * .82;
      const wd = job.world || 0, cam = CR.scenery(ctx, W, gy, g.t, {kind:'site', storm:job.storm, world:wd}); ctx.save(); CR.withCam(ctx, W, gy, cam, 1); CR.ground(ctx, W, gy, H, 'grass', wd);
      const bw = Math.min(W * .62, H * 1.05, (gy - 12) / (job.h || .6));
      const top = R.drawBuilding(ctx, job, W * .45, gy, bw, g.s, {t:g.t, river:job.b === 'bridge' ? clamp(g.to / job.steps.length, 0, 1) * .6 : 0});
      const hop = g.party ? Math.abs(Math.sin(g.t * 6)) * .06 : Math.max(0, Math.sin(g.t * 2)) ** 8 * .04;
      if (g.s < 1) { const es = Math.min(W * .22, 100); R.drawExcavator(ctx, W * .86, gy + 4, es, 'star', W * .86 + es * .7, gy - es * .2, {face:-1, t:g.t, mood:'happy', wig:Math.sin(g.t * 6) * .25, look:-1}); }
      else R.drawTruck(ctx, 'dump', W * .87, gy + 6, Math.min(W * .26, 120), o.color || 'marigold', {load:0, t:g.t, mood:g.party ? 'cheer' : 'happy', hop, flip:true, look:-1});
      if (g.party) { ctx.strokeStyle = '#C2533F'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(W * .1, gy - 20); ctx.quadraticCurveTo(W * .45, gy - 4, W * .8, gy - 20); ctx.stroke(); }
      parts.draw(ctx);
      ctx.restore(); CR.light(ctx, W, H);
      CR.paper(ctx, W, H, .45);
      return top;
    },
  };
};

/* ---------- loading and digging ---------- */
function backdrop(ctx, W, gy, t, kind, signX, world) {
  const cam = CR.scenery(ctx, W, gy, t, {kind:kind === 'excavator' ? 'quarry' : kind === 'forklift' || kind === 'chute' ? 'yard' : 'site', world});
  const label = kind === 'excavator' ? 'QUARRY' : kind === 'forklift' ? 'BRICK YARD' : kind === 'chute' ? 'CONCRETE PLANT' : 'BUILDING SITE';
  if (signX === false) return;
  ctx.save(); CR.withCam(ctx, W, gy, cam, .85);
  const sx = signX != null ? signX : W * .5, sy = gy - 150;
  ctx.fillStyle = '#5F4A38'; ctx.fillRect(sx - 3, sy, 6, 150);
  ctx.fillStyle = '#4A3226'; E.rr(ctx, sx - 70, sy - 28, 140, 30, 8); ctx.fill();
  OT(ctx, label, sx, sy - 13, 15, '#FFC233');
  ctx.restore();
}
PUM.games.load = function (o) {
  const {player, assist, api} = o;
  const mode = o.mat, M = R.MATS[mode], kind = M.loader, truck = M.truck, color = o.color, wd = o.world || 0;
  let gq, tries = 0;
  /* never a load of 1 or 2: every step needs at least 3 */
  do { gq = PUM.gateQuestion(player, 3, tries > 25 ? 1 : 0); } while ((gq.q.ans < 3 || gq.q.ans > 500) && tries++ < 50);
  const q = gq.q, target = Math.max(1, q.ans);
  const g = {t:0, count:0, queue:[], anim:null, state:'play', msg:'', msgT:0, fixing:false, doneT:0, roll:0, spin:0, exact:false, flinch:0, happyT:0, wigT:0};
  const parts = E.Particles();
  let W = 0, H = 0;
  const L = () => {
    const ts = Math.min(W * .46, H * .38, 260), tx = W - ts * .5 - 6, gy = Math.min(H * .74, Math.max(H * .55, 230 + ts * .9));
    const es = Math.min(W * .3, H * .28, 170), ex = tx - ts * .16 - es * .85;
    return {gy, ts, tx, es, ex, pileX:Math.max(es * .45, ex - es * .8)};
  };
  const say = (m, t = 1.6) => { g.msg = m; g.msgT = t; };
  const isDig = o.dig;
  const sp = String(q.spoken || '').trim(), verb = isDig ? 'Dig' : 'Load';
  const spoken = /[?.!]$/.test(sp) ? `${sp} ${verb} that many ${M.unit}.` : `${verb} this many ${M.unit}. ${sp}.`;
  api.showQuestion(Object.assign({}, q, {spoken}), isDig ? `Dig this many ${M.unit}:` : `Load this many ${M.unit}:`);
  function press(n) {
    if (g.state !== 'play') return;
    if (n < 0) { if (g.queue.length) g.queue.pop(); else if (g.count > 0) { g.count--; PUM.audio.sfx('tap'); } return; }
    if (g.queue.length < 4) { g.queue.push(n); PUM.audio.sfx('tap'); }
  }
  function finishCheck() {
    g.state = 'check';
    const ok = g.count === target;
    g.exact = ok;
    api.answer(ok, q);
    api.hideQuestion(ok);
    if (ok) { say(isDig ? 'Perfect dig!' : 'Perfect load!', 2); parts.burst(W * .7, H * .4, 24, {speed:220, color:['#FFC233', '#FFFFFF', '#22A06B'], shape:'star', size:7, life:.9}); g.doneT = 1.6; g.state = 'leave'; }
    else { say(`The order was ${target} ${M.unit}`, 2.4); g.fixing = true; g.state = 'fix'; g.fixT = .9; }
  }
  function update(dt) {
    g.t += dt; parts.update(dt); if (g.msgT > 0) g.msgT -= dt; g.flinch = Math.max(0, g.flinch - dt); g.happyT = Math.max(0, g.happyT - dt); g.wigT = Math.max(0, g.wigT - dt);
    const l = L();
    if (!g.anim && g.queue.length) g.anim = {n:g.queue.shift(), p:0, dur:kind === 'chute' ? .5 : .62, given:false};
    if (g.anim) {
      const a = g.anim; a.p += dt / a.dur;
      if (!a.given && a.p >= (kind === 'forklift' ? .5 : .62)) {
        a.given = true; g.count = Math.min(9999, g.count + a.n); PUM.audio.sfx(kind === 'chute' ? 'refuel' : 'brick'); g.flinch = .35; g.happyT = 1; g.wigT = .7;
        const dx = l.tx - l.ts * .16, dy = l.gy - l.ts * .5;
        parts.burst(dx, dy, 8, {speed:90, angle:-Math.PI / 2, spread:2, color:[M.col, '#FFFFFF'], size:5, g:300, life:.5});
      }
      if (a.p >= 1) g.anim = null;
    }
    if (kind === 'chute') g.spin += dt * (g.anim ? 3 : .8);
    if (g.state === 'play' && g.wantDone && !g.anim && !g.queue.length) { g.wantDone = false; finishCheck(); }
    if (g.state === 'fix') {
      g.fixT -= dt;
      if (g.fixT <= 0) {
        if (g.count > target) { g.count = Math.max(target, g.count - Math.max(1, Math.ceil((g.count - target) / 6))); g.fixT = .12; PUM.audio.sfx('tap'); }
        else if (g.count < target && !g.anim && !g.queue.length) { const need = target - g.count, n = need >= 100 ? 100 : need >= 10 ? 10 : need >= 5 ? 5 : 1; g.queue.push(n); g.fixT = 0; }
        else if (g.count === target && !g.anim && !g.queue.length) { g.state = 'leave'; g.doneT = 1.4; say(isDig ? 'Foundation dug!' : 'Loaded up!', 1.4); }
      }
    }
    if (g.state === 'leave') {
      g.doneT -= dt; g.roll += dt * 6;
      if (g.doneT <= 0 && g.state !== 'gone') { g.state = 'gone'; api.finish({ok:true, exact:g.exact, amount:target}); }
    }
    hud();
  }
  let hudT = 0;
  function hud() { hudT -= 1; if (hudT > 0) return; hudT = 6; api.hud({}); }
  function draw(ctx, w, h) {
    W = w; H = h; const l = L();
    backdrop(ctx, W, l.gy, g.t, isDig ? 'site' : kind, kind === 'chute' ? W * .62 : Math.max(76, l.pileX), wd);
    const cam = CR.cam(g.t, W); ctx.save(); CR.withCam(ctx, W, l.gy, cam, 1);
    CR.ground(ctx, W, l.gy, H, isDig ? 'grass' : 'yard', wd);
    /* the truck's mood: flinch as a load lands, grin after, worry while it's being fixed, cheer as it leaves */
    const tm = g.state === 'leave' ? 'cheer' : g.state === 'fix' ? (assist >= 2 ? 'surprise' : 'worry') : g.flinch > 0 ? 'surprise' : g.happyT > 0 ? 'grin' : 'happy';
    const tq = {t:g.t, mood:tm, sq:g.flinch > 0 ? .06 * g.flinch / .35 : 0, hop:g.state === 'leave' ? Math.abs(Math.sin(g.t * 9)) * .03 : 0, look:g.anim ? -1 : 0};
    const leave = g.state === 'leave' ? Math.max(0, 1.4 - g.doneT) : 0;
    const tx = l.tx + leave * leave * W * .5;
    const a = g.anim, ap = a ? a.p : 0;
    if (kind === 'excavator') {
      const pileX = l.pileX, pileTop = l.gy - (isDig ? -l.es * .02 : l.es * .3);
      if (isDig) { const d = Math.min(1, g.count / Math.max(target, 6)); ctx.fillStyle = '#8E6640'; ctx.beginPath(); ctx.ellipse(pileX + l.es * .1, l.gy + 4, l.es * .38, l.es * (.06 + .1 * d), 0, 0, 7); ctx.fill(); ctx.strokeStyle = P('ink'); ctx.lineWidth = 2; ctx.stroke(); }
      else { ctx.fillStyle = M.col; ctx.strokeStyle = P('ink'); ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(pileX - l.es * .5, l.gy); ctx.quadraticCurveTo(pileX, l.gy - l.es * .75, pileX + l.es * .5, l.gy); ctx.closePath(); ctx.fill(); ctx.stroke(); }
      /* Reach targets in the excavator's own facing-right frame. */
      const X = l.ex, s2 = l.es, dPile = X - pileX, dBed = (tx - l.ts * .16) - X, bedY = l.gy - l.ts * .6;
      const rest = [X + s2 * .5, l.gy - s2 * .62], high = [X + s2 * .42, l.gy - s2 * .88], dig = [X + dPile, pileTop], drag = [X + dPile - s2 * .18, pileTop - s2 * .02], bed = [X + dBed, bedY];
      let bx = rest[0], by = rest[1], full = false, tip = 0, face = -1;
      const mv = (A2, B2, f) => { const e2 = -Math.cos(clamp(f, 0, 1) * Math.PI) / 2 + .5; bx = lerp(A2[0], B2[0], e2); by = lerp(A2[1], B2[1], e2); };
      if (a) {
        const p = ap;
        if (p < .22) mv(rest, dig, p / .22);
        else if (p < .34) { mv(dig, drag, (p - .22) / .12); full = true; tip = -.7 * (p - .22) / .12; }
        else if (p < .5) { mv(drag, high, (p - .34) / .16); full = true; tip = -.7; face = -Math.cos(clamp((p - .38) / .12, 0, 1) * Math.PI); }
        else if (p < .62) { mv(high, bed, (p - .5) / .12); full = true; tip = -.7; face = 1; }
        else if (p < .72) { bx = bed[0]; by = bed[1]; tip = lerp(-.7, 1.5, (p - .62) / .1); face = 1; full = p < .64; }
        else if (p < .86) { mv(bed, high, (p - .72) / .14); tip = lerp(1.5, 0, (p - .72) / .14); face = Math.cos(clamp((p - .74) / .12, 0, 1) * Math.PI); }
        else mv(high, rest, (p - .86) / .14);
      }
      R.drawTruck(ctx, 'dump', tx, l.gy, l.ts, color, Object.assign({load:g.count, mat:isDig ? 'dirt' : mode, roll:g.roll}, tq));
      R.drawExcavator(ctx, X, l.gy, s2, 'star', bx, by, {full, tip, face, matCol:isDig ? '#A87A50' : M.col, t:g.t, mood:a ? 'focus' : g.state === 'leave' ? 'cheer' : g.wigT > 0 ? 'grin' : 'happy', wig:g.wigT > 0 ? Math.sin(g.t * 22) * .35 : Math.sin(g.t * 3) * .08, look:face > 0 ? 1 : -1});
    } else if (kind === 'forklift') {
      const sx = l.pileX + l.es * .1, deckX = tx - l.ts * .62, deckY = l.ts * .17;
      ctx.fillStyle = M.col; ctx.strokeStyle = P('ink'); ctx.lineWidth = 2.5;
      for (let r = 0; r < 3; r++) for (let c = 0; c < 2; c++) { if (mode === 'beams') { E.rr(ctx, sx - l.es * .4, l.gy - (r + 1) * l.es * .08 - c * l.es * .24, l.es * .7, l.es * .07, 3); ctx.fill(); ctx.stroke(); } else { ctx.fillRect(sx - l.es * .4 + c * l.es * .32, l.gy - (r + 1) * l.es * .15, l.es * .3, l.es * .14); ctx.strokeRect(sx - l.es * .4 + c * l.es * .32, l.gy - (r + 1) * l.es * .15, l.es * .3, l.es * .14); } }
      R.drawTruck(ctx, 'flatbed', tx, l.gy, l.ts, color, Object.assign({load:g.count, mat:mode, roll:g.roll}, tq, g.happyT > 0 && g.state === 'play' ? {mood:'proud', tilt:Math.sin(g.happyT * 12) * .02} : {}));
      let fx = sx + l.es * .5, lift = 0, carry = 0;
      if (a) { const p = ap; if (p < .5) { fx = lerp(sx + l.es * .45, deckX - l.es * .45, p / .5); lift = deckY * Math.min(1, p / .35); carry = a.n; } else { fx = lerp(deckX - l.es * .45, sx + l.es * .45, (p - .5) / .5); lift = deckY * (1 - (p - .5) / .5); } }
      R.drawForklift(ctx, fx, l.gy, l.es * .8, 'marigold', lift, carry, mode);
    } else {
      const siloX = l.ex, hx = tx - l.ts * .5, hy = l.gy - l.ts * .42;
      R.drawSilo(ctx, siloX, l.gy, l.es * 1.1, !!a, hx, hy, g.t);
      R.drawTruck(ctx, 'mixer', tx, l.gy, l.ts, color, Object.assign({load:g.count, mat:'concrete', spin:g.spin, roll:g.roll}, tq, a && g.state === 'play' ? {mood:'cheer'} : {}));
    }
    parts.draw(ctx); ctx.restore(); CR.front(ctx, W, H, cam, wd); CR.light(ctx, W, H);
    /* counter sign */
    const sx = W / 2, sy = l.gy + Math.min(80, (H - l.gy) * .42), bw2 = Math.min(W - 40, 260);
    ctx.fillStyle = '#FFF4DC'; ctx.strokeStyle = P('ink'); ctx.lineWidth = 3; E.rr(ctx, sx - bw2 / 2, sy - 40, bw2, 80, 16); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#7A6250'; ctx.font = '700 15px Lexend, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(isDig ? 'Dug so far' : 'Loaded so far', sx, sy - 22);
    const numS = String(g.count), unitS = g.count === 1 ? M.unit.replace(/s$/, '') : M.unit;
    ctx.font = '800 38px Lexend, sans-serif'; const nw = ctx.measureText(numS).width; ctx.font = '700 20px Lexend, sans-serif'; const uw = ctx.measureText(' ' + unitS).width;
    const x0 = sx - (nw + uw) / 2;
    E.numText(ctx, numS, x0, sy + 10, 38, P('ink'), null, 'left');
    ctx.fillStyle = P('ink'); ctx.font = '700 20px Lexend, sans-serif'; ctx.textAlign = 'left'; ctx.fillText(' ' + unitS, x0 + nw, sy + 13);
    if (g.queue.length) { ctx.fillStyle = '#4A3226'; ctx.font = '700 17px Lexend, sans-serif'; ctx.textAlign = 'center'; ctx.fillText(`+${g.queue.reduce((s, v) => s + v, 0)} more coming`, sx, sy + 58); }
    CR.paper(ctx, W, H, .4);
    if (g.msgT > 0) { let fs = Math.min(40, W * .09); ctx.font = `800 ${fs}px Sniglet, sans-serif`; const mw = ctx.measureText(g.msg).width; if (mw > W * .9) fs *= W * .9 / mw; OT(ctx, g.msg, W / 2, H * .36, fs, '#FFC233'); }
  }
  return {
    update, draw, resize(w, h) { W = w; H = h; },
    setControl(name, on) {
      if (!on) return;
      if (name === 'done') { if (g.state !== 'play') return; if (g.count === 0 && !g.queue.length && !g.anim) { api.toast(isDig ? 'Dig some first!' : 'Load some first!'); return; } g.wantDone = true; return; }
      if (name === 'less') press(-1);
      const m = /^add(\d+)$/.exec(name); if (m) press(Number(m[1]));
    },
    _debug: () => ({g, target, q}),
  };
};

/* ---------- crane drop ---------- */
PUM.games.crane = function (o) {
  const {assist, api} = o, job = o.job, n = job.steps.length;
  const sp = assist >= 2 ? 1.1 : assist ? 1.5 : 2.1, tol = assist >= 2 ? [.12, .3] : assist ? [.08, .22] : [.05, .16];
  const g = {t:0, state:'swing', px:0, py:0, vy:0, grade:0, msg:'', msgT:0, endT:0, phase:Math.random() * 6};
  const parts = E.Particles();
  let W = 0, H = 0;
  const wd = job.world || 0;
  const L = () => { const gy = H * .8, bw = Math.min(W * .6, H * .45, H * .4 / R.hb(job)), cx = W * .45, mx = W - Math.max(20, W * .05); return {gy, bw, cx, mx, jibY:Math.max(H * .2, gy - bw * 1.5), hookY:Math.max(H * .32, gy - bw * 1.1), A:Math.min(W * .3, cx - 12)}; };
  let topY = 0;
  function drop() { if (g.state !== 'swing') return; g.state = 'fall'; g.vy = 0; PUM.audio.sfx('jump'); }
  return {
    resize(w, h) { W = w; H = h; },
    update(dt) {
      g.t += dt; parts.update(dt); if (g.msgT > 0) g.msgT -= dt;
      const l = L();
      if (g.state === 'swing') { g.px = l.cx + Math.sin(g.t * sp + g.phase) * l.A; g.py = l.hookY; }
      else if (g.state === 'fall') {
        g.vy += 1800 * dt; g.py += g.vy * dt;
        if (g.py >= topY) {
          g.py = topY; const off = Math.abs(g.px - l.cx) / l.bw;
          g.grade = off < tol[0] ? 3 : off < tol[1] ? 2 : 1;
          g.msg = g.grade === 3 ? 'PERFECT!' : g.grade === 2 ? 'Nice drop!' : 'Wobble! Nudged into place'; g.msgT = 2.2;
          PUM.audio.sfx(g.grade === 3 ? 'fanfare' : g.grade === 2 ? 'yes' : 'thud');
          parts.burst(g.px, g.py, 20, {speed:200, color:['#FFC233', '#FFFFFF', '#E8577A'], shape:g.grade === 3 ? 'star' : 'circle', size:6, life:.9});
          g.state = 'land'; g.endT = 2.2;
        }
      } else if (g.state === 'land') {
        g.px = lerp(g.px, l.cx, Math.min(1, dt * 4)); g.endT -= dt;
        if (Math.random() < .3) parts.add({x:Math.random() * W, y:-10, vx:(Math.random() - .5) * 40, vy:80, life:2.5, size:7, shape:'rect', vr:6, color:['#FFC233', '#E8577A', '#2F95D6', '#22A06B'][Math.floor(Math.random() * 4)], fade:false});
        if (g.endT <= 0) { g.state = 'done'; api.finish({ok:true, grade:g.grade}); }
      }
    },
    draw(ctx, w, h) {
      W = w; H = h; const l = L();
      const cam = CR.scenery(ctx, W, l.gy, g.t, {kind:'site', world:wd}); ctx.save(); CR.withCam(ctx, W, l.gy, cam, 1); CR.ground(ctx, W, l.gy, H, 'grass', wd);
      topY = R.drawBuilding(ctx, job, l.cx, l.gy, l.bw, n - 1, {t:g.t, noPiece:true, river:.3});
      /* Stretch the crane: his telescoping boom carries the piece; his face follows it */
      const trolleyX = g.state === 'swing' ? g.px : (g.trolley = g.trolley != null ? g.trolley : g.px);
      const ph = (R.PIECE_H[job.piece] || .2) * l.bw, hookY = (g.state === 'swing' ? g.py : l.hookY) - ph - 14;
      const cs = Math.min(W * .42, 210), cxr = W - cs * .38, ck = cs / 208, tipY = Math.min(l.jibY, hookY - 70);
      const cm = g.state === 'swing' ? 'focus' : g.state === 'fall' ? 'surprise' : g.grade === 3 ? 'cheer' : g.grade === 2 ? 'grin' : (g.endT > 1.4 ? 'squeeze' : 'happy');
      const chop = g.state === 'land' && g.grade === 3 ? Math.abs(Math.sin(g.t * 9)) * .04 : 0;
      R.drawTruck(ctx, 'crane', cxr, l.gy, cs, o.player ? R.paint(o.player, 'crane') : 'rose', {t:g.t, mood:cm, look:1, flip:true, hop:chop, tip:[-(trolleyX - cxr) / ck, (tipY - l.gy) / ck], noHook:true});
      ctx.save(); ctx.strokeStyle = P('ink');
      ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(trolleyX - 3, tipY); ctx.lineTo(trolleyX - 3, hookY); ctx.moveTo(trolleyX + 3, tipY); ctx.lineTo(trolleyX + 3, hookY); ctx.stroke();
      ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(trolleyX, hookY + 4, 6, 0, Math.PI); ctx.stroke();
      if (g.state === 'swing') { ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(trolleyX, hookY + 10); ctx.lineTo(g.px - l.bw * .2, g.py - ph * .6); ctx.moveTo(trolleyX, hookY + 10); ctx.lineTo(g.px + l.bw * .2, g.py - ph * .6); ctx.stroke(); }
      ctx.restore();
      if (g.state === 'swing') { ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.setLineDash([6, 8]); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(g.px, g.py + 4); ctx.lineTo(g.px, topY); ctx.stroke(); ctx.setLineDash([]); ctx.fillStyle = 'rgba(34,160,107,.35)'; ctx.fillRect(l.cx - l.bw * tol[1], topY - 6, l.bw * tol[1] * 2, 10); ctx.fillStyle = 'rgba(34,160,107,.8)'; ctx.fillRect(l.cx - l.bw * tol[0], topY - 6, l.bw * tol[0] * 2, 10); }
      R.drawPiece(ctx, job, g.px, g.py, l.bw, g.t);
      parts.draw(ctx);
      ctx.restore(); CR.front(ctx, W, H, cam, wd); CR.light(ctx, W, H);
      CR.paper(ctx, W, H, .4);
      if (g.state === 'swing') OT(ctx, `Tap to drop the ${R.PIECE[job.piece]}!`, W / 2, H * .1 + 30, Math.min(26, W * .06), '#FFFFFF');
      if (g.msgT > 0) { let fs = Math.min(44, W * .1); ctx.font = `800 ${fs}px Sniglet, sans-serif`; const mw = ctx.measureText(g.msg).width; if (mw > W * .9) fs *= W * .9 / mw; OT(ctx, g.msg, W / 2, H * .3, fs, '#FFC233'); }
    },
    pointer(type) { if (type === 'down') drop(); },
    setControl(name, on) { if (on && name === 'drop') drop(); },
    _debug: () => ({g, tol, sp}),
  };
};

/* ---------- delivery: back into the site, unload, build, get paid ---------- */
R.DONE_LABEL = {gravel:'Gravel base laid!', dirt:'Ground ready!', bricks:'Brick walls going up!', concrete:'Concrete poured!', beams:'Steel beams in place!'};
PUM.games.unload = function (o) {
  const {api, job, stage, mat, truck, color, cargo, pay} = o;
  const M = R.MATS[mat], n = job.steps.length, s0 = stage, s1 = stage + 1, wd = job.world || 0, Z = R.zone(job, stage);
  /* where this load lands on the building: the zone's x range and a height that climbs as it builds */
  const zx = (l, r) => l.bx + lerp(Z[0], Z[1], r) * l.bw, zy = (l, f) => l.gy - lerp(Z[2], Z[3], f) * l.bw;
  const T1 = 1.9, T2 = T1 + 2.1, T3 = T2 + 2.3, T4 = T3 + 2.0;
  const ease = f => -Math.cos(clamp(f, 0, 1) * Math.PI) / 2 + .5, easeOut = f => 1 - Math.pow(1 - clamp(f, 0, 1), 3);
  const g = {t:0, speed:1, paid:0, coins:[], boxes:[], pile:0, msg:'', msgT:0, msg2:'', beepT:0, brickT:0, s:s0, state:'run', endT:0, roll:0, spin:0, said:{}, shake:0};
  const truckColor = color;
  const parts = E.Particles();
  const boxN = Math.max(1, Math.ceil(cargo * 8));
  let W = 0, H = 0;
  const L = () => {
    const gy = H * .66, bw = Math.min(W * .56, H * .4, 320, H * .36 / R.hb(job)), bx = Math.max(bw * .46 + 6, W * .3), ts = Math.min(W * .5, H * .3, 260);
    const stopX = Math.min(W - ts * .5 - 4, bx + bw * .45 + ts * .62);
    return {gy, bw, bx, ts, stopX, pileX:stopX - ts * .74, rearX:stopX - ts * .47};
  };
  const say = (m, t = 2.2, m2 = '') => { g.msg = m; g.msgT = t; g.msg2 = m2; };
  const once = (k, f) => { if (!g.said[k]) { g.said[k] = true; f(); } };
  function finish() { if (g.state === 'done') return; g.state = 'done'; while (g.paid < pay) { g.paid++; api.addMp(1); } api.finish({ok:true, paid:g.paid}); }
  function update(dt) {
    if (g.state === 'done') return;
    dt *= g.speed; g.t += dt; parts.update(dt); if (g.msgT > 0) g.msgT -= dt; if (g.shake > 0) g.shake = Math.max(0, g.shake - dt * 20);
    const l = L(), t = g.t;
    /* 1: back into the site */
    if (t < T1) {
      g.roll -= dt * 9; g.beepT -= dt;
      if (g.beepT <= 0 && t < T1 - .3) { g.beepT = .45; PUM.audio.tone(1150, 0, .16, 'square', .04); }
      once('in', () => say(`Delivery for the ${job.name.toLowerCase()}!`, 1.8, 'Beep, beep, backing in...'));
      const txNow = lerp(W + l.ts * .7, l.stopX, easeOut(t / T1));
      if (Math.random() < .3) parts.add({x:txNow + l.ts * .45, y:l.gy - 6, vx:40, vy:-20, life:.6, size:6, grow:2, color:'rgba(160,140,110,.5)'});
    }
    /* 2: unload */
    else if (t < T2) {
      const u = (t - T1) / (T2 - T1);
      once('unload', () => { PUM.audio.sfx('thud'); g.shake = 4; });
      if (truck === 'dump') {
        if (u > .25 && u < .9) { g.pile = Math.min(cargo, g.pile + dt * cargo / ((T2 - T1) * .6)); for (let k = 0; k < 3; k++) parts.add({x:l.rearX - 4 + Math.random() * 10, y:l.gy - l.ts * .3 + Math.random() * 10, vx:-40 - Math.random() * 70, vy:10 + Math.random() * 30, g:900, life:.3, size:3 + Math.random() * 4, color:Math.random() < .7 ? M.col : E.shade(M.col, -.25)}); if (Math.random() < .2) PUM.audio.noise(.12, .05, 500); }
      } else if (truck === 'flatbed') {
        const due = Math.floor(clamp(u / .8, 0, 1) * boxN);
        while (g.boxes.length < due) { g.boxes.push({t:0, from:[l.stopX - l.ts * .25 + (g.boxes.length % 4) * l.ts * .06, l.gy - l.ts * .3], to:[l.pileX - l.ts * .05 + (g.boxes.length % 3) * l.ts * .07, l.gy - 6 - Math.floor(g.boxes.length / 3) * l.ts * .06]}); PUM.audio.sfx('jump'); }
      } else {
        g.spin += dt * 4;
        if (u > .2 && u < .9) { g.pile = Math.min(cargo, g.pile + dt * cargo / ((T2 - T1) * .7)); for (let k = 0; k < 3; k++) parts.add({x:l.stopX - l.ts * .66 + Math.random() * 4, y:l.gy - l.ts * .16, vx:-20 - Math.random() * 30, vy:30 + Math.random() * 30, g:900, life:.3, size:4 + Math.random() * 3, color:Math.random() < .5 ? '#B9BFC7' : '#9AA0AA'}); }
      }
      if (u > .92) once('made', () => say(cargo >= .95 ? 'The whole load made it!' : `${Math.round(cargo * 100)}% of the load made it!`, 1.8));
    }
    /* 3: build */
    else if (t < T3) {
      const b = (t - T2) / (T3 - T2);
      g.s = lerp(s0, s1, ease(b / .72));
      if (truck !== 'flatbed') g.pile = Math.max(0, cargo * (1 - ease(b / .72)));
      g.brickT -= dt;
      if (g.brickT <= 0 && b < .66 && mat !== 'concrete') {
        if (mat === 'gravel' || mat === 'dirt') { g.brickT = .035; g.coins.push({kind:'stone', t:0, dur:.4, h:28, from:[l.pileX + (Math.random() - .5) * 16, l.gy - 6], to:[l.bx + (Math.random() - .5) * l.bw * .8, l.gy + l.bw * .03]}); }
        else if (mat === 'beams') { g.brickT = .3; g.coins.push({kind:'beam', t:0, dur:.7, h:130, from:[l.pileX, l.gy - 10], to:Z ? [zx(l, Math.random()), zy(l, ease(b / .72))] : [l.bx + (Math.random() - .5) * l.bw * .9, l.gy - l.bw * .25]}); }
        else { g.brickT = .09; const tx = Z ? zx(l, Math.random()) : l.bx + (Math.random() - .5) * l.bw * .55, ty = (Z ? zy(l, ease(b / .72)) : l.gy - l.bw * (.03 + .32 * ease(b / .72))) + Math.random() * 6; g.coins.push({kind:'brick', t:0, dur:.45, h:Z ? 70 + Math.max(0, l.gy - ty) * .5 : 70, from:[l.pileX, l.gy - 10], to:[tx, ty]}); }
      }
      once('build', () => PUM.audio.sfx('brick'));
      if (b > .72) once('built', () => { PUM.audio.sfx('up'); g.shake = 6; parts.burst(l.bx, l.gy - l.bw * .3, 26, {speed:240, color:['#FFC233', '#FFFFFF', '#22A06B', '#E8577A'], shape:'star', size:7, life:1}); for (let k = 0; k < 10; k++) parts.add({x:l.bx + (Math.random() - .5) * l.bw, y:l.gy - 4, vx:(Math.random() - .5) * 120, vy:-40 - Math.random() * 40, life:.9, size:8, grow:2, color:'rgba(185,150,110,.55)'}); say(R.DONE_LABEL[mat] || 'Built!', 2.4, s1 === n - 1 ? `Next: lift the ${R.PIECE[job.piece]} with the crane!` : ''); });
    }
    /* 4: get paid */
    else if (t < T4) {
      const p = (t - T3) / (T4 - T3);
      const due = Math.floor(clamp(p / .55, 0, 1) * pay);
      while (g.coins.filter(c => c.kind === 'coin').length < due) g.coins.push({kind:'coin', t:0, dur:.7, from:[l.stopX, l.gy - l.ts * .5], to:[W - 40, 28]});
      g.payShow = true;
      if (truck === 'mixer') g.spin += dt * 9;
    } else if (g.state === 'run') { g.state = 'wait'; g.speed = 1; }
    if (g.state === 'wait') { g.endT += dt; if (g.endT > 3) finish(); }
    for (const c of g.coins) { if (c.landed) continue; c.t += dt / c.dur; if (c.t >= 1) { c.landed = true; if (c.kind === 'coin') { g.paid++; api.addMp(1); PUM.audio.sfx('coin'); } else if (Math.random() < .3) PUM.audio.sfx('brick'); } }
    for (const b of g.boxes) if (b.t < 1) { b.t = Math.min(1, b.t + dt / .4); if (b.t >= 1) PUM.audio.sfx('brick'); }
  }
  function arc(c) { const f = easeOut(c.t); return [lerp(c.from[0], c.to[0], c.t), lerp(c.from[1], c.to[1], f) - Math.sin(c.t * Math.PI) * (c.h != null ? c.h : 70)]; }
  function draw(ctx, w, h) {
    W = w; H = h; const l = L(), t = g.t;
    ctx.save(); if (g.shake) ctx.translate((Math.random() - .5) * g.shake, (Math.random() - .5) * g.shake);
    backdrop(ctx, W, l.gy, t, 'site', false, wd);
    const cam = CR.cam(t, W); ctx.save(); CR.withCam(ctx, W, l.gy, cam, 1);
    CR.ground(ctx, W, l.gy, H, 'grass', wd);
    R.drawBuilding(ctx, job, l.bx, l.gy, l.bw, g.s, {t, river:job.b === 'bridge' ? .3 : 0});
    if (g.pile > .01) {
      const pw = l.ts * .32 * Math.sqrt(g.pile), ph = l.ts * .2 * g.pile;
      ctx.fillStyle = truck === 'mixer' ? '#B9BFC7' : M.col; ctx.strokeStyle = P('ink'); ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(l.pileX - pw, l.gy); ctx.quadraticCurveTo(l.pileX, l.gy - ph * 2, l.pileX + pw, l.gy); ctx.closePath(); ctx.fill(); ctx.stroke();
    }
    const unU = clamp((t - T1) / (T2 - T1), 0, 1), bU = clamp((t - T2) / (T3 - T2), 0, 1);
    if (mat === 'concrete' && t > T2 && bU < .72) {
      const x0 = l.pileX, y0 = l.gy - 4, x1 = Z ? zx(l, .85) : l.bx + l.bw * .3, y1 = Z ? zy(l, ease(bU / .72)) : l.gy + l.bw * .03, cx = (x0 + x1) / 2, cy = Math.min(l.gy - 10, y1 - 40);
      ctx.save(); ctx.lineCap = 'round';
      const path = () => { ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo(cx, cy, x1, y1); };
      path(); ctx.strokeStyle = P('ink'); ctx.lineWidth = 15 * (1 - bU * .5); ctx.stroke();
      path(); ctx.strokeStyle = '#CFC9BE'; ctx.lineWidth = 11 * (1 - bU * .5); ctx.stroke();
      path(); ctx.setLineDash([7, 11]); ctx.lineDashOffset = -t * 70; ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 3; ctx.stroke();
      ctx.restore();
    }
    if ((mat === 'gravel' || mat === 'concrete') && !(Z && Z[3] > .06) && bU > .74 && bU < .99) {
      const sx = l.bx - l.bw * .4 + (bU - .74) / .25 * l.bw * .8, sy = l.gy + (mat === 'concrete' ? -l.bw * .02 : l.bw * .01);
      ctx.save(); ctx.strokeStyle = P('ink'); ctx.lineWidth = 3; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(sx + 26, sy - 46); ctx.lineTo(sx, sy - 4); ctx.stroke();
      if (mat === 'gravel') { ctx.beginPath(); ctx.moveTo(sx - 12, sy - 4); ctx.lineTo(sx + 12, sy - 4); for (let i = -2; i <= 2; i++) { ctx.moveTo(sx + i * 6, sy - 4); ctx.lineTo(sx + i * 6, sy + 3); } ctx.stroke(); }
      else { ctx.fillStyle = '#B9BFC7'; ctx.fillRect(sx - 14, sy - 6, 28, 5); ctx.strokeRect(sx - 14, sy - 6, 28, 5); }
      ctx.fillStyle = 'rgba(255,255,255,.45)'; ctx.fillRect(l.bx - l.bw * .42, sy - 2, sx - (l.bx - l.bw * .42), 3);
      ctx.restore();
    }
    for (const [k, b] of g.boxes.entries()) {
      if (truck === 'flatbed' && t > T2 && k >= Math.ceil(boxN * (1 - bU))) continue;
      const f = easeOut(b.t), x = lerp(b.from[0], b.to[0], b.t), y = lerp(b.from[1], b.to[1], f) - Math.sin(b.t * Math.PI) * 50;
      ctx.fillStyle = M.col; ctx.strokeStyle = P('ink'); ctx.lineWidth = 2;
      if (mat === 'beams') { E.rr(ctx, x - l.ts * .12, y - l.ts * .04, l.ts * .24, l.ts * .04, 2); ctx.fill(); ctx.stroke(); }
      else { ctx.fillRect(x - l.ts * .035, y - l.ts * .06, l.ts * .07, l.ts * .06); ctx.strokeRect(x - l.ts * .035, y - l.ts * .06, l.ts * .07, l.ts * .06); }
    }
    const inF = easeOut(clamp(t / T1, 0, 1)), tx = lerp(W + l.ts * .7, l.stopX, inF);
    const tip = truck === 'dump' ? (t < T1 ? 0 : t < T2 ? ease(unU * 2.5) : 1 - ease(bU * 3)) : 0;
    const frac = truck === 'dump' ? 1 - clamp((unU - .25) / .65, 0, 1) : truck === 'flatbed' ? 1 - g.boxes.length / boxN : 1;
    /* the truck acts it out: looks back while reversing, cheers as it unloads, watches the building grow, then its signature move */
    let um;
    if (t < T1) um = {mood:'focus', look:-1};
    else if (t < T2) um = truck === 'flatbed' ? {mood:'proud', tilt:Math.sin(t * 10) * .015} : {mood:'cheer'};
    else if (t < T3) { const b = (t - T2) / (T3 - T2); um = b < .3 ? {mood:'surprise', look:-1} : b < .72 ? {mood:'grin', look:-1} : {mood:'cheer', hop:Math.abs(Math.sin(t * 8)) * .04}; }
    else if (t < T4) um = truck === 'dump' ? {mood:'cheer', hop:Math.abs(Math.sin(t * 7)) * .05} : truck === 'flatbed' ? {mood:'proud', tilt:Math.sin(t * 6) * .04} : {mood:'cheer'};
    else um = {mood:'happy'};
    R.drawTruck(ctx, truck, tx, l.gy, l.ts, truckColor, Object.assign({load:truck === 'mixer' ? 0 : 1, frac:cargo * frac, mat, tip, pour:truck === 'mixer' && t > T1 && t < T2, spin:g.spin, roll:g.roll, t}, um));
    for (const c of g.coins) {
      if (c.landed) continue;
      const [x, y] = arc(c);
      if (c.kind === 'coin') { ctx.fillStyle = '#FFC233'; ctx.strokeStyle = P('ink'); ctx.lineWidth = 2.5; ctx.beginPath(); ctx.ellipse(x, y, 11 * Math.abs(Math.cos(c.t * 9)) + 2, 11, 0, 0, 7); ctx.fill(); ctx.stroke(); }
      else if (c.kind === 'stone') { ctx.fillStyle = mat === 'dirt' ? '#9C6A42' : '#9A958C'; ctx.strokeStyle = P('ink'); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(x, y, 3.5, 0, 7); ctx.fill(); ctx.stroke(); }
      else if (c.kind === 'beam') { ctx.save(); ctx.translate(x, y); ctx.rotate((1 - c.t) * -.7); ctx.fillStyle = P('sea'); ctx.strokeStyle = P('ink'); ctx.lineWidth = 2; ctx.fillRect(-l.ts * .14, -4, l.ts * .28, 8); ctx.strokeRect(-l.ts * .14, -4, l.ts * .28, 8); ctx.restore(); }
      else { ctx.fillStyle = M.col; ctx.strokeStyle = P('ink'); ctx.lineWidth = 1.5; ctx.fillRect(x - 6, y - 4, 12, 8); ctx.strokeRect(x - 6, y - 4, 12, 8); }
    }
    parts.draw(ctx);
    ctx.restore(); CR.front(ctx, W, H, cam, wd); CR.light(ctx, W, H);
    CR.paper(ctx, W, H, .4);
    if (g.payShow) { const bx2 = l.stopX, by2 = l.gy - l.ts * .78, pop2 = 1 + .15 * Math.sin(Math.min(1, g.paid / Math.max(1, pay)) * Math.PI); ctx.save(); ctx.translate(bx2, by2); ctx.scale(pop2, pop2); ctx.fillStyle = '#FFC233'; ctx.strokeStyle = P('ink'); ctx.lineWidth = 3; E.rr(ctx, -62, -24, 124, 48, 24); ctx.fill(); ctx.stroke(); E.numText(ctx, `+${g.paid}`, -10, 1, 28, P('ink'), null); ctx.fillStyle = '#FFE07A'; ctx.beginPath(); ctx.arc(36, 0, 13, 0, 7); ctx.fill(); ctx.stroke(); ctx.restore(); }
    if (g.msgT > 0) {
      let fs = Math.min(38, W * .085); ctx.font = `800 ${fs}px Sniglet, sans-serif`; const mw = ctx.measureText(g.msg).width; if (mw > W * .92) fs *= W * .92 / mw;
      const pop = 1 + Math.max(0, g.msgT - 1.9) * 1.2;
      OT(ctx, g.msg, W / 2, H * .24, fs * pop, '#FFC233');
      if (g.msg2) { ctx.font = '700 18px Lexend, sans-serif'; ctx.fillStyle = '#4A3226'; ctx.textAlign = 'center'; ctx.fillText(g.msg2, W / 2, H * .24 + fs * .95); }
    }
    if (g.state === 'wait') { const a = .6 + .4 * Math.sin(t * 5); ctx.globalAlpha = a; OT(ctx, 'Tap to keep building', W / 2, H * .84, Math.min(24, W * .06), '#FFFFFF'); ctx.globalAlpha = 1; }
    else if (t > .5) { ctx.fillStyle = 'rgba(74,50,38,.6)'; ctx.font = '600 13px Lexend, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('Tap to speed up', W / 2, H * .88); }
    ctx.restore();
  }
  function tap() { if (g.state === 'wait') finish(); else g.speed = 3; }
  return {update, draw, resize(w, h) { W = w; H = h; }, pointer(type) { if (type === 'down') tap(); }, setControl(name, on) { if (on) tap(); }, paid:() => g.paid, _debug:() => ({g})};
};
})();
