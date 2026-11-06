# Power-Up Math

A math game for Zack's kids, nieces and nephews (ages 3 to 12), built for phones and tablets.

Kids solve math problems to charge up power, then spend it in a mini-game for the theme they picked:

- **Trucks:** construction jobs (dig, pour, build, lift the roof) that finish buildings for their town.
- **Soccer:** penalty shootouts against original teams, earning cup trophies.
- **Hero:** an original anime-style hero battles monsters across adventure worlds and earns badges.

The math covers seven worlds, from counting to percentages, and each kid's level adjusts as they play.

## How it's built

- `index.html` is the whole game: no build step, no libraries. It's hosted on GitHub Pages.
- Progress is saved in each browser and synced through Supabase, using `kmg_`-prefixed tables and functions in the IAh project.
- There's no sign-in. A device joins a family by opening the family link (`#join=CODE`) or typing the family code once. The code is never stored in this repo.
- The Supabase key in `index.html` is the public publishable key. The `kmg_` tables have row-level security and no policies, so they're only reachable through the `kmg_list_players`, `kmg_save_player` and `kmg_delete_player` functions, and each of those requires a valid family code.
