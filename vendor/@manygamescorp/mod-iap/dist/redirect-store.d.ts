import type { ScopedHttp } from '@manygamescorp/core/scoped-http';
import { type StoreAdapter } from './store.js';
export interface RedirectPortalBus {
    request(ns: string, type: string, payload: unknown): Promise<unknown>;
}
export declare function redirectUrl(value: unknown): value is string;
export declare function redirectPaymentsDomain(): {
    ns: string;
    versions: number[];
    schemas: {
        'checkout.open': {
            safeParse(value: unknown): {
                success: boolean;
                data: unknown;
            };
        };
    };
    responseSchemas: {
        'checkout.open': {
            safeParse(value: unknown): {
                success: boolean;
                data: unknown;
            };
        };
    };
    timeouts: {
        'checkout.open': number;
    };
};
export declare function redirectStore(deps: {
    readonly storeId: string;
    readonly portal: RedirectPortalBus;
    readonly http: Pick<ScopedHttp, 'request'>;
}): StoreAdapter;
//# sourceMappingURL=redirect-store.d.ts.map