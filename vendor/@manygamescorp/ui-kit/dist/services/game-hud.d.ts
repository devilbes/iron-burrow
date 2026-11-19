import type { ViewNode } from '../core.js';
import { type FeatureProps } from '../features/shared.js';
import type { HudRegistry } from './hud-registry.js';
export interface GameHudBooster {
    readonly id: string;
    readonly icon: string;
    readonly label: string;
    readonly count?: number;
    readonly ad?: boolean;
    readonly disabled?: boolean;
}
export interface GameHudCheckpoint {
    readonly at: number;
    readonly kind: 'passed' | 'star';
}
export interface GameHudProps extends FeatureProps {
    readonly variant?: 'level' | 'strip' | 'score';
    readonly level: number;
    readonly progress: number;
    readonly coins?: number | string;
    readonly score?: number | string;
    readonly checkpoints?: readonly GameHudCheckpoint[];
    readonly reward?: boolean;
    readonly combo?: number;
    readonly boosters?: readonly GameHudBooster[];
    readonly skip?: {
        readonly disabled?: boolean;
    };
    readonly startHint?: boolean;
}
export declare function gameHudView(p: GameHudProps): ViewNode;
export interface GameScreenBooster extends GameHudBooster {
    readonly caption?: string;
}
export interface GameGoal {
    readonly label?: string;
    readonly value: number;
    readonly target: number;
    readonly text?: string;
}
export interface GameScreenProps extends FeatureProps {
    readonly level: number;
    readonly goal?: GameGoal;
    readonly score: number | string;
    readonly stats?: GameStats;
    readonly board?: {
        readonly size: number;
        readonly tones?: Readonly<Record<number, 'violet' | 'coral'>>;
    };
    readonly pieces?: readonly {
        readonly id: string;
        readonly label: string;
        readonly cells: number;
        readonly direction: 'row' | 'column';
    }[];
    readonly boosters?: readonly GameScreenBooster[];
    readonly video?: {
        readonly available: boolean;
    };
}
export interface GameStats {
    readonly seconds?: number;
    readonly moves?: number;
}
export declare function gameScreenView(p: GameScreenProps): ViewNode;
export declare const GAME_FRAME_BOARD_SLOT = "board";
export interface GameFrameProps extends FeatureProps {
    readonly level: number;
    readonly goal?: GameGoal;
    readonly score: number | string;
    readonly stats?: GameStats;
    readonly boosters?: readonly GameScreenBooster[];
    readonly video?: {
        readonly available: boolean;
    };
}
export declare function gameFrameView(p: GameFrameProps): ViewNode;
export interface GameScoreProps extends FeatureProps {
    readonly score: number | string;
    readonly stats?: GameStats;
}
export declare function gameScoreView(p: GameScoreProps): ViewNode;
export interface GameHeadProps extends FeatureProps {
    readonly level: number;
    readonly goal?: GameGoal;
}
export declare function gameHeadView(p: GameHeadProps): ViewNode;
export interface GameBoostersProps extends FeatureProps {
    readonly boosters: readonly GameScreenBooster[];
    readonly video?: {
        readonly available: boolean;
    };
}
export declare function gameBoostersView(p: GameBoostersProps): ViewNode;
export declare const GAME_HUD_CONTEXT = "game";
export declare const GAME_HUD_BOOSTER_PREFIX = "booster.";
export declare const GAME_HUD_ITEMS: readonly ["level", "coins", "score", "combo", "skip"];
type GameHudData = Pick<GameHudProps, 'level' | 'progress' | 'coins' | 'score' | 'combo' | 'boosters' | 'skip'>;
type Intent = (intent: string, payload?: Record<string, unknown>) => void;
export declare function gameHudFromRegistry(registry: HudRegistry, label?: (key: string) => string): GameHudData;
export declare function gameHudIntent(registry: HudRegistry, rest: Intent): Intent;
export declare const gameHud: import("../core.js").KitComponent<GameHudProps>;
export declare const gameScreen: import("../core.js").KitComponent<GameScreenProps>;
export declare const gameHead: import("../core.js").KitComponent<GameHeadProps>;
export declare const gameBoosters: import("../core.js").KitComponent<GameBoostersProps>;
export declare const gameScore: import("../core.js").KitComponent<GameScoreProps>;
export declare const gameFrame: import("../core.js").KitComponent<GameFrameProps>;
export {};
//# sourceMappingURL=game-hud.d.ts.map