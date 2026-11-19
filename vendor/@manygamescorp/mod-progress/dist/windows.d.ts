import { type ModuleWindow, type ModuleWindowHost } from '@manygamescorp/core/window-triggers';
export declare const PROGRESS_WINDOW_IDS: readonly ["levels", "level-win", "level-lose", "level-fail", "points", "quests", "achievements", "cross-quest", "season", "content-end", "continue", "endless", "endless-entry", "endless-revive", "endless-result"];
export type ProgressWindowId = typeof PROGRESS_WINDOW_IDS[number];
export interface ProgressWindowParams {
    readonly level?: number;
    readonly key?: string;
    readonly period?: string;
    readonly game?: string;
    readonly source?: string;
}
export interface ProgressWindowOpen {
    readonly name: ProgressWindowId;
    readonly params: ProgressWindowParams;
}
export interface ProgressWindowRef {
    readonly name: ProgressWindowId;
}
export interface ProgressWindowHost extends ModuleWindowHost<ProgressWindowId, ProgressWindowParams> {
    open(payload: ProgressWindowOpen): void;
    close(payload: ProgressWindowRef): void;
    onClosed(listener: (payload: ProgressWindowRef) => void): () => void;
}
export declare function progressWindows(host: ProgressWindowHost): Record<ProgressWindowId, ModuleWindow>;
//# sourceMappingURL=windows.d.ts.map