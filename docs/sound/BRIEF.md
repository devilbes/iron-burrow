# Iron Burrow — sound brief (step `sound`)

Source of truth for cues: GDD `docs/gdd/23_audio_voice_haptics.md` (tables `aud.music`, `aud.sfx`, rules `aud.tech`, `aud.duck`, `aud.haptics`). Machine list: `docs/sound/BRIEF.json` (one entry per cue id; `group` = generation part; `tool` = ElevenLabs tool). Loudness thresholds are **not** copied here: they live in `docs/plan/QUALITY_TARGETS.json` → `sound.musicLUFS`, `sound.sfxLUFS`, `sound.truePeak`; per-cue `targetLUFS` comes from the GDD tables.

## Mood and identity
- Setting: an underground forge — a burrowing tank defends a glowing core against clay, iron and magma swarms (`docs/narrative/world.md`).
- Palette of sound: dark analog synths, metallic and "forge" percussion (anvils, presses, hammered steel), deep bass, warm magma pads at climaxes.
- One four-note low **Burrow motif** runs through every track and jingle, so chapters read as one game.
- No vocals, no words, no voice lines (D-23-01). No names of games, brands or artists in prompts.

## Music (5 loops, stereo)
| id | where | tempo / key | loop length (GDD → shipped) |
|---|---|---|---|
| mus_lobby | Lobby, Stage Map, Shop, Daily, Leaderboards, Settings | 92 BPM, D minor | 72 → 64 s |
| mus_stage_clay | Gameplay, chapter 1 | 120 BPM, D minor | 88 → 76 s |
| mus_stage_iron | Gameplay, chapter 2 | 128 BPM, E minor | 88 → 76 s |
| mus_stage_magma | Gameplay, chapter 3 | 136 BPM, F minor | 88 → 76 s |
| mus_siege | Gameplay, Siege mode | 144 BPM, F minor | 96 → 84 s |

Loops are baked seamless (4 s equal-power crossfade of the tail into the head), so `loopStart = 0`, `loopEnd = duration` in the manifest; lengths are within the GDD ±20 % acceptance and keep the download budget (D-SND-03).

## Jingles (6, mono, in the SFX set)
`jgl_stage_start` (2 s), `jgl_stage_clear` (3.5 s), `jgl_chapter_clear` (5 s), `jgl_defeat` (3 s), `jgl_siege_result` (3 s), `jgl_siege_record` (4 s). Generated with the music tool, shipped as one-shot SFX (D-SND-02).

## SFX (50, mono)
Full table — GDD 23 `aud.sfx` (event, priority, cooldown/limit, mix dB). Groups used for parallel generation:
- **combat** — shots, hits, explosions, player death/spawn, engine loop, oil, core alarm/destroyed, enemy spawn, last enemy (18).
- **powerups** — power-up drop/vanish, 6 pickups, freeze end, shield, wall revert, 5 boosters (17).
- **ui** — Siege wave start/clear, UI click/back/toggle/popup/locked/pause, star, score tick, reward, daily claim, purchase ok/fail, tutorial step (15).

Required core coverage: tap `sfx_ui_click`; move `sfx_engine_loop`; win `jgl_stage_clear`; lose `jgl_defeat`; reward `sfx_reward` / `sfx_daily_claim`; purchase `sfx_purchase_ok` (+ `sfx_purchase_fail`); window open `sfx_ui_popup`; window close `sfx_ui_back`.

Frequent sounds get ±4 % pitch / ±1.5 dB gain randomisation in code instead of variation files (D-23-04), so `variations = 1`.

## Ducking, mix, haptics
As GDD 23 `aud.duck` and `aud.haptics` (also in `BRIEF.json.haptics`). Settings live in the profile kv key `settings` (D-23-05).

## Formats and budgets
- OGG Vorbis + M4A AAC, 44.1 kHz; SFX mono, music stereo (D-SND-01).
- Strictest of the step acceptance and QUALITY_TARGETS: SFX/jingle ≤ 120 KB per file, music ≤ 1 200 KB per file, all audio ≤ 7 MB (D-SND-04).
- Each file starts without silence, ends with a fade; loops are click-free (checked at the wrap sample).

## Licensing
Everything is generated through the platform ElevenLabs connector (platform key) — `mcp__elevenlabs__music` / `mcp__elevenlabs__sound_effect`; tool and prompt of each file are in `assets/audio/CREDITS.md`.
