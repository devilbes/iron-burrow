import type { CapabilityService, ModuleServices } from './module.js';
export declare const TOPBAR_CAPABILITY = "topbar.registry@1";
export declare const TOPBAR_CONTEXTS: readonly ["main", "core"];
export type TopBarBuiltinContext = (typeof TOPBAR_CONTEXTS)[number];
export declare const TOPBAR_CONTEXT: RegExp;
export declare const TOPBAR_ID: RegExp;
export declare const TOPBAR_MAX_ITEMS = 32;
export declare const TOPBAR_MAX_CONTEXTS = 8;
export declare const TOPBAR_MAX_VALUE = 32;
export type TopBarValue = number | string;
export type TopBarSlot = 'left' | 'center' | 'right';
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
    readonly badge?: TopBarBadge;
    readonly timer?: TopBarTimer;
    readonly progress?: number;
    readonly state: TopBarItemState;
    readonly previous?: TopBarValue;
    readonly revision: number;
    readonly order: number;
    readonly contexts: readonly string[];
    readonly owner: string;
}
export interface TopBarClient {
    register(spec: TopBarItemSpec): boolean;
    setValue(id: string, value: TopBarValue): void;
    setBadge(id: string, badge: TopBarBadge | null): void;
    setTimer(id: string, endsAt: number | null): void;
    setProgress(id: string, progress: number | null): void;
    setState(id: string, state: TopBarItemState): void;
    unregister(id: string): void;
}
export type TopBarRegistryService = CapabilityService<TopBarClient>;
export interface TopBarHandle {
    readonly active: boolean;
    setValue(value: TopBarValue): void;
    setBadge(badge: TopBarBadge | null): void;
    setTimer(endsAt: number | null): void;
    setProgress(progress: number | null): void;
    setState(state: TopBarItemState): void;
    dispose(): void;
}
export declare function topBarItem(services: ModuleServices, spec: TopBarItemSpec): TopBarHandle;
//# sourceMappingURL=topbar.d.ts.map