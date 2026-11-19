import type { PlatformAdapter, PlatformLifecycleEvent } from '../platform.js';
export interface FakePlatform extends PlatformAdapter {
    emit(event: PlatformLifecycleEvent): void;
    readonly opened: readonly {
        url: string;
        mode: 'system' | 'inapp';
    }[];
}
export declare function createFakePlatform(): FakePlatform;
export interface PlatformContractHarness {
    readonly adapter: PlatformAdapter;
    emit(event: PlatformLifecycleEvent): void;
    opened(): number;
}
export interface PlatformContractCase {
    readonly name: string;
    run(harness: PlatformContractHarness): Promise<void>;
}
export declare const platformContractCases: readonly PlatformContractCase[];
//# sourceMappingURL=platform.d.ts.map