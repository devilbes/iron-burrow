// Entry of `node --test tests/game/`: Node 24 runs a directory argument as a module (its
// index.js), so this file loads the test files of the folder. `node --test "tests/game/*.test.mjs"`
// runs them file by file.
import { readdirSync } from 'node:fs';

for (const name of readdirSync(new URL('.', import.meta.url)).filter((file) => file.endsWith('.test.mjs')).sort()) {
  await import(new URL(name, import.meta.url).href);
}
