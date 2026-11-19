export const canonicalLocale = (tag) => {
    try {
        return Intl.getCanonicalLocales(tag)[0];
    }
    catch {
        return;
    }
};
