import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
const md = readFileSync('docs/gdd/23_audio_voice_haptics.md', 'utf8');
const rows = md.split('\n').filter((l) => l.startsWith('| ') && !l.startsWith('|---'));
const cells = (l) => l.split('|').slice(1, -1).map((s) => s.trim());
const music = [], sfx = [];
const LOOP = { mus_lobby: 64, mus_stage_clay: 76, mus_stage_iron: 76, mus_stage_magma: 76, mus_siege: 84 };
const groupOf = (id, n) => id.startsWith('jgl_') ? 'jingles' : n >= 36 || n === 46 ? 'ui' : (n >= 11 && n <= 27) ? 'powerups' : 'combat';
for (const l of rows) {
  const c = cells(l);
  if (/^(mus|jgl)_/.test(c[0])) {
    const [id, where, character, tempo, len, loop, lufs, prompt] = c;
    const durSec = parseFloat(len);
    if (id.startsWith('mus_')) music.push({ id, screen: where, state: where, character, tempo, gddDurationSec: durSec, duration: LOOP[id], loop: true, targetLUFS: parseFloat(lufs.replace('−', '-')), prompt, group: 'music', tool: 'mcp__elevenlabs__music', priority: 3 });
    else sfx.push({ id, event: where, character, duration: durSec, variations: 1, loop: false, targetLUFS: parseFloat(lufs.replace('−', '-')), priority: 1, prompt, group: 'jingles', tool: 'mcp__elevenlabs__music', kind: 'jingle' });
  } else if (/^\d+$/.test(c[0]) && /^sfx_/.test(c[2])) {
    const n = +c[0];
    const [, event, id, prompt, len, vol, prio, cd] = c;
    const [lufs, mix] = vol.split('·').map((s) => s.trim());
    sfx.push({ id, event, duration: parseFloat(len), variations: 1, loop: id === 'sfx_engine_loop', targetLUFS: parseFloat(lufs.replace('−', '-')), mixDb: mix.replace(/−/g, '-'), priority: +prio, cooldownLimit: cd, prompt, group: groupOf(id, n), tool: 'mcp__elevenlabs__sound_effect', kind: 'sfx' });
  }
}
const brief = {
  $comment: 'Iron Burrow sound brief (step sound). Source: docs/gdd/23_audio_voice_haptics.md. Loudness thresholds are not copied: see QUALITY_TARGETS.json sound.*',
  game: 'Iron Burrow',
  mood: 'Underground forge arcade: dark analog synths, metallic/forge percussion, deep bass, warm magma pads at climaxes; shared four-note low "Burrow motif" across all tracks. No vocals, no words.',
  references: 'Mood words only, no third-party games, brands or artists (GDD 23 aud.budget).',
  loudnessRef: 'docs/plan/QUALITY_TARGETS.json sound.musicLUFS / sound.sfxLUFS / sound.truePeak (values not copied into the brief; per-cue targetLUFS = GDD 23 table)',
  formats: ['ogg', 'm4a'],
  sampleRates: [44100],
  channels: { music: 2, sfx: 1 },
  music, sfx,
  haptics: [
    { event: 'гибель игрока', pattern: 80 }, { event: 'ядро уничтожено', pattern: 200 },
    { event: 'подбор power-up', pattern: 20 }, { event: 'бустер Shockwave / подбор Quake', pattern: [40, 40, 60] },
    { event: 'разрушена первая четверть кольца ядра', pattern: [30, 60, 30] },
  ],
  licensing: 'Generated with ElevenLabs via the platform connector (platform key); ElevenLabs generated-content terms of the platform plan. Each file: tool + prompt in assets/audio/CREDITS.md.',
};
mkdirSync('docs/sound', { recursive: true });
writeFileSync('docs/sound/BRIEF.json', JSON.stringify(brief, null, 2) + '\n');
const g = {}; for (const s of [...music, ...sfx]) (g[s.group] ??= []).push(s.id);
console.log(music.length, sfx.length, JSON.stringify(Object.fromEntries(Object.entries(g).map(([k, v]) => [k, v.length]))));
