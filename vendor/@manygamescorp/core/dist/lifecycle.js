import { createScopedBus } from './bus.js';
import { SDKError } from './error.js';
import { snapshotError } from './bus-payload.js';
import { defineModule } from './module.js';
import { scopePoller } from './poller.js';
export const MODULE_STATE_CHANGED = 'module:state:changed';
export class ModuleLifecycle {
    id;
    #definition;
    #context;
    #bus;
    #controller = new AbortController();
    #polling = new AbortController();
    #timeouts;
    #parent;
    #state = 'registered';
    #reason;
    #busy = false;
    #interrupt;
    constructor(definition, context, bus, options = {}) {
        this.#definition = defineModule(definition);
        this.id = this.#definition.manifest.id;
        this.#bus = bus;
        const timeouts = {};
        for (const step of ['init', 'start', 'stop', 'dispose']) {
            const value = options.timeouts?.[step] ?? options.timeoutMs ?? 10_000;
            if (!Number.isInteger(value) || value <= 0 || value > 2_147_483_647) {
                throw new SDKError('VALIDATION_FAILED', { message: 'invalid lifecycle timeout' });
            }
            timeouts[step] = value;
        }
        this.#timeouts = timeouts;
        this.#parent = context.signal;
        const poller = context.poller;
        this.#context = Object.freeze({
            ...context, signal: this.#controller.signal,
            ...(poller ? { poller: Object.freeze({ register: (task) => scopePoller(poller, this.#polling.signal).register(task) }) } : {}),
            bus: createScopedBus(bus, this.#definition.manifest, { signal: this.#controller.signal }),
        });
        if (this.#parent.aborted)
            this.#onAbort();
        else
            this.#parent.addEventListener('abort', this.#onAbort, { once: true });
    }
    get state() { return this.#state; }
    get reason() { return this.#reason; }
    get context() { return this.#context; }
    resolve() {
        this.#check('resolved', ['registered']);
        this.#busy = true;
        try {
            this.#change('resolved');
        }
        finally {
            this.#busy = false;
        }
    }
    init() {
        return this.#run('init', 'initialized', ['resolved'], () => this.#definition.init(this.#context));
    }
    start() {
        return this.#run('start', 'started', ['initialized', 'stopped'], () => {
            if (this.#polling.signal.aborted)
                this.#polling = new AbortController();
            return this.#definition.start?.(this.#context);
        });
    }
    stop(reason) {
        if (!['hidden', 'auth-change', 'unload'].includes(reason)) {
            return Promise.reject(new SDKError('VALIDATION_FAILED', {
                message: 'invalid module stop reason', module: this.id,
            }));
        }
        return this.#run('stop', 'stopped', ['started'], () => {
            this.#polling.abort();
            return this.#definition.stop?.(reason);
        }, reason);
    }
    dispose() {
        return this.#run('dispose', 'disposed', ['registered', 'resolved', 'initialized', 'stopped', 'failed'], () => {
            this.#detach();
            this.#polling.abort();
            this.#controller.abort();
            return this.#definition.dispose?.();
        });
    }
    #check(to, allowed) {
        if (this.#busy || !allowed.includes(this.#state)) {
            throw new SDKError('SDK_MODULE_STATE_INVALID', {
                module: this.id, details: { from: this.#state, to, busy: this.#busy },
            });
        }
    }
    #change(to, reason) {
        const from = this.#state;
        this.#state = to;
        const event = Object.freeze({
            id: this.id, from, to, ...(reason === undefined ? {} : {
                reason: reason instanceof SDKError ? snapshotError(reason) : reason,
            }),
        });
        this.#bus.emit(MODULE_STATE_CHANGED, event);
    }
    #detach() {
        this.#parent.removeEventListener('abort', this.#onAbort);
    }
    #onAbort = () => {
        const error = new SDKError('SDK_MODULE_CANCELLED', { module: this.id });
        if (this.#interrupt) {
            this.#interrupt(error);
            this.#controller.abort(error);
        }
        else if (this.#state !== 'failed' && this.#state !== 'disposed') {
            this.#busy = true;
            try {
                this.#fail(error);
            }
            finally {
                this.#busy = false;
            }
        }
    };
    #fail(error) {
        this.#reason = error;
        this.#detach();
        this.#polling.abort(error);
        this.#controller.abort(error);
        this.#change('failed', error);
    }
    async #run(step, to, allowed, hook, reason) {
        this.#check(to, allowed);
        this.#busy = true;
        let timer;
        try {
            await new Promise((resolve, reject) => {
                this.#interrupt = reject;
                timer = setTimeout(() => reject(new SDKError('SDK_MODULE_TIMEOUT', {
                    module: this.id, details: { step, timeoutMs: this.#timeouts[step] },
                })), this.#timeouts[step]);
                Promise.resolve(hook()).then(resolve, reject);
            });
            if (step !== 'dispose' && this.#controller.signal.aborted) {
                throw new SDKError('SDK_MODULE_CANCELLED', { module: this.id });
            }
            this.#change(to, reason);
            if (step !== 'dispose' && this.#controller.signal.aborted) {
                throw new SDKError('SDK_MODULE_CANCELLED', { module: this.id });
            }
        }
        catch (cause) {
            const error = new SDKError(cause instanceof SDKError ? cause.code : 'SDK_MODULE_STEP_FAILED', {
                module: this.id, details: { step }, cause,
            });
            this.#fail(error);
            throw error;
        }
        finally {
            clearTimeout(timer);
            this.#interrupt = undefined;
            this.#busy = false;
        }
    }
}
