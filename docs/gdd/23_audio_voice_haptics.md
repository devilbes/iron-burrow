# 23 — Звук, голос, хаптика (`aud.`)

Источник фактов: `00_MASTER.md` (audio = true: музыка + SFX; события поля, power-ups, бустеры, экраны S01–S16). Этот раздел — **бриф**: музыку и звуки генерирует шаг звука через ElevenLabs (музыка — генерация музыки, SFX — генерация звуковых эффектов). Готовые файлы: `assets/audio/<id>.mp3` (или `.ogg`, если шаг звука перекодирует; один файл на id), id → файл, громкость, луп — в `assets/audio/manifest.json`, авторство — `assets/audio/CREDITS.md`.

Описания в таблицах — промпты на английском (так точнее для генератора). Слова на растре/в звуке не нужны: голоса нет, в музыке нет вокала и слов.

---

## aud.tech — технические правила

- **aud.tech.01 Формат.** Основной формат — MP3 44.1 кГц: SFX моно 96–128 кбит/с, музыка стерео 96 кбит/с. Каждый SFX ≤ **120 КБ**, каждый музыкальный трек ≤ **1.2 МБ**, джингл ≤ 120 КБ. Общий аудио-бюджет ≤ 7 МБ.
- **aud.tech.02 Воспроизведение.** Web Audio API, один `AudioContext`, шины `music` и `sfx` → лимитер мастер-шины (−1 dBTP). Звуки декодируются в `AudioBuffer` один раз.
- **aud.tech.03 Луп музыки.** MP3 даёт паддинг кодера в начале и конце, поэтому луп делается не через `<audio loop>`, а через `AudioBufferSourceNode.loopStart/loopEnd`; точки лупа (секунды) пишутся в `manifest.json`. Генерация: трек на 2–4 с длиннее точки лупа, конец лупа совпадает по фазе с началом (шаг звука проверяет на слух и обрезает).
- **aud.tech.04 Загрузка.** При старте (S01) грузятся UI-звуки, `mus_lobby` и SFX геймплея; музыка главы — лениво при первом входе в главу (S03), `mus_siege` — при первом входе в Siege. До загрузки трека играет тишина, без ожидания.
- **aud.tech.05 Разблокировка.** `AudioContext.resume()` по первому жесту пользователя (тап/клик/клавиша). До жеста музыка не стартует.
- **aud.tech.06 Фон вкладки.** `visibilitychange` → hidden: `AudioContext.suspend()` и пауза игры; visible: `resume()` только звука, игра остаётся на паузе (S06).
- **aud.tech.07 Полифония.** Одновременно не более **12** голосов SFX. При переполнении вытесняется самый тихий голос с наименьшим приоритетом (1 — высший). Звуки приоритета 1 не вытесняются никогда.
- **aud.tech.08 Вариативность.** Частые звуки (выстрелы, попадания, взрывы врагов) — случайный pitch ±4 % и громкость ±1.5 dB на каждое воспроизведение; отдельные вариации файлами не генерируются.
- **aud.tech.09 Громкость.** Референс микса: музыка −20 LUFS интегрально; SFX нормализуются по пиковой громкости short-term к значению из таблицы; колонка «mix» — дополнительное усиление в коде относительно нормализованного файла.

## aud.music — музыка

Без вокала и слов. Общий мотив «Burrow motif» (4 ноты, низкий металлический синт) проходит через все треки — главы узнаются как одна игра. Инструменты: тёмные синты, перкуссия из металлических ударов и «кузнечных» звуков, глубокий бас, тёплые оранжевые «магмовые» пэды в кульминациях.

