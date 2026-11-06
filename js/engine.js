/* Power-Up Math: canvas game runner, particles and drawing helpers shared by the mini-games. */
(function () {
'use strict';
const E = PUM.engine = {};

/* Runs a game object on a canvas: fixed-rate updates, DPR-aware drawing, pointer input. */
E.Runner = function (canvas, game) {
  const ctx = canvas.getContext('2d');
  const r = {canvas, ctx, game, running:false, paused:false, W:0, H:0, dpr:1, last:0, raf:0, t:0};
  function resize() {
    const rect = canvas.getBoundingClientRect();
    r.dpr = Math.min(2, window.devicePixelRatio || 1);
    r.W = Math.max(1, rect.width); r.H = Math.max(1, rect.height);
    canvas.width = Math.round(r.W * r.dpr); canvas.height = Math.round(r.H * r.dpr);
    if (game.resize) game.resize(r.W, r.H);
  }
  function frame(ts) {
    if (!r.running) return;
    r.raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, Math.max(0, (ts - r.last) / 1000 || 0)); r.last = ts;
    if (!r.paused) { r.t += dt; game.update(dt); }
    ctx.setTransform(r.dpr, 0, 0, r.dpr, 0, 0);
    game.draw(ctx, r.W, r.H, r.t);
  }
  const pt = e => { const b = canvas.getBoundingClientRect(); return [e.clientX - b.left, e.clientY - b.top]; };
  const onDown = e => { if (r.paused) return; e.preventDefault(); try { canvas.setPointerCapture(e.pointerId); } catch (_) {} const [x, y] = pt(e); game.pointer && game.pointer('down', x, y, e.pointerId); };
  const onMove = e => { if (r.paused) return; const [x, y] = pt(e); game.pointer && game.pointer('move', x, y, e.pointerId); };
  const onUp = e => { if (r.paused) return; const [x, y] = pt(e); game.pointer && game.pointer('up', x, y, e.pointerId); };
  r.start = () => {
    resize(); r.running = true; r.last = performance.now(); r.raf = requestAnimationFrame(frame);
    window.addEventListener('resize', resize);
    canvas.addEventListener('pointerdown', onDown); canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp); canvas.addEventListener('pointercancel', onUp);
  };
  r.stop = () => {
    r.running = false; cancelAnimationFrame(r.raf);
    window.removeEventListener('resize', resize);
    canvas.removeEventListener('pointerdown', onDown); canvas.removeEventListener('pointermove', onMove);
    canvas.removeEventListener('pointerup', onUp); canvas.removeEventListener('pointercancel', onUp);
  };
  r.pause = () => { r.paused = true; if (game.onPause) game.onPause(); };
  r.resume = () => { r.paused = false; r.last = performance.now(); if (game.onResume) game.onResume(); };
  return r;
};

/* Particle pool, drawn in whatever transform is active. */
E.Particles = function () {
  const list = [];
  return {
    list,
    add(o) { if (list.length < 400) list.push(Object.assign({x:0, y:0, vx:0, vy:0, g:0, life:1, max:1, size:4, color:'#fff', shape:'circle', rot:0, vr:0, drag:0}, o, {max:o.life || 1})); },
    burst(x, y, n, o) {
      for (let i = 0; i < n; i++) {
        const a = (o.angle != null ? o.angle : 0) + (Math.random() - .5) * (o.spread != null ? o.spread : Math.PI * 2);
        const sp = (o.speed || 100) * (.4 + Math.random() * .8);
        this.add(Object.assign({}, o, {x, y, vx:Math.cos(a) * sp, vy:Math.sin(a) * sp, life:(o.life || .8) * (.6 + Math.random() * .6), rot:Math.random() * 6, vr:(Math.random() - .5) * 10,
          color:Array.isArray(o.color) ? o.color[Math.floor(Math.random() * o.color.length)] : o.color}));
      }
    },
    update(dt) {
      for (let i = list.length - 1; i >= 0; i--) {
        const p = list[i];
        p.life -= dt; if (p.life <= 0) { list.splice(i, 1); continue; }
        p.vy += p.g * dt; if (p.drag) { p.vx *= 1 - p.drag * dt; p.vy *= 1 - p.drag * dt; }
        p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
      }
    },
    draw(ctx) {
      for (const p of list) {
        const a = Math.max(0, p.life / p.max);
        ctx.globalAlpha = p.fade === false ? 1 : Math.min(1, a * 1.5);
        ctx.fillStyle = p.color;
        if (p.shape === 'rect') { ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillRect(-p.size / 2, -p.size / 3, p.size, p.size * .66); ctx.restore(); }
        else if (p.shape === 'star') { ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); E.starPath(ctx, 0, 0, p.size, p.size * .45, 5); ctx.fill(); ctx.restore(); }
        else { const s = p.grow ? p.size * (1 + (1 - a) * p.grow) : p.size; ctx.beginPath(); ctx.arc(p.x, p.y, s, 0, Math.PI * 2); ctx.fill(); }
      }
      ctx.globalAlpha = 1;
    },
  };
};

