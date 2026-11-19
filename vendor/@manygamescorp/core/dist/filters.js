import { compileFilter, isValidFilter, matchFilter, canonicalizeFilter, FilterValidationError, } from '@manygamescorp/contracts-client/filters';
import { SDKError } from './error.js';
export function validate(filter) {
    if (isValidFilter(filter))
        return { ok: true };
    return { ok: false, error: new SDKError('VALIDATION_FAILED', {
            message: 'Invalid filter: unsupported syntax or filter limits exceeded', module: 'filters',
        }) };
}
export function compile(filter) {
    return compileFilter(filter);
}
export function match(filter, facts = {}) {
    return matchFilter(filter, facts);
}
export function createFilters(readFacts = () => ({}), readParameters = () => ({})) {
    return {
        match(filter, facts) {
            try {
                return matchFilter(filter, facts ?? readFacts(), readParameters());
            }
            catch {
                return false;
            }
        },
        validate,
        compile: (filter) => compileFilter(filter, readParameters()),
        canonicalize(filter) {
            try {
                return canonicalizeFilter(filter, readParameters());
            }
            catch (error) {
                if (!(error instanceof FilterValidationError))
                    throw error;
                throw new SDKError('VALIDATION_FAILED', { module: 'filters',
                    message: 'Invalid filter: unsupported syntax or filter limits exceeded',
                    details: { kind: error.kind, pointer: error.pointer } });
            }
        },
    };
}
