// Rules of Iron Burrow (GDD 10, 11, 12 §2): determinism, movement, bullets, edge cases E1–E10,
// score examples, campaign composition, stars. Tiny situations are built by mutating a RunState
// created from a real stage file.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { load, stageFile } from './helpers/load.mjs';

const core = await load('core/index');
const combat = await load('core/combat');
const tun = core.createTunables();
const U = tun.unit;
const Q = U / 2;
const IDLE = { dir: null, fire: false };

const mk = (n = 1, seed = 1, extra = {}) => core.createRun({ stage: core.parseStage(stageFile(n), tun), tun, seed, ...extra });

/** A playing run on an empty field (bricks gone), no spawns, enemies frozen, player unshielded. */
function scene(n = 1) {
  const run = mk(n);
  run.field.mat.fill(0);
  run.queue = [];
  run.phase = 'playing';
  run.phaseTicks = 0;
  run.player.shield = 0;
  run.freeze = 1e9;
  return run;
}

function enemy(run, type, x, y, extra = {}) {
  const e = { id: run.nextId++, type, slot: 1, wave: run.wave, x, y, dir: 2, moved: 0, hp: tun.enemies[type].hp, carrier: false,
    spawning: 0, decisionTimer: 0, fireTimer: 0, wantDecision: false, stuck: 0, fire: false, fireDir: 2, ...extra };
  run.enemies.push(e);
  return e;
}

/** A bullet whose box centre is at (cx, cy). */
function bullet(run, owner, cx, cy, dir, extra = {}) {
  const half = U / 8;
  const b = { id: run.nextId++, owner, x: cx - half, y: cy - half, dir, speed: tun.bulletSpeed, steel: false, ...extra };
  run.bullets.push(b);
  return b;
}

const setMat = (run, qx, qy, m) => { run.field.mat[qy * run.field.qs + qx] = m; };
const matAt = (run, qx, qy) => run.field.mat[qy * run.field.qs + qx];
const events = (run, t) => run.events.filter((e) => e.t === t);

function hash(run) {
  let h = 0x811c9dc5;
  const text = JSON.stringify({ tick: run.tick, phase: run.phase, score: run.score, lives: run.lives, destroyed: run.destroyed,
    player: run.player, enemies: run.enemies, bullets: run.bullets, powerup: run.powerup, ai: run.rngAI.state, drop: run.rngDrop.state,
    mat: Array.from(run.field.mat).join('') });
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 0x01000193) >>> 0;
  return h;
}

function replay(seed, ticks) {
  const run = mk(3, seed);
  let r = 7;
  for (let i = 0; i < ticks; i++) {
    r = (Math.imul(r, 1103515245) + 12345) >>> 0;
    const dir = [null, 0, 1, 2, 3][(r >>> 8) % 5];
    core.step(run, { dir, fire: ((r >>> 16) & 3) === 0 });
  }
  return hash(run);
}

test('same seed and commands give the same state; another seed another one', () => {
  const a = replay(42, 1500);
  assert.equal(replay(42, 1500), a);
  assert.notEqual(replay(43, 1500), a);
});

test('D-10-03: a 90° turn aligns to the nearest quarter line, a 180° turn does not', () => {
  const run = scene();
  Object.assign(run.player, { x: 4 * U, y: 10 * U + 140, dir: 0 });
  core.step(run, { dir: 1, fire: false });
  assert.equal(run.player.y, 10 * U);
  assert.equal(run.player.x, 4 * U + tun.playerSpeed);
  Object.assign(run.player, { x: 4 * U, y: 10 * U + Q / 2, dir: 0 });
  core.step(run, { dir: 1, fire: false });
  assert.equal(run.player.y, 10 * U + Q, 'exactly in the middle goes to the larger line');
  Object.assign(run.player, { x: 4 * U + 70, y: 8 * U, dir: 0 });
  core.step(run, { dir: 2, fire: false });
  assert.equal(run.player.x, 4 * U + 70);
});

