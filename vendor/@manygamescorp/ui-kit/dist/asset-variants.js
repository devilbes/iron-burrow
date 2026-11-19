export function selectAssetVariant(variants, locale = 'en', density = 1) {
    const language = locale.toLowerCase().split('-')[0];
    for (const lang of [...new Set([locale.toLowerCase(), language, undefined])]) {
        const candidates = variants.filter(v => v.locale?.toLowerCase() === lang)
            .sort((a, b) => (a.density ?? 1) - (b.density ?? 1));
        const chosen = candidates.find(v => (v.density ?? 1) >= density) ?? candidates.at(-1);
        if (chosen)
            return chosen.url;
    }
    return undefined;
}
