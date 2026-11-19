import { SDKError } from './error.js';
import { hasDeviceOperation, invokeDeviceOperation, registerDeviceOperation, deviceOperation, waitDeviceOperation } from './device-operation.js';
const noop = () => { };
const off = () => noop;
const absent = () => undefined;
const absentAsync = async () => undefined;
const unsupported = async () => { throw new SDKError('SDK_PLATFORM_UNSUPPORTED'); };
const support = { isSupported: () => false };
const permissionNames = new Set([
    'notifications', 'location', 'camera', 'microphone', 'photos', 'tracking',
    'clipboard-read',
]);
const scopes = new WeakMap();
const scopedMethods = new WeakSet();
const wakeOwners = new WeakMap();
function keepAwakeOwned(receiver, target, on, owner, lifetime) {
    let state = wakeOwners.get(receiver);
    if (!state) {
        state = { holders: new Set(), chain: Promise.resolve(), applied: false };
        wakeOwners.set(receiver, state);
    }
    const owners = state;
    const sync = () => {
        const wanted = owners.holders.size > 0;
        if (hasDeviceOperation(target)) {
            if (!wanted && !owners.applied)
                return Promise.resolve();
            owners.applied = wanted;
            return Promise.resolve(invokeDeviceOperation(target, receiver, [wanted], [lifetime]));
        }
        const next = owners.chain.then(async () => {
            const effective = wanted && owners.holders.size > 0 && !lifetime.aborted;
            if (effective === owners.applied)
                return;
            await invokeDeviceOperation(target, receiver, [effective], [lifetime]);
            owners.applied = effective;
        });
        owners.chain = next.catch(noop);
        return next;
    };
    if (on && !owners.holders.has(owner)) {
        owners.holders.add(owner);
        const abort = () => { void release().catch(noop); };
        const release = () => {
            owner.removeEventListener('abort', abort);
            wakeReleases.get(owner)?.delete(receiver);
            return owners.holders.delete(owner) ? sync() : Promise.resolve();
        };
        owner.addEventListener('abort', abort, { once: true });
        wakeReleases.set(owner, wakeReleases.get(owner) ?? new Map());
        wakeReleases.get(owner).set(receiver, release);
    }
    else if (!on) {
        const release = wakeReleases.get(owner)?.get(receiver);
        if (release)
            return release();
    }
    const lease = wakeReleases.get(owner)?.get(receiver);
    return sync().catch((error) => {
        if (lease && wakeReleases.get(owner)?.get(receiver) === lease)
            void lease().catch(noop);
        throw error;
    });
}
const wakeReleases = new WeakMap();
const previewLeases = new WeakMap();
const previewReleases = new WeakMap();
function onDispose(signal, cleanup) {
    let set = scopes.get(signal);
    if (!set) {
        set = new Set();
        scopes.set(signal, set);
        const releases = set;
        signal.addEventListener('abort', () => {
            for (const release of releases) {
                try {
                    release();
                }
                catch { }
            }
            releases.clear();
        }, { once: true });
    }
    set.add(cleanup);
}
const sensor = () => ({ ...support, start: off, stop: noop });
const callable = (read, methods) => Object.assign(read, support, methods);
export function normalizeDeviceId(value) {
    if (typeof value !== 'string')
        return null;
    const id = value.trim();
    if (!id || id.length > 256 || /[\s\u0000-\u001f\u007f]/u.test(id))
        return null;
    const lower = id.toLowerCase();
    if (/^[0-]+$/.test(lower) || new Set([
        'unknown', 'undefined', 'null', 'none', 'n/a', 'unavailable', 'not available',
        '9774d56d682e549c', '0123456789abcdef', 'emulator', 'simulator',
    ]).has(lower))
        return null;
    return id;
}
export function deviceIdFields(ids) {
    const fields = Object.create(null);
    for (const [key, value] of Object.entries(ids)) {
        const id = normalizeDeviceId(value);
        if (id !== null)
            fields[key] = id;
    }
    return Object.freeze(fields);
}
function deviceInfo(value, platform) {
    const source = value !== null && typeof value === 'object'
        ? value : {};
    const out = { platform };
    for (const key of ['platform', 'os', 'osVersion', 'model', 'manufacturer', 'appVersion',
        'build', 'bundleId', 'installSource', 'locale', 'timezone', 'region']) {
        if (typeof source[key] === 'string')
            out[key] = source[key];
    }
    for (const key of ['isVirtual', 'isTablet']) {
        if (typeof source[key] === 'boolean')
            out[key] = source[key];
    }
    if (typeof source.firstInstallAt === 'number' && Number.isFinite(source.firstInstallAt)) {
        out.firstInstallAt = source.firstInstallAt;
    }
    if (Array.isArray(source.languages) && source.languages.every((item) => typeof item === 'string')) {
        out.languages = Object.freeze([...source.languages]);
    }
    return Object.freeze(out);
}
export function scopeDeviceGroup(template, source, signal) {
    const cleanups = new Set();
    const subscriptions = new Map();
    const previewOwners = new Map();
    const previewCleanups = new Map();
    const active = () => {
        if (signal.aborted)
            throw new SDKError('SDK_MODULE_CANCELLED');
    };
    const supported = () => {
        if (signal.aborted)
            return false;
        try {
            return source?.isSupported() === true;
        }
        catch {
            return false;
        }
    };
    const wrap = (fallback, supplied, receiver, key, preview = false, path = key) => {
        if (typeof fallback === 'function') {
            const run = (args, inherited) => {
                if (key === 'isSupported') {
                    if (!supported() || inherited.some((scope) => scope.aborted))
                        return false;
                    try {
                        return typeof supplied === 'function'
                            && Reflect.apply(supplied, receiver, args) === true;
                    }
                    catch {
                        return false;
                    }
                }
                active();
                if (inherited.some((scope) => scope.aborted))
                    throw new SDKError('SDK_MODULE_CANCELLED');
                let available = supported();
                if (available && receiver && typeof receiver.isSupported === 'function') {
                    try {
                        available = receiver.isSupported() === true;
                    }
                    catch {
                        available = false;
                    }
                }
                const target = (available && typeof supplied === 'function' ? supplied : fallback);
                if (available && preview && key === 'stop' && receiver
                    && (previewOwners.has(receiver) || !hasDeviceOperation(target))) {
                    previewOwners.get(receiver)?.();
                    return Promise.resolve();
                }
                if (!preview && key === 'stop') {
                    const prefix = path.slice(0, -'stop'.length);
                    for (const [release, subscriptionPath] of [...subscriptions]) {
                        if (subscriptionPath.startsWith(prefix))
                            release();
                    }
                    return;
                }
                if (key === 'keepAwake' && available && receiver && !scopedMethods.has(target)) {
                    if (typeof args[0] !== 'boolean')
                        throw new SDKError('VALIDATION_FAILED');
                    return waitDeviceOperation(keepAwakeOwned(receiver, target, args[0], inherited[0] ?? signal, signal), signal);
                }
                const subscription = key.startsWith('on') || key === 'watch' || key === 'start';
                let listening = true;
                const guardedArgs = subscription ? args.map((arg) => typeof arg === 'function'
                    ? (...values) => {
                        if (!signal.aborted && listening)
                            return arg(...values);
                    } : arg) : args;
                const result = invokeDeviceOperation(target, receiver, guardedArgs, [...inherited, signal]);
                let previewRelease;
                if (preview && key === 'start' && result instanceof Promise && receiver
                    && typeof Reflect.get(receiver, 'stop') === 'function') {
                    previewRelease = previewReleases.get(result);
                    if (!previewRelease && !hasDeviceOperation(target)) {
                        const lease = {};
                        previewLeases.set(receiver, lease);
                        previewRelease = () => {
                            if (previewLeases.get(receiver) !== lease)
                                return;
                            previewLeases.delete(receiver);
                            const stopped = invokeDeviceOperation(Reflect.get(receiver, 'stop'), receiver, [], [...inherited, signal]);
                            if (stopped instanceof Promise)
                                void stopped.catch(noop);
                        };
                    }
                    if (previewRelease) {
                        if (!previewCleanups.has(receiver)) {
                            cleanups.add(() => previewCleanups.get(receiver)?.());
                        }
                        previewCleanups.set(receiver, previewRelease);
                        if (!inherited.length)
                            previewOwners.set(receiver, previewRelease);
                    }
                }
                if (subscription && typeof result === 'function') {
                    const unsubscribe = () => {
                        listening = false;
                        subscriptions.delete(unsubscribe);
                        if (cleanups.delete(unsubscribe))
                            result();
                    };
                    cleanups.add(unsubscribe);
                    subscriptions.set(unsubscribe, path);
                    return unsubscribe;
                }
                if (result instanceof Promise) {
                    const guarded = waitDeviceOperation(result, signal)
                        .then((value) => { active(); return value; });
                    if (previewRelease)
                        previewReleases.set(guarded, previewRelease);
                    return guarded;
                }
                return result;
            };
            const method = registerDeviceOperation((...args) => run(args, []), (_receiver, args, inherited) => run(args, inherited));
            scopedMethods.add(method);
            return method;
        }
        const out = Object.create(null);
        for (const member of Object.keys(fallback)) {
            out[member] = wrap(Reflect.get(fallback, member), supplied == null ? undefined : Reflect.get(supplied, member), supplied, member, preview || member === 'preview', `${path}.${member}`);
        }
        return Object.freeze(out);
    };
    const result = typeof template === 'function'
        ? wrap(template, source, source, '') : Object.create(null);
    for (const key of Object.keys(template)) {
        Object.defineProperty(result, key, { enumerable: true, value: wrap(Reflect.get(template, key), source == null ? undefined
                : Reflect.get(source, key), source, key, key === 'preview') });
    }
    onDispose(signal, () => {
        for (const cleanup of [...cleanups]) {
            try {
                cleanup();
            }
            catch { }
        }
    });
    return Object.freeze(result);
}
export function createDevice(options) {
    const controller = new AbortController();
    const { signal } = controller;
    const owned = options.platform.createDeviceApi !== undefined;
    const provider = options.platform.createDeviceApi?.()
        ?? options.platform.deviceApi ?? {};
    const info = callable(() => {
        const base = options.platform.device.info();
        return Object.freeze({ platform: base.platform,
            ...(base.os ? { os: base.os } : {}),
            ...(base.language ? { locale: base.language } : {}) });
    }, {});
    info.isSupported = () => true;
    const templates = {
        info,
        screen: callable(absent, { onChange: off, lockOrientation: unsupported, unlock: unsupported,
            keepAwake: unsupported, setFullscreen: unsupported, immersive: unsupported,
            statusBar: { show: unsupported, hide: unsupported, style: unsupported },
            brightness: { get: absentAsync, set: unsupported } }),
        haptics: { ...support, impact: noop, notification: noop, selection: noop, vibrate: noop,
            setEnabled: noop },
        geo: { ...support, country: absent, position: absentAsync, watch: off },
        network: { ...support, status: absent, onChange: off },
        battery: callable(absent, { onChange: off }),
        performance: callable(absent, { onMemoryWarning: off }),
        audio: { ...support, state: absent, onChange: off, session: unsupported },
        permissions: { ...support, query: absentAsync, request: absentAsync,
            openSettings: unsupported },
        tracking: { ...support, status: () => 'unavailable', request: async () => 'unavailable' },
        share: callable(unsupported, {}),
        clipboard: { ...support, write: unsupported, read: absentAsync },
        store: { ...support, rateApp: unsupported, openPage: unsupported, checkUpdate: absentAsync },
        links: { ...support, initial: absent, onOpen: off, installReferrer: absentAsync },
        app: { ...support, state: absent, onBack: off, exit: unsupported, restart: unsupported },
        motion: { ...support, requestAccess: absentAsync, accelerometer: sensor(), gyroscope: sensor(),
            magnetometer: sensor(), orientation: sensor(), gravity: sensor(),
            linearAcceleration: sensor(),
            stop: noop, onShake: off },
        camera: { ...support, capture: absentAsync, pickFromGallery: absentAsync, scanCode: absentAsync,
            preview: { start: unsupported, stop: unsupported } },
        keyboard: { ...support, onShow: off, onHide: off, hide: unsupported },
    };
    const groups = Object.fromEntries(Object.entries(templates).map(([key, template]) => [key, scopeDeviceGroup(template, key === 'info' ? provider.info ?? info
            : provider[key], signal)]));
    const safeInfo = Object.freeze(Object.assign(() => deviceInfo(groups.info(), options.platform.id), { isSupported: groups.info.isSupported }));
    const active = () => {
        if (signal.aborted)
            throw new SDKError('SDK_MODULE_CANCELLED');
    };
    let localEnabled = true;
    const enabled = () => options.storage
        ? options.storage.get('haptics.enabled') !== false : localEnabled;
    const haptics = Object.freeze({ ...groups.haptics,
        impact: (...args) => {
            active();
            if (enabled())
                groups.haptics.impact(...args);
        },
        notification: (...args) => {
            active();
            if (enabled())
                groups.haptics.notification(...args);
        },
        selection: () => { active(); if (enabled())
            groups.haptics.selection(); },
        vibrate: (pattern) => {
            active();
            if (enabled())
                groups.haptics.vibrate(pattern);
        },
        setEnabled: (value) => {
            active();
            if (typeof value !== 'boolean')
                throw new SDKError('VALIDATION_FAILED');
            options.storage?.set('haptics.enabled', value);
            localEnabled = value;
        },
    });
    const consent = (key) => options.consent?.()[key] === true;
    const grants = new Map();
    const revisions = new Map();
    const watchRevisions = new Map();
    let clipboardRequested = false;
    const permissionOperation = async (method, permission, preserveGrant = false, scopes = []) => {
        active();
        if (scopes.some((scope) => scope.aborted))
            throw new SDKError('SDK_MODULE_CANCELLED');
        if (!permissionNames.has(permission))
            throw new SDKError('VALIDATION_FAILED');
        const previousClipboardGrant = clipboardRequested;
        if (permission === 'clipboard-read')
            clipboardRequested = false;
        if (method === 'request' && permission === 'location' && !consent('geo')) {
            throw new SDKError('SDK_PERMISSION_DENIED');
        }
        const explicitRevision = revisions.get(permission);
        const hadGrant = grants.has(permission);
        const operationRevisions = preserveGrant ? watchRevisions : revisions;
        const revision = (operationRevisions.get(permission) ?? 0) + 1;
        operationRevisions.set(permission, revision);
        if (!preserveGrant)
            grants.delete(permission);
        const result = await invokeDeviceOperation(groups.permissions[method], groups.permissions, [permission], scopes);
        if (scopes.some((scope) => scope.aborted))
            throw new SDKError('SDK_MODULE_CANCELLED');
        active();
        if (operationRevisions.get(permission) !== revision)
            return undefined;
        if (preserveGrant && (!hadGrant || revisions.get(permission) !== explicitRevision
            || result === undefined)) {
            return undefined;
        }
        if (permission === 'clipboard-read')
            clipboardRequested = (method === 'request' || previousClipboardGrant)
                && result === 'granted';
        grants.set(permission, result);
        return result;
    };
    const permissions = Object.freeze({ ...groups.permissions,
        query: deviceOperation((scopes, permission) => permissionOperation('query', permission, false, scopes)),
        request: deviceOperation((scopes, permission) => permissionOperation('request', permission, false, scopes)),
    });
    let watchPermission;
    const checkWatchPermission = () => watchPermission ??= permissionOperation('query', 'location', true)
        .finally(() => { watchPermission = undefined; });
    const geo = Object.freeze({ ...groups.geo,
        position: deviceOperation(async (scopes, input) => {
            active();
            if (!groups.geo.isSupported())
                return undefined;
            const query = () => invokeDeviceOperation(permissions.query, permissions, ['location'], scopes);
            if (!consent('geo') || await query() !== 'granted') {
                throw new SDKError('SDK_PERMISSION_DENIED');
            }
            active();
            if (!consent('geo'))
                throw new SDKError('SDK_PERMISSION_DENIED');
            const result = await invokeDeviceOperation(groups.geo.position, groups.geo, [input], scopes);
            active();
            const granted = await query() === 'granted';
            active();
            return consent('geo') && granted ? result : undefined;
        }),
        watch: (handler) => {
            active();
            if (!groups.geo.isSupported())
                return noop;
            if (!consent('geo') || grants.get('location') !== 'granted') {
                throw new SDKError('SDK_PERMISSION_DENIED');
            }
            let listening = true;
            let release = noop;
            const stop = () => { listening = false; release(); };
            release = groups.geo.watch((position) => {
                if (!consent('geo')) {
                    stop();
                    return;
                }
                void checkWatchPermission().then((permission) => {
                    if (!signal.aborted && listening && consent('geo') && permission === 'granted'
                        && grants.get('location') === 'granted') {
                        handler(position);
                    }
                    else if (listening && (signal.aborted || !consent('geo')
                        || (permission !== undefined && permission !== 'granted')
                        || (grants.get('location') !== undefined && grants.get('location') !== 'granted')))
                        stop();
                }).catch(noop);
            });
            if (!listening)
                release();
            return stop;
        },
    });
    const emit = (group) => {
        if (signal.aborted)
            return;
        const payload = group === 'tracking' ? { status: groups.tracking.status() }
            : { supported: groups[group].isSupported() };
        options.bus?.emit(`device:${group}:changed`, payload);
    };
    const tracking = Object.freeze({ ...groups.tracking,
        async request() {
            active();
            const status = await groups.tracking.request();
            active();
            emit('tracking');
            return status;
        },
    });
    const sensors = ['accelerometer', 'gyroscope', 'magnetometer', 'orientation', 'gravity',
        'linearAcceleration'];
    let paused = false;
    const stopMotion = () => {
        for (const key of sensors) {
            try {
                groups.motion[key].stop();
                provider.motion?.[key]?.stop();
            }
            catch { }
        }
        try {
            groups.motion.stop();
            provider.motion?.stop?.();
        }
        catch { }
    };
    const motion = Object.freeze({ ...groups.motion,
        ...Object.fromEntries(sensors.map((key) => [key, Object.freeze({ ...groups.motion[key],
                start: (input, handler) => {
                    active();
                    const hz = input.hz ?? 60;
                    if (!Number.isFinite(hz) || hz <= 0 || hz > 200) {
                        throw new SDKError('VALIDATION_FAILED');
                    }
                    if (paused)
                        throw new SDKError('SDK_PLATFORM_UNSUPPORTED');
                    return groups.motion[key].start({ hz }, (value) => { if (!paused)
                        handler(value); });
                },
            })])),
        onShake: (handler, input) => {
            active();
            if (input?.threshold !== undefined
                && (!Number.isFinite(input.threshold) || input.threshold <= 0)) {
                throw new SDKError('VALIDATION_FAILED');
            }
            if (paused)
                return noop;
            return groups.motion.onShake(() => { if (!paused)
                handler(); }, input);
        },
    });
    const device = Object.freeze({ ...groups, info: safeInfo, haptics, geo, tracking, motion,
        permissions,
        clipboard: Object.freeze({ ...groups.clipboard,
            read: deviceOperation(async (scopes) => {
                active();
                if (!groups.clipboard.isSupported('read'))
                    return undefined;
                if (!clipboardRequested)
                    throw new SDKError('SDK_PERMISSION_DENIED');
                const revision = revisions.get('clipboard-read');
                const text = await invokeDeviceOperation(groups.clipboard.read, groups.clipboard, [], scopes);
                if (!clipboardRequested || revisions.get('clipboard-read') !== revision) {
                    throw new SDKError('SDK_PERMISSION_DENIED');
                }
                return text;
            }),
        }),
        isSupported: (feature) => {
            if (feature === 'clipboard.read' || feature === 'clipboard.write') {
                return groups.clipboard.isSupported(feature === 'clipboard.read' ? 'read' : 'write');
            }
            return Object.hasOwn(groups, feature) && groups[feature].isSupported();
        },
        capabilities: () => Object.freeze(Object.fromEntries(Object.keys(templates).map((key) => [key, groups[key].isSupported()]))),
        async advertisingId() {
            active();
            if (!consent('adId') || !groups.tracking.isSupported()
                || groups.tracking.status() !== 'authorized')
                return null;
            const id = await provider.advertisingId?.();
            active();
            return consent('adId') && groups.tracking.status() === 'authorized'
                ? normalizeDeviceId(id) : null;
        }, });
    const refresh = () => {
        try {
            const data = device.info();
            const perf = device.performance();
            const network = device.network.status();
            const battery = device.battery();
            const facts = {};
            if (data.os !== undefined)
                facts['device.os'] = data.os;
            const category = data.platform === 'web' ? 'web' : data.os?.toLowerCase();
            if (category === 'ios' || category === 'android' || category === 'web')
                facts.os = category;
            let country;
            try {
                country = device.geo.country();
            }
            catch { }
            if (typeof country === 'string' && /^[A-Za-z]{2,8}$/.test(country))
                facts.country = country;
            if (data.isTablet !== undefined)
                facts['device.tablet'] = data.isTablet;
            if (perf?.perfClass !== undefined)
                facts['device.perfClass'] = perf.perfClass;
            if (network?.type !== undefined)
                facts['network.type'] = network.type;
            if (battery !== undefined) {
                facts['battery.low'] = battery.lowPowerMode === true || battery.level <= 0.2;
            }
            options.facts?.set(facts);
        }
        catch { }
    };
    let started = false;
    return Object.freeze({ device,
        start() {
            active();
            if (started)
                return;
            refresh();
            started = true;
            try {
                device.app.state();
            }
            catch { }
            device.network.onChange(() => { refresh(); emit('network'); });
            device.battery.onChange(() => { refresh(); emit('battery'); });
            device.screen.onChange(() => emit('screen'));
            device.audio.onChange(() => emit('audio'));
            device.links.onOpen(() => emit('links'));
            device.keyboard.onShow(() => emit('keyboard'));
            device.keyboard.onHide(() => emit('keyboard'));
            const unsubscribe = options.platform.lifecycle.on('pause', () => {
                paused = true;
                stopMotion();
            });
            const resume = options.platform.lifecycle.on('resume', () => { paused = false; });
            signal.addEventListener('abort', unsubscribe, { once: true });
            signal.addEventListener('abort', resume, { once: true });
        },
        dispose: () => {
            if (signal.aborted)
                return;
            stopMotion();
            try {
                void groups.screen.keepAwake(false).catch(() => { });
            }
            catch { }
            controller.abort();
            if (owned) {
                try {
                    provider.dispose?.();
                }
                catch { }
            }
        },
    });
}
