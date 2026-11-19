import { type ModuleDefinition } from '@manygamescorp/core/module';
import type { SettingReward, SettingText } from '@manygamescorp/contracts-client/module-settings';
export { DAILY_REWARDS_SETTINGS } from './settings.js';
export interface DailyWindowEvent {
    readonly name: 'main' | 'board' | 'month' | 'gift' | 'reward';
}
export type DailyWindowVariant = 'week' | 'board' | 'calendar' | 'gift';
export interface DailyPlanDay {
    readonly day: number;
    readonly reward: readonly SettingReward[];
}
export interface DailyPlan {
    readonly track: string;
    readonly 'window': DailyWindowVariant;
    readonly cycleLength: number;
    readonly onMiss: boolean;
    readonly days: readonly DailyPlanDay[];
    readonly title?: SettingText;
    readonly subtitle?: SettingText;
}
export declare function dailyPlan(settings: Readonly<Record<string, unknown>>): DailyPlan;
export interface DailyRewards {
    open(): void;
    setNextRewardAt(endsAt: number | null): void;
    plan(): DailyPlan;
}
export declare function dailyRewardsModule(): ModuleDefinition<DailyRewards>;
//# sourceMappingURL=daily-rewards.d.ts.map