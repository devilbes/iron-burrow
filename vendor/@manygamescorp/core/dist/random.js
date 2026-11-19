import { createRandom as sharedCreateRandom, restoreRandom as sharedRestoreRandom, } from '@manygamescorp/contracts-client/random';
import { SDKError } from './error.js';
export { SEED_PATTERN, isSeed, createSeed } from '@manygamescorp/contracts-client/random';
function invalid(code) { throw new SDKError(code, { module: 'core' }); }
export function createRandom(seed) {
    return sharedCreateRandom(seed, invalid);
}
export function restoreRandom(snapshot) {
    return sharedRestoreRandom(snapshot, invalid);
}
