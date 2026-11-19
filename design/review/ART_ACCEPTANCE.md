# Iron Burrow — art acceptance (one pass)

Date: 2026-11-19. Inputs: design-screens (`design/mockups/**`, `assets/ui/screens/**`), design-icons (`design/icons/**`, `assets/ui/{icons,items,offers}`, `assets/ui/game-icons*`), assets (`assets/game/**`). Rules: `design/system/UI_ART_BIBLE.md`, `design/system/palette.json`, `docs/skin/map.json`, GDD 21 `art.assets`, BUILD_BRIEF orientations `[portrait 390x844, landscape 844x390, desktop 1440x900]`.

All images were viewed as images: `design/mockups/CONTACT_SHEET.png` + `GRAYSCALE.png` (15 views), all 15 renders in `design/mockups/contact/`, `design/icons/CONTACT_SHEET.png`, `docs/skin/shots/base/shop-*.png` (the only shop render), and the contact sheets this step built:

| file | what |
|---|---|
| `GAME_ASSETS_CONTACT.webp` | all 87 files in `assets/game` at 1x on slate_blue, labelled |
| `GAME_ASSETS_GRAY.webp` | the same sheet in grayscale |
| `DEFECTS_STYLE_CLONE.webp` | core, player_hull, tile_clay_floor, star_big / tut_hand, bullet_player, tile_magma_brick at 2x |
| `DEFECTS_ENEMIES_FX.webp` | 4 enemies, fx_explosion_big, fx_spawn, node_stage, tile_clay_lava at 2x |
| `SCENES.webp` | scene, scene-map, scene-game |

No images were generated in this step (it is a review step; no Codex generation needed, so the asset-source rule does not apply).

## Verdict: FAIL, sent back for rework

The art is **not accepted**. Icons and the lobby scene pass. The game sprite set, two of the three scenes and all screen mockups fail the bible and the F2P quality bar. The shop has no art-ready render in any orientation.

## 1. Completeness (GDD 21 table vs `assets/game/*.png`): FAIL

92 ids in the GDD table, 87 files. **Missing ids:** `bg_lobby_portrait`, `bg_lobby_landscape`, `bg_map_clay_portrait`, `bg_map_clay_landscape`, `bg_map_iron_portrait`, `bg_map_iron_landscape`, `bg_map_magma_portrait`, `bg_map_magma_landscape`, `icon_settings`. Files that are not in the table: `scene`, `scene-map`, `scene-game`, `icon_gun`.
The swap comes from D-GC-13 (`docs/game/CONTRACT.md`), but GDD 21 was never updated. Two ways to close this: draw the ids, or amend GDD 21 `art.assets` to the 87-id set. If the GDD is amended, the three chapter map themes (clay/iron/magma) collapse into one `scene-map`. Then chapters lose their own look (GDD `art.chapters`), so that also needs a decision.

## 2. Skin map parts (`docs/skin/map.json`)

The map assigns raster only to: scene backgrounds `scene` and `scene-game`, the icon sheet, ITEMS (4 boosters) and OFFERS (5 packs). Every other part is recolor or a code sheet. That is allowed, and no extra depth is required.

| part | verdict | finding |
|---|---|---|
| scene (lobby/menu) | PASS | Strong painterly cave with steel scaffolds and a magma glow; the empty centre fits the logo and buttons; on palette. |
| scene-game | **FAIL** | The STYLE_REF teal plate with an orange crystal inset sits large in the bottom-right corner, inside the area that should be calm behind the field. It is a second focal point and breaks the bible's "Light and depth: field and background stay grounded". |
| icon sheet `game-icons` (29) | PASS with remarks | Unified front-on forged objects, upper-left light, readable at 24px. Remarks: `coins`, `gift` and `shop` are three near-identical chests (bible Icons: silhouette must differ); `medal-2` reads as a blank plate, not 2nd place. |
| ITEMS bst_* | PASS | Distinct, readable, on palette. |
| OFFERS (5) | PASS with a remark | The art is good. Map paths (`offers/starter_crate.webp`, `items/bst_bubble.webp`, `scene.webp` in skin) do not match the files (`assets/ui/offers/offer-starter_crate*`, `assets/game/scene*`). The integration step must reconcile these paths. |
| recolor parts (window, nameplate, buttons, close…) | not evaluable as art | The only render is the base shots, made before the assets. See the Shop section. |

