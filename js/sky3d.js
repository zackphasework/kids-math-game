/* Sky Quest in 3D: the island stages as real 3D places (three.js, loaded in the background), with the heroes,
   spirits, shadows and props kept as the anime drawings on billboards that always face the camera. Gameplay
   stays in the game's own 2D world units; this only draws it. Each island has its own look:
   Blossom Isle (twilight sakura island), Tide Grotto (sea cave with water and glowing jellyfish),
   Ember Peak (dark volcano rock over a lava river, embers rising).
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
  loading.src = 'js/vendor/three.min.js';  /* three.js r128 (MIT), stored with the game */
  loading.async = true; loading.onerror = () => { loading = null; };
  document.head.appendChild(loading);
};
S3.ready = () => {
  if (!window.THREE) return false;
  if (S3._ok != null) return S3._ok;
  try { const c = document.createElement('canvas'); S3._ok = !!(c.getContext('webgl') || c.getContext('experimental-webgl')); } catch (e) { S3._ok = false; }
  return S3._ok;
};
/* per-island colours and scenery */
const THEMES = [
  {sky:['#0D1446', '#3B2A86', '#C26BB0', '#FFB7A0'], fog:[0x8E5AA8, 14, 46], hemi:[0xC9B8FF, 0x4A3A6E, .82], sun:[0xFFE0F0, .85], earth:['#5A4690', '#3E2F6E', '#161232'], vein:'rgba(155,246,255,.85)',
    top:'#4FBF9A', plat:'#6B4A6E', platTop:'#58C9A2', under:'#2B2660', farTop:'#4FBF9A', farRock:'#2A2460', bit:'#9BF6FF', moon:[0xFFF4FA, 9, -14, 14], parts:'petal', lit:0xFFC56A},
  {sky:['#03101F', '#0B3050', '#145E70', '#3FB8B0'], fog:[0x0E4A5E, 10, 40], hemi:[0x9FE8FF, 0x0A2A40, .88], sun:[0xBFF6FF, .7], earth:['#3E7090', '#1E4A6E', '#08182C'], vein:'rgba(127,240,255,.9)',
    top:'#2FBFA8', plat:'#2E5E80', platTop:'#3FD8C0', under:'#13304E', farTop:'#2FBFA8', farRock:'#13304E', bit:'#7FF0FF', moon:[0x9FFFF0, 16, -4, 18], parts:'bubble', lit:0xFF8FD8},
  {sky:['#12061A', '#3A0E2A', '#7A2230', '#E8673A'], fog:[0x5A1A24, 12, 44], hemi:[0xFFB08A, 0x2A0A14, .8], sun:[0xFFB070, .9], earth:['#4A2A34', '#2E1620', '#100608'], vein:'rgba(255,140,60,.95)',
    top:'#5E4E56', plat:'#3A2A30', platTop:'#7A6A70', under:'#2A1420', farTop:'#5E4E56', farRock:'#2A1420', bit:'#FF8A3D', moon:[0xFF7A3A, 22, 8, 2], parts:'ember', lit:0xFF8A3D},
];

