export function profilePresentation(zones) {
    return {
        attach({ from, uiSlots }) {
            const item = zones.hud.register({ moduleId: from, id: 'profile', icon: 'user',
                ...(uiSlots?.find(slot => slot.id === 'entry')
                    ? { declaration: uiSlots.find(slot => slot.id === 'entry') } : {}),
                label: 'sdk.hud.profile', side: 'left', order: 10 });
            const level = zones.topbar.register({ moduleId: from, slotId: 'counters',
                ...(uiSlots?.find(slot => slot.id === 'counters')
                    ? { declaration: uiSlots.find(slot => slot.id === 'counters') } : {}),
                id: 'level', icon: 'star', label: 'sdk.topbar.level', order: 30, contexts: ['main'] });
            return {
                get active() { return level.active; },
                update(value) { level.update({ value }); },
                dispose() { item.dispose(); level.dispose(); },
            };
        },
    };
}
