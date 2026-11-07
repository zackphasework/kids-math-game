/* Power-Up Math: Big Rig Builders, the delivery drive. A 3D-style road (view from behind the truck).
   Steer between 3 lanes, brake for curves, dodge obstacles so the cargo stays on, drive through the
   right math gate for turbo, and get the load to the building site before the clock runs out. */
(function () {
'use strict';
const {clamp, lerp, mulberry32} = PUM.util;
const E = PUM.engine, CR = PUM.CREW;
const OT = (ctx, text, x, y, size, fill = '#FFF4DC') => CR.text(ctx, text, x, y, size * 1.12, fill);
PUM.games = PUM.games || {};

PUM.games.trucks = function (o) {
  const {player, assist, levelIndex, api} = o;
  const trip = o.trip || {mat:'gravel', truck:'dump', color:player.color};
  const RIG = PUM.RIG, kind = trip.truck, mat = RIG.MATS[trip.mat] || RIG.MATS.gravel;
  const up = player.up;
  const LV = PUM.CAMPAIGN.trucks.levels[levelIndex], WD0 = PUM.CAMPAIGN.trucks.worlds[LV.world];
  const WD = LV.storm ? Object.assign({}, WD0, {sky:['#8D99A0', '#C9C3B4'], grass:['#8FA06C', '#869866']}) : WD0;
  const truckSpeed = kind === 'flatbed' ? 1.06 : kind === 'mixer' ? .93 : 1;
  const rand = mulberry32(7001 + levelIndex * 7919 + Math.floor(Math.random() * 1000));
  const SEG = 200, ROAD = 2000, CAMH = 1000, DRAW = 140, LANES = [-2 / 3, 0, 2 / 3];
  const camDepth = 1 / Math.tan(50 * Math.PI / 180), playerZ = CAMH * camDepth;
  const density = (assist >= 2 ? .55 : assist === 1 ? .8 : 1);

  /* ---------- road ---------- */
  const N = Math.round(LV.len * 1.4);
  const segs = [];
  const lastY = () => segs.length ? segs[segs.length - 1].p2.y : 0;
  function addSeg(curve, y) { const n = segs.length; segs.push({i:n, p1:{x:0, y:lastY(), z:n * SEG}, p2:{x:0, y, z:(n + 1) * SEG}, curve, dyn:[], ice:false, bridge:false}); }
  const easeIn = (a, b, p) => a + (b - a) * p * p, easeInOut = (a, b, p) => a + (b - a) * (-Math.cos(p * Math.PI) / 2 + .5);
  function addRoad(enter, hold, leave, curve, hill) {
    const sy = lastY(), ey = sy + hill * SEG, tot = enter + hold + leave;
    for (let n = 0; n < enter; n++) addSeg(easeIn(0, curve, n / enter), easeInOut(sy, ey, n / tot));
    for (let n = 0; n < hold; n++) addSeg(curve, easeInOut(sy, ey, (enter + n) / tot));
    for (let n = 0; n < leave; n++) addSeg(easeInOut(curve, 0, n / leave), easeInOut(sy, ey, (enter + hold + n) / tot));
  }
  addRoad(10, 30, 10, 0, 0);
  while (segs.length < N - 70) {
    const len = 12 + Math.floor(rand() * 30);
    const curve = (rand() < .25 ? 0 : (rand() * 2 - 1)) * 6 * LV.curve * (assist >= 2 ? .5 : 1);
    const hill = (rand() * 2 - 1) * 28 * LV.hills;
    addRoad(len, len + Math.floor(rand() * 20), len, curve, hill);
  }
  addRoad(10, 70, 10, 0, -lastY() / SEG * .3);
  const finishI = segs.length - 40;
  const total = segs.length;

  /* ---------- objects ---------- */
  const obs = [];
  const laneX = () => LANES[Math.floor(rand() * 3)];
  const gateIdx = [];
  for (let k = 0; k < LV.gates; k++) gateIdx.push(Math.round(80 + (finishI - 140) * (k + .5) / LV.gates));
  const near = i => gateIdx.some(gi => Math.abs(gi - i) < 14);
  const kinds = Object.keys(LV.obs);
  for (let i = 60; i < finishI - 20; i++) {
    if (near(i)) continue;
    for (const k of kinds) {
      const d = LV.obs[k] * density;
      if (k === 'ice' || k === 'bridge') continue;
      if (rand() < d * .07) {
        const x = laneX();
        if (k === 'tractor' || k === 'car') obs.push({type:k, z:i * SEG, x, w:.42, moving:true, speed:k === 'tractor' ? .32 : -.42});
        else if (k === 'boulder') obs.push({type:k, z:i * SEG + SEG / 2, x, w:.34, fall:1});
        else obs.push({type:k, z:i * SEG + SEG / 2, x, w:{cone:.14, rock:.3, hole:.34}[k]});
        if (k === 'cone' && rand() < .6) { const x2 = LANES[(LANES.indexOf(x) + 1 + Math.floor(rand() * 2)) % 3]; obs.push({type:'cone', z:i * SEG + SEG / 2, x:x2, w:.14}); }
        i += 6;
      }
    }
  }
  for (const k of ['ice', 'bridge']) if (LV.obs[k]) for (let i = 80; i < finishI - 30; i++) if (!near(i) && rand() < LV.obs[k] * density * .02) { const L2 = 18 + Math.floor(rand() * 16); for (let j = i; j < Math.min(i + L2, finishI - 10); j++) segs[j][k] = true; i += L2 + 30; }
  const bolts = [];
  for (let i = 70; i < finishI; i += 18 + Math.floor(rand() * 18)) if (!near(i)) bolts.push({z:i * SEG + SEG / 2, x:laneX(), taken:false});
  const deco = [];
  for (let i = 0; i < total; i += 3 + Math.floor(rand() * 4)) {
    const side = rand() < .5 ? -1 : 1;
    deco.push({i, x:side * (1.35 + rand() * 1.6), kind:LV.world === 0 ? (rand() < .6 ? 'tree' : 'bush') : LV.world === 1 ? (rand() < .5 ? 'cactus' : 'mesa') : (rand() < .45 ? 'block' : rand() < .5 ? 'lamp' : 'tree'), s:.8 + rand() * .6, c:Math.floor(rand() * 4)});
  }
  for (let i = 0; i < finishI; i += 50) deco.push({i, x:-1.3, kind:'sign', s:1, n:Math.max(0, Math.round((finishI - i) * SEG / 1000) / 10)});
  const gates = gateIdx.map(i => ({i, z:i * SEG + SEG / 2, q:null, opts:null, done:false, shown:false}));

  /* ---------- truck stats ---------- */
  const recEngine = clamp(Math.round(LV.power / 3), 0, 5);
  const maxSpeed = (6000 + up.engine * 520) * (assist >= 2 ? .82 : 1) * truckSpeed;
  const refSpeed = (6000 + recEngine * 520) * (assist >= 2 ? .82 : 1) * truckSpeed;
  const cap = 100 * (1 + .3 * up.tank) * (RIG.bonus(player, 'tank') ? 1.3 : 1);
  const steerPow = 1.15 + .14 * up.tires + assist * .1, centrif = .32 - .035 * up.tires - assist * .06;
  const timeLimit = Math.round((finishI * SEG / (refSpeed * .88) + 8) * (1 + assist * .25) * (kind === 'mixer' ? .92 : 1) * (LV.storm ? .96 : 1) * 1.08) + (RIG.bonus(player, 'fans') ? 5 : 0);
  const lossMul = (assist >= 2 ? 0 : assist ? .7 : 1) * (1 - .13 * up.suspension) * (kind === 'flatbed' ? 1.1 : 1) * (RIG.bonus(player, 'medic') ? .8 : 1);
  const turbo = RIG.bonus(player, 'siren') ? 3.8 : 2.8, crowd = RIG.bonus(player, 'crowd');
  const g = {pos:0, x:0, vx:0, speed:0, left:false, right:false, brake:false, cargo:1, fuel:cap, time:timeLimit, t:0, boost:0, shake:0, flash:0, inv:0,
    state:'intro', introT:2.2, gatesOk:0, gatesDone:0, mp:0, skyX:0, hudT:0, msg:'', msgT:0, bump:0, wob:0, bumper:RIG.bonus(player, 'bumper'), spin:0};
  const parts = E.Particles();
  let rival = null;
  /* the rival is a bit slower than an engine at level 4, so turbo from right answers and a few upgrades win the race */
  if (LV.rival) rival = {z:22 * SEG, x:0, tx:0, speed:(6000 + Math.min(recEngine, 4) * 520) * (assist >= 2 ? .82 : 1) * truckSpeed * (LV.world > 1 ? .83 : .86), laneT:2, throwT:3, name:WD.racer || WD.boss, lead:true};
  const rain = LV.storm ? Array.from({length:70}, () => ({x:Math.random(), y:Math.random(), s:.6 + Math.random() * .6})) : null;

  let W = 0, H = 0, hz = 0, HS = 0, VS = 0;
  function resize(w, h) { W = w; H = h; hz = H * .4; HS = W / 2; VS = H * .8 - hz; }
  function project(p, cx, cy, cz) { const z = p.z - cz; p.cz = z; const sc = camDepth / Math.max(1, z); p.sx = W / 2 + sc * (p.x - cx) * HS; p.sy = hz - sc * (p.y - cy) * VS; p.sw = sc * ROAD * HS; }
  const segAt = z => segs[clamp(Math.floor(z / SEG), 0, total - 1)];
  const say = (m, t = 1.4) => { g.msg = m; g.msgT = t; };

  /* ---------- update ---------- */
  /* the truck's face in the corner window: set a mood for a moment, or fall back to what's happening */
  const face = {m:'focus', t:0};
  const setFace = (m, d) => { face.m = m; face.t = d; };
  function faceMood() {
    let m = face.m;
    if (face.t <= 0) {
      const pz = g.pos + playerZ;
      const near = obs.some(ob => !ob.hit && ob.type !== 'cone' && ob.z - pz > 0 && ob.z - pz < 16 * SEG && Math.abs(ob.x - g.x) < ((ob.w || .4) + .3) / 2);
      m = g.state === 'over' ? 'worry' : (timeLimit && g.time < 10) || near ? 'worry' : g.boost > 0 ? 'grin' : 'focus';
    }
    if (assist >= 2 && (m === 'worry' || m === 'squeeze')) m = 'surprise';
    return m;
  }
  function loseCargo(amount, what) {
    if (amount <= 0) return;
    if (g.bumper) { g.bumper = false; api.toast('Your bumper saved the load!'); return; }
    const lost = amount * lossMul;
    if (lost <= 0) { api.toast(`${what}! You held on to the load.`); return; }
    g.cargo = Math.max(0, g.cargo - lost); setFace('worry', 1.3);
    parts.burst(W / 2, H * .62, 14, {speed:240, angle:-Math.PI / 2, spread:2.4, color:[mat.col, '#FFFFFF'], size:7, g:700, life:.9, shape:'rect'});
    if (g.cargo < .12 && g.state === 'run') { g.state = 'over'; say('The whole load fell off!', 3); PUM.audio.sfx('no'); setTimeout(() => api.finish({ok:false, reason:'lost', mp:g.mp}), 1900); }
    else api.toast(`${what}! Some ${mat.name} fell off`);
  }
  function hit(ob, k) {
    if (g.inv > 0 && k !== 'mud') return;
    if (k === 'cone') { g.speed *= .6; PUM.audio.sfx('brick'); if (ob) ob.flyT = 1; return; }
    if (k === 'hole') { g.speed *= .45; g.bump = .4; g.shake = 6; g.inv = .5; PUM.audio.sfx('thud'); loseCargo(.12, 'Pothole'); setFace('surprise', .9); return; }
    if (k === 'mud') { g.speed *= .35; g.shake = 4; return; }
    g.inv = 1.1; g.speed *= .2; g.shake = 14; g.flash = .3; PUM.audio.sfx('crash');
    parts.burst(W / 2, H * .72, 18, {speed:260, color:['#B9BFC7', '#4A4F5C', '#FFC233'], size:6, g:500, life:.8, shape:'rect'});
    if (ob) ob.flyT = 1;
    loseCargo(k === 'water' ? .15 : .25, k === 'water' ? 'Splash' : 'Crash'); setFace('squeeze', 1.2);
  }
  function update(dt) {
    g.t += dt; if (g.msgT > 0) g.msgT -= dt; if (face.t > 0) face.t -= dt; if (g.shake > 0) g.shake = Math.max(0, g.shake - dt * 30); if (g.flash > 0) g.flash -= dt; if (g.inv > 0) g.inv -= dt; if (g.bump > 0) g.bump -= dt;
    parts.update(dt);
    for (const ob of obs) if (ob.flyT > 0) ob.flyT -= dt;
    if (g.state === 'intro') { g.introT -= dt; if (g.introT <= 0) { g.state = 'run'; say('GO!', 1); PUM.audio.sfx('whistle'); } hudOut(dt); return; }
    if (rain) for (const d of rain) { d.y += dt * 1.6 * d.s; if (d.y > 1) { d.y -= 1; d.x = Math.random(); } }
    g.spin += dt * (kind === 'mixer' ? (timeLimit && g.time < 10 ? 7 : 2) : 0);
    if (g.state !== 'run' && g.state !== 'finish') { hudOut(dt); return; }
    const pct = g.speed / maxSpeed, seg = segAt(g.pos + playerZ);
    let target = maxSpeed * (g.boost > 0 ? 1.35 : 1);
    if (g.state === 'finish') target = 0;
    const offroad = Math.abs(g.x) > 1.05;
    if (offroad && !seg.bridge) target = Math.min(target, maxSpeed * .35);
        if (g.brake && g.state === 'run') g.speed = Math.max(0, g.speed - maxSpeed * 1.3 * dt);
    else if (g.speed < target) g.speed = Math.min(target, g.speed + maxSpeed / 3.2 * dt * (g.boost > 0 ? 2 : 1));
    else g.speed = Math.max(target, g.speed - maxSpeed / 2.2 * dt);
    if (g.boost > 0) { g.boost -= dt; if (Math.random() < .6) parts.add({x:W / 2 + (Math.random() - .5) * W * .1, y:H * .8, vx:(Math.random() - .5) * 60, vy:80 + Math.random() * 80, life:.4, size:6 + Math.random() * 6, grow:1, color:['#FF8A3D', '#FFC233', '#FFFFFF'][Math.floor(Math.random() * 3)]}); }
    const dx = dt * 2 * pct;
    const grip = seg.ice ? .45 : 1;
    let steer = 0; if (g.left) steer -= 1; if (g.right) steer += 1;
    if (assist >= 1 && !steer) { const nl = LANES.reduce((a, b) => Math.abs(b - g.x) < Math.abs(a - g.x) ? b : a); steer = clamp((nl - g.x) * 4, -1, 1) * (assist >= 2 ? .8 : .4); }
    g.vx = lerp(g.vx, steer * steerPow, Math.min(1, dt * (seg.ice ? 1.5 : 9)));
    g.x += g.vx * dx * grip * 1.6 + (seg.ice ? g.vx * dx * .4 : 0);
    g.x -= dx * pct * seg.curve * centrif * (seg.ice ? 1.4 : 1);
    g.x = clamp(g.x, -2.4, 2.4);
    g.wob = lerp(g.wob, steer, Math.min(1, dt * 6));
    if (seg.bridge && Math.abs(g.x) > .66 && g.state === 'run') {
      say('Splash!', 1.2); PUM.audio.sfx('save');
      parts.burst(W / 2, H * .78, 24, {speed:300, angle:-Math.PI / 2, spread:2.2, color:['#7FC8F8', '#FFFFFF', '#2F95D6'], size:6, g:700, life:.9});
      g.x = 0; g.speed = maxSpeed * .25; hit(null, 'water');
    }
    const prev = g.pos;
    g.pos = Math.min(g.pos + g.speed * dt, (total - 2) * SEG - playerZ);
    g.fuel = Math.max(0, g.fuel - (g.pos - prev) / SEG * (100 / 330));
    if (g.fuel <= 0 && g.state === 'run') { g.state = 'wait'; g.speedBefore = g.speed; say('Out of fuel!', 2); api.needRefuel('fuel'); }
    g.skyX += seg.curve * pct * dt * .02;
    if (timeLimit && g.state === 'run') { g.time -= dt; if (g.time <= 0) { g.time = 0; g.state = 'over'; say("Time's up!", 3); PUM.audio.sfx('no'); setTimeout(() => api.finish({ok:false, reason:'time', mp:g.mp}), 1800); } }
    const pz = g.pos + playerZ;
    for (const ob of obs) {
      if (ob.moving && !ob.hit) ob.z += ob.speed * maxSpeed * dt;
      if (ob.type === 'boulder' && ob.fall > 0 && ob.z - pz < 38 * SEG) ob.fall = Math.max(0, ob.fall - dt * .9);
      if (ob.hit || Math.abs(ob.z - pz) > SEG * .7) continue;
      if (ob.type === 'boulder' && ob.fall > .05) continue;
      if (ob.type === 'barrel' && ob.arc > .2) continue;
      if (Math.abs(ob.x - g.x) < (ob.w + .36) / 2) { ob.hit = true; hit(ob, ob.type === 'cone' ? 'cone' : ob.type === 'hole' ? 'hole' : 'crash'); }
    }
    for (const b of bolts) if (!b.taken && Math.abs(b.z - pz) < SEG * .7 && Math.abs(b.x - g.x) < .3) { b.taken = true; g.mp++; api.addMp(1); PUM.audio.sfx('coin'); parts.burst(W / 2, H * .6, 10, {speed:160, color:['#FFC233', '#FFFFFF'], size:5, shape:'star', life:.6}); }
    for (const gt of gates) {
      if (gt.done) continue;
      const dz = gt.z - pz;
      if (!gt.shown && dz < 75 * SEG) {
        const gq = PUM.gateQuestion(player, 3); gt.q = gq.q; gt.opts = gq.options; gt.shown = true;
        if (RIG.bonus(player, 'hint')) { const wrong = gt.opts.map((v, i) => v === gt.q.ans ? -1 : i).filter(i => i >= 0); gt.hint = wrong[Math.floor(Math.random() * wrong.length)]; }
        api.showQuestion(gt.q, 'Drive through the right answer!');
      }
      if (gt.shown && dz < 0) {
        gt.done = true;
        const lane = LANES.reduce((bi, l, i) => Math.abs(l - g.x) < Math.abs(LANES[bi] - g.x) ? i : bi, 0);
        const ok = Math.abs(g.x - LANES[lane]) < .45 && gt.opts[lane] === gt.q.ans;
        g.gatesDone++;
        const r = api.answer(ok, gt.q);
        setFace(ok ? 'grin' : 'worry', 1.4);
        if (ok) { g.gatesOk++; g.boost = turbo; if (timeLimit) g.time += 3; say('TURBO!', 1.2); PUM.audio.sfx('up'); g.mp += r.mp; if (crowd) { g.mp++; api.addMp(1); } }
        else { hit(null, 'mud'); say(`Mud! It was ${gt.q.ans}`, 1.6); PUM.audio.sfx('no'); parts.burst(W / 2, H * .8, 20, {speed:200, angle:-Math.PI / 2, spread:2, color:['#7A5A3A', '#9C7650'], size:6, g:600, life:.8}); }
        api.hideQuestion(ok);
      }
    }
    if (rival) rivalUpdate(dt, pz);
    if (g.state === 'run' && pz >= finishI * SEG) {
      if (rival && rival.z > pz) { g.state = 'over'; say(`${rival.name} won the race`, 3); PUM.audio.sfx('no'); setTimeout(() => api.finish({ok:false, reason:'boss', mp:g.mp}), 2000); }
      else {
        g.state = 'finish'; say(rival ? `You beat ${rival.name}!` : 'Delivered!', 3); PUM.audio.sfx('fanfare');
        for (let i = 0; i < 50; i++) parts.add({x:Math.random() * W, y:-20 - Math.random() * 100, vx:(Math.random() - .5) * 60, vy:80 + Math.random() * 100, g:60, life:2.6, size:7, shape:'rect', vr:8, color:['#FFC233', '#E8577A', '#2F95D6', '#22A06B'][Math.floor(Math.random() * 4)], fade:false});
        setTimeout(() => api.finish({ok:true, cargo:g.cargo, mp:g.mp, timeLeft:Math.round(g.time), gatesOk:g.gatesOk, gates:g.gatesDone}), 1500);
      }
    }
    PUM.audio.engineSet(clamp(pct, 0, 1.3) + (g.boost > 0 ? .4 : 0), g.brake ? .2 : 1);
    hudOut(dt);
  }
  function rivalUpdate(dt, pz) {
    const r = rival;
    const lead = (r.z - pz) / SEG;
    if (g.state === 'run') r.z += r.speed * dt * (lead > 60 ? .85 : lead < -30 ? 1.1 : 1);
    r.laneT -= dt; if (r.laneT <= 0) { r.tx = LANES[Math.floor(Math.random() * 3)]; r.laneT = 1.6 + Math.random() * 1.6; }
    r.x = lerp(r.x, r.tx, Math.min(1, dt * 2.5));
    const ahead = r.z > pz;
    if (ahead !== r.lead) { r.lead = ahead; if (!ahead) { say(`You passed ${r.name}!`, 1.6); PUM.audio.sfx('up'); } else say(`${r.name} passed you!`, 1.4); }
    r.throwT -= dt;
    if (ahead && r.throwT <= 0 && r.z - pz < 70 * SEG && r.z - pz > 10 * SEG && g.state === 'run') {
      r.throwT = (assist >= 2 ? 4.2 : assist ? 3.4 : 2.6) - Math.min(.6, LV.world * .3) + Math.random();
      obs.push({type:'barrel', z:r.z - SEG * 2, x:LANES[Math.floor(Math.random() * 3)], w:.2, arc:1});
      PUM.audio.sfx('kick');
    }
    for (const ob of obs) if (ob.arc > 0) ob.arc = Math.max(0, ob.arc - dt * 1.6);
    if (Math.abs(r.z - pz) < SEG * .8 && Math.abs(r.x - g.x) < .45 && g.inv <= 0) { g.speed *= .6; g.inv = .6; g.shake = 6; PUM.audio.sfx('thud'); }
  }
  function hudOut(dt) {
    g.hudT -= dt; if (g.hudT > 0) return; g.hudT = .1;
    api.hud({fuel:g.fuel / cap, cargo:g.cargo, time:timeLimit ? Math.ceil(g.time) : null, timeLabel:kind === 'mixer' ? 'Concrete sets in' : null, progress:clamp((g.pos + playerZ) / (finishI * SEG), 0, 1),
      rival:rival ? {name:rival.name, ahead:rival.z > g.pos + playerZ, gap:Math.round(Math.abs(rival.z - g.pos - playerZ) / SEG)} : null});
  }

  /* ---------- drawing ---------- */
  const P = c => c === 'ink' ? CR.LINE : c === 'tire' ? CR.PAL.tire : c === 'metal' ? CR.PAL.metal : c === 'glass' ? CR.PAL.glass : CR.warm(E.col(c));
  function drawBg(ctx) {
    const sky = ctx.createLinearGradient(0, 0, 0, hz + 10); sky.addColorStop(0, WD.sky[0]); sky.addColorStop(1, WD.sky[1]);
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, hz + 4);
    ctx.fillStyle = 'rgba(255,240,180,.9)'; ctx.beginPath(); ctx.arc(W * .78, hz * .35, Math.min(W, H) * .06, 0, 7); ctx.fill();
    const layer = (k, h, col, f) => {
      ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(0, hz + 2);
      for (let sx = 0; sx <= W + 8; sx += 8) { const u = (sx / W + g.skyX * k) * 6.28; ctx.lineTo(sx, hz - h * (.5 + .3 * Math.sin(u * f) + .2 * Math.sin(u * f * 2.7 + 1))); }
      ctx.lineTo(W, hz + 2); ctx.closePath(); ctx.fill();
    };
    /* Big City: a skyline of towers that slides as the road curves */
    const city = (k, h, col, sd) => {
      const n = 14, bw = W / 9, off = ((g.skyX * k * W * 6) % (bw * n) + bw * n) % (bw * n);
      for (let i = 0; i < n; i++) {
        const r = mulberry32(sd * 97 + i), x = i * bw - off + (i * bw - off < -bw ? bw * n : 0), th = h * (.45 + r() * .55), tw = bw * (.7 + r() * .25);
        ctx.fillStyle = col; ctx.fillRect(x, hz - th, tw, th + 2);
        if (r() < .35) ctx.fillRect(x + tw * .45, hz - th - h * .12, 2, h * .12);
        ctx.fillStyle = 'rgba(255,248,225,.4)'; for (let yy = hz - th + 5; yy < hz - 6; yy += 9) for (let xx = x + 4; xx < x + tw - 5; xx += 8) if (r() < .55) ctx.fillRect(xx, yy, 3, 4);
      }
    };
    if (LV.world === 2) { city(.2, H * .2, '#A9B7C7', 1); city(.45, H * .12, '#8F9DAF', 2); return; }
    layer(.3, H * .12, LV.world === 1 ? '#DDA675' : '#B8C08A', 1.3);
    layer(.6, H * .07, LV.world === 1 ? '#C98E5C' : '#93AD72', 2.1);
  }
  function quad(ctx, x1, y1, w1, x2, y2, w2, col) { ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x1 - w1, y1); ctx.lineTo(x2 - w2, y2); ctx.lineTo(x2 + w2, y2); ctx.lineTo(x1 + w1, y1); ctx.closePath(); ctx.fill(); }
  function drawSeg(ctx, s) {
    const a = s.p1, b = s.p2, alt = Math.floor(s.i / 3) % 2;
    ctx.fillStyle = s.bridge ? (alt ? '#7FB3BF' : '#74A8B4') : WD.grass[alt];
    ctx.fillRect(0, b.sy, W, a.sy - b.sy + 1);
    const wf = s.bridge ? .62 : 1;
    if (s.bridge) quad(ctx, a.sx, a.sy, a.sw * .72, b.sx, b.sy, b.sw * .72, '#8B5E3C');
    else quad(ctx, a.sx, a.sy, a.sw * 1.16, b.sx, b.sy, b.sw * 1.16, alt ? '#F6EAD3' : '#C2533F');
    const fin = s.i >= finishI && s.i < finishI + 2;
    quad(ctx, a.sx, a.sy, a.sw * wf, b.sx, b.sy, b.sw * wf, fin ? (s.i % 2 ? '#FFFFFF' : '#4A3226') : s.ice ? (alt ? '#DDEEFA' : '#CFE4F5') : (alt ? '#8E8478' : '#877D71'));
    if (!alt && !s.bridge) for (const lx of [-1 / 3, 1 / 3]) quad(ctx, a.sx + lx * a.sw, a.sy, a.sw / 45, b.sx + lx * b.sw, b.sy, b.sw / 45, '#F6EAD3');
  }
  function sprite(ctx, type, x, y, u, ob, extra) {
    ctx.save(); ctx.lineJoin = 'round'; ctx.strokeStyle = P('ink'); ctx.lineWidth = Math.max(1, u * .012);
    const w = u;
    if (type === 'cone') { const s = w * .16; ctx.fillStyle = P('marigold'); ctx.beginPath(); ctx.moveTo(x, y - s * 1.3); ctx.lineTo(x + s * .45, y); ctx.lineTo(x - s * .45, y); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#FFFFFF'; ctx.fillRect(x - s * .27, y - s * .75, s * .54, s * .16); ctx.fillStyle = P('marigold'); ctx.fillRect(x - s * .6, y - s * .1, s * 1.2, s * .12); }
    else if (type === 'rock') { const s = w * .3; ctx.fillStyle = '#9AA0AA'; ctx.beginPath(); ctx.moveTo(x - s * .5, y); ctx.lineTo(x - s * .38, y - s * .45); ctx.lineTo(x - s * .05, y - s * .62); ctx.lineTo(x + s * .35, y - s * .4); ctx.lineTo(x + s * .5, y); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.moveTo(x - s * .25, y - s * .4); ctx.lineTo(x - s * .05, y - s * .52); ctx.lineTo(x - s * .1, y - s * .25); ctx.fill(); }
    else if (type === 'hole') { const s = w * .34; ctx.fillStyle = '#2E2F36'; ctx.beginPath(); ctx.ellipse(x, y - s * .04, s * .5, s * .1, 0, 0, 7); ctx.fill(); ctx.fillStyle = '#4A4C56'; ctx.beginPath(); ctx.ellipse(x, y - s * .06, s * .36, s * .06, 0, 0, 7); ctx.fill(); }
    else if (type === 'barrel') { const s = w * .2, lift = ob && ob.arc ? Math.sin(ob.arc * Math.PI) * s * 3 : 0; ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(x, y, s * .5, s * .12, 0, 0, 7); ctx.fill(); ctx.fillStyle = '#C8553D'; E.rr(ctx, x - s * .4, y - s - lift, s * .8, s, s * .12); ctx.fill(); ctx.stroke(); ctx.strokeStyle = '#FFC233'; ctx.lineWidth = Math.max(1, s * .08); ctx.beginPath(); ctx.moveTo(x - s * .4, y - s * .3 - lift); ctx.lineTo(x + s * .4, y - s * .3 - lift); ctx.moveTo(x - s * .4, y - s * .7 - lift); ctx.lineTo(x + s * .4, y - s * .7 - lift); ctx.stroke(); }
    else if (type === 'boulder') { const s = w * .34, f = ob ? ob.fall : 0; ctx.fillStyle = `rgba(0,0,0,${.35 - f * .25})`; ctx.beginPath(); ctx.ellipse(x, y, s * .5 * (1 - f * .5), s * .12, 0, 0, 7); ctx.fill(); if (f < .98) { const yy = y - f * s * 8; ctx.fillStyle = '#8E6A4E'; ctx.beginPath(); ctx.arc(x, yy - s * .45, s * .45, 0, 7); ctx.fill(); ctx.stroke(); ctx.fillStyle = 'rgba(0,0,0,.15)'; ctx.beginPath(); ctx.arc(x + s * .12, yy - s * .38, s * .2, 0, 7); ctx.fill(); } }
    else if (type === 'tractor') { const s = w * .42; ctx.fillStyle = '#22A06B'; E.rr(ctx, x - s * .42, y - s * .7, s * .84, s * .45, s * .05); ctx.fill(); ctx.stroke(); ctx.fillStyle = P('glass'); ctx.fillRect(x - s * .25, y - s * 1.02, s * .5, s * .3); ctx.strokeRect(x - s * .25, y - s * 1.02, s * .5, s * .3); ctx.fillStyle = P('tire'); E.rr(ctx, x - s * .55, y - s * .55, s * .22, s * .55, s * .05); ctx.fill(); E.rr(ctx, x + s * .33, y - s * .55, s * .22, s * .55, s * .05); ctx.fill(); ctx.fillStyle = '#FFC233'; ctx.beginPath(); ctx.arc(x, y - s * 1.08, s * .06, 0, 7); ctx.fill(); }
    else if (type === 'car') { const s = w * .42, col = extra || '#2F95D6'; ctx.fillStyle = col; E.rr(ctx, x - s * .45, y - s * .52, s * .9, s * .4, s * .08); ctx.fill(); ctx.stroke(); ctx.fillStyle = P('glass'); E.rr(ctx, x - s * .32, y - s * .78, s * .64, s * .28, s * .06); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#FFF4B0'; ctx.beginPath(); ctx.arc(x - s * .3, y - s * .3, s * .07, 0, 7); ctx.arc(x + s * .3, y - s * .3, s * .07, 0, 7); ctx.fill(); ctx.fillStyle = P('tire'); ctx.fillRect(x - s * .42, y - s * .14, s * .18, s * .14); ctx.fillRect(x + s * .24, y - s * .14, s * .18, s * .14); }
    else if (type === 'rival') drawTruckRear(ctx, x, y, w * .5, LV.world === 0 ? '#7357DB' : LV.world === 1 ? '#8E6640' : '#9FC6F0', true, 0);
    else if (type === 'bolt') { const s = w * .1, sp = Math.cos(g.t * 4); ctx.fillStyle = P('star'); ctx.beginPath(); ctx.ellipse(x, y - s * 2.2, s * Math.abs(sp) + 1, s, 0, 0, 7); ctx.fill(); ctx.stroke(); }
    else if (type === 'tree') { const s = w * .5; ctx.fillStyle = '#7A5A3A'; ctx.fillRect(x - s * .06, y - s * .5, s * .12, s * .5); ctx.fillStyle = '#3E9A5A'; ctx.beginPath(); ctx.arc(x, y - s * .75, s * .35, 0, 7); ctx.arc(x - s * .22, y - s * .55, s * .24, 0, 7); ctx.arc(x + s * .22, y - s * .55, s * .24, 0, 7); ctx.fill(); }
    else if (type === 'bush') { const s = w * .3; ctx.fillStyle = '#4FA35E'; ctx.beginPath(); ctx.arc(x, y - s * .3, s * .32, 0, 7); ctx.arc(x - s * .3, y - s * .2, s * .22, 0, 7); ctx.arc(x + s * .3, y - s * .2, s * .22, 0, 7); ctx.fill(); }
    else if (type === 'pine') { const s = w * .6; ctx.fillStyle = '#7A5A3A'; ctx.fillRect(x - s * .04, y - s * .2, s * .08, s * .2); ctx.fillStyle = '#2E7D52'; ctx.beginPath(); ctx.moveTo(x, y - s * 1.1); ctx.lineTo(x + s * .3, y - s * .2); ctx.lineTo(x - s * .3, y - s * .2); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.moveTo(x, y - s * 1.1); ctx.lineTo(x + s * .12, y - s * .75); ctx.lineTo(x - s * .12, y - s * .75); ctx.closePath(); ctx.fill(); }
    else if (type === 'snowman') { const s = w * .3; ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(x, y - s * .3, s * .3, 0, 7); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.arc(x, y - s * .78, s * .2, 0, 7); ctx.fill(); ctx.stroke(); ctx.fillStyle = P('marigold'); ctx.beginPath(); ctx.moveTo(x, y - s * .78); ctx.lineTo(x + s * .2, y - s * .74); ctx.lineTo(x, y - s * .72); ctx.fill(); }
    else if (type === 'cactus') { const s = w * .45; ctx.fillStyle = '#4E9A42'; E.rr(ctx, x - s * .08, y - s, s * .16, s, s * .08); ctx.fill(); ctx.stroke(); E.rr(ctx, x - s * .3, y - s * .7, s * .12, s * .35, s * .06); ctx.fill(); ctx.stroke(); E.rr(ctx, x + s * .18, y - s * .8, s * .12, s * .4, s * .06); ctx.fill(); ctx.stroke(); }
    else if (type === 'block') { const s = w * .9, bh = s * (.7 + (extra % 3) * .25), col = ['#9AA6B5', '#B5A898', '#C9A98A', '#A3B0A0'][extra % 4]; ctx.fillStyle = col; ctx.fillRect(x - s * .3, y - bh, s * .6, bh); ctx.strokeRect(x - s * .3, y - bh, s * .6, bh); ctx.fillStyle = '#E6EEF2'; for (let yy = y - bh + s * .06; yy < y - s * .12; yy += s * .12) for (let k = 0; k < 3; k++) ctx.fillRect(x - s * .24 + k * s * .18, yy, s * .1, s * .06); }
    else if (type === 'lamp') { const s = w * .6; ctx.fillStyle = '#5E5650'; ctx.fillRect(x - s * .02, y - s, s * .04, s); ctx.fillRect(x - s * .02, y - s, s * .2, s * .035); ctx.fillStyle = '#FFE3A0'; ctx.beginPath(); ctx.ellipse(x + s * .16, y - s * .95, s * .05, s * .03, 0, 0, 7); ctx.fill(); }
    else if (type === 'mesa') { const s = w * .9; ctx.fillStyle = '#B86A42'; ctx.beginPath(); ctx.moveTo(x - s * .5, y); ctx.lineTo(x - s * .35, y - s * .5); ctx.lineTo(x + s * .35, y - s * .5); ctx.lineTo(x + s * .5, y); ctx.closePath(); ctx.fill(); }
    else if (type === 'sign') { const s = w * .3; ctx.fillStyle = '#7A5A3A'; ctx.fillRect(x - s * .04, y - s, s * .08, s); ctx.fillStyle = '#22A06B'; E.rr(ctx, x - s * .5, y - s * 1.3, s, s * .45, s * .06); ctx.fill(); ctx.stroke(); if (s > 14) { ctx.fillStyle = '#FFFFFF'; ctx.font = `800 ${s * .24}px Sniglet, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(`${extra} km`, x, y - s * 1.07); } }
    ctx.restore();
  }
  function drawGate(ctx, s, gt) {
    const a = s.p1, u = a.sw, y = a.sy, ph = u * .95;
    ctx.save(); ctx.lineJoin = 'round'; ctx.strokeStyle = P('ink'); ctx.lineWidth = Math.max(1.5, u * .012);
    ctx.fillStyle = '#4A4F5C'; ctx.fillRect(a.sx - u * 1.08, y - ph, u * .05, ph); ctx.fillRect(a.sx + u * 1.03, y - ph, u * .05, ph);
    ctx.fillStyle = '#FFC233'; ctx.fillRect(a.sx - u * 1.1, y - ph - u * .05, u * 2.2, u * .06); ctx.strokeRect(a.sx - u * 1.1, y - ph - u * .05, u * 2.2, u * .06);
    LANES.forEach((lx, i) => {
      const cx = a.sx + lx * u, bw = u * .5, bh = u * .32, by = y - ph + u * .04;
      const crossed = !gt.done && gt.hint === i;
      ctx.fillStyle = gt.done ? (gt.opts[i] === gt.q.ans ? '#22A06B' : '#9AA0AA') : crossed ? '#9AA0AA' : ['#2F95D6', '#7357DB', '#E8577A'][i];
      E.rr(ctx, cx - bw / 2, by, bw, bh, u * .04); ctx.fill(); ctx.stroke();
      if (gt.opts) { const fs = Math.min(bh * .72, bw * .9 / Math.max(1, String(gt.opts[i]).length * .55)); if (fs > 5) E.numText(ctx, String(gt.opts[i]), cx, by + bh / 2 + 1, fs * .92, '#FFFFFF', P('ink')); }
      if (crossed) { ctx.strokeStyle = '#C0392B'; ctx.lineWidth = Math.max(2, u * .025); ctx.beginPath(); ctx.moveTo(cx - bw * .4, by + bh * .15); ctx.lineTo(cx + bw * .4, by + bh * .85); ctx.moveTo(cx + bw * .4, by + bh * .15); ctx.lineTo(cx - bw * .4, by + bh * .85); ctx.stroke(); ctx.strokeStyle = P('ink'); ctx.lineWidth = Math.max(1.5, u * .012); }
    });
    ctx.restore();
  }
  function drawFinish(ctx, s) {
    const a = s.p1, u = a.sw, y = a.sy, ph = u * .9;
    ctx.save(); ctx.lineWidth = Math.max(1.5, u * .012); ctx.strokeStyle = P('ink');
    ctx.fillStyle = '#FFFFFF'; ctx.fillRect(a.sx - u * 1.1, y - ph, u * .06, ph); ctx.fillRect(a.sx + u * 1.04, y - ph, u * .06, ph);
    for (let i = 0; i < 16; i++) { ctx.fillStyle = i % 2 ? '#FFFFFF' : '#4A3226'; ctx.fillRect(a.sx - u * 1.1 + i * u * 2.2 / 16, y - ph - u * .14, u * 2.2 / 16, u * .14); }
    ctx.strokeRect(a.sx - u * 1.1, y - ph - u * .14, u * 2.2, u * .14);
    if (u > 40) OT(ctx, 'FINISH', a.sx, y - ph - u * .25, u * .16, '#FFC233', P('ink'));
    ctx.restore();
  }
  function drawTruckRear(ctx, x, y, w, col, isRival, tilt) {
    const h = w * .95;
    ctx.save(); ctx.translate(x, y); ctx.rotate(tilt);
    ctx.lineJoin = 'round'; ctx.strokeStyle = P('ink'); ctx.lineWidth = Math.max(2, w * .018);
    ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(0, 0, w * .55, w * .07, 0, 0, 7); ctx.fill();
    ctx.fillStyle = P('tire'); E.rr(ctx, -w * .5, -h * .24, w * .2, h * .26, w * .03); ctx.fill(); ctx.stroke(); E.rr(ctx, w * .3, -h * .24, w * .2, h * .26, w * .03); ctx.fill(); ctx.stroke();
    ctx.fillStyle = col; E.rr(ctx, -w * .38, -h * .95, w * .76, h * .32, w * .06); ctx.fill(); ctx.stroke();
    ctx.fillStyle = P('glass'); E.rr(ctx, -w * .28, -h * .9, w * .56, h * .16, w * .04); ctx.fill(); ctx.stroke();
    const k = isRival ? 'rival' : kind, c = g.cargo;
    if (k === 'dump') {
      if (c > 0) { ctx.fillStyle = mat.col; ctx.beginPath(); ctx.moveTo(-w * .44, -h * .66); ctx.quadraticCurveTo(0, -h * (.66 + .42 * c), w * .44, -h * .66); ctx.closePath(); ctx.fill(); ctx.stroke(); }
      ctx.fillStyle = col; E.rr(ctx, -w * .48, -h * .66, w * .96, h * .46, w * .04); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.moveTo(-w * .4, -h * .5); ctx.lineTo(w * .4, -h * .5); ctx.moveTo(-w * .4, -h * .36); ctx.lineTo(w * .4, -h * .36); ctx.stroke(); ctx.strokeStyle = P('ink');
    } else if (k === 'flatbed') {
      ctx.fillStyle = P('metal'); E.rr(ctx, -w * .48, -h * .34, w * .96, h * .12, w * .03); ctx.fill(); ctx.stroke();
      const n = Math.ceil(c * 12);
      ctx.fillStyle = mat.col;
      if (trip.mat === 'beams') { for (let r = 0; r < Math.ceil(c * 4); r++) { E.rr(ctx, -w * .46, -h * (.43 + r * .09), w * .92, h * .08, w * .02); ctx.fill(); ctx.stroke(); } }
      else for (let i = 0; i < n; i++) { const r = Math.floor(i / 4), q = i % 4; ctx.fillRect(-w * .44 + q * w * .22, -h * (.45 + r * .11), w * .2, h * .1); ctx.strokeRect(-w * .44 + q * w * .22, -h * (.45 + r * .11), w * .2, h * .1); }
    } else if (k === 'mixer') {
      ctx.fillStyle = '#E6E9EE'; ctx.beginPath(); ctx.arc(0, -h * .55, w * .34, 0, 7); ctx.fill(); ctx.stroke();
      ctx.save(); ctx.beginPath(); ctx.arc(0, -h * .55, w * .34, 0, 7); ctx.clip(); ctx.strokeStyle = col; ctx.lineWidth = w * .07;
      for (let i = 0; i < 4; i++) { const a = g.spin + i * Math.PI / 2; ctx.beginPath(); ctx.arc(0, -h * .55, w * .22, a, a + .9); ctx.stroke(); }
      ctx.restore(); ctx.fillStyle = '#9AA0AA'; ctx.beginPath(); ctx.arc(0, -h * .55, w * .1, 0, 7); ctx.fill(); ctx.stroke();
      ctx.fillStyle = P('metal'); E.rr(ctx, -w * .48, -h * .3, w * .96, h * .1, w * .02); ctx.fill(); ctx.stroke();
    } else {
      ctx.fillStyle = '#3B2C5E'; E.rr(ctx, -w * .48, -h * .66, w * .96, h * .46, w * .04); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(-w * .16, -h * .45, w * .07, 0, 7); ctx.arc(w * .16, -h * .45, w * .07, 0, 7); ctx.fill(); ctx.fillStyle = P('ink'); ctx.beginPath(); ctx.arc(-w * .16, -h * .43, w * .035, 0, 7); ctx.arc(w * .16, -h * .43, w * .035, 0, 7); ctx.fill(); ctx.lineWidth = Math.max(2, w * .03); ctx.beginPath(); ctx.moveTo(-w * .26, -h * .57); ctx.lineTo(-w * .08, -h * .52); ctx.moveTo(w * .26, -h * .57); ctx.lineTo(w * .08, -h * .52); ctx.stroke();
    }
    ctx.lineWidth = Math.max(2, w * .018);
    ctx.fillStyle = '#4A4F5C'; E.rr(ctx, -w * .5, -h * .24, w, h * .1, w * .02); ctx.fill(); ctx.stroke();
    ctx.fillStyle = g.brake && !isRival ? '#FF3B3B' : '#C0392B'; E.rr(ctx, -w * .46, -h * .23, w * .14, h * .07, w * .02); ctx.fill(); E.rr(ctx, w * .32, -h * .23, w * .14, h * .07, w * .02); ctx.fill();
    if (g.brake && !isRival) { ctx.fillStyle = 'rgba(255,60,60,.35)'; ctx.beginPath(); ctx.arc(-w * .39, -h * .2, w * .12, 0, 7); ctx.arc(w * .39, -h * .2, w * .12, 0, 7); ctx.fill(); }
    ctx.restore();
  }
  function draw(ctx, w, h) {
    if (w !== W || h !== H) resize(w, h);
    const sh = g.shake ? (Math.random() - .5) * g.shake : 0;
    ctx.save(); ctx.translate(sh, g.bump > 0 ? Math.sin(g.bump * 30) * 4 : 0);
    drawBg(ctx);
    ctx.fillStyle = WD.grass[0]; ctx.fillRect(0, hz, W, H - hz);
    const base = segAt(g.pos), basePct = (g.pos % SEG) / SEG;
    const pseg = segAt(g.pos + playerZ), ppct = ((g.pos + playerZ) % SEG) / SEG;
    const py = lerp(pseg.p1.y, pseg.p2.y, ppct);
    let maxy = H, x = 0, dx = -(base.curve * basePct);
    const vis = [];
    for (let n = 0; n < DRAW; n++) {
      const s = segs[base.i + n]; if (!s) break;
      project(s.p1, g.x * ROAD - x, py + CAMH, g.pos);
      project(s.p2, g.x * ROAD - x - dx, py + CAMH, g.pos);
      x += dx; dx += s.curve;
      s.clip = maxy; s.dyn.length = 0;
      vis.push(s);
      if (s.p1.cz <= camDepth || s.p2.sy >= s.p1.sy || s.p2.sy >= maxy) continue;
      drawSeg(ctx, s); maxy = s.p2.sy;
    }
    const add = (z, item) => { const i = Math.floor(z / SEG) - base.i; if (i >= 0 && i < vis.length) vis[i].dyn.push(item); };
    for (const ob of obs) if (!ob.hit || ob.flyT > 0) add(ob.z, {k:'ob', ob});
    for (const b of bolts) if (!b.taken) add(b.z, {k:'bolt', b});
    for (const d of deco) { const i = d.i - base.i; if (i >= 0 && i < vis.length) vis[i].dyn.push({k:'deco', d}); }
    for (const gt of gates) add(gt.z, {k:'gate', gt});
    if (rival) add(rival.z, {k:'rival'});
    if (finishI - base.i >= 0 && finishI - base.i < vis.length) vis[finishI - base.i].dyn.push({k:'finish'});
    for (let n = vis.length - 1; n >= 0; n--) {
      const s = vis[n]; if (s.p1.cz <= camDepth || !s.dyn.length) continue;
      const a = s.p1, u = a.sw;
      ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, s.clip); ctx.clip();
      for (const it of s.dyn) {
        if (it.k === 'deco') { if (it.d.kind === 'sign') sprite(ctx, 'sign', a.sx + it.d.x * u, a.sy, u, null, it.d.n); else sprite(ctx, it.d.kind, a.sx + it.d.x * u, a.sy, u * it.d.s, null, it.d.c); }
        else if (it.k === 'ob') { const ob = it.ob; let yy = a.sy, xx = a.sx + ob.x * u; if (ob.flyT > 0) { yy -= (1 - ob.flyT) * u * .8; xx += (ob.x >= 0 ? 1 : -1) * (1 - ob.flyT) * u; } sprite(ctx, ob.type, xx, yy, u, ob, ob.type === 'car' ? ['#2F95D6', '#E8577A', '#7357DB', '#FFFFFF'][Math.floor(Math.abs(ob.x * 3 + 5)) % 4] : null); }
        else if (it.k === 'bolt') sprite(ctx, 'bolt', a.sx + it.b.x * u, a.sy, u);
        else if (it.k === 'gate') drawGate(ctx, s, it.gt);
        else if (it.k === 'rival') sprite(ctx, 'rival', a.sx + rival.x * u, a.sy, u);
        else if (it.k === 'finish') drawFinish(ctx, s);
      }
      ctx.restore();
    }
    const tw = Math.min(W * .42, H * .34), bob = Math.sin(g.t * 18) * (g.speed > 100 ? 1.2 : 0);
    if (!(g.inv > 0 && Math.floor(g.inv * 14) % 2)) drawTruckRear(ctx, W / 2, H * .8 + bob, tw, P(trip.color), false, g.wob * .06);
    if (g.speed > 200 && Math.random() < .35) parts.add({x:W / 2 - tw * .35, y:H * .8 - tw * .9, vx:-20 - Math.random() * 30, vy:-40, life:.6, size:5, grow:2, color:'rgba(90,95,110,.45)'});
    if (g.cargo < .4 && Math.random() < .2) parts.add({x:W / 2 + (Math.random() - .5) * tw * .4, y:H * .8 - tw * .8, vx:(Math.random() - .5) * 30, vy:-60, life:.9, size:6, grow:2.5, color:'rgba(60,60,70,.5)'});
    parts.draw(ctx);
    CR.paper(ctx, W, H, .35);
    { const fr = Math.min(48, W * .12), fx = W - fr - 12, fy = H * .52, fm = faceMood(); CR.portrait(ctx, kind, fx, fy, fr, E.col(trip.color), fm, g.t, {look:g.left ? -1 : g.right ? 1 : 0, spin:g.spin, tongue:false}); CR.text(ctx, CR.NAMES[kind], fx, fy + fr + 14, 17); }
    if (rain) { ctx.strokeStyle = 'rgba(220,235,255,.55)'; ctx.lineWidth = 2; ctx.beginPath(); for (const d of rain) { const rx = d.x * W, ry = d.y * H; ctx.moveTo(rx, ry); ctx.lineTo(rx - 4, ry + 16 * d.s); } ctx.stroke(); ctx.fillStyle = 'rgba(40,55,80,.12)'; ctx.fillRect(0, 0, W, H); }
    if (g.flash > 0) { ctx.fillStyle = `rgba(232,87,122,${g.flash})`; ctx.fillRect(0, 0, W, H); }
    if (g.speed > maxSpeed * .85 || g.boost > 0) { ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 2; for (let i = 0; i < 8; i++) { const a2 = Math.random() * Math.PI * 2, r1 = Math.min(W, H) * .45, r2 = r1 + 40; ctx.beginPath(); ctx.moveTo(W / 2 + Math.cos(a2) * r1, hz + Math.sin(a2) * r1 * .6); ctx.lineTo(W / 2 + Math.cos(a2) * r2, hz + Math.sin(a2) * r2 * .6); ctx.stroke(); } }
    if (g.state === 'intro') { const it = `Take the ${mat.name} to the ${LV.name.toLowerCase()}!`; let fs = Math.min(34, W * .08); ctx.font = `800 ${fs}px Sniglet, sans-serif`; const iw = ctx.measureText(it).width; if (iw > W * .92) fs *= W * .92 / iw; OT(ctx, it, W / 2, H * .24, fs, '#FFFFFF'); OT(ctx, g.introT > 1.4 ? '3' : g.introT > .7 ? '2' : '1', W / 2, H * .34, 64, '#FFC233'); }
    if (g.msgT > 0) { let fs = Math.min(50, W * .12); ctx.font = `800 ${fs}px Sniglet, sans-serif`; const mw = ctx.measureText(g.msg).width; if (mw > W * .9) fs *= W * .9 / mw; OT(ctx, g.msg, W / 2, H * .3, fs, '#FFC233'); }
    ctx.restore();
  }
  const ptrs = new Map();
  function pointer(type, x, y, id) {
    if (type === 'down' || (type === 'move' && ptrs.has(id))) ptrs.set(id, x < W / 2 ? 'left' : 'right');
    if (type === 'up') ptrs.delete(id);
    const v = [...ptrs.values()]; g.left = v.includes('left'); g.right = v.includes('right');
  }
  return {
    update, draw, resize, pointer,
    setControl(name, on) { if (name === 'left') g.left = on; if (name === 'right') g.right = on; if (name === 'brake') g.brake = on; },
    refill(frac) { g.fuel = Math.min(cap, g.fuel + frac * cap); PUM.audio.sfx('refuel'); },
    refillTarget: () => g.fuel >= cap * .999,
    level: () => g.fuel / cap,
    resumeFromRefill() { if (g.state === 'wait') { g.state = 'run'; g.speed = Math.max(g.speedBefore || 0, g.speed, maxSpeed * .2); g.speedBefore = 0; } },
    onStart() { PUM.audio.engineOn(); }, onStop() { PUM.audio.engineOff(); }, onPause() { PUM.audio.engineSet(0, 0); },
    _debug: () => ({g, gates, obs, rival, LANES, finishI, SEG, playerZ, maxSpeed, timeLimit, lossMul, segs}),
  };
};
})();
