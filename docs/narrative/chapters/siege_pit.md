---
id: siege_pit
status: draft
version: 1
---

# Siege — the Pit

Sources: GDD 00_MASTER §9 (Siege unlocked after stage 5; endless waves on `siege_pit`), 12 §5, 15 `meta.unlocks` (`game.siege.unlock_after_stage` = 5), 20 `ui.screens` (S02, S04, S07). Arena uses the magma theme (D-21-03). "The Pit" is a story name only — UI keeps `Siege`.

## Summary

Under the tunnels lies the Pit, a chamber where the swarm never stops coming. No breach to seal, no end: the only question is how long the crew can hold. Siege has no item rewards; the leaderboard is the trophy.

## Beats

| beat | screen | when | keys | once |
|---|---|---|---|---|
| `siege_unlock` card | S07 Stage Clear | first clear of stage 5, after rewards collected (Siege just unlocked) | `story.siege.unlock.title`, `.body`, `.line` | yes |
| `siege_intro` line | S04 Pre-stage (mode siege) | every open, line under `ui.pre.goal_siege` | `story.siege.intro_line` | no |

The crew log for stage 5 (`story.stage.s05_log`) teases "a new chamber opens below" before the unlock.

## Meta lines (no chapter)

| beat | screen | when | key | once |
|---|---|---|---|---|
| `meta_grant` | S02 Lobby, state `grant` | start grant window, under `ui.lobby.grant_body` | `story.meta.grant_line` | yes |
| `meta_daily` | S12 Daily Supplies | every open while today's reward is claimable | `story.meta.daily_line` | no |
| `meta_first_defeat` | S08 Defeat | first defeat ever (kv `flag.first_defeat_seen` = false) | `story.meta.first_defeat` | yes |

Lines are secondary text inside the existing windows, never extra cards; the first-defeat line never blames the player and sits above the Continue / offer area without pushing it below the fold.

## Art notes

- Siege unlock card: a round pit-like magma arena seen from the rim, dozens of green eye-dots around the edge, the Burrower and Core in the middle. Reuse the `siege_pit` arena art if available.
- No art for meta lines.
