import type { ModuleServices } from '@manygamescorp/core/module';
import type { ProfileLevelChangedEvent } from '@manygamescorp/core/profile';
export declare function levelTopBar(services: ModuleServices, changed: (payload: ProfileLevelChangedEvent) => void): {
    readonly active: boolean;
    update(level: unknown): void;
    dispose(): void;
};
//# sourceMappingURL=presentation.d.ts.map