import schema from './asset-ref.schema.json' with { type: 'json' };
export const ASSET_REF_SCHEMA = Object.freeze(schema);
export const ASSET_REF_PATTERN = ASSET_REF_SCHEMA.pattern;
const pattern = new RegExp(ASSET_REF_PATTERN);
/** No I/O or authorization. HTTPS must already be canonical, without credentials. */
export function isAssetRef(value) {
    // Bound the input before any regex, including the control-character check.
    if (typeof value !== 'string' || value.length > ASSET_REF_SCHEMA.maxLength)
        return false;
    // eslint-disable-next-line no-control-regex -- reject controls before URL normalization
    if (/[\s\u0000-\u001f\u007f\\]/u.test(value)
        || pattern.exec(value)?.[0] !== value)
        return false;
    if (!value.startsWith('https://'))
        return true;
    try {
        const url = new URL(value);
        return url.protocol === 'https:' && !url.username && !url.password && url.href === value;
    }
    catch {
        return false;
    }
}
/** Exact host[:port], supplied by the environment. No wildcards, paths or credentials. */
export function isAssetHost(value) {
    if (typeof value !== 'string' || value.length > 253
        || !/^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?(?::[0-9]+)?$/.test(value))
        return false;
    try {
        return new URL(`https://${value}/`).host === value && !/[\s/@?#\\]/.test(value);
    }
    catch {
        return false;
    }
}