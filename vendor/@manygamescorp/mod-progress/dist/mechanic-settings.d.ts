import { type ModuleSettingField } from '@manygamescorp/contracts-client/module-settings';
export type MechanicMode = 'core' | 'secondary';
export interface MechanicSettings {
    readonly mode: MechanicMode;
    readonly levelsSet: string;
    readonly progressKey: string;
    readonly stepPrefix: string;
    readonly curve: string;
    readonly cooldownSec: number;
    readonly rewardPercent: number;
}
export declare const MECHANIC_SETTINGS_FIELDS: readonly ModuleSettingField[];
export declare function parseMechanicSettings(settings: Readonly<Record<string, unknown>>): MechanicSettings;
export declare function checkMechanicSettingsFields(fields: readonly ModuleSettingField[]): void;
//# sourceMappingURL=mechanic-settings.d.ts.map