# STYLE — Iron Burrow text style

Base language: **en** (`defaultLocale: en`). Other locales are added only by the localization step, from `texts/en/*` by stable keys.
Story mode: **light** (ambient story: world, chapter cards, short crew-log lines; no cutscenes, no voice-over — 23 `aud.*`: no voice in MVP). Decision D-NAR-01.

## Voice and tone

- **Tough, warm, a little cheeky.** A small iron machine against a swarm — underdog grit, never grim. Think "dig-crew radio chatter", not "war report".
- Short, active verbs. Second person to the player ("Protect the Core!"), first person plural in crew logs ("We dig. We hold.").
- Mechanics words are literal and consistent (see GLOSSARY.json): *Core*, *Rustbugs*, *Spare Hull*, *stage*, *wave*. Never synonyms in UI ("base", "enemies", "extra life") where a glossary term exists.
- Humor is dry and mechanical (rust, bolts, grit, drilling). No jokes in error, purchase or defeat texts that blame the player.
- No violence words beyond arcade level: *destroy, blast, break, smash* — no *kill, blood, die, murder* in visible text (`kill` allowed only in code/analytics ids).
- Rustbugs never speak words. They are machines of a swarm; their "voice" is clicks, hisses and grinding (sound step).

## Formatting rules

- Sentence case for bodies and hints; **Title Case** for titles, buttons and item/pack names (`Stage Clear!`, `Play Again`, `Spare Hull`).
- One `!` maximum per string; never `!!` or `?!`. Ellipsis = three dots `...` (as in GDD 20).
- Placeholders in curly braces, ASCII names: `{n}`, `{count}`, `{score}`, `{rank}`, `{time}`, `{price}`, `{name}`, `{stars}`, `{bonus}`, `{key}`, `{version}`. Numbers, prices and times are formatted by `Intl` via `sdk.l10n.locale()`; never concatenate strings in code.
- Multiplication sign `×` (U+00D7) for counts (`×{count}`); star symbol is art, not text.
- No line breaks inside UI strings. Story card bodies may hold at most 2 sentences.
- Text on raster: English only and only the logo `Iron Burrow` (21 art.*); all other text is HTML from `sdk.l10n.t`.

## Length limits (characters, en, placeholders counted as written)

Limits are set so that every string of GDD 20 `ui.strings` fits (measured: longest `ui.booster.bst_fortify_desc` = 67). Translations may exceed en by up to 30 % — layout must allow that (localization step checks clipping).

| type | limit | applies to keys |
|---|---|---|
| button | 16 | CTAs and toggles: `ui.common.{close,back,ok,collect}`, `*.retry`, `*.play`, `*.start`, `*.resume`, `*.restart`, `*.quit`, `*.next`, `*.replay`, `*.map`, `*.continue`, `*.claim`, `*.signin`, `*.more`, `*.lobby`, `*.boards`, `*.end_siege`, `ui.tut.{next,skip}`, `ui.pre.shop`, `ui.hud.fire` |
| title | 24 | `*.title*`, `*_title`, `ui.clear.{chapter_done,campaign_done}`, `ui.pack.*`, `ui.booster.bst_*` (names), `ui.map.chapter_*`, `story.*.title` |
| label / toast | 32 | every other `ui.*` key not listed in this table |
| hint / body | 72 | keys ending `_desc`, `_hint`, `_body`; `ui.pre.goal*`; `ui.shop.unavailable`; `ui.common.offline`; `ui.tut.*` (except `next`/`skip`) |
| story line | 110 | `story.*` lines (crew log, card body sentence) |
| story card body | 160 | `story.*.body` (max 2 sentences) |

Machine-readable form (used by the df-narrative check and by the localization step; first matching rule wins, top to bottom):

```json
{
  "rules": [
    {"type": "button", "max": 16, "match": "^ui\\.(common\\.(close|back|ok|collect)|tut\\.(next|skip)|pre\\.shop|hud\\.fire|[a-z]+\\.(retry|play|start|resume|restart|quit|next|replay|map|continue|claim|signin|more|lobby|boards|end_siege))$"},
    {"type": "hint",   "max": 72, "match": "^ui\\.([a-z]+\\.[a-z0-9_]+_(desc|hint|body)|pre\\.goal[a-z_]*|shop\\.unavailable|common\\.offline|tut\\.[a-z_]+)$"},
    {"type": "title",  "max": 24, "match": "^(ui\\.([a-z]+\\.title[a-z_]*|[a-z]+\\.[a-z_]+_title|clear\\.(chapter_done|campaign_done)|pack\\.[a-z]+|booster\\.bst_[a-z]+|map\\.chapter_[0-9]+)|story\\..+\\.title)$"},
    {"type": "story_body", "max": 160, "match": "^story\\..+\\.body$"},
    {"type": "story_line", "max": 110, "match": "^story\\."},
    {"type": "label",  "max": 32, "match": "^ui\\."}
  ]
}
```

## Forbidden words

- The list from the flow launch variables (field «Запретные слова»: the reference game's name, its publisher, console brands) — never reproduced in any text, key, prompt or comment.
- No foreign IP: no names of existing games, franchises, studios, brands, characters; no Playrix.
- Words banned in visible text: `kill`, `blood`, `die`, `dead`, `murder` (use *destroy*, *break*, *out of lives*); `ads`, `watch an ad`, `free gems`, `coins`, `gems`, `currency` (no ads and no currency in MVP); `offline mode`.
- Monetization texts never pressure: no "Last chance!", no fake timers, no "Only today" unless a real config timer drives it.

## Keys

- Stable keys `<namespace>.<entity>.<name>`, lowercase `a-z0-9_`, depth ≤ 8 (SDK StringTree). Namespaces: `ui` (GDD 20, file `texts/en/ui.json`), `story` (this bible, file `texts/en/story.json`).
- Keys are never renamed. A removed key is marked in INDEX.json `deprecated: true`, not deleted.
- Every key of `texts/en/*.json` is listed in INDEX.json `texts[]`.
