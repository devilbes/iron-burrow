// The level controller against fake services that count every call: win, defeat, service
// failures and their retries, booster consumes, no extra calls, next / retry, Siege.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { load, stageFile } from './helpers/load.mjs';

const { createLevelController } = await load('controller/index');
const core = await load('core/index');
const tun = core.createTunables();

const flush = async () => { for (let i = 0; i < 10; i++) await new Promise((resolve) => setImmediate(resolve)); };

function fakeClock() {
  let now = 0;
  let seq = 0;
  const timers = new Map();
  return {
    now: () => now,
    setTimeout(fn, ms) { const id = ++seq; timers.set(id, { at: now + ms, fn }); return id; },
    clearTimeout(id) { timers.delete(id); },
    pending: () => timers.size,
    async advance(ms) {
      const end = now + ms;
      for (;;) {
        await flush();
        const due = [...timers].filter(([, t]) => t.at <= end).sort((a, b) => a[1].at - b[1].at)[0];
        if (!due) break;
        timers.delete(due[0]);
        now = due[1].at;
        due[1].fn();
      }
      now = end;
      await flush();
    },
  };
}

const deferred = () => { let resolve; let reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; };

/** Level ports of a set; `opts.end` decides each endLevel answer (value, Error to reject, or a promise). */
function levelSet(calls, log, prefix, file, opts) {
  return {
    async level(n) { calls[`${prefix}level`]++; log.push(`${prefix}level`); return { n, last: opts.last ?? 30, id: `l${n}`, entry: file(n) }; },
    async beginAttempt(n) {
      calls[`${prefix}beginAttempt`]++; log.push(`${prefix}beginAttempt`);
      if (opts.beginFails) throw new Error('offline');
      return { seed: `seed-${n}` };
    },
    async endLevel(n, won, stats) {
      calls[`${prefix}endLevel`]++; log.push(`${prefix}endLevel`);
      opts.endArgs.push([n, won, { ...stats }]);
      const answer = opts.end ? opts.end(calls[`${prefix}endLevel`]) : { verified: true, stars: 2 };
      if (answer instanceof Error) throw answer;
      return answer;
    },
  };
}

function fakes(opts = {}) {
  const calls = { currentLevel: 0, level: 0, beginAttempt: 0, endLevel: 0, loadSave: 0, save: 0, consume: 0,
    siegelevel: 0, siegebeginAttempt: 0, siegeendLevel: 0 };
  const log = [];
  const tracks = [];
  const saves = [];
  const consumes = [];
  opts.endArgs = [];
  const quantity = { bubble: 2, shockwave: 1, fortify: 1, hull: 1, ...opts.quantity };
  const campaign = {
    async currentLevel() { calls.currentLevel++; log.push('currentLevel'); return opts.current ?? 1; },
    ...levelSet(calls, log, '', stageFile, opts),
    async loadSave() { calls.loadSave++; log.push('loadSave'); return opts.save ?? null; },
    async save(state) { calls.save++; log.push('save'); saves.push(state); },
    track(event, params) { tracks.push([event, params]); },
  };
  const siegeOpts = { endArgs: [], end: opts.siegeEnd };
  const siege = levelSet(calls, log, 'siege', () => stageFile('siege'), siegeOpts);
  const inventory = {
    quantity: (kind) => quantity[kind] ?? 0,
    async consume(kind, options) {
      calls.consume++; log.push(`consume:${kind}`);
      consumes.push([kind, options]);
      if (opts.consumeFails?.[kind]) throw new Error('consume failed');
      quantity[kind]--;
    },
  };
  const clock = fakeClock();
  let id = 0;
  const ctl = createLevelController({ campaign, siege, inventory, clock, uuid: () => `uuid-${++id}` });
  const seen = [];
  ctl.on((event) => seen.push(event));
  /** Network calls (track is fire-and-forget and not counted). */
  const total = () => Object.values(calls).reduce((sum, n) => sum + n, 0);
  return { ctl, calls, log, tracks, saves, consumes, clock, seen, total, opts, siegeOpts, quantity };
}

