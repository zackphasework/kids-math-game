/* Sky Quest art, drawn in code in the "Crystal Glow" anime style: clean ink lines, two-tone shading,
   layered glowing eyes and twilight skies. Heroes (bust and small full body), spirit companions,
   shadow creatures, the Blossom Deer guardian, island and battle backgrounds, the village and the sky map. */
(function () {
'use strict';
const E = PUM.engine, K = PUM.SKYART = {};
const TAU = Math.PI * 2, lerp = (a, b, t) => a + (b - a) * t, clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const seed = n => { let s = n; return () => (s = (s * 16807) % 2147483647) / 2147483647; };
const LINE = '#22374B';
K.LINE = LINE;

/* ---------- looks ---------- */
K.HAIR = {navy:'#2B3E7A', ink:'#1E1B2E', brown:'#5A3A2C', rose:'#C2557F', silver:'#AEB9D6', ember:'#A8352E'};
K.OUTFIT = {snow:'#EEF1FF', night:'#2E3566', crimson:'#B43A4A', forest:'#2F7A5E', violet:'#6A4FC9', gold:'#D9A93B'};
K.CLR = {rose:'#E8577A', marigold:'#FF8A3D', star:'#FFC233', leaf:'#22A06B', sea:'#2F95D6', berry:'#7357DB', mint:'#4FCBA9', plum:'#B04F9C'};
const HERO = [
  {skin:'#FCE5D6', skinS:'#EBB9A5', irisD:'#182462', irisL:'#46E6FF', hair:'navy', outfit:'snow'},
  {skin:'#FFEADF', skinS:'#EFBCA9', irisD:'#3A1460', irisL:'#D98BFF', hair:'rose', outfit:'violet'},
  {skin:'#E8C09C', skinS:'#C9946E', irisD:'#4A2208', irisL:'#FFB347', hair:'ink', outfit:'crimson'},
];
K.heroDefaults = i => ({hair:HERO[i].hair, outfit:HERO[i].outfit});
/* Resolve a look: hero index plus picked colours into everything the drawings need. */
K.look = (hero, hair, outfit, scarf) => {
  const H = HERO[hero] || HERO[0], hc = K.HAIR[hair] || K.HAIR[H.hair], oc = K.OUTFIT[outfit] || K.OUTFIT[H.outfit], sc = K.CLR[scarf] || scarf || '#7B5CFF';
  const darkOutfit = outfit === 'night' || outfit === 'violet' || outfit === 'forest' || outfit === 'crimson';
  return {style:hero, line:LINE, lw:2.2, skin:H.skin, shade:H.skinS, irisD:H.irisD, irisL:H.irisL,
    hair:hc, hairHi:E.shade(hc, hair === 'silver' ? .45 : .32), rim:'#8FE6FF', jacket:oc, jacketS:E.shade(oc, -.2), trim:darkOutfit ? '#E9C46A' : '#E9B949',
    scarf:sc, scarfS:E.shade(sc, -.25), pants:'#283056', boots:'#1F2440'};
};
K.lookOf = p => { const s = p.sky || {}; return K.look(p.hero, s.hair, s.outfit, p.color); };

function line(c, L, w) { c.strokeStyle = L.line; c.lineWidth = w || L.lw; c.lineJoin = 'round'; c.lineCap = 'round'; }
function spiky(c, pts, cx, cy, bow) {
  c.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i], mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, dx = mx - cx, dy = my - cy, d = Math.hypot(dx, dy) || 1;
    c.quadraticCurveTo(mx + dx / d * bow, my + dy / d * bow, b[0], b[1]);
  }
}
function smooth(c, pts) {
  const n = pts.length; c.moveTo((pts[0][0] + pts[1][0]) / 2, (pts[0][1] + pts[1][1]) / 2);
  for (let i = 1; i <= n; i++) { const p = pts[i % n], q = pts[(i + 1) % n]; c.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2); }
  c.closePath();
}
const blossom = (c, x, y, r, col, mid) => {
  c.fillStyle = col; for (let i = 0; i < 5; i++) { const a = i * TAU / 5 - Math.PI / 2; c.beginPath(); c.ellipse(x + Math.cos(a) * r * .55, y + Math.sin(a) * r * .55, r * .5, r * .34, a, 0, TAU); c.fill(); }
  c.fillStyle = mid || '#FFE27A'; c.beginPath(); c.arc(x, y, r * .2, 0, TAU); c.fill();
};
K.blossom = blossom;

/* ---------- hero bust, in a 360 x 440 frame ---------- */
const BACK = {
  0:[[104,250],[92,200],[60,150],[100,140],[78,82],[132,100],[134,42],[176,82],[200,30],[220,88],[264,52],[256,112],[300,118],[270,170],[284,214],[258,252]],
  1:[[100,330],[90,270],[74,200],[88,140],[84,92],[130,84],[142,46],[180,68],[206,38],[228,82],[270,80],[262,128],[288,150],[274,204],[284,272],[262,330]],
  2:[[106,250],[96,204],[74,160],[102,136],[90,90],[136,96],[146,54],[182,78],[208,44],[224,90],[258,72],[252,118],[286,128],[264,172],[274,214],[256,250]],
};
const FRINGE = [[100,186],[106,124],[124,96],[150,84],[180,80],[210,84],[236,96],[254,124],[260,186],[248,152],[240,196],[226,150],[214,182],[198,146],[180,196],[166,148],[150,186],[136,150],[120,200],[112,160]];
function bustEye(c, L, x, y, f, blink) {
  const h = .96 * (blink != null ? clamp(blink, .08, 1) : 1);
  const shape = () => { c.beginPath(); c.moveTo(x - f * 22, y - 2 * h); c.bezierCurveTo(x - f * 14, y - 20 * h, x + f * 14, y - 22 * h, x + f * 23, y - 9 * h); c.lineTo(x + f * 21, y + 12 * h); c.bezierCurveTo(x + f * 9, y + 20 * h, x - f * 10, y + 20 * h, x - f * 21, y + 10 * h); c.closePath(); };
  shape(); c.fillStyle = '#FFFFFF'; c.fill();
  c.save(); shape(); c.clip();
  const ix = x + f * 2, iy = y + 2 * h, rx = 14, ry = 19 * h;
  const g = c.createLinearGradient(0, iy - ry, 0, iy + ry); g.addColorStop(0, L.irisD); g.addColorStop(.55, L.irisL); g.addColorStop(1, '#F2FDFF');
  c.beginPath(); c.ellipse(ix, iy, rx, ry, 0, 0, TAU); c.fillStyle = g; c.fill(); c.strokeStyle = L.irisD; c.lineWidth = 1.6; c.stroke();
  c.beginPath(); c.ellipse(ix, iy - 1, 6.5, 9.5 * h, 0, 0, TAU); c.fillStyle = L.irisD; c.fill();
  c.fillStyle = 'rgba(0,0,0,.18)'; c.fillRect(x - 30, y - 30, 60, 12 * h);
  c.fillStyle = '#FFFFFF'; c.beginPath(); c.ellipse(ix - f * 5, iy - 8 * h, 5.2, 6.2 * h, 0, 0, TAU); c.fill();
  c.beginPath(); c.arc(ix + f * 6, iy + 8 * h, 2.4, 0, TAU); c.fill();
  c.save(); c.translate(ix + f * 6, iy - 2); c.beginPath(); for (let k = 0; k < 8; k++) { const r = k % 2 ? 1.2 : 4.2, a = k * Math.PI / 4; c.lineTo(Math.cos(a) * r, Math.sin(a) * r); } c.closePath(); c.fill(); c.restore();
  c.restore();
  c.fillStyle = L.line; c.beginPath(); c.moveTo(x - f * 24, y + 1 * h); c.bezierCurveTo(x - f * 16, y - 20 * h, x + f * 14, y - 24 * h, x + f * 25, y - 9 * h);
  c.lineTo(x + f * 29, y - 13 * h); c.lineTo(x + f * 24, y - 4 * h); c.bezierCurveTo(x + f * 12, y - 16 * h, x - f * 14, y - 15 * h, x - f * 24, y + 1 * h); c.closePath(); c.fill();
  line(c, L, 1.3); c.beginPath(); c.moveTo(x + f * 20, y + 12 * h); c.quadraticCurveTo(x + f * 6, y + 19 * h, x - f * 8, y + 17 * h); c.stroke();
}
/* o: {mouth:'smile'|'shout'|'grin', blink, glowEyes} */
K.bust = function (c, L, o = {}) {
  const st = L.style, sp = st === 0 ? .85 : st === 1 ? .7 : .6;
  const back = BACK[st].map(([x, y]) => [180 + (x - 180) * (.78 + .22 * sp), 150 + (y - 150) * (.8 + .2 * sp)]);
  /* ponytail (Juno) */
  if (st === 2) {
    const pt = [[226,84],[276,62],[318,92],[334,160],[326,232],[302,306],[294,244],[292,176],[278,122],[244,108]];
    c.beginPath(); smooth(c, pt); c.fillStyle = L.hair; c.fill(); line(c, L); c.stroke();
    c.save(); c.beginPath(); smooth(c, pt); c.clip(); c.strokeStyle = L.hairHi; c.lineWidth = 6; c.beginPath(); c.moveTo(292, 84); c.quadraticCurveTo(326, 140, 312, 236); c.stroke(); c.restore();
  }
  c.beginPath(); spiky(c, back, 180, 160, 8 + 10 * (1 - sp)); c.closePath(); c.fillStyle = L.hair; c.fill(); line(c, L); c.stroke();
  c.save(); c.beginPath(); spiky(c, back, 180, 160, 8 + 10 * (1 - sp)); c.closePath(); c.clip(); c.beginPath(); c.rect(196, 0, 164, 260); c.clip();
  c.beginPath(); spiky(c, back, 180, 160, 8 + 10 * (1 - sp)); c.closePath(); c.strokeStyle = L.rim; c.lineWidth = 9; c.shadowColor = L.rim; c.shadowBlur = 10; c.stroke(); c.restore();
  /* torso */
  c.beginPath(); c.moveTo(48, 440); c.bezierCurveTo(58, 380, 92, 356, 150, 342); c.lineTo(210, 342); c.bezierCurveTo(268, 356, 302, 380, 312, 440); c.closePath();
  c.fillStyle = L.jacket; c.fill(); line(c, L); c.stroke();
  c.save(); c.clip(); c.fillStyle = L.jacketS; c.beginPath(); c.moveTo(220, 342); c.bezierCurveTo(270, 360, 300, 390, 312, 440); c.lineTo(240, 440); c.bezierCurveTo(236, 400, 228, 370, 214, 350); c.closePath(); c.fill(); c.restore();
  c.strokeStyle = L.trim; c.lineWidth = 5; c.beginPath(); c.moveTo(150, 346); c.lineTo(132, 440); c.moveTo(210, 346); c.lineTo(228, 440); c.stroke();
  line(c, L, 1.8); c.beginPath(); c.moveTo(150, 346); c.lineTo(132, 440); c.moveTo(210, 346); c.lineTo(228, 440); c.stroke();
  /* neck */
  c.beginPath(); c.moveTo(162, 290); c.lineTo(160, 345); c.lineTo(200, 345); c.lineTo(198, 290); c.closePath(); c.fillStyle = L.skin; c.fill(); line(c, L); c.stroke();
  c.fillStyle = L.shade; c.beginPath(); c.moveTo(161, 296); c.lineTo(199, 296); c.lineTo(199, 316); c.quadraticCurveTo(180, 326, 161, 312); c.closePath(); c.fill();
  /* scarf */
  c.beginPath(); c.moveTo(138, 330); c.quadraticCurveTo(180, 352, 222, 330); c.lineTo(228, 352); c.quadraticCurveTo(180, 378, 132, 352); c.closePath(); c.fillStyle = L.scarf; c.fill(); line(c, L); c.stroke();
  c.beginPath(); c.moveTo(206, 356); c.bezierCurveTo(236, 380, 262, 372, 290, 392); c.lineTo(282, 406); c.bezierCurveTo(254, 392, 228, 404, 198, 372); c.closePath(); c.fillStyle = L.scarfS; c.fill(); line(c, L); c.stroke();
  /* ears */
  for (const [x, f] of [[112, -1], [248, 1]]) { c.beginPath(); c.ellipse(x, 222, 9, 15, f * .2, 0, TAU); c.fillStyle = L.skin; c.fill(); line(c, L); c.stroke(); }
  /* face */
  const face = () => { c.beginPath(); c.moveTo(112, 140); c.bezierCurveTo(108, 205, 116, 245, 150, 278); c.quadraticCurveTo(170, 298, 180, 300); c.quadraticCurveTo(190, 298, 210, 278); c.bezierCurveTo(244, 245, 252, 205, 248, 140); c.closePath(); };
  face(); c.fillStyle = L.skin; c.fill();
  c.save(); face(); c.clip(); c.fillStyle = L.shade;
  c.beginPath(); c.moveTo(250, 150); c.bezierCurveTo(248, 205, 240, 246, 210, 278); c.quadraticCurveTo(196, 292, 184, 300); c.lineTo(198, 266); c.bezierCurveTo(226, 236, 234, 200, 234, 150); c.closePath(); c.fill();
  c.beginPath(); c.moveTo(100, 120); c.lineTo(260, 120); c.lineTo(260, 172); c.quadraticCurveTo(240, 160, 226, 184); c.quadraticCurveTo(214, 162, 196, 188); c.quadraticCurveTo(182, 166, 166, 190); c.quadraticCurveTo(150, 166, 136, 186); c.quadraticCurveTo(122, 164, 100, 180); c.closePath(); c.fill();
  c.restore();
  face(); line(c, L); c.stroke();
  for (const x of [134, 226]) { const g = c.createRadialGradient(x, 249, 1, x, 249, 16); g.addColorStop(0, 'rgba(255,120,150,.45)'); g.addColorStop(1, 'rgba(255,120,150,0)'); c.fillStyle = g; c.beginPath(); c.ellipse(x, 249, 17, 9, 0, 0, TAU); c.fill(); }
  if (o.glowEyes) { c.save(); c.shadowColor = L.irisL; c.shadowBlur = 30; c.fillStyle = 'rgba(0,0,0,0)'; }
  bustEye(c, L, 146, 220, -1, o.blink); bustEye(c, L, 214, 220, 1, o.blink);
  if (o.glowEyes) c.restore();
  /* brows */
  line(c, L, 2.8);
  for (const f of [-1, 1]) { const x = 180 + f * 34; c.beginPath(); if (o.fierce) { c.moveTo(x - f * 20, 184); c.quadraticCurveTo(x, 182, x + f * 22, 192); } else { c.moveTo(x - f * 20, 188); c.quadraticCurveTo(x, 178, x + f * 22, 186); } c.stroke(); }
  /* nose and mouth */
  line(c, L, 2); c.beginPath(); c.moveTo(183, 240); c.quadraticCurveTo(178, 251, 181, 254); c.stroke();
  if (o.mouth === 'shout') { c.beginPath(); c.moveTo(166, 264); c.quadraticCurveTo(181, 262, 196, 264); c.quadraticCurveTo(190, 286, 181, 286); c.quadraticCurveTo(172, 286, 166, 264); c.closePath(); c.fillStyle = '#7A2230'; c.fill(); line(c, L, 2); c.stroke(); c.fillStyle = '#FF8FA0'; c.beginPath(); c.ellipse(181, 280, 7, 4, 0, 0, TAU); c.fill(); }
  else if (o.mouth === 'grin') { c.beginPath(); c.moveTo(166, 266); c.quadraticCurveTo(182, 280, 198, 262); c.quadraticCurveTo(184, 270, 166, 266); c.fillStyle = '#7A2230'; c.fill(); line(c, L, 2); c.stroke(); }
  else { c.beginPath(); c.moveTo(169, 268); c.quadraticCurveTo(181, 276, 193, 267); c.stroke(); }
  /* long side locks (Mira) */
  if (st === 1) for (const f of [-1, 1]) {
    const m = ([x, y]) => [180 + f * (x - 180), y];
    const lock = [[106,138],[96,220],[90,300],[98,372],[110,404],[118,360],[124,290],[128,212],[126,150]].map(m);
    c.beginPath(); smooth(c, lock); c.fillStyle = L.hair; c.fill(); line(c, L); c.stroke();
    c.save(); c.beginPath(); smooth(c, lock); c.clip(); c.strokeStyle = L.hairHi; c.lineWidth = 4; c.beginPath(); const a = m([112, 180]), b = m([104, 300]); c.moveTo(a[0], a[1]); c.quadraticCurveTo(a[0] - f * 4, 240, b[0], b[1]); c.stroke(); c.restore();
  }
  /* fringe */
  const fr = FRINGE.map(([x, y]) => [x + (st === 2 && x < 200 ? 6 : 0), 140 + (y - 140) * (.9 + .1 * sp)]);
  c.beginPath(); spiky(c, fr, 180, 150, 4 + 4 * (1 - sp)); c.closePath(); c.fillStyle = L.hair; c.fill();
  c.save(); c.clip(); c.fillStyle = L.hairHi; c.beginPath(); c.moveTo(118, 118); c.quadraticCurveTo(180, 92, 244, 118); c.lineTo(236, 128); c.lineTo(226, 116); c.lineTo(214, 128); c.lineTo(200, 112); c.lineTo(186, 128); c.lineTo(172, 112); c.lineTo(158, 128); c.lineTo(144, 114); c.lineTo(130, 128); c.closePath(); c.fill(); c.restore();
  c.beginPath(); spiky(c, fr, 180, 150, 4 + 4 * (1 - sp)); c.closePath(); line(c, L); c.stroke();
  line(c, L, 1.3); c.beginPath(); c.moveTo(150, 96); c.quadraticCurveTo(144, 130, 138, 150); c.moveTo(186, 90); c.quadraticCurveTo(184, 130, 180, 166); c.moveTo(222, 98); c.quadraticCurveTo(226, 126, 230, 146); c.stroke();
  /* hair pieces */
  if (st === 1) { c.save(); c.shadowColor = '#FFB7D5'; c.shadowBlur = 8; blossom(c, 244, 112, 22, '#FFC6DD', '#FFE27A'); c.restore(); }
  if (st === 2) { c.fillStyle = L.scarf; c.beginPath(); c.ellipse(250, 90, 12, 9, .9, 0, TAU); c.fill(); line(c, L, 1.8); c.stroke(); }
};
/* Cached portrait image (head and shoulders) for menus and avatars. */
const imgCache = {};
K.portrait = (L, size = 160) => {
  const key = JSON.stringify(L) + size;
  if (imgCache[key]) return imgCache[key];
  try {
    const cv = document.createElement('canvas'); cv.width = size; cv.height = size;
    const c = cv.getContext('2d'), k = size / 300;
    c.scale(k, k); c.translate(-30, -40); K.bust(c, L);
    return (imgCache[key] = cv.toDataURL('image/png'));
  } catch (e) { return ''; }
};
K.spiritImg = (kind, stage = 1, size = 120) => {
  const key = 'sp' + kind + stage + size;
  if (imgCache[key]) return imgCache[key];
  try {
    const cv = document.createElement('canvas'); cv.width = size; cv.height = size;
    const c = cv.getContext('2d');
    if (K.SPIRITS[kind] && K.SPIRITS[kind].guardian) K.guardian(c, kind, size * .5, size * .95, size / (kind === 'umikaze' ? 470 : kind === 'homura' ? 430 : 560), 0, 1, {});
    else K.spirit(c, kind, stage, size / 2, size * .56, size / 150 / (stage === 3 ? 1.3 : stage === 2 ? 1.15 : 1), 0, {glow:false});
    return (imgCache[key] = cv.toDataURL('image/png'));
  } catch (e) { return ''; }
};
K.portraitImg = (L, cls = 'art') => `<img class="${cls} portrait" src="${K.portrait(L)}" alt="" draggable="false">`;

