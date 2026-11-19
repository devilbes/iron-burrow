import { canonicalLocale, } from './l10n.js';
export class StaticL10nSource {
    origin = 'cache';
    #bundles;
    #index;
    constructor(bundles, defaultLocale) {
        this.#bundles = new Map(Object.entries(bundles).map(([t, b]) => [canonicalLocale(t), b]));
        this.#bundles.delete(undefined);
        const locales = [...this.#bundles.keys()].map((tag) => ({ tag: String(tag), name: String(tag), status: 'published' }));
        this.#index = defaultLocale ? { defaultLocale, locales } : { locales };
    }
    load({ chain }) {
        const bundles = {};
        for (const tag of chain) {
            const tree = this.#bundles.get(tag);
            if (tree)
                bundles[tag] = tree;
        }
        const meta = { sha256: {}, version: {} };
        return Promise.resolve({ status: 'updated', index: this.#index, bundles, meta });
    }
}
