import { type FeatureProps } from '../features/shared.js';
export interface LeaderboardWindowTab {
    readonly id: string;
    readonly label?: string;
}
export interface LeaderboardWindowRow {
    readonly rank: number;
    readonly gid: number;
    readonly score: number;
    readonly name?: string;
    readonly nickname?: string;
    readonly avatar?: string | null;
}
export interface LeaderboardWindowProps extends FeatureProps {
    readonly tabs?: readonly LeaderboardWindowTab[];
    readonly tab: string;
    readonly endsInSec?: number | null;
    readonly subtitle?: string;
    readonly entries: readonly LeaderboardWindowRow[];
    readonly me?: {
        readonly rank: number | null;
        readonly score: number | null;
        readonly avatar?: string | null;
    };
    readonly meGid?: number;
}
export declare function leaderboardWindowView(p: LeaderboardWindowProps): import("../view-types.js").ViewNode;
export declare const leaderboardWindow: import("../core.js").KitComponent<LeaderboardWindowProps>;
//# sourceMappingURL=leaderboard-window.d.ts.map