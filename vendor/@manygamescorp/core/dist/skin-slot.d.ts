import { type PackageVersion } from './loader.js';
import type { EventBus } from './bus-types.js';
export type SkinSelection = PackageVersion;
export interface SkinSlot {
    prepare(selection: SkinSelection | null, signal: AbortSignal): Promise<() => void>;
    dispose(): void;
}
export declare function createSkinSelection(options: {
    port: SkinSlot | undefined;
    bus: EventBus;
    active(): boolean;
}): {
    set(slot: 'skin', selection: SkinSelection | null): Promise<void>;
    dispose(): void;
};
//# sourceMappingURL=skin-slot.d.ts.map