import { EDITOR_TEXT } from './module-editor-text.js';
import { validateUiSlots } from './ui-slots.js';
import { validateModuleMechanic } from './module-mechanic.js';
import { validateLocalizedText, validateModuleSettingsSchema } from './module-settings.js';
export const MODULE_GROUPS = Object.freeze([
    Object.freeze({ id: 'foundation', title: Object.freeze(EDITOR_TEXT['category.foundation']), order: 0 }),
    Object.freeze({ id: 'core-mechanics', title: Object.freeze(EDITOR_TEXT['category.core-mechanics']), order: 1 }),
    Object.freeze({ id: 'meta-mechanics', title: Object.freeze(EDITOR_TEXT['category.meta-mechanics']), order: 2 }),
    Object.freeze({ id: 'economy', title: Object.freeze(EDITOR_TEXT['category.economy']), order: 3 }),
    Object.freeze({ id: 'progression', title: Object.freeze(EDITOR_TEXT['category.progression']), order: 4 }),
    Object.freeze({ id: 'social', title: Object.freeze(EDITOR_TEXT['category.social']), order: 5 }),
    Object.freeze({ id: 'monetization', title: Object.freeze(EDITOR_TEXT['category.monetization']), order: 6 }),
    Object.freeze({ id: 'liveops', title: Object.freeze(EDITOR_TEXT['category.liveops']), order: 7 }),
    Object.freeze({ id: 'notifications', title: Object.freeze(EDITOR_TEXT['category.notifications']), order: 8 }),
    Object.freeze({ id: 'analytics', title: Object.freeze(EDITOR_TEXT['category.analytics']), order: 9 }),
    Object.freeze({ id: 'localization', title: Object.freeze(EDITOR_TEXT['category.localization']), order: 10 }),
    Object.freeze({ id: 'platform', title: Object.freeze(EDITOR_TEXT['category.platform']), order: 11 }),
]);
const plain = (v) => typeof v === 'object' && v !== null && !Array.isArray(v);
const path = (v) => typeof v === 'string'
    && /^catalog\/[a-zA-Z0-9_-]+\.(png|webp|gif)$/.test(v);
/** Returns publication errors without relying on a server dependency. */
export function validateModuleCatalog(value) {
    if (!plain(value))
        return ['metadata must be an object'];
    const errors = [...validateModuleMechanic(value)];
    for (const [key, max] of [['title', 64], ['description', 280]]) {
        if (!validateLocalizedText(value[key], max))
            errors.push(key);
    }
    if (typeof value.llmDescription !== 'string' || !value.llmDescription.length
        // eslint-disable-next-line no-control-regex -- Reject forbidden control characters.
        || value.llmDescription.length > 1200 || /[<>\u0000-\u001f]/.test(value.llmDescription))
        errors.push('llmDescription');
    if (!MODULE_GROUPS.some(group => group.id === value.group))
        errors.push('group');
    if (!Array.isArray(value.tags) || value.tags.length > 8
        || new Set(value.tags).size !== value.tags.length || !value.tags.every(tag => typeof tag === 'string' && /^[a-z0-9-]{1,24}$/.test(tag)))
        errors.push('tags');
    if (value.load !== undefined && !['eager', 'on-demand'].includes(value.load))
        errors.push('load');
    if (!['required', 'optional'].includes(value.selection))
        errors.push('selection');
    if (!['ready', 'beta', 'soon'].includes(value.status)
        || (value.status === 'soon' && value.selection === 'required'))
        errors.push('status');
    const preview = value.preview;
    if (!plain(preview) || !path(preview.icon) || !/\.(png|webp)$/.test(preview.icon)
        || !Array.isArray(preview.media) || preview.media.length > 6
        || !preview.media.every(m => plain(m) && path(m.file) && validateLocalizedText(m.alt, 280)))
        errors.push('preview');
    if (!Array.isArray(value.docs) || value.docs.length > 8 || !value.docs.every(d => {
        if (!plain(d) || !validateLocalizedText(d.title, 64) || typeof d.uri !== 'string' || d.uri.length > 2048)
            return false;
        try {
            const url = new URL(d.uri);
            return !url.username && !url.password
                && (url.protocol === 'https:' || /^manyplay:\/\/docs\/sdk\/modules\/[a-z][a-z0-9-]*$/.test(d.uri));
        }
        catch {
            return false;
        }
    }))
        errors.push('docs');
    if (value.settings !== undefined && validateModuleSettingsSchema(value.settings).length)
        errors.push('settings');
    if (value.ui !== undefined) {
        if (!plain(value.ui)
            || Object.keys(value.ui).some(key => !['slots', 'windows', 'contributes'].includes(key))) {
            errors.push('ui.slots');
        }
    }
    if (plain(value.ui) && value.ui.slots !== undefined) {
        errors.push(...validateUiSlots({ slots: value.ui.slots }, value.settings));
        try {
            if (!plain(preview) || !plain(preview.mock)
                || new TextEncoder().encode(JSON.stringify(preview.mock)).length > 8192)
                errors.push('preview.mock');
        }
        catch {
            errors.push('preview.mock');
        }
    }
    return errors;
}
//# sourceMappingURL=module-catalog.js.map