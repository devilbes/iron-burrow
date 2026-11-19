import catalog from './facts.json' with { type: 'json' };
/** Exact names override wildcard namespaces; unlisted names are not writable. */
export const FACT_CATALOG = Object.freeze(catalog.map((entry) => Object.freeze(entry)));
/** Catalog entry for a fact name: an exact name first, then a `prefix.*` namespace. */
export function factDefinition(name) {
    return FACT_CATALOG.find((entry) => entry.name === name)
        ?? FACT_CATALOG.find((entry) => entry.name.endsWith('.*')
            && name.length > entry.name.length - 1 && name.startsWith(entry.name.slice(0, -1)));
}