/* ---------- small full-body hero for exploring. Feet at (x, y); about 100 units tall at k = 1. ---------- */
/* o: {face:1|-1, run:phase, speed:0..1, air:-1..1 (vy sign), t, flash, weapon:true} */
K.sprite = function (c, L, x, y, k, o = {}) {
  const f = o.face || 1, t = o.t || 0, sp = o.speed || 0, ph = o.run || 0, air = o.air;
  c.save(); c.translate(x, y); c.scale(k * f, k);
  const lw = 2.4 / k * Math.min(1, k * 1.2);
  const bob = air != null ? 0 : sp > .1 ? -Math.abs(Math.sin(ph)) * 3 : Math.sin(t * 3) * 1;
  c.translate(0, bob);
  /* legs */
  const leg = (side, a, bend) => {
    const hx = side * 3, hy = -36, kx = hx + Math.sin(a) * 17, ky = hy + Math.cos(a) * 17, fx = kx + Math.sin(a - bend) * 17, fy = ky + Math.cos(a - bend) * 17;
    c.lineCap = 'round'; c.lineJoin = 'round';
    c.strokeStyle = L.line; c.lineWidth = 9; c.beginPath(); c.moveTo(hx, hy); c.lineTo(kx, ky); c.lineTo(fx, fy); c.stroke();
    c.strokeStyle = side < 0 ? E.shade(L.pants, -.2) : L.pants; c.lineWidth = 6; c.beginPath(); c.moveTo(hx, hy); c.lineTo(kx, ky); c.lineTo(fx, fy); c.stroke();
    c.fillStyle = L.boots; c.beginPath(); c.ellipse(fx + 3, fy - 1, 6.5, 4, 0, 0, TAU); c.fill(); c.strokeStyle = L.line; c.lineWidth = 1.6; c.stroke();
  };
  let aF, aB, bF, bB;
  if (air != null) { aF = .9; bF = 1.5; aB = -.35; bB = .5; }
  else if (sp > .1) { aF = Math.sin(ph) * .85; aB = -aF; bF = Math.max(0, Math.cos(ph)) * 1.1 + .1; bB = Math.max(0, -Math.cos(ph)) * 1.1 + .1; }
  else { aF = .1; aB = -.08; bF = .05; bB = .05; }
  /* scarf tail */
  const sw = air != null ? 1.4 : .6 + sp;
  c.lineCap = 'round';
  for (const off of [0, 1]) {
    const tail = [[-3, -60]]; for (let i = 1; i <= 4; i++) tail.push([-i * 5.5 * sw - 3, -60 + i * (3.2 - sw * .9) + off * i * 1.6 + Math.sin(t * 9 + i * 1.3 + off) * (1 + i * .8)]);
    c.strokeStyle = L.line; c.lineWidth = 6.5 - off; c.beginPath(); c.moveTo(tail[0][0], tail[0][1]); for (let i = 1; i < tail.length - 1; i++) c.quadraticCurveTo(tail[i][0], tail[i][1], (tail[i][0] + tail[i + 1][0]) / 2, (tail[i][1] + tail[i + 1][1]) / 2); c.stroke();
    c.strokeStyle = off ? L.scarfS : L.scarf; c.lineWidth = 3.8 - off; c.stroke();
  }
  /* back hair (Mira long, Juno ponytail) */
  if (L.style === 1) { c.beginPath(); smooth(c, [[-8,-98],[-20,-86],[-22,-66],[-20,-50],[-14,-40],[-8,-50],[-4,-46],[0,-62],[8,-72],[10,-90]]); c.fillStyle = L.hair; c.fill(); line(c, L, lw); c.stroke(); }
  if (L.style === 2) { const s = Math.sin(t * 6 + ph) * 3; c.beginPath(); smooth(c, [[-4,-100],[-18,-108],[-34,-100 + s],[-40,-84 + s],[-34,-70 + s],[-30,-82 + s],[-22,-92],[-10,-92]]); c.fillStyle = L.hair; c.fill(); line(c, L, lw); c.stroke(); }
  leg(-1, aB, bB);
  /* back arm */
  const armA = air != null ? -1.2 : sp > .1 ? -aF * .9 : .15;
  const arm = (sx, a, col) => { const hx = sx + Math.sin(a) * 20, hy = -58 + Math.cos(a) * 20; c.strokeStyle = L.line; c.lineWidth = 8; c.beginPath(); c.moveTo(sx, -58); c.lineTo(hx, hy); c.stroke(); c.strokeStyle = col; c.lineWidth = 5; c.beginPath(); c.moveTo(sx, -58); c.lineTo(hx, hy); c.stroke(); c.fillStyle = L.skin; c.beginPath(); c.arc(hx, hy, 3.4, 0, TAU); c.fill(); c.strokeStyle = L.line; c.lineWidth = 1.4; c.stroke(); return [hx, hy]; };
  arm(-4, -armA, L.jacketS);
  /* torso and coat */
  c.beginPath(); c.moveTo(-10, -63); c.lineTo(10, -63); c.lineTo(12, -38); c.lineTo(15, -27); c.lineTo(3, -31); c.lineTo(-4, -28); c.lineTo(-15, -27); c.lineTo(-12, -38); c.closePath();
  c.fillStyle = L.jacket; c.fill(); line(c, L, lw); c.stroke();
  c.fillStyle = L.jacketS; c.beginPath(); c.moveTo(4, -62); c.lineTo(10, -63); c.lineTo(12, -38); c.lineTo(15, -27); c.lineTo(5, -30); c.closePath(); c.fill();
  c.strokeStyle = L.trim; c.lineWidth = 2.2; c.beginPath(); c.moveTo(1, -61); c.lineTo(2, -32); c.stroke();
  c.strokeStyle = L.line; c.lineWidth = 3; c.beginPath(); c.moveTo(-12, -40); c.lineTo(12, -40); c.stroke();
  leg(1, aF, bF);
  /* scarf wrap */
  c.beginPath(); c.ellipse(0, -61, 10, 4.5, 0, 0, TAU); c.fillStyle = L.scarf; c.fill(); line(c, L, lw); c.stroke();
  /* front arm and weapon */
  const [hx, hy] = arm(5, armA, L.jacket);
  if (o.weapon !== false) {
    c.save(); c.translate(hx, hy);
    if (L.style === 0) { c.rotate(-.9 + armA * .3); c.strokeStyle = L.line; c.lineWidth = 6; c.beginPath(); c.moveTo(0, 2); c.lineTo(0, -30); c.stroke(); c.strokeStyle = '#E8F0FF'; c.lineWidth = 3.4; c.beginPath(); c.moveTo(0, -1); c.lineTo(0, -29); c.stroke(); c.fillStyle = L.trim; c.fillRect(-5, -2, 10, 3); }
    else if (L.style === 1) { c.rotate(-.15); c.strokeStyle = L.line; c.lineWidth = 5; c.beginPath(); c.moveTo(0, 14); c.lineTo(0, -34); c.stroke(); c.strokeStyle = '#B98A5E'; c.lineWidth = 2.6; c.beginPath(); c.moveTo(0, 13); c.lineTo(0, -33); c.stroke(); c.shadowColor = '#D98BFF'; c.shadowBlur = 10; c.fillStyle = '#E9C9FF'; c.beginPath(); c.arc(0, -38, 5, 0, TAU); c.fill(); c.shadowBlur = 0; }
    else { c.rotate(-.2); c.strokeStyle = L.line; c.lineWidth = 4.4; c.beginPath(); c.arc(-8, -6, 18, -1.1, 1.1); c.stroke(); c.strokeStyle = '#C98F4A'; c.lineWidth = 2.4; c.beginPath(); c.arc(-8, -6, 18, -1.1, 1.1); c.stroke(); c.strokeStyle = 'rgba(255,255,255,.8)'; c.lineWidth = 1; c.beginPath(); c.moveTo(-8 + Math.cos(-1.1) * 18, -6 + Math.sin(-1.1) * 18); c.lineTo(-8 + Math.cos(1.1) * 18, -6 + Math.sin(1.1) * 18); c.stroke(); }
    c.restore();
  }
  /* head */
  c.save(); c.translate(0, -76);
  const cap = [[13,4],[18,-8],[22,-12],[15,-20],[13,-30],[3,-25],[-5,-33],[-9,-23],[-19,-27],[-17,-17],[-26,-14],[-19,-7],[-25,3],[-15,1],[-17,12],[-10,6]];
  c.beginPath(); spiky(c, cap, 0, -8, 2.5); c.closePath(); c.fillStyle = L.hair; c.fill(); line(c, L, lw); c.stroke();
  c.save(); c.beginPath(); spiky(c, cap, 0, -8, 2.5); c.closePath(); c.clip(); c.strokeStyle = L.rim; c.lineWidth = 3; c.shadowColor = L.rim; c.shadowBlur = 6; c.beginPath(); c.moveTo(-26, -14); c.quadraticCurveTo(-22, 0, -17, 12); c.stroke(); c.restore();
  c.beginPath(); c.ellipse(-9, 1, 3, 4.6, 0, 0, TAU); c.fillStyle = L.skin; c.fill(); line(c, L, lw * .8); c.stroke();
  const faceP = () => { c.beginPath(); c.moveTo(-10, -9); c.bezierCurveTo(-11, 2, -8, 9, -1, 13); c.quadraticCurveTo(3, 15, 6, 13); c.bezierCurveTo(11, 9, 13, 2, 12, -9); c.closePath(); };
  faceP(); c.fillStyle = L.skin; c.fill(); c.save(); faceP(); c.clip(); c.fillStyle = L.shade; c.fillRect(-12, -10, 26, 6); c.beginPath(); c.moveTo(-11, 0); c.quadraticCurveTo(-7, 10, 0, 14); c.lineTo(-12, 14); c.closePath(); c.fill(); c.restore();
  faceP(); line(c, L, lw); c.stroke();
  /* eyes: near eye bigger */
  const eyeS = (ex, w) => {
    c.fillStyle = '#FFFFFF'; c.beginPath(); c.ellipse(ex, 0, w, 4.4, 0, 0, TAU); c.fill();
    const g = c.createLinearGradient(0, -4, 0, 4.5); g.addColorStop(0, L.irisD); g.addColorStop(.6, L.irisL); g.addColorStop(1, '#F2FDFF');
    c.fillStyle = g; c.beginPath(); c.ellipse(ex + .6, .6, w * .72, 3.9, 0, 0, TAU); c.fill();
    c.fillStyle = L.irisD; c.beginPath(); c.ellipse(ex + .6, 0, w * .32, 2, 0, 0, TAU); c.fill();
    c.fillStyle = '#FFFFFF'; c.beginPath(); c.arc(ex - .6, -1.6, 1.2, 0, TAU); c.fill();
    c.strokeStyle = L.line; c.lineWidth = 1.8; c.beginPath(); c.moveTo(ex - w - .5, -1); c.quadraticCurveTo(ex, -5.6, ex + w + 1, -2.6); c.stroke();
  };
  if (o.flash && Math.floor(t * 20) % 2) { c.strokeStyle = L.line; c.lineWidth = 1.8; c.beginPath(); c.moveTo(0, -1); c.lineTo(4, 1); c.lineTo(0, 3); c.moveTo(11, -1); c.lineTo(7, 1); c.lineTo(11, 3); c.stroke(); }
  else { eyeS(1.5, 2.8); eyeS(8.6, 3.2); }
  c.strokeStyle = L.line; c.lineWidth = 1.3; c.beginPath(); c.moveTo(3.5, 9); c.quadraticCurveTo(5.5, 10.5, 7.5, 8.8); c.stroke();
  c.fillStyle = 'rgba(255,120,150,.35)'; c.beginPath(); c.ellipse(9, 5, 2.6, 1.4, 0, 0, TAU); c.fill();
  /* fringe */
  const fr = [[-11,0],[-13,-12],[-6,-21],[4,-23],[13,-19],[15,-9],[14,3],[11,-5],[9,2],[6,-7],[3,1],[0,-8],[-4,-1],[-7,-9]];
  c.beginPath(); spiky(c, fr, 2, -6, 1.6); c.closePath(); c.fillStyle = L.hair; c.fill();
  c.save(); c.clip(); c.fillStyle = L.hairHi; c.beginPath(); c.moveTo(-8, -14); c.quadraticCurveTo(3, -20, 13, -13); c.lineTo(11, -10); c.lineTo(3, -14); c.lineTo(-6, -10); c.closePath(); c.fill(); c.restore();
  c.beginPath(); spiky(c, fr, 2, -6, 1.6); c.closePath(); line(c, L, lw); c.stroke();
  if (L.style === 1) blossom(c, -6, -19, 6, '#FFC6DD');
  if (L.style === 2) { c.fillStyle = L.scarf; c.beginPath(); c.arc(-9, -22, 3, 0, TAU); c.fill(); }
  c.restore();
  if (o.flash && Math.floor(t * 20) % 2) { c.globalCompositeOperation = 'source-atop'; c.fillStyle = 'rgba(255,255,255,.55)'; c.fillRect(-50, -120, 100, 130); }
  c.restore();
};

/* ---------- spirit companions. Centred at (x, y); about 80 units across at k = 1. stage 1 to 3. ---------- */
K.SPIRITS = {
  petal:{name:['Petal', 'Petalfox', 'Sakura Kitsune'], el:'blossom', fur:'#FFD9E8', furS:'#F2A4C4', eye:'#FF7FB5', glow:'rgba(255,150,210,.9)', mark:'#FFFFFF'},
  ripple:{name:['Ripple', 'Rippletail', 'Tidecrest'], el:'tide', fur:'#BFEAFF', furS:'#6FB8E8', eye:'#2F7BFF', glow:'rgba(120,210,255,.9)', mark:'#FFFFFF'},
  ember:{name:['Ember', 'Emberhound', 'Blaze Kirin'], el:'ember', fur:'#FFD2A6', furS:'#FF9A55', eye:'#E2462E', glow:'rgba(255,170,90,.9)', mark:'#FFF1C2'},
  hanamori:{name:['Hanamori', 'Hanamori', 'Hanamori'], el:'blossom', fur:'#FFF4F8', furS:'#F7C3D7', eye:'#FF5FA0', glow:'rgba(255,170,220,.9)', mark:'#FFC6DD', guardian:true, isle:0},
  umikaze:{name:['Umikaze', 'Umikaze', 'Umikaze'], el:'tide', fur:'#EAFBFF', furS:'#46C8FF', eye:'#2F7BFF', glow:'rgba(120,210,255,.9)', mark:'#FF8A5A', guardian:true, isle:1},
  homura:{name:['Homura', 'Homura', 'Homura'], el:'ember', fur:'#FFF1E0', furS:'#FF8A3D', eye:'#E2462E', glow:'rgba(255,170,90,.9)', mark:'#FFE27A', guardian:true, isle:2},
};
function spiritEyes(c, D, xs, y, r) { for (const x of xs) { c.beginPath(); c.ellipse(x, y, r * .78, r, 0, 0, TAU); c.fillStyle = '#182462'; c.fill(); c.fillStyle = D.eye; c.beginPath(); c.ellipse(x, y + r * .3, r * .5, r * .55, 0, 0, TAU); c.fill(); c.fillStyle = '#FFF'; c.beginPath(); c.arc(x - r * .28, y - r * .38, r * .3, 0, TAU); c.fill(); } }
K.spirit = function (c, kind, stage, x, y, k, t = 0, o = {}) {
  const D = K.SPIRITS[kind] || K.SPIRITS.petal;
  if (kind === 'hanamori') { K.deer(c, x, y + 30 * k, k * .32, t, 1, {calm:true}); return; }
  if (kind === 'umikaze') { K.dragon(c, x, y + 36 * k, k * .34, t, 1, {calm:true, face:o.face}); return; }
  if (kind === 'homura') { K.fox(c, x, y + 34 * k, k * .38, t, 1, {calm:true, face:o.face}); return; }
  stage = clamp(stage || 1, 1, 3);
  const sc = k * (stage === 1 ? 1 : stage === 2 ? 1.18 : 1.34);
  c.save(); c.translate(x, y + Math.sin(t * 2.4) * 3 * k); c.scale(sc * (o.face || 1), sc);
  const lw = 2 / sc;
  if (o.glow !== false) { const g = c.createRadialGradient(0, 0, 4, 0, 0, 70); g.addColorStop(0, D.glow.replace('.9', '.35')); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.beginPath(); c.arc(0, 0, 70, 0, TAU); c.fill(); }
  const ink = w => { c.strokeStyle = LINE; c.lineWidth = w || lw; c.lineJoin = 'round'; c.lineCap = 'round'; };
  const tails = stage === 3 ? 3 : stage === 2 ? 2 : 1;
  for (let i = tails - 1; i >= 0; i--) {
    const a = (i - (tails - 1) / 2) * .45 + Math.sin(t * 3 + i) * .08;
    c.save(); c.translate(16, 16); c.rotate(a);
    if (kind === 'petal') { c.beginPath(); c.moveTo(2, 6); c.bezierCurveTo(54, 14, 66, -46, 30, -72); c.bezierCurveTo(46, -36, 24, -16, -2, -12); c.closePath(); c.fillStyle = D.fur; c.fill(); ink(); c.stroke(); c.beginPath(); c.moveTo(30, -72); c.bezierCurveTo(40, -60, 42, -52, 40, -42); c.quadraticCurveTo(30, -56, 24, -60); c.closePath(); c.fillStyle = '#FFFFFF'; c.fill(); c.stroke(); }
    else if (kind === 'ripple') { c.beginPath(); c.moveTo(0, 4); c.bezierCurveTo(34, 10, 52, -10, 56, -30); c.bezierCurveTo(46, -18, 30, -8, 0, -8); c.closePath(); c.fillStyle = D.furS; c.fill(); ink(); c.stroke(); }
    else { const fl = Math.sin(t * 12 + i) * 4; c.beginPath(); c.moveTo(0, 2); c.bezierCurveTo(30, 0, 40, -30, 34 + fl, -56); c.bezierCurveTo(26, -38, 18, -30, 20, -42); c.bezierCurveTo(10, -24, 4, -14, -2, -10); c.closePath(); const g = c.createLinearGradient(0, 0, 0, -56); g.addColorStop(0, '#FF7A3A'); g.addColorStop(1, '#FFE27A'); c.fillStyle = g; c.fill(); ink(); c.stroke(); }
    c.restore();
  }
  /* body */
  c.beginPath(); c.ellipse(0, 18, 26, 20, 0, 0, TAU); c.fillStyle = D.fur; c.fill(); ink(); c.stroke();
  c.fillStyle = '#FFFFFF'; c.beginPath(); c.ellipse(-4, 24, 12, 10, 0, 0, TAU); c.fill();
  /* head */
  c.beginPath(); c.moveTo(-34, -8); c.quadraticCurveTo(-36, -38, 0, -40); c.quadraticCurveTo(36, -38, 34, -8); c.quadraticCurveTo(30, 10, 0, 12); c.quadraticCurveTo(-30, 10, -34, -8); c.closePath();
  c.fillStyle = D.fur; c.fill(); ink(); c.stroke();
  if (kind === 'petal') for (const f of [-1, 1]) { c.beginPath(); c.moveTo(f * 12, -36); c.lineTo(f * 32, -70); c.lineTo(f * 34, -26); c.closePath(); c.fillStyle = D.fur; c.fill(); ink(); c.stroke(); c.beginPath(); c.moveTo(f * 17, -36); c.lineTo(f * 30, -60); c.lineTo(f * 30, -32); c.closePath(); c.fillStyle = D.furS; c.fill(); }
  if (kind === 'ripple') for (const f of [-1, 1]) { c.beginPath(); c.arc(f * 26, -30, 9, 0, TAU); c.fillStyle = D.fur; c.fill(); ink(); c.stroke(); c.beginPath(); c.arc(f * 26, -30, 4.5, 0, TAU); c.fillStyle = D.furS; c.fill(); }
  if (kind === 'ember') for (const f of [-1, 1]) { c.beginPath(); c.moveTo(f * 14, -36); c.quadraticCurveTo(f * 40, -46, f * 40, -16); c.quadraticCurveTo(f * 30, -24, f * 24, -18); c.closePath(); c.fillStyle = D.furS; c.fill(); ink(); c.stroke(); }
  /* muzzle */
  c.fillStyle = '#FFFFFF'; c.beginPath(); c.moveTo(-24, -2); c.quadraticCurveTo(0, 18, 24, -2); c.quadraticCurveTo(0, 6, -24, -2); c.fill();
  spiritEyes(c, D, [-13, 13], -14, 8.5);
  c.fillStyle = LINE; c.beginPath(); c.arc(0, -2, 2.4, 0, TAU); c.fill();
  ink(1.6 / sc); c.beginPath(); c.moveTo(-5, 3); c.quadraticCurveTo(0, 6, 5, 3); c.stroke();
  for (const f of [-1, 1]) { c.fillStyle = 'rgba(255,120,150,.4)'; c.beginPath(); c.ellipse(f * 22, -2, 5, 3, 0, 0, TAU); c.fill(); }
  /* forehead mark */
  if (kind === 'petal') { blossom(c, 0, -30, 9, '#FFFFFF', '#E9B949'); }
  else if (kind === 'ripple') { c.strokeStyle = '#FFFFFF'; c.lineWidth = 2.4; c.beginPath(); c.moveTo(-7, -28); c.quadraticCurveTo(-3, -34, 0, -28); c.quadraticCurveTo(3, -22, 7, -28); c.stroke(); }
  else { c.fillStyle = '#FFE27A'; c.beginPath(); c.moveTo(0, -36); c.quadraticCurveTo(6, -28, 0, -22); c.quadraticCurveTo(-6, -28, 0, -36); c.fill(); }
  /* stage extras: ribbon at stage 2, crest and floating motes at stage 3 */
  if (stage >= 2) { c.fillStyle = kind === 'ember' ? '#E2462E' : kind === 'ripple' ? '#2F7BFF' : '#E8577A'; c.beginPath(); c.ellipse(0, 8, 18, 4, 0, 0, Math.PI); c.fill(); c.beginPath(); c.arc(0, 12, 4, 0, TAU); c.fillStyle = '#FFE27A'; c.fill(); ink(1.4 / sc); c.stroke(); }
  if (stage >= 3) { c.save(); c.shadowColor = D.glow; c.shadowBlur = 14; for (let i = 0; i < 5; i++) { const a = t * 1.4 + i * TAU / 5, rx = Math.cos(a) * 52, ry = Math.sin(a) * 18 - 20; if (kind === 'petal') blossom(c, rx, ry, 6, '#FFD9E8'); else { c.fillStyle = kind === 'ripple' ? '#BFEAFF' : '#FFC27A'; c.beginPath(); c.arc(rx, ry, 3.4, 0, TAU); c.fill(); } } c.restore(); }
  c.restore();
};