let wall = 0;
/** Feeds frames of 50 ms (3 ticks each) until `until()` or `max` frames. */
function frames(ctl, max, until = () => false) {
  for (let i = 0; i < max && !until(); i++) ctl.frame((wall += 50));
}

/** Skips the intro and makes the stage clear on the next tick. */
function forceClear(run) {
  Object.assign(run, { phase: 'playing', phaseTicks: 0, queue: [], enemies: [], destroyed: tun.stageEnemies });
}

/** Skips the intro and destroys the Core on the next tick. */
function forceCoreLoss(run) {
  Object.assign(run, { phase: 'playing', phaseTicks: 0, coreAlive: false });
}

const results = (seen) => seen.filter((e) => e.t === 'result');

async function winStage(f, gun = 2) {
  const run = f.ctl.run;
  run.player.gun = gun;
  forceClear(run);
  frames(f.ctl, 200, () => f.ctl.phase === 'ending' || f.ctl.phase === 'result');
  assert.ok(['ending', 'result'].includes(f.ctl.phase));
  await flush();
}

test('(a) win: one call of each, save once after the answer, server stars on the answer', async () => {
  const f = fakes({ save: { other: 'x', campaign: { selected_chapter: 2 } } });
  const answer = deferred();
  f.opts.end = () => answer.promise;
  assert.equal(await f.ctl.start({ mode: 'campaign' }), true);
  assert.equal(f.ctl.phase, 'intro');
  await winStage(f, 2);
  assert.equal(results(f.seen).length, 0, 'no result before the answer');
  assert.equal(f.calls.save, 0, 'no save before the answer');
  answer.resolve({ verified: true, stars: 2 });
  await flush();
  const [result] = results(f.seen);
  assert.deepEqual(result.outcome, { mode: 'campaign', stage: 1, wave: 0, won: true, verified: true, stars: 2,
    score: tun.score.clear + tun.score.life * tun.lives, localStars: 3 });
  assert.equal(f.ctl.phase, 'result');
  assert.deepEqual([f.calls.currentLevel, f.calls.level, f.calls.beginAttempt, f.calls.endLevel, f.calls.loadSave, f.calls.save],
    [1, 1, 1, 1, 1, 1]);
  assert.deepEqual(f.log.slice(-2), ['endLevel', 'save']);
  assert.deepEqual(f.saves[0], { other: 'x', campaign: { selected_chapter: 2, gun_level: 2, last_stage: 1,
    best: { 1: result.outcome.score } } });
  const [n, won, stats] = f.opts.endArgs[0];
  assert.deepEqual([n, won, stats.score], [1, true, result.outcome.score]);
  // `moves` = lives lost (D-LVL-03): none in this run.
  assert.equal(stats.moves, 0);
  assert.equal(f.clock.pending(), 0);
  assert.deepEqual(f.tracks.map(([e]) => e), ['an.stage_start', 'an.stage_end']);
});

test('(a) win with an unchanged gun carry and best score writes no save', async () => {
  const f = fakes({ save: { campaign: { gun_level: 0, last_stage: 1, best: { 1: Number.MAX_SAFE_INTEGER } } } });
  await f.ctl.start({ mode: 'campaign', stage: 1 });
  await winStage(f, 0);
  assert.equal(f.ctl.phase, 'result');
  assert.deepEqual([f.calls.endLevel, f.calls.loadSave, f.calls.save], [1, 1, 0]);
});

test('(a) a score over the stage maximum is not sent as a won level end (D-11-04)', async () => {
  const f = fakes();
  await f.ctl.start({ mode: 'campaign', stage: 1 });
  f.ctl.run.score = 1e6;
  await winStage(f);
  assert.equal(f.calls.endLevel, 0);
  assert.equal(results(f.seen)[0].outcome.verified, false);
  assert.equal(f.calls.save, 0);
});

