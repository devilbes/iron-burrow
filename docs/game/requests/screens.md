# Заявки шага «экраны» (screens)

Подписи `src/modules/game/index.ts` экраны не меняли. Ниже — что нужно от соседних частей.

| ID | кому | что | зачем | обход сейчас |
|---|---|---|---|---|
| SCR-01 | логика (`PreStageInfo`, `DefeatInfo`) | поля `hullLives` (жизни за Spare Hull перед стадией) и `continueLives` (жизни продолжения) из `game.balance` | тексты `screen.pre.hull` «(+1 life)» и `screen.defeat.continue_hint` «+2 lives» — числа игры; по контракту §5 они должны быть параметрами | текст ГДД 20 дословно, без параметра; после поля — ключи станут `{lives}` |
| SCR-02 | интеграция (CR-01, `src/boot/ids.ts`) | `BOARDS = {siege, campaign}` | вкладки S13 перечисляют доски; сейчас — единственная строка с логическими именами досок `siege_best`/`campaign_score` в `src/screens/boards.ts`, типизированная `Board` API игры | константа `BOARDS` в `boards.ts`; после CR-01 — импорт из `ids.ts` |
| SCR-03 | арт (`src/skin/art.ts`) | `ITEMS.bst_*` и `OFFERS.<key>` (файлы `assets/ui/items|offers`, D-ICON-02) | окна кита (награда, daily) и экраны берут картинку оттуда | экраны падают обратно на `assets/game/icon_bst_*`; офферы без картинки — картинка первого предмета |
| SCR-04 | оболочка (CR-02) | окно настроек кита пишет kv `settings` | убрать кнопку `lobby-sound` | окно игры «Sound» (S14 б) |
