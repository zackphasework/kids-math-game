/* Big Rig Builders crew: the trucks as picture-book characters. Soft brown outlines, crayon shading,
   warm light and paper grain, with faces whose moods the games set (happy, grin, focus, worry, surprise,
   proud, cheer). Digby the excavator, Dottie the dump truck, Hank the flatbed, Mo the mixer, Stretch the crane. */
(function () {
'use strict';
const E = PUM.engine, C = PUM.CREW = {};
const TAU = Math.PI * 2, clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const seed = n => { let s = n; return () => (s = (s * 16807) % 2147483647) / 2147483647; };
const LINE = C.LINE = '#4A3226', INK = C.INK = '#3A2A22';
const PAL = C.PAL = {metal:'#6B5E55', glass:'#CFE3DF', tire:'#3B2E2A', hub:'#CDBCA2', wood:'#B88452', brick:'#B9553F', boom:'#E6B24A',
  blush:'rgba(226,120,110,.5)', mouth:'#6B2A26', tongue:'#E8909A', light:'#FFE3A0', cream:'#F6EAD3', eyeW:'#FFF9EE', dirt:'#9C6A42'};
C.NAMES = {dump:'Dottie', flatbed:'Hank', mixer:'Mo', crane:'Stretch', excavator:'Digby'};
const shade = (hex, amt) => E.shade(hex, amt);
/* Game paint colours, warmed toward the storybook palette. */
const warmCache = {};
C.warm = hex => {
  if (warmCache[hex]) return warmCache[hex];
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex)); if (!m) return hex;
  const n = parseInt(m[1], 16), mix = (v, w, f) => Math.round(v * (1 - f) + w * f);
  const r = mix(n >> 16, 0xC9, .2), g = mix((n >> 8) & 255, 0xA2, .2), b = mix(n & 255, 0x7A, .2);
  return (warmCache[hex] = '#' + ((1 << 24) | (Math.round(r * .94) << 16) | (Math.round(g * .94) << 8) | Math.round(b * .94)).toString(16).slice(1));
};
let LW = 3.2;
function ln(c, w) { c.strokeStyle = LINE; c.lineWidth = w || LW; c.lineJoin = 'round'; c.lineCap = 'round'; }
C.rr = (c, x, y, w, h, r) => { r = Math.max(0, Math.min(r, w / 2, h / 2)); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); };
const rr = C.rr;
/* fill, crayon shading, then a sketchy ink line. bb = [x, y, w, h] for the shading. */
function paint(c, path, fill, bb, o = {}) {
  c.beginPath(); path(); c.fillStyle = fill; c.fill();
  if (bb && !o.flat) {
    c.save(); c.beginPath(); path(); c.clip();
    const [x, y, w, h] = bb, R = seed(Math.abs(Math.round(x * 7 + y * 13 + w)) + 1);
    c.strokeStyle = shade(fill, -.28); c.lineWidth = 1.7; c.globalAlpha = .45; c.beginPath();
    for (let i = -h; i < w + h; i += 4.2) { const y0 = y + h * (.5 + R() * .12); c.moveTo(x + i, y + h + 2); c.lineTo(x + i + (y + h - y0) * .6, y0); }
    c.stroke();
    c.strokeStyle = shade(fill, .35); c.globalAlpha = .5; c.lineWidth = 2.2; c.beginPath();
    for (let i = 0; i < w * .5; i += 5) { c.moveTo(x + w * .12 + i, y + h * .14 + R() * 2); c.lineTo(x + w * .12 + i + 3, y + h * .1); }
    c.stroke(); c.restore();
  }
  if (o.noLine) return;
  c.beginPath(); path(); ln(c, o.lw); c.stroke();
  c.save(); c.translate(.9, .7); c.globalAlpha = .3; c.beginPath(); path(); ln(c, (o.lw || LW) * .5); c.stroke(); c.restore();
}
C.paint = paint;
function wheel(c, x, r, spin = 0) {
  r *= 1.12;
  paint(c, () => c.arc(x, -r, r, 0, TAU), PAL.tire, [x - r, -2 * r, 2 * r, 2 * r]);
  paint(c, () => c.arc(x, -r, r * .48, 0, TAU), PAL.hub, [x - r * .5, -r * 1.5, r, r], {lw:LW * .7});
  c.fillStyle = LINE; for (let i = 0; i < 5; i++) { const a = spin + i * TAU / 5; c.beginPath(); c.arc(x + Math.cos(a) * r * .28, -r + Math.sin(a) * r * .28, r * .07, 0, TAU); c.fill(); }
}
/* ---------- faces ---------- */
function brows(c, x, y, s, mood) {
  ln(c, LW * 1.05);
  for (const f of [-1, 1]) {
    const bx = x + f * s * .62, by = y - s * .78;
    c.beginPath();
    if (mood === 'focus') { c.moveTo(bx - s * .34, by - (f < 0 ? s * .12 : -s * .1)); c.lineTo(bx + s * .34, by + (f < 0 ? s * .1 : -s * .12)); }
    else if (mood === 'worry') { c.moveTo(bx - s * .34, by + (f < 0 ? s * .12 : -s * .14)); c.lineTo(bx + s * .34, by - (f < 0 ? s * .14 : -s * .12)); }
    else if (mood === 'surprise') c.arc(bx, by + s * .02, s * .34, Math.PI * 1.15, Math.PI * 1.85);
    else c.arc(bx, by + s * .22, s * .34, Math.PI * 1.2, Math.PI * 1.8);
    c.stroke();
  }
}
function eyes(c, x, y, s, mood, t, look, lid) {
  const blink = mood !== 'proud' && mood !== 'cheer' && ((t + x * .01) % 4.1) < .13;
  for (const f of [-1, 1]) {
    const ex = x + f * s * .62, ey = y;
    if (mood === 'proud' || mood === 'cheer' || blink || mood === 'squeeze') {
      ln(c, LW * 1.05); c.beginPath();
      if (blink) { c.moveTo(ex - s * .4, ey); c.quadraticCurveTo(ex, ey + s * .12, ex + s * .4, ey); }
      else if (mood === 'squeeze') { c.moveTo(ex - f * s * .38, ey - s * .3); c.lineTo(ex + f * s * .2, ey); c.lineTo(ex - f * s * .38, ey + s * .3); }
      else c.arc(ex, ey + s * .22, s * .38, Math.PI * 1.12, Math.PI * 1.88);
      c.stroke(); continue;
    }
    const rw = s * .46, rh = s * (mood === 'surprise' ? .62 : .56);
    c.beginPath(); c.ellipse(ex, ey, rw, rh, 0, 0, TAU); c.fillStyle = PAL.eyeW; c.fill();
    const pr = s * (mood === 'surprise' ? .18 : .3), px = ex + look * s * .16, py = ey + (mood === 'worry' ? -s * .06 : s * .06);
    c.save(); c.beginPath(); c.ellipse(ex, ey, rw, rh, 0, 0, TAU); c.clip();
    c.beginPath(); c.arc(px, py, pr, 0, TAU); c.fillStyle = INK; c.fill();
    c.fillStyle = '#FFFFFF'; c.beginPath(); c.arc(px - pr * .35, py - pr * .4, pr * .38, 0, TAU); c.fill();
    if (mood === 'focus') { c.fillStyle = lid; c.fillRect(ex - rw - 2, ey - rh - 2, rw * 2 + 4, rh * .85); c.beginPath(); c.moveTo(ex - rw, ey - rh * .15); c.lineTo(ex + rw, ey - rh * .15); ln(c, LW * .8); c.stroke(); }
    c.restore();
    c.beginPath(); c.ellipse(ex, ey, rw, rh, 0, 0, TAU); ln(c, LW * .8); c.stroke();
  }
  brows(c, x, y, s, mood === 'squeeze' ? 'worry' : mood);
}
function mouth(c, x, y, s, mood, o = {}) {
  ln(c, LW * 1.15);
  if (mood === 'grin' || mood === 'cheer') {
    const w = s * (mood === 'cheer' ? .62 : .55), d = s * (mood === 'cheer' ? .62 : .45);
    const shape = () => { c.moveTo(x - w, y - s * .05); c.quadraticCurveTo(x, y + d * 1.8, x + w, y - s * .05); c.closePath(); };
    c.beginPath(); shape(); c.fillStyle = PAL.mouth; c.fill();
    c.save(); c.clip(); c.fillStyle = PAL.tongue; c.beginPath(); c.ellipse(x, y + d * .85, w * .55, d * .4, 0, 0, TAU); c.fill(); c.fillStyle = '#FFFFFF'; c.fillRect(x - w, y - s * .1, w * 2, s * .14); c.restore();
    c.beginPath(); shape(); c.stroke();
  } else if (mood === 'surprise') {
    c.beginPath(); c.ellipse(x, y + s * .14, s * .2, s * .26, 0, 0, TAU); c.fillStyle = PAL.mouth; c.fill(); c.stroke();
  } else if (mood === 'worry' || mood === 'squeeze') {
    c.beginPath(); c.moveTo(x - s * .4, y + s * .12); for (let i = 1; i <= 4; i++) c.quadraticCurveTo(x - s * .4 + (i - .5) * s * .2, y + (i % 2 ? -s * .02 : s * .26), x - s * .4 + i * s * .2, y + s * .12); c.stroke();
  } else if (mood === 'focus') {
    c.beginPath(); c.moveTo(x - s * .32, y + s * .08); c.lineTo(x + s * .3, y + s * .02); c.stroke();
    if (o.tongue) { c.beginPath(); c.ellipse(x + s * .2, y + s * .16, s * .12, s * .14, .4, 0, Math.PI); c.fillStyle = PAL.tongue; c.fill(); c.stroke(); }
  } else {
    const w = s * (mood === 'proud' ? .5 : .42);
    c.beginPath(); c.moveTo(x - w, y); c.quadraticCurveTo(x, y + s * .5, x + w, y); c.stroke();
  }
  if (mood !== 'worry' && mood !== 'surprise' && mood !== 'squeeze') for (const f of [-1, 1]) { c.fillStyle = PAL.blush; c.beginPath(); c.ellipse(x + f * s * .78, y - s * .12, s * .2, s * .12, 0, 0, TAU); c.fill(); }
}
function face(c, F, mood, t, o = {}) { eyes(c, F.ex, F.ey, F.es, mood, t, o.look || 0, o.lid || '#888'); mouth(c, F.mx, F.my, F.ms, mood, o); }
C.face = face;
/* A cab facing right, front edge at x1. Returns where the face goes. */
function cab(c, x0, x1, top, col) {
  const w = x1 - x0, R = 20;
  paint(c, () => { c.moveTo(x0, -22); c.lineTo(x0, top + R); c.quadraticCurveTo(x0, top, x0 + R, top); c.lineTo(x1 - R * 1.4, top); c.quadraticCurveTo(x1 - 2, top + 2, x1, top + R * 1.6); c.lineTo(x1 + 2, -30); c.quadraticCurveTo(x1 + 2, -22, x1 - 8, -22); c.closePath(); }, col, [x0, top, w, -22 - top]);
  const wx = x0 + 6, ww = w - 12, wy = top + 7, wh = (-22 - top) * .46;
  paint(c, () => rr(c, wx, wy, ww, wh, 12), PAL.glass, [wx, wy, ww, wh], {flat:true, lw:LW * .8});
  c.save(); c.globalAlpha = .55; c.strokeStyle = '#FFFFFF'; c.lineWidth = 3; c.beginPath(); c.moveTo(wx + 6, wy + wh - 6); c.lineTo(wx + 14, wy + 6); c.stroke(); c.restore();
  paint(c, () => rr(c, x1 - 6, -36, 14, 14, 4), PAL.metal, null, {flat:true, lw:LW * .8});
  c.save(); c.fillStyle = PAL.light; c.beginPath(); c.ellipse(x1 + 1, -46, 4, 6, 0, 0, TAU); c.fill(); ln(c, LW * .6); c.stroke(); c.restore();
  return {ex:wx + ww * .52, ey:wy + wh * .53, es:Math.min(ww / 2.45, wh / 1.25), mx:wx + ww * .5, my:wy + wh + (-30 - wy - wh) * .42, ms:Math.min(ww / 2.4, 22)};
}
/* ---------- the trucks, in local units: ground at y = 0, about 200 wide, facing right ---------- */
function bricks(c, n, x0, w, base, col, beams) {
  if (!n) return;
  if (beams) { for (let r = 0; r < Math.min(n, 5); r++) paint(c, () => rr(c, x0, base - (r + 1) * 9, w, 8, 2), col, [x0, base - (r + 1) * 9, w, 8], {lw:LW * .6}); return; }
  /* each unit is a little pallet of bricks: four across the deck, stacked up to three high */
  const per = Math.max(1, Math.floor(w / 34)), shown = Math.min(n, per * 3), pw = 32, ph = 22;
  for (let k = 0; k < shown; k++) {
    const tier = Math.floor(k / per), i = k % per, px = x0 + i * 34, py = base - (tier + 1) * (ph + 4);
    paint(c, () => rr(c, px, py + ph, pw, 4, 1), PAL.wood, null, {flat:true, lw:LW * .5});
    for (let r = 0; r < 2; r++) for (let b = 0; b < 2; b++) { const bx = px + 1 + b * 15 + (r ? 3 : 0) - (r && b ? 3 : 0), by = py + r * 11; paint(c, () => rr(c, bx, by, 14, 10, 2), col, null, {flat:true, lw:LW * .5}); }
  }
  if (n > shown) { c.font = '700 22px "Patrick Hand", Lexend, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineWidth = 4; c.strokeStyle = LINE; c.strokeText(`+${n - shown}`, x0 + w / 2, base - 96); c.fillStyle = '#FFFFFF'; c.fillText(`+${n - shown}`, x0 + w / 2, base - 96); }
}
const T = {
  dump(c, t, o) {
    const col = o.col, bed = shade(col, -.12);
    paint(c, () => rr(c, -98, -34, 196, 14, 5), PAL.metal, null, {flat:true});
    const tip = o.tip || 0;
    if (tip > 0) paint(c, () => rr(c, -10, -34 - tip * 40, 8, tip * 40 + 4, 2), PAL.metal, null, {flat:true, lw:LW * .7});
    c.save(); c.translate(-96, -34); c.rotate(-tip * .7); c.translate(96, 34);
    if (o.loadFrac > 0) paint(c, () => { c.moveTo(-92, -86); c.quadraticCurveTo(-30, -86 - 64 * o.loadFrac, 30, -86); c.closePath(); }, o.loadCol || PAL.dirt, [-92, -86 - 32 * o.loadFrac, 122, 32 * o.loadFrac]);
    paint(c, () => { c.moveTo(-100, -88); c.lineTo(36, -88); c.lineTo(30, -34); c.lineTo(-94, -34); c.closePath(); }, bed, [-100, -88, 136, 54]);
    ln(c, LW * .7); c.globalAlpha = .6; c.beginPath(); for (const x of [-60, -24, 10]) { c.moveTo(x, -84); c.lineTo(x - 2, -38); } c.stroke(); c.globalAlpha = 1;
    c.restore();
    const F = cab(c, 40, 98, -104, col);
    for (const x of [-64, -26, 66]) wheel(c, x, 19, o.roll);
    return F;
  },
  flatbed(c, t, o) {
    const col = o.col;
    paint(c, () => rr(c, -104, -36, 206, 14, 5), PAL.metal, null, {flat:true});
    paint(c, () => rr(c, -106, -46, 156, 12, 3), PAL.wood, [-106, -46, 156, 12]);
    paint(c, () => rr(c, 40, -88, 8, 44, 2), col, null, {flat:true, lw:LW * .7});
    bricks(c, o.boxes || 0, -102, 138, -46, o.loadCol || PAL.brick, o.beams);
    const F = cab(c, 52, 104, -100, col);
    for (const x of [-74, -38, 74]) wheel(c, x, 18, o.roll);
    return F;
  },
  mixer(c, t, o) {
    const col = o.col, spin = o.spin || 0;
    paint(c, () => rr(c, -100, -36, 200, 14, 5), PAL.metal, null, {flat:true});
    ln(c); c.beginPath(); c.moveTo(-70, -36); c.lineTo(-58, -58); c.moveTo(20, -36); c.lineTo(10, -60); c.stroke();
    c.save(); c.translate(-28, -70); c.rotate(-.16);
    const drum = () => { c.moveTo(-70, 0); c.bezierCurveTo(-70, -42, 40, -46, 66, -14); c.lineTo(66, 14); c.bezierCurveTo(40, 46, -70, 42, -70, 0); c.closePath(); };
    paint(c, drum, PAL.cream, [-70, -46, 136, 92]);
    c.save(); c.beginPath(); drum(); c.clip(); c.strokeStyle = col; c.lineWidth = 12; c.globalAlpha = .95;
    for (let i = -3; i < 5; i++) { const x = -70 + ((i * 34 + spin * 34) % 272 + 272) % 272 - 60; c.beginPath(); c.moveTo(x, -46); c.quadraticCurveTo(x + 22, 0, x + 6, 46); c.stroke(); }
    c.restore(); c.beginPath(); drum(); ln(c); c.stroke();
    paint(c, () => { c.moveTo(-70, -12); c.lineTo(-84, -16); c.lineTo(-84, 16); c.lineTo(-70, 12); c.closePath(); }, PAL.metal, null, {flat:true});
    if (o.drumNum != null) { c.rotate(.16); c.font = '700 34px "Patrick Hand", Lexend, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineWidth = 6; c.strokeStyle = LINE; c.strokeText(String(o.drumNum), -2, 2); c.fillStyle = '#FFFFFF'; c.fillText(String(o.drumNum), -2, 2); }
    c.restore();
    if (o.pour) { ln(c, 9); c.beginPath(); c.moveTo(-96, -50); c.lineTo(-128, -24); c.stroke(); c.strokeStyle = PAL.metal; c.lineWidth = 5; c.beginPath(); c.moveTo(-96, -50); c.lineTo(-128, -24); c.stroke(); }
    else paint(c, () => { c.moveTo(-112, -50); c.lineTo(-96, -60); c.lineTo(-90, -54); c.lineTo(-104, -42); c.closePath(); }, PAL.metal, null, {flat:true, lw:LW * .8});
    const F = cab(c, 46, 100, -102, shade(col, -.08));
    for (const x of [-66, -32, 72]) wheel(c, x, 18, o.roll);
    return F;
  },
  crane(c, t, o) {
    const col = o.col, px = -14, py = -66;
    let ang = o.boom != null ? o.boom : -1.1, len = o.len || 220;
    if (o.tip) { ang = Math.atan2(o.tip[1] - py, o.tip[0] - px); len = Math.hypot(o.tip[0] - px, o.tip[1] - py); }
    const tx = px + Math.cos(ang) * len, ty = py + Math.sin(ang) * len, nx = -Math.sin(ang) * 9, ny = Math.cos(ang) * 9;
    paint(c, () => { c.moveTo(px + nx, py + ny); c.lineTo(tx + nx * .5, ty + ny * .5); c.lineTo(tx - nx * .5, ty - ny * .5); c.lineTo(px - nx, py - ny); c.closePath(); }, PAL.boom, null, {flat:true});
    const segs = Math.max(6, Math.round(len / 18));
    ln(c, LW * .55); c.beginPath(); for (let i = 0; i < segs; i++) { const k0 = i / segs, k1 = (i + 1) / segs, s0 = 1 - k0 * .5, s1 = 1 - k1 * .5; c.moveTo(px + (tx - px) * k0 + nx * s0, py + (ty - py) * k0 + ny * s0); c.lineTo(px + (tx - px) * k1 - nx * s1, py + (ty - py) * k1 - ny * s1); } c.stroke();
    if (!o.noHook) { const hy = o.hook != null ? o.hook : 60, sw = Math.sin(t * 1.3) * 3; ln(c, 1.6); c.beginPath(); c.moveTo(tx, ty); c.lineTo(tx + sw, ty + hy); c.stroke(); ln(c, LW * .9); c.beginPath(); c.arc(tx + sw, ty + hy + 8, 7, -Math.PI * .4, Math.PI * 1.1); c.stroke(); }
    paint(c, () => rr(c, -112, -36, 218, 14, 5), PAL.metal, null, {flat:true});
    paint(c, () => rr(c, -50, -74, 60, 40, 10), shade(col, -.1), [-50, -74, 60, 40]);
    paint(c, () => c.arc(px, py, 8, 0, TAU), PAL.metal, null, {flat:true, lw:LW * .7});
    paint(c, () => rr(c, -118, -46, 26, 10, 3), PAL.metal, null, {flat:true, lw:LW * .7});
    const F = cab(c, 50, 106, -104, col);
    for (const x of [-90, -58, -26, 78]) wheel(c, x, 17, o.roll);
    C._tip = [tx, ty];
    return F;
  },
};
const DEF = {dump:'happy', flatbed:'proud', mixer:'grin', crane:'happy', excavator:'focus'};
/* x = centre, y = ground, s = length in px (same as the old drawTruck). o: mood, look, sq (squash), hop, roll, tip, loadFrac, loadCol, boxes, beams, spin, drumNum, pour, flip, crane: boom/len/tip/hook */
C.truck = function (ctx, kind, x, y, s, color, o = {}) {
  const k = s / 208, t = o.t || 0;
  LW = 3.2;
  ctx.save();
  C.longShadow(ctx, x, y, s * .98, s * .5);
  ctx.translate(x, y - (o.hop || 0) * s); ctx.scale(k * (o.flip ? -1 : 1) * (1 + (o.sq || 0)), k * (1 - (o.sq || 0)));
  if (o.tilt) ctx.rotate(o.tilt);
  const F = T[kind](ctx, t, Object.assign({col:C.warm(color)}, o));
  face(ctx, F, o.mood || DEF[kind], t, {look:o.look || 0, lid:C.warm(color), tongue:o.tongue});
  ctx.restore();
};
/* Digby the excavator. (bx, by) = where the bucket goes, in the facing-right frame; o.face turns the upper body (-1..1). */
C.excavator = function (ctx, x, y, s, color, bx, by, o = {}) {
  const k = s / 176, t = o.t || 0, col = C.warm(color);
  LW = 3.2;
  ctx.save();
  C.longShadow(ctx, x, y, s * .9, s * .7);
  ctx.translate(x, y - (o.hop || 0) * s); ctx.scale(k * (1 + (o.sq || 0)), k * (1 - (o.sq || 0)));
  paint(ctx, () => rr(ctx, -84, -30, 150, 30, 15), PAL.tire, [-84, -30, 150, 30]);
  for (const tx of [-64, -30, 4, 40]) paint(ctx, () => ctx.arc(tx, -15, 9, 0, TAU), PAL.hub, null, {flat:true, lw:LW * .7});
  const face0 = o.face == null ? 1 : (Math.abs(o.face) < .12 ? (o.face < 0 ? -.12 : .12) : o.face);
  ctx.save(); ctx.scale(face0, 1);
  /* arm: two-bone reach to the bucket target, in local units */
  const px = 18, py = -66, L1 = 84, L2 = 72, gx = (bx - x) / k, gy = (by - y) / k;
  const dx = gx - px, dy = gy - py, d = clamp(Math.hypot(dx, dy), 30, L1 + L2 - 1), a = Math.atan2(dy, dx);
  const e = a - Math.acos(clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1));
  const ex = px + Math.cos(e) * L1, ey = py + Math.sin(e) * L1, wx = px + Math.cos(a) * d, wy = py + Math.sin(a) * d;
  const limb = (x0, y0, x1, y1, w) => { const an = Math.atan2(y1 - y0, x1 - x0), nx = -Math.sin(an) * w / 2, ny = Math.cos(an) * w / 2; paint(ctx, () => { ctx.moveTo(x0 + nx, y0 + ny); ctx.lineTo(x1 + nx, y1 + ny); ctx.arc(x1, y1, w / 2, an + Math.PI / 2, an - Math.PI / 2, true); ctx.lineTo(x0 - nx, y0 - ny); ctx.arc(x0, y0, w / 2, an - Math.PI / 2, an + Math.PI / 2, true); ctx.closePath(); }, col, [Math.min(x0, x1) - w, Math.min(y0, y1) - w, Math.abs(x1 - x0) + 2 * w, Math.abs(y1 - y0) + 2 * w]); };
  limb(px, py, ex, ey, 17); limb(ex, ey, wx, wy, 13);
  ctx.strokeStyle = PAL.metal; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(px + 6, py + 12); ctx.lineTo((px + ex) / 2 + 4, (py + ey) / 2 + 6); ctx.stroke();
  ctx.save(); ctx.translate(wx, wy); ctx.rotate((o.tip || 0) + (o.wig || 0));
  if (o.full) paint(ctx, () => { ctx.moveTo(-15, -2); ctx.quadraticCurveTo(2, -18, 18, -2); ctx.closePath(); }, C.warm(o.matCol || PAL.dirt), [-15, -18, 33, 16]);
  paint(ctx, () => { ctx.moveTo(-16, -2); ctx.lineTo(18, -2); ctx.quadraticCurveTo(22, 24, 4, 32); ctx.lineTo(-10, 34); ctx.quadraticCurveTo(-20, 16, -16, -2); ctx.closePath(); }, PAL.metal, null, {flat:true});
  ctx.fillStyle = LINE; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(-10 + i * 6, 33); ctx.lineTo(-7 + i * 6, 40); ctx.lineTo(-4 + i * 6, 33); ctx.fill(); }
  ctx.restore();
  paint(ctx, () => rr(ctx, -80, -70, 112, 42, 12), col, [-80, -70, 112, 42]);
  paint(ctx, () => rr(ctx, -88, -62, 18, 30, 5), shade(col, -.2), null, {flat:true, lw:LW * .8});
  const F = cab(ctx, -34, 20, -126, col);
  face(ctx, F, o.mood || 'focus', t, {look:o.look != null ? o.look : 1, lid:col, tongue:o.tongue !== false});
  ctx.restore();
  ctx.restore();
};
/* Just a truck's face, for the little window during the drive. */
C.portrait = function (ctx, kind, cx, cy, r, color, mood, t, o = {}) {
  ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.fillStyle = '#F6E6C8'; ctx.fill(); ctx.clip();
  const s = r * 3.4, k = s / 208, fx = {dump:69, flatbed:78, mixer:73, crane:78}[kind] || 70;
  C.truck(ctx, kind, cx - fx * k, cy + 66 * k, s, color, Object.assign({mood, t}, o));
  ctx.restore();
  ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ln(ctx, 4); ctx.stroke(); ctx.restore();
};