| id | где играет | характер | темп, тональность | длительность (луп) | луп | громкость | промпт для генерации |
|---|---|---|---|---|---|---|---|
| mus_lobby | S02 Lobby, S03 Stage Map, S10, S12, S13, S14 | спокойный, загадочный, «подземная мастерская», лёгкий пульс | 92 BPM, ре минор | 72 с | да | −20 LUFS | instrumental underground workshop ambience, dark analog synth pads, soft metallic percussion, slow pulsing bass, distant anvil hits, mysterious but warm, four-note low motif, no vocals, seamless loop |
| mus_stage_clay | S05, главы 1 | бодрый аркадный драйв, лёгкий, пружинистый | 120 BPM, ре минор | 88 с | да | −20 LUFS | upbeat arcade action track, punchy synth bass, clicky metallic drums, earthy wooden-and-iron percussion, energetic but light, four-note low motif as hook, no vocals, seamless loop |
| mus_stage_iron | S05, глава 2 | индустриальный, механический ритм, плотнее | 128 BPM, ми минор | 88 с | да | −20 LUFS | driving industrial arcade track, machine-press rhythm, hammering steel percussion, gritty synth bass, steam hiss accents, same four-note motif, no vocals, seamless loop |
| mus_stage_magma | S05, глава 3 | горячий, напряжённый, тяжёлый бас, «огненные» пэды | 136 BPM, фа минор | 88 с | да | −20 LUFS | intense arcade battle track, heavy distorted synth bass, fast metallic drums, rumbling low drone layer, fiery bright synth stabs, same four-note motif, no vocals, seamless loop |
| mus_siege | S05 в режиме Siege | максимальная энергия, непрерывное нарастание, осада | 144 BPM, фа минор | 96 с | да | −20 LUFS | relentless siege arcade track, pounding war drums mixed with metal clangs, aggressive synth arpeggio, rising tension, four-note motif in brass-like synth, no vocals, seamless loop |
| jgl_stage_start | старт стадии (после S04 / перезапуска) | короткий «к бою», металлический удар + мотив | 120 BPM | 2.0 с | нет | −18 LUFS | short arcade ready jingle, metallic hit then quick four-note synth motif rising, 2 seconds |
| jgl_stage_clear | S07 Stage Clear | победный, яркий, мажорный поворот мотива | — | 3.5 с | нет | −16 LUFS | triumphant short victory jingle, bright synth brass, metallic chimes, four-note motif resolved to major, 3.5 seconds |
| jgl_chapter_clear | S07 после стадий 10, 20, 30 | расширенная победа, торжественнее | — | 5.0 с | нет | −16 LUFS | grand victory fanfare, synth brass and anvil hits, glowing pads swell, ending on a big chord, 5 seconds |
| jgl_defeat | S08 Defeat | поражение, нисходящий мотив, «остывание» металла | — | 3.0 с | нет | −17 LUFS | short defeat jingle, descending four-note motif, detuned synth, cooling metal hiss, low thud at the end, 3 seconds |
| jgl_siege_result | S09 Siege Result (без рекорда) | итог, нейтрально-гордый | — | 3.0 с | нет | −17 LUFS | short neutral result jingle, steady synth chord and metallic shimmer, 3 seconds |
| jgl_siege_record | S09 при новом личном рекорде | рекорд, ярче stage_clear | — | 4.0 с | нет | −16 LUFS | short new record fanfare, rising synth arpeggio, bright chimes, big final hit, 4 seconds |

Правила смены музыки:

- Переход между треками — кроссфейд 800 мс. Вход в S05 из S04: `mus_lobby` уходит за 400 мс, `jgl_stage_start`, затем трек главы с начала.
- S06 Pause: музыка не останавливается, ФНЧ 800 Гц + −6 dB (переход 200 мс); снятие паузы — обратно за 200 мс.
- Победа/поражение: трек стадии останавливается фейдом 300 мс, звучит джингл, после джингла S07/S08/S09 идут в тишине до перехода в S03/S02, где снова `mus_lobby`.
- Continue (Spare Hull в S08): трек стадии продолжается с места остановки.
- Siege: `mus_siege` не перезапускается между волнами.

## aud.sfx — таблица SFX