/* o: {world, hero, g, look, comp, double, tower, isle, known} */
S3.create = function (o) {
  const T3 = window.THREE, W = o.world, hero = o.hero, g = o.g, L = o.look, comp = o.comp, isle = o.isle || 0, TH = THEMES[isle] || THEMES[0];
  const known = o.known || (need => need === 'double' ? !!o.double : false);
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
  { const c = skyC.getContext('2d'), gr = c.createLinearGradient(0, 0, 0, 512); TH.sky.forEach((col, i) => gr.addColorStop([0, .45, .78, 1][i], col)); c.fillStyle = gr; c.fillRect(0, 0, 4, 512); }
  const skyT = keep(new T3.CanvasTexture(skyC)); skyT.encoding = T3.sRGBEncoding; scene.background = skyT;
  scene.fog = new T3.Fog(TH.fog[0], TH.fog[1], TH.fog[2]);
  const camera = new T3.PerspectiveCamera(45, 1, .1, 200);
  scene.add(new T3.HemisphereLight(TH.hemi[0], TH.hemi[1], TH.hemi[2]));
  const moon = new T3.DirectionalLight(TH.sun[0], TH.sun[1]); moon.castShadow = true; moon.shadow.mapSize.set(1024, 1024);
  Object.assign(moon.shadow.camera, {left:-9, right:9, top:9, bottom:-9, near:1, far:40}); scene.add(moon); scene.add(moon.target);
  const gm = keep(new T3.DataTexture(new Uint8Array([80, 170, 255]), 3, 1, T3.LuminanceFormat)); gm.minFilter = gm.magFilter = T3.NearestFilter; gm.generateMipmaps = false; gm.needsUpdate = true;
  const col = c => new T3.Color(c).convertSRGBToLinear();
  const mats = {};
  const toon = c => mats[c] || (mats[c] = keep(new T3.MeshToonMaterial({color:col(c), gradientMap:gm})));
  const basics = {};
  const basic = (c, extra) => { const key = c + JSON.stringify(extra || {}); return basics[key] || (basics[key] = keep(new T3.MeshBasicMaterial(Object.assign({color:col(c)}, extra || {})))); };
  const lineMat = keep(new T3.MeshBasicMaterial({color:col('#22374B'), side:T3.BackSide}));
  function part(geo, c, parent, pos, opt = {}) {
    keep(geo);
    const m = new T3.Mesh(geo, opt.mat || toon(c)); m.castShadow = opt.cast !== false; m.receiveShadow = true;
    if (pos) m.position.set(pos[0], pos[1], pos[2]); if (opt.rot) m.rotation.set(opt.rot[0], opt.rot[1], opt.rot[2]);
    if (opt.line !== false) { const l = new T3.Mesh(geo, lineMat); l.scale.setScalar(1 + (opt.lw || .04) / Math.max(.25, opt.size || 1)); m.add(l); }
    parent.add(m); return m;
  }
  /* shared geometry for repeated scenery (keeps memory and setup time down on phones) */
  const geos = {};
  const G = (key, mk) => geos[key] || (geos[key] = keep(mk()));
  const canvasTex = (w, h, fn, rep) => { const c = document.createElement('canvas'); c.width = w; c.height = h; fn(c.getContext('2d'), w, h); const t2 = keep(new T3.CanvasTexture(c)); t2.encoding = T3.sRGBEncoding; if (rep) { t2.wrapS = t2.wrapT = T3.RepeatWrapping; t2.repeat.set(rep[0], rep[1]); } return t2; };
  const glowTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const g2 = c.getContext('2d'), r = g2.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(.3, 'rgba(255,255,255,.6)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g2.fillStyle = r; g2.fillRect(0, 0, 64, 64); return keep(new T3.CanvasTexture(c)); })();
  const glowMats = {};
  const glow = (parent, pos, sz, color = 0x9BF6FF) => { const m = glowMats[color] || (glowMats[color] = keep(new T3.SpriteMaterial({map:glowTex, color, transparent:true, depthWrite:false, blending:T3.AdditiveBlending}))); const sp = new T3.Sprite(m); sp.position.set(pos[0], pos[1], pos[2]); sp.scale.set(sz, sz, 1); parent.add(sp); return sp; };
  const R = (() => { let s2 = 4242 + isle * 77; return () => (s2 = (s2 * 16807) % 2147483647) / 2147483647; })();

  /* ---------- the stage: ground blocks, platforms ---------- */
  const world = new T3.Group(); scene.add(world);
  const DEPTH = 3.2, Z0 = -.35;
  const earthTex = canvasTex(128, 256, (g2, w, h) => {
    const gr = g2.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, TH.earth[0]); gr.addColorStop(.25, TH.earth[1]); gr.addColorStop(1, TH.earth[2]); g2.fillStyle = gr; g2.fillRect(0, 0, w, h);
    g2.strokeStyle = 'rgba(10,8,20,.35)'; g2.lineWidth = 2; for (let i = 0; i < 9; i++) { g2.beginPath(); g2.moveTo(R() * w, 20 + R() * 220); g2.lineTo(R() * w, 20 + R() * 220); g2.stroke(); }
    if (isle === 2) { g2.strokeStyle = TH.vein; g2.lineWidth = 2.5; for (let i = 0; i < 4; i++) { let x = R() * w, y = 30 + R() * 60; g2.beginPath(); g2.moveTo(x, y); for (let k = 0; k < 5; k++) { x += (R() - .5) * 30; y += 14 + R() * 20; g2.lineTo(x, y); } g2.stroke(); } }
    g2.fillStyle = TH.vein; for (let i = 0; i < 6; i++) { const x = R() * 120 + 4, y = 40 + R() * 180; g2.beginPath(); g2.moveTo(x, y - 7); g2.lineTo(x + 3, y); g2.lineTo(x, y + 3); g2.lineTo(x - 3, y); g2.closePath(); g2.fill(); }
  }, [1, 1]);
  const earthMats = {};
  const earthMat = (w) => { const key = Math.max(1, Math.round(w / 1.6)); if (earthMats[key]) return earthMats[key]; const t2 = keep(earthTex.clone()); t2.needsUpdate = true; t2.repeat.set(key, 1); const m = new T3.MeshToonMaterial({map:t2, gradientMap:gm}); if (isle === 2) { m.emissive = col('#FF5A1A'); m.emissiveMap = t2; m.emissiveIntensity = .18; } return (earthMats[key] = keep(m)); };
  const bitGeo = G('bit', () => new T3.OctahedronGeometry(.05, 0)), bits = [];
  for (const bl of W.blocks) {
    /* moving, falling and appearing platforms are drawn on the 2D layer by the stage kit */
    if (bl.dyn) continue;
    const x0 = bl.x * U, w = bl.w * U, top = -bl.top * U, cx = x0 + w / 2;
    if (bl.ground) {
      const h = top + 5;
      const gb = part(new T3.BoxGeometry(w, h, DEPTH), TH.earth[1], world, [cx, top - h / 2, Z0], {size:Math.min(w, 2)}); gb.material = earthMat(w);
      part(new T3.BoxGeometry(w + .04, .14, DEPTH + .08), TH.top, world, [cx, top - .05, Z0], {size:.4, line:false});
      for (let k = 0; k < w * 3; k++) bits.push([x0 + R() * w, top - .5 - R() * 3, Z0 + DEPTH / 2 + .01]);
    } else if (bl.step) {
      const m = new T3.Mesh(new T3.BoxGeometry(w, .22, 1.2), keep(new T3.MeshBasicMaterial({color:0x7FE0FF, transparent:true, opacity:.6}))); keep(m.geometry); m.position.set(cx, top - .11, 0); world.add(m); glow(world, [cx, top, .4], w * 1.4, 0x7FF0FF);
    } else {
      const m = part(new T3.BoxGeometry(w, .26, 1.6), TH.plat, world, [cx, top - .13, 0], {size:.4});
      part(new T3.BoxGeometry(w + .06, .1, 1.66), TH.platTop, world, [cx, top - .02, 0], {size:.3, line:false});
      if (bl.secret && !known(bl.need)) { m.material = keep(new T3.MeshToonMaterial({color:col(TH.plat), gradientMap:gm, transparent:true, opacity:o.tower ? .85 : .45})); if (o.tower) glow(world, [cx, top + .1, .9], w * 1.2, 0xFFE27A); }
      if (bl.secret && bl.need !== 'double') glow(world, [cx, top - .4, -.2], w * 1.6, isle === 2 ? 0xFF8A3D : 0x7FF0FF);
    }
  }
  /* the little crystals in the cliff faces: one instanced mesh, so they cost a single draw call */
  if (bits.length) {
    const im = new T3.InstancedMesh(bitGeo, isle === 2 ? basic(TH.bit) : toon(TH.bit), bits.length), mx = new T3.Matrix4();
    bits.forEach(([x, y, z], i) => { mx.makeScale(1, 1.8, 1); mx.setPosition(x, y, z); im.setMatrixAt(i, mx); });
    im.frustumCulled = false; world.add(im);
  }
  const len = W.len * U;
  const groundAt = x => { let best = null; for (const bl of W.blocks) if (bl.ground && x >= bl.x * U && x <= (bl.x + bl.w) * U) best = best == null ? -bl.top * U : Math.max(best, -bl.top * U); return best; };
  /* the cliff under the whole stage, so Blossom Isle floats. (The grotto and the peak stand in water or lava instead.) */
  if (isle === 0) part(new T3.CylinderGeometry(1, .2, 1, 6, 1), TH.under, world, [len / 2, -6.5, -1.5], {line:false, cast:false}).scale.set(len / 2 + 2, 4, 3);

  /* ---------- scenery behind the path ---------- */
  function sakura(x, z, s) {
    const t0 = new T3.Group(); t0.position.set(x, 0, z); t0.scale.setScalar(s);
    part(G('trunk', () => new T3.CylinderGeometry(.16, .26, 1.8, 7)), '#3B2340', t0, [0, .9, 0], {size:.25});
    [[0, 2.2, 0, 1.05], [-.7, 1.9, .3, .8], [.7, 2.0, -.3, .85], [.2, 2.6, .5, .7]].forEach(([px, py, pz, r], i) => part(G('bloom' + i, () => new T3.IcosahedronGeometry(r, 1)), i % 2 ? '#F6A9CC' : '#FFC6DD', t0, [px, py, pz], {size:r}));
    world.add(t0); return t0;
  }
  function torii(x, z, s, c = '#C8384A') { const t0 = new T3.Group(); t0.position.set(x, 0, z); t0.scale.setScalar(s); for (const px of [-1.1, 1.1]) part(G('toriiP', () => new T3.CylinderGeometry(.13, .15, 2.5, 8)), c, t0, [px, 1.25, 0], {size:.25}); part(G('toriiT', () => new T3.BoxGeometry(3.2, .24, .3)), c, t0, [0, 2.55, 0], {size:.3}); part(G('toriiB', () => new T3.BoxGeometry(2.6, .15, .22)), c, t0, [0, 2.05, 0], {size:.25}); world.add(t0); return t0; }
  const CORAL = ['#FF7FA8', '#FF9A5A', '#C27BFF', '#FFD27A'];
  function coral(x, z, s) {
    const t0 = new T3.Group(); t0.position.set(x, 0, z); t0.scale.setScalar(s); const c = CORAL[Math.floor(R() * CORAL.length)];
    for (let i = 0; i < 4; i++) { const a = (i - 1.5) * .42 + (R() - .5) * .2, h = .9 + R() * .8; const m = part(G('coralB', () => new T3.CylinderGeometry(.07, .12, 1, 6)), c, t0, [Math.sin(a) * h * .5, Math.cos(a) * h * .5, (R() - .5) * .3], {rot:[0, 0, -a], line:false}); m.scale.y = h; part(G('coralT', () => new T3.IcosahedronGeometry(.15, 0)), c, t0, [Math.sin(a) * h, Math.cos(a) * h, m.position.z], {line:false}); }
    part(G('rock', () => new T3.DodecahedronGeometry(.3, 0)), '#2E5E80', t0, [0, .02, 0], {size:.3});
    world.add(t0); return t0;
  }
  function kelp(x, z, s) { const t0 = new T3.Group(); t0.position.set(x, 0, z); t0.scale.setScalar(s); for (let i = 0; i < 3; i++) { const h = 2 + R() * 1.4; const m = part(G('kelp', () => new T3.ConeGeometry(.12, 1, 5)), i % 2 ? '#1F8A7A' : '#2AA08A', t0, [(i - 1) * .3, h / 2, (R() - .5) * .3], {rot:[0, 0, (R() - .5) * .25], line:false}); m.scale.y = h; } world.add(t0); t0.sway = R() * 6; kelps.push(t0); return t0; }
  function arch(x, z, s) { const t0 = new T3.Group(); t0.position.set(x, 0, z); t0.scale.setScalar(s); part(G('arch', () => new T3.TorusGeometry(1.5, .38, 6, 14, Math.PI)), '#2A5A7A', t0, [0, 0, 0], {size:.6}); world.add(t0); return t0; }
  function pine(x, z, s) { const t0 = new T3.Group(); t0.position.set(x, 0, z); t0.scale.setScalar(s); part(G('pineT', () => new T3.CylinderGeometry(.1, .14, .8, 6)), '#2A1418', t0, [0, .4, 0], {line:false}); [[0, 1.1, .9], [0, 1.8, .7], [0, 2.4, .5]].forEach(([px, py, r], i) => part(G('pine' + i, () => new T3.ConeGeometry(r, 1, 7)), '#1E2A22', t0, [px, py, 0], {size:r})); world.add(t0); return t0; }
  function pillar(x, z, s) { const t0 = new T3.Group(); t0.position.set(x, 0, z); t0.scale.setScalar(s); const h = 2.4 + R() * 1.6; const m = part(G('pillar', () => new T3.CylinderGeometry(.55, .85, 1, 6)), '#2A1420', t0, [0, h / 2, 0], {size:.6}); m.scale.y = h; if (R() < .6) { const tr = torii(0, 0, .42, '#D8452E'); world.remove(tr); tr.position.set(0, h, 0); t0.add(tr); } world.add(t0); return t0; }
  function boulder(x, z, s) { const t0 = new T3.Group(); t0.position.set(x, 0, z); t0.scale.setScalar(s); part(G('boulder', () => new T3.DodecahedronGeometry(.7, 0)), '#3A1E2A', t0, [0, .35, 0], {size:.7, rot:[R(), R(), R()]}); world.add(t0); return t0; }
  const kelps = [];
  for (let x = .5; x < len; x += 1.3 + R() * 1.4) {
    const gyv = groundAt(x); const base = gyv == null ? -.4 : gyv;
    const z = -2.6 - R() * 5, r = R();
    let t0;
    if (isle === 1) t0 = r < .12 ? arch(x, z - 1, .9 + R() * .4) : r < .45 ? kelp(x, z, .9 + R() * .4) : coral(x, z, .9 + R() * .5);
    else if (isle === 2) t0 = r < .2 ? pillar(x, z - 1, .9 + R() * .3) : r < .35 ? boulder(x, z, .8 + R() * .6) : pine(x, z, .9 + R() * .5);
    else t0 = r < .12 ? torii(x, z, .9) : sakura(x, z, .8 + R() * .5);
    t0.position.y = base - .1 - (z < -5 ? .6 : 0);
  }
  /* ---------- island-wide extras ---------- */
  const anim = [];
  if (isle === 1) {
    /* sea water under the path, gently moving */
    const wt = canvasTex(128, 128, (g2, w, h) => { g2.fillStyle = '#2A9AAA'; g2.fillRect(0, 0, w, h); g2.strokeStyle = 'rgba(200,255,250,.55)'; g2.lineWidth = 3; for (let i = 0; i < 10; i++) { const y = R() * h, x = R() * w; g2.beginPath(); g2.moveTo(x, y); g2.quadraticCurveTo(x + 14, y - 5, x + 28, y); g2.stroke(); } }, [Math.ceil(len / 3) + 10, 8]);
    const water = new T3.Mesh(keep(new T3.PlaneGeometry(len + 60, 30)), keep(new T3.MeshBasicMaterial({map:wt, color:0x9FEFF0, transparent:true, opacity:.86})));
    water.rotation.x = -Math.PI / 2; water.position.set(len / 2, -2.3, -6); scene.add(water);
    anim.push(t => { wt.offset.set(t * .015, t * .025); });
    /* the cave: a dark back wall with glowing specks, and stalactites overhead */
    const wallT = canvasTex(256, 128, (g2, w, h) => { g2.fillStyle = '#0A2238'; g2.fillRect(0, 0, w, h); for (let i = 0; i < 14; i++) { g2.fillStyle = i % 3 ? 'rgba(127,240,255,.6)' : 'rgba(255,143,216,.6)'; g2.beginPath(); g2.arc(R() * w, R() * h, 1 + R() * 1.6, 0, TAU); g2.fill(); } }, [Math.ceil((len + 80) / 10), 5]);
    const wall = new T3.Mesh(keep(new T3.PlaneGeometry(len + 80, 26)), keep(new T3.MeshBasicMaterial({map:wallT, fog:false}))); wall.position.set(len / 2, 6, -22); scene.add(wall);
    const stalGeo = G('stal', () => new T3.ConeGeometry(.35, 2.4, 6));
    const stals = [], dm = new T3.Object3D();
    for (let x = -4; x < len + 6; x += .9 + R() * 1.3) { const base = groundAt(x) || 0; dm.rotation.set(Math.PI, R() * 3, 0); dm.position.set(x, base + 4.6 + R() * 1.4, -2.5 - R() * 9); dm.scale.set(.7 + R() * .8, .7 + R() * .9, .7 + R() * .8); dm.updateMatrix(); stals.push(dm.matrix.clone()); }
    const sm = new T3.InstancedMesh(stalGeo, toon('#3E7090'), stals.length); stals.forEach((m4, i) => sm.setMatrixAt(i, m4)); sm.frustumCulled = false; scene.add(sm);
    /* glowing jellyfish drifting in the cave */
    const domeGeo = G('dome', () => new T3.SphereGeometry(.3, 12, 6, 0, TAU, 0, Math.PI / 2));
    for (let i = 0; i < 16; i++) {
      const c = i % 3 === 0 ? 0xFF8FD8 : i % 3 === 1 ? 0x7FF0FF : 0xC9A0FF, j = new T3.Group();
      const m = new T3.Mesh(domeGeo, keep(new T3.MeshBasicMaterial({color:c, transparent:true, opacity:.85}))); j.add(m);
      glow(j, [0, 0, 0], 1.3, c);
      const x = R() * len, base = groundAt(x) || 0; j.position.set(x, base + 1.4 + R() * 2.6, -2.5 - R() * 7); j.scale.setScalar(.7 + R() * .6); scene.add(j);
      const y0 = j.position.y, ph = R() * 6; anim.push(t => { j.position.y = y0 + Math.sin(t * .9 + ph) * .25; m.scale.y = 1 + Math.sin(t * 2.4 + ph) * .12; });
    }
    anim.push(t => { for (const k0 of kelps) k0.rotation.z = Math.sin(t * 1.2 + k0.sway) * .07; });
  } else if (isle === 2) {
    /* the lava river under the path */
    const lt = canvasTex(128, 128, (g2, w, h) => { g2.fillStyle = '#E2461E'; g2.fillRect(0, 0, w, h); for (let i = 0; i < 26; i++) { const r = 4 + R() * 12; g2.fillStyle = i % 3 ? 'rgba(255,200,80,.7)' : 'rgba(120,20,10,.6)'; g2.beginPath(); g2.ellipse(R() * w, R() * h, r * 1.8, r, R() * 3, 0, TAU); g2.fill(); } }, [Math.ceil(len / 6) + 6, 4]);
    const lava = new T3.Mesh(keep(new T3.PlaneGeometry(len + 60, 30)), keep(new T3.MeshBasicMaterial({map:lt, color:0xE8C8B8, fog:false}))); lava.rotation.x = -Math.PI / 2; lava.position.set(len / 2, -2.6, -6); scene.add(lava);
    anim.push(t => { lt.offset.set(t * .03, t * .01); });
    /* lava falls in the back */
    const ft = canvasTex(32, 128, (g2, w, h) => { const gr = g2.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#FFE27A'); gr.addColorStop(.5, '#FF7A2A'); gr.addColorStop(1, '#C2301A'); g2.fillStyle = gr; g2.fillRect(0, 0, w, h); g2.fillStyle = 'rgba(255,240,170,.6)'; for (let i = 0; i < 6; i++) g2.fillRect(R() * w, R() * h, 3, 18); }, [1, 2]);
    for (let x = 4 + R() * 6; x < len; x += 12 + R() * 10) { const base = groundAt(x) || 0, h = base + 9; const f = new T3.Mesh(G('fall', () => new T3.PlaneGeometry(.9, 1)), keep(new T3.MeshBasicMaterial({map:ft}))); f.scale.y = h; f.position.set(x, -2.6 + h / 2, -11 - R() * 4); scene.add(f); glow(scene, [x, -2.2, f.position.z + .5], 3, 0xFF7A3A); }
    anim.push(t => { ft.offset.y = -t * .4; });
    /* the volcano far away, glowing at the top */
    const vol = new T3.Mesh(keep(new T3.ConeGeometry(16, 20, 12, 1, true)), toon('#2A0F1E')); vol.position.set(len * .55, 4, -50); scene.add(vol);
    glow(scene, [len * .55, 14, -49], 14, 0xFF7A3A);
  }
  /* distant floating islands and stars */
  for (let x = -10; x < len + 20; x += 9 + R() * 6) { const g0 = new T3.Group(); g0.position.set(x, -1.5 + R() * 3.5 + (isle === 1 ? 2 : 0), -38 - R() * 10); const r = 1.4 + R() * 1.6; part(G('farTop', () => new T3.CylinderGeometry(1, 1.05, .4, 16)), TH.farTop, g0, [0, 0, 0], {line:false, cast:false}).scale.set(r, 1, r); part(G('farRock', () => new T3.ConeGeometry(1.05, 1.6, 12)), TH.farRock, g0, [0, -r * .8, 0], {rot:[Math.PI, 0, 0], line:false, cast:false}).scale.set(r, r, r); if (isle !== 1) scene.add(g0); }
  if (isle !== 1) { const pts = []; for (let i = 0; i < 260; i++) pts.push(-20 + R() * (len + 60), 4 + R() * 30, -45 - R() * 10); const geo = keep(new T3.BufferGeometry()); geo.setAttribute('position', new T3.Float32BufferAttribute(pts, 3)); scene.add(new T3.Points(geo, keep(new T3.PointsMaterial({color:0xFFFFFF, size:.25, fog:false})))); }
  const moonS = new T3.Sprite(keep(new T3.SpriteMaterial({map:glowTex, color:TH.moon[0], transparent:true, depthWrite:false, fog:false}))); moonS.scale.set(TH.moon[1], TH.moon[1], 1); scene.add(moonS);
  /* floating bits around the camera: petals fall, bubbles and embers rise */
  const partTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 32; const g2 = c.getContext('2d');
    if (TH.parts === 'petal') { g2.fillStyle = '#FFC6DD'; g2.beginPath(); g2.ellipse(16, 16, 12, 7, .5, 0, TAU); g2.fill(); }
    else if (TH.parts === 'bubble') { g2.strokeStyle = 'rgba(210,255,250,.95)'; g2.lineWidth = 3; g2.beginPath(); g2.arc(16, 16, 11, 0, TAU); g2.stroke(); g2.fillStyle = 'rgba(255,255,255,.8)'; g2.beginPath(); g2.arc(12, 12, 3, 0, TAU); g2.fill(); }
    else { const r = g2.createRadialGradient(16, 16, 0, 16, 16, 16); r.addColorStop(0, 'rgba(255,240,180,1)'); r.addColorStop(.4, 'rgba(255,140,60,.9)'); r.addColorStop(1, 'rgba(255,90,30,0)'); g2.fillStyle = r; g2.fillRect(0, 0, 32, 32); }
    return keep(new T3.CanvasTexture(c)); })();
  const NP = 120, rise = TH.parts !== 'petal', pPos = new Float32Array(NP * 3), pSp = []; for (let i = 0; i < NP; i++) { pPos[i * 3] = R() * 16 - 8; pPos[i * 3 + 1] = R() * 9 - 2; pPos[i * 3 + 2] = R() * 8 - 4; pSp.push(.5 + R()); }
  const pGeo = keep(new T3.BufferGeometry()); pGeo.setAttribute('position', new T3.BufferAttribute(pPos, 3));
  const petals = new T3.Points(pGeo, keep(new T3.PointsMaterial({map:partTex, size:TH.parts === 'ember' ? .14 : TH.parts === 'bubble' ? .16 : .18, transparent:true, depthWrite:false, blending:TH.parts === 'ember' ? T3.AdditiveBlending : T3.NormalBlending}))); scene.add(petals);
  /* crystals */
  const crystalGeo = [G('cry0', () => new T3.OctahedronGeometry(.11, 0)), G('cry1', () => new T3.OctahedronGeometry(.16, 0))];
  const crystals = W.crystals.map(c0 => { const m = part(crystalGeo[c0.big ? 1 : 0], '#9BF6FF', world, [c0.x * U, -c0.y * U, 0], {size:.15, mat:toon('#BFF6FF')}); m.scale.y = 1.6; const gl = glow(world, [c0.x * U, -c0.y * U, 0], c0.big ? .9 : .6); return {c0, m, gl}; });

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
  const foes = W.foes.map(f => { const F = PUM.SKY.FOES[f.kind] || {el:'blossom'}; const big = F.big, k = big ? .55 : .42; const b = bill(320, 320, 320 / .62 * k * U, 320 / .62 * k * U, .47); b.sp.position.set(f.x * U, -(f.y - 80) * U, 0); return {f, b, F, el:F.el, look:F.look, big, sh:blob()}; });
  const chests = W.chests.map(ch => { const b = bill(128, 128, .64, .64, 8 / 128); b.sp.position.set(ch.x * U, -ch.y * U, 0); return {ch, b, last:null}; });
  const gates = W.gates.map(gt => { const b = bill(256, 256, 1.6, 1.6, 6 / 256); b.sp.position.set(gt.x * U, -gt.y * U, -.05); return {gt, b}; });
  const lanterns = W.lanterns.map(l => { const b = bill(128, 256, .64, 1.28, 6 / 256); b.sp.position.set(l.x * U, -l.y * U, -.1); const gl = glow(world, [l.x * U, -l.y * U + .86, 0], 1.6, TH.lit); gl.visible = false; return {l, b, gl}; });
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
    moonS.position.set(camX + TH.moon[2], camY + TH.moon[3], -40);
    /* hero, spirit, shadows on the ground */
    const blink = hero.inv > 0 && Math.floor(t * 16) % 2;
    heroB.sp.visible = !blink;
    draw(heroB, c => { K.sprite(c, L, 128, 246, 2.2, {face:hero.face, run:hero.run, speed:Math.min(1, Math.abs(hero.vx) / 250), air:hero.ground ? null : hero.gliding ? 1 : Math.sign(hero.vy), t}); });
    heroB.sp.position.set(hx, hy, .02);
    const gh = groundAt(hx); heroShadow.visible = gh != null && gh <= hy + .01; if (gh != null) { heroShadow.position.set(hx, gh + .02, .05); heroShadow.scale.setScalar(Math.max(.4, 1 - (hy - gh) * .4)); }
    draw(compB, c => K.spirit(c, comp.kind, comp.stage, 128, 128, 1, t, {face:hero.face}));
    compB.sp.position.set(g.comp.x * U, -g.comp.y * U, .3);
    for (const fo of foes) {
      fo.b.sp.visible = !fo.f.done; fo.sh.visible = !fo.f.done;
      if (fo.f.done || !near(fo.f.x)) continue;
      if (frame % 2 === 0) draw(fo.b, c => K.foe(c, fo.F, 160, 170, .62, t + fo.f.x, {face:-1, seed:Math.round(fo.f.x), shield:fo.F.type === 'knight' ? 0 : -1}));
      fo.sh.position.set(fo.f.x * U, -fo.f.y * U + .02, .05); fo.sh.scale.setScalar(fo.big ? 1.6 : 1.3);
    }
    for (const c0 of chests) { if (!near(c0.ch.x)) continue; if (c0.last !== c0.ch.open || (!c0.ch.open && frame % 3 === 0)) { c0.last = c0.ch.open; draw(c0.b, c => K.chest(c, 64, 120, 2, c0.ch.open, t)); } }
    for (const g0 of gates) { if (!near(g0.gt.x)) continue; g0.gt.open = g0.gt.solved ? Math.min(1, g0.gt.open + .03) : 0; if (frame % 2 === 0 || g0.gt.solved) draw(g0.b, c => K.gate(c, 128, 250, 1.6, t, g0.gt.open, '', isle)); }
    for (const l0 of lanterns) { l0.gl.visible = l0.l.lit; if (!near(l0.l.x)) continue; if (l0.last !== l0.l.lit || frame % 4 === 0) { l0.last = l0.l.lit; draw(l0.b, c => K.litProp(c, isle, 64, 250, 2, l0.l.lit, t)); } }
    if (goal && near(goal.gl.x) && (frame % 2 === 0 || g.mode === 'end')) {
      const st = {done:g.mode === 'end', k:g.mode === 'end' ? Math.min(1, g.endT / 1.5) : 0, lit:g.mode === 'end' || g.lit >= W.lanterns.length, isle};
      draw(goal.b, c => K.goal(c, goal.gl.kind, 256, 500, 1.6, t, st));
    }
    for (const c0 of crystals) { c0.m.visible = c0.gl.visible = !c0.c0.got; if (!c0.c0.got && near(c0.c0.x)) { c0.m.rotation.y = t * 2 + c0.c0.x; c0.m.position.y = -c0.c0.y * U + Math.sin(t * 3 + c0.c0.x * .05) * .03; } }
    for (let i = 0; i < NP; i++) {
      if (rise) { pPos[i * 3 + 1] += dt * (TH.parts === 'ember' ? .55 : .35) * pSp[i]; pPos[i * 3] += Math.sin(t * 1.3 + i) * dt * .15 - (TH.parts === 'ember' ? dt * .2 * pSp[i] : 0); if (pPos[i * 3 + 1] > camY + 6) pPos[i * 3 + 1] = camY - 3; }
      else { pPos[i * 3 + 1] -= dt * .5 * pSp[i]; pPos[i * 3] -= dt * .3 * pSp[i]; if (pPos[i * 3 + 1] < camY - 4) pPos[i * 3 + 1] = camY + 6; }
      if (pPos[i * 3] < camX - 9) pPos[i * 3] += 18; else if (pPos[i * 3] > camX + 9) pPos[i * 3] -= 18;
    }
    pGeo.attributes.position.needsUpdate = true;
    for (const fn of anim) fn(t);
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
  return {canvas, resize, render, project, ppu, dispose, groundAt:x => groundAt(x * U), info:() => renderer.info, scene};
};
})();
