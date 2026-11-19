export interface paths {
    "/v1/progress/me/actions": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Accept a game action (202 after it is stored for game.actions) */
        post: operations["ProgressClientController_sendAction"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/progress/me/attempts/begin": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Begin the single active server-seeded attempt for the authenticated player */
        post: operations["ProgressClientController_beginAttempt"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/progress/me/init": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Current progress states by keys or every available config */
        post: operations["ProgressClientController_initStates"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/progress/me/rewards/{operationId}/claim": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Claim one manual reward (a repeat answers with the same operationId) */
        post: operations["ProgressClientController_claim"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/progress/me/rewards/claim-all": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Claim a bounded batch of available manual rewards of the launch */
        post: operations["ProgressClientController_claimAll"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/progress/me/rewards/list": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Page all rewards of a launch across attempts */
        post: operations["ProgressClientController_rewardPage"];
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
    ProgressClientController_sendAction: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    /** @description Facts matching the action type. UTF-8 JSON byte limit is returned as limitBytes on PAYLOAD_TOO_LARGE; do not include server verification fields. */
                    data: {
                        [key: string]: unknown;
                    };
                    /** @description ID saved by the game for one action: 8–64 characters [A-Za-z0-9_.:-]. Retry with the same ID and facts. */
                    eventId: string;
                    /** @description Allowed client action type, 1–64 characters; starts with a letter, followed by letters, digits, _, . or -. Example: levelEnd. */
                    type: string;
                };
            };
        };
        responses: {
            /** @description Accepted or a repeat of the same eventId */
            202: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @description UTC ISO-8601 time of first acceptance; unchanged on duplicate retry. */
                        acceptedAt: string;
                        /** @description true if the same ID and facts were already accepted. */
                        duplicate: boolean;
                        /** @description The action ID supplied by the game. */
                        eventId: string;
                        /** @description Verification verdict returned for levelEnd; may be absent for other action types. */
                        level?: {
                            /** @description Optional reason code explaining a negative verification verdict. */
                            reason?: string;
                            /** @description Awarded star count; zero for an unverified or lost level. */
                            stars: number;
                            /** @description Whether the submitted level result passed verification. false is an accepted negative verdict, not an HTTP error. */
                            verified: boolean;
                        };
                        /**
                         * @description Confirms action acceptance, not completion of progress updates.
                         * @enum {string}
                         */
                        status: "accepted";
                    };
                };
            };
        };
    };
    ProgressClientController_beginAttempt: {
        parameters: {
            query?: never;
            header: {
                /** @description Required UUID; immutable begin response retained for 24 hours. */
                "Idempotency-Key": string;
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    /** @description Optional level identifier; copy unchanged into levelEnd. */
                    levelId?: string;
                    /** @description Level number, 1..1000000. */
                    n: number;
                    /** @description Published level set code, e.g. main. */
                    set: string;
                };
            };
        };
        responses: {
            /** @description Server-issued attempt or its saved replay */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @description Server attempt ID (hex24). */
                        attemptId: string;
                        /** @description Server-generated 256-bit seed, base64url. */
                        seed: string;
                    };
                };
            };
        };
    };
    ProgressClientController_initStates: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    /** @description 1–100 unique configuration keys; omit to read all available states. Response order follows these keys. */
                    keys?: string[];
                };
            };
        };
        responses: {
            /** @description States */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @description States in requested key order; without keys, available and invalid configs sorted by key. Can be empty. */
                        states: {
                            /** @description Opaque current attempt ID; null for unavailable state. */
                            attemptId: string | null;
                            /** @description Distinct validation codes for invalid configuration; absent for other statuses. */
                            codes?: string[];
                            /** @description UTC ISO-8601 period end, or null for no time limit or unavailable state. */
                            endsAt: string | null;
                            /** @description Group states indexed by configured group key; empty when unavailable. */
                            groups: {
                                [key: string]: {
                                    /** @description Whether the group is completed. */
                                    completed: boolean;
                                };
                            };
                            /** @description Configuration record key identifying this state. */
                            key: string;
                            /** @description Opaque current period key to copy to claim; null for unavailable state. */
                            periodKey: string | null;
                            /** @description First 500 rewards of the current launch across attempts; use rewards/list for complete paginated access. Empty when unavailable. */
                            rewards: {
                                /** @description Opaque attempt identifier associated with this reward. */
                                attemptId: string;
                                /**
                                 * @description auto is issued automatically; manual requires a claim request.
                                 * @enum {string}
                                 */
                                claimMode: "auto" | "manual";
                                /** @description Asynchronous inventory grant result; absent until an available reward is issued. */
                                grantResult?: {
                                    /** @description Actual contents from inventory.grant.completed; empty while pending or failed. */
                                    applied: {
                                        /** @description Quantity confirmed by inventory. */
                                        amount: number;
                                        /** @description Inventory expiry, when supplied for this entity. */
                                        expiresAt?: string;
                                        /** @description Inventory entity actually granted. */
                                        id: string;
                                        /** @description Inventory instance ID, when supplied for this entity. */
                                        instanceId?: string;
                                    }[];
                                    /**
                                     * @description pending: grant command is awaiting inventory; granted: inventory confirmed it; failed: final refusal.
                                     * @enum {string}
                                     */
                                    status: "pending" | "granted" | "failed";
                                };
                                /** @description Reward ID copied to the claim path; 24 lowercase hexadecimal characters. Never generate it in the game. */
                                operationId: string;
                                /** @description Reward contents returned by the API; never send these contents in claim requests. */
                                reward: {
                                    /** @description Positive integer quantity of the entity. */
                                    amount: number;
                                    /** @description Inventory entity ID. */
                                    id: string;
                                }[];
                                /**
                                 * @description available can be claimed when manual; issued was submitted for delivery, not proof of balance change; failed reports delivery failure.
                                 * @enum {string}
                                 */
                                status: "available" | "issued" | "failed";
                                /** @description Configured step or group key, 1–64 characters [A-Za-z0-9_-]. */
                                targetKey: string;
                            }[];
                            /** @description Selected step keys; empty when the whole set is used or the state is unavailable. */
                            selectedStepKeys: string[];
                            /**
                             * @description active: current progress; completed: finished; unavailable: no accessible current state; invalid: configuration failed validation.
                             * @enum {string}
                             */
                            status: "active" | "completed" | "unavailable" | "invalid";
                            /** @description Step states indexed by configured step key; empty when unavailable. */
                            steps: {
                                [key: string]: {
                                    /** @description UTC ISO-8601 availability time, or null when no timed availability is reported. */
                                    availableAt: string | null;
                                    /** @description Condition states indexed by their configured keys. */
                                    conditions: {
                                        [key: string]: {
                                            /** @description Whether this condition is completed. */
                                            completed: boolean;
                                            /** @description Current numeric condition value; its unit is defined by the configured condition. Unique conditions return a count. */
                                            value: number;
                                        };
                                    };
                                    /**
                                     * @description Step state: locked, available for progress, or completed.
                                     * @enum {string}
                                     */
                                    status: "locked" | "available" | "completed";
                                };
                            };
                        }[];
                    };
                };
            };
            /** @description Init rate limit */
            429: {
                headers: {
                    /** @description Seconds until the limit resets */
                    "Retry-After"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        code: string;
                    };
                };
            };
        };
    };
    ProgressClientController_claim: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                operationId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    /** @description Progress configuration record key, 1–64 characters [A-Za-z0-9_-], for example tasks_daily. */
                    key: string;
                    /** @description Opaque period key copied unchanged from init, 1–200 characters. */
                    periodKey: string;
                };
            };
        };
        responses: {
            /** @description Issued ids and the current state */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @description Reward IDs submitted by this command; empty if no rewards were submitted. Not confirmation of inventory balances. */
                        issuedOperationIds: string[];
                        /** @description Current progress state for one configuration record; does not include configuration presentation or inventory balances. */
                        state: {
                            /** @description Opaque current attempt ID; null for unavailable state. */
                            attemptId: string | null;
                            /** @description Distinct validation codes for invalid configuration; absent for other statuses. */
                            codes?: string[];
                            /** @description UTC ISO-8601 period end, or null for no time limit or unavailable state. */
                            endsAt: string | null;
                            /** @description Group states indexed by configured group key; empty when unavailable. */
                            groups: {
                                [key: string]: {
                                    /** @description Whether the group is completed. */
                                    completed: boolean;
                                };
                            };
                            /** @description Configuration record key identifying this state. */
                            key: string;
                            /** @description Opaque current period key to copy to claim; null for unavailable state. */
                            periodKey: string | null;
                            /** @description First 500 rewards of the current launch across attempts; use rewards/list for complete paginated access. Empty when unavailable. */
                            rewards: {
                                /** @description Opaque attempt identifier associated with this reward. */
                                attemptId: string;
                                /**
                                 * @description auto is issued automatically; manual requires a claim request.
                                 * @enum {string}
                                 */
                                claimMode: "auto" | "manual";
                                /** @description Asynchronous inventory grant result; absent until an available reward is issued. */
                                grantResult?: {
                                    /** @description Actual contents from inventory.grant.completed; empty while pending or failed. */
                                    applied: {
                                        /** @description Quantity confirmed by inventory. */
                                        amount: number;
                                        /** @description Inventory expiry, when supplied for this entity. */
                                        expiresAt?: string;
                                        /** @description Inventory entity actually granted. */
                                        id: string;
                                        /** @description Inventory instance ID, when supplied for this entity. */
                                        instanceId?: string;
                                    }[];
                                    /**
                                     * @description pending: grant command is awaiting inventory; granted: inventory confirmed it; failed: final refusal.
                                     * @enum {string}
                                     */
                                    status: "pending" | "granted" | "failed";
                                };
                                /** @description Reward ID copied to the claim path; 24 lowercase hexadecimal characters. Never generate it in the game. */
                                operationId: string;
                                /** @description Reward contents returned by the API; never send these contents in claim requests. */
                                reward: {
                                    /** @description Positive integer quantity of the entity. */
                                    amount: number;
                                    /** @description Inventory entity ID. */
                                    id: string;
                                }[];
                                /**
                                 * @description available can be claimed when manual; issued was submitted for delivery, not proof of balance change; failed reports delivery failure.
                                 * @enum {string}
                                 */
                                status: "available" | "issued" | "failed";
                                /** @description Configured step or group key, 1–64 characters [A-Za-z0-9_-]. */
                                targetKey: string;
                            }[];
                            /** @description Selected step keys; empty when the whole set is used or the state is unavailable. */
                            selectedStepKeys: string[];
                            /**
                             * @description active: current progress; completed: finished; unavailable: no accessible current state; invalid: configuration failed validation.
                             * @enum {string}
                             */
                            status: "active" | "completed" | "unavailable" | "invalid";
                            /** @description Step states indexed by configured step key; empty when unavailable. */
                            steps: {
                                [key: string]: {
                                    /** @description UTC ISO-8601 availability time, or null when no timed availability is reported. */
                                    availableAt: string | null;
                                    /** @description Condition states indexed by their configured keys. */
                                    conditions: {
                                        [key: string]: {
                                            /** @description Whether this condition is completed. */
                                            completed: boolean;
                                            /** @description Current numeric condition value; its unit is defined by the configured condition. Unique conditions return a count. */
                                            value: number;
                                        };
                                    };
                                    /**
                                     * @description Step state: locked, available for progress, or completed.
                                     * @enum {string}
                                     */
                                    status: "locked" | "available" | "completed";
                                };
                            };
                        };
                    };
                };
            };
            /** @description Client reward budget exhausted */
            429: {
                headers: {
                    /** @description Seconds until the limit resets */
                    "Retry-After"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        code: string;
                    };
                };
            };
        };
    };
    ProgressClientController_claimAll: {
        parameters: {
            query?: never;
            header?: {
                /** @description Saved command key, UUID; reuse with the same command body on retry. */
                "Idempotency-Key"?: string;
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    /** @description Progress configuration record key, 1–64 characters [A-Za-z0-9_-], for example tasks_daily. */
                    key: string;
                    /** @description Opaque period key copied unchanged from init, 1–200 characters. */
                    periodKey: string;
                };
            };
        };
        responses: {
            /** @description Issued ids, current state and hasMore for the next command */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @description More manual available rewards existed at selection; submit a new command/key to claim the next batch. Reusing the key replays this batch. */
                        hasMore: boolean;
                        /** @description Reward IDs submitted by this command; empty if no rewards were submitted. Not confirmation of inventory balances. */
                        issuedOperationIds: string[];
                        /** @description Current progress state for one configuration record; does not include configuration presentation or inventory balances. */
                        state: {
                            /** @description Opaque current attempt ID; null for unavailable state. */
                            attemptId: string | null;
                            /** @description Distinct validation codes for invalid configuration; absent for other statuses. */
                            codes?: string[];
                            /** @description UTC ISO-8601 period end, or null for no time limit or unavailable state. */
                            endsAt: string | null;
                            /** @description Group states indexed by configured group key; empty when unavailable. */
                            groups: {
                                [key: string]: {
                                    /** @description Whether the group is completed. */
                                    completed: boolean;
                                };
                            };
                            /** @description Configuration record key identifying this state. */
                            key: string;
                            /** @description Opaque current period key to copy to claim; null for unavailable state. */
                            periodKey: string | null;
                            /** @description First 500 rewards of the current launch across attempts; use rewards/list for complete paginated access. Empty when unavailable. */
                            rewards: {
                                /** @description Opaque attempt identifier associated with this reward. */
                                attemptId: string;
                                /**
                                 * @description auto is issued automatically; manual requires a claim request.
                                 * @enum {string}
                                 */
                                claimMode: "auto" | "manual";
                                /** @description Asynchronous inventory grant result; absent until an available reward is issued. */
                                grantResult?: {
                                    /** @description Actual contents from inventory.grant.completed; empty while pending or failed. */
                                    applied: {
                                        /** @description Quantity confirmed by inventory. */
                                        amount: number;
                                        /** @description Inventory expiry, when supplied for this entity. */
                                        expiresAt?: string;
                                        /** @description Inventory entity actually granted. */
                                        id: string;
                                        /** @description Inventory instance ID, when supplied for this entity. */
                                        instanceId?: string;
                                    }[];
                                    /**
                                     * @description pending: grant command is awaiting inventory; granted: inventory confirmed it; failed: final refusal.
                                     * @enum {string}
                                     */
                                    status: "pending" | "granted" | "failed";
                                };
                                /** @description Reward ID copied to the claim path; 24 lowercase hexadecimal characters. Never generate it in the game. */
                                operationId: string;
                                /** @description Reward contents returned by the API; never send these contents in claim requests. */
                                reward: {
                                    /** @description Positive integer quantity of the entity. */
                                    amount: number;
                                    /** @description Inventory entity ID. */
                                    id: string;
                                }[];
                                /**
                                 * @description available can be claimed when manual; issued was submitted for delivery, not proof of balance change; failed reports delivery failure.
                                 * @enum {string}
                                 */
                                status: "available" | "issued" | "failed";
                                /** @description Configured step or group key, 1–64 characters [A-Za-z0-9_-]. */
                                targetKey: string;
                            }[];
                            /** @description Selected step keys; empty when the whole set is used or the state is unavailable. */
                            selectedStepKeys: string[];
                            /**
                             * @description active: current progress; completed: finished; unavailable: no accessible current state; invalid: configuration failed validation.
                             * @enum {string}
                             */
                            status: "active" | "completed" | "unavailable" | "invalid";
                            /** @description Step states indexed by configured step key; empty when unavailable. */
                            steps: {
                                [key: string]: {
                                    /** @description UTC ISO-8601 availability time, or null when no timed availability is reported. */
                                    availableAt: string | null;
                                    /** @description Condition states indexed by their configured keys. */
                                    conditions: {
                                        [key: string]: {
                                            /** @description Whether this condition is completed. */
                                            completed: boolean;
                                            /** @description Current numeric condition value; its unit is defined by the configured condition. Unique conditions return a count. */
                                            value: number;
                                        };
                                    };
                                    /**
                                     * @description Step state: locked, available for progress, or completed.
                                     * @enum {string}
                                     */
                                    status: "locked" | "available" | "completed";
                                };
                            };
                        };
                    };
                };
            };
            /** @description Client reward budget exhausted */
            429: {
                headers: {
                    /** @description Seconds until the limit resets */
                    "Retry-After"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        code: string;
                    };
                };
            };
        };
    };
    ProgressClientController_rewardPage: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    /** @description Opaque nextCursor from the previous page; omit for newest rewards. */
                    cursor?: string;
                    /** @description Progress configuration record key, 1–64 characters [A-Za-z0-9_-], for example tasks_daily. */
                    key: string;
                    /** @description Maximum rewards per page, 1–100 within the deployment page limit; omitted uses the configured client page size. */
                    limit?: number;
                    /** @description Opaque period key copied unchanged from init, 1–200 characters. */
                    periodKey: string;
                };
            };
        };
        responses: {
            /** @description Bounded reward page */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @description Rewards of all attempts of the requested launch, newest first. */
                        items: {
                            /** @description Opaque attempt identifier associated with this reward. */
                            attemptId: string;
                            /**
                             * @description auto is issued automatically; manual requires a claim request.
                             * @enum {string}
                             */
                            claimMode: "auto" | "manual";
                            /** @description Asynchronous inventory grant result; absent until an available reward is issued. */
                            grantResult?: {
                                /** @description Actual contents from inventory.grant.completed; empty while pending or failed. */
                                applied: {
                                    /** @description Quantity confirmed by inventory. */
                                    amount: number;
                                    /** @description Inventory expiry, when supplied for this entity. */
                                    expiresAt?: string;
                                    /** @description Inventory entity actually granted. */
                                    id: string;
                                    /** @description Inventory instance ID, when supplied for this entity. */
                                    instanceId?: string;
                                }[];
                                /**
                                 * @description pending: grant command is awaiting inventory; granted: inventory confirmed it; failed: final refusal.
                                 * @enum {string}
                                 */
                                status: "pending" | "granted" | "failed";
                            };
                            /** @description Reward ID copied to the claim path; 24 lowercase hexadecimal characters. Never generate it in the game. */
                            operationId: string;
                            /** @description Reward contents returned by the API; never send these contents in claim requests. */
                            reward: {
                                /** @description Positive integer quantity of the entity. */
                                amount: number;
                                /** @description Inventory entity ID. */
                                id: string;
                            }[];
                            /**
                             * @description available can be claimed when manual; issued was submitted for delivery, not proof of balance change; failed reports delivery failure.
                             * @enum {string}
                             */
                            status: "available" | "issued" | "failed";
                            /** @description Configured step or group key, 1–64 characters [A-Za-z0-9_-]. */
                            targetKey: string;
                        }[];
                        /** @description Pass as cursor to continue; null ends this traversal. */
                        nextCursor: string | null;
                    };
                };
            };
        };
    };
}
//# sourceMappingURL=progress.d.ts.map