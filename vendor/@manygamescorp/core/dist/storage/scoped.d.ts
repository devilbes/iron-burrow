export interface StorageBackend {
    readonly length: number;
    key(index: number): string | null;
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
    removeItem(key: string): void;
}
export interface ScopedStorage {
    readonly prefix: string;
    get<T = unknown>(key: string): T | undefined;
    set(key: string, value: unknown): void;
    remove(key: string): void;
    keys(): string[];
    clear(): void;
}
export interface DeviceStorage {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
    removeItem(key: string): void;
}
export interface StorageRoot {
    readonly appCode: string;
    readonly prefix: string;
    gids(): readonly string[];
    readonly persistent: boolean;
    scope(gid: string, moduleId: string): ScopedStorage;
    device(): DeviceStorage;
    clearGid(gid: string, except?: readonly string[]): number;
    purgePrefix(prefix: string): number;
}
export interface StorageOptions {
    readonly appId?: number;
    readonly appCode: string;
    readonly api: string;
    readonly backend?: StorageBackend;
}
export declare const DEVICE = "device";
export declare function createMemoryBackend(): StorageBackend;
export declare function localBackend(probeKey: string): StorageBackend;
export declare function originTag(api: string): string;
export declare function storagePrefix(appId: number, api: string): string;
export declare function createStorage(options: StorageOptions): StorageRoot;
export declare function lockStorage<T>(backend: StorageBackend, name: string, run: () => Promise<T>): Promise<T>;
export declare function watchStorage(backend: StorageBackend, keys: readonly string[], changed: () => void): () => void;
//# sourceMappingURL=scoped.d.ts.map