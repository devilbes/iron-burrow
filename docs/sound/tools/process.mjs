// Iron Burrow audio mastering: raw ElevenLabs mp3 (assets/audio/raw/<group>/<id>.mp3) → assets/audio/{music,sfx}/<id>.{ogg,m4a}
// Usage (from project root): node process.mjs [id ...]   Writes /project/.scratch/audio/measure.json
import { spawnSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
const W = '/project/.scratch/audio/work';
mkdirSync(W, { recursive: true });
mkdirSync('assets/audio/music', { recursive: true });
mkdirSync('assets/audio/sfx', { recursive: true });
const brief = JSON.parse(readFileSync('docs/sound/BRIEF.json', 'utf8'));
const only = process.argv.slice(2);
const items = [...brief.music.map((x) => ({ ...x, kind: 'music' })), ...brief.sfx.map((x) => ({ ...x, kind: x.kind ?? 'sfx' }))].filter((x) => !only.length || only.includes(x.id));
const MUSIC_KBPS = Number(process.env.MUSIC_KBPS ?? 56);
const TP = -2.5;

const ff = (args) => spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-y', ...args], { encoding: 'utf8', maxBuffer: 256 << 20 });
const ffa = (args) => new Promise((res) => { const p = spawn('ffmpeg', ['-hide_banner', '-nostats', '-y', ...args]); let e = ''; p.stderr.on('data', (d) => (e += d)); p.on('close', (code) => res({ status: code, stderr: e })); });
const dur = (f) => Number(spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f], { encoding: 'utf8' }).stdout.trim());
function loud(f, padTo) {
  const af = (padTo ? `apad=whole_dur=${padTo},` : '') + 'ebur128=peak=true';
  const r = ff(['-i', f, '-af', af, '-f', 'null', '-']);
  const t = r.stderr.slice(r.stderr.lastIndexOf('Summary:'));
  const I = Number(/I:\s*(-?[\d.]+|-inf)/.exec(t)?.[1]);
  const pk = Number(/Peak:\s*(-?[\d.]+|-inf)\s*dBFS/.exec(t)?.[1]);
  return { I, tp: pk };
}
function pcm(f) {
  const r = spawnSync('ffmpeg', ['-v', 'error', '-i', f, '-f', 'f32le', '-ac', '1', '-'], { maxBuffer: 512 << 20 });
  return new Float32Array(r.stdout.buffer, r.stdout.byteOffset, Math.floor(r.stdout.length / 4));
}
// Loop seam: jump at the wrap vs 99.9th percentile of adjacent-sample jumps; RMS of last vs first 50 ms.
function seam(f) {
  const x = pcm(f); const n = x.length; if (n < 10) return {};
  const d = []; for (let i = 1; i < n; i += 7) d.push(Math.abs(x[i] - x[i - 1]));
  d.sort((a, b) => a - b); const p999 = d[Math.floor(d.length * 0.999)] || 1e-9;
  const wrap = Math.abs(x[0] - x[n - 1]);
  const w = Math.min(2205, Math.floor(n / 4)); let a = 0, b = 0;
  for (let i = 0; i < w; i++) { a += x[i] * x[i]; b += x[n - 1 - i] * x[n - 1 - i]; }
  const db = (v) => 10 * Math.log10(v / w + 1e-12);
  return { wrapJump: +wrap.toFixed(4), p999Jump: +p999.toFixed(4), clickFree: wrap <= p999, seamDb: +Math.abs(db(a) - db(b)).toFixed(2) };
}

