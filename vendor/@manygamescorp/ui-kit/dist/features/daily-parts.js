import { icon as registryIcon } from '../icon.js';
import { h, text } from './shared.js';
export function spanText(p, ms) {
    const total = Number.isFinite(ms) ? Math.max(0, Math.floor(ms / 1000)) : 0;
    const days = Math.floor(total / 86400);
    const hours = Math.floor(total % 86400 / 3600);
    const minutes = Math.floor(total % 3600 / 60);
    const seconds = total % 60;
    const [d, hh, m, s] = ['day', 'hour', 'minute', 'second'].map(unit => text(p, `kit.time.${unit}`));
    if (days)
        return `${days}${d} ${hours}${hh}`;
    if (hours)
        return `${hours}${hh} ${minutes}${m}`;
    return `${minutes}${m} ${String(seconds).padStart(2, '0')}${s}`;
}
export function clockText(ms) {
    const total = Number.isFinite(ms) ? Math.max(0, Math.floor(ms / 1000)) : 0;
    const pad = (n) => String(n).padStart(2, '0');
    return `${pad(Math.floor(total / 3600))}:${pad(Math.floor(total % 3600 / 60))}:${pad(total % 60)}`;
}
export function iconOr(name, size) { return registryIcon(name, size); }
export function checkIcon(size) { return registryIcon('check', size); }
export function lockIcon(size) { return registryIcon('lock', size); }
export function clockIcon(size) { return registryIcon('clock', size); }
export function stopwatchIcon(size, chip = false) { return registryIcon(chip ? 'stopwatch-chip' : 'stopwatch', size); }
export function videoIcon(size) { return registryIcon('video', size); }
export function sparkle(size, tone, slot) { return h('span', { class: `mp-sparkle mp-sparkle--${tone} mp-sparkle--${slot}` }, registryIcon('sparkle', size)); }
