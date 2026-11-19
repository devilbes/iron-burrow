import type { PortalToken } from './portal-types.js';
export interface PortalAuthSession {
    readonly uid: number;
    readonly audience: 'portal';
    readonly expiresAt: string;
}
export declare function bindPortalSession(auth: object, token: () => Promise<PortalToken | undefined>): void;
export declare function readPortalSession(auth: object): Promise<PortalToken | undefined>;
//# sourceMappingURL=portal-session.d.ts.map