/* ---------- world: sky, hills, ground and paper ---------- */
/* each district of the town has its own sky: Main Street, the warm orange Hills, blue-grey Big City */
const SKIES = [['#A7CBD3', '#F2D9A8', '#F1B98A'], ['#E3A878', '#F7D8A8', '#F0A872'], ['#93AECB', '#DCDFDC', '#E9CDAE']];
C.sky = function (ctx, W, gy, t, o = {}) {
  const g = ctx.createLinearGradient(0, 0, 0, gy);
  const sk = SKIES[o.world || 0] || SKIES[0];
  if (o.storm) { g.addColorStop(0, '#8D99A0'); g.addColorStop(1, '#C9C3B4'); }
  else { g.addColorStop(0, sk[0]); g.addColorStop(.55, sk[1]); g.addColorStop(1, sk[2]); }
  ctx.fillStyle = g; ctx.fillRect(-20, -20, W + 40, gy + 22);
  if (!o.storm) { const sg = ctx.createRadialGradient(W * .8, gy * .42, 4, W * .8, gy * .42, Math.max(60, gy * .5)); sg.addColorStop(0, 'rgba(255,240,190,.95)'); sg.addColorStop(.3, 'rgba(255,220,150,.5)'); sg.addColorStop(1, 'rgba(255,220,150,0)'); ctx.fillStyle = sg; ctx.fillRect(0, 0, W, gy); }
  ctx.save(); ctx.globalAlpha = o.storm ? .9 : .75;
  for (let i = 0; i < 3; i++) { const x = ((W * (.15 + i * .32) + t * (4 + i * 2)) % (W + 160)) - 80, y = gy * (.16 + (i % 2) * .12); ctx.fillStyle = o.storm ? '#B5B8B4' : '#FBF2E2'; ctx.beginPath(); ctx.ellipse(x, y, 48, 13, 0, 0, TAU); ctx.ellipse(x + 26, y - 9, 26, 14, 0, 0, TAU); ctx.fill(); }
  ctx.restore();
};
C.hills = function (ctx, W, gy, o = {}) {
  const R = seed(o.seed || 3);
  const hill = (col, base, amp, f, ph) => {
    ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(0, gy); for (let x = 0; x <= W + 10; x += 10) ctx.lineTo(x, gy - base - Math.sin(x / f + ph) * amp); ctx.lineTo(W, gy); ctx.closePath(); ctx.fill();
    ctx.save(); ctx.clip(); ctx.strokeStyle = shade(col, -.2); ctx.globalAlpha = .35; ctx.lineWidth = 1.5; ctx.beginPath(); for (let x = -40; x < W; x += 5) { ctx.moveTo(x, gy); ctx.lineTo(x + 18, gy - base - amp); } ctx.stroke(); ctx.restore();
  };
  hill(o.far || '#B8C08A', o.h1 || 70, 18, 90, 1); hill(o.near || '#93AD72', o.h2 || 40, 14, 60, 3);
  if (o.trees !== false) for (let i = 0; i < 5; i++) { const x = R() * W, h = 26 + R() * 18; ctx.fillStyle = '#5F4A38'; ctx.fillRect(x - 2, gy - 30 - h * .3, 4, h * .5); ctx.fillStyle = i % 2 ? '#7E9E62' : '#6E8F55'; ctx.beginPath(); ctx.ellipse(x, gy - 30 - h * .55, h * .4, h * .55, 0, 0, TAU); ctx.fill(); }
};
C.ground = function (ctx, W, gy, H, kind = 'dirt', world = 0) {
  const col = kind === 'grass' ? ['#A5B97C', '#D2AE78', '#B5B3A6'][world] || '#A5B97C' : kind === 'yard' ? '#CDB896' : '#C99A6B', R = seed(9);
  ctx.fillStyle = col; ctx.fillRect(-20, gy, W + 40, H - gy + 20);
  ctx.save(); ctx.beginPath(); ctx.rect(-20, gy, W + 40, H - gy + 20); ctx.clip(); ctx.strokeStyle = shade(col, -.18); ctx.globalAlpha = .45; ctx.lineWidth = 1.6; ctx.beginPath(); for (let x = -60; x < W; x += 5) { ctx.moveTo(x, H); ctx.lineTo(x + 30, gy + 6 + R() * 6); } ctx.stroke();
  ctx.fillStyle = shade(col, -.3); ctx.globalAlpha = .45; for (let i = 0; i < 60; i++) ctx.fillRect(R() * W, gy + R() * (H - gy), 2.5, 1.6); ctx.restore();
  ctx.strokeStyle = LINE; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(-20, gy); ctx.lineTo(W + 20, gy); ctx.stroke();
};
let grainPat = null;
function grain(ctx) {
  if (grainPat) return grainPat;
  const cv = document.createElement('canvas'); cv.width = cv.height = 220; const g = cv.getContext('2d'), R = seed(5);
  g.fillStyle = '#F4EBDD'; g.fillRect(0, 0, 220, 220);
  for (let i = 0; i < 5200; i++) { const v = 200 + R() * 55; g.fillStyle = `rgba(${v - 40},${v - 55},${v - 80},${.12 + R() * .2})`; g.fillRect(R() * 220, R() * 220, 1 + R() * 1.6, 1 + R() * 1.6); }
  for (let i = 0; i < 60; i++) { g.strokeStyle = `rgba(150,120,90,${.05 + R() * .07})`; g.lineWidth = .6; g.beginPath(); const x = R() * 220, y = R() * 220; g.moveTo(x, y); g.lineTo(x + 20 + R() * 40, y + (R() - .5) * 6); g.stroke(); }
  return (grainPat = ctx.createPattern(cv, 'repeat'));
}
/* Paper grain and a warm vignette over a finished frame. */
C.paper = function (ctx, W, H, strength = .5) {
  ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = strength; ctx.fillStyle = grain(ctx); ctx.fillRect(0, 0, W, H); ctx.restore();
  const v = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * .3, W / 2, H / 2, Math.max(W, H) * .75); v.addColorStop(0, 'rgba(90,60,30,0)'); v.addColorStop(1, 'rgba(90,60,30,.2)'); ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
};
/* Storybook text: hand-lettered with a soft brown outline. */
C.text = function (ctx, text, x, y, size, fill = '#FFF4DC', align = 'center') {
  ctx.font = `400 ${size}px "Patrick Hand", "Comic Sans MS", cursive`; ctx.textAlign = align; ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round'; ctx.lineWidth = Math.max(3, size * .18); ctx.strokeStyle = LINE; ctx.strokeText(text, x, y); ctx.fillStyle = fill; ctx.fillText(text, x, y);
};
/* ---------- 2.5D: background layers drawn once (softly blurred), then drifting at different speeds ---------- */
const layerCache = {};
let layerCount = 0;
function makeLayer(key, w, h, blurPx, draw) {
  if (layerCache[key]) return layerCache[key];
  if (++layerCount > 40) { for (const k in layerCache) delete layerCache[k]; layerCount = 1; }
  const cv = document.createElement('canvas'); cv.width = Math.max(1, Math.ceil(w)); cv.height = Math.max(1, Math.ceil(h));
  draw(cv.getContext('2d'));
  let out = cv;
  if (blurPx) { try { const c2 = document.createElement('canvas'); c2.width = cv.width; c2.height = cv.height; const g2 = c2.getContext('2d'); if (typeof g2.filter === 'string') { g2.filter = `blur(${blurPx}px)`; g2.drawImage(cv, 0, 0); out = c2; } } catch (e) {} }
  return (layerCache[key] = out);
}
/* the slow camera drift every scene shares */
C.cam = (t, W) => ({pan:Math.sin(t * .22) * W * .028, zoom:1 + .032 * (.5 + .5 * Math.sin(t * .15))});
/* parallax: f = 1 for the ground and trucks, less for far things, more for the foreground */
C.withCam = (ctx, W, gy, cam, f) => { const s = 1 + (cam.zoom - 1) * f; ctx.translate(W / 2, gy); ctx.scale(s, s); ctx.translate(-W / 2 - cam.pan * f, -gy); };
const tree = (g, x, y, s, col) => { g.fillStyle = '#5F4A38'; g.fillRect(x - 3 * s, y - 34 * s, 6 * s, 34 * s); g.fillStyle = col; g.beginPath(); g.ellipse(x, y - 50 * s, 24 * s, 30 * s, 0, 0, TAU); g.fill(); g.fillStyle = 'rgba(255,240,200,.25)'; g.beginPath(); g.ellipse(x + 8 * s, y - 58 * s, 10 * s, 14 * s, 0, 0, TAU); g.fill(); };
/* a little skyline: blocks with windows, drawn into a layer */
function skyline(g, x0, x1, base, k, col, R, tall) {
  for (let x = x0; x < x1;) {
    const bw = (26 + R() * 34) * k, bh = (tall + R() * tall * 1.2) * k;
    g.fillStyle = col; g.fillRect(x, base - bh, bw, bh + 4);
    if (R() < .3) { g.fillRect(x + bw * .4, base - bh - 14 * k, 3 * k, 14 * k); }
    g.fillStyle = 'rgba(255,248,225,.45)'; for (let r = 0; r < bh / (12 * k) - 1; r++) for (let c = 0; c < bw / (10 * k) - 1; c++) if (R() < .6) g.fillRect(x + 5 * k + c * 10 * k, base - bh + 6 * k + r * 12 * k, 4 * k, 5 * k);
    x += bw + (2 + R() * 8) * k;
  }
}
C.scenery = function (ctx, W, gy, t, o = {}) {
  const cam = o.cam || C.cam(t, W), kind = o.kind || 'site', k = clamp(gy / 330, .45, 1.4), R = seed(11), wd = o.world || 0;
  C.sky(ctx, W, gy, t, o);
  const tag = `${kind}|${W}|${gy}|${o.storm ? 1 : 0}|${wd}`;
  const far = makeLayer(`far|${tag}`, W * 1.5, gy + 4, 1.6, g => {
    if (wd === 2) { skyline(g, 0, W * 1.5, gy + 4, k, '#A9B7C7', seed(21), 90); return; }
    const col = wd === 1 ? '#DDA675' : kind === 'quarry' ? '#D2B48C' : o.storm ? '#A9AE94' : '#C9C49A';
    g.fillStyle = col; g.beginPath(); g.moveTo(0, gy + 4); for (let x = 0; x <= W * 1.5; x += 10) g.lineTo(x, gy - (wd === 1 ? 140 : 118) * k - Math.sin(x / (120 * k)) * (wd === 1 ? 40 : 28) * k - Math.sin(x / (47 * k)) * 8 * k); g.lineTo(W * 1.5, gy + 4); g.closePath(); g.fill();
  });
  const mid = makeLayer(`mid|${tag}`, W * 1.7, gy + 4, .8, g => {
    if (wd === 2 && kind !== 'quarry') { skyline(g, 0, W * 1.7, gy + 4, k, '#8F9DAF', seed(23), 50); return; }
    const col = kind === 'quarry' ? '#BFA27A' : wd === 1 ? '#C98E5C' : wd === 2 ? '#B9AE98' : '#AEBB84';
    g.fillStyle = col; g.beginPath(); g.moveTo(0, gy + 4); for (let x = 0; x <= W * 1.7; x += 10) g.lineTo(x, gy - 62 * k - Math.sin(x / (80 * k) + 2) * 18 * k); g.lineTo(W * 1.7, gy + 4); g.closePath(); g.fill();
    g.save(); g.clip(); g.strokeStyle = shade(col, -.18); g.globalAlpha = .35; g.lineWidth = 1.5; g.beginPath(); for (let x = -40; x < W * 1.7; x += 5) { g.moveTo(x, gy + 4); g.lineTo(x + 18, gy - 80 * k); } g.stroke(); g.restore();
    if (kind !== 'quarry') for (let i = 0; i < 9; i++) { const tx = 30 + i * W * .2 + R() * 30, ty = gy - 40 * k - (i % 3) * 6 * k; if (wd === 1) cactus(g, tx, ty, .5 * k); else tree(g, tx, ty, .55 * k, i % 2 ? '#8FA36B' : '#7E9662'); }
  });
  const near = kind === 'quarry' ? null : makeLayer(`near|${kind}|${W}|${gy}|${wd}`, W * 1.9, gy + 4, .4, g => {
    for (let i = 0; i < 6; i++) { const tx = 60 + i * W * .34 + R() * 40; if (wd === 1) { if (i % 2) cactus(g, tx, gy - 4, .9 * k); else boulders(g, tx, gy - 2, k); } else if (wd === 2) { if (i % 2) streetLamp(g, tx, gy - 4, k); else tree(g, tx, gy - 4, .75 * k, '#7E9662'); } else tree(g, tx, gy - 4, .85 * k, i % 2 ? '#7E9E62' : '#6E8F55'); }
  });
  const draw = (img, f, mx) => { ctx.save(); C.withCam(ctx, W, gy, cam, f); ctx.drawImage(img, -W * mx, 0, img.width, img.height); ctx.restore(); };
  draw(far, .15, .25); draw(mid, .35, .35); if (near) draw(near, .6, .45);
  return cam;
};
const cactus = (g, x, y, s) => { g.fillStyle = '#7E9A52'; C.rr(g, x - 6 * s, y - 60 * s, 12 * s, 60 * s, 6 * s); C.rr(g, x - 22 * s, y - 44 * s, 10 * s, 24 * s, 5 * s); C.rr(g, x + 12 * s, y - 50 * s, 10 * s, 26 * s, 5 * s); g.fill(); g.fillRect(x - 16 * s, y - 26 * s, 12 * s, 6 * s); g.fillRect(x + 4 * s, y - 30 * s, 12 * s, 6 * s); };
const boulders = (g, x, y, k) => { g.fillStyle = '#B98458'; g.beginPath(); g.ellipse(x, y, 30 * k, 20 * k, 0, Math.PI, 0); g.fill(); g.fillStyle = '#A5734B'; g.beginPath(); g.ellipse(x + 26 * k, y, 18 * k, 13 * k, 0, Math.PI, 0); g.fill(); };
const streetLamp = (g, x, y, k) => { g.fillStyle = '#5E5650'; g.fillRect(x - 2.5 * k, y - 80 * k, 5 * k, 80 * k); g.fillRect(x - 2.5 * k, y - 80 * k, 18 * k, 4 * k); g.fillStyle = '#FFE3A0'; g.beginPath(); g.ellipse(x + 14 * k, y - 74 * k, 6 * k, 4 * k, 0, 0, TAU); g.fill(); };
/* soft grass in the foreground, out of focus and moving faster than the trucks */
C.front = function (ctx, W, H, cam, world = 0) {
  const fc = [['#93AD72', '#7E9E62'], ['#C9A86A', '#B39256'], ['#8FA07A', '#7D8E6A']][world] || ['#93AD72', '#7E9E62'];
  const strip = makeLayer(`front|${W}|${world}`, W * 2, 70, 2.4, g => {
    for (let i = 0; i < Math.ceil(W * 2 / 90); i++) { const x = i * 90 + (i % 3) * 14; g.fillStyle = i % 2 ? fc[0] : fc[1]; g.beginPath(); for (let k = 0; k < 6; k++) { g.moveTo(x + k * 8, 70); g.quadraticCurveTo(x + k * 8 + 6, 70 - 34 - (k % 3) * 10, x + k * 8 + 14, 70 - 40 - (k % 2) * 8); g.lineTo(x + k * 8 + 6, 70); } g.fill(); }
  });
  ctx.drawImage(strip, -W * .5 - cam.pan * 1.7, H - 52);
};
/* warm light from the sun side */
C.light = function (ctx, W, H) {
  ctx.save(); ctx.globalCompositeOperation = 'soft-light';
  const lg = ctx.createLinearGradient(W, 0, 0, H); lg.addColorStop(0, 'rgba(255,214,140,.6)'); lg.addColorStop(1, 'rgba(90,60,120,.3)'); ctx.fillStyle = lg; ctx.fillRect(0, 0, W, H);
  ctx.restore();
};
/* a long soft shadow cast away from the sun, plus a dark contact shadow */
C.longShadow = function (ctx, x, y, w, h) {
  const L = w * .55, up = h * .28;
  ctx.save();
  const g = ctx.createLinearGradient(x, y, x - L, y - up); g.addColorStop(0, 'rgba(74,50,38,.24)'); g.addColorStop(1, 'rgba(74,50,38,0)'); ctx.fillStyle = g;
  ctx.beginPath(); ctx.moveTo(x + w * .5, y + 3); ctx.quadraticCurveTo(x + w * .5 - L * .5, y - up * .3, x + w * .5 - L, y - up); ctx.lineTo(x - w * .5 - L, y - up); ctx.quadraticCurveTo(x - w * .5 - L * .4, y - up * .1, x - w * .5, y + 3); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(74,50,38,.22)'; ctx.beginPath(); ctx.ellipse(x, y, w * .5, Math.max(2, w * .035), 0, 0, TAU); ctx.fill();
  ctx.restore();
};
})();
