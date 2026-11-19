import type { ServiceCallContext } from '@manygamescorp/core/module';
export declare const IAP_STORE_SERVICE = "iap.store@1";
export interface IapStoreRegistration {
    selected(): boolean;
    connect(candidate: unknown): void;
}
export interface IapStoreRegistrationProvider {
    selected(call: ServiceCallContext): boolean;
    connect(call: ServiceCallContext, candidate: unknown): void;
}
//# sourceMappingURL=store-registration.d.ts.map