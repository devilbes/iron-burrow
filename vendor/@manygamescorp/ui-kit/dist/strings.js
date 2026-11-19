export const HUD_STRINGS = Object.freeze({
    ru: { left: 'Быстрые действия слева', right: 'Быстрые действия справа',
        'daily-rewards': 'Награда дня', shop: 'Магазин', offers: 'Предложения', inventory: 'Инвентарь', progress: 'Прогресс',
        leaderboards: 'Рейтинг', mail: 'Почта', profile: 'ManyPlay ID', settings: 'Настройки' },
    en: { left: 'Left quick actions', right: 'Right quick actions',
        'daily-rewards': 'Daily rewards', shop: 'Shop', offers: 'Offers', inventory: 'Inventory', progress: 'Progress',
        leaderboards: 'Leaderboard', mail: 'Mail', profile: 'ManyPlay ID', settings: 'Settings' },
});
export const TOPBAR_STRINGS = Object.freeze({
    ru: { label: 'Верхняя панель', left: 'слева', center: 'по центру', right: 'справа',
        soft: 'Монеты', hard: 'Кристаллы', level: 'Уровень' },
    en: { label: 'Top bar', left: 'left', center: 'center', right: 'right',
        soft: 'Coins', hard: 'Gems', level: 'Level' },
});
export const BOTTOMMENU_STRINGS = Object.freeze({
    ru: { label: 'Главное меню' },
    en: { label: 'Main menu' },
});
export const UI_STRINGS = Object.freeze({
    en: { hud: HUD_STRINGS.en, topbar: TOPBAR_STRINGS.en, bottommenu: BOTTOMMENU_STRINGS.en },
    ru: { hud: HUD_STRINGS.ru, topbar: TOPBAR_STRINGS.ru, bottommenu: BOTTOMMENU_STRINGS.ru },
});
