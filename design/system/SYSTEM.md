# Iron Burrow — style foundation

Direction: **Cold Steel / Living Core**. Tactile toy-scale forged armor, clipped corners, teal enamel and a single hot amber/orange focus. The cold/hot contrast comes directly from GDD 21 and the Core narrative. Tough and friendly, never grim.

Use UI_ART_BIBLE.md for visual rules, palette.json for the 22 exact GDD colors, TOKENS.json for scales and typography. STYLE_REF-2x.png is the generated material anchor; STYLE_REF.png is its mechanically reduced reference. It establishes material, light and visual hierarchy, not screen composition or reusable control shapes. Use the exact palette values rather than sampling the rendered image.

Fonts: Russo One 400 headings, Exo 2 500/700 UI/body/tabular scores. Two families follow the explicit GDD and current task; three SDK text roles map to those two families. The theme step supplies pinned local WOFF2 and licenses.

Scope: design/system/** plus the requested entry in docs/gdd/DECISIONS.md. The 92 gameplay and 24 skin table entries in GDD 21 belong to subsequent asset/screen/icon steps; this step owns only one style anchor. No screens, windows, icons, runtime theme, SDK or UI Kit modifications.

Reuse: attach the 2x anchor and include palette roles in every later generation. UI uses upper-left light; rotating gameplay objects use centered overhead light. Preserve enemy green versus player teal. No currency in v1. Implement through the installed SDK/UI Kit extension contract; never modify or inherit the protected base skin.