/* ---------- shadow creatures. el: blossom | tide | ember. ---------- */
const SH = {blossom:{core:'#3A1E56', edge:'#120A20', glow:'#FF6FD8', eye:'#FF7FCF'}, tide:{core:'#1E2E66', edge:'#0A1024', glow:'#46C8FF', eye:'#7FF0FF'}, ember:{core:'#4A1C24', edge:'#1A080C', glow:'#FF7A3A', eye:'#FFC23A'}};
K.shadow = function (c, el, x, y, k, t = 0, o = {}) {
  const S = SH[el] || SH.blossom, R = seed(o.seed || 11);
  c.save(); c.translate(x, y + Math.sin(t * 2) * 6 * k); c.scale(k * (o.face || 1), k * (1 + Math.sin(t * 3) * .02));
  if (o.hit) { c.translate(Math.sin(t * 60) * 6, 0); }
  c.globalAlpha = o.alpha != null ? o.alpha : 1;
  c.shadowColor = S.glow; c.shadowBlur = 30;
  const pts = []; for (let i = 0; i < 18; i++) { const a = i / 18 * TAU, r = (i % 2 ? 70 : 92) + R() * 18 + (Math.sin(a) > .4 ? 14 : 0) + Math.sin(t * 4 + i) * 4; pts.push([Math.cos(a) * r * 1.1, Math.sin(a) * r * .85 - (Math.sin(a) < -.3 ? 18 : 0)]); }
  c.beginPath(); spiky(c, pts.concat([pts[0]]), 0, 0, 10); c.closePath();
  const g = c.createRadialGradient(0, -10, 10, 0, 0, 110); g.addColorStop(0, S.core); g.addColorStop(1, S.edge); c.fillStyle = g; c.fill(); c.shadowBlur = 0;
  c.strokeStyle = LINE; c.lineWidth = 2.6 / k; c.lineJoin = 'round'; c.stroke();
  if (o.big) for (const f of [-1, 1]) { c.beginPath(); c.moveTo(f * 28, -64); c.lineTo(f * 58, -120); c.lineTo(f * 62, -58); c.closePath(); c.fillStyle = S.edge; c.fill(); c.stroke(); }
  else for (const f of [-1, 1]) { c.beginPath(); c.moveTo(f * 30, -60); c.quadraticCurveTo(f * 52, -96, f * 66, -88); c.quadraticCurveTo(f * 56, -70, f * 58, -52); c.closePath(); c.fillStyle = S.edge; c.fill(); c.stroke(); }
  if (el === 'blossom') { c.save(); c.globalAlpha *= .8; for (let i = 0; i < 3; i++) blossom(c, -50 + i * 50, 60 + (i % 2) * 8, 9, '#B04CFF', '#FF7FCF'); c.restore(); }
  if (el === 'ember') { c.fillStyle = '#FF7A3A'; for (let i = 0; i < 4; i++) { const ex = -60 + i * 40 + Math.sin(t * 5 + i) * 4; c.beginPath(); c.moveTo(ex, -60); c.quadraticCurveTo(ex + 8, -80, ex, -96 - Math.sin(t * 9 + i) * 6); c.quadraticCurveTo(ex - 8, -80, ex, -60); c.fill(); } }
  if (el === 'tide') { c.strokeStyle = 'rgba(127,240,255,.6)'; c.lineWidth = 3; for (let i = 0; i < 3; i++) { c.beginPath(); c.arc(0, 70 + i * 4, 60 - i * 14, .2, Math.PI - .2); c.stroke(); } }
  if (o.look) shadowLook(c, o.look, S, t, k);
  c.shadowColor = S.eye; c.shadowBlur = 18;
  const blink = (Math.sin(t * 1.3 + (o.seed || 0)) > .97) ? .2 : 1;
  for (const f of [-1, 1]) { c.beginPath(); c.moveTo(f * 12, -18); c.quadraticCurveTo(f * 34, -34 * blink, f * 50, -20); c.quadraticCurveTo(f * 34, -10, f * 12, -18); c.closePath(); c.fillStyle = S.eye; c.fill(); }
  c.shadowBlur = 0; c.fillStyle = '#FFFFFF'; for (const f of [-1, 1]) { c.beginPath(); c.arc(f * 34, -21, 3.5, 0, TAU); c.fill(); }
  c.strokeStyle = S.eye; c.lineWidth = 3; c.beginPath(); c.moveTo(-24, 18); for (let i = 0; i <= 6; i++) c.lineTo(-24 + i * 8, 18 + (i % 2 ? 8 : 0)); c.stroke();
  if (o.flash) { c.globalCompositeOperation = 'source-atop'; c.fillStyle = `rgba(255,255,255,${o.flash})`; c.fillRect(-140, -140, 280, 260); }
  c.restore();
};

/* ---------- Hanamori, the Blossom Deer. Feet at (x, y); about 340 wide at k = 1. pure: 0 shadow, 1 back to normal. ---------- */
K.deer = function (c, x, y, k, t = 0, pure = 0, o = {}) {
  c.save(); c.translate(x, y); c.scale(-k * (o.face || 1), k);
  if (o.hit) c.translate(Math.sin(t * 60) * 5, 0);
  const body = pure > .5 ? '#FFF4F8' : '#2A1840', bodyS = pure > .5 ? '#F2C2D6' : '#170C26', glow = pure > .5 ? '#FFB7D5' : '#B04CFF';
  const mix = (a, b) => { const A = parseInt(a.slice(1), 16), B = parseInt(b.slice(1), 16); const ch = s => Math.round(lerp((A >> s) & 255, (B >> s) & 255, pure)); return `rgb(${ch(16)},${ch(8)},${ch(0)})`; };
  const bc = mix('#2A1840', '#FFF4F8'), bs = mix('#170C26', '#F2C2D6');
  const lw = 3 / k * .6, ink = w => { c.strokeStyle = LINE; c.lineWidth = w || lw; c.lineJoin = 'round'; c.lineCap = 'round'; };
  const breathe = Math.sin(t * 2) * 3, step = o.charge ? Math.sin(t * 16) * .3 : 0;
  /* aura */
  const ag = c.createRadialGradient(0, -150, 20, 0, -150, 260); ag.addColorStop(0, pure > .5 ? 'rgba(255,190,220,.35)' : 'rgba(176,76,255,.35)'); ag.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = ag; c.beginPath(); c.arc(0, -150, 260, 0, TAU); c.fill();
  /* legs */
  const legs = [[-70, 1], [-40, -1], [60, -1], [86, 1]];
  for (const [lx, s] of legs) { const a = s * step; ink(22); c.lineWidth = 22; c.beginPath(); c.moveTo(lx, -120); c.lineTo(lx + Math.sin(a) * 40 - 4, -60); c.lineTo(lx + Math.sin(a) * 60, 0); c.stroke(); c.strokeStyle = s > 0 ? bc : bs; c.lineWidth = 15; c.beginPath(); c.moveTo(lx, -120); c.lineTo(lx + Math.sin(a) * 40 - 4, -60); c.lineTo(lx + Math.sin(a) * 60, 0); c.stroke(); c.fillStyle = LINE; c.beginPath(); c.ellipse(lx + Math.sin(a) * 60, 0, 12, 7, 0, 0, TAU); c.fill(); }
  /* tail */
  c.beginPath(); c.moveTo(-110, -170); c.quadraticCurveTo(-150, -190 + breathe, -136, -150); c.quadraticCurveTo(-126, -160, -106, -150); c.closePath(); c.fillStyle = '#FFFFFF'; c.fill(); ink(); c.stroke();
  /* body */
  c.beginPath(); c.ellipse(0, -150 + breathe * .3, 116, 52, -.04, 0, TAU); c.fillStyle = bc; c.fill(); ink(); c.stroke();
  c.save(); c.clip(); c.fillStyle = bs; c.beginPath(); c.ellipse(10, -110, 120, 30, 0, 0, TAU); c.fill(); c.restore();
  /* spots / blossoms on the back */
  for (let i = 0; i < 6; i++) { const sx = -70 + i * 26, sy = -178 + Math.sin(i * 1.7) * 8; if (pure > .5) blossom(c, sx, sy, 10, '#FFC6DD', '#FFE27A'); else { c.fillStyle = 'rgba(255,95,176,.55)'; c.beginPath(); c.arc(sx, sy, 5, 0, TAU); c.fill(); } }
  /* neck and head */
  c.beginPath(); c.moveTo(70, -186); c.quadraticCurveTo(100, -240, 120, -276); c.lineTo(150, -262); c.quadraticCurveTo(130, -210, 110, -140); c.closePath(); c.fillStyle = bc; c.fill(); ink(); c.stroke();
  c.save(); c.translate(140, -284 + breathe);
  c.beginPath(); c.moveTo(-26, -10); c.quadraticCurveTo(-20, -40, 10, -36); c.quadraticCurveTo(46, -28, 70, 0); c.quadraticCurveTo(74, 14, 60, 16); c.quadraticCurveTo(20, 18, -10, 22); c.quadraticCurveTo(-30, 14, -26, -10); c.closePath(); c.fillStyle = bc; c.fill(); ink(); c.stroke();
  c.fillStyle = LINE; c.beginPath(); c.arc(64, 4, 4, 0, TAU); c.fill();
  /* ears */
  c.beginPath(); c.moveTo(-14, -30); c.quadraticCurveTo(-50, -56, -60, -40); c.quadraticCurveTo(-40, -22, -16, -20); c.closePath(); c.fillStyle = bc; c.fill(); ink(); c.stroke();
  /* eye */
  c.save(); c.shadowColor = pure > .5 ? '#FF7FB5' : '#FF3D9A'; c.shadowBlur = pure > .5 ? 6 : 20;
  if (pure > .5) { c.beginPath(); c.ellipse(16, -8, 8, 10, 0, 0, TAU); c.fillStyle = '#182462'; c.fill(); c.fillStyle = '#FF7FB5'; c.beginPath(); c.ellipse(16, -5, 5, 6, 0, 0, TAU); c.fill(); c.fillStyle = '#FFF'; c.beginPath(); c.arc(13, -12, 2.6, 0, TAU); c.fill(); }
  else { c.beginPath(); c.moveTo(2, -6); c.quadraticCurveTo(16, -20, 30, -8); c.quadraticCurveTo(16, -2, 2, -6); c.fillStyle = '#FF5FB0'; c.fill(); }
  c.restore();
  /* antlers with blossoms */
  ink(7); const ant = [[[-2, -34], [-20, -90], [-50, -120]], [[-12, -70], [-46, -86]], [[-20, -90], [-6, -134]], [[6, -36], [30, -96], [62, -118]], [[24, -80], [52, -78]], [[30, -96], [26, -140]]];
  for (const br of ant) { c.strokeStyle = LINE; c.lineWidth = 8; c.beginPath(); br.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); c.stroke(); c.strokeStyle = pure > .5 ? '#C9A27A' : '#4A2E5E'; c.lineWidth = 4.5; c.beginPath(); br.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); c.stroke(); }
  c.save(); c.shadowColor = glow; c.shadowBlur = 14;
  for (const br of ant) { const p = br[br.length - 1]; blossom(c, p[0], p[1], 15, pure > .5 ? '#FFC6DD' : '#7A3B9A', pure > .5 ? '#FFE27A' : '#FF5FB0'); }
  c.restore();
  c.restore();
  /* shadow smoke */
  if (pure < 1) { c.save(); c.globalAlpha = (1 - pure) * .7; for (let i = 0; i < 9; i++) { const a = t * .8 + i, sx = Math.sin(a * 1.3 + i) * 120, sy = -150 + Math.cos(a + i * 2) * 70 - ((t * 40 + i * 30) % 120); c.fillStyle = 'rgba(40,10,60,.55)'; c.beginPath(); c.arc(sx, sy, 18 + (i % 3) * 8, 0, TAU); c.fill(); } c.restore(); }
  if (o.flash) { c.globalCompositeOperation = 'source-atop'; c.fillStyle = `rgba(255,255,255,${o.flash})`; c.fillRect(-200, -460, 420, 480); }
  c.restore();
};

