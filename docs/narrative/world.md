id: world
name: Iron Burrow
status: draft
version: 1
sources: docs/gdd/00_MASTER.md §1, §5, §6, §15 (Next stage); docs/gdd/21_art_direction.md (art.palette, art.chapters, art.read.*); docs/gdd/12_content_generation.md §1, §3, §5

# World — Iron Burrow

Story mode: **light** (STYLE.md, D-NAR-01). The world is told through chapter cards, short crew-log lines and the art itself. No cutscenes, no voice-over. The only speaking side is the **Burrower** crew. **Rustbugs** never speak words.

## Premise

Far below the surface, past the last mine lamp, lies a network of tunnels dug by a small and stubborn crew. At the bottom of every tunnel network glows a **Burrow Core**: a sphere of warm amber light held in a forged iron cradle. The crew rides the **Burrower**, a stubby iron drill-tank with teal panels, wide treads and two small amber headlights.

From above and from every side, the **Rustbugs** keep coming. They are beetle-shaped scrap tanks, rusty and clicking, with two acid-green eyes. Each stage, twenty of them crawl in through the top of the tunnel map. The Burrower has one job: **Protect the Core!**

Every stage is a maze of brick and steel that both sides reshape while they fight. Shots chew brick away quarter by quarter, so the map at the end of a stage never looks like the map at the start.

## Why the Core matters

The Burrow Core is the warm heart of the tunnels. Its glow lights the dig, warms the crew's base and keeps the Burrower's engine running. If the Core goes dark, the tunnel is lost and the crew must fall back.

In game terms this is literal: the Core sits at the bottom center of the field (col 6, row 12) behind the **Core wall** of 8 brick cells. One hit by any bullet, even the Burrower's own, breaks the Core and the stage is lost. That is why the crew talks about the Core like a campfire they must never let go out.

## Why the Rustbugs come

Rustbugs are cold machines. They hunger for heat and light, and the Core has more of both than anything else underground. They do not hate the crew; they simply want to get to the glow, and they will push through anything in the way to reach it.

This maps to their behaviour: when a Rustbug picks a new direction, it heads for the Core about half the time, for the Burrower a quarter of the time, and wanders the rest (GDD 12 §3). They shoot through brick to open a path. Keep this simple and kid-safe: Rustbugs are pests, not villains. When hit, they break apart into scrap and sparks; nothing sadder than that.

## World rules (1:1 with mechanics)

Every story fact below is a mechanic. If a rule changes in the GDD, this table changes with it.

| world fact | mechanic (GDD 00 §5, §6) |
|---|---|
| Clay brick is soft. Any shot chews it away, one chunk at a time. | `brick`: destroyable by any shot, per quarter (2×2 quarters per cell). |
| Steel plate is tough. Only the Burrower's heaviest gun can crack it. | `steel`: destroyable only by gun level 3, per quarter. |
| Lava is too hot to drive into, but shots fly over it. | `lava`: impassable for tanks, shots pass. |
| Thick roots hide whatever drives under them. | `roots`: tanks pass and are hidden; shots pass. Rustbug eyes still glimmer through. |
| Oil is slick. Treads keep sliding after you stop. | `oil`: tanks slide 0.5 cell after stopping. |
| The Core breaks from a single hit. | Any bullet on the Core = defeat. |
| The crew has 3 hulls ready for each stage. | 3 lives per stage; spawn shield 3 s. |
| The gun gets better as the crew bolts on parts. | **Gun Up** pickup raises gun level 0→3; losing a life resets it to 0. |
| Some Rustbugs carry stolen supplies and flash gold. Hit one and the supplies spill out. | Enemies #4, #11, #18 are **flashing Rustbugs**; first hit drops a **power-up** (Gun Up, Shield, Rebar Wall, Quake, Freeze, +1 Life). Pickups last 12 s. |
| The crew keeps an emergency kit in the cab. | **Boosters** from inventory: **Bubble Shield**, **Shockwave**, **Steel Fortress**, **Spare Hull**. |
| A swarm comes in twenty at a time, from three tunnel mouths at the top. | 20 enemies per stage; spawn points (0,0), (6,0), (12,0); max alive 4/5/6 by chapter. |

Terms are fixed by GLOSSARY.json: a field pickup is always a **power-up**, an inventory item is always a **booster**. Never swap them.

## The three layers and the Pit

The Burrower digs down through three layers. Each layer is one chapter of 10 stages. Tiles look the same in every layer (same shapes), only the material changes (21 art.chapters).

- **Clay Tunnels** (chapter 1, stages 1–10, theme `clay`). Damp clay and old roots in cold slate-blue shadow, a few teal glow-mushrooms. Terracotta brick, riveted grey-blue steel, rare cracks of hidden magma. The first Rustbugs scout these tunnels; the swarm is still thin.
- **Iron Works** (chapter 2, stages 11–20, theme `iron`). An abandoned underground works: pipes, beams, far-off orange lamps, steel grating floors. Sooty dark-red brick, teal plates with hazard-striped edges, troughs of molten metal, machine oil. The swarm is bigger and faster here.
- **Magma Depths** (chapter 3, stages 21–30, theme `magma`). A basalt cave lit orange from below. Basalt blocks with glowing seams, heat-tinted steel, bright flowing lava, charred roots with smoldering tips. The heaviest Rustbugs gather here, closest to the deep heat.
- **The Pit** (Siege arena `siege_pit`, magma theme, D-21-03). A wide magma cavern where the swarm never stops. Siege unlocks after stage 5 and runs in endless waves. "The Pit" is a story name only, used in `story.*` texts; UI says **Siege**.

## Tone

Tough, warm, a little cheeky: dig-crew radio chatter, not a war report. Short active lines, dry mechanical humor about rust, bolts and grit. Arcade-level action words only (destroy, blast, break, smash). Full rules, length limits and banned words: [STYLE.md](STYLE.md). Names: [GLOSSARY.json](GLOSSARY.json).

## Canon vs open

**Canon (fixed for MVP):**
- The Burrower crew, the Burrow Core, the Core wall, the Rustbugs and their four types: Scout, Grunt, Gunner, Brute.
- Rustbugs come for the Core's heat and glow; they never speak.
- The three layers Clay Tunnels, Iron Works, Magma Depths, and the Pit as the Siege arena.
- All world rules in the table above.

**Open for later (not MVP, do not reference in MVP texts):**
- **Scrap** and the **Garage**: in the next stage, broken Rustbugs leave Scrap that the crew uses for hull upgrades, hull skins and bonus chapters (D-00-06). MVP texts never mention Scrap.
- Where the Rustbugs come from, and whether there is something that sends them. Leave this unanswered.
- Individual crew member names and faces. The crew stays a collective "we" on the radio. No new named characters.
- New Rustbug types, new layers below Magma Depths, other Burrow Cores elsewhere.
