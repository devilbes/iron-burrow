import type { ModuleContext, ModuleHandle } from '@manygamescorp/core/module';
import { type StoreAdapter } from './store.js';
export declare function loadStoreAdapter(ctx: {
    readonly config: unknown;
    readonly configs: ModuleContext['configs'];
    readonly modules: ModuleContext['modules'];
    readonly platform: ModuleContext['platform'];
    readonly environment: ModuleContext['environment'];
    readonly signal: AbortSignal;
}): Promise<{
    readonly store?: StoreAdapter;
    readonly handle?: ModuleHandle;
}>;
//# sourceMappingURL=store-loader.d.ts.map