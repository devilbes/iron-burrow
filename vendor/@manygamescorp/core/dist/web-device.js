import { listen } from './web-device-events.js';
import { webScreen } from './web-device-screen.js';
import { webKeyboard } from './web-device-keyboard.js';
import { webPermissions, webGeo } from './web-device-permissions.js';
import { webActions } from './web-device-actions.js';
import { webMotion } from './web-device-motion.js';
import { webCamera } from './web-device-camera.js';
const positive = (value) => value !== undefined && Number.isFinite(value) && value > 0;
function info({ navigator: nav }) {
    return Object.assign(() => {
        const ua = nav?.userAgent ?? '';
        const hints = nav?.userAgentData;
        const ipad = /iPad/.test(ua) || (nav?.platform === 'MacIntel' && (nav.maxTouchPoints ?? 0) > 1);
        let os = hints?.platform;
        if (!os) {
            os = ipad || /iPhone|iPod/.test(ua) ? 'iOS' : /Android/.test(ua) ? 'Android'
                : /Windows/.test(ua) ? 'Windows' : /Mac/.test(ua) ? 'macOS'
                    : /Linux/.test(ua) ? 'Linux' : undefined;
        }
        const version = /(?:Android |(?:CPU (?:iPhone )?OS |Windows NT |Mac OS X ))([\d._]+)/.exec(ua);
        const locale = nav?.language;
        let timezone;
        let region;
        try {
            timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        }
        catch { }
        try {
            region = locale ? new Intl.Locale(locale).region : undefined;
        }
        catch { }
        return Object.freeze({ platform: 'web', ...(os ? { os } : {}),
            ...(!hints && version?.[1] && !(ipad && /Mac OS X/.test(ua))
                ? { osVersion: version[1].replaceAll('_', '.') } : {}),
            ...(locale ? { locale } : {}),
            ...(nav?.languages ? { languages: Object.freeze([...nav.languages]) } : {}),
            ...(timezone ? { timezone } : {}), ...(region ? { region } : {}),
            ...(/iPad|Tablet|Android/.test(ua) || ipad ? { isTablet: ipad
                    || /Tablet/.test(ua) || (/Android/.test(ua) && !(hints?.mobile ?? /Mobile/.test(ua))) } : {}),
        });
    }, { isSupported: () => nav !== undefined });
}
function performance({ navigator: nav }) {
    return Object.assign(() => {
        const memory = positive(nav?.deviceMemory) ? nav.deviceMemory : undefined;
        const cores = positive(nav?.hardwareConcurrency) ? nav.hardwareConcurrency : undefined;
        if (memory === undefined && cores === undefined)
            return undefined;
        const perfClass = (memory !== undefined && memory <= 2) || (cores !== undefined && cores <= 2)
            ? 'low' : memory !== undefined && memory >= 8 && cores !== undefined && cores >= 8
            ? 'high' : 'mid';
        return Object.freeze({ ...(memory === undefined ? {} : { deviceMemory: memory }),
            ...(cores === undefined ? {} : { cpuCores: cores }), perfClass });
    }, { isSupported: () => positive(nav?.deviceMemory) || positive(nav?.hardwareConcurrency),
        onMemoryWarning: () => () => { } });
}
function battery({ navigator: nav }) {
    let manager;
    let pending;
    const read = () => {
        if (!manager || !Number.isFinite(manager.level) || manager.level < 0 || manager.level > 1) {
            return undefined;
        }
        return Object.freeze({ level: manager.level, charging: manager.charging });
    };
    const load = () => {
        pending ??= Promise.resolve().then(() => nav?.getBattery?.()).then((value) => {
            manager = value;
            return value;
        }).catch(() => undefined);
        return pending;
    };
    return Object.assign(() => { if (nav?.getBattery)
        void load(); return read(); }, {
        isSupported: () => typeof nav?.getBattery === 'function',
        onChange(handler) {
            let active = true;
            let off = () => { };
            if (nav?.getBattery)
                void load().then((value) => {
                    if (!active || !value)
                        return;
                    const emit = () => { const state = read(); if (active && state)
                        handler(state); };
                    off = listen(value, ['levelchange', 'chargingchange'], emit);
                    emit();
                });
            return () => { active = false; off(); };
        },
    });
}
export function webDevice(options) {
    const { navigator: nav, window: win } = options;
    const controller = new AbortController();
    const images = new Map();
    const status = () => {
        if (typeof nav?.onLine !== 'boolean')
            return undefined;
        const conn = nav.connection;
        const type = nav.onLine ? conn?.type : 'none';
        const effectiveType = conn?.effectiveType;
        return Object.freeze({ online: nav.onLine,
            ...(['wifi', 'cellular', 'ethernet', 'none'].includes(type ?? '')
                ? { type: type } : {}),
            ...(['slow-2g', '2g', '3g', '4g'].includes(effectiveType ?? '')
                ? { effectiveType: effectiveType } : {}),
            ...(typeof conn?.metered === 'boolean' ? { metered: conn.metered } : {}), });
    };
    let enabled = true;
    const vibrate = (pattern) => {
        if (!enabled)
            return;
        try {
            nav?.vibrate?.(typeof pattern === 'number' ? pattern : [...pattern]);
        }
        catch { }
    };
    return {
        ...webActions(options, images, controller.signal),
        permissions: webPermissions(options, controller.signal),
        geo: webGeo(options, controller.signal),
        motion: webMotion(options, controller.signal),
        camera: webCamera(options, controller.signal, images),
        dispose: () => controller.abort(),
        info: info(options), screen: webScreen(options, controller.signal),
        performance: performance(options),
        battery: battery(options), keyboard: webKeyboard(options),
        haptics: { isSupported: () => typeof nav?.vibrate === 'function', vibrate,
            impact: (style) => vibrate({ light: 10, medium: 20, heavy: 40, rigid: 15, soft: 5 }[style]),
            notification: (kind) => vibrate({ success: [10, 40, 10], warning: [30, 50, 30],
                error: [40, 50, 40, 50, 40] }[kind]),
            selection: () => vibrate(5), setEnabled: (value) => { enabled = value; },
        },
        network: { isSupported: () => typeof nav?.onLine === 'boolean', status,
            onChange(handler) {
                const emit = () => { const state = status(); if (state)
                    handler(state); };
                const off = listen(win, ['online', 'offline'], emit);
                const connectionOff = listen(nav?.connection, ['change'], emit);
                return () => { off(); connectionOff(); };
            },
        },
    };
}
