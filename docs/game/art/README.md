# Iron Burrow: rebuilt game sprites (LOOK Н-01, Н-02, Н-60, Н-61, Н-62, Н-50, Н-72, Н-80)

No image generation was used. Every file is a crop, cut-out, scale, recolour or composition of existing art, or simple procedural PIL drawing in palette colours (`design/system/palette.json`).

- Rebuild: `python3 docs/game/art/build_sprites.py [tiles|units|fx|ui|scenes|offers]`, then `npm run assets` to make the 1x files.
- Previews: `python3 docs/game/art/preview.py [clay|iron|magma]` writes `CONTACT.png`, `FIELD_PREVIEW*.png` and `*_GRAY.png`. The preview draws the field the way `src/screens/field-draw.ts` does: floor checker, brick and steel by quarters, core with its wall, rotated units.

Main source is `assets/ui/screens/game-2x.png` (abbreviated **G**). All boxes below are `(x0, y0, x1, y1)` in G pixels. A "cut-out" means G with the slate floor removed: the background is flood-filled from the crop border through floor-coloured pixels, so dark outlines stop it, and the mask is then softened by 0.8 px.

Frame layouts and pixel sizes are unchanged for every existing id.

| output (assets/game/…-2x) | size / frames | source |
|---|---|---|
| tile_{clay,iron,magma}_floor | 256x128, 2 | G floor crops (280,93,436,249) and (740,93,896,249). Each is 2x2 floor tiles cut from grid line to grid line and scaled to 128. Values are pulled to the middle and darkened. iron keeps the slate blue; clay and magma are gradient-mapped to a warm brown-slate and a dark red-slate. |
| tile_*_brick | 128x128 | Four whole bricks cut out of G: (262,410,342,482), (340,410,420,482), (418,410,507,482), (164,333,228,410). Each is scaled to 62 px and placed in its own quarter on dark mortar. clay gets a +10% warm tint, magma a redder tint. |
| tile_*_steel | 128x128 | G centre steel block (579,486,675,582), cut by its own octagon outline (13 px corners) and lightened. Four copies at 62 px, one per quarter, on a dark gap. clay and magma get a 10% tint. |
| tile_*_lava | 512x128, 4 | Procedural. Two tileable value-noise layers drift against each other and their difference gives bright veins. Ramp: crust, magma_deep, magma_orange, magma_hot, core_amber, core_white. A dark crust fades in towards the cell edge. |
| tile_*_oil | 128x128 | Procedural. Noisy round puddle, near-black, thin-film teal/warm sheen near the rim, light rim, steel_frost specular. Soft alpha edge. |
| tile_*_roots | 128x128 | Procedural. A dense tangle of outlined vines over a 92% opaque dark base, so it hides the tanks under it. Colours: teal/green for clay and iron (the vines of stage-map-2x), rust for magma. The old file had the plate under the roots. |
| core | 256x128, 2 | Frame 0: the amber crystal of G (548,1012,708,1162), keyed by brightness and warmth inside the ring ellipse, dark-amber outline, fit to 100 px, with magma_hot and core_white radial glow. Frame 1: the same crystal in dark grey, shifted down, with dark cracks and a dim magma_deep ember. |
| core_wall_brick / core_wall_steel | 128x128 | The new brick and steel tiles (brick slightly warmer), with a 2 px core_amber edge (brick) or steel_teal_light edge (steel, the fortify booster) around each quarter. |
| enemy_grunt | 512x128, 4 | Cut-out of the left Rustbug of G (136,129,282,275), rotated 180° to face up, fit to 112 px. Frame B: the tread columns (found automatically as the neutral-grey side columns) rolled 3 px. Flash A/B: 50% toward core_white, with the dark outline kept. |
| enemy_scout | 512x128, 4 | Grunt with a lighter, yellower rust shell, 92 px. |
| enemy_gunner | 512x128, 4 | Grunt with the shell recoloured to enemy green, plus a procedural short iron cannon with an acid_green muzzle at the front, 120 px. |
| enemy_brute | 512x128, 4 | Grunt darker and redder, 124 px (full cell), extra 2 px dark rim. |
| enemy_brute_damage | 384x128, 3 | Procedural cracks (dark line, magma_hot core, blurred magma_orange glow): 2, 4 and 6 cracks, clipped to the brute body mask. |
| player_hull | 256x128, 2 | Cut-out of the complete drill tank of G (546,726,707,900), already facing up, fit to 124 px. Frame B: treads rolled 3 px. |
| bullet_player | 64x32, 2 | G (608,636,648,712): the glow above the floor colour is taken as an additive layer (shape from the source), then mapped to magma_deep, magma_orange, magma_hot, core_white. A faint dark halo is added. Frame 2 is slightly smaller and dimmer (flicker). |
| bullet_enemy | 64x32, 2 | G (606,280,650,356), the same method, rotated 180°, mapped to acid_green_dark, acid_green, pale green. |
| fx_explosion_small / big / core | 384x96 x4, 1536x256 x6, 2048x256 x8 | Procedural (frame counts from `src/screens/field-fx.ts`). Soft fire blobs on the FIRE ramp, cooling over time, a core_white flash, core_amber sparks or shards, and slate smoke puffs that fade out. |
| fx_spawn | 768x128, 6 | Procedural looping pulse (`field-units.ts` cycles `% 6`). A steel_frost four-point star with a core_white centre, rotating 15° per frame, inside an acid_green_dark / acid_green ring (palette: enemy spawn). |
| fx_hit_spark | 192x64, 3 | Procedural rays (core_white, then magma_hot) with a magma_orange glow, fading. |
| fx_frost | 128x128 | Procedural. A steel_frost translucent overlay, clear in the centre and denser at the edges, with ice cracks, corner ice crystals and a steel_teal_light rim. |
| fx_bubble | 320x160, 2 | Procedural. A translucent steel_teal sphere with a hex pattern, steel_teal_light rim and steel_frost highlight. Frame 2 is dimmer. The old file had the opaque plate inside, over the tank. |
| icon_pause | 96x96 | The G steel plate (as tile_steel) at 88 px plus two steel_frost bars with a dark outline. |
| icon_back | 96x96 | The same plate plus a left arrow. |
| icon_sfx / icon_sfx_off (new) | 96x96 | Procedural speaker (rivet-iron body, dark outline). `icon_sfx` has steel_teal_light sound waves. `icon_sfx_off` has no waves and an alarm_red X. **`icon_sfx_off` is not wired in code yet** (lobby-view.ts uses `icon_sfx` only). |
| icon_music | 96x96 | A procedural steel_teal_light double note with a dark outline (the old file was a plate with a crystal). |
| icon_life | 96x96 | Own sheet `brand-mark` (the drill tank), from its high-res original `assets/source/icons/batch-2/brand-mark-2x.png`, fit to 88. |
| icon_enemy_left | 96x96 | Rustbug cut-out of G (136,129,282,275), unrotated (head and green eyes to the viewer), fit to 90. |
| icon_gun | 96x96 | A procedural steel cannon barrel with a muzzle ring and a teal breech, plus the gold `rating-star` (high-res original) at 46 px in the corner. |
| icon_stage | 96x96 | Own sheet `quest` flag (high-res original `batch-2/quest-2x.png`). |
| icon_shop / icon_daily / icon_leaderboard | 96x96 | Own sheet originals `shop`, `calendar` (calendar with a gift) and `trophy` (`assets/source/icons/batch-*/<key>-2x.png`), fit to 88. The old files were plate-with-crystal variants. |
| icon_wave, icon_siege, icon_info, icon_haptics | – | Kept: readable symbols. |
| star_small / star_big | 96x48 / 384x192, 2 | Own sheet `rating-star` (high-res original `batch-3/rating-star-2x.png`) fit to 94% of the frame. The empty star is the same star gradient-mapped to dark steel (slate_abyss, slate_blue, slate_mid, rivet_iron). |
| node_stage | 512x128, 4 | Frame order is locked / open / current / cleared (`NODE_FRAMES` in `src/screens/map-view.ts`). Each frame is the G steel plate cut to an octagon (100 px) and centred, with a dark border, a coloured rim and a plain darker inset disc in the middle for the number. Locked: dark steel with a rivet-iron rim. Open: steel_teal_light rim. Current: magma_orange rim with an orange glow. Cleared: plate mapped to steel_teal, core_amber rim and a soft amber glow. |
| node_finale | 640x160, 4 | The same frames with a 118 px plate, eight rust_light spikes around it (slate in the locked frame), and the Rustbug head cut-out at the top as the boss emblem. |
| tut_hand | 320x160, 2 | A procedural magma_orange down-arrow with a magma_hot highlight and slate_abyss outline. Frame 2 is 14 px lower (bob). Not referenced in `src/` at the moment. |
| scene-map (webp) | 1536x1024 | `assets/ui/screens/stage-map-2x.png` as it is (clean cave, no plate), webp q80. |
| scene-game (webp) | 1536x1024 | The same cave at 72% brightness and 80% saturation, with the far tunnel glow dimmed, webp q80. Smaller than the old 2560x1600 files. |
| pack_hull / pack_starter | 320x320 | Copies of `assets/ui/offers/offer-hull_pack-2x.png` / `offer-starter_crate-2x.png`, so the game folder copies are no longer plate clones. The shop (`OFFERS` in `src/skin/art.ts`) already uses `assets/ui/offers/*`, which pass review, so `art.ts` is unchanged. |

Skin icon sheet (Н-50): `assets/skin/game-icons.png` is a copy of `assets/ui/game-icons-2x.png` (6x5 cells of 96 px). `src/skin/icons.ts` was rewritten by `node scripts/skin-icons.mjs --sheet game-icons.png --columns 6 --keys <the 29 keys>`. All 29 keys were already in `tests/skin-gallery/visible-icons.json`.

## Not touched (outside the brief, still plate-with-crystal art)

- `player_turret_l0..l3`: the lead stops drawing them over the hull.
- `pu_*` tokens and `assets/ui/items/bst_fortify` (in `assets/ui/`, not in this write set).
