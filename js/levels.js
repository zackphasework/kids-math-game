/* Power-Up Math: campaigns. Each theme has 3 worlds of 5 levels; level 5 of each world is a boss.
   Each level adds or mixes obstacles; "power" is the recommended total of upgrade levels. */
(function () {
'use strict';
const L = PUM.CAMPAIGN = {};

L.upgrades = {
  trucks: [
    {k:'engine', name:'Engine', what:'Higher top speed, so you beat the clock.'},
    {k:'tires', name:'Tires', what:'Sharper steering. Grip on curves and wet roads.'},
    {k:'bed', name:'Bigger bed', what:'Carry extra, so every delivery pays more coins.'},
    {k:'suspension', name:'Suspension', what:'Less cargo falls off when you crash or hit a pothole.'},
    {k:'tank', name:'Fuel tank', what:'Drive farther before you need a refill.'},
  ],
  soccer: [
    {k:'speed', name:'Speed', what:'Run faster past defenders.'},
    {k:'stamina', name:'Stamina', what:'Play longer before you need a refill.'},
    {k:'shot', name:'Shot power', what:'Faster shots that keepers can’t reach.'},
    {k:'dribble', name:'Dribbling', what:'Keep the ball when defenders tackle.'},
    {k:'pass', name:'Passing', what:'Power shots charge faster from math passes.'},
  ],
  anime: [
    {k:'weapon', name:'Weapon', what:'Every attack hits harder.'},
    {k:'charm', name:'Spirit charm', what:'Your Spirit meter fills faster, so special moves come sooner.'},
    {k:'boots', name:'Sky boots', what:'Run faster and jump higher on the islands.'},
  ],
};
L.cost = [6, 12, 20, 32, 50];
L.maxUp = 5;
L.power = p => L.upgrades[p.theme].reduce((s, u) => s + (p.up[u.k] || 0), 0);

const POWER = [0, 1, 2, 3, 4, 5, 6, 8, 9, 11, 12, 14, 16, 18, 20];

L.trucks = {
  worlds:[
    {name:'Main Street', color:'leaf', sky:['#69C2F0', '#D6F0FF'], grass:['#7CC765', '#6DB857'], boss:'River Bridge'},
    {name:'The Hills', color:'marigold', sky:['#F59A5B', '#FFE1B8'], grass:['#D9A066', '#CC9059'], boss:'Mountain Tunnel'},
    {name:'Big City', color:'sea', sky:['#7FA8E8', '#E6F0FF'], grass:['#9AA6B5', '#8C98A8'], boss:'Skyscraper'},
  ],
  /* Each level is one building job. Road settings are for each trip of the job. */
  levels:[
    {name:'House', len:480, curve:.3, hills:.2, obs:{cone:.5}, gates:2, nw:'Steer around the cones!'},
    {name:'Gas station', len:540, curve:.4, hills:.3, obs:{cone:.4, rock:.45}, gates:2, nw:'New: rocks. Crash into one and cargo falls off.'},
    {name:'Mechanic', len:600, curve:.5, hills:.4, obs:{cone:.3, rock:.35, hole:.5}, gates:3, nw:'New: potholes, and the cement mixer. Concrete sets, so be quick!'},
    {name:'School', len:640, curve:.65, hills:.8, obs:{cone:.35, rock:.5, hole:.5}, gates:3, nw:'Hills and sharp curves. Brake before the corners!'},
    {name:'River Bridge', len:560, curve:.5, hills:.4, obs:{cone:.3, rock:.35, hole:.35, ice:.6, bridge:.45}, gates:3, boss:true, storm:true, nw:'BOSS: a storm is coming! Wet roads are slippery and the river is rising.'},
    {name:'Quarry', soon:true, len:600, curve:.5, hills:.5, obs:{rock:.4, tractor:.5}, gates:3, nw:''},
    {name:'Soccer field', soon:true, len:640, curve:.6, hills:.5, obs:{rock:.3, tractor:.4, car:.5}, gates:3, nw:''},
    {name:'Hospital', soon:true, len:680, curve:.6, hills:.6, obs:{tractor:.3, car:.4, boulder:.5}, gates:4, nw:''},
    {name:'Fire station', soon:true, len:720, curve:.8, hills:.7, obs:{rock:.4, hole:.4, tractor:.4, car:.5, boulder:.4}, gates:4, nw:''},
    {name:'Mountain Tunnel', soon:true, len:700, curve:.7, hills:.6, obs:{rock:.3, car:.3, hole:.4}, gates:4, boss:true, rival:true, nw:''},
    {name:'Train station', soon:true, len:700, curve:.7, hills:.6, obs:{rock:.3, ice:.6}, gates:4, nw:''},
    {name:'Apartment tower', soon:true, len:740, curve:.7, hills:.7, obs:{car:.4, ice:.4, bridge:.6}, gates:4, nw:''},
    {name:'Shopping mall', soon:true, len:780, curve:.8, hills:.8, obs:{rock:.4, car:.4, ice:.5, bridge:.4, boulder:.3}, gates:5, nw:''},
    {name:'Stadium', soon:true, len:820, curve:.9, hills:.9, obs:{cone:.3, rock:.4, hole:.4, tractor:.3, car:.5, ice:.4, bridge:.4, boulder:.4}, gates:5, nw:''},
    {name:'Skyscraper', soon:true, len:800, curve:.9, hills:.8, obs:{rock:.3, car:.3, ice:.5, bridge:.3}, gates:5, boss:true, rival:true, nw:''},
  ],
};
L.soccer = {
  worlds:[
    {name:'Park League', color:'leaf', boss:'The Wall'},
    {name:'City Cup', color:'sea', boss:'Iron Twins'},
    {name:'Champions Cup', color:'berry', boss:'Captain Thunder'},
  ],
  levels:[
    {name:'Kick-off', goals:1, time:90, def:{block:2}, walls:0, nw:'Dribble past the defenders and score!'},
    {name:'Busy park', goals:2, time:100, def:{block:3}, walls:0, nw:'Score 2 goals before full time.'},
    {name:'The chasers', goals:2, time:100, def:{block:2, chaser:1}, walls:0, nw:'New: chasers run at you. Dodge them!'},
    {name:'Pass the wall', goals:2, time:110, def:{block:2, chaser:1}, walls:1, nw:'New: defensive walls. Pass to the right shirt number!'},
    {name:'vs The Wall', goals:2, time:120, def:{block:2, chaser:1}, walls:1, boss:true, nw:'BOSS: a giant keeper. Use power shots from math passes!'},
    {name:'Slide tackles', goals:2, time:110, def:{block:2, slider:1}, walls:1, nw:'New: slide tackles. Watch the warning line!'},
    {name:'Muddy pitch', goals:2, time:110, def:{block:2, chaser:1, slider:1}, walls:1, mud:true, nw:'New: mud slows you down.'},
    {name:'Fast chasers', goals:3, time:130, def:{block:2, chaser:2, slider:1}, walls:1, nw:'Faster chasers. Upgrade your speed!'},
    {name:'City derby', goals:3, time:140, def:{block:3, chaser:2, slider:1}, walls:2, mud:true, nw:'Everything at once.'},
    {name:'vs Iron Twins', goals:3, time:150, def:{block:2, chaser:2, slider:1}, walls:2, boss:true, nw:'BOSS: two huge defenders guard the goal.'},
    {name:'Rainy night', goals:3, time:140, def:{block:3, chaser:2, slider:1}, walls:2, rain:true, nw:'New: rain makes the ball slippery.'},
    {name:'Double walls', goals:3, time:150, def:{block:3, chaser:2, slider:2}, walls:3, nw:'More walls to pass.'},
    {name:'Semi-final', goals:3, time:150, def:{block:3, chaser:3, slider:2}, walls:2, mud:true, nw:'The semi-final.'},
    {name:'Final rehearsal', goals:4, time:170, def:{block:4, chaser:3, slider:2}, walls:3, rain:true, nw:'Almost there!'},
    {name:'vs Captain Thunder', goals:3, time:170, def:{block:3, chaser:3, slider:2}, walls:3, boss:true, nw:'FINAL BOSS: Captain Thunder’s team.'},
  ],
};
L.anime = {
  worlds:[
    {name:'Blossom Isle', color:'rose', boss:'Hanamori'},
    {name:'Tide Grotto', color:'sea', boss:'Umikaze'},
    {name:'Ember Peak', color:'marigold', boss:'Homura'},
  ],
  levels:[
    {name:'Into the forest', len:3600, obs:{gap:.4, rock:.5}, foes:1, nw:'Jump over rocks and gaps. Reach the portal!'},
    {name:'Bat cave path', len:4200, obs:{gap:.4, rock:.4, bat:.5}, foes:2, nw:'New: bats. Slide under them!'},
    {name:'Shield goblins', len:4600, obs:{gap:.4, rock:.4, bat:.4}, foes:4, nw:'New: goblins with math shields. Pick the right answer to attack!'},
    {name:'Treetop run', len:5000, obs:{gap:.5, rock:.4, bat:.4, spikes:.4}, foes:4, nw:'New: spikes. Long jumps ahead.'},
    {name:'Gloom Blob', len:2600, obs:{gap:.3, rock:.3}, foes:2, boss:true, nw:'BOSS: dodge its attacks, then break its shield with math!'},
    {name:'Crystal tunnels', len:4600, obs:{gap:.4, rock:.3, turret:.5}, foes:3, nw:'New: crystal turrets shoot. Time your jumps.'},
    {name:'Floating rocks', len:5000, obs:{gap:.4, bat:.4, turret:.3, mover:.6}, foes:4, nw:'New: moving platforms over deep gaps.'},
    {name:'Gem mines', len:5400, obs:{gap:.4, rock:.4, bat:.4, turret:.4, mover:.4}, foes:5, nw:'Everything so far.'},
    {name:'Deep caves', len:5800, obs:{gap:.5, rock:.4, bat:.5, turret:.5, mover:.5, spikes:.4}, foes:6, nw:'Harder and faster. Upgrade first!'},
    {name:'Crystal Snapper', len:2800, obs:{gap:.3, bat:.3, turret:.3}, foes:3, boss:true, nw:'BOSS: the Crystal Snapper.'},
    {name:'Lava steps', len:5200, obs:{gap:.5, rock:.4, spikes:.5, mover:.4}, foes:4, nw:'Lava below. Don’t fall!'},
    {name:'Smoke zone', len:5600, obs:{gap:.4, bat:.4, turret:.4, dark:.6}, foes:5, nw:'New: smoke. You can only see near your hero.'},
    {name:'Fire goblins', len:6000, obs:{gap:.5, rock:.4, bat:.4, turret:.5, mover:.4, dark:.3}, foes:7, nw:'Lots of shield goblins.'},
    {name:'The summit', len:6400, obs:{gap:.5, rock:.5, bat:.5, turret:.5, mover:.5, spikes:.5, dark:.4}, foes:8, nw:'The final climb.'},
    {name:'Magma King', len:3000, obs:{gap:.3, turret:.3, spikes:.3}, foes:3, boss:true, nw:'FINAL BOSS: the Magma King.'},
  ],
};
for (const t of ['trucks', 'soccer', 'anime']) L[t].levels.forEach((lv, i) => { lv.i = i; lv.world = Math.floor(i / 5); lv.power = POWER[i]; });
L.count = 15;
L.level = (theme, i) => L[theme].levels[Math.max(0, Math.min(L.count - 1, i))];
})();