Колонки: громкость = целевая громкость файла (short-term LUFS) · mix (усиление в коде, dB). Приоритет 1 — высший. Cooldown — минимальный интервал между запусками того же cue (повтор раньше — игнорируется); «лимит» — максимум одновременных экземпляров.

| # | событие | cue id | описание (промпт) | длит. | громкость · mix | приор. | cooldown / лимит |
|---|---|---|---|---|---|---|---|
| 1 | выстрел игрока, оружие L0–L2 | sfx_shot_player | punchy short mechanical cannon pop with a metallic click, compact and dry | 0.15 с | −14 · 0 | 3 | 60 мс / 2 |
| 2 | выстрел игрока, оружие L3 | sfx_shot_player_heavy | heavier cannon thump with a hot sizzling tail, deeper body | 0.25 с | −14 · 0 | 3 | 60 мс / 2 |
| 3 | выстрел врага | sfx_shot_enemy | small wet plasma spit with a buzzy acid tone | 0.15 с | −16 · −4 | 5 | 80 мс / 3 |
| 4 | пуля попала в кирпич (снята четверть) | sfx_hit_brick | crumbling brick chunk break, short gritty debris | 0.20 с | −16 · −2 | 4 | 40 мс / 3 |
| 5 | пуля попала в сталь без пробития / в край поля | sfx_hit_steel | sharp metallic ricochet ping, short | 0.20 с | −16 · −3 (край поля −6) | 5 | 50 мс / 2 |
| 6 | пуля L3 сломала четверть стали | sfx_break_steel | heavy metal plate tearing crunch with a clang | 0.35 с | −15 · 0 | 3 | 60 мс / 2 |
| 7 | пуля столкнулась с пулей | sfx_bullet_clash | tiny crisp zap with spark crackle | 0.15 с | −17 · −3 | 5 | 50 мс / 2 |
| 8 | взрыв врага (scout, grunt, gunner) | sfx_enemy_explode | compact scrap-metal explosion, crunchy boom with rattling debris | 0.6 с | −14 · 0 | 2 | 50 мс / 3 |
| 9 | попадание по brute без гибели | sfx_brute_hit | dull heavy armor clank with a plate rattle | 0.3 с | −15 · 0 | 3 | 60 мс / 2 |
| 10 | гибель brute | sfx_brute_explode | big heavy explosion with deep boom and falling armor plates | 0.9 с | −13 · 0 | 2 | 100 мс / 2 |
| 11 | первое попадание по мигающему носителю (выпал power-up) | sfx_powerup_drop | bright magical pop with rising chime | 0.5 с | −15 · 0 | 2 | 200 мс / 1 |
| 12 | power-up исчезает (истекли 12 с) | sfx_powerup_vanish | soft descending fizzle | 0.4 с | −20 · −3 | 5 | 200 мс / 1 |
| 13 | подбор Star (оружие +1) | sfx_pu_star | rising metallic power-up chime with a mechanical lock-in clunk | 0.7 с | −14 · 0 | 1 | 150 мс / 1 |
| 14 | подбор Bubble | sfx_pu_bubble | shimmering energy bubble inflating, airy whoosh | 0.7 с | −14 · 0 | 1 | 150 мс / 1 |
| 15 | подбор Rebar | sfx_pu_rebar | quick series of heavy steel plates slamming into place | 0.8 с | −14 · 0 | 1 | 150 мс / 1 |
| 16 | подбор Quake | sfx_pu_quake | deep ground rumble swelling into a big shockwave boom | 1.2 с | −13 · 0 | 1 | 150 мс / 1 |
| 17 | подбор Freeze | sfx_pu_freeze | crystalline ice crackle spreading, cold chime | 0.8 с | −14 · 0 | 1 | 150 мс / 1 |
| 18 | подбор Hull (+1 жизнь) | sfx_pu_hull | warm rising extra-life chime with an engine rev | 0.8 с | −14 · 0 | 1 | 150 мс / 1 |
| 19 | Freeze закончился | sfx_freeze_end | ice cracking and shattering, short | 0.5 с | −17 · −2 | 4 | 300 мс / 1 |
| 20 | Bubble / щит спавна гаснет (за 1.5 с до конца) | sfx_shield_down | flickering energy hum fading out | 0.6 с | −18 · −2 | 4 | 300 мс / 1 |
| 21 | пуля поглощена щитом | sfx_shield_block | soft energy deflect thump | 0.25 с | −17 · −2 | 4 | 80 мс / 2 |
| 22 | стена ядра возвращается в кирпич (конец Rebar / Steel Fortress) | sfx_wall_revert | metal plates retracting with a clunk | 0.6 с | −17 · −2 | 4 | 300 мс / 1 |
| 23 | бустер Bubble Shield | sfx_bst_bubble | powerful energy dome deploy, bright hum burst | 0.8 с | −13 · 0 | 1 | 300 мс / 1 |
| 24 | бустер Shockwave | sfx_bst_shockwave | massive charge-up whine into a huge concussive blast | 1.4 с | −12 · 0 | 1 | 300 мс / 1 |
| 25 | бустер Steel Fortress | sfx_bst_fortify | heavy fortress lockdown, big steel slams and hydraulic hiss | 1.0 с | −13 · 0 | 1 | 300 мс / 1 |
| 26 | Spare Hull: включён в S04 / Continue в S08 | sfx_bst_hull | heavy hull drop onto ground and engine start roar | 1.0 с | −14 · 0 | 1 | 300 мс / 1 |
| 27 | бустер недоступен (0 шт. или лимит на стадию) | sfx_bst_denied | short dull double buzz | 0.25 с | −18 · −2 | 3 | 250 мс / 1 |
| 28 | гибель игрока | sfx_player_explode | big punchy tank explosion, metal shrapnel, short low rumble tail | 1.0 с | −12 · 0 | 1 | 0 / 1 |
| 29 | респаун игрока | sfx_player_spawn | ground drill burrowing up, engine kick | 0.8 с | −16 · −1 | 2 | 0 / 1 |
| 30 | движение игрока (луп, пока зажато направление) | sfx_engine_loop | low steady tank engine idle-to-move rumble with tread clatter, seamless loop | 1.0 с (луп) | −22 · −6 | 5 | — / 1 |
| 31 | скольжение по маслу | sfx_oil_slide | slick wet skid squeal | 0.4 с | −18 · −3 | 4 | 400 мс / 1 |
| 32 | разрушена первая четверть кольца ядра за стадию | sfx_core_alarm | urgent two-tone metallic alarm beep, short | 0.8 с | −14 · 0 | 1 | 5000 мс / 1 |
| 33 | ядро уничтожено | sfx_core_destroyed | huge crystal energy implosion and shatter, deep boom, power-down whine | 2.0 с | −11 · 0 | 1 | 0 / 1 |
| 34 | появление врага | sfx_enemy_spawn | ground cracking open with a buzzy acid-green energy swirl | 0.6 с | −18 · −3 | 4 | 300 мс / 2 |
| 35 | стадия: осталось 0 врагов (последний убит) | sfx_last_enemy | heavy final impact boom with ringing metal | 0.8 с | −13 · 0 | 1 | 0 / 1 |
| 36 | Siege: начало волны | sfx_wave_start | war horn-like synth swell with metal hit | 1.2 с | −15 · 0 | 2 | 1000 мс / 1 |
| 37 | Siege: волна зачищена | sfx_wave_clear | short bright confirmation chime with anvil ring | 0.9 с | −15 · 0 | 2 | 1000 мс / 1 |
| 38 | UI: нажатие кнопки / узла стадии | sfx_ui_click | crisp small metal switch click | 0.08 с | −18 · −2 | 3 | 50 мс / 2 |
| 39 | UI: назад / закрыть попап | sfx_ui_back | softer lower metal click | 0.08 с | −19 · −2 | 3 | 50 мс / 2 |
| 40 | UI: переключение таба / тумблера | sfx_ui_toggle | short mechanical latch flick | 0.10 с | −19 · −2 | 3 | 50 мс / 2 |
| 41 | UI: открытие попапа | sfx_ui_popup | metallic panel slide-in whoosh | 0.25 с | −19 · −3 | 4 | 150 мс / 1 |
| 42 | UI: тап по закрытому узлу / Siege на замке | sfx_ui_locked | dull padlock rattle | 0.25 с | −18 · −2 | 3 | 200 мс / 1 |
| 43 | пауза вкл/выкл (S06) | sfx_ui_pause | soft low mechanical clunk | 0.15 с | −18 · −2 | 3 | 150 мс / 1 |
| 44 | S07: начислена звезда (1, 2, 3 — pitch +0/+2/+4 полутона кодом) | sfx_star | bright metallic star ding with sparkle | 0.5 с | −14 · 0 | 2 | 250 мс / 1 |
| 45 | S07/S09: пересчёт счёта (тик) | sfx_score_tick | tiny soft counter tick | 0.04 с | −22 · −4 | 5 | 40 мс / 1 |
| 46 | награда: выдан бустер (S07, финал главы, стартовый грант) | sfx_reward | rewarding item pop with warm chime and crate thud | 0.9 с | −14 · 0 | 2 | 200 мс / 1 |
| 47 | S12: получение ежедневной награды | sfx_daily_claim | crate lid opening with golden shimmer and chime | 1.2 с | −14 · 0 | 2 | 300 мс / 1 |
| 48 | S11: покупка успешна | sfx_purchase_ok | satisfying heavy crate unlock followed by a bright chime cascade | 1.2 с | −13 · 0 | 1 | 500 мс / 1 |
| 49 | S11: покупка не прошла / отменена | sfx_purchase_fail | soft low negative double tone | 0.5 с | −18 · −2 | 2 | 500 мс / 1 |
| 50 | S15: шаг туториала | sfx_tut_step | gentle soft ping | 0.3 с | −19 · −3 | 3 | 300 мс / 1 |

