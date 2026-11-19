import { fakePaymentSheet } from './services/fake-payment.js';
export function adapterViews(signal, localization) {
    return Object.freeze({
        fakePaymentSheet(sheet, requested) {
            signal.throwIfAborted();
            return fakePaymentSheet(sheet, requested ? AbortSignal.any([signal, requested]) : signal, localization);
        },
    });
}
