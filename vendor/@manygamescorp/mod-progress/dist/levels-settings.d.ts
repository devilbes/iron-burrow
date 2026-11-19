export declare const PROGRESS_SETTINGS: {
    readonly schemaVersion: 1;
    readonly fields: readonly [{
        readonly ref: "availability";
    }, {
        readonly key: "chunkSize";
        readonly type: "integer";
        readonly min: 1;
        readonly max: 200;
        readonly default: 10;
        readonly label: {
            readonly ru: "Размер порции уровней";
            readonly en: "Level chunk size";
        };
    }, {
        readonly key: "cacheMaxBytes";
        readonly type: "integer";
        readonly min: 81920;
        readonly max: 16777216;
        readonly default: 2097152;
        readonly label: {
            readonly ru: "Лимит кэша уровней (байты)";
            readonly en: "Level cache byte limit";
        };
    }, {
        readonly key: "prefetchDepth";
        readonly type: "integer";
        readonly min: 0;
        readonly max: 4;
        readonly default: 1;
        readonly label: {
            readonly ru: "Глубина префетча";
            readonly en: "Prefetch depth";
        };
    }];
};
//# sourceMappingURL=levels-settings.d.ts.map