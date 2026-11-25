#!/usr/bin/env node
// Builds docs/meta/patch.json (RFC 7396 merge patch for apps.metadata.update)
// from docs/meta/locales/<loc>.json and docs/meta/current/assets.upload.json.
// Usage: node docs/meta/build-patch.mjs   (exit 1 on any violation)
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const META = dirname(fileURLToPath(import.meta.url));
const ROOT = join(META, '..', '..');
const locales = JSON.parse(readFileSync(join(ROOT, 'configs/remote/localization/locales.json'), 'utf8'));
const tags = locales.locales.map((l) => l.tag);
const primary = locales.defaultLocale;
import { existsSync } from 'node:fs';
const ASSETS = join(META, 'current/assets.upload.json');
const assets = existsSync(ASSETS) ? JSON.parse(readFileSync(ASSETS, 'utf8')) : null; // null: upload blocked, covers/screenshots omitted
const SHOTS = ['shot-1-lobby', 'shot-2-battle', 'shot-3-campaign-map', 'shot-4-shop', 'shot-5-stage-clear'];
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const BANNED = [/battle\s*city/i, /namco/i, /nintendo/i, /\bnes\b/i, /dendy/i, /денди/i, /танчики/i, /\bsega\b/i, /atari/i,
  /multiplayer/i, /мультиплеер/i, /\$\s?\d/, /\d\s?\$/, /€/, /₽/, /\bios\b/i, /android/i, /app store/i, /google play/i,
  /english only/i, /only in english/i, /только на английском/i, /интерфейс\S* английск/i];
const len = (s) => [...(s ?? '')].length;
const words = (s) => s.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
const issues = [];
const check = (loc, k, ok, msg) => { if (!ok) issues.push(`${loc} ${k}: ${msg}`); };

const patch = {
  common: { locales: tags, primary, name: {}, loc: {}, category: 'GAME_ARCADE' },
  android: { loc: {} },
  portal: { locales: {}, variants: [] }, // variants required by panel on first write (422 portal.variants); guides not in scope
  covers: [],
  screenshots: [],
  genre: 'arcade',
};
const alts = { cover: {}, shots: Object.fromEntries(SHOTS.map((s) => [s, {}])) };
const summary = [];
for (const loc of tags) {
  const d = JSON.parse(readFileSync(join(META, 'locales', `${loc}.json`), 'utf8'));
  const p = d.portal;
  const all = JSON.stringify(d);
  for (const re of BANNED) check(loc, 'text', !re.test(all), `banned ${re}`);
  check(loc, 'name', len(d.name) >= 1 && len(d.name) <= 30, 'name 1..30');
  check(loc, 'shortDescription', len(d.shortDescription) >= 1 && len(d.shortDescription) <= 80, 'short ≤80');
  check(loc, 'fullDescription', len(d.fullDescription) >= 200 && len(d.fullDescription) <= 4000, 'full 200..4000');
  check(loc, 'slug', SLUG.test(p.slug) && len(p.slug) <= 128, 'slug');
  check(loc, 'h1', len(p.h1) >= 1 && len(p.h1) <= 200, 'h1');
  check(loc, 'title', len(p.title) <= 60 && p.title.endsWith(' | ManyPlay'), 'seoTitle ≤60, " | ManyPlay"');
  check(loc, 'description', len(p.description) >= 50 && len(p.description) <= 160, 'seoDescription 50..160');
  check(loc, 'body', words(p.body) >= 200 && words(p.body) <= 400 && len(p.body) <= 20000, `body words ${words(p.body)}`);
  check(loc, 'faq', Array.isArray(p.faq) && p.faq.length === 3 && p.faq.every((f) => len(f.question) <= 500 && len(f.answer) <= 4000 && f.question && f.answer), 'faq ×3');
  check(loc, 'controls', Array.isArray(d.controls) && d.controls.length >= 5, 'controls ≥5');
  check(loc, 'alt', ['cover', ...SHOTS].every((k) => len(d.alt?.[k]) >= 1 && len(d.alt[k]) <= 512), 'alt');
  patch.common.name[loc] = d.name;
  patch.common.loc[loc] = { description: d.fullDescription };
  patch.android.loc[loc] = { short: d.shortDescription };
  patch.portal.locales[loc] = { slug: p.slug, h1: p.h1, title: p.title, description: p.description, body: p.body, faq: p.faq.map(({ question, answer }) => ({ question, answer })) };
  alts.cover[loc] = d.alt.cover;
  for (const s of SHOTS) alts.shots[s][loc] = d.alt[s];
  summary.push(`${loc}: slug=${p.slug} title=${len(p.title)} seoDesc=${len(p.description)} body=${words(p.body)}w faq=${p.faq.length}`);
}
const https = (u) => typeof u === 'string' && /^https:\/\/[^?#@]+$/.test(u);
if (!assets) { delete patch.covers; delete patch.screenshots; } else {
check('assets', 'cover', https(assets.cover?.publicUrl), 'cover url');
patch.covers.push({ url: assets.cover.publicUrl, alt: alts.cover });
SHOTS.forEach((s, i) => {
  const a = assets.screenshots.find((x) => x.file.includes(s));
  check('assets', s, a && https(a.publicUrl), 'screenshot url');
  if (a) patch.screenshots.push({ url: a.publicUrl, alt: alts.shots[s], order: i });
});
}
const slugs = tags.map((l) => patch.portal.locales[l].slug);
check('all', 'slug', new Set(slugs).size === slugs.length, 'slugs must be unique per locale');

console.log(summary.join('\n'));
if (issues.length) { console.error(issues.join('\n')); process.exit(1); }
writeFileSync(join(META, 'patch.json'), JSON.stringify(patch, null, 2) + '\n');
console.log('patch.json written');