## 3. Game sprite set (`assets/game`): FAIL, the main defect

The contact sheet shows one template copied across about 35 ids: the STYLE_REF plate (teal armour plate plus an orange hex crystal inset) pasted in place of the object. These ids do not depict what the GDD asks for:
- **Not the object at all:** `core` (should be a glowing amber Core, not a plate), `player_hull` (no tank hull, just plates between treads), `bullet_player`, `bullet_enemy`, `star_big`, `star_small` (plate with a tiny star), `tut_hand` (plate with a glove stuck on), `tile_clay_floor`, `tile_iron_floor`, `tile_magma_floor`, `tile_magma_brick`, `tile_clay_lava`, `tile_iron_lava`, `tile_magma_lava`, `tile_clay_oil`, `tile_magma_steel`, `tile_iron_steel`, `tile_clay_brick` (plate inside an orange frame), `enemy_brute_damage`, `fx_hit_spark`, `fx_frost`, `fx_explosion_small`, `fx_explosion_big` and `fx_spawn` (the plate is visible inside every frame), `node_stage`, `node_finale`, `pack_hull`, `pack_starter`, `scene-map` (a giant plate in the middle of the map scene).
- **Bible Palette, "enemies never use friendly teal; Enemy only #3F9E12/#9BFF2E":** `enemy_scout`, `enemy_grunt`, `enemy_gunner`, `enemy_brute` all have teal bodies with the orange crystal plate. Their silhouettes and value merge with the player and the Core, which breaks Pillars ("silhouette and value stay readable during fast arcade play").
- **Bible Palette, "Main action orange = one focal action":** the orange crystal is on almost every sprite, so the Core stops being the single warm heart. Previewed small, the whole field is one orange-teal speckle with no single accent.
- **Grayscale (`GAME_ASSETS_GRAY.webp`):** tiles, enemies, Core and bullets share the same mid-grey plate value. Wall / floor / enemy / player cannot be told apart, so the hierarchy fails.
- **Good examples to keep:** player turrets L0–L3, pu_* hex tokens, ctrl_fire / ctrl_stick_*, daily_crate, pack_commander_cache / field_kit / heavy_arsenal, tile_iron_brick, tile_*_roots, fx_bubble, fx_shockwave, logo_iron_burrow, medal_top3, node_lock, icon_* (except icon_back/icon_pause, which are plates with a symbol).

The earlier asset round noted this too (`assets/source/game/review/round1.json`, "visualAcceptance: FAIL: prior semantic defects remain"). It is still open.

## 4. Screen mockups (`design/mockups`, 5 screens × 3 orientations): FAIL

The renders look like a flat prototype: a slate void, plain text and rectangular buttons. None of the bible's shape and depth vocabulary is used. Per screen:

**Lobby (S02).** 1440: the right half is an empty #0A1118 void with a text column. The hero art is a cropped tank card with a hard fade, and `scene` is not used as the background. "Iron Burrow" appears twice: as text top-left and as the big title, while `logo_iron_burrow` is not used. The feature buttons Daily/Shop/Ranks/Settings are text pills with no `icon_daily`/`icon_shop`/`icon_leaderboard` and no badge (GDD 21 S02). Bible Shape: no forged plate or nameplate anywhere, and the corner cuts are barely visible. Preview test: the orange PLAY is the one accent, which passes. Grayscale test: PLAY and SIEGE become the same light-grey bar, so primary vs secondary is lost. Removable element: the top-left duplicate title. 844 and 390: same problems, and at 390 the four text buttons crowd the top.

**Stage Map (S03).** The background is a cave illustration with no chapter identity. Nodes are flat teal squares with numbers, while the drawn `node_stage`, `node_lock`, `star_small` and `node_finale` are not used. The path is a plain dotted line, not the GDD "glowing vein". At 390 the grid of tiny squares is unreadable, with 7–8px captions such as "Locked". Grayscale: locked and open nodes are the same grey.

