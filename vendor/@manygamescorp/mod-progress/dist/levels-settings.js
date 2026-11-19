export const PROGRESS_SETTINGS = {
    schemaVersion: 1,
    fields: [
        { ref: 'availability' },
        { key: 'chunkSize', type: 'integer', min: 1, max: 200, default: 10,
            label: { ru: 'Размер порции уровней', en: 'Level chunk size' } },
        { key: 'cacheMaxBytes', type: 'integer', min: 81_920, max: 16_777_216, default: 2_097_152,
            label: { ru: 'Лимит кэша уровней (байты)', en: 'Level cache byte limit' } },
        { key: 'prefetchDepth', type: 'integer', min: 0, max: 4, default: 1,
            label: { ru: 'Глубина префетча', en: 'Prefetch depth' } },
    ],
};
