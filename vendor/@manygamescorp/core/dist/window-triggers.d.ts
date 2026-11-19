export type WindowSource = 'trigger' | 'user' | 'child';
export interface WindowTicket {
    readonly closed: Promise<unknown>;
    close(): void;
}
export interface ModuleWindow {
    readonly skinScope?: string;
    readonly source?: WindowSource;
    canShow(context: Readonly<Record<string, unknown>>): boolean | Promise<boolean>;
    open(params?: Readonly<Record<string, unknown>>, context?: Readonly<Record<string, unknown>>): WindowTicket;
}
export interface WindowTriggerPort {
    showPlacement(placement: string, signal: AbortSignal): Promise<WindowTicket | undefined>;
}
export interface WindowRequest {
    readonly source?: WindowSource;
    readonly parent?: WindowTicket | QueuedWindow;
    readonly module: string;
    readonly window: string;
    readonly placement?: string;
    readonly params?: Readonly<Record<string, unknown>>;
    readonly context?: Readonly<Record<string, unknown>>;
    readonly priority?: number;
}
export interface QueuedWindow {
    readonly shown: Promise<WindowTicket | undefined>;
    readonly closed: Promise<void>;
    close(): void;
}
export interface WindowSkinScopes {
    preload(scope: string): Promise<unknown>;
    generation?(): unknown;
}
export interface SdkUiWindows {
    register(module: string, windows: Readonly<Record<string, ModuleWindow>>): () => void;
    useSkinScopes(port: WindowSkinScopes): () => void;
    usePlacements(port: WindowTriggerPort): () => void;
    canShow(name: string, context?: Readonly<Record<string, unknown>>): Promise<boolean>;
    has(module: string, window: string): boolean;
    show(name: string, params?: Readonly<Record<string, unknown>>, options?: {
        readonly context?: Readonly<Record<string, unknown>>;
        readonly priority?: number;
        readonly signal?: AbortSignal;
        readonly source?: WindowSource;
        readonly parent?: WindowTicket | QueuedWindow;
    }): QueuedWindow;
    enqueue(request: WindowRequest, signal: AbortSignal): Promise<WindowTicket | undefined>;
    resetSession(): void;
}
export interface ModuleWindowHost<N extends string, P> {
    readonly module?: string;
    readonly signal?: AbortSignal;
    readonly source?: WindowSource;
    open(payload: {
        readonly name: N;
        readonly params: P;
    }): void;
    close(payload: {
        readonly name: N;
    }): void;
    onClosed(listener: (payload: {
        readonly name: N;
    }) => void): () => void;
}
export declare function registerModuleWindow<N extends string, P>(host: ModuleWindowHost<N, P>, names: readonly N[], scopes?: Partial<Record<N, string>>): Record<N, ModuleWindow>;
export declare function createUiWindows(lifecycle?: {
    acquire(module: string): Promise<() => Promise<void>>;
}): SdkUiWindows;
//# sourceMappingURL=window-triggers.d.ts.map