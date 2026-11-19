import { type HudLayoutIssue, type HudBadgeInput, type HudChangeReason, type HudChanged, type HudItem, type HudItemSpec, type HudItemState, type HudSlot, type HudValue } from './hud-contract.js';
import type { HudViewItem } from './hud.js';
export interface MissingWindowRule {
    readonly key: string;
    readonly id: string;
}
export declare function reportMissingWindowRule(key: string, id: string, report?: (issue: MissingWindowRule) => void): void;
export interface HudDeps {
    readonly now: () => number;
    readonly enabled?: boolean;
    readonly layout?: () => unknown;
    readonly match?: (filter: unknown) => boolean;
    readonly ignored?: (issue: HudLayoutIssue) => void;
    readonly changed?: (change: HudChangedEvent) => void;
    readonly opened?: (id: string) => void;
    readonly hasWindowRule?: (key: string) => boolean;
    readonly ruleMissing?: (issue: MissingWindowRule) => void;
    readonly timers?: {
        set(callback: () => void, ms: number): unknown;
        clear(handle: unknown): void;
    };
}
export interface HudChangedEvent {
    readonly ids: readonly string[];
    readonly reason: HudChangeReason;
}
export interface HudOpenedEvent {
    readonly id: string;
}
export interface HudRegistry {
    add(spec: HudItemSpec, owner?: string): boolean;
    remove(id: string, owner?: string): void;
    setValue(id: string, value: HudValue, owner?: string): void;
    setBadge(id: string, badge: HudBadgeInput | null, owner?: string): void;
    setTimer(id: string, endsAt: number | null, owner?: string): void;
    setProgress(id: string, progress: number | null, owner?: string): void;
    setState(id: string, state: HudItemState, owner?: string): void;
    items(): readonly HudItem[];
    open(id: string): void;
    relayout(): void;
    reset(): void;
    context(): string;
    setContext(context: string): void;
    setEnabled(enabled: boolean): void;
    onChange(listener: (change: HudChanged) => void): () => void;
    onOpen(listener: (id: string) => void): () => void;
    onIgnored(listener: (issue: HudLayoutIssue) => void): () => void;
}
export declare function createHudRegistry(deps: HudDeps): HudRegistry;
export declare function hudRegistryView(registry: HudRegistry, slot: HudSlot, text?: (key: string) => string, lang?: string): readonly HudViewItem[];
export declare function hudRegistryModule(registry: HudRegistry): {
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
        entry: string;
        load: "eager";
        events: {
            emits: string[];
            listens: string[];
        };
    };
    start(ctx: {
        readonly bus: {
            on(event: string, listener: (payload: unknown) => void): () => void;
            emit(event: string, payload: unknown): void;
        };
    }): Promise<void>;
    init(ctx: {
        services: {
            provide(capability: string, service: object): void;
        };
    }): void;
    stop(): Promise<void>;
    dispose(): Promise<void>;
    api(): Readonly<{}>;
};
//# sourceMappingURL=hud-registry.d.ts.map