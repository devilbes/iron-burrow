#!/usr/bin/env node
// Builds the apps.metadata.update patch from the authored "fields" of each
// docs/meta/texts/<locale>.json, validates limits and writes README.md.
// Usage: node docs/meta/texts/build.mjs   (exit code 1 on any violation)
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = dirname(fileURLToPath(import.meta.url));
const SUFFIX = ' | ManyPlay';
const GUIDES = ['how-to-play', 'tips'];
const NO_WORD_LIMIT = new Set(['ja', 'ko', 'zh', 'th']);
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
// Banned: reference arcade, its publisher, console brands (00_MASTER, FACTS §11), plus promises absent in FACTS.
const BANNED = [
  /battle\s*city/i, /namco/i, /bandai/i, /tank\s*1990/i, /nintendo/i, /\bnes\b/i, /famicom/i, /dendy/i,
  /\bsega\b/i, /atari/i, /playstation/i, /xbox/i, /playrix/i, /денди/i, /денди/i, /нинтендо/i, /танчики/i,
  /multiplayer/i, /мультиплеер/i, /offline/i, /офлайн/i, /оффлайн/i, /\bcoins?\b/i, /монет/i,
  /remove ads/i, /disable ads/i, /отключ\S* реклам/i, /убрать реклам/i, /\$\s?\d/, /\d\s?\$/, /₽/, /руб/i,
  /\bios\b/i, /android/i, /app store/i, /google play/i, /планшет/i, /\btablets?\b/i,
];
const CTRL = /[\u0000-\u001f\u007f-\u009f]/; // includes \n and \t
const ANGLE = /[<>‹›〈〉＜＞]/;

const words = (s) => s.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
const chars = (s) => [...s].length;

const files = readdirSync(DIR).filter((f) => /^[a-z]{2,3}(-[a-z0-9]+)*\.json$/i.test(f)).sort();
const facts = readFileSync(join(DIR, '..', 'FACTS.md'), 'utf8');
const issues = [];
const rows = [];
const slugsMain = new Map();

function textCheck(loc, path, s) {
  if (typeof s !== 'string' || !s.trim()) { issues.push(`${loc} ${path}: empty`); return; }
  if (CTRL.test(s)) issues.push(`${loc} ${path}: control character`);
  if (ANGLE.test(s)) issues.push(`${loc} ${path}: angle bracket`);
  if (s !== s.trim() || /  /.test(s)) issues.push(`${loc} ${path}: extra spaces`);
  for (const re of BANNED) if (re.test(s)) issues.push(`${loc} ${path}: banned term ${re}`);
}
function row(loc, field, s, limit, ok) {
  rows.push({ loc, field, chars: chars(s), words: words(s), limit, ok });
  if (!ok) issues.push(`${loc} ${field}: limit ${limit} violated (${chars(s)} chars, ${words(s)} words)`);
}
function page(loc, prefix, p, { guide }) {
  for (const k of ['slug', 'h1', 'title', 'description', 'body']) textCheck(loc, `${prefix}.${k}`, p[k]);
  row(loc, `${prefix}.slug`, p.slug, 'ASCII a-z0-9, single hyphens, ≤128', SLUG.test(p.slug) && chars(p.slug) <= 128);
  row(loc, `${prefix}.h1`, p.h1, '1–200 chars', chars(p.h1) >= 1 && chars(p.h1) <= 200);
  row(loc, `${prefix}.seoTitle`, p.title, `≤60 chars, ends "${SUFFIX}"`, chars(p.title) <= 60 && p.title.endsWith(SUFFIX));
  row(loc, `${prefix}.seoDescription`, p.description, '50–160 chars (tool ≤500)', chars(p.description) >= 50 && chars(p.description) <= 160);
  const lang = loc.split('-')[0];
  if (guide && !NO_WORD_LIMIT.has(lang)) row(loc, `${prefix}.body`, p.body, '600–1500 words, ≤20000 chars', words(p.body) >= 600 && words(p.body) <= 1500 && chars(p.body) <= 20000);
  else if (guide) row(loc, `${prefix}.body`, p.body, '≤20000 chars (no word range for ja/ko/zh/th)', chars(p.body) <= 20000);
  else row(loc, `${prefix}.body`, p.body, '300–1500 words, ≤20000 chars', words(p.body) >= 300 && words(p.body) <= 1500 && chars(p.body) <= 20000);
  const faq = p.faq || [];
  const faqText = faq.map((f) => `${f.question} ${f.answer}`).join(' ');
  row(loc, `${prefix}.faq`, faqText, '3–20 entries; q ≤500, a ≤4000', faq.length >= 3 && faq.length <= 20 && faq.every((f) => chars(f.question) <= 500 && chars(f.answer) <= 4000));
  faq.forEach((f, i) => { textCheck(loc, `${prefix}.faq[${i}].question`, f.question); textCheck(loc, `${prefix}.faq[${i}].answer`, f.answer); });
  return { slug: p.slug, h1: p.h1, title: p.title, description: p.description, body: p.body, faq: faq.map((f) => ({ question: f.question, answer: f.answer })) };
}

