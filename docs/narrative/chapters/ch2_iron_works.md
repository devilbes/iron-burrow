---
id: ch2_iron_works
status: draft
version: 1
---

# Chapter 2 — Iron Works (stages 11–20)

Sources: GDD 00_MASTER §5, §9; 12 §1–2 (chapter 2, theme `iron`, oil from stage 13); 15 `meta.unlocks`, `meta.rewards.finale`; 20 `ui.screens`. Delivery rules: see `ch1_clay_tunnels.md` (shared).

## Summary

The scrap tracks lead to the old Iron Works, where the Rustbugs rebuild themselves from scrap. Gunners and Brutes show up more often, five Rustbugs share the field and waves come faster. The crew breaks the main assembly line at stage 20, so the swarm can no longer rebuild up here — but the heat keeps rising from below.

## Beats

| stages | beat | crew-log idea | gameplay it matches |
|---|---|---|---|
| — | intro card (S03) | the Iron Works, Rustbugs rebuild from scrap; more Gunners and Brutes | chapter 2 unlocked |
| 11–12 | s11–s12 | warm furnaces, patched bugs; five at once, keep moving | maxAlive 5, spawn 2.5 s, gunner 4 |
| 13–14 | s13–s14 | oil floor, brake early; Gunners on walkways | oil appears from stage 13 (12 V7); gunner 5 |
| 15–16 | s15–s16 | they build Brutes now; steel halls, maxed gun | brute 2→3; steel ≤ 12 % |
| 17–18 | s17–s18 | scrap piles shrinking; shield up vs Brutes | gunner 6 |
| 19–20 | s19–s20 | heat from below; the main assembly line | finale: 4 Brutes |
| 20 (first clear) | outro card (S07) | works shut down, drill on to the Magma Depths | chapter 3 unlocks |

## Binding to progress

- Intro: first S03 open after `stage_10` is cleared (chapter 2 unlocked, no star gates).
- Outro: first clear of `stage_20`, after rewards are collected on S07.

## Keys

`story.ch2.intro.title/body/line`, `story.ch2.outro.title/body/line`, `story.stage.s11_log` … `story.stage.s20_log`. Dialogues: `dialogues/ch2_intro.json`, `dialogues/ch2_outro.json`.

## Art notes (chapter cards)

- Intro card: cavern-sized foundry in teal steel and rivets, cold blue light; a conveyor line with half-built Rustbug shells, sparks in molten orange, green eyes lighting up on the line. The Burrower small in the foreground.
- Outro card: the same line broken and dark, scrap heaps, a faint orange glow coming up through floor grates (hint of the Magma Depths).
- Note: no grim imagery; arcade machines only, no creature gore.
