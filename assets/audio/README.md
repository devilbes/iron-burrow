# assets/audio
Music and sound effects of Iron Burrow. Every cue exists as OGG (Vorbis) and M4A (AAC), 44.1 kHz; music stereo, SFX and jingles mono.

- `music/<id>.{ogg,m4a}` — 5 seamless loops (loopStart/loopEnd in the manifest).
- `sfx/<id>.{ogg,m4a}` — 56 SFX and jingles.
- `manifest.json` — id/key → files, bytes, duration, measured LUFS / true peak, loop points, priority, mix, tool, prompt, licence.
- `CREDITS.md` — tool and prompt per file. `CHOICE.json` — chosen music direction.
- Brief: `docs/sound/BRIEF.md`, `docs/sound/BRIEF.json`; report: `docs/sound/REPORT.md`.

Total: 6.15 MB. Copied to `dist/assets/audio/` by the build.
