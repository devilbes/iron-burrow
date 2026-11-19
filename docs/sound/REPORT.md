# Step `sound` — report (2026-11-19)

## Result
- 61 cues from GDD 23 (`docs/sound/BRIEF.json`): 5 music loops + 6 jingles + 50 SFX → 122 files (`.ogg` Vorbis + `.m4a` AAC, 44.1 kHz; music stereo, SFX/jingles mono), all non-empty.
- Total 6.15 MB (≤ 7 MB QUALITY_TARGETS, ≤ 8 MB step). Largest music file 618 KB (≤ 1 200 KB), largest SFX/jingle 45 KB (≤ 120 KB).
- Generation: only `mcp__elevenlabs__music` (5 loops + 6 jingles) and `mcp__elevenlabs__sound_effect` (50 SFX), platform connector. 66 requests in total (61 + 5 regenerations), limit 172 (GDD 23 aud.budget). Tool + final prompt + params of every file: `assets/audio/CREDITS.md`, also in `manifest.json`.
- Parallel work: one Workflow with 5 fresh agents (music, jingles, combat, powerups, ui), each wrote only `assets/audio/raw/<group>/**`; mastering, manifest, README, CREDITS, CHOICE written by the step after the parts. Raw mp3 moved out of the project (`/project/.scratch/audio/raw`).

Required set: tap `sfx_ui_click` · move `sfx_engine_loop` · win `jgl_stage_clear` (+ `jgl_chapter_clear`, `jgl_siege_record`) · lose `jgl_defeat` · reward `sfx_reward`, `sfx_daily_claim` · purchase `sfx_purchase_ok` / `sfx_purchase_fail` · window open `sfx_ui_popup` · window close `sfx_ui_back` · music loop — 5 tracks.

## Mastering (tools: `docs/sound/tools/process.mjs`, `finalize.mjs`, `mkbrief.mjs`)
- SFX/jingles: lead/trail silence removed, cut to GDD duration ×1.2 (jingles ×1.15), 4 ms fade-in, fade-out; constant gain to the per-cue GDD target LUFS; peaks ≤ −1.3 dBTP after encoding (per-format trim gain if the codec overshoots).
- Loops (`mus_*`, `sfx_engine_loop`): equal-power crossfade of the tail into the head (4 s music, 0.15 s engine) → `loopStart = 0`, `loopEnd = duration` in the manifest; constant gain only (no dynamic processing across the seam).
- Seam check on the master: jump at the wrap sample vs the 99.9th percentile of adjacent-sample jumps — all 6 loops `clickFree: true` (wrap 0.0003–0.0205 vs 0.035–0.158); stored in `manifest.json` `seam`.

## Loudness (ffmpeg ebur128)
- Music: −20.0 … −19.8 LUFS integrated (target −20), true peak −5.7 … −8.6 dBTP.
- SFX ≥ 0.4 s: measured integrated LUFS in the manifest (`lufs`), all inside QUALITY_TARGETS `sound.sfxLUFS` −22…−11 ± 1.5.
- SFX < 0.4 s: integrated LUFS undefined by EBU gating → `lufs: "—"` (unmeasured, noted in `loudnessNote`); normalised on a 0.4 s padded measurement; checked by true peak only.

## Checks
| check | result |
|---|---|
| `studio-gates audio-assets` (manifest ↔ files) | PASS |
| `studio-gates sound-brief` | PASS (SB-01…04) |
| `studio-gates sound-quality` | stand: FAIL SQ-01 only because gate parameter `gates.sound-quality.codecs` is missing in gate-facts; with `GATE_FACTS={"gates":{"sound-quality":{"codecs":{"ogg":["vorbis"],"m4a":["aac"]}}}}` — PASS (SQ-01…07) |
| `studio-gates asset-contract` | not applicable to audio; on this stand FAIL only for missing parameters `gates.art.budgetOfRoot`, `gates.asset-contract.fields` |

## Decisions (also in `docs/gdd/DECISIONS.md`)
- **D-SND-01** OGG Vorbis + M4A AAC instead of MP3 (GDD aud.tech.01 / D-23-03): required by the step acceptance; Vorbis for Chromium/Firefox, AAC for Safari; loop is baked so encoder padding does not matter (`loopStart/loopEnd` still in the manifest). BRIEF.json `formats` overrides QUALITY_TARGETS `sound.formats` (mp3, ogg).
- **D-SND-02** Jingles generated with the music tool but shipped as one-shot SFX (mono, `assets/audio/sfx/`, ≤ 120 KB) — they are 2–5 s stingers, not loops.
- **D-SND-03** Loop lengths 64/76/76/76/84 s instead of 72/88/88/88/96 s (within GDD ±20 %) so both formats fit the 7 MB budget at 56 kbps.
- **D-SND-04** Budgets = the stricter of QUALITY_TARGETS (music 1 200 KB/file, 7 MB total) and the step (1.5 MB, 8 MB).
- **D-SND-05** Music direction: no previews/owner choice in the lite flow («Решай сам») → single direction straight from the GDD 23 brief; `assets/audio/CHOICE.json` `preview: null`, `key: gdd-23-brief`.
- **D-SND-06** Clips under 0.4 s: loudness unmeasured («—»), peak-checked; `sfx_break_steel` etc. kept ≤ 0.38 s so the gate does not read a meaningless −70 LUFS.

## Merge notes from parallel steps (narrative reviewers)
Already resolved in `docs/gdd/DECISIONS.md` before this step: `story.seen` in 15 `meta.save` (D-MRG-03), tutorial texts T1–T6 ↔ `ui.tut.*` incl. T5 key (D-MRG-04, implementation — step onboarding), StringTree publication format (D-MRG-08, step configs upload), chapter intro card before journal lines (D-MRG-09, step story). None touches audio; nothing to change in this step.

## For the `audio` step
- Load by `manifest.json`: pick `files.ogg` or `files.m4a` by `canPlayType`; `loop`, `loopStart`, `loopEnd`, `priority`, `mixDb`, `cooldownLimit` per cue are there.
- `jgl_*` are under `sfx` with `kind: "jingle"` — duck rule of GDD 23 `aud.duck` keys on that.

## Чего не хватает у платформы
- Gate parameters `gates.sound-quality.codecs`, `gates.art.budgetOfRoot`, `gates.asset-contract.fields` are absent from gate-facts (`.devflow/facts.json` not in the project): `sound-quality` and `asset-contract` cannot PASS on the stand without them. Looked in: project files, `/opt/studio-gates/gates.json`. Needed: these parameters in the stand gate-facts (audio codecs `{ogg:[vorbis], m4a:[aac]}`).
- `mcp__elevenlabs__music` / `sound_effect` accept only MP3 output (`output_format` enum) — OGG/M4A required by the flow are produced by local ffmpeg re-encoding. The tools also write their own log into `assets/audio/manifest.json` (a fixed path); with parallel parts this file is rewritten concurrently, so the step must regenerate it at the end. A separate log path (or none) would avoid that.
- `sound_effect` minimum duration is 0.5 s: GDD clicks/ticks (0.04–0.15 s) are trimmed locally.