/* ---------- Blossom Isle backdrop for exploring (parallax). gy: screen y of ground level 0. ---------- */
const treeCache = {};
function sakura(c, x, y, s, R, lit) {
  c.strokeStyle = '#3B2340'; c.lineWidth = 10 * s; c.lineCap = 'round';
  c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x - 6 * s, y - 50 * s, x + 4 * s, y - 92 * s); c.moveTo(x + 2 * s, y - 62 * s); c.quadraticCurveTo(x + 30 * s, y - 80 * s, x + 44 * s, y - 104 * s); c.moveTo(x - 2 * s, y - 70 * s); c.quadraticCurveTo(x - 30 * s, y - 84 * s, x - 42 * s, y - 100 * s); c.stroke();
  for (let i = 0; i < 11; i++) { const bx = x + (R() - .5) * 120 * s, by = y - 96 * s + (R() - .5) * 56 * s, r = (20 + R() * 18) * s; c.fillStyle = i % 3 === 0 ? '#F6A9CC' : i % 3 === 1 ? '#FFC6DD' : '#E98BB8'; c.beginPath(); c.arc(bx, by, r, 0, TAU); c.fill(); }
  if (lit) { c.fillStyle = 'rgba(255,240,250,.6)'; for (let i = 0; i < 6; i++) { c.beginPath(); c.arc(x + (R() - .5) * 100 * s, y - 110 * s + (R() - .5) * 40 * s, 4 * s, 0, TAU); c.fill(); } }
}
function torii(c, x, y, s, col = '#C8384A') {
  c.fillStyle = col; c.strokeStyle = LINE; c.lineWidth = 2;
  c.fillRect(x - 40 * s, y - 100 * s, 8 * s, 100 * s); c.fillRect(x + 32 * s, y - 100 * s, 8 * s, 100 * s);
  c.beginPath(); c.moveTo(x - 58 * s, y - 108 * s); c.quadraticCurveTo(x, y - 100 * s, x + 58 * s, y - 108 * s); c.lineTo(x + 54 * s, y - 118 * s); c.quadraticCurveTo(x, y - 110 * s, x - 54 * s, y - 118 * s); c.closePath(); c.fill();
  c.fillRect(x - 46 * s, y - 88 * s, 92 * s, 7 * s);
}
function pagoda(c, x, y, s, col) {
  c.fillStyle = col;
  for (let i = 0; i < 3; i++) { const w = (70 - i * 16) * s, yy = y - i * 42 * s; c.fillRect(x - w * .35, yy - 34 * s, w * .7, 34 * s); c.beginPath(); c.moveTo(x - w * .75, yy - 30 * s); c.quadraticCurveTo(x, yy - 52 * s, x + w * .75, yy - 30 * s); c.lineTo(x + w * .6, yy - 40 * s); c.quadraticCurveTo(x, yy - 58 * s, x - w * .6, yy - 40 * s); c.closePath(); c.fill(); }
  c.fillRect(x - 2 * s, y - 170 * s, 4 * s, 30 * s);
}
K.skyGradient = (c, W, H, top = '#0D1446', mid = '#3B2A86', low = '#C26BB0', hor = '#FFB7A0') => {
  const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, top); g.addColorStop(.45, mid); g.addColorStop(.78, low); g.addColorStop(1, hor); c.fillStyle = g; c.fillRect(0, 0, W, H);
};
K.stars = (c, W, H, t, n = 70, sd = 9) => { const R = seed(sd); for (let i = 0; i < n; i++) { const tw = .5 + .5 * Math.sin(t * 2 + i); c.fillStyle = `rgba(255,255,255,${(.25 + R() * .6) * (.6 + .4 * tw)})`; c.beginPath(); c.arc(R() * W, R() * H * .5, R() * 1.4 + .3, 0, TAU); c.fill(); } };
K.floatIsle = (c, x, y, r, col, top = '#4FBF9A', t = 0) => {
  y += Math.sin(t * .8 + x * .01) * 4;
  c.fillStyle = col; c.beginPath(); c.moveTo(x - r, y); c.quadraticCurveTo(x - r * .4, y + r * 1.1, x, y + r * 1.4); c.quadraticCurveTo(x + r * .4, y + r * 1.1, x + r, y); c.closePath(); c.fill();
  c.fillStyle = top; c.beginPath(); c.ellipse(x, y, r, r * .22, 0, 0, TAU); c.fill();
  c.save(); c.shadowColor = '#7FF0FF'; c.shadowBlur = 14; c.fillStyle = '#9BF6FF'; c.beginPath(); c.moveTo(x - r * .2, y + r * .5); c.lineTo(x - r * .1, y + r * .9); c.lineTo(x, y + r * .5); c.closePath(); c.fill(); c.restore();
};
/* camX in world units, s = world to screen scale, gy = screen y of world y 0 */
K.islandBg = function (c, W, H, camX, gy, s, t, o = {}) {
  if (o.isle === 1) return grottoBg(c, W, H, camX, gy, s, t);
  if (o.isle === 2) return peakBg(c, W, H, camX, gy, s, t);
  K.skyGradient(c, W, H, '#0D1446', '#3B2A86', '#C26BB0', '#FFB7A0');
  K.stars(c, W, H, t);
  /* moon */
  c.save(); c.shadowColor = '#FFF1F8'; c.shadowBlur = 40; c.fillStyle = '#FFF4FA'; c.beginPath(); c.arc(W * .78, H * .14, 26, 0, TAU); c.fill(); c.restore();
  /* far floating islands */
  const p1 = camX * s * .06;
  for (let i = -1; i < 4; i++) { const bx = ((i * 260 - p1) % (W + 260) + W + 260) % (W + 260) - 130; K.floatIsle(c, bx, H * .26 + (i % 2) * 40, 26 + (i % 3) * 10, '#2A2460', '#4FBF9A', t); }
  /* far hills */
  const p2 = camX * s * .15;
  c.fillStyle = '#4A2F7A'; c.beginPath(); c.moveTo(0, gy); for (let x = 0; x <= W + 20; x += 20) { const wx = x + p2; c.lineTo(x, gy - 150 * s - Math.sin(wx / 140) * 40 * s - Math.sin(wx / 53) * 14 * s); } c.lineTo(W, gy); c.closePath(); c.fill();
  /* pagodas on far hills */
  for (let i = 0; i < 3; i++) { const wx = i * 700 + 300, sx = ((wx - p2 / .15 * .15) % 2100 + 2100) % 2100 - 200; if (sx > -100 && sx < W + 100) pagoda(c, sx, gy - 150 * s - Math.sin((sx + p2) / 140) * 40 * s + 10, .7 * s, '#3A2468'); }
  /* mid layer: blossom trees, torii */
  const p3 = camX * s * .4, tile = 320 * s;
  const i0 = Math.floor(p3 / tile) - 1;
  for (let i = i0; i < i0 + Math.ceil(W / tile) + 3; i++) {
    const R = seed(1000 + i * 7), sx = i * tile - p3 + R() * 80 * s;
    c.save(); c.globalAlpha = .82;
    if (i % 5 === 2) torii(c, sx, gy - 6 * s, s * .9); else sakura(c, sx, gy, s * (.9 + R() * .3), R, true);
    c.restore();
  }
  /* mist band */
  const mg = c.createLinearGradient(0, gy - 90 * s, 0, gy); mg.addColorStop(0, 'rgba(255,183,213,0)'); mg.addColorStop(1, 'rgba(255,183,213,.22)'); c.fillStyle = mg; c.fillRect(0, gy - 90 * s, W, 90 * s);
};
/* falling petals over everything, drawn last */
K.petals = function (c, W, H, t, n = 22, wind = 1) {
  const R = seed(77);
  for (let i = 0; i < n; i++) {
    const sp = 20 + R() * 30, x = ((R() * W - t * sp * wind) % W + W) % W, y = ((R() * H + t * (30 + R() * 30)) % (H + 20)) - 10, a = t * (1 + R()) + i;
    c.save(); c.translate(x, y); c.rotate(a); c.fillStyle = i % 2 ? 'rgba(255,198,221,.9)' : 'rgba(246,169,204,.85)'; c.beginPath(); c.ellipse(0, 0, 4, 2.2, 0, 0, TAU); c.fill(); c.restore();
  }
};
/* a terrain block: top surface grass with petals; earth body */
K.ground = function (c, x, y, w, h, s, kind, isle) {
  if (isle === 1 || isle === 2) return groundIsle(c, x, y, w, h, s, kind, isle);
  if (kind === 'plat') {
    const g = c.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, '#6B4A6E'); g.addColorStop(1, '#3E2A52'); c.fillStyle = g; E.rr(c, x, y, w, h, 8 * s); c.fill();
    c.strokeStyle = LINE; c.lineWidth = 2; c.stroke();
    c.fillStyle = '#58C9A2'; E.rr(c, x - 2 * s, y - 4 * s, w + 4 * s, 10 * s, 5 * s); c.fill(); c.stroke();
    c.fillStyle = 'rgba(255,198,221,.9)'; for (let i = 8; i < w - 6; i += 22 * s) { c.beginPath(); c.ellipse(x + i, y - 1, 3 * s, 1.6 * s, 0, 0, TAU); c.fill(); }
    return;
  }
  const g = c.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, '#3E2F6E'); g.addColorStop(1, '#1A1638'); c.fillStyle = g; c.fillRect(x, y, w, h);
  c.strokeStyle = LINE; c.lineWidth = 2; c.strokeRect(x, y, w, h + 40);
  c.fillStyle = '#4FBF9A'; c.fillRect(x, y - 2, w, 12 * s); c.fillStyle = '#7FE0BC'; c.fillRect(x, y - 2, w, 4 * s);
  c.beginPath(); c.moveTo(x, y - 2); c.lineTo(x + w, y - 2); c.stroke();
  const R = seed(Math.round(x / 7) + 5);
  c.fillStyle = 'rgba(255,198,221,.9)'; for (let i = 6; i < w - 4; i += 16 * s) { c.beginPath(); c.ellipse(x + i + R() * 8, y + 1 + R() * 4 * s, 3 * s, 1.6 * s, R(), 0, TAU); c.fill(); }
  c.save(); c.shadowColor = '#7FF0FF'; c.shadowBlur = 10; c.fillStyle = 'rgba(150,240,255,.7)'; for (let i = 30; i < w; i += 90 * s) { const cx = x + i + R() * 40, cy = y + 30 * s + R() * Math.min(h - 40, 80) * s; c.beginPath(); c.moveTo(cx, cy - 8 * s); c.lineTo(cx + 4 * s, cy); c.lineTo(cx, cy + 3 * s); c.lineTo(cx - 4 * s, cy); c.closePath(); c.fill(); } c.restore();
};
/* a sky crystal pickup */
K.crystal = function (c, x, y, r, t, col = '#9BF6FF') {
  c.save(); c.translate(x, y + Math.sin(t * 3 + x * .05) * r * .25); c.rotate(Math.sin(t * 2 + x) * .15);
  c.shadowColor = '#7FF0FF'; c.shadowBlur = r * 1.2;
  c.fillStyle = col; c.beginPath(); c.moveTo(0, -r * 1.4); c.lineTo(r * .7, -r * .2); c.lineTo(0, r); c.lineTo(-r * .7, -r * .2); c.closePath(); c.fill();
  c.shadowBlur = 0; c.strokeStyle = LINE; c.lineWidth = 1.6; c.stroke();
  c.fillStyle = 'rgba(255,255,255,.8)'; c.beginPath(); c.moveTo(0, -r * 1.4); c.lineTo(r * .7, -r * .2); c.lineTo(0, -r * .1); c.closePath(); c.fill();
  c.restore();
};
K.chest = function (c, x, y, s, open, t) {
  c.save(); c.translate(x, y); c.scale(s, s);
  if (!open) { c.save(); c.shadowColor = '#FFE27A'; c.shadowBlur = 12 + Math.sin(t * 4) * 6; }
  c.fillStyle = '#8E4F3A'; c.strokeStyle = LINE; c.lineWidth = 2.4; E.rr(c, -26, -30, 52, 30, 5); c.fill(); c.stroke();
  if (!open) c.restore();
  c.save(); if (open) { c.translate(0, -30); c.rotate(-1.1); c.translate(0, 30); }
  c.fillStyle = '#A9604A'; c.beginPath(); c.moveTo(-28, -28); c.quadraticCurveTo(0, -52, 28, -28); c.closePath(); c.fill(); c.stroke();
  c.fillStyle = '#E9B949'; c.fillRect(-28, -31, 56, 5); c.restore();
  c.fillStyle = '#E9B949'; c.fillRect(-4, -34, 8, 34); c.strokeRect(-4, -34, 8, 34);
  if (!open) { c.fillStyle = '#7FF0FF'; c.beginPath(); c.arc(0, -16, 5, 0, TAU); c.fill(); c.stroke(); }
  else { c.save(); c.globalAlpha = .7; const g = c.createLinearGradient(0, -30, 0, -110); g.addColorStop(0, 'rgba(255,240,180,.9)'); g.addColorStop(1, 'rgba(255,240,180,0)'); c.fillStyle = g; c.beginPath(); c.moveTo(-22, -30); c.lineTo(-40, -110); c.lineTo(40, -110); c.lineTo(22, -30); c.closePath(); c.fill(); c.restore(); }
  c.restore();
};
K.gate = function (c, x, y, s, t, open, label, isle) {
  c.save(); c.translate(x, y); c.scale(s, s);
  if (isle === 1) seaArch(c, t); else torii(c, 0, 0, 1.15, isle === 2 ? '#D8452E' : '#C8384A');
  if (isle === 2) { c.save(); c.shadowColor = '#FF8A3D'; c.shadowBlur = 14; c.fillStyle = '#FFB347'; c.fillRect(-46 * 1.15, -88 * 1.15, 92 * 1.15, 3); c.restore(); }
  if (open < 1) { c.save(); c.globalAlpha = 1 - open; const g = c.createLinearGradient(0, -110, 0, 0); g.addColorStop(0, 'rgba(176,76,255,.15)'); g.addColorStop(.5, 'rgba(127,240,255,.55)'); g.addColorStop(1, 'rgba(176,76,255,.15)'); c.fillStyle = g; c.fillRect(-38, -100, 76, 100);
    c.strokeStyle = 'rgba(200,250,255,.8)'; c.lineWidth = 1.5; for (let i = 0; i < 5; i++) { const yy = -100 + ((t * 40 + i * 20) % 100); c.beginPath(); c.moveTo(-38, yy); c.lineTo(38, yy); c.stroke(); }
    if (label) { c.font = '900 26px "Dela Gothic One", Lexend, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineWidth = 5; c.strokeStyle = LINE; c.strokeText(label, 0, -52); c.fillStyle = '#FFFFFF'; c.fillText(label, 0, -52); }
    c.restore(); }
  c.restore();
};
K.lantern = function (c, x, y, s, lit, t) {
  c.save(); c.translate(x, y); c.scale(s, s);
  c.strokeStyle = LINE; c.lineWidth = 3; c.beginPath(); c.moveTo(0, 0); c.lineTo(0, -70); c.stroke();
  c.fillStyle = '#4A3A5E'; c.fillRect(-14, -72, 28, 6);
  if (lit) { c.save(); c.shadowColor = '#FFC56A'; c.shadowBlur = 26 + Math.sin(t * 6) * 6; }
  c.fillStyle = lit ? '#FFD27A' : '#6A5A7A'; E.rr(c, -12, -100, 24, 30, 6); c.fill(); if (lit) c.restore(); c.stroke();
  c.fillStyle = '#4A3A5E'; c.beginPath(); c.moveTo(-16, -100); c.lineTo(0, -114); c.lineTo(16, -100); c.closePath(); c.fill(); c.stroke();
  c.restore();
};
K.cage = function (c, x, y, s, t, broken) {
  c.save(); c.translate(x, y); c.scale(s, s);
  if (!broken) { c.strokeStyle = '#3A1E56'; c.lineWidth = 6; for (let i = -2; i <= 2; i++) { c.beginPath(); c.moveTo(i * 16, 0); c.lineTo(i * 16, -90); c.stroke(); } c.beginPath(); c.ellipse(0, -90, 40, 10, 0, 0, TAU); c.stroke(); c.save(); c.shadowColor = '#B04CFF'; c.shadowBlur = 16; c.strokeStyle = 'rgba(176,76,255,.8)'; c.lineWidth = 2; c.stroke(); c.restore(); }
  for (let i = 0; i < 3; i++) K.spirit(c, 'petal', 1, -24 + i * 24, -30 + (broken ? -Math.abs(Math.sin(t * 5 + i)) * 30 : 0), .3, t + i, {glow:false});
  c.restore();
};
K.bell = function (c, x, y, s, t, rung) {
  c.save(); c.translate(x, y); c.scale(s, s);
  c.fillStyle = '#5A3A2C'; c.fillRect(-50, -150, 10, 150); c.fillRect(40, -150, 10, 150);
  c.fillStyle = '#7A4A3C'; c.beginPath(); c.moveTo(-70, -150); c.quadraticCurveTo(0, -180, 70, -150); c.lineTo(66, -140); c.quadraticCurveTo(0, -164, -66, -140); c.closePath(); c.fill();
  c.save(); c.translate(0, -136); c.rotate(rung ? Math.sin(t * 8) * .3 : 0);
  if (rung) { c.shadowColor = '#FFE27A'; c.shadowBlur = 30; }
  c.fillStyle = rung ? '#F2C14E' : '#7D7A8E'; c.beginPath(); c.moveTo(-26, 70); c.quadraticCurveTo(-30, 10, 0, 6); c.quadraticCurveTo(30, 10, 26, 70); c.closePath(); c.fill(); c.strokeStyle = LINE; c.lineWidth = 3; c.stroke(); c.restore();
  c.restore();
};
K.falls = function (c, x, y, s, t, flow) {
  c.save(); c.translate(x, y); c.scale(s, s);
  c.fillStyle = '#3A2F6E'; c.beginPath(); c.moveTo(-90, 0); c.lineTo(-70, -240); c.lineTo(70, -240); c.lineTo(90, 0); c.closePath(); c.fill(); c.strokeStyle = LINE; c.lineWidth = 3; c.stroke();
  if (flow > 0) { c.save(); c.globalAlpha = flow; const g = c.createLinearGradient(0, -240, 0, 0); g.addColorStop(0, '#BFF6FF'); g.addColorStop(1, '#46C8FF'); c.fillStyle = g; c.fillRect(-40, -240, 80, 240); c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = 2; for (let i = 0; i < 6; i++) { const yy = -240 + ((t * 160 + i * 40) % 240); c.beginPath(); c.moveTo(-30 + i * 12, yy); c.lineTo(-30 + i * 12, yy + 30); c.stroke(); } c.restore(); }
  else { c.fillStyle = 'rgba(120,110,150,.5)'; c.fillRect(-40, -240, 80, 240); }
  c.restore();
};

/* ======================================================================
   Tide Grotto and Ember Peak: backdrops, ground, props, the shadows' looks and the two new guardians
   ====================================================================== */
K.ISLES = [
  {name:'Blossom Isle', top:'#4FBF9A', rock:'#2A2460', glow:'#FFC6DD'},
  {name:'Tide Grotto', top:'#2FBFA8', rock:'#13304E', glow:'#7FF0FF'},
  {name:'Ember Peak', top:'#6A5A62', rock:'#2A1420', glow:'#FF8A3D'},
];
const mixHex = (a, b, k) => { const A = parseInt(a.slice(1), 16), B = parseInt(b.slice(1), 16); const ch = s => Math.round(lerp((A >> s) & 255, (B >> s) & 255, clamp(k, 0, 1))); return `rgb(${ch(16)},${ch(8)},${ch(0)})`; };
K.mix = mixHex;

/* small helpers: a far jellyfish, kelp, a branching coral fan, a dark pine */
function jellyDot(c, x, y, r, col, t) {
  c.save(); c.globalAlpha = .75; c.shadowColor = col; c.shadowBlur = r * 1.6; c.fillStyle = col;
  c.beginPath(); c.arc(x, y, r, Math.PI, 0); c.quadraticCurveTo(x + r * .5, y + r * .35, x, y + r * .25); c.quadraticCurveTo(x - r * .5, y + r * .35, x - r, y); c.fill();
  c.shadowBlur = 0; c.globalAlpha = .5; c.strokeStyle = col; c.lineWidth = Math.max(1, r * .14);
  for (let i = 0; i < 4; i++) { const tx = x - r * .6 + i * r * .4; c.beginPath(); c.moveTo(tx, y + r * .2); c.quadraticCurveTo(tx + Math.sin(t * 3 + i) * r * .4, y + r * 1.2, tx + Math.sin(t * 2 + i) * r * .3, y + r * 2.2); c.stroke(); }
  c.restore();
}
function kelp(c, x, y, h, t, col) { c.strokeStyle = col; c.lineWidth = 5; c.lineCap = 'round'; c.beginPath(); c.moveTo(x, y); for (let i = 1; i <= 6; i++) c.lineTo(x + Math.sin(t * 1.5 + i * .8 + x * .01) * 6 * i / 6, y - h * i / 6); c.stroke(); }
function coralFan(c, x, y, s, col, R, outline) {
  const segs = [];
  const br = (x0, y0, a, len, w, d) => { const x1 = x0 + Math.sin(a) * len, y1 = y0 - Math.cos(a) * len; segs.push([x0, y0, x1, y1, w, d]); if (d > 0) { br(x1, y1, a - .45 - R() * .2, len * .74, w * .72, d - 1); br(x1, y1, a + .45 + R() * .2, len * .74, w * .72, d - 1); } };
  br(x, y, (R() - .5) * .3, 34 * s, 9 * s, 3);
  c.lineCap = 'round';
  if (outline) { c.strokeStyle = LINE; for (const [x0, y0, x1, y1, w] of segs) { c.lineWidth = w + 3; c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke(); } }
  c.strokeStyle = col; c.fillStyle = col;
  for (const [x0, y0, x1, y1, w, d] of segs) { c.lineWidth = w; c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke(); if (!d) { c.beginPath(); c.arc(x1, y1, w * .9, 0, TAU); c.fill(); } }
}
function pine(c, x, y, s, col) { c.fillStyle = col; c.fillRect(x - 3 * s, y - 24 * s, 6 * s, 24 * s); for (let i = 0; i < 3; i++) { const w = (34 - i * 9) * s, yy = y - 18 * s - i * 22 * s; c.beginPath(); c.moveTo(x - w, yy); c.quadraticCurveTo(x, yy - 34 * s, x + w, yy); c.quadraticCurveTo(x, yy - 8 * s, x - w, yy); c.fill(); } }
function flameShape(c, x, y, s, t, cols) {
  c.save(); c.translate(x, y); c.scale(s, s); c.shadowColor = cols[0]; c.shadowBlur = 24 + Math.sin(t * 7) * 6;
  const layer = (w, h, col, ph) => { const f = Math.sin(t * 9 + ph) * 3; c.fillStyle = col; c.beginPath(); c.moveTo(-w, 0); c.bezierCurveTo(-w, -h * .45, -w * .3 + f, -h * .6, f * 1.4, -h); c.bezierCurveTo(w * .3 + f, -h * .6, w, -h * .45, w, 0); c.quadraticCurveTo(0, w * .35, -w, 0); c.fill(); };
  layer(22, 54, cols[0], 0); c.shadowBlur = 0; layer(15, 40, cols[1], 1.3); layer(8, 24, cols[2], 2.1);
  c.restore();
}
K.flameShape = flameShape;

/* ---------- Tide Grotto backdrop: sea caves, light from above, far jellyfish, coral and water below ---------- */
function grottoBg(c, W, H, camX, gy, s, t) {
  K.skyGradient(c, W, H, '#04182F', '#0D4266', '#1C8090', '#5FD8C8');
  c.save(); c.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 5; i++) { const x = ((i * 170 + 60 - camX * s * .03) % (W + 240) + W + 240) % (W + 240) - 120, sw = Math.sin(t * .4 + i) * 24; const g = c.createLinearGradient(0, 0, 0, H * .85); g.addColorStop(0, 'rgba(150,255,240,.14)'); g.addColorStop(1, 'rgba(150,255,240,0)'); c.fillStyle = g; c.beginPath(); c.moveTo(x - 16, 0); c.lineTo(x + 16, 0); c.lineTo(x + 80 + sw, H * .85); c.lineTo(x - 20 + sw, H * .85); c.closePath(); c.fill(); }
  c.restore();
  const p1 = camX * s * .07;
  for (let i = 0; i < 7; i++) { const R = seed(300 + i), bx = ((i * 130 + R() * 60 - p1) % (W + 160) + W + 160) % (W + 160) - 80, by = H * (.16 + R() * .32) + Math.sin(t * .8 + i * 2) * 12; jellyDot(c, bx, by, 7 + R() * 7, i % 3 === 0 ? '#FF8FD8' : i % 3 === 1 ? '#7FF0FF' : '#C9A0FF', t + i); }
  /* cave ceiling: two layers of stalactites */
  const ceil = (p, col, depth, st, sd) => { const i0 = Math.floor(p / st) - 1; c.fillStyle = col; c.beginPath(); c.moveTo(-st, -2); for (let i = i0; i < i0 + W / st + 3; i++) { const R = seed(sd + i * 13), sx = i * st - p; c.lineTo(sx, H * .03 + R() * H * .03); c.lineTo(sx + st * (.35 + R() * .3), H * .04 + depth * (.4 + R() * .8)); } c.lineTo(W + st, -2); c.closePath(); c.fill(); };
  ceil(camX * s * .08, '#0A2944', H * .1, 46, 900);
  ceil(camX * s * .2, '#061527', H * .07, 30, 950);
  /* far rocks with sea arches */
  const p2 = camX * s * .15;
  c.fillStyle = '#0E3550'; c.beginPath(); c.moveTo(0, gy); for (let x = 0; x <= W + 20; x += 20) { const wx = x + p2; c.lineTo(x, gy - 130 * s - Math.sin(wx / 120) * 34 * s - Math.abs(Math.sin(wx / 47)) * 20 * s); } c.lineTo(W, gy); c.closePath(); c.fill();
  for (let i = 0; i < 3; i++) { const sx = ((i * 760 + 260 - p2) % 2280 + 2280) % 2280 - 200; if (sx > -160 && sx < W + 160) { c.strokeStyle = '#0A2A40'; c.lineWidth = 22 * s; c.beginPath(); c.arc(sx, gy - 110 * s, 70 * s, Math.PI, 0); c.stroke(); } }
  /* mid layer: coral fans and kelp */
  const p3 = camX * s * .4, tile = 300 * s, i0 = Math.floor(p3 / tile) - 1;
  for (let i = i0; i < i0 + Math.ceil(W / tile) + 3; i++) {
    const R = seed(2000 + i * 7), sx = i * tile - p3 + R() * 80 * s;
    c.save(); c.globalAlpha = .8;
    if (((i % 3) + 3) % 3 === 0) for (let k = 0; k < 4; k++) kelp(c, sx + k * 14 * s, gy, (90 + R() * 70) * s, t, k % 2 ? '#1F8A7A' : '#2AA08A');
    else coralFan(c, sx, gy, s * (1 + R() * .4), ['#D85F8A', '#E0844A', '#9A6AD8'][Math.floor(R() * 3)], R);
    c.restore();
  }
  /* water below the path, seen through the gaps */
  const wy = gy + 110 * s, wg = c.createLinearGradient(0, wy, 0, Math.max(wy + 1, H)); wg.addColorStop(0, 'rgba(60,210,220,.55)'); wg.addColorStop(1, 'rgba(6,30,60,.95)'); c.fillStyle = wg; c.fillRect(0, wy, W, H - wy);
  c.strokeStyle = 'rgba(190,255,250,.55)'; c.lineWidth = 2; for (let i = 0; i < 9; i++) { const x = ((i * 61 + t * 30 - camX * s * .6) % (W + 60) + W + 60) % (W + 60) - 30, yy = wy + 6 + (i % 3) * 10; c.beginPath(); c.moveTo(x, yy); c.lineTo(x + 24, yy); c.stroke(); }
  const mg = c.createLinearGradient(0, gy - 90 * s, 0, gy); mg.addColorStop(0, 'rgba(120,240,230,0)'); mg.addColorStop(1, 'rgba(120,240,230,.18)'); c.fillStyle = mg; c.fillRect(0, gy - 90 * s, W, 90 * s);
}

/* ---------- Ember Peak backdrop: a smoking volcano, dark ridges with lava cracks, torii on rock pillars, lava below ---------- */
function peakBg(c, W, H, camX, gy, s, t) {
  K.skyGradient(c, W, H, '#1C0A2A', '#521636', '#A83A3A', '#FF8A4A');
  K.stars(c, W, H * .5, t, 30, 12);
  const p1 = camX * s * .04, vx = ((W * .68 - p1) % (W + 600) + W + 600) % (W + 600) - 300, vb = gy - 40 * s, vt = gy - 300 * s;
  for (let i = 0; i < 6; i++) { const k = ((t * .12 + i / 6) % 1); c.fillStyle = `rgba(60,30,50,${.5 * (1 - k)})`; c.beginPath(); c.arc(vx + Math.sin(i * 2 + t * .3) * 20 * s + k * 60 * s, vt - k * 160 * s, (14 + k * 40) * s, 0, TAU); c.fill(); }
  c.fillStyle = '#4A1C2C'; c.beginPath(); c.moveTo(vx - 300 * s, vb); c.quadraticCurveTo(vx - 90 * s, vt + 60 * s, vx - 46 * s, vt); c.lineTo(vx + 46 * s, vt); c.quadraticCurveTo(vx + 90 * s, vt + 60 * s, vx + 300 * s, vb); c.closePath(); c.fill();
  c.save(); c.shadowColor = '#FF6A2A'; c.shadowBlur = 30; c.fillStyle = '#FF7A3A'; c.beginPath(); c.ellipse(vx, vt, 46 * s, 9 * s, 0, 0, TAU); c.fill();
  c.strokeStyle = 'rgba(255,120,50,.85)'; c.lineWidth = 4 * s; for (const [dx, len] of [[-20, 120], [14, 170], [30, 90]]) { c.beginPath(); c.moveTo(vx + dx * s, vt + 4 * s); c.quadraticCurveTo(vx + dx * 2.2 * s, vt + len * .5 * s, vx + dx * 3 * s, vt + len * s); c.stroke(); } c.restore();
  const p2 = camX * s * .15;
  c.fillStyle = '#3A1428'; c.beginPath(); c.moveTo(0, gy); for (let x = 0; x <= W + 20; x += 20) { const wx = x + p2; c.lineTo(x, gy - 120 * s - Math.abs(Math.sin(wx / 90)) * 50 * s - Math.sin(wx / 37) * 10 * s); } c.lineTo(W, gy); c.closePath(); c.fill();
  c.save(); c.strokeStyle = 'rgba(255,110,50,.6)'; c.shadowColor = '#FF6A2A'; c.shadowBlur = 10; c.lineWidth = 2.5 * s;
  for (let i = 0; i < 4; i++) { const sx = ((i * 520 + 140 - p2) % 2080 + 2080) % 2080 - 200; if (sx > -100 && sx < W + 100) { c.beginPath(); c.moveTo(sx, gy - 100 * s); c.lineTo(sx + 12 * s, gy - 60 * s); c.lineTo(sx - 6 * s, gy - 30 * s); c.lineTo(sx + 8 * s, gy); c.stroke(); } }
  c.restore();
  const p3 = camX * s * .4, tile = 320 * s, i0 = Math.floor(p3 / tile) - 1;
  for (let i = i0; i < i0 + Math.ceil(W / tile) + 3; i++) {
    const R = seed(3000 + i * 7), sx = i * tile - p3 + R() * 80 * s;
    c.save(); c.globalAlpha = .85;
    if (((i % 4) + 4) % 4 === 1) { const ph = (90 + R() * 50) * s; c.fillStyle = '#2E1422'; c.beginPath(); c.moveTo(sx - 34 * s, gy); c.lineTo(sx - 24 * s, gy - ph); c.lineTo(sx + 26 * s, gy - ph); c.lineTo(sx + 36 * s, gy); c.closePath(); c.fill(); torii(c, sx, gy - ph, s * .55, '#D8452E'); }
    else { pine(c, sx, gy, s * (.9 + R() * .4), '#2A1220'); pine(c, sx + 40 * s, gy, s * (.6 + R() * .3), '#341826'); }
    c.restore();
  }
  const ly = gy + 110 * s, lg = c.createLinearGradient(0, ly, 0, Math.max(ly + 1, H)); lg.addColorStop(0, 'rgba(255,120,40,.9)'); lg.addColorStop(.3, 'rgba(220,60,30,.95)'); lg.addColorStop(1, '#5A0E10'); c.fillStyle = lg; c.fillRect(0, ly, W, H - ly);
  c.save(); c.shadowColor = '#FFB347'; c.shadowBlur = 12; c.fillStyle = 'rgba(255,220,120,.85)'; for (let i = 0; i < 8; i++) { const x = ((i * 73 + t * 14 - camX * s * .6) % (W + 60) + W + 60) % (W + 60) - 30; c.beginPath(); c.ellipse(x, ly + 10 + (i % 3) * 12, 16, 3, 0, 0, TAU); c.fill(); } c.restore();
  const mg = c.createLinearGradient(0, gy - 90 * s, 0, gy); mg.addColorStop(0, 'rgba(255,120,60,0)'); mg.addColorStop(1, 'rgba(255,120,60,.18)'); c.fillStyle = mg; c.fillRect(0, gy - 90 * s, W, 90 * s);
}

