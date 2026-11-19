import { registerModuleWindow } from '@manygamescorp/core/window-triggers';
export const PROGRESS_WINDOW_IDS = Object.freeze(['levels', 'level-win', 'level-lose', 'level-fail',
    'points', 'quests', 'achievements', 'cross-quest', 'season', 'content-end', 'continue', 'endless',
    'endless-entry', 'endless-revive', 'endless-result']);
export function progressWindows(host) {
    return registerModuleWindow({ module: 'progress',
        ...(host.signal ? { signal: host.signal } : {}),
        open: payload => host.open(payload), close: payload => host.close(payload),
        onClosed: listener => host.onClosed(listener),
    }, PROGRESS_WINDOW_IDS);
}
