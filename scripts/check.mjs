// The checks of the project, each as one command.
//   npm run check            the full set, once, when the edits of a task are done: the build (full
//                            type check, dist/), then every test (tests/*.test.mjs and tests/build/,
//                            the files side by side) with the records of configs/remote/ and the
//                            pictures of assets/ (each 1x made from its 2x: npm run assets), then — with
//                            PLAYWRIGHT set — the skin gallery, every view in every size, on that one
//                            build (after the tests: both take every processor). Nothing
//                            stops at the first failure: every failed part is printed at the end,
//                            to be fixed together before the next run.
//   npm run check:fast       an occasional look in the middle of the edits, seconds: the types
//                            (incremental), the bundle into dist/ without a second type check, the
//                            tests of tests/*.test.mjs (no build of a project copy, no browser).
//   npm run check:fast -- --only "HUD"   only the tests whose name matches (a regular expression).
// Not here: tests/browser-startup.mjs — it needs the network and creates a guest on the stand.
import { spawn } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { writeStrings } from './strings.mjs';

const argv = process.argv.slice(2);
let only, fast = false;
for (let i = 0; i < argv.length; i++) {
  const [flag, inline] = argv[i].split(/=(.*)/s);
  if (flag === '--fast' && inline === undefined) { fast = true; continue; }
  if (flag !== '--only') { console.error(`unknown option ${argv[i]} (known: --only <test name pattern>)`); process.exit(2); }
  only = inline ?? argv[++i];
  if (!only) { console.error('--only needs a value: a part of a test name or a regular expression'); process.exit(2); }
}
if (only !== undefined && !fast) {
  console.error('--only is for npm run check:fast: the full check runs every test'); process.exit(2);
}

const started = performance.now();
const seconds = (from) => `${((performance.now() - from) / 1000).toFixed(1)} s`;
const temp = mkdtempSync(join(tmpdir(), 'check-'));
process.once('exit', () => rmSync(temp, { recursive: true, force: true }));

/** Runs node with `args`; resolves with the exit code, the output (kept in order) and the time. */
function run(args) {
  const from = performance.now();
  return new Promise((done) => {
    const child = spawn(process.execPath, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let output = '';
    for (const stream of [child.stdout, child.stderr]) stream.on('data', (chunk) => { output += chunk; });
    child.on('close', (code) => done({ code: code ?? 1, output: output.trimEnd(), time: seconds(from) }));
  });
}

/** Tests of `globs`: the readable report for a failure, the TAP one (a file) for counting what ran. */
async function tests(globs) {
  const tap = join(temp, `tests-${globs.length}.tap`);
  const result = await run(['--test', ...(only ? ['--test-name-pattern', only] : []),
    '--test-reporter=spec', '--test-reporter-destination=stdout', '--test-reporter=tap', `--test-reporter-destination=${tap}`, ...globs]);
  // A file none of whose tests match the pattern is reported as one passed line of its own: not a test.
  const ran = (readFileSync(tap, 'utf8').match(/^\s*# Subtest: (?!tests\/\S+\.test\.mjs$)/gm) ?? []).length;
  // Of a failed run only the failures: the report repeats them after this line.
  const failures = result.output.indexOf('✖ failing tests:');
  // A pattern that matches nothing must not look like a pass.
  if (only !== undefined && ran === 0) return { ...result, code: 1, output: `no test name matches "${only}"` };
  return { ...result, output: failures < 0 ? result.output : result.output.slice(failures), note: `${ran} tests` };
}

const parts = [];
/** Takes the result of a part: one line now, its output — when it failed — at the end, with the others. */
function took(name, result) {
  parts.push({ name, ...result });
  const word = result.skipped ? 'skip' : result.code === 0 ? 'ok  ' : 'FAIL';
  console.log(`${word} ${name}${result.time ? ` (${result.time})` : ''}${result.note ? ` — ${result.note}` : ''}`);
  return result;
}
const part = async (name, work) => took(name, await work);

// The strings record first: the type check, the bundle and the tests all read it.
try { writeStrings(); } catch (error) { console.error(error.message); process.exit(1); }

if (fast) {
  // Types and bundle do not depend on each other: side by side. The tests after them.
  await Promise.all([part('types', run(['scripts/typecheck.mjs'])), part('bundle', run(['scripts/build.mjs', '--no-typecheck']))]);
  await part(only ? `tests matching "${only}"` : 'tests', tests(['tests/*.test.mjs']));
} else {
  // One build for everything that reads dist/; a failed build does not stop the tests and the
  // records, which do not read it (the tests of tests/build/ build their own copies elsewhere).
  const build = await part('build (types, bundle, dist/)', run(['scripts/build.mjs']));
  await Promise.all([
    part('tests', tests(['tests/*.test.mjs', 'tests/build/*.test.mjs'])),
    part('records of configs/remote/', run(['scripts/validate-records.mjs'])),
    part('pictures of assets/ (1x made from 2x)', run(['scripts/assets.mjs', '--check'])),
  ]);
  if (!process.env.PLAYWRIGHT) {
    took('skin gallery', { skipped: true, note: 'PLAYWRIGHT (path to the playwright package) is not set: no screenshots were taken' });
  } else if (build.code !== 0) {
    took('skin gallery', { code: 1, output: 'not run: the build failed, there is no dist/ to draw' });
  } else {
    await part(`skin gallery, every view in every size${process.env.SKIN_STRICT === '1' ? ' (strict)' : ''}`, run(['tests/skin-gallery.mjs']));
  }
}

const failed = parts.filter((each) => !each.skipped && each.code !== 0);
for (const each of failed) console.log(`\n──── FAIL ${each.name} ────\n${each.output || '(no output)'}`);
const name = fast ? 'check:fast' : 'check';
if (failed.length) {
  console.log(`\n${name} FAILED in ${seconds(started)}: ${failed.map((each) => each.name).join('; ')}`
    + '\nFix everything listed above, then run it once more.');
} else if (fast) {
  console.log(`\ncheck:fast ok in ${seconds(started)} — not the acceptance: npm run check when the edits are done`);
} else {
  const skipped = parts.filter((each) => each.skipped).map((each) => each.name);
  console.log(`\ncheck ok in ${seconds(started)}${skipped.length ? ` — without: ${skipped.join(', ')}` : ''}`);
}
process.exit(failed.length ? 1 : 0);
