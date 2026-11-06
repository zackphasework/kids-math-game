/* Power-Up Math: Delivery Rush. Drive a dump truck over hills and deliver bricks. Fuel comes from math. */
(function () {
'use strict';
const {clamp, lerp, smooth, mulberry32} = PUM.util;
const E = PUM.engine, C = E.col;
PUM.games = PUM.games || {};

PUM.games.trucks = function (o) {
  const {player, stats, assist, level, api} = o;
  const rand = mulberry32(9137 + level * 7919);
  const G = 980, H_STEP = 1 / 120, STEP = 8, R = 20, BASE = 0;
  const MAX_BRICKS = 6;

  /* ---------- terrain ---------- */
  const len = Math.min(6500 + level * 1200, 16000);
  const n = Math.ceil((len + 1200) / STEP);
  const hs = new Float32Array(n);
  const A = [30, 55, 75][2 - assist] + Math.min(level, 10) * 10;
  const w1 = {f:.0032 + rand() * .0012, p:rand() * 6.3}, w2 = {f:.0085 + rand() * .003, p:rand() * 6.3}, w3 = {f:.022 + rand() * .01, p:rand() * 6.3};
  const ramps = [];
  const rampCount = assist >= 2 ? 0 : Math.min(1 + Math.floor(level / 2), 6);
  for (let i = 0; i < rampCount; i++) ramps.push({x:800 + (len - 1600) * (i + .5) / rampCount + (rand() - .5) * 300, h:40 + rand() * 30 + level * 3, up:150 + rand() * 60, down:36});
  for (let i = 0; i < n; i++) {
    const x = i * STEP;
    let h = A * (.62 * Math.sin(x * w1.f + w1.p) + .28 * Math.sin(x * w2.f + w2.p) + (assist >= 2 ? 0 : .1) * Math.sin(x * w3.f + w3.p));
    h += x * .012 * Math.min(level, 6) * (assist >= 1 ? .5 : 1);
    for (const r of ramps) {
      if (x > r.x && x < r.x + r.up) h += r.h * ((x - r.x) / r.up);
      else if (x >= r.x + r.up && x < r.x + r.up + r.down) h += r.h * (1 - (x - r.x - r.up) / r.down);
    }
    const wgt = smooth((x - 150) / 350) * smooth((len - 250 - x) / 350);
    const endH = (len - 250) * .012 * Math.min(level, 6) * (assist >= 1 ? .5 : 1);
    hs[i] = x > len - 250 ? endH : h * wgt + (1 - wgt) * (x < len / 2 ? 0 : endH);
  }
  const groundY = x => { const fi = clamp(x / STEP, 0, n - 1.001), i = Math.floor(fi), f = fi - i; return BASE - (hs[i] + (hs[i + 1] - hs[i]) * f); };
  const slopeAt = x => (groundY(x + 4) - groundY(x - 4)) / 8;

  /* ---------- decorations ---------- */
  const bolts = [];
  for (let x = 600; x < len - 400; x += 430 + rand() * 200) bolts.push({x, y:groundY(x) - 60 - rand() * 50, taken:false, bob:rand() * 6});
  const deco = [];
  for (let x = 60; x < len + 600; x += 70 + rand() * 160) deco.push({x, kind:rand() < .45 ? 'rock' : rand() < .6 ? 'tuft' : 'flower', s:.7 + rand() * .7});
  const flagX = len - 220;
  const far = [], mid = [];
  for (let i = 0; i < 40; i++) far.push({x:i * 220 + rand() * 80, h:80 + rand() * 120, w:180 + rand() * 160});
  for (let i = 0; i < 80; i++) mid.push({x:i * 160 + rand() * 60, kind:rand() < .55 ? 'tree' : rand() < .5 ? 'pine' : 'crane', s:.7 + rand() * .6});
  const clouds = Array.from({length:7}, () => ({x:rand() * 1400, y:20 + rand() * 120, s:.6 + rand() * .8}));

  /* ---------- truck (Verlet body: 2 wheels + 2 roof corners) ---------- */
  const shape = [[-46, 0], [46, 0], [-50, -54], [32, -54]];
  let pts, cons;
  function placeTruck(x) {
    const y = groundY(x) - R - 2, a = Math.atan(slopeAt(x));
    const ca = Math.cos(a), sa = Math.sin(a);
    pts = shape.map(([dx, dy]) => { const px = x + dx * ca - dy * sa, py = y + dx * sa + dy * ca; return {x:px, y:py, px, py, g:false}; });
    cons = [];
    for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) cons.push([i, j, Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y)]);
  }
  placeTruck(150);

  const cap = 100 * (1 + .3 * stats.cap);
  const g = {fuel:cap, bricks:MAX_BRICKS, state:'play', t:0, gas:false, brake:false, wheelRot:0, cam:{x:150, y:groundY(150) - 80}, shake:0, noFuelT:0, hurtCool:0, crashT:0, finishT:0, hudT:0, mp:0, warned:false, lastSafeX:150, airT:0};
  const parts = E.Particles();
  const accel = 560 + stats.str * 95, vmax = 430 + stats.str * 45, grip = 640 + stats.spec * 130 + assist * 120;
  const brickThresh = 720 + assist * 260 + stats.spec * 50;
  const ptrs = new Map();

  const center = () => ({x:(pts[0].x + pts[1].x) / 2, y:(pts[0].y + pts[1].y) / 2});
  const angle = () => Math.atan2(pts[1].y - pts[0].y, pts[1].x - pts[0].x);
  const speedX = () => ((pts[0].x - pts[0].px) + (pts[1].x - pts[1].px)) / 2 / H_STEP;

  function step(h) {
    const driving = g.state === 'play' && g.fuel > 0;
    for (const p of pts) {
      const vx = (p.x - p.px) * .9996, vy = (p.y - p.py) * .9996;
      p.px = p.x; p.py = p.y; p.x += vx; p.y += vy + G * h * h;
    }
    const grounded = pts[0].g || pts[1].g;
    for (let i = 0; i < 2; i++) {
      const p = pts[i]; if (!p.g) continue;
      const s = slopeAt(p.x), L = Math.hypot(1, s), tx = 1 / L, ty = s / L;
      const vt = ((p.x - p.px) * tx + (p.y - p.py) * ty) / h;
      let a = 0;
      if (g.gas && driving && vt < vmax) a = Math.min(accel, grip);
      else if (g.brake && g.state === 'play') a = vt > 20 ? -1100 : (driving && vt > -160 ? -accel * .5 : 0);
      else if (g.state === 'finish') a = vt > 0 ? -900 : 0;
      p.x += tx * a * h * h * .5; p.y += ty * a * h * h * .5;
    }
    const c = center(), ang = angle();
    let alpha = 0;
    if (!grounded && g.state === 'play') alpha = (g.gas ? -7 : g.brake ? 7 : 0);
    if (assist >= 1) alpha += -ang * (assist >= 2 ? 9 : 4) * (grounded ? .3 : 1);
    if (alpha) for (const p of pts) { const dx = p.x - c.x, dy = p.y - c.y; p.x += -dy * alpha * h * h; p.y += dx * alpha * h * h; }
    for (let it = 0; it < 5; it++) {
      for (const [i, j, rest] of cons) {
        const a = pts[i], b = pts[j], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1, k = (d - rest) / d * .5;
        a.x += dx * k; a.y += dy * k; b.x -= dx * k; b.y -= dy * k;
      }
      collide(h, it === 4);
    }
  }
  function collide(h, last) {
    for (let i = 0; i < 4; i++) {
      const p = pts[i], rad = i < 2 ? R : 5, gy = groundY(p.x);
      if (p.y + rad > gy) {
        p.y = gy - rad;
        const s = slopeAt(p.x), L = Math.hypot(1, s), nx = s / L, ny = -1 / L, tx = 1 / L, ty = s / L;
        let vx = p.x - p.px, vy = p.y - p.py;
        const vn = vx * nx + vy * ny;
        if (vn < 0) {
          if (last && i < 2) impact(-vn / h, p);
          vx -= nx * vn * 1.04; vy -= ny * vn * 1.04;
        }
        if (i >= 2) { const vt = vx * tx + vy * ty; vx -= tx * vt * .15; vy -= ty * vt * .15; if (last) roofHit(); }
        else { const vt = vx * tx + vy * ty; vx -= tx * vt * .0015; vy -= ty * vt * .0015; }
        p.px = p.x - vx; p.py = p.y - vy;
        if (i < 2) p.g = true;
      } else if (i < 2 && last) p.g = p.y + rad > gy - 1.5;
    }
  }
  function impact(v, p) {
    if (v > 380) { g.shake = Math.min(12, v / 90); parts.burst(p.x, p.y + R, 10, {speed:160, angle:-Math.PI / 2, spread:2.4, color:['#C9A47A', '#B98A5E', '#E3C9A2'], size:5, g:500, life:.7, drag:1}); PUM.audio.sfx('thud'); }
    if (v > brickThresh && g.hurtCool <= 0 && g.bricks > 0 && g.state === 'play') loseBrick('Bumpy landing!');
  }
  function loseBrick(msg) {
    g.bricks--; g.hurtCool = .7;
    const c = center(), a = angle();
    parts.add({x:c.x - 20 * Math.cos(a), y:c.y - 60, vx:-160 - Math.random() * 80, vy:-260, g:900, life:1.4, size:18, color:C('brick'), shape:'rect', vr:-8, fade:false});
    PUM.audio.sfx('brick');
    api.toast(msg + (g.bricks ? ` ${g.bricks} bricks left` : ' No bricks left'));
  }
  function roofHit() {
    if (g.state !== 'play') return;
    if (Math.abs(angle()) > 1.7 && assist < 2) crash();
  }
  function crash() {
    g.state = 'crash'; g.crashT = 1.3; g.shake = 14;
    const c = center();
    parts.burst(c.x, c.y - 20, 26, {speed:300, color:['#B9BFC7', '#4A4F5C', '#FFC233', '#C9A47A'], size:6, g:700, life:1, shape:'rect'});
    PUM.audio.sfx('crash');
    if (g.bricks > 0) { g.bricks = Math.max(0, g.bricks - 1); }
    api.toast('Flipped over! Lost a brick');
  }

  function update(dt) {
    g.t += dt; g.hurtCool -= dt;
    if (g.shake > 0) g.shake = Math.max(0, g.shake - dt * 30);
    if (g.state === 'crash') { g.crashT -= dt; if (g.crashT <= 0) { placeTruck(Math.max(150, g.lastSafeX - 60)); g.state = 'play'; } }
    if (g.state === 'done' || g.state === 'wait') { parts.update(dt); return; }
    g.acc = (g.acc || 0) + dt;
    while (g.acc >= H_STEP) { step(H_STEP); g.acc -= H_STEP; }
    const c = center(), vx = speedX();
    g.wheelRot += vx * dt / R;
    if ((pts[0].g || pts[1].g) && Math.abs(angle()) < .5) g.lastSafeX = c.x;
    if (g.state === 'play') {
      if (g.gas && g.fuel > 0) g.fuel = Math.max(0, g.fuel - 7.5 * dt); else g.fuel = Math.max(0, g.fuel - .3 * dt);
      if (g.fuel / cap < .2 && !g.warned && g.fuel > 0) { g.warned = true; api.toast('Fuel is low!'); }
      if (g.fuel <= 0) {
        g.noFuelT += dt;
        if ((Math.abs(vx) < 30 && g.noFuelT > .6) || g.noFuelT > 3) { g.state = 'wait'; g.noFuelT = 0; api.needRefuel('fuel'); }
      }
      if (g.gas && g.fuel > 0 && Math.random() < .5) {
        const a = angle(), ex = c.x + (12 * Math.cos(a) - (-82) * Math.sin(a)), ey = c.y + (12 * Math.sin(a) + (-82) * Math.cos(a));
        parts.add({x:ex, y:ey, vx:-40 - Math.random() * 30, vy:-60 - Math.random() * 40, life:.7, size:4 + Math.random() * 3, grow:2, color:'rgba(90,95,110,.5)'});
      }
      if (Math.abs(vx) > 160) for (let i = 0; i < 2; i++) if (pts[i].g && Math.random() < .35) parts.add({x:pts[i].x - 10, y:pts[i].y + R - 2, vx:-vx * .2, vy:-40 - Math.random() * 60, g:200, life:.5, size:3 + Math.random() * 3, grow:1.5, color:'rgba(201,164,122,.7)'});
      for (const b of bolts) if (!b.taken && Math.abs(b.x - c.x) < 46 && Math.abs(b.y + Math.sin(g.t * 3 + b.bob) * 6 - (c.y - 30)) < 60) {
        b.taken = true; g.mp++; api.addMp(1); PUM.audio.sfx('coin');
        parts.burst(b.x, b.y, 10, {speed:140, color:['#FFC233', '#FFFFFF'], size:5, shape:'star', life:.6});
      }
      if (pts[0].x >= flagX) { g.state = 'finish'; g.finishT = 0; g.gas = false; PUM.audio.sfx('fanfare'); api.toast('Delivered!'); }
    }
    if (g.state === 'finish') {
      g.finishT += dt;
      if (Math.random() < .5) parts.add({x:flagX + 80 + (Math.random() - .5) * 240, y:groundY(flagX) - 260, vx:(Math.random() - .5) * 80, vy:60, g:120, life:2, size:7, color:['#FFC233', '#E8577A', '#2F95D6', '#22A06B'][Math.floor(Math.random() * 4)], shape:'rect', vr:6, fade:false});
      if (g.finishT > 2.4) { g.state = 'done'; const st = g.bricks >= 6 ? 3 : g.bricks >= 4 ? 2 : g.bricks >= 1 ? 1 : 0; api.finish({bricks:g.bricks, max:MAX_BRICKS, stars:st, mp:g.mp}); }
    }
    parts.update(dt);
    const look = clamp(vx * .35, -120, 220);
    g.cam.x = lerp(g.cam.x, c.x + look, Math.min(1, dt * 3));
    g.cam.y = lerp(g.cam.y, c.y - 40, Math.min(1, dt * 4));
    PUM.audio.engineSet(clamp(Math.abs(vx) / vmax, 0, 1.2) + (g.gas ? .3 : 0), g.gas && g.fuel > 0 ? 1 : 0);
    g.hudT -= dt;
    if (g.hudT <= 0) { g.hudT = .1; api.hud({fuel:g.fuel / cap, bricks:g.bricks, max:MAX_BRICKS, progress:clamp(c.x / flagX, 0, 1), mp:g.mp}); }
  }

  /* ---------- drawing ---------- */
  let view = {s:1, W:0, H:0};
  function resize(W, H) { view = {W, H, s:Math.min(H / 430, W / 540)}; }
  function drawTree(ctx, x, y, s, kind) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    if (kind === 'tree') { ctx.fillStyle = '#7A5A3A'; ctx.fillRect(-4, -30, 8, 30); ctx.fillStyle = '#3E9A5A'; ctx.beginPath(); ctx.arc(0, -42, 22, 0, 7); ctx.arc(-14, -32, 14, 0, 7); ctx.arc(14, -32, 14, 0, 7); ctx.fill(); }
    else if (kind === 'pine') { ctx.fillStyle = '#7A5A3A'; ctx.fillRect(-3, -16, 6, 16); ctx.fillStyle = '#2E7D52'; ctx.beginPath(); ctx.moveTo(0, -70); ctx.lineTo(18, -16); ctx.lineTo(-18, -16); ctx.closePath(); ctx.fill(); }
    else { ctx.strokeStyle = '#E8A63A'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -110); ctx.lineTo(60, -110); ctx.moveTo(0, -110); ctx.lineTo(-22, -110); ctx.moveTo(48, -110); ctx.lineTo(48, -80); ctx.stroke(); ctx.fillStyle = '#E8A63A'; ctx.fillRect(-6, -124, 18, 14); }
    ctx.restore();
  }
  function drawBackground(ctx, W, H) {
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#5DB8EA'); sky.addColorStop(.6, '#BDE6F8'); sky.addColorStop(1, '#E9F7FF');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(255,236,170,.9)'; ctx.beginPath(); ctx.arc(W * .82, H * .16, Math.min(W, H) * .08, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.85)';
    for (const cl of clouds) {
      const x = ((cl.x - g.cam.x * .06 + g.t * 6) % (W + 400) + W + 400) % (W + 400) - 200, y = cl.y * (H / 430);
      ctx.beginPath(); ctx.ellipse(x, y, 60 * cl.s, 18 * cl.s, 0, 0, 7); ctx.ellipse(x + 30 * cl.s, y - 12 * cl.s, 34 * cl.s, 18 * cl.s, 0, 0, 7); ctx.ellipse(x - 30 * cl.s, y - 6 * cl.s, 28 * cl.s, 14 * cl.s, 0, 0, 7); ctx.fill();
    }
    const horizon = H * .62 + (groundY(g.cam.x) - g.cam.y) * view.s * .12;
    ctx.fillStyle = '#9CC7DE';
    ctx.beginPath(); ctx.moveTo(0, H);
    for (let sx = 0; sx <= W + 10; sx += 10) { const wx = sx / view.s * .5 + g.cam.x * .15; ctx.lineTo(sx, horizon - (60 + 50 * Math.sin(wx * .004) + 30 * Math.sin(wx * .011 + 1)) * view.s); }
    ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
    const mh = horizon + 30 * view.s;
    ctx.fillStyle = '#8CCB7A';
    ctx.beginPath(); ctx.moveTo(0, H);
    for (let sx = 0; sx <= W + 10; sx += 10) { const wx = sx / view.s + g.cam.x * .4; ctx.lineTo(sx, mh - (30 + 26 * Math.sin(wx * .006 + 2) + 12 * Math.sin(wx * .017)) * view.s); }
    ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
    for (const m of mid) {
      const sx = (m.x - g.cam.x * .4) * view.s % (W + 400);
      const px = ((sx % (W + 400)) + W + 400) % (W + 400) - 150;
      const wx = px / view.s + g.cam.x * .4;
      drawTree(ctx, px, mh - (30 + 26 * Math.sin(wx * .006 + 2) + 12 * Math.sin(wx * .017)) * view.s + 4, m.s * view.s * .8, m.kind);
    }
  }
  function drawTruck(ctx) {
    const c = center(), a = angle(), pc = PUM.util.cssVar(player.color);
    ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(a);
    ctx.lineJoin = 'round'; ctx.lineWidth = 3; ctx.strokeStyle = C('ink');
    ctx.fillStyle = C('metal'); E.rr(ctx, -62, -18, 124, 14, 5); ctx.fill(); ctx.stroke();
    const n = g.bricks, slots = [[-56, -60], [-36, -60], [-16, -60], [-48, -72], [-28, -72], [-8, -72]];
    for (let i = 0; i < n; i++) { ctx.fillStyle = C('brick'); ctx.fillRect(slots[i][0], slots[i][1], 19, 11); ctx.strokeRect(slots[i][0], slots[i][1], 19, 11); ctx.beginPath(); ctx.moveTo(slots[i][0] + 9.5, slots[i][1]); ctx.lineTo(slots[i][0] + 9.5, slots[i][1] + 11); ctx.stroke(); }
    ctx.fillStyle = C('star'); ctx.beginPath(); ctx.moveTo(-64, -18); ctx.lineTo(-66, -54); ctx.lineTo(8, -54); ctx.lineTo(6, -18); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = 'rgba(29,37,64,.35)'; ctx.beginPath(); ctx.moveTo(-60, -30); ctx.lineTo(2, -30); ctx.moveTo(-61, -42); ctx.lineTo(3, -42); ctx.stroke(); ctx.strokeStyle = C('ink');
    ctx.fillStyle = C('metal'); ctx.fillRect(10, -86, 6, 26); ctx.strokeRect(10, -86, 6, 26);
    ctx.fillStyle = pc; ctx.beginPath(); ctx.moveTo(12, -18); ctx.lineTo(12, -66); ctx.lineTo(40, -66); ctx.quadraticCurveTo(56, -64, 60, -46); ctx.lineTo(66, -26); ctx.lineTo(66, -18); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = C('glass'); ctx.beginPath(); ctx.moveTo(20, -60); ctx.lineTo(38, -60); ctx.quadraticCurveTo(50, -58, 54, -44); ctx.lineTo(20, -44); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = C('skin2'); ctx.beginPath(); ctx.arc(30, -48, 7, 0, 7); ctx.fill(); ctx.stroke();
    ctx.fillStyle = C('star'); ctx.beginPath(); ctx.arc(30, -51, 7.5, Math.PI, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#FFF4B0'; ctx.beginPath(); ctx.arc(64, -24, 4, 0, 7); ctx.fill(); ctx.stroke();
    ctx.restore();
    for (let i = 0; i < 2; i++) {
      const p = pts[i];
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(g.wheelRot);
      ctx.fillStyle = C('tire'); ctx.beginPath(); ctx.arc(0, 0, R, 0, 7); ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = C('ink'); ctx.stroke();
      ctx.strokeStyle = '#555B68'; ctx.lineWidth = 3;
      for (let k = 0; k < 10; k++) { const t = k * Math.PI / 5; ctx.beginPath(); ctx.moveTo(Math.cos(t) * (R - 4), Math.sin(t) * (R - 4)); ctx.lineTo(Math.cos(t) * (R - 1), Math.sin(t) * (R - 1)); ctx.stroke(); }
      ctx.fillStyle = C('concrete'); ctx.beginPath(); ctx.arc(0, 0, 11, 0, 7); ctx.fill(); ctx.strokeStyle = C('ink'); ctx.lineWidth = 2.5; ctx.stroke();
      ctx.strokeStyle = C('metal'); ctx.lineWidth = 2.5;
      for (let k = 0; k < 5; k++) { const t = k * Math.PI * 2 / 5; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(t) * 10, Math.sin(t) * 10); ctx.stroke(); }
      ctx.fillStyle = C('metal'); ctx.beginPath(); ctx.arc(0, 0, 4, 0, 7); ctx.fill();
      ctx.restore();
    }
  }
  function drawSite(ctx) {
    const x0 = flagX + 30, gy = groundY(x0);
    ctx.lineWidth = 3; ctx.strokeStyle = C('ink');
    ctx.fillStyle = '#FFFFFF'; ctx.fillRect(flagX - 3, gy - 150, 6, 150);
    const wave = Math.sin(g.t * 5) * 6;
    ctx.fillStyle = C('rose'); ctx.beginPath(); ctx.moveTo(flagX + 3, gy - 150); ctx.quadraticCurveTo(flagX + 30, gy - 145 + wave, flagX + 58, gy - 138); ctx.lineTo(flagX + 3, gy - 118); ctx.closePath(); ctx.fill(); ctx.stroke();
    for (let i = 0; i < 12; i++) { ctx.fillStyle = i % 2 ? '#FFFFFF' : C('ink'); ctx.fillRect(flagX - 3, gy - 150 + i * 12.5, 6, 12.5); }
    const bx = flagX + 90, bw = 170, floors = 4;
    const built = PUM.store ? (player.prog.trucks.bricks % PUM.BRICKS_PER_BUILDING) : 0;
    const bld = PUM.BUILDINGS[player.prog.trucks.built.length % PUM.BUILDINGS.length];
    const total = built + (g.state === 'finish' || g.state === 'done' ? Math.min(g.bricks, Math.floor(g.finishT * 4)) : 0);
    const frac = clamp(total / PUM.BRICKS_PER_BUILDING, 0, 1);
    ctx.strokeStyle = 'rgba(29,37,64,.5)'; ctx.lineWidth = 3;
    for (let i = 0; i <= floors; i++) { ctx.beginPath(); ctx.moveTo(bx - 8, gy - i * 40); ctx.lineTo(bx + bw + 8, gy - i * 40); ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(bx - 8, gy); ctx.lineTo(bx - 8, gy - 160); ctx.moveTo(bx + bw + 8, gy); ctx.lineTo(bx + bw + 8, gy - 160); ctx.stroke();
    const hgt = 160 * frac;
    if (hgt > 0) {
      ctx.fillStyle = PUM.util.cssVar(bld.color); ctx.strokeStyle = C('ink');
      ctx.fillRect(bx, gy - hgt, bw, hgt); ctx.strokeRect(bx, gy - hgt, bw, hgt);
      ctx.fillStyle = C('glass');
      for (let r = 0; r < 4; r++) for (let k = 0; k < 4; k++) { const wy = gy - 30 - r * 40; if (wy > gy - hgt + 4) { ctx.fillRect(bx + 16 + k * 40, wy, 20, 18); ctx.strokeRect(bx + 16 + k * 40, wy, 20, 18); } }
    }
    E.outlineText(ctx, bld.name, bx + bw / 2, gy - 186, 22, '#FFFFFF', C('ink'));
  }
  function draw(ctx, W, H) {
    if (!view.W) resize(W, H);
    drawBackground(ctx, W, H);
    const s = view.s, sh = g.shake ? (Math.random() - .5) * g.shake : 0, sv = g.shake ? (Math.random() - .5) * g.shake : 0;
    ctx.save();
    ctx.translate(W * .38 + sh, H * .6 + sv); ctx.scale(s, s); ctx.translate(-g.cam.x, -g.cam.y);
    const x0 = g.cam.x - W * .38 / s - 40, x1 = g.cam.x + W * .62 / s + 40, bottom = g.cam.y + H / s;
    const dirt = ctx.createLinearGradient(0, g.cam.y, 0, bottom);
    dirt.addColorStop(0, '#C79A6C'); dirt.addColorStop(1, '#8E6640');
    ctx.fillStyle = dirt; ctx.beginPath(); ctx.moveTo(x0, bottom);
    for (let x = Math.floor(x0 / STEP) * STEP; x <= x1; x += STEP) ctx.lineTo(x, groundY(x));
    ctx.lineTo(x1, bottom); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(110,76,44,.35)';
    for (let x = Math.floor(x0 / 37) * 37; x < x1; x += 37) { const gy = groundY(x), k = (x * 7919) % 5; ctx.beginPath(); ctx.ellipse(x + k * 3, gy + 26 + k * 9, 5 + k, 3 + k * .5, 0, 0, 7); ctx.fill(); }
    ctx.strokeStyle = C('grassDark'); ctx.lineWidth = 14; ctx.lineJoin = 'round'; ctx.beginPath();
    for (let x = Math.floor(x0 / STEP) * STEP; x <= x1; x += STEP) ctx[x === Math.floor(x0 / STEP) * STEP ? 'moveTo' : 'lineTo'](x, groundY(x) + 3);
    ctx.stroke();
    ctx.strokeStyle = C('grass'); ctx.lineWidth = 8; ctx.stroke();
    for (const d of deco) {
      if (d.x < x0 || d.x > x1) continue;
      const gy = groundY(d.x);
      if (d.kind === 'rock') { ctx.fillStyle = '#9AA0AA'; ctx.strokeStyle = C('ink'); ctx.lineWidth = 2.5; ctx.beginPath(); ctx.ellipse(d.x, gy - 4 * d.s, 12 * d.s, 8 * d.s, 0, Math.PI, 0); ctx.closePath(); ctx.fill(); ctx.stroke(); }
      else if (d.kind === 'tuft') { ctx.strokeStyle = C('grassDark'); ctx.lineWidth = 3; ctx.beginPath(); for (let k = -1; k <= 1; k++) { ctx.moveTo(d.x + k * 5, gy); ctx.lineTo(d.x + k * 8, gy - 14 * d.s); } ctx.stroke(); }
      else { ctx.strokeStyle = C('grassDark'); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(d.x, gy); ctx.lineTo(d.x, gy - 16 * d.s); ctx.stroke(); ctx.fillStyle = d.s > 1 ? C('rose') : C('star'); ctx.beginPath(); ctx.arc(d.x, gy - 18 * d.s, 4 * d.s, 0, 7); ctx.fill(); }
    }
    for (let m = 500; m < len; m += 500) if (m > x0 && m < x1) {
      const gy = groundY(m);
      ctx.fillStyle = '#7A5A3A'; ctx.fillRect(m - 3, gy - 46, 6, 46);
      ctx.fillStyle = '#FFFFFF'; ctx.strokeStyle = C('ink'); ctx.lineWidth = 2.5; E.rr(ctx, m - 26, gy - 70, 52, 26, 6); ctx.fill(); ctx.stroke();
      ctx.fillStyle = C('ink'); ctx.font = '800 14px Sniglet, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(`${Math.round(m / 10)} m`, m, gy - 57);
    }
    for (const b of bolts) {
      if (b.taken || b.x < x0 || b.x > x1) continue;
      const y = b.y + Math.sin(g.t * 3 + b.bob) * 6;
      ctx.save(); ctx.translate(b.x, y); ctx.scale(Math.cos(g.t * 3 + b.bob), 1);
      ctx.fillStyle = C('star'); ctx.strokeStyle = C('ink'); ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, 14, 0, 7); ctx.fill(); ctx.stroke();
      ctx.fillStyle = C('ink'); ctx.beginPath(); ctx.moveTo(2, -8); ctx.lineTo(-5, 2); ctx.lineTo(0, 2); ctx.lineTo(-2, 9); ctx.lineTo(5, -2); ctx.lineTo(0, -2); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
    if (flagX - 400 < x1) drawSite(ctx);
    if (g.state !== 'crash' || g.crashT < 1.1) drawTruck(ctx);
    parts.draw(ctx);
    ctx.restore();
  }

  function pointer(type, x, y, id) {
    if (type === 'down') ptrs.set(id, x > view.W / 2 ? 'gas' : 'brake');
    if (type === 'up') ptrs.delete(id);
    const vals = [...ptrs.values()];
    g.gas = vals.includes('gas'); g.brake = vals.includes('brake');
  }
  return {
    update, draw, resize, pointer,
    setControl(name, on) { if (name === 'gas') g.gas = on; if (name === 'brake') g.brake = on; },
    refill(frac) { g.fuel = Math.min(cap, g.fuel + frac * cap); g.warned = false; PUM.audio.sfx('refuel'); },
    refillTarget: () => g.fuel >= cap * .999,
    level: () => g.fuel / cap,
    resumeFromRefill() { if (g.state === 'wait') g.state = 'play'; },
    onPause() { PUM.audio.engineSet(0, 0); },
    onStart() { PUM.audio.engineOn(); },
    onStop() { PUM.audio.engineOff(); },
    controls: 'drive',
  };
};
})();
