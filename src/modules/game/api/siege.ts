// Level ports of the Siege arena (set `levels.endless`, level 1 `siege_pit`): the same scheme as
// the campaign ports of the shell (src/boot/game-ports.ts) on the game module's own `levels` and
// `progress` services — the record fetched once, the server-seeded attempt, the verified level end
// with one event id per attempt (a repeat after a lost answer is a no-op on the server).
import { MODULES, SIEGE_SET } from '../../../boot/ids.js';
import { GAME_MODULE_ID, type Level } from '../index.js';
import type { LevelSetPorts } from '../controller/index.js';
import type { Host } from './host.js';
import type { AppliedLevelLike, LevelHandleLike, LevelsApi, ProgressApi } from './sdk.js';

interface Attempt { readonly eventId: string; readonly seed: string; readonly startedAt: number; durationMs?: number }

export function createSiegePorts(host: Host): LevelSetPorts & { reset(): void } {
  let handle: Promise<LevelHandleLike> | null = null;
  let applied: AppliedLevelLike | null = null;
  let attempt: Attempt | null = null;
  const levels = (): Promise<LevelHandleLike> => {
    const api = host.svc<LevelsApi>(MODULES.levels);
    if (!api) return Promise.reject(new Error('levels unavailable'));
    return (handle ??= api.open(SIEGE_SET).catch((error: unknown) => { handle = null; throw error; }));
  };
  const load = async (n: number): Promise<AppliedLevelLike> => (applied ??= await (await levels()).get(n));
  return {
    reset() { handle = null; applied = null; attempt = null; },
    async level(n) {
      const target = await load(n);
      return { n, last: 1, id: target.levelId ?? `level_${n}`, entry: target.entry } satisfies Level;
    },
    async beginAttempt(n) {
      const target = await load(n);
      const progress = host.svc<ProgressApi>(MODULES.progress);
      if (!progress) throw new Error('progress unavailable');
      const { seed } = await progress.beginAttempt({ mechanic: GAME_MODULE_ID, eventId: crypto.randomUUID(), mode: 'core',
        level: { set: target.set, n: target.n, key: target.key, configVersion: target.configVersion, contentHash: target.contentHash,
          ...(target.levelId ? { levelId: target.levelId } : {}) } });
      attempt = { eventId: crypto.randomUUID(), seed, startedAt: host.now() };
      return { seed };
    },
    async endLevel(n, won, stats) {
      const target = await load(n);
      const current = attempt;
      const durationMs = current ? (current.durationMs ??= Math.max(0, host.now() - current.startedAt)) : 0;
      const ack = await (await levels()).levelEnd(target, { moves: stats.moves, won, score: stats.score, durationMs,
        ...(current ? { seed: current.seed } : {}) }, { eventId: current?.eventId ?? crypto.randomUUID() });
      if (attempt === current) attempt = null;
      return { verified: ack.level.verified, stars: 0 };
    },
  };
}
