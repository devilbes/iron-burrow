# Gameplay asset

Source: built-in Codex image_gen, one generation.
Tool source: `/profile/users/6ac858bd065491a571c910e9/accounts/6ade5f453555343b5f9f6bec/codex/generated_images/01a1f375-3062-7001-8df5-314749876953/exec-c9dc263c-70a6-4e54-84fb-1659bcac1b25.png`
Saved: `assets/ui/screens/game-2x.png`.
Requested dimensions: 1024 × 1024. Mechanical processing and validation belong to the parent batch.
Reference: `/project/repo/design/system/STYLE_REF.png`, used read-only.

Exact generation prompt:

```text
Use case: stylized-concept. Production square 1024x1024 bitmap asset for Iron Burrow gameplay screen. STYLE_REF image is a material and palette reference only, not composition.
Create strict topdown 13x13 tank defense maze mid-level: quiet blue grey packed earth grid, chunky clay brick and steel wall lanes, teal friendly drill tank near bottom, glowing amber Core at bottom center protected by brick ring, three clearly hostile rusty beetle scrap tanks with green eyes near top, few projectiles, readable separated silhouettes. Square field fills image edge to edge. No text, no letters, no numbers, no UI, no HUD, no border, no joystick. Broad clear corridors and empty space. Core is one warm focal accent.

STYLE TEMPLATE — verbatim UI_ART_BIBLE:
# Iron Burrow — UI Art Bible

## Pillars
- Stubborn little machinery protecting a warm underground heart: tough, friendly, tactile.
- Cool forged steel supports one hot focal action; silhouette and value stay readable during fast arcade play.
- Chunky toy proportions, restrained rivets and bevels; wear describes material without visual noise.

## Palette and material
Cold slate and teal steel against magma orange express the underground drill workshop and make the Core/action immediately visible. No paper or timber panels. Exact colors: palette.json (GDD 21, unchanged).

| Role | Ordered shade scale: dark → light |
|---|---|
| Base / outline / surface | #0A1118 / #121E29 / #1E2E3D / #2F4558 |
| Player / secondary / highlight | #2F7D86 / #6FC2C4 / #CFE6E8 |
| Main action | #B8320C / #FF6A1A / #FFB23F |
| Core / reward | #FFC845 / #FFF4D6 |
| Enemy only | #3F9E12 / #9BFF2E |
| Danger only | #FF3B3B |
| Text: muted / main | #8FA3B0 / #F2F6F7 |
| Iron details | #5D6B75 |

No currency in v1: reward color belongs to boosters and stars, never invented coins. Text on orange uses dark ink #0A1118; main text on slate. Neutral grays are blue-tinted, darkest ink is never pure black. Keep broad surfaces dark and low contrast; the action is brighter and warmer. Color always has a shape/label counterpart; enemies never use friendly teal.

## Shape
A forged armor plate with clipped 45-degree corners is the recurring motif. At 1x: corner cut 8px, inner rounding 4px, outer outline 1px, inner bevel 2px. Use the same geometry for future panels, buttons, badges and icon carriers; larger frames may scale the cut to 16px. Rivets belong at structural corners, never behind text. Hexagons remain exclusive to power-up tokens (GDD).

## Light and depth
UI and static materials: one soft upper-left key, pale upper edge and dark lower edge. Shadows use #0A1118: raised 0/2/4px at 24%; floating 0/6/12px at 32%; modal 0/12/24px at 40%. Field and background stay grounded; only interactive plates lift. Orange insets emit restrained local glow. Rotating gameplay sprites use a centered overhead dome and no baked directional cast shadow (GDD exception).

## Typography
Russo One 400 for headings; Exo 2 500/700 for body, controls and tabular scores. Local Latin WOFF2 from @fontsource/russo-one and @fontsource/exo-2, OFL; package/license pinning and font delivery belong to the theme step. No CDN. Roles: display Russo One, ui/body Exo 2. Scale at 1x: 12/14/16/20/24/32/40px; body 16, label 14, value 24 bold, title 32. Body leading 1.4, heading 1.1. One restrained text shadow 0 2px 0 #0A1118; no bevelled letters. English live text only, no text in generated reference.

## Icons
Future icons: front-on orthographic UI objects, identical upper-left light, 1px dark outline at 1x, simplified chunky mass and at most two material details. Consistent optical padding 12.5%; silhouette must survive 24px. Gameplay remains strict top-down with its centered-light exception. No emoji.

GAMEPLAY EXCEPTION: strict top-down orthographic view; centered overhead dome light for all rotating gameplay sprites; no baked directional cast shadows.
```