Итого: 50 SFX + 11 музыкальных треков и джинглов = 61 аудио-файл.

## aud.duck — ducking и микс

| триггер | что приглушается | на сколько | атака / удержание / отпускание |
|---|---|---|---|
| любой джингл (`jgl_*`) | шина `music` | −12 dB (если трек ещё играет) | 100 мс / длительность джингла / 600 мс |
| `sfx_player_explode` | `music` | −8 dB | 50 мс / 800 мс / 500 мс |
| `sfx_core_destroyed` | `music` и все остальные SFX | music −14 dB, sfx −10 dB | 30 мс / 1500 мс / — (дальше джингл поражения) |
| `sfx_bst_shockwave`, `sfx_pu_quake` | `music`; голоса `sfx_enemy_explode` в этот момент | music −6 dB, взрывы −6 dB | 50 мс / 1000 мс / 400 мс |
| `sfx_core_alarm` | `music` | −6 dB | 50 мс / 800 мс / 300 мс |
| звуки приоритета 1–2 | `sfx_shot_enemy`, `sfx_engine_loop` | −6 dB | 20 мс / длительность звука / 200 мс |
| S06 Pause, системные окна UI Kit поверх S05 | `music` + все SFX поля | music ФНЧ 800 Гц −6 dB; SFX поля на паузе | 200 мс |
| Freeze активен (8 с) | `music` | ФНЧ 2 кГц, −3 dB | 300 мс вход / 300 мс выход |

