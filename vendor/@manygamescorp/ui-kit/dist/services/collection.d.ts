import { type FeatureProps } from '../features/shared.js';
export interface CollectionCard {
    readonly id: string;
    readonly name: string;
    readonly stars: number;
    readonly extra?: number;
    readonly state: 'owned' | 'new' | 'golden' | 'locked';
    readonly art?: string;
}
export interface CollectionReward {
    readonly id: string;
    readonly label: string;
    readonly icon?: string;
    readonly art?: string;
    readonly highlight?: boolean;
}
export interface CardCollectionProps extends FeatureProps {
    readonly balance?: string;
    readonly stars?: string;
    readonly setIndex: number;
    readonly setTotal: number;
    readonly set: {
        readonly name: string;
        readonly cover?: string;
        readonly owned: number;
        readonly total: number;
        readonly rewards: readonly CollectionReward[];
    };
    readonly cards: readonly CollectionCard[];
    readonly packs: number;
}
export declare const cardCollectionView: (p: CardCollectionProps) => import("../view-types.js").ViewNode;
export declare const cardCollection: import("../core.js").KitComponent<CardCollectionProps>;
export interface CardDetailProps extends FeatureProps {
    readonly name: string;
    readonly issueLine?: string;
    readonly rarity: string;
    readonly setName: string;
    readonly number?: string;
    readonly stars: number;
    readonly art?: string;
    readonly isNew?: boolean;
    readonly packIndex: number;
    readonly packTotal: number;
    readonly setProgress: {
        readonly done: number;
        readonly total: number;
    };
}
export declare const cardDetailView: (p: CardDetailProps) => import("../view-types.js").ViewNode;
export declare const cardDetail: import("../core.js").KitComponent<CardDetailProps>;
export interface AlbumSet {
    readonly id: string;
    readonly name: string;
    readonly tone: 'mint' | 'orange' | 'blue';
    readonly icon?: string;
    readonly owned: number;
    readonly total: number;
    readonly otherGame?: string;
}
export interface AlbumEvent {
    readonly title: string;
    readonly subtitle: string;
    readonly dateline: readonly [string, string];
    readonly remaining: string;
    readonly rewards: readonly {
        readonly art: string;
        readonly label?: string;
        readonly badge?: string;
    }[];
    readonly hostArt?: string;
    readonly activity: {
        readonly title: string;
        readonly remaining: string;
        readonly done: number;
        readonly total: number;
        readonly art?: string;
        readonly rewardArt?: string;
    };
    readonly exchange: {
        readonly title: string;
        readonly subtitle: string;
        readonly label: string;
        readonly giftLabel: string;
        readonly gifts: number;
    };
}
export interface CardAlbumProps extends FeatureProps {
    readonly event?: AlbumEvent;
    readonly sets: readonly AlbumSet[];
    readonly prize: {
        readonly label?: string;
        readonly done: number;
        readonly total: number;
    };
    readonly setPrefix?: string | false;
}
export declare const cardAlbumView: (p: CardAlbumProps) => import("../view-types.js").ViewNode;
export declare const cardAlbum: import("../core.js").KitComponent<CardAlbumProps>;
export interface ShelfGame {
    readonly id: string;
    readonly name: string;
    readonly tone?: 'orange' | 'blue' | 'violet';
    readonly icon?: string;
    readonly isNew?: boolean;
    readonly chip: {
        readonly kind: 'gift' | 'genre' | 'playing';
        readonly label: string;
    };
}
export interface GamesShelfProps extends FeatureProps {
    readonly games: readonly ShelfGame[];
}
export declare const gamesShelfView: (p: GamesShelfProps) => import("../view-types.js").ViewNode;
export declare const gamesShelf: import("../core.js").KitComponent<GamesShelfProps>;
export interface EasterGuestProps extends FeatureProps {
    readonly game: string;
}
export declare const easterGuestView: (p: EasterGuestProps) => import("../view-types.js").ViewNode;
export declare const easterGuest: import("../core.js").KitComponent<EasterGuestProps>;
//# sourceMappingURL=collection.d.ts.map