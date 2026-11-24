# Тексты меты Iron Burrow — подсчёт символов и слов

Файл создаёт `node docs/meta/texts/build.mjs`. Скрипт собирает `patch` для `apps.metadata.update` из блока `fields` каждого файла, проверяет лимиты и перезаписывает этот README.

Файлы: `en.json`, `ru.json`. Языки игры по FACTS.md §6: "en". Основной язык: en.

Слова считаются как группы символов между пробелами, в которых есть хотя бы одна буква или цифра. Символы считаются как кодовые точки Unicode.

**Нарушений: 0**

| язык | поле | символов | слов | лимит | ок |
|---|---|---:|---:|---|---|
| en | main.slug | 29 | 1 | ASCII a-z0-9, single hyphens, ≤128 | да |
| en | main.h1 | 58 | 9 | 1–200 chars | да |
| en | main.seoTitle | 41 | 6 | ≤60 chars, ends " | ManyPlay" | да |
| en | main.seoDescription | 140 | 24 | 50–160 chars (tool ≤500) | да |
| en | main.body | 2676 | 506 | 300–1500 words, ≤20000 chars | да |
| en | main.faq | 1214 | 237 | 3–20 entries; q ≤500, a ≤4000 | да |
| en | name | 11 | 2 | 1–30 chars | да |
| en | shortDescription | 75 | 13 | ≤80 chars | да |
| en | storeDescription | 1600 | 292 | ≤4000 chars (tool ≤8000) | да |
| en | controls | 419 | 83 | ≥5 action/input pairs | да |
| en | how-to-play.slug | 11 | 1 | ASCII a-z0-9, single hyphens, ≤128 | да |
| en | how-to-play.h1 | 62 | 10 | 1–200 chars | да |
| en | how-to-play.seoTitle | 34 | 6 | ≤60 chars, ends " | ManyPlay" | да |
| en | how-to-play.seoDescription | 132 | 22 | 50–160 chars (tool ≤500) | да |
| en | how-to-play.body | 5382 | 1025 | 600–1500 words, ≤20000 chars | да |
| en | how-to-play.faq | 696 | 131 | 3–20 entries; q ≤500, a ≤4000 | да |
| en | tips.slug | 4 | 1 | ASCII a-z0-9, single hyphens, ≤128 | да |
| en | tips.h1 | 62 | 12 | 1–200 chars | да |
| en | tips.seoTitle | 40 | 6 | ≤60 chars, ends " | ManyPlay" | да |
| en | tips.seoDescription | 142 | 24 | 50–160 chars (tool ≤500) | да |
| en | tips.body | 5251 | 993 | 600–1500 words, ≤20000 chars | да |
| en | tips.faq | 896 | 174 | 3–20 entries; q ≤500, a ≤4000 | да |
| ru | main.slug | 39 | 1 | ASCII a-z0-9, single hyphens, ≤128 | да |
| ru | main.h1 | 60 | 8 | 1–200 chars | да |
| ru | main.seoTitle | 51 | 7 | ≤60 chars, ends " | ManyPlay" | да |
| ru | main.seoDescription | 130 | 20 | 50–160 chars (tool ≤500) | да |
| ru | main.body | 3307 | 508 | 300–1500 words, ≤20000 chars | да |
| ru | main.faq | 1379 | 220 | 3–20 entries; q ≤500, a ≤4000 | да |
| ru | name | 11 | 2 | 1–30 chars | да |
| ru | shortDescription | 67 | 9 | ≤80 chars | да |
| ru | storeDescription | 1701 | 256 | ≤4000 chars (tool ≤8000) | да |
| ru | controls | 357 | 57 | ≥5 action/input pairs | да |
| ru | how-to-play.slug | 11 | 1 | ASCII a-z0-9, single hyphens, ≤128 | да |
| ru | how-to-play.h1 | 55 | 9 | 1–200 chars | да |
| ru | how-to-play.seoTitle | 44 | 7 | ≤60 chars, ends " | ManyPlay" | да |
| ru | how-to-play.seoDescription | 139 | 20 | 50–160 chars (tool ≤500) | да |
| ru | how-to-play.body | 5421 | 821 | 600–1500 words, ≤20000 chars | да |
| ru | how-to-play.faq | 745 | 114 | 3–20 entries; q ≤500, a ≤4000 | да |
| ru | tips.slug | 4 | 1 | ASCII a-z0-9, single hyphens, ≤128 | да |
| ru | tips.h1 | 69 | 13 | 1–200 chars | да |
| ru | tips.seoTitle | 39 | 6 | ≤60 chars, ends " | ManyPlay" | да |
| ru | tips.seoDescription | 136 | 22 | 50–160 chars (tool ≤500) | да |
| ru | tips.body | 5143 | 802 | 600–1500 words, ≤20000 chars | да |
| ru | tips.faq | 653 | 104 | 3–20 entries; q ≤500, a ≤4000 | да |

