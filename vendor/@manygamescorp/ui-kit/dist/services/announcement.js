import { nameComponents } from '../core.js';
import { component, h, assetImage, text } from '../features/shared.js';
function safeHttps(value) {
    if (!value || value.length > 2048)
        return undefined;
    try {
        const url = new URL(value);
        return url.protocol === 'https:' && !url.username && !url.password
            ? value
            : undefined;
    }
    catch {
        return undefined;
    }
}
export const announcementView = (p) => {
    const n = p.notice;
    const link = safeHttps(n?.linkUrl);
    return h('section', {
        'data-testid': 'broadcast-notice',
        role: n?.required ? 'alert' : 'status',
        'aria-live': 'polite',
    }, n
        ? h('div', { class: 'card' }, h('h3', {}, n.kind === 'maintenance'
            ? text(p, 'kit.announcement.maintenance')
            : n.kind === 'update'
                ? text(p, 'kit.announcement.update-required')
                : n.title), h('p', {}, n.text), n.startsAt
            ? h('p', { class: 'hint' }, n.startsAt, ' — ', n.endsAt ?? '')
            : null, assetImage(p, n.imageKey, { alt: n.title, loading: 'lazy' }), link
            ? h('a', { href: link, target: '_blank', rel: 'noopener noreferrer' }, text(p, 'kit.announcement.open'))
            : null)
        : null);
};
export const announcement = component(announcementView);
nameComponents({ announcement });
