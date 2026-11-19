import { type FeatureProps, type Outcome } from '../features/shared.js';
export interface LeaderboardProps extends FeatureProps {
    readonly canOpenProfile?: boolean;
    readonly catalog: readonly {
        readonly boardId: string;
        readonly title?: string;
        readonly leaderboardKey: string;
    }[];
    readonly selected?: string;
    readonly entries: readonly {
        readonly rank: number;
        readonly score: number;
        readonly gid: number;
        readonly profile?: {
            readonly name: string;
            readonly nickname?: string;
        };
    }[];
    readonly me?: {
        readonly rank: number | null;
        readonly score: number | null;
    };
    readonly result?: Outcome;
    readonly canSubmit: boolean;
}
export declare const leaderboard: import("../core.js").KitComponent<LeaderboardProps>;
//# sourceMappingURL=leaderboard.d.ts.map