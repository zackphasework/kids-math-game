/* Power-Up Math: campaigns. Each theme has 3 worlds of 5 levels; level 5 of each world is a boss.
   Each level adds or mixes obstacles; "power" is the recommended total of upgrade levels. */
(function () {
'use strict';
const L = PUM.CAMPAIGN = {};

L.upgrades = {
  trucks: [
    {k:'engine', name:'Engine', what:'Higher top speed, so you beat the clock.'},
    {k:'armor', name:'Armor', what:'Take more bumps before breaking down.'},
    {k:'tires', name:'Tires', what:'Sharper steering. Grip on curves and ice.'},
    {k:'tank', name:'Fuel tank', what:'Drive farther before you need a refill.'},
    {k:'turbo', name:'Turbo', what:'Stronger, longer boosts from math gates.'},
  ],
  soccer: [
    {k:'speed', name:'Speed', what:'Run faster past defenders.'},
    {k:'stamina', name:'Stamina', what:'Play longer before you need a refill.'},
    {k:'shot', name:'Shot power', what:'Faster shots that keepers can’t reach.'},
    {k:'dribble', name:'Dribbling', what:'Keep the ball when defenders tackle.'},
    {k:'pass', name:'Passing', what:'Power shots charge faster from math passes.'},
  ],
  anime: [
    {k:'hearts', name:'Hearts', what:'One more heart per level.'},
    {k:'attack', name:'Attack', what:'Hit bosses harder.'},
    {k:'energy', name:'Energy', what:'Run longer before you need a refill.'},
    {k:'agility', name:'Agility', what:'Jump higher. Level 1 unlocks double jump.'},
    {k:'shield', name:'Shield', what:'Longer safety after a hit, and blocks some hits.'},
  ],
};
L.cost = [6, 12, 20, 32, 50];
L.maxUp = 5;
L.power = p => L.upgrades[p.theme].reduce((s, u) => s + (p.up[u.k] || 0), 0);

const POWER = [0, 1, 2, 3, 4, 5, 6, 8, 9, 11, 12, 14, 16, 18, 20];

L.trucks = {
  worlds:[
    {name:'Countryside', color:'leaf', sky:['#69C2F0', '#D6F0FF'], grass:['#7CC765', '#6DB857'], boss:'Crusher'},
    {name:'Red Canyon', color:'marigold', sky:['#F59A5B', '#FFE1B8'], grass:['#D9A066', '#CC9059'], boss:'Mud Monster'},
    {name:'Snowy Peaks', color:'sea', sky:['#7FA8E8', '#E6F0FF'], grass:['#EEF4FA', '#DCE6F0'], boss:'Ice King'},
  ],
  levels:[
    {name:'First delivery', cargo:'bricks', len:650, curve:.3, hills:.2, obs:{cone:.5}, gates:2, nw:'Steer around the cones!'},
    {name:'Rocky road', cargo:'pipes', len:750, curve:.4, hills:.3, obs:{cone:.4, rock:.4}, gates:3, nw:'New: rocks. Hitting one damages your truck.'},
    {name:'Pothole lane', cargo:'windows', len:850, curve:.5, hills:.4, obs:{cone:.3, rock:.3, hole:.5}, gates:3, nw:'New: potholes slow you right down.'},
    {name:'Big hill run', cargo:'beams', len:950, curve:.6, hills:.8, obs:{cone:.4, rock:.5, hole:.5}, gates:4, nw:'Hills and sharp curves. Brake before the corners!'},
    {name:'Race Crusher', cargo:'bricks', len:900, curve:.5, hills:.5, obs:{cone:.3, rock:.3}, gates:4, boss:true, nw:'BOSS: Crusher throws barrels. Dodge them and pass him!'},
    {name:'Canyon farms', cargo:'hay', len:900, curve:.5, hills:.5, obs:{rock:.4, tractor:.5}, gates:3, nw:'New: slow tractors. Pass them on the side.'},
    {name:'Two-way traffic', cargo:'pipes', len:1000, curve:.6, hills:.5, obs:{rock:.3, tractor:.4, car:.5}, gates:4, nw:'New: cars coming the other way!'},
    {name:'Falling rocks', cargo:'steel', len:1050, curve:.6, hills:.6, obs:{tractor:.3, car:.4, boulder:.5}, gates:4, nw:'New: boulders fall from the cliffs. Watch for shadows.'},
    {name:'Canyon rush', cargo:'beams', len:1150, curve:.8, hills:.7, obs:{rock:.4, hole:.4, tractor:.4, car:.5, boulder:.4}, gates:5, nw:'Everything at once. Upgrade first!'},
    {name:'Race Mud Monster', cargo:'bricks', len:1050, curve:.7, hills:.6, obs:{rock:.3, car:.3, hole:.4}, gates:5, boss:true, nw:'BOSS: Mud Monster throws mud and barrels.'},
    {name:'Icy road', cargo:'logs', len:1050, curve:.7, hills:.6, obs:{rock:.3, ice:.6}, gates:4, nw:'New: ice. Your steering slides, so go easy.'},
    {name:'Narrow bridges', cargo:'steel', len:1150, curve:.7, hills:.7, obs:{car:.4, ice:.4, bridge:.6}, gates:5, nw:'New: narrow bridges. Stay on the road!'},
    {name:'Blizzard pass', cargo:'beams', len:1250, curve:.8, hills:.8, obs:{rock:.4, car:.4, ice:.5, bridge:.4, boulder:.3}, gates:5, nw:'A long, twisty pass.'},
    {name:'Mountain madness', cargo:'windows', len:1350, curve:.9, hills:.9, obs:{cone:.3, rock:.4, hole:.4, tractor:.3, car:.5, ice:.4, bridge:.4, boulder:.4}, gates:6, nw:'The hardest road yet.'},
    {name:'Race the Ice King', cargo:'bricks', len:1250, curve:.9, hills:.8, obs:{rock:.3, car:.3, ice:.5, bridge:.3}, gates:6, boss:true, nw:'FINAL BOSS: the Ice King’s snowplow.'},
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
    {name:'Misty Forest', color:'leaf', sky:['#9FD9C9', '#E6F7EE'], hills:'#5FA889', ground:'#4E8A5F', boss:'Gloom Blob'},
    {name:'Crystal Caves', color:'sea', sky:['#6E86D8', '#C9D8FF'], hills:'#4A5FAE', ground:'#5A5F8E', boss:'Crystal Snapper'},
    {name:'Volcano Peak', color:'rose', sky:['#E86A5A', '#FFD0A8'], hills:'#9A4A42', ground:'#6E3A36', boss:'Magma King'},
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
