import { SDK_RELOAD_REQUIRED, type Sdk } from '@manygamescorp/core/kernel';
import { SDKError } from '@manygamescorp/core/error';
import type { JsonObject } from '@manygamescorp/core/data-validation';
import type { GameStateApi } from '@manygamescorp/mod-profile-pack/state';
import type { Progress } from '@manygamescorp/mod-progress/progress';
import type { AppliedLevel, LevelHandle, Levels } from '@manygamescorp/mod-progress/levels';
import { GAME_MODULE_ID, type GamePorts, type GameState, type Level, type LevelResult } from
  '../modules/game/index.js';
import { LEVEL_SET, LEVEL_SET_RECORD, MODULES, PROGRESS } from './ids.js';
import type { GrantFollowUp } from './grants.js';
import { withCompletedStep, type ProgressStore } from './progress-state.js';

/** The attempt in play, in memory only: a page reload starts the level again. */
interface Attempt {
  readonly level: number;
  /** Event id of the level end: a repeated send after a lost answer is a no-op on the server. */
  readonly eventId: string;
  readonly seed: string;
  readonly startedAt: number;
  /** Pinned on the first send, so a repeat carries identical facts. */
  durationMs?: number;
}

/** The opt-in cloud save: nothing is read before the game asks, then written with its version. */
function createSave(state: () => GameStateApi): Pick<GamePorts, 'loadSave' | 'save'> & { reset(): void } {
  let version: number | undefined;
  let data: GameState | null = null;
  const load = async (): Promise<GameState | null> => {
    const current = await state().get();
    version = current.version;
    data = Object.keys(current.data).length ? current.data : null;
    return data;
  };
  const write = async (next: GameState | null): Promise<void> => {
    const options = { version: version ?? 0, idempotencyKey: crypto.randomUUID() };
    const written = next ? await state().set(next as JsonObject, options) : await state().clear(options);
    version = written.version;
    data = next;
  };
  let writes: Promise<unknown> = Promise.resolve();
  return {
    async loadSave() { return version === undefined ? load() : data; },
    save(next) {
      const run = async (): Promise<void> => {
        if (version === undefined) await load();
        try { await write(next); } catch (error) {
          // Another device wrote meanwhile: take its version and write once more.
          if (!(error instanceof SDKError && error.httpStatus === 409)) throw error;
          await load();
          await write(next);
        }
      };
      const task = writes.then(run, run);
      writes = task.catch(() => undefined);
      return task;
    },
    reset() { version = undefined; data = null; },
  };
}

/**
 * GamePorts on the SDK: levels through the levels module (a range record is fetched once and the
 * next one prefetched by the module), the level to play from the progress read once per
 * session, the attempt and its verified end through progress. No polling: the level end returns
 * with the server's answer; its reward arrives as a grant (`grants.ts`). The placeholder screen
 * does not call the ports.
 */
export function createGamePorts(sdk: Sdk, progress: ProgressStore, grants: GrantFollowUp): GamePorts {
  const save = createSave(() => sdk.getModule<GameStateApi>(MODULES.gamestate));
  let handle: Promise<LevelHandle> | undefined;
  const levels = (): Promise<LevelHandle> => (handle ??= sdk.getModule<Levels>(MODULES.levels)
    .open(LEVEL_SET).catch((error: unknown) => { handle = undefined; throw error; }));
  const applied = new Map<number, AppliedLevel>();
  let attempt: Attempt | undefined;
  sdk.bus.on(SDK_RELOAD_REQUIRED, () => { handle = undefined; applied.clear(); attempt = undefined; save.reset(); });

  const loadApplied = async (level: number): Promise<AppliedLevel> => {
    const known = applied.get(level);
    if (known) return known;
    const value = await (await levels()).get(level);
    applied.set(level, value);
    return value;
  };
  /** `last` of the level set record (read at start); `null`: a set without end, or not read. */
  const lastLevel = (): number | null => {
    const last = sdk.configs?.get<{ last?: unknown }>(LEVEL_SET_RECORD.scope, LEVEL_SET_RECORD.key)?.last;
    return typeof last === 'number' && Number.isSafeInteger(last) && last > 0 ? last : null;
  };
  /** The level id is the key of its step in the level progress track. */
  const stepOf = (target: AppliedLevel): string => target.levelId ?? `level_${target.n}`;

  return {
    async currentLevel() {
      await progress.read();
      const steps = Object.values(progress.get(PROGRESS.levels)?.steps ?? {});
      // A sequence track: one step per level, completed in order.
      const next = steps.filter((step) => step.status === 'completed').length + 1;
      const last = lastLevel();
      // After the last level of the set the game replays it.
      return last === null ? next : Math.min(next, last);
    },
    async level(n) {
      const target = await loadApplied(n);
      return { n, last: lastLevel(), id: stepOf(target), entry: target.entry } satisfies Level;
    },
    async beginAttempt(level) {
      const target = await loadApplied(level);
      // The server seeds the attempt; the level end is verified against this seed.
      const { seed } = await sdk.getModule<Progress>(MODULES.progress).beginAttempt({ mechanic: GAME_MODULE_ID,
        eventId: crypto.randomUUID(), mode: 'core', level: { set: target.set, n: target.n, key: target.key,
          configVersion: target.configVersion, contentHash: target.contentHash,
          ...(target.levelId ? { levelId: target.levelId } : {}) } });
      attempt = { level, eventId: crypto.randomUUID(), seed, startedAt: sdk.time.now() };
      return { seed };
    },
    async endLevel(level, won, stats) {
      const target = await loadApplied(level);
      const current = attempt?.level === level ? attempt : undefined;
      const durationMs = current ? (current.durationMs ??= Math.max(0, sdk.time.now() - current.startedAt)) : 0;
      const ack = await (await levels()).levelEnd(target, { moves: stats.moves, won, score: stats.score,
        durationMs, ...(current ? { seed: current.seed } : {}) }, { eventId: current?.eventId ?? crypto.randomUUID() });
      if (attempt === current) attempt = undefined;
      const verified = ack.level.verified && won;
      const step = stepOf(target);
      if (verified && progress.get(PROGRESS.levels)?.steps[step]?.status !== 'completed') {
        // The step completes on the server and its reward is granted after this answer.
        grants.expect();
        progress.change(PROGRESS.levels, (state) => withCompletedStep(state, step));
      }
      return { verified, stars: verified ? ack.level.stars : 0 } satisfies LevelResult;
    },
    loadSave: () => save.loadSave(),
    save: (state) => save.save(state),
    track(event, params) {
      try { sdk.analytics.sendEvent(event, params ?? {}); } catch { /* analytics never blocks */ }
    },
  };
}
