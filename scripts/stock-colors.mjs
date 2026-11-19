// Every color of the stock ManyPlay skin as a variable. Reads the stock sheets of the kit
// (manyplaySkin().css) and writes src/shell/stock-colors.ts:
// - STOCK_COLORS: each color input of the stock skin, with its stock value — variables the
//   stock sheets set to a literal on :host, variables they read with a literal fallback but
//   never set (the --mp-card-* inputs), the page color, the `--game-*` variables below and the
//   bands of the bars (BANDS);
//   src/skin/theme.css must set every one of them (tests/skin-readiness.test.mjs);
// - STOCK_DERIVED: variables the stock sheets compute on :host from other variables;
// - STOCK_COLOR_RULES: per kit component, the stock rules that write a literal color, repeated
//   with the literal replaced by a variable (src/shell/skin.ts adds them after the stock sheet),
//   and the band rules of the bars with their fill and edge as `--game-bar-*`.
// A literal without a name in NAMES stops the script: a kit update with a new color is caught
// by tests/stock-colors.test.mjs and gets a name here.
//   node scripts/stock-colors.mjs           write src/shell/stock-colors.ts
//   node scripts/stock-colors.mjs --list    print the literals as a Markdown table
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { stockSkin } from './stock-skin.mjs';

/** Literal (lowercase, no spaces; `@selector` for one rule) → variable that replaces it. */
const NAMES = {
  'rgba(0,0,0,0.6)': '--game-sheet-scrim',
  '#fff@.mpg-fake-store-card': '--game-sheet-paper',
  '#111': '--game-sheet-ink',
  '#fff@.mp-sparkle--white path': '--game-sparkle',
  '#ff9a3c': '--game-tone-orange',
  '#4c8dff': '--game-tone-blue',
  '#a855f7': '--mp-game-2',
  '#d9935b': '--game-bronze',
  'rgba(0,0,0,.35)': '--game-shade-strong',
  'rgba(0,0,0,.18)': '--game-shade-inset',
  'rgba(0,0,0,.25)': '--game-shade-text',
  'rgba(255,255,255,.18)': '--game-dot',
};
/**
 * Bands of the bars — the top bar, the bottom menu and the safe-area strips next to them: the
 * scene runs under them edge to edge, so their fill and edge get variables of their own
 * (theme.css ships them transparent) instead of the panel colors. Component → band selectors;
 * the stock value of a band variable is the panel input it replaces (BAND_STOCK). A kit update
 * that renames a band stops the script.
 */
const BANDS = {
  shell: ['.mpg-shell [data-slot^="topBar"]', '.mpg-shell [data-region="ad-banner-top"]',
    '.mpg-shell[data-bottommenu=on] [data-region="ad-banner-bottom"]'],
  bottomMenu: ['.bottommenu'],
};
const BAND_STOCK = { '--game-bar-top': '--mp-card-background', '--game-bar-bottom': '--mp-card-background',
  '--game-bar-line': '--mp-card-line' };
/** A band declaration with its colors as the band variables: fill of its bar, edge `--game-bar-line`. */
function band(d) {
  const fill = /topBar|ad-banner-top/.test(d.selector) ? '--game-bar-top' : '--game-bar-bottom';
  return d.value.replace(VAR, d.prop.startsWith('border') ? 'var(--game-bar-line)' : `var(${fill})`);
}

/** Sign-in brand colors and ManyPlay ID: the kit keeps them fixed for every game skin. */
const FIXED = /^--mp-(apple|on-apple|google|on-google|facebook|on-facebook)$/;
const ID_ONLY = /^\.mp-login,\.mp-account-window$/;
const ID_COMPONENTS = new Set(['login', 'webLogin']);
const NAMED = 'white|black|red|green|blue|gold|gray|grey|silver|orange|yellow|purple|pink|navy|teal|maroon';
const LITERAL = new RegExp(`#[0-9a-fA-F]{3,8}\\b|\\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch)\\([^()]*\\)|\\b(?:${NAMED})\\b`, 'gi');
const VAR = /var\(\s*(--[a-z0-9-]+)\s*(?:,((?:[^()]|\((?:[^()]|\([^()]*\))*\))*))?\)/gi;