/** Steps until a bullet event or `max` ticks; returns the tick's events. */
function untilHit(run, max = 40, cmd = IDLE) {
  for (let i = 0; i < max; i++) {
    core.step(run, i === 0 ? cmd : IDLE);
    if (run.events.some((e) => e.t === 'tile' || e.t === 'bullet_block')) return run.events;
  }
  throw new Error('no hit');
}

test('bullet vs quarters: a strip one cell wide across the flight, one quarter row deep', () => {
  const run = scene();
  for (const qx of [8, 9, 10, 11]) for (const qy of [12, 13]) setMat(run, qx, qy, core.MAT.brick);
  Object.assign(run.player, { x: 4 * U + Q / 2, y: 8 * U, dir: 0 });
  untilHit(run, 40, { dir: null, fire: true });
  assert.deepEqual([8, 9, 10, 11].map((qx) => matAt(run, qx, 13)), [0, 0, 0, 1], 'half-covered quarters break');
  assert.deepEqual([8, 9, 10, 11].map((qx) => matAt(run, qx, 12)), [1, 1, 1, 1], 'one row deep');
});

test('steel breaks only by an L3 bullet', () => {
  for (const [gun, broken] of [[0, false], [2, false], [3, true]]) {
    const run = scene();
    setMat(run, 8, 13, core.MAT.steel);
    setMat(run, 9, 13, core.MAT.steel);
    Object.assign(run.player, { x: 4 * U, y: 8 * U, dir: 0, gun });
    const ev = untilHit(run, 40, { dir: null, fire: true });
    assert.equal(matAt(run, 8, 13) === 0, broken, `gun ${gun}`);
    assert.equal(ev.some((e) => e.t === 'bullet_block'), !broken);
  }
});

test('E1: Core hit and the 20th kill in the same tick → defeated', () => {
  const run = scene();
  run.destroyed = tun.stageEnemies - 1;
  const e = enemy(run, 'grunt', 1 * U, 1 * U);
  bullet(run, 0, e.x + Q, e.y + U + 60, 0);
  bullet(run, e.id, 6.5 * U, 12 * U - 100, 2);
  core.step(run);
  assert.equal(run.destroyed, tun.stageEnemies);
  assert.equal(run.phase, 'defeated');
  assert.equal(run.cause, 'core');
});

test('E2: last life lost in the tick the 20th enemy dies → defeated', () => {
  const run = scene();
  run.destroyed = tun.stageEnemies - 1;
  run.lives = 1;
  const e = enemy(run, 'grunt', 1 * U, 1 * U);
  bullet(run, 0, e.x + Q, e.y + U + 60, 0);
  const p = run.player;
  bullet(run, e.id, p.x + Q, p.y - 60, 2);
  core.step(run);
  assert.equal(run.destroyed, tun.stageEnemies);
  assert.equal(run.phase, 'defeated');
  assert.equal(run.cause, 'lives');
});

test('E3: an enemy bullet into an enemy: no damage, the bullet is gone', () => {
  const run = scene();
  const grunt = enemy(run, 'grunt', 1 * U, 1 * U);
  const brute = enemy(run, 'brute', 1 * U, 3 * U);
  bullet(run, grunt.id, brute.x + Q, brute.y - 60, 2);
  core.step(run);
  assert.equal(brute.hp, tun.enemies.brute.hp);
  assert.equal(run.bullets.length, 0);
  assert.equal(events(run, 'bullet_block').length, 1);
});

test('E4: the own bullet into the Core → defeat, cause core', () => {
  const run = scene();
  bullet(run, 0, 6.5 * U, 12 * U - 100, 2);
  core.step(run);
  assert.deepEqual(events(run, 'core_destroyed'), [{ t: 'core_destroyed', owner: 0 }]);
  assert.equal(run.phase, 'defeated');
  assert.equal(run.cause, 'core');
});

test('E5: player and enemy bullets clash above the Core: both gone, Core intact', () => {
  const run = scene();
  const e = enemy(run, 'grunt', 1 * U, 1 * U);
  bullet(run, 0, 6.5 * U, 11 * U + 100, 0);
  bullet(run, e.id, 6.5 * U, 11 * U + 100 - 2 * tun.bulletSpeed, 2);
  core.step(run);
  assert.equal(events(run, 'clash').length, 1);
  assert.equal(run.bullets.length, 0);
  assert.equal(run.coreAlive, true);
  assert.equal(run.phase, 'playing');
});

