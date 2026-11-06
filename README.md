# Power-Up Math

A math game for Zack's kids, nieces and nephews (ages 3 to 12), built for phones and tablets.

Live: https://zackphasework.github.io/kids-math-game/

Each kid picks a theme and has a base. Math earns math points, which buy upgrades for the base: capacity, recharge, strength and a theme special. Each theme has an arcade mini-game, and when its fuel runs out mid-game, a quick math quiz refills it.

- **Trucks: Delivery Rush.** Drive a dump truck over hills and ramps and deliver bricks without tipping over. Bricks build the kid's town.
- **Soccer: Striker Showdown.** A penalty shootout: swipe to shoot, then tap to dive as keeper. Five matches make a cup, which earns a trophy.
- **Hero: Sky Run.** Run, jump and slide through a world, then beat its boss with power blasts. Clearing a world earns a badge.

The math covers seven worlds, from counting to percentages, and each kid's level adjusts as they play.

## How it's built

- Plain HTML, CSS and JavaScript. There's no build step and no libraries, and it's hosted on GitHub Pages.
- `js/core.js` holds shared helpers, UI art and sound. `js/math.js` has the question generators and quiz panel, `js/store.js` handles saves and family sync, and `js/engine.js` is the canvas runner. `js/trucks.js`, `js/soccer.js` and `js/hero.js` are the three games, and `js/app.js` has the screens.
- Progress is saved in each browser and synced through Supabase, using `kmg_`-prefixed tables and functions in the IAh project.
- There's no sign-in. A device joins a family by opening the family link (`#join=CODE`) or typing the family code once. The code is never stored in this repo.
- The Supabase key in `js/store.js` is the public publishable key. The `kmg_` tables have row-level security and no policies, so they're only reachable through the `kmg_list_players`, `kmg_save_player` and `kmg_delete_player` functions, and each of those requires a valid family code.
