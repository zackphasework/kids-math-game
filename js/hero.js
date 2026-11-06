/* Power-Up Math: Sky Run. Side-scrolling runner with a boss fight. Energy comes from math. */
(function () {
'use strict';
const {clamp, lerp, mulberry32} = PUM.util;
const E = PUM.engine, C = E.col;
PUM.games = PUM.games || {};

PUM.games.anime = function (o) {
  const {player, stats, assist, level, api} = o;
  const world = PUM.WORLDS[level % PUM.WORLDS.length], lap = Math.floor(level / PUM.WORLDS.length);
  const rand = mulberry32(5150 + level * 104729);
  const speed0 = [300, 255, 205][assist] + Math.min(level, 8) * 8;
  const GRAV = 2400, jumpV = 820 + stats.spec * 38, canDouble = stats.spec >= 1 || assist >= 1;
  const L = Math.min(5200 + level * 900, 11000);
  const heroInfo = PUM.HEROES[player.hero] || PUM.HEROES[0];
  const shirt = PUM.util.cssVar(player.color), worldCol = PUM.util.cssVar(world.color);

  /* ---------- level ---------- */
  const segs = [], obs = [], orbs = [], deco = [];
  const lastG = () => { for (let i = segs.length - 1; i >= 0; i--) if (!segs[i].plat) return segs[i]; return segs[0]; };
  let x = 0;
  segs.push({x0:-400, x1:700, y:0});
  x = 700;
  const gapMax = [190, 150, 105][assist];
  while (x < L) {
    const r = rand(), cl = 420 + rand() * 160;
    if (r < .26) {
      const gw = 70 + rand() * (gapMax - 70) + Math.min(level, 6) * 6;
      for (let i = 0; i < 5; i++) { const t = i / 4; orbs.push({x:x + 40 + t * gw, y:-90 - Math.sin(t * Math.PI) * 90, taken:false}); }
      lastG().x1 = x; x += gw; segs.push({x0:x, x1:x + cl, y:0}); x += cl;
    } else if (r < .46) {
      obs.push({x:x + cl * .5, y:0, w:40, h:38, type:'rock'});
      orbs.push({x:x + cl * .5, y:-150, taken:false});
      x += cl; lastG().x1 = x;
    } else if (r < .62 && level + (2 - assist) > 0) {
      obs.push({x:x + cl * .5, y:-48, w:56, h:34, type:'bat', ph:rand() * 6});
      for (let i = 0; i < 3; i++) orbs.push({x:x + cl * .5 - 40 + i * 40, y:-16, taken:false});
      x += cl; lastG().x1 = x;
    } else if (r < .76) {
      obs.push({x:x + cl * .5, y:0, w:66, h:26, type:'spikes'});
      x += cl; lastG().x1 = x;
    } else if (r < .9) {
      const py = -92, pw = 260;
      segs.push({x0:x + 80, x1:x + 80 + pw, y:py, plat:true});
      for (let i = 0; i < 5; i++) orbs.push({x:x + 110 + i * 50, y:py - 36, taken:false});
      x += cl + 120; lastG().x1 = x;
    } else {
      for (let i = 0; i < 6; i++) orbs.push({x:x + 80 + i * 45, y:-40 - Math.sin(i / 5 * Math.PI) * 60, taken:false});
      x += cl; lastG().x1 = x;
    }
  }
  lastG().x1 = L + 3000;
  for (let dx = 0; dx < L + 1500; dx += 90 + rand() * 200) deco.push({x:dx, kind:rand() < .5 ? 'grass' : rand() < .5 ? 'flower' : 'stone', s:.7 + rand() * .6});
  const islands = Array.from({length:14}, (_, i) => ({x:i * 520 + rand() * 200, y:-260 - rand() * 160, w:120 + rand() * 120}));
  const peaks = Array.from({length:30}, (_, i) => ({x:i * 260 + rand() * 120, h:160 + rand() * 180, w:260 + rand() * 200}));

  const cap = 100 * (1 + .3 * stats.cap);
  const hpMax = 3 + (assist ? 2 : 0);
  const bossHp = 8 + Math.min(level, 10) * 3 + lap * 4;
  const h = {x:0, y:0, vy:0, ground:true, jumps:0, slide:0, inv:0, hearts:hpMax, run:0, safeX:0};
  const g = {state:'run', t:0, energy:cap, orbs:0, charge:0, mp:0, shake:0, speed:speed0, cam:{x:-200, y:0}, hudT:0, msgT:0, msg:'', boss:null, beams:[], shots:[], warned:false, slowT:0, introT:1.2};
  const parts = E.Particles();
  let view = {W:0, H:0, s:1};

  function groundAt(px, py, vy) {
    let best = null;
    for (const s of segs) if (px >= s.x0 - 10 && px <= s.x1 + 10) {
      if (s.plat) { if (vy >= 0 && py <= s.y + 24 && py >= s.y - 4) { if (best === null || s.y < best) best = s.y; } }
      else if (py >= s.y - 2 && py <= s.y + 40 && (best === null || s.y < best)) best = s.y;
    }
    return best;
  }
  function say(m, t = 1.2) { g.msg = m; g.msgT = t; }
  function hurt(src) {
    if (h.inv > 0) return;
    h.hearts--; h.inv = 1.6; g.shake = 10; PUM.audio.sfx('hurt');
    parts.burst(h.x, h.y - 40, 14, {speed:220, color:['#FFFFFF', worldCol, '#E8577A'], size:5, life:.6});
    if (h.hearts <= 0) { g.state = 'ko'; say('Knocked out!', 2); setTimeout(() => api.needRefuel('revive'), 700); }
    else api.toast(src === 'fall' ? 'Oops, fell! Lost a heart' : 'Ouch! Lost a heart');
  }
  function jump() {
    if (g.state !== 'run' && g.state !== 'boss') return;
    if (h.ground) { h.vy = -jumpV; h.ground = false; h.jumps = 1; h.slide = 0; PUM.audio.sfx('jump'); parts.burst(h.x, h.y, 6, {speed:80, angle:Math.PI, spread:1.6, color:'rgba(255,255,255,.8)', size:4, life:.4}); }
    else if (canDouble && h.jumps < 2) { h.vy = -jumpV * .85; h.jumps = 2; PUM.audio.sfx('jump'); parts.burst(h.x, h.y - 20, 10, {speed:120, color:[worldCol, '#FFFFFF'], size:4, shape:'star', life:.5}); }
  }
  function slide() { if ((g.state === 'run' || g.state === 'boss') && h.ground) { h.slide = .62; PUM.audio.sfx('tap'); } else if (!h.ground) h.vy = Math.max(h.vy, 600); }
  function blast() {
    if (g.state !== 'boss' || !g.boss || g.boss.hp <= 0) return;
    if (g.charge < 1) { api.toast('Collect orbs to charge a blast!'); return; }
    g.charge--;
    const dmg = 1 + Math.floor(stats.str * .6);
    g.beams.push({t:.45, dmg});
    PUM.audio.sfx('blast'); g.shake = 6;
    setTimeout(() => {
      if (!g.boss) return;
      g.boss.hp = Math.max(0, g.boss.hp - dmg); g.boss.flash = .3;
      parts.burst(g.boss.x - 40, g.boss.y, 22, {speed:300, color:['#FFC233', '#FFFFFF', worldCol], size:6, shape:'star', life:.7});
      if (g.boss.hp <= 0) bossDown();
    }, 220);
  }
  function bossDown() {
    g.state = 'win'; g.winT = 0; PUM.audio.sfx('fanfare'); say(`${world.boss} defeated!`, 3);
    for (let i = 0; i < 4; i++) setTimeout(() => { if (g.boss) parts.burst(g.boss.x + (Math.random() - .5) * 120, g.boss.y + (Math.random() - .5) * 100, 30, {speed:360, color:['#FFC233', '#FFFFFF', worldCol, '#E8577A'], size:7, life:1, shape:'star'}); PUM.audio.sfx('thud'); }, i * 220);
  }

  function update(dt) {
    g.t += dt; if (g.msgT > 0) g.msgT -= dt; if (g.shake > 0) g.shake = Math.max(0, g.shake - dt * 25);
    if (h.inv > 0) h.inv -= dt;
    if (g.introT > 0) { g.introT -= dt; if (g.introT <= 0) say('Go!', .8); }
    parts.update(dt);
    for (const b of g.beams) b.t -= dt; g.beams = g.beams.filter(b => b.t > 0);
    if (g.state === 'win') { g.winT += dt; if (g.winT > 2.6) { g.state = 'done'; api.finish({cleared:true, orbs:g.orbs, mp:g.mp, world}); } updateCam(dt); return; }
    if (g.state === 'done' || g.state === 'wait' || g.state === 'ko') { updateCam(dt); return; }
    if (g.introT > 0) { updateCam(dt); return; }
    const inBoss = g.state === 'boss';
    let vx = inBoss ? 0 : g.speed;
    if (g.energy <= 0) { g.slowT += dt; vx *= clamp(1 - g.slowT, 0, 1); if (g.slowT > 1) { g.state = 'wait'; g.slowT = 0; api.needRefuel('energy'); return; } }
    else g.energy = Math.max(0, g.energy - (inBoss ? 3.5 : 6.5) * dt);
    if (g.energy / cap < .2 && !g.warned && g.energy > 0) { g.warned = true; api.toast('Energy is low!'); }
    h.x += vx * dt; h.run += vx * dt;
    if (inBoss) h.x = lerp(h.x, L + 160, Math.min(1, dt * 2));
    h.vy += GRAV * dt; const ny = h.y + h.vy * dt;
    const gy = groundAt(h.x, ny, h.vy);
    if (gy !== null && h.vy >= 0 && ny >= gy) { if (!h.ground && h.vy > 900) g.shake = 3; h.y = gy; h.vy = 0; h.ground = true; h.jumps = 0; if (!segs.find(s => s.plat && h.x >= s.x0 && h.x <= s.x1 && s.y === gy)) h.safeX = h.x; }
    else { h.y = ny; h.ground = false; }
    if (h.slide > 0) h.slide -= dt;
    if (h.y > 420) { hurt('fall'); if (g.state !== 'ko') { h.x = h.safeX - 40; h.y = -10; h.vy = 0; } }
    const hh = h.slide > 0 ? 34 : 70, hx0 = h.x - 14, hx1 = h.x + 14, hy0 = h.y - hh, hy1 = h.y;
    for (const ob of obs) {
      const oy0 = ob.y - ob.h, oy1 = ob.y + (ob.type === 'bat' ? 0 : 0), bob = ob.type === 'bat' ? Math.sin(g.t * 4 + ob.ph) * 6 : 0;
      if (hx1 > ob.x - ob.w / 2 + 6 && hx0 < ob.x + ob.w / 2 - 6 && hy1 > oy0 + bob + 6 && hy0 < oy1 + bob - 4) hurt('hit');
    }
    for (const orb of orbs) if (!orb.taken && Math.abs(orb.x - h.x) < 32 && Math.abs(orb.y - (h.y - hh / 2)) < 46) {
      orb.taken = true; g.orbs++; PUM.audio.sfx('coin');
      if (g.orbs % 5 === 0) { g.charge++; g.mp++; api.addMp(1); }
      parts.burst(orb.x, orb.y, 8, {speed:120, color:['#FFFFFF', worldCol, '#FFC233'], size:4, shape:'star', life:.5});
    }
    if (!inBoss && h.x >= L) { g.state = 'boss'; g.charge = Math.max(g.charge, 2); g.boss = {x:L + 160 + Math.min(560, (view.W / (view.s || 1)) * .58), y:-170, hp:bossHp, max:bossHp, t:0, next:1.8, flash:0, warn:0, kind:null}; PUM.audio.sfx('boss'); say(`${world.boss}!`, 1.8); }
    if (g.boss && g.state === 'boss') bossUpdate(dt);
    if (!inBoss && Math.random() < .3 && h.ground) parts.add({x:h.x - 12, y:h.y, vx:-60, vy:-30, life:.35, size:3, color:'rgba(255,255,255,.6)'});
    updateCam(dt);
    g.hudT -= dt;
    if (g.hudT <= 0) { g.hudT = .1; api.hud({energy:g.energy / cap, hearts:h.hearts, max:hpMax, orbs:g.orbs, charge:g.charge, boss:g.state === 'boss', progress:clamp(h.x / L, 0, 1)}); }
  }
  function bossUpdate(dt) {
    const b = g.boss; b.t += dt; b.y = -170 + Math.sin(b.t * 1.6) * 30; if (b.flash > 0) b.flash -= dt;
    b.next -= dt;
    const gap = Math.max(1.1, 2.2 - level * .08 - (2 - assist) * .2);
    if (b.next <= .55 && !b.kind) { b.kind = rand() < .5 ? 'low' : 'high'; b.warn = .55; }
    if (b.warn > 0) b.warn -= dt;
    if (b.next <= 0) {
      g.shots.push({x:b.x - 60, y:b.kind === 'low' ? -22 : -58, vx:-(330 + level * 12 - assist * 50), kind:b.kind});
      b.kind = null; b.next = gap;
    }
    if (Math.random() < dt * .45) orbs.push({x:h.x + 260 + Math.random() * 120, y:-60 - Math.random() * 90, taken:false, drift:true});
    for (const orb of orbs) if (orb.drift && !orb.taken) orb.x -= 120 * dt;
    const hh = h.slide > 0 ? 34 : 70;
    for (const s of g.shots) {
      s.x += s.vx * dt;
      if (!s.hit && Math.abs(s.x - h.x) < 26 && s.y > h.y - hh - 12 && s.y < h.y + 4) { s.hit = true; hurt('hit'); }
    }
    g.shots = g.shots.filter(s => s.x > h.x - 600 && !s.hit);
  }
  function updateCam(dt) {
    const s = view.s || 1;
    g.cam.x = h.x - view.W * .28 / s;
    if (g.state === 'boss' || g.state === 'win') g.cam.x = lerp(g.cam.x, L + 160 - view.W * .22 / s, .5);
    g.cam.y = lerp(g.cam.y, Math.min(0, (h.y + 30) * .5), Math.min(1, dt * 3));
  }

  /* ---------- drawing ---------- */
  function resize(W, H) { view = {W, H, s:Math.min(H / 520, W / 430)}; }
  function drawHero(ctx) {
    if (h.inv > 0 && Math.floor(h.inv * 12) % 2) return;
    const sl = h.slide > 0, ph = h.run * .045, air = !h.ground;
    ctx.save(); ctx.translate(h.x, h.y);
    if (g.beams.length || g.state === 'win') { ctx.fillStyle = 'rgba(255,214,84,.35)'; ctx.beginPath(); ctx.ellipse(0, -38, 44, 52, 0, 0, 7); ctx.fill(); }
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const body = sl ? {hip:-16, neck:-34, head:-46} : {hip:-28, neck:-52, head:-68};
    const legA = sl ? 0 : air ? .7 : Math.sin(ph) * .9, legB = sl ? 0 : air ? -.4 : -Math.sin(ph) * .9;
    const leg = (a, col) => { ctx.strokeStyle = C('ink'); ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(0, body.hip); if (sl) ctx.lineTo(26, body.hip + 10); else ctx.lineTo(Math.sin(a) * 18, body.hip + Math.cos(a) * 26); ctx.stroke(); ctx.strokeStyle = col; ctx.lineWidth = 5; ctx.stroke(); };
    leg(legB, '#3A3F55');
    const sw = Math.sin(g.t * 14) * 4;
    ctx.fillStyle = C('rose'); ctx.strokeStyle = C('ink'); ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(-4, body.neck + 2); ctx.quadraticCurveTo(-26, body.neck - 2 + sw, -44, body.neck + 6 - sw); ctx.lineTo(-42, body.neck + 14 - sw); ctx.quadraticCurveTo(-24, body.neck + 8 + sw, -2, body.neck + 9); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = shirt; E.rr(ctx, -13, body.neck, 26, body.hip - body.neck + 4, 8); ctx.fill(); ctx.stroke();
    leg(legA, '#4A5070');
    const armA = sl ? -1.2 : air ? -2.2 : -Math.sin(ph) * 1.1;
    ctx.strokeStyle = C('ink'); ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(2, body.neck + 6); ctx.lineTo(2 + Math.sin(armA) * 18 + (g.beams.length ? 14 : 0), body.neck + 6 + Math.cos(armA) * 18 - (g.beams.length ? 12 : 0)); ctx.stroke();
    ctx.strokeStyle = shirt; ctx.lineWidth = 4; ctx.stroke();
    const hy = body.head;
    ctx.lineWidth = 2.5; ctx.strokeStyle = C('ink');
    const hair = C(heroInfo.hair), skin = C(heroInfo.skin);
    if (player.hero === 0) { ctx.fillStyle = hair; ctx.beginPath(); ctx.moveTo(-18, hy + 2); ctx.lineTo(-30, hy - 6); ctx.lineTo(-20, hy - 12); ctx.lineTo(-26, hy - 24); ctx.lineTo(-12, hy - 20); ctx.lineTo(-8, hy - 32); ctx.lineTo(2, hy - 20); ctx.lineTo(12, hy - 28); ctx.lineTo(14, hy - 14); ctx.lineTo(20, hy - 4); ctx.closePath(); ctx.fill(); ctx.stroke(); }
    if (player.hero === 1) { ctx.fillStyle = hair; for (const bx of [-12, 10]) { ctx.beginPath(); ctx.arc(bx, hy - 18, 8, 0, 7); ctx.fill(); ctx.stroke(); } ctx.beginPath(); ctx.moveTo(-16, hy); ctx.quadraticCurveTo(-24, hy + 18, -18, hy + 22); ctx.lineTo(-12, hy + 2); ctx.closePath(); ctx.fill(); ctx.stroke(); }
    ctx.fillStyle = skin; ctx.beginPath(); ctx.arc(0, hy, 17, 0, 7); ctx.fill(); ctx.stroke();
    ctx.fillStyle = hair;
    if (player.hero === 0) { ctx.beginPath(); ctx.moveTo(-17, hy - 2); ctx.quadraticCurveTo(-10, hy - 20, 6, hy - 17); ctx.quadraticCurveTo(16, hy - 14, 17, hy - 4); ctx.lineTo(10, hy - 9); ctx.lineTo(4, hy - 5); ctx.lineTo(-2, hy - 11); ctx.lineTo(-8, hy - 5); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillStyle = C('rose'); ctx.fillRect(-17, hy - 10, 34, 5); ctx.strokeRect(-17, hy - 10, 34, 5); ctx.beginPath(); ctx.moveTo(-16, hy - 8); ctx.lineTo(-30, hy - 4 + sw * .6); ctx.lineTo(-28, hy + 2 + sw * .6); ctx.closePath(); ctx.fill(); ctx.stroke(); }
    else if (player.hero === 1) { ctx.beginPath(); ctx.moveTo(-17, hy); ctx.quadraticCurveTo(-14, hy - 20, 4, hy - 18); ctx.quadraticCurveTo(17, hy - 14, 17, hy - 2); ctx.quadraticCurveTo(10, hy - 10, 4, hy - 9); ctx.quadraticCurveTo(-4, hy - 4, -8, hy - 10); ctx.quadraticCurveTo(-12, hy - 4, -17, hy); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillStyle = C('star'); E.starPath(ctx, 10, hy - 13, 5, 2.2, 5); ctx.fill(); }
    else { ctx.beginPath(); ctx.moveTo(-17, hy + 2); ctx.quadraticCurveTo(-18, hy - 20, 2, hy - 19); ctx.quadraticCurveTo(18, hy - 16, 17, hy); ctx.lineTo(12, hy - 6); ctx.lineTo(6, hy - 10); ctx.lineTo(0, hy - 5); ctx.lineTo(-6, hy - 10); ctx.lineTo(-12, hy - 4); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillStyle = C('metal'); E.rr(ctx, -14, hy - 15, 28, 8, 4); ctx.fill(); ctx.stroke(); ctx.fillStyle = C('glass'); ctx.beginPath(); ctx.arc(-4, hy - 11, 2.6, 0, 7); ctx.arc(7, hy - 11, 2.6, 0, 7); ctx.fill(); }
    const iris = C(heroInfo.iris);
    for (const ex of [2, 11]) { ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.ellipse(ex, hy + 1, 3.8, 5.2, 0, 0, 7); ctx.fill(); ctx.lineWidth = 1.5; ctx.stroke(); ctx.fillStyle = iris; ctx.beginPath(); ctx.ellipse(ex + .8, hy + 1.6, 2.6, 3.8, 0, 0, 7); ctx.fill(); ctx.fillStyle = C('ink'); ctx.beginPath(); ctx.arc(ex + 1, hy + 2, 1.4, 0, 7); ctx.fill(); ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(ex - .4, hy - .6, 1.1, 0, 7); ctx.fill(); }
    ctx.strokeStyle = C('ink'); ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(4, hy + 9); ctx.quadraticCurveTo(8, hy + 11, 12, hy + 8); ctx.stroke();
    ctx.restore();
  }
  function drawBoss(ctx) {
    const b = g.boss; if (!b) return;
    const gone = g.state === 'win' ? clamp(g.winT / 1.2, 0, 1) : 0;
    ctx.save(); ctx.translate(b.x, b.y); ctx.scale(1 - gone * .9, 1 - gone * .9); ctx.rotate(gone * 2);
    const base = E.shade(worldCol, -.35), dark = E.shade(worldCol, -.6);
    ctx.strokeStyle = C('ink'); ctx.lineWidth = 4; ctx.lineJoin = 'round';
    for (let i = 0; i < 5; i++) { const tx = -60 + i * 30, w = Math.sin(b.t * 3 + i) * 14; ctx.fillStyle = dark; ctx.beginPath(); ctx.moveTo(tx - 10, 50); ctx.quadraticCurveTo(tx + w, 110, tx + w * 1.5, 140); ctx.quadraticCurveTo(tx + 10 + w, 100, tx + 12, 50); ctx.closePath(); ctx.fill(); ctx.stroke(); }
    ctx.fillStyle = b.flash > 0 ? '#FFFFFF' : base; ctx.beginPath();
    for (let i = 0; i <= 28; i++) { const a = i / 28 * Math.PI * 2, r = 96 + Math.sin(b.t * 4 + i * 1.7) * 6 + (i % 2 ? 0 : 8); ctx[i ? 'lineTo' : 'moveTo'](Math.cos(a) * r, Math.sin(a) * r * .86); }
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = dark; ctx.globalAlpha = .4; ctx.beginPath(); ctx.ellipse(10, 30, 60, 30, 0, 0, 7); ctx.fill(); ctx.globalAlpha = 1;
    const look = clamp((h.x - b.x) / 400, -1, 1) * 6, glow = b.warn > 0;
    for (const ex of [-34, 22]) {
      ctx.fillStyle = glow ? '#FFE07A' : '#FFFFFF'; ctx.beginPath(); ctx.ellipse(ex, -14, 20, 22, 0, 0, 7); ctx.fill(); ctx.stroke();
      ctx.fillStyle = C('ink'); ctx.beginPath(); ctx.arc(ex + look, -8, 9, 0, 7); ctx.fill();
      ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(ex - 22, -44 + (ex < 0 ? 0 : 10)); ctx.lineTo(ex + 18, -34 + (ex < 0 ? 10 : 0)); ctx.stroke(); ctx.lineWidth = 4;
    }
    ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.moveTo(-40, 30);
    for (let i = 0; i <= 8; i++) ctx.lineTo(-40 + i * 10, 30 + (i % 2 ? 10 : 0));
    ctx.quadraticCurveTo(0, 62, -40, 30); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
    if (b.warn > 0) {
      const wy = b.kind === 'low' ? -22 : -58;
      E.outlineText(ctx, b.kind === 'low' ? 'JUMP!' : 'SLIDE!', h.x + 70, wy - 60, 28, '#FFC233');
    }
  }
  function draw(ctx, W, H) {
    if (view.W !== W || view.H !== H) resize(W, H);
    const s = view.s;
    const sky = ctx.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, world.sky[0]); sky.addColorStop(1, world.sky[1]);
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.beginPath(); ctx.arc(W * .8, H * .15, Math.min(W, H) * .07, 0, 7); ctx.fill();
    const baseY = H * .72;
    ctx.fillStyle = E.shade(world.hills, .35); ctx.beginPath(); ctx.moveTo(0, H);
    for (const p of peaks) { const px = (p.x - g.cam.x * .15) * s; const xx = ((px % (W + 600)) + W + 600) % (W + 600) - 300; ctx.moveTo(xx - p.w * s / 2, baseY); ctx.lineTo(xx, baseY - p.h * s); ctx.lineTo(xx + p.w * s / 2, baseY); }
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.7)';
    for (let i = 0; i < 6; i++) { const cx = ((i * 330 - g.cam.x * .08 * s + g.t * 8) % (W + 300) + W + 300) % (W + 300) - 150, cy = H * (.12 + (i % 3) * .08); ctx.beginPath(); ctx.ellipse(cx, cy, 50, 14, 0, 0, 7); ctx.ellipse(cx + 26, cy - 10, 28, 14, 0, 0, 7); ctx.fill(); }
    for (const isl of islands) {
      const px = (isl.x - g.cam.x * .35) * s, xx = ((px % (W + 800)) + W + 800) % (W + 800) - 300, yy = baseY + (isl.y - g.cam.y * .35) * s * .6;
      ctx.fillStyle = E.shade(world.ground, .1); ctx.beginPath(); ctx.moveTo(xx - isl.w * s / 2, yy); ctx.lineTo(xx + isl.w * s / 2, yy); ctx.lineTo(xx + isl.w * s * .15, yy + isl.w * s * .5); ctx.closePath(); ctx.fill();
      ctx.fillStyle = E.shade(world.hills, .1); ctx.fillRect(xx - isl.w * s / 2, yy - 8 * s, isl.w * s, 10 * s);
    }
    const sh = g.shake ? (Math.random() - .5) * g.shake : 0;
    ctx.save(); ctx.translate(sh, H * .72 + sh * .5); ctx.scale(s, s); ctx.translate(-g.cam.x, -g.cam.y);
    const x0 = g.cam.x - 60, x1 = g.cam.x + W / s + 60;
    for (const sg of segs) {
      if (sg.x1 < x0 || sg.x0 > x1) continue;
      const a = Math.max(sg.x0, x0 - 40), b = Math.min(sg.x1, x1 + 40), depth = sg.plat ? 34 : 600;
      ctx.fillStyle = world.ground; ctx.strokeStyle = C('ink'); ctx.lineWidth = 4;
      E.rr(ctx, a, sg.y, b - a, depth, sg.plat ? 12 : 10); ctx.fill(); ctx.stroke();
      ctx.fillStyle = E.shade(world.ground, -.2);
      for (let xx = Math.ceil(a / 60) * 60; xx < b - 20; xx += 60) { ctx.beginPath(); ctx.ellipse(xx + 20, sg.y + 40 + (xx % 120 ? 20 : 0), 10, 6, 0, 0, 7); ctx.fill(); }
      ctx.fillStyle = world.hills; E.rr(ctx, a - 2, sg.y - 6, b - a + 4, 16, 8); ctx.fill(); ctx.stroke();
    }
    for (const d of deco) {
      if (d.x < x0 || d.x > x1) continue;
      const gy = groundAt(d.x, 0, 0); if (gy === null) continue;
      if (d.kind === 'grass') { ctx.strokeStyle = E.shade(world.hills, -.3); ctx.lineWidth = 3; ctx.beginPath(); for (let k = -1; k <= 1; k++) { ctx.moveTo(d.x + k * 5, gy - 4); ctx.lineTo(d.x + k * 9, gy - 18 * d.s); } ctx.stroke(); }
      else if (d.kind === 'flower') { ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(d.x, gy - 14 * d.s, 4, 0, 7); ctx.fill(); ctx.fillStyle = C('star'); ctx.beginPath(); ctx.arc(d.x, gy - 14 * d.s, 1.8, 0, 7); ctx.fill(); }
      else { ctx.fillStyle = 'rgba(0,0,0,.15)'; ctx.beginPath(); ctx.ellipse(d.x, gy - 3, 9 * d.s, 5 * d.s, 0, Math.PI, 0); ctx.fill(); }
    }
    for (const ob of obs) {
      if (ob.x < x0 - 80 || ob.x > x1 + 80) continue;
      ctx.strokeStyle = C('ink'); ctx.lineWidth = 3.5; ctx.lineJoin = 'round';
      if (ob.type === 'rock') { ctx.fillStyle = '#9AA0AA'; ctx.beginPath(); ctx.moveTo(ob.x - 24, ob.y); ctx.lineTo(ob.x - 18, ob.y - 30); ctx.lineTo(ob.x + 2, ob.y - 40); ctx.lineTo(ob.x + 22, ob.y - 26); ctx.lineTo(ob.x + 26, ob.y); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.moveTo(ob.x - 12, ob.y - 28); ctx.lineTo(ob.x, ob.y - 34); ctx.lineTo(ob.x - 6, ob.y - 18); ctx.fill(); }
      else if (ob.type === 'spikes') { ctx.fillStyle = worldCol; for (let k = 0; k < 4; k++) { const sx = ob.x - 30 + k * 20; ctx.beginPath(); ctx.moveTo(sx - 9, ob.y); ctx.lineTo(sx, ob.y - 28 - (k % 2) * 6); ctx.lineTo(sx + 9, ob.y); ctx.closePath(); ctx.fill(); ctx.stroke(); } }
      else { const bob = Math.sin(g.t * 4 + ob.ph) * 6, flap = Math.sin(g.t * 18) * 10, by = ob.y - ob.h / 2 + bob; ctx.fillStyle = '#3B2C5E'; ctx.beginPath(); ctx.moveTo(ob.x, by); ctx.lineTo(ob.x - 34, by - 10 - flap); ctx.lineTo(ob.x - 22, by + 6); ctx.lineTo(ob.x - 8, by + 2); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.moveTo(ob.x, by); ctx.lineTo(ob.x + 34, by - 10 - flap); ctx.lineTo(ob.x + 22, by + 6); ctx.lineTo(ob.x + 8, by + 2); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.arc(ob.x, by, 13, 0, 7); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#FFE07A'; ctx.beginPath(); ctx.arc(ob.x - 5, by - 2, 3, 0, 7); ctx.arc(ob.x + 5, by - 2, 3, 0, 7); ctx.fill(); }
    }
    for (const orb of orbs) {
      if (orb.taken || orb.x < x0 || orb.x > x1) continue;
      const oy = orb.y + Math.sin(g.t * 4 + orb.x * .01) * 5;
      ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.arc(orb.x, oy, 15, 0, 7); ctx.fill();
      ctx.fillStyle = worldCol; ctx.strokeStyle = C('ink'); ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(orb.x, oy, 9, 0, 7); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(orb.x - 3, oy - 3, 3, 0, 7); ctx.fill();
    }
    if (h.x > L - 900) {
      const px = L - 40; ctx.fillStyle = 'rgba(80,40,120,.25)'; ctx.beginPath(); ctx.ellipse(px, -80, 34 + Math.sin(g.t * 3) * 4, 80, 0, 0, 7); ctx.fill();
    }
    for (const s2 of g.shots) { ctx.fillStyle = 'rgba(160,90,255,.35)'; ctx.beginPath(); ctx.arc(s2.x, s2.y, 22, 0, 7); ctx.fill(); ctx.fillStyle = '#3B2C5E'; ctx.strokeStyle = C('ink'); ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(s2.x, s2.y, 13, 0, 7); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#C9A6FF'; ctx.beginPath(); ctx.arc(s2.x - 4, s2.y - 4, 4, 0, 7); ctx.fill(); }
    drawBoss(ctx);
    for (const bm of g.beams) {
      if (!g.boss) break;
      const k2 = bm.t / .45, x0b = h.x + 24, y0b = h.y - 50, x1b = g.boss.x - 70, y1b = g.boss.y;
      const grad = ctx.createLinearGradient(x0b, y0b, x1b, y1b); grad.addColorStop(0, '#FFFFFF'); grad.addColorStop(1, '#FFC233');
      ctx.strokeStyle = grad; ctx.lineCap = 'round'; ctx.lineWidth = 26 * k2 + 4; ctx.globalAlpha = .9;
      ctx.beginPath(); ctx.moveTo(x0b, y0b); ctx.lineTo(x0b + (x1b - x0b) * Math.min(1, (1 - k2) * 3), y0b + (y1b - y0b) * Math.min(1, (1 - k2) * 3)); ctx.stroke(); ctx.globalAlpha = 1;
    }
    drawHero(ctx);
    parts.draw(ctx);
    ctx.restore();
    if (g.boss) {
      const b = g.boss, bw = Math.min(W - 40, 320);
      const T = 100;
      ctx.fillStyle = 'rgba(16,22,44,.8)'; E.rr(ctx, W / 2 - bw / 2 - 8, T, bw + 16, 44, 12); ctx.fill();
      ctx.fillStyle = '#4A2233'; E.rr(ctx, W / 2 - bw / 2, T + 24, bw, 12, 6); ctx.fill();
      if (b.hp > 0) { ctx.fillStyle = '#E8577A'; E.rr(ctx, W / 2 - bw / 2, T + 24, Math.max(12, bw * b.hp / b.max), 12, 6); ctx.fill(); }
      ctx.font = '800 14px Sniglet, sans-serif'; ctx.fillStyle = '#FFFFFF'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(world.boss, W / 2, T + 12);
    }
    if (g.introT > 0) E.outlineText(ctx, world.name, W / 2, H * .3, Math.min(40, W * .1), '#FFFFFF');
    if (g.msgT > 0) E.outlineText(ctx, g.msg, W / 2, H * .3, Math.min(46, W * .11), '#FFC233');
  }
  function pointer(type) { if (type === 'down') jump(); }
  return {
    update, draw, resize, pointer,
    setControl(name, on) { if (!on) return; if (name === 'jump') jump(); if (name === 'slide') slide(); if (name === 'blast') blast(); },
    refill(frac, reason) {
      if (reason === 'revive') { h.hearts = Math.max(h.hearts, 2); h.inv = 2; if (g.state === 'ko') { g.state = 'wait'; if (h.y > 300) { h.x = h.safeX; h.y = -10; h.vy = 0; } } }
      g.energy = Math.min(cap, g.energy + frac * cap); g.warned = false;
      if (g.boss && g.boss.hp > 0) g.charge++;
      PUM.audio.sfx('refuel');
    },
    refillTarget: reason => reason === 'revive' ? h.hearts >= 2 : g.energy >= cap * .999,
    level: () => g.energy / cap,
    resumeFromRefill() { if (g.state === 'wait' || g.state === 'ko') g.state = g.boss && g.boss.hp > 0 ? 'boss' : 'run'; },
    onStart() {}, onStop() {}, onPause() {},
    controls: 'run',
    _debug: () => ({h, g, L, obs, segs}),
  };
};
})();
