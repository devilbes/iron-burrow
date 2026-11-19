#!/usr/bin/env node
// levels:export — builds configs records (ConfigInput) from authored sources.
//   configs/levels/campaign/stage_NN.json → configs/remote/levels.main/{set, r_0001_0010, r_0011_0020, r_0021_0030}.json
//   configs/levels/siege/siege_pit.json   → configs/remote/levels.endless/r_0001_0001.json
// Usage: node tools/levels/export.mjs          (write)
//        node tools/levels/export.mjs --check  (gate: writes nothing, exit 1 on stale/invalid records)
// Format: game-generation references/levels-in-configs.md (E101): data = client fields + data.server (bounds/1),
// contentHash = sha256(JCS(data without server)), visibility 3, no filters. Decisions: docs/levels/BRIEF.md §7.
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import * as L from './lib.mjs';

const CHECK = process.argv.includes('--check');
const OUT = join(L.ROOT, 'configs/remote');
const MAX_BYTES = 81920;
const errors = [];

const entrySchema = L.readJson(join(L.ROOT, 'configs/schemas/levels.entry.json'));
const setSchema = L.readJson(join(L.ROOT, 'configs/schemas/levels.set.json'));
const srcSchema = L.readJson(join(L.ROOT, 'configs/schemas/levels.stage.json'));
for (const [n, s] of [['levels.entry', entrySchema], ['levels.set', setSchema], ['levels.stage', srcSchema]]) {
  for (const e of L.lintSchema(s)) errors.push(`schema lint ${n}: ${e}`);
}

const key4 = (a, b) => `r_${String(a).padStart(4, '0')}_${String(b).padStart(4, '0')}`;
const sha = (s) => createHash('sha256').update(s, 'utf8').digest('hex');

// GDD quarters map {"col,row": "<hex>"} → record array [{col,row,mask}] (configs keys may not contain commas)
function toEntry(src) {
  const quarters = Object.entries(src.quarters || {})
    .map(([k, v]) => { const [col, row] = k.split(',').map(Number); return { col, row, mask: parseInt(v, 16) }; })
    .sort((a, b) => a.row - b.row || a.col - b.col);
  const e = { id: src.id };
  if (src.index !== undefined) e.index = src.index;
  if (src.chapter !== undefined) e.chapter = src.chapter;
  e.theme = src.theme;
  if (src.maxAlive !== undefined) e.maxAlive = src.maxAlive;
  if (src.spawnInterval !== undefined) e.spawnInterval = src.spawnInterval;
  e.grid = src.grid;
  e.quarters = quarters;
  if (src.enemies) e.enemies = src.enemies;
  return e;
}

function record(scope, key, name, description, data, server) {
  const hash = sha(L.jcs(data));
  return { scope, key, name, description, visibility: 3, data: { ...data, server: { contentHash: hash, ...server } } };
}

const { stages, siege } = L.loadSources();
const byN = new Map(stages.map((s) => [s.data.index, s.data]));
for (const s of stages) for (const e of L.validateSchema(srcSchema, s.data)) errors.push(`${s.file}: ${e}`);

