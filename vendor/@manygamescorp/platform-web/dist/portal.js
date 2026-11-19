import { registerPortalGameDomains, registerPortalHostDomains } from '@manygamescorp/core/portal-domains';
import { PortalBus, PortalBusError, } from '@manygamescorp/core/portal-bus';
import { VERSION } from './version.js';
/** Environment policy captured by the SDK/application build, before game config is read. */
export class PortalOriginPolicy {
    origins;
    constructor(origins) {
        this.origins = Object.freeze(Object.fromEntries(['dev', 'test', 'prod'].map((env) => {
            const entries = origins[env];
            if (!entries || !Array.isArray(entries.portals) || !Array.isArray(entries.games)) {
                throw new PortalBusError('PAYLOAD_INVALID');
            }
            return [env, Object.freeze({
                    portals: Object.freeze(entries.portals.map(exactOrigin)),
                    games: Object.freeze(entries.games.map(exactOrigin)),
                })];
        })));
    }
    /** A runtime allowlist is intersected with this build policy and cannot widen it. */
    permits(env, role, origin, narrowed) {
        return this.origins[env]?.[role].includes(origin) === true
            && (narrowed === undefined || narrowed.includes(origin));
    }
}
function exactOrigin(value) {
    let url;
    try {
        url = new URL(value);
    }
    catch {
        throw new PortalBusError('PAYLOAD_INVALID');
    }
    if (url.protocol !== 'https:' || url.origin !== value || url.username || url.password) {
        throw new PortalBusError('PAYLOAD_INVALID');
    }
    return value;
}
class PortalEndpoint {
    /** Universal domain registry and transport API. Register domains before start(). */
    bus;
    window;
    listener;
    disposed = false;
    started = false;
    constructor(options, role, peer, origin, narrowed) {
        exactOrigin(origin);
        if (!options.policy.permits(options.env, role === 'host' ? 'games' : 'portals', origin, narrowed))
            throw new PortalBusError('PAYLOAD_INVALID');
        this.window = options.window ?? globalThis.window;
        if (!peer || !this.window)
            throw new PortalBusError('PAYLOAD_INVALID');
        const rejected = (reason) => {
            try {
                options.rejected?.(reason);
            }
            catch { /* Diagnostics must not affect the transport. */ }
        };
        this.bus = new PortalBus({ role, env: options.env, appCode: options.appCode,
            requestTimeoutMs: options.requestTimeoutMs,
            sdkVersion: VERSION, send: (message) => peer.postMessage(message, origin),
            rejected, ...(options.handshakeTimeoutMs === undefined
                ? {} : { handshakeTimeoutMs: options.handshakeTimeoutMs }),
        });
        this.listener = (event) => {
            if (event.source !== peer) {
                rejected('source');
                return;
            }
            if (event.origin !== origin) {
                rejected('origin');
                return;
            }
            this.bus.receive(event.data);
        };
    }
    /** Attach the one message listener and negotiate. Null means autonomous fallback. */
    start() {
        if (this.disposed)
            return Promise.reject(new PortalBusError('VERSION_MISMATCH'));
        if (!this.started) {
            this.started = true;
            this.window.addEventListener('message', this.listener);
        }
        return this.bus.start();
    }
    /** Dispose on iframe navigation/removal; recreate the endpoint to get a fresh nonce. */
    dispose() {
        if (this.disposed)
            return;
        this.disposed = true;
        this.window.removeEventListener('message', this.listener);
        this.bus.dispose();
    }
}
/** Portal half of the bridge, bound to exactly one catalogue game's iframe. */
export class PortalHost extends PortalEndpoint {
    stopDomains;
    authChanged(state) { this.bus.emit('auth', 'state.changed', { state }); }
    localeChanged(value) { this.bus.emit('locale', 'changed', value); }
    visibility(hidden) { this.bus.emit('ui', 'visibility', { hidden }); }
    dispose() { this.stopDomains?.(); super.dispose(); }
    constructor(options) {
        if (!options.iframe.contentWindow)
            throw new PortalBusError('PAYLOAD_INVALID');
        super(options, 'host', options.iframe.contentWindow, options.gameOrigin, options.allowedGameOrigins);
        this.stopDomains = options.domains
            ? registerPortalHostDomains(this.bus, options.domains) : undefined;
    }
}
/** Game half of the bridge. Provides transport only; auth/locale/UI live in domains. */
export class WebPortalAdapter extends PortalEndpoint {
    constructor(options) {
        const parent = options.parent ?? globalThis.window?.parent;
        if (!parent || parent === globalThis.window)
            throw new PortalBusError('PAYLOAD_INVALID');
        super(options, 'game', parent, options.portalOrigin, options.allowedPortalOrigins);
        registerPortalGameDomains(this, this.bus, () => this.start(), () => this.dispose());
    }
}
//# sourceMappingURL=portal.js.map