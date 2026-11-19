id: burrower
name: Burrower
gddId: player (asset player_hull + player_turret_l0..l3)
status: draft
version: 1

# Burrower

## Role in game
The player's iron drill-tank and, by extension, its crew. The only speaking side in Iron Burrow (crew-radio lines in `story.*` texts, no voice-over).

GDD facts (00 §5, §6; 21 assets #1–5):
- Speed 3.0 cells/s; 3 lives per stage (+1 per Spare Hull); spawn shield 3 s; spawns at col 4, row 12.
- Bullet 9 cells/s. Gun level 0→3 via the **Gun Up** power-up: L1 fast bullet (13.5 cells/s), L2 two bullets on screen, L3 bullets break steel. Losing a life resets the gun to L0; in Campaign the level carries between stages.
- Its own shots can break the Core, like any bullet.
- Emergency kit (boosters): **Bubble Shield**, **Shockwave**, **Steel Fortress**, **Spare Hull**.

## Goal / motivation
Keep the Burrow Core glowing. The Core is the crew's light, warmth and engine power; if it goes dark, the tunnel is lost. The crew digs deeper layer by layer (Clay Tunnels, Iron Works, Magma Depths) and holds the line in the Pit.

## Personality
A small, stubborn underdog crew. Tough, warm, a little cheeky. Proud of their dented machine, fond of the Core like a campfire. Dry humor about rust, bolts and grit. Never boastful, never grim. Speaks as "we" (no individual named members).

## Voice
Short crew-radio lines, ≤110 characters, first person plural, one `!` max.
- "Core's glowing, treads are greasy. We're ready."
- "Twenty Rustbugs inbound. We've had worse Mondays underground."
- "Brick's just a suggestion. Steel needs the big gun."

## Appearance (for generation)
Prompt (consistent with 21 #1–5 and art.palette):
> top-down orthographic game sprite, stubby armored drill-tank, angular forged iron hull with steel teal panels (#2F7D86, highlights #6FC2C4), two wide treads with chunky links, small amber headlights at the front (#FFC845), rivets (#5D6B75), small round iron turret with a short barrel ending in a drill-bit muzzle, teal hatch, dark outline #0A1118, soft dome light from above, no baked directional shadow, nose pointing up, volumetric hand-rendered 2D look, transparent background, no text

Do:
- Keep the silhouette rectangular and angular; teal panels are the player's signature color.
- Hull is shared by all gun levels; only the turret changes (L3: thick barrel, molten orange muzzle #FFB23F).
- Nose up, pivot at canvas center, ≈88 % of the 128×128 cell (8 px transparent margin).

Don't:
- No eyes, no face, no green on the player (green = enemy).
- No round or beetle-like shapes; no perspective or 3/4 view.
- No crew drawn outside the hatch; no text, logos or references to existing games, vehicles or brands.