test('E6: two bullets hit one quarter in a tick: the first breaks, the second flies on', () => {
  const run = scene();
  setMat(run, 8, 13, core.MAT.brick);
  setMat(run, 9, 13, core.MAT.brick);
  const first = bullet(run, 0, 4.5 * U, 7 * U + 40 + tun.bulletSpeed, 0);
  const second = bullet(run, 0, 4.5 * U, 7 * U + 50 + tun.bulletSpeed, 0);
  core.step(run);
  assert.equal(events(run, 'tile').length, 1);
  assert.deepEqual(run.bullets.map((b) => b.id), [second.id]);
  assert.ok(first.id < second.id);
  assert.equal(matAt(run, 8, 13), 0);
});

test('E7: a tank against brick fires: the quarter breaks in the same tick', () => {
  const run = scene();
  setMat(run, 8, 15, core.MAT.brick);
  setMat(run, 9, 15, core.MAT.brick);
  Object.assign(run.player, { x: 4 * U, y: 8 * U, dir: 0 });
  core.step(run, { dir: null, fire: true });
  assert.equal(events(run, 'shot').length, 1);
  assert.equal(events(run, 'tile').length, 1);
  assert.equal(matAt(run, 8, 15), 0);
  assert.equal(run.bullets.length, 0);
});

test('E8: the bullets of a dead player still kill and score', () => {
  const run = scene();
  Object.assign(run.player, { alive: false, respawn: 1e6 });
  const e = enemy(run, 'scout', 1 * U, 1 * U);
  bullet(run, 0, e.x + Q, e.y + U + 60, 0);
  core.step(run);
  assert.equal(events(run, 'kill').length, 1);
  assert.equal(run.score, tun.enemies.scout.points);
});

test('E10: quake kills the last enemies with no points and clears', () => {
  const run = scene();
  run.destroyed = tun.stageEnemies - 2;
  enemy(run, 'grunt', 1 * U, 1 * U);
  enemy(run, 'brute', 8 * U, 1 * U);
  const p = run.player;
  run.powerup = { type: 'quake', col: p.x / U, row: p.y / U, ttl: 100 };
  core.step(run);
  assert.deepEqual(events(run, 'kill').map((k) => [k.points, k.by]), [[0, 'quake'], [0, 'quake']]);
  assert.equal(run.phase, 'cleared');
  assert.equal(run.score, tun.score.pickup + tun.score.clear + tun.score.life * run.lives);
});

/** Plays a stage out by mutation: deaths, pickups, the quake kills (no points), the rest by bullets. */
function finish(n, { deaths = 0, pickups = 0, quake = [], continues = 0, extraLives = 0, lives } = {}) {
  const run = mk(n, 1, { extraLives });
  run.queue = [];
  run.phase = 'playing';
  const left = [...run.stage.enemies];
  for (const type of quake) left.splice(left.indexOf(type), 1);
  for (const type of left) combat.destroyEnemy(run, enemy(run, type, 0, 0), 'bullet');
  for (const type of quake) combat.destroyEnemy(run, enemy(run, type, 0, 0), 'quake');
  for (let i = 0; i < pickups; i++) combat.applyPowerup(run, 'freeze');
  for (let i = 0; i < deaths; i++) combat.killPlayer(run);
  run.continues = continues;
  if (lives !== undefined) run.lives = lives;
  run.freeze = 0;
  core.step(run);
  assert.equal(run.phase, 'cleared');
  return run;
}

test('GDD 11 §3 examples 1–4, 6: stage scores and stars', () => {
  let run = finish(1, { pickups: 2 });
  assert.deepEqual([run.score, core.stars(run)], [5700, 3]);
  run = finish(1, { pickups: 1, deaths: 2 });
  assert.deepEqual([run.score, core.stars(run)], [4200, 1]);
  run = finish(11, { extraLives: 1, deaths: 1, pickups: 3, quake: ['grunt', 'grunt', 'scout'] });
  assert.deepEqual([run.score, core.stars(run)], [7400, 2]);
  run = finish(5, { pickups: 2 });
  assert.deepEqual([run.score, core.stars(run)], [6200, 3]);
  run = finish(7, { pickups: 1, continues: 1, lives: 2 });
  assert.deepEqual([run.score, core.stars(run)], [5500, 1]);
});

