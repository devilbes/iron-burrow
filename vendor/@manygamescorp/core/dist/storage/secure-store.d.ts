export type SecureStoreKind = 'keystore' | 'insecure-web' | 'memory';
export interface SecureStore {
    readonly kind: SecureStoreKind;
    isAvailable(): boolean;
    get(key: string): Promise<string | undefined>;
    set(key: string, value: string): Promise<void>;
    delete(key: string): Promise<void>;
}
export declare function assertSecureKey(key: unknown): asserts key is string;
export declare function assertSecureValue(value: unknown): asserts value is string;
//# sourceMappingURL=secure-store.d.ts.map