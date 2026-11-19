import type { PortalAuthSession } from '../portal-session.js';
import type { HttpTransport } from '../transport.js';
import type { authCookie } from './auth-cookie.js';
import type { SecureStore } from './secure-store.js';
import { type StorageBackend } from './scoped.js';
type Credential = {
    jwt: string;
    session: PortalAuthSession;
};
interface Options {
    api: string;
    local: StorageBackend | undefined;
    store: SecureStore;
    cookie: ReturnType<typeof authCookie>;
    now(): number;
    transport: HttpTransport;
    parse(value: unknown, now: number): Credential;
    refreshBeforeMs: number | undefined;
}
export declare function createPortalAuth(options: Options): {
    begin(): number;
    current: (version: number) => boolean;
    save(next: Credential, version: number): Promise<void>;
    restore: () => Promise<PortalAuthSession | undefined>;
    refresh: () => Promise<PortalAuthSession | undefined>;
    session(): PortalAuthSession | undefined;
    token(): {
        idToken: string;
    } | undefined;
    logout(): Promise<void>;
    idle: () => Promise<undefined>;
    dispose(): void;
};
export {};
//# sourceMappingURL=portal-auth.d.ts.map