const built = [];
const STARS = [{ moves: { max: 9 } }, { moves: { max: 1 } }, { moves: { max: 0 } }]; // moves = lives lost (BRIEF §7 D-LVL-03)
const chapterNames = { 1: 'Clay Tunnels', 2: 'Iron Works', 3: 'Magma Depths' };
const index = [];
for (const c of [1, 2, 3]) {
  const ch = L.CHAPTERS[c];
  const entries = [];
  const serverEntries = [];
  for (let n = ch.first; n <= ch.last; n++) {
    const src = byN.get(n);
    if (!src) { errors.push(`missing source stage_${L.pad2(n)}`); continue; }
    entries.push(toEntry(src));
    serverEntries.push({ levelId: src.id, score: { max: L.scoreMaxStage(n) } });
  }
  const key = key4(ch.first, ch.last);
  index.push({ key, first: ch.first, last: ch.last });
  const data = { kind: 'range', first: ch.first, last: ch.last, entries };
  const maxScore = Math.max(...serverEntries.map((x) => x.score.max), 0);
  built.push(record('levels.main', key, `levels.main/${key}`,
    `Campaign chapter ${c} "${chapterNames[c]}", stages ${ch.first}–${ch.last}. Built by tools/levels/export.mjs from configs/levels/campaign; do not edit by hand.`,
    data, {
      verifier: 'bounds/1',
      seed: { mode: 'perAttempt' },
      // no win.objectives: the level port endLevel (src/boot/game-ports.ts) sends none -> win_mismatch (D-DATA-12)
      moves: { min: 0, max: 9 },
      durationMs: { min: L.durationMinMs(c) },
      score: { max: maxScore },
      stars: STARS,
      gen: { generator: 'iron-burrow-authored', version: '1', curve: 'ti-v1' },
      entries: serverEntries,
    }));
}
// set record (no data.server)
const setData = {
  kind: 'set', first: 1, last: 30, afterLast: 'end',
  unlock: { mode: 'sequential' },
  chapters: [1, 2, 3].map((c) => ({ id: `c0${c}`, title: `levels.chapter.c0${c}.title`, theme: L.CHAPTERS[c].theme, first: L.CHAPTERS[c].first, last: L.CHAPTERS[c].last })),
  index,
};
built.unshift({ scope: 'levels.main', key: 'set', name: 'levels.main/set', description: 'Campaign set: 3 chapters × 10 stages, sequential unlock. Built by tools/levels/export.mjs.', visibility: 3, data: setData });
{
  const { kind, first, last, index: _i, ...game } = setData;
  for (const e of L.validateSchema(setSchema, game)) errors.push(`levels.main/set: ${e}`);
}
// Siege arena
if (!siege) errors.push('missing source configs/levels/siege/siege_pit.json');
else {
  for (const e of L.validateSchema(srcSchema, siege.data)) errors.push(`${siege.file}: ${e}`);
  built.push(record('levels.endless', 'r_0001_0001', 'levels.endless/r_0001_0001',
    'Siege arena siege_pit (endless waves; wave composition from game.siege). Built by tools/levels/export.mjs.',
    { kind: 'range', first: 1, last: 1, entries: [toEntry(siege.data)] },
    {
      verifier: 'bounds/1',
      seed: { mode: 'perAttempt' },
      durationMs: { min: 1000 },
      score: { max: L.siegeScoreMax() },
      gen: { generator: 'iron-burrow-authored', version: '1', curve: 'siege-waves-v1' },
      entries: [{ levelId: 'siege_pit' }],
    }));
}

// record-level checks (levels/1 subset + game entry schema)
const FORBIDDEN = ['solution', 'answer', 'answers', 'authoring'];
for (const r of built) {
  const where = `${r.scope}/${r.key}`;
  if (r.visibility !== 3) errors.push(`${where}: visibility must be 3`);
  if ('filters' in r) errors.push(`${where}: filters forbidden`);
  const bytes = Buffer.byteLength(JSON.stringify(r), 'utf8');
  if (bytes > MAX_BYTES) errors.push(`${where}: ${bytes} B > 80 KB`);
  const d = r.data;
  if (d.kind === 'range') {
    if (r.key !== key4(d.first, d.last)) errors.push(`${where}: key_kind_mismatch`);
    if (d.entries.length !== d.last - d.first + 1) errors.push(`${where}: entries_mismatch`);
    if (d.server.entries.length !== d.entries.length) errors.push(`${where}: server entries_mismatch`);
    const { server, ...client } = d;
    if (server.contentHash !== sha(L.jcs(client))) errors.push(`${where}: content_hash_mismatch`);
    if (!server.score?.max || !(server.moves?.min !== undefined || server.durationMs?.min !== undefined)) errors.push(`${where}: bounds/1 needs score.max and moves.min or durationMs.min`);
    d.entries.forEach((e, i) => {
      for (const x of L.validateSchema(entrySchema, e)) errors.push(`${where} entries[${i}]: ${x}`);
      if (FORBIDDEN.some((f) => f in e)) errors.push(`${where} entries[${i}]: solution/metrics in client part`);
      if (server.entries[i].levelId !== e.id) errors.push(`${where} entries[${i}]: levelId mismatch`);
    });
  }
}

// write / compare
const files = new Map(built.map((r) => [join(OUT, r.scope, `${r.key}.json`), JSON.stringify(r, null, 2) + '\n']));
for (const scope of ['levels.main', 'levels.endless']) {
  const dir = join(OUT, scope);
  if (!existsSync(dir)) continue;
  for (const f of readdirSync(dir)) if (!files.has(join(dir, f))) errors.push(`${scope}/${f}: record without source (orphan)`);
}
if (CHECK) {
  for (const [p, body] of files) {
    if (!existsSync(p)) errors.push(`${p.replace(L.ROOT, '')}: missing (run levels:export)`);
    else if (readFileSync(p, 'utf8') !== body) errors.push(`${p.replace(L.ROOT, '')}: stale (run levels:export)`);
  }
} else if (!errors.length) {
  for (const [p, body] of files) { mkdirSync(join(p, '..'), { recursive: true }); writeFileSync(p, body); }
}
for (const e of errors) console.log('FAIL ' + e);
console.log(errors.length ? `levels:export${CHECK ? ' --check' : ''} FAIL (${errors.length})` : `levels:export${CHECK ? ' --check' : ''} PASS: ${built.length} records (${[...files.keys()].map((p) => p.replace(L.ROOT, '')).join(', ')})`);
process.exit(errors.length ? 1 : 0);
