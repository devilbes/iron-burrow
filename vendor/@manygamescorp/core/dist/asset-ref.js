import { isAssetRef, isAssetHost } from '@manygamescorp/contracts-client/asset-ref';
export function resolveAssetRef(ref, options = {}) {
    if (!isAssetRef(ref))
        return undefined;
    try {
        if (ref.startsWith('skin:')) {
            const url = options.skinAsset?.(ref.slice(5));
            return url ? { kind: 'skin', url } : undefined;
        }
        if (ref.startsWith('asset:')) {
            const value = options.assetUrl?.(ref.slice(6));
            if (!value)
                return undefined;
            const url = new URL(value);
            if (!['https:', 'http:', 'file:'].includes(url.protocol) || url.username || url.password)
                return undefined;
            return { kind: 'image', url: url.href };
        }
        const url = new URL(ref);
        return options.allowedHosts?.some(host => isAssetHost(host) && host === url.host)
            ? { kind: 'image', url: url.href } : undefined;
    }
    catch {
        return undefined;
    }
}
