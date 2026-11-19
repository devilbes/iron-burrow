import { type KitLocalization } from './localization.js';
type FakeOutcome = 'success' | 'cancel' | 'error' | 'pending';
export declare function fakePaymentSheet(sheet: {
    readonly title: string;
    readonly priceText: string;
}, signal?: AbortSignal, localization?: KitLocalization): Promise<FakeOutcome>;
export {};
//# sourceMappingURL=fake-payment.d.ts.map