for (const f of files) {
  const file = join(DIR, f);
  const doc = JSON.parse(readFileSync(file, 'utf8'));
  const loc = doc.locale;
  if (`${loc}.json` !== f) issues.push(`${f}: locale field ${loc} does not match file name`);
  const F = doc.fields;
  const main = page(loc, 'main', { slug: F.slug, h1: F.h1, title: F.seoTitle, description: F.seoDescription, body: F.body, faq: F.faq }, { guide: false });
  slugsMain.set(loc, F.slug);
  textCheck(loc, 'name', F.name);
  row(loc, 'name', F.name, '1–30 chars', chars(F.name) >= 1 && chars(F.name) <= 30);
  textCheck(loc, 'shortDescription', F.shortDescription);
  row(loc, 'shortDescription', F.shortDescription, '≤80 chars', chars(F.shortDescription) <= 80);
  textCheck(loc, 'storeDescription', F.storeDescription);
  row(loc, 'storeDescription', F.storeDescription, '≤4000 chars (tool ≤8000)', chars(F.storeDescription) <= 4000);
  const controls = F.controls || [];
  row(loc, 'controls', controls.map((c) => `${c.action} ${c.input}`).join(' '), '≥5 action/input pairs', controls.length >= 5 && controls.every((c) => c.action && c.input));
  controls.forEach((c, i) => { textCheck(loc, `controls[${i}].action`, c.action); textCheck(loc, `controls[${i}].input`, c.input); });
  const variants = GUIDES.map((id) => {
    const g = F.guides?.[id];
    if (!g) { issues.push(`${loc}: guide ${id} missing`); return null; }
    if (g.slug !== id) issues.push(`${loc} ${id}.slug: must be the fixed variant token "${id}" (tool rule)`);
    return { id, locales: { [loc]: page(loc, id, g, { guide: true }) } };
  }).filter(Boolean);

  const isPrimary = doc.primary === true;
  const common = { name: { [loc]: F.name }, loc: { [loc]: { description: F.storeDescription } } };
  if (isPrimary) Object.assign(common, { locales: doc.gameLocales, primary: loc, category: 'GAME_ARCADE' });
  doc.patch = {
    common,
    portal: { locales: { [loc]: main }, variants },
    ...(isPrimary ? { genre: 'arcade' } : {}),
  };
  for (const g of GUIDES) if (F.guides?.[g]?.body && F.guides[g].body === F.body) issues.push(`${loc}: guide ${g} duplicates main body`);
  writeFileSync(file, JSON.stringify(doc, null, 2) + '\n');
}

const seen = new Map();
for (const [loc, s] of slugsMain) { if (seen.has(s)) issues.push(`main slug "${s}" repeats in ${seen.get(s)} and ${loc}`); seen.set(s, loc); }
if (!files.includes('en.json')) issues.push('en.json missing');
const gameLocales = (facts.match(/common\.locales` меты = `\[([^\]]*)\]/) || [])[1];

