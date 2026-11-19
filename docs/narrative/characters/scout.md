id: scout
name: Scout
gddId: scout (asset enemy_scout)
status: draft
version: 1

# Scout

## Role in game
The fastest Rustbug. Fragile, nimble, and first to reach the Core wall.

GDD facts (00 §5; 12 §2; 21 #6):
- Speed 3.6 cells/s (faster than the Burrower's 3.0), 1 HP, 200 pts.
- Count per stage: `min(2 + floor(N/4), 7)`, from 2 at stage 1 to 7 by stage 20. In Siege: 1–2 per wave.
- Shares the Rustbug AI: on each decision it heads for the Core 50 %, the Burrower 25 %, random 25 %; shoots brick to open a path.
- Can be a flashing Rustbug (slots #4, #11, #18) and drop a power-up on the first hit.

## Goal / motivation
Find the shortest way to the Core's glow before anyone else. Scouts chase warmth by instinct: the faster they get there, the more heat they soak up.

## Personality
Twitchy, curious, impatient. Darts, stops, darts again. Never speaks words.

## Voice
Sound and behaviour cues only (sound step owns the actual SFX):
- *tik-tik-tik-skrrt* — quick leg-treads skittering on stone.
- *zip* — a thin, short shot, then an instant direction change.
- *chirr?* — a high metal chirp when it stops at a junction, antenna-less head turning.

## Appearance (for generation)
Prompt (consistent with 21 #6, art.read.02):
> top-down orthographic game sprite, narrow elongated beetle-shaped scrap-tank, thin long leg-treads, small rusty shell (#7A4A2E, highlights #B5713F), short thin gun, two acid-green glowing eyes (#9BFF2E with #3F9E12 glow), dark outline #0A1118, soft dome light from above, nose pointing up, volumetric hand-rendered 2D look, transparent background, no text; flash frames: gold-white glowing rim (#FFC845/#FFF4D6) and glowing shell seams

Do:
- Narrowest Rustbug silhouette: long and thin, legs reaching out, small body.
- Always exactly two acid-green eye dots.
- 4 frames: move_a / move_b / flash_a / flash_b; nose up, ≈88 % of the cell.

Don't:
- No antennae (antennae belong to the Gunner), no long gun, no horn.
- No teal, no rectangular hull shapes (player-only).
- No mouth, teeth, faces or cute-creature features; no real-insect gore; no references to existing games or characters.