function split(body) {
  const parts = []; let depth = 0; let part = '';
  for (const char of body) {
    if (char === '(') depth++;
    if (char === ')') depth--;
    if (char === ';' && !depth) { parts.push(part); part = ''; } else part += char;
  }
  return [...parts, part].map((each) => each.trim()).filter(Boolean);
}

/** Declarations of a sheet with their at-rules and selector. */
export function declarations(css, out = [], at = []) {
  const text = css.replace(/\/\*[\s\S]*?\*\//g, '');
  for (let i = 0; i < text.length;) {
    const open = text.indexOf('{', i);
    if (open < 0) break;
    const prelude = text.slice(i, open).replace(/^[;\s]+/, '').trim();
    let depth = 1; let j = open + 1;
    for (; j < text.length && depth; j++) depth += text[j] === '{' ? 1 : text[j] === '}' ? -1 : 0;
    const body = text.slice(open + 1, j - 1);
    if (prelude.startsWith('@') || body.includes('{')) declarations(body, out, [...at, prelude]);
    else for (const item of split(body)) {
      const colon = item.indexOf(':');
      if (colon > 0) out.push({ at, selector: prelude, prop: item.slice(0, colon).trim(), value: item.slice(colon + 1).trim() });
    }
    i = j;
  }
  return out;
}

const norm = (color) => color.toLowerCase().replace(/\s+/g, '');
const literals = (value) => value.replace(VAR, 'var()').match(LITERAL) ?? [];
const nameOf = (literal, selector) => NAMES[`${norm(literal)}@${selector}`] ?? NAMES[norm(literal)];

/** Optional switches: setting one changes more than a color (a flat page instead of the scene). */
const SWITCHES = new Set(['--mp-page-background']);
/** The page around the game: html/body read the palette of :root (src/shell/skin.ts). */
const PAGE = { '--mp-night': '#11132E' };
const HOST = /(^|,)\s*:host\s*(,|$)/;

export async function scan() {
  const skin = stockSkin();
  if (!skin) throw new Error('no ManyPlay skin in vendor/ (an SDK with ui-kit/skins/manyplay or skin-manyplay)');
  const { manyplaySkin } = await import(skin.theme);
  const sheets = Object.entries(manyplaySkin().css).map(([component, sheet]) => [component, 'text' in sheet ? sheet.text : '']);
  // Variables every component sets on :host, last definition wins (the stock sheets first set a
  // palette, then map most of it onto --mp-card-* inputs).
  const host = new Map();
  for (const [, css] of sheets) {
    for (const d of declarations(css)) if (!d.at.length && HOST.test(d.selector) && d.prop.startsWith('--')) host.set(d.prop, d.value);
  }
  const colors = new Map(Object.entries(PAGE)); const derived = new Set(); const rules = []; const found = [];
  for (const [name, value] of host) {
    if (FIXED.test(name) || !literals(value).length && !/var\(/.test(value)) continue;
    const refs = [...value.matchAll(VAR)];
    const own = literals(value).length > 0;
    const switched = refs.length === 1 && SWITCHES.has(refs[0][1]) && refs[0][2] && literals(refs[0][2]).length;
    if (switched) colors.set(name, refs[0][2].trim());
    else if (refs.length) derived.add(name);
    if (own && !refs.length) colors.set(name, value);
    else if (own && !switched) colors.set(name, value);
  }
  const bands = new Set();
  for (const [component, css] of sheets) {
    for (const d of declarations(css)) {
      if (ID_ONLY.test(d.selector)) continue;
      if (!d.at.length && BANDS[component]?.includes(d.selector) && /^(background|border)/.test(d.prop)) {
        bands.add(`${component} ${d.selector}`);
        rules.push([component, `${d.selector}{${d.prop}:${band(d)}}`]);
        continue;
      }
      for (const [, name, fallback] of d.value.matchAll(VAR)) {
        if (fallback && !host.has(name) && !SWITCHES.has(name) && literals(fallback).length && !colors.has(name)) colors.set(name, fallback.trim());
      }
      if (d.prop.startsWith('--')) {
        if (!HOST.test(d.selector) && literals(d.value).length) throw new Error(`${component}: ${d.selector} sets ${d.prop} to a literal`);
        continue;
      }
      const hits = literals(d.value);
      if (!hits.length) continue;
      found.push({ component, ...d, hits });
      let value = d.value.replace(VAR, (all) => all.replace(/[#(),.]/g, (c) => `\u0000${c}`));
      for (const literal of hits) {
        const name = nameOf(literal, d.selector);
        if (!name) throw new Error(`no variable for ${literal} in ${component} ${d.selector} {${d.prop}}: add it to NAMES`);
        if (name.startsWith('--game-')) colors.set(name, literal);
        value = value.replace(literal, `var(${name})`);
      }
      const rule = `${d.selector}{${d.prop}:${value.replace(/\u0000/g, '')}}`;
      rules.push([component, d.at.reduceRight((inner, at) => `${at}{${inner}}`, rule)]);
    }
  }
  const lost = Object.entries(BANDS).flatMap(([component, list]) => list.map((selector) => `${component} ${selector}`))
    .filter((each) => !bands.has(each));
  if (lost.length) throw new Error(`band of a bar not in the stock sheets: ${lost.join(', ')}: update BANDS`);
  for (const [name, input] of Object.entries(BAND_STOCK)) colors.set(name, colors.get(input));
  for (const name of colors.keys()) if (name !== '--mp-night') derived.delete(name);
  // A sheet that keeps the stock palette as literals on :host, without the --mp-card-* mapping
  // (the preloader): its variables are pointed at the input with the same stock value.
  const rank = (name) => (name === '--mp-window-background' ? 0 : name.startsWith('--mp-card-') ? 1 : 2);
  const inputs = [...colors.keys()].sort((a, b) => rank(a) - rank(b));
  for (const [component, css] of sheets) {
    if (ID_COMPONENTS.has(component)) continue;
    const own = new Map();
    for (const d of declarations(css)) if (!d.at.length && HOST.test(d.selector) && d.prop.startsWith('--')) own.set(d.prop, d.value);
    const mapped = [...own].filter(([name, value]) => derived.has(name) && !/var\(/.test(value) && literals(value).length).map(([name, value]) => {
      const remap = [...(host.get(name) ?? '').matchAll(VAR)].map((m) => m[1]);
      const input = [...remap, ...inputs].find((each) => colors.has(each) && norm(colors.get(each)) === norm(value));
      if (!input) throw new Error(`${component}: no variable has the stock value of ${name} (${value})`);
      found.push({ component, at: [], selector: ':host', prop: name, value, hits: [value] });
      return `${name}:var(${input})`;
    });
    if (mapped.length) rules.push([component, `:host{${mapped.join(';')}}`]);
  }
  return { colors, derived, rules, found };
}

export async function generate() {
  const { colors, derived, rules } = await scan();
  const byComponent = {};
  for (const [component, rule] of rules) byComponent[component] = `${byComponent[component] ?? ''}${rule}\n`;
  return `// Generated by scripts/stock-colors.mjs from the ManyPlay sheets of the kit: do not edit.
// Colors of the stock skin as variables, so a game recolors everything in src/skin/theme.css.

/** Color variable → its stock value; src/skin/theme.css sets each of them. */
export const STOCK_COLORS: Readonly<Record<string, string>> = ${JSON.stringify(Object.fromEntries(colors), null, 2)};

/**
 * Variables the stock sheets derive on :host from other variables (mostly from --mp-card-*):
 * theme.css sets their inputs, never them on :host — that would break the stock mapping.
 */
export const STOCK_DERIVED: readonly string[] = ${JSON.stringify([...derived].sort())};

/** Kit component → stock rules with a literal color, repeated with the color as a variable. */
export const STOCK_COLOR_RULES: Readonly<Record<string, string>> = ${JSON.stringify(byComponent, null, 2)};
`;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if (process.argv.includes('--list')) {
    const { found } = await scan();
    console.log('| Component | Selector | Property | Literal |\n|---|---|---|---|');
    for (const f of found) console.log(`| ${f.component} | \`${[...f.at, f.selector].join(' ')}\` | ${f.prop} | \`${f.hits.join(' ')}\` |`);
  } else {
    writeFileSync(new URL('../src/shell/stock-colors.ts', import.meta.url), await generate());
  }
}
