import { type SecureStore, type SecureStoreKind } from '../storage/secure-store.js';
export interface FakeSecureStoreOptions {
    readonly available?: boolean;
    readonly kind?: SecureStoreKind;
    readonly backing?: Map<string, string>;
    readonly failOn?: ReadonlyArray<'get' | 'set' | 'delete'>;
}
export declare function createFakeSecureStore(options?: FakeSecureStoreOptions): SecureStore;
export interface SecureStoreContractCase {
    readonly name: string;
    run(create: () => SecureStore): Promise<void>;
}
export declare const secureStoreContract: readonly SecureStoreContractCase[];
//# sourceMappingURL=secure-store.d.ts.map