/* ---------- ground for the grotto (mossy sea rock, shells) and the peak (dark rock, ash, glowing cracks) ---------- */
function groundIsle(c, x, y, w, h, s, kind, isle) {
  const T = isle === 1 ? {b0:'#1E4A6E', b1:'#081A30', p0:'#2E5E80', p1:'#163A5A', top:'#2FBFA8', hi:'#7FF0D8', dot:['rgba(127,240,255,.8)', 'rgba(255,143,216,.8)']}
    : {b0:'#3A1E2A', b1:'#120610', p0:'#3E2A32', p1:'#1E1218', top:'#5E4E56', hi:'#8A7A80', dot:['rgba(255,138,61,.9)', 'rgba(255,226,122,.8)']};
  const R = seed(Math.round(x / 7) + 5 + isle * 101);
  if (kind === 'plat') {
    const g = c.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, T.p0); g.addColorStop(1, T.p1); c.fillStyle = g; E.rr(c, x, y, w, h, 8 * s); c.fill(); c.strokeStyle = LINE; c.lineWidth = 2; c.stroke();
    if (isle === 2) { c.save(); c.shadowColor = '#FF6A2A'; c.shadowBlur = 12; c.fillStyle = 'rgba(255,120,50,.7)'; c.fillRect(x + 8, y + h - 4, w - 16, 3); c.restore(); }
    c.fillStyle = T.top; E.rr(c, x - 2 * s, y - 4 * s, w + 4 * s, 10 * s, 5 * s); c.fill(); c.stroke();
    if (isle === 1) { let n = 0; for (let i = 10; i < w - 8; i += 26 * s) { c.fillStyle = n++ % 2 ? '#FF7FA8' : '#FFB36A'; c.beginPath(); c.arc(x + i, y - 5, 3.2 * s, Math.PI, 0); c.fill(); } }
    else { c.fillStyle = T.dot[0]; for (let i = 10; i < w - 8; i += 30 * s) { c.beginPath(); c.arc(x + i + R() * 8, y - 1, 1.6 * s, 0, TAU); c.fill(); } }
    return;
  }
  const g = c.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, T.b0); g.addColorStop(1, T.b1); c.fillStyle = g; c.fillRect(x, y, w, h);
  c.strokeStyle = LINE; c.lineWidth = 2; c.strokeRect(x, y, w, h + 40);
  if (isle === 2) {
    c.save(); c.shadowColor = '#FF6A2A'; c.shadowBlur = 10; c.strokeStyle = 'rgba(255,120,50,.85)'; c.lineWidth = 2.2;
    for (let i = 40; i < w - 20; i += 110 * s) { let cx = x + i + R() * 40, cy = y + 24 * s; c.beginPath(); c.moveTo(cx, cy); for (let k = 0; k < 4; k++) { cx += (R() - .5) * 26 * s; cy += (16 + R() * 18) * s; c.lineTo(cx, cy); } c.stroke(); }
    c.restore();
  }
  c.fillStyle = T.top; c.fillRect(x, y - 2, w, 12 * s); c.fillStyle = T.hi; c.fillRect(x, y - 2, w, 4 * s);
  c.strokeStyle = LINE; c.beginPath(); c.moveTo(x, y - 2); c.lineTo(x + w, y - 2); c.stroke();
  if (isle === 1) {
    for (let i = 8; i < w - 6; i += 34 * s) { const sx = x + i + R() * 10; c.fillStyle = '#1F8A7A'; c.beginPath(); c.moveTo(sx - 3, y); c.quadraticCurveTo(sx - 6, y - 10 * s, sx - 2, y - 16 * s); c.quadraticCurveTo(sx + 1, y - 8 * s, sx + 3, y); c.fill(); if (R() < .3) { c.fillStyle = R() < .5 ? '#FFC6DD' : '#FFF1C2'; c.beginPath(); c.arc(sx + 10, y + 4 * s, 3.4 * s, Math.PI, 0); c.fill(); } }
  } else {
    c.fillStyle = 'rgba(255,138,61,.85)'; for (let i = 6; i < w - 4; i += 22 * s) { if (R() < .45) { c.beginPath(); c.arc(x + i + R() * 8, y + 2 + R() * 5 * s, 1.6 * s, 0, TAU); c.fill(); } }
  }
  c.save(); c.shadowColor = T.dot[0]; c.shadowBlur = 10; let n = 0; for (let i = 30; i < w; i += 90 * s) { const cx = x + i + R() * 40, cy = y + 30 * s + R() * Math.min(h - 40, 80) * s; c.fillStyle = T.dot[n++ % 2]; c.beginPath(); c.moveTo(cx, cy - 8 * s); c.lineTo(cx + 4 * s, cy); c.lineTo(cx, cy + 3 * s); c.lineTo(cx - 4 * s, cy); c.closePath(); c.fill(); } c.restore();
}

/* floating things over the whole scene: petals (Blossom Isle), bubbles (Tide Grotto), embers and ash (Ember Peak) */
K.drift = function (c, W, H, t, n = 18, isle = 0) {
  if (isle === 1) { const R = seed(78); c.lineWidth = 1.2; for (let i = 0; i < n; i++) { const r = 2 + R() * 4, sp = 20 + R() * 30, x = ((R() * W + Math.sin(t * 1.5 + i) * 10) % W + W) % W, y = H - ((R() * H + t * sp) % (H + 20)) + 10; c.strokeStyle = 'rgba(200,255,250,.6)'; c.beginPath(); c.arc(x, y, r, 0, TAU); c.stroke(); c.fillStyle = 'rgba(255,255,255,.5)'; c.beginPath(); c.arc(x - r * .35, y - r * .35, r * .25, 0, TAU); c.fill(); } return; }
  if (isle === 2) { const R = seed(79); c.save(); c.shadowColor = '#FF8A3D'; c.shadowBlur = 6; for (let i = 0; i < n; i++) { const sp = 24 + R() * 40, x = ((R() * W + Math.sin(t * .8 + i) * 20 - t * 8) % W + W) % W, y = H - ((R() * H + t * sp) % (H + 20)) + 10, f = .5 + .5 * Math.sin(t * 6 + i); c.fillStyle = i % 3 ? `rgba(255,${(140 + f * 80) | 0},60,${(.6 + f * .3).toFixed(2)})` : 'rgba(170,160,170,.5)'; c.beginPath(); c.arc(x, y, i % 3 ? 1.8 + f : 2.4, 0, TAU); c.fill(); } c.restore(); return; }
  K.petals(c, W, H, t, n);
};
/* a glowing spirit stepping stone (shown over a long gap until you learn dash) */
K.stepStone = function (c, x, y, w, t) {
  c.save(); c.shadowColor = '#7FF0FF'; c.shadowBlur = 16 + Math.sin(t * 3) * 6;
  c.fillStyle = 'rgba(120,220,255,.55)'; E.rr(c, x, y, w, 22, 10); c.fill(); c.restore();
  c.strokeStyle = 'rgba(220,255,255,.9)'; c.lineWidth = 2; E.rr(c, x, y, w, 22, 10); c.stroke();
  c.fillStyle = '#FFFFFF'; E.starPath(c, x + w / 2, y + 11, 6, 2.6, 4); c.fill();
};
/* the glide wing: a glowing spirit leaf the hero holds while floating down */
K.glider = function (c, x, y, s, t, col = '#7FF0FF') {
  c.save(); c.translate(x, y + Math.sin(t * 5) * 2); c.scale(s, s);
  c.shadowColor = col; c.shadowBlur = 16;
  const g = c.createLinearGradient(-50, 0, 50, 0); g.addColorStop(0, 'rgba(255,255,255,.85)'); g.addColorStop(.5, col); g.addColorStop(1, 'rgba(255,255,255,.85)');
  c.fillStyle = g; c.beginPath(); c.moveTo(-52, 14); c.quadraticCurveTo(-30, -16, 0, -14); c.quadraticCurveTo(30, -16, 52, 14); c.quadraticCurveTo(26, 2, 0, 4); c.quadraticCurveTo(-26, 2, -52, 14); c.fill();
  c.shadowBlur = 0; c.strokeStyle = LINE; c.lineWidth = 2; c.stroke();
  c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = 1.4; c.beginPath(); c.moveTo(-30, 8); c.lineTo(-6, 48); c.moveTo(30, 8); c.lineTo(6, 48); c.stroke();
  c.restore();
};

/* ---------- gates and lit-up props per island ---------- */
function seaArch(c, t) {
  c.fillStyle = '#2A5A7A'; c.strokeStyle = LINE; c.lineWidth = 2.4;
  c.beginPath(); c.moveTo(-62, 0); c.lineTo(-56, -96); c.quadraticCurveTo(-50, -142, 0, -144); c.quadraticCurveTo(50, -142, 56, -96); c.lineTo(62, 0); c.lineTo(42, 0); c.lineTo(40, -96); c.quadraticCurveTo(36, -122, 0, -124); c.quadraticCurveTo(-36, -122, -40, -96); c.lineTo(-42, 0); c.closePath(); c.fill(); c.stroke();
  c.fillStyle = '#3E7A9A'; c.beginPath(); c.moveTo(-56, -96); c.quadraticCurveTo(-50, -138, 0, -140); c.lineTo(0, -130); c.quadraticCurveTo(-42, -128, -48, -96); c.closePath(); c.fill();
  c.fillStyle = '#1F8A7A'; for (const [x, y] of [[-58, -30], [56, -60], [-50, -80]]) { c.beginPath(); c.ellipse(x, y, 7, 4, .4, 0, TAU); c.fill(); }
  c.fillStyle = '#FF9A5A'; E.starPath(c, 46, -40, 10, 4.4, 5); c.fill(); c.lineWidth = 1.6; c.stroke();
  blossom(c, -46, -120, 9, '#FF7FA8', '#FFE27A');
  c.fillStyle = '#FFF1C2'; c.beginPath(); c.arc(20, -136, 6, Math.PI, 0); c.fill(); c.stroke();
}
K.jelly = function (c, x, y, s, lit, t) {
  c.save(); c.translate(x, y); c.scale(s, s);
  c.lineCap = 'round';
  const stand = () => { c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(-6, -30, 0, -58); c.moveTo(-2, -30); c.quadraticCurveTo(-16, -40, -18, -52); c.moveTo(1, -40); c.quadraticCurveTo(12, -46, 14, -56); };
  c.strokeStyle = LINE; c.lineWidth = 7; stand(); c.stroke(); c.strokeStyle = lit ? '#FF7FA8' : '#6A5A7A'; c.lineWidth = 4; stand(); c.stroke();
  const cy = -96 + Math.sin(t * 2 + x * .01) * 4, col = lit ? '#FF8FD8' : '#7A7A9A';
  c.strokeStyle = lit ? 'rgba(255,190,240,.9)' : 'rgba(150,150,180,.7)'; c.lineWidth = 2.4;
  for (let i = 0; i < 4; i++) { const tx = -12 + i * 8; c.beginPath(); c.moveTo(tx, cy + 2); c.quadraticCurveTo(tx + Math.sin(t * 3 + i) * 5, cy + 16, tx + Math.sin(t * 2.4 + i) * 4, cy + 30); c.stroke(); }
  const dome = () => { c.beginPath(); c.moveTo(-20, cy); c.bezierCurveTo(-20, cy - 26, 20, cy - 26, 20, cy); c.quadraticCurveTo(10, cy + 5, 0, cy + 2); c.quadraticCurveTo(-10, cy + 5, -20, cy); c.closePath(); };
  if (lit) { c.save(); c.shadowColor = '#FF8FD8'; c.shadowBlur = 26 + Math.sin(t * 5) * 6; }
  dome(); c.fillStyle = col; c.fill();
  if (lit) c.restore();
  c.strokeStyle = LINE; c.lineWidth = 2; dome(); c.stroke();
  c.fillStyle = 'rgba(255,255,255,.6)'; c.beginPath(); c.ellipse(-7, cy - 13, 5, 3, -.4, 0, TAU); c.fill();
  if (lit) { c.fillStyle = LINE; for (const ex of [-6, 6]) { c.beginPath(); c.arc(ex, cy - 7, 2.2, 0, TAU); c.fill(); } }
  else { c.strokeStyle = LINE; c.lineWidth = 1.8; c.beginPath(); c.moveTo(-9, cy - 7); c.lineTo(-3, cy - 7); c.moveTo(3, cy - 7); c.lineTo(9, cy - 7); c.stroke(); }
  c.restore();
};
K.firebowl = function (c, x, y, s, lit, t) {
  c.save(); c.translate(x, y); c.scale(s, s);
  c.fillStyle = '#4A3A44'; c.strokeStyle = LINE; c.lineWidth = 2.4;
  c.fillRect(-16, -8, 32, 8); c.strokeRect(-16, -8, 32, 8);
  c.fillRect(-8, -64, 16, 56); c.strokeRect(-8, -64, 16, 56);
  c.beginPath(); c.moveTo(-26, -76); c.quadraticCurveTo(0, -56, 26, -76); c.lineTo(22, -64); c.quadraticCurveTo(0, -52, -22, -64); c.closePath(); c.fillStyle = '#5A4650'; c.fill(); c.stroke();
  c.fillStyle = '#2A1E24'; c.beginPath(); c.ellipse(0, -76, 26, 6, 0, 0, TAU); c.fill(); c.stroke();
  if (lit) flameShape(c, 0, -76, 1, t, ['#FF6A2A', '#FFB347', '#FFF1C2']);
  else { c.fillStyle = 'rgba(160,150,170,.35)'; for (let i = 0; i < 3; i++) { const k = (t * .5 + i / 3) % 1; c.beginPath(); c.arc(Math.sin(t + i) * 4, -82 - k * 34, 4 + k * 6, 0, TAU); c.fill(); } }
  c.restore();
};
K.litProp = (c, isle, x, y, s, lit, t) => isle === 1 ? K.jelly(c, x, y, s, lit, t) : isle === 2 ? K.firebowl(c, x, y, s, lit, t) : K.lantern(c, x, y, s, lit, t);

