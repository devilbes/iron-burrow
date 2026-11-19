export declare function authCookie(now: () => number, scope?: 'page' | 'origin'): {
    get: (name: string) => string | undefined;
    set(name: string, value: string, expiresAt: number): void;
    delete: (name: string) => void;
} | undefined;
//# sourceMappingURL=auth-cookie.d.ts.map