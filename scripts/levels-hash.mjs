// `server.contentHash` of level range records: sha256 (hex) of the RFC 8785 (JCS) form of the
// record's `data` without `server`. Usage:
//   node scripts/levels-hash.mjs [--check] [file…]
// Without files: every range record in configs/remote/levels.*/. Writes the hash into each file;
// `--check` writes nothing and fails when a recorded hash differs.
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

/** JCS of plain JSON: keys sorted by UTF-16 code units, no whitespace, ECMAScript numbers and strings. */
export function canonicalJson(value) {
  if (value === null || typeof value !== 'object') {
    if (typeof value === 'number' && !Number.isFinite(value)) throw new Error(`not JSON: ${value}`);
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(',')}}`;
}

/** The content hash of a range record's `data`. */
export function levelsHash(data) {
  const { server: _server, ...content } = data;
  return createHash('sha256').update(canonicalJson(content), 'utf8').digest('hex');
}

/** Range record files under `root` (configs/remote/levels.<set>/*.json with `data.kind: "range"`). */
export function rangeFiles(root = 'configs/remote') {
  return readdirSync(root).filter((dir) => dir.startsWith('levels.'))
    .flatMap((dir) => readdirSync(join(root, dir)).filter((file) => file.endsWith('.json')).map((file) => join(root, dir, file)))
    .filter((file) => JSON.parse(readFileSync(file, 'utf8')).data?.kind === 'range');
}

function main(args) {
  const check = args.includes('--check');
  const files = args.filter((arg) => arg !== '--check');
  let stale = 0;
  for (const file of files.length ? files : rangeFiles()) {
    const record = JSON.parse(readFileSync(file, 'utf8'));
    const hash = levelsHash(record.data);
    if (record.data.server?.contentHash === hash) { console.log(`${file}: ${hash}`); continue; }
    if (check) { stale++; console.error(`${file}: recorded ${record.data.server?.contentHash}, computed ${hash}`); continue; }
    record.data.server = { ...record.data.server, contentHash: hash };
    writeFileSync(file, `${JSON.stringify(record, null, 2)}\n`);
    console.log(`${file}: ${hash} (written)`);
  }
  if (stale) process.exit(1);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main(process.argv.slice(2));
