#!/usr/bin/env node
// Level validator: schema + GDD 12 §6 V1–V11 + curve/bands (docs/levels/CURVE.json) + chapter counts.
// Usage: node tools/levels/validate.mjs [--chapter N] [--write]
//   --chapter N  check only chapter N stages (authoring loop); counts are not checked
//   --write      write docs/levels/VALIDATION.json and docs/levels/INDEX.json (full run only)
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import * as L from './lib.mjs';

const args = process.argv.slice(2);
const chArg = args.includes('--chapter') ? Number(args[args.indexOf('--chapter') + 1]) : null;
const write = args.includes('--write');

const curve = L.readJson(join(L.ROOT, 'docs/levels/CURVE.json'));
const srcSchema = L.readJson(join(L.ROOT, 'configs/schemas/levels.stage.json'));
const { stages, siege } = L.loadSources();
const GDD_COUNTS = { 1: 10, 2: 10, 3: 10, siege: 1 };

const inBand = (band, v) => (curve.bands[band] || []).some(([a, b]) => v >= a && v <= b);
const results = [];
const global = [];
const seenGrids = new Map();

function check(src, isSiege) {
  const lvl = src.data;
  const errors = [...L.validateSchema(srcSchema, lvl).map((x) => 'schema: ' + x), ...L.validateMap(lvl)];
  const stats = Array.isArray(lvl.grid) && lvl.grid.length === 13 ? L.mapStats(lvl.grid) : null;
  const warnings = [];
  let band, difficulty, nearWin;
  if (isSiege) {
    band = curve.siege.band; difficulty = curve.siege.difficulty; nearWin = false;
    if (Math.abs(L.siegeWaveTI(6) - difficulty) > 0.05) errors.push(`curve: siege difficulty ${difficulty} ≠ TI(w6) ${L.siegeWaveTI(6)}`);
  } else {
    const n = lvl.index;
    band = curve.stages[String(n)];
    difficulty = L.threatIndex(n);
    nearWin = curve.nearWin.includes(n);
    if (src.file !== `configs/levels/campaign/stage_${L.pad2(n)}.json`) errors.push(`file name ≠ stage_${L.pad2(n)}.json`);
    if (!band) errors.push('curve: no band for stage');
    else if (!inBand(band, difficulty)) errors.push(`curve: TI ${difficulty} outside band ${band}`);
    if (stats) {
      for (const [tile, from] of Object.entries(curve.tileIntro)) {
        if (n === from && stats.counts[tile] > curve.tileIntroMaxCells[tile]) errors.push(`intro: stage ${n} introduces ${tile} — at most ${curve.tileIntroMaxCells[tile]} cells, got ${stats.counts[tile]}`);
        if (n === from && !stats.counts[tile]) errors.push(`intro: stage ${n} must introduce tile ${tile}`);
      }
      if (band === 'rest' && stats.openness < curve.restOpennessMin) errors.push(`rest: openness ${stats.openness} < ${curve.restOpennessMin}`);
    }
  }
  if (stats) {
    const key = lvl.grid.join('');
    if (seenGrids.has(key)) errors.push(`duplicate grid of ${seenGrids.get(key)}`);
    seenGrids.set(key, lvl.id);
  }
  const mechanics = [];
  if (stats) for (const [t, name] of [['B', 'brick'], ['S', 'steel'], ['R', 'roots'], ['O', 'oil'], ['L', 'lava']]) if (stats.counts[t]) mechanics.push(name);
  if (Array.isArray(lvl.enemies)) for (const t of ['scout', 'grunt', 'gunner', 'brute']) if (lvl.enemies.includes(t)) mechanics.push('enemy:' + t);
  if (isSiege) mechanics.push('enemy:scout', 'enemy:grunt', 'enemy:gunner', 'enemy:brute', 'waves');
  results.push({
    id: lvl.id, file: src.file, set: isSiege ? 'endless' : 'main', n: isSiege ? 1 : lvl.index, chapter: isSiege ? null : lvl.chapter,
    band, difficulty, nearWin, mechanics,
    stats: stats && { share: stats.share, symmetry: stats.symmetry, openness: stats.openness, centreSteel: stats.centreSteel },
    ok: errors.length === 0, errors, warnings,
  });
}

const pick = chArg ? stages.filter((s) => s.data.chapter === chArg || L.chapterOf(s.data.index) === chArg) : stages;
for (const s of pick) check(s, false);
if (!chArg && siege) check(siege, true);

