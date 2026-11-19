import { UI_STRINGS } from './strings.js';
import { type WindowPort } from './window-port.js';
import { createUiZones, type UiZones } from './zones.js';
import type { UiKitSettings, UiSlotModule } from '@manygamescorp/contracts-client/ui-slots';
import type { ModuleSettingsSchema } from '@manygamescorp/contracts-client/module-settings';
export declare function uiKitModule(supplied?: UiZones | undefined): {
    manifest: {
        id: string;
        selection: "required";
        version: string;
        kind: "ui";
        engines: {
            core: string;
        };
        targets: readonly ["web", "cordova"];
        settings: ModuleSettingsSchema;
        permissions: readonly ["windows"];
        entry: string;
        load: "eager";
        provides: string[];
        events: {
            emits: string[];
            listens: string[];
        };
    };
    init(ctx: {
        readonly bus: {
            on(event: string, listener: (payload: unknown) => void): () => void;
            emit(event: string, payload: unknown): void;
        };
    } & {
        readonly strings?: {
            t?(key: string, params?: Readonly<Record<string, string | number>>): string;
            locale?(): string;
            registerDefaults(namespace: string, bundles: typeof UI_STRINGS): void;
        };
        readonly windows?: WindowPort;
        readonly log?: object;
        readonly time: {
            now(): number;
        };
        readonly settings: Readonly<Record<string, unknown>>;
        readonly services: {
            provide(capability: string, service: object): void;
        };
    }): void;
    start(ctx: {
        readonly bus: {
            on(event: string, listener: (payload: unknown) => void): () => void;
            emit(event: string, payload: unknown): void;
        };
    } & {
        readonly strings?: {
            t?(key: string, params?: Readonly<Record<string, string | number>>): string;
            locale?(): string;
            registerDefaults(namespace: string, bundles: typeof UI_STRINGS): void;
        };
        readonly windows?: WindowPort;
        readonly log?: object;
        readonly time: {
            now(): number;
        };
        readonly settings: Readonly<Record<string, unknown>>;
        readonly services: {
            provide(capability: string, service: object): void;
        };
    }): Promise<void>;
    stop(): Promise<void>;
    dispose(): Promise<void>;
    api: () => UiZones;
};
export { createUiZones };
export type { UiZones, UiKitSettings, UiSlotModule };
//# sourceMappingURL=module.d.ts.map