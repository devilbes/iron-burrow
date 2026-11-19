import { type BusDomain, type PortalEnvelope } from './portal-protocol.js';
export type { BusDomain, PortalHandlerContext, PortalSchema } from './portal-protocol.js';
export { PortalBusError } from './portal-protocol.js';
export type PortalEnvironment = 'dev' | 'test' | 'prod';
export interface PortalBusOptions {
    role: 'host' | 'game';
    env: PortalEnvironment;
    appCode: string;
    sdkVersion: string;
    send(message: PortalEnvelope): void;
    rejected?(reason: string): void;
    requestTimeoutMs: number;
    handshakeTimeoutMs?: number;
}
export declare class PortalBus {
    private readonly options;
    private readonly domains;
    private selected;
    private phase;
    private nonce;
    private offered;
    private readonly pending;
    private readonly active;
    private readonly remoteSubscriptions;
    private readonly localSubscriptions;
    private readonly listeners;
    private readonly seen;
    private incoming;
    private outgoing;
    private handshake;
    private finishHandshake;
    private handshakeTimer;
    private helloTimer;
    constructor(options: PortalBusOptions);
    get capabilities(): Readonly<Record<string, number>>;
    get status(): string;
    register(domain: BusDomain): void;
    start(): Promise<Readonly<Record<string, number>> | null>;
    request<T = unknown>(ns: string, type: string, payload?: unknown): Promise<T>;
    on(ns: string, type: string, listener: (payload: unknown) => void): () => void;
    emit(ns: string, type: string, payload?: unknown): void;
    subscribe(ns: string, topic: string, listener: (payload: unknown) => void): Promise<() => Promise<void>>;
    receive(value: unknown): void;
    dispose(): void;
    private reject;
    private advertise;
    private negotiated;
    private versions;
    private control;
    private budget;
    private send;
    private domain;
    private ensureReady;
    private call;
    private response;
    private dispatch;
}
//# sourceMappingURL=portal-bus.d.ts.map