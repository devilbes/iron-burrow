---
id: ch1_clay_tunnels
status: draft
version: 1
---

# Chapter 1 — Clay Tunnels (stages 1–10)

Sources: GDD 00_MASTER §1, §4, §5, §9; 12 §1–2 (chapter 1, theme `clay`); 15 `meta.unlocks`, `meta.rewards.finale`; 20 `ui.screens`. Story mode: light (D-NAR-01) — text only, no cutscenes, no voice.

## Summary

The Rustbugs break into the clay tunnels for the first time and go straight for the Burrow Core. The Burrower crew learns the basics on the job: dig lanes through brick, keep the Core wall whole, read the swarm. By stage 10 the crew finds and closes the clay breach; scrap tracks lead down to the old Iron Works.

## Delivery rules (shared by all chapters)

| delivery | screen | when | keys | once |
|---|---|---|---|---|
| chapter intro card | S03 Stage Map | first S03 open on which the chapter is unlocked | `story.chN.intro.title/body/line` | yes |
| chapter outro card | S07 Stage Clear | first clear of the chapter finale (10/20/30), after `clear-collect` | `story.chN.outro.title/body/line` | yes |
| crew-log line | S04 Pre-stage | every open of the stage, one line under `ui.pre.goal` | `story.stage.sNN_log` | no |

- All cards are text only (UI Kit card in the game skin through the UI Kit window queue), skippable by the card's close/OK button or tap outside; skipping counts as seen.
- **Max 1 story card per screen open.** If two cards qualify on the same open, the earlier beat in `beats.json` wins and the other waits for the next open of its screen.
- A card never covers a system window: it is queued after grant (S02), daily (S12), rewards (S07 `collected`) and the Starter Crate redirect.
- Seen state of `once: true` beats: proposed profile-pack kv key `story.seen` (array of beat ids). It is **not yet in 15 `meta.save`**, so it must be added there by the GDD owner / meta-bridge. Until then a beat may be shown again after a reinstall; this is acceptable.
- Crew-log lines are not cards; they are a muted secondary line on S04 and never block Start.

## Beats

| stages | beat | crew-log idea | gameplay it matches (12 §2, §5) |
|---|---|---|---|
| — | intro card (S03) | the swarm breaks in, "dig in, hold the line" | first visit to the map |
| 1 | s01 | first Rustbugs, protect the Core wall | only Scouts and Grunts; tutorial S15 |
| 2–3 | s02–s03 | first Gunner; brick breaks by quarters | gunner(2) = 1 |
| 4–5 | s04–s05 | flashing Rustbugs drop power-ups; "a new chamber opens below" teases Siege | carriers #4/#11/#18; Siege unlocks after 5 |
| 5 (clear) | Siege unlock card (S07), see `siege_pit.md` | | |
| 6–7 | s06–s07 | first Brute (4 hits); the swarm is pushed from below | brute(6) = 1 |
| 8–9 | s08–s09 | steel plates, Gun Up level 3 breaks steel; four at a time | maxAlive 4 |
| 10 | s10 | the clay breach | finale: 2 Brutes, +1 of each booster |
| 10 (first clear) | outro card (S07) | breach sealed, tracks lead to the Iron Works | chapter 2 unlocks (15 `meta.unlocks`) |

## Binding to progress

- Chapter 1 is open from the start; intro card on the very first S03 open (before stage 1; S15 tutorial is on S05, no conflict).
- Outro: first clear of `stage_10` (progress level-set `campaign`). S07 already shows `ui.clear.chapter_done`; the story card follows after rewards are collected.
- After stage 10 the S07 `clear-next` goes to S04 stage 11, so the chapter 2 intro shows on the next S03 visit (the crew log s11 carries the story meanwhile).

## Keys

`story.ch1.intro.title`, `story.ch1.intro.body`, `story.ch1.intro.line`, `story.ch1.outro.title`, `story.ch1.outro.body`, `story.ch1.outro.line`, `story.stage.s01_log` … `story.stage.s10_log`. Dialogues: `dialogues/ch1_intro.json`, `dialogues/ch1_outro.json`.

## Art notes (chapter cards)

- Intro card: header strip with a clay-tunnel vignette — warm brown-orange clay brick walls under cold slate-blue light, the Burrower nose-on with headlights, acid-green Rustbug eyes in the dark ahead. No text in the raster (21 art: only the logo may be raster text).
- Outro card: same tunnel, collapsed brick plugging a hole, the Core glow behind the Burrower; scrap tracks running downward to hint at the Iron Works.
- Reuse the chapter-1 map art / tile set where possible; no new screens, the card is a UI Kit modal in the game skin.