/* ---------- quest goal props ---------- */
/* the giant clam with the grotto pearl. k: 0 closed, 1 open */
K.pearl = function (c, x, y, s, t, k) {
  c.save(); c.translate(x, y); c.scale(s, s);
  c.strokeStyle = LINE; c.lineWidth = 2.4;
  c.fillStyle = '#1E4A6E'; c.beginPath(); c.ellipse(0, 0, 104, 16, 0, Math.PI, TAU); c.fill(); c.stroke();
  const shellCol = mixHex('#4A3A6A', '#F2A6D0', k), shellS = mixHex('#2E2448', '#C77BB8', k);
  const ridges = (y0, dir) => { c.strokeStyle = shellS; c.lineWidth = 2; for (let i = 1; i < 8; i++) { const a = Math.PI * i / 8; c.beginPath(); c.moveTo(0, y0); c.lineTo(-Math.cos(a) * 74, y0 + dir * Math.sin(a) * 34); c.stroke(); } };
  c.beginPath(); c.ellipse(0, -24, 80, 24, 0, 0, Math.PI); c.closePath(); c.fillStyle = shellCol; c.fill(); ridges(-24, 1); c.strokeStyle = LINE; c.lineWidth = 2.4; c.beginPath(); c.ellipse(0, -24, 80, 24, 0, 0, Math.PI); c.closePath(); c.stroke();
  /* the pearl */
  c.save(); if (k > 0) { c.shadowColor = '#FFFFFF'; c.shadowBlur = 30 * k + Math.sin(t * 4) * 6; }
  const pg = c.createRadialGradient(-6, -42, 2, 0, -36, 22); pg.addColorStop(0, '#FFFFFF'); pg.addColorStop(1, k > 0 ? '#F9D8F0' : '#4A3A6A'); c.fillStyle = pg; c.beginPath(); c.arc(0, -36, 18, 0, TAU); c.fill(); c.restore();
  c.strokeStyle = LINE; c.lineWidth = 2; c.beginPath(); c.arc(0, -36, 18, 0, TAU); c.stroke();
  /* the lid, hinged at the back */
  c.save(); c.translate(-78, -24); c.rotate(-k * 1.05); c.translate(78, 24);
  c.beginPath(); c.ellipse(0, -24, 80, 40, 0, Math.PI, TAU); c.closePath(); c.fillStyle = shellCol; c.fill(); ridges(-24, -1.2); c.strokeStyle = LINE; c.lineWidth = 2.4; c.beginPath(); c.ellipse(0, -24, 80, 40, 0, Math.PI, TAU); c.closePath(); c.stroke();
  c.restore();
  if (k < 1) { c.save(); c.globalAlpha = (1 - k) * .7; c.shadowColor = '#B04CFF'; c.shadowBlur = 16; c.fillStyle = 'rgba(80,30,120,.55)'; for (let i = 0; i < 5; i++) { c.beginPath(); c.arc(-60 + i * 30 + Math.sin(t * 2 + i) * 6, -60 - ((t * 20 + i * 14) % 40), 9 + (i % 2) * 5, 0, TAU); c.fill(); } c.restore(); }
  c.restore();
};
/* the coral garden's big coral. k: 0 covered in shadow ink, 1 blooming with fish */
K.coral = function (c, x, y, s, t, k) {
  c.save(); c.translate(x, y); c.scale(s, s);
  c.fillStyle = '#1E4A6E'; c.strokeStyle = LINE; c.lineWidth = 2.4; c.beginPath(); c.ellipse(0, 0, 96, 18, 0, Math.PI, TAU); c.fill(); c.stroke();
  const cols = ['#FF7FA8', '#FF9A5A', '#C27BFF', '#FFD27A'];
  for (let j = 0; j < 4; j++) { const R = seed(55 + j * 9); coralFan(c, -66 + j * 44, -6, 1.5 - (j % 2) * .3, mixHex('#4A4660', cols[j], k), R, true); }
  if (k < 1) { c.save(); c.globalAlpha = (1 - k) * .8; c.fillStyle = 'rgba(30,10,50,.75)'; for (let i = 0; i < 7; i++) { c.beginPath(); c.arc(-70 + i * 24, -70 - Math.sin(i * 1.7) * 30, 18 + (i % 3) * 6, 0, TAU); c.fill(); } c.restore(); }
  if (k > .4) for (let i = 0; i < 4; i++) { const a = t * 1.3 + i * TAU / 4, fx = Math.cos(a) * 90, fy = -90 + Math.sin(a) * 30; c.save(); c.translate(fx, fy); c.scale(Math.sin(a) > 0 ? -1 : 1, 1); c.globalAlpha = Math.min(1, (k - .4) * 3); c.fillStyle = i % 2 ? '#FF9A3D' : '#FFE27A'; c.beginPath(); c.ellipse(0, 0, 9, 5, 0, 0, TAU); c.fill(); c.beginPath(); c.moveTo(7, 0); c.lineTo(14, -5); c.lineTo(14, 5); c.closePath(); c.fill(); c.fillStyle = LINE; c.beginPath(); c.arc(-4, -1, 1.4, 0, TAU); c.fill(); c.restore(); }
  c.restore();
};
/* the giant sea turtle, wrapped in shadow vines until it's free */
K.turtle = function (c, x, y, s, t, free) {
  c.save(); c.translate(x, y + (free ? Math.sin(t * 2) * 4 - 8 : 0)); c.scale(s, s);
  const ink = (w = 2.6) => { c.strokeStyle = LINE; c.lineWidth = w; c.lineJoin = 'round'; };
  const fl = free ? Math.sin(t * 3) * .25 : 0;
  c.fillStyle = '#4FA88A';
  c.beginPath(); c.ellipse(-78, -12, 34, 12, .5 - fl, 0, TAU); c.fill(); ink(); c.stroke();
  c.beginPath(); c.ellipse(-30, -8, 30, 11, .3 + fl, 0, TAU); c.fill(); c.stroke();
  /* head */
  c.save(); c.translate(104, -46); c.rotate(free ? Math.sin(t * 1.5) * .08 : .15);
  c.beginPath(); c.ellipse(0, 0, 32, 24, -.2, 0, TAU); c.fillStyle = '#6CC4A0'; c.fill(); ink(); c.stroke();
  c.fillStyle = '#4FA88A'; for (const [px, py] of [[-6, -12], [8, -14], [0, 2]]) { c.beginPath(); c.arc(px, py, 4, 0, TAU); c.fill(); }
  if (free) { c.fillStyle = LINE; c.beginPath(); c.ellipse(14, -6, 4, 5.5, 0, 0, TAU); c.fill(); c.fillStyle = '#FFFFFF'; c.beginPath(); c.arc(12.5, -8, 1.6, 0, TAU); c.fill(); ink(2); c.beginPath(); c.moveTo(16, 8); c.quadraticCurveTo(24, 13, 30, 6); c.stroke(); }
  else { ink(2); c.beginPath(); c.moveTo(8, -6); c.quadraticCurveTo(14, -2, 20, -6); c.stroke(); c.fillStyle = '#7FD8FF'; c.beginPath(); c.ellipse(22, 0, 2.4, 3.6, 0, 0, TAU); c.fill(); }
  c.restore();
  /* shell */
  c.beginPath(); c.moveTo(-104, -18); c.quadraticCurveTo(-96, -128, 0, -132); c.quadraticCurveTo(96, -128, 104, -18); c.closePath(); c.fillStyle = '#3F8F6A'; c.fill(); ink(); c.stroke();
  c.save(); c.clip(); c.fillStyle = '#2F7A5A'; c.fillRect(-110, -60, 220, 50);
  c.strokeStyle = '#2A6A50'; c.lineWidth = 3; c.fillStyle = '#5AB088';
  for (const [hx, hy, r] of [[0, -92, 26], [-52, -74, 22], [52, -74, 22], [-26, -46, 18], [26, -46, 18], [-80, -40, 14], [80, -40, 14]]) { c.beginPath(); for (let i = 0; i < 6; i++) { const a = i * TAU / 6 + Math.PI / 6; c.lineTo(hx + Math.cos(a) * r, hy + Math.sin(a) * r * .8); } c.closePath(); c.fill(); c.stroke(); }
  c.restore();
  c.fillStyle = '#E9D8A6'; c.beginPath(); c.moveTo(-106, -22); c.quadraticCurveTo(0, -8, 106, -22); c.lineTo(104, -12); c.quadraticCurveTo(0, 4, -104, -12); c.closePath(); c.fill(); ink(2); c.stroke();
  c.fillStyle = '#6CC4A0'; c.beginPath(); c.ellipse(64, -6, 42, 13, -.4 + fl, 0, TAU); c.fill(); ink(); c.stroke();
  if (!free) {
    c.save(); c.shadowColor = '#B04CFF'; c.shadowBlur = 14; c.strokeStyle = '#3A1E56'; c.lineWidth = 9; c.lineCap = 'round';
    for (const [a, b2, d] of [[-110, -40, 110], [-90, -120, 80], [30, -140, 120]]) { c.beginPath(); c.moveTo(a, b2); c.bezierCurveTo(a + d * .4, b2 + 60, a + d * .7, b2 - 30, a + d * 1.6, b2 + 40); c.stroke(); }
    c.restore();
    c.fillStyle = '#FF6FD8'; for (let i = 0; i < 6; i++) { c.beginPath(); c.arc(-80 + i * 34, -50 - (i % 2) * 40, 3, 0, TAU); c.fill(); }
  }
  c.restore();
};
/* the hot spring. k: 0 grey ash, 1 warm blue water with steam */
K.spring = function (c, x, y, s, t, k) {
  c.save(); c.translate(x, y); c.scale(s, s);
  c.strokeStyle = LINE; c.lineWidth = 2.4;
  const rock = (rx, ry, r, col) => { c.fillStyle = col; c.beginPath(); c.ellipse(rx, ry, r, r * .7, 0, 0, TAU); c.fill(); c.stroke(); };
  for (let i = 0; i < 7; i++) rock(-96 + i * 32, -34 - Math.sin(i / 6 * Math.PI) * 10, 18 + (i % 2) * 4, '#5A4A52');
  const wg = c.createLinearGradient(0, -36, 0, 0); wg.addColorStop(0, mixHex('#6A6470', '#8FF0FF', k)); wg.addColorStop(1, mixHex('#4A4450', '#2FA8D8', k));
  c.fillStyle = wg; c.beginPath(); c.ellipse(0, -18, 100, 22, 0, 0, TAU); c.fill(); c.stroke();
  if (k > 0) { c.save(); c.globalAlpha = k * .7; c.strokeStyle = '#FFFFFF'; c.lineWidth = 2; for (let i = 0; i < 3; i++) { const r = (t * 30 + i * 20) % 60; c.beginPath(); c.ellipse(-20 + i * 24, -18, r, r * .2, 0, 0, TAU); c.stroke(); } c.restore(); }
  else { c.fillStyle = 'rgba(200,195,205,.8)'; for (let i = 0; i < 9; i++) { c.beginPath(); c.ellipse(-70 + i * 18, -18 + Math.sin(i * 2.3) * 7, 6, 2.5, i, 0, TAU); c.fill(); } }
  for (let i = 0; i < 6; i++) rock(-90 + i * 36, -2 + Math.sin(i / 5 * Math.PI) * 4, 16 + (i % 3) * 3, '#6A5A62');
  if (k > 0) {
    c.save(); c.globalAlpha = k * .55; c.fillStyle = '#FFFFFF';
    for (let i = 0; i < 6; i++) { const q = (t * .35 + i / 6) % 1; c.beginPath(); c.arc(-60 + i * 24 + Math.sin(t * 2 + i) * 10, -40 - q * 110, 8 + q * 16, 0, TAU); c.fill(); }
    c.restore();
    if (k > .7) K.spirit(c, 'ember', 1, 34, -34, .32, t, {glow:false});
  }
  c.restore();
};
/* the great taiko drum */
K.drum = function (c, x, y, s, t, hit) {
  c.save(); c.translate(x, y); c.scale(s, s);
  const sh = hit ? Math.sin(t * 40) * 2 * Math.max(0, 1 - (t * 1.4) % 1) : 0;
  c.lineCap = 'round';
  for (const [w, col] of [[11, LINE], [7, '#7A3A2A']]) { c.strokeStyle = col; c.lineWidth = w; c.beginPath(); c.moveTo(-60, 0); c.lineTo(40, -150); c.moveTo(60, 0); c.lineTo(-40, -150); c.moveTo(-70, 0); c.lineTo(70, 0); c.stroke(); }
  c.save(); c.translate(sh, -104);
  if (hit) { c.save(); c.globalAlpha = .6; c.strokeStyle = '#FFE27A'; c.lineWidth = 4; for (let i = 0; i < 2; i++) { const r = 70 + ((t * 80 + i * 40) % 80); c.globalAlpha = .6 * (1 - (r - 70) / 80); c.beginPath(); c.arc(0, 0, r, 0, TAU); c.stroke(); } c.restore(); c.shadowColor = '#FFE27A'; c.shadowBlur = 24; }
  else { c.shadowColor = '#B04CFF'; c.shadowBlur = 16; }
  c.fillStyle = hit ? '#B8452E' : '#5A2A3A'; c.beginPath(); c.arc(0, 0, 64, 0, TAU); c.fill(); c.shadowBlur = 0; c.strokeStyle = LINE; c.lineWidth = 2.6; c.stroke();
  c.fillStyle = hit ? '#F3E6D0' : '#8A7A8A'; c.beginPath(); c.arc(0, 0, 52, 0, TAU); c.fill(); c.stroke();
  c.fillStyle = '#E9B949'; for (let i = 0; i < 16; i++) { const a = i * TAU / 16; c.beginPath(); c.arc(Math.cos(a) * 58, Math.sin(a) * 58, 2.6, 0, TAU); c.fill(); }
  /* tomoe swirl */
  c.save(); c.rotate(hit ? t * 3 : 0); c.fillStyle = hit ? '#C8384A' : '#4A2A5A';
  for (let i = 0; i < 3; i++) { c.save(); c.rotate(i * TAU / 3); c.beginPath(); c.arc(0, -16, 10, 0, TAU); c.fill(); c.beginPath(); c.moveTo(10, -16); c.quadraticCurveTo(14, 4, -6, 14); c.quadraticCurveTo(4, 0, 0, -6); c.closePath(); c.fill(); c.restore(); }
  c.restore();
  c.restore();
  c.restore();
};
/* the sacred flame on its stone stand: a small shadow flame until it's lit */
K.flame = function (c, x, y, s, t, lit) {
  c.save(); c.translate(x, y); c.scale(s, s);
  c.fillStyle = '#5A4650'; c.strokeStyle = LINE; c.lineWidth = 2.6;
  c.beginPath(); c.moveTo(-54, 0); c.lineTo(-42, -22); c.lineTo(42, -22); c.lineTo(54, 0); c.closePath(); c.fill(); c.stroke();
  c.fillRect(-15, -92, 30, 70); c.strokeRect(-15, -92, 30, 70);
  c.fillStyle = '#4A3A44'; c.beginPath(); c.moveTo(-48, -92); c.lineTo(48, -92); c.lineTo(38, -106); c.lineTo(-38, -106); c.closePath(); c.fill(); c.stroke();
  c.fillStyle = '#2A1E24'; c.beginPath(); c.ellipse(0, -108, 40, 8, 0, 0, TAU); c.fill(); c.stroke();
  c.strokeStyle = '#E9D8A6'; c.lineWidth = 5; c.beginPath(); c.moveTo(-17, -70); c.quadraticCurveTo(0, -60, 17, -70); c.stroke();
  c.fillStyle = '#FFFFFF'; for (const px of [-8, 8]) { c.beginPath(); c.moveTo(px - 3, -64); c.lineTo(px + 3, -64); c.lineTo(px - 2, -56); c.lineTo(px + 3, -48); c.lineTo(px - 3, -48); c.closePath(); c.fill(); }
  if (lit) flameShape(c, 0, -110, 1.8, t, ['#FF6A2A', '#FFB347', '#FFF1C2']);
  else flameShape(c, 0, -110, .8, t, ['#5A1E7A', '#8A3AB0', '#C9A0FF']);
  c.restore();
};
/* Draws a quest's goal prop with its feet at (x, y). o: {done, k (0..1 after finishing), lit, isle} */
K.goal = function (c, kind, x, y, s, t, o = {}) {
  const d = !!o.done, k = o.k || 0;
  if (kind === 'cage') K.cage(c, x, y, s, t, d);
  else if (kind === 'lanterns' || kind === 'jellies' || kind === 'bowls') { const isle = kind === 'jellies' ? 1 : kind === 'bowls' ? 2 : 0; K.litProp(c, isle, x - 60 * s, y, 1.2 * s, o.lit, t); K.litProp(c, isle, x + 60 * s, y, 1.2 * s, o.lit, t); K.gate(c, x, y, 1.1 * s, t, 1, '', isle); }
  else if (kind === 'bell') K.bell(c, x, y, s, t, d);
  else if (kind === 'falls') K.falls(c, x + 50 * s, y, s, t, k);
  else if (kind === 'grove') { c.save(); c.globalAlpha = .9; K.gate(c, x, y, 1.3 * s, t, 1, ''); c.restore(); }
  else if (kind === 'lair') K.gate(c, x, y, 1.3 * s, t, 1, '', 1);
  else if (kind === 'summit') K.gate(c, x, y, 1.3 * s, t, 1, '', 2);
  else if (kind === 'pearl') K.pearl(c, x, y, s, t, k);
  else if (kind === 'coral') K.coral(c, x, y, s, t, k);
  else if (kind === 'turtle') K.turtle(c, x, y, s, t, d);
  else if (kind === 'spring') K.spring(c, x, y, s, t, k);
  else if (kind === 'drum') K.drum(c, x, y, s, t, d);
  else if (kind === 'flame') K.flame(c, x, y, s, t, d);
};

/* extra looks on the shadow creatures of the new islands (drawn in the shadow's own space) */
function shadowLook(c, look, P, t, k) {
  c.save(); c.lineCap = 'round'; c.lineJoin = 'round';
  if (look === 'jelly') { c.globalAlpha *= .75; c.strokeStyle = P.glow; for (let i = 0; i < 5; i++) { const x0 = -48 + i * 24; c.lineWidth = 8 - Math.abs(i - 2) * 1.5; c.beginPath(); c.moveTo(x0, 60); c.quadraticCurveTo(x0 + Math.sin(t * 3 + i) * 14, 100, x0 + Math.sin(t * 2 + i) * 10, 140 + (i % 2) * 14); c.stroke(); } }
  else if (look === 'coral') { for (const f of [-1, 1]) { const segs = [[f * 24, -76, f * 40, -122], [f * 33, -100, f * 60, -114], [f * 38, -116, f * 34, -146]]; for (const [w, col] of [[11, LINE], [7, '#D8457A']]) { c.strokeStyle = col; c.lineWidth = w; for (const [a, b2, x1, y1] of segs) { c.beginPath(); c.moveTo(a, b2); c.lineTo(x1, y1); c.stroke(); } } } }
  else if (look === 'steam') { c.fillStyle = 'rgba(235,245,255,.35)'; for (let i = 0; i < 5; i++) { const q = (t * .6 + i / 5) % 1; c.beginPath(); c.arc(-50 + i * 25 + Math.sin(t * 2 + i) * 8, -90 - q * 80, 12 + q * 14, 0, TAU); c.fill(); } }
  else if (look === 'ash') { c.fillStyle = 'rgba(190,180,190,.8)'; for (let i = 0; i < 9; i++) { const a = t * .9 + i * TAU / 9; c.save(); c.translate(Math.cos(a) * 118, Math.sin(a) * 70 - 10); c.rotate(a * 2); c.fillRect(-5, -3, 10, 6); c.restore(); } }
  else if (look === 'magma') { c.shadowColor = '#FF6A2A'; c.shadowBlur = 14; c.strokeStyle = '#FF9A3D'; c.lineWidth = 5; for (const [x0, y0] of [[-70, -40], [20, -70], [-30, 30], [50, 20]]) { c.beginPath(); c.moveTo(x0, y0); c.lineTo(x0 + 18, y0 + 14); c.lineTo(x0 + 8, y0 + 30); c.lineTo(x0 + 26, y0 + 44); c.stroke(); } }
  else if (look === 'thorn') { c.strokeStyle = '#3A2050'; c.lineWidth = 8; c.beginPath(); c.ellipse(0, 10, 112, 70, .1, 0, TAU); c.stroke(); c.fillStyle = '#FF6FD8'; for (let i = 0; i < 12; i++) { const a = i * TAU / 12 + t * .2, px = Math.cos(a) * 112, py = 10 + Math.sin(a) * 70; c.beginPath(); c.moveTo(px - 5, py); c.lineTo(px + Math.cos(a) * 16, py + Math.sin(a) * 16); c.lineTo(px + 5, py); c.closePath(); c.fill(); } }
  c.restore();
}

/* ---------- Umikaze, the Tide Dragon: a long koi-dragon. Hovers with its tail near (x, y); about 360 wide at k = 1. ---------- */
K.dragon = function (c, x, y, k, t = 0, pure = 0, o = {}) {
  c.save(); c.translate(x, y); c.scale(-k * (o.face || 1), k);
  if (o.hit) c.translate(Math.sin(t * 60) * 5, 0);
  const body = mixHex('#142A4A', '#EAFBFF', pure), belly = mixHex('#0A1630', '#BFEFFF', pure), fin = mixHex('#3A1E6A', '#46C8FF', pure), finS = mixHex('#1E0F3A', '#2F7BFF', pure), spot = mixHex('#7A2A9A', '#FF8A5A', pure);
  const lw = 3 / k * .6, ink = w => { c.strokeStyle = LINE; c.lineWidth = w || lw; c.lineJoin = 'round'; c.lineCap = 'round'; };
  const sw = o.charge ? 2.2 : 1, bob = Math.sin(t * 1.6) * 8;
  c.translate(0, bob);
  const ag = c.createRadialGradient(0, -170, 20, 0, -170, 270); ag.addColorStop(0, pure > .5 ? 'rgba(150,230,255,.35)' : 'rgba(120,60,220,.35)'); ag.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = ag; c.beginPath(); c.arc(0, -170, 270, 0, TAU); c.fill();
  /* water ring under it */
  c.save(); c.globalAlpha = .5; c.strokeStyle = pure > .5 ? '#BFF6FF' : '#7A5AC0'; c.lineWidth = 3; for (let i = 0; i < 2; i++) { const r = 60 + ((t * 30 + i * 30) % 60); c.beginPath(); c.ellipse(-110, -bob, r, r * .18, 0, 0, TAU); c.stroke(); } c.restore();
  /* the spine: tail at s = 0, neck at s = 1 */
  const N = 30, pts = [];
  for (let i = 0; i <= N; i++) { const s = i / N; pts.push({x:-160 + 270 * s, y:-46 - 236 * Math.pow(s, 1.35) + Math.sin(s * 6.5 - t * 2.2 * sw) * 36 * (1 - s * .7), r:8 + 40 * Math.sin(Math.min(1, s * 1.5) * Math.PI / 2) - 13 * s * s}); }
  pts.forEach((p, i) => { const a = pts[Math.max(0, i - 1)], b2 = pts[Math.min(N, i + 1)], dx = b2.x - a.x, dy = b2.y - a.y, d = Math.hypot(dx, dy) || 1; p.nx = dy / d; p.ny = -dx / d; p.ang = Math.atan2(dy, dx); });
  /* tail fin */
  const T0 = pts[0]; c.save(); c.translate(T0.x, T0.y); c.rotate(T0.ang + Math.sin(t * 3) * .2);
  c.beginPath(); c.moveTo(4, 0); c.quadraticCurveTo(-30, -50, -62, -46); c.quadraticCurveTo(-40, -14, -34, 0); c.quadraticCurveTo(-40, 14, -62, 46); c.quadraticCurveTo(-30, 50, 4, 0); c.closePath(); c.fillStyle = fin; c.fill(); ink(); c.stroke();
  c.strokeStyle = finS; c.lineWidth = 2; for (let i = -2; i <= 2; i++) { c.beginPath(); c.moveTo(0, 0); c.lineTo(-50, i * 18); c.stroke(); }
  c.restore();
  /* back pectoral fin */
  const PF = pts[Math.round(N * .74)];
  const pec = (dx, col, rot) => { c.save(); c.translate(PF.x + dx, PF.y + PF.r * .6); c.rotate(rot + Math.sin(t * 2.5) * .15); c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(10, 40, 50, 56); c.quadraticCurveTo(30, 30, 40, 6); c.closePath(); c.fillStyle = col; c.fill(); ink(); c.stroke(); c.restore(); };
  pec(-18, finS, .3);
  /* dorsal fins */
  for (let i = 4; i < N - 3; i += 4) { const p = pts[i], q = pts[i + 2], h = 16 + p.r * .5; c.beginPath(); c.moveTo(p.x + p.nx * p.r * .8, p.y + p.ny * p.r * .8); c.quadraticCurveTo(p.x + p.nx * (p.r + h) - Math.cos(p.ang) * 10, p.y + p.ny * (p.r + h) - Math.sin(p.ang) * 10, q.x + q.nx * (q.r + h * .9) - Math.cos(q.ang) * 18, q.y + q.ny * (q.r + h * .9) - Math.sin(q.ang) * 18); c.lineTo(q.x + q.nx * q.r * .8, q.y + q.ny * q.r * .8); c.closePath(); c.fillStyle = fin; c.fill(); ink(); c.stroke(); }
  /* body: outline, fill, belly, koi spots */
  c.fillStyle = LINE; for (const p of pts) { c.beginPath(); c.arc(p.x, p.y, p.r + lw * 1.3, 0, TAU); c.fill(); }
  c.fillStyle = body; for (const p of pts) { c.beginPath(); c.arc(p.x, p.y, p.r, 0, TAU); c.fill(); }
  c.fillStyle = belly; for (const p of pts) { c.beginPath(); c.arc(p.x - p.nx * p.r * .42, p.y - p.ny * p.r * .42, p.r * .5, 0, TAU); c.fill(); }
  c.fillStyle = spot; for (const s0 of [.3, .52, .68]) { const p = pts[Math.round(N * s0)]; c.beginPath(); c.ellipse(p.x + p.nx * p.r * .35, p.y + p.ny * p.r * .35, p.r * .55, p.r * .35, p.ang, 0, TAU); c.fill(); }
  c.strokeStyle = mixHex('#2A3A6A', '#9FDCF0', pure); c.lineWidth = 1.6; for (let i = 3; i < N - 2; i += 2) { const p = pts[i]; c.beginPath(); c.arc(p.x + p.nx * p.r * .2, p.y + p.ny * p.r * .2, p.r * .45, p.ang + Math.PI * .6, p.ang + Math.PI * 1.4); c.stroke(); }
  pec(6, fin, -.1);
  /* head */
  const HP = pts[N];
  c.save(); c.translate(HP.x, HP.y); c.rotate(HP.ang + .15); c.scale(1.35, 1.35);
  for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(-6, -10 + i * 10); c.quadraticCurveTo(-40, -30 + i * 16 + Math.sin(t * 3 + i) * 6, -58, -20 + i * 22); c.quadraticCurveTo(-36, -12 + i * 12, -6, 4 + i * 8); c.closePath(); c.fillStyle = i === 1 ? fin : finS; c.fill(); ink(); c.stroke(); }
  for (const [w, col] of [[9, LINE], [5.5, mixHex('#5A3A7A', '#FFE27A', pure)]]) { c.strokeStyle = col; c.lineWidth = w; c.lineCap = 'round'; c.beginPath(); c.moveTo(8, -24); c.quadraticCurveTo(-4, -56, -26, -74); c.moveTo(-2, -48); c.lineTo(-24, -50); c.moveTo(22, -24); c.quadraticCurveTo(18, -60, 4, -84); c.moveTo(14, -54); c.lineTo(30, -66); c.stroke(); }
  c.beginPath(); c.moveTo(-14, -22); c.quadraticCurveTo(22, -40, 54, -22); c.quadraticCurveTo(84, -14, 88, -2); c.quadraticCurveTo(86, 12, 64, 14); c.lineTo(30, 18); c.quadraticCurveTo(0, 30, -16, 18); c.closePath(); c.fillStyle = body; c.fill(); ink(); c.stroke();
  c.fillStyle = belly; c.beginPath(); c.moveTo(30, 10); c.quadraticCurveTo(60, 8, 84, 2); c.quadraticCurveTo(70, 14, 40, 18); c.closePath(); c.fill();
  ink(1.8); c.beginPath(); c.moveTo(86, 0); c.quadraticCurveTo(60, 8, 38, 8); c.stroke();
  c.fillStyle = LINE; c.beginPath(); c.arc(80, -8, 2.6, 0, TAU); c.fill();
  c.save(); c.shadowColor = pure > .5 ? '#46C8FF' : '#B04CFF'; c.shadowBlur = pure > .5 ? 6 : 20;
  if (pure > .5) { c.beginPath(); c.ellipse(30, -12, 8, 9, 0, 0, TAU); c.fillStyle = '#182462'; c.fill(); c.fillStyle = '#46C8FF'; c.beginPath(); c.ellipse(30, -10, 5, 5.5, 0, 0, TAU); c.fill(); c.fillStyle = '#FFF'; c.beginPath(); c.arc(27.5, -15, 2.6, 0, TAU); c.fill(); }
  else { c.beginPath(); c.moveTo(16, -10); c.quadraticCurveTo(30, -24, 44, -12); c.quadraticCurveTo(30, -6, 16, -10); c.fillStyle = '#C9A0FF'; c.fill(); }
  c.restore();
  c.strokeStyle = pure > .5 ? 'rgba(255,255,255,.9)' : 'rgba(150,110,210,.8)'; c.lineWidth = 3;
  for (const f of [0, 1]) { c.beginPath(); c.moveTo(78, 6 + f * 4); c.bezierCurveTo(60, 40 + f * 10, 20 + Math.sin(t * 2 + f) * 14, 30 + f * 20, -20, 56 + Math.sin(t * 2.4 + f) * 12 + f * 10); c.stroke(); }
  c.restore();
  if (pure < 1) { c.save(); c.globalAlpha = (1 - pure) * .7; for (let i = 0; i < 9; i++) { const a = t * .8 + i, sx = Math.sin(a * 1.3 + i) * 130, sy = -160 + Math.cos(a + i * 2) * 80 - ((t * 40 + i * 30) % 120); c.fillStyle = 'rgba(20,20,70,.55)'; c.beginPath(); c.arc(sx, sy, 18 + (i % 3) * 8, 0, TAU); c.fill(); } c.restore(); }
  if (o.flash) { c.globalCompositeOperation = 'source-atop'; c.fillStyle = `rgba(255,255,255,${o.flash})`; c.fillRect(-260, -460, 480, 500); }
  c.restore();
};

