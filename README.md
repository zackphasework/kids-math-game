# Power-Up Math

A math game for Zack's kids, nieces and nephews (ages 3 to 12), built for phones and tablets.

Live: https://zackphasework.github.io/kids-math-game/

Each kid picks a theme. Every theme has 3 worlds of 5 levels, and level 5 of each world is a boss. Each level has a clear goal, obstacles get harder as you go, and later levels need upgrades. Math does three jobs:

1. Training at the base earns math points, which buy upgrades (5 per theme).
2. Math is built into the gameplay: math gates on the road, passing to the right shirt number, and breaking enemy shields.
3. When fuel, stamina or energy runs out, a quick math refill gets you going again.

- **Trucks: Big Rig Rescue.** A behind-the-truck road racer. Steer across three lanes and brake for curves. Dodge cones, rocks, potholes, tractors, oncoming cars, falling boulders, ice and narrow bridges, and beat the clock. Each boss is a race against a rival truck that throws barrels.
- **Soccer: Striker Rush.** A top-down attacking game. Drag to dribble past blockers, chasers and slide tackles, break defensive walls with math passes, and shoot past a keeper who gets better every level. Bosses have giant keepers and defenders.
- **Hero: Sky Quest.** A side-scrolling runner. Jump and slide past gaps, bats, spikes, turrets, moving platforms and smoke, break goblin shields with math, and reach the portal. Bosses have three phases, and each phase's shield breaks with math.

## How it's built

- Plain HTML, CSS and JavaScript. There's no build step and no libraries, and it's hosted on GitHub Pages.
- `js/core.js` holds shared helpers, UI art and sound. `js/math.js` has the question generators and quiz panel, `js/store.js` handles saves and family sync, and `js/levels.js` defines the campaigns and upgrades, and `js/engine.js` is the canvas runner. `js/trucks.js`, `js/soccer.js` and `js/hero.js` are the three games, and `js/app.js` has the screens.
- Progress is saved in each browser and synced through Supabase, using `kmg_`-prefixed tables and functions in the IAh project.
- There's no sign-in. A device joins a family by opening the family link (`#join=CODE`) or typing the family code once. The code is never stored in this repo.
- The Supabase key in `js/store.js` is the public publishable key. The `kmg_` tables have row-level security and no policies, so they're only reachable through the `kmg_list_players`, `kmg_save_player` and `kmg_delete_player` functions, and each of those requires a valid family code.
