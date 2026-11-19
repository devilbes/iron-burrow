// No hand-made modal windows or veils in the game's screens (src/screens/**): a window is
// `ctx.window.open` (the kit window of the game skin, its dim over the whole screen), a veil or
// spotlight is `ctx.overlay` (docs/platform/recipes/add-a-screen.md). Flagged in the code of the
// screens (comments dropped):
//   - a dialog of its own: `role` dialog / alertdialog, `aria-modal`, a `<dialog>` element, `showModal(`;
//   - a full-size layer of its own: `position: fixed` (a screen draws in the screen slot, whose
//     `contain: paint` stops a fixed layer at the slot's edges — the dim does not reach the top
//     bar), or `position: absolute` with `inset: 0` / all four sides 0 / 100vw·100vh in one rule.
// A report by default (`t.diagnostic`); SCREENS_STRICT=1 fails on any finding.
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const strict = process.env.SCREENS_STRICT === '1';
const files = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
  entry.isDirectory() ? files(join(dir, entry.name)) : /\.(ts|js|css)$/.test(entry.name) ? [join(dir, entry.name)] : []);

/** Code without comments (block and line ones; `://` of a URL kept). */
const code = (text) => text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

const DIALOG = [
  [/\brole\b['"]?\s*[:=,]\s*['"](?:alert)?dialog['"]/, 'role dialog'],
  [/aria-modal/, 'aria-modal'],
  [/createElement\(\s*['"]dialog['"]|view\(\s*['"]dialog['"]|<dialog\b/, '<dialog> element'],
  [/\.showModal\s*\(/, 'showModal()'],
];
const FULL = /inset\s*:\s*0(?:px)?\s*(?:[;}'"`]|$)|(?=[^{}]*\btop\s*:\s*0)(?=[^{}]*\bleft\s*:\s*0)(?=[^{}]*\bright\s*:\s*0)(?=[^{}]*\bbottom\s*:\s*0)|100d?v[wh]/;

/** Findings of one source text, as `line: what`. */
export function findings(text) {
  const out = [];
  const lines = code(text).split('\n');
  lines.forEach((line, index) => {
    for (const [pattern, what] of DIALOG) if (pattern.test(line)) out.push(`${index + 1}: ${what} — use ctx.window.open`);
  });
  // CSS rules (in a .css file or a template string): one rule body at a time.
  const source = code(text);
  for (const match of source.matchAll(/[^{}]*\{([^{}]*)\}/g)) {
    const body = match[1];
    const line = source.slice(0, match.index + match[0].indexOf('{')).split('\n').length;
    if (/position\s*:\s*fixed/.test(body)) out.push(`${line}: position: fixed — a full-screen layer is ctx.overlay, a window ctx.window.open`);
    else if (/position\s*:\s*absolute/.test(body) && FULL.test(body)) out.push(`${line}: full-size absolute layer — use ctx.overlay or ctx.window.open`);
  }
  return out;
}

test('the check finds hand-made dialogs and full-size layers', () => {
  assert.equal(findings("view('div', { role: 'dialog', 'aria-modal': 'true' })").length, 2);
  assert.equal(findings('const CSS = `.veil{position:fixed;inset:0;background:var(--mp-card-overlay)}`;').length, 1);
  assert.equal(findings('.dim{position:absolute;top:0;left:0;right:0;bottom:0}').length, 1);
  assert.equal(findings('.dim{position:absolute;inset:0}').length, 1);
  assert.equal(findings('.badge{position:absolute;top:0;right:0}').length, 0, 'a corner badge is not a layer');
  assert.equal(findings('// role: "dialog" in a comment\n/* position:fixed */').length, 0);
  assert.equal(findings("ctx.window.open({ title: ctx.t('x') })").length, 0);
});

test('screens draw no modal window or full-screen layer of their own', (t) => {
  const found = files(join(root, 'src/screens')).flatMap((file) =>
    findings(readFileSync(file, 'utf8')).map((item) => `${relative(root, file)}:${item}`));
  for (const item of found) t.diagnostic(item);
  if (strict) assert.deepEqual(found, [], 'hand-made modal windows or veils in src/screens/ (SCREENS_STRICT=1)');
});
