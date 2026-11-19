// Type check: the same config the build uses (scripts/sdk.mjs) — with an SDK all of src/,
// screens included; without one the portable entry and the game module. Incremental: what tsc
// learned is kept in .cache/typecheck/ (not in git), so a run after a small edit checks only the
// files the edit reaches; the result is the same as of a full check, and `npm run build` does the
// full one. Remove .cache/ to start over.
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { linkSdk, sdkState, tsconfigOf } from './sdk.mjs';
import { writeStrings } from './strings.mjs';

const state = sdkState();
// src/boot/strings.ts imports the strings record: merge it from its parts first.
try { writeStrings(); } catch (error) { console.error(error.message); process.exit(1); }
try { linkSdk(state.platform); } catch (error) { console.error(error.message); process.exit(1); }
const config = tsconfigOf(state.configured);
const tsc = createRequire(import.meta.url).resolve('typescript/bin/tsc');
console.log(`typecheck: ${config}`);
const result = spawnSync(process.execPath, [tsc, '--noEmit', '--incremental',
  '--tsBuildInfoFile', `.cache/typecheck/${config.replace(/\.json$/, '')}.tsbuildinfo`, '-p', config], { stdio: 'inherit' });
process.exit(result.status ?? 1);
