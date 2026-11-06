/* Power-Up Math: Big Rig Builders. Building jobs, truck and machine art, the town map,
   and the loading, building site and crane mini-games. */
(function () {
'use strict';
const {clamp, lerp, mulberry32} = PUM.util;
const E = PUM.engine, P = c => E.col(c);
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
  {b:'house', steps:['dig', 'gravel', 'bricks', 'crane'], piece:'roof', color:'#E8577A', gives:null, givesText:'Your company\'s first building! The gas station lot opens next.'},
  {b:'gas', steps:['dig', 'gravel', 'bricks', 'crane'], piece:'canopy', color:'#2F95D6', gives:'tank', givesText:'A bigger fuel tank on every trip.'},
  {b:'mechanic', steps:['dig', 'concrete', 'bricks', 'crane'], piece:'sign', color:'#FF8A3D', gives:'bumper', givesText:'Your first crash on each trip loses no cargo.'},
  {b:'school', steps:['dig', 'concrete', 'bricks', 'bricks', 'crane'], piece:'bell', color:'#FFC233', gives:'hint', givesText:'One wrong answer lane is crossed out at every math gate.'},
  {b:'bridge', steps:['dig', 'concrete', 'beams', 'concrete', 'beams', 'crane'], piece:'span', color:'#7357DB', gives:'road', givesText:'Opens the road to the Hills.'},
];
R.PIECE = {roof:'roof', canopy:'canopy', sign:'sign', bell:'bell tower', span:'bridge deck'};
R.PIECE_H = {roof:.27, canopy:.1, sign:.17, bell:.37, span:.16};
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
  if (n > shown) E.outlineText(ctx, `+${n - shown}`, (x0 + x1) / 2, base - 4.6 * bh, bh * .9, '#FFFFFF');
}
/* load: a count (loader) or a 0..1 fraction (road); mat: material key */
R.drawTruck = function (ctx, kind, x, y, s, color, o = {}) {
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
    const top = y - s * .43;
    if (load > 0) {
      const f = o.frac != null ? o.frac : 1 - Math.exp(-load / 8), mc = R.MATS[mat] ? R.MATS[mat].col : '#9AA0AA';
      ctx.fillStyle = mc; ctx.beginPath(); ctx.moveTo(bx0 + s * .02, top + s * .04); ctx.quadraticCurveTo((bx0 + bx1) / 2, top - f * s * .3, bx1 - s * .02, top + s * .04); ctx.closePath(); ctx.fill(); ctx.stroke();
    }
    ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(bx0, top); ctx.lineTo(bx1, top); ctx.lineTo(bx1 - s * .03, base); ctx.lineTo(bx0 + s * .05, base); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); for (const f of [.3, .6]) { ctx.moveTo(bx0 + s * .04, lerp(top, base, f)); ctx.lineTo(bx1 - s * .03, lerp(top, base, f)); } ctx.stroke();
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
    if (load > 0 && o.frac == null) E.outlineText(ctx, String(load), cx, cy - s * .01, s * .11, '#FFFFFF');
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
R.drawExcavator = function (ctx, x, y, s, color, bx, by, o = {}) {
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
  if (carry) { const m = R.MATS[mat]; if (mat === 'beams') { ctx.fillStyle = m.col; for (let k = 0; k < Math.min(3, carry); k++) { E.rr(ctx, x + s * .2, fy - s * .1 - k * s * .07, s * .42, s * .06, s * .01); ctx.fill(); ctx.stroke(); } } else { ctx.fillStyle = m.col; const h = s * (carry > 1 ? .24 : .14); ctx.fillRect(x + s * .27, fy - s * .03 - h, s * .26, h); ctx.strokeRect(x + s * .27, fy - s * .03 - h, s * .26, h); } if (carry > 1) E.outlineText(ctx, `×${carry}`, x + s * .4, fy - s * .3, s * .14, '#FFFFFF'); }
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
  if (job.piece === 'roof') { ctx.fillStyle = '#7A3B4F'; ctx.beginPath(); ctx.moveTo(x - w * .38, y); ctx.lineTo(x, y - w * .26); ctx.lineTo(x + w * .38, y); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillStyle = P('brick'); ctx.fillRect(x + w * .14, y - w * .22, w * .07, w * .12); ctx.strokeRect(x + w * .14, y - w * .22, w * .07, w * .12); }
  else if (job.piece === 'canopy') { ctx.fillStyle = '#FFFFFF'; E.rr(ctx, x - w * .48, y - w * .09, w * .96, w * .09, w * .02); ctx.fill(); ctx.stroke(); ctx.fillStyle = job.color; ctx.fillRect(x - w * .48, y - w * .045, w * .96, w * .03); E.outlineText(ctx, 'GAS', x, y - w * .045, w * .07, '#FFC233'); }
  else if (job.piece === 'sign') { ctx.fillStyle = P('metal'); ctx.fillRect(x - w * .2, y - w * .05, w * .03, w * .05); ctx.fillRect(x + w * .17, y - w * .05, w * .03, w * .05); ctx.fillStyle = job.color; E.rr(ctx, x - w * .3, y - w * .16, w * .6, w * .12, w * .03); ctx.fill(); ctx.stroke(); E.outlineText(ctx, 'FIX IT', x, y - w * .1, w * .07, '#FFFFFF'); }
  else if (job.piece === 'bell') { ctx.fillStyle = job.color; ctx.fillRect(x - w * .1, y - w * .16, w * .2, w * .16); ctx.strokeRect(x - w * .1, y - w * .16, w * .2, w * .16); ctx.fillStyle = '#7A3B4F'; ctx.beginPath(); ctx.moveTo(x - w * .14, y - w * .16); ctx.lineTo(x, y - w * .28); ctx.lineTo(x + w * .14, y - w * .16); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillStyle = P('star'); ctx.beginPath(); ctx.arc(x, y - w * .08, w * .04, Math.PI, 0); ctx.lineTo(x + w * .05, y - w * .05); ctx.lineTo(x - w * .05, y - w * .05); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x, y - w * .28); ctx.lineTo(x, y - w * .36); ctx.stroke(); ctx.fillStyle = P('rose'); ctx.beginPath(); ctx.moveTo(x, y - w * .36); ctx.lineTo(x + w * .08, y - w * .33); ctx.lineTo(x, y - w * .3); ctx.fill(); ctx.stroke(); }
  else if (job.piece === 'span') { ctx.fillStyle = job.color; E.rr(ctx, x - w * .58, y - w * .07, w * 1.16, w * .07, w * .02); ctx.fill(); ctx.stroke(); ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = Math.max(1, w * .012); ctx.beginPath(); ctx.moveTo(x - w * .56, y - w * .15); ctx.lineTo(x + w * .56, y - w * .15); for (let k = -5; k <= 5; k++) { ctx.moveTo(x + k * w * .1, y - w * .07); ctx.lineTo(x + k * w * .1, y - w * .15); } ctx.stroke(); }
  ctx.restore();
};
/* stage: steps done (can be fractional while it grows). Returns the y of the top of the walls. */
R.drawBuilding = function (ctx, job, x, y, w, stage, o = {}) {
  const n = job.steps.length, dug = clamp(stage, 0, 1), k = clamp((stage - 1) / (n - 2), 0, 1), pf = clamp(stage - (n - 1), 0, 1);
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
    if (dug > 0) { ctx.fillStyle = '#B9BFC7'; ctx.fillRect(x - w * .42, y - w * .05 * dug, w * .84, w * .05 * dug); ctx.strokeRect(x - w * .42, y - w * .05 * dug, w * .84, w * .05 * dug); }
  }
  const fy = y - w * .05;
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
    if (dug > 0) { ctx.fillStyle = '#B9BFC7'; for (const px of [-.22, .22]) { ctx.fillRect(x + px * w - w * .06, y - w * .03 * dug, w * .12, w * .03 * dug); ctx.strokeRect(x + px * w - w * .06, y - w * .03 * dug, w * .12, w * .03 * dug); } }
    const h = w * .2 * k; ctx.fillStyle = '#B9BFC7'; if (h > 0) for (const px of [-.22, .22]) { ctx.fillRect(x + px * w - w * .045, y - w * .03 - h, w * .09, h); ctx.strokeRect(x + px * w - w * .045, y - w * .03 - h, w * .09, h); }
    top = y - w * .23;
  }
  if (pf > 0 && !o.noPiece) { ctx.globalAlpha = Math.min(1, pf * 2); R.drawPiece(ctx, job, x, top - (1 - pf) * w * .4, w, o.t); ctx.globalAlpha = 1; }
  ctx.restore();
  return top;
};

