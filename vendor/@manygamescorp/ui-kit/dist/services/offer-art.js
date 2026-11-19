import { skinAssetOf } from '../skin-layer.js';
import { skinIcon } from '../icon.js';
import { assetImage } from '../features/shared.js';
export function offerArt(p, offer, size) {
    const explicit = assetImage(p, offer.iconUrl, { width: size, height: size });
    if (explicit)
        return explicit;
    if (!skinAssetOf(`skin:offer-${offer.key}`, p.skinScope))
        return null;
    return assetImage(p.skinScope === undefined ? {} : { skinScope: p.skinScope }, `skin:offer-${offer.key}`, { width: size, height: size });
}
export function itemArt(p, item, size) {
    return assetImage(p, item.iconUrl, { width: size, height: size })
        ?? skinIcon(item.id, size, { scope: p.skinScope });
}
