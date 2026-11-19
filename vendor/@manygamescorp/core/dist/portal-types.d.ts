export interface PortalLocale {
    readonly locale: string;
    readonly fallback: readonly string[];
}
export type PortalAuthState = 'signedIn' | 'signedOut' | 'switched';
export type PortalIdScreen = 'account' | 'signin' | 'links';
export interface PortalIdResult {
    readonly result: 'closed' | 'signedIn' | 'signedOut';
}
export interface PortalFullscreenResult {
    readonly active: boolean;
}
export interface PortalToken {
    readonly idToken: string;
}
export interface PortalGameUi {
    active(): boolean;
    openId(screen: PortalIdScreen): Promise<PortalIdResult>;
    fullscreen(): Promise<PortalFullscreenResult>;
    exit(): void;
}
//# sourceMappingURL=portal-types.d.ts.map