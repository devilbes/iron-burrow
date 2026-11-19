// Builds assets/audio/manifest.json, CREDITS.md, CHOICE.json, README.md from BRIEF.json + measure.json + raw/<group>/REPORT.json
import { existsSync, readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
const DATE = process.argv[2] ?? '2026-11-19';
const brief = JSON.parse(readFileSync('docs/sound/BRIEF.json', 'utf8'));
const meas = Object.fromEntries(JSON.parse(readFileSync('/project/.scratch/audio/measure.json', 'utf8')).map((m) => [m.id, m]));
const rep = {};
const RAW = '/project/.scratch/audio/raw';
for (const g of readdirSync(RAW)) {
  const f = `${RAW}/${g}/REPORT.json`;
  if (existsSync(f)) for (const r of JSON.parse(readFileSync(f, 'utf8'))) rep[r.id] = r;
}
const missing = [];
const entry = (b, kind) => {
  const m = meas[b.id], r = rep[b.id];
  if (!m || m.error || !r) { missing.push(b.id); return null; }
  const o = m.files.ogg, a = m.files.m4a;
  return {
    id: b.id, key: b.id, kind, group: b.group, event: b.event ?? b.screen,
    files: { ogg: o.path, m4a: a.path },
    bytes: { ogg: o.bytes, m4a: a.bytes },
    durationSec: o.durationSec, channels: kind === 'music' ? 2 : 1, sampleRate: 44100,
    targetLUFS: b.targetLUFS, lufs: o.lufs ?? '—', truePeak: o.truePeak,
    loudnessNote: o.lufs == null ? 'unmeasured: clip shorter than 0.4 s (EBU gating); normalised on a 0.4 s padded measurement' : 'ebur128 integrated',
    loop: !!m.loop, ...(m.loop ? { loopStart: m.loop.start, loopEnd: m.loop.end, crossfadeSec: m.loop.crossfadeSec, seam: m.seam } : {}),
    ...(b.mixDb !== undefined ? { mixDb: b.mixDb } : {}), priority: b.priority, ...(b.cooldownLimit ? { cooldownLimit: b.cooldownLimit } : {}),
    tool: r.tool, prompt: r.prompt, license: 'ElevenLabs generated content via platform connector (platform key)',
  };
};
const music = brief.music.map((b) => entry(b, 'music')).filter(Boolean);
const sfx = brief.sfx.map((b) => entry(b, b.kind === 'jingle' ? 'jingle' : 'sfx')).filter(Boolean);
const all = [...music, ...sfx];
const total = all.reduce((s, e) => s + e.bytes.ogg + e.bytes.m4a, 0);
const manifest = {
  $comment: 'Iron Burrow audio manifest (step sound). id/key = cue id of docs/sound/BRIEF.json and GDD 23. Browser picks ogg (Vorbis) or m4a (AAC) by canPlayType. Loops are baked seamless: AudioBufferSourceNode.loop with loopStart/loopEnd.',
  version: 1, generated: DATE, formats: ['ogg', 'm4a'], sampleRate: 44100,
  totals: { files: all.length * 2, bytes: total, musicBytesMaxPerFile: Math.max(...music.flatMap((e) => [e.bytes.ogg, e.bytes.m4a])), sfxBytesMaxPerFile: Math.max(...sfx.flatMap((e) => [e.bytes.ogg, e.bytes.m4a])) },
  music, sfx,
};
writeFileSync('assets/audio/manifest.json', JSON.stringify(manifest, null, 1) + '\n');
const esc = (s) => String(s).replace(/\|/g, '\\|').replace(/\n/g, ' ');
const rows = all.map((e) => `| ${e.id} | ${e.files.ogg.replace('assets/audio/', '')}, ${e.files.m4a.replace('assets/audio/', '')} | \`${e.tool}\` | ${esc(e.prompt)} | ${rep[e.id].params ? esc(rep[e.id].params) : '—'} | ElevenLabs (platform key) |`);
writeFileSync('assets/audio/CREDITS.md', `# Audio credits — Iron Burrow

All ${all.length} cues (${all.length * 2} files) were generated on ${DATE} through the platform ElevenLabs connector (platform key, licence: ElevenLabs generated-content terms of the platform plan). No stock, no third-party samples, no placeholders. Mastering: ffmpeg (trim, fade, seamless crossfade loop, constant-gain loudness to the GDD 23 targets, Vorbis + AAC encode).

| id | files | tool | prompt | params | licence |
|---|---|---|---|---|---|
${rows.join('\n')}
`);
writeFileSync('assets/audio/CHOICE.json', JSON.stringify({
  preview: null, key: 'gdd-23-brief', decisionId: 'D-SND-05',
  mode: 'decideMyself',
  reason: 'Lite flow has no sound-previews/audio-choice steps and the owner is not asked: one direction taken straight from the GDD 23 brief (dark forge synths + metallic percussion + four-note Burrow motif).',
  music: music.map((e) => e.id), date: DATE,
}, null, 2) + '\n');
writeFileSync('assets/audio/README.md', `# assets/audio
Music and sound effects of Iron Burrow. Every cue exists as OGG (Vorbis) and M4A (AAC), 44.1 kHz; music stereo, SFX and jingles mono.

- \`music/<id>.{ogg,m4a}\` — ${music.length} seamless loops (loopStart/loopEnd in the manifest).
- \`sfx/<id>.{ogg,m4a}\` — ${sfx.length} SFX and jingles.
- \`manifest.json\` — id/key → files, bytes, duration, measured LUFS / true peak, loop points, priority, mix, tool, prompt, licence.
- \`CREDITS.md\` — tool and prompt per file. \`CHOICE.json\` — chosen music direction.
- Brief: \`docs/sound/BRIEF.md\`, \`docs/sound/BRIEF.json\`; report: \`docs/sound/REPORT.md\`.

Total: ${(total / 1048576).toFixed(2)} MB. Copied to \`dist/assets/audio/\` by the build.
`);
console.log({ music: music.length, sfx: sfx.length, totalMB: +(total / 1048576).toFixed(2), missing });
