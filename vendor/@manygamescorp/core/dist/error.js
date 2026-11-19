export class SDKError extends Error {
    name = 'SDKError';
    code;
    httpStatus;
    rid;
    details;
    safeParams;
    module;
    retryable;
    retryAfterMs;
    constructor(code, options = {}) {
        super(options.message ?? code, options.cause === undefined ? undefined : { cause: options.cause });
        this.code = code;
        for (const key of ['httpStatus', 'rid', 'details', 'safeParams', 'module', 'retryAfterMs']) {
            if (options[key] !== undefined) {
                this[key] =
                    key === 'details' ? Object.freeze({ ...options.details })
                        : key === 'safeParams' ? pickSafeParams(options.safeParams)
                            : options[key];
            }
        }
        this.retryable = options.retryable ?? isRetryableCode(code, options.httpStatus);
    }
    toJSON() {
        return Object.fromEntries([
            'name', 'code', 'message', 'httpStatus', 'rid', 'module', 'details', 'safeParams',
            'retryable', 'retryAfterMs',
        ].map((key) => [key, this[key]])
            .filter(([, value]) => value !== undefined));
    }
}
function pickSafeParams(params) {
    const out = Object.create(null);
    for (const [key, value] of Object.entries(params)
        .filter(([, value]) => typeof value === 'string' || Number.isFinite(value)).slice(0, 16)) {
        out[key] = typeof value === 'string' ? value.slice(0, 256) : value;
    }
    return Object.freeze(out);
}
export function isRetryableCode(code, httpStatus) {
    return ['NETWORK_ERROR', 'TIMEOUT', 'RATE_LIMITED', 'UPSTREAM_UNAVAILABLE', 'IDEMPOTENCY_IN_PROGRESS'].includes(code)
        || [408, 429, 502, 503, 504].includes(httpStatus);
}
