export declare const SESSION_TRANSPORT = "session.transport@1";
export interface SessionSocket {
    send(frame: Readonly<Record<string, unknown>>): void;
    authenticate(frame: Readonly<Record<string, unknown>>): Promise<void>;
    close(): void;
}
export interface SessionChannel {
    readonly signal: AbortSignal;
    readonly baseUrl: string;
    supports(feature: 'socket' | 'stream'): boolean;
    deviceId(): Promise<string>;
    request(path: string, options: {
        readonly headers?: Readonly<Record<string, string>>;
        readonly body?: unknown;
        readonly credentialPath?: readonly (string | number)[];
        readonly signal: AbortSignal;
        readonly timeoutMs?: number | null;
    }): Promise<Response>;
    socket(path: string, protocol: string, hello: Readonly<Record<string, unknown>>, signal: AbortSignal, handlers: {
        open(socket: SessionSocket): void;
        message(data: unknown): void;
        close(code?: number): void;
    }): SessionSocket;
    renew(): Promise<void>;
}
export interface SessionTransport {
    channel(service: string): SessionChannel;
}
export interface SessionChannelOptions {
    readonly baseUrl: string;
    readonly appId?: number;
    readonly token: () => string | undefined;
    readonly deviceId: () => Promise<string>;
    readonly signal: AbortSignal;
    readonly fetch?: typeof globalThis.fetch;
    readonly renew?: () => Promise<void>;
    readonly unauthorized: (token: string) => void;
}
export declare function createSessionChannel(options: SessionChannelOptions): SessionChannel;
//# sourceMappingURL=session-transport.d.ts.map