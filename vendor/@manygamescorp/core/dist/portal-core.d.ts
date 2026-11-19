import type { PortalAuthState, PortalGameUi, PortalLocale, PortalToken } from './portal-types.js';
export interface PortalCore {
    readonly ui: PortalGameUi;
    start(): Promise<void>;
    locale(): PortalLocale | undefined;
    token(reason: 'start' | 'refresh'): Promise<PortalToken | undefined>;
    listen(callbacks: {
        auth(state: PortalAuthState): void;
        locale(): void;
        visibility(hidden: boolean): void;
    }): void;
    ready(): void;
    error(): void;
    dispose(): void;
}
export declare const portalCore: (endpoint: object | undefined) => PortalCore | undefined;
export declare function setPortalCore(endpoint: object, core: PortalCore): void;
//# sourceMappingURL=portal-core.d.ts.map