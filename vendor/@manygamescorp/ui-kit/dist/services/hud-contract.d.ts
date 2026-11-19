export declare const HUD_SLOTS: readonly ["left", "right"];
export type HudSlot = (typeof HUD_SLOTS)[number];
export declare const HUD_BADGE_KINDS: readonly ["dot", "count"];
export type HudBadgeKind = (typeof HUD_BADGE_KINDS)[number];
export declare const HUD_CAPABILITY = "hud.registry@1";
export declare const HUD_CONFIG_SCOPE = "ui.hud";
export declare const HUD_CONFIG_KEY = "layout";
export declare const HUD_MAX_ITEMS = 64;
export declare const HUD_ID: RegExp;
export interface HudBadgeInput {
    readonly kind: HudBadgeKind;
    readonly value?: number;
}
export type HudBadge = HudBadgeInput;
export interface HudTimer {
    readonly endsAt: number;
    readonly remainingMs: number;
}
export type HudValue = number | string;
export interface HudItemSpec {
    readonly id: string;
    readonly icon: string;
    readonly label: string;
    readonly slot?: HudSlot;
    readonly order?: number;
    readonly onClick?: () => void;
    readonly value?: HudValue;
    readonly timer?: number;
    readonly contexts?: readonly string[];
    readonly badge?: HudBadgeInput;
    readonly clearOnOpen?: boolean;
    readonly progress?: number;
    readonly state?: HudItemState;
}
export declare const HUD_ITEM_STATES: readonly ["active", "locked"];
export type HudItemState = (typeof HUD_ITEM_STATES)[number];
export interface HudItem {
    readonly id: string;
    readonly icon: string;
    readonly label: string;
    readonly labels?: Readonly<Record<string, string>>;
    readonly slot: HudSlot;
    readonly order: number;
    readonly visible: boolean;
    readonly owner: string;
    readonly badge?: HudBadge;
    readonly value?: HudValue;
    readonly timer?: HudTimer;
    readonly progress?: number;
    readonly state: HudItemState;
}
export type HudChangeReason = 'register' | 'unregister' | 'badge' | 'state' | 'layout' | 'tick' | 'reset' | 'value' | 'timer';
export interface HudChanged {
    readonly ids: readonly string[];
    readonly reason: HudChangeReason;
}
export interface HudOpened {
    readonly id: string;
}
export interface HudHandle {
    readonly active: boolean;
    setValue(value: HudValue): void;
    setBadge(badge: HudBadgeInput | null): void;
    setTimer(endsAt: number | null): void;
    setProgress(progress: number | null): void;
    setState(state: HudItemState): void;
    dispose(): void;
}
export interface HudClient {
    register(spec: HudItemSpec): boolean;
    unregister(id: string): void;
    setValue(id: string, value: HudValue): void;
    setBadge(id: string, badge: HudBadgeInput | null): void;
    setTimer(id: string, endsAt: number | null): void;
    setProgress(id: string, progress: number | null): void;
    setState(id: string, state: HudItemState): void;
    items(): readonly HudItem[];
    open(id: string): void;
    onChange(listener: (change: HudChanged) => void): () => void;
    onOpen(listener: (id: string) => void): () => void;
    relayout(): void;
}
export interface Hud {
    register(spec: HudItemSpec): HudHandle;
    items(): readonly HudItem[];
    slot(slot: HudSlot): readonly HudItem[];
    open(id: string): void;
}
export type HudLayoutText = {
    readonly key: string;
} | {
    readonly values: Readonly<Record<string, string>>;
};
export interface HudLayoutEntry {
    readonly slot?: HudSlot;
    readonly order?: number;
    readonly visible?: boolean;
    readonly filters?: unknown;
    readonly badge?: HudBadgeInput;
    readonly label?: HudLayoutText;
    readonly icon?: string;
}
export interface HudLayout {
    readonly items: ReadonlyMap<string, HudLayoutEntry>;
    readonly unlisted: 'show' | 'hide';
}
export interface HudLayoutIssue {
    readonly path: string;
    readonly code: 'TYPE' | 'PATTERN' | 'RANGE' | 'UNKNOWN';
}
export declare function hudModuleImage(value: string): boolean;
export declare function parseHudLayout(raw: unknown, ignored?: (issue: HudLayoutIssue) => void): HudLayout;
//# sourceMappingURL=hud-contract.d.ts.map