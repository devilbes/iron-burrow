import { type FeatureProps } from '../features/shared.js';
import type { ViewNode } from '../core.js';
export type BottomMenuSlot = 1 | 2 | 3 | 4 | 5 | 'center';
export interface BottomMenuBadge {
    readonly kind: 'dot' | 'count';
    readonly value?: number;
}
export interface BottomMenuItemSpec {
    readonly id: string;
    readonly icon: string;
    readonly label: string;
    readonly slot: BottomMenuSlot;
    readonly variant?: 'inline' | 'raised';
    readonly contexts?: readonly string[];
    readonly value?: number | string;
    readonly badge?: BottomMenuBadge;
    readonly timer?: number;
    readonly progress?: number;
    readonly state?: 'active' | 'locked';
    readonly onClick?: () => void;
}
export interface BottomMenuHandle {
    readonly active: boolean;
    setValue(value: number | string): void;
    setBadge(badge: BottomMenuBadge | null): void;
    setTimer(endsAt: number | null): void;
    setProgress(progress: number | null): void;
    setState(state: 'active' | 'locked'): void;
    dispose(): void;
}
export interface BottomMenuClient {
    register(spec: BottomMenuItemSpec): boolean;
    unregister(id: string): void;
    setValue(id: string, value: number | string): void;
    setBadge(id: string, badge: BottomMenuBadge | null): void;
    setTimer(id: string, endsAt: number | null): void;
    setProgress(id: string, progress: number | null): void;
    setState(id: string, state: 'active' | 'locked'): void;
}
export interface BottomMenuItem extends BottomMenuItemSpec {
    readonly position: number;
    readonly owner: string;
    readonly remainingMs?: number;
}
export interface BottomMenuOptions {
    readonly slots?: 3 | 5;
    readonly enabled?: boolean;
    readonly now: () => number;
    readonly hasWindowRule?: (key: string) => boolean;
    readonly ruleMissing?: (issue: {
        readonly key: string;
        readonly id: string;
    }) => void;
    readonly timers?: {
        set(fn: () => void, ms: number): unknown;
        clear(handle: unknown): void;
    };
}
export interface BottomMenuRegistry {
    add(spec: BottomMenuItemSpec, owner?: string): boolean;
    remove(id: string, owner?: string): void;
    setValue(id: string, value: number | string, owner?: string): void;
    setBadge(id: string, badge: BottomMenuBadge | null, owner?: string): void;
    setTimer(id: string, endsAt: number | null, owner?: string): void;
    setProgress(id: string, progress: number | null, owner?: string): void;
    setState(id: string, state: 'active' | 'locked', owner?: string): void;
    slots(): readonly (BottomMenuItem | null)[];
    context(): string;
    setContext(context: string): void;
    setEnabled(enabled: boolean): void;
    click(id: string): void;
    onChange(listener: () => void): () => void;
    reset(): void;
}
export declare const BOTTOMMENU_SLOT_TAKEN = "UI_BOTTOMMENU_SLOT_TAKEN";
export declare function createBottomMenuRegistry(options: BottomMenuOptions): BottomMenuRegistry;
export declare function bottomMenuModule(registry: BottomMenuRegistry): {
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
            emits: never[];
            listens: never[];
        };
    };
    init(ctx: {
        services: {
            provide(capability: string, service: object): void;
        };
    }): void;
    stop(): Promise<void>;
    dispose(): Promise<void>;
    api(): Readonly<{}>;
};
export interface BottomMenuProps extends FeatureProps {
    readonly items: readonly (BottomMenuItem | null)[];
    readonly text: (key: string) => string;
    readonly current?: string;
    readonly orientation?: 'portrait' | 'landscape';
}
export declare const BOTTOMMENU_LABEL_KEY = "sdk.bottommenu.label";
export declare function bottomMenuView(p: BottomMenuProps): ViewNode;
export declare const bottomMenu: import("../core.js").KitComponent<BottomMenuProps>;
//# sourceMappingURL=bottommenu.d.ts.map