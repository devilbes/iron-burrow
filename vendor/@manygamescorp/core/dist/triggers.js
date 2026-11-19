import { SDKError } from './error.js';
import { actionSchemaError, isActionJson, isMechanicOutcome, outcomeStatuses } from '@manygamescorp/contracts-client/actions';
import { match as matchFilter } from './filters.js';
import { isEventName } from './event-names.js';
export const UI_ELEMENT_ACTION = 'ui:element:action';
export const PLACEMENT_MODULE = 'ui';
export const PLACEMENT_ACTION = 'placement';
const userInitiated = (source) => 'element' in source || source.event === 'hud:item:opened';
const MAX_RULES = 256;
const MAX_DEPTH = 8;
const RATE_WINDOW_MS = 1000;
const MAX_STARTS_PER_WINDOW = 50;
const TRIGGER_FAILED = 'sdk:ui:trigger-failed';
const MAX_ACTIONS = 16;
const idPart = /^[a-z][a-z0-9-]{0,63}$/;
const moduleName = /^[a-z][a-z0-9-]*(?:\.[a-z][a-z0-9-]*)*$/;
const elementId = /^[a-z][a-z0-9-]*(?:[.:][a-z][a-z0-9-]*)*$/;
const isRecord = (value) => typeof value === 'object' && value !== null && !Array.isArray(value);
const optionalCount = (value) => value === undefined || (Number.isSafeInteger(value) && value >= 0);
export function validRule(rule) {
    if (!isRecord(rule) || typeof rule['id'] !== 'string' || !rule['id'])
        return false;
    const on = rule['on'];
    if (!isRecord(on) || ('event' in on) === ('element' in on))
        return false;
    if ('event' in on && (!isEventName(on['event']) || on['event'] === UI_ELEMENT_ACTION
        || on['event'] === TRIGGER_FAILED))
        return false;
    if ('element' in on && (typeof on['element'] !== 'string' || !elementId.test(on['element'])))
        return false;
    if (rule['priority'] !== undefined && !Number.isFinite(rule['priority']))
        return false;
    if (!optionalCount(rule['cooldownSec']) || !optionalCount(rule['maxPerSession']))
        return false;
    const actions = rule['do'];
    let count = 0;
    const valid = (refs, depth) => Array.isArray(refs)
        && refs.length <= MAX_ACTIONS && refs.every((ref) => {
        count += 1;
        if (count > MAX_ACTIONS || !isRecord(ref) || typeof ref['module'] !== 'string'
            || !moduleName.test(ref['module']) || typeof ref['action'] !== 'string'
            || !idPart.test(ref['action']) || (ref['params'] !== undefined && !isRecord(ref['params'])))
            return false;
        if (ref['then'] === undefined)
            return true;
        return depth < 2 && isRecord(ref['then']) && Object.entries(ref['then']).every(([status, branch]) => outcomeStatuses.includes(status) && valid(branch, depth + 1));
    });
    return Array.isArray(actions) && actions.length > 0 && valid(actions, 0);
}
const invalid = (path) => {
    throw new SDKError('VALIDATION_FAILED', { details: { path }, safeParams: { path } });
};
const validateParams = (contract, params) => {
    if (!isActionJson(params, Infinity))
        invalid('params');
    if (contract.params !== undefined) {
        const path = actionSchemaError(contract.params, params, 'params');
        if (path)
            invalid(path);
    }
};
export function createTriggerEngine(deps) {
    const published = new Map();
    const usage = new Map();
    const running = new Map();
    const starts = new Map();
    let cancellation = new AbortController();
    const rules = () => deps.rules().slice(0, MAX_RULES).filter(validRule);
    const resolve = (ref) => {
        const stack = published.get(ref.module);
        for (let i = (stack?.length ?? 0) - 1; i >= 0; i -= 1) {
            const item = stack?.[i];
            const found = item && Object.hasOwn(item, ref.action) ? item[ref.action] : undefined;
            if (found)
                return found;
        }
        return deps.windows.has(ref.module, ref.action)
            ? { kind: 'window', window: ref.action } : undefined;
    };
    const call = async (module, name, params = {}, options = {}, context) => {
        const target = deps.target?.(module);
        if (!target || target.signal.aborted)
            throw new SDKError('MODULE_NOT_ACTIVE', { module });
        const declaration = target.actions?.callable;
        const contract = declaration && Object.hasOwn(declaration, name)
            ? declaration[name] : undefined;
        const action = resolve({ module, action: name });
        if (!contract || action?.kind !== 'effect')
            throw new SDKError('SDK_ACTION_NOT_CALLABLE', { module });
        const timeoutMs = options.timeoutMs ?? 600_000;
        if (!Number.isFinite(timeoutMs) || timeoutMs <= 0 || timeoutMs > 1_800_000)
            invalid('timeoutMs');
        validateParams(contract, params);
        const controller = new AbortController();
        const signal = AbortSignal.any([cancellation.signal, target.signal, controller.signal,
            ...(options.signal ? [options.signal] : [])]);
        if (signal.aborted)
            throw new SDKError('SDK_MODULE_CANCELLED', { module });
        let timer;
        let timedOut = false;
        let onAbort;
        try {
            const cancelled = new Promise((_resolve, reject) => {
                onAbort = () => reject(new SDKError(timedOut ? 'SDK_MODULE_TIMEOUT' : 'SDK_MODULE_CANCELLED', { module }));
                signal.addEventListener('abort', onAbort, { once: true });
                timer = setTimeout(() => { timedOut = true; controller.abort(); }, timeoutMs);
            });
            const work = Promise.resolve().then(() => {
                if (signal.aborted) {
                    onAbort();
                    return undefined;
                }
                return action.run(params, { ...(context ?? { rule: '',
                        source: { event: 'sdk:actions:call' }, payload: params }), signal });
            });
            const result = await Promise.race([work, cancelled]);
            if (signal.aborted)
                throw new SDKError(timedOut ? 'SDK_MODULE_TIMEOUT' : 'SDK_MODULE_CANCELLED', { module });
            if (!isActionJson(result))
                invalid('result');
            if (contract.result === 'mechanic-outcome@1') {
                if (!isMechanicOutcome(result))
                    invalid('result');
            }
            else if (contract.result !== undefined && actionSchemaError(contract.result, result, 'result'))
                invalid('result');
            return result;
        }
        finally {
            clearTimeout(timer);
            signal.removeEventListener('abort', onAbort);
            controller.abort();
        }
    };
    const throttled = (rule) => {
        if ((running.get(rule.id) ?? 0) > 0)
            return true;
        let depth = 0;
        for (const count of running.values())
            depth += count;
        if (depth >= MAX_DEPTH)
            return true;
        const at = deps.now();
        const recent = (starts.get(rule.id) ?? []).filter((time) => at - time < RATE_WINDOW_MS);
        if (recent.length >= MAX_STARTS_PER_WINDOW) {
            starts.set(rule.id, recent);
            return true;
        }
        recent.push(at);
        starts.set(rule.id, recent);
        return false;
    };
    const allowed = (rule) => {
        const used = usage.get(rule.id);
        if (rule.maxPerSession !== undefined && (used?.count ?? 0) >= rule.maxPerSession)
            return false;
        if (rule.cooldownSec === undefined)
            return true;
        let last = used?.at;
        if (last === undefined) {
            try {
                last = deps.cooldowns?.get(rule.id);
            }
            catch {
                last = undefined;
            }
        }
        return !(last !== undefined && deps.now() < last + rule.cooldownSec * 1000);
    };
    const run = async (rule, source, payload, signal, refs = rule.do) => {
        let fired = false;
        for (const ref of refs) {
            if (signal.aborted)
                return fired;
            if (deps.activate)
                await deps.activate(ref.module);
            if (signal.aborted)
                return fired;
            const action = resolve(ref);
            const params = ref.params ?? {};
            const placement = ref.module === PLACEMENT_MODULE && ref.action === PLACEMENT_ACTION
                ? params['placement'] : undefined;
            if (typeof placement === 'string') {
                if (!userInitiated(source) && deps.automaticWindowsEnabled?.() === false)
                    continue;
                const ticket = await deps.windows.enqueue({ module: PLACEMENT_MODULE,
                    window: PLACEMENT_ACTION, source: userInitiated(source) ? 'user' : 'trigger',
                    placement, priority: rule.priority ?? 0,
                    context: { rule: rule.id, payload } }, signal);
                if (ticket)
                    fired = true;
            }
            else if (action?.kind === 'effect') {
                if (ref.then !== undefined) {
                    const contracts = deps.target?.(ref.module)?.actions?.callable;
                    if (!contracts || !Object.hasOwn(contracts, ref.action)) {
                        deps.unknownAction?.(rule.id, ref);
                        await action.run(params, { rule: rule.id, source, payload, signal });
                        fired = true;
                        continue;
                    }
                    const result = await call(ref.module, ref.action, params, { signal }, { rule: rule.id, source, payload, signal });
                    if (!signal.aborted && isRecord(result) && outcomeStatuses.includes(result['status'])) {
                        const branch = ref.then[result['status']];
                        if (branch)
                            await run(rule, source, payload, signal, branch);
                    }
                }
                else {
                    const contracts = deps.target?.(ref.module)?.actions?.callable;
                    const contract = contracts && Object.hasOwn(contracts, ref.action)
                        ? contracts[ref.action] : undefined;
                    if (contract)
                        validateParams(contract, params);
                    await action.run(params, { rule: rule.id, source, payload, signal });
                }
                fired = true;
            }
            else if (action?.kind === 'window') {
                if (!userInitiated(source) && deps.automaticWindowsEnabled?.() === false)
                    continue;
                if (ref.then !== undefined)
                    deps.unknownAction?.(rule.id, ref);
                const ticket = await deps.windows.enqueue({ module: ref.module, window: action.window,
                    params, source: ref.module === 'ui.reward' || userInitiated(source) ? 'user' : 'trigger',
                    priority: rule.priority ?? 0, context: { rule: rule.id, payload } }, signal);
                if (ticket)
                    fired = true;
            }
            else {
                deps.unknownAction?.(rule.id, ref);
            }
        }
        return fired;
    };
    return Object.freeze({
        call,
        publish(module, actions) {
            if (!moduleName.test(module) || !isRecord(actions) || Object.keys(actions).length === 0
                || Object.entries(actions).some(([name, action]) => !idPart.test(name)
                    || !(action?.kind === 'effect' && typeof action.run === 'function')
                        && !(action?.kind === 'window' && typeof action.window === 'string'
                            && idPart.test(action.window))))
                throw new Error('TRIGGER_ACTIONS_INVALID');
            const copy = Object.freeze({ ...actions });
            const stack = published.get(module) ?? [];
            stack.push(copy);
            published.set(module, stack);
            return () => {
                const index = stack.indexOf(copy);
                if (index >= 0)
                    stack.splice(index, 1);
                if (stack.length === 0 && published.get(module) === stack)
                    published.delete(module);
            };
        },
        events() {
            const names = new Set();
            for (const rule of rules())
                names.add('event' in rule.on ? rule.on.event : UI_ELEMENT_ACTION);
            return [...names];
        },
        async handle(event, payload) {
            if (!isEventName(event))
                throw new Error('TRIGGER_EVENT_INVALID');
            const click = event === UI_ELEMENT_ACTION;
            if (click && !(isRecord(payload) && typeof payload['element'] === 'string'))
                return;
            const element = click ? payload.element : undefined;
            const facts = click ? payload.payload : payload;
            const matching = rules().map((rule, index) => ({ rule, index }))
                .filter(({ rule }) => ('event' in rule.on ? rule.on.event === event
                : click && rule.on.element === element))
                .sort((a, b) => (b.rule.priority ?? 0) - (a.rule.priority ?? 0) || a.index - b.index);
            const signal = cancellation.signal;
            const groups = new Set();
            let failure;
            for (const { rule } of matching) {
                if (signal.aborted)
                    return;
                if (rule.group && groups.has(rule.group))
                    continue;
                if (rule.when !== undefined && !deps.matches(rule.when))
                    continue;
                if (rule.payload !== undefined
                    && !(isRecord(facts) && matchFilter(rule.payload, { custom: facts })))
                    continue;
                if (!allowed(rule))
                    continue;
                if (throttled(rule))
                    continue;
                running.set(rule.id, (running.get(rule.id) ?? 0) + 1);
                try {
                    if (!await run(rule, rule.on, facts, signal) || signal.aborted)
                        continue;
                    const used = usage.get(rule.id);
                    const at = deps.now();
                    usage.set(rule.id, { count: (used?.count ?? 0) + 1, at });
                    if (rule.cooldownSec !== undefined) {
                        try {
                            deps.cooldowns?.set(rule.id, at);
                        }
                        catch { }
                    }
                    if (rule.group)
                        groups.add(rule.group);
                }
                catch (error) {
                    failure ??= { error };
                }
                finally {
                    const left = (running.get(rule.id) ?? 1) - 1;
                    if (left > 0)
                        running.set(rule.id, left);
                    else
                        running.delete(rule.id);
                }
            }
            if (failure)
                throw failure.error;
        },
        resetSession() {
            cancellation.abort();
            cancellation = new AbortController();
            usage.clear();
            starts.clear();
            running.clear();
            published.clear();
        },
    });
}
