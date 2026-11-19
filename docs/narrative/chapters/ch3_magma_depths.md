---
id: ch3_magma_depths
status: draft
version: 1
---

# Chapter 3 — Magma Depths (stages 21–30)

Sources: GDD 00_MASTER §5, §9; 12 §1–2 (chapter 3, theme `magma`, lava from stage 21); 15 `meta.unlocks`, `meta.rewards.finale`; 20 `ui.screens`. Delivery rules: see `ch1_clay_tunnels.md` (shared).

## Summary

At the bottom of the world the swarm draws its heat from the magma. Six Rustbugs on the field, lava lanes and roots slow the crew down. At stage 30 the crew makes its final stand at the deep breach and seals it; the swarm's fire goes out. Hopeful ending with the door left open: not every tunnel is mapped yet.

## Beats

| stages | beat | crew-log idea | gameplay it matches |
|---|---|---|---|
| — | intro card (S03) | the swarm's heat-source; seal the deep breach | chapter 3 unlocked |
| 21–22 | s21–s22 | lava: impassable, shots fly over; brighter bugs | lava from 21 (12 V7); maxAlive 6, spawn 2.0 s |
| 23–25 | s23–s25 | six at once; roots hide tanks; heat haze | roots tile |
| 26–27 | s26–s27 | five Brutes, keep a Shockwave; warm hull | brute 5 |
| 28–29 | s28–s29 | the roar of the breach; one chamber left | |
| 30 | s30 | the deep breach, final stand | finale: 6 Brutes |
| 30 (first clear) | outro card (S07) | breach sealed, quiet tunnels, more to map | +1 of each booster |
| after 30 | campaign end card (S02) | "the Burrow holds", more tunnels below, the Pit still open | `clear-next` after 30 → S02 |

## Binding to progress

- Intro: first S03 open after `stage_20` is cleared.
- Outro: first clear of `stage_30`, after rewards are collected on S07 (one card per S07 open).
- Campaign end: next S02 open after the first clear of `stage_30` (20: `clear-next` after stage 30 leads to S02). Queued after grant/daily windows. Keys `story.campaign.end.title/body/line`, dialogue `dialogues/campaign_end.json`. This keeps the "max 1 card per screen open" rule on S07.

## Keys

`story.ch3.intro.title/body/line`, `story.ch3.outro.title/body/line`, `story.stage.s21_log` … `story.stage.s30_log`, `story.campaign.end.title/body/line`. Dialogues: `dialogues/ch3_intro.json`, `dialogues/ch3_outro.json`, `dialogues/campaign_end.json`.

## Art notes (chapter cards)

- Intro card: black basalt cavern, molten orange magma rivers, the swarm silhouetted against the glow, a jagged deep breach in the far wall; cold teal rim light on the Burrower.
- Outro card: the breach plugged with steel and cooled dark rock, magma dimmed, the Core glow steady.
- Campaign end card: the Burrower parked by the Core, several unexplored side tunnels branching off in the background (door open for next chapters). No raster text.
