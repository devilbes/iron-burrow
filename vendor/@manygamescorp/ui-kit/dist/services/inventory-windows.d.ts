import type { AssetRef } from '@manygamescorp/contracts-client/asset-ref';
import { type FeatureProps } from '../features/shared.js';
import { type ViewNode } from '../core.js';
export interface InventoryEntry {
    readonly id: string;
    readonly name: string;
    readonly quantity: number;
    readonly icon?: string;
    readonly isNew?: boolean;
    readonly description?: string;
    readonly rarity?: string;
    readonly consumable?: boolean;
    readonly exchangeable?: boolean;
}
export interface InventoryWindowProps extends FeatureProps {
    readonly tab: 'currency' | 'items';
    readonly currencies: readonly InventoryEntry[];
    readonly items: readonly InventoryEntry[];
    readonly selectedId?: string;
}
export declare const inventoryWindowView: (p: InventoryWindowProps) => ViewNode;
export declare const inventoryWindow: import("../core.js").KitComponent<InventoryWindowProps>;
export interface ChestEntry {
    readonly icon?: AssetRef;
    readonly id: string;
    readonly title: string;
    readonly note?: string;
    readonly tone: 'bronze' | 'green' | 'violet';
    readonly status: 'ready' | 'cooldown' | 'price';
    readonly remainingMs?: number;
    readonly price?: string;
    readonly priceIcon?: string;
}
export interface ChestsWindowProps extends FeatureProps {
    readonly chests: readonly ChestEntry[];
}
export declare const chestsWindowView: (p: ChestsWindowProps) => ViewNode;
export declare const chestsWindow: import("../core.js").KitComponent<ChestsWindowProps>;
export interface ChestReward {
    readonly id: string;
    readonly label: string;
    readonly amount: string;
    readonly icon?: string;
    readonly gold?: boolean;
}
export interface ChestOpenedProps extends FeatureProps {
    readonly tone: ChestEntry['tone'];
    readonly caption: string;
    readonly rewards: readonly ChestReward[];
}
export declare const chestOpenedView: (p: ChestOpenedProps) => ViewNode;
export declare const chestOpened: import("../core.js").KitComponent<ChestOpenedProps>;
export interface SkinVariant {
    readonly id: string;
    readonly state: 'unlocked' | 'locked' | 'unknown';
    readonly tone?: 'mint' | 'violet-soft' | 'violet';
    readonly icon?: string;
}
export interface SkinDetailProps extends FeatureProps {
    readonly name: string;
    readonly rarity?: string;
    readonly index: number;
    readonly total: number;
    readonly perk?: string;
    readonly perkIcon?: string;
    readonly preview?: string;
    readonly variants: readonly SkinVariant[];
    readonly selectedVariantId?: string;
    readonly adProgress?: {
        readonly done: number;
        readonly total: number;
    };
    readonly videoAvailable?: boolean;
    readonly price?: string;
    readonly priceIcon?: string;
    readonly canBuy?: boolean;
}
export declare const skinDetailView: (p: SkinDetailProps) => ViewNode;
export declare const skinDetail: import("../core.js").KitComponent<SkinDetailProps>;
//# sourceMappingURL=inventory-windows.d.ts.map