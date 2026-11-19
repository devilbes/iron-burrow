import { type PortalHostDomains, type PortalLocale, type PortalAuthState } from '@manygamescorp/core/portal-domains';
import { PortalBus, type PortalEnvironment } from '@manygamescorp/core/portal-bus';
import type { PortalEnvelope } from '@manygamescorp/core/portal-protocol';
/** Trusted build configuration. Exact origins only, independently per environment. */
export type PortalOrigins = Readonly<Record<PortalEnvironment, {
    readonly portals: readonly string[];
    readonly games: readonly string[];
}>>;
/** Environment policy captured by the SDK/application build, before game config is read. */
export declare class PortalOriginPolicy {
    private readonly origins;
    constructor(origins: PortalOrigins);
    /** A runtime allowlist is intersected with this build policy and cannot widen it. */
    permits(env: PortalEnvironment, role: 'portals' | 'games', origin: string, narrowed?: readonly string[]): boolean;
}
/** Minimal browser receive port, injectable in headless consumers. */
export interface PortalWindow {
    addEventListener(type: 'message', listener: (event: MessageEvent) => void): void;
    removeEventListener(type: 'message', listener: (event: MessageEvent) => void): void;
}
/** One postMessage destination; targetOrigin is always an exact, validated origin. */
export interface PortalPeer {
    postMessage(message: PortalEnvelope, targetOrigin: string): void;
}
interface PortalOptions {
    /** Embed from build configuration; never derive from platform.json or query strings. */
    policy: PortalOriginPolicy;
    env: PortalEnvironment;
    appCode: string;
    window?: PortalWindow;
    /** Receives rejection reasons only, for bridge_rejected_total{reason}. */
    rejected?(reason: string): void;
    /** Deadline supplied by the trusted build/platform configuration. */
    requestTimeoutMs: number;
    handshakeTimeoutMs?: number;
}
/** Host options: appCode and gameOrigin must come from the selected catalogue entry. */
export interface PortalHostOptions extends PortalOptions {
    iframe: {
        readonly contentWindow: PortalPeer | null;
    };
    gameOrigin: string;
    allowedGameOrigins?: readonly string[];
    domains?: PortalHostDomains;
}
/** Game options: portalOrigin is checked against the environment's build policy. */
export interface WebPortalAdapterOptions extends PortalOptions {
    portalOrigin: string;
    parent?: PortalPeer;
    allowedPortalOrigins?: readonly string[];
}
declare class PortalEndpoint {
    /** Universal domain registry and transport API. Register domains before start(). */
    readonly bus: PortalBus;
    private readonly window;
    private readonly listener;
    private disposed;
    private started;
    constructor(options: PortalOptions, role: 'host' | 'game', peer: PortalPeer, origin: string, narrowed: readonly string[] | undefined);
    /** Attach the one message listener and negotiate. Null means autonomous fallback. */
    start(): Promise<Readonly<Record<string, number>> | null>;
    /** Dispose on iframe navigation/removal; recreate the endpoint to get a fresh nonce. */
    dispose(): void;
}
/** Portal half of the bridge, bound to exactly one catalogue game's iframe. */
export declare class PortalHost extends PortalEndpoint {
    private readonly stopDomains;
    authChanged(state: PortalAuthState): void;
    localeChanged(value: PortalLocale): void;
    visibility(hidden: boolean): void;
    dispose(): void;
    constructor(options: PortalHostOptions);
}
/** Game half of the bridge. Provides transport only; auth/locale/UI live in domains. */
export declare class WebPortalAdapter extends PortalEndpoint {
    constructor(options: WebPortalAdapterOptions);
}
export {};
//# sourceMappingURL=portal.d.ts.map