import type { UiSlot } from '@manygamescorp/contracts-client/ui-slots';
import type { UiZones } from '../zones.js';
export declare function profilePresentation(zones: UiZones): {
    attach({ from, uiSlots }: {
        from: string;
        uiSlots?: readonly UiSlot[];
    }): {
        readonly active: boolean;
        update(value: number): void;
        dispose(): void;
    };
};
//# sourceMappingURL=profile-presentation.d.ts.map