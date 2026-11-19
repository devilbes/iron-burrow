import type { ModuleOverride } from '@manygamescorp/contracts-client/module-settings';
import type { HttpTransport } from './transport.js';
import type { ScopedStorage } from './storage/scoped.js';
export declare function parseModuleOverrides(value: unknown): Readonly<Record<string, readonly ModuleOverride[]>>;
export declare function loadModuleOverrides(options: {
    transport: HttpTransport;
    storage?: ScopedStorage;
    signal: AbortSignal;
    timeoutMs?: number;
    unavailable(): void;
}): Promise<Readonly<Record<string, readonly ModuleOverride[]>>>;
//# sourceMappingURL=module-overrides.d.ts.map