/* ---------- town map ---------- */
R.townHeight = W => 150 + R.JOBS.length * 170 + 150;
R.drawTown = function (ctx, W, H, p, t, cur) {
  const rand = mulberry32(42), lots = [], pr = p.prog.trucks, job = p.rig.job;
  ctx.fillStyle = '#7CC765'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#6DB857'; for (let i = 0; i < 60; i++) { ctx.beginPath(); ctx.ellipse(rand() * W, rand() * H, 20 + rand() * 30, 8 + rand() * 8, 0, 0, 7); ctx.fill(); }
  const roadX = y => W / 2 + Math.sin(y / 170 * Math.PI) * W * .1;
  const riverY = 150 + 4 * 170 + 20;
  ctx.fillStyle = '#4AA3DF'; ctx.beginPath(); ctx.moveTo(0, riverY - 34); for (let x = 0; x <= W; x += 10) ctx.lineTo(x, riverY - 34 + Math.sin(x / 40 + t) * 4); ctx.lineTo(W, riverY + 34); for (let x = W; x >= 0; x -= 10) ctx.lineTo(x, riverY + 34 + Math.sin(x / 40 + t + 1) * 4); ctx.closePath(); ctx.fill();
  const bridgeDone = R.built(p, 4);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const road = (w, col, dash) => { ctx.strokeStyle = col; ctx.lineWidth = w; ctx.setLineDash(dash || []); ctx.beginPath(); for (let y = -10; y <= H + 10; y += 10) { if (!bridgeDone && y > riverY - 40 && y < riverY + 40) { ctx.stroke(); ctx.beginPath(); continue; } ctx[y === -10 ? 'moveTo' : 'lineTo'](roadX(y), y); } ctx.stroke(); ctx.setLineDash([]); };
  road(56, '#4A4F5C'); road(48, '#6B6F7A'); road(4, '#FFFFFF', [18, 16]);
  for (let i = 0; i < 26; i++) { const ty = rand() * H, side = rand() < .5 ? -1 : 1, tx = roadX(ty) + side * (W * .42 + rand() * W * .1); if (Math.abs(ty - riverY) < 50) continue; ctx.fillStyle = '#7A5A3A'; ctx.fillRect(tx - 3, ty - 4, 6, 14); ctx.fillStyle = '#3E9A5A'; ctx.beginPath(); ctx.arc(tx, ty - 10, 14, 0, 7); ctx.fill(); }
  ctx.fillStyle = '#1D2540'; E.rr(ctx, W / 2 - 92, 12, 184, 40, 12); ctx.fill();
  E.outlineText(ctx, 'MAIN STREET', W / 2, 32, 20, '#FFC233');
  const bw = Math.min(150, W * .36);
  R.JOBS.forEach((jb, i) => {
    const J = R.job(i), y = 150 + i * 170, boss = i === 4;
    const x = boss ? roadX(riverY) : roadX(y) + (i % 2 ? 1 : -1) * W * .26;
    const ly = boss ? riverY + 18 : y + 40;
    const locked = i > pr.unlocked, built = R.built(p, i);
    let stage = built ? jb.steps.length : (job && job.i === i ? job.stage : 0);
    if (locked) {
      ctx.fillStyle = 'rgba(29,37,64,.18)'; ctx.beginPath(); ctx.ellipse(x, ly, bw * .5, bw * .1, 0, 0, 7); ctx.fill();
      ctx.strokeStyle = '#8E6640'; ctx.lineWidth = 3; ctx.beginPath(); for (let k = -3; k <= 3; k++) { ctx.moveTo(x + k * bw * .13, ly + 4); ctx.lineTo(x + k * bw * .13, ly - 22); } ctx.moveTo(x - bw * .4, ly - 16); ctx.lineTo(x + bw * .4, ly - 16); ctx.stroke();
      ctx.fillStyle = '#FFC233'; ctx.strokeStyle = '#1D2540'; ctx.lineWidth = 3; E.rr(ctx, x - 13, ly - 50, 26, 22, 5); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.arc(x, ly - 50, 8, Math.PI, 0); ctx.stroke();
    } else if (boss) {
      R.drawBuilding(ctx, J, x, riverY + 30, bw * 1.15, stage, {t, river:built ? 0 : .4});
    } else R.drawBuilding(ctx, J, x, ly, bw, stage, {t});
    const plateY = ly + (boss ? 26 : 26);
    ctx.font = '700 15px Lexend, sans-serif'; const label = J.name, tw = ctx.measureText(label).width + 24;
    ctx.fillStyle = locked ? 'rgba(29,37,64,.55)' : '#FFFFFF'; ctx.strokeStyle = '#1D2540'; ctx.lineWidth = 3; E.rr(ctx, x - tw / 2, plateY, tw, 28, 10); ctx.fill(); ctx.stroke();
    ctx.fillStyle = locked ? '#FFFFFF' : '#1D2540'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(label, x, plateY + 15);
    if (built) { const st = pr.stars[i]; for (let s2 = 0; s2 < 3; s2++) { ctx.fillStyle = s2 < st ? '#FFC233' : 'rgba(255,255,255,.7)'; E.starPath(ctx, x - 22 + s2 * 22, plateY + 44, 9, 4, 5); ctx.fill(); ctx.strokeStyle = '#1D2540'; ctx.lineWidth = 2; ctx.stroke(); } }
    if (i === cur && !locked) { const by = ly - bw * .78 + Math.sin(t * 4) * 6; ctx.fillStyle = '#FFC233'; ctx.strokeStyle = '#1D2540'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x - 14, by - 20); ctx.lineTo(x + 14, by - 20); ctx.lineTo(x + 14, by - 4); ctx.lineTo(x + 24, by - 4); ctx.lineTo(x, by + 18); ctx.lineTo(x - 24, by - 4); ctx.lineTo(x - 14, by - 4); ctx.closePath(); ctx.fill(); ctx.stroke(); }
    lots.push({i, x, y:ly - bw * .3, r:bw * .62});
  });
  const endY = riverY + 120;
  ctx.strokeStyle = '#1D2540'; ctx.lineWidth = 3;
  ctx.fillStyle = '#E8577A'; E.rr(ctx, roadX(endY) - 44, endY - 8, 88, 16, 4); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#FFFFFF'; for (let k = 0; k < 4; k++) ctx.fillRect(roadX(endY) - 36 + k * 22, endY - 8, 10, 16);
  E.outlineText(ctx, bridgeDone ? 'The Hills: coming soon' : 'Build the bridge to reach the Hills', W / 2, endY + 34, Math.min(18, W * .05), '#FFFFFF');
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
      const sky = ctx.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, job.storm ? '#8FA3B8' : '#69C2F0'); sky.addColorStop(1, '#D6F0FF');
      ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = 'rgba(255,255,255,.8)'; for (let i = 0; i < 3; i++) { const cx = ((i * 170 + g.t * 12) % (W + 160)) - 80, cy = 26 + i * 18; ctx.beginPath(); ctx.arc(cx, cy, 16, 0, 7); ctx.arc(cx + 18, cy - 6, 20, 0, 7); ctx.arc(cx + 38, cy, 15, 0, 7); ctx.fill(); }
      const gy = H * .82;
      ctx.fillStyle = '#7CC765'; ctx.fillRect(0, gy, W, H - gy);
      const bw = Math.min(W * .62, H * 1.05);
      const top = R.drawBuilding(ctx, job, W * .45, gy, bw, g.s, {t:g.t, river:job.b === 'bridge' ? clamp(g.to / job.steps.length, 0, 1) * .6 : 0});
      if (g.s < 1) { const es = Math.min(W * .22, 100); R.drawExcavator(ctx, W * .86, gy + 4, es, 'star', W * .86 + es * .7, gy - es * .2, {face:-1}); }
      else if (g.s < job.steps.length) R.drawTruck(ctx, 'dump', W * .87, gy + 6, Math.min(W * .26, 120), o.color || 'marigold', {load:0});
      if (g.party) { ctx.strokeStyle = '#E8577A'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(W * .1, gy - 20); ctx.quadraticCurveTo(W * .45, gy - 4, W * .8, gy - 20); ctx.stroke(); }
      parts.draw(ctx);
      return top;
    },
  };
};

