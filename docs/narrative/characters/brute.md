id: brute
name: Brute
gddId: brute (asset enemy_brute + enemy_brute_damage)
status: draft
version: 1

# Brute

## Role in game
The armored, horned Rustbug. Slow but takes 4 hits; the wall-breaker of the swarm.

GDD facts (00 §5; 12 §2; 21 #9–10):
- Speed 1.8 cells/s, 4 HP, 400 pts.
- Count per stage: `floor((N−1)/5)`, +1 on chapter finals (stages 10, 20, 30); 0 in stages 1–5, 6 at stage 30. Never among the first 3 enemies of a stage. In Siege: `min(w, 5)` per wave.
- Rustbug AI: heads for the Core 50 %, the Burrower 25 %, random 25 %; shoots brick in its way.
- Damage shows as an overlay (`enemy_brute_damage`, 3 stages: hp3/hp2/hp1); the silhouette never changes (D-21-04).
- Can be a flashing Rustbug (slots #4, #11, #18) and drop a power-up on the first hit.

## Goal / motivation
Push straight to the glow and soak up as much heat as possible. Brutes live closest to the deep heat, which is why there are the most of them in the Magma Depths and the Pit.

## Personality
Heavy, slow, unbothered. Shrugs off the first hits. Never speaks words.

## Voice
Sound and behaviour cues only:
- *KRRNNK... KRRNNK* — deep grinding of layered plates with each step.
- *clang... clang... CLANG* — hits ring louder as plates crack and fall off.
- *hhrrmm* — a low engine rumble when it turns its horn toward the Core.

## Appearance (for generation)
Prompt (consistent with 21 #9, art.read.02):
> top-down orthographic game sprite, wide square heavy beetle-shaped scrap-tank with a front ram horn, layered bolted armor plates, rusty shell (#7A4A2E, highlights #B5713F, bolts #5D6B75), short heavy gun, two acid-green glowing eyes (#9BFF2E with #3F9E12 glow), dark outline #0A1118, soft dome light from above, nose pointing up, volumetric hand-rendered 2D look, transparent background, no text; flash frames: gold-white glowing rim (#FFC845/#FFF4D6)

Damage overlay prompt (21 #10):
> transparent overlay of cracks, dents and missing armor plates for the brute silhouette, three stages of increasing damage, sparks in gaps

Do:
- Widest Rustbug, square outline, front ram horn, fills ≈96 % of the cell.
- Layered plates that can visibly crack in the overlay; two acid-green eye dots.
- 4 frames: move_a / move_b / flash_a / flash_b; nose up.

Don't:
- No long gun, no antennae, no narrow body.
- Square but not a clean rectangle with teal: stay rusty and beetle-like so it never reads as the player.
- No faces, mouths, gore or "hurt" expressions; no references to existing games or characters.
