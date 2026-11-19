export interface UiState {
    setScreen(id: string, kind: string): void;
    setFullscreenPopup(active: boolean): void;
}
export declare const UI_FULLSCREEN_CHANGED = "sdk:ui:fullscreen-changed";
export interface FullscreenChanged {
    readonly active: boolean;
}
//# sourceMappingURL=ui-state.d.ts.map