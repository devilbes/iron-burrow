import type { LoginState } from './login-types.js';
export interface PortalLoginAuth {
    signin(request: {
        email: string;
    }): Promise<{
        rid: string;
        expiresAt: string;
    }>;
    code(request: {
        rid: string;
        code: string;
        audience: 'portal';
    }): Promise<{
        uid: number;
        audience: 'portal';
        expiresAt: string;
    }>;
    restorePortal(): Promise<{
        uid: number;
        audience: 'portal';
        expiresAt: string;
    } | undefined>;
    logout(): Promise<void>;
}
export interface PortalLoginOptions {
    audience: 'portal';
    auth: PortalLoginAuth;
    now(): number;
    resendDelayMs: number;
    readClipboard?(): Promise<string | undefined>;
}
export declare function createPortalLogin(options: PortalLoginOptions): Readonly<{
    readonly state: Readonly<LoginState>;
    subscribe(listener: (state: LoginState) => void): () => void;
    open(): Promise<void>;
    close: () => void;
    dispatch(intent: string, payload?: Readonly<Record<string, unknown>>): Promise<void>;
    dispose(): void;
}>;
//# sourceMappingURL=portal-login.d.ts.map