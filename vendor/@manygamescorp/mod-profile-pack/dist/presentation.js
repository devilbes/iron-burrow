import { topBarItem } from '@manygamescorp/core/topbar';
export function levelTopBar(services, changed) {
    let last;
    const handle = topBarItem(services, { id: 'level', icon: 'star', label: 'sdk.topbar.level',
        order: 30, contexts: ['main'] });
    return {
        get active() { return handle.active; },
        update(level) {
            if (typeof level !== 'number' || !Number.isSafeInteger(level) || level === last)
                return;
            const previous = last;
            last = level;
            handle.setValue(level);
            if (previous !== undefined)
                changed({ level, previous });
        },
        dispose() { handle.dispose(); last = undefined; },
    };
}
