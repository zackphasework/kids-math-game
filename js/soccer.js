/* Power-Up Math: Striker Showdown. Penalty shootout: swipe to shoot, tap to dive and save. Stamina comes from math. */
(function () {
'use strict';
const {clamp, lerp, mulberry32} = PUM.util;
const E = PUM.engine, C = E.col;
PUM.games = PUM.games || {};

PUM.games.soccer = function (o) {
  const {player, stats, assist, level, api} = o;
  const prog = player.prog.soccer;
  const team = PUM.TEAMS[(prog.season * 5 + prog.match) % PUM.TEAMS.length];
  const myCol = PUM.util.cssVar(player.color), theirCol = PUM.util.cssVar(team.color);
  const k = clamp(.3 + prog.season * .08 + prog.match * .05 - assist * .12, .1, .85);
  const GW = 3.66, GH = 2.44, GZ = 11, BR = .11, GRAV = 9.8;
  const maxSt = 3 + stats.cap;
  const g = {phase:'intro', t:0, pt:0, st:maxSt, me:[], them:[], round:0, streak:0, power:false, msg:'', msgT:0, mp:0, shake:0, crowd:0, swipe:null, trail:[], hintT:0, net:{x:0, y:0, b:0}, flash:0, firstShot:true};
  const ball = {x:0, y:BR, z:0, vx:0, vy:0, vz:0, ac:0, spin:0, live:false, out:null};
  const keeper = {x:0, y:0, tx:0, ty:1, t:0, dur:.35, diving:false, delay:0, mine:false};
  const kicker = {t:0, active:false};
  const parts = E.Particles();
  let view = {W:0, H:0, f:1, hz:0}, crowdCanvas = null;
  const rand = mulberry32(4242 + prog.season * 31 + prog.match);

  /* ---------- projection ---------- */
  const CAMZ = 4.5, CAMH = 1.25;
  function proj(x, y, z) { const d = Math.max(.5, z + CAMZ); return [view.W / 2 + x * view.f / d, view.hz + (CAMH - y) * view.f / d, view.f / d]; }
  function unproj(sx, sy, z) { const d = z + CAMZ; return [(sx - view.W / 2) * d / view.f, CAMH - (sy - view.hz) * d / view.f]; }
  function resize(W, H) {
    view = {W, H, f:Math.min(W * 1.95, H * 1.6), hz:H * (W < H ? .40 : .30)};
    crowdCanvas = document.createElement('canvas');
    const [, boardTop] = proj(0, 1.1, 17);
    crowdCanvas.width = Math.ceil(W); crowdCanvas.height = Math.max(1, Math.ceil(boardTop));
    const cc = crowdCanvas.getContext('2d');
    const grad = cc.createLinearGradient(0, 0, 0, boardTop); grad.addColorStop(0, '#2B3A6B'); grad.addColorStop(1, '#3E4F86');
    cc.fillStyle = grad; cc.fillRect(0, 0, W, boardTop);
    const cols = [myCol, theirCol, '#FFFFFF', '#FFC233', '#F6D2B4', '#D9A27B', '#8D5A3B'];
    const rnd2 = mulberry32(77);
    for (let y = 8; y < boardTop - 4; y += 9) for (let x = (y / 9 % 2) * 5; x < W; x += 10) {
      cc.fillStyle = cols[Math.floor(rnd2() * cols.length)]; cc.beginPath(); cc.arc(x + rnd2() * 3, y, 3.2, 0, 7); cc.fill();
    }
    cc.fillStyle = 'rgba(0,0,0,.18)'; for (let y = 16; y < boardTop; y += 27) cc.fillRect(0, y, W, 2);
  }

  /* ---------- flow ---------- */
  function say(m, t = 1.3) { g.msg = m; g.msgT = t; }
  function setPhase(p) { g.phase = p; g.pt = 0; }
  function needStamina(next) {
    if (g.st > 0) return false;
    g.after = next; setPhase('wait'); api.needRefuel('stamina'); return true;
  }
  function startShoot() {
    if (needStamina('shoot')) return;
    Object.assign(ball, {x:0, y:BR, z:0, vx:0, vy:0, vz:0, ac:0, live:false, out:null});
    Object.assign(keeper, {x:0, y:0, tx:0, ty:1, t:0, diving:false, mine:false, delay:0});
    g.power = g.streak >= 2; g.trail = []; g.swipe = null;
    setPhase('aim');
    if (g.power) say('POWER SHOT ready!', 1.6);
  }
  function startDefend() {
    if (needStamina('defend')) return;
    Object.assign(ball, {x:0, y:BR, z:0, vx:0, vy:0, vz:0, ac:0, live:false, out:null});
    Object.assign(keeper, {x:0, y:0, tx:0, ty:1, t:0, diving:false, mine:true, delay:0});
    const wide = rand() < .06 + (assist ? 0 : .04);
    const side = rand() < .5 ? -1 : 1, corner = rand() < .35 + k * .4;
    g.def = {tx:wide ? side * (GW + .5) : corner ? side * (2 + rand() * 1.3) : (rand() - .5) * 2.4, ty:.3 + rand() * (corner ? 1.8 : 1.4), tapped:false};
    kicker.t = 0; kicker.active = true;
    setPhase('runup');
  }
  function kickBall(tx, ty, vz, ac) {
    const T = GZ / vz;
    Object.assign(ball, {vz, ac, vx:(tx - .5 * ac * T * T) / T, vy:(ty - BR + .5 * GRAV * T * T) / T, live:true, spin:0});
    PUM.audio.sfx('kick');
  }
  function shoot(tx, ty, speedBonus, curve) {
    g.st--;
    if (assist >= 1) { tx = clamp(tx, -GW + .35, GW - .35); ty = clamp(ty, .25, GH - .3); }
    const vz = 19 + stats.str * 1.6 + speedBonus + (g.power ? 7 : 0);
    kickBall(tx, ty, vz, curve * 12);
    const noise = (1 - k) * 1.3 * (g.power ? 2.2 : 1);
    const px = clamp(tx + (rand() - .5) * 2 * noise, -GW + .2, GW - .2), py = clamp(ty + (rand() - .5) * noise, .2, GH - .1);
    keeper.delay = (.3 - .1 * k) * (g.power ? 2.2 : 1) + (assist ? .08 * assist : 0);
    keeper.dtx = px; keeper.dty = py; keeper.dur = .4 - .1 * k;
    setPhase('flight');
    g.firstShot = false;
  }
  function diveMine(sx, sy) {
    if (g.def.tapped) return;
    g.def.tapped = true; g.st--;
    let [x, y] = unproj(sx, sy, GZ);
    x = clamp(x, -GW - .2, GW + .2); y = clamp(y, .2, GH);
    Object.assign(keeper, {diving:true, t:0, tx:x, ty:y, dur:.36 - .03 * stats.spec});
    PUM.audio.sfx('jump');
  }
  function keeperPose() {
    const e = keeper.diving ? Math.min(1, keeper.t / keeper.dur) : 0, ee = 1 - (1 - e) * (1 - e);
    const sway = keeper.diving ? 0 : Math.sin(g.t * 3) * .25;
    const cx = lerp(sway, keeper.tx * .82, ee), cy = lerp(1.0, Math.max(.45, keeper.ty * .9), ee);
    const rot = keeper.diving ? clamp(keeper.tx / 2.2, -1, 1) * 1.25 * ee : 0;
    return {cx, cy, rot, e:ee};
  }
  function resolve() {
    const pose = keeperPose();
    const reach = keeper.mine ? .72 + .1 * stats.spec + .25 * assist : .55 + .35 * k;
    const hx = pose.cx + Math.sin(pose.rot) * .45, hy = pose.cy + Math.cos(pose.rot) * .25;
    const d = Math.hypot(ball.x - hx, ball.y - hy), dBody = Math.hypot(ball.x - pose.cx, ball.y - pose.cy);
    const inside = Math.abs(ball.x) < GW - BR && ball.y < GH - BR;
    const postHit = (Math.abs(Math.abs(ball.x) - GW) < .16 && ball.y < GH + .1) || (Math.abs(ball.y - GH) < .14 && Math.abs(ball.x) < GW + .1);
    const powerShot = !keeper.mine && g.power;
    let out;
    if (inside && (d < reach || dBody < .5) && !(powerShot && rand() < .7)) out = 'save';
    else if (postHit) out = 'post';
    else if (inside) out = 'goal';
    else out = ball.y >= GH ? 'over' : 'wide';
    ball.out = out;
    const mine = keeper.mine;
    if (out === 'save') { ball.vz = -5; ball.vx = (ball.x - pose.cx) * 4 + (rand() - .5) * 3; ball.vy = 3; PUM.audio.sfx('save'); say(mine ? 'SAVED!' : 'Saved!', 1.4); if (mine) { g.crowd = 1.5; g.mp++; api.addMp(1); celebrate(); } }
    else if (out === 'post') { ball.vz = -6; ball.vx *= -.4; PUM.audio.sfx('post'); say('Off the post!', 1.4); }
    else if (out === 'goal') { ball.vz *= .35; ball.vx *= .3; g.net = {x:ball.x, y:ball.y, b:.9}; PUM.audio.sfx(mine ? 'save' : 'goal'); say(mine ? 'They scored' : 'GOAL!', 1.5); if (!mine) { g.crowd = 2; g.shake = 8; g.mp++; api.addMp(1); celebrate(); } }
    else { PUM.audio.sfx('save'); say(out === 'over' ? 'Over the bar!' : 'Wide!', 1.3); }
    const scored = out === 'goal';
    if (mine) { g.them.push(scored ? 1 : 0); }
    else { g.me.push(scored ? 1 : 0); g.streak = scored ? g.streak + 1 : 0; if (g.power) g.streak = 0; }
    setPhase(mine ? 'defResult' : 'result');
  }
  function celebrate() {
    for (let i = 0; i < 60; i++) parts.add({x:Math.random() * view.W, y:-10 - Math.random() * 80, vx:(Math.random() - .5) * 60, vy:60 + Math.random() * 100, g:60, life:2.4, size:6 + Math.random() * 4, shape:'rect', vr:8, color:['#FFC233', '#E8577A', '#2F95D6', '#22A06B', '#FFFFFF', myCol][Math.floor(Math.random() * 6)], fade:false});
  }
  function decided() {
    const rounds = Math.max(g.me.length, g.them.length), a = g.me.reduce((s, v) => s + v, 0), b = g.them.reduce((s, v) => s + v, 0);
    const leftMe = Math.max(0, 5 - g.me.length), leftThem = Math.max(0, 5 - g.them.length);
    if (rounds <= 5) { if (a + leftMe < b || b + leftThem < a) return true; if (g.me.length === 5 && g.them.length === 5 && a !== b) return true; return false; }
    if (g.me.length === g.them.length && a !== b) return true;
    if (g.me.length === g.them.length && g.me.length >= 8) return true;
    return false;
  }
  function endMatch() {
    const a = g.me.reduce((s, v) => s + v, 0), b = g.them.reduce((s, v) => s + v, 0);
    const result = a > b ? 'w' : a === b ? 'd' : 'l';
    setPhase('done');
    if (result === 'w') { PUM.audio.sfx('fanfare'); celebrate(); g.crowd = 3; }
    PUM.audio.sfx('whistle');
    setTimeout(() => api.finish({result, you:a, them:b, team, mp:g.mp}), 1600);
  }

  function update(dt) {
    g.t += dt; g.pt += dt;
    if (g.msgT > 0) g.msgT -= dt;
    if (g.shake > 0) g.shake = Math.max(0, g.shake - dt * 25);
    if (g.crowd > 0) g.crowd = Math.max(0, g.crowd - dt);
    if (g.net.b > 0) g.net.b = Math.max(0, g.net.b - dt * 1.2);
    if (g.flash > 0) g.flash -= dt;
    for (const tr of g.trail) tr.a -= dt * 2.5;
    g.trail = g.trail.filter(tr => tr.a > 0);
    parts.update(dt);
    if (g.phase === 'intro' && g.pt > 1.2) { PUM.audio.sfx('whistle'); startShoot(); }
    if (g.phase === 'runup') {
      kicker.t += dt;
      if (kicker.t > .95 && !ball.live) { const vz = 15 + 4 * k - assist * 2.5; kickBall(g.def.tx, g.def.ty, vz, (rand() - .5) * 4); setPhase('defFlight'); }
    }
    if (keeper.mine === false && g.phase === 'flight' && !keeper.diving && g.pt > keeper.delay) Object.assign(keeper, {diving:true, t:0, tx:keeper.dtx, ty:keeper.dty});
    if (keeper.diving) keeper.t += dt;
    if (ball.live) {
      ball.vy -= GRAV * dt; ball.vx += ball.ac * dt;
      ball.x += ball.vx * dt; ball.y += ball.vy * dt; ball.z += ball.vz * dt; ball.spin += dt * 20;
      if (ball.y < BR) { ball.y = BR; ball.vy = Math.abs(ball.vy) * .45; ball.vx *= .9; ball.vz *= .9; }
      if (g.power && !keeper.mine && !ball.out) parts.add({x:ball.x, y:ball.y, z:ball.z, world:true, vx:0, vy:0, life:.35, size:.13, color:['#FF8A3D', '#FFC233', '#E8577A'][Math.floor(Math.random() * 3)]});
      if (!ball.out && ball.z >= GZ) resolve();
      if (ball.out === 'goal' && ball.z > GZ + 1.3) { ball.z = GZ + 1.3; ball.vz = 0; ball.vx = 0; }
    }
    if ((g.phase === 'result' || g.phase === 'defResult') && g.pt > 1.6) {
      ball.live = false;
      if (decided()) { endMatch(); return; }
      if (g.phase === 'result') startDefend(); else { g.round++; startShoot(); }
    }
    if (g.phase === 'aim') g.hintT += dt;
    api.hud({st:g.st, max:maxSt, me:g.me, them:g.them, power:g.power, team});
  }

  /* ---------- drawing ---------- */
  function drawFigure(ctx, cx, cy, sc, rot, shirt, opts = {}) {
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(rot); ctx.scale(sc, sc);
    ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.strokeStyle = C('ink'); ctx.lineWidth = .045;
    const lw = opts.legs || 0;
    ctx.fillStyle = C('metal');
    ctx.beginPath(); ctx.roundRect ? ctx.roundRect(-.2 - lw, .15, .16, .62, .06) : ctx.rect(-.2 - lw, .15, .16, .62); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.roundRect ? ctx.roundRect(.04 + lw, .15, .16, .62, .06) : ctx.rect(.04 + lw, .15, .16, .62); ctx.fill(); ctx.stroke();
    ctx.fillStyle = shirt; E.rr(ctx, -.27, -.55, .54, .75, .12); ctx.fill(); ctx.stroke();
    const arm = opts.arms != null ? opts.arms : 0;
    ctx.strokeStyle = C('ink'); ctx.lineWidth = .17;
    ctx.beginPath(); ctx.moveTo(-.22, -.45); ctx.lineTo(-.5, -.45 - arm * .55); ctx.moveTo(.22, -.45); ctx.lineTo(.5, -.45 - arm * .55); ctx.stroke();
    ctx.strokeStyle = shirt; ctx.lineWidth = .1; ctx.stroke();
    if (opts.gloves) { ctx.fillStyle = C('star'); ctx.strokeStyle = C('ink'); ctx.lineWidth = .04; for (const sx of [-1, 1]) { ctx.beginPath(); ctx.arc(sx * .5, -.45 - arm * .55, .09, 0, 7); ctx.fill(); ctx.stroke(); } }
    ctx.fillStyle = opts.skin || C('skin2'); ctx.strokeStyle = C('ink'); ctx.lineWidth = .045;
    ctx.beginPath(); ctx.arc(0, -.74, .17, 0, 7); ctx.fill(); ctx.stroke();
    ctx.fillStyle = C('hair1'); ctx.beginPath(); ctx.arc(0, -.78, .17, Math.PI * 1.05, Math.PI * 1.95); ctx.closePath(); ctx.fill();
    if (opts.num) { ctx.fillStyle = '#FFFFFF'; ctx.font = '800 .3px Sniglet, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(opts.num, 0, -.2); }
    ctx.restore();
  }
  function drawBall(ctx, x, y, z, power) {
    const [sx, sy, sc] = proj(x, y, z), [gx, gy] = proj(x, 0, z);
    const r = Math.max(3, BR * sc);
    ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(gx, gy, r * 1.1, r * .35, 0, 0, 7); ctx.fill();
    if (power) { ctx.fillStyle = 'rgba(255,138,61,.45)'; ctx.beginPath(); ctx.arc(sx, sy, r * 1.9, 0, 7); ctx.fill(); }
    ctx.save(); ctx.translate(sx, sy);
    ctx.fillStyle = '#FFFFFF'; ctx.strokeStyle = C('ink'); ctx.lineWidth = Math.max(1.5, r * .12);
    ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.fill(); ctx.stroke();
    ctx.save(); ctx.clip(); ctx.rotate(ball.spin); ctx.fillStyle = C('ink');
    for (let i = 0; i < 5; i++) { const a = i * Math.PI * 2 / 5; E.starPath(ctx, Math.cos(a) * r * .8, Math.sin(a) * r * .8, r * .32, r * .32, 5); ctx.fill(); }
    E.starPath(ctx, 0, 0, r * .34, r * .34, 5); ctx.fill();
    ctx.restore(); ctx.restore();
  }
  function drawGoal(ctx) {
    const nb = g.net.b;
    const back = (x, y) => { const bz = GZ + 1.6 - (y / GH) * .7; const d = Math.hypot(x - g.net.x, y - g.net.y); return proj(x, y, bz + nb * Math.exp(-d * d * 1.5) * .8); };
    ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 1;
    for (let i = 0; i <= 14; i++) { const x = -GW + i * GW * 2 / 14; ctx.beginPath(); for (let j = 0; j <= 6; j++) { const y = j * GH / 6, [sx, sy] = back(x, y); ctx[j ? 'lineTo' : 'moveTo'](sx, sy); } ctx.stroke(); }
    for (let j = 0; j <= 6; j++) { const y = j * GH / 6; ctx.beginPath(); for (let i = 0; i <= 14; i++) { const x = -GW + i * GW * 2 / 14, [sx, sy] = back(x, y); ctx[i ? 'lineTo' : 'moveTo'](sx, sy); } ctx.stroke(); }
    for (const sgn of [-1, 1]) for (let j = 0; j <= 6; j++) { const y = j * GH / 6, a = proj(sgn * GW, y, GZ), b = back(sgn * GW, y); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); }
    for (let i = 0; i <= 14; i++) { const x = -GW + i * GW * 2 / 14, a = proj(x, GH, GZ), b = back(x, GH); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); }
    const [lx0, ly0, sc] = proj(-GW, 0, GZ), [, ly1] = proj(-GW, GH, GZ), [rx0] = proj(GW, 0, GZ);
    const pw = Math.max(4, .12 * sc);
    ctx.fillStyle = '#FFFFFF'; ctx.strokeStyle = C('ink'); ctx.lineWidth = 2;
    ctx.fillRect(lx0 - pw / 2, ly1 - pw / 2, pw, ly0 - ly1 + pw / 2); ctx.strokeRect(lx0 - pw / 2, ly1 - pw / 2, pw, ly0 - ly1 + pw / 2);
    ctx.fillRect(rx0 - pw / 2, ly1 - pw / 2, pw, ly0 - ly1 + pw / 2); ctx.strokeRect(rx0 - pw / 2, ly1 - pw / 2, pw, ly0 - ly1 + pw / 2);
    ctx.fillRect(lx0 - pw / 2, ly1 - pw / 2, rx0 - lx0 + pw, pw); ctx.strokeRect(lx0 - pw / 2, ly1 - pw / 2, rx0 - lx0 + pw, pw);
  }
  function drawPitch(ctx, W, H) {
    const [, by] = proj(0, 0, 17);
    ctx.fillStyle = '#3F9E4D'; ctx.fillRect(0, by, W, H - by);
    for (let z = -4, i = 0; z < 17; z += 1.5, i++) {
      if (i % 2) continue;
      const a = proj(-30, 0, z), b = proj(30, 0, z), c = proj(30, 0, z + 1.5), d = proj(-30, 0, z + 1.5);
      ctx.fillStyle = '#48AE57'; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(c[0], c[1]); ctx.lineTo(d[0], d[1]); ctx.closePath(); ctx.fill();
    }
    ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 2.5;
    const line = (x0, z0, x1, z1) => { const a = proj(x0, 0, z0), b = proj(x1, 0, z1); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); };
    line(-30, GZ, 30, GZ); line(-9.16, GZ, -9.16, GZ - 5.5); line(9.16, GZ, 9.16, GZ - 5.5); line(-9.16, GZ - 5.5, 9.16, GZ - 5.5);
    line(-20.16, GZ, -20.16, -4); line(20.16, GZ, 20.16, -4);
    const sp = proj(0, 0, 0); ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.ellipse(sp[0], sp[1] + 2, 7, 3, 0, 0, 7); ctx.fill();
  }
  function drawStands(ctx, W) {
    if (crowdCanvas) {
      const jump = g.crowd > 0 ? Math.abs(Math.sin(g.t * 14)) * Math.min(1, g.crowd) * 5 : Math.sin(g.t * 2) * .6;
      ctx.drawImage(crowdCanvas, 0, -jump);
    }
    const [, bt] = proj(0, 1.1, 17), [, bb] = proj(0, 0, 17);
    const cols = [myCol, '#FFC233', theirCol, '#FFFFFF'];
    const segW = W / 4;
    for (let i = 0; i < 4; i++) { ctx.fillStyle = cols[i]; ctx.fillRect(i * segW, bt, segW, bb - bt); }
    ctx.strokeStyle = C('ink'); ctx.lineWidth = 2; ctx.strokeRect(-2, bt, W + 4, bb - bt);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (let i = 0; i < 4; i++) {
      const txt = i % 2 ? 'POWER-UP' : 'MATH CUP';
      let fs = Math.max(8, (bb - bt) * .6); ctx.font = `800 ${fs}px Sniglet, sans-serif`;
      const w = ctx.measureText(txt).width; if (w > segW * .86) { fs *= segW * .86 / w; ctx.font = `800 ${fs}px Sniglet, sans-serif`; }
      ctx.fillStyle = i === 3 ? C('ink') : '#FFFFFF'; ctx.fillText(txt, i * segW + segW / 2, (bt + bb) / 2 + 1);
    }
  }
  function drawScore(ctx, W) {
    const dots = (arr, x, y, align) => { for (let i = 0; i < Math.max(5, arr.length); i++) { const v = arr[i], cx = align < 0 ? x - i * 16 : x + i * 16; ctx.fillStyle = v === 1 ? '#22A06B' : v === 0 ? '#E8577A' : 'rgba(255,255,255,.35)'; ctx.strokeStyle = C('ink'); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, y, 6, 0, 7); ctx.fill(); ctx.stroke(); } };
    const a = g.me.reduce((s, v) => s + v, 0), b = g.them.reduce((s, v) => s + v, 0);
    const T = 100;
    ctx.fillStyle = 'rgba(16,22,44,.82)'; E.rr(ctx, W / 2 - Math.min(170, W / 2 - 8), T, Math.min(340, W - 16), 54, 14); ctx.fill();
    E.outlineText(ctx, `${a} – ${b}`, W / 2, T + 19, 22);
    ctx.font = '700 12px Lexend, sans-serif'; ctx.fillStyle = '#FFFFFF'; ctx.textBaseline = 'middle';
    ctx.textAlign = 'right'; ctx.fillText(player.name.slice(0, 10), W / 2 - 34, T + 17);
    ctx.textAlign = 'left'; ctx.fillText(team.name.slice(0, 13), W / 2 + 34, T + 17);
    dots(g.me, W / 2 - 40, T + 40, -1); dots(g.them, W / 2 + 40, T + 40, 1);
  }
  function draw(ctx, W, H) {
    if (!view.W || view.W !== W || view.H !== H) resize(W, H);
    const sh = g.shake ? (Math.random() - .5) * g.shake : 0;
    ctx.save(); ctx.translate(sh, 0);
    ctx.fillStyle = '#20305E'; ctx.fillRect(0, 0, W, H);
    drawStands(ctx, W);
    drawPitch(ctx, W, H);
    if (g.phase === 'runup' || g.phase === 'defFlight') {
      const tele = assist >= 1 ? 1.1 : .45, t0 = .95 - tele;
      if (kicker.t > t0 && kicker.t < .95 + (assist ? .3 : 0) && !g.def.tapped) {
        const [sx, sy, sc] = proj(g.def.tx, g.def.ty, GZ), pulse = 1 + Math.sin(g.t * 12) * .12;
        ctx.strokeStyle = assist ? 'rgba(255,194,51,.95)' : 'rgba(255,255,255,.55)'; ctx.lineWidth = assist ? 4 : 2.5;
        ctx.beginPath(); ctx.arc(sx, sy, (assist ? .55 : .35) * sc * pulse, 0, 7); ctx.stroke();
      }
    }
    const behind = ball.z > GZ + .05;
    if (behind) drawBall(ctx, ball.x, ball.y, ball.z, false);
    drawGoal(ctx);
    const pose = keeperPose(), [kx, ky, ksc] = proj(pose.cx, pose.cy, GZ + .25);
    drawFigure(ctx, kx, ky, ksc * 1.05, pose.rot, keeper.mine ? myCol : theirCol, {arms:keeper.diving ? .2 : .9, gloves:true, legs:keeper.diving ? .05 : .03, num:'1'});
    if (g.phase === 'runup' || (g.phase === 'defFlight' && g.pt < .5)) {
      const kt = clamp(kicker.t / .95, 0, 1), kx2 = lerp(-1.4, -.35, kt), kz = lerp(-1.6, -.25, kt);
      const [fx, fy, fsc] = proj(kx2, .95, kz);
      drawFigure(ctx, fx, fy, fsc, Math.sin(g.t * 16) * .08 * (kt < 1 ? 1 : 0), theirCol, {arms:.1, legs:Math.sin(g.t * 16) * .06, num:'9'});
    }
    for (const p of parts.list) if (p.world) { const [sx, sy, sc] = proj(p.x, p.y, p.z); ctx.globalAlpha = Math.max(0, p.life / p.max); ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(sx, sy, Math.max(2, p.size * sc), 0, 7); ctx.fill(); }
    ctx.globalAlpha = 1;
    if (!behind) drawBall(ctx, ball.x, ball.y, ball.z, g.power && !keeper.mine && ball.live);
    ctx.lineCap = 'round';
    for (const tr of g.trail) { ctx.strokeStyle = `rgba(255,255,255,${tr.a * .8})`; ctx.lineWidth = 8 * tr.a + 2; ctx.beginPath(); ctx.moveTo(tr.x0, tr.y0); ctx.lineTo(tr.x1, tr.y1); ctx.stroke(); }
    if (g.swipe && g.swipe.pts.length > 1) { ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 6; ctx.beginPath(); g.swipe.pts.forEach((p, i) => ctx[i ? 'lineTo' : 'moveTo'](p[0], p[1])); ctx.stroke(); }
    const scr = parts.list.filter(p => !p.world);
    for (const p of scr) { ctx.globalAlpha = p.fade === false ? 1 : Math.max(0, p.life / p.max); ctx.fillStyle = p.color; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillRect(-p.size / 2, -p.size / 3, p.size, p.size * .66); ctx.restore(); }
    ctx.globalAlpha = 1;
    drawScore(ctx, W);
    if (g.phase === 'aim') {
      const [bx, by] = proj(0, BR, 0), a = (g.hintT % 1.4) / 1.4;
      E.outlineText(ctx, g.power ? 'POWER SHOT! Swipe up' : 'Swipe up to shoot!', W / 2, by + 54, Math.min(26, W * .065), g.power ? '#FFC233' : '#FFFFFF');
      if (g.firstShot || assist >= 1) { ctx.globalAlpha = 1 - a; ctx.fillStyle = '#FFFFFF'; ctx.strokeStyle = C('ink'); ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(bx + 20, by - a * 120, 14, 0, 7); ctx.fill(); ctx.stroke(); ctx.globalAlpha = 1; }
    }
    if (g.phase === 'runup' || (g.phase === 'defFlight' && !g.def.tapped)) {
      const [, gy] = proj(0, 0, GZ);
      E.outlineText(ctx, g.def.tapped ? '' : 'Tap where the ball is going!', W / 2, gy + 40, Math.min(24, W * .06), '#FFC233');
    }
    if (g.msgT > 0) {
      const s = 1 + Math.max(0, g.msgT - 1.1) * 2;
      let fs = Math.min(64, W * .14) * Math.min(1.4, s);
      ctx.font = `800 ${fs}px Sniglet, sans-serif`; const mw = ctx.measureText(g.msg).width; if (mw > W * .9) fs *= W * .9 / mw;
      E.outlineText(ctx, g.msg, W / 2, view.hz * .95, fs, g.msg === 'GOAL!' || g.msg === 'SAVED!' ? '#FFC233' : '#FFFFFF');
    }
    ctx.restore();
  }

  function pointer(type, x, y) {
    if (g.phase === 'aim') {
      if (type === 'down') g.swipe = {pts:[[x, y]], t0:performance.now()};
      else if (type === 'move' && g.swipe) { g.swipe.pts.push([x, y]); if (g.swipe.pts.length > 60) g.swipe.pts.shift(); }
      else if (type === 'up' && g.swipe) {
        const s = g.swipe, p0 = s.pts[0], p1 = [x, y], dx = p1[0] - p0[0], dy = p1[1] - p0[1], dur = Math.max(.05, (performance.now() - s.t0) / 1000);
        g.swipe = null;
        if (dy > -25) { say('Swipe UP to shoot', 1.2); return; }
        let dev = 0;
        const L = Math.hypot(dx, dy) || 1;
        for (const p of s.pts) { const d = ((p[0] - p0[0]) * dy - (p[1] - p0[1]) * dx) / L; if (Math.abs(d) > Math.abs(dev)) dev = d; }
        const tx = (dx / (view.W * .42)) * GW * 1.15, ty = .1 + (-dy / (view.H * .6)) * 2.4;
        const bonus = clamp((L / dur - 600) / 400, 0, 4);
        g.trail.push({x0:p0[0], y0:p0[1], x1:p1[0], y1:p1[1], a:1});
        shoot(tx, ty, bonus, clamp(-dev / (view.W * .12), -1, 1));
      }
    } else if ((g.phase === 'runup' || g.phase === 'defFlight') && type === 'down') diveMine(x, y);
  }
  return {
    update, draw, resize, pointer,
    refill(frac) { g.st = Math.min(maxSt, g.st + Math.max(1, Math.ceil(frac * maxSt))); PUM.audio.sfx('refuel'); },
    refillTarget: () => g.st >= maxSt,
    level: () => g.st / maxSt,
    resumeFromRefill() { if (g.phase === 'wait') { if (g.after === 'defend') startDefend(); else startShoot(); } },
    onStart() {}, onStop() {}, onPause() {},
    controls: 'none',
  };
};
})();
