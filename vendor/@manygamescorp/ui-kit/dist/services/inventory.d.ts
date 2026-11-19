import { type FeatureProps, type Outcome } from '../features/shared.js';
export interface InventoryItem {
    readonly itemId: string;
    readonly name: string;
    readonly quantity: number;
    readonly icon?: string;
    readonly iconUrl?: string;
    readonly consumable?: boolean;
    readonly obtainable?: boolean;
    readonly kind?: 'currency' | 'item' | 'instance';
    readonly positions?: readonly InventoryPositionView[];
}
export interface InventoryPositionView {
    readonly collection: string;
    readonly itemId: string;
    readonly kind: 'currency' | 'item' | 'instance';
    readonly quantity: number;
    readonly stackId?: string;
    readonly instanceId?: string;
    readonly attrs?: Readonly<Record<string, string | number | boolean>>;
    readonly expiresAt: string | null;
    readonly expired: boolean;
}
export interface InventoryChest {
    readonly key: string;
    readonly title: string;
    readonly available: boolean;
    readonly contents: readonly {
        readonly name: string;
        readonly quantity: number;
        readonly icon?: string;
    }[];
}
export interface InventoryProps extends FeatureProps {
    readonly items: readonly InventoryItem[];
    readonly result?: Outcome;
    readonly collections?: readonly string[];
    readonly collection?: string;
    readonly chests?: readonly InventoryChest[];
    readonly chestStatus?: 'pending' | 'purchased' | 'failed' | 'canceled' | 'not_available' | 'already_owned';
    readonly exchanges: readonly {
        readonly id: string;
        readonly title: string;
    }[];
}
export declare const inventoryView: (p: InventoryProps) => import("../view-types.js").ViewNode;
export declare const inventory: import("../core.js").KitComponent<InventoryProps>;
//# sourceMappingURL=inventory.d.ts.map