import { SDKError } from '@manygamescorp/core/error';
export function dataClient(module, http, signal) {
    const controller = new AbortController();
    return {
        request(spec, caller) {
            if (controller.signal.aborted || signal?.aborted) {
                return Promise.reject(new SDKError('MODULE_NOT_ACTIVE', { module }));
            }
            return http.request({ ...spec, signal: AbortSignal.any([controller.signal,
                    ...(signal ? [signal] : []), ...(caller ? [caller] : [])]) });
        },
        dispose() { controller.abort(); },
    };
}
