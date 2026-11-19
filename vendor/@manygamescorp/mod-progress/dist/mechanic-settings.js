import { SETTINGS_TEXT } from './settings-text.js';
import { recordValue } from './levels-validation.js';
import { validateModuleSettingsSchema } from '@manygamescorp/contracts-client/module-settings';
import { canonical, fail, freeze, integer, plain } from './mechanic-validation.js';
export const MECHANIC_SETTINGS_FIELDS = freeze([
    { key: 'mode', type: 'enum', default: 'core', label: SETTINGS_TEXT['mode.label'],
        options: [{ value: 'core', label: SETTINGS_TEXT['mode.core.label'] },
            { value: 'secondary', label: SETTINGS_TEXT['mode.secondary.label'] }] },
    { key: 'levelsSet', type: 'string', default: 'main', maxLength: 48,
        pattern: '^[a-z0-9._-]{1,48}$', visibleIf: { mode: 'core' },
        label: SETTINGS_TEXT['levelsSet.label'] },
    { key: 'progressKey', type: 'string', default: 'levels', maxLength: 64,
        pattern: '^[a-z0-9_]{1,64}$',
        label: SETTINGS_TEXT['progressKey.label'] },
    { key: 'stepPrefix', type: 'string', default: 'level_', maxLength: 32,
        pattern: '^[a-z0-9_]{1,32}$', visibleIf: { mode: 'core' },
        label: SETTINGS_TEXT['stepPrefix.label'] },
    { key: 'curve', type: 'string', default: 'settings', maxLength: 64,
        pattern: '^[a-z0-9_]{1,64}$', visibleIf: { mode: 'secondary' },
        label: SETTINGS_TEXT['curve.label'] },
    { key: 'cooldownSec', type: 'integer', default: 0, min: 0, max: 86_400,
        visibleIf: { mode: 'secondary' }, label: SETTINGS_TEXT['cooldownSec.label'] },
    { key: 'rewardPercent', type: 'integer', default: 100, min: 0, max: 1000,
        visibleIf: { mode: 'secondary' }, label: SETTINGS_TEXT['rewardPercent.label'] },
]);
export function parseMechanicSettings(settings) {
    if (!plain(settings))
        fail('MECHANIC_SETTINGS_INVALID', { path: '' });
    const out = {};
    for (const field of MECHANIC_SETTINGS_FIELDS) {
        const v = Object.hasOwn(settings, field.key) ? recordValue(settings, field.key) : field.default;
        const valid = field.type === 'enum' ? field.options.some(o => o.value === v)
            : field.type === 'integer' ? integer(v, field.min, field.max)
                : typeof v === 'string' && v.length <= field.maxLength && new RegExp(field.pattern).test(v);
        if (!valid)
            fail('MECHANIC_SETTINGS_INVALID', { path: field.key });
        Object.assign(out, { [field.key]: v });
    }
    return Object.freeze(out);
}
function constraints(field) {
    const { label: _label, help: _help, options, ...rest } = field;
    return { ...rest, ...(options ? { options: options.map(({ value }) => ({ value })) } : {}) };
}
export function checkMechanicSettingsFields(fields) {
    if (!Array.isArray(fields)
        || validateModuleSettingsSchema({ schemaVersion: 1, fields }).length)
        fail('MECHANIC_SETTINGS_INVALID', { path: 'fields' });
    for (const expected of MECHANIC_SETTINGS_FIELDS) {
        const matches = fields.filter(f => f?.key === expected.key);
        if (matches.length !== 1
            || canonical(constraints(matches.at(0))) !== canonical(constraints(expected))) {
            fail('MECHANIC_SETTINGS_INVALID', { path: expected.key });
        }
    }
    if (new Set(fields.map(f => f.key)).size !== fields.length)
        fail('MECHANIC_SETTINGS_INVALID', { path: 'fields' });
}
