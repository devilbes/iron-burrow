export function windowOrientation(requested, viewport) {
    if (requested !== undefined && !['auto', 'portrait', 'landscape'].includes(requested)) {
        throw new TypeError('UI_WINDOW_ORIENTATION_INVALID');
    }
    return requested && requested !== 'auto' ? requested
        : viewport.width > viewport.height ? 'landscape' : 'portrait';
}
