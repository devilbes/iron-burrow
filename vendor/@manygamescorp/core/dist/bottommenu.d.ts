import type { CapabilityService, ModuleServices } from './module.js';
export declare const BOTTOMMENU_CAPABILITY = "bottommenu.registry@1";
export declare const BOTTOMMENU_SLOT_TAKEN = "UI_BOTTOMMENU_SLOT_TAKEN";
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
export type BottomMenuRegistryService = CapabilityService<BottomMenuClient>;
export declare function bottomMenuItem(services: ModuleServices, spec: BottomMenuItemSpec): BottomMenuHandle;
//# sourceMappingURL=bottommenu.d.ts.map