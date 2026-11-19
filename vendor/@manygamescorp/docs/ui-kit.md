> client-sdk#1225: without an explicitly selected skin the kit is neutral. Import
> `manyplaySkin` from `@manygamescorp/skin-manyplay/theme` and call `useSkin(manyplaySkin())`
> for the previous game presentation. The `themes/*`, `skins/manyplay` and branded CSS
> exports have moved to that package (`tokens`, `default`, `styles/<name>`).
> ManyPlay ID login/web-login remain locked and independent of the game skin.
> See [the bundle](../skin-manyplay/README.md) for inheritance and build artifacts.

# @manygamescorp/ui-kit

Neutral window controls (`button`, `[role=button]`, links, visible-type inputs and selects)
inside `dialog` / `alertdialog` start at 44×44 CSS px. Structural layout also keeps the
built-in compact controls, including ManyPlay ID, at least this size (UI-05, #1656).
Larger button sizes from a skin remain in effect.

Canonical window ids, the MPS audit, lazy loading and orientation templates:
[window contract #1165](../../docs/ui-kit-window-ids.md).
Structural `windows.<component>.portrait.layout` / `landscape.layout` use the same resolved
`orientation` as heading, slots and mode. `auto` (the default) follows viewport rotation;
explicit `portrait` / `landscape` stays fixed. The top matching skin layer (including
`skinScope`) supplies the whole orientation template; the base template is used only when
that orientation override is absent. An override without `layout` keeps the module structure.
Rotation retains module props, local drafts, intents, and focus/caret within named slots.
Skins without orientation overrides, including ManyPlay, retain their base structure.
Catalog ids identify production views; component export names and SDK queue owners
are separate. Standard shell ids are `error`, `popup`, `confirm`, `settings`, `reward`;
the SDK owner names remain `ui.error`, `ui.popup`, `ui.confirm`, `ui.settings`, `ui.reward`.

UI kit SDK 1.0 (client-sdk/ui-kit.md, D-KIT). Компоненты только рисуют и выпускают интенты
(`emitIntent`), SDK не вызывают и не импортируют (`npm run boundaries`, правило `ui-kit-no-sdk`).

| Subpath | Что |
|---|---|
| `./asset-image` | `AssetImage`, `assetImageView`: единый AssetRef, lazy upload/HTTPS, скин и плейсхолдер ([контракт](../../docs/assets.md)) |
| `./core` | контракт `KitComponent` (`mount/update/unmount`), дескрипторы `view(tag, attrs, ...children)` без HTML-строк, `createViewComponent` — open shadow root, один constructed stylesheet, патч DOM на месте (фокус и каретка сохраняются), слушатели на `AbortSignal` |
| `./skin` | свои скины игры, core-модулей и механик (#959): `defineSkin`, `useSkin`, `skinFromManifest`, `adoptSkin`, `skinAssetUrl`/`withSkinAssets`, объёмный текстовый заголовок `displayTitle` (`kit-display-title`) — раздел «Свои скины» ниже |
| `@manygamescorp/skin-manyplay/tokens` | отдельный бандл ManyPlay (ядро по умолчанию нейтральное) (client-sdk#377, auth-ui.md §1, MP·01): вид Studio на бренд-палитре (`#11132E`, акцент `#7E80FF`, белый), токены `--mp-*`, `MANYPLAY_CARD_TOKENS`/`MANYPLAY_WINDOW_CSS` для окон фич; `MANYPLAY_ID_CSS` в скине ManyPlay ID; шрифт Onest — локальные woff2 через `manyplayFontFaces({ url })`, без Google Fonts. [Дизайн](../../docs/ui-kit-design/manyplay/README.md) |
| `@manygamescorp/skin-manyplay/default` | `DEFAULT_CSS` — стили окон фич (`FeatureProps`) на токенах бандла ManyPlay |
| `./services/login` | компонент `login` (MP·02–MP·07, ландшафт MP·08/09): рендерит состояние `AuthFlowController` (`@manygamescorp/core/auth-flow`) |
| `./services/login-strings` | тексты `kit.login.*` (ru, en) и `loginText(lang)` |
| `./services/error`, `popup`, `settings` | standard windows of Many Play Skin (#706): `error` (`ui.error`, D_PurchaseError / D_Toasts: alert card with the cause in bold and «Retry» inside it, texts by the SDK error code through l10n `kit.error.*` (`ERROR_STRINGS`, ru by default; own texts for the purchase reasons — already owned, processed, gone, limit, later, unsupported store, no permission, still loading; `kind` gives the area of a generic code such as `NOT_FOUND` of a purchase), no «Retry» for a code a repeat cannot fix (`errorRetry`), the code never shown; `errorAlert` is the same card for other windows), `popup` and `confirm` (slots header/title/content/actions), `settings` (toggles, language, ManyPlay ID, links); intents `action {id}`, `close`, `confirm`, `set`, `language`, `open` |
| `./services/level-windows` | in-level windows (KIT-WINDOWS G5, G6): `pause` (title, optional sound/music toggles; intents `close`, `restart`, `menu`, `set {key, value}`) and `levelGoal` (MPS_*_D_Help: `score` and `seconds` → «Собери N очков за S секунд» with the ★ and clock chips, `howTo[]` «Как играть», `timerPaused` note, «Понятно»; free `goal` text, `targets[]`, optional art; intent `close`); registry `LEVEL_WINDOWS` |
| `./services/preloader` | `preloader` (KIT-WINDOWS G7): game loading screen (`game`, `progress`, `status`, `caption`, `error` with intent `retry`); pure `preloaderView` renders the same first frame at build |
| `./services/standard-windows` | `standardWindowsModule()` (shell module with `ui.error`, `ui.popup`, `ui.confirm`, `ui.settings`) and `registerStandardWindows(sdk.ui.windows, shell, module)`: modules call `standardWindowsApi(sdk.ui).showError({ code, onRetry })` (SDK window queue via `sdk.ui.show`, error first) instead of drawing their own error screens |
| `./services/reward-window` | standard reward window `ui.reward` (#761, portrait + landscape): after any confirmed grant — burst with sparks, aggregated items in `rewardGrid` (art + «+N», name on tap/hover, category icon without art), coins/gems fly into the top bar capsule, the capsule ticks up, «Отлично»; `prefers-reduced-motion` — no animation. `rewardWindowModule({ assetUrl? })` (shell popup in the `system` layer over open windows; `assetUrl` resolves app asset keys of the item art) + `registerRewardWindow(ctx.windows, shell, { describe })`; a line without a name is «Предмет»/«Item», never the raw id; shown only by the trigger `DEFAULT_REWARD_TRIGGER` (below), modules never draw it |
| `./services/lobby` | `lobby` shell screen (top bar left/center/right, HUD left/right, bottom menu 3\|5 slots, stage); `lobbyProps(base, registries)` reads the registries, `lobbyIntents` routes taps back; modules only register elements |
| `./services/web-login` | `webLogin`: ManyPlay ID on the web (WEB_Login, WEB_Mobile) |
| `./shell` | оболочка игры (implementation-plan §3.6): дефолтный пресет фиксированных слотов `topBar.*`, `leftHandle`, `rightHandle`, `bottomBar.*`, `screen`, `overlay`, `system` + строки окна «Настройки» (`settings`); `UiRegistry` читает `manifest.ui.contributes` модулей; роутер `#/<route id>`; окна — попапы над лобби: 90% ширины рабочей зоны между топ-баром и меню (поля 5%; на широких экранах — центрированная колонка до 800 px; если полоса между барами ниже 320 px — ландшафтный телефон — окно поверх баров с полями 5% высоты оболочки и шириной 90% всего экрана, без колонки 800 px: 760 на 844, как MPS_L_D_Daily и MPS_L_B_Offer), высота по виду окна (`popupKind`: `content` — 80% измеренной рабочей зоны, `info` — компактные 50%, `fullscreen` — весь экран; размеры задаёт ui-kit, скин оформляет, фиксирована с открытия, футер действий прилипает к низу; [правила](../../docs/ui-kit-windows.md#высота-попапов-типы-окон-решение-владельца-2410)), затемнение всего вьюпорта, включая страницу вокруг узкой оболочки, тап по фону/Esc закрывает, скролл внутри; вложенные окна — стопкой (нижние inert, чуть уменьшены); появление/закрытие scale+fade с лёгким overshoot, затемнение fade, без анимации при `prefers-reduced-motion`; fullscreen у `popupKind: 'fullscreen'` или `fullscreen: true` (геймплей); `requiredServices` не установлен — раздел остаётся в меню с «модуль не подключён» |

`standardWindowsApi(sdk.ui).showSettings()` opens settings without game toggles.
Pass `values: { sound: true, music: false }` to show supported toggles; omitted keys hide their rows.

Оболочка: модуль отдаёт манифест (`ui.contributes`, тип `UiContribution` ядра, проверяет
`defineModule`) и свои компоненты; оболочка монтирует их и передаёт интенты владельцу.
Пустые `[data-slot]` пропускают события к кнопкам под ними; `screen` изолирует уровни
сцены от HUD, панелей и окон. Эти правила сохраняются при смене скина. Игровой скин и его проверки принадлежат проекту игры.

```ts
import { createUiShell } from '@manygamescorp/ui-kit/shell';

const shell = createUiShell(document.getElementById('app')!, { title: 'Collect 10',
  installed: (id) => sdk.modules().some((m) => m.id === id && m.state === 'started'),
  text: (key) => sdk.l10n.t(key) });
shell.add({ manifest: shopModule.manifest, components: { 'shop.screen': shopScreen },
  props: (elementId) => ({ items }), intent: (elementId, intent, payload) => buy(payload),
  attach: (host) => { /* host.open('shop.offer'), host.update('shop.screen') */ } });
```

```ts
import { createAuthFlow } from '@manygamescorp/core/auth-flow';
import { login } from '@manygamescorp/ui-kit/services/login';

const flow = createAuthFlow({ auth: sdk.auth, platform: 'web' });
const props = () => ({ state: flow.state, game: 'Collect 10', lang: 'ru' as const,
  emitIntent: (intent: string, payload?: Record<string, unknown>) => void flow.intent(intent, payload) });
login.mount(container, props());
flow.subscribe(() => login.update(container, props()));
await flow.open();
```

Пользовательское закрытие внешней рамки (крестик, Escape, затемнение) учитывает
текущие `closable` и `dismissible`: значение `false` любого из них блокирует закрытие,
а крестик становится disabled. `host.update(id)` и `shell.refresh()` обновляют кнопку.
Props открытия имеют приоритет над props владельца, как и для содержимого окна.
Закрывается только верхнее окно; `ticket.close()` и `host.close(id)` работают независимо
от этих ограничений, уведомляя владельца один раз. `shell.dispose()` освобождает все окна
и завершает их tickets без пользовательского close intent.

### Свои скины (#959)

Решение владельца 18.10: скины подключают игра, core-модули и механики. Скин — данные, без кода:

```ts
import { defineSkin, useSkin } from '@manygamescorp/ui-kit/skin';
const base = new URL('./skin/', import.meta.url).href;
const skin = defineSkin({ id: 'anime', base,
  tokens: { '--mp-violet': '#FF4FA0', '--kit-title-stroke-width': '3px' },
  css: { '*': new URL('kit.css', base), popup: '.std-list li::before{content:""}', shell: '…' },
  assets: { panel: 'panel.png', ribbon: 'ribbon.png' },
  fonts: [{ family: 'Dela Gothic One', url: 'fonts/dela-gothic-one.woff2' }],
  displayTitle: { arc: 14 } });
await useSkin(skin);            // скин игры: один на страницу, заменяет прежний
```

- **Куда попадает.** `createViewComponent` централизованно кладёт листы скина в `adoptedStyleSheets`
  каждого shadow root кита сразу после листа компонента: токены (`:host{--mp-*;--kit-*}`), `css['*']`
  во все компоненты, `css[<имя>]` в один компонент (имя — имя экспорта: `popup`, `shopWindow`,
  `rewardWindow`, `quests`…), `css.shell` и `@font-face` — в документ (shadow root свои `@font-face`
  не грузит). Смена или снятие скина (`handle.remove()`) применяется к уже открытым окнам на лету.
  Чужие листы корня (например, из `fitRewardList`) не трогаются. Окна ManyPlay ID (`login`) скин не
  меняет (E71): фиксированный слой ManyPlay передаётся в `createViewComponent({ skin: layer })`.
- **Страница вокруг игры (#1110).** `createUiShell` ограничивает сцену границами `.mpg-shell`
  (`contain:paint` на слоте `screen`); попапы не обрезаются контейнером сцены. Размеры безопасной зоны задаёт контейнер игры. Фон сцены остаётся внутри
  shell. Поля страницы оформляются фактурой или рамкой скина, без панорамы, размытия и повтора сцены.
  `assets['page-texture']` автоматически становится фоном html/body; токены
  `--kit-page-texture-repeat` (по умолчанию `repeat`), `--kit-page-texture-size` (`auto`),
  `--kit-page-texture-position` (`center`) управляют фактурой. `--kit-page-background` — CSS-цвет
  страницы и theme-color браузера; без него сохраняются цвета ManyPlay.
  `assets['page-frame']` оформляет слой `[data-region="page-frame"]` внутри границ игры:
  9-slice через `border-image`, без перехвата кликов. Задайте `--kit-page-frame-slice` и
  `--kit-page-frame-width` (по умолчанию `0`/`0px`, рамка выключена), опционально
  `--kit-page-frame-repeat` (`stretch`). Размер slice — число пикселей исходника без `px`
  или проценты, width — CSS-длина. Через `css.shell` можно переопределить эти правила.
  Смена/снятие скина обновляет всю страницу; без assets нет фактуры и рамки.

  ```ts
  // Уровень 1: только цвет. Уровень 2: повторяемая фактура и 9-slice рамка.
  const pageSkin = defineSkin({ id: 'game-page', base,
    tokens: { '--kit-page-background': '#30281f',
      '--kit-page-texture-size': '256px 256px',
      '--kit-page-frame-slice': '32', '--kit-page-frame-width': '24px' },
    assets: { 'page-texture': 'texture.webp', 'page-frame': 'frame.webp' },
    // Добавьте к полному css.shell своего скина; сцену не выносите на html/body.
  });
  ```

- **Слои.** кит → дефолт механики (`useSkin(skin, { level: 'mechanic' })`) → скин игры. Реестр один на
  страницу и общий для всех копий кита (механика может нести свою копию).
- **Core-модули** (mod-*) рисуют компонентами кита и берут скин автоматически, ничего не подключая.
- **Механики.** Дефолтный слой — поле `skin` в `module.json` (`css`: цель → файл из `files.styles`,
  `assets`: ключ → файл из `files.assets`, `displayTitle`); загрузчик core проверяет, что файлы
  перечислены. В коде механики: `await useSkin(skinFromManifest(id, manifest.skin, new URL('./',
  import.meta.url).href), { level: 'mechanic' })`. Свой DOM механики (поле, фишки) берёт скин через
  `adoptSkin(shadowRootOrDocument, '<id механики>', redraw)`: цель `<id>` в CSS скина игры
  перекрывает дефолт механики.
- **Ассеты.** Формат настроек — AssetRef `skin:<key>`, `asset:<id>` или HTTPS
  с точным хостом из env ([контракт](../../docs/assets.md)). Ключи `skin:<key>`
  разрешаются без `assetUrl` игры; в CSS — `var(--kit-asset-<key>)` (абсолютный URL, 9-slice —
  `border-image: var(--kit-asset-panel) 110 / 46px`). `withSkinAssets(sdk.assets.resolve)` — резолвер
  для своих экранов. Верхний слой побеждает по ключу.
- **Арт IAP (#1090).** `shop`, `shopWindow` и `limitedOffer` берут явный `iconUrl`
  через резолвер ассетов; без него — `assets['offer-<offerKey>']` активного скина,
  затем арт/иконку награды по `variant.entities[].id` (`icon-<id>` в скине).
  Например, `assets: { 'offer-starter': 'img/starter.webp' }`.
  Учитывается `skinScope`; отсутствующий ключ скина не отправляется в `sdk.assets.url`.
  Данные `iap.offers`/`iap.placements` общие для скинов. В `ui` допустим `skin:<key>`
  (client-sdk#1235/configs#487): семантический ключ не привязывает оффер к ID скина.
  Старый `skin/…` не записывается в новые настройки.
- **Объёмный заголовок `kit-display-title`.** Обводка, экструзия, градиент и дуга — только текстом
  (правило владельца 18.10: «тексты надо делать текстом мы не сможем генерить все локализации»).
  `displayTitle` скина включает его для заголовков окон кита (тот же `h3`, тот же текст); дуга —
  SVG `textPath` с текстом внутри. Вид — токены `--kit-title-size`, `-weight`, `-top`/`-bottom`
  (градиент), `-stroke`/`-stroke-width`, `-extrude`/`-depth`. Отдельно — компонент `displayTitle`
  и `displayTitleView(text, { arc })` для экранов вне окон.
- **Безопасность.** Токены без `;{}<>\`, URL только http(s)/file без кавычек и пробелов, `blob:`
  нет, CSS из URL грузит `useSkin` (`connect-src` игры), ошибка загрузки не применяет слой
  (`UI_SKIN_CSS_LOAD_FAILED`); неверный скин — `UI_SKIN_INVALID:<поле>`.
- **Три шрифта.** `--mp-font-display` — заголовки и `kit-display-title`, `--mp-font-ui` —
  кнопки/подписи, `--mp-font-body` — текст/числа. Задайте все три токена и `fonts[]` с локальными
  woff2 из папки скина; `weight`, `style`, `unicodeRange` переносятся в `@font-face` документа.
  Пример кириллицы: `{ family: 'Game UI', url: 'fonts/ui-cyrillic.woff2', weight: 600,
  unicodeRange: 'U+0400-045F,U+2116' }`; токен: `'--mp-font-ui': '"Game UI",sans-serif'`.
  В базовой теме все три роли — Onest. ManyPlay ID сохраняет фирменные шрифты (E71).
- **Общие файлы.** В CSS скина используйте только `var(--kit-asset-<key>)` для объявленных
  `assets`: абсолютный URL привязан к `base` объявившего слоя, даже если CSS в другой папке/хосте.
  Это работает в `*`, компоненте, `shell` и `adoptSkin` (ShadowRoot или Document).
  `useSkin(skin, { dev: true })` предупреждает о относительных `url()` с именем объявленного файла;
  на localhost диагностика включена по умолчанию, `{ dev: false }` отключает её.
- **Пример**: `apps/showcase/src/skin-example.ts`, витрина с `?skin=example`.

#### Закрытие магазина во время покупки (#1160)

`shopWindow` и `limitedOffer` закрываются крестиком, Escape и «Не сейчас» даже при
`busy`. Покупка блокируется только для ключей в `purchasingOfferKeys: readonly string[]`;
`busy` и общий `purchase.status = pending` больше не блокируют весь каталог этих окон.
Хост держит ключ от начала запроса до терминального результата; при `pending` сохраняет
его после завершения запроса. Закрытие и `dismiss-processing` не освобождают ключ.

`processing` показывает статус и кнопку `dismiss-processing`; `processingLabel` и
`processingCloseLabel` переопределяют тексты `kit.iap.processing` / `kit.iap.close`
из `l10n` (есть встроенные ru/en значения). В showcase таймер начинается на
`iap:order:validated`: если grant не пришёл за 5000 мс, хост показывает индикатор
«Идёт обработка заказа» с кнопкой «Закрыть». Ожидание самого store UI в эти пять секунд
не входит. Для pending-результата без события validated таймер начинается на результате.
Хост скрывает индикатор при dismiss или закрытии, очищает таймеры
при завершении/остановке и подавляет поздние результаты закрытого окна, включая rejection
после повторного открытия. Окна остаются чистыми представлениями без polling и проверки OS.
Showcase содержит пример: pending-ключи снимаются при grant/failed или остановке presenter; серверные заказы
при закрытии не отменяются. Обновляйте view и presenter вместе при экспорте в игру.

#### Опции компонентов для скинов (#965)

Всё ниже — штатные props и части `data-part`; DOM-скрипты по чужому shadow root и раскладка по
`:nth-child` не нужны. Без этих props вид компонентов прежний. Тексты остаются текстом.

| Где | Опция | Часть для CSS скина |
|---|---|---|
| `shopWindow` | `title` (вместо «Магазин»), `subtitle` (строка под заголовком: «Касса · обмен фишек», строка выпуска) | `window-subtitle` |
| `shopWindow`, оффер | `ui.discount` — стикер («-50%»); старые цены из конфига не рисуются | `offer-discount` |
| `shopWindow`, бесплатная/видео карточка | `ui.name` — название подарка, `ui.unit` — слово после суммы («+20 фишек») | `offer-name`, `offer-unit` |
| `shopWindow` | общий контейнер шести групп магазина (без своего бокса, пока скин его не задаст: `display:contents`) | `shop-deals` (группы с `data-placement`) |
| `shopWindow` | кнопка покупки — своя часть, скину не нужно повторять `.dialog` ради специфичности | `shop-buy` |
| `cardAlbum` | `setPrefix: false` — название набора без «Набор»; строка — своё слово (l10n игры) | `set-name` |
| `popup` | `variant?: string` — нейтральный хук скина на корне `data-popup-variant`, в том числе при `closable: false`; оформление задаёт скин игры | `data-popup-variant` |
| `popup`, блок `list` | пункт — строка или `{ text, icon? }`; `icon` — ключ ассета или `skin:<key>` | `list-icon` |
| `popup` | `masthead` (шапка издания/логотип над заголовком, ключ ассета или `skin:<key>`; `title` остаётся текстом и именем окна), `issueLine` (строка выпуска под шапкой), `footnote` (подпись под кнопками) | `masthead`, `issue-line`, `footnote` |
| крестик всех окон кита | `defineSkin({ closePosition: 'head-right' \| 'head-left' \| 'corner-out' })`, вид — ассет скина `close` (`assets: { close: 'close.png' }`) — кнопка рисуется картинкой, имя «Закрыть»/«Close» остаётся | `window-close` с `data-close` и `data-art` |

```ts
const skin = defineSkin({ id: 'noir', base, closePosition: 'corner-out',
  assets: { close: 'close.png', tick: 'tick.png', logo: 'logo.png' } });
await useSkin(skin);
shopWindow.mount(host, { ...props, title: 'Касса', subtitle: 'обмен фишек',
  offers: [{ ...offer, placement: 'shop_soft', ui: { discount: '-50%' } }] });
popup.mount(host, { ...props, title: 'Вступай в семью', masthead: 'skin/logo',
  issueLine: '№ 42 · Вторник', footnote: 'Предложение до воскресенья',
  content: [{ kind: 'list', items: [{ icon: 'skin/tick', text: 'Бонус к фишкам' }, 'Без рекламы'] }] });
cardAlbum.mount(host, { ...props, setPrefix: false });
```

`corner-out` выносит крестик на внешний угол рамки (`--kit-close-out`, по умолчанию `-14px`) и
снимает обрезку с `.dialog` (`overflow:visible`): области содержимого могут сжиматься
и прокручиваться, в том числе списки альбома и сундуков, магазин и инвентарь. Отдельные шапка,
арт и нижняя панель диалога не становятся областями прокрутки. Тот же крестик берёт рамка
окон оболочки (`createUiShell`) при открытии окна.
Окна ManyPlay ID (`login`, `webLogin`, аккаунт) крестик скина не берут (E71).

### Компоненты для скинов (#966)

Окно `quests` использует `kitMeter` для заданий и трека наград: части `track`/`fill` принимают ассеты скина в обоих вариантах списка. Точный счёт доступен в `aria-valuetext`; заливка округлена до процента. Список `partySlots` переносится по ширине контейнера, включая все восемь слотов в `popup.header.party`.

`@manygamescorp/ui-kit/services/game-widgets` — то, что в экспериментах 18.10 собирали своим DOM
поверх кита. Тексты — текстом, картинки — ключи ассетов (`skin:<key>` скина или ключ `assetUrl`).
Цель скина — имя экспорта (`css: { collectionTiles: '…' }`).

| Экспорт | Что рисует | Интенты | `data-part` |
| --- | --- | --- | --- |
| `kitMeter(value, target, { label?, valueText?, decorative? })` + `KIT_METER_CSS` | полоска прогресса из двух частей | — | `progress`, `track`, `fill` |
| `collectionTiles` (`collectionTilesView`) | сетка круглых наборов 3×N / 4×N, кольцо прогресса, `owned/total`, галочка «собран» | `open {setId}` | `collection-tiles`, `tile` (`data-state` empty / progress / done), `ring`, `name`, `count`, `progress`, `done` |
| `miniEventBanner` | баннер мини-события: логотип, название, жетон, прогресс к цели, награда цели, таймер; весь баннер — кнопка | `open` | `mini-event`, `logo`, `title`, `token`, `progress`, `count`, `goal`, `timer` |
| `partySlots` (`partySlotsView`), `popup.header.party` | слоты участников кооператива (аватар или «+»), общая награда | `slot {index}` | `party`, `party-slot` (`data-state` member / free), `party-reward` |

- **Прогресс через ассет скина.** Ширина заливки — CSS-переменная `--kit-progress` (её ставит
  атрибут `data-progress` 0…100, inline-style нет). Если в скине есть ассеты `bar-track` / `bar-fill`,
  части становятся 9-slice: `border-image: var(--kit-asset-bar-fill) var(--kit-bar-slice) / var(--kit-bar-edge)`.
  Срезы задают токены `--kit-bar-slice` (по умолчанию `0 24 fill`), `--kit-bar-edge` (`0 12px`),
  высоту — `--kit-meter-h`, цвет трека без ассета — `--kit-meter-track`, минимальную ширину заливки — `--kit-bar-fill-min`. `::-webkit-progress-value`
  не нужен, работает во всех браузерах матрицы. `--kit-progress` есть и у плитки коллекции (кольцо).
- **Слоты участников переживают `update`:** они часть view, а не вставка в чужой shadow root.
- **Ландшафт.** `popup({ layout: 'landscape' })` — в низкой ландшафтной полосе
  (`orientation:landscape` и высота до 520 px) картинка шапки слева, контент и кнопки справа;
  Высота окна оболочки сохраняется; если иллюстрация со слотами и наградой не помещается,
  содержимое прокручивается внутри окна, начиная под заголовком. В этой раскладке кнопки
  прокручиваются вместе с правой колонкой, чтобы не перекрывать текст и крестик в низком окне.
  `auto` (по умолчанию) — стопка MPS_L_Popup. `shopWindow({ layout: 'landscape' })` — паки валюты в
  один ряд поверх обеих колонок (с горизонтальной прокруткой); `auto` — MPS_L_D_Shop.
- **Пример:** витрина `?skin=example`, раздел «Окна» → «Компоненты скина» (`apps/showcase/src/skin-widgets.ts`).

### Окно награды `ui.reward` (#761)

Модули окно награды не рисуют. `mod-inventory` после каждого подтверждённого состояния, где
каких-то предметов стало больше (покупка, оффер, награда дня, сундук, задания, победа, реклама),
шлёт `inventory:items:granted { items: [{ id, kind, quantity }] }` (первое чтение и траты — не
начисление). Правило по умолчанию в `ui.windows/main.triggers` (оно же `DEFAULT_REWARD_TRIGGER`)
ставит `ui.reward` в очередь окон, payload события приходит в окно контекстом очереди:

```json
{ "id": "reward-on-grant", "on": { "event": "inventory:items:granted" }, "priority": 20,
  "do": [{ "module": "ui.reward", "action": "main" }] }
```

Игра ставит модуль `ui.reward` (permission `windows`), который в `start` вызывает
`registerRewardWindow(ctx.windows, shell, { describe })`, и добавляет
`rewardWindowModule({ assetUrl })` в оболочку (пример — `apps/showcase/src/app.ts`,
`features/standard-ui.ts`). `describe(line)` отдаёт имя и арт предмета (каталог
`sdk.inventory.entities()` + l10n; арт — ключ ассета игры, его разрешает `assetUrl`); без арта —
иконка категории, без имени — «Предмет».
Прямой показ без события: `sdk.ui.show('ui.reward', { items, title? })`. Монеты летят в капсулу
`hud.currency.<id>` топ-бара (`findHudCapsule`, свой поиск — `target` в props), счётчик капсулы
докручивается от старого значения (`tickUpValues`, `TICK_UP_DELAY_MS`). Тест-id: `reward-window`,
`reward-item`. Скриншоты: `node scripts/ui-kit-reward-shots.mjs <dir>` (после `npm run build`).
Старая карточка `reward` (`./services/reward`) удалена — её заменяет `ui.reward`.

### Сундук в составе наград (#1234)

`RewardLine` из `services/reward-window` принимает `chest: RewardChest`. Имя `name`,
подсказка `tooltip`, количество `quantity` и иконка `icon` передаются владельцем;
без имени/иконки используются локализованное «Сундук» и текущий `chest-bronze` скина.
Количество форматируется по `lang`, картинки декоративные. ManyPlay использует
существующие токены награды и twinkle VFX; при reduced motion движения нет.

```ts
const items: readonly RewardLine[] = [{
  id: 'daily_chest', quantity: 1, name: 'Ежедневный сундук', icon: 'chest-bronze',
  chest: {
    state: 'closed',
    contents: [{ id: 'coins', quantity: 10, name: 'Монеты',
      range: { min: 10, max: 20 }, chance: 0.25 }],
  },
}];
// Прямой mount: emitIntent обрабатывает действия; состояние меняется через update.
rewardWindow.mount(container, { elementId: 'reward', lang: 'ru', items, emitIntent });
// В shell: модуль сам открывает info-состав, open/claim передаёт владельцу.
shell.add(rewardWindowModule({ intent: (intent, { id }) => handleChest(intent, id) }));
shell.open('reward', { items });
```

| `chest.state` | Поведение |
| --- | --- |
| `closed` | «Открыть» → `chest-open { id }` |
| `opening` | Ожидание; повторное открытие заблокировано |
| `opened` | Показывает только переданный `chest.result`; «Забрать» → `chest-claim { id }` |
| `claimed` | Завершённое состояние, повторное получение заблокировано |

После интента mounted-компонент блокирует это действие до изменения состояния владельцем;
обычный `update` с тем же состоянием блокировку сохраняет. Смена `playerKey` сбрасывает
локальные блокировки. Ошибка/повтор открытия задаются переходами состояния владельца.
UI kit не обращается к inventory/iap, не выбирает результат и не начисляет награды.

Иконка вместе с бейджем `i` — одна доступная кнопка `chest-info { id, path }` во всех
состояниях, включая `opening`/`claimed`. `path` — индексы позиции и её подтверждённых
вложенных результатов. При прямом mount владелец обрабатывает info-интент сам.
`rewardWindowModule` открывает `reward.contents.1…8` поверх текущего окна в существующем
стеке shell; закрытие ребёнка сохраняет родителя и возвращает фокус. Закрытие родителя
закрывает его потомков. Все эти окна имеют `popupKind: 'info'`.

Состав `chest.contents`, подтверждённый результат и обычные награды используют общую
`rewardGrid` (#1233) через `rewardItemsView`; отдельного списка сундуков нет. Вложенный сундук открывает
следующее info-окно. `undefined`/`null` означает «Состав недоступен», `[]` — «Сундук пуст».
`chance` — вероятность 0…1; `range: { min, max }` — неотрицательный целочисленный диапазон.
Они показываются только при переданных корректных данных; kit ничего не вычисляет.
`random: { contents?: RewardLine[] | null }` описывает случайную позицию: затемнённая
иконка (переданный `icon`, иначе общий `gift`) со знаком «?». Нажатие открывает
тот же child-info с переданными вариантами и шансами; kit не выбирает результат.
Отсутствующий пул недоступен, пустой пул известен как пустой. Интент остаётся
`chest-info { id, path }`; `random` не даёт действий открытия или выдачи.
В info нет open/claim, вспышек получения или прилёта валюты в HUD.

Ограничения: 50 позиций на список, 8 уровней сундуков и 1000 проверяемых строк на дерево;
состав берётся из props текущего приложения, глобального кэша состава нет.
Целевые проверки: `chest-reward.test.ts`, `reward-window.test.ts`, `shell-popups.test.ts`.
`UIKIT_WINDOW_SHOTS=<каталог>` сохраняет демонстрации четырёх состояний ManyPlay
на 390×844, 844×390 и 1440×900 во время теста сундуков.

Стиль-контракт для скинов (D-C6): `data-part` и классы `mp-*`. Карточка очков MP·07 и вкладка
«Мои игры» (MP·07a) не рисуются до inventory#72 и id#59.

Готовые окна фич дефолтной темы: [контракты, интенты, интеграция и превью](../../docs/ui-kit-windows.md).
Игры получают их из соответствующих `./services/*`; вёрстка фич в игре не копируется.

Проход 2: `services/kv` — типизированный редактор; `login.presentation=fullscreen` — один
экран без окна оболочки. `createAuthFlow.waitForPlayerReady` удерживает покрытие при смене gid.
[Контракты, каталог и снимки](../../docs/ui-kit-windows.md#проход-2-manyplay-id-kv-и-каталог).


Public name labels (profile#42) preserve a nonblank profile name, then a supplied ManyPlay ID
nickname, then `Игрок {gid}`. Empty/whitespace strings are treated as absent. `profile` accepts
optional `nickname`; leaderboard entry profiles may supply `nickname`; the account window reads `state.accountDetails.nickname` from id; confirmation can read
`state.account.nickname`. These are presentation props, never account uid fallbacks.
The service's public profile projection already resolves account nicknames for leaderboard
profile enrichment. No new screens or DOM classes are introduced.


For banners, pass structural `ads: { bannerInset, onChange }` and `state: sdk.uiState` ports
to `createUiShell`. `onChange` subscribes to `ads:banner:shown/hidden` and returns its cleanup.
The shell reads the inset on mount, reserves `ad-banner-top/bottom` regions, and sets
`--kit-ad-inset-top/bottom` in px. Safe-area is already included in the banner inset; the
layout uses the larger of it and the edge safe-area. Rows transition in 150 ms, disabled
for reduced motion. `screenKind(routeId)` defaults to `neutral`; mark core gameplay and
loading routes explicitly. Fullscreen windows pause banners across both popup layers;
closing one layer leaves the pause active while the other is fullscreen.

`@manygamescorp/ui-kit/services/announcement` renders standard broadcast notices as text
(no HTML), optional HTTPS image/link, maintenance dates, and a required-update alert.
The host mounts the component with `sdk.realtime.notice()`; the showcase includes it
in the realtime section/system layer. Never persist arbitrary broadcast payloads.

### ManyPlay ID account window (#248)

`login` renders the approved account artifact at `flow.open('profile')`, including guests.
Connect `createAuthFlow` to `sdk.auth` and pass
`subscribePlayerChanged: listener => sdk.bus.on('auth:playerChanged', listener)`,
`subscribeSessionEnded: listener => sdk.bus.on('sdk:reload:required', (e) => { if (e.reason === 'revoked') listener(); })`
(shows `signed-out`, #448) plus
`writeClipboard: value => navigator.clipboard.writeText(value)`. Unsubscribe the render listener,
call `flow.dispose()` and `login.unmount(container)` when the owner is destroyed.
Pass `platform: 'web' | 'android' | 'ios'` in both controller and view props; on Cordova use the
actual device/store platform. Optional view props: `avatar`, `currentAppId`, `gameMetric`
(`{label,value}`, per-game lines of MP_Games), `gameMetrics` keyed by public appId, `crossCurrency`
(`{label,value,iconUrl?}`: the inter-game ManyPlay currency of the MP_Account card «450 PTS»).
Pass the inventory icon asset key in `iconUrl`, resolved by `assetUrl` (e.g. `sdk.assets.url`).
The card keeps the brand mark when the icon is absent, invalid or its asset key cannot be resolved.
Metrics come from the game; id does not
return them. An absent metric is hidden. `lang` selects ru/en.

The account API is `sdk.auth.getAccount()`, `changeNickname(nickname)`, `suggestNickname()` and
`getGames({limit:10,cursor?,signal?})`; SDK translates cursor to id's current `after`. Private
responses are never persisted by SDK. My Games contains every published active game, with a
checkmark only for memberships. Each available native link opens in another tab (including
current game, per the final owner instruction); without that platform's link there is no action.
Closing/back keeps the current account; switching opens the existing account chooser; signout
requires the confirmation screen, forgets the local token and initializes a guest.

Nickname rules follow id#95 (3–24 ASCII, first a letter), rather than the older mock's 16-character
rule. Uniqueness is checked atomically when saving; suggestion is not a reservation. The current
id contract has no availability query, and catalog pagination orders by appId. Loaded profiles
are grouped first and sorted by last login; global profile-first/MAU pagination and live nickname
availability require [id#103](https://github.com/manygamescorp/id/issues/103). No free-name or MAU
result is fabricated. [DOM screenshots and checks](../../docs/ui-kit-screens/account-248/README.md).

### Shared ManyPlay window theme (#303, Studio look since #377)

With the ManyPlay bundle selected, feature windows and shell use its palette. Locked ID windows retain their own
fixed brand presentation (owner decision 06.10, client-sdk#377; the experimental «glossy 3D casual»
theme of #309 is removed). The look is Studio's on the ManyPlay palette: page `#11132E`, windows and
cards `#1A1D45` with a 1px line, accent `#7E80FF` (primary buttons are the accent with dark
`#11132E` text, AA contrast), white text, button/card radii 12, field radius 8, window radius 16, no gradients or glow; one dark look
regardless of the host light/dark mode. The account artifact keeps its existing classes and maps
`--surface*`, `--text*`, `--accent*` and status tokens to ManyPlay card tokens. Text uses Onest
500/600/700. Provide local font faces with `manyplayFontFaces({url})`
(`Onest-{500,600,700}-{latin,cyrillic}.woff2`) and declare them in the document — a shadow root does
not load its own `@font-face` (`apps/showcase/styles.css` is the example); without font files the
system sans fallback is intentional. The SDK does not fetch fonts from Google.
[Design and storybook](../../docs/ui-kit-design/manyplay/README.md),
[screenshots](../../docs/ui-kit-screens/manyplay-377/).

Feature windows and shell accept these shared card inputs: `--mp-card-background`, `surface`, `raised`, `line`, `line-strong`, `fg`,
`muted`, `subtle`, `accent`, `accent-hover`, `accent-soft`, `accent-text`, `on-accent`, `success`,
`success-soft`, `error`, `error-soft`, `warning`,
`warning-soft`, `info`, `info-soft`, `gold`, `focus`, `shadow`, `overlay` (each with the
`--mp-card-` prefix). `--mp-page-background` controls game/feature backdrops; ManyPlay ID keeps its fixed backdrop. All defaults live
in `themes/manyplay`; account/login use the selected skin (#1037); `--mpg-*` and `--mpg-shell-*` no longer select the SDK window theme.
Game-owned components and skins keep their own theme. Applying explicit card inputs is a
host-level brand configuration, not an automatic inheritance of the game's palette.

The exported artifact mapping is generated after build with
`node scripts/sync-manyplay-artifact.mjs`; `--check` checks it without writing.
[Screenshots and focused DOM checks](../../docs/ui-kit-screens/manyplay-303/README.md).

### ManyPlay skin export (#452, next SDK release)

Design source: [architecture PR #1618](https://github.com/manygamescorp/architecture/pull/1618),
`SK_manyplay_*`, pinned at `3f89c86950380222189f5bc865ad9f908bbf7750`.
The skin is the default: buttons 48 px/r12, close control 40 px/r8 inside a 358 px/r16
window, padding 24 px, scrim `rgba(9,10,28,.82)`. `--mp-icon-s/m/l/xl` = 16/24/40/56 px.
Artwork is local in `dist/assets/manyplay/`, copied unchanged by the build and included
in npm/CDN and demo/showcase vendors. [Comparisons and showcase shots](../../docs/ui-kit-screens/manyplay-452/README.md).

ManyPlay ID uses `MANYPLAY_ID_CSS`: game card/page overrides do not recolor login or
account windows. Login stays fullscreen at the shell level so its own scrim/card can cover
and block the scene. Email is first, then installed Apple/Google/Facebook providers.
The optional cookie/legal footer appears with `cookieDetails`.

`LoginState.step` adds `switch-account` and `signed-out`. The former is a **post-commit**
notification with `restart-game` and `logout` intents; the latter emits `signin-again`
or `continue-guest`. Both require an explicit choice, with no close/Escape dismissal.
Existing `confirm` is still the pre-commit authentication state. `loading-player` and
`loadingPlayer` cover readiness with «Входим в аккаунт…» and no dismissal. Optional
`loadingProgress` is finite and clamped to 0–100; without it progress is indeterminate.
These are presentation ports: core lifecycle, persistence and automatic session-revocation
routing belong to [#448](https://github.com/manygamescorp/client-sdk/issues/448).

Additional components use existing public subpaths:

- `services/hud`: `HudViewItem.value` and optional `add: {id,label}` render balance
  capsules (`slot: 'top'`); both actions emit `open {id}`. Left/right items are 64×80
  tiles with 40px artwork; the list is capped at 64. `change {direction, revision}` replays
  the value animation (off under `prefers-reduced-motion`); `progress` 0–1 draws a bar,
  `state: 'locked'` dims the item. HUD, top bar and bottom menu buttons include the
  item label and current rounded percentage in their localized accessible name
  (`прогресс 50%` / `progress 50%`, including 0% and 100%). Updates replace that
  percentage; the visual bar is decorative (`aria-hidden`) to avoid duplicate announcements.
- `services/topbar` (#504): the top bar registry by context — `main` (meta screens), `core`
  (fullscreen core gameplay) or the game's own.
  `createTopBarRegistry({ now: () => sdk.time.now(), contexts, context, order, timers })`
  holds the items (`now` is required, there is no wall-clock fallback); `topBarModule(registry)`
  brings it into `createSdk({ modules })` as the capability `topbar.registry@1`, so SDK modules
  register without depending on the kit (`topBarItem(ctx.services, spec)` of
  `@manygamescorp/core/topbar` returns the same handle as HUD and the bottom menu: `active`,
  `setValue`, `setBadge`, `setTimer`, `setProgress`, `setState`, `dispose`).
  `createUiShell({ topBar, topBarContext })` draws the active context in
  `topBar.left/center/right` (`kit.topbar.<group>`) according to each item slot, and switches
  it by route.
  An empty center shows the game title; slot defaults to right. A context switched off (`contexts: { core: false }`,
  `setEnabled`) is no zone: registration there returns `false`, the module's handle is a no-op.
  `icon` accepts a semantic skin key up to 32 characters or a loader-resolved module image,
  validated by the same `hudModuleImage` check as the HUD registry: `http:`, `https:` or
  `file:` URL up to 2048 characters, ending in
  `/sdk-modules/<module>/<name>-<12 lowercase hex>.png|webp|jpg`, with no credentials,
  query or fragment. `topBarView` passes the image to the existing HUD renderer.
  Bounds: 32 items, 8 contexts per item, values are numbers or text up to 32 characters.

```ts
// Headless sdk.profile belongs to core when platformConfig.appId is present.
// Do not add a profile module. profileUiModule() only adds presentation.
// For optional KV/state/UI, Studio selects profile-pack if exposed by sdk.modules.list.
// `now` is read lazily, after createSdk below.
const topBar = createTopBarRegistry({ now: () => sdk.time.now(),
  contexts: { main: true, core: true } });
const sdk = createSdk({ modules: [topBarModule(topBar), inventory(), profileUiModule()],
  platformConfig, http: { appVersion } });
const shell = createUiShell(root, { title, topBar,
  topBarContext: (route) => (route === 'game.level' ? 'core' : 'main') });
```
- `services/progress`: `dailyReward` is a fullscreen window; `dailyRewardView` is the
  reusable tile content. Pass `trackKey`, at most seven `days: {key,title,amount,icon,status,
  wide?,operationId?}`. Status is `locked|available|claimed|pending|failed`; only an available
  server operation enables `claim {key,operationId}`. `claimed` requires owner confirmation.
  Many Play Skin D_Daily: 3 columns, the wide day 7 (`wide`, `caption?`, `extra?`), series bar
  «День N из M», lock/check badges, optional `nextInMs` for the «Новый подарок через…» line;
  landscape (`orientation: landscape`, height ≤ 520 px) is a two-column window.
- `services/daily-rewards` (mod-daily-rewards windows, MPS artboards, portrait + landscape):
  `dailyBoard` (B_Daily: nine days, locked main prize, `claim` / `claim-double`),
  `dailyCalendar` (CP_Calendar: cross-game days with game markers, `claim`, `play-game {gameId}`),
  `dailyGift` (B_Gift: `open {operationId}` after a rewarded ad, `close`). Confirmed items
  use `services/reward-window` (`rewardWindow` / `ui.reward`, D_Reward, `close`).
  Every claim needs the server `operationId`; without it
  the button is disabled. Errors use the standard UI Kit error window, not these windows.
  Screens: `docs/ui-kit-screens/mps-daily-698/` (`node scripts/ui-kit-daily-shots.mjs <dir>`).
  `retention` supports `track.dailyDays`; showcase maps issued ACKs to `pending`.
- `services/reward`: `levelComplete` accepts `level`, confirmed `items`, optional `stars`
  and `doubleAvailable`; emits `next`, `double-reward`, `close`.
- `services/ads`: `noLives` accepts `remainingMs`, localized `refillPrice`,
  `refillAvailable`, `videoAvailable`, optional host-selected `refillIcon`; emits `refill`, `reward-life`, `close`.

No window debits currency, grants rewards or restarts the game itself. Host providers
continue to own those actions. There are no new platform settings, HTTP endpoints or MCP methods.

### ManyPlay #452 completion of the exported layouts

`limitedOffer` uses a reward grid and a floating discount badge. Optional
`amountLabels` maps entity ids to host-localized display amounts (for example an
unlimited-life duration); `previousPriceText` displays a host-provided struck-through
price. Neither prop changes quantities, price lookup, availability or purchase intents.
Without those props the kit formats actual variant quantities and omits the former price.
`noLives.refillIcon` selects a bundled currency image; without it no currency is assumed.
The completion stars use `rating-star`, experience uses `xp`; HUD `star` remains the
existing event artwork. Daily 32/40px icons, offer 48px icons, reward-row 32px icons and
no-lives 72/20px icons are explicit exceptions present in the exported artboards; the
base icon tokens remain 16/24/40/56px.

[Issue-to-implementation audit and current captures](../../docs/ui-kit-screens/manyplay-452/README.md)
separate the already merged #461/#472 work from this follow-up. Account-switch behavior
belongs to #448/#414; new MP·02–06 content belongs to #438/#439. No platform setting,
permission, MCP method or size budget changes.

### Independent HUD and bottom-menu registries (#504)

Contracts live in core/hud and core/bottommenu. UI Kit implements them in
`services/hud-registry` and `services/bottommenu`; SDK modules import only core.
`hudRegistryModule(registry)` provides `hud.registry@1` as module `hud-ui`;
`bottomMenuModule(registry)` provides `bottommenu.registry@1` as module `bottommenu`.
Add these providers to the host composition; optional consumer dependencies use those IDs.
The shell receives `{hud, bottomMenu, topBar}` and switches their contexts by `topBarContext`.

`createHudRegistry({now, enabled, layout, match})` has only left/right columns, at most
64 icons, ordered by order/id. `createBottomMenuRegistry({now, enabled, slots: 3|5})`
keeps exactly 3 or 5 positions, including empty positions; registration reserves numeric
slot 1…N or center in every declared context. A conflicting reservation throws.
No registry or element type is shared between zones. Common handle methods have the
same semantics: setValue, setBadge(dot/count or null), setTimer(epoch ms or null),
setProgress(0…1 or null), setState(active/locked), dispose. The top bar handle
(`topBarItem`) is the same: `active` plus these methods. Badge kinds are dot/count only;
the countdown is a separate `timer`, not a badge kind.

Top-bar balance capsules reserve a separate 44×44 CSS px target for `add` (including
on touch screens). ManyPlay keeps the visible accent at 24×24 with a transparent
10px border; the target occupies layout space without overlapping the balance or
adjacent capsule. The capsule stays 40px high; leave room for the centered target
and focus ring inside the shell safe area. Localized `add.label`, keyboard activation
and busy/disabled behavior use the same native button and `open` intent.

Always inject `now: () => sdk.time.now()` into all three registries (HUD, top bar, bottom
menu); no Date.now fallback exists. Zone disabled at registration returns false to the
helper, producing an inactive no-op handle. The host/app chooses slot count and enabled
state in these registry settings; shell rendering never collapses empty slots. Every zone
draws badge and timer together. A slot conflict in a shared context throws
`SDKError('UI_BOTTOMMENU_SLOT_TAKEN')` from core `bottomMenuItem`. The bottom menu is one
`nav` landmark named by `sdk.bottommenu.label`; locked items are `aria-disabled`.
Use the existing configs MCP for application-authored settings and ui.hud/layout.

`ui.hud/layout` is read strictly by its typed schema (client-sdk#743):
`{ unlisted: 'show' | 'hide', items: { <id>: { slot: 'left' | 'right', order, visible, filters,
badge: { kind: 'dot' } | { kind: 'count', value: 1…999999 }, label: { key } | { values },
icon } } }`. `filters` (D-MATCH, segments) hides the item for other players; `badge` is shown
while the module or the game has set none; `label` replaces the registered label (`values`
per locale, up to 64 characters; `key` is an `sdk.l10n` key); `icon` is a theme icon name or a
module image URL. An entry with an unknown or invalid field is ignored as a whole (the item
keeps its registered defaults, `unlisted` applies) and the provider `hud-ui` emits
`hud:layout:ignored { path, code }` once per distinct record (`TYPE`, `PATTERN`, `RANGE`,
`UNKNOWN`; never the value). The example is in the `hud` entry of the catalog.
The relayout of `ui.hud/layout` on `configs:snapshot:updated` is done by the provider
`hud-ui` (`hudRegistryModule`), with or without the game facade `mod-hud`.

Center `variant` is `inline` (the kit primary button) or `raised` (a `--mp-icon-xl` circle
24px above the panel); a variant on a side slot is refused with `UI_BOTTOMMENU_INVALID`.
Raised is drawn in portrait only: in landscape the shell draws it inline (owner decision,
client-sdk#607). The layout follows the approved #607 mockup on the manyplay theme tokens
only: a full-width `--mp-cta-h` panel on `--mp-night` with a 1px `--mp-line` top seam
(landscape: the same full-width panel, 56px, glyph and label in a row), empty slots keep
their width, the item whose id equals the open shell route is current (`aria-current="page"`,
`--mp-violet-soft`/`--mp-violet-text`), badges, timer and progress as in the HUD. Side items
show the timer instead of the label as «2ч 14м» (en `2h 14m`; under an hour «59 м»/«59 с»);
the center count badge sits in the top-right corner and the timer is a coral pill under the
button (in landscape and in the 5-slot portrait center it takes the label's place). Locked items keep
their label, dim the icon and carry a lock; disabled (busy) items are dimmed whole. The shell
passes `orientation` from `(orientation:portrait),(max-width:640px)` and `current`; side
safe-area insets pad the panel, the bottom inset is the shell `ad-bottom` grid row painted
`--mp-night` under the menu. Screens:
`node scripts/ui-kit-bottommenu-shots.mjs <dir>` after `npm run build`.
All colors use --mp-*; transitions and value animations honor reduced motion.

`module.json.skin.closePosition` принимает тот же enum; core проверяет его перед загрузкой,
`skinFromManifest` переносит в скин. При `corner-out` длинный `popup` прокручивает
`[data-part=content]`, а другие диалоги — свои области содержимого. Браузерные тесты
проверяют прокрутку колёсиком до последнего элемента альбома, магазина, сундуков и инвентаря,
клики по действиям и внешнему крестику в portrait, landscape и desktop.
`head-left` действует также в landscape-окнах заданий и достижений.
Для покупки достаточно `button[data-part="shop-buy"]{font-size:31px;padding:17px}`:
базовые правила кнопок магазина имеют пониженную специфичность.

### Narrative presentation helpers (#991, partial)

`./services/narrative-playback` exports `narrativeTextFrame` and `bindNarrativeMedia`.
These are presentation helpers; the dialogue/cinematic components await Claude Design.
[API, lifecycle and pending work](../../docs/narrative-presentation.md).

### Скины игр

SDK поставляет только ManyPlay по умолчанию и механизмы `defineSkin`, `useSkin`,
`adoptSkin`, иконок, арта офферов и шаблонов окон. Код, CSS, шрифты с лицензиями
и ассеты скина игры хранятся в проекте игры и импортируют публичный `./skin`.
Нейтральный пример: `apps/showcase/src/skin-example.ts`. Игровые скины хранятся
в проекте игры вне обновляемого Studio-экспорта `src/site/`.

### Режим окна и слоты скина (#1036, первый экран: shopWindow)

```ts
const skin = defineSkin({ id: 'newspaper', windows: {
  shopWindow: { mode: 'fullscreen', slots: ['balance', 'deals', 'free', 'remove-ads', 'restore'],
    heading: { ru: 'Рекламная полоса', en: 'Advertisement' } },
} });
await useSkin(skin);
```

`windows` — нейтральный механизм без данных модулей. Ключ — имя компонента; `mode` —
`fullscreen` (вся доступная область host) либо `centered` (обычные размеры темы).
`slots` задаёт порядок существующих блоков; неизвестные имена игнорируются, неуказанные
блоки добавляются в исходном порядке. Дубликаты запрещены. Для магазина слоты:
`balance`, `deals` (все шесть групп в фиксированном порядке), `restore`, `empty`.
Скин перемещает весь слот `deals`; распределение офферов и порядок плейсментов общие для скинов.
`heading` — HTML-текст над заголовком, с обязательными ru/en. Обработка ошибок и результаты
покупки остаются вне перестановки. CSS скина оформляет блоки через прежние классы и `data-part`.
Шаблон следует тем же слоям и `skinScope`, что CSS, и снимается вместе со скином.
Остальные окна пока не читают `windows`; ManyPlay ID остаётся вне игровых скинов (E71).

Реализация игрового оформления и его конфиги находятся в проекте игры.

### Скины областей (#968)

`initSkins` подключает ленивый каталог E136. `registerSkin(id, {manifest, version, sha256})`
не делает I/O; `loadSkin(id)` возвращает `Skin`, дедуплицируя запросы по sha256.
Манифест — `SkinSpec` без `base`; значения `css` — **ключи CSS-файлов**, `assets` и
`fonts[].url` — полные ключи `apps/<appId>/skin/<sha256>.<ext>` того же приложения.
В CSS `url()` также принимает только полный ключ; относительных файлов нет.

```ts
import { initSkins, preloadSkinScope } from '@manygamescorp/ui-kit/skin';
import { createContentBlobCache } from '@manygamescorp/core/storage/content-blob-cache';

const skins = initSkins({
  assets: sdk.assets,
  windows: sdk.ui,
  cache: createContentBlobCache({ storage, blobs, namespace: 'ui-skins',
    maxBytes: 4 * 1024 * 1024, currentGid: () => gid }),
  match: filter => sdk.filters.match(filter),
  source: {
    read: () => sdk.configs?.get('ui.skins', 'main'),
    subscribe: update => {
      const offConfig = sdk.bus.on('configs:snapshot:updated', update);
      const offContext = sdk.context.on(update);
      return () => { offConfig(); offContext(); };
    },
  },
  preloadScopes: ['daily-rewards'],
  timeoutMs: 1500,
  diagnostic: (event, detail) => diagnostics(event, detail),
});
// При размонтировании/смене SDK identity:
// skins.dispose();
```

`storage`/`blobs` — core storage текущего приложения и API-origin, `gid` — текущий профиль;
`diagnostics` — диагностический callback хоста, не console. В конфиг-выборку boot нужно включить
`ui.skins`. Запись `main`: `{skins: [{id, manifest, version, sha256}], map: [{scope, skin, when?}]}`
(configs#422). `when` вычисляет только `sdk.filters.match` (D-MATCH); первое совпадение побеждает.
Изменение контекста игрока/конфига перечитывает уже открытые/предзагруженные области. Дата/сегмент
должны присутствовать в контексте SDK; runtime не заводит собственные часы или evaluator.

Окна принимают `skinScope: 'daily-tasks'`. `ModuleWindow.skinScope` запускает предзагрузку при
постановке в очередь, параллельно `canShow`. После `canShow`, перед показом очередь снова
ждёт preload актуального scope: завершённая предзагрузка до смены configs не разрешает
открытие без скина. Ошибка без прежнего scope-скина отклоняет `shown`, не вызывая `open`.
`registerModuleWindow(host, names, {main: scope})`
также передаёт `skinScope` в host params. Свой ShadowRoot механики подключается через
`adoptSkin(root, name, {scope, redraw})`. Document не принимает область: его стили глобальны.

Порядок: кит → механика → игра → область. Игровой слой один, областей много одновременно;
`useSkin(skin, {level: 'scope', scope})` заменяет только свою область. `shell`/`fonts` как цели CSS
области запрещены; `fonts` из манифеста создаёт общий дедуплицированный `@font-face` в документе.
Ассеты/заголовки окна используют свою область, затем нижние слои; явный резолвер:
`skinAssetUrl('skin/panel', {scope})`. `activeSkins()` возвращает scope, `resolveSkin(scope)` —
фактически применённый id и source (`config`, `game`, `mechanic`, `kit`).

Ошибка/неизвестный id/таймаут → игровой слой и `sdk:ui:skin-failed {scope, skin, code}`.
Коды runtime: `LOAD_FAILED`, `TIMEOUT`; неверный source snapshot — `CONFIG_INVALID` с пустыми
scope/skin. Повтор открытия повторяет неудачную загрузку. Старые ответы после смены конфига или
`dispose` не применяются. JSON/CSS ограничены 256 KiB на файл; каталог — 64 скина/256 правил,
отслеживаемые области — 256. Для production подключайте core blob-cache как в примере;
без cache runtime использует только память текущей страницы. `<style>`, blob URLs и SRI нет.

Фикстура: `apps/showcase/fixtures/configs/remote/ui.skins/main.json`; её поля `data` можно передать
`await skins.update(data)`. Манифесты лежат в `fixtures/skin-assets/apps/7/skin/`; их ключи вычислены
по байтам. Это данные для будущего экрана «Скины по областям»: дизайн Claude и screenshot-приёмка
ещё требуются. Публикация реальных файлов kind `skin` заблокирована panel#1253.

## Preview shell (client-sdk#740, E152)

`dist/preview/preview.js` and `preview.css` are published with the ui-kit files of each
version (`ui-kit/{version}/preview/`). HTML is never included in dist or CDN publications.
The panel page «Модули SDK» supplies its own HTML host inside
`<iframe sandbox="allow-scripts">` (opaque origin), loads the version's CSS, imports
`mount` from the CDN's `preview/preview.js` and calls `mount(container)` once.
The returned `{ dispose() }` removes the protocol listener and disposes the shell; call it
before replacing the preview. The host bootstrap is an external module on the panel side.
Drafts use the unchanged client-sdk#740 `postMessage` protocol.

The shell mounts the real UI Kit shell on mock registries: no SDK core, no auth, no API.
The panel owns the host CSP: allow its bootstrap and the selected CDN for scripts, CSS,
images, fonts and JSON module loading (`connect-src`); allow `data:`/`blob:` draft images
and inline component styles. Restrict `frame-ancestors` to panel hosts.
CDN module scripts and JSON need CORS for the opaque iframe origin.
Settings image URLs are checked against the module's CDN origin, not the HTML host origin.

For development only, serve the repository after `npm run build` and open
`packages/ui-kit/preview/index.html`; its `dev.js` imports the built module.
Neither file is copied to dist.

Protocol v1. Frame → parent: `{type:'ready',v:1}` once; `{type:'rendered',v:1,seq}` after every
applied message; `{type:'error',v:1,seq,code,moduleId?}` with `invalid_message`,
`unknown_module`, `settings_invalid` (the module is drawn on defaults), `render_failed`.
Parent → frame: `{type:'preview',v:1,seq,settings,modules:[{id,version?,settings}],screen,
orientation,locale?}`, `screen` is `main`, `core` or `window:<moduleId>`. A message is taken only
when `event.source === window.parent` and `event.origin` is one of `PANEL_ORIGINS`
(`src/preview/protocol.ts`); the rest is dropped silently. Limits: 256 KiB, 64 modules, id
`^[a-z][a-z0-9-]{0,31}$`. ui-kit `settings`: `skin` (`manyplay`/`default`) and the zone switches described below. The frame follows the
iframe size for portrait/landscape (the panel sizes it). Images of settings: `data:`, `blob:` or
https of the shell's own CDN only.

Module previews are in `src/preview/modules.ts` (`PREVIEW_MODULES`): `parts(settings, ctx)` returns
the HUD/bottom menu/top bar items and the windows of the module. The schema for validation comes
from `manygames.module.settings` of the `mod-*` package at build time
(`scripts/build-ui-kit-preview.mjs` writes `dist/preview/schemas.js` and copies the settings
validator of contracts-client next to the shell). A module without a definition draws
«no preview»; `iap`, `ads`, `auth*` are never loaded.

### Иконки и нейтральное ядро (#1037)

`./icon`: `icon(key, size?, options?)` возвращает декоративную картинку активного
скина из `assets['icon-' + key]`. Для крестика `close` при отсутствии `icon-close`
используется `assets.close` того же скина; `icon-close` имеет приоритет.
Если ключа нет, возвращается пустой
`span[data-part="icon"][data-icon="<key>"]`; эмодзи, первая буква подписи и картинки
другого скина не подставляются. `iconUrl` возвращает ссылку реестра или `undefined`. Для атласа ссылка содержит
`#sprite=x,y,width,height,atlasWidth,atlasHeight`; передавайте ключ в `icon`/`skinIcon`,
которые вырезают область PNG через SVG viewport без inline-стилей. Прямой `<img>`
подходит только для обычной ссылки без фрагмента спрайта. ManyPlay поставляет
один `assets/manyplay/icons.png` и карту `icons.json`; координаты также встроены
в ESM-реестр, поэтому загрузка иконок не требует fetch карты.
`options.scope` выбирает слой окна; после смены скина смонтированные компоненты
перерисовываются. Самый верхний применимый слой владеет всем реестром: отсутствие
ключа не означает наследование картинки нижнего слоя.
`options.itemId` + `options.assetUrl(itemId)` позволяют сначала получить ассет предмета
из каталога игры. Это резолвер предметов хоста, а не обращение ui-kit к сервису.

```ts
import { icon } from '@manygamescorp/ui-kit/icon';
import { defineSkin, useSkin } from '@manygamescorp/ui-kit/skin';
await useSkin(defineSkin({ id: 'paper', assets: {
  'icon-shop': 'https://cdn.my-game.test/shop.webp',
  'icon-currency': 'https://cdn.my-game.test/cash.webp',
} }));
const shopMark = icon('shop');
```

Стабильные семантические ключи: `menu`, `settings`, `close`, `shop`, `gift`, `bag`,
`currency`, `coins`, `gems`, `heart`, `user`, `login`, `globe`, `sliders`, `data`,
`trophy`, `ad`, `bug`, `info`, `star`, `rating-star`, `xp`, `mail`, `bell`, `calendar`,
`flame`, `quest`, `medal`, `medal-1`, `medal-2`, `medal-3`, `lock`, `check`, `sparkle`,
`freeze`, `video`, `store`, `boost`, `time`, `double`, `retry`, `hint`, `bolt`, `cards`,
`clock`, `stopwatch`, `stopwatch-chip`, `back`, `right`, `clipboard`, `warning`,
`no-signal`, `no-video`, `connected`, `connecting`, `play`, `point-star`, `brand-mark`.
Специализированные варианты компонентов также являются ключами реестра:
`account-*`, `hud-*`, `map-*`, `win-*`, `quest-*`, `task-*`, `level-*`, `chest-*`,
`provider-*`, `benefit-*`, `collection-*` и остальные ключи из
[карта бандла](../skin-manyplay/src/assets.ts). Их полный список — эта
карта, никакого дополнительного реестра SVG внутри компонентов нет.

Выбираемое оформление ManyPlay находится в `../skin-manyplay/src/`: токены, CSS, раскладки,
шрифтовые декларации и карта файлов `assets/manyplay/`. `@manygamescorp/skin-manyplay/theme` экспортирует
`manyplaySkin({ url?: '<каталог локальных woff2>' })` для явного выбора через `useSkin`.
Без выбранного слоя используется это оформление. С выбранным скином ядро оставляет
нейтральную структуру; необходимые CSS и размеры задаёт сам скин. `login` и `webLogin`
всегда используют фиксированный слой ManyPlay (E71), включая аккаунт, выбор аккаунта
и публичное имя. CSS и реестр иконок игры/механики/scope к ним не применяются. Название аккаунта ManyPlay ID и юридические ссылки
остаются содержимым сервиса, а декоративные знаки бренда берутся из реестра.

Гейт `ui-icons` в `npm run gates` запрещает пиктограммы и их Unicode-escape в
`src/**/*.ts` вне тестов. SVG для динамических данных (поле, progress, текст по дуге)
остаётся механизмом, статические значки находятся в ассетах скина.


## UI zones (E152, client-sdk#509)

`@manygamescorp/ui-kit/module` exports `createUiZones` and `uiKitModule`. Install the
single `ui-kit` foundation provider instead of separately installing topbar, HUD and
bottom-menu providers. Pass its registries and `zones` to `createUiShell`:

```ts
const ui = createUiZones({ now: () => sdk.time.now() });
const provider = uiKitModule(ui); // include in createSdk({ modules })
const shell = createUiShell(container, { title: 'Game', zones: ui,
  topBar: ui.topBarRegistry, hud: ui.hudRegistry, bottomMenu: ui.bottomMenuRegistry });
const handle = ui.hud.register({ moduleId: 'game', id: 'game.reward',
  icon: 'gift', label: 'game.reward', order: 40, fallback: ['bottomMenu'] });
handle.update({ badge: { kind: 'dot' }, timer: sdk.time.now() + 60000, value: 7 });
ui.screen.setMode('core');
handle.dispose(); // repeated disposal and updates after disposal are inert
```

The module's settings are `skin` (`manyplay` or `default`), `topbarMain`,
`topbarCore`, `hud`, `bottomMenu`, `windowQueue` (all booleans default true).
The selected built-in skin is a `kit` layer below mechanic/game/scope skins.
A disabled zone detaches its registry host. Topbar contexts are `main`, `core`,
or `^[a-z][a-z0-9-]{0,15}$`. Registration order is `order`, module id, item id.
HUD sides are `left` and `right`. The bottom menu retains its five-cell rendering
and supports up to five ordered entries; an occupied/full menu refuses an entry.

`@manygamescorp/contracts-client/ui-slots` exports `planUiSlots` and
`validateUiSlots`; `ui-slots.vectors.json` supplies shared conformance examples. Existing resolveSdk
also returns newest compatible `skins`; `sdk-resolution.vectors.json` covers
foundation packages, native goals, deprecated versions and shared-skin compatibility.
The planner describes zone availability, not a guarantee of capacity in a full menu.
A module publishes `ui.slots` (id, zone or fromSetting, contexts, order, fallback,
features, localized does; window slots may declare autoOpen) and `preview.mock`
(JSON object up to 8 KiB). `release:registry` validates these before any writes.
Core attaches the calling module's declared slots to the authenticated capability
call context; `ui.slots@1` does not trust a caller-provided module id.
Existing HUD/topbar/bottomMenu helpers use this capability when installed.
Without it they retain their individual registry contracts; no stored-data migration
or alternate platform.json format is introduced.

Unavailable zones try declared fallbacks in order, then return an inactive handle
and log one `ui:slot:skipped` debug message with moduleId/slot/zone (no settings).
The planner keeps explicit windows available when windowQueue=false.
The shell names each outer modal from its localized contribution title (the contribution id
is the fallback); `refresh()` updates both the visible title and the accessible name.
Tab and Shift+Tab cycle through the top frame's visible enabled controls, including its
close button and open shadow roots. A frame with no controls keeps focus itself.
Covered windows and shell background chrome are inert while a window is open. Closing a
child restores its opener in the parent; closing the last window restores its original
opener and releases the background. Host-page focus attempts are redirected into the top
modal. Components do not need to provide their own dialog or keyboard trap.

`ui.windows.enqueue({id,moduleId,priority,automatic,open(signal)})` serializes windows;
`open` returns `{closed,close}`. Automatic requests are ignored when the queue is off;
player requests remain available. Dispose/reset abort the opener and close late tickets. With the SDK module installed,
requests use the same host scheduling queue as SDK triggers; standalone preview has
a local queue. windowQueue=false also suppresses event-triggered SDK windows, while
player element triggers and non-window effects remain available.
`closed` must represent actual dismissal, not merely creation of a window.

Preview retains its current JS mount/dispose protocol (ready/rendered/error), sandbox
and origin checks. It now accepts these ui-kit settings, validates the same schema,
and uses the shared zones runtime. The old preview-only `theme` setting is removed.
`preview.mock` is publication metadata; preview renderers still use PREVIEW_MODULES.
Daily rewards automatic windows use real dismissal tickets; the host acknowledges
`daily-rewards:window:closed {name}` and handles `daily-rewards:window:close {name}`.
A host must acknowledge dismissal before another automatic window can appear.

The DOM fake ad view is `@manygamescorp/ui-kit/services/fake-ads`. The fake mediator
accepts an explicit view port; with no view it runs headlessly. It never creates DOM.


IAP views follow the same ownership: `services/fake-payment` exports
`fakePaymentSheet` for `fakeStore({ask:fakePaymentSheet})`; without an ask port an
interactive fake purchase fails without DOM. Existing fixed fake outcomes are unchanged.
Web payment confirmation belongs to the portal shell; UI Kit has no payment form or script loader.
Store adapter modules borrow lifetime-bound fake payment views through ui.slots@1.

### Нейтральное ядро и состояния пунктов (#1111)

Цвета, фоны, тени, радиусы и фирменная типографика находятся в `src/skins/`.
Собственный stylesheet компонента содержит reset и раскладку; автоматический ManyPlay
подключается через механизм скинов отдельным stylesheet. Явный скин, в том числе пустой
`defineSkin({ id: 'neutral' })`, заменяет автоматический ManyPlay. Для независимого
скина не подключайте ManyPlay как mechanic-слой: это явное наследование оформления.

HUD, topbar и bottommenu используют `data-part="item"` и `data-part="add"`.
В нейтральном состоянии подложка прозрачна; доступны `--kit-menu-hover-bg`,
`--kit-menu-focus-bg`, `--kit-menu-active-bg`, `--kit-menu-focus-color`,
`--kit-menu-hover-filter` и `--kit-menu-active-filter`. Без токенов фильтры отключены; остаётся видимый клавиатурный фокус.
Фильтр на кнопке создаёт containing block для абсолютных потомков: скин должен
применять brightness к глифу, если его позиция привязана к слоту меню. Пустой `title` блокирует наследование
служебной подсказки родителя; локализованная подпись остаётся в тексте и `aria-label`.
Гейт `ui-core-css` входит в `npm run gates` и отвергает литеральные цвета, фоны,
тени и ненулевые радиусы вне `src/skins/`, включая fallback цветов внутри `var()`.

### Локализация предложений (#1112)

Тексты `ShopOffer.ui` (включая `texts.title/description/badge/cta`,
а также `subtitle/name/unit`) принимают строку, `{ru, en}`, `{key}` или E95
`{values: {ru, en}}` / `{l10n}`. Разрешение происходит при каждом рендере по `lang`;
для ключей передайте `l10n: key => sdk.l10n.t(key)`. `layout` и ключи
ассетов остаются техническими строками.

Цена — только ответ стора: `product.price` + `product.currency` форматируются через
`Intl.NumberFormat(lang)`, готовый `priceText` передаётся из того же ответа. При неизвестной
цене показывается `—`. `ui.oldPrice` и `ui.discountPercent` не создают цену;
`offerOldPrice` удалён. Скин не содержит товарных цен.
Все HTML-тексты, включая газетные заголовки, переводятся; только надписи внутри
растровых изображений остаются частью картинки.

В dev (`useSkin(skin, { dev: true })`, автоматически на localhost) отсутствие `icon-close`,
`icon-menu`, `icon-back`, `icon-settings` даёт `UI_SKIN_MISSING_ICON:<skinId>:<key>`.
Для `icon-close` наличие `assets.close` также удовлетворяет проверке.
Каждый скин задаёт эти глифы сам; ассет подложки кнопки не заменяет глиф.

### Предзагрузка арта скина и тестовая оплата (#1210)

`await useSkin(skin)` в браузере ждёт загрузки и декодирования изображений из
`skin.assets` до применения слоя. Ссылки одного PNG-атласа с `#sprite=…`
предзагружаются одним изображением. При ошибке загрузки/декодирования или таймауте
15 с Promise отклоняется (`UI_SKIN_ASSET_LOAD_FAILED`), прежний слой остаётся.
В среде без браузерного `Image` предзагрузка пропускается. Это не предзагрузка
шрифтов, неявных CSS URL или изображений каталога приложения.

`payment` (`./services/media`) принимает `offer: {key, iconUrl?, variant}`:
приоритет арта — явный ключ `iconUrl` через `assetUrl`, `skin/offer-<key>`,
первый предмет выбранного варианта (`iconUrl` или `icon-<id>`), затем `icon-currency`.
Ключи должны совпадать во всех скинах игры. `FakeSheet.offer` передаёт эти данные
из `StorePurchaseRequest.offer`; showcase `kitPayment` передаёт их компоненту.
Без offer компонент использует `icon-currency` активного скина.

### Настройка магазина, наград и сундуков (решение владельца 24.10)

Магазин показывает отдельный блок для каждой группы-плейсмента: `shop_special`,
`shop_soft`, `shop_hard`, `shop_bundles`, `shop_ads`, `shop_other`. Более одной плашки
в `shop_special` показываются слайдером; оффер входит в одну группу (demo-game#152).
`ShopWindowProps.offers` — объединение результатов `sdk.iap.offers({ placement })`
для экспортированного `SHOP_SECTIONS` после загрузки `await sdk.iap.products()`.
Поле `placement` сохраняется при передаче оффера; без placement он входит в shop_other.
Офферы других плейсментов в магазин не попадают. `ui.section`, вид покупки, таймер и состав награды
не меняют группу. Intent `purchase` содержит `offerKey`, `variantKey`, `kind`, `placement`.
Заголовки секций: ключи `kit.shop.shop_special|shop_soft|shop_hard|shop_bundles|shop_ads|shop_other`
через `l10n`, с ru/en по умолчанию. CSS получает `data-placement` с точным ключом группы;
прежние `data-part` остаются для оформления. Одна special-плашка не имеет точек слайдера.

Баннер читает `ui.banner` (или `ui.assets.banner`) через общий `assetImage`, тексты —
`title/subtitle/badge`. Графика использует AssetRef (client-sdk#1235);
этот PR не добавляет обхода через прямой URL и не меняет core. На текущем main
изображения ещё используют существующий storage-key resolver `assetUrl`.
Оффер `ui` содержит `texts` title/subtitle/description/badge/cta, баннеры, иконки,
таймер и вариант плашки; изображения — AssetRef. Цена и валюта цены только от
стора: сначала `sdk.iap.products()`, затем `priceText`; fake — из настроек IAP
провайдера, не из кода игры (client-sdk#1240).

Размеры окон уже задаёт `popupKind`: `info` — компактное сообщение, `content` —
80% рабочей зоны, `fullscreen` — весь экран (client-sdk#1231). Скин оформляет окно,
но не меняет его тип. Награды показываются общей сеткой по три позиции в ряд (по четыре для 7–8 позиций),
с иконкой и количеством; локализованное название раскрывается по нажатию/подсказке,
сырой id не является подписью
(client-sdk#1233).

Сундук получает иконку из `images` каталога inventory, VFX открытия и бейдж `i`,
открывающий дочернее окно «Что внутри». Случайные награды помечаются `?`;
предпросмотр не обещает выпадение, окно результата показывает только подтверждённые
сервером позиции (client-sdk#1234). Закрытие дочернего окна возвращает к сундуку.
Эти требования к представлению не меняют выдачу наград; готовность релиза проверяется
по связанным задачам #1233/#1234 и exports установленного SDK.

### Hot replacement through sdk.modules.set (#1224)

Compose `createSdk({ modules, skin: createSkinSlot({ load, document }) })`, importing
`createSkinSlot` from `@manygamescorp/ui-kit/skin`. The host's `load(selection, signal)`
must return a `Skin` only after the bundle loader has checked compatibility and file
integrity. Bundle parsing/loading belongs to #1223; this adapter does not implement
or bypass those checks and does not create a scope catalog.

After boot, `await sdk.modules.set('skin', { package, version })` prepares CSS in
parallel and decodes images before replacing the game layer in one commit. Existing
components redraw with their current props and local state; module lifecycle hooks
are not restarted. `null` removes the selected game layer. A newer request cancels
the previous one. Destroy cancels preparation and removes the slot's layer.

Load/preparation failures retain the previous layer, reject with
`SDK_MODULE_LOAD_FAILED` (or `SDK_MODULE_TIMEOUT` after 15 seconds), and emit one
`sdk:ui:skin-failed { skin: package, version, code: 'LOAD_FAILED' | 'TIMEOUT' }` on
`sdk.bus`. Cancelled/superseded requests reject with `SDK_MODULE_CANCELLED` without
a failure event. The diagnostic contains neither a URL nor an underlying error.

### Состав наград и офферов (#1233)

`@manygamescorp/ui-kit/features/reward-grid` экспортирует `rewardGrid(props, items, options?)`.
Элементы: `{ id, name?, amount?, icon?, gold?, testid? }`; `amount` — подтверждённое число
или готовая строка (`+500`, `∞ 2 h`). Количества не вычисляются и не угадываются.
Сетка ограничена 50 элементами, имеет три колонки (четыре для 7–8 позиций); 1–2 позиции центрируются.
Для большого состава прокручивается сетка; размеры и оформление задаются общим
layout и выбранным скином.

Названия скрыты до наведения, фокуса клавиатурой или нажатия; accessible name кнопки
содержит название и количество. Нажатие на состав не вызывает claim/purchase.
`ui.unit` бесплатного оффера —
резервное название позиции в подсказке, без подписи рядом с количеством.
`icon` — тот же семантический ключ (`coins`, `gems`, `hint`, …) во всех скинах:
скин предоставляет `assets['icon-<key>']`; также поддерживаются app/skin asset keys
и картинки модуля. Без известного арта используется `icon-gift` текущего скина.

`rewardWindow`/его алиасы, `limitedOffer` (оба layout), предложения `shop`/`shopWindow`,
`dailyGift`, `promoBonus`, `chestOpened`, состав сундуков `inventory`, `levelComplete` и блок
`PopupBlock.kind='rewards'` (включая ID Rewards) используют общий слот `rewards` через
`windowSlots`. Скин оформляет `[data-part=reward-grid]` / `[data-part=reward-grid-entry]`
и токены `--kit-reward-tooltip-bg`, `--kit-reward-tooltip-color`, не дублируя разметку.
`DailyGiftProps.contents[].amount` опционален: если сервер не передал количество,
сетка не придумывает его. `InventoryChest.contents[].icon` задаёт ключ арта состава.

Игровой скин и его скриншоты проверяются в проекте игры.
Проверки компонента: `npm run typecheck`, `npx vitest run packages/ui-kit/test/reward-grid.test.ts`.

Скриншоты ManyPlay на текущем main: [reward-grid-1233](test/fixtures/reward-grid-1233/README.md).
Повторить: `npm run typecheck && node scripts/copy-ui-kit-assets.mjs && node scripts/build-manyplay-bundle.mjs`,
затем `node packages/ui-kit/test/reward-grid-shots.mjs packages/ui-kit/test/fixtures/reward-grid-1233`.

### Units and captions for gameplay goals (client-sdk#997)

`levelLose` accepts `reason: 'time' | 'moves' | 'blocked'`. The blocked reason says
«Фигурам нет места» / “No room for pieces”. Set `goalUnit: 'lines'` when `score` and
`target` count lines: the result caption and shortfall use lines, including Russian
plural forms. Omit `goalUnit` or use `'points'` for points.

`gameFrameView`, `gameHeadView` and `gameScreenView` accept an optional localized
`goal.label`, for example `{ value: 3, target: 10, label: 'Линии' }`. It supplies
the goal caption and progress bar accessible name. Without it the existing
«Цель» / “Goal” caption remains.


### Local ManyPlay bundle acceptance (#1228)

`loadSkinBundle` consumes the real output of `packages/skin-manyplay`, including its
component CSS, `component:shell`, fonts and PNG atlas crops. Component overrides are
CSS path strings; asset overrides are relative paths with an optional bounded PNG
`#sprite=x,y,width,height,atlasWidth,atlasHeight` crop. Only the fragment-free PNG is
fetched and hashed. Other fragments, queries, encoding and traversal are rejected.
PNG payloads allow 2 MiB; other responses allow 1 MiB; the full chain remains 8 MiB.
The existing public skin keys are unchanged, with only `component:shell` added.

After `npm run build`, `node packages/skin-manyplay/test/local-bundle.browser.mjs`
checks the real loader and `createSkinSlot` against the existing reward and popup
components locally in Chromium (390×844, 844×390, 1440×900). It checks repeated
installation/removal, scroll, close/actions, failed replacement and cleanup. Props
and handlers remain owned by the components. See the
[ManyPlay README](../skin-manyplay/README.md) for focused unit tests and screenshots.
This verifies local loading only; publication and live QA are outside #1228.

## Package schema and application settings

The UI Kit factory imports its unchanged settings schema from
`module-settings.schema.json`. This package asset is distinct from the
per-application `settings.json` generated by the SDK kit planner. Root
`module.json`, `module.sig` and `settings.json` are reserved publication paths;
the publisher rejects package files with those names before CDN writes.

This correction requires a new SDK publication. Existing immutable rc.20
artifacts retain the schema/app-settings collision tracked in #1498 and
manygamescorp/panel#1832; they must not be overwritten or reported as repaired.

### Portal audience in the existing ID window

`createPortalLogin` from `@manygamescorp/ui-kit/services/login` composes the same
`login` component with the account audience. Pass `audience: 'portal'`, `auth: sdk.auth`,
`now: () => sdk.time.now()` and `resendDelayMs` from host settings. `await flow.open()`
restores the core-owned portal session; render `flow.state`, route `emitIntent` to
`flow.dispatch`, subscribe to state changes and dispose the controller on unmount.
Email confirmation invokes only `auth.code({rid,code,audience:'portal'})`. It never
calls game init, confirm or social sign-in, never fabricates a gid, and never receives
a JWT. Existing start/email/code/done states and layout are reused. Social providers
and game account/profile screens are outside this composition. Logout calls core
logout after portal restoration; the host announces the resulting bridge state change.
The portal refresh endpoint requires the matching ID release (core README).
