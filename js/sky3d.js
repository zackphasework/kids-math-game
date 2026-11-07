/* Sky Quest in 3D: the island stages as a real 3D floating island at twilight (three.js, loaded in the
   background), with the heroes, spirits, shadows and props kept as the anime drawings on billboards that
   always face the camera. Gameplay stays in the game's own 2D world units; this only draws it.
   1 world unit = 100 game units; game y points down, so 3D y = -y / 100. */
(function () {
'use strict';
const K = PUM.SKYART, S3 = PUM.SKY3D = {};
const U = .01, TAU = Math.PI * 2;
let loading = null;
/* Load three.js once, in the background. The game uses 2D until it's ready. */
S3.ensure = () => {
  if (window.THREE || loading) return;
  loading = document.createElement('script');
  loading.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
  loading.async = true; loading.onerror = () => { loading = null; };
  document.head.appendChild(loading);
};
S3.ready = () => {
  if (!window.THREE) return false;
  if (S3._ok != null) return S3._ok;
  try { const c = document.createElement('canvas'); S3._ok = !!(c.getContext('webgl') || c.getContext('experimental-webgl')); } catch (e) { S3._ok = false; }
  return S3._ok;
};

/* o: {world, hero, g, look, comp, double, tower} */
S3.create = function (o) {
  const T3 = window.THREE, W = o.world, hero = o.hero, g = o.g, L = o.look, comp = o.comp;
  const canvas = document.createElement('canvas');
  canvas.className = 'sky3d';
  canvas.style.cssText = 'position:absolute; inset:0; width:100%; height:100%; display:block; pointer-events:none';
  const renderer = new T3.WebGLRenderer({canvas, antialias:true, powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(1.5, window.devicePixelRatio || 1));
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = T3.PCFSoftShadowMap; renderer.outputEncoding = T3.sRGBEncoding;
  const scene = new T3.Scene(), disposables = [];
  const keep = x => { disposables.push(x); return x; };
  /* sky and light */
  const skyC = document.createElement('canvas'); skyC.width = 4; skyC.height = 512;
  { const c = skyC.getContext('2d'), gr = c.createLinearGradient(0, 0, 0, 512); gr.addColorStop(0, '#0D1446'); gr.addColorStop(.45, '#3B2A86'); gr.addColorStop(.78, '#C26BB0'); gr.addColorStop(1, '#FFB7A0'); c.fillStyle = gr; c.fillRect(0, 0, 4, 512); }
  const skyT = keep(new T3.CanvasTexture(skyC)); skyT.encoding = T3.sRGBEncoding; scene.background = skyT;
  scene.fog = new T3.Fog(0x8E5AA8, 14, 46);
  const camera = new T3.PerspectiveCamera(45, 1, .1, 200);
  scene.add(new T3.HemisphereLight(0xC9B8FF, 0x4A3A6E, .82));
  const moon = new T3.DirectionalLight(0xFFE0F0, .85); moon.castShadow = true; moon.shadow.mapSize.set(1024, 1024);
  Object.assign(moon.shadow.camera, {left:-9, right:9, top:9, bottom:-9, near:1, far:40}); scene.add(moon); scene.add(moon.target);
  const gm = keep(new T3.DataTexture(new Uint8Array([80, 170, 255]), 3, 1, T3.LuminanceFormat)); gm.minFilter = gm.magFilter = T3.NearestFilter; gm.generateMipmaps = false; gm.needsUpdate = true;
  const col = c => new T3.Color(c).convertSRGBToLinear();
  const mats = {};
  const toon = c => mats[c] || (mats[c] = keep(new T3.MeshToonMaterial({color:col(c), gradientMap:gm})));
  const lineMat = keep(new T3.MeshBasicMaterial({color:col('#22374B'), side:T3.BackSide}));
  function part(geo, c, parent, pos, opt = {}) {
    keep(geo);
    const m = new T3.Mesh(geo, opt.mat || toon(c)); m.castShadow = opt.cast !== false; m.receiveShadow = true;
    if (pos) m.position.set(pos[0], pos[1], pos[2]); if (opt.rot) m.rotation.set(opt.rot[0], opt.rot[1], opt.rot[2]);
    if (opt.line !== false) { const l = new T3.Mesh(geo, lineMat); l.scale.setScalar(1 + (opt.lw || .04) / Math.max(.25, opt.size || 1)); m.add(l); }
    parent.add(m); return m;
  }
  const glowTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const g2 = c.getContext('2d'), r = g2.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(.3, 'rgba(160,245,255,.6)'); r.addColorStop(1, 'rgba(160,245,255,0)'); g2.fillStyle = r; g2.fillRect(0, 0, 64, 64); return keep(new T3.CanvasTexture(c)); })();
  const glow = (parent, pos, sz, color = 0x9BF6FF) => { const sp = new T3.Sprite(keep(new T3.SpriteMaterial({map:glowTex, color, transparent:true, depthWrite:false, blending:T3.AdditiveBlending}))); sp.position.set(pos[0], pos[1], pos[2]); sp.scale.set(sz, sz, 1); parent.add(sp); return sp; };
  const R = (() => { let s2 = 4242; return () => (s2 = (s2 * 16807) % 2147483647) / 2147483647; })();

  /* ---------- the island: ground blocks, platforms and the cliff below ---------- */
  const world = new T3.Group(); scene.add(world);
  const DEPTH = 3.2, Z0 = -.35;
  /* cliff faces: purple rock fading dark, with a few glowing crystal veins */
  const earthTex = (() => { const c = document.createElement('canvas'); c.width = 128; c.height = 256; const g2 = c.getContext('2d'), gr = g2.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, '#5A4690'); gr.addColorStop(.25, '#3E2F6E'); gr.addColorStop(1, '#161232'); g2.fillStyle = gr; g2.fillRect(0, 0, 128, 256);
    g2.strokeStyle = 'rgba(20,14,40,.35)'; g2.lineWidth = 2; for (let i = 0; i < 9; i++) { g2.beginPath(); g2.moveTo(R() * 128, 20 + R() * 220); g2.lineTo(R() * 128, 20 + R() * 220); g2.stroke(); }
    g2.fillStyle = 'rgba(155,246,255,.85)'; for (let i = 0; i < 6; i++) { const x = R() * 120 + 4, y = 40 + R() * 180; g2.beginPath(); g2.moveTo(x, y - 7); g2.lineTo(x + 3, y); g2.lineTo(x, y + 3); g2.lineTo(x - 3, y); g2.closePath(); g2.fill(); }
    const t2 = keep(new T3.CanvasTexture(c)); t2.encoding = T3.sRGBEncoding; t2.wrapS = t2.wrapT = T3.RepeatWrapping; return t2; })();
  const earthMats = {};
  const earthMat = (w, h) => { const key = Math.round(w * 2) + '|' + Math.round(h); if (earthMats[key]) return earthMats[key]; const t2 = earthTex.clone(); t2.needsUpdate = true; t2.repeat.set(Math.max(1, Math.round(w / 1.6)), 1); keep(t2); return (earthMats[key] = keep(new T3.MeshToonMaterial({map:t2, gradientMap:gm}))); };
  for (const bl of W.blocks) {
    const x0 = bl.x * U, w = bl.w * U, top = -bl.top * U, cx = x0 + w / 2;
    if (bl.ground) {
      const h = top + 5;
      const gb = part(new T3.BoxGeometry(w, h, DEPTH), '#3E2F6E', world, [cx, top - h / 2, Z0], {size:Math.min(w, 2)}); gb.material = earthMat(w, h);
      part(new T3.BoxGeometry(w + .04, .14, DEPTH + .08), '#4FBF9A', world, [cx, top - .05, Z0], {size:.4, line:false});
      for (let k = 0; k < w * 3; k++) { const p = part(new T3.OctahedronGeometry(.05, 0), '#9BF6FF', world, [x0 + R() * w, top - .5 - R() * 3, Z0 + DEPTH / 2 + .01], {line:false, cast:false, mat:toon('#9BF6FF')}); p.scale.y = 1.8; }
    } else {
      const m = part(new T3.BoxGeometry(w, .26, 1.6), '#6B4A6E', world, [cx, top - .13, 0], {size:.4});
      part(new T3.BoxGeometry(w + .06, .1, 1.66), '#58C9A2', world, [cx, top - .02, 0], {size:.3, line:false});
      if (bl.secret && !o.double) { m.material = keep(new T3.MeshToonMaterial({color:col('#6B4A6E'), gradientMap:gm, transparent:true, opacity:o.tower ? .85 : .45})); if (o.tower) glow(world, [cx, top + .1, .9], w * 1.2, 0xFFE27A); }
    }
  }
  /* the cliff under the whole stage, so it floats */
  const len = W.len * U;
  part(new T3.CylinderGeometry(1, .2, 1, 6, 1), '#2B2660', world, [len / 2, -6.5, -1.5], {line:false, cast:false}).scale.set(len / 2 + 2, 4, 3);
  /* scenery: blossom trees, gates and lanterns behind the path; a few things in front for depth */
  function sakura(x, z, s) {
    const t0 = new T3.Group(); t0.position.set(x, 0, z); t0.scale.setScalar(s);
    part(new T3.CylinderGeometry(.16, .26, 1.8, 7), '#3B2340', t0, [0, .9, 0], {size:.25});
    [[0, 2.2, 0, 1.05], [-.7, 1.9, .3, .8], [.7, 2.0, -.3, .85], [.2, 2.6, .5, .7]].forEach(([px, py, pz, r], i) => part(new T3.IcosahedronGeometry(r, 1), i % 2 ? '#F6A9CC' : '#FFC6DD', t0, [px, py, pz], {size:r}));
    world.add(t0); return t0;
  }
  function torii(x, z, s) { const t0 = new T3.Group(); t0.isTorii = true; t0.position.set(x, 0, z); t0.scale.setScalar(s); for (const px of [-1.1, 1.1]) part(new T3.CylinderGeometry(.13, .15, 2.5, 8), '#C8384A', t0, [px, 1.25, 0], {size:.25}); part(new T3.BoxGeometry(3.2, .24, .3), '#C8384A', t0, [0, 2.55, 0], {size:.3}); part(new T3.BoxGeometry(2.6, .15, .22), '#C8384A', t0, [0, 2.05, 0], {size:.25}); world.add(t0); return t0; }
  const groundAt = x => { let best = null; for (const bl of W.blocks) if (bl.ground && x >= bl.x * U && x <= (bl.x + bl.w) * U) best = best == null ? -bl.top * U : Math.max(best, -bl.top * U); return best; };
  for (let x = .5; x < len; x += 1.3 + R() * 1.4) {
    const gyv = groundAt(x); const base = gyv == null ? -.4 : gyv;
    const z = -2.6 - R() * 5;
    const t0 = R() < .12 ? torii(x, z, .9) : sakura(x, z, .8 + R() * .5);
    t0.position.y = base - .1 - (z < -5 ? .6 : 0);
  }
  /* distant floating islands and stars */
  for (let x = -10; x < len + 20; x += 9 + R() * 6) { const g0 = new T3.Group(); g0.position.set(x, -1.5 + R() * 3.5, -38 - R() * 10); const r = 1.4 + R() * 1.6; part(new T3.CylinderGeometry(r, r * 1.05, .4, 16), '#4FBF9A', g0, [0, 0, 0], {line:false, cast:false}); part(new T3.ConeGeometry(r * 1.05, r * 1.6, 12), '#2A2460', g0, [0, -r * .8, 0], {rot:[Math.PI, 0, 0], line:false, cast:false}); scene.add(g0); }
  { const pts = []; for (let i = 0; i < 260; i++) pts.push(-20 + R() * (len + 60), 4 + R() * 30, -45 - R() * 10); const geo = keep(new T3.BufferGeometry()); geo.setAttribute('position', new T3.Float32BufferAttribute(pts, 3)); scene.add(new T3.Points(geo, keep(new T3.PointsMaterial({color:0xFFFFFF, size:.25, fog:false})))); }
  const moonS = new T3.Sprite(keep(new T3.SpriteMaterial({map:glowTex, color:0xFFF4FA, transparent:true, depthWrite:false, fog:false}))); moonS.scale.set(9, 9, 1); scene.add(moonS);
  /* falling petals around the camera */
  const petalTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 32; const g2 = c.getContext('2d'); g2.fillStyle = '#FFC6DD'; g2.beginPath(); g2.ellipse(16, 16, 12, 7, .5, 0, TAU); g2.fill(); return keep(new T3.CanvasTexture(c)); })();
  const NP = 120, pPos = new Float32Array(NP * 3), pSp = []; for (let i = 0; i < NP; i++) { pPos[i * 3] = R() * 16 - 8; pPos[i * 3 + 1] = R() * 9 - 2; pPos[i * 3 + 2] = R() * 8 - 4; pSp.push(.5 + R()); }
  const pGeo = keep(new T3.BufferGeometry()); pGeo.setAttribute('position', new T3.BufferAttribute(pPos, 3));
  const petals = new T3.Points(pGeo, keep(new T3.PointsMaterial({map:petalTex, size:.18, transparent:true, depthWrite:false}))); scene.add(petals);
  /* crystals */
  const crystals = W.crystals.map(c0 => { const m = part(new T3.OctahedronGeometry(c0.big ? .16 : .11, 0), '#9BF6FF', world, [c0.x * U, -c0.y * U, 0], {size:.15, mat:toon('#BFF6FF')}); m.scale.y = 1.6; const gl = glow(world, [c0.x * U, -c0.y * U, 0], c0.big ? .9 : .6); return {c0, m, gl}; });

  /* ---------- billboards: the anime drawings, facing the camera ---------- */
  function bill(cw, ch, ww, wh, cy) {
    const cv = document.createElement('canvas'); cv.width = cw; cv.height = ch;
    const tex = keep(new T3.CanvasTexture(cv)); tex.encoding = T3.sRGBEncoding;
    const sp = new T3.Sprite(keep(new T3.SpriteMaterial({map:tex, transparent:true}))); sp.center.set(.5, cy); sp.scale.set(ww, wh, 1); scene.add(sp);
    return {sp, cv, c:cv.getContext('2d'), tex, n:0};
  }
  const blobGeo = keep(new T3.CircleGeometry(.3, 20)), blobMat = keep(new T3.MeshBasicMaterial({color:0x000000, transparent:true, opacity:.28, depthWrite:false}));
  const blob = () => { const m = new T3.Mesh(blobGeo, blobMat); m.rotation.x = -Math.PI / 2; scene.add(m); return m; };
  const heroB = bill(256, 256, 1.07, 1.07, 10 / 256), heroShadow = blob();
  const compB = bill(256, 256, 1.08, 1.08, .5);
  const foes = W.foes.map(f => { const F = PUM.SKY.FOES[f.kind]; const big = F && F.big, k = big ? .55 : .42; const b = bill(320, 320, 320 / .62 * k * U, 320 / .62 * k * U, .47); b.sp.position.set(f.x * U, -(f.y - 80) * U, 0); return {f, b, el:F ? F.el : 'blossom', big, sh:blob()}; });
  const chests = W.chests.map(ch => { const b = bill(128, 128, .64, .64, 8 / 128); b.sp.position.set(ch.x * U, -ch.y * U, 0); return {ch, b, last:null}; });
  const gates = W.gates.map(gt => { const b = bill(256, 256, 1.6, 1.6, 6 / 256); b.sp.position.set(gt.x * U, -gt.y * U, -.05); return {gt, b}; });
  const lanterns = W.lanterns.map(l => { const b = bill(128, 256, .64, 1.28, 6 / 256); b.sp.position.set(l.x * U, -l.y * U, -.1); const gl = glow(world, [l.x * U, -l.y * U + .86, 0], 1.6, 0xFFC56A); gl.visible = false; return {l, b, gl}; });
  const goal = W.goal ? (() => { const b = bill(512, 512, 3.2, 3.2, 12 / 512); b.sp.position.set(W.goal.x * U, -W.goal.y * U, -.2); return {gl:W.goal, b}; })() : null;
  const draw = (b, fn) => { b.c.clearRect(0, 0, b.cv.width, b.cv.height); fn(b.c); b.tex.needsUpdate = true; };

  /* ---------- camera and render ---------- */
  let Wpx = 360, Hpx = 640, camX = hero.x * U, camY = -hero.y * U, frame = 0;
  const v = new T3.Vector3();
  function resize(w, h) { Wpx = w; Hpx = h; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
  function camDist() { return Math.max(5.5, Math.min(9.5, 3.7 / (2 * Math.tan(22.5 * Math.PI / 180) * camera.aspect))); }
  const near = x => Math.abs(x * U - camX) < 9;
  function render(t, dt) {
    frame++;
    const hx = hero.x * U, hy = -hero.y * U;
    camX += (hx + .9 - camX) * Math.min(1, dt * 5); camY += (Math.max(hy, -1) - camY) * Math.min(1, dt * 3);
    const d = camDist();
    camera.position.set(camX, camY + d * .3 + .7, d); camera.lookAt(camX, camY + .95, 0);
    moon.position.set(camX - 6, camY + 12, 8); moon.target.position.set(camX, camY, 0);
    moonS.position.set(camX - 14, camY + 14, -40);
    /* hero, spirit, shadows on the ground */
    const blink = hero.inv > 0 && Math.floor(t * 16) % 2;
    heroB.sp.visible = !blink;
    draw(heroB, c => K.sprite(c, L, 128, 246, 2.2, {face:hero.face, run:hero.run, speed:Math.min(1, Math.abs(hero.vx) / 250), air:hero.ground ? null : Math.sign(hero.vy), t}));
    heroB.sp.position.set(hx, hy, .02);
    const gh = groundAt(hx); heroShadow.visible = gh != null && gh <= hy + .01; if (gh != null) { heroShadow.position.set(hx, gh + .02, .05); heroShadow.scale.setScalar(Math.max(.4, 1 - (hy - gh) * .4)); }
    draw(compB, c => K.spirit(c, comp.kind, comp.stage, 128, 128, 1, t, {face:hero.face}));
    compB.sp.position.set(g.comp.x * U, -g.comp.y * U, .3);
    for (const fo of foes) {
      fo.b.sp.visible = !fo.f.done; fo.sh.visible = !fo.f.done;
      if (fo.f.done || !near(fo.f.x)) continue;
      if (frame % 2 === 0) draw(fo.b, c => K.shadow(c, fo.el, 160, 170, .62, t + fo.f.x, {face:-1, big:fo.big, seed:Math.round(fo.f.x)}));
      fo.sh.position.set(fo.f.x * U, -fo.f.y * U + .02, .05); fo.sh.scale.setScalar(fo.big ? 1.6 : 1.3);
    }
    for (const c0 of chests) { if (!near(c0.ch.x)) continue; if (c0.last !== c0.ch.open || (!c0.ch.open && frame % 3 === 0)) { c0.last = c0.ch.open; draw(c0.b, c => K.chest(c, 64, 120, 2, c0.ch.open, t)); } }
    for (const g0 of gates) { if (!near(g0.gt.x)) continue; g0.gt.open = g0.gt.solved ? Math.min(1, g0.gt.open + .03) : 0; if (frame % 2 === 0 || g0.gt.solved) draw(g0.b, c => K.gate(c, 128, 250, 1.6, t, g0.gt.open, '')); }
    for (const l0 of lanterns) { l0.gl.visible = l0.l.lit; if (!near(l0.l.x)) continue; if (l0.last !== l0.l.lit || frame % 4 === 0) { l0.last = l0.l.lit; draw(l0.b, c => K.lantern(c, 64, 250, 2, l0.l.lit, t)); } }
    if (goal && near(goal.gl.x)) {
      const gl = goal.gl, done = g.mode === 'end';
      draw(goal.b, c => {
        c.save(); c.translate(256, 500); c.scale(1.6, 1.6);
        if (gl.kind === 'cage') K.cage(c, 0, 0, 1, t, done);
        else if (gl.kind === 'lanterns') { K.lantern(c, -60, 0, 1.2, done || g.lit >= W.lanterns.length, t); K.lantern(c, 60, 0, 1.2, done || g.lit >= W.lanterns.length, t); K.gate(c, 0, 0, 1.1, t, 1, ''); }
        else if (gl.kind === 'bell') K.bell(c, 0, 0, 1, t, done);
        else if (gl.kind === 'falls') K.falls(c, 40, 0, .9, t, done ? Math.min(1, g.endT / 1.5) : 0);
        else if (gl.kind === 'grove') K.gate(c, 0, 0, 1.3, t, 1, '');
        c.restore();
      });
    }
    for (const c0 of crystals) { c0.m.visible = c0.gl.visible = !c0.c0.got; if (!c0.c0.got) { c0.m.rotation.y = t * 2 + c0.c0.x; c0.m.position.y = -c0.c0.y * U + Math.sin(t * 3 + c0.c0.x * .05) * .03; } }
    for (let i = 0; i < NP; i++) {
      pPos[i * 3 + 1] -= dt * .5 * pSp[i]; pPos[i * 3] -= dt * .3 * pSp[i];
      if (pPos[i * 3 + 1] < camY - 4) pPos[i * 3 + 1] = camY + 6;
      if (pPos[i * 3] < camX - 9) pPos[i * 3] += 18; else if (pPos[i * 3] > camX + 9) pPos[i * 3] -= 18;
    }
    pGeo.attributes.position.needsUpdate = true;
    canvas.style.filter = g.heal < .999 ? `saturate(${(.62 + .38 * g.heal).toFixed(3)})` : '';
    renderer.render(scene, camera);
  }
  /* world (game units) to screen pixels, for the 2D overlay */
  function project(x, y) { v.set(x * U, -y * U, 0).project(camera); return [(v.x + 1) / 2 * Wpx, (1 - v.y) / 2 * Hpx]; }
  /* pixels per game unit at the path */
  function ppu() { return Hpx / (2 * Math.tan(camera.fov * Math.PI / 360) * camDist()) * U; }
  function dispose() {
    for (const d0 of disposables) { try { d0.dispose(); } catch (e) {} }
    try { renderer.dispose(); renderer.forceContextLoss && renderer.forceContextLoss(); } catch (e) {}
    canvas.remove();
  }
  return {canvas, resize, render, project, ppu, dispose, groundAt:x => groundAt(x * U)};
};
})();
