import { type UiKitSettings, type UiSlot, type UiSlotModule, type UiZone } from '@manygamescorp/contracts-client/ui-slots';
import { type TopBarRegistry } from './services/topbar.js';
import { type HudRegistry } from './services/hud-registry.js';
import { type BottomMenuRegistry } from './services/bottommenu.js';
import type { HudItemSpec, HudBadgeInput } from './services/hud-contract.js';
export interface UiSlotUpdate {
    readonly badge?: HudBadgeInput | null;
    readonly timer?: number | null;
    readonly value?: number | string;
    readonly progress?: number | null;
    readonly state?: 'active' | 'locked';
}
export interface UiSlotHandle {
    readonly active: boolean;
    update(patch: UiSlotUpdate): void;
    dispose(): void;
}
export interface UiZoneRegistration extends Omit<HudItemSpec, 'slot'> {
    readonly side?: 'left' | 'right';
    readonly slot?: 'left' | 'right' | 'center' | 1 | 2 | 3 | 4 | 5;
    readonly moduleId: string;
    readonly slotId?: string;
    readonly declaration?: UiSlot;
    readonly fallback?: readonly UiZone[];
}
export interface UiWindowTicket {
    readonly closed: Promise<unknown>;
    close(): void;
}
export interface UiWindowRequest {
    readonly id: string;
    readonly moduleId: string;
    readonly priority?: number;
    readonly automatic?: boolean;
    readonly open: (signal: AbortSignal) => UiWindowTicket | Promise<UiWindowTicket>;
}
export interface UiZones {
    readonly topBarRegistry: TopBarRegistry;
    readonly hudRegistry: HudRegistry;
    readonly bottomMenuRegistry: BottomMenuRegistry;
    readonly topbar: {
        register(spec: UiZoneRegistration): UiSlotHandle;
    };
    readonly hud: {
        register(spec: UiZoneRegistration): UiSlotHandle;
    };
    readonly bottomMenu: {
        register(spec: UiZoneRegistration): UiSlotHandle;
    };
    readonly windows: {
        enqueue(request: UiWindowRequest): UiSlotHandle;
    };
    readonly screen: {
        setMode(mode: string): void;
        mode(): string;
    };
    useWindowQueue(port: {
        enqueue(request: UiWindowRequest): UiSlotHandle;
    }): () => void;
    settings(): UiKitSettings;
    configure(settings: UiKitSettings): void;
    onChange(listener: () => void): () => void;
    onSkipped(listener: (event: {
        moduleId: string;
        slot: string;
        zone: UiZone;
    }) => void): () => void;
    reset(): void;
    dispose(): void;
}
export declare function createUiZones(options: {
    readonly now: () => number;
    readonly settings?: UiKitSettings;
    readonly modules?: () => readonly UiSlotModule[];
    readonly skipped?: (event: {
        moduleId: string;
        slot: string;
        zone: UiZone;
    }) => void;
    readonly registries?: {
        readonly topBar: TopBarRegistry;
        readonly hud: HudRegistry;
        readonly bottomMenu: BottomMenuRegistry;
    };
}): UiZones;
//# sourceMappingURL=zones.d.ts.map