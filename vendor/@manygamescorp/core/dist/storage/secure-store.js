import { SDKError } from '../error.js';
const SECURE_KEY = /^[A-Za-z0-9][A-Za-z0-9:._-]{0,255}$/;
export function assertSecureKey(key) {
    if (typeof key !== 'string' || !SECURE_KEY.test(key)) {
        throw new SDKError('SDK_STORAGE_KEY_INVALID', {
            message: 'secure store key is invalid',
            details: { field: 'key' },
        });
    }
}
export function assertSecureValue(value) {
    if (typeof value !== 'string') {
        throw new SDKError('SDK_STORAGE_VALUE_INVALID', {
            message: 'secure store value must be a string',
            details: { type: typeof value },
        });
    }
}