## aud.settings — настройки (profile-pack kv)

- Хранятся в profile-pack kv одним ключом `settings` (JSON):

```json
{ "v": 1, "music": true, "sfx": true, "haptics": true, "motion": false }
```

- `music`, `sfx` — тумблеры on/off в S14 (хуки `settings-music`, `settings-sfx`, 20 `ui.`); громкость шин фиксирована tunables `aud.bus.music` = 0.7, `aud.bus.sfx` = 0.9 (выкл. = 0). `motion` — Reduce Motion (дефолт — `prefers-reduced-motion`, D-20-03). `haptics` — тумблер в S14 (`settings-haptics`), показывается только на тач-устройстве (`pointer: coarse`), если `sdk.device.haptics` доступен. Единая схема ключа `settings` для всех разделов (15, 20, 22, 23).
- Значения по умолчанию — как в примере; до загрузки профиля действуют они.
- Изменение применяется сразу; запись в kv — с дебаунсом 1 с после последнего изменения и при закрытии S14. Локальная копия в памяти — источник правды для текущей сессии; при ошибке записи повтор при следующем изменении, игрок ошибку не видит.
- В S06 Pause — быстрые тумблеры music on/off и sfx on/off (пишут те же поля `settings`).

## aud.voice — голос

Голосовых реплик **нет** (D-23-01). Обоснование: аркадный темп (стадия 90–180 с, события каждую секунду — голос либо перекрывает важные SFX, либо запаздывает); язык игры только en, а голос потребовал бы отдельной озвучки на каждую будущую локаль; лимит бюджета генераций и веса загрузки web-сборки. Роль «диктора» выполняют джинглы, `sfx_core_alarm`, `sfx_wave_start` и тексты UI.