/* ---------- Homura, the Flame Fox: five fire tails. Feet at (x, y); about 340 wide at k = 1. ---------- */
K.fox = function (c, x, y, k, t = 0, pure = 0, o = {}) {
  c.save(); c.translate(x, y); c.scale(-k * (o.face || 1), k);
  if (o.hit) c.translate(Math.sin(t * 60) * 5, 0);
  const fur = mixHex('#2A0E1A', '#FFF1E0', pure), furS = mixHex('#170610', '#F4C9A0', pure), fA = mixHex('#5A1E7A', '#FF6A2A', pure), fB = mixHex('#B04CFF', '#FFE27A', pure), ear = mixHex('#7A2A9A', '#FF9A6A', pure);
  const lw = 3 / k * .6, ink = w => { c.strokeStyle = LINE; c.lineWidth = w || lw; c.lineJoin = 'round'; c.lineCap = 'round'; };
  const breathe = Math.sin(t * 2) * 3, step = o.charge ? Math.sin(t * 16) * .3 : 0;
  const ag = c.createRadialGradient(0, -150, 20, 0, -150, 260); ag.addColorStop(0, pure > .5 ? 'rgba(255,190,120,.4)' : 'rgba(176,76,255,.35)'); ag.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = ag; c.beginPath(); c.arc(0, -150, 260, 0, TAU); c.fill();
  /* five flame tails fanning up behind */
  for (let i = 4; i >= 0; i--) {
    c.save(); c.translate(-84, -140); c.rotate(.05 + i * .3 + Math.sin(t * 2 + i) * .08);
    const len = 150 + (i % 2) * 20, fl = Math.sin(t * 8 + i) * 6;
    c.beginPath(); c.moveTo(0, -16); c.bezierCurveTo(-len * .4, -46, -len * .8, -22, -len - fl, -60); c.bezierCurveTo(-len * .7, 4, -len * .4, 26, 0, 16); c.closePath();
    const g = c.createLinearGradient(0, 0, -len, -40); g.addColorStop(0, fur); g.addColorStop(.45, fA); g.addColorStop(1, fB); c.fillStyle = g;
    c.save(); c.shadowColor = fA; c.shadowBlur = 16; c.fill(); c.restore(); ink(); c.stroke();
    c.restore();
  }
  /* legs */
  const legs = [[-64, 1], [-40, -1], [56, -1], [80, 1]];
  for (const [lx, sg] of legs) { const a = sg * step; c.lineCap = 'round'; c.strokeStyle = LINE; c.lineWidth = 22; c.beginPath(); c.moveTo(lx, -110); c.lineTo(lx + Math.sin(a) * 30 - 4, -54); c.lineTo(lx + Math.sin(a) * 46, 0); c.stroke(); c.strokeStyle = sg > 0 ? fur : furS; c.lineWidth = 15; c.stroke(); c.fillStyle = mixHex('#120408', '#5A2A1A', pure); c.beginPath(); c.ellipse(lx + Math.sin(a) * 46 + 4, 0, 12, 7, 0, 0, TAU); c.fill(); }
  /* body */
  c.beginPath(); c.ellipse(0, -128 + breathe * .3, 96, 44, -.05, 0, TAU); c.fillStyle = fur; c.fill(); ink(); c.stroke();
  c.save(); c.clip(); c.fillStyle = furS; c.beginPath(); c.ellipse(0, -92, 100, 26, 0, 0, TAU); c.fill(); c.restore();
  /* flame markings on the back */
  for (let i = 0; i < 3; i++) flameShape(c, -40 + i * 34, -158 + Math.sin(i) * 4, .32, t + i, [fA, fB, mixHex('#E9C9FF', '#FFF1C2', pure)]);
  /* neck ruff of little flames */
  for (let i = 0; i < 6; i++) { const a = -1.2 + i * .42; flameShape(c, 92 + Math.cos(a) * 34, -170 + Math.sin(a) * 30, .34, t * 1.3 + i, [fA, fB, mixHex('#E9C9FF', '#FFF1C2', pure)]); }
  c.beginPath(); c.moveTo(60, -160); c.quadraticCurveTo(86, -210, 104, -226); c.lineTo(132, -206); c.quadraticCurveTo(110, -170, 96, -120); c.closePath(); c.fillStyle = fur; c.fill(); ink(); c.stroke();
  /* head */
  c.save(); c.translate(118, -238 + breathe);
  for (const [ex, tip] of [[-18, -34], [8, 14]]) { c.beginPath(); c.moveTo(ex - 12, -26); c.lineTo(ex + tip * .2 - 6, -96); c.lineTo(ex + 18, -28); c.closePath(); c.fillStyle = fur; c.fill(); ink(); c.stroke(); c.beginPath(); c.moveTo(ex - 4, -30); c.lineTo(ex + tip * .2 - 4, -80); c.lineTo(ex + 10, -32); c.closePath(); c.fillStyle = ear; c.fill(); }
  c.beginPath(); c.moveTo(-32, 8); c.quadraticCurveTo(-38, -32, 0, -36); c.quadraticCurveTo(32, -36, 46, -12); c.lineTo(74, 0); c.quadraticCurveTo(80, 10, 66, 15); c.quadraticCurveTo(32, 24, 2, 26); c.quadraticCurveTo(-28, 24, -32, 8); c.closePath(); c.fillStyle = fur; c.fill(); ink(); c.stroke();
  c.fillStyle = mixHex('#3A1424', '#FFFFFF', pure); c.beginPath(); c.moveTo(20, 12); c.quadraticCurveTo(50, 8, 72, 4); c.quadraticCurveTo(60, 18, 30, 22); c.closePath(); c.fill();
  c.fillStyle = LINE; c.beginPath(); c.ellipse(74, 4, 5, 4, 0, 0, TAU); c.fill();
  flameShape(c, 4, -24, .3, t, [fA, fB, '#FFF1C2']);
  c.save(); c.shadowColor = pure > .5 ? '#FF9A3D' : '#FF3D9A'; c.shadowBlur = pure > .5 ? 6 : 20;
  if (pure > .5) { c.beginPath(); c.ellipse(22, -10, 7, 9, 0, 0, TAU); c.fillStyle = '#3A1208'; c.fill(); c.fillStyle = '#FFB347'; c.beginPath(); c.ellipse(22, -7, 4.5, 5.5, 0, 0, TAU); c.fill(); c.fillStyle = '#FFF'; c.beginPath(); c.arc(19.5, -13, 2.4, 0, TAU); c.fill(); ink(2); c.beginPath(); c.moveTo(12, -18); c.quadraticCurveTo(22, -24, 32, -16); c.stroke(); }
  else { c.beginPath(); c.moveTo(8, -8); c.quadraticCurveTo(22, -22, 36, -10); c.quadraticCurveTo(22, -4, 8, -8); c.fillStyle = '#FF5FB0'; c.fill(); }
  c.restore();
  c.restore();
  if (pure < 1) { c.save(); c.globalAlpha = (1 - pure) * .7; for (let i = 0; i < 9; i++) { const a = t * .8 + i, sx = Math.sin(a * 1.3 + i) * 120, sy = -150 + Math.cos(a + i * 2) * 70 - ((t * 40 + i * 30) % 120); c.fillStyle = 'rgba(50,10,40,.55)'; c.beginPath(); c.arc(sx, sy, 18 + (i % 3) * 8, 0, TAU); c.fill(); } c.restore(); }
  if (o.flash) { c.globalCompositeOperation = 'source-atop'; c.fillStyle = `rgba(255,255,255,${o.flash})`; c.fillRect(-300, -400, 520, 420); }
  c.restore();
};
K.guardian = (c, kind, x, y, k, t, pure, o = {}) => kind === 'umikaze' ? K.dragon(c, x, y, k, t, pure, o) : kind === 'homura' ? K.fox(c, x, y, k, t, pure, o) : K.deer(c, x, y, k, t, pure, o);

/* ---------- battle backdrops for the grotto and the peak ---------- */
function battleGrotto(c, W, H, t, hz, boss) {
  if (boss) K.skyGradient(c, W, H, '#060A26', '#1A1450', '#2A4A8A', '#3FA8B8'); else K.skyGradient(c, W, H, '#03132A', '#0B3556', '#16707E', '#4FC4B8');
  c.save(); c.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 3; i++) { const x = W * (.2 + i * .3), sw = Math.sin(t * .4 + i) * 20; const g = c.createLinearGradient(0, 0, 0, hz); g.addColorStop(0, 'rgba(150,255,240,.1)'); g.addColorStop(1, 'rgba(150,255,240,0)'); c.fillStyle = g; c.beginPath(); c.moveTo(x - 14, 0); c.lineTo(x + 14, 0); c.lineTo(x + 70 + sw, hz); c.lineTo(x - 20 + sw, hz); c.closePath(); c.fill(); }
  c.restore();
  for (let i = 0; i < 5; i++) { const R = seed(400 + i * 977); R(); jellyDot(c, W * (.08 + R() * .84), H * (.1 + R() * .3) + Math.sin(t * .8 + i) * 10, 8 + R() * 8, i % 2 ? '#FF8FD8' : '#7FF0FF', t + i); }
  c.fillStyle = '#061527'; c.beginPath(); c.moveTo(0, 0); for (let i = 0; i <= 12; i++) { const R = seed(970 + i); c.lineTo(W * i / 12, H * .02); c.lineTo(W * (i + .5) / 12, H * (.05 + R() * .07)); } c.lineTo(W, 0); c.closePath(); c.fill();
  c.save(); c.globalAlpha = .8; coralFan(c, W * .08, hz, 1.5, '#D85F8A', seed(5)); coralFan(c, W * .93, hz + 6, 1.8, '#9A6AD8', seed(6)); for (let k = 0; k < 3; k++) kelp(c, W * .2 + k * 12, hz, 110 + k * 20, t, '#1F8A7A'); c.restore();
  c.fillStyle = '#0E3A55'; c.beginPath(); c.moveTo(0, hz); for (let x = 0; x <= W; x += 10) c.lineTo(x, hz - 8 - Math.sin(x / 40) * 6); c.lineTo(W, H); c.lineTo(0, H); c.closePath(); c.fill();
  c.fillStyle = 'rgba(120,240,230,.18)'; const R = seed(11); for (let i = 0; i < 40; i++) { c.beginPath(); c.arc(R() * W, hz + R() * (H - hz), 1.5 + R() * 2, 0, TAU); c.fill(); }
  K.drift(c, W, H * .6, t, 12, 1);
}
function battlePeak(c, W, H, t, hz, boss) {
  if (boss) K.skyGradient(c, W, H, '#0E0410', '#36082A', '#7A1A2E', '#E0502A'); else K.skyGradient(c, W, H, '#14061C', '#3E0F2C', '#86283A', '#F07A3E');
  K.stars(c, W, H * .5, t, 30, 14);
  const vx = W * .74, vt = hz - H * .3;
  c.fillStyle = '#4A1C2C'; c.beginPath(); c.moveTo(vx - W * .45, hz); c.quadraticCurveTo(vx - W * .12, vt + 30, vx - W * .06, vt); c.lineTo(vx + W * .06, vt); c.quadraticCurveTo(vx + W * .12, vt + 30, vx + W * .45, hz); c.closePath(); c.fill();
  c.save(); c.shadowColor = '#FF6A2A'; c.shadowBlur = 30; c.fillStyle = '#FF7A3A'; c.beginPath(); c.ellipse(vx, vt, W * .06, 6, 0, 0, TAU); c.fill(); c.restore();
  for (let i = 0; i < 5; i++) { const q = ((t * .12 + i / 5) % 1); c.fillStyle = `rgba(60,30,50,${.5 * (1 - q)})`; c.beginPath(); c.arc(vx + q * 40, vt - q * 120, 12 + q * 30, 0, TAU); c.fill(); }
  c.save(); c.globalAlpha = .85; c.fillStyle = '#24101A'; c.beginPath(); c.moveTo(W * .02, hz); c.lineTo(W * .06, hz - H * .2); c.lineTo(W * .2, hz - H * .2); c.lineTo(W * .24, hz); c.closePath(); c.fill(); torii(c, W * .13, hz - H * .2, Math.min(W, H) / 520, '#D8452E'); pine(c, W * .9, hz, 1.1, '#1E0E16'); c.restore();
  c.fillStyle = '#2A1018'; c.beginPath(); c.moveTo(0, hz); for (let x = 0; x <= W; x += 10) c.lineTo(x, hz - 8 - Math.sin(x / 40) * 6); c.lineTo(W, H); c.lineTo(0, H); c.closePath(); c.fill();
  c.save(); c.shadowColor = '#FF6A2A'; c.shadowBlur = 12; c.strokeStyle = 'rgba(255,120,50,.85)'; c.lineWidth = 3; const R = seed(12);
  for (let i = 0; i < 6; i++) { let cx = R() * W, cy = hz + 20 + R() * (H - hz) * .5; c.beginPath(); c.moveTo(cx, cy); for (let k = 0; k < 4; k++) { cx += (R() - .5) * 60; cy += 12 + R() * 14; c.lineTo(cx, cy); } c.stroke(); }
  c.restore();
  K.drift(c, W, H, t, 16, 2);
}

/* ---------- an island as seen from the sky (sky map and village). o: {heal 0..1, locked} ---------- */
function isleArt(c, k, cx, cy, r, t, o = {}) {
  const I = K.ISLES[k], u = r / 190;
  cy += Math.sin(t * .8 + k * 2) * 3 * Math.min(1, r / 60);
  c.fillStyle = I.rock; c.beginPath(); c.moveTo(cx - r, cy); c.quadraticCurveTo(cx - r * .4, cy + r * .9, cx, cy + r * 1.1); c.quadraticCurveTo(cx + r * .4, cy + r * .9, cx + r, cy); c.closePath(); c.fill();
  c.save(); c.shadowColor = I.glow; c.shadowBlur = 14; c.fillStyle = k === 2 ? '#FFB347' : '#9BF6FF'; c.beginPath(); c.moveTo(cx - r * .2, cy + r * .5); c.lineTo(cx - r * .1, cy + r * .9); c.lineTo(cx, cy + r * .5); c.closePath(); c.fill();
  if (k === 1) { c.fillStyle = 'rgba(127,240,255,.7)'; c.fillRect(cx + r * .55, cy, Math.max(2, r * .06), r * .7); }
  if (k === 2) { c.fillStyle = '#FF7A3A'; c.beginPath(); c.moveTo(cx + r * .5, cy + r * .1); c.quadraticCurveTo(cx + r * .52, cy + r * .5, cx + r * .46, cy + r * .7); c.lineTo(cx + r * .44, cy + r * .2); c.closePath(); c.fill(); }
  c.restore();
  c.fillStyle = I.top; c.beginPath(); c.ellipse(cx, cy, r, r * .42, 0, 0, TAU); c.fill(); c.strokeStyle = LINE; c.lineWidth = Math.max(1, Math.min(2, u * 6)); c.stroke();
  const R = seed(17 + k * 31);
  if (k === 0) { for (let i = 0; i < 7; i++) { c.save(); c.globalAlpha = .85; sakura(c, cx + (R() - .5) * r * 1.6, cy + (R() - .5) * r * .5, .3 * u, R, true); c.restore(); } }
  else if (k === 1) {
    c.save(); c.shadowColor = '#7FF0FF'; c.shadowBlur = 12; c.fillStyle = '#46C8E8'; c.beginPath(); c.ellipse(cx - r * .15, cy + r * .04, r * .38, r * .13, 0, 0, TAU); c.fill(); c.restore();
    c.strokeStyle = 'rgba(255,255,255,.6)'; c.lineWidth = Math.max(1, u * 3); c.beginPath(); c.ellipse(cx - r * .15, cy + r * .04, r * .22, r * .06, 0, 0, TAU); c.stroke();
    for (let i = 0; i < 6; i++) coralFan(c, cx + (R() - .5) * r * 1.6, cy + (R() - .3) * r * .3, Math.max(.12, .5 * u), ['#FF7FA8', '#FF9A5A', '#C27BFF'][i % 3], R);
    c.save(); c.translate(cx + r * .62, cy - r * .02); c.scale(Math.max(.14, u * .5), Math.max(.14, u * .5)); seaArch(c, t); c.restore();
    for (let i = 0; i < 4; i++) jellyDot(c, cx + (R() - .5) * r * 1.4, cy - r * (.25 + R() * .3) + Math.sin(t + i) * 3 * u, Math.max(2, 9 * u), i % 2 ? '#FF8FD8' : '#7FF0FF', t + i);
  } else {
    const vx = cx + r * .12, vy = cy - r * .02, vw = r * .42, vh = r * .62;
    c.fillStyle = '#3A1A26'; c.beginPath(); c.moveTo(vx - vw, vy); c.quadraticCurveTo(vx - vw * .3, vy - vh * .6, vx - vw * .18, vy - vh); c.lineTo(vx + vw * .18, vy - vh); c.quadraticCurveTo(vx + vw * .3, vy - vh * .6, vx + vw, vy); c.closePath(); c.fill(); c.strokeStyle = LINE; c.lineWidth = Math.max(1, u * 4); c.stroke();
    c.save(); c.shadowColor = '#FF6A2A'; c.shadowBlur = 16; c.fillStyle = '#FF7A3A'; c.beginPath(); c.ellipse(vx, vy - vh, vw * .18, vw * .05 + 1, 0, 0, TAU); c.fill();
    c.strokeStyle = '#FF8A3D'; c.lineWidth = Math.max(1.2, u * 5); c.beginPath(); c.moveTo(vx - vw * .05, vy - vh); c.quadraticCurveTo(vx - vw * .25, vy - vh * .5, vx - vw * .5, vy - vh * .05); c.moveTo(vx + vw * .08, vy - vh); c.quadraticCurveTo(vx + vw * .2, vy - vh * .4, vx + vw * .35, vy - vh * .05); c.stroke(); c.restore();
    for (let i = 0; i < 3; i++) { const q = (t * .15 + i / 3) % 1; c.fillStyle = `rgba(70,40,60,${.5 * (1 - q)})`; c.beginPath(); c.arc(vx + q * vw * .4, vy - vh - q * vh * .8, (6 + q * 16) * Math.max(.3, u * 1.6), 0, TAU); c.fill(); }
    for (let i = 0; i < 5; i++) pine(c, cx + (R() - .5) * r * 1.7, cy + (R() - .2) * r * .28, Math.max(.12, u * .5), '#24101A');
    torii(c, cx - r * .5, cy + r * .06, Math.max(.14, u * .55), '#D8452E');
  }
  if (o.heal != null && o.heal < 1) { c.save(); c.globalCompositeOperation = 'saturation'; c.fillStyle = `rgba(128,128,128,${(1 - o.heal) * .85})`; c.beginPath(); c.ellipse(cx, cy, r, r * .42, 0, 0, TAU); if (k === 2) { c.moveTo(cx + r * .12 - r * .42, cy); c.lineTo(cx + r * .12 - r * .08, cy - r * .66); c.lineTo(cx + r * .12 + r * .08, cy - r * .66); c.lineTo(cx + r * .12 + r * .42, cy); } c.fill(); c.restore(); }
  if (o.locked) {
    c.save(); c.fillStyle = 'rgba(225,230,255,.55)';
    for (let i = 0; i < 9; i++) { const a = i / 9 * TAU + t * .1, rx = Math.cos(a) * r * .75, ry = Math.sin(a) * r * .35 - r * .12; c.beginPath(); c.arc(cx + rx, cy + ry, r * (.32 + (i % 3) * .06), 0, TAU); c.fill(); }
    c.fillStyle = 'rgba(235,240,255,.75)'; c.beginPath(); c.ellipse(cx, cy - r * .1, r * .7, r * .3, 0, 0, TAU); c.fill();
    const lr = Math.max(7, r * .2); c.fillStyle = '#4A4466'; c.strokeStyle = '#4A4466'; c.lineWidth = lr * .28; c.beginPath(); c.arc(cx, cy - r * .12 - lr * .3, lr * .55, Math.PI, 0); c.stroke(); E.rr(c, cx - lr * .8, cy - r * .12 - lr * .3, lr * 1.6, lr * 1.2, lr * .25); c.fill();
    c.restore();
  }
}
K.isleArt = isleArt;
const BOSS_ICON = (c, k, x, y, r, locked) => {
  if (k === 0) { blossom(c, x, y, r * .9, locked ? '#8A84A8' : '#FFC6DD'); return; }
  if (k === 1) { c.save(); c.fillStyle = locked ? '#8A84A8' : '#BFF6FF'; c.beginPath(); c.moveTo(x, y - r * .75); c.quadraticCurveTo(x + r * .7, y + r * .1, x, y + r * .6); c.quadraticCurveTo(x - r * .7, y + r * .1, x, y - r * .75); c.fill(); c.strokeStyle = locked ? '#5A5478' : '#2F7BFF'; c.lineWidth = Math.max(1.5, r * .12); c.beginPath(); c.moveTo(x - r * .3, y + r * .12); c.quadraticCurveTo(x - r * .1, y - r * .05, x, y + r * .12); c.quadraticCurveTo(x + r * .12, y + r * .28, x + r * .3, y + r * .1); c.stroke(); c.restore(); return; }
  if (locked) { c.save(); c.fillStyle = '#8A84A8'; c.beginPath(); c.moveTo(x, y - r * .7); c.quadraticCurveTo(x + r * .6, y, x, y + r * .55); c.quadraticCurveTo(x - r * .6, y, x, y - r * .7); c.fill(); c.restore(); }
  else flameShape(c, x, y + r * .5, r / 52, 0, ['#FF6A2A', '#FFB347', '#FFF1C2']);
};
K.bossIcon = BOSS_ICON;