## Как сохранять

1. Прочитать `apps.metadata.get` и взять `version`. Сейчас это блокер: ключ получает 401, см. FACTS.md §10.
2. Собрать один patch: `common` и `portal.locales` объединить из всех файлов глубоким слиянием. `portal.variants` объединить по `id`: для каждого из how-to-play и tips сложить `locales` из всех файлов в один объект. Массив variants заменяется целиком, поэтому отправлять его по одному языку нельзя.
3. Отправить `apps.metadata.update` с `dryRun: true`, затем с `dryRun: false`, затем прочитать результат обратно.
4. В `common.locales` указан только `en`, потому что интерфейс игры английский. Если панель отклонит `common.name.ru` или `common.loc.ru` как язык вне `common.locales`, эти два поля из ru.json не отправлять: русская страница портала живёт в `portal`. Добавлять ru в `common.locales` нельзя без решения владельца, иначе стор пообещает русский интерфейс.
5. `shortDescription` и `controls` не отправляются: в common и portal у них нет поля. shortDescription уложен в 80 символов, чтобы его можно было вставить в `android.loc.<locale>.short`, если появится сборка для Android. controls дублируются текстом в гайде how-to-play.

## Сверка с FACTS.md (что тексты обещают)

| пункт FACTS | что в текстах en/ru | статус |
|---|---|---|
| §1 Название Iron Burrow | name = Iron Burrow на обоих языках; внутриигровые имена оставлены по-английски, как в игре | совпадает |
| §2 Жанр arcade / GAME_ARCADE | top-down arcade tank shooter / аркада с видом сверху; genre и category в patch из en.json | совпадает |
| §3 Суть: Burrower, Core, 20 Rustbugs, кирпич по четвертинкам, одно попадание = поражение | есть в body, гайдах и seoDescription | совпадает |
| §3 Подборы star, bubble, rebar, quake, freeze, hull | описаны по смыслу, без чисел (числа есть только в ГДД) | совпадает |
| §3 Рекламы нет | прямо сказано «no ads» / «рекламы нет»; отключения рекламы за деньги нет | совпадает |
| §4 Кампания 30 стадий, 3 главы, до 3 звёзд, 90 всего | названия глав и пороги открытия указаны верно | совпадает |
| §4 Siege после стадии 5, лидерборды | есть; других режимов нет | совпадает |
| §4 Ежедневные награды, цикл 7 дней | упомянуты без описания содержимого | совпадает |
| §4 Бустеры, новичку по 2 | есть | совпадает |
| §4 Магазин: наборы за деньги, оплата не подключена | магазин упомянут, цен нет | совпадает |
| §4 Валюты нет | прямо сказано, что игровой валюты нет | совпадает |
| §4 Настройки Music, Sound, Reduce Motion, Vibration | перечислены, Vibration только для тач-устройств | совпадает |
| §5 Управление | controls и раздел гайда how-to-play; клавиша 1 = Bubble Shield, клавиши 2 и 3 к бустерам не привязаны (не подтверждено); мышь только для кнопок | совпадает |
| §6 Язык игры только en | в FAQ: игра только на английском; ru-страница прямо говорит, что интерфейс английский | совпадает |
| §7 Только web, desktop и mobile browser, ориентации, нужен интернет | есть; планшетов, приложений и игры без интернета не обещаем | совпадает |
| §11 Запретные слова, мультиплеер, офлайн, цены | проверяется скриптом (BANNED); нарушений 0 | совпадает |

Детали механики из 00_MASTER §5–6, на которые ссылается FACTS §3–4, даны без чисел: уровни пушки, щит после возрождения, лимит бустеров на стадию, Spare Hull и звёзды. Новых режимов и функций они не добавляют.
