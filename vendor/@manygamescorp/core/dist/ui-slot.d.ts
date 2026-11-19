import type { ModuleServices } from './module.js';
import type { UiZone } from '@manygamescorp/contracts-client/ui-slots';
export declare const UI_SLOTS_CAPABILITY = "ui.slots@1";
export declare function uiSlotItem(services: ModuleServices, zone: UiZone, spec: {
    readonly id: string;
    readonly icon: string;
    readonly label: string;
}): Readonly<{
    readonly active: boolean;
    setValue: (value: number | string) => void;
    setBadge: (badge: {
        readonly kind: "dot" | "count";
        readonly value?: number;
    } | null) => void;
    setTimer: (timer: number | null) => void;
    setProgress: (progress: number | null) => void;
    setState: (state: "active" | "locked") => void;
    dispose: () => void;
}> | undefined;
//# sourceMappingURL=ui-slot.d.ts.map