/* ---------- battle backdrop ---------- */
K.battleBg = function (c, W, H, t, o = {}) {
  const hz = H * .56, isle = o.isle || 0;
  if (isle === 1) battleGrotto(c, W, H, t, hz, o.boss);
  else if (isle === 2) battlePeak(c, W, H, t, hz, o.boss);
  else {
    if (o.boss) K.skyGradient(c, W, H, '#140A2E', '#3A1460', '#8A2E7A', '#E86A8A'); else K.skyGradient(c, W, H, '#0D1446', '#3B2A86', '#C26BB0', '#FFB7A0');
    K.stars(c, W, H, t, 60, 4);
    K.floatIsle(c, W * .16, H * .2, 30, '#2C2C6E', '#4FBF9A', t); K.floatIsle(c, W * .86, H * .32, 40, '#2A2460', '#4FBF9A', t);
    c.save(); c.globalAlpha = .7; sakura(c, W * .1, hz, .9, seed(3), true); sakura(c, W * .92, hz + 10, 1.1, seed(8), true); c.restore();
    c.fillStyle = '#1E2A5A'; c.beginPath(); c.moveTo(0, hz); for (let x = 0; x <= W; x += 10) c.lineTo(x, hz - 8 - Math.sin(x / 40) * 6); c.lineTo(W, H); c.lineTo(0, H); c.closePath(); c.fill();
  }
  const glc = o.boss ? 'rgba(255,111,216,.35)' : isle === 2 ? 'rgba(255,150,80,.4)' : 'rgba(143,230,255,.35)';
  const gl = c.createLinearGradient(0, hz - 20, 0, hz + 30); gl.addColorStop(0, glc); gl.addColorStop(1, 'rgba(143,230,255,0)'); c.fillStyle = gl; c.fillRect(0, hz - 20, W, 50);
  /* magic circle under the enemy */
  c.save(); c.translate(W * .66, hz + 26); c.scale(1, .28); c.rotate(t * .3); c.strokeStyle = o.boss ? 'rgba(255,111,216,.55)' : 'rgba(143,230,255,.5)'; c.lineWidth = 3;
  c.beginPath(); c.arc(0, 0, 110, 0, TAU); c.stroke(); c.beginPath(); c.arc(0, 0, 84, 0, TAU); c.stroke();
  E.starPath(c, 0, 0, 84, 40, 6); c.stroke(); c.restore();
};
/* anime speed lines radiating from (cx, cy) */
K.speedLines = function (c, W, H, cx, cy, t, col = 'rgba(255,255,255,.7)', n = 70) {
  const R = seed(Math.floor(t * 20) + 3);
  c.fillStyle = col;
  for (let i = 0; i < n; i++) { const a = R() * TAU, r0 = 80 + R() * 120, r1 = r0 + 300 + R() * 500, wd = .006 + R() * .014; c.beginPath(); c.moveTo(cx + Math.cos(a - wd) * r0, cy + Math.sin(a - wd) * r0); c.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1); c.lineTo(cx + Math.cos(a + wd) * r0, cy + Math.sin(a + wd) * r0); c.closePath(); c.fill(); }
};
/* The special-move cut-in: diagonal band with the hero's eyes, speed lines and the move's name. k: 0..1 progress */
K.cutin = function (c, W, H, k, L, name, col, t) {
  const inn = clamp(k / .18, 0, 1), out = clamp((k - .82) / .18, 0, 1), sl = (1 - inn) * W - out * W;
  c.save(); c.fillStyle = `rgba(8,10,30,${.75 * (1 - out)})`; c.fillRect(0, 0, W, H);
  K.speedLines(c, W, H, W / 2, H / 2, t, 'rgba(160,245,255,.35)', 60);
  const bh = Math.min(200, H * .26), y0 = H * .36;
  c.translate(sl, 0);
  c.save(); c.beginPath(); c.moveTo(0, y0 + 20); c.lineTo(W, y0); c.lineTo(W, y0 + bh); c.lineTo(0, y0 + bh + 20); c.closePath(); c.clip();
  const g = c.createLinearGradient(0, 0, W, 0); g.addColorStop(0, '#2A1E78'); g.addColorStop(1, col); c.fillStyle = g; c.fillRect(0, y0 - 10, W, bh + 40);
  const R = seed(4); c.fillStyle = 'rgba(160,245,255,.6)'; for (let i = 0; i < 40; i++) { const yy = y0 + R() * bh; c.fillRect(((R() * W + t * 900) % (W + 160)) - 160, yy, 40 + R() * 120, 1.5); }
  const z = Math.max(1.4, Math.min(2.4, W / 220)), drift = (k - .5) * 30;
  c.translate(W * .5 - 180 * z + drift, y0 + bh * .55 - 222 * z); c.scale(z, z); K.bust(c, L, {fierce:true, mouth:'shout', glowEyes:true});
  c.restore();
  c.strokeStyle = '#8FE6FF'; c.lineWidth = 4; c.beginPath(); c.moveTo(0, y0 + 20); c.lineTo(W, y0); c.moveTo(0, y0 + bh + 20); c.lineTo(W, y0 + bh); c.stroke();
  let fs = Math.min(44, W / 9);
  c.font = `${fs}px "Dela Gothic One", Lexend, sans-serif`; c.textAlign = 'right'; c.textBaseline = 'middle';
  const tw = c.measureText(name).width; if (tw > W - 32) { fs *= (W - 32) / tw; c.font = `${fs}px "Dela Gothic One", Lexend, sans-serif`; }
  c.save(); c.translate(W - 14, y0 + bh + 20 + fs * .9); c.rotate(-.05); c.lineJoin = 'round'; c.lineWidth = fs * .22; c.strokeStyle = '#150E1C'; c.strokeText(name, 0, 0); c.shadowColor = '#7FF0FF'; c.shadowBlur = 16; c.fillStyle = '#E9FDFF'; c.fillText(name, 0, 0); c.restore();
  c.restore();
};

/* ---------- Sky Village: home base on a floating island. Returns tap areas. ---------- */
const VPOS = {dojo:[.5, .52], garden:[.2, .6], forge:[.8, .6], spring:[.3, .8], tower:[.72, .34], shrine:[.5, .26]};
K.VPOS = VPOS;
function roofHouse(c, x, y, w, h, wall, roof, lit, t) {
  c.strokeStyle = LINE; c.lineWidth = 2;
  c.fillStyle = wall; c.fillRect(x - w / 2, y - h, w, h); c.strokeRect(x - w / 2, y - h, w, h);
  if (lit) { c.save(); c.shadowColor = '#FFC56A'; c.shadowBlur = 12; c.fillStyle = '#FFD98A'; c.fillRect(x - w * .3, y - h * .7, w * .18, h * .32); c.fillRect(x + w * .12, y - h * .7, w * .18, h * .32); c.restore(); }
  c.fillStyle = '#2E2A48'; c.fillRect(x - w * .1, y - h * .45, w * .2, h * .45);
  c.fillStyle = roof; c.beginPath(); c.moveTo(x - w * .72, y - h + 2); c.quadraticCurveTo(x, y - h - h * .25, x + w * .72, y - h + 2); c.lineTo(x + w * .5, y - h - h * .5); c.quadraticCurveTo(x, y - h - h * .62, x - w * .5, y - h - h * .5); c.closePath(); c.fill(); c.stroke();
}
function ruin(c, x, y, w, h) {
  c.strokeStyle = 'rgba(200,190,230,.5)'; c.lineWidth = 2; c.setLineDash([5, 5]); c.strokeRect(x - w / 2, y - h, w, h); c.setLineDash([]);
  c.fillStyle = '#4A4466'; c.beginPath(); c.moveTo(x - w / 2, y); c.lineTo(x - w / 2, y - h * .4); c.lineTo(x - w * .2, y - h * .25); c.lineTo(x, y - h * .5); c.lineTo(x + w * .25, y - h * .2); c.lineTo(x + w / 2, y - h * .35); c.lineTo(x + w / 2, y); c.closePath(); c.fill(); c.strokeStyle = LINE; c.stroke();
  c.strokeStyle = '#8A7A5A'; c.lineWidth = 3; c.beginPath(); c.moveTo(x - w * .4, y); c.lineTo(x - w * .4, y - h * 1.1); c.moveTo(x + w * .4, y); c.lineTo(x + w * .4, y - h * 1.1); c.moveTo(x - w * .45, y - h * .8); c.lineTo(x + w * .45, y - h * .8); c.stroke();
}
K.village = function (c, W, H, t, st, sel) {
  K.skyGradient(c, W, H, '#101A52', '#40308E', '#C77BB8', '#FFC2A8');
  K.stars(c, W, H * .7, t, 50, 21);
  /* Tide Grotto and Ember Peak float nearby: misty until they open, greyer until they're healed */
  const isl = st.isles || [], uu = Math.min(W / 360, H / 360);
  for (const [k, px, py, r] of [[1, .11, .13, 24], [2, .89, .16, 28]]) isleArt(c, k, W * px, H * py, r * uu, t, {heal:isl[k] ? isl[k].heal : 0, locked:!(isl[k] && isl[k].open)});
  /* the island */
  const cx = W / 2, top = H * .2, iw = W * .48;
  c.fillStyle = '#2B2660'; c.beginPath(); c.moveTo(cx - iw, H * .82); c.quadraticCurveTo(cx - iw * .5, H * 1.05, cx, H * 1.1); c.quadraticCurveTo(cx + iw * .5, H * 1.05, cx + iw, H * .82); c.closePath(); c.fill();
  const ig = c.createRadialGradient(cx, H * .45, 10, cx, H * .58, iw * 1.1); ig.addColorStop(0, '#8FEAC6'); ig.addColorStop(.7, '#4FBF9A'); ig.addColorStop(1, '#2F8F7A');
  c.fillStyle = ig; c.beginPath(); c.ellipse(cx, H * .58, iw * 1.02, H * .3, 0, 0, TAU); c.fill(); c.strokeStyle = LINE; c.lineWidth = 2; c.stroke();
  const R0 = seed(44); for (let i = 0; i < 70; i++) { const a = R0() * TAU, rr = Math.sqrt(R0()); c.fillStyle = i % 3 ? 'rgba(255,255,255,.12)' : 'rgba(255,198,221,.55)'; c.beginPath(); c.ellipse(cx + Math.cos(a) * rr * iw * .95, H * .58 + Math.sin(a) * rr * H * .27, 3, 1.6, 0, 0, TAU); c.fill(); }
  /* paths */
  c.strokeStyle = 'rgba(255,240,220,.55)'; c.lineWidth = Math.max(6, W * .02); c.lineCap = 'round';
  c.beginPath(); for (const k of ['garden', 'forge', 'spring', 'tower', 'shrine']) { c.moveTo(VPOS.dojo[0] * W, VPOS.dojo[1] * H); c.lineTo(VPOS[k][0] * W, VPOS[k][1] * H); } c.stroke();
  const R = seed(31); for (const [tx, ty] of [[-.88, .5], [.86, .48], [-.55, .78], [.6, .8], [-.1, .36], [.02, .86]]) { c.save(); c.globalAlpha = .92; sakura(c, cx + tx * iw, H * ty, .3 + R() * .1, R, true); c.restore(); }
  const u = Math.min(W / 360, H / 360) * 1.05, hits = [];
  const B = st.buildings || {};
  for (const k of ['shrine', 'tower', 'garden', 'dojo', 'forge', 'spring']) {
    const [px, py] = VPOS[k], x = px * W, y = py * H, built = k === 'dojo' || B[k];
    if (sel === k) { c.save(); c.shadowColor = '#FFE27A'; c.shadowBlur = 20; c.fillStyle = 'rgba(255,226,122,.35)'; c.beginPath(); c.ellipse(x, y, 52 * u, 14 * u, 0, 0, TAU); c.fill(); c.restore(); }
    if (!built) ruin(c, x, y, 54 * u, 40 * u);
    else if (k === 'dojo') roofHouse(c, x, y, 70 * u, 40 * u, '#F3E6D0', '#C8384A', true, t);
    else if (k === 'garden') { roofHouse(c, x, y, 46 * u, 26 * u, '#E8F6EE', '#2F7A5E', true, t); for (let i = 0; i < 5; i++) blossom(c, x - 28 * u + i * 14 * u, y + 4 * u, 6 * u, '#FFC6DD'); }
    else if (k === 'forge') { roofHouse(c, x, y, 52 * u, 34 * u, '#5A4A5E', '#3A3448', true, t); c.save(); c.shadowColor = '#FF8A3D'; c.shadowBlur = 16; c.fillStyle = '#FF8A3D'; c.fillRect(x - 6 * u, y - 14 * u, 12 * u, 12 * u); c.restore(); for (let i = 0; i < 3; i++) { c.fillStyle = 'rgba(200,190,220,.35)'; c.beginPath(); c.arc(x + 18 * u + Math.sin(t + i) * 4, y - 62 * u - ((t * 14 + i * 12) % 36) * u, (5 + i * 2) * u, 0, TAU); c.fill(); } }
    else if (k === 'spring') { c.save(); c.shadowColor = '#7FF0FF'; c.shadowBlur = 18; c.fillStyle = '#9BE8FF'; c.beginPath(); c.ellipse(x, y - 6 * u, 34 * u, 12 * u, 0, 0, TAU); c.fill(); c.restore(); c.strokeStyle = LINE; c.lineWidth = 2; c.stroke(); c.strokeStyle = 'rgba(255,255,255,.6)'; for (let i = 0; i < 3; i++) { c.beginPath(); c.ellipse(x, y - 6 * u, (10 + ((t * 10 + i * 8) % 24)) * u, (3 + ((t * 10 + i * 8) % 24) * .3) * u, 0, 0, TAU); c.stroke(); } }
    else if (k === 'tower') { c.fillStyle = '#5A4A7E'; c.fillRect(x - 10 * u, y - 70 * u, 20 * u, 70 * u); c.strokeStyle = LINE; c.lineWidth = 2; c.strokeRect(x - 10 * u, y - 70 * u, 20 * u, 70 * u); K.lantern(c, x, y - 64 * u, .5 * u, true, t); }
    else if (k === 'shrine') { c.save(); const sg = c.createRadialGradient(x, y - 40 * u, 4, x, y - 40 * u, 70 * u); sg.addColorStop(0, `rgba(255,226,122,${.35 + Math.sin(t * 2) * .1})`); sg.addColorStop(1, 'rgba(255,226,122,0)'); c.fillStyle = sg; c.beginPath(); c.arc(x, y - 40 * u, 70 * u, 0, TAU); c.fill(); c.restore(); pagoda(c, x, y, .5 * u, '#C8384A'); }
    hits.push({k, x, y: y - 20 * u, r: 40 * u});
  }
  /* companions playing near the garden */
  if (st.comps && st.comps.length) st.comps.slice(0, 4).forEach((cp, i) => K.spirit(c, cp.kind, cp.stage, VPOS.garden[0] * W + (i - .5) * 30 * u + Math.sin(t * .8 + i) * 10 * u, VPOS.garden[1] * H + 22 * u, .22 * u, t + i, {glow:false, face:Math.sin(t * .8 + i) > 0 ? 1 : -1}));
  K.petals(c, W, H, t, 14);
  return hits;
};

/* ---------- the sky map: the island in focus with its five quest nodes, the other two small at the top.
   info: {isle, sel, isles:[{name, open, heal, cleared, quests:[{i, boss, locked, cur, stars}]}]}. Returns tap areas. ---------- */
K.skyMap = function (c, W, H, t, info) {
  K.skyGradient(c, W, H, '#0B1240', '#2E2478', '#9E5AA8', '#F2A6A0');
  K.stars(c, W, H, t, 80, 13);
  const u = Math.min(W / 360, H / 520), nodes = [], foc = info.isle || 0;
  const text = (s, x, y, size, col, font) => { c.font = font || `700 ${size}px Lexend, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'alphabetic'; c.lineJoin = 'round'; c.lineWidth = 4; c.strokeStyle = 'rgba(11,18,64,.8)'; c.strokeText(s, x, y); c.fillStyle = col; c.fillText(s, x, y); };
  /* the other two islands, small. Tap to fly there. */
  [0, 1, 2].filter(k => k !== foc).forEach((k, j) => {
    const I = info.isles[k], x = W * (j ? .8 : .2), y = H * .14, r = 36 * u;
    isleArt(c, k, x, y, r, t, {heal:I.heal, locked:!I.open});
    text(I.name, x, y + r * 1.45 + 8 * u, 12 * u, '#FFFFFF');
    text(I.open ? `${I.cleared} of 5 quests` : 'Locked', x, y + r * 1.45 + 23 * u, 11 * u, I.open ? '#BFF6FF' : '#C9C4E0', `600 ${11 * u}px Lexend, sans-serif`);
    nodes.push({isle:k, x, y:y + r * .3, r:r * 1.5});
  });
  /* the island in focus */
  const I = info.isles[foc], cx = W / 2, cy = H * .63, r = Math.min(W * .44, 186 * u);
  isleArt(c, foc, cx, cy, r, t, {heal:I.heal});
  const pos = [[-.62, .1], [-.28, -.22], [.06, .12], [.4, -.18], [.62, .14]];
  c.strokeStyle = 'rgba(255,240,220,.75)'; c.lineWidth = 4 * u; c.setLineDash([8 * u, 8 * u]); c.beginPath(); pos.forEach(([px, py], i) => { const x = cx + px * r, y = cy + py * r; i ? c.lineTo(x, y) : c.moveTo(x, y); }); c.stroke(); c.setLineDash([]);
  pos.forEach(([px, py], j) => {
    const x = cx + px * r, y = cy + py * r, q = I.quests[j], nr = (q.boss ? 26 : 20) * u;
    if (q.cur) { c.save(); c.shadowColor = '#FFE27A'; c.shadowBlur = 24; c.fillStyle = 'rgba(255,226,122,.4)'; c.beginPath(); c.arc(x, y, nr + 10 * u + Math.sin(t * 4) * 3, 0, TAU); c.fill(); c.restore(); }
    c.fillStyle = q.locked ? '#4A4466' : q.boss ? ['#C8384A', '#2F6FB8', '#D8572E'][foc] : q.stars ? '#E9B949' : '#FFFFFF'; c.beginPath(); c.arc(x, y, nr, 0, TAU); c.fill(); c.strokeStyle = LINE; c.lineWidth = 3; c.stroke();
    if (info.sel === q.i) { c.strokeStyle = '#7FF0FF'; c.lineWidth = 4; c.beginPath(); c.arc(x, y, nr + 5 * u, 0, TAU); c.stroke(); }
    if (q.boss) BOSS_ICON(c, foc, x, y, nr, q.locked);
    else { c.fillStyle = q.locked ? '#9A94B8' : LINE; c.font = `800 ${18 * u}px Lexend, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(String(j + 1), x, y + 1); }
    if (q.stars) for (let s = 0; s < 3; s++) { c.fillStyle = s < q.stars ? '#FFE27A' : 'rgba(255,255,255,.35)'; E.starPath(c, x - 14 * u + s * 14 * u, y + nr + 9 * u, 6 * u, 2.8 * u, 5); c.fill(); }
    nodes.push({i:q.i, x, y, r:nr + 14 * u});
  });
  text(I.name, cx, cy + r * .42 + 36 * u, 18 * u, '#FFFFFF', `${18 * u}px "Dela Gothic One", Lexend, sans-serif`);
  K.drift(c, W, H, t, 12, foc);
  return nodes;
};
})();
