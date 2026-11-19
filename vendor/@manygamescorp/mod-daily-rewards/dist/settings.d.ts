export declare const DAILY_REWARDS_SETTINGS: {
    readonly schemaVersion: 1;
    readonly fields: readonly [{
        readonly ref: "availability";
    }, {
        readonly key: "entry";
        readonly type: "enum";
        readonly label: {
            readonly ru: "Вход";
            readonly en: "Entry";
        };
        readonly options: readonly [{
            readonly value: "bottomMenu";
            readonly label: {
                readonly ru: "Нижнее меню";
                readonly en: "Bottom menu";
            };
        }, {
            readonly value: "hud";
            readonly label: {
                readonly ru: "HUD";
                readonly en: "HUD";
            };
        }];
        readonly default: "hud";
    }, {
        readonly key: "hudSide";
        readonly type: "enum";
        readonly label: {
            readonly ru: "Сторона HUD";
            readonly en: "HUD side";
        };
        readonly options: readonly [{
            readonly value: "left";
            readonly label: {
                readonly ru: "Слева";
                readonly en: "Left";
            };
        }, {
            readonly value: "right";
            readonly label: {
                readonly ru: "Справа";
                readonly en: "Right";
            };
        }];
        readonly default: "right";
        readonly visibleIf: {
            readonly entry: "hud";
        };
    }, {
        readonly key: "icon";
        readonly type: "image";
        readonly label: {
            readonly ru: "Иконка";
            readonly en: "Icon";
        };
        readonly accept: readonly ["image/png", "image/webp"];
        readonly maxBytes: 262144;
        readonly size: {
            readonly min: 96;
            readonly max: 512;
            readonly square: true;
        };
        readonly overridable: false;
    }, {
        readonly key: "badge";
        readonly type: "boolean";
        readonly label: {
            readonly ru: "Бейдж";
            readonly en: "Badge";
        };
        readonly default: true;
    }, {
        readonly key: "autoOpen";
        readonly type: "boolean";
        readonly label: {
            readonly ru: "Показывать окно при входе в игру";
            readonly en: "Open on start";
        };
        readonly default: true;
    }, {
        readonly key: "track";
        readonly type: "string";
        readonly label: {
            readonly ru: "Запись progress";
            readonly en: "Progress record";
        };
        readonly help: {
            readonly ru: "Ключ записи progress (цепочка входов, reset day). Состояние и выдачу ведёт сервер; награды, цикл и пропуск записываются в неё из этой карточки";
            readonly en: "Key of the progress record (login chain, reset day). The server owns state and grants; rewards, cycle and miss rule are published into it from this card";
        };
        readonly maxLength: 64;
        readonly pattern: "^[a-z0-9_]{1,64}$";
        readonly default: "daily";
        readonly overridable: false;
    }, {
        readonly key: "window";
        readonly type: "enum";
        readonly label: {
            readonly ru: "Вариант окна";
            readonly en: "Window variant";
        };
        readonly options: readonly [{
            readonly value: "week";
            readonly label: {
                readonly ru: "Неделя";
                readonly en: "Week";
            };
        }, {
            readonly value: "board";
            readonly label: {
                readonly ru: "Доска";
                readonly en: "Board";
            };
        }, {
            readonly value: "calendar";
            readonly label: {
                readonly ru: "Календарь";
                readonly en: "Calendar";
            };
        }, {
            readonly value: "gift";
            readonly label: {
                readonly ru: "Подарок";
                readonly en: "Gift";
            };
        }];
        readonly default: "week";
    }, {
        readonly key: "cycleLength";
        readonly type: "integer";
        readonly label: {
            readonly ru: "Длина цикла (дней)";
            readonly en: "Cycle length (days)";
        };
        readonly min: 1;
        readonly max: 31;
        readonly default: 7;
    }, {
        readonly key: "onMiss";
        readonly type: "boolean";
        readonly label: {
            readonly ru: "Сбрасывать цикл при пропуске дня";
            readonly en: "Reset the cycle on a missed day";
        };
        readonly help: {
            readonly ru: "reset.onMiss записи progress: включено — после пропуска цикл начинается заново, выключено — прогресс сохраняется";
            readonly en: "reset.onMiss of the progress record: on — a missed day restarts the cycle, off — progress is kept";
        };
        readonly default: true;
    }];
};
//# sourceMappingURL=settings.d.ts.map