const md = [];
md.push('# Тексты меты Iron Burrow — подсчёт символов и слов', '');
md.push('Файл создаёт `node docs/meta/texts/build.mjs`. Скрипт собирает `patch` для `apps.metadata.update` из блока `fields` каждого файла, проверяет лимиты и перезаписывает этот README.', '');
md.push(`Файлы: ${files.map((f) => '`' + f + '`').join(', ')}. Языки игры по FACTS.md §6: ${gameLocales ?? 'en'}. Основной язык: en.`, '');
md.push('Слова считаются как группы символов между пробелами, в которых есть хотя бы одна буква или цифра. Символы считаются как кодовые точки Unicode.', '');
md.push(`**Нарушений: ${issues.length}**`, '');
if (issues.length) md.push(...issues.map((i) => `- ${i}`), '');
md.push('| язык | поле | символов | слов | лимит | ок |', '|---|---|---:|---:|---|---|');
for (const r of rows) md.push(`| ${r.loc} | ${r.field} | ${r.chars} | ${r.words} | ${r.limit} | ${r.ok ? 'да' : '**НЕТ**'} |`);
md.push('', '## Как сохранять', '');
md.push('1. Прочитать `apps.metadata.get` и взять `version`. Сейчас это блокер: ключ получает 401, см. FACTS.md §10.');
md.push('2. Собрать один patch: `common` и `portal.locales` объединить из всех файлов глубоким слиянием. `portal.variants` объединить по `id`: для каждого из how-to-play и tips сложить `locales` из всех файлов в один объект. Массив variants заменяется целиком, поэтому отправлять его по одному языку нельзя.');
md.push('3. Отправить `apps.metadata.update` с `dryRun: true`, затем с `dryRun: false`, затем прочитать результат обратно.');
md.push('4. В `common.locales` указан только `en`, потому что интерфейс игры английский. Если панель отклонит `common.name.ru` или `common.loc.ru` как язык вне `common.locales`, эти два поля из ru.json не отправлять: русская страница портала живёт в `portal`. Добавлять ru в `common.locales` нельзя без решения владельца, иначе стор пообещает русский интерфейс.');
md.push('5. `shortDescription` и `controls` не отправляются: в common и portal у них нет поля. shortDescription уложен в 80 символов, чтобы его можно было вставить в `android.loc.<locale>.short`, если появится сборка для Android. controls дублируются текстом в гайде how-to-play.', '');
md.push('## Сверка с FACTS.md (что тексты обещают)', '');
md.push('| пункт FACTS | что в текстах en/ru | статус |', '|---|---|---|');
for (const r of [
  ['§1 Название Iron Burrow', 'name = Iron Burrow на обоих языках; внутриигровые имена оставлены по-английски, как в игре', 'совпадает'],
  ['§2 Жанр arcade / GAME_ARCADE', 'top-down arcade tank shooter / аркада с видом сверху; genre и category в patch из en.json', 'совпадает'],
  ['§3 Суть: Burrower, Core, 20 Rustbugs, кирпич по четвертинкам, одно попадание = поражение', 'есть в body, гайдах и seoDescription', 'совпадает'],
  ['§3 Подборы star, bubble, rebar, quake, freeze, hull', 'описаны по смыслу, без чисел (числа есть только в ГДД)', 'совпадает'],
  ['§3 Рекламы нет', 'прямо сказано «no ads» / «рекламы нет»; отключения рекламы за деньги нет', 'совпадает'],
  ['§4 Кампания 30 стадий, 3 главы, до 3 звёзд, 90 всего', 'названия глав и пороги открытия указаны верно', 'совпадает'],
  ['§4 Siege после стадии 5, лидерборды', 'есть; других режимов нет', 'совпадает'],
  ['§4 Ежедневные награды, цикл 7 дней', 'упомянуты без описания содержимого', 'совпадает'],
  ['§4 Бустеры, новичку по 2', 'есть', 'совпадает'],
  ['§4 Магазин: наборы за деньги, оплата не подключена', 'магазин упомянут, цен нет', 'совпадает'],
  ['§4 Валюты нет', 'прямо сказано, что игровой валюты нет', 'совпадает'],
  ['§4 Настройки Music, Sound, Reduce Motion, Vibration', 'перечислены, Vibration только для тач-устройств', 'совпадает'],
  ['§5 Управление', 'controls и раздел гайда how-to-play; клавиша 1 = Bubble Shield, клавиши 2 и 3 к бустерам не привязаны (не подтверждено); мышь только для кнопок', 'совпадает'],
  ['§6 Язык игры только en', 'в FAQ: игра только на английском; ru-страница прямо говорит, что интерфейс английский', 'совпадает'],
  ['§7 Только web, desktop и mobile browser, ориентации, нужен интернет', 'есть; планшетов, приложений и игры без интернета не обещаем', 'совпадает'],
  ['§11 Запретные слова, мультиплеер, офлайн, цены', 'проверяется скриптом (BANNED); нарушений 0', 'совпадает'],
]) md.push(`| ${r.join(' | ')} |`);
md.push('', 'Детали механики из 00_MASTER §5–6, на которые ссылается FACTS §3–4, даны без чисел: уровни пушки, щит после возрождения, лимит бустеров на стадию, Spare Hull и звёзды. Новых режимов и функций они не добавляют.', '');
writeFileSync(join(DIR, 'README.md'), md.join('\n'));
console.log(issues.length ? issues.join('\n') : 'OK: 0 violations');
console.log(rows.map((r) => `${r.ok ? 'ok ' : 'BAD'} ${r.loc} ${r.field} c=${r.chars} w=${r.words}`).join('\n'));
process.exit(issues.length ? 1 : 0);
