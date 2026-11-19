# Iron Burrow — 00_MASTER (MVP GDD, single source of truth)

Spec language: Russian (ТЗ), game base language: **en** (`defaultLocale: en`, languages: `[en]`; other locales — only the localization step).
Flow frame: game-generation-lite — web only, **no ads at all**, monetisation = real-money IAP only, everything through ManyPlay SDK 1.0.0-rc.30 + UI Kit, "Решай сам" (no owner questions; decisions in `DECISIONS.md`).
Forbidden words: the list from the launch variables of the flow (field «Запретные слова»: the name of the reference game, its publisher and the console brands). They are never reproduced in docs, UI, art, store texts or code strings. No foreign IP, no Playrix.

## 1. Hook and pitch

**Iron Burrow** — a top-down arcade tank game deep underground. You drive the **Burrower**, a stubby iron drill-tank, through mazes of clay brick and steel plate, defending the glowing **Burrow Core** at the bottom of the map from waves of invading **Rustbugs** — beetle-shaped scrap tanks. Shots chew through brick quarter by quarter, so every stage is a destructible maze you reshape while fighting. Flashing Rustbugs drop power-ups; your own **boosters** (Bubble Shield, Shockwave, Steel Fortress, Spare Hull) are the emergency tools.

Hook in one line: *"Classic maze tank defence, 2-minute stages, destructible everything, one Core to protect."*

## 2. Genre, render, platform

| Fact | Value |
|---|---|
| genre | arcade (maze shooter / base defence) |
| render | 2d (Canvas 2D field + UI Kit HTML UI over it) |
| target | web (owner did not restrict) |
| orientations | portrait 390×844, landscape 844×390, desktop 1440×900 — all equal; `orientation_fixed = false` |
| why all three | the field is **square 13×13 cells**; it fits portrait (field on top, controls below) and landscape/desktop (field centered, HUD and controls on the sides) without being a tiny frame |
| input | desktop: arrows / WASD move, Space / J fire, 1–3 boosters, Esc pause; touch: virtual stick (left/bottom) + FIRE button (right/bottom) + booster buttons |
| online | true (platform online game; all services via SDK) |
| audio | true (music + SFX) |

## 3. Audience and session

Casual-to-midcore web players 16–45 who remember or enjoy simple arcade shooters; desktop browser and mobile browser. Session 6–15 min = 3–6 stages. A stage lasts **90–180 s**.

## 4. Core loop

`Lobby → Stage Map → Pre-stage (pick Spare Hull) → Stage (destroy 20 Rustbugs, protect Core) → Stage Clear (stars, score, booster reward) → next stage`.
Fail: Core destroyed or lives = 0 → Defeat window → continue with 1 Spare Hull (if have) / buy pack / retry.

Meta loop: 30 campaign stages in 3 chapters (stars, unlocks) · Siege endless mode (unlocked after stage 5) with leaderboard · 7-day daily rewards · shop of booster packs for real money.

## 5. Field and rules (frozen numbers; section 10 owns details)

- Field 13×13 **cells**; each cell is 2×2 **quarters** (destruction granularity). Logic units: 1 cell = 1.0; render cell size = floor(fieldPx/13).
- Tiles: `brick` (destroyable by any shot, per quarter), `steel` (destroyable only by gun level 3, per quarter), `lava` (impassable for tanks, shots fly over), `roots` (tanks pass, hides tanks drawn under it, shots pass), `oil` (tanks slide 0.5 cell after stopping), `empty`.
- **Burrow Core**: 1 cell at bottom center (col 6, row 12), protected by the "Core wall" = the 3×3 block cols 5–7, rows 10–12 minus the Core itself = 8 brick cells (D-10-09; the Core sits on the bottom edge, so the wall is double-thick above it). One hit by any bullet (enemy or player) destroys the Core → defeat.
- Player spawns at (col 4, row 12); enemies spawn at top: (0,0), (6,0), (12,0) in rotation.
- Player: 3.0 cells/s, 3 lives per stage (+1 per Spare Hull), spawn shield 3 s. Bullet 9 cells/s.
- Gun level 0→3 by **Star** pickup: L1 fast bullet (13.5 cells/s), L2 two bullets on screen, L3 bullets break steel. Dying resets to L0. Level persists between stages if not killed (campaign only).
- Enemies (Rustbugs): `scout` 3.6 c/s, 1 HP, 200 pts · `grunt` 1.8 c/s, 1 HP, 100 pts · `gunner` 2.4 c/s, 1 HP, fast bullet, 300 pts · `brute` 1.8 c/s, 4 HP, 400 pts.
- Stage = 20 enemies total; max alive on field: stages 1–10: 4, 11–20: 5, 21–30: 6. Spawn interval: 3.0 s (ch.1), 2.5 s (ch.2), 2.0 s (ch.3).
- Flashing carriers: enemies #4, #11, #18 of each stage drop a power-up when hit (first hit).
- Power-ups (on-field, last 12 s, 500 pts on pickup): `star` (gun +1), `bubble` (invulnerable 10 s), `rebar` (Core wall → steel 15 s), `quake` (destroy all enemies on field, no score for them), `freeze` (enemies stop 8 s), `hull` (+1 life). Drop weights: star 30, bubble 15, rebar 15, quake 10, freeze 20, hull 10.
- Win: all 20 enemies destroyed → Stage Clear. Lose: Core destroyed, or lives = 0.
- Stars: ★ clear; ★★ clear having lost ≤ 1 life; ★★★ clear having lost 0 lives. (Spare Hull use does not count as a lost life; dying does.)

