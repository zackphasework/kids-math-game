/* Power-Up Math: player data, local save and family sync through Supabase. */
(function () {
'use strict';
const {num, clamp} = PUM.util;
const SB_URL = 'https://fvixamvkxrzzhjbidhyy.supabase.co';
const SB_KEY = 'sb_publishable_tuG4SkViIQPPvhN-RTbw3g_bfWeG1_G';
const FAMILY_KEY = 'pum-family-code';
const LOCAL_KEY = 'pum-save-v2';
const store = PUM.store = {};

function normUp(x) { x = (x && typeof x === 'object') ? x : {}; const o = {}; for (const k of ['cap','rech','str','spec']) o[k] = clamp(num(x[k]), 0, PUM.UP_MAX); return o; }
function normProg(x) {
  x = (x && typeof x === 'object') ? x : {};
  const t = x.trucks || {}, s = x.soccer || {}, h = x.anime || {};
  const list = (a, f) => Array.isArray(a) ? a.slice(-200).map(f).filter(Boolean) : [];
  return {
    trucks:{level:num(t.level), bricks:num(t.bricks), built:list(t.built, v => Number.isFinite(+v) ? num(v) : null), best:num(t.best)},
    soccer:{season:num(s.season), match:clamp(num(s.match), 0, 4), w:num(s.w), d:num(s.d), l:num(s.l), sw:clamp(num(s.sw), 0, 5), trophies:list(s.trophies, v => (v && ['gold','silver','bronze'].includes(v.m)) ? {i:num(v.i), m:v.m} : null)},
    anime:{world:num(h.world), badges:list(h.badges, v => Number.isFinite(+v) ? num(v) : null), best:num(h.best)},
  };
}
store.normalize = function (d) {
  if (!d || typeof d !== 'object') return null;
  const id = String(d.id || '');
  if (!/^[A-Za-z0-9]{4,40}$/.test(id)) return null;
  const LV = PUM.LV;
  const p = {id, name:String(d.name || 'Player').slice(0, 16), color:PUM.COLORS.includes(d.color) ? d.color : 'sea',
    theme:PUM.THEME_IDS.includes(d.theme) ? d.theme : 'trucks', hero:clamp(num(d.hero), 0, PUM.HEROES.length - 1),
    age:PUM.AGES.includes(d.age) ? d.age : 5, stars:num(d.stars), mp:num(d.mp), mpTotal:num(d.mpTotal),
    created:num(d.created), updatedAt:num(d.updatedAt), mode:d.mode === 'keypad' ? 'keypad' : 'choices', speak:!!d.speak,
    start:LV[d.start] ? d.start : 'count', world:LV[d.world] ? d.world : (LV[d.start] ? d.start : 'count'),
    levels:{}, up:normUp(d.up), prog:normProg(d.prog)};
  if (d.levels && typeof d.levels === 'object') for (const l of PUM.LEVELS) {
    const x = d.levels[l.id];
    if (x && typeof x === 'object') p.levels[l.id] = {tier:clamp(num(x.tier), 0, l.steps.length - 1), streak:clamp(num(x.streak), 0, 999), misses:clamp(num(x.misses), 0, 99), stars:num(x.stars)};
  }
  return p;
};
function loadLocal() {
  try {
    const d = JSON.parse(localStorage.getItem(LOCAL_KEY) || 'null');
    if (d && Array.isArray(d.players)) return {players:d.players.map(store.normalize).filter(Boolean), muted:!!d.muted};
  } catch (e) {}
  return {players:[], muted:false};
}
const S = store.S = loadLocal();
store.saveLocal = () => { try { localStorage.setItem(LOCAL_KEY, JSON.stringify(S)); } catch (e) {} };
store.lv = (p, id) => p.levels[id] || (p.levels[id] = {tier:0, streak:0, misses:0, stars:0});

/* ---------- family sync ---------- */
let family = '';
try { family = localStorage.getItem(FAMILY_KEY) || ''; } catch (e) {}
const hashJoin = (location.hash.match(/join=([A-Za-z0-9-]{6,40})/) || [])[1];
if (hashJoin) {
  family = hashJoin.replace(/-/g, '').toUpperCase();
  try { localStorage.setItem(FAMILY_KEY, family); } catch (e) {}
  try { history.replaceState(null, '', location.pathname + location.search); } catch (e) {}
}
const sync = store.sync = {state:family ? 'syncing' : 'local', timers:{}, chain:Promise.resolve(), pulling:false, joinErr:'', onChange:null, onPulled:null};
store.family = () => family;
store.SYNC_TEXT = {local:'Saved on this device', syncing:'Connecting to family save…', synced:'Saved for the whole family', offline:"Can't reach family save, saving here for now", badcode:"Family code didn't work"};
async function rpc(fn, body) {
  const r = await fetch(`${SB_URL}/rest/v1/rpc/${fn}`, {method:'POST', headers:{apikey:SB_KEY, 'Content-Type':'application/json'}, body:JSON.stringify(body)});
  const txt = await r.text(); let j = null;
  try { j = txt ? JSON.parse(txt) : null; } catch (e) {}
  if (!r.ok) { const e = new Error((j && j.message) || 'Request failed'); e.code = j && j.code; throw e; }
  return j;
}
function setSync(s) { sync.state = s; if (sync.onChange) sync.onChange(); }
function pushPlayer(p) {
  if (!family) return;
  clearTimeout(sync.timers[p.id]);
  sync.timers[p.id] = setTimeout(() => {
    const body = {p_code:family, p_id:p.id, p_data:JSON.parse(JSON.stringify(p)), p_updated_at:p.updatedAt};
    sync.chain = sync.chain.then(() => rpc('kmg_save_player', body)).then(() => { if (sync.state !== 'synced') setSync('synced'); })
      .catch(e => setSync(e.code === '28000' ? 'badcode' : 'offline'));
  }, 800);
}
store.deleteRemote = id => {
  if (!family) return;
  const body = {p_code:family, p_id:id, p_updated_at:Date.now()};
  sync.chain = sync.chain.then(() => rpc('kmg_delete_player', body)).catch(() => setSync('offline'));
};
store.savePlayer = p => { p.updatedAt = Date.now(); store.saveLocal(); pushPlayer(p); };
store.pull = async function () {
  if (!family || sync.pulling) return;
  sync.pulling = true;
  try {
    const rows = await rpc('kmg_list_players', {p_code:family});
    const seen = new Set();
    for (const r of Array.isArray(rows) ? rows : []) {
      seen.add(r.id);
      const i = S.players.findIndex(p => p.id === r.id);
      if (r.deleted) { if (i >= 0) S.players.splice(i, 1); continue; }
      const remote = store.normalize({...(r.data || {}), id:r.id, updatedAt:r.updated_at});
      if (!remote) continue;
      if (i < 0) S.players.push(remote);
      else if (remote.updatedAt > S.players[i].updatedAt) S.players[i] = remote;
      else if (remote.updatedAt < S.players[i].updatedAt) pushPlayer(S.players[i]);
    }
    for (const p of S.players) if (!seen.has(p.id)) { if (!p.updatedAt) p.updatedAt = Date.now(); pushPlayer(p); }
    store.saveLocal(); setSync('synced');
    if (sync.onPulled) sync.onPulled();
  } catch (e) {
    setSync(e.code === '28000' ? 'badcode' : 'offline');
  } finally { sync.pulling = false; }
};
store.join = async function (code) {
  const c = String(code || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  if (c.length < 6) { sync.joinErr = 'Type the whole family code.'; return false; }
  try {
    await rpc('kmg_list_players', {p_code:c});
    family = c; sync.joinErr = '';
    try { localStorage.setItem(FAMILY_KEY, c); } catch (e) {}
    setSync('syncing'); await store.pull();
    return true;
  } catch (e) {
    sync.joinErr = e.code === '28000' ? "That code didn't work. Check it and try again." : "Couldn't reach the family save. Check the internet connection.";
    return false;
  }
};
store.prettyCode = c => c.replace(/(.{4})(?=.)/g, '$1-');
store.familyLink = () => `${location.origin}${location.pathname}#join=${store.prettyCode(family)}`;
})();