/* ---------- loading and digging ---------- */
function backdrop(ctx, W, gy, t, kind, signX) {
  ctx.fillStyle = 'rgba(255,255,255,.85)';
  for (let i = 0; i < 3; i++) { const cx = ((i * 190 + t * 10) % (W + 160)) - 80, cy = gy * (.42 + i * .08); ctx.beginPath(); ctx.arc(cx, cy, 16, 0, 7); ctx.arc(cx + 18, cy - 6, 20, 0, 7); ctx.arc(cx + 38, cy, 15, 0, 7); ctx.fill(); }
  ctx.fillStyle = kind === 'excavator' ? '#B8A48A' : '#9BC7B9';
  ctx.beginPath(); ctx.moveTo(0, gy); for (let x = 0; x <= W; x += 8) ctx.lineTo(x, gy - 70 - Math.sin(x / 70) * 24 - Math.sin(x / 23) * 6); ctx.lineTo(W, gy); ctx.closePath(); ctx.fill();
  ctx.fillStyle = kind === 'excavator' ? '#A39077' : '#7FB89E';
  ctx.beginPath(); ctx.moveTo(0, gy); for (let x = 0; x <= W; x += 8) ctx.lineTo(x, gy - 34 - Math.sin(x / 50 + 2) * 14); ctx.lineTo(W, gy); ctx.closePath(); ctx.fill();
  const label = kind === 'excavator' ? 'QUARRY' : kind === 'forklift' ? 'BRICK YARD' : kind === 'chute' ? 'CONCRETE PLANT' : 'BUILDING SITE';
  const sx = signX != null ? signX : W * .5, sy = gy - 150;
  ctx.fillStyle = '#7A5A3A'; ctx.fillRect(sx - 3, sy, 6, 150);
  ctx.fillStyle = '#1D2540'; E.rr(ctx, sx - 70, sy - 28, 140, 30, 8); ctx.fill();
  E.outlineText(ctx, label, sx, sy - 13, 15, '#FFC233');
}
PUM.games.load = function (o) {
  const {player, assist, api} = o;
  const mode = o.mat, M = R.MATS[mode], kind = M.loader, truck = M.truck, color = o.color;
  let gq, tries = 0;
  do { gq = PUM.gateQuestion(player, 3); } while ((gq.q.ans < 1 || gq.q.ans > 500) && tries++ < 12);
  const q = gq.q, target = Math.max(1, q.ans);
  const g = {t:0, count:0, queue:[], anim:null, state:'play', msg:'', msgT:0, fixing:false, doneT:0, roll:0, spin:0, exact:false};
  const parts = E.Particles();
  let W = 0, H = 0;
  const L = () => {
    const ts = Math.min(W * .46, H * .38, 260), tx = W - ts * .5 - 6, gy = Math.min(H * .74, Math.max(H * .55, 230 + ts * .9));
    const es = Math.min(W * .3, H * .28, 170), ex = tx - ts * .16 - es * .85;
    return {gy, ts, tx, es, ex, pileX:Math.max(es * .45, ex - es * .8)};
  };
  const say = (m, t = 1.6) => { g.msg = m; g.msgT = t; };
  const isDig = o.dig;
  api.showQuestion(q, isDig ? `Dig this many ${M.unit}:` : `Load this many ${M.unit}:`);
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
    g.t += dt; parts.update(dt); if (g.msgT > 0) g.msgT -= dt;
    const l = L();
    if (!g.anim && g.queue.length) g.anim = {n:g.queue.shift(), p:0, dur:kind === 'chute' ? .5 : .62, given:false};
    if (g.anim) {
      const a = g.anim; a.p += dt / a.dur;
      if (!a.given && a.p >= (kind === 'forklift' ? .5 : .62)) {
        a.given = true; g.count = Math.min(9999, g.count + a.n); PUM.audio.sfx(kind === 'chute' ? 'refuel' : 'brick');
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
    const sky = ctx.createLinearGradient(0, 0, 0, l.gy); sky.addColorStop(0, '#69C2F0'); sky.addColorStop(1, '#D6F0FF'); ctx.fillStyle = sky; ctx.fillRect(0, 0, W, l.gy);
    backdrop(ctx, W, l.gy, g.t, isDig ? 'site' : kind, kind === 'chute' ? W * .62 : Math.max(76, l.pileX));
    ctx.fillStyle = isDig ? '#7CC765' : '#C9B79A'; ctx.fillRect(0, l.gy, W, H - l.gy);
    ctx.fillStyle = 'rgba(0,0,0,.06)'; for (let i = 0; i < 20; i++) ctx.fillRect((i * 97) % W, l.gy + 10 + (i * 37) % (H - l.gy - 10), 30, 4);
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
      R.drawTruck(ctx, 'dump', tx, l.gy, l.ts, color, {load:g.count, mat:isDig ? 'dirt' : mode, roll:g.roll});
      R.drawExcavator(ctx, X, l.gy, s2, 'star', bx, by, {full, tip, face, matCol:isDig ? '#A87A50' : M.col});
    } else if (kind === 'forklift') {
      const sx = l.pileX + l.es * .1, deckX = tx - l.ts * .62, deckY = l.ts * .17;
      ctx.fillStyle = M.col; ctx.strokeStyle = P('ink'); ctx.lineWidth = 2.5;
      for (let r = 0; r < 3; r++) for (let c = 0; c < 2; c++) { if (mode === 'beams') { E.rr(ctx, sx - l.es * .4, l.gy - (r + 1) * l.es * .08 - c * l.es * .24, l.es * .7, l.es * .07, 3); ctx.fill(); ctx.stroke(); } else { ctx.fillRect(sx - l.es * .4 + c * l.es * .32, l.gy - (r + 1) * l.es * .15, l.es * .3, l.es * .14); ctx.strokeRect(sx - l.es * .4 + c * l.es * .32, l.gy - (r + 1) * l.es * .15, l.es * .3, l.es * .14); } }
      R.drawTruck(ctx, 'flatbed', tx, l.gy, l.ts, color, {load:g.count, mat:mode, roll:g.roll});
      let fx = sx + l.es * .5, lift = 0, carry = 0;
      if (a) { const p = ap; if (p < .5) { fx = lerp(sx + l.es * .45, deckX - l.es * .45, p / .5); lift = deckY * Math.min(1, p / .35); carry = a.n; } else { fx = lerp(deckX - l.es * .45, sx + l.es * .45, (p - .5) / .5); lift = deckY * (1 - (p - .5) / .5); } }
      R.drawForklift(ctx, fx, l.gy, l.es * .8, 'marigold', lift, carry, mode);
    } else {
      const siloX = l.ex, hx = tx - l.ts * .5, hy = l.gy - l.ts * .42;
      R.drawSilo(ctx, siloX, l.gy, l.es * 1.1, !!a, hx, hy, g.t);
      R.drawTruck(ctx, 'mixer', tx, l.gy, l.ts, color, {load:g.count, mat:'concrete', spin:g.spin, roll:g.roll});
    }
    /* counter sign */
    const sx = W / 2, sy = l.gy + Math.min(70, (H - l.gy) * .45);
    ctx.fillStyle = '#FFFFFF'; ctx.strokeStyle = P('ink'); ctx.lineWidth = 3; E.rr(ctx, sx - 90, sy - 26, 180, 52, 14); ctx.fill(); ctx.stroke();
    ctx.fillStyle = P('ink'); ctx.font = '700 14px Lexend, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(isDig ? 'Dug' : 'Loaded', sx - 44, sy);
    E.outlineText(ctx, String(g.count + (g.queue.length || g.anim ? '' : '')), sx + 30, sy + 1, 34, '#FFC233');
    if (g.queue.length) E.outlineText(ctx, `+${g.queue.reduce((s, v) => s + v, 0)} coming`, sx, sy + 44, 18, '#FFFFFF');
    parts.draw(ctx);
    if (g.msgT > 0) { let fs = Math.min(40, W * .09); ctx.font = `800 ${fs}px Sniglet, sans-serif`; const mw = ctx.measureText(g.msg).width; if (mw > W * .9) fs *= W * .9 / mw; E.outlineText(ctx, g.msg, W / 2, H * .36, fs, '#FFC233'); }
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
  const L = () => { const gy = H * .8, bw = Math.min(W * .6, H * .45), cx = W * .45, mx = W - Math.max(20, W * .05); return {gy, bw, cx, mx, jibY:Math.max(H * .2, gy - bw * 1.5), hookY:Math.max(H * .32, gy - bw * 1.1), A:Math.min(W * .3, cx - 12)}; };
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
      const sky = ctx.createLinearGradient(0, 0, 0, l.gy); sky.addColorStop(0, '#69C2F0'); sky.addColorStop(1, '#D6F0FF'); ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#7CC765'; ctx.fillRect(0, l.gy, W, H - l.gy);
      topY = R.drawBuilding(ctx, job, l.cx, l.gy, l.bw, n - 1, {t:g.t, noPiece:true, river:.3});
      /* tower crane */
      const mx = l.mx;
      ctx.save(); ctx.strokeStyle = P('ink'); ctx.lineWidth = 3; ctx.fillStyle = '#FFC233';
      ctx.fillRect(mx - 9, l.jibY - 30, 18, l.gy - l.jibY + 30); ctx.strokeRect(mx - 9, l.jibY - 30, 18, l.gy - l.jibY + 30);
      ctx.beginPath(); for (let y = l.jibY - 30; y < l.gy; y += 18) { ctx.moveTo(mx - 9, y); ctx.lineTo(mx + 9, y + 18); } ctx.stroke();
      ctx.fillRect(8, l.jibY - 10, mx - 8 + 30, 14); ctx.strokeRect(8, l.jibY - 10, mx - 8 + 30, 14);
      ctx.fillStyle = P('metal'); ctx.fillRect(mx + 4, l.jibY - 6, 34, 26); ctx.strokeRect(mx + 4, l.jibY - 6, 34, 26);
      ctx.fillStyle = '#4A4F5C'; ctx.fillRect(mx - 16, l.jibY - 44, 32, 22); ctx.strokeRect(mx - 16, l.jibY - 44, 32, 22);
      const trolleyX = g.state === 'swing' ? g.px : (g.trolley = g.trolley != null ? g.trolley : g.px);
      ctx.fillStyle = P('metal'); ctx.fillRect(trolleyX - 14, l.jibY + 4, 28, 10); ctx.strokeRect(trolleyX - 14, l.jibY + 4, 28, 10);
      const ph = (R.PIECE_H[job.piece] || .2) * l.bw, hookY = (g.state === 'swing' ? g.py : l.hookY) - ph - 14;
      ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(trolleyX - 4, l.jibY + 14); ctx.lineTo(trolleyX - 4, hookY); ctx.moveTo(trolleyX + 4, l.jibY + 14); ctx.lineTo(trolleyX + 4, hookY); ctx.stroke();
      ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(trolleyX, hookY + 4, 6, 0, Math.PI); ctx.stroke();
      if (g.state === 'swing') { ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(trolleyX, hookY + 10); ctx.lineTo(g.px - l.bw * .2, g.py - ph * .6); ctx.moveTo(trolleyX, hookY + 10); ctx.lineTo(g.px + l.bw * .2, g.py - ph * .6); ctx.stroke(); }
      ctx.restore();
      if (g.state === 'swing') { ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.setLineDash([6, 8]); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(g.px, g.py + 4); ctx.lineTo(g.px, topY); ctx.stroke(); ctx.setLineDash([]); ctx.fillStyle = 'rgba(34,160,107,.35)'; ctx.fillRect(l.cx - l.bw * tol[1], topY - 6, l.bw * tol[1] * 2, 10); ctx.fillStyle = 'rgba(34,160,107,.8)'; ctx.fillRect(l.cx - l.bw * tol[0], topY - 6, l.bw * tol[0] * 2, 10); }
      R.drawPiece(ctx, job, g.px, g.py, l.bw, g.t);
      parts.draw(ctx);
      if (g.state === 'swing') E.outlineText(ctx, `Tap to drop the ${R.PIECE[job.piece]}!`, W / 2, H * .1 + 30, Math.min(26, W * .06), '#FFFFFF');
      if (g.msgT > 0) { let fs = Math.min(44, W * .1); ctx.font = `800 ${fs}px Sniglet, sans-serif`; const mw = ctx.measureText(g.msg).width; if (mw > W * .9) fs *= W * .9 / mw; E.outlineText(ctx, g.msg, W / 2, H * .3, fs, '#FFC233'); }
    },
    pointer(type) { if (type === 'down') drop(); },
    setControl(name, on) { if (on && name === 'drop') drop(); },
    _debug: () => ({g, tol, sp}),
  };
};
})();
