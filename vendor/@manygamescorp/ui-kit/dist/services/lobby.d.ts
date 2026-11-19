import { type FeatureProps } from '../features/shared.js';
import type { ViewNode } from '../core.js';
import { type HudViewItem } from './hud.js';
import { type HudRegistry } from './hud-registry.js';
import { type TopBarRegistry } from './topbar.js';
import { type BottomMenuItem, type BottomMenuRegistry } from './bottommenu.js';
import { type StandardAction } from './error.js';
export interface LobbyProps extends FeatureProps {
    readonly topBar: Readonly<Record<'left' | 'center' | 'right', readonly HudViewItem[]>>;
    readonly hud: Readonly<Record<'left' | 'right', readonly HudViewItem[]>>;
    readonly bottomMenu: readonly (BottomMenuItem | null)[];
    readonly current?: string;
    readonly text: (key: string) => string;
    readonly orientation?: 'portrait' | 'landscape';
    readonly title?: string;
    readonly stage?: {
        readonly subtitle?: string;
        readonly actions?: readonly StandardAction[];
    };
    readonly hero?: Omit<LobbyHeroProps, 'lang'>;
}
export declare function lobbyIntents(registries: {
    readonly topBar?: TopBarRegistry;
    readonly hud?: HudRegistry;
    readonly bottomMenu?: BottomMenuRegistry;
}, fallback?: (intent: string, payload?: Readonly<Record<string, unknown>>) => void): (intent: string, payload?: Readonly<Record<string, unknown>>) => void;
export declare function lobbyProps(base: Pick<LobbyProps, 'elementId' | 'lang' | 'emitIntent'> & Partial<Pick<LobbyProps, 'title' | 'stage' | 'current' | 'orientation' | 'assetUrl'>>, registries: {
    readonly topBar?: TopBarRegistry;
    readonly hud?: HudRegistry;
    readonly bottomMenu?: BottomMenuRegistry;
}, t?: (key: string) => string): LobbyProps;
export declare function lobbyView(p: LobbyProps): ViewNode;
export interface LobbyHeroProps {
    readonly lang: string;
    readonly l10n?: NonNullable<FeatureProps['l10n']>;
    readonly level?: number;
    readonly progress?: {
        readonly done: number;
        readonly total: number;
    };
    readonly label?: string;
    readonly assetUrl?: (key: string) => string;
    readonly image?: {
        readonly src: string;
        readonly alt?: string;
    };
    readonly testId?: string;
}
export interface LobbyHeroSlot {
    set(image: {
        readonly src: string;
        readonly alt?: string;
    } | undefined): void;
    get(): {
        readonly src: string;
        readonly alt?: string;
    } | undefined;
    onChange(listener: () => void): () => void;
}
export declare function createLobbyHeroSlot(): LobbyHeroSlot;
export declare function lobbyLevelProgress(level: number, total?: number): {
    done: number;
    total: number;
};
export declare function lobbyHeroView(p: LobbyHeroProps): ViewNode;
export declare const lobby: import("../core.js").KitComponent<LobbyProps>;
//# sourceMappingURL=lobby.d.ts.map