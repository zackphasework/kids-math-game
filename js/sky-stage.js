/* Sky Quest stage kit: the moving parts of a quest stage, on top of the ground, gaps and props in sky.js.
   - wisps:    little shadow wisps that wander the path. Jump on them (or dash into them) for crystals; touching one bumps you back.
   - bounce:   a bouncy flower (Blossom), clam (Grotto) or steam vent (Ember) that throws you up a high ledge.
   - crumble:  petal (Blossom), coral (Grotto) or rock (Ember) platforms that fall soon after you land, then grow back.
   - bubbles:  bubble platforms that float up and down over a gap.
   - stones:   a number bridge. Jump on the stone with the answer and the bridge rises; wrong stones sink.
   - power:    your spirit helps: a vine to climb (Blossom), bubbles across a wide gap (Grotto), brambles to burn (Ember).
   - chase ... chaseEnd: a shadow wave chases you.
   - turtle:   ride the sea turtle and pop the bubble with the answer.
   - lava:     climb away from rising lava.
   Everything is in game units (y points down). It's drawn in 2D; in 3D the same drawings go on the 2D layer over the scene. */
(function () {
'use strict';
const S = PUM.SKY, K = PUM.SKYART, E = PUM.engine, A = PUM.audio;
const TAU = Math.PI * 2, clamp = (v, a, b) => Math.max(a, Math.min(b, v)), lerp = (a, b, t) => a + (b - a) * t;
const ease = k => 1 - (1 - k) * (1 - k);
const LINE = K.LINE || '#22374B';
const ST = S.STAGE = {};

/* ---------- building: each piece adds to the stage W at x with ground height h, and returns the new [x, h] ---------- */
const ground = (W, x, w, h) => W.blocks.push({x, w, top:h, ground:true});
const gem = (W, x, y, v = 1, big = false) => W.crystals.push({x, y, got:false, v, big});
const row = (W, x0, w, y, n) => { for (let i = 0; i < n; i++) gem(W, x0 + (i + .5) * w / n, y); };
ST.init = W => { for (const k of ['wisps', 'bouncers', 'stoneSets', 'powers', 'rides']) W[k] = []; W.chase = null; W.lava = null; W.extraT = 0; };
ST.pieces = {
  wisps(W, x, h, n = 2) {
    const len = 220 + n * 180; ground(W, x, len, h);
    for (let i = 0; i < n; i++) W.wisps.push({x0:x + 170 + i * 180, x:x + 170 + i * 180, y:h, range:50, ph:i * 2.2, dead:false, dt:0, face:-1});
    row(W, x + 60, len - 120, h - 46, Math.floor(len / 140));
    return [x + len, h];
  },
  /* a bouncer, then a ledge too high to jump */
  bounce(W, x, h, up = 230) {
    ground(W, x, 300, h); W.bouncers.push({x:x + 180, y:h, sq:0});
    for (let i = 0; i < 3; i++) gem(W, x + 195 + i * 22, h - 160 - i * 70);
    const h2 = h - up; ground(W, x + 300, 240, h2); row(W, x + 330, 180, h2 - 46, 2);
    return [x + 540, h2];
  },
  crumble(W, x, h, n = 3, isle = 0) {
    const gw = 100 + n * 210; W.gaps.push({x, w:gw, h});
    for (let i = 0; i < n; i++) { const px = x + 100 + i * 210, top = h - 40 - (i % 2) * 40; W.blocks.push({x:px, w:120, top, top0:top, plat:true, dyn:['petal', 'coral', 'rock'][isle] || 'petal', cr:{t:-1, fall:0, back:0}}); gem(W, px + 60, top - 50); }
    return [x + gw, h];
  },
  bubbles(W, x, h, n = 3) {
    const gw = 100 + n * 220; W.gaps.push({x, w:gw, h});
    for (let i = 0; i < n; i++) { const px = x + 90 + i * 220, top = h - 30; W.blocks.push({x:px, w:120, top, top0:top, plat:true, dyn:'bubble', mv:{ay:55, sp:1.5, ph:i * 2.1}}); gem(W, px + 60, top - 120); }
    return [x + gw, h];
  },
  /* the number bridge: three stones before a gap too wide to jump */
  stones(W, x, h) {
    ground(W, x, 700, h);
    const set = {x0:x + 230, y:h, q:null, opts:null, done:false, tried:false, stones:[], bridge:[]};
    for (let i = 0; i < 3; i++) { const bl = {x:x + 230 + i * 160, w:96, top:h - 58, top0:h - 58, plat:true, dyn:'stone', set, i, v:0, sink:0}; W.blocks.push(bl); set.stones.push(bl); }
    const gx = x + 700, gw = 420; W.gaps.push({x:gx, w:gw, h, noHint:true});
    for (let i = 0; i < 3; i++) { const bl = {x:gx + i * 140, w:140, top:h + 90, top0:h, plat:true, dyn:'bridge', off:true, hidden:true, set}; W.blocks.push(bl); set.bridge.push(bl); }
    ground(W, gx + gw, 200, h);
    W.stoneSets.push(set); W.extraT += 8;
    return [gx + gw + 200, h];
  },
  power(W, x, h, arg, isle = 0) {
    if (isle === 0) {
      /* a cliff too high even for double jump; the spirit grows a vine with leaf steps */
      ground(W, x, 320, h); const wx = x + 320, top = h - 320;
      const leaves = [[wx - 100, h - 85], [wx - 215, h - 170], [wx - 100, h - 255]].map(([lx, ly]) => { const bl = {x:lx, w:96, top:ly, top0:ly, plat:true, dyn:'leaf', off:true, hidden:true}; W.blocks.push(bl); return bl; });
      W.powers.push({kind:'vine', bx:wx - 10, x:wx, y:h, top, solved:false, k:0, leaves});
      ground(W, wx, 260, top); row(W, wx + 40, 180, top - 46, 2);
      W.extraT += 4;
      return [wx + 260, top];
    }
    if (isle === 1) {
      /* a gap too wide to cross; the spirit blows bubble platforms */
      ground(W, x, 260, h); const gx = x + 260, gw = 600; W.gaps.push({x:gx, w:gw, h, noHint:true});
      const leaves = [70, 245, 420].map((dx, i) => { const bl = {x:gx + dx, w:110, top:h - 20, top0:h - 20, plat:true, dyn:'bubble', mv:{ay:12, sp:1.8, ph:i}, off:true, hidden:true}; W.blocks.push(bl); gem(W, gx + dx + 55, h - 110); return bl; });
      W.powers.push({kind:'bubble', bx:gx - 6, x:gx, y:h, solved:false, k:0, leaves});
      ground(W, gx + gw, 240, h);
      W.extraT += 3;
      return [gx + gw + 240, h];
    }
    /* a bramble wall; the spirit burns it away */
    ground(W, x, 440, h);
    W.powers.push({kind:'bramble', bx:x + 260, x:x + 260, y:h, solved:false, k:0, leaves:[]});
    row(W, x + 300, 120, h - 46, 2);
    return [x + 440, h];
  },
  chase(W, x, h) { W.chase = {x0:x, x1:x + 2400, wave:null, done:false}; return [x, h]; },
  chaseEnd(W, x, h) { if (W.chase) W.chase.x1 = x; return [x, h]; },
  turtle(W, x, h, len = 1500) {
    ground(W, x, 240, h); const gx = x + 240; W.gaps.push({x:gx, w:len, h, noHint:true, sea:true});
    const tw = 230, x1 = gx + len - tw;
    const ride = {state:'wait', x0:gx, x1, sets:[1, 2, 3].map(k => ({at:gx + (x1 - gx) * k / 4, q:null, opts:null, done:false, tried:false, pop:[]})), i:0, wait:0};
    const tb = {x:gx, w:tw, top:h, plat:true, dyn:'turtle', ride, sea:h + 80};
    W.blocks.push(tb); W.rides.push(tb);
    for (let i = 1; i < 12; i++) if (i % 3) gem(W, gx + len * i / 12, h - 120);
    ground(W, gx + len, 260, h);
    W.extraT += len / 150 + 15;
    return [gx + len + 260, h];
  },
  /* n must be even, so the last step is on the right, next to the top ledge */
  lava(W, x, h, n = 6) {
    ground(W, x, 160, h); const px = x + 160, pw = 560;
    W.gaps.push({x:px, w:pw, h, noHint:true});
    for (let i = 0; i < n; i++) { const lx = i % 2 ? px + 300 : px + 40, top = h - 85 * (i + 1); W.blocks.push({x:lx, w:140, top, plat:true}); gem(W, lx + 70, top - 46); }
    const top = h - 85 * (n + 1);
    ground(W, px + pw, 300, top); row(W, px + pw + 40, 200, top - 46, 2);
    W.lava = {x0:px, x1:px + pw, y:h + 90, y0:h + 90, top, on:false, done:false};
    W.extraT += 12;
    return [px + pw + 300, top];
  },
};
/* a fair time for the fast-finish challenge, counting only time spent exploring (not battles or locks) */
ST.par = (W, age) => Math.round((W.len / 250 * 1.7 + (W.extraT || 0) + 10) * (age <= 5 ? 1.5 : age <= 7 ? 1.25 : 1));

/* ---------- running a stage ----------
   o: {W, hero, g, p, api, assist, isle, comp, parts, banner, say, openLock, hurt, locked} */
ST.run = function (o) {
  const {W, hero:H, g, p, api, isle} = o, assist = o.assist || 0, age = p.age || 7;
  const F = S.FOES[['petal', 'jelly', 'ash'][isle] || 'petal'];
  const CR_T = age <= 5 || assist ? 1 : .6;
  const WAVE_SP = (age <= 5 ? 115 : age <= 7 ? 145 : 170) * (assist >= 2 ? .6 : assist ? .8 : 1);
  const LAVA_SP = (age <= 5 ? 20 : age <= 7 ? 28 : 36) * (assist >= 2 ? .5 : assist ? .75 : 1);
  let prevY = H.y, prevOn = null, fly = null;
  const fx = [];
  const pop = (x, y, text, col = '#FFE27A') => fx.push({x, y, text, col, t:0});
  const gems = (n, x, y) => { api.addMp(n); g.crystals += n; pop(x, y, '+' + n, '#9BF6FF'); };
  const qHide = () => { const qb = document.getElementById('qbanner'); if (qb) qb.hidden = true; };
  function ask(set, hint) { const {q, options} = PUM.gateQuestion(p, 3); set.q = q; set.opts = options; api.showQuestion(q, hint); }
  /* only the first pick counts for the math record */
  function record(set, ok) { if (set.tried) return; set.tried = true; g.asked++; api.answer(ok, set.q); if (ok) { g.right++; g.xp += 10; } }

  function appear(bl, dt) {
    if (bl.ap == null || bl.ap >= 1) return;
    bl.ap = Math.min(1, bl.ap + dt * 2);
    if (bl.ap >= 0) bl.hidden = false;
    if (bl.ap > .5) bl.off = false;
    if (bl.dyn === 'bridge') bl.top = bl.top0 + (1 - ease(clamp(bl.ap, 0, 1))) * 90;
  }
  function crumbleStep(bl, dt) {
    const c = bl.cr;
    if (c.back > 0) c.back = Math.max(0, c.back - dt);
    if (c.t < 0) return;
    c.t += dt;
    if (!bl.off && c.t >= CR_T) { bl.off = true; c.fall = 0; A.tone(300, 0, .2, 'triangle', .05, 120); o.parts.burst(bl.x + bl.w / 2, bl.top, 10, {speed:120, life:.6, size:3, color:bl.dyn === 'rock' ? ['#7A6A70', '#FF8A3D'] : bl.dyn === 'coral' ? ['#FF9AC8', '#FFD27A'] : ['#FFC6DD', '#F6A9CC'], g:400}); }
    if (bl.off) { c.fall += dt; if (c.t > CR_T + 2.6) { bl.off = false; c.t = -1; c.fall = 0; c.back = .4; } }
  }
  function rideStep(tb, dt) {
    const R = tb.ride, ox = tb.x;
    if (R.state === 'wait' && H.on === tb && H.ground) { R.state = 'go'; o.banner('All aboard!', 'The turtle will carry you across', 1.6, '#9BF6FF'); o.say('All aboard!'); A.sfx('chime'); }
    else if (R.state === 'go') {
      const set = R.sets[R.i], stop = set ? set.at : R.x1;
      tb.x = Math.min(stop, tb.x + 150 * dt);
      if (tb.x >= stop) {
        if (set) { R.state = 'stop'; set.pop = [false, false, false]; ask(set, 'Jump up and pop the bubble with the answer!'); }
        else { R.state = 'done'; o.banner('Land ho!', 'Thanks, turtle!', 1.2); }
      }
    } else if (R.state === 'stop' && R.wait > 0) { R.wait -= dt; if (R.wait <= 0) { R.i++; R.state = 'go'; } }
    /* the turtle carries you, even while you jump */
    const dx = tb.x - ox;
    if (dx && Math.abs(H.x - (tb.x + tb.w / 2)) < tb.w / 2 + 60 && H.y <= tb.top + 2) H.x += dx;
  }
  const bubblePos = (tb, j) => [tb.x + tb.w / 2 + (j - 1) * 90, tb.top - 168 + Math.sin(g.t * 2 + j) * 6];

  /* before the hero moves: platforms, the turtle, the wave and the lava */
  function pre(dt) {
    prevY = H.y;
    const t = g.t;
    for (const bl of W.blocks) {
      if (!bl.dyn) continue;
      const ox = bl.x, oy = bl.top;
      appear(bl, dt);
      if (bl.mv && !bl.hidden) bl.top = bl.top0 + Math.sin(t * bl.mv.sp + bl.mv.ph) * bl.mv.ay;
      if (bl.cr) crumbleStep(bl, dt);
      if (bl.dyn === 'stone' && bl.sink > 0 && bl.sink < 1) { bl.sink = Math.min(1, bl.sink + dt * 1.6); bl.top = bl.top0 + bl.sink * 70; if (bl.sink >= 1) bl.off = true; }
      if (bl.ride) rideStep(bl, dt);
      else if (H.on === bl && H.ground && !bl.off && (bl.x !== ox || bl.top !== oy)) { H.x += bl.x - ox; H.y = bl.top; }
    }
    for (const set of W.stoneSets) {
      if (!set.q && !set.done && H.x > set.x0 - 460) { ask(set, 'Jump on the stone with the answer!'); set.stones.forEach((s, i) => { s.v = set.opts[i]; }); }
      /* dashed or glided past it: put the question away */
      if (set.q && !set.done && H.x > set.bridge[2].x + 260) { set.done = true; qHide(); }
    }
    for (const pw of W.powers) if (pw.solved) pw.k = Math.min(1.6, pw.k + dt);
    const C = W.chase;
    if (C && !C.done) {
      if (!C.wave && H.x > C.x0 + 30) { C.wave = {x:H.x - 480, a:0, fade:0}; o.banner('Run!', 'A shadow wave is coming!', 1.6, '#B04CFF'); o.say('Run! A shadow wave is coming!'); A.sfx('boss'); }
      else if (C.wave) {
        const w = C.wave; w.a = Math.min(1, w.a + dt * 2);
        w.x = Math.max(w.x + WAVE_SP * dt, H.x - 720);
        if (H.x > C.x1) { C.done = true; o.banner('You escaped!', '+5 crystals', 1.6, '#FFE27A'); gems(5, H.x, H.y - 130); A.sfx('chime'); g.escapes = (g.escapes || 0) + 1; }
        else if (w.x > H.x - 28) { o.hurt('The wave caught you!'); w.x = H.x - 420; }
      }
    } else if (C && C.wave) { C.wave.fade += dt; C.wave.x -= 80 * dt; }
    const LV = W.lava;
    if (LV && !LV.done) {
      if (!LV.on && H.x > LV.x0 + 10) { LV.on = true; o.banner('The lava is rising!', 'Climb up, fast!', 1.8, '#FF8A3D'); o.say('The lava is rising! Climb up fast!'); A.sfx('boss'); }
      if (LV.on) {
        LV.y = Math.max(LV.top + 50, LV.y - LAVA_SP * dt);
        if (H.x > LV.x1 + 30 && H.ground && H.y <= LV.top + 1) { LV.done = true; o.banner('You escaped the lava!', '+5 crystals', 1.8, '#FFE27A'); gems(5, H.x, H.y - 130); A.sfx('chime'); g.escapes = (g.escapes || 0) + 1; }
      }
    } else if (LV && LV.done) LV.y = Math.min(LV.y0, LV.y + 80 * dt);
  }
  /* spirit power spots hold you back (like gates) until you answer */
  function barrier(nx) {
    for (const pw of W.powers) if (!pw.solved && nx > pw.bx - 46 && H.x <= pw.bx - 45) { nx = pw.bx - 46; H.vx = 0; if (!o.locked()) o.openLock('power', pw); }
    return nx;
  }
  /* the hero just stood on bl (or left the ground: null) */
  function land(bl) {
    if (bl === prevOn) return;
    prevOn = bl;
    if (!bl) return;
    if (bl.cr && bl.cr.t < 0) bl.cr.t = 0;
    if (bl.dyn === 'stone') {
      const set = bl.set;
      if (set.done || !set.q || bl.sink > 0) return;
      const ok = bl.v === set.q.ans; record(set, ok);
      if (ok) {
        set.done = true; bl.win = 1; api.hideQuestion(true); A.sfx('chime');
        o.banner('Right! The bridge rises!', '', 1.3, '#FFE27A');
        set.bridge.forEach((b, i) => { b.ap = -i * .3; });
        gems(3, bl.x + bl.w / 2, bl.top - 80);
        o.parts.burst(bl.x + bl.w / 2, bl.top, 18, {speed:180, life:.8, size:3, color:['#FFE27A', '#FFFFFF'], shape:'star'});
      } else { bl.sink = .001; pop(bl.x + bl.w / 2, bl.top - 70, 'Not that one!', '#FFB0C8'); }
    }
  }
  /* after the hero moves: bouncers, wisps, turtle bubbles, lava */
  function post(dt) {
    for (const bo of W.bouncers) {
      bo.sq = Math.max(0, bo.sq - dt * 3);
      const top = bo.y - 16, d = Math.abs(H.x - bo.x);
      if (d < 30 && H.y >= top - 2 && H.y <= bo.y + 1 && H.vy >= 0 && (prevY <= top + 2 || (H.ground && d < 20))) {
        H.y = top; H.vy = -1300; H.ground = false; H.coyote = 0; H.on = null; H.used2 = false; H.usedDash = false; bo.sq = 1; g.bounces = (g.bounces || 0) + 1;
        A.tone(320, 0, .22, 'sine', .07, 900); A.sfx('jump');
        o.parts.burst(bo.x, top, 12, {speed:160, life:.5, size:3, color:isle === 2 ? ['#FFFFFF', '#FFD9B0'] : isle === 1 ? ['#BFF6FF', '#FFFFFF'] : ['#FFC6DD', '#FFE27A'], g:200});
      }
    }
    for (const w of W.wisps) {
      if (w.dead) { w.dt += dt; continue; }
      const nx = w.x0 + Math.sin(g.t * .9 + w.ph) * w.range; w.face = nx > w.x ? 1 : -1; w.x = nx;
      const dx = H.x - w.x, dy = H.y - w.y;
      if (Math.abs(dx) < 34 && dy > -70 && dy < 8) {
        if ((H.vy > 0 && prevY < w.y - 30) || H.dashT > 0) {
          w.dead = true; w.dt = 0; if (H.dashT <= 0) { H.vy = -640; H.used2 = false; } g.stomps = (g.stomps || 0) + 1;
          A.sfx('slash'); gems(2, w.x, w.y - 80);
          o.parts.burst(w.x, w.y - 40, 16, {speed:200, life:.6, size:3, color:[S.EL[F.el].col, '#FFFFFF'], shape:'star'});
        } else if (H.inv <= 0) {
          H.vx = (dx < 0 ? -1 : 1) * 460; H.vy = -380; H.ground = false; H.on = null; H.inv = .9; g.bumps = (g.bumps || 0) + 1;
          A.tone(200, 0, .15, 'square', .04, 120); pop(H.x, H.y - 110, 'Bonk!', '#FFB0C8');
        }
      }
    }
    for (const tb of W.rides) {
      const R = tb.ride; if (R.state !== 'stop' || R.wait > 0) continue;
      const set = R.sets[R.i];
      set.opts.forEach((v, j) => {
        if (set.pop[j] || set.done) return;
        const [bx, by] = bubblePos(tb, j);
        if (Math.hypot(H.x - bx, H.y - 46 - by) < 38) {
          set.pop[j] = true; const ok = v === set.q.ans; record(set, ok);
          o.parts.burst(bx, by, 16, {speed:180, life:.5, size:3, color:ok ? ['#BFF6FF', '#FFFFFF', '#FFE27A'] : ['#9AA4C0', '#FFFFFF']});
          if (ok) { set.done = true; R.wait = .8; api.hideQuestion(true); A.sfx('chime'); gems(3, bx, by - 40); }
          else { A.tone(260, 0, .15, 'sine', .05, 160); pop(bx, by - 40, 'Not that one!', '#FFB0C8'); }
        }
      });
    }
    const LV = W.lava;
    if (LV && LV.on && !LV.done && H.x > LV.x0 - 10 && H.x < LV.x1 + 10 && H.y > LV.y - 6) {
      H.y = LV.y - 8; H.vy = -1100; H.ground = false; H.on = null; H.used2 = false; H.usedDash = false;
      o.parts.burst(H.x, LV.y, 18, {speed:220, life:.6, size:3, color:['#FFE27A', '#FF8A3D'], g:300});
      if (H.inv <= 0) { o.hurt('Hot hot hot!'); LV.y = Math.min(LV.y0, LV.y + 160); }
    }
    /* the spirit flies over to help */
    if (fly && fly.t > 0) { fly.t -= dt; const k = 1 - Math.exp(-dt * 6); g.comp.x = lerp(g.comp.x, fly.x, k); g.comp.y = lerp(g.comp.y, fly.y, k); }
    for (const f of fx) f.t += dt;
    while (fx.length && fx[0].t > 1.1) fx.shift();
  }
  function solved(pw) {
    pw.solved = true; pw.k = 0; A.sfx('chime');
    const nm = o.comp.name;
    if (pw.kind === 'vine') { o.banner(`${nm} grows a vine!`, 'Climb the leaves up the cliff', 1.8, '#9BF6A0'); o.say(`${nm} grows a vine! Climb the leaves.`); pw.leaves.forEach((b, i) => { b.ap = -.6 - i * .35; }); fly = {x:pw.x - 60, y:pw.top + 40, t:1.6}; }
    else if (pw.kind === 'bubble') { o.banner(`${nm} blows bubbles!`, 'Hop across on the bubbles', 1.8, '#9BF6FF'); o.say(`${nm} blows bubbles! Hop across.`); pw.leaves.forEach((b, i) => { b.ap = -.4 - i * .35; }); fly = {x:pw.x + 300, y:pw.y - 170, t:1.6}; }
    else { o.banner(`${nm} burns the brambles!`, 'The way is clear', 1.6, '#FFB347'); o.say(`${nm} burns the brambles!`); fly = {x:pw.x - 40, y:pw.y - 150, t:1.4}; A.sfx('blast'); }
  }
  /* falling while riding the turtle puts you back on its shell */
  function respawn() {
    for (const tb of W.rides) { const R = tb.ride; if (R.state === 'go' || R.state === 'stop') return {x:tb.x + tb.w / 2, y:tb.top}; }
    return null;
  }
  function onFall() { const C = W.chase; if (C && C.wave && !C.done) C.wave.x = Math.min(C.wave.x, H.x - 420); }

  /* ---------- drawing ----------
     pj maps world units to where they're drawn, k is pixels per unit (1 in 2D, where c is already in world units). */
  const font = (c, sz) => { c.font = `${sz}px "Dela Gothic One", Lexend, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineJoin = 'round'; };
  const outlined = (c, text, x, y, sz, col = '#FFFFFF', edge = '#120A20') => { font(c, sz); c.lineWidth = sz * .22; c.strokeStyle = edge; c.strokeText(text, x, y); c.fillStyle = col; c.fillText(text, x, y); };
  function slab(c, bl, t) {
    const w = bl.w, cr = bl.cr; let ox = 0, oy = 0, a = 1;
    if (cr && cr.t >= 0 && !bl.off) ox = Math.sin(t * 70) * 2.5 * Math.min(1, cr.t / CR_T + .2);
    if (bl.off) { oy = cr.fall * cr.fall * 600; a = Math.max(0, 1 - cr.fall * 1.6); }
    if (cr && cr.back > 0) a = 1 - cr.back / .4;
    if (a <= 0) return;
    c.save(); c.globalAlpha = a; c.translate(ox, oy);
    const pal = bl.dyn === 'rock' ? ['#5E4E56', '#3A2A30', '#FF8A3D'] : bl.dyn === 'coral' ? ['#FF9AC8', '#C2557F', '#FFE27A'] : ['#FFC6DD', '#E07FA8', '#FFFFFF'];
    c.fillStyle = pal[1]; c.beginPath(); c.moveTo(4, 6); c.quadraticCurveTo(w / 2, 34, w - 4, 6); c.closePath(); c.fill(); c.strokeStyle = LINE; c.lineWidth = 2; c.stroke();
    c.fillStyle = pal[0]; E.rr(c, 0, -4, w, 14, 7); c.fill(); c.stroke();
    if (bl.dyn === 'petal') { c.fillStyle = 'rgba(255,255,255,.7)'; for (let i = 14; i < w - 8; i += 26) { c.beginPath(); c.ellipse(i, 1, 5, 2.4, .4, 0, TAU); c.fill(); } }
    if (cr && cr.t >= 0) { c.strokeStyle = pal[2]; c.lineWidth = 2; c.beginPath(); c.moveTo(w * .3, -4); c.lineTo(w * .38, 4); c.lineTo(w * .33, 10); c.moveTo(w * .7, -4); c.lineTo(w * .62, 5); c.stroke(); }
    c.restore();
  }
  function bubble(c, x, y, r, t, ph = 0) {
    c.save(); c.translate(x, y); const wob = 1 + Math.sin(t * 3 + ph) * .04; c.scale(wob, 2 - wob);
    const g2 = c.createRadialGradient(-r * .3, -r * .35, r * .1, 0, 0, r); g2.addColorStop(0, 'rgba(255,255,255,.5)'); g2.addColorStop(.6, 'rgba(140,230,255,.22)'); g2.addColorStop(1, 'rgba(160,240,255,.55)');
    c.fillStyle = g2; c.beginPath(); c.arc(0, 0, r, 0, TAU); c.fill();
    c.strokeStyle = 'rgba(220,255,255,.9)'; c.lineWidth = 2.5; c.stroke();
    c.fillStyle = 'rgba(255,255,255,.85)'; c.beginPath(); c.ellipse(-r * .38, -r * .42, r * .18, r * .1, -.6, 0, TAU); c.fill();
    c.restore();
  }
  function drawBlock(c, bl, t) {
    const w = bl.w;
    if (bl.dyn === 'petal' || bl.dyn === 'rock' || bl.dyn === 'coral') return slab(c, bl, t);
    if (bl.dyn === 'bubble') {
      const k = bl.ap == null ? 1 : ease(clamp(bl.ap, 0, 1));
      c.save(); c.translate(w / 2, 8); c.scale(k, k);
      c.save(); c.scale(1, .32); bubble(c, 0, 0, w / 2, t, bl.x); c.restore();
      c.fillStyle = 'rgba(220,255,255,.55)'; E.rr(c, -w / 2 + 8, -9, w - 16, 5, 3); c.fill();
      c.restore(); return;
    }
    if (bl.dyn === 'stone') {
      const set = bl.set, win = set.done && set.q && bl.v === set.q.ans, a = 1 - bl.sink * .7;
      c.save(); c.globalAlpha = a;
      if (win) { c.shadowColor = '#FFE27A'; c.shadowBlur = 22 + Math.sin(t * 5) * 6; }
      const gr = c.createLinearGradient(0, 0, 0, 62); gr.addColorStop(0, win ? '#FFE9A8' : '#A9B3D6'); gr.addColorStop(1, win ? '#D9A93B' : '#5E6894');
      c.fillStyle = gr; E.rr(c, 0, 0, w, 62, 12); c.fill(); c.shadowBlur = 0; c.strokeStyle = LINE; c.lineWidth = 2.5; c.stroke();
      c.fillStyle = 'rgba(255,255,255,.35)'; E.rr(c, 6, 4, w - 12, 8, 4); c.fill();
      outlined(c, set.q ? String(bl.v) : '?', w / 2, 34, String(bl.v).length > 2 ? 22 : 28, win ? '#FFFFFF' : '#FFFFFF');
      c.restore(); return;
    }
    if (bl.dyn === 'bridge') {
      const a = clamp((bl.ap || 0) * 2, 0, 1); c.save(); c.globalAlpha = a;
      c.fillStyle = '#8A5A3A'; c.fillRect(0, 2, w, 16); c.strokeStyle = LINE; c.lineWidth = 2; c.strokeRect(0, 2, w, 16);
      c.strokeStyle = '#5A3A24'; for (let i = 20; i < w; i += 22) { c.beginPath(); c.moveTo(i, 2); c.lineTo(i, 18); c.stroke(); }
      c.strokeStyle = '#FFE27A'; c.globalAlpha = a * .7; c.lineWidth = 2; c.beginPath(); c.moveTo(0, -26); c.quadraticCurveTo(w / 2, -16, w, -26); c.stroke();
      c.fillStyle = '#6A4630'; c.globalAlpha = a; c.fillRect(-3, -30, 7, 34);
      c.restore(); return;
    }
    if (bl.dyn === 'leaf') {
      const k = ease(clamp(bl.ap == null ? 1 : bl.ap, 0, 1)); c.save(); c.translate(w, 6); c.scale(k, k);
      c.fillStyle = '#4FBF6A'; c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(-w * .5, -16, -w, 0); c.quadraticCurveTo(-w * .5, 16, 0, 0); c.fill(); c.strokeStyle = LINE; c.lineWidth = 2; c.stroke();
      c.strokeStyle = '#2F8A4A'; c.beginPath(); c.moveTo(0, 0); c.lineTo(-w * .9, 0); c.stroke();
      c.restore(); return;
    }
    if (bl.dyn === 'turtle') {
      const s = .95, moving = bl.ride.state === 'go';
      c.save(); c.translate(w / 2, 125 * s + 4); K.turtle(c, 0, 0, s, t, true); c.restore();
      /* sea water in front of its belly */
      const wg = c.createLinearGradient(-60, 0, w + 60, 0), wc = isle === 1 ? '42,154,170' : '60,140,200';
      wg.addColorStop(0, `rgba(${wc},0)`); wg.addColorStop(.25, `rgba(${wc},.82)`); wg.addColorStop(.75, `rgba(${wc},.82)`); wg.addColorStop(1, `rgba(${wc},0)`);
      c.save(); c.fillStyle = wg; c.fillRect(-60, 82, w + 120, 70);
      c.strokeStyle = 'rgba(220,255,250,.8)'; c.lineWidth = 3; c.beginPath(); for (let i = 0; i <= 12; i++) { const xx = -60 + i * (w + 120) / 12, yy = 82 + Math.sin(t * 3 + i) * 3; i ? c.lineTo(xx, yy) : c.moveTo(xx, yy); } c.stroke();
      if (moving) { c.strokeStyle = 'rgba(255,255,255,.8)'; for (let i = 0; i < 3; i++) { const yy = 96 + i * 10; c.beginPath(); c.moveTo(-20 - i * 18 - (t * 80 % 30), yy); c.lineTo(-60 - i * 18 - (t * 80 % 30), yy); c.stroke(); } }
      c.restore(); return;
    }
  }
  function drawBouncer(c, bo, t) {
    const sq = bo.sq, sy = 1 - sq * .35 + Math.sin(sq * 12) * sq * .15, sx = 1 + sq * .25;
    c.save(); c.scale(sx, sy);
    if (isle === 0) {
      /* a giant bouncy flower */
      c.strokeStyle = LINE; c.lineWidth = 2;
      for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI - Math.PI; c.save(); c.translate(Math.cos(a) * 22, -10 + Math.sin(a) * 8); c.rotate(a + Math.PI / 2); c.fillStyle = i % 2 ? '#FF7FB5' : '#FFC6DD'; c.beginPath(); c.ellipse(0, 0, 12, 20, 0, 0, TAU); c.fill(); c.stroke(); c.restore(); }
      c.fillStyle = '#FFE27A'; c.beginPath(); c.ellipse(0, -14, 26, 9, 0, 0, TAU); c.fill(); c.stroke();
      c.fillStyle = '#FFB347'; for (let i = -2; i <= 2; i++) { c.beginPath(); c.arc(i * 8, -15, 2, 0, TAU); c.fill(); }
    } else if (isle === 1) {
      /* a big clam with a springy pearl */
      c.fillStyle = '#C27BFF'; c.strokeStyle = LINE; c.lineWidth = 2;
      c.beginPath(); c.moveTo(-34, 0); c.quadraticCurveTo(0, 12, 34, 0); c.quadraticCurveTo(0, -6, -34, 0); c.fill(); c.stroke();
      c.save(); c.translate(0, -4); c.rotate(-.5 + sq * .4); c.fillStyle = '#D9A6FF'; c.beginPath(); c.moveTo(-34, 0); c.quadraticCurveTo(-30, -34, 0, -38); c.quadraticCurveTo(30, -34, 34, 0); c.closePath(); c.fill(); c.stroke();
      c.strokeStyle = 'rgba(80,40,120,.5)'; for (let i = -2; i <= 2; i++) { c.beginPath(); c.moveTo(0, -2); c.lineTo(i * 14, -32); c.stroke(); } c.restore();
      c.save(); c.shadowColor = '#FFFFFF'; c.shadowBlur = 12; c.fillStyle = '#FFF4FA'; c.beginPath(); c.arc(0, -10, 10, 0, TAU); c.fill(); c.restore();
    } else {
      /* a steam vent in the rock */
      c.fillStyle = '#3A2A30'; c.strokeStyle = LINE; c.lineWidth = 2; c.beginPath(); c.ellipse(0, -4, 32, 12, 0, 0, TAU); c.fill(); c.stroke();
      c.fillStyle = '#FF8A3D'; c.save(); c.shadowColor = '#FF8A3D'; c.shadowBlur = 14; c.beginPath(); c.ellipse(0, -6, 18, 5, 0, 0, TAU); c.fill(); c.restore();
      for (let i = 0; i < 5; i++) { const k = (t * .9 + i / 5) % 1, r = 8 + k * 20; c.fillStyle = `rgba(255,255,255,${(1 - k) * (.35 + sq * .4)})`; c.beginPath(); c.arc(Math.sin(i * 2 + t) * 6, -14 - k * 90 * (1 + sq), r, 0, TAU); c.fill(); }
    }
    c.restore();
  }
  function drawPower(c, pw, t) {
    if (pw.kind === 'vine') {
      const k = pw.solved ? clamp(pw.k / .9, 0, 1) : 0, H2 = pw.y - pw.top;
      if (!pw.solved) { /* a sleepy sprout at the foot of the cliff */ c.fillStyle = '#4FBF6A'; c.strokeStyle = LINE; c.lineWidth = 2; c.beginPath(); c.ellipse(-14, -12, 8, 14, -.5, 0, TAU); c.fill(); c.stroke(); c.beginPath(); c.ellipse(-4, -10, 7, 12, .5, 0, TAU); c.fill(); c.stroke(); return; }
      c.save(); c.strokeStyle = '#2F8A4A'; c.lineWidth = 7; c.lineCap = 'round'; c.beginPath();
      const n = 24; for (let i = 0; i <= n * k; i++) { const yy = -i / n * H2, xx = -10 + Math.sin(i * .7 + t * 1.5) * 6; i ? c.lineTo(xx, yy) : c.moveTo(xx, yy); } c.stroke();
      c.strokeStyle = '#4FBF6A'; c.lineWidth = 3; c.stroke(); c.restore();
      return;
    }
    if (pw.kind === 'bramble') {
      const k = pw.solved ? clamp(pw.k / 1.1, 0, 1) : 0; if (k >= 1) return;
      c.save(); c.globalAlpha = 1 - k;
      /* a dark tangle behind the vines, so it reads as a wall */
      c.save(); c.shadowColor = '#B04CFF'; c.shadowBlur = 18; c.fillStyle = 'rgba(42,16,32,.92)'; c.beginPath(); c.moveTo(-48, 0);
      for (let i = 0; i <= 10; i++) { const a = i / 10 * Math.PI; c.lineTo(-Math.cos(a) * 50 + Math.sin(i * 2.3) * 8, -Math.sin(a) * 230 - (i % 2) * 12); }
      c.lineTo(48, 0); c.closePath(); c.fill(); c.restore();
      c.strokeStyle = '#5A2A3E'; c.lineCap = 'round';
      for (let i = 0; i < 9; i++) { c.lineWidth = 11 - (i % 3) * 2; c.beginPath(); const x0 = -34 + (i % 5) * 14; c.moveTo(x0, 0); c.bezierCurveTo(x0 + 26, -60 - i * 6, x0 - 30, -120, x0 + 10 * Math.sin(i), -200 - (i % 3) * 20); c.stroke(); }
      c.fillStyle = '#E04A6A'; for (let i = 0; i < 30; i++) { const xx = -34 + (i * 37 % 70), yy = -10 - (i * 53 % 200); c.beginPath(); c.moveTo(xx, yy); c.lineTo(xx + 8, yy - 3); c.lineTo(xx + 2, yy + 5); c.closePath(); c.fill(); }
      c.restore();
      if (pw.solved) { c.save(); c.globalAlpha = Math.min(1, (1 - k) * 2); for (let i = 0; i < 6; i++) K.flameShape(c, -30 + i * 12, -10 - (i * 37 % 160) * (.4 + k * .6), .8 + (i % 3) * .25, t + i, ['#FF6A2A', '#FFB347', '#FFF1C2']); c.restore(); }
      return;
    }
    if (pw.kind === 'bubble' && !pw.solved) { for (let i = 0; i < 3; i++) { const yy = -40 - ((t * 30 + i * 25) % 70); c.globalAlpha = .6; bubble(c, 20 + i * 14, yy, 5, t, i); c.globalAlpha = 1; } }
  }
  function drawWave(c, w, t) {
    const a = w.a * Math.max(0, 1 - w.fade * 1.2); if (a <= 0) return;
    c.save(); c.globalAlpha = a;
    const gr = c.createLinearGradient(-500, 0, 0, 0); gr.addColorStop(0, 'rgba(20,6,40,.95)'); gr.addColorStop(1, 'rgba(80,20,140,.9)');
    c.fillStyle = gr; c.beginPath(); c.moveTo(-1400, -900); c.lineTo(0, -900);
    for (let i = 0; i <= 30; i++) { const yy = -900 + i * 50, xx = Math.sin(i * .8 + t * 4) * 18 + Math.sin(i * .3 - t * 2) * 12; c.lineTo(xx, yy); }
    c.lineTo(-1400, 600); c.closePath(); c.fill();
    c.strokeStyle = '#D07CFF'; c.lineWidth = 4; c.shadowColor = '#B04CFF'; c.shadowBlur = 20; c.stroke(); c.shadowBlur = 0;
    for (let i = 0; i < 6; i++) { const yy = -380 + i * 70 + Math.sin(t * 2 + i) * 10, xx = -40 - (i % 2) * 30; c.fillStyle = '#FF6FD8'; c.beginPath(); c.ellipse(xx - 8, yy, 5, 7, 0, 0, TAU); c.ellipse(xx + 8, yy, 5, 7, 0, 0, TAU); c.fill(); }
    c.restore();
  }
  function drawLava(c, LV, t) {
    const w = LV.x1 - LV.x0 + 60;
    c.save();
    c.shadowColor = '#FF6A2A'; c.shadowBlur = 30;
    const gr = c.createLinearGradient(0, 0, 0, 260); gr.addColorStop(0, '#FFE27A'); gr.addColorStop(.12, '#FF8A3D'); gr.addColorStop(1, '#B4201A');
    c.fillStyle = gr; c.beginPath(); c.moveTo(0, 900);
    for (let i = 0; i <= 20; i++) { const xx = i * w / 20, yy = Math.sin(i * .9 + t * 3) * 6; c.lineTo(xx, yy); }
    c.lineTo(w, 900); c.closePath(); c.fill(); c.shadowBlur = 0;
    for (let i = 0; i < 8; i++) { const k = (t * .7 + i / 8) % 1; c.fillStyle = `rgba(255,240,170,${1 - k})`; c.beginPath(); c.arc((i * 97) % w, -k * 26, 3 + k * 5, 0, TAU); c.fill(); }
    c.restore();
  }
  function draw(c, t, pj, k, near) {
    const at = (x, y, fn) => { const [sx, sy] = pj(x, y); c.save(); c.translate(sx, sy); if (k !== 1) c.scale(k, k); fn(); c.restore(); };
    const LV = W.lava;
    if (LV && (LV.on || LV.y < LV.y0 - 1) && near((LV.x0 + LV.x1) / 2, 600)) at(LV.x0 - 30, LV.y, () => drawLava(c, LV, t));
    for (const pw of W.powers) if (near(pw.x, 300)) at(pw.x, pw.y, () => drawPower(c, pw, t));
    for (const bl of W.blocks) if (bl.dyn && !bl.hidden && near(bl.x + bl.w / 2, bl.w + 100)) at(bl.x, bl.top, () => drawBlock(c, bl, t));
    for (const bo of W.bouncers) if (near(bo.x, 100)) at(bo.x, bo.y, () => drawBouncer(c, bo, t));
    for (const w of W.wisps) {
      if (!near(w.x, 100)) continue;
      if (w.dead) { if (w.dt < .45) at(w.x, w.y - 40, () => { c.save(); c.globalAlpha = 1 - w.dt / .45; c.strokeStyle = S.EL[F.el].col; c.lineWidth = 4; c.beginPath(); c.arc(0, 0, 14 + w.dt * 80, 0, TAU); c.stroke(); c.restore(); }); continue; }
      at(w.x, w.y, () => { c.fillStyle = 'rgba(0,0,0,.25)'; c.beginPath(); c.ellipse(0, 0, 20, 5, 0, 0, TAU); c.fill(); K.foe(c, F, 0, -44 + Math.sin(t * 4 + w.ph) * 4, .24, t + w.ph * 3, {face:w.face, seed:Math.round(w.x0)}); });
    }
    for (const tb of W.rides) {
      const R = tb.ride; if (R.state !== 'stop') continue; const set = R.sets[R.i]; if (!set.opts) continue;
      set.opts.forEach((v, j) => { if (set.pop[j]) return; const [bx, by] = bubblePos(tb, j); at(bx, by, () => { bubble(c, 0, 0, 30, t, j); outlined(c, String(v), 0, 2, String(v).length > 2 ? 18 : 24); }); });
    }
    const C = W.chase; if (C && C.wave) at(C.wave.x, H.y, () => drawWave(c, C.wave, t));
    /* little hints for younger players */
    if (assist >= 1 || age <= 6) for (const bo of W.bouncers) if (Math.abs(bo.x - H.x) < 260 && H.x < bo.x + 40) at(bo.x, bo.y - 70, () => { c.globalAlpha = .7 + .3 * Math.sin(t * 6); outlined(c, 'BOUNCE!', 0, 0, 16, '#FFE27A'); });
    for (const f of fx) at(f.x, f.y - f.t * 50, () => { c.globalAlpha = Math.min(1, (1.1 - f.t) * 2); outlined(c, f.text, 0, 0, 20, f.col); });
  }
  /* screen-edge warnings, so kids can see the wave or the lava coming */
  function hud(c, Wd, Hd, t) {
    const C = W.chase, LV = W.lava;
    if (C && C.wave && !C.done) {
      const k = clamp(1 - (H.x - C.wave.x - 28) / 420, 0, 1);
      if (k > 0) {
        const gr = c.createLinearGradient(0, 0, Wd * .3, 0); gr.addColorStop(0, `rgba(150,60,255,${.25 + .5 * k})`); gr.addColorStop(1, 'rgba(150,60,255,0)');
        c.fillStyle = gr; c.fillRect(0, 0, Wd * .3, Hd);
        c.save(); c.globalAlpha = .6 + .4 * Math.sin(t * (6 + k * 8)); outlined(c, 'WAVE!', 44, Hd * .46, 18, '#E9B8FF'); c.restore();
      }
    }
    if (LV && LV.on && !LV.done) {
      const k = clamp(1 - (LV.y - H.y - 6) / 320, 0, 1);
      if (k > 0) {
        const gr = c.createLinearGradient(0, Hd, 0, Hd * .62); gr.addColorStop(0, `rgba(255,110,40,${.3 + .5 * k})`); gr.addColorStop(1, 'rgba(255,110,40,0)');
        c.fillStyle = gr; c.fillRect(0, Hd * .62, Wd, Hd * .38);
        c.save(); c.globalAlpha = .6 + .4 * Math.sin(t * (6 + k * 8)); outlined(c, 'LAVA!', Wd / 2, Hd * .66, 18, '#FFE27A'); c.restore();
      }
    }
  }
  return {pre, barrier, land, post, solved, respawn, onFall, draw, hud};
};
})();
