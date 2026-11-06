/* Power-Up Math: Striker Rush. Top-down attacking: drag to dribble past defenders, pass to the teammate whose
   shirt number answers the math question to break defensive walls, and shoot past the keeper. Score enough goals
   before full time. Boss levels have giant keepers and defenders; power shots come from correct math passes. */
(function () {
'use strict';
const {clamp, lerp, mulberry32} = PUM.util;
const E = PUM.engine;
PUM.games = PUM.games || {};

PUM.games.soccer = function (o) {
  const {player, assist, levelIndex, api} = o;
  const up = player.up;
  const LV = PUM.CAMPAIGN.soccer.levels[levelIndex], WD = PUM.CAMPAIGN.soccer.worlds[LV.world];
  const rand = mulberry32(3301 + levelIndex * 131 + Math.floor(Math.random() * 1000));
  const myCol = PUM.util.cssVar(player.color);
  const theirCol = ['#E8577A', '#2F95D6', '#7357DB', '#FF8A3D'][LV.world % 4] === myCol ? '#4A4F5C' : ['#E8577A', '#FF8A3D', '#1D2540'][LV.world];
  const FW = 320, GOALY = 1650, GW = 95, PR = 16, BR = 7;
  const speedP = (215 + up.speed * 24) * (assist >= 2 ? .9 : 1);
  const defMul = (assist >= 2 ? .6 : assist ? .8 : 1);
  const cap = 100 * (1 + .3 * up.stamina);
  const timeLimit = Math.round(LV.time * .8 * (1 + assist * .3));
  const g = {t:0, time:timeLimit, goals:0, state:'intro', introT:2, st:cap, power:0, mp:0, msg:'', msgT:0, shake:0, hudT:0, inv:0, passesOk:0, passes:0, tackled:0, resetT:0, joy:null, keys:{x:0, y:0}, celebrate:0, tired:false};
  const me = {x:0, y:80, vx:0, vy:0, fx:0, fy:-1, run:0};
  const ball = {x:0, y:60, vx:0, vy:0, owner:'me', z:0, vz:0};
  let defs = [], walls = [], mates = [], muds = [], keeper = null, pass = null, shot = null;
  const parts = E.Particles();

  function buildAttack() {
    defs = []; walls = []; mates = []; muds = []; pass = null; shot = null;
    Object.assign(me, {x:0, y:80, vx:0, vy:0}); Object.assign(ball, {x:0, y:96, vx:0, vy:0, owner:'me', z:0});
    const nw = LV.walls;
    for (let k = 0; k < nw; k++) walls.push({y:500 + (GOALY - 900) * (k + .5) / nw, done:false, active:false, q:null, opts:null, men:[-210, -70, 70, 210].map(x => ({x, ox:x, ph:rand() * 6}))});
    const types = [];
    for (const [k, n] of Object.entries(LV.def)) for (let i = 0; i < n; i++) types.push(k);
    types.sort(() => rand() - .5);
    const slots = [];
    for (let y = 330; y < GOALY - 260; y += 150) if (!walls.some(w => Math.abs(w.y - y) < 120)) slots.push(y);
    types.forEach((type, i) => {
      const y = slots[Math.floor((i + .5) * slots.length / types.length) % slots.length] + (rand() - .5) * 60;
      defs.push({type, x:(rand() * 2 - 1) * 200, y, hx:(rand() * 2 - 1) * 200, hy:y, ph:rand() * 6, state:'idle', t:0, big:false});
    });
    if (LV.boss && LV.world >= 1) for (const sx of [-60, 60]) defs.push({type:'block', x:sx, y:GOALY - 230, hx:sx, hy:GOALY - 230, ph:rand() * 6, state:'idle', t:0, big:true});
    if (LV.mud) for (let i = 0; i < 4; i++) muds.push({x:(rand() * 2 - 1) * 220, y:300 + rand() * (GOALY - 600), r:60 + rand() * 40});
    keeper = {x:0, y:GOALY - 18, w:LV.boss ? 54 + LV.world * 6 : 28, speed:(150 + levelIndex * 14) * (LV.boss ? 1.15 : 1) * (assist >= 2 ? .6 : assist ? .8 : 1), dive:0};
    if (levelIndex >= 1) defs.push({type:levelIndex >= 6 ? 'chaser' : 'block', x:(rand() * 2 - 1) * 80, y:GOALY - 330, hx:(rand() * 2 - 1) * 80, hy:GOALY - 330, ph:rand() * 6, state:'idle', t:0, big:false});
  }
  buildAttack();
  const say = (m, t = 1.4) => { g.msg = m; g.msgT = t; };
  function resetAttack(msg, delay = 1.3) { g.state = 'reset'; g.resetT = delay; if (msg) say(msg, delay + .2); }

  function inMud(x, y) { return muds.some(m => Math.hypot(x - m.x, y - m.y) < m.r); }
  function tackle(d) {
    if (g.inv > 0 || ball.owner !== 'me') return;
    const keep = Math.random() < up.dribble * .12 + assist * .15;
    if (keep) { g.inv = 1; say('Kept it!', 1); PUM.audio.sfx('jump'); return; }
    g.tackled++; g.shake = 8; PUM.audio.sfx('hurt');
    ball.owner = null; ball.vx = (Math.random() - .5) * 300; ball.vy = -200;
    parts.burst(me.x, me.y, 12, {speed:160, color:['#FFFFFF', '#6CBF5C'], size:4, life:.5});
    resetAttack('Tackled!');
  }
  function shoot(powered) {
    if (ball.owner !== 'me' || g.state !== 'play') return;
    const dist = GOALY - me.y;
    if (dist > 560) { api.toast('Get closer to the goal!'); return; }
    const far = keeper.x > me.x * .3 ? -1 : 1;
    const err = (dist / 560) * (90 - up.shot * 12) + 10;
    let tx = clamp(far * (GW - 24) + (Math.random() - .5) * 2 * err, -GW - 30, GW + 30);
    const sp = (560 + up.shot * 75) * (powered ? 1.6 : 1);
    const dx = tx - ball.x, dy = GOALY - ball.y, L = Math.hypot(dx, dy);
    ball.owner = null; ball.vx = dx / L * sp; ball.vy = dy / L * sp; ball.vz = 120; ball.z = 2;
    shot = {powered, t:0, react:(powered ? .45 : .14) + (assist ? .12 * assist : 0)};
    if (powered) { g.power = 0; say('POWER SHOT!', 1); }
    PUM.audio.sfx('kick');
  }
  function startWall(w) {
    w.active = true;
    const gq = PUM.gateQuestion(player, 3);
    w.q = gq.q; w.opts = gq.options;
    mates = [-125, 0, 125].map((x, i) => ({x, y:w.y + 110, num:gq.options[i]}));
    api.showQuestion(w.q, 'Tap the teammate with the right number!');
  }
  function doPass(m) {
    const w = walls.find(v => v.active && !v.done); if (!w || pass) return;
    pass = {from:{x:ball.x, y:ball.y}, to:m, t:0, ok:m.num === w.q.ans, w};
    ball.owner = null; PUM.audio.sfx('kick');
  }
  function finishPass() {
    const {ok, w, to} = pass; pass = null; w.done = true; w.active = false; g.passes++;
    const r = api.answer(ok, w.q); api.hideQuestion(ok);
    if (ok) {
      g.passesOk++; g.mp += r.mp;
      g.power = Math.min(1, g.power + .5 + .1 * up.pass);
      Object.assign(me, {x:to.x, y:to.y, vx:0, vy:0}); ball.owner = 'me';
      say(g.power >= 1 ? 'POWER SHOT ready!' : 'Great pass!', 1.3); PUM.audio.sfx('up');
      mates = [];
    } else {
      mates = []; PUM.audio.sfx('no');
      resetAttack(`Intercepted! It was ${w.q.ans}`, 1.8);
    }
  }
  function goal() {
    g.goals++; g.celebrate = 2; g.shake = 10; PUM.audio.sfx('goal');
    for (let i = 0; i < 40; i++) parts.add({x:(Math.random() - .5) * 400, y:GOALY - 40 - Math.random() * 60, vx:(Math.random() - .5) * 200, vy:-100 - Math.random() * 200, g:200, life:1.8, size:6, shape:'rect', vr:8, color:['#FFC233', '#E8577A', '#2F95D6', myCol, '#FFFFFF'][Math.floor(Math.random() * 5)], fade:false});
    if (g.goals >= LV.goals) { g.state = 'won'; say('YOU WIN!', 3); setTimeout(finishWin, 2400); }
    else resetAttack(`GOAL! ${LV.goals - g.goals} to go`, 2);
  }
  function finishWin() {
    PUM.audio.sfx('fanfare');
    const stars = 1 + (g.tackled <= 1 ? 1 : 0) + (g.passes === 0 || g.passesOk / g.passes >= .66 ? 1 : 0);
    api.finish({ok:true, stars, mp:g.mp, goals:g.goals});
  }

  function update(dt) {
    g.t += dt; if (g.msgT > 0) g.msgT -= dt; if (g.shake > 0) g.shake = Math.max(0, g.shake - dt * 25); if (g.inv > 0) g.inv -= dt; if (g.celebrate > 0) g.celebrate -= dt;
    parts.update(dt);
    if (g.state === 'intro') { g.introT -= dt; if (g.introT <= 0) { g.state = 'play'; PUM.audio.sfx('whistle'); say('Kick-off!', 1); } hud(dt); return; }
    if (g.state === 'wait' || g.state === 'over' || g.state === 'won') { ballPhys(dt); hud(dt); return; }
    g.time -= dt;
    if (g.time <= 0) { g.time = 0; g.state = 'over'; PUM.audio.sfx('whistle'); say('Full time!', 3); setTimeout(() => api.finish({ok:false, reason:'time', mp:g.mp, goals:g.goals}), 2000); hud(dt); return; }
    if (g.state === 'reset') { g.resetT -= dt; ballPhys(dt); defsUpdate(dt, true); if (g.resetT <= 0) { buildAttack(); g.state = 'play'; } hud(dt); return; }
    let ix = g.keys.x, iy = g.keys.y;
    if (g.joy) { const dx = g.joy.x - g.joy.x0, dy = g.joy.y - g.joy.y0, L = Math.hypot(dx, dy); if (L > 8) { ix = dx / Math.max(L, 50); iy = dy / Math.max(L, 50); } }
    const L = Math.hypot(ix, iy); if (L > 1) { ix /= L; iy /= L; }
    const tired = g.st <= 0;
    let sp = speedP * (tired ? .4 : 1) * (inMud(me.x, me.y) ? .55 : 1);
    const wallBlock = walls.find(w => !w.done && me.y > w.y - 150 && me.y < w.y + 30);
    if (wallBlock && !wallBlock.active && ball.owner === 'me') startWall(wallBlock);
    const slow = walls.some(w => w.active) && !pass ? .35 : 1;
    me.vx = lerp(me.vx, ix * sp * slow, Math.min(1, dt * 10)); me.vy = lerp(me.vy, -iy * sp * slow, Math.min(1, dt * 10));
    me.x = clamp(me.x + me.vx * dt, -FW + PR, FW - PR); me.y = clamp(me.y + me.vy * dt, 20, GOALY - 40);
    for (const w of walls) if (!w.done && me.y > w.y - 26) me.y = w.y - 26;
    const mv = Math.hypot(me.vx, me.vy);
    if (mv > 20) { me.fx = me.vx / mv; me.fy = me.vy / mv; me.run += mv * dt; }
    if (mv > 30) g.st = Math.max(0, g.st - 2.4 * dt * (100 / cap) * (cap / 100));
    if (g.st <= 0 && !g.tired) { g.tired = true; g.state = 'wait'; say('Out of stamina!', 2); api.needRefuel('stamina'); }
    if (ball.owner === 'me') { ball.x = lerp(ball.x, me.x + me.fx * 15, Math.min(1, dt * 18)); ball.y = lerp(ball.y, me.y + me.fy * 15, Math.min(1, dt * 18)); ball.z = 0; }
    defsUpdate(dt, false);
    if (pass) { pass.t += dt * 1.6; const t = Math.min(1, pass.t); ball.x = lerp(pass.from.x, pass.to.x, t); ball.y = lerp(pass.from.y, pass.to.y, t); ball.z = Math.sin(t * Math.PI) * 60; if (t >= 1) finishPass(); }
    ballPhys(dt);
    hud(dt);
  }
  function defsUpdate(dt, frozen) {
    const dm = defMul;
    for (const d of defs) {
      d.t += dt;
      const dist = Math.hypot(d.x - me.x, d.y - me.y);
      if (!frozen && g.state === 'play') {
        if (d.type === 'block') { d.x = d.hx + Math.sin(g.t * 1.4 * dm + d.ph) * (d.big ? 60 : 110); d.y = d.hy + Math.sin(g.t * .9 + d.ph) * 15; }
        else if (d.type === 'chaser') {
          if (dist < 330 && d.y > me.y - 40 && ball.owner === 'me') { const cs = (165 + levelIndex * 6) * dm; d.x += (me.x - d.x) / dist * cs * dt; d.y += (me.y - d.y) / dist * cs * dt; }
          else { d.x = lerp(d.x, d.hx, dt); d.y = lerp(d.y, d.hy, dt); }
        } else if (d.type === 'slider') {
          if (d.state === 'idle' && dist < 230 && d.y > me.y && ball.owner === 'me') { d.state = 'warn'; d.t = 0; d.tx = me.x; d.ty = me.y; }
          else if (d.state === 'warn' && d.t > .75 / Math.min(1.3, dm)) { d.state = 'slide'; d.t = 0; const dx = d.tx - d.x, dy = d.ty - d.y, L = Math.hypot(dx, dy) || 1; d.sx = dx / L; d.sy = dy / L; PUM.audio.sfx('kick'); }
          else if (d.state === 'slide') { d.x += d.sx * 520 * dt; d.y += d.sy * 520 * dt; if (d.t > .45) { d.state = 'rest'; d.t = 0; } }
          else if (d.state === 'rest' && d.t > 1.4) { d.state = 'idle'; d.hx = d.x; d.hy = d.y; }
        }
        const reach = PR + (d.big ? 26 : 14) + (d.state === 'slide' ? 8 : 0);
        if (dist < reach && ball.owner === 'me') tackle(d);
      }
    }
    for (const w of walls) for (const m of w.men) m.x = m.ox + Math.sin(g.t * 2 + m.ph) * 12;
    if (keeper) {
      const predX = shot && ball.vy > 1 ? ball.x + ball.vx * (keeper.y - ball.y) / ball.vy : ball.x;
      const target = shot ? (shot.t > shot.react ? clamp(predX, -GW + keeper.w / 2, GW - keeper.w / 2) : keeper.x) : clamp(ball.x * .5, -GW + keeper.w / 2, GW - keeper.w / 2);
      const ks = keeper.speed * (shot ? 1.5 : 1);
      keeper.x += clamp(target - keeper.x, -ks * dt, ks * dt);
    }
  }
  function ballPhys(dt) {
    if (ball.owner || pass) return;
    if (shot) shot.t += dt;
    ball.x += ball.vx * dt; ball.y += ball.vy * dt;
    ball.vz -= 400 * dt; ball.z = Math.max(0, ball.z + ball.vz * dt);
    const fr = shot ? .995 : .96; ball.vx *= Math.pow(fr, dt * 60); ball.vy *= Math.pow(fr, dt * 60);
    if (shot && ball.y >= keeper.y - 6 && !shot.done) {
      shot.done = true;
      if (Math.abs(ball.x - keeper.x) < keeper.w / 2 + BR + 4 && !(shot.powered && Math.random() < .75)) { ball.vy = -320; ball.vx = (ball.x - keeper.x) * 6; PUM.audio.sfx('save'); keeper.dive = .5; resetAttack('Saved!', 1.4); }
      else if (Math.abs(ball.x) < GW) { ball.vy *= .25; ball.vx *= .25; goal(); }
      else { resetAttack('Missed!', 1.3); }
    }
    if (shot && ball.y > GOALY + 30) { ball.vy = 0; ball.vx = 0; }
  }
  function hud(dt) {
    g.hudT -= dt; if (g.hudT > 0) return; g.hudT = .1;
    api.hud({fuel:g.st / cap, goals:g.goals, need:LV.goals, time:Math.ceil(g.time), power:g.power, canShoot:ball.owner === 'me' && GOALY - me.y < 560 && g.state === 'play'});
  }

  /* ---------- drawing ---------- */
  let W = 0, H = 0, s = 1, camY = 0, camX = 0;
  function resize(w, h) { W = w; H = h; s = Math.min(W / 470, H / 700); }
  const sx = x => W / 2 + (x - camX) * s, sy = y => H * .7 - (y - camY) * s;
  function person(ctx, x, y, col, num, opts = {}) {
    const r = (opts.big ? 26 : PR) * s * 1.45, X = sx(x), Y = sy(y);
    ctx.save(); ctx.translate(X, Y);
    ctx.fillStyle = 'rgba(0,0,0,.22)'; ctx.beginPath(); ctx.ellipse(r * .2, r * .5, r * 1.05, r * .6, 0, 0, 7); ctx.fill();
    const legs = Math.sin((opts.run || 0) * .08) * r * .45;
    ctx.strokeStyle = '#1D2540'; ctx.lineWidth = r * .32; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-r * .35, 0); ctx.lineTo(-r * .35, -legs - r * .2); ctx.moveTo(r * .35, 0); ctx.lineTo(r * .35, legs - r * .2); ctx.stroke();
    ctx.fillStyle = col; ctx.strokeStyle = '#1D2540'; ctx.lineWidth = Math.max(2, r * .14);
    ctx.beginPath(); ctx.ellipse(0, 0, r, r * .78, 0, 0, 7); ctx.fill(); ctx.stroke();
    ctx.fillStyle = opts.skin || '#D9A27B'; ctx.beginPath(); ctx.arc(0, -r * .1, r * .45, 0, 7); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#2A2440'; ctx.beginPath(); ctx.arc(0, -r * .2, r * .45, Math.PI * 1.1, Math.PI * 1.9); ctx.closePath(); ctx.fill();
    if (num != null) { const t = String(num), fs = Math.max(24, r * 1.5); ctx.font = `800 ${fs}px Sniglet, sans-serif`; const bw = Math.max(fs * 1.3, ctx.measureText(t).width + fs * .6); ctx.fillStyle = '#FFFFFF'; ctx.strokeStyle = '#1D2540'; ctx.lineWidth = 3; E.rr(ctx, -bw / 2, -r * 1.3 - fs * 1.2, bw, fs * 1.2, fs * .35); ctx.fill(); ctx.stroke(); E.outlineText(ctx, t, 0, -r * 1.3 - fs * .58, fs, '#FFC233', '#1D2540'); }
    if (opts.ring) { ctx.strokeStyle = opts.ring; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(0, 0, r * 1.5 + Math.sin(g.t * 8) * 2, 0, 7); ctx.stroke(); }
    ctx.restore();
  }
  function draw(ctx, w, h) {
    if (w !== W || h !== H) resize(w, h);
    const aw = walls.find(v => v.active && !v.done);
    const cy = aw ? aw.y + 110 - (H * .3) / s : Math.min(me.y + 150, GOALY - (H * .7 - 150) / s + 40);
    camY = lerp(camY, cy, .12);
    const halfView = W / 2 / s; camX = lerp(camX, aw ? 0 : clamp(me.x, -FW - 10 + halfView, FW + 10 - halfView), .15);
    const sh = g.shake ? (Math.random() - .5) * g.shake : 0;
    ctx.save(); ctx.translate(sh, 0);
    ctx.fillStyle = LV.rain ? '#2F6B3A' : '#3F9E4D'; ctx.fillRect(0, 0, W, H);
    for (let y = Math.floor((camY - 900) / 120) * 120; y < camY + 900; y += 120) if (Math.floor(y / 120) % 2 === 0) { ctx.fillStyle = LV.rain ? '#357642' : '#48AE57'; ctx.fillRect(0, sy(y + 120), W, 120 * s); }
    ctx.fillStyle = '#2A3A6B'; ctx.fillRect(0, 0, sx(-FW - 6), H); ctx.fillRect(sx(FW + 6), 0, W, H);
    ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 3;
    ctx.strokeRect(sx(-FW), sy(GOALY + 2000), (FW * 2) * s, (GOALY + 2000 - (-200)) * s);
    ctx.beginPath(); ctx.moveTo(sx(-FW), sy(GOALY)); ctx.lineTo(sx(FW), sy(GOALY)); ctx.stroke();
    ctx.strokeRect(sx(-200), sy(GOALY), 400 * s, 280 * s); ctx.strokeRect(sx(-120), sy(GOALY), 240 * s, 110 * s);
    ctx.beginPath(); ctx.arc(sx(0), sy(GOALY - 200), 4, 0, 7); ctx.fillStyle = '#FFFFFF'; ctx.fill();
    ctx.beginPath(); ctx.arc(sx(0), sy(GOALY - 280), 70 * s, Math.PI * .15, Math.PI * .85); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(sx(-GW), sy(GOALY + 40), GW * 2 * s, 40 * s);
    ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 1; for (let i = -GW; i <= GW; i += 10) { ctx.beginPath(); ctx.moveTo(sx(i), sy(GOALY)); ctx.lineTo(sx(i), sy(GOALY + 40)); ctx.stroke(); }
    ctx.lineWidth = 6; ctx.strokeStyle = '#FFFFFF'; ctx.beginPath(); ctx.moveTo(sx(-GW), sy(GOALY)); ctx.lineTo(sx(-GW), sy(GOALY + 40)); ctx.lineTo(sx(GW), sy(GOALY + 40)); ctx.lineTo(sx(GW), sy(GOALY)); ctx.stroke();
    for (const m of muds) { ctx.fillStyle = 'rgba(122,90,58,.75)'; ctx.beginPath(); ctx.ellipse(sx(m.x), sy(m.y), m.r * s, m.r * s * .75, 0, 0, 7); ctx.fill(); }
    if (ball.owner === 'me' && GOALY - me.y < 560 && g.state === 'play') { ctx.fillStyle = 'rgba(255,194,51,.18)'; ctx.fillRect(sx(-FW), sy(GOALY), FW * 2 * s, 560 * s); }
    for (const wl of walls) if (!wl.done) for (const m of wl.men) person(ctx, m.x, wl.y, theirCol, null, {run:g.t * 200});
    for (const d of defs) {
      if (d.type === 'slider' && d.state === 'warn') { ctx.strokeStyle = `rgba(232,87,122,${.5 + Math.sin(g.t * 20) * .3})`; ctx.lineWidth = 8; ctx.setLineDash([12, 8]); ctx.beginPath(); ctx.moveTo(sx(d.x), sy(d.y)); ctx.lineTo(sx(d.tx), sy(d.ty)); ctx.stroke(); ctx.setLineDash([]); }
      person(ctx, d.x, d.y, theirCol, null, {run:d.type === 'chaser' ? g.t * 300 : g.t * 100, big:d.big});
      if (d.type === 'chaser' && Math.hypot(d.x - me.x, d.y - me.y) < 330) E.outlineText(ctx, '!', sx(d.x), sy(d.y) - 34 * s - 10, 22, '#FFC233');
    }
    for (const m of mates) person(ctx, m.x, m.y, myCol, m.num, {ring:'#FFC233', run:0});
    if (keeper) { const kw = keeper.w * s; ctx.fillStyle = '#FFC233'; ctx.strokeStyle = '#1D2540'; ctx.lineWidth = 3; E.rr(ctx, sx(keeper.x) - kw / 2 - 6, sy(keeper.y) - 10, kw + 12, 20, 10); ctx.fill(); ctx.stroke(); person(ctx, keeper.x, keeper.y, LV.boss ? '#1D2540' : theirCol, LV.boss ? null : 1, {big:LV.boss}); if (LV.boss) E.outlineText(ctx, WD.boss, sx(keeper.x), sy(keeper.y) - 56 * s - 12, 16, '#FFC233'); }
    person(ctx, me.x, me.y, myCol, null, {run:me.run, ring:g.inv > 0 ? '#FFFFFF' : null, skin:PUM.util.cssVar('skin2')});
    const bX = sx(ball.x), bY = sy(ball.y), br = Math.max(5, BR * s * (1 + ball.z / 60));
    ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(bX + ball.z * .2, bY + 3, br, br * .5, 0, 0, 7); ctx.fill();
    if (shot && shot.powered && !shot.done) { ctx.fillStyle = 'rgba(255,138,61,.5)'; ctx.beginPath(); ctx.arc(bX, bY - ball.z * s, br * 2.2, 0, 7); ctx.fill(); parts.add({x:bX, y:bY - ball.z * s, vx:0, vy:30, life:.3, size:4, color:'#FF8A3D', screen:true}); }
    ctx.fillStyle = '#FFFFFF'; ctx.strokeStyle = '#1D2540'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(bX, bY - ball.z * s, br, 0, 7); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#1D2540'; E.starPath(ctx, bX, bY - ball.z * s, br * .45, br * .45, 5); ctx.fill();
    parts.list.forEach(p => { if (!p.screen) { p.sx = sx(p.x); p.sy = sy(p.y); } });
    for (const p of parts.list) { const X = p.screen ? p.x : sx(p.x), Y = p.screen ? p.y : sy(p.y); ctx.globalAlpha = p.fade === false ? 1 : Math.max(0, p.life / p.max); ctx.fillStyle = p.color; ctx.fillRect(X - p.size / 2, Y - p.size / 3, p.size, p.size * .66); }
    ctx.globalAlpha = 1;
    if (LV.rain) { ctx.strokeStyle = 'rgba(200,220,255,.35)'; ctx.lineWidth = 1.5; for (let i = 0; i < 60; i++) { const x = (i * 97 + g.t * 300) % W, y = (i * 53 + g.t * 900) % H; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 4, y + 14); ctx.stroke(); } }
    if (g.joy) { ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(g.joy.x0, g.joy.y0, 46, 0, 7); ctx.stroke(); const dx = g.joy.x - g.joy.x0, dy = g.joy.y - g.joy.y0, L = Math.min(46, Math.hypot(dx, dy)), a = Math.atan2(dy, dx); ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.beginPath(); ctx.arc(g.joy.x0 + Math.cos(a) * L, g.joy.y0 + Math.sin(a) * L, 20, 0, 7); ctx.fill(); }
    if (g.state === 'intro') { E.outlineText(ctx, LV.name, W / 2, H * .3, Math.min(40, W * .1), '#FFFFFF'); E.outlineText(ctx, `Score ${LV.goals} goal${LV.goals > 1 ? 's' : ''}!`, W / 2, H * .38, Math.min(30, W * .075), '#FFC233'); E.outlineText(ctx, 'Drag anywhere to dribble', W / 2, H * .46, Math.min(20, W * .05), '#FFFFFF'); }
    if (g.msgT > 0) { let fs = Math.min(48, W * .12); ctx.font = `800 ${fs}px Sniglet, sans-serif`; const mw = ctx.measureText(g.msg).width; if (mw > W * .9) fs *= W * .9 / mw; E.outlineText(ctx, g.msg, W / 2, H * .3, fs, '#FFC233'); }
    ctx.restore();
  }
  function pointer(type, x, y, id) {
    if (type === 'down') {
      if (mates.length && !pass) { for (const m of mates) if (Math.hypot(sx(m.x) - x, sy(m.y) - 14 - y) < 56) { doPass(m); return; } }
      g.joy = {id, x0:x, y0:y, x, y};
    } else if (type === 'move' && g.joy && g.joy.id === id) { g.joy.x = x; g.joy.y = y; }
    else if (type === 'up' && g.joy && g.joy.id === id) g.joy = null;
  }
  return {
    update, draw, resize, pointer,
    setControl(name, on) {
      if (name === 'shoot' && on) shoot(false);
      if (name === 'power' && on) { if (g.power >= 1) shoot(true); else api.toast('Make right math passes to charge a power shot!'); }
      const map = {left:['x', -1], right:['x', 1], up:['y', -1], down:['y', 1]};
      if (map[name]) g.keys[map[name][0]] = on ? map[name][1] : 0;
    },
    tapMate(i) { if (mates[i]) doPass(mates[i]); },
    refill(frac) { g.st = Math.min(cap, g.st + frac * cap); PUM.audio.sfx('refuel'); },
    refillTarget: () => g.st >= cap * .999,
    level: () => g.st / cap,
    resumeFromRefill() { if (g.state === 'wait') { g.state = 'play'; g.tired = false; } },
    onStart() {}, onStop() {}, onPause() { g.joy = null; },
    _debug: () => ({g, me, ball, defs, walls, mates, keeper, GOALY}),
  };
};
})();