test('(b) defeat: Core lost → defeat event, concede sends a lost level end once, no save', async () => {
  const f = fakes();
  await f.ctl.start({ mode: 'campaign', stage: 1 });
  f.ctl.run.score = 700;
  forceCoreLoss(f.ctl.run);
  frames(f.ctl, 200, () => f.ctl.phase === 'defeated');
  const defeat = f.seen.find((e) => e.t === 'defeat');
  assert.deepEqual(defeat, { t: 'defeat', canContinue: true, score: 700, cause: 'core' });
  await f.ctl.concede();
  await f.ctl.concede();
  assert.equal(f.calls.endLevel, 1);
  assert.deepEqual(f.opts.endArgs[0][1], false);
  assert.equal(f.opts.endArgs[0][2].score, 0, 'D-11-01: a defeat score is not recorded');
  assert.equal(f.calls.save, 0);
  assert.equal(f.ctl.phase, 'result');
  assert.equal(results(f.seen)[0].outcome.won, false);
});

test('(b) continue: the Spare Hull is consumed first, then the run goes on', async () => {
  const f = fakes();
  await f.ctl.start({ mode: 'campaign', stage: 1 });
  forceCoreLoss(f.ctl.run);
  frames(f.ctl, 200, () => f.ctl.phase === 'defeated');
  assert.equal(await f.ctl.continueWithHull(), true);
  assert.equal(f.consumes[0][0], 'hull');
  assert.equal(f.ctl.run.lives, tun.boosters.continueLives);
  assert.equal(f.ctl.phase, 'intro');
  forceCoreLoss(f.ctl.run);
  frames(f.ctl, 200, () => f.ctl.phase === 'defeated');
  assert.equal(f.seen.filter((e) => e.t === 'defeat').at(-1).canContinue, false, 'continue cap');
  assert.equal(await f.ctl.continueWithHull(), false);
});

test('(c) beginAttempt rejects: phase error, start_failed, no level end', async () => {
  const f = fakes({ beginFails: true });
  assert.equal(await f.ctl.start({ mode: 'campaign', hull: 1 }), false);
  assert.equal(f.ctl.phase, 'error');
  assert.ok(f.seen.some((e) => e.t === 'start_failed'));
  assert.deepEqual([f.calls.endLevel, f.calls.consume, f.calls.save], [0, 0, 0]);
  assert.equal(f.ctl.run, null);
});

test('(c) level end fails twice: retried after 2 s and 4 s with the same call, result once', async () => {
  const f = fakes();
  f.opts.end = (n) => (n <= 2 ? new Error('lost') : { verified: true, stars: 3 });
  await f.ctl.start({ mode: 'campaign', stage: 1 });
  await winStage(f);
  assert.equal(f.calls.endLevel, 1);
  await f.clock.advance(tun.levelEndRetryMs[0] - 1);
  assert.equal(f.calls.endLevel, 1);
  await f.clock.advance(1);
  assert.equal(f.calls.endLevel, 2);
  await f.clock.advance(tun.levelEndRetryMs[1] - 1);
  assert.equal(f.calls.endLevel, 2);
  await f.clock.advance(1);
  assert.equal(f.calls.endLevel, 3);
  assert.equal(f.ctl.phase, 'result');
  assert.equal(results(f.seen).length, 1);
  assert.equal(results(f.seen)[0].outcome.stars, 3);
  assert.ok(f.opts.endArgs.every((args) => JSON.stringify(args) === JSON.stringify(f.opts.endArgs[0])));
  assert.equal(f.clock.pending(), 0);
});

test('(c) all level end retries fail: end_failed, then retryEnd sends it once more', async () => {
  const f = fakes();
  let fail = true;
  f.opts.end = () => (fail ? new Error('lost') : { verified: true, stars: 1 });
  await f.ctl.start({ mode: 'campaign', stage: 1 });
  await winStage(f);
  await f.clock.advance(tun.levelEndRetryMs.reduce((a, b) => a + b, 0));
  assert.equal(f.calls.endLevel, 1 + tun.levelEndRetryMs.length);
  assert.equal(f.ctl.phase, 'end_failed');
  assert.equal(f.clock.pending(), 0);
  await f.clock.advance(600000);
  assert.equal(f.calls.endLevel, 1 + tun.levelEndRetryMs.length, 'no other retries');
  fail = false;
  assert.equal(await f.ctl.retryEnd(), true);
  assert.equal(f.calls.endLevel, 2 + tun.levelEndRetryMs.length);
  assert.equal(f.ctl.phase, 'result');
  assert.equal(results(f.seen).length, 1);
});

