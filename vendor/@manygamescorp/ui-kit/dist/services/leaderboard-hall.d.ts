import { type FeatureProps, type Outcome } from '../features/shared.js';
export interface HallRow {
    readonly rank: number;
    readonly gid: number;
    readonly score: number;
    readonly profile?: {
        readonly name?: string;
        readonly nickname?: string;
        readonly level?: number;
        readonly avatar?: string | null;
    };
}
export interface HallPeriod {
    readonly key?: string;
    readonly endsInSec: number | null;
    readonly ended: boolean;
}
export interface HallPlayer {
    readonly row: HallRow;
    readonly rank: number | null;
    readonly score: number | null;
    readonly neighbours: readonly HallRow[];
}
export interface HallFinal {
    readonly boardId: string;
    readonly title: string;
    readonly top: readonly HallRow[];
}
export interface HallProps extends FeatureProps {
    readonly mode: 'all-time' | 'periodic';
    readonly catalog: readonly {
        readonly boardId: string;
        readonly title?: string;
        readonly leaderboardKey: string;
    }[];
    readonly selected?: string;
    readonly entries: readonly HallRow[];
    readonly total?: number;
    readonly me?: {
        readonly rank: number | null;
        readonly score: number | null;
    };
    readonly meGid?: number;
    readonly period?: HallPeriod;
    readonly player?: HallPlayer;
    readonly finals?: readonly HallFinal[];
    readonly result?: Outcome;
}
export declare const leaderboardHallView: (p: HallProps) => import("../view-types.js").ViewNode;
export declare const leaderboardHall: import("../core.js").KitComponent<HallProps>;
//# sourceMappingURL=leaderboard-hall.d.ts.map