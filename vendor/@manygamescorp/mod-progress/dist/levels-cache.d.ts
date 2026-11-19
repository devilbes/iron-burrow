import type { ConfigPayload, ConfigSnapshot } from '@manygamescorp/core/configs';
import type { ScopedStorage } from '@manygamescorp/core/storage/scoped';
export declare function createLevelsCache(maxBytes: number, storage?: ScopedStorage, resolve?: (payload: ConfigPayload) => ConfigSnapshot): {
    get(scope: string, key: string): ConfigSnapshot | undefined;
    has(scope: string, key: string, version: number | undefined): boolean;
    put(scope: string, key: string, snapshot: ConfigSnapshot, conditional: boolean): void;
    reset(): void;
    clear(scope?: string): void;
};
//# sourceMappingURL=levels-cache.d.ts.map