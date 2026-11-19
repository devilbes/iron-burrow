// Entry of `node --test tests/game/`: Node 24 runs a directory argument as a module (its
// index.js), so this file loads the test files of the folder. They are named `*.spec.mjs`, not
// `*.test.mjs`: tests/test-set.test.mjs requires every `*.test.mjs` under tests/ to be in the
// `test:unit` globs of package.json, which this step may not change (docs/game/requests/logic.md R6).
import { readdirSync } from 'node:fs';

for (const name of readdirSync(new URL('.', import.meta.url)).filter((file) => file.endsWith('.spec.mjs')).sort()) {
  await import(new URL(name, import.meta.url).href);
}
