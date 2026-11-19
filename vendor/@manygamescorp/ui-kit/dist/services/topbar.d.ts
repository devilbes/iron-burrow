import type { HudViewItem } from './hud.js';
export declare const TOPBAR_CAPABILITY = "topbar.registry@1";
declare const SLOTS: readonly ["left", "center", "right"];
export type TopBarValue = number | string;
export type TopBarSlot = (typeof SLOTS)[number];
export type TopBarItemState = 'active' | 'locked';
export interface TopBarBadge {
    readonly kind: 'dot' | 'count';
    readonly value?: number;
}
export interface TopBarTimer {
    readonly endsAt: number;
    readonly remainingMs: number;
}
export interface TopBarItemSpec {
    readonly id: string;
    readonly slot?: TopBarSlot;
    readonly icon: string;
    readonly label: string;
    readonly value?: TopBarValue;
    readonly order?: number;
    readonly contexts?: readonly string[];
    readonly badge?: TopBarBadge;
    readonly timer?: number;
    readonly progress?: number;
    readonly state?: TopBarItemState;
    readonly onClick?: () => void;
}
export interface TopBarItem {
    readonly id: string;
    readonly slot: TopBarSlot;
    readonly icon: string;
    readonly label: string;
    readonly value?: TopBarValue;
    readonly previous?: TopBarValue;
    readonly revision: number;
    readonly order: number;
    readonly contexts: readonly string[];
    readonly owner: string;
    readonly badge?: TopBarBadge;
    readonly timer?: TopBarTimer;
    readonly progress?: number;
    readonly state: TopBarItemState;
}
export interface TopBarOptions {
    readonly now: () => number;
    readonly contexts?: Readonly<Record<string, boolean>>;
    readonly context?: string;
    readonly order?: Readonly<Record<string, Readonly<Record<string, number>>>>;
    readonly timers?: {
        set(callback: () => void, ms: number): unknown;
        clear(handle: unknown): void;
    };
}
export interface TopBarRegistry {
    add(spec: TopBarItemSpec, owner?: string): boolean;
    remove(id: string, owner?: string): void;
    setValue(id: string, value: TopBarValue, owner?: string): void;
    setBadge(id: string, badge: TopBarBadge | null, owner?: string): void;
    setTimer(id: string, endsAt: number | null, owner?: string): void;
    setProgress(id: string, progress: number | null, owner?: string): void;
    setState(id: string, state: TopBarItemState, owner?: string): void;
    items(context?: string): readonly TopBarItem[];
    context(): string;
    setContext(context: string): void;
    setEnabled(context: string, enabled: boolean): void;
    enabled(context: string): boolean;
    click(id: string): void;
    onChange(listener: () => void): () => void;
    reset(): void;
    landReward(id: string): void;
}
export declare function createTopBarRegistry(options: TopBarOptions): TopBarRegistry;
export declare function topBarView(registry: TopBarRegistry, text?: (key: string) => string, context?: string, slot?: TopBarSlot): readonly HudViewItem[];
export declare function topBarModule(registry: TopBarRegistry): {
    manifest: {
        id: string;
        version: string;
        kind: "ui";
        engines: {
            core: string;
        };
        targets: readonly ["web", "cordova"];
        permissions: never[];
        provides: string[];
        load: "eager";
        entry: string;
        events: {
            emits: never[];
            listens: never[];
        };
    };
    init(ctx: {
        readonly services: {
            provide(capability: string, service: object): void;
        };
    }): void;
    stop(): Promise<void>;
    dispose(): Promise<void>;
    api(): Readonly<{}>;
};
export {};
//# sourceMappingURL=topbar.d.ts.map