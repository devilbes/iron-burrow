export interface paths {
    "/v1/inventory/entities": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["InventoryClientController_entities"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/inventory/me": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["InventoryClientController_me"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/inventory/me/add": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["InventoryClientController_add"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/inventory/me/consume": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["InventoryClientController_consume"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/inventory/me/exchanges": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["InventoryClientController_exchange"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/inventory/me/grants": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["InventoryClientController_grants"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/inventory/me/sync": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["InventoryClientController_sync"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/inventory/me/transactions": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["InventoryClientController_transactions"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
}
export type webhooks = Record<string, never>;
export interface components {
    schemas: never;
    responses: never;
    parameters: never;
    requestBodies: never;
    headers: never;
    pathItems: never;
}
export type $defs = Record<string, never>;
export interface operations {
    InventoryClientController_entities: {
        parameters: {
            query?: {
                catalogVersion?: string;
                cursor?: string;
                ids?: string;
                limit?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        notModified: true;
                    } | {
                        catalogVersion: number;
                        items: {
                            display: {
                                descriptionKey: string | null;
                                iconUrl: string | null;
                                titleKey: string;
                            } | null;
                            effect: {
                                durationSec: number | null;
                                effectKey: string;
                                params: {
                                    [key: string]: string | number | boolean;
                                };
                            } | null;
                            id: string;
                            itemType: "soft_currency" | "hard_currency" | "stackable" | "custom" | "virtual";
                            params?: {
                                [key: string]: string | number;
                            };
                            status: "active" | "archived";
                            template?: string;
                        }[];
                        nextCursor: string | null;
                    };
                };
            };
        };
    };
    InventoryClientController_me: {
        parameters: {
            query?: never;
            header?: {
                "if-none-match"?: string;
            };
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    ETag?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        currencies?: {
                            collection: string;
                            itemId: string;
                            itemType: "soft_currency" | "hard_currency";
                            quantity?: number;
                            stackId: string;
                            stateVersion?: number;
                            updatedAt?: string;
                        }[];
                        instances?: {
                            attrs?: {
                                [key: string]: string | number | boolean;
                            };
                            collection: string;
                            expiresAt?: string;
                            instanceId: string;
                            itemId: string;
                            stateVersion?: number;
                            updatedAt?: string;
                        }[];
                        inventoryVersion?: number;
                        items?: {
                            collection: string;
                            expiresAt?: string;
                            itemId: string;
                            quantity?: number;
                            stackId: string;
                            stateVersion?: number;
                            updatedAt?: string;
                        }[];
                        serverTime: string;
                        updatedAt?: string;
                    };
                };
            };
            304: {
                headers: {
                    ETag?: string;
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    InventoryClientController_add: {
        parameters: {
            query?: never;
            header: {
                "idempotency-key": string;
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    entities: {
                        amount: number;
                        id: string;
                    }[];
                    reason: string;
                };
            };
        };
        responses: {
            200: {
                headers: {
                    "Idempotency-Replayed"?: "true";
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        inventoryVersion: number;
                        lines: {
                            balanceAfter: number;
                            delta: number;
                            instanceId: string | null;
                            itemId: string;
                        }[];
                        replayed: boolean;
                        state: {
                            currencies: {
                                collection: string;
                                itemId: string;
                                itemType: "soft_currency" | "hard_currency";
                                quantity: number;
                                stackId: string;
                                stateVersion: number;
                            }[];
                            instances: {
                                attrs: {
                                    [key: string]: string | number | boolean;
                                };
                                collection: string;
                                expiresAt: string | null;
                                instanceId: string;
                                itemId: string;
                                stateVersion: number;
                            }[];
                            inventoryVersion: number;
                            items: {
                                collection: string;
                                expiresAt: string | null;
                                itemId: string;
                                quantity: number;
                                stackId: string;
                                stateVersion: number;
                            }[];
                            serverTime: string;
                            updatedAt: string | null;
                        };
                        transactionId: string;
                    };
                };
            };
        };
    };
    InventoryClientController_consume: {
        parameters: {
            query?: never;
            header: {
                "idempotency-key": string;
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    itemId: string;
                    qty: number;
                    reason?: string;
                };
            };
        };
        responses: {
            200: {
                headers: {
                    "Idempotency-Replayed"?: "true";
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        inventoryVersion: number;
                        lines: {
                            balanceAfter: number;
                            delta: number;
                            instanceId: string | null;
                            itemId: string;
                        }[];
                        replayed: boolean;
                        state: {
                            currencies: {
                                collection: string;
                                itemId: string;
                                itemType: "soft_currency" | "hard_currency";
                                quantity: number;
                                stackId: string;
                                stateVersion: number;
                            }[];
                            instances: {
                                attrs: {
                                    [key: string]: string | number | boolean;
                                };
                                collection: string;
                                expiresAt: string | null;
                                instanceId: string;
                                itemId: string;
                                stateVersion: number;
                            }[];
                            inventoryVersion: number;
                            items: {
                                collection: string;
                                expiresAt: string | null;
                                itemId: string;
                                quantity: number;
                                stackId: string;
                                stateVersion: number;
                            }[];
                            serverTime: string;
                            updatedAt: string | null;
                        };
                        transactionId: string;
                    };
                };
            };
        };
    };
    InventoryClientController_exchange: {
        parameters: {
            query?: never;
            header: {
                "idempotency-key": string;
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    exchangeRuleId: string;
                };
            };
        };
        responses: {
            200: {
                headers: {
                    "Idempotency-Replayed"?: "true";
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        inventoryVersion: number;
                        lines: {
                            balanceAfter: number;
                            delta: number;
                            instanceId: string | null;
                            itemId: string;
                        }[];
                        replayed: boolean;
                        state: {
                            currencies: {
                                collection: string;
                                itemId: string;
                                itemType: "soft_currency" | "hard_currency";
                                quantity: number;
                                stackId: string;
                                stateVersion: number;
                            }[];
                            instances: {
                                attrs: {
                                    [key: string]: string | number | boolean;
                                };
                                collection: string;
                                expiresAt: string | null;
                                instanceId: string;
                                itemId: string;
                                stateVersion: number;
                            }[];
                            inventoryVersion: number;
                            items: {
                                collection: string;
                                expiresAt: string | null;
                                itemId: string;
                                quantity: number;
                                stackId: string;
                                stateVersion: number;
                            }[];
                            serverTime: string;
                            updatedAt: string | null;
                        };
                        transactionId: string;
                    };
                };
            };
        };
    };
    InventoryClientController_grants: {
        parameters: {
            query?: {
                cursor?: string;
                limit?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        items: {
                            applied: {
                                amount: number;
                                id: string;
                            }[];
                            createdAt: string;
                            display?: {
                                [key: string]: unknown;
                            };
                            inventoryVersion: number;
                            source: string;
                            transactionId: string;
                        }[];
                        nextCursor: string | null;
                    };
                };
            };
        };
    };
    InventoryClientController_sync: {
        parameters: {
            query?: never;
            header: {
                "idempotency-key": string;
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    clientInventoryVersion: number;
                    operations: ({
                        entities: {
                            amount: number;
                            id: string;
                        }[];
                        idempotencyKey: string;
                        reason: string;
                        type: "add";
                    } | {
                        amount: number;
                        idempotencyKey: string;
                        instanceId?: string;
                        itemId: string;
                        reason: string;
                        type: "debit";
                    })[];
                };
            };
        };
        responses: {
            200: {
                headers: {
                    "Idempotency-Replayed"?: "true";
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        replayed: boolean;
                        results: {
                            code: string | null;
                            idempotencyKey: string;
                            index: number;
                            status: "applied" | "replayed" | "rejected" | "skipped";
                            transactionId: string | null;
                        }[];
                        state: {
                            currencies: {
                                collection: string;
                                itemId: string;
                                itemType: "soft_currency" | "hard_currency";
                                quantity: number;
                                stackId: string;
                                stateVersion: number;
                            }[];
                            instances: {
                                attrs: {
                                    [key: string]: string | number | boolean;
                                };
                                collection: string;
                                expiresAt: string | null;
                                instanceId: string;
                                itemId: string;
                                stateVersion: number;
                            }[];
                            inventoryVersion: number;
                            items: {
                                collection: string;
                                expiresAt: string | null;
                                itemId: string;
                                quantity: number;
                                stackId: string;
                                stateVersion: number;
                            }[];
                            serverTime: string;
                            updatedAt: string | null;
                        };
                    };
                };
            };
        };
    };
    InventoryClientController_transactions: {
        parameters: {
            query?: {
                cursor?: string;
                limit?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        items: {
                            createdAt: string;
                            display?: {
                                [key: string]: unknown;
                            };
                            exchangeRuleId: string | null;
                            inventoryVersionAfter: number;
                            lines: {
                                attrsPatch: {
                                    [key: string]: unknown;
                                } | null;
                                balanceAfter: number;
                                collection: string;
                                delta: number;
                                expiresAtAfter: string | null;
                                instanceId: string | null;
                                itemId: string;
                                stackId: string | null;
                            }[];
                            operation: "grant" | "revoke" | "exchange" | "update_item" | "starter_grant" | "client_add" | "client_sync" | "consume" | "expire";
                            reason: string | null;
                            requested: {
                                amount: number;
                                id: string;
                            }[];
                            source: string;
                            transactionId: string;
                        }[];
                        nextCursor: string | null;
                    };
                };
            };
        };
    };
}
//# sourceMappingURL=inventory.d.ts.map