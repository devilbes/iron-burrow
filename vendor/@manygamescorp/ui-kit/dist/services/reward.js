import { rewardGrid } from '../features/reward-grid.js';
import { icon as registryIcon } from '../icon.js';
import { nameComponents } from '../core.js';
import { component, h, text, button, dialog, windowSlots } from '../features/shared.js';
import { rewardWindow } from './reward-window.js';
export const reward = rewardWindow;
export function levelCompleteView(p) {
    return dialog(p, text(p, 'kit.reward.level-completed', { level: p.level }), () => p.emitIntent('close'), p.stars !== undefined && Number.isFinite(p.stars) ? h('div', { class: 'level-stars', role: 'img',
        'aria-label': `${text(p, 'kit.reward.stars')}: ${Math.max(0, Math.min(3, Math.floor(p.stars)))}` }, ...Array.from({ length: Math.max(0, Math.min(3, Math.floor(p.stars))) }, () => registryIcon('rating-star', 56))) : null, ...windowSlots(p, 'levelComplete', { rewards: rewardGrid(p, p.items.slice(0, 50).map((item, i) => ({
            id: `reward-${i}`, name: item.name, amount: `+${item.quantity}`, icon: item.icon ?? 'coins',
        }))) }), h('div', { class: 'window-actions' }, button(text(p, 'kit.reward.next'), 'next', p, { disabled: !p.ready || p.busy }), button(text(p, 'kit.reward.double-with-an-ad'), 'double-reward', p, { ghost: true, disabled: !p.ready || p.busy || !p.doubleAvailable })));
}
export const levelComplete = component(levelCompleteView, { presentation: 'fullscreen' });
nameComponents({ levelComplete });
