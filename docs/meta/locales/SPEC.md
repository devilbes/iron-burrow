# Spec: portal page texts per language (Iron Burrow, gameId 360)

Output: `docs/meta/locales/<loc>.json`, UTF-8, exactly this shape:
```json
{
  "locale": "<loc>",
  "name": "Iron Burrow",
  "shortDescription": "...",          // ≤ 80 chars, one sentence
  "fullDescription": "...",           // 800–2500 chars, plain text, paragraphs separated by \n\n
  "portal": {
    "slug": "...",                    // ASCII ^[a-z0-9]+(?:-[a-z0-9]+)*$, ≤ 60 chars, starts with "iron-burrow-", rest in that language transliterated to Latin
    "h1": "...",                      // ≤ 90 chars
    "title": "...",                   // seoTitle: ≤ 60 chars INCLUDING the suffix, must end with " | ManyPlay"
    "description": "...",             // seoDescription: 120–160 chars
    "shortDescription": "...",        // same text as top-level shortDescription
    "body": "...",                    // 350–700 words, plain text, paragraphs separated by \n\n; must contain a paragraph about controls
    "faq": [ {"question":"...","answer":"..."} ×3 ]   // exactly 3; one of them about controls
  },
  "controls": [ {"action":"...","input":"..."} ×5 ],  // Move, Fire, Boosters, Pause, Touch screens — see facts
  "alt": {
    "cover": "...",                   // ≤ 140 chars each, describe what is visible
    "shot-1-lobby": "...",
    "shot-2-battle": "...",
    "shot-3-campaign-map": "...",
    "shot-4-shop": "...",
    "shot-5-stage-clear": "..."
  }
}
```

Rules:
- Facts ONLY from docs/meta/FACTS.md §1–5, §7 plus docs/GAME_BRIEF.md and docs/gdd/00_MASTER.md. Do not invent modes, numbers, features.
- LANGUAGES (overrides FACTS.md §6, which is outdated): the game interface is now available in English, German, Spanish, French and Russian (configs/remote/localization/locales.json). Say so where relevant; never say the game is English-only.
- In-game proper names stay in English as in the game UI: Iron Burrow, Burrower, Burrow Core / Core, Rustbugs, Clay Tunnels, The Iron Works, Magma Depths, Siege, Bubble Shield, Shockwave, Steel Fortress, Spare Hull. (Note: German/Spanish/French/Russian game UI may translate some of them — check configs/remote/localization/strings/*.json for the target language and use the in-game translation if present.)
- Forbidden: names of other games, publishers, consoles or brands (other than ManyPlay); prices or currencies; "multiplayer"; "offline"; ads removal; iOS/Android/app stores/tablets; in-game currency/coins. State that there are no ads.
- Native writing, not a literal translation of English: natural phrasing and search terms a player in that language would use. No HTML, no markdown, no angle brackets, no tabs, no double spaces.
- Screenshot contents: lobby with Iron Burrow logo and Play/Siege buttons; battle on stage 1 with Rustbugs on a brick maze, Core at the bottom, booster panel (Bubble Shield, Shockwave, Steel Fortress); campaign map of chapter Clay Tunnels with stages 1–10; shop with booster packs (Hull Pack, Field Kit, Heavy Arsenal, Commander Cache); "Stage Clear" window with three stars, score and booster rewards. Cover = key art of the game (see assets/meta/cover-16x9.png).
- Validate before finishing: JSON parses, all limits above hold (count chars as Unicode code points).