**Gameplay (S05).** A static composite illustration stands in for the field (D-MOCK-04), so the real sprites (section 3) are never shown on a field. Portrait: the field takes the top half and the bottom half holds text buttons "Up/Left/Down/Right" instead of the drawn `ctrl_stick_base/knob`. Boosters are text "Shield · 2" instead of `icon_bst_*`. The lower ~15% of the screen is empty. Flow rule: "in a supported orientation the field fills the screen and controls lie on top", and here they do not. There is no `ui_field_frame` (GDD art.ui.06) and the HUD is bare text with no plate. Landscape and desktop: the field is a small square in the middle, with text columns on both sides. Grayscale: FIRE and the boosters are the same grey, so the hierarchy fails.

**Stage Clear (victory).** There is no window: no forged frame, no nameplate and no modal shadow (map identity id-forged-frame / id-nameplate, bible Light "modal 0/12/24"). The reward is a square illustration of the Bubble Shield on its own background with "×2" in the corner, instead of the transparent `bst_bubble` item art. The flow rule wants the reward large, as the main object of the window, and here it is a card beside the score list. The stars are small vector stars rather than `star_big`. Preview: the orange "Next Stage" is the single accent, which passes. At 844 the buttons are glued to the bottom edge with no 24px air (bible Air).

**Defeat.** Same structure: illustration card plus text, three wide buttons, no window.

## 5. Orientations

| orientation | Menu | Gameplay | Victory | Shop | ready? |
|---|---|---|---|---|---|
| portrait 390x844 | FAIL (flat, text buttons) | FAIL (field half-screen, text d-pad, sprites §3) | FAIL (no window, reward small) | FAIL | **orientation portrait is not ready** |
| landscape 844x390 | FAIL | FAIL (field a small box with side columns) | FAIL (no air at bottom) | FAIL | **orientation landscape is not ready** |
| desktop 1440x900 | FAIL (half-screen void) | FAIL | FAIL | FAIL | **orientation desktop is not ready** |

**Shop.** No mockup was made (D-MOCK-01 excluded service windows), so the only render is `docs/skin/shots/base/shop-*`. It shows stock "SOFT CURRENCY" coins 100/550/1,200, which breaks bible Palette "No currency in v1 … never invented coins". The five OFFERS images are not used. The window is roughly 60% empty. This fails in all three orientations.

## 6. Bible check by section

| bible section | verdict | where it breaks |
|---|---|---|
| Palette and material | FAIL | Teal enemies (all 4); orange is on nearly every sprite; stock coins in the shop |
| Shape (45° cut, rivets at corners) | FAIL on screens | Mockups use near-rectangular buttons; no plates or frames on lobby, map, results |
| Light and depth | FAIL | Screens have no modal or floating levels; scene-game has a lit plate in the corner |
| Typography | PASS | Russo One titles, Exo 2 body; but captions at 390 fall below the 12px scale step |
| Icons | PASS with remarks | coins/gift/shop silhouettes are alike; medal-2 is unclear |
| Air, groups and states | FAIL | Desktop lobby void; landscape results buttons with no bottom air; one orange primary holds |
| "Reward art leads its window" | FAIL | Victory reward is a card, not the lead object |

The bible has no explicit "don't" section. Its own prohibitions were used instead: no coins, enemies never teal, no paper or wood, no emoji, no pure black. Of these, "no coins" (shop) and "enemies never teal" fail.

## 7. What passes (keep)

The lobby `scene`, the 29-icon sheet, ITEMS, OFFERS, the player turrets, pu_* tokens, controls, logo and roots tiles. These set the right level and are the reference for redoing the rest.

## 8. Return list (concrete)

1. **assets:** redraw about 35 ids listed in §3 as their real objects, without the STYLE_REF plate: enemies in rust and enemy green, the Core as an amber heart, floors calm and low-contrast, lava/oil/brick/steel by material. Also redraw `scene-map` and `scene-game` with no plate. Either draw the 9 missing ids or get GDD 21 amended (§1).
2. **design-screens:** rebuild the mockups for lobby, stage map, gameplay, stage clear, defeat **and shop** in 3 orientations. Use `scene` as the full-bleed background, the logo, icon buttons with badges, forged window frame and nameplate on results and shop, `node_*` and `star_*` on the map, sticks and booster icons over a full-screen field, the large transparent reward item, and OFFERS in the shop with no coins.
3. **design-icons (minor):** make the coins/gift/shop silhouettes different; give medal-2 a readable "2 / silver" form.
