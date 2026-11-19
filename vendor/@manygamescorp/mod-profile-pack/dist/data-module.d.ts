import { type HudItemSpec } from '@manygamescorp/core/hud';
import { type ModuleDefinition, type SdkModuleManifest } from '@manygamescorp/core/module';
import { type DataHttp } from '@manygamescorp/core/data-client';
export { dataClient, type DataHttp } from '@manygamescorp/core/data-client';
export declare function dataModule<Api extends {
    dispose(): void;
}>(manifest: SdkModuleManifest, create: (http: DataHttp, signal: AbortSignal) => Api, hud?: readonly HudItemSpec[]): ModuleDefinition<Api>;
//# sourceMappingURL=data-module.d.ts.map