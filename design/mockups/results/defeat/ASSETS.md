# Defeat screen asset

- Source: built-in Codex image_gen, one call, STYLE_REF.png attached as material reference.
- Generated source: `/profile/users/6ac858bd065491a571c910e9/accounts/6ade5f453555343b5f9f6bec/codex/generated_images/01a1f376-1435-7761-88dc-55bf004d50c5/exec-1f441382-8174-4265-a6e2-7b67a3eaa8d9.png`
- Saved: `assets/ui/screens/defeat-2x.png`.
- Requested size: 1024×1024. Mechanical sizing and 1x generation are owned by the root batch pass.
- Exact generation prompt follows.

```text
Use case: stylized-concept. Generate a 1024x1024 square game screen illustration. Battered but friendly teal drill tank beside a fractured dim amber Core in a cold slate steel cavern, hopeful repair setting, no flames dominating. No text, no letters, no numbers, no UI, no buttons. Reference image is STYLE_REF.png and defines materials, shapes and palette. Subject readable with one warm amber focal point, restrained cool cave backdrop. No frame.

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

## Air, groups and states
Spacing scale 4/8/12/16/24/32px: related items 8, group separation 24, panel padding 24. Future touch targets ≥48px (QUALITY_TARGETS). One orange primary per screen, teal secondary; pressed sinks 2px and uses magma_deep, disabled is unlit desaturated metal plus disabled semantics. Keyboard focus: 2px steel_frost ring with 2px gap. Caption is smaller and quieter than value. Reward art leads its future window. Reduced motion removes shake/flashes.

## Scope
One material/style reference only: STYLE_REF-2x.png. This board is not a screen, icon atlas or production skin. Subsequent steps generate their own assets against it and palette.json, using SDK/UI Kit extension contracts. GDD 21 and narrative/world.md + STYLE.md are the sources; game-specific industrial art overrides generic Soft Clay prescriptions.
```