test('stars: 3 without a lost life, 2 with one, 1 with more or after a continue, 0 unless cleared', () => {
  const run = mk(1);
  assert.equal(core.stars(run), 0);
  run.phase = 'cleared';
  for (const [deaths, continues, want] of [[0, 0, 3], [1, 0, 2], [2, 0, 1], [5, 0, 1], [0, 1, 1]]) {
    Object.assign(run, { deaths, continues });
    assert.equal(core.stars(run), want, `deaths ${deaths} continues ${continues}`);
  }
});

test('Siege kill multiplier (D-11-02) and the stage maximum (D-11-04)', () => {
  const run = core.createRun({ stage: core.parseStage(stageFile('siege'), tun), tun, seed: 5 });
  const cases = [[1, 'grunt', 100], [3, 'scout', 240], [4, 'gunner', 390], [7, 'brute', 640], [12, 'gunner', 630],
    [15, 'scout', 480], [20, 'brute', 1160], [25, 'brute', 1360]];
  for (const [wave, type, want] of cases) assert.equal(core.killPoints(run, { type, wave }), want, `w${wave} ${type}`);
  assert.equal(core.maxStageScore(mk(30)), 11700);
});

test('campaign composition: campaignOrder(n) equals the enemies of every stage file', () => {
  const differ = [];
  for (let n = 1; n <= 30; n++) {
    if (JSON.stringify(core.campaignOrder(n)) !== JSON.stringify(stageFile(n).enemies)) differ.push(n);
  }
  assert.deepEqual(differ, []);
});

test('continue (D-10-07): lives, Core back, enemies to the queue head, star cap', () => {
  const run = scene();
  enemy(run, 'gunner', 1 * U, 1 * U, { slot: 7 });
  run.coreAlive = false;
  core.step(run);
  assert.equal(run.phase, 'defeated');
  core.applyContinue(run);
  assert.equal(run.lives, tun.boosters.continueLives);
  assert.equal(run.coreAlive, true);
  assert.deepEqual(run.queue[0], { type: 'gunner', slot: 7 });
  assert.equal(run.enemies.length, 0);
  assert.equal(run.phase, 'intro');
});

test('GDD 12 §3: an enemy blocked by brick shoots the brick even when it turns away in the same tick', () => {
  const run = scene();
  run.freeze = 0;
  run.player.x = 0; run.player.y = 12 * U;
  // Enemy at cell (6,4) facing left, a brick cell to its left at (5,4).
  for (let k = 0; k < 4; k++) setMat(run, 10 + (k & 1), 8 + (k >> 1), 1);
  const e = enemy(run, 'grunt', 6 * U, 4 * U, { dir: 3 });
  run.rngAI = Object.assign(() => 0.99, { state: 0 }); // never keep the direction: it turns
  core.step(run, IDLE);
  const shot = run.bullets.find((b) => b.owner === e.id);
  assert.ok(shot || events(run, 'tile').length, 'the enemy fired');
  if (shot) assert.equal(shot.dir, 3);
  else assert.ok(events(run, 'tile').some((t) => t.quarters.some(([qx]) => qx === 11)));
});

test('GDD 12 §3: an enemy blocked by the player (not by a tile) turns instead of shooting', () => {
  const run = scene();
  run.freeze = 0;
  // Brick above the enemy's neighbour row is irrelevant: the player is the blocker below it.
  const e = enemy(run, 'grunt', 6 * U, 4 * U, { dir: 2 });
  run.player.x = 6 * U; run.player.y = 5 * U;
  for (let k = 0; k < 4; k++) setMat(run, 12 + (k & 1), 12 + (k >> 1), 1);
  run.rngAI = Object.assign(() => 0.99, { state: 0 });
  core.step(run, IDLE);
  assert.equal(run.bullets.filter((b) => b.owner === e.id).length, 0);
  assert.equal(run.player.alive, true);
});
