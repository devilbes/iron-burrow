import { type ModuleDefinition, type ModuleServices } from '@manygamescorp/core/module';
import type { ScopedRequestSpec } from '@manygamescorp/core/scoped-http';
import type { ScopedStorage } from '@manygamescorp/core/storage/scoped';
export interface InventoryCurrency {
    readonly collection: string;
    readonly itemId: string;
    readonly stackId: string;
    readonly itemType: 'soft_currency' | 'hard_currency';
    readonly quantity: number;
    readonly stateVersion: number;
    readonly updatedAt: string | null;
}
export interface InventoryStack {
    readonly collection: string;
    readonly itemId: string;
    readonly stackId: string;
    readonly quantity: number;
    readonly expiresAt: string | null;
    readonly stateVersion: number;
    readonly updatedAt: string | null;
}
export interface InventoryInstance {
    readonly collection: string;
    readonly itemId: string;
    readonly instanceId: string;
    readonly attrs: Readonly<Record<string, string | number | boolean>>;
    readonly expiresAt: string | null;
    readonly stateVersion: number;
    readonly updatedAt: string | null;
}
export type InventoryPosition = InventoryCurrency | InventoryStack | InventoryInstance;
export interface InventoryState {
    readonly inventoryVersion: number;
    readonly currencies: readonly InventoryCurrency[];
    readonly items: readonly InventoryStack[];
    readonly instances: readonly InventoryInstance[];
    readonly updatedAt: string | null;
    readonly serverTime: string;
}
export interface InventoryExchangeLine {
    readonly itemId: string;
    readonly instanceId: string | null;
    readonly delta: number;
    readonly balanceAfter: number;
}
export interface InventoryExchangeResult {
    readonly transactionId: string;
    readonly inventoryVersion: number;
    readonly replayed: boolean;
    readonly lines: readonly InventoryExchangeLine[];
    readonly state: InventoryState;
}
export interface InventoryExchangeOptions {
    readonly idempotencyKey: string;
}
export type InventoryConsumeResult = InventoryExchangeResult;
export interface InventoryConsumeOptions extends InventoryExchangeOptions {
    readonly reason?: string;
}
export interface InventoryEntity {
    readonly id: string;
    readonly itemType: string;
    readonly status: string;
    readonly display: {
        readonly titleKey: string | null;
        readonly descriptionKey: string | null;
        readonly iconUrl: string | null;
    };
}
export interface InventoryChangedPayload {
    readonly changed: readonly string[];
}
export interface InventoryGrantedItem {
    readonly id: string;
    readonly kind: 'soft_currency' | 'hard_currency' | 'item' | 'instance';
    readonly quantity: number;
}
export interface InventoryGrantedPayload {
    readonly items: readonly InventoryGrantedItem[];
    readonly source?: string;
}
export interface InventoryWindowOpenPayload {
    readonly view: string;
    readonly id: string | null;
}
export interface InventoryCurrencyTapPayload {
    readonly itemId: string;
    readonly hard: boolean;
}
export interface InventoryNamespace {
    entities(): Promise<readonly InventoryEntity[]>;
    get(options?: {
        readonly force?: boolean;
    }): Promise<InventoryState>;
    current(): InventoryState | null;
    balance(currencyId: string): number | undefined;
    positions(itemId: string): readonly InventoryPosition[];
    quantity(itemId: string): number | undefined;
    refresh(): Promise<InventoryState>;
    exchange(exchangeRuleId: string, options: InventoryExchangeOptions): Promise<InventoryExchangeResult>;
    consume(itemId: string, qty: number, options: InventoryConsumeOptions): Promise<InventoryConsumeResult>;
    expectGrant(source: string, options?: {
        readonly ttlMs?: number;
    }): void;
}
interface InventoryRuntime extends Omit<InventoryNamespace, 'expectGrant'> {
    reconcile(version?: number): Promise<InventoryState>;
    restorePending(): Promise<void>;
    unsent(): number;
    dispose(): void;
}
type Http = {
    request(spec: ScopedRequestSpec): Promise<unknown>;
};
type EmitChanged = (changed: string[], granted: InventoryGrantedItem[]) => void;
export declare function createInventory(http: Http, emitChanged?: EmitChanged, signal?: AbortSignal, storage?: Pick<ScopedStorage, 'get' | 'set'>): InventoryRuntime;
export declare function currencyTotals(state: InventoryState | null): ReadonlyMap<string, {
    readonly hard: boolean;
    readonly quantity: number;
}>;
export declare function currencyTopBar(services: ModuleServices, onTap?: (tap: InventoryCurrencyTapPayload) => void): {
    sync(state: InventoryState | null, granted?: readonly InventoryGrantedItem[]): void;
    dispose(): void;
};
export declare const INVENTORY_WINDOWS: readonly ["main", "chests", "collection", "card", "album", "shelf", "easter", "skin"];
export type InventoryWindowId = typeof INVENTORY_WINDOWS[number];
export declare function inventory(): ModuleDefinition<InventoryNamespace>;
export declare const inventoryModule: typeof inventory;
export {};
//# sourceMappingURL=inventory.d.ts.map