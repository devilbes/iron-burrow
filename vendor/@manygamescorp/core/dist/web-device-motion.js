import { listen } from './web-device-events.js';
import { SDKError } from './error.js';
import { deviceOperation, operationSignal, checkOperation, waitDeviceOperation } from './device-operation.js';
const noop = () => { };
const vector = (value) => value && [value.x, value.y, value.z].every((v) => typeof v === 'number' && Number.isFinite(v))
    ? Object.freeze({ x: value.x, y: value.y, z: value.z }) : undefined;
export function webMotion({ window: win, document: doc }, signal) {
    const releases = new Set();
    const needsAccess = !!(win?.DeviceMotionEvent?.requestPermission
        || win?.DeviceOrientationEvent?.requestPermission);
    let granted = !needsAccess;
    let accessRevision = 0;
    const hidden = () => doc?.visibilityState === 'hidden';
    let visibilityOff = noop;
    const stop = () => {
        for (const off of [...releases]) {
            try {
                off();
            }
            catch { }
        }
    };
    const own = (release) => {
        if (!releases.size)
            visibilityOff = listen(doc, ['visibilitychange'], () => {
                if (hidden())
                    stop();
            });
        const off = () => {
            if (!releases.delete(off))
                return;
            try {
                release();
            }
            finally {
                if (!releases.size) {
                    visibilityOff();
                    visibilityOff = noop;
                }
            }
        };
        releases.add(off);
        return off;
    };
    signal.addEventListener('abort', stop, { once: true });
    const sensor = (constructor, event, supported, read) => {
        const subscriptions = new Set();
        return {
            isSupported: () => !!constructor || supported(),
            stop: () => { for (const off of [...subscriptions])
                off(); },
            start({ hz = 60 }, handler) {
                if (!Number.isFinite(hz) || hz <= 0 || hz > 200)
                    throw new SDKError('VALIDATION_FAILED');
                if (!constructor && !supported())
                    return noop;
                if (!granted)
                    throw new SDKError('SDK_PERMISSION_DENIED');
                if (hidden() || signal.aborted)
                    return noop;
                let last = -Infinity;
                let live = true;
                let off = noop;
                const emit = (value, time) => {
                    if (!live || hidden() || !granted || signal.aborted || value === undefined)
                        return;
                    if (time - last + 0.01 < 1000 / hz)
                        return;
                    last = time;
                    handler(value);
                };
                let release;
                if (constructor) {
                    try {
                        const source = new constructor({ frequency: hz });
                        const reading = (e) => emit(vector(source), e.timeStamp);
                        const error = () => off();
                        source.addEventListener('reading', reading);
                        source.addEventListener('error', error);
                        release = () => {
                            source.removeEventListener('reading', reading);
                            source.removeEventListener('error', error);
                            source.stop();
                        };
                        off = own(() => { live = false; subscriptions.delete(off); release(); });
                        subscriptions.add(off);
                        source.start();
                    }
                    catch {
                        off();
                        throw new SDKError('SDK_PLATFORM_UNSUPPORTED');
                    }
                }
                else {
                    const listener = (e) => emit(read(e), e.timeStamp);
                    win?.addEventListener(event, listener);
                    release = () => win?.removeEventListener(event, listener);
                    off = own(() => { live = false; subscriptions.delete(off); release(); });
                    subscriptions.add(off);
                }
                return off;
            },
        };
    };
    const motionSupported = () => !!win?.DeviceMotionEvent;
    const acceleration = (e) => vector(e.acceleration);
    const accelerometer = sensor(win?.Accelerometer, 'devicemotion', motionSupported, (e) => vector(e.accelerationIncludingGravity));
    const linearAcceleration = sensor(win?.LinearAccelerationSensor, 'devicemotion', motionSupported, acceleration);
    const gyroscope = sensor(win?.Gyroscope, 'devicemotion', motionSupported, (e) => {
        const rate = e.rotationRate;
        return rate ? vector({ x: rate.beta === null ? null : rate.beta * Math.PI / 180,
            y: rate.gamma === null ? null : rate.gamma * Math.PI / 180,
            z: rate.alpha === null ? null : rate.alpha * Math.PI / 180 }) : undefined;
    });
    const gravity = sensor(win?.GravitySensor, 'devicemotion', motionSupported, (e) => {
        const all = vector(e.accelerationIncludingGravity);
        const linear = acceleration(e);
        return all && linear ? Object.freeze({ x: all.x - linear.x,
            y: all.y - linear.y, z: all.z - linear.z }) : undefined;
    });
    const magnetometer = sensor(win?.Magnetometer, '', () => false, () => undefined);
    const orientation = sensor(undefined, 'deviceorientation', () => !!win?.DeviceOrientationEvent, (e) => {
        const { alpha, beta, gamma } = e;
        if (![alpha, beta, gamma].every((v) => typeof v === 'number' && Number.isFinite(v))) {
            return undefined;
        }
        return Object.freeze({ alpha: alpha, beta: beta, gamma: gamma });
    });
    return {
        isSupported: () => [accelerometer, gyroscope, magnetometer, orientation, gravity,
            linearAcceleration].some((s) => s.isSupported()),
        requestAccess: deviceOperation(async (scopes) => {
            const operation = operationSignal(signal, scopes);
            checkOperation(operation);
            const revision = ++accessRevision;
            let allowed = false;
            try {
                const results = await waitDeviceOperation(Promise.all([win?.DeviceMotionEvent, win?.DeviceOrientationEvent]
                    .map((source) => source?.requestPermission?.() ?? 'granted')), operation);
                allowed = results.every((result) => result === 'granted');
            }
            catch { }
            checkOperation(operation);
            if (revision !== accessRevision)
                return undefined;
            granted = allowed;
            if (!granted)
                stop();
            return granted ? 'granted' : 'denied';
        }),
        accelerometer, linearAcceleration, gyroscope, magnetometer, gravity, orientation, stop,
        onShake(handler, { threshold = 15 } = {}) {
            if (!Number.isFinite(threshold) || threshold <= 0)
                throw new SDKError('VALIDATION_FAILED');
            let last = -Infinity;
            return linearAcceleration.start({ hz: 60 }, (value) => {
                const now = Date.now();
                if (Math.hypot(value.x, value.y, value.z) >= threshold && now - last >= 500) {
                    last = now;
                    handler();
                }
            });
        },
    };
}
