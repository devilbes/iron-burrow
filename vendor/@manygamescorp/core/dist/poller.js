import { SDKError } from './error.js';
const invalid = () => {
    throw new SDKError('VALIDATION_FAILED', {
        message: 'invalid polling task', module: 'core',
    });
};
export function scopePoller(poller, signal, namespace) {
    return Object.freeze({ register(task) {
            if (signal.aborted)
                return () => { };
            if (!task || typeof task.id !== 'string' || !task.id
                || task.id.length > (namespace === undefined ? 1024 : 256))
                invalid();
            if (task.signal !== undefined && !(task.signal instanceof AbortSignal))
                invalid();
            return poller.register({ ...task,
                id: namespace === undefined ? task.id : JSON.stringify([namespace, task.id]),
                signal: task.signal ? AbortSignal.any([signal, task.signal]) : signal,
            });
        } });
}