/* drawing helpers */
E.rr = (ctx, x, y, w, h, r) => { r = Math.min(r, w / 2, h / 2); ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); };
E.starPath = (ctx, cx, cy, R, r, n) => { ctx.beginPath(); for (let i = 0; i < n * 2; i++) { const rad = i % 2 ? r : R, a = -Math.PI / 2 + i * Math.PI / n; ctx[i ? 'lineTo' : 'moveTo'](cx + rad * Math.cos(a), cy + rad * Math.sin(a)); } ctx.closePath(); };
E.outlineText = (ctx, text, x, y, size, fill = '#fff', stroke = '#1D2540', align = 'center') => {
  ctx.font = `800 ${size}px Sniglet, "Arial Rounded MT Bold", sans-serif`; ctx.textAlign = align; ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round'; ctx.lineWidth = Math.max(3, size * .16); ctx.strokeStyle = stroke; ctx.strokeText(text, x, y);
  ctx.fillStyle = fill; ctx.fillText(text, x, y);
};
/* Numbers in a plain, clear font (Sniglet's 0 reads like a ring). */
E.numText = (ctx, text, x, y, size, fill = '#fff', stroke = '#1D2540', align = 'center') => {
  ctx.font = `800 ${size}px Lexend, "Arial Rounded MT Bold", sans-serif`; ctx.textAlign = align; ctx.textBaseline = 'middle';
  if (stroke) { ctx.lineJoin = 'round'; ctx.lineWidth = Math.max(3, size * .16); ctx.strokeStyle = stroke; ctx.strokeText(text, x, y); }
  ctx.fillStyle = fill; ctx.fillText(text, x, y);
};
E.shade = (hex, amt) => {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex).trim()); if (!m) return hex;
  const n = parseInt(m[1], 16); let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  const f = v => Math.max(0, Math.min(255, Math.round(amt < 0 ? v * (1 + amt) : v + (255 - v) * amt)));
  return '#' + ((1 << 24) | (f(r) << 16) | (f(g) << 8) | f(b)).toString(16).slice(1);
};
/* Fixed palette for game worlds: they keep one look in light and dark mode. */
E.PAL = {
  ink:'#1D2540', white:'#FFFFFF', star:'#FFC233', marigold:'#FF8A3D', rose:'#E8577A', leaf:'#22A06B', sea:'#2F95D6', berry:'#7357DB', mint:'#4FCBA9', plum:'#B04F9C',
  metal:'#4A4F5C', tire:'#2A2D36', glass:'#BFE7F5', concrete:'#B9BFC7', dirt:'#B98A5E', dirtDark:'#8E6640', grass:'#6CBF5C', grassDark:'#4E9A42', brick:'#C8553D', skin1:'#F6D2B4', skin2:'#D9A27B', skin3:'#8D5A3B', hair1:'#2A2440', hair2:'#E86AA6', hair3:'#2B8C9A',
};
E.col = name => E.PAL[name] || name;
})();