// curve: monotonic non-decreasing TI, step limits
const camp = results.filter((r) => r.set === 'main').sort((a, b) => a.n - b.n);
for (let i = 1; i < camp.length; i++) {
  const a = camp[i - 1], b = camp[i];
  if (b.n !== a.n + 1) continue;
  if (b.difficulty < a.difficulty) global.push(`curve: TI decreases ${a.n}→${b.n}`);
  const step = (b.difficulty - a.difficulty) / a.difficulty;
  const allowed = curve.allowedSteps.some(([x, y]) => x === a.n && y === b.n);
  if (!allowed && step > curve.maxStepWithinChapter) global.push(`curve: jump ${a.n}→${b.n} +${(step * 100).toFixed(1)} % > ${curve.maxStepWithinChapter * 100} %`);
}
let counts = null;
if (!chArg) {
  counts = { 1: 0, 2: 0, 3: 0, siege: siege ? 1 : 0 };
  for (const r of camp) counts[r.chapter] = (counts[r.chapter] || 0) + 1;
  for (const k of Object.keys(GDD_COUNTS)) if (counts[k] !== GDD_COUNTS[k]) global.push(`count: chapter ${k} has ${counts[k]} levels, GDD requires ${GDD_COUNTS[k]}`);
  const ns = camp.map((r) => r.n);
  for (let n = 1; n <= 30; n++) if (!ns.includes(n)) global.push(`count: stage ${n} missing`);
}

const failed = results.filter((r) => !r.ok);
const ok = failed.length === 0 && global.length === 0;
for (const r of results) console.log(`${r.ok ? 'PASS' : 'FAIL'} ${r.id} band=${r.band} TI=${r.difficulty}${r.stats ? ` brick=${r.stats.share.B} steel=${r.stats.share.S} sym=${r.stats.symmetry} open=${r.stats.openness}` : ''}${r.ok ? '' : '\n  - ' + r.errors.join('\n  - ')}`);
for (const g of global) console.log('FAIL ' + g);
console.log(ok ? `OK: ${results.length} levels valid` : `FAILED: ${failed.length} levels, ${global.length} global issues`);

if (write && !chArg) {
  const validation = {
    generatedBy: 'node tools/levels/validate.mjs --write',
    genre: 'arcade', deterministic: false,
    note: 'Non-deterministic genre (enemy AI and power-up drops use seeded PRNG per attempt): no SOLVER.json; reachability by bot is BOT_REACH.json (core step). This file proves schema, GDD 12 §6 V1–V11 map rules, GDD 12 §2 enemy order, chapter params and curve bands.',
    status: ok ? 'PASS' : 'FAIL',
    checks: ['schema configs/schemas/levels.stage.json', 'V1 alphabet/size/Core', 'V2 Core wall', 'V3 spawn and player cells', 'V4 spawn→Core wall path', 'V5 spawn not walled in', 'V6 no pockets', 'V7 tile shares', 'V8 tile intro stages', 'V9 mirror symmetry ≥ 80 %', 'V10 enemies/params per chapter', 'V11 finals closed centre', 'tile intro light usage', 'rest openness', 'unique grids', 'TI in band', 'TI monotonic, step ≤ 8 % within chapter', 'counts per chapter = GDD'],
    counts, gddCounts: GDD_COUNTS, globalIssues: global,
    levels: results.map(({ id, file, set, n, chapter, band, difficulty, nearWin, stats, ok, errors }) => ({ id, file, set, n, chapter, band, difficulty, nearWin, stats, schema: !errors.some((e) => e.startsWith('schema')), rules: ok, errors })),
  };
  writeFileSync(join(L.ROOT, 'docs/levels/VALIDATION.json'), JSON.stringify(validation, null, 2) + '\n');
  const chapterNames = { 1: 'Clay Tunnels', 2: 'Iron Works', 3: 'Magma Depths' };
  const index = {
    version: 1,
    metric: 'TI (docs/levels/CURVE.json)',
    sets: { main: { scope: 'levels.main', records: ['set', 'r_0001_0010', 'r_0011_0020', 'r_0021_0030'] }, endless: { scope: 'levels.endless', records: ['r_0001_0001'] } },
    chapters: [1, 2, 3].map((c) => ({ id: `c0${c}`, chapter: c, name: chapterNames[c], titleKey: `levels.chapter.c0${c}.title`, theme: L.CHAPTERS[c].theme, first: L.CHAPTERS[c].first, last: L.CHAPTERS[c].last, record: `r_${String(L.CHAPTERS[c].first).padStart(4, '0')}_${String(L.CHAPTERS[c].last).padStart(4, '0')}` }))
      .concat([{ id: 'siege', chapter: null, name: 'Siege', titleKey: 'levels.siege.title', theme: 'pit', first: 1, last: 1, record: 'r_0001_0001' }]),
    levels: results.map(({ id, file, set, n, chapter, band, difficulty, nearWin, mechanics, ok }) => ({ id, file, set, n, chapter, band, difficulty, nearWin, mechanics, status: ok ? 'valid' : 'invalid' })),
  };
  writeFileSync(join(L.ROOT, 'docs/levels/INDEX.json'), JSON.stringify(index, null, 2) + '\n');
  console.log('wrote docs/levels/VALIDATION.json, docs/levels/INDEX.json');
}
process.exit(ok ? 0 : 1);
