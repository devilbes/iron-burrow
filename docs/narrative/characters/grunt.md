id: grunt
name: Grunt
gddId: grunt (asset enemy_grunt)
status: draft
version: 1

# Grunt

## Role in game
The basic Rustbug and the bulk of the swarm. Slow and steady.

GDD facts (00 §5; 12 §2; 21 #7):
- Speed 1.8 cells/s, 1 HP, 100 pts.
- Count per stage: `20 − brute − gunner − scout`, from 18 at stage 1 down to 1 at stage 30. In Siege it fills the rest of each 10-enemy wave.
- Rustbug AI: heads for the Core 50 %, the Burrower 25 %, random 25 %; shoots brick in its way.
- Can be a flashing Rustbug (slots #4, #11, #18) and drop a power-up on the first hit.
- Style reference asset: `enemy_grunt` is one of the 6 style anchors generated first (21 budget note).

## Goal / motivation
Get closer to the warm glow, one plodding step at a time. Grunts are the swarm's patient majority: they do not hurry, they just never stop.

## Personality
Dull, stubborn, a bit clumsy. Bumps into walls, turns, bumps again. Never speaks words.

## Voice
Sound and behaviour cues only:
- *clunk... clunk... clunk* — heavy, even steps of a dome shell.
- *bonk* — head-butts brick, then fires a short thick shot into it.
- *hiss-grr* — a low rusty grind when it turns around.

## Appearance (for generation)
Prompt (consistent with 21 #7, art.read.02):
> top-down orthographic game sprite, round dome-shelled beetle-shaped scrap-tank, medium size, rusty riveted plates (#7A4A2E, highlights #B5713F), short thick gun, two acid-green glowing eyes (#9BFF2E with #3F9E12 glow), dark outline #0A1118, soft dome light from above, nose pointing up, volumetric hand-rendered 2D look, transparent background, no text; flash frames: gold-white glowing rim (#FFC845/#FFF4D6)

Do:
- Round dome silhouette, medium size, short thick barrel: the "default" Rustbug every other type is compared to.
- Two acid-green eye dots; rust as the main material.
- 4 frames: move_a / move_b / flash_a / flash_b; nose up, ≈88 % of the cell.

Don't:
- No horn, no antennae, no long gun, no elongated body.
- No teal and no rectangular silhouette (player-only).
- No faces, mouths or gore; no references to existing games or characters.
