# Добавить строку

Тексты игры живут в одном месте — в записи `localization/strings`
([localization.md](../services/localization.md)); встроенные строки берутся из неё же.

1. Ключ: `screen.<экран>.<id>` (экраны) или `shell.<id>` (оболочка); параметры — `{name}`.
2. Текст — деревом под `en` в своей части записи `configs/remote/localization/strings/<часть>.json`
   (экраны шаблона — `screens.json`; новая часть — новый файл той же схемы
   `{ "en": { "screen": { … } } }`; сегмент без точек, не глубже 8 уровней). Один ключ в двух
   частях с разным текстом — ошибка.
3. В коде — только по ключу, целиком в одинарных кавычках (собранный из частей ключ тест не
   видит), как на экране заглушки:
   ```ts
     view('h1', { class: 'hero-title', 'data-testid': 'game-placeholder' }, ctx.t('screen.game.placeholder')),
   ```
4. `npm run strings` — склеивает части в `configs/remote/localization/strings.json` (файл для
   заливки; руками его не править). То же делают `npm run build`, `npm run typecheck`,
   `npm run test:unit`.
5. `node --test tests/strings.test.mjs` — ключи кода есть в записи, лишних нет, у каждого языка
   `LOCALES` все ключи; ошибка называет ключи и файл.
6. Опубликовать запись `localization/strings` — файл `strings.json`.

Новый язык: `{ "tag": "de", "name": "Deutsch", "status": "published" }` в `localization/locales`,
тег в `LOCALES` и ветка `"de": { … }` со всеми ключами (своя часть, например `strings/de.json`);
окно настроек покажет его само.
