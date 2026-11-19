import type { UiZones } from './zones.js';
import type { KitComponent, PopupKind } from './core.js';
import { type HudRegistry } from './services/hud-registry.js';
import { type BottomMenuRegistry } from './services/bottommenu.js';
import { type TopBarRegistry } from './services/topbar.js';
export declare const SHELL_SLOTS: readonly ["topBar.left", "topBar.center", "topBar.right", "leftHandle", "rightHandle", "bottomBar.left", "bottomBar.center", "bottomBar.right", "screen", "overlay", "system", "reward", "settings"];
export type ShellSlot = (typeof SHELL_SLOTS)[number];
export type ShellKind = 'component' | 'route' | 'popup' | 'window' | 'hud';
export interface ShellContribution {
    readonly id: string;
    readonly kind: ShellKind;
    readonly slot?: ShellSlot;
    readonly component: string;
    readonly title?: string;
    readonly icon?: string;
    readonly order?: number;
    readonly requiredServices?: readonly string[];
    readonly popupKind?: PopupKind;
}
export type ShellIntent = (intent: string, payload?: Readonly<Record<string, unknown>>) => void;
export type ShellProps = Readonly<Record<string, unknown>>;
export interface ShellHost {
    open(elementId: string, props?: ShellProps): ShellTicket;
    close(elementId: string): void;
    navigate(routeId: string): void;
    update(elementId?: string): void;
}
export interface ShellTicket {
    readonly closed: Promise<void>;
    close(): void;
}
export interface ShellModule {
    readonly manifest: {
        readonly id: string;
        readonly ui?: {
            readonly contributes?: readonly ShellContribution[];
        };
    };
    readonly components: Readonly<Record<string, KitComponent<never>>>;
    props?(elementId: string, extra?: ShellProps): ShellProps;
    intent?(elementId: string, intent: string, payload?: ShellProps): void;
    attach?(host: ShellHost): void | (() => void);
}
export interface ShellEntry {
    readonly contribution: ShellContribution;
    readonly owner: ShellModule;
    readonly missing: readonly string[];
}
export declare function popupKindOf(entry: ShellEntry): PopupKind;
export declare function slotOf(item: ShellContribution): ShellSlot;
export declare class UiRegistry {
    #private;
    constructor(installed?: (moduleId: string) => boolean);
    add(module: ShellModule): readonly ShellEntry[];
    remove(moduleId: string): readonly ShellEntry[];
    get(elementId: string): ShellEntry | undefined;
    slot(slot: ShellSlot): readonly ShellEntry[];
    routes(): readonly ShellEntry[];
    modules(): readonly ShellModule[];
}
export interface ShellLabels {
    readonly menu: string;
    readonly settings: string;
    readonly close: string;
    readonly empty: string;
    readonly missing: (services: readonly string[]) => string;
}
export declare const SHELL_LABELS: Readonly<Record<'ru' | 'en', ShellLabels>>;
export declare const SHELL_ICONS: readonly string[];
export interface UiShellOptions {
    readonly zones?: UiZones;
    readonly title: string;
    readonly installed?: (moduleId: string) => boolean;
    readonly text?: (key: string) => string;
    readonly lang?: string;
    readonly labels?: Partial<ShellLabels>;
    readonly home?: string;
    readonly state?: {
        setScreen(id: string, kind: string): void;
        setFullscreenPopup(active: boolean): void;
    };
    readonly screenKind?: (routeId: string) => string;
    readonly topBar?: TopBarRegistry;
    readonly hud?: HudRegistry;
    readonly bottomMenu?: BottomMenuRegistry;
    readonly topBarContext?: (routeId: string) => string;
    readonly elementAction?: (elementId: string, payload?: ShellProps) => void;
    readonly ads?: {
        bannerInset(): {
            readonly top: number;
            readonly bottom: number;
        };
        onChange(update: () => void): () => void;
    };
}
export interface UiShell {
    readonly registry: UiRegistry;
    add(module: ShellModule): void;
    remove(moduleId: string): void;
    navigate(routeId: string): void;
    current(): string | undefined;
    open(elementId: string, props?: ShellProps): ShellTicket;
    openSettings(): void;
    closeSettings(): void;
    refresh(options?: {
        readonly lang?: string;
    }): void;
    dispose(): void;
}
export declare function createUiShell(container: HTMLElement, options: UiShellOptions): UiShell;
//# sourceMappingURL=shell.d.ts.map