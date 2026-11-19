import { type L10nLoadRequest, type L10nLoadResult, type L10nSource, type StringTree } from './l10n.js';
export declare class StaticL10nSource implements L10nSource {
    #private;
    readonly origin = "cache";
    constructor(bundles: Readonly<Record<string, StringTree>>, defaultLocale?: string);
    load({ chain }: L10nLoadRequest): Promise<L10nLoadResult>;
}
//# sourceMappingURL=l10n-static.d.ts.map