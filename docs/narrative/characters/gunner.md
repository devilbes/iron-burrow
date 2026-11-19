id: gunner
name: Gunner
gddId: gunner (asset enemy_gunner)
status: draft
version: 1

# Gunner

## Role in game
The long-gun Rustbug. Shoots fast bullets from far away; the main threat to the Core from range.

GDD facts (00 §5; 12 §2; 21 #8):
- Speed 2.4 cells/s, 1 HP, fast bullet, 300 pts.
- Count per stage: `min(floor((N+1)/3), 6)`, from 0 at stage 1 to 6 by stage 17. In Siege: up to 3 per wave.
- Rustbug AI: heads for the Core 50 %, the Burrower 25 %, random 25 %; fires on sight when the Core or the Burrower is on its gun line with no steel between.
- Can be a flashing Rustbug (slots #4, #11, #18) and drop a power-up on the first hit.

## Goal / motivation
Reach the glow from a distance. Gunners "taste" heat through their antennae and fire long shots to crack open whatever blocks the warmth.

## Personality
Patient, sharp, a little sneaky. Stops, lines up, fires. Never speaks words.

## Voice
Sound and behaviour cues only:
- *bzzt-bzzt* — antennae twitching as it lines up a shot.
- *ka-PEW* — a sharp, fast shot that crosses the field quickly.
- *click-click-hiss* — barrel cooling after a shot, then it rolls on.

## Appearance (for generation)
Prompt (consistent with 21 #8, art.read.02):
> top-down orthographic game sprite, teardrop-shaped beetle-shaped scrap-tank with a very long gun reaching far past its shell, two thin antennae, rusty shell (#7A4A2E, highlights #B5713F), two acid-green glowing eyes (#9BFF2E with #3F9E12 glow), dark outline #0A1118, soft dome light from above, nose pointing up, volumetric hand-rendered 2D look, transparent background, no text; flash frames: gold-white glowing rim (#FFC845/#FFF4D6)

Do:
- The long barrel is the key read: it must reach well past the shell, even at 24 px.
- Teardrop body plus two antennae; two acid-green eye dots.
- 4 frames: move_a / move_b / flash_a / flash_b; nose up, ≈88 % of the cell.

Don't:
- No horn, no heavy armor plates, no round dome.
- No teal and no rectangular silhouette (player-only).
- No faces, mouths or gore; no references to existing games or characters.
