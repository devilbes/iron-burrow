// Сборка проекта для builds: `npm ci && npm run build` → dist/ с dist/index.html.
// Бандлера нет (как витрина client-sdk): tsc компилирует src/ в dist/app/, пакеты SDK лежат
// готовыми в vendor/@manygamescorp/ (кладёт MCP sdk.modules_install), их import map
// vendor/@manygamescorp/importmap.json вставляется в index.html. platform.json в dist/
// подставляет builds из панели; локальный корневой копируется только для запуска у себя.
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';

const IMPORT_MAP = 'vendor/@manygamescorp/importmap.json';
const MARKER = '<!-- importmap -->';

rmSync('dist', { recursive: true, force: true });
execFileSync(process.execPath, ['node_modules/typescript/bin/tsc', '-p', 'tsconfig.json'], { stdio: 'inherit' });

const map = existsSync(IMPORT_MAP) ? JSON.parse(readFileSync(IMPORT_MAP, 'utf8')) : { imports: {} };
const html = readFileSync('index.html', 'utf8');
if (!html.includes(MARKER)) throw new Error(`index.html: marker ${MARKER} is missing`);
writeFileSync('dist/index.html', html.replace(MARKER,
  () => `<script type="importmap">${JSON.stringify({ imports: map.imports ?? {} })}</script>`));

for (const dir of ['vendor', 'assets/generated', 'assets/audio']) {
  if (existsSync(dir)) cpSync(dir, `dist/${dir}`, { recursive: true, filter: (p) => !p.endsWith("README.md") });
}
if (existsSync('platform.json')) cpSync('platform.json', 'dist/platform.json');