test('(c) battle booster consume fails: effect applied, 1+3 calls with one key, then disabled', async () => {
  const f = fakes({ consumeFails: { bubble: true } });
  await f.ctl.start({ mode: 'campaign', stage: 1 });
  const run = f.ctl.run;
  frames(f.ctl, 100, () => f.ctl.phase === 'playing');
  run.player.shield = 0;
  assert.equal(f.ctl.useBooster('bubble'), true);
  assert.equal(f.ctl.useBooster('bubble'), false, 'one queued use at a time');
  frames(f.ctl, 1);
  assert.ok(run.player.shield > tun.ticks.bubbleBooster - 5, 'effect applied at once');
  assert.equal(f.calls.consume, 1);
  for (const [i, ms] of tun.consumeRetryMs.entries()) {
    await f.clock.advance(ms);
    assert.equal(f.calls.consume, i + 2);
  }
  assert.equal(f.calls.consume, 1 + tun.consumeRetryMs.length);
  assert.equal(new Set(f.consumes.map(([, o]) => o.idempotencyKey)).size, 1);
  assert.deepEqual(f.seen.filter((e) => e.t === 'booster_failed'), [{ t: 'booster_failed', kind: 'bubble' }]);
  run.player.shield = 0;
  run.boosterCooldown = 0;
  assert.equal(f.ctl.useBooster('bubble'), false, 'disabled until the end of the stage');
  assert.equal(f.ctl.canUse('shockwave') || f.ctl.canUse('fortify'), true, 'other kinds stay on');
  assert.equal(f.clock.pending(), 0);
});

test('(c) Spare Hull: a failed consume adds no life; a confirmed one does', async () => {
  const bad = fakes({ consumeFails: { hull: true } });
  const started = bad.ctl.start({ mode: 'campaign', stage: 1, hull: 1 });
  await bad.clock.advance(tun.consumeRetryMs.reduce((a, b) => a + b, 0));
  assert.equal(await started, true);
  assert.equal(bad.ctl.run.lives, tun.lives);
  assert.ok(bad.seen.some((e) => e.t === 'booster_failed' && e.kind === 'hull'));
  const good = fakes();
  assert.equal(await good.ctl.start({ mode: 'campaign', stage: 1, hull: 5 }), true);
  assert.equal(good.calls.consume, tun.boosters.hullPrestage);
  assert.equal(good.ctl.run.lives, tun.lives + tun.boosters.hullPrestage);
  assert.ok(good.log.indexOf('consume:hull') > good.log.indexOf('beginAttempt'), 'after the attempt, before the run');
});

test('(d) one whole level makes only the minimum service calls; frames call nothing until the end', async () => {
  const f = fakes();
  await f.ctl.start({ mode: 'campaign' });
  // currentLevel, loadSave, level, beginAttempt.
  assert.equal(f.total(), 4);
  let r = 1;
  for (let i = 0; i < 200; i++) {
    r = (Math.imul(r, 1103515245) + 12345) >>> 0;
    f.ctl.setInput([null, 0, 1, 2, 3][(r >>> 8) % 5], false);
    f.ctl.frame((wall += 50));
  }
  f.ctl.pause();
  frames(f.ctl, 20);
  const tick = f.ctl.run.tick;
  f.ctl.resume();
  assert.equal(f.ctl.run.tick, tick, 'no ticks while paused');
  f.ctl.setInput(null, false);
  assert.equal(f.total(), 4, 'nothing from frame() while playing');
  await winStage(f, 1);
  // + endLevel, save.
  assert.equal(f.total(), 6);
  assert.equal(f.ctl.phase, 'result');
  assert.equal(f.clock.pending(), 0);
  frames(f.ctl, 20);
  await f.clock.advance(100000);
  assert.equal(f.total(), 6);
});