## aud.haptics — хаптика

- Только через `sdk.device.haptics` (SDK core; сигнатура — уточняет интеграция) на тач-устройствах (`pointer: coarse`), только при `settings.haptics = true`; прямой `navigator.vibrate` запрещён (всё через SDK). Если SDK сообщает, что вибрации нет, — молча ничего, тумблер в S14 скрыт. Десктоп — никогда.
- Не вибрирует, пока вкладка скрыта или игра на паузе.

| событие | паттерн | примечание |
|---|---|---|
| выстрел (любой) | нет | слишком часто, утомляет |
| гибель игрока | 80 мс | |
| ядро уничтожено | 200 мс | |
| попадание по brute без гибели | нет | |
| подбор power-up | 20 мс | лёгкое подтверждение |
| бустер Shockwave / подбор Quake | [40, 40, 60] | «удар волной» |
| разрушена первая четверть кольца ядра | [30, 60, 30] | дублирует `sfx_core_alarm` |
| UI | нет | |

Cooldown хаптики — общий 150 мс (повтор раньше игнорируется), кроме гибели игрока и ядра — они проходят всегда.

## aud.budget — генерации и бриф шагу звука

- Генераций ElevenLabs: 50 SFX × до 3 попыток + 11 музыкальных × до 2 попыток — не более **172** запросов.
- Приёмка каждого файла: длительность ±20 % от таблицы, без щелчков на старте/конце (фейд 5 мс), тишина в начале ≤ 10 мс, размер в лимите (SFX ≤ 120 КБ), луп без шва (для `mus_*` и `sfx_engine_loop`).
- В промпты нельзя добавлять названия чужих игр, брендов и исполнителей.

## aud.decisions — решения

- **D-23-01** Голоса нет (см. aud.voice).
- **D-23-02** Отдельный трек на каждую главу (3) + свой трек Siege, связанные общим мотивом: смена главы ощутима, вес ленивой загрузкой не бьёт по старту.
- **D-23-03** Формат MP3 с точками лупа в манифесте (MP3 декодируется во всех целевых браузерах, родной выход ElevenLabs), луп через Web Audio, а не `<audio loop>`.
- **D-23-04** Вариативность частых звуков — pitch/gain-рандом кодом, а не отдельные файлы.
- **D-23-05** Настройки звука и хаптики — один kv-ключ `settings` в profile-pack.
