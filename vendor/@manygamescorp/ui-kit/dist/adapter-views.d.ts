import type { KitLocalization } from './services/localization.js';
import { fakePaymentSheet } from './services/fake-payment.js';
export declare function adapterViews(signal: AbortSignal, localization?: KitLocalization): Readonly<{
    fakePaymentSheet(sheet: Parameters<typeof fakePaymentSheet>[0], requested?: AbortSignal): Promise<"error" | "success" | "cancel" | "pending">;
}>;
//# sourceMappingURL=adapter-views.d.ts.map