## 6. Consumable boosters (inventory items — what rewards and the shop give)

| item id (game key) | name (en) | effect | use |
|---|---|---|---|
| `bst_bubble` | Bubble Shield | player invulnerable 10 s | in stage, HUD button, max 2 per stage |
| `bst_shockwave` | Shockwave | destroys all enemies on field (they count as killed, score granted) | in stage, HUD button, max 1 per stage |
| `bst_fortify` | Steel Fortress | Core wall becomes steel for 20 s (rebuilds destroyed quarters) | in stage, HUD button, max 1 per stage |
| `bst_hull` | Spare Hull | +1 life | pre-stage toggle (max 1) **or** continue on Defeat (max 1 continue per stage; restores 2 lives and rebuilds Core if destroyed) |

Platform item ids/SKUs are created by services-publish; the game reads them from configs, never hardcodes.

**Start grant (new player)**: separate reward, no hard currency: 2 × each booster.

## 7. Economy decision (обязательное правило экономики)

- MVP has **no currency at all** (no soft, no hard). Rewards = boosters (consumables), stars, leaderboard rank.
- **Next stage (not in MVP):** soft currency **Scrap** with persistent sinks: Garage (hull upgrades: armor plate, engine, turret — 3 tiers each), cosmetic hull skins collection, unlocking bonus chapters. Not implemented now because the platform cannot yet publish exchange rules currency→items and a starting balance. Described in section 15 as next stage.
- Inventory, daily rewards and shop stay because the game has consumables to give: daily rewards and level rewards give boosters; shop sells booster packs for real money; the game itself consumes boosters.

## 8. Rewards (numbers; section 15 owns)

- First clear of stage N: 1 booster, type rotates `bubble → shockwave → fortify → hull` by `(N-1) mod 4`.
- First time ★★★ on a stage: +1 `bst_bubble`.
- Chapter finale (stage 10, 20, 30) first clear: additional 1 of each booster.
- Replays give score only.
- Daily rewards (7-day cycle, resets after day 7; missing a day continues the cycle — platform calendar semantics): D1 bubble×1 · D2 shockwave×1 · D3 fortify×1 · D4 hull×1 · D5 bubble×2 · D6 shockwave×1 + fortify×1 · D7 hull×2 + bubble×2 + shockwave×1.
- Siege: no item rewards; leaderboard only.

## 9. Modes

1. **Campaign** — 30 stages, chapters: 1 *Clay Tunnels* (1–10), 2 *Iron Works* (11–20), 3 *Magma Depths* (21–30). Stage N+1 unlocks on clear of N. Chapter 2 needs stage 10 cleared (no star gates).
2. **Siege** (unlocked after stage 5 cleared) — endless waves on fixed arena map `siege_pit`; wave = 10 enemies, max alive 4 + floor(wave/3) capped 8; brutes share = min(0.1·wave, 0.5); 3 lives; boosters allowed (same per-run limits ×2); continue with Spare Hull once. Score → leaderboard.

## 10. Score

Enemy kill points (above) + power-up pickup 500 + stage clear bonus 1000 + 500 per remaining life + Core intact bonus is implicit (Core loss = defeat). Siege: kill points × (1 + 0.1·(wave−1)), wave clear bonus 300·wave.

## 11. Leaderboards

- `siege_best` — best Siege score, weekly period (resets Monday 00:00 UTC), plus all-time view if platform preset supports it.
- `campaign_score` — sum of best scores of all campaign stages (all-time).
Ids on the platform are created by services-publish; game reads them from configs.

## 12. Monetisation (IAP only, USD start prices; section 16 owns)

| pack | content | price |
|---|---|---|
| Starter Crate (one-time, shown after first defeat or stage 3 clear) | 3 of each booster (12) | 0.99 |
| Hull Pack | 5 × Spare Hull | 1.99 |
| Field Kit | 6 of each (24) | 4.99 |
| Heavy Arsenal | 15 of each (60) | 9.99 |
| Commander Cache | 35 of each (140) | 19.99 |

Placements: Shop window; Defeat window (Hull Pack, Starter Crate if not bought); Pre-stage window when `bst_hull` = 0 (link to shop). No ads anywhere. Until the owner connects payment, purchases are test purchases.

## 13. Screens (section 20 owns)

S01 Boot/Loading (SDK loader) · S02 Lobby · S03 Stage Map · S04 Pre-stage popup · S05 Gameplay + HUD · S06 Pause popup · S07 Stage Clear · S08 Defeat (+ continue) · S09 Siege Result · S10 Shop · S11 Purchase result · S12 Daily Rewards · S13 Leaderboards · S14 Settings (+ ManyPlay ID / profile from UI Kit) · S15 Tutorial overlay (stage 1) · S16 Booster info popup.

## 14. Platform services (source: `sdk.modules.list` rc.30; final decisions — `docs/gdd/services-matrix.md`, written by the "Сервисы платформы" step)

ui-kit (required) · inventory (boosters) · progress (levels as level-set, verified level end, level rewards, stars/best) · daily-rewards (7-day calendar) · iap (packs, offers) · leaderboards (2 boards) · profile-pack (kv settings, tutorial flags, gamestate, profile UI) · hud (feature icons with badges: daily, shop, leaderboards) · configs (core: tunables `game.*`, iap offers). Not used: ads (flow frame forbids ads), realtime (no live multiplayer in the game; nothing to push in MVP), scheduling (beta; weekly reset is done by the leaderboard period itself) — final word in services-matrix.

## 15. Facts for plan (copied into BUILD_BRIEF_MVP.md)

render 2d · genre arcade · monetization iap · online true · audio true · localisation en · liveops false · remote_configs true (`game.balance`, `game.enemies`, `game.powerups`, `game.boosters`, `game.siege`, `game.rewards`, `iap.*`) · leaderboards true · orientation_fixed false · target web · orientations [portrait 390x844, landscape 844x390, desktop 1440x900].

## 16. Art direction (one line; section 21 owns)

Cold underground slate-blue and teal steel + molten orange magma glow + acid-green Rustbug eyes: a high-contrast cold/hot palette for arcade readability at speed, deliberately not the warm wood/paper casual look. Chunky volumetric metal UI frames with rivets.

## 17. Section index

| # | file | status |
|---|---|---|
| 10 | 10_core_rules.md | MVP |
| 11 | 11_scoring_and_formulas.md | MVP |
| 12 | 12_content_generation.md | MVP (stage data format, enemy mix, AI) |
| 13 | 13_difficulty_and_balance.md | MVP |
| 14 | 14_tutorial_onboarding.md | MVP |
| 15 | 15_economy_meta.md | MVP |
| 16 | 16_monetization_ads.md | MVP (IAP only, no ads) |
| 20 | 20_ui_ux_screens_texts.md | MVP |
| 21 | 21_art_direction.md | MVP (asset table) |
| 22 | 22_vfx_animation_feel.md | MVP |
| 23 | 23_audio_voice_haptics.md | MVP |
| 30 | 30_tech_architecture.md | MVP |
| 31 | 31_platform_integration.md | MVP |
| 32 | 32_analytics.md | MVP (compact) |
| 33 | 33_post_release_liveops.md | вне MVP (one line) |
| 40 | 40_qa_acceptance.md | MVP |
