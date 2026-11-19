import { dailyCalendar } from '../services/daily-rewards.js';
import { leaderboardWindow } from '../services/leaderboard-window.js';
export const NOT_PREVIEWED = (id) => id === 'iap' || id === 'ads' || id.startsWith('iap-') || id.startsWith('auth');
const HOUR = 3_600_000;
const dailyRewards = {
    parts(settings, ctx) {
        const entry = settings['entry'] === 'bottomMenu' ? 'bottomMenu' : 'hud';
        const label = ctx.t('Ежедневная награда', 'Daily reward');
        const badge = settings['badge'] === false ? {} : { badge: { kind: 'dot' } };
        const day = (n, status) => ({
            key: `d${n}`, title: String(n), status, icon: n === 7 ? 'gems' : 'coins'
        });
        return {
            ...(entry === 'hud' ? { hud: [{ id: 'daily-rewards', icon: 'gift', label,
                        slot: settings['hudSide'] === 'left' ? 'left' : 'right',
                        timer: ctx.now + 3 * HOUR, ...badge }] }
                : { bottomMenu: [{ id: 'daily-rewards', icon: 'gift', label, slot: 4,
                            timer: ctx.now + 3 * HOUR, ...badge }] }),
            windows: { main: { title: label, component: dailyCalendar,
                    props: { trackKey: 'preview', days: [day(1, 'claimed'), day(2, 'claimed'),
                            day(3, 'claimed'), day(4, 'today'), day(5, 'upcoming'), day(6, 'upcoming'),
                            day(7, 'upcoming')],
                        games: [{ id: 'preview', name: ctx.t('Игра', 'Game'), tone: 'mint' }],
                        chest: { title: ctx.t('Сундук', 'Chest') },
                        claimLabel: ctx.t('Забрать награду дня 4', 'Claim day 4 reward') } } },
        };
    },
};
const leaderboards = {
    parts(_settings, ctx) {
        const names = ['Alex', 'Mila', 'Ivan', 'Nora', 'Leo', 'Eva', 'Max', 'Zoe'];
        const entries = names.map((name, i) => ({ rank: i + 1, gid: 1000 + i, name,
            score: 9800 - i * 730 }));
        return {
            hud: [{ id: 'leaderboards', icon: 'trophy', label: ctx.t('Рейтинг', 'Leaderboard'),
                    slot: 'right' }],
            windows: { main: { title: ctx.t('Рейтинг', 'Leaderboard'),
                    component: leaderboardWindow,
                    props: { tab: 'weekly', entries, subtitle: ctx.t('Осталось 2 д', '2 d left'),
                        me: { rank: 5, score: 9800 - 4 * 730 }, meGid: 1004 } } },
        };
    },
};
export const PREVIEW_MODULES = Object.freeze({
    'daily-rewards': dailyRewards,
    leaderboards,
});