test('(d) frame: at most maxTicksPerFrame ticks, long gaps cut', async () => {
  const f = fakes();
  await f.ctl.start({ mode: 'campaign', stage: 1 });
  f.ctl.frame((wall += 1));
  f.ctl.frame((wall += 10000));
  assert.equal(f.ctl.run.tick, tun.maxTicksPerFrame);
  f.ctl.frame((wall += 1000 / tun.tps * 2));
  assert.equal(f.ctl.run.tick, tun.maxTicksPerFrame + 2);
});

test('(e) next(): stage n+1 with the carried gun, no second loadSave; retry() starts with gun 0', async () => {
  const f = fakes();
  await f.ctl.start({ mode: 'campaign' });
  await winStage(f, 2);
  assert.equal(await f.ctl.next(), true);
  assert.equal(f.ctl.stage, 2);
  assert.equal(f.ctl.run.player.gun, 2);
  assert.deepEqual([f.calls.currentLevel, f.calls.loadSave, f.calls.level, f.calls.beginAttempt], [1, 1, 2, 2]);
  await winStage(f, 3);
  assert.equal(await f.ctl.retry(), true);
  assert.equal(f.ctl.stage, 2);
  assert.equal(f.ctl.run.player.gun, 0);
  assert.equal(f.calls.loadSave, 1);
});

test('(e) the carry comes back from the save after a reload', async () => {
  const f = fakes({ save: { campaign: { gun_level: 3, last_stage: 4 } }, current: 5 });
  await f.ctl.start({ mode: 'campaign' });
  assert.equal(f.ctl.run.player.gun, 3);
  await f.ctl.exit();
  assert.equal(f.ctl.phase, 'idle');
  await f.ctl.start({ mode: 'campaign', stage: 5 });
  assert.equal(f.ctl.run.player.gun, 0, 'used once');
  assert.equal(f.calls.loadSave, 1);
});

test('(b) retry() after a defeat concedes first', async () => {
  const f = fakes();
  await f.ctl.start({ mode: 'campaign', stage: 3 });
  forceCoreLoss(f.ctl.run);
  frames(f.ctl, 200, () => f.ctl.phase === 'defeated');
  assert.equal(await f.ctl.retry(), true);
  assert.deepEqual(f.opts.endArgs.map(([n, won]) => [n, won]), [[3, false]]);
  assert.ok(f.log.indexOf('endLevel') < f.log.lastIndexOf('beginAttempt'));
  assert.equal(f.ctl.stage, 3);
});

test('(e) Siege: the Siege ports, the run end sent as won with the score, no save', async () => {
  const f = fakes({ quantity: { hull: 5 } });
  assert.equal(await f.ctl.start({ mode: 'siege', hull: 5 }), true);
  assert.deepEqual([f.calls.siegelevel, f.calls.siegebeginAttempt, f.calls.level, f.calls.beginAttempt, f.calls.loadSave, f.calls.currentLevel],
    [1, 1, 0, 0, 0, 0]);
  assert.equal(f.calls.consume, tun.boosters.hullPrestage * tun.boosters.siegeMult);
  assert.equal(f.ctl.run.siege, true);
  f.ctl.run.score = 1234;
  forceCoreLoss(f.ctl.run);
  frames(f.ctl, 200, () => f.ctl.phase === 'defeated');
  await f.ctl.concede();
  assert.deepEqual(f.siegeOpts.endArgs.map(([n, won, s]) => [n, won, s.score]), [[1, true, 1234]]);
  assert.deepEqual([f.calls.endLevel, f.calls.save], [0, 0]);
  assert.deepEqual(results(f.seen)[0].outcome.won, false);
  assert.equal(await f.ctl.next(), false, 'no next in Siege');
});

test('dispose leaves no timers and ignores late answers', async () => {
  const f = fakes();
  f.opts.end = () => new Error('lost');
  await f.ctl.start({ mode: 'campaign', stage: 1 });
  await winStage(f);
  assert.equal(f.clock.pending(), 1);
  f.ctl.dispose();
  assert.equal(f.clock.pending(), 0);
  await f.clock.advance(100000);
  assert.equal(f.calls.endLevel, 1);
});
