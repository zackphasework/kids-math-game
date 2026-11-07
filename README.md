# Power-Up Math

A math game for Zack's kids, nieces and nephews (ages 3 to 12), built for phones and tablets.

Live: https://power-up-math.netlify.app/

Each kid picks a theme. Every theme has 3 worlds of 5 levels, and level 5 of each world is a boss. Each level has a clear goal, obstacles get harder as you go, and later levels need upgrades. Math does three jobs:

1. Training at the base earns math points, which buy upgrades (5 per theme).
2. Math is built into the gameplay: math gates on the road, passing to the right shirt number, and breaking enemy shields.
3. When fuel, stamina or energy runs out, a quick math refill gets you going again.

- **Trucks: Big Rig Builders.** The kid runs a construction company and builds Main Street, one building per job (house, gas station, mechanic, school, and a River Bridge boss). Each job is a set of steps: dig the foundation with the excavator, bring each load (pick the right truck, load the exact amount the math question asks for, then drive it through the answer lanes and dodge obstacles so the cargo stays on), and drop the final piece with the tower crane. Finished buildings stay in the town and give bonuses (bigger fuel tank, a bumper, crossed-out wrong lanes). Coins buy garage upgrades and paint. The Hills and Big City are next.
- **Soccer: Striker Rush.** A top-down attacking game. Drag to dribble past blockers, chasers and slide tackles, break defensive walls with math passes, and shoot past a keeper who gets better every level. Bosses have giant keepers and defenders.
- **Hero: Sky Quest.** An anime adventure. Make a hero (Kai, Mira or Juno) and pick a spirit companion, then restore Blossom Isle one quest at a time: explore side-scrolling stages, open chests and spirit gates with math, and fight turn-based battles where right answers power element moves, a streak fills the Spirit meter for a special-move cut-in, and you tap Guard to block. The guardian Hanamori has three phases and joins your team once purified. Crystals rebuild Sky Village (dojo, spirit garden, forge, healing spring, lantern tower), snacks level up and evolve your spirits, and XP raises your hero level.

## How it's built

- Plain HTML, CSS and JavaScript. There's no build step and no libraries, and it's hosted on Netlify, which deploys every push to `main`.
- `js/core.js` holds shared helpers, UI art and sound. `js/math.js` has the question generators and quiz panel, `js/store.js` handles saves and family sync, and `js/levels.js` defines the campaigns and upgrades, and `js/engine.js` is the canvas runner. `js/crew.js` draws the Big Rig Builders crew (Digby, Dottie, Hank, Mo and Stretch) as picture-book characters with faces and moods, `js/rig.js` has the Big Rig Builders jobs, art, town map and the loading, site and crane mini-games, `js/trucks.js` is its delivery drive, `js/soccer.js` is the soccer game, `js/sky-art.js` draws Sky Quest's anime art and `js/sky.js` has its data and quest game, and `js/sky3d.js` draws the island stages as a 3D floating island (three.js, loaded in the background) with the anime drawings as billboards, falling back to 2D when 3D isn't available, and `js/app.js` has the screens.
- Progress is saved in each browser and synced through Supabase, using `kmg_`-prefixed tables and functions in the IAh project.
- There's no sign-in. A device joins a family by opening the family link (`#join=CODE`) or typing the family code once. The code is never stored in this repo.
- The Supabase key in `js/store.js` is the public publishable key. The `kmg_` tables have row-level security and no policies, so they're only reachable through the `kmg_list_players`, `kmg_save_player` and `kmg_delete_player` functions, and each of those requires a valid family code.
