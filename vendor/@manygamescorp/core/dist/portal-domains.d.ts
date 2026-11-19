import { type PortalBus } from './portal-bus.js';
import type { Auth } from './auth.js';
import type { PortalLocale, PortalIdScreen, PortalIdResult, PortalToken } from './portal-types.js';
export type { PortalLocale, PortalAuthState, PortalIdScreen, PortalIdResult, PortalFullscreenResult, PortalToken, PortalGameUi } from './portal-types.js';
export interface PortalHostDomains {
    auth?: Auth;
    token?(reason: 'start' | 'refresh', signal: AbortSignal): Promise<PortalToken>;
    locale(): PortalLocale | Promise<PortalLocale>;
    openId(screen: PortalIdScreen, signal: AbortSignal): Promise<PortalIdResult>;
    fullscreen(signal: AbortSignal): Promise<{
        active: boolean;
    }>;
    gameReady?(): void;
    gameError?(error: {
        code: string;
        message: string;
    }): void;
    exit?(): void;
}
export declare function registerPortalHostDomains(bus: PortalBus, host: PortalHostDomains): () => void;
export declare function registerPortalGameDomains(endpoint: object, bus: PortalBus, start: () => Promise<Readonly<Record<string, number>> | null>, dispose: () => void): void;
//# sourceMappingURL=portal-domains.d.ts.map