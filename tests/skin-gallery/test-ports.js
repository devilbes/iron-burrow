// GamePorts of the gallery page (src/modules/game/index.ts), without the SDK and the network: a
// screen that reads its level draws with the level records of configs/remote/levels.<set>/ (served
// by stage.mjs as /records/…). The level to play is `level` (the page's `&level=<n>`, 1 by
// default); an attempt gets a test seed; a won level end is verified with three stars; nothing is
// saved. Real answers of the services are checked by tests/game-ports.test.mjs and browser-startup.mjs.
import { LEVEL_SET } from '/app/boot/ids.js';

export function testPorts(level = 1) {
  const records = new Map();
  const record = (key) => {
    if (!records.has(key)) {
      records.set(key, fetch(`/records/levels.${LEVEL_SET}/${key}.json`).then((answer) => {
        if (!answer.ok) throw new Error(`configs/remote/levels.${LEVEL_SET}/${key}.json is missing`);
        return answer.json();
      }).then((file) => file.data));
    }
    return records.get(key);
  };
  return {
    currentLevel: async () => level,
    async level(n) {
      const set = await record('set');
      const range = (set.index ?? []).find((each) => n >= each.first && n <= each.last);
      if (!range) throw new Error(`no level ${n} in configs/remote/levels.${LEVEL_SET}/set.json`);
      const entry = (await record(range.key)).entries[n - range.first];
      return { n, last: Number.isSafeInteger(set.last) && set.last > 0 ? set.last : null, id: entry?.id ?? `level_${n}`, entry };
    },
    beginAttempt: async () => ({ seed: 'test-seed' }),
    endLevel: async (_level, won) => ({ verified: won, stars: won ? 3 : 0 }),
    loadSave: async () => null,
    save: async () => undefined,
    track: () => undefined,
  };
}