async function one(it) {
  const raw = `assets/audio/raw/${it.group}/${it.id}.mp3`;
  if (!existsSync(raw) || statSync(raw).size === 0) return { id: it.id, error: 'no raw file' };
  const rawDur = dur(raw);
  const outDir = it.kind === 'music' ? 'assets/audio/music' : 'assets/audio/sfx';
  const tmp = `${W}/${it.id}.wav`, fin = `${W}/${it.id}.final.wav`;
  const isLoop = it.kind === 'music' || it.loop === true;
  let L;
  if (isLoop) {
    // Crossfade loop: out[0:X] = head·in + tail(L..L+X)·out, out[X:L] = body. End of out joins start continuously.
    const X = it.kind === 'music' ? 4 : 0.15;
    L = Math.min(it.duration, rawDur - X - 0.05);
    const ch = it.kind === 'music' ? 2 : 1;
    const fc = `[0:a]aformat=sample_rates=44100:channel_layouts=${ch === 2 ? 'stereo' : 'mono'},asplit=3[a][b][c];` +
      `[a]atrim=0:${X},asetpts=PTS-STARTPTS,afade=t=in:st=0:d=${X}:curve=qsin[h];` +
      `[b]atrim=${L}:${L + X},asetpts=PTS-STARTPTS,afade=t=out:st=0:d=${X}:curve=qsin[t];` +
      `[h][t]amix=inputs=2:normalize=0[x];[c]atrim=${X}:${L},asetpts=PTS-STARTPTS[body];[x][body]concat=n=2:v=0:a=1[o]`;
    const r = await ffa(['-i', raw, '-filter_complex', fc, '-map', '[o]', '-c:a', 'pcm_f32le', tmp]);
    if (r.status) return { id: it.id, error: r.stderr.slice(-400) };
  } else {
    let T = Math.max(0.12, it.duration * (it.kind === 'jingle' ? 1.15 : 1.2));
    if (T > 0.38 && T < 0.5) T = 0.38; // EBU integrated loudness is undefined around 0.4 s: keep such clips under the gating window
    const fo = Math.min(0.25, Math.max(0.02, T * 0.3));
    // trim lead silence, trailing silence, cut to T with fade-out
    const af = 'aformat=sample_rates=44100:channel_layouts=mono,silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.003,' +
      'areverse,silenceremove=start_periods=1:start_threshold=-55dB:start_silence=0.02,areverse';
    let r = await ffa(['-i', raw, '-af', af, '-c:a', 'pcm_f32le', `${tmp}.pre.wav`]);
    if (r.status) return { id: it.id, error: r.stderr.slice(-400) };
    const nat = dur(`${tmp}.pre.wav`);
    L = Math.min(nat, T);
    r = await ffa(['-i', `${tmp}.pre.wav`, '-af', `atrim=0:${L},afade=t=in:st=0:d=0.004,afade=t=out:st=${Math.max(0, L - fo)}:d=${Math.min(fo, L)}`, '-c:a', 'pcm_f32le', tmp]);
    if (r.status) return { id: it.id, error: r.stderr.slice(-400) };
  }
  // Loudness: constant gain to the per-cue target (seam-safe); short clips measured padded to 0.4 s; peak cap TP.
  const len = dur(tmp);
  const m = loud(tmp, len < 0.4 ? 0.4 : 0);
  let gain = it.targetLUFS - m.I;
  if (!Number.isFinite(gain)) return { id: it.id, error: `loudness not measurable (${m.I})` };
  let limited = false;
  if (m.tp + gain > TP) {
    // allow a gentle limiter (≤ 8 dB) before falling back to lowering the gain
    const over = m.tp + gain - TP;
    if (over > 8) gain -= over - 8;
    limited = true;
  }
  const lim = limited ? `,alimiter=limit=${Math.pow(10, (TP - 0.3) / 20).toFixed(4)}:level=false:attack=1:release=40` : '';
  let r = await ffa(['-i', tmp, '-af', `volume=${gain.toFixed(2)}dB${lim}`, '-c:a', 'pcm_f32le', fin]);
  if (r.status) return { id: it.id, error: r.stderr.slice(-400) };
  const music = it.kind === 'music';
  const ogg = `${outDir}/${it.id}.ogg`, m4a = `${outDir}/${it.id}.m4a`;
  const oggArgs = music ? ['-c:a', 'libvorbis', '-b:a', `${MUSIC_KBPS}k`, '-ac', '2'] : ['-c:a', 'libvorbis', '-q:a', '3', '-ac', '1'];
  const m4aArgs = music ? ['-c:a', 'aac', '-b:a', `${MUSIC_KBPS}k`, '-ac', '2'] : ['-c:a', 'aac', '-b:a', '80k', '-ac', '1'];
  // Encode; codec overshoot above -1.3 dBTP → re-encode that format with a trim gain (constant, seam-safe), up to 3 rounds.
  const enc = async (f, args, extra = []) => {
    let trim = 0;
    for (let k = 0; k < 4; k++) {
      const r = await ffa(['-i', fin, ...(trim ? ['-af', `volume=${trim.toFixed(2)}dB`] : []), ...args, '-ar', '44100', '-map_metadata', '-1', ...extra, f]);
      if (r.status) return r;
      const tp = loud(f, 0).tp;
      if (!(tp > -1.3)) return r;
      trim -= tp + 1.6;
    }
    return { status: 0 };
  };
  const [a, b] = await Promise.all([enc(ogg, oggArgs), enc(m4a, m4aArgs, ['-movflags', '+faststart'])]);
  if (a.status || b.status) return { id: it.id, error: (a.stderr + b.stderr).slice(-400) };
  const out = { id: it.id, kind: it.kind, group: it.group, rawSec: +rawDur.toFixed(2), gainDb: +gain.toFixed(2), limited, files: {} };
  for (const f of [ogg, m4a]) {
    const lm = loud(f, 0);
    out.files[f.endsWith('.ogg') ? 'ogg' : 'm4a'] = { path: f, bytes: statSync(f).size, durationSec: +dur(f).toFixed(3),
      lufs: Number.isFinite(lm.I) && dur(f) >= 0.4 ? lm.I : null, truePeak: Number.isFinite(lm.tp) ? lm.tp : null };
  }
  if (isLoop) { out.loop = { start: 0, end: +dur(fin).toFixed(3), crossfadeSec: music ? 4 : 0.15 }; out.seam = seam(fin); }
  return out;
}

const res = [];
const queue = [...items];
await Promise.all(Array.from({ length: 6 }, async () => { while (queue.length) { const it = queue.shift(); res.push(await one(it)); } }));
const path = '/project/.scratch/audio/measure.json';
const prev = existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : [];
const merged = [...prev.filter((p) => !res.some((r) => r.id === p.id)), ...res];
writeFileSync(path, JSON.stringify(merged, null, 1));
for (const r of res) console.log(r.error ? `ERR ${r.id}: ${r.error}` : `${r.id} ${r.files.ogg.bytes}/${r.files.m4a.bytes}B ${r.files.ogg.durationSec}s L=${r.files.ogg.lufs} TP=${r.files.ogg.truePeak}${r.seam ? ` seam=${JSON.stringify(r.seam)